import crypto from 'crypto';
import { getDb, saveDatabase } from '../db/database';
import {
  Tournament,
  Group,
  Team,
  Match,
  SportType,
  CompetitionFormat,
  TournamentCompetitionConfig,
  TournamentStandingRow,
  TournamentGroupStandings,
  StandingsQualificationStatus,
  StandingsManualAdjustment,
  StandingsOverrideAuditLog,
  SportSpecificStandingsMetrics,
  TieBreakerRule,
  TournamentRankingRules,
} from '../../src/types';

/**
 * Returns default competition configuration by sport
 */
export function getDefaultCompetitionConfig(
  sport: SportType,
  tournamentId: string,
  existingConfig?: Partial<TournamentCompetitionConfig>
): TournamentCompetitionConfig {
  const base: TournamentCompetitionConfig = {
    tournamentId,
    format: (existingConfig?.format as CompetitionFormat) || 'GROUP_STAGE_KNOCKOUT',
    numberOfGroups: existingConfig?.numberOfGroups || 2,
    teamsPerGroup: existingConfig?.teamsPerGroup || 4,
    qualificationSlotsPerGroup: existingConfig?.qualificationSlotsPerGroup || 2,
    directQualificationSlots: existingConfig?.directQualificationSlots || 2,
    pointsForWin: 2,
    pointsForDraw: 1,
    pointsForTie: 1,
    pointsForLoss: 0,
    pointsForNoResult: 1,
    pointsForAbandoned: 1,
    manualPointsOverrideEnabled: true,
    qualificationTrackingEnabled: true,
    tieBreakerOrder: ['POINTS', 'NRR', 'WINS', 'HEAD_TO_HEAD', 'MANUAL_DECISION'],
  };

  switch (sport) {
    case 'CRICKET':
      return {
        ...base,
        pointsForWin: 2,
        pointsForDraw: 1,
        pointsForTie: 1,
        pointsForLoss: 0,
        pointsForNoResult: 1,
        pointsForAbandoned: 1,
        tieBreakerOrder: ['POINTS', 'WINS', 'NRR', 'HEAD_TO_HEAD', 'MANUAL_DECISION'],
      };

    case 'FOOTBALL':
    case 'HOCKEY':
      return {
        ...base,
        pointsForWin: 3,
        pointsForDraw: 1,
        pointsForTie: 1,
        pointsForLoss: 0,
        pointsForNoResult: 1,
        pointsForAbandoned: 1,
        tieBreakerOrder: ['POINTS', 'GOAL_DIFFERENCE', 'GOALS_FOR', 'HEAD_TO_HEAD', 'WINS', 'MANUAL_DECISION'],
      };

    case 'VOLLEYBALL':
      return {
        ...base,
        pointsForWin: 3,
        pointsForDraw: 0,
        pointsForTie: 0,
        pointsForLoss: 0,
        pointsForNoResult: 0,
        pointsForAbandoned: 0,
        tieBreakerOrder: ['POINTS', 'WINS', 'SET_RATIO', 'SET_DIFFERENCE', 'POINT_RATIO', 'HEAD_TO_HEAD', 'MANUAL_DECISION'],
      };

    case 'KABADDI':
      return {
        ...base,
        pointsForWin: 5,
        pointsForDraw: 3,
        pointsForTie: 3,
        pointsForLoss: 0,
        pointsForNoResult: 1,
        pointsForAbandoned: 1,
        tieBreakerOrder: ['POINTS', 'WINS', 'SCORE_DIFFERENCE', 'RAID_POINTS', 'HEAD_TO_HEAD', 'MANUAL_DECISION'],
      };

    case 'BASKETBALL':
      return {
        ...base,
        pointsForWin: 2,
        pointsForDraw: 1,
        pointsForTie: 1,
        pointsForLoss: 1,
        pointsForNoResult: 0,
        pointsForAbandoned: 0,
        tieBreakerOrder: ['POINTS', 'WINS', 'POINT_DIFFERENCE', 'POINTS_FOR', 'HEAD_TO_HEAD', 'MANUAL_DECISION'],
      };

    case 'TENNIS':
    case 'BADMINTON':
    case 'TABLE_TENNIS':
      return {
        ...base,
        pointsForWin: 2,
        pointsForDraw: 0,
        pointsForTie: 0,
        pointsForLoss: 0,
        pointsForNoResult: 0,
        pointsForAbandoned: 0,
        tieBreakerOrder: ['POINTS', 'WINS', 'SET_DIFFERENCE', 'GAMES_DIFFERENCE', 'POINT_DIFFERENCE', 'HEAD_TO_HEAD', 'MANUAL_DECISION'],
      };

    case 'CUSTOM':
    default:
      return {
        ...base,
        pointsForWin: 3,
        pointsForDraw: 1,
        pointsForTie: 1,
        pointsForLoss: 0,
        pointsForNoResult: 1,
        pointsForAbandoned: 1,
        tieBreakerOrder: ['POINTS', 'SCORE_DIFFERENCE', 'WINS', 'HEAD_TO_HEAD', 'MANUAL_DECISION'],
        customSportMetrics: {
          primaryMetricName: 'Points',
          forMetricName: 'Score For',
          againstMetricName: 'Score Against',
          differenceMetricName: 'Score Diff',
          secondaryMetricName: 'Bonus',
        },
      };
  }
}

/**
 * Interface representing match outcome and sport-specific statistics for standings
 */
export interface MatchStandingResult {
  matchId: string;
  isCompleted: boolean;
  isCancelled: boolean;
  isAbandoned: boolean;
  isNoResult: boolean;
  isDraw: boolean;
  isTie: boolean;
  winnerTeamId?: string;
  loserTeamId?: string;
  teamAScore: number;
  teamBScore: number;
  // Cricket
  cricketData?: {
    runsA: number;
    ballsA: number;
    oversA: number;
    wicketsA: number;
    allOutA: boolean;
    allocatedOversA: number;
    runsB: number;
    ballsB: number;
    oversB: number;
    wicketsB: number;
    allOutB: boolean;
    allocatedOversB: number;
  };
  // Volleyball / Racket Sports
  setGameData?: {
    setsWonA: number;
    setsWonB: number;
    pointsWonA: number;
    pointsWonB: number;
    gamesWonA?: number;
    gamesWonB?: number;
  };
  // Kabaddi
  kabaddiData?: {
    raidPointsA: number;
    raidPointsB: number;
    tacklePointsA: number;
    tacklePointsB: number;
    scoreA: number;
    scoreB: number;
  };
  // Goals / Points (Football, Hockey, Basketball, Custom)
  pointsData?: {
    scoreA: number;
    scoreB: number;
  };
}

/**
 * Extract comprehensive match result from completed match across all sports
 */
export function extractStandingMatchResult(match: Match): MatchStandingResult {
  const db = getDb();
  const isCompleted = match.status === 'COMPLETED';
  const isCancelled = match.status === 'CANCELLED';

  if (isCancelled) {
    return {
      matchId: match.id,
      isCompleted: false,
      isCancelled: true,
      isAbandoned: false,
      isNoResult: true,
      isDraw: false,
      isTie: false,
      teamAScore: 0,
      teamBScore: 0,
    };
  }

  // Check if match was abandoned or declared no result
  const report = (db.match_reports || []).find((r) => r.matchId === match.id);
  const isAbandoned = match.description?.toLowerCase().includes('abandoned') || false;
  const isNoResult = match.description?.toLowerCase().includes('no result') || isAbandoned;

  // 1. CRICKET
  if (match.sport === 'CRICKET') {
    const inningsList = (db.match_innings || []).filter((inn: any) => inn.matchId === match.id);
    let runsA = 0;
    let ballsA = 0;
    let wicketsA = 0;
    let allOutA = false;
    let runsB = 0;
    let ballsB = 0;
    let wicketsB = 0;
    let allOutB = false;

    // Allocated match overs (default 20 for T20, or from match/tournament config)
    const tournament = db.tournaments.find((t) => t.id === match.tournamentId);
    let allocatedOvers = 20;
    if (match.cricketConfig?.overs && Number(match.cricketConfig.overs) > 0) {
      allocatedOvers = Number(match.cricketConfig.overs);
    } else if (match.matchOvers && Number(match.matchOvers) > 0) {
      allocatedOvers = Number(match.matchOvers);
    } else if (tournament?.cricketDefaultOvers && Number(tournament.cricketDefaultOvers) > 0) {
      allocatedOvers = Number(tournament.cricketDefaultOvers);
    }

    inningsList.forEach((inn: any) => {
      if (inn.battingTeamId === match.teamAId) {
        runsA += inn.totalRuns || 0;
        const b = inn.totalBalls !== undefined ? inn.totalBalls : (inn.overs || 0) * 6;
        ballsA += b;
        wicketsA = inn.wickets || 0;
        if (wicketsA >= 10 || inn.isAllOut) {
          allOutA = true;
        }
      } else if (inn.battingTeamId === match.teamBId) {
        runsB += inn.totalRuns || 0;
        const b = inn.totalBalls !== undefined ? inn.totalBalls : (inn.overs || 0) * 6;
        ballsB += b;
        wicketsB = inn.wickets || 0;
        if (wicketsB >= 10 || inn.isAllOut) {
          allOutB = true;
        }
      }
    });

    // If ball events exist and match_innings was empty
    if (inningsList.length === 0) {
      const events = (db.scoring_events || []).filter((e: any) => e.matchId === match.id);
      events.forEach((ev: any) => {
        const d = ev.eventData || {};
        if (d.battingTeamId === match.teamAId) {
          runsA += (d.runsScored || 0) + (d.extraRuns || 0);
          if (d.isLegalDelivery !== false) ballsA++;
          if (d.isWicket) wicketsA++;
        } else if (d.battingTeamId === match.teamBId) {
          runsB += (d.runsScored || 0) + (d.extraRuns || 0);
          if (d.isLegalDelivery !== false) ballsB++;
          if (d.isWicket) wicketsB++;
        }
      });
      if (wicketsA >= 10) allOutA = true;
      if (wicketsB >= 10) allOutB = true;
    }

    const oversA = ballsA > 0 ? Math.floor(ballsA / 6) + (ballsA % 6) / 6 : 0;
    const oversB = ballsB > 0 ? Math.floor(ballsB / 6) + (ballsB % 6) / 6 : 0;

    let winnerTeamId: string | undefined;
    let loserTeamId: string | undefined;
    let isTie = false;
    let isDraw = false;

    if (isCompleted && !isNoResult) {
      if (runsA > runsB) {
        winnerTeamId = match.teamAId;
        loserTeamId = match.teamBId;
      } else if (runsB > runsA) {
        winnerTeamId = match.teamBId;
        loserTeamId = match.teamAId;
      } else {
        isTie = true;
        isDraw = true;
      }
    }

    return {
      matchId: match.id,
      isCompleted,
      isCancelled: false,
      isAbandoned,
      isNoResult,
      isDraw,
      isTie,
      winnerTeamId,
      loserTeamId,
      teamAScore: runsA,
      teamBScore: runsB,
      cricketData: {
        runsA,
        ballsA,
        oversA,
        wicketsA,
        allOutA,
        allocatedOversA: allocatedOvers,
        runsB,
        ballsB,
        oversB,
        wicketsB,
        allOutB,
        allocatedOversB: allocatedOvers,
      },
    };
  }

  // 2. VOLLEYBALL
  if (match.sport === 'VOLLEYBALL') {
    const sets = (db.volleyball_sets || []).filter((s: any) => s.matchId === match.id);
    let setsWonA = 0;
    let setsWonB = 0;
    let pointsWonA = 0;
    let pointsWonB = 0;

    sets.forEach((s: any) => {
      pointsWonA += s.teamAScore || 0;
      pointsWonB += s.teamBScore || 0;
      if (s.isCompleted || isCompleted) {
        if (s.winnerTeamId === match.teamAId || (s.teamAScore > s.teamBScore)) {
          setsWonA++;
        } else if (s.winnerTeamId === match.teamBId || (s.teamBScore > s.teamAScore)) {
          setsWonB++;
        }
      }
    });

    let winnerTeamId: string | undefined;
    let loserTeamId: string | undefined;
    if (isCompleted && !isNoResult) {
      if (setsWonA > setsWonB) {
        winnerTeamId = match.teamAId;
        loserTeamId = match.teamBId;
      } else if (setsWonB > setsWonA) {
        winnerTeamId = match.teamBId;
        loserTeamId = match.teamAId;
      }
    }

    return {
      matchId: match.id,
      isCompleted,
      isCancelled: false,
      isAbandoned,
      isNoResult,
      isDraw: false,
      isTie: false,
      winnerTeamId,
      loserTeamId,
      teamAScore: setsWonA,
      teamBScore: setsWonB,
      setGameData: {
        setsWonA,
        setsWonB,
        pointsWonA,
        pointsWonB,
      },
    };
  }

  // 3. KABADDI
  if (match.sport === 'KABADDI') {
    const raids = (db.kabaddi_raids || []).filter((r: any) => r.matchId === match.id && !r.isUndone);
    let raidPointsA = 0;
    let raidPointsB = 0;
    let tacklePointsA = 0;
    let tacklePointsB = 0;
    let scoreA = 0;
    let scoreB = 0;

    raids.forEach((r: any) => {
      if (r.raidingTeamId === match.teamAId) {
        const rp = (r.raidPoints || 0) + (r.bonusPoint ? 1 : 0);
        raidPointsA += rp;
        scoreA += rp;
        const tp = r.defenderPoints || 0;
        tacklePointsB += tp;
        scoreB += tp;
      } else {
        const rp = (r.raidPoints || 0) + (r.bonusPoint ? 1 : 0);
        raidPointsB += rp;
        scoreB += rp;
        const tp = r.defenderPoints || 0;
        tacklePointsA += tp;
        scoreA += tp;
      }
    });

    let winnerTeamId: string | undefined;
    let loserTeamId: string | undefined;
    let isTie = false;
    let isDraw = false;

    if (isCompleted && !isNoResult) {
      if (scoreA > scoreB) {
        winnerTeamId = match.teamAId;
        loserTeamId = match.teamBId;
      } else if (scoreB > scoreA) {
        winnerTeamId = match.teamBId;
        loserTeamId = match.teamAId;
      } else {
        isTie = true;
        isDraw = true;
      }
    }

    return {
      matchId: match.id,
      isCompleted,
      isCancelled: false,
      isAbandoned,
      isNoResult,
      isDraw,
      isTie,
      winnerTeamId,
      loserTeamId,
      teamAScore: scoreA,
      teamBScore: scoreB,
      kabaddiData: {
        raidPointsA,
        raidPointsB,
        tacklePointsA,
        tacklePointsB,
        scoreA,
        scoreB,
      },
    };
  }

  // 4. FOOTBALL / SOCCER
  if (match.sport === 'FOOTBALL') {
    const events = (db.football_scoring_events || []).filter((e: any) => e.matchId === match.id && !e.isUndone);
    let goalsA = 0;
    let goalsB = 0;

    events.forEach((e: any) => {
      if (e.teamId === match.teamAId && e.eventType === 'GOAL') goalsA++;
      else if (e.teamId === match.teamBId && e.eventType === 'GOAL') goalsB++;
      else if (e.eventType === 'OWN_GOAL') {
        if (e.teamId === match.teamAId) goalsB++;
        else if (e.teamId === match.teamBId) goalsA++;
      }
    });

    let winnerTeamId: string | undefined;
    let loserTeamId: string | undefined;
    let isDraw = false;

    if (isCompleted && !isNoResult) {
      if (goalsA > goalsB) {
        winnerTeamId = match.teamAId;
        loserTeamId = match.teamBId;
      } else if (goalsB > goalsA) {
        winnerTeamId = match.teamBId;
        loserTeamId = match.teamAId;
      } else {
        isDraw = true;
      }
    }

    return {
      matchId: match.id,
      isCompleted,
      isCancelled: false,
      isAbandoned,
      isNoResult,
      isDraw,
      isTie: isDraw,
      winnerTeamId,
      loserTeamId,
      teamAScore: goalsA,
      teamBScore: goalsB,
      pointsData: { scoreA: goalsA, scoreB: goalsB },
    };
  }

  // 5. FIELD HOCKEY
  if (match.sport === 'HOCKEY') {
    const events = (db.hockey_scoring_events || []).filter((e: any) => e.matchId === match.id && !e.isUndone);
    let goalsA = 0;
    let goalsB = 0;

    events.forEach((e: any) => {
      if (e.teamId === match.teamAId && (e.eventType === 'GOAL' || e.eventType === 'PENALTY_CORNER_GOAL' || e.eventType === 'PENALTY_STROKE_GOAL')) {
        goalsA++;
      } else if (e.teamId === match.teamBId && (e.eventType === 'GOAL' || e.eventType === 'PENALTY_CORNER_GOAL' || e.eventType === 'PENALTY_STROKE_GOAL')) {
        goalsB++;
      }
    });

    let winnerTeamId: string | undefined;
    let loserTeamId: string | undefined;
    let isDraw = false;

    if (isCompleted && !isNoResult) {
      if (goalsA > goalsB) {
        winnerTeamId = match.teamAId;
        loserTeamId = match.teamBId;
      } else if (goalsB > goalsA) {
        winnerTeamId = match.teamBId;
        loserTeamId = match.teamAId;
      } else {
        isDraw = true;
      }
    }

    return {
      matchId: match.id,
      isCompleted,
      isCancelled: false,
      isAbandoned,
      isNoResult,
      isDraw,
      isTie: isDraw,
      winnerTeamId,
      loserTeamId,
      teamAScore: goalsA,
      teamBScore: goalsB,
      pointsData: { scoreA: goalsA, scoreB: goalsB },
    };
  }

  // 6. BASKETBALL
  if (match.sport === 'BASKETBALL') {
    const events = (db.basketball_scoring_events || []).filter((e: any) => e.matchId === match.id && !e.isUndone);
    let ptsA = 0;
    let ptsB = 0;

    events.forEach((e: any) => {
      if (e.teamId === match.teamAId) ptsA += e.points || 0;
      else if (e.teamId === match.teamBId) ptsB += e.points || 0;
    });

    let winnerTeamId: string | undefined;
    let loserTeamId: string | undefined;
    let isDraw = false;

    if (isCompleted && !isNoResult) {
      if (ptsA > ptsB) {
        winnerTeamId = match.teamAId;
        loserTeamId = match.teamBId;
      } else if (ptsB > ptsA) {
        winnerTeamId = match.teamBId;
        loserTeamId = match.teamAId;
      } else {
        isDraw = true;
      }
    }

    return {
      matchId: match.id,
      isCompleted,
      isCancelled: false,
      isAbandoned,
      isNoResult,
      isDraw,
      isTie: isDraw,
      winnerTeamId,
      loserTeamId,
      teamAScore: ptsA,
      teamBScore: ptsB,
      pointsData: { scoreA: ptsA, scoreB: ptsB },
    };
  }

  // 7. TENNIS / BADMINTON / TABLE TENNIS
  if (match.sport === 'TENNIS' || match.sport === 'BADMINTON' || match.sport === 'TABLE_TENNIS') {
    let setsA = 0;
    let setsB = 0;
    let gamesA = 0;
    let gamesB = 0;
    let pointsA = 0;
    let pointsB = 0;

    if (match.sport === 'TENNIS') {
      const events = (db.tennis_scoring_events || []).filter((e: any) => e.matchId === match.id && !e.isUndone);
      events.forEach((e: any) => {
        if (e.pointWinnerTeamId === match.teamAId) pointsA++;
        else if (e.pointWinnerTeamId === match.teamBId) pointsB++;
      });
    } else if (match.sport === 'BADMINTON') {
      const events = (db.badminton_scoring_events || []).filter((e: any) => e.matchId === match.id && !e.isUndone);
      events.forEach((e: any) => {
        if (e.pointWinnerTeamId === match.teamAId) pointsA++;
        else if (e.pointWinnerTeamId === match.teamBId) pointsB++;
      });
    } else if (match.sport === 'TABLE_TENNIS') {
      const events = (db.table_tennis_scoring_events || []).filter((e: any) => e.matchId === match.id && !e.isUndone);
      events.forEach((e: any) => {
        if (e.pointWinnerTeamId === match.teamAId) pointsA++;
        else if (e.pointWinnerTeamId === match.teamBId) pointsB++;
      });
    }

    if (report?.reportData) {
      setsA = report.reportData.setsWonA || report.reportData.gamesWonA || 0;
      setsB = report.reportData.setsWonB || report.reportData.gamesWonB || 0;
      gamesA = report.reportData.gamesWonA || 0;
      gamesB = report.reportData.gamesWonB || 0;
    }

    let winnerTeamId: string | undefined;
    let loserTeamId: string | undefined;
    if (isCompleted && !isNoResult) {
      if (setsA > setsB || (setsA === setsB && pointsA > pointsB)) {
        winnerTeamId = match.teamAId;
        loserTeamId = match.teamBId;
      } else if (setsB > setsA || (setsA === setsB && pointsB > pointsA)) {
        winnerTeamId = match.teamBId;
        loserTeamId = match.teamAId;
      }
    }

    return {
      matchId: match.id,
      isCompleted,
      isCancelled: false,
      isAbandoned,
      isNoResult,
      isDraw: false,
      isTie: false,
      winnerTeamId,
      loserTeamId,
      teamAScore: setsA || pointsA,
      teamBScore: setsB || pointsB,
      setGameData: {
        setsWonA: setsA,
        setsWonB: setsB,
        gamesWonA: gamesA,
        gamesWonB: gamesB,
        pointsWonA: pointsA,
        pointsWonB: pointsB,
      },
    };
  }

  // 8. CUSTOM SPORT / OTHER
  const customEvents = (db.custom_scoring_events || []).filter((e: any) => e.matchId === match.id && !e.isUndone);
  let cScoreA = 0;
  let cScoreB = 0;

  customEvents.forEach((e: any) => {
    if (e.teamId === match.teamAId) cScoreA += e.points || 0;
    else if (e.teamId === match.teamBId) cScoreB += e.points || 0;
  });

  let winnerTeamId: string | undefined;
  let loserTeamId: string | undefined;
  let isDraw = false;

  if (isCompleted && !isNoResult) {
    if (cScoreA > cScoreB) {
      winnerTeamId = match.teamAId;
      loserTeamId = match.teamBId;
    } else if (cScoreB > cScoreA) {
      winnerTeamId = match.teamBId;
      loserTeamId = match.teamAId;
    } else {
      isDraw = true;
    }
  }

  return {
    matchId: match.id,
    isCompleted,
    isCancelled: false,
    isAbandoned,
    isNoResult,
    isDraw,
    isTie: isDraw,
    winnerTeamId,
    loserTeamId,
    teamAScore: cScoreA,
    teamBScore: cScoreB,
    pointsData: { scoreA: cScoreA, scoreB: cScoreB },
  };
}

/**
 * Standings Calculation Engine for a Tournament
 */
export function calculateTournamentStandingsDeterministic(
  tournamentId: string,
  targetGroupId?: string
): {
  groups: TournamentGroupStandings[];
  overall: TournamentStandingRow[];
  competitionConfig: TournamentCompetitionConfig;
} {
  const db = getDb();
  const tournament = db.tournaments.find((t) => t.id === tournamentId);
  if (!tournament) {
    const emptyConfig = getDefaultCompetitionConfig('CRICKET', tournamentId);
    return { groups: [], overall: [], competitionConfig: emptyConfig };
  }

  // Retrieve or create tournament competition configuration
  let competitionConfig = (db.tournament_competition_configs || []).find((c: any) => c.tournamentId === tournamentId);
  if (!competitionConfig) {
    // Check if tournament already has rankingRules or competitionConfig attached
    competitionConfig = tournament.competitionConfig || getDefaultCompetitionConfig(
      tournament.sport,
      tournamentId,
      {
        format: tournament.competitionFormat,
        ...(tournament.formatConfig || {}),
        ...(tournament.rankingRules || {}),
      }
    );
  }

  const groups = db.groups.filter((g) => g.tournamentId === tournamentId);
  const teams = db.teams.filter((tm) => tm.tournamentId === tournamentId);
  const matches = db.matches.filter((m) => m.tournamentId === tournamentId);
  const overrides = (db.tournament_standings_overrides || []).filter((o: any) => o.tournamentId === tournamentId);

  // Group setup
  const effectiveGroups: Group[] = groups.length > 0 ? groups : [
    {
      id: 'ALL',
      tournamentId,
      name: 'All Teams',
      code: 'ALL',
      maxTeams: 100,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const groupStandingsList: TournamentGroupStandings[] = [];
  const allRowsAccumulator: TournamentStandingRow[] = [];

  effectiveGroups.forEach((grp) => {
    if (targetGroupId && targetGroupId !== 'ALL' && grp.id !== targetGroupId) {
      return;
    }

    const grpTeams = grp.id === 'ALL' ? teams : teams.filter((tm) => tm.groupId === grp.id);
    const grpMatches = grp.id === 'ALL' ? matches : matches.filter((m) => m.groupId === grp.id);

    // Initialize team accumulators
    interface TeamAccumulator {
      team: Team;
      played: number;
      won: number;
      drawn: number;
      tied: number;
      lost: number;
      noResult: number;
      abandoned: number;
      points: number;
      forMetric: number;
      againstMetric: number;
      differenceMetric: number;
      // Cricket specific
      cricketRunsScored: number;
      cricketBallsFaced: number;
      cricketOversFacedDecimal: number;
      cricketRunsConceded: number;
      cricketBallsBowled: number;
      cricketOversBowledDecimal: number;
      // Volleyball / Racket sports
      setsWon: number;
      setsLost: number;
      gamesWon: number;
      gamesLost: number;
      pointsWon: number;
      pointsLost: number;
      // Kabaddi
      raidPoints: number;
      tacklePoints: number;
      // Form history & Head to Head
      form: ('W' | 'L' | 'D' | 'T' | 'NR' | 'A')[];
      h2hWinsAgainst: Map<string, number>;
      h2hPointsAgainst: Map<string, number>;
      h2hDiffAgainst: Map<string, number>;
    }

    const accMap = new Map<string, TeamAccumulator>();
    grpTeams.forEach((t) => {
      accMap.set(t.id, {
        team: t,
        played: 0,
        won: 0,
        drawn: 0,
        tied: 0,
        lost: 0,
        noResult: 0,
        abandoned: 0,
        points: 0,
        forMetric: 0,
        againstMetric: 0,
        differenceMetric: 0,
        cricketRunsScored: 0,
        cricketBallsFaced: 0,
        cricketOversFacedDecimal: 0,
        cricketRunsConceded: 0,
        cricketBallsBowled: 0,
        cricketOversBowledDecimal: 0,
        setsWon: 0,
        setsLost: 0,
        gamesWon: 0,
        gamesLost: 0,
        pointsWon: 0,
        pointsLost: 0,
        raidPoints: 0,
        tacklePoints: 0,
        form: [],
        h2hWinsAgainst: new Map<string, number>(),
        h2hPointsAgainst: new Map<string, number>(),
        h2hDiffAgainst: new Map<string, number>(),
      });
    });

    // Process all completed/relevant matches in chronological order
    const sortedMatches = [...grpMatches].sort((a, b) => {
      const dateA = a.date ? new Date(`${a.date}T${a.time || '00:00'}`).getTime() : 0;
      const dateB = b.date ? new Date(`${b.date}T${b.time || '00:00'}`).getTime() : 0;
      return dateA - dateB;
    });

    let completedMatchCount = 0;

    sortedMatches.forEach((m) => {
      if (m.status !== 'COMPLETED' && m.status !== 'LIVE') return;
      if (m.status === 'CANCELLED') return;

      const res = extractStandingMatchResult(m);
      const accA = accMap.get(m.teamAId);
      const accB = accMap.get(m.teamBId);

      if (!accA || !accB) return;
      if (!res.isCompleted && m.status !== 'COMPLETED') return;

      completedMatchCount++;
      accA.played++;
      accB.played++;

      // Sport Metrics Extraction
      // 1. Cricket NRR
      if (res.cricketData) {
        const c = res.cricketData;
        accA.cricketRunsScored += c.runsA;
        accA.cricketRunsConceded += c.runsB;
        accB.cricketRunsScored += c.runsB;
        accB.cricketRunsConceded += c.runsA;

        // Decimal overs faced calculation
        // If team was bowled all out, full innings overs quota is counted for NRR divisor
        const effOversA = c.allOutA ? c.allocatedOversA : c.oversA;
        const effOversB = c.allOutB ? c.allocatedOversB : c.oversB;

        accA.cricketOversFacedDecimal += effOversA;
        accA.cricketOversBowledDecimal += effOversB;
        accB.cricketOversFacedDecimal += effOversB;
        accB.cricketOversBowledDecimal += effOversA;

        accA.forMetric += c.runsA;
        accA.againstMetric += c.runsB;
        accB.forMetric += c.runsB;
        accB.againstMetric += c.runsA;
      }

      // 2. Volleyball / Rackets
      if (res.setGameData) {
        const s = res.setGameData;
        accA.setsWon += s.setsWonA;
        accA.setsLost += s.setsWonB;
        accB.setsWon += s.setsWonB;
        accB.setsLost += s.setsWonA;

        accA.gamesWon += s.gamesWonA || 0;
        accA.gamesLost += s.gamesWonB || 0;
        accB.gamesWon += s.gamesWonB || 0;
        accB.gamesLost += s.gamesWonA || 0;

        accA.pointsWon += s.pointsWonA;
        accA.pointsLost += s.pointsWonB;
        accB.pointsWon += s.pointsWonB;
        accB.pointsLost += s.pointsWonA;

        accA.forMetric += s.setsWonA;
        accA.againstMetric += s.setsWonB;
        accB.forMetric += s.setsWonB;
        accB.againstMetric += s.setsWonA;
      }

      // 3. Kabaddi
      if (res.kabaddiData) {
        const k = res.kabaddiData;
        accA.raidPoints += k.raidPointsA;
        accA.tacklePoints += k.tacklePointsA;
        accB.raidPoints += k.raidPointsB;
        accB.tacklePoints += k.tacklePointsB;

        accA.forMetric += k.scoreA;
        accA.againstMetric += k.scoreB;
        accB.forMetric += k.scoreB;
        accB.againstMetric += k.scoreA;
      }

      // 4. Football / Hockey / Basketball / Custom
      if (res.pointsData) {
        accA.forMetric += res.pointsData.scoreA;
        accA.againstMetric += res.pointsData.scoreB;
        accB.forMetric += res.pointsData.scoreB;
        accB.againstMetric += res.pointsData.scoreA;
      }

      // H2H Tracker
      const diffA = res.teamAScore - res.teamBScore;
      accA.h2hDiffAgainst.set(m.teamBId, (accA.h2hDiffAgainst.get(m.teamBId) || 0) + diffA);
      accB.h2hDiffAgainst.set(m.teamAId, (accB.h2hDiffAgainst.get(m.teamAId) || 0) - diffA);

      // Outcome & Points allocation
      if (res.isAbandoned) {
        accA.abandoned++;
        accB.abandoned++;
        accA.points += competitionConfig.pointsForAbandoned;
        accB.points += competitionConfig.pointsForAbandoned;
        accA.form.push('A');
        accB.form.push('A');
      } else if (res.isNoResult) {
        accA.noResult++;
        accB.noResult++;
        accA.points += competitionConfig.pointsForNoResult;
        accB.points += competitionConfig.pointsForNoResult;
        accA.form.push('NR');
        accB.form.push('NR');
      } else if (res.isDraw || res.isTie) {
        if (res.isTie) {
          accA.tied++;
          accB.tied++;
          accA.points += competitionConfig.pointsForTie;
          accB.points += competitionConfig.pointsForTie;
          accA.form.push('T');
          accB.form.push('T');
        } else {
          accA.drawn++;
          accB.drawn++;
          accA.points += competitionConfig.pointsForDraw;
          accB.points += competitionConfig.pointsForDraw;
          accA.form.push('D');
          accB.form.push('D');
        }
        accA.h2hPointsAgainst.set(m.teamBId, (accA.h2hPointsAgainst.get(m.teamBId) || 0) + competitionConfig.pointsForDraw);
        accB.h2hPointsAgainst.set(m.teamAId, (accB.h2hPointsAgainst.get(m.teamAId) || 0) + competitionConfig.pointsForDraw);
      } else if (res.winnerTeamId === m.teamAId) {
        accA.won++;
        accB.lost++;
        accA.points += competitionConfig.pointsForWin;
        accB.points += competitionConfig.pointsForLoss;
        accA.form.push('W');
        accB.form.push('L');
        accA.h2hWinsAgainst.set(m.teamBId, (accA.h2hWinsAgainst.get(m.teamBId) || 0) + 1);
        accA.h2hPointsAgainst.set(m.teamBId, (accA.h2hPointsAgainst.get(m.teamBId) || 0) + competitionConfig.pointsForWin);
      } else if (res.winnerTeamId === m.teamBId) {
        accB.won++;
        accA.lost++;
        accB.points += competitionConfig.pointsForWin;
        accA.points += competitionConfig.pointsForLoss;
        accB.form.push('W');
        accA.form.push('L');
        accB.h2hWinsAgainst.set(m.teamAId, (accB.h2hWinsAgainst.get(m.teamAId) || 0) + 1);
        accB.h2hPointsAgainst.set(m.teamAId, (accB.h2hPointsAgainst.get(m.teamAId) || 0) + competitionConfig.pointsForWin);
      }
    });

    // Build raw Standing Rows
    const rows: TournamentStandingRow[] = Array.from(accMap.values()).map((acc) => {
      const teamId = acc.team.id;
      const rawPoints = acc.points;

      // Check for admin manual override
      const override = overrides.find((o: any) => o.teamId === teamId && (o.groupId === grp.id || !o.groupId));
      const pointsAdj = (competitionConfig.manualPointsOverrideEnabled && override?.adjustment?.pointsAdjustment) || 0;
      const finalPoints = rawPoints + pointsAdj;

      // Form: keep last 5 results
      const recentForm = acc.form.slice(-5);

      // Sport Specific Metrics
      const sportMetrics: SportSpecificStandingsMetrics = {};
      let diffMetric = acc.forMetric - acc.againstMetric;
      let diffDisplay = diffMetric >= 0 ? `+${diffMetric}` : `${diffMetric}`;

      if (tournament.sport === 'CRICKET') {
        const runRateFor = acc.cricketOversFacedDecimal > 0 ? acc.cricketRunsScored / acc.cricketOversFacedDecimal : 0;
        const runRateAgainst = acc.cricketOversBowledDecimal > 0 ? acc.cricketRunsConceded / acc.cricketOversBowledDecimal : 0;
        const nrr = runRateFor - runRateAgainst;
        const nrrFormatted = (nrr >= 0 ? '+' : '') + nrr.toFixed(3);

        sportMetrics.nrr = nrr;
        sportMetrics.nrrDisplay = nrrFormatted;
        sportMetrics.runsScored = acc.cricketRunsScored;
        sportMetrics.runsConceded = acc.cricketRunsConceded;
        sportMetrics.oversFaced = Number(acc.cricketOversFacedDecimal.toFixed(1));
        sportMetrics.oversBowled = Number(acc.cricketOversBowledDecimal.toFixed(1));

        diffMetric = nrr;
        diffDisplay = nrrFormatted;
      } else if (tournament.sport === 'FOOTBALL' || tournament.sport === 'HOCKEY') {
        sportMetrics.goalsFor = acc.forMetric;
        sportMetrics.goalsAgainst = acc.againstMetric;
        sportMetrics.goalDifference = diffMetric;
      } else if (tournament.sport === 'VOLLEYBALL') {
        const setDiff = acc.setsWon - acc.setsLost;
        const setRatio = acc.setsLost > 0 ? acc.setsWon / acc.setsLost : acc.setsWon;
        const ptDiff = acc.pointsWon - acc.pointsLost;
        const ptRatio = acc.pointsLost > 0 ? acc.pointsWon / acc.pointsLost : acc.pointsWon;

        sportMetrics.setsWon = acc.setsWon;
        sportMetrics.setsLost = acc.setsLost;
        sportMetrics.setDifference = setDiff;
        sportMetrics.setRatio = Number(setRatio.toFixed(3));
        sportMetrics.pointsWon = acc.pointsWon;
        sportMetrics.pointsLost = acc.pointsLost;
        sportMetrics.pointDifference = ptDiff;
        sportMetrics.pointRatio = Number(ptRatio.toFixed(3));

        diffMetric = setDiff;
        diffDisplay = setDiff >= 0 ? `+${setDiff}` : `${setDiff}`;
      } else if (tournament.sport === 'KABADDI') {
        sportMetrics.scoreFor = acc.forMetric;
        sportMetrics.scoreAgainst = acc.againstMetric;
        sportMetrics.scoreDifference = diffMetric;
        sportMetrics.raidPoints = acc.raidPoints;
        sportMetrics.tacklePoints = acc.tacklePoints;
      } else if (tournament.sport === 'BASKETBALL') {
        sportMetrics.pointsFor = acc.forMetric;
        sportMetrics.pointsAgainst = acc.againstMetric;
        sportMetrics.pointDifference = diffMetric;
      } else if (tournament.sport === 'TENNIS' || tournament.sport === 'BADMINTON' || tournament.sport === 'TABLE_TENNIS') {
        const setDiff = acc.setsWon - acc.setsLost;
        const gameDiff = acc.gamesWon - acc.gamesLost;
        const ptDiff = acc.pointsWon - acc.pointsLost;

        sportMetrics.setsWon = acc.setsWon;
        sportMetrics.setsLost = acc.setsLost;
        sportMetrics.setDifference = setDiff;
        sportMetrics.gamesWon = acc.gamesWon;
        sportMetrics.gamesLost = acc.gamesLost;
        sportMetrics.gameDifference = gameDiff;
        sportMetrics.pointsWon = acc.pointsWon;
        sportMetrics.pointsLost = acc.pointsLost;
        sportMetrics.pointDifference = ptDiff;

        diffMetric = tournament.sport === 'TENNIS' ? setDiff : gameDiff;
        diffDisplay = diffMetric >= 0 ? `+${diffMetric}` : `${diffMetric}`;
      } else {
        sportMetrics.forMetric = acc.forMetric;
        sportMetrics.againstMetric = acc.againstMetric;
        sportMetrics.differenceMetric = diffMetric;
        sportMetrics.differenceDisplay = diffDisplay;
      }

      const isManual = Boolean(override?.adjustment && (override.adjustment.pointsAdjustment || override.adjustment.qualificationStatusOverride || override.adjustment.rankOverride));

      return {
        id: `${tournamentId}_${grp.id}_${teamId}`,
        rank: 0,
        position: 0,
        tournamentId,
        groupId: grp.id,
        groupName: grp.name,
        groupCode: grp.code,
        teamId: acc.team.id,
        teamName: acc.team.name,
        teamShortName: acc.team.shortName || acc.team.name.substring(0, 3).toUpperCase(),
        teamCode: acc.team.code || acc.team.shortName || acc.team.name.substring(0, 3).toUpperCase(),
        teamLogoUrl: acc.team.logoUrl,
        played: acc.played,
        won: acc.won,
        drawn: acc.drawn,
        tied: acc.tied,
        lost: acc.lost,
        noResult: acc.noResult,
        abandoned: acc.abandoned,
        points: finalPoints,
        rawCalculatedPoints: rawPoints,
        forMetric: acc.forMetric,
        againstMetric: acc.againstMetric,
        differenceMetric: diffMetric,
        differenceDisplay: diffDisplay,
        form: recentForm,
        qualified: false,
        eliminated: false,
        qualificationStatus: 'CONTENTION',
        isManualOverride: isManual,
        manualAdjustment: override?.adjustment,
        sportSpecificMetrics: sportMetrics,
        sportStats: { ...sportMetrics },
        updatedAt: new Date().toISOString(),
      };
    });

    // ----------------------------------------------------
    // SORTING & TIE-BREAKING ENGINE
    // ----------------------------------------------------
    const tieBreakerOrder: TieBreakerRule[] = competitionConfig.tieBreakerOrder && competitionConfig.tieBreakerOrder.length > 0
      ? competitionConfig.tieBreakerOrder
      : ['POINTS', 'NRR', 'GOAL_DIFFERENCE', 'WINS', 'HEAD_TO_HEAD', 'MANUAL_DECISION'];

    rows.sort((a, b) => {
      // If manual rank override exists on both
      if (a.manualAdjustment?.rankOverride && b.manualAdjustment?.rankOverride) {
        return a.manualAdjustment.rankOverride - b.manualAdjustment.rankOverride;
      }
      if (a.manualAdjustment?.rankOverride) return -1;
      if (b.manualAdjustment?.rankOverride) return 1;

      for (const rule of tieBreakerOrder) {
        if (rule === 'POINTS') {
          if (b.points !== a.points) return b.points - a.points;
        } else if (rule === 'WINS') {
          if (b.won !== a.won) return b.won - a.won;
        } else if (rule === 'NRR') {
          const nrrA = a.sportSpecificMetrics?.nrr ?? 0;
          const nrrB = b.sportSpecificMetrics?.nrr ?? 0;
          if (Math.abs(nrrB - nrrA) > 0.0001) return nrrB - nrrA;
        } else if (rule === 'GOAL_DIFFERENCE') {
          const gdA = a.sportSpecificMetrics?.goalDifference ?? a.differenceMetric ?? 0;
          const gdB = b.sportSpecificMetrics?.goalDifference ?? b.differenceMetric ?? 0;
          if (gdB !== gdA) return gdB - gdA;
        } else if (rule === 'GOALS_FOR') {
          const gfA = a.sportSpecificMetrics?.goalsFor ?? a.forMetric ?? 0;
          const gfB = b.sportSpecificMetrics?.goalsFor ?? b.forMetric ?? 0;
          if (gfB !== gfA) return gfB - gfA;
        } else if (rule === 'SET_RATIO') {
          const srA = a.sportSpecificMetrics?.setRatio ?? 0;
          const srB = b.sportSpecificMetrics?.setRatio ?? 0;
          if (Math.abs(srB - srA) > 0.001) return srB - srA;
        } else if (rule === 'SET_DIFFERENCE') {
          const sdA = a.sportSpecificMetrics?.setDifference ?? 0;
          const sdB = b.sportSpecificMetrics?.setDifference ?? 0;
          if (sdB !== sdA) return sdB - sdA;
        } else if (rule === 'GAMES_DIFFERENCE') {
          const gdA = a.sportSpecificMetrics?.gameDifference ?? 0;
          const gdB = b.sportSpecificMetrics?.gameDifference ?? 0;
          if (gdB !== gdA) return gdB - gdA;
        } else if (rule === 'POINT_DIFFERENCE' || rule === 'SCORE_DIFFERENCE') {
          const pdA = a.sportSpecificMetrics?.scoreDifference ?? a.sportSpecificMetrics?.pointDifference ?? a.differenceMetric ?? 0;
          const pdB = b.sportSpecificMetrics?.scoreDifference ?? b.sportSpecificMetrics?.pointDifference ?? b.differenceMetric ?? 0;
          if (pdB !== pdA) return pdB - pdA;
        } else if (rule === 'RAID_POINTS') {
          const rpA = a.sportSpecificMetrics?.raidPoints ?? 0;
          const rpB = b.sportSpecificMetrics?.raidPoints ?? 0;
          if (rpB !== rpA) return rpB - rpA;
        } else if (rule === 'HEAD_TO_HEAD') {
          const accA = accMap.get(a.teamId);
          const accB = accMap.get(b.teamId);
          if (accA && accB) {
            const h2hWinsA = accA.h2hWinsAgainst.get(b.teamId) || 0;
            const h2hWinsB = accB.h2hWinsAgainst.get(a.teamId) || 0;
            if (h2hWinsA !== h2hWinsB) return h2hWinsB - h2hWinsA;

            const h2hPtsA = accA.h2hPointsAgainst.get(b.teamId) || 0;
            const h2hPtsB = accB.h2hPointsAgainst.get(a.teamId) || 0;
            if (h2hPtsA !== h2hPtsB) return h2hPtsB - h2hPtsA;

            const h2hDiffA = accA.h2hDiffAgainst.get(b.teamId) || 0;
            const h2hDiffB = accB.h2hDiffAgainst.get(a.teamId) || 0;
            if (h2hDiffA !== h2hDiffB) return h2hDiffB - h2hDiffA;
          }
        }
      }

      // Default alphabetical fallback if completely tied
      return a.teamName.localeCompare(b.teamName);
    });

    // Assign ranking positions
    rows.forEach((r, idx) => {
      r.rank = idx + 1;
      r.position = idx + 1;
    });

    // ----------------------------------------------------
    // MATHEMATICAL QUALIFICATION CALCULATION
    // ----------------------------------------------------
    const qualSlots = competitionConfig.qualificationSlotsPerGroup || 2;
    const ptsForWin = competitionConfig.pointsForWin || 2;

    // Total expected matches per team in group
    // In single round robin: (N - 1) matches per team
    // In double round robin: 2 * (N - 1)
    const numTeamsInGrp = grpTeams.length;
    const isDoubleRoundRobin = competitionConfig.format === 'DOUBLE_ROUND_ROBIN' || tournament.formatConfig?.groupStageRounds === 'DOUBLE';
    const totalScheduledPerTeam = numTeamsInGrp > 1 ? (numTeamsInGrp - 1) * (isDoubleRoundRobin ? 2 : 1) : 0;

    // Remaining matches for each team
    const remainingMatchesMap = new Map<string, number>();
    const maxPossiblePointsMap = new Map<string, number>();

    rows.forEach((r) => {
      const remaining = Math.max(0, totalScheduledPerTeam - r.played);
      remainingMatchesMap.set(r.teamId, remaining);
      const maxPts = r.points + remaining * ptsForWin;
      maxPossiblePointsMap.set(r.teamId, maxPts);
    });

    // Determine status for each team
    rows.forEach((r, idx) => {
      // 1. Manual status override takes first precedence
      if (r.manualAdjustment?.qualificationStatusOverride && r.manualAdjustment.qualificationStatusOverride !== 'AUTO') {
        const manualStatus = r.manualAdjustment.qualificationStatusOverride;
        r.qualificationStatus = manualStatus;
        r.qualified = manualStatus === 'QUALIFIED';
        r.eliminated = manualStatus === 'ELIMINATED';
        r.qualificationNote = 'Manual Override applied by Administrator';
        return;
      }

      if (!competitionConfig.qualificationTrackingEnabled) {
        r.qualificationStatus = 'CONTENTION';
        r.qualified = false;
        r.eliminated = false;
        return;
      }

      if (numTeamsInGrp <= qualSlots) {
        // All teams in group qualify
        r.qualificationStatus = 'QUALIFIED';
        r.qualified = true;
        r.eliminated = false;
        r.qualificationNote = 'Qualified directly';
        return;
      }

      const teamMaxPts = maxPossiblePointsMap.get(r.teamId) || r.points;
      const teamCurrentPts = r.points;

      // Check if Eliminated:
      // If the team's maximum possible points is less than the current points of the team occupying the last qualification slot (qualSlots - 1 index)
      const lastQualifyingTeam = rows[qualSlots - 1];
      const teamInCutoffPts = lastQualifyingTeam ? lastQualifyingTeam.points : 0;

      // More robust elimination check: Count how many teams already have current points strictly greater than this team's max points
      let teamsAheadOfMax = 0;
      rows.forEach((otherRow) => {
        if (otherRow.teamId !== r.teamId && otherRow.points > teamMaxPts) {
          teamsAheadOfMax++;
        }
      });

      if (teamsAheadOfMax >= qualSlots) {
        r.qualificationStatus = 'ELIMINATED';
        r.eliminated = true;
        r.qualified = false;
        r.qualificationNote = 'Mathematically eliminated from qualification';
        return;
      }

      // Check if Guaranteed Qualified:
      // If this team is currently within top qualSlots, and the number of teams below that can mathematically overtake or match this team is less than the cutoff
      if (idx < qualSlots) {
        // Count how many teams outside qualification slots (index >= qualSlots) can possibly reach or exceed this team's current points
        let challengers = 0;
        for (let j = qualSlots; j < rows.length; j++) {
          const challengerMax = maxPossiblePointsMap.get(rows[j].teamId) || rows[j].points;
          if (challengerMax >= teamCurrentPts) {
            challengers++;
          }
        }

        // Also check if group is completely completed
        const allMatchesCompleted = rows.every((row) => (remainingMatchesMap.get(row.teamId) || 0) === 0);

        if (challengers === 0 || allMatchesCompleted) {
          r.qualificationStatus = 'QUALIFIED';
          r.qualified = true;
          r.eliminated = false;
          r.qualificationNote = 'Guaranteed Qualification (Q)';
          return;
        }
      }

      r.qualificationStatus = 'CONTENTION';
      r.qualified = false;
      r.eliminated = false;
      r.qualificationNote = 'In Contention';
    });

    const isGroupCompleted = grpTeams.length > 0 && rows.every((r) => (remainingMatchesMap.get(r.teamId) || 0) === 0 && r.played > 0);

    const groupStandings: TournamentGroupStandings = {
      groupId: grp.id,
      groupName: grp.name,
      groupCode: grp.code,
      teamsCount: grpTeams.length,
      matchesPlayedCount: completedMatchCount,
      totalMatchesCount: Math.floor((grpTeams.length * (grpTeams.length - 1)) / 2) * (isDoubleRoundRobin ? 2 : 1),
      isCompleted: isGroupCompleted,
      qualificationSlots: qualSlots,
      rows,
    };

    groupStandingsList.push(groupStandings);
    allRowsAccumulator.push(...rows);
  });

  return {
    groups: groupStandingsList,
    overall: allRowsAccumulator,
    competitionConfig,
  };
}

/**
 * Apply a manual override to a team's standing row and write an audit log
 */
export function applyStandingsOverride(
  tournamentId: string,
  teamId: string,
  adjustment: StandingsManualAdjustment,
  user: { id?: string; name: string; email?: string }
): {
  success: boolean;
  message: string;
  auditLog: StandingsOverrideAuditLog;
  standings: ReturnType<typeof calculateTournamentStandingsDeterministic>;
} {
  const db = getDb();
  if (!db.tournament_standings_overrides) db.tournament_standings_overrides = [];
  if (!db.tournament_standings_audit_logs) db.tournament_standings_audit_logs = [];

  const team = db.teams.find((t) => t.id === teamId);
  const existingOverrideIndex = db.tournament_standings_overrides.findIndex(
    (o: any) => o.tournamentId === tournamentId && o.teamId === teamId
  );

  const prevAdjustment = existingOverrideIndex >= 0 ? db.tournament_standings_overrides[existingOverrideIndex].adjustment : undefined;

  const newAdjustment: StandingsManualAdjustment = {
    pointsAdjustment: adjustment.pointsAdjustment !== undefined ? Number(adjustment.pointsAdjustment) : (prevAdjustment?.pointsAdjustment || 0),
    qualificationStatusOverride: adjustment.qualificationStatusOverride || prevAdjustment?.qualificationStatusOverride || 'AUTO',
    rankOverride: adjustment.rankOverride !== undefined ? Number(adjustment.rankOverride) : prevAdjustment?.rankOverride,
    reason: adjustment.reason || 'Admin manual adjustment',
    updatedBy: user.name,
    updatedByEmail: user.email,
    updatedAt: new Date().toISOString(),
    previousValue: prevAdjustment,
    newValue: adjustment,
  };

  if (existingOverrideIndex >= 0) {
    db.tournament_standings_overrides[existingOverrideIndex].adjustment = newAdjustment;
  } else {
    db.tournament_standings_overrides.push({
      tournamentId,
      groupId: team?.groupId,
      teamId,
      adjustment: newAdjustment,
    });
  }

  // Create dedicated audit log
  const auditLog: StandingsOverrideAuditLog = {
    id: crypto.randomUUID(),
    tournamentId,
    groupId: team?.groupId,
    teamId,
    teamName: team?.name || 'Unknown Team',
    field: adjustment.pointsAdjustment !== undefined ? 'POINTS' : (adjustment.qualificationStatusOverride ? 'QUALIFICATION_STATUS' : 'RANK'),
    previousValue: prevAdjustment || null,
    newValue: newAdjustment,
    reason: adjustment.reason || 'Manual override updated',
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    timestamp: new Date().toISOString(),
  };

  db.tournament_standings_audit_logs.unshift(auditLog);
  saveDatabase();

  const standings = calculateTournamentStandingsDeterministic(tournamentId);
  return {
    success: true,
    message: `Manual standings override applied for team "${team?.name || teamId}".`,
    auditLog,
    standings,
  };
}

/**
 * Update tournament competition configuration
 */
export function updateTournamentCompetitionConfig(
  tournamentId: string,
  config: Partial<TournamentCompetitionConfig>,
  user: { id?: string; name: string; email?: string }
): {
  success: boolean;
  message: string;
  config: TournamentCompetitionConfig;
  standings: ReturnType<typeof calculateTournamentStandingsDeterministic>;
} {
  const db = getDb();
  if (!db.tournament_competition_configs) db.tournament_competition_configs = [];

  const tournament = db.tournaments.find((t) => t.id === tournamentId);
  if (!tournament) {
    throw new Error('Tournament not found');
  }

  const existingIdx = db.tournament_competition_configs.findIndex((c: any) => c.tournamentId === tournamentId);
  const current = existingIdx >= 0 ? db.tournament_competition_configs[existingIdx] : getDefaultCompetitionConfig(tournament.sport, tournamentId);

  const updatedConfig: TournamentCompetitionConfig = {
    ...current,
    ...config,
    tournamentId,
    updatedAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    db.tournament_competition_configs[existingIdx] = updatedConfig;
  } else {
    db.tournament_competition_configs.push(updatedConfig);
  }

  // Sync back to tournament object for seamless backward compatibility
  tournament.competitionConfig = updatedConfig;
  if (config.format) tournament.competitionFormat = config.format;
  if (!tournament.rankingRules) tournament.rankingRules = {} as any;
  tournament.rankingRules.pointsForWin = updatedConfig.pointsForWin;
  tournament.rankingRules.pointsForDraw = updatedConfig.pointsForDraw;
  tournament.rankingRules.pointsForLoss = updatedConfig.pointsForLoss;
  tournament.rankingRules.pointsForTie = updatedConfig.pointsForTie;
  tournament.rankingRules.pointsForNoResult = updatedConfig.pointsForNoResult;
  tournament.rankingRules.pointsForAbandoned = updatedConfig.pointsForAbandoned;
  tournament.rankingRules.tieBreakerOrder = updatedConfig.tieBreakerOrder;
  tournament.updatedAt = new Date().toISOString();

  // Audit log
  if (!db.audit_logs) db.audit_logs = [];
  db.audit_logs.unshift({
    id: crypto.randomUUID(),
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    action: 'TOURNAMENT_UPDATE',
    details: `Updated Competition Configuration for tournament "${tournament.name}" (Format: ${updatedConfig.format}, Win Pts: ${updatedConfig.pointsForWin})`,
    timestamp: new Date().toISOString(),
  });

  saveDatabase();

  const standings = calculateTournamentStandingsDeterministic(tournamentId);
  return {
    success: true,
    message: 'Competition configuration saved successfully.',
    config: updatedConfig,
    standings,
  };
}

/**
 * Reset / remove manual standings override for a team
 */
export function removeStandingsOverride(
  tournamentId: string,
  teamId: string,
  user: { id?: string; name: string; email?: string }
): {
  success: boolean;
  message: string;
  auditLog: StandingsOverrideAuditLog;
  standings: ReturnType<typeof calculateTournamentStandingsDeterministic>;
} {
  const db = getDb();
  if (!db.tournament_standings_overrides) db.tournament_standings_overrides = [];
  if (!db.tournament_standings_audit_logs) db.tournament_standings_audit_logs = [];

  const team = db.teams.find((t) => t.id === teamId);
  const existingIdx = db.tournament_standings_overrides.findIndex(
    (o: any) => o.tournamentId === tournamentId && o.teamId === teamId
  );
  const prevAdjustment = existingIdx >= 0 ? db.tournament_standings_overrides[existingIdx].adjustment : null;

  if (existingIdx >= 0) {
    db.tournament_standings_overrides.splice(existingIdx, 1);
  }

  const auditLog: StandingsOverrideAuditLog = {
    id: crypto.randomUUID(),
    tournamentId,
    groupId: team?.groupId,
    teamId,
    teamName: team?.name || 'Unknown Team',
    field: 'RESET',
    previousValue: prevAdjustment,
    newValue: null,
    reason: 'Manual override removed / reset to automatic calculated standings',
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    timestamp: new Date().toISOString(),
  };

  db.tournament_standings_audit_logs.unshift(auditLog);
  saveDatabase();

  const standings = calculateTournamentStandingsDeterministic(tournamentId);
  return {
    success: true,
    message: `Manual standings override reset for team "${team?.name || teamId}".`,
    auditLog,
    standings,
  };
}

/**
 * Get Standings Audit Logs for a Tournament
 */
export function getTournamentStandingsAuditLogs(tournamentId: string): StandingsOverrideAuditLog[] {
  const db = getDb();
  return (db.tournament_standings_audit_logs || []).filter((log: any) => log.tournamentId === tournamentId);
}

/**
 * Get Standings Rules and Tie Breaker details for a tournament
 */
export function getTournamentStandingsRules(tournamentId: string) {
  const db = getDb();
  const tournament = db.tournaments.find((t) => t.id === tournamentId);
  const config = (db.tournament_competition_configs || []).find((c: any) => c.tournamentId === tournamentId) ||
    tournament?.competitionConfig ||
    getDefaultCompetitionConfig(tournament?.sport || 'CRICKET', tournamentId);

  return {
    tournamentId,
    sport: tournament?.sport,
    format: config.format,
    pointsRules: {
      win: config.pointsForWin,
      draw: config.pointsForDraw,
      tie: config.pointsForTie,
      loss: config.pointsForLoss,
      noResult: config.pointsForNoResult,
      abandoned: config.pointsForAbandoned,
    },
    tieBreakerOrder: config.tieBreakerOrder,
    qualificationSlotsPerGroup: config.qualificationSlotsPerGroup,
    directQualificationSlots: config.directQualificationSlots,
    manualPointsOverrideEnabled: config.manualPointsOverrideEnabled,
    qualificationTrackingEnabled: config.qualificationTrackingEnabled,
    customSportMetrics: config.customSportMetrics,
  };
}
