import crypto from 'crypto';
import {
  Match,
  Player,
  VolleyballPointEvent,
  VolleyballSet,
  VolleyballRotation,
  VolleyballSubstitution,
  VolleyballTimeout,
  VolleyballPlayerStats,
  VolleyballTeamStats,
  VolleyballMatchScoringState,
  VolleyballPointType,
} from '../../src/types';

/**
 * Perform standard clockwise volleyball rotation:
 * Position 2 -> Position 1 (New Server)
 * Position 3 -> Position 2
 * Position 4 -> Position 3
 * Position 5 -> Position 4
 * Position 6 -> Position 5
 * Position 1 -> Position 6
 */
export function rotateClockwise(rotation: VolleyballRotation): VolleyballRotation {
  return {
    teamId: rotation.teamId,
    position1: rotation.position2 || rotation.position1,
    position2: rotation.position3 || rotation.position2,
    position3: rotation.position4 || rotation.position3,
    position4: rotation.position5 || rotation.position4,
    position5: rotation.position6 || rotation.position5,
    position6: rotation.position1 || rotation.position6,
  };
}

/**
 * Build initial rotation for a team from squad or player list
 */
export function createDefaultRotation(teamId: string, playingIds: string[] = []): VolleyballRotation {
  return {
    teamId,
    position1: playingIds[0] || '',
    position2: playingIds[1] || '',
    position3: playingIds[2] || '',
    position4: playingIds[3] || '',
    position5: playingIds[4] || '',
    position6: playingIds[5] || '',
  };
}

/**
 * Determine match parameters from configuration
 */
export function getVolleyballMatchRules(match: Match) {
  const config = match.volleyballConfig || {
    format: 'Best of 5',
    pointsPerSet: 25,
    decidingSetPoints: 15,
    winningMargin: 2,
  };

  const format = config.format || 'Best of 5';
  let totalSets = 5;
  let setsToWin = 3;

  if (format === 'Best of 3') {
    totalSets = 3;
    setsToWin = 2;
  } else if (format === 'Custom') {
    totalSets = Number(config.customSetsCount) || 5;
    setsToWin = Math.ceil(totalSets / 2);
  } else {
    totalSets = 5;
    setsToWin = 3;
  }

  const normalPoints = Number(config.pointsPerSet) || 25;
  const decidingPoints = Number(config.decidingSetPoints) || 15;
  const winningMargin = Number(config.winningMargin) || 2;
  const timeoutsPerSet = Number(config.timeoutsPerSet) || 2;
  const maxSubstitutionsPerSet = Number(config.maxSubstitutionsPerSet) || 6;

  return {
    format,
    totalSets,
    setsToWin,
    normalPoints,
    decidingPoints,
    winningMargin,
    timeoutsPerSet,
    maxSubstitutionsPerSet,
  };
}

/**
 * Pure calculation engine for Volleyball Live Scoring.
 * Reconstructs the entire match state from immutable point events, timeouts, substitutions, and rotations.
 */
export function calculateVolleyballScoringState(
  match: Match,
  setsList: VolleyballSet[],
  events: VolleyballPointEvent[],
  timeoutsList: VolleyballTimeout[],
  substitutionsList: VolleyballSubstitution[],
  rotationsList: VolleyballRotation[],
  allPlayers: Player[]
): VolleyballMatchScoringState {
  const rules = getVolleyballMatchRules(match);

  const teamAPlayers = allPlayers.filter((p) => p.teamId === match.teamAId);
  const teamBPlayers = allPlayers.filter((p) => p.teamId === match.teamBId);

  const activeEvents = (events || []).filter((e) => !e.isUndone);
  activeEvents.sort((a, b) => a.rallyNumber - b.rallyNumber);

  // Initialize Sets
  let currentSetNumber = 1;
  const sets: VolleyballSet[] = [];

  // Determine current active set number from existing sets or events
  if (setsList && setsList.length > 0) {
    setsList.forEach((s) => {
      sets.push({ ...s });
    });
    sets.sort((a, b) => a.setNumber - b.setNumber);
    const lastSet = sets[sets.length - 1];
    if (lastSet.isCompleted) {
      currentSetNumber = lastSet.setNumber + 1;
    } else {
      currentSetNumber = lastSet.setNumber;
    }
  } else {
    const maxEventSet = activeEvents.reduce((max, e) => Math.max(max, e.setNumber || 1), 1);
    currentSetNumber = maxEventSet;
  }

  // Ensure current set object exists in sets list
  let currentSetObj = sets.find((s) => s.setNumber === currentSetNumber);
  if (!currentSetObj) {
    const isDecidingSet = currentSetNumber === rules.totalSets;
    currentSetObj = {
      id: crypto.randomUUID(),
      matchId: match.id,
      setNumber: currentSetNumber,
      teamAScore: 0,
      teamBScore: 0,
      targetPoints: isDecidingSet ? rules.decidingPoints : rules.normalPoints,
      winningMargin: rules.winningMargin,
      isCompleted: false,
      startTime: new Date().toISOString(),
    };
    sets.push(currentSetObj);
  }

  // Initial serving team
  const initialServingTeam =
    match.volleyballConfig?.servingFirstTeamId || match.toss?.winnerTeamId || match.teamAId;

  // Initialize Base Rotations from Match Squads or stored rotations
  const teamASquadIds = match.teamASquad?.playingIds || teamAPlayers.slice(0, 6).map((p) => p.id);
  const teamBSquadIds = match.teamBSquad?.playingIds || teamBPlayers.slice(0, 6).map((p) => p.id);

  let teamARotation =
    rotationsList.find((r) => r.teamId === match.teamAId) || createDefaultRotation(match.teamAId, teamASquadIds);
  let teamBRotation =
    rotationsList.find((r) => r.teamId === match.teamBId) || createDefaultRotation(match.teamBId, teamBSquadIds);

  // Apply substitutions to rotations
  (substitutionsList || []).forEach((sub) => {
    if (sub.teamId === match.teamAId) {
      for (let pos = 1; pos <= 6; pos++) {
        const key = `position${pos}` as keyof VolleyballRotation;
        if (teamARotation[key] === sub.playerOutId) {
          teamARotation = { ...teamARotation, [key]: sub.playerInId };
        }
      }
    } else if (sub.teamId === match.teamBId) {
      for (let pos = 1; pos <= 6; pos++) {
        const key = `position${pos}` as keyof VolleyballRotation;
        if (teamBRotation[key] === sub.playerOutId) {
          teamBRotation = { ...teamBRotation, [key]: sub.playerInId };
        }
      }
    }
  });

  // Track Player Statistics Map
  const playerStatsMap = new Map<string, VolleyballPlayerStats>();

  const initPlayerStat = (p: Player, isTeamA: boolean): VolleyballPlayerStats => ({
    playerId: p.id,
    playerName: p.name,
    jerseyNumber: p.jerseyNumber,
    role: p.role || 'Player',
    teamId: p.teamId,
    isStartingSix: isTeamA
      ? teamASquadIds.includes(p.id)
      : teamBSquadIds.includes(p.id),
    isLibero: isTeamA
      ? match.teamASquad?.liberoId === p.id
      : match.teamBSquad?.liberoId === p.id,
    attackPoints: 0,
    blockPoints: 0,
    serviceAces: 0,
    serviceErrors: 0,
    attackErrors: 0,
    receptionErrors: 0,
    blockingErrors: 0,
    digs: 0,
    assists: 0,
    kills: 0,
    totalPoints: 0,
    performancePoints: 0,
  });

  allPlayers.forEach((p) => {
    playerStatsMap.set(p.id, initPlayerStat(p, p.teamId === match.teamAId));
  });

  // Team Stats Maps
  const teamAStats: VolleyballTeamStats = {
    teamId: match.teamAId,
    teamName: match.teamA?.name || 'Team A',
    totalPoints: 0,
    setsWon: 0,
    attackPoints: 0,
    blockPoints: 0,
    serviceAces: 0,
    opponentErrors: 0,
    serviceErrors: 0,
    attackErrors: 0,
    receptionErrors: 0,
    blockingErrors: 0,
    timeoutsTaken: 0,
    substitutionsMade: 0,
  };

  const teamBStats: VolleyballTeamStats = {
    teamId: match.teamBId,
    teamName: match.teamB?.name || 'Team B',
    totalPoints: 0,
    setsWon: 0,
    attackPoints: 0,
    blockPoints: 0,
    serviceAces: 0,
    opponentErrors: 0,
    serviceErrors: 0,
    attackErrors: 0,
    receptionErrors: 0,
    blockingErrors: 0,
    timeoutsTaken: 0,
    substitutionsMade: 0,
  };

  // Replay Events & Compute Scores set by set
  let currentServingTeamId = initialServingTeam;
  let setsWonA = 0;
  let setsWonB = 0;

  // Set-wise scores accumulator
  const setScoresMap = new Map<number, { a: number; b: number }>();
  for (let s = 1; s <= rules.totalSets; s++) {
    setScoresMap.set(s, { a: 0, b: 0 });
  }

  // Iterate over active point events
  activeEvents.forEach((evt) => {
    const setNum = evt.setNumber || 1;
    const scores = setScoresMap.get(setNum) || { a: 0, b: 0 };

    const isTeamAWinner = evt.pointWinner === match.teamAId;
    const isTeamBWinner = evt.pointWinner === match.teamBId;

    if (isTeamAWinner) {
      scores.a += 1;
      teamAStats.totalPoints += 1;
    } else if (isTeamBWinner) {
      scores.b += 1;
      teamBStats.totalPoints += 1;
    }
    setScoresMap.set(setNum, scores);

    // Side-out Rotation Check:
    // If receiving team wins the point, they get serve and rotate clockwise!
    if (evt.pointWinner !== currentServingTeamId) {
      currentServingTeamId = evt.pointWinner;
      if (setNum === currentSetNumber) {
        if (currentServingTeamId === match.teamAId) {
          teamARotation = rotateClockwise(teamARotation);
        } else if (currentServingTeamId === match.teamBId) {
          teamBRotation = rotateClockwise(teamBRotation);
        }
      }
    }

    // Process Point Classification & Player Stats
    if (evt.playerId && playerStatsMap.has(evt.playerId)) {
      const pStat = playerStatsMap.get(evt.playerId)!;
      switch (evt.pointType) {
        case 'ATTACK_POINT':
          pStat.attackPoints += 1;
          pStat.kills += 1;
          pStat.totalPoints += 1;
          pStat.performancePoints += 3;
          if (isTeamAWinner) teamAStats.attackPoints += 1;
          else teamBStats.attackPoints += 1;
          break;
        case 'BLOCK_POINT':
          pStat.blockPoints += 1;
          pStat.totalPoints += 1;
          pStat.performancePoints += 3;
          if (isTeamAWinner) teamAStats.blockPoints += 1;
          else teamBStats.blockPoints += 1;
          break;
        case 'SERVICE_ACE':
          pStat.serviceAces += 1;
          pStat.totalPoints += 1;
          pStat.performancePoints += 3;
          if (isTeamAWinner) teamAStats.serviceAces += 1;
          else teamBStats.serviceAces += 1;
          break;
        case 'OPPONENT_SERVICE_ERROR':
          pStat.serviceErrors += 1;
          pStat.performancePoints -= 1;
          if (isTeamAWinner) {
            teamBStats.serviceErrors += 1;
            teamAStats.opponentErrors += 1;
          } else {
            teamAStats.serviceErrors += 1;
            teamBStats.opponentErrors += 1;
          }
          break;
        case 'OPPONENT_ATTACK_ERROR':
          pStat.attackErrors += 1;
          pStat.performancePoints -= 1;
          if (isTeamAWinner) {
            teamBStats.attackErrors += 1;
            teamAStats.opponentErrors += 1;
          } else {
            teamAStats.attackErrors += 1;
            teamBStats.opponentErrors += 1;
          }
          break;
        case 'OPPONENT_RECEPTION_ERROR':
          pStat.receptionErrors += 1;
          pStat.performancePoints -= 1;
          if (isTeamAWinner) {
            teamBStats.receptionErrors += 1;
            teamAStats.opponentErrors += 1;
          } else {
            teamAStats.receptionErrors += 1;
            teamBStats.opponentErrors += 1;
          }
          break;
        case 'OPPONENT_BLOCKING_ERROR':
          pStat.blockingErrors += 1;
          pStat.performancePoints -= 1;
          if (isTeamAWinner) {
            teamBStats.blockingErrors += 1;
            teamAStats.opponentErrors += 1;
          } else {
            teamAStats.blockingErrors += 1;
            teamBStats.opponentErrors += 1;
          }
          break;
        default:
          if (evt.opponentError) {
            if (isTeamAWinner) teamAStats.opponentErrors += 1;
            else teamBStats.opponentErrors += 1;
          }
          break;
      }
    } else {
      // Unclassified points or direct team errors
      if (evt.pointType === 'ATTACK_POINT') {
        if (isTeamAWinner) teamAStats.attackPoints += 1;
        else teamBStats.attackPoints += 1;
      } else if (evt.pointType === 'BLOCK_POINT') {
        if (isTeamAWinner) teamAStats.blockPoints += 1;
        else teamBStats.blockPoints += 1;
      } else if (evt.pointType === 'SERVICE_ACE') {
        if (isTeamAWinner) teamAStats.serviceAces += 1;
        else teamBStats.serviceAces += 1;
      } else if (evt.opponentError) {
        if (isTeamAWinner) teamAStats.opponentErrors += 1;
        else teamBStats.opponentErrors += 1;
      }
    }
  });

  // Calculate Set Completions and Sets Won
  sets.forEach((set) => {
    const scores = setScoresMap.get(set.setNumber) || { a: 0, b: 0 };
    set.teamAScore = scores.a;
    set.teamBScore = scores.b;

    const isDeciding = set.setNumber === rules.totalSets;
    const target = isDeciding ? rules.decidingPoints : rules.normalPoints;
    const margin = rules.winningMargin;

    const hasTeamAWon = scores.a >= target && scores.a - scores.b >= margin;
    const hasTeamBWon = scores.b >= target && scores.b - scores.a >= margin;

    if (hasTeamAWon || hasTeamBWon) {
      set.isCompleted = true;
      set.winnerTeamId = hasTeamAWon ? match.teamAId : match.teamBId;
      if (hasTeamAWon) setsWonA += 1;
      if (hasTeamBWon) setsWonB += 1;
    } else {
      set.isCompleted = false;
      set.winnerTeamId = undefined;
    }
  });

  teamAStats.setsWon = setsWonA;
  teamBStats.setsWon = setsWonB;

  // Timeouts count in current set
  const currentSetTimeouts = (timeoutsList || []).filter((t) => t.setNumber === currentSetNumber);
  const teamATimeouts = currentSetTimeouts.filter((t) => t.teamId === match.teamAId).length;
  const teamBTimeouts = currentSetTimeouts.filter((t) => t.teamId === match.teamBId).length;
  teamAStats.timeoutsTaken = (timeoutsList || []).filter((t) => t.teamId === match.teamAId).length;
  teamBStats.timeoutsTaken = (timeoutsList || []).filter((t) => t.teamId === match.teamBId).length;

  // Substitutions count in current set
  const currentSetSubs = (substitutionsList || []).filter((s) => s.setNumber === currentSetNumber);
  const teamASubstitutions = currentSetSubs.filter((s) => s.teamId === match.teamAId).length;
  const teamBSubstitutions = currentSetSubs.filter((s) => s.teamId === match.teamBId).length;
  teamAStats.substitutionsMade = (substitutionsList || []).filter((s) => s.teamId === match.teamAId).length;
  teamBStats.substitutionsMade = (substitutionsList || []).filter((s) => s.teamId === match.teamBId).length;

  // Check Match Completion
  const isMatchComplete = setsWonA >= rules.setsToWin || setsWonB >= rules.setsToWin;
  let matchWinnerId: string | undefined;
  let matchResultText: string | undefined;

  if (isMatchComplete) {
    matchWinnerId = setsWonA >= rules.setsToWin ? match.teamAId : match.teamBId;
    const winnerName = matchWinnerId === match.teamAId ? match.teamA?.name || 'Team A' : match.teamB?.name || 'Team B';
    const winningSets = Math.max(setsWonA, setsWonB);
    const losingSets = Math.min(setsWonA, setsWonB);
    const setScoresSummary = sets
      .filter((s) => s.isCompleted)
      .map((s) => `${s.teamAScore}-${s.teamBScore}`)
      .join(', ');

    matchResultText = `${winnerName} won ${winningSets}-${losingSets} (${setScoresSummary})`;
  }

  // Determine current active set
  const activeSet = sets.find((s) => s.setNumber === currentSetNumber) || currentSetObj;
  const isSetComplete = activeSet?.isCompleted || false;

  // Identify Current Server
  let serverPlayerId: string | undefined;
  if (currentServingTeamId === match.teamAId) {
    serverPlayerId = teamARotation.position1;
  } else {
    serverPlayerId = teamBRotation.position1;
  }

  const serverPlayer = allPlayers.find((p) => p.id === serverPlayerId);
  const serverPlayerName = serverPlayer?.name || 'Unknown Server';

  const lastEvent = activeEvents.length > 0 ? activeEvents[activeEvents.length - 1] : undefined;

  // Set point / Match point / Deuce detection
  const curA = activeSet ? activeSet.teamAScore : 0;
  const curB = activeSet ? activeSet.teamBScore : 0;
  const targetPts = currentSetNumber === rules.totalSets ? rules.decidingPoints : rules.normalPoints;
  const isDeuce = curA >= targetPts - 1 && curB >= targetPts - 1 && curA === curB;
  const aCanWinSet = curA >= targetPts - 1 && curA - curB >= 1;
  const bCanWinSet = curB >= targetPts - 1 && curB - curA >= 1;
  const isSetPoint = !isSetComplete && (aCanWinSet || bCanWinSet);
  const aCanWinMatch = aCanWinSet && (setsWonA === rules.setsToWin - 1);
  const bCanWinMatch = bCanWinSet && (setsWonB === rules.setsToWin - 1);
  const isMatchPoint = !isMatchComplete && (aCanWinMatch || bCanWinMatch);

  return {
    match,
    sport: 'VOLLEYBALL',
    currentSetNumber,
    sets,
    currentSet: activeSet,
    currentSetScoreA: activeSet?.teamAScore || 0,
    currentSetScoreB: activeSet?.teamBScore || 0,
    teamAScore: activeSet?.teamAScore || 0,
    teamBScore: activeSet?.teamBScore || 0,
    scoreA: activeSet?.teamAScore || 0,
    scoreB: activeSet?.teamBScore || 0,
    setsWonA,
    setsWonB,
    servingTeamId: currentServingTeamId,
    serverPlayerId,
    serverPlayerName,
    teamARotation,
    teamBRotation,
    teamATimeouts,
    teamBTimeouts,
    teamASubstitutions,
    teamBSubstitutions,
    maxTimeoutsPerSet: rules.timeoutsPerSet,
    maxSubstitutionsPerSet: rules.maxSubstitutionsPerSet,
    events: activeEvents,
    playerStats: Array.from(playerStatsMap.values()),
    teamAStats,
    teamBStats,
    isSetPoint,
    isMatchPoint,
    isDeuce,
    isSetComplete,
    isMatchComplete,
    matchWinnerId,
    matchResultText,
    lastEvent,
    liberoAId: match.teamASquad?.liberoId,
    liberoBId: match.teamBSquad?.liberoId,
  };
}
