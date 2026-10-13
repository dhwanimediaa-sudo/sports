import {
  Match,
  CricketBallEvent,
  CricketInnings,
  Player,
  Team,
  Tournament,
  Group,
} from '../../src/types';

export interface ReportBatsmanStats {
  playerId: string;
  playerName: string;
  isCaptain?: boolean;
  isWicketKeeper?: boolean;
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  isOut: boolean;
  dismissalInfo: string;
  isTopScorer?: boolean;
  isHighestSR?: boolean;
  isNotOut?: boolean;
  singles: number;
  twos: number;
  threes: number;
  dotBalls: number;
}

export interface ReportBowlerStats {
  playerId: string;
  playerName: string;
  oversDisplay: string;
  overs: number;
  legalBalls: number;
  maidens: number;
  runsConceded: number;
  wickets: number;
  economy: number;
  wides: number;
  noBalls: number;
  dotBalls: number;
  boundaryRuns: number;
  sixesConceded: number;
  isTopBowler?: boolean;
}

export interface ReportFallOfWicket {
  wicketNumber: number;
  runs: number;
  oversDisplay: string;
  dismissedPlayerId: string;
  dismissedPlayerName: string;
}

export interface ReportPartnership {
  partnershipLabel: string;
  runs: number;
  balls: number;
  player1Id: string;
  player1Name: string;
  player2Id: string;
  player2Name: string;
  isCurrent?: boolean;
}

export interface ReportOverBall {
  ballDisplay: string;
  runs: number;
  extraType?: string;
  isWicket?: boolean;
  wicketType?: string;
}

export interface ReportOverSummary {
  overNumber: number;
  bowlerName: string;
  runsInOver: number;
  wicketsInOver: number;
  balls: ReportOverBall[];
}

export interface ReportInningsScorecard {
  inningsNumber: number;
  battingTeamId: string;
  battingTeamName: string;
  battingTeamShortName: string;
  battingTeamLogoUrl?: string;
  bowlingTeamId: string;
  bowlingTeamName: string;
  bowlingTeamShortName: string;
  bowlingTeamLogoUrl?: string;
  totalRuns: number;
  totalWickets: number;
  totalOvers: number;
  oversDisplay: string;
  legalBallsCount: number;
  runRate: number;
  batsmen: ReportBatsmanStats[];
  bowlers: ReportBowlerStats[];
  extras: {
    wides: number;
    noBalls: number;
    byes: number;
    legByes: number;
    penalties: number;
    total: number;
  };
  validation: {
    battingTotalRuns: number;
    extrasTotal: number;
    calculatedTotal: number;
    isValid: boolean;
    warningMessage?: string;
  };
  fallOfWickets: ReportFallOfWicket[];
  partnerships: ReportPartnership[];
  overSummaries: ReportOverSummary[];
  powerplay?: {
    runs: number;
    wickets: number;
    oversDisplay: string;
    runRate: number;
  };
  teamStats: {
    totalFours: number;
    totalSixes: number;
    dotBallsCount: number;
    dotBallPercentage: number;
    singles: number;
    twos: number;
    threes: number;
  };
}

export interface BallByBallReportItem {
  id: string;
  inningsNumber: number;
  overNumber: number;
  ballInOver: number;
  overBallDisplay: string;
  strikerName: string;
  bowlerName: string;
  description: string;
  runsOffBat: number;
  extraRuns: number;
  extraType: string;
  isWicket: boolean;
  wicketType?: string;
  totalRunsCumulative: number;
  totalWicketsCumulative: number;
  timestamp: string;
}

export interface PlayerMatchPerformance {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  isOut: boolean;
  oversDisplay: string;
  legalBalls: number;
  maidens: number;
  runsConceded: number;
  wickets: number;
  economy: number;
  catches: number;
  stumpings: number;
  runOuts: number;
  performancePoints: number;
  citation: string;
}

export interface AwardCandidate {
  playerId: string;
  playerName: string;
  teamName: string;
  details: string;
  points?: number;
}

export interface FullMatchReport {
  match: Match;
  tournament?: Tournament;
  group?: Group;
  teamA?: Team;
  teamB?: Team;
  status: 'LIVE' | 'COMPLETED' | 'SCHEDULED';
  isFinalized: boolean;
  finalizedAt?: string;
  finalizedBy?: string;

  matchResultText: string;
  winningTeamId?: string;
  winningMarginText?: string;

  innings1Scorecard?: ReportInningsScorecard;
  innings2Scorecard?: ReportInningsScorecard;

  chaseStats?: {
    target: number;
    currentScore: number;
    currentWickets: number;
    runsRequired: number;
    ballsRemaining: number;
    requiredRunRate: number;
  };

  ballByBall: BallByBallReportItem[];
  playerPerformances: PlayerMatchPerformance[];

  suggestedManOfMatch?: AwardCandidate;
  selectedManOfMatch?: AwardCandidate;

  suggestedBestBatter?: AwardCandidate;
  selectedBestBatter?: AwardCandidate;

  suggestedBestBowler?: AwardCandidate;
  selectedBestBowler?: AwardCandidate;

  squadsReport: {
    teamA: {
      team: Team;
      captain?: Player;
      viceCaptain?: Player;
      wicketKeeper?: Player;
      playingXI: Player[];
      substitutes: Player[];
    };
    teamB: {
      team: Team;
      captain?: Player;
      viceCaptain?: Player;
      wicketKeeper?: Player;
      playingXI: Player[];
      substitutes: Player[];
    };
  };

  officialsReport: {
    umpires: string[];
    referee?: string;
    scorers: string[];
    commentator?: string;
  };

  sponsorsReport: {
    tournamentSponsor?: string;
    matchSponsor?: string;
  };

  tossReport?: {
    winnerTeamName: string;
    decision: string;
    text: string;
  };

  summaryCards: {
    winnerName: string;
    teamAScore: string;
    teamBScore: string;
    highestScoreText: string;
    bestBowlingText: string;
    totalFours: number;
    totalSixes: number;
    totalExtras: number;
  };
}

/**
 * Pure calculation function to generate Full Match Report from scoring events & db state.
 */
export function calculateFullMatchReport(
  match: Match,
  inningsList: CricketInnings[],
  events: CricketBallEvent[],
  allPlayers: Player[],
  allTeams: Team[],
  savedReportMetaData?: {
    isFinalized?: boolean;
    finalizedAt?: string;
    finalizedBy?: string;
    manOfTheMatchId?: string;
    manOfTheMatchReason?: string;
    bestBatterId?: string;
    bestBowlerId?: string;
  },
  tournaments: Tournament[] = [],
  groups: Group[] = []
): FullMatchReport {
  const activeEvents = events.filter((e) => !e.isUndone);
  activeEvents.sort((a, b) => a.eventSequence - b.eventSequence);

  const teamA = allTeams.find((t) => t.id === match.teamAId) || { id: match.teamAId, name: 'Team A', shortName: 'TMA' } as Team;
  const teamB = allTeams.find((t) => t.id === match.teamBId) || { id: match.teamBId, name: 'Team B', shortName: 'TMB' } as Team;

  const tournament = tournaments.find((t) => t.id === match.tournamentId);
  const group = groups.find((g) => g.id === match.groupId);

  // Separate events per innings
  const innings1Events = activeEvents.filter((e) => e.inningsNumber === 1);
  const innings2Events = activeEvents.filter((e) => e.inningsNumber === 2);

  const innings1Obj = inningsList.find((i) => i.inningsNumber === 1);
  const innings2Obj = inningsList.find((i) => i.inningsNumber === 2);

  const innings1BattingTeam = innings1Obj
    ? (allTeams.find((t) => t.id === innings1Obj.battingTeamId) || teamA)
    : teamA;
  const innings1BowlingTeam = innings1Obj
    ? (allTeams.find((t) => t.id === innings1Obj.bowlingTeamId) || teamB)
    : teamB;

  const innings2BattingTeam = innings2Obj
    ? (allTeams.find((t) => t.id === innings2Obj.battingTeamId) || teamB)
    : teamB;
  const innings2BowlingTeam = innings2Obj
    ? (allTeams.find((t) => t.id === innings2Obj.bowlingTeamId) || teamA)
    : teamA;

  // Build Innings 1 Scorecard
  const innings1Scorecard = innings1Events.length > 0 || innings1Obj
    ? calculateInningsScorecard(1, innings1BattingTeam, innings1BowlingTeam, innings1Events, allPlayers, match)
    : undefined;

  // Build Innings 2 Scorecard
  const innings2Scorecard = innings2Events.length > 0 || innings2Obj
    ? calculateInningsScorecard(2, innings2BattingTeam, innings2BowlingTeam, innings2Events, allPlayers, match)
    : undefined;

  // Target & Chase Stats calculation
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
  let chaseStats: FullMatchReport['chaseStats'] = undefined;

  if (innings1Scorecard) {
    const target = innings1Scorecard.totalRuns + 1;
    if (innings2Scorecard) {
      const currentScore = innings2Scorecard.totalRuns;
      const currentWickets = innings2Scorecard.totalWickets;
      const runsRequired = Math.max(0, target - currentScore);
      const ballsRemaining = Math.max(0, maxMatchBalls - innings2Scorecard.legalBallsCount);
      const requiredRunRate = ballsRemaining > 0 ? Number(((runsRequired / ballsRemaining) * 6).toFixed(2)) : 0;

      chaseStats = {
        target,
        currentScore,
        currentWickets,
        runsRequired,
        ballsRemaining,
        requiredRunRate,
      };
    }
  }

  // Calculate Match Result Text & Winner
  let matchResultText = 'Match In Progress';
  let winningTeamId: string | undefined = undefined;
  let winningMarginText: string | undefined = undefined;

  if (match.status === 'COMPLETED' || (innings1Scorecard && innings2Scorecard)) {
    if (innings1Scorecard && innings2Scorecard) {
      const team1Runs = innings1Scorecard.totalRuns;
      const team2Runs = innings2Scorecard.totalRuns;
      const team2Wickets = innings2Scorecard.totalWickets;
      const target = team1Runs + 1;

      if (team2Runs >= target) {
        winningTeamId = innings2Scorecard.battingTeamId;
        const wicketsLeft = 10 - team2Wickets;
        winningMarginText = `won by ${wicketsLeft} wicket${wicketsLeft !== 1 ? 's' : ''}`;
        matchResultText = `${innings2Scorecard.battingTeamName} ${winningMarginText}`;
      } else if (innings2Scorecard.totalWickets >= 10 || innings2Scorecard.legalBallsCount >= maxMatchBalls || match.status === 'COMPLETED') {
        if (team2Runs === team1Runs) {
          matchResultText = 'Match Tied!';
        } else if (team2Runs < team1Runs) {
          winningTeamId = innings1Scorecard.battingTeamId;
          const runsMargin = team1Runs - team2Runs;
          winningMarginText = `won by ${runsMargin} run${runsMargin !== 1 ? 's' : ''}`;
          matchResultText = `${innings1Scorecard.battingTeamName} ${winningMarginText}`;
        }
      }
    }
  }

  // Ball By Ball Log across all active events
  const ballByBall: BallByBallReportItem[] = [];
  let cumulativeScore = 0;
  let cumulativeWickets = 0;
  let currentInningsNum = 1;

  activeEvents.forEach((e) => {
    if (e.inningsNumber !== currentInningsNum) {
      currentInningsNum = e.inningsNumber;
      cumulativeScore = 0;
      cumulativeWickets = 0;
    }

    cumulativeScore += e.totalRuns;
    if (e.isWicket && e.wicketType !== 'RETIRED_HURT') {
      cumulativeWickets += 1;
    }

    const striker = allPlayers.find((p) => p.id === e.strikerId);
    const bowler = allPlayers.find((p) => p.id === e.bowlerId);

    let desc = '';
    if (e.isWicket) {
      desc = `WICKET! ${e.wicketType ? e.wicketType.replace('_', ' ') : 'Out'}`;
    } else if (e.extraType === 'WIDE') {
      desc = `Wide (+${e.extraRuns})`;
    } else if (e.extraType === 'NO_BALL') {
      desc = `No Ball (+1) + ${e.runsOffBat} run${e.runsOffBat !== 1 ? 's' : ''}`;
    } else if (e.extraType === 'BYE') {
      desc = `Bye (+${e.extraRuns})`;
    } else if (e.extraType === 'LEG_BYE') {
      desc = `Leg Bye (+${e.extraRuns})`;
    } else if (e.runsOffBat === 6) {
      desc = 'SIX!';
    } else if (e.runsOffBat === 4) {
      desc = 'FOUR!';
    } else if (e.runsOffBat === 0) {
      desc = 'Dot Ball';
    } else {
      desc = `${e.runsOffBat} run${e.runsOffBat !== 1 ? 's' : ''}`;
    }

    const ballInOverStr = e.isLegalBall ? `${Math.floor(e.ballSequence / 6)}.${(e.ballSequence % 6) + 1}` : `${e.overNumber}.${e.ballSequence}`;

    ballByBall.push({
      id: e.id,
      inningsNumber: e.inningsNumber,
      overNumber: e.overNumber,
      ballInOver: e.ballSequence,
      overBallDisplay: ballInOverStr,
      strikerName: striker?.name || 'Striker',
      bowlerName: bowler?.name || 'Bowler',
      description: desc,
      runsOffBat: e.runsOffBat,
      extraRuns: e.extraRuns,
      extraType: e.extraType,
      isWicket: e.isWicket,
      wicketType: e.wicketType,
      totalRunsCumulative: cumulativeScore,
      totalWicketsCumulative: cumulativeWickets,
      timestamp: e.timestamp,
    });
  });

  // Calculate Player Performance Points across both innings
  const playerPerfMap = new Map<string, PlayerMatchPerformance>();

  const getOrCreatePerf = (pId: string): PlayerMatchPerformance => {
    if (!playerPerfMap.has(pId)) {
      const p = allPlayers.find((player) => player.id === pId);
      const team = allTeams.find((t) => t.id === p?.teamId);
      playerPerfMap.set(pId, {
        playerId: pId,
        playerName: p ? p.name : 'Player',
        teamId: p?.teamId || '',
        teamName: team ? team.name : 'Team',
        runs: 0,
        ballsFaced: 0,
        fours: 0,
        sixes: 0,
        strikeRate: 0,
        isOut: false,
        oversDisplay: '0.0',
        legalBalls: 0,
        maidens: 0,
        runsConceded: 0,
        wickets: 0,
        economy: 0,
        catches: 0,
        stumpings: 0,
        runOuts: 0,
        performancePoints: 0,
        citation: '',
      });
    }
    return playerPerfMap.get(pId)!;
  };

  // Populate performances from innings stats & fielding events
  [innings1Scorecard, innings2Scorecard].forEach((sc) => {
    if (!sc) return;
    sc.batsmen.forEach((b) => {
      const perf = getOrCreatePerf(b.playerId);
      perf.runs += b.runs;
      perf.ballsFaced += b.ballsFaced;
      perf.fours += b.fours;
      perf.sixes += b.sixes;
      perf.isOut = b.isOut;
    });

    sc.bowlers.forEach((bw) => {
      const perf = getOrCreatePerf(bw.playerId);
      perf.legalBalls += bw.legalBalls;
      perf.maidens += bw.maidens;
      perf.runsConceded += bw.runsConceded;
      perf.wickets += bw.wickets;
    });
  });

  // Fielding statistics from ball events
  activeEvents.forEach((e) => {
    if (e.isWicket && e.fielderId) {
      const fielderPerf = getOrCreatePerf(e.fielderId);
      if (e.wicketType === 'CAUGHT' || e.wicketType === 'CAUGHT_BEHIND') {
        fielderPerf.catches += 1;
      } else if (e.wicketType === 'STUMPED') {
        fielderPerf.stumpings += 1;
      } else if (e.wicketType === 'RUN_OUT') {
        fielderPerf.runOuts += 1;
      }
    }
    if (e.isWicket && e.assistFielderId) {
      const assistPerf = getOrCreatePerf(e.assistFielderId);
      if (e.wicketType === 'RUN_OUT') {
        assistPerf.runOuts += 1;
      }
    }
  });

  // Calculate points & citations
  const allPerformances = Array.from(playerPerfMap.values());
  allPerformances.forEach((p) => {
    p.strikeRate = p.ballsFaced > 0 ? Number(((p.runs / p.ballsFaced) * 100).toFixed(2)) : 0;
    p.oversDisplay = `${Math.floor(p.legalBalls / 6)}.${p.legalBalls % 6}`;
    p.economy = p.legalBalls > 0 ? Number(((p.runsConceded / p.legalBalls) * 6).toFixed(2)) : 0;

    // Cricket Performance Points formula
    let pts = 0;
    pts += p.runs; // 1pt per run
    pts += p.fours * 2;
    pts += p.sixes * 4;
    if (p.runs >= 100) pts += 25;
    else if (p.runs >= 50) pts += 10;

    pts += p.wickets * 25; // 25pts per wicket
    if (p.wickets >= 5) pts += 50;
    else if (p.wickets >= 4) pts += 25;

    pts += p.maidens * 10;
    pts += (p.catches + p.stumpings + p.runOuts) * 10;

    p.performancePoints = pts;

    // Citation summary string
    const parts: string[] = [];
    if (p.runs > 0) parts.push(`${p.runs} runs (${p.ballsFaced}b)`);
    if (p.wickets > 0) parts.push(`${p.wickets}/${p.runsConceded} (${p.oversDisplay} ov)`);
    if (p.catches > 0) parts.push(`${p.catches} catch${p.catches > 1 ? 'es' : ''}`);
    if (p.stumpings > 0) parts.push(`${p.stumpings} stumping${p.stumpings > 1 ? 's' : ''}`);
    if (p.runOuts > 0) parts.push(`${p.runOuts} run out${p.runOuts > 1 ? 's' : ''}`);

    p.citation = parts.length > 0 ? parts.join(' + ') : 'Played in match';
  });

  // Sort candidates for awards
  const sortedByPoints = [...allPerformances].sort((a, b) => b.performancePoints - a.performancePoints);
  const topPointPlayer = sortedByPoints[0];

  const suggestedManOfMatch: AwardCandidate | undefined = topPointPlayer
    ? {
        playerId: topPointPlayer.playerId,
        playerName: topPointPlayer.playerName,
        teamName: topPointPlayer.teamName,
        details: topPointPlayer.citation,
        points: topPointPlayer.performancePoints,
      }
    : undefined;

  // Best Batter
  const sortedBatters = [...allPerformances].sort((a, b) => {
    if (b.runs !== a.runs) return b.runs - a.runs;
    return b.strikeRate - a.strikeRate;
  });
  const topBatter = sortedBatters[0];
  const suggestedBestBatter: AwardCandidate | undefined = topBatter && topBatter.runs > 0
    ? {
        playerId: topBatter.playerId,
        playerName: topBatter.playerName,
        teamName: topBatter.teamName,
        details: `${topBatter.runs} runs (${topBatter.ballsFaced}b, ${topBatter.fours}x4, ${topBatter.sixes}x6, SR: ${topBatter.strikeRate})`,
      }
    : undefined;

  // Best Bowler
  const sortedBowlers = [...allPerformances].sort((a, b) => {
    if (b.wickets !== a.wickets) return b.wickets - a.wickets;
    if (a.runsConceded !== b.runsConceded) return a.runsConceded - b.runsConceded;
    return a.economy - b.economy;
  });
  const topBowler = sortedBowlers[0];
  const suggestedBestBowler: AwardCandidate | undefined = topBowler && (topBowler.wickets > 0 || topBowler.legalBalls > 0)
    ? {
        playerId: topBowler.playerId,
        playerName: topBowler.playerName,
        teamName: topBowler.teamName,
        details: `${topBowler.wickets}/${topBowler.runsConceded} in ${topBowler.oversDisplay} overs (Econ: ${topBowler.economy})`,
      }
    : undefined;

  // Selected Awards (Admin custom selection or fallback to suggested)
  const selectedManOfMatchPlayer = savedReportMetaData?.manOfTheMatchId
    ? allPlayers.find((p) => p.id === savedReportMetaData.manOfTheMatchId)
    : undefined;

  const selectedManOfMatch: AwardCandidate | undefined = selectedManOfMatchPlayer
    ? {
        playerId: selectedManOfMatchPlayer.id,
        playerName: selectedManOfMatchPlayer.name,
        teamName: allTeams.find((t) => t.id === selectedManOfMatchPlayer.teamId)?.name || 'Team',
        details: savedReportMetaData?.manOfTheMatchReason || (playerPerfMap.get(selectedManOfMatchPlayer.id)?.citation || 'Selected by Admin'),
      }
    : suggestedManOfMatch;

  const selectedBestBatterPlayer = savedReportMetaData?.bestBatterId
    ? allPlayers.find((p) => p.id === savedReportMetaData.bestBatterId)
    : undefined;

  const selectedBestBatter: AwardCandidate | undefined = selectedBestBatterPlayer
    ? {
        playerId: selectedBestBatterPlayer.id,
        playerName: selectedBestBatterPlayer.name,
        teamName: allTeams.find((t) => t.id === selectedBestBatterPlayer.teamId)?.name || 'Team',
        details: playerPerfMap.get(selectedBestBatterPlayer.id)?.citation || 'Selected by Admin',
      }
    : suggestedBestBatter;

  const selectedBestBowlerPlayer = savedReportMetaData?.bestBowlerId
    ? allPlayers.find((p) => p.id === savedReportMetaData.bestBowlerId)
    : undefined;

  const selectedBestBowler: AwardCandidate | undefined = selectedBestBowlerPlayer
    ? {
        playerId: selectedBestBowlerPlayer.id,
        playerName: selectedBestBowlerPlayer.name,
        teamName: allTeams.find((t) => t.id === selectedBestBowlerPlayer.teamId)?.name || 'Team',
        details: playerPerfMap.get(selectedBestBowlerPlayer.id)?.citation || 'Selected by Admin',
      }
    : suggestedBestBowler;

  // Build Squads Report
  const teamAPlayers = allPlayers.filter((p) => p.teamId === teamA.id);
  const teamBPlayers = allPlayers.filter((p) => p.teamId === teamB.id);

  const teamACaptain = teamAPlayers.find((p) => p.id === teamA.captain) || teamAPlayers[0];
  const teamAViceCaptain = teamAPlayers.find((p) => p.id === teamA.viceCaptain);
  const teamAWicketKeeper = teamAPlayers.find((p) => p.role === 'WICKET_KEEPER');

  const teamBCaptain = teamBPlayers.find((p) => p.id === teamB.captain) || teamBPlayers[0];
  const teamBViceCaptain = teamBPlayers.find((p) => p.id === teamB.viceCaptain);
  const teamBWicketKeeper = teamBPlayers.find((p) => p.role === 'WICKET_KEEPER');

  const squadsReport = {
    teamA: {
      team: teamA,
      captain: teamACaptain,
      viceCaptain: teamAViceCaptain,
      wicketKeeper: teamAWicketKeeper,
      playingXI: teamAPlayers.slice(0, 11),
      substitutes: teamAPlayers.slice(11),
    },
    teamB: {
      team: teamB,
      captain: teamBCaptain,
      viceCaptain: teamBViceCaptain,
      wicketKeeper: teamBWicketKeeper,
      playingXI: teamBPlayers.slice(0, 11),
      substitutes: teamBPlayers.slice(11),
    },
  };

  // Toss Report
  let tossReport: FullMatchReport['tossReport'] = undefined;
  if (match.tossWinnerId) {
    const tossWinTeam = allTeams.find((t) => t.id === match.tossWinnerId);
    if (tossWinTeam) {
      const decisionStr = match.tossDecision === 'BAT' ? 'elected to bat' : 'elected to bowl';
      tossReport = {
        winnerTeamName: tossWinTeam.name,
        decision: match.tossDecision || 'BAT',
        text: `${tossWinTeam.name} won the toss and ${decisionStr}.`,
      };
    }
  }

  // Summary Cards
  const teamAScoreStr = innings1Scorecard
    ? `${innings1Scorecard.totalRuns} / ${innings1Scorecard.totalWickets} (${innings1Scorecard.oversDisplay} ov)`
    : 'Yet to Bat';
  const teamBScoreStr = innings2Scorecard
    ? `${innings2Scorecard.totalRuns} / ${innings2Scorecard.totalWickets} (${innings2Scorecard.oversDisplay} ov)`
    : 'Yet to Bat';

  const totalFoursAll = (innings1Scorecard?.teamStats.totalFours || 0) + (innings2Scorecard?.teamStats.totalFours || 0);
  const totalSixesAll = (innings1Scorecard?.teamStats.totalSixes || 0) + (innings2Scorecard?.teamStats.totalSixes || 0);
  const totalExtrasAll = (innings1Scorecard?.extras.total || 0) + (innings2Scorecard?.extras.total || 0);

  const highestScoreText = topBatter && topBatter.runs > 0
    ? `${topBatter.playerName} (${topBatter.teamName}) - ${topBatter.runs} (${topBatter.ballsFaced}b)`
    : 'N/A';

  const bestBowlingText = topBowler && (topBowler.wickets > 0 || topBowler.legalBalls > 0)
    ? `${topBowler.playerName} (${topBowler.teamName}) - ${topBowler.wickets}/${topBowler.runsConceded}`
    : 'N/A';

  return {
    match,
    tournament,
    group,
    teamA,
    teamB,
    status: match.status === 'COMPLETED' ? 'COMPLETED' : activeEvents.length > 0 ? 'LIVE' : 'SCHEDULED',
    isFinalized: Boolean(savedReportMetaData?.isFinalized),
    finalizedAt: savedReportMetaData?.finalizedAt,
    finalizedBy: savedReportMetaData?.finalizedBy,
    matchResultText,
    winningTeamId,
    winningMarginText,
    innings1Scorecard,
    innings2Scorecard,
    chaseStats,
    ballByBall,
    playerPerformances: allPerformances,
    suggestedManOfMatch,
    selectedManOfMatch,
    suggestedBestBatter,
    selectedBestBatter,
    suggestedBestBowler,
    selectedBestBowler,
    squadsReport,
    officialsReport: {
      umpires: match.officials?.umpires || [],
      referee: match.officials?.referee,
      scorers: match.officials?.scorers || [],
      commentator: match.officials?.commentator,
    },
    sponsorsReport: {
      tournamentSponsor: match.sponsors?.tournamentSponsor,
      matchSponsor: match.sponsors?.matchSponsor,
    },
    tossReport,
    summaryCards: {
      winnerName: winningTeamId
        ? (allTeams.find((t) => t.id === winningTeamId)?.name || 'Winner')
        : 'TBD',
      teamAScore: teamAScoreStr,
      teamBScore: teamBScoreStr,
      highestScoreText,
      bestBowlingText,
      totalFours: totalFoursAll,
      totalSixes: totalSixesAll,
      totalExtras: totalExtrasAll,
    },
  };
}

/**
 * Helper to calculate single innings scorecard
 */
function calculateInningsScorecard(
  inningsNumber: number,
  battingTeam: Team,
  bowlingTeam: Team,
  events: CricketBallEvent[],
  allPlayers: Player[],
  match: Match
): ReportInningsScorecard {
  // Total runs & legal balls
  const legalBallsCount = events.filter((e) => e.isLegalBall).length;
  const totalRuns = events.reduce((sum, e) => sum + e.totalRuns, 0);

  const wicketEvents = events.filter((e) => e.isWicket && e.wicketType !== 'RETIRED_HURT');
  const totalWickets = wicketEvents.length;

  const totalOvers = Math.floor(legalBallsCount / 6) + (legalBallsCount % 6) / 10;
  const oversDisplay = `${Math.floor(legalBallsCount / 6)}.${legalBallsCount % 6}`;
  const runRate = legalBallsCount > 0 ? Number(((totalRuns / legalBallsCount) * 6).toFixed(2)) : 0;

  // 1. Extras calculation
  const extras = {
    wides: 0,
    noBalls: 0,
    byes: 0,
    legByes: 0,
    penalties: 0,
    total: 0,
  };

  events.forEach((e) => {
    if (e.extraType === 'WIDE') extras.wides += e.extraRuns;
    if (e.extraType === 'NO_BALL') extras.noBalls += 1;
    if (e.extraType === 'BYE') extras.byes += e.extraRuns;
    if (e.extraType === 'LEG_BYE') extras.legByes += e.extraRuns;
    if (e.extraType === 'PENALTY') extras.penalties += e.extraRuns;
  });
  extras.total = extras.wides + extras.noBalls + extras.byes + extras.legByes + extras.penalties;

  // 2. Batsmen Stats
  const batsmenMap = new Map<string, ReportBatsmanStats>();

  const getOrCreateBatsman = (pId: string): ReportBatsmanStats => {
    if (!batsmenMap.has(pId)) {
      const p = allPlayers.find((player) => player.id === pId);
      const isCaptain = battingTeam.captain === pId;
      const isWicketKeeper = battingTeam.viceCaptain === pId || p?.role === 'WICKET_KEEPER';
      batsmenMap.set(pId, {
        playerId: pId,
        playerName: p ? p.name : 'Unknown Batsman',
        isCaptain,
        isWicketKeeper,
        runs: 0,
        ballsFaced: 0,
        fours: 0,
        sixes: 0,
        strikeRate: 0,
        isOut: false,
        dismissalInfo: 'not out',
        singles: 0,
        twos: 0,
        threes: 0,
        dotBalls: 0,
      });
    }
    return batsmenMap.get(pId)!;
  };

  events.forEach((e) => {
    if (e.strikerId) {
      const striker = getOrCreateBatsman(e.strikerId);
      striker.runs += e.runsOffBat;

      if (e.extraType !== 'WIDE') {
        striker.ballsFaced += 1;
      }

      if (e.runsOffBat === 0 && e.extraType === 'NONE') striker.dotBalls += 1;
      if (e.runsOffBat === 1) striker.singles += 1;
      if (e.runsOffBat === 2) striker.twos += 1;
      if (e.runsOffBat === 3) striker.threes += 1;
      if (e.isFour || e.runsOffBat === 4) striker.fours += 1;
      if (e.isSix || e.runsOffBat === 6) striker.sixes += 1;
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
          info = e.wicketType ? e.wicketType.replace('_', ' ').toLowerCase() : 'out';
      }
      dismissed.dismissalInfo = info;
    }
  });

  const batsmenList = Array.from(batsmenMap.values());
  let maxRuns = -1;
  let maxSR = -1;

  batsmenList.forEach((b) => {
    b.strikeRate = b.ballsFaced > 0 ? Number(((b.runs / b.ballsFaced) * 100).toFixed(2)) : 0;
    if (b.runs > maxRuns) maxRuns = b.runs;
    if (b.ballsFaced >= 5 && b.strikeRate > maxSR) maxSR = b.strikeRate;
    b.isNotOut = !b.isOut;
  });

  batsmenList.forEach((b) => {
    if (b.runs === maxRuns && maxRuns > 0) b.isTopScorer = true;
    if (b.strikeRate === maxSR && maxSR > 0) b.isHighestSR = true;
  });

  // 3. Bowlers Stats
  const bowlersMap = new Map<string, ReportBowlerStats>();

  const getOrCreateBowler = (bId: string): ReportBowlerStats => {
    if (!bowlersMap.has(bId)) {
      const p = allPlayers.find((player) => player.id === bId);
      bowlersMap.set(bId, {
        playerId: bId,
        playerName: p ? p.name : 'Unknown Bowler',
        oversDisplay: '0.0',
        overs: 0,
        legalBalls: 0,
        maidens: 0,
        runsConceded: 0,
        wickets: 0,
        economy: 0,
        wides: 0,
        noBalls: 0,
        dotBalls: 0,
        boundaryRuns: 0,
        sixesConceded: 0,
      });
    }
    return bowlersMap.get(bId)!;
  };

  const overEventsMap = new Map<number, CricketBallEvent[]>();

  events.forEach((e) => {
    if (e.bowlerId) {
      const bw = getOrCreateBowler(e.bowlerId);

      if (e.isLegalBall) bw.legalBalls += 1;

      if (e.extraType === 'WIDE') {
        bw.runsConceded += e.extraRuns;
        bw.wides += 1;
      } else if (e.extraType === 'NO_BALL') {
        bw.runsConceded += 1 + e.runsOffBat;
        bw.noBalls += 1;
      } else if (e.extraType === 'NONE') {
        bw.runsConceded += e.runsOffBat;
        if (e.runsOffBat === 0) bw.dotBalls += 1;
      }

      if (e.runsOffBat === 4 || e.runsOffBat === 6) bw.boundaryRuns += e.runsOffBat;
      if (e.runsOffBat === 6) bw.sixesConceded += 1;

      if (
        e.isWicket &&
        ['BOWLED', 'CAUGHT', 'CAUGHT_BEHIND', 'CAUGHT_BOWLED', 'LBW', 'STUMPED', 'HIT_WICKET'].includes(
          e.wicketType || ''
        )
      ) {
        bw.wickets += 1;
      }

      if (!overEventsMap.has(e.overNumber)) {
        overEventsMap.set(e.overNumber, []);
      }
      overEventsMap.get(e.overNumber)!.push(e);
    }
  });

  // Calculate maidens
  overEventsMap.forEach((oEvents) => {
    const legalInOver = oEvents.filter((e) => e.isLegalBall).length;
    if (legalInOver === 6) {
      const bId = oEvents[0].bowlerId;
      const bw = bowlersMap.get(bId);
      if (bw) {
        const runsInOver = oEvents.reduce((sum, e) => {
          if (e.extraType === 'WIDE') return sum + e.extraRuns;
          if (e.extraType === 'NO_BALL') return sum + 1 + e.runsOffBat;
          if (e.extraType === 'NONE') return sum + e.runsOffBat;
          return sum;
        }, 0);

        if (runsInOver === 0) bw.maidens += 1;
      }
    }
  });

  const bowlersList = Array.from(bowlersMap.values());
  let maxWickets = -1;

  bowlersList.forEach((bw) => {
    bw.oversDisplay = `${Math.floor(bw.legalBalls / 6)}.${bw.legalBalls % 6}`;
    bw.overs = Math.floor(bw.legalBalls / 6) + (bw.legalBalls % 6) / 10;
    bw.economy = bw.legalBalls > 0 ? Number(((bw.runsConceded / bw.legalBalls) * 6).toFixed(2)) : 0;
    if (bw.wickets > maxWickets) maxWickets = bw.wickets;
  });

  bowlersList.forEach((bw) => {
    if (bw.wickets === maxWickets && maxWickets > 0) bw.isTopBowler = true;
  });

  // 4. Validation Check
  const battingTotalRuns = batsmenList.reduce((sum, b) => sum + b.runs, 0);
  const calculatedTotal = battingTotalRuns + extras.total;
  const isValid = calculatedTotal === totalRuns;
  let warningMessage: string | undefined = undefined;

  if (!isValid) {
    warningMessage = `Score calculation mismatch detected! Batting runs (${battingTotalRuns}) + Extras (${extras.total}) = ${calculatedTotal}, but total recorded innings score is ${totalRuns}.`;
  }

  // 5. Fall of Wickets
  const fallOfWickets: ReportFallOfWicket[] = [];
  let cumulativeRunsFow = 0;
  let cumulativeLegalBallsFow = 0;
  let wCount = 0;

  events.forEach((e) => {
    cumulativeRunsFow += e.totalRuns;
    if (e.isLegalBall) cumulativeLegalBallsFow += 1;

    if (e.isWicket && e.wicketType !== 'RETIRED_HURT') {
      wCount += 1;
      const player = allPlayers.find((p) => p.id === e.dismissedPlayerId);
      const ovStr = `${Math.floor(cumulativeLegalBallsFow / 6)}.${cumulativeLegalBallsFow % 6}`;

      fallOfWickets.push({
        wicketNumber: wCount,
        runs: cumulativeRunsFow,
        oversDisplay: ovStr,
        dismissedPlayerId: e.dismissedPlayerId || '',
        dismissedPlayerName: player?.name || 'Batsman',
      });
    }
  });

  // 6. Partnerships
  const partnerships: ReportPartnership[] = [];
  let pRuns = 0;
  let pBalls = 0;
  let pWicketNum = 1;
  let p1Id = '';
  let p2Id = '';

  events.forEach((e) => {
    pRuns += e.totalRuns;
    if (e.isLegalBall) pBalls += 1;

    if (!p1Id && e.strikerId) p1Id = e.strikerId;
    if (!p2Id && e.nonStrikerId) p2Id = e.nonStrikerId;

    if (e.isWicket && e.wicketType !== 'RETIRED_HURT') {
      const p1 = allPlayers.find((p) => p.id === p1Id);
      const p2 = allPlayers.find((p) => p.id === p2Id);

      partnerships.push({
        partnershipLabel: `${pWicketNum}${getOrdinalSuffix(pWicketNum)} Wicket`,
        runs: pRuns,
        balls: pBalls,
        player1Id: p1Id,
        player1Name: p1?.name || 'Batsman 1',
        player2Id: p2Id,
        player2Name: p2?.name || 'Batsman 2',
      });

      pWicketNum += 1;
      pRuns = 0;
      pBalls = 0;
      p1Id = e.strikerId !== e.dismissedPlayerId ? e.strikerId : e.nonStrikerId;
      p2Id = '';
    }
  });

  // Active current partnership if innings not completed
  if (pRuns > 0 || pBalls > 0) {
    const lastE = events[events.length - 1];
    const curP1 = lastE?.strikerId ? allPlayers.find((p) => p.id === lastE.strikerId) : undefined;
    const curP2 = lastE?.nonStrikerId ? allPlayers.find((p) => p.id === lastE.nonStrikerId) : undefined;

    partnerships.push({
      partnershipLabel: `${pWicketNum}${getOrdinalSuffix(pWicketNum)} Wicket (Current)`,
      runs: pRuns,
      balls: pBalls,
      player1Id: lastE?.strikerId || '',
      player1Name: curP1?.name || 'Batsman 1',
      player2Id: lastE?.nonStrikerId || '',
      player2Name: curP2?.name || 'Batsman 2',
      isCurrent: true,
    });
  }

  // 7. Over Summaries
  const overSummaries: ReportOverSummary[] = [];
  overEventsMap.forEach((oEvents, ovNum) => {
    const bowler = allPlayers.find((p) => p.id === oEvents[0]?.bowlerId);
    let runsInOver = 0;
    let wicketsInOver = 0;
    const balls: ReportOverBall[] = [];

    oEvents.forEach((e) => {
      runsInOver += e.totalRuns;
      if (e.isWicket && e.wicketType !== 'RETIRED_HURT') wicketsInOver += 1;

      let display = `${e.runsOffBat}`;
      if (e.extraType === 'WIDE') display = `WD${e.extraRuns > 1 ? e.extraRuns : ''}`;
      else if (e.extraType === 'NO_BALL') display = `NB${e.runsOffBat > 0 ? `+${e.runsOffBat}` : ''}`;
      else if (e.extraType === 'BYE') display = `B${e.extraRuns}`;
      else if (e.extraType === 'LEG_BYE') display = `LB${e.extraRuns}`;
      else if (e.isWicket) display = 'W';

      balls.push({
        ballDisplay: display,
        runs: e.totalRuns,
        extraType: e.extraType,
        isWicket: e.isWicket,
        wicketType: e.wicketType,
      });
    });

    overSummaries.push({
      overNumber: ovNum + 1,
      bowlerName: bowler?.name || 'Bowler',
      runsInOver,
      wicketsInOver,
      balls,
    });
  });

  overSummaries.sort((a, b) => a.overNumber - b.overNumber);

  // 8. Powerplay (Overs 1 to 6)
  const powerplayEvents = events.filter((e) => e.overNumber < 6);
  const ppLegalBalls = powerplayEvents.filter((e) => e.isLegalBall).length;
  const ppRuns = powerplayEvents.reduce((sum, e) => sum + e.totalRuns, 0);
  const ppWickets = powerplayEvents.filter((e) => e.isWicket && e.wicketType !== 'RETIRED_HURT').length;
  const ppOversDisplay = `${Math.floor(ppLegalBalls / 6)}.${ppLegalBalls % 6}`;
  const ppRunRate = ppLegalBalls > 0 ? Number(((ppRuns / ppLegalBalls) * 6).toFixed(2)) : 0;

  // 9. Team Totals & Shot Breakdown
  const totalFours = batsmenList.reduce((sum, b) => sum + b.fours, 0);
  const totalSixes = batsmenList.reduce((sum, b) => sum + b.sixes, 0);
  const dotBallsCount = events.filter((e) => e.runsOffBat === 0 && e.extraType === 'NONE' && e.isLegalBall).length;
  const dotBallPercentage = legalBallsCount > 0 ? Number(((dotBallsCount / legalBallsCount) * 100).toFixed(1)) : 0;

  const singles = batsmenList.reduce((sum, b) => sum + b.singles, 0);
  const twos = batsmenList.reduce((sum, b) => sum + b.twos, 0);
  const threes = batsmenList.reduce((sum, b) => sum + b.threes, 0);

  return {
    inningsNumber,
    battingTeamId: battingTeam.id,
    battingTeamName: battingTeam.name,
    battingTeamShortName: battingTeam.shortName || battingTeam.name.substring(0, 3).toUpperCase(),
    battingTeamLogoUrl: battingTeam.logoUrl,
    bowlingTeamId: bowlingTeam.id,
    bowlingTeamName: bowlingTeam.name,
    bowlingTeamShortName: bowlingTeam.shortName || bowlingTeam.name.substring(0, 3).toUpperCase(),
    bowlingTeamLogoUrl: bowlingTeam.logoUrl,
    totalRuns,
    totalWickets,
    totalOvers,
    oversDisplay,
    legalBallsCount,
    runRate,
    batsmen: batsmenList,
    bowlers: bowlersList,
    extras,
    validation: {
      battingTotalRuns,
      extrasTotal: extras.total,
      calculatedTotal,
      isValid,
      warningMessage,
    },
    fallOfWickets,
    partnerships,
    overSummaries,
    powerplay: {
      runs: ppRuns,
      wickets: ppWickets,
      oversDisplay: ppOversDisplay,
      runRate: ppRunRate,
    },
    teamStats: {
      totalFours,
      totalSixes,
      dotBallsCount,
      dotBallPercentage,
      singles,
      twos,
      threes,
    },
  };
}

function getOrdinalSuffix(i: number): string {
  const j = i % 10;
  const k = i % 100;
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
}
