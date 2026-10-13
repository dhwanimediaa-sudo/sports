import {
  Match,
  Player,
  HockeyMatchConfig,
  HockeyScoringEvent,
  HockeySubstitution,
  HockeyShootoutAttempt,
  HockeyPlayerStats,
  HockeyTeamStats,
  HockeyPeriodScore,
  HockeyCardSuspension,
  HockeyMatchScoringState,
  HockeyMatchClock,
} from '../../src/types';

export interface HockeyMatchRules {
  matchDuration: number;
  periods: number;
  periodDuration: number;
  quarterBreakDuration: number;
  halfTimeBreakDuration: number;
  extraTimeEnabled: boolean;
  extraTimePeriods: number;
  extraTimePeriodDuration: number;
  penaltyShootoutEnabled: boolean;
  shootoutAttemptsPerTeam: number;
  greenCardDurationMinutes: number;
  yellowCardDurationMinutes: number;
  teamSize: number;
  squadLimit: number;
  rollingSubstitutions: boolean;
}

export function getHockeyMatchRules(config?: HockeyMatchConfig): HockeyMatchRules {
  const periods = Number(config?.periods) || 4;
  const periodDuration = Number(config?.periodDuration) || 15;
  const matchDuration = Number(config?.matchDuration) || periods * periodDuration;

  return {
    matchDuration,
    periods,
    periodDuration,
    quarterBreakDuration: Number(config?.quarterBreakDuration) || Number(config?.breakDuration) || 2,
    halfTimeBreakDuration: Number(config?.halfTimeBreakDuration) || 10,
    extraTimeEnabled: config?.extraTimeEnabled === true,
    extraTimePeriods: Number(config?.extraTimePeriods) || 2,
    extraTimePeriodDuration: Number(config?.extraTimePeriodDuration) || 5,
    penaltyShootoutEnabled: config?.penaltyShootoutEnabled !== false,
    shootoutAttemptsPerTeam: Number(config?.shootoutAttemptsPerTeam) || 5,
    greenCardDurationMinutes: Number(config?.greenCardDurationMinutes) || 2,
    yellowCardDurationMinutes: Number(config?.yellowCardDurationMinutes) || 5,
    teamSize: Number(config?.teamSize) || 11,
    squadLimit: Number(config?.squadLimit) || 18,
    rollingSubstitutions: config?.rollingSubstitutions !== false,
  };
}

export function getPeriodDisplayName(period: number, totalPeriods: number = 4): string {
  if (period <= totalPeriods) {
    if (totalPeriods === 4) {
      return `Quarter ${period}`;
    }
    if (totalPeriods === 2) {
      return `${period === 1 ? '1st' : '2nd'} Half`;
    }
    return `Period ${period}`;
  }
  if (period === totalPeriods + 1) return 'Extra Time 1';
  if (period === totalPeriods + 2) return 'Extra Time 2';
  return 'Shootout';
}

export function getPeriodShortName(period: number, totalPeriods: number = 4): string {
  if (period <= totalPeriods) {
    if (totalPeriods === 4) {
      return `Q${period}`;
    }
    if (totalPeriods === 2) {
      return `H${period}`;
    }
    return `P${period}`;
  }
  if (period === totalPeriods + 1) return 'ET1';
  if (period === totalPeriods + 2) return 'ET2';
  return 'SO';
}

/**
 * Pure reactive engine calculating complete Hockey match scoring state from immutable events.
 */
export function calculateHockeyScoringState(
  match: Match,
  events: HockeyScoringEvent[],
  clockState?: HockeyMatchClock,
  allPlayers: Player[] = []
): HockeyMatchScoringState {
  const rules = getHockeyMatchRules(match.hockeyConfig);
  const activeEvents = (events || []).filter((e) => !e.isUndone);

  // Initialize Player Lookup Map
  const playerMap = new Map<string, Player>();
  allPlayers.forEach((p) => playerMap.set(p.id, p));

  // Initialize Team Stats
  const teamAStats: HockeyTeamStats = {
    teamId: match.teamAId,
    teamName: match.teamA?.name || 'Team A',
    goals: 0,
    fieldGoals: 0,
    penaltyCornerGoals: 0,
    penaltyStrokeGoals: 0,
    penaltyCorners: 0,
    penaltyCornersConverted: 0,
    penaltyStrokes: 0,
    penaltyStrokesConverted: 0,
    greenCards: 0,
    yellowCards: 0,
    redCards: 0,
    shots: 0,
    shotsOnTarget: 0,
    saves: 0,
    substitutionsCount: 0,
    shootoutScore: 0,
    shootoutAttempts: 0,
  };

  const teamBStats: HockeyTeamStats = {
    teamId: match.teamBId,
    teamName: match.teamB?.name || 'Team B',
    goals: 0,
    fieldGoals: 0,
    penaltyCornerGoals: 0,
    penaltyStrokeGoals: 0,
    penaltyCorners: 0,
    penaltyCornersConverted: 0,
    penaltyStrokes: 0,
    penaltyStrokesConverted: 0,
    greenCards: 0,
    yellowCards: 0,
    redCards: 0,
    shots: 0,
    shotsOnTarget: 0,
    saves: 0,
    substitutionsCount: 0,
    shootoutScore: 0,
    shootoutAttempts: 0,
  };

  // Initialize Player Stats Map for all participating players
  const playerStatsMap = new Map<string, HockeyPlayerStats>();

  const initPlayerStat = (playerId: string, teamId: string, isStarting: boolean = false): HockeyPlayerStats => {
    const existing = playerStatsMap.get(playerId);
    if (existing) return existing;

    const p = playerMap.get(playerId);
    const isGK =
      match.teamASquad?.goalkeeperId === playerId ||
      match.teamBSquad?.goalkeeperId === playerId ||
      p?.role?.toUpperCase().includes('GOAL') ||
      p?.role?.toUpperCase().includes('GK');

    const stat: HockeyPlayerStats = {
      playerId,
      playerName: p?.name || 'Player',
      teamId,
      jerseyNumber: p?.jerseyNumber !== undefined ? String(p.jerseyNumber) : '',
      role: p?.role || (isGK ? 'Goalkeeper' : 'Player'),
      isCaptain: match.teamASquad?.captainId === playerId || match.teamBSquad?.captainId === playerId,
      isViceCaptain: match.teamASquad?.viceCaptainId === playerId || match.teamBSquad?.viceCaptainId === playerId,
      isGoalkeeper: isGK,
      isStarting,
      goals: 0,
      fieldGoals: 0,
      penaltyCornerGoals: 0,
      penaltyStrokeGoals: 0,
      assists: 0,
      shots: 0,
      shotsOnTarget: 0,
      greenCards: 0,
      yellowCards: 0,
      redCards: 0,
      isSuspended: false,
      saves: 0,
      goalsConceded: 0,
      penaltyStrokeSaves: 0,
      shootoutGoalsScored: 0,
      shootoutGoalsConceded: 0,
      shootoutSaves: 0,
    };
    playerStatsMap.set(playerId, stat);
    return stat;
  };

  // Populate from match squad
  (match.teamASquad?.playingIds || []).forEach((id) => initPlayerStat(id, match.teamAId, true));
  (match.teamASquad?.substituteIds || []).forEach((id) => initPlayerStat(id, match.teamAId, false));
  (match.teamBSquad?.playingIds || []).forEach((id) => initPlayerStat(id, match.teamBId, true));
  (match.teamBSquad?.substituteIds || []).forEach((id) => initPlayerStat(id, match.teamBId, false));

  // Active court players
  const activeCourtPlayerIdsA = new Set<string>(match.teamASquad?.playingIds || []);
  const activeCourtPlayerIdsB = new Set<string>(match.teamBSquad?.playingIds || []);

  const goalkeeperIdA = match.teamASquad?.goalkeeperId || Array.from(activeCourtPlayerIdsA)[0];
  const goalkeeperIdB = match.teamBSquad?.goalkeeperId || Array.from(activeCourtPlayerIdsB)[0];

  // Period tracking
  const maxRegularPeriods = rules.periods;
  const periodScoresMap = new Map<number, { teamA: number; teamB: number; pcA: number; pcB: number }>();
  for (let p = 1; p <= maxRegularPeriods; p++) {
    periodScoresMap.set(p, { teamA: 0, teamB: 0, pcA: 0, pcB: 0 });
  }

  let currentPeriod = 1;
  let isExtraTime = false;
  let isShootout = false;
  let isMatchComplete = match.status === 'COMPLETED';
  let periodStatus: HockeyMatchScoringState['periodStatus'] = match.status === 'READY' ? 'NOT_STARTED' : 'IN_PROGRESS';

  const substitutions: HockeySubstitution[] = [];
  const shootoutAttempts: HockeyShootoutAttempt[] = [];
  const activeSuspensions: HockeyCardSuspension[] = [];

  let runningScoreA = 0;
  let runningScoreB = 0;

  // Process Events Sequentially
  activeEvents.forEach((ev) => {
    currentPeriod = Math.max(currentPeriod, ev.period);

    if (ev.period > maxRegularPeriods && ev.period <= maxRegularPeriods + rules.extraTimePeriods) {
      isExtraTime = true;
    }
    if (ev.period > maxRegularPeriods + rules.extraTimePeriods || ev.periodType === 'SHOOTOUT') {
      isShootout = true;
    }

    if (!periodScoresMap.has(ev.period)) {
      periodScoresMap.set(ev.period, { teamA: 0, teamB: 0, pcA: 0, pcB: 0 });
    }
    const pScore = periodScoresMap.get(ev.period)!;

    switch (ev.eventType) {
      case 'GOAL': {
        const isTeamA = ev.teamId === match.teamAId;
        if (isTeamA) {
          runningScoreA++;
          teamAStats.goals++;
          pScore.teamA++;
        } else {
          runningScoreB++;
          teamBStats.goals++;
          pScore.teamB++;
        }

        // Specific goal type stats
        if (ev.goalType === 'FIELD_GOAL') {
          if (isTeamA) teamAStats.fieldGoals++;
          else teamBStats.fieldGoals++;
        } else if (ev.goalType === 'PENALTY_CORNER_GOAL') {
          if (isTeamA) {
            teamAStats.penaltyCornerGoals++;
            teamAStats.penaltyCornersConverted++;
          } else {
            teamBStats.penaltyCornerGoals++;
            teamBStats.penaltyCornersConverted++;
          }
        } else if (ev.goalType === 'PENALTY_STROKE_GOAL') {
          if (isTeamA) {
            teamAStats.penaltyStrokeGoals++;
            teamAStats.penaltyStrokesConverted++;
          } else {
            teamBStats.penaltyStrokeGoals++;
            teamBStats.penaltyStrokesConverted++;
          }
        }

        // Player Stats
        if (ev.playerId) {
          const pStat = initPlayerStat(ev.playerId, ev.teamId);
          pStat.goals++;
          pStat.shots++;
          pStat.shotsOnTarget++;
          if (ev.goalType === 'FIELD_GOAL') pStat.fieldGoals++;
          else if (ev.goalType === 'PENALTY_CORNER_GOAL') pStat.penaltyCornerGoals++;
          else if (ev.goalType === 'PENALTY_STROKE_GOAL') pStat.penaltyStrokeGoals++;
        }

        // Assist Player Stats
        if (ev.assistPlayerId) {
          const aStat = initPlayerStat(ev.assistPlayerId, ev.teamId);
          aStat.assists++;
        }

        // Opposing GK Goals Conceded
        const oppGkId = isTeamA ? goalkeeperIdB : goalkeeperIdA;
        if (oppGkId) {
          const gkStat = initPlayerStat(oppGkId, isTeamA ? match.teamBId : match.teamAId);
          gkStat.goalsConceded++;
        }
        break;
      }

      case 'PENALTY_CORNER': {
        const isTeamA = ev.teamId === match.teamAId;
        if (isTeamA) {
          teamAStats.penaltyCorners++;
          pScore.pcA++;
        } else {
          teamBStats.penaltyCorners++;
          pScore.pcB++;
        }

        if (ev.penaltyCornerOutcome === 'SAVED') {
          const oppGkId = isTeamA ? goalkeeperIdB : goalkeeperIdA;
          if (oppGkId) {
            const gkStat = initPlayerStat(oppGkId, isTeamA ? match.teamBId : match.teamAId);
            gkStat.saves++;
          }
          if (isTeamA) teamBStats.saves++;
          else teamAStats.saves++;
        }
        break;
      }

      case 'PENALTY_STROKE': {
        const isTeamA = ev.teamId === match.teamAId;
        if (isTeamA) {
          teamAStats.penaltyStrokes++;
        } else {
          teamBStats.penaltyStrokes++;
        }

        if (ev.penaltyStrokeOutcome === 'SAVED') {
          const oppGkId = isTeamA ? goalkeeperIdB : goalkeeperIdA;
          if (oppGkId) {
            const gkStat = initPlayerStat(oppGkId, isTeamA ? match.teamBId : match.teamAId);
            gkStat.saves++;
            gkStat.penaltyStrokeSaves++;
          }
          if (isTeamA) teamBStats.saves++;
          else teamAStats.saves++;
        }
        break;
      }

      case 'CARD': {
        const isTeamA = ev.teamId === match.teamAId;
        if (ev.cardType === 'GREEN') {
          if (isTeamA) teamAStats.greenCards++;
          else teamBStats.greenCards++;
        } else if (ev.cardType === 'YELLOW') {
          if (isTeamA) teamAStats.yellowCards++;
          else teamBStats.yellowCards++;
        } else if (ev.cardType === 'RED') {
          if (isTeamA) teamAStats.redCards++;
          else teamBStats.redCards++;
        }

        if (ev.playerId) {
          const pStat = initPlayerStat(ev.playerId, ev.teamId);
          if (ev.cardType === 'GREEN') pStat.greenCards++;
          else if (ev.cardType === 'YELLOW') pStat.yellowCards++;
          else if (ev.cardType === 'RED') pStat.redCards++;

          // Register suspension
          const durationMins =
            ev.cardDurationMinutes ||
            (ev.cardType === 'GREEN'
              ? rules.greenCardDurationMinutes
              : ev.cardType === 'YELLOW'
              ? rules.yellowCardDurationMinutes
              : 999);

          const issuedSeconds = ev.matchTimeSeconds || 0;
          const expirySeconds = issuedSeconds + durationMins * 60;

          // Check if still active against current match time
          const currentElapsed = clockState?.elapsedSeconds || issuedSeconds;
          const isActive =
            ev.cardType === 'RED' ||
            (ev.period === currentPeriod && currentElapsed < expirySeconds) ||
            ev.period > currentPeriod;

          if (isActive) {
            pStat.isSuspended = true;
            pStat.activeCardType = ev.cardType;
            pStat.suspensionEndMatchTimeSeconds = expirySeconds;
            pStat.suspensionRemainingSeconds = Math.max(0, expirySeconds - currentElapsed);

            activeSuspensions.push({
              id: ev.id,
              playerId: ev.playerId,
              playerName: pStat.playerName,
              teamId: ev.teamId,
              cardType: ev.cardType || 'GREEN',
              period: ev.period,
              issuedAtMatchTimeSeconds: issuedSeconds,
              durationMinutes: durationMins,
              expiresAtMatchTimeSeconds: expirySeconds,
              isActive: true,
            });
          }
        }
        break;
      }

      case 'SUBSTITUTION': {
        const isTeamA = ev.teamId === match.teamAId;
        if (isTeamA) teamAStats.substitutionsCount++;
        else teamBStats.substitutionsCount++;

        if (ev.playerOutId && ev.playerInId) {
          const pOut = playerMap.get(ev.playerOutId);
          const pIn = playerMap.get(ev.playerInId);

          if (isTeamA) {
            activeCourtPlayerIdsA.delete(ev.playerOutId);
            activeCourtPlayerIdsA.add(ev.playerInId);
          } else {
            activeCourtPlayerIdsB.delete(ev.playerOutId);
            activeCourtPlayerIdsB.add(ev.playerInId);
          }

          substitutions.push({
            id: ev.id,
            matchId: match.id,
            period: ev.period,
            periodName: ev.periodName || getPeriodShortName(ev.period, rules.periods),
            matchTimeDisplay: ev.matchTimeDisplay || '00:00',
            matchTimeSeconds: ev.matchTimeSeconds || 0,
            teamId: ev.teamId,
            playerOutId: ev.playerOutId,
            playerOutName: pOut?.name || ev.playerOutName || 'Player Out',
            playerInId: ev.playerInId,
            playerInName: pIn?.name || ev.playerInName || 'Player In',
            timestamp: ev.timestamp,
          });
        }
        break;
      }

      case 'PERIOD_END': {
        periodStatus = 'PERIOD_BREAK';
        break;
      }

      case 'PERIOD_START': {
        periodStatus = 'IN_PROGRESS';
        break;
      }

      case 'SHOOTOUT_ATTEMPT': {
        isShootout = true;
        periodStatus = 'SHOOTOUT';
        const isTeamA = ev.teamId === match.teamAId;
        const isGoal = ev.shootoutAttemptOutcome === 'GOAL';

        if (isGoal) {
          if (isTeamA) {
            teamAStats.shootoutScore++;
          } else {
            teamBStats.shootoutScore++;
          }
        }
        if (isTeamA) teamAStats.shootoutAttempts++;
        else teamBStats.shootoutAttempts++;

        if (ev.playerId) {
          const pStat = initPlayerStat(ev.playerId, ev.teamId);
          if (isGoal) pStat.shootoutGoalsScored++;
        }

        const oppGkId = isTeamA ? goalkeeperIdB : goalkeeperIdA;
        if (oppGkId) {
          const gkStat = initPlayerStat(oppGkId, isTeamA ? match.teamBId : match.teamAId);
          if (isGoal) gkStat.shootoutGoalsConceded++;
          else gkStat.shootoutSaves++;
        }

        const takerPlayer = playerMap.get(ev.playerId || '');
        const gkPlayer = playerMap.get(oppGkId || '');

        shootoutAttempts.push({
          id: ev.id,
          matchId: match.id,
          roundNumber: ev.shootoutRound || Math.ceil(shootoutAttempts.length / 2) || 1,
          attemptNumberInRound: (shootoutAttempts.length % 2) + 1,
          teamId: ev.teamId,
          teamName: isTeamA ? match.teamA?.name || 'Team A' : match.teamB?.name || 'Team B',
          takerPlayerId: ev.playerId || '',
          takerPlayerName: takerPlayer?.name || ev.playerName || 'Shooter',
          gkPlayerId: oppGkId,
          gkPlayerName: gkPlayer?.name || 'Goalkeeper',
          outcome: ev.shootoutAttemptOutcome || 'MISS',
          timestamp: ev.timestamp,
        });
        break;
      }

      case 'SHOOTOUT_END': {
        isMatchComplete = true;
        periodStatus = 'MATCH_COMPLETE';
        break;
      }
    }
  });

  // Calculate Period Score Breakdown
  const periodScores: HockeyPeriodScore[] = [];
  const totalPeriodsToDisplay = isExtraTime
    ? maxRegularPeriods + rules.extraTimePeriods
    : Math.max(maxRegularPeriods, currentPeriod);

  const teamAPeriodScores: number[] = [];
  const teamBPeriodScores: number[] = [];

  for (let p = 1; p <= totalPeriodsToDisplay; p++) {
    const s = periodScoresMap.get(p) || { teamA: 0, teamB: 0, pcA: 0, pcB: 0 };
    periodScores.push({
      period: p,
      periodName: getPeriodShortName(p, rules.periods),
      teamAScore: s.teamA,
      teamBScore: s.teamB,
      teamAPenaltyCorners: s.pcA,
      teamBPenaltyCorners: s.pcB,
    });
    teamAPeriodScores.push(s.teamA);
    teamBPeriodScores.push(s.teamB);
  }

  // Calculate Match Outcome & Result Text
  let matchWinnerId: string | undefined = undefined;
  let matchResultText = '';

  const finalScoreA = runningScoreA;
  const finalScoreB = runningScoreB;
  const soScoreA = teamAStats.shootoutScore;
  const soScoreB = teamBStats.shootoutScore;

  if (isShootout && shootoutAttempts.length > 0) {
    if (soScoreA > soScoreB) {
      matchWinnerId = match.teamAId;
      matchResultText = `${match.teamA?.name || 'Team A'} won ${soScoreA}-${soScoreB} in Shootout (FT: ${finalScoreA}-${finalScoreB})`;
    } else if (soScoreB > soScoreA) {
      matchWinnerId = match.teamBId;
      matchResultText = `${match.teamB?.name || 'Team B'} won ${soScoreB}-${soScoreA} in Shootout (FT: ${finalScoreB}-${finalScoreA})`;
    } else {
      matchResultText = `Shootout in progress (${soScoreA}-${soScoreB})`;
    }
  } else if (finalScoreA > finalScoreB) {
    matchWinnerId = match.teamAId;
    matchResultText = `${match.teamA?.name || 'Team A'} won by ${finalScoreA - finalScoreB} goal${
      finalScoreA - finalScoreB > 1 ? 's' : ''
    } (${finalScoreA}-${finalScoreB})`;
  } else if (finalScoreB > finalScoreA) {
    matchWinnerId = match.teamBId;
    matchResultText = `${match.teamB?.name || 'Team B'} won by ${finalScoreB - finalScoreA} goal${
      finalScoreB - finalScoreA > 1 ? 's' : ''
    } (${finalScoreB}-${finalScoreA})`;
  } else {
    matchResultText = `Match Tied (${finalScoreA}-${finalScoreB})`;
  }

  // Fallback clock
  const defaultClock: HockeyMatchClock = {
    isRunning: clockState?.isRunning || false,
    elapsedSeconds: clockState?.elapsedSeconds || 0,
    periodDurationSeconds:
      clockState?.periodDurationSeconds ||
      (isExtraTime ? rules.extraTimePeriodDuration * 60 : rules.periodDuration * 60),
    lastStartedAt: clockState?.lastStartedAt,
  };

  const lastEvent = activeEvents.length > 0 ? activeEvents[activeEvents.length - 1] : undefined;

  return {
    match,
    sport: 'HOCKEY',
    status: isMatchComplete ? 'COMPLETED' : match.status,
    currentPeriod,
    currentPeriodName: getPeriodDisplayName(currentPeriod, rules.periods),
    periodStatus,
    clock: defaultClock,
    teamAScore: finalScoreA,
    teamBScore: finalScoreB,
    scoreA: finalScoreA,
    scoreB: finalScoreB,
    teamAPeriodScores,
    teamBPeriodScores,
    periodScores,
    activeCourtPlayerIdsA: Array.from(activeCourtPlayerIdsA),
    activeCourtPlayerIdsB: Array.from(activeCourtPlayerIdsB),
    goalkeeperIdA,
    goalkeeperIdB,
    activeSuspensions,
    playerStats: Array.from(playerStatsMap.values()),
    teamAStats,
    teamBStats,
    events: activeEvents,
    lastEvent,
    substitutions,
    shootoutAttempts,
    shootoutScoreA: soScoreA,
    shootoutScoreB: soScoreB,
    isExtraTime,
    isShootout,
    isMatchComplete,
    matchWinnerId,
    matchResultText,
  };
}
