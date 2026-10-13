import {
  Match,
  Player,
  TableTennisMatchConfig,
  TableTennisScoringEvent,
  TableTennisGameScore,
  TableTennisPlayerStats,
  TableTennisMatchScoringState,
  TableTennisPointType,
} from '../../src/types';

export interface TableTennisMatchRules {
  matchType: 'SINGLES' | 'DOUBLES';
  format: 'BEST_OF_1' | 'BEST_OF_3' | 'BEST_OF_5' | 'BEST_OF_7';
  gamesToWin: number;
  pointsPerGame: number;
  pointDifference: number;
  serviceRotation: number;
  deuceServiceRotation: number;
  decidingGamePoints: number;
  decidingGameEndChangePoint: number;
  maxTimeoutsPerSide: number;
  timeoutDurationSeconds: number;
  tableNumber: string;
  venue: string;
}

export function getTableTennisMatchRules(match: Match): TableTennisMatchRules {
  const cfg = match.tableTennisConfig;
  const matchType = (cfg?.matchType || 'SINGLES') as 'SINGLES' | 'DOUBLES';
  const format = (cfg?.format || 'BEST_OF_3') as 'BEST_OF_1' | 'BEST_OF_3' | 'BEST_OF_5' | 'BEST_OF_7';
  const gamesToWin = format === 'BEST_OF_1' ? 1 : format === 'BEST_OF_7' ? 4 : format === 'BEST_OF_5' ? 3 : 2;
  const pointsPerGame = Number(cfg?.pointsPerGame) || 11;
  const pointDifference = Number(cfg?.pointDifference) || 2;
  const serviceRotation = Number(cfg?.serviceRotation) || 2;
  const deuceServiceRotation = Number(cfg?.deuceServiceRotation) || 1;
  const decidingGamePoints = Number(cfg?.decidingGamePoints) || pointsPerGame;
  const decidingGameEndChangePoint = Number(cfg?.decidingGameEndChangePoint) || 5;
  const maxTimeoutsPerSide = Number(cfg?.maxTimeoutsPerSide) || 1;
  const timeoutDurationSeconds = Number(cfg?.timeoutDurationSeconds) || 60;
  const tableNumber = cfg?.tableNumber || match.venue || 'Table 1';
  const venue = cfg?.venue || match.venue || 'Sports Arena';

  return {
    matchType,
    format,
    gamesToWin,
    pointsPerGame,
    pointDifference,
    serviceRotation,
    deuceServiceRotation,
    decidingGamePoints,
    decidingGameEndChangePoint,
    maxTimeoutsPerSide,
    timeoutDurationSeconds,
    tableNumber,
    venue,
  };
}

/**
 * Initialize player/team statistics for Table Tennis
 */
export function createDefaultTableTennisPlayerStats(
  playerId: string,
  playerName: string,
  teamId: string,
  teamName: string,
  player?: Player
): TableTennisPlayerStats {
  return {
    playerId,
    playerName,
    teamId,
    teamName,
    isCaptain: player?.isCaptain || false,
    country: player?.country || '',
    photoUrl: player?.photoUrl || '',
    pointsWon: 0,
    pointsServed: 0,
    servicePointsWon: 0,
    aces: 0,
    winners: 0,
    edgePoints: 0,
    netPoints: 0,
    serviceFaults: 0,
    unforcedErrors: 0,
    forcedErrors: 0,
    totalErrors: 0,
    gamesPlayed: 0,
    gamesWon: 0,
  };
}

/**
 * Pure Deterministic Calculation of Table Tennis Match Scoring State
 * Reconstructed immutably from the list of TableTennisScoringEvent items.
 */
export function calculateTableTennisScoringState(
  match: Match,
  events: TableTennisScoringEvent[],
  customStartingServer?: {
    teamId?: string;
    playerId?: string;
    receiverTeamId?: string;
    receiverPlayerId?: string;
  }
): TableTennisMatchScoringState {
  const rules = getTableTennisMatchRules(match);
  const teamA = match.teamA;
  const teamB = match.teamB;

  const teamAPlayers: Player[] = match.teamAPlayers || [];
  const teamBPlayers: Player[] = match.teamBPlayers || [];

  const teamAId = match.teamAId || 'TEAM_A';
  const teamBId = match.teamBId || 'TEAM_B';

  const defaultPlayerA1: Player = teamAPlayers[0] || {
    id: `${teamAId}_P1`,
    name: teamA?.name ? `${teamA.name} Player 1` : 'Player A1',
    teamId: teamAId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const defaultPlayerA2: Player = teamAPlayers[1] || {
    id: `${teamAId}_P2`,
    name: teamA?.name ? `${teamA.name} Player 2` : 'Player A2',
    teamId: teamAId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const defaultPlayerB1: Player = teamBPlayers[0] || {
    id: `${teamBId}_P1`,
    name: teamB?.name ? `${teamB.name} Player 1` : 'Player B1',
    teamId: teamBId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const defaultPlayerB2: Player = teamBPlayers[1] || {
    id: `${teamBId}_P2`,
    name: teamB?.name ? `${teamB.name} Player 2` : 'Player B2',
    teamId: teamBId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Initial Server & Receiver determination
  const firstServerTeamId = customStartingServer?.teamId || match.tableTennisConfig?.firstServerTeamId || teamAId;
  const firstServerSide: 'TEAM_A' | 'TEAM_B' = firstServerTeamId === teamBId ? 'TEAM_B' : 'TEAM_A';
  const firstServerPlayerId = customStartingServer?.playerId || match.tableTennisConfig?.firstServerPlayerId || (firstServerSide === 'TEAM_A' ? defaultPlayerA1.id : defaultPlayerB1.id);

  const firstReceiverTeamId = customStartingServer?.receiverTeamId || match.tableTennisConfig?.firstReceiverTeamId || (firstServerSide === 'TEAM_A' ? teamBId : teamAId);
  const firstReceiverSide: 'TEAM_A' | 'TEAM_B' = firstReceiverTeamId === teamBId ? 'TEAM_B' : 'TEAM_A';
  const firstReceiverPlayerId = customStartingServer?.receiverPlayerId || match.tableTennisConfig?.firstReceiverPlayerId || (firstReceiverSide === 'TEAM_A' ? defaultPlayerA1.id : defaultPlayerB1.id);

  // Player stats map
  const playerStatsMap = new Map<string, TableTennisPlayerStats>();
  const getOrInitStats = (pId: string, pName: string, tId: string, tName: string, pObj?: Player) => {
    if (!playerStatsMap.has(pId)) {
      playerStatsMap.set(pId, createDefaultTableTennisPlayerStats(pId, pName, tId, tName, pObj));
    }
    return playerStatsMap.get(pId)!;
  };

  // Seed default player stats
  getOrInitStats(defaultPlayerA1.id, defaultPlayerA1.name, teamAId, teamA?.name || 'Team A', teamAPlayers[0]);
  if (rules.matchType === 'DOUBLES') {
    getOrInitStats(defaultPlayerA2.id, defaultPlayerA2.name, teamAId, teamA?.name || 'Team A', teamAPlayers[1]);
  }
  getOrInitStats(defaultPlayerB1.id, defaultPlayerB1.name, teamBId, teamB?.name || 'Team B', teamBPlayers[0]);
  if (rules.matchType === 'DOUBLES') {
    getOrInitStats(defaultPlayerB2.id, defaultPlayerB2.name, teamBId, teamB?.name || 'Team B', teamBPlayers[1]);
  }

  // Active match progression variables
  let currentGame = 1;
  let gamesWonA = 0;
  let gamesWonB = 0;
  let currentScoreA = 0;
  let currentScoreB = 0;
  const gameScores: TableTennisGameScore[] = [];

  let isCompleted = false;
  let matchWinner: 'TEAM_A' | 'TEAM_B' | undefined;
  let winnerTeamId: string | undefined;
  let winnerPlayerName: string | undefined;
  let matchResultText: string | undefined;

  let timeoutsTakenA = 0;
  let timeoutsTakenB = 0;
  let decidingGameEndChangeCompleted = false;

  // Filter valid events
  const validEvents = (events || []).filter((e) => !e.isUndone);

  // Doubles player ordering
  // In Doubles: [A1->B1, B1->A2, A2->B2, B2->A1]
  const pA1 = defaultPlayerA1;
  const pA2 = defaultPlayerA2;
  const pB1 = defaultPlayerB1;
  const pB2 = defaultPlayerB2;

  // Helper to determine server and receiver for a given game number and rally score
  const resolveServerAndReceiver = (
    gNum: number,
    sA: number,
    sB: number,
    endChangeInDecidingDone: boolean
  ): {
    servingSide: 'TEAM_A' | 'TEAM_B';
    servingTeamId: string;
    servingPlayerId: string;
    servingPlayerName: string;
    receivingSide: 'TEAM_A' | 'TEAM_B';
    receivingTeamId: string;
    receivingPlayerId: string;
    receivingPlayerName: string;
    serviceCountInRotation: number;
  } => {
    const totalPointsInGame = sA + sB;
    const isDeuceMode = sA >= 10 && sB >= 10;

    if (rules.matchType === 'SINGLES') {
      // In singles:
      // Game 1: Initial server serves first.
      // In each subsequent game, the player who received in the previous game serves first.
      // (Game parity: odd games start with firstServerSide, even games start with opposite)
      const gameInitialServerSide: 'TEAM_A' | 'TEAM_B' =
        gNum % 2 === 1 ? firstServerSide : firstServerSide === 'TEAM_A' ? 'TEAM_B' : 'TEAM_A';

      let currentServingSide: 'TEAM_A' | 'TEAM_B';
      let serviceCount = 1;

      if (!isDeuceMode) {
        // Normal 2-point rotation
        const rotationBlock = Math.floor(totalPointsInGame / rules.serviceRotation);
        currentServingSide = rotationBlock % 2 === 0 ? gameInitialServerSide : gameInitialServerSide === 'TEAM_A' ? 'TEAM_B' : 'TEAM_A';
        serviceCount = (totalPointsInGame % rules.serviceRotation) + 1;
      } else {
        // Deuce: 1 service each from 20 points onwards
        // At 10-10 (total 20 points), service alternates every point
        const pointsSinceDeuce = totalPointsInGame - 20;
        const initialAtDeuce = gameInitialServerSide; // At 20 points, 20/2 = 10 (even), so server is gameInitialServerSide
        currentServingSide = pointsSinceDeuce % 2 === 0 ? initialAtDeuce : initialAtDeuce === 'TEAM_A' ? 'TEAM_B' : 'TEAM_A';
        serviceCount = 1;
      }

      const servingTeamId = currentServingSide === 'TEAM_A' ? teamAId : teamBId;
      const servingPlayer = currentServingSide === 'TEAM_A' ? defaultPlayerA1 : defaultPlayerB1;

      const receivingSide: 'TEAM_A' | 'TEAM_B' = currentServingSide === 'TEAM_A' ? 'TEAM_B' : 'TEAM_A';
      const receivingTeamId = receivingSide === 'TEAM_A' ? teamAId : teamBId;
      const receivingPlayer = receivingSide === 'TEAM_A' ? defaultPlayerA1 : defaultPlayerB1;

      return {
        servingSide: currentServingSide,
        servingTeamId,
        servingPlayerId: servingPlayer.id,
        servingPlayerName: servingPlayer.name,
        receivingSide,
        receivingTeamId,
        receivingPlayerId: receivingPlayer.id,
        receivingPlayerName: receivingPlayer.name,
        serviceCountInRotation: serviceCount,
      };
    } else {
      // DOUBLES
      // Normal sequence: [A1 -> B1, B1 -> A2, A2 -> B2, B2 -> A1]
      // In subsequent games, the receiving team serves first.
      const isDecidingGame = gNum === (rules.gamesToWin * 2 - 1);
      
      // Doubles rotation table
      let sequence: Array<{ sTeam: 'TEAM_A' | 'TEAM_B'; sP: Player; rTeam: 'TEAM_A' | 'TEAM_B'; rP: Player }> = [
        { sTeam: 'TEAM_A', sP: pA1, rTeam: 'TEAM_B', rP: pB1 },
        { sTeam: 'TEAM_B', sP: pB1, rTeam: 'TEAM_A', rP: pA2 },
        { sTeam: 'TEAM_A', sP: pA2, rTeam: 'TEAM_B', rP: pB2 },
        { sTeam: 'TEAM_B', sP: pB2, rTeam: 'TEAM_A', rP: pA1 },
      ];

      // If team B served first in game 1:
      if (firstServerSide === 'TEAM_B') {
        sequence = [
          { sTeam: 'TEAM_B', sP: pB1, rTeam: 'TEAM_A', rP: pA1 },
          { sTeam: 'TEAM_A', sP: pA1, rTeam: 'TEAM_B', rP: pB2 },
          { sTeam: 'TEAM_B', sP: pB2, rTeam: 'TEAM_A', rP: pA2 },
          { sTeam: 'TEAM_A', sP: pA2, rTeam: 'TEAM_B', rP: pB1 },
        ];
      }

      // Offset by game number (receiving pair in game 1 serves first in game 2)
      const gameOffset = ((gNum - 1) % 4) * 1; // shifts sequence per game

      let stepIndex = 0;
      let serviceCount = 1;

      if (!isDeuceMode) {
        const rotationBlock = Math.floor(totalPointsInGame / rules.serviceRotation);
        stepIndex = (rotationBlock + gameOffset) % 4;
        serviceCount = (totalPointsInGame % rules.serviceRotation) + 1;
      } else {
        const pointsSinceDeuce = totalPointsInGame - 20;
        const deuceBaseStep = (Math.floor(20 / rules.serviceRotation) + gameOffset) % 4;
        stepIndex = (deuceBaseStep + pointsSinceDeuce) % 4;
        serviceCount = 1;
      }

      const activeStep = sequence[stepIndex];
      let sP = activeStep.sP;
      let rP = activeStep.rP;

      // In deciding game, when ends are changed at 5 points, receiver order is switched for the receiving pair
      if (isDecidingGame && endChangeInDecidingDone) {
        if (activeStep.rTeam === 'TEAM_B') {
          rP = rP.id === pB1.id ? pB2 : pB1;
        } else {
          rP = rP.id === pA1.id ? pA2 : pA1;
        }
      }

      return {
        servingSide: activeStep.sTeam,
        servingTeamId: activeStep.sTeam === 'TEAM_A' ? teamAId : teamBId,
        servingPlayerId: sP.id,
        servingPlayerName: sP.name,
        receivingSide: activeStep.rTeam,
        receivingTeamId: activeStep.rTeam === 'TEAM_A' ? teamAId : teamBId,
        receivingPlayerId: rP.id,
        receivingPlayerName: rP.name,
        serviceCountInRotation: serviceCount,
      };
    }
  };

  // Replay events to build state
  for (let i = 0; i < validEvents.length; i++) {
    const evt = validEvents[i];

    if (evt.pointType === 'TIMEOUT') {
      if (evt.timeoutTeamId === teamAId || evt.serverTeamId === teamAId) {
        timeoutsTakenA++;
      } else {
        timeoutsTakenB++;
      }
      continue;
    }

    if (evt.pointType === 'END_CHANGE' || evt.isEndChange) {
      if (currentGame === (rules.gamesToWin * 2 - 1)) {
        decidingGameEndChangeCompleted = true;
      }
      continue;
    }

    // Identify current server/receiver for stats
    const currentServ = resolveServerAndReceiver(currentGame, currentScoreA, currentScoreB, decidingGameEndChangeCompleted);
    const serverStats = getOrInitStats(currentServ.servingPlayerId, currentServ.servingPlayerName, currentServ.servingTeamId, currentServ.servingSide === 'TEAM_A' ? (teamA?.name || 'Team A') : (teamB?.name || 'Team B'));
    serverStats.pointsServed++;

    // Process point outcome
    const winnerSide = evt.pointWinner;
    const ptWinnerPlayerId = evt.pointWinnerPlayerId || (winnerSide === 'TEAM_A' ? defaultPlayerA1.id : defaultPlayerB1.id);
    const ptWinnerPlayerName = evt.pointWinnerPlayerName || (winnerSide === 'TEAM_A' ? defaultPlayerA1.name : defaultPlayerB1.name);
    const winnerTeamIdLocal = winnerSide === 'TEAM_A' ? teamAId : teamBId;

    const winnerStats = getOrInitStats(ptWinnerPlayerId, ptWinnerPlayerName, winnerTeamIdLocal, winnerSide === 'TEAM_A' ? (teamA?.name || 'Team A') : (teamB?.name || 'Team B'));
    winnerStats.pointsWon++;

    if (currentServ.servingSide === winnerSide) {
      serverStats.servicePointsWon++;
    }

    // Shot type breakdown
    if (evt.pointType === 'ACE') {
      winnerStats.aces++;
      winnerStats.winners++;
    } else if (evt.pointType === 'WINNER') {
      winnerStats.winners++;
    } else if (evt.pointType === 'EDGE_POINT') {
      winnerStats.edgePoints++;
      winnerStats.winners++;
    } else if (evt.pointType === 'NET_POINT') {
      winnerStats.netPoints++;
      winnerStats.winners++;
    } else if (evt.pointType === 'SERVICE_FAULT') {
      serverStats.serviceFaults++;
      serverStats.totalErrors++;
    } else if (evt.pointType === 'UNFORCED_ERROR') {
      const loserPlayerId = winnerSide === 'TEAM_A' ? defaultPlayerB1.id : defaultPlayerA1.id;
      const loserStats = playerStatsMap.get(loserPlayerId);
      if (loserStats) {
        loserStats.unforcedErrors++;
        loserStats.totalErrors++;
      }
    } else if (evt.pointType === 'FORCED_ERROR') {
      const loserPlayerId = winnerSide === 'TEAM_A' ? defaultPlayerB1.id : defaultPlayerA1.id;
      const loserStats = playerStatsMap.get(loserPlayerId);
      if (loserStats) {
        loserStats.forcedErrors++;
        loserStats.totalErrors++;
      }
    }

    // Increment rally score
    if (winnerSide === 'TEAM_A') {
      currentScoreA++;
    } else {
      currentScoreB++;
    }

    // Check deciding game end change trigger (at 5 points in deciding game)
    const isDecidingGame = currentGame === (rules.gamesToWin * 2 - 1);
    if (isDecidingGame && !decidingGameEndChangeCompleted) {
      if (currentScoreA >= rules.decidingGameEndChangePoint || currentScoreB >= rules.decidingGameEndChangePoint) {
        decidingGameEndChangeCompleted = true;
      }
    }

    // Check Game Completion
    // A game is won when a player reaches 11 points (pointsPerGame) AND has at least a 2-point advantage (pointDifference)
    const hasReachedTarget = currentScoreA >= rules.pointsPerGame || currentScoreB >= rules.pointsPerGame;
    const diff = Math.abs(currentScoreA - currentScoreB);

    if (hasReachedTarget && diff >= rules.pointDifference) {
      const gameWinnerSide: 'TEAM_A' | 'TEAM_B' = currentScoreA > currentScoreB ? 'TEAM_A' : 'TEAM_B';
      const gWinnerTeamId = gameWinnerSide === 'TEAM_A' ? teamAId : teamBId;
      const gWinnerTeamName = gameWinnerSide === 'TEAM_A' ? (teamA?.name || 'Team A') : (teamB?.name || 'Team B');

      gameScores.push({
        gameNumber: currentGame,
        scoreA: currentScoreA,
        scoreB: currentScoreB,
        winnerSide: gameWinnerSide,
        winnerTeamId: gWinnerTeamId,
        winnerTeamName: gWinnerTeamName,
        isCompleted: true,
      });

      if (gameWinnerSide === 'TEAM_A') {
        gamesWonA++;
      } else {
        gamesWonB++;
      }

      // Update games won/played stats
      playerStatsMap.forEach((st) => {
        st.gamesPlayed++;
        if ((st.teamId === teamAId && gameWinnerSide === 'TEAM_A') || (st.teamId === teamBId && gameWinnerSide === 'TEAM_B')) {
          st.gamesWon++;
        }
      });

      // Check Match Won
      if (gamesWonA >= rules.gamesToWin || gamesWonB >= rules.gamesToWin) {
        isCompleted = true;
        matchWinner = gamesWonA >= rules.gamesToWin ? 'TEAM_A' : 'TEAM_B';
        winnerTeamId = matchWinner === 'TEAM_A' ? teamAId : teamBId;
        winnerPlayerName = matchWinner === 'TEAM_A' ? (teamA?.name || 'Team A') : (teamB?.name || 'Team B');

        const scoreStrings = gameScores.map((g) => `${g.scoreA}-${g.scoreB}`).join(', ');
        matchResultText = `${winnerPlayerName} won (${scoreStrings})`;
      } else {
        // Move to next game
        currentGame++;
        currentScoreA = 0;
        currentScoreB = 0;
        decidingGameEndChangeCompleted = false; // Reset for next game
      }
    }
  }

  // Calculate current server/receiver for live display
  const currentServeInfo = resolveServerAndReceiver(currentGame, currentScoreA, currentScoreB, decidingGameEndChangeCompleted);

  // Check Deuce, Game Point, Match Point for current live score
  const isDeuce = currentScoreA >= 10 && currentScoreB >= 10 && currentScoreA === currentScoreB;

  const isDecidingGame = currentGame === (rules.gamesToWin * 2 - 1) && gamesWonA === rules.gamesToWin - 1 && gamesWonB === rules.gamesToWin - 1;

  // Game Point conditions (1 point away from winning game)
  const isGamePointA = !isCompleted && currentScoreA >= rules.pointsPerGame - 1 && currentScoreA > currentScoreB && (currentScoreA - currentScoreB >= 1);
  const isGamePointB = !isCompleted && currentScoreB >= rules.pointsPerGame - 1 && currentScoreB > currentScoreA && (currentScoreB - currentScoreA >= 1);

  // Match Point conditions (Game Point when on brink of match victory)
  const isMatchPointA = isGamePointA && gamesWonA === rules.gamesToWin - 1;
  const isMatchPointB = isGamePointB && gamesWonB === rules.gamesToWin - 1;

  // End change notification
  const isEndChange = isDecidingGame && (currentScoreA === rules.decidingGameEndChangePoint || currentScoreB === rules.decidingGameEndChangePoint) && !decidingGameEndChangeCompleted;

  // Match status resolution
  let matchStatus: 'NOT_STARTED' | 'LIVE' | 'GAME_BREAK' | 'COMPLETED' | 'CANCELLED' = 'NOT_STARTED';
  if (isCompleted || match.status === 'COMPLETED') {
    matchStatus = 'COMPLETED';
  } else if (validEvents.length > 0 || match.status === 'LIVE') {
    matchStatus = 'LIVE';
  }

  const lastEvent = validEvents.length > 0 ? validEvents[validEvents.length - 1] : undefined;

  return {
    sport: 'TABLE_TENNIS',
    match,
    matchId: match.id,
    matchStatus,
    currentGame,
    currentScoreA,
    currentScoreB,
    currentSetScoreA: currentScoreA,
    currentSetScoreB: currentScoreB,
    scoreA: currentScoreA,
    scoreB: currentScoreB,
    gamesWonA,
    gamesWonB,
    gameScores,
    servingTeam: currentServeInfo.servingSide,
    servingTeamId: currentServeInfo.servingTeamId,
    servingPlayerId: currentServeInfo.servingPlayerId,
    servingPlayerName: currentServeInfo.servingPlayerName,
    receivingTeam: currentServeInfo.receivingSide,
    receivingTeamId: currentServeInfo.receivingTeamId,
    receivingPlayerId: currentServeInfo.receivingPlayerId,
    receivingPlayerName: currentServeInfo.receivingPlayerName,
    serviceCountInRotation: currentServeInfo.serviceCountInRotation,
    isDeuce,
    isGamePointA,
    isGamePointB,
    isMatchPointA,
    isMatchPointB,
    isDecidingGame,
    isEndChange,
    decidingGameEndChangeCompleted,
    timeoutsTakenA,
    timeoutsTakenB,
    isTimeoutActive: false,
    isCompleted,
    matchWinner,
    winnerTeamId,
    winnerPlayerName,
    matchResultText,
    rallyNumber: validEvents.length,
    events: validEvents,
    lastEvent,
    playerStats: Array.from(playerStatsMap.values()),
    teamAPlayers,
    teamBPlayers,
    teamAName: teamA?.name || 'Team A',
    teamBName: teamB?.name || 'Team B',
    doublesOrder: rules.matchType === 'DOUBLES' ? {
      teamAPlayer1Id: pA1.id,
      teamAPlayer2Id: pA2.id,
      teamBPlayer1Id: pB1.id,
      teamBPlayer2Id: pB2.id,
    } : undefined,
    config: match.tableTennisConfig,
  };
}
