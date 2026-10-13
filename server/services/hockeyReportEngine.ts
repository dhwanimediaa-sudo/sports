import {
  Match,
  Team,
  Player,
  AwardCandidate,
  HockeyScoringEvent,
  HockeyMatchReport,
  HockeyMatchClock,
} from '../../src/types';
import { calculateHockeyScoringState, getHockeyMatchRules } from './hockeyScoringEngine';

/**
 * Pure reactive engine calculating complete Hockey match report, derived analytics, and award nominations.
 */
export function generateHockeyMatchReport(
  match: Match,
  events: HockeyScoringEvent[],
  clockState?: HockeyMatchClock,
  allPlayers: Player[] = [],
  savedAwards?: any
): HockeyMatchReport {
  const scoringState = calculateHockeyScoringState(match, events, clockState, allPlayers);
  const activeEvents = scoringState.events;

  // Player Map for quick name lookup
  const playerMap = new Map<string, Player>();
  allPlayers.forEach((p) => playerMap.set(p.id, p));

  // Goal Timeline
  const goalTimeline = activeEvents.filter((e) => e.eventType === 'GOAL');
  const penaltyCornersList = activeEvents.filter((e) => e.eventType === 'PENALTY_CORNER');
  const cardsList = activeEvents.filter((e) => e.eventType === 'CARD');

  // Calculate Award Suggestions
  // 1. Player of the Match: weighted algorithm based on goals (30 pts), assists (15 pts), saves (10 pts), cards (-15 pts)
  let bestPlayerCandidate: AwardCandidate | undefined;
  let highestScore = -1;

  scoringState.playerStats.forEach((stat) => {
    const isWinner = scoringState.matchWinnerId ? stat.teamId === scoringState.matchWinnerId : false;
    let score =
      stat.goals * 35 +
      stat.assists * 18 +
      stat.saves * 8 +
      stat.penaltyStrokeSaves * 20 +
      stat.shootoutGoalsScored * 15 +
      stat.shootoutSaves * 15 -
      stat.greenCards * 5 -
      stat.yellowCards * 15 -
      stat.redCards * 35 +
      (isWinner ? 10 : 0);

    if (score > highestScore && (stat.goals > 0 || stat.assists > 0 || stat.saves > 0 || stat.shootoutSaves > 0)) {
      highestScore = score;
      const teamName =
        stat.teamId === match.teamAId ? match.teamA?.name || 'Team A' : match.teamB?.name || 'Team B';
      bestPlayerCandidate = {
        playerId: stat.playerId,
        playerName: stat.playerName,
        name: stat.playerName,
        teamId: stat.teamId,
        teamName,
        details: `${stat.goals} Goals, ${stat.assists} Assists, ${stat.saves} Saves`,
        points: score,
      };
    }
  });

  // Fallback Player of the Match if no goals scored
  if (!bestPlayerCandidate && scoringState.playerStats.length > 0) {
    const firstP = scoringState.playerStats[0];
    const teamName =
      firstP.teamId === match.teamAId ? match.teamA?.name || 'Team A' : match.teamB?.name || 'Team B';
    bestPlayerCandidate = {
      playerId: firstP.playerId,
      playerName: firstP.playerName,
      name: firstP.playerName,
      teamId: firstP.teamId,
      teamName,
      details: 'All-round match contribution',
      points: 10,
    };
  }

  // 2. Best Forward: top goals/field goals
  let bestForwardCandidate: AwardCandidate | undefined;
  let topForwardGoals = -1;
  scoringState.playerStats.forEach((stat) => {
    const pts = stat.goals * 10 + stat.assists * 5;
    if (pts > topForwardGoals && (stat.goals > 0 || stat.assists > 0)) {
      topForwardGoals = pts;
      const teamName =
        stat.teamId === match.teamAId ? match.teamA?.name || 'Team A' : match.teamB?.name || 'Team B';
      bestForwardCandidate = {
        playerId: stat.playerId,
        playerName: stat.playerName,
        name: stat.playerName,
        teamId: stat.teamId,
        teamName,
        details: `${stat.goals} Goals (${stat.fieldGoals} FG, ${stat.penaltyCornerGoals} PC), ${stat.assists} Assists`,
        points: pts,
      };
    }
  });

  // 3. Best Goalkeeper: top saves
  let bestGkCandidate: AwardCandidate | undefined;
  let topGkSaves = -1;
  scoringState.playerStats.forEach((stat) => {
    if (stat.isGoalkeeper || stat.saves > 0 || stat.shootoutSaves > 0) {
      const pts = stat.saves * 5 + stat.penaltyStrokeSaves * 10 + stat.shootoutSaves * 10 - stat.goalsConceded * 2;
      if (pts > topGkSaves) {
        topGkSaves = pts;
        const teamName =
          stat.teamId === match.teamAId ? match.teamA?.name || 'Team A' : match.teamB?.name || 'Team B';
        bestGkCandidate = {
          playerId: stat.playerId,
          playerName: stat.playerName,
          name: stat.playerName,
          teamId: stat.teamId,
          teamName,
          details: `${stat.saves} Saves, ${stat.penaltyStrokeSaves} PS Saves, ${stat.shootoutSaves} SO Saves`,
          points: pts,
        };
      }
    }
  });

  // Squads Roster Setup
  const teamAPlaying = (match.teamASquad?.playingIds || [])
    .map((id) => playerMap.get(id))
    .filter(Boolean) as Player[];
  const teamASubs = (match.teamASquad?.substituteIds || [])
    .map((id) => playerMap.get(id))
    .filter(Boolean) as Player[];

  const teamBPlaying = (match.teamBSquad?.playingIds || [])
    .map((id) => playerMap.get(id))
    .filter(Boolean) as Player[];
  const teamBSubs = (match.teamBSquad?.substituteIds || [])
    .map((id) => playerMap.get(id))
    .filter(Boolean) as Player[];

  // Top Scorer text
  const sortedScorers = [...scoringState.playerStats].sort((a, b) => b.goals - a.goals);
  const topScorerText =
    sortedScorers.length > 0 && sortedScorers[0].goals > 0
      ? `${sortedScorers[0].playerName} (${sortedScorers[0].goals} Goal${sortedScorers[0].goals > 1 ? 's' : ''})`
      : 'No goals recorded';

  const bestGoalkeeperText = bestGkCandidate
    ? `${bestGkCandidate.name} (${bestGkCandidate.details})`
    : 'No goalkeeper data';

  return {
    match,
    tournament: match.tournament,
    group: match.group,
    teamA: match.teamA,
    teamB: match.teamB,
    status: scoringState.status as any,
    isFinalized: savedAwards?.isFinalized || false,
    finalizedAt: savedAwards?.finalizedAt,
    finalizedBy: savedAwards?.finalizedBy,
    matchResultText: scoringState.matchResultText || 'Match in progress',
    winningTeamId: scoringState.matchWinnerId,
    winningMarginText: scoringState.matchResultText,
    periodScores: scoringState.periodScores,
    finalScore: {
      teamA: scoringState.teamAScore,
      teamB: scoringState.teamBScore,
    },
    shootoutScore: scoringState.isShootout
      ? {
          teamA: scoringState.shootoutScoreA,
          teamB: scoringState.shootoutScoreB,
        }
      : undefined,
    playerStats: scoringState.playerStats,
    teamAStats: scoringState.teamAStats,
    teamBStats: scoringState.teamBStats,
    events: activeEvents,
    goalTimeline,
    penaltyCornersList,
    cardsList,
    substitutions: scoringState.substitutions,
    shootoutAttempts: scoringState.shootoutAttempts,
    suggestedPlayerOfMatch: bestPlayerCandidate,
    selectedPlayerOfMatch: savedAwards?.selectedPlayerOfMatch || bestPlayerCandidate,
    suggestedBestForward: bestForwardCandidate,
    selectedBestForward: savedAwards?.selectedBestForward || bestForwardCandidate,
    suggestedBestGoalkeeper: bestGkCandidate,
    selectedBestGoalkeeper: savedAwards?.selectedBestGoalkeeper || bestGkCandidate,
    squadsReport: {
      teamA: {
        team: match.teamA || ({} as Team),
        captain: match.teamASquad?.captainId ? playerMap.get(match.teamASquad.captainId) : undefined,
        viceCaptain: match.teamASquad?.viceCaptainId
          ? playerMap.get(match.teamASquad.viceCaptainId)
          : undefined,
        goalkeeper: match.teamASquad?.goalkeeperId
          ? playerMap.get(match.teamASquad.goalkeeperId)
          : undefined,
        startingEleven: teamAPlaying,
        substitutes: teamASubs,
      },
      teamB: {
        team: match.teamB || ({} as Team),
        captain: match.teamBSquad?.captainId ? playerMap.get(match.teamBSquad.captainId) : undefined,
        viceCaptain: match.teamBSquad?.viceCaptainId
          ? playerMap.get(match.teamBSquad.viceCaptainId)
          : undefined,
        goalkeeper: match.teamBSquad?.goalkeeperId
          ? playerMap.get(match.teamBSquad.goalkeeperId)
          : undefined,
        startingEleven: teamBPlaying,
        substitutes: teamBSubs,
      },
    },
    officialsReport: {
      referee: match.officials?.referee,
      umpire: match.officials?.umpire,
      scorer: match.officials?.scorer,
      assistant: match.officials?.assistant,
      commentator: match.officials?.commentator,
    },
    sponsorsReport: {
      tournamentSponsor: (match.tournament as any)?.sponsorName,
      matchSponsor: match.sponsors?.sponsorName,
    },
    summaryCards: {
      winnerName: scoringState.matchWinnerId
        ? scoringState.matchWinnerId === match.teamAId
          ? match.teamA?.name || 'Team A'
          : match.teamB?.name || 'Team B'
        : 'Draw / Tied',
      finalScoreA: scoringState.teamAScore,
      finalScoreB: scoringState.teamBScore,
      totalPenaltyCornersA: scoringState.teamAStats.penaltyCorners,
      totalPenaltyCornersB: scoringState.teamBStats.penaltyCorners,
      totalCardsA:
        scoringState.teamAStats.greenCards +
        scoringState.teamAStats.yellowCards +
        scoringState.teamAStats.redCards,
      totalCardsB:
        scoringState.teamBStats.greenCards +
        scoringState.teamBStats.yellowCards +
        scoringState.teamBStats.redCards,
      topScorerText,
      bestGoalkeeperText,
      isShootout: scoringState.isShootout,
      shootoutResultText: scoringState.isShootout
        ? `${scoringState.shootoutScoreA} - ${scoringState.shootoutScoreB}`
        : undefined,
    },
  };
}
