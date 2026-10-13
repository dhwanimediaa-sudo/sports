import {
  Match,
  Player,
  BasketballScoringEvent,
  BasketballMatchClock,
  BasketballMatchScoringState,
  BasketballPlayerStats,
  BasketballTeamStats,
  BasketballPeriodScore,
  BasketballEventType,
  BasketballShotType,
  BasketballShotResult,
  BasketballReboundType,
  BasketballTurnoverType,
  BasketballFoulType,
} from '../../src/types';

export interface BasketballMatchRules {
  quarters: number; // default 4
  quarterDuration: number; // in minutes (default 10)
  quarterDurationSeconds: number;
  halfTimeDuration: number; // in minutes (default 15)
  overtimeDuration: number; // in minutes (default 5)
  overtimeDurationSeconds: number;
  shotClockDuration: number; // in seconds (default 24)
  shotClockOffensiveRebound: number; // in seconds (default 14)
  playerFoulLimit: number; // default 5 (or 6 for NBA)
  teamFoulBonusLimit: number; // default 5 fouls per quarter
  timeoutsPerTeam: number; // default 5
  competitionRules?: string;
}

export function getBasketballMatchRules(match: Match): BasketballMatchRules {
  const cfg = match.basketballConfig || ({} as any);
  const quarters = Number(cfg.quarters) || 4;
  const quarterDuration = Number(cfg.quarterDuration) || 10;
  const overtimeDuration = Number(cfg.overtimeDuration) || 5;
  const shotClockDuration = Number(cfg.shotClockDuration) || 24;
  const shotClockOffensiveRebound = Number(cfg.shotClockOffensiveRebound) || 14;
  const playerFoulLimit = Number(cfg.playerFoulLimit) || 5;
  const teamFoulBonusLimit = Number(cfg.teamFoulBonusLimit) || 5;
  const timeoutsPerTeam = Number(cfg.timeoutsPerTeam) || 5;

  return {
    quarters,
    quarterDuration,
    quarterDurationSeconds: quarterDuration * 60,
    halfTimeDuration: Number(cfg.halfTimeDuration) || 15,
    overtimeDuration,
    overtimeDurationSeconds: overtimeDuration * 60,
    shotClockDuration,
    shotClockOffensiveRebound,
    playerFoulLimit,
    teamFoulBonusLimit,
    timeoutsPerTeam,
    competitionRules: cfg.competitionRules || 'FIBA',
  };
}

export function getBasketballQuarterShortName(quarter: number, regularQuarters = 4): string {
  if (quarter <= regularQuarters) {
    return `Q${quarter}`;
  }
  const otNum = quarter - regularQuarters;
  return otNum === 1 ? 'OT' : `OT${otNum}`;
}

export function getBasketballQuarterDisplayName(quarter: number, regularQuarters = 4): string {
  if (quarter <= regularQuarters) {
    switch (quarter) {
      case 1:
        return '1st Quarter';
      case 2:
        return '2nd Quarter';
      case 3:
        return '3rd Quarter';
      case 4:
        return '4th Quarter';
      default:
        return `Quarter ${quarter}`;
    }
  }
  const otNum = quarter - regularQuarters;
  return otNum === 1 ? 'Overtime' : `Overtime ${otNum}`;
}

export function formatBasketballMatchTime(secondsRemaining: number): string {
  if (secondsRemaining < 0) secondsRemaining = 0;
  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  const minsPadded = mins < 10 ? `0${mins}` : `${mins}`;
  const secsPadded = secs < 10 ? `0${secs}` : `${secs}`;
  return `${minsPadded}:${secsPadded}`;
}

/**
 * Pure Live Scoring State Calculation for Basketball
 * Source of truth: immutable basketball_scoring_events list + clock state
 */
export function calculateBasketballScoringState(
  match: Match,
  events: BasketballScoringEvent[],
  clockState: BasketballMatchClock | undefined,
  allPlayers: Player[]
): BasketballMatchScoringState {
  const rules = getBasketballMatchRules(match);
  const teamAId = match.teamAId;
  const teamBId = match.teamBId;
  const teamAName = match.teamA?.name || 'Team A';
  const teamBName = match.teamB?.name || 'Team B';

  // Extract starting five and squads
  const startingFiveA = (match.teamASquad?.playingIds || []).slice(0, 5);
  const startingFiveB = (match.teamBSquad?.playingIds || []).slice(0, 5);
  const squadAIds = [
    ...(match.teamASquad?.playingIds || []),
    ...(match.teamASquad?.substituteIds || []),
  ];
  const squadBIds = [
    ...(match.teamBSquad?.playingIds || []),
    ...(match.teamBSquad?.substituteIds || []),
  ];

  // Active on-court lineup (starts with starting five, updated by substitution events)
  let activeOnCourtA = [...startingFiveA];
  let activeOnCourtB = [...startingFiveB];

  // Initialize Player Stats Map
  const playerStatsMap = new Map<string, BasketballPlayerStats>();

  const initPlayerStats = (player: Player, teamId: string, teamName: string, isStarter: boolean): BasketballPlayerStats => ({
    playerId: player.id,
    playerName: player.name,
    jerseyNumber: player.jerseyNumber,
    teamId,
    teamName,
    isStarter,
    isCaptain: player.isCaptain || player.id === (teamId === teamAId ? match.teamASquad?.captainId : match.teamBSquad?.captainId),
    position: player.playingPosition || player.role || 'PLAYER',
    isFouledOut: false,
    points: 0,
    fgm: 0,
    fga: 0,
    fgPct: 0,
    twoPm: 0,
    twoPa: 0,
    twoPct: 0,
    threePm: 0,
    threePa: 0,
    threePct: 0,
    ftm: 0,
    fta: 0,
    ftPct: 0,
    orb: 0,
    drb: 0,
    trb: 0,
    assists: 0,
    steals: 0,
    blocks: 0,
    turnovers: 0,
    personalFouls: 0,
    technicalFouls: 0,
    efficiency: 0,
    minutesPlayed: 0,
  });

  // Populate players for Team A
  allPlayers
    .filter((p) => p.teamId === teamAId || squadAIds.includes(p.id))
    .forEach((p) => {
      playerStatsMap.set(p.id, initPlayerStats(p, teamAId, teamAName, startingFiveA.includes(p.id)));
    });

  // Populate players for Team B
  allPlayers
    .filter((p) => p.teamId === teamBId || squadBIds.includes(p.id))
    .forEach((p) => {
      playerStatsMap.set(p.id, initPlayerStats(p, teamBId, teamBName, startingFiveB.includes(p.id)));
    });

  // Team Fouls tracking per quarter: { [quarterNumber]: number }
  const teamAFoulsPerQuarter: Record<number, number> = {};
  const teamBFoulsPerQuarter: Record<number, number> = {};
  for (let q = 1; q <= Math.max(rules.quarters, clockState?.currentQuarter || rules.quarters); q++) {
    teamAFoulsPerQuarter[q] = 0;
    teamBFoulsPerQuarter[q] = 0;
  }

  // Quarter scores tracking: { [quarterNumber]: { a: number, b: number } }
  const quarterScoresMap = new Map<number, { a: number; b: number; foulsA: number; foulsB: number }>();
  for (let q = 1; q <= Math.max(rules.quarters, clockState?.currentQuarter || rules.quarters); q++) {
    quarterScoresMap.set(q, { a: 0, b: 0, foulsA: 0, foulsB: 0 });
  }

  let runningScoreA = 0;
  let runningScoreB = 0;
  let timeoutsUsedA = 0;
  let timeoutsUsedB = 0;
  const fouledOutPlayersSet = new Set<string>();

  // Filter non-undone events in chronological order
  const validEvents = events
    .filter((e) => !e.isUndone)
    .sort((a, b) => a.eventSequence - b.eventSequence);

  for (const evt of validEvents) {
    const qNum = evt.quarter || 1;
    if (!quarterScoresMap.has(qNum)) {
      quarterScoresMap.set(qNum, { a: 0, b: 0, foulsA: 0, foulsB: 0 });
      teamAFoulsPerQuarter[qNum] = 0;
      teamBFoulsPerQuarter[qNum] = 0;
    }

    const qStats = quarterScoresMap.get(qNum)!;
    const isTeamA = evt.teamId === teamAId;

    // 1. Scoring Events
    const rawType = evt.eventType as string;
    if (rawType === 'SCORE_1PT' || rawType === 'ONE_POINT') {
      const pts = evt.pointsScored ?? 1;
      if (isTeamA) {
        runningScoreA += pts;
        qStats.a += pts;
      } else {
        runningScoreB += pts;
        qStats.b += pts;
      }

      if (evt.playerId && playerStatsMap.has(evt.playerId)) {
        const ps = playerStatsMap.get(evt.playerId)!;
        ps.points += pts;
        ps.ftm += 1;
        ps.fta += 1;
      }
    } else if (rawType === 'SCORE_2PT' || rawType === 'TWO_POINT') {
      const pts = evt.pointsScored ?? 2;
      if (isTeamA) {
        runningScoreA += pts;
        qStats.a += pts;
      } else {
        runningScoreB += pts;
        qStats.b += pts;
      }

      if (evt.playerId && playerStatsMap.has(evt.playerId)) {
        const ps = playerStatsMap.get(evt.playerId)!;
        ps.points += pts;
        ps.fgm += 1;
        ps.fga += 1;
        ps.twoPm += 1;
        ps.twoPa += 1;
      }

      // Assist attribution
      if (evt.assistPlayerId && playerStatsMap.has(evt.assistPlayerId)) {
        const aps = playerStatsMap.get(evt.assistPlayerId)!;
        aps.assists += 1;
      }
    } else if (rawType === 'SCORE_3PT' || rawType === 'THREE_POINT') {
      const pts = evt.pointsScored ?? 3;
      if (isTeamA) {
        runningScoreA += pts;
        qStats.a += pts;
      } else {
        runningScoreB += pts;
        qStats.b += pts;
      }

      if (evt.playerId && playerStatsMap.has(evt.playerId)) {
        const ps = playerStatsMap.get(evt.playerId)!;
        ps.points += pts;
        ps.fgm += 1;
        ps.fga += 1;
        ps.threePm += 1;
        ps.threePa += 1;
      }

      // Assist attribution
      if (evt.assistPlayerId && playerStatsMap.has(evt.assistPlayerId)) {
        const aps = playerStatsMap.get(evt.assistPlayerId)!;
        aps.assists += 1;
      }
    } else if (evt.eventType === 'MISS_1PT') {
      if (evt.playerId && playerStatsMap.has(evt.playerId)) {
        const ps = playerStatsMap.get(evt.playerId)!;
        ps.fta += 1;
      }
    } else if (evt.eventType === 'MISS_2PT') {
      if (evt.playerId && playerStatsMap.has(evt.playerId)) {
        const ps = playerStatsMap.get(evt.playerId)!;
        ps.fga += 1;
        ps.twoPa += 1;
      }
    } else if (evt.eventType === 'MISS_3PT') {
      if (evt.playerId && playerStatsMap.has(evt.playerId)) {
        const ps = playerStatsMap.get(evt.playerId)!;
        ps.fga += 1;
        ps.threePa += 1;
      }
    } else if (evt.eventType === 'REBOUND') {
      if (evt.playerId && playerStatsMap.has(evt.playerId)) {
        const ps = playerStatsMap.get(evt.playerId)!;
        if (evt.reboundType === 'OFFENSIVE') {
          ps.orb += 1;
        } else {
          ps.drb += 1;
        }
        ps.trb = ps.orb + ps.drb;
      }
    } else if (evt.eventType === 'ASSIST') {
      if (evt.playerId && playerStatsMap.has(evt.playerId)) {
        const ps = playerStatsMap.get(evt.playerId)!;
        ps.assists += 1;
      }
    } else if (evt.eventType === 'STEAL') {
      if (evt.playerId && playerStatsMap.has(evt.playerId)) {
        const ps = playerStatsMap.get(evt.playerId)!;
        ps.steals += 1;
      }
    } else if (evt.eventType === 'BLOCK') {
      if (evt.playerId && playerStatsMap.has(evt.playerId)) {
        const ps = playerStatsMap.get(evt.playerId)!;
        ps.blocks += 1;
      }
    } else if (evt.eventType === 'TURNOVER' || evt.eventType === 'SHOT_CLOCK_VIOLATION') {
      if (evt.playerId && playerStatsMap.has(evt.playerId)) {
        const ps = playerStatsMap.get(evt.playerId)!;
        ps.turnovers += 1;
      }
    } else if (
      evt.eventType === 'FOUL_PERSONAL' ||
      evt.eventType === 'FOUL_SHOOTING' ||
      evt.eventType === 'FOUL_OFFENSIVE' ||
      evt.eventType === 'FOUL_TECHNICAL' ||
      evt.eventType === 'FOUL_FLAGRANT' ||
      evt.eventType === 'FOUL_TEAM'
    ) {
      if (isTeamA) {
        teamAFoulsPerQuarter[qNum] = (teamAFoulsPerQuarter[qNum] || 0) + 1;
        qStats.foulsA += 1;
      } else {
        teamBFoulsPerQuarter[qNum] = (teamBFoulsPerQuarter[qNum] || 0) + 1;
        qStats.foulsB += 1;
      }

      if (evt.playerId && playerStatsMap.has(evt.playerId)) {
        const ps = playerStatsMap.get(evt.playerId)!;
        if (evt.eventType === 'FOUL_TECHNICAL') {
          ps.technicalFouls += 1;
        } else {
          ps.personalFouls += 1;
        }

        // Check if player has fouled out
        if (ps.personalFouls + ps.technicalFouls >= rules.playerFoulLimit) {
          ps.isFouledOut = true;
          fouledOutPlayersSet.add(ps.playerId);
          // Remove from on-court if present
          if (isTeamA) {
            activeOnCourtA = activeOnCourtA.filter((id) => id !== ps.playerId);
          } else {
            activeOnCourtB = activeOnCourtB.filter((id) => id !== ps.playerId);
          }
        }
      }
    } else if (evt.eventType === 'TIMEOUT') {
      if (isTeamA) {
        timeoutsUsedA += 1;
      } else {
        timeoutsUsedB += 1;
      }
    } else if (evt.eventType === 'SUBSTITUTION') {
      if (isTeamA) {
        if (evt.playerOutId) {
          activeOnCourtA = activeOnCourtA.filter((id) => id !== evt.playerOutId);
        }
        if (evt.playerInId && !activeOnCourtA.includes(evt.playerInId)) {
          activeOnCourtA.push(evt.playerInId);
        }
      } else {
        if (evt.playerOutId) {
          activeOnCourtB = activeOnCourtB.filter((id) => id !== evt.playerOutId);
        }
        if (evt.playerInId && !activeOnCourtB.includes(evt.playerInId)) {
          activeOnCourtB.push(evt.playerInId);
        }
      }
    } else if (evt.eventType === 'SCORE_CORRECTION') {
      runningScoreA = evt.scoreA_after ?? runningScoreA;
      runningScoreB = evt.scoreB_after ?? runningScoreB;
    }
  }

  // Calculate shooting percentages and efficiency for all players
  const playerStatsList: BasketballPlayerStats[] = Array.from(playerStatsMap.values()).map((ps) => {
    ps.trb = ps.orb + ps.drb;
    ps.fgPct = ps.fga > 0 ? Number(((ps.fgm / ps.fga) * 100).toFixed(1)) : 0;
    ps.twoPct = ps.twoPa > 0 ? Number(((ps.twoPm / ps.twoPa) * 100).toFixed(1)) : 0;
    ps.threePct = ps.threePa > 0 ? Number(((ps.threePm / ps.threePa) * 100).toFixed(1)) : 0;
    ps.ftPct = ps.fta > 0 ? Number(((ps.ftm / ps.fta) * 100).toFixed(1)) : 0;

    // Standard NBA Efficiency formula:
    // EFF = (PTS + REB + AST + STL + BLK) - ((FGA - FGM) + (FTA - FTM) + TO)
    const missedFG = ps.fga - ps.fgm;
    const missedFT = ps.fta - ps.ftm;
    ps.efficiency = ps.points + ps.trb + ps.assists + ps.steals + ps.blocks - (missedFG + missedFT + ps.turnovers);

    return ps;
  });

  // Calculate aggregate Team Stats for Team A
  const teamAPlayersStats = playerStatsList.filter((p) => p.teamId === teamAId);
  const teamAFGM = teamAPlayersStats.reduce((sum, p) => sum + p.fgm, 0);
  const teamAFGA = teamAPlayersStats.reduce((sum, p) => sum + p.fga, 0);
  const teamA2PM = teamAPlayersStats.reduce((sum, p) => sum + p.twoPm, 0);
  const teamA2PA = teamAPlayersStats.reduce((sum, p) => sum + p.twoPa, 0);
  const teamA3PM = teamAPlayersStats.reduce((sum, p) => sum + p.threePm, 0);
  const teamA3PA = teamAPlayersStats.reduce((sum, p) => sum + p.threePa, 0);
  const teamAFTM = teamAPlayersStats.reduce((sum, p) => sum + p.ftm, 0);
  const teamAFTA = teamAPlayersStats.reduce((sum, p) => sum + p.fta, 0);
  const teamAORB = teamAPlayersStats.reduce((sum, p) => sum + p.orb, 0);
  const teamADRB = teamAPlayersStats.reduce((sum, p) => sum + p.drb, 0);
  const teamATRB = teamAORB + teamADRB;
  const teamAAST = teamAPlayersStats.reduce((sum, p) => sum + p.assists, 0);
  const teamASTL = teamAPlayersStats.reduce((sum, p) => sum + p.steals, 0);
  const teamABLK = teamAPlayersStats.reduce((sum, p) => sum + p.blocks, 0);
  const teamATO = teamAPlayersStats.reduce((sum, p) => sum + p.turnovers, 0);
  const teamAPF = teamAPlayersStats.reduce((sum, p) => sum + p.personalFouls + p.technicalFouls, 0);

  const teamAStats: BasketballTeamStats = {
    teamId: teamAId,
    teamName: teamAName,
    points: runningScoreA,
    fgm: teamAFGM,
    fga: teamAFGA,
    fgPct: teamAFGA > 0 ? Number(((teamAFGM / teamAFGA) * 100).toFixed(1)) : 0,
    twoPm: teamA2PM,
    twoPa: teamA2PA,
    twoPct: teamA2PA > 0 ? Number(((teamA2PM / teamA2PA) * 100).toFixed(1)) : 0,
    threePm: teamA3PM,
    threePa: teamA3PA,
    threePct: teamA3PA > 0 ? Number(((teamA3PM / teamA3PA) * 100).toFixed(1)) : 0,
    ftm: teamAFTM,
    fta: teamAFTA,
    ftPct: teamAFTA > 0 ? Number(((teamAFTM / teamAFTA) * 100).toFixed(1)) : 0,
    orb: teamAORB,
    drb: teamADRB,
    trb: teamATRB,
    assists: teamAAST,
    steals: teamASTL,
    blocks: teamABLK,
    turnovers: teamATO,
    fouls: teamAPF,
    teamFoulsPerQuarter: teamAFoulsPerQuarter,
    timeoutsUsed: timeoutsUsedA,
    timeoutsRemaining: Math.max(0, rules.timeoutsPerTeam - timeoutsUsedA),
  };

  // Calculate aggregate Team Stats for Team B
  const teamBPlayersStats = playerStatsList.filter((p) => p.teamId === teamBId);
  const teamBFGM = teamBPlayersStats.reduce((sum, p) => sum + p.fgm, 0);
  const teamBFGA = teamBPlayersStats.reduce((sum, p) => sum + p.fga, 0);
  const teamB2PM = teamBPlayersStats.reduce((sum, p) => sum + p.twoPm, 0);
  const teamB2PA = teamBPlayersStats.reduce((sum, p) => sum + p.twoPa, 0);
  const teamB3PM = teamBPlayersStats.reduce((sum, p) => sum + p.threePm, 0);
  const teamB3PA = teamBPlayersStats.reduce((sum, p) => sum + p.threePa, 0);
  const teamBFTM = teamBPlayersStats.reduce((sum, p) => sum + p.ftm, 0);
  const teamBFTA = teamBPlayersStats.reduce((sum, p) => sum + p.fta, 0);
  const teamBORB = teamBPlayersStats.reduce((sum, p) => sum + p.orb, 0);
  const teamBDRB = teamBPlayersStats.reduce((sum, p) => sum + p.drb, 0);
  const teamBTRB = teamBORB + teamBDRB;
  const teamBAST = teamBPlayersStats.reduce((sum, p) => sum + p.assists, 0);
  const teamBSTL = teamBPlayersStats.reduce((sum, p) => sum + p.steals, 0);
  const teamBBLK = teamBPlayersStats.reduce((sum, p) => sum + p.blocks, 0);
  const teamBTO = teamBPlayersStats.reduce((sum, p) => sum + p.turnovers, 0);
  const teamBPF = teamBPlayersStats.reduce((sum, p) => sum + p.personalFouls + p.technicalFouls, 0);

  const teamBStats: BasketballTeamStats = {
    teamId: teamBId,
    teamName: teamBName,
    points: runningScoreB,
    fgm: teamBFGM,
    fga: teamBFGA,
    fgPct: teamBFGA > 0 ? Number(((teamBFGM / teamBFGA) * 100).toFixed(1)) : 0,
    twoPm: teamB2PM,
    twoPa: teamB2PA,
    twoPct: teamB2PA > 0 ? Number(((teamB2PM / teamB2PA) * 100).toFixed(1)) : 0,
    threePm: teamB3PM,
    threePa: teamB3PA,
    threePct: teamB3PA > 0 ? Number(((teamB3PM / teamB3PA) * 100).toFixed(1)) : 0,
    ftm: teamBFTM,
    fta: teamBFTA,
    ftPct: teamBFTA > 0 ? Number(((teamBFTM / teamBFTA) * 100).toFixed(1)) : 0,
    orb: teamBORB,
    drb: teamBDRB,
    trb: teamBTRB,
    assists: teamBAST,
    steals: teamBSTL,
    blocks: teamBBLK,
    turnovers: teamBTO,
    fouls: teamBPF,
    teamFoulsPerQuarter: teamBFoulsPerQuarter,
    timeoutsUsed: timeoutsUsedB,
    timeoutsRemaining: Math.max(0, rules.timeoutsPerTeam - timeoutsUsedB),
  };

  // Determine current Quarter and Clock
  const currentQuarter = clockState?.currentQuarter || 1;
  const quarterName = getBasketballQuarterShortName(currentQuarter, rules.quarters);
  const quarterType = currentQuarter > rules.quarters ? 'OVERTIME' : 'REGULAR';
  const gameTimeRemainingSeconds = clockState?.gameTimeRemainingSeconds ?? rules.quarterDurationSeconds;
  const shotClockRemainingSeconds = clockState?.shotClockRemainingSeconds ?? rules.shotClockDuration;
  const isClockRunning = Boolean(clockState?.isClockRunning);
  const isShotClockRunning = Boolean(clockState?.isShotClockRunning);

  // Period scores array
  const periodScores: BasketballPeriodScore[] = [];
  const maxQuarterTracked = Math.max(rules.quarters, currentQuarter);
  for (let q = 1; q <= maxQuarterTracked; q++) {
    const qs = quarterScoresMap.get(q) || { a: 0, b: 0, foulsA: 0, foulsB: 0 };
    periodScores.push({
      quarter: q,
      quarterName: getBasketballQuarterShortName(q, rules.quarters),
      quarterType: q > rules.quarters ? 'OVERTIME' : 'REGULAR',
      scoreA: qs.a,
      scoreB: qs.b,
      foulsA: teamAFoulsPerQuarter[q] || 0,
      foulsB: teamBFoulsPerQuarter[q] || 0,
    });
  }

  // Bonus foul calculation for the current quarter
  const currentQTeamAFouls = teamAFoulsPerQuarter[currentQuarter] || 0;
  const currentQTeamBFouls = teamBFoulsPerQuarter[currentQuarter] || 0;
  const teamA_inBonus = currentQTeamAFouls >= rules.teamFoulBonusLimit;
  const teamB_inBonus = currentQTeamBFouls >= rules.teamFoulBonusLimit;

  // Period / Match State flags
  const isHalfTime = currentQuarter === 2 && gameTimeRemainingSeconds === 0 && !isClockRunning;
  const isQuarterComplete = gameTimeRemainingSeconds === 0 && !isClockRunning;
  const isOvertime = currentQuarter > rules.quarters;

  let isMatchComplete = match.status === 'COMPLETED';
  let winnerTeamId: string | undefined;
  let winnerTeamName: string | undefined;
  let winningMargin: string | undefined;

  if (isMatchComplete || (currentQuarter >= rules.quarters && isQuarterComplete && runningScoreA !== runningScoreB)) {
    if (runningScoreA > runningScoreB) {
      winnerTeamId = teamAId;
      winnerTeamName = teamAName;
      winningMargin = `${runningScoreA - runningScoreB} PTS`;
    } else if (runningScoreB > runningScoreA) {
      winnerTeamId = teamBId;
      winnerTeamName = teamBName;
      winningMargin = `${runningScoreB - runningScoreA} PTS`;
    }
  }

  const lastEvent = validEvents.length > 0 ? validEvents[validEvents.length - 1] : undefined;

  const teamAPlayersList = allPlayers.filter((p) => p.teamId === teamAId || squadAIds.includes(p.id));
  const teamBPlayersList = allPlayers.filter((p) => p.teamId === teamBId || squadBIds.includes(p.id));

  return {
    sport: 'BASKETBALL',
    match,
    clock: {
      currentQuarter,
      quarterName,
      quarterDurationSeconds: rules.quarterDurationSeconds,
      gameTimeRemainingSeconds,
      shotClockRemainingSeconds,
      isClockRunning,
      isShotClockRunning,
      possessionTeamId: clockState?.possessionTeamId,
      lastUpdated: clockState?.lastUpdated,
    },
    teamAScore: runningScoreA,
    teamBScore: runningScoreB,
    scoreA: runningScoreA,
    scoreB: runningScoreB,
    currentQuarter,
    quarterName,
    quarterType,
    isQuarterComplete,
    isHalfTime,
    isOvertime,
    isMatchComplete,
    winnerTeamId,
    winnerTeamName,
    winningMargin,
    gameTimeRemainingSeconds,
    gameTimeDisplay: formatBasketballMatchTime(gameTimeRemainingSeconds),
    shotClockRemainingSeconds,
    isClockRunning,
    isShotClockRunning,
    possessionTeamId: clockState?.possessionTeamId,
    teamAFoulsThisQuarter: currentQTeamAFouls,
    teamBFoulsThisQuarter: currentQTeamBFouls,
    teamATimeoutsRemaining: teamAStats.timeoutsRemaining,
    teamBTimeoutsRemaining: teamBStats.timeoutsRemaining,
    teamA_inBonus,
    teamB_inBonus,
    periodScores,
    teamAStats,
    teamBStats,
    playerStats: playerStatsList,
    teamAPlayers: teamAPlayersList,
    teamBPlayers: teamBPlayersList,
    activeOnCourtA,
    activeOnCourtB,
    fouledOutPlayers: Array.from(fouledOutPlayersSet),
    events: validEvents,
    lastEvent,
  };
}
