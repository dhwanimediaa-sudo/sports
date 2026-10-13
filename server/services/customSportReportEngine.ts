import {
  Match,
  Player,
  Team,
  Tournament,
  Group,
  CustomSport,
  CustomScoringEvent,
  CustomTimeoutRecord,
  CustomSubstitutionRecord,
  CustomSportMatchReport,
  CustomSportAwardNomination,
  AwardCandidate,
} from '../../src/types';
import {
  calculateCustomSportScoringState,
  getCustomSportPeriodDisplayName,
  resolveCustomSportConfig,
} from './customSportScoringEngine';

export interface CustomReportOverrideOptions {
  isFinalized?: boolean;
  finalizedAt?: string;
  finalizedBy?: string;
  customAwardsOverrides?: Record<string, { playerId: string; details?: string }>;
  playerOfTheMatchId?: string;
  playerOfTheMatchReason?: string;
}

export function calculateCustomSportMatchReport(
  match: Match,
  events: CustomScoringEvent[],
  customSportsDbList: CustomSport[] = [],
  savedClock?: any,
  savedTimeouts: CustomTimeoutRecord[] = [],
  savedSubstitutions: CustomSubstitutionRecord[] = [],
  allPlayers: Player[] = [],
  allTeams: Team[] = [],
  allTournaments: Tournament[] = [],
  allGroups: Group[] = [],
  savedAwardsList: any[] = [],
  overrideOptions: CustomReportOverrideOptions = {}
): CustomSportMatchReport {
  const config = resolveCustomSportConfig(match, customSportsDbList);
  const scoringState = calculateCustomSportScoringState(
    match,
    events,
    customSportsDbList,
    savedClock,
    savedTimeouts,
    savedSubstitutions
  );

  const tournament = allTournaments.find((t) => t.id === match.tournamentId) || match.tournament;
  const group = allGroups.find((g) => g.id === match.groupId) || match.group;
  const teamA = allTeams.find((t) => t.id === match.teamAId) || match.teamA || { id: match.teamAId, name: 'Team A', shortName: 'TMA' } as Team;
  const teamB = allTeams.find((t) => t.id === match.teamBId) || match.teamB || { id: match.teamBId, name: 'Team B', shortName: 'TMB' } as Team;

  const teamAPlayers = allPlayers.filter((p) => p.teamId === match.teamAId);
  const teamBPlayers = allPlayers.filter((p) => p.teamId === match.teamBId);

  // Period Names
  const totalPeriods = Math.max(1, Number(config.totalPeriods) || 1);
  const periodNames: string[] = [];
  for (let i = 1; i <= totalPeriods; i++) {
    periodNames.push(getCustomSportPeriodDisplayName(config.matchType, i, totalPeriods));
  }

  // Saved Awards
  const savedAwardRecord = savedAwardsList.find((a) => a.matchId === match.id);

  // Compute Award Nominations
  const awards: CustomSportAwardNomination[] = [];
  const playerStats = scoringState.playerStats;

  for (const awardDef of config.customAwards || []) {
    let topCandidate: AwardCandidate | undefined;
    let maxStatVal = -1;

    for (const pStat of playerStats) {
      let val = pStat.pointsTotal;
      if (awardDef.criteriaStatId && pStat.stats[awardDef.criteriaStatId] !== undefined) {
        val = pStat.stats[awardDef.criteriaStatId];
      }

      if (val > maxStatVal) {
        maxStatVal = val;
        topCandidate = {
          playerId: pStat.playerId,
          playerName: pStat.playerName,
          teamId: pStat.teamId,
          teamName: pStat.teamName,
          statSummary: `${val} ${awardDef.name} units (${pStat.pointsTotal} total pts)`,
          details: `${val} ${awardDef.name} units (${pStat.pointsTotal} total pts)`,
          statsSummary: { value: val, points: pStat.pointsTotal, ...pStat.stats },
          score: val,
        };
      }
    }

    // Check manual override
    let selectedPlayer: AwardCandidate | undefined;
    const manualOverride =
      overrideOptions.customAwardsOverrides?.[awardDef.id] ||
      (savedAwardRecord?.customAwards?.[awardDef.id]
        ? {
            playerId: savedAwardRecord.customAwards[awardDef.id].playerId,
            details: savedAwardRecord.customAwards[awardDef.id].details,
          }
        : undefined);

    if (manualOverride && manualOverride.playerId) {
      const p = allPlayers.find((ply) => ply.id === manualOverride.playerId);
      if (p) {
        selectedPlayer = {
          playerId: p.id,
          playerName: p.name,
          teamId: p.teamId,
          teamName: p.teamId === match.teamAId ? teamA.name : teamB.name,
          details: manualOverride.details || 'Admin selected award winner',
          statSummary: manualOverride.details || 'Admin selected award winner',
          statsSummary: { manual: 1 },
          score: 100,
        };
      }
    }

    awards.push({
      awardId: awardDef.id,
      awardName: awardDef.name,
      awardIcon: awardDef.icon || '🏆',
      suggestedPlayer: topCandidate,
      selectedPlayer: selectedPlayer || topCandidate,
      citation: awardDef.description,
    });
  }

  // General Player of the Match
  let suggestedPlayerOfMatch: AwardCandidate | undefined;
  if (playerStats.length > 0) {
    const sortedByPoints = [...playerStats].sort((a, b) => b.pointsTotal - a.pointsTotal);
    const top = sortedByPoints[0];
    if (top) {
      suggestedPlayerOfMatch = {
        playerId: top.playerId,
        playerName: top.playerName,
        teamId: top.teamId,
        teamName: top.teamName,
        statSummary: `${top.pointsTotal} Total Points & ${top.eventsCount} Events`,
        details: `${top.pointsTotal} Total Points & ${top.eventsCount} Events`,
        statsSummary: { points: top.pointsTotal, events: top.eventsCount, ...top.stats },
        score: top.pointsTotal,
      };
    }
  }

  let selectedPlayerOfMatch = suggestedPlayerOfMatch;
  if (overrideOptions.playerOfTheMatchId || savedAwardRecord?.playerOfTheMatchId || savedAwardRecord?.manOfTheMatchId) {
    const overrideId = overrideOptions.playerOfTheMatchId || savedAwardRecord?.playerOfTheMatchId || savedAwardRecord?.manOfTheMatchId;
    const p = allPlayers.find((ply) => ply.id === overrideId);
    if (p) {
      const reason =
        overrideOptions.playerOfTheMatchReason ||
        savedAwardRecord?.playerOfTheMatchReason ||
        savedAwardRecord?.manOfTheMatchReason ||
        'Admin designated Player of the Match';
      selectedPlayerOfMatch = {
        playerId: p.id,
        playerName: p.name,
        teamId: p.teamId,
        teamName: p.teamId === match.teamAId ? teamA.name : teamB.name,
        details: reason,
        statSummary: reason,
        statsSummary: { override: 1 },
        score: 100,
      };
    }
  }

  // Result text
  const matchResultText =
    scoringState.matchResultText ||
    (scoringState.scoreA > scoringState.scoreB
      ? `${teamA.name} won by ${scoringState.scoreA - scoringState.scoreB} points (${scoringState.scoreA} - ${scoringState.scoreB})`
      : scoringState.scoreB > scoringState.scoreA
      ? `${teamB.name} won by ${scoringState.scoreB - scoringState.scoreA} points (${scoringState.scoreB} - ${scoringState.scoreA})`
      : `Match Tied (${scoringState.scoreA} - ${scoringState.scoreB})`);

  // Report validation
  const validationIssues: string[] = [];
  const validationWarnings: string[] = [];

  if (scoringState.scoreA === 0 && scoringState.scoreB === 0 && events.length === 0) {
    validationWarnings.push('No scoring events have been recorded for this match yet.');
  }

  return {
    match,
    matchId: match.id,
    sport: 'CUSTOM',
    customSport: config,
    tournament,
    group,
    teamA,
    teamB,
    teamAPlayers,
    teamBPlayers,
    status: scoringState.status,
    isFinalized: Boolean(overrideOptions.isFinalized || savedAwardRecord?.isFinalized),
    finalizedAt: overrideOptions.finalizedAt || savedAwardRecord?.finalizedAt,
    finalizedBy: overrideOptions.finalizedBy || savedAwardRecord?.finalizedBy,
    matchResultText,
    winnerName: scoringState.winnerName || 'Undecided',
    winnerTeamId: scoringState.winnerTeamId,
    scoreA: scoringState.scoreA,
    scoreB: scoringState.scoreB,
    periodScoresA: scoringState.periodScoresA,
    periodScoresB: scoringState.periodScoresB,
    periodNames,
    events: scoringState.events,
    playerStats: scoringState.playerStats,
    teamAStats: scoringState.teamAStats,
    teamBStats: scoringState.teamBStats,
    timeouts: savedTimeouts,
    substitutions: savedSubstitutions,
    awards,
    suggestedPlayerOfMatch,
    selectedPlayerOfMatch,
    squadsReport: {
      teamA: { team: teamA, players: teamAPlayers },
      teamB: { team: teamB, players: teamBPlayers },
    },
    officialsReport: match.officials as any,
    sponsorsReport: match.sponsors as any,
    validation: {
      isValid: validationIssues.length === 0,
      issues: validationIssues,
      warnings: validationWarnings,
      isScoreConsistentWithEvents: true,
      isCompleted: scoringState.isCompleted,
      hasWinner: Boolean(scoringState.winnerTeamId),
    },
  };
}
