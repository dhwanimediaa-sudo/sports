import {
  Match,
  Player,
  BadmintonMatchConfig,
  BadmintonScoringEvent,
  BadmintonGameScore,
  BadmintonPlayerStats,
  BadmintonMatchScoringState,
  BadmintonPointType,
  BadmintonServiceCourt,
} from '../../src/types';

export interface BadmintonMatchRules {
  matchType: 'SINGLES' | 'DOUBLES';
  format: 'BEST_OF_1' | 'BEST_OF_3' | 'BEST_OF_5';
  gamesToWin: number;
  pointsPerGame: number;
  pointDifference: number;
  maxPoints: number;
  decidingGamePoints: number;
  courtName: string;
  courtNumber: string;
}

export function getBadmintonMatchRules(match: Match): BadmintonMatchRules {
  const cfg = match.badmintonConfig;
  const matchType = (cfg?.matchType || 'SINGLES') as 'SINGLES' | 'DOUBLES';
  const format = (cfg?.format || 'BEST_OF_3') as 'BEST_OF_1' | 'BEST_OF_3' | 'BEST_OF_5';
  const gamesToWin = format === 'BEST_OF_1' ? 1 : format === 'BEST_OF_5' ? 3 : 2;
  const pointsPerGame = Number(cfg?.pointsPerGame) || 21;
  const pointDifference = Number(cfg?.pointDifference) || 2;
  const maxPoints = Number(cfg?.maxPoints) || 30;
  const decidingGamePoints = Number(cfg?.decidingGamePoints) || pointsPerGame;
  const courtName = cfg?.courtName || match.venue || 'Court 1';
  const courtNumber = cfg?.courtNumber || '1';

  return {
    matchType,
    format,
    gamesToWin,
    pointsPerGame,
    pointDifference,
    maxPoints,
    decidingGamePoints,
    courtName,
    courtNumber,
  };
}

/**
 * Initialize player/team statistics for Badminton
 */
export function createDefaultBadmintonPlayerStats(
  playerId: string,
  playerName: string,
  teamId: string,
  teamName: string,
  player?: Player
): BadmintonPlayerStats {
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
    smashWinners: 0,
    dropShotWinners: 0,
    clearWinners: 0,
    netWinners: 0,
    aces: 0,
    serviceErrors: 0,
    netErrors: 0,
    unforcedErrors: 0,
    totalErrors: 0,
    gamesPlayed: 0,
    gamesWon: 0,
  };
}

/**
 * Pure Deterministic Calculation of Badminton Match Scoring State
 * All state is reconstructed from the immutable list of BadmintonScoringEvents.
 */
export function calculateBadmintonScoringState(
  match: Match,
  events: BadmintonScoringEvent[],
  customStartingServer?: {
    teamId?: string;
    playerId?: string;
    receiverTeamId?: string;
    receiverPlayerId?: string;
  }
): BadmintonMatchScoringState {
  const rules = getBadmintonMatchRules(match);
  const teamA = match.teamA;
  const teamB = match.teamB;

  const teamAPlayers: Player[] = match.teamAPlayers || [];
  const teamBPlayers: Player[] = match.teamBPlayers || [];

  const teamAId = match.teamAId || 'TEAM_A';
  const teamBId = match.teamBId || 'TEAM_B';

  const defaultPlayerA1 = teamAPlayers[0] || { id: `${teamAId}_P1`, name: teamA?.name ? `${teamA.name} Player 1` : 'Player A1' };
  const defaultPlayerA2 = teamAPlayers[1] || { id: `${teamAId}_P2`, name: teamA?.name ? `${teamA.name} Player 2` : 'Player A2' };
  const defaultPlayerB1 = teamBPlayers[0] || { id: `${teamBId}_P1`, name: teamB?.name ? `${teamB.name} Player 1` : 'Player B1' };
  const defaultPlayerB2 = teamBPlayers[1] || { id: `${teamBId}_P2`, name: teamB?.name ? `${teamB.name} Player 2` : 'Player B2' };

  // Determine initial server & receiver
  const firstServerTeamId = customStartingServer?.teamId || match.badmintonConfig?.firstServerTeamId || teamAId;
  const firstServerSide: 'TEAM_A' | 'TEAM_B' = firstServerTeamId === teamBId ? 'TEAM_B' : 'TEAM_A';
  const firstServerPlayerId = customStartingServer?.playerId || match.badmintonConfig?.firstServerPlayerId || (firstServerSide === 'TEAM_A' ? defaultPlayerA1.id : defaultPlayerB1.id);

  const firstReceiverTeamId = customStartingServer?.receiverTeamId || match.badmintonConfig?.firstReceiverTeamId || (firstServerSide === 'TEAM_A' ? teamBId : teamAId);
  const firstReceiverSide: 'TEAM_A' | 'TEAM_B' = firstReceiverTeamId === teamBId ? 'TEAM_B' : 'TEAM_A';
  const firstReceiverPlayerId = customStartingServer?.receiverPlayerId || match.badmintonConfig?.firstReceiverPlayerId || (firstReceiverSide === 'TEAM_A' ? defaultPlayerA1.id : defaultPlayerB1.id);

  // Initialize stats dictionary
  const playerStatsMap = new Map<string, BadmintonPlayerStats>();
  const getOrInitStats = (pId: string, pName: string, tId: string, tName: string, pObj?: Player) => {
    if (!playerStatsMap.has(pId)) {
      playerStatsMap.set(pId, createDefaultBadmintonPlayerStats(pId, pName, tId, tName, pObj));
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
  const gameScores: BadmintonGameScore[] = [];

  let isCompleted = false;
  let matchWinner: 'TEAM_A' | 'TEAM_B' | undefined;
  let winnerTeamId: string | undefined;
  let winnerPlayerName: string | undefined;

  // Running server & court positions
  let servingTeam: 'TEAM_A' | 'TEAM_B' = firstServerSide;
  let servingPlayerId: string = firstServerPlayerId;
  let receivingTeam: 'TEAM_A' | 'TEAM_B' = firstReceiverSide;
  let receivingPlayerId: string = firstReceiverPlayerId;

  // Doubles court positioning: track who is on the right court (even) and left court (odd)
  let teamARightPlayerId = defaultPlayerA1.id;
  let teamALeftPlayerId = defaultPlayerA2.id;
  let teamBRightPlayerId = defaultPlayerB1.id;
  let teamBLeftPlayerId = defaultPlayerB2.id;

  // Adjust starting doubles positions to ensure initial server is on the right
  if (rules.matchType === 'DOUBLES') {
    if (firstServerSide === 'TEAM_A') {
      if (teamALeftPlayerId === firstServerPlayerId) {
        // Swap so server is on the right at 0-0
        teamALeftPlayerId = teamARightPlayerId;
        teamARightPlayerId = firstServerPlayerId;
      }
    } else {
      if (teamBLeftPlayerId === firstServerPlayerId) {
        teamBLeftPlayerId = teamBRightPlayerId;
        teamBRightPlayerId = firstServerPlayerId;
      }
    }

    if (firstReceiverSide === 'TEAM_A') {
      if (teamALeftPlayerId === firstReceiverPlayerId) {
        teamALeftPlayerId = teamARightPlayerId;
        teamARightPlayerId = firstReceiverPlayerId;
      }
    } else {
      if (teamBLeftPlayerId === firstReceiverPlayerId) {
        teamBLeftPlayerId = teamBRightPlayerId;
        teamBRightPlayerId = firstReceiverPlayerId;
      }
    }
  }

  // Helper to determine service court for current serving side
  const computeServiceCourt = (side: 'TEAM_A' | 'TEAM_B', score: number): BadmintonServiceCourt => {
    return score % 2 === 0 ? 'RIGHT' : 'LEFT';
  };

  let serviceCourt: BadmintonServiceCourt = computeServiceCourt(servingTeam, 0);

  // Helper to resolve player name
  const getPlayerName = (pId: string): string => {
    const pA = teamAPlayers.find((p) => p.id === pId);
    if (pA) return pA.name;
    const pB = teamBPlayers.find((p) => p.id === pId);
    if (pB) return pB.name;
    if (pId === defaultPlayerA1.id) return defaultPlayerA1.name;
    if (pId === defaultPlayerA2.id) return defaultPlayerA2.name;
    if (pId === defaultPlayerB1.id) return defaultPlayerB1.name;
    if (pId === defaultPlayerB2.id) return defaultPlayerB2.name;
    return 'Player';
  };

  // Helper to check game win
  const checkGameWon = (scoreA: number, scoreB: number, isDecidingGame: boolean): { won: boolean; winner?: 'TEAM_A' | 'TEAM_B' } => {
    const targetPoints = isDecidingGame ? rules.decidingGamePoints : rules.pointsPerGame;
    const diff = rules.pointDifference;
    const max = rules.maxPoints;

    // Direct max points cap (e.g. 30-29)
    if (scoreA >= max) {
      return { won: true, winner: 'TEAM_A' };
    }
    if (scoreB >= max) {
      return { won: true, winner: 'TEAM_B' };
    }

    // Standard reach target points with lead difference
    if (scoreA >= targetPoints && scoreA - scoreB >= diff) {
      return { won: true, winner: 'TEAM_A' };
    }
    if (scoreB >= targetPoints && scoreB - scoreA >= diff) {
      return { won: true, winner: 'TEAM_B' };
    }

    return { won: false };
  };

  // Filter out any undone events
  const validEvents = events.filter((e) => !e.isUndone);

  // Replay all events
  for (let i = 0; i < validEvents.length; i++) {
    const ev = validEvents[i];
    const winnerSide = ev.winnerSide;
    const winnerPlayerId = ev.winnerPlayerId || (winnerSide === 'TEAM_A' ? defaultPlayerA1.id : defaultPlayerB1.id);
    const eventWinnerPlayerName = getPlayerName(winnerPlayerId);

    const isDecidingGame = currentGame === rules.gamesToWin * 2 - 1;

    // Update server player statistics
    const serverStats = getOrInitStats(
      servingPlayerId,
      getPlayerName(servingPlayerId),
      servingTeam === 'TEAM_A' ? teamAId : teamBId,
      servingTeam === 'TEAM_A' ? (teamA?.name || 'Team A') : (teamB?.name || 'Team B')
    );
    serverStats.pointsServed++;

    if (ev.eventType === 'ACE') {
      serverStats.aces++;
    }
    if (ev.eventType === 'SERVICE_ERROR') {
      serverStats.serviceErrors++;
      serverStats.totalErrors++;
    }

    // Update point winner statistics
    const winnerStats = getOrInitStats(
      winnerPlayerId,
      eventWinnerPlayerName,
      winnerSide === 'TEAM_A' ? teamAId : teamBId,
      winnerSide === 'TEAM_A' ? (teamA?.name || 'Team A') : (teamB?.name || 'Team B')
    );
    winnerStats.pointsWon++;

    if (winnerSide === servingTeam) {
      serverStats.servicePointsWon++;
    }

    if (ev.eventType === 'SMASH_WINNER') winnerStats.smashWinners++;
    if (ev.eventType === 'DROP_SHOT_WINNER') winnerStats.dropShotWinners++;
    if (ev.eventType === 'CLEAR_WINNER') winnerStats.clearWinners++;
    if (ev.eventType === 'NET_WINNER') winnerStats.netWinners++;
    if (ev.eventType === 'NET_ERROR') {
      winnerStats.netErrors++;
      winnerStats.totalErrors++;
    }
    if (ev.eventType === 'UNFORCED_ERROR') {
      winnerStats.unforcedErrors++;
      winnerStats.totalErrors++;
    }

    // Increment rally score
    if (winnerSide === 'TEAM_A') {
      currentScoreA++;
    } else {
      currentScoreB++;
    }

    // Check if game won
    const gameResult = checkGameWon(currentScoreA, currentScoreB, isDecidingGame);

    if (gameResult.won && gameResult.winner) {
      // Record completed game score
      gameScores.push({
        gameNumber: currentGame,
        scoreA: currentScoreA,
        scoreB: currentScoreB,
        winnerSide: gameResult.winner,
        winnerTeamId: gameResult.winner === 'TEAM_A' ? teamAId : teamBId,
        isCompleted: true,
      });

      if (gameResult.winner === 'TEAM_A') {
        gamesWonA++;
      } else {
        gamesWonB++;
      }

      // Check match completion
      if (gamesWonA >= rules.gamesToWin) {
        isCompleted = true;
        matchWinner = 'TEAM_A';
        winnerTeamId = teamAId;
        winnerPlayerName = teamA?.name || 'Team A';
      } else if (gamesWonB >= rules.gamesToWin) {
        isCompleted = true;
        matchWinner = 'TEAM_B';
        winnerTeamId = teamBId;
        winnerPlayerName = teamB?.name || 'Team B';
      } else {
        // Move to next game
        currentGame++;
        currentScoreA = 0;
        currentScoreB = 0;

        // Winner of game serves first in the next game
        servingTeam = gameResult.winner;
        receivingTeam = servingTeam === 'TEAM_A' ? 'TEAM_B' : 'TEAM_A';

        // Reset doubles positions for new game
        if (rules.matchType === 'DOUBLES') {
          servingPlayerId = servingTeam === 'TEAM_A' ? teamARightPlayerId : teamBRightPlayerId;
          receivingPlayerId = receivingTeam === 'TEAM_A' ? teamARightPlayerId : teamBRightPlayerId;
        } else {
          servingPlayerId = servingTeam === 'TEAM_A' ? defaultPlayerA1.id : defaultPlayerB1.id;
          receivingPlayerId = receivingTeam === 'TEAM_A' ? defaultPlayerA1.id : defaultPlayerB1.id;
        }

        serviceCourt = 'RIGHT';
      }
    } else {
      // Handle in-game service rotation & court changes
      if (rules.matchType === 'SINGLES') {
        // Singles Service Rules
        if (winnerSide === servingTeam) {
          // Serving player won point -> serves again from new court based on their score
          const serverScore = servingTeam === 'TEAM_A' ? currentScoreA : currentScoreB;
          serviceCourt = computeServiceCourt(servingTeam, serverScore);
        } else {
          // Service Over: receiver won point -> becomes server
          servingTeam = winnerSide;
          receivingTeam = servingTeam === 'TEAM_A' ? 'TEAM_B' : 'TEAM_A';
          servingPlayerId = servingTeam === 'TEAM_A' ? defaultPlayerA1.id : defaultPlayerB1.id;
          receivingPlayerId = receivingTeam === 'TEAM_A' ? defaultPlayerA1.id : defaultPlayerB1.id;

          const serverScore = servingTeam === 'TEAM_A' ? currentScoreA : currentScoreB;
          serviceCourt = computeServiceCourt(servingTeam, serverScore);
        }
      } else {
        // Doubles Service Rules
        if (winnerSide === servingTeam) {
          // Serving side won rally:
          // 1. Serving side switches courts
          if (servingTeam === 'TEAM_A') {
            const temp = teamARightPlayerId;
            teamARightPlayerId = teamALeftPlayerId;
            teamALeftPlayerId = temp;
          } else {
            const temp = teamBRightPlayerId;
            teamBRightPlayerId = teamBLeftPlayerId;
            teamBLeftPlayerId = temp;
          }

          // 2. Same server serves again from the court matching their new score
          const serverScore = servingTeam === 'TEAM_A' ? currentScoreA : currentScoreB;
          serviceCourt = computeServiceCourt(servingTeam, serverScore);

          // 3. The receiver is whoever is in the diagonal court on receiving side
          receivingPlayerId = serviceCourt === 'RIGHT'
            ? (receivingTeam === 'TEAM_A' ? teamARightPlayerId : teamBRightPlayerId)
            : (receivingTeam === 'TEAM_A' ? teamALeftPlayerId : teamBLeftPlayerId);
        } else {
          // Service Over: receiving side won rally
          // 1. Neither side switches courts
          servingTeam = winnerSide;
          receivingTeam = servingTeam === 'TEAM_A' ? 'TEAM_B' : 'TEAM_A';

          // 2. The player on the new serving side standing in the court matching their score becomes server
          const newServerScore = servingTeam === 'TEAM_A' ? currentScoreA : currentScoreB;
          serviceCourt = computeServiceCourt(servingTeam, newServerScore);

          servingPlayerId = serviceCourt === 'RIGHT'
            ? (servingTeam === 'TEAM_A' ? teamARightPlayerId : teamBRightPlayerId)
            : (servingTeam === 'TEAM_A' ? teamALeftPlayerId : teamBLeftPlayerId);

          // 3. Receiver is the player on receiving side standing in the diagonal court
          receivingPlayerId = serviceCourt === 'RIGHT'
            ? (receivingTeam === 'TEAM_A' ? teamARightPlayerId : teamBRightPlayerId)
            : (receivingTeam === 'TEAM_A' ? teamALeftPlayerId : teamBLeftPlayerId);
        }
      }
    }
  }

  // Calculate Game Point / Match Point flags
  const isDecidingGameNow = currentGame === rules.gamesToWin * 2 - 1;
  const targetPointsNow = isDecidingGameNow ? rules.decidingGamePoints : rules.pointsPerGame;
  const maxNow = rules.maxPoints;

  const isOnePointAway = (scoreLead: number, scoreTrail: number) => {
    if (scoreLead >= maxNow - 1) return true; // at 29
    if (scoreLead >= targetPointsNow - 1 && scoreLead - scoreTrail >= rules.pointDifference - 1) return true;
    return false;
  };

  const isGamePointA = !isCompleted && isOnePointAway(currentScoreA, currentScoreB) && currentScoreA >= currentScoreB;
  const isGamePointB = !isCompleted && isOnePointAway(currentScoreB, currentScoreA) && currentScoreB >= currentScoreA;

  const isMatchPointA = isGamePointA && gamesWonA === rules.gamesToWin - 1;
  const isMatchPointB = isGamePointB && gamesWonB === rules.gamesToWin - 1;

  // Match result summary string
  let matchResultText = '';
  if (isCompleted && matchWinner) {
    const winnerName = matchWinner === 'TEAM_A' ? (teamA?.name || 'Team A') : (teamB?.name || 'Team B');
    const scoreSummary = gameScores.map((g) => `${g.scoreA}-${g.scoreB}`).join(', ');
    matchResultText = `${winnerName} won ${gamesWonA}-${gamesWonB} (${scoreSummary})`;
  }

  const matchStatus: BadmintonMatchScoringState['matchStatus'] = isCompleted
    ? 'COMPLETED'
    : validEvents.length > 0
    ? 'LIVE'
    : 'NOT_STARTED';

  const lastEvent = validEvents.length > 0 ? validEvents[validEvents.length - 1] : undefined;

  return {
    sport: 'BADMINTON',
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
    servingTeam,
    servingTeamId: servingTeam === 'TEAM_A' ? teamAId : teamBId,
    servingPlayerId,
    servingPlayerName: getPlayerName(servingPlayerId),
    receivingTeam,
    receivingTeamId: receivingTeam === 'TEAM_A' ? teamAId : teamBId,
    receivingPlayerId,
    receivingPlayerName: getPlayerName(receivingPlayerId),
    serviceCourt,
    doublesPositions: {
      teamA: {
        rightPlayerId: teamARightPlayerId,
        leftPlayerId: teamALeftPlayerId,
      },
      teamB: {
        rightPlayerId: teamBRightPlayerId,
        leftPlayerId: teamBLeftPlayerId,
      },
    },
    isGamePointA,
    isGamePointB,
    isMatchPointA,
    isMatchPointB,
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
  };
}
