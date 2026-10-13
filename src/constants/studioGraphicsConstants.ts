import { StudioGraphic, StudioGraphicPreset, SportType, GraphicElement } from '../types';

export * from '../utils/graphicResolutionUtils';

export interface DynamicFieldDefinition {
  key: string;
  label: string;
  category:
    | 'General'
    | 'Cricket'
    | 'Volleyball'
    | 'Kabaddi'
    | 'Football'
    | 'Hockey'
    | 'Basketball'
    | 'Tennis'
    | 'Badminton'
    | 'Table Tennis'
    | 'Images & Assets'
    | 'Clock & Time'
    | 'Score & Points';
  sports: (SportType | 'ALL')[];
  sampleValue: string;
  description: string;
  isImage?: boolean;
  defaultFormatter?: string;
  tags?: string[];
}

export const DEFAULT_FALLBACK_IMAGES = {
  PLAYER_PLACEHOLDER: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
  TEAM_PLACEHOLDER: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=200&auto=format&fit=crop&q=80',
  TOURNAMENT_PLACEHOLDER: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=200&auto=format&fit=crop&q=80',
  SPONSOR_PLACEHOLDER: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
  TROPHY_PLACEHOLDER: 'https://images.unsplash.com/photo-1614036417651-efe5912149d8?w=300&auto=format&fit=crop&q=80',
  FLAG_PLACEHOLDER: 'https://images.unsplash.com/photo-1532375810709-75b1da00537c?w=200&auto=format&fit=crop&q=80',
  PLAYER: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
  TEAM: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=200&auto=format&fit=crop&q=80',
  TOURNAMENT: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=200&auto=format&fit=crop&q=80',
  SPONSOR: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
  TROPHY: 'https://images.unsplash.com/photo-1614036417651-efe5912149d8?w=300&auto=format&fit=crop&q=80',
  FLAG: 'https://images.unsplash.com/photo-1532375810709-75b1da00537c?w=200&auto=format&fit=crop&q=80',
};

export const DYNAMIC_FIELDS: DynamicFieldDefinition[] = [
  // 1. General Match, Tournament & Metadata
  { key: '{{TOURNAMENT_NAME}}', label: 'Tournament Name', category: 'General', sports: ['ALL'], sampleValue: 'Premier Sports Championship 2026', description: 'Full name of the active tournament' },
  { key: '{{TOURNAMENT_LOGO}}', label: 'Tournament Logo URL', category: 'Images & Assets', sports: ['ALL'], sampleValue: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=200&auto=format&fit=crop&q=80', description: 'Emblem/Logo of tournament', isImage: true },
  { key: '{{TROPHY_IMAGE}}', label: 'Trophy / Award Asset', category: 'Images & Assets', sports: ['ALL'], sampleValue: 'https://images.unsplash.com/photo-1614036417651-efe5912149d8?w=300&auto=format&fit=crop&q=80', description: 'Championship trophy / gold cup', isImage: true },
  { key: '{{SPONSOR_LOGO}}', label: 'Title Sponsor Logo URL', category: 'Images & Assets', sports: ['ALL'], sampleValue: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80', description: 'Sponsor emblem / logo', isImage: true },
  { key: '{{ORGANIZER_LOGO}}', label: 'Organizer Logo URL', category: 'Images & Assets', sports: ['ALL'], sampleValue: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=200&auto=format&fit=crop&q=80', description: 'Sports board / organizer emblem', isImage: true },
  { key: '{{FLAG}}', label: 'Country / State Flag', category: 'Images & Assets', sports: ['ALL'], sampleValue: 'https://images.unsplash.com/photo-1532375810709-75b1da00537c?w=200&auto=format&fit=crop&q=80', description: 'National or state flag', isImage: true },
  { key: '{{COUNTRY_FLAG}}', label: 'Country Flag', category: 'Images & Assets', sports: ['ALL'], sampleValue: 'https://images.unsplash.com/photo-1532375810709-75b1da00537c?w=200&auto=format&fit=crop&q=80', description: 'National flag image', isImage: true },
  { key: '{{MATCH_NAME}}', label: 'Match Name / Title', category: 'General', sports: ['ALL'], sampleValue: 'Grand Final: Royal Challengers vs Titans', description: 'Title or stage of the match' },
  { key: '{{MATCH_STATUS}}', label: 'Match Status', category: 'General', sports: ['ALL'], sampleValue: 'LIVE - 2ND INNINGS', description: 'Current state of the fixture' },
  { key: '{{MATCH_ROUND}}', label: 'Match Round / Stage', category: 'General', sports: ['ALL'], sampleValue: 'Championship Final', description: 'Stage of the tournament e.g. Semi Final, Final' },
  { key: '{{MATCH_NUMBER}}', label: 'Match Number', category: 'General', sports: ['ALL'], sampleValue: 'Match #28', description: 'Fixture match index' },
  { key: '{{MATCH_DATE}}', label: 'Match Date', category: 'General', sports: ['ALL'], sampleValue: '24 Oct 2026', description: 'Scheduled match date' },
  { key: '{{MATCH_TIME}}', label: 'Match Time', category: 'Clock & Time', sports: ['ALL'], sampleValue: '19:30 IST', description: 'Match start time' },
  { key: '{{VENUE}}', label: 'Venue / Stadium', category: 'General', sports: ['ALL'], sampleValue: 'National Sports Arena', description: 'Match venue name' },
  { key: '{{GROUND}}', label: 'Ground / Pitch / Court Name', category: 'General', sports: ['ALL'], sampleValue: 'Center Court', description: 'Specific pitch / court number' },
  { key: '{{REFEREE}}', label: 'Lead Referee / Umpire', category: 'General', sports: ['ALL'], sampleValue: 'Michael Oliver', description: 'Chief match referee' },
  { key: '{{COMMENTATOR}}', label: 'Commentator / Desk', category: 'General', sports: ['ALL'], sampleValue: 'Harsha Bhogle', description: 'Live broadcast commentator' },
  { key: '{{TOSS_WINNER}}', label: 'Toss Winner', category: 'General', sports: ['ALL'], sampleValue: 'Royal Challengers', description: 'Team that won the coin toss' },
  { key: '{{TOSS_RESULT}}', label: 'Toss Result Text', category: 'General', sports: ['ALL'], sampleValue: 'Royal Challengers won the toss and elected to bat', description: 'Full toss decision string' },
  { key: '{{CUSTOM_TEXT}}', label: 'Custom Announce Text', category: 'General', sports: ['ALL'], sampleValue: 'SPECTACULAR PERFORMANCE!', description: 'Custom dynamic broadcast banner' },

  // 2. Teams & Competitors
  { key: '{{TEAM_A_NAME}}', label: 'Team A Name', category: 'General', sports: ['ALL'], sampleValue: 'Royal Challengers', description: 'Home / Team 1 name' },
  { key: '{{TEAM_B_NAME}}', label: 'Team B Name', category: 'General', sports: ['ALL'], sampleValue: 'Super Titans', description: 'Away / Team 2 name' },
  { key: '{{TEAM_A_SHORT}}', label: 'Team A Short Code', category: 'General', sports: ['ALL'], sampleValue: 'RCB', description: 'Short abbreviation for Team A' },
  { key: '{{TEAM_B_SHORT}}', label: 'Team B Short Code', category: 'General', sports: ['ALL'], sampleValue: 'TIT', description: 'Short abbreviation for Team B' },
  { key: '{{TEAM_A_LOGO}}', label: 'Team A Logo URL', category: 'Images & Assets', sports: ['ALL'], sampleValue: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=200&auto=format&fit=crop&q=80', description: 'Logo for Team A', isImage: true },
  { key: '{{TEAM_B_LOGO}}', label: 'Team B Logo URL', category: 'Images & Assets', sports: ['ALL'], sampleValue: 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=200&auto=format&fit=crop&q=80', description: 'Logo for Team B', isImage: true },
  { key: '{{TEAM_LOGO}}', label: 'Active Team Logo URL', category: 'Images & Assets', sports: ['ALL'], sampleValue: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=200&auto=format&fit=crop&q=80', description: 'Logo for active scoring team', isImage: true },
  { key: '{{TEAM_A_CAPTAIN}}', label: 'Team A Captain Name', category: 'General', sports: ['ALL'], sampleValue: 'Virat Kohli', description: 'Captain of Team A' },
  { key: '{{TEAM_B_CAPTAIN}}', label: 'Team B Captain Name', category: 'General', sports: ['ALL'], sampleValue: 'Hardik Pandya', description: 'Captain of Team B' },

  // 3. Featured Player Headshots & Identity
  { key: '{{PLAYER_NAME}}', label: 'Player Name', category: 'General', sports: ['ALL'], sampleValue: 'Virat Sharma', description: 'Active or featured player name' },
  { key: '{{PLAYER_PHOTO}}', label: 'Player Photo URL', category: 'Images & Assets', sports: ['ALL'], sampleValue: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80', description: 'Headshot / Avatar of player', isImage: true },
  { key: '{{PLAYER_IMAGE}}', label: 'Player Full Image URL', category: 'Images & Assets', sports: ['ALL'], sampleValue: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80', description: 'Full image profile of player', isImage: true },
  { key: '{{CAPTAIN_PHOTO}}', label: 'Captain Photo URL', category: 'Images & Assets', sports: ['ALL'], sampleValue: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80', description: 'Photo of team captain', isImage: true },
  { key: '{{JERSEY_NUMBER}}', label: 'Player Jersey #', category: 'General', sports: ['ALL'], sampleValue: '#18', description: 'Player jersey number' },
  { key: '{{PLAYER_ROLE}}', label: 'Player Role', category: 'General', sports: ['ALL'], sampleValue: 'Top Order Batter', description: 'Player field position or role' },

  // 4. Overall Score & Multipurpose Score Variables
  { key: '{{SCORE}}', label: 'Primary Score Display', category: 'Score & Points', sports: ['ALL'], sampleValue: '178/4 (18.2 ov)', description: 'Primary comprehensive score string' },
  { key: '{{SCORE_A}}', label: 'Score Team A', category: 'Score & Points', sports: ['ALL'], sampleValue: '3', description: 'Team A numeric score' },
  { key: '{{SCORE_B}}', label: 'Score Team B', category: 'Score & Points', sports: ['ALL'], sampleValue: '2', description: 'Team B numeric score' },
  { key: '{{LEAD_TRAIL}}', label: 'Lead / Margin', category: 'Score & Points', sports: ['ALL'], sampleValue: 'Lead by 14', description: 'Lead or trail difference text' },

  // 5. Cricket Dynamic Fields
  { key: '{{SCORE_WITH_OVERS}}', label: 'Score & Overs (e.g. 184/4 (18.3 ov))', category: 'Cricket', sports: ['CRICKET'], sampleValue: '184/4 (18.3 ov)', description: 'Combined score with overs' },
  { key: '{{SCORE_RUNS_WICKETS}}', label: 'Score (Runs / Wickets)', category: 'Cricket', sports: ['CRICKET'], sampleValue: '184/4', description: 'Score without overs' },
  { key: '{{RUNS}}', label: 'Total Runs Scored', category: 'Cricket', sports: ['CRICKET'], sampleValue: '184', description: 'Total runs in active innings' },
  { key: '{{WICKETS}}', label: 'Wickets Lost', category: 'Cricket', sports: ['CRICKET'], sampleValue: '4', description: 'Total wickets lost' },
  { key: '{{OVERS}}', label: 'Overs Bowled (e.g. 18.3)', category: 'Cricket', sports: ['CRICKET'], sampleValue: '18.3', description: 'Overs completed display' },
  { key: '{{CURRENT_OVER}}', label: 'Current Over (e.g. 19th Over)', category: 'Cricket', sports: ['CRICKET'], sampleValue: '19th Over', description: 'Current active over count' },
  { key: '{{CURRENT_BALL}}', label: 'Current Ball in Over', category: 'Cricket', sports: ['CRICKET'], sampleValue: '3', description: 'Ball delivery count in current over' },
  { key: '{{BALL}}', label: 'Ball Count in Over', category: 'Cricket', sports: ['CRICKET'], sampleValue: '3', description: 'Ball within current over' },
  { key: '{{TOTAL_OVERS}}', label: 'Total Overs in Match', category: 'Cricket', sports: ['CRICKET'], sampleValue: '20', description: 'Maximum overs per innings' },
  { key: '{{OVER_PROGRESS}}', label: 'Over Progress Bar', category: 'Cricket', sports: ['CRICKET'], sampleValue: '18.3 / 20 OVERS', description: 'Overs completed vs total' },
  { key: '{{INNINGS}}', label: 'Current Innings', category: 'Cricket', sports: ['CRICKET'], sampleValue: 'Innings 2', description: 'Current innings number' },
  { key: '{{INNINGS_NUMBER}}', label: 'Innings Ordinal (1st / 2nd)', category: 'Cricket', sports: ['CRICKET'], sampleValue: '2nd Innings', description: 'Current innings tag' },
  { key: '{{INNINGS_STATUS}}', label: 'Innings Status Text', category: 'Cricket', sports: ['CRICKET'], sampleValue: '2nd Innings in progress', description: 'Match phase status' },
  { key: '{{BATTING_TEAM_NAME}}', label: 'Batting Team Name', category: 'Cricket', sports: ['CRICKET'], sampleValue: 'Royal Challengers', description: 'Team currently batting' },
  { key: '{{BOWLING_TEAM_NAME}}', label: 'Bowling Team Name', category: 'Cricket', sports: ['CRICKET'], sampleValue: 'Super Titans', description: 'Team currently bowling' },
  { key: '{{TEAM_A_INNINGS_SCORE}}', label: 'Team A Inning Score', category: 'Cricket', sports: ['CRICKET'], sampleValue: '184/4 (20.0 ov)', description: 'Team A full innings score' },
  { key: '{{TEAM_B_INNINGS_SCORE}}', label: 'Team B Inning Score', category: 'Cricket', sports: ['CRICKET'], sampleValue: '162/6 (18.3 ov)', description: 'Team B full innings score' },
  { key: '{{GROUP_NAME}}', label: 'Group / Pool Name', category: 'Cricket', sports: ['ALL'], sampleValue: 'Group A', description: 'Tournament group / bracket name' },
  
  // Batsman / Striker Variables
  { key: '{{STRIKER}}', label: 'Striker Summary (Name + Runs)', category: 'Cricket', sports: ['CRICKET'], sampleValue: 'V. Kohli 76* (42)', description: 'Full striker summary with runs and balls' },
  { key: '{{STRIKER_NAME}}', label: 'Striker Full Name', category: 'Cricket', sports: ['CRICKET'], sampleValue: 'Virat Kohli', description: 'Current batsman on strike' },
  { key: '{{STRIKER_SHORT_NAME}}', label: 'Striker Short Name (V. Kohli)', category: 'Cricket', sports: ['CRICKET'], sampleValue: 'V. Kohli', description: 'Initial and surname of striker' },
  { key: '{{STRIKER_SCORE}}', label: 'Striker Score (with not-out *)', category: 'Cricket', sports: ['CRICKET'], sampleValue: '76*', description: 'Formatted striker score' },
  { key: '{{STRIKER_RUNS}}', label: 'Striker Runs', category: 'Cricket', sports: ['CRICKET'], sampleValue: '76', description: 'Runs scored by active striker' },
  { key: '{{STRIKER_BALLS}}', label: 'Striker Balls Faced', category: 'Cricket', sports: ['CRICKET'], sampleValue: '42', description: 'Balls faced by active striker' },
  { key: '{{STRIKER_4S}}', label: 'Striker Fours (4s)', category: 'Cricket', sports: ['CRICKET'], sampleValue: '8', description: 'Boundary fours hit by striker' },
  { key: '{{STRIKER_FOURS}}', label: 'Striker Fours (4s)', category: 'Cricket', sports: ['CRICKET'], sampleValue: '8', description: 'Boundary fours hit by striker' },
  { key: '{{STRIKER_6S}}', label: 'Striker Sixes (6s)', category: 'Cricket', sports: ['CRICKET'], sampleValue: '4', description: 'Boundary sixes hit by striker' },
  { key: '{{STRIKER_SIXES}}', label: 'Striker Sixes (6s)', category: 'Cricket', sports: ['CRICKET'], sampleValue: '4', description: 'Boundary sixes hit by striker' },
  { key: '{{STRIKER_SR}}', label: 'Striker Strike Rate', category: 'Cricket', sports: ['CRICKET'], sampleValue: '180.95', description: 'Strike rate of active batsman on strike' },
  { key: '{{STRIKER_PHOTO}}', label: 'Striker Headshot Photo', category: 'Cricket', sports: ['CRICKET'], sampleValue: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80', description: 'Photo of the batsman on strike', isImage: true },
  { key: '{{BATSMAN_NAME}}', label: 'Striker Batsman Name (Alias)', category: 'Cricket', sports: ['CRICKET'], sampleValue: 'Virat Kohli', description: 'Current batsman on strike' },
  { key: '{{BATSMAN_RUNS}}', label: 'Striker Runs (Alias)', category: 'Cricket', sports: ['CRICKET'], sampleValue: '76*', description: 'Runs by active striker' },
  { key: '{{BATSMAN_BALLS}}', label: 'Striker Balls Faced (Alias)', category: 'Cricket', sports: ['CRICKET'], sampleValue: '42', description: 'Balls faced by striker' },
  { key: '{{BATSMAN_FOURS}}', label: 'Striker Fours (Alias)', category: 'Cricket', sports: ['CRICKET'], sampleValue: '8', description: 'Boundary 4s hit by striker' },
  { key: '{{BATSMAN_SIXES}}', label: 'Striker Sixes (Alias)', category: 'Cricket', sports: ['CRICKET'], sampleValue: '4', description: 'Boundary 6s hit by striker' },
  { key: '{{BATSMAN_SR}}', label: 'Striker Strike Rate (Alias)', category: 'Cricket', sports: ['CRICKET'], sampleValue: '180.95', description: 'Strike rate of active batsman' },

  // Non-Striker Variables
  { key: '{{NON_STRIKER}}', label: 'Non-Striker Summary', category: 'Cricket', sports: ['CRICKET'], sampleValue: 'KL Rahul 34* (21)', description: 'Non-striker name and runs summary' },
  { key: '{{NON_STRIKER_NAME}}', label: 'Non-Striker Full Name', category: 'Cricket', sports: ['CRICKET'], sampleValue: 'KL Rahul', description: 'Batsman at non-striker end' },
  { key: '{{NON_STRIKER_SHORT_NAME}}', label: 'Non-Striker Short Name', category: 'Cricket', sports: ['CRICKET'], sampleValue: 'K. Rahul', description: 'Initial and surname of non-striker' },
  { key: '{{NON_STRIKER_SCORE}}', label: 'Non-Striker Score (with *)', category: 'Cricket', sports: ['CRICKET'], sampleValue: '34*', description: 'Formatted non-striker score' },
  { key: '{{NON_STRIKER_RUNS}}', label: 'Non-Striker Runs', category: 'Cricket', sports: ['CRICKET'], sampleValue: '34', description: 'Runs scored by non-striker' },
  { key: '{{NON_STRIKER_BALLS}}', label: 'Non-Striker Balls Faced', category: 'Cricket', sports: ['CRICKET'], sampleValue: '21', description: 'Balls faced by non-striker' },
  { key: '{{NON_STRIKER_4S}}', label: 'Non-Striker Fours (4s)', category: 'Cricket', sports: ['CRICKET'], sampleValue: '3', description: 'Boundary fours hit by non-striker' },
  { key: '{{NON_STRIKER_FOURS}}', label: 'Non-Striker Fours (4s)', category: 'Cricket', sports: ['CRICKET'], sampleValue: '3', description: 'Boundary fours hit by non-striker' },
  { key: '{{NON_STRIKER_6S}}', label: 'Non-Striker Sixes (6s)', category: 'Cricket', sports: ['CRICKET'], sampleValue: '1', description: 'Boundary sixes hit by non-striker' },
  { key: '{{NON_STRIKER_SIXES}}', label: 'Non-Striker Sixes (6s)', category: 'Cricket', sports: ['CRICKET'], sampleValue: '1', description: 'Boundary sixes hit by non-striker' },
  { key: '{{NON_STRIKER_SR}}', label: 'Non-Striker Strike Rate', category: 'Cricket', sports: ['CRICKET'], sampleValue: '161.90', description: 'Strike rate of non-striker' },
  { key: '{{NON_STRIKER_PHOTO}}', label: 'Non-Striker Headshot Photo', category: 'Cricket', sports: ['CRICKET'], sampleValue: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80', description: 'Photo of the non-striker batsman', isImage: true },

  // Current Bowler Variables
  { key: '{{BOWLER}}', label: 'Bowler Summary (e.g. 2/28 (3.3))', category: 'Cricket', sports: ['CRICKET'], sampleValue: 'J. Bumrah 2/28 (3.3 ov)', description: 'Active bowler figures summary' },
  { key: '{{CURRENT_BOWLER}}', label: 'Active Bowler Summary', category: 'Cricket', sports: ['CRICKET'], sampleValue: 'J. Bumrah 2/28 (3.3 ov)', description: 'Full bowler figures' },
  { key: '{{BOWLER_NAME}}', label: 'Active Bowler Full Name', category: 'Cricket', sports: ['CRICKET'], sampleValue: 'Jasprit Bumrah', description: 'Active bowler currently bowling' },
  { key: '{{BOWLER_SHORT_NAME}}', label: 'Bowler Short Name', category: 'Cricket', sports: ['CRICKET'], sampleValue: 'J. Bumrah', description: 'Initial and surname of bowler' },
  { key: '{{BOWLER_OVERS}}', label: 'Bowler Overs Bowled', category: 'Cricket', sports: ['CRICKET'], sampleValue: '3.3', description: 'Overs delivered by bowler' },
  { key: '{{BOWLER_BALLS}}', label: 'Bowler Balls Delivered', category: 'Cricket', sports: ['CRICKET'], sampleValue: '21', description: 'Legal balls bowled by active bowler' },
  { key: '{{BOWLER_RUNS}}', label: 'Bowler Runs Conceded', category: 'Cricket', sports: ['CRICKET'], sampleValue: '28', description: 'Runs conceded by active bowler' },
  { key: '{{BOWLER_RUNS_CONCEDED}}', label: 'Bowler Runs Conceded', category: 'Cricket', sports: ['CRICKET'], sampleValue: '28', description: 'Runs conceded by active bowler' },
  { key: '{{BOWLER_WICKETS}}', label: 'Bowler Wickets Taken', category: 'Cricket', sports: ['CRICKET'], sampleValue: '2', description: 'Wickets taken by active bowler' },
  { key: '{{BOWLER_ECONOMY}}', label: 'Bowler Economy Rate', category: 'Cricket', sports: ['CRICKET'], sampleValue: '8.00', description: 'Economy rate of active bowler' },
  { key: '{{BOWLER_MAIDENS}}', label: 'Bowler Maidens', category: 'Cricket', sports: ['CRICKET'], sampleValue: '0', description: 'Maiden overs bowled' },
  { key: '{{BOWLER_DOTS}}', label: 'Bowler Dot Balls', category: 'Cricket', sports: ['CRICKET'], sampleValue: '12', description: 'Dot balls bowled in current spell' },
  { key: '{{BOWLER_FIGURES}}', label: 'Bowler Complete Figures (W/R)', category: 'Cricket', sports: ['CRICKET'], sampleValue: '2/28 (3.3 ov)', description: 'Standard broadcast bowler figures' },
  { key: '{{BOWLER_PHOTO}}', label: 'Bowler Headshot Photo', category: 'Cricket', sports: ['CRICKET'], sampleValue: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80', description: 'Headshot photo of active bowler', isImage: true },

  // Ball Event Variables
  { key: '{{CURRENT_BALL_EVENT}}', label: 'Current Ball Event', category: 'Cricket', sports: ['CRICKET'], sampleValue: '4 (BOUNDARY)', description: 'Full description of current delivery' },
  { key: '{{LAST_BALL_RESULT}}', label: 'Last Ball Result (Runs / W)', category: 'Cricket', sports: ['CRICKET'], sampleValue: '4', description: 'Outcome of previous ball' },
  { key: '{{LAST_BALL_RUNS}}', label: 'Last Ball Runs Scored', category: 'Cricket', sports: ['CRICKET'], sampleValue: '4', description: 'Runs scored on previous ball' },
  { key: '{{LAST_BALL_WICKET}}', label: 'Last Ball Wicket Alert', category: 'Cricket', sports: ['CRICKET'], sampleValue: 'WICKET!', description: 'Dismissal alert if last ball took wicket' },
  { key: '{{LAST_BALL_DISMISSAL}}', label: 'Last Dismissal Description', category: 'Cricket', sports: ['CRICKET'], sampleValue: 'c Rahul b Bumrah', description: 'Wicket mode and fielder/bowler names' },
  { key: '{{LAST_BALL_OVER_BALL}}', label: 'Last Ball Over Position', category: 'Cricket', sports: ['CRICKET'], sampleValue: 'Over 18.3', description: 'Over and ball number marker' },
  { key: '{{BALL_EVENT}}', label: 'Ball Event Tag', category: 'Cricket', sports: ['CRICKET'], sampleValue: 'FOUR', description: 'Ball event type tag' },
  { key: '{{LAST_EVENT}}', label: 'Last Big Event Banner', category: 'Cricket', sports: ['CRICKET'], sampleValue: 'BOUNDARY FOUR', description: 'Last highlight event' },

  // Rates, Chase & Partnership
  { key: '{{CRR}}', label: 'Current Run Rate (CRR)', category: 'Cricket', sports: ['CRICKET'], sampleValue: '9.94', description: 'Current runs scored per over' },
  { key: '{{RUN_RATE}}', label: 'Run Rate', category: 'Cricket', sports: ['CRICKET'], sampleValue: '9.94', description: 'Current runs scored per over' },
  { key: '{{RRR}}', label: 'Required Run Rate (RRR)', category: 'Cricket', sports: ['CRICKET'], sampleValue: '11.45', description: 'Required runs per over in chase' },
  { key: '{{REQ_RUN_RATE}}', label: 'Required Run Rate', category: 'Cricket', sports: ['CRICKET'], sampleValue: '11.45', description: 'Required runs per over' },
  { key: '{{REQUIRED_RATE}}', label: 'Required Run Rate (Alias)', category: 'Cricket', sports: ['CRICKET'], sampleValue: '11.45', description: 'Required runs per over' },
  { key: '{{TARGET}}', label: 'Target Score', category: 'Cricket', sports: ['CRICKET'], sampleValue: '205', description: 'Target runs to win match' },
  { key: '{{RUNS_NEEDED}}', label: 'Runs Needed to Win', category: 'Cricket', sports: ['CRICKET'], sampleValue: '27', description: 'Remaining runs required' },
  { key: '{{RUNS_REQUIRED}}', label: 'Runs Required (Alias)', category: 'Cricket', sports: ['CRICKET'], sampleValue: '27', description: 'Remaining runs required' },
  { key: '{{BALLS_REMAINING}}', label: 'Balls Remaining', category: 'Cricket', sports: ['CRICKET'], sampleValue: '15', description: 'Legal deliveries remaining in chase' },
  { key: '{{PARTNERSHIP}}', label: 'Current Partnership', category: 'Cricket', sports: ['CRICKET'], sampleValue: '88 (49 balls)', description: 'Runs and balls in active partnership' },
  { key: '{{PARTNERSHIP_RUNS}}', label: 'Partnership Runs', category: 'Cricket', sports: ['CRICKET'], sampleValue: '88', description: 'Runs scored in active partnership' },
  { key: '{{PARTNERSHIP_BALLS}}', label: 'Partnership Balls', category: 'Cricket', sports: ['CRICKET'], sampleValue: '49', description: 'Balls in current partnership' },
  { key: '{{PARTNERSHIP_RATE}}', label: 'Partnership Run Rate', category: 'Cricket', sports: ['CRICKET'], sampleValue: '10.77', description: 'Run rate of active partnership' },
  { key: '{{PARTNERSHIP_START_SCORE}}', label: 'Partnership Start Score', category: 'Cricket', sports: ['CRICKET'], sampleValue: '96/4', description: 'Score when partnership began' },
  { key: '{{EXTRA_RUNS}}', label: 'Extras Total', category: 'Cricket', sports: ['CRICKET'], sampleValue: '12 (w 6, nb 2, b 4)', description: 'Total extras conceded' },
  { key: '{{EXTRAS}}', label: 'Extras Count', category: 'Cricket', sports: ['CRICKET'], sampleValue: '12', description: 'Total extras count' },
  { key: '{{EXTRA_TYPE}}', label: 'Extra Delivery Type', category: 'Cricket', sports: ['CRICKET'], sampleValue: 'WIDE', description: 'Type of extra (Wide, No Ball, etc)' },
  { key: '{{TOTAL_BALL_RUNS}}', label: 'Total Ball Runs + Extras', category: 'Cricket', sports: ['CRICKET'], sampleValue: '4', description: 'Runs + extras conceded on delivery' },
  { key: '{{LAST_BALL}}', label: 'Last Ball Event', category: 'Cricket', sports: ['CRICKET'], sampleValue: '4 Runs (Boundary)', description: 'Outcome of previous ball' },
  { key: '{{LAST_OVER}}', label: 'Last Over Runs', category: 'Cricket', sports: ['CRICKET'], sampleValue: '14 Runs (1 Wicket)', description: 'Summary of previous over' },
  { key: '{{THIS_OVER}}', label: 'Deliveries in Current Over', category: 'Cricket', sports: ['CRICKET'], sampleValue: '1 • 4 • 6 • W • 2 • 1', description: 'Current over ball string' },
  { key: '{{RECENT_BALLS}}', label: 'Recent Deliveries Over', category: 'Cricket', sports: ['CRICKET'], sampleValue: '1 • 4 • 6 • W • 2 • 1', description: 'Last over balls sequence' },
  { key: '{{OVER_NUMBER}}', label: 'Over Number Index', category: 'Cricket', sports: ['CRICKET'], sampleValue: '19', description: 'Ordinal number of the over' },
  { key: '{{OVER_RUNS}}', label: 'Runs Scored in Over', category: 'Cricket', sports: ['CRICKET'], sampleValue: '14', description: 'Total runs scored in this over' },
  { key: '{{OVER_BALLS}}', label: 'Balls Bowled in Over', category: 'Cricket', sports: ['CRICKET'], sampleValue: '6', description: 'Balls bowled in this over' },
  { key: '{{OVER_WICKETS}}', label: 'Wickets in Over', category: 'Cricket', sports: ['CRICKET'], sampleValue: '1', description: 'Wickets taken in this over' },
  { key: '{{OVER_SUMMARY}}', label: 'Over Summary String', category: 'Cricket', sports: ['CRICKET'], sampleValue: 'OVER 19: 1 • 4 • 6 • W • 2 • 1 (14 runs)', description: 'Full over summary' },

  // Wickets & Milestones
  { key: '{{WICKET}}', label: 'Wicket Event Flag', category: 'Cricket', sports: ['CRICKET'], sampleValue: 'WICKET', description: 'Wicket alert flag' },
  { key: '{{WICKET_TYPE}}', label: 'Wicket Mode of Dismissal', category: 'Cricket', sports: ['CRICKET'], sampleValue: 'CAUGHT', description: 'Bowled, Caught, LBW, Run Out, etc.' },
  { key: '{{DISMISSED_PLAYER}}', label: 'Dismissed Batsman Name', category: 'Cricket', sports: ['CRICKET'], sampleValue: 'Virat Kohli', description: 'Batsman dismissed on wicket' },
  { key: '{{DISMISSAL_TEXT}}', label: 'Dismissal Scorecard Line', category: 'Cricket', sports: ['CRICKET'], sampleValue: 'c Rahul b Bumrah', description: 'Detailed dismissal line' },
  { key: '{{ASSIST_PLAYER}}', label: 'Assist / Fielder / Catcher', category: 'Cricket', sports: ['CRICKET'], sampleValue: 'KL Rahul', description: 'Fielder involved in dismissal' },
  { key: '{{MILESTONE_TEXT}}', label: 'Milestone Banner Text', category: 'Cricket', sports: ['CRICKET'], sampleValue: '50 FOR VIRAT KOHLI!', description: 'Batsman or bowler milestone' },
  { key: '{{BATSMAN_MILESTONE}}', label: 'Batsman Milestone Tag', category: 'Cricket', sports: ['CRICKET'], sampleValue: 'HALF CENTURY (50 RUNS)', description: '50 or 100 milestone tag' },
  { key: '{{PARTNERSHIP_MILESTONE}}', label: 'Partnership Milestone Tag', category: 'Cricket', sports: ['CRICKET'], sampleValue: '50 RUN PARTNERSHIP', description: 'Partnership milestone' },
  { key: '{{BOWLER_MILESTONE}}', label: 'Bowler Milestone Tag', category: 'Cricket', sports: ['CRICKET'], sampleValue: '3-WICKET HAUL', description: 'Bowler milestone tag' },

  // Innings Break & Match Result
  { key: '{{INNINGS_BREAK_TITLE}}', label: 'Innings Break Title', category: 'Cricket', sports: ['CRICKET'], sampleValue: 'INNINGS BREAK', description: 'Header for innings break' },
  { key: '{{TOP_BATSMAN}}', label: 'Top Batsman Summary', category: 'Cricket', sports: ['CRICKET'], sampleValue: 'Virat Kohli 76* (42b)', description: 'Highest run scorer' },
  { key: '{{TOP_BOWLER}}', label: 'Top Bowler Summary', category: 'Cricket', sports: ['CRICKET'], sampleValue: 'Jasprit Bumrah 2/28 (3.3 ov)', description: 'Best bowler figures' },
  { key: '{{WINNING_TEAM}}', label: 'Winning Team Name', category: 'Cricket', sports: ['CRICKET'], sampleValue: 'Royal Challengers', description: 'Match winner' },
  { key: '{{RESULT_TEXT}}', label: 'Full Result Text', category: 'Cricket', sports: ['CRICKET'], sampleValue: 'Royal Challengers won by 24 runs', description: 'Outcome announcement' },
  { key: '{{WIN_MARGIN}}', label: 'Winning Margin', category: 'Cricket', sports: ['CRICKET'], sampleValue: '24 runs', description: 'Margin of victory' },
  { key: '{{POTM_NAME}}', label: 'Player of the Match Name', category: 'Cricket', sports: ['CRICKET'], sampleValue: 'Virat Kohli', description: 'Player of the match' },
  { key: '{{POTM_PHOTO}}', label: 'Player of the Match Photo', category: 'Cricket', sports: ['CRICKET'], sampleValue: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80', description: 'POTM Headshot', isImage: true },

  // Event Alert & Trigger Variables
  { key: '{{EVENT_TYPE}}', label: 'Active Event Type Tag', category: 'Cricket', sports: ['CRICKET'], sampleValue: 'FOUR', description: 'Active event identifier' },
  { key: '{{EVENT_TITLE}}', label: 'Event Banner Title', category: 'Cricket', sports: ['CRICKET'], sampleValue: 'BOUNDARY FOUR!', description: 'Primary headline banner' },
  { key: '{{EVENT_SUBTITLE}}', label: 'Event Subtitle / Detail', category: 'Cricket', sports: ['CRICKET'], sampleValue: 'Cracked through extra cover', description: 'Secondary event detail' },
  { key: '{{EVENT_MESSAGE}}', label: 'Event Message / Milestone', category: 'Cricket', sports: ['CRICKET'], sampleValue: '50 Runs off 28 Balls (7x4, 2x6)', description: 'Full event narrative' },
  { key: '{{EVENT_TAG}}', label: 'Event Short Tag', category: 'Cricket', sports: ['CRICKET'], sampleValue: '4', description: 'Compact event badge text' },
  { key: '{{BALL_RESULT}}', label: 'Ball Delivery Result', category: 'Cricket', sports: ['CRICKET'], sampleValue: '4', description: 'Delivery outcome tag' },
  { key: '{{DISMISSAL_MODE}}', label: 'Mode of Dismissal Tag', category: 'Cricket', sports: ['CRICKET'], sampleValue: 'CAUGHT', description: 'Bowled, Caught, LBW, Run Out' },
  { key: '{{FIELDER_NAME}}', label: 'Fielder Involved Name', category: 'Cricket', sports: ['CRICKET'], sampleValue: 'KL Rahul', description: 'Fielder or wicketkeeper name' },
  { key: '{{FIELDER_PHOTO}}', label: 'Fielder Photo URL', category: 'Cricket', sports: ['CRICKET'], sampleValue: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80', description: 'Fielder headshot', isImage: true },
  { key: '{{CATCH_TYPE}}', label: 'Catch Category', category: 'Cricket', sports: ['CRICKET'], sampleValue: 'Spectacular Diving Catch', description: 'Catch description' },
  { key: '{{MILESTONE_TITLE}}', label: 'Milestone Title', category: 'Cricket', sports: ['CRICKET'], sampleValue: 'HALF CENTURY', description: 'Milestone name' },
  { key: '{{MILESTONE_VALUE}}', label: 'Milestone Value Number', category: 'Cricket', sports: ['CRICKET'], sampleValue: '50', description: 'Milestone number' },
  { key: '{{MILESTONE_BALLS}}', label: 'Milestone Balls Taken', category: 'Cricket', sports: ['CRICKET'], sampleValue: '28', description: 'Balls taken for milestone' },
  { key: '{{MILESTONE_4S}}', label: 'Milestone Fours', category: 'Cricket', sports: ['CRICKET'], sampleValue: '7', description: 'Fours hit towards milestone' },
  { key: '{{MILESTONE_6S}}', label: 'Milestone Sixes', category: 'Cricket', sports: ['CRICKET'], sampleValue: '2', description: 'Sixes hit towards milestone' },
  { key: '{{MILESTONE_SR}}', label: 'Milestone Strike Rate', category: 'Cricket', sports: ['CRICKET'], sampleValue: '178.57', description: 'Strike rate at milestone' },
  { key: '{{HAUL_WICKETS}}', label: 'Bowler Haul Wickets', category: 'Cricket', sports: ['CRICKET'], sampleValue: '5', description: 'Wickets taken in haul' },
  { key: '{{HAUL_RUNS}}', label: 'Bowler Haul Runs', category: 'Cricket', sports: ['CRICKET'], sampleValue: '18', description: 'Runs conceded in haul' },
  { key: '{{HAUL_OVERS}}', label: 'Bowler Haul Overs', category: 'Cricket', sports: ['CRICKET'], sampleValue: '4.0', description: 'Overs bowled in haul' },
  { key: '{{HAUL_ECONOMY}}', label: 'Bowler Haul Economy', category: 'Cricket', sports: ['CRICKET'], sampleValue: '4.50', description: 'Economy rate in haul' },
  { key: '{{PARTNER_A_RUNS}}', label: 'Partner A Runs in Stand', category: 'Cricket', sports: ['CRICKET'], sampleValue: '54 (28)', description: 'Runs by partner A' },
  { key: '{{PARTNER_B_RUNS}}', label: 'Partner B Runs in Stand', category: 'Cricket', sports: ['CRICKET'], sampleValue: '34 (21)', description: 'Runs by partner B' },
  { key: '{{INNINGS_SUMMARY}}', label: 'Full Innings Summary', category: 'Cricket', sports: ['CRICKET'], sampleValue: 'Royal Challengers: 184/4 in 20.0 overs', description: 'Innings outcome summary' },
  { key: '{{TARGET_RUNS}}', label: 'Target Runs in Chase', category: 'Cricket', sports: ['CRICKET'], sampleValue: '185', description: 'Target to win' },
  { key: '{{TARGET_RRR}}', label: 'Required Run Rate at Break', category: 'Cricket', sports: ['CRICKET'], sampleValue: '9.25', description: 'Starting required run rate' },
  { key: '{{MATCH_WINNER}}', label: 'Match Winner Name', category: 'Cricket', sports: ['CRICKET'], sampleValue: 'Royal Challengers', description: 'Winning team name' },

  // 6. Football / Soccer Dynamic Fields
  { key: '{{MATCH_CLOCK}}', label: 'Match Clock / Running Time', category: 'Clock & Time', sports: ['FOOTBALL', 'HOCKEY', 'BASKETBALL', 'KABADDI'], sampleValue: "78:24", description: 'Active running game clock' },
  { key: '{{PERIOD}}', label: 'Match Period / Half', category: 'Clock & Time', sports: ['FOOTBALL', 'HOCKEY', 'BASKETBALL', 'CUSTOM'], sampleValue: '2nd Half', description: 'Current period of play' },
  { key: '{{HALF}}', label: 'Current Half', category: 'Football', sports: ['FOOTBALL', 'KABADDI'], sampleValue: '2nd Half', description: 'Half of the fixture' },
  { key: '{{GOALS}}', label: 'Goals Line', category: 'Football', sports: ['FOOTBALL', 'HOCKEY'], sampleValue: '2 - 1', description: 'Combined goal score' },
  { key: '{{GOAL_SCORER}}', label: 'Goal Scorer Name', category: 'Football', sports: ['FOOTBALL', 'HOCKEY'], sampleValue: 'Kylian Mbappe (64\')', description: 'Player who scored last goal' },
  { key: '{{ASSISTS}}', label: 'Assist Maker', category: 'Football', sports: ['FOOTBALL', 'HOCKEY'], sampleValue: 'Kevin De Bruyne', description: 'Player providing goal assist' },
  { key: '{{TEAM_A_GOALS}}', label: 'Team A Goals', category: 'Football', sports: ['FOOTBALL', 'HOCKEY'], sampleValue: '2', description: 'Goals scored by Team A' },
  { key: '{{TEAM_B_GOALS}}', label: 'Team B Goals', category: 'Football', sports: ['FOOTBALL', 'HOCKEY'], sampleValue: '1', description: 'Goals scored by Team B' },
  { key: '{{YELLOW_CARDS_A}}', label: 'Team A Yellow Cards', category: 'Football', sports: ['FOOTBALL', 'HOCKEY'], sampleValue: '2', description: 'Yellow cards received by Team A' },
  { key: '{{YELLOW_CARDS_B}}', label: 'Team B Yellow Cards', category: 'Football', sports: ['FOOTBALL', 'HOCKEY'], sampleValue: '1', description: 'Yellow cards received by Team B' },
  { key: '{{RED_CARDS_A}}', label: 'Team A Red Cards', category: 'Football', sports: ['FOOTBALL', 'HOCKEY'], sampleValue: '0', description: 'Red cards received by Team A' },
  { key: '{{RED_CARDS_B}}', label: 'Team B Red Cards', category: 'Football', sports: ['FOOTBALL', 'HOCKEY'], sampleValue: '1', description: 'Red cards received by Team B' },
  { key: '{{CORNERS_A}}', label: 'Team A Corners', category: 'Football', sports: ['FOOTBALL', 'HOCKEY'], sampleValue: '6', description: 'Corner kicks for Team A' },
  { key: '{{CORNERS_B}}', label: 'Team B Corners', category: 'Football', sports: ['FOOTBALL', 'HOCKEY'], sampleValue: '3', description: 'Corner kicks for Team B' },
  { key: '{{PENALTY_SCORE}}', label: 'Penalty Shootout Score', category: 'Football', sports: ['FOOTBALL', 'HOCKEY'], sampleValue: '4 - 3', description: 'Penalty shootout score' },
  { key: '{{EXTRA_TIME}}', label: 'Added / Extra Time', category: 'Football', sports: ['FOOTBALL'], sampleValue: '+4 min', description: 'Stoppage or extra time indicator' },

  // 7. Field Hockey Dynamic Fields
  { key: '{{QUARTER}}', label: 'Match Quarter', category: 'Hockey', sports: ['HOCKEY', 'BASKETBALL'], sampleValue: 'Q3', description: 'Current quarter (Q1, Q2, Q3, Q4)' },
  { key: '{{PENALTY_CORNERS_A}}', label: 'Team A Penalty Corners', category: 'Hockey', sports: ['HOCKEY'], sampleValue: '5', description: 'Penalty corners for Team A' },
  { key: '{{PENALTY_CORNERS_B}}', label: 'Team B Penalty Corners', category: 'Hockey', sports: ['HOCKEY'], sampleValue: '2', description: 'Penalty corners for Team B' },
  { key: '{{GREEN_CARDS_A}}', label: 'Team A Green Cards (2 min)', category: 'Hockey', sports: ['HOCKEY'], sampleValue: '1', description: 'Green card suspensions for Team A' },
  { key: '{{GREEN_CARDS_B}}', label: 'Team B Green Cards (2 min)', category: 'Hockey', sports: ['HOCKEY'], sampleValue: '0', description: 'Green card suspensions for Team B' },
  { key: '{{SIN_BIN}}', label: 'Sin Bin / Active Suspension', category: 'Hockey', sports: ['HOCKEY'], sampleValue: 'Suspension: 01:45 remaining', description: 'Hockey sin bin countdown' },
  { key: '{{SHOOTOUT_SCORE}}', label: 'Shootout Score', category: 'Hockey', sports: ['HOCKEY', 'FOOTBALL'], sampleValue: '3 - 2 (SO)', description: 'Field hockey shootout result' },

  // 8. Kabaddi Dynamic Fields
  { key: '{{RAIDER_NAME}}', label: 'Active Raider Name', category: 'Kabaddi', sports: ['KABADDI'], sampleValue: 'Pardeep Narwal', description: 'Active raider currently raiding' },
  { key: '{{CURRENT_RAIDER}}', label: 'Current Raider Summary', category: 'Kabaddi', sports: ['KABADDI'], sampleValue: 'P. Narwal (12 pts)', description: 'Raider with raid statistics' },
  { key: '{{RAID_POINTS}}', label: 'Raid Points Earned', category: 'Kabaddi', sports: ['KABADDI'], sampleValue: '+3 Super Raid', description: 'Points earned in last raid' },
  { key: '{{TACKLE_POINTS}}', label: 'Tackle Points', category: 'Kabaddi', sports: ['KABADDI'], sampleValue: '+2 Super Tackle', description: 'Tackle points awarded' },
  { key: '{{BONUS_POINTS}}', label: 'Bonus Point Status', category: 'Kabaddi', sports: ['KABADDI'], sampleValue: 'Bonus Active', description: 'Bonus point scored or available' },
  { key: '{{SUPER_RAID}}', label: 'Super Raid Alert', category: 'Kabaddi', sports: ['KABADDI'], sampleValue: 'SUPER RAID (3 PTS)', description: 'Super raid indicator' },
  { key: '{{SUPER_TACKLE}}', label: 'Super Tackle Alert', category: 'Kabaddi', sports: ['KABADDI'], sampleValue: 'SUPER TACKLE ON', description: 'Super tackle active (< 4 defenders)' },
  { key: '{{ALL_OUT_A}}', label: 'Team A All Out Count', category: 'Kabaddi', sports: ['KABADDI'], sampleValue: '1 All Out', description: 'All-outs inflicted by/on Team A' },
  { key: '{{ALL_OUT_B}}', label: 'Team B All Out Count', category: 'Kabaddi', sports: ['KABADDI'], sampleValue: '2 All Outs', description: 'All-outs inflicted by/on Team B' },
  { key: '{{RAID_TIMER}}', label: 'Raid 30s Countdown', category: 'Kabaddi', sports: ['KABADDI'], sampleValue: '18s', description: '30-second raid clock remaining' },
  { key: '{{ACTIVE_DEFENDERS}}', label: 'Active Defenders on Mat', category: 'Kabaddi', sports: ['KABADDI'], sampleValue: '5 Defenders', description: 'Defenders remaining on mat' },
  { key: '{{DO_OR_DIE}}', label: 'Do Or Die Raid Status', category: 'Kabaddi', sports: ['KABADDI'], sampleValue: 'DO OR DIE RAID', description: 'Indicator if raid is Do Or Die' },
  { key: '{{TEAM_A_SCORE}}', label: 'Team A Score / Points', category: 'Kabaddi', sports: ['KABADDI', 'FOOTBALL', 'HOCKEY', 'BASKETBALL'], sampleValue: '34', description: 'Total points/goals of Team A' },
  { key: '{{TEAM_B_SCORE}}', label: 'Team B Score / Points', category: 'Kabaddi', sports: ['KABADDI', 'FOOTBALL', 'HOCKEY', 'BASKETBALL'], sampleValue: '28', description: 'Total points/goals of Team B' },

  // 9. Volleyball Dynamic Fields
  { key: '{{SET_SCORE}}', label: 'Set Score Overall', category: 'Volleyball', sports: ['VOLLEYBALL', 'TENNIS', 'BADMINTON', 'TABLE_TENNIS'], sampleValue: '25-21, 23-25, 15-12', description: 'Sets score line' },
  { key: '{{MATCH_SCORE}}', label: 'Match Sets Score (e.g. 2 - 1)', category: 'Volleyball', sports: ['VOLLEYBALL', 'TENNIS', 'BADMINTON', 'TABLE_TENNIS'], sampleValue: '2 - 1', description: 'Total sets won by each team' },
  { key: '{{CURRENT_SET}}', label: 'Current Set Number', category: 'Volleyball', sports: ['VOLLEYBALL', 'TENNIS', 'BADMINTON', 'TABLE_TENNIS'], sampleValue: 'Set 3', description: 'Active set identifier' },
  { key: '{{CURRENT_SET_POINTS}}', label: 'Current Set Points', category: 'Volleyball', sports: ['VOLLEYBALL', 'BADMINTON', 'TABLE_TENNIS'], sampleValue: '23 - 21', description: 'Points in active set' },
  { key: '{{SERVING_TEAM}}', label: 'Serving Team Name', category: 'Volleyball', sports: ['VOLLEYBALL', 'TENNIS', 'BADMINTON', 'TABLE_TENNIS'], sampleValue: 'Royal Challengers', description: 'Team with service possession' },
  { key: '{{SERVER_NAME}}', label: 'Active Server Name', category: 'Volleyball', sports: ['VOLLEYBALL', 'TENNIS', 'BADMINTON', 'TABLE_TENNIS'], sampleValue: 'Yuji Nishida', description: 'Player currently serving' },
  { key: '{{SET_POINT}}', label: 'Set Point Alert', category: 'Volleyball', sports: ['VOLLEYBALL', 'TENNIS', 'BADMINTON', 'TABLE_TENNIS'], sampleValue: 'SET POINT (TEAM A)', description: 'Set point notification' },
  { key: '{{MATCH_POINT}}', label: 'Match Point Alert', category: 'Volleyball', sports: ['VOLLEYBALL', 'TENNIS', 'BADMINTON', 'TABLE_TENNIS'], sampleValue: 'CHAMPIONSHIP MATCH POINT', description: 'Match point notification' },
  { key: '{{TIMEOUTS_LEFT}}', label: 'Timeouts Remaining', category: 'Volleyball', sports: ['VOLLEYBALL', 'BASKETBALL', 'KABADDI'], sampleValue: '1 Timeout Left', description: 'Timeouts remaining' },
  { key: '{{TEAM_A_SETS}}', label: 'Team A Sets Won', category: 'Volleyball', sports: ['VOLLEYBALL', 'TENNIS', 'BADMINTON', 'TABLE_TENNIS'], sampleValue: '2', description: 'Sets won by Team A' },
  { key: '{{TEAM_B_SETS}}', label: 'Team B Sets Won', category: 'Volleyball', sports: ['VOLLEYBALL', 'TENNIS', 'BADMINTON', 'TABLE_TENNIS'], sampleValue: '1', description: 'Sets won by Team B' },

  // 10. Basketball Dynamic Fields
  { key: '{{GAME_CLOCK}}', label: 'Basketball Game Clock', category: 'Basketball', sports: ['BASKETBALL'], sampleValue: '04:18', description: 'Quarter countdown clock' },
  { key: '{{SHOT_CLOCK}}', label: 'Shot Clock (24s / 14s)', category: 'Basketball', sports: ['BASKETBALL'], sampleValue: '14s', description: 'Seconds remaining on shot clock' },
  { key: '{{TEAM_A_POINTS}}', label: 'Team A Points', category: 'Basketball', sports: ['BASKETBALL'], sampleValue: '86', description: 'Points scored by Team A' },
  { key: '{{TEAM_B_POINTS}}', label: 'Team B Points', category: 'Basketball', sports: ['BASKETBALL'], sampleValue: '82', description: 'Points scored by Team B' },
  { key: '{{TEAM_A_FOULS}}', label: 'Team A Fouls (Quarter)', category: 'Basketball', sports: ['BASKETBALL'], sampleValue: '4', description: 'Team fouls in current quarter' },
  { key: '{{TEAM_B_FOULS}}', label: 'Team B Fouls (Quarter)', category: 'Basketball', sports: ['BASKETBALL'], sampleValue: '3', description: 'Team fouls in current quarter' },
  { key: '{{TIMEOUTS_A}}', label: 'Team A Timeouts Left', category: 'Basketball', sports: ['BASKETBALL'], sampleValue: '2', description: 'Timeouts left for Team A' },
  { key: '{{TIMEOUTS_B}}', label: 'Team B Timeouts Left', category: 'Basketball', sports: ['BASKETBALL'], sampleValue: '1', description: 'Timeouts left for Team B' },
  { key: '{{TOP_SCORER_NAME}}', label: 'Top Match Scorer', category: 'Basketball', sports: ['BASKETBALL'], sampleValue: 'LeBron James', description: 'Leading match scorer' },
  { key: '{{TOP_SCORER_POINTS}}', label: 'Top Scorer Points / Stats', category: 'Basketball', sports: ['BASKETBALL'], sampleValue: '32 PTS (8 AST)', description: 'Points scored by match leader' },

  // 11. Tennis Dynamic Fields
  { key: '{{RECEIVER_NAME}}', label: 'Receiver Player Name', category: 'Tennis', sports: ['TENNIS', 'BADMINTON', 'TABLE_TENNIS'], sampleValue: 'Novak Djokovic', description: 'Player returning serve' },
  { key: '{{GAME_SCORE}}', label: 'Current Game Points', category: 'Tennis', sports: ['TENNIS'], sampleValue: '40 - 30', description: 'Tennis game points (15, 30, 40, AD)' },
  { key: '{{BREAK_POINT}}', label: 'Break Point Indicator', category: 'Tennis', sports: ['TENNIS'], sampleValue: 'BREAK POINT', description: 'Indicator if receiving player has break point' },
  { key: '{{GAME_POINT}}', label: 'Game Point Indicator', category: 'Tennis', sports: ['TENNIS', 'BADMINTON', 'TABLE_TENNIS'], sampleValue: 'GAME POINT', description: 'Game point notification' },
  { key: '{{TIE_BREAK}}', label: 'Tie-Break Score', category: 'Tennis', sports: ['TENNIS'], sampleValue: 'TB: 6 - 4', description: 'Points during set tie-breaker' },
  { key: '{{ACE_COUNT}}', label: 'Total Match Aces', category: 'Tennis', sports: ['TENNIS', 'VOLLEYBALL'], sampleValue: '14 Aces', description: 'Aces served in match' },
  { key: '{{SERVE_SPEED}}', label: 'Serve Speed (km/h / mph)', category: 'Tennis', sports: ['TENNIS'], sampleValue: '218 km/h', description: 'Speed of last serve delivery' },

  // 12. Badminton Dynamic Fields
  { key: '{{SERVICE_COURT}}', label: 'Service Court (Left/Right)', category: 'Badminton', sports: ['BADMINTON'], sampleValue: 'Right Court (Even)', description: 'Active service court' },
  { key: '{{INTERVAL}}', label: '11-Point Interval Break', category: 'Badminton', sports: ['BADMINTON'], sampleValue: '11-Point Interval', description: 'Mid-game 11-point interval alert' },
  { key: '{{DEUCE}}', label: 'Deuce (20-20+)', category: 'Badminton', sports: ['BADMINTON', 'TABLE_TENNIS', 'TENNIS'], sampleValue: 'DEUCE (20 - 20)', description: 'Deuce game state' },
  { key: '{{SHUTTLE_SPEED}}', label: 'Smash Speed (km/h)', category: 'Badminton', sports: ['BADMINTON'], sampleValue: '412 km/h', description: 'Recorded smash velocity' },

  // 13. Table Tennis Dynamic Fields
  { key: '{{SERVICE_NUMBER}}', label: 'Service Turn (Serve 1 / 2)', category: 'Table Tennis', sports: ['TABLE_TENNIS'], sampleValue: 'Serve 2 of 2', description: 'Active 2-serve rotation index' },
  { key: '{{TIMEOUT}}', label: '1-Minute Timeout', category: 'Table Tennis', sports: ['TABLE_TENNIS'], sampleValue: 'TIMEOUT (00:45)', description: 'Player timeout countdown' },
  { key: '{{EDGE_BALL}}', label: 'Edge Ball Decision', category: 'Table Tennis', sports: ['TABLE_TENNIS'], sampleValue: 'EDGE BALL • POINT REPLAY', description: 'Table tennis edge ball alert' },
  { key: '{{NET_BALL}}', label: 'Net / Let Serve', category: 'Table Tennis', sports: ['TABLE_TENNIS'], sampleValue: 'LET • RE-SERVE', description: 'Net cord re-serve alert' },

  // 14. Time & Interval Controls
  { key: '{{TIME_REMAINING}}', label: 'Time Remaining Countdown', category: 'Clock & Time', sports: ['ALL'], sampleValue: '03:45', description: 'Countdown or period time remaining' },
  { key: '{{PERIOD_NAME}}', label: 'Period / Half / Quarter Name', category: 'Clock & Time', sports: ['ALL'], sampleValue: '1st Half', description: 'Current active interval name' },
];

export const SPORT_GRAPHIC_CATEGORIES: Record<SportType, string[]> = {
  CRICKET: [
    'Scorebug',
    'Lower Third',
    'Player Introduction',
    'Team Introduction',
    'FOUR',
    'SIX',
    'WICKET',
    'FIFTY',
    'CENTURY',
    'PARTNERSHIP',
    'OVER COMPLETE',
    'INNINGS BREAK',
    'MATCH RESULT',
    'MAN OF THE MATCH',
    'CUSTOM',
  ],
  TENNIS: [
    'Scorebug',
    'Player Introduction',
    'ACE',
    'DOUBLE FAULT',
    'WINNER',
    'BREAK POINT',
    'BREAK WON',
    'DEUCE',
    'ADVANTAGE',
    'SET WON',
    'MATCH POINT',
    'MATCH WON',
    'PLAYER OF THE MATCH',
    'CUSTOM',
  ],
  VOLLEYBALL: [
    'Scorebug',
    'ACE',
    'SPIKE',
    'BLOCK',
    'SET POINT',
    'SET WON',
    'MATCH POINT',
    'MATCH WON',
    'TIMEOUT',
    'SUBSTITUTION',
    'PLAYER OF THE MATCH',
    'CUSTOM',
  ],
  KABADDI: [
    'Scorebug',
    'RAID POINT',
    'SUPER RAID',
    'SUPER TACKLE',
    'ALL OUT',
    'DO OR DIE',
    'TIMEOUT',
    'MATCH POINT',
    'MATCH WON',
    'PLAYER OF THE MATCH',
    'CUSTOM',
  ],
  FOOTBALL: [
    'Scorebug',
    'GOAL',
    'YELLOW CARD',
    'RED CARD',
    'PENALTY',
    'VAR CHECK',
    'SUBSTITUTION',
    'HALF TIME',
    'FULL TIME',
    'PLAYER OF THE MATCH',
    'CUSTOM',
  ],
  HOCKEY: [
    'Scorebug',
    'GOAL',
    'PENALTY CORNER',
    'PENALTY STROKE',
    'GREEN CARD',
    'YELLOW CARD',
    'RED CARD',
    'QUARTER END',
    'FULL TIME',
    'PLAYER OF THE MATCH',
    'CUSTOM',
  ],
  BASKETBALL: [
    'Scorebug',
    'THREE POINTER',
    'SLAM DUNK',
    'FOUL',
    'FREE THROW',
    'TIMEOUT',
    'QUARTER END',
    'HALFTIME',
    'FINAL SCORE',
    'PLAYER OF THE GAME',
    'CUSTOM',
  ],
  BADMINTON: [
    'Scorebug',
    'Player Introduction',
    'SMASH',
    'GAME POINT',
    'MATCH POINT',
    'INTERVAL',
    'GAME WON',
    'MATCH WON',
    'PLAYER OF THE MATCH',
    'CUSTOM',
  ],
  TABLE_TENNIS: [
    'Scorebug',
    'Player Introduction',
    'EDGE BALL',
    'GAME POINT',
    'MATCH POINT',
    'TIMEOUT',
    'GAME WON',
    'MATCH WON',
    'PLAYER OF THE MATCH',
    'CUSTOM',
  ],
  PICKLEBALL: [
    'Scorebug',
    'Player Introduction',
    'POINT',
    'SIDE OUT',
    'KITCHEN FAULT',
    'GAME POINT',
    'MATCH POINT',
    'MATCH WON',
    'PLAYER OF THE MATCH',
    'CUSTOM',
  ],
  HANDBALL: [
    'Scorebug',
    'GOAL',
    '7M PENALTY',
    '2 MIN SUSPENSION',
    'RED CARD',
    'HALF TIME',
    'FULL TIME',
    'PLAYER OF THE MATCH',
    'CUSTOM',
  ],
  SQUASH: [
    'Scorebug',
    'Player Introduction',
    'POINT',
    'STROKE',
    'YES LET',
    'TIN ERROR',
    'GAME POINT',
    'MATCH POINT',
    'MATCH WON',
    'PLAYER OF THE MATCH',
    'CUSTOM',
  ],
  CUSTOM: [
    'Scorebug',
    'Lower Third',
    'Player Introduction',
    'Big Event / Alert',
    'Custom Banner',
    'Sponsor Highlight',
    'Score Summary',
    'CUSTOM',
  ],
  OTHER: [
    'Scorebug',
    'Lower Third',
    'Player Introduction',
    'Event',
    'Match Result',
    'CUSTOM',
  ],
};

/**
 * Filter dynamic fields for a specific sport
 */
export function getFieldsForSport(sport: SportType | 'ALL'): DynamicFieldDefinition[] {
  if (sport === 'ALL') return DYNAMIC_FIELDS;
  return DYNAMIC_FIELDS.filter(
    (f) => f.sports.includes('ALL') || f.sports.includes(sport as SportType)
  );
}

/**
 * Replace dynamic fields in a text string with realistic mock data or active context data
 */
export function substituteDynamicFields(
  rawText: string,
  customData?: Record<string, string>
): string {
  if (!rawText) return '';

  let result = rawText;

  // Fallback defaults map
  const fallbackMap: Record<string, string> = {};
  DYNAMIC_FIELDS.forEach((f) => {
    fallbackMap[f.key] = f.sampleValue;
  });

  const mergedData = { ...fallbackMap, ...(customData || {}) };

  Object.entries(mergedData).forEach(([key, val]) => {
    if (result.includes(key)) {
      result = result.replaceAll(key, String(val));
    }
  });

  return result;
}

/**
 * Helper to format player names for broadcast overlays
 * Supports full, short, initial_surname (e.g. 'V. Kohli'), surname (e.g. 'Kohli')
 */
export function formatPlayerName(
  fullName: string,
  format?: 'full' | 'first_name' | 'short' | 'initial_surname' | 'surname' | 'none'
): string {
  if (!fullName || !fullName.trim()) return '';
  const trimmed = fullName.trim();
  if (!format || format === 'full' || format === 'none') return trimmed;

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return trimmed;

  switch (format) {
    case 'first_name':
      return parts[0];
    case 'short':
      return `${parts[0].charAt(0).toUpperCase()}. ${parts.slice(1).join(' ')}`;
    case 'initial_surname': {
      const initial = parts[0].charAt(0).toUpperCase();
      const surname = parts.slice(1).join(' ');
      return `${initial}. ${surname}`;
    }
    case 'surname':
      return parts.slice(1).join(' ') || parts[0];
    default:
      return trimmed;
  }
}

/**
 * Applies custom field formatting rules (e.g. integer, 1 decimal, 2 decimals, currency, percentage, overs)
 */
export function formatLiveFieldValue(
  rawValue: string,
  formatter?: string,
  prefix = '',
  suffix = '',
  transform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize'
): string {
  if (!rawValue) return `${prefix}${suffix}`;

  let formatted = rawValue;

  if (formatter && formatter !== 'none') {
    const num = parseFloat(rawValue.replace(/[^0-9.-]+/g, ''));
    if (!isNaN(num)) {
      switch (formatter) {
        case 'integer':
          formatted = Math.round(num).toString();
          break;
        case 'decimal_1':
          formatted = num.toFixed(1);
          break;
        case 'decimal_2':
          formatted = num.toFixed(2);
          break;
        case 'currency':
          formatted = `$${num.toLocaleString()}`;
          break;
        case 'percentage':
          formatted = `${num.toFixed(1)}%`;
          break;
        case 'strike_rate':
          formatted = num.toFixed(1);
          break;
        case 'overs_format':
          formatted = `${num} ov`;
          break;
        default:
          break;
      }
    }
  }

  // Apply transforms
  if (transform === 'uppercase') {
    formatted = formatted.toUpperCase();
  } else if (transform === 'lowercase') {
    formatted = formatted.toLowerCase();
  } else if (transform === 'capitalize') {
    formatted = formatted.replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return `${prefix}${formatted}${suffix}`;
}

/**
 * Resolve live value for a LIVE_DATA element or dynamic text element
 */
export function resolveLiveFieldValue(
  element: GraphicElement,
  activeVars: Record<string, string>,
  isSimulatingData = true
): string {
  // Determine raw key / template formula
  const rawFieldKey = element.liveDataField || element.dynamicFieldKey || element.text || '{{SCORE}}';

  let resolved = rawFieldKey;

  if (isSimulatingData || Object.keys(activeVars).length > 0) {
    if (Object.keys(activeVars).length > 0) {
      Object.entries(activeVars).forEach(([k, v]) => {
        if (resolved.includes(k)) {
          resolved = resolved.replaceAll(k, String(v));
        }
      });
    }
    if (isSimulatingData) {
      resolved = substituteDynamicFields(resolved, activeVars);
    }
  }

  // If still unresolved or empty, check fallback
  const isTagStillPresent = resolved.includes('{{') && resolved.includes('}}');
  if (!resolved.trim() || isTagStillPresent) {
    if (element.liveDataFallback !== undefined && element.liveDataFallback !== '') {
      resolved = element.liveDataFallback;
    } else if (isTagStillPresent) {
      // Find matching definition
      const matched = DYNAMIC_FIELDS.find((f) => f.key === rawFieldKey);
      if (matched && isSimulatingData) {
        resolved = matched.sampleValue;
      }
    }
  }

  // Apply player name formatting if applicable
  if (element.playerNameFormat && element.playerNameFormat !== 'none' && element.playerNameFormat !== 'full') {
    resolved = formatPlayerName(resolved, element.playerNameFormat);
  }

  const transform = element.liveDataTransform || element.textTransform;
  const prefix = element.liveDataPrefix || '';
  const suffix = element.liveDataSuffix || '';

  return formatLiveFieldValue(
    resolved,
    (element as any).liveDataFormatter || 'none',
    prefix,
    suffix,
    transform as any
  );
}

/**
 * Evaluates conditional visibility rules for a live data element
 */
export function checkConditionalVisibility(
  element: GraphicElement,
  activeVars: Record<string, string>,
  rawResolvedValue?: string
): boolean {
  if (!element.conditionalVisibility || !element.conditionalVisibility.enabled) {
    return true;
  }

  const { condition, targetValue } = element.conditionalVisibility;
  const val = rawResolvedValue !== undefined ? rawResolvedValue : resolveLiveFieldValue(element, activeVars, true);

  switch (condition) {
    case 'NOT_EMPTY':
      return Boolean(val && val.trim().length > 0 && val !== '-' && val !== 'N/A' && val !== '0/0');

    case 'EQUALS':
      return val.trim().toLowerCase() === (targetValue || '').trim().toLowerCase();

    case 'NOT_EQUALS':
      return val.trim().toLowerCase() !== (targetValue || '').trim().toLowerCase();

    case 'GREATER_THAN': {
      const numVal = parseFloat(val.replace(/[^0-9.-]+/g, ''));
      const numTarget = parseFloat((targetValue || '0').replace(/[^0-9.-]+/g, ''));
      return !isNaN(numVal) && !isNaN(numTarget) && numVal > numTarget;
    }

    case 'LESS_THAN': {
      const numVal = parseFloat(val.replace(/[^0-9.-]+/g, ''));
      const numTarget = parseFloat((targetValue || '0').replace(/[^0-9.-]+/g, ''));
      return !isNaN(numVal) && !isNaN(numTarget) && numVal < numTarget;
    }

    case 'INNINGS_2': {
      const status = activeVars['{{MATCH_STATUS}}'] || activeVars['{{INNINGS}}'] || activeVars['{{INNINGS_NUMBER}}'] || '';
      return status.toLowerCase().includes('2nd') || status.toLowerCase().includes('chase') || status.toLowerCase().includes('innings 2');
    }

    case 'INNINGS_ACTIVE': {
      const status = activeVars['{{MATCH_STATUS}}'] || '';
      return !status.toLowerCase().includes('complete') && !status.toLowerCase().includes('finished') && !status.toLowerCase().includes('scheduled');
    }

    case 'MATCH_LIVE': {
      const status = activeVars['{{MATCH_STATUS}}'] || '';
      return (
        status.toLowerCase().includes('live') ||
        status.toLowerCase().includes('in progress') ||
        status.toLowerCase().includes('chase') ||
        status === '' // Default true during active previews
      );
    }

    case 'CLOCK_RUNNING': {
      const clock = activeVars['{{MATCH_CLOCK}}'] || activeVars['{{GAME_CLOCK}}'] || '';
      return Boolean(clock && clock !== '00:00' && clock !== '0:00');
    }

    case 'STRIKER_EXISTS': {
      const striker = activeVars['{{STRIKER_NAME}}'] || activeVars['{{BATSMAN_NAME}}'] || activeVars['{{STRIKER}}'] || '';
      return Boolean(striker && striker !== '-' && striker !== 'N/A');
    }

    case 'NON_STRIKER_EXISTS': {
      const nonStriker = activeVars['{{NON_STRIKER_NAME}}'] || activeVars['{{NON_STRIKER}}'] || '';
      return Boolean(nonStriker && nonStriker !== '-' && nonStriker !== 'N/A');
    }

    case 'BOWLER_EXISTS': {
      const bowler = activeVars['{{BOWLER_NAME}}'] || activeVars['{{CURRENT_BOWLER}}'] || activeVars['{{BOWLER}}'] || '';
      return Boolean(bowler && bowler !== '-' && bowler !== 'N/A');
    }

    case 'BALL_EVENT_EXISTS': {
      const event = activeVars['{{CURRENT_BALL_EVENT}}'] || activeVars['{{LAST_BALL_RESULT}}'] || activeVars['{{BALL_EVENT}}'] || '';
      return Boolean(event && event !== '-' && event !== 'N/A');
    }

    case 'WICKET': {
      const wicket = activeVars['{{LAST_BALL_WICKET}}'] || activeVars['{{LAST_BALL_RESULT}}'] || activeVars['{{LAST_BALL_DISMISSAL}}'] || activeVars['{{WICKET}}'] || '';
      return (
        wicket.toLowerCase().includes('wicket') ||
        wicket.toUpperCase() === 'W' ||
        wicket.toLowerCase().includes('out') ||
        wicket.toLowerCase().includes(' b ') ||
        wicket.toLowerCase().includes(' c ')
      );
    }

    case 'MATCH_COMPLETED': {
      const status = activeVars['{{MATCH_STATUS}}'] || '';
      return status.toLowerCase().includes('complete') || status.toLowerCase().includes('finish') || status.toLowerCase().includes('ended') || status.toLowerCase().includes('result') || status.toLowerCase().includes('won');
    }

    case 'FOUR': {
      const ball = activeVars['{{CURRENT_BALL_EVENT}}'] || activeVars['{{LAST_BALL_RESULT}}'] || activeVars['{{BALL_EVENT}}'] || '';
      return ball.includes('4') || ball.toLowerCase().includes('four');
    }

    case 'SIX': {
      const ball = activeVars['{{CURRENT_BALL_EVENT}}'] || activeVars['{{LAST_BALL_RESULT}}'] || activeVars['{{BALL_EVENT}}'] || '';
      return ball.includes('6') || ball.toLowerCase().includes('six') || ball.toLowerCase().includes('maximum');
    }

    case 'EXTRA': {
      const extra = activeVars['{{EXTRA_TYPE}}'] || activeVars['{{LAST_BALL_RESULT}}'] || '';
      return extra.toLowerCase().includes('wide') || extra.toLowerCase().includes('no') || extra.toLowerCase().includes('nb') || extra.toLowerCase().includes('wd') || extra.toLowerCase().includes('bye');
    }

    case 'CHASE_ACTIVE': {
      const target = parseFloat(activeVars['{{TARGET}}'] || '0');
      const status = activeVars['{{MATCH_STATUS}}'] || activeVars['{{INNINGS}}'] || '';
      return target > 0 || status.toLowerCase().includes('2nd') || status.toLowerCase().includes('chase');
    }

    case 'PARTNERSHIP_ACTIVE': {
      const pRuns = parseFloat(activeVars['{{PARTNERSHIP_RUNS}}'] || '0');
      return pRuns > 0;
    }

    case 'MILESTONE_ACTIVE': {
      const milestone = activeVars['{{MILESTONE_TEXT}}'] || activeVars['{{BATSMAN_MILESTONE}}'] || '';
      return Boolean(milestone && milestone.trim().length > 0);
    }

    case 'SHOW':
      return true;

    case 'HIDE':
      return false;

    case 'AUTO':
      return Boolean(val && val.trim().length > 0 && val !== '-' && val !== 'N/A');

    default:
      return true;
  }
}

/**
 * Cricket Ball Event Graphics Engine Helpers
 */
export interface BallEventVisualInfo {
  tag: string;
  shortLetter: string;
  compactText: string;
  fullText: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  glowColor: string;
  isBoundary: boolean;
  isSix: boolean;
  isFour: boolean;
  isWicket: boolean;
  isExtra: boolean;
  isDot: boolean;
  runs: number;
}

export function getBallEventVisualInfo(
  eventStr: string,
  dismissalStr?: string,
  runsOverride?: number
): BallEventVisualInfo {
  const norm = (eventStr || '4').trim().toUpperCase();
  const dis = (dismissalStr || '').trim().toUpperCase();

  // Wicket
  if (norm === 'W' || norm.includes('WICKET') || norm.includes('OUT') || dis.length > 0) {
    return {
      tag: 'WICKET',
      shortLetter: 'W',
      compactText: 'W',
      fullText: dis ? `WICKET (${dis.replace('_', ' ')})` : 'WICKET!',
      bgColor: '#e11d48',
      textColor: '#ffffff',
      borderColor: '#fda4af',
      glowColor: 'rgba(225, 29, 72, 0.6)',
      isBoundary: false,
      isSix: false,
      isFour: false,
      isWicket: true,
      isExtra: false,
      isDot: false,
      runs: 0,
    };
  }

  // Six
  if (norm === '6' || norm.includes('SIX') || norm.includes('MAXIMUM')) {
    return {
      tag: 'SIX',
      shortLetter: '6',
      compactText: '6',
      fullText: 'MAXIMUM SIX (6)',
      bgColor: '#7c3aed',
      textColor: '#ffffff',
      borderColor: '#c4b5fd',
      glowColor: 'rgba(124, 58, 237, 0.6)',
      isBoundary: true,
      isSix: true,
      isFour: false,
      isWicket: false,
      isExtra: false,
      isDot: false,
      runs: 6,
    };
  }

  // Four
  if (norm === '4' || norm.includes('FOUR') || norm.includes('BOUNDARY')) {
    return {
      tag: 'FOUR',
      shortLetter: '4',
      compactText: '4',
      fullText: 'BOUNDARY FOUR (4)',
      bgColor: '#059669',
      textColor: '#ffffff',
      borderColor: '#6ee7b7',
      glowColor: 'rgba(16, 185, 129, 0.6)',
      isBoundary: true,
      isSix: false,
      isFour: true,
      isWicket: false,
      isExtra: false,
      isDot: false,
      runs: 4,
    };
  }

  // No Ball
  if (norm === 'NB' || norm.includes('NO_BALL') || norm.includes('NO BALL')) {
    const batRuns = runsOverride !== undefined ? runsOverride : 0;
    return {
      tag: 'NO_BALL',
      shortLetter: 'Nb',
      compactText: batRuns > 0 ? `Nb+${batRuns}` : 'Nb',
      fullText: batRuns > 0 ? `NO BALL (+${batRuns + 1})` : 'NO BALL',
      bgColor: '#ea580c',
      textColor: '#ffffff',
      borderColor: '#fdba74',
      glowColor: 'rgba(234, 88, 12, 0.5)',
      isBoundary: false,
      isSix: false,
      isFour: false,
      isWicket: false,
      isExtra: true,
      isDot: false,
      runs: 1 + batRuns,
    };
  }

  // Wide
  if (norm === 'WD' || norm.includes('WIDE')) {
    return {
      tag: 'WIDE',
      shortLetter: 'Wd',
      compactText: 'Wd',
      fullText: 'WIDE BALL (+1)',
      bgColor: '#d97706',
      textColor: '#ffffff',
      borderColor: '#fcd34d',
      glowColor: 'rgba(217, 119, 6, 0.5)',
      isBoundary: false,
      isSix: false,
      isFour: false,
      isWicket: false,
      isExtra: true,
      isDot: false,
      runs: 1,
    };
  }

  // Leg Bye
  if (norm === 'LB' || norm.includes('LEG_BYE') || norm.includes('LEG BYE')) {
    return {
      tag: 'LEG_BYE',
      shortLetter: 'Lb',
      compactText: 'Lb',
      fullText: 'LEG BYE',
      bgColor: '#0284c7',
      textColor: '#ffffff',
      borderColor: '#7dd3fc',
      glowColor: 'rgba(2, 132, 199, 0.5)',
      isBoundary: false,
      isSix: false,
      isFour: false,
      isWicket: false,
      isExtra: true,
      isDot: false,
      runs: 1,
    };
  }

  // Bye
  if (norm === 'B' || norm.includes('BYE')) {
    return {
      tag: 'BYE',
      shortLetter: 'B',
      compactText: 'B',
      fullText: 'BYE',
      bgColor: '#0284c7',
      textColor: '#ffffff',
      borderColor: '#7dd3fc',
      glowColor: 'rgba(2, 132, 199, 0.5)',
      isBoundary: false,
      isSix: false,
      isFour: false,
      isWicket: false,
      isExtra: true,
      isDot: false,
      runs: 1,
    };
  }

  // Penalty
  if (norm === 'P' || norm.includes('PENALTY')) {
    return {
      tag: 'PENALTY',
      shortLetter: 'P',
      compactText: '+5P',
      fullText: 'PENALTY RUNS (+5)',
      bgColor: '#ca8a04',
      textColor: '#0f172a',
      borderColor: '#fef08a',
      glowColor: 'rgba(202, 138, 4, 0.5)',
      isBoundary: false,
      isSix: false,
      isFour: false,
      isWicket: false,
      isExtra: true,
      isDot: false,
      runs: 5,
    };
  }

  // Dot Ball
  if (norm === '0' || norm === 'DOT' || norm === '•' || norm.includes('DOT')) {
    return {
      tag: 'DOT',
      shortLetter: '•',
      compactText: '•',
      fullText: 'DOT BALL (0)',
      bgColor: '#334155',
      textColor: '#cbd5e1',
      borderColor: '#64748b',
      glowColor: 'transparent',
      isBoundary: false,
      isSix: false,
      isFour: false,
      isWicket: false,
      isExtra: false,
      isDot: true,
      runs: 0,
    };
  }

  // Runs 1, 2, 3
  const num = parseInt(norm.replace(/[^0-9]/g, ''), 10);
  if (!isNaN(num) && num > 0) {
    return {
      tag: `RUN_${num}`,
      shortLetter: String(num),
      compactText: String(num),
      fullText: `${num} ${num === 1 ? 'RUN' : 'RUNS'}`,
      bgColor: '#1e293b',
      textColor: '#38bdf8',
      borderColor: '#0284c7',
      glowColor: 'rgba(2, 132, 199, 0.3)',
      isBoundary: false,
      isSix: false,
      isFour: false,
      isWicket: false,
      isExtra: false,
      isDot: false,
      runs: num,
    };
  }

  // Default fallback
  return {
    tag: 'BALL',
    shortLetter: '•',
    compactText: '•',
    fullText: 'BALL',
    bgColor: '#334155',
    textColor: '#ffffff',
    borderColor: '#64748b',
    glowColor: 'transparent',
    isBoundary: false,
    isSix: false,
    isFour: false,
    isWicket: false,
    isExtra: false,
    isDot: true,
    runs: 0,
  };
}

export interface CricketEventAlertVisualInfo {
  tag: string;
  badgeText: string;
  defaultTitle: string;
  defaultSubtitle: string;
  defaultMessage: string;
  primaryColor: string;
  secondaryColor: string;
  accentGlow: string;
  gradientBackground: string;
  badgeBg: string;
  badgeBorder: string;
  badgeTextColor: string;
  iconType: 'WICKET' | 'BOUNDARY' | 'SIX' | 'MILESTONE' | 'OVER' | 'INNINGS' | 'RESULT' | 'ALERT';
}

export function getCricketEventAlertVisualInfo(
  eventType: string,
  themeStyle: string = 'NEON'
): CricketEventAlertVisualInfo {
  const norm = (eventType || 'FOUR').trim().toUpperCase();

  // Wicket Variants
  if (norm.includes('WICKET') || norm.includes('BOWLED') || norm.includes('CAUGHT') || norm.includes('LBW') || norm.includes('RUN_OUT') || norm.includes('STUMPED')) {
    let modeText = 'WICKET!';
    if (norm.includes('BOWLED')) modeText = 'BOWLED CLEAN!';
    else if (norm.includes('CAUGHT_BEHIND')) modeText = 'CAUGHT BEHIND!';
    else if (norm.includes('CAUGHT_BOWLED')) modeText = 'CAUGHT & BOWLED!';
    else if (norm.includes('CAUGHT')) modeText = 'CAUGHT OUT!';
    else if (norm.includes('LBW')) modeText = 'LBW DISMISSAL!';
    else if (norm.includes('RUN_OUT')) modeText = 'RUN OUT!';
    else if (norm.includes('STUMPED')) modeText = 'STUMPED!';

    return {
      tag: 'WICKET',
      badgeText: 'OUT',
      defaultTitle: modeText,
      defaultSubtitle: 'Massive breakthrough for the bowling side',
      defaultMessage: 'Major departure at a pivotal moment in the match',
      primaryColor: '#e11d48',
      secondaryColor: '#f43f5e',
      accentGlow: 'rgba(225, 29, 72, 0.7)',
      gradientBackground: 'linear-gradient(135deg, rgba(225, 29, 72, 0.95) 0%, rgba(136, 19, 55, 0.98) 100%)',
      badgeBg: '#881337',
      badgeBorder: '#fda4af',
      badgeTextColor: '#ffffff',
      iconType: 'WICKET',
    };
  }

  // Six / Maximum
  if (norm === 'SIX' || norm.includes('SIX')) {
    return {
      tag: 'SIX',
      badgeText: '6',
      defaultTitle: 'MAXIMUM SIX!',
      defaultSubtitle: 'Dispatched deep into the stadium stands',
      defaultMessage: 'Colossal blow over the ropes with immense timing',
      primaryColor: '#8b5cf6',
      secondaryColor: '#a855f7',
      accentGlow: 'rgba(139, 92, 246, 0.75)',
      gradientBackground: 'linear-gradient(135deg, rgba(109, 40, 217, 0.95) 0%, rgba(59, 7, 100, 0.98) 100%)',
      badgeBg: '#4c1d95',
      badgeBorder: '#c4b5fd',
      badgeTextColor: '#ffffff',
      iconType: 'SIX',
    };
  }

  // Four / Boundary
  if (norm === 'FOUR' || norm.includes('FOUR')) {
    return {
      tag: 'FOUR',
      badgeText: '4',
      defaultTitle: 'BOUNDARY FOUR!',
      defaultSubtitle: 'Raced away across the lightning-fast turf',
      defaultMessage: 'Crisply driven through the gap to the fence',
      primaryColor: '#10b981',
      secondaryColor: '#059669',
      accentGlow: 'rgba(16, 185, 129, 0.7)',
      gradientBackground: 'linear-gradient(135deg, rgba(4, 120, 87, 0.95) 0%, rgba(6, 78, 59, 0.98) 100%)',
      badgeBg: '#064e3b',
      badgeBorder: '#6ee7b7',
      badgeTextColor: '#ffffff',
      iconType: 'BOUNDARY',
    };
  }

  // Batsman Milestones (50, 100, 150, 200)
  if (norm.includes('50') && norm.includes('BATSMAN')) {
    return {
      tag: 'BATSMAN_50',
      badgeText: '50',
      defaultTitle: 'HALF CENTURY!',
      defaultSubtitle: '50 Runs Milestone Reached',
      defaultMessage: 'Sensational half-century innings under intense pressure',
      primaryColor: '#f59e0b',
      secondaryColor: '#d97706',
      accentGlow: 'rgba(245, 158, 11, 0.75)',
      gradientBackground: 'linear-gradient(135deg, rgba(180, 83, 9, 0.95) 0%, rgba(69, 26, 3, 0.98) 100%)',
      badgeBg: '#78350f',
      badgeBorder: '#fde68a',
      badgeTextColor: '#ffffff',
      iconType: 'MILESTONE',
    };
  }

  if (norm.includes('100') && norm.includes('BATSMAN')) {
    return {
      tag: 'BATSMAN_100',
      badgeText: '100',
      defaultTitle: 'MAGNIFICENT CENTURY!',
      defaultSubtitle: '100 Runs Milestone • Masterclass Innings',
      defaultMessage: 'Standing ovation for a truly world-class hundred',
      primaryColor: '#eab308',
      secondaryColor: '#ca8a04',
      accentGlow: 'rgba(234, 179, 8, 0.85)',
      gradientBackground: 'linear-gradient(135deg, rgba(161, 98, 7, 0.95) 0%, rgba(66, 32, 6, 0.98) 100%)',
      badgeBg: '#713f12',
      badgeBorder: '#fef08a',
      badgeTextColor: '#ffffff',
      iconType: 'MILESTONE',
    };
  }

  // Bowler Milestones (3W, 5W)
  if (norm.includes('BOWLER') || norm.includes('5W') || norm.includes('3W')) {
    const is5W = norm.includes('5W') || norm.includes('5-WICKET');
    return {
      tag: is5W ? 'BOWLER_5W' : 'BOWLER_3W',
      badgeText: is5W ? '5W' : '3W',
      defaultTitle: is5W ? '5-WICKET HAUL!' : '3-WICKET SPELL!',
      defaultSubtitle: 'Sensational bowling figures in today\'s contest',
      defaultMessage: 'Devastating bowling spell tearing through the batting order',
      primaryColor: '#0ea5e9',
      secondaryColor: '#0284c7',
      accentGlow: 'rgba(14, 165, 233, 0.75)',
      gradientBackground: 'linear-gradient(135deg, rgba(3, 105, 161, 0.95) 0%, rgba(12, 74, 110, 0.98) 100%)',
      badgeBg: '#082f49',
      badgeBorder: '#7dd3fc',
      badgeTextColor: '#ffffff',
      iconType: 'MILESTONE',
    };
  }

  // Partnership Milestones (50, 100)
  if (norm.includes('PARTNERSHIP')) {
    const is100 = norm.includes('100');
    return {
      tag: is100 ? 'PARTNERSHIP_100' : 'PARTNERSHIP_50',
      badgeText: is100 ? '100' : '50',
      defaultTitle: is100 ? '100 RUN PARTNERSHIP!' : '50 RUN PARTNERSHIP!',
      defaultSubtitle: 'Crucial batting stand steering the match',
      defaultMessage: 'Solid partnership building match-winning momentum',
      primaryColor: '#06b6d4',
      secondaryColor: '#0891b2',
      accentGlow: 'rgba(6, 182, 212, 0.75)',
      gradientBackground: 'linear-gradient(135deg, rgba(14, 116, 144, 0.95) 0%, rgba(22, 78, 99, 0.98) 100%)',
      badgeBg: '#164e63',
      badgeBorder: '#67e8f9',
      badgeTextColor: '#ffffff',
      iconType: 'MILESTONE',
    };
  }

  // Over Complete / Maiden
  if (norm.includes('OVER')) {
    const isMaiden = norm.includes('MAIDEN');
    return {
      tag: isMaiden ? 'MAIDEN_OVER' : 'OVER_COMPLETE',
      badgeText: isMaiden ? 'M' : 'OV',
      defaultTitle: isMaiden ? 'MAIDEN OVER!' : 'OVER COMPLETED',
      defaultSubtitle: 'Tight bowling discipline without conceding runs',
      defaultMessage: 'Clean spell of deliveries keeping the pressure intact',
      primaryColor: '#6366f1',
      secondaryColor: '#4f46e5',
      accentGlow: 'rgba(99, 102, 241, 0.7)',
      gradientBackground: 'linear-gradient(135deg, rgba(67, 56, 202, 0.95) 0%, rgba(30, 27, 75, 0.98) 100%)',
      badgeBg: '#312e81',
      badgeBorder: '#a5b4fc',
      badgeTextColor: '#ffffff',
      iconType: 'OVER',
    };
  }

  // Innings Break
  if (norm.includes('INNINGS')) {
    return {
      tag: 'INNINGS_BREAK',
      badgeText: 'BREAK',
      defaultTitle: 'INNINGS BREAK',
      defaultSubtitle: 'Target Set • Chase Starting Shortly',
      defaultMessage: 'First innings concluded with thrilling batting and bowling display',
      primaryColor: '#ec4899',
      secondaryColor: '#db2777',
      accentGlow: 'rgba(236, 72, 153, 0.75)',
      gradientBackground: 'linear-gradient(135deg, rgba(190, 24, 93, 0.95) 0%, rgba(80, 7, 36, 0.98) 100%)',
      badgeBg: '#831843',
      badgeBorder: '#f472b6',
      badgeTextColor: '#ffffff',
      iconType: 'INNINGS',
    };
  }

  // Match Result / Victory
  if (norm.includes('RESULT') || norm.includes('WIN') || norm.includes('MATCH_WON')) {
    return {
      tag: 'MATCH_RESULT',
      badgeText: 'VICTORY',
      defaultTitle: 'MATCH CONCLUDED • VICTORY!',
      defaultSubtitle: 'Spectacular championship performance',
      defaultMessage: 'Thrilling encounter sealed with commanding finish',
      primaryColor: '#eab308',
      secondaryColor: '#ca8a04',
      accentGlow: 'rgba(234, 179, 8, 0.85)',
      gradientBackground: 'linear-gradient(135deg, rgba(161, 98, 7, 0.95) 0%, rgba(66, 32, 6, 0.98) 100%)',
      badgeBg: '#713f12',
      badgeBorder: '#fde047',
      badgeTextColor: '#ffffff',
      iconType: 'RESULT',
    };
  }

  // Fallback Alert
  return {
    tag: 'EVENT',
    badgeText: 'LIVE',
    defaultTitle: 'LIVE MATCH EVENT',
    defaultSubtitle: 'Action from the pitch',
    defaultMessage: 'Key play recorded in the scoring system',
    primaryColor: '#38bdf8',
    secondaryColor: '#0284c7',
    accentGlow: 'rgba(56, 189, 248, 0.7)',
    gradientBackground: 'linear-gradient(135deg, rgba(3, 105, 161, 0.95) 0%, rgba(12, 74, 110, 0.98) 100%)',
    badgeBg: '#082f49',
    badgeBorder: '#7dd3fc',
    badgeTextColor: '#ffffff',
    iconType: 'ALERT',
  };
}

