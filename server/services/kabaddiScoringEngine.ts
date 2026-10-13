import {
  Match,
  Player,
  KabaddiMatchConfig,
  KabaddiRaidEvent,
  KabaddiTimeout,
  KabaddiSubstitution,
  KabaddiPlayerStats,
  KabaddiTeamStats,
  KabaddiMatchScoringState,
  KabaddiRaidOutcome,
} from '../../src/types';

export interface KabaddiMatchRules {
  matchDuration: number;
  firstHalfDuration: number;
  secondHalfDuration: number;
  halfTimeDuration: number;
  raidDuration: number;
  teamSize: number;
  substitutesCount: number;
  timeoutsPerHalf: number;
  superTackleActiveDefenders: number;
  superTacklePoints: number;
  allOutPoints: number;
  superRaidThreshold: number;
  doOrDieRaidThreshold: number;
  bonusLineActive: boolean;
  lobbyLineActive: boolean;
}

export function getKabaddiMatchRules(config?: KabaddiMatchConfig): KabaddiMatchRules {
  return {
    matchDuration: Number(config?.matchDuration) || 40,
    firstHalfDuration: Number(config?.firstHalfDuration) || 20,
    secondHalfDuration: Number(config?.secondHalfDuration) || 20,
    halfTimeDuration: Number(config?.halfTimeDuration) || 5,
    raidDuration: Number(config?.raidDuration) || 30,
    teamSize: Number(config?.teamSize) || 7,
    substitutesCount: Number(config?.substitutesCount) || 5,
    timeoutsPerHalf: Number(config?.timeoutsPerHalf) || 2,
    superTackleActiveDefenders: Number(config?.superTackleActiveDefenders) || 3,
    superTacklePoints: Number(config?.superTacklePoints) || 2,
    allOutPoints: Number(config?.allOutPoints) || 2,
    superRaidThreshold: Number(config?.superRaidThreshold) || 3,
    doOrDieRaidThreshold: Number(config?.doOrDieRaidThreshold) || 3,
    bonusLineActive: config?.bonusLineActive !== false,
    lobbyLineActive: config?.lobbyLineActive !== false,
  };
}

/**
 * Pure reactive engine calculating complete Kabaddi match scoring state from immutable events.
 */
export function calculateKabaddiScoringState(
  match: Match,
  raids: KabaddiRaidEvent[],
  timeouts: KabaddiTimeout[],
  substitutions: KabaddiSubstitution[],
  allPlayers: Player[]
): KabaddiMatchScoringState {
  const rules = getKabaddiMatchRules(match.kabaddiConfig);
  const teamAId = match.teamAId;
  const teamBId = match.teamBId;

  const teamAPlayerList = allPlayers.filter((p) => p.teamId === teamAId);
  const teamBPlayerList = allPlayers.filter((p) => p.teamId === teamBId);

  const teamAStartingIds = (match.teamASquad?.playingIds && match.teamASquad.playingIds.length > 0)
    ? match.teamASquad.playingIds
    : teamAPlayerList.length > 0
    ? teamAPlayerList.slice(0, rules.teamSize).map((p) => p.id)
    : Array.from({ length: rules.teamSize }, (_, i) => `${teamAId}-p${i + 1}`);

  const teamBStartingIds = (match.teamBSquad?.playingIds && match.teamBSquad.playingIds.length > 0)
    ? match.teamBSquad.playingIds
    : teamBPlayerList.length > 0
    ? teamBPlayerList.slice(0, rules.teamSize).map((p) => p.id)
    : Array.from({ length: rules.teamSize }, (_, i) => `${teamBId}-p${i + 1}`);

  // Active players on court & Out FIFO Queues
  let activeCourtA = new Set<string>(teamAStartingIds);
  let activeCourtB = new Set<string>(teamBStartingIds);
  let outQueueA: string[] = [];
  let outQueueB: string[] = [];

  // Initialize Player Stats map
  const playerStatsMap = new Map<string, KabaddiPlayerStats>();

  const initPlayerStats = (player: Player, isTeamA: boolean) => {
    playerStatsMap.set(player.id, {
      playerId: player.id,
      playerName: player.name,
      teamId: player.teamId,
      teamName: isTeamA ? (match.teamA?.name || 'Team A') : (match.teamB?.name || 'Team B'),
      jerseyNumber: typeof player.jerseyNumber === 'number' ? player.jerseyNumber : player.jerseyNumber ? parseInt(String(player.jerseyNumber), 10) || undefined : undefined,
      role: player.role,
      isCaptain: player.isCaptain,
      isViceCaptain: player.isViceCaptain,
      raidAttempts: 0,
      successfulRaids: 0,
      emptyRaids: 0,
      unsuccessfulRaids: 0,
      touchPoints: 0,
      bonusPoints: 0,
      totalRaidPoints: 0,
      superRaids: 0,
      raidSuccessRate: 0,
      tackleAttempts: 0,
      successfulTackles: 0,
      superTackles: 0,
      tacklePoints: 0,
      tackleSuccessRate: 0,
      allOutPointsContributed: 0,
      totalPoints: 0,
      isCurrentlyOnCourt: isTeamA ? activeCourtA.has(player.id) : activeCourtB.has(player.id),
    });
  };

  teamAPlayerList.forEach((p) => initPlayerStats(p, true));
  teamBPlayerList.forEach((p) => initPlayerStats(p, false));

  // Team Stats initialization
  const teamAStats: KabaddiTeamStats = {
    teamId: teamAId,
    teamName: match.teamA?.name || 'Team A',
    totalPoints: 0,
    firstHalfPoints: 0,
    secondHalfPoints: 0,
    raidPoints: 0,
    touchPoints: 0,
    bonusPoints: 0,
    tacklePoints: 0,
    superRaids: 0,
    superTackles: 0,
    superTacklePoints: 0,
    allOutsInflicted: 0,
    allOutPoints: 0,
    allOutsConceded: 0,
    emptyRaids: 0,
    successfulRaids: 0,
    unsuccessfulRaids: 0,
    totalRaids: 0,
    totalTackles: 0,
    successfulTackles: 0,
    timeoutsUsedHalf1: timeouts.filter((t) => t.teamId === teamAId && t.half === 1).length,
    timeoutsUsedHalf2: timeouts.filter((t) => t.teamId === teamAId && t.half === 2).length,
    substitutionsUsed: substitutions.filter((s) => s.teamId === teamAId).length,
    activeCourtPlayersCount: activeCourtA.size,
  };

  const teamBStats: KabaddiTeamStats = {
    teamId: teamBId,
    teamName: match.teamB?.name || 'Team B',
    totalPoints: 0,
    firstHalfPoints: 0,
    secondHalfPoints: 0,
    raidPoints: 0,
    touchPoints: 0,
    bonusPoints: 0,
    tacklePoints: 0,
    superRaids: 0,
    superTackles: 0,
    superTacklePoints: 0,
    allOutsInflicted: 0,
    allOutPoints: 0,
    allOutsConceded: 0,
    emptyRaids: 0,
    successfulRaids: 0,
    unsuccessfulRaids: 0,
    totalRaids: 0,
    totalTackles: 0,
    successfulTackles: 0,
    timeoutsUsedHalf1: timeouts.filter((t) => t.teamId === teamBId && t.half === 1).length,
    timeoutsUsedHalf2: timeouts.filter((t) => t.teamId === teamBId && t.half === 2).length,
    substitutionsUsed: substitutions.filter((s) => s.teamId === teamBId).length,
    activeCourtPlayersCount: activeCourtB.size,
  };

  let teamAScore = 0;
  let teamBScore = 0;
  let teamAScoreHalf1 = 0;
  let teamAScoreHalf2 = 0;
  let teamBScoreHalf1 = 0;
  let teamBScoreHalf2 = 0;

  let consecutiveEmptyRaidsTeamA = 0;
  let consecutiveEmptyRaidsTeamB = 0;

  // Process Substitutions up to current state
  substitutions.forEach((sub) => {
    if (sub.teamId === teamAId) {
      if (activeCourtA.has(sub.playerOutId)) {
        activeCourtA.delete(sub.playerOutId);
        activeCourtA.add(sub.playerInId);
      }
    } else {
      if (activeCourtB.has(sub.playerOutId)) {
        activeCourtB.delete(sub.playerOutId);
        activeCourtB.add(sub.playerInId);
      }
    }
  });

  // Sort raids chronologically by raidNumber
  const sortedRaids = [...raids].sort((a, b) => a.raidNumber - b.raidNumber);

  // Process each immutable raid event
  sortedRaids.forEach((raid) => {
    const isRaiderTeamA = raid.raidingTeamId === teamAId;
    const raidingStats = isRaiderTeamA ? teamAStats : teamBStats;
    const defendingStats = isRaiderTeamA ? teamBStats : teamAStats;
    const raiderCourt = isRaiderTeamA ? activeCourtA : activeCourtB;
    const defenderCourt = isRaiderTeamA ? activeCourtB : activeCourtA;
    const raiderOutQueue = isRaiderTeamA ? outQueueA : outQueueB;
    const defenderOutQueue = isRaiderTeamA ? outQueueB : outQueueA;

    raidingStats.totalRaids++;

    const raider = playerStatsMap.get(raid.raiderPlayerId);
    if (raider) {
      raider.raidAttempts++;
    }

    const half = raid.half;

    // Handle outcomes
    switch (raid.outcome) {
      case 'EMPTY_RAID': {
        raidingStats.emptyRaids++;
        if (raider) raider.emptyRaids++;
        if (isRaiderTeamA) {
          consecutiveEmptyRaidsTeamA++;
        } else {
          consecutiveEmptyRaidsTeamB++;
        }
        break;
      }

      case 'TOUCH_POINT':
      case 'SUCCESSFUL_RAID':
      case 'SUPER_RAID':
      case 'DO_OR_DIE_SUCCESS': {
        const touchPts = raid.touchPoints || 1;
        const bonusPts = raid.bonusPoints || 0;
        const totalRaidPts = touchPts + bonusPts;

        raidingStats.successfulRaids++;
        raidingStats.raidPoints += totalRaidPts;
        raidingStats.touchPoints += touchPts;
        raidingStats.bonusPoints += bonusPts;
        raidingStats.totalPoints += totalRaidPts;

        if (isRaiderTeamA) {
          teamAScore += totalRaidPts;
          if (half === 1) teamAScoreHalf1 += totalRaidPts;
          else teamAScoreHalf2 += totalRaidPts;
          consecutiveEmptyRaidsTeamA = 0;
        } else {
          teamBScore += totalRaidPts;
          if (half === 1) teamBScoreHalf1 += totalRaidPts;
          else teamBScoreHalf2 += totalRaidPts;
          consecutiveEmptyRaidsTeamB = 0;
        }

        if (raider) {
          raider.successfulRaids++;
          raider.touchPoints += touchPts;
          raider.bonusPoints += bonusPts;
          raider.totalRaidPoints += totalRaidPts;
          raider.totalPoints += totalRaidPts;
          if (totalRaidPts >= rules.superRaidThreshold || raid.isSuperRaid) {
            raider.superRaids++;
            raidingStats.superRaids = (raidingStats.superRaids || 0) + 1;
          }
        }

        // Defenders touched go OUT
        (raid.touchedDefenderIds || []).forEach((defId) => {
          if (defenderCourt.has(defId)) {
            defenderCourt.delete(defId);
            defenderOutQueue.push(defId);
          }
        });

        // Revive players for raiding team equal to touchPoints
        const revivalsCount = Math.min(touchPts, raiderOutQueue.length);
        for (let i = 0; i < revivalsCount; i++) {
          const revivedId = raiderOutQueue.shift();
          if (revivedId) {
            raiderCourt.add(revivedId);
          }
        }

        break;
      }

      case 'BONUS_POINT': {
        const bonusPts = raid.bonusPoints || 1;
        raidingStats.successfulRaids++;
        raidingStats.raidPoints += bonusPts;
        raidingStats.bonusPoints += bonusPts;
        raidingStats.totalPoints += bonusPts;

        if (isRaiderTeamA) {
          teamAScore += bonusPts;
          if (half === 1) teamAScoreHalf1 += bonusPts;
          else teamAScoreHalf2 += bonusPts;
          consecutiveEmptyRaidsTeamA = 0;
        } else {
          teamBScore += bonusPts;
          if (half === 1) teamBScoreHalf1 += bonusPts;
          else teamBScoreHalf2 += bonusPts;
          consecutiveEmptyRaidsTeamB = 0;
        }

        if (raider) {
          raider.successfulRaids++;
          raider.bonusPoints += bonusPts;
          raider.totalRaidPoints += bonusPts;
          raider.totalPoints += bonusPts;
        }

        break;
      }

      case 'BONUS_AND_TOUCH': {
        const touchPts = raid.touchPoints || 1;
        const bonusPts = raid.bonusPoints || 1;
        const totalRaidPts = touchPts + bonusPts;

        raidingStats.successfulRaids++;
        raidingStats.raidPoints += totalRaidPts;
        raidingStats.touchPoints += touchPts;
        raidingStats.bonusPoints += bonusPts;
        raidingStats.totalPoints += totalRaidPts;

        if (isRaiderTeamA) {
          teamAScore += totalRaidPts;
          if (half === 1) teamAScoreHalf1 += totalRaidPts;
          else teamAScoreHalf2 += totalRaidPts;
          consecutiveEmptyRaidsTeamA = 0;
        } else {
          teamBScore += totalRaidPts;
          if (half === 1) teamBScoreHalf1 += totalRaidPts;
          else teamBScoreHalf2 += totalRaidPts;
          consecutiveEmptyRaidsTeamB = 0;
        }

        if (raider) {
          raider.successfulRaids++;
          raider.touchPoints += touchPts;
          raider.bonusPoints += bonusPts;
          raider.totalRaidPoints += totalRaidPts;
          raider.totalPoints += totalRaidPts;
          if (totalRaidPts >= rules.superRaidThreshold || raid.isSuperRaid) {
            raider.superRaids++;
            raidingStats.superRaids = (raidingStats.superRaids || 0) + 1;
          }
        }

        // Defenders touched go OUT
        (raid.touchedDefenderIds || []).forEach((defId) => {
          if (defenderCourt.has(defId)) {
            defenderCourt.delete(defId);
            defenderOutQueue.push(defId);
          }
        });

        // Revive players for raiding team equal to touchPoints
        const revivalsCount = Math.min(touchPts, raiderOutQueue.length);
        for (let i = 0; i < revivalsCount; i++) {
          const revivedId = raiderOutQueue.shift();
          if (revivedId) {
            raiderCourt.add(revivedId);
          }
        }

        break;
      }

      case 'TACKLE_POINT':
      case 'RAIDER_OUT':
      case 'DO_OR_DIE_FAIL': {
        const isSuperTackle = raid.isSuperTackle || (defenderCourt.size <= rules.superTackleActiveDefenders);
        const tacklePts = isSuperTackle ? rules.superTacklePoints : (raid.tacklePoints || 1);

        raidingStats.unsuccessfulRaids++;
        if (raider) raider.unsuccessfulRaids++;

        defendingStats.totalTackles++;
        defendingStats.successfulTackles++;
        defendingStats.tacklePoints += tacklePts;
        defendingStats.totalPoints += tacklePts;

        if (isSuperTackle) {
          defendingStats.superTackles++;
          defendingStats.superTacklePoints += tacklePts;
        }

        if (isRaiderTeamA) {
          teamBScore += tacklePts;
          if (half === 1) teamBScoreHalf1 += tacklePts;
          else teamBScoreHalf2 += tacklePts;
          consecutiveEmptyRaidsTeamA = 0;
        } else {
          teamAScore += tacklePts;
          if (half === 1) teamAScoreHalf1 += tacklePts;
          else teamAScoreHalf2 += tacklePts;
          consecutiveEmptyRaidsTeamB = 0;
        }

        // Raider is OUT
        if (raiderCourt.has(raid.raiderPlayerId)) {
          raiderCourt.delete(raid.raiderPlayerId);
          raiderOutQueue.push(raid.raiderPlayerId);
        }

        // Primary Tackler and Assistant Tacklers
        const tacklers = raid.tacklingDefenderIds || [];
        if (tacklers.length > 0) {
          const primaryTackler = playerStatsMap.get(tacklers[0]);
          if (primaryTackler) {
            primaryTackler.tackleAttempts++;
            primaryTackler.successfulTackles++;
            primaryTackler.tacklePoints += tacklePts;
            primaryTackler.totalPoints += tacklePts;
            if (isSuperTackle) primaryTackler.superTackles++;
          }
          // Secondary tacklers count attempts
          for (let k = 1; k < tacklers.length; k++) {
            const sec = playerStatsMap.get(tacklers[k]);
            if (sec) sec.tackleAttempts++;
          }
        }

        // Defending team revives 1 player from out queue
        if (defenderOutQueue.length > 0) {
          const revivedId = defenderOutQueue.shift();
          if (revivedId) {
            defenderCourt.add(revivedId);
          }
        }

        break;
      }

      case 'SUPER_TACKLE': {
        const tacklePts = rules.superTacklePoints || 2;
        raidingStats.unsuccessfulRaids++;
        if (raider) raider.unsuccessfulRaids++;

        defendingStats.totalTackles++;
        defendingStats.successfulTackles++;
        defendingStats.tacklePoints += tacklePts;
        defendingStats.superTackles++;
        defendingStats.superTacklePoints += tacklePts;
        defendingStats.totalPoints += tacklePts;

        if (isRaiderTeamA) {
          teamBScore += tacklePts;
          if (half === 1) teamBScoreHalf1 += tacklePts;
          else teamBScoreHalf2 += tacklePts;
          consecutiveEmptyRaidsTeamA = 0;
        } else {
          teamAScore += tacklePts;
          if (half === 1) teamAScoreHalf1 += tacklePts;
          else teamAScoreHalf2 += tacklePts;
          consecutiveEmptyRaidsTeamB = 0;
        }

        // Raider is OUT
        if (raiderCourt.has(raid.raiderPlayerId)) {
          raiderCourt.delete(raid.raiderPlayerId);
          raiderOutQueue.push(raid.raiderPlayerId);
        }

        const tacklers = raid.tacklingDefenderIds || [];
        if (tacklers.length > 0) {
          const primaryTackler = playerStatsMap.get(tacklers[0]);
          if (primaryTackler) {
            primaryTackler.tackleAttempts++;
            primaryTackler.successfulTackles++;
            primaryTackler.tacklePoints += tacklePts;
            primaryTackler.superTackles++;
            primaryTackler.totalPoints += tacklePts;
          }
        }

        // Defending team revives 1 player
        if (defenderOutQueue.length > 0) {
          const revivedId = defenderOutQueue.shift();
          if (revivedId) defenderCourt.add(revivedId);
        }

        break;
      }

      case 'TECHNICAL_POINT': {
        const pts = raid.technicalPoints || 1;
        const winnerTeamId = raid.pointWinnerTeamId || raid.raidingTeamId;
        if (winnerTeamId === teamAId) {
          teamAScore += pts;
          teamAStats.totalPoints += pts;
          if (half === 1) teamAScoreHalf1 += pts;
          else teamAScoreHalf2 += pts;
        } else {
          teamBScore += pts;
          teamBStats.totalPoints += pts;
          if (half === 1) teamBScoreHalf1 += pts;
          else teamBScoreHalf2 += pts;
        }
        break;
      }

      default:
        break;
    }

    // Check All-Out for Team A (all 7 out)
    if (activeCourtA.size === 0) {
      teamBStats.allOutsInflicted++;
      teamAStats.allOutsConceded++;
      teamBStats.allOutPoints += rules.allOutPoints;
      teamBStats.totalPoints += rules.allOutPoints;
      teamBScore += rules.allOutPoints;
      if (half === 1) teamBScoreHalf1 += rules.allOutPoints;
      else teamBScoreHalf2 += rules.allOutPoints;

      // Revive all 7 players of Team A back onto court
      activeCourtA = new Set<string>(teamAStartingIds);
      outQueueA = [];
    }

    // Check All-Out for Team B (all 7 out)
    if (activeCourtB.size === 0) {
      teamAStats.allOutsInflicted++;
      teamBStats.allOutsConceded++;
      teamAStats.allOutPoints += rules.allOutPoints;
      teamAStats.totalPoints += rules.allOutPoints;
      teamAScore += rules.allOutPoints;
      if (half === 1) teamAScoreHalf1 += rules.allOutPoints;
      else teamAScoreHalf2 += rules.allOutPoints;

      // Revive all 7 players of Team B back onto court
      activeCourtB = new Set<string>(teamBStartingIds);
      outQueueB = [];
    }
  });

  // Calculate final success percentages & on-court statuses
  playerStatsMap.forEach((p) => {
    p.raidSuccessRate = p.raidAttempts > 0 ? Math.round((p.successfulRaids / p.raidAttempts) * 100) : 0;
    p.tackleSuccessRate = p.tackleAttempts > 0 ? Math.round((p.successfulTackles / p.tackleAttempts) * 100) : 0;
    p.isCurrentlyOnCourt = p.teamId === teamAId ? activeCourtA.has(p.playerId) : activeCourtB.has(p.playerId);
  });

  teamAStats.activeCourtPlayersCount = activeCourtA.size;
  teamBStats.activeCourtPlayersCount = activeCourtB.size;
  teamAStats.firstHalfPoints = teamAScoreHalf1;
  teamAStats.secondHalfPoints = teamAScoreHalf2;
  teamBStats.firstHalfPoints = teamBScoreHalf1;
  teamBStats.secondHalfPoints = teamBScoreHalf2;

  const lastRaid = sortedRaids.length > 0 ? sortedRaids[sortedRaids.length - 1] : undefined;
  const currentHalf = lastRaid ? lastRaid.half : 1;

  // Next raid Do-or-Die status calculation
  const nextRaidingTeamId = lastRaid
    ? (lastRaid.raidingTeamId === teamAId ? teamBId : teamAId)
    : teamAId;

  const isCurrentRaidDoOrDie = nextRaidingTeamId === teamAId
    ? (consecutiveEmptyRaidsTeamA >= rules.doOrDieRaidThreshold - 1)
    : (consecutiveEmptyRaidsTeamB >= rules.doOrDieRaidThreshold - 1);

  // Match completion detection
  const isMatchComplete = match.status === 'COMPLETED';
  let matchWinnerId: string | undefined = undefined;
  let matchResultText = '';

  if (isMatchComplete) {
    if (teamAScore > teamBScore) {
      matchWinnerId = teamAId;
      matchResultText = `${match.teamA?.name || 'Team A'} won by ${teamAScore - teamBScore} points`;
    } else if (teamBScore > teamAScore) {
      matchWinnerId = teamBId;
      matchResultText = `${match.teamB?.name || 'Team B'} won by ${teamBScore - teamAScore} points`;
    } else {
      matchResultText = `Match Tied (${teamAScore} - ${teamBScore})`;
    }
  }

  const halfStatus = isMatchComplete
    ? 'MATCH_COMPLETE'
    : currentHalf === 1
    ? 'FIRST_HALF'
    : 'SECOND_HALF';

  return {
    match,
    sport: 'KABADDI',
    status: match.status,
    currentHalf,
    halfStatus,
    totalRaidsCount: sortedRaids.length,
    currentRaidNumber: sortedRaids.length + 1,
    activeRaidingTeamId: nextRaidingTeamId,
    consecutiveEmptyRaidsTeamA,
    consecutiveEmptyRaidsTeamB,
    isCurrentRaidDoOrDie,
    teamAScore,
    teamBScore,
    scoreA: teamAScore,
    scoreB: teamBScore,
    teamAScoreHalf1,
    teamAScoreHalf2,
    teamBScoreHalf1,
    teamBScoreHalf2,
    activeCourtPlayerIdsA: Array.from(activeCourtA),
    activeCourtPlayerIdsB: Array.from(activeCourtB),
    outPlayerIdsA: outQueueA,
    outPlayerIdsB: outQueueB,
    playerStats: Array.from(playerStatsMap.values()),
    teamAStats,
    teamBStats,
    raids: sortedRaids,
    lastRaid,
    timeouts,
    substitutions,
    isMatchComplete,
    matchWinnerId,
    matchResultText,
  };
}
