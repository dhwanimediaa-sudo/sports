import { Router, Response } from 'express';
import crypto from 'crypto';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { isAuthorizedForTournament, canManageTeams, canViewTournament, getUserFromRequest, isUserAdmin } from '../middleware/accessControl';
import { getDb, saveDatabase } from '../db/database';
import { addAuditLog } from '../utils/logger';
import { Team, Player, ScannedPlayerItem, TeamSheetImportPayload } from '../../src/types';
import { processTeamSheetImage, SAMPLE_TEAM_SHEETS } from '../services/teamSheetOcr';

const router = Router();

/**
 * GET /api/teams/sample-team-sheets
 * Get pre-configured team sheet templates for quick testing
 */
router.get('/sample-team-sheets', (req, res): void => {
  res.json({ samples: SAMPLE_TEAM_SHEETS });
});

/**
 * POST /api/teams/scan-team-sheet
 * OCR Image Scanning & Structure Extraction
 */
router.post('/scan-team-sheet', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { imageBase64, mimeType, sportHint, sampleId, tournamentId, teamId } = req.body;

    const db = getDb();

    // Verify tournament or team authorization
    if (tournamentId) {
      if (!canManageTeams(req.user, tournamentId)) {
        res.status(403).json({ error: 'Forbidden: You do not have permission to scan team sheets for this tournament.' });
        return;
      }
    } else if (teamId) {
      const team = db.teams.find((t) => t.id === teamId);
      if (team) {
        if (!canManageTeams(req.user, team.tournamentId)) {
          res.status(403).json({ error: 'Forbidden: You do not have permission to scan team sheets for this team.' });
          return;
        }
      }
    }

    if (!imageBase64 && !sampleId) {
      res.status(400).json({ error: 'Image data (Base64) or sampleId is required.' });
      return;
    }

    const scanResult = await processTeamSheetImage(imageBase64 || '', mimeType || 'image/jpeg', {
      sportHint,
      sampleId,
    });

    // Check for potential conflicts / duplicate jersey numbers against existing squad
    const existingPlayers = teamId
      ? db.players.filter((p) => p.teamId === teamId)
      : tournamentId
      ? db.players.filter((p) => p.tournamentId === tournamentId)
      : [];

    const existingJerseyMap = new Map<string, Player>();
    const existingNameMap = new Map<string, Player>();

    existingPlayers.forEach((p) => {
      if (p.jerseyNumber !== undefined && p.jerseyNumber !== '') {
        existingJerseyMap.set(String(p.jerseyNumber), p);
      }
      if (p.name) {
        existingNameMap.set(p.name.toLowerCase().trim(), p);
      }
    });

    // Annotate extracted players with conflict flags
    const annotatedPlayers: ScannedPlayerItem[] = scanResult.players.map((p) => {
      const jerseyStr = String(p.jerseyNumber || '');
      const nameKey = p.name.toLowerCase().trim();

      if (jerseyStr && existingJerseyMap.has(jerseyStr)) {
        const conflict = existingJerseyMap.get(jerseyStr)!;
        return {
          ...p,
          conflictType: 'DUPLICATE_JERSEY',
          conflictDetails: `Jersey #${jerseyStr} already used by "${conflict.name}" in squad`,
        };
      }

      if (existingNameMap.has(nameKey)) {
        return {
          ...p,
          conflictType: 'EXISTING_PLAYER',
          conflictDetails: `Player "${p.name}" is already registered in team roster`,
        };
      }

      return {
        ...p,
        conflictType: 'NONE',
      };
    });

    scanResult.players = annotatedPlayers;

    res.json({
      ...scanResult,
      existingSquadCount: existingPlayers.length,
    });
  } catch (err: any) {
    console.error('Error scanning team sheet:', err);
    res.status(500).json({ error: err.message || 'Failed to scan team sheet image.' });
  }
});

/**
 * POST /api/teams/import-team-sheet
 * Confirm & Batch Save Scanned Team Information & Player Roster
 */
router.post('/import-team-sheet', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const payload: TeamSheetImportPayload = req.body;
    const { tournamentId, groupId, teamId, createNewTeam, teamData, players, updateExistingPlayers } = payload;

    if (!tournamentId) {
      res.status(400).json({ error: 'Tournament ID is required for team import.' });
      return;
    }

    const tournament = db.tournaments.find((t) => t.id === tournamentId);
    if (!tournament) {
      res.status(404).json({ error: 'Target Tournament does not exist.' });
      return;
    }

    if (!canManageTeams(req.user, tournamentId)) {
      res.status(403).json({ error: 'Forbidden: You do not have permission to import teams into this tournament.' });
      return;
    }

    let targetTeam: Team;

    if (createNewTeam || !teamId) {
      if (!teamData?.name || !teamData.name.trim()) {
        res.status(400).json({ error: 'Team Name is required for creating a new team.' });
        return;
      }

      const generatedShortName =
        teamData.shortName?.trim() ||
        teamData.name
          .trim()
          .split(' ')
          .map((word) => word.charAt(0))
          .join('')
          .substring(0, 4)
          .toUpperCase();

      targetTeam = {
        id: crypto.randomUUID(),
        tournamentId,
        groupId: groupId || teamData.groupId || undefined,
        name: teamData.name.trim(),
        shortName: generatedShortName,
        code: teamData.code?.trim() || generatedShortName,
        logoUrl: teamData.logoUrl || '',
        photoUrl: teamData.photoUrl || '',
        manager: teamData.manager?.trim() || '',
        captain: teamData.captain?.trim() || '',
        viceCaptain: teamData.viceCaptain?.trim() || '',
        homeLocation: teamData.homeLocation?.trim() || '',
        contact: teamData.contact?.trim() || '',
        description: teamData.description?.trim() || 'Imported via Team Sheet Scan',
        teamColor: teamData.teamColor || '#10b981',
        status: (teamData.status as any) || 'ACTIVE',
        createdByUserId: req.user?.id,
        createdByUserEmail: req.user?.email,
        ownerUserId: req.user?.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      db.teams.push(targetTeam);
      addAuditLog(
        'TEAM_CREATE',
        `Created Team "${targetTeam.name}" (${targetTeam.shortName}) via Team Sheet Auto Import`,
        req.user,
        req.ip
      );
    } else {
      const existingTeamIndex = db.teams.findIndex((t) => t.id === teamId);
      if (existingTeamIndex === -1) {
        res.status(404).json({ error: 'Target team not found.' });
        return;
      }
      targetTeam = db.teams[existingTeamIndex];

      // Optionally update team metadata if provided
      if (teamData) {
        if (teamData.name) targetTeam.name = teamData.name.trim();
        if (teamData.shortName) targetTeam.shortName = teamData.shortName.trim();
        if (teamData.code) targetTeam.code = teamData.code.trim();
        if (teamData.manager) targetTeam.manager = teamData.manager.trim();
        if (teamData.captain) targetTeam.captain = teamData.captain.trim();
        if (teamData.viceCaptain) targetTeam.viceCaptain = teamData.viceCaptain.trim();
        if (teamData.homeLocation) targetTeam.homeLocation = teamData.homeLocation.trim();
        if (teamData.contact) targetTeam.contact = teamData.contact.trim();
        if (teamData.teamColor) targetTeam.teamColor = teamData.teamColor;
        targetTeam.updatedAt = new Date().toISOString();
        db.teams[existingTeamIndex] = targetTeam;
      }
    }

    // Process & Insert/Update Players
    const createdPlayers: Player[] = [];
    let updatedCount = 0;

    for (const playerItem of players || []) {
      if (!playerItem.name || !playerItem.name.trim()) continue;

      const trimmedName = playerItem.name.trim();

      // Check if player already exists in this team
      const existingIndex = db.players.findIndex(
        (p) => p.teamId === targetTeam.id && p.name.toLowerCase().trim() === trimmedName.toLowerCase()
      );

      if (existingIndex !== -1 && updateExistingPlayers) {
        const existing = db.players[existingIndex];
        existing.displayName = playerItem.displayName?.trim() || existing.displayName;
        if (playerItem.jerseyNumber !== undefined && playerItem.jerseyNumber !== '') {
          existing.jerseyNumber = playerItem.jerseyNumber;
        }
        if (playerItem.role) existing.role = playerItem.role.trim();
        if (playerItem.battingStyle) existing.battingStyle = playerItem.battingStyle.trim();
        if (playerItem.bowlingStyle) existing.bowlingStyle = playerItem.bowlingStyle.trim();
        if (playerItem.playingPosition) existing.playingPosition = playerItem.playingPosition.trim();
        if (playerItem.isCaptain !== undefined) existing.isCaptain = Boolean(playerItem.isCaptain);
        if (playerItem.isViceCaptain !== undefined) existing.isViceCaptain = Boolean(playerItem.isViceCaptain);
        existing.updatedAt = new Date().toISOString();
        db.players[existingIndex] = existing;
        createdPlayers.push(existing);
        updatedCount++;
      } else {
        const newPlayer: Player = {
          id: crypto.randomUUID(),
          teamId: targetTeam.id,
          tournamentId: targetTeam.tournamentId,
          groupId: targetTeam.groupId,
          name: trimmedName,
          displayName: playerItem.displayName?.trim() || trimmedName,
          photoUrl: playerItem.photoUrl || '',
          jerseyNumber: playerItem.jerseyNumber !== undefined && playerItem.jerseyNumber !== '' ? playerItem.jerseyNumber : '',
          playerId: `PL-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
          dob: '',
          role: playerItem.role?.trim() || 'Player',
          battingStyle: playerItem.battingStyle?.trim() || '',
          bowlingStyle: playerItem.bowlingStyle?.trim() || '',
          bowlingType: '',
          playingPosition: playerItem.playingPosition?.trim() || '',
          isCaptain: Boolean(playerItem.isCaptain),
          isViceCaptain: Boolean(playerItem.isViceCaptain),
          height: '',
          weight: '',
          countryState: targetTeam.homeLocation || '',
          contact: playerItem.contact?.trim() || '',
          bio: 'Imported from Team Sheet Roster',
          status: 'ACTIVE',
          records: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        db.players.push(newPlayer);
        createdPlayers.push(newPlayer);
      }

      // Sync captain and vice captain names to team if marked
      if (playerItem.isCaptain && !targetTeam.captain) {
        targetTeam.captain = trimmedName;
      }
      if (playerItem.isViceCaptain && !targetTeam.viceCaptain) {
        targetTeam.viceCaptain = trimmedName;
      }
    }

    saveDatabase();

    addAuditLog(
      'TEAM_SCAN_IMPORT',
      `Imported ${createdPlayers.length} players into Team "${targetTeam.name}" (${targetTeam.shortName}) in Tournament "${tournament.name}"`,
      req.user,
      req.ip
    );

    res.status(201).json({
      message: `Successfully imported ${createdPlayers.length} players into ${targetTeam.name}.`,
      team: targetTeam,
      players: createdPlayers,
      importedCount: createdPlayers.length,
      updatedCount,
    });
  } catch (err: any) {
    console.error('Error importing team sheet players:', err);
    res.status(500).json({ error: err.message || 'Failed to import team sheet players.' });
  }
});

/**
 * GET /api/teams
 * List teams with optional filters
 */
router.get('/', (req, res): void => {
  const db = getDb();
  let list = [...db.teams];

  const tournamentId = req.query.tournamentId as string;
  const groupId = req.query.groupId as string;
  const search = (req.query.search as string || '').toLowerCase().trim();
  const status = req.query.status as string;
  const user = getUserFromRequest(req);

  if (tournamentId) {
    const tournament = db.tournaments.find((t) => t.id === tournamentId);
    if (tournament && tournament.isPublic !== true && !isAuthorizedForTournament(tournament, user, 'VIEW')) {
      res.status(403).json({ error: 'Forbidden: You do not have permission to view teams in this tournament.' });
      return;
    }
    list = list.filter((t) => t.tournamentId === tournamentId);
  } else if (user && !isUserAdmin(user)) {
    list = list.filter((t) => {
      const tourn = db.tournaments.find((tr) => tr.id === t.tournamentId);
      return !tourn || tourn.isPublic === true || isAuthorizedForTournament(tourn, user, 'VIEW');
    });
  }

  if (groupId) {
    list = list.filter((t) => t.groupId === groupId);
  }

  if (status) {
    list = list.filter((t) => t.status === status);
  }

  if (search) {
    list = list.filter(
      (t) =>
        t.name?.toLowerCase().includes(search) ||
        t.shortName?.toLowerCase().includes(search) ||
        t.captain?.toLowerCase().includes(search) ||
        t.manager?.toLowerCase().includes(search)
    );
  }

  const result = list.map((t) => {
    const players = db.players.filter((p) => p.teamId === t.id);
    return {
      ...t,
      playerCount: players.length,
    };
  });

  res.json({ teams: result });
});

/**
 * GET /api/teams/:id
 * Get team by ID with player roster
 */
router.get('/:id', (req, res): void => {
  const db = getDb();
  const team = db.teams.find((t) => t.id === req.params.id);

  if (!team) {
    res.status(404).json({ error: 'Team not found' });
    return;
  }

  const user = getUserFromRequest(req);
  const tournament = db.tournaments.find((t) => t.id === team.tournamentId);
  if (tournament && tournament.isPublic !== true && !isAuthorizedForTournament(tournament, user, 'VIEW')) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to view this team.' });
    return;
  }

  const players = db.players.filter((p) => p.teamId === team.id);
  const group = team.groupId ? db.groups.find((g) => g.id === team.groupId) : null;

  res.json({
    team: {
      ...team,
      playerCount: players.length,
    },
    players,
    group,
    tournament,
  });
});

/**
 * POST /api/teams
 * Create new team
 */
router.post('/', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const {
    tournamentId,
    groupId,
    name,
    shortName,
    code,
    logoUrl,
    photoUrl,
    manager,
    captain,
    viceCaptain,
    homeLocation,
    contact,
    description,
    teamColor,
    status,
    players,
  } = req.body;

  if (!tournamentId || typeof tournamentId !== 'string') {
    res.status(400).json({ error: 'Tournament ID is required.' });
    return;
  }

  const tournament = db.tournaments.find((t) => t.id === tournamentId);
  if (!tournament) {
    res.status(404).json({ error: 'Target Tournament does not exist.' });
    return;
  }

  if (!canManageTeams(req.user, tournamentId)) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to create teams in this tournament.' });
    return;
  }

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'Team Name is required.' });
    return;
  }

  const generatedShortName =
    shortName?.trim() ||
    name
      .trim()
      .split(' ')
      .map((word: string) => word.charAt(0))
      .join('')
      .substring(0, 4)
      .toUpperCase();

  const newTeam: Team = {
    id: crypto.randomUUID(),
    tournamentId,
    groupId: groupId || undefined,
    name: name.trim(),
    shortName: generatedShortName,
    code: code?.trim() || generatedShortName,
    logoUrl: logoUrl || '',
    photoUrl: photoUrl || '',
    manager: manager?.trim() || '',
    captain: captain?.trim() || '',
    viceCaptain: viceCaptain?.trim() || '',
    homeLocation: homeLocation?.trim() || '',
    contact: contact?.trim() || '',
    description: description?.trim() || '',
    teamColor: teamColor || '#10b981',
    status: status || 'ACTIVE',
    createdByUserId: req.user?.id,
    createdByUserEmail: req.user?.email,
    ownerUserId: req.user?.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.teams.push(newTeam);

  // Add initial roster players if supplied
  let addedPlayersCount = 0;
  if (Array.isArray(players) && players.length > 0) {
    for (const p of players) {
      if (!p.name || !p.name.trim()) continue;
      const newPlayer: Player = {
        id: p.id || crypto.randomUUID(),
        tournamentId,
        groupId: groupId || undefined,
        teamId: newTeam.id,
        name: p.name.trim(),
        displayName: p.displayName?.trim() || p.name.trim(),
        jerseyNumber: p.jerseyNumber !== undefined ? p.jerseyNumber : '',
        role: p.role || 'Player',
        battingStyle: p.battingStyle || '',
        bowlingStyle: p.bowlingStyle || '',
        playingPosition: p.playingPosition || '',
        photoUrl: p.photoUrl || '',
        isCaptain: Boolean(p.isCaptain),
        isViceCaptain: Boolean(p.isViceCaptain),
        status: p.status || 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.players.push(newPlayer);
      addedPlayersCount++;
    }
  }

  saveDatabase();

  addAuditLog(
    'TEAM_CREATE',
    `Created Team "${newTeam.name}" (${newTeam.shortName}) with ${addedPlayersCount} players in Tournament "${tournament.name}"`,
    req.user,
    req.ip
  );

  res.status(201).json({
    message: 'Team saved successfully.',
    team: { ...newTeam, playerCount: addedPlayersCount },
  });
});

/**
 * PUT /api/teams/:id
 * Update existing team record (prevents duplicates)
 */
router.put('/:id', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const index = db.teams.findIndex((t) => t.id === req.params.id);

  if (index === -1) {
    res.status(404).json({ error: 'Team not found.' });
    return;
  }

  const existing = db.teams[index];
  if (!canManageTeams(req.user, existing.tournamentId)) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to modify this team.' });
    return;
  }

  const {
    groupId,
    name,
    shortName,
    code,
    logoUrl,
    photoUrl,
    manager,
    captain,
    viceCaptain,
    homeLocation,
    contact,
    description,
    teamColor,
    status,
    players,
  } = req.body;

  if (name !== undefined) {
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Team Name cannot be empty.' });
      return;
    }
    existing.name = name.trim();
  }

  if (groupId !== undefined) existing.groupId = groupId || undefined;
  if (shortName !== undefined) existing.shortName = shortName.trim();
  if (code !== undefined) existing.code = code.trim();
  if (logoUrl !== undefined) existing.logoUrl = logoUrl;
  if (photoUrl !== undefined) existing.photoUrl = photoUrl;
  if (manager !== undefined) existing.manager = manager.trim();
  if (captain !== undefined) existing.captain = captain.trim();
  if (viceCaptain !== undefined) existing.viceCaptain = viceCaptain.trim();
  if (homeLocation !== undefined) existing.homeLocation = homeLocation.trim();
  if (contact !== undefined) existing.contact = contact.trim();
  if (description !== undefined) existing.description = description.trim();
  if (teamColor !== undefined) existing.teamColor = teamColor;
  if (status !== undefined) existing.status = status;

  // If players list provided, sync / add new ones
  if (Array.isArray(players)) {
    for (const p of players) {
      if (!p.name || !p.name.trim()) continue;
      if (p.id) {
        const existingPlayerIdx = db.players.findIndex((pl) => pl.id === p.id);
        if (existingPlayerIdx !== -1) {
          db.players[existingPlayerIdx] = {
            ...db.players[existingPlayerIdx],
            name: p.name.trim(),
            displayName: p.displayName || p.name.trim(),
            jerseyNumber: p.jerseyNumber !== undefined ? p.jerseyNumber : db.players[existingPlayerIdx].jerseyNumber,
            role: p.role || db.players[existingPlayerIdx].role,
            battingStyle: p.battingStyle !== undefined ? p.battingStyle : db.players[existingPlayerIdx].battingStyle,
            bowlingStyle: p.bowlingStyle !== undefined ? p.bowlingStyle : db.players[existingPlayerIdx].bowlingStyle,
            photoUrl: p.photoUrl !== undefined ? p.photoUrl : db.players[existingPlayerIdx].photoUrl,
            isCaptain: p.isCaptain !== undefined ? Boolean(p.isCaptain) : db.players[existingPlayerIdx].isCaptain,
            isViceCaptain: p.isViceCaptain !== undefined ? Boolean(p.isViceCaptain) : db.players[existingPlayerIdx].isViceCaptain,
            updatedAt: new Date().toISOString(),
          };
          continue;
        }
      }
      // Add new player
      const newPlayer: Player = {
        id: crypto.randomUUID(),
        tournamentId: existing.tournamentId,
        groupId: existing.groupId,
        teamId: existing.id,
        name: p.name.trim(),
        displayName: p.displayName?.trim() || p.name.trim(),
        jerseyNumber: p.jerseyNumber !== undefined ? p.jerseyNumber : '',
        role: p.role || 'Player',
        battingStyle: p.battingStyle || '',
        bowlingStyle: p.bowlingStyle || '',
        photoUrl: p.photoUrl || '',
        isCaptain: Boolean(p.isCaptain),
        isViceCaptain: Boolean(p.isViceCaptain),
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.players.push(newPlayer);
    }
  }

  existing.updatedAt = new Date().toISOString();
  db.teams[index] = existing;
  saveDatabase();

  addAuditLog('TEAM_UPDATE', `Updated Team "${existing.name}" (ID: ${existing.id})`, req.user, req.ip);

  const currentPlayers = db.players.filter((p) => p.teamId === existing.id);

  res.json({
    message: 'Team updated successfully.',
    team: {
      ...existing,
      playerCount: currentPlayers.length,
    },
  });
});

/**
 * DELETE /api/teams/:id
 * Delete team safely
 */
router.delete('/:id', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const id = req.params.id;
  const index = db.teams.findIndex((t) => t.id === id);

  if (index === -1) {
    res.status(404).json({ error: 'Team not found.' });
    return;
  }

  const team = db.teams[index];
  if (!canManageTeams(req.user, team.tournamentId)) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to delete this team.' });
    return;
  }

  const teamName = db.teams[index].name;

  db.teams.splice(index, 1);

  // Safely delete or unassign players
  db.players = db.players.filter((p) => p.teamId !== id);

  saveDatabase();

  addAuditLog('TEAM_DELETE', `Deleted Team "${teamName}" (ID: ${id}) and associated players`, req.user, req.ip);

  res.json({ message: 'Team deleted successfully.' });
});

export default router;
