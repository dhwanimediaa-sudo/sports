import {
  Match,
  Tournament,
  Group,
  Team,
  Player,
  FootballScoringEvent,
  FootballMatchClock,
  FootballMatchReport,
  FootballPlayerStats,
  AwardCandidate,
} from '../../src/types';
import { calculateFootballScoringState } from './footballScoringEngine';

/**
 * Pure Football / Soccer Match Report and Scorecard Generator
 */
export function calculateFootballMatchReport(
  match: Match,
  events: FootballScoringEvent[],
  clock: FootballMatchClock | undefined,
  allPlayers: Player[],
  tournament?: Tournament,
  group?: Group,
  teamA?: Team,
  teamB?: Team,
  savedAwards?: any[]
): FootballMatchReport {
  const scoringState = calculateFootballScoringState(match, events, clock, allPlayers);

  const teamAId = match.teamAId;
  const teamBId = match.teamBId;
  const actualTeamA = teamA || match.teamA || ({ id: teamAId, name: 'Team A' } as Team);
  const actualTeamB = teamB || match.teamB || ({ id: teamBId, name: 'Team B' } as Team);

  const teamAPlayers = allPlayers.filter((p) => p.teamId === teamAId);
  const teamBPlayers = allPlayers.filter((p) => p.teamId === teamBId);

  const squadA = match.teamASquad || { playingIds: [], substituteIds: [] };
  const squadB = match.teamBSquad || { playingIds: [], substituteIds: [] };

  const startXI_A = teamAPlayers.filter((p) => squadA.playingIds.includes(p.id));
  const subs_A = teamAPlayers.filter((p) => squadA.substituteIds.includes(p.id));

  const startXI_B = teamBPlayers.filter((p) => squadB.playingIds.includes(p.id));
  const subs_B = teamBPlayers.filter((p) => squadB.substituteIds.includes(p.id));

  const capA = teamAPlayers.find((p) => p.id === squadA.captainId);
  const vcA = teamAPlayers.find((p) => p.id === squadA.viceCaptainId);
  const gkA = teamAPlayers.find((p) => p.id === squadA.goalkeeperId || p.role?.toLowerCase().includes('keeper') || p.role?.toLowerCase() === 'gk');

  const capB = teamBPlayers.find((p) => p.id === squadB.captainId);
  const vcB = teamBPlayers.find((p) => p.id === squadB.viceCaptainId);
  const gkB = teamBPlayers.find((p) => p.id === squadB.goalkeeperId || p.role?.toLowerCase().includes('keeper') || p.role?.toLowerCase() === 'gk');

  // Filter specific event lists
  const validEvents = scoringState.events;

  const goalTimeline = validEvents.filter(
    (e) => e.eventType === 'GOAL' || e.eventType === 'OWN_GOAL' || e.eventType === 'PENALTY_GOAL'
  );

  const cardsList = validEvents.filter(
    (e) => e.eventType === 'YELLOW_CARD' || e.eventType === 'SECOND_YELLOW' || e.eventType === 'RED_CARD'
  );

  const cornersList = validEvents.filter((e) => e.eventType === 'CORNER');

  const penaltiesList = validEvents.filter(
    (e) =>
      e.eventType === 'PENALTY_AWARDED' ||
      e.eventType === 'PENALTY_GOAL' ||
      e.eventType === 'PENALTY_MISSED' ||
      e.eventType === 'PENALTY_SAVED'
  );

  // Awards calculations
  const calculateAwards = (): {
    suggestedPotm?: AwardCandidate;
    suggestedGk?: AwardCandidate;
    suggestedDef?: AwardCandidate;
    suggestedMid?: AwardCandidate;
    suggestedFwd?: AwardCandidate;
    suggestedTopScorer?: AwardCandidate;
  } => {
    const candidates: (AwardCandidate & {
      potmScore: number;
      gkScore: number;
      defScore: number;
      midScore: number;
      fwdScore: number;
      goals: number;
    })[] = [];

    for (const pStats of scoringState.playerStats) {
      const playerObj = allPlayers.find((p) => p.id === pStats.playerId);
      const isWinner = scoringState.matchWinnerId === pStats.teamId;

      // Scoring formulas
      const potmScore =
        pStats.goals * 35 +
        pStats.assists * 20 +
        (pStats.cleanSheet ? 20 : 0) +
        pStats.saves * 8 +
        pStats.shotsOnTarget * 5 +
        pStats.cornersTaken * 2 +
        (isWinner ? 10 : 0) -
        pStats.yellowCards * 5 -
        pStats.redCards * 25;

      const gkScore =
        pStats.saves * 15 +
        pStats.penaltiesSaved * 25 +
        pStats.shootoutSaves * 20 +
        (pStats.cleanSheet ? 30 : 0) -
        pStats.goalsConceded * 5;

      const defScore =
        (pStats.cleanSheet ? 35 : 0) +
        pStats.goals * 25 +
        pStats.assists * 15 -
        pStats.yellowCards * 5 -
        pStats.redCards * 20;

      const midScore =
        pStats.assists * 25 +
        pStats.goals * 20 +
        pStats.shotsOnTarget * 5 +
        pStats.cornersTaken * 3;

      const fwdScore =
        pStats.goals * 30 +
        pStats.shotsOnTarget * 8 +
        pStats.assists * 15;

      candidates.push({
        playerId: pStats.playerId,
        playerName: pStats.playerName,
        teamId: pStats.teamId,
        teamName: pStats.teamName,
        playerNumber: playerObj?.jerseyNumber ? Number(playerObj.jerseyNumber) : undefined,
        playerRole: pStats.role,
        score: potmScore,
        details: `${pStats.goals} Goals, ${pStats.assists} Assists, ${pStats.shotsOnTarget} Shots on target`,
        performanceDescription: `${pStats.goals} Goals, ${pStats.assists} Assists, ${pStats.shotsOnTarget} Shots on target`,
        statsSummary: {
          goals: pStats.goals,
          assists: pStats.assists,
          saves: pStats.saves,
          cleanSheet: pStats.cleanSheet,
          shots: pStats.shots,
          yellowCards: pStats.yellowCards,
          redCards: pStats.redCards,
        },
        potmScore,
        gkScore,
        defScore,
        midScore,
        fwdScore,
        goals: pStats.goals,
      });
    }

    if (candidates.length === 0) return {};

    const sortPotm = [...candidates].sort((a, b) => b.potmScore - a.potmScore);
    const sortGk = [...candidates]
      .filter((c) => c.playerRole.toLowerCase().includes('keeper') || c.playerRole.toLowerCase() === 'gk' || c.gkScore > 10)
      .sort((a, b) => b.gkScore - a.gkScore);
    const sortDef = [...candidates]
      .filter((c) => c.playerRole.toLowerCase().includes('def'))
      .sort((a, b) => b.defScore - a.defScore);
    const sortMid = [...candidates]
      .filter((c) => c.playerRole.toLowerCase().includes('mid'))
      .sort((a, b) => b.midScore - a.midScore);
    const sortFwd = [...candidates]
      .filter((c) => c.playerRole.toLowerCase().includes('fwd') || c.playerRole.toLowerCase().includes('forward') || c.playerRole.toLowerCase().includes('striker'))
      .sort((a, b) => b.fwdScore - a.fwdScore);
    const sortTopScorer = [...candidates].filter((c) => c.goals > 0).sort((a, b) => b.goals - a.goals);

    return {
      suggestedPotm: sortPotm[0],
      suggestedGk: sortGk[0] || sortPotm.find((c) => c.statsSummary?.saves && c.statsSummary.saves > 0),
      suggestedDef: sortDef[0] || sortPotm[1],
      suggestedMid: sortMid[0] || sortPotm[0],
      suggestedFwd: sortFwd[0] || sortTopScorer[0] || sortPotm[0],
      suggestedTopScorer: sortTopScorer[0],
    };
  };

  const awards = calculateAwards();

  // Find saved admin awards if any
  const getSavedAward = (type: string) => {
    if (!savedAwards) return undefined;
    const a = savedAwards.find((item) => item.awardType === type);
    if (!a) return undefined;
    const p = allPlayers.find((pl) => pl.id === a.playerId);
    return {
      playerId: a.playerId,
      playerName: a.playerName || p?.name || 'Player',
      teamId: a.teamId,
      teamName: a.teamName,
      playerRole: p?.role,
      details: a.reason || 'Award winner',
      performanceDescription: a.reason,
    };
  };

  const finalScore = {
    teamA: scoringState.teamAScore,
    teamB: scoringState.teamBScore,
  };

  const summaryCards = {
    winnerName: scoringState.matchWinnerId
      ? scoringState.matchWinnerId === teamAId
        ? actualTeamA.name
        : actualTeamB.name
      : 'Draw',
    finalScoreA: finalScore.teamA,
    finalScoreB: finalScore.teamB,
    halfTimeScoreText: `${scoringState.halfTimeScore.teamA} - ${scoringState.halfTimeScore.teamB}`,
    fullTimeScoreText: `${scoringState.fullTimeScore.teamA} - ${scoringState.fullTimeScore.teamB}`,
    totalCornersA: scoringState.teamAStats.corners,
    totalCornersB: scoringState.teamBStats.corners,
    totalCardsA: scoringState.teamAStats.yellowCards + scoringState.teamAStats.redCards,
    totalCardsB: scoringState.teamBStats.yellowCards + scoringState.teamBStats.redCards,
    topScorerText: awards.suggestedTopScorer
      ? `${awards.suggestedTopScorer.playerName} (${awards.suggestedTopScorer.statsSummary?.goals} Goals)`
      : 'None',
    bestGoalkeeperText: awards.suggestedGk ? awards.suggestedGk.playerName : 'N/A',
    isShootout: scoringState.isShootout,
    shootoutResultText: scoringState.isShootout
      ? `${scoringState.shootoutScoreA} - ${scoringState.shootoutScoreB}`
      : undefined,
  };

  return {
    match,
    tournament,
    group,
    teamA: actualTeamA,
    teamB: actualTeamB,
    status: match.status,
    isFinalized: match.status === 'COMPLETED',
    matchResultText: scoringState.matchResultText || 'Match in progress',
    winningTeamId: scoringState.matchWinnerId,
    periodScores: scoringState.periodScores,
    halfTimeScore: scoringState.halfTimeScore,
    fullTimeScore: scoringState.fullTimeScore,
    extraTimeScore: scoringState.extraTimeScore,
    shootoutScore: scoringState.shootoutScore,
    finalScore,
    playerStats: scoringState.playerStats,
    teamAStats: scoringState.teamAStats,
    teamBStats: scoringState.teamBStats,
    events: scoringState.events,
    goalTimeline,
    cardsList,
    substitutions: scoringState.substitutions,
    cornersList,
    penaltiesList,
    shootoutAttempts: scoringState.shootoutAttempts,
    formations: {
      teamA: scoringState.formationA,
      teamB: scoringState.formationB,
    },
    suggestedPlayerOfMatch: awards.suggestedPotm,
    selectedPlayerOfMatch: getSavedAward('PLAYER_OF_MATCH') || awards.suggestedPotm,
    suggestedBestGoalkeeper: awards.suggestedGk,
    selectedBestGoalkeeper: getSavedAward('BEST_GOALKEEPER') || awards.suggestedGk,
    suggestedBestDefender: awards.suggestedDef,
    selectedBestDefender: getSavedAward('BEST_DEFENDER') || awards.suggestedDef,
    suggestedBestMidfielder: awards.suggestedMid,
    selectedBestMidfielder: getSavedAward('BEST_MIDFIELDER') || awards.suggestedMid,
    suggestedBestForward: awards.suggestedFwd,
    selectedBestForward: getSavedAward('BEST_FORWARD') || awards.suggestedFwd,
    suggestedTopScorer: awards.suggestedTopScorer,
    selectedTopScorer: getSavedAward('TOP_SCORER') || awards.suggestedTopScorer,
    squadsReport: {
      teamA: {
        team: actualTeamA,
        captain: capA,
        viceCaptain: vcA,
        goalkeeper: gkA,
        startingEleven: startXI_A,
        substitutes: subs_A,
        formation: scoringState.formationA,
      },
      teamB: {
        team: actualTeamB,
        captain: capB,
        viceCaptain: vcB,
        goalkeeper: gkB,
        startingEleven: startXI_B,
        substitutes: subs_B,
        formation: scoringState.formationB,
      },
    },
    officialsReport: {
      referee: match.officials?.referee || match.officials?.official1,
      umpire: match.officials?.umpire,
      scorer: match.officials?.scorer,
      assistant: match.officials?.assistant || match.officials?.official2,
      commentator: match.officials?.commentator,
    },
    sponsorsReport: {
      tournamentSponsor: match.sponsors?.tournamentSponsor,
      matchSponsor: match.sponsors?.matchSponsor,
    },
    summaryCards,
  };
}
