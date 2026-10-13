import { Router, Response } from 'express';
import crypto from 'crypto';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { isAuthorizedForTournament, canManagePlayers, getUserFromRequest, isUserAdmin } from '../middleware/accessControl';
import { getDb, saveDatabase } from '../db/database';
import { addAuditLog } from '../utils/logger';
import { Player } from '../../src/types';

const router = Router();

/**
 * GET /api/players
 * List players with search and filters
 */
router.get('/', (req, res): void => {
  const db = getDb();
  let list = [...db.players];

  const teamId = req.query.teamId as string;
  const tournamentId = req.query.tournamentId as string;
  const role = req.query.role as string;
  const status = req.query.status as string;
  const search = (req.query.search as string || '').toLowerCase().trim();
  const user = getUserFromRequest(req);

  if (tournamentId) {
    const tournament = db.tournaments.find((t) => t.id === tournamentId);
    if (tournament && tournament.isPublic !== true && !isAuthorizedForTournament(tournament, user, 'VIEW')) {
      res.status(403).json({ error: 'Forbidden: You do not have permission to view players in this tournament.' });
      return;
    }
    list = list.filter((p) => p.tournamentId === tournamentId);
  } else if (teamId) {
    const team = db.teams.find((t) => t.id === teamId);
    const tournament = team ? db.tournaments.find((t) => t.id === team.tournamentId) : null;
    if (tournament && tournament.isPublic !== true && !isAuthorizedForTournament(tournament, user, 'VIEW')) {
      res.status(403).json({ error: 'Forbidden: You do not have permission to view players in this team.' });
      return;
    }
    list = list.filter((p) => p.teamId === teamId);
  } else if (user && !isUserAdmin(user)) {
    list = list.filter((p) => {
      const tournId = p.tournamentId || db.teams.find((t) => t.id === p.teamId)?.tournamentId;
      const tourn = tournId ? db.tournaments.find((t) => t.id === tournId) : null;
      return !tourn || tourn.isPublic === true || isAuthorizedForTournament(tourn, user, 'VIEW');
    });
  }

  if (role) {
    list = list.filter((p) => p.role === role);
  }

  if (status) {
    list = list.filter((p) => p.status === status);
  }

  if (search) {
    list = list.filter(
      (p) =>
        p.name?.toLowerCase().includes(search) ||
        p.displayName?.toLowerCase().includes(search) ||
        p.jerseyNumber?.toString().includes(search) ||
        p.playerId?.toLowerCase().includes(search) ||
        p.role?.toLowerCase().includes(search)
    );
  }

  res.json({ players: list });
});

/**
 * GET /api/players/:id
 * Get player details
 */
router.get('/:id', (req, res): void => {
  const db = getDb();
  const player = db.players.find((p) => p.id === req.params.id);

  if (!player) {
    res.status(404).json({ error: 'Player not found' });
    return;
  }

  const team = player.teamId ? db.teams.find((t) => t.id === player.teamId) : null;
  const tournament = player.tournamentId
    ? db.tournaments.find((t) => t.id === player.tournamentId)
    : team
    ? db.tournaments.find((t) => t.id === team.tournamentId)
    : null;

  const user = getUserFromRequest(req);
  if (tournament && tournament.isPublic !== true && !isAuthorizedForTournament(tournament, user, 'VIEW')) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to view this player.' });
    return;
  }

  res.json({
    player,
    team,
    tournament,
  });
});

/**
 * POST /api/players
 * Add player to team
 */
router.post('/', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const {
    teamId,
    tournamentId,
    groupId,
    name,
    displayName,
    photoUrl,
    jerseyNumber,
    playerId,
    dob,
    role,
    battingStyle,
    bowlingStyle,
    bowlingType,
    playingPosition,
    isCaptain,
    isViceCaptain,
    height,
    weight,
    countryState,
    contact,
    bio,
    status,
    records,
  } = req.body;

  let team: any = null;
  if (teamId && typeof teamId === 'string' && teamId.trim()) {
    team = db.teams.find((t) => t.id === teamId);
    if (!team) {
      res.status(404).json({ error: 'Target Team does not exist.' });
      return;
    }
  }

  const resolvedTournamentId = tournamentId || team?.tournamentId;
  if (!resolvedTournamentId) {
    if (!isUserAdmin(req.user)) {
      res.status(400).json({ error: 'A valid tournament ID or team ID is required to create a player.' });
      return;
    }
  } else if (!canManagePlayers(req.user, resolvedTournamentId)) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to add players to this tournament.' });
    return;
  }

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'Player Name is required.' });
    return;
  }

  const resolvedGroupId = groupId || team?.groupId;

  const newPlayer: Player = {
    id: crypto.randomUUID(),
    teamId: teamId || '',
    tournamentId: resolvedTournamentId,
    groupId: resolvedGroupId,
    name: name.trim(),
    displayName: displayName?.trim() || name.trim(),
    photoUrl: photoUrl || '',
    jerseyNumber: jerseyNumber !== undefined && jerseyNumber !== '' ? jerseyNumber : '',
    playerId: playerId?.trim() || '',
    dob: dob || '',
    role: role?.trim() || 'Player',
    battingStyle: battingStyle?.trim() || '',
    bowlingStyle: bowlingStyle?.trim() || '',
    bowlingType: bowlingType?.trim() || '',
    playingPosition: playingPosition?.trim() || '',
    isCaptain: Boolean(isCaptain),
    isViceCaptain: Boolean(isViceCaptain),
    height: height?.trim() || '',
    weight: weight?.trim() || '',
    countryState: countryState?.trim() || '',
    contact: contact?.trim() || '',
    bio: bio?.trim() || '',
    status: status || 'ACTIVE',
    records: records || {},
    createdByUserId: req.user?.id,
    createdByUserEmail: req.user?.email,
    ownerUserId: req.user?.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // If set as captain or vice captain, update team string if blank
  if (team) {
    if (newPlayer.isCaptain && !team.captain) {
      team.captain = newPlayer.name;
    }
    if (newPlayer.isViceCaptain && !team.viceCaptain) {
      team.viceCaptain = newPlayer.name;
    }
  }

  db.players.push(newPlayer);
  saveDatabase();

  addAuditLog(
    'PLAYER_CREATE',
    `Added player "${newPlayer.name}" (${newPlayer.role}) to Team "${team?.name || 'Player Roster'}"`,
    req.user,
    req.ip
  );

  res.status(201).json({
    message: 'Player saved successfully.',
    player: newPlayer,
  });
});

/**
 * PUT / PATCH /api/players/:id
 * Update player record (prevents duplicates)
 */
const handlePlayerUpdate = (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const index = db.players.findIndex((p) => p.id === req.params.id);

  if (index === -1) {
    res.status(404).json({ error: 'Player not found.' });
    return;
  }

  const existing = db.players[index];
  const tournId = existing.tournamentId || db.teams.find((t) => t.id === existing.teamId)?.tournamentId;
  if (!tournId && !isUserAdmin(req.user)) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to modify this player.' });
    return;
  }
  if (tournId && !canManagePlayers(req.user, tournId)) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to modify this player.' });
    return;
  }
  if (req.body.tournamentId && req.body.tournamentId !== tournId && !canManagePlayers(req.user, req.body.tournamentId)) {
    res.status(403).json({ error: 'Forbidden: You cannot transfer player to a tournament you do not manage.' });
    return;
  }

  const {
    teamId,
    tournamentId,
    groupId,
    name,
    displayName,
    photoUrl,
    jerseyNumber,
    playerId,
    dob,
    role,
    battingStyle,
    bowlingStyle,
    bowlingType,
    playingPosition,
    isCaptain,
    isViceCaptain,
    height,
    weight,
    countryState,
    contact,
    bio,
    status,
    records,
  } = req.body;

  if (name !== undefined) {
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Player Name cannot be empty.' });
      return;
    }
    existing.name = name.trim();
  }

  if (teamId !== undefined) existing.teamId = teamId;
  if (tournamentId !== undefined) existing.tournamentId = tournamentId;
  if (groupId !== undefined) existing.groupId = groupId;
  if (displayName !== undefined) existing.displayName = displayName.trim();
  if (photoUrl !== undefined) existing.photoUrl = photoUrl;
  if (jerseyNumber !== undefined) existing.jerseyNumber = jerseyNumber;
  if (playerId !== undefined) existing.playerId = playerId.trim();
  if (dob !== undefined) existing.dob = dob;
  if (role !== undefined) existing.role = role.trim();
  if (battingStyle !== undefined) existing.battingStyle = battingStyle.trim();
  if (bowlingStyle !== undefined) existing.bowlingStyle = bowlingStyle.trim();
  if (bowlingType !== undefined) existing.bowlingType = bowlingType.trim();
  if (playingPosition !== undefined) existing.playingPosition = playingPosition.trim();
  if (isCaptain !== undefined) existing.isCaptain = Boolean(isCaptain);
  if (isViceCaptain !== undefined) existing.isViceCaptain = Boolean(isViceCaptain);
  if (height !== undefined) existing.height = height.trim();
  if (weight !== undefined) existing.weight = weight.trim();
  if (countryState !== undefined) existing.countryState = countryState.trim();
  if (contact !== undefined) existing.contact = contact.trim();
  if (bio !== undefined) existing.bio = bio.trim();
  if (status !== undefined) existing.status = status;
  if (records !== undefined) existing.records = records;

  existing.updatedAt = new Date().toISOString();
  db.players[index] = existing;
  saveDatabase();

  addAuditLog('PLAYER_UPDATE', `Updated player "${existing.name}" (ID: ${existing.id})`, req.user, req.ip);

  res.json({
    message: 'Player updated successfully.',
    player: existing,
  });
};

router.put('/:id', requireAuth, handlePlayerUpdate);
router.patch('/:id', requireAuth, handlePlayerUpdate);

/**
 * DELETE /api/players/:id
 * Delete player safely
 */
router.delete('/:id', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const id = req.params.id;
  const index = db.players.findIndex((p) => p.id === id);

  if (index === -1) {
    res.status(404).json({ error: 'Player not found.' });
    return;
  }

  const player = db.players[index];
  const tournId = player.tournamentId || db.teams.find((t) => t.id === player.teamId)?.tournamentId;
  if (!tournId && !isUserAdmin(req.user)) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to delete this player.' });
    return;
  }
  if (tournId && !canManagePlayers(req.user, tournId)) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to delete this player.' });
    return;
  }

  const playerName = db.players[index].name;

  db.players.splice(index, 1);
  saveDatabase();

  addAuditLog('PLAYER_DELETE', `Deleted player "${playerName}" (ID: ${id})`, req.user, req.ip);

  res.json({ message: 'Player deleted successfully.' });
});

export default router;
