import {
  Match,
  Tournament,
  Group,
  Team,
  Player,
  BasketballScoringEvent,
  BasketballMatchClock,
  BasketballMatchReport,
  BasketballPlayerStats,
  AwardCandidate,
} from '../../src/types';
import { calculateBasketballScoringState } from './basketballScoringEngine';

/**
 * Pure Basketball Match Report and Scorecard Generator
 */
export function calculateBasketballMatchReport(
  match: Match,
  events: BasketballScoringEvent[],
  clock: BasketballMatchClock | undefined,
  allPlayers: Player[],
  tournament?: Tournament,
  group?: Group,
  teamA?: Team,
  teamB?: Team,
  savedAwards?: any[]
): BasketballMatchReport {
  const scoringState = calculateBasketballScoringState(match, events, clock, allPlayers);

  const teamAId = match.teamAId;
  const teamBId = match.teamBId;
  const actualTeamA = teamA || match.teamA || ({ id: teamAId, name: 'Team A' } as Team);
  const actualTeamB = teamB || match.teamB || ({ id: teamBId, name: 'Team B' } as Team);

  const teamAPlayers = allPlayers.filter((p) => p.teamId === teamAId);
  const teamBPlayers = allPlayers.filter((p) => p.teamId === teamBId);

  const squadA = match.teamASquad || { playingIds: [], substituteIds: [] };
  const squadB = match.teamBSquad || { playingIds: [], substituteIds: [] };

  const startFiveA = teamAPlayers.filter((p) => squadA.playingIds.slice(0, 5).includes(p.id));
  const subs_A = teamAPlayers.filter(
    (p) => squadA.substituteIds.includes(p.id) || (squadA.playingIds.includes(p.id) && !startFiveA.some((s) => s.id === p.id))
  );

  const startFiveB = teamBPlayers.filter((p) => squadB.playingIds.slice(0, 5).includes(p.id));
  const subs_B = teamBPlayers.filter(
    (p) => squadB.substituteIds.includes(p.id) || (squadB.playingIds.includes(p.id) && !startFiveB.some((s) => s.id === p.id))
  );

  const capA = teamAPlayers.find((p) => p.id === squadA.captainId);
  const capB = teamBPlayers.find((p) => p.id === squadB.captainId);

  const validEvents = scoringState.events;

  // Filtered timeline categories
  const pointsTimeline = validEvents.filter(
    (e) => e.eventType === 'SCORE_1PT' || e.eventType === 'SCORE_2PT' || e.eventType === 'SCORE_3PT'
  );

  const foulsList = validEvents.filter(
    (e) =>
      e.eventType === 'FOUL_PERSONAL' ||
      e.eventType === 'FOUL_SHOOTING' ||
      e.eventType === 'FOUL_OFFENSIVE' ||
      e.eventType === 'FOUL_TECHNICAL' ||
      e.eventType === 'FOUL_FLAGRANT' ||
      e.eventType === 'FOUL_TEAM'
  );

  const substitutions = validEvents.filter((e) => e.eventType === 'SUBSTITUTION');
  const timeoutsList = validEvents.filter((e) => e.eventType === 'TIMEOUT');

  // Calculate Halftime Score (sum of Q1 + Q2)
  const q1Score = scoringState.periodScores.find((p) => p.quarter === 1) || { scoreA: 0, scoreB: 0 };
  const q2Score = scoringState.periodScores.find((p) => p.quarter === 2) || { scoreA: 0, scoreB: 0 };
  const halfTimeScore = {
    teamA: q1Score.scoreA + q2Score.scoreA,
    teamB: q1Score.scoreB + q2Score.scoreB,
  };

  // Regulation Score (sum of Q1 + Q2 + Q3 + Q4)
  const regScores = scoringState.periodScores.filter((p) => p.quarter <= 4);
  const regulationScore = {
    teamA: regScores.reduce((sum, p) => sum + p.scoreA, 0),
    teamB: regScores.reduce((sum, p) => sum + p.scoreB, 0),
  };

  const finalScore = {
    teamA: scoringState.teamAScore,
    teamB: scoringState.teamBScore,
  };

  // Awards calculation
  const calculateAwards = (): {
    suggestedPotm?: AwardCandidate;
    suggestedScorer?: AwardCandidate;
    suggestedRebounder?: AwardCandidate;
    suggestedPlaymaker?: AwardCandidate;
    suggestedDefender?: AwardCandidate;
    suggestedThreePoint?: AwardCandidate;
  } => {
    const candidates: (AwardCandidate & {
      potmScore: number;
      points: number;
      rebounds: number;
      assists: number;
      defenseScore: number;
      threes: number;
    })[] = [];

    for (const pStats of scoringState.playerStats) {
      const isWinner = scoringState.winnerTeamId === pStats.teamId;

      // Comprehensive MVP Impact Score
      const potmScore =
        pStats.points * 1.0 +
        pStats.trb * 1.2 +
        pStats.assists * 1.5 +
        pStats.steals * 2.0 +
        pStats.blocks * 2.0 -
        pStats.turnovers * 1.2 -
        (pStats.fga - pStats.fgm) * 0.5 +
        (isWinner ? 5 : 0);

      const defenseScore = pStats.steals * 2 + pStats.blocks * 2 + pStats.drb * 1.2;

      const perfText = `${pStats.points} PTS, ${pStats.trb} REB, ${pStats.assists} AST, ${pStats.steals} STL, ${pStats.blocks} BLK (EFF: ${pStats.efficiency})`;

      candidates.push({
        playerId: pStats.playerId,
        playerName: pStats.playerName,
        teamId: pStats.teamId,
        teamName: pStats.teamName,
        playerRole: pStats.position,
        jerseyNumber: pStats.jerseyNumber,
        isStarter: pStats.isStarter,
        isCaptain: pStats.isCaptain,
        details: perfText,
        performanceDescription: perfText,
        statsSummary: {
          points: pStats.points,
          rebounds: pStats.trb,
          assists: pStats.assists,
          steals: pStats.steals,
          blocks: pStats.blocks,
          turnovers: pStats.turnovers,
          fouls: pStats.personalFouls,
          efficiency: pStats.efficiency,
        },
        potmScore,
        points: pStats.points,
        rebounds: pStats.trb,
        assists: pStats.assists,
        defenseScore,
        threes: pStats.threePm,
      });
    }

    if (candidates.length === 0) {
      return {};
    }

    // Sort for each category
    const potmCandidate = [...candidates].sort((a, b) => b.potmScore - a.potmScore)[0];
    const topScorerCandidate = [...candidates].sort((a, b) => b.points - a.points)[0];
    const topRebounderCandidate = [...candidates].sort((a, b) => b.rebounds - a.rebounds)[0];
    const topPlaymakerCandidate = [...candidates].sort((a, b) => b.assists - a.assists)[0];
    const topDefenderCandidate = [...candidates].sort((a, b) => b.defenseScore - a.defenseScore)[0];
    const topThreePointCandidate = [...candidates].sort((a, b) => b.threes - a.threes)[0];

    return {
      suggestedPotm: potmCandidate,
      suggestedScorer: topScorerCandidate?.points > 0 ? topScorerCandidate : undefined,
      suggestedRebounder: topRebounderCandidate?.rebounds > 0 ? topRebounderCandidate : undefined,
      suggestedPlaymaker: topPlaymakerCandidate?.assists > 0 ? topPlaymakerCandidate : undefined,
      suggestedDefender: topDefenderCandidate?.defenseScore > 0 ? topDefenderCandidate : undefined,
      suggestedThreePoint: topThreePointCandidate?.threes > 0 ? topThreePointCandidate : undefined,
    };
  };

  const awards = calculateAwards();

  // Helper for saved awards override
  const getSavedAward = (category: string): AwardCandidate | undefined => {
    if (!savedAwards || savedAwards.length === 0) return undefined;
    const a = savedAwards.find((item: any) => item.category === category || item.awardType === category);
    if (!a) return undefined;
    const p = allPlayers.find((player) => player.id === a.playerId);
    return {
      playerId: a.playerId,
      playerName: a.playerName || p?.name || 'Player',
      teamId: a.teamId,
      teamName: a.teamName,
      playerRole: p?.role || p?.playingPosition,
      details: a.reason || 'Award winner',
      performanceDescription: a.reason,
    };
  };

  // Result text
  let matchResultText = 'Match in progress';
  if (scoringState.isMatchComplete || match.status === 'COMPLETED') {
    if (finalScore.teamA > finalScore.teamB) {
      matchResultText = `${actualTeamA.name} won by ${finalScore.teamA - finalScore.teamB} points`;
    } else if (finalScore.teamB > finalScore.teamA) {
      matchResultText = `${actualTeamB.name} won by ${finalScore.teamB - finalScore.teamA} points`;
    } else {
      matchResultText = 'Match ended in a tie';
    }
  }

  const summaryCards = {
    winnerName: scoringState.winnerTeamId
      ? scoringState.winnerTeamId === teamAId
        ? actualTeamA.name
        : actualTeamB.name
      : 'In Progress',
    finalScoreA: finalScore.teamA,
    finalScoreB: finalScore.teamB,
    halfTimeScoreText: `${halfTimeScore.teamA} - ${halfTimeScore.teamB}`,
    topScorerText: awards.suggestedScorer
      ? `${awards.suggestedScorer.playerName} (${awards.suggestedScorer.statsSummary?.points} PTS)`
      : 'None',
    topRebounderText: awards.suggestedRebounder
      ? `${awards.suggestedRebounder.playerName} (${awards.suggestedRebounder.statsSummary?.rebounds} REB)`
      : 'None',
    topAssisterText: awards.suggestedPlaymaker
      ? `${awards.suggestedPlaymaker.playerName} (${awards.suggestedPlaymaker.statsSummary?.assists} AST)`
      : 'None',
    isOvertime: scoringState.isOvertime,
  };

  return {
    match,
    matchId: match.id,
    tournament,
    group,
    teamA: actualTeamA,
    teamB: actualTeamB,
    status: match.status,
    isFinalized: match.status === 'COMPLETED',
    matchResultText,
    winningTeamId: scoringState.winnerTeamId,
    winningMarginText: scoringState.winningMargin,
    periodScores: scoringState.periodScores,
    halfTimeScore,
    regulationScore,
    finalScore,
    isOvertime: scoringState.isOvertime,
    playerStats: scoringState.playerStats,
    teamAStats: scoringState.teamAStats,
    teamBStats: scoringState.teamBStats,
    events: scoringState.events,
    pointsTimeline,
    foulsList,
    substitutions,
    timeoutsList,
    suggestedPlayerOfMatch: awards.suggestedPotm,
    selectedPlayerOfMatch: getSavedAward('PLAYER_OF_MATCH') || awards.suggestedPotm,
    suggestedBestScorer: awards.suggestedScorer,
    selectedBestScorer: getSavedAward('BEST_SCORER') || awards.suggestedScorer,
    suggestedBestRebounder: awards.suggestedRebounder,
    selectedBestRebounder: getSavedAward('BEST_REBOUNDER') || awards.suggestedRebounder,
    suggestedBestPlaymaker: awards.suggestedPlaymaker,
    selectedBestPlaymaker: getSavedAward('BEST_PLAYMAKER') || awards.suggestedPlaymaker,
    suggestedBestDefender: awards.suggestedDefender,
    selectedBestDefender: getSavedAward('BEST_DEFENDER') || awards.suggestedDefender,
    suggestedBestThreePointShooter: awards.suggestedThreePoint,
    selectedBestThreePointShooter: getSavedAward('BEST_3PT_SHOOTER') || awards.suggestedThreePoint,
    suggestedAwards: {
      playerOfTheMatch: awards.suggestedPotm,
      bestScorer: awards.suggestedScorer,
      bestRebounder: awards.suggestedRebounder,
      bestPlaymaker: awards.suggestedPlaymaker,
      bestDefender: awards.suggestedDefender,
      bestThreePointShooter: awards.suggestedThreePoint,
    },
    selectedAwards: {
      playerOfTheMatch: getSavedAward('PLAYER_OF_MATCH') || awards.suggestedPotm,
      bestScorer: getSavedAward('BEST_SCORER') || awards.suggestedScorer,
      bestRebounder: getSavedAward('BEST_REBOUNDER') || awards.suggestedRebounder,
      bestPlaymaker: getSavedAward('BEST_PLAYMAKER') || awards.suggestedPlaymaker,
      bestDefender: getSavedAward('BEST_DEFENDER') || awards.suggestedDefender,
      bestThreePointShooter: getSavedAward('BEST_3PT_SHOOTER') || awards.suggestedThreePoint,
    },
    squadsReport: {
      teamA: {
        team: actualTeamA,
        captain: capA,
        startingFive: startFiveA,
        substitutes: subs_A,
      },
      teamB: {
        team: actualTeamB,
        captain: capB,
        startingFive: startFiveB,
        substitutes: subs_B,
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
