import { Router, Response } from 'express';
import crypto from 'crypto';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { verifyToken } from '../utils/security';
import {
  isAuthorizedForTournament,
  isUserAdmin,
  getUserFromRequest,
  requireTournamentAccess,
  canCreateTournamentForSport,
  canAccessSport,
} from '../middleware/accessControl';
import { getDb, saveDatabase } from '../db/database';
import { addAuditLog } from '../utils/logger';
import {
  Tournament,
  TournamentStatus,
  SportType,
  CompetitionFormat,
  Group,
  Team,
  Match,
  KnockoutBracket,
  TournamentAwardItem,
} from '../../src/types';
import {
  calculateTournamentStandings,
  generateRoundRobinFixtures,
  generateKnockoutBracket,
  syncKnockoutBracket,
  seedQualifiedTeams,
  advanceWinner,
  resolveTie,
  resolveBye,
  recalculateBracket,
  declareChampion,
  reopenTournament,
  validateBracket,
  getBracketState,
  getChampionshipSummary,
  calculateTournamentStatistics,
  getTournamentAwards,
  getDefaultRankingRules,
} from '../services/tournamentEngine';
import {
  calculateTournamentStandingsDeterministic,
  applyStandingsOverride,
  removeStandingsOverride,
  getTournamentStandingsAuditLogs,
  getTournamentStandingsRules,
  updateTournamentCompetitionConfig,
  getDefaultCompetitionConfig,
} from '../services/tournamentStandingsEngine';
import {
  previewTournamentFixtures,
  generateTournamentFixtures,
  updateFixtureMatch,
  deleteFixtureMatch,
} from '../services/tournamentFixtureEngine';
import {
  getTournamentDashboardData,
  getTournamentTeamStatsAndForm,
  getTournamentPlayerLeaderboards,
  getTournamentPerformanceIndex,
  getTournamentRecords,
  getTournamentAwardsRecommendations,
  getTournamentPlayerProfile,
  getTournamentTeamProfile,
  getTournamentBroadcastData,
} from '../services/tournamentAnalyticsEngine';
import {
  calculateTournamentAwards,
  overrideTournamentAward,
  restoreTournamentAwardRecommendation,
  finalizeTournamentAwards,
  reopenTournamentAwards,
  getTournamentRecordsCenter,
  getTournamentHallOfFame,
} from '../services/tournamentAwardsEngine';
import {
  registerPresentationClient,
  triggerPresentationAction,
} from '../services/tournamentPresentationEngine';

const router = Router();

/**
 * GET /api/tournaments
 * List all tournaments with optional search & filters
 */
router.get('/', (req, res): void => {
  const authHeader = req.headers?.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req as any).cookies?.token;
  if (token) {
    const payload = verifyToken(token);
    if (!payload) {
      res.status(401).json({ error: 'Session expired or invalid token.' });
      return;
    }
    const db = getDb();
    const user = db.users?.find((u) => u.id === payload.userId);
    if (!user || user.status === 'DISABLED' || user.status === 'SUSPENDED') {
      res.status(401).json({ error: 'User account disabled or suspended.' });
      return;
    }
  }

  const db = getDb();
  let list = [...db.tournaments];
  const currentUser = getUserFromRequest(req);

  const search = (req.query.search as string || '').toLowerCase().trim();
  const sport = req.query.sport as SportType;
  const status = req.query.status as TournamentStatus;
  const season = req.query.season as string;
  const scope = (req.query.scope as string || '').toLowerCase().trim();

  // Multi-user tournament isolation: regular users only see tournaments they own or are assigned to
  if (currentUser && !isUserAdmin(currentUser)) {
    list = list.filter((t) => isAuthorizedForTournament(t, currentUser, 'VIEW'));
  } else if (scope === 'my' && currentUser) {
    list = list.filter((t) => isAuthorizedForTournament(t, currentUser, 'VIEW'));
  }

  if (search) {
    list = list.filter(
      (t) =>
        t.name?.toLowerCase().includes(search) ||
        t.location?.toLowerCase().includes(search) ||
        t.venue?.toLowerCase().includes(search) ||
        t.organizer?.toLowerCase().includes(search) ||
        t.sponsor?.toLowerCase().includes(search) ||
        t.description?.toLowerCase().includes(search)
    );
  }

  if (sport) {
    list = list.filter((t) => t.sport === sport);
  }

  if (status) {
    list = list.filter((t) => t.status === status);
  }

  if (season) {
    list = list.filter((t) => t.season === season);
  }

  // Compute stats and access flags for each tournament
  const result = list.map((t) => {
    const groups = db.groups.filter((g) => g.tournamentId === t.id);
    const teams = db.teams.filter((tm) => tm.tournamentId === t.id);
    const matches = db.matches.filter((m) => m.tournamentId === t.id);
    const teamIds = new Set(teams.map((tm) => tm.id));
    const players = db.players.filter(
      (p) => p.tournamentId === t.id || (p.teamId && teamIds.has(p.teamId))
    );

    const isOwner = currentUser
      ? isUserAdmin(currentUser) || t.ownerUserId === currentUser.id || t.createdByUserId === currentUser.id
      : false;
    const canManage = currentUser ? isAuthorizedForTournament(t, currentUser, 'MANAGE') : false;

    return {
      ...t,
      groupCount: groups.length,
      teamCount: teams.length,
      playerCount: players.length,
      matchCount: matches.length,
      completedMatchCount: matches.filter((m) => m.status === 'COMPLETED').length,
      liveMatchCount: matches.filter((m) => m.status === 'LIVE').length,
      isOwner,
      canManage,
    };
  });

  res.json({ tournaments: result });
});

/**
 * Helper to enforce VIEW access on tournaments
 */
function checkTournamentViewAccess(tournamentId: string, req: any, res: Response): boolean {
  const db = getDb();
  const tournament = db.tournaments.find((t) => t.id === tournamentId);
  if (!tournament) {
    res.status(404).json({ error: 'Tournament not found' });
    return false;
  }
  const user = getUserFromRequest(req);
  if (user && tournament.sport && !canAccessSport(user, tournament.sport)) {
    res.status(403).json({ error: `Forbidden: You do not have permission for ${tournament.sport}.` });
    return false;
  }
  if (!isAuthorizedForTournament(tournament, user, 'VIEW')) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to view this tournament.' });
    return false;
  }
  return true;
}

/**
 * GET /api/tournaments/:id
 * Get single tournament by ID with detailed breakdown
 */
router.get('/:id', (req, res): void => {
  const db = getDb();
  const tournament = db.tournaments.find((t) => t.id === req.params.id);

  if (!tournament) {
    res.status(404).json({ error: 'Tournament not found' });
    return;
  }

  const user = getUserFromRequest(req);
  if (user && tournament.sport && !canAccessSport(user, tournament.sport)) {
    res.status(403).json({ error: `Forbidden: You do not have permission for ${tournament.sport}.` });
    return;
  }
  if (tournament.isPublic !== true && !isAuthorizedForTournament(tournament, user, 'VIEW')) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to view this tournament.' });
    return;
  }

  const groups = db.groups.filter((g) => g.tournamentId === tournament.id);
  const teams = db.teams.filter((tm) => tm.tournamentId === tournament.id);
  const matches = db.matches.filter((m) => m.tournamentId === tournament.id);
  const teamIds = new Set(teams.map((tm) => tm.id));
  const players = db.players.filter(
    (p) => p.tournamentId === tournament.id || (p.teamId && teamIds.has(p.teamId))
  );

  // Sync knockout bracket if exists
  syncKnockoutBracket(tournament.id);
  const bracket = (db.knockout_brackets || []).find((b: any) => b.tournamentId === tournament.id);

  res.json({
    tournament: {
      ...tournament,
      groupCount: groups.length,
      teamCount: teams.length,
      playerCount: players.length,
      matchCount: matches.length,
      completedMatchCount: matches.filter((m) => m.status === 'COMPLETED').length,
      liveMatchCount: matches.filter((m) => m.status === 'LIVE').length,
    },
    groups,
    teams,
    players,
    matches,
    bracket,
  });
});

/**
 * POST /api/tournaments
 * Create new tournament with competition format and ranking rules
 */
router.post('/', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const {
    name,
    sport,
    season,
    location,
    venue,
    organizer,
    sponsor,
    startDate,
    endDate,
    logoUrl,
    description,
    status,
    competitionFormat,
    formatConfig,
    rankingRules,
    qualificationRules,
    cricketDefaultOvers,
    cricketMatchFormat,
  } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'Tournament Name is required.' });
    return;
  }

  if (!sport || typeof sport !== 'string') {
    res.status(400).json({ error: 'Sport selection is required.' });
    return;
  }

  const selectedSport = sport as SportType;

  // Enforce server-side sport access permission check
  if (!canCreateTournamentForSport(req.user, selectedSport)) {
    res.status(403).json({
      error: `Forbidden: You do not have permission to create tournaments for ${selectedSport}. Please contact a Super Admin to grant you access to this sport.`,
    });
    return;
  }

  // Validate positive integer for cricket overs if supplied or default for cricket
  let defaultOvers = cricketDefaultOvers ? Math.max(1, Math.floor(Number(cricketDefaultOvers))) : (selectedSport === 'CRICKET' ? 20 : undefined);

  const newTournament: Tournament = {
    id: crypto.randomUUID(),
    name: name.trim(),
    sport: selectedSport,
    season: season?.trim() || new Date().getFullYear().toString(),
    location: (location || venue || '').trim(),
    venue: (venue || location || '').trim(),
    organizer: organizer?.trim() || '',
    sponsor: sponsor?.trim() || '',
    startDate: startDate || '',
    endDate: endDate || '',
    logoUrl: logoUrl || '',
    description: description?.trim() || '',
    status: (status as TournamentStatus) || 'UPCOMING',
    competitionFormat: (competitionFormat as CompetitionFormat) || 'GROUP_KNOCKOUT',
    formatConfig: formatConfig || {
      format: competitionFormat || 'GROUP_KNOCKOUT',
      numberOfGroups: 2,
      teamsPerGroupMin: 2,
      teamsPerGroupMax: 8,
      groupStageRounds: 'SINGLE',
      teamsAdvancingPerGroup: 2,
      knockoutStageFormat: 'SEMI_FINALS',
      hasThirdPlaceMatch: true,
      defaultMatchConfig: selectedSport === 'CRICKET' ? { overs: defaultOvers || 20 } : {},
    },
    rankingRules: rankingRules || getDefaultRankingRules(selectedSport),
    qualificationRules: qualificationRules || [],
    cricketDefaultOvers: defaultOvers,
    cricketMatchFormat: cricketMatchFormat?.trim() || (selectedSport === 'CRICKET' ? (defaultOvers === 20 ? 'T20' : defaultOvers === 10 ? 'T10' : defaultOvers === 5 ? 'T5' : defaultOvers === 50 ? 'T50' : 'Custom') : undefined),
    createdByUserId: req.user?.id,
    createdByUserEmail: req.user?.email,
    createdByUserName: req.user?.name,
    ownerUserId: req.user?.id,
    authorizedUserIds: req.user?.id ? [req.user.id] : [],
    isPublic: req.body.isPublic !== undefined ? Boolean(req.body.isPublic) : true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.tournaments.unshift(newTournament);

  // If initial number of groups is specified, create default groups
  const groupCount = newTournament.formatConfig?.numberOfGroups || (newTournament.competitionFormat === 'SINGLE_LEAGUE' ? 1 : 2);
  if (groupCount > 0) {
    const groupCodes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    for (let i = 0; i < Math.min(groupCount, 8); i++) {
      const code = groupCodes[i];
      const grp: Group = {
        id: crypto.randomUUID(),
        tournamentId: newTournament.id,
        name: groupCount === 1 ? 'League Table' : `Group ${code}`,
        code,
        description: `Official group for ${newTournament.name}`,
        maxTeams: newTournament.formatConfig?.teamsPerGroupMax || 8,
        minTeams: newTournament.formatConfig?.teamsPerGroupMin || 2,
        status: 'ACTIVE',
        createdByUserId: req.user?.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.groups.push(grp);
    }
  }

  saveDatabase();

  addAuditLog(
    'TOURNAMENT_CREATE',
    `Created tournament "${newTournament.name}" (${newTournament.sport}, Format: ${newTournament.competitionFormat})`,
    req.user,
    req.ip
  );

  res.status(201).json({
    message: 'Tournament created successfully.',
    tournament: {
      ...newTournament,
      groupCount,
      teamCount: 0,
      playerCount: 0,
    },
  });
});

/**
 * PUT /api/tournaments/:id
 * Update existing tournament
 */
router.put('/:id', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const index = db.tournaments.findIndex((t) => t.id === req.params.id);

  if (index === -1) {
    res.status(404).json({ error: 'Tournament not found.' });
    return;
  }

  const existing = db.tournaments[index];

  if (!isAuthorizedForTournament(existing, req.user, 'MANAGE')) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to manage this tournament.' });
    return;
  }

  const {
    name,
    sport,
    season,
    location,
    venue,
    organizer,
    sponsor,
    startDate,
    endDate,
    logoUrl,
    description,
    status,
    competitionFormat,
    formatConfig,
    rankingRules,
    qualificationRules,
    championTeamId,
    championTeamName,
    runnerUpTeamId,
    runnerUpTeamName,
    cricketDefaultOvers,
    cricketMatchFormat,
  } = req.body;

  if (name !== undefined) {
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Tournament Name cannot be empty.' });
      return;
    }
    existing.name = name.trim();
  }

  if (sport) {
    if (!canAccessSport(req.user, sport)) {
      res.status(403).json({ error: `Forbidden: You do not have permission to switch this tournament to ${sport}.` });
      return;
    }
    existing.sport = sport;
  }
  if (season !== undefined) existing.season = season.trim();
  if (location !== undefined) existing.location = location.trim();
  if (venue !== undefined) existing.venue = venue.trim();
  if (organizer !== undefined) existing.organizer = organizer.trim();
  if (sponsor !== undefined) existing.sponsor = sponsor.trim();
  if (startDate !== undefined) existing.startDate = startDate;
  if (endDate !== undefined) existing.endDate = endDate;
  if (logoUrl !== undefined) existing.logoUrl = logoUrl;
  if (description !== undefined) existing.description = description.trim();
  if (status) existing.status = status;
  if (competitionFormat) existing.competitionFormat = competitionFormat;
  if (formatConfig) existing.formatConfig = { ...existing.formatConfig, ...formatConfig };
  if (rankingRules) existing.rankingRules = { ...existing.rankingRules, ...rankingRules };
  if (qualificationRules) existing.qualificationRules = qualificationRules;
  if (championTeamId !== undefined) existing.championTeamId = championTeamId;
  if (championTeamName !== undefined) existing.championTeamName = championTeamName;
  if (runnerUpTeamId !== undefined) existing.runnerUpTeamId = runnerUpTeamId;
  if (runnerUpTeamName !== undefined) existing.runnerUpTeamName = runnerUpTeamName;
  if (cricketDefaultOvers !== undefined) {
    const parsedOvers = Math.max(1, Math.floor(Number(cricketDefaultOvers)));
    existing.cricketDefaultOvers = parsedOvers;
    if (existing.formatConfig) {
      existing.formatConfig.defaultMatchConfig = {
        ...existing.formatConfig.defaultMatchConfig,
        overs: parsedOvers,
      };
    }
  }
  if (cricketMatchFormat !== undefined) {
    existing.cricketMatchFormat = cricketMatchFormat.trim();
  }

  existing.updatedAt = new Date().toISOString();
  db.tournaments[index] = existing;
  saveDatabase();

  addAuditLog(
    'TOURNAMENT_UPDATE',
    `Updated tournament "${existing.name}" (ID: ${existing.id})`,
    req.user,
    req.ip
  );

  res.json({
    message: 'Tournament updated successfully.',
    tournament: existing,
  });
});

/**
 * POST /api/tournaments/:id/duplicate
 * Duplicate tournament structure
 */
router.post('/:id/duplicate', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const source = db.tournaments.find((t) => t.id === req.params.id);

  if (!source) {
    res.status(404).json({ error: 'Source tournament not found.' });
    return;
  }

  if (!isAuthorizedForTournament(source, req.user, 'VIEW')) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to duplicate this tournament.' });
    return;
  }

  if (!canCreateTournamentForSport(req.user, source.sport)) {
    res.status(403).json({ error: `Forbidden: You do not have permission to create tournaments for ${source.sport}.` });
    return;
  }

  const { includeTeams, includeGroups, newName } = req.body;

  const newTournamentId = crypto.randomUUID();
  const duplicatedTournament: Tournament = {
    ...source,
    id: newTournamentId,
    name: newName?.trim() || `${source.name} (Copy)`,
    status: 'DRAFT',
    ownerUserId: req.user?.id,
    createdByUserId: req.user?.id,
    createdByUserEmail: req.user?.email,
    createdByUserName: req.user?.name,
    authorizedUserIds: req.user?.id ? [req.user.id] : [],
    collaborators: [],
    championTeamId: undefined,
    championTeamName: undefined,
    runnerUpTeamId: undefined,
    runnerUpTeamName: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.tournaments.unshift(duplicatedTournament);

  // Duplicate groups if requested
  const groupIdMap = new Map<string, string>();
  if (includeGroups) {
    const sourceGroups = db.groups.filter((g) => g.tournamentId === source.id);
    sourceGroups.forEach((g) => {
      const newGroupId = crypto.randomUUID();
      groupIdMap.set(g.id, newGroupId);
      db.groups.push({
        ...g,
        id: newGroupId,
        tournamentId: newTournamentId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });
  }

  // Duplicate teams if requested
  if (includeTeams) {
    const sourceTeams = db.teams.filter((t) => t.tournamentId === source.id);
    sourceTeams.forEach((t) => {
      const newTeamId = crypto.randomUUID();
      const newGroupId = t.groupId ? groupIdMap.get(t.groupId) : undefined;
      db.teams.push({
        ...t,
        id: newTeamId,
        tournamentId: newTournamentId,
        groupId: newGroupId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });
  }

  saveDatabase();

  addAuditLog(
    'TOURNAMENT_CREATE',
    `Duplicated tournament "${source.name}" -> "${duplicatedTournament.name}"`,
    req.user,
    req.ip
  );

  res.status(201).json({
    message: 'Tournament duplicated successfully.',
    tournament: duplicatedTournament,
  });
});

/**
 * DELETE /api/tournaments/:id
 * Safe delete tournament and clean up relationships
 */
router.delete('/:id', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const id = req.params.id;
  const index = db.tournaments.findIndex((t) => t.id === id);

  if (index === -1) {
    res.status(404).json({ error: 'Tournament not found.' });
    return;
  }

  const tournamentToDelete = db.tournaments[index];

  if (!isAuthorizedForTournament(tournamentToDelete, req.user, 'MANAGE')) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to delete this tournament.' });
    return;
  }

  const tournamentName = tournamentToDelete.name;

  // Remove tournament
  db.tournaments.splice(index, 1);

  // Remove related groups
  db.groups = db.groups.filter((g) => g.tournamentId !== id);

  // Remove related teams and players
  const relatedTeams = db.teams.filter((tm) => tm.tournamentId === id);
  const teamIds = new Set(relatedTeams.map((tm) => tm.id));

  db.teams = db.teams.filter((tm) => tm.tournamentId !== id);
  db.players = db.players.filter(
    (p) => p.tournamentId !== id && (!p.teamId || !teamIds.has(p.teamId))
  );

  // Remove matches
  db.matches = db.matches.filter((m) => m.tournamentId !== id);

  // Remove brackets & awards
  if (db.knockout_brackets) {
    db.knockout_brackets = db.knockout_brackets.filter((b: any) => b.tournamentId !== id);
  }
  if (db.tournament_awards) {
    db.tournament_awards = db.tournament_awards.filter((a: any) => a.tournamentId !== id);
  }

  saveDatabase();

  addAuditLog(
    'TOURNAMENT_DELETE',
    `Deleted tournament "${tournamentName}" (ID: ${id}) and associated groups/teams/matches`,
    req.user,
    req.ip
  );

  res.json({ message: 'Tournament deleted successfully.' });
});

/**
 * GET /api/tournaments/:id/collaborators
 * List collaborators authorized for this tournament
 */
router.get('/:id/collaborators', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const tournament = db.tournaments.find((t) => t.id === req.params.id);
  if (!tournament) {
    res.status(404).json({ error: 'Tournament not found.' });
    return;
  }

  if (!isAuthorizedForTournament(tournament, req.user, 'VIEW')) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const authorizedIds = tournament.authorizedUserIds || [];
  const explicitCollaborators = tournament.collaborators || [];
  
  const collaborators = (db.users || [])
    .filter((u) => authorizedIds.includes(u.id) || explicitCollaborators.some((c) => c.userId === u.id))
    .map((u) => {
      const explicit = explicitCollaborators.find((c) => c.userId === u.id);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: explicit?.role || u.role || 'MANAGER',
      };
    });

  res.json({
    ownerUserId: tournament.ownerUserId || tournament.createdByUserId,
    collaborators,
  });
});

/**
 * POST /api/tournaments/:id/collaborators
 * Add collaborator user to tournament
 */
router.post('/:id/collaborators', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const tournament = db.tournaments.find((t) => t.id === req.params.id);
  if (!tournament) {
    res.status(404).json({ error: 'Tournament not found.' });
    return;
  }

  if (!isAuthorizedForTournament(tournament, req.user, 'MANAGE')) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to manage collaborators.' });
    return;
  }

  const { userId, email, role = 'MANAGER' } = req.body;
  let targetUser = userId ? db.users?.find((u) => u.id === userId) : undefined;
  if (!targetUser && email) {
    targetUser = db.users?.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
  }

  if (!targetUser) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  if (!tournament.authorizedUserIds) {
    tournament.authorizedUserIds = [];
  }
  if (!tournament.collaborators) {
    tournament.collaborators = [];
  }

  if (!tournament.authorizedUserIds.includes(targetUser.id)) {
    tournament.authorizedUserIds.push(targetUser.id);
  }

  const existingCollabIdx = tournament.collaborators.findIndex((c) => c.userId === targetUser.id);
  if (existingCollabIdx >= 0) {
    tournament.collaborators[existingCollabIdx].role = role;
    tournament.collaborators[existingCollabIdx].assignedAt = new Date().toISOString();
  } else {
    tournament.collaborators.push({
      userId: targetUser.id,
      userEmail: targetUser.email,
      userName: targetUser.name,
      role,
      assignedAt: new Date().toISOString(),
    });
  }

  tournament.updatedAt = new Date().toISOString();
  saveDatabase();

  res.json({
    message: `Added ${targetUser.name} (${targetUser.email}) as collaborator with role ${role}.`,
    authorizedUserIds: tournament.authorizedUserIds,
    collaborators: tournament.collaborators,
  });
});

/**
 * DELETE /api/tournaments/:id/collaborators/:userId
 * Remove collaborator from tournament
 */
router.delete('/:id/collaborators/:userId', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const tournament = db.tournaments.find((t) => t.id === req.params.id);
  if (!tournament) {
    res.status(404).json({ error: 'Tournament not found.' });
    return;
  }

  if (!isAuthorizedForTournament(tournament, req.user, 'MANAGE')) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to manage collaborators.' });
    return;
  }

  const targetUserId = req.params.userId;
  if (tournament.ownerUserId === targetUserId || tournament.createdByUserId === targetUserId) {
    res.status(400).json({ error: 'Cannot remove the primary owner of the tournament.' });
    return;
  }

  tournament.authorizedUserIds = (tournament.authorizedUserIds || []).filter((id) => id !== targetUserId);
  tournament.collaborators = (tournament.collaborators || []).filter((c) => c.userId !== targetUserId);
  tournament.updatedAt = new Date().toISOString();
  saveDatabase();

  res.json({
    message: 'Collaborator removed.',
    authorizedUserIds: tournament.authorizedUserIds,
    collaborators: tournament.collaborators,
  });
});

/**
 * POST /api/tournaments/:id/groups
 * Create tournament group
 */
router.post('/:id/groups', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const tournamentId = req.params.id;
  const tournament = db.tournaments.find((t) => t.id === tournamentId);
  if (!tournament) {
    res.status(404).json({ error: 'Tournament not found.' });
    return;
  }
  if (!isAuthorizedForTournament(tournament, req.user, 'MANAGE')) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to manage groups in this tournament.' });
    return;
  }
  const { name = 'Group A', code = 'A', description = '', maxTeams = 8 } = req.body;
  const newGroup: Group = {
    id: crypto.randomUUID(),
    tournamentId,
    name: name.trim(),
    code: code.trim(),
    description: description.trim(),
    maxTeams: Number(maxTeams) || 8,
    status: 'ACTIVE',
    createdByUserId: req.user?.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.groups.push(newGroup);
  saveDatabase();
  res.status(201).json({ message: 'Group created.', group: newGroup });
});

/**
 * POST /api/tournaments/:id/groups/bulk
 * Bulk create tournament groups
 */
router.post('/:id/groups/bulk', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const tournament = db.tournaments.find((t) => t.id === req.params.id);
  if (!tournament) {
    res.status(404).json({ error: 'Tournament not found' });
    return;
  }

  if (!isAuthorizedForTournament(tournament, req.user, 'MANAGE')) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to create groups in this tournament.' });
    return;
  }

  const { count, groupNames, maxTeams } = req.body;
  const numGroups = Number(count) || (groupNames ? groupNames.length : 2);
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

  const createdGroups: Group[] = [];
  for (let i = 0; i < Math.min(numGroups, 10); i++) {
    const defaultName = `Group ${letters[i]}`;
    const name = groupNames?.[i]?.trim() || defaultName;
    const code = letters[i];

    const newGroup: Group = {
      id: crypto.randomUUID(),
      tournamentId: tournament.id,
      name,
      code,
      description: `${tournament.name} - ${name}`,
      maxTeams: maxTeams ? Number(maxTeams) : 8,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.groups.push(newGroup);
    createdGroups.push(newGroup);
  }

  saveDatabase();

  addAuditLog(
    'GROUP_CREATE',
    `Bulk created ${createdGroups.length} groups in "${tournament.name}"`,
    req.user,
    req.ip
  );

  res.status(201).json({
    message: `Created ${createdGroups.length} groups successfully.`,
    groups: createdGroups,
  });
});

/**
 * POST /api/tournaments/:id/groups/distribute-teams
 * Auto-distribute teams across tournament groups (SNAKE, RANDOM, BALANCED)
 */
router.post('/:id/groups/distribute-teams', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const tournament = db.tournaments.find((t) => t.id === req.params.id);
  if (!tournament) {
    res.status(404).json({ error: 'Tournament not found' });
    return;
  }

  if (!isAuthorizedForTournament(tournament, req.user, 'MANAGE')) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to distribute teams in this tournament.' });
    return;
  }

  const groups = db.groups.filter((g) => g.tournamentId === tournament.id);
  if (groups.length === 0) {
    res.status(400).json({ error: 'No groups exist for this tournament. Please create groups first.' });
    return;
  }

  const teams = db.teams.filter((t) => t.tournamentId === tournament.id);
  if (teams.length === 0) {
    res.status(400).json({ error: 'No teams registered in this tournament.' });
    return;
  }

  const { method } = req.body; // 'SNAKE' | 'RANDOM' | 'BALANCED'
  const distMethod = method || 'BALANCED';

  // Sort or shuffle teams
  let teamPool = [...teams];
  if (distMethod === 'RANDOM') {
    teamPool.sort(() => Math.random() - 0.5);
  }

  const numGroups = groups.length;

  teamPool.forEach((team, idx) => {
    let groupIdx = 0;
    if (distMethod === 'SNAKE') {
      const cycle = Math.floor(idx / numGroups);
      const pos = idx % numGroups;
      groupIdx = cycle % 2 === 0 ? pos : numGroups - 1 - pos;
    } else {
      groupIdx = idx % numGroups;
    }

    team.groupId = groups[groupIdx].id;
    team.updatedAt = new Date().toISOString();
  });

  saveDatabase();

  addAuditLog(
    'TEAM_UPDATE',
    `Auto-distributed ${teams.length} teams across ${groups.length} groups using ${distMethod} algorithm`,
    req.user,
    req.ip
  );

  res.json({
    message: `Distributed ${teams.length} teams across ${groups.length} groups successfully.`,
    teams,
  });
});

/**
 * POST /api/tournaments/:id/groups/:groupId/teams/assign
 * Assign team(s) to a group
 */
router.post('/:id/groups/:groupId/teams/assign', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const tournament = db.tournaments.find((t) => t.id === req.params.id);
  if (!tournament) {
    res.status(404).json({ error: 'Tournament not found' });
    return;
  }

  if (!isAuthorizedForTournament(tournament, req.user, 'MANAGE')) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to assign teams in this tournament.' });
    return;
  }

  const group = db.groups.find((g) => g.id === req.params.groupId && g.tournamentId === tournament.id);
  if (!group) {
    res.status(404).json({ error: 'Group not found in this tournament' });
    return;
  }

  const { teamIds } = req.body; // string[] or string
  const targetIds: string[] = Array.isArray(teamIds) ? teamIds : [teamIds];

  const currentGroupTeams = db.teams.filter((t) => t.groupId === group.id);
  if (group.maxTeams && currentGroupTeams.length + targetIds.length > group.maxTeams) {
    res.status(400).json({
      error: `Group "${group.name}" limit exceeded. Max allowed is ${group.maxTeams} teams.`,
    });
    return;
  }

  let assignedCount = 0;
  targetIds.forEach((tId) => {
    const tm = db.teams.find((t) => t.id === tId && t.tournamentId === tournament.id);
    if (tm) {
      tm.groupId = group.id;
      tm.updatedAt = new Date().toISOString();
      assignedCount++;
    }
  });

  saveDatabase();

  addAuditLog(
    'GROUP_UPDATE',
    `Assigned ${assignedCount} teams to group "${group.name}"`,
    req.user,
    req.ip
  );

  res.json({
    message: `Assigned ${assignedCount} teams to ${group.name}.`,
    groupTeams: db.teams.filter((t) => t.groupId === group.id),
  });
});

/**
 * POST /api/tournaments/:id/groups/:groupId/teams/remove
 * Remove team from a group
 */
router.post('/:id/groups/:groupId/teams/remove', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const tournament = db.tournaments.find((t) => t.id === req.params.id);
  if (!tournament) {
    res.status(404).json({ error: 'Tournament not found' });
    return;
  }

  if (!isAuthorizedForTournament(tournament, req.user, 'MANAGE')) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to modify groups in this tournament.' });
    return;
  }

  const { teamId } = req.body;

  const team = db.teams.find((t) => t.id === teamId && t.tournamentId === req.params.id);
  if (!team) {
    res.status(404).json({ error: 'Team not found in tournament' });
    return;
  }

  team.groupId = undefined;
  team.updatedAt = new Date().toISOString();
  saveDatabase();

  res.json({ message: 'Team removed from group successfully.' });
});

/**
 * GET /api/tournaments/:id/standings
 * Get calculated dynamic standings / points tables
 */
router.get('/:id/standings', (req, res): void => {
  if (!checkTournamentViewAccess(req.params.id, req, res)) return;
  const result = calculateTournamentStandingsDeterministic(req.params.id);
  const standings = result.overall || (result.groups && result.groups[0]?.rows) || [];
  res.json({
    ...result,
    standings,
  });
});

/**
 * GET /api/tournaments/:id/standings/:groupId
 * Get calculated standings for a specific group
 */
router.get('/:id/standings/group/:groupId', (req, res): void => {
  if (!checkTournamentViewAccess(req.params.id, req, res)) return;
  const result = calculateTournamentStandingsDeterministic(req.params.id, req.params.groupId);
  res.json(result);
});

/**
 * GET /api/tournaments/:id/competition
 * Get competition configuration
 */
router.get('/:id/competition', (req, res): void => {
  if (!checkTournamentViewAccess(req.params.id, req, res)) return;
  const db = getDb();
  const tournament = db.tournaments.find((t) => t.id === req.params.id);
  if (!tournament) {
    res.status(404).json({ error: 'Tournament not found' });
    return;
  }
  const config = (db.tournament_competition_configs || []).find((c: any) => c.tournamentId === tournament.id) ||
    tournament.competitionConfig ||
    getDefaultCompetitionConfig(tournament.sport, tournament.id, {
      format: tournament.competitionFormat,
      ...(tournament.formatConfig || {}),
      ...(tournament.rankingRules || {}),
    });
  res.json(config);
});

/**
 * PUT /api/tournaments/:id/competition
 * Update competition configuration
 */
router.put('/:id/competition', requireAuth, requireTournamentAccess('MANAGE'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const result = updateTournamentCompetitionConfig(req.params.id, req.body, req.user!);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update competition config' });
  }
});

/**
 * GET /api/tournaments/:id/standings/rules
 * Get standings calculation & tie breaking rules
 */
router.get('/:id/standings/rules', (req, res): void => {
  if (!checkTournamentViewAccess(req.params.id, req, res)) return;
  const rules = getTournamentStandingsRules(req.params.id);
  res.json(rules);
});

/**
 * GET /api/tournaments/:id/standings/audit-logs
 * Get standings manual override audit logs
 */
router.get('/:id/standings/audit-logs', (req, res): void => {
  if (!checkTournamentViewAccess(req.params.id, req, res)) return;
  const logs = getTournamentStandingsAuditLogs(req.params.id);
  res.json(logs);
});

/**
 * PUT /api/tournaments/:id/standings/:teamId/override
 * Set manual points/qualification/ranking override with audit log
 */
router.put('/:id/standings/:teamId/override', requireAuth, requireTournamentAccess('MANAGE'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { pointsAdjustment, qualificationStatusOverride, rankOverride, reason } = req.body;
    const result = applyStandingsOverride(
      req.params.id,
      req.params.teamId,
      {
        pointsAdjustment,
        qualificationStatusOverride,
        rankOverride,
        reason,
      },
      req.user!
    );
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to apply manual override' });
  }
});

/**
 * DELETE /api/tournaments/:id/standings/:teamId/override
 * Remove / reset manual override for a team
 */
router.delete('/:id/standings/:teamId/override', requireAuth, requireTournamentAccess('MANAGE'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const result = removeStandingsOverride(req.params.id, req.params.teamId, req.user!);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to reset manual override' });
  }
});

/**
 * POST /api/tournaments/:id/standings/recalculate
 * Recalculate standings from match scores
 */
router.post('/:id/standings/recalculate', requireAuth, requireTournamentAccess('MANAGE'), (req: AuthenticatedRequest, res: Response): void => {
  const result = calculateTournamentStandingsDeterministic(req.params.id);
  syncKnockoutBracket(req.params.id);
  res.json({
    message: 'Tournament standings recalculated successfully.',
    ...result,
  });
});

/**
 * POST /api/tournaments/:id/standings/qualification-override
 * Set manual qualification override for a team
 */
router.post('/:id/standings/qualification-override', requireAuth, requireTournamentAccess('MANAGE'), (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const tournament = db.tournaments.find((t) => t.id === req.params.id);
  if (!tournament) {
    res.status(404).json({ error: 'Tournament not found' });
    return;
  }

  const { groupId, teamId, status, pointsAdjustment, reason } = req.body; // status: 'QUALIFIED' | 'ELIMINATED' | 'AUTO' | 'CONTENTION'

  if (teamId) {
    const result = applyStandingsOverride(
      tournament.id,
      teamId,
      {
        qualificationStatusOverride: status,
        pointsAdjustment,
        reason: reason || `Manual qualification update to ${status}`,
      },
      req.user!
    );
    res.json({
      message: `Updated qualification status for team to ${status}.`,
      ...result,
    });
    return;
  }

  const standings = calculateTournamentStandingsDeterministic(tournament.id);
  res.json({
    message: `Updated qualification status.`,
    standings,
  });
});


/**
 * POST /api/tournaments/:id/fixtures/preview
 * Preview deterministic round-robin fixtures with conflict validation
 */
router.post('/:id/fixtures/preview', requireAuth, requireTournamentAccess('MANAGE'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const preview = previewTournamentFixtures({
      tournamentId: req.params.id,
      ...req.body,
    });
    res.json(preview);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to preview fixtures' });
  }
});

/**
 * POST /api/tournaments/:id/fixtures/generate
 * Automatic Round Robin fixture generator & scheduler commit
 */
router.post('/:id/fixtures/generate', requireAuth, requireTournamentAccess('MANAGE'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const result = generateTournamentFixtures(
      {
        tournamentId: req.params.id,
        ...req.body,
      },
      req.user
    );

    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to generate fixtures' });
  }
});

/**
 * PUT /api/tournaments/:id/fixtures/:matchId
 * Edit single match fixture schedule/venue/home-away
 */
router.put('/:id/fixtures/:matchId', requireAuth, requireTournamentAccess('MANAGE'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const result = updateFixtureMatch(req.params.id, req.params.matchId, req.body, req.user);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update fixture' });
  }
});

/**
 * DELETE /api/tournaments/:id/fixtures/:matchId
 * Delete a single unstarted fixture
 */
router.delete('/:id/fixtures/:matchId', requireAuth, requireTournamentAccess('MANAGE'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const result = deleteFixtureMatch(req.params.id, req.params.matchId, req.user);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to delete fixture' });
  }
});

/**
 * DELETE /api/tournaments/:id/fixtures/group/:groupId
 * Delete all unstarted fixtures for a group
 */
router.delete('/:id/fixtures/group/:groupId', requireAuth, requireTournamentAccess('MANAGE'), (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const tournamentId = req.params.id;
  const groupId = req.params.groupId;

  const countBefore = db.matches.length;
  db.matches = db.matches.filter(
    (m) => !(m.tournamentId === tournamentId && m.groupId === groupId && m.status !== 'LIVE' && m.status !== 'COMPLETED')
  );
  const deletedCount = countBefore - db.matches.length;

  saveDatabase();
  addAuditLog(
    'MATCH_DELETE',
    `Deleted ${deletedCount} unstarted fixtures for group ID: ${groupId} in tournament ID: ${tournamentId}`,
    req.user
  );

  res.json({ message: `Deleted ${deletedCount} unplayed group fixtures.` });
});

/**
 * DELETE /api/tournaments/:id/fixtures/clear-all
 * Clear all unplayed tournament fixtures
 */
router.delete('/:id/fixtures/clear-all', requireAuth, requireTournamentAccess('MANAGE'), (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const tournamentId = req.params.id;

  const countBefore = db.matches.length;
  db.matches = db.matches.filter(
    (m) => !(m.tournamentId === tournamentId && m.status !== 'LIVE' && m.status !== 'COMPLETED')
  );
  const deletedCount = countBefore - db.matches.length;

  saveDatabase();
  addAuditLog(
    'MATCH_DELETE',
    `Cleared ${deletedCount} unstarted tournament fixtures in tournament ID: ${tournamentId}`,
    req.user
  );

  res.json({ message: `Cleared ${deletedCount} unplayed tournament fixtures.` });
});

/**
 * GET /api/tournaments/:id/bracket (and alias /api/tournaments/:id/knockout)
 * Get knockout bracket with live synchronization & validation
 */
router.get(['/:id/bracket', '/:id/knockout'], (req, res): void => {
  if (!checkTournamentViewAccess(req.params.id, req, res)) return;
  try {
    const { bracket, validation } = getBracketState(req.params.id);
    res.json({ bracket, validation });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch bracket' });
  }
});

/**
 * POST /api/tournaments/:id/bracket/generate (and alias /api/tournaments/:id/knockout/generate)
 * Generate knockout bracket with deterministic seeding & BYEs
 */
router.post(['/:id/bracket/generate', '/:id/knockout/generate'], requireAuth, requireTournamentAccess('MANAGE'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const {
      stage,
      hasThirdPlaceMatch,
      createMatchEntities,
      seedingMethod,
      crossGroupRestrictions,
      sameGroupProtection,
      startDate,
      matchStartTime,
      matchIntervalMinutes,
      daysBetweenRounds,
      venue,
      ground,
      customRoundNames,
      manualSeeds,
    } = req.body;

    const bracket = generateKnockoutBracket(
      {
        tournamentId: req.params.id,
        stage: stage || 'QUARTER_FINALS',
        hasThirdPlaceMatch: hasThirdPlaceMatch !== undefined ? hasThirdPlaceMatch : true,
        createMatchEntities: createMatchEntities !== undefined ? Boolean(createMatchEntities) : true,
        seedingMethod,
        crossGroupRestrictions,
        sameGroupProtection,
        startDate,
        matchStartTime,
        matchIntervalMinutes,
        daysBetweenRounds,
        venue,
        ground,
        customRoundNames,
        manualSeeds,
      },
      req.user
    );

    res.status(201).json({
      message: 'Knockout bracket generated successfully.',
      bracket,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to generate knockout bracket' });
  }
});

/**
 * POST /api/tournaments/:id/bracket/regenerate
 * Safely regenerate future unplayed knockout rounds while preserving LIVE/COMPLETED matches
 */
router.post('/:id/bracket/regenerate', requireAuth, requireTournamentAccess('MANAGE'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const {
      stage,
      hasThirdPlaceMatch,
      createMatchEntities,
      seedingMethod,
      crossGroupRestrictions,
      sameGroupProtection,
      startDate,
      venue,
      ground,
      preservePlayedMatches,
    } = req.body;

    const bracket = generateKnockoutBracket(
      {
        tournamentId: req.params.id,
        stage: stage || 'QUARTER_FINALS',
        hasThirdPlaceMatch: hasThirdPlaceMatch !== undefined ? hasThirdPlaceMatch : true,
        createMatchEntities: createMatchEntities !== undefined ? Boolean(createMatchEntities) : true,
        seedingMethod,
        crossGroupRestrictions,
        sameGroupProtection,
        startDate,
        venue,
        ground,
        preservePlayedMatches: preservePlayedMatches !== undefined ? preservePlayedMatches : true,
      },
      req.user
    );

    res.json({
      message: 'Knockout bracket safely regenerated with played match preservation.',
      bracket,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to regenerate knockout bracket' });
  }
});

/**
 * POST /api/tournaments/:id/bracket/advance
 * Manually advance a team or override winner for a node
 */
router.post('/:id/bracket/advance', requireAuth, requireTournamentAccess('MANAGE'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { nodeId, winnerTeamId, reason } = req.body;
    if (!nodeId || !winnerTeamId) {
      res.status(400).json({ error: 'nodeId and winnerTeamId are required' });
      return;
    }

    const result = advanceWinner(req.params.id, nodeId, winnerTeamId, req.user, reason);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to advance team' });
  }
});

/**
 * POST /api/tournaments/:id/bracket/resolve-tie
 * Resolve a tied knockout match result
 */
router.post('/:id/bracket/resolve-tie', requireAuth, requireTournamentAccess('MANAGE'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { nodeId, winnerTeamId, resolutionMethod } = req.body;
    if (!nodeId || !winnerTeamId) {
      res.status(400).json({ error: 'nodeId and winnerTeamId are required' });
      return;
    }

    const result = resolveTie(
      req.params.id,
      nodeId,
      winnerTeamId,
      resolutionMethod || 'Administrator Decision / Super Over / Penalties',
      req.user
    );
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to resolve tie' });
  }
});

/**
 * POST /api/tournaments/:id/bracket/resolve-bye
 * Resolve BYE auto-advancement for a node
 */
router.post('/:id/bracket/resolve-bye', requireAuth, requireTournamentAccess('MANAGE'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { nodeId } = req.body;
    if (!nodeId) {
      res.status(400).json({ error: 'nodeId is required' });
      return;
    }

    const result = resolveBye(req.params.id, nodeId, req.user);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to resolve BYE' });
  }
});

/**
 * POST /api/tournaments/:id/bracket/recalculate
 * Recalculate bracket and sync match completions
 */
router.post('/:id/bracket/recalculate', requireAuth, requireTournamentAccess('MANAGE'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const result = recalculateBracket(req.params.id, req.body, req.user);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to recalculate bracket' });
  }
});

/**
 * POST /api/tournaments/:id/champion
 * Declare champion and complete tournament lifecycle
 */
router.post('/:id/champion', requireAuth, requireTournamentAccess('MANAGE'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { championTeamId, runnerUpTeamId, thirdPlaceTeamId } = req.body;
    if (!championTeamId) {
      res.status(400).json({ error: 'championTeamId is required' });
      return;
    }

    const result = declareChampion(
      req.params.id,
      { championTeamId, runnerUpTeamId, thirdPlaceTeamId },
      req.user
    );
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to declare champion' });
  }
});

/**
 * POST /api/tournaments/:id/reopen
 * Reopen a completed tournament
 */
router.post('/:id/reopen', requireAuth, requireTournamentAccess('MANAGE'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { reason } = req.body;
    const result = reopenTournament(req.params.id, reason, req.user);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to reopen tournament' });
  }
});

/**
 * GET /api/tournaments/:id/championship-summary
 * Get structured championship report and awards summary
 */
router.get('/:id/championship-summary', (req, res): void => {
  if (!checkTournamentViewAccess(req.params.id, req, res)) return;
  try {
    const summary = getChampionshipSummary(req.params.id);
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch championship summary' });
  }
});

/**
 * PUT /api/tournaments/:id/knockout/match
 * Manual edit/advance knockout match node (legacy endpoint compatibility)
 */
router.put('/:id/knockout/match', requireAuth, requireTournamentAccess('MANAGE'), (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const tournamentId = req.params.id;
  const { nodeId, homeTeamId, awayTeamId, winnerTeamId, homeTeamScore, awayTeamScore, status } = req.body;

  if (!db.knockout_brackets) db.knockout_brackets = [];
  const bracket = db.knockout_brackets.find((b: any) => b.tournamentId === tournamentId) as KnockoutBracket | undefined;
  if (!bracket) {
    res.status(404).json({ error: 'Knockout bracket not found' });
    return;
  }

  let foundNode: any;
  bracket.rounds.forEach((r) => {
    const n = r.matches.find((m) => m.id === nodeId);
    if (n) foundNode = n;
  });

  if (!foundNode) {
    res.status(404).json({ error: 'Knockout match node not found' });
    return;
  }

  if (homeTeamId !== undefined) {
    foundNode.homeTeamId = homeTeamId;
    foundNode.homeTeamName = db.teams.find((t) => t.id === homeTeamId)?.name;
  }
  if (awayTeamId !== undefined) {
    foundNode.awayTeamId = awayTeamId;
    foundNode.awayTeamName = db.teams.find((t) => t.id === awayTeamId)?.name;
  }
  if (winnerTeamId !== undefined) {
    foundNode.winnerTeamId = winnerTeamId;
    foundNode.winnerTeamName = db.teams.find((t) => t.id === winnerTeamId)?.name;
  }
  if (homeTeamScore !== undefined) foundNode.homeTeamScore = homeTeamScore;
  if (awayTeamScore !== undefined) foundNode.awayTeamScore = awayTeamScore;
  if (status) foundNode.status = status;

  bracket.updatedAt = new Date().toISOString();
  saveDatabase();

  // Sync advances
  syncKnockoutBracket(tournamentId, req.user);

  res.json({
    message: 'Knockout match updated successfully.',
    bracket,
  });
});

/**
 * GET /api/tournaments/:id/dashboard
 * GET /api/tournaments/:id/dashboard-data
 * Full live dashboard payload including stats, form, leaderboards, records, and bracket
 */
router.get('/:id/dashboard', (req, res): void => {
  if (!checkTournamentViewAccess(req.params.id, req, res)) return;
  try {
    const data = getTournamentDashboardData(req.params.id);
    if (!data) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch dashboard data' });
  }
});

router.get('/:id/dashboard-data', (req, res): void => {
  if (!checkTournamentViewAccess(req.params.id, req, res)) return;
  try {
    const data = getTournamentDashboardData(req.params.id);
    if (!data) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch dashboard data' });
  }
});

/**
 * GET /api/tournaments/:id/live-matches
 * Live matches with real-time scoring context
 */
router.get('/:id/live-matches', (req, res): void => {
  if (!checkTournamentViewAccess(req.params.id, req, res)) return;
  try {
    const data = getTournamentDashboardData(req.params.id);
    res.json({ liveMatches: data?.liveMatches || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch live matches' });
  }
});

/**
 * GET /api/tournaments/:id/results
 * Completed results with optional filtering
 */
router.get('/:id/results', (req, res): void => {
  if (!checkTournamentViewAccess(req.params.id, req, res)) return;
  try {
    const db = getDb();
    const tournamentId = req.params.id;
    let matches = db.matches.filter((m) => m.tournamentId === tournamentId && m.status === 'COMPLETED');

    const groupId = req.query.groupId as string;
    const round = req.query.round as string;
    const teamId = req.query.teamId as string;

    if (groupId) {
      matches = matches.filter((m) => m.groupId === groupId);
    }
    if (round) {
      matches = matches.filter((m) => m.round === round);
    }
    if (teamId) {
      matches = matches.filter((m) => m.teamAId === teamId || m.teamBId === teamId);
    }

    const sorted = matches.sort(
      (a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()
    );

    res.json({ results: sorted });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch results' });
  }
});

/**
 * GET /api/tournaments/:id/player-leaderboards
 * Sport-specific player leaderboards
 */
router.get('/:id/player-leaderboards', (req, res): void => {
  if (!checkTournamentViewAccess(req.params.id, req, res)) return;
  try {
    const leaderboards = getTournamentPlayerLeaderboards(req.params.id);
    res.json({ leaderboards });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch leaderboards' });
  }
});

/**
 * GET /api/tournaments/:id/team-stats
 * Team statistics and Form (L5)
 */
router.get('/:id/team-stats', (req, res): void => {
  if (!checkTournamentViewAccess(req.params.id, req, res)) return;
  try {
    const teamForm = getTournamentTeamStatsAndForm(req.params.id);
    res.json({ teamStats: teamForm });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch team stats' });
  }
});

/**
 * GET /api/tournaments/:id/player/:playerId
 * Tournament Player Profile with match-by-match performances
 */
router.get('/:id/player/:playerId', (req, res): void => {
  if (!checkTournamentViewAccess(req.params.id, req, res)) return;
  try {
    const profile = getTournamentPlayerProfile(req.params.id, req.params.playerId);
    if (!profile) {
      res.status(404).json({ error: 'Player tournament profile not found' });
      return;
    }
    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch player profile' });
  }
});

/**
 * GET /api/tournaments/:id/team/:teamId
 * Tournament Team Profile
 */
router.get('/:id/team/:teamId', (req, res): void => {
  if (!checkTournamentViewAccess(req.params.id, req, res)) return;
  try {
    const profile = getTournamentTeamProfile(req.params.id, req.params.teamId);
    if (!profile) {
      res.status(404).json({ error: 'Team tournament profile not found' });
      return;
    }
    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch team profile' });
  }
});

/**
 * GET /api/tournaments/:id/performance-index
 * Deterministic tournament performance index ranking
 */
router.get('/:id/performance-index', (req, res): void => {
  if (!checkTournamentViewAccess(req.params.id, req, res)) return;
  try {
    const pi = getTournamentPerformanceIndex(req.params.id);
    res.json({ performanceIndex: pi });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch performance index' });
  }
});

/**
 * GET /api/tournaments/:id/records
 * Tournament records
 */
router.get('/:id/records', (req, res): void => {
  if (!checkTournamentViewAccess(req.params.id, req, res)) return;
  try {
    const records = getTournamentRecords(req.params.id);
    res.json({ records });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch records' });
  }
});

/**
 * POST /api/tournaments/:id/statistics/recalculate
 * Invalidate caches and recalculate statistics
 */
router.post('/:id/statistics/recalculate', requireAuth, requireTournamentAccess('MANAGE'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const summary = calculateTournamentStatistics(req.params.id);
    const data = getTournamentDashboardData(req.params.id);
    addAuditLog(
      'TOURNAMENT_UPDATE',
      `Recalculated tournament statistics for tournament ID: ${req.params.id}`,
      req.user,
      req.ip
    );
    res.json({
      message: 'Tournament statistics recalculated successfully.',
      statistics: summary,
      dashboard: data,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to recalculate statistics' });
  }
});

/**
 * GET /api/tournaments/:id/statistics
 * Get tournament leaderboards & statistics
 */
router.get('/:id/statistics', (req, res): void => {
  if (!checkTournamentViewAccess(req.params.id, req, res)) return;
  const summary = calculateTournamentStatistics(req.params.id);
  res.json({ statistics: summary });
});

/**
 * GET /api/tournaments/:id/awards
 * Get tournament awards with candidates, transparent formula breakdowns & override states
 */
router.get('/:id/awards', (req, res): void => {
  if (!checkTournamentViewAccess(req.params.id, req, res)) return;
  try {
    const awards = calculateTournamentAwards(req.params.id);
    res.json({ awards });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to calculate tournament awards' });
  }
});

/**
 * GET /api/tournaments/:id/records
 * Get tournament records center details derived from immutable match reports
 */
router.get('/:id/records', (req, res): void => {
  if (!checkTournamentViewAccess(req.params.id, req, res)) return;
  try {
    const records = getTournamentRecordsCenter(req.params.id);
    res.json({ records });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve tournament records' });
  }
});

/**
 * GET /api/tournaments/:id/hall-of-fame
 * Get tournament hall of fame (podium, MVP, award winners, record holders, best performers)
 */
router.get('/:id/hall-of-fame', (req, res): void => {
  if (!checkTournamentViewAccess(req.params.id, req, res)) return;
  try {
    const hallOfFame = getTournamentHallOfFame(req.params.id);
    if (!hallOfFame) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }
    res.json(hallOfFame);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve tournament hall of fame' });
  }
});

/**
 * POST /api/tournaments/:id/awards/override
 * Admin override an award recipient with audit log
 */
router.post('/:id/awards/override', requireAuth, requireTournamentAccess('MANAGE'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const tournamentId = req.params.id;
    const { awardId, newPlayerId, reason, citation } = req.body;

    if (!awardId || !newPlayerId || !reason) {
      res.status(400).json({ error: 'awardId, newPlayerId, and reason are required.' });
      return;
    }

    const result = overrideTournamentAward(
      tournamentId,
      awardId,
      newPlayerId,
      reason,
      citation,
      req.user
    );

    res.json({
      message: 'Award recipient overridden successfully.',
      award: result.award,
      auditLog: result.auditLog,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to override award' });
  }
});

/**
 * POST /api/tournaments/:id/awards/restore
 * Restore automatic algorithmic recommendation for an award
 */
router.post('/:id/awards/restore', requireAuth, requireTournamentAccess('MANAGE'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const tournamentId = req.params.id;
    const { awardId } = req.body;

    if (!awardId) {
      res.status(400).json({ error: 'awardId is required.' });
      return;
    }

    const result = restoreTournamentAwardRecommendation(tournamentId, awardId, req.user);

    res.json({
      message: 'Automatic recommendation restored successfully.',
      award: result.award,
      auditLog: result.auditLog,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to restore recommendation' });
  }
});

/**
 * POST /api/tournaments/:id/awards/finalize
 * Finalize & lock tournament awards with validation and audit log
 */
router.post('/:id/awards/finalize', requireAuth, requireTournamentAccess('MANAGE'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const tournamentId = req.params.id;
    const result = finalizeTournamentAwards(tournamentId, req.user);

    res.json({
      message: 'Tournament awards finalized and locked successfully.',
      awards: result.awards,
      auditLog: result.auditLog,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to finalize tournament awards' });
  }
});

/**
 * POST /api/tournaments/:id/awards/reopen
 * Reopen finalized tournament awards for authorized modifications
 */
router.post('/:id/awards/reopen', requireAuth, requireTournamentAccess('MANAGE'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const tournamentId = req.params.id;
    const result = reopenTournamentAwards(tournamentId, req.user);

    res.json({
      message: 'Tournament awards reopened for modifications.',
      awards: result.awards,
      auditLog: result.auditLog,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to reopen awards' });
  }
});

/**
 * GET /api/tournaments/:id/awards/audit-logs
 * Get audit logs for awards and overrides
 */
router.get('/:id/awards/audit-logs', (req, res): void => {
  if (!checkTournamentViewAccess(req.params.id, req, res)) return;
  const db = getDb();
  const logs = (db.tournament_award_audit_logs || []).filter(
    (l: any) => l.tournamentId === req.params.id
  );
  res.json({ logs });
});

/**
 * POST /api/tournaments/:id/awards
 * Save/update batch tournament awards (compatibility)
 */
router.post('/:id/awards', requireAuth, requireTournamentAccess('MANAGE'), (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const tournamentId = req.params.id;
  const { awards } = req.body;

  if (!Array.isArray(awards)) {
    res.status(400).json({ error: 'Awards array is required' });
    return;
  }

  if (!db.tournament_awards) db.tournament_awards = [];
  db.tournament_awards = db.tournament_awards.filter((a: any) => a.tournamentId !== tournamentId);
  db.tournament_awards.push(...awards);
  saveDatabase();

  addAuditLog(
    'TOURNAMENT_UPDATE',
    `Updated tournament awards for tournament ID: ${tournamentId}`,
    req.user,
    req.ip
  );

  res.json({
    message: 'Tournament awards saved successfully.',
    awards,
  });
});

/**
 * GET /api/tournaments/:id/presentation-data
 * Get presentation overlay payload, dynamic tokens & hall of fame
 */
router.get('/:id/presentation-data', (req, res): void => {
  if (!checkTournamentViewAccess(req.params.id, req, res)) return;
  const tournamentId = req.params.id;
  const db = getDb();
  const tournament = db.tournaments.find((t) => t.id === tournamentId);
  if (!tournament) {
    res.status(404).json({ error: 'Tournament not found' });
    return;
  }

  const hallOfFame = getTournamentHallOfFame(tournamentId);
  const awards = calculateTournamentAwards(tournamentId);
  const records = getTournamentRecordsCenter(tournamentId);
  const championship = getChampionshipSummary(tournamentId);

  res.json({
    tournament,
    championship,
    hallOfFame,
    awards,
    records,
    sponsor: {
      name: tournament.sponsor || 'SportsPulse Live',
    },
  });
});

/**
 * GET /api/tournaments/:id/presentation/sse
 * Real-time SSE stream for 1920x1080 transparent broadcast overlay & spectator pages
 */
router.get('/:id/presentation/sse', (req, res): void => {
  const tournamentId = req.params.id;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send initial ping / hello
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', tournamentId, timestamp: new Date().toISOString() })}\n\n`);

  // Register client
  registerPresentationClient(tournamentId, res);
});

/**
 * POST /api/tournaments/:id/presentation/trigger
 * Trigger a presentation event from manual director control deck
 */
router.post('/:id/presentation/trigger', requireAuth, requireTournamentAccess('MANAGE'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const tournamentId = req.params.id;
    const { type, data, cardConfig } = req.body;

    if (!type) {
      res.status(400).json({ error: 'Presentation type is required (e.g. CHAMPION, MVP, AWARD, RECORD, CLEAR).' });
      return;
    }

    const event = triggerPresentationAction(
      tournamentId,
      type,
      data,
      cardConfig,
      req.user
    );

    res.json({
      message: `Presentation card triggered: ${type}`,
      event,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to trigger presentation card' });
  }
});

/**
 * GET /api/tournaments/:id/broadcast-data
 * Tournament broadcast data payload for overlays (compatibility)
 */
router.get('/:id/broadcast-data', (req, res): void => {
  if (!checkTournamentViewAccess(req.params.id, req, res)) return;
  const data = getTournamentBroadcastData(req.params.id);
  if (!data) {
    res.status(404).json({ error: 'Tournament not found' });
    return;
  }
  res.json(data);
});

/**
 * GET /api/tournaments/:id/acl
 * Retrieve ACL & collaborator list for a tournament
 */
router.get('/:id/acl', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const tournament = db.tournaments.find((t) => t.id === req.params.id);
  if (!tournament) {
    res.status(404).json({ error: 'Tournament not found.' });
    return;
  }

  if (!isAuthorizedForTournament(tournament, req.user, 'VIEW')) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to view this tournament ACL.' });
    return;
  }

  const owner = db.users.find((u) => u.id === (tournament.ownerUserId || tournament.createdByUserId));
  const safeOwner = owner ? { id: owner.id, name: owner.name, email: owner.email, role: owner.role } : null;

  const collaborators = (tournament.collaborators || []).map((c) => {
    const user = db.users.find((u) => u.id === c.userId);
    return {
      userId: c.userId,
      role: c.role,
      name: user?.name || c.userName || 'Unknown User',
      email: user?.email || c.userEmail || '',
      assignedAt: c.assignedAt,
    };
  });

  res.json({
    owner: safeOwner,
    collaborators,
  });
});

/**
 * POST /api/tournaments/:id/acl
 * Add or update collaborator permission for a user
 */
router.post('/:id/acl', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const tournament = db.tournaments.find((t) => t.id === req.params.id);
  if (!tournament) {
    res.status(404).json({ error: 'Tournament not found.' });
    return;
  }

  if (!isAuthorizedForTournament(tournament, req.user, 'MANAGE')) {
    res.status(403).json({ error: 'Forbidden: Only tournament managers/owners can update the access control list.' });
    return;
  }

  const { email, userId, role } = req.body;
  if (!role || !['MANAGER', 'SCORER', 'BROADCAST_OPERATOR', 'VIEWER'].includes(role)) {
    res.status(400).json({ error: 'Valid role is required (MANAGER, SCORER, BROADCAST_OPERATOR, VIEWER).' });
    return;
  }

  let targetUser = userId ? db.users.find((u) => u.id === userId) : null;
  if (!targetUser && email) {
    targetUser = db.users.find((u) => u.email.toLowerCase() === String(email).toLowerCase().trim());
  }

  if (!targetUser) {
    res.status(404).json({ error: 'Target user not found on the platform.' });
    return;
  }

  if (!tournament.collaborators) {
    tournament.collaborators = [];
  }

  const existingIdx = tournament.collaborators.findIndex((c) => c.userId === targetUser!.id);
  const collaboratorEntry = {
    userId: targetUser.id,
    role: role as any,
    userName: targetUser.name,
    userEmail: targetUser.email,
    assignedAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    tournament.collaborators[existingIdx] = collaboratorEntry;
  } else {
    tournament.collaborators.push(collaboratorEntry);
  }

  tournament.updatedAt = new Date().toISOString();
  saveDatabase();

  addAuditLog(
    'ACL_UPDATE',
    `Updated collaborator "${targetUser.name}" (${targetUser.email}) as ${role} for tournament "${tournament.name}".`,
    req.user
  );

  res.json({
    message: 'Collaborator successfully assigned.',
    collaborators: tournament.collaborators,
  });
});

/**
 * DELETE /api/tournaments/:id/acl/:userId
 * Remove a collaborator from tournament
 */
router.delete('/:id/acl/:userId', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const tournament = db.tournaments.find((t) => t.id === req.params.id);
  if (!tournament) {
    res.status(404).json({ error: 'Tournament not found.' });
    return;
  }

  if (!isAuthorizedForTournament(tournament, req.user, 'MANAGE')) {
    res.status(403).json({ error: 'Forbidden: Only tournament managers/owners can update the access control list.' });
    return;
  }

  const targetUserId = req.params.userId;
  tournament.collaborators = (tournament.collaborators || []).filter((c) => c.userId !== targetUserId);
  tournament.updatedAt = new Date().toISOString();
  saveDatabase();

  addAuditLog(
    'ACL_REMOVE',
    `Removed user ${targetUserId} from tournament "${tournament.name}" collaborators.`,
    req.user
  );

  res.json({ message: 'Collaborator removed successfully.' });
});

export default router;
