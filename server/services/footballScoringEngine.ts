import {
  Match,
  Player,
  FootballScoringEvent,
  FootballMatchClock,
  FootballMatchScoringState,
  FootballPlayerStats,
  FootballTeamStats,
  FootballPeriodScore,
  FootballSubstitution,
  FootballShootoutAttempt,
  FootballGoalType,
  FootballCardType,
  FootballPenaltyOutcome,
  FootballShootoutOutcome,
  FootballEventType,
  AwardCandidate,
} from '../../src/types';

export interface FootballMatchRules {
  halfDuration: number; // in minutes (default 45)
  firstHalfDuration: number;
  secondHalfDuration: number;
  halfTimeDuration: number;
  extraTimeEnabled: boolean;
  extraTimeHalfDuration: number; // in minutes (default 15)
  penaltyShootoutEnabled: boolean;
  maxSubstitutions: number; // default 5
  stoppageTimeFirstHalf: number;
  stoppageTimeSecondHalf: number;
  formationA: string;
  formationB: string;
}

export function getFootballMatchRules(match: Match): FootballMatchRules {
  const cfg = match.footballConfig || ({} as any);
  const halfDur = Number(cfg.halfDuration) || 45;
  return {
    halfDuration: halfDur,
    firstHalfDuration: Number(cfg.firstHalfDuration) || halfDur,
    secondHalfDuration: Number(cfg.secondHalfDuration) || halfDur,
    halfTimeDuration: Number(cfg.halfTimeDuration) || 15,
    extraTimeEnabled: Boolean(cfg.extraTimeEnabled),
    extraTimeHalfDuration: Number(cfg.extraTimeHalfDuration) || 15,
    penaltyShootoutEnabled: cfg.penaltyShootoutEnabled !== false,
    maxSubstitutions: Number(cfg.maxSubstitutions) || 5,
    stoppageTimeFirstHalf: Number(cfg.stoppageTimeFirstHalf) || 0,
    stoppageTimeSecondHalf: Number(cfg.stoppageTimeSecondHalf) || 0,
    formationA: cfg.formationA || '4-3-3',
    formationB: cfg.formationB || '4-4-2',
  };
}

export function getPeriodShortName(period: number): string {
  switch (period) {
    case 1:
      return '1H';
    case 2:
      return '2H';
    case 3:
      return 'ET1';
    case 4:
      return 'ET2';
    case 5:
      return 'SO';
    default:
      return `${period}H`;
  }
}

export function getPeriodDisplayName(period: number): string {
  switch (period) {
    case 1:
      return '1st Half';
    case 2:
      return '2nd Half';
    case 3:
      return 'Extra Time 1';
    case 4:
      return 'Extra Time 2';
    case 5:
      return 'Penalty Shootout';
    default:
      return `Period ${period}`;
  }
}

/**
 * Format clock into mm:ss or stoppage time format (e.g. 45+2', 90+4')
 */
export function formatFootballMatchTime(
  period: number,
  elapsedSeconds: number,
  periodDurationSeconds: number,
  stoppageMinutes = 0
): string {
  const totalMins = Math.floor(elapsedSeconds / 60);
  const sec = elapsedSeconds % 60;
  const secPadded = sec < 10 ? `0${sec}` : `${sec}`;

  // Regular time offset by period
  let baseMinutes = 0;
  if (period === 1) baseMinutes = 0;
  else if (period === 2) baseMinutes = 45;
  else if (period === 3) baseMinutes = 90;
  else if (period === 4) baseMinutes = 105;

  const currentMatchMin = baseMinutes + totalMins;

  // Stoppage time handling
  const maxPeriodMins = Math.floor(periodDurationSeconds / 60);
  if (totalMins > maxPeriodMins) {
    const extraMins = totalMins - maxPeriodMins;
    const nominalMin = baseMinutes + maxPeriodMins;
    return `${nominalMin}+${extraMins}'`;
  }

  const minsPadded = currentMatchMin < 10 ? `0${currentMatchMin}` : `${currentMatchMin}`;
  return `${minsPadded}:${secPadded}`;
}

/**
 * Main Pure Live Scoring State Calculation for Football / Soccer
 * Derives everything deterministically from immutable events
 */
export function calculateFootballScoringState(
  match: Match,
  events: FootballScoringEvent[],
  clockState: FootballMatchClock | undefined,
  allPlayers: Player[]
): FootballMatchScoringState {
  const rules = getFootballMatchRules(match);
  const teamAId = match.teamAId;
  const teamBId = match.teamBId;
  const teamAName = match.teamA?.name || 'Team A';
  const teamBName = match.teamB?.name || 'Team B';

  // Extract starting squads
  const startingXI_A = (match.teamASquad?.playingIds || []).slice(0, 11);
  const startingXI_B = (match.teamBSquad?.playingIds || []).slice(0, 11);
  const subIdsA = match.teamASquad?.substituteIds || [];
  const subIdsB = match.teamBSquad?.substituteIds || [];

  // Active on-pitch player IDs
  let currentPitchPlayersA = new Set<string>(
    startingXI_A.length > 0
      ? startingXI_A
      : allPlayers.filter((p) => p.teamId === teamAId).slice(0, 11).map((p) => p.id)
  );
  let currentPitchPlayersB = new Set<string>(
    startingXI_B.length > 0
      ? startingXI_B
      : allPlayers.filter((p) => p.teamId === teamBId).slice(0, 11).map((p) => p.id)
  );

  const sentOffPlayerIds = new Set<string>();

  // Filter out undone events
  const validEvents = (events || [])
    .filter((e) => !e.isUndone)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Period scores accumulator
  // 1: 1st Half, 2: 2nd Half, 3: ET 1, 4: ET 2, 5: Shootout
  const periodScoreMap: Record<
    number,
    { teamAScore: number; teamBScore: number; teamACorners: number; teamBCorners: number }
  > = {
    1: { teamAScore: 0, teamBScore: 0, teamACorners: 0, teamBCorners: 0 },
    2: { teamAScore: 0, teamBScore: 0, teamACorners: 0, teamBCorners: 0 },
    3: { teamAScore: 0, teamBScore: 0, teamACorners: 0, teamBCorners: 0 },
    4: { teamAScore: 0, teamBScore: 0, teamACorners: 0, teamBCorners: 0 },
    5: { teamAScore: 0, teamBScore: 0, teamACorners: 0, teamBCorners: 0 },
  };

  // Team Stats Accumulators
  const teamAStats: FootballTeamStats = {
    teamId: teamAId,
    teamName: teamAName,
    goals: 0,
    openPlayGoals: 0,
    penaltyGoals: 0,
    freeKickGoals: 0,
    ownGoalsConceded: 0,
    corners: 0,
    shots: 0,
    shotsOnTarget: 0,
    possessionPercentage: 50,
    fouls: 0,
    offsides: 0,
    yellowCards: 0,
    redCards: 0,
    saves: 0,
    cleanSheet: true,
    substitutionsCount: 0,
    maxSubstitutions: rules.maxSubstitutions,
    shootoutScore: 0,
    shootoutAttempts: 0,
  };

  const teamBStats: FootballTeamStats = {
    teamId: teamBId,
    teamName: teamBName,
    goals: 0,
    openPlayGoals: 0,
    penaltyGoals: 0,
    freeKickGoals: 0,
    ownGoalsConceded: 0,
    corners: 0,
    shots: 0,
    shotsOnTarget: 0,
    possessionPercentage: 50,
    fouls: 0,
    offsides: 0,
    yellowCards: 0,
    redCards: 0,
    saves: 0,
    cleanSheet: true,
    substitutionsCount: 0,
    maxSubstitutions: rules.maxSubstitutions,
    shootoutScore: 0,
    shootoutAttempts: 0,
  };

  // Player Stats Accumulator map
  const playerStatsMap = new Map<string, FootballPlayerStats>();

  // Helper to get or create player stats
  const getPlayerStats = (playerId: string, teamId: string, playerName?: string): FootballPlayerStats => {
    let stats = playerStatsMap.get(playerId);
    if (!stats) {
      const p = allPlayers.find((pl) => pl.id === playerId);
      const isA = teamId === teamAId;
      const startingXI = isA ? startingXI_A : startingXI_B;
      const subIds = isA ? subIdsA : subIdsB;

      stats = {
        playerId,
        playerName: playerName || p?.name || 'Unknown Player',
        teamId,
        teamName: isA ? teamAName : teamBName,
        role: p?.role || 'Midfielder',
        jerseyNumber: p?.jerseyNumber,
        isCaptain: p?.id === (isA ? match.teamASquad?.captainId : match.teamBSquad?.captainId),
        isViceCaptain: p?.id === (isA ? match.teamASquad?.viceCaptainId : match.teamBSquad?.viceCaptainId),
        isStartingXI: startingXI.includes(playerId),
        isSub: subIds.includes(playerId),
        isSentOff: sentOffPlayerIds.has(playerId),
        goals: 0,
        assists: 0,
        ownGoals: 0,
        shots: 0,
        shotsOnTarget: 0,
        passes: 0,
        yellowCards: 0,
        isSecondYellow: false,
        redCards: 0,
        fouls: 0,
        offsides: 0,
        cornersTaken: 0,
        penaltiesScored: 0,
        penaltiesMissed: 0,
        penaltiesSaved: 0,
        minutesPlayed: 0,
        saves: 0,
        goalsConceded: 0,
        cleanSheet: true,
        shootoutGoalsScored: 0,
        shootoutGoalsMissed: 0,
        shootoutSaves: 0,
      };
      playerStatsMap.set(playerId, stats);
    }
    return stats;
  };

  // Pre-populate players for both teams
  allPlayers
    .filter((p) => p.teamId === teamAId || p.teamId === teamBId)
    .forEach((p) => getPlayerStats(p.id, p.teamId, p.name));

  const substitutions: FootballSubstitution[] = [];
  const shootoutAttempts: FootballShootoutAttempt[] = [];

  let currentPeriod = 1;
  let isShootoutActive = false;

  // Process all events sequentially
  for (const evt of validEvents) {
    const isTeamA = evt.teamId === teamAId;
    const opponentTeamId = isTeamA ? teamBId : teamAId;
    const period = evt.period || 1;
    if (period > currentPeriod) currentPeriod = period;

    if (!periodScoreMap[period]) {
      periodScoreMap[period] = { teamAScore: 0, teamBScore: 0, teamACorners: 0, teamBCorners: 0 };
    }

    switch (evt.eventType) {
      case 'GOAL': {
        const goalType = evt.goalType || 'OPEN_PLAY';

        if (goalType === 'OWN_GOAL') {
          // Own Goal: Credited to OPPONENT team!
          if (isTeamA) {
            // Team A committed own goal -> Team B gets +1 goal
            teamBStats.goals += 1;
            teamBStats.ownGoalsConceded += 1;
            periodScoreMap[period].teamBScore += 1;
            teamAStats.cleanSheet = false;
          } else {
            // Team B committed own goal -> Team A gets +1 goal
            teamAStats.goals += 1;
            teamAStats.ownGoalsConceded += 1;
            periodScoreMap[period].teamAScore += 1;
            teamBStats.cleanSheet = false;
          }

          if (evt.playerId) {
            const playerStat = getPlayerStats(evt.playerId, evt.teamId, evt.playerName);
            playerStat.ownGoals += 1;
          }
        } else {
          // Regular Goal for scoring team
          if (isTeamA) {
            teamAStats.goals += 1;
            periodScoreMap[period].teamAScore += 1;
            teamBStats.cleanSheet = false;

            if (goalType === 'PENALTY') teamAStats.penaltyGoals += 1;
            else if (goalType === 'FREE_KICK') teamAStats.freeKickGoals += 1;
            else teamAStats.openPlayGoals += 1;
          } else {
            teamBStats.goals += 1;
            periodScoreMap[period].teamBScore += 1;
            teamAStats.cleanSheet = false;

            if (goalType === 'PENALTY') teamBStats.penaltyGoals += 1;
            else if (goalType === 'FREE_KICK') teamBStats.freeKickGoals += 1;
            else teamBStats.openPlayGoals += 1;
          }

          if (evt.playerId) {
            const pStat = getPlayerStats(evt.playerId, evt.teamId, evt.playerName);
            pStat.goals += 1;
            pStat.shots += 1;
            pStat.shotsOnTarget += 1;
            if (goalType === 'PENALTY') pStat.penaltiesScored += 1;
          }

          if (evt.assistPlayerId) {
            const aStat = getPlayerStats(evt.assistPlayerId, evt.teamId, evt.assistPlayerName);
            aStat.assists += 1;
          }
        }
        break;
      }

      case 'OWN_GOAL': {
        // Explicit OWN_GOAL event type
        if (isTeamA) {
          teamBStats.goals += 1;
          teamBStats.ownGoalsConceded += 1;
          periodScoreMap[period].teamBScore += 1;
          teamAStats.cleanSheet = false;
        } else {
          teamAStats.goals += 1;
          teamAStats.ownGoalsConceded += 1;
          periodScoreMap[period].teamAScore += 1;
          teamBStats.cleanSheet = false;
        }
        if (evt.playerId) {
          const pStat = getPlayerStats(evt.playerId, evt.teamId, evt.playerName);
          pStat.ownGoals += 1;
        }
        break;
      }

      case 'PENALTY_GOAL': {
        if (isTeamA) {
          teamAStats.goals += 1;
          teamAStats.penaltyGoals += 1;
          periodScoreMap[period].teamAScore += 1;
          teamBStats.cleanSheet = false;
        } else {
          teamBStats.goals += 1;
          teamBStats.penaltyGoals += 1;
          periodScoreMap[period].teamBScore += 1;
          teamAStats.cleanSheet = false;
        }
        if (evt.playerId) {
          const pStat = getPlayerStats(evt.playerId, evt.teamId, evt.playerName);
          pStat.goals += 1;
          pStat.penaltiesScored += 1;
          pStat.shots += 1;
          pStat.shotsOnTarget += 1;
        }
        break;
      }

      case 'PENALTY_MISSED': {
        if (evt.playerId) {
          const pStat = getPlayerStats(evt.playerId, evt.teamId, evt.playerName);
          pStat.penaltiesMissed += 1;
          pStat.shots += 1;
        }
        break;
      }

      case 'PENALTY_SAVED': {
        if (evt.playerId) {
          const pStat = getPlayerStats(evt.playerId, evt.teamId, evt.playerName);
          pStat.penaltiesMissed += 1;
          pStat.shots += 1;
          pStat.shotsOnTarget += 1;
        }
        // Save credited to opponent goalkeeper / team
        if (isTeamA) {
          teamBStats.saves += 1;
        } else {
          teamAStats.saves += 1;
        }
        break;
      }

      case 'CORNER': {
        if (isTeamA) {
          teamAStats.corners += 1;
          periodScoreMap[period].teamACorners += 1;
        } else {
          teamBStats.corners += 1;
          periodScoreMap[period].teamBCorners += 1;
        }
        if (evt.playerId) {
          const pStat = getPlayerStats(evt.playerId, evt.teamId, evt.playerName);
          pStat.cornersTaken += 1;
        }
        break;
      }

      case 'YELLOW_CARD': {
        if (isTeamA) teamAStats.yellowCards += 1;
        else teamBStats.yellowCards += 1;

        if (evt.playerId) {
          const pStat = getPlayerStats(evt.playerId, evt.teamId, evt.playerName);
          pStat.yellowCards += 1;

          // Second Yellow check -> automatically converts to Red Card & ejection
          if (pStat.yellowCards >= 2) {
            pStat.isSecondYellow = true;
            pStat.redCards += 1;
            pStat.isSentOff = true;
            sentOffPlayerIds.add(evt.playerId);
            if (isTeamA) {
              teamAStats.redCards += 1;
              currentPitchPlayersA.delete(evt.playerId);
            } else {
              teamBStats.redCards += 1;
              currentPitchPlayersB.delete(evt.playerId);
            }
          }
        }
        break;
      }

      case 'SECOND_YELLOW': {
        if (isTeamA) {
          teamAStats.yellowCards += 1;
          teamAStats.redCards += 1;
        } else {
          teamBStats.yellowCards += 1;
          teamBStats.redCards += 1;
        }

        if (evt.playerId) {
          const pStat = getPlayerStats(evt.playerId, evt.teamId, evt.playerName);
          pStat.yellowCards += 1;
          pStat.isSecondYellow = true;
          pStat.redCards += 1;
          pStat.isSentOff = true;
          sentOffPlayerIds.add(evt.playerId);

          if (isTeamA) currentPitchPlayersA.delete(evt.playerId);
          else currentPitchPlayersB.delete(evt.playerId);
        }
        break;
      }

      case 'RED_CARD': {
        if (isTeamA) teamAStats.redCards += 1;
        else teamBStats.redCards += 1;

        if (evt.playerId) {
          const pStat = getPlayerStats(evt.playerId, evt.teamId, evt.playerName);
          pStat.redCards += 1;
          pStat.isSentOff = true;
          sentOffPlayerIds.add(evt.playerId);

          if (isTeamA) currentPitchPlayersA.delete(evt.playerId);
          else currentPitchPlayersB.delete(evt.playerId);
        }
        break;
      }

      case 'SUBSTITUTION': {
        if (evt.playerOutId && evt.playerInId) {
          if (isTeamA) {
            teamAStats.substitutionsCount += 1;
            currentPitchPlayersA.delete(evt.playerOutId);
            currentPitchPlayersA.add(evt.playerInId);
          } else {
            teamBStats.substitutionsCount += 1;
            currentPitchPlayersB.delete(evt.playerOutId);
            currentPitchPlayersB.add(evt.playerInId);
          }

          substitutions.push({
            id: evt.id,
            matchId: match.id,
            period,
            periodName: evt.periodName || getPeriodDisplayName(period),
            matchTimeDisplay: evt.matchTimeDisplay || '00:00',
            matchTimeSeconds: evt.matchTimeSeconds || 0,
            teamId: evt.teamId,
            teamName: isTeamA ? teamAName : teamBName,
            playerOutId: evt.playerOutId,
            playerOutName: evt.playerOutName || 'Player Out',
            playerInId: evt.playerInId,
            playerInName: evt.playerInName || 'Player In',
            timestamp: evt.timestamp,
          });
        }
        break;
      }

      case 'SHOOTOUT_ATTEMPT': {
        isShootoutActive = true;
        currentPeriod = 5;
        const outcome = evt.shootoutOutcome || 'MISS';
        const isGoal = outcome === 'GOAL';

        if (isTeamA) {
          teamAStats.shootoutAttempts += 1;
          if (isGoal) teamAStats.shootoutScore += 1;
        } else {
          teamBStats.shootoutAttempts += 1;
          if (isGoal) teamBStats.shootoutScore += 1;
        }

        if (evt.playerId) {
          const pStat = getPlayerStats(evt.playerId, evt.teamId, evt.playerName);
          if (isGoal) pStat.shootoutGoalsScored += 1;
          else pStat.shootoutGoalsMissed += 1;
        }

        shootoutAttempts.push({
          id: evt.id,
          matchId: match.id,
          roundNumber: evt.shootoutRound || 1,
          attemptNumberInRound: evt.shootoutAttemptNumber || (isTeamA ? 1 : 2),
          teamId: evt.teamId,
          teamName: isTeamA ? teamAName : teamBName,
          takerPlayerId: evt.playerId || '',
          takerPlayerName: evt.playerName || 'Shooter',
          gkPlayerId: evt.assistPlayerId,
          gkPlayerName: evt.assistPlayerName,
          outcome,
          scoreA_after: teamAStats.shootoutScore,
          scoreB_after: teamBStats.shootoutScore,
          timestamp: evt.timestamp,
        });
        break;
      }

      case 'SHOT': {
        if (isTeamA) teamAStats.shots += 1;
        else teamBStats.shots += 1;

        if (evt.playerId) {
          const pStat = getPlayerStats(evt.playerId, evt.teamId, evt.playerName);
          pStat.shots += 1;
        }
        break;
      }

      case 'SHOT_ON_TARGET': {
        if (isTeamA) {
          teamAStats.shots += 1;
          teamAStats.shotsOnTarget += 1;
        } else {
          teamBStats.shots += 1;
          teamBStats.shotsOnTarget += 1;
        }

        if (evt.playerId) {
          const pStat = getPlayerStats(evt.playerId, evt.teamId, evt.playerName);
          pStat.shots += 1;
          pStat.shotsOnTarget += 1;
        }
        break;
      }

      case 'SAVE': {
        if (isTeamA) teamAStats.saves += 1;
        else teamBStats.saves += 1;

        if (evt.playerId) {
          const pStat = getPlayerStats(evt.playerId, evt.teamId, evt.playerName);
          pStat.saves += 1;
        }
        break;
      }

      case 'FOUL': {
        if (isTeamA) teamAStats.fouls += 1;
        else teamBStats.fouls += 1;

        if (evt.playerId) {
          const pStat = getPlayerStats(evt.playerId, evt.teamId, evt.playerName);
          pStat.fouls += 1;
        }
        break;
      }

      case 'OFFSIDE': {
        if (isTeamA) teamAStats.offsides += 1;
        else teamBStats.offsides += 1;

        if (evt.playerId) {
          const pStat = getPlayerStats(evt.playerId, evt.teamId, evt.playerName);
          pStat.offsides += 1;
        }
        break;
      }

      case 'SCORE_CORRECTION': {
        if (evt.scoreA_after !== undefined) teamAStats.goals = evt.scoreA_after;
        if (evt.scoreB_after !== undefined) teamBStats.goals = evt.scoreB_after;
        break;
      }

      default:
        break;
    }
  }

  // Update goalkeeper conceded & clean sheet stats
  allPlayers
    .filter((p) => p.teamId === teamAId || p.teamId === teamBId)
    .forEach((p) => {
      const stats = playerStatsMap.get(p.id);
      if (stats) {
        if (p.teamId === teamAId) {
          stats.goalsConceded = teamBStats.goals;
          stats.cleanSheet = teamBStats.goals === 0;
        } else {
          stats.goalsConceded = teamAStats.goals;
          stats.cleanSheet = teamAStats.goals === 0;
        }
      }
    });

  // Calculate dynamic possession based on shots, passes, corners
  const totalActionPointsA = (teamAStats.shots * 2) + teamAStats.corners + 10;
  const totalActionPointsB = (teamBStats.shots * 2) + teamBStats.corners + 10;
  const totalPoints = totalActionPointsA + totalActionPointsB;
  if (totalPoints > 0) {
    teamAStats.possessionPercentage = Math.round((totalActionPointsA / totalPoints) * 100);
    teamBStats.possessionPercentage = 100 - teamAStats.possessionPercentage;
  }

  // Build list of period scores
  const periodScores: FootballPeriodScore[] = [];
  const maxP = Math.max(2, currentPeriod);
  for (let p = 1; p <= maxP; p++) {
    const ps = periodScoreMap[p] || { teamAScore: 0, teamBScore: 0, teamACorners: 0, teamBCorners: 0 };
    periodScores.push({
      period: p,
      periodName: getPeriodDisplayName(p),
      teamAScore: ps.teamAScore,
      teamBScore: ps.teamBScore,
      teamACorners: ps.teamACorners,
      teamBCorners: ps.teamBCorners,
    });
  }

  // Half time score (period 1)
  const halfTimeScore = {
    teamA: periodScoreMap[1]?.teamAScore || 0,
    teamB: periodScoreMap[1]?.teamBScore || 0,
  };

  // Full time regular score (period 1 + 2)
  const fullTimeScore = {
    teamA: (periodScoreMap[1]?.teamAScore || 0) + (periodScoreMap[2]?.teamAScore || 0),
    teamB: (periodScoreMap[1]?.teamBScore || 0) + (periodScoreMap[2]?.teamBScore || 0),
  };

  // Extra time score (period 1 + 2 + 3 + 4)
  const extraTimeScore =
    currentPeriod >= 3
      ? {
          teamA:
            (periodScoreMap[1]?.teamAScore || 0) +
            (periodScoreMap[2]?.teamAScore || 0) +
            (periodScoreMap[3]?.teamAScore || 0) +
            (periodScoreMap[4]?.teamAScore || 0),
          teamB:
            (periodScoreMap[1]?.teamBScore || 0) +
            (periodScoreMap[2]?.teamBScore || 0) +
            (periodScoreMap[3]?.teamBScore || 0) +
            (periodScoreMap[4]?.teamBScore || 0),
        }
      : undefined;

  // Shootout score
  const shootoutScore = isShootoutActive
    ? { teamA: teamAStats.shootoutScore, teamB: teamBStats.shootoutScore }
    : undefined;

  // Clock configuration
  const periodDurationSeconds = currentPeriod >= 3 && currentPeriod <= 4
    ? rules.extraTimeHalfDuration * 60
    : rules.halfDuration * 60;

  const clock: FootballMatchClock = clockState || {
    isRunning: false,
    elapsedSeconds: 0,
    period: currentPeriod,
    periodDurationSeconds,
    stoppageTimeMinutes: currentPeriod === 1 ? rules.stoppageTimeFirstHalf : rules.stoppageTimeSecondHalf,
  };

  // Period status
  let periodStatus: FootballMatchScoringState['periodStatus'] = 'NOT_STARTED';
  if (match.status === 'COMPLETED') {
    periodStatus = 'MATCH_COMPLETE';
  } else if (isShootoutActive || currentPeriod === 5) {
    periodStatus = 'SHOOTOUT';
  } else if (currentPeriod === 4) {
    periodStatus = 'EXTRA_TIME_2';
  } else if (currentPeriod === 3) {
    periodStatus = 'EXTRA_TIME_1';
  } else if (currentPeriod === 2) {
    periodStatus = 'SECOND_HALF';
  } else if (currentPeriod === 1) {
    if (clock.elapsedSeconds >= rules.firstHalfDuration * 60 && !clock.isRunning) {
      periodStatus = 'HALF_TIME';
    } else {
      periodStatus = 'FIRST_HALF';
    }
  }

  // Sudden Death check for shootout
  let isSuddenDeath = false;
  if (shootoutAttempts.length >= 10) {
    const roundAAttempts = shootoutAttempts.filter((s) => s.teamId === teamAId).length;
    const roundBAttempts = shootoutAttempts.filter((s) => s.teamId === teamBId).length;
    if (roundAAttempts >= 5 && roundBAttempts >= 5 && roundAAttempts === roundBAttempts) {
      isSuddenDeath = teamAStats.shootoutScore === teamBStats.shootoutScore;
    }
  }

  // Result and Winner calculation
  let matchWinnerId: string | undefined = undefined;
  let matchResultText: string | undefined = undefined;
  const isMatchComplete = match.status === 'COMPLETED';

  const totalScoreA = teamAStats.goals;
  const totalScoreB = teamBStats.goals;

  if (isShootoutActive && shootoutAttempts.length > 0) {
    if (teamAStats.shootoutScore > teamBStats.shootoutScore) {
      matchWinnerId = teamAId;
      matchResultText = `${teamAName} won on penalties (${teamAStats.shootoutScore} - ${teamBStats.shootoutScore})`;
    } else if (teamBStats.shootoutScore > teamAStats.shootoutScore) {
      matchWinnerId = teamBId;
      matchResultText = `${teamBName} won on penalties (${teamBStats.shootoutScore} - ${teamAStats.shootoutScore})`;
    } else {
      matchResultText = `Penalty Shootout in progress (${teamAStats.shootoutScore} - ${teamBStats.shootoutScore})`;
    }
  } else if (totalScoreA > totalScoreB) {
    matchWinnerId = teamAId;
    matchResultText = `${teamAName} won ${totalScoreA} - ${totalScoreB}`;
  } else if (totalScoreB > totalScoreA) {
    matchWinnerId = teamBId;
    matchResultText = `${teamBName} won ${totalScoreB} - ${totalScoreA}`;
  } else {
    matchResultText = `Match Drawn ${totalScoreA} - ${totalScoreB}`;
  }

  const lastEvent = validEvents.length > 0 ? validEvents[validEvents.length - 1] : undefined;

  return {
    match,
    sport: 'FOOTBALL',
    status: match.status,
    currentPeriod,
    currentPeriodName: getPeriodDisplayName(currentPeriod),
    periodStatus,
    clock,
    teamAScore: totalScoreA,
    teamBScore: totalScoreB,
    scoreA: totalScoreA,
    scoreB: totalScoreB,
    halfTimeScore,
    fullTimeScore,
    extraTimeScore,
    shootoutScore,
    periodScores,
    activeStartingXI_A: Array.from(currentPitchPlayersA),
    activeStartingXI_B: Array.from(currentPitchPlayersB),
    sentOffPlayerIds: Array.from(sentOffPlayerIds),
    activePlayerCountA: currentPitchPlayersA.size,
    activePlayerCountB: currentPitchPlayersB.size,
    formationA: rules.formationA,
    formationB: rules.formationB,
    playerStats: Array.from(playerStatsMap.values()),
    teamAStats,
    teamBStats,
    events: validEvents,
    lastEvent,
    substitutions,
    shootoutAttempts,
    shootoutScoreA: teamAStats.shootoutScore,
    shootoutScoreB: teamBStats.shootoutScore,
    isExtraTime: currentPeriod === 3 || currentPeriod === 4,
    isShootout: isShootoutActive || currentPeriod === 5,
    isSuddenDeath,
    isMatchComplete,
    matchWinnerId,
    matchResultText,
  };
}
