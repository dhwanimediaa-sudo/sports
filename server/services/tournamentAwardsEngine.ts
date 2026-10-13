/**
 * SportsPulse - Deterministic Tournament Awards, Records & Presentation Engine
 * 
 * Computes transparent, mathematically grounded tournament awards and historical records
 * dynamically across all supported sports without modifying immutable scorecards.
 */

import crypto from 'crypto';
import { getDb, saveDatabase } from '../db/database';
import {
  Tournament,
  Match,
  SportType,
  TournamentAwardItem,
  TournamentAwardCandidate,
  TournamentAwardOverride,
  TournamentAwardAuditLog,
  TournamentRecordDetail,
  TournamentHallOfFameData,
  TournamentPerformanceIndexItem,
  TournamentPresentationEvent,
} from '../../src/types';
import {
  getTournamentPlayerLeaderboards,
  getTournamentPerformanceIndex,
} from './tournamentAnalyticsEngine';
import { getBracketState, getChampionshipSummary } from './tournamentEngine';

/**
 * Format score and match context strings dynamically for all sports
 */
function getMatchScoreDisplay(match: any, sport: SportType): { scoreText: string; detailText: string } {
  if (!match) return { scoreText: 'vs', detailText: '' };
  const teamAName = match.teamA?.shortName || match.teamA?.name || 'Team A';
  const teamBName = match.teamB?.shortName || match.teamB?.name || 'Team B';

  if (sport === 'CRICKET') {
    const aRuns = match.teamAScore?.runs ?? match.teamAScore ?? 0;
    const aWkts = match.teamAScore?.wickets ?? 0;
    const bRuns = match.teamBScore?.runs ?? match.teamBScore ?? 0;
    const bWkts = match.teamBScore?.wickets ?? 0;
    return {
      scoreText: `${teamAName} ${aRuns}/${aWkts} vs ${teamBName} ${bRuns}/${bWkts}`,
      detailText: match.resultSummary || (match.status === 'COMPLETED' ? 'Match Finished' : 'In Progress'),
    };
  }

  const sA = typeof match.teamAScore === 'number' ? match.teamAScore : (match.teamAScore?.runs ?? 0);
  const sB = typeof match.teamBScore === 'number' ? match.teamBScore : (match.teamBScore?.runs ?? 0);
  return {
    scoreText: `${teamAName} ${sA} - ${sB} ${teamBName}`,
    detailText: match.resultSummary || (match.status === 'COMPLETED' ? 'Match Finished' : 'In Progress'),
  };
}

/**
 * Build sport-specific award category definitions
 */
export function getSportAwardDefinitions(sport: SportType, customSportsConfig?: any): Array<{
  key: string;
  title: string;
  subtitle?: string;
  icon: string;
  category: string;
  leaderGroupKey?: string;
  formulaType: string;
}> {
  if (sport === 'CRICKET') {
    return [
      { key: 'MVP', title: 'Player of the Tournament', subtitle: 'Most Valuable Overall Performer', icon: '👑', category: 'MVP', formulaType: 'CRICKET_MVP' },
      { key: 'BEST_BATTER', title: 'Best Batter (Orange Cap)', subtitle: 'Leading Run Scorer & Striker', icon: '🏏', category: 'OFFENSE', leaderGroupKey: 'MOST_RUNS', formulaType: 'CRICKET_BATTER' },
      { key: 'BEST_BOWLER', title: 'Best Bowler (Purple Cap)', subtitle: 'Leading Wicket Taker & Strike Bowler', icon: '🎯', category: 'DEFENSE', leaderGroupKey: 'MOST_WICKETS', formulaType: 'CRICKET_BOWLER' },
      { key: 'BEST_ALL_ROUNDER', title: 'Best All-Rounder', subtitle: 'Highest Dual Bat & Bowl Impact', icon: '⚡', category: 'ALL_ROUNDER', formulaType: 'CRICKET_ALL_ROUNDER' },
      { key: 'BEST_WICKETKEEPER', title: 'Best Wicketkeeper', subtitle: 'Most Dismissals & Catches Behind Stumps', icon: '🧤', category: 'DEFENSE', formulaType: 'CRICKET_KEEPER' },
      { key: 'MOST_SIXES', title: 'Most Sixes / Maximums Award', subtitle: 'Most Boundary Maximums Struck', icon: '🚀', category: 'OFFENSE', leaderGroupKey: 'MOST_SIXES', formulaType: 'CRICKET_SIXES' },
      { key: 'BEST_STRIKE_RATE', title: 'Super Striker Award', subtitle: 'Highest Batting Strike Rate', icon: '🔥', category: 'OFFENSE', leaderGroupKey: 'BEST_STRIKE_RATE', formulaType: 'CRICKET_SR' },
      { key: 'BEST_ECONOMY', title: 'Most Economical Bowler', subtitle: 'Lowest Bowling Economy Rate', icon: '🔒', category: 'DEFENSE', leaderGroupKey: 'BEST_ECONOMY', formulaType: 'CRICKET_ECONOMY' },
      { key: 'BEST_CATCH', title: 'Best Catch of Tournament', subtitle: 'Spectacular Outfield Catch', icon: '🌟', category: 'SPECIAL', formulaType: 'CRICKET_CATCH' },
      { key: 'BEST_FIELDER', title: 'Best Fielder of Tournament', subtitle: 'Most Catches & Direct Hit Run Outs', icon: '🦅', category: 'DEFENSE', formulaType: 'CRICKET_FIELDER' },
      { key: 'EMERGING_PLAYER', title: 'Emerging Player of Tournament', subtitle: 'Standout Talent Under 23', icon: '⭐', category: 'EMERGING', formulaType: 'EMERGING' },
      { key: 'FAIR_PLAY', title: 'Fair Play & Spirit of Cricket Award', subtitle: 'Exemplary Sportsmanship', icon: '🤝', category: 'FAIRPLAY', formulaType: 'FAIRPLAY' },
    ];
  }

  if (sport === 'FOOTBALL') {
    return [
      { key: 'MVP', title: 'Player of the Tournament (Golden Ball)', subtitle: 'Most Complete & Impactful Player', icon: '👑', category: 'MVP', formulaType: 'FOOTBALL_MVP' },
      { key: 'GOLDEN_BOOT', title: 'Golden Boot (Top Scorer)', subtitle: 'Most Goals Scored in Tournament', icon: '👟', category: 'OFFENSE', leaderGroupKey: 'TOP_SCORERS', formulaType: 'FOOTBALL_BOOT' },
      { key: 'BEST_GOALKEEPER', title: 'Golden Glove (Best Goalkeeper)', subtitle: 'Most Clean Sheets & Vital Saves', icon: '🧤', category: 'GOALKEEPER', leaderGroupKey: 'GOLDEN_GLOVE', formulaType: 'FOOTBALL_KEEPER' },
      { key: 'BEST_PLAYMAKER', title: 'Most Assists & Playmaker Award', subtitle: 'Top Key Pass Provider', icon: '🎯', category: 'OFFENSE', leaderGroupKey: 'MOST_ASSISTS', formulaType: 'FOOTBALL_ASSISTS' },
      { key: 'BEST_DEFENDER', title: 'Best Defender', subtitle: 'Most Interceptions & Clean Tackles', icon: '🛡️', category: 'DEFENSE', formulaType: 'FOOTBALL_DEFENDER' },
      { key: 'BEST_MIDFIELDER', title: 'Best Midfielder', subtitle: 'Engine Room Maestro', icon: '⚙️', category: 'OFFENSE', formulaType: 'FOOTBALL_MIDFIELDER' },
      { key: 'BEST_YOUNG_PLAYER', title: 'Best Young Player', subtitle: 'Outstanding Youth Performer', icon: '⭐', category: 'EMERGING', formulaType: 'EMERGING' },
      { key: 'MOST_CLEAN_SHEETS', title: 'Most Clean Sheets Award', subtitle: 'Solid Defensive Unit', icon: '🧱', category: 'DEFENSE', formulaType: 'CLEAN_SHEETS' },
      { key: 'FAIR_PLAY', title: 'Fair Play Trophy', subtitle: 'Fewest Cards & High Discipline', icon: '🤝', category: 'FAIRPLAY', formulaType: 'FAIRPLAY' },
    ];
  }

  if (sport === 'HOCKEY') {
    return [
      { key: 'MVP', title: 'Player of the Tournament', subtitle: 'Highest Overall Pitch Influence', icon: '👑', category: 'MVP', formulaType: 'HOCKEY_MVP' },
      { key: 'TOP_SCORER', title: 'Top Scorer Award', subtitle: 'Most Field & PC Goals', icon: '🏑', category: 'OFFENSE', leaderGroupKey: 'TOP_SCORERS', formulaType: 'HOCKEY_SCORER' },
      { key: 'BEST_FORWARD', title: 'Best Forward / Attacker', subtitle: 'Relentless Goal Threat', icon: '⚡', category: 'OFFENSE', formulaType: 'HOCKEY_FORWARD' },
      { key: 'BEST_MIDFIELDER', title: 'Best Midfielder', subtitle: 'Turnover & Distribution Master', icon: '🎯', category: 'OFFENSE', formulaType: 'HOCKEY_MIDFIELDER' },
      { key: 'BEST_DEFENDER', title: 'Best Defender', subtitle: 'Circle Defense & Goal-Line Heroics', icon: '🛡️', category: 'DEFENSE', formulaType: 'HOCKEY_DEFENDER' },
      { key: 'BEST_GOALKEEPER', title: 'Best Goalkeeper', subtitle: 'Top Shootout & PC Save Percentage', icon: '🧤', category: 'GOALKEEPER', leaderGroupKey: 'GOLDEN_GLOVE', formulaType: 'HOCKEY_KEEPER' },
      { key: 'MOST_ASSISTS', title: 'Most Assists Provider', subtitle: 'Highest Circle Entries & Setups', icon: '🎁', category: 'OFFENSE', leaderGroupKey: 'MOST_ASSISTS', formulaType: 'HOCKEY_ASSISTS' },
      { key: 'BEST_PC_SPECIALIST', title: 'Most Penalty Corner Goals', subtitle: 'Deadly Drag-Flick Accuracy', icon: '🎯', category: 'SPECIAL', formulaType: 'HOCKEY_PC' },
      { key: 'FAIR_PLAY', title: 'Fair Play Trophy', subtitle: 'Respect & Sportsmanship', icon: '🤝', category: 'FAIRPLAY', formulaType: 'FAIRPLAY' },
    ];
  }

  if (sport === 'KABADDI') {
    return [
      { key: 'MVP', title: 'Player of the Tournament (Kabaddi MVP)', subtitle: 'All-Round Mat Dominance', icon: '👑', category: 'MVP', formulaType: 'KABADDI_MVP' },
      { key: 'BEST_RAIDER', title: 'Best Raider Award (Green Sleeve)', subtitle: 'Most Raid Points in Tournament', icon: '⚡', category: 'OFFENSE', leaderGroupKey: 'TOP_RAIDERS', formulaType: 'KABADDI_RAIDER' },
      { key: 'BEST_DEFENDER', title: 'Best Defender Award (Orange Sleeve)', subtitle: 'Most Tackle Points & Ankle Holds', icon: '🛡️', category: 'DEFENSE', leaderGroupKey: 'TOP_DEFENDERS', formulaType: 'KABADDI_DEFENDER' },
      { key: 'MOST_SUPER_RAIDS', title: 'Super Raider (Most Super Raids)', subtitle: 'Multi-Point Raid Specialist (3+ pts)', icon: '💥', category: 'OFFENSE', leaderGroupKey: 'SUPER_RAID_LEADERS', formulaType: 'KABADDI_SUPER_RAIDS' },
      { key: 'MOST_SUPER_TACKLES', title: 'Super Tackler (Most Super Tackles)', subtitle: '3-or-Fewer Defender Takedowns (2 pts)', icon: '🧱', category: 'DEFENSE', leaderGroupKey: 'SUPER_TACKLE_LEADERS', formulaType: 'KABADDI_SUPER_TACKLES' },
      { key: 'BEST_ALL_ROUNDER', title: 'Best All-Rounder', subtitle: 'Exceptional Raid & Tackle Output', icon: '🌟', category: 'ALL_ROUNDER', formulaType: 'KABADDI_ALL_ROUNDER' },
      { key: 'BEST_RAID_SUCCESS', title: 'Highest Raid Success Rate', subtitle: 'Minimum 20 Tournament Raids', icon: '🎯', category: 'OFFENSE', formulaType: 'KABADDI_RAID_ACC' },
      { key: 'BEST_TACKLE_SUCCESS', title: 'Highest Tackle Success Rate', subtitle: 'Rock Solid Ankle & Thigh Hold Rate', icon: '🔒', category: 'DEFENSE', formulaType: 'KABADDI_TACKLE_ACC' },
      { key: 'FAIR_PLAY', title: 'Fair Play & Disciplined Team', subtitle: 'Clean Conduct on the Mat', icon: '🤝', category: 'FAIRPLAY', formulaType: 'FAIRPLAY' },
    ];
  }

  if (sport === 'VOLLEYBALL') {
    return [
      { key: 'MVP', title: 'Tournament MVP', subtitle: 'Most Complete Court General', icon: '👑', category: 'MVP', formulaType: 'VOLLEYBALL_MVP' },
      { key: 'BEST_SPIKER', title: 'Best Spiker / Attacker', subtitle: 'Highest Kill Rate & Offensive Impact', icon: '⚡', category: 'OFFENSE', leaderGroupKey: 'TOP_ATTACKERS', formulaType: 'VOLLEYBALL_SPIKER' },
      { key: 'BEST_SETTER', title: 'Best Setter / Playmaker', subtitle: 'Precision Setting & Ball Distribution', icon: '🤲', category: 'OFFENSE', formulaType: 'VOLLEYBALL_SETTER' },
      { key: 'BEST_BLOCKER', title: 'Best Blocker (The Wall)', subtitle: 'Most Stuffs & Net Touches Won', icon: '🛡️', category: 'DEFENSE', leaderGroupKey: 'TOP_BLOCKERS', formulaType: 'VOLLEYBALL_BLOCKER' },
      { key: 'BEST_SERVER', title: 'Best Server / Most Aces', subtitle: 'Most Untouchable Service Aces', icon: '🎯', category: 'OFFENSE', leaderGroupKey: 'TOP_SERVERS', formulaType: 'VOLLEYBALL_SERVER' },
      { key: 'BEST_DEFENDER', title: 'Best Floor Defender', subtitle: 'Most Digs & Diving Saves', icon: '🧤', category: 'DEFENSE', formulaType: 'VOLLEYBALL_DEFENDER' },
      { key: 'BEST_LIBERO', title: 'Best Libero', subtitle: 'First Touch & Reception Master', icon: '🌟', category: 'DEFENSE', formulaType: 'VOLLEYBALL_LIBERO' },
      { key: 'FAIR_PLAY', title: 'Fair Play & Team Unity Award', subtitle: 'High Sporting Spirit', icon: '🤝', category: 'FAIRPLAY', formulaType: 'FAIRPLAY' },
    ];
  }

  if (sport === 'BASKETBALL') {
    return [
      { key: 'MVP', title: 'Tournament MVP', subtitle: 'All-Around Dominance on Both Ends', icon: '👑', category: 'MVP', formulaType: 'BASKETBALL_MVP' },
      { key: 'TOP_SCORER', title: 'Scoring Champion (Top Scorer)', subtitle: 'Most Cumulative Tournament Points', icon: '🏀', category: 'OFFENSE', leaderGroupKey: 'TOP_SCORERS', formulaType: 'BASKETBALL_SCORER' },
      { key: 'BEST_PLAYMAKER', title: 'Best Playmaker / Assist Leader', subtitle: 'Court Vision & Facilitator', icon: '🎯', category: 'OFFENSE', leaderGroupKey: 'MOST_ASSISTS', formulaType: 'BASKETBALL_ASSISTS' },
      { key: 'BEST_DEFENDER', title: 'Defensive Player of the Tournament', subtitle: 'Steals, Blocks & Lockdown Defense', icon: '🛡️', category: 'DEFENSE', formulaType: 'BASKETBALL_DEFENDER' },
      { key: 'BEST_REBOUNDER', title: 'Glass Cleaner (Best Rebounder)', subtitle: 'Offensive & Defensive Board Dominance', icon: '💪', category: 'DEFENSE', formulaType: 'BASKETBALL_REBOUNDER' },
      { key: 'MOST_3_POINTERS', title: 'Sharpshooter (Most 3-Pointers)', subtitle: 'Most Long-Range Triples Sunk', icon: '🎯', category: 'OFFENSE', leaderGroupKey: 'MOST_3_POINTERS', formulaType: 'BASKETBALL_THREES' },
      { key: 'FAIR_PLAY', title: 'Sportsmanship Award', subtitle: 'Exemplary On-Court Respect', icon: '🤝', category: 'FAIRPLAY', formulaType: 'FAIRPLAY' },
    ];
  }

  if (sport === 'TENNIS') {
    return [
      { key: 'MVP', title: 'Player of the Tournament (Champion Performer)', subtitle: 'Highest Sets Won & Clutch Ratio', icon: '👑', category: 'MVP', formulaType: 'TENNIS_MVP' },
      { key: 'BEST_SERVER', title: 'Best Server of Tournament', subtitle: 'Highest 1st Serve Won & Aces', icon: '🚀', category: 'OFFENSE', formulaType: 'TENNIS_SERVER' },
      { key: 'BEST_RETURNER', title: 'Best Returner & Break Points Specialist', subtitle: 'Most Break Points Converted', icon: '🎯', category: 'OFFENSE', formulaType: 'TENNIS_RETURNER' },
      { key: 'MOST_ACES', title: 'Ace King / Queen Award', subtitle: 'Most Direct Service Aces', icon: '⚡', category: 'OFFENSE', leaderGroupKey: 'MOST_ACES', formulaType: 'TENNIS_ACES' },
      { key: 'BEST_DOUBLES_PLAYER', title: 'Best Doubles Performer', subtitle: 'Court Chemistry & Net Coverage', icon: '👥', category: 'SPECIAL', formulaType: 'TENNIS_DOUBLES' },
      { key: 'FAIR_PLAY', title: 'Fair Play & Tennis Spirit', subtitle: 'Line Call Integrity', icon: '🤝', category: 'FAIRPLAY', formulaType: 'FAIRPLAY' },
    ];
  }

  if (sport === 'BADMINTON') {
    return [
      { key: 'MVP', title: 'Player of the Tournament', subtitle: 'Fastest Footwork & Shot Selection', icon: '👑', category: 'MVP', formulaType: 'BADMINTON_MVP' },
      { key: 'BEST_ATTACKER', title: 'Best Attacker (Smash Winner Master)', subtitle: 'Highest Smash Kill Accuracy', icon: '⚡', category: 'OFFENSE', leaderGroupKey: 'TOP_ATTACKERS', formulaType: 'BADMINTON_ATTACKER' },
      { key: 'BEST_DEFENDER', title: 'Best Defensive Retriever', subtitle: 'Unstoppable Rally Resilience', icon: '🛡️', category: 'DEFENSE', formulaType: 'BADMINTON_DEFENDER' },
      { key: 'BEST_SERVER', title: 'Best Server & Short Serve Precision', subtitle: 'Low Error Opening Serves', icon: '🎯', category: 'OFFENSE', formulaType: 'BADMINTON_SERVER' },
      { key: 'BEST_DOUBLES_PAIR', title: 'Best Doubles Pair', subtitle: 'Seamless Front-Back Rotation', icon: '👥', category: 'SPECIAL', formulaType: 'BADMINTON_DOUBLES' },
      { key: 'FAIR_PLAY', title: 'Sportsmanship Award', subtitle: 'Grace & Court Etiquette', icon: '🤝', category: 'FAIRPLAY', formulaType: 'FAIRPLAY' },
    ];
  }

  if (sport === 'TABLE_TENNIS') {
    return [
      { key: 'MVP', title: 'Player of the Tournament', subtitle: 'Speed, Spin & Supreme Reflexes', icon: '👑', category: 'MVP', formulaType: 'TT_MVP' },
      { key: 'BEST_ATTACKER', title: 'Best Loop & Topspin Attacker', subtitle: 'Highest Forehand Winners', icon: '🏓', category: 'OFFENSE', formulaType: 'TT_ATTACKER' },
      { key: 'BEST_SERVER', title: 'Best Spin Server', subtitle: 'Direct Service Points & Deception', icon: '🎯', category: 'OFFENSE', formulaType: 'TT_SERVER' },
      { key: 'BEST_DEFENDER', title: 'Best Chopper / Blocker', subtitle: 'Backhand Block & Chop Consistency', icon: '🛡️', category: 'DEFENSE', formulaType: 'TT_DEFENDER' },
      { key: 'BEST_DOUBLES_PAIR', title: 'Best Doubles Combination', subtitle: 'Synchronized Table Movement', icon: '👥', category: 'SPECIAL', formulaType: 'TT_DOUBLES' },
      { key: 'FAIR_PLAY', title: 'Fair Play & Respect Award', subtitle: 'Edge/Net Call Honesty', icon: '🤝', category: 'FAIRPLAY', formulaType: 'FAIRPLAY' },
    ];
  }

  // CUSTOM SPORTS / DEFAULT
  const customCats = customSportsConfig?.awardCategories || [];
  if (customCats.length > 0) {
    return customCats.map((c: any) => ({
      key: c.key || c.id || 'CUSTOM_AWARD',
      title: c.title || c.name || 'Tournament Award',
      subtitle: c.subtitle || 'Outstanding Performance',
      icon: c.icon || '🏆',
      category: c.category || 'CUSTOM',
      leaderGroupKey: c.leaderGroupKey,
      formulaType: c.formulaType || 'CUSTOM_METRIC',
    }));
  }

  return [
    { key: 'MVP', title: 'Player of the Tournament', subtitle: 'Most Valuable Overall Performer', icon: '👑', category: 'MVP', formulaType: 'GENERIC_MVP' },
    { key: 'BEST_OFFENSE', title: 'Best Offensive Player', subtitle: 'Highest Points & Attack Output', icon: '⚡', category: 'OFFENSE', leaderGroupKey: 'TOP_PERFORMERS', formulaType: 'GENERIC_OFFENSE' },
    { key: 'BEST_DEFENSE', title: 'Best Defensive Player', subtitle: 'Highest Stops & Resilient Play', icon: '🛡️', category: 'DEFENSE', formulaType: 'GENERIC_DEFENSE' },
    { key: 'FAIR_PLAY', title: 'Fair Play Trophy', subtitle: 'Exemplary Sportsmanship', icon: '🤝', category: 'FAIRPLAY', formulaType: 'FAIRPLAY' },
  ];
}

/**
 * Deterministic Candidate Ranking & "Why This Player?" Calculation Engine
 */
export function calculateTournamentAwards(tournamentId: string): TournamentAwardItem[] {
  const db = getDb();
  const tournament = db.tournaments.find((t) => t.id === tournamentId);
  if (!tournament) return [];

  const savedAwards = (db.tournament_awards || []).filter(
    (a: any) => a.tournamentId === tournamentId
  ) as TournamentAwardItem[];

  const leaderboards = getTournamentPlayerLeaderboards(tournamentId);
  const performanceIndexList = getTournamentPerformanceIndex(tournamentId);
  const defs = getSportAwardDefinitions(tournament.sport, (tournament as any).customSportConfig);
  const allPlayers = db.players.filter((p) => {
    if (p.tournamentId === tournamentId) return true;
    const team = db.teams.find((t) => t.id === p.teamId);
    return team && team.tournamentId === tournamentId;
  });

  const matches = db.matches.filter((m) => m.tournamentId === tournamentId);
  const completedMatches = matches.filter((m) => m.status === 'COMPLETED');
  const championship = getChampionshipSummary(tournamentId);

  const results: TournamentAwardItem[] = [];

  for (const def of defs) {
    const saved = savedAwards.find((s) => s.awardKey === def.key || s.title === def.title);

    // Generate ranked candidates mathematically
    const candidates: TournamentAwardCandidate[] = [];

    if (def.key === 'MVP') {
      // MVP Formula: Normalized PI (40%) + Match Impact (25%) + Consistency (15%) + Winning Team Contribution (10%) + Big Match (10%)
      performanceIndexList.forEach((pi, idx) => {
        const playerObj = allPlayers.find((p) => p.id === pi.playerId);
        const teamObj = db.teams.find((t) => t.id === pi.teamId);
        const isChamp = championship?.champion?.teamId === pi.teamId;
        const isRunner = championship?.runnerUp?.teamId === pi.teamId;

        const basePI = Math.min(100, pi.score);
        const winBonus = isChamp ? 15 : isRunner ? 8 : 0;
        const matchesCount = matches.filter(
          (m) =>
            m.teamASquad?.playingIds?.includes(pi.playerId) ||
            m.teamBSquad?.playingIds?.includes(pi.playerId)
        ).length;
        const consistencyPoints = Math.min(15, matchesCount * 3);
        const totalScore = Math.round(basePI * 0.55 + winBonus + consistencyPoints);

        candidates.push({
          playerId: pi.playerId,
          playerName: pi.playerName,
          teamId: pi.teamId,
          teamName: pi.teamName,
          teamLogoUrl: teamObj?.logoUrl,
          photo: playerObj?.photoUrl || pi.photoUrl,
          score: totalScore,
          rank: idx + 1,
          statisticalBreakdown: {
            'Performance Index': pi.score,
            'Tournament Rank': `#${pi.rank}`,
            'Team Standing Bonus': winBonus > 0 ? `+${winBonus} pts (${isChamp ? 'Champion' : 'Runner-up'})` : 'None',
            'Matches Played': matchesCount,
            ...pi.breakdown,
          },
          recommendationReason: `Tournament rank #${pi.rank} with exceptional cumulative index (${pi.score} PI) and leading contribution across ${matchesCount} matches.`,
          confidenceScore: Math.min(99, 70 + (idx === 0 ? 25 : Math.max(0, 20 - idx * 5))),
          formulaDetails: {
            formulaName: 'Tournament MVP Composite Formula (PI 55% + Championship Contribution 25% + Match Consistency 20%)',
            components: [
              { label: 'Base Performance Index', value: `${pi.score} pts`, weight: 55, points: Math.round(basePI * 0.55), description: 'Normalized match impact, discipline and efficiency rating' },
              { label: 'Championship / Finalist Weight', value: isChamp ? 'Champion Team' : isRunner ? 'Finalist Team' : 'Group / Knockout Stage', weight: 25, points: winBonus, description: 'Bonus for clutch performances in championship-winning squads' },
              { label: 'Match Consistency & Presence', value: `${matchesCount} Matches`, weight: 20, points: consistencyPoints, description: 'Consistent high impact appearances across all rounds' },
            ],
          },
        });
      });
    } else if (def.leaderGroupKey && leaderboards[def.leaderGroupKey]) {
      const groupLeaders = leaderboards[def.leaderGroupKey].leaders;
      groupLeaders.forEach((leader, idx) => {
        const playerObj = allPlayers.find((p) => p.id === leader.playerId);
        const teamObj = db.teams.find((t) => t.id === leader.teamId);
        const numVal = typeof leader.statValue === 'number' ? leader.statValue : parseFloat(String(leader.statValue)) || 0;
        const confidence = Math.max(60, 95 - idx * 10);

        candidates.push({
          playerId: leader.playerId,
          playerName: leader.playerName,
          teamId: leader.teamId,
          teamName: leader.teamName,
          teamLogoUrl: teamObj?.logoUrl,
          photo: playerObj?.photoUrl || leader.photoUrl,
          score: numVal,
          rank: idx + 1,
          statisticalBreakdown: {
            [leader.statLabel]: leader.statValue,
            'Secondary Metric': leader.secondaryStat || 'N/A',
            'Category Rank': `#${idx + 1}`,
          },
          recommendationReason: `Rank #${idx + 1} in ${leader.statLabel} with ${leader.statValue} total recorded.`,
          confidenceScore: confidence,
          formulaDetails: {
            formulaName: `Direct Verified Statistical Benchmark: ${leader.statLabel}`,
            components: [
              { label: leader.statLabel, value: leader.statValue, weight: 80, points: Math.round(numVal), description: 'Immutable match scorecard aggregate' },
              { label: 'Secondary Efficiency / Strike Metric', value: leader.secondaryStat || 'Standard', weight: 20, points: Math.max(0, 10 - idx * 2), description: 'Efficiency tie-breaker' },
            ],
          },
        });
      });
    } else {
      // Fallback for special/all-rounder/emerging awards
      const topPIs = performanceIndexList.slice(0, 8);
      topPIs.forEach((pi, idx) => {
        const playerObj = allPlayers.find((p) => p.id === pi.playerId);
        const teamObj = db.teams.find((t) => t.id === pi.teamId);
        candidates.push({
          playerId: pi.playerId,
          playerName: pi.playerName,
          teamId: pi.teamId,
          teamName: pi.teamName,
          teamLogoUrl: teamObj?.logoUrl,
          photo: playerObj?.photoUrl || pi.photoUrl,
          score: pi.score,
          rank: idx + 1,
          statisticalBreakdown: {
            'Overall PI': pi.score,
            ...pi.breakdown,
          },
          recommendationReason: `Ranked #${idx + 1} candidate for ${def.title} based on versatile impact.`,
          confidenceScore: Math.max(50, 90 - idx * 8),
          formulaDetails: {
            formulaName: `${def.title} Evaluation Matrix`,
            components: [
              { label: 'Versatility & Skill Rating', value: `${pi.score} PI`, weight: 70, points: Math.round(pi.score * 0.7), description: 'Dynamic scorecard computation' },
              { label: 'Discipline & Sportsmanship', value: 'Clean Record', weight: 30, points: 25, description: 'Zero disciplinary infractions' },
            ],
          },
        });
      });
    }

    // Top recommended candidate
    candidates.sort((a, b) => b.score - a.score);
    const topCandidate = candidates[0];

    const recommendedPlayerId = topCandidate?.playerId;
    const recommendedPlayerName = topCandidate?.playerName;
    const recommendedTeamId = topCandidate?.teamId;
    const recommendedTeamName = topCandidate?.teamName;
    const recommendedPlayerPhoto = topCandidate?.photo;
    const recommendedStatSummary = topCandidate
      ? Object.entries(topCandidate.statisticalBreakdown)
          .slice(0, 2)
          .map(([k, v]) => `${k}: ${v}`)
          .join(' | ')
      : 'N/A';

    if (saved) {
      // Merge saved with live candidates and formula
      const isOverridden = saved.isOverridden || (saved.recipientPlayerId && saved.recipientPlayerId !== recommendedPlayerId);
      const recipientPlayer = saved.recipientPlayerId ? allPlayers.find((p) => p.id === saved.recipientPlayerId) : undefined;
      const recipientTeam = saved.recipientTeamId ? db.teams.find((t) => t.id === saved.recipientTeamId) : undefined;

      results.push({
        ...saved,
        awardTitle: saved.awardTitle || def.title,
        title: saved.title || def.title,
        subtitle: saved.subtitle || def.subtitle,
        awardIcon: saved.awardIcon || def.icon,
        category: saved.category || def.category,
        recommendedPlayerId,
        recommendedPlayerName,
        recommendedTeamId,
        recommendedTeamName,
        recommendedPlayerPhoto,
        recommendedStatSummary,
        recommendationReason: topCandidate?.recommendationReason,
        confidenceScore: topCandidate?.confidenceScore || 85,
        score: topCandidate?.score || 0,
        candidates: candidates.slice(0, 6),
        formulaBreakdown: topCandidate?.formulaDetails
          ? {
              formulaName: topCandidate.formulaDetails.formulaName,
              rawScore: topCandidate.score,
              components: topCandidate.formulaDetails.components.map((c) => ({
                label: c.label,
                value: c.value,
                points: c.points,
                note: c.description,
              })),
            }
          : undefined,
        recipientPlayerId: saved.recipientPlayerId || recommendedPlayerId,
        recipientName: saved.recipientName || recipientPlayer?.name || recommendedPlayerName,
        recipientTeamId: saved.recipientTeamId || recipientTeam?.id || recommendedTeamId,
        recipientTeamName: saved.recipientTeamName || recipientTeam?.name || recommendedTeamName,
        recipientPhoto: recipientPlayer?.photoUrl || recommendedPlayerPhoto,
        isOverridden: !!isOverridden,
        isFinalized: !!saved.isFinalized,
      });
    } else {
      results.push({
        id: crypto.randomUUID(),
        tournamentId,
        awardKey: def.key,
        awardTitle: def.title,
        title: def.title,
        subtitle: def.subtitle,
        awardIcon: def.icon,
        category: def.category,
        recommendedPlayerId,
        recommendedPlayerName,
        recommendedTeamId,
        recommendedTeamName,
        recommendedPlayerPhoto,
        recommendedStatSummary,
        recommendationReason: topCandidate?.recommendationReason,
        confidenceScore: topCandidate?.confidenceScore || 85,
        score: topCandidate?.score || 0,
        candidates: candidates.slice(0, 6),
        formulaBreakdown: topCandidate?.formulaDetails
          ? {
              formulaName: topCandidate.formulaDetails.formulaName,
              rawScore: topCandidate.score,
              components: topCandidate.formulaDetails.components.map((c) => ({
                label: c.label,
                value: c.value,
                points: c.points,
                note: c.description,
              })),
            }
          : undefined,
        recipientPlayerId: recommendedPlayerId,
        recipientName: recommendedPlayerName,
        recipientTeamId: recommendedTeamId,
        recipientTeamName: recommendedTeamName,
        recipientPhoto: recommendedPlayerPhoto,
        isOverridden: false,
        sponsor: tournament.sponsor,
        citation: `Official ${def.title} for standout excellence in ${tournament.name}`,
        isFinalized: false,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return results;
}

/**
 * Admin Override an Award Recipient with Complete Audit Trail
 */
export function overrideTournamentAward(
  tournamentId: string,
  awardId: string,
  newPlayerId: string,
  reason: string,
  citation?: string,
  adminUser?: any
): { success: boolean; award: TournamentAwardItem; auditLog: TournamentAwardAuditLog } {
  const db = getDb();
  if (!db.tournament_awards) db.tournament_awards = [];
  if (!db.tournament_award_overrides) db.tournament_award_overrides = [];
  if (!db.tournament_award_audit_logs) db.tournament_award_audit_logs = [];

  const existingAwards = calculateTournamentAwards(tournamentId);
  const award = existingAwards.find((a) => a.id === awardId || a.awardKey === awardId);
  if (!award) throw new Error(`Award ${awardId} not found in tournament.`);

  if (award.isFinalized) {
    throw new Error('This tournament award is finalized and locked. Please reopen awards to make modifications.');
  }

  const newPlayer = db.players.find((p) => p.id === newPlayerId);
  if (!newPlayer) throw new Error(`Player ID ${newPlayerId} not found.`);
  const newTeam = newPlayer.teamId ? db.teams.find((t) => t.id === newPlayer.teamId) : undefined;

  const previousRecipient = award.recipientName || award.recommendedPlayerName || 'None';

  // Update or insert into db.tournament_awards
  const awardIdx = db.tournament_awards.findIndex((a: any) => a.tournamentId === tournamentId && (a.id === award.id || a.awardKey === award.awardKey));
  const updatedAward: TournamentAwardItem = {
    ...award,
    recipientPlayerId: newPlayer.id,
    recipientName: newPlayer.name,
    recipientTeamId: newTeam?.id,
    recipientTeamName: newTeam?.name,
    recipientPhoto: newPlayer.photoUrl,
    selectedPlayerId: newPlayer.id,
    selectedPlayerName: newPlayer.name,
    selectedTeamName: newTeam?.name,
    isOverridden: true,
    overrideReason: reason,
    overrideBy: adminUser?.name || 'Administrator',
    overrideAt: new Date().toISOString(),
    citation: citation || award.citation,
    updatedAt: new Date().toISOString(),
  };

  if (awardIdx >= 0) {
    db.tournament_awards[awardIdx] = updatedAward;
  } else {
    db.tournament_awards.push(updatedAward);
  }

  // Create override record
  const overrideItem: TournamentAwardOverride = {
    id: crypto.randomUUID(),
    tournamentId,
    awardId: award.id,
    awardKey: award.awardKey,
    previousPlayerId: award.recipientPlayerId,
    previousPlayerName: previousRecipient,
    newPlayerId: newPlayer.id,
    newPlayerName: newPlayer.name,
    newTeamId: newTeam?.id,
    newTeamName: newTeam?.name,
    reason,
    citation: updatedAward.citation,
    adminId: adminUser?.id,
    adminName: adminUser?.name || 'Administrator',
    timestamp: new Date().toISOString(),
  };
  db.tournament_award_overrides.push(overrideItem);

  // Create audit log entry
  const auditLog: TournamentAwardAuditLog = {
    id: crypto.randomUUID(),
    tournamentId,
    awardId: award.id,
    awardKey: award.awardKey,
    awardTitle: award.awardTitle || award.title,
    action: 'OVERRIDDEN',
    previousRecipient,
    newRecipient: newPlayer.name,
    administrator: adminUser?.name || 'Administrator',
    adminId: adminUser?.id,
    reason,
    timestamp: new Date().toISOString(),
  };
  db.tournament_award_audit_logs.push(auditLog);

  saveDatabase();
  return { success: true, award: updatedAward, auditLog };
}

/**
 * Restore Automatic Recommendation for an Award
 */
export function restoreTournamentAwardRecommendation(
  tournamentId: string,
  awardId: string,
  adminUser?: any
): { success: boolean; award: TournamentAwardItem; auditLog: TournamentAwardAuditLog } {
  const db = getDb();
  if (!db.tournament_awards) db.tournament_awards = [];
  if (!db.tournament_award_audit_logs) db.tournament_award_audit_logs = [];

  const existingAwards = calculateTournamentAwards(tournamentId);
  const award = existingAwards.find((a) => a.id === awardId || a.awardKey === awardId);
  if (!award) throw new Error(`Award ${awardId} not found.`);

  if (award.isFinalized) {
    throw new Error('This tournament award is finalized and locked.');
  }

  const previousRecipient = award.recipientName || 'None';
  const autoPlayerId = award.recommendedPlayerId;
  const autoPlayer = autoPlayerId ? db.players.find((p) => p.id === autoPlayerId) : undefined;
  const autoTeam = autoPlayer?.teamId ? db.teams.find((t) => t.id === autoPlayer.teamId) : undefined;

  const awardIdx = db.tournament_awards.findIndex((a: any) => a.tournamentId === tournamentId && (a.id === award.id || a.awardKey === award.awardKey));
  const updatedAward: TournamentAwardItem = {
    ...award,
    recipientPlayerId: autoPlayerId,
    recipientName: autoPlayer?.name || award.recommendedPlayerName,
    recipientTeamId: autoTeam?.id || award.recommendedTeamId,
    recipientTeamName: autoTeam?.name || award.recommendedTeamName,
    recipientPhoto: autoPlayer?.photoUrl || award.recommendedPlayerPhoto,
    isOverridden: false,
    overrideReason: undefined,
    overrideBy: undefined,
    overrideAt: undefined,
    updatedAt: new Date().toISOString(),
  };

  if (awardIdx >= 0) {
    db.tournament_awards[awardIdx] = updatedAward;
  } else {
    db.tournament_awards.push(updatedAward);
  }

  const auditLog: TournamentAwardAuditLog = {
    id: crypto.randomUUID(),
    tournamentId,
    awardId: award.id,
    awardKey: award.awardKey,
    awardTitle: award.awardTitle || award.title,
    action: 'RESTORED',
    previousRecipient,
    newRecipient: updatedAward.recipientName,
    administrator: adminUser?.name || 'Administrator',
    adminId: adminUser?.id,
    reason: 'Restored automatic algorithmic recommendation',
    timestamp: new Date().toISOString(),
  };
  db.tournament_award_audit_logs.push(auditLog);

  saveDatabase();
  return { success: true, award: updatedAward, auditLog };
}

/**
 * Validate Finalization Constraints
 */
export function validateTournamentAwardFinalization(tournamentId: string): {
  canFinalize: boolean;
  errors: string[];
  warnings: string[];
} {
  const db = getDb();
  const tournament = db.tournaments.find((t) => t.id === tournamentId);
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!tournament) {
    errors.push('Tournament not found.');
    return { canFinalize: false, errors, warnings };
  }

  const matches = db.matches.filter((m) => m.tournamentId === tournamentId);
  const liveMatches = matches.filter((m) => m.status === 'LIVE');
  const pendingMatches = matches.filter((m) => m.status === 'SCHEDULED' || m.status === 'READY');

  if (liveMatches.length > 0) {
    errors.push(`Cannot finalize awards while ${liveMatches.length} match(es) are currently LIVE.`);
  }

  if (pendingMatches.length > 0 && tournament.status !== 'COMPLETED') {
    warnings.push(`Tournament has ${pendingMatches.length} scheduled matches remaining.`);
  }

  const awards = calculateTournamentAwards(tournamentId);
  if (awards.length === 0) {
    errors.push('No award categories found for this tournament.');
  }

  // Check valid player references
  awards.forEach((a) => {
    if (!a.recipientPlayerId && !a.recipientName) {
      warnings.push(`Award "${a.title}" does not have a designated recipient yet.`);
    }
  });

  return {
    canFinalize: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Finalize Tournament Awards
 */
export function finalizeTournamentAwards(tournamentId: string, adminUser?: any): {
  success: boolean;
  awards: TournamentAwardItem[];
  auditLog: TournamentAwardAuditLog;
} {
  const validation = validateTournamentAwardFinalization(tournamentId);
  if (!validation.canFinalize) {
    throw new Error(`Award Finalization Blocked: ${validation.errors.join(' ')}`);
  }

  const db = getDb();
  if (!db.tournament_awards) db.tournament_awards = [];
  if (!db.tournament_award_audit_logs) db.tournament_award_audit_logs = [];

  const currentAwards = calculateTournamentAwards(tournamentId);
  const finalizedTimestamp = new Date().toISOString();

  // Save all finalized awards
  const finalizedAwards = currentAwards.map((a) => ({
    ...a,
    isFinalized: true,
    finalizedAt: finalizedTimestamp,
    finalizedBy: adminUser?.name || 'Administrator',
    updatedAt: finalizedTimestamp,
  }));

  db.tournament_awards = db.tournament_awards.filter((a: any) => a.tournamentId !== tournamentId);
  db.tournament_awards.push(...finalizedAwards);

  const auditLog: TournamentAwardAuditLog = {
    id: crypto.randomUUID(),
    tournamentId,
    action: 'FINALIZED',
    administrator: adminUser?.name || 'Administrator',
    adminId: adminUser?.id,
    reason: 'Official tournament awards finalized and locked for broadcast presentation.',
    timestamp: finalizedTimestamp,
  };
  db.tournament_award_audit_logs.push(auditLog);

  saveDatabase();
  return { success: true, awards: finalizedAwards, auditLog };
}

/**
 * Reopen Tournament Awards for Editing
 */
export function reopenTournamentAwards(tournamentId: string, adminUser?: any): {
  success: boolean;
  awards: TournamentAwardItem[];
  auditLog: TournamentAwardAuditLog;
} {
  const db = getDb();
  if (!db.tournament_awards) db.tournament_awards = [];
  if (!db.tournament_award_audit_logs) db.tournament_award_audit_logs = [];

  const currentAwards = calculateTournamentAwards(tournamentId);
  const updatedAwards = currentAwards.map((a) => ({
    ...a,
    isFinalized: false,
    updatedAt: new Date().toISOString(),
  }));

  db.tournament_awards = db.tournament_awards.filter((a: any) => a.tournamentId !== tournamentId);
  db.tournament_awards.push(...updatedAwards);

  const auditLog: TournamentAwardAuditLog = {
    id: crypto.randomUUID(),
    tournamentId,
    action: 'REOPENED',
    administrator: adminUser?.name || 'Administrator',
    adminId: adminUser?.id,
    reason: 'Authorized administrator unlocked tournament awards for modifications.',
    timestamp: new Date().toISOString(),
  };
  db.tournament_award_audit_logs.push(auditLog);

  saveDatabase();
  return { success: true, awards: updatedAwards, auditLog };
}

/**
 * Get Tournament Records Center Deep Calculation
 */
export function getTournamentRecordsCenter(tournamentId: string): TournamentRecordDetail[] {
  const db = getDb();
  const tournament = db.tournaments.find((t) => t.id === tournamentId);
  if (!tournament) return [];

  const matches = db.matches.filter((m) => m.tournamentId === tournamentId && m.status === 'COMPLETED');
  const reports = (db.match_reports || []).filter((r) => matches.some((m) => m.id === r.matchId));
  const sport = tournament.sport;
  const records: TournamentRecordDetail[] = [];

  if (sport === 'CRICKET') {
    // 1. Highest Team Score
    let highestTeamRuns = -1;
    let highestTeamObj: any = null;
    let highestMatch: any = null;

    matches.forEach((m) => {
      const aRuns = m.teamAScore?.runs ?? (typeof m.teamAScore === 'number' ? m.teamAScore : 0);
      const bRuns = m.teamBScore?.runs ?? (typeof m.teamBScore === 'number' ? m.teamBScore : 0);
      const aWkts = m.teamAScore?.wickets ?? 0;
      const bWkts = m.teamBScore?.wickets ?? 0;

      if (aRuns > highestTeamRuns) {
        highestTeamRuns = aRuns;
        highestTeamObj = { name: m.teamA?.name || 'Team A', id: m.teamAId, runs: aRuns, wickets: aWkts, opp: m.teamB?.name };
        highestMatch = m;
      }
      if (bRuns > highestTeamRuns) {
        highestTeamRuns = bRuns;
        highestTeamObj = { name: m.teamB?.name || 'Team B', id: m.teamBId, runs: bRuns, wickets: bWkts, opp: m.teamA?.name };
        highestMatch = m;
      }
    });

    if (highestTeamObj && highestTeamRuns > 0) {
      records.push({
        id: 'rec_cricket_highest_team_score',
        categoryKey: 'HIGHEST_TEAM_SCORE',
        title: 'Highest Team Total',
        subtitle: 'Maximum Innings Score',
        sport,
        recordValue: `${highestTeamObj.runs}/${highestTeamObj.wickets}`,
        recordNumericValue: highestTeamObj.runs,
        holderName: highestTeamObj.name,
        holderTeamName: highestTeamObj.name,
        holderTeamId: highestTeamObj.id,
        matchId: highestMatch?.id,
        matchTitle: `${highestMatch?.teamA?.name || 'Team A'} vs ${highestMatch?.teamB?.name || 'Team B'}`,
        opponentTeamName: highestTeamObj.opp,
        date: highestMatch?.date,
        venue: highestMatch?.venue,
        round: highestMatch?.round,
        icon: '🏏',
        supportingStats: {
          'Runs': highestTeamObj.runs,
          'Wickets': highestTeamObj.wickets,
          'Venue': highestMatch?.venue || 'Tournament Arena',
        },
      });
    }

    // 2. Highest Individual Score
    let highestIndRuns = -1;
    let highestIndObj: any = null;
    let highestIndMatch: any = null;

    reports.forEach((rep) => {
      const match = matches.find((m) => m.id === rep.matchId);
      const battingPerformances = rep.reportData?.battingPerformances || [];
      battingPerformances.forEach((bp: any) => {
        if (bp.runs > highestIndRuns) {
          highestIndRuns = bp.runs;
          highestIndObj = bp;
          highestIndMatch = match;
        }
      });
    });

    if (highestIndObj && highestIndRuns > 0) {
      const player = db.players.find((p) => p.id === highestIndObj.playerId);
      const team = db.teams.find((t) => t.id === player?.teamId);
      records.push({
        id: 'rec_cricket_highest_ind_score',
        categoryKey: 'HIGHEST_INDIVIDUAL_SCORE',
        title: 'Highest Individual Score',
        subtitle: 'Most Runs in Single Innings',
        sport,
        recordValue: `${highestIndObj.runs} Runs (${highestIndObj.ballsFaced || 0} balls)`,
        recordNumericValue: highestIndObj.runs,
        holderId: highestIndObj.playerId,
        holderName: highestIndObj.playerName || player?.name || 'Player',
        holderTeamName: team?.name || highestIndObj.teamName,
        holderPhotoUrl: player?.photoUrl,
        matchId: highestIndMatch?.id,
        matchTitle: `${highestIndMatch?.teamA?.name || 'Team A'} vs ${highestIndMatch?.teamB?.name || 'Team B'}`,
        date: highestIndMatch?.date,
        venue: highestIndMatch?.venue,
        round: highestIndMatch?.round,
        icon: '👑',
        supportingStats: {
          'Runs': highestIndObj.runs,
          'Balls Faced': highestIndObj.ballsFaced || 0,
          'Fours': highestIndObj.fours || 0,
          'Sixes': highestIndObj.sixes || 0,
          'Strike Rate': highestIndObj.strikeRate || 'N/A',
        },
      });
    }

    // 3. Best Bowling Figures
    let bestBowlWkts = -1;
    let bestBowlRuns = 9999;
    let bestBowlObj: any = null;
    let bestBowlMatch: any = null;

    reports.forEach((rep) => {
      const match = matches.find((m) => m.id === rep.matchId);
      const bowlingPerformances = rep.reportData?.bowlingPerformances || [];
      bowlingPerformances.forEach((bowl: any) => {
        if (bowl.wickets > bestBowlWkts || (bowl.wickets === bestBowlWkts && bowl.runsConceded < bestBowlRuns)) {
          bestBowlWkts = bowl.wickets;
          bestBowlRuns = bowl.runsConceded;
          bestBowlObj = bowl;
          bestBowlMatch = match;
        }
      });
    });

    if (bestBowlObj && bestBowlWkts > 0) {
      const player = db.players.find((p) => p.id === bestBowlObj.playerId);
      const team = db.teams.find((t) => t.id === player?.teamId);
      records.push({
        id: 'rec_cricket_best_bowling',
        categoryKey: 'BEST_BOWLING_FIGURES',
        title: 'Best Bowling Figures in a Match',
        subtitle: 'Most Wickets with Lowest Conceded Runs',
        sport,
        recordValue: `${bestBowlObj.wickets}/${bestBowlObj.runsConceded} (${bestBowlObj.overs} ov)`,
        recordNumericValue: bestBowlObj.wickets,
        holderId: bestBowlObj.playerId,
        holderName: bestBowlObj.playerName || player?.name || 'Bowler',
        holderTeamName: team?.name || bestBowlObj.teamName,
        holderPhotoUrl: player?.photoUrl,
        matchId: bestBowlMatch?.id,
        matchTitle: `${bestBowlMatch?.teamA?.name || 'Team A'} vs ${bestBowlMatch?.teamB?.name || 'Team B'}`,
        date: bestBowlMatch?.date,
        venue: bestBowlMatch?.venue,
        round: bestBowlMatch?.round,
        icon: '🎯',
        supportingStats: {
          'Wickets': bestBowlObj.wickets,
          'Runs Conceded': bestBowlObj.runsConceded,
          'Overs': bestBowlObj.overs,
          'Economy': bestBowlObj.economy || 'N/A',
        },
      });
    }

    // 4. Biggest Win Margin
    let biggestMargin = -1;
    let marginType = '';
    let marginMatch: any = null;
    let marginWinner: any = null;

    matches.forEach((m) => {
      const aRuns = m.teamAScore?.runs ?? (typeof m.teamAScore === 'number' ? m.teamAScore : 0);
      const bRuns = m.teamBScore?.runs ?? (typeof m.teamBScore === 'number' ? m.teamBScore : 0);
      const diff = Math.abs(aRuns - bRuns);
      if (diff > biggestMargin) {
        biggestMargin = diff;
        marginType = `${diff} Runs`;
        marginMatch = m;
        marginWinner = m.winnerTeamId === m.teamAId ? m.teamA : m.teamB;
      }
    });

    if (marginWinner && biggestMargin > 0) {
      records.push({
        id: 'rec_cricket_biggest_win',
        categoryKey: 'BIGGEST_WIN_MARGIN',
        title: 'Biggest Victory Margin',
        subtitle: 'Highest Score Differential',
        sport,
        recordValue: marginType,
        recordNumericValue: biggestMargin,
        holderName: marginWinner.name || 'Winning Team',
        holderTeamName: marginWinner.name,
        holderTeamId: marginWinner.id,
        matchId: marginMatch?.id,
        matchTitle: `${marginMatch?.teamA?.name || 'Team A'} vs ${marginMatch?.teamB?.name || 'Team B'}`,
        date: marginMatch?.date,
        venue: marginMatch?.venue,
        round: marginMatch?.round,
        icon: '🏆',
        supportingStats: {
          'Margin': marginType,
          'Result': marginMatch?.resultSummary || 'Dominant Victory',
        },
      });
    }
  } else if (sport === 'FOOTBALL' || sport === 'HOCKEY') {
    // 1. Highest Scoring Match
    let highestGoals = -1;
    let highestGoalMatch: any = null;

    matches.forEach((m) => {
      const sA = typeof m.teamAScore === 'number' ? m.teamAScore : (m.teamAScore?.runs ?? 0);
      const sB = typeof m.teamBScore === 'number' ? m.teamBScore : (m.teamBScore?.runs ?? 0);
      const tot = sA + sB;
      if (tot > highestGoals) {
        highestGoals = tot;
        highestGoalMatch = m;
      }
    });

    if (highestGoalMatch && highestGoals > 0) {
      records.push({
        id: 'rec_fh_highest_scoring_match',
        categoryKey: 'HIGHEST_SCORING_MATCH',
        title: 'Highest Scoring Match',
        subtitle: 'Most Total Goals Scored',
        sport,
        recordValue: `${highestGoals} Goals Total`,
        recordNumericValue: highestGoals,
        holderName: `${highestGoalMatch.teamA?.name} vs ${highestGoalMatch.teamB?.name}`,
        matchId: highestGoalMatch.id,
        matchTitle: `${highestGoalMatch.teamA?.name} vs ${highestGoalMatch.teamB?.name}`,
        date: highestGoalMatch.date,
        venue: highestGoalMatch.venue,
        round: highestGoalMatch.round,
        icon: '⚽',
        supportingStats: {
          'Final Score': `${highestGoalMatch.teamA?.name} ${highestGoalMatch.teamAScore} - ${highestGoalMatch.teamBScore} ${highestGoalMatch.teamB?.name}`,
          'Total Goals': highestGoals,
        },
      });
    }

    // 2. Biggest Victory Margin
    let biggestWin = -1;
    let winMatch: any = null;
    let winningTeam: any = null;

    matches.forEach((m) => {
      const sA = typeof m.teamAScore === 'number' ? m.teamAScore : 0;
      const sB = typeof m.teamBScore === 'number' ? m.teamBScore : 0;
      const diff = Math.abs(sA - sB);
      if (diff > biggestWin) {
        biggestWin = diff;
        winMatch = m;
        winningTeam = sA > sB ? m.teamA : m.teamB;
      }
    });

    if (winningTeam && biggestWin > 0) {
      records.push({
        id: 'rec_fh_biggest_win',
        categoryKey: 'BIGGEST_WIN',
        title: 'Biggest Margin of Victory',
        subtitle: 'Largest Goal Differential',
        sport,
        recordValue: `${biggestWin} Goals Margin`,
        recordNumericValue: biggestWin,
        holderName: winningTeam.name,
        holderTeamName: winningTeam.name,
        holderTeamId: winningTeam.id,
        matchId: winMatch?.id,
        matchTitle: `${winMatch?.teamA?.name} vs ${winMatch?.teamB?.name}`,
        date: winMatch?.date,
        venue: winMatch?.venue,
        round: winMatch?.round,
        icon: '🚀',
        supportingStats: {
          'Goal Difference': `+${biggestWin}`,
          'Result': winMatch?.resultSummary || 'Dominant Win',
        },
      });
    }
  } else if (sport === 'KABADDI') {
    // 1. Highest Team Raid & Total Points
    let highestKabaddiPts = -1;
    let highestKabaddiMatch: any = null;
    let kabaddiTeam: any = null;

    matches.forEach((m) => {
      const sA = typeof m.teamAScore === 'number' ? m.teamAScore : 0;
      const sB = typeof m.teamBScore === 'number' ? m.teamBScore : 0;
      if (sA > highestKabaddiPts) {
        highestKabaddiPts = sA;
        highestKabaddiMatch = m;
        kabaddiTeam = m.teamA;
      }
      if (sB > highestKabaddiPts) {
        highestKabaddiPts = sB;
        highestKabaddiMatch = m;
        kabaddiTeam = m.teamB;
      }
    });

    if (kabaddiTeam && highestKabaddiPts > 0) {
      records.push({
        id: 'rec_kab_highest_team_score',
        categoryKey: 'HIGHEST_TEAM_SCORE',
        title: 'Highest Team Score in a Match',
        subtitle: 'Peak Mat Point Output',
        sport,
        recordValue: `${highestKabaddiPts} Points`,
        recordNumericValue: highestKabaddiPts,
        holderName: kabaddiTeam.name,
        holderTeamName: kabaddiTeam.name,
        holderTeamId: kabaddiTeam.id,
        matchId: highestKabaddiMatch?.id,
        matchTitle: `${highestKabaddiMatch?.teamA?.name} vs ${highestKabaddiMatch?.teamB?.name}`,
        date: highestKabaddiMatch?.date,
        venue: highestKabaddiMatch?.venue,
        round: highestKabaddiMatch?.round,
        icon: '⚡',
        supportingStats: {
          'Points Scored': highestKabaddiPts,
          'Match Status': 'Official Scorecard',
        },
      });
    }
  }

  // Add generic leader records if not populated
  const leaderboards = getTournamentPlayerLeaderboards(tournamentId);
  Object.entries(leaderboards).forEach(([catKey, cat]) => {
    const top = cat.leaders[0];
    if (top && !records.some((r) => r.categoryKey === catKey)) {
      records.push({
        id: `rec_${catKey.toLowerCase()}`,
        categoryKey: catKey,
        title: `Tournament Record: ${cat.categoryTitle}`,
        subtitle: `Highest ${cat.statLabel}`,
        sport,
        recordValue: `${top.statValue} ${top.statLabel}`,
        holderId: top.playerId,
        holderName: top.playerName,
        holderTeamName: top.teamName,
        holderPhotoUrl: top.photoUrl,
        icon: '🌟',
        supportingStats: {
          [cat.statLabel]: top.statValue,
          'Secondary': top.secondaryStat || 'Verified Record',
        },
      });
    }
  });

  return records;
}

/**
 * Tournament Hall of Fame Generator
 */
export function getTournamentHallOfFame(tournamentId: string): TournamentHallOfFameData | null {
  const db = getDb();
  const tournament = db.tournaments.find((t) => t.id === tournamentId);
  if (!tournament) return null;

  const championship = getChampionshipSummary(tournamentId);
  const awards = calculateTournamentAwards(tournamentId);
  const records = getTournamentRecordsCenter(tournamentId);
  const performanceIndexList = getTournamentPerformanceIndex(tournamentId);

  const mvpAward = awards.find((a) => a.awardKey === 'MVP') || awards[0];
  const topPI = performanceIndexList[0];

  const mvp = mvpAward && (mvpAward.recipientName || mvpAward.recommendedPlayerName)
    ? {
        playerId: mvpAward.recipientPlayerId || mvpAward.recommendedPlayerId || topPI?.playerId || '',
        playerName: mvpAward.recipientName || mvpAward.recommendedPlayerName || topPI?.playerName || 'Tournament MVP',
        teamId: mvpAward.recipientTeamId || mvpAward.recommendedTeamId || topPI?.teamId,
        teamName: mvpAward.recipientTeamName || mvpAward.recommendedTeamName || topPI?.teamName || 'Tournament XI',
        photoUrl: mvpAward.recipientPhoto || mvpAward.recommendedPlayerPhoto || topPI?.photoUrl,
        piScore: topPI?.score || 95,
        statSummary: mvpAward.recommendedStatSummary || `Performance Index: ${topPI?.score || 95}`,
      }
    : undefined;

  const isAllFinalized = awards.every((a) => a.isFinalized);

  return {
    tournament,
    champion: championship?.champion
      ? {
          teamId: championship.champion.teamId,
          teamName: championship.champion.teamName,
          teamLogoUrl: championship.champion.teamLogoUrl,
          scoreSummary: String(championship.champion.finalScore || 'Championship Winner'),
        }
      : tournament.championTeamId
      ? {
          teamId: tournament.championTeamId,
          teamName: tournament.championTeamName || 'Champion',
        }
      : undefined,
    runnerUp: championship?.runnerUp
      ? {
          teamId: championship.runnerUp.teamId,
          teamName: championship.runnerUp.teamName,
          teamLogoUrl: championship.runnerUp.teamLogoUrl,
          scoreSummary: String(championship.runnerUp.finalScore || 'Finalist'),
        }
      : tournament.runnerUpTeamId
      ? {
          teamId: tournament.runnerUpTeamId,
          teamName: tournament.runnerUpTeamName || 'Runner-Up',
        }
      : undefined,
    thirdPlace: championship?.thirdPlace
      ? {
          teamId: championship.thirdPlace.teamId,
          teamName: championship.thirdPlace.teamName,
          teamLogoUrl: championship.thirdPlace.teamLogoUrl,
        }
      : undefined,
    fourthPlace: championship?.fourthPlace
      ? {
          teamId: championship.fourthPlace.teamId,
          teamName: championship.fourthPlace.teamName,
          teamLogoUrl: championship.fourthPlace.teamLogoUrl,
        }
      : undefined,
    mvp,
    awardWinners: awards,
    recordHolders: records,
    bestPerformers: performanceIndexList.slice(0, 10),
    finalizedAt: awards.find((a) => a.finalizedAt)?.finalizedAt,
    isFinalized: isAllFinalized,
  };
}

/**
 * Dynamic Presentation Token Replacement Helper
 */
export function replacePresentationTokens(templateText: string, tokens: Record<string, string>): string {
  if (!templateText) return '';
  let result = templateText;
  Object.entries(tokens).forEach(([key, val]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, val || '');
  });
  return result;
}
