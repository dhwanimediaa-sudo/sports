import {
  Match,
  Tournament,
  Group,
  Team,
  Player,
  TennisScoringEvent,
  TennisMatchReport,
  TennisPlayerStats,
  TennisSetScore,
  AwardCandidate,
} from '../../src/types';
import { calculateTennisScoringState, getTennisMatchRules } from './tennisScoringEngine';

/**
 * Pure Tennis Match Report and Scorecard Generator
 */
export function calculateTennisMatchReport(
  match: Match,
  events: TennisScoringEvent[],
  allPlayers: Player[],
  tournament?: Tournament,
  group?: Group,
  teamA?: Team,
  teamB?: Team,
  savedAwards?: any[]
): TennisMatchReport {
  const scoringState = calculateTennisScoringState(match, events, allPlayers);
  const rules = getTennisMatchRules(match);

  const teamAId = match.teamAId;
  const teamBId = match.teamBId;
  const actualTeamA = teamA || match.teamA || ({ id: teamAId, name: 'Player / Team A' } as Team);
  const actualTeamB = teamB || match.teamB || ({ id: teamBId, name: 'Player / Team B' } as Team);

  const teamAPlayers = allPlayers.filter((p) => p.teamId === teamAId);
  const teamBPlayers = allPlayers.filter((p) => p.teamId === teamBId);

  const squadA = match.teamASquad || { playingIds: [], substituteIds: [] };
  const squadB = match.teamBSquad || { playingIds: [], substituteIds: [] };

  const capA = teamAPlayers.find((p) => p.id === squadA.captainId) || teamAPlayers[0];
  const capB = teamBPlayers.find((p) => p.id === squadB.captainId) || teamBPlayers[0];

  const validEvents = scoringState.events;

  // Build formatted set scores display
  const completedSets = scoringState.setScores.filter((s) => s.isCompleted || s.gamesA > 0 || s.gamesB > 0);
  const finalSetScoreDisplay = completedSets
    .map((s) => {
      let text = `${s.gamesA}-${s.gamesB}`;
      if (s.isTiebreak && s.tiebreakScoreA !== undefined && s.tiebreakScoreB !== undefined) {
        const loserTb = Math.min(s.tiebreakScoreA, s.tiebreakScoreB);
        text += `(${loserTb})`;
      }
      return text;
    })
    .join(', ') || '0-0';

  // Build game timeline
  const gameTimeline: Array<{
    setNumber: number;
    gameNumber: number;
    winnerTeamId: string;
    serverPlayerName: string;
    scoreDisplay: string;
    isBreak: boolean;
    isTiebreak: boolean;
  }> = [];

  const gameWonEvents = validEvents.filter((e) => e.gameWon);
  gameWonEvents.forEach((evt, idx) => {
    const isServerA = evt.serverTeamId === teamAId;
    const isWonByA = evt.pointWinner === 'TEAM_A';
    const isBreak = (isServerA && !isWonByA) || (!isServerA && isWonByA);

    gameTimeline.push({
      setNumber: evt.setNumber,
      gameNumber: evt.gameNumber || idx + 1,
      winnerTeamId: isWonByA ? teamAId : teamBId,
      serverPlayerName: evt.serverPlayerName || (isServerA ? actualTeamA.name : actualTeamB.name),
      scoreDisplay: `${evt.scoreAfter?.gamesA || 0}-${evt.scoreAfter?.gamesB || 0}`,
      isBreak,
      isTiebreak: evt.isTiebreak || false,
    });
  });

  // Calculate Awards
  const calculateAwards = (): {
    suggestedPotm?: AwardCandidate;
    suggestedServer?: AwardCandidate;
    suggestedReturner?: AwardCandidate;
    suggestedPerformer?: AwardCandidate;
  } => {
    const pStats = scoringState.playerStats;
    if (pStats.length === 0) return {};

    // Ranking algorithm for POTM: (Points Won * 1.5) + (Aces * 3) + (Breaks Won * 5) - (Double Faults * 2) - (Unforced Errors * 1)
    const potmList = [...pStats].sort((a, b) => {
      const scoreA = a.totalPointsWon * 1.5 + a.aces * 3 + a.breakPointsWon * 5 - a.doubleFaults * 2 - a.unforcedErrors;
      const scoreB = b.totalPointsWon * 1.5 + b.aces * 3 + b.breakPointsWon * 5 - b.doubleFaults * 2 - b.unforcedErrors;
      // Bonus if player is from the winning team
      const bonusA = scoringState.winnerTeamId === a.teamId ? 25 : 0;
      const bonusB = scoringState.winnerTeamId === b.teamId ? 25 : 0;
      return scoreB + bonusB - (scoreA + bonusA);
    });

    // Best Server: highest Aces + first serve won %
    const serverList = [...pStats].sort((a, b) => {
      const scoreA = a.aces * 4 + a.firstServePointsWonPct * 0.5 + a.firstServePct * 0.3 - a.doubleFaults * 2;
      const scoreB = b.aces * 4 + b.firstServePointsWonPct * 0.5 + b.firstServePct * 0.3 - b.doubleFaults * 2;
      return scoreB - scoreA;
    });

    // Best Returner: break points won + return games won
    const returnerList = [...pStats].sort((a, b) => {
      const scoreA = a.breakPointsWon * 5 + a.returnGamesWon * 3 + a.breakPointsWonPct * 0.3;
      const scoreB = b.breakPointsWon * 5 + b.returnGamesWon * 3 + b.breakPointsWonPct * 0.3;
      return scoreB - scoreA;
    });

    // Best Performer: most total winners + total points won
    const performerList = [...pStats].sort((a, b) => {
      const scoreA = a.winners * 2 + a.totalPointsWon - a.unforcedErrors;
      const scoreB = b.winners * 2 + b.totalPointsWon - b.unforcedErrors;
      return scoreB - scoreA;
    });

    const topPotm = potmList[0];
    const topServer = serverList[0];
    const topReturner = returnerList[0];
    const topPerformer = performerList[0];

    const makeCandidate = (stat?: TennisPlayerStats, reason?: string): AwardCandidate | undefined => {
      if (!stat) return undefined;
      const pl = allPlayers.find((p) => p.id === stat.playerId);
      return {
        playerId: stat.playerId,
        playerName: stat.playerName,
        teamId: stat.teamId,
        teamName: stat.teamName,
        statSummary: `${stat.totalPointsWon} Pts, ${stat.aces} Aces, ${stat.breakPointsWon} Breaks`,
        points: stat.totalPointsWon,
        reason: reason || `${stat.totalPointsWon} total points won, ${stat.aces} aces`,
      };
    };

    return {
      suggestedPotm: makeCandidate(topPotm, `Outstanding performance with ${topPotm?.totalPointsWon} points, ${topPotm?.aces} aces, ${topPotm?.breakPointsWon} breaks`),
      suggestedServer: makeCandidate(topServer, `Dominant serving with ${topServer?.aces} aces, ${topServer?.firstServePointsWonPct.toFixed(1)}% 1st serve win rate`),
      suggestedReturner: makeCandidate(topReturner, `Clinical return play converting ${topReturner?.breakPointsWon} break points`),
      suggestedPerformer: makeCandidate(topPerformer, `High impact play hitting ${topPerformer?.winners} winners`),
    };
  };

  const { suggestedPotm, suggestedServer, suggestedReturner, suggestedPerformer } = calculateAwards();

  // Load saved awards if present
  let selectedPotm: AwardCandidate | undefined = suggestedPotm;
  let selectedServer: AwardCandidate | undefined = suggestedServer;
  let selectedReturner: AwardCandidate | undefined = suggestedReturner;
  let selectedPerformer: AwardCandidate | undefined = suggestedPerformer;

  if (savedAwards && savedAwards.length > 0) {
    const potmSaved = savedAwards.find((a) => a.awardType === 'MAN_OF_MATCH' || a.awardType === 'PLAYER_OF_MATCH');
    if (potmSaved) {
      const pl = allPlayers.find((p) => p.id === potmSaved.playerId);
      selectedPotm = {
        playerId: potmSaved.playerId,
        playerName: pl?.name || potmSaved.playerName || 'Player',
        teamId: potmSaved.teamId || '',
        teamName: potmSaved.teamName || '',
        reason: potmSaved.reason || '',
      };
    }
  }

  // Summary card stats
  const totalAces = validEvents.filter((e) => e.isAce || e.pointType === 'ACE').length;
  const totalDoubleFaults = validEvents.filter((e) => e.isDoubleFault || e.pointType === 'DOUBLE_FAULT').length;
  const totalBreakPointsConverted = validEvents.filter((e) => e.isBreakPointConverted).length;

  const winnerName = scoringState.winnerTeamId === teamAId ? actualTeamA.name : scoringState.winnerTeamId === teamBId ? actualTeamB.name : 'In Progress';
  const finalSetsText = `${scoringState.setsA} - ${scoringState.setsB} Sets (${finalSetScoreDisplay})`;

  const topScorerStat = [...scoringState.playerStats].sort((a, b) => b.totalPointsWon - a.totalPointsWon)[0];
  const topPerformerText = topScorerStat ? `${topScorerStat.playerName} (${topScorerStat.totalPointsWon} Pts, ${topScorerStat.aces} Aces)` : 'None';

  return {
    match,
    matchId: match.id,
    tournament,
    group,
    teamA: actualTeamA,
    teamB: actualTeamB,
    status: match.status as any,
    isFinalized: match.status === 'COMPLETED',
    matchResultText: scoringState.matchResultText || `Match in progress (${finalSetsText})`,
    winnerName,
    winnerTeamId: scoringState.winnerTeamId,
    setScores: scoringState.setScores,
    finalSetScoreDisplay,
    playerStats: scoringState.playerStats,
    teamAStats: scoringState.teamAStats,
    teamBStats: scoringState.teamBStats,
    pointTimeline: validEvents,
    gameTimeline,
    suggestedPlayerOfMatch: suggestedPotm,
    selectedPlayerOfMatch: selectedPotm,
    suggestedBestServer: suggestedServer,
    selectedBestServer: selectedServer,
    suggestedBestReturner: suggestedReturner,
    selectedBestReturner: selectedReturner,
    suggestedBestPerformer: suggestedPerformer,
    selectedBestPerformer: selectedPerformer,
    suggestedAwards: {
      playerOfTheMatch: suggestedPotm,
      bestServer: suggestedServer,
      bestReturner: suggestedReturner,
      bestPerformer: suggestedPerformer,
    },
    selectedAwards: {
      playerOfTheMatch: selectedPotm,
      bestServer: selectedServer,
      bestReturner: selectedReturner,
      bestPerformer: selectedPerformer,
    },
    squadsReport: {
      teamA: {
        team: actualTeamA,
        captain: capA,
        players: teamAPlayers,
      },
      teamB: {
        team: actualTeamB,
        captain: capB,
        players: teamBPlayers,
      },
    },
    officialsReport: match.officials || {},
    sponsorsReport: match.sponsors || {},
    summaryCards: {
      winnerName,
      finalSetsText,
      totalAces,
      totalDoubleFaults,
      totalBreakPointsConverted,
      topPerformerText,
      surfaceDisplay: rules.surface,
      courtDisplay: `${rules.courtName} (Court ${rules.courtNumber})`,
    },
  };
}
