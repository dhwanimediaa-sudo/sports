import crypto from 'crypto';
import { getDb, saveDatabase } from '../db/database';
import {
  Tournament,
  Group,
  Team,
  Match,
  MatchStatus,
  SportType,
  TournamentStandingRow,
  TournamentGroupStandings,
  TournamentRankingRules,
  KnockoutBracket,
  KnockoutBracketRound,
  KnockoutMatchNode,
  TournamentStatisticsSummary,
  TournamentLeaderStat,
  TournamentAwardItem,
  FullMatchReport,
} from '../../src/types';

/**
 * DEFAULT RANKING RULES BY SPORT
 */
export function getDefaultRankingRules(sport: SportType): TournamentRankingRules {
  switch (sport) {
    case 'CRICKET':
      return {
        pointsForWin: 2,
        pointsForDraw: 1,
        pointsForLoss: 0,
        pointsForTie: 1,
        pointsForNoResult: 1,
        primaryTieBreaker: 'NRR',
        secondaryTieBreaker: 'WINS',
        tertiaryTieBreaker: 'HEAD_TO_HEAD',
      };
    case 'FOOTBALL':
    case 'HOCKEY':
      return {
        pointsForWin: 3,
        pointsForDraw: 1,
        pointsForLoss: 0,
        pointsForTie: 1,
        pointsForNoResult: 0,
        primaryTieBreaker: 'GOAL_DIFFERENCE',
        secondaryTieBreaker: 'GOALS_FOR',
        tertiaryTieBreaker: 'HEAD_TO_HEAD',
      };
    case 'VOLLEYBALL':
      return {
        pointsForWin: 3,
        pointsForDraw: 0,
        pointsForLoss: 0,
        pointsForTie: 0,
        pointsForNoResult: 0,
        primaryTieBreaker: 'SET_RATIO',
        secondaryTieBreaker: 'POINT_RATIO',
        tertiaryTieBreaker: 'WINS',
      };
    case 'KABADDI':
      return {
        pointsForWin: 5,
        pointsForDraw: 3,
        pointsForLoss: 0,
        pointsForTie: 3,
        pointsForNoResult: 0,
        primaryTieBreaker: 'POINT_DIFFERENCE',
        secondaryTieBreaker: 'GOALS_FOR', // Score for
        tertiaryTieBreaker: 'WINS',
      };
    case 'BASKETBALL':
      return {
        pointsForWin: 2,
        pointsForDraw: 1,
        pointsForLoss: 1,
        pointsForTie: 1,
        pointsForNoResult: 0,
        primaryTieBreaker: 'POINT_DIFFERENCE',
        secondaryTieBreaker: 'GOALS_FOR',
        tertiaryTieBreaker: 'HEAD_TO_HEAD',
      };
    case 'TENNIS':
    case 'BADMINTON':
    case 'TABLE_TENNIS':
      return {
        pointsForWin: 2,
        pointsForDraw: 0,
        pointsForLoss: 0,
        pointsForTie: 0,
        pointsForNoResult: 0,
        primaryTieBreaker: 'SET_RATIO',
        secondaryTieBreaker: 'POINT_DIFFERENCE',
        tertiaryTieBreaker: 'WINS',
      };
    default:
      return {
        pointsForWin: 3,
        pointsForDraw: 1,
        pointsForLoss: 0,
        pointsForTie: 1,
        pointsForNoResult: 0,
        primaryTieBreaker: 'GOAL_DIFFERENCE',
        secondaryTieBreaker: 'GOALS_FOR',
        tertiaryTieBreaker: 'WINS',
      };
  }
}

/**
 * Extract scores from completed match across all sports
 */
export function extractMatchScore(match: Match): {
  isCompleted: boolean;
  scoreA: number;
  scoreB: number;
  winnerTeamId?: string;
  isDraw: boolean;
  isNoResult: boolean;
  oversA?: number;
  oversB?: number;
  runsA?: number;
  runsB?: number;
  setsWonA?: number;
  setsWonB?: number;
  pointsWonA?: number;
  pointsWonB?: number;
  detailSummary: string;
} {
  const db = getDb();
  const isCompleted = match.status === 'COMPLETED';
  const isCancelled = match.status === 'CANCELLED';

  if (isCancelled) {
    return {
      isCompleted: false,
      scoreA: 0,
      scoreB: 0,
      isDraw: false,
      isNoResult: true,
      detailSummary: 'Cancelled',
    };
  }

  // Check match_reports first if available
  const report = db.match_reports?.find((r) => r.matchId === match.id);

  if (match.sport === 'CRICKET') {
    const inningsList = (db.match_innings || []).filter((inn: any) => inn.matchId === match.id);
    let runsA = 0;
    let runsB = 0;
    let ballsA = 0;
    let ballsB = 0;

    inningsList.forEach((inn: any) => {
      if (inn.battingTeamId === match.teamAId) {
        runsA += inn.totalRuns || 0;
        ballsA += inn.totalBalls || inn.overs * 6 || 0;
      } else if (inn.battingTeamId === match.teamBId) {
        runsB += inn.totalRuns || 0;
        ballsB += inn.totalBalls || inn.overs * 6 || 0;
      }
    });

    const oversA = ballsA > 0 ? (Math.floor(ballsA / 6) + (ballsA % 6) / 6) : 0;
    const oversB = ballsB > 0 ? (Math.floor(ballsB / 6) + (ballsB % 6) / 6) : 0;

    let winnerTeamId: string | undefined;
    let isDraw = false;
    if (isCompleted) {
      if (runsA > runsB) winnerTeamId = match.teamAId;
      else if (runsB > runsA) winnerTeamId = match.teamBId;
      else isDraw = true;
    }

    return {
      isCompleted,
      scoreA: runsA,
      scoreB: runsB,
      winnerTeamId,
      isDraw,
      isNoResult: false,
      oversA,
      oversB,
      runsA,
      runsB,
      detailSummary: `${runsA} vs ${runsB}`,
    };
  }

  if (match.sport === 'FOOTBALL') {
    const events = (db.football_scoring_events || []).filter((e: any) => e.matchId === match.id);
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
    let isDraw = false;
    if (isCompleted) {
      if (goalsA > goalsB) winnerTeamId = match.teamAId;
      else if (goalsB > goalsA) winnerTeamId = match.teamBId;
      else isDraw = true;
    }

    return {
      isCompleted,
      scoreA: goalsA,
      scoreB: goalsB,
      winnerTeamId,
      isDraw,
      isNoResult: false,
      detailSummary: `${goalsA} - ${goalsB}`,
    };
  }

  if (match.sport === 'HOCKEY') {
    const events = (db.hockey_scoring_events || []).filter((e: any) => e.matchId === match.id);
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
    let isDraw = false;
    if (isCompleted) {
      if (goalsA > goalsB) winnerTeamId = match.teamAId;
      else if (goalsB > goalsA) winnerTeamId = match.teamBId;
      else isDraw = true;
    }

    return {
      isCompleted,
      scoreA: goalsA,
      scoreB: goalsB,
      winnerTeamId,
      isDraw,
      isNoResult: false,
      detailSummary: `${goalsA} - ${goalsB}`,
    };
  }

  if (match.sport === 'VOLLEYBALL') {
    const sets = (db.volleyball_sets || []).filter((s: any) => s.matchId === match.id);
    let setsWonA = 0;
    let setsWonB = 0;
    let pointsWonA = 0;
    let pointsWonB = 0;

    sets.forEach((s: any) => {
      pointsWonA += s.teamAScore || 0;
      pointsWonB += s.teamBScore || 0;
      if (s.isCompleted) {
        if (s.winnerTeamId === match.teamAId || (s.teamAScore > s.teamBScore)) setsWonA++;
        else if (s.winnerTeamId === match.teamBId || (s.teamBScore > s.teamAScore)) setsWonB++;
      }
    });

    let winnerTeamId: string | undefined;
    if (isCompleted) {
      if (setsWonA > setsWonB) winnerTeamId = match.teamAId;
      else if (setsWonB > setsWonA) winnerTeamId = match.teamBId;
    }

    return {
      isCompleted,
      scoreA: setsWonA,
      scoreB: setsWonB,
      setsWonA,
      setsWonB,
      pointsWonA,
      pointsWonB,
      winnerTeamId,
      isDraw: false,
      isNoResult: false,
      detailSummary: `${setsWonA} - ${setsWonB} sets (${pointsWonA}-${pointsWonB} pts)`,
    };
  }

  if (match.sport === 'KABADDI') {
    const raids = (db.kabaddi_raids || []).filter((r: any) => r.matchId === match.id);
    let ptsA = 0;
    let ptsB = 0;

    raids.forEach((r: any) => {
      if (r.raidingTeamId === match.teamAId) {
        ptsA += (r.raidPoints || 0) + (r.bonusPoint ? 1 : 0);
        ptsB += r.defenderPoints || 0;
      } else {
        ptsB += (r.raidPoints || 0) + (r.bonusPoint ? 1 : 0);
        ptsA += r.defenderPoints || 0;
      }
    });

    let winnerTeamId: string | undefined;
    let isDraw = false;
    if (isCompleted) {
      if (ptsA > ptsB) winnerTeamId = match.teamAId;
      else if (ptsB > ptsA) winnerTeamId = match.teamBId;
      else isDraw = true;
    }

    return {
      isCompleted,
      scoreA: ptsA,
      scoreB: ptsB,
      winnerTeamId,
      isDraw,
      isNoResult: false,
      detailSummary: `${ptsA} - ${ptsB}`,
    };
  }

  if (match.sport === 'BASKETBALL') {
    const events = (db.basketball_scoring_events || []).filter((e: any) => e.matchId === match.id);
    let ptsA = 0;
    let ptsB = 0;

    events.forEach((e: any) => {
      if (e.teamId === match.teamAId) ptsA += e.points || 0;
      else if (e.teamId === match.teamBId) ptsB += e.points || 0;
    });

    let winnerTeamId: string | undefined;
    let isDraw = false;
    if (isCompleted) {
      if (ptsA > ptsB) winnerTeamId = match.teamAId;
      else if (ptsB > ptsA) winnerTeamId = match.teamBId;
      else isDraw = true;
    }

    return {
      isCompleted,
      scoreA: ptsA,
      scoreB: ptsB,
      winnerTeamId,
      isDraw,
      isNoResult: false,
      detailSummary: `${ptsA} - ${ptsB}`,
    };
  }

  if (match.sport === 'TENNIS' || match.sport === 'BADMINTON' || match.sport === 'TABLE_TENNIS') {
    let setsA = 0;
    let setsB = 0;
    let ptsA = 0;
    let ptsB = 0;

    let events: any[] = [];
    if (match.sport === 'TENNIS') events = (db.tennis_scoring_events || []).filter((e: any) => e.matchId === match.id);
    else if (match.sport === 'BADMINTON') events = (db.badminton_scoring_events || []).filter((e: any) => e.matchId === match.id);
    else if (match.sport === 'TABLE_TENNIS') events = (db.table_tennis_scoring_events || []).filter((e: any) => e.matchId === match.id);

    events.forEach((e: any) => {
      if (e.pointWinnerTeamId === match.teamAId) ptsA++;
      else if (e.pointWinnerTeamId === match.teamBId) ptsB++;
    });

    // Check report if present
    if (report && report.reportData) {
      setsA = report.reportData.setsWonA || 0;
      setsB = report.reportData.setsWonB || 0;
    }

    let winnerTeamId: string | undefined;
    if (isCompleted) {
      if (setsA > setsB || ptsA > ptsB) winnerTeamId = match.teamAId;
      else if (setsB > setsA || ptsB > ptsA) winnerTeamId = match.teamBId;
    }

    return {
      isCompleted,
      scoreA: setsA || ptsA,
      scoreB: setsB || ptsB,
      setsWonA: setsA,
      setsWonB: setsB,
      pointsWonA: ptsA,
      pointsWonB: ptsB,
      winnerTeamId,
      isDraw: false,
      isNoResult: false,
      detailSummary: `${setsA || ptsA} - ${setsB || ptsB}`,
    };
  }

  // Custom sport or fallback
  const customEvents = (db.custom_scoring_events || []).filter((e: any) => e.matchId === match.id);
  let cScoreA = 0;
  let cScoreB = 0;

  customEvents.forEach((e: any) => {
    if (e.teamId === match.teamAId) cScoreA += e.points || 0;
    else if (e.teamId === match.teamBId) cScoreB += e.points || 0;
  });

  let winnerTeamId: string | undefined;
  let isDraw = false;
  if (isCompleted) {
    if (cScoreA > cScoreB) winnerTeamId = match.teamAId;
    else if (cScoreB > cScoreA) winnerTeamId = match.teamBId;
    else isDraw = true;
  }

  return {
    isCompleted,
    scoreA: cScoreA,
    scoreB: cScoreB,
    winnerTeamId,
    isDraw,
    isNoResult: false,
    detailSummary: `${cScoreA} - ${cScoreB}`,
  };
}

/**
 * Calculate dynamic tournament points tables / standings
 */
export function calculateTournamentStandings(tournamentId: string): {
  groups: TournamentGroupStandings[];
  overall: TournamentStandingRow[];
} {
  const db = getDb();
  const tournament = db.tournaments.find((t) => t.id === tournamentId);
  if (!tournament) return { groups: [], overall: [] };

  const groups = db.groups.filter((g) => g.tournamentId === tournamentId);
  const teams = db.teams.filter((tm) => tm.tournamentId === tournamentId);
  const matches = db.matches.filter((m) => m.tournamentId === tournamentId);

  const rules: TournamentRankingRules = tournament.rankingRules || getDefaultRankingRules(tournament.sport);
  const qualificationRules = tournament.qualificationRules || [];

  // Group by group ID, or create a default group if none
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
  const allStandingRows: TournamentStandingRow[] = [];

  effectiveGroups.forEach((grp) => {
    const grpTeams = grp.id === 'ALL' ? teams : teams.filter((tm) => tm.groupId === grp.id);
    const grpMatches = grp.id === 'ALL' ? matches : matches.filter((m) => m.groupId === grp.id);
    const qualRule = qualificationRules.find((q) => q.groupId === grp.id);
    const qualifyCutoff = qualRule ? qualRule.qualifyTopCount : (tournament.formatConfig?.teamsAdvancingPerGroup || 2);

    // Map each team to accumulator
    const rowsMap = new Map<string, {
      team: Team;
      played: number;
      won: number;
      drawn: number;
      lost: number;
      noResult: number;
      points: number;
      forMetric: number;
      againstMetric: number;
      // Cricket specific
      totalRunsScored: number;
      totalOversFaced: number;
      totalRunsConceded: number;
      totalOversBowled: number;
      // Volleyball/Tennis specific
      setsWon: number;
      setsLost: number;
      pointsWon: number;
      pointsLost: number;
      form: ('W' | 'L' | 'D' | 'NR')[];
      headToHeadWinsAgainst: Map<string, number>;
    }>();

    grpTeams.forEach((tm) => {
      rowsMap.set(tm.id, {
        team: tm,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        noResult: 0,
        points: 0,
        forMetric: 0,
        againstMetric: 0,
        totalRunsScored: 0,
        totalOversFaced: 0,
        totalRunsConceded: 0,
        totalOversBowled: 0,
        setsWon: 0,
        setsLost: 0,
        pointsWon: 0,
        pointsLost: 0,
        form: [],
        headToHeadWinsAgainst: new Map<string, number>(),
      });
    });

    // Process matches
    grpMatches.forEach((match) => {
      if (match.status !== 'COMPLETED' && match.status !== 'LIVE') return;

      const scoreInfo = extractMatchScore(match);
      const accA = rowsMap.get(match.teamAId);
      const accB = rowsMap.get(match.teamBId);

      if (accA && accB && (scoreInfo.isCompleted || match.status === 'COMPLETED')) {
        accA.played++;
        accB.played++;

        // Generic metrics
        accA.forMetric += scoreInfo.scoreA;
        accA.againstMetric += scoreInfo.scoreB;
        accB.forMetric += scoreInfo.scoreB;
        accB.againstMetric += scoreInfo.scoreA;

        // Cricket
        if (scoreInfo.runsA !== undefined && scoreInfo.runsB !== undefined) {
          accA.totalRunsScored += scoreInfo.runsA;
          accA.totalOversFaced += scoreInfo.oversA || 0;
          accA.totalRunsConceded += scoreInfo.runsB;
          accA.totalOversBowled += scoreInfo.oversB || 0;

          accB.totalRunsScored += scoreInfo.runsB;
          accB.totalOversFaced += scoreInfo.oversB || 0;
          accB.totalRunsConceded += scoreInfo.runsA;
          accB.totalOversBowled += scoreInfo.oversA || 0;
        }

        // Volleyball / Tennis
        if (scoreInfo.setsWonA !== undefined && scoreInfo.setsWonB !== undefined) {
          accA.setsWon += scoreInfo.setsWonA;
          accA.setsLost += scoreInfo.setsWonB;
          accA.pointsWon += scoreInfo.pointsWonA || 0;
          accA.pointsLost += scoreInfo.pointsWonB || 0;

          accB.setsWon += scoreInfo.setsWonB;
          accB.setsLost += scoreInfo.setsWonA;
          accB.pointsWon += scoreInfo.pointsWonB || 0;
          accB.pointsLost += scoreInfo.pointsWonA || 0;
        }

        if (scoreInfo.isNoResult) {
          accA.noResult++;
          accB.noResult++;
          accA.points += rules.pointsForNoResult;
          accB.points += rules.pointsForNoResult;
          accA.form.push('NR');
          accB.form.push('NR');
        } else if (scoreInfo.isDraw) {
          accA.drawn++;
          accB.drawn++;
          accA.points += rules.pointsForDraw;
          accB.points += rules.pointsForDraw;
          accA.form.push('D');
          accB.form.push('D');
        } else if (scoreInfo.winnerTeamId === match.teamAId) {
          accA.won++;
          accB.lost++;
          accA.points += rules.pointsForWin;
          accB.points += rules.pointsForLoss;
          accA.form.push('W');
          accB.form.push('L');
          accA.headToHeadWinsAgainst.set(match.teamBId, (accA.headToHeadWinsAgainst.get(match.teamBId) || 0) + 1);
        } else if (scoreInfo.winnerTeamId === match.teamBId) {
          accB.won++;
          accA.lost++;
          accB.points += rules.pointsForWin;
          accA.points += rules.pointsForLoss;
          accB.form.push('W');
          accA.form.push('L');
          accB.headToHeadWinsAgainst.set(match.teamAId, (accB.headToHeadWinsAgainst.get(match.teamAId) || 0) + 1);
        }
      }
    });

    // Build raw rows
    const rawRows: Array<TournamentStandingRow & {
      totalRunsScored: number;
      totalOversFaced: number;
      totalRunsConceded: number;
      totalOversBowled: number;
      setsWon: number;
      setsLost: number;
      pointsWon: number;
      pointsLost: number;
      headToHeadWinsAgainst: Map<string, number>;
    }> = [];

    rowsMap.forEach((acc) => {
      let diffMetric = 0;
      let diffDisplay = '0';

      if (tournament.sport === 'CRICKET') {
        const teamRR = acc.totalOversFaced > 0 ? (acc.totalRunsScored / acc.totalOversFaced) : 0;
        const oppRR = acc.totalOversBowled > 0 ? (acc.totalRunsConceded / acc.totalOversBowled) : 0;
        diffMetric = Number((teamRR - oppRR).toFixed(3));
        diffDisplay = (diffMetric >= 0 ? `+${diffMetric.toFixed(3)}` : diffMetric.toFixed(3));
      } else if (tournament.sport === 'VOLLEYBALL' || tournament.sport === 'TENNIS' || tournament.sport === 'BADMINTON' || tournament.sport === 'TABLE_TENNIS') {
        diffMetric = acc.setsWon - acc.setsLost;
        const ratio = acc.setsLost > 0 ? (acc.setsWon / acc.setsLost).toFixed(2) : (acc.setsWon > 0 ? `${acc.setsWon}.00` : '0.00');
        diffDisplay = `${acc.setsWon}-${acc.setsLost} (R: ${ratio})`;
      } else {
        diffMetric = acc.forMetric - acc.againstMetric;
        diffDisplay = (diffMetric >= 0 ? `+${diffMetric}` : `${diffMetric}`);
      }

      // Last 5 matches form
      const recentForm = acc.form.slice(-5);

      rawRows.push({
        rank: 0,
        teamId: acc.team.id,
        teamName: acc.team.name,
        teamShortName: acc.team.shortName || acc.team.code,
        teamCode: acc.team.code,
        teamLogoUrl: acc.team.logoUrl,
        groupId: grp.id === 'ALL' ? undefined : grp.id,
        groupName: grp.name,
        played: acc.played,
        won: acc.won,
        drawn: acc.drawn,
        lost: acc.lost,
        noResult: acc.noResult,
        points: acc.points,
        forMetric: acc.forMetric,
        againstMetric: acc.againstMetric,
        differenceMetric: diffMetric,
        differenceDisplay: diffDisplay,
        form: recentForm,
        qualificationStatus: 'PENDING',
        totalRunsScored: acc.totalRunsScored,
        totalOversFaced: acc.totalOversFaced,
        totalRunsConceded: acc.totalRunsConceded,
        totalOversBowled: acc.totalOversBowled,
        setsWon: acc.setsWon,
        setsLost: acc.setsLost,
        pointsWon: acc.pointsWon,
        pointsLost: acc.pointsLost,
        headToHeadWinsAgainst: acc.headToHeadWinsAgainst,
      });
    });

    // Sort rows based on Ranking Rules
    rawRows.sort((a, b) => {
      // 1. Points
      if (b.points !== a.points) return b.points - a.points;

      // 2. Primary Tie Breaker
      if (rules.primaryTieBreaker === 'NRR' || rules.primaryTieBreaker === 'GOAL_DIFFERENCE' || rules.primaryTieBreaker === 'POINT_DIFFERENCE' || rules.primaryTieBreaker === 'SET_RATIO') {
        if (b.differenceMetric !== a.differenceMetric) return b.differenceMetric - a.differenceMetric;
      } else if (rules.primaryTieBreaker === 'WINS') {
        if (b.won !== a.won) return b.won - a.won;
      } else if (rules.primaryTieBreaker === 'GOALS_FOR' || rules.primaryTieBreaker === 'POINT_RATIO') {
        if (b.forMetric !== a.forMetric) return b.forMetric - a.forMetric;
      }

      // 3. Wins
      if (b.won !== a.won) return b.won - a.won;

      // 4. Head to Head
      const aH2H = a.headToHeadWinsAgainst.get(b.teamId) || 0;
      const bH2H = b.headToHeadWinsAgainst.get(a.teamId) || 0;
      if (aH2H !== bH2H) return bH2H - aH2H;

      // 5. Total Scored
      if (b.forMetric !== a.forMetric) return b.forMetric - a.forMetric;

      // 6. Name alphabetical
      return a.teamName.localeCompare(b.teamName);
    });

    // Assign rank and qualification status
    const completedMatchesInGroup = grpMatches.filter((m) => m.status === 'COMPLETED').length;
    const isGroupCompleted = grpMatches.length > 0 && completedMatchesInGroup === grpMatches.length;

    const finalRows: TournamentStandingRow[] = rawRows.map((row, idx) => {
      const rank = idx + 1;
      let qualStatus: 'QUALIFIED' | 'ELIMINATED' | 'PENDING' | 'MANUAL_QUALIFIED' = 'PENDING';

      // Check manual override
      const manualOverride = qualRule?.manualOverrides?.[row.teamId];
      if (manualOverride === 'QUALIFIED') {
        qualStatus = 'MANUAL_QUALIFIED';
      } else if (manualOverride === 'ELIMINATED') {
        qualStatus = 'ELIMINATED';
      } else {
        if (isGroupCompleted) {
          qualStatus = rank <= qualifyCutoff ? 'QUALIFIED' : 'ELIMINATED';
        } else if (rank <= qualifyCutoff && row.played > 0) {
          qualStatus = 'QUALIFIED'; // Leading qualification spot
        } else {
          qualStatus = 'PENDING';
        }
      }

      return {
        rank,
        teamId: row.teamId,
        teamName: row.teamName,
        teamShortName: row.teamShortName,
        teamCode: row.teamCode,
        teamLogoUrl: row.teamLogoUrl,
        groupId: row.groupId,
        groupName: row.groupName,
        played: row.played,
        won: row.won,
        drawn: row.drawn,
        lost: row.lost,
        noResult: row.noResult,
        points: row.points,
        forMetric: row.forMetric,
        againstMetric: row.againstMetric,
        differenceMetric: row.differenceMetric,
        differenceDisplay: row.differenceDisplay,
        form: row.form,
        qualificationStatus: qualStatus,
      };
    });

    groupStandingsList.push({
      groupId: grp.id,
      groupName: grp.name,
      groupCode: grp.code,
      teamsCount: grpTeams.length,
      matchesPlayedCount: completedMatchesInGroup,
      totalMatchesCount: grpMatches.length,
      isCompleted: isGroupCompleted,
      rows: finalRows,
    });

    allStandingRows.push(...finalRows);
  });

  return {
    groups: groupStandingsList,
    overall: allStandingRows,
  };
}

/**
 * ROUND ROBIN FIXTURE GENERATOR (Circle Method / Berger Tables)
 */
export interface GenerateFixturesOptions {
  tournamentId: string;
  groupId?: string; // Optional: generate for specific group or all
  type: 'SINGLE_ROUND_ROBIN' | 'DOUBLE_ROUND_ROBIN';
  startDate: string; // YYYY-MM-DD
  startTime?: string; // HH:mm (e.g. 09:00)
  matchIntervalMinutes?: number; // e.g. 120 mins
  daysBetweenRounds?: number; // e.g. 1 day
  venues?: string[];
  grounds?: string[];
  customMatchConfig?: Record<string, any>;
  clearExistingDraftFixtures?: boolean;
}

export function generateRoundRobinFixtures(options: GenerateFixturesOptions): {
  createdMatches: Match[];
  message: string;
} {
  const db = getDb();
  const tournament = db.tournaments.find((t) => t.id === options.tournamentId);
  if (!tournament) throw new Error('Tournament not found');

  const groups = options.groupId && options.groupId !== 'ALL'
    ? db.groups.filter((g) => g.id === options.groupId && g.tournamentId === tournament.id)
    : db.groups.filter((g) => g.tournamentId === tournament.id);

  const effectiveGroups = groups.length > 0 ? groups : [
    {
      id: 'UNASSIGNED',
      tournamentId: tournament.id,
      name: 'Main Tournament',
      code: 'MAIN',
      maxTeams: 100,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  if (options.clearExistingDraftFixtures) {
    db.matches = db.matches.filter(
      (m) => !(m.tournamentId === tournament.id && (m.status === 'DRAFT' || m.status === 'SCHEDULED'))
    );
  }

  const createdMatches: Match[] = [];
  let globalMatchCounter = db.matches.filter((m) => m.tournamentId === tournament.id).length + 1;

  effectiveGroups.forEach((grp) => {
    const grpTeams = grp.id === 'UNASSIGNED'
      ? db.teams.filter((tm) => tm.tournamentId === tournament.id)
      : db.teams.filter((tm) => tm.groupId === grp.id);

    if (grpTeams.length < 2) return;

    // Team list for circle method
    const teamList = [...grpTeams];
    const hasDummy = teamList.length % 2 !== 0;
    if (hasDummy) {
      teamList.push({ id: '__BYE__', name: 'BYE', tournamentId: tournament.id, createdAt: '', updatedAt: '' } as Team);
    }

    const numTeams = teamList.length;
    const numRounds = numTeams - 1;
    const matchesPerRound = numTeams / 2;

    const legs = options.type === 'DOUBLE_ROUND_ROBIN' ? 2 : 1;

    // Base date parsing
    const baseDate = new Date(options.startDate || new Date().toISOString().split('T')[0]);
    const intervalMins = options.matchIntervalMinutes || 120;
    const daysBetween = options.daysBetweenRounds !== undefined ? options.daysBetweenRounds : 1;
    const venuesList = (options.venues && options.venues.length > 0) ? options.venues : [tournament.location || tournament.venue || 'Main Stadium'];
    const groundsList = (options.grounds && options.grounds.length > 0) ? options.grounds : ['Ground 1'];

    let venueIndex = 0;
    let groundIndex = 0;

    for (let leg = 0; leg < legs; leg++) {
      // Rotation array
      const rotating = [...teamList];

      for (let round = 0; round < numRounds; round++) {
        const roundNumber = leg * numRounds + round + 1;
        const roundTitle = legs === 2 ? `Leg ${leg + 1} - Round ${round + 1}` : `Round ${round + 1}`;

        // Compute date for this round
        const roundDate = new Date(baseDate);
        roundDate.setDate(roundDate.getDate() + (roundNumber - 1) * daysBetween);
        const dateStr = roundDate.toISOString().split('T')[0];

        let timeOffsetMinutes = 0;
        const [startH, startM] = (options.startTime || '09:00').split(':').map(Number);

        for (let matchIdx = 0; matchIdx < matchesPerRound; matchIdx++) {
          let home = rotating[matchIdx];
          let away = rotating[numTeams - 1 - matchIdx];

          // Reverse on leg 2 or alternate to balance home/away
          if (leg === 1 || (round % 2 === 1 && matchIdx === 0)) {
            const tmp = home;
            home = away;
            away = tmp;
          }

          // Skip byes
          if (home.id === '__BYE__' || away.id === '__BYE__') continue;

          // Compute match time
          const matchTotalMinutes = (startH || 9) * 60 + (startM || 0) + timeOffsetMinutes;
          const matchH = Math.floor(matchTotalMinutes / 60) % 24;
          const matchM = matchTotalMinutes % 60;
          const timeStr = `${matchH.toString().padStart(2, '0')}:${matchM.toString().padStart(2, '0')}`;
          timeOffsetMinutes += intervalMins;

          const chosenVenue = venuesList[venueIndex % venuesList.length];
          const chosenGround = groundsList[groundIndex % groundsList.length];
          venueIndex++;
          groundIndex++;

          // Inherit sport specific config
          const newMatch: Match = {
            id: crypto.randomUUID(),
            tournamentId: tournament.id,
            groupId: grp.id === 'UNASSIGNED' ? '' : grp.id,
            sport: tournament.sport,
            name: `${home.name} vs ${away.name}`,
            matchNumber: `M${globalMatchCounter.toString().padStart(2, '0')}`,
            round: 'Group Stage',
            teamAId: home.id,
            teamBId: away.id,
            date: dateStr,
            time: timeStr,
            venue: chosenVenue,
            ground: chosenGround,
            description: `${grp.name} - ${roundTitle}`,
            status: 'SCHEDULED',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...options.customMatchConfig,
          };

          // Apply default sport config if not specified
          applyDefaultSportConfig(newMatch, tournament);

          db.matches.push(newMatch);
          createdMatches.push(newMatch);
          globalMatchCounter++;
        }

        // Rotate for next round: keep first fixed, rotate others
        const fixed = rotating[0];
        const last = rotating[rotating.length - 1];
        const middle = rotating.slice(1, rotating.length - 1);
        rotating.splice(0, rotating.length, fixed, last, ...middle);
      }
    }
  });

  saveDatabase();
  return {
    createdMatches,
    message: `Generated ${createdMatches.length} round robin fixtures successfully.`,
  };
}

/**
 * Apply default sport configuration to a match
 */
function applyDefaultSportConfig(match: Match, tournament: Tournament) {
  const sport = tournament.sport;
  const cfg = tournament.formatConfig?.defaultMatchConfig || {};

  switch (sport) {
    case 'CRICKET':
      match.cricketConfig = {
        matchType: cfg.matchType || 'T20',
        overs: cfg.overs || 20,
        powerplaySettings: cfg.powerplaySettings || '1-6',
      };
      break;
    case 'FOOTBALL':
      match.footballConfig = {
        halfDuration: cfg.halfDuration || 45,
        extraTimeEnabled: cfg.extraTimeEnabled || false,
        penaltyShootoutEnabled: cfg.penaltyShootoutEnabled || true,
      };
      break;
    case 'VOLLEYBALL':
      match.volleyballConfig = {
        format: cfg.format || 'Best of 3',
        pointsPerSet: cfg.pointsPerSet || 25,
        decidingSetPoints: cfg.decidingSetPoints || 15,
      };
      break;
    case 'KABADDI':
      match.kabaddiConfig = {
        firstHalfDuration: cfg.firstHalfDuration || 20,
        secondHalfDuration: cfg.secondHalfDuration || 20,
        raidDuration: cfg.raidDuration || 30,
      };
      break;
    case 'HOCKEY':
      match.hockeyConfig = {
        periods: cfg.periods || 4,
        periodDuration: cfg.periodDuration || 15,
        penaltyShootoutEnabled: cfg.penaltyShootoutEnabled || true,
      };
      break;
    case 'BASKETBALL':
      match.basketballConfig = {
        quarters: cfg.quarters || 4,
        quarterDuration: cfg.quarterDuration || 10,
      };
      break;
    case 'TENNIS':
      match.tennisConfig = {
        matchType: cfg.matchType || 'SINGLES',
        format: cfg.format || 'BEST_OF_3',
        setRules: cfg.setRules || 'STANDARD',
        gamesToWinSet: cfg.gamesToWinSet || 6,
        setAdvantage: true,
        tiebreakAtGames: 6,
        tiebreakPoints: 7,
        finalSetRule: 'NORMAL',
        surface: cfg.surface || 'HARD',
      };
      break;
    case 'BADMINTON':
      match.badmintonConfig = {
        matchType: cfg.matchType || 'SINGLES',
        format: cfg.format || 'BEST_OF_3',
        pointsPerGame: cfg.pointsPerGame || 21,
        pointDifference: 2,
        maxPoints: 30,
      };
      break;
    case 'TABLE_TENNIS':
      match.tableTennisConfig = {
        matchType: cfg.matchType || 'SINGLES',
        format: cfg.format || 'BEST_OF_5',
        pointsPerGame: cfg.pointsPerGame || 11,
        pointDifference: 2,
        serviceRotation: 2,
        deuceServiceRotation: 1,
      };
      break;
  }
}

/**
 * AUTOMATIC KNOCKOUT BRACKET GENERATOR & SYNCHRONIZER
 * Re-exported from standalone tournamentBracketEngine
 */
export {
  generateKnockoutBracket,
  syncKnockoutBracket,
  seedQualifiedTeams,
  advanceWinner,
  resolveTie,
  resolveBye,
  recalculateBracket,
  declareChampion,
  reopenTournament,
  validateBracket,
  getBracketState,
  getChampionshipSummary,
} from './tournamentBracketEngine';
export type { GenerateKnockoutOptions } from './tournamentBracketEngine';


/**
 * CALCULATE SPORT-SPECIFIC TOURNAMENT STATISTICS & TOP PERFORMERS
 */
export function calculateTournamentStatistics(tournamentId: string): TournamentStatisticsSummary {
  const db = getDb();
  const tournament = db.tournaments.find((t) => t.id === tournamentId);
  const matches = db.matches.filter((m) => m.tournamentId === tournamentId);
  const teams = db.teams.filter((tm) => tm.tournamentId === tournamentId);
  const teamIds = new Set(teams.map((t) => t.id));
  const players = db.players.filter((p) => p.tournamentId === tournamentId || (p.teamId && teamIds.has(p.teamId)));

  const completedMatches = matches.filter((m) => m.status === 'COMPLETED').length;
  const liveMatches = matches.filter((m) => m.status === 'LIVE').length;
  const upcomingMatches = matches.filter((m) => m.status === 'SCHEDULED' || m.status === 'READY' || m.status === 'DRAFT').length;

  let totalGoalsOrRuns = 0;
  const topPerformersMap: Record<string, TournamentLeaderStat[]> = {};

  // Team win rate summary
  const standings = calculateTournamentStandings(tournamentId);
  const teamStats = standings.overall.map((r) => ({
    teamId: r.teamId,
    teamName: r.teamName,
    teamLogoUrl: r.teamLogoUrl,
    matches: r.played,
    wins: r.won,
    scoreFor: r.forMetric,
    scoreAgainst: r.againstMetric,
    winRate: r.played > 0 ? `${((r.won / r.played) * 100).toFixed(1)}%` : '0%',
  }));

  if (tournament?.sport === 'CRICKET') {
    // Collect from cricket innings and events
    const runsMap = new Map<string, { player: any; runs: number; fours: number; sixes: number; balls: number }>();
    const wicketsMap = new Map<string, { player: any; wickets: number; runsConceded: number; overs: number }>();

    (db.match_reports || []).filter((r) => matches.some((m) => m.id === r.matchId)).forEach((rep) => {
      const data = rep.reportData;
      if (!data) return;

      (data.battingPerformances || []).forEach((bp: any) => {
        const ply = players.find((p) => p.id === bp.playerId) || { id: bp.playerId, name: bp.playerName, teamId: bp.teamId };
        const cur = runsMap.get(bp.playerId) || { player: ply, runs: 0, fours: 0, sixes: 0, balls: 0 };
        cur.runs += bp.runs || 0;
        cur.fours += bp.fours || 0;
        cur.sixes += bp.sixes || 0;
        cur.balls += bp.ballsFaced || 0;
        totalGoalsOrRuns += bp.runs || 0;
        runsMap.set(bp.playerId, cur);
      });

      (data.bowlingPerformances || []).forEach((bp: any) => {
        const ply = players.find((p) => p.id === bp.playerId) || { id: bp.playerId, name: bp.playerName, teamId: bp.teamId };
        const cur = wicketsMap.get(bp.playerId) || { player: ply, wickets: 0, runsConceded: 0, overs: 0 };
        cur.wickets += bp.wickets || 0;
        cur.runsConceded += bp.runsConceded || 0;
        cur.overs += bp.overs || 0;
        wicketsMap.set(bp.playerId, cur);
      });
    });

    const topRuns: TournamentLeaderStat[] = Array.from(runsMap.values())
      .sort((a, b) => b.runs - a.runs)
      .slice(0, 5)
      .map((item, idx) => {
        const tm = teams.find((t) => t.id === item.player.teamId);
        const sr = item.balls > 0 ? ((item.runs / item.balls) * 100).toFixed(1) : '0.0';
        return {
          id: `run_${item.player.id}`,
          playerId: item.player.id,
          playerName: item.player.name,
          teamId: item.player.teamId,
          teamName: tm?.name || 'Team',
          teamLogoUrl: tm?.logoUrl,
          photoUrl: item.player.photoUrl,
          jerseyNumber: item.player.jerseyNumber,
          statLabel: 'Total Runs',
          statValue: item.runs,
          secondaryStat: `SR: ${sr} | 4s: ${item.fours} | 6s: ${item.sixes}`,
          rank: idx + 1,
        };
      });

    const topWickets: TournamentLeaderStat[] = Array.from(wicketsMap.values())
      .sort((a, b) => b.wickets - a.wickets)
      .slice(0, 5)
      .map((item, idx) => {
        const tm = teams.find((t) => t.id === item.player.teamId);
        const econ = item.overs > 0 ? (item.runsConceded / item.overs).toFixed(2) : '0.00';
        return {
          id: `wkt_${item.player.id}`,
          playerId: item.player.id,
          playerName: item.player.name,
          teamId: item.player.teamId,
          teamName: tm?.name || 'Team',
          teamLogoUrl: tm?.logoUrl,
          photoUrl: item.player.photoUrl,
          jerseyNumber: item.player.jerseyNumber,
          statLabel: 'Wickets',
          statValue: item.wickets,
          secondaryStat: `Econ: ${econ} | Runs: ${item.runsConceded}`,
          rank: idx + 1,
        };
      });

    topPerformersMap['TOP_RUN_SCORERS'] = topRuns;
    topPerformersMap['MOST_WICKETS'] = topWickets;
  } else if (tournament?.sport === 'FOOTBALL' || tournament?.sport === 'HOCKEY') {
    const goalsMap = new Map<string, { player: any; goals: number; assists: number }>();
    const cleanSheetsMap = new Map<string, { player: any; cleanSheets: number; saves: number }>();

    (db.football_scoring_events || []).filter((e: any) => matches.some((m) => m.id === e.matchId)).forEach((e: any) => {
      if (e.eventType === 'GOAL' && e.playerId) {
        const ply = players.find((p) => p.id === e.playerId) || { id: e.playerId, name: e.playerName || 'Player', teamId: e.teamId };
        const cur = goalsMap.get(e.playerId) || { player: ply, goals: 0, assists: 0 };
        cur.goals++;
        totalGoalsOrRuns++;
        goalsMap.set(e.playerId, cur);
      }
    });

    const topScorers: TournamentLeaderStat[] = Array.from(goalsMap.values())
      .sort((a, b) => b.goals - a.goals)
      .slice(0, 5)
      .map((item, idx) => {
        const tm = teams.find((t) => t.id === item.player.teamId);
        return {
          id: `goal_${item.player.id}`,
          playerId: item.player.id,
          playerName: item.player.name,
          teamId: item.player.teamId,
          teamName: tm?.name || 'Team',
          teamLogoUrl: tm?.logoUrl,
          photoUrl: item.player.photoUrl,
          jerseyNumber: item.player.jerseyNumber,
          statLabel: 'Goals',
          statValue: item.goals,
          secondaryStat: `Assists: ${item.assists}`,
          rank: idx + 1,
        };
      });

    topPerformersMap['TOP_SCORERS'] = topScorers;
  } else if (tournament?.sport === 'VOLLEYBALL') {
    const attacksMap = new Map<string, { player: any; attacks: number; blocks: number; aces: number }>();

    (db.volleyball_events || []).filter((e: any) => matches.some((m) => m.id === e.matchId)).forEach((e: any) => {
      if (e.playerId) {
        const ply = players.find((p) => p.id === e.playerId) || { id: e.playerId, name: e.playerName || 'Player', teamId: e.teamId };
        const cur = attacksMap.get(e.playerId) || { player: ply, attacks: 0, blocks: 0, aces: 0 };
        if (e.pointType === 'ATTACK' || e.pointType === 'KILL') cur.attacks++;
        if (e.pointType === 'BLOCK') cur.blocks++;
        if (e.pointType === 'ACE') cur.aces++;
        attacksMap.set(e.playerId, cur);
      }
    });

    const topAttackers: TournamentLeaderStat[] = Array.from(attacksMap.values())
      .sort((a, b) => b.attacks - a.attacks)
      .slice(0, 5)
      .map((item, idx) => {
        const tm = teams.find((t) => t.id === item.player.teamId);
        return {
          id: `atk_${item.player.id}`,
          playerId: item.player.id,
          playerName: item.player.name,
          teamId: item.player.teamId,
          teamName: tm?.name || 'Team',
          teamLogoUrl: tm?.logoUrl,
          photoUrl: item.player.photoUrl,
          jerseyNumber: item.player.jerseyNumber,
          statLabel: 'Attack Kills',
          statValue: item.attacks,
          secondaryStat: `Blocks: ${item.blocks} | Aces: ${item.aces}`,
          rank: idx + 1,
        };
      });

    topPerformersMap['TOP_ATTACKERS'] = topAttackers;
  } else if (tournament?.sport === 'KABADDI') {
    const kabaddiMap = new Map<string, { player: any; raidPts: number; tacklePts: number }>();

    (db.kabaddi_raids || []).filter((r: any) => matches.some((m) => m.id === r.matchId)).forEach((r: any) => {
      if (r.raiderId) {
        const ply = players.find((p) => p.id === r.raiderId) || { id: r.raiderId, name: r.raiderName || 'Raider', teamId: r.raidingTeamId };
        const cur = kabaddiMap.get(r.raiderId) || { player: ply, raidPts: 0, tacklePts: 0 };
        cur.raidPts += (r.raidPoints || 0) + (r.bonusPoint ? 1 : 0);
        totalGoalsOrRuns += cur.raidPts;
        kabaddiMap.set(r.raiderId, cur);
      }
    });

    const topRaiders: TournamentLeaderStat[] = Array.from(kabaddiMap.values())
      .sort((a, b) => b.raidPts - a.raidPts)
      .slice(0, 5)
      .map((item, idx) => {
        const tm = teams.find((t) => t.id === item.player.teamId);
        return {
          id: `raid_${item.player.id}`,
          playerId: item.player.id,
          playerName: item.player.name,
          teamId: item.player.teamId,
          teamName: tm?.name || 'Team',
          teamLogoUrl: tm?.logoUrl,
          photoUrl: item.player.photoUrl,
          jerseyNumber: item.player.jerseyNumber,
          statLabel: 'Raid Points',
          statValue: item.raidPts,
          secondaryStat: `Tackle Pts: ${item.tacklePts}`,
          rank: idx + 1,
        };
      });

    topPerformersMap['TOP_RAIDERS'] = topRaiders;
  }

  const avgScore = completedMatches > 0 ? (totalGoalsOrRuns / completedMatches).toFixed(1) : '0';

  return {
    totalMatches: matches.length,
    completedMatches,
    liveMatches,
    upcomingMatches,
    totalTeams: teams.length,
    totalPlayers: players.length,
    totalGoalsOrRuns,
    averageScorePerMatch: avgScore,
    topPerformers: topPerformersMap,
    teamStats,
  };
}

/**
 * GET OR GENERATE TOURNAMENT AWARDS
 */
export function getTournamentAwards(tournamentId: string): TournamentAwardItem[] {
  const db = getDb();
  const tournament = db.tournaments.find((t) => t.id === tournamentId);
  if (!tournament) return [];

  const savedAwards = (db.tournament_awards || []).filter((a: any) => a.tournamentId === tournamentId) as TournamentAwardItem[];
  const stats = calculateTournamentStatistics(tournamentId);

  // Default award definitions based on sport
  const defaultDefs: Array<{
    key: string;
    title: string;
    icon: string;
    category: TournamentAwardItem['category'];
    leaderGroupKey?: string;
  }> = [
    { key: 'MVP', title: 'Player of the Tournament', icon: '👑', category: 'MVP' },
  ];

  if (tournament.sport === 'CRICKET') {
    defaultDefs.push({ key: 'BEST_BATTER', title: 'Best Batter / Orange Cap', icon: '🏏', category: 'OFFENSE', leaderGroupKey: 'TOP_RUN_SCORERS' });
    defaultDefs.push({ key: 'BEST_BOWLER', title: 'Best Bowler / Purple Cap', icon: '🎯', category: 'DEFENSE', leaderGroupKey: 'MOST_WICKETS' });
    defaultDefs.push({ key: 'EMERGING', title: 'Emerging Player of the Tournament', icon: '⭐', category: 'EMERGING' });
    defaultDefs.push({ key: 'FAIRPLAY', title: 'Fair Play Award', icon: '🤝', category: 'FAIRPLAY' });
  } else if (tournament.sport === 'FOOTBALL' || tournament.sport === 'HOCKEY') {
    defaultDefs.push({ key: 'GOLDEN_BOOT', title: 'Golden Boot / Top Scorer', icon: '⚽', category: 'OFFENSE', leaderGroupKey: 'TOP_SCORERS' });
    defaultDefs.push({ key: 'GOLDEN_GLOVE', title: 'Golden Glove / Best Goalkeeper', icon: '🧤', category: 'GOALKEEPER' });
    defaultDefs.push({ key: 'BEST_PLAYMAKER', title: 'Best Playmaker / Most Assists', icon: '🎯', category: 'OFFENSE' });
    defaultDefs.push({ key: 'EMERGING', title: 'Young Player of the Tournament', icon: '⭐', category: 'EMERGING' });
  } else if (tournament.sport === 'VOLLEYBALL') {
    defaultDefs.push({ key: 'BEST_ATTACKER', title: 'Best Spiker / Attacker', icon: '⚡', category: 'OFFENSE', leaderGroupKey: 'TOP_ATTACKERS' });
    defaultDefs.push({ key: 'BEST_BLOCKER', title: 'Best Blocker', icon: '🛡️', category: 'DEFENSE' });
    defaultDefs.push({ key: 'BEST_SERVER', title: 'Best Server', icon: '🎯', category: 'OFFENSE' });
  } else if (tournament.sport === 'KABADDI') {
    defaultDefs.push({ key: 'BEST_RAIDER', title: 'Best Raider', icon: '⚡', category: 'OFFENSE', leaderGroupKey: 'TOP_RAIDERS' });
    defaultDefs.push({ key: 'BEST_DEFENDER', title: 'Best Defender', icon: '🛡️', category: 'DEFENSE' });
  } else {
    defaultDefs.push({ key: 'BEST_OFFENSE', title: 'Top Scorer', icon: '🏆', category: 'OFFENSE' });
    defaultDefs.push({ key: 'BEST_DEFENSE', title: 'Best Defender', icon: '🛡️', category: 'DEFENSE' });
  }

  // Merge with recommendations and saved
  return defaultDefs.map((def) => {
    const saved = savedAwards.find((s) => s.awardKey === def.key);

    let recommendedPlayerId: string | undefined;
    let recommendedPlayerName: string | undefined;
    let recommendedTeamName: string | undefined;
    let recommendedStatSummary: string | undefined;

    if (def.leaderGroupKey && stats.topPerformers[def.leaderGroupKey]?.[0]) {
      const top = stats.topPerformers[def.leaderGroupKey][0];
      recommendedPlayerId = top.playerId;
      recommendedPlayerName = top.playerName;
      recommendedTeamName = top.teamName;
      recommendedStatSummary = `${top.statLabel}: ${top.statValue} (${top.secondaryStat || ''})`;
    } else if (def.key === 'MVP') {
      // Find overall top player across all categories
      const allTops = Object.values(stats.topPerformers).flatMap((list) => list);
      if (allTops[0]) {
        recommendedPlayerId = allTops[0].playerId;
        recommendedPlayerName = allTops[0].playerName;
        recommendedTeamName = allTops[0].teamName;
        recommendedStatSummary = `${allTops[0].statLabel}: ${allTops[0].statValue}`;
      }
    }

    if (saved) {
      return {
        ...saved,
        recommendedPlayerId: saved.recommendedPlayerId || recommendedPlayerId,
        recommendedPlayerName: saved.recommendedPlayerName || recommendedPlayerName,
        recommendedTeamName: saved.recommendedTeamName || recommendedTeamName,
        recommendedStatSummary: saved.recommendedStatSummary || recommendedStatSummary,
      };
    }

    return {
      id: crypto.randomUUID(),
      tournamentId,
      awardKey: def.key,
      awardTitle: def.title,
      title: def.title,
      awardIcon: def.icon,
      category: def.category,
      recommendedPlayerId,
      recommendedPlayerName,
      recommendedTeamName,
      recommendedStatSummary,
      selectedPlayerId: recommendedPlayerId,
      selectedPlayerName: recommendedPlayerName,
      selectedTeamName: recommendedTeamName,
      citation: `Awarded for outstanding athletic performance in ${tournament.name}`,
      isFinalized: false,
    };
  });
}
