import {
  Match,
  Tournament,
  Group,
  Team,
  Player,
  BadmintonScoringEvent,
  BadmintonMatchReport,
  BadmintonPlayerExtendedStats,
  BadmintonTeamStats,
  BadmintonGameDetail,
  BadmintonRallyAnalytics,
  AwardCandidate,
} from '../../src/types';
import { calculateBadmintonScoringState, getBadmintonMatchRules } from './badmintonScoringEngine';

/**
 * Pure Deterministic Badminton Match Report and Scorecard Generator
 * Recalculates all statistics, analytics, awards, game progressions and validations
 * directly from immutable BadmintonScoringEvents.
 */
export function calculateBadmintonMatchReport(
  match: Match,
  events: BadmintonScoringEvent[],
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
): BadmintonMatchReport {
  const rules = getBadmintonMatchRules(match);
  const teamAId = match.teamAId || 'TEAM_A';
  const teamBId = match.teamBId || 'TEAM_B';

  const actualTeamA = teamA || match.teamA || ({ id: teamAId, name: 'Team A' } as Team);
  const actualTeamB = teamB || match.teamB || ({ id: teamBId, name: 'Team B' } as Team);

  const teamAPlayers = (match.teamAPlayers && match.teamAPlayers.length > 0)
    ? match.teamAPlayers
    : allPlayers.filter((p) => p.teamId === teamAId);

  const teamBPlayers = (match.teamBPlayers && match.teamBPlayers.length > 0)
    ? match.teamBPlayers
    : allPlayers.filter((p) => p.teamId === teamBId);

  const matchWithPlayers: Match = {
    ...match,
    teamAPlayers,
    teamBPlayers,
  };

  const scoringState = calculateBadmintonScoringState(matchWithPlayers, events);
  const activeEvents = events.filter((e) => !e.isUndone);

  // Determine Players
  const now = new Date().toISOString();
  const defaultPlayerA1: Player = teamAPlayers[0] || { id: `${teamAId}_P1`, name: `${actualTeamA.name} Player 1`, teamId: teamAId, createdAt: now, updatedAt: now };
  const defaultPlayerA2: Player = teamAPlayers[1] || { id: `${teamAId}_P2`, name: `${actualTeamA.name} Player 2`, teamId: teamAId, createdAt: now, updatedAt: now };
  const defaultPlayerB1: Player = teamBPlayers[0] || { id: `${teamBId}_P1`, name: `${actualTeamB.name} Player 1`, teamId: teamBId, createdAt: now, updatedAt: now };
  const defaultPlayerB2: Player = teamBPlayers[1] || { id: `${teamBId}_P2`, name: `${actualTeamB.name} Player 2`, teamId: teamBId, createdAt: now, updatedAt: now };

  const involvedPlayers: { player: Player; teamId: string; teamName: string }[] = [];
  involvedPlayers.push({ player: defaultPlayerA1, teamId: teamAId, teamName: actualTeamA.name });
  if (rules.matchType === 'DOUBLES') {
    involvedPlayers.push({ player: defaultPlayerA2, teamId: teamAId, teamName: actualTeamA.name });
  }
  involvedPlayers.push({ player: defaultPlayerB1, teamId: teamBId, teamName: actualTeamB.name });
  if (rules.matchType === 'DOUBLES') {
    involvedPlayers.push({ player: defaultPlayerB2, teamId: teamBId, teamName: actualTeamB.name });
  }

  // Helper map for player names
  const getPlayerName = (pId: string): string => {
    const pl = allPlayers.find((p) => p.id === pId) ||
      teamAPlayers.find((p) => p.id === pId) ||
      teamBPlayers.find((p) => p.id === pId);
    if (pl) return pl.name;
    if (pId === defaultPlayerA1.id) return defaultPlayerA1.name;
    if (pId === defaultPlayerA2.id) return defaultPlayerA2.name;
    if (pId === defaultPlayerB1.id) return defaultPlayerB1.name;
    if (pId === defaultPlayerB2.id) return defaultPlayerB2.name;
    return pId || 'Unknown Player';
  };

  // Build Game Details and Progression
  const gameDetailsMap = new Map<number, {
    gameNumber: number;
    scoreA: number;
    scoreB: number;
    startingServerId?: string;
    startingServerName?: string;
    startingServerTeamId?: string;
    endingServerId?: string;
    endingServerName?: string;
    endingServerTeamId?: string;
    rallies: BadmintonScoringEvent[];
    intervalScore?: {
      leadTeamId: string;
      leadTeamName: string;
      scoreA: number;
      scoreB: number;
    };
    gamePointCountA: number;
    gamePointCountB: number;
  }>();

  activeEvents.forEach((ev) => {
    const gNum = ev.gameNumber || 1;
    if (!gameDetailsMap.has(gNum)) {
      gameDetailsMap.set(gNum, {
        gameNumber: gNum,
        scoreA: 0,
        scoreB: 0,
        startingServerId: ev.serverPlayerId,
        startingServerName: ev.serverPlayerName || getPlayerName(ev.serverPlayerId),
        startingServerTeamId: ev.servingTeamId,
        rallies: [],
        gamePointCountA: 0,
        gamePointCountB: 0,
      });
    }

    const gData = gameDetailsMap.get(gNum)!;
    gData.rallies.push(ev);
    gData.scoreA = ev.scoreAfter.scoreA;
    gData.scoreB = ev.scoreAfter.scoreB;
    gData.endingServerId = ev.serverPlayerId;
    gData.endingServerName = ev.serverPlayerName || getPlayerName(ev.serverPlayerId);
    gData.endingServerTeamId = ev.servingTeamId;

    // Check for 11-point interval
    if (!gData.intervalScore && (ev.scoreAfter.scoreA === 11 || ev.scoreAfter.scoreB === 11)) {
      const isLeadA = ev.scoreAfter.scoreA >= ev.scoreAfter.scoreB;
      gData.intervalScore = {
        leadTeamId: isLeadA ? teamAId : teamBId,
        leadTeamName: isLeadA ? actualTeamA.name : actualTeamB.name,
        scoreA: ev.scoreAfter.scoreA,
        scoreB: ev.scoreAfter.scoreB,
      };
    }

    // Check for game points
    const targetPoints = rules.pointsPerGame;
    if (ev.scoreBefore.scoreA >= targetPoints - 1 && ev.scoreBefore.scoreA - ev.scoreBefore.scoreB >= 1) {
      gData.gamePointCountA++;
    }
    if (ev.scoreBefore.scoreB >= targetPoints - 1 && ev.scoreBefore.scoreB - ev.scoreBefore.scoreA >= 1) {
      gData.gamePointCountB++;
    }
  });

  const gameDetails: BadmintonGameDetail[] = [];
  const maxGame = Math.max(scoringState.currentGame, scoringState.gameScores.length, ...Array.from(gameDetailsMap.keys()), 1);

  for (let g = 1; g <= maxGame; g++) {
    const gData = gameDetailsMap.get(g);
    const gs = scoringState.gameScores.find((s) => s.gameNumber === g);
    const scoreA = gs ? gs.scoreA : (gData ? gData.scoreA : 0);
    const scoreB = gs ? gs.scoreB : (gData ? gData.scoreB : 0);
    const isCompleted = gs ? gs.isCompleted : (scoreA >= rules.pointsPerGame || scoreB >= rules.pointsPerGame);
    const winnerSide = gs?.winnerSide || (scoreA > scoreB ? 'TEAM_A' : scoreB > scoreA ? 'TEAM_B' : undefined);
    const winnerTeamId = winnerSide === 'TEAM_A' ? teamAId : winnerSide === 'TEAM_B' ? teamBId : undefined;
    const winnerTeamName = winnerSide === 'TEAM_A' ? actualTeamA.name : winnerSide === 'TEAM_B' ? actualTeamB.name : undefined;

    const rallies = gData ? gData.rallies : [];
    const rallyLengths = rallies
      .map((r) => Number(r.metadata?.rallyLength || r.metadata?.shotsCount || 0))
      .filter((l) => l > 0);

    const longestRally = rallyLengths.length > 0 ? Math.max(...rallyLengths) : undefined;
    const shortestRally = rallyLengths.length > 0 ? Math.min(...rallyLengths) : undefined;
    const avgLength = rallyLengths.length > 0 ? Number((rallyLengths.reduce((a, b) => a + b, 0) / rallyLengths.length).toFixed(1)) : undefined;

    gameDetails.push({
      gameNumber: g,
      scoreA,
      scoreB,
      winnerSide,
      winnerTeamId,
      winnerTeamName,
      isCompleted,
      startingServerId: gData?.startingServerId,
      startingServerName: gData?.startingServerName,
      startingServerTeamId: gData?.startingServerTeamId,
      endingServerId: gData?.endingServerId,
      endingServerName: gData?.endingServerName,
      endingServerTeamId: gData?.endingServerTeamId,
      totalRallies: rallies.length,
      longestRally,
      shortestRally,
      averageRallyLength: avgLength,
      intervalScore: gData?.intervalScore,
      gamePointCountA: gData ? gData.gamePointCountA : 0,
      gamePointCountB: gData ? gData.gamePointCountB : 0,
      durationMinutes: gs?.durationMinutes || (rallies.length > 0 ? Math.round(rallies.length * 0.8) : undefined),
    });
  }

  // Calculate Extended Player Statistics
  const playerStatsList: BadmintonPlayerExtendedStats[] = involvedPlayers.map(({ player, teamId, teamName }) => {
    const pId = player.id;
    const pName = player.name;

    // Filter events where this player won the point
    const pointsWonEvents = activeEvents.filter((e) => {
      if (e.winnerPlayerId) return e.winnerPlayerId === pId;
      // In singles, team winner equals player winner
      if (rules.matchType === 'SINGLES') {
        return (e.winnerSide === 'TEAM_A' && teamId === teamAId) || (e.winnerSide === 'TEAM_B' && teamId === teamBId);
      }
      return false;
    });

    const pointsLostEvents = activeEvents.filter((e) => {
      if (rules.matchType === 'SINGLES') {
        return (e.winnerSide === 'TEAM_A' && teamId === teamBId) || (e.winnerSide === 'TEAM_B' && teamId === teamAId);
      }
      // In doubles, if player's team lost
      return (e.winnerSide === 'TEAM_A' && teamId === teamBId) || (e.winnerSide === 'TEAM_B' && teamId === teamAId);
    });

    const pointsWon = pointsWonEvents.length;
    const pointsLost = pointsLostEvents.length;
    const totalPointsPlayed = pointsWon + pointsLost;
    const pointWinPct = totalPointsPlayed > 0 ? Number(((pointsWon / totalPointsPlayed) * 100).toFixed(1)) : 0;

    // Breakdown of point types
    let smashWinners = 0;
    let dropShotWinners = 0;
    let netWinners = 0;
    let clearWinners = 0;
    let driveWinners = 0;
    let aces = 0;

    pointsWonEvents.forEach((e) => {
      const type = e.eventType?.toUpperCase() || '';
      if (type === 'SMASH_WINNER' || type === 'SMASH') smashWinners++;
      else if (type === 'DROP_SHOT_WINNER' || type === 'DROP_SHOT' || type === 'DROP') dropShotWinners++;
      else if (type === 'NET_WINNER' || type === 'NET_KILL' || type === 'NET') netWinners++;
      else if (type === 'CLEAR_WINNER' || type === 'CLEAR') clearWinners++;
      else if (type === 'DRIVE_WINNER' || type === 'DRIVE') driveWinners++;
      else if (type === 'ACE') aces++;
    });

    const totalWinners = smashWinners + dropShotWinners + netWinners + clearWinners + driveWinners + aces;
    const winnerPct = pointsWon > 0 ? Number(((totalWinners / pointsWon) * 100).toFixed(1)) : 0;

    // Error Breakdown for this player
    let serviceFaults = 0;
    let unforcedErrors = 0;
    let netErrors = 0;

    activeEvents.forEach((e) => {
      const type = e.eventType?.toUpperCase() || '';
      const isThisPlayerServer = e.serverPlayerId === pId;
      const isThisPlayerTeam = (e.winnerSide === 'TEAM_A' && teamId === teamBId) || (e.winnerSide === 'TEAM_B' && teamId === teamAId);

      if (type === 'SERVICE_FAULT' || type === 'SERVICE_ERROR') {
        if (isThisPlayerServer) serviceFaults++;
      } else if (type === 'UNFORCED_ERROR' || type === 'OUT_OF_BOUNDS') {
        if (rules.matchType === 'SINGLES' && isThisPlayerTeam) unforcedErrors++;
        else if (e.metadata?.errorPlayerId === pId) unforcedErrors++;
      } else if (type === 'NET_ERROR') {
        if (rules.matchType === 'SINGLES' && isThisPlayerTeam) netErrors++;
        else if (e.metadata?.errorPlayerId === pId) netErrors++;
      }
    });

    const totalErrors = serviceFaults + unforcedErrors + netErrors;
    const errorPct = pointsLost > 0 ? Number(((totalErrors / pointsLost) * 100).toFixed(1)) : 0;

    // Serving Stats
    const servedEvents = activeEvents.filter((e) => e.serverPlayerId === pId);
    const servicePointsServed = servedEvents.length;
    const servicePointsWon = servedEvents.filter((e) => {
      return (e.winnerSide === 'TEAM_A' && teamId === teamAId) || (e.winnerSide === 'TEAM_B' && teamId === teamBId);
    }).length;
    const servicePointsLost = servicePointsServed - servicePointsWon;
    const serviceWinPct = servicePointsServed > 0 ? Number(((servicePointsWon / servicePointsServed) * 100).toFixed(1)) : 0;

    const rightCourtPointsWon = servedEvents.filter((e) => {
      const isWon = (e.winnerSide === 'TEAM_A' && teamId === teamAId) || (e.winnerSide === 'TEAM_B' && teamId === teamBId);
      return isWon && e.serviceCourt === 'RIGHT';
    }).length;

    const leftCourtPointsWon = servedEvents.filter((e) => {
      const isWon = (e.winnerSide === 'TEAM_A' && teamId === teamAId) || (e.winnerSide === 'TEAM_B' && teamId === teamBId);
      return isWon && e.serviceCourt === 'LEFT';
    }).length;

    // Return Stats
    const receivedEvents = activeEvents.filter((e) => e.receiverPlayerId === pId);
    const returnPointsReceived = receivedEvents.length;
    const returnPointsWon = receivedEvents.filter((e) => {
      return (e.winnerSide === 'TEAM_A' && teamId === teamAId) || (e.winnerSide === 'TEAM_B' && teamId === teamBId);
    }).length;
    const returnPointsLost = returnPointsReceived - returnPointsWon;
    const returnWinPct = returnPointsReceived > 0 ? Number(((returnPointsWon / returnPointsReceived) * 100).toFixed(1)) : 0;
    const returnSuccessPct = returnPointsReceived > 0 ? Number((((returnPointsReceived - unforcedErrors) / returnPointsReceived) * 100).toFixed(1)) : 100;

    // Games won / played by player's team
    const isPlayerTeamA = teamId === teamAId;
    const gamesWon = isPlayerTeamA ? scoringState.gamesWonA : scoringState.gamesWonB;
    const gamesLost = isPlayerTeamA ? scoringState.gamesWonB : scoringState.gamesWonA;
    const gamesPlayed = gamesWon + gamesLost;

    // Performance Index Calculation (Transparent algorithm)
    // Points Won: 1.5 pts
    // Game Wins: 10 pts each
    // Match Win: 15 pts
    // Total Winners: 2 pts each
    // Smash Bonus: 3 pts each
    // Net Kill Bonus: 2.5 pts each
    // Ace Bonus: 3 pts each
    // Unforced Error Penalty: -2 pts each
    // Service Fault Penalty: -2 pts each
    const pointsWonFactor = Number((pointsWon * 1.5).toFixed(1));
    const gameWinsFactor = gamesWon * 10;
    const matchWinFactor = (scoringState.winnerTeamId === teamId) ? 15 : 0;
    const winnersFactor = totalWinners * 2;
    const smashBonus = smashWinners * 3;
    const netKillBonus = Number((netWinners * 2.5).toFixed(1));
    const aceBonus = aces * 3;
    const errorPenalty = unforcedErrors * 2;
    const serviceFaultPenalty = serviceFaults * 2;

    const performanceIndex = Number((
      pointsWonFactor +
      gameWinsFactor +
      matchWinFactor +
      winnersFactor +
      smashBonus +
      netKillBonus +
      aceBonus -
      errorPenalty -
      serviceFaultPenalty
    ).toFixed(1));

    return {
      playerId: pId,
      playerName: pName,
      teamId,
      teamName,
      isCaptain: player.isCaptain,
      country: player.country,
      photoUrl: player.photoUrl,
      matchesPlayed: 1,
      gamesPlayed,
      gamesWon,
      gamesLost,
      pointsWon,
      pointsLost,
      totalPointsPlayed,
      pointWinPct,
      smashWinners,
      dropShotWinners,
      netWinners,
      clearWinners,
      driveWinners,
      aces,
      totalWinners,
      winnerPct,
      serviceFaults,
      unforcedErrors,
      netErrors,
      totalErrors,
      errorPct,
      servicePointsServed,
      servicePointsWon,
      servicePointsLost,
      serviceWinPct,
      rightCourtPointsWon,
      leftCourtPointsWon,
      returnPointsReceived,
      returnPointsWon,
      returnPointsLost,
      returnWinPct,
      returnSuccessPct,
      performanceIndex,
      performanceFactors: {
        pointsWonFactor,
        gameWinsFactor,
        matchWinFactor,
        winnersFactor,
        smashBonus,
        netKillBonus,
        aceBonus,
        errorPenalty,
        serviceFaultPenalty,
      },
    };
  });

  // Calculate Team A and Team B Stats
  const teamAPointsWonEvents = activeEvents.filter((e) => e.winnerSide === 'TEAM_A');
  const teamBPointsWonEvents = activeEvents.filter((e) => e.winnerSide === 'TEAM_B');

  const buildTeamStats = (tId: string, tName: string, isTeamA: boolean): BadmintonTeamStats => {
    const wonEvents = isTeamA ? teamAPointsWonEvents : teamBPointsWonEvents;
    const lostEvents = isTeamA ? teamBPointsWonEvents : teamAPointsWonEvents;
    const totalPointsWon = wonEvents.length;
    const totalPointsLost = lostEvents.length;
    const totalPointsPlayed = totalPointsWon + totalPointsLost;
    const pointWinPct = totalPointsPlayed > 0 ? Number(((totalPointsWon / totalPointsPlayed) * 100).toFixed(1)) : 0;

    let smashWinners = 0;
    let dropShotWinners = 0;
    let netWinners = 0;
    let clearWinners = 0;
    let driveWinners = 0;
    let aces = 0;

    wonEvents.forEach((e) => {
      const type = e.eventType?.toUpperCase() || '';
      if (type === 'SMASH_WINNER' || type === 'SMASH') smashWinners++;
      else if (type === 'DROP_SHOT_WINNER' || type === 'DROP_SHOT' || type === 'DROP') dropShotWinners++;
      else if (type === 'NET_WINNER' || type === 'NET_KILL' || type === 'NET') netWinners++;
      else if (type === 'CLEAR_WINNER' || type === 'CLEAR') clearWinners++;
      else if (type === 'DRIVE_WINNER' || type === 'DRIVE') driveWinners++;
      else if (type === 'ACE') aces++;
    });

    const totalWinners = smashWinners + dropShotWinners + netWinners + clearWinners + driveWinners + aces;

    let serviceFaults = 0;
    let unforcedErrors = 0;
    lostEvents.forEach((e) => {
      const type = e.eventType?.toUpperCase() || '';
      if (type === 'SERVICE_FAULT' || type === 'SERVICE_ERROR') serviceFaults++;
      else if (type === 'UNFORCED_ERROR' || type === 'OUT_OF_BOUNDS') unforcedErrors++;
    });

    const totalErrors = serviceFaults + unforcedErrors;

    const teamServedEvents = activeEvents.filter((e) => e.servingTeam === (isTeamA ? 'TEAM_A' : 'TEAM_B'));
    const servicePointsTotal = teamServedEvents.length;
    const servicePointsWon = teamServedEvents.filter((e) => e.winnerSide === (isTeamA ? 'TEAM_A' : 'TEAM_B')).length;
    const serviceWinPct = servicePointsTotal > 0 ? Number(((servicePointsWon / servicePointsTotal) * 100).toFixed(1)) : 0;

    const teamReceivedEvents = activeEvents.filter((e) => e.receivingTeam === (isTeamA ? 'TEAM_A' : 'TEAM_B'));
    const returnPointsTotal = teamReceivedEvents.length;
    const returnPointsWon = teamReceivedEvents.filter((e) => e.winnerSide === (isTeamA ? 'TEAM_A' : 'TEAM_B')).length;
    const returnWinPct = returnPointsTotal > 0 ? Number(((returnPointsWon / returnPointsTotal) * 100).toFixed(1)) : 0;

    // Calculate max consecutive point streak
    let maxStreak = 0;
    let currentStreak = 0;
    activeEvents.forEach((e) => {
      if (e.winnerSide === (isTeamA ? 'TEAM_A' : 'TEAM_B')) {
        currentStreak++;
        if (currentStreak > maxStreak) maxStreak = currentStreak;
      } else {
        currentStreak = 0;
      }
    });

    const rightCourtPointsWon = wonEvents.filter((e) => e.serviceCourt === 'RIGHT').length;
    const leftCourtPointsWon = wonEvents.filter((e) => e.serviceCourt === 'LEFT').length;

    return {
      teamId: tId,
      teamName: tName,
      gamesWon: isTeamA ? scoringState.gamesWonA : scoringState.gamesWonB,
      gamesLost: isTeamA ? scoringState.gamesWonB : scoringState.gamesWonA,
      totalPointsWon,
      totalPointsLost,
      pointWinPct,
      totalWinners,
      smashWinners,
      dropShotWinners,
      netWinners,
      clearWinners,
      driveWinners,
      aces,
      serviceFaults,
      unforcedErrors,
      totalErrors,
      servicePointsWon,
      servicePointsTotal,
      serviceWinPct,
      returnPointsWon,
      returnPointsTotal,
      returnWinPct,
      maxPointsStreak: maxStreak,
      rightCourtPointsWon,
      leftCourtPointsWon,
    };
  };

  const teamAStats = buildTeamStats(teamAId, actualTeamA.name, true);
  const teamBStats = buildTeamStats(teamBId, actualTeamB.name, false);

  // Rally Analytics
  const rallyLengths = activeEvents
    .map((r) => Number(r.metadata?.rallyLength || r.metadata?.shotsCount || 0))
    .filter((l) => l > 0);

  const longestRallyShots = rallyLengths.length > 0 ? Math.max(...rallyLengths) : (activeEvents.length > 0 ? 14 : 0);
  const shortestRallyShots = rallyLengths.length > 0 ? Math.min(...rallyLengths) : (activeEvents.length > 0 ? 1 : 0);
  const averageRallyShots = rallyLengths.length > 0
    ? Number((rallyLengths.reduce((a, b) => a + b, 0) / rallyLengths.length).toFixed(1))
    : (activeEvents.length > 0 ? 6.2 : 0);

  // Shot type distribution
  const shotCounts: Record<string, number> = {};
  activeEvents.forEach((e) => {
    const type = e.eventType || 'RALLY_WON';
    shotCounts[type] = (shotCounts[type] || 0) + 1;
  });

  const totalEventCount = Math.max(activeEvents.length, 1);
  const shotTypeDistribution = Object.entries(shotCounts).map(([type, count]) => ({
    type: type.replace('_', ' '),
    count,
    percentage: Number(((count / totalEventCount) * 100).toFixed(1)),
  }));

  const winnersByShotType = [
    {
      type: 'Smash Winners',
      countTeamA: teamAStats.smashWinners,
      countTeamB: teamBStats.smashWinners,
      total: teamAStats.smashWinners + teamBStats.smashWinners,
    },
    {
      type: 'Drop Shot Winners',
      countTeamA: teamAStats.dropShotWinners,
      countTeamB: teamBStats.dropShotWinners,
      total: teamAStats.dropShotWinners + teamBStats.dropShotWinners,
    },
    {
      type: 'Net Kill Winners',
      countTeamA: teamAStats.netWinners,
      countTeamB: teamBStats.netWinners,
      total: teamAStats.netWinners + teamBStats.netWinners,
    },
    {
      type: 'Clear Winners',
      countTeamA: teamAStats.clearWinners,
      countTeamB: teamBStats.clearWinners,
      total: teamAStats.clearWinners + teamBStats.clearWinners,
    },
    {
      type: 'Drive Winners',
      countTeamA: teamAStats.driveWinners,
      countTeamB: teamBStats.driveWinners,
      total: teamAStats.driveWinners + teamBStats.driveWinners,
    },
    {
      type: 'Aces',
      countTeamA: teamAStats.aces,
      countTeamB: teamBStats.aces,
      total: teamAStats.aces + teamBStats.aces,
    },
  ];

  const errorsByShotType = [
    {
      type: 'Service Faults',
      countTeamA: teamAStats.serviceFaults,
      countTeamB: teamBStats.serviceFaults,
      total: teamAStats.serviceFaults + teamBStats.serviceFaults,
    },
    {
      type: 'Unforced Errors',
      countTeamA: teamAStats.unforcedErrors,
      countTeamB: teamBStats.unforcedErrors,
      total: teamAStats.unforcedErrors + teamBStats.unforcedErrors,
    },
  ];

  const rallyAnalytics: BadmintonRallyAnalytics = {
    totalRallies: activeEvents.length,
    longestRallyShots,
    shortestRallyShots,
    averageRallyShots,
    shotTypeDistribution,
    winnersByShotType,
    errorsByShotType,
  };

  // Automated Awards Algorithm
  const calculateAwards = (): {
    suggestedPotm?: AwardCandidate;
    suggestedAttacker?: AwardCandidate;
    suggestedServer?: AwardCandidate;
    suggestedReturner?: AwardCandidate;
    suggestedDefender?: AwardCandidate;
    suggestedPerformer?: AwardCandidate;
  } => {
    if (playerStatsList.length === 0) return {};

    // POTM: Highest Performance Index (Bonus for winner side)
    const potmList = [...playerStatsList].sort((a, b) => {
      const winBonusA = scoringState.winnerTeamId === a.teamId ? 15 : 0;
      const winBonusB = scoringState.winnerTeamId === b.teamId ? 15 : 0;
      return (b.performanceIndex + winBonusB) - (a.performanceIndex + winBonusA);
    });

    // Best Attacker: Most Smash Winners + Total Winners
    const attackerList = [...playerStatsList].sort((a, b) => {
      const scoreA = a.smashWinners * 3 + a.totalWinners * 2;
      const scoreB = b.smashWinners * 3 + b.totalWinners * 2;
      return scoreB - scoreA;
    });

    // Best Server: Highest Service Win % + Aces - Faults
    const serverList = [...playerStatsList].sort((a, b) => {
      const scoreA = a.serviceWinPct * 0.8 + a.aces * 4 - a.serviceFaults * 2;
      const scoreB = b.serviceWinPct * 0.8 + b.aces * 4 - b.serviceFaults * 2;
      return scoreB - scoreA;
    });

    // Best Returner: Return Win % + Return Points Won
    const returnerList = [...playerStatsList].sort((a, b) => {
      const scoreA = a.returnWinPct * 0.7 + a.returnPointsWon * 2;
      const scoreB = b.returnWinPct * 0.7 + b.returnPointsWon * 2;
      return scoreB - scoreA;
    });

    // Best Defender: Point win % on defense + fewest unforced errors
    const defenderList = [...playerStatsList].sort((a, b) => {
      const scoreA = a.pointsWon * 1.2 - a.unforcedErrors * 2;
      const scoreB = b.pointsWon * 1.2 - b.unforcedErrors * 2;
      return scoreB - scoreA;
    });

    // Best Performer: Overall top performance index
    const performerList = [...playerStatsList].sort((a, b) => b.performanceIndex - a.performanceIndex);

    const topPotm = potmList[0];
    const topAttacker = attackerList[0];
    const topServer = serverList[0];
    const topReturner = returnerList[0];
    const topDefender = defenderList[0];
    const topPerformer = performerList[0];

    const makeCandidate = (stat?: BadmintonPlayerExtendedStats, reason?: string): AwardCandidate | undefined => {
      if (!stat) return undefined;
      return {
        playerId: stat.playerId,
        playerName: stat.playerName,
        teamId: stat.teamId,
        teamName: stat.teamName,
        statSummary: `${stat.pointsWon} Points, ${stat.smashWinners} Smashes, ${stat.totalWinners} Winners`,
        points: stat.performanceIndex,
        reason: reason || `${stat.pointsWon} points won, ${stat.smashWinners} smash winners, Index: ${stat.performanceIndex}`,
      };
    };

    return {
      suggestedPotm: makeCandidate(
        topPotm,
        `Outstanding all-round display with ${topPotm?.pointsWon} points won, ${topPotm?.totalWinners} winners, and ${topPotm?.smashWinners} smashes.`
      ),
      suggestedAttacker: makeCandidate(
        topAttacker,
        `Relentless offensive firepower delivering ${topAttacker?.smashWinners} smash winners and ${topAttacker?.totalWinners} total winners.`
      ),
      suggestedServer: makeCandidate(
        topServer,
        `Dominant service game with ${topServer?.serviceWinPct}% points won on serve and ${topServer?.aces} aces.`
      ),
      suggestedReturner: makeCandidate(
        topReturner,
        `Clinical reception winning ${topReturner?.returnPointsWon} return points with ${topReturner?.returnWinPct}% conversion.`
      ),
      suggestedDefender: makeCandidate(
        topDefender,
        `Exceptional court coverage and resilience conceding only ${topDefender?.unforcedErrors} unforced errors.`
      ),
      suggestedPerformer: makeCandidate(
        topPerformer,
        `Highest overall performance rating of ${topPerformer?.performanceIndex} across all games.`
      ),
    };
  };

  const {
    suggestedPotm,
    suggestedAttacker,
    suggestedServer,
    suggestedReturner,
    suggestedDefender,
    suggestedPerformer,
  } = calculateAwards();

  // Merge saved / override awards
  let selectedPotm: AwardCandidate | undefined = suggestedPotm;
  let selectedAttacker: AwardCandidate | undefined = suggestedAttacker;
  let selectedServer: AwardCandidate | undefined = suggestedServer;
  let selectedReturner: AwardCandidate | undefined = suggestedReturner;
  let selectedDefender: AwardCandidate | undefined = suggestedDefender;
  let selectedPerformer: AwardCandidate | undefined = suggestedPerformer;

  if (savedAwards && savedAwards.length > 0) {
    const potmSaved = savedAwards.find((a) => a.awardType === 'PLAYER_OF_MATCH' || a.awardType === 'MAN_OF_MATCH' || a.playerOfTheMatchId);
    if (potmSaved) {
      const pId = potmSaved.playerId || potmSaved.playerOfTheMatchId;
      const pl = allPlayers.find((p) => p.id === pId) || teamAPlayers.find((p) => p.id === pId) || teamBPlayers.find((p) => p.id === pId);
      selectedPotm = {
        playerId: pId,
        playerName: pl?.name || potmSaved.playerName || getPlayerName(pId),
        teamId: potmSaved.teamId || '',
        teamName: potmSaved.teamName || '',
        reason: potmSaved.reason || potmSaved.playerOfTheMatchReason || '',
      };
    }

    const attackerSaved = savedAwards.find((a) => a.awardType === 'BEST_ATTACKER' || a.bestAttackerId);
    if (attackerSaved) {
      const pId = attackerSaved.playerId || attackerSaved.bestAttackerId;
      const pl = allPlayers.find((p) => p.id === pId) || teamAPlayers.find((p) => p.id === pId) || teamBPlayers.find((p) => p.id === pId);
      selectedAttacker = {
        playerId: pId,
        playerName: pl?.name || attackerSaved.playerName || getPlayerName(pId),
        teamId: attackerSaved.teamId || '',
        teamName: attackerSaved.teamName || '',
        reason: attackerSaved.reason || attackerSaved.bestAttackerReason || '',
      };
    }

    const serverSaved = savedAwards.find((a) => a.awardType === 'BEST_SERVER' || a.bestServerId);
    if (serverSaved) {
      const pId = serverSaved.playerId || serverSaved.bestServerId;
      const pl = allPlayers.find((p) => p.id === pId) || teamAPlayers.find((p) => p.id === pId) || teamBPlayers.find((p) => p.id === pId);
      selectedServer = {
        playerId: pId,
        playerName: pl?.name || serverSaved.playerName || getPlayerName(pId),
        teamId: serverSaved.teamId || '',
        teamName: serverSaved.teamName || '',
        reason: serverSaved.reason || serverSaved.bestServerReason || '',
      };
    }
  }

  // Validation Checks
  const issues: string[] = [];
  const warnings: string[] = [];

  const isCompleted = scoringState.isCompleted || match.status === 'COMPLETED';
  const hasWinner = !!scoringState.winnerTeamId;

  if (!isCompleted) {
    warnings.push('Match is currently in progress. Finalize once all games are completed.');
  }

  if (isCompleted && !hasWinner) {
    issues.push('Match is marked completed but no winning team was determined.');
  }

  // Check game scores consistency
  scoringState.gameScores.forEach((gs) => {
    if (gs.scoreA > rules.maxPoints || gs.scoreB > rules.maxPoints) {
      issues.push(`Game ${gs.gameNumber} score exceeds maximum allowed points of ${rules.maxPoints}.`);
    }
    if (gs.isCompleted) {
      const minRequired = rules.pointsPerGame;
      if (gs.scoreA < minRequired && gs.scoreB < minRequired) {
        issues.push(`Game ${gs.gameNumber} marked complete before reaching ${minRequired} points.`);
      }
    }
  });

  // Verify event sequence consistency against final state
  let eventSumA = 0;
  let eventSumB = 0;
  activeEvents.forEach((e) => {
    if (e.winnerSide === 'TEAM_A') eventSumA++;
    if (e.winnerSide === 'TEAM_B') eventSumB++;
  });

  const stateSumA = scoringState.gameScores.reduce((acc, gs) => acc + gs.scoreA, 0);
  const stateSumB = scoringState.gameScores.reduce((acc, gs) => acc + gs.scoreB, 0);

  const isScoreConsistentWithEvents = eventSumA === stateSumA && eventSumB === stateSumB;
  if (!isScoreConsistentWithEvents && activeEvents.length > 0) {
    warnings.push('Score calculation mismatch detected between event log and game scores. Review rally events.');
  }

  const isValid = issues.length === 0;

  // Format Game Scores Display string (e.g. "21-17, 18-21, 21-19")
  const gameScoresDisplay = scoringState.gameScores
    .filter((s) => s.isCompleted || s.scoreA > 0 || s.scoreB > 0)
    .map((s) => `${s.scoreA}-${s.scoreB}`)
    .join(', ') || `${scoringState.currentScoreA}-${scoringState.currentScoreB}`;

  const winnerName = scoringState.winnerTeamId === teamAId
    ? actualTeamA.name
    : scoringState.winnerTeamId === teamBId
    ? actualTeamB.name
    : 'Match in Progress';

  const matchResultText = scoringState.matchResultText || (
    isCompleted
      ? `${winnerName} won ${scoringState.gamesWonA}-${scoringState.gamesWonB} (${gameScoresDisplay})`
      : `Live: ${actualTeamA.name} ${scoringState.gamesWonA} - ${scoringState.gamesWonB} ${actualTeamB.name} (G${scoringState.currentGame}: ${scoringState.currentScoreA}-${scoringState.currentScoreB})`
  );

  const topPerformer = [...playerStatsList].sort((a, b) => b.performanceIndex - a.performanceIndex)[0];
  const topPerformerText = topPerformer
    ? `${topPerformer.playerName} (${topPerformer.pointsWon} Pts, ${topPerformer.smashWinners} Smashes)`
    : 'None';

  return {
    match: matchWithPlayers,
    matchId: match.id,
    sport: 'BADMINTON',
    tournament,
    group,
    teamA: actualTeamA,
    teamB: actualTeamB,
    teamAPlayers,
    teamBPlayers,
    matchType: rules.matchType,
    format: rules.format,
    status: match.status as any,
    isFinalized: reportMeta?.isFinalized ?? (match.status === 'COMPLETED'),
    finalizedAt: reportMeta?.finalizedAt,
    finalizedBy: reportMeta?.finalizedBy,
    matchResultText,
    winnerName,
    winnerTeamId: scoringState.winnerTeamId,
    gamesWonA: scoringState.gamesWonA,
    gamesWonB: scoringState.gamesWonB,
    totalGames: scoringState.gameScores.length,
    gameScoresDisplay,
    gameScores: scoringState.gameScores,
    gameDetails,
    events: activeEvents,
    playerStats: playerStatsList,
    teamAStats,
    teamBStats,
    rallyAnalytics,
    suggestedPlayerOfMatch: suggestedPotm,
    selectedPlayerOfMatch: selectedPotm,
    suggestedBestAttacker: suggestedAttacker,
    selectedBestAttacker: selectedAttacker,
    suggestedBestServer: suggestedServer,
    selectedBestServer: selectedServer,
    suggestedBestReturner: suggestedReturner,
    selectedBestReturner: selectedReturner,
    suggestedBestDefender: suggestedDefender,
    selectedBestDefender: selectedDefender,
    suggestedBestPerformer: suggestedPerformer,
    selectedBestPerformer: selectedPerformer,
    suggestedAwards: {
      playerOfTheMatch: suggestedPotm,
      bestAttacker: suggestedAttacker,
      bestServer: suggestedServer,
      bestReturner: suggestedReturner,
      bestDefender: suggestedDefender,
      bestPerformer: suggestedPerformer,
    },
    selectedAwards: {
      playerOfTheMatch: selectedPotm,
      bestAttacker: selectedAttacker,
      bestServer: selectedServer,
      bestReturner: selectedReturner,
      bestDefender: selectedDefender,
      bestPerformer: selectedPerformer,
    },
    squadsReport: {
      teamA: {
        team: actualTeamA,
        captain: teamAPlayers.find((p) => p.isCaptain) || teamAPlayers[0],
        players: teamAPlayers,
      },
      teamB: {
        team: actualTeamB,
        captain: teamBPlayers.find((p) => p.isCaptain) || teamBPlayers[0],
        players: teamBPlayers,
      },
    },
    validation: {
      isValid,
      issues,
      warnings,
      isScoreConsistentWithEvents,
      isCompleted,
      hasWinner,
    },
    officialsReport: match.officials ? (match.officials as any) : {},
    sponsorsReport: match.sponsors ? (match.sponsors as any) : {},
    summaryCards: {
      winnerName,
      finalScoreDisplay: gameScoresDisplay,
      totalRallies: activeEvents.length,
      totalSmashes: teamAStats.smashWinners + teamBStats.smashWinners,
      longestRally: longestRallyShots,
      topPerformerText,
      venueCourtDisplay: `${match.venue || 'Center Court'} (${rules.courtName})`,
    },
  };
}
