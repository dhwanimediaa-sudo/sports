import { Router, Response } from 'express';
import crypto from 'crypto';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { isAuthorizedForTournament, canManageTournament, getUserFromRequest, isUserAdmin } from '../middleware/accessControl';
import { getDb, saveDatabase } from '../db/database';
import { addAuditLog } from '../utils/logger';
import { Group } from '../../src/types';

const router = Router();

/**
 * GET /api/groups
 * List groups (supports filtering by tournamentId)
 */
router.get('/', (req, res): void => {
  const db = getDb();
  let list = [...db.groups];
  const tournamentId = req.query.tournamentId as string;
  const status = req.query.status as string;
  const user = getUserFromRequest(req);

  if (tournamentId) {
    const tournament = db.tournaments.find((t) => t.id === tournamentId);
    if (tournament && tournament.isPublic !== true && !isAuthorizedForTournament(tournament, user, 'VIEW')) {
      res.status(403).json({ error: 'Forbidden: You do not have permission to view groups in this tournament.' });
      return;
    }
    list = list.filter((g) => g.tournamentId === tournamentId);
  } else if (user && !isUserAdmin(user)) {
    list = list.filter((g) => {
      const t = db.tournaments.find((tourn) => tourn.id === g.tournamentId);
      return !t || t.isPublic === true || isAuthorizedForTournament(t, user, 'VIEW');
    });
  }

  if (status) {
    list = list.filter((g) => g.status === status);
  }

  const result = list.map((g) => {
    const teams = db.teams.filter((t) => t.groupId === g.id);
    return {
      ...g,
      teamCount: teams.length,
    };
  });

  res.json({ groups: result });
});

/**
 * GET /api/groups/:id
 * Get single group by ID
 */
router.get('/:id', (req, res): void => {
  const db = getDb();
  const group = db.groups.find((g) => g.id === req.params.id);

  if (!group) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }

  const user = getUserFromRequest(req);
  const tournament = db.tournaments.find((t) => t.id === group.tournamentId);
  if (tournament && tournament.isPublic !== true && !isAuthorizedForTournament(tournament, user, 'VIEW')) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to view this group.' });
    return;
  }

  const teams = db.teams.filter((t) => t.groupId === group.id);
  res.json({
    group: {
      ...group,
      teamCount: teams.length,
    },
    teams,
  });
});

/**
 * POST /api/groups
 * Create new group
 */
router.post('/', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const { tournamentId, name, code, description, maxTeams, qualificationRules, status } = req.body;

  if (!tournamentId || typeof tournamentId !== 'string') {
    res.status(400).json({ error: 'Tournament ID is required.' });
    return;
  }

  const tournament = db.tournaments.find((t) => t.id === tournamentId);
  if (!tournament) {
    res.status(404).json({ error: 'Target Tournament does not exist.' });
    return;
  }

  if (!canManageTournament(req.user, tournamentId)) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to manage groups in this tournament.' });
    return;
  }

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'Group Name is required (e.g. Group A).' });
    return;
  }

  const newGroup: Group = {
    id: crypto.randomUUID(),
    tournamentId,
    name: name.trim(),
    code: code?.trim() || name.trim().charAt(0).toUpperCase(),
    description: description?.trim() || '',
    maxTeams: maxTeams ? Number(maxTeams) : 10,
    qualificationRules: qualificationRules?.trim() || '',
    status: status || 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.groups.push(newGroup);
  saveDatabase();

  addAuditLog(
    'GROUP_CREATE',
    `Created Group "${newGroup.name}" in Tournament "${tournament.name}"`,
    req.user,
    req.ip
  );

  res.status(201).json({
    message: 'Group created successfully.',
    group: { ...newGroup, teamCount: 0 },
  });
});

/**
 * PUT /api/groups/:id
 * Update existing group
 */
router.put('/:id', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const index = db.groups.findIndex((g) => g.id === req.params.id);

  if (index === -1) {
    res.status(404).json({ error: 'Group not found.' });
    return;
  }

  const existing = db.groups[index];
  if (!canManageTournament(req.user, existing.tournamentId)) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to modify this group.' });
    return;
  }

  const { name, code, description, maxTeams, qualificationRules, status } = req.body;

  if (name !== undefined) {
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Group Name cannot be empty.' });
      return;
    }
    existing.name = name.trim();
  }

  if (code !== undefined) existing.code = code.trim();
  if (description !== undefined) existing.description = description.trim();
  if (maxTeams !== undefined) existing.maxTeams = Number(maxTeams) || 10;
  if (qualificationRules !== undefined) existing.qualificationRules = qualificationRules.trim();
  if (status !== undefined) existing.status = status;

  existing.updatedAt = new Date().toISOString();
  db.groups[index] = existing;
  saveDatabase();

  addAuditLog('GROUP_UPDATE', `Updated Group "${existing.name}" (ID: ${existing.id})`, req.user, req.ip);

  res.json({
    message: 'Group updated successfully.',
    group: existing,
  });
});

/**
 * DELETE /api/groups/:id
 * Delete group safely
 */
router.delete('/:id', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const id = req.params.id;
  const index = db.groups.findIndex((g) => g.id === id);

  if (index === -1) {
    res.status(404).json({ error: 'Group not found.' });
    return;
  }

  const group = db.groups[index];
  if (!canManageTournament(req.user, group.tournamentId)) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to delete this group.' });
    return;
  }

  const groupName = db.groups[index].name;

  db.groups.splice(index, 1);

  // Unlink team group associations or clean up
  db.teams.forEach((t) => {
    if (t.groupId === id) {
      delete t.groupId;
    }
  });

  saveDatabase();

  addAuditLog('GROUP_DELETE', `Deleted Group "${groupName}" (ID: ${id})`, req.user, req.ip);

  res.json({ message: 'Group deleted successfully.' });
});

export default router;
