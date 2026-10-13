import {
  Match,
  Player,
  Team,
  Tournament,
  Group,
  VolleyballSet,
  VolleyballPointEvent,
  VolleyballTimeout,
  VolleyballSubstitution,
  VolleyballMatchReport,
  VolleyballSetReport,
  VolleyballPlayerStats,
  VolleyballTeamStats,
  AwardCandidate,
} from '../../src/types';
import { calculateVolleyballScoringState } from './volleyballScoringEngine';

export interface VolleyballReportOptions {
  isFinalized?: boolean;
  finalizedAt?: string;
  finalizedBy?: string;
  playerOfTheMatchId?: string;
  playerOfTheMatchReason?: string;
  bestAttackerId?: string;
  bestServerId?: string;
  bestBlockerId?: string;
  bestDefenderId?: string;
}

/**
 * Generate full Volleyball match report and scorecard
 */
export function calculateVolleyballMatchReport(
  match: Match,
  setsList: VolleyballSet[],
  events: VolleyballPointEvent[],
  timeoutsList: VolleyballTimeout[],
  substitutionsList: VolleyballSubstitution[],
  rotationsList: any[],
  allPlayers: Player[],
  allTeams: Team[],
  options: VolleyballReportOptions = {},
  allTournaments: Tournament[] = [],
  allGroups: Group[] = []
): VolleyballMatchReport {
  const scoringState = calculateVolleyballScoringState(
    match,
    setsList,
    events,
    timeoutsList,
    substitutionsList,
    rotationsList,
    allPlayers
  );

  const teamA = allTeams.find((t) => t.id === match.teamAId) || match.teamA;
  const teamB = allTeams.find((t) => t.id === match.teamBId) || match.teamB;
  const tournament = allTournaments.find((t) => t.id === match.tournamentId) || match.tournament;
  const group = allGroups.find((g) => g.id === match.groupId) || match.group;

  const teamAPlayers = allPlayers.filter((p) => p.teamId === match.teamAId);
  const teamBPlayers = allPlayers.filter((p) => p.teamId === match.teamBId);

  const activeEvents = events.filter((e) => !e.isUndone);
  activeEvents.sort((a, b) => a.rallyNumber - b.rallyNumber);

  // Set-wise detailed reports
  const setReports: VolleyballSetReport[] = scoringState.sets.map((set) => {
    const setEvts = activeEvents.filter((e) => e.setNumber === set.setNumber);

    let teamAAces = 0;
    let teamBAces = 0;
    let teamABlocks = 0;
    let teamBBlocks = 0;
    let teamAAttacks = 0;
    let teamBAttacks = 0;
    let teamAErrors = 0;
    let teamBErrors = 0;

    setEvts.forEach((e) => {
      const isTeamAWinner = e.pointWinner === match.teamAId;
      if (e.pointType === 'SERVICE_ACE') {
        if (isTeamAWinner) teamAAces += 1;
        else teamBAces += 1;
      } else if (e.pointType === 'BLOCK_POINT') {
        if (isTeamAWinner) teamABlocks += 1;
        else teamBBlocks += 1;
      } else if (e.pointType === 'ATTACK_POINT') {
        if (isTeamAWinner) teamAAttacks += 1;
        else teamBAttacks += 1;
      }

      if (e.opponentError || e.pointType?.includes('ERROR')) {
        if (isTeamAWinner) teamBErrors += 1; // Team B made error, Team A got point
        else teamAErrors += 1;
      }
    });

    const winnerName = set.winnerTeamId === match.teamAId ? teamA?.name : set.winnerTeamId === match.teamBId ? teamB?.name : undefined;

    return {
      setNumber: set.setNumber,
      winnerTeamId: set.winnerTeamId,
      winnerTeamName: winnerName,
      teamAScore: set.teamAScore,
      teamBScore: set.teamBScore,
      durationMinutes: set.durationMinutes || 20,
      totalRallies: setEvts.length,
      teamAPoints: set.teamAScore,
      teamBPoints: set.teamBScore,
      teamAAces,
      teamBAces,
      teamABlocks,
      teamBBlocks,
      teamAAttacks,
      teamBAttacks,
      teamAErrors,
      teamBErrors,
    };
  });

  // Calculate Awards Suggestions based on statistics
  const sortedByPoints = [...scoringState.playerStats].sort((a, b) => b.totalPoints - a.totalPoints || b.performancePoints - a.performancePoints);
  const sortedByAttacks = [...scoringState.playerStats].sort((a, b) => b.attackPoints - a.attackPoints || b.kills - a.kills);
  const sortedByAces = [...scoringState.playerStats].sort((a, b) => b.serviceAces - a.serviceAces || a.serviceErrors - b.serviceErrors);
  const sortedByBlocks = [...scoringState.playerStats].sort((a, b) => b.blockPoints - a.blockPoints);
  const sortedByDefense = [...scoringState.playerStats].sort((a, b) => (b.digs + (b.isLibero ? 5 : 0)) - (a.digs + (a.isLibero ? 5 : 0)));

  const getTeamName = (teamId: string) => (teamId === match.teamAId ? teamA?.name || 'Team A' : teamB?.name || 'Team B');

  // Suggested awards
  const topPlayer = sortedByPoints[0];
  const suggestedPlayerOfMatch: AwardCandidate | undefined = topPlayer && topPlayer.totalPoints > 0
    ? {
        playerId: topPlayer.playerId,
        playerName: topPlayer.playerName,
        teamName: getTeamName(topPlayer.teamId),
        details: `${topPlayer.totalPoints} Total Points (${topPlayer.attackPoints} Attacks, ${topPlayer.blockPoints} Blocks, ${topPlayer.serviceAces} Aces)`,
        points: topPlayer.performancePoints,
      }
    : undefined;

  const topAttacker = sortedByAttacks[0];
  const suggestedBestAttacker: AwardCandidate | undefined = topAttacker && topAttacker.attackPoints > 0
    ? {
        playerId: topAttacker.playerId,
        playerName: topAttacker.playerName,
        teamName: getTeamName(topAttacker.teamId),
        details: `${topAttacker.attackPoints} Attack Points / Kills`,
        points: topAttacker.attackPoints,
      }
    : undefined;

  const topServer = sortedByAces[0];
  const suggestedBestServer: AwardCandidate | undefined = topServer && topServer.serviceAces > 0
    ? {
        playerId: topServer.playerId,
        playerName: topServer.playerName,
        teamName: getTeamName(topServer.teamId),
        details: `${topServer.serviceAces} Service Aces (${topServer.serviceErrors} Errors)`,
        points: topServer.serviceAces,
      }
    : undefined;

  const topBlocker = sortedByBlocks[0];
  const suggestedBestBlocker: AwardCandidate | undefined = topBlocker && topBlocker.blockPoints > 0
    ? {
        playerId: topBlocker.playerId,
        playerName: topBlocker.playerName,
        teamName: getTeamName(topBlocker.teamId),
        details: `${topBlocker.blockPoints} Direct Block Points`,
        points: topBlocker.blockPoints,
      }
    : undefined;

  const topDefender = sortedByDefense[0];
  const suggestedBestDefender: AwardCandidate | undefined = topDefender
    ? {
        playerId: topDefender.playerId,
        playerName: topDefender.playerName,
        teamName: getTeamName(topDefender.teamId),
        details: topDefender.isLibero ? `Libero Defensive Anchor (${topDefender.digs} Digs)` : `${topDefender.digs} Digs & Defensive Receptions`,
        points: topDefender.digs,
      }
    : undefined;

  // Selected awards (Admin override or fallback to suggestion)
  const buildSelectedAward = (playerId?: string, fallback?: AwardCandidate, customReason?: string): AwardCandidate | undefined => {
    if (!playerId) return fallback;
    const player = allPlayers.find((p) => p.id === playerId);
    if (!player) return fallback;
    const stat = scoringState.playerStats.find((s) => s.playerId === playerId);
    return {
      playerId: player.id,
      playerName: player.name,
      teamName: getTeamName(player.teamId),
      details: customReason || (stat ? `${stat.totalPoints} Points (${stat.attackPoints} Attacks, ${stat.blockPoints} Blocks, ${stat.serviceAces} Aces)` : 'Selected Award Winner'),
    };
  };

  const selectedPlayerOfMatch = buildSelectedAward(options.playerOfTheMatchId, suggestedPlayerOfMatch, options.playerOfTheMatchReason);
  const selectedBestAttacker = buildSelectedAward(options.bestAttackerId, suggestedBestAttacker);
  const selectedBestServer = buildSelectedAward(options.bestServerId, suggestedBestServer);
  const selectedBestBlocker = buildSelectedAward(options.bestBlockerId, suggestedBestBlocker);
  const selectedBestDefender = buildSelectedAward(options.bestDefenderId, suggestedBestDefender);

  // Set scores summary string e.g. "25-21, 22-25, 25-18, 25-19"
  const setScoresSummary = scoringState.sets
    .filter((s) => s.teamAScore > 0 || s.teamBScore > 0)
    .map((s) => `${s.teamAScore}-${s.teamBScore}`)
    .join(', ') || '0-0';

  // Result text
  let matchResultText = scoringState.matchResultText;
  if (!matchResultText) {
    if (scoringState.isMatchComplete) {
      const winner = scoringState.setsWonA > scoringState.setsWonB ? teamA?.name || 'Team A' : teamB?.name || 'Team B';
      matchResultText = `${winner} won ${Math.max(scoringState.setsWonA, scoringState.setsWonB)}-${Math.min(scoringState.setsWonA, scoringState.setsWonB)} (${setScoresSummary})`;
    } else if (match.status === 'LIVE' || match.status === 'READY') {
      matchResultText = `Match Live: ${teamA?.name || 'Team A'} (${scoringState.setsWonA}) vs ${teamB?.name || 'Team B'} (${scoringState.setsWonB}) [Set ${scoringState.currentSetNumber}: ${scoringState.currentSet?.teamAScore || 0}-${scoringState.currentSet?.teamBScore || 0}]`;
    } else {
      matchResultText = `Match ${match.status || 'Scheduled'}: ${teamA?.name || 'Team A'} vs ${teamB?.name || 'Team B'}`;
    }
  }

  // Squads breakdown
  const teamASquadIds = match.teamASquad?.playingIds || teamAPlayers.slice(0, 6).map((p) => p.id);
  const teamBSquadIds = match.teamBSquad?.playingIds || teamBPlayers.slice(0, 6).map((p) => p.id);

  const squadsReport = {
    teamA: {
      team: teamA || ({ id: match.teamAId, name: 'Team A', shortName: 'T1' } as Team),
      captain: teamAPlayers.find((p) => p.id === match.teamASquad?.captainId || p.isCaptain),
      viceCaptain: teamAPlayers.find((p) => p.id === match.teamASquad?.viceCaptainId || p.isViceCaptain),
      libero: teamAPlayers.find((p) => p.id === match.teamASquad?.liberoId),
      startingSix: teamAPlayers.filter((p) => teamASquadIds.includes(p.id)),
      substitutes: teamAPlayers.filter((p) => !teamASquadIds.includes(p.id) && p.id !== match.teamASquad?.liberoId),
    },
    teamB: {
      team: teamB || ({ id: match.teamBId, name: 'Team B', shortName: 'T2' } as Team),
      captain: teamBPlayers.find((p) => p.id === match.teamBSquad?.captainId || p.isCaptain),
      viceCaptain: teamBPlayers.find((p) => p.id === match.teamBSquad?.viceCaptainId || p.isViceCaptain),
      libero: teamBPlayers.find((p) => p.id === match.teamBSquad?.liberoId),
      startingSix: teamBPlayers.filter((p) => teamBSquadIds.includes(p.id)),
      substitutes: teamBPlayers.filter((p) => !teamBSquadIds.includes(p.id) && p.id !== match.teamBSquad?.liberoId),
    },
  };

  // Summary Cards
  const highestScorer = sortedByPoints[0];
  const bestBlocker = sortedByBlocks[0];
  const bestServer = sortedByAces[0];

  const summaryCards = {
    winnerName: scoringState.matchWinnerId
      ? scoringState.matchWinnerId === match.teamAId
        ? teamA?.name || 'Team A'
        : teamB?.name || 'Team B'
      : 'In Progress',
    teamASets: scoringState.setsWonA,
    teamBSets: scoringState.setsWonB,
    totalPointsA: scoringState.teamAStats.totalPoints,
    totalPointsB: scoringState.teamBStats.totalPoints,
    highestScorerText: highestScorer ? `${highestScorer.playerName} (${highestScorer.totalPoints} pts)` : 'N/A',
    bestBlockerText: bestBlocker ? `${bestBlocker.playerName} (${bestBlocker.blockPoints} blocks)` : 'N/A',
    bestServerText: bestServer ? `${bestServer.playerName} (${bestServer.serviceAces} aces)` : 'N/A',
    totalAces: scoringState.teamAStats.serviceAces + scoringState.teamBStats.serviceAces,
    totalBlocks: scoringState.teamAStats.blockPoints + scoringState.teamBStats.blockPoints,
    totalAttacks: scoringState.teamAStats.attackPoints + scoringState.teamBStats.attackPoints,
  };

  return {
    match,
    tournament,
    group,
    teamA,
    teamB,
    status: (match.status as any) || 'LIVE',
    isFinalized: options.isFinalized || false,
    finalizedAt: options.finalizedAt,
    finalizedBy: options.finalizedBy,
    matchResultText,
    winningTeamId: scoringState.matchWinnerId,
    winningMarginText: `${Math.max(scoringState.setsWonA, scoringState.setsWonB)}-${Math.min(scoringState.setsWonA, scoringState.setsWonB)} Sets`,
    setScoresSummary,
    sets: setReports,
    playerStats: scoringState.playerStats,
    teamAStats: scoringState.teamAStats,
    teamBStats: scoringState.teamBStats,
    timeline: activeEvents,
    timeouts: timeoutsList || [],
    substitutions: substitutionsList || [],
    suggestedPlayerOfMatch,
    selectedPlayerOfMatch,
    suggestedBestAttacker,
    selectedBestAttacker,
    suggestedBestServer,
    selectedBestServer,
    suggestedBestBlocker,
    selectedBestBlocker,
    suggestedBestDefender,
    selectedBestDefender,
    squadsReport,
    officialsReport: {
      referee: match.officials?.referee,
      umpire: match.officials?.umpire,
      scorer: match.officials?.scorer,
      assistant: match.officials?.assistant,
      commentator: match.officials?.commentator,
    },
    sponsorsReport: {
      tournamentSponsor: match.sponsors?.tournamentLogoUrl,
      matchSponsor: match.sponsors?.sponsorName,
    },
    summaryCards,
  };
}
