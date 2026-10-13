import {
  Match,
  CricketBallEvent,
  CricketInnings,
  CricketMatchScoringState,
  BatsmanInningsStats,
  BowlerFiguresStats,
  FallOfWicket,
  Partnership,
  ExtrasSummary,
  ExtraType,
  WicketType,
  BroadcastEventType,
  Player,
  Tournament,
} from '../../src/types';

/**
 * Pure calculation engine for Cricket Live Scoring
 * Recalculates all match state, batsman stats, bowler stats, extras, overs,
 * fall of wickets, partnerships, and strike rotation from ball-by-ball events.
 */
export function calculateCricketScoringState(
  match: Match,
  inningsList: CricketInnings[],
  events: CricketBallEvent[],
  allPlayers: Player[],
  tournament?: Tournament
): CricketMatchScoringState {
  const activeEvents = events.filter((e) => !e.isUndone);
  activeEvents.sort((a, b) => a.eventSequence - b.eventSequence);

  // Identify Innings 1 and Innings 2
  let innings1 = inningsList.find((i) => i.inningsNumber === 1);
  let innings2 = inningsList.find((i) => i.inningsNumber === 2);

  // Default active innings is the current in-progress or last created innings
  let currentInnings =
    inningsList.find((i) => i.status === 'IN_PROGRESS') ||
    (innings2 && innings2.status !== 'NOT_STARTED' ? innings2 : innings1);

  const activeInningsNumber = currentInnings ? currentInnings.inningsNumber : 1;
  const inningsEvents = activeEvents.filter((e) => e.inningsNumber === activeInningsNumber);

  const battingTeamId = currentInnings ? currentInnings.battingTeamId : match.teamAId;
  const bowlingTeamId = currentInnings ? currentInnings.bowlingTeamId : match.teamBId;

  const battingPlayers = allPlayers.filter((p) => p.teamId === battingTeamId);
  const bowlingPlayers = allPlayers.filter((p) => p.teamId === bowlingTeamId);

  // 1. Calculate Extras
  const extras: ExtrasSummary = {
    wides: 0,
    noBalls: 0,
    byes: 0,
    legByes: 0,
    penalties: 0,
    total: 0,
  };

  inningsEvents.forEach((e) => {
    if (e.extraType === 'WIDE') extras.wides += e.extraRuns;
    if (e.extraType === 'NO_BALL') extras.noBalls += 1; // 1 run extra for no ball
    if (e.extraType === 'BYE') extras.byes += e.extraRuns;
    if (e.extraType === 'LEG_BYE') extras.legByes += e.extraRuns;
    if (e.extraType === 'PENALTY') extras.penalties += e.extraRuns;
  });
  extras.total = extras.wides + extras.noBalls + extras.byes + extras.legByes + extras.penalties;

  // 2. Legal Balls & Total Score
  const legalBallsCount = inningsEvents.filter((e) => e.isLegalBall).length;
  const totalRuns = inningsEvents.reduce((sum, e) => sum + e.totalRuns, 0);

  // Total Wickets
  const wicketEvents = inningsEvents.filter((e) => e.isWicket && e.wicketType !== 'RETIRED_HURT');
  const totalWickets = wicketEvents.length;

  const totalOvers = Math.floor(legalBallsCount / 6) + (legalBallsCount % 6) / 10;
  const currentRunRate = legalBallsCount > 0 ? Number(((totalRuns / legalBallsCount) * 6).toFixed(2)) : 0;

  // 3. Fall of Wickets
  const fallOfWickets: FallOfWicket[] = [];
  let cumulativeScore = 0;
  let cumulativeLegalBalls = 0;
  let wCount = 0;

  inningsEvents.forEach((e) => {
    cumulativeScore += e.totalRuns;
    if (e.isLegalBall) cumulativeLegalBalls += 1;

    if (e.isWicket && e.wicketType !== 'RETIRED_HURT') {
      wCount += 1;
      const dismissedPlayer = allPlayers.find((p) => p.id === e.dismissedPlayerId);
      const overStr = `${Math.floor(cumulativeLegalBalls / 6)}.${cumulativeLegalBalls % 6}`;

      fallOfWickets.push({
        wicketNumber: wCount,
        runs: cumulativeScore,
        oversDisplay: overStr,
        dismissedPlayerId: e.dismissedPlayerId || '',
        dismissedPlayerName: dismissedPlayer?.name || 'Unknown Player',
      });
    }
  });

  // 4. Batsmen Stats
  const batsmenStatsMap = new Map<string, BatsmanInningsStats>();

  // Helper to ensure player exists in map
  const getOrCreateBatsman = (pId: string): BatsmanInningsStats => {
    if (!batsmenStatsMap.has(pId)) {
      const p = allPlayers.find((player) => player.id === pId);
      batsmenStatsMap.set(pId, {
        playerId: pId,
        playerName: p ? p.name : 'Unknown Player',
        runs: 0,
        ballsFaced: 0,
        fours: 0,
        sixes: 0,
        strikeRate: 0,
        isOut: false,
        isStriker: false,
        isNonStriker: false,
      });
    }
    return batsmenStatsMap.get(pId)!;
  };

  // Replay deliveries for batsmen stats
  inningsEvents.forEach((e) => {
    if (e.strikerId) {
      const striker = getOrCreateBatsman(e.strikerId);
      striker.runs += e.runsOffBat;

      // Wides do NOT count as balls faced by striker
      if (e.extraType !== 'WIDE') {
        striker.ballsFaced += 1;
      }

      if (e.isFour && e.runsOffBat >= 4) striker.fours += 1;
      if (e.isSix && e.runsOffBat >= 6) striker.sixes += 1;
    }

    if (e.nonStrikerId) {
      getOrCreateBatsman(e.nonStrikerId);
    }

    if (e.isWicket && e.dismissedPlayerId) {
      const dismissed = getOrCreateBatsman(e.dismissedPlayerId);
      dismissed.isOut = true;

      const bowler = allPlayers.find((p) => p.id === e.bowlerId);
      const fielder = allPlayers.find((p) => p.id === e.fielderId);
      const assistFielder = allPlayers.find((p) => p.id === e.assistFielderId);

      let info = 'out';
      switch (e.wicketType) {
        case 'BOWLED':
          info = `b ${bowler?.name || 'Bowler'}`;
          break;
        case 'CAUGHT':
          info = `c ${fielder?.name || 'Fielder'} b ${bowler?.name || 'Bowler'}`;
          break;
        case 'CAUGHT_BEHIND':
          info = `c †${fielder?.name || 'Keeper'} b ${bowler?.name || 'Bowler'}`;
          break;
        case 'CAUGHT_BOWLED':
          info = `c & b ${bowler?.name || 'Bowler'}`;
          break;
        case 'LBW':
          info = `lbw b ${bowler?.name || 'Bowler'}`;
          break;
        case 'STUMPED':
          info = `st †${fielder?.name || 'Keeper'} b ${bowler?.name || 'Bowler'}`;
          break;
        case 'RUN_OUT':
          info = `run out (${fielder?.name || 'Fielder'}${assistFielder ? `/${assistFielder.name}` : ''})`;
          break;
        case 'HIT_WICKET':
          info = `hit wicket b ${bowler?.name || 'Bowler'}`;
          break;
        case 'RETIRED_HURT':
          info = 'retired hurt';
          break;
        case 'RETIRED_OUT':
          info = 'retired out';
          break;
        default:
          info = e.wicketType || 'out';
      }
      dismissed.dismissalInfo = info;
    }
  });

  // Calculate Strike Rates
  batsmenStatsMap.forEach((b) => {
    b.strikeRate = b.ballsFaced > 0 ? Number(((b.runs / b.ballsFaced) * 100).toFixed(2)) : 0;
  });

  // 5. Bowler Stats
  const bowlerStatsMap = new Map<string, BowlerFiguresStats>();

  const getOrCreateBowler = (bId: string): BowlerFiguresStats => {
    if (!bowlerStatsMap.has(bId)) {
      const p = allPlayers.find((player) => player.id === bId);
      bowlerStatsMap.set(bId, {
        playerId: bId,
        playerName: p ? p.name : 'Unknown Bowler',
        overs: 0,
        oversDisplay: '0.0',
        legalBalls: 0,
        maidens: 0,
        runsConceded: 0,
        wickets: 0,
        economy: 0,
        wides: 0,
        noBalls: 0,
        isCurrentBowler: false,
      });
    }
    return bowlerStatsMap.get(bId)!;
  };

  // Group events by over number for maiden calculations & bowler figures
  const overEventsMap = new Map<number, CricketBallEvent[]>();
  inningsEvents.forEach((e) => {
    if (e.bowlerId) {
      const bStats = getOrCreateBowler(e.bowlerId);

      if (e.isLegalBall) {
        bStats.legalBalls += 1;
      }

      // Conceded runs = bat runs + wides + no-ball extra. (Byes & Leg Byes do NOT count against bowler)
      if (e.extraType === 'WIDE') {
        bStats.runsConceded += e.extraRuns;
        bStats.wides += 1;
      } else if (e.extraType === 'NO_BALL') {
        bStats.runsConceded += 1 + e.runsOffBat;
        bStats.noBalls += 1;
      } else if (e.extraType === 'NONE') {
        bStats.runsConceded += e.runsOffBat;
      }

      // Wickets credited to bowler
      if (
        e.isWicket &&
        [
          'BOWLED',
          'CAUGHT',
          'CAUGHT_BEHIND',
          'CAUGHT_BOWLED',
          'LBW',
          'STUMPED',
          'HIT_WICKET',
        ].includes(e.wicketType || '')
      ) {
        bStats.wickets += 1;
      }

      if (!overEventsMap.has(e.overNumber)) {
        overEventsMap.set(e.overNumber, []);
      }
      overEventsMap.get(e.overNumber)!.push(e);
    }
  });

  // Calculate maidens per over
  overEventsMap.forEach((oEvents) => {
    const legalInOver = oEvents.filter((e) => e.isLegalBall).length;
    if (legalInOver === 6) {
      const bowlerId = oEvents[0].bowlerId;
      const bStats = bowlerStatsMap.get(bowlerId);
      if (bStats) {
        // Runs conceded in this over
        const overRunsConceded = oEvents.reduce((sum, e) => {
          if (e.extraType === 'WIDE') return sum + e.extraRuns;
          if (e.extraType === 'NO_BALL') return sum + 1 + e.runsOffBat;
          if (e.extraType === 'NONE') return sum + e.runsOffBat;
          return sum; // Byes & Leg Byes don't count against bowler
        }, 0);

        if (overRunsConceded === 0) {
          bStats.maidens += 1;
        }
      }
    }
  });

  bowlerStatsMap.forEach((b) => {
    b.oversDisplay = `${Math.floor(b.legalBalls / 6)}.${b.legalBalls % 6}`;
    b.overs = Math.floor(b.legalBalls / 6) + (b.legalBalls % 6) / 10;
    b.economy = b.legalBalls > 0 ? Number(((b.runsConceded / b.legalBalls) * 6).toFixed(2)) : 0;
  });

  // 6. Current Over Events & Over Completion
  const currentOverNumber = Math.floor(legalBallsCount / 6);
  const currentOverEvents = inningsEvents.filter((e) => e.overNumber === currentOverNumber);
  const legalInCurrentOver = currentOverEvents.filter((e) => e.isLegalBall).length;
  const isOverComplete = legalInCurrentOver === 6;

  // 7. Active Striker, Non-Striker, Current Bowler
  const lastEvent = inningsEvents.length > 0 ? inningsEvents[inningsEvents.length - 1] : null;

  let strikerId = currentInnings?.currentStrikerId || lastEvent?.strikerId || '';
  let nonStrikerId = currentInnings?.currentNonStrikerId || lastEvent?.nonStrikerId || '';
  let currentBowlerId = currentInnings?.currentBowlerId || lastEvent?.bowlerId || '';

  if (strikerId) {
    const s = batsmenStatsMap.get(strikerId);
    if (s) s.isStriker = true;
  }
  if (nonStrikerId) {
    const ns = batsmenStatsMap.get(nonStrikerId);
    if (ns) ns.isNonStriker = true;
  }
  if (currentBowlerId) {
    const cb = bowlerStatsMap.get(currentBowlerId);
    if (cb) cb.isCurrentBowler = true;
  }

  // 8. Partnership
  let currentPartnershipRuns = 0;
  let currentPartnershipBalls = 0;

  for (let i = inningsEvents.length - 1; i >= 0; i--) {
    const e = inningsEvents[i];
    if (e.isWicket && e.wicketType !== 'RETIRED_HURT') break;
    currentPartnershipRuns += e.totalRuns;
    if (e.isLegalBall) currentPartnershipBalls += 1;
  }

  const currentPartnership: Partnership = {
    runs: currentPartnershipRuns,
    balls: currentPartnershipBalls,
    player1Id: strikerId,
    player2Id: nonStrikerId,
    player1Name: allPlayers.find((p) => p.id === strikerId)?.name,
    player2Name: allPlayers.find((p) => p.id === nonStrikerId)?.name,
  };

  // 9. Target & Chase Stats for Innings 2
  let target: number | undefined;
  let runsRequired: number | undefined;
  let ballsRemaining: number | undefined;
  let requiredRunRate: number | undefined;

  const maxOvers =
    (match.cricketConfig?.overs && Number(match.cricketConfig.overs) > 0)
      ? Number(match.cricketConfig.overs)
      : (match.cricketConfig?.matchOvers && Number(match.cricketConfig.matchOvers) > 0)
      ? Number(match.cricketConfig.matchOvers)
      : (match.effectiveMatchOvers && Number(match.effectiveMatchOvers) > 0)
      ? Number(match.effectiveMatchOvers)
      : (tournament?.cricketDefaultOvers && Number(tournament.cricketDefaultOvers) > 0)
      ? Number(tournament.cricketDefaultOvers)
      : 20;
  const maxMatchBalls = maxOvers * 6;

  if (activeInningsNumber === 2 && innings1) {
    target = (innings1.totalRuns || 0) + 1;
    runsRequired = Math.max(0, target - totalRuns);
    ballsRemaining = Math.max(0, maxMatchBalls - legalBallsCount);
    requiredRunRate = ballsRemaining > 0 ? Number(((runsRequired / ballsRemaining) * 6).toFixed(2)) : 0;
  }

  // 10. Check Innings / Match Completion Conditions
  let isMatchComplete = match.status === 'COMPLETED';
  let matchResult: string | undefined;

  if (activeInningsNumber === 2 && target !== undefined) {
    if (totalRuns >= target) {
      isMatchComplete = true;
      const wicketsLeft = 10 - totalWickets;
      const battingTeam = allPlayers.find((p) => p.teamId === battingTeamId);
      matchResult = `Match Won by Team (${wicketsLeft} wickets remaining)`;
    } else if (totalWickets >= 10 || legalBallsCount >= maxMatchBalls) {
      isMatchComplete = true;
      if (totalRuns === target - 1) {
        matchResult = 'Match Tied!';
      } else {
        const runsMargin = target - 1 - totalRuns;
        matchResult = `Match Won by Bowling Team (by ${runsMargin} runs)`;
      }
    }
  } else if (activeInningsNumber === 1) {
    if (totalWickets >= 10 || legalBallsCount >= maxMatchBalls) {
      // Innings 1 naturally completed
    }
  }

  let calculatedScoreA = 0;
  let calculatedScoreB = 0;
  let calculatedWicketsA = 0;
  let calculatedWicketsB = 0;

  if (innings1) {
    if (innings1.battingTeamId === match.teamAId) {
      calculatedScoreA = activeInningsNumber === 1 ? totalRuns : (innings1.totalRuns || 0);
      calculatedWicketsA = activeInningsNumber === 1 ? totalWickets : (innings1.totalWickets || 0);
      calculatedScoreB = activeInningsNumber === 2 ? totalRuns : (innings2?.totalRuns || 0);
      calculatedWicketsB = activeInningsNumber === 2 ? totalWickets : (innings2?.totalWickets || 0);
    } else {
      calculatedScoreB = activeInningsNumber === 1 ? totalRuns : (innings1.totalRuns || 0);
      calculatedWicketsB = activeInningsNumber === 1 ? totalWickets : (innings1.totalWickets || 0);
      calculatedScoreA = activeInningsNumber === 2 ? totalRuns : (innings2?.totalRuns || 0);
      calculatedWicketsA = activeInningsNumber === 2 ? totalWickets : (innings2?.totalWickets || 0);
    }
  } else {
    if (battingTeamId === match.teamAId) {
      calculatedScoreA = totalRuns;
      calculatedWicketsA = totalWickets;
    } else {
      calculatedScoreB = totalRuns;
      calculatedWicketsB = totalWickets;
    }
  }

  return {
    match,
    innings1,
    innings2,
    scoreA: calculatedScoreA,
    scoreB: calculatedScoreB,
    wicketsA: calculatedWicketsA,
    wicketsB: calculatedWicketsB,
    currentInningsNumber: activeInningsNumber,
    currentInnings: currentInnings
      ? {
          ...currentInnings,
          totalRuns,
          totalWickets,
          totalOvers,
          legalBallsCount,
          currentStrikerId: strikerId,
          currentNonStrikerId: nonStrikerId,
          currentBowlerId,
        }
      : undefined,
    totalRuns,
    totalWickets,
    wickets: totalWickets,
    overs: totalOvers,
    events: inningsEvents,
    batsmenStats: Array.from(batsmenStatsMap.values()),
    bowlerStats: Array.from(bowlerStatsMap.values()),
    fallOfWickets,
    currentPartnership,
    extras,
    currentOverEvents,
    target,
    runsRequired,
    ballsRemaining,
    requiredRunRate,
    currentRunRate,
    isOverComplete,
    isMatchComplete,
    matchResult,
  };
}
