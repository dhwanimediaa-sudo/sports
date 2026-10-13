/**
 * SportsPulse - Professional Player Auction Router
 */

import { Router, Response } from 'express';
import crypto from 'crypto';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { canAccessSport, isUserAdmin } from '../middleware/accessControl';
import { getDb, saveDatabase } from '../db/database';
import {
  Auction,
  AuctionTeam,
  AuctionPlayer,
  AuctionBid,
  AuctionResult,
  AuctionRetainedPlayer,
  AuctionGraphicConfig,
  AuctionAuditLog,
} from '../../src/types';
import {
  DEFAULT_BID_INCREMENTS,
  DEFAULT_AUCTION_GRAPHICS,
  calculateNextBidAmount,
  validateTeamBidEligibility,
  recalculateTeamPurseAndSquad,
  getAuctionLiveState,
  broadcastAuctionUpdate,
  startAuctionCountdown,
  stopAuctionCountdown,
  generateAuctionReportsSummary,
  auctionSseClientsMap,
} from '../services/auctionEngine';

const router = Router();

// Helper to log auction audit entries
function logAuctionAudit(
  auctionId: string,
  action: AuctionAuditLog['action'],
  details: string,
  user?: { id?: string; name?: string },
  metadata?: Record<string, any>
) {
  const db = getDb();
  if (!db.auction_audit_logs) db.auction_audit_logs = [];

  const log: AuctionAuditLog = {
    id: crypto.randomUUID(),
    auctionId,
    userId: user?.id,
    userName: user?.name || 'System Operator',
    action,
    details,
    metadata,
    timestamp: new Date().toISOString(),
  };

  db.auction_audit_logs.push(log);
}

/**
 * Check if a user is authorized for an auction
 */
export function isAuthorizedForAuction(
  auction: Auction,
  user: any,
  requiredLevel: 'MANAGE' | 'VIEW' = 'MANAGE'
): boolean {
  if (!user) return false;
  if (user.status === 'DISABLED' || user.status === 'SUSPENDED') return false;
  if (isUserAdmin(user)) return true;

  // Hard sport access restriction: If user does not have access to this auction's sport, deny!
  if (auction.sport && !canAccessSport(user, auction.sport)) {
    return false;
  }

  // Explicit creator or owner
  if (auction.ownerUserId === user.id || auction.createdByUserId === user.id) {
    return true;
  }

  // Legacy auctions with no owner
  if (!auction.ownerUserId && !auction.createdByUserId) {
    return requiredLevel === 'VIEW';
  }

  return false;
}

// ==========================================
// AUCTION CRUD
// ==========================================

/**
 * GET /api/auctions
 * List all auctions with stats
 */
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  let list = db.auctions || [];
  if (req.user && !isUserAdmin(req.user)) {
    list = list.filter((a) => isAuthorizedForAuction(a, req.user, 'VIEW'));
  }

  const auctions = list.map((auction) => {
    const teams = (db.auction_teams || []).filter((t) => t.auctionId === auction.id);
    const players = (db.auction_players || []).filter((p) => p.auctionId === auction.id);
    const sold = players.filter((p) => p.status === 'SOLD').length;
    const unsold = players.filter((p) => p.status === 'UNSOLD').length;
    const totalSpent = teams.reduce((sum, t) => sum + (t.totalSpent || 0), 0);

    return {
      ...auction,
      teamsCount: teams.length,
      playersCount: players.length,
      soldCount: sold,
      unsoldCount: unsold,
      totalSpent,
    };
  });

  res.json({ auctions });
});

/**
 * POST /api/auctions
 * Create new auction
 */
router.post('/', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const {
    name,
    season,
    sport,
    date,
    startTime,
    venue,
    description,
    auctionType,
    currency,
    startingPurse,
    maxSquadSize,
    minSquadSize,
    maxOverseasPlayers,
    timerDurationSeconds,
    bidIncrements,
    status,
    sponsorName,
    sponsorLogo,
    bannerLogo,
    rules,
  } = req.body;

  if (!name || !name.trim()) {
    res.status(400).json({ error: 'Auction name is required.' });
    return;
  }

  const effectiveSport = sport || 'CRICKET';
  if (!canAccessSport(req.user, effectiveSport)) {
    res.status(403).json({ error: `Forbidden: You do not have permission to manage auctions for ${effectiveSport}.` });
    return;
  }

  const auctionId = crypto.randomUUID();
  const newAuction: Auction = {
    id: auctionId,
    name: name.trim(),
    season: season || '2026',
    sport: effectiveSport,
    ownerUserId: req.user?.id,
    createdByUserId: req.user?.id,
    date: date || new Date().toISOString().split('T')[0],
    startTime: startTime || '14:00',
    venue: venue || '',
    description: description || '',
    auctionType: auctionType || 'CRICKET_IPL',
    currency: currency || 'INR',
    startingPurse: Number(startingPurse) || 100000000, // 10 Cr default
    maxSquadSize: Number(maxSquadSize) || 25,
    minSquadSize: Number(minSquadSize) || 15,
    maxOverseasPlayers: Number(maxOverseasPlayers) || 8,
    timerDurationSeconds: Number(timerDurationSeconds) || 15,
    bidIncrements: bidIncrements && bidIncrements.length > 0 ? bidIncrements : DEFAULT_BID_INCREMENTS,
    status: status || 'DRAFT',
    sponsorName: sponsorName || '',
    sponsorLogo: sponsorLogo || '',
    bannerLogo: bannerLogo || '',
    rules: {
      allowCustomBids: true,
      allowPass: true,
      allowWithdrawBid: true,
      autoSoldOnTimerZero: false,
      soundEffectsEnabled: true,
      ...rules,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (!db.auctions) db.auctions = [];
  db.auctions.push(newAuction);

  // Initialize default broadcast graphics configurations for this auction
  if (!db.auction_graphics) db.auction_graphics = [];
  DEFAULT_AUCTION_GRAPHICS.forEach((g) => {
    const graphicConfig: AuctionGraphicConfig = {
      id: crypto.randomUUID(),
      auctionId,
      ...g,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.auction_graphics.push(graphicConfig);
  });

  logAuctionAudit(auctionId, 'AUCTION_CREATED', `Created auction "${newAuction.name}"`, req.user);
  saveDatabase();

  res.status(201).json({ message: 'Auction created successfully.', auction: newAuction });
});

/**
 * Universal Authorization Middleware for all /api/auctions/:id routes
 */
router.use('/:id', (req: AuthenticatedRequest, res: Response, next) => {
  // Allow public endpoints
  if (req.path === '/public' || req.path === '/stream') {
    return next();
  }

  // All other /:id routes require authentication & authorization
  requireAuth(req, res, () => {
    const auctionId = req.params.id;
    const db = getDb();
    const auction = (db.auctions || []).find((a) => a.id === auctionId);
    if (!auction) {
      res.status(404).json({ error: 'Auction not found.' });
      return;
    }

    const requiredLevel = req.method === 'GET' ? 'VIEW' : 'MANAGE';
    if (!isAuthorizedForAuction(auction, req.user, requiredLevel)) {
      res.status(403).json({
        error: `Forbidden: You do not have ${requiredLevel.toLowerCase()} permission for this auction.`,
      });
      return;
    }

    (req as any).auction = auction;
    next();
  });
});

/**
 * GET /api/auctions/:id
 * Get single auction details
 */
router.get('/:id', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const auctionId = req.params.id;
  const auction = (db.auctions || []).find((a) => a.id === auctionId);

  if (!auction) {
    res.status(404).json({ error: 'Auction not found.' });
    return;
  }

  const teams = (db.auction_teams || []).filter((t) => t.auctionId === auctionId);
  const players = (db.auction_players || []).filter((p) => p.auctionId === auctionId);
  const retained = (db.auction_retained_players || []).filter((r) => r.auctionId === auctionId);

  res.json({
    auction,
    teams,
    playersCount: players.length,
    soldCount: players.filter((p) => p.status === 'SOLD').length,
    unsoldCount: players.filter((p) => p.status === 'UNSOLD').length,
    retainedCount: retained.length,
  });
});

/**
 * PUT /api/auctions/:id
 * Update auction configuration
 */
router.put('/:id', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const auctionId = req.params.id;
  const index = (db.auctions || []).findIndex((a) => a.id === auctionId);

  if (index === -1) {
    res.status(404).json({ error: 'Auction not found.' });
    return;
  }

  const current = db.auctions[index];
  const {
    name,
    season,
    sport,
    date,
    startTime,
    venue,
    description,
    auctionType,
    currency,
    startingPurse,
    maxSquadSize,
    minSquadSize,
    maxOverseasPlayers,
    timerDurationSeconds,
    bidIncrements,
    status,
    sponsorName,
    sponsorLogo,
    bannerLogo,
    rules,
  } = req.body;

  const updated: Auction = {
    ...current,
    name: name !== undefined ? name.trim() : current.name,
    season: season !== undefined ? season : current.season,
    sport: sport !== undefined ? sport : current.sport,
    date: date !== undefined ? date : current.date,
    startTime: startTime !== undefined ? startTime : current.startTime,
    venue: venue !== undefined ? venue : current.venue,
    description: description !== undefined ? description : current.description,
    auctionType: auctionType !== undefined ? auctionType : current.auctionType,
    currency: currency !== undefined ? currency : current.currency,
    startingPurse: startingPurse !== undefined ? Number(startingPurse) : current.startingPurse,
    maxSquadSize: maxSquadSize !== undefined ? Number(maxSquadSize) : current.maxSquadSize,
    minSquadSize: minSquadSize !== undefined ? Number(minSquadSize) : current.minSquadSize,
    maxOverseasPlayers:
      maxOverseasPlayers !== undefined ? Number(maxOverseasPlayers) : current.maxOverseasPlayers,
    timerDurationSeconds:
      timerDurationSeconds !== undefined ? Number(timerDurationSeconds) : current.timerDurationSeconds,
    bidIncrements: bidIncrements || current.bidIncrements,
    status: status !== undefined ? status : current.status,
    sponsorName: sponsorName !== undefined ? sponsorName : current.sponsorName,
    sponsorLogo: sponsorLogo !== undefined ? sponsorLogo : current.sponsorLogo,
    bannerLogo: bannerLogo !== undefined ? bannerLogo : current.bannerLogo,
    rules: { ...current.rules, ...rules },
    updatedAt: new Date().toISOString(),
  };

  db.auctions[index] = updated;
  logAuctionAudit(auctionId, 'AUCTION_UPDATED', `Updated auction settings for "${updated.name}"`, req.user);
  saveDatabase();

  broadcastAuctionUpdate(auctionId, 'AUCTION_UPDATED');
  res.json({ message: 'Auction updated successfully.', auction: updated });
});

/**
 * DELETE /api/auctions/:id
 * Delete auction and cascade clean its records
 */
router.delete('/:id', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const auctionId = req.params.id;
  const auction = (db.auctions || []).find((a) => a.id === auctionId);

  if (!auction) {
    res.status(404).json({ error: 'Auction not found.' });
    return;
  }

  stopAuctionCountdown(auctionId);

  db.auctions = (db.auctions || []).filter((a) => a.id !== auctionId);
  db.auction_teams = (db.auction_teams || []).filter((t) => t.auctionId !== auctionId);
  db.auction_players = (db.auction_players || []).filter((p) => p.auctionId !== auctionId);
  db.auction_bids = (db.auction_bids || []).filter((b) => b.auctionId !== auctionId);
  db.auction_results = (db.auction_results || []).filter((r) => r.auctionId !== auctionId);
  db.auction_retained_players = (db.auction_retained_players || []).filter((r) => r.auctionId !== auctionId);
  db.auction_graphics = (db.auction_graphics || []).filter((g) => g.auctionId !== auctionId);
  db.auction_audit_logs = (db.auction_audit_logs || []).filter((l) => l.auctionId !== auctionId);

  saveDatabase();
  res.json({ message: `Auction "${auction.name}" and all associated data deleted successfully.` });
});

/**
 * POST /api/auctions/:id/duplicate
 * Duplicate an existing auction
 */
router.post('/:id/duplicate', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const sourceId = req.params.id;
  const source = (db.auctions || []).find((a) => a.id === sourceId);

  if (!source) {
    res.status(404).json({ error: 'Source auction not found.' });
    return;
  }

  if (source.sport && !canAccessSport(req.user, source.sport)) {
    res.status(403).json({ error: `Forbidden: You do not have permission for ${source.sport}.` });
    return;
  }

  const newAuctionId = crypto.randomUUID();
  const duplicateAuction: Auction = {
    ...source,
    id: newAuctionId,
    name: `${source.name} (Copy)`,
    status: 'DRAFT',
    ownerUserId: req.user?.id,
    createdByUserId: req.user?.id,
    currentPlayerId: null,
    currentBidAmount: undefined,
    currentBidTeamId: null,
    bidCount: 0,
    timerRunning: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.auctions.push(duplicateAuction);

  // Duplicate teams
  const sourceTeams = (db.auction_teams || []).filter((t) => t.auctionId === sourceId);
  const teamIdMap = new Map<string, string>();

  sourceTeams.forEach((t) => {
    const newTeamId = crypto.randomUUID();
    teamIdMap.set(t.id, newTeamId);
    db.auction_teams.push({
      ...t,
      id: newTeamId,
      auctionId: newAuctionId,
      currentPurse: t.startingPurse,
      totalSpent: 0,
      playersBought: 0,
      overseasCount: 0,
      domesticCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  // Duplicate players
  const sourcePlayers = (db.auction_players || []).filter((p) => p.auctionId === sourceId);
  sourcePlayers.forEach((p) => {
    db.auction_players.push({
      ...p,
      id: crypto.randomUUID(),
      auctionId: newAuctionId,
      status: 'AVAILABLE',
      currentBid: undefined,
      soldPrice: undefined,
      soldToTeamId: undefined,
      soldAt: undefined,
      retainedByTeamId: undefined,
      retentionPrice: undefined,
      auctionRound: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  // Duplicate graphics
  const sourceGraphics = (db.auction_graphics || []).filter((g) => g.auctionId === sourceId);
  sourceGraphics.forEach((g) => {
    db.auction_graphics.push({
      ...g,
      id: crypto.randomUUID(),
      auctionId: newAuctionId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  logAuctionAudit(newAuctionId, 'AUCTION_CREATED', `Duplicated from "${source.name}"`, req.user);
  saveDatabase();

  res.status(201).json({ message: 'Auction duplicated successfully.', auction: duplicateAuction });
});

// ==========================================
// AUCTION TEAMS CRUD
// ==========================================

/**
 * GET /api/auctions/:id/teams
 * List all teams for an auction
 */
router.get('/:id/teams', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const auctionId = req.params.id;
  const teams = (db.auction_teams || []).filter((t) => t.auctionId === auctionId);
  res.json({ teams });
});

/**
 * POST /api/auctions/:id/teams
 * Create team for auction
 */
router.post('/:id/teams', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const auctionId = req.params.id;
  const auction = (db.auctions || []).find((a) => a.id === auctionId);

  if (!auction) {
    res.status(404).json({ error: 'Auction not found.' });
    return;
  }

  const { name, shortCode, logo, color, secondaryColor, ownerName, coach, manager, startingPurse, maxSquadSize, minSquadSize } = req.body;

  if (!name || !name.trim()) {
    res.status(400).json({ error: 'Team name is required.' });
    return;
  }

  const initialPurse = startingPurse !== undefined ? Number(startingPurse) : auction.startingPurse;

  const newTeam: AuctionTeam = {
    id: crypto.randomUUID(),
    auctionId,
    name: name.trim(),
    shortCode: (shortCode || name.substring(0, 3)).trim().toUpperCase(),
    logo: logo || '',
    color: color || '#10b981',
    secondaryColor: secondaryColor || '#0f172a',
    ownerName: ownerName || '',
    coach: coach || '',
    manager: manager || '',
    startingPurse: initialPurse,
    currentPurse: initialPurse,
    totalSpent: 0,
    playersBought: 0,
    overseasCount: 0,
    domesticCount: 0,
    maxSquadSize: maxSquadSize ? Number(maxSquadSize) : auction.maxSquadSize,
    minSquadSize: minSquadSize ? Number(minSquadSize) : auction.minSquadSize,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (!db.auction_teams) db.auction_teams = [];
  db.auction_teams.push(newTeam);

  logAuctionAudit(auctionId, 'TEAM_ADDED', `Added team "${newTeam.name}" (${newTeam.shortCode})`, req.user);
  saveDatabase();

  broadcastAuctionUpdate(auctionId, 'TEAM_ADDED', { team: newTeam });
  res.status(201).json({ message: 'Team created successfully.', team: newTeam });
});

/**
 * PUT /api/auctions/:id/teams/:teamId
 * Update team
 */
router.put('/:id/teams/:teamId', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const { id: auctionId, teamId } = req.params;
  const index = (db.auction_teams || []).findIndex((t) => t.auctionId === auctionId && t.id === teamId);

  if (index === -1) {
    res.status(404).json({ error: 'Team not found.' });
    return;
  }

  const current = db.auction_teams[index];
  const { name, shortCode, logo, color, secondaryColor, ownerName, coach, manager, startingPurse, maxSquadSize, minSquadSize } = req.body;

  const newStartingPurse = startingPurse !== undefined ? Number(startingPurse) : current.startingPurse;

  const updated: AuctionTeam = {
    ...current,
    name: name !== undefined ? name.trim() : current.name,
    shortCode: shortCode !== undefined ? shortCode.trim().toUpperCase() : current.shortCode,
    logo: logo !== undefined ? logo : current.logo,
    color: color !== undefined ? color : current.color,
    secondaryColor: secondaryColor !== undefined ? secondaryColor : current.secondaryColor,
    ownerName: ownerName !== undefined ? ownerName : current.ownerName,
    coach: coach !== undefined ? coach : current.coach,
    manager: manager !== undefined ? manager : current.manager,
    startingPurse: newStartingPurse,
    maxSquadSize: maxSquadSize !== undefined ? Number(maxSquadSize) : current.maxSquadSize,
    minSquadSize: minSquadSize !== undefined ? Number(minSquadSize) : current.minSquadSize,
    updatedAt: new Date().toISOString(),
  };

  db.auction_teams[index] = updated;
  recalculateTeamPurseAndSquad(auctionId, teamId);

  logAuctionAudit(auctionId, 'TEAM_UPDATED', `Updated team "${updated.name}"`, req.user);
  saveDatabase();

  broadcastAuctionUpdate(auctionId, 'TEAM_UPDATED', { team: db.auction_teams[index] });
  res.json({ message: 'Team updated successfully.', team: db.auction_teams[index] });
});

/**
 * DELETE /api/auctions/:id/teams/:teamId
 * Delete team and release its bought/retained players
 */
router.delete('/:id/teams/:teamId', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const { id: auctionId, teamId } = req.params;
  const team = (db.auction_teams || []).find((t) => t.auctionId === auctionId && t.id === teamId);

  if (!team) {
    res.status(404).json({ error: 'Team not found.' });
    return;
  }

  // Release players bought by this team back to AVAILABLE
  (db.auction_players || [])
    .filter((p) => p.auctionId === auctionId && (p.soldToTeamId === teamId || p.retainedByTeamId === teamId))
    .forEach((p) => {
      p.status = 'AVAILABLE';
      p.soldToTeamId = undefined;
      p.soldPrice = undefined;
      p.soldAt = undefined;
      p.retainedByTeamId = undefined;
      p.retentionPrice = undefined;
    });

  // Remove retained records for this team
  db.auction_retained_players = (db.auction_retained_players || []).filter(
    (r) => !(r.auctionId === auctionId && r.teamId === teamId)
  );

  // Remove bids placed by this team
  db.auction_bids = (db.auction_bids || []).filter((b) => !(b.auctionId === auctionId && b.teamId === teamId));

  // Remove team
  db.auction_teams = (db.auction_teams || []).filter((t) => !(t.auctionId === auctionId && t.id === teamId));

  logAuctionAudit(auctionId, 'TEAM_DELETED', `Deleted team "${team.name}"`, req.user);
  saveDatabase();

  broadcastAuctionUpdate(auctionId, 'TEAM_DELETED', { teamId });
  res.json({ message: `Team "${team.name}" deleted successfully.` });
});

// ==========================================
// AUCTION PLAYERS CRUD & IMPORT
// ==========================================

/**
 * GET /api/auctions/:id/players
 * List players with category/role/status filters
 */
router.get('/:id/players', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const auctionId = req.params.id;
  const { category, role, status, search } = req.query;

  let players = (db.auction_players || []).filter((p) => p.auctionId === auctionId);

  if (category && category !== 'ALL') {
    players = players.filter((p) => p.category === category);
  }
  if (role && role !== 'ALL') {
    players = players.filter((p) => p.role === role);
  }
  if (status && status !== 'ALL') {
    players = players.filter((p) => p.status === status);
  }
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    players = players.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.country.toLowerCase().includes(q) ||
        (p.role && p.role.toLowerCase().includes(q))
    );
  }

  // Sort by orderNumber
  players.sort((a, b) => (a.orderNumber || 9999) - (b.orderNumber || 9999));

  res.json({ players });
});

/**
 * POST /api/auctions/:id/players
 * Create single player
 */
router.post('/:id/players', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const auctionId = req.params.id;
  const auction = (db.auctions || []).find((a) => a.id === auctionId);

  if (!auction) {
    res.status(404).json({ error: 'Auction not found.' });
    return;
  }

  const {
    name,
    photo,
    country,
    nationality,
    isOverseas,
    age,
    role,
    primarySkill,
    secondarySkill,
    battingStyle,
    bowlingStyle,
    basePrice,
    category,
    orderNumber,
    playerNumber,
    biography,
    stats,
    previousTeam,
    specialTags,
  } = req.body;

  if (!name || !name.trim()) {
    res.status(400).json({ error: 'Player name is required.' });
    return;
  }

  const existingPlayers = (db.auction_players || []).filter((p) => p.auctionId === auctionId);
  const nextOrder = orderNumber !== undefined ? Number(orderNumber) : existingPlayers.length + 1;

  const newPlayer: AuctionPlayer = {
    id: crypto.randomUUID(),
    auctionId,
    name: name.trim(),
    photo: photo || '',
    country: country || 'India',
    nationality: nationality || country || 'Indian',
    isOverseas: Boolean(isOverseas),
    age: age ? Number(age) : undefined,
    role: role || 'BATTER',
    primarySkill: primarySkill || '',
    secondarySkill: secondarySkill || '',
    battingStyle: battingStyle || 'Right Hand Bat',
    bowlingStyle: bowlingStyle || '',
    basePrice: Number(basePrice) || 2000000, // 20 Lakh default
    category: category || 'UNCAPPED',
    status: 'AVAILABLE',
    orderNumber: nextOrder,
    playerNumber: playerNumber || undefined,
    auctionRound: 1,
    biography: biography || '',
    stats: stats || {},
    previousTeam: previousTeam || '',
    specialTags: specialTags || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (!db.auction_players) db.auction_players = [];
  db.auction_players.push(newPlayer);

  logAuctionAudit(auctionId, 'PLAYER_ADDED', `Added player "${newPlayer.name}" (${newPlayer.category})`, req.user);
  saveDatabase();

  broadcastAuctionUpdate(auctionId, 'PLAYER_ADDED', { player: newPlayer });
  res.status(201).json({ message: 'Player added successfully.', player: newPlayer });
});

/**
 * PUT /api/auctions/:id/players/:playerId
 * Update player
 */
router.put('/:id/players/:playerId', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const { id: auctionId, playerId } = req.params;
  const index = (db.auction_players || []).findIndex((p) => p.auctionId === auctionId && p.id === playerId);

  if (index === -1) {
    res.status(404).json({ error: 'Player not found.' });
    return;
  }

  const current = db.auction_players[index];
  const {
    name,
    photo,
    country,
    nationality,
    isOverseas,
    age,
    role,
    primarySkill,
    secondarySkill,
    battingStyle,
    bowlingStyle,
    basePrice,
    category,
    status,
    orderNumber,
    playerNumber,
    biography,
    stats,
    previousTeam,
    specialTags,
  } = req.body;

  const updated: AuctionPlayer = {
    ...current,
    name: name !== undefined ? name.trim() : current.name,
    photo: photo !== undefined ? photo : current.photo,
    country: country !== undefined ? country : current.country,
    nationality: nationality !== undefined ? nationality : current.nationality,
    isOverseas: isOverseas !== undefined ? Boolean(isOverseas) : current.isOverseas,
    age: age !== undefined ? Number(age) : current.age,
    role: role !== undefined ? role : current.role,
    primarySkill: primarySkill !== undefined ? primarySkill : current.primarySkill,
    secondarySkill: secondarySkill !== undefined ? secondarySkill : current.secondarySkill,
    battingStyle: battingStyle !== undefined ? battingStyle : current.battingStyle,
    bowlingStyle: bowlingStyle !== undefined ? bowlingStyle : current.bowlingStyle,
    basePrice: basePrice !== undefined ? Number(basePrice) : current.basePrice,
    category: category !== undefined ? category : current.category,
    status: status !== undefined ? status : current.status,
    orderNumber: orderNumber !== undefined ? Number(orderNumber) : current.orderNumber,
    playerNumber: playerNumber !== undefined ? playerNumber : current.playerNumber,
    biography: biography !== undefined ? biography : current.biography,
    stats: stats !== undefined ? stats : current.stats,
    previousTeam: previousTeam !== undefined ? previousTeam : current.previousTeam,
    specialTags: specialTags !== undefined ? specialTags : current.specialTags,
    updatedAt: new Date().toISOString(),
  };

  db.auction_players[index] = updated;
  logAuctionAudit(auctionId, 'PLAYER_UPDATED', `Updated player "${updated.name}"`, req.user);
  saveDatabase();

  broadcastAuctionUpdate(auctionId, 'PLAYER_UPDATED', { player: updated });
  res.json({ message: 'Player updated successfully.', player: updated });
});

/**
 * DELETE /api/auctions/:id/players/:playerId
 * Delete player
 */
router.delete('/:id/players/:playerId', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const { id: auctionId, playerId } = req.params;
  const player = (db.auction_players || []).find((p) => p.auctionId === auctionId && p.id === playerId);

  if (!player) {
    res.status(404).json({ error: 'Player not found.' });
    return;
  }

  // Remove bids for this player
  db.auction_bids = (db.auction_bids || []).filter((b) => !(b.auctionId === auctionId && b.playerId === playerId));
  // Remove results
  db.auction_results = (db.auction_results || []).filter((r) => !(r.auctionId === auctionId && r.playerId === playerId));
  // Remove retained record
  db.auction_retained_players = (db.auction_retained_players || []).filter(
    (r) => !(r.auctionId === auctionId && r.playerId === playerId)
  );

  // If this player was currently on stage, clear current player
  const auction = (db.auctions || []).find((a) => a.id === auctionId);
  if (auction && auction.currentPlayerId === playerId) {
    auction.currentPlayerId = null;
    auction.currentBidAmount = undefined;
    auction.currentBidTeamId = null;
    stopAuctionCountdown(auctionId);
  }

  // Delete player
  db.auction_players = (db.auction_players || []).filter((p) => !(p.auctionId === auctionId && p.id === playerId));

  // If player was sold/retained, recalculate team purse
  if (player.soldToTeamId) {
    recalculateTeamPurseAndSquad(auctionId, player.soldToTeamId);
  }
  if (player.retainedByTeamId) {
    recalculateTeamPurseAndSquad(auctionId, player.retainedByTeamId);
  }

  logAuctionAudit(auctionId, 'PLAYER_DELETED', `Deleted player "${player.name}"`, req.user);
  saveDatabase();

  broadcastAuctionUpdate(auctionId, 'PLAYER_DELETED', { playerId });
  res.json({ message: `Player "${player.name}" deleted successfully.` });
});

/**
 * POST /api/auctions/:id/players/import
 * Batch import players with duplicate checks
 */
router.post('/:id/players/import', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const auctionId = req.params.id;
  const auction = (db.auctions || []).find((a) => a.id === auctionId);

  if (!auction) {
    res.status(404).json({ error: 'Auction not found.' });
    return;
  }

  const { players: importedList } = req.body;

  if (!Array.isArray(importedList) || importedList.length === 0) {
    res.status(400).json({ error: 'No players provided for import.' });
    return;
  }

  if (!db.auction_players) db.auction_players = [];
  const existingInAuction = db.auction_players.filter((p) => p.auctionId === auctionId);
  const existingNames = new Set(existingInAuction.map((p) => p.name.trim().toLowerCase()));

  const addedPlayers: AuctionPlayer[] = [];
  let skippedDuplicates = 0;
  let currentOrder = existingInAuction.length + 1;

  importedList.forEach((raw: any) => {
    const rawName = (raw.name || raw.playerName || '').trim();
    if (!rawName) return;

    if (existingNames.has(rawName.toLowerCase())) {
      skippedDuplicates++;
      return;
    }

    existingNames.add(rawName.toLowerCase());

    const isOverseas =
      raw.isOverseas === true ||
      raw.isOverseas === 'true' ||
      (raw.country && raw.country.trim().toLowerCase() !== 'india');

    const player: AuctionPlayer = {
      id: crypto.randomUUID(),
      auctionId,
      name: rawName,
      photo: raw.photo || '',
      country: raw.country || 'India',
      nationality: raw.nationality || raw.country || 'Indian',
      isOverseas,
      age: raw.age ? Number(raw.age) : undefined,
      role: (raw.role || 'BATTER').toUpperCase(),
      primarySkill: raw.primarySkill || '',
      secondarySkill: raw.secondarySkill || '',
      battingStyle: raw.battingStyle || 'Right Hand Bat',
      bowlingStyle: raw.bowlingStyle || '',
      basePrice: Number(raw.basePrice) || 2000000,
      category: raw.category || 'UNCAPPED',
      status: 'AVAILABLE',
      orderNumber: raw.orderNumber ? Number(raw.orderNumber) : currentOrder++,
      playerNumber: raw.playerNumber || raw.jerseyNumber || undefined,
      auctionRound: 1,
      biography: raw.biography || '',
      stats: raw.stats || {
        matches: raw.matches ? Number(raw.matches) : undefined,
        runs: raw.runs ? Number(raw.runs) : undefined,
        wickets: raw.wickets ? Number(raw.wickets) : undefined,
        battingAverage: raw.battingAverage ? Number(raw.battingAverage) : undefined,
        strikeRate: raw.strikeRate ? Number(raw.strikeRate) : undefined,
      },
      previousTeam: raw.previousTeam || '',
      specialTags: Array.isArray(raw.specialTags) ? raw.specialTags : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.auction_players.push(player);
    addedPlayers.push(player);
  });

  logAuctionAudit(
    auctionId,
    'PLAYERS_IMPORTED',
    `Imported ${addedPlayers.length} players (${skippedDuplicates} duplicates skipped)`,
    req.user
  );
  saveDatabase();

  broadcastAuctionUpdate(auctionId, 'PLAYERS_IMPORTED', { count: addedPlayers.length });
  res.json({
    message: `Imported ${addedPlayers.length} players successfully.${
      skippedDuplicates > 0 ? ` (${skippedDuplicates} duplicates skipped)` : ''
    }`,
    addedCount: addedPlayers.length,
    skippedDuplicates,
    players: addedPlayers,
  });
});

// ==========================================
// RETAINED PLAYERS
// ==========================================

/**
 * GET /api/auctions/:id/retained
 * Get retained players
 */
router.get('/:id/retained', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const auctionId = req.params.id;
  const retained = (db.auction_retained_players || []).filter((r) => r.auctionId === auctionId);
  res.json({ retained });
});

/**
 * POST /api/auctions/:id/retained
 * Add retained player
 */
router.post('/:id/retained', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const auctionId = req.params.id;
  const { playerId, teamId, retentionPrice } = req.body;

  const player = (db.auction_players || []).find((p) => p.auctionId === auctionId && p.id === playerId);
  const team = (db.auction_teams || []).find((t) => t.auctionId === auctionId && t.id === teamId);

  if (!player) {
    res.status(404).json({ error: 'Player not found.' });
    return;
  }
  if (!team) {
    res.status(404).json({ error: 'Team not found.' });
    return;
  }

  const price = Number(retentionPrice) || player.basePrice || 10000000;

  // Mark player as RETAINED
  player.status = 'RETAINED';
  player.retainedByTeamId = teamId;
  player.retentionPrice = price;
  player.updatedAt = new Date().toISOString();

  if (!db.auction_retained_players) db.auction_retained_players = [];
  const retainedRecord: AuctionRetainedPlayer = {
    id: crypto.randomUUID(),
    auctionId,
    playerId,
    playerName: player.name,
    teamId,
    teamName: team.name,
    retentionPrice: price,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.auction_retained_players.push(retainedRecord);

  recalculateTeamPurseAndSquad(auctionId, teamId);

  logAuctionAudit(
    auctionId,
    'RETAINED_PLAYER_ADDED',
    `Retained ${player.name} for team ${team.name} at ₹${(price / 10000000).toFixed(2)} Cr`,
    req.user
  );
  saveDatabase();

  broadcastAuctionUpdate(auctionId, 'RETAINED_PLAYER_ADDED', { retainedRecord });
  res.status(201).json({ message: 'Retained player recorded.', retainedRecord });
});

/**
 * DELETE /api/auctions/:id/retained/:retainedId
 * Remove retained player
 */
router.delete('/:id/retained/:retainedId', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const { id: auctionId, retainedId } = req.params;
  const index = (db.auction_retained_players || []).findIndex((r) => r.auctionId === auctionId && r.id === retainedId);

  if (index === -1) {
    res.status(404).json({ error: 'Retained record not found.' });
    return;
  }

  const record = db.auction_retained_players[index];
  const player = (db.auction_players || []).find((p) => p.auctionId === auctionId && p.id === record.playerId);

  if (player) {
    player.status = 'AVAILABLE';
    player.retainedByTeamId = undefined;
    player.retentionPrice = undefined;
  }

  db.auction_retained_players.splice(index, 1);
  recalculateTeamPurseAndSquad(auctionId, record.teamId);

  logAuctionAudit(auctionId, 'RETAINED_PLAYER_REMOVED', `Released retention on ${record.playerName}`, req.user);
  saveDatabase();

  broadcastAuctionUpdate(auctionId, 'RETAINED_PLAYER_REMOVED', { retainedId });
  res.json({ message: 'Retained player released back to pool.' });
});

// ==========================================
// LIVE AUCTION ROOM & BID ENGINE
// ==========================================

/**
 * GET /api/auctions/:id/state
 * Get current live auction state
 */
router.get('/:id/state', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const auctionId = req.params.id;
  const state = getAuctionLiveState(auctionId);

  if (!state) {
    res.status(404).json({ error: 'Auction not found.' });
    return;
  }

  res.json({ state });
});

/**
 * GET /api/auctions/:id/public
 * Public view endpoint (No Auth required) for browser / OBS
 */
router.get('/:id/public', (req, res): void => {
  const auctionId = req.params.id;
  const state = getAuctionLiveState(auctionId);

  if (!state) {
    res.status(404).json({ error: 'Auction not found.' });
    return;
  }

  res.json({ state });
});

/**
 * GET /api/auctions/:id/stream
 * Realtime SSE endpoint for public viewers, admin dashboard, and OBS overlays
 */
router.get('/:id/stream', (req, res): void => {
  const auctionId = req.params.id;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  if (!auctionSseClientsMap.has(auctionId)) {
    auctionSseClientsMap.set(auctionId, []);
  }
  auctionSseClientsMap.get(auctionId)!.push(res);

  // Send initial state ping
  const state = getAuctionLiveState(auctionId);
  if (state) {
    res.write(`event: INITIAL_STATE\ndata: ${JSON.stringify({ state })}\n\n`);
  }

  req.on('close', () => {
    const clients = auctionSseClientsMap.get(auctionId) || [];
    auctionSseClientsMap.set(
      auctionId,
      clients.filter((c) => c !== res)
    );
  });
});

/**
 * POST /api/auctions/:id/set-current-player
 * Put a player on the auction block
 */
router.post('/:id/set-current-player', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const auctionId = req.params.id;
  const { playerId } = req.body;

  const auction = (db.auctions || []).find((a) => a.id === auctionId);
  const player = (db.auction_players || []).find((p) => p.auctionId === auctionId && p.id === playerId);

  if (!auction || !player) {
    res.status(404).json({ error: 'Auction or player not found.' });
    return;
  }

  auction.status = 'LIVE';
  auction.currentPlayerId = playerId;
  auction.currentBidAmount = player.basePrice;
  auction.currentBidTeamId = null;
  auction.bidCount = 0;
  auction.updatedAt = new Date().toISOString();

  player.status = 'IN_AUCTION';
  player.currentBid = player.basePrice;

  // Clear previous bids for this player in this round
  db.auction_bids = (db.auction_bids || []).filter(
    (b) => !(b.auctionId === auctionId && b.playerId === playerId)
  );

  // Auto trigger PLAYER_INTRO graphic
  const introGraphic = (db.auction_graphics || []).find(
    (g) => g.auctionId === auctionId && g.type === 'PLAYER_INTRO' && g.enabled
  );
  if (introGraphic) {
    auction.activeGraphicId = introGraphic.id;
  }

  // Start timer
  const timerSecs = auction.timerDurationSeconds || 15;
  startAuctionCountdown(auctionId, timerSecs);

  logAuctionAudit(
    auctionId,
    'PLAYER_AUCTION_STARTED',
    `Player "${player.name}" entered auction with base price ₹${(player.basePrice / 100000).toFixed(2)} Lakh`,
    req.user
  );
  saveDatabase();

  broadcastAuctionUpdate(auctionId, 'PLAYER_STARTED', { player });
  res.json({ message: `Player "${player.name}" is now live on the auction block.`, state: getAuctionLiveState(auctionId) });
});

/**
 * POST /api/auctions/:id/bid
 * Place a bid from a team
 */
router.post('/:id/bid', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const auctionId = req.params.id;
  const { teamId, customAmount } = req.body;

  const auction = (db.auctions || []).find((a) => a.id === auctionId);
  if (!auction || !auction.currentPlayerId) {
    res.status(400).json({ error: 'No player is currently on the auction block.' });
    return;
  }

  const player = (db.auction_players || []).find((p) => p.auctionId === auctionId && p.id === auction.currentPlayerId);
  const team = (db.auction_teams || []).find((t) => t.auctionId === auctionId && t.id === teamId);

  if (!player || !team) {
    res.status(404).json({ error: 'Player or team not found.' });
    return;
  }

  // Prevent team from bidding against itself
  if (auction.currentBidTeamId === teamId && (auction.bidCount || 0) > 0) {
    res.status(400).json({ error: `${team.name} already holds the highest bid.` });
    return;
  }

  // Determine bid amount
  let bidAmount: number;
  if (customAmount && Number(customAmount) > 0) {
    bidAmount = Number(customAmount);
    if (auction.currentBidAmount && bidAmount <= auction.currentBidAmount) {
      res.status(400).json({
        error: `Custom bid must be greater than current bid ₹${((auction.currentBidAmount || 0) / 10000000).toFixed(2)} Cr.`,
      });
      return;
    }
  } else {
    // If first bid, use basePrice. Else calculate next increment
    if (!auction.currentBidTeamId || (auction.bidCount || 0) === 0) {
      bidAmount = player.basePrice;
    } else {
      bidAmount = calculateNextBidAmount(
        auction.currentBidAmount || player.basePrice,
        player.basePrice,
        auction.bidIncrements
      );
    }
  }

  // Validate team eligibility
  const eligibility = validateTeamBidEligibility(team, player, bidAmount, auction);
  if (!eligibility.eligible) {
    res.status(400).json({ error: eligibility.reason });
    return;
  }

  // Create immutable bid record
  if (!db.auction_bids) db.auction_bids = [];
  const playerBids = db.auction_bids.filter((b) => b.auctionId === auctionId && b.playerId === player.id);
  const nextSequence = playerBids.length + 1;

  const newBid: AuctionBid = {
    id: crypto.randomUUID(),
    auctionId,
    playerId: player.id,
    teamId: team.id,
    teamName: team.name,
    teamShortCode: team.shortCode,
    teamLogo: team.logo,
    amount: bidAmount,
    bidSequence: nextSequence,
    timestamp: new Date().toISOString(),
    operatorId: req.user?.id,
    operatorName: req.user?.name,
    isCustom: Boolean(customAmount),
  };

  db.auction_bids.push(newBid);

  // Update auction state
  auction.currentBidAmount = bidAmount;
  auction.currentBidTeamId = team.id;
  auction.bidCount = nextSequence;
  player.currentBid = bidAmount;

  // Trigger BID_UPDATE graphic
  const bidGraphic = (db.auction_graphics || []).find(
    (g) => g.auctionId === auctionId && g.type === 'BID_UPDATE' && g.enabled
  );
  if (bidGraphic) {
    auction.activeGraphicId = bidGraphic.id;
  }

  // Reset bidding countdown timer
  const timerSecs = auction.timerDurationSeconds || 15;
  startAuctionCountdown(auctionId, timerSecs);

  logAuctionAudit(
    auctionId,
    'BID_PLACED',
    `${team.name} placed bid #${nextSequence} of ₹${(bidAmount / 10000000).toFixed(2)} Cr for ${player.name}`,
    req.user,
    { bidId: newBid.id, amount: bidAmount, teamId: team.id }
  );
  saveDatabase();

  broadcastAuctionUpdate(auctionId, 'BID_PLACED', { bid: newBid, team, player });
  res.json({ message: `Bid of ₹${(bidAmount / 10000000).toFixed(2)} Cr placed by ${team.name}.`, bid: newBid, state: getAuctionLiveState(auctionId) });
});

/**
 * POST /api/auctions/:id/withdraw-bid
 * Withdraw the highest bid if placed accidentally
 */
router.post('/:id/withdraw-bid', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const auctionId = req.params.id;
  const auction = (db.auctions || []).find((a) => a.id === auctionId);

  if (!auction || !auction.currentPlayerId) {
    res.status(400).json({ error: 'No player is currently on the auction block.' });
    return;
  }

  const player = (db.auction_players || []).find((p) => p.auctionId === auctionId && p.id === auction.currentPlayerId);
  if (!player) {
    res.status(404).json({ error: 'Player not found.' });
    return;
  }

  const playerBids = (db.auction_bids || [])
    .filter((b) => b.auctionId === auctionId && b.playerId === player.id)
    .sort((a, b) => b.bidSequence - a.bidSequence);

  if (playerBids.length === 0) {
    res.status(400).json({ error: 'No bids to withdraw.' });
    return;
  }

  const lastBid = playerBids[0];
  // Remove last bid
  db.auction_bids = (db.auction_bids || []).filter((b) => b.id !== lastBid.id);

  const remainingBids = (db.auction_bids || [])
    .filter((b) => b.auctionId === auctionId && b.playerId === player.id)
    .sort((a, b) => b.bidSequence - a.bidSequence);

  if (remainingBids.length > 0) {
    const prev = remainingBids[0];
    auction.currentBidAmount = prev.amount;
    auction.currentBidTeamId = prev.teamId;
    auction.bidCount = remainingBids.length;
    player.currentBid = prev.amount;
  } else {
    auction.currentBidAmount = player.basePrice;
    auction.currentBidTeamId = null;
    auction.bidCount = 0;
    player.currentBid = player.basePrice;
  }

  logAuctionAudit(
    auctionId,
    'BID_WITHDRAWN',
    `Withdrew bid of ₹${(lastBid.amount / 10000000).toFixed(2)} Cr from ${lastBid.teamName}`,
    req.user
  );
  saveDatabase();

  broadcastAuctionUpdate(auctionId, 'BID_WITHDRAWN');
  res.json({ message: 'Last bid successfully withdrawn.', state: getAuctionLiveState(auctionId) });
});

/**
 * POST /api/auctions/:id/sell
 * Confirm SELL of current player to the highest bidder
 */
router.post('/:id/sell', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const auctionId = req.params.id;
  const auction = (db.auctions || []).find((a) => a.id === auctionId);

  if (!auction || !auction.currentPlayerId) {
    res.status(400).json({ error: 'No player on auction block to sell.' });
    return;
  }

  const player = (db.auction_players || []).find((p) => p.auctionId === auctionId && p.id === auction.currentPlayerId);
  if (!player) {
    res.status(404).json({ error: 'Player not found.' });
    return;
  }

  if (!auction.currentBidTeamId || !auction.currentBidAmount) {
    res.status(400).json({ error: 'Cannot sell player with zero bids. Mark as UNSOLD instead.' });
    return;
  }

  const winningTeam = (db.auction_teams || []).find((t) => t.auctionId === auctionId && t.id === auction.currentBidTeamId);
  if (!winningTeam) {
    res.status(404).json({ error: 'Winning team not found.' });
    return;
  }

  const finalPrice = auction.currentBidAmount;

  // Stop timer
  stopAuctionCountdown(auctionId);

  // Update player
  player.status = 'SOLD';
  player.soldPrice = finalPrice;
  player.soldToTeamId = winningTeam.id;
  player.soldAt = new Date().toISOString();
  player.updatedAt = new Date().toISOString();

  // Create auction result record
  if (!db.auction_results) db.auction_results = [];
  const playerBids = (db.auction_bids || [])
    .filter((b) => b.auctionId === auctionId && b.playerId === player.id)
    .sort((a, b) => a.bidSequence - b.bidSequence);

  const result: AuctionResult = {
    id: crypto.randomUUID(),
    auctionId,
    playerId: player.id,
    playerName: player.name,
    playerRole: player.role,
    isOverseas: player.isOverseas,
    category: player.category,
    status: 'SOLD',
    winningTeamId: winningTeam.id,
    winningTeamName: winningTeam.name,
    soldPrice: finalPrice,
    basePrice: player.basePrice,
    bidCount: playerBids.length,
    auctionRound: player.auctionRound || 1,
    completedAt: new Date().toISOString(),
    bidsSummary: playerBids.map((b) => ({
      teamId: b.teamId,
      teamName: b.teamName,
      amount: b.amount,
      timestamp: b.timestamp,
    })),
  };
  db.auction_results.push(result);

  // Recalculate team purse & squad
  recalculateTeamPurseAndSquad(auctionId, winningTeam.id);

  // Trigger SOLD celebration graphic
  const soldGraphic = (db.auction_graphics || []).find(
    (g) => g.auctionId === auctionId && g.type === 'SOLD' && g.enabled
  );
  if (soldGraphic) {
    auction.activeGraphicId = soldGraphic.id;
  }

  // Clear current player on block
  auction.currentPlayerId = null;
  auction.currentBidAmount = undefined;
  auction.currentBidTeamId = null;
  auction.bidCount = 0;

  logAuctionAudit(
    auctionId,
    'PLAYER_SOLD',
    `Hammer down: ${player.name} SOLD to ${winningTeam.name} for ₹${(finalPrice / 10000000).toFixed(2)} Cr`,
    req.user,
    { playerId: player.id, teamId: winningTeam.id, price: finalPrice }
  );
  saveDatabase();

  broadcastAuctionUpdate(auctionId, 'PLAYER_SOLD', { player, team: winningTeam, price: finalPrice, result });
  res.json({ message: `Player ${player.name} SOLD to ${winningTeam.name} for ₹${(finalPrice / 10000000).toFixed(2)} Cr!`, result, state: getAuctionLiveState(auctionId) });
});

/**
 * POST /api/auctions/:id/unsold
 * Mark current player as UNSOLD
 */
router.post('/:id/unsold', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const auctionId = req.params.id;
  const { reason } = req.body;

  const auction = (db.auctions || []).find((a) => a.id === auctionId);
  if (!auction || !auction.currentPlayerId) {
    res.status(400).json({ error: 'No player on auction block to mark unsold.' });
    return;
  }

  const player = (db.auction_players || []).find((p) => p.auctionId === auctionId && p.id === auction.currentPlayerId);
  if (!player) {
    res.status(404).json({ error: 'Player not found.' });
    return;
  }

  // Stop timer
  stopAuctionCountdown(auctionId);

  // Update player
  player.status = 'UNSOLD';
  player.unsoldReason = reason || 'No bids placed in round ' + (player.auctionRound || 1);
  player.updatedAt = new Date().toISOString();

  // Create result record
  if (!db.auction_results) db.auction_results = [];
  const result: AuctionResult = {
    id: crypto.randomUUID(),
    auctionId,
    playerId: player.id,
    playerName: player.name,
    playerRole: player.role,
    isOverseas: player.isOverseas,
    category: player.category,
    status: 'UNSOLD',
    basePrice: player.basePrice,
    bidCount: 0,
    auctionRound: player.auctionRound || 1,
    completedAt: new Date().toISOString(),
    bidsSummary: [],
  };
  db.auction_results.push(result);

  // Trigger UNSOLD graphic
  const unsoldGraphic = (db.auction_graphics || []).find(
    (g) => g.auctionId === auctionId && g.type === 'UNSOLD' && g.enabled
  );
  if (unsoldGraphic) {
    auction.activeGraphicId = unsoldGraphic.id;
  }

  // Clear current player on block
  auction.currentPlayerId = null;
  auction.currentBidAmount = undefined;
  auction.currentBidTeamId = null;
  auction.bidCount = 0;

  logAuctionAudit(auctionId, 'PLAYER_UNSOLD', `Player ${player.name} went UNSOLD (Round ${player.auctionRound || 1})`, req.user);
  saveDatabase();

  broadcastAuctionUpdate(auctionId, 'PLAYER_UNSOLD', { player, result });
  res.json({ message: `Player ${player.name} marked as UNSOLD.`, result, state: getAuctionLiveState(auctionId) });
});

/**
 * POST /api/auctions/:id/reauction
 * Bring an unsold player back to pool for accelerated / re-auction round
 */
router.post('/:id/reauction', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const auctionId = req.params.id;
  const { playerId, newBasePrice } = req.body;

  const player = (db.auction_players || []).find((p) => p.auctionId === auctionId && p.id === playerId);
  if (!player) {
    res.status(404).json({ error: 'Player not found.' });
    return;
  }

  player.status = 'AVAILABLE';
  player.auctionRound = (player.auctionRound || 1) + 1;
  if (newBasePrice && Number(newBasePrice) > 0) {
    player.basePrice = Number(newBasePrice);
  }
  player.unsoldReason = undefined;
  player.updatedAt = new Date().toISOString();

  logAuctionAudit(
    auctionId,
    'PLAYER_REAUCTIONED',
    `Re-auctioned ${player.name} for Round ${player.auctionRound} at base price ₹${(player.basePrice / 100000).toFixed(2)} Lakh`,
    req.user
  );
  saveDatabase();

  broadcastAuctionUpdate(auctionId, 'PLAYER_REAUCTIONED', { player });
  res.json({ message: `Player ${player.name} re-added to auction pool for Round ${player.auctionRound}.`, player });
});

/**
 * POST /api/auctions/:id/timer/start
 */
router.post('/:id/timer/start', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const auctionId = req.params.id;
  const { seconds } = req.body;
  const duration = Number(seconds) || 15;

  startAuctionCountdown(auctionId, duration);
  res.json({ message: `Timer started for ${duration}s.` });
});

/**
 * POST /api/auctions/:id/timer/stop
 */
router.post('/:id/timer/stop', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const auctionId = req.params.id;
  stopAuctionCountdown(auctionId);
  res.json({ message: 'Timer stopped.' });
});

/**
 * POST /api/auctions/:id/pause
 */
router.post('/:id/pause', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const auctionId = req.params.id;
  const auction = (db.auctions || []).find((a) => a.id === auctionId);

  if (!auction) {
    res.status(404).json({ error: 'Auction not found.' });
    return;
  }

  stopAuctionCountdown(auctionId);
  auction.status = 'PAUSED';

  // Trigger AUCTION_BREAK graphic if present
  const breakGraphic = (db.auction_graphics || []).find(
    (g) => g.auctionId === auctionId && g.type === 'AUCTION_BREAK' && g.enabled
  );
  if (breakGraphic) {
    auction.activeGraphicId = breakGraphic.id;
  }

  logAuctionAudit(auctionId, 'AUCTION_PAUSED', `Auction paused`, req.user);
  saveDatabase();

  broadcastAuctionUpdate(auctionId, 'AUCTION_PAUSED');
  res.json({ message: 'Auction paused.', state: getAuctionLiveState(auctionId) });
});

/**
 * POST /api/auctions/:id/resume
 */
router.post('/:id/resume', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const auctionId = req.params.id;
  const auction = (db.auctions || []).find((a) => a.id === auctionId);

  if (!auction) {
    res.status(404).json({ error: 'Auction not found.' });
    return;
  }

  auction.status = 'LIVE';
  auction.activeGraphicId = null;

  logAuctionAudit(auctionId, 'AUCTION_RESUMED', `Auction resumed`, req.user);
  saveDatabase();

  broadcastAuctionUpdate(auctionId, 'AUCTION_RESUMED');
  res.json({ message: 'Auction resumed.', state: getAuctionLiveState(auctionId) });
});

/**
 * POST /api/auctions/:id/complete
 */
router.post('/:id/complete', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const auctionId = req.params.id;
  const auction = (db.auctions || []).find((a) => a.id === auctionId);

  if (!auction) {
    res.status(404).json({ error: 'Auction not found.' });
    return;
  }

  stopAuctionCountdown(auctionId);
  auction.status = 'COMPLETED';
  auction.currentPlayerId = null;

  const completedGraphic = (db.auction_graphics || []).find(
    (g) => g.auctionId === auctionId && g.type === 'AUCTION_COMPLETED' && g.enabled
  );
  if (completedGraphic) {
    auction.activeGraphicId = completedGraphic.id;
  }

  logAuctionAudit(auctionId, 'AUCTION_COMPLETED', `Auction marked as completed`, req.user);
  saveDatabase();

  broadcastAuctionUpdate(auctionId, 'AUCTION_COMPLETED');
  res.json({ message: 'Auction marked as completed.', state: getAuctionLiveState(auctionId) });
});

// ==========================================
// AUCTION GRAPHICS MANAGEMENT
// ==========================================

/**
 * GET /api/auctions/:id/graphics
 * List graphics configs for an auction
 */
router.get('/:id/graphics', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const auctionId = req.params.id;
  const graphics = (db.auction_graphics || []).filter((g) => g.auctionId === auctionId);
  res.json({ graphics });
});

/**
 * POST /api/auctions/:id/graphics
 * Create or edit graphics config
 */
router.post('/:id/graphics', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const auctionId = req.params.id;
  const {
    id,
    name,
    type,
    enabled,
    position,
    shape,
    primaryColor,
    secondaryColor,
    accentColor,
    textColor,
    opacity,
    animation,
    durationSeconds,
    showPlayerPhoto,
    showTeamLogo,
    showSponsorLogo,
    customTitle,
    customSubtitle,
  } = req.body;

  if (!name || !type) {
    res.status(400).json({ error: 'Graphic name and type are required.' });
    return;
  }

  if (!db.auction_graphics) db.auction_graphics = [];

  let graphic: AuctionGraphicConfig;
  const existingIdx = db.auction_graphics.findIndex((g) => g.auctionId === auctionId && g.id === id);

  if (existingIdx >= 0) {
    graphic = {
      ...db.auction_graphics[existingIdx],
      name,
      type,
      enabled: enabled !== undefined ? Boolean(enabled) : true,
      position: position || 'BOTTOM',
      shape: shape || 'ROUNDED',
      primaryColor: primaryColor || '#0f172a',
      secondaryColor: secondaryColor || '#1e293b',
      accentColor: accentColor || '#10b981',
      textColor: textColor || '#ffffff',
      opacity: opacity !== undefined ? Number(opacity) : 0.95,
      animation: animation || 'SLIDE_UP',
      durationSeconds: durationSeconds !== undefined ? Number(durationSeconds) : 6,
      showPlayerPhoto: showPlayerPhoto !== undefined ? Boolean(showPlayerPhoto) : true,
      showTeamLogo: showTeamLogo !== undefined ? Boolean(showTeamLogo) : true,
      showSponsorLogo: showSponsorLogo !== undefined ? Boolean(showSponsorLogo) : true,
      customTitle: customTitle || '',
      customSubtitle: customSubtitle || '',
      updatedAt: new Date().toISOString(),
    };
    db.auction_graphics[existingIdx] = graphic;
  } else {
    graphic = {
      id: id || crypto.randomUUID(),
      auctionId,
      name,
      type,
      enabled: enabled !== undefined ? Boolean(enabled) : true,
      position: position || 'BOTTOM',
      shape: shape || 'ROUNDED',
      primaryColor: primaryColor || '#0f172a',
      secondaryColor: secondaryColor || '#1e293b',
      accentColor: accentColor || '#10b981',
      textColor: textColor || '#ffffff',
      opacity: opacity !== undefined ? Number(opacity) : 0.95,
      animation: animation || 'SLIDE_UP',
      durationSeconds: durationSeconds !== undefined ? Number(durationSeconds) : 6,
      showPlayerPhoto: showPlayerPhoto !== undefined ? Boolean(showPlayerPhoto) : true,
      showTeamLogo: showTeamLogo !== undefined ? Boolean(showTeamLogo) : true,
      showSponsorLogo: showSponsorLogo !== undefined ? Boolean(showSponsorLogo) : true,
      customTitle: customTitle || '',
      customSubtitle: customSubtitle || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.auction_graphics.push(graphic);
  }

  saveDatabase();
  broadcastAuctionUpdate(auctionId, 'GRAPHICS_CONFIG_UPDATED');
  res.json({ message: 'Auction graphic configuration saved.', graphic });
});

/**
 * POST /api/auctions/:id/graphics/trigger
 * Manually trigger / activate a graphic overlay on the broadcast
 */
router.post('/:id/graphics/trigger', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const auctionId = req.params.id;
  const { graphicId, graphicType } = req.body;

  const auction = (db.auctions || []).find((a) => a.id === auctionId);
  if (!auction) {
    res.status(404).json({ error: 'Auction not found.' });
    return;
  }

  let graphic: AuctionGraphicConfig | undefined;
  if (graphicId) {
    graphic = (db.auction_graphics || []).find((g) => g.auctionId === auctionId && g.id === graphicId);
  } else if (graphicType) {
    graphic = (db.auction_graphics || []).find((g) => g.auctionId === auctionId && g.type === graphicType);
  }

  if (graphic) {
    auction.activeGraphicId = graphic.id;
  } else {
    auction.activeGraphicId = null;
  }

  logAuctionAudit(auctionId, 'GRAPHIC_TRIGGERED', `Triggered graphic overlay "${graphic?.name || graphicType}"`, req.user);
  saveDatabase();

  broadcastAuctionUpdate(auctionId, 'GRAPHIC_TRIGGERED', { graphic, graphicType });
  res.json({ message: 'Broadcast graphic triggered.', graphic });
});

/**
 * POST /api/auctions/:id/graphics/clear
 * Clear active graphic overlay
 */
router.post('/:id/graphics/clear', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const auctionId = req.params.id;
  const auction = (db.auctions || []).find((a) => a.id === auctionId);

  if (auction) {
    auction.activeGraphicId = null;
    saveDatabase();
  }

  broadcastAuctionUpdate(auctionId, 'GRAPHIC_CLEARED');
  res.json({ message: 'Active graphic cleared.' });
});

// ==========================================
// REPORTS & AUDIT LOGS
// ==========================================

/**
 * GET /api/auctions/:id/reports
 * Aggregated reports summary
 */
router.get('/:id/reports', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const auctionId = req.params.id;
  const summary = generateAuctionReportsSummary(auctionId);

  if (!summary) {
    res.status(404).json({ error: 'Auction not found.' });
    return;
  }

  res.json({ reports: summary });
});

/**
 * GET /api/auctions/:id/audit-logs
 * List audit logs for an auction
 */
router.get('/:id/audit-logs', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const auctionId = req.params.id;
  const logs = (db.auction_audit_logs || [])
    .filter((l) => l.auctionId === auctionId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  res.json({ logs });
});

export default router;
