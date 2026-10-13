import crypto from 'crypto';
import { getDb, saveDatabase } from '../db/database';
import {
  Tournament,
  Group,
  Team,
  Match,
  Player,
  SportType,
  TournamentStatisticsSummary,
  TournamentLeaderStat,
  TournamentTeamFormItem,
  TournamentPlayerProfileData,
  TournamentTeamProfileData,
  TournamentRecordItem,
  TournamentPerformanceIndexItem,
  TournamentDashboardData,
  TournamentAwardItem,
  ChampionshipSummary,
} from '../../src/types';
import { calculateTournamentStandingsDeterministic } from './tournamentStandingsEngine';
import { getBracketState, getChampionshipSummary } from './tournamentBracketEngine';

/**
 * Format score and match context strings dynamically for all sports
 */
export function formatMatchScoreDisplay(match: any, sport: SportType): { scoreText: string; detailText: string } {
  if (!match) return { scoreText: 'vs', detailText: '' };

  const teamAName = match.teamA?.shortName || match.teamA?.name || 'Team A';
  const teamBName = match.teamB?.shortName || match.teamB?.name || 'Team B';

  if (sport === 'CRICKET') {
    const sA = match.teamAScore as any;
    const sB = match.teamBScore as any;
    const runsA = sA?.runs ?? sA?.totalRuns ?? (typeof sA === 'number' ? sA : 0);
    const wktsA = sA?.wickets ?? 0;
    const oversA = sA?.overs ?? 0;
    const ballsA = sA?.balls ?? 0;
    const oversStrA = ballsA > 0 ? `${oversA}.${ballsA}` : `${oversA}`;

    const runsB = sB?.runs ?? sB?.totalRuns ?? (typeof sB === 'number' ? sB : 0);
    const wktsB = sB?.wickets ?? 0;
    const oversB = sB?.overs ?? 0;
    const ballsB = sB?.balls ?? 0;
    const oversStrB = ballsB > 0 ? `${oversB}.${ballsB}` : `${oversB}`;

    const scoreA = `${runsA}/${wktsA} (${oversStrA} ov)`;
    const scoreB = `${runsB}/${wktsB} (${oversStrB} ov)`;
    const scoreText = `${teamAName} ${scoreA} vs ${teamBName} ${scoreB}`;
    const detailText = match.status === 'LIVE' ? (match.liveContext || 'Live Inning') : (match.resultSummary || '');
    return { scoreText, detailText };
  }

  if (sport === 'FOOTBALL' || sport === 'HOCKEY') {
    const goalsA = typeof match.teamAScore === 'number' ? match.teamAScore : (match.teamAScore as any)?.goals ?? 0;
    const goalsB = typeof match.teamBScore === 'number' ? match.teamBScore : (match.teamBScore as any)?.goals ?? 0;
    const scoreText = `${teamAName} ${goalsA} - ${goalsB} ${teamBName}`;
    const detailText = match.status === 'LIVE' ? (match.liveClock || 'Live') : (match.resultSummary || '');
    return { scoreText, detailText };
  }

  if (sport === 'VOLLEYBALL') {
    const setsA = typeof match.teamAScore === 'number' ? match.teamAScore : (match.teamAScore as any)?.setsWon ?? 0;
    const setsB = typeof match.teamBScore === 'number' ? match.teamBScore : (match.teamBScore as any)?.setsWon ?? 0;
    const currentSet = (match as any).currentSet || 1;
    const currentPointsA = (match as any).teamACurrentPoints ?? 0;
    const currentPointsB = (match as any).teamBCurrentPoints ?? 0;
    const scoreText = `${teamAName} ${setsA} - ${setsB} ${teamBName}`;
    const detailText = match.status === 'LIVE' ? `Set ${currentSet}: ${currentPointsA}-${currentPointsB}` : (match.resultSummary || '');
    return { scoreText, detailText };
  }

  if (sport === 'KABADDI') {
    const ptsA = typeof match.teamAScore === 'number' ? match.teamAScore : (match.teamAScore as any)?.totalPoints ?? 0;
    const ptsB = typeof match.teamBScore === 'number' ? match.teamBScore : (match.teamBScore as any)?.totalPoints ?? 0;
    const scoreText = `${teamAName} ${ptsA} - ${ptsB} ${teamBName}`;
    const detailText = match.status === 'LIVE' ? (match.liveClock || 'Live Raid') : (match.resultSummary || '');
    return { scoreText, detailText };
  }

  if (sport === 'BASKETBALL') {
    const ptsA = typeof match.teamAScore === 'number' ? match.teamAScore : (match.teamAScore as any)?.points ?? 0;
    const ptsB = typeof match.teamBScore === 'number' ? match.teamBScore : (match.teamBScore as any)?.points ?? 0;
    const scoreText = `${teamAName} ${ptsA} - ${ptsB} ${teamBName}`;
    const detailText = match.status === 'LIVE' ? (match.liveClock || 'Live Quarter') : (match.resultSummary || '');
    return { scoreText, detailText };
  }

  if (sport === 'TENNIS' || sport === 'BADMINTON' || sport === 'TABLE_TENNIS') {
    const setsA = typeof match.teamAScore === 'number' ? match.teamAScore : (match.teamAScore as any)?.setsWon ?? 0;
    const setsB = typeof match.teamBScore === 'number' ? match.teamBScore : (match.teamBScore as any)?.setsWon ?? 0;
    const gamesA = (match as any).teamACurrentGames ?? 0;
    const gamesB = (match as any).teamBCurrentGames ?? 0;
    const scoreText = `${teamAName} ${setsA} - ${setsB} ${teamBName}`;
    const detailText = match.status === 'LIVE' ? `Game ${gamesA}-${gamesB}` : (match.resultSummary || '');
    return { scoreText, detailText };
  }

  // Custom sport or fallback
  const sA = typeof match.teamAScore === 'number' ? match.teamAScore : (match.teamAScore as any)?.score ?? 0;
  const sB = typeof match.teamBScore === 'number' ? match.teamBScore : (match.teamBScore as any)?.score ?? 0;
  return {
    scoreText: `${teamAName} ${sA} - ${sB} ${teamBName}`,
    detailText: match.resultSummary || match.status,
  };
}

/**
 * Calculate Team Form and Statistics for all teams in tournament
 */
export function getTournamentTeamStatsAndForm(tournamentId: string): TournamentTeamFormItem[] {
  const db = getDb();
  const tournament = db.tournaments.find((t) => t.id === tournamentId);
  if (!tournament) return [];

  const standings = calculateTournamentStandingsDeterministic(tournamentId);
  const teams = db.teams.filter((t) => t.tournamentId === tournamentId);
  const groups = db.groups.filter((g) => g.tournamentId === tournamentId);
  const matches = db.matches.filter(
    (m) => m.tournamentId === tournamentId && (m.status === 'COMPLETED' || m.status === 'LIVE')
  );

  const teamFormItems: TournamentTeamFormItem[] = [];

  standings.overall.forEach((row) => {
    const tm = teams.find((t) => t.id === row.teamId);
    const grp = groups.find((g) => g.id === row.groupId);

    // Calculate Last 5 matches form
    const teamMatches = matches
      .filter((m) => m.teamAId === row.teamId || m.teamBId === row.teamId)
      .sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());

    const last5 = teamMatches.slice(0, 5).map((m) => {
      if (m.status !== 'COMPLETED') return 'NR' as const;
      if (m.winnerTeamId === row.teamId) return 'W' as const;
      if (m.winnerTeamId && m.winnerTeamId !== row.teamId) return 'L' as const;
      if (m.isTie || m.isDraw) return 'D' as const;
      if (m.isNoResult || m.isAbandoned) return 'NR' as const;
      return 'D' as const;
    });

    const winPct = row.played > 0 ? `${((row.won / row.played) * 100).toFixed(1)}%` : '0.0%';

    const sportMetrics: TournamentTeamFormItem['sportSpecificMetrics'] = {};

    if (tournament.sport === 'CRICKET') {
      sportMetrics.runsFor = row.forMetric;
      sportMetrics.runsAgainst = row.againstMetric;
      sportMetrics.nrr = row.sportSpecificMetrics?.nrrDisplay || row.differenceDisplay || '0.000';
    } else if (tournament.sport === 'FOOTBALL' || tournament.sport === 'HOCKEY') {
      sportMetrics.goalsFor = row.forMetric;
      sportMetrics.goalsAgainst = row.againstMetric;
      sportMetrics.goalDifference = row.differenceMetric;
    } else if (tournament.sport === 'VOLLEYBALL') {
      sportMetrics.setsWon = row.sportSpecificMetrics?.setsWon ?? row.forMetric;
      sportMetrics.setsLost = row.sportSpecificMetrics?.setsLost ?? row.againstMetric;
      sportMetrics.setRatio = row.sportSpecificMetrics?.setRatio ?? row.differenceDisplay;
      sportMetrics.pointsRatio = row.sportSpecificMetrics?.pointRatio;
    } else if (tournament.sport === 'KABADDI') {
      sportMetrics.raidPoints = row.sportSpecificMetrics?.raidPoints;
      sportMetrics.tacklePoints = row.sportSpecificMetrics?.tacklePoints;
      sportMetrics.scoreDifference = row.differenceMetric;
    } else if (tournament.sport === 'BASKETBALL') {
      sportMetrics.pointsFor = row.forMetric;
      sportMetrics.pointsAgainst = row.againstMetric;
      sportMetrics.pointDifference = row.differenceMetric;
    } else if (
      tournament.sport === 'TENNIS' ||
      tournament.sport === 'BADMINTON' ||
      tournament.sport === 'TABLE_TENNIS'
    ) {
      sportMetrics.setsWon = row.sportSpecificMetrics?.setsWon ?? row.forMetric;
      sportMetrics.setsLost = row.sportSpecificMetrics?.setsLost ?? row.againstMetric;
      sportMetrics.gamesWon = row.sportSpecificMetrics?.gamesWon;
      sportMetrics.gamesLost = row.sportSpecificMetrics?.gamesLost;
    } else {
      sportMetrics.customMetrics = row.sportSpecificMetrics || {};
    }

    teamFormItems.push({
      teamId: row.teamId,
      teamName: row.teamName,
      teamShortName: row.teamShortName || tm?.shortName,
      teamLogoUrl: row.teamLogoUrl || tm?.logoUrl,
      groupId: row.groupId,
      groupName: grp?.name || row.groupName,
      rank: row.rank,
      played: row.played,
      won: row.won,
      lost: row.lost,
      drawn: row.drawn,
      tied: row.tied || 0,
      noResult: row.noResult || 0,
      points: row.points,
      winPercentage: winPct,
      qualificationStatus: row.qualificationStatus,
      form: last5.length > 0 ? last5 : (row.form || []),
      sportSpecificMetrics: sportMetrics,
    });
  });

  return teamFormItems;
}

/**
 * Multi-Sport Leaderboards aggregator for all sports
 */
export function getTournamentPlayerLeaderboards(
  tournamentId: string
): Record<string, { categoryTitle: string; statLabel: string; leaders: TournamentLeaderStat[] }> {
  const db = getDb();
  const tournament = db.tournaments.find((t) => t.id === tournamentId);
  if (!tournament) return {};

  const matches = db.matches.filter((m) => m.tournamentId === tournamentId);
  const matchIds = new Set(matches.map((m) => m.id));
  const teams = db.teams.filter((t) => t.tournamentId === tournamentId);
  const teamMap = new Map<string, Team>(teams.map((t) => [t.id, t]));
  const teamIds = new Set(teams.map((t) => t.id));
  const players = db.players.filter(
    (p) => p.tournamentId === tournamentId || (p.teamId && teamIds.has(p.teamId))
  );
  const playerMap = new Map<string, Player>(players.map((p) => [p.id, p]));

  const result: Record<string, { categoryTitle: string; statLabel: string; leaders: TournamentLeaderStat[] }> = {};

  const sport = tournament.sport;

  if (sport === 'CRICKET') {
    const battingStats = new Map<
      string,
      {
        runs: number;
        balls: number;
        fours: number;
        sixes: number;
        highestScore: number;
        innings: number;
        dismissals: number;
      }
    >();
    const bowlingStats = new Map<
      string,
      {
        wickets: number;
        runsConceded: number;
        balls: number;
        maidens: number;
        bestWickets: number;
        bestRuns: number;
      }
    >();
    const fieldingStats = new Map<string, { catches: number; runOuts: number; stumpings: number }>();

    (db.match_reports || [])
      .filter((r) => matchIds.has(r.matchId))
      .forEach((rep) => {
        const data = rep.reportData;
        if (!data) return;

        (data.battingPerformances || []).forEach((bp: any) => {
          if (!bp.playerId) return;
          const cur = battingStats.get(bp.playerId) || {
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            highestScore: 0,
            innings: 0,
            dismissals: 0,
          };
          cur.runs += bp.runs || 0;
          cur.balls += bp.ballsFaced || 0;
          cur.fours += bp.fours || 0;
          cur.sixes += bp.sixes || 0;
          cur.innings += 1;
          if (bp.isOut) cur.dismissals += 1;
          if ((bp.runs || 0) > cur.highestScore) cur.highestScore = bp.runs || 0;
          battingStats.set(bp.playerId, cur);
        });

        (data.bowlingPerformances || []).forEach((bp: any) => {
          if (!bp.playerId) return;
          const cur = bowlingStats.get(bp.playerId) || {
            wickets: 0,
            runsConceded: 0,
            balls: 0,
            maidens: 0,
            bestWickets: 0,
            bestRuns: 999,
          };
          cur.wickets += bp.wickets || 0;
          cur.runsConceded += bp.runsConceded || 0;
          cur.balls += (bp.overs || 0) * 6 + (bp.extraBalls || 0);
          cur.maidens += bp.maidens || 0;

          if (
            (bp.wickets || 0) > cur.bestWickets ||
            ((bp.wickets || 0) === cur.bestWickets && (bp.runsConceded || 0) < cur.bestRuns)
          ) {
            cur.bestWickets = bp.wickets || 0;
            cur.bestRuns = bp.runsConceded || 0;
          }
          bowlingStats.set(bp.playerId, cur);
        });

        (data.fieldingPerformances || []).forEach((fp: any) => {
          if (!fp.playerId) return;
          const cur = fieldingStats.get(fp.playerId) || { catches: 0, runOuts: 0, stumpings: 0 };
          cur.catches += fp.catches || 0;
          cur.runOuts += fp.runOuts || 0;
          cur.stumpings += fp.stumpings || 0;
          fieldingStats.set(fp.playerId, cur);
        });
      });

    // Helper to format player stat entry
    const formatEntry = (
      playerId: string,
      statVal: number | string,
      statLbl: string,
      secondary: string,
      rank: number
    ): TournamentLeaderStat => {
      const p = playerMap.get(playerId);
      const tm = p?.teamId ? teamMap.get(p.teamId) : undefined;
      return {
        id: `${playerId}_${statLbl}`,
        playerId,
        playerName: p?.name || 'Player',
        teamId: p?.teamId || '',
        teamName: tm?.name || 'Team',
        teamLogoUrl: tm?.logoUrl,
        photoUrl: p?.photoUrl,
        jerseyNumber: p?.jerseyNumber,
        statLabel: statLbl,
        statValue: statVal,
        secondaryStat: secondary,
        rank,
      };
    };

    // 1. Most Runs
    const runsList = Array.from(battingStats.entries())
      .sort((a, b) => b[1].runs - a[1].runs)
      .slice(0, 10)
      .map(([id, s], idx) => {
        const sr = s.balls > 0 ? ((s.runs / s.balls) * 100).toFixed(1) : '0.0';
        return formatEntry(id, s.runs, 'Runs', `SR: ${sr} | Inn: ${s.innings}`, idx + 1);
      });
    result['MOST_RUNS'] = { categoryTitle: 'Most Runs (Orange Cap)', statLabel: 'Runs', leaders: runsList };

    // 2. Highest Individual Score
    const highScoreList = Array.from(battingStats.entries())
      .filter(([_, s]) => s.highestScore > 0)
      .sort((a, b) => b[1].highestScore - a[1].highestScore)
      .slice(0, 10)
      .map(([id, s], idx) => formatEntry(id, s.highestScore, 'High Score', `Total Runs: ${s.runs}`, idx + 1));
    result['HIGHEST_SCORE'] = { categoryTitle: 'Highest Individual Score', statLabel: 'Runs', leaders: highScoreList };

    // 3. Best Strike Rate (min 20 balls)
    const srList = Array.from(battingStats.entries())
      .filter(([_, s]) => s.balls >= 20)
      .sort((a, b) => b[1].runs / b[1].balls - a[1].runs / a[1].balls)
      .slice(0, 10)
      .map(([id, s], idx) => {
        const sr = ((s.runs / s.balls) * 100).toFixed(1);
        return formatEntry(id, sr, 'Strike Rate', `${s.runs} runs (${s.balls}b)`, idx + 1);
      });
    result['BEST_STRIKE_RATE'] = { categoryTitle: 'Best Strike Rate', statLabel: 'SR', leaders: srList };

    // 4. Most Sixes
    const sixesList = Array.from(battingStats.entries())
      .filter(([_, s]) => s.sixes > 0)
      .sort((a, b) => b[1].sixes - a[1].sixes)
      .slice(0, 10)
      .map(([id, s], idx) => formatEntry(id, s.sixes, 'Sixes', `4s: ${s.fours} | Runs: ${s.runs}`, idx + 1));
    result['MOST_SIXES'] = { categoryTitle: 'Most Sixes', statLabel: '6s', leaders: sixesList };

    // 5. Most Wickets (Purple Cap)
    const wicketsList = Array.from(bowlingStats.entries())
      .sort((a, b) => b[1].wickets - a[1].wickets)
      .slice(0, 10)
      .map(([id, s], idx) => {
        const overs = s.balls / 6;
        const econ = overs > 0 ? (s.runsConceded / overs).toFixed(2) : '0.00';
        return formatEntry(id, s.wickets, 'Wickets', `Econ: ${econ} | Runs: ${s.runsConceded}`, idx + 1);
      });
    result['MOST_WICKETS'] = { categoryTitle: 'Most Wickets (Purple Cap)', statLabel: 'Wickets', leaders: wicketsList };

    // 6. Best Bowling Economy (min 4 overs)
    const econList = Array.from(bowlingStats.entries())
      .filter(([_, s]) => s.balls >= 24)
      .sort((a, b) => a[1].runsConceded / (a[1].balls / 6) - b[1].runsConceded / (b[1].balls / 6))
      .slice(0, 10)
      .map(([id, s], idx) => {
        const econ = (s.runsConceded / (s.balls / 6)).toFixed(2);
        return formatEntry(id, econ, 'Economy', `${s.wickets} wkts (${(s.balls / 6).toFixed(1)} ov)`, idx + 1);
      });
    result['BEST_ECONOMY'] = { categoryTitle: 'Best Bowling Economy', statLabel: 'Econ', leaders: econList };

    // 7. Most Catches & Fielding
    const catchList = Array.from(fieldingStats.entries())
      .filter(([_, s]) => s.catches > 0 || s.runOuts > 0)
      .sort((a, b) => b[1].catches + b[1].runOuts - (a[1].catches + a[1].runOuts))
      .slice(0, 10)
      .map(([id, s], idx) =>
        formatEntry(id, s.catches, 'Catches', `RO: ${s.runOuts} | Stump: ${s.stumpings}`, idx + 1)
      );
    result['MOST_CATCHES'] = { categoryTitle: 'Most Catches & Dismissals', statLabel: 'Catches', leaders: catchList };
  } else if (sport === 'FOOTBALL' || sport === 'HOCKEY') {
    const goalsMap = new Map<string, { goals: number; assists: number; shots: number; shotsOnTarget: number }>();
    const cardsMap = new Map<string, { yellow: number; red: number; fouls: number }>();
    const gkMap = new Map<string, { saves: number; cleanSheets: number; goalsConceded: number }>();

    const eventsList =
      sport === 'FOOTBALL' ? db.football_scoring_events || [] : db.hockey_scoring_events || [];

    eventsList
      .filter((e: any) => matchIds.has(e.matchId))
      .forEach((e: any) => {
        if (e.eventType === 'GOAL' || e.eventType === 'PENALTY_GOAL') {
          if (e.playerId) {
            const cur = goalsMap.get(e.playerId) || { goals: 0, assists: 0, shots: 0, shotsOnTarget: 0 };
            cur.goals += 1;
            cur.shots += 1;
            cur.shotsOnTarget += 1;
            goalsMap.set(e.playerId, cur);
          }
          if (e.assistPlayerId) {
            const cur = goalsMap.get(e.assistPlayerId) || { goals: 0, assists: 0, shots: 0, shotsOnTarget: 0 };
            cur.assists += 1;
            goalsMap.set(e.assistPlayerId, cur);
          }
        } else if (e.eventType === 'SHOT' || e.eventType === 'SHOT_ON_TARGET') {
          if (e.playerId) {
            const cur = goalsMap.get(e.playerId) || { goals: 0, assists: 0, shots: 0, shotsOnTarget: 0 };
            cur.shots += 1;
            if (e.eventType === 'SHOT_ON_TARGET') cur.shotsOnTarget += 1;
            goalsMap.set(e.playerId, cur);
          }
        } else if (e.eventType === 'YELLOW_CARD' || e.eventType === 'RED_CARD') {
          if (e.playerId) {
            const cur = cardsMap.get(e.playerId) || { yellow: 0, red: 0, fouls: 0 };
            if (e.eventType === 'YELLOW_CARD') cur.yellow += 1;
            if (e.eventType === 'RED_CARD') cur.red += 1;
            cardsMap.set(e.playerId, cur);
          }
        } else if (e.eventType === 'SAVE') {
          if (e.playerId) {
            const cur = gkMap.get(e.playerId) || { saves: 0, cleanSheets: 0, goalsConceded: 0 };
            cur.saves += 1;
            gkMap.set(e.playerId, cur);
          }
        }
      });

    // Golden Boot / Top Scorers
    const topScorers = Array.from(goalsMap.entries())
      .sort((a, b) => b[1].goals - a[1].goals || b[1].assists - a[1].assists)
      .slice(0, 10)
      .map(([id, s], idx) => {
        const p = playerMap.get(id);
        const tm = p?.teamId ? teamMap.get(p.teamId) : undefined;
        return {
          id: `goal_${id}`,
          playerId: id,
          playerName: p?.name || 'Player',
          teamId: p?.teamId || '',
          teamName: tm?.name || 'Team',
          teamLogoUrl: tm?.logoUrl,
          photoUrl: p?.photoUrl,
          jerseyNumber: p?.jerseyNumber,
          statLabel: 'Goals',
          statValue: s.goals,
          secondaryStat: `Assists: ${s.assists} | Shots: ${s.shots}`,
          rank: idx + 1,
        };
      });
    result['TOP_SCORERS'] = {
      categoryTitle: sport === 'FOOTBALL' ? 'Golden Boot / Top Scorers' : 'Top Goal Scorers',
      statLabel: 'Goals',
      leaders: topScorers,
    };

    // Most Assists
    const topAssists = Array.from(goalsMap.entries())
      .filter(([_, s]) => s.assists > 0)
      .sort((a, b) => b[1].assists - a[1].assists || b[1].goals - a[1].goals)
      .slice(0, 10)
      .map(([id, s], idx) => {
        const p = playerMap.get(id);
        const tm = p?.teamId ? teamMap.get(p.teamId) : undefined;
        return {
          id: `assist_${id}`,
          playerId: id,
          playerName: p?.name || 'Player',
          teamId: p?.teamId || '',
          teamName: tm?.name || 'Team',
          teamLogoUrl: tm?.logoUrl,
          photoUrl: p?.photoUrl,
          jerseyNumber: p?.jerseyNumber,
          statLabel: 'Assists',
          statValue: s.assists,
          secondaryStat: `Goals: ${s.goals}`,
          rank: idx + 1,
        };
      });
    result['MOST_ASSISTS'] = { categoryTitle: 'Most Assists', statLabel: 'Assists', leaders: topAssists };

    // Goalkeeper Saves / Golden Glove
    const topSaves = Array.from(gkMap.entries())
      .sort((a, b) => b[1].saves - a[1].saves)
      .slice(0, 10)
      .map(([id, s], idx) => {
        const p = playerMap.get(id);
        const tm = p?.teamId ? teamMap.get(p.teamId) : undefined;
        return {
          id: `save_${id}`,
          playerId: id,
          playerName: p?.name || 'Player',
          teamId: p?.teamId || '',
          teamName: tm?.name || 'Team',
          teamLogoUrl: tm?.logoUrl,
          photoUrl: p?.photoUrl,
          jerseyNumber: p?.jerseyNumber,
          statLabel: 'Saves',
          statValue: s.saves,
          secondaryStat: `Clean Sheets: ${s.cleanSheets}`,
          rank: idx + 1,
        };
      });
    result['GOLDEN_GLOVE'] = { categoryTitle: 'Golden Glove / Most Saves', statLabel: 'Saves', leaders: topSaves };
  } else if (sport === 'KABADDI') {
    const kabaddiMap = new Map<
      string,
      { raidPts: number; tacklePts: number; superRaids: number; superTackles: number; totalRaids: number }
    >();

    (db.kabaddi_raids || [])
      .filter((r: any) => matchIds.has(r.matchId))
      .forEach((r: any) => {
        if (r.raiderId) {
          const cur = kabaddiMap.get(r.raiderId) || {
            raidPts: 0,
            tacklePts: 0,
            superRaids: 0,
            superTackles: 0,
            totalRaids: 0,
          };
          const pts = (r.raidPoints || 0) + (r.bonusPoint ? 1 : 0);
          cur.raidPts += pts;
          cur.totalRaids += 1;
          if (pts >= 3) cur.superRaids += 1;
          kabaddiMap.set(r.raiderId, cur);
        }
        if (r.tacklerId) {
          const cur = kabaddiMap.get(r.tacklerId) || {
            raidPts: 0,
            tacklePts: 0,
            superRaids: 0,
            superTackles: 0,
            totalRaids: 0,
          };
          const pts = r.isSuperTackle ? 2 : 1;
          cur.tacklePts += pts;
          if (r.isSuperTackle) cur.superTackles += 1;
          kabaddiMap.set(r.tacklerId, cur);
        }
      });

    const topRaiders = Array.from(kabaddiMap.entries())
      .sort((a, b) => b[1].raidPts - a[1].raidPts)
      .slice(0, 10)
      .map(([id, s], idx) => {
        const p = playerMap.get(id);
        const tm = p?.teamId ? teamMap.get(p.teamId) : undefined;
        return {
          id: `raid_${id}`,
          playerId: id,
          playerName: p?.name || 'Player',
          teamId: p?.teamId || '',
          teamName: tm?.name || 'Team',
          teamLogoUrl: tm?.logoUrl,
          photoUrl: p?.photoUrl,
          jerseyNumber: p?.jerseyNumber,
          statLabel: 'Raid Points',
          statValue: s.raidPts,
          secondaryStat: `Super Raids: ${s.superRaids} | Total Raids: ${s.totalRaids}`,
          rank: idx + 1,
        };
      });
    result['TOP_RAIDERS'] = { categoryTitle: 'Best Raiders', statLabel: 'Raid Pts', leaders: topRaiders };

    const topDefenders = Array.from(kabaddiMap.entries())
      .filter(([_, s]) => s.tacklePts > 0)
      .sort((a, b) => b[1].tacklePts - a[1].tacklePts)
      .slice(0, 10)
      .map(([id, s], idx) => {
        const p = playerMap.get(id);
        const tm = p?.teamId ? teamMap.get(p.teamId) : undefined;
        return {
          id: `def_${id}`,
          playerId: id,
          playerName: p?.name || 'Player',
          teamId: p?.teamId || '',
          teamName: tm?.name || 'Team',
          teamLogoUrl: tm?.logoUrl,
          photoUrl: p?.photoUrl,
          jerseyNumber: p?.jerseyNumber,
          statLabel: 'Tackle Points',
          statValue: s.tacklePts,
          secondaryStat: `Super Tackles: ${s.superTackles}`,
          rank: idx + 1,
        };
      });
    result['TOP_DEFENDERS'] = { categoryTitle: 'Best Defenders', statLabel: 'Tackle Pts', leaders: topDefenders };
  } else if (sport === 'VOLLEYBALL') {
    const vballMap = new Map<string, { kills: number; blocks: number; aces: number; digs: number }>();

    (db.volleyball_events || [])
      .filter((e: any) => matchIds.has(e.matchId))
      .forEach((e: any) => {
        if (e.playerId) {
          const cur = vballMap.get(e.playerId) || { kills: 0, blocks: 0, aces: 0, digs: 0 };
          if (e.pointType === 'ATTACK' || e.pointType === 'KILL' || e.pointType === 'SPIKE_KILL') cur.kills += 1;
          if (e.pointType === 'BLOCK' || e.pointType === 'BLOCK_KILL') cur.blocks += 1;
          if (e.pointType === 'ACE' || e.pointType === 'SERVICE_ACE') cur.aces += 1;
          if (e.pointType === 'DIG') cur.digs += 1;
          vballMap.set(e.playerId, cur);
        }
      });

    const topAttackers = Array.from(vballMap.entries())
      .sort((a, b) => b[1].kills - a[1].kills)
      .slice(0, 10)
      .map(([id, s], idx) => {
        const p = playerMap.get(id);
        const tm = p?.teamId ? teamMap.get(p.teamId) : undefined;
        return {
          id: `kill_${id}`,
          playerId: id,
          playerName: p?.name || 'Player',
          teamId: p?.teamId || '',
          teamName: tm?.name || 'Team',
          teamLogoUrl: tm?.logoUrl,
          photoUrl: p?.photoUrl,
          jerseyNumber: p?.jerseyNumber,
          statLabel: 'Kills',
          statValue: s.kills,
          secondaryStat: `Blocks: ${s.blocks} | Aces: ${s.aces}`,
          rank: idx + 1,
        };
      });
    result['TOP_ATTACKERS'] = { categoryTitle: 'Most Kills / Best Attackers', statLabel: 'Kills', leaders: topAttackers };

    const topBlockers = Array.from(vballMap.entries())
      .filter(([_, s]) => s.blocks > 0)
      .sort((a, b) => b[1].blocks - a[1].blocks)
      .slice(0, 10)
      .map(([id, s], idx) => {
        const p = playerMap.get(id);
        const tm = p?.teamId ? teamMap.get(p.teamId) : undefined;
        return {
          id: `block_${id}`,
          playerId: id,
          playerName: p?.name || 'Player',
          teamId: p?.teamId || '',
          teamName: tm?.name || 'Team',
          teamLogoUrl: tm?.logoUrl,
          photoUrl: p?.photoUrl,
          jerseyNumber: p?.jerseyNumber,
          statLabel: 'Blocks',
          statValue: s.blocks,
          secondaryStat: `Kills: ${s.kills}`,
          rank: idx + 1,
        };
      });
    result['TOP_BLOCKERS'] = { categoryTitle: 'Best Blockers', statLabel: 'Blocks', leaders: topBlockers };

    const topServers = Array.from(vballMap.entries())
      .filter(([_, s]) => s.aces > 0)
      .sort((a, b) => b[1].aces - a[1].aces)
      .slice(0, 10)
      .map(([id, s], idx) => {
        const p = playerMap.get(id);
        const tm = p?.teamId ? teamMap.get(p.teamId) : undefined;
        return {
          id: `ace_${id}`,
          playerId: id,
          playerName: p?.name || 'Player',
          teamId: p?.teamId || '',
          teamName: tm?.name || 'Team',
          teamLogoUrl: tm?.logoUrl,
          photoUrl: p?.photoUrl,
          jerseyNumber: p?.jerseyNumber,
          statLabel: 'Aces',
          statValue: s.aces,
          secondaryStat: `Kills: ${s.kills}`,
          rank: idx + 1,
        };
      });
    result['TOP_SERVERS'] = { categoryTitle: 'Best Servers / Service Aces', statLabel: 'Aces', leaders: topServers };
  } else if (sport === 'BASKETBALL') {
    const bballMap = new Map<
      string,
      { points: number; assists: number; rebounds: number; steals: number; blocks: number; threePointers: number }
    >();

    (db.basketball_scoring_events || [])
      .filter((e: any) => matchIds.has(e.matchId))
      .forEach((e: any) => {
        if (e.playerId) {
          const cur = bballMap.get(e.playerId) || {
            points: 0,
            assists: 0,
            rebounds: 0,
            steals: 0,
            blocks: 0,
            threePointers: 0,
          };
          cur.points += e.points || (e.eventType === '3PT_FIELD_GOAL' ? 3 : e.eventType === 'FREE_THROW' ? 1 : 2);
          if (e.eventType === '3PT_FIELD_GOAL') cur.threePointers += 1;
          if (e.eventType === 'REBOUND') cur.rebounds += 1;
          if (e.eventType === 'STEAL') cur.steals += 1;
          if (e.eventType === 'BLOCK') cur.blocks += 1;
          if (e.assistPlayerId) {
            const aCur = bballMap.get(e.assistPlayerId) || {
              points: 0,
              assists: 0,
              rebounds: 0,
              steals: 0,
              blocks: 0,
              threePointers: 0,
            };
            aCur.assists += 1;
            bballMap.set(e.assistPlayerId, aCur);
          }
          bballMap.set(e.playerId, cur);
        }
      });

    const topPoints = Array.from(bballMap.entries())
      .sort((a, b) => b[1].points - a[1].points)
      .slice(0, 10)
      .map(([id, s], idx) => {
        const p = playerMap.get(id);
        const tm = p?.teamId ? teamMap.get(p.teamId) : undefined;
        return {
          id: `pts_${id}`,
          playerId: id,
          playerName: p?.name || 'Player',
          teamId: p?.teamId || '',
          teamName: tm?.name || 'Team',
          teamLogoUrl: tm?.logoUrl,
          photoUrl: p?.photoUrl,
          jerseyNumber: p?.jerseyNumber,
          statLabel: 'Points',
          statValue: s.points,
          secondaryStat: `3PT: ${s.threePointers} | Ast: ${s.assists}`,
          rank: idx + 1,
        };
      });
    result['TOP_POINTS'] = { categoryTitle: 'Most Points', statLabel: 'Points', leaders: topPoints };
  } else {
    // Racket sports (Tennis, Badminton, Table Tennis) or Custom sports
    const genericMap = new Map<string, { pointsWon: number; winners: number; aces: number }>();

    const eventList =
      sport === 'TENNIS'
        ? db.tennis_scoring_events || []
        : sport === 'BADMINTON'
        ? db.badminton_scoring_events || []
        : sport === 'TABLE_TENNIS'
        ? db.table_tennis_scoring_events || []
        : db.custom_scoring_events || [];

    eventList
      .filter((e: any) => matchIds.has(e.matchId))
      .forEach((e: any) => {
        if (e.playerId) {
          const cur = genericMap.get(e.playerId) || { pointsWon: 0, winners: 0, aces: 0 };
          cur.pointsWon += e.points || 1;
          if (e.eventType === 'WINNER' || e.eventType === 'SMASH_WINNER') cur.winners += 1;
          if (e.eventType === 'ACE') cur.aces += 1;
          genericMap.set(e.playerId, cur);
        }
      });

    const topPerformers = Array.from(genericMap.entries())
      .sort((a, b) => b[1].pointsWon - a[1].pointsWon)
      .slice(0, 10)
      .map(([id, s], idx) => {
        const p = playerMap.get(id);
        const tm = p?.teamId ? teamMap.get(p.teamId) : undefined;
        return {
          id: `gen_${id}`,
          playerId: id,
          playerName: p?.name || 'Player',
          teamId: p?.teamId || '',
          teamName: tm?.name || 'Team',
          teamLogoUrl: tm?.logoUrl,
          photoUrl: p?.photoUrl,
          jerseyNumber: p?.jerseyNumber,
          statLabel: 'Points Won',
          statValue: s.pointsWon,
          secondaryStat: `Winners: ${s.winners} | Aces: ${s.aces}`,
          rank: idx + 1,
        };
      });
    result['TOP_PERFORMERS'] = { categoryTitle: 'Top Performers', statLabel: 'Points Won', leaders: topPerformers };
  }

  return result;
}

/**
 * Deterministic Tournament Performance Index (PI) with Transparent Formula
 */
export function getTournamentPerformanceIndex(tournamentId: string): TournamentPerformanceIndexItem[] {
  const db = getDb();
  const tournament = db.tournaments.find((t) => t.id === tournamentId);
  if (!tournament) return [];

  const teams = db.teams.filter((t) => t.tournamentId === tournamentId);
  const teamIds = new Set(teams.map((t) => t.id));
  const teamMap = new Map<string, Team>(teams.map((t) => [t.id, t]));
  const players = db.players.filter(
    (p) => p.tournamentId === tournamentId || (p.teamId && teamIds.has(p.teamId))
  );

  const leaderboards = getTournamentPlayerLeaderboards(tournamentId);
  const sport = tournament.sport;

  const playerScores = new Map<
    string,
    { score: number; breakdown: Record<string, number | string>; formula: string }
  >();

  players.forEach((p) => {
    let score = 0;
    const breakdown: Record<string, number | string> = {};
    let formula = '';

    if (sport === 'CRICKET') {
      const runs = (leaderboards['MOST_RUNS']?.leaders.find((l) => l.playerId === p.id)?.statValue as number) || 0;
      const wkts = (leaderboards['MOST_WICKETS']?.leaders.find((l) => l.playerId === p.id)?.statValue as number) || 0;
      const sixes = (leaderboards['MOST_SIXES']?.leaders.find((l) => l.playerId === p.id)?.statValue as number) || 0;
      const catches = (leaderboards['MOST_CATCHES']?.leaders.find((l) => l.playerId === p.id)?.statValue as number) || 0;

      // Cricket PI Formula: (Runs * 1.0) + (Wickets * 25.0) + (Sixes * 2.0) + (Catches * 10.0)
      score = runs * 1.0 + wkts * 25.0 + sixes * 2.0 + catches * 10.0;
      breakdown['Runs Impact'] = `${runs} pts`;
      breakdown['Wickets Impact'] = `${wkts * 25} pts (${wkts} wkts)`;
      breakdown['Boundary Impact'] = `${sixes * 2} pts (${sixes} 6s)`;
      breakdown['Fielding Impact'] = `${catches * 10} pts (${catches} catches)`;
      formula = 'Performance Index = (Runs × 1) + (Wickets × 25) + (Sixes × 2) + (Catches × 10)';
    } else if (sport === 'FOOTBALL' || sport === 'HOCKEY') {
      const goals = (leaderboards['TOP_SCORERS']?.leaders.find((l) => l.playerId === p.id)?.statValue as number) || 0;
      const assists = (leaderboards['MOST_ASSISTS']?.leaders.find((l) => l.playerId === p.id)?.statValue as number) || 0;
      const saves = (leaderboards['GOLDEN_GLOVE']?.leaders.find((l) => l.playerId === p.id)?.statValue as number) || 0;

      score = goals * 30.0 + assists * 15.0 + saves * 8.0;
      breakdown['Goals Impact'] = `${goals * 30} pts (${goals} goals)`;
      breakdown['Assists Impact'] = `${assists * 15} pts (${assists} ast)`;
      breakdown['Goalkeeping Impact'] = `${saves * 8} pts (${saves} saves)`;
      formula = 'Performance Index = (Goals × 30) + (Assists × 15) + (Saves × 8)';
    } else if (sport === 'KABADDI') {
      const raidPts = (leaderboards['TOP_RAIDERS']?.leaders.find((l) => l.playerId === p.id)?.statValue as number) || 0;
      const tacklePts = (leaderboards['TOP_DEFENDERS']?.leaders.find((l) => l.playerId === p.id)?.statValue as number) || 0;

      score = raidPts * 1.5 + tacklePts * 2.5;
      breakdown['Raid Impact'] = `${raidPts * 1.5} pts (${raidPts} raid pts)`;
      breakdown['Tackle Impact'] = `${tacklePts * 2.5} pts (${tacklePts} tackle pts)`;
      formula = 'Performance Index = (Raid Points × 1.5) + (Tackle Points × 2.5)';
    } else if (sport === 'VOLLEYBALL') {
      const kills = (leaderboards['TOP_ATTACKERS']?.leaders.find((l) => l.playerId === p.id)?.statValue as number) || 0;
      const blocks = (leaderboards['TOP_BLOCKERS']?.leaders.find((l) => l.playerId === p.id)?.statValue as number) || 0;
      const aces = (leaderboards['TOP_SERVERS']?.leaders.find((l) => l.playerId === p.id)?.statValue as number) || 0;

      score = kills * 2.0 + blocks * 3.0 + aces * 2.5;
      breakdown['Attack Impact'] = `${kills * 2} pts (${kills} kills)`;
      breakdown['Block Impact'] = `${blocks * 3} pts (${blocks} blocks)`;
      breakdown['Serve Impact'] = `${aces * 2.5} pts (${aces} aces)`;
      formula = 'Performance Index = (Kills × 2) + (Blocks × 3) + (Aces × 2.5)';
    } else if (sport === 'BASKETBALL') {
      const pts = (leaderboards['TOP_POINTS']?.leaders.find((l) => l.playerId === p.id)?.statValue as number) || 0;
      score = pts * 1.0;
      breakdown['Scoring Impact'] = `${pts} pts`;
      formula = 'Performance Index = Points + Assists + Rebounds Impact';
    } else {
      const ptsWon = (leaderboards['TOP_PERFORMERS']?.leaders.find((l) => l.playerId === p.id)?.statValue as number) || 0;
      score = ptsWon * 1.0;
      breakdown['Match Impact'] = `${ptsWon} pts`;
      formula = 'Performance Index = Direct Winning Scoring Events';
    }

    if (score > 0) {
      playerScores.set(p.id, { score: Math.round(score * 10) / 10, breakdown, formula });
    }
  });

  const sorted = Array.from(playerScores.entries())
    .sort((a, b) => b[1].score - a[1].score)
    .map(([playerId, data], idx) => {
      const p = players.find((pl) => pl.id === playerId)!;
      const tm = p.teamId ? teamMap.get(p.teamId) : undefined;
      return {
        playerId,
        playerName: p.name,
        teamId: p.teamId || '',
        teamName: tm?.name || 'Team',
        teamLogoUrl: tm?.logoUrl,
        photoUrl: p.photoUrl,
        jerseyNumber: p.jerseyNumber,
        role: p.role,
        score: data.score,
        rank: idx + 1,
        formulaExplanation: data.formula,
        breakdown: data.breakdown,
      };
    });

  return sorted;
}

/**
 * Calculate Tournament Records
 */
export function getTournamentRecords(tournamentId: string): TournamentRecordItem[] {
  const db = getDb();
  const tournament = db.tournaments.find((t) => t.id === tournamentId);
  if (!tournament) return [];

  const matches = db.matches.filter((m) => m.tournamentId === tournamentId);
  const completedMatches = matches.filter((m) => m.status === 'COMPLETED');
  const teams = db.teams.filter((t) => t.tournamentId === tournamentId);
  const teamMap = new Map<string, Team>(teams.map((t) => [t.id, t]));
  const leaderboards = getTournamentPlayerLeaderboards(tournamentId);

  const records: TournamentRecordItem[] = [];
  const sport = tournament.sport;

  if (sport === 'CRICKET') {
    // 1. Highest Individual Score
    const topScore = leaderboards['HIGHEST_SCORE']?.leaders[0];
    if (topScore) {
      records.push({
        id: 'rec_cricket_high_score',
        categoryKey: 'HIGHEST_SCORE',
        title: 'Highest Individual Score',
        sport,
        recordValue: `${topScore.statValue} Runs`,
        holderName: topScore.playerName,
        holderTeamName: topScore.teamName,
        holderPhotoUrl: topScore.photoUrl,
        icon: '🏏',
        details: 'Highest runs scored in a single innings across the tournament.',
      });
    }

    // 2. Most Sixes in Tournament
    const topSixes = leaderboards['MOST_SIXES']?.leaders[0];
    if (topSixes) {
      records.push({
        id: 'rec_cricket_most_sixes',
        categoryKey: 'MOST_SIXES',
        title: 'Tournament Six-Hitter',
        sport,
        recordValue: `${topSixes.statValue} Sixes`,
        holderName: topSixes.playerName,
        holderTeamName: topSixes.teamName,
        holderPhotoUrl: topSixes.photoUrl,
        icon: '🚀',
        details: 'Most sixes hit by any player in this competition.',
      });
    }

    // 3. Most Wickets
    const topWkts = leaderboards['MOST_WICKETS']?.leaders[0];
    if (topWkts) {
      records.push({
        id: 'rec_cricket_most_wkts',
        categoryKey: 'MOST_WICKETS',
        title: 'Leading Wicket Taker',
        sport,
        recordValue: `${topWkts.statValue} Wickets`,
        holderName: topWkts.playerName,
        holderTeamName: topWkts.teamName,
        holderPhotoUrl: topWkts.photoUrl,
        icon: '🎯',
        details: 'Highest cumulative wickets taken in tournament fixtures.',
      });
    }
  } else if (sport === 'FOOTBALL' || sport === 'HOCKEY') {
    const topScorer = leaderboards['TOP_SCORERS']?.leaders[0];
    if (topScorer) {
      records.push({
        id: 'rec_ft_top_scorer',
        categoryKey: 'TOP_SCORER',
        title: 'Golden Boot Leader',
        sport,
        recordValue: `${topScorer.statValue} Goals`,
        holderName: topScorer.playerName,
        holderTeamName: topScorer.teamName,
        holderPhotoUrl: topScorer.photoUrl,
        icon: '⚽',
        details: 'Top goal scorer across all tournament rounds.',
      });
    }

    // Biggest Win Margin
    let biggestWinMatch: Match | null = null;
    let maxDiff = 0;
    completedMatches.forEach((m) => {
      const gA = typeof m.teamAScore === 'number' ? m.teamAScore : (m.teamAScore as any)?.goals ?? 0;
      const gB = typeof m.teamBScore === 'number' ? m.teamBScore : (m.teamBScore as any)?.goals ?? 0;
      const diff = Math.abs(gA - gB);
      if (diff > maxDiff) {
        maxDiff = diff;
        biggestWinMatch = m;
      }
    });

    if (biggestWinMatch && maxDiff > 0) {
      const winnerName =
        (biggestWinMatch as any).winnerTeamName ||
        ((biggestWinMatch as any).teamAScore > (biggestWinMatch as any).teamBScore
          ? teamMap.get((biggestWinMatch as any).teamAId)?.name
          : teamMap.get((biggestWinMatch as any).teamBId)?.name) ||
        'Winner';
      records.push({
        id: 'rec_ft_biggest_win',
        categoryKey: 'BIGGEST_WIN',
        title: 'Biggest Margin of Victory',
        sport,
        recordValue: `+${maxDiff} Goals`,
        holderName: winnerName,
        matchTitle: (biggestWinMatch as any).title || `${(biggestWinMatch as any).teamA?.name} vs ${(biggestWinMatch as any).teamB?.name}`,
        icon: '🏆',
        details: `Decisive victory margin recorded in tournament match #${(biggestWinMatch as any).matchNumber || ''}.`,
      });
    }
  } else if (sport === 'KABADDI') {
    const topRaider = leaderboards['TOP_RAIDERS']?.leaders[0];
    if (topRaider) {
      records.push({
        id: 'rec_kab_top_raider',
        categoryKey: 'TOP_RAIDER',
        title: 'Tournament High Raider',
        sport,
        recordValue: `${topRaider.statValue} Raid Points`,
        holderName: topRaider.playerName,
        holderTeamName: topRaider.teamName,
        holderPhotoUrl: topRaider.photoUrl,
        icon: '⚡',
        details: 'Most points scored through offensive raids.',
      });
    }
  } else if (sport === 'VOLLEYBALL') {
    const topAttacker = leaderboards['TOP_ATTACKERS']?.leaders[0];
    if (topAttacker) {
      records.push({
        id: 'rec_vb_top_attacker',
        categoryKey: 'TOP_ATTACKER',
        title: 'Best Spiker / Most Kills',
        sport,
        recordValue: `${topAttacker.statValue} Kills`,
        holderName: topAttacker.playerName,
        holderTeamName: topAttacker.teamName,
        holderPhotoUrl: topAttacker.photoUrl,
        icon: '🏐',
        details: 'Highest cumulative attack kills recorded.',
      });
    }
  }

  return records;
}

/**
 * Generate and manage Tournament Awards Recommendations & Finalizations
 */
export function getTournamentAwardsRecommendations(tournamentId: string): TournamentAwardItem[] {
  const db = getDb();
  const tournament = db.tournaments.find((t) => t.id === tournamentId);
  if (!tournament) return [];

  const savedAwards = (db.tournament_awards || []).filter(
    (a: any) => a.tournamentId === tournamentId
  ) as TournamentAwardItem[];

  const leaderboards = getTournamentPlayerLeaderboards(tournamentId);
  const performanceIndex = getTournamentPerformanceIndex(tournamentId);
  const sport = tournament.sport;

  const defaultDefinitions: Array<{
    key: string;
    title: string;
    icon: string;
    category: TournamentAwardItem['category'];
    leaderGroupKey?: string;
  }> = [{ key: 'MVP', title: 'Player of the Tournament', icon: '👑', category: 'MVP' }];

  if (sport === 'CRICKET') {
    defaultDefinitions.push({
      key: 'BEST_BATTER',
      title: 'Best Batter / Orange Cap',
      icon: '🏏',
      category: 'BEST_BATTER',
      leaderGroupKey: 'MOST_RUNS',
    });
    defaultDefinitions.push({
      key: 'BEST_BOWLER',
      title: 'Best Bowler / Purple Cap',
      icon: '🎯',
      category: 'BEST_BOWLER',
      leaderGroupKey: 'MOST_WICKETS',
    });
    defaultDefinitions.push({
      key: 'EMERGING',
      title: 'Emerging Player of Tournament',
      icon: '⭐',
      category: 'EMERGING_PLAYER',
    });
    defaultDefinitions.push({
      key: 'FAIRPLAY',
      title: 'Fair Play Award',
      icon: '🤝',
      category: 'FAIR_PLAY',
    });
  } else if (sport === 'FOOTBALL' || sport === 'HOCKEY') {
    defaultDefinitions.push({
      key: 'GOLDEN_BOOT',
      title: 'Golden Boot / Top Scorer',
      icon: '⚽',
      category: 'OFFENSE',
      leaderGroupKey: 'TOP_SCORERS',
    });
    defaultDefinitions.push({
      key: 'GOLDEN_GLOVE',
      title: 'Golden Glove / Best Goalkeeper',
      icon: '🧤',
      category: 'GOALKEEPER',
      leaderGroupKey: 'GOLDEN_GLOVE',
    });
    defaultDefinitions.push({
      key: 'BEST_PLAYMAKER',
      title: 'Best Playmaker',
      icon: '🎯',
      category: 'OFFENSE',
      leaderGroupKey: 'MOST_ASSISTS',
    });
    defaultDefinitions.push({
      key: 'FAIRPLAY',
      title: 'Fair Play Team Award',
      icon: '🤝',
      category: 'FAIR_PLAY',
    });
  } else if (sport === 'KABADDI') {
    defaultDefinitions.push({
      key: 'BEST_RAIDER',
      title: 'Best Raider of Tournament',
      icon: '⚡',
      category: 'OFFENSE',
      leaderGroupKey: 'TOP_RAIDERS',
    });
    defaultDefinitions.push({
      key: 'BEST_DEFENDER',
      title: 'Best Defender of Tournament',
      icon: '🛡️',
      category: 'DEFENSE',
      leaderGroupKey: 'TOP_DEFENDERS',
    });
  } else if (sport === 'VOLLEYBALL') {
    defaultDefinitions.push({
      key: 'BEST_ATTACKER',
      title: 'Best Spiker / Attacker',
      icon: '⚡',
      category: 'OFFENSE',
      leaderGroupKey: 'TOP_ATTACKERS',
    });
    defaultDefinitions.push({
      key: 'BEST_BLOCKER',
      title: 'Best Blocker',
      icon: '🛡️',
      category: 'DEFENSE',
      leaderGroupKey: 'TOP_BLOCKERS',
    });
    defaultDefinitions.push({
      key: 'BEST_SERVER',
      title: 'Best Server',
      icon: '🎯',
      category: 'OFFENSE',
      leaderGroupKey: 'TOP_SERVERS',
    });
  } else {
    defaultDefinitions.push({
      key: 'BEST_PERFORMER',
      title: 'Tournament Best Performer',
      icon: '🏆',
      category: 'OFFENSE',
      leaderGroupKey: 'TOP_PERFORMERS',
    });
  }

  return defaultDefinitions.map((def) => {
    const saved = savedAwards.find((s) => s.awardKey === def.key || s.title === def.title);

    let recommendedPlayerId: string | undefined;
    let recommendedPlayerName: string | undefined;
    let recommendedTeamName: string | undefined;
    let recommendedStatSummary: string | undefined;

    if (def.key === 'MVP' && performanceIndex[0]) {
      const topPI = performanceIndex[0];
      recommendedPlayerId = topPI.playerId;
      recommendedPlayerName = topPI.playerName;
      recommendedTeamName = topPI.teamName;
      recommendedStatSummary = `Performance Index: ${topPI.score} (Rank #1)`;
    } else if (def.leaderGroupKey && leaderboards[def.leaderGroupKey]?.leaders[0]) {
      const top = leaderboards[def.leaderGroupKey].leaders[0];
      recommendedPlayerId = top.playerId;
      recommendedPlayerName = top.playerName;
      recommendedTeamName = top.teamName;
      recommendedStatSummary = `${top.statLabel}: ${top.statValue} (${top.secondaryStat || ''})`;
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
      recipientPlayerId: recommendedPlayerId,
      recipientName: recommendedPlayerName,
      recipientTeamName: recommendedTeamName,
      citation: `Awarded for exceptional performance in ${tournament.name}`,
      isFinalized: false,
    };
  });
}

/**
 * Individual Player Tournament Profile & Match-by-Match Breakdown
 */
export function getTournamentPlayerProfile(tournamentId: string, playerId: string): TournamentPlayerProfileData | null {
  const db = getDb();
  const tournament = db.tournaments.find((t) => t.id === tournamentId);
  const player = db.players.find((p) => p.id === playerId);
  if (!tournament || !player) return null;

  const team = player.teamId ? db.teams.find((t) => t.id === player.teamId) : undefined;
  const matches = db.matches.filter((m) => m.tournamentId === tournamentId);
  const reports = (db.match_reports || []).filter((r) => matches.some((m) => m.id === r.matchId));

  const performanceIndexList = getTournamentPerformanceIndex(tournamentId);
  const piEntry = performanceIndexList.find((pi) => pi.playerId === playerId);

  const matchPerformances: TournamentPlayerProfileData['matchPerformances'] = [];
  let totalMatchesPlayed = 0;

  matches.forEach((m) => {
    const isPlayerInSquad =
      m.teamASquad?.playingIds?.includes(playerId) ||
      m.teamBSquad?.playingIds?.includes(playerId) ||
      m.teamASquad?.substituteIds?.includes(playerId) ||
      m.teamBSquad?.substituteIds?.includes(playerId);

    const oppTeamId = m.teamAId === player.teamId ? m.teamBId : m.teamAId;
    const oppTeam = db.teams.find((t) => t.id === oppTeamId);

    // Extract report performance
    const rep = reports.find((r) => r.matchId === m.id);
    let summary = '';
    if (rep?.reportData) {
      if (tournament.sport === 'CRICKET') {
        const bp = (rep.reportData.battingPerformances || []).find((b: any) => b.playerId === playerId);
        const bowl = (rep.reportData.bowlingPerformances || []).find((b: any) => b.playerId === playerId);
        const parts: string[] = [];
        if (bp) parts.push(`${bp.runs} (${bp.ballsFaced}b)`);
        if (bowl) parts.push(`${bowl.wickets}/${bowl.runsConceded} (${bowl.overs} ov)`);
        summary = parts.join(' & ') || 'Did not bat/bowl';
      } else if (tournament.sport === 'FOOTBALL' || tournament.sport === 'HOCKEY') {
        const goals = (rep.reportData.scoringEvents || []).filter((e: any) => e.playerId === playerId && e.eventType === 'GOAL').length;
        const assists = (rep.reportData.scoringEvents || []).filter((e: any) => e.assistPlayerId === playerId).length;
        summary = `${goals} Goals, ${assists} Assists`;
      }
    }

    if (isPlayerInSquad || summary) {
      totalMatchesPlayed++;
      matchPerformances.push({
        matchId: m.id,
        matchNumber: m.matchNumber,
        round: m.round,
        date: m.date,
        opponentTeamId: oppTeamId || '',
        opponentTeamName: oppTeam?.name || 'Opponent',
        opponentTeamLogoUrl: oppTeam?.logoUrl,
        isWinner: m.winnerTeamId === player.teamId,
        statsSummary: summary || (m.status === 'COMPLETED' ? 'Played' : 'Scheduled'),
      });
    }
  });

  const awards = (db.tournament_awards || [])
    .filter((a: any) => a.tournamentId === tournamentId && (a.recipientPlayerId === playerId || a.selectedPlayerId === playerId))
    .map((a: any) => ({
      title: a.title || a.awardTitle || 'Tournament Award',
      icon: a.awardIcon || '🏆',
      citation: a.citation,
    }));

  return {
    player,
    team,
    tournamentId,
    tournamentName: tournament.name,
    sport: tournament.sport,
    tournamentRank: piEntry?.rank,
    performanceIndex: piEntry?.score || 0,
    performanceIndexFormula: piEntry?.formulaExplanation || 'Calculated from tournament match events',
    matchesPlayed: totalMatchesPlayed,
    starts: totalMatchesPlayed,
    appearances: totalMatchesPlayed,
    stats: piEntry?.breakdown || {},
    bestPerformance: matchPerformances[0]?.statsSummary || 'N/A',
    averagePerformance: piEntry?.score ? `${(piEntry.score / Math.max(1, totalMatchesPlayed)).toFixed(1)} PI / Match` : 'N/A',
    matchPerformances,
    awards,
  };
}

/**
 * Team Tournament Profile & Record Overview
 */
export function getTournamentTeamProfile(tournamentId: string, teamId: string): TournamentTeamProfileData | null {
  const db = getDb();
  const tournament = db.tournaments.find((t) => t.id === tournamentId);
  const team = db.teams.find((t) => t.id === teamId);
  if (!tournament || !team) return null;

  const standings = calculateTournamentStandingsDeterministic(tournamentId);
  const row = standings.overall.find((r) => r.teamId === teamId);
  const group = db.groups.find((g) => g.id === team.groupId || g.id === row?.groupId);
  const roster = db.players.filter((p) => p.teamId === teamId);

  const matches = db.matches.filter(
    (m) => m.tournamentId === tournamentId && (m.teamAId === teamId || m.teamBId === teamId)
  );

  const completed = matches
    .filter((m) => m.status === 'COMPLETED')
    .sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());

  const upcoming = matches
    .filter((m) => m.status === 'SCHEDULED' || m.status === 'READY' || m.status === 'DRAFT')
    .sort((a, b) => new Date(a.date || a.createdAt).getTime() - new Date(b.date || b.createdAt).getTime());

  const recentMatches = completed.map((m) => {
    const isTeamA = m.teamAId === teamId;
    const oppTeam = db.teams.find((t) => t.id === (isTeamA ? m.teamBId : m.teamAId));
    const scoreA = isTeamA ? m.teamAScore : m.teamBScore;
    const scoreB = isTeamA ? m.teamBScore : m.teamAScore;
    const isWin = m.winnerTeamId === teamId;
    const isLoss = m.winnerTeamId && m.winnerTeamId !== teamId;
    return {
      matchId: m.id,
      matchNumber: m.matchNumber,
      round: m.round,
      date: m.date,
      opponentTeamName: oppTeam?.name || 'Opponent',
      opponentTeamLogoUrl: oppTeam?.logoUrl,
      scoreA: typeof scoreA === 'number' ? scoreA : (scoreA as any)?.runs ?? 0,
      scoreB: typeof scoreB === 'number' ? scoreB : (scoreB as any)?.runs ?? 0,
      isWin,
      isLoss,
      isDraw: !isWin && !isLoss,
      resultSummary: m.resultSummary || (isWin ? 'Won' : isLoss ? 'Lost' : 'Drawn'),
    };
  });

  const upcomingMatches = upcoming.map((m) => {
    const isTeamA = m.teamAId === teamId;
    const oppTeam = db.teams.find((t) => t.id === (isTeamA ? m.teamBId : m.teamAId));
    return {
      matchId: m.id,
      matchNumber: m.matchNumber,
      round: m.round,
      date: m.date,
      time: m.time,
      venue: m.venue,
      opponentTeamName: oppTeam?.name || 'Opponent',
      opponentTeamLogoUrl: oppTeam?.logoUrl,
    };
  });

  const leaderboards = getTournamentPlayerLeaderboards(tournamentId);
  const playerLeaders = Object.values(leaderboards)
    .flatMap((cat) => cat.leaders)
    .filter((l) => l.teamId === teamId)
    .slice(0, 5);

  const last5 = recentMatches.slice(0, 5).map((r) => (r.isWin ? 'W' : r.isLoss ? 'L' : 'D') as any);

  return {
    team,
    tournamentId,
    tournamentName: tournament.name,
    sport: tournament.sport,
    groupId: group?.id,
    groupName: group?.name || row?.groupName,
    rank: row?.rank || 1,
    qualificationStatus: row?.qualificationStatus || 'PENDING',
    form: last5,
    played: row?.played || 0,
    won: row?.won || 0,
    lost: row?.lost || 0,
    drawn: row?.drawn || 0,
    tied: row?.tied || 0,
    points: row?.points || 0,
    winPercentage: row?.played ? `${((row.won / row.played) * 100).toFixed(1)}%` : '0.0%',
    sportSpecificMetrics: row?.sportSpecificMetrics || {},
    recentMatches,
    upcomingMatches,
    playerLeaders,
    roster,
  };
}

/**
 * Complete Live Tournament Dashboard Payload
 */
export function getTournamentDashboardData(tournamentId: string): TournamentDashboardData | null {
  const db = getDb();
  const tournament = db.tournaments.find((t) => t.id === tournamentId);
  if (!tournament) return null;

  const matches = db.matches.filter((m) => m.tournamentId === tournamentId);
  const teams = db.teams.filter((t) => t.tournamentId === tournamentId);
  const groups = db.groups.filter((g) => g.tournamentId === tournamentId);
  const teamIds = new Set(teams.map((t) => t.id));
  const players = db.players.filter(
    (p) => p.tournamentId === tournamentId || (p.teamId && teamIds.has(p.teamId))
  );

  const standings = calculateTournamentStandingsDeterministic(tournamentId);
  const teamForm = getTournamentTeamStatsAndForm(tournamentId);
  const leaderboards = getTournamentPlayerLeaderboards(tournamentId);
  const performanceIndex = getTournamentPerformanceIndex(tournamentId);
  const records = getTournamentRecords(tournamentId);
  const awards = getTournamentAwardsRecommendations(tournamentId);
  const bracketState = getBracketState(tournamentId);
  const bracket = bracketState?.bracket;
  const championship = getChampionshipSummary(tournamentId);

  const scheduled = matches.filter((m) => m.status === 'SCHEDULED' || m.status === 'READY' || m.status === 'DRAFT');
  const live = matches.filter((m) => m.status === 'LIVE');
  const completed = matches.filter((m) => m.status === 'COMPLETED');

  // Format Live Matches with contextual scores
  const liveMatches = live.map((m) => {
    const formatted = formatMatchScoreDisplay(m, tournament.sport);
    return {
      ...m,
      liveScoreText: formatted.scoreText,
      liveDetailText: formatted.detailText,
    };
  });

  // Next upcoming match
  const nextMatch = scheduled.sort((a, b) => {
    const tA = new Date(`${a.date || '2099-01-01'}T${a.time || '00:00'}`).getTime();
    const tB = new Date(`${b.date || '2099-01-01'}T${b.time || '00:00'}`).getTime();
    return tA - tB;
  })[0];

  // Recent completed results
  const recentResults = completed
    .sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime())
    .slice(0, 10)
    .map((m) => {
      const winnerTm = teams.find((t) => t.id === m.winnerTeamId);
      return {
        ...m,
        winningTeamName: winnerTm?.name,
        resultSummary: m.resultSummary || (m.winnerTeamId ? `Winner: ${winnerTm?.name}` : 'Match Completed'),
      };
    });

  // Qualified & Eliminated Teams
  const qualifiedTeams = standings.overall
    .filter((r) => r.qualificationStatus === 'QUALIFIED' || r.qualificationStatus === 'MANUAL_QUALIFIED')
    .map((r) => ({
      teamId: r.teamId,
      teamName: r.teamName,
      teamLogoUrl: r.teamLogoUrl,
      groupName: r.groupName,
    }));

  const eliminatedTeams = standings.overall
    .filter((r) => r.qualificationStatus === 'ELIMINATED' || r.qualificationStatus === 'MANUAL_ELIMINATED')
    .map((r) => ({
      teamId: r.teamId,
      teamName: r.teamName,
      teamLogoUrl: r.teamLogoUrl,
      groupName: r.groupName,
    }));

  const leaderRow = standings.overall[0];
  const leaderTeam = leaderRow
    ? {
        teamId: leaderRow.teamId,
        teamName: leaderRow.teamName,
        teamLogoUrl: leaderRow.teamLogoUrl,
        points: leaderRow.points,
        position: 1,
        groupName: leaderRow.groupName,
      }
    : undefined;

  // Determine current phase
  let currentPhase = 'Group Stage';
  if (tournament.status === 'COMPLETED') {
    currentPhase = 'Championship Completed';
  } else if (bracket && bracket.rounds.some((r) => r.matches.some((m) => m.status === 'LIVE' || m.status === 'COMPLETED'))) {
    currentPhase = 'Knockout Stage';
  }

  return {
    tournament,
    stats: {
      totalTeams: teams.length,
      totalGroups: groups.length,
      totalPlayers: players.length,
      matchesScheduled: matches.length,
      matchesCompleted: completed.length,
      matchesLive: live.length,
      upcomingMatches: scheduled.length,
      remainingMatches: matches.length - completed.length,
      currentPhase,
      currentRound: nextMatch?.round || 'Round 1',
    },
    leaderTeam,
    qualifiedTeams,
    eliminatedTeams,
    championStatus: championship,
    liveMatches,
    nextMatch,
    recentResults,
    teamForm,
    playerLeaderboards: leaderboards,
    performanceIndexLeaders: performanceIndex.slice(0, 10),
    records,
    awards,
    standings: {
      groups: standings.groups,
      overall: standings.overall,
    },
    bracket: bracket || undefined,
  };
}

/**
 * Tournament Broadcast & Overlay Payload with Dynamic Graphics Replacements
 */
export function getTournamentBroadcastData(tournamentId: string) {
  const data = getTournamentDashboardData(tournamentId);
  if (!data) return null;

  const topScorerStat = Object.values(data.playerLeaderboards)[0]?.leaders[0];
  const topPI = data.performanceIndexLeaders[0];

  const dynamicReplacements: Record<string, string> = {
    '{{TOURNAMENT_NAME}}': data.tournament.name || 'Tournament',
    '{{TOURNAMENT_LOGO}}': data.tournament.logoUrl || '',
    '{{CURRENT_LEADER}}': data.leaderTeam?.teamName || 'Leader',
    '{{TOP_SCORER}}': topScorerStat ? `${topScorerStat.playerName} (${topScorerStat.statValue} ${topScorerStat.statLabel})` : 'TBD',
    '{{TOP_PLAYER}}': topPI ? `${topPI.playerName} (PI: ${topPI.score})` : 'TBD',
    '{{TOP_TEAM}}': data.leaderTeam?.teamName || 'Leader',
    '{{QUALIFIED_TEAMS}}': data.qualifiedTeams.map((t) => t.teamName).join(', ') || 'In Contention',
    '{{ELIMINATED_TEAMS}}': data.eliminatedTeams.map((t) => t.teamName).join(', ') || 'None',
    '{{UPCOMING_MATCH}}': data.nextMatch ? `${data.nextMatch.teamA?.name} vs ${data.nextMatch.teamB?.name}` : 'TBD',
    '{{LIVE_MATCH}}': data.liveMatches[0] ? `${data.liveMatches[0].liveScoreText}` : 'No Live Matches',
    '{{CHAMPION}}': data.championStatus?.champion?.teamName || 'TBD',
  };

  return {
    tournament: data.tournament,
    stats: data.stats,
    standings: data.standings,
    bracket: data.bracket,
    awards: data.awards,
    dynamicReplacements,
  };
}
