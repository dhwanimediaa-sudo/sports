import { Router, Response } from 'express';
import crypto from 'crypto';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import {
  canUserAccessMatch,
  getMatchAccessRole,
  isAuthorizedForTournament,
  isUserAdmin,
  canAccessSport,
  getUserFromRequest,
} from '../middleware/accessControl';
import { getDb, saveDatabase } from '../db/database';
import { Match, MatchStatus, AuditLog } from '../../src/types';
import { calculateFullMatchReport } from '../services/cricketReportEngine';
import { calculateVolleyballMatchReport } from '../services/volleyballReportEngine';
import { calculateKabaddiMatchReport, KabaddiReportOptions } from '../services/kabaddiReportEngine';
import { generateHockeyMatchReport } from '../services/hockeyReportEngine';
import { calculateFootballMatchReport } from '../services/footballReportEngine';
import { calculateBasketballMatchReport } from '../services/basketballReportEngine';
import { calculateTennisMatchReport } from '../services/tennisReportEngine';
import { calculateBadmintonMatchReport } from '../services/badmintonReportEngine';
import { calculateBadmintonScoringState } from '../services/badmintonScoringEngine';
import { calculateTableTennisMatchReport } from '../services/tableTennisReportEngine';
import { calculateCustomSportMatchReport } from '../services/customSportReportEngine';
import { broadcastScoringUpdate, getScoringStateForMatch } from './scoring';

const router = Router();

/**
 * Sanitize match object for public broadcast views (strips internal user IDs, emails, roles)
 */
export function sanitizePublicMatch(match: any): any {
  if (!match) return match;
  const {
    ownerUserId,
    createdByUserId,
    createdByUserEmail,
    createdByUserName,
    scorerUserIds,
    broadcasterUserIds,
    managerUserIds,
    authorizedUserIds,
    accessAssignments,
    ...publicMatch
  } = match;
  return publicMatch;
}

/**
 * Populate relational entities into match object
 */
function populateMatchDetails(match: Match, db: ReturnType<typeof getDb>): Match {
  const tournament = db.tournaments.find((t) => t.id === match.tournamentId);
  const group = db.groups.find((g) => g.id === match.groupId);
  const teamA = db.teams.find((t) => t.id === match.teamAId);
  const teamB = db.teams.find((t) => t.id === match.teamBId);

  const teamAPlayers = db.players.filter((p) => p.teamId === match.teamAId);
  const teamBPlayers = db.players.filter((p) => p.teamId === match.teamBId);

  let effectiveMatchOvers: number | undefined = undefined;
  if (match.sport === 'CRICKET') {
    if (match.cricketConfig?.overs && Number(match.cricketConfig.overs) > 0) {
      effectiveMatchOvers = Number(match.cricketConfig.overs);
    } else if (match.cricketConfig?.matchOvers && Number(match.cricketConfig.matchOvers) > 0) {
      effectiveMatchOvers = Number(match.cricketConfig.matchOvers);
    } else if (match.matchOvers && Number(match.matchOvers) > 0) {
      effectiveMatchOvers = Number(match.matchOvers);
    } else if (tournament?.cricketDefaultOvers && Number(tournament.cricketDefaultOvers) > 0) {
      effectiveMatchOvers = Number(tournament.cricketDefaultOvers);
    } else {
      effectiveMatchOvers = 20;
    }
  }

  return {
    ...match,
    effectiveMatchOvers,
    tournament,
    group,
    teamA,
    teamB,
    teamAPlayers,
    teamBPlayers,
  };
}

/**
 * GET /api/matches
 * Get all matches with optional search and filters
 */
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  let matches = [...(db.matches || [])] as Match[];

  const { tournamentId, groupId, sport, status, search, scope } = req.query;

  // Multi-user & sport authorization: regular users only see matches they can access
  if (req.user && !isUserAdmin(req.user)) {
    matches = matches.filter((m) => canUserAccessMatch(req.user, m, 'VIEW'));
  } else if (scope === 'my' && req.user) {
    matches = matches.filter((m) => canUserAccessMatch(req.user, m, 'VIEW'));
  }

  if (tournamentId && typeof tournamentId === 'string') {
    matches = matches.filter((m) => m.tournamentId === tournamentId);
  }

  if (groupId && typeof groupId === 'string') {
    matches = matches.filter((m) => m.groupId === groupId);
  }

  if (sport && typeof sport === 'string') {
    matches = matches.filter((m) => m.sport.toUpperCase() === sport.toUpperCase());
  }

  if (status && typeof status === 'string') {
    matches = matches.filter((m) => m.status === status);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    matches = matches.filter(
      (m) =>
        m.name?.toLowerCase().includes(q) ||
        m.venue?.toLowerCase().includes(q) ||
        m.matchNumber?.toLowerCase().includes(q)
    );
  }

  // Populate details and attach currentUserRole
  const populated = matches.map((m) => {
    const pop = populateMatchDetails(m, db);
    const userRole = req.user ? getMatchAccessRole(m, req.user) : null;
    return {
      ...pop,
      currentUserRole: userRole,
      canScore: req.user ? canUserAccessMatch(req.user, m, 'SCORING') : false,
      canBroadcast: req.user ? canUserAccessMatch(req.user, m, 'BROADCAST') : false,
      canManage: req.user ? canUserAccessMatch(req.user, m, 'MANAGE') : false,
    };
  });

  res.json({ matches: populated });
});

/**
 * GET /api/matches/:id/public
 * Get public single match details without requiring admin login
 */
router.get('/:id/public', (req, res): void => {
  const db = getDb();
  const match = db.matches?.find((m) => m.id === req.params.id);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  const populated = sanitizePublicMatch(populateMatchDetails(match, db));
  res.json({ match: populated });
});

/**
 * GET /api/matches/:id
 * Get single match details
 */
router.get('/:id', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const match = db.matches?.find((m) => m.id === req.params.id);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (!canUserAccessMatch(req.user, match, 'VIEW')) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to view this match.' });
    return;
  }

  const populated = populateMatchDetails(match, db);
  const userRole = req.user ? getMatchAccessRole(match, req.user) : null;
  res.json({
    match: {
      ...populated,
      currentUserRole: userRole,
      canScore: req.user ? canUserAccessMatch(req.user, match, 'SCORING') : false,
      canBroadcast: req.user ? canUserAccessMatch(req.user, match, 'BROADCAST') : false,
      canManage: req.user ? canUserAccessMatch(req.user, match, 'MANAGE') : false,
    },
  });
});

/**
 * POST /api/matches
 * Create new match record
 */
router.post('/', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const {
    tournamentId,
    groupId,
    sport,
    name,
    matchNumber,
    round = 'Group Stage',
    teamAId,
    teamBId,
    date,
    time,
    venue,
    ground,
    description,
    status = 'SCHEDULED',
    cricketConfig,
    toss,
    volleyballConfig,
    kabaddiConfig,
    hockeyConfig,
    footballConfig,
    basketballConfig,
    tennisConfig,
    customSportConfig,
    officials,
    sponsors,
    teamASquad,
    teamBSquad,
  } = req.body;

  const tournament = db.tournaments.find((t) => t.id === tournamentId);
  if (!tournament) {
    res.status(400).json({ error: 'Selected tournament does not exist.' });
    return;
  }

  if (!isAuthorizedForTournament(tournament, req.user, 'MANAGE')) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to schedule matches in this tournament.' });
    return;
  }

  const effectiveSport = sport || tournament.sport;
  if (!canAccessSport(req.user, effectiveSport)) {
    res.status(403).json({ error: `Forbidden: You do not have permission to schedule matches for ${effectiveSport}.` });
    return;
  }

  let resolvedGroupId = groupId;
  let group = resolvedGroupId ? db.groups.find((g) => g.id === resolvedGroupId) : undefined;
  if (!group) {
    const tournamentGroup = db.groups.find((g) => g.tournamentId === tournamentId);
    if (tournamentGroup) {
      resolvedGroupId = tournamentGroup.id;
      group = tournamentGroup;
    } else {
      const newGroup: any = {
        id: crypto.randomUUID(),
        tournamentId,
        name: 'Group A',
        code: 'A',
        description: 'Default Group',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.groups.push(newGroup);
      resolvedGroupId = newGroup.id;
      group = newGroup;
    }
  }

  if (!teamAId || !teamBId) {
    res.status(400).json({ error: 'Team A and Team B are required.' });
    return;
  }

  if (teamAId === teamBId) {
    res.status(400).json({ error: 'Team A and Team B cannot be the same team.' });
    return;
  }

  const finalDate = date || new Date().toISOString().split('T')[0];
  const finalTime = time || '14:00';
  const finalVenue = venue || tournament.venue || tournament.location || 'Main Arena';

  const teamA = db.teams.find((t) => t.id === teamAId);
  const teamB = db.teams.find((t) => t.id === teamBId);

  if (!teamA || !teamB) {
    res.status(400).json({ error: 'Selected teams must exist in database.' });
    return;
  }

  const computedName = name || `${matchNumber ? `#${matchNumber} ` : ''}${teamA.name} vs ${teamB.name}`;

  const newMatch: Match = {
    id: crypto.randomUUID(),
    tournamentId,
    groupId: resolvedGroupId,
    sport: effectiveSport,
    name: computedName,
    matchNumber,
    round,
    teamAId,
    teamBId,
    date: finalDate,
    time: finalTime,
    venue: finalVenue,
    ground,
    description,
    status: status as MatchStatus,
    cricketConfig,
    toss,
    volleyballConfig,
    kabaddiConfig,
    hockeyConfig,
    footballConfig,
    basketballConfig,
    tennisConfig,
    customSportConfig,
    officials,
    sponsors,
    teamASquad,
    teamBSquad,
    createdByUserId: req.user?.id,
    createdByUserEmail: req.user?.email,
    createdByUserName: req.user?.name,
    ownerUserId: req.user?.id,
    authorizedUserIds: req.user?.id ? [req.user.id] : [],
    scorerUserIds: [],
    broadcasterUserIds: [],
    managerUserIds: [],
    accessAssignments: req.user ? [{
      userId: req.user.id,
      userEmail: req.user.email,
      userName: req.user.name,
      role: 'OWNER' as const,
      assignedAt: new Date().toISOString(),
    }] : [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.matches.push(newMatch);

  // Audit log
  const auditLog: AuditLog = {
    id: crypto.randomUUID(),
    userId: req.user?.id,
    userName: req.user?.name,
    userEmail: req.user?.email,
    action: 'MATCH_CREATE',
    details: `Created match "${computedName}" (${effectiveSport}) in tournament "${tournament.name}".`,
    timestamp: new Date().toISOString(),
  };
  db.audit_logs.unshift(auditLog);

  saveDatabase();

  const populated = populateMatchDetails(newMatch, db);
  res.status(201).json({ message: 'Match created successfully.', match: populated });
});

/**
 * PUT / PATCH /api/matches/:id
 * Update existing match record
 */
const handleUpdateMatch = (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchIndex = db.matches.findIndex((m) => m.id === req.params.id);

  if (matchIndex === -1) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  const existing = db.matches[matchIndex];

  if (!canUserAccessMatch(req.user, existing, 'MANAGE')) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to manage this match.' });
    return;
  }

  if (req.body.sport && req.body.sport !== existing.sport && !canAccessSport(req.user, req.body.sport)) {
    res.status(403).json({ error: `Forbidden: You do not have permission for ${req.body.sport}.` });
    return;
  }

  if (req.body.tournamentId && req.body.tournamentId !== existing.tournamentId) {
    const targetTournament = db.tournaments.find((t) => t.id === req.body.tournamentId);
    if (!targetTournament || !isAuthorizedForTournament(targetTournament, req.user, 'MANAGE')) {
      res.status(403).json({ error: 'Forbidden: You cannot transfer match to a tournament you do not manage.' });
      return;
    }
  }

  const {
    tournamentId = existing.tournamentId,
    groupId = existing.groupId,
    sport = existing.sport,
    name,
    matchNumber,
    round,
    teamAId = existing.teamAId,
    teamBId = existing.teamBId,
    date,
    time,
    venue,
    ground,
    description,
    status,
    cricketConfig,
    toss,
    volleyballConfig,
    kabaddiConfig,
    hockeyConfig,
    footballConfig,
    basketballConfig,
    tennisConfig,
    customSportConfig,
    officials,
    sponsors,
    teamASquad,
    teamBSquad,
  } = req.body;

  if (teamAId === teamBId) {
    res.status(400).json({ error: 'Team A and Team B cannot be the same team.' });
    return;
  }

  const teamA = db.teams.find((t) => t.id === teamAId);
  const teamB = db.teams.find((t) => t.id === teamBId);

  const updatedName = name || `${matchNumber ? `#${matchNumber} ` : ''}${teamA ? teamA.name : 'Team A'} vs ${teamB ? teamB.name : 'Team B'}`;

  const updatedMatch: Match = {
    ...existing,
    tournamentId,
    groupId,
    sport,
    name: updatedName,
    matchNumber: matchNumber !== undefined ? matchNumber : existing.matchNumber,
    round: round || existing.round,
    teamAId,
    teamBId,
    date: date || existing.date,
    time: time || existing.time,
    venue: venue || existing.venue,
    ground: ground !== undefined ? ground : existing.ground,
    description: description !== undefined ? description : existing.description,
    status: status || existing.status,
    cricketConfig: cricketConfig !== undefined ? cricketConfig : existing.cricketConfig,
    toss: toss !== undefined ? toss : existing.toss,
    volleyballConfig: volleyballConfig !== undefined ? volleyballConfig : existing.volleyballConfig,
    kabaddiConfig: kabaddiConfig !== undefined ? kabaddiConfig : existing.kabaddiConfig,
    hockeyConfig: hockeyConfig !== undefined ? hockeyConfig : existing.hockeyConfig,
    footballConfig: footballConfig !== undefined ? footballConfig : existing.footballConfig,
    basketballConfig: basketballConfig !== undefined ? basketballConfig : existing.basketballConfig,
    tennisConfig: tennisConfig !== undefined ? tennisConfig : existing.tennisConfig,
    customSportConfig: customSportConfig !== undefined ? customSportConfig : existing.customSportConfig,
    officials: officials !== undefined ? officials : existing.officials,
    sponsors: sponsors !== undefined ? sponsors : existing.sponsors,
    teamASquad: teamASquad !== undefined ? teamASquad : existing.teamASquad,
    teamBSquad: teamBSquad !== undefined ? teamBSquad : existing.teamBSquad,
    updatedAt: new Date().toISOString(),
  };

  db.matches[matchIndex] = updatedMatch;

  // Audit log
  const auditLog: AuditLog = {
    id: crypto.randomUUID(),
    userId: req.user?.id,
    userName: req.user?.name,
    userEmail: req.user?.email,
    action: 'MATCH_UPDATE',
    details: `Updated match "${updatedMatch.name}" details and settings.`,
    timestamp: new Date().toISOString(),
  };
  db.audit_logs.unshift(auditLog);

  saveDatabase();

  const populated = populateMatchDetails(updatedMatch, db);
  res.json({ message: 'Match updated successfully.', match: populated });
};

router.put('/:id', requireAuth, handleUpdateMatch);
router.patch('/:id', requireAuth, handleUpdateMatch);

/**
 * POST /api/matches/:id/duplicate
 * Duplicate an existing match with new unique ID and DRAFT status
 */
router.post('/:id/duplicate', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const existing = db.matches.find((m) => m.id === req.params.id);

  if (!existing) {
    res.status(404).json({ error: 'Original match not found.' });
    return;
  }

  if (!canUserAccessMatch(req.user, existing, 'MANAGE')) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to duplicate this match.' });
    return;
  }

  if (existing.sport && !canAccessSport(req.user, existing.sport)) {
    res.status(403).json({ error: `Forbidden: You do not have permission for ${existing.sport}.` });
    return;
  }

  const newId = crypto.randomUUID();
  const duplicatedMatch: Match = {
    ...JSON.parse(JSON.stringify(existing)),
    id: newId,
    name: `${existing.name} (Copy)`,
    matchNumber: existing.matchNumber ? `${existing.matchNumber}-COPY` : undefined,
    status: 'DRAFT',
    createdByUserId: req.user?.id,
    createdByUserEmail: req.user?.email,
    createdByUserName: req.user?.name,
    ownerUserId: req.user?.id,
    authorizedUserIds: req.user?.id ? [req.user.id] : [],
    accessAssignments: req.user ? [{
      userId: req.user.id,
      userEmail: req.user.email,
      userName: req.user.name,
      role: 'OWNER' as const,
      assignedAt: new Date().toISOString(),
    }] : [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.matches.push(duplicatedMatch);

  // Audit log
  const auditLog: AuditLog = {
    id: crypto.randomUUID(),
    userId: req.user?.id,
    userName: req.user?.name,
    userEmail: req.user?.email,
    action: 'MATCH_DUPLICATE',
    details: `Duplicated match "${existing.name}" to create new match "${duplicatedMatch.name}".`,
    timestamp: new Date().toISOString(),
  };
  db.audit_logs.unshift(auditLog);

  saveDatabase();

  const populated = populateMatchDetails(duplicatedMatch, db);
  res.status(201).json({ message: 'Match duplicated successfully.', match: populated });
});

/**
 * DELETE /api/matches/:id
 * Delete match record safely
 */
router.delete('/:id', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchIndex = db.matches.findIndex((m) => m.id === req.params.id);

  if (matchIndex === -1) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  const deletedMatch = db.matches[matchIndex];

  if (!canUserAccessMatch(req.user, deletedMatch, 'MANAGE')) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to delete this match.' });
    return;
  }

  db.matches.splice(matchIndex, 1);

  // Clean up match squads or scoring events if present
  if (db.match_squads) {
    db.match_squads = db.match_squads.filter((s: any) => s.matchId !== req.params.id);
  }

  // Audit log
  const auditLog: AuditLog = {
    id: crypto.randomUUID(),
    userId: req.user?.id,
    userName: req.user?.name,
    userEmail: req.user?.email,
    action: 'MATCH_DELETE',
    details: `Deleted match "${deletedMatch.name}".`,
    timestamp: new Date().toISOString(),
  };
  db.audit_logs.unshift(auditLog);

  saveDatabase();

  res.json({ message: 'Match deleted successfully.' });
});

/**
 * PUT /api/matches/:id/squad
 * Update playing squad for match
 */
const handleSquadUpdate = (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const match = db.matches.find((m) => m.id === req.params.id);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (!canUserAccessMatch(req.user, match, 'SCORING')) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to update squads for this match.' });
    return;
  }

  const { teamASquad, teamBSquad } = req.body;

  if (teamASquad) match.teamASquad = teamASquad;
  if (teamBSquad) match.teamBSquad = teamBSquad;
  match.updatedAt = new Date().toISOString();

  // Audit log
  const auditLog: AuditLog = {
    id: crypto.randomUUID(),
    userId: req.user?.id,
    userName: req.user?.name,
    userEmail: req.user?.email,
    action: 'MATCH_SQUAD_UPDATE',
    details: `Updated playing squad rosters for match "${match.name}".`,
    timestamp: new Date().toISOString(),
  };
  db.audit_logs.unshift(auditLog);

  saveDatabase();

  const populated = populateMatchDetails(match, db);
  res.json({ message: 'Match squads updated successfully.', match: populated });
};

router.put('/:id/squad', requireAuth, handleSquadUpdate);
router.post('/:id/squad', requireAuth, handleSquadUpdate);

/**
 * GET /api/matches/:id/access
 * Get collaborator and role assignments for a match
 */
router.get('/:id/access', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const match = db.matches.find((m) => m.id === req.params.id);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (!canUserAccessMatch(req.user, match, 'VIEW')) {
    res.status(403).json({ error: 'Forbidden: You do not have access to view permissions for this match.' });
    return;
  }

  res.json({
    ownerUserId: match.ownerUserId || match.createdByUserId,
    assignments: match.accessAssignments || [],
  });
});

/**
 * POST /api/matches/:id/access
 * Assign or update a role for a user on this match
 */
router.post('/:id/access', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const match = db.matches.find((m) => m.id === req.params.id);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (!canUserAccessMatch(req.user, match, 'MANAGE')) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to assign roles for this match.' });
    return;
  }

  const { userId, userEmail, role } = req.body;
  const targetUser = userId
    ? db.users?.find((u) => u.id === userId)
    : userEmail
    ? db.users?.find((u) => u.email.toLowerCase() === userEmail.toLowerCase().trim())
    : undefined;

  if (!targetUser) {
    res.status(404).json({ error: 'User not found in system.' });
    return;
  }

  const validRoles = ['MANAGER', 'SCORER', 'BROADCAST_OPERATOR', 'VIEWER'];
  if (!validRoles.includes(role)) {
    res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    return;
  }

  if (!match.accessAssignments) match.accessAssignments = [];

  // Update or add assignment
  const existingIdx = match.accessAssignments.findIndex((a) => a.userId === targetUser.id);
  if (existingIdx !== -1) {
    match.accessAssignments[existingIdx].role = role;
    match.accessAssignments[existingIdx].assignedAt = new Date().toISOString();
  } else {
    match.accessAssignments.push({
      userId: targetUser.id,
      userEmail: targetUser.email,
      userName: targetUser.name,
      role,
      assignedAt: new Date().toISOString(),
    });
  }

  // Update legacy role arrays for fast lookup
  if (role === 'SCORER') {
    match.scorerUserIds = Array.from(new Set([...(match.scorerUserIds || []), targetUser.id]));
  } else if (role === 'BROADCAST_OPERATOR') {
    match.broadcasterUserIds = Array.from(new Set([...(match.broadcasterUserIds || []), targetUser.id]));
  } else if (role === 'MANAGER') {
    match.managerUserIds = Array.from(new Set([...(match.managerUserIds || []), targetUser.id]));
  }

  match.updatedAt = new Date().toISOString();
  saveDatabase();

  res.json({
    message: `Assigned role ${role} to ${targetUser.name} (${targetUser.email}).`,
    assignments: match.accessAssignments,
  });
});

/**
 * DELETE /api/matches/:id/access/:userId
 * Remove access assignment for user on this match
 */
router.delete('/:id/access/:userId', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const match = db.matches.find((m) => m.id === req.params.id);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (!canUserAccessMatch(req.user, match, 'MANAGE')) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to remove roles for this match.' });
    return;
  }

  const targetUserId = req.params.userId;
  if (match.ownerUserId === targetUserId || match.createdByUserId === targetUserId) {
    res.status(400).json({ error: 'Cannot remove access of the match owner.' });
    return;
  }

  match.accessAssignments = (match.accessAssignments || []).filter((a) => a.userId !== targetUserId);
  match.scorerUserIds = (match.scorerUserIds || []).filter((id) => id !== targetUserId);
  match.broadcasterUserIds = (match.broadcasterUserIds || []).filter((id) => id !== targetUserId);
  match.managerUserIds = (match.managerUserIds || []).filter((id) => id !== targetUserId);
  match.authorizedUserIds = (match.authorizedUserIds || []).filter((id) => id !== targetUserId);

  match.updatedAt = new Date().toISOString();
  saveDatabase();

  res.json({
    message: 'User access removed.',
    assignments: match.accessAssignments,
  });
});

/**
 * PATCH /api/matches/:id/status
 * Change match status
 */
router.patch('/:id/status', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const match = db.matches.find((m) => m.id === req.params.id);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (!canUserAccessMatch(req.user, match, 'SCORING')) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to update status for this match.' });
    return;
  }

  const { status } = req.body;
  if (!status) {
    res.status(400).json({ error: 'Status is required.' });
    return;
  }

  const oldStatus = match.status;
  match.status = status;
  match.updatedAt = new Date().toISOString();

  // Audit log
  const auditLog: AuditLog = {
    id: crypto.randomUUID(),
    userId: req.user?.id,
    userName: req.user?.name,
    userEmail: req.user?.email,
    action: 'MATCH_STATUS_CHANGE',
    details: `Changed match "${match.name}" status from ${oldStatus} to ${status}.`,
    timestamp: new Date().toISOString(),
  };
  db.audit_logs.unshift(auditLog);

  saveDatabase();

  const populated = populateMatchDetails(match, db);

  // Broadcast live SSE state to all scoring consoles and broadcast overlays
  try {
    const state = getScoringStateForMatch(match);
    broadcastScoringUpdate(match.id, state);
  } catch {
    // Non-fatal if state resolution fails
  }

  res.json({ message: `Match status updated to ${status}.`, match: populated });
});

/**
 * Helper to compute Sport-Aware Full Match Report
 */
function getMatchReportData(match: Match, db: ReturnType<typeof getDb>, overrideOptions: any = {}) {
  const matchId = match.id;
  const players = db.players || [];
  const teams = db.teams || [];
  const tournaments = db.tournaments || [];
  const groups = db.groups || [];
  const savedReport = (db.match_reports || []).find((r) => r.matchId === matchId);
  const savedAwards = (db.match_awards || []).find((a) => a.matchId === matchId);

  if (match.sport === 'VOLLEYBALL') {
    const setsList = (db.volleyball_sets || []).filter((s) => s.matchId === matchId);
    const events = (db.volleyball_events || []).filter((e) => e.matchId === matchId);
    const timeouts = (db.volleyball_timeouts || []).filter((t) => t.matchId === matchId);
    const substitutions = (db.volleyball_substitutions || []).filter((s) => s.matchId === matchId);
    const rotations = (db.volleyball_rotations || []).filter(
      (r) => r.teamId === match.teamAId || r.teamId === match.teamBId
    );

    const reportOptions = {
      isFinalized: overrideOptions.isFinalized ?? savedReport?.isFinalized ?? false,
      finalizedAt: overrideOptions.finalizedAt ?? savedReport?.finalizedAt,
      finalizedBy: overrideOptions.finalizedBy ?? savedReport?.finalizedBy,
      playerOfTheMatchId: overrideOptions.playerOfTheMatchId ?? savedAwards?.playerOfTheMatchId ?? savedAwards?.manOfTheMatchId,
      playerOfTheMatchReason: overrideOptions.playerOfTheMatchReason ?? savedAwards?.playerOfTheMatchReason ?? savedAwards?.manOfTheMatchReason,
      bestAttackerId: overrideOptions.bestAttackerId ?? savedAwards?.bestAttackerId ?? savedAwards?.bestBatterId,
      bestServerId: overrideOptions.bestServerId ?? savedAwards?.bestServerId,
      bestBlockerId: overrideOptions.bestBlockerId ?? savedAwards?.bestBlockerId ?? savedAwards?.bestBowlerId,
      bestDefenderId: overrideOptions.bestDefenderId ?? savedAwards?.bestDefenderId,
    };

    return calculateVolleyballMatchReport(
      match,
      setsList,
      events,
      timeouts,
      substitutions,
      rotations,
      players,
      teams,
      reportOptions,
      tournaments,
      groups
    );
  }

  if (match.sport === 'KABADDI') {
    const raids = (db.kabaddi_raids || []).filter((r) => r.matchId === matchId && !r.isUndone);
    const timeouts = (db.kabaddi_timeouts || []).filter((t) => t.matchId === matchId);
    const substitutions = (db.kabaddi_substitutions || []).filter((s) => s.matchId === matchId);

    const reportOptions: KabaddiReportOptions = {
      isFinalized: overrideOptions.isFinalized ?? savedReport?.isFinalized ?? false,
      finalizedAt: overrideOptions.finalizedAt ?? savedReport?.finalizedAt,
      finalizedBy: overrideOptions.finalizedBy ?? savedReport?.finalizedBy,
      manOfTheMatchId: overrideOptions.manOfTheMatchId ?? savedAwards?.manOfTheMatchId ?? savedAwards?.playerOfTheMatchId,
      manOfTheMatchReason: overrideOptions.manOfTheMatchReason ?? savedAwards?.manOfTheMatchReason ?? savedAwards?.playerOfTheMatchReason,
      bestRaiderId: overrideOptions.bestRaiderId ?? savedAwards?.bestRaiderId,
      bestDefenderId: overrideOptions.bestDefenderId ?? savedAwards?.bestDefenderId,
      bestAllRounderId: overrideOptions.bestAllRounderId ?? savedAwards?.bestAllRounderId,
    };

    return calculateKabaddiMatchReport(
      match,
      raids,
      timeouts,
      substitutions,
      players,
      teams,
      tournaments,
      groups,
      reportOptions
    );
  }

  if (match.sport === 'HOCKEY') {
    const events = (db.hockey_scoring_events || []).filter((e) => e.matchId === matchId && !e.isUndone);
    const clockState = (db.hockey_clock_states || []).find((c) => c.matchId === matchId);

    const savedAwardsForHockey = savedAwards
      ? {
          isFinalized: overrideOptions.isFinalized ?? savedReport?.isFinalized ?? false,
          finalizedAt: overrideOptions.finalizedAt ?? savedReport?.finalizedAt,
          finalizedBy: overrideOptions.finalizedBy ?? savedReport?.finalizedBy,
          selectedPlayerOfMatch:
            overrideOptions.playerOfTheMatchId || savedAwards.playerOfTheMatchId || savedAwards.manOfTheMatchId
              ? {
                  playerId: overrideOptions.playerOfTheMatchId || savedAwards.playerOfTheMatchId || savedAwards.manOfTheMatchId,
                  name: players.find((p) => p.id === (overrideOptions.playerOfTheMatchId || savedAwards.playerOfTheMatchId || savedAwards.manOfTheMatchId))?.name || 'Player',
                  details: overrideOptions.playerOfTheMatchReason || savedAwards.playerOfTheMatchReason || savedAwards.manOfTheMatchReason || 'Player of the Match',
                }
              : undefined,
          selectedBestForward:
            overrideOptions.bestForwardId || savedAwards.bestForwardId || savedAwards.bestAttackerId || savedAwards.bestBatterId
              ? {
                  playerId: overrideOptions.bestForwardId || savedAwards.bestForwardId || savedAwards.bestAttackerId || savedAwards.bestBatterId,
                  name: players.find((p) => p.id === (overrideOptions.bestForwardId || savedAwards.bestForwardId || savedAwards.bestAttackerId || savedAwards.bestBatterId))?.name || 'Player',
                  details: 'Best Forward Award',
                }
              : undefined,
          selectedBestGoalkeeper:
            overrideOptions.bestGoalkeeperId || savedAwards.bestGoalkeeperId || savedAwards.bestDefenderId || savedAwards.bestBowlerId
              ? {
                  playerId: overrideOptions.bestGoalkeeperId || savedAwards.bestGoalkeeperId || savedAwards.bestDefenderId || savedAwards.bestBowlerId,
                  name: players.find((p) => p.id === (overrideOptions.bestGoalkeeperId || savedAwards.bestGoalkeeperId || savedAwards.bestDefenderId || savedAwards.bestBowlerId))?.name || 'Goalkeeper',
                  details: 'Best Goalkeeper Award',
                }
              : undefined,
        }
      : undefined;

    return generateHockeyMatchReport(
      match,
      events,
      clockState,
      players,
      savedAwardsForHockey
    );
  }

  if (match.sport === 'FOOTBALL') {
    const events = (db.football_scoring_events || []).filter((e: any) => e.matchId === matchId && !e.isUndone);
    const clockState = (db.football_clock_states || []).find((c: any) => c.matchId === matchId);
    const savedAwardsList = (db.match_awards || []).filter((a: any) => a.matchId === matchId);

    const tournament = tournaments.find((t) => t.id === match.tournamentId);
    const group = groups.find((g) => g.id === match.groupId);
    const teamA = teams.find((t) => t.id === match.teamAId);
    const teamB = teams.find((t) => t.id === match.teamBId);

    return calculateFootballMatchReport(
      match,
      events,
      clockState,
      players,
      tournament,
      group,
      teamA,
      teamB,
      savedAwardsList
    );
  }

  if (match.sport === 'BASKETBALL') {
    const events = (db.basketball_scoring_events || []).filter((e: any) => e.matchId === matchId && !e.isUndone);
    const clockState = (db.basketball_clock_states || []).find((c: any) => c.matchId === matchId);
    const savedAwardsList = (db.match_awards || []).filter((a: any) => a.matchId === matchId);

    const tournament = tournaments.find((t) => t.id === match.tournamentId);
    const group = groups.find((g) => g.id === match.groupId);
    const teamA = teams.find((t) => t.id === match.teamAId);
    const teamB = teams.find((t) => t.id === match.teamBId);

    return calculateBasketballMatchReport(
      match,
      events,
      clockState,
      players,
      tournament,
      group,
      teamA,
      teamB,
      savedAwardsList
    );
  }

  if (match.sport === 'TENNIS') {
    const events = (db.tennis_scoring_events || []).filter((e: any) => e.matchId === matchId && !e.isUndone);
    const savedAwardsList = (db.match_awards || []).filter((a: any) => a.matchId === matchId);

    const tournament = tournaments.find((t) => t.id === match.tournamentId);
    const group = groups.find((g) => g.id === match.groupId);
    const teamA = teams.find((t) => t.id === match.teamAId);
    const teamB = teams.find((t) => t.id === match.teamBId);

    return calculateTennisMatchReport(
      match,
      events,
      players,
      tournament,
      group,
      teamA,
      teamB,
      savedAwardsList
    );
  }

  if (match.sport === 'BADMINTON') {
    const events = (db.badminton_scoring_events || []).filter((e: any) => e.matchId === matchId && !e.isUndone);
    const savedAwardsList = (db.match_awards || []).filter((a: any) => a.matchId === matchId);

    const tournament = tournaments.find((t) => t.id === match.tournamentId);
    const group = groups.find((g) => g.id === match.groupId);
    const teamA = teams.find((t) => t.id === match.teamAId);
    const teamB = teams.find((t) => t.id === match.teamBId);

    return calculateBadmintonMatchReport(
      match,
      events,
      players,
      tournament,
      group,
      teamA,
      teamB,
      savedAwardsList,
      savedReport ? {
        isFinalized: savedReport.isFinalized,
        finalizedAt: savedReport.finalizedAt,
        finalizedBy: savedReport.finalizedBy,
      } : undefined
    );
  }

  if (match.sport === 'TABLE_TENNIS') {
    const events = (db.table_tennis_scoring_events || []).filter((e: any) => e.matchId === matchId && !e.isUndone);
    const savedAwardsList = (db.match_awards || []).filter((a: any) => a.matchId === matchId);

    const tournament = tournaments.find((t) => t.id === match.tournamentId);
    const group = groups.find((g) => g.id === match.groupId);
    const teamA = teams.find((t) => t.id === match.teamAId);
    const teamB = teams.find((t) => t.id === match.teamBId);

    return calculateTableTennisMatchReport(
      match,
      events,
      players,
      tournament,
      group,
      teamA,
      teamB,
      savedAwardsList,
      savedReport ? {
        isFinalized: savedReport.isFinalized,
        finalizedAt: savedReport.finalizedAt,
        finalizedBy: savedReport.finalizedBy,
      } : undefined
    );
  }

  if (
    match.sport === 'CUSTOM' ||
    match.sport === 'OTHER' ||
    match.sport === 'PICKLEBALL' ||
    match.sport === 'HANDBALL' ||
    match.sport === 'SQUASH' ||
    Boolean(match.customSportId) ||
    Boolean(match.customSportConfig && typeof match.customSportConfig === 'object' && (match.customSportConfig as any).scoringEvents)
  ) {
    const events = (db.custom_scoring_events || []).filter((e: any) => e.matchId === matchId && !e.isUndone);
    const clockState = (db.custom_clock_states || []).find((c: any) => c.matchId === matchId);
    const timeouts = (db.custom_timeouts || []).filter((t: any) => t.matchId === matchId);
    const substitutions = (db.custom_substitutions || []).filter((s: any) => s.matchId === matchId);
    const savedAwardsList = (db.match_awards || []).filter((a: any) => a.matchId === matchId);

    return calculateCustomSportMatchReport(
      match,
      events,
      db.custom_sports || [],
      clockState,
      timeouts,
      substitutions,
      players,
      teams,
      tournaments,
      groups,
      savedAwardsList,
      {
        isFinalized: overrideOptions.isFinalized ?? savedReport?.isFinalized ?? false,
        finalizedAt: overrideOptions.finalizedAt ?? savedReport?.finalizedAt,
        finalizedBy: overrideOptions.finalizedBy ?? savedReport?.finalizedBy,
        playerOfTheMatchId: overrideOptions.playerOfTheMatchId ?? savedAwards?.playerOfTheMatchId ?? savedAwards?.manOfTheMatchId,
        playerOfTheMatchReason: overrideOptions.playerOfTheMatchReason ?? savedAwards?.playerOfTheMatchReason ?? savedAwards?.manOfTheMatchReason,
        customAwardsOverrides: overrideOptions.customAwardsOverrides || savedAwards?.customAwards,
      }
    );
  }

  // Cricket
  const inningsList = (db.match_innings || []).filter((i) => i.matchId === matchId);
  const events = (db.scoring_events || []).filter((e) => e.matchId === matchId);

  const savedMeta = {
    isFinalized: overrideOptions.isFinalized ?? savedReport?.isFinalized ?? false,
    finalizedAt: overrideOptions.finalizedAt ?? savedReport?.finalizedAt,
    finalizedBy: overrideOptions.finalizedBy ?? savedReport?.finalizedBy,
    manOfTheMatchId: overrideOptions.manOfTheMatchId ?? savedAwards?.manOfTheMatchId,
    manOfTheMatchReason: overrideOptions.manOfTheMatchReason ?? savedAwards?.manOfTheMatchReason,
    bestBatterId: overrideOptions.bestBatterId ?? savedAwards?.bestBatterId,
    bestBowlerId: overrideOptions.bestBowlerId ?? savedAwards?.bestBowlerId,
  };

  return calculateFullMatchReport(
    match,
    inningsList,
    events,
    players,
    teams,
    savedMeta,
    tournaments,
    groups
  );
}

/**
 * GET /api/matches/:id/public-report
 * Get complete calculated Full Match Report for public viewers
 */
router.get('/:id/public-report', (req, res): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches?.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  const tournament = match.tournamentId ? db.tournaments.find((t) => t.id === match.tournamentId) : null;
  const user = getUserFromRequest(req);
  if (tournament && tournament.isPublic !== true && !canUserAccessMatch(user, match, 'VIEW')) {
    res.status(403).json({ error: 'Forbidden: Match report is private.' });
    return;
  }

  const report = getMatchReportData(match, db);
  res.json({ report });
});

/**
 * GET /api/matches/:id/report
 * Get complete calculated Full Match Report
 */
router.get('/:id/report', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches?.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (!canUserAccessMatch(req.user, match, 'VIEW')) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to view reports for this match.' });
    return;
  }

  const report = getMatchReportData(match, db);

  // Optional audit log for viewing
  if (req.user) {
    const auditLog: AuditLog = {
      id: crypto.randomUUID(),
      userId: req.user.id,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'REPORT_VIEWED',
      details: `Viewed Full Match Report for match "${match.name}".`,
      timestamp: new Date().toISOString(),
    };
    db.audit_logs.unshift(auditLog);
    saveDatabase();
  }

  res.json({ report });
});

/**
 * Save / Update Match Awards (All Sports including Badminton)
 */
const handleAwardsUpdate = (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches?.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (!canUserAccessMatch(req.user, match, 'SCORING')) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to update awards for this match.' });
    return;
  }

  if (!db.match_awards) db.match_awards = [];

  const {
    manOfTheMatchId,
    manOfTheMatchReason,
    bestBatterId,
    bestBowlerId,
    playerOfTheMatchId,
    playerOfTheMatchReason,
    bestAttackerId,
    bestAttackerReason,
    bestServerId,
    bestServerReason,
    bestBlockerId,
    bestDefenderId,
    bestDefenderReason,
    bestReturnerId,
    bestReturnerReason,
    bestPerformerId,
    bestPerformerReason,
    bestRaiderId,
    bestAllRounderId,
    bestForwardId,
    bestGoalkeeperId,
    bestScorerId,
    bestRebounderId,
    bestPlaymakerId,
    bestThreePointShooterId,
    bestDoublesPlayerId,
    bestDoublesPlayerReason,
    mostAcesId,
    mostAcesReason,
    mostWinnersId,
    mostWinnersReason,
    mostConsistentId,
    mostConsistentReason,
  } = req.body;

  let savedAward = db.match_awards.find((a) => a.matchId === matchId);
  if (!savedAward) {
    savedAward = {
      id: crypto.randomUUID(),
      matchId,
      manOfTheMatchId: manOfTheMatchId || playerOfTheMatchId,
      manOfTheMatchReason: manOfTheMatchReason || playerOfTheMatchReason,
      bestBatterId,
      bestBowlerId,
      playerOfTheMatchId: playerOfTheMatchId || manOfTheMatchId,
      playerOfTheMatchReason: playerOfTheMatchReason || manOfTheMatchReason,
      bestAttackerId,
      bestAttackerReason,
      bestServerId,
      bestServerReason,
      bestBlockerId,
      bestDefenderId,
      bestDefenderReason,
      bestReturnerId,
      bestReturnerReason,
      bestPerformerId,
      bestPerformerReason,
      bestRaiderId,
      bestAllRounderId,
      bestForwardId,
      bestGoalkeeperId,
      bestScorerId,
      bestRebounderId,
      bestPlaymakerId,
      bestThreePointShooterId,
      bestDoublesPlayerId,
      bestDoublesPlayerReason,
      mostAcesId,
      mostAcesReason,
      mostWinnersId,
      mostWinnersReason,
      mostConsistentId,
      mostConsistentReason,
      updatedAt: new Date().toISOString(),
    };
    db.match_awards.push(savedAward);
  } else {
    if (manOfTheMatchId !== undefined) savedAward.manOfTheMatchId = manOfTheMatchId;
    if (manOfTheMatchReason !== undefined) savedAward.manOfTheMatchReason = manOfTheMatchReason;
    if (playerOfTheMatchId !== undefined) savedAward.playerOfTheMatchId = playerOfTheMatchId;
    if (playerOfTheMatchReason !== undefined) savedAward.playerOfTheMatchReason = playerOfTheMatchReason;
    if (bestBatterId !== undefined) savedAward.bestBatterId = bestBatterId;
    if (bestBowlerId !== undefined) savedAward.bestBowlerId = bestBowlerId;
    if (bestAttackerId !== undefined) savedAward.bestAttackerId = bestAttackerId;
    if (bestAttackerReason !== undefined) savedAward.bestAttackerReason = bestAttackerReason;
    if (bestServerId !== undefined) savedAward.bestServerId = bestServerId;
    if (bestServerReason !== undefined) savedAward.bestServerReason = bestServerReason;
    if (bestBlockerId !== undefined) savedAward.bestBlockerId = bestBlockerId;
    if (bestDefenderId !== undefined) savedAward.bestDefenderId = bestDefenderId;
    if (bestDefenderReason !== undefined) savedAward.bestDefenderReason = bestDefenderReason;
    if (bestReturnerId !== undefined) savedAward.bestReturnerId = bestReturnerId;
    if (bestReturnerReason !== undefined) savedAward.bestReturnerReason = bestReturnerReason;
    if (bestPerformerId !== undefined) savedAward.bestPerformerId = bestPerformerId;
    if (bestPerformerReason !== undefined) savedAward.bestPerformerReason = bestPerformerReason;
    if (bestRaiderId !== undefined) savedAward.bestRaiderId = bestRaiderId;
    if (bestAllRounderId !== undefined) savedAward.bestAllRounderId = bestAllRounderId;
    if (bestForwardId !== undefined) savedAward.bestForwardId = bestForwardId;
    if (bestGoalkeeperId !== undefined) savedAward.bestGoalkeeperId = bestGoalkeeperId;
    if (bestScorerId !== undefined) savedAward.bestScorerId = bestScorerId;
    if (bestRebounderId !== undefined) savedAward.bestRebounderId = bestRebounderId;
    if (bestPlaymakerId !== undefined) savedAward.bestPlaymakerId = bestPlaymakerId;
    if (bestThreePointShooterId !== undefined) savedAward.bestThreePointShooterId = bestThreePointShooterId;
    if (bestDoublesPlayerId !== undefined) savedAward.bestDoublesPlayerId = bestDoublesPlayerId;
    if (bestDoublesPlayerReason !== undefined) savedAward.bestDoublesPlayerReason = bestDoublesPlayerReason;
    if (mostAcesId !== undefined) savedAward.mostAcesId = mostAcesId;
    if (mostAcesReason !== undefined) savedAward.mostAcesReason = mostAcesReason;
    if (mostWinnersId !== undefined) savedAward.mostWinnersId = mostWinnersId;
    if (mostWinnersReason !== undefined) savedAward.mostWinnersReason = mostWinnersReason;
    if (mostConsistentId !== undefined) savedAward.mostConsistentId = mostConsistentId;
    if (mostConsistentReason !== undefined) savedAward.mostConsistentReason = mostConsistentReason;
    savedAward.updatedAt = new Date().toISOString();
  }

  // Audit log
  const auditLog: AuditLog = {
    id: crypto.randomUUID(),
    userId: req.user?.id,
    userName: req.user?.name,
    userEmail: req.user?.email,
    action: 'MATCH_AWARDS_UPDATED',
    details: `Updated Match Awards for match "${match.name}".`,
    timestamp: new Date().toISOString(),
  };
  db.audit_logs.unshift(auditLog);

  saveDatabase();

  const report = getMatchReportData(match, db);
  res.json({ message: 'Match awards updated successfully.', report });
};

router.put('/:id/report/awards', requireAuth, handleAwardsUpdate);
router.post('/:id/report/awards', requireAuth, handleAwardsUpdate);
router.post('/:id/awards', requireAuth, handleAwardsUpdate);

/**
 * POST /api/matches/:id/report/finalize
 * Finalize match report after consistency checks
 */
router.post('/:id/report/finalize', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches?.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (!canUserAccessMatch(req.user, match, 'MANAGE')) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to finalize this match report.' });
    return;
  }

  if (!db.match_reports) db.match_reports = [];

  let reportMeta = db.match_reports.find((r) => r.matchId === matchId);
  if (!reportMeta) {
    reportMeta = {
      id: crypto.randomUUID(),
      matchId,
      isFinalized: true,
      finalizedAt: new Date().toISOString(),
      finalizedBy: req.user?.name || 'Admin',
    };
    db.match_reports.push(reportMeta);
  } else {
    reportMeta.isFinalized = true;
    reportMeta.finalizedAt = new Date().toISOString();
    reportMeta.finalizedBy = req.user?.name || 'Admin';
  }

  match.status = 'COMPLETED';

  const auditLog: AuditLog = {
    id: crypto.randomUUID(),
    userId: req.user?.id,
    userName: req.user?.name,
    userEmail: req.user?.email,
    action: 'REPORT_FINALIZED',
    details: `Finalized Full Match Report for match "${match.name}".`,
    timestamp: new Date().toISOString(),
  };
  db.audit_logs.unshift(auditLog);

  saveDatabase();

  const report = getMatchReportData(match, db);
  res.json({ message: 'Match report finalized successfully.', report });
});

/**
 * POST /api/matches/:id/report/reopen
 * Reopen finalized match report for corrections
 */
router.post('/:id/report/reopen', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches?.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (!canUserAccessMatch(req.user, match, 'MANAGE')) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to reopen this match report.' });
    return;
  }

  if (!db.match_reports) db.match_reports = [];

  const reportMeta = db.match_reports.find((r) => r.matchId === matchId);
  if (reportMeta) {
    reportMeta.isFinalized = false;
  }

  const auditLog: AuditLog = {
    id: crypto.randomUUID(),
    userId: req.user?.id,
    userName: req.user?.name,
    userEmail: req.user?.email,
    action: 'REPORT_REOPENED',
    details: `Reopened finalized Full Match Report for match "${match.name}".`,
    timestamp: new Date().toISOString(),
  };
  db.audit_logs.unshift(auditLog);

  saveDatabase();

  const report = getMatchReportData(match, db);
  res.json({ message: 'Match report reopened for editing.', report });
});

/**
 * GET /api/matches/:id/report/broadcast-data
 * Expose structured match summary & award statistics for Broadcast Graphics Engine
 */
router.get('/:id/report/broadcast-data', (req, res): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches?.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  const report: any = getMatchReportData(match, db);

  res.json({
    matchId: match.id,
    sport: match.sport,
    status: match.status,
    resultText: report.matchResultText,
    winnerName: report.summaryCards?.winnerName,
    teamAScore: report.summaryCards?.teamAScore || report.summaryCards?.teamASets,
    teamBScore: report.summaryCards?.teamBScore || report.summaryCards?.teamBSets,
    manOfMatch: report.selectedManOfMatch || report.selectedPlayerOfMatch,
    bestBatter: report.selectedBestBatter || report.selectedBestAttacker,
    bestBowler: report.selectedBestBowler || report.selectedBestBlocker,
    highestScore: report.summaryCards?.highestScoreText || report.summaryCards?.highestScorerText,
    bestBowling: report.summaryCards?.bestBowlingText || report.summaryCards?.bestBlockerText,
  });
});

export default router;
