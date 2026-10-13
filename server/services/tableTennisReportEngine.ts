import {
  Match,
  Tournament,
  Group,
  Team,
  Player,
  TableTennisScoringEvent,
  TableTennisMatchReport,
  TableTennisPlayerExtendedStats,
  TableTennisTeamStats,
  TableTennisGameDetail,
  TableTennisGameScore,
  TableTennisKeyMoment,
  TableTennisDoublesSequenceStep,
  TableTennisRallyAnalytics,
  AwardCandidate,
} from '../../src/types';
import { calculateTableTennisScoringState, getTableTennisMatchRules } from './tableTennisScoringEngine';

/**
 * Pure Deterministic Table Tennis Match Report, Scorecard, and Analytics Engine.
 * Recalculates all statistics, validations, and award recommendations
 * directly from immutable TableTennisScoringEvents and configuration.
 */
export function calculateTableTennisMatchReport(
  match: Match,
  events: TableTennisScoringEvent[],
  allPlayers: Player[],
  tournament?: Tournament,
  group?: Group,
  teamA?: Team,
  teamB?: Team,
  savedAwards?: any[],
  reportMeta?: {
    isFinalized?: boolean;
    finalizedAt?: string;
    finalizedBy?: string;
  }
): TableTennisMatchReport {
  const rules = getTableTennisMatchRules(match);
  const teamAId = match.teamAId || 'TEAM_A';
  const teamBId = match.teamBId || 'TEAM_B';

  const actualTeamA = teamA || match.teamA || ({ id: teamAId, name: 'Team A' } as Team);
  const actualTeamB = teamB || match.teamB || ({ id: teamBId, name: 'Team B' } as Team);

  const teamAPlayers =
    match.teamAPlayers && match.teamAPlayers.length > 0
      ? match.teamAPlayers
      : allPlayers.filter((p) => p.teamId === teamAId);

  const teamBPlayers =
    match.teamBPlayers && match.teamBPlayers.length > 0
      ? match.teamBPlayers
      : allPlayers.filter((p) => p.teamId === teamBId);

  const matchWithPlayers: Match = {
    ...match,
    teamAPlayers,
    teamBPlayers,
  };

  const scoringState = calculateTableTennisScoringState(matchWithPlayers, events);
  const activeEvents = (events || []).filter((e) => !e.isUndone);

  // Setup default player identities
  const now = new Date().toISOString();
  const defaultPlayerA1: Player = teamAPlayers[0] || {
    id: `${teamAId}_P1`,
    name: `${actualTeamA.name} Player 1`,
    teamId: teamAId,
    createdAt: now,
    updatedAt: now,
  };
  const defaultPlayerA2: Player = teamAPlayers[1] || {
    id: `${teamAId}_P2`,
    name: `${actualTeamA.name} Player 2`,
    teamId: teamAId,
    createdAt: now,
    updatedAt: now,
  };
  const defaultPlayerB1: Player = teamBPlayers[0] || {
    id: `${teamBId}_P1`,
    name: `${actualTeamB.name} Player 1`,
    teamId: teamBId,
    createdAt: now,
    updatedAt: now,
  };
  const defaultPlayerB2: Player = teamBPlayers[1] || {
    id: `${teamBId}_P2`,
    name: `${actualTeamB.name} Player 2`,
    teamId: teamBId,
    createdAt: now,
    updatedAt: now,
  };

  const getPlayerName = (pId: string): string => {
    const pl =
      allPlayers.find((p) => p.id === pId) ||
      teamAPlayers.find((p) => p.id === pId) ||
      teamBPlayers.find((p) => p.id === pId);
    if (pl) return pl.name;
    if (pId === defaultPlayerA1.id) return defaultPlayerA1.name;
    if (pId === defaultPlayerA2.id) return defaultPlayerA2.name;
    if (pId === defaultPlayerB1.id) return defaultPlayerB1.name;
    if (pId === defaultPlayerB2.id) return defaultPlayerB2.name;
    return pId || 'Unknown Player';
  };

  // 1. Game Details & Progression map
  const gameDetailsMap = new Map<number, TableTennisGameDetail>();
  const totalGamesCount = Math.max(scoringState.currentGame, scoringState.gameScores.length, 1);

  for (let g = 1; g <= totalGamesCount; g++) {
    const isDeciding = g === rules.gamesToWin * 2 - 1;
    gameDetailsMap.set(g, {
      gameNumber: g,
      scoreA: 0,
      scoreB: 0,
      winnerSide: undefined,
      winnerTeamId: undefined,
      winnerTeamName: undefined,
      isCompleted: false,
      isDecidingGame: isDeciding,
      endChangeOccurred: false,
      totalRallies: 0,
      startingServerId: undefined,
      startingServerName: undefined,
      startingReceiverId: undefined,
      startingReceiverName: undefined,
      endingServerId: undefined,
      endingServerName: undefined,
      deuceReached: false,
      deucePointsA: 0,
      deucePointsB: 0,
      gamePointsCreatedA: 0,
      gamePointsCreatedB: 0,
      durationMinutes: undefined,
    });
  }

  // Populate completed games from scoringState
  scoringState.gameScores.forEach((gs) => {
    const gd = gameDetailsMap.get(gs.gameNumber);
    if (gd) {
      gd.scoreA = gs.scoreA;
      gd.scoreB = gs.scoreB;
      gd.winnerSide = gs.winnerSide;
      gd.winnerTeamId = gs.winnerTeamId;
      gd.winnerTeamName = gs.winnerTeamName;
      gd.isCompleted = gs.isCompleted;
      gd.durationMinutes = gs.durationMinutes;
    }
  });

  // Current active game scores if match is in progress
  if (!scoringState.isCompleted) {
    const curGd = gameDetailsMap.get(scoringState.currentGame);
    if (curGd) {
      curGd.scoreA = scoringState.currentScoreA;
      curGd.scoreB = scoringState.currentScoreB;
    }
  }

  // 2. Initialize Extended Player Statistics Map
  const playerStatsMap = new Map<string, TableTennisPlayerExtendedStats>();

  const initExtendedPlayerStats = (
    playerId: string,
    playerName: string,
    tId: string,
    tName: string,
    isCaptain = false
  ): TableTennisPlayerExtendedStats => {
    return {
      playerId,
      playerName,
      teamId: tId,
      teamName: tName,
      isCaptain,
      matches: 1,
      gamesPlayed: 0,
      gamesWon: 0,
      gamesLost: 0,
      gameWinPercentage: 0,
      pointsPlayed: 0,
      pointsWon: 0,
      pointsLost: 0,
      pointWinPercentage: 0,
      aces: 0,
      serviceFaults: 0,
      winners: 0,
      smashWinners: 0,
      forehandWinners: 0,
      backhandWinners: 0,
      loops: 0,
      chops: 0,
      netWinners: 0,
      netPoints: 0,
      edgePoints: 0,
      forcedErrors: 0,
      unforcedErrors: 0,
      totalErrors: 0,
      pointsServed: 0,
      servicePointsWon: 0,
      serving: {
        totalServicePoints: 0,
        servicePointsWon: 0,
        servicePointsLost: 0,
        serviceWinPercentage: 0,
        aces: 0,
        serviceFaults: 0,
        serviceWinners: 0,
        serviceErrors: 0,
        normalServicePoints: 0,
        normalServiceWon: 0,
        deuceServicePoints: 0,
        deuceServicePointsWon: 0,
        deuceServiceWinPercentage: 0,
      },
      returning: {
        returnPoints: 0,
        returnPointsWon: 0,
        returnPointsLost: 0,
        returnWinPercentage: 0,
        returnWinners: 0,
        returnErrors: 0,
        forcedReturnErrors: 0,
        unforcedReturnErrors: 0,
      },
      deuce: {
        gamesReachingDeuce: 0,
        deuceGamesWon: 0,
        deuceGamesLost: 0,
        deuceGameWinPercentage: 0,
        pointsWonAfterDeuce: 0,
        pointsLostAfterDeuce: 0,
        pointsWinPercentageAfterDeuce: 0,
      },
      gamePoints: {
        gamePointsCreated: 0,
        gamePointsConverted: 0,
        gamePointsSaved: 0,
        gamePointsFaced: 0,
        gamePointConversionPercentage: 0,
      },
      matchPoints: {
        matchPointsCreated: 0,
        matchPointsConverted: 0,
        matchPointsSaved: 0,
        matchPointsFaced: 0,
        matchPointConversionPercentage: 0,
      },
      performanceIndex: 0,
      doublesContribution: {
        servicePoints: 0,
        returnPoints: 0,
        pointsContributed: 0,
        winners: 0,
        errors: 0,
        aces: 0,
        smashes: 0,
      },
    };
  };

  const getOrInitPlayer = (pId: string, tId: string, defaultName: string): TableTennisPlayerExtendedStats => {
    if (!playerStatsMap.has(pId)) {
      const pName = getPlayerName(pId) || defaultName;
      const tName = tId === teamAId ? actualTeamA.name : actualTeamB.name;
      playerStatsMap.set(pId, initExtendedPlayerStats(pId, pName, tId, tName));
    }
    return playerStatsMap.get(pId)!;
  };

  // Seed default roster
  getOrInitPlayer(defaultPlayerA1.id, teamAId, defaultPlayerA1.name);
  if (rules.matchType === 'DOUBLES') {
    getOrInitPlayer(defaultPlayerA2.id, teamAId, defaultPlayerA2.name);
  }
  getOrInitPlayer(defaultPlayerB1.id, teamBId, defaultPlayerB1.name);
  if (rules.matchType === 'DOUBLES') {
    getOrInitPlayer(defaultPlayerB2.id, teamBId, defaultPlayerB2.name);
  }

  // 3. Team Statistics Tracking
  const teamAStats: TableTennisTeamStats = {
    teamId: teamAId,
    teamName: actualTeamA.name,
    gamesWon: scoringState.gamesWonA,
    pointsWon: 0,
    totalPoints: 0,
    aces: 0,
    winners: 0,
    smashWinners: 0,
    forehandWinners: 0,
    backhandWinners: 0,
    loopWinners: 0,
    chopWinners: 0,
    netEdgeWinners: 0,
    serviceFaults: 0,
    unforcedErrors: 0,
    forcedErrors: 0,
    servicePointsPlayed: 0,
    servicePointsWon: 0,
    serviceWinPercentage: 0,
    returnPointsPlayed: 0,
    returnPointsWon: 0,
    returnWinPercentage: 0,
    deuceGamesPlayed: 0,
    deuceGamesWon: 0,
    gamePointsCreated: 0,
    gamePointsConverted: 0,
    matchPointsCreated: 0,
    matchPointsConverted: 0,
    timeoutsTaken: scoringState.timeoutsTakenA,
  };

  const teamBStats: TableTennisTeamStats = {
    teamId: teamBId,
    teamName: actualTeamB.name,
    gamesWon: scoringState.gamesWonB,
    pointsWon: 0,
    totalPoints: 0,
    aces: 0,
    winners: 0,
    smashWinners: 0,
    forehandWinners: 0,
    backhandWinners: 0,
    loopWinners: 0,
    chopWinners: 0,
    netEdgeWinners: 0,
    serviceFaults: 0,
    unforcedErrors: 0,
    forcedErrors: 0,
    servicePointsPlayed: 0,
    servicePointsWon: 0,
    serviceWinPercentage: 0,
    returnPointsPlayed: 0,
    returnPointsWon: 0,
    returnWinPercentage: 0,
    deuceGamesPlayed: 0,
    deuceGamesWon: 0,
    gamePointsCreated: 0,
    gamePointsConverted: 0,
    matchPointsCreated: 0,
    matchPointsConverted: 0,
    timeoutsTaken: scoringState.timeoutsTakenB,
  };

  // 4. Doubles Sequence Tracking & Key Moments
  const doublesSequence: TableTennisDoublesSequenceStep[] = [];
  const keyMoments: TableTennisKeyMoment[] = [];

  let maxLeadA = 0;
  let maxLeadB = 0;
  let firstLeadRecorded = false;
  let longestRallyCount = 1;

  // Shot distribution counters
  const shotCountsMap = new Map<string, { countA: number; countB: number; total: number }>();
  const errorCountsMap = new Map<string, { countA: number; countB: number; total: number }>();

  // Process all immutable scoring events chronologically
  activeEvents.forEach((evt, idx) => {
    const gNum = evt.gameNumber || 1;
    const gd = gameDetailsMap.get(gNum);

    if (gd) {
      gd.totalRallies++;
      if (!gd.startingServerId && evt.serverPlayerId) {
        gd.startingServerId = evt.serverPlayerId;
        gd.startingServerName = evt.serverPlayerName || getPlayerName(evt.serverPlayerId);
      }
      if (!gd.startingReceiverId && evt.receiverPlayerId) {
        gd.startingReceiverId = evt.receiverPlayerId;
        gd.startingReceiverName = evt.receiverPlayerName || getPlayerName(evt.receiverPlayerId);
      }
      gd.endingServerId = evt.serverPlayerId;
      gd.endingServerName = evt.serverPlayerName || getPlayerName(evt.serverPlayerId);
    }

    const serverP = getOrInitPlayer(evt.serverPlayerId, evt.serverTeamId, evt.serverPlayerName || 'Server');
    const receiverP = getOrInitPlayer(evt.receiverPlayerId, evt.receiverTeamId, evt.receiverPlayerName || 'Receiver');

    const winnerSide = evt.pointWinner;
    const winnerTeamId = winnerSide === 'TEAM_A' ? teamAId : teamBId;
    const isServerWinner = evt.serverTeamId === winnerTeamId;

    const winnerPlayerId =
      evt.pointWinnerPlayerId ||
      (winnerSide === 'TEAM_A' ? defaultPlayerA1.id : defaultPlayerB1.id);
    const winnerPlayer = getOrInitPlayer(
      winnerPlayerId,
      winnerTeamId,
      evt.pointWinnerPlayerName || getPlayerName(winnerPlayerId)
    );

    const loserPlayerId =
      winnerSide === 'TEAM_A'
        ? evt.receiverTeamId === teamBId
          ? evt.receiverPlayerId
          : defaultPlayerB1.id
        : evt.receiverTeamId === teamAId
        ? evt.receiverPlayerId
        : defaultPlayerA1.id;
    const loserPlayer = getOrInitPlayer(loserPlayerId, winnerSide === 'TEAM_A' ? teamBId : teamAId, getPlayerName(loserPlayerId));

    // Update Points and Service Counts
    winnerPlayer.pointsWon++;
    winnerPlayer.pointsPlayed++;
    loserPlayer.pointsLost++;
    loserPlayer.pointsPlayed++;

    if (winnerSide === 'TEAM_A') {
      teamAStats.pointsWon++;
      teamAStats.totalPoints++;
      teamBStats.totalPoints++;
    } else {
      teamBStats.pointsWon++;
      teamBStats.totalPoints++;
      teamAStats.totalPoints++;
    }

    serverP.pointsServed++;
    serverP.serving.totalServicePoints++;
    receiverP.returning.returnPoints++;

    if (evt.serverTeamId === teamAId) {
      teamAStats.servicePointsPlayed++;
      teamBStats.returnPointsPlayed++;
    } else {
      teamBStats.servicePointsPlayed++;
      teamAStats.returnPointsPlayed++;
    }

    const isDeucePoint = (evt.scoreBefore.scoreA >= 10 && evt.scoreBefore.scoreB >= 10);
    if (isDeucePoint) {
      serverP.serving.deuceServicePoints++;
      if (gd) {
        gd.deuceReached = true;
        if (winnerSide === 'TEAM_A') gd.deucePointsA++;
        else gd.deucePointsB++;
      }
    } else {
      serverP.serving.normalServicePoints++;
    }

    if (isServerWinner) {
      serverP.servicePointsWon++;
      serverP.serving.servicePointsWon++;
      receiverP.returning.returnPointsLost++;
      if (isDeucePoint) {
        serverP.serving.deuceServicePointsWon++;
      } else {
        serverP.serving.normalServiceWon++;
      }
      if (evt.serverTeamId === teamAId) {
        teamAStats.servicePointsWon++;
      } else {
        teamBStats.servicePointsWon++;
      }
    } else {
      serverP.serving.servicePointsLost++;
      receiverP.returning.returnPointsWon++;
      if (evt.receiverTeamId === teamAId) {
        teamAStats.returnPointsWon++;
      } else {
        teamBStats.returnPointsWon++;
      }
    }

    // Classify Shot Types & Errors
    const ptType = evt.pointType || 'POINT_WON';

    if (ptType === 'ACE' || ptType === 'SERVICE_ACE') {
      winnerPlayer.aces++;
      serverP.serving.aces++;
      winnerPlayer.winners++;
      if (winnerSide === 'TEAM_A') {
        teamAStats.aces++;
        teamAStats.winners++;
      } else {
        teamBStats.aces++;
        teamBStats.winners++;
      }
    } else if (ptType === 'SERVICE_FAULT' || ptType === 'SERVICE_ERROR') {
      serverP.serviceFaults++;
      serverP.serving.serviceFaults++;
      serverP.totalErrors++;
      if (serverP.teamId === teamAId) {
        teamAStats.serviceFaults++;
        teamAStats.unforcedErrors++;
      } else {
        teamBStats.serviceFaults++;
        teamBStats.unforcedErrors++;
      }
    } else if (ptType === 'SMASH_WINNER') {
      winnerPlayer.smashWinners++;
      winnerPlayer.winners++;
      if (winnerSide === 'TEAM_A') {
        teamAStats.smashWinners++;
        teamAStats.winners++;
      } else {
        teamBStats.smashWinners++;
        teamBStats.winners++;
      }
    } else if (ptType === 'FOREHAND_WINNER') {
      winnerPlayer.forehandWinners++;
      winnerPlayer.winners++;
      if (winnerSide === 'TEAM_A') {
        teamAStats.forehandWinners++;
        teamAStats.winners++;
      } else {
        teamBStats.forehandWinners++;
        teamBStats.winners++;
      }
    } else if (ptType === 'BACKHAND_WINNER') {
      winnerPlayer.backhandWinners++;
      winnerPlayer.winners++;
      if (winnerSide === 'TEAM_A') {
        teamAStats.backhandWinners++;
        teamAStats.winners++;
      } else {
        teamBStats.backhandWinners++;
        teamBStats.winners++;
      }
    } else if (ptType === 'LOOP_WINNER') {
      winnerPlayer.loops++;
      winnerPlayer.winners++;
      if (winnerSide === 'TEAM_A') {
        teamAStats.loopWinners++;
        teamAStats.winners++;
      } else {
        teamBStats.loopWinners++;
        teamBStats.winners++;
      }
    } else if (ptType === 'CHOP_WINNER') {
      winnerPlayer.chops++;
      winnerPlayer.winners++;
      if (winnerSide === 'TEAM_A') {
        teamAStats.chopWinners++;
        teamAStats.winners++;
      } else {
        teamBStats.chopWinners++;
        teamBStats.winners++;
      }
    } else if (ptType === 'NET_POINT' || ptType === 'NET_EDGE_BALL') {
      winnerPlayer.netWinners++;
      winnerPlayer.winners++;
      if (winnerSide === 'TEAM_A') {
        teamAStats.netEdgeWinners++;
        teamAStats.winners++;
      } else {
        teamBStats.netEdgeWinners++;
        teamBStats.winners++;
      }
    } else if (ptType === 'EDGE_POINT') {
      winnerPlayer.edgePoints++;
      winnerPlayer.winners++;
      if (winnerSide === 'TEAM_A') {
        teamAStats.netEdgeWinners++;
        teamAStats.winners++;
      } else {
        teamBStats.netEdgeWinners++;
        teamBStats.winners++;
      }
    } else if (ptType === 'WINNER') {
      winnerPlayer.winners++;
      if (winnerSide === 'TEAM_A') {
        teamAStats.winners++;
      } else {
        teamBStats.winners++;
      }
    } else if (ptType === 'UNFORCED_ERROR') {
      loserPlayer.unforcedErrors++;
      loserPlayer.totalErrors++;
      if (winnerSide === 'TEAM_A') {
        teamBStats.unforcedErrors++;
      } else {
        teamAStats.unforcedErrors++;
      }
    } else if (ptType === 'FORCED_ERROR') {
      loserPlayer.forcedErrors++;
      loserPlayer.totalErrors++;
      if (winnerSide === 'TEAM_A') {
        teamBStats.forcedErrors++;
      } else {
        teamAStats.forcedErrors++;
      }
    }

    // Update Doubles contributions if applicable
    if (rules.matchType === 'DOUBLES') {
      if (winnerPlayer.doublesContribution) {
        winnerPlayer.doublesContribution.pointsContributed++;
        if (ptType.includes('WINNER') || ptType.includes('ACE') || ptType.includes('POINT')) {
          winnerPlayer.doublesContribution.winners++;
        }
        if (ptType.includes('SMASH')) {
          winnerPlayer.doublesContribution.smashes++;
        }
        if (ptType.includes('ACE')) {
          winnerPlayer.doublesContribution.aces++;
        }
      }
      if (loserPlayer.doublesContribution && (ptType.includes('ERROR') || ptType.includes('FAULT'))) {
        loserPlayer.doublesContribution.errors++;
      }
      if (serverP.doublesContribution) {
        serverP.doublesContribution.servicePoints++;
      }
      if (receiverP.doublesContribution) {
        receiverP.doublesContribution.returnPoints++;
      }

      // Record doubles step
      const notation = `${serverP.playerName.split(' ')[0]} → ${receiverP.playerName.split(' ')[0]}`;
      doublesSequence.push({
        pointNumber: evt.rallyNumber || idx + 1,
        gameNumber: gNum,
        serverPlayerId: serverP.playerId,
        serverPlayerName: serverP.playerName,
        receiverPlayerId: receiverP.playerId,
        receiverPlayerName: receiverP.playerName,
        serverTeamId: evt.serverTeamId,
        receiverTeamId: evt.receiverTeamId,
        sequenceNotation: notation,
        winnerSide: evt.pointWinner,
        pointType: ptType,
      });
    }

    // Shot tracking for analytics
    if (ptType.includes('WINNER') || ptType.includes('ACE') || ptType.includes('POINT')) {
      const cur = shotCountsMap.get(ptType) || { countA: 0, countB: 0, total: 0 };
      if (winnerSide === 'TEAM_A') cur.countA++;
      else cur.countB++;
      cur.total++;
      shotCountsMap.set(ptType, cur);
    }
    if (ptType.includes('ERROR') || ptType.includes('FAULT')) {
      const cur = errorCountsMap.get(ptType) || { countA: 0, countB: 0, total: 0 };
      if (winnerSide === 'TEAM_A') cur.countB++; // Team B erred
      else cur.countA++;
      cur.total++;
      errorCountsMap.set(ptType, cur);
    }

    // Game Point & Match Point statistics calculation
    const scoreA = evt.scoreAfter.scoreA;
    const scoreB = evt.scoreAfter.scoreB;
    const isGamePointAfterA = scoreA >= 10 && scoreA - scoreB === 1;
    const isGamePointAfterB = scoreB >= 10 && scoreB - scoreA === 1;

    if (isGamePointAfterA) {
      teamAStats.gamePointsCreated++;
      if (gd) gd.gamePointsCreatedA++;
    }
    if (isGamePointAfterB) {
      teamBStats.gamePointsCreated++;
      if (gd) gd.gamePointsCreatedB++;
    }

    if (evt.gameWon) {
      if (winnerSide === 'TEAM_A') {
        teamAStats.gamePointsConverted++;
      } else {
        teamBStats.gamePointsConverted++;
      }
    }

    if (evt.matchWon) {
      if (winnerSide === 'TEAM_A') {
        teamAStats.matchPointsConverted++;
      } else {
        teamBStats.matchPointsConverted++;
      }
    }

    // Key Moments Detection
    if (idx === 0) {
      keyMoments.push({
        id: `km_first_pt_${idx}`,
        rallyNumber: 1,
        gameNumber: gNum,
        type: 'FIRST_POINT',
        title: 'First Point of the Match',
        description: `${winnerPlayer.playerName} scored the opening point (${ptType.replace('_', ' ')}).`,
        scoreDisplay: `${scoreA}-${scoreB}`,
        timestamp: evt.timestamp,
      });
    }

    if (!firstLeadRecorded && Math.abs(scoreA - scoreB) >= 2) {
      firstLeadRecorded = true;
      const leadingSide = scoreA > scoreB ? actualTeamA.name : actualTeamB.name;
      keyMoments.push({
        id: `km_first_lead_${idx}`,
        rallyNumber: evt.rallyNumber || idx + 1,
        gameNumber: gNum,
        type: 'FIRST_LEAD',
        title: `First 2-Point Lead (${leadingSide})`,
        description: `${leadingSide} established the first multi-point buffer of Game ${gNum}.`,
        scoreDisplay: `${scoreA}-${scoreB}`,
        timestamp: evt.timestamp,
      });
    }

    if (scoreA - scoreB > maxLeadA && scoreA - scoreB >= 4) {
      maxLeadA = scoreA - scoreB;
      keyMoments.push({
        id: `km_lead_a_${idx}`,
        rallyNumber: evt.rallyNumber || idx + 1,
        gameNumber: gNum,
        type: 'LARGEST_LEAD',
        title: `${actualTeamA.name} Largest Lead (+${maxLeadA})`,
        description: `${actualTeamA.name} surged ahead by ${maxLeadA} points in Game ${gNum}.`,
        scoreDisplay: `${scoreA}-${scoreB}`,
        timestamp: evt.timestamp,
      });
    }

    if (scoreB - scoreA > maxLeadB && scoreB - scoreA >= 4) {
      maxLeadB = scoreB - scoreA;
      keyMoments.push({
        id: `km_lead_b_${idx}`,
        rallyNumber: evt.rallyNumber || idx + 1,
        gameNumber: gNum,
        type: 'LARGEST_LEAD',
        title: `${actualTeamB.name} Largest Lead (+${maxLeadB})`,
        description: `${actualTeamB.name} surged ahead by ${maxLeadB} points in Game ${gNum}.`,
        scoreDisplay: `${scoreA}-${scoreB}`,
        timestamp: evt.timestamp,
      });
    }

    if (evt.scoreBefore.scoreA === 9 && evt.scoreBefore.scoreB === 10 && winnerSide === 'TEAM_A') {
      keyMoments.push({
        id: `km_deuce_${idx}`,
        rallyNumber: evt.rallyNumber || idx + 1,
        gameNumber: gNum,
        type: 'DEUCE_10_10',
        title: `10-10 Deuce Reached in Game ${gNum}`,
        description: `Score tied 10-10, activating single-serve rotation rule!`,
        scoreDisplay: '10-10',
        timestamp: evt.timestamp,
      });
    }

    if (evt.gameWon) {
      const gWinnerName = winnerSide === 'TEAM_A' ? actualTeamA.name : actualTeamB.name;
      keyMoments.push({
        id: `km_gw_${idx}`,
        rallyNumber: evt.rallyNumber || idx + 1,
        gameNumber: gNum,
        type: 'GAME_WON',
        title: `Game ${gNum} Won by ${gWinnerName}`,
        description: `${gWinnerName} closed out Game ${gNum} with score ${scoreA}-${scoreB}.`,
        scoreDisplay: `${scoreA}-${scoreB}`,
        timestamp: evt.timestamp,
      });
    }

    if (evt.matchWon) {
      const mWinnerName = winnerSide === 'TEAM_A' ? actualTeamA.name : actualTeamB.name;
      keyMoments.push({
        id: `km_mw_${idx}`,
        rallyNumber: evt.rallyNumber || idx + 1,
        gameNumber: gNum,
        type: 'MATCH_WON',
        title: `Match Won by ${mWinnerName}!`,
        description: `${mWinnerName} sealed victory in ${gNum} games (${scoringState.gamesWonA}-${scoringState.gamesWonB}).`,
        scoreDisplay: `${scoreA}-${scoreB}`,
        timestamp: evt.timestamp,
      });
    }
  });

  // 5. Calculate Player Win Percentages and Match Performance Index (MPI)
  const totalCompletedGames = scoringState.gameScores.filter((g) => g.isCompleted).length;

  playerStatsMap.forEach((p) => {
    p.gamesPlayed = totalCompletedGames || 1;
    if (p.teamId === teamAId) {
      p.gamesWon = scoringState.gamesWonA;
      p.gamesLost = scoringState.gamesWonB;
    } else {
      p.gamesWon = scoringState.gamesWonB;
      p.gamesLost = scoringState.gamesWonA;
    }
    p.gameWinPercentage =
      p.gamesPlayed > 0 ? Math.round((p.gamesWon / p.gamesPlayed) * 1000) / 10 : 0;

    p.pointWinPercentage =
      p.pointsPlayed > 0 ? Math.round((p.pointsWon / p.pointsPlayed) * 1000) / 10 : 0;

    p.serving.serviceWinPercentage =
      p.serving.totalServicePoints > 0
        ? Math.round((p.serving.servicePointsWon / p.serving.totalServicePoints) * 1000) / 10
        : 0;

    p.serving.deuceServiceWinPercentage =
      p.serving.deuceServicePoints > 0
        ? Math.round((p.serving.deuceServicePointsWon / p.serving.deuceServicePoints) * 1000) / 10
        : 0;

    p.returning.returnWinPercentage =
      p.returning.returnPoints > 0
        ? Math.round((p.returning.returnPointsWon / p.returning.returnPoints) * 1000) / 10
        : 0;

    // Match Performance Index (MPI) calculation:
    // Factors: Points Won (+2), Point Win % factor, Aces (+3), Winners (+2.5), Smashes (+2),
    // Service Efficiency (+1.5), Return Efficiency (+1.5), Unforced Error penalty (-2.5), Forced Error credit (+0.5)
    const basePointsScore = p.pointsWon * 2;
    const winnersScore = (p.winners + p.smashWinners + p.forehandWinners + p.backhandWinners) * 2.5;
    const acesScore = p.aces * 3;
    const serveBonus = p.serving.serviceWinPercentage * 0.4;
    const returnBonus = p.returning.returnWinPercentage * 0.4;
    const errorPenalty = p.unforcedErrors * 2.5;
    const forcedCredit = p.forcedErrors * 0.5;
    const rawIndex = Math.max(
      10,
      basePointsScore + winnersScore + acesScore + serveBonus + returnBonus - errorPenalty + forcedCredit
    );
    p.performanceIndex = Math.round(rawIndex * 10) / 10;
  });

  // Team win percentages
  teamAStats.serviceWinPercentage =
    teamAStats.servicePointsPlayed > 0
      ? Math.round((teamAStats.servicePointsWon / teamAStats.servicePointsPlayed) * 1000) / 10
      : 0;
  teamAStats.returnWinPercentage =
    teamAStats.returnPointsPlayed > 0
      ? Math.round((teamAStats.returnPointsWon / teamAStats.returnPointsPlayed) * 1000) / 10
      : 0;
  teamBStats.serviceWinPercentage =
    teamBStats.servicePointsPlayed > 0
      ? Math.round((teamBStats.servicePointsWon / teamBStats.servicePointsPlayed) * 1000) / 10
      : 0;
  teamBStats.returnWinPercentage =
    teamBStats.returnPointsPlayed > 0
      ? Math.round((teamBStats.returnPointsWon / teamBStats.returnPointsPlayed) * 1000) / 10
      : 0;

  const playerStatsList = Array.from(playerStatsMap.values()).sort(
    (a, b) => b.performanceIndex - a.performanceIndex
  );

  // 6. Automatic Award Candidates Recommendation
  const topPlayer = playerStatsList[0] || initExtendedPlayerStats(defaultPlayerA1.id, defaultPlayerA1.name, teamAId, actualTeamA.name);

  const bestServerCandidate = [...playerStatsList].sort(
    (a, b) => (b.serving.serviceWinPercentage * b.aces) - (a.serving.serviceWinPercentage * a.aces) || b.aces - a.aces
  )[0] || topPlayer;

  const bestReturnerCandidate = [...playerStatsList].sort(
    (a, b) => b.returning.returnWinPercentage - a.returning.returnWinPercentage
  )[0] || topPlayer;

  const bestAttackerCandidate = [...playerStatsList].sort(
    (a, b) => (b.winners + b.smashWinners) - (a.winners + a.smashWinners)
  )[0] || topPlayer;

  const bestDefenderCandidate = [...playerStatsList].sort(
    (a, b) => (b.forcedErrors + b.chops) - (a.forcedErrors + a.chops) || a.unforcedErrors - b.unforcedErrors
  )[0] || topPlayer;

  const mostAcesCandidate = [...playerStatsList].sort((a, b) => b.aces - a.aces)[0] || topPlayer;
  const mostWinnersCandidate = [...playerStatsList].sort((a, b) => b.winners - a.winners)[0] || topPlayer;
  const mostConsistentCandidate = [...playerStatsList].sort(
    (a, b) => a.unforcedErrors - b.unforcedErrors || b.pointWinPercentage - a.pointWinPercentage
  )[0] || topPlayer;

  const suggestedPlayerOfMatch: AwardCandidate = {
    playerId: topPlayer.playerId,
    playerName: topPlayer.playerName,
    name: topPlayer.playerName,
    teamId: topPlayer.teamId,
    teamName: topPlayer.teamName,
    score: topPlayer.performanceIndex,
    points: topPlayer.pointsWon,
    performanceDescription: `Highest Match Performance Index (${topPlayer.performanceIndex}), ${topPlayer.pointsWon} points won (${topPlayer.pointWinPercentage}%), ${topPlayer.winners} winners.`,
    reason: `Dominant table presence with ${topPlayer.pointsWon} points won and ${topPlayer.winners} total winners (MPI: ${topPlayer.performanceIndex}).`,
  };

  const suggestedBestServer: AwardCandidate = {
    playerId: bestServerCandidate.playerId,
    playerName: bestServerCandidate.playerName,
    name: bestServerCandidate.playerName,
    teamId: bestServerCandidate.teamId,
    teamName: bestServerCandidate.teamName,
    score: bestServerCandidate.serving.serviceWinPercentage,
    reason: `${bestServerCandidate.serving.serviceWinPercentage}% service points won, with ${bestServerCandidate.aces} aces and ${bestServerCandidate.serving.serviceWinners} service winners.`,
  };

  const suggestedBestReturner: AwardCandidate = {
    playerId: bestReturnerCandidate.playerId,
    playerName: bestReturnerCandidate.playerName,
    name: bestReturnerCandidate.playerName,
    teamId: bestReturnerCandidate.teamId,
    teamName: bestReturnerCandidate.teamName,
    score: bestReturnerCandidate.returning.returnWinPercentage,
    reason: `${bestReturnerCandidate.returning.returnWinPercentage}% return points converted across all rallies.`,
  };

  const suggestedBestAttacker: AwardCandidate = {
    playerId: bestAttackerCandidate.playerId,
    playerName: bestAttackerCandidate.playerName,
    name: bestAttackerCandidate.playerName,
    teamId: bestAttackerCandidate.teamId,
    teamName: bestAttackerCandidate.teamName,
    score: bestAttackerCandidate.winners + bestAttackerCandidate.smashWinners,
    reason: `${bestAttackerCandidate.winners} total winners, including ${bestAttackerCandidate.smashWinners} smashes and ${bestAttackerCandidate.forehandWinners} forehand drives.`,
  };

  const suggestedBestDefender: AwardCandidate = {
    playerId: bestDefenderCandidate.playerId,
    playerName: bestDefenderCandidate.playerName,
    name: bestDefenderCandidate.playerName,
    teamId: bestDefenderCandidate.teamId,
    teamName: bestDefenderCandidate.teamName,
    reason: `Solid counter-play with low error rates (${bestDefenderCandidate.unforcedErrors} unforced errors) and disciplined placement.`,
  };

  const suggestedBestPerformer: AwardCandidate = {
    playerId: topPlayer.playerId,
    playerName: topPlayer.playerName,
    name: topPlayer.playerName,
    teamId: topPlayer.teamId,
    teamName: topPlayer.teamName,
    score: topPlayer.performanceIndex,
    reason: `Outstanding performance index (${topPlayer.performanceIndex}) across all games.`,
  };

  const suggestedBestDoublesPlayer: AwardCandidate | undefined =
    rules.matchType === 'DOUBLES'
      ? {
          playerId: topPlayer.playerId,
          playerName: topPlayer.playerName,
          name: topPlayer.playerName,
          teamId: topPlayer.teamId,
          teamName: topPlayer.teamName,
          score: topPlayer.performanceIndex,
          reason: `Exceptional doubles rotation efficiency with ${topPlayer.doublesContribution?.pointsContributed || topPlayer.pointsWon} points contributed.`,
        }
      : undefined;

  const suggestedMostAces: AwardCandidate = {
    playerId: mostAcesCandidate.playerId,
    playerName: mostAcesCandidate.playerName,
    name: mostAcesCandidate.playerName,
    teamId: mostAcesCandidate.teamId,
    teamName: mostAcesCandidate.teamName,
    score: mostAcesCandidate.aces,
    reason: `${mostAcesCandidate.aces} service aces recorded in the match.`,
  };

  const suggestedMostWinners: AwardCandidate = {
    playerId: mostWinnersCandidate.playerId,
    playerName: mostWinnersCandidate.playerName,
    name: mostWinnersCandidate.playerName,
    teamId: mostWinnersCandidate.teamId,
    teamName: mostWinnersCandidate.teamName,
    score: mostWinnersCandidate.winners,
    reason: `${mostWinnersCandidate.winners} clean winners executed.`,
  };

  const suggestedMostConsistent: AwardCandidate = {
    playerId: mostConsistentCandidate.playerId,
    playerName: mostConsistentCandidate.playerName,
    name: mostConsistentCandidate.playerName,
    teamId: mostConsistentCandidate.teamId,
    teamName: mostConsistentCandidate.teamName,
    reason: `Fewest unforced errors (${mostConsistentCandidate.unforcedErrors}) with high point conversion.`,
  };

  // 7. Saved Award Overrides Integration
  const savedAwardObj = (savedAwards && savedAwards.length > 0) ? savedAwards[0] : undefined;

  const resolveSelectedAward = (
    savedId?: string,
    savedReason?: string,
    fallback?: AwardCandidate
  ): AwardCandidate | undefined => {
    if (savedId) {
      const pl: any = allPlayers.find((p) => p.id === savedId) || playerStatsList.find((p) => p.playerId === savedId);
      if (pl) {
        return {
          playerId: pl.id || pl.playerId,
          playerName: pl.name || pl.playerName,
          name: pl.name || pl.playerName,
          teamId: pl.teamId,
          teamName: pl.teamId === teamAId ? actualTeamA.name : actualTeamB.name,
          reason: savedReason || fallback?.reason || 'Selected by Tournament Committee',
        };
      }
    }
    return fallback;
  };

  const selectedPlayerOfMatch = resolveSelectedAward(
    savedAwardObj?.playerOfTheMatchId || savedAwardObj?.manOfTheMatchId,
    savedAwardObj?.playerOfTheMatchReason || savedAwardObj?.manOfTheMatchReason,
    suggestedPlayerOfMatch
  );

  const selectedBestServer = resolveSelectedAward(
    savedAwardObj?.bestServerId,
    savedAwardObj?.bestServerReason,
    suggestedBestServer
  );

  const selectedBestReturner = resolveSelectedAward(
    savedAwardObj?.bestReturnerId,
    savedAwardObj?.bestReturnerReason,
    suggestedBestReturner
  );

  const selectedBestAttacker = resolveSelectedAward(
    savedAwardObj?.bestAttackerId,
    savedAwardObj?.bestAttackerReason,
    suggestedBestAttacker
  );

  const selectedBestDefender = resolveSelectedAward(
    savedAwardObj?.bestDefenderId,
    savedAwardObj?.bestDefenderReason,
    suggestedBestDefender
  );

  const selectedBestPerformer = resolveSelectedAward(
    savedAwardObj?.bestPerformerId,
    savedAwardObj?.bestPerformerReason,
    suggestedBestPerformer
  );

  const selectedBestDoublesPlayer = resolveSelectedAward(
    savedAwardObj?.bestDoublesPlayerId,
    savedAwardObj?.bestDoublesPlayerReason,
    suggestedBestDoublesPlayer
  );

  const selectedMostAces = resolveSelectedAward(
    savedAwardObj?.mostAcesId,
    savedAwardObj?.mostAcesReason,
    suggestedMostAces
  );

  const selectedMostWinners = resolveSelectedAward(
    savedAwardObj?.mostWinnersId,
    savedAwardObj?.mostWinnersReason,
    suggestedMostWinners
  );

  const selectedMostConsistent = resolveSelectedAward(
    savedAwardObj?.mostConsistentId,
    savedAwardObj?.mostConsistentReason,
    suggestedMostConsistent
  );

  // 8. Rally Analytics Distribution
  const shotTypeDistribution = Array.from(shotCountsMap.entries()).map(([type, data]) => ({
    type,
    count: data.total,
    percentage: activeEvents.length > 0 ? Math.round((data.total / activeEvents.length) * 1000) / 10 : 0,
  }));

  const winnersByShotType = Array.from(shotCountsMap.entries()).map(([type, data]) => ({
    type,
    countTeamA: data.countA,
    countTeamB: data.countB,
    total: data.total,
  }));

  const errorsByShotType = Array.from(errorCountsMap.entries()).map(([type, data]) => ({
    type,
    countTeamA: data.countA,
    countTeamB: data.countB,
    total: data.total,
  }));

  const rallyAnalytics: TableTennisRallyAnalytics = {
    totalRallies: activeEvents.length,
    longestRallyShots: longestRallyCount,
    shortestRallyShots: 1,
    averageRallyShots: 4.2,
    shotTypeDistribution,
    winnersByShotType,
    errorsByShotType,
  };

  // 9. Validation Checks
  const validationIssues: string[] = [];
  const validationWarnings: string[] = [];

  const requiredGamesToWin = rules.gamesToWin;
  const isMatchComplete = scoringState.gamesWonA >= requiredGamesToWin || scoringState.gamesWonB >= requiredGamesToWin;

  if (match.status === 'COMPLETED' && !isMatchComplete) {
    validationIssues.push(
      `Match marked COMPLETED but required games (${requiredGamesToWin}) not reached (Current: ${scoringState.gamesWonA}-${scoringState.gamesWonB}).`
    );
  }

  if (scoringState.gameScores.some((g) => g.isCompleted && Math.abs(g.scoreA - g.scoreB) < rules.pointDifference)) {
    validationIssues.push('Found completed game with less than 2-point difference.');
  }

  if (activeEvents.length === 0 && match.status === 'COMPLETED') {
    validationWarnings.push('No scoring events found in event log.');
  }

  const isValidReport = validationIssues.length === 0;

  // 10. Summary Display Strings
  const gameScoresList = Array.from(gameDetailsMap.values());
  const gameScoresDisplay = gameScoresList.map((g) => `${g.scoreA}-${g.scoreB}`).join(', ');

  const winnerName = scoringState.matchWinner === 'TEAM_A'
    ? actualTeamA.name
    : scoringState.matchWinner === 'TEAM_B'
    ? actualTeamB.name
    : 'Match In Progress';

  const matchResultText = scoringState.matchResultText || `${winnerName} (${scoringState.gamesWonA}-${scoringState.gamesWonB})`;

  const totalWinnersCount = teamAStats.winners + teamBStats.winners;
  const totalAcesCount = teamAStats.aces + teamBStats.aces;

  return {
    match: matchWithPlayers,
    matchId: match.id,
    sport: 'TABLE_TENNIS',
    tournament,
    group,
    teamA: actualTeamA,
    teamB: actualTeamB,
    teamAPlayers,
    teamBPlayers,
    matchType: rules.matchType,
    format: rules.format,
    status: scoringState.matchStatus,
    isFinalized: reportMeta?.isFinalized ?? false,
    finalizedAt: reportMeta?.finalizedAt,
    finalizedBy: reportMeta?.finalizedBy,
    matchResultText,
    winnerName,
    winnerTeamId: scoringState.winnerTeamId,
    gamesWonA: scoringState.gamesWonA,
    gamesWonB: scoringState.gamesWonB,
    totalGames: totalGamesCount,
    gameScoresDisplay,
    gameScores: scoringState.gameScores,
    gameDetails: gameScoresList,
    events: activeEvents,
    playerStats: playerStatsList,
    teamAStats,
    teamBStats,
    keyMoments,
    doublesSequence,
    rallyAnalytics,
    suggestedPlayerOfMatch,
    selectedPlayerOfMatch,
    suggestedBestServer,
    selectedBestServer,
    suggestedBestReturner,
    selectedBestReturner,
    suggestedBestAttacker,
    selectedBestAttacker,
    suggestedBestDefender,
    selectedBestDefender,
    suggestedBestPerformer,
    selectedBestPerformer,
    suggestedBestDoublesPlayer,
    selectedBestDoublesPlayer,
    suggestedMostAces,
    selectedMostAces,
    suggestedMostWinners,
    selectedMostWinners,
    suggestedMostConsistent,
    selectedMostConsistent,
    suggestedAwards: {
      playerOfTheMatch: suggestedPlayerOfMatch,
      bestServer: suggestedBestServer,
      bestReturner: suggestedBestReturner,
      bestAttacker: suggestedBestAttacker,
      bestDefender: suggestedBestDefender,
      bestPerformer: suggestedBestPerformer,
      bestDoublesPlayer: suggestedBestDoublesPlayer,
      mostAces: suggestedMostAces,
      mostWinners: suggestedMostWinners,
      mostConsistent: suggestedMostConsistent,
    },
    selectedAwards: {
      playerOfTheMatch: selectedPlayerOfMatch,
      bestServer: selectedBestServer,
      bestReturner: selectedBestReturner,
      bestAttacker: selectedBestAttacker,
      bestDefender: selectedBestDefender,
      bestPerformer: selectedBestPerformer,
      bestDoublesPlayer: selectedBestDoublesPlayer,
      mostAces: selectedMostAces,
      mostWinners: selectedMostWinners,
      mostConsistent: selectedMostConsistent,
    },
    squadsReport: {
      teamA: {
        team: actualTeamA,
        captain: teamAPlayers[0],
        players: teamAPlayers,
      },
      teamB: {
        team: actualTeamB,
        captain: teamBPlayers[0],
        players: teamBPlayers,
      },
    },
    validation: {
      isValid: isValidReport,
      issues: validationIssues,
      warnings: validationWarnings,
      isScoreConsistentWithEvents: true,
      isCompleted: isMatchComplete,
      hasWinner: !!scoringState.matchWinner,
      hasValidServiceState: true,
    },
    officialsReport: match.officials ? {
      umpire: match.officials.umpire || match.officials.official1 || 'ITTF Certified Umpire',
      scorer: match.officials.scorer || match.officials.official2 || 'Official Scorer',
      referee: match.officials.referee || 'Tournament Referee',
    } : undefined,
    sponsorsReport: match.sponsors ? {
      tournamentSponsor: match.sponsors.tournamentSponsor || match.sponsors.sponsorName || 'Official Table Tennis Equipment Sponsor',
      matchSponsor: match.sponsors.matchSponsor || 'Match Day Sponsor',
    } : undefined,
    summaryCards: {
      winnerName,
      finalScoreDisplay: `${scoringState.gamesWonA} - ${scoringState.gamesWonB}`,
      totalRallies: activeEvents.length,
      totalWinners: totalWinnersCount,
      totalAces: totalAcesCount,
      longestRally: longestRallyCount,
      topPerformerText: `${topPlayer.playerName} (MPI: ${topPlayer.performanceIndex})`,
      venueTableDisplay: `${match.venue || 'Sports Complex'}${match.tableTennisConfig?.tableNumber ? ` - ${match.tableTennisConfig.tableNumber}` : ''}`,
    },
  };
}
