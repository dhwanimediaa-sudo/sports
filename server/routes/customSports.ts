import { Router, Response } from 'express';
import crypto from 'crypto';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { isUserAdmin, canAccessSport } from '../middleware/accessControl';
import { getDb, saveDatabase } from '../db/database';
import { CustomSport } from '../../src/types';
import { DEFAULT_CUSTOM_SPORTS } from '../services/customSportPresets';

const router = Router();

/**
 * GET /api/custom-sports
 * Retrieve all custom sports defined in the system
 */
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  if (!db.custom_sports || db.custom_sports.length === 0) {
    db.custom_sports = [...DEFAULT_CUSTOM_SPORTS];
    saveDatabase();
  }
  res.json({ customSports: db.custom_sports });
});

/**
 * GET /api/custom-sports/presets
 * Retrieve default turnkey custom sports presets
 */
router.get('/presets', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  res.json({ presets: DEFAULT_CUSTOM_SPORTS });
});

/**
 * GET /api/custom-sports/:id
 * Retrieve a single custom sport definition
 */
router.get('/:id', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const sportId = req.params.id;
  let found = (db.custom_sports || []).find((s) => s.id === sportId);
  if (!found) {
    found = DEFAULT_CUSTOM_SPORTS.find((s) => s.id === sportId);
  }

  if (!found) {
    res.status(404).json({ error: 'Custom sport configuration not found.' });
    return;
  }

  res.json({ customSport: found });
});

/**
 * POST /api/custom-sports
 * Create a new custom sport configuration
 */
router.post('/', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  if (!canAccessSport(req.user, 'CUSTOM')) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to manage Custom sports.' });
    return;
  }
  const db = getDb();
  const {
    name,
    shortCode,
    logoUrl,
    icon,
    iconName,
    description,
    sportCategory,
    isIndoor,
    matchType,
    totalPeriods,
    periodDurationMinutes,
    isClockCountdown,
    breakDurationMinutes,
    scoringSystem,
    targetScore,
    winningMargin,
    maxScoreCap,
    timeoutRules,
    substitutionRules,
    extraTimeRules,
    tieBreakRules,
    shootoutRules,
    officialsList,
    playerRoles,
    defaultPlayersPerTeam,
    scoringEvents,
    customStatistics,
    customAwards,
    broadcastPresets,
  } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({ error: 'Sport name is required.' });
    return;
  }

  const now = new Date().toISOString();
  const newSport: CustomSport = {
    id: `cs-${crypto.randomUUID()}`,
    name: name.trim(),
    shortCode: (shortCode || name.substring(0, 3)).trim().toUpperCase(),
    logoUrl: logoUrl || '',
    icon: icon || '⚙️',
    iconName: iconName || 'settings',
    description: description || `Custom rules for ${name}`,
    sportCategory: sportCategory || 'TEAM',
    isIndoor: isIndoor || 'BOTH',
    matchType: matchType || 'PERIODS',
    totalPeriods: Number(totalPeriods) || 2,
    periodDurationMinutes: Number(periodDurationMinutes) || 0,
    isClockCountdown: Boolean(isClockCountdown),
    breakDurationMinutes: Number(breakDurationMinutes) || 5,
    scoringSystem: scoringSystem || 'POINTS',
    targetScore: Number(targetScore) || 0,
    winningMargin: Number(winningMargin) || 1,
    maxScoreCap: maxScoreCap ? Number(maxScoreCap) : undefined,
    timeoutRules: timeoutRules || { maxTimeoutsPerPeriod: 1, maxTimeoutsPerMatch: 2, timeoutDurationSeconds: 60 },
    substitutionRules: substitutionRules || { maxSubstitutionsPerMatch: 10, maxSubstitutionsPerPeriod: 5, rollingSubstitutions: true },
    extraTimeRules: extraTimeRules || { enabled: false, durationMinutes: 5, periodsCount: 2, goldenGoal: false },
    tieBreakRules: tieBreakRules || { enabled: false },
    shootoutRules: shootoutRules || { enabled: false, initialRounds: 5, suddenDeath: true },
    officialsList: Array.isArray(officialsList) ? officialsList : ['Referee', 'Umpire', 'Scorekeeper'],
    playerRoles: Array.isArray(playerRoles) ? playerRoles : ['Captain', 'Player', 'Substitute'],
    defaultPlayersPerTeam: Number(defaultPlayersPerTeam) || 5,
    scoringEvents: Array.isArray(scoringEvents) && scoringEvents.length > 0
      ? scoringEvents.map((e, idx) => ({
          ...e,
          id: e.id || `event-${crypto.randomUUID()}`,
        }))
      : [
          {
            id: `event-${crypto.randomUUID()}`,
            name: 'Point (+1)',
            shortName: '+1',
            points: 1,
            icon: '🎯',
            graphicType: 'BANNER',
            playerAttribution: 'REQUIRED',
            teamAttribution: 'REQUIRED',
            trackStatistics: true,
            triggerBroadcast: true,
            undoAllowed: true,
            color: 'emerald',
            isDefault: true,
          },
        ],
    customStatistics: Array.isArray(customStatistics) ? customStatistics : [],
    customAwards: Array.isArray(customAwards) ? customAwards : [],
    broadcastPresets: Array.isArray(broadcastPresets) ? broadcastPresets : [],
    createdByUserId: req.user?.id,
    createdAt: now,
    updatedAt: now,
  };

  if (!db.custom_sports) db.custom_sports = [];
  db.custom_sports.unshift(newSport);

  db.audit_logs.push({
    id: crypto.randomUUID(),
    userId: req.user?.id,
    userName: req.user?.name,
    userEmail: req.user?.email,
    action: 'MATCH_CREATE' as any,
    details: `Created new custom sport engine: "${newSport.name}" (${newSport.shortCode})`,
    timestamp: now,
  });

  saveDatabase();
  res.status(201).json({ customSport: newSport, message: 'Custom sport created successfully.' });
});

/**
 * PUT /api/custom-sports/:id
 * Update an existing custom sport configuration
 */
router.put('/:id', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  if (!canAccessSport(req.user, 'CUSTOM')) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to manage Custom sports.' });
    return;
  }
  const db = getDb();
  const sportId = req.params.id;
  if (!db.custom_sports) db.custom_sports = [];

  const index = db.custom_sports.findIndex((s) => s.id === sportId);
  if (index === -1) {
    // If updating a preset, clone it into user customs
    const preset = DEFAULT_CUSTOM_SPORTS.find((s) => s.id === sportId);
    if (preset) {
      const cloned: CustomSport = {
        ...preset,
        ...req.body,
        id: sportId,
        updatedAt: new Date().toISOString(),
      };
      db.custom_sports.push(cloned);
      saveDatabase();
      res.json({ customSport: cloned, message: 'Custom sport updated successfully.' });
      return;
    }

    res.status(404).json({ error: 'Custom sport configuration not found.' });
    return;
  }

  const existing = db.custom_sports[index];
  if (existing.createdByUserId && existing.createdByUserId !== req.user?.id && !isUserAdmin(req.user)) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to modify this custom sport.' });
    return;
  }

  const updated: CustomSport = {
    ...existing,
    ...req.body,
    id: existing.id,
    updatedAt: new Date().toISOString(),
  };

  db.custom_sports[index] = updated;

  db.audit_logs.push({
    id: crypto.randomUUID(),
    userId: req.user?.id,
    userName: req.user?.name,
    userEmail: req.user?.email,
    action: 'MATCH_UPDATE' as any,
    details: `Updated custom sport configuration: "${updated.name}" (${updated.id})`,
    timestamp: new Date().toISOString(),
  });

  saveDatabase();
  res.json({ customSport: updated, message: 'Custom sport updated successfully.' });
});

/**
 * POST /api/custom-sports/:id/duplicate
 * Duplicate a custom sport
 */
router.post('/:id/duplicate', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  if (!canAccessSport(req.user, 'CUSTOM')) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to manage Custom sports.' });
    return;
  }
  const db = getDb();
  const sportId = req.params.id;
  let target = (db.custom_sports || []).find((s) => s.id === sportId);
  if (!target) {
    target = DEFAULT_CUSTOM_SPORTS.find((s) => s.id === sportId);
  }

  if (!target) {
    res.status(404).json({ error: 'Source custom sport not found.' });
    return;
  }

  const now = new Date().toISOString();
  const duplicate: CustomSport = {
    ...JSON.parse(JSON.stringify(target)),
    id: `cs-${crypto.randomUUID()}`,
    name: `${target.name} (Copy)`,
    shortCode: `${target.shortCode}2`.substring(0, 4),
    createdByUserId: req.user?.id,
    createdAt: now,
    updatedAt: now,
  };

  if (!db.custom_sports) db.custom_sports = [];
  db.custom_sports.unshift(duplicate);

  db.audit_logs.push({
    id: crypto.randomUUID(),
    userId: req.user?.id,
    userName: req.user?.name,
    userEmail: req.user?.email,
    action: 'MATCH_CREATE' as any,
    details: `Duplicated custom sport: "${target.name}" -> "${duplicate.name}"`,
    timestamp: now,
  });

  saveDatabase();
  res.status(201).json({ customSport: duplicate, message: 'Custom sport duplicated successfully.' });
});

/**
 * DELETE /api/custom-sports/:id
 * Delete a custom sport
 */
router.delete('/:id', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  if (!canAccessSport(req.user, 'CUSTOM')) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to manage Custom sports.' });
    return;
  }
  const db = getDb();
  const sportId = req.params.id;
  if (!db.custom_sports) db.custom_sports = [];

  const index = db.custom_sports.findIndex((s) => s.id === sportId);
  if (index === -1) {
    res.status(404).json({ error: 'Custom sport not found.' });
    return;
  }

  const deleted = db.custom_sports[index];
  if (deleted.isPreset && !isUserAdmin(req.user)) {
    res.status(403).json({ error: 'Forbidden: Default presets cannot be deleted.' });
    return;
  }

  if (deleted.createdByUserId && deleted.createdByUserId !== req.user?.id && !isUserAdmin(req.user)) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to delete this custom sport.' });
    return;
  }

  db.custom_sports.splice(index, 1);

  db.audit_logs.push({
    id: crypto.randomUUID(),
    userId: req.user?.id,
    userName: req.user?.name,
    userEmail: req.user?.email,
    action: 'MATCH_DELETE' as any,
    details: `Deleted custom sport: "${deleted.name}" (${deleted.id})`,
    timestamp: new Date().toISOString(),
  });

  saveDatabase();
  res.json({ message: 'Custom sport deleted successfully.' });
});

export default router;
