import {
  Match,
  Player,
  CustomSport,
  CustomScoringEvent,
  CustomMatchClock,
  CustomPlayerStats,
  CustomTeamStats,
  CustomTimeoutRecord,
  CustomSubstitutionRecord,
  CustomMatchScoringState,
} from '../../src/types';
import { DEFAULT_CUSTOM_SPORTS } from './customSportPresets';

/**
 * Get period display name based on sport match type and index (1-based)
 */
export function getCustomSportPeriodDisplayName(
  matchType: CustomSport['matchType'],
  periodIndex: number,
  totalPeriods: number
): string {
  switch (matchType) {
    case 'QUARTERS':
      return `Quarter ${periodIndex}`;
    case 'HALVES':
      return `Half ${periodIndex}`;
    case 'SETS':
      return `Set ${periodIndex}`;
    case 'ROUNDS':
      return `Round ${periodIndex}`;
    case 'FRAMES':
      return `Frame ${periodIndex}`;
    case 'INNINGS':
      return `Inning ${periodIndex}`;
    case 'PERIODS':
      return `Period ${periodIndex}`;
    case 'CONTINUOUS':
      return 'Continuous';
    case 'POINTS_ONLY':
      return 'Match';
    default:
      return `Period ${periodIndex}`;
  }
}

export function getCustomSportPeriodShortName(
  matchType: CustomSport['matchType'],
  periodIndex: number
): string {
  switch (matchType) {
    case 'QUARTERS':
      return `Q${periodIndex}`;
    case 'HALVES':
      return `H${periodIndex}`;
    case 'SETS':
      return `S${periodIndex}`;
    case 'ROUNDS':
      return `R${periodIndex}`;
    case 'FRAMES':
      return `F${periodIndex}`;
    case 'INNINGS':
      return `INN ${periodIndex}`;
    case 'PERIODS':
      return `P${periodIndex}`;
    case 'CONTINUOUS':
      return 'LIVE';
    case 'POINTS_ONLY':
      return 'PTS';
    default:
      return `P${periodIndex}`;
  }
}

/**
 * Resolve the CustomSport configuration for a match
 */
export function resolveCustomSportConfig(match: Match, customSportsDbList: CustomSport[] = []): CustomSport {
  if (match.customSportConfig && typeof match.customSportConfig === 'object' && match.customSportConfig.scoringEvents) {
    return match.customSportConfig as CustomSport;
  }

  if (match.customSportId) {
    const found = customSportsDbList.find((s) => s.id === match.customSportId);
    if (found) return found;
    const preset = DEFAULT_CUSTOM_SPORTS.find((s) => s.id === match.customSportId);
    if (preset) return preset;
  }

  // Resolve sport-specific presets for PICKLEBALL, HANDBALL, and SQUASH
  if (match.sport === 'PICKLEBALL') {
    const p = DEFAULT_CUSTOM_SPORTS.find((s) => s.id === 'cs-pickleball-pro');
    if (p) return p;
  }
  if (match.sport === 'HANDBALL') {
    const h = DEFAULT_CUSTOM_SPORTS.find((s) => s.id === 'cs-handball-champions');
    if (h) return h;
  }
  if (match.sport === 'SQUASH') {
    const sq = DEFAULT_CUSTOM_SPORTS.find((s) => s.id === 'cs-squash-open');
    if (sq) return sq;
  }

  // Check if match description or metadata has shortCode or preset name
  const matchDesc = (match.description || match.name || '').toLowerCase();
  for (const preset of DEFAULT_CUSTOM_SPORTS) {
    if (matchDesc.includes(preset.name.toLowerCase()) || matchDesc.includes(preset.shortCode.toLowerCase())) {
      return preset;
    }
  }

  if (customSportsDbList.length > 0) {
    return customSportsDbList[0];
  }

  return DEFAULT_CUSTOM_SPORTS[0];
}

/**
 * Create default player statistics container
 */
export function createDefaultCustomPlayerStats(
  player: Player,
  teamName: string,
  config: CustomSport
): CustomPlayerStats {
  const statsRecord: Record<string, number> = {};
  for (const statDef of config.customStatistics || []) {
    statsRecord[statDef.id] = 0;
    statsRecord[statDef.shortCode] = 0;
  }

  return {
    playerId: player.id,
    playerName: player.name,
    teamId: player.teamId,
    teamName,
    isCaptain: player.isCaptain,
    role: player.role || 'Player',
    pointsTotal: 0,
    eventsCount: 0,
    stats: statsRecord,
  };
}

/**
 * Pure Deterministic Calculation of Generic/Custom Match Scoring State
 */
export function calculateCustomSportScoringState(
  match: Match,
  events: CustomScoringEvent[],
  customSportsDbList: CustomSport[] = [],
  savedClock?: any,
  savedTimeouts: CustomTimeoutRecord[] = [],
  savedSubstitutions: CustomSubstitutionRecord[] = []
): CustomMatchScoringState {
  const config = resolveCustomSportConfig(match, customSportsDbList);
  const totalPeriods = Math.max(1, Number(config.totalPeriods) || 1);

  const teamAName = match.teamA?.name || 'Team A';
  const teamBName = match.teamB?.name || 'Team B';

  // Initialize Player Stats Map
  const playerStatsMap = new Map<string, CustomPlayerStats>();

  const allPlayers: Player[] = [
    ...(match.teamAPlayers || []),
    ...(match.teamBPlayers || []),
  ];

  for (const player of allPlayers) {
    const tName = player.teamId === match.teamAId ? teamAName : teamBName;
    playerStatsMap.set(player.id, createDefaultCustomPlayerStats(player, tName, config));
  }

  // Initialize Period Scores
  const periodScoresA: number[] = Array(totalPeriods).fill(0);
  const periodScoresB: number[] = Array(totalPeriods).fill(0);

  let scoreA = 0;
  let scoreB = 0;
  let maxPeriodRecorded = 1;

  const validEvents = (events || []).filter((e) => !e.isUndone);

  // Replay all events chronologically
  for (const event of validEvents) {
    const isTeamA = event.teamId === match.teamAId;
    const points = Number(event.points) || 0;
    const periodIdx = Math.max(1, Math.min(totalPeriods, Number(event.period) || 1));
    maxPeriodRecorded = Math.max(maxPeriodRecorded, periodIdx);

    if (isTeamA) {
      scoreA += points;
      periodScoresA[periodIdx - 1] = (periodScoresA[periodIdx - 1] || 0) + points;
    } else {
      scoreB += points;
      periodScoresB[periodIdx - 1] = (periodScoresB[periodIdx - 1] || 0) + points;
    }

    // Accumulate Player Stats
    if (event.playerId) {
      let pStat = playerStatsMap.get(event.playerId);
      if (!pStat) {
        pStat = {
          playerId: event.playerId,
          playerName: event.playerName || 'Player',
          teamId: event.teamId,
          teamName: isTeamA ? teamAName : teamBName,
          pointsTotal: 0,
          eventsCount: 0,
          stats: {},
        };
        playerStatsMap.set(event.playerId, pStat);
      }

      pStat.pointsTotal += points;
      pStat.eventsCount += 1;

      // Update configured statistics
      for (const statDef of config.customStatistics || []) {
        if (!pStat.stats[statDef.id]) pStat.stats[statDef.id] = 0;
        if (!pStat.stats[statDef.shortCode]) pStat.stats[statDef.shortCode] = 0;

        if (
          statDef.linkedEventIds &&
          statDef.linkedEventIds.length > 0 &&
          statDef.linkedEventIds.includes(event.eventDefId)
        ) {
          pStat.stats[statDef.id] += 1;
          pStat.stats[statDef.shortCode] += 1;
        } else if (
          statDef.name.toLowerCase().includes('point') &&
          points > 0
        ) {
          pStat.stats[statDef.id] += points;
          pStat.stats[statDef.shortCode] += points;
        }
      }
    }
  }

  // Determine current active period
  let currentPeriod = savedClock?.currentPeriod || maxPeriodRecorded || 1;
  currentPeriod = Math.max(1, Math.min(totalPeriods, currentPeriod));
  const currentPeriodName = getCustomSportPeriodDisplayName(config.matchType, currentPeriod, totalPeriods);

  // Build Team Stats
  const teamATimeouts = savedTimeouts.filter((t) => t.teamId === match.teamAId).length;
  const teamBTimeouts = savedTimeouts.filter((t) => t.teamId === match.teamBId).length;
  const teamASubs = savedSubstitutions.filter((s) => s.teamId === match.teamAId).length;
  const teamBSubs = savedSubstitutions.filter((s) => s.teamId === match.teamBId).length;

  const teamAStats: CustomTeamStats = {
    teamId: match.teamAId,
    teamName: teamAName,
    totalScore: scoreA,
    periodScores: [...periodScoresA],
    timeoutsUsed: teamATimeouts,
    substitutionsUsed: teamASubs,
    foulsTotal: 0,
    stats: {},
  };

  const teamBStats: CustomTeamStats = {
    teamId: match.teamBId,
    teamName: teamBName,
    totalScore: scoreB,
    periodScores: [...periodScoresB],
    timeoutsUsed: teamBTimeouts,
    substitutionsUsed: teamBSubs,
    foulsTotal: 0,
    stats: {},
  };

  // Build Match Clock
  const periodDurationSec = (Number(config.periodDurationMinutes) || 0) * 60;
  const clock: CustomMatchClock = {
    running: Boolean(savedClock?.running),
    secondsRemaining: savedClock?.secondsRemaining !== undefined ? Number(savedClock.secondsRemaining) : periodDurationSec,
    elapsedSeconds: savedClock?.elapsedSeconds !== undefined ? Number(savedClock.elapsedSeconds) : 0,
    currentPeriod,
    periodName: currentPeriodName,
    isExtraTime: Boolean(savedClock?.isExtraTime),
    isShootout: Boolean(savedClock?.isShootout),
    isBreak: Boolean(savedClock?.isBreak),
    breakRemainingSeconds: savedClock?.breakRemainingSeconds,
  };

  // Determine completion and winner
  let isCompleted = match.status === 'COMPLETED';
  let winnerSide: 'TEAM_A' | 'TEAM_B' | 'DRAW' | undefined;
  let winnerTeamId: string | undefined;
  let winnerName: string | undefined;
  let matchResultText: string | undefined;

  // Check target score win condition if configured
  if (config.targetScore && config.targetScore > 0) {
    const margin = config.winningMargin || 1;
    if (scoreA >= config.targetScore && scoreA - scoreB >= margin) {
      isCompleted = true;
      winnerSide = 'TEAM_A';
      winnerTeamId = match.teamAId;
      winnerName = teamAName;
    } else if (scoreB >= config.targetScore && scoreB - scoreA >= margin) {
      isCompleted = true;
      winnerSide = 'TEAM_B';
      winnerTeamId = match.teamBId;
      winnerName = teamBName;
    }
  }

  if (isCompleted || match.status === 'COMPLETED') {
    if (scoreA > scoreB) {
      winnerSide = 'TEAM_A';
      winnerTeamId = match.teamAId;
      winnerName = teamAName;
      matchResultText = `${teamAName} won by ${scoreA - scoreB} points (${scoreA} - ${scoreB})`;
    } else if (scoreB > scoreA) {
      winnerSide = 'TEAM_B';
      winnerTeamId = match.teamBId;
      winnerName = teamBName;
      matchResultText = `${teamBName} won by ${scoreB - scoreA} points (${scoreB} - ${scoreA})`;
    } else {
      winnerSide = 'DRAW';
      winnerName = 'Match Drawn';
      matchResultText = `Match tied / drawn (${scoreA} - ${scoreB})`;
    }
  }

  const lastEvent = validEvents.length > 0 ? validEvents[validEvents.length - 1] : undefined;

  return {
    sport: 'CUSTOM',
    match,
    matchId: match.id,
    status: isCompleted ? 'COMPLETED' : match.status,
    customSport: config,
    customSportName: config.name,
    currentPeriod,
    currentPeriodName,
    totalPeriods,
    scoreA,
    scoreB,
    periodScoresA,
    periodScoresB,
    clock,
    teamAStats,
    teamBStats,
    playerStats: Array.from(playerStatsMap.values()),
    events: validEvents,
    lastEvent,
    timeouts: savedTimeouts,
    substitutions: savedSubstitutions,
    isCompleted,
    winnerSide,
    winnerTeamId,
    winnerName,
    matchResultText,
  };
}
