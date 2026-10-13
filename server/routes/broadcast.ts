import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { canUserAccessMatch, canAccessSport } from '../middleware/accessControl';
import { getDb, saveDatabase } from '../db/database';
import {
  Match,
  CricketInnings,
  CricketBallEvent,
  BroadcastConfig,
  BroadcastPreset,
  GraphicsTemplate,
  SportType,
  GraphicAssignment,
} from '../../src/types';
import { broadcastScoringUpdate, getScoringStateForMatch } from './scoring';
import { sanitizePublicMatch } from './matches';
import {
  getAssignmentsForSport,
  saveAssignments,
  resetAssignments,
  getPlaylists,
  savePlaylist,
  deletePlaylist,
  getScenes,
  saveScene,
  deleteScene,
  getOnAirState,
  setPreview,
  takeLive,
  playGraphic,
  stopGraphic,
  holdOnAir,
  clearOnAir,
  replayOnAir,
  nextInPlaylistOrQueue,
  skipQueued,
  stopAll,
  triggerEventAutoAssignment,
  triggerEventAssignment,
  clearAssignmentCooldowns,
  setOperatorLock,
  isOperatorLocked,
  getBroadcastAuditLogs,
} from '../services/graphicAssignmentService';

const router = Router({ mergeParams: true });

export function getDefaultBroadcastConfig(matchId: string): BroadcastConfig {
  return {
    id: crypto.randomUUID(),
    matchId,
    scoreboardVisible: false,
    sponsorVisible: false,
    playerLowerThirdVisible: false,
    enableFour: true,
    enableSix: true,
    enableWicket: true,
    enableFifty: true,
    enableCentury: true,
    enableOver: true,
    enablePartnership: true,
    enableInningsBreak: true,
    enableMatchResult: true,
    selectedTemplates: {
      scoreboard: 'MODERN_SPORTS',
      four: 'MODERN_SPORTS',
      six: 'NEON',
      wicket: 'BOLD_SPORTS',
      fifty: 'PREMIUM',
      century: 'PREMIUM',
      over: 'GLASS',
      partnership: 'MINIMAL',
      inningsBreak: 'MODERN_SPORTS',
      matchResult: 'BOLD_SPORTS',
      playerLowerThird: 'MODERN_SPORTS',
    },
    elementVisibility: {
      tournamentLogo: true,
      tournamentName: true,
      teamLogo: true,
      teamName: true,
      score: true,
      wickets: true,
      overs: true,
      runRate: true,
      target: true,
      requiredRuns: true,
      requiredRate: true,
      striker: true,
      nonStriker: true,
      batsmanRuns: true,
      batsmanBalls: true,
      bowlerName: true,
      bowlerFigures: true,
      partnership: true,
      currentOver: true,
      sponsorLogo: true,
    },
    styleConfig: {
      position: 'BOTTOM',
      shape: 'ROUNDED',
      fontStyle: 'MODERN',
      primaryColor: '#0f172a',
      secondaryColor: '#1e293b',
      accentColor: '#10b981',
      textColor: '#ffffff',
      bgOpacity: 0.9,
      showBorder: true,
      showGlow: true,
      animation: 'SLIDE_UP',
    },
    eventDurations: {
      four: 2.5,
      six: 3.0,
      wicket: 4.0,
      fifty: 4.0,
      century: 5.0,
      over: 4.0,
    },
    sponsorConfig: {
      name: 'SportsPulse Broadcast Partner',
      logoUrl: '',
      position: 'TOP_RIGHT',
      animation: 'FADE',
    },
    activeManualOverlay: 'NONE',
    activeGraphicIds: [
      'built-in-scorebug',
      'built-in-sponsor',
      'built-in-player-lower-third',
    ],
    hiddenGraphicIds: [],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * PUBLIC ENDPOINT for OBS / vMix Broadcast Output Canvas
 * GET /api/matches/:id/broadcast/state & /api/matches/:id/broadcast/canvas
 */
router.get(['/state', '/canvas'], (req: Request, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = (db.matches || []).find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found for broadcast canvas.' });
    return;
  }

  // Retrieve or generate broadcast config
  let config = (db.broadcast_configs || []).find((c) => c.matchId === matchId);
  if (!config) {
    config = getDefaultBroadcastConfig(matchId);
    if (!db.broadcast_configs) db.broadcast_configs = [];
    db.broadcast_configs.push(config);
    saveDatabase();
  }

  // Retrieve calculated scoring state
  const scoringState = getScoringStateForMatch(match);
  const onAirState = getOnAirState(matchId);

  // Return public payload for broadcast canvas
  res.json({
    match: sanitizePublicMatch(match),
    scoringState,
    broadcastConfig: config,
    onAirState,
    assignedOnAirGraphic: onAirState.currentOnAir,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/matches/:id/broadcast/config & /api/broadcast/config
 */
router.get('/config', (req: Request, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id || (req.query.matchId as string);

  let config = (db.broadcast_configs || []).find((c) => c.matchId === matchId);
  if (!config) {
    config = getDefaultBroadcastConfig(matchId);
    if (!db.broadcast_configs) db.broadcast_configs = [];
    db.broadcast_configs.push(config);
    saveDatabase();
  }

  res.json({ config });
});

/**
 * POST /api/matches/:id/broadcast/config & /api/broadcast/config
 * Save broadcast configuration
 */
router.post('/config', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id || req.body?.matchId;
  const match = (db.matches || []).find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (!canUserAccessMatch(req.user, match, 'BROADCAST')) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to configure broadcast for this match.' });
    return;
  }

  let existingIndex = (db.broadcast_configs || []).findIndex((c) => c.matchId === matchId);
  const updatedConfig: BroadcastConfig = {
    ...getDefaultBroadcastConfig(matchId),
    ...req.body,
    matchId,
    updatedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    db.broadcast_configs[existingIndex] = updatedConfig;
  } else {
    if (!db.broadcast_configs) db.broadcast_configs = [];
    db.broadcast_configs.push(updatedConfig);
  }

  saveDatabase();

  // Reset any stale cooldowns on broadcast configuration changes so re-enabled graphics trigger cleanly
  clearAssignmentCooldowns(matchId);

  // Broadcast realtime update to listeners
  const scoringState = getScoringStateForMatch(match);

  broadcastScoringUpdate(matchId, {
    ...scoringState,
    broadcastConfig: updatedConfig,
  });

  res.json({ message: 'Broadcast configuration saved successfully.', config: updatedConfig });
});

/**
 * POST /api/matches/:id/broadcast/trigger-event
 * Manually trigger or dismiss a broadcast event/overlay (e.g., Player lower third, sponsor, test 4/6/wicket)
 */
router.post('/trigger-event', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id || req.body?.matchId;
  const match = (db.matches || []).find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (!canUserAccessMatch(req.user, match, 'BROADCAST')) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to trigger broadcast events for this match.' });
    return;
  }

  const { type, durationSeconds, data, playerId, activeManualOverlay } = req.body;

  let config = (db.broadcast_configs || []).find((c) => c.matchId === matchId);
  if (!config) {
    config = getDefaultBroadcastConfig(matchId);
    if (!db.broadcast_configs) db.broadcast_configs = [];
    db.broadcast_configs.push(config);
  }

  if (activeManualOverlay !== undefined) {
    config.activeManualOverlay = activeManualOverlay;
  }
  if (playerId !== undefined) {
    config.selectedPlayerId = playerId;
  }

  config.updatedAt = new Date().toISOString();
  saveDatabase();

  const scoringState = getScoringStateForMatch(match);

  const eventPayload = {
    ...scoringState,
    broadcastConfig: config,
    manualTriggerEvent: {
      type: type || 'NONE',
      durationSeconds: durationSeconds || 3,
      data,
      timestamp: new Date().toISOString(),
    },
  };

  broadcastScoringUpdate(matchId, eventPayload);

  // If an event type is provided, attempt automatic trigger for assigned graphic
  if (type && type !== 'NONE') {
    triggerEventAutoAssignment(matchId, match.sport, type, data).catch((err) => {
      console.warn('Auto assignment trigger notice:', err);
    });
  }

  res.json({ message: 'Broadcast event triggered successfully.', config });
});

/**
 * POST /api/matches/:id/broadcast/reset
 * Reset match graphics configuration to default
 */
router.post('/reset', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;

  const match = (db.matches || []).find((m) => m.id === matchId);
  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (!canUserAccessMatch(req.user, match, 'BROADCAST')) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to reset broadcast configuration for this match.' });
    return;
  }

  const defaultConfig = getDefaultBroadcastConfig(matchId);
  let index = (db.broadcast_configs || []).findIndex((c) => c.matchId === matchId);

  if (index >= 0) {
    db.broadcast_configs[index] = defaultConfig;
  } else {
    if (!db.broadcast_configs) db.broadcast_configs = [];
    db.broadcast_configs.push(defaultConfig);
  }

  saveDatabase();

  const scoringState = getScoringStateForMatch(match);

  broadcastScoringUpdate(matchId, {
    ...scoringState,
    broadcastConfig: defaultConfig,
  });

  res.json({ message: 'Broadcast configuration reset to default.', config: defaultConfig });
});

/**
 * GET /api/broadcast/presets
 * Get saved reusable presets
 */
router.get('/presets', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const presets: BroadcastPreset[] = db.broadcast_presets || [];

  // Provide initial default presets if empty
  if (presets.length === 0) {
    const initialPresets: BroadcastPreset[] = [
      {
        id: 'preset-table-tennis-wtt-championship',
        name: 'Table Tennis WTT Championship',
        description: 'Official ITTF/WTT-inspired high contrast deep slate with vibrant orange & red accenting.',
        config: {
          selectedTemplates: {
            scoreboard: 'CHAMPIONSHIP',
            four: 'MODERN_SPORTS',
            six: 'NEON',
            wicket: 'BOLD_SPORTS',
            fifty: 'PREMIUM',
            century: 'PREMIUM',
            over: 'GLASS',
            partnership: 'MINIMAL',
            inningsBreak: 'MODERN_SPORTS',
            matchResult: 'CHAMPIONSHIP',
            playerLowerThird: 'MODERN_SPORTS',
          },
          styleConfig: {
            position: 'BOTTOM',
            shape: 'ROUNDED',
            fontStyle: 'MODERN',
            primaryColor: '#0a0f1d',
            secondaryColor: '#1e293b',
            accentColor: '#f97316',
            textColor: '#ffffff',
            bgOpacity: 0.95,
            showBorder: true,
            showGlow: true,
            animation: 'SLIDE_UP',
          },
        },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'preset-table-tennis-premium-tv',
        name: 'Table Tennis Premium TV',
        description: 'Modern television broadcast scorebug with crisp typography and subtle cyan glass shine.',
        config: {
          selectedTemplates: {
            scoreboard: 'PREMIUM',
            four: 'MODERN_SPORTS',
            six: 'NEON',
            wicket: 'BOLD_SPORTS',
            fifty: 'PREMIUM',
            century: 'PREMIUM',
            over: 'GLASS',
            partnership: 'MINIMAL',
            inningsBreak: 'MODERN_SPORTS',
            matchResult: 'BOLD_SPORTS',
            playerLowerThird: 'MODERN_SPORTS',
          },
          styleConfig: {
            position: 'BOTTOM',
            shape: 'ROUNDED',
            fontStyle: 'MODERN',
            primaryColor: '#0f172a',
            secondaryColor: '#1e293b',
            accentColor: '#06b6d4',
            textColor: '#ffffff',
            bgOpacity: 0.92,
            showBorder: true,
            showGlow: true,
            animation: 'SLIDE_UP',
          },
        },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'preset-table-tennis-local-tournament',
        name: 'Table Tennis Local Club / Tournament',
        description: 'Clean emerald green and slate backdrop for club and regional opens.',
        config: {
          selectedTemplates: {
            scoreboard: 'MODERN_SPORTS',
            four: 'MODERN_SPORTS',
            six: 'NEON',
            wicket: 'BOLD_SPORTS',
            fifty: 'PREMIUM',
            century: 'PREMIUM',
            over: 'GLASS',
            partnership: 'MINIMAL',
            inningsBreak: 'MODERN_SPORTS',
            matchResult: 'BOLD_SPORTS',
            playerLowerThird: 'MODERN_SPORTS',
          },
          styleConfig: {
            position: 'BOTTOM',
            shape: 'ROUNDED',
            fontStyle: 'MODERN',
            primaryColor: '#064e3b',
            secondaryColor: '#022c22',
            accentColor: '#10b981',
            textColor: '#ffffff',
            bgOpacity: 0.94,
            showBorder: true,
            showGlow: true,
            animation: 'SLIDE_UP',
          },
        },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'preset-table-tennis-minimal',
        name: 'Table Tennis Minimal Studio',
        description: 'Compact ultra-lightweight dark scorebug ensuring max video visibility.',
        config: {
          selectedTemplates: {
            scoreboard: 'MINIMAL',
            four: 'MINIMAL',
            six: 'MINIMAL',
            wicket: 'MINIMAL',
            fifty: 'MINIMAL',
            century: 'MINIMAL',
            over: 'MINIMAL',
            partnership: 'MINIMAL',
            inningsBreak: 'MINIMAL',
            matchResult: 'MINIMAL',
            playerLowerThird: 'MINIMAL',
          },
          styleConfig: {
            position: 'BOTTOM',
            shape: 'RECTANGLE',
            fontStyle: 'MINIMAL',
            primaryColor: '#090d16',
            secondaryColor: '#1e293b',
            accentColor: '#f59e0b',
            textColor: '#ffffff',
            bgOpacity: 0.88,
            showBorder: true,
            showGlow: false,
            animation: 'FADE',
          },
        },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'preset-badminton-bwf-pro',
        name: 'Badminton BWF World Tour Style',
        description: 'Official tournament gold & deep emerald styling with dynamic service court tracking.',
        config: {
          selectedTemplates: {
            scoreboard: 'MODERN_SPORTS',
            four: 'MODERN_SPORTS',
            six: 'NEON',
            wicket: 'BOLD_SPORTS',
            fifty: 'PREMIUM',
            century: 'PREMIUM',
            over: 'GLASS',
            partnership: 'MINIMAL',
            inningsBreak: 'MODERN_SPORTS',
            matchResult: 'BOLD_SPORTS',
            playerLowerThird: 'MODERN_SPORTS',
          },
          styleConfig: {
            position: 'BOTTOM',
            shape: 'ROUNDED',
            fontStyle: 'MODERN',
            primaryColor: '#042f2e',
            secondaryColor: '#134e4a',
            accentColor: '#10b981',
            textColor: '#ffffff',
            bgOpacity: 0.96,
            showBorder: true,
            showGlow: true,
            animation: 'SLIDE_UP',
          },
        },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'preset-badminton-minimal-dark',
        name: 'Badminton Minimal Studio Dark',
        description: 'Clean slate backdrop with high-contrast server glow and game status.',
        config: {
          selectedTemplates: {
            scoreboard: 'MINIMAL',
            four: 'MINIMAL',
            six: 'MINIMAL',
            wicket: 'MINIMAL',
            fifty: 'MINIMAL',
            century: 'MINIMAL',
            over: 'MINIMAL',
            partnership: 'MINIMAL',
            inningsBreak: 'MINIMAL',
            matchResult: 'MINIMAL',
            playerLowerThird: 'MINIMAL',
          },
          styleConfig: {
            position: 'BOTTOM',
            shape: 'RECTANGLE',
            fontStyle: 'MINIMAL',
            primaryColor: '#090d16',
            secondaryColor: '#1e293b',
            accentColor: '#06b6d4',
            textColor: '#ffffff',
            bgOpacity: 0.9,
            showBorder: true,
            showGlow: false,
            animation: 'FADE',
          },
        },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'preset-kerala-premier',
        name: 'Kerala Premier League Style',
        description: 'Vibrant modern green & navy theme with bold typography and pill overlays.',
        config: {
          selectedTemplates: {
            scoreboard: 'MODERN_SPORTS',
            four: 'MODERN_SPORTS',
            six: 'NEON',
            wicket: 'BOLD_SPORTS',
            fifty: 'PREMIUM',
            century: 'PREMIUM',
            over: 'GLASS',
            partnership: 'MINIMAL',
            inningsBreak: 'MODERN_SPORTS',
            matchResult: 'BOLD_SPORTS',
            playerLowerThird: 'MODERN_SPORTS',
          },
          styleConfig: {
            position: 'BOTTOM',
            shape: 'ROUNDED',
            fontStyle: 'MODERN',
            primaryColor: '#064e3b',
            secondaryColor: '#022c22',
            accentColor: '#10b981',
            textColor: '#ffffff',
            bgOpacity: 0.95,
            showBorder: true,
            showGlow: true,
            animation: 'SLIDE_UP',
          },
        },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'preset-minimal-dark',
        name: 'Classic Oval Minimal Dark',
        description: 'Subtle slate backdrop with ultra-clean, high-contrast typography.',
        config: {
          selectedTemplates: {
            scoreboard: 'MINIMAL',
            four: 'MINIMAL',
            six: 'MINIMAL',
            wicket: 'BOLD_SPORTS',
            fifty: 'MINIMAL',
            century: 'MINIMAL',
            over: 'COMPACT',
            partnership: 'MINIMAL',
            inningsBreak: 'MINIMAL',
            matchResult: 'MINIMAL',
            playerLowerThird: 'MINIMAL',
          },
          styleConfig: {
            position: 'BOTTOM',
            shape: 'RECTANGLE',
            fontStyle: 'MINIMAL',
            primaryColor: '#0f172a',
            secondaryColor: '#1e293b',
            accentColor: '#38bdf8',
            textColor: '#f8fafc',
            bgOpacity: 0.85,
            showBorder: true,
            showGlow: false,
            animation: 'FADE',
          },
        },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'preset-neon-cyber',
        name: 'Neon Arena High Voltage',
        description: 'Glowing futuristic neon cyan & purple accents for night matches.',
        config: {
          selectedTemplates: {
            scoreboard: 'NEON',
            four: 'NEON',
            six: 'NEON',
            wicket: 'NEON',
            fifty: 'NEON',
            century: 'NEON',
            over: 'NEON',
            partnership: 'NEON',
            inningsBreak: 'NEON',
            matchResult: 'NEON',
            playerLowerThird: 'NEON',
          },
          styleConfig: {
            position: 'BOTTOM',
            shape: 'CAPSULE',
            fontStyle: 'SPORTS',
            primaryColor: '#180230',
            secondaryColor: '#2e0854',
            accentColor: '#a855f7',
            textColor: '#ffffff',
            bgOpacity: 0.95,
            showBorder: true,
            showGlow: true,
            animation: 'POP',
          },
        },
        createdAt: new Date().toISOString(),
      },
    ];

    db.broadcast_presets = initialPresets;
    saveDatabase();
    res.json({ presets: initialPresets });
    return;
  }

  res.json({ presets });
});

/**
 * POST /api/broadcast/presets
 * Create new reusable preset
 */
router.post('/presets', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const { name, description, config } = req.body;

  if (!name) {
    res.status(400).json({ error: 'Preset name is required.' });
    return;
  }

  const newPreset: BroadcastPreset = {
    id: crypto.randomUUID(),
    name,
    description: description || '',
    config: config || {},
    createdAt: new Date().toISOString(),
  };

  if (!db.broadcast_presets) db.broadcast_presets = [];
  db.broadcast_presets.push(newPreset);
  saveDatabase();

  res.status(210).json({ message: 'Broadcast preset saved.', preset: newPreset });
});

/**
 * GET /api/broadcast/templates
 * Get graphic templates library
 */
router.get('/templates', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const templates: GraphicsTemplate[] = db.graphics_templates || [];

  res.json({ templates });
});

/**
 * POST /api/broadcast/templates
 * Create / edit template
 */
router.post('/templates', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const { id, name, category, sport, style, aspectRatio } = req.body;

  if (!name) {
    res.status(400).json({ error: 'Template name is required.' });
    return;
  }

  let template: GraphicsTemplate;
  const existingIdx = (db.graphics_templates || []).findIndex((t) => t.id === id);

  if (existingIdx >= 0) {
    template = {
      ...db.graphics_templates[existingIdx],
      name,
      category: category || 'SCOREBOARD',
      sport: sport || 'CRICKET',
      style: style || 'MODERN_SPORTS',
      aspectRatio: aspectRatio || '16:9',
    };
    db.graphics_templates[existingIdx] = template;
  } else {
    template = {
      id: id || crypto.randomUUID(),
      name,
      category: category || 'SCOREBOARD',
      sport: sport || 'CRICKET',
      style: style || 'MODERN_SPORTS',
      aspectRatio: aspectRatio || '16:9',
      createdAt: new Date().toISOString(),
    };
    if (!db.graphics_templates) db.graphics_templates = [];
    db.graphics_templates.push(template);
  }

  saveDatabase();
  res.json({ message: 'Graphics template saved.', template });
});

// =========================================================================
// UNIVERSAL LIVE GRAPHICS ASSIGNMENT & ON-AIR SCENE MANAGEMENT ROUTES
// =========================================================================

/**
 * GET /api/broadcast/assignments
 * Query params: sport (default CRICKET), matchId (optional)
 */
router.get('/assignments', (req: Request, res: Response): void => {
  const sport = (req.query.sport as SportType) || 'CRICKET';
  const matchId = req.query.matchId as string | undefined;

  const assignments = getAssignmentsForSport(sport, matchId);
  res.json({ assignments, sport, matchId });
});

/**
 * PUT / POST /api/broadcast/assignments
 * Save or batch update graphic assignments
 */
const handleSaveAssignments = (req: AuthenticatedRequest, res: Response): void => {
  const assignments = req.body.assignments as GraphicAssignment[];
  if (!Array.isArray(assignments)) {
    res.status(400).json({ error: 'Assignments array is required.' });
    return;
  }

  // If matchId is specified in any assignment, verify user has BROADCAST access
  const db = getDb();
  for (const a of assignments) {
    if (a.sport && !canAccessSport(req.user, a.sport)) {
      res.status(403).json({ error: `Forbidden: You do not have permission for ${a.sport}.` });
      return;
    }
    if (a.matchId) {
      const match = (db.matches || []).find((m) => m.id === a.matchId);
      if (!match) {
        res.status(404).json({ error: 'Match not found for graphic assignment.' });
        return;
      }
      if (!canUserAccessMatch(req.user, match, 'BROADCAST')) {
        res.status(403).json({ error: 'Forbidden: You do not have broadcast operator permission for this match.' });
        return;
      }
    }
  }

  const saved = saveAssignments(assignments);
  res.json({ message: 'Graphic assignments updated successfully.', assignments: saved });
};

router.put('/assignments', requireAuth, handleSaveAssignments);
router.post('/assignments', requireAuth, handleSaveAssignments);

/**
 * POST /api/broadcast/assignments/reset-defaults
 */
router.post('/assignments/reset-defaults', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const sport = (req.body.sport as SportType) || 'CRICKET';
  const matchId = req.body.matchId as string | undefined;

  if (sport && !canAccessSport(req.user, sport)) {
    res.status(403).json({ error: `Forbidden: You do not have permission for ${sport}.` });
    return;
  }

  if (matchId) {
    const db = getDb();
    const match = (db.matches || []).find((m) => m.id === matchId);
    if (match && !canUserAccessMatch(req.user, match, 'BROADCAST')) {
      res.status(403).json({ error: 'Forbidden: You do not have broadcast operator permission for this match.' });
      return;
    }
  }

  const reset = resetAssignments(sport, matchId);
  res.json({ message: `Assignments reset to ${sport} defaults.`, assignments: reset });
});

/**
 * GET /api/broadcast/playlists
 */
router.get('/playlists', (req: Request, res: Response): void => {
  const sport = req.query.sport as SportType | undefined;
  const matchId = req.query.matchId as string | undefined;

  const playlists = getPlaylists(sport, matchId);
  res.json({ playlists });
});

/**
 * POST /api/broadcast/playlists
 */
router.post('/playlists', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  if (req.body.sport && !canAccessSport(req.user, req.body.sport)) {
    res.status(403).json({ error: `Forbidden: You do not have permission for ${req.body.sport}.` });
    return;
  }
  const matchId = req.body.matchId;
  if (matchId) {
    const db = getDb();
    const match = (db.matches || []).find((m) => m.id === matchId);
    if (match && !canUserAccessMatch(req.user, match, 'BROADCAST')) {
      res.status(403).json({ error: 'Forbidden: You do not have broadcast operator permission for this match.' });
      return;
    }
  }

  const playlist = savePlaylist(req.body);
  res.json({ message: 'Playlist saved successfully.', playlist });
});

/**
 * PUT /api/broadcast/playlists/:playlistId
 */
router.put('/playlists/:playlistId', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  if (req.body.sport && !canAccessSport(req.user, req.body.sport)) {
    res.status(403).json({ error: `Forbidden: You do not have permission for ${req.body.sport}.` });
    return;
  }
  const matchId = req.body.matchId;
  if (matchId) {
    const db = getDb();
    const match = (db.matches || []).find((m) => m.id === matchId);
    if (match && !canUserAccessMatch(req.user, match, 'BROADCAST')) {
      res.status(403).json({ error: 'Forbidden: You do not have broadcast operator permission for this match.' });
      return;
    }
  }

  const playlist = savePlaylist({ ...req.body, id: req.params.playlistId });
  res.json({ message: 'Playlist updated successfully.', playlist });
});

/**
 * DELETE /api/broadcast/playlists/:playlistId
 */
router.delete('/playlists/:playlistId', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const playlists = getPlaylists();
  const target = playlists.find((p) => p.id === req.params.playlistId);
  if (target && target.matchId) {
    const db = getDb();
    const match = (db.matches || []).find((m) => m.id === target.matchId);
    if (match && !canUserAccessMatch(req.user, match, 'BROADCAST')) {
      res.status(403).json({ error: 'Forbidden: You do not have broadcast operator permission for this match.' });
      return;
    }
  }

  const success = deletePlaylist(req.params.playlistId);
  if (success) {
    res.json({ message: 'Playlist deleted successfully.' });
  } else {
    res.status(404).json({ error: 'Playlist not found.' });
  }
});

/**
 * GET /api/broadcast/scenes
 */
router.get('/scenes', (req: Request, res: Response): void => {
  const sport = req.query.sport as SportType | undefined;
  const matchId = req.query.matchId as string | undefined;

  const scenes = getScenes(sport, matchId);
  res.json({ scenes });
});

/**
 * POST /api/broadcast/scenes
 */
router.post('/scenes', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  if (req.body.sport && !canAccessSport(req.user, req.body.sport)) {
    res.status(403).json({ error: `Forbidden: You do not have permission for ${req.body.sport}.` });
    return;
  }
  const matchId = req.body.matchId;
  if (matchId) {
    const db = getDb();
    const match = (db.matches || []).find((m) => m.id === matchId);
    if (match && !canUserAccessMatch(req.user, match, 'BROADCAST')) {
      res.status(403).json({ error: 'Forbidden: You do not have broadcast operator permission for this match.' });
      return;
    }
  }

  const scene = saveScene(req.body);
  res.json({ message: 'Scene saved successfully.', scene });
});

/**
 * PUT /api/broadcast/scenes/:sceneId
 */
router.put('/scenes/:sceneId', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  if (req.body.sport && !canAccessSport(req.user, req.body.sport)) {
    res.status(403).json({ error: `Forbidden: You do not have permission for ${req.body.sport}.` });
    return;
  }
  const matchId = req.body.matchId;
  if (matchId) {
    const db = getDb();
    const match = (db.matches || []).find((m) => m.id === matchId);
    if (match && !canUserAccessMatch(req.user, match, 'BROADCAST')) {
      res.status(403).json({ error: 'Forbidden: You do not have broadcast operator permission for this match.' });
      return;
    }
  }

  const scene = saveScene({ ...req.body, id: req.params.sceneId });
  res.json({ message: 'Scene updated successfully.', scene });
});

/**
 * DELETE /api/broadcast/scenes/:sceneId
 */
router.delete('/scenes/:sceneId', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const scenes = getScenes();
  const target = scenes.find((s) => s.id === req.params.sceneId);
  if (target && target.matchId) {
    const db = getDb();
    const match = (db.matches || []).find((m) => m.id === target.matchId);
    if (match && !canUserAccessMatch(req.user, match, 'BROADCAST')) {
      res.status(403).json({ error: 'Forbidden: You do not have broadcast operator permission for this match.' });
      return;
    }
  }

  const success = deleteScene(req.params.sceneId);
  if (success) {
    res.json({ message: 'Scene deleted successfully.' });
  } else {
    res.status(404).json({ error: 'Scene not found.' });
  }
});

/**
 * =========================================================================
 * ON-AIR TRANSPORT ENDPOINTS
 * =========================================================================
 */

/**
 * Enforce BROADCAST permission on all mutating /onair/:matchId routes
 */
function requireBroadcastPermission(req: any, res: Response, next: any) {
  requireAuth(req, res, () => {
    const db = getDb();
    const matchId = req.params.matchId || req.params.id;
    const match = (db.matches || []).find((m) => m.id === matchId);
    if (!match) {
      res.status(404).json({ error: 'Match not found.' });
      return;
    }
    if (!canUserAccessMatch(req.user, match, 'BROADCAST')) {
      res.status(403).json({ error: 'Forbidden: You do not have broadcast operator permission for this match.' });
      return;
    }
    next();
  });
}

/**
 * GET /api/broadcast/onair/:matchId & /api/matches/:id/broadcast/on-air-state
 */
router.get(['/onair/:matchId', '/on-air-state', '/onair'], (req: Request, res: Response): void => {
  const matchId = req.params.matchId || (req.params as any).id;
  const state = getOnAirState(matchId);
  const onAir = {
    program: state.currentOnAir || state.programContent || (state.activeGraphics && state.activeGraphics.length > 0 ? state.activeGraphics[0] : null),
    preview: state.previewGraphic || state.previewContent || null,
  };
  res.json({ state, onAir });
});

/**
 * POST /api/broadcast/onair/:matchId/preview
 */
router.post(['/onair/:matchId/preview', '/preview'], requireBroadcastPermission, (req: AuthenticatedRequest, res: Response): void => {
  const matchId = req.params.matchId || req.params.id;
  const operatorName = req.user?.name || req.user?.email || 'Operator';
  const state = setPreview(matchId, req.body, operatorName);
  res.json({ message: 'Preview updated.', state });
});

/**
 * POST /api/broadcast/onair/:matchId/cue
 * Explicit cue to preview
 */
router.post(['/onair/:matchId/cue', '/cue'], requireBroadcastPermission, (req: AuthenticatedRequest, res: Response): void => {
  const matchId = req.params.matchId || req.params.id;
  const operatorName = req.user?.name || req.user?.email || 'Operator';
  const state = setPreview(matchId, req.body, operatorName);
  res.json({ message: 'Graphic cued to preview.', state });
});

/**
 * POST /api/broadcast/onair/:matchId/play
 * Explicitly play a single graphic to program without clearing other active layers
 */
router.post(['/onair/:matchId/play', '/play'], requireBroadcastPermission, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const matchId = req.params.matchId || req.params.id;
  const operatorName = req.user?.name || req.user?.email || 'Operator';
  const state = await playGraphic(matchId, req.body, operatorName);
  res.json({ message: 'Graphic played to air.', state });
});

/**
 * POST /api/broadcast/onair/:matchId/stop-graphic
 * Explicitly stop a single graphic by ID/graphicId without affecting others
 */
router.post(['/onair/:matchId/stop-graphic', '/stop-graphic'], requireBroadcastPermission, (req: AuthenticatedRequest, res: Response): void => {
  const matchId = req.params.matchId || req.params.id;
  const graphicId = (req.body?.graphicId || req.body?.id || req.body?.targetId || req.body?.sceneId || req.body?.graphicName) as string;
  if (!graphicId) {
    res.status(400).json({ error: 'graphicId is required to stop a specific graphic.' });
    return;
  }
  const operatorName = req.user?.name || req.user?.email || 'Operator';
  const state = stopGraphic(matchId, graphicId, operatorName);
  res.json({ message: 'Graphic stopped.', state });
});

/**
 * POST /api/broadcast/onair/:matchId/take
 */
router.post(['/onair/:matchId/take', '/onair/:matchId/take-live', '/take', '/take-live'], requireBroadcastPermission, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const matchId = req.params.matchId || req.params.id;
  const operatorName = req.user?.name || req.user?.email || 'Operator';
  const state = await takeLive(matchId, req.body && Object.keys(req.body).length > 0 ? req.body : undefined, operatorName);
  res.json({ message: 'Taken Live on air.', state });
});

/**
 * POST /api/broadcast/onair/:matchId/hold
 */
router.post(['/onair/:matchId/hold', '/hold'], requireBroadcastPermission, (req: AuthenticatedRequest, res: Response): void => {
  const matchId = req.params.matchId || req.params.id;
  const operatorName = req.user?.name || req.user?.email || 'Operator';
  const state = holdOnAir(matchId, operatorName);
  res.json({ message: 'Hold toggled.', state });
});

/**
 * POST /api/broadcast/onair/:matchId/clear
 */
router.post(['/onair/:matchId/clear', '/clear'], requireBroadcastPermission, (req: AuthenticatedRequest, res: Response): void => {
  const matchId = req.params.matchId || req.params.id;
  const operatorName = req.user?.name || req.user?.email || 'Operator';
  const state = clearOnAir(matchId, operatorName);
  res.json({ message: 'On-air cleared.', state });
});

/**
 * POST /api/broadcast/onair/:matchId/replay
 */
router.post('/onair/:matchId/replay', requireBroadcastPermission, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const matchId = req.params.matchId;
  const operatorName = req.user?.name || req.user?.email || 'Operator';
  const state = await replayOnAir(matchId, operatorName);
  res.json({ message: 'Graphic replayed.', state });
});

/**
 * POST /api/broadcast/onair/:matchId/next
 */
router.post('/onair/:matchId/next', requireBroadcastPermission, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const matchId = req.params.matchId;
  const operatorName = req.user?.name || req.user?.email || 'Operator';
  const state = await nextInPlaylistOrQueue(matchId, operatorName);
  res.json({ message: 'Advanced to next item.', state });
});

/**
 * POST /api/broadcast/onair/:matchId/skip
 */
router.post('/onair/:matchId/skip', requireBroadcastPermission, (req: AuthenticatedRequest, res: Response): void => {
  const matchId = req.params.matchId;
  const index = req.body?.index ?? 0;
  const operatorName = req.user?.name || req.user?.email || 'Operator';
  const state = skipQueued(matchId, index, operatorName);
  res.json({ message: 'Queued item skipped.', state });
});

/**
 * POST /api/broadcast/onair/:matchId/stop
 */
router.post('/onair/:matchId/stop', requireBroadcastPermission, (req: AuthenticatedRequest, res: Response): void => {
  const matchId = req.params.matchId;
  const operatorName = req.user?.name || req.user?.email || 'Operator';
  const state = stopAll(matchId, operatorName);
  res.json({ message: 'Emergency stop executed. All cleared.', state });
});

/**
 * POST /api/broadcast/onair/:matchId/lock
 * Toggle Broadcast Operator Lock Mode
 */
router.post('/onair/:matchId/lock', requireBroadcastPermission, (req: AuthenticatedRequest, res: Response): void => {
  const matchId = req.params.matchId;
  const locked = Boolean(req.body.locked);
  const operatorName = req.user?.name || req.user?.email || 'Operator';
  const state = setOperatorLock(matchId, locked, operatorName);
  res.json({ message: locked ? 'Broadcast locked.' : 'Broadcast unlocked.', state });
});

/**
 * GET /api/broadcast/audit-logs
 * Retrieve broadcast operations audit log
 */
router.get('/audit-logs', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const matchId = req.query.matchId as string | undefined;
  const logs = getBroadcastAuditLogs(matchId);
  res.json({ auditLogs: logs });
});

/**
 * POST /api/broadcast/onair/:matchId/trigger-event
 * Manually or automatically trigger an assigned event target
 */
router.post('/onair/:matchId/trigger-event', requireBroadcastPermission, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const matchId = req.params.matchId;
  const operatorName = req.user?.name || req.user?.email || 'Operator';
  const { sport = 'CRICKET', targetId, isManual = true, previewOnly = false, eventData, broadcastEventId } = req.body;
  const result = await triggerEventAssignment(
    matchId,
    sport,
    targetId,
    Boolean(isManual),
    eventData,
    Boolean(previewOnly),
    operatorName,
    broadcastEventId
  );
  const state = getOnAirState(matchId);
  res.json({ message: result.success ? 'Trigger executed.' : (result.reason || 'Trigger skipped.'), result, state });
});

export default router;
