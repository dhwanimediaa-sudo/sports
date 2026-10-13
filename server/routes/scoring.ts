import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { canUserAccessMatch, getUserFromRequest } from '../middleware/accessControl';
import { getDb, saveDatabase } from '../db/database';
import {
  Match,
  CricketBallEvent,
  CricketInnings,
  ExtraType,
  WicketType,
  BroadcastEventType,
  AuditLog,
  VolleyballPointEvent,
  VolleyballSet,
  VolleyballRotation,
  VolleyballTimeout,
  VolleyballSubstitution,
  VolleyballPointType,
} from '../../src/types';
import { calculateCricketScoringState } from '../services/cricketScoringEngine';
import {
  calculateVolleyballScoringState,
  rotateClockwise,
  createDefaultRotation,
  getVolleyballMatchRules,
} from '../services/volleyballScoringEngine';
import {
  calculateKabaddiScoringState,
  getKabaddiMatchRules,
} from '../services/kabaddiScoringEngine';
import {
  KabaddiRaidEvent,
  KabaddiTimeout,
  KabaddiSubstitution,
  KabaddiRaidOutcome,
  KabaddiMatchScoringState,
  HockeyScoringEvent,
  HockeyMatchScoringState,
  HockeyGoalType,
  HockeyCardType,
  HockeyPenaltyCornerOutcome,
  HockeyPenaltyStrokeOutcome,
  HockeyShootoutOutcome,
  FootballScoringEvent,
  FootballMatchScoringState,
  FootballMatchClock,
  FootballGoalType,
  FootballCardType,
  FootballPenaltyOutcome,
  FootballShootoutOutcome,
  FootballEventType,
  BasketballScoringEvent,
  BasketballMatchScoringState,
  BasketballMatchClock,
  BasketballPlayerStats,
  BasketballTeamStats,
  BasketballPeriodScore,
  BasketballEventType,
  BasketballShotType,
  BasketballShotResult,
  BasketballReboundType,
  BasketballTurnoverType,
  BasketballFoulType,
} from '../../src/types';
import {
  calculateHockeyScoringState,
  getHockeyMatchRules,
  getPeriodShortName as getHockeyPeriodShortName,
  getPeriodDisplayName as getHockeyPeriodDisplayName,
} from '../services/hockeyScoringEngine';
import {
  calculateFootballScoringState,
  getFootballMatchRules,
  getPeriodShortName as getFootballPeriodShortName,
  getPeriodDisplayName as getFootballPeriodDisplayName,
  formatFootballMatchTime,
} from '../services/footballScoringEngine';
import {
  calculateBasketballScoringState,
  getBasketballMatchRules,
  getBasketballQuarterShortName,
  getBasketballQuarterDisplayName,
  formatBasketballMatchTime,
} from '../services/basketballScoringEngine';
import {
  calculateTennisScoringState,
  getTennisMatchRules,
} from '../services/tennisScoringEngine';
import {
  calculateBadmintonScoringState,
  getBadmintonMatchRules,
} from '../services/badmintonScoringEngine';
import {
  calculateTableTennisScoringState,
  getTableTennisMatchRules,
} from '../services/tableTennisScoringEngine';
import {
  calculateCustomSportScoringState,
  resolveCustomSportConfig,
} from '../services/customSportScoringEngine';
import {
  TennisScoringEvent,
  TennisMatchScoringState,
  BadmintonScoringEvent,
  BadmintonMatchScoringState,
  TableTennisScoringEvent,
  TableTennisMatchScoringState,
  CustomScoringEvent,
  CustomMatchScoringState,
  CustomTimeoutRecord,
  CustomSubstitutionRecord,
} from '../../src/types';

const router = Router({ mergeParams: true });

// Simple in-memory SSE connections map for real-time updates
const sseClientsMap = new Map<string, Response[]>();

// Periodic heartbeat to prevent idle disconnects across network proxies
const sseHeartbeatInterval = setInterval(() => {
  const ping = `data: ${JSON.stringify({ type: 'HEARTBEAT', timestamp: new Date().toISOString() })}\n\n`;
  sseClientsMap.forEach((clients, matchId) => {
    for (let i = clients.length - 1; i >= 0; i--) {
      try {
        clients[i].write(ping);
      } catch {
        clients.splice(i, 1);
      }
    }
    if (clients.length === 0) {
      sseClientsMap.delete(matchId);
    }
  });
}, 15000);
sseHeartbeatInterval.unref();

export function closeAllScoringSseClients(): void {
  try {
    clearInterval(sseHeartbeatInterval);
  } catch {}
  sseClientsMap.forEach((clients) => {
    for (const client of clients) {
      try {
        client.write(`data: ${JSON.stringify({ type: 'SERVER_SHUTDOWN', timestamp: new Date().toISOString() })}\n\n`);
        client.end();
      } catch {}
    }
  });
  sseClientsMap.clear();
}

export function broadcastScoringUpdate(matchId: string, state: any) {
  const clients = sseClientsMap.get(matchId);
  if (!clients || clients.length === 0) return;

  const eventSeq = Date.now();
  const payload = {
    ...state,
    matchId,
    type: 'SCORING_UPDATE',
    eventId: state?.lastEvent?.id || `seq_${eventSeq}_${Math.random().toString(36).substring(2, 7)}`,
    sequence: eventSeq,
    scoringState: state,
  };
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (let i = clients.length - 1; i >= 0; i--) {
    try {
      clients[i].write(data);
    } catch {
      clients.splice(i, 1);
    }
  }
}

/**
 * Helper to compute sport-specific state for any match
 */
export function getScoringStateForMatch(match: Match) {
  const db = getDb();
  const matchId = match.id;
  const allPlayers = db.players || [];

  if (match.sport === 'VOLLEYBALL') {
    const setsList: VolleyballSet[] = (db.volleyball_sets || []).filter((s) => s.matchId === matchId);
    const events: VolleyballPointEvent[] = (db.volleyball_events || []).filter((e) => e.matchId === matchId);
    const timeouts: VolleyballTimeout[] = (db.volleyball_timeouts || []).filter((t) => t.matchId === matchId);
    const substitutions: VolleyballSubstitution[] = (db.volleyball_substitutions || []).filter((s) => s.matchId === matchId);
    const rotations: VolleyballRotation[] = (db.volleyball_rotations || []).filter(
      (r) => r.teamId === match.teamAId || r.teamId === match.teamBId
    );
    return calculateVolleyballScoringState(
      match,
      setsList,
      events,
      timeouts,
      substitutions,
      rotations,
      allPlayers
    );
  }

  if (match.sport === 'KABADDI') {
    const raids: KabaddiRaidEvent[] = (db.kabaddi_raids || []).filter((r) => r.matchId === matchId && !r.isUndone);
    const timeouts: KabaddiTimeout[] = (db.kabaddi_timeouts || []).filter((t) => t.matchId === matchId);
    const substitutions: KabaddiSubstitution[] = (db.kabaddi_substitutions || []).filter((s) => s.matchId === matchId);
    return calculateKabaddiScoringState(
      match,
      raids,
      timeouts,
      substitutions,
      allPlayers
    );
  }

  if (match.sport === 'HOCKEY') {
    const events: HockeyScoringEvent[] = (db.hockey_scoring_events || []).filter(
      (e) => e.matchId === matchId && !e.isUndone
    );
    const clockState = (db.hockey_clock_states || []).find((c) => c.matchId === matchId);
    return calculateHockeyScoringState(match, events, clockState, allPlayers);
  }

  if (match.sport === 'FOOTBALL') {
    const events: FootballScoringEvent[] = (db.football_scoring_events || []).filter(
      (e: any) => e.matchId === matchId && !e.isUndone
    );
    const clockState = (db.football_clock_states || []).find((c: any) => c.matchId === matchId);
    return calculateFootballScoringState(match, events, clockState, allPlayers);
  }

  if (match.sport === 'BASKETBALL') {
    const events: BasketballScoringEvent[] = (db.basketball_scoring_events || []).filter(
      (e: any) => e.matchId === matchId && !e.isUndone
    );
    const clockState = (db.basketball_clock_states || []).find((c: any) => c.matchId === matchId);
    return calculateBasketballScoringState(match, events, clockState, allPlayers);
  }

  if (match.sport === 'TENNIS') {
    const events: TennisScoringEvent[] = (db.tennis_scoring_events || []).filter(
      (e: any) => e.matchId === matchId && !e.isUndone
    );
    const serveState = (db.tennis_serve_states || []).find((s: any) => s.matchId === matchId);
    return calculateTennisScoringState(match, events, allPlayers, serveState?.serverPlayerId);
  }

  if (match.sport === 'BADMINTON') {
    const events: BadmintonScoringEvent[] = (db.badminton_scoring_events || []).filter(
      (e: any) => e.matchId === matchId && !e.isUndone
    );
    const serveState = (db.badminton_serve_states || []).find((s: any) => s.matchId === matchId);
    const teamAPlayers = allPlayers.filter((p) => p.teamId === match.teamAId);
    const teamBPlayers = allPlayers.filter((p) => p.teamId === match.teamBId);
    const matchWithPlayers: Match = {
      ...match,
      teamAPlayers: match.teamAPlayers && match.teamAPlayers.length > 0 ? match.teamAPlayers : teamAPlayers,
      teamBPlayers: match.teamBPlayers && match.teamBPlayers.length > 0 ? match.teamBPlayers : teamBPlayers,
    };
    return calculateBadmintonScoringState(matchWithPlayers, events, serveState);
  }

  if (match.sport === 'TABLE_TENNIS') {
    const events: TableTennisScoringEvent[] = (db.table_tennis_scoring_events || []).filter(
      (e: any) => e.matchId === matchId && !e.isUndone
    );
    const serveState = (db.table_tennis_serve_states || []).find((s: any) => s.matchId === matchId);
    const teamAPlayers = allPlayers.filter((p) => p.teamId === match.teamAId);
    const teamBPlayers = allPlayers.filter((p) => p.teamId === match.teamBId);
    const matchWithPlayers: Match = {
      ...match,
      teamAPlayers: match.teamAPlayers && match.teamAPlayers.length > 0 ? match.teamAPlayers : teamAPlayers,
      teamBPlayers: match.teamBPlayers && match.teamBPlayers.length > 0 ? match.teamBPlayers : teamBPlayers,
    };
    return calculateTableTennisScoringState(matchWithPlayers, events, serveState);
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
    const events: CustomScoringEvent[] = (db.custom_scoring_events || []).filter(
      (e: any) => e.matchId === matchId && !e.isUndone
    );
    const clockState = (db.custom_clock_states || []).find((c: any) => c.matchId === matchId);
    const timeouts = (db.custom_timeouts || []).filter((t: any) => t.matchId === matchId);
    const substitutions = (db.custom_substitutions || []).filter((s: any) => s.matchId === matchId);
    const teamAPlayers = allPlayers.filter((p) => p.teamId === match.teamAId);
    const teamBPlayers = allPlayers.filter((p) => p.teamId === match.teamBId);
    const matchWithPlayers: Match = {
      ...match,
      teamAPlayers: match.teamAPlayers && match.teamAPlayers.length > 0 ? match.teamAPlayers : teamAPlayers,
      teamBPlayers: match.teamBPlayers && match.teamBPlayers.length > 0 ? match.teamBPlayers : teamBPlayers,
    };
    return calculateCustomSportScoringState(
      matchWithPlayers,
      events,
      db.custom_sports || [],
      clockState,
      timeouts,
      substitutions
    );
  }

  // Default: Cricket
  const inningsList: CricketInnings[] = (db.match_innings || []).filter((i) => i.matchId === matchId);
  const events: CricketBallEvent[] = (db.scoring_events || []).filter((e) => e.matchId === matchId);
  const tournament = (db.tournaments || []).find((t) => t.id === match.tournamentId);
  return calculateCricketScoringState(match, inningsList, events, allPlayers, tournament);
}

/**
 * GET /api/matches/:id/scoring (and /state)
 * Get complete live scoring state for a match
 */
router.get(['/', '/state'], (req: Request, res: Response): void => {
  const db = getDb();
  const matchId = (req.params as any).id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  const user = getUserFromRequest(req);
  const tournament = db.tournaments.find((t) => t.id === match.tournamentId);
  const isMatchPublic = match.isPublic !== false && (!tournament || tournament.isPublic !== false);
  if (!isMatchPublic && !canUserAccessMatch(user, match, 'VIEW')) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to view scoring for this match.' });
    return;
  }

  const state = getScoringStateForMatch(match);
  res.json({ state });
});

/**
 * GET /api/matches/:id/scoring/stream (and /live, /live-sse)
 * Realtime Server-Sent Events (SSE) endpoint for score updates
 */
router.get(['/stream', '/live', '/live-sse', '/sse'], (req, res): void => {
  const matchId = (req.params as any).id;
  const db = getDb();
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  const user = getUserFromRequest(req);
  const tournament = db.tournaments.find((t) => t.id === match.tournamentId);
  const isMatchPublic = match.isPublic !== false && (!tournament || tournament.isPublic !== false);
  if (!isMatchPublic && !canUserAccessMatch(user, match, 'VIEW')) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to subscribe to this match stream.' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  if (!sseClientsMap.has(matchId)) {
    sseClientsMap.set(matchId, []);
  }
  sseClientsMap.get(matchId)!.push(res);

  // Send initial state ping with full broadcast & on-air context
  if (match) {
    const state = getScoringStateForMatch(match);
    const config = (db.broadcast_configs || []).find((c) => c.matchId === matchId);
    import('../services/graphicAssignmentService')
      .then(({ getOnAirState }) => {
        import('../services/graphicDataResolver')
          .then(({ buildGraphicDataContext }) => {
            const onAirState = getOnAirState(matchId);
            const dataContext = buildGraphicDataContext(match, state);
            try {
              res.write(
                `data: ${JSON.stringify({
                  ...state,
                  match,
                  broadcastConfig: config,
                  onAirState,
                  assignedOnAirGraphic: onAirState.currentOnAir,
                  dataContext,
                })}\n\n`
              );
            } catch {
              // client disconnected
            }
          })
          .catch(() => {
            try {
              res.write(`data: ${JSON.stringify(state)}\n\n`);
            } catch {}
          });
      })
      .catch(() => {
        try {
          res.write(`data: ${JSON.stringify(state)}\n\n`);
        } catch {}
      });
  }

  req.on('close', () => {
    const clients = sseClientsMap.get(matchId) || [];
    sseClientsMap.set(
      matchId,
      clients.filter((c) => c !== res)
    );
  });
});

// Enforce SCORING authorization for all mutating scoring operations across all sports
router.use(requireAuth, (req: AuthenticatedRequest, res: Response, next) => {
  if (req.method === 'GET') {
    return next();
  }

  const matchId = (req.params as any).id || (req.params as any).matchId || req.body?.matchId || (req.query?.matchId as string);
  if (!matchId) {
    res.status(400).json({ error: 'Match ID is required.' });
    return;
  }

  const db = getDb();
  const match = db.matches?.find((m) => m.id === matchId);
  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (!canUserAccessMatch(req.user, match, 'SCORING')) {
    res.status(403).json({ error: 'Forbidden: You do not have authorization to score or modify this match.' });
    return;
  }

  // Completed matches remain locked against all scoring operations
  if (match.status === 'COMPLETED' && !req.path.includes('reopen')) {
    res.status(400).json({ error: 'Match is completed. Scoring is locked.' });
    return;
  }

  // Enforce server-side sport alignment: match sport must match scoring engine
  const p = req.path.toLowerCase();
  if (p.startsWith('/volleyball')) {
    if (match.sport !== 'VOLLEYBALL') {
      res.status(400).json({ error: 'This match is not configured for Volleyball scoring.' });
      return;
    }
  } else if (p.startsWith('/kabaddi')) {
    if (match.sport !== 'KABADDI') {
      res.status(400).json({ error: 'This match is not configured for Kabaddi scoring.' });
      return;
    }
  } else if (p.startsWith('/hockey')) {
    if (match.sport !== 'HOCKEY') {
      res.status(400).json({ error: 'This match is not configured for Hockey scoring.' });
      return;
    }
  } else if (p.startsWith('/football')) {
    if (match.sport !== 'FOOTBALL') {
      res.status(400).json({ error: 'This match is not configured for Football scoring.' });
      return;
    }
  } else if (p.startsWith('/basketball')) {
    if (match.sport !== 'BASKETBALL') {
      res.status(400).json({ error: 'This match is not configured for Basketball scoring.' });
      return;
    }
  } else if (p.startsWith('/tennis')) {
    if (match.sport !== 'TENNIS') {
      res.status(400).json({ error: 'This match is not configured for Tennis scoring.' });
      return;
    }
  } else if (p.startsWith('/badminton')) {
    if (match.sport !== 'BADMINTON') {
      res.status(400).json({ error: 'This match is not configured for Badminton scoring.' });
      return;
    }
  } else if (p.startsWith('/table-tennis')) {
    if (match.sport !== 'TABLE_TENNIS') {
      res.status(400).json({ error: 'This match is not configured for Table Tennis scoring.' });
      return;
    }
  } else if (p.startsWith('/custom')) {
    const isCustom =
      match.sport === 'CUSTOM' ||
      match.sport === 'PICKLEBALL' ||
      match.sport === 'HANDBALL' ||
      match.sport === 'SQUASH' ||
      (db.custom_sports || []).some(
        (cs: any) => cs.id === match.sport || cs.name?.toUpperCase() === String(match.sport).toUpperCase()
      );
    if (!isCustom) {
      res.status(400).json({ error: 'This match is not configured for Custom sport scoring.' });
      return;
    }
  } else if (
    p.startsWith('/ball') ||
    p.startsWith('/over') ||
    p.startsWith('/innings/close') ||
    p.startsWith('/target') ||
    p.startsWith('/dls')
  ) {
    if (match.sport !== 'CRICKET') {
      res.status(400).json({ error: 'This match is not configured for Cricket scoring.' });
      return;
    }
  } else if (p.startsWith('/start') && match.sport !== 'CRICKET' && match.sport !== 'VOLLEYBALL') {
    res.status(400).json({ error: `This match is not configured for Cricket or Volleyball scoring.` });
    return;
  }

  next();
});

// ==========================================
// CRICKET SPECIFIC SCORING ENDPOINTS
// ==========================================

/**
 * POST /api/matches/:id/scoring/start (Cricket)
 */
router.post('/start', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (match.status === 'COMPLETED') {
    res.status(400).json({ error: 'Match is completed. Scoring is locked.' });
    return;
  }

  if (match.sport === 'VOLLEYBALL') {
    // If called on volleyball match, route to volleyball initialization
    initializeVolleyballMatch(req, res, match, db);
    return;
  }

  const { battingTeamId, bowlingTeamId, strikerId, nonStrikerId, bowlerId } = req.body;

  if (!battingTeamId || !bowlingTeamId || !strikerId || !nonStrikerId || !bowlerId) {
    res.status(400).json({ error: 'Batting team, bowling team, striker, non-striker, and bowler are required.' });
    return;
  }

  if (strikerId === nonStrikerId) {
    res.status(400).json({ error: 'Striker and non-striker must be different players.' });
    return;
  }

  const striker = db.players.find((p) => p.id === strikerId);
  const nonStriker = db.players.find((p) => p.id === nonStrikerId);
  const bowler = db.players.find((p) => p.id === bowlerId);
  if (!striker || !nonStriker || !bowler) {
    res.status(400).json({ error: 'Selected players must exist in the database.' });
    return;
  }

  match.status = 'LIVE';
  match.updatedAt = new Date().toISOString();

  let innings1 = (db.match_innings || []).find((i) => i.matchId === matchId && i.inningsNumber === 1);
  if (!innings1) {
    innings1 = {
      id: crypto.randomUUID(),
      matchId,
      inningsNumber: 1,
      battingTeamId,
      bowlingTeamId,
      status: 'IN_PROGRESS',
      totalRuns: 0,
      totalWickets: 0,
      totalOvers: 0,
      legalBallsCount: 0,
      currentStrikerId: strikerId,
      currentNonStrikerId: nonStrikerId,
      currentBowlerId: bowlerId,
      startTime: new Date().toISOString(),
    };
    db.match_innings.push(innings1);
  } else {
    innings1.battingTeamId = battingTeamId;
    innings1.bowlingTeamId = bowlingTeamId;
    innings1.currentStrikerId = strikerId;
    innings1.currentNonStrikerId = nonStrikerId;
    innings1.currentBowlerId = bowlerId;
    innings1.status = 'IN_PROGRESS';
  }

  const user = (req as any).user;
  const auditLog: AuditLog = {
    id: crypto.randomUUID(),
    userId: user?.id,
    userName: user?.name,
    userEmail: user?.email,
    action: 'MATCH_SCORE_START',
    details: `Started live scoring for cricket match "${match.name}". Innings 1 started.`,
    timestamp: new Date().toISOString(),
  };
  db.audit_logs.unshift(auditLog);

  saveDatabase();

  const state = getScoringStateForMatch(match);
  broadcastScoringUpdate(matchId, state);
  res.json({ message: 'Live scoring started successfully.', state });
});

/**
 * POST /api/matches/:id/scoring/ball (Cricket)
 */
router.post('/ball', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (match.status === 'COMPLETED') {
    res.status(400).json({ error: 'Cannot record delivery or extra on a completed match.' });
    return;
  }

  // Auto-transition to LIVE if match was SCHEDULED, READY, PAUSED, DRAFT, etc.
  if (match.status !== 'LIVE') {
    match.status = 'LIVE';
    match.updatedAt = new Date().toISOString();
  }

  const {
    runsOffBat = 0,
    extraRuns = 0,
    extraType: rawExtraType = 'NONE',
    isWide = false,
    isNoBall = false,
    isBye = false,
    isLegBye = false,
    isPenalty = false,
    isWicket = false,
    wicketType: rawWicketType,
    dismissalType,
    dismissedPlayerId,
    fielderId,
    assistFielderId,
    newStrikerId,
    newNonStrikerId,
    newBowlerId,
  } = req.body;

  const runsOffBatNum = Number(runsOffBat);
  if (isNaN(runsOffBatNum) || runsOffBatNum < 0 || runsOffBatNum > 6) {
    res.status(400).json({ error: 'runsOffBat must be an integer between 0 and 6.' });
    return;
  }

  const extraRunsNum = Number(extraRuns);
  if (isNaN(extraRunsNum) || extraRunsNum < 0 || extraRunsNum > 20) {
    res.status(400).json({ error: 'extraRuns cannot be negative or excessively large.' });
    return;
  }

  const VALID_EXTRAS = ['NONE', 'WIDE', 'NO_BALL', 'BYE', 'LEG_BYE', 'PENALTY'];
  if (rawExtraType && !VALID_EXTRAS.includes(rawExtraType)) {
    res.status(400).json({ error: `Invalid extraType "${rawExtraType}". Allowed values: ${VALID_EXTRAS.join(', ')}.` });
    return;
  }

  let extraType = rawExtraType;
  if (extraType === 'NONE') {
    if (isWide) extraType = 'WIDE';
    else if (isNoBall) extraType = 'NO_BALL';
    else if (isBye) extraType = 'BYE';
    else if (isLegBye) extraType = 'LEG_BYE';
    else if (isPenalty) extraType = 'PENALTY';
  }
  const wicketType = rawWicketType || dismissalType || (isWicket ? 'BOWLED' : undefined);
  const resolvedExtraRuns = (extraType === 'WIDE' || extraType === 'NO_BALL') && Number(extraRuns) === 0 ? 1 : Number(extraRuns);

  const inningsList = (db.match_innings || []).filter((i) => i.matchId === matchId);
  let currentInnings = inningsList.find((i) => i.status === 'IN_PROGRESS');

  if (!currentInnings) {
    // If an existing innings is present and not completed, resume it
    const lastInnings = inningsList[inningsList.length - 1];
    if (lastInnings && lastInnings.status !== 'COMPLETED') {
      lastInnings.status = 'IN_PROGRESS';
      currentInnings = lastInnings;
    } else if (inningsList.length === 0) {
      // Auto-initialize Innings 1 using toss winner or team A
      const battingTeamId =
        match.toss?.winnerTeamId && match.toss.decision === 'BAT'
          ? match.toss.winnerTeamId
          : match.toss?.winnerTeamId && match.toss.decision === 'BOWL'
          ? match.toss.winnerTeamId === match.teamAId
            ? match.teamBId
            : match.teamAId
          : match.teamAId;
      const bowlingTeamId = battingTeamId === match.teamAId ? match.teamBId : match.teamAId;

      const battingPlayers = (db.players || []).filter((p) => p.teamId === battingTeamId);
      const bowlingPlayers = (db.players || []).filter((p) => p.teamId === bowlingTeamId);

      const sId = battingPlayers[0]?.id || 'striker-1';
      const nsId = battingPlayers[1]?.id || (battingPlayers[0]?.id ? battingPlayers[0]?.id : 'non-striker-1');
      const bId = bowlingPlayers[0]?.id || 'bowler-1';

      currentInnings = {
        id: crypto.randomUUID(),
        matchId,
        inningsNumber: 1,
        battingTeamId,
        bowlingTeamId,
        status: 'IN_PROGRESS',
        totalRuns: 0,
        totalWickets: 0,
        totalOvers: 0,
        legalBallsCount: 0,
        currentStrikerId: sId,
        currentNonStrikerId: nsId,
        currentBowlerId: bId,
        startTime: new Date().toISOString(),
      };
      if (!db.match_innings) db.match_innings = [];
      db.match_innings.push(currentInnings);
    } else {
      res.status(400).json({ error: 'No active in-progress innings found for this match.' });
      return;
    }
  }

  const existingEvents: CricketBallEvent[] = (db.scoring_events || []).filter(
    (e) => e.matchId === matchId && e.inningsNumber === currentInnings!.inningsNumber && !e.isUndone
  );

  const legalBallsInInnings = existingEvents.filter((e) => e.isLegalBall).length;
  const isLegalBall = !['WIDE', 'NO_BALL'].includes(extraType);

  const currentOverNumber = Math.floor(legalBallsInInnings / 6);
  const legalBallInOver = (legalBallsInInnings % 6) + (isLegalBall ? 1 : 0);
  const overDisplay = `${currentOverNumber}.${legalBallInOver}`;

  let strikerId = currentInnings.currentStrikerId || '';
  let nonStrikerId = currentInnings.currentNonStrikerId || '';
  let bowlerId = currentInnings.currentBowlerId || '';

  if (!strikerId || !nonStrikerId || !bowlerId) {
    const battingPlayers = (db.players || []).filter((p) => p.teamId === currentInnings.battingTeamId);
    const bowlingPlayers = (db.players || []).filter((p) => p.teamId === currentInnings.bowlingTeamId);
    if (!strikerId) strikerId = battingPlayers[0]?.id || 'striker-1';
    if (!nonStrikerId) nonStrikerId = battingPlayers[1]?.id || strikerId;
    if (!bowlerId) bowlerId = bowlingPlayers[0]?.id || 'bowler-1';
    currentInnings.currentStrikerId = strikerId;
    currentInnings.currentNonStrikerId = nonStrikerId;
    currentInnings.currentBowlerId = bowlerId;
  }

  const isFour = runsOffBat === 4 || (extraType === 'NONE' && runsOffBat >= 4);
  const isSix = runsOffBat === 6 || (extraType === 'NONE' && runsOffBat >= 6);

  let eventType: BroadcastEventType = 'BALL';
  if (isWicket) {
    eventType = 'WICKET';
  } else if (isSix) {
    eventType = 'SIX';
  } else if (isFour) {
    eventType = 'FOUR';
  } else if (extraType === 'WIDE') {
    eventType = 'WIDE';
  } else if (extraType === 'NO_BALL') {
    eventType = 'NO_BALL';
  }

  const ballEvent: CricketBallEvent = {
    id: crypto.randomUUID(),
    matchId,
    inningsNumber: currentInnings.inningsNumber,
    eventSequence: (db.scoring_events || []).filter((e) => e.matchId === matchId).length + 1,
    ballSequence: (db.scoring_events || []).filter((e) => e.matchId === matchId).length + 1,
    overNumber: currentOverNumber,
    ballNumberInOver: legalBallInOver,
    ballInOver: legalBallInOver,
    overDisplay,
    battingTeamId: currentInnings.battingTeamId,
    bowlingTeamId: currentInnings.bowlingTeamId,
    strikerId,
    nonStrikerId,
    bowlerId,
    runsOffBat: Number(runsOffBat),
    extraRuns: resolvedExtraRuns,
    extraType: extraType as ExtraType,
    isLegalBall,
    totalRuns: Number(runsOffBat) + resolvedExtraRuns,
    isWicket: Boolean(isWicket),
    wicketType: isWicket ? (wicketType as WicketType) : undefined,
    dismissedPlayerId: isWicket ? dismissedPlayerId : undefined,
    fielderId: isWicket ? fielderId : undefined,
    assistFielderId: isWicket ? assistFielderId : undefined,
    isFour,
    isSix,
    eventType,
    timestamp: new Date().toISOString(),
    enteredByUserId: req.user?.id,
    enteredByUserName: req.user?.name,
  };

  if (!db.scoring_events) db.scoring_events = [];
  db.scoring_events.push(ballEvent);

  let nextStriker = strikerId;
  let nextNonStriker = nonStrikerId;
  const ranRuns = extraType === 'BYE' || extraType === 'LEG_BYE' ? extraRuns : runsOffBat;
  const isOddRuns = ranRuns % 2 !== 0;

  if (isWicket) {
    if (dismissedPlayerId === strikerId) {
      nextStriker = newStrikerId || strikerId;
    } else if (dismissedPlayerId === nonStrikerId) {
      nextNonStriker = newStrikerId || nonStrikerId;
    }
  } else {
    if (isOddRuns) {
      nextStriker = nonStrikerId;
      nextNonStriker = strikerId;
    }
  }

  const newLegalTotal = legalBallsInInnings + (isLegalBall ? 1 : 0);
  const overJustEnded = isLegalBall && newLegalTotal % 6 === 0;

  if (overJustEnded) {
    const temp = nextStriker;
    nextStriker = nextNonStriker;
    nextNonStriker = temp;
    currentInnings.lastBowlerId = bowlerId;
    if (newBowlerId) {
      currentInnings.currentBowlerId = newBowlerId;
    }
  }

  currentInnings.currentStrikerId = nextStriker;
  currentInnings.currentNonStrikerId = nextNonStriker;

  saveDatabase();

  const state = getScoringStateForMatch(match);
  broadcastScoringUpdate(matchId, state);
  res.json({ message: 'Ball recorded successfully.', state });
});

/**
 * POST /api/matches/:id/scoring/bowler (Cricket)
 */
router.post('/bowler', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (match.status === 'COMPLETED') {
    res.status(400).json({ error: 'Match is completed. Scoring is locked.' });
    return;
  }

  const { bowlerId } = req.body;

  if (!bowlerId) {
    res.status(400).json({ error: 'Bowler ID is required.' });
    return;
  }

  const inningsList = (db.match_innings || []).filter((i) => i.matchId === matchId);
  const currentInnings = inningsList.find((i) => i.status === 'IN_PROGRESS');

  if (!currentInnings) {
    res.status(400).json({ error: 'No active in-progress innings.' });
    return;
  }

  currentInnings.currentBowlerId = bowlerId;
  saveDatabase();

  const state = getScoringStateForMatch(match);
  broadcastScoringUpdate(matchId, state);
  res.json({ message: 'Bowler updated.', state });
});

/**
 * POST /api/matches/:id/scoring/swap-strike (Cricket)
 */
router.post('/swap-strike', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (match.status === 'COMPLETED') {
    res.status(400).json({ error: 'Match is completed. Scoring is locked.' });
    return;
  }

  const inningsList = (db.match_innings || []).filter((i) => i.matchId === matchId);
  const currentInnings = inningsList.find((i) => i.status === 'IN_PROGRESS');

  if (!currentInnings) {
    res.status(400).json({ error: 'No active in-progress innings.' });
    return;
  }

  const temp = currentInnings.currentStrikerId;
  currentInnings.currentStrikerId = currentInnings.currentNonStrikerId;
  currentInnings.currentNonStrikerId = temp;

  saveDatabase();

  const state = getScoringStateForMatch(match);
  broadcastScoringUpdate(matchId, state);
  res.json({ message: 'Strike swapped.', state });
});

/**
 * POST /api/matches/:id/scoring/start-innings2 (Cricket)
 */
router.post('/start-innings2', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (match.status === 'COMPLETED') {
    res.status(400).json({ error: 'Match is completed. Scoring is locked.' });
    return;
  }

  const { strikerId, nonStrikerId, bowlerId } = req.body;
  const inningsList = (db.match_innings || []).filter((i) => i.matchId === matchId);
  const innings1 = inningsList.find((i) => i.inningsNumber === 1);

  if (!innings1) {
    res.status(400).json({ error: 'Innings 1 does not exist.' });
    return;
  }

  innings1.status = 'COMPLETED';
  const battingTeamId = innings1.bowlingTeamId;
  const bowlingTeamId = innings1.battingTeamId;

  let innings2 = inningsList.find((i) => i.inningsNumber === 2);
  if (!innings2) {
    innings2 = {
      id: crypto.randomUUID(),
      matchId,
      inningsNumber: 2,
      battingTeamId,
      bowlingTeamId,
      status: 'IN_PROGRESS',
      totalRuns: 0,
      totalWickets: 0,
      totalOvers: 0,
      legalBallsCount: 0,
      targetRuns: (innings1.totalRuns || 0) + 1,
      currentStrikerId: strikerId,
      currentNonStrikerId: nonStrikerId,
      currentBowlerId: bowlerId,
      startTime: new Date().toISOString(),
    };
    db.match_innings.push(innings2);
  } else {
    innings2.status = 'IN_PROGRESS';
    innings2.currentStrikerId = strikerId;
    innings2.currentNonStrikerId = nonStrikerId;
    innings2.currentBowlerId = bowlerId;
  }

  saveDatabase();

  const state = getScoringStateForMatch(match);
  broadcastScoringUpdate(matchId, state);
  res.json({ message: 'Second Innings started.', state });
});

// ==========================================
// VOLLEYBALL LIVE SCORING ACTIONS
// ==========================================

function initializeVolleyballMatch(
  req: AuthenticatedRequest,
  res: Response,
  match: Match,
  db: ReturnType<typeof getDb>
) {
  if (match.status === 'COMPLETED') {
    res.status(400).json({ error: 'Match is completed. Scoring is locked.' });
    return;
  }

  const { servingFirstTeamId, startingPositionsA, startingPositionsB } = req.body;
  const rules = getVolleyballMatchRules(match);

  match.status = 'LIVE';
  match.updatedAt = new Date().toISOString();

  if (!match.volleyballConfig) {
    match.volleyballConfig = {
      format: 'Best of 5',
      pointsPerSet: 25,
      decidingSetPoints: 15,
      winningMargin: 2,
    };
  }
  if (servingFirstTeamId) {
    match.volleyballConfig.servingFirstTeamId = servingFirstTeamId;
  }

  if (!db.volleyball_sets) db.volleyball_sets = [];
  if (!db.volleyball_rotations) db.volleyball_rotations = [];

  // Ensure Set 1 exists
  let set1 = db.volleyball_sets.find((s) => s.matchId === match.id && s.setNumber === 1);
  if (!set1) {
    set1 = {
      id: crypto.randomUUID(),
      matchId: match.id,
      setNumber: 1,
      teamAScore: 0,
      teamBScore: 0,
      targetPoints: rules.normalPoints,
      winningMargin: rules.winningMargin,
      isCompleted: false,
      startTime: new Date().toISOString(),
    };
    db.volleyball_sets.push(set1);
  }

  // Set / initialize rotations for Team A & Team B
  const teamAPlayers = db.players.filter((p) => p.teamId === match.teamAId);
  const teamBPlayers = db.players.filter((p) => p.teamId === match.teamBId);

  const teamASquadIds = match.teamASquad?.playingIds || teamAPlayers.slice(0, 6).map((p) => p.id);
  const teamBSquadIds = match.teamBSquad?.playingIds || teamBPlayers.slice(0, 6).map((p) => p.id);

  let rotA = db.volleyball_rotations.find((r) => r.teamId === match.teamAId);
  if (!rotA) {
    rotA = startingPositionsA || createDefaultRotation(match.teamAId, teamASquadIds);
    db.volleyball_rotations.push(rotA);
  } else if (startingPositionsA) {
    Object.assign(rotA, startingPositionsA);
  }

  let rotB = db.volleyball_rotations.find((r) => r.teamId === match.teamBId);
  if (!rotB) {
    rotB = startingPositionsB || createDefaultRotation(match.teamBId, teamBSquadIds);
    db.volleyball_rotations.push(rotB);
  } else if (startingPositionsB) {
    Object.assign(rotB, startingPositionsB);
  }

  // Audit log
  const auditLog: AuditLog = {
    id: crypto.randomUUID(),
    userId: req.user?.id,
    userName: req.user?.name,
    userEmail: req.user?.email,
    action: 'VOLLEYBALL_MATCH_START',
    details: `Started live scoring for Volleyball match "${match.name}". Set 1 initiated.`,
    timestamp: new Date().toISOString(),
  };
  db.audit_logs.unshift(auditLog);

  saveDatabase();

  const state = getScoringStateForMatch(match);
  broadcastScoringUpdate(match.id, state);
  res.json({ message: 'Volleyball match started successfully.', state });
}

/**
 * POST /api/matches/:id/scoring/volleyball/start
 * Initialize Volleyball Match & Set 1
 */
router.post('/volleyball/start', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  initializeVolleyballMatch(req, res, match, db);
});

/**
 * POST /api/matches/:id/scoring/volleyball/point
 * Record a Point / Rally Event in Volleyball
 */
router.post('/volleyball/point', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (match.status === 'COMPLETED') {
    res.status(400).json({ error: 'Match is completed. Scoring is locked.' });
    return;
  }

  const {
    pointWinner, // teamId
    pointType = 'ATTACK_POINT',
    playerId,
    opponentError = false,
    description,
  } = req.body;

  if (!pointWinner || (pointWinner !== match.teamAId && pointWinner !== match.teamBId)) {
    res.status(400).json({ error: 'Valid pointWinner team ID is required.' });
    return;
  }

  if (!db.volleyball_events) db.volleyball_events = [];
  if (!db.volleyball_sets) db.volleyball_sets = [];

  // Ensure active set exists in db.volleyball_sets
  let currentSetDb = db.volleyball_sets.find((s) => s.matchId === matchId && !s.isCompleted);
  if (!currentSetDb) {
    const rules = getVolleyballMatchRules(match);
    currentSetDb = {
      id: crypto.randomUUID(),
      matchId,
      setNumber: 1,
      teamAScore: 0,
      teamBScore: 0,
      targetPoints: rules.normalPoints,
      winningMargin: rules.winningMargin,
      isCompleted: false,
      startTime: new Date().toISOString(),
    };
    db.volleyball_sets.push(currentSetDb);
  }

  // Get current calculated state before this point
  const currentState = getScoringStateForMatch(match) as any;
  const currentSet = currentState.currentSet;
  const setNumber = currentState.currentSetNumber || 1;

  const activeSetEvents = (db.volleyball_events || []).filter(
    (e) => e.matchId === matchId && e.setNumber === setNumber && !e.isUndone
  );
  const totalRalliesInMatch = (db.volleyball_events || []).filter((e) => e.matchId === matchId && !e.isUndone).length;

  const scoreBefore = {
    teamA: currentSet?.teamAScore || 0,
    teamB: currentSet?.teamBScore || 0,
  };

  const scoreAfter = {
    teamA: pointWinner === match.teamAId ? scoreBefore.teamA + 1 : scoreBefore.teamA,
    teamB: pointWinner === match.teamBId ? scoreBefore.teamB + 1 : scoreBefore.teamB,
  };

  const pointEvent: VolleyballPointEvent = {
    id: crypto.randomUUID(),
    matchId,
    setNumber,
    rallyNumber: totalRalliesInMatch + 1,
    pointWinner,
    serverPlayerId: currentState.serverPlayerId,
    servingTeamId: currentState.servingTeamId,
    pointType: pointType as VolleyballPointType,
    playerId: playerId || undefined,
    opponentError: Boolean(opponentError),
    scoreBefore,
    scoreAfter,
    timestamp: new Date().toISOString(),
    enteredByUserId: req.user?.id,
    enteredByUserName: req.user?.name,
    description: description || undefined,
  };

  db.volleyball_events.push(pointEvent);

  // If match was SCHEDULED or READY or SET BREAK, set to LIVE
  if (match.status !== 'LIVE') {
    match.status = 'LIVE';
  }

  saveDatabase();

  // Re-calculate state after this point
  const newState = getScoringStateForMatch(match) as any;

  // Handle Set completion or Match completion transition
  if (newState.isMatchComplete) {
    match.status = 'COMPLETED';
    match.updatedAt = new Date().toISOString();
  } else if (newState.isSetComplete) {
    match.status = 'SET BREAK';
    match.updatedAt = new Date().toISOString();
  }

  saveDatabase();

  const finalState = getScoringStateForMatch(match);
  broadcastScoringUpdate(matchId, finalState);
  res.json({ message: 'Point recorded successfully.', state: finalState });
});

/**
 * POST /api/matches/:id/scoring/volleyball/start-set
 * Start the Next Set in Volleyball
 */
router.post('/volleyball/start-set', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (match.status === 'COMPLETED') {
    res.status(400).json({ error: 'Match is completed. Scoring is locked.' });
    return;
  }

  const currentState = getScoringStateForMatch(match) as any;
  if (currentState.isMatchComplete) {
    res.status(400).json({ error: 'Match has already ended.' });
    return;
  }

  const nextSetNumber = (currentState.currentSet?.setNumber || 1) + (currentState.isSetComplete ? 1 : 0);
  const rules = getVolleyballMatchRules(match);

  if (nextSetNumber > rules.totalSets) {
    res.status(400).json({ error: 'Maximum set limit reached for this match format.' });
    return;
  }

  if (!db.volleyball_sets) db.volleyball_sets = [];
  let existingSet = db.volleyball_sets.find((s) => s.matchId === matchId && s.setNumber === nextSetNumber);

  if (!existingSet) {
    const isDeciding = nextSetNumber === rules.totalSets;
    existingSet = {
      id: crypto.randomUUID(),
      matchId,
      setNumber: nextSetNumber,
      teamAScore: 0,
      teamBScore: 0,
      targetPoints: isDeciding ? rules.decidingPoints : rules.normalPoints,
      winningMargin: rules.winningMargin,
      isCompleted: false,
      startTime: new Date().toISOString(),
    };
    db.volleyball_sets.push(existingSet);
  } else {
    existingSet.isCompleted = false;
  }

  match.status = 'LIVE';
  match.updatedAt = new Date().toISOString();

  saveDatabase();

  const state = getScoringStateForMatch(match);
  broadcastScoringUpdate(matchId, state);
  res.json({ message: `Set ${nextSetNumber} started.`, state });
});

/**
 * POST /api/matches/:id/scoring/volleyball/timeout
 * Record a Timeout for Team A or Team B
 */
router.post('/volleyball/timeout', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (match.status === 'COMPLETED') {
    res.status(400).json({ error: 'Match is completed. Scoring is locked.' });
    return;
  }

  const { teamId } = req.body;
  if (!teamId || (teamId !== match.teamAId && teamId !== match.teamBId)) {
    res.status(400).json({ error: 'Valid teamId required.' });
    return;
  }

  const currentState = getScoringStateForMatch(match) as any;
  const currentSetNumber = currentState.currentSetNumber || 1;
  const maxTimeouts = currentState.maxTimeoutsPerSet || 2;

  if (!db.volleyball_timeouts) db.volleyball_timeouts = [];

  const existingTimeoutsInSet = db.volleyball_timeouts.filter(
    (t) => t.matchId === matchId && t.setNumber === currentSetNumber && t.teamId === teamId
  );

  if (existingTimeoutsInSet.length >= maxTimeouts) {
    res.status(400).json({
      error: `Maximum timeouts (${maxTimeouts}) already taken for this team in Set ${currentSetNumber}.`,
    });
    return;
  }

  const timeout: VolleyballTimeout = {
    id: crypto.randomUUID(),
    matchId,
    setNumber: currentSetNumber,
    teamId,
    scoreAtTimeout: {
      teamA: currentState.currentSet?.teamAScore || 0,
      teamB: currentState.currentSet?.teamBScore || 0,
    },
    timestamp: new Date().toISOString(),
  };

  db.volleyball_timeouts.push(timeout);
  saveDatabase();

  const state = getScoringStateForMatch(match);
  broadcastScoringUpdate(matchId, state);
  res.json({ message: 'Timeout recorded successfully.', state });
});

/**
 * POST /api/matches/:id/scoring/volleyball/substitution
 * Record a Player Substitution
 */
router.post('/volleyball/substitution', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (match.status === 'COMPLETED') {
    res.status(400).json({ error: 'Match is completed. Scoring is locked.' });
    return;
  }

  const { teamId, playerOutId, playerInId, position = 1 } = req.body;

  if (!teamId || !playerOutId || !playerInId) {
    res.status(400).json({ error: 'teamId, playerOutId, and playerInId are required.' });
    return;
  }

  if (playerOutId === playerInId) {
    res.status(400).json({ error: 'Player in and player out must be different.' });
    return;
  }

  const currentState = getScoringStateForMatch(match) as any;
  const currentSetNumber = currentState.currentSetNumber || 1;
  const maxSubs = currentState.maxSubstitutionsPerSet || 6;

  if (!db.volleyball_substitutions) db.volleyball_substitutions = [];
  if (!db.volleyball_rotations) db.volleyball_rotations = [];

  const existingSubsInSet = db.volleyball_substitutions.filter(
    (s) => s.matchId === matchId && s.setNumber === currentSetNumber && s.teamId === teamId
  );

  if (existingSubsInSet.length >= maxSubs) {
    res.status(400).json({
      error: `Maximum substitutions (${maxSubs}) already reached for this set.`,
    });
    return;
  }

  const sub: VolleyballSubstitution = {
    id: crypto.randomUUID(),
    matchId,
    setNumber: currentSetNumber,
    teamId,
    playerOutId,
    playerInId,
    position: Number(position) || 1,
    timestamp: new Date().toISOString(),
  };

  db.volleyball_substitutions.push(sub);

  // Update rotation
  let rot = db.volleyball_rotations.find((r) => r.teamId === teamId);
  if (!rot) {
    rot = createDefaultRotation(teamId, [playerInId]);
    db.volleyball_rotations.push(rot);
  }

  for (let pos = 1; pos <= 6; pos++) {
    const key = `position${pos}` as keyof VolleyballRotation;
    if (rot[key] === playerOutId) {
      rot[key] = playerInId;
    }
  }

  saveDatabase();

  const state = getScoringStateForMatch(match);
  broadcastScoringUpdate(matchId, state);
  res.json({ message: 'Substitution recorded successfully.', state });
});

/**
 * POST /api/matches/:id/scoring/volleyball/rotation
 * Update team rotation manually
 */
router.post('/volleyball/rotation', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (match.status === 'COMPLETED') {
    res.status(400).json({ error: 'Match is completed. Scoring is locked.' });
    return;
  }

  const { teamId, rotation } = req.body;
  if (!teamId || !rotation) {
    res.status(400).json({ error: 'teamId and rotation positions are required.' });
    return;
  }

  if (!db.volleyball_rotations) db.volleyball_rotations = [];

  let rot = db.volleyball_rotations.find((r) => r.teamId === teamId);
  if (!rot) {
    rot = { teamId, ...rotation };
    db.volleyball_rotations.push(rot);
  } else {
    Object.assign(rot, rotation);
  }

  saveDatabase();

  const state = getScoringStateForMatch(match);
  broadcastScoringUpdate(matchId, state);
  res.json({ message: 'Rotation updated.', state });
});

/**
 * POST /api/matches/:id/scoring/volleyball/server
 * Override current server for serving team
 */
router.post('/volleyball/server', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (match.status === 'COMPLETED') {
    res.status(400).json({ error: 'Match is completed. Scoring is locked.' });
    return;
  }

  const { teamId, serverPlayerId } = req.body;
  if (!teamId || !serverPlayerId) {
    res.status(400).json({ error: 'teamId and serverPlayerId are required.' });
    return;
  }

  if (!db.volleyball_rotations) db.volleyball_rotations = [];

  let rot = db.volleyball_rotations.find((r) => r.teamId === teamId);
  if (!rot) {
    rot = createDefaultRotation(teamId, [serverPlayerId]);
    db.volleyball_rotations.push(rot);
  } else {
    // If player is elsewhere in rotation, swap with position 1
    let foundPos = 0;
    for (let pos = 1; pos <= 6; pos++) {
      const key = `position${pos}` as keyof VolleyballRotation;
      if (rot[key] === serverPlayerId) {
        foundPos = pos;
        break;
      }
    }

    if (foundPos > 1) {
      const oldPos1 = rot.position1;
      rot.position1 = serverPlayerId;
      const swapKey = `position${foundPos}` as keyof VolleyballRotation;
      rot[swapKey] = oldPos1;
    } else {
      rot.position1 = serverPlayerId;
    }
  }

  saveDatabase();

  const state = getScoringStateForMatch(match);
  broadcastScoringUpdate(matchId, state);
  res.json({ message: 'Server updated successfully.', state });
});

/**
 * POST /api/matches/:id/scoring/volleyball/correct-score
 * Manual Score Correction for current set
 */
router.post('/volleyball/correct-score', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (match.status === 'COMPLETED') {
    res.status(400).json({ error: 'Match is completed. Scoring is locked.' });
    return;
  }

  const { teamAScore, teamBScore, setNumber = 1 } = req.body;

  if (teamAScore === undefined || teamBScore === undefined) {
    res.status(400).json({ error: 'teamAScore and teamBScore are required.' });
    return;
  }

  if (!db.volleyball_sets) db.volleyball_sets = [];
  let targetSet = db.volleyball_sets.find((s) => s.matchId === matchId && s.setNumber === Number(setNumber));

  const rules = getVolleyballMatchRules(match);
  const isDeciding = Number(setNumber) === rules.totalSets;

  if (!targetSet) {
    targetSet = {
      id: crypto.randomUUID(),
      matchId,
      setNumber: Number(setNumber),
      teamAScore: Number(teamAScore),
      teamBScore: Number(teamBScore),
      targetPoints: isDeciding ? rules.decidingPoints : rules.normalPoints,
      winningMargin: rules.winningMargin,
      isCompleted: false,
    };
    db.volleyball_sets.push(targetSet);
  } else {
    targetSet.teamAScore = Number(teamAScore);
    targetSet.teamBScore = Number(teamBScore);
  }

  // Audit log
  const auditLog: AuditLog = {
    id: crypto.randomUUID(),
    userId: req.user?.id,
    userName: req.user?.name,
    userEmail: req.user?.email,
    action: 'VOLLEYBALL_SCORE_CORRECTED',
    details: `Manually corrected Set ${setNumber} score to ${teamAScore}-${teamBScore} in match "${match.name}".`,
    timestamp: new Date().toISOString(),
  };
  db.audit_logs.unshift(auditLog);

  saveDatabase();

  const state = getScoringStateForMatch(match);
  broadcastScoringUpdate(matchId, state);
  res.json({ message: 'Score corrected.', state });
});

// ==========================================
// COMMON UNDO, EDIT, AND END MATCH
// ==========================================

/**
 * POST /api/matches/:id/scoring/undo
 * Undo last point (Volleyball) or delivery (Cricket)
 */
router.post('/undo', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (match.sport === 'VOLLEYBALL') {
    const events: VolleyballPointEvent[] = (db.volleyball_events || []).filter(
      (e) => e.matchId === matchId && !e.isUndone
    );

    if (events.length === 0) {
      res.status(400).json({ error: 'No volleyball points to undo.' });
      return;
    }

    events.sort((a, b) => b.rallyNumber - a.rallyNumber);
    const lastEvent = events[0];
    lastEvent.isUndone = true;

    const auditLog: AuditLog = {
      id: crypto.randomUUID(),
      userId: req.user?.id,
      userName: req.user?.name,
      userEmail: req.user?.email,
      action: 'VOLLEYBALL_UNDO_POINT',
      details: `Undid rally #${lastEvent.rallyNumber} in Set ${lastEvent.setNumber} for match "${match.name}".`,
      timestamp: new Date().toISOString(),
    };
    db.audit_logs.unshift(auditLog);

    saveDatabase();

    const state = getScoringStateForMatch(match);
    broadcastScoringUpdate(matchId, state);
    res.json({ message: 'Last volleyball point undone successfully.', state });
    return;
  }

  // Cricket undo
  const events: CricketBallEvent[] = (db.scoring_events || []).filter((e) => e.matchId === matchId && !e.isUndone);

  if (events.length === 0) {
    res.status(400).json({ error: 'No deliveries to undo.' });
    return;
  }

  events.sort((a, b) => b.eventSequence - a.eventSequence);
  const lastEvent = events[0];
  lastEvent.isUndone = true;

  const auditLog: AuditLog = {
    id: crypto.randomUUID(),
    userId: req.user?.id,
    userName: req.user?.name,
    userEmail: req.user?.email,
    action: 'MATCH_SCORE_UNDO',
    details: `Undid ball event #${lastEvent.eventSequence} (${lastEvent.overDisplay}) in match "${match.name}".`,
    timestamp: new Date().toISOString(),
  };
  db.audit_logs.unshift(auditLog);

  saveDatabase();

  const state = getScoringStateForMatch(match);
  broadcastScoringUpdate(matchId, state);
  res.json({ message: 'Last ball undone successfully.', state });
});

/**
 * PUT /api/matches/:id/scoring/edit-last
 * Edit last point (Volleyball) or delivery (Cricket)
 */
router.put('/edit-last', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (match.sport === 'VOLLEYBALL') {
    const events: VolleyballPointEvent[] = (db.volleyball_events || []).filter(
      (e) => e.matchId === matchId && !e.isUndone
    );

    if (events.length === 0) {
      res.status(400).json({ error: 'No volleyball points available to edit.' });
      return;
    }

    events.sort((a, b) => b.rallyNumber - a.rallyNumber);
    const lastEvent = events[0];

    const { pointWinner, pointType, playerId, opponentError, description } = req.body;
    if (pointWinner !== undefined) lastEvent.pointWinner = pointWinner;
    if (pointType !== undefined) lastEvent.pointType = pointType;
    if (playerId !== undefined) lastEvent.playerId = playerId || undefined;
    if (opponentError !== undefined) lastEvent.opponentError = Boolean(opponentError);
    if (description !== undefined) lastEvent.description = description || undefined;
    lastEvent.isEdited = true;

    saveDatabase();

    const state = getScoringStateForMatch(match);
    broadcastScoringUpdate(matchId, state);
    res.json({ message: 'Last volleyball point updated.', state });
    return;
  }

  // Cricket edit
  const events: CricketBallEvent[] = (db.scoring_events || []).filter((e) => e.matchId === matchId && !e.isUndone);

  if (events.length === 0) {
    res.status(400).json({ error: 'No deliveries available to edit.' });
    return;
  }

  events.sort((a, b) => b.eventSequence - a.eventSequence);
  const lastEvent = events[0];

  const { runsOffBat, extraRuns, extraType, isWicket, wicketType, dismissedPlayerId, fielderId } = req.body;

  if (runsOffBat !== undefined) lastEvent.runsOffBat = Number(runsOffBat);
  if (extraRuns !== undefined) lastEvent.extraRuns = Number(extraRuns);
  if (extraType !== undefined) lastEvent.extraType = extraType as ExtraType;

  lastEvent.isLegalBall = !['WIDE', 'NO_BALL'].includes(lastEvent.extraType);
  lastEvent.totalRuns = lastEvent.runsOffBat + lastEvent.extraRuns;
  lastEvent.isFour = lastEvent.runsOffBat === 4;
  lastEvent.isSix = lastEvent.runsOffBat === 6;

  if (isWicket !== undefined) {
    lastEvent.isWicket = Boolean(isWicket);
    lastEvent.wicketType = isWicket ? (wicketType as WicketType) : undefined;
    lastEvent.dismissedPlayerId = isWicket ? dismissedPlayerId : undefined;
    lastEvent.fielderId = isWicket ? fielderId : undefined;
  }

  lastEvent.isEdited = true;
  saveDatabase();

  const state = getScoringStateForMatch(match);
  broadcastScoringUpdate(matchId, state);
  res.json({ message: 'Last ball updated successfully.', state });
});

/**
 * POST /api/matches/:id/scoring/end-match (and /kabaddi/end-match)
 * Complete match across sports
 */
router.post(['/end-match', '/kabaddi/end-match'], requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  match.status = 'COMPLETED';
  match.updatedAt = new Date().toISOString();

  if (match.sport === 'VOLLEYBALL') {
    const sets = (db.volleyball_sets || []).filter((s) => s.matchId === matchId);
    sets.forEach((s) => (s.isCompleted = true));
  } else {
    const inningsList = (db.match_innings || []).filter((i) => i.matchId === matchId);
    inningsList.forEach((i) => (i.status = 'COMPLETED'));
  }

  const auditLog: AuditLog = {
    id: crypto.randomUUID(),
    userId: req.user?.id,
    userName: req.user?.name,
    userEmail: req.user?.email,
    action: 'MATCH_COMPLETED',
    details: `Marked match "${match.name}" as COMPLETED.`,
    timestamp: new Date().toISOString(),
  };
  db.audit_logs.unshift(auditLog);

  saveDatabase();

  const state = getScoringStateForMatch(match);
  broadcastScoringUpdate(matchId, state);
  res.json({ message: 'Match marked as completed.', state });
});

// ==========================================
// KABADDI LIVE SCORING ENDPOINTS
// ==========================================

/**
 * POST /api/matches/:id/scoring/kabaddi/start
 * Start Kabaddi match / set status to LIVE
 */
router.post('/kabaddi/start', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (match.sport !== 'KABADDI') {
    res.status(400).json({ error: 'Match is not a Kabaddi match.' });
    return;
  }

  if (match.status === 'COMPLETED') {
    res.status(400).json({ error: 'Match is completed. Scoring is locked.' });
    return;
  }

  match.status = 'LIVE';
  match.updatedAt = new Date().toISOString();

  const auditLog: AuditLog = {
    id: crypto.randomUUID(),
    userId: req.user?.id,
    userName: req.user?.name,
    userEmail: req.user?.email,
    action: 'MATCH_STATUS_CHANGE',
    details: `Started live scoring for Kabaddi match "${match.name}".`,
    timestamp: new Date().toISOString(),
  };
  db.audit_logs.unshift(auditLog);
  saveDatabase();

  const state = getScoringStateForMatch(match);
  broadcastScoringUpdate(matchId, state);
  res.json({ message: 'Kabaddi match started successfully.', state });
});

/**
 * POST /api/matches/:id/scoring/kabaddi/raid
 * Record an immutable Kabaddi Raid event
 */
router.post('/kabaddi/raid', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (match.sport !== 'KABADDI') {
    res.status(400).json({ error: 'Match is not a Kabaddi match.' });
    return;
  }

  if (match.status === 'COMPLETED') {
    res.status(400).json({ error: 'Match is completed. Scoring is locked.' });
    return;
  }

  if (!db.kabaddi_raids) db.kabaddi_raids = [];

  const existingRaids: KabaddiRaidEvent[] = db.kabaddi_raids.filter(
    (r) => r.matchId === matchId && !r.isUndone
  );

  const prevState = getScoringStateForMatch(match) as KabaddiMatchScoringState;

  const {
    half = prevState.currentHalf || 1,
    raidingTeamId,
    defendingTeamId,
    raiderPlayerId,
    outcome: rawOutcome,
    raidOutcome,
    isDoOrDie = false,
    touchPoints = 0,
    bonusPoints: rawBonusPoints,
    bonusPoint,
    tacklePoints = 0,
    technicalPoints = 0,
    touchedDefenderIds = [],
    tacklingDefenderIds = [],
    isSuperRaid = false,
    isSuperTackle = false,
    raidDurationSeconds = 30,
  } = req.body;

  const touchPtsNum = Number(touchPoints || 0);
  const bonusPtsNum = Number(rawBonusPoints ?? (bonusPoint ? 1 : 0));
  let outcome = rawOutcome || raidOutcome;
  if (!outcome || outcome === 'SUCCESS') {
    if (touchPtsNum + bonusPtsNum >= 3) {
      outcome = 'SUPER_RAID';
    } else if (touchPtsNum > 0 && bonusPtsNum > 0) {
      outcome = 'BONUS_AND_TOUCH';
    } else if (touchPtsNum > 0) {
      outcome = 'TOUCH_POINT';
    } else if (bonusPtsNum > 0) {
      outcome = 'BONUS_POINT';
    } else {
      outcome = 'SUCCESSFUL_RAID';
    }
  }

  const resolvedDefendingTeamId = defendingTeamId || (raidingTeamId === match.teamAId ? match.teamBId : match.teamAId);

  const scoreA_before = prevState.teamAScore;
  const scoreB_before = prevState.teamBScore;

  const raidNumber = existingRaids.length + 1;
  const teamRaidNumber = existingRaids.filter((r) => r.raidingTeamId === raidingTeamId).length + 1;

  // Determine point winner team
  let pointWinnerTeamId = raidingTeamId;
  let totalPts = 0;

  if (['TOUCH_POINT', 'SUCCESSFUL_RAID', 'SUPER_RAID', 'DO_OR_DIE_SUCCESS'].includes(outcome)) {
    pointWinnerTeamId = raidingTeamId;
    totalPts = touchPtsNum + bonusPtsNum;
  } else if (outcome === 'BONUS_POINT') {
    pointWinnerTeamId = raidingTeamId;
    totalPts = bonusPtsNum || 1;
  } else if (outcome === 'BONUS_AND_TOUCH') {
    pointWinnerTeamId = raidingTeamId;
    totalPts = touchPtsNum + bonusPtsNum;
  } else if (['TACKLE_POINT', 'SUPER_TACKLE', 'RAIDER_OUT', 'DO_OR_DIE_FAIL'].includes(outcome)) {
    pointWinnerTeamId = resolvedDefendingTeamId;
    totalPts = isSuperTackle ? 2 : Number(tacklePoints || 1);
  } else if (outcome === 'TECHNICAL_POINT') {
    pointWinnerTeamId = req.body.pointWinnerTeamId || raidingTeamId;
    totalPts = Number(technicalPoints || 1);
  }

  const raidEvent: KabaddiRaidEvent = {
    id: crypto.randomUUID(),
    matchId,
    half: half as 1 | 2,
    raidNumber,
    teamRaidNumber,
    raidingTeamId,
    defendingTeamId: resolvedDefendingTeamId,
    raiderPlayerId,
    outcome: outcome as KabaddiRaidOutcome,
    isDoOrDie: Boolean(isDoOrDie),
    touchPoints: touchPtsNum,
    bonusPoints: bonusPtsNum,
    tacklePoints: Number(tacklePoints || 0),
    allOutPoints: 0,
    technicalPoints: Number(technicalPoints || 0),
    totalPoints: totalPts,
    pointWinnerTeamId,
    touchedDefenderIds,
    tacklingDefenderIds,
    outPlayerIds: [],
    revivedPlayerIds: [],
    isSuperRaid: Boolean(isSuperRaid) || totalPts >= 3 && ['TOUCH_POINT', 'SUCCESSFUL_RAID', 'SUPER_RAID', 'BONUS_AND_TOUCH'].includes(outcome),
    isSuperTackle: Boolean(isSuperTackle) || outcome === 'SUPER_TACKLE',
    isAllOut: false,
    scoreA_before,
    scoreB_before,
    scoreA_after: scoreA_before, // will be updated
    scoreB_after: scoreB_before, // will be updated
    activePlayersA_after: 7,
    activePlayersB_after: 7,
    raidDurationSeconds: Number(raidDurationSeconds),
    timestamp: new Date().toISOString(),
    enteredByUserId: req.user?.id,
    enteredByUserName: req.user?.name,
  };

  db.kabaddi_raids.push(raidEvent);

  // Compute intermediate state to get accurate score and active players after
  const updatedState = getScoringStateForMatch(match) as KabaddiMatchScoringState;
  raidEvent.scoreA_after = updatedState.teamAScore;
  raidEvent.scoreB_after = updatedState.teamBScore;
  raidEvent.activePlayersA_after = updatedState.activeCourtPlayerIdsA.length;
  raidEvent.activePlayersB_after = updatedState.activeCourtPlayerIdsB.length;

  if (match.status === 'SCHEDULED' || match.status === 'DRAFT' || match.status === 'READY') {
    match.status = 'LIVE';
  }
  match.updatedAt = new Date().toISOString();

  // Audit Log
  const auditLog: AuditLog = {
    id: crypto.randomUUID(),
    userId: req.user?.id,
    userName: req.user?.name,
    userEmail: req.user?.email,
    action: 'MATCH_SCORE_UPDATE',
    details: `Recorded Raid #${raidNumber} (${outcome}, ${totalPts} pts) for match "${match.name}".`,
    timestamp: new Date().toISOString(),
  };
  db.audit_logs.unshift(auditLog);

  saveDatabase();

  // Automatic Broadcast Trigger detection
  let manualTriggerEvent: any = undefined;
  if (raidEvent.isSuperRaid) {
    const raider = (db.players || []).find((p) => p.id === raiderPlayerId);
    manualTriggerEvent = {
      type: 'SUPER_RAID',
      durationSeconds: 4,
      data: {
        raiderName: raider?.name || 'Raider',
        points: totalPts,
        teamId: raidingTeamId,
      },
    };
  } else if (raidEvent.isSuperTackle) {
    const tackler = (db.players || []).find((p) => p.id === tacklingDefenderIds[0]);
    manualTriggerEvent = {
      type: 'SUPER_TACKLE',
      durationSeconds: 4,
      data: {
        tacklerName: tackler?.name || 'Defender',
        points: totalPts,
        teamId: defendingTeamId,
      },
    };
  } else if (updatedState.teamAStats.allOutsInflicted > prevState.teamAStats.allOutsInflicted) {
    manualTriggerEvent = {
      type: 'ALL_OUT',
      durationSeconds: 4,
      data: {
        teamName: match.teamB?.name || 'Team B',
        points: 2,
        inflictedBy: match.teamA?.name || 'Team A',
      },
    };
  } else if (updatedState.teamBStats.allOutsInflicted > prevState.teamBStats.allOutsInflicted) {
    manualTriggerEvent = {
      type: 'ALL_OUT',
      durationSeconds: 4,
      data: {
        teamName: match.teamA?.name || 'Team A',
        points: 2,
        inflictedBy: match.teamB?.name || 'Team B',
      },
    };
  } else if (outcome === 'BONUS_POINT') {
    const raider = (db.players || []).find((p) => p.id === raiderPlayerId);
    manualTriggerEvent = {
      type: 'BONUS_POINT',
      durationSeconds: 3,
      data: {
        raiderName: raider?.name || 'Raider',
        points: 1,
        teamId: raidingTeamId,
      },
    };
  }

  const broadcastPayload = {
    ...updatedState,
    manualTriggerEvent,
  };

  broadcastScoringUpdate(matchId, broadcastPayload);
  res.json({ message: 'Raid recorded successfully.', state: updatedState, raid: raidEvent });
});

/**
 * POST /api/matches/:id/scoring/kabaddi/undo
 * Undo the last Kabaddi raid
 */
router.post('/kabaddi/undo', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  const raids = (db.kabaddi_raids || []).filter((r) => r.matchId === matchId && !r.isUndone);
  if (raids.length === 0) {
    res.status(400).json({ error: 'No raids available to undo.' });
    return;
  }

  raids.sort((a, b) => b.raidNumber - a.raidNumber);
  const lastRaid = raids[0];
  lastRaid.isUndone = true;

  const auditLog: AuditLog = {
    id: crypto.randomUUID(),
    userId: req.user?.id,
    userName: req.user?.name,
    userEmail: req.user?.email,
    action: 'MATCH_SCORE_UNDO',
    details: `Undid Raid #${lastRaid.raidNumber} in match "${match.name}".`,
    timestamp: new Date().toISOString(),
  };
  db.audit_logs.unshift(auditLog);

  saveDatabase();

  const state = getScoringStateForMatch(match);
  broadcastScoringUpdate(matchId, state);
  res.json({ message: `Raid #${lastRaid.raidNumber} undone successfully.`, state });
});

/**
 * PUT /api/matches/:id/scoring/kabaddi/raid/:raidId
 * Edit an existing Kabaddi raid
 */
router.put('/kabaddi/raid/:raidId', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const raidId = req.params.raidId;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  const raid = (db.kabaddi_raids || []).find((r) => r.id === raidId && r.matchId === matchId);
  if (!raid) {
    res.status(404).json({ error: 'Raid event not found.' });
    return;
  }

  const {
    outcome,
    touchPoints,
    bonusPoints,
    tacklePoints,
    technicalPoints,
    touchedDefenderIds,
    tacklingDefenderIds,
    isSuperRaid,
    isSuperTackle,
  } = req.body;

  if (outcome !== undefined) raid.outcome = outcome;
  if (touchPoints !== undefined) raid.touchPoints = Number(touchPoints);
  if (bonusPoints !== undefined) raid.bonusPoints = Number(bonusPoints);
  if (tacklePoints !== undefined) raid.tacklePoints = Number(tacklePoints);
  if (technicalPoints !== undefined) raid.technicalPoints = Number(technicalPoints);
  if (touchedDefenderIds !== undefined) raid.touchedDefenderIds = touchedDefenderIds;
  if (tacklingDefenderIds !== undefined) raid.tacklingDefenderIds = tacklingDefenderIds;
  if (isSuperRaid !== undefined) raid.isSuperRaid = Boolean(isSuperRaid);
  if (isSuperTackle !== undefined) raid.isSuperTackle = Boolean(isSuperTackle);

  raid.isEdited = true;
  saveDatabase();

  const state = getScoringStateForMatch(match);
  broadcastScoringUpdate(matchId, state);
  res.json({ message: 'Raid updated successfully.', state, raid });
});

/**
 * POST /api/matches/:id/scoring/kabaddi/timeout
 * Record team timeout
 */
router.post('/kabaddi/timeout', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (match.status === 'COMPLETED') {
    res.status(400).json({ error: 'Match is completed. Scoring is locked.' });
    return;
  }

  if (!db.kabaddi_timeouts) db.kabaddi_timeouts = [];

  const { teamId, half = 1 } = req.body;
  const existingTeamTimeouts = db.kabaddi_timeouts.filter(
    (t) => t.matchId === matchId && t.teamId === teamId && t.half === half
  );

  const timeoutObj: KabaddiTimeout = {
    id: crypto.randomUUID(),
    matchId,
    teamId,
    half: half as 1 | 2,
    timestamp: new Date().toISOString(),
    timeoutNumber: existingTeamTimeouts.length + 1,
  };

  db.kabaddi_timeouts.push(timeoutObj);
  saveDatabase();

  const team = (db.teams || []).find((t) => t.id === teamId);
  const state = getScoringStateForMatch(match);

  const broadcastPayload = {
    ...state,
    manualTriggerEvent: {
      type: 'TIMEOUT',
      durationSeconds: 4,
      data: {
        teamName: team?.name || 'Team',
        half,
        timeoutNumber: timeoutObj.timeoutNumber,
      },
    },
  };

  broadcastScoringUpdate(matchId, broadcastPayload);
  res.json({ message: 'Timeout recorded.', state, timeout: timeoutObj });
});

/**
 * POST /api/matches/:id/scoring/kabaddi/substitution
 * Record a player substitution
 */
router.post('/kabaddi/substitution', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (match.status === 'COMPLETED') {
    res.status(400).json({ error: 'Match is completed. Scoring is locked.' });
    return;
  }

  if (!db.kabaddi_substitutions) db.kabaddi_substitutions = [];

  const { teamId, playerOutId, playerInId, half = 1 } = req.body;
  const existingSubs = db.kabaddi_substitutions.filter((s) => s.matchId === matchId && s.teamId === teamId);

  const subObj: KabaddiSubstitution = {
    id: crypto.randomUUID(),
    matchId,
    teamId,
    playerOutId,
    playerInId,
    half: half as 1 | 2,
    timestamp: new Date().toISOString(),
    substitutionNumber: existingSubs.length + 1,
  };

  db.kabaddi_substitutions.push(subObj);
  saveDatabase();

  const playerOut = (db.players || []).find((p) => p.id === playerOutId);
  const playerIn = (db.players || []).find((p) => p.id === playerInId);
  const state = getScoringStateForMatch(match);

  const broadcastPayload = {
    ...state,
    manualTriggerEvent: {
      type: 'SUBSTITUTION',
      durationSeconds: 4,
      data: {
        playerOutName: playerOut?.name || 'Player Out',
        playerInName: playerIn?.name || 'Player In',
        teamId,
      },
    },
  };

  broadcastScoringUpdate(matchId, broadcastPayload);
  res.json({ message: 'Substitution recorded.', state, substitution: subObj });
});

/**
 * POST /api/matches/:id/scoring/kabaddi/half
 * Transition Half (First Half -> Half Time -> Second Half -> Match Complete)
 */
router.post('/kabaddi/half', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  const { targetStatus } = req.body; // 'HALF_TIME' | 'SECOND_HALF' | 'COMPLETED'

  if (match.status === 'COMPLETED' && targetStatus !== 'COMPLETED') {
    res.status(400).json({ error: 'Match is completed. Scoring is locked.' });
    return;
  }

  if (targetStatus === 'COMPLETED') {
    match.status = 'COMPLETED';
  } else if (targetStatus === 'SECOND_HALF') {
    match.status = 'LIVE';
  }

  match.updatedAt = new Date().toISOString();
  saveDatabase();

  const state = getScoringStateForMatch(match) as KabaddiMatchScoringState;

  let manualTriggerEvent: any = undefined;
  if (targetStatus === 'HALF_TIME') {
    manualTriggerEvent = {
      type: 'HALF_TIME',
      durationSeconds: 5,
      data: {
        scoreA: state.teamAScoreHalf1,
        scoreB: state.teamBScoreHalf1,
        teamAName: match.teamA?.name || 'Team A',
        teamBName: match.teamB?.name || 'Team B',
      },
    };
  } else if (targetStatus === 'COMPLETED') {
    manualTriggerEvent = {
      type: 'MATCH_RESULT',
      durationSeconds: 6,
      data: {
        resultText: state.matchResultText,
        scoreA: state.teamAScore,
        scoreB: state.teamBScore,
        winnerId: state.matchWinnerId,
      },
    };
  }

  const broadcastPayload = {
    ...state,
    manualTriggerEvent,
  };

  broadcastScoringUpdate(matchId, broadcastPayload);
  res.json({ message: `Half transitioned to ${targetStatus}.`, state });
});

// ============================================================================
// FIELD HOCKEY LIVE SCORING ENDPOINTS
// ============================================================================

/**
 * Helper to ensure hockey clock state entry in DB
 */
function getOrCreateHockeyClock(db: any, matchId: string, periodDurationMins: number = 15) {
  if (!db.hockey_clock_states) db.hockey_clock_states = [];
  let clock = db.hockey_clock_states.find((c: any) => c.matchId === matchId);
  if (!clock) {
    clock = {
      matchId,
      isRunning: false,
      elapsedSeconds: 0,
      periodDurationSeconds: periodDurationMins * 60,
      lastStartedAt: undefined,
    };
    db.hockey_clock_states.push(clock);
  }
  return clock;
}

/**
 * POST /api/matches/:id/scoring/hockey/start
 * Initialize hockey match start / ready
 */
router.post('/hockey/start', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (match.status === 'COMPLETED') {
    res.status(400).json({ error: 'Match is completed. Scoring is locked.' });
    return;
  }

  const rules = getHockeyMatchRules(match.hockeyConfig);
  const clock = getOrCreateHockeyClock(db, matchId, rules.periodDuration);
  clock.isRunning = true;
  clock.lastStartedAt = new Date().toISOString();

  if (match.status !== 'LIVE' && match.status !== 'COMPLETED') {
    match.status = 'LIVE';
  }

  if (!db.hockey_scoring_events) db.hockey_scoring_events = [];

  // Log PERIOD_START event
  const periodEvent: HockeyScoringEvent = {
    id: crypto.randomUUID(),
    matchId,
    eventSequence: db.hockey_scoring_events.filter((e: any) => e.matchId === matchId).length + 1,
    period: 1,
    periodType: 'REGULAR',
    periodName: getHockeyPeriodShortName(1, rules.periods),
    matchTimeDisplay: '00:00',
    matchTimeSeconds: 0,
    teamId: match.teamAId,
    eventType: 'PERIOD_START',
    scoreA_before: 0,
    scoreB_before: 0,
    scoreA_after: 0,
    scoreB_after: 0,
    timestamp: new Date().toISOString(),
  };
  db.hockey_scoring_events.push(periodEvent);

  saveDatabase();

  const state = getScoringStateForMatch(match) as HockeyMatchScoringState;
  broadcastScoringUpdate(matchId, {
    ...state,
    manualTriggerEvent: {
      type: 'PERIOD_START',
      durationSeconds: 4,
      data: { periodName: 'Quarter 1', teamAName: match.teamA?.name, teamBName: match.teamB?.name },
    },
  });

  res.json({ message: 'Hockey match started.', state });
});

/**
 * POST /api/matches/:id/scoring/hockey/goal
 * Record a Goal (Field Goal, Penalty Corner Goal, Penalty Stroke Goal, Own Goal)
 */
router.post(['/hockey/goal', '/hockey/event'], requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (match.status === 'COMPLETED') {
    res.status(400).json({ error: 'Match is completed. Scoring is locked.' });
    return;
  }

  if (match.status === 'SCHEDULED' || match.status === 'READY' || match.status === 'DRAFT') {
    match.status = 'LIVE';
    match.updatedAt = new Date().toISOString();
  }

  const {
    teamId,
    playerId,
    assistPlayerId,
    goalType = 'FIELD_GOAL',
    period,
    matchTimeSeconds,
    matchTimeDisplay,
  } = req.body;

  if (!teamId) {
    res.status(400).json({ error: 'Team ID is required.' });
    return;
  }

  if (!db.hockey_scoring_events) db.hockey_scoring_events = [];
  const rules = getHockeyMatchRules(match.hockeyConfig);
  const currentEvents = db.hockey_scoring_events.filter((e: any) => e.matchId === matchId && !e.isUndone);
  const prevState = calculateHockeyScoringState(match, currentEvents, undefined, db.players || []);

  const effectivePeriod = Number(period) || prevState.currentPeriod || 1;
  const periodType =
    effectivePeriod > rules.periods
      ? effectivePeriod > rules.periods + rules.extraTimePeriods
        ? 'SHOOTOUT'
        : 'EXTRA_TIME'
      : 'REGULAR';

  const isTeamA = teamId === match.teamAId;
  const newScoreA = isTeamA ? prevState.teamAScore + 1 : prevState.teamAScore;
  const newScoreB = !isTeamA ? prevState.teamBScore + 1 : prevState.teamBScore;

  const player = (db.players || []).find((p: any) => p.id === playerId);
  const assistPlayer = (db.players || []).find((p: any) => p.id === assistPlayerId);
  const scoringTeam = isTeamA ? match.teamA : match.teamB;

  const goalEvent: HockeyScoringEvent = {
    id: crypto.randomUUID(),
    matchId,
    eventSequence: currentEvents.length + 1,
    period: effectivePeriod,
    periodType,
    periodName: getHockeyPeriodShortName(effectivePeriod, rules.periods),
    matchTimeDisplay: matchTimeDisplay || '00:00',
    matchTimeSeconds: Number(matchTimeSeconds) || 0,
    teamId,
    teamName: scoringTeam?.name,
    playerId,
    playerName: player?.name,
    assistPlayerId,
    assistPlayerName: assistPlayer?.name,
    eventType: 'GOAL',
    goalType,
    scoreA_before: prevState.teamAScore,
    scoreB_before: prevState.teamBScore,
    scoreA_after: newScoreA,
    scoreB_after: newScoreB,
    timestamp: new Date().toISOString(),
  };

  db.hockey_scoring_events.push(goalEvent);
  saveDatabase();

  const state = getScoringStateForMatch(match) as HockeyMatchScoringState;
  const broadcastPayload = {
    ...state,
    manualTriggerEvent: {
      type: 'GOAL',
      durationSeconds: 6,
      data: {
        teamName: scoringTeam?.name,
        scorerName: player?.name || 'Goal',
        assistName: assistPlayer?.name,
        goalType,
        scoreA: newScoreA,
        scoreB: newScoreB,
        matchTimeDisplay: goalEvent.matchTimeDisplay,
      },
    },
  };

  broadcastScoringUpdate(matchId, broadcastPayload);
  res.json({ message: 'Goal recorded successfully.', state });
});

/**
 * POST /api/matches/:id/scoring/hockey/penalty-corner
 * Record Penalty Corner
 */
router.post('/hockey/penalty-corner', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (match.status === 'COMPLETED') {
    res.status(400).json({ error: 'Match is completed. Scoring is locked.' });
    return;
  }

  if (match.status === 'SCHEDULED' || match.status === 'READY' || match.status === 'DRAFT') {
    match.status = 'LIVE';
    match.updatedAt = new Date().toISOString();
  }

  const {
    teamId,
    playerId,
    outcome = 'NO_GOAL',
    period,
    matchTimeSeconds,
    matchTimeDisplay,
  } = req.body;

  if (!teamId) {
    res.status(400).json({ error: 'Team ID is required.' });
    return;
  }

  if (!db.hockey_scoring_events) db.hockey_scoring_events = [];
  const rules = getHockeyMatchRules(match.hockeyConfig);
  const currentEvents = db.hockey_scoring_events.filter((e: any) => e.matchId === matchId && !e.isUndone);
  const prevState = calculateHockeyScoringState(match, currentEvents, undefined, db.players || []);

  const effectivePeriod = Number(period) || prevState.currentPeriod || 1;
  const player = (db.players || []).find((p: any) => p.id === playerId);
  const team = teamId === match.teamAId ? match.teamA : match.teamB;

  const pcEvent: HockeyScoringEvent = {
    id: crypto.randomUUID(),
    matchId,
    eventSequence: currentEvents.length + 1,
    period: effectivePeriod,
    periodType: effectivePeriod > rules.periods ? 'EXTRA_TIME' : 'REGULAR',
    periodName: getHockeyPeriodShortName(effectivePeriod, rules.periods),
    matchTimeDisplay: matchTimeDisplay || '00:00',
    matchTimeSeconds: Number(matchTimeSeconds) || 0,
    teamId,
    teamName: team?.name,
    playerId,
    playerName: player?.name,
    eventType: 'PENALTY_CORNER',
    penaltyCornerOutcome: outcome,
    scoreA_before: prevState.teamAScore,
    scoreB_before: prevState.teamBScore,
    scoreA_after: prevState.teamAScore,
    scoreB_after: prevState.teamBScore,
    timestamp: new Date().toISOString(),
  };

  db.hockey_scoring_events.push(pcEvent);
  saveDatabase();

  const state = getScoringStateForMatch(match) as HockeyMatchScoringState;
  broadcastScoringUpdate(matchId, {
    ...state,
    manualTriggerEvent: {
      type: 'PENALTY_CORNER',
      durationSeconds: 5,
      data: {
        teamName: team?.name,
        outcome,
        matchTimeDisplay: pcEvent.matchTimeDisplay,
      },
    },
  });

  res.json({ message: 'Penalty corner recorded.', state });
});

/**
 * POST /api/matches/:id/scoring/hockey/penalty-stroke
 * Record Penalty Stroke
 */
router.post('/hockey/penalty-stroke', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (match.status === 'COMPLETED') {
    res.status(400).json({ error: 'Match is completed. Scoring is locked.' });
    return;
  }

  if (match.status === 'SCHEDULED' || match.status === 'READY' || match.status === 'DRAFT') {
    match.status = 'LIVE';
    match.updatedAt = new Date().toISOString();
  }

  const {
    teamId,
    playerId,
    outcome = 'GOAL',
    period,
    matchTimeSeconds,
    matchTimeDisplay,
  } = req.body;

  if (!teamId) {
    res.status(400).json({ error: 'Team ID is required.' });
    return;
  }

  if (!db.hockey_scoring_events) db.hockey_scoring_events = [];
  const rules = getHockeyMatchRules(match.hockeyConfig);
  const currentEvents = db.hockey_scoring_events.filter((e: any) => e.matchId === matchId && !e.isUndone);
  const prevState = calculateHockeyScoringState(match, currentEvents, undefined, db.players || []);

  const effectivePeriod = Number(period) || prevState.currentPeriod || 1;
  const isTeamA = teamId === match.teamAId;
  const isGoal = outcome === 'GOAL';
  const newScoreA = isTeamA && isGoal ? prevState.teamAScore + 1 : prevState.teamAScore;
  const newScoreB = !isTeamA && isGoal ? prevState.teamBScore + 1 : prevState.teamBScore;

  const player = (db.players || []).find((p: any) => p.id === playerId);
  const team = isTeamA ? match.teamA : match.teamB;

  const psEvent: HockeyScoringEvent = {
    id: crypto.randomUUID(),
    matchId,
    eventSequence: currentEvents.length + 1,
    period: effectivePeriod,
    periodType: effectivePeriod > rules.periods ? 'EXTRA_TIME' : 'REGULAR',
    periodName: getHockeyPeriodShortName(effectivePeriod, rules.periods),
    matchTimeDisplay: matchTimeDisplay || '00:00',
    matchTimeSeconds: Number(matchTimeSeconds) || 0,
    teamId,
    teamName: team?.name,
    playerId,
    playerName: player?.name,
    eventType: isGoal ? 'GOAL' : 'PENALTY_STROKE',
    goalType: isGoal ? 'PENALTY_STROKE_GOAL' : undefined,
    penaltyStrokeOutcome: outcome,
    scoreA_before: prevState.teamAScore,
    scoreB_before: prevState.teamBScore,
    scoreA_after: newScoreA,
    scoreB_after: newScoreB,
    timestamp: new Date().toISOString(),
  };

  db.hockey_scoring_events.push(psEvent);
  saveDatabase();

  const state = getScoringStateForMatch(match) as HockeyMatchScoringState;
  broadcastScoringUpdate(matchId, {
    ...state,
    manualTriggerEvent: {
      type: isGoal ? 'GOAL' : 'PENALTY_STROKE',
      durationSeconds: 5,
      data: {
        teamName: team?.name,
        takerName: player?.name,
        outcome,
        scoreA: newScoreA,
        scoreB: newScoreB,
      },
    },
  });

  res.json({ message: 'Penalty stroke recorded.', state });
});

/**
 * POST /api/matches/:id/scoring/hockey/card
 * Issue Green (2 min), Yellow (5 min), or Red Card
 */
router.post('/hockey/card', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (match.status === 'COMPLETED') {
    res.status(400).json({ error: 'Match is completed. Scoring is locked.' });
    return;
  }

  if (match.status === 'SCHEDULED' || match.status === 'READY' || match.status === 'DRAFT') {
    match.status = 'LIVE';
    match.updatedAt = new Date().toISOString();
  }

  const {
    teamId,
    playerId,
    cardType = 'GREEN',
    cardDurationMinutes,
    cardReason,
    period,
    matchTimeSeconds,
    matchTimeDisplay,
  } = req.body;

  if (!teamId || !playerId) {
    res.status(400).json({ error: 'Team ID and Player ID are required.' });
    return;
  }

  if (!db.hockey_scoring_events) db.hockey_scoring_events = [];
  const rules = getHockeyMatchRules(match.hockeyConfig);
  const currentEvents = db.hockey_scoring_events.filter((e: any) => e.matchId === matchId && !e.isUndone);
  const prevState = calculateHockeyScoringState(match, currentEvents, undefined, db.players || []);

  const effectivePeriod = Number(period) || prevState.currentPeriod || 1;
  const player = (db.players || []).find((p: any) => p.id === playerId);
  const team = teamId === match.teamAId ? match.teamA : match.teamB;

  const duration =
    Number(cardDurationMinutes) ||
    (cardType === 'GREEN'
      ? rules.greenCardDurationMinutes
      : cardType === 'YELLOW'
      ? rules.yellowCardDurationMinutes
      : 999);

  const cardEvent: HockeyScoringEvent = {
    id: crypto.randomUUID(),
    matchId,
    eventSequence: currentEvents.length + 1,
    period: effectivePeriod,
    periodType: effectivePeriod > rules.periods ? 'EXTRA_TIME' : 'REGULAR',
    periodName: getHockeyPeriodShortName(effectivePeriod, rules.periods),
    matchTimeDisplay: matchTimeDisplay || '00:00',
    matchTimeSeconds: Number(matchTimeSeconds) || 0,
    teamId,
    teamName: team?.name,
    playerId,
    playerName: player?.name,
    eventType: 'CARD',
    cardType,
    cardDurationMinutes: duration,
    cardReason,
    scoreA_before: prevState.teamAScore,
    scoreB_before: prevState.teamBScore,
    scoreA_after: prevState.teamAScore,
    scoreB_after: prevState.teamBScore,
    timestamp: new Date().toISOString(),
  };

  db.hockey_scoring_events.push(cardEvent);
  saveDatabase();

  const state = getScoringStateForMatch(match) as HockeyMatchScoringState;
  const overlayType = cardType === 'GREEN' ? 'GREEN_CARD' : cardType === 'YELLOW' ? 'YELLOW_CARD' : 'RED_CARD';

  broadcastScoringUpdate(matchId, {
    ...state,
    manualTriggerEvent: {
      type: overlayType,
      durationSeconds: 5,
      data: {
        teamName: team?.name,
        playerName: player?.name,
        cardType,
        durationMinutes: duration,
        reason: cardReason,
      },
    },
  });

  res.json({ message: `${cardType} card issued.`, state });
});

/**
 * POST /api/matches/:id/scoring/hockey/substitution
 * Record Player In / Out
 */
router.post('/hockey/substitution', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  const {
    teamId,
    playerOutId,
    playerInId,
    period,
    matchTimeSeconds,
    matchTimeDisplay,
  } = req.body;

  if (!teamId || !playerOutId || !playerInId) {
    res.status(400).json({ error: 'Team ID, Player Out ID, and Player In ID are required.' });
    return;
  }

  if (!db.hockey_scoring_events) db.hockey_scoring_events = [];
  const rules = getHockeyMatchRules(match.hockeyConfig);
  const currentEvents = db.hockey_scoring_events.filter((e: any) => e.matchId === matchId && !e.isUndone);
  const prevState = calculateHockeyScoringState(match, currentEvents, undefined, db.players || []);

  const effectivePeriod = Number(period) || prevState.currentPeriod || 1;
  const pOut = (db.players || []).find((p: any) => p.id === playerOutId);
  const pIn = (db.players || []).find((p: any) => p.id === playerInId);
  const team = teamId === match.teamAId ? match.teamA : match.teamB;

  const subEvent: HockeyScoringEvent = {
    id: crypto.randomUUID(),
    matchId,
    eventSequence: currentEvents.length + 1,
    period: effectivePeriod,
    periodType: effectivePeriod > rules.periods ? 'EXTRA_TIME' : 'REGULAR',
    periodName: getHockeyPeriodShortName(effectivePeriod, rules.periods),
    matchTimeDisplay: matchTimeDisplay || '00:00',
    matchTimeSeconds: Number(matchTimeSeconds) || 0,
    teamId,
    teamName: team?.name,
    playerOutId,
    playerOutName: pOut?.name,
    playerInId,
    playerInName: pIn?.name,
    eventType: 'SUBSTITUTION',
    scoreA_before: prevState.teamAScore,
    scoreB_before: prevState.teamBScore,
    scoreA_after: prevState.teamAScore,
    scoreB_after: prevState.teamBScore,
    timestamp: new Date().toISOString(),
  };

  db.hockey_scoring_events.push(subEvent);
  saveDatabase();

  const state = getScoringStateForMatch(match) as HockeyMatchScoringState;
  broadcastScoringUpdate(matchId, {
    ...state,
    manualTriggerEvent: {
      type: 'SUBSTITUTION',
      durationSeconds: 4,
      data: {
        teamName: team?.name,
        playerOutName: pOut?.name,
        playerInName: pIn?.name,
      },
    },
  });

  res.json({ message: 'Substitution logged.', state });
});

/**
 * POST /api/matches/:id/scoring/hockey/clock
 * Update match clock (start, pause, reset, sync)
 */
router.post('/hockey/clock', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (match.status === 'COMPLETED') {
    res.status(400).json({ error: 'Match is completed. Scoring is locked.' });
    return;
  }

  const { isRunning, elapsedSeconds, periodDurationSeconds } = req.body;
  const rules = getHockeyMatchRules(match.hockeyConfig);
  const clock = getOrCreateHockeyClock(db, matchId, rules.periodDuration);

  if (typeof isRunning === 'boolean') clock.isRunning = isRunning;
  if (typeof elapsedSeconds === 'number') clock.elapsedSeconds = elapsedSeconds;
  if (typeof periodDurationSeconds === 'number') clock.periodDurationSeconds = periodDurationSeconds;
  clock.lastStartedAt = clock.isRunning ? new Date().toISOString() : undefined;

  saveDatabase();

  const state = getScoringStateForMatch(match) as HockeyMatchScoringState;
  broadcastScoringUpdate(matchId, state);
  res.json({ message: 'Clock updated.', clock, state });
});

/**
 * POST /api/matches/:id/scoring/hockey/period
 * Transition quarter / period / extra time / shootout / complete
 */
router.post('/hockey/period', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  const { action, nextPeriod } = req.body; // action: 'END_PERIOD' | 'START_PERIOD' | 'EXTRA_TIME' | 'SHOOTOUT' | 'COMPLETE'

  if (match.status === 'COMPLETED' && action !== 'COMPLETE') {
    res.status(400).json({ error: 'Match is completed. Scoring is locked.' });
    return;
  }
  const rules = getHockeyMatchRules(match.hockeyConfig);
  const clock = getOrCreateHockeyClock(db, matchId, rules.periodDuration);

  if (!db.hockey_scoring_events) db.hockey_scoring_events = [];
  const currentEvents = db.hockey_scoring_events.filter((e: any) => e.matchId === matchId && !e.isUndone);
  const prevState = calculateHockeyScoringState(match, currentEvents, undefined, db.players || []);

  let manualTriggerEvent: any = undefined;

  if (action === 'END_PERIOD') {
    clock.isRunning = false;
    const endEv: HockeyScoringEvent = {
      id: crypto.randomUUID(),
      matchId,
      eventSequence: currentEvents.length + 1,
      period: prevState.currentPeriod,
      periodType: prevState.currentPeriod > rules.periods ? 'EXTRA_TIME' : 'REGULAR',
      periodName: getHockeyPeriodShortName(prevState.currentPeriod, rules.periods),
      matchTimeDisplay: '15:00',
      matchTimeSeconds: clock.periodDurationSeconds,
      teamId: match.teamAId,
      eventType: 'PERIOD_END',
      scoreA_before: prevState.teamAScore,
      scoreB_before: prevState.teamBScore,
      scoreA_after: prevState.teamAScore,
      scoreB_after: prevState.teamBScore,
      timestamp: new Date().toISOString(),
    };
    db.hockey_scoring_events.push(endEv);

    manualTriggerEvent = {
      type: 'PERIOD_COMPLETE',
      durationSeconds: 5,
      data: {
        periodName: getHockeyPeriodDisplayName(prevState.currentPeriod, rules.periods),
        scoreA: prevState.teamAScore,
        scoreB: prevState.teamBScore,
        teamAName: match.teamA?.name,
        teamBName: match.teamB?.name,
      },
    };
  } else if (action === 'START_PERIOD') {
    const targetPeriod = Number(nextPeriod) || prevState.currentPeriod + 1;
    clock.isRunning = true;
    clock.elapsedSeconds = 0;
    clock.lastStartedAt = new Date().toISOString();

    const startEv: HockeyScoringEvent = {
      id: crypto.randomUUID(),
      matchId,
      eventSequence: currentEvents.length + 1,
      period: targetPeriod,
      periodType: targetPeriod > rules.periods ? 'EXTRA_TIME' : 'REGULAR',
      periodName: getHockeyPeriodShortName(targetPeriod, rules.periods),
      matchTimeDisplay: '00:00',
      matchTimeSeconds: 0,
      teamId: match.teamAId,
      eventType: 'PERIOD_START',
      scoreA_before: prevState.teamAScore,
      scoreB_before: prevState.teamBScore,
      scoreA_after: prevState.teamAScore,
      scoreB_after: prevState.teamBScore,
      timestamp: new Date().toISOString(),
    };
    db.hockey_scoring_events.push(startEv);

    manualTriggerEvent = {
      type: 'PERIOD_START',
      durationSeconds: 4,
      data: {
        periodName: getHockeyPeriodDisplayName(targetPeriod, rules.periods),
        scoreA: prevState.teamAScore,
        scoreB: prevState.teamBScore,
      },
    };
  } else if (action === 'SHOOTOUT') {
    clock.isRunning = false;
    clock.elapsedSeconds = 0;
    manualTriggerEvent = {
      type: 'SHOOTOUT',
      durationSeconds: 5,
      data: {
        teamAName: match.teamA?.name,
        teamBName: match.teamB?.name,
        regularScoreA: prevState.teamAScore,
        regularScoreB: prevState.teamBScore,
      },
    };
  } else if (action === 'COMPLETE') {
    clock.isRunning = false;
    match.status = 'COMPLETED';
    manualTriggerEvent = {
      type: 'MATCH_RESULT',
      durationSeconds: 6,
      data: {
        resultText: prevState.matchResultText,
        scoreA: prevState.teamAScore,
        scoreB: prevState.teamBScore,
        winnerId: prevState.matchWinnerId,
      },
    };
  }

  saveDatabase();

  const state = getScoringStateForMatch(match) as HockeyMatchScoringState;
  broadcastScoringUpdate(matchId, {
    ...state,
    manualTriggerEvent,
  });

  res.json({ message: `Period updated: ${action}`, state });
});

/**
 * POST /api/matches/:id/scoring/hockey/shootout
 * Record 1v1 shootout attempt (Goal / Miss / Saved)
 */
router.post('/hockey/shootout', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (match.status === 'COMPLETED') {
    res.status(400).json({ error: 'Match is completed. Scoring is locked.' });
    return;
  }

  const {
    teamId,
    playerId,
    outcome = 'GOAL',
    roundNumber,
  } = req.body;

  if (!teamId || !playerId) {
    res.status(400).json({ error: 'Team ID and Player ID are required.' });
    return;
  }

  if (!db.hockey_scoring_events) db.hockey_scoring_events = [];
  const rules = getHockeyMatchRules(match.hockeyConfig);
  const currentEvents = db.hockey_scoring_events.filter((e: any) => e.matchId === matchId && !e.isUndone);
  const prevState = calculateHockeyScoringState(match, currentEvents, undefined, db.players || []);

  const isTeamA = teamId === match.teamAId;
  const isGoal = outcome === 'GOAL';
  const player = (db.players || []).find((p: any) => p.id === playerId);
  const team = isTeamA ? match.teamA : match.teamB;

  const soEvent: HockeyScoringEvent = {
    id: crypto.randomUUID(),
    matchId,
    eventSequence: currentEvents.length + 1,
    period: rules.periods + rules.extraTimePeriods + 1,
    periodType: 'SHOOTOUT',
    periodName: 'SO',
    matchTimeDisplay: 'SO',
    matchTimeSeconds: 0,
    teamId,
    teamName: team?.name,
    playerId,
    playerName: player?.name,
    eventType: 'SHOOTOUT_ATTEMPT',
    shootoutRound: Number(roundNumber) || Math.ceil((prevState.shootoutAttempts.length + 1) / 2),
    shootoutAttemptOutcome: outcome,
    scoreA_before: prevState.teamAScore,
    scoreB_before: prevState.teamBScore,
    scoreA_after: prevState.teamAScore,
    scoreB_after: prevState.teamBScore,
    timestamp: new Date().toISOString(),
  };

  db.hockey_scoring_events.push(soEvent);
  saveDatabase();

  const state = getScoringStateForMatch(match) as HockeyMatchScoringState;
  broadcastScoringUpdate(matchId, {
    ...state,
    manualTriggerEvent: {
      type: isGoal ? 'SHOOTOUT_GOAL' : 'SHOOTOUT_MISS',
      durationSeconds: 4,
      data: {
        teamName: team?.name,
        takerName: player?.name,
        outcome,
        shootoutScoreA: state.shootoutScoreA,
        shootoutScoreB: state.shootoutScoreB,
      },
    },
  });

  res.json({ message: 'Shootout attempt recorded.', state });
});

/**
 * POST /api/matches/:id/scoring/hockey/undo
 * Undo the last hockey scoring event and recalculate
 */
router.post('/hockey/undo', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  const events = (db.hockey_scoring_events || []).filter((e: any) => e.matchId === matchId && !e.isUndone);
  if (events.length === 0) {
    res.status(400).json({ error: 'No active events to undo.' });
    return;
  }

  const lastEvent = events[events.length - 1];
  lastEvent.isUndone = true;

  saveDatabase();

  const state = getScoringStateForMatch(match) as HockeyMatchScoringState;
  broadcastScoringUpdate(matchId, state);
  res.json({ message: `Undid ${lastEvent.eventType} event.`, state });
});

/**
 * PUT /api/matches/:id/scoring/hockey/edit-event
 * Edit a specific hockey event
 */
router.put('/hockey/edit-event', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  const { eventId, updates } = req.body;
  if (!eventId || !updates) {
    res.status(400).json({ error: 'Event ID and updates required.' });
    return;
  }

  const event = (db.hockey_scoring_events || []).find((e: any) => e.id === eventId && e.matchId === matchId);
  if (!event) {
    res.status(404).json({ error: 'Event not found.' });
    return;
  }

  Object.assign(event, updates);
  saveDatabase();

  const state = getScoringStateForMatch(match) as HockeyMatchScoringState;
  broadcastScoringUpdate(matchId, state);
  res.json({ message: 'Event updated.', state });
});

// ==========================================
// FOOTBALL / SOCCER SPECIFIC SCORING ENDPOINTS
// ==========================================

function getOrCreateFootballClock(db: any, matchId: string, halfDurationMinutes = 45): FootballMatchClock {
  if (!db.football_clock_states) db.football_clock_states = [];
  let clock = db.football_clock_states.find((c: any) => c.matchId === matchId);
  if (!clock) {
    clock = {
      matchId,
      isRunning: false,
      elapsedSeconds: 0,
      period: 1,
      periodDurationSeconds: halfDurationMinutes * 60,
      stoppageTimeMinutes: 0,
      updatedAt: new Date().toISOString(),
    };
    db.football_clock_states.push(clock);
  }
  return clock;
}

/**
 * POST /api/matches/:id/scoring/football/event
 * Record a live football event: Goal, Card, Corner, Penalty, Shot, Foul, Offside, Save, Score Correction
 */
router.post('/football/event', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (match.status === 'COMPLETED') {
    res.status(400).json({ error: 'Match is completed. Scoring is locked.' });
    return;
  }

  if (match.status === 'SCHEDULED' || match.status === 'READY' || match.status === 'DRAFT') {
    match.status = 'LIVE';
    match.updatedAt = new Date().toISOString();
  }

  const {
    eventType,
    teamId,
    playerId,
    assistPlayerId,
    goalType = 'OPEN_PLAY',
    cardType,
    cardReason,
    penaltyOutcome,
    period,
    matchTimeSeconds,
    matchTimeDisplay,
    notes,
    scoreA_after,
    scoreB_after,
  } = req.body;

  if (!eventType || !teamId) {
    res.status(400).json({ error: 'eventType and teamId are required.' });
    return;
  }

  if (!db.football_scoring_events) db.football_scoring_events = [];
  const currentEvents = db.football_scoring_events.filter((e: any) => e.matchId === matchId && !e.isUndone);
  const prevState = calculateFootballScoringState(match, currentEvents, undefined, db.players || []);

  const effectivePeriod = Number(period) || prevState.currentPeriod || 1;
  const isTeamA = teamId === match.teamAId;
  const scoringTeam = isTeamA ? match.teamA : match.teamB;
  const player = (db.players || []).find((p: any) => p.id === playerId);
  const assistPlayer = (db.players || []).find((p: any) => p.id === assistPlayerId);

  // Determine score change
  let newScoreA = prevState.teamAScore;
  let newScoreB = prevState.teamBScore;

  if (eventType === 'GOAL') {
    if (goalType === 'OWN_GOAL') {
      if (isTeamA) newScoreB += 1;
      else newScoreA += 1;
    } else {
      if (isTeamA) newScoreA += 1;
      else newScoreB += 1;
    }
  } else if (eventType === 'OWN_GOAL') {
    if (isTeamA) newScoreB += 1;
    else newScoreA += 1;
  } else if (eventType === 'PENALTY_GOAL') {
    if (isTeamA) newScoreA += 1;
    else newScoreB += 1;
  } else if (eventType === 'SCORE_CORRECTION') {
    if (scoreA_after !== undefined) newScoreA = Number(scoreA_after);
    if (scoreB_after !== undefined) newScoreB = Number(scoreB_after);
  }

  const fbEvent: FootballScoringEvent = {
    id: crypto.randomUUID(),
    matchId,
    period: effectivePeriod,
    periodName: getFootballPeriodShortName(effectivePeriod),
    matchTimeDisplay: matchTimeDisplay || '00:00',
    matchTimeSeconds: Number(matchTimeSeconds) || 0,
    teamId,
    teamName: scoringTeam?.name || (isTeamA ? 'Team A' : 'Team B'),
    eventType,
    playerId,
    playerName: player?.name,
    assistPlayerId,
    assistPlayerName: assistPlayer?.name,
    goalType: eventType === 'GOAL' || eventType === 'OWN_GOAL' ? goalType : undefined,
    cardType: eventType === 'YELLOW_CARD' ? 'YELLOW' : eventType === 'SECOND_YELLOW' ? 'SECOND_YELLOW' : eventType === 'RED_CARD' ? 'RED' : cardType,
    cardReason,
    penaltyOutcome: eventType.startsWith('PENALTY') ? penaltyOutcome : undefined,
    scoreA_before: prevState.teamAScore,
    scoreB_before: prevState.teamBScore,
    scoreA_after: newScoreA,
    scoreB_after: newScoreB,
    timestamp: new Date().toISOString(),
    notes,
    createdBy: req.user?.name || req.user?.email || 'admin',
  };

  db.football_scoring_events.push(fbEvent);
  saveDatabase();

  const state = getScoringStateForMatch(match) as FootballMatchScoringState;

  // Build broadcast overlay payload
  let manualTriggerEvent: any = undefined;
  if (eventType === 'GOAL' || eventType === 'OWN_GOAL' || eventType === 'PENALTY_GOAL') {
    const isOwnGoal = goalType === 'OWN_GOAL' || eventType === 'OWN_GOAL';
    manualTriggerEvent = {
      type: isOwnGoal ? 'OWN_GOAL' : 'GOAL',
      durationSeconds: 7,
      data: {
        teamName: isOwnGoal ? (isTeamA ? match.teamB?.name : match.teamA?.name) : scoringTeam?.name,
        scorerName: player?.name || 'Goal',
        assistName: assistPlayer?.name,
        goalType,
        isOwnGoal,
        scoreA: newScoreA,
        scoreB: newScoreB,
        matchTimeDisplay: fbEvent.matchTimeDisplay,
      },
    };
  } else if (eventType === 'YELLOW_CARD') {
    manualTriggerEvent = {
      type: 'YELLOW_CARD',
      durationSeconds: 5,
      data: {
        teamName: scoringTeam?.name,
        playerName: player?.name,
        reason: cardReason,
        matchTimeDisplay: fbEvent.matchTimeDisplay,
      },
    };
  } else if (eventType === 'SECOND_YELLOW') {
    manualTriggerEvent = {
      type: 'SECOND_YELLOW',
      durationSeconds: 6,
      data: {
        teamName: scoringTeam?.name,
        playerName: player?.name,
        reason: cardReason || 'Second Yellow Card',
        matchTimeDisplay: fbEvent.matchTimeDisplay,
      },
    };
  } else if (eventType === 'RED_CARD') {
    manualTriggerEvent = {
      type: 'RED_CARD',
      durationSeconds: 6,
      data: {
        teamName: scoringTeam?.name,
        playerName: player?.name,
        reason: cardReason,
        matchTimeDisplay: fbEvent.matchTimeDisplay,
      },
    };
  } else if (eventType === 'PENALTY_AWARDED') {
    manualTriggerEvent = {
      type: 'PENALTY',
      durationSeconds: 5,
      data: {
        teamName: scoringTeam?.name,
        matchTimeDisplay: fbEvent.matchTimeDisplay,
        reason: notes || 'Penalty Awarded',
      },
    };
  }

  broadcastScoringUpdate(matchId, {
    ...state,
    manualTriggerEvent,
  });

  res.json({ message: `${eventType} recorded successfully.`, state });
});

/**
 * POST /api/matches/:id/scoring/football/substitution
 * Record Player In / Out substitution
 */
router.post('/football/substitution', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (match.status === 'COMPLETED') {
    res.status(400).json({ error: 'Match is completed. Scoring is locked.' });
    return;
  }

  const {
    teamId,
    playerOutId,
    playerInId,
    period,
    matchTimeSeconds,
    matchTimeDisplay,
  } = req.body;

  if (!teamId || !playerOutId || !playerInId) {
    res.status(400).json({ error: 'Team ID, Player Out, and Player In are required.' });
    return;
  }

  if (!db.football_scoring_events) db.football_scoring_events = [];
  const currentEvents = db.football_scoring_events.filter((e: any) => e.matchId === matchId && !e.isUndone);
  const prevState = calculateFootballScoringState(match, currentEvents, undefined, db.players || []);

  const effectivePeriod = Number(period) || prevState.currentPeriod || 1;
  const team = teamId === match.teamAId ? match.teamA : match.teamB;
  const playerOut = (db.players || []).find((p: any) => p.id === playerOutId);
  const playerIn = (db.players || []).find((p: any) => p.id === playerInId);

  const subEvent: FootballScoringEvent = {
    id: crypto.randomUUID(),
    matchId,
    period: effectivePeriod,
    periodName: getFootballPeriodShortName(effectivePeriod),
    matchTimeDisplay: matchTimeDisplay || '00:00',
    matchTimeSeconds: Number(matchTimeSeconds) || 0,
    teamId,
    teamName: team?.name || 'Team',
    eventType: 'SUBSTITUTION',
    playerOutId,
    playerOutName: playerOut?.name,
    playerInId,
    playerInName: playerIn?.name,
    scoreA_before: prevState.teamAScore,
    scoreB_before: prevState.teamBScore,
    scoreA_after: prevState.teamAScore,
    scoreB_after: prevState.teamBScore,
    timestamp: new Date().toISOString(),
  };

  db.football_scoring_events.push(subEvent);
  saveDatabase();

  const state = getScoringStateForMatch(match) as FootballMatchScoringState;
  broadcastScoringUpdate(matchId, {
    ...state,
    manualTriggerEvent: {
      type: 'SUBSTITUTION',
      durationSeconds: 5,
      data: {
        teamName: team?.name,
        playerOut: playerOut?.name || 'Player Out',
        playerIn: playerIn?.name || 'Player In',
        matchTimeDisplay: subEvent.matchTimeDisplay,
      },
    },
  });

  res.json({ message: 'Substitution recorded.', state });
});

/**
 * POST /api/matches/:id/scoring/football/clock
 * Update match clock (start, pause, reset, set_time, set_stoppage)
 */
router.post('/football/clock', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (match.status === 'COMPLETED') {
    res.status(400).json({ error: 'Match is completed. Scoring is locked.' });
    return;
  }

  const { action, elapsedSeconds, stoppageTimeMinutes } = req.body;
  const rules = getFootballMatchRules(match);
  const clock = getOrCreateFootballClock(db, matchId, rules.halfDuration);

  if (action === 'START') {
    clock.isRunning = true;
    clock.lastStartedAt = new Date().toISOString();
  } else if (action === 'PAUSE') {
    clock.isRunning = false;
    if (elapsedSeconds !== undefined) {
      clock.elapsedSeconds = Math.max(0, Number(elapsedSeconds));
    }
  } else if (action === 'RESET') {
    clock.isRunning = false;
    clock.elapsedSeconds = 0;
  } else if (action === 'SET_TIME') {
    if (elapsedSeconds !== undefined) {
      clock.elapsedSeconds = Math.max(0, Number(elapsedSeconds));
    }
  } else if (action === 'SET_STOPPAGE') {
    if (stoppageTimeMinutes !== undefined) {
      clock.stoppageTimeMinutes = Math.max(0, Number(stoppageTimeMinutes));
    }
  }

  clock.updatedAt = new Date().toISOString();
  saveDatabase();

  const state = getScoringStateForMatch(match) as FootballMatchScoringState;
  broadcastScoringUpdate(matchId, state);
  res.json({ message: 'Clock updated.', clock, state });
});

/**
 * POST /api/matches/:id/scoring/football/period
 * Transition halves / extra time / shootout / complete
 */
router.post('/football/period', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  const { action, nextPeriod } = req.body; // 'START_PERIOD' | 'HALF_TIME' | 'EXTRA_TIME' | 'SHOOTOUT' | 'COMPLETE'

  if (match.status === 'COMPLETED' && action !== 'COMPLETE') {
    res.status(400).json({ error: 'Match is completed. Scoring is locked.' });
    return;
  }

  if (action === 'START_PERIOD' && (match.status === 'SCHEDULED' || match.status === 'READY' || match.status === 'DRAFT')) {
    match.status = 'LIVE';
    match.updatedAt = new Date().toISOString();
  }
  const rules = getFootballMatchRules(match);
  const clock = getOrCreateFootballClock(db, matchId, rules.halfDuration);

  if (!db.football_scoring_events) db.football_scoring_events = [];
  const currentEvents = db.football_scoring_events.filter((e: any) => e.matchId === matchId && !e.isUndone);
  const prevState = calculateFootballScoringState(match, currentEvents, undefined, db.players || []);

  let manualTriggerEvent: any = undefined;

  if (action === 'HALF_TIME') {
    clock.isRunning = false;
    const htEv: FootballScoringEvent = {
      id: crypto.randomUUID(),
      matchId,
      period: 1,
      periodName: '1H',
      matchTimeDisplay: '45:00',
      matchTimeSeconds: 45 * 60,
      teamId: match.teamAId,
      teamName: match.teamA?.name || 'Team A',
      eventType: 'PERIOD_END',
      scoreA_before: prevState.teamAScore,
      scoreB_before: prevState.teamBScore,
      scoreA_after: prevState.teamAScore,
      scoreB_after: prevState.teamBScore,
      timestamp: new Date().toISOString(),
    };
    db.football_scoring_events.push(htEv);

    manualTriggerEvent = {
      type: 'HALF_TIME',
      durationSeconds: 5,
      data: {
        scoreA: prevState.teamAScore,
        scoreB: prevState.teamBScore,
        teamAName: match.teamA?.name,
        teamBName: match.teamB?.name,
      },
    };
  } else if (action === 'START_PERIOD') {
    const targetPeriod = Number(nextPeriod) || prevState.currentPeriod + 1;
    clock.period = targetPeriod;
    clock.isRunning = true;
    clock.elapsedSeconds = 0;
    clock.periodDurationSeconds = targetPeriod >= 3 && targetPeriod <= 4
      ? rules.extraTimeHalfDuration * 60
      : rules.halfDuration * 60;
    clock.lastStartedAt = new Date().toISOString();

    const startEv: FootballScoringEvent = {
      id: crypto.randomUUID(),
      matchId,
      period: targetPeriod,
      periodName: getFootballPeriodShortName(targetPeriod),
      matchTimeDisplay: '00:00',
      matchTimeSeconds: 0,
      teamId: match.teamAId,
      teamName: match.teamA?.name || 'Team A',
      eventType: 'PERIOD_START',
      scoreA_before: prevState.teamAScore,
      scoreB_before: prevState.teamBScore,
      scoreA_after: prevState.teamAScore,
      scoreB_after: prevState.teamBScore,
      timestamp: new Date().toISOString(),
    };
    db.football_scoring_events.push(startEv);

    manualTriggerEvent = {
      type: 'PERIOD_START',
      durationSeconds: 4,
      data: {
        periodName: getFootballPeriodDisplayName(targetPeriod),
        scoreA: prevState.teamAScore,
        scoreB: prevState.teamBScore,
      },
    };
  } else if (action === 'EXTRA_TIME') {
    clock.period = 3;
    clock.isRunning = false;
    clock.elapsedSeconds = 0;
    clock.periodDurationSeconds = rules.extraTimeHalfDuration * 60;
    manualTriggerEvent = {
      type: 'EXTRA_TIME',
      durationSeconds: 5,
      data: {
        teamAName: match.teamA?.name,
        teamBName: match.teamB?.name,
        scoreA: prevState.teamAScore,
        scoreB: prevState.teamBScore,
      },
    };
  } else if (action === 'SHOOTOUT') {
    clock.period = 5;
    clock.isRunning = false;
    clock.elapsedSeconds = 0;
    manualTriggerEvent = {
      type: 'SHOOTOUT',
      durationSeconds: 5,
      data: {
        teamAName: match.teamA?.name,
        teamBName: match.teamB?.name,
        regularScoreA: prevState.teamAScore,
        regularScoreB: prevState.teamBScore,
      },
    };
  } else if (action === 'COMPLETE') {
    clock.isRunning = false;
    match.status = 'COMPLETED';
    manualTriggerEvent = {
      type: 'MATCH_RESULT',
      durationSeconds: 7,
      data: {
        resultText: prevState.matchResultText,
        scoreA: prevState.teamAScore,
        scoreB: prevState.teamBScore,
        winnerId: prevState.matchWinnerId,
      },
    };
  }

  saveDatabase();

  const state = getScoringStateForMatch(match) as FootballMatchScoringState;
  broadcastScoringUpdate(matchId, {
    ...state,
    manualTriggerEvent,
  });

  res.json({ message: `Period updated: ${action}`, state });
});

/**
 * POST /api/matches/:id/scoring/football/shootout
 * Record penalty shootout kick (Goal / Miss / Saved)
 */
router.post('/football/shootout', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (match.status === 'COMPLETED') {
    res.status(400).json({ error: 'Match is completed. Scoring is locked.' });
    return;
  }

  const {
    teamId,
    playerId,
    assistPlayerId, // Goalkeeper
    outcome = 'GOAL',
    roundNumber,
  } = req.body;

  if (!teamId || !playerId) {
    res.status(400).json({ error: 'Team ID and Player ID are required.' });
    return;
  }

  if (!db.football_scoring_events) db.football_scoring_events = [];
  const currentEvents = db.football_scoring_events.filter((e: any) => e.matchId === matchId && !e.isUndone);
  const prevState = calculateFootballScoringState(match, currentEvents, undefined, db.players || []);

  const isTeamA = teamId === match.teamAId;
  const isGoal = outcome === 'GOAL';
  const player = (db.players || []).find((p: any) => p.id === playerId);
  const gkPlayer = (db.players || []).find((p: any) => p.id === assistPlayerId);
  const team = isTeamA ? match.teamA : match.teamB;

  const currentShootoutAttempts = prevState.shootoutAttempts || [];
  const nextAttemptNum = isTeamA ? 1 : 2;

  const soEvent: FootballScoringEvent = {
    id: crypto.randomUUID(),
    matchId,
    period: 5,
    periodName: 'SO',
    matchTimeDisplay: 'SO',
    matchTimeSeconds: 0,
    teamId,
    teamName: team?.name || 'Team',
    playerId,
    playerName: player?.name,
    assistPlayerId,
    assistPlayerName: gkPlayer?.name,
    eventType: 'SHOOTOUT_ATTEMPT',
    shootoutRound: Number(roundNumber) || Math.ceil((currentShootoutAttempts.length + 1) / 2),
    shootoutAttemptNumber: nextAttemptNum,
    shootoutOutcome: outcome,
    scoreA_before: prevState.teamAScore,
    scoreB_before: prevState.teamBScore,
    scoreA_after: prevState.teamAScore,
    scoreB_after: prevState.teamBScore,
    timestamp: new Date().toISOString(),
  };

  db.football_scoring_events.push(soEvent);
  saveDatabase();

  const state = getScoringStateForMatch(match) as FootballMatchScoringState;
  broadcastScoringUpdate(matchId, {
    ...state,
    manualTriggerEvent: {
      type: isGoal ? 'SHOOTOUT_GOAL' : 'SHOOTOUT_MISS',
      durationSeconds: 4,
      data: {
        teamName: team?.name,
        takerName: player?.name,
        outcome,
        shootoutScoreA: state.shootoutScoreA,
        shootoutScoreB: state.shootoutScoreB,
      },
    },
  });

  res.json({ message: 'Shootout attempt recorded.', state });
});

/**
 * POST /api/matches/:id/scoring/football/undo
 * Undo the last football scoring event and recalculate
 */
router.post('/football/undo', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  const events = (db.football_scoring_events || []).filter((e: any) => e.matchId === matchId && !e.isUndone);
  if (events.length === 0) {
    res.status(400).json({ error: 'No active events to undo.' });
    return;
  }

  const lastEvent = events[events.length - 1];
  lastEvent.isUndone = true;

  saveDatabase();

  const state = getScoringStateForMatch(match) as FootballMatchScoringState;
  broadcastScoringUpdate(matchId, state);
  res.json({ message: `Undid ${lastEvent.eventType} event.`, state });
});

/**
 * PUT /api/matches/:id/scoring/football/edit-event
 * Edit a specific football event
 */
router.put('/football/edit-event', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  const { eventId, updates } = req.body;
  if (!eventId || !updates) {
    res.status(400).json({ error: 'Event ID and updates required.' });
    return;
  }

  const event = (db.football_scoring_events || []).find((e: any) => e.id === eventId && e.matchId === matchId);
  if (!event) {
    res.status(404).json({ error: 'Event not found.' });
    return;
  }

  Object.assign(event, updates);
  saveDatabase();

  const state = getScoringStateForMatch(match) as FootballMatchScoringState;
  broadcastScoringUpdate(matchId, state);
  res.json({ message: 'Event updated.', state });
});

// ============================================================================
// BASKETBALL LIVE SCORING API ENDPOINTS
// ============================================================================

/**
 * POST /api/matches/:id/scoring/basketball/event
 * Record a Basketball live scoring event
 */
router.post('/basketball/event', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (match.status === 'COMPLETED') {
    res.status(400).json({ error: 'Match is completed. Scoring is locked.' });
    return;
  }

  const {
    eventType,
    teamId,
    playerId,
    assistPlayerId,
    pointsScored,
    shotType,
    shotResult,
    reboundType,
    turnoverType,
    foulType,
    freeThrowsAwarded,
    playerInId,
    playerOutId,
    timeoutType,
    possessionTeamId,
    gameTimeRemainingSeconds,
    shotClockRemainingSeconds,
    notes,
  } = req.body;

  if (!eventType) {
    res.status(400).json({ error: 'Event type is required.' });
    return;
  }

  if (!db.basketball_scoring_events) db.basketball_scoring_events = [];
  if (!db.basketball_clock_states) db.basketball_clock_states = [];

  const existingEvents: BasketballScoringEvent[] = (db.basketball_scoring_events || []).filter(
    (e: any) => e.matchId === matchId && !e.isUndone
  );
  let clockState: BasketballMatchClock | undefined = db.basketball_clock_states.find((c: any) => c.matchId === matchId);

  const rules = getBasketballMatchRules(match);
  if (!clockState) {
    clockState = {
      matchId,
      currentQuarter: 1,
      quarterName: 'Q1',
      isClockRunning: false,
      isShotClockRunning: false,
      gameTimeRemainingSeconds: rules.quarterDurationSeconds,
      shotClockRemainingSeconds: rules.shotClockDuration,
      quarterDurationSeconds: rules.quarterDurationSeconds,
      possessionTeamId: teamId || match.teamAId,
      lastUpdated: new Date().toISOString(),
    };
    db.basketball_clock_states.push(clockState);
  }

  // Update clock state if passed in body
  if (gameTimeRemainingSeconds !== undefined) {
    clockState.gameTimeRemainingSeconds = Number(gameTimeRemainingSeconds);
  }
  if (shotClockRemainingSeconds !== undefined) {
    clockState.shotClockRemainingSeconds = Number(shotClockRemainingSeconds);
  }
  if (possessionTeamId !== undefined) {
    clockState.possessionTeamId = possessionTeamId;
  }

  const currentState = calculateBasketballScoringState(match, existingEvents, clockState, db.players || []);

  const isTeamA = teamId === match.teamAId;
  const teamObj = isTeamA ? match.teamA : match.teamB;
  const playerObj = playerId ? (db.players || []).find((p: any) => p.id === playerId) : undefined;
  const assistPlayerObj = assistPlayerId ? (db.players || []).find((p: any) => p.id === assistPlayerId) : undefined;
  const playerInObj = playerInId ? (db.players || []).find((p: any) => p.id === playerInId) : undefined;
  const playerOutObj = playerOutId ? (db.players || []).find((p: any) => p.id === playerOutId) : undefined;

  let calculatedPoints = 0;
  if (eventType === 'SCORE_1PT' || eventType === 'ONE_POINT') calculatedPoints = 1;
  else if (eventType === 'SCORE_2PT' || eventType === 'TWO_POINT') calculatedPoints = 2;
  else if (eventType === 'SCORE_3PT' || eventType === 'THREE_POINT') calculatedPoints = 3;
  else if (pointsScored !== undefined) calculatedPoints = Number(pointsScored);
  else if (req.body.points !== undefined) calculatedPoints = Number(req.body.points);

  let newScoreA = currentState.teamAScore;
  let newScoreB = currentState.teamBScore;
  if (calculatedPoints > 0) {
    if (isTeamA) newScoreA += calculatedPoints;
    else newScoreB += calculatedPoints;
  }

  const currentQuarter = clockState.currentQuarter || 1;
  const quarterName = getBasketballQuarterShortName(currentQuarter, rules.quarters);
  const quarterType = currentQuarter > rules.quarters ? 'OVERTIME' : 'REGULAR';
  const gameTimeDisplay = formatBasketballMatchTime(clockState.gameTimeRemainingSeconds);

  // Automatic shot clock handling
  if (eventType === 'SCORE_1PT' || eventType === 'SCORE_2PT' || eventType === 'SCORE_3PT') {
    // Reset shot clock to 24s and switch possession
    clockState.shotClockRemainingSeconds = rules.shotClockDuration;
    clockState.possessionTeamId = isTeamA ? match.teamBId : match.teamAId;
  } else if (eventType === 'REBOUND') {
    if (reboundType === 'OFFENSIVE') {
      // Offensive rebound resets shot clock to 14 seconds (FIBA/NBA rule)
      clockState.shotClockRemainingSeconds = rules.shotClockOffensiveRebound;
    } else {
      // Defensive rebound resets shot clock to 24 seconds and switches possession
      clockState.shotClockRemainingSeconds = rules.shotClockDuration;
      clockState.possessionTeamId = teamId;
    }
  } else if (eventType === 'STEAL') {
    clockState.shotClockRemainingSeconds = rules.shotClockDuration;
    clockState.possessionTeamId = teamId;
  } else if (eventType === 'TURNOVER' || eventType === 'SHOT_CLOCK_VIOLATION') {
    clockState.shotClockRemainingSeconds = rules.shotClockDuration;
    clockState.possessionTeamId = isTeamA ? match.teamBId : match.teamAId;
  } else if (eventType === 'TIMEOUT') {
    // Stop the clocks during timeout
    clockState.isClockRunning = false;
    clockState.isShotClockRunning = false;
  }

  clockState.lastUpdated = new Date().toISOString();

  const newEvent: BasketballScoringEvent = {
    id: crypto.randomUUID(),
    matchId,
    eventSequence: existingEvents.length + 1,
    quarter: currentQuarter,
    quarterType,
    quarterName,
    gameTimeDisplay,
    gameTimeRemainingSeconds: clockState.gameTimeRemainingSeconds,
    shotClockRemainingSeconds: clockState.shotClockRemainingSeconds,
    teamId: teamId || match.teamAId,
    teamName: teamObj?.name || (isTeamA ? 'Team A' : 'Team B'),
    eventType,
    pointsScored: calculatedPoints,
    playerId,
    playerName: playerObj?.name,
    playerNumber: playerObj?.jerseyNumber,
    assistPlayerId,
    assistPlayerName: assistPlayerObj?.name,
    shotType,
    shotResult: shotResult || (calculatedPoints > 0 ? 'MADE' : 'MISSED'),
    reboundType,
    turnoverType,
    foulType,
    freeThrowsAwarded: freeThrowsAwarded ? Number(freeThrowsAwarded) : undefined,
    playerInId,
    playerInName: playerInObj?.name,
    playerOutId,
    playerOutName: playerOutObj?.name,
    timeoutType,
    possessionTeamId: clockState.possessionTeamId,
    scoreA_after: newScoreA,
    scoreB_after: newScoreB,
    timestamp: new Date().toISOString(),
    notes,
    createdBy: req.user?.name || 'Scorer',
  };

  db.basketball_scoring_events.push(newEvent);

  // If match was draft/ready, switch to LIVE
  if (match.status === 'DRAFT' || match.status === 'READY' || match.status === 'SCHEDULED') {
    match.status = 'LIVE';
    match.updatedAt = new Date().toISOString();
  }

  saveDatabase();

  const updatedState = getScoringStateForMatch(match) as BasketballMatchScoringState;

  // Broadcast graphics trigger
  let manualTriggerEvent: any = null;

  if (eventType === 'SCORE_3PT') {
    manualTriggerEvent = {
      type: 'THREE_POINTER',
      durationSeconds: 5,
      data: {
        points: 3,
        teamName: teamObj?.name,
        playerName: playerObj?.name,
        jerseyNumber: playerObj?.jerseyNumber,
        assistPlayerName: assistPlayerObj?.name,
        scoreA: updatedState.teamAScore,
        scoreB: updatedState.teamBScore,
      },
    };
  } else if (eventType === 'SCORE_2PT') {
    const isDunk = shotType === '2PT_DUNK';
    manualTriggerEvent = {
      type: isDunk ? 'DUNK' : 'TWO_POINTER',
      durationSeconds: 4,
      data: {
        points: 2,
        isDunk,
        teamName: teamObj?.name,
        playerName: playerObj?.name,
        jerseyNumber: playerObj?.jerseyNumber,
        assistPlayerName: assistPlayerObj?.name,
        scoreA: updatedState.teamAScore,
        scoreB: updatedState.teamBScore,
      },
    };
  } else if (eventType === 'SCORE_1PT') {
    manualTriggerEvent = {
      type: 'FREE_THROW_MADE',
      durationSeconds: 3,
      data: {
        points: 1,
        teamName: teamObj?.name,
        playerName: playerObj?.name,
        scoreA: updatedState.teamAScore,
        scoreB: updatedState.teamBScore,
      },
    };
  } else if (eventType === 'TIMEOUT') {
    manualTriggerEvent = {
      type: 'TIMEOUT',
      durationSeconds: 5,
      data: {
        teamName: teamObj?.name,
        timeoutType: timeoutType || 'FULL',
        timeoutsRemaining: isTeamA ? updatedState.teamATimeoutsRemaining : updatedState.teamBTimeoutsRemaining,
      },
    };
  } else if (
    eventType === 'FOUL_PERSONAL' ||
    eventType === 'FOUL_SHOOTING' ||
    eventType === 'FOUL_OFFENSIVE' ||
    eventType === 'FOUL_TECHNICAL' ||
    eventType === 'FOUL_FLAGRANT'
  ) {
    const pStats = updatedState.playerStats.find((p) => p.playerId === playerId);
    const isFouledOut = pStats ? pStats.personalFouls + pStats.technicalFouls >= rules.playerFoulLimit : false;

    manualTriggerEvent = {
      type: isFouledOut ? 'FOULED_OUT' : eventType === 'FOUL_TECHNICAL' ? 'TECHNICAL_FOUL' : 'FOUL',
      durationSeconds: 4,
      data: {
        teamName: teamObj?.name,
        playerName: playerObj?.name,
        jerseyNumber: playerObj?.jerseyNumber,
        foulType: foulType || eventType.replace('FOUL_', ''),
        playerFouls: pStats ? pStats.personalFouls + pStats.technicalFouls : 1,
        teamFouls: isTeamA ? updatedState.teamAFoulsThisQuarter : updatedState.teamBFoulsThisQuarter,
        inBonus: isTeamA ? updatedState.teamA_inBonus : updatedState.teamB_inBonus,
        isFouledOut,
      },
    };
  } else if (eventType === 'STEAL') {
    manualTriggerEvent = {
      type: 'STEAL',
      durationSeconds: 3,
      data: {
        teamName: teamObj?.name,
        playerName: playerObj?.name,
      },
    };
  } else if (eventType === 'BLOCK') {
    manualTriggerEvent = {
      type: 'BLOCK',
      durationSeconds: 3,
      data: {
        teamName: teamObj?.name,
        playerName: playerObj?.name,
      },
    };
  } else if (eventType === 'SHOT_CLOCK_VIOLATION') {
    manualTriggerEvent = {
      type: 'SHOT_CLOCK_VIOLATION',
      durationSeconds: 4,
      data: {
        teamName: teamObj?.name,
      },
    };
  }

  broadcastScoringUpdate(matchId, {
    ...updatedState,
    manualTriggerEvent,
  });

  res.json({
    message: `Recorded ${eventType} successfully.`,
    event: newEvent,
    state: updatedState,
  });
});

/**
 * POST /api/matches/:id/scoring/basketball/clock
 * Update match and shot clock timers, possession, and running flags
 */
router.post('/basketball/clock', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (match.status === 'COMPLETED') {
    res.status(400).json({ error: 'Match is completed. Scoring is locked.' });
    return;
  }

  if (!db.basketball_clock_states) db.basketball_clock_states = [];
  let clockState = db.basketball_clock_states.find((c: any) => c.matchId === matchId);

  const rules = getBasketballMatchRules(match);
  if (!clockState) {
    clockState = {
      matchId,
      currentQuarter: 1,
      quarterName: 'Q1',
      isClockRunning: false,
      isShotClockRunning: false,
      gameTimeRemainingSeconds: rules.quarterDurationSeconds,
      shotClockRemainingSeconds: rules.shotClockDuration,
      quarterDurationSeconds: rules.quarterDurationSeconds,
      possessionTeamId: match.teamAId,
      lastUpdated: new Date().toISOString(),
    };
    db.basketball_clock_states.push(clockState);
  }

  const {
    isClockRunning,
    isShotClockRunning,
    gameTimeRemainingSeconds,
    shotClockRemainingSeconds,
    possessionTeamId,
    currentQuarter,
  } = req.body;

  if (isClockRunning !== undefined) clockState.isClockRunning = Boolean(isClockRunning);
  if (isShotClockRunning !== undefined) clockState.isShotClockRunning = Boolean(isShotClockRunning);
  if (gameTimeRemainingSeconds !== undefined) clockState.gameTimeRemainingSeconds = Math.max(0, Number(gameTimeRemainingSeconds));
  if (shotClockRemainingSeconds !== undefined) clockState.shotClockRemainingSeconds = Math.max(0, Number(shotClockRemainingSeconds));
  if (possessionTeamId !== undefined) clockState.possessionTeamId = possessionTeamId;
  if (currentQuarter !== undefined) {
    clockState.currentQuarter = Number(currentQuarter);
    clockState.quarterName = getBasketballQuarterShortName(clockState.currentQuarter, rules.quarters);
  }

  clockState.lastUpdated = new Date().toISOString();
  saveDatabase();

  const state = getScoringStateForMatch(match) as BasketballMatchScoringState;
  broadcastScoringUpdate(matchId, state);

  res.json({ message: 'Basketball clock updated successfully.', state });
});

/**
 * POST /api/matches/:id/scoring/basketball/shot-clock/reset
 * Reset Shot Clock to 24s or 14s
 */
router.post('/basketball/shot-clock/reset', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (match.status === 'COMPLETED') {
    res.status(400).json({ error: 'Match is completed. Scoring is locked.' });
    return;
  }

  const { duration = 24 } = req.body;
  if (!db.basketball_clock_states) db.basketball_clock_states = [];
  let clockState = db.basketball_clock_states.find((c: any) => c.matchId === matchId);

  const rules = getBasketballMatchRules(match);
  if (!clockState) {
    clockState = {
      matchId,
      currentQuarter: 1,
      quarterName: 'Q1',
      isClockRunning: false,
      isShotClockRunning: false,
      gameTimeRemainingSeconds: rules.quarterDurationSeconds,
      shotClockRemainingSeconds: Number(duration),
      quarterDurationSeconds: rules.quarterDurationSeconds,
      possessionTeamId: match.teamAId,
      lastUpdated: new Date().toISOString(),
    };
    db.basketball_clock_states.push(clockState);
  } else {
    clockState.shotClockRemainingSeconds = Number(duration);
    clockState.lastUpdated = new Date().toISOString();
  }

  saveDatabase();

  const state = getScoringStateForMatch(match) as BasketballMatchScoringState;
  broadcastScoringUpdate(matchId, state);

  res.json({ message: `Shot clock reset to ${duration}s.`, state });
});

/**
 * POST /api/matches/:id/scoring/basketball/quarter
 * Advance to next Quarter (Q1 -> Q2 -> Q3 -> Q4 -> OT1...) or complete match
 */
router.post('/basketball/quarter', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  const { targetQuarter, action = 'NEXT_QUARTER' } = req.body;

  if (match.status === 'COMPLETED' && action !== 'COMPLETE_MATCH') {
    res.status(400).json({ error: 'Match is completed. Scoring is locked.' });
    return;
  }

  const rules = getBasketballMatchRules(match);

  if (!db.basketball_clock_states) db.basketball_clock_states = [];
  let clockState = db.basketball_clock_states.find((c: any) => c.matchId === matchId);

  if (!clockState) {
    clockState = {
      matchId,
      currentQuarter: 1,
      quarterName: 'Q1',
      isClockRunning: false,
      isShotClockRunning: false,
      gameTimeRemainingSeconds: rules.quarterDurationSeconds,
      shotClockRemainingSeconds: rules.shotClockDuration,
      quarterDurationSeconds: rules.quarterDurationSeconds,
      possessionTeamId: match.teamAId,
      lastUpdated: new Date().toISOString(),
    };
    db.basketball_clock_states.push(clockState);
  }

  const prevQuarter = clockState.currentQuarter;
  let manualTriggerEvent: any = null;

  if (action === 'COMPLETE_MATCH') {
    match.status = 'COMPLETED';
    match.updatedAt = new Date().toISOString();
    clockState.isClockRunning = false;
    clockState.isShotClockRunning = false;
    clockState.gameTimeRemainingSeconds = 0;
    clockState.shotClockRemainingSeconds = 0;
  } else if (action === 'NEXT_QUARTER' || action === 'ADVANCE') {
    const nextQ = targetQuarter ? Number(targetQuarter) : prevQuarter + 1;
    const isOT = nextQ > rules.quarters;
    const durationMins = isOT ? rules.overtimeDuration : rules.quarterDuration;
    const durationSeconds = durationMins * 60;

    clockState.currentQuarter = nextQ;
    clockState.quarterName = getBasketballQuarterShortName(nextQ, rules.quarters);
    clockState.quarterDurationSeconds = durationSeconds;
    clockState.gameTimeRemainingSeconds = durationSeconds;
    clockState.shotClockRemainingSeconds = rules.shotClockDuration;
    clockState.isClockRunning = false;
    clockState.isShotClockRunning = false;
    clockState.lastUpdated = new Date().toISOString();

    if (prevQuarter === 2 && nextQ === 3) {
      manualTriggerEvent = {
        type: 'HALF_TIME',
        durationSeconds: 6,
        data: {
          quarterName: 'Half Time',
          scoreA: (getScoringStateForMatch(match) as BasketballMatchScoringState).teamAScore,
          scoreB: (getScoringStateForMatch(match) as BasketballMatchScoringState).teamBScore,
        },
      };
    } else if (isOT) {
      manualTriggerEvent = {
        type: 'OVERTIME',
        durationSeconds: 5,
        data: {
          quarterName: clockState.quarterName,
        },
      };
    } else {
      manualTriggerEvent = {
        type: 'QUARTER_COMPLETE',
        durationSeconds: 5,
        data: {
          quarterName: `End of Q${prevQuarter}`,
        },
      };
    }
  }

  saveDatabase();

  const state = getScoringStateForMatch(match) as BasketballMatchScoringState;
  broadcastScoringUpdate(matchId, {
    ...state,
    manualTriggerEvent,
  });

  res.json({ message: 'Quarter updated successfully.', state });
});

/**
 * POST /api/matches/:id/scoring/basketball/undo
 * Undo the last basketball scoring event and recalculate state
 */
router.post('/basketball/undo', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  const events = (db.basketball_scoring_events || []).filter((e: any) => e.matchId === matchId && !e.isUndone);
  if (events.length === 0) {
    res.status(400).json({ error: 'No active events to undo.' });
    return;
  }

  const lastEvent = events[events.length - 1];
  lastEvent.isUndone = true;

  saveDatabase();

  const state = getScoringStateForMatch(match) as BasketballMatchScoringState;
  broadcastScoringUpdate(matchId, state);
  res.json({ message: `Undid ${lastEvent.eventType} event.`, state });
});

/**
 * PUT /api/matches/:id/scoring/basketball/edit-event
 * Edit a specific basketball scoring event
 */
router.put('/basketball/edit-event', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  const { eventId, updates } = req.body;
  if (!eventId || !updates) {
    res.status(400).json({ error: 'Event ID and updates required.' });
    return;
  }

  const event = (db.basketball_scoring_events || []).find((e: any) => e.id === eventId && e.matchId === matchId);
  if (!event) {
    res.status(404).json({ error: 'Event not found.' });
    return;
  }

  Object.assign(event, updates);
  saveDatabase();

  const state = getScoringStateForMatch(match) as BasketballMatchScoringState;
  broadcastScoringUpdate(matchId, state);
  res.json({ message: 'Basketball event updated.', state });
});

// ==========================================
// TENNIS LIVE SCORING ENGINE ENDPOINTS
// ==========================================

/**
 * POST /api/matches/:id/scoring/tennis/point
 * Record an immutable point event in Tennis (Point -> Game -> Set -> Match)
 */
router.post('/tennis/point', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (match.sport !== 'TENNIS') {
    res.status(400).json({ error: 'This match is not configured for Tennis scoring.' });
    return;
  }

  if (match.status === 'COMPLETED') {
    res.status(400).json({ error: 'Match is completed. Scoring is locked.' });
    return;
  }

  if (!db.tennis_scoring_events) {
    db.tennis_scoring_events = [];
  }

  // Auto transition to LIVE if not already
  if (match.status === 'DRAFT' || match.status === 'READY' || match.status === 'SCHEDULED') {
    match.status = 'LIVE';
    match.updatedAt = new Date().toISOString();
  }

  const {
    pointWinner,
    pointType = 'REGULAR',
    shotDetail,
    winningPlayerId,
    serverPlayerId,
    receiverPlayerId,
  } = req.body;

  let resolvedWinner = pointWinner;
  if (!resolvedWinner && (req.body.pointWinnerTeamId || req.body.winnerTeamId)) {
    const tId = req.body.pointWinnerTeamId || req.body.winnerTeamId;
    resolvedWinner = tId === match.teamAId ? 'TEAM_A' : tId === match.teamBId ? 'TEAM_B' : undefined;
  }
  if (resolvedWinner === match.teamAId) resolvedWinner = 'TEAM_A';
  if (resolvedWinner === match.teamBId) resolvedWinner = 'TEAM_B';

  if (!resolvedWinner || (resolvedWinner !== 'TEAM_A' && resolvedWinner !== 'TEAM_B')) {
    res.status(400).json({ error: 'Valid pointWinner ("TEAM_A" | "TEAM_B") is required.' });
    return;
  }

  const allPlayers = db.players || [];
  const teamAPlayers = allPlayers.filter((p) => p.teamId === match.teamAId);
  const teamBPlayers = allPlayers.filter((p) => p.teamId === match.teamBId);

  // 1. Calculate state BEFORE adding this point
  const stateBefore = getScoringStateForMatch(match) as TennisMatchScoringState;

  if (stateBefore.isMatchComplete) {
    res.status(400).json({ error: 'Match is already completed. Reopen or edit previous events.' });
    return;
  }

  const pointNumber = (stateBefore.events?.length || 0) + 1;
  const currentSetNum = stateBefore.currentSet;
  const currentGamesA = stateBefore.currentGamesA;
  const currentGamesB = stateBefore.currentGamesB;
  const currentPointsA = stateBefore.currentPointsA;
  const currentPointsB = stateBefore.currentPointsB;

  const isServerA = stateBefore.servingTeamId === match.teamAId;
  const activeServerId = serverPlayerId || stateBefore.servingPlayerId;
  const activeReceiverId = receiverPlayerId || stateBefore.receivingPlayerId;

  const serverPlayer = allPlayers.find((p) => p.id === activeServerId);
  const receiverPlayer = allPlayers.find((p) => p.id === activeReceiverId);
  const winningPlayer = winningPlayerId ? allPlayers.find((p) => p.id === winningPlayerId) : pointWinner === 'TEAM_A' ? teamAPlayers[0] : teamBPlayers[0];

  const isAce = pointType === 'ACE';
  const isDoubleFault = pointType === 'DOUBLE_FAULT';
  const isFirstServeFault = pointType === 'FIRST_SERVE_FAULT';
  const isWinner = pointType === 'WINNER';
  const isUnforcedError = pointType === 'UNFORCED_ERROR';

  const isBreakPoint = stateBefore.isBreakPoint && stateBefore.breakPointTeamId === (pointWinner === 'TEAM_A' ? match.teamAId : match.teamBId);
  const isSetPoint = stateBefore.isSetPoint && stateBefore.setPointTeamId === (pointWinner === 'TEAM_A' ? match.teamAId : match.teamBId);
  const isMatchPoint = stateBefore.isMatchPoint && stateBefore.matchPointTeamId === (pointWinner === 'TEAM_A' ? match.teamAId : match.teamBId);
  const isGamePoint = stateBefore.isGamePoint;

  const scoreBeforeObj = {
    setsA: stateBefore.setsA,
    setsB: stateBefore.setsB,
    gamesA: currentGamesA,
    gamesB: currentGamesB,
    pointsA: currentPointsA,
    pointsB: currentPointsB,
  };

  const newEventId = crypto.randomUUID();

  // Create prospective event
  const newEvent: TennisScoringEvent = {
    id: newEventId,
    matchId,
    pointNumber,
    setNumber: currentSetNum,
    gameNumber: currentGamesA + currentGamesB + 1,
    pointInGame: 1,
    serverPlayerId: activeServerId,
    serverPlayerName: serverPlayer?.name || (isServerA ? match.teamA?.name || 'Team A' : match.teamB?.name || 'Team B'),
    serverTeamId: stateBefore.servingTeamId,
    receiverPlayerId: activeReceiverId,
    receiverPlayerName: receiverPlayer?.name || (!isServerA ? match.teamA?.name || 'Team A' : match.teamB?.name || 'Team B'),
    receiverTeamId: stateBefore.receivingTeamId,
    pointWinner: resolvedWinner,
    winningPlayerId: winningPlayer?.id,
    winningPlayerName: winningPlayer?.name,
    pointType,
    shotDetail,
    isAce,
    isDoubleFault,
    isFirstServeFault,
    isWinner,
    isUnforcedError,
    isBreakPoint: stateBefore.isBreakPoint,
    isBreakPointConverted: false,
    isBreakPointSaved: false,
    isSetPoint: stateBefore.isSetPoint,
    isSetPointConverted: false,
    isMatchPoint: stateBefore.isMatchPoint,
    isMatchPointConverted: false,
    isGamePoint,
    isTiebreak: stateBefore.isTiebreak,
    isMatchTiebreak: stateBefore.isMatchTiebreak,
    scoreBefore: scoreBeforeObj,
    scoreAfter: scoreBeforeObj,
    gameWon: false,
    setWon: false,
    matchWon: false,
    timestamp: new Date().toISOString(),
  };

  // Add event temporarily to compute resulting state
  const activeEvents = (db.tennis_scoring_events || []).filter((e: any) => e.matchId === matchId && !e.isUndone);
  const prospectiveEvents = [...activeEvents, newEvent];
  const stateAfter = calculateTennisScoringState(match, prospectiveEvents, allPlayers, activeServerId);

  // Derive conversions & milestones
  const gameWon = stateAfter.currentGamesA !== stateBefore.currentGamesA || stateAfter.currentGamesB !== stateBefore.currentGamesB || stateAfter.currentSet !== stateBefore.currentSet;
  const setWon = stateAfter.setsA !== stateBefore.setsA || stateAfter.setsB !== stateBefore.setsB;
  const matchWon = stateAfter.isMatchComplete;

  newEvent.gameWon = gameWon;
  newEvent.gameWinnerTeamId = gameWon ? (pointWinner === 'TEAM_A' ? match.teamAId : match.teamBId) : undefined;
  newEvent.gameWinnerPlayerName = gameWon ? winningPlayer?.name : undefined;

  newEvent.setWon = setWon;
  newEvent.setWinnerTeamId = setWon ? (pointWinner === 'TEAM_A' ? match.teamAId : match.teamBId) : undefined;
  newEvent.setWinnerPlayerName = setWon ? winningPlayer?.name : undefined;

  newEvent.matchWon = matchWon;
  newEvent.matchWinnerTeamId = matchWon ? stateAfter.winnerTeamId : undefined;
  newEvent.matchWinnerPlayerName = matchWon ? stateAfter.winnerPlayerName : undefined;

  if (isBreakPoint && gameWon) {
    newEvent.isBreakPointConverted = true;
  } else if (stateBefore.isBreakPoint && !isBreakPoint && !gameWon) {
    newEvent.isBreakPointSaved = true;
  }

  if (isSetPoint && setWon) {
    newEvent.isSetPointConverted = true;
  }
  if (isMatchPoint && matchWon) {
    newEvent.isMatchPointConverted = true;
  }

  newEvent.scoreAfter = {
    setsA: stateAfter.setsA,
    setsB: stateAfter.setsB,
    gamesA: stateAfter.currentGamesA,
    gamesB: stateAfter.currentGamesB,
    pointsA: stateAfter.currentPointsA,
    pointsB: stateAfter.currentPointsB,
  };

  // Push to persistent database
  db.tennis_scoring_events.push(newEvent);

  if (matchWon) {
    match.status = 'COMPLETED';
    match.updatedAt = new Date().toISOString();
  }

  saveDatabase();

  // Determine Realtime Broadcast Graphic Trigger
  let manualTriggerEvent: any = null;
  if (matchWon) {
    manualTriggerEvent = {
      type: 'MATCH_WON',
      durationSeconds: 7,
      data: {
        winnerName: stateAfter.winnerPlayerName || 'Champion',
        resultText: stateAfter.matchResultText,
      },
    };
  } else if (setWon) {
    manualTriggerEvent = {
      type: 'SET_WON',
      durationSeconds: 5,
      data: {
        setNumber: stateBefore.currentSet,
        winnerName: winningPlayer?.name || (pointWinner === 'TEAM_A' ? match.teamA?.name : match.teamB?.name),
        scoreDisplay: `${stateAfter.setsA}-${stateAfter.setsB}`,
      },
    };
  } else if (newEvent.isBreakPointConverted) {
    manualTriggerEvent = {
      type: 'BREAK_POINT',
      durationSeconds: 4,
      data: {
        winnerName: winningPlayer?.name || (pointWinner === 'TEAM_A' ? match.teamA?.name : match.teamB?.name),
        subtitle: 'BREAK OF SERVE',
      },
    };
  } else if (isAce) {
    manualTriggerEvent = {
      type: 'ACE',
      durationSeconds: 3.5,
      data: {
        playerName: serverPlayer?.name || 'Server',
      },
    };
  } else if (isDoubleFault) {
    manualTriggerEvent = {
      type: 'DOUBLE_FAULT',
      durationSeconds: 3.5,
      data: {
        playerName: serverPlayer?.name || 'Server',
      },
    };
  } else if (gameWon) {
    manualTriggerEvent = {
      type: 'GAME_WON',
      durationSeconds: 3,
      data: {
        winnerName: winningPlayer?.name || (pointWinner === 'TEAM_A' ? match.teamA?.name : match.teamB?.name),
      },
    };
  }

  const finalState = getScoringStateForMatch(match) as TennisMatchScoringState;
  broadcastScoringUpdate(matchId, {
    ...finalState,
    manualTriggerEvent,
  });

  res.json({
    message: `Point recorded for ${pointWinner === 'TEAM_A' ? 'Team A' : 'Team B'} (${pointType}).`,
    event: newEvent,
    state: finalState,
  });
});

/**
 * POST /api/matches/:id/scoring/tennis/server
 * Update or switch current server
 */
router.post('/tennis/server', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (match.status === 'COMPLETED') {
    res.status(400).json({ error: 'Match is completed. Scoring is locked.' });
    return;
  }

  const { serverPlayerId, serverTeamId } = req.body;
  if (!serverPlayerId) {
    res.status(400).json({ error: 'serverPlayerId is required.' });
    return;
  }

  if (!db.tennis_serve_states) {
    db.tennis_serve_states = [];
  }

  let serveState = db.tennis_serve_states.find((s: any) => s.matchId === matchId);
  if (!serveState) {
    serveState = { matchId, serverPlayerId, serverTeamId, lastUpdated: new Date().toISOString() };
    db.tennis_serve_states.push(serveState);
  } else {
    serveState.serverPlayerId = serverPlayerId;
    serveState.serverTeamId = serverTeamId;
    serveState.lastUpdated = new Date().toISOString();
  }

  saveDatabase();

  const state = getScoringStateForMatch(match) as TennisMatchScoringState;
  broadcastScoringUpdate(matchId, state);

  res.json({ message: 'Server updated successfully.', state });
});

/**
 * POST /api/matches/:id/scoring/tennis/undo
 * Undo the last Tennis point event and recalculate state
 */
router.post('/tennis/undo', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  const events = (db.tennis_scoring_events || []).filter((e: any) => e.matchId === matchId && !e.isUndone);
  if (events.length === 0) {
    res.status(400).json({ error: 'No active Tennis point events to undo.' });
    return;
  }

  const lastEvent = events[events.length - 1];
  lastEvent.isUndone = true;

  if (match.status === 'COMPLETED') {
    match.status = 'LIVE';
    match.updatedAt = new Date().toISOString();
  }

  saveDatabase();

  const state = getScoringStateForMatch(match) as TennisMatchScoringState;
  broadcastScoringUpdate(matchId, state);

  res.json({ message: `Undid point event #${lastEvent.pointNumber}.`, state });
});

/**
 * PUT /api/matches/:id/scoring/tennis/edit-event
 * Edit a specific Tennis scoring event
 */
router.put('/tennis/edit-event', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  const { eventId, updates } = req.body;
  if (!eventId || !updates) {
    res.status(400).json({ error: 'Event ID and updates required.' });
    return;
  }

  const event = (db.tennis_scoring_events || []).find((e: any) => e.id === eventId && e.matchId === matchId);
  if (!event) {
    res.status(404).json({ error: 'Event not found.' });
    return;
  }

  Object.assign(event, updates);
  saveDatabase();

  const state = getScoringStateForMatch(match) as TennisMatchScoringState;
  broadcastScoringUpdate(matchId, state);

  res.json({ message: 'Tennis point event updated.', state });
});

// ==========================================
// BADMINTON LIVE SCORING ENGINE ENDPOINTS
// ==========================================

/**
 * GET /api/matches/:id/scoring/badminton
 * Get current Badminton match scoring state
 */
router.get('/badminton', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (match.sport !== 'BADMINTON') {
    res.status(400).json({ error: 'This match is not configured for Badminton scoring.' });
    return;
  }

  if (!canUserAccessMatch(req.user, match, 'VIEW')) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to view scoring for this match.' });
    return;
  }

  const state = getScoringStateForMatch(match) as BadmintonMatchScoringState;
  res.json({ state });
});

/**
 * POST /api/matches/:id/scoring/badminton/start
 * Initialize or start Badminton match scoring
 */
router.post('/badminton/start', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (match.sport !== 'BADMINTON') {
    res.status(400).json({ error: 'This match is not configured for Badminton.' });
    return;
  }

  if (match.status === 'COMPLETED') {
    res.status(400).json({ error: 'Match is completed. Scoring is locked.' });
    return;
  }

  const { firstServerTeamId, firstServerPlayerId, firstReceiverTeamId, firstReceiverPlayerId } = req.body;

  if (!db.badminton_serve_states) {
    db.badminton_serve_states = [];
  }

  let serveState = db.badminton_serve_states.find((s: any) => s.matchId === matchId);
  if (!serveState) {
    serveState = {
      matchId,
      teamId: firstServerTeamId || match.badmintonConfig?.firstServerTeamId || match.teamAId,
      playerId: firstServerPlayerId || match.badmintonConfig?.firstServerPlayerId,
      receiverTeamId: firstReceiverTeamId || match.badmintonConfig?.firstReceiverTeamId || match.teamBId,
      receiverPlayerId: firstReceiverPlayerId || match.badmintonConfig?.firstReceiverPlayerId,
      lastUpdated: new Date().toISOString(),
    };
    db.badminton_serve_states.push(serveState);
  } else {
    if (firstServerTeamId) serveState.teamId = firstServerTeamId;
    if (firstServerPlayerId) serveState.playerId = firstServerPlayerId;
    if (firstReceiverTeamId) serveState.receiverTeamId = firstReceiverTeamId;
    if (firstReceiverPlayerId) serveState.receiverPlayerId = firstReceiverPlayerId;
    serveState.lastUpdated = new Date().toISOString();
  }

  if (match.status === 'DRAFT' || match.status === 'READY' || match.status === 'SCHEDULED') {
    match.status = 'LIVE';
    match.updatedAt = new Date().toISOString();
  }

  // Audit log
  db.audit_logs.push({
    id: crypto.randomUUID(),
    userId: req.user?.id,
    userName: req.user?.name,
    userEmail: req.user?.email,
    action: 'MATCH_UPDATE',
    details: `Badminton Match Started: "${match.name}" (ID: ${match.id})`,
    timestamp: new Date().toISOString(),
  });

  saveDatabase();

  const state = getScoringStateForMatch(match) as BadmintonMatchScoringState;
  broadcastScoringUpdate(matchId, state);

  res.json({ message: 'Badminton match started successfully.', state });
});

/**
 * POST /api/matches/:id/scoring/badminton/rally
 * Record an immutable Badminton rally event (Rally -> Point -> Game -> Match)
 */
router.post(['/badminton/rally', '/badminton/point'], requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (match.sport !== 'BADMINTON') {
    res.status(400).json({ error: 'This match is not configured for Badminton scoring.' });
    return;
  }

  if (match.status === 'COMPLETED') {
    res.status(400).json({ error: 'Match is completed. Scoring is locked.' });
    return;
  }

  if (!db.badminton_scoring_events) {
    db.badminton_scoring_events = [];
  }

  // Auto transition to LIVE if not already
  if (match.status === 'DRAFT' || match.status === 'READY' || match.status === 'SCHEDULED') {
    match.status = 'LIVE';
    match.updatedAt = new Date().toISOString();
  }

  let {
    winnerSide,
    winnerPlayerId,
    eventType = 'RALLY_WON',
    shotDetail,
    metadata,
  } = req.body;

  let resolvedWinner = winnerSide || req.body.winnerTeamId || req.body.pointWinnerTeamId || req.body.pointWinner;
  if (resolvedWinner === match.teamAId || resolvedWinner === 'SIDE_A') resolvedWinner = 'TEAM_A';
  if (resolvedWinner === match.teamBId || resolvedWinner === 'SIDE_B') resolvedWinner = 'TEAM_B';

  if (!resolvedWinner || (resolvedWinner !== 'TEAM_A' && resolvedWinner !== 'TEAM_B')) {
    res.status(400).json({ error: 'Valid winnerSide ("TEAM_A" | "TEAM_B") is required.' });
    return;
  }
  winnerSide = resolvedWinner;

  // 1. Calculate state BEFORE adding this rally
  const stateBefore = getScoringStateForMatch(match) as BadmintonMatchScoringState;

  if (stateBefore.isCompleted) {
    res.status(400).json({ error: 'Match is already completed. Reopen or edit previous events.' });
    return;
  }

  const rallyNumber = (stateBefore.events?.length || 0) + 1;
  const currentGameNum = stateBefore.currentGame;
  const currentRalliesInGame = stateBefore.events.filter((e) => e.gameNumber === currentGameNum).length + 1;

  const resolvedWinnerTeamId = winnerSide === 'TEAM_A' ? match.teamAId : match.teamBId;
  const resolvedWinnerPlayerId = winnerPlayerId || (winnerSide === stateBefore.servingTeam ? stateBefore.servingPlayerId : stateBefore.receivingPlayerId);
  const resolvedWinnerPlayerName = winnerSide === stateBefore.servingTeam ? stateBefore.servingPlayerName : stateBefore.receivingPlayerName;

  const event: BadmintonScoringEvent = {
    id: crypto.randomUUID(),
    matchId,
    rallyNumber,
    gameNumber: currentGameNum,
    rallyInGame: currentRalliesInGame,
    serverPlayerId: stateBefore.servingPlayerId,
    serverPlayerName: stateBefore.servingPlayerName,
    receiverPlayerId: stateBefore.receivingPlayerId,
    receiverPlayerName: stateBefore.receivingPlayerName,
    servingTeam: stateBefore.servingTeam,
    servingTeamId: stateBefore.servingTeamId,
    receivingTeam: stateBefore.receivingTeam,
    receivingTeamId: stateBefore.receivingTeamId,
    winnerSide,
    winnerTeamId: resolvedWinnerTeamId,
    winnerPlayerId: resolvedWinnerPlayerId,
    winnerPlayerName: resolvedWinnerPlayerName,
    eventType,
    serviceCourt: stateBefore.serviceCourt,
    shotDetail,
    scoreBefore: {
      gamesA: stateBefore.gamesWonA,
      gamesB: stateBefore.gamesWonB,
      scoreA: stateBefore.currentScoreA,
      scoreB: stateBefore.currentScoreB,
    },
    scoreAfter: {
      gamesA: stateBefore.gamesWonA,
      gamesB: stateBefore.gamesWonB,
      scoreA: winnerSide === 'TEAM_A' ? stateBefore.currentScoreA + 1 : stateBefore.currentScoreA,
      scoreB: winnerSide === 'TEAM_B' ? stateBefore.currentScoreB + 1 : stateBefore.currentScoreB,
    },
    gameWon: false,
    matchWon: false,
    timestamp: new Date().toISOString(),
    metadata,
    isUndone: false,
  };

  db.badminton_scoring_events.push(event);

  // 2. Recompute state AFTER adding the rally
  const stateAfter = getScoringStateForMatch(match) as BadmintonMatchScoringState;

  // Check if a game was completed in this rally
  if (stateAfter.gamesWonA > stateBefore.gamesWonA || stateAfter.gamesWonB > stateBefore.gamesWonB) {
    event.gameWon = true;
    event.gameWinnerTeamId = resolvedWinnerTeamId;
    event.gameWinnerPlayerName = resolvedWinnerPlayerName;

    db.audit_logs.push({
      id: crypto.randomUUID(),
      userId: req.user?.id,
      userName: req.user?.name,
      userEmail: req.user?.email,
      action: 'MATCH_UPDATE',
      details: `Game Completed in Badminton match "${match.name}": Game ${currentGameNum} won by ${resolvedWinnerPlayerName || resolvedWinnerTeamId}`,
      timestamp: new Date().toISOString(),
    });
  }

  // Check if match was completed
  if (stateAfter.isCompleted) {
    event.matchWon = true;
    event.matchWinnerTeamId = stateAfter.winnerTeamId;
    event.matchWinnerPlayerName = stateAfter.winnerPlayerName;
    match.status = 'COMPLETED';
    match.updatedAt = new Date().toISOString();

    db.audit_logs.push({
      id: crypto.randomUUID(),
      userId: req.user?.id,
      userName: req.user?.name,
      userEmail: req.user?.email,
      action: 'MATCH_UPDATE',
      details: `Badminton Match Completed: "${match.name}" Winner: ${stateAfter.winnerPlayerName || stateAfter.winnerTeamId}`,
      timestamp: new Date().toISOString(),
    });
  } else {
    // Standard rally audit
    db.audit_logs.push({
      id: crypto.randomUUID(),
      userId: req.user?.id,
      userName: req.user?.name,
      userEmail: req.user?.email,
      action: 'MATCH_UPDATE',
      details: `Rally Added: Match "${match.name}" Rally #${rallyNumber} (${eventType} to ${winnerSide}) Score: ${stateAfter.currentScoreA}-${stateAfter.currentScoreB}`,
      timestamp: new Date().toISOString(),
    });
  }

  saveDatabase();

  broadcastScoringUpdate(matchId, stateAfter);

  res.json({
    message: 'Rally recorded successfully.',
    state: stateAfter,
    event,
  });
});

/**
 * POST /api/matches/:id/scoring/badminton/undo
 * Undo the last Badminton rally event and recalculate state
 */
router.post('/badminton/undo', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  const events = (db.badminton_scoring_events || []).filter((e: any) => e.matchId === matchId && !e.isUndone);
  if (events.length === 0) {
    res.status(400).json({ error: 'No active Badminton rally events to undo.' });
    return;
  }

  const lastEvent = events[events.length - 1];
  lastEvent.isUndone = true;

  if (match.status === 'COMPLETED') {
    match.status = 'LIVE';
    match.updatedAt = new Date().toISOString();
  }

  db.audit_logs.push({
    id: crypto.randomUUID(),
    userId: req.user?.id,
    userName: req.user?.name,
    userEmail: req.user?.email,
    action: 'MATCH_UPDATE',
    details: `Rally Undone: Match "${match.name}" Rally #${lastEvent.rallyNumber}`,
    timestamp: new Date().toISOString(),
  });

  saveDatabase();

  const state = getScoringStateForMatch(match) as BadmintonMatchScoringState;
  broadcastScoringUpdate(matchId, state);

  res.json({ message: `Undid rally event #${lastEvent.rallyNumber}.`, state });
});

/**
 * PUT /api/matches/:id/scoring/badminton/edit-event
 * Edit a specific Badminton scoring event
 */
router.put('/badminton/edit-event', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  const { eventId, updates } = req.body;
  if (!eventId || !updates) {
    res.status(400).json({ error: 'Event ID and updates required.' });
    return;
  }

  const event = (db.badminton_scoring_events || []).find((e: any) => e.id === eventId && e.matchId === matchId);
  if (!event) {
    res.status(404).json({ error: 'Event not found.' });
    return;
  }

  Object.assign(event, updates);

  db.audit_logs.push({
    id: crypto.randomUUID(),
    userId: req.user?.id,
    userName: req.user?.name,
    userEmail: req.user?.email,
    action: 'MATCH_UPDATE',
    details: `Rally Edited: Match "${match.name}" Event ID: ${eventId}`,
    timestamp: new Date().toISOString(),
  });

  saveDatabase();

  const state = getScoringStateForMatch(match) as BadmintonMatchScoringState;
  broadcastScoringUpdate(matchId, state);

  res.json({ message: 'Badminton rally event updated.', state });
});

/**
 * POST /api/matches/:id/scoring/badminton/server
 * Manually update/configure server for Badminton
 */
router.post('/badminton/server', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  const { serverPlayerId, serverTeamId, receiverPlayerId, receiverTeamId } = req.body;

  if (!db.badminton_serve_states) {
    db.badminton_serve_states = [];
  }

  let serveState = db.badminton_serve_states.find((s: any) => s.matchId === matchId);
  if (!serveState) {
    serveState = { matchId, teamId: serverTeamId, playerId: serverPlayerId, receiverTeamId, receiverPlayerId, lastUpdated: new Date().toISOString() };
    db.badminton_serve_states.push(serveState);
  } else {
    if (serverPlayerId) serveState.playerId = serverPlayerId;
    if (serverTeamId) serveState.teamId = serverTeamId;
    if (receiverPlayerId) serveState.receiverPlayerId = receiverPlayerId;
    if (receiverTeamId) serveState.receiverTeamId = receiverTeamId;
    serveState.lastUpdated = new Date().toISOString();
  }

  saveDatabase();

  const state = getScoringStateForMatch(match) as BadmintonMatchScoringState;
  broadcastScoringUpdate(matchId, state);

  res.json({ message: 'Server updated successfully.', state });
});

// =========================================================================
// TABLE TENNIS SCORING ENDPOINTS
// =========================================================================

/**
 * GET /api/matches/:id/scoring/table-tennis
 * Get Table Tennis live scoring state
 */
router.get('/table-tennis', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (match.sport !== 'TABLE_TENNIS') {
    res.status(400).json({ error: 'This match is not configured for Table Tennis.' });
    return;
  }

  if (!canUserAccessMatch(req.user, match, 'VIEW')) {
    res.status(403).json({ error: 'Forbidden: You do not have permission to view scoring for this match.' });
    return;
  }

  const state = getScoringStateForMatch(match) as TableTennisMatchScoringState;
  res.json({ state });
});

/**
 * POST /api/matches/:id/scoring/table-tennis/start
 * Initialize or start Table Tennis match scoring
 */
router.post('/table-tennis/start', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (match.sport !== 'TABLE_TENNIS') {
    res.status(400).json({ error: 'This match is not configured for Table Tennis.' });
    return;
  }

  if (match.status === 'COMPLETED') {
    res.status(400).json({ error: 'Match is completed. Scoring is locked.' });
    return;
  }

  const { firstServerTeamId, firstServerPlayerId, firstReceiverTeamId, firstReceiverPlayerId } = req.body;

  if (!db.table_tennis_serve_states) {
    db.table_tennis_serve_states = [];
  }

  let serveState = db.table_tennis_serve_states.find((s: any) => s.matchId === matchId);
  if (!serveState) {
    serveState = {
      matchId,
      teamId: firstServerTeamId || match.tableTennisConfig?.firstServerTeamId || match.teamAId,
      playerId: firstServerPlayerId || match.tableTennisConfig?.firstServerPlayerId,
      receiverTeamId: firstReceiverTeamId || match.tableTennisConfig?.firstReceiverTeamId || match.teamBId,
      receiverPlayerId: firstReceiverPlayerId || match.tableTennisConfig?.firstReceiverPlayerId,
      lastUpdated: new Date().toISOString(),
    };
    db.table_tennis_serve_states.push(serveState);
  } else {
    if (firstServerTeamId) serveState.teamId = firstServerTeamId;
    if (firstServerPlayerId) serveState.playerId = firstServerPlayerId;
    if (firstReceiverTeamId) serveState.receiverTeamId = firstReceiverTeamId;
    if (firstReceiverPlayerId) serveState.receiverPlayerId = firstReceiverPlayerId;
    serveState.lastUpdated = new Date().toISOString();
  }

  if (match.status === 'DRAFT' || match.status === 'READY' || match.status === 'SCHEDULED') {
    match.status = 'LIVE';
    match.updatedAt = new Date().toISOString();
  }

  // Audit log
  db.audit_logs.push({
    id: crypto.randomUUID(),
    userId: req.user?.id,
    userName: req.user?.name,
    userEmail: req.user?.email,
    action: 'MATCH_UPDATE',
    details: `Table Tennis Match Started: "${match.name}" (ID: ${match.id})`,
    timestamp: new Date().toISOString(),
  });

  saveDatabase();

  const state = getScoringStateForMatch(match) as TableTennisMatchScoringState;
  broadcastScoringUpdate(matchId, state);

  res.json({ message: 'Table Tennis match started successfully.', state });
});

/**
 * POST /api/matches/:id/scoring/table-tennis/point
 * Record an immutable Table Tennis point event
 */
router.post('/table-tennis/point', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (match.sport !== 'TABLE_TENNIS') {
    res.status(400).json({ error: 'This match is not configured for Table Tennis scoring.' });
    return;
  }

  if (match.status === 'COMPLETED') {
    res.status(400).json({ error: 'Match is completed. Scoring is locked.' });
    return;
  }

  if (!db.table_tennis_scoring_events) {
    db.table_tennis_scoring_events = [];
  }

  // Auto transition to LIVE if not already
  if (match.status === 'DRAFT' || match.status === 'READY' || match.status === 'SCHEDULED') {
    match.status = 'LIVE';
    match.updatedAt = new Date().toISOString();
  }

  let {
    winnerSide,
    winnerPlayerId,
    pointType = 'POINT_WON',
    shotDetail,
    metadata,
  } = req.body;

  let resolvedWinner = winnerSide || req.body.winnerTeamId || req.body.pointWinnerTeamId || req.body.pointWinner;
  if (resolvedWinner === match.teamAId || resolvedWinner === 'SIDE_A') resolvedWinner = 'TEAM_A';
  if (resolvedWinner === match.teamBId || resolvedWinner === 'SIDE_B') resolvedWinner = 'TEAM_B';

  if (!resolvedWinner || (resolvedWinner !== 'TEAM_A' && resolvedWinner !== 'TEAM_B')) {
    res.status(400).json({ error: 'Valid winnerSide ("TEAM_A" | "TEAM_B") is required.' });
    return;
  }
  winnerSide = resolvedWinner;

  // 1. Calculate state BEFORE adding this rally/point
  const stateBefore = getScoringStateForMatch(match) as TableTennisMatchScoringState;

  if (stateBefore.isCompleted) {
    res.status(400).json({ error: 'Match is already completed. Reopen or undo previous points to continue.' });
    return;
  }

  const rallyNumber = (stateBefore.events?.length || 0) + 1;
  const currentGameNum = stateBefore.currentGame;
  const currentRalliesInGame = stateBefore.events.filter((e) => e.gameNumber === currentGameNum).length + 1;

  const resolvedWinnerTeamId = winnerSide === 'TEAM_A' ? match.teamAId : match.teamBId;
  const resolvedWinnerPlayerId = winnerPlayerId || (winnerSide === stateBefore.servingTeam ? stateBefore.servingPlayerId : stateBefore.receivingPlayerId);
  const resolvedWinnerPlayerName = winnerSide === stateBefore.servingTeam ? stateBefore.servingPlayerName : stateBefore.receivingPlayerName;

  const event: TableTennisScoringEvent = {
    id: crypto.randomUUID(),
    matchId,
    rallyNumber,
    gameNumber: currentGameNum,
    rallyInGame: currentRalliesInGame,
    serverPlayerId: stateBefore.servingPlayerId,
    serverPlayerName: stateBefore.servingPlayerName,
    receiverPlayerId: stateBefore.receivingPlayerId,
    receiverPlayerName: stateBefore.receivingPlayerName,
    serverTeamId: stateBefore.servingTeamId,
    receiverTeamId: stateBefore.receivingTeamId,
    pointWinner: winnerSide,
    pointWinnerPlayerId: resolvedWinnerPlayerId,
    pointWinnerPlayerName: resolvedWinnerPlayerName,
    pointType,
    shotDetail,
    scoreBefore: {
      gamesA: stateBefore.gamesWonA,
      gamesB: stateBefore.gamesWonB,
      scoreA: stateBefore.currentScoreA,
      scoreB: stateBefore.currentScoreB,
    },
    scoreAfter: {
      gamesA: stateBefore.gamesWonA,
      gamesB: stateBefore.gamesWonB,
      scoreA: winnerSide === 'TEAM_A' ? stateBefore.currentScoreA + 1 : stateBefore.currentScoreA,
      scoreB: winnerSide === 'TEAM_B' ? stateBefore.currentScoreB + 1 : stateBefore.currentScoreB,
    },
    gameWon: false,
    matchWon: false,
    timestamp: new Date().toISOString(),
    metadata,
    isUndone: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.table_tennis_scoring_events.push(event);

  // 2. Recompute state AFTER adding point
  const stateAfter = getScoringStateForMatch(match) as TableTennisMatchScoringState;

  // Check if a game was completed in this rally
  if (stateAfter.gamesWonA > stateBefore.gamesWonA || stateAfter.gamesWonB > stateBefore.gamesWonB) {
    event.gameWon = true;
    event.gameWinnerTeamId = resolvedWinnerTeamId;
    event.gameWinnerPlayerName = resolvedWinnerPlayerName;

    db.audit_logs.push({
      id: crypto.randomUUID(),
      userId: req.user?.id,
      userName: req.user?.name,
      userEmail: req.user?.email,
      action: 'MATCH_UPDATE',
      details: `Game Completed in Table Tennis match "${match.name}": Game ${currentGameNum} won by ${resolvedWinnerPlayerName || resolvedWinnerTeamId}`,
      timestamp: new Date().toISOString(),
    });
  }

  // Check if match was completed
  if (stateAfter.isCompleted) {
    event.matchWon = true;
    event.matchWinnerTeamId = stateAfter.winnerTeamId;
    event.matchWinnerPlayerName = stateAfter.winnerPlayerName;
    match.status = 'COMPLETED';
    match.updatedAt = new Date().toISOString();

    db.audit_logs.push({
      id: crypto.randomUUID(),
      userId: req.user?.id,
      userName: req.user?.name,
      userEmail: req.user?.email,
      action: 'MATCH_UPDATE',
      details: `Table Tennis Match Completed: "${match.name}" Winner: ${stateAfter.winnerPlayerName || stateAfter.winnerTeamId}`,
      timestamp: new Date().toISOString(),
    });
  } else {
    // Standard point audit
    db.audit_logs.push({
      id: crypto.randomUUID(),
      userId: req.user?.id,
      userName: req.user?.name,
      userEmail: req.user?.email,
      action: 'MATCH_UPDATE',
      details: `Point Added: Match "${match.name}" Rally #${rallyNumber} (${pointType} to ${winnerSide}) Score: ${stateAfter.currentScoreA}-${stateAfter.currentScoreB}`,
      timestamp: new Date().toISOString(),
    });
  }

  saveDatabase();

  broadcastScoringUpdate(matchId, stateAfter);

  res.json({
    message: 'Point recorded successfully.',
    state: stateAfter,
    event,
  });
});

/**
 * POST /api/matches/:id/scoring/table-tennis/undo
 * Undo the last Table Tennis point event and recalculate state
 */
router.post('/table-tennis/undo', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  const events = (db.table_tennis_scoring_events || []).filter((e: any) => e.matchId === matchId && !e.isUndone);
  if (events.length === 0) {
    res.status(400).json({ error: 'No active Table Tennis point events to undo.' });
    return;
  }

  const lastEvent = events[events.length - 1];
  lastEvent.isUndone = true;

  if (match.status === 'COMPLETED') {
    match.status = 'LIVE';
    match.updatedAt = new Date().toISOString();
  }

  db.audit_logs.push({
    id: crypto.randomUUID(),
    userId: req.user?.id,
    userName: req.user?.name,
    userEmail: req.user?.email,
    action: 'MATCH_UPDATE',
    details: `Point Undone: Match "${match.name}" Rally #${lastEvent.rallyNumber}`,
    timestamp: new Date().toISOString(),
  });

  saveDatabase();

  const state = getScoringStateForMatch(match) as TableTennisMatchScoringState;
  broadcastScoringUpdate(matchId, state);

  res.json({ message: `Undid point event #${lastEvent.rallyNumber}.`, state });
});

/**
 * PUT /api/matches/:id/scoring/table-tennis/edit-event
 * Edit a specific Table Tennis scoring event
 */
router.put('/table-tennis/edit-event', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  const { eventId, updates } = req.body;
  if (!eventId || !updates) {
    res.status(400).json({ error: 'Event ID and updates required.' });
    return;
  }

  const event = (db.table_tennis_scoring_events || []).find((e: any) => e.id === eventId && e.matchId === matchId);
  if (!event) {
    res.status(404).json({ error: 'Event not found.' });
    return;
  }

  Object.assign(event, updates);
  event.updatedAt = new Date().toISOString();

  db.audit_logs.push({
    id: crypto.randomUUID(),
    userId: req.user?.id,
    userName: req.user?.name,
    userEmail: req.user?.email,
    action: 'MATCH_UPDATE',
    details: `Event Edited: Match "${match.name}" Event ID: ${eventId}`,
    timestamp: new Date().toISOString(),
  });

  saveDatabase();

  const state = getScoringStateForMatch(match) as TableTennisMatchScoringState;
  broadcastScoringUpdate(matchId, state);

  res.json({ message: 'Table Tennis scoring event updated.', state });
});

/**
 * POST /api/matches/:id/scoring/table-tennis/server
 * Manually update server/receiver order
 */
router.post('/table-tennis/server', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (match.status === 'COMPLETED') {
    res.status(400).json({ error: 'Match is completed. Scoring is locked.' });
    return;
  }

  const { serverPlayerId, serverTeamId, receiverPlayerId, receiverTeamId } = req.body;

  if (!db.table_tennis_serve_states) {
    db.table_tennis_serve_states = [];
  }

  let serveState = db.table_tennis_serve_states.find((s: any) => s.matchId === matchId);
  if (!serveState) {
    serveState = { matchId, teamId: serverTeamId, playerId: serverPlayerId, receiverTeamId, receiverPlayerId, lastUpdated: new Date().toISOString() };
    db.table_tennis_serve_states.push(serveState);
  } else {
    if (serverPlayerId) serveState.playerId = serverPlayerId;
    if (serverTeamId) serveState.teamId = serverTeamId;
    if (receiverPlayerId) serveState.receiverPlayerId = receiverPlayerId;
    if (receiverTeamId) serveState.receiverTeamId = receiverTeamId;
    serveState.lastUpdated = new Date().toISOString();
  }

  saveDatabase();

  const state = getScoringStateForMatch(match) as TableTennisMatchScoringState;
  broadcastScoringUpdate(matchId, state);

  res.json({ message: 'Server updated successfully.', state });
});

/**
 * POST /api/matches/:id/scoring/table-tennis/timeout
 * Record a 60s timeout for Team A or Team B
 */
router.post('/table-tennis/timeout', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (match.status === 'COMPLETED') {
    res.status(400).json({ error: 'Match is completed. Scoring is locked.' });
    return;
  }

  const { teamId } = req.body;
  if (!teamId) {
    res.status(400).json({ error: 'teamId is required for timeout.' });
    return;
  }

  if (!db.table_tennis_scoring_events) {
    db.table_tennis_scoring_events = [];
  }

  const stateBefore = getScoringStateForMatch(match) as TableTennisMatchScoringState;

  const timeoutEvent: TableTennisScoringEvent = {
    id: crypto.randomUUID(),
    matchId,
    rallyNumber: (stateBefore.events?.length || 0) + 1,
    gameNumber: stateBefore.currentGame,
    rallyInGame: stateBefore.events.filter((e) => e.gameNumber === stateBefore.currentGame).length + 1,
    serverPlayerId: stateBefore.servingPlayerId,
    serverPlayerName: stateBefore.servingPlayerName,
    receiverPlayerId: stateBefore.receivingPlayerId,
    receiverPlayerName: stateBefore.receivingPlayerName,
    serverTeamId: stateBefore.servingTeamId,
    receiverTeamId: stateBefore.receivingTeamId,
    pointWinner: teamId === match.teamAId ? 'TEAM_A' : 'TEAM_B',
    pointType: 'TIMEOUT',
    scoreBefore: {
      gamesA: stateBefore.gamesWonA,
      gamesB: stateBefore.gamesWonB,
      scoreA: stateBefore.currentScoreA,
      scoreB: stateBefore.currentScoreB,
    },
    scoreAfter: {
      gamesA: stateBefore.gamesWonA,
      gamesB: stateBefore.gamesWonB,
      scoreA: stateBefore.currentScoreA,
      scoreB: stateBefore.currentScoreB,
    },
    gameWon: false,
    matchWon: false,
    isTimeout: true,
    timeoutTeamId: teamId,
    timestamp: new Date().toISOString(),
    isUndone: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.table_tennis_scoring_events.push(timeoutEvent);

  db.audit_logs.push({
    id: crypto.randomUUID(),
    userId: req.user?.id,
    userName: req.user?.name,
    userEmail: req.user?.email,
    action: 'MATCH_UPDATE',
    details: `Timeout Called: Match "${match.name}" by Team ID: ${teamId}`,
    timestamp: new Date().toISOString(),
  });

  saveDatabase();

  const stateAfter = getScoringStateForMatch(match) as TableTennisMatchScoringState;
  broadcastScoringUpdate(matchId, stateAfter);

  res.json({ message: 'Timeout recorded.', state: stateAfter, event: timeoutEvent });
});

/**
 * POST /api/matches/:id/scoring/table-tennis/end-change
 * Acknowledge or record an explicit End Change
 */
router.post('/table-tennis/end-change', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (!db.table_tennis_scoring_events) {
    db.table_tennis_scoring_events = [];
  }

  const stateBefore = getScoringStateForMatch(match) as TableTennisMatchScoringState;

  const endChangeEvent: TableTennisScoringEvent = {
    id: crypto.randomUUID(),
    matchId,
    rallyNumber: (stateBefore.events?.length || 0) + 1,
    gameNumber: stateBefore.currentGame,
    rallyInGame: stateBefore.events.filter((e) => e.gameNumber === stateBefore.currentGame).length + 1,
    serverPlayerId: stateBefore.servingPlayerId,
    serverPlayerName: stateBefore.servingPlayerName,
    receiverPlayerId: stateBefore.receivingPlayerId,
    receiverPlayerName: stateBefore.receivingPlayerName,
    serverTeamId: stateBefore.servingTeamId,
    receiverTeamId: stateBefore.receivingTeamId,
    pointWinner: stateBefore.servingTeam,
    pointType: 'END_CHANGE',
    isEndChange: true,
    scoreBefore: {
      gamesA: stateBefore.gamesWonA,
      gamesB: stateBefore.gamesWonB,
      scoreA: stateBefore.currentScoreA,
      scoreB: stateBefore.currentScoreB,
    },
    scoreAfter: {
      gamesA: stateBefore.gamesWonA,
      gamesB: stateBefore.gamesWonB,
      scoreA: stateBefore.currentScoreA,
      scoreB: stateBefore.currentScoreB,
    },
    gameWon: false,
    matchWon: false,
    timestamp: new Date().toISOString(),
    isUndone: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.table_tennis_scoring_events.push(endChangeEvent);

  db.audit_logs.push({
    id: crypto.randomUUID(),
    userId: req.user?.id,
    userName: req.user?.name,
    userEmail: req.user?.email,
    action: 'MATCH_UPDATE',
    details: `Ends Changed: Match "${match.name}" Game ${stateBefore.currentGame}`,
    timestamp: new Date().toISOString(),
  });

  saveDatabase();

  const stateAfter = getScoringStateForMatch(match) as TableTennisMatchScoringState;
  broadcastScoringUpdate(matchId, stateAfter);

  res.json({ message: 'Ends changed recorded.', state: stateAfter, event: endChangeEvent });
});

// ==========================================
// GENERIC / CUSTOM SPORT SCORING ENDPOINTS
// ==========================================

/**
 * POST /api/matches/:id/scoring/custom/record-event
 * Record a dynamic custom scoring event
 */
router.post('/custom/record-event', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (match.status === 'COMPLETED') {
    res.status(400).json({ error: 'Match is completed. Scoring is locked.' });
    return;
  }

  const {
    teamId,
    playerId,
    eventDefId,
    eventName,
    eventShortName,
    points,
    period,
    periodName,
    clockDisplay,
    clockSeconds,
    description,
    metadata,
  } = req.body;

  if (!teamId) {
    res.status(400).json({ error: 'Team is required.' });
    return;
  }

  const team = db.teams.find((t) => t.id === teamId);
  const player = playerId ? db.players.find((p) => p.id === playerId) : undefined;
  const stateBefore = getScoringStateForMatch(match) as CustomMatchScoringState;

  const now = new Date().toISOString();
  const pts = Number(points) || 0;
  const isTeamA = teamId === match.teamAId;

  const scoreA_after = isTeamA ? stateBefore.scoreA + pts : stateBefore.scoreA;
  const scoreB_after = !isTeamA ? stateBefore.scoreB + pts : stateBefore.scoreB;

  const event: CustomScoringEvent = {
    id: `cse-${crypto.randomUUID()}`,
    matchId,
    teamId,
    teamName: team?.name || (isTeamA ? 'Team A' : 'Team B'),
    playerId: player?.id,
    playerName: player?.name,
    eventDefId: eventDefId || 'custom-event',
    eventName: eventName || 'Point Event',
    eventShortName: eventShortName || `${pts >= 0 ? '+' : ''}${pts}`,
    points: pts,
    period: Number(period) || stateBefore.currentPeriod || 1,
    periodName: periodName || stateBefore.currentPeriodName || `Period ${stateBefore.currentPeriod || 1}`,
    clockDisplay: clockDisplay || (stateBefore.clock?.secondsRemaining !== undefined ? `${Math.floor(stateBefore.clock.secondsRemaining / 60)}:${(stateBefore.clock.secondsRemaining % 60).toString().padStart(2, '0')}` : '00:00'),
    clockSeconds: clockSeconds !== undefined ? Number(clockSeconds) : (stateBefore.clock?.secondsRemaining || 0),
    timestamp: now,
    description: description || `${eventName || 'Event'} (${pts >= 0 ? '+' : ''}${pts} pts) - ${team?.name || 'Team'}${player ? ` (${player.name})` : ''}`,
    scoreA_before: stateBefore.scoreA,
    scoreB_before: stateBefore.scoreB,
    scoreA_after,
    scoreB_after,
    metadata,
    operatorId: req.user?.id,
    operatorName: req.user?.name,
    isUndone: false,
    isEdited: false,
  };

  if (!db.custom_scoring_events) db.custom_scoring_events = [];
  db.custom_scoring_events.push(event);

  if (match.status === 'SCHEDULED' || match.status === 'READY' || match.status === 'DRAFT') {
    match.status = 'LIVE';
    match.updatedAt = now;
  }

  db.audit_logs.push({
    id: crypto.randomUUID(),
    userId: req.user?.id,
    userName: req.user?.name,
    userEmail: req.user?.email,
    action: 'MATCH_UPDATE',
    details: `Custom Event Logged: "${event.eventName}" (${event.points} pts) for ${event.teamName} in "${match.name}"`,
    timestamp: now,
  });

  saveDatabase();

  const stateAfter = getScoringStateForMatch(match) as CustomMatchScoringState;
  broadcastScoringUpdate(matchId, stateAfter);

  res.status(201).json({
    message: 'Event recorded successfully.',
    event,
    state: stateAfter,
  });
});

/**
 * POST /api/matches/:id/scoring/custom/undo
 * Undo the most recent active custom scoring event
 */
router.post('/custom/undo', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  const activeEvents = (db.custom_scoring_events || []).filter(
    (e: any) => e.matchId === matchId && !e.isUndone
  );

  if (activeEvents.length === 0) {
    res.status(400).json({ error: 'No scoring events available to undo.' });
    return;
  }

  const lastEvent = activeEvents[activeEvents.length - 1];
  lastEvent.isUndone = true;

  db.audit_logs.push({
    id: crypto.randomUUID(),
    userId: req.user?.id,
    userName: req.user?.name,
    userEmail: req.user?.email,
    action: 'MATCH_UPDATE',
    details: `Undo Event: "${lastEvent.eventName}" (${lastEvent.id}) in "${match.name}"`,
    timestamp: new Date().toISOString(),
  });

  saveDatabase();

  const stateAfter = getScoringStateForMatch(match) as CustomMatchScoringState;
  broadcastScoringUpdate(matchId, stateAfter);

  res.json({ message: 'Last event undone successfully.', state: stateAfter, undoneEvent: lastEvent });
});

/**
 * POST /api/matches/:id/scoring/custom/edit-event
 * Edit an existing custom scoring event
 */
router.post('/custom/edit-event', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  const { eventId, points, playerId, teamId, eventName, description } = req.body;
  if (!eventId) {
    res.status(400).json({ error: 'Event ID is required.' });
    return;
  }

  const event = (db.custom_scoring_events || []).find((e: any) => e.id === eventId && e.matchId === matchId);
  if (!event) {
    res.status(404).json({ error: 'Scoring event not found.' });
    return;
  }

  if (points !== undefined) event.points = Number(points);
  if (playerId !== undefined) {
    event.playerId = playerId || undefined;
    const player = playerId ? db.players.find((p) => p.id === playerId) : undefined;
    event.playerName = player?.name || undefined;
  }
  if (teamId) {
    event.teamId = teamId;
    const team = db.teams.find((t) => t.id === teamId);
    event.teamName = team?.name || (teamId === match.teamAId ? 'Team A' : 'Team B');
  }
  if (eventName) event.eventName = eventName;
  if (description) event.description = description;
  event.isEdited = true;

  db.audit_logs.push({
    id: crypto.randomUUID(),
    userId: req.user?.id,
    userName: req.user?.name,
    userEmail: req.user?.email,
    action: 'MATCH_UPDATE',
    details: `Edited Scoring Event: "${event.eventName}" (${event.id}) in "${match.name}"`,
    timestamp: new Date().toISOString(),
  });

  saveDatabase();

  const stateAfter = getScoringStateForMatch(match) as CustomMatchScoringState;
  broadcastScoringUpdate(matchId, stateAfter);

  res.json({ message: 'Scoring event updated.', state: stateAfter, event });
});

/**
 * POST /api/matches/:id/scoring/custom/delete-event
 * Delete a custom scoring event
 */
router.post('/custom/delete-event', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  const { eventId } = req.body;
  if (!eventId) {
    res.status(400).json({ error: 'Event ID is required.' });
    return;
  }

  const idx = (db.custom_scoring_events || []).findIndex((e: any) => e.id === eventId && e.matchId === matchId);
  if (idx === -1) {
    res.status(404).json({ error: 'Event not found.' });
    return;
  }

  const deleted = db.custom_scoring_events.splice(idx, 1)[0];

  db.audit_logs.push({
    id: crypto.randomUUID(),
    userId: req.user?.id,
    userName: req.user?.name,
    userEmail: req.user?.email,
    action: 'MATCH_UPDATE',
    details: `Deleted Scoring Event: "${deleted.eventName}" (${deleted.id}) in "${match.name}"`,
    timestamp: new Date().toISOString(),
  });

  saveDatabase();

  const stateAfter = getScoringStateForMatch(match) as CustomMatchScoringState;
  broadcastScoringUpdate(matchId, stateAfter);

  res.json({ message: 'Event deleted.', state: stateAfter });
});

/**
 * POST /api/matches/:id/scoring/custom/clock
 * Update match clock (running, secondsRemaining, elapsed, extra time, breaks)
 */
router.post('/custom/clock', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  const {
    running,
    secondsRemaining,
    elapsedSeconds,
    currentPeriod,
    isExtraTime,
    isShootout,
    isBreak,
    breakRemainingSeconds,
  } = req.body;

  if (!db.custom_clock_states) db.custom_clock_states = [];
  let clockState = db.custom_clock_states.find((c: any) => c.matchId === matchId);

  if (!clockState) {
    clockState = {
      id: `c-clk-${crypto.randomUUID()}`,
      matchId,
      running: false,
      secondsRemaining: 0,
      elapsedSeconds: 0,
      currentPeriod: 1,
      isExtraTime: false,
      isShootout: false,
      isBreak: false,
      updatedAt: new Date().toISOString(),
    };
    db.custom_clock_states.push(clockState);
  }

  if (running !== undefined) clockState.running = Boolean(running);
  if (secondsRemaining !== undefined) clockState.secondsRemaining = Number(secondsRemaining);
  if (elapsedSeconds !== undefined) clockState.elapsedSeconds = Number(elapsedSeconds);
  if (currentPeriod !== undefined) clockState.currentPeriod = Number(currentPeriod);
  if (isExtraTime !== undefined) clockState.isExtraTime = Boolean(isExtraTime);
  if (isShootout !== undefined) clockState.isShootout = Boolean(isShootout);
  if (isBreak !== undefined) clockState.isBreak = Boolean(isBreak);
  if (breakRemainingSeconds !== undefined) clockState.breakRemainingSeconds = Number(breakRemainingSeconds);
  clockState.updatedAt = new Date().toISOString();

  if (clockState.running && match.status !== 'LIVE' && match.status !== 'COMPLETED') {
    match.status = 'LIVE';
    match.updatedAt = new Date().toISOString();
  }

  saveDatabase();

  const stateAfter = getScoringStateForMatch(match) as CustomMatchScoringState;
  broadcastScoringUpdate(matchId, stateAfter);

  res.json({ message: 'Clock state updated.', state: stateAfter, clock: clockState });
});

/**
 * POST /api/matches/:id/scoring/custom/timeout
 * Record timeout for a team
 */
router.post('/custom/timeout', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (match.status === 'COMPLETED') {
    res.status(400).json({ error: 'Match is completed. Scoring is locked.' });
    return;
  }

  const { teamId, period, matchClock } = req.body;
  if (!teamId) {
    res.status(400).json({ error: 'Team ID is required.' });
    return;
  }

  const team = db.teams.find((t) => t.id === teamId);
  const now = new Date().toISOString();

  const timeoutRec: CustomTimeoutRecord = {
    id: `to-${crypto.randomUUID()}`,
    matchId,
    teamId,
    teamName: team?.name || (teamId === match.teamAId ? 'Team A' : 'Team B'),
    period: Number(period) || 1,
    matchClock: matchClock || '00:00',
    timestamp: now,
  };

  if (!db.custom_timeouts) db.custom_timeouts = [];
  db.custom_timeouts.push(timeoutRec);

  db.audit_logs.push({
    id: crypto.randomUUID(),
    userId: req.user?.id,
    userName: req.user?.name,
    userEmail: req.user?.email,
    action: 'MATCH_UPDATE',
    details: `Timeout Called: ${timeoutRec.teamName} in Period ${timeoutRec.period}`,
    timestamp: now,
  });

  saveDatabase();

  const stateAfter = getScoringStateForMatch(match) as CustomMatchScoringState;
  broadcastScoringUpdate(matchId, stateAfter);

  res.status(201).json({ message: 'Timeout recorded.', timeout: timeoutRec, state: stateAfter });
});

/**
 * POST /api/matches/:id/scoring/custom/substitution
 * Record player substitution
 */
router.post('/custom/substitution', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (match.status === 'COMPLETED') {
    res.status(400).json({ error: 'Match is completed. Scoring is locked.' });
    return;
  }

  const { teamId, playerOutId, playerInId, period, matchClock } = req.body;
  if (!teamId) {
    res.status(400).json({ error: 'Team ID is required.' });
    return;
  }

  const team = db.teams.find((t) => t.id === teamId);
  const playerOut = playerOutId ? db.players.find((p) => p.id === playerOutId) : undefined;
  const playerIn = playerInId ? db.players.find((p) => p.id === playerInId) : undefined;
  const now = new Date().toISOString();

  const subRec: CustomSubstitutionRecord = {
    id: `sub-${crypto.randomUUID()}`,
    matchId,
    teamId,
    teamName: team?.name || (teamId === match.teamAId ? 'Team A' : 'Team B'),
    playerOutId,
    playerOutName: playerOut?.name,
    playerInId,
    playerInName: playerIn?.name,
    period: Number(period) || 1,
    matchClock: matchClock || '00:00',
    timestamp: now,
  };

  if (!db.custom_substitutions) db.custom_substitutions = [];
  db.custom_substitutions.push(subRec);

  db.audit_logs.push({
    id: crypto.randomUUID(),
    userId: req.user?.id,
    userName: req.user?.name,
    userEmail: req.user?.email,
    action: 'MATCH_UPDATE',
    details: `Substitution: ${subRec.teamName} [OUT: ${playerOut?.name || 'Player'} -> IN: ${playerIn?.name || 'Player'}]`,
    timestamp: now,
  });

  saveDatabase();

  const stateAfter = getScoringStateForMatch(match) as CustomMatchScoringState;
  broadcastScoringUpdate(matchId, stateAfter);

  res.status(201).json({ message: 'Substitution recorded.', substitution: subRec, state: stateAfter });
});

/**
 * POST /api/matches/:id/scoring/custom/period
 * Advance period / set current period
 */
router.post('/custom/period', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  if (match.status === 'COMPLETED') {
    res.status(400).json({ error: 'Match is completed. Scoring is locked.' });
    return;
  }

  const { targetPeriod } = req.body;
  const newPeriod = Number(targetPeriod) || 1;

  if (!db.custom_clock_states) db.custom_clock_states = [];
  let clockState = db.custom_clock_states.find((c: any) => c.matchId === matchId);

  if (!clockState) {
    clockState = {
      id: `c-clk-${crypto.randomUUID()}`,
      matchId,
      running: false,
      secondsRemaining: 0,
      elapsedSeconds: 0,
      currentPeriod: newPeriod,
      isExtraTime: false,
      isShootout: false,
      isBreak: false,
      updatedAt: new Date().toISOString(),
    };
    db.custom_clock_states.push(clockState);
  } else {
    clockState.currentPeriod = newPeriod;
    clockState.updatedAt = new Date().toISOString();
  }

  db.audit_logs.push({
    id: crypto.randomUUID(),
    userId: req.user?.id,
    userName: req.user?.name,
    userEmail: req.user?.email,
    action: 'MATCH_UPDATE',
    details: `Period Transition: Match "${match.name}" set to Period ${newPeriod}`,
    timestamp: new Date().toISOString(),
  });

  saveDatabase();

  const stateAfter = getScoringStateForMatch(match) as CustomMatchScoringState;
  broadcastScoringUpdate(matchId, stateAfter);

  res.json({ message: `Period updated to ${newPeriod}.`, state: stateAfter });
});

/**
 * POST /api/matches/:id/scoring/custom/complete
 * Mark custom match as completed
 */
router.post('/custom/complete', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const matchId = req.params.id;
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    res.status(404).json({ error: 'Match not found.' });
    return;
  }

  match.status = 'COMPLETED';
  match.updatedAt = new Date().toISOString();

  // Stop clock
  if (db.custom_clock_states) {
    const clock = db.custom_clock_states.find((c: any) => c.matchId === matchId);
    if (clock) clock.running = false;
  }

  db.audit_logs.push({
    id: crypto.randomUUID(),
    userId: req.user?.id,
    userName: req.user?.name,
    userEmail: req.user?.email,
    action: 'MATCH_UPDATE',
    details: `Match Completed: "${match.name}"`,
    timestamp: new Date().toISOString(),
  });

  saveDatabase();

  const stateAfter = getScoringStateForMatch(match) as CustomMatchScoringState;
  broadcastScoringUpdate(matchId, stateAfter);

  res.json({ message: 'Match marked as completed.', state: stateAfter });
});

export default router;


