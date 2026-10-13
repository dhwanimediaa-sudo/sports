import { Router, Response } from 'express';
import crypto from 'crypto';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { getUserFromRequest, canUserAccessMatch, isUserAdmin, canAccessSport } from '../middleware/accessControl';
import { getDb, saveDatabase } from '../db/database';
import { StudioGraphic, StudioGraphicPreset, SportType, Match } from '../../src/types';
import {
  DEFAULT_STUDIO_GRAPHICS,
  DYNAMIC_FIELDS,
  SPORT_GRAPHIC_CATEGORIES,
} from '../services/studioGraphicsPresets';
import {
  buildGraphicDataContext,
  getSampleDataContextForSport,
  resolveStudioGraphic,
} from '../services/graphicDataResolver';
import { getScoringStateForMatch } from './scoring';

const router = Router();

/**
 * GET /api/graphics/context/matches
 * List matches available for live dynamic data preview & binding
 */
router.get('/context/matches', (req, res: Response): void => {
  const db = getDb();
  const user = getUserFromRequest(req);
  let rawMatches = db.matches || [];

  if (user && !isUserAdmin(user)) {
    rawMatches = rawMatches.filter((m) => canUserAccessMatch(user, m, 'VIEW'));
  }

  const matches = rawMatches.map((m) => {
    const teamA = (db.teams || []).find((t) => t.id === m.teamAId);
    const teamB = (db.teams || []).find((t) => t.id === m.teamBId);
    const tournament = (db.tournaments || []).find((t) => t.id === m.tournamentId);

    return {
      id: m.id,
      name: m.name || `${teamA?.name || 'Team A'} vs ${teamB?.name || 'Team B'}`,
      sport: m.sport,
      status: m.status,
      teamAName: teamA?.name || 'Team A',
      teamBName: teamB?.name || 'Team B',
      teamALogo: teamA?.logoUrl || '',
      teamBLogo: teamB?.logoUrl || '',
      tournamentName: tournament?.name || '',
      date: m.date,
      time: m.time,
      venue: m.venue,
    };
  });

  // Sort: LIVE first, then SCHEDULED, then COMPLETED
  const statusWeight: Record<string, number> = { LIVE: 3, SCHEDULED: 2, COMPLETED: 1 };
  matches.sort((a, b) => (statusWeight[b.status] || 0) - (statusWeight[a.status] || 0));

  res.json({ matches });
});

/**
 * GET /api/graphics/context/match/:matchId
 * Retrieve dynamic data context dictionary for a specific match
 */
router.get('/context/match/:matchId', (req, res: Response): void => {
  const db = getDb();
  const matchId = req.params.matchId;
  const match = (db.matches || []).find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found for dynamic data context.' });
    return;
  }

  const user = getUserFromRequest(req);
  if (user && !canUserAccessMatch(user, match, 'VIEW')) {
    res.status(403).json({ error: 'Forbidden: You do not have access to this match data.' });
    return;
  }

  const scoringState = getScoringStateForMatch(match);
  const context = buildGraphicDataContext(match, scoringState);

  res.json({ context });
});

/**
 * GET /api/graphics/context/sample/:sport
 * Retrieve sample mock dynamic data context dictionary for design preview
 */
router.get('/context/sample/:sport', (req, res: Response): void => {
  const sport = (req.params.sport || 'CRICKET').toUpperCase() as SportType;
  const context = getSampleDataContextForSport(sport);
  res.json({ context });
});

/**
 * POST /api/graphics/resolve
 * Takes a graphic design and resolves all its variables using live match data or sample mock data
 */
router.post('/resolve', (req, res: Response): void => {
  const { graphic, matchId, customData } = req.body;

  if (!graphic) {
    res.status(400).json({ error: 'Graphic object is required for resolution.' });
    return;
  }

  const db = getDb();
  let context;

  if (matchId) {
    const match = (db.matches || []).find((m) => m.id === matchId);
    if (match) {
      const scoringState = getScoringStateForMatch(match);
      context = buildGraphicDataContext(match, scoringState);
    }
  }

  if (!context) {
    context = getSampleDataContextForSport((graphic.sport as SportType) || 'CRICKET');
  }

  if (customData && typeof customData === 'object') {
    Object.assign(context.variables, customData);
  }

  const resolvedGraphic = resolveStudioGraphic(graphic, context);
  res.json({ graphic: resolvedGraphic, context });
});

/**
 * Helper to ensure complete resolution attributes and backwards compatibility
 */
function normalizeServerGraphic(g: any): StudioGraphic {
  const width = Number(g.width) || Number(g.canvas?.width) || 1920;
  const height = Number(g.height) || Number(g.canvas?.height) || 1080;
  const orientation =
    g.orientation ||
    (width === height ? 'SQUARE' : width > height ? 'LANDSCAPE' : 'PORTRAIT');
  const aspectRatio =
    g.aspectRatio ||
    (Math.abs(width / height - 16 / 9) < 0.02
      ? '16:9'
      : Math.abs(width / height - 4 / 3) < 0.02
      ? '4:3'
      : Math.abs(width / height - 1) < 0.01
      ? '1:1'
      : Math.abs(width / height - 9 / 16) < 0.02
      ? '9:16'
      : Math.abs(width / height - 4 / 5) < 0.02
      ? '4:5'
      : `${width}:${height}`);
  const resolutionPreset =
    g.resolutionPreset ||
    (width === 1920 && height === 1080
      ? 'FULL_HD'
      : width === 3840 && height === 2160
      ? '4K_UHD'
      : width === 2560 && height === 1440
      ? 'QHD'
      : width === 1280 && height === 720
      ? 'HD_720'
      : width === 1080 && height === 1920
      ? '9_16_1080'
      : width === 1080 && height === 1080
      ? '1_1_1080'
      : 'CUSTOM');

  return {
    ...g,
    width,
    height,
    aspectRatio,
    resolutionPreset,
    customResolution: g.customResolution || { width, height },
    orientation,
    safeArea: g.safeArea || { enabled: false, actionSafePercent: 90, titleSafePercent: 80 },
    grid: g.grid || { enabled: false, size: 16, snapToGrid: false, snapToGuides: true },
    description: g.description || '',
    tags: Array.isArray(g.tags) ? g.tags : [],
    canvas: {
      width,
      height,
      backgroundColor: g.canvas?.backgroundColor || 'transparent',
    },
    elements: Array.isArray(g.elements) ? g.elements : [],
    dynamicFields: Array.isArray(g.dynamicFields) ? g.dynamicFields : [],
  };
}

/**
 * GET /api/graphics
 * List all graphics with optional query filters (sport, category, status, search)
 */
router.get('/', (req, res: Response): void => {
  const db = getDb();
  if (!db.studio_graphics || db.studio_graphics.length === 0) {
    db.studio_graphics = [...DEFAULT_STUDIO_GRAPHICS];
    saveDatabase();
  }

  let graphics = db.studio_graphics.map((g) => normalizeServerGraphic(g));
  const { sport, category, status, search } = req.query;

  if (sport && typeof sport === 'string' && sport !== 'ALL') {
    graphics = graphics.filter(
      (g) => g.sport?.toUpperCase() === sport.toUpperCase()
    );
  }

  if (category && typeof category === 'string' && category !== 'ALL') {
    graphics = graphics.filter(
      (g) => g.category?.toLowerCase() === category.toLowerCase()
    );
  }

  if (status && typeof status === 'string' && status !== 'ALL') {
    graphics = graphics.filter((g) => g.status === status);
  }

  if (search && typeof search === 'string' && search.trim()) {
    const q = search.toLowerCase().trim();
    graphics = graphics.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q) ||
        g.sport.toLowerCase().includes(q) ||
        (g.description && g.description.toLowerCase().includes(q)) ||
        (g.presetName && g.presetName.toLowerCase().includes(q)) ||
        (Array.isArray(g.tags) && g.tags.some((t: string) => t.toLowerCase().includes(q)))
    );
  }

  // Sort by updatedAt descending
  graphics.sort(
    (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
  );

  res.json({
    graphics,
    total: graphics.length,
    sportsCategories: SPORT_GRAPHIC_CATEGORIES,
  });
});

/**
 * GET /api/graphics/dynamic-fields
 * Return catalogue of supported dynamic data fields
 */
router.get('/dynamic-fields', (req, res: Response): void => {
  res.json({
    dynamicFields: DYNAMIC_FIELDS,
    sportsCategories: SPORT_GRAPHIC_CATEGORIES,
  });
});

/**
 * GET /api/graphics/presets
 * List studio presets
 */
router.get('/presets', (req, res: Response): void => {
  const db = getDb();
  const presets: StudioGraphicPreset[] = (db.broadcast_presets || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    sport: p.sport || 'CRICKET',
    category: p.category || 'Scorebug',
    description: p.description || '',
    graphic: p.graphic || p.config,
    createdAt: p.createdAt,
  }));

  res.json({ presets });
});

/**
 * POST /api/graphics/presets
 * Save a graphic design as a reusable preset
 */
router.post('/presets', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const { name, sport, category, description, graphic } = req.body;

  if (!name || !graphic) {
    res.status(400).json({ error: 'Preset name and graphic data are required.' });
    return;
  }

  const effectiveSport = (sport as SportType) || 'CRICKET';
  if (!canAccessSport(req.user, effectiveSport)) {
    res.status(403).json({ error: `Forbidden: You do not have permission to create presets for ${effectiveSport}.` });
    return;
  }

  const newPreset = {
    id: crypto.randomUUID(),
    name,
    sport: effectiveSport,
    category: category || 'Custom',
    description: description || '',
    config: graphic,
    graphic,
    createdAt: new Date().toISOString(),
  };

  if (!db.broadcast_presets) db.broadcast_presets = [];
  db.broadcast_presets.push(newPreset);
  saveDatabase();

  res.status(201).json({ message: 'Graphic design saved as preset.', preset: newPreset });
});

/**
 * GET /api/graphics/:id
 * Retrieve a specific graphic by UUID
 */
router.get('/:id', (req, res: Response): void => {
  const db = getDb();
  const graphic = (db.studio_graphics || []).find((g) => g.id === req.params.id);

  if (!graphic) {
    res.status(404).json({ error: 'Graphic not found.' });
    return;
  }

  res.json({ graphic: normalizeServerGraphic(graphic) });
});

/**
 * POST /api/graphics
 * Create new broadcast graphic
 */
router.post('/', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const {
    name,
    sport,
    category,
    width,
    height,
    aspectRatio,
    resolutionPreset,
    customResolution,
    orientation,
    safeArea,
    grid,
    canvas,
    positionPreset,
    animation,
    transition,
    animationDuration,
    transitionDuration,
    displayDuration,
    elements,
    dynamicFields,
    status,
    description,
    tags,
    isPreset,
    presetName,
  } = req.body;

  if (!name || !name.trim()) {
    res.status(400).json({ error: 'Graphic name is required.' });
    return;
  }

  const effectiveSport = ((sport as SportType) || 'CRICKET').toUpperCase() as SportType;
  if (!canAccessSport(req.user, effectiveSport)) {
    res.status(403).json({ error: `Forbidden: You do not have permission to create graphics for ${effectiveSport}.` });
    return;
  }

  const now = new Date().toISOString();
  const finalWidth = Number(width) || Number(canvas?.width) || 1920;
  const finalHeight = Number(height) || Number(canvas?.height) || 1080;

  const rawGraphic: StudioGraphic = {
    id: crypto.randomUUID(),
    name: name.trim(),
    sport: effectiveSport,
    category: category || 'CUSTOM',
    width: finalWidth,
    height: finalHeight,
    aspectRatio,
    resolutionPreset,
    customResolution,
    orientation,
    safeArea,
    grid,
    description: description ? String(description).trim() : '',
    tags: Array.isArray(tags) ? tags.map((t: any) => String(t).trim()).filter(Boolean) : [],
    canvas: {
      width: finalWidth,
      height: finalHeight,
      backgroundColor: canvas?.backgroundColor || 'transparent',
    },
    positionPreset: positionPreset || 'BOTTOM_CENTER',
    animation: animation || 'NONE',
    transition: transition || 'FADE_IN',
    animationDuration: Number(animationDuration) >= 0 ? Number(animationDuration) : 0.5,
    transitionDuration: Number(transitionDuration) >= 0 ? Number(transitionDuration) : 0.3,
    displayDuration: Number(displayDuration) >= 0 ? Number(displayDuration) : 0,
    elements: Array.isArray(elements) ? elements : [],
    dynamicFields: Array.isArray(dynamicFields) ? dynamicFields : [],
    status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    isPreset: Boolean(isPreset),
    presetName: presetName || undefined,
    createdBy: req.user?.id,
    createdAt: now,
    updatedAt: now,
  };

  const newGraphic = normalizeServerGraphic(rawGraphic);

  if (!db.studio_graphics) db.studio_graphics = [];
  db.studio_graphics.push(newGraphic);

  // Record Audit Log
  db.audit_logs.push({
    id: crypto.randomUUID(),
    userId: req.user?.id,
    userName: req.user?.name,
    userEmail: req.user?.email,
    action: 'GRAPHIC_CREATE',
    details: `Created broadcast graphic "${newGraphic.name}" [${newGraphic.width}x${newGraphic.height}] for ${newGraphic.sport} (${newGraphic.category}).`,
    timestamp: now,
  });

  saveDatabase();

  res.status(201).json({ message: 'Graphic created successfully.', graphic: newGraphic });
});

/**
 * PUT /api/graphics/:id
 * Update existing graphic (does NOT create duplicate record)
 */
router.put('/:id', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const id = req.params.id;
  const existingIdx = (db.studio_graphics || []).findIndex((g) => g.id === id);

  if (existingIdx === -1) {
    res.status(404).json({ error: 'Graphic not found to update.' });
    return;
  }

  const existing = normalizeServerGraphic(db.studio_graphics![existingIdx]);
  if (!isUserAdmin(req.user) && existing.createdBy && existing.createdBy !== req.user?.id) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to modify this graphic.' });
    return;
  }
  if (!isUserAdmin(req.user) && existing.sport && !canAccessSport(req.user, existing.sport)) {
    res.status(403).json({ error: `Forbidden: You do not have permission to access graphics for ${existing.sport}.` });
    return;
  }
  const {
    name,
    sport,
    category,
    width,
    height,
    aspectRatio,
    resolutionPreset,
    customResolution,
    orientation,
    safeArea,
    grid,
    canvas,
    positionPreset,
    animation,
    transition,
    animationDuration,
    transitionDuration,
    displayDuration,
    elements,
    dynamicFields,
    status,
    description,
    tags,
    isPreset,
    presetName,
  } = req.body;

  const now = new Date().toISOString();
  const finalWidth =
    width !== undefined
      ? Number(width)
      : canvas?.width !== undefined
      ? Number(canvas.width)
      : existing.width || existing.canvas.width || 1920;
  const finalHeight =
    height !== undefined
      ? Number(height)
      : canvas?.height !== undefined
      ? Number(canvas.height)
      : existing.height || existing.canvas.height || 1080;

  const rawUpdated: StudioGraphic = {
    ...existing,
    name: name !== undefined ? String(name).trim() : existing.name,
    sport: sport || existing.sport,
    category: category || existing.category,
    width: finalWidth,
    height: finalHeight,
    aspectRatio: aspectRatio || existing.aspectRatio,
    resolutionPreset: resolutionPreset || existing.resolutionPreset,
    customResolution: customResolution !== undefined ? customResolution : existing.customResolution,
    orientation: orientation || existing.orientation,
    safeArea: safeArea !== undefined ? safeArea : existing.safeArea,
    grid: grid !== undefined ? grid : existing.grid,
    description: description !== undefined ? String(description).trim() : existing.description,
    tags: tags !== undefined && Array.isArray(tags) ? tags.map((t: any) => String(t).trim()).filter(Boolean) : existing.tags,
    canvas: {
      width: finalWidth,
      height: finalHeight,
      backgroundColor:
        canvas?.backgroundColor || existing.canvas?.backgroundColor || 'transparent',
    },
    positionPreset: positionPreset || existing.positionPreset,
    animation: animation || existing.animation,
    transition: transition || existing.transition,
    animationDuration:
      animationDuration !== undefined ? Number(animationDuration) : existing.animationDuration,
    transitionDuration:
      transitionDuration !== undefined ? Number(transitionDuration) : existing.transitionDuration,
    displayDuration:
      displayDuration !== undefined ? Number(displayDuration) : existing.displayDuration,
    elements: Array.isArray(elements) ? elements : existing.elements,
    dynamicFields: Array.isArray(dynamicFields) ? dynamicFields : existing.dynamicFields,
    status: status || existing.status,
    isPreset: isPreset !== undefined ? Boolean(isPreset) : existing.isPreset,
    presetName: presetName !== undefined ? presetName : existing.presetName,
    updatedAt: now,
  };

  const updatedGraphic = normalizeServerGraphic(rawUpdated);
  db.studio_graphics![existingIdx] = updatedGraphic;

  // Record Audit Log
  db.audit_logs.push({
    id: crypto.randomUUID(),
    userId: req.user?.id,
    userName: req.user?.name,
    userEmail: req.user?.email,
    action: 'GRAPHIC_UPDATE',
    details: `Updated broadcast graphic "${updatedGraphic.name}" [${updatedGraphic.width}x${updatedGraphic.height}] (${updatedGraphic.id}).`,
    timestamp: now,
  });

  saveDatabase();

  res.json({ message: 'Graphic updated successfully.', graphic: updatedGraphic });
});

/**
 * POST /api/graphics/:id/duplicate
 * Duplicate graphic with new UUID and optional custom name
 */
router.post('/:id/duplicate', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const id = req.params.id;
  const { name: customName } = req.body || {};
  const originalRaw = (db.studio_graphics || []).find((g) => g.id === id);

  if (!originalRaw) {
    res.status(404).json({ error: 'Original graphic not found to duplicate.' });
    return;
  }

  const original = normalizeServerGraphic(originalRaw);

  if (!isUserAdmin(req.user) && original.sport && !canAccessSport(req.user, original.sport)) {
    res.status(403).json({ error: `Forbidden: You do not have permission for ${original.sport}.` });
    return;
  }

  const now = new Date().toISOString();
  const duplicatedElements = (original.elements || []).map((el) => ({
    ...el,
    id: `el-${crypto.randomUUID().substring(0, 8)}`,
  }));

  const finalName = customName && String(customName).trim() ? String(customName).trim() : `${original.name} (Copy)`;

  const duplicate: StudioGraphic = normalizeServerGraphic({
    ...original,
    id: crypto.randomUUID(),
    name: finalName,
    elements: duplicatedElements,
    createdBy: req.user?.id,
    createdAt: now,
    updatedAt: now,
  });

  if (!db.studio_graphics) db.studio_graphics = [];
  db.studio_graphics.push(duplicate);

  // Record Audit Log
  db.audit_logs.push({
    id: crypto.randomUUID(),
    userId: req.user?.id,
    userName: req.user?.name,
    userEmail: req.user?.email,
    action: 'GRAPHIC_DUPLICATE',
    details: `Duplicated broadcast graphic "${original.name}" -> "${duplicate.name}".`,
    timestamp: now,
  });

  saveDatabase();

  res.status(201).json({ message: 'Graphic duplicated successfully.', graphic: duplicate });
});

/**
 * POST /api/graphics/:id/activate
 * Set status to ACTIVE
 */
router.post('/:id/activate', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const id = req.params.id;
  const graphic = (db.studio_graphics || []).find((g) => g.id === id);

  if (!graphic) {
    res.status(404).json({ error: 'Graphic not found.' });
    return;
  }

  if (graphic.createdBy && graphic.createdBy !== req.user?.id && !isUserAdmin(req.user)) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to activate this graphic.' });
    return;
  }

  graphic.status = 'ACTIVE';
  graphic.updatedAt = new Date().toISOString();
  saveDatabase();

  res.json({ message: 'Graphic activated.', graphic });
});

/**
 * POST /api/graphics/:id/deactivate
 * Set status to INACTIVE
 */
router.post('/:id/deactivate', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const id = req.params.id;
  const graphic = (db.studio_graphics || []).find((g) => g.id === id);

  if (!graphic) {
    res.status(404).json({ error: 'Graphic not found.' });
    return;
  }

  if (graphic.createdBy && graphic.createdBy !== req.user?.id && !isUserAdmin(req.user)) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to deactivate this graphic.' });
    return;
  }

  graphic.status = 'INACTIVE';
  graphic.updatedAt = new Date().toISOString();
  saveDatabase();

  res.json({ message: 'Graphic deactivated.', graphic });
});

/**
 * DELETE /api/graphics/:id
 * Delete a graphic record
 */
router.delete('/:id', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const id = req.params.id;
  const existingIdx = (db.studio_graphics || []).findIndex((g) => g.id === id);

  if (existingIdx === -1) {
    res.status(404).json({ error: 'Graphic not found.' });
    return;
  }

  const target = db.studio_graphics![existingIdx];
  if (target.isPreset && !isUserAdmin(req.user)) {
    res.status(403).json({ error: 'Forbidden: Preset graphics cannot be deleted.' });
    return;
  }
  if (target.createdBy && target.createdBy !== req.user?.id && !isUserAdmin(req.user)) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to delete this graphic.' });
    return;
  }
  if (!isUserAdmin(req.user) && target.sport && !canAccessSport(req.user, target.sport)) {
    res.status(403).json({ error: `Forbidden: You do not have permission to delete graphics for ${target.sport}.` });
    return;
  }

  const deleted = db.studio_graphics!.splice(existingIdx, 1)[0];

  // Record Audit Log
  db.audit_logs.push({
    id: crypto.randomUUID(),
    userId: req.user?.id,
    userName: req.user?.name,
    userEmail: req.user?.email,
    action: 'GRAPHIC_DELETE',
    details: `Deleted broadcast graphic "${deleted.name}" (${deleted.id}).`,
    timestamp: new Date().toISOString(),
  });

  saveDatabase();

  res.json({ message: 'Graphic deleted successfully.', id });
});

/**
 * POST /api/graphics/reset-defaults
 * Restore initial sample broadcast graphics library
 */
router.post('/reset-defaults', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  if (!isUserAdmin(req.user)) {
    res.status(403).json({ error: 'Forbidden: Platform-level graphics reset requires administrator access.' });
    return;
  }
  const db = getDb();
  db.studio_graphics = [...DEFAULT_STUDIO_GRAPHICS];
  saveDatabase();
  res.json({ message: 'Default broadcast graphics restored.', graphics: db.studio_graphics });
});

export default router;
