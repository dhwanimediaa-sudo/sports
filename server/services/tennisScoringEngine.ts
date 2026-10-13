import {
  Match,
  Player,
  TennisMatchConfig,
  TennisScoringEvent,
  TennisSetScore,
  TennisPlayerStats,
  TennisMatchScoringState,
  TennisPointType,
} from '../../src/types';

export interface TennisMatchRules {
  matchType: 'SINGLES' | 'DOUBLES';
  format: 'BEST_OF_1' | 'BEST_OF_3' | 'BEST_OF_5';
  setsToWin: number;
  gamesToWinSet: number;
  setAdvantage: boolean;
  tiebreakAtGames: number;
  tiebreakPoints: number;
  finalSetRule: 'NORMAL' | 'ADVANTAGE_SET' | 'MATCH_TIEBREAK_10';
  surface: string;
  courtName: string;
  courtNumber: string;
  noAdScoring: boolean;
}

export function getTennisMatchRules(match: Match): TennisMatchRules {
  const cfg = match.tennisConfig;
  const matchType = (cfg?.matchType || 'SINGLES') as 'SINGLES' | 'DOUBLES';
  const format = (cfg?.format || 'BEST_OF_3') as 'BEST_OF_1' | 'BEST_OF_3' | 'BEST_OF_5';
  const setsToWin = format === 'BEST_OF_1' ? 1 : format === 'BEST_OF_5' ? 3 : 2;
  const gamesToWinSet = Number(cfg?.gamesToWinSet) || (cfg?.setRules === 'SHORT' ? 4 : 6);
  const setAdvantage = cfg?.setAdvantage !== false;
  const tiebreakAtGames = Number(cfg?.tiebreakAtGames) || (cfg?.setRules === 'SHORT' ? 4 : 6);
  const tiebreakPoints = Number(cfg?.tiebreakPoints) || 7;
  const finalSetRule = (cfg?.finalSetRule || 'NORMAL') as 'NORMAL' | 'ADVANTAGE_SET' | 'MATCH_TIEBREAK_10';
  const surface = cfg?.surface || 'HARD';
  const courtName = cfg?.courtName || match.venue || 'Center Court';
  const courtNumber = cfg?.courtNumber || '1';
  const noAdScoring = cfg?.noAdScoring === true;

  return {
    matchType,
    format,
    setsToWin,
    gamesToWinSet,
    setAdvantage,
    tiebreakAtGames,
    tiebreakPoints,
    finalSetRule,
    surface,
    courtName,
    courtNumber,
    noAdScoring,
  };
}

/**
 * Standard Tennis Point Sequence helpers
 */
export function pointIndexToDisplay(index: number, isAdvantage = false): string {
  if (isAdvantage) return 'AD';
  switch (index) {
    case 0:
      return '0';
    case 1:
      return '15';
    case 2:
      return '30';
    case 3:
      return '40';
    default:
      return '40';
  }
}

/**
 * Initialize player/team statistics
 */
export function createDefaultPlayerStats(
  playerId: string,
  playerName: string,
  teamId: string,
  teamName: string,
  player?: Player
): TennisPlayerStats {
  return {
    playerId,
    playerName,
    teamId,
    teamName,
    isCaptain: player?.isCaptain || false,
    country: player?.country || '',
    ranking: player?.ranking || '',
    seed: player?.seed || '',
    photoUrl: player?.photoUrl || '',
    aces: 0,
    doubleFaults: 0,
    firstServesIn: 0,
    totalFirstServes: 0,
    firstServePct: 0,
    firstServePointsWon: 0,
    firstServePointsTotal: 0,
    firstServePointsWonPct: 0,
    secondServePointsWon: 0,
    secondServePointsTotal: 0,
    secondServePointsWonPct: 0,
    breakPointsWon: 0,
    breakPointsTotal: 0,
    breakPointsWonPct: 0,
    breakPointsSaved: 0,
    breakPointsFaced: 0,
    breakPointsSavedPct: 0,
    serviceGamesPlayed: 0,
    serviceGamesWon: 0,
    serviceGamesWonPct: 0,
    returnGamesPlayed: 0,
    returnGamesWon: 0,
    returnGamesWonPct: 0,
    winners: 0,
    unforcedErrors: 0,
    totalPointsWon: 0,
    totalPointsPlayed: 0,
    pointsWonPct: 0,
  };
}

/**
 * Main Pure Engine: Calculate complete Tennis Live Scoring State from immutable point events
 */
export function calculateTennisScoringState(
  match: Match,
  events: TennisScoringEvent[],
  allPlayers: Player[],
  manualServerPlayerId?: string
): TennisMatchScoringState {
  const rules = getTennisMatchRules(match);
  const teamAId = match.teamAId;
  const teamBId = match.teamBId;
  const teamAName = match.teamA?.name || 'Player / Team A';
  const teamBName = match.teamB?.name || 'Player / Team B';

  const teamAPlayers = allPlayers.filter((p) => p.teamId === teamAId);
  const teamBPlayers = allPlayers.filter((p) => p.teamId === teamBId);

  // Default server / receiver seeds
  const defaultServerA = teamAPlayers[0]?.id || 'player-a-1';
  const defaultServerB = teamBPlayers[0]?.id || 'player-b-1';
  const firstServerId = match.tennisConfig?.firstServerPlayerId || (match.tennisConfig?.firstServerTeamId === teamBId ? defaultServerB : defaultServerA);
  const firstServerTeamId = teamAPlayers.some((p) => p.id === firstServerId) ? teamAId : teamBId;

  // Initialize Set 1
  let currentSetNumber = 1;
  let setsA = 0;
  let setsB = 0;
  let currentGamesA = 0;
  let currentGamesB = 0;
  let currentPointIdxA = 0; // 0=0, 1=15, 2=30, 3=40, 4=AD
  let currentPointIdxB = 0;
  let isAdvantageA = false;
  let isAdvantageB = false;
  let isTiebreak = false;
  let isMatchTiebreak = false;
  let tiebreakPointsA = 0;
  let tiebreakPointsB = 0;
  let isFirstServeFaultActive = false;

  const setScores: TennisSetScore[] = [
    {
      setNumber: 1,
      gamesA: 0,
      gamesB: 0,
      isTiebreak: false,
      isCompleted: false,
    },
  ];

  // Tracking server rotation
  // In singles: alternates each game. In tiebreak: 1 pt server 1, 2 pts server 2, 2 pts server 1...
  let currentGameServerTeamId = firstServerTeamId;
  let totalGamesPlayedInMatch = 0;

  // Stats accumulator map
  const statsMap = new Map<string, TennisPlayerStats>();

  const getOrCreateStats = (playerId: string, teamId: string, teamName: string) => {
    if (!statsMap.has(playerId)) {
      const p = allPlayers.find((x) => x.id === playerId);
      const name = p?.name || (teamId === teamAId ? teamAName : teamBName);
      statsMap.set(playerId, createDefaultPlayerStats(playerId, name, teamId, teamName, p));
    }
    return statsMap.get(playerId)!;
  };

  // Filter valid active events
  const activeEvents = (events || []).filter((e) => !e.isUndone);

  // Process all immutable point events sequentially
  for (let i = 0; i < activeEvents.length; i++) {
    const evt = activeEvents[i];

    // Stats updates
    const serverStat = getOrCreateStats(
      evt.serverPlayerId || (evt.serverTeamId === teamAId ? defaultServerA : defaultServerB),
      evt.serverTeamId,
      evt.serverTeamId === teamAId ? teamAName : teamBName
    );
    const receiverStat = getOrCreateStats(
      evt.receiverPlayerId || (evt.receiverTeamId === teamAId ? defaultServerA : defaultServerB),
      evt.receiverTeamId,
      evt.receiverTeamId === teamAId ? teamAName : teamBName
    );

    const isWinnerA = evt.pointWinner === 'TEAM_A' || evt.pointWinner === teamAId;
    const winningStat = isWinnerA ? getOrCreateStats(evt.winningPlayerId || defaultServerA, teamAId, teamAName) : getOrCreateStats(evt.winningPlayerId || defaultServerB, teamBId, teamBName);
    winningStat.totalPointsWon += 1;
    serverStat.totalPointsPlayed += 1;
    receiverStat.totalPointsPlayed += 1;

    // First serve / Ace / Double Fault tracking
    if (evt.pointType === 'FIRST_SERVE_FAULT' || evt.isFirstServeFault) {
      serverStat.totalFirstServes += 1;
      isFirstServeFaultActive = true;
      continue; // Fault alone doesn't end point if followed by second serve, but if point was awarded, continue score
    }

    if (evt.pointType === 'ACE' || evt.isAce) {
      serverStat.aces += 1;
      serverStat.winners += 1;
      serverStat.firstServesIn += 1;
      serverStat.totalFirstServes += 1;
      serverStat.firstServePointsWon += 1;
      serverStat.firstServePointsTotal += 1;
      isFirstServeFaultActive = false;
    } else if (evt.pointType === 'DOUBLE_FAULT' || evt.isDoubleFault) {
      serverStat.doubleFaults += 1;
      serverStat.unforcedErrors += 1;
      serverStat.totalFirstServes += 1; // 1st serve faulted, 2nd faulted
      serverStat.secondServePointsTotal += 1;
      isFirstServeFaultActive = false;
    } else {
      // Regular point / Winner / Unforced error
      if (isFirstServeFaultActive) {
        // Was on second serve
        serverStat.totalFirstServes += 1;
        serverStat.secondServePointsTotal += 1;
        if (evt.pointWinner === evt.serverTeamId) {
          serverStat.secondServePointsWon += 1;
        }
      } else {
        // Was on first serve
        serverStat.totalFirstServes += 1;
        serverStat.firstServesIn += 1;
        serverStat.firstServePointsTotal += 1;
        if (evt.pointWinner === evt.serverTeamId) {
          serverStat.firstServePointsWon += 1;
        }
      }
      isFirstServeFaultActive = false;

      if (evt.pointType === 'WINNER' || evt.isWinner) {
        winningStat.winners += 1;
      }
      if (evt.pointType === 'UNFORCED_ERROR' || evt.isUnforcedError) {
        const errorPlayerId = evt.pointWinner === 'TEAM_A' ? (evt.receiverTeamId === teamBId ? evt.receiverPlayerId : defaultServerB) : (evt.receiverTeamId === teamAId ? evt.receiverPlayerId : defaultServerA);
        const errStat = getOrCreateStats(errorPlayerId, evt.pointWinner === 'TEAM_A' ? teamBId : teamAId, evt.pointWinner === 'TEAM_A' ? teamBName : teamAName);
        errStat.unforcedErrors += 1;
      }
    }

    // Break point opportunity tracking
    if (evt.isBreakPoint) {
      const returningTeamId = evt.serverTeamId === teamAId ? teamBId : teamAId;
      const returnerStat = returningTeamId === teamAId ? getOrCreateStats(evt.receiverPlayerId || defaultServerA, teamAId, teamAName) : getOrCreateStats(evt.receiverPlayerId || defaultServerB, teamBId, teamBName);
      returnerStat.breakPointsTotal += 1;
      serverStat.breakPointsFaced += 1;

      if (evt.pointWinner === returningTeamId) {
        returnerStat.breakPointsWon += 1;
      } else {
        serverStat.breakPointsSaved += 1;
      }
    }

    // Check if match is in match-tiebreak
    const isDecidingSet = currentSetNumber === (rules.setsToWin * 2 - 1) || (rules.format === 'BEST_OF_1' && currentSetNumber === 1);
    isMatchTiebreak = isDecidingSet && rules.finalSetRule === 'MATCH_TIEBREAK_10';

    if (isMatchTiebreak || isTiebreak) {
      // TIE-BREAK POINT SCORING
      if (isWinnerA) {
        tiebreakPointsA += 1;
      } else {
        tiebreakPointsB += 1;
      }

      const targetTiebreakPoints = isMatchTiebreak ? 10 : rules.tiebreakPoints;
      const hasWonTiebreakA = tiebreakPointsA >= targetTiebreakPoints && tiebreakPointsA - tiebreakPointsB >= 2;
      const hasWonTiebreakB = tiebreakPointsB >= targetTiebreakPoints && tiebreakPointsB - tiebreakPointsA >= 2;

      if (hasWonTiebreakA || hasWonTiebreakB) {
        // Tie-break completed -> Set Won!
        const setWinner = hasWonTiebreakA ? 'TEAM_A' : 'TEAM_B';
        if (hasWonTiebreakA) {
          currentGamesA += 1;
          setsA += 1;
        } else {
          currentGamesB += 1;
          setsB += 1;
        }

        const currSetObj = setScores.find((s) => s.setNumber === currentSetNumber);
        if (currSetObj) {
          currSetObj.gamesA = currentGamesA;
          currSetObj.gamesB = currentGamesB;
          currSetObj.isTiebreak = true;
          currSetObj.isMatchTiebreak = isMatchTiebreak;
          currSetObj.tiebreakScoreA = tiebreakPointsA;
          currSetObj.tiebreakScoreB = tiebreakPointsB;
          currSetObj.winnerTeamId = setWinner === 'TEAM_A' ? teamAId : teamBId;
          currSetObj.isCompleted = true;
        }

        tiebreakPointsA = 0;
        tiebreakPointsB = 0;
        isTiebreak = false;
        isMatchTiebreak = false;
        totalGamesPlayedInMatch += 1;
        currentGameServerTeamId = currentGameServerTeamId === teamAId ? teamBId : teamAId;

        // Check if match won
        if (setsA >= rules.setsToWin || setsB >= rules.setsToWin) {
          // Match completed
          break;
        } else {
          // Start next set
          currentSetNumber += 1;
          currentGamesA = 0;
          currentGamesB = 0;
          currentPointIdxA = 0;
          currentPointIdxB = 0;
          isAdvantageA = false;
          isAdvantageB = false;
          setScores.push({
            setNumber: currentSetNumber,
            gamesA: 0,
            gamesB: 0,
            isTiebreak: false,
            isCompleted: false,
          });
        }
      }
    } else {
      // REGULAR GAME POINT SCORING
      let gameWonBy: 'TEAM_A' | 'TEAM_B' | null = null;

      if (isWinnerA) {
        if (isAdvantageA) {
          gameWonBy = 'TEAM_A';
        } else if (isAdvantageB) {
          // Back to Deuce
          isAdvantageB = false;
        } else if (currentPointIdxA === 3 && currentPointIdxB === 3) {
          // At 40 - 40 Deuce
          if (rules.noAdScoring) {
            gameWonBy = 'TEAM_A'; // Deciding point
          } else {
            isAdvantageA = true;
          }
        } else if (currentPointIdxA === 3) {
          // 40 - 0/15/30
          gameWonBy = 'TEAM_A';
        } else {
          currentPointIdxA += 1;
        }
      } else {
        // Winner is Team B
        if (isAdvantageB) {
          gameWonBy = 'TEAM_B';
        } else if (isAdvantageA) {
          // Back to Deuce
          isAdvantageA = false;
        } else if (currentPointIdxA === 3 && currentPointIdxB === 3) {
          // At 40 - 40 Deuce
          if (rules.noAdScoring) {
            gameWonBy = 'TEAM_B'; // Deciding point
          } else {
            isAdvantageB = true;
          }
        } else if (currentPointIdxB === 3) {
          // 0/15/30 - 40
          gameWonBy = 'TEAM_B';
        } else {
          currentPointIdxB += 1;
        }
      }

      if (gameWonBy) {
        // Game won!
        if (gameWonBy === 'TEAM_A') {
          currentGamesA += 1;
        } else {
          currentGamesB += 1;
        }

        // Update service & return games stats
        const isServerA = currentGameServerTeamId === teamAId;
        const currentServerStat = isServerA ? getOrCreateStats(evt.serverPlayerId || defaultServerA, teamAId, teamAName) : getOrCreateStats(evt.serverPlayerId || defaultServerB, teamBId, teamBName);
        const currentReturnerStat = isServerA ? getOrCreateStats(evt.receiverPlayerId || defaultServerB, teamBId, teamBName) : getOrCreateStats(evt.receiverPlayerId || defaultServerA, teamAId, teamAName);

        currentServerStat.serviceGamesPlayed += 1;
        currentReturnerStat.returnGamesPlayed += 1;

        if ((gameWonBy === 'TEAM_A' && isServerA) || (gameWonBy === 'TEAM_B' && !isServerA)) {
          currentServerStat.serviceGamesWon += 1; // Hold of serve
        } else {
          currentReturnerStat.returnGamesWon += 1; // Break of serve!
        }

        currentPointIdxA = 0;
        currentPointIdxB = 0;
        isAdvantageA = false;
        isAdvantageB = false;
        totalGamesPlayedInMatch += 1;
        currentGameServerTeamId = currentGameServerTeamId === teamAId ? teamBId : teamAId;

        const currSetObj = setScores.find((s) => s.setNumber === currentSetNumber);
        if (currSetObj) {
          currSetObj.gamesA = currentGamesA;
          currSetObj.gamesB = currentGamesB;
        }

        // Check if Set is won or Tie-break triggered
        const minGames = rules.gamesToWinSet;
        const isAdvantageSet = isDecidingSet && rules.finalSetRule === 'ADVANTAGE_SET';

        if (!isAdvantageSet && currentGamesA === rules.tiebreakAtGames && currentGamesB === rules.tiebreakAtGames) {
          // Trigger Tie-break!
          isTiebreak = true;
          tiebreakPointsA = 0;
          tiebreakPointsB = 0;
          if (currSetObj) currSetObj.isTiebreak = true;
        } else if (
          (currentGamesA >= minGames && currentGamesA - currentGamesB >= (rules.setAdvantage ? 2 : 1)) ||
          (currentGamesA === rules.tiebreakAtGames + 1 && currentGamesB === rules.tiebreakAtGames - 1)
        ) {
          // Set won by Team A!
          setsA += 1;
          if (currSetObj) {
            currSetObj.winnerTeamId = teamAId;
            currSetObj.isCompleted = true;
          }
          if (setsA >= rules.setsToWin) {
            // Match Won!
            break;
          } else {
            // Next Set
            currentSetNumber += 1;
            currentGamesA = 0;
            currentGamesB = 0;
            setScores.push({
              setNumber: currentSetNumber,
              gamesA: 0,
              gamesB: 0,
              isTiebreak: false,
              isCompleted: false,
            });
          }
        } else if (
          (currentGamesB >= minGames && currentGamesB - currentGamesA >= (rules.setAdvantage ? 2 : 1)) ||
          (currentGamesB === rules.tiebreakAtGames + 1 && currentGamesA === rules.tiebreakAtGames - 1)
        ) {
          // Set won by Team B!
          setsB += 1;
          if (currSetObj) {
            currSetObj.winnerTeamId = teamBId;
            currSetObj.isCompleted = true;
          }
          if (setsB >= rules.setsToWin) {
            // Match Won!
            break;
          } else {
            // Next Set
            currentSetNumber += 1;
            currentGamesA = 0;
            currentGamesB = 0;
            setScores.push({
              setNumber: currentSetNumber,
              gamesA: 0,
              gamesB: 0,
              isTiebreak: false,
              isCompleted: false,
            });
          }
        }
      }
    }
  }

  // Calculate percentages across all player stats
  statsMap.forEach((stat) => {
    stat.firstServePct = stat.totalFirstServes > 0 ? (stat.firstServesIn / stat.totalFirstServes) * 100 : 0;
    stat.firstServePointsWonPct = stat.firstServePointsTotal > 0 ? (stat.firstServePointsWon / stat.firstServePointsTotal) * 100 : 0;
    stat.secondServePointsWonPct = stat.secondServePointsTotal > 0 ? (stat.secondServePointsWon / stat.secondServePointsTotal) * 100 : 0;
    stat.breakPointsWonPct = stat.breakPointsTotal > 0 ? (stat.breakPointsWon / stat.breakPointsTotal) * 100 : 0;
    stat.breakPointsSavedPct = stat.breakPointsFaced > 0 ? (stat.breakPointsSaved / stat.breakPointsFaced) * 100 : 0;
    stat.serviceGamesWonPct = stat.serviceGamesPlayed > 0 ? (stat.serviceGamesWon / stat.serviceGamesPlayed) * 100 : 0;
    stat.returnGamesWonPct = stat.returnGamesPlayed > 0 ? (stat.returnGamesWon / stat.returnGamesPlayed) * 100 : 0;
    stat.pointsWonPct = stat.totalPointsPlayed > 0 ? (stat.totalPointsWon / stat.totalPointsPlayed) * 100 : 0;
  });

  // Ensure default stats exist for both teams
  const playerStatsList = Array.from(statsMap.values());
  const teamAStat = playerStatsList.find((s) => s.teamId === teamAId) || createDefaultPlayerStats(defaultServerA, teamAName, teamAId, teamAName, teamAPlayers[0]);
  const teamBStat = playerStatsList.find((s) => s.teamId === teamBId) || createDefaultPlayerStats(defaultServerB, teamBName, teamBId, teamBName, teamBPlayers[0]);

  // Current Live Points Display
  let currentPointsA = '0';
  let currentPointsB = '0';
  let isDeuce = false;

  if (isTiebreak || isMatchTiebreak) {
    currentPointsA = String(tiebreakPointsA);
    currentPointsB = String(tiebreakPointsB);
  } else {
    if (isAdvantageA) {
      currentPointsA = 'AD';
      currentPointsB = '40';
    } else if (isAdvantageB) {
      currentPointsA = '40';
      currentPointsB = 'AD';
    } else {
      currentPointsA = pointIndexToDisplay(currentPointIdxA);
      currentPointsB = pointIndexToDisplay(currentPointIdxB);
      if (currentPointIdxA === 3 && currentPointIdxB === 3) {
        isDeuce = true;
      }
    }
  }

  // Active server resolution
  let activeServingTeamId = currentGameServerTeamId;
  let activeServingPlayerId = manualServerPlayerId || (activeServingTeamId === teamAId ? defaultServerA : defaultServerB);
  let activeReceivingTeamId = activeServingTeamId === teamAId ? teamBId : teamAId;
  let activeReceivingPlayerId = activeReceivingTeamId === teamAId ? defaultServerA : defaultServerB;

  // In tiebreak, server alternates after pt 1, then every 2 points
  if (isTiebreak || isMatchTiebreak) {
    const totalTbPoints = tiebreakPointsA + tiebreakPointsB;
    const isOddBlock = Math.floor((totalTbPoints + 1) / 2) % 2 === 1;
    activeServingTeamId = isOddBlock ? firstServerTeamId : (firstServerTeamId === teamAId ? teamBId : teamAId);
    activeServingPlayerId = activeServingTeamId === teamAId ? defaultServerA : defaultServerB;
    activeReceivingTeamId = activeServingTeamId === teamAId ? teamBId : teamAId;
    activeReceivingPlayerId = activeReceivingTeamId === teamAId ? defaultServerA : defaultServerB;
  }

  const servingPlayerObj = allPlayers.find((p) => p.id === activeServingPlayerId);
  const receivingPlayerObj = allPlayers.find((p) => p.id === activeReceivingPlayerId);

  // Automatic Game Point, Break Point, Set Point, Match Point detection
  let isGamePoint = false;
  let gamePointTeamId: string | undefined = undefined;
  let isBreakPoint = false;
  let breakPointTeamId: string | undefined = undefined;
  let isSetPoint = false;
  let setPointTeamId: string | undefined = undefined;
  let isMatchPoint = false;
  let matchPointTeamId: string | undefined = undefined;

  const isMatchComplete = setsA >= rules.setsToWin || setsB >= rules.setsToWin;
  let winnerTeamId: string | undefined = undefined;
  let winnerPlayerName: string | undefined = undefined;
  let matchResultText: string | undefined = undefined;

  if (isMatchComplete) {
    winnerTeamId = setsA >= rules.setsToWin ? teamAId : teamBId;
    winnerPlayerName = winnerTeamId === teamAId ? teamAName : teamBName;
    const scoresStr = setScores
      .filter((s) => s.isCompleted)
      .map((s) => `${s.gamesA}-${s.gamesB}${s.tiebreakScoreA !== undefined && s.tiebreakScoreB !== undefined ? `(${Math.min(s.tiebreakScoreA, s.tiebreakScoreB)})` : ''}`)
      .join(', ');
    matchResultText = `${winnerPlayerName} won ${setsA > setsB ? `${setsA}-${setsB}` : `${setsB}-${setsA}`} (${scoresStr})`;
  } else {
    // Check points away from game/set/match
    const isServingA = activeServingTeamId === teamAId;
    const targetTb = isMatchTiebreak ? 10 : rules.tiebreakPoints;

    const isPointAwayA = isTiebreak || isMatchTiebreak
      ? tiebreakPointsA >= targetTb - 1 && tiebreakPointsA > tiebreakPointsB
      : isAdvantageA || (currentPointIdxA === 3 && currentPointIdxB < 3) || (rules.noAdScoring && isDeuce);

    const isPointAwayB = isTiebreak || isMatchTiebreak
      ? tiebreakPointsB >= targetTb - 1 && tiebreakPointsB > tiebreakPointsA
      : isAdvantageB || (currentPointIdxB === 3 && currentPointIdxA < 3) || (rules.noAdScoring && isDeuce);

    if (isPointAwayA) {
      if (isServingA) {
        isGamePoint = true;
        gamePointTeamId = teamAId;
      } else {
        isBreakPoint = true;
        breakPointTeamId = teamAId;
      }

      // Check if winning this game wins the set
      const willWinSetA = isTiebreak || isMatchTiebreak || (currentGamesA + 1 >= rules.gamesToWinSet && (currentGamesA + 1) - currentGamesB >= (rules.setAdvantage ? 2 : 1));
      if (willWinSetA) {
        isSetPoint = true;
        setPointTeamId = teamAId;
        if (setsA + 1 >= rules.setsToWin) {
          isMatchPoint = true;
          matchPointTeamId = teamAId;
        }
      }
    } else if (isPointAwayB) {
      if (!isServingA) {
        isGamePoint = true;
        gamePointTeamId = teamBId;
      } else {
        isBreakPoint = true;
        breakPointTeamId = teamBId;
      }

      // Check if winning this game wins the set
      const willWinSetB = isTiebreak || isMatchTiebreak || (currentGamesB + 1 >= rules.gamesToWinSet && (currentGamesB + 1) - currentGamesA >= (rules.setAdvantage ? 2 : 1));
      if (willWinSetB) {
        isSetPoint = true;
        setPointTeamId = teamBId;
        if (setsB + 1 >= rules.setsToWin) {
          isMatchPoint = true;
          matchPointTeamId = teamBId;
        }
      }
    }
  }

  const lastEvent = activeEvents.length > 0 ? activeEvents[activeEvents.length - 1] : undefined;

  return {
    sport: 'TENNIS',
    match,
    currentSet: currentSetNumber,
    setsA,
    setsB,
    currentGamesA,
    currentGamesB,
    currentPointsA,
    currentPointsB,
    currentGameScoreA: currentPointsA,
    currentGameScoreB: currentPointsB,
    scoreA: currentPointsA,
    scoreB: currentPointsB,
    currentPointDisplayA: currentPointsA,
    currentPointDisplayB: currentPointsB,
    isDeuce,
    isAdvantageA,
    isAdvantageB,
    isTiebreak,
    isMatchTiebreak,
    servingTeamId: activeServingTeamId,
    servingPlayerId: activeServingPlayerId,
    servingPlayerName: servingPlayerObj?.name || (activeServingTeamId === teamAId ? teamAName : teamBName),
    receivingTeamId: activeReceivingTeamId,
    receivingPlayerId: activeReceivingPlayerId,
    receivingPlayerName: receivingPlayerObj?.name || (activeReceivingTeamId === teamAId ? teamAName : teamBName),
    isFirstServeFaultActive,
    isBreakPoint,
    breakPointTeamId,
    isSetPoint,
    setPointTeamId,
    isMatchPoint,
    matchPointTeamId,
    isGamePoint,
    gamePointTeamId,
    setScores,
    teamAStats: teamAStat,
    teamBStats: teamBStat,
    playerStats: playerStatsList,
    teamAPlayers,
    teamBPlayers,
    isMatchComplete,
    winnerTeamId,
    winnerPlayerName,
    matchResultText,
    events: activeEvents,
    lastEvent,
  };
}
