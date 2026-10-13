import crypto from 'crypto';
import {
  GraphicAssignment,
  GraphicPlaylist,
  GraphicScene,
  OnAirState,
  OnAirGraphicItem,
  SportType,
  StudioGraphic,
  Match,
  BroadcastAuditLog,
  BroadcastEventQueueItem,
  BroadcastPriority,
} from '../../src/types';
import { getDb, saveDatabase } from '../db/database';
import { broadcastScoringUpdate, getScoringStateForMatch } from '../routes/scoring';
import { buildGraphicDataContext, resolveStudioGraphic } from './graphicDataResolver';

// In-memory active on-air states indexed by matchId
const onAirStateMap = new Map<string, OnAirState>();

// Interval ticker handle to countdown on-air graphics
let tickerInterval: NodeJS.Timeout | null = null;

/**
 * Standard default assignments builder for all 13 sports
 */
export function generateDefaultAssignmentsForSport(sport: SportType, matchId?: string): GraphicAssignment[] {
  const now = new Date().toISOString();
  const db = getDb();
  const savedGraphics = db.studio_graphics || [];

  // Helper to find a matching graphic by category or name
  const findGraphic = (categoryOrName: string) => {
    const lower = categoryOrName.toLowerCase();
    const g = savedGraphics.find(
      (sg) =>
        (sg.sport === sport || sg.sport === 'CUSTOM') &&
        (sg.category?.toLowerCase() === lower || sg.name?.toLowerCase().includes(lower))
    );
    return g ? { id: g.id, name: g.name } : { id: null, name: undefined };
  };

  const list: GraphicAssignment[] = [];

  const addAssignment = (
    category: GraphicAssignment['category'],
    targetId: string,
    targetName: string,
    targetCategory: string,
    triggerMode: GraphicAssignment['triggerMode'],
    graphicCandidateKey: string,
    duration: number,
    priority: number,
    entryAnimation: GraphicAssignment['entryAnimation'] = 'POP',
    exitAnimation: GraphicAssignment['exitAnimation'] = 'FADE',
    conflictAction: GraphicAssignment['conflictAction'] = 'QUEUE_BEHIND',
    cooldownSeconds = 1.0
  ) => {
    const candidate = findGraphic(graphicCandidateKey);
    list.push({
      id: crypto.randomUUID(),
      sport,
      matchId: matchId || undefined,
      category,
      targetId,
      targetName,
      targetCategory,
      triggerMode,
      assignedGraphicId: candidate.id,
      assignedGraphicName: candidate.name,
      entryAnimation,
      exitAnimation,
      displayDuration: duration,
      priority,
      conflictAction,
      cooldownSeconds,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    });
  };

  // 1. Common MATCH_STATUS assignments
  addAssignment('MATCH_STATUS', 'MATCH_INTRO', 'Match Broadcast Intro', 'Pre-Match', 'MANUAL', 'Scorebug', 6.0, 50, 'ZOOM', 'FADE', 'INTERRUPT');
  addAssignment('MATCH_STATUS', 'MATCH_HEADER', 'Header Bar / Match Info', 'Pre-Match', 'MANUAL', 'Scorebug', 0, 40, 'SLIDE_DOWN', 'SLIDE_UP');
  addAssignment('MATCH_STATUS', 'TEAM_INTRO', 'Team Lineup & Playing Squad', 'Pre-Match', 'MANUAL', 'Scorebug', 7.0, 50, 'SLIDE_LEFT', 'SLIDE_RIGHT');
  addAssignment('MATCH_STATUS', 'TOSS_PRE_MATCH', 'Toss & Pitch Report', 'Pre-Match', 'MANUAL', 'Scorebug', 5.0, 50, 'POP', 'FADE');
  addAssignment('MATCH_STATUS', 'LIVE_SCOREBUG', 'Live Main Scorebug', 'Live In-Play', 'AUTO_MANUAL', 'SCOREBUG', 0, 30, 'SLIDE_UP', 'SLIDE_DOWN');
  addAssignment('MATCH_STATUS', 'PERIOD_BREAK', 'Innings / Half / Period Break', 'Breaks', 'AUTO_MANUAL', 'Scorebug', 8.0, 60, 'ZOOM', 'FADE');
  addAssignment('MATCH_STATUS', 'MATCH_RESULT', 'Final Match Result & Summary', 'Post-Match', 'AUTO_MANUAL', 'MATCH_RESULT', 10.0, 80, 'POP', 'FADE');
  addAssignment('MATCH_STATUS', 'PRESENTATION', 'Post-Match Presentation Ceremony', 'Post-Match', 'MANUAL', 'MILESTONE', 0, 70, 'ZOOM', 'FADE');

  // 2. Common LIVE_DATA assignments
  addAssignment('LIVE_DATA', 'LIVE_SCORE', 'Live Score Counter Lower-Third', 'Telemetry', 'AUTO_MANUAL', 'Scorebug', 0, 30);
  addAssignment('LIVE_DATA', 'ACTIVE_PLAYERS', 'Active Players (Striker / Raider / Server)', 'Telemetry', 'AUTO_MANUAL', 'Scorebug', 0, 30);
  addAssignment('LIVE_DATA', 'PLAYER_STATS', 'Player Profile & Match Figures', 'Stats', 'MANUAL', 'Scorebug', 5.0, 40);
  addAssignment('LIVE_DATA', 'TEAM_LOGOS', 'Team Crests & Identity Banner', 'Branding', 'AUTO', 'Scorebug', 0, 20);
  addAssignment('LIVE_DATA', 'SPONSOR_LOGO', 'Commercial Broadcast Sponsor Bug', 'Branding', 'AUTO', 'Scorebug', 0, 15);

  // 3. Sport Specific EVENTS
  if (sport === 'CRICKET') {
    addAssignment('EVENTS', 'cricket_dot', 'Dot Ball', 'Balls', 'AUTO', 'Scorebug', 1.8, 10, 'FADE', 'FADE', 'QUEUE_BEHIND', 0.5);
    addAssignment('EVENTS', 'cricket_1', 'Single (1 Run)', 'Runs', 'AUTO', 'Scorebug', 2.0, 15, 'FADE', 'FADE', 'QUEUE_BEHIND', 0.5);
    addAssignment('EVENTS', 'cricket_2', 'Two Runs', 'Runs', 'AUTO', 'Scorebug', 2.2, 20, 'FADE', 'FADE', 'QUEUE_BEHIND', 0.5);
    addAssignment('EVENTS', 'cricket_3', 'Three Runs', 'Runs', 'AUTO', 'Scorebug', 2.5, 25, 'FADE', 'FADE', 'QUEUE_BEHIND', 0.5);
    addAssignment('EVENTS', 'cricket_4', 'Boundary Four', 'Boundaries', 'AUTO_MANUAL', 'FOUR', 3.5, 70, 'POP', 'ZOOM', 'INTERRUPT', 1.0);
    addAssignment('EVENTS', 'cricket_6', 'Maximum Six', 'Boundaries', 'AUTO_MANUAL', 'SIX', 4.0, 80, 'ZOOM', 'FADE', 'INTERRUPT', 1.0);
    addAssignment('EVENTS', 'cricket_wicket', 'Wicket Dismissal', 'Dismissals', 'AUTO_MANUAL', 'WICKET', 5.0, 95, 'BOUNCE' as any, 'FADE', 'INTERRUPT', 1.5);
    addAssignment('EVENTS', 'cricket_wide', 'Wide Ball', 'Extras', 'AUTO', 'Scorebug', 2.5, 30, 'SLIDE_DOWN', 'FADE', 'QUEUE_BEHIND', 0.5);
    addAssignment('EVENTS', 'cricket_no_ball', 'No Ball (Free Hit)', 'Extras', 'AUTO_MANUAL', 'Scorebug', 3.5, 60, 'POP', 'FADE', 'INTERRUPT', 1.0);
    addAssignment('EVENTS', 'cricket_free_hit', 'Free Hit Delivery', 'Special', 'AUTO_MANUAL', 'Scorebug', 3.5, 65, 'POP', 'FADE', 'INTERRUPT', 1.0);
    addAssignment('EVENTS', 'cricket_over_end', 'End of Over Summary', 'Overs', 'AUTO_MANUAL', 'Scorebug', 4.0, 50, 'SLIDE_UP', 'SLIDE_DOWN', 'QUEUE_BEHIND', 1.0);
    addAssignment('EVENTS', 'cricket_maiden', 'Maiden Over', 'Overs', 'AUTO_MANUAL', 'Scorebug', 4.0, 60, 'POP', 'FADE', 'QUEUE_BEHIND', 1.0);
    addAssignment('MILESTONES', 'cricket_fifty', 'Batsman 50 (Half Century)', 'Milestones', 'AUTO_MANUAL', 'MILESTONE', 5.0, 85, 'ZOOM', 'FADE', 'INTERRUPT', 2.0);
    addAssignment('MILESTONES', 'cricket_century', 'Batsman 100 (Century)', 'Milestones', 'AUTO_MANUAL', 'MILESTONE', 6.0, 90, 'ZOOM', 'FADE', 'INTERRUPT', 2.0);
    addAssignment('MILESTONES', 'cricket_partnership', 'Partnership Milestone', 'Milestones', 'AUTO_MANUAL', 'PARTNERSHIP', 4.5, 65, 'POP', 'FADE', 'QUEUE_BEHIND', 1.5);
    addAssignment('MILESTONES', 'cricket_potm', 'Player of the Match', 'Awards', 'AUTO_MANUAL', 'MILESTONE', 6.0, 80, 'POP', 'FADE', 'QUEUE_BEHIND', 2.0);
  } else if (sport === 'FOOTBALL') {
    addAssignment('EVENTS', 'football_goal', 'Goal Scored', 'Scoring', 'AUTO_MANUAL', 'GOAL', 5.0, 95, 'ZOOM', 'FADE', 'INTERRUPT', 1.0);
    addAssignment('EVENTS', 'football_yellow_card', 'Yellow Card Booking', 'Cards', 'AUTO_MANUAL', 'Scorebug', 3.5, 60, 'POP', 'FADE', 'QUEUE_BEHIND', 1.0);
    addAssignment('EVENTS', 'football_red_card', 'Red Card Dismissal', 'Cards', 'AUTO_MANUAL', 'Scorebug', 5.0, 90, 'POP', 'FADE', 'INTERRUPT', 1.0);
    addAssignment('EVENTS', 'football_penalty', 'Penalty Kick Awarded', 'Special', 'AUTO_MANUAL', 'Scorebug', 4.0, 75, 'POP', 'FADE', 'INTERRUPT', 1.0);
    addAssignment('EVENTS', 'football_corner', 'Corner Kick', 'Set Piece', 'AUTO', 'Scorebug', 2.5, 30, 'SLIDE_LEFT', 'SLIDE_RIGHT', 'QUEUE_BEHIND', 0.5);
    addAssignment('EVENTS', 'football_sub', 'Player Substitution', 'Squad', 'AUTO_MANUAL', 'Scorebug', 3.5, 45, 'SLIDE_UP', 'SLIDE_DOWN', 'QUEUE_BEHIND', 1.0);
    addAssignment('EVENTS', 'football_halftime', 'Half-Time Whistle', 'Match', 'AUTO_MANUAL', 'Scorebug', 6.0, 70, 'ZOOM', 'FADE', 'INTERRUPT', 1.0);
    addAssignment('EVENTS', 'football_fulltime', 'Full-Time Whistle', 'Match', 'AUTO_MANUAL', 'MATCH_RESULT', 8.0, 90, 'POP', 'FADE', 'INTERRUPT', 1.0);
    addAssignment('MILESTONES', 'football_potm', 'Player of the Match', 'Awards', 'AUTO_MANUAL', 'MILESTONE', 6.0, 80, 'POP', 'FADE', 'QUEUE_BEHIND', 2.0);
  } else if (sport === 'KABADDI') {
    addAssignment('EVENTS', 'kabaddi_touch_point', 'Touch Point', 'Raids', 'AUTO_MANUAL', 'SUPER RAID', 3.0, 60, 'POP', 'FADE', 'QUEUE_BEHIND', 0.5);
    addAssignment('EVENTS', 'kabaddi_bonus_point', 'Bonus Point', 'Raids', 'AUTO_MANUAL', 'Scorebug', 3.0, 60, 'POP', 'FADE', 'QUEUE_BEHIND', 0.5);
    addAssignment('EVENTS', 'kabaddi_super_raid', 'Super Raid (3+ Points)', 'Raids', 'AUTO_MANUAL', 'SUPER RAID', 4.5, 85, 'ZOOM', 'FADE', 'INTERRUPT', 1.0);
    addAssignment('EVENTS', 'kabaddi_tackle_point', 'Tackle Point', 'Defense', 'AUTO_MANUAL', 'Scorebug', 3.0, 60, 'POP', 'FADE', 'QUEUE_BEHIND', 0.5);
    addAssignment('EVENTS', 'kabaddi_super_tackle', 'Super Tackle (2 Points)', 'Defense', 'AUTO_MANUAL', 'SUPER RAID', 4.5, 85, 'ZOOM', 'FADE', 'INTERRUPT', 1.0);
    addAssignment('EVENTS', 'kabaddi_all_out', 'All Out (Lona)', 'Special', 'AUTO_MANUAL', 'SUPER RAID', 5.0, 95, 'POP', 'FADE', 'INTERRUPT', 1.5);
    addAssignment('EVENTS', 'kabaddi_do_or_die', 'Do-or-Die Raid', 'Raids', 'AUTO_MANUAL', 'Scorebug', 3.5, 70, 'POP', 'FADE', 'INTERRUPT', 1.0);
    addAssignment('EVENTS', 'kabaddi_halftime', 'Half Time Break', 'Match', 'AUTO_MANUAL', 'Scorebug', 6.0, 65, 'ZOOM', 'FADE', 'INTERRUPT', 1.0);
    addAssignment('MILESTONES', 'kabaddi_super_10', 'Super 10 (Raid Milestone)', 'Milestones', 'AUTO_MANUAL', 'MILESTONE', 5.0, 80, 'POP', 'FADE', 'INTERRUPT', 1.5);
    addAssignment('MILESTONES', 'kabaddi_high_5', 'High 5 (Tackle Milestone)', 'Milestones', 'AUTO_MANUAL', 'MILESTONE', 5.0, 80, 'POP', 'FADE', 'INTERRUPT', 1.5);
  } else if (sport === 'VOLLEYBALL') {
    addAssignment('EVENTS', 'volleyball_ace', 'Service Ace', 'Points', 'AUTO_MANUAL', 'ACE', 3.5, 75, 'ZOOM', 'FADE', 'INTERRUPT', 1.0);
    addAssignment('EVENTS', 'volleyball_spike_kill', 'Attack Spike Kill', 'Points', 'AUTO_MANUAL', 'SPIKE', 3.5, 70, 'POP', 'FADE', 'QUEUE_BEHIND', 1.0);
    addAssignment('EVENTS', 'volleyball_block_kill', 'Block Kill Point', 'Points', 'AUTO_MANUAL', 'SPIKE', 3.5, 70, 'POP', 'FADE', 'QUEUE_BEHIND', 1.0);
    addAssignment('EVENTS', 'volleyball_set_point', 'Set Point Opportunity', 'Clutch', 'AUTO_MANUAL', 'Scorebug', 3.5, 80, 'POP', 'FADE', 'INTERRUPT', 1.0);
    addAssignment('EVENTS', 'volleyball_match_point', 'Match Point Championship', 'Clutch', 'AUTO_MANUAL', 'Scorebug', 4.5, 90, 'ZOOM', 'FADE', 'INTERRUPT', 1.0);
    addAssignment('EVENTS', 'volleyball_set_won', 'Set Won Concluded', 'Sets', 'AUTO_MANUAL', 'Scorebug', 5.0, 85, 'POP', 'FADE', 'INTERRUPT', 1.0);
    addAssignment('EVENTS', 'volleyball_timeout', 'Technical / Team Timeout', 'Stoppage', 'AUTO_MANUAL', 'Scorebug', 4.0, 50, 'SLIDE_DOWN', 'SLIDE_UP', 'QUEUE_BEHIND', 1.0);
  } else if (sport === 'BASKETBALL') {
    addAssignment('EVENTS', 'basketball_2pt', '2-Point Field Goal', 'Scoring', 'AUTO', 'Scorebug', 2.0, 30, 'FADE', 'FADE', 'QUEUE_BEHIND', 0.5);
    addAssignment('EVENTS', 'basketball_3pt', '3-Point Deep Bomb', 'Scoring', 'AUTO_MANUAL', 'Scorebug', 3.5, 75, 'ZOOM', 'FADE', 'INTERRUPT', 1.0);
    addAssignment('EVENTS', 'basketball_dunk', 'Slam Dunk Highlight', 'Highlights', 'AUTO_MANUAL', 'Scorebug', 3.5, 80, 'POP', 'FADE', 'INTERRUPT', 1.0);
    addAssignment('EVENTS', 'basketball_and_one', 'And-One Opportunity', 'Special', 'AUTO_MANUAL', 'Scorebug', 3.0, 65, 'POP', 'FADE', 'QUEUE_BEHIND', 1.0);
    addAssignment('EVENTS', 'basketball_foul', 'Personal / Technical Foul', 'Fouls', 'AUTO', 'Scorebug', 2.5, 40, 'SLIDE_DOWN', 'FADE', 'QUEUE_BEHIND', 0.5);
    addAssignment('EVENTS', 'basketball_timeout', 'Team Timeout Called', 'Stoppage', 'AUTO_MANUAL', 'Scorebug', 4.0, 50, 'SLIDE_UP', 'SLIDE_DOWN', 'QUEUE_BEHIND', 1.0);
    addAssignment('EVENTS', 'basketball_quarter_end', 'End of Quarter Buzzer', 'Periods', 'AUTO_MANUAL', 'Scorebug', 5.0, 70, 'ZOOM', 'FADE', 'INTERRUPT', 1.0);
  } else if (sport === 'HOCKEY') {
    addAssignment('EVENTS', 'hockey_goal', 'Field Goal Scored', 'Scoring', 'AUTO_MANUAL', 'GOAL', 5.0, 95, 'ZOOM', 'FADE', 'INTERRUPT', 1.0);
    addAssignment('EVENTS', 'hockey_penalty_corner', 'Penalty Corner Awarded', 'Set Piece', 'AUTO_MANUAL', 'Scorebug', 4.0, 70, 'POP', 'FADE', 'INTERRUPT', 1.0);
    addAssignment('EVENTS', 'hockey_penalty_stroke', 'Penalty Stroke Awarded', 'Set Piece', 'AUTO_MANUAL', 'Scorebug', 4.5, 80, 'POP', 'FADE', 'INTERRUPT', 1.0);
    addAssignment('EVENTS', 'hockey_green_card', 'Green Card (2m Suspension)', 'Cards', 'AUTO', 'Scorebug', 3.0, 50, 'SLIDE_LEFT', 'SLIDE_RIGHT', 'QUEUE_BEHIND', 0.5);
    addAssignment('EVENTS', 'hockey_yellow_card', 'Yellow Card (5m/10m)', 'Cards', 'AUTO_MANUAL', 'Scorebug', 3.5, 65, 'POP', 'FADE', 'QUEUE_BEHIND', 1.0);
    addAssignment('EVENTS', 'hockey_red_card', 'Red Card Dismissal', 'Cards', 'AUTO_MANUAL', 'Scorebug', 5.0, 90, 'POP', 'FADE', 'INTERRUPT', 1.0);
    addAssignment('EVENTS', 'hockey_quarter_end', 'Quarter Concluded', 'Periods', 'AUTO_MANUAL', 'Scorebug', 4.5, 60, 'SLIDE_UP', 'SLIDE_DOWN', 'QUEUE_BEHIND', 1.0);
  } else if (sport === 'TENNIS') {
    addAssignment('EVENTS', 'tennis_ace', 'Service Ace', 'Points', 'AUTO_MANUAL', 'ACE', 3.0, 70, 'ZOOM', 'FADE', 'QUEUE_BEHIND', 0.5);
    addAssignment('EVENTS', 'tennis_double_fault', 'Double Fault', 'Faults', 'AUTO', 'Scorebug', 2.5, 30, 'SLIDE_DOWN', 'FADE', 'QUEUE_BEHIND', 0.5);
    addAssignment('EVENTS', 'tennis_break_point', 'Break Point Opportunity', 'Clutch', 'AUTO_MANUAL', 'Scorebug', 3.5, 80, 'POP', 'FADE', 'INTERRUPT', 1.0);
    addAssignment('EVENTS', 'tennis_break_converted', 'Break Point Converted', 'Clutch', 'AUTO_MANUAL', 'Scorebug', 4.0, 85, 'ZOOM', 'FADE', 'INTERRUPT', 1.0);
    addAssignment('EVENTS', 'tennis_deuce', 'Deuce', 'Games', 'AUTO', 'Scorebug', 2.5, 40, 'FADE', 'FADE', 'QUEUE_BEHIND', 0.5);
    addAssignment('EVENTS', 'tennis_set_point', 'Set Point', 'Sets', 'AUTO_MANUAL', 'Scorebug', 4.0, 85, 'POP', 'FADE', 'INTERRUPT', 1.0);
    addAssignment('EVENTS', 'tennis_match_point', 'Championship Match Point', 'Match', 'AUTO_MANUAL', 'Scorebug', 5.0, 95, 'ZOOM', 'FADE', 'INTERRUPT', 1.0);
    addAssignment('EVENTS', 'tennis_set_won', 'Set Concluded', 'Sets', 'AUTO_MANUAL', 'Scorebug', 5.0, 85, 'POP', 'FADE', 'INTERRUPT', 1.0);
  } else if (sport === 'BADMINTON') {
    addAssignment('EVENTS', 'badminton_smash', 'Smash Winner', 'Points', 'AUTO_MANUAL', 'SPIKE', 3.0, 70, 'POP', 'FADE', 'QUEUE_BEHIND', 0.5);
    addAssignment('EVENTS', 'badminton_ace', 'Service Ace', 'Points', 'AUTO_MANUAL', 'ACE', 3.0, 70, 'ZOOM', 'FADE', 'QUEUE_BEHIND', 0.5);
    addAssignment('EVENTS', 'badminton_interval', '11-Point Interval', 'Breaks', 'AUTO_MANUAL', 'Scorebug', 4.5, 60, 'SLIDE_UP', 'SLIDE_DOWN', 'QUEUE_BEHIND', 1.0);
    addAssignment('EVENTS', 'badminton_game_point', 'Game Point', 'Clutch', 'AUTO_MANUAL', 'Scorebug', 3.5, 80, 'POP', 'FADE', 'INTERRUPT', 1.0);
    addAssignment('EVENTS', 'badminton_match_point', 'Match Point', 'Match', 'AUTO_MANUAL', 'Scorebug', 4.5, 90, 'ZOOM', 'FADE', 'INTERRUPT', 1.0);
    addAssignment('EVENTS', 'badminton_game_won', 'Game Concluded', 'Games', 'AUTO_MANUAL', 'Scorebug', 5.0, 85, 'POP', 'FADE', 'INTERRUPT', 1.0);
  } else if (sport === 'TABLE_TENNIS') {
    addAssignment('EVENTS', 'tt_ace', 'Service Ace', 'Points', 'AUTO_MANUAL', 'ACE', 3.0, 70, 'ZOOM', 'FADE', 'QUEUE_BEHIND', 0.5);
    addAssignment('EVENTS', 'tt_edge_ball', 'Edge Ball Point', 'Points', 'AUTO_MANUAL', 'Scorebug', 3.0, 65, 'POP', 'FADE', 'QUEUE_BEHIND', 0.5);
    addAssignment('EVENTS', 'tt_game_point', 'Game Point', 'Clutch', 'AUTO_MANUAL', 'Scorebug', 3.5, 80, 'POP', 'FADE', 'INTERRUPT', 1.0);
    addAssignment('EVENTS', 'tt_match_point', 'Match Point', 'Match', 'AUTO_MANUAL', 'Scorebug', 4.5, 90, 'ZOOM', 'FADE', 'INTERRUPT', 1.0);
    addAssignment('EVENTS', 'tt_game_won', 'Game Concluded', 'Games', 'AUTO_MANUAL', 'Scorebug', 5.0, 85, 'POP', 'FADE', 'INTERRUPT', 1.0);
  } else if (sport === 'PICKLEBALL') {
    addAssignment('EVENTS', 'pickleball_ace', 'Service Ace', 'Points', 'AUTO_MANUAL', 'ACE', 3.0, 70, 'ZOOM', 'FADE', 'QUEUE_BEHIND', 0.5);
    addAssignment('EVENTS', 'pickleball_dink_winner', 'Dink Winner', 'Points', 'AUTO_MANUAL', 'Scorebug', 3.0, 65, 'POP', 'FADE', 'QUEUE_BEHIND', 0.5);
    addAssignment('EVENTS', 'pickleball_atp', 'Around the Post (ATP)', 'Highlights', 'AUTO_MANUAL', 'Scorebug', 3.5, 80, 'ZOOM', 'FADE', 'INTERRUPT', 1.0);
    addAssignment('EVENTS', 'pickleball_erne', 'Erne Shot Winner', 'Highlights', 'AUTO_MANUAL', 'Scorebug', 3.5, 80, 'POP', 'FADE', 'INTERRUPT', 1.0);
    addAssignment('EVENTS', 'pickleball_sideout', 'Side Out (Serve Lost)', 'Match', 'AUTO', 'Scorebug', 2.0, 30, 'FADE', 'FADE', 'QUEUE_BEHIND', 0.5);
  } else if (sport === 'HANDBALL') {
    addAssignment('EVENTS', 'handball_goal', 'Goal Scored', 'Scoring', 'AUTO_MANUAL', 'GOAL', 4.0, 85, 'ZOOM', 'FADE', 'INTERRUPT', 0.5);
    addAssignment('EVENTS', 'handball_penalty_7m', '7-Meter Penalty Awarded', 'Set Piece', 'AUTO_MANUAL', 'Scorebug', 3.5, 70, 'POP', 'FADE', 'INTERRUPT', 1.0);
    addAssignment('EVENTS', 'handball_suspension', '2-Minute Suspension', 'Penalties', 'AUTO_MANUAL', 'Scorebug', 3.5, 65, 'SLIDE_LEFT', 'SLIDE_RIGHT', 'QUEUE_BEHIND', 1.0);
    addAssignment('EVENTS', 'handball_timeout', 'Team Timeout Called', 'Stoppage', 'AUTO_MANUAL', 'Scorebug', 4.0, 50, 'SLIDE_UP', 'SLIDE_DOWN', 'QUEUE_BEHIND', 1.0);
  } else if (sport === 'SQUASH') {
    addAssignment('EVENTS', 'squash_stroke', 'Stroke Awarded', 'Decisions', 'AUTO_MANUAL', 'Scorebug', 3.0, 65, 'POP', 'FADE', 'QUEUE_BEHIND', 0.5);
    addAssignment('EVENTS', 'squash_let', 'Let Called', 'Decisions', 'AUTO', 'Scorebug', 2.5, 40, 'FADE', 'FADE', 'QUEUE_BEHIND', 0.5);
    addAssignment('EVENTS', 'squash_nick', 'Nick Shot Winner', 'Highlights', 'AUTO_MANUAL', 'Scorebug', 3.5, 75, 'ZOOM', 'FADE', 'INTERRUPT', 0.5);
    addAssignment('EVENTS', 'squash_game_point', 'Game Point', 'Clutch', 'AUTO_MANUAL', 'Scorebug', 3.5, 80, 'POP', 'FADE', 'INTERRUPT', 1.0);
    addAssignment('EVENTS', 'squash_match_point', 'Match Point', 'Match', 'AUTO_MANUAL', 'Scorebug', 4.5, 90, 'ZOOM', 'FADE', 'INTERRUPT', 1.0);
  } else {
    // Custom / Multi-Sport
    addAssignment('EVENTS', 'custom_point', 'Point / Score Awarded', 'Scoring', 'AUTO_MANUAL', 'Scorebug', 3.0, 50, 'POP', 'FADE', 'QUEUE_BEHIND', 0.5);
    addAssignment('EVENTS', 'custom_goal', 'Goal / Major Score', 'Scoring', 'AUTO_MANUAL', 'GOAL', 4.5, 85, 'ZOOM', 'FADE', 'INTERRUPT', 1.0);
    addAssignment('EVENTS', 'custom_timeout', 'Timeout Stoppage', 'Stoppage', 'AUTO_MANUAL', 'Scorebug', 4.0, 50, 'SLIDE_DOWN', 'SLIDE_UP', 'QUEUE_BEHIND', 1.0);
    addAssignment('EVENTS', 'custom_foul', 'Foul / Penalty Notice', 'Penalties', 'AUTO', 'Scorebug', 3.0, 45, 'SLIDE_LEFT', 'SLIDE_RIGHT', 'QUEUE_BEHIND', 0.5);
    addAssignment('EVENTS', 'custom_period_end', 'Period / Half Concluded', 'Periods', 'AUTO_MANUAL', 'Scorebug', 4.5, 65, 'ZOOM', 'FADE', 'INTERRUPT', 1.0);
  }

  return list;
}

/**
 * Get or initialize assignments for a given sport & match
 */
export function getAssignmentsForSport(sport: SportType, matchId?: string): GraphicAssignment[] {
  const db = getDb();
  if (!db.graphic_assignments) db.graphic_assignments = [];

  let matches = db.graphic_assignments.filter((a) => {
    if (matchId) {
      return a.matchId === matchId;
    }
    return a.sport === sport && !a.matchId;
  });

  // If no assignments exist yet, bootstrap standard defaults
  if (matches.length === 0) {
    const defaults = generateDefaultAssignmentsForSport(sport, matchId);
    db.graphic_assignments.push(...defaults);
    saveDatabase();
    matches = defaults;
  }

  return matches;
}

/**
 * Save or batch update assignments
 */
export function saveAssignments(assignments: GraphicAssignment[]): GraphicAssignment[] {
  const db = getDb();
  if (!db.graphic_assignments) db.graphic_assignments = [];

  const now = new Date().toISOString();
  assignments.forEach((assignment) => {
    const idx = db.graphic_assignments!.findIndex((a) => a.id === assignment.id);
    if (idx >= 0) {
      db.graphic_assignments![idx] = {
        ...db.graphic_assignments![idx],
        ...assignment,
        updatedAt: now,
      };
    } else {
      db.graphic_assignments!.push({
        ...assignment,
        id: assignment.id || crypto.randomUUID(),
        createdAt: assignment.createdAt || now,
        updatedAt: now,
      });
    }
  });

  saveDatabase();
  return assignments;
}

/**
 * Reset assignments to default catalog
 */
export function resetAssignments(sport: SportType, matchId?: string): GraphicAssignment[] {
  const db = getDb();
  if (!db.graphic_assignments) db.graphic_assignments = [];

  // Remove existing
  db.graphic_assignments = db.graphic_assignments.filter((a) => {
    if (matchId) return a.matchId !== matchId;
    return !(a.sport === sport && !a.matchId);
  });

  const fresh = generateDefaultAssignmentsForSport(sport, matchId);
  db.graphic_assignments.push(...fresh);
  saveDatabase();
  return fresh;
}

/**
 * PLAYLISTS CRUD
 */
export function getPlaylists(sport?: SportType, matchId?: string): GraphicPlaylist[] {
  const db = getDb();
  if (!db.graphic_playlists) db.graphic_playlists = [];

  let list = db.graphic_playlists;
  if (matchId) {
    list = list.filter((p) => p.matchId === matchId || (!p.matchId && (!sport || p.sport === sport)));
  } else if (sport) {
    list = list.filter((p) => p.sport === sport);
  }

  // If no playlists exist, seed a sample broadcast rundown
  if (list.length === 0) {
    const savedGraphics = db.studio_graphics || [];
    const sampleItems = savedGraphics.slice(0, 4).map((g, idx) => ({
      id: crypto.randomUUID(),
      order: idx + 1,
      name: g.name,
      graphicId: g.id,
      graphicName: g.name,
      enabled: true,
      duration: g.displayDuration || 4,
      transition: 'FADE',
      notes: `Play on-air element ${idx + 1}`,
      status: 'IDLE' as const,
    }));

    const defaultPlaylist: GraphicPlaylist = {
      id: crypto.randomUUID(),
      name: `${sport || 'Broadcast'} Match Rundown Playlist`,
      sport: sport || 'CRICKET',
      matchId: matchId || undefined,
      description: 'Master live graphics playlist for match sequence and sponsor loops',
      loop: false,
      items: sampleItems,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.graphic_playlists.push(defaultPlaylist);
    saveDatabase();
    return [defaultPlaylist];
  }

  return list;
}

export function savePlaylist(playlist: Partial<GraphicPlaylist>): GraphicPlaylist {
  const db = getDb();
  if (!db.graphic_playlists) db.graphic_playlists = [];

  const now = new Date().toISOString();
  const existingIdx = playlist.id ? db.graphic_playlists.findIndex((p) => p.id === playlist.id) : -1;

  let saved: GraphicPlaylist;
  if (existingIdx >= 0) {
    saved = {
      ...db.graphic_playlists[existingIdx],
      ...playlist,
      updatedAt: now,
    } as GraphicPlaylist;
    db.graphic_playlists[existingIdx] = saved;
  } else {
    saved = {
      id: playlist.id || crypto.randomUUID(),
      name: playlist.name || 'New Playlist',
      sport: playlist.sport || 'CRICKET',
      matchId: playlist.matchId,
      description: playlist.description || '',
      loop: playlist.loop ?? false,
      items: playlist.items || [],
      createdAt: now,
      updatedAt: now,
    };
    db.graphic_playlists.push(saved);
  }

  saveDatabase();
  return saved;
}

export function deletePlaylist(playlistId: string): boolean {
  const db = getDb();
  if (!db.graphic_playlists) return false;
  const initialLen = db.graphic_playlists.length;
  db.graphic_playlists = db.graphic_playlists.filter((p) => p.id !== playlistId);
  if (db.graphic_playlists.length !== initialLen) {
    saveDatabase();
    return true;
  }
  return false;
}

/**
 * SCENES CRUD
 */
export function getScenes(sport?: SportType, matchId?: string): GraphicScene[] {
  const db = getDb();
  if (!db.graphic_scenes) db.graphic_scenes = [];

  let list = db.graphic_scenes;
  if (matchId) {
    list = list.filter((s) => s.matchId === matchId || (!s.matchId && (!sport || s.sport === sport)));
  } else if (sport) {
    list = list.filter((s) => s.sport === sport);
  }

  // Seed default scenes if empty
  if (list.length === 0) {
    const saved = db.studio_graphics || [];
    const now = new Date().toISOString();

    const sampleScenes: GraphicScene[] = [
      {
        id: crypto.randomUUID(),
        name: 'PRE MATCH INTRO & LINEUPS',
        sport: sport || 'CRICKET',
        matchId: matchId || undefined,
        description: 'Combined pre-game header bar, title sponsor, and starting squads',
        layers: saved.slice(0, 2).map((g, idx) => ({
          id: crypto.randomUUID(),
          name: g.name,
          graphicId: g.id,
          graphicName: g.name,
          enabled: true,
          order: idx + 1,
          opacity: 1,
          offsetX: 0,
          offsetY: 0,
          scale: 1,
        })),
        createdAt: now,
        updatedAt: now,
      },
      {
        id: crypto.randomUUID(),
        name: 'LIVE IN-PLAY SCOREBUG + SPONSOR',
        sport: sport || 'CRICKET',
        matchId: matchId || undefined,
        description: 'Permanent lower-third telemetry bug with floating commercial sponsor badge',
        layers: saved.slice(0, 1).map((g, idx) => ({
          id: crypto.randomUUID(),
          name: g.name,
          graphicId: g.id,
          graphicName: g.name,
          enabled: true,
          order: idx + 1,
          opacity: 1,
          offsetX: 0,
          offsetY: 0,
          scale: 1,
        })),
        createdAt: now,
        updatedAt: now,
      },
      {
        id: crypto.randomUUID(),
        name: 'WICKET & DISMISSAL HIGHLIGHT',
        sport: sport || 'CRICKET',
        matchId: matchId || undefined,
        description: 'Multi-layer wicket banner with batsman card and bowler figures',
        layers: saved
          .filter((g) => g.category?.toLowerCase() === 'wicket')
          .slice(0, 1)
          .map((g, idx) => ({
            id: crypto.randomUUID(),
            name: g.name,
            graphicId: g.id,
            graphicName: g.name,
            enabled: true,
            order: idx + 1,
            opacity: 1,
            offsetX: 0,
            offsetY: 0,
            scale: 1,
          })),
        createdAt: now,
        updatedAt: now,
      },
      {
        id: crypto.randomUUID(),
        name: 'MATCH RESULT & FINAL PRESENTATION',
        sport: sport || 'CRICKET',
        matchId: matchId || undefined,
        description: 'Championship celebration hero layout with Player of the Match citation',
        layers: saved
          .filter((g) => g.category?.toLowerCase() === 'match_result' || g.category?.toLowerCase() === 'milestone')
          .slice(0, 1)
          .map((g, idx) => ({
            id: crypto.randomUUID(),
            name: g.name,
            graphicId: g.id,
            graphicName: g.name,
            enabled: true,
            order: idx + 1,
            opacity: 1,
            offsetX: 0,
            offsetY: 0,
            scale: 1,
          })),
        createdAt: now,
        updatedAt: now,
      },
    ];

    db.graphic_scenes.push(...sampleScenes);
    saveDatabase();
    return sampleScenes;
  }

  return list;
}

export function saveScene(scene: Partial<GraphicScene>): GraphicScene {
  const db = getDb();
  if (!db.graphic_scenes) db.graphic_scenes = [];

  const now = new Date().toISOString();
  const existingIdx = scene.id ? db.graphic_scenes.findIndex((s) => s.id === scene.id) : -1;

  let saved: GraphicScene;
  if (existingIdx >= 0) {
    saved = {
      ...db.graphic_scenes[existingIdx],
      ...scene,
      updatedAt: now,
    } as GraphicScene;
    db.graphic_scenes[existingIdx] = saved;
  } else {
    saved = {
      id: scene.id || crypto.randomUUID(),
      name: scene.name || 'New Scene',
      sport: scene.sport || 'CRICKET',
      matchId: scene.matchId,
      description: scene.description || '',
      layers: scene.layers || [],
      createdAt: now,
      updatedAt: now,
    };
    db.graphic_scenes.push(saved);
  }

  saveDatabase();
  return saved;
}

export function deleteScene(sceneId: string): boolean {
  const db = getDb();
  if (!db.graphic_scenes) return false;
  const initialLen = db.graphic_scenes.length;
  db.graphic_scenes = db.graphic_scenes.filter((s) => s.id !== sceneId);
  if (db.graphic_scenes.length !== initialLen) {
    saveDatabase();
    return true;
  }
  return false;
}

/**
 * Helper to resolve a StudioGraphic or Scene Layer with live match context
 */
export function resolveItemGraphic(graphicId: string, match: Match): StudioGraphic | null {
  const db = getDb();
  const template = (db.studio_graphics || []).find((g) => g.id === graphicId);
  if (!template) return null;

  try {
    const scoringState = getScoringStateForMatch(match);
    const context = buildGraphicDataContext(match, scoringState);
    return resolveStudioGraphic(template, context);
  } catch (err) {
    console.error('Error resolving graphic with live context:', err);
    return template;
  }
}

/**
 * =========================================================================
 * LIVE ON-AIR ENGINE & RELIABLE MASTER BROADCAST CONTROL
 * =========================================================================
 */

// Atomic transition guard per match to prevent double-Take/Clear/Kill race conditions
const transitionLockMap = new Map<string, boolean>();

// Deduplication cache for event triggers (stores up to 500 recent event IDs per match)
const processedEventIdsMap = new Map<string, Set<string>>();

// Cooldown tracking per match and assignment (stores epoch ms timestamp of last trigger)
const assignmentCooldownMap = new Map<string, number>();

// Last played graphic memory for REPLAY per match
const lastPlayedGraphicMap = new Map<string, OnAirGraphicItem>();

export function clearAssignmentCooldowns(matchId?: string): void {
  if (matchId) {
    for (const key of Array.from(assignmentCooldownMap.keys())) {
      if (key.startsWith(`${matchId}:`)) {
        assignmentCooldownMap.delete(key);
      }
    }
    processedEventIdsMap.delete(matchId);
    lastPlayedGraphicMap.delete(matchId);
  } else {
    assignmentCooldownMap.clear();
    processedEventIdsMap.clear();
    lastPlayedGraphicMap.clear();
  }
}

/**
 * Determine high-level broadcast priority category
 */
export function getPriorityLevel(priority: number): BroadcastPriority {
  if (priority >= 90) return 'CRITICAL';
  if (priority >= 70) return 'HIGH';
  if (priority >= 40) return 'NORMAL';
  return 'LOW';
}

/**
 * Audit Logger: records operator and automated broadcast actions
 */
export function logBroadcastAudit(
  matchId: string,
  action: string,
  details?: string,
  graphicOrSceneName?: string,
  operatorName?: string,
  result: 'SUCCESS' | 'FAILED' = 'SUCCESS'
): BroadcastAuditLog {
  const db = getDb();
  if (!db.broadcast_audit_logs) db.broadcast_audit_logs = [];

  const entry: BroadcastAuditLog = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    action,
    matchId,
    details: details || '',
    graphicOrSceneName: graphicOrSceneName || '',
    operatorName: operatorName || 'Broadcast Operator',
    result,
  };

  db.broadcast_audit_logs.unshift(entry);
  if (db.broadcast_audit_logs.length > 500) {
    db.broadcast_audit_logs = db.broadcast_audit_logs.slice(0, 500);
  }
  saveDatabase();
  return entry;
}

export function getBroadcastAuditLogs(matchId?: string): BroadcastAuditLog[] {
  const db = getDb();
  if (!db.broadcast_audit_logs) return [];
  if (matchId) {
    return db.broadcast_audit_logs.filter((l) => l.matchId === matchId);
  }
  return db.broadcast_audit_logs;
}

/**
 * Synchronize all dual-bus & rundown properties on the state object
 * ensuring a single coherent source of truth
 */
export function synchronizeRuntimeState(state: OnAirState): OnAirState {
  state.selectedMatchId = state.matchId;
  state.programContent = state.currentOnAir;
  state.currentGraphic = state.currentOnAir;
  state.previewContent = state.previewGraphic;
  state.previewSceneId = state.previewGraphic?.sceneId || null;
  state.programSceneId = state.currentOnAir?.sceneId || null;
  if (!state.activeGraphics) {
    state.activeGraphics = state.currentOnAir ? [state.currentOnAir] : [];
  } else if (state.currentOnAir && !state.activeGraphics.some((g) => g.id === state.currentOnAir?.id)) {
    state.activeGraphics = [state.currentOnAir, ...state.activeGraphics];
  } else if (!state.currentOnAir && state.activeGraphics.length > 0) {
    state.currentOnAir = state.activeGraphics[0];
  }
  state.queuedGraphics = state.queue || [];
  state.completedGraphics = state.history || [];
  state.currentPlaylistId = state.activePlaylistId || null;
  state.currentPlaylistItemId = (state.queue && state.queue[0]?.playlistItemId) || null;
  state.currentGraphicStartedAt = state.currentOnAir?.startedAt || (state.currentOnAir ? state.currentOnAir.triggeredAt : null);
  state.currentGraphicEndsAt = state.currentOnAir?.endsAt || null;
  state.holdState = Boolean(state.currentOnAir?.isHeld);
  state.holdActive = Boolean(state.currentOnAir?.isHeld);
  state.remainingSeconds = state.currentOnAir ? state.currentOnAir.remainingSeconds : 0;
  
  if (!state.currentOnAir && (!state.activeGraphics || state.activeGraphics.length === 0)) {
    state.transportStatus = 'IDLE';
  } else if (state.currentOnAir?.isHeld) {
    state.transportStatus = 'HOLD';
  } else {
    state.transportStatus = 'ON_AIR';
  }
  state.lastUpdatedAt = state.updatedAt;
  return state;
}

/**
 * Get or initialize unified runtime OnAir state
 */
export function getOnAirState(matchId: string): OnAirState {
  let state = onAirStateMap.get(matchId);
  if (!state) {
    state = {
      matchId,
      selectedMatchId: matchId,
      currentOnAir: null,
      previewGraphic: null,
      programContent: null,
      previewContent: null,
      previewSceneId: null,
      programSceneId: null,
      activeGraphics: [],
      queue: [],
      queuedGraphics: [],
      history: [],
      completedGraphics: [],
      activePlaylistId: null,
      currentPlaylistId: null,
      currentPlaylistItemIndex: 0,
      playlistStatus: 'IDLE',
      transportStatus: 'IDLE',
      eventQueue: [],
      currentEvent: null,
      lastEvent: null,
      currentGraphic: null,
      currentGraphicStartedAt: null,
      currentGraphicEndsAt: null,
      holdState: false,
      holdActive: false,
      replayState: false,
      operatorLockState: false,
      emergencyState: false,
      remainingSeconds: 0,
      lastAction: 'INITIALIZED',
      updatedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
    };
    onAirStateMap.set(matchId, state);
  }
  if (!state.history) state.history = [];
  if (!state.queue) state.queue = [];
  if (!state.eventQueue) state.eventQueue = [];
  if (state.operatorLockState === undefined) state.operatorLockState = false;

  return synchronizeRuntimeState(state);
}

/**
 * Operator Lock Management
 */
export function setOperatorLock(matchId: string, locked: boolean, operatorName?: string): OnAirState {
  const state = getOnAirState(matchId);
  state.operatorLockState = Boolean(locked);
  state.lastAction = locked ? 'BROADCAST LOCKED' : 'BROADCAST UNLOCKED';
  state.updatedAt = new Date().toISOString();
  synchronizeRuntimeState(state);
  logBroadcastAudit(
    matchId,
    locked ? 'LOCK_ENABLED' : 'LOCK_DISABLED',
    `Operator lock ${locked ? 'enabled' : 'disabled'}`,
    undefined,
    operatorName
  );
  broadcastOnAirUpdate(matchId, state);
  return state;
}

export function isOperatorLocked(matchId: string): boolean {
  const state = onAirStateMap.get(matchId);
  return Boolean(state?.operatorLockState);
}

/**
 * Broadcast current on-air state to all active viewers / operators / OBS
 */
export function broadcastOnAirUpdate(matchId: string, state: OnAirState): void {
  const db = getDb();
  const match = (db.matches || []).find((m) => m.id === matchId);
  const config = (db.broadcast_configs || []).find((c) => c.matchId === matchId);
  synchronizeRuntimeState(state);

  let dataContext;
  if (match) {
    try {
      const scoringState = getScoringStateForMatch(match);
      dataContext = buildGraphicDataContext(match, scoringState);
    } catch {
      // safe fallback if scoring state cannot be computed
    }
  }

  broadcastScoringUpdate(matchId, {
    match,
    broadcastConfig: config,
    onAirState: state,
    assignedOnAirGraphic: state.currentOnAir,
    dataContext,
  });
}

/**
 * Safely execute an atomic action with transition lock protection
 */
async function withActionLock<T>(matchId: string, actionName: string, fn: () => Promise<T> | T): Promise<T> {
  if (transitionLockMap.get(matchId)) {
    console.warn(`[ActionLock] Action "${actionName}" ignored: transition lock active for match ${matchId}`);
    return getOnAirState(matchId) as unknown as T;
  }
  transitionLockMap.set(matchId, true);
  try {
    return await fn();
  } finally {
    transitionLockMap.set(matchId, false);
  }
}

/**
 * PREVIEW action: Load target into preview bus
 * Changes in Preview bus NEVER automatically modify Program bus.
 */
export function setPreview(matchId: string, item: Partial<OnAirGraphicItem>, operatorName?: string): OnAirState {
  const state = getOnAirState(matchId);
  const db = getDb();
  const match = (db.matches || []).find((m) => m.id === matchId);

  let resolvedGraphic: StudioGraphic | undefined = undefined;
  let resolvedLayers: OnAirGraphicItem['layers'] = undefined;

  if (item.graphicId && match) {
    resolvedGraphic = resolveItemGraphic(item.graphicId, match) || undefined;
  }

  if (item.layers && match) {
    resolvedLayers = item.layers.map((layer) => ({
      ...layer,
      graphic: layer.graphicId ? resolveItemGraphic(layer.graphicId, match) || undefined : undefined,
    }));
  }

  const duration = item.durationSeconds ?? 4;
  const priority = item.priority ?? 50;

  const previewItem: OnAirGraphicItem = {
    id: item.id || crypto.randomUUID(),
    sourceType: item.sourceType || 'MANUAL',
    sourceId: item.sourceId || '',
    targetId: item.targetId,
    eventName: item.eventName,
    graphicId: item.graphicId,
    graphicName: item.graphicName,
    sceneId: item.sceneId,
    sceneName: item.sceneName,
    playlistId: item.playlistId,
    playlistItemId: item.playlistItemId,
    graphic: resolvedGraphic,
    layers: resolvedLayers,
    entryAnimation: item.entryAnimation || 'POP',
    exitAnimation: item.exitAnimation || 'FADE',
    triggeredAt: new Date().toISOString(),
    durationSeconds: duration,
    remainingSeconds: duration,
    isHeld: duration === 0 || Boolean(item.isHeld),
    triggerSource: item.triggerSource || 'MANUAL',
    triggerMode: item.triggerMode || 'MANUAL',
    priority,
    priorityLevel: item.priorityLevel || getPriorityLevel(priority),
    conflictAction: item.conflictAction || 'QUEUE_BEHIND',
    broadcastEventId: item.broadcastEventId,
  };

  state.previewGraphic = previewItem;
  state.lastAction = `PREVIEW: ${previewItem.graphicName || previewItem.sceneName || previewItem.eventName || 'Graphic'}`;
  state.updatedAt = new Date().toISOString();

  logBroadcastAudit(
    matchId,
    'PREVIEW_CUED',
    `Cued "${previewItem.graphicName || previewItem.sceneName || previewItem.eventName}" to Preview (PST)`,
    previewItem.graphicName || previewItem.sceneName || previewItem.eventName,
    operatorName
  );

  broadcastOnAirUpdate(matchId, state);
  return state;
}

/**
 * TAKE LIVE action: Push preview or target onto program bus atomically
 */
export async function takeLive(
  matchId: string,
  item?: Partial<OnAirGraphicItem>,
  operatorName?: string
): Promise<OnAirState> {
  return withActionLock(matchId, 'TAKE_LIVE', async () => {
    const state = getOnAirState(matchId);
    const db = getDb();
    const match = (db.matches || []).find((m) => m.id === matchId);

    let itemToTake = item;
    if (!itemToTake) {
      itemToTake = state.previewGraphic || undefined;
    }

    if (!itemToTake) {
      if (state.queue.length > 0) {
        itemToTake = state.queue.shift();
      }
    }

    if (!itemToTake) {
      return state;
    }

    let resolvedGraphic: StudioGraphic | undefined = itemToTake.graphic;
    if (!resolvedGraphic && itemToTake.graphicId && match) {
      resolvedGraphic = resolveItemGraphic(itemToTake.graphicId, match) || undefined;
    }

    let resolvedLayers = itemToTake.layers;
    if (itemToTake.layers && match) {
      resolvedLayers = itemToTake.layers.map((layer) => ({
        ...layer,
        graphic: layer.graphic || (layer.graphicId ? resolveItemGraphic(layer.graphicId, match) || undefined : undefined),
      }));
    }

    const duration = itemToTake.durationSeconds ?? 4;
    const nowMs = Date.now();
    const startedAt = new Date(nowMs).toISOString();
    const endsAt = duration > 0 ? nowMs + duration * 1000 : undefined;
    const priority = itemToTake.priority ?? 50;

    const onAirItem: OnAirGraphicItem = {
      id: itemToTake.id || crypto.randomUUID(),
      sourceType: itemToTake.sourceType || 'MANUAL',
      sourceId: itemToTake.sourceId || '',
      targetId: itemToTake.targetId,
      eventName: itemToTake.eventName,
      graphicId: itemToTake.graphicId,
      graphicName: itemToTake.graphicName,
      sceneId: itemToTake.sceneId,
      sceneName: itemToTake.sceneName,
      playlistId: itemToTake.playlistId,
      playlistItemId: itemToTake.playlistItemId,
      graphic: resolvedGraphic,
      layers: resolvedLayers,
      entryAnimation: itemToTake.entryAnimation || 'POP',
      exitAnimation: itemToTake.exitAnimation || 'FADE',
      triggeredAt: itemToTake.triggeredAt || startedAt,
      startedAt,
      endsAt,
      durationSeconds: duration,
      remainingSeconds: duration,
      isHeld: duration === 0 || Boolean(itemToTake.isHeld),
      triggerSource: itemToTake.triggerSource || 'MANUAL',
      triggerMode: itemToTake.triggerMode || 'MANUAL',
      priority,
      priorityLevel: itemToTake.priorityLevel || getPriorityLevel(priority),
      conflictAction: itemToTake.conflictAction || 'QUEUE_BEHIND',
      broadcastEventId: itemToTake.broadcastEventId,
    };

    if (!state.history) state.history = [];
    if (state.currentOnAir) {
      const prev = state.history.find((h) => h.id === state.currentOnAir?.id);
      if (prev && prev.status === 'ON_AIR') {
        prev.status = 'COMPLETED';
        prev.finishedAt = startedAt;
      }
    }

    // Set new program item and clear preview so PST is ready for next cued asset
    state.currentOnAir = onAirItem;
    if (state.previewGraphic?.id === onAirItem.id) {
      state.previewGraphic = null;
    }

    state.history.unshift({
      id: onAirItem.id,
      graphicName: onAirItem.graphicName || onAirItem.sceneName || onAirItem.eventName || 'Graphic',
      eventName: onAirItem.eventName || onAirItem.graphicName || 'Event',
      sourceType: onAirItem.sourceType || 'MANUAL',
      priority: onAirItem.priority || 50,
      priorityLevel: onAirItem.priorityLevel,
      triggeredAt: onAirItem.triggeredAt,
      startedAt,
      status: 'ON_AIR',
      durationSeconds: onAirItem.durationSeconds,
      remainingSeconds: onAirItem.remainingSeconds,
    });
    if (state.history.length > 50) state.history = state.history.slice(0, 50);

    state.lastAction = `TAKE LIVE: ${onAirItem.graphicName || onAirItem.sceneName || onAirItem.eventName || 'Graphic'}`;
    state.updatedAt = startedAt;

    logBroadcastAudit(
      matchId,
      'TAKE_LIVE',
      `Pushed "${onAirItem.graphicName || onAirItem.sceneName || onAirItem.eventName}" Live to Program (PGM) with duration ${duration}s`,
      onAirItem.graphicName || onAirItem.sceneName || onAirItem.eventName,
      operatorName
    );

    ensureTickerRunning();
    broadcastOnAirUpdate(matchId, state);
    return state;
  });
}

/**
 * INDEPENDENT PLAY: Play a specific graphic layer without clearing other active layers
 * Supports persistent (duration = 0) and timed durations.
 */
export async function playGraphic(
  matchId: string,
  item: Partial<OnAirGraphicItem>,
  operatorName?: string
): Promise<OnAirState> {
  return withActionLock(matchId, 'PLAY_GRAPHIC', async () => {
    const state = getOnAirState(matchId);
    const db = getDb();
    const match = (db.matches || []).find((m) => m.id === matchId);

    let resolvedGraphic: StudioGraphic | undefined = item.graphic;
    if (!resolvedGraphic && item.graphicId && match) {
      resolvedGraphic = resolveItemGraphic(item.graphicId, match) || undefined;
    }

    let resolvedLayers = item.layers;
    if (item.layers && match) {
      resolvedLayers = item.layers.map((layer) => ({
        ...layer,
        graphic: layer.graphic || (layer.graphicId ? resolveItemGraphic(layer.graphicId, match) || undefined : undefined),
      }));
    }

    const duration = item.durationSeconds !== undefined ? item.durationSeconds : 0;
    const nowMs = Date.now();
    const startedAt = new Date(nowMs).toISOString();
    const endsAt = duration > 0 ? nowMs + duration * 1000 : undefined;
    const priority = item.priority ?? 50;

    const onAirItem: OnAirGraphicItem = {
      id: item.id || crypto.randomUUID(),
      sourceType: item.sourceType || 'MANUAL',
      sourceId: item.sourceId || '',
      targetId: item.targetId,
      eventName: item.eventName,
      graphicId: item.graphicId,
      graphicName: item.graphicName || resolvedGraphic?.name || item.eventName || 'Graphic',
      sceneId: item.sceneId,
      sceneName: item.sceneName,
      playlistId: item.playlistId,
      playlistItemId: item.playlistItemId,
      graphic: resolvedGraphic,
      layers: resolvedLayers,
      entryAnimation: item.entryAnimation || 'POP',
      exitAnimation: item.exitAnimation || 'FADE',
      triggeredAt: item.triggeredAt || startedAt,
      startedAt,
      endsAt,
      durationSeconds: duration,
      remainingSeconds: duration,
      isHeld: duration === 0 || Boolean(item.isHeld),
      triggerSource: item.triggerSource || 'MANUAL',
      triggerMode: item.triggerMode || 'MANUAL',
      priority,
      priorityLevel: item.priorityLevel || getPriorityLevel(priority),
      conflictAction: item.conflictAction || 'INTERRUPT',
      broadcastEventId: item.broadcastEventId,
    };

    if (!state.activeGraphics) state.activeGraphics = [];

    // Check if layer already exists (by graphicId, targetId, sceneId, or ID)
    const existingIndex = state.activeGraphics.findIndex((g) =>
      (onAirItem.graphicId && g.graphicId === onAirItem.graphicId) ||
      (onAirItem.targetId && g.targetId === onAirItem.targetId) ||
      (onAirItem.sceneId && g.sceneId === onAirItem.sceneId) ||
      g.id === onAirItem.id
    );

    if (existingIndex >= 0) {
      state.activeGraphics[existingIndex] = onAirItem;
    } else {
      state.activeGraphics.push(onAirItem);
    }

    state.currentOnAir = onAirItem;
    lastPlayedGraphicMap.set(matchId, onAirItem);

    if (!state.history) state.history = [];
    state.history.unshift({
      id: onAirItem.id,
      graphicName: onAirItem.graphicName || 'Graphic',
      eventName: onAirItem.eventName || onAirItem.graphicName || 'Event',
      sourceType: onAirItem.sourceType || 'MANUAL',
      priority: onAirItem.priority || 50,
      priorityLevel: onAirItem.priorityLevel,
      triggeredAt: onAirItem.triggeredAt,
      startedAt,
      status: 'ON_AIR',
      durationSeconds: onAirItem.durationSeconds,
      remainingSeconds: onAirItem.remainingSeconds,
    });
    if (state.history.length > 50) state.history = state.history.slice(0, 50);

    state.lastAction = `PLAY: ${onAirItem.graphicName} (${duration === 0 ? 'PERSISTENT' : `${duration}s`})`;
    state.updatedAt = startedAt;

    logBroadcastAudit(
      matchId,
      'PLAY_GRAPHIC',
      `Played graphic "${onAirItem.graphicName}" to Program. Duration: ${duration === 0 ? 'PERSISTENT' : `${duration}s`}. Active layers: ${state.activeGraphics.length}`,
      onAirItem.graphicName,
      operatorName
    );

    ensureTickerRunning();
    synchronizeRuntimeState(state);
    broadcastOnAirUpdate(matchId, state);
    return state;
  });
}

/**
 * INDEPENDENT STOP: Stop only a specific graphic without clearing other active layers
 */
export function stopGraphic(matchId: string, graphicIdentifier: string, operatorName?: string): OnAirState {
  const state = getOnAirState(matchId);
  const now = new Date().toISOString();
  if (!state.activeGraphics) state.activeGraphics = [];

  const index = state.activeGraphics.findIndex((g) =>
    g.id === graphicIdentifier ||
    g.graphicId === graphicIdentifier ||
    g.targetId === graphicIdentifier ||
    g.sceneId === graphicIdentifier ||
    (g.graphicName && g.graphicName.toLowerCase() === graphicIdentifier.toLowerCase())
  );

  if (index !== -1) {
    const stopped = state.activeGraphics.splice(index, 1)[0];
    if (state.history) {
      const h = state.history.find((item) => item.id === stopped.id);
      if (h && h.status === 'ON_AIR') {
        h.status = 'COMPLETED';
        h.finishedAt = now;
      }
    }

    if (state.currentOnAir?.id === stopped.id || state.currentOnAir?.graphicId === stopped.graphicId) {
      state.currentOnAir = state.activeGraphics[state.activeGraphics.length - 1] || null;
    }

    state.lastAction = `STOPPED: ${stopped.graphicName || stopped.eventName || 'Graphic'}`;
    state.updatedAt = now;

    logBroadcastAudit(
      matchId,
      'STOP_GRAPHIC',
      `Stopped graphic "${stopped.graphicName || stopped.eventName}". (${state.activeGraphics.length} layer(s) remaining)`,
      stopped.graphicName,
      operatorName
    );

    synchronizeRuntimeState(state);
    broadcastOnAirUpdate(matchId, state);
  }

  return state;
}

/**
 * HOLD action: Freeze countdown timer or release hold
 */
export function holdOnAir(matchId: string, operatorName?: string): OnAirState {
  const state = getOnAirState(matchId);
  if (state.currentOnAir) {
    if (!state.currentOnAir.isHeld) {
      // Freezing graphic on air
      state.currentOnAir.isHeld = true;
      state.holdActive = true;
      state.holdState = true;
      if (state.currentOnAir.endsAt) {
        state.currentOnAir.remainingSeconds = Math.max(0, Math.ceil((state.currentOnAir.endsAt - Date.now()) / 1000));
        delete state.currentOnAir.endsAt;
      }
      state.lastAction = 'HOLD ON';
      logBroadcastAudit(
        matchId,
        'HOLD_ON',
        `Held graphic "${state.currentOnAir.graphicName || state.currentOnAir.eventName}" at ${state.currentOnAir.remainingSeconds}s remaining`,
        state.currentOnAir.graphicName,
        operatorName
      );
    } else {
      // Releasing hold: recalculate fresh endsAt
      state.currentOnAir.isHeld = false;
      state.holdActive = false;
      state.holdState = false;
      if (state.currentOnAir.remainingSeconds > 0) {
        state.currentOnAir.endsAt = Date.now() + state.currentOnAir.remainingSeconds * 1000;
      }
      state.lastAction = 'HOLD RELEASED';
      logBroadcastAudit(
        matchId,
        'HOLD_RELEASED',
        `Released hold on "${state.currentOnAir.graphicName || state.currentOnAir.eventName}", resuming timer`,
        state.currentOnAir.graphicName,
        operatorName
      );
    }

    state.updatedAt = new Date().toISOString();
    broadcastOnAirUpdate(matchId, state);
  }
  return state;
}

/**
 * CLEAR action: Immediately cut on-air graphic safely
 * Preview remains unchanged.
 */
export function clearOnAir(matchId: string, operatorName?: string): OnAirState {
  const state = getOnAirState(matchId);
  const now = new Date().toISOString();
  if (state.currentOnAir && state.history) {
    const prev = state.history.find((h) => h.id === state.currentOnAir?.id);
    if (prev && prev.status === 'ON_AIR') {
      prev.status = 'COMPLETED';
      prev.finishedAt = now;
    }
  }

  if (state.currentOnAir) {
    lastPlayedGraphicMap.set(matchId, { ...state.currentOnAir });
  }

  const clearedName = state.currentOnAir?.graphicName || state.currentOnAir?.eventName || 'Program Graphic';
  state.currentOnAir = null;
  state.activeGraphics = [];
  state.queue = [];
  state.holdActive = false;
  state.holdState = false;
  state.lastAction = 'CLEAR ON-AIR';
  state.updatedAt = now;

  logBroadcastAudit(
    matchId,
    'CLEAR_PROGRAM',
    `Cut Program to black/idle, cleared "${clearedName}"`,
    clearedName,
    operatorName
  );

  broadcastOnAirUpdate(matchId, state);
  return state;
}

/**
 * REPLAY action: Re-fire currently active, preview, or last on-air graphic with fresh live match context
 */
export async function replayOnAir(matchId: string, operatorName?: string): Promise<OnAirState> {
  const state = getOnAirState(matchId);
  if (state.currentOnAir) {
    const item = { ...state.currentOnAir, id: crypto.randomUUID() };
    lastPlayedGraphicMap.set(matchId, { ...item });
    logBroadcastAudit(matchId, 'REPLAY', `Replayed on-air graphic "${item.graphicName}" with fresh data`, item.graphicName, operatorName);
    return takeLive(matchId, item, operatorName);
  }
  if (state.previewGraphic) {
    logBroadcastAudit(matchId, 'REPLAY', `Fired cued preview graphic "${state.previewGraphic.graphicName}"`, state.previewGraphic.graphicName, operatorName);
    return takeLive(matchId, state.previewGraphic, operatorName);
  }
  if (lastPlayedGraphicMap.has(matchId)) {
    const lastItem = lastPlayedGraphicMap.get(matchId)!;
    const item: Partial<OnAirGraphicItem> = {
      ...lastItem,
      id: crypto.randomUUID(),
      triggeredAt: new Date().toISOString(),
      remainingSeconds: lastItem.durationSeconds || 4,
    };
    logBroadcastAudit(matchId, 'REPLAY', `Replayed last graphic "${lastItem.graphicName || lastItem.eventName}" from memory`, lastItem.graphicName, operatorName);
    return takeLive(matchId, item, operatorName);
  }
  if (state.history && state.history.length > 0) {
    const lastHist = state.history[0];
    const item: Partial<OnAirGraphicItem> = {
      id: crypto.randomUUID(),
      graphicId: lastHist.graphicId,
      graphicName: lastHist.graphicName,
      eventName: lastHist.eventName,
      durationSeconds: lastHist.durationSeconds || 4,
      remainingSeconds: lastHist.durationSeconds || 4,
    };
    logBroadcastAudit(matchId, 'REPLAY', `Replayed last graphic "${lastHist.graphicName}" from history`, lastHist.graphicName, operatorName);
    return takeLive(matchId, item, operatorName);
  }
  return state;
}

/**
 * NEXT action: Advance safely to next in playlist or queue
 */
export async function nextInPlaylistOrQueue(matchId: string, operatorName?: string): Promise<OnAirState> {
  const state = getOnAirState(matchId);

  // If items exist in queue, take the first valid queued item
  if (state.queue.length > 0) {
    const nextItem = state.queue.shift();
    logBroadcastAudit(matchId, 'NEXT_QUEUE', `Advanced to queued graphic: "${nextItem?.graphicName || nextItem?.eventName}"`, nextItem?.graphicName, operatorName);
    return takeLive(matchId, nextItem, operatorName);
  }

  // If active playlist is running, safely advance through rundown
  if (state.activePlaylistId) {
    const db = getDb();
    const playlist = (db.graphic_playlists || []).find((p) => p.id === state.activePlaylistId);
    if (playlist && playlist.items && playlist.items.length > 0) {
      let nextIdx = (state.currentPlaylistItemIndex ?? 0) + 1;
      if (nextIdx >= playlist.items.length) {
        if (playlist.loop) {
          nextIdx = 0;
        } else {
          state.currentOnAir = null;
          state.playlistStatus = 'STOPPED';
          state.lastAction = 'PLAYLIST FINISHED';
          logBroadcastAudit(matchId, 'PLAYLIST_FINISHED', `Rundown "${playlist.name}" completed all items`, playlist.name, operatorName);
          broadcastOnAirUpdate(matchId, state);
          return state;
        }
      }

      state.currentPlaylistItemIndex = nextIdx;
      const pItem = playlist.items[nextIdx];

      // Playlist Error Safety: check if referenced graphic exists in database
      const graphicExists = (db.studio_graphics || []).some((g) => g.id === pItem.graphicId);
      if (!graphicExists) {
        pItem.status = 'ERROR';
        pItem.errorMessage = 'Referenced graphic template is missing or was deleted.';
        logBroadcastAudit(
          matchId,
          'PLAYLIST_ITEM_ERROR',
          `Skipping missing graphic in playlist item #${nextIdx + 1} "${pItem.name}"`,
          pItem.name,
          operatorName,
          'FAILED'
        );
        // Recursively or iteratively check if there's a subsequent item
        if (playlist.items.length > nextIdx + 1) {
          return nextInPlaylistOrQueue(matchId, operatorName);
        } else {
          return clearOnAir(matchId, operatorName);
        }
      }

      pItem.status = 'ON_AIR';
      pItem.startedAt = new Date().toISOString();
      state.playlistStatus = 'PLAYING';

      return takeLive(matchId, {
        sourceType: 'PLAYLIST',
        sourceId: playlist.id,
        playlistId: playlist.id,
        playlistItemId: pItem.id,
        graphicId: pItem.graphicId,
        graphicName: pItem.graphicName,
        durationSeconds: pItem.duration || 4,
        triggerSource: 'MANUAL',
      }, operatorName);
    }
  }

  return clearOnAir(matchId, operatorName);
}

/**
 * SKIP action: Safely skip top queued item or current playlist item
 */
export function skipQueued(matchId: string, index = 0, operatorName?: string): OnAirState {
  const state = getOnAirState(matchId);
  if (state.queue.length > index) {
    const skipped = state.queue.splice(index, 1)[0];
    state.lastAction = `SKIPPED: ${skipped.graphicName || skipped.eventName || 'Queued Item'}`;
    state.updatedAt = new Date().toISOString();

    if (!state.history) state.history = [];
    state.history.unshift({
      id: skipped.id,
      graphicName: skipped.graphicName || skipped.eventName || 'Graphic',
      eventName: skipped.eventName || skipped.graphicName || 'Event',
      sourceType: skipped.sourceType || 'MANUAL',
      priority: skipped.priority || 50,
      priorityLevel: skipped.priorityLevel,
      triggeredAt: skipped.triggeredAt,
      finishedAt: new Date().toISOString(),
      status: 'SKIPPED',
      durationSeconds: skipped.durationSeconds,
    });
    if (state.history.length > 50) state.history = state.history.slice(0, 50);

    logBroadcastAudit(
      matchId,
      'SKIP_ITEM',
      `Skipped item "${skipped.graphicName || skipped.eventName}" from queue position #${index + 1}`,
      skipped.graphicName,
      operatorName
    );

    broadcastOnAirUpdate(matchId, state);
  }
  return state;
}

/**
 * STOP action: Emergency kill on air and clear all queues safely
 * Note: Purely clears broadcast graphics. Never touches scores, match data, or studio templates.
 */
export function stopAll(matchId: string, operatorName?: string): OnAirState {
  const state = getOnAirState(matchId);
  const now = new Date().toISOString();

  if (state.currentOnAir && state.history) {
    const cur = state.history.find((h) => h.id === state.currentOnAir?.id);
    if (cur) {
      cur.status = 'CANCELLED';
      cur.finishedAt = now;
    }
  }

  if (state.history && state.queue.length > 0) {
    state.queue.forEach((q) => {
      state.history!.unshift({
        id: q.id,
        graphicName: q.graphicName || q.eventName || 'Graphic',
        eventName: q.eventName || q.graphicName || 'Event',
        sourceType: q.sourceType || 'MANUAL',
        priority: q.priority || 50,
        priorityLevel: q.priorityLevel,
        triggeredAt: now,
        finishedAt: now,
        status: 'CANCELLED',
        durationSeconds: q.durationSeconds,
      });
    });
    if (state.history.length > 50) state.history = state.history.slice(0, 50);
  }

  state.currentOnAir = null;
  state.activeGraphics = [];
  state.previewGraphic = null;
  state.queue = [];
  state.playlistStatus = 'STOPPED';
  state.lastAction = 'EMERGENCY STOP (ALL CLEARED)';
  state.updatedAt = now;

  logBroadcastAudit(
    matchId,
    'KILL_ALL',
    'Emergency Stop executed: cleared Program bus, cleared Preview bus, and flushed Graphic Queue',
    undefined,
    operatorName
  );

  broadcastOnAirUpdate(matchId, state);
  return state;
}

/**
 * TRIGGER ENGINE: Handles both manual operator trigger and automated event trigger
 * with event deduplication, priority queuing, and conflict policy resolution
 */
export async function triggerEventAssignment(
  matchId: string,
  sport: SportType,
  targetId: string,
  isManual: boolean = false,
  eventData?: any,
  previewOnly: boolean = false,
  operatorName?: string,
  broadcastEventId?: string
): Promise<{ success: boolean; item?: OnAirGraphicItem; reason?: string }> {
  // Event Deduplication Guard: Checks explicit broadcast event ID tracking for automated triggers
  if (broadcastEventId) {
    if (!processedEventIdsMap.has(matchId)) {
      processedEventIdsMap.set(matchId, new Set<string>());
    }
    const processedSet = processedEventIdsMap.get(matchId)!;
    if (!isManual && processedSet.has(broadcastEventId)) {
      return { success: false, reason: 'Duplicate event skipped by deduplication guard' };
    }
  }

  const db = getDb();
  const match = (db.matches || []).find((m) => m.id === matchId);
  if (!match) return { success: false, reason: 'Match not found' };

  // Sport Isolation Guard: Cricket graphic assignment must not accidentally trigger for other sports
  if (match.sport && sport && match.sport !== sport && sport !== 'CUSTOM') {
    return {
      success: false,
      reason: `Sport isolation mismatch: match is ${match.sport}, trigger was for ${sport}`,
    };
  }

  const assignments = getAssignmentsForSport(sport, matchId);
  const assignment = assignments.find(
    (a) => a.targetId === targetId || a.targetId.toLowerCase() === targetId.toLowerCase()
  );

  if (!assignment) {
    return { success: false, reason: `No assignment found for target: ${targetId}` };
  }

  // Verify assignment itself matches match sport
  if (assignment.sport && match.sport && assignment.sport !== match.sport && assignment.sport !== 'CUSTOM') {
    return {
      success: false,
      reason: `Sport isolation mismatch: assignment is configured for ${assignment.sport}, match is ${match.sport}`,
    };
  }

  // Section 2 & 4: Only active graphics may trigger; hidden graphics are blocked
  const config = (db.broadcast_configs || []).find((c) => c.matchId === matchId);
  const hiddenList = (config && Array.isArray(config.hiddenGraphicIds)) ? config.hiddenGraphicIds : [];
  const activeList = (config && Array.isArray(config.activeGraphicIds)) ? config.activeGraphicIds : [];

  const isHidden =
    hiddenList.includes(assignment.targetId) ||
    hiddenList.includes(targetId) ||
    (assignment.assignedGraphicId && hiddenList.includes(assignment.assignedGraphicId)) ||
    (assignment.assignedGraphicName && hiddenList.some((hId: string) => assignment.assignedGraphicName?.toLowerCase() === hId.toLowerCase()));

  if (isHidden) {
    if (isManual) {
      return {
        success: false,
        reason: 'Graphic is hidden from Broadcast List.',
      };
    }
    console.log(`[GraphicAssignment] Event "${assignment.targetName || targetId}" skipped: Graphic hidden — trigger skipped.`);
    return {
      success: false,
      reason: 'Graphic hidden — trigger skipped',
    };
  }

  if (assignment.enabled === false || assignment.triggerMode === 'DISABLED') {
    return {
      success: false,
      reason: isManual ? 'Graphic assignment trigger is disabled' : 'Graphic hidden — trigger skipped',
    };
  }

  if (assignment.triggerMode === 'MANUAL' && !isManual) {
    return { success: false, reason: 'Assignment is configured for manual trigger only' };
  }

  if (!assignment.assignedGraphicId) {
    return { success: false, reason: `No graphic assigned to target: ${targetId}` };
  }

  // Section 9: Cooldown / Rate Limiting per Match and Assignment
  const now = Date.now();
  const cooldownSec = assignment.cooldownSeconds ?? 1.0;
  const cooldownMs = cooldownSec * 1000;
  const cooldownKey = `${matchId}:${assignment.id}`;
  const lastTriggeredAt = assignmentCooldownMap.get(cooldownKey) || 0;

  if (!isManual && cooldownMs > 0 && now - lastTriggeredAt < cooldownMs) {
    const remaining = ((cooldownMs - (now - lastTriggeredAt)) / 1000).toFixed(1);
    console.log(`[GraphicAssignment] Event "${assignment.targetName || targetId}" skipped by cooldown (${remaining}s remaining)`);
    return {
      success: false,
      reason: `Event skipped by cooldown (${remaining}s remaining)`,
    };
  }

  // If broadcastEventId provided, mark it processed now that validations and cooldown have passed
  if (broadcastEventId) {
    const processedSet = processedEventIdsMap.get(matchId)!;
    processedSet.add(broadcastEventId);
    if (processedSet.size > 500) {
      const arr = Array.from(processedSet);
      processedEventIdsMap.set(matchId, new Set(arr.slice(arr.length - 250)));
    }
  }

  const eventKey = broadcastEventId || `${matchId}:${targetId}:${now}`;
  const state = getOnAirState(matchId);
  const priority = assignment.priority ?? 50;
  const priorityLevel = getPriorityLevel(priority);

  const item: Partial<OnAirGraphicItem> = {
    sourceType: 'ASSIGNMENT',
    sourceId: assignment.id,
    targetId: assignment.targetId,
    eventName: assignment.targetName,
    graphicId: assignment.assignedGraphicId,
    graphicName: assignment.assignedGraphicName,
    entryAnimation: assignment.entryAnimation,
    exitAnimation: assignment.exitAnimation,
    durationSeconds: assignment.displayDuration,
    remainingSeconds: assignment.displayDuration,
    triggerSource: isManual ? 'MANUAL' : 'AUTO',
    triggerMode: assignment.triggerMode,
    priority,
    priorityLevel,
    conflictAction: assignment.conflictAction,
    broadcastEventId: eventKey,
  };

  if (previewOnly) {
    setPreview(matchId, item, operatorName);
    assignmentCooldownMap.set(cooldownKey, now);
    return { success: true, item: state.previewGraphic || undefined };
  }

  if (state.currentOnAir) {
    // Conflict Strategy: INTERRUPT
    if (assignment.conflictAction === 'INTERRUPT') {
      if (priority >= (state.currentOnAir.priority || 50)) {
        if (state.currentOnAir.remainingSeconds > 1) {
          state.queue.unshift({ ...state.currentOnAir });
        }
        logBroadcastAudit(
          matchId,
          'CONFLICT_INTERRUPT',
          `Preempted "${state.currentOnAir.graphicName}" with higher priority event "${assignment.targetName}" (${priorityLevel})`,
          assignment.targetName,
          operatorName
        );
        await takeLive(matchId, item, operatorName);
        assignmentCooldownMap.set(cooldownKey, now);
        return { success: true, item: state.currentOnAir || undefined };
      } else {
        // Fallback: If incoming interrupt priority is lower than on-air graphic, queue behind according to priority
        const queueItem: OnAirGraphicItem = {
          id: crypto.randomUUID(),
          sourceType: 'ASSIGNMENT',
          sourceId: assignment.id,
          targetId: assignment.targetId,
          eventName: assignment.targetName,
          graphicId: assignment.assignedGraphicId,
          graphicName: assignment.assignedGraphicName,
          entryAnimation: assignment.entryAnimation,
          exitAnimation: assignment.exitAnimation,
          triggeredAt: new Date().toISOString(),
          durationSeconds: assignment.displayDuration,
          remainingSeconds: assignment.displayDuration,
          isHeld: false,
          triggerSource: isManual ? 'MANUAL' : 'AUTO',
          triggerMode: assignment.triggerMode,
          priority,
          priorityLevel,
          conflictAction: assignment.conflictAction,
          broadcastEventId: eventKey,
        };
        state.queue.push(queueItem);
        state.queue.sort((a, b) => (b.priority || 0) - (a.priority || 0));
        state.lastAction = `QUEUED: ${assignment.targetName} (${priorityLevel})`;
        logBroadcastAudit(
          matchId,
          'CONFLICT_QUEUED',
          `Interrupt priority insufficient (${priority} < ${state.currentOnAir.priority || 50}); queued "${assignment.targetName}"`,
          assignment.targetName,
          operatorName
        );
        broadcastOnAirUpdate(matchId, state);
        assignmentCooldownMap.set(cooldownKey, now);
        return { success: true, item: queueItem };
      }
    } 
    // Conflict Strategy: QUEUE_BEHIND
    else if (assignment.conflictAction === 'QUEUE_BEHIND') {
      const queueItem: OnAirGraphicItem = {
        id: crypto.randomUUID(),
        sourceType: 'ASSIGNMENT',
        sourceId: assignment.id,
        targetId: assignment.targetId,
        eventName: assignment.targetName,
        graphicId: assignment.assignedGraphicId,
        graphicName: assignment.assignedGraphicName,
        entryAnimation: assignment.entryAnimation,
        exitAnimation: assignment.exitAnimation,
        triggeredAt: new Date().toISOString(),
        durationSeconds: assignment.displayDuration,
        remainingSeconds: assignment.displayDuration,
        isHeld: false,
        triggerSource: isManual ? 'MANUAL' : 'AUTO',
        triggerMode: assignment.triggerMode,
        priority,
        priorityLevel,
        conflictAction: assignment.conflictAction,
        broadcastEventId: eventKey,
      };

      state.queue.push(queueItem);
      // Priority Queue Sorting: sort queue by priority DESC, then FIFO
      state.queue.sort((a, b) => (b.priority || 0) - (a.priority || 0));

      state.lastAction = `QUEUED: ${assignment.targetName} (${priorityLevel})`;
      logBroadcastAudit(
        matchId,
        'CONFLICT_QUEUED',
        `Enqueued event "${assignment.targetName}" into priority queue (Priority: ${priority}, Level: ${priorityLevel})`,
        assignment.targetName,
        operatorName
      );
      broadcastOnAirUpdate(matchId, state);
      assignmentCooldownMap.set(cooldownKey, now);
      return { success: true, item: queueItem };
    } 
    // Conflict Strategy: REPLACE_QUEUED
    else if (assignment.conflictAction === 'REPLACE_QUEUED') {
      state.queue = [];
      const queueItem: OnAirGraphicItem = {
        id: crypto.randomUUID(),
        sourceType: 'ASSIGNMENT',
        sourceId: assignment.id,
        targetId: assignment.targetId,
        eventName: assignment.targetName,
        graphicId: assignment.assignedGraphicId,
        graphicName: assignment.assignedGraphicName,
        entryAnimation: assignment.entryAnimation,
        exitAnimation: assignment.exitAnimation,
        triggeredAt: new Date().toISOString(),
        durationSeconds: assignment.displayDuration,
        remainingSeconds: assignment.displayDuration,
        isHeld: false,
        triggerSource: isManual ? 'MANUAL' : 'AUTO',
        triggerMode: assignment.triggerMode,
        priority,
        priorityLevel,
        conflictAction: assignment.conflictAction,
        broadcastEventId: eventKey,
      };
      state.queue.push(queueItem);
      state.lastAction = `REPLACED QUEUE: ${assignment.targetName}`;
      logBroadcastAudit(
        matchId,
        'CONFLICT_REPLACE_QUEUE',
        `Replaced queue with event "${assignment.targetName}"`,
        assignment.targetName,
        operatorName
      );
      broadcastOnAirUpdate(matchId, state);
      assignmentCooldownMap.set(cooldownKey, now);
      return { success: true, item: queueItem };
    } else {
      // Conflict Strategy: CANCEL / DROP
      return { success: false, reason: 'Dropped due to conflict policy CANCEL' };
    }
  } else {
    // Nothing live on air: take immediately
    await takeLive(matchId, item, operatorName);
    assignmentCooldownMap.set(cooldownKey, now);
    return { success: true, item: state.currentOnAir || undefined };
  }
}

/**
 * AUTOMATIC TRIGGER ENGINE
 * Evaluates match event against sport assignments and triggers or queues graphic
 */
export async function triggerEventAutoAssignment(
  matchId: string,
  sport: SportType,
  targetId: string,
  eventData?: any,
  broadcastEventId?: string
): Promise<boolean> {
  const result = await triggerEventAssignment(
    matchId,
    sport,
    targetId,
    false,
    eventData,
    false,
    'System Automation',
    broadcastEventId
  );
  return result.success;
}

/**
 * High-reliability 1-second countdown ticker with absolute timestamp resolution
 * Immune to browser inactive tab throttling or network latency.
 */
function ensureTickerRunning(): void {
  if (tickerInterval) return;

  tickerInterval = setInterval(() => {
    onAirStateMap.forEach((state, matchId) => {
      let stateChanged = false;
      const nowMs = Date.now();

      // Multi-layer active graphics timer progression
      if (state.activeGraphics && state.activeGraphics.length > 0) {
        const stillActive: OnAirGraphicItem[] = [];

        for (const item of state.activeGraphics) {
          if (!item.isHeld && item.durationSeconds > 0) {
            const remaining = item.endsAt
              ? Math.max(0, Math.ceil((item.endsAt - nowMs) / 1000))
              : Math.max(0, item.remainingSeconds - 1);

            item.remainingSeconds = remaining;

            if (remaining <= 0) {
              // Expired
              stateChanged = true;
              if (state.history) {
                const hItem = state.history.find((h) => h.id === item.id);
                if (hItem && hItem.status === 'ON_AIR') {
                  hItem.status = 'COMPLETED';
                  hItem.finishedAt = new Date().toISOString();
                }
              }
            } else {
              stillActive.push(item);
              stateChanged = true;
            }
          } else {
            stillActive.push(item);
          }
        }

        if (stillActive.length !== state.activeGraphics.length) {
          state.activeGraphics = stillActive;
          if (state.currentOnAir && !stillActive.some((g) => g.id === state.currentOnAir?.id)) {
            state.currentOnAir = stillActive[stillActive.length - 1] || null;
          }
          state.lastAction = 'TIMED GRAPHIC EXPIRED';
          stateChanged = true;
        }
      }

      // Single currentOnAir legacy progression fallback
      if (state.currentOnAir && !state.currentOnAir.isHeld && state.currentOnAir.durationSeconds > 0) {
        const remaining = state.currentOnAir.endsAt
          ? Math.max(0, Math.ceil((state.currentOnAir.endsAt - nowMs) / 1000))
          : Math.max(0, state.currentOnAir.remainingSeconds - 1);

        state.currentOnAir.remainingSeconds = remaining;
        state.remainingSeconds = remaining;

        if (remaining <= 0) {
          if (state.queue.length > 0) {
            const nextItem = state.queue.shift()!;
            takeLive(matchId, nextItem, 'Auto Transition');
          } else if (state.activePlaylistId && state.playlistStatus === 'PLAYING') {
            nextInPlaylistOrQueue(matchId, 'Playlist Progression');
          } else {
            if (state.currentOnAir && state.history) {
              const hItem = state.history.find((h) => h.id === state.currentOnAir?.id);
              if (hItem && hItem.status === 'ON_AIR') {
                hItem.status = 'COMPLETED';
                hItem.finishedAt = new Date().toISOString();
              }
            }
            state.currentOnAir = state.activeGraphics && state.activeGraphics.length > 0 ? state.activeGraphics[0] : null;
            state.lastAction = 'ON-AIR COMPLETED';
            broadcastOnAirUpdate(matchId, state);
          }
        } else if (stateChanged) {
          broadcastOnAirUpdate(matchId, state);
        }
      } else if (stateChanged) {
        synchronizeRuntimeState(state);
        broadcastOnAirUpdate(matchId, state);
      }
    });
  }, 1000);
}

// Start ticker on service boot
ensureTickerRunning();

