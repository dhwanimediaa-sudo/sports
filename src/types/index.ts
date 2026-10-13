/**
 * SportsPulse - Core Type Definitions
 */

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'SCORER' | 'BROADCASTER' | 'USER';

export type Permission =
  | 'TOURNAMENTS_MANAGE'
  | 'TEAMS_MANAGE'
  | 'PLAYERS_MANAGE'
  | 'MATCHES_MANAGE'
  | 'SCORING_WRITE'
  | 'REPORTS_VIEW'
  | 'GRAPHICS_MANAGE'
  | 'BROADCAST_MANAGE'
  | 'USERS_MANAGE'
  | 'SYSTEM_SETTINGS';

export type UserStatus = 'ACTIVE' | 'DISABLED' | 'INACTIVE' | 'SUSPENDED';

export interface User {
  id: string;
  name: string;
  email: string; // Used as username/email for login
  username?: string;
  displayName?: string;
  mobile?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  mustChangePassword?: boolean;
  allowedSports?: SportType[];
}

export type SportType =
  | 'CRICKET'
  | 'VOLLEYBALL'
  | 'KABADDI'
  | 'HOCKEY'
  | 'FOOTBALL'
  | 'BASKETBALL'
  | 'TENNIS'
  | 'BADMINTON'
  | 'TABLE_TENNIS'
  | 'PICKLEBALL'
  | 'HANDBALL'
  | 'SQUASH'
  | 'CUSTOM'
  | 'OTHER';

export interface SportInfo {
  id: SportType;
  name: string;
  iconName: string;
  description: string;
  defaultPlayersPerTeam: number;
}

// System Audit Log
export interface AuditLog {
  id: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  action:
    | 'LOGIN'
    | 'LOGOUT'
    | 'PROFILE_UPDATE'
    | 'PASSWORD_CHANGE'
    | 'SYSTEM_INIT'
    | 'SECURITY_ALERT'
    | 'TOURNAMENT_CREATE'
    | 'TOURNAMENT_UPDATE'
    | 'TOURNAMENT_DELETE'
    | 'GROUP_CREATE'
    | 'GROUP_UPDATE'
    | 'GROUP_DELETE'
    | 'TEAM_CREATE'
    | 'TEAM_UPDATE'
    | 'TEAM_DELETE'
    | 'PLAYER_CREATE'
    | 'PLAYER_UPDATE'
    | 'PLAYER_DELETE'
    | 'MATCH_CREATE'
    | 'MATCH_UPDATE'
    | 'MATCH_DELETE'
    | 'MATCH_DUPLICATE'
    | 'MATCH_STATUS_CHANGE'
    | 'MATCH_SQUAD_UPDATE'
    | 'MATCH_SCORE_START'
    | 'MATCH_SCORE_UNDO'
    | 'MATCH_BALL_RECORD'
    | 'REPORT_VIEWED'
    | 'MAN_OF_MATCH_SELECTED'
    | 'REPORT_FINALIZED'
    | 'REPORT_REOPENED'
    | 'VOLLEYBALL_MATCH_START'
    | 'VOLLEYBALL_SCORE_CORRECTED'
    | 'VOLLEYBALL_UNDO_POINT'
    | 'MATCH_COMPLETED'
    | string;
  details: string;
  ipAddress?: string;
  timestamp: string;
}

// System Status metrics
export interface SystemStatus {
  database: {
    connected: boolean;
    provider: string;
    path: string;
    recordCount: number;
    dbSizeBytes: number;
  };
  authentication: {
    activeSessions: number;
    jwtAlgorithm: string;
    passwordHashing: string;
    rateLimitingEnabled: boolean;
  };
  application: {
    name: string;
    version: string;
    uptimeSeconds: number;
    nodeVersion: string;
    port: number;
    environment: string;
    appUrl: string;
  };
  counts: {
    tournaments: number;
    groups: number;
    teams: number;
    players: number;
    matches: number;
    scheduledMatches: number;
    readyMatches: number;
    liveMatches: number;
    completedMatches: number;
    draftMatches: number;
    users: number;
  };
}

export type TournamentStatus = 'DRAFT' | 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'CANCELLED';

export type CompetitionFormat =
  | 'GROUP_STAGE_KNOCKOUT'
  | 'SINGLE_LEAGUE'
  | 'MULTI_GROUP_LEAGUE'
  | 'PAGE_PLAYOFF'
  | 'SINGLE_ROUND_ROBIN'
  | 'DOUBLE_ROUND_ROBIN'
  | 'SINGLE_ELIMINATION'
  | 'DOUBLE_ELIMINATION'
  | 'GROUP_KNOCKOUT'
  | 'MULTIPLE_GROUPS'
  | 'LEAGUE_PLAYOFF'
  | 'ROUND_ROBIN'
  | 'KNOCKOUT'
  | 'CUSTOM';

export type TieBreakerRule =
  | 'POINTS'
  | 'WINS'
  | 'WINS_COUNT'
  | 'NRR'
  | 'NET_RUN_RATE'
  | 'GOAL_DIFFERENCE'
  | 'GOALS_FOR'
  | 'GOALS_AGAINST'
  | 'GOALS_SCORED'
  | 'SET_DIFFERENCE'
  | 'SET_RATIO'
  | 'SETS_WON'
  | 'GAMES_DIFFERENCE'
  | 'GAMES_WON'
  | 'POINT_DIFFERENCE'
  | 'POINT_RATIO'
  | 'POINTS_FOR'
  | 'SCORE_DIFFERENCE'
  | 'RAID_POINTS'
  | 'TACKLE_POINTS'
  | 'BONUS_POINTS'
  | 'HEAD_TO_HEAD'
  | 'HEAD_TO_HEAD_POINTS'
  | 'HEAD_TO_HEAD_DIFFERENCE'
  | 'ALPHABETICAL'
  | 'MANUAL_DECISION';


export interface TournamentCompetitionConfig {
  id?: string;
  tournamentId: string;
  format: CompetitionFormat;
  numberOfGroups: number;
  teamsPerGroup: number;
  qualificationSlotsPerGroup: number;
  directQualificationSlots: number;
  pointsForWin: number;
  pointsForDraw: number;
  pointsForTie: number;
  pointsForLoss: number;
  pointsForNoResult: number;
  pointsForAbandoned: number;
  manualPointsOverrideEnabled: boolean;
  qualificationTrackingEnabled: boolean;
  tieBreakerOrder: TieBreakerRule[];
  customSportMetrics?: {
    primaryMetricName: string;
    forMetricName?: string;
    againstMetricName?: string;
    differenceMetricName?: string;
    secondaryMetricName?: string;
  };
  updatedAt?: string;
}

export type StandingsQualificationStatus =
  | 'QUALIFIED'
  | 'ELIMINATED'
  | 'CONTENTION'
  | 'MANUAL_QUALIFIED'
  | 'MANUAL_ELIMINATED'
  | 'PENDING';

export interface StandingsManualAdjustment {
  pointsAdjustment?: number;
  qualificationStatusOverride?: 'AUTO' | 'QUALIFIED' | 'ELIMINATED' | 'CONTENTION';
  rankOverride?: number;
  reason?: string;
  updatedBy?: string;
  updatedByEmail?: string;
  updatedAt?: string;
  previousValue?: any;
  newValue?: any;
}

export interface StandingsOverrideAuditLog {
  id: string;
  tournamentId: string;
  groupId?: string;
  teamId: string;
  teamName?: string;
  field: 'POINTS' | 'QUALIFICATION_STATUS' | 'RANK' | 'RESET';
  previousValue: any;
  newValue: any;
  reason: string;
  userId?: string;
  userName: string;
  userEmail?: string;
  timestamp: string;
}

export interface FixtureGenerationOptions {
  tournamentId: string;
  groupId?: string;
  type?: 'SINGLE_ROUND_ROBIN' | 'DOUBLE_ROUND_ROBIN';
  rounds?: number;
  homeAwayPreference?: 'BALANCED' | 'TEAM_A_HOME' | 'NEUTRAL';
  startDate: string;
  startTime?: string;
  matchIntervalMinutes?: number;
  matchDurationMinutes?: number;
  breakMinutes?: number;
  matchesPerDay?: number;
  daysBetweenRounds?: number;
  venues?: string[];
  grounds?: string[];
  venueAllocationStrategy?: 'ROUND_ROBIN_ROTATION' | 'CONCURRENT_VENUES' | 'SINGLE_VENUE' | 'MANUAL';
  minRestHours?: number;
  enforceStrictRest?: boolean;
  clearExistingDraftFixtures?: boolean;
  customMatchConfig?: Record<string, any>;
}

export interface FixtureConflictWarning {
  type: 'VENUE_OVERLAP' | 'TEAM_FATIGUE' | 'TEAM_SIMULTANEOUS' | 'DATE_OUT_OF_RANGE';
  severity: 'ERROR' | 'WARNING';
  message: string;
  details?: string;
  affectedMatchNumbers?: string[];
}

export interface FixturePreviewItem {
  tempId: string;
  matchNumber: string;
  numericIndex: number;
  roundNumber: number;
  roundName: string;
  legNumber: number;
  groupId?: string;
  groupName?: string;
  groupCode?: string;
  homeTeamId: string;
  homeTeamName: string;
  homeTeamShortName?: string;
  homeTeamLogoUrl?: string;
  awayTeamId: string;
  awayTeamName: string;
  awayTeamShortName?: string;
  awayTeamLogoUrl?: string;
  date: string;
  time: string;
  venue: string;
  ground?: string;
  isBye?: boolean;
  byeTeamId?: string;
  byeTeamName?: string;
  estimatedDurationMinutes?: number;
  conflicts?: FixtureConflictWarning[];
}

export interface FixturePreviewResponse {
  fixtures: FixturePreviewItem[];
  byes: Array<{
    roundNumber: number;
    roundName: string;
    teamId: string;
    teamName: string;
    groupId?: string;
    groupName?: string;
  }>;
  conflicts: FixtureConflictWarning[];
  summary: {
    totalMatches: number;
    totalRounds: number;
    totalDays: number;
    totalVenues: number;
    startDate: string;
    estimatedEndDate: string;
    teamsCount: number;
    groupsCount: number;
    existingMatchesStats: {
      total: number;
      draft: number;
      scheduled: number;
      live: number;
      completed: number;
      cancelled: number;
    };
  };
}

export interface SportSpecificStandingsMetrics {
  // Cricket
  nrr?: number;
  nrrDisplay?: string;
  runsScored?: number;
  oversFaced?: number;
  oversFacedBalls?: number;
  runsConceded?: number;
  oversBowled?: number;
  oversBowledBalls?: number;
  // Football / Hockey
  goalsFor?: number;
  goalsAgainst?: number;
  goalDifference?: number;
  // Volleyball / Tennis / Badminton / Table Tennis
  setsWon?: number;
  setsLost?: number;
  setDifference?: number;
  setRatio?: number;
  gamesWon?: number;
  gamesLost?: number;
  gameDifference?: number;
  pointsWon?: number;
  pointsLost?: number;
  pointDifference?: number;
  pointRatio?: number;
  // Kabaddi
  scoreFor?: number;
  scoreAgainst?: number;
  scoreDifference?: number;
  raidPoints?: number;
  tacklePoints?: number;
  // Basketball
  pointsFor?: number;
  pointsAgainst?: number;
  // Generic / Custom
  forMetric?: number;
  againstMetric?: number;
  differenceMetric?: number;
  differenceDisplay?: string;
  customMetricLabel?: string;
  customMetricValue?: number | string;
}

export interface TournamentFormatConfig {
  format?: CompetitionFormat;
  numberOfGroups?: number;
  teamsPerGroupMin?: number;
  teamsPerGroupMax?: number;
  groupStageRounds?: 'SINGLE' | 'DOUBLE' | 'CUSTOM';
  legsPerMatch?: number;
  teamsAdvancingPerGroup?: number;
  knockoutStageFormat?: 'ROUND_OF_32' | 'ROUND_OF_16' | 'QUARTER_FINALS' | 'SEMI_FINALS' | 'FINAL';
  hasThirdPlaceMatch?: boolean;
  teamDistributionMethod?: 'MANUAL' | 'SNAKE' | 'RANDOM' | 'BALANCED';
  defaultMatchConfig?: Record<string, any>;
}

export interface TournamentRankingRules {
  pointsForWin: number;
  pointsForDraw: number;
  pointsForLoss: number;
  pointsForTie: number;
  pointsForNoResult: number;
  pointsForAbandoned?: number;
  bonusPointsEnabled?: boolean;
  primaryTieBreaker:
    | 'POINTS'
    | 'NRR'
    | 'GOAL_DIFFERENCE'
    | 'GOALS_FOR'
    | 'SET_RATIO'
    | 'POINT_RATIO'
    | 'POINT_DIFFERENCE'
    | 'HEAD_TO_HEAD'
    | 'WINS'
    | string;
  secondaryTieBreaker?: string;
  tertiaryTieBreaker?: string;
  tieBreakerOrder?: TieBreakerRule[];
}

export interface TournamentQualificationRule {
  groupId: string;
  qualifyTopCount: number; // e.g. top 2
  targetStage: string; // e.g. 'QUARTER_FINALS'
  manualOverrides?: Record<string, 'QUALIFIED' | 'ELIMINATED' | 'AUTO'>; // teamId -> override
}

export interface TournamentStandingRow {
  id?: string;
  position?: number;
  rank: number;
  tournamentId?: string;
  groupId?: string;
  groupName?: string;
  groupCode?: string;
  teamId: string;
  teamName: string;
  teamShortName?: string;
  teamCode?: string;
  teamLogoUrl?: string;
  played: number;
  won: number;
  drawn: number;
  tied?: number;
  lost: number;
  noResult?: number;
  abandoned?: number;
  points: number;
  rawCalculatedPoints?: number;
  forMetric: number;
  againstMetric: number;
  differenceMetric: number;
  differenceDisplay: string;
  form: ('W' | 'L' | 'D' | 'T' | 'NR' | 'A')[];
  qualified?: boolean;
  eliminated?: boolean;
  qualificationStatus: StandingsQualificationStatus | 'QUALIFIED' | 'ELIMINATED' | 'PENDING' | 'MANUAL_QUALIFIED';
  qualificationNote?: string;
  isManualOverride?: boolean;
  manualAdjustment?: StandingsManualAdjustment;
  sportSpecificMetrics?: SportSpecificStandingsMetrics;
  sportStats?: Record<string, any>;
  teamLogo?: string;
  netRunRate?: number;
  runsScored?: number;
  oversFaced?: number;
  runsConceded?: number;
  oversBowled?: number;
  goalsFor?: number;
  goalsAgainst?: number;
  goalDifference?: number;
  setsWon?: number;
  setsLost?: number;
  setRatio?: number;
  pointsRatio?: number;
  scoreDifference?: number;
  bonusPoints?: number;
  pointsScored?: number;
  pointsConceded?: number;
  winPercentage?: number;
  gamesWon?: number;
  gamesLost?: number;
  updatedAt?: string;
}

export interface TournamentGroupStandings {
  groupId: string;
  groupName: string;
  groupCode?: string;
  teamsCount: number;
  matchesPlayedCount: number;
  totalMatchesCount: number;
  isCompleted: boolean;
  qualificationSlots?: number;
  rows: TournamentStandingRow[];
}

export interface KnockoutMatchNode {
  id: string;
  matchId?: string;
  stage: 'ROUND_OF_32' | 'ROUND_OF_16' | 'QUARTER_FINAL' | 'SEMI_FINAL' | 'FINAL' | 'THIRD_PLACE' | 'CUSTOM';
  roundNumber: number;
  matchNumber: number;
  title: string;
  homeTeamPlaceholder: string;
  awayTeamPlaceholder: string;
  homeTeamId?: string;
  awayTeamId?: string;
  homeTeamName?: string;
  awayTeamName?: string;
  homeTeamLogoUrl?: string;
  awayTeamLogoUrl?: string;
  homeSeed?: number;
  awaySeed?: number;
  homeTeamScore?: string | number;
  awayTeamScore?: string | number;
  homeScoresSummary?: string;
  awayScoresSummary?: string;
  isBye?: boolean;
  byeTeamId?: string;
  byeTeamName?: string;
  winnerTeamId?: string;
  winnerTeamName?: string;
  loserTeamId?: string;
  loserTeamName?: string;
  nextMatchNodeId?: string;
  nextMatchSlot?: 'HOME' | 'AWAY';
  loserNextMatchNodeId?: string;
  loserNextMatchSlot?: 'HOME' | 'AWAY';
  status: MatchStatus;
  isTie?: boolean;
  tieRequiresAdminAction?: boolean;
  tieReason?: string;
  isChampionshipMatch?: boolean;
  isThirdPlaceMatch?: boolean;
  matchDate?: string;
  matchTime?: string;
  venue?: string;
  ground?: string;
}

export interface KnockoutBracketRound {
  roundKey: string;
  title: string;
  stage: 'ROUND_OF_32' | 'ROUND_OF_16' | 'QUARTER_FINAL' | 'SEMI_FINAL' | 'FINAL' | 'THIRD_PLACE' | 'CUSTOM';
  matches: KnockoutMatchNode[];
}

export interface KnockoutSeedItem {
  seed: number;
  teamId: string;
  teamName: string;
  teamLogoUrl?: string;
  groupId?: string;
  groupName?: string;
  groupRank?: number;
  points?: number;
  differenceDisplay?: string;
  isBye?: boolean;
}

export interface KnockoutAuditLogItem {
  id: string;
  tournamentId: string;
  action:
    | 'BRACKET_GENERATED'
    | 'TEAMS_SEEDED'
    | 'BYE_ASSIGNED'
    | 'TEAM_ADVANCED'
    | 'MATCH_RESULT_SYNCED'
    | 'WINNER_OVERRIDDEN'
    | 'TIE_RESOLVED'
    | 'BRACKET_REGENERATED'
    | 'FINAL_COMPLETED'
    | 'CHAMPION_DECLARED'
    | 'TOURNAMENT_REOPENED';
  details: string;
  timestamp: string;
  userId?: string;
  userName?: string;
  nodeId?: string;
  matchId?: string;
  previousState?: any;
  newState?: any;
}

export interface KnockoutBracket {
  id: string;
  tournamentId: string;
  name: string;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED';
  format?: 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'BEST_OF_SERIES';
  startingStage: 'ROUND_OF_32' | 'ROUND_OF_16' | 'QUARTER_FINAL' | 'SEMI_FINAL' | 'FINAL';
  hasThirdPlaceMatch: boolean;
  seedingMethod: 'GROUP_CROSSOVER' | 'OVERALL_RANK' | 'MANUAL' | 'RANDOM';
  crossGroupRestrictions?: boolean;
  sameGroupProtection?: boolean;
  rounds: KnockoutBracketRound[];
  seeds?: KnockoutSeedItem[];
  byes?: Array<{
    teamId: string;
    teamName: string;
    seed: number;
    targetNodeId: string;
  }>;
  championTeamId?: string;
  championTeamName?: string;
  championTeamLogoUrl?: string;
  runnerUpTeamId?: string;
  runnerUpTeamName?: string;
  runnerUpTeamLogoUrl?: string;
  thirdPlaceTeamId?: string;
  thirdPlaceTeamName?: string;
  thirdPlaceTeamLogoUrl?: string;
  fourthPlaceTeamId?: string;
  fourthPlaceTeamName?: string;
  fourthPlaceTeamLogoUrl?: string;
  auditLogs?: KnockoutAuditLogItem[];
  updatedAt: string;
}

export interface KnockoutGenerationOptions {
  tournamentId: string;
  stage: 'ROUND_OF_32' | 'ROUND_OF_16' | 'QUARTER_FINALS' | 'SEMI_FINALS' | 'FINAL' | 'ROUND_OF_64';
  hasThirdPlaceMatch?: boolean;
  createMatchEntities?: boolean;
  seedingMethod?: 'GROUP_CROSSOVER' | 'OVERALL_RANK' | 'MANUAL' | 'RANDOM';
  crossGroupRestrictions?: boolean;
  sameGroupProtection?: boolean;
  startDate?: string;
  matchStartTime?: string;
  matchIntervalMinutes?: number;
  daysBetweenRounds?: number;
  venue?: string;
  ground?: string;
  customRoundNames?: Record<string, string>;
  manualSeeds?: Array<{ seed: number; teamId: string }>;
  preservePlayedMatches?: boolean;
}

export interface ChampionshipSummary {
  tournamentId: string;
  tournamentName: string;
  sport: SportType;
  status: TournamentStatus;
  isCompleted: boolean;
  champion?: {
    teamId: string;
    teamName: string;
    teamLogoUrl?: string;
    finalScore?: string | number;
  };
  runnerUp?: {
    teamId: string;
    teamName: string;
    teamLogoUrl?: string;
    finalScore?: string | number;
  };
  thirdPlace?: {
    teamId: string;
    teamName: string;
    teamLogoUrl?: string;
  };
  fourthPlace?: {
    teamId: string;
    teamName: string;
    teamLogoUrl?: string;
  };
  finalMatch?: {
    matchId?: string;
    title: string;
    date?: string;
    venue?: string;
    scoreSummary: string;
    winnerName?: string;
  };
  thirdPlaceMatch?: {
    matchId?: string;
    title: string;
    scoreSummary: string;
    winnerName?: string;
  };
  completedAt?: string;
}

export interface TournamentLeaderStat {
  id: string;
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  teamShortName?: string;
  teamLogoUrl?: string;
  photoUrl?: string;
  playerPhotoUrl?: string;
  jerseyNumber?: number | string;
  statLabel: string;
  statValue: number | string;
  secondaryStat?: string;
  rank: number;
}

export interface TournamentStatisticsSummary {
  totalMatches: number;
  completedMatches: number;
  liveMatches: number;
  upcomingMatches: number;
  remainingMatches?: number;
  totalTeams: number;
  totalPlayers: number;
  totalGoalsOrRuns: number;
  totalPointsOrRuns?: number;
  averageScorePerMatch: number | string;
  topPerformers: Record<string, TournamentLeaderStat[]>;
  teamStats: Array<{
    teamId: string;
    teamName: string;
    teamLogoUrl?: string;
    matches: number;
    wins: number;
    scoreFor: number;
    scoreAgainst: number;
    winRate: string;
  }>;
}

export interface TournamentTeamFormItem {
  teamId: string;
  teamName: string;
  teamShortName?: string;
  teamLogoUrl?: string;
  groupId?: string;
  groupName?: string;
  rank: number;
  played: number;
  won: number;
  lost: number;
  drawn: number;
  tied: number;
  noResult: number;
  points: number;
  winPercentage: string;
  qualificationStatus: StandingsQualificationStatus | 'QUALIFIED' | 'ELIMINATED' | 'PENDING' | 'CONTENTION' | 'MANUAL_QUALIFIED';
  form: ('W' | 'L' | 'D' | 'T' | 'NR' | 'A')[];
  sportSpecificMetrics: {
    runsFor?: number;
    runsAgainst?: number;
    wicketsFor?: number;
    wicketsAgainst?: number;
    nrr?: string | number;
    goalsFor?: number;
    goalsAgainst?: number;
    goalDifference?: number;
    setsWon?: number;
    setsLost?: number;
    setRatio?: string | number;
    pointsRatio?: string | number;
    raidPoints?: number;
    tacklePoints?: number;
    scoreDifference?: number;
    pointsFor?: number;
    pointsAgainst?: number;
    pointDifference?: number;
    gamesWon?: number;
    gamesLost?: number;
    pointsWon?: number;
    pointsLost?: number;
    customMetrics?: Record<string, any>;
  };
}

export interface TournamentPlayerProfileData {
  player: Player;
  team?: Team;
  tournamentId: string;
  tournamentName?: string;
  sport: SportType;
  tournamentRank?: number;
  performanceIndex: number;
  performanceIndexFormula: string;
  matchesPlayed: number;
  starts: number;
  appearances: number;
  stats: Record<string, any>;
  bestPerformance: string;
  averagePerformance: string;
  matchPerformances: Array<{
    matchId: string;
    matchNumber?: string | number;
    round?: string;
    date?: string;
    opponentTeamId: string;
    opponentTeamName: string;
    opponentTeamLogoUrl?: string;
    isWinner?: boolean;
    statsSummary: string;
    details?: Record<string, any>;
  }>;
  awards: Array<{
    title: string;
    icon?: string;
    citation?: string;
  }>;
}

export interface TournamentTeamProfileData {
  team: Team;
  tournamentId: string;
  tournamentName?: string;
  sport: SportType;
  groupId?: string;
  groupName?: string;
  rank: number;
  qualificationStatus: string;
  form: ('W' | 'L' | 'D' | 'T' | 'NR' | 'A')[];
  played: number;
  won: number;
  lost: number;
  drawn: number;
  tied: number;
  points: number;
  winPercentage: string;
  sportSpecificMetrics: Record<string, any>;
  recentMatches: Array<{
    matchId: string;
    matchNumber?: string | number;
    round?: string;
    date?: string;
    opponentTeamName: string;
    opponentTeamLogoUrl?: string;
    scoreA: string | number;
    scoreB: string | number;
    isWin: boolean;
    isDraw?: boolean;
    isLoss?: boolean;
    resultSummary: string;
  }>;
  upcomingMatches: Array<{
    matchId: string;
    matchNumber?: string | number;
    round?: string;
    date?: string;
    time?: string;
    venue?: string;
    opponentTeamName: string;
    opponentTeamLogoUrl?: string;
  }>;
  playerLeaders: TournamentLeaderStat[];
  roster: Player[];
}

export interface TournamentRecordItem {
  id: string;
  categoryKey: string;
  title: string;
  sport: SportType;
  recordValue: string | number;
  holderName: string;
  holderTeamName?: string;
  holderPhotoUrl?: string;
  matchTitle?: string;
  date?: string;
  details?: string;
  icon?: string;
}

export interface TournamentPerformanceIndexItem {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  teamLogoUrl?: string;
  photoUrl?: string;
  jerseyNumber?: number | string;
  role?: string;
  score: number;
  rank: number;
  formulaExplanation: string;
  breakdown: Record<string, number | string>;
}

export interface TournamentDashboardData {
  tournament: Tournament;
  stats: {
    totalTeams: number;
    totalGroups: number;
    totalPlayers: number;
    matchesScheduled: number;
    matchesCompleted: number;
    matchesLive: number;
    upcomingMatches: number;
    remainingMatches: number;
    currentPhase: string;
    currentRound: string;
  };
  leaderTeam?: {
    teamId: string;
    teamName: string;
    teamLogoUrl?: string;
    points: number;
    position: number;
    groupName?: string;
  };
  qualifiedTeams: Array<{ teamId: string; teamName: string; teamLogoUrl?: string; groupName?: string }>;
  eliminatedTeams: Array<{ teamId: string; teamName: string; teamLogoUrl?: string; groupName?: string }>;
  championStatus?: ChampionshipSummary;
  liveMatches: Array<Match & { liveScoreText?: string; liveDetailText?: string }>;
  nextMatch?: Match;
  recentResults: Array<Match & { resultSummary?: string; winningTeamName?: string }>;
  teamForm: TournamentTeamFormItem[];
  playerLeaderboards: Record<string, { categoryTitle: string; statLabel: string; leaders: TournamentLeaderStat[] }>;
  performanceIndexLeaders: TournamentPerformanceIndexItem[];
  records: TournamentRecordItem[];
  awards: TournamentAwardItem[];
  standings: {
    groups: TournamentGroupStandings[];
    overall: TournamentStandingRow[];
  };
  bracket?: KnockoutBracket;
}

export interface TournamentAwardCandidate {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  teamLogoUrl?: string;
  photo?: string;
  score: number;
  rank: number;
  statisticalBreakdown: Record<string, number | string>;
  recommendationReason: string;
  confidenceScore: number;
  formulaDetails?: {
    formulaName: string;
    components: Array<{
      label: string;
      value: number | string;
      weight?: number;
      points: number;
      description: string;
    }>;
  };
}

export interface TournamentAwardItem {
  id: string;
  tournamentId: string;
  awardKey?: string;
  awardTitle?: string;
  title?: string;
  subtitle?: string;
  awardIcon?: string;
  icon?: string;
  winnerName?: string;
  teamName?: string;
  description?: string;
  category: string;
  recommendedPlayerId?: string;
  recommendedPlayerName?: string;
  recommendedTeamId?: string;
  recommendedTeamName?: string;
  recommendedPlayerPhoto?: string;
  recommendedStatSummary?: string;
  recommendationReason?: string;
  confidenceScore?: number;
  score?: number;
  statisticalBreakdown?: Record<string, any>;
  formulaBreakdown?: {
    formulaName: string;
    rawScore: number;
    components: Array<{
      label: string;
      value: number | string;
      points: number;
      note: string;
    }>;
  };
  candidates?: TournamentAwardCandidate[];
  selectedPlayerId?: string;
  selectedPlayerName?: string;
  selectedTeamId?: string;
  selectedTeamName?: string;
  recipientPlayerId?: string;
  recipientName?: string;
  recipientTeamId?: string;
  recipientTeamName?: string;
  recipientPhoto?: string;
  isOverridden?: boolean;
  overrideReason?: string;
  overrideBy?: string;
  overrideAt?: string;
  sponsor?: string;
  sponsorLogoUrl?: string;
  sponsorTagline?: string;
  cashPrize?: string;
  citation?: string;
  isFinalized?: boolean;
  finalizedAt?: string;
  finalizedBy?: string;
  updatedAt?: string;
  customAwardTitle?: string;
}

export interface TournamentAwardOverride {
  id: string;
  tournamentId: string;
  awardId: string;
  awardKey: string;
  previousPlayerId?: string;
  previousPlayerName?: string;
  newPlayerId: string;
  newPlayerName: string;
  newTeamId?: string;
  newTeamName?: string;
  reason: string;
  citation?: string;
  adminId?: string;
  adminName?: string;
  timestamp: string;
}

export interface TournamentAwardAuditLog {
  id: string;
  tournamentId: string;
  awardId?: string;
  awardKey?: string;
  awardTitle?: string;
  action: 'RECOMMENDED' | 'OVERRIDDEN' | 'RESTORED' | 'CITATION_UPDATED' | 'FINALIZED' | 'REOPENED' | 'PRESENTED';
  previousRecipient?: string;
  newRecipient?: string;
  administrator: string;
  adminId?: string;
  reason?: string;
  timestamp: string;
  metadata?: any;
}

export interface TournamentRecordDetail {
  id: string;
  categoryKey: string;
  title: string;
  subtitle?: string;
  sport: SportType;
  recordValue: string | number;
  recordNumericValue?: number;
  holderId?: string;
  holderName: string;
  holderTeamId?: string;
  holderTeamName?: string;
  holderPhotoUrl?: string;
  holderTeamLogoUrl?: string;
  matchId?: string;
  matchTitle?: string;
  opponentTeamId?: string;
  opponentTeamName?: string;
  opponentTeamLogoUrl?: string;
  date?: string;
  venue?: string;
  round?: string;
  supportingStats?: Record<string, string | number>;
  icon?: string;
  isTournamentRecord?: boolean;
  category?: string;
  teamName?: string;
  matchContext?: string;
  value?: any;
  unit?: string;
}

export interface TournamentHallOfFameData {
  tournament: Tournament;
  dreamTeam?: any;
  champion?: {
    teamId: string;
    teamName: string;
    teamLogoUrl?: string;
    scoreSummary?: string;
    captainName?: string;
  };
  runnerUp?: {
    teamId: string;
    teamName: string;
    teamLogoUrl?: string;
    scoreSummary?: string;
  };
  thirdPlace?: {
    teamId: string;
    teamName: string;
    teamLogoUrl?: string;
    scoreSummary?: string;
  };
  fourthPlace?: {
    teamId: string;
    teamName: string;
    teamLogoUrl?: string;
    scoreSummary?: string;
  };
  mvp?: {
    playerId: string;
    playerName: string;
    teamId?: string;
    teamName: string;
    photoUrl?: string;
    piScore: number;
    statSummary: string;
  };
  awardWinners: TournamentAwardItem[];
  recordHolders: TournamentRecordDetail[];
  bestPerformers: TournamentPerformanceIndexItem[];
  finalizedAt?: string;
  isFinalized: boolean;
}

export interface TournamentPresentationEvent {
  id: string;
  tournamentId: string;
  type: 'CHAMPION' | 'RUNNER_UP' | 'THIRD_PLACE' | 'MVP' | 'AWARD' | 'RECORD' | 'HALL_OF_FAME' | 'CEREMONY' | 'CLEAR' | 'CONNECTED';
  title?: string;
  data: any;
  cardConfig?: {
    template?: string;
    font?: string;
    fontSize?: string;
    fontColor?: string;
    background?: string;
    gradient?: string;
    border?: string;
    animation?: 'FADE' | 'SLIDE' | 'ZOOM' | 'POP' | 'GLOW' | 'CHAMPIONSHIP_REVEAL';
    duration?: number;
    position?: string;
    sponsor?: {
      name?: string;
      logoUrl?: string;
      tagline?: string;
      duration?: number;
    };
    dynamicTokens?: Record<string, string>;
  };
  timestamp: string;
  triggeredBy?: string;
}

export type MatchAccessRole = 'OWNER' | 'MANAGER' | 'SCORER' | 'BROADCAST_OPERATOR' | 'VIEWER';

export interface MatchAccessAssignment {
  userId: string;
  userEmail?: string;
  userName?: string;
  role: MatchAccessRole;
  assignedAt?: string;
}

export interface TournamentCollaborator {
  userId: string;
  userEmail?: string;
  email?: string;
  userName?: string;
  role: MatchAccessRole;
  assignedAt?: string;
}

export interface Tournament {
  id: string;
  name: string;
  sport: SportType;
  season?: string;
  location?: string;
  venue?: string;
  organizer?: string;
  sponsor?: string;
  startDate?: string;
  endDate?: string;
  logoUrl?: string;
  description?: string;
  status: TournamentStatus;
  isPublic?: boolean;
  competitionFormat?: CompetitionFormat;
  competitionConfig?: TournamentCompetitionConfig;
  formatConfig?: TournamentFormatConfig;
  rankingRules?: TournamentRankingRules;
  qualificationRules?: TournamentQualificationRule[];
  championTeamId?: string;
  championTeamName?: string;
  runnerUpTeamId?: string;
  runnerUpTeamName?: string;
  thirdPlaceTeamId?: string;
  thirdPlaceTeamName?: string;
  completedAt?: string;
  // Cricket Tournament Defaults
  cricketDefaultOvers?: number;
  cricketMatchFormat?: string;
  // Ownership & Authorization
  createdByUserId?: string;
  createdByUserEmail?: string;
  createdByUserName?: string;
  ownerUserId?: string;
  authorizedUserIds?: string[];
  collaborators?: TournamentCollaborator[];
  createdAt: string;
  updatedAt: string;
  // Computed summary counts (optional when fetched with details)
  groupCount?: number;
  teamCount?: number;
  playerCount?: number;
  matchCount?: number;
  completedMatchCount?: number;
  liveMatchCount?: number;
}

export interface Group {
  id: string;
  tournamentId: string;
  name: string;
  code?: string;
  description?: string;
  maxTeams?: number;
  minTeams?: number;
  qualificationRules?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  createdByUserId?: string;
  createdAt: string;
  updatedAt: string;
  teamCount?: number;
  matchesPlayed?: number;
  totalMatches?: number;
}

export interface Team {
  id: string;
  tournamentId: string;
  sport?: SportType;
  groupId?: string;
  name: string;
  shortName?: string;
  code?: string;
  logoUrl?: string;
  photoUrl?: string;
  manager?: string;
  captain?: string;
  viceCaptain?: string;
  homeLocation?: string;
  city?: string;
  contact?: string;
  description?: string;
  teamColor?: string;
  primaryColor?: string;
  coach?: string;
  contactPhone?: string;
  contactEmail?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  createdByUserId?: string;
  createdByUserEmail?: string;
  ownerUserId?: string;
  createdAt: string;
  updatedAt: string;
  playerCount?: number;
  players?: Player[];
}

export interface PlayerRecords {
  matchesPlayed?: number;
  runsScored?: number;
  wicketsTaken?: number;
  battingAverage?: number;
  bowlingAverage?: number;
  strikeRate?: number;
  goalsScored?: number;
  assists?: number;
  pointsScored?: number;
  raidPoints?: number;
  tacklePoints?: number;
  customStats?: Record<string, string | number>;
}

export interface Player {
  id: string;
  tournamentId?: string;
  groupId?: string;
  teamId: string;
  name: string;
  displayName?: string;
  photoUrl?: string;
  jerseyNumber?: number | string;
  playerId?: string;
  dob?: string;
  role?: string;
  battingStyle?: string;
  bowlingStyle?: string;
  bowlingType?: string;
  playingPosition?: string;
  isCaptain?: boolean;
  isViceCaptain?: boolean;
  height?: string;
  weight?: string;
  countryState?: string;
  country?: string;
  ranking?: string | number;
  seed?: string | number;
  contact?: string;
  bio?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'INJURED';
  records?: PlayerRecords;
  createdByUserId?: string;
  createdByUserEmail?: string;
  ownerUserId?: string;
  createdAt: string;
  updatedAt: string;
}

// Team Sheet OCR / Image Scan Interfaces
export interface ScannedPlayerItem {
  tempId: string;
  jerseyNumber?: number | string;
  name: string;
  displayName?: string;
  role?: string;
  battingStyle?: string;
  bowlingStyle?: string;
  playingPosition?: string;
  isCaptain?: boolean;
  isViceCaptain?: boolean;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  confidenceScore?: number; // 0.0 to 1.0
  notes?: string;
  originalText?: string;
  isSelected?: boolean;
  conflictType?: 'NONE' | 'DUPLICATE_JERSEY' | 'DUPLICATE_NAME' | 'EXISTING_PLAYER';
  conflictDetails?: string;
}

export interface ScannedTeamInfo {
  name: string;
  shortName?: string;
  code?: string;
  manager?: string;
  captain?: string;
  viceCaptain?: string;
  homeLocation?: string;
  contact?: string;
  teamColor?: string;
  description?: string;
}

export interface TeamSheetScanResult {
  teamInfo: ScannedTeamInfo;
  players: ScannedPlayerItem[];
  rawText?: string;
  detectedSport?: SportType | string;
  warnings?: string[];
  ocrProvider?: 'GEMINI_AI' | 'HEURISTIC_PARSER' | 'SAMPLE_DATA';
  processingTimeMs?: number;
}

export interface TeamSheetImportPayload {
  tournamentId: string;
  groupId?: string;
  teamId?: string; // If importing into existing team
  createNewTeam: boolean;
  teamData?: Partial<Team>;
  players: Array<{
    name: string;
    displayName?: string;
    jerseyNumber?: number | string;
    role?: string;
    battingStyle?: string;
    bowlingStyle?: string;
    playingPosition?: string;
    isCaptain?: boolean;
    isViceCaptain?: boolean;
    photoUrl?: string;
    contact?: string;
  }>;
  updateExistingPlayers?: boolean;
}

export interface SampleTeamSheetTemplate {
  id: string;
  title: string;
  sport: SportType;
  sheetType: 'PRINTED' | 'HANDWRITTEN' | 'OFFICIAL_ROSTER' | 'REGISTRATION_FORM';
  description: string;
  previewUrl: string;
  teamInfo: ScannedTeamInfo;
  players: ScannedPlayerItem[];
}

export type MatchStatus = 'DRAFT' | 'SCHEDULED' | 'READY' | 'LIVE' | 'COMPLETED' | 'CANCELLED';

export type MatchRound =
  | 'League'
  | 'Group Stage'
  | 'Qualifier'
  | 'Eliminator'
  | 'Semi Final'
  | 'Final'
  | 'Third Place'
  | 'Friendly'
  | 'Custom';

// Sport Specific Match Settings
export interface CricketMatchConfig {
  matchType: 'T10' | 'T20' | 'T30' | 'T50' | 'Custom Overs' | string;
  overs: number;
  isOversOverridden?: boolean;
  oversOverride?: number;
  matchOvers?: number;
  format?: string;
  powerplaySettings?: string;
  ballType?: string;
  pitchType?: string;
  boundaryInfo?: string;
  teamAScore?: any;
  teamBScore?: any;
}

export interface MatchToss {
  winnerTeamId?: string;
  decision?: 'BAT' | 'BOWL';
}

export interface VolleyballMatchConfig {
  format: 'Best of 3' | 'Best of 5' | 'Custom' | string;
  customSetsCount?: number;
  pointsPerSet: number | string;
  decidingSetPoints: number | string;
  winningMargin?: number | string;
  timeoutsPerSet?: number;
  maxSubstitutionsPerSet?: number;
  servingFirstTeamId?: string;
}

export interface KabaddiMatchConfig {
  matchDuration?: number | string; // e.g. 40 mins
  firstHalfDuration: number | string; // e.g. 20 mins
  secondHalfDuration?: number | string; // e.g. 20 mins
  halfDuration?: number | string;
  halfTimeDuration?: number | string; // e.g. 5 mins
  raidDuration?: number | string; // e.g. 30 secs
  teamSize?: number | string; // e.g. 7
  substitutesCount?: number | string; // e.g. 5
  timeoutsPerHalf?: number | string; // e.g. 2
  superTackleActiveDefenders?: number | string; // e.g. 3 or fewer
  superTacklePoints?: number | string; // e.g. 2
  allOutPoints?: number | string; // e.g. 2
  superRaidThreshold?: number | string; // e.g. 3
  doOrDieRaidThreshold?: number | string; // e.g. 3
  bonusLineActive?: boolean;
  lobbyLineActive?: boolean;
  raidRules?: string;
  timeouts?: string;
}

export interface HockeyMatchConfig {
  matchDuration?: number | string; // e.g. 60 mins
  periods: number | string; // e.g. 4 quarters or 2 halves
  periodDuration: number | string; // e.g. 15 mins
  quarterBreakDuration?: number | string; // e.g. 2 mins
  halfTimeBreakDuration?: number | string; // e.g. 10 mins
  breakDuration?: number | string;
  extraTimeEnabled?: boolean;
  extraTimePeriods?: number | string; // e.g. 2
  extraTimePeriodDuration?: number | string; // e.g. 7.5 mins or 5 mins
  penaltyShootoutEnabled?: boolean;
  shootoutAttemptsPerTeam?: number | string; // e.g. 5
  greenCardDurationMinutes?: number | string; // e.g. 2 mins
  yellowCardDurationMinutes?: number | string; // e.g. 5 or 10 mins
  teamSize?: number | string; // e.g. 11
  squadLimit?: number | string; // e.g. 16 or 18
  rollingSubstitutions?: boolean;
  penaltyCornerRules?: string;
  shootoutRules?: string;
}

export interface FootballMatchConfig {
  matchDuration?: number | string;
  halfDuration: number | string;
  firstHalfDuration?: number | string;
  secondHalfDuration?: number | string;
  halfTimeDuration?: number | string;
  extraTimeEnabled: boolean;
  extraTimeHalfDuration?: number | string;
  penaltyShootoutEnabled: boolean;
  stoppageTimeFirstHalf?: number | string;
  stoppageTimeSecondHalf?: number | string;
  maxSubstitutions?: number | string;
  formationA?: string;
  formationB?: string;
  competitionRules?: string;
}

export interface BasketballMatchConfig {
  quarters: number | string; // default 4
  quarterDuration: number | string; // in minutes, default 10
  halfTimeDuration?: number | string; // in minutes, default 15
  overtimeDuration?: number | string; // in minutes, default 5
  shotClockDuration?: number | string; // in seconds, default 24
  shotClockOffensiveRebound?: number | string; // in seconds, default 14
  playerFoulLimit?: number | string; // default 5 (or 6 for NBA)
  teamFoulBonusLimit?: number | string; // default 5
  timeoutsPerTeam?: number | string; // default 5
  competitionRules?: string;
}

export type TennisMatchType = 'SINGLES' | 'DOUBLES';
export type TennisMatchFormat = 'BEST_OF_1' | 'BEST_OF_3' | 'BEST_OF_5';
export type TennisSetRules = 'STANDARD' | 'SHORT' | 'CUSTOM';
export type TennisFinalSetRules = 'NORMAL' | 'ADVANTAGE_SET' | 'MATCH_TIEBREAK_10';
export type TennisSurface = 'HARD' | 'CLAY' | 'GRASS' | 'INDOOR' | 'CARPET' | 'OTHER';

export interface TennisMatchConfig {
  matchType: TennisMatchType | string;
  format?: TennisMatchFormat | string;
  setRules?: TennisSetRules | string;
  gamesToWinSet: number; // default 6 (or 4 for short sets)
  setAdvantage?: boolean; // default true (must win by 2 games)
  tiebreakAtGames: number; // default 6 (i.e. at 6-6)
  tiebreakPoints: number; // default 7
  finalSetRule?: TennisFinalSetRules | string; // 'NORMAL' | 'ADVANTAGE_SET' | 'MATCH_TIEBREAK_10'
  finalSetTiebreakPoints?: number;
  surface: TennisSurface | string;
  courtName?: string;
  courtNumber?: string;
  noAdScoring?: boolean; // default false (standard advantage)
  scoringType?: string;
  finalSetTiebreak?: string | boolean;
  firstServerTeamId?: string;
  firstServerPlayerId?: string;
  competitionRules?: string;
  matchFormat?: any;
}

export type BadmintonMatchType = 'SINGLES' | 'DOUBLES';
export type BadmintonMatchFormat = 'BEST_OF_1' | 'BEST_OF_3' | 'BEST_OF_5';
export type BadmintonServiceCourt = 'RIGHT' | 'LEFT';

export interface BadmintonMatchConfig {
  matchType: BadmintonMatchType | string;
  format: BadmintonMatchFormat | string;
  matchFormat?: any;
  pointsPerGame: number; // default 21
  pointDifference: number; // default 2
  maxPoints: number; // default 30 (cap at 29-29 -> 30-29)
  capPoints?: number;
  intervalPoints?: number;
  courtName?: string;
  courtNumber?: string;
  decidingGamePoints?: number; // default 21
  firstServerTeamId?: string;
  firstServerPlayerId?: string;
  firstReceiverTeamId?: string;
  firstReceiverPlayerId?: string;
  venue?: string;
  competitionRules?: string;
}

export type TableTennisMatchType = 'SINGLES' | 'DOUBLES';
export type TableTennisMatchFormat = 'BEST_OF_1' | 'BEST_OF_3' | 'BEST_OF_5' | 'BEST_OF_7';

export interface TableTennisMatchConfig {
  matchType: TableTennisMatchType | string;
  format: TableTennisMatchFormat | string;
  pointsPerGame: number; // default 11
  pointDifference: number; // default 2
  serviceRotation: number; // default 2 (every 2 points)
  deuceServiceRotation: number; // default 1 (every 1 point at deuce)
  decidingGamePoints?: number; // default 11
  decidingGameEndChangePoint?: number; // default 5 (change ends when first player reaches 5)
  firstServerTeamId?: string;
  firstServerPlayerId?: string;
  firstReceiverTeamId?: string;
  firstReceiverPlayerId?: string;
  tableNumber?: string;
  venue?: string;
  maxTimeoutsPerSide?: number; // default 1 (60s)
  timeoutDurationSeconds?: number; // default 60
  competitionRules?: string;
}

export interface GenericSportConfig {
  periodType?: string;
  periodCount?: number | string;
  periodDuration?: number | string;
  pointsToWin?: number | string;
  customRules?: string;
}

export interface MatchOfficials {
  referee?: string;
  umpire?: string;
  umpires?: string[];
  scorer?: string;
  scorers?: string[];
  assistant?: string;
  commentator?: string;
  official1?: string;
  official2?: string;
}

export interface MatchSponsors {
  sponsorName?: string;
  sponsorLogoUrl?: string;
  matchLogoUrl?: string;
  tournamentLogoUrl?: string;
  tournamentSponsor?: string;
  matchSponsor?: string;
}

export interface PlayingSquad {
  playingIds: string[];
  substituteIds: string[];
  captainId?: string;
  viceCaptainId?: string;
  wicketKeeperId?: string;
  liberoId?: string;
  goalkeeperId?: string;
  raiderIds?: string[];
  defenderIds?: string[];
}

export interface Match {
  id: string;
  tournamentId: string;
  groupId: string;
  sport: SportType;
  name: string;
  title?: string;
  matchNumber?: string;
  round: MatchRound | string;
  teamAId: string;
  teamBId: string;
  date: string;
  time: string;
  scheduledDate?: string;
  scheduledTime?: string;
  startTime?: string;
  venue: string;
  ground?: string;
  description?: string;
  status: MatchStatus;
  result?: string;
  resultText?: string;
  liveScoreText?: string;
  liveDetailText?: string;
  winningTeamId?: string;
  winnerTeamId?: string;
  winningTeamName?: string;
  resultSummary?: string;
  homeTeam?: Team;
  awayTeam?: Team;
  teamAScore?: any;
  teamBScore?: any;
  isPublic?: boolean;
  metadata?: any;
  cricketConfig?: CricketMatchConfig;
  matchOvers?: number;
  effectiveMatchOvers?: number;
  toss?: MatchToss;
  tossWinnerId?: string;
  tossDecision?: 'BAT' | 'BOWL';
  volleyballConfig?: VolleyballMatchConfig;
  kabaddiConfig?: KabaddiMatchConfig;
  hockeyConfig?: HockeyMatchConfig;
  footballConfig?: FootballMatchConfig;
  basketballConfig?: BasketballMatchConfig;
  tennisConfig?: TennisMatchConfig;
  badmintonConfig?: BadmintonMatchConfig;
  tableTennisConfig?: TableTennisMatchConfig;
  customSportId?: string;
  customSportConfig?: CustomSport | GenericSportConfig | any;
  officials?: MatchOfficials;
  sponsors?: MatchSponsors;
  teamASquad?: PlayingSquad;
  teamBSquad?: PlayingSquad;

  // Ownership & Match-Scoped Access Control
  createdByUserId?: string;
  createdByUserEmail?: string;
  createdByUserName?: string;
  ownerUserId?: string;
  scorerUserId?: string;
  broadcastOperatorUserId?: string;
  scorerUserIds?: string[];
  broadcasterUserIds?: string[];
  managerUserIds?: string[];
  authorizedUserIds?: string[];
  accessAssignments?: MatchAccessAssignment[];
  currentUserRole?: MatchAccessRole;

  createdAt: string;
  updatedAt: string;

  // Populated optional relational fields
  tournament?: Tournament;
  group?: Group;
  teamA?: Team;
  teamB?: Team;
  teamAPlayers?: Player[];
  teamBPlayers?: Player[];
}

export interface MatchSquad {
  id: string;
  matchId: string;
  teamId: string;
  playerIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ScoringEvent {
  id: string;
  matchId: string;
  eventSequence: number;
  sport: SportType;
  eventData: Record<string, unknown>;
  timestamp: string;
}

// Cricket Live Scoring Engine Types
export type ExtraType = 'NONE' | 'WIDE' | 'NO_BALL' | 'BYE' | 'LEG_BYE' | 'PENALTY';

export type WicketType =
  | 'BOWLED'
  | 'CAUGHT'
  | 'CAUGHT_BEHIND'
  | 'CAUGHT_BOWLED'
  | 'LBW'
  | 'RUN_OUT'
  | 'STUMPED'
  | 'HIT_WICKET'
  | 'OBSTRUCTING'
  | 'TIMED_OUT'
  | 'RETIRED_OUT'
  | 'RETIRED_HURT';

export type BroadcastEventType =
  | 'BALL'
  | 'RUN'
  | 'FOUR'
  | 'SIX'
  | 'WIDE'
  | 'NO_BALL'
  | 'BYE'
  | 'LEG_BYE'
  | 'WICKET'
  | 'OVER_COMPLETE'
  | 'INNINGS_BREAK'
  | 'MATCH_RESULT';

export interface CricketBallEvent {
  id: string;
  matchId: string;
  inningsNumber: 1 | 2;
  eventSequence: number;
  ballSequence?: number;
  overNumber: number; // 0-indexed over number (0 = 1st over)
  ballNumberInOver: number; // 1..6 for legal balls, or sequence in over
  ballInOver?: number;
  overDisplay: string; // e.g. "0.1", "17.4"
  battingTeamId: string;
  bowlingTeamId: string;
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
  runsOffBat: number;
  extraRuns: number;
  extraType: ExtraType;
  totalRuns: number;
  isLegalBall: boolean;
  isFour: boolean;
  isSix: boolean;
  isWicket: boolean;
  isWide?: boolean;
  isNoBall?: boolean;
  isFreeHit?: boolean;
  assistPlayerName?: string;
  wicketType?: WicketType;
  dismissedPlayerId?: string;
  fielderId?: string;
  assistFielderId?: string;
  timestamp: string;
  enteredByUserId?: string;
  enteredByUserName?: string;
  isUndone?: boolean;
  isEdited?: boolean;
  eventType: BroadcastEventType;
}

export interface CricketInnings {
  id: string;
  matchId: string;
  inningsNumber: 1 | 2;
  battingTeamId: string;
  bowlingTeamId: string;
  battingTeamName?: string;
  bowlingTeamName?: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  totalRuns: number;
  totalWickets: number;
  totalOvers: number;
  oversDisplay?: string;
  legalBallsCount: number;
  targetRuns?: number;
  currentStrikerId?: string;
  currentNonStrikerId?: string;
  currentBowlerId?: string;
  lastBowlerId?: string;
  striker?: any;
  nonStriker?: any;
  currentBowler?: any;
  batsmenStats?: BatsmanInningsStats[];
  startTime?: string;
  endTime?: string;
}

export interface BatsmanInningsStats {
  playerId: string;
  playerName: string;
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  isOut: boolean;
  dismissalInfo?: string;
  isStriker: boolean;
  isNonStriker: boolean;
}

export interface BowlerFiguresStats {
  playerId: string;
  playerName: string;
  overs: number;
  oversDisplay: string;
  legalBalls: number;
  maidens: number;
  runsConceded: number;
  wickets: number;
  economy: number;
  wides: number;
  noBalls: number;
  isCurrentBowler: boolean;
}

export interface FallOfWicket {
  wicketNumber: number;
  runs: number;
  oversDisplay: string;
  dismissedPlayerId: string;
  dismissedPlayerName: string;
}

export interface Partnership {
  runs: number;
  balls: number;
  player1Id: string;
  player2Id: string;
  player1Name?: string;
  player2Name?: string;
}

export interface ExtrasSummary {
  wides: number;
  noBalls: number;
  byes: number;
  legByes: number;
  penalties: number;
  total: number;
}

export interface CricketMatchScoringState {
  match: Match;
  innings1?: CricketInnings;
  innings2?: CricketInnings;
  currentInnings?: CricketInnings;
  currentInningsNumber?: number;
  scoreA?: number;
  scoreB?: number;
  wicketsA?: number;
  wicketsB?: number;
  totalRuns?: number;
  totalWickets?: number;
  wickets?: number;
  overs?: number;
  runRate?: number | string;
  events: CricketBallEvent[];
  batsmenStats: BatsmanInningsStats[];
  bowlerStats: BowlerFiguresStats[];
  fallOfWickets: FallOfWicket[];
  currentPartnership: Partnership;
  extras: ExtrasSummary;
  currentOverEvents: CricketBallEvent[];
  target?: number;
  targetRuns?: number;
  runsRequired?: number;
  ballsRemaining?: number;
  requiredRunRate?: number;
  currentRunRate: number;
  isOverComplete: boolean;
  isMatchComplete: boolean;
  isMatchOver?: boolean;
  isInningsBreak?: boolean;
  isInningsComplete?: boolean;
  matchResult?: string;
  matchResultText?: string;
  winnerTeamName?: string;
  manOfTheMatchPlayerName?: string;
}

export interface Statistics {
  id: string;
  entityType: 'PLAYER' | 'TEAM' | 'TOURNAMENT';
  entityId: string;
  statsData: Record<string, unknown>;
  updatedAt: string;
}

// ==========================================
// VOLLEYBALL LIVE SCORING ENGINE TYPES
// ==========================================

export type VolleyballPointType =
  | 'ATTACK_POINT'
  | 'BLOCK_POINT'
  | 'SERVICE_ACE'
  | 'OPPONENT_ATTACK_ERROR'
  | 'OPPONENT_SERVICE_ERROR'
  | 'OPPONENT_RECEPTION_ERROR'
  | 'OPPONENT_BLOCKING_ERROR'
  | 'ATTACK_ERROR'
  | 'SERVICE_ERROR'
  | 'NET_VIOLATION'
  | 'ROTATION_FAULT'
  | 'UNFORCED_ERROR'
  | 'FREE_BALL'
  | 'UNCLASSIFIED'
  | 'OTHER';

export interface VolleyballPointEvent {
  id: string;
  matchId: string;
  setNumber: number;
  rallyNumber: number;
  pointWinner: string; // teamId (teamAId or teamBId)
  serverPlayerId?: string;
  servingTeamId: string;
  pointType: VolleyballPointType;
  playerId?: string; // Scoring player or error player
  opponentError: boolean;
  scoreBefore: { teamA: number; teamB: number };
  scoreAfter: { teamA: number; teamB: number };
  timestamp: string;
  enteredByUserId?: string;
  enteredByUserName?: string;
  isUndone?: boolean;
  isEdited?: boolean;
  description?: string;
}

export interface VolleyballSet {
  id: string;
  matchId: string;
  setNumber: number;
  teamAScore: number;
  teamBScore: number;
  winnerTeamId?: string;
  targetPoints: number;
  winningMargin: number;
  isCompleted: boolean;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
}

export interface VolleyballRotation {
  teamId: string;
  position1: string; // Server position (Back-Right)
  position2: string; // Front-Right
  position3: string; // Front-Center
  position4: string; // Front-Left
  position5: string; // Back-Left
  position6: string; // Back-Center
}

export interface VolleyballSubstitution {
  id: string;
  matchId: string;
  setNumber: number;
  teamId: string;
  playerOutId: string;
  playerInId: string;
  position: number; // 1 to 6
  timestamp: string;
}

export interface VolleyballTimeout {
  id: string;
  matchId: string;
  setNumber: number;
  teamId: string;
  scoreAtTimeout: { teamA: number; teamB: number };
  timestamp: string;
}

export interface VolleyballPlayerStats {
  playerId: string;
  playerName: string;
  teamName?: string;
  attackEfficiency?: number;
  jerseyNumber?: string | number;
  role?: string;
  teamId: string;
  isStartingSix: boolean;
  isLibero: boolean;
  attackPoints: number;
  blockPoints: number;
  serviceAces: number;
  serviceErrors: number;
  attackErrors: number;
  receptionErrors: number;
  blockingErrors: number;
  digs: number;
  assists: number;
  kills: number;
  totalPoints: number;
  performancePoints: number;
}

export interface VolleyballTeamStats {
  teamId: string;
  teamName: string;
  totalPoints: number;
  setsWon: number;
  attackPoints: number;
  blockPoints: number;
  serviceAces: number;
  opponentErrors: number;
  serviceErrors: number;
  attackErrors: number;
  receptionErrors: number;
  blockingErrors: number;
  timeoutsTaken: number;
  timeoutsUsed?: number;
  substitutionsMade: number;
  substitutionsUsed?: number;
}

export interface VolleyballMatchScoringState {
  match: Match;
  sport: 'VOLLEYBALL';
  currentSetNumber: number;
  sets: VolleyballSet[];
  currentSet?: VolleyballSet;
  currentSetScoreA?: number;
  currentSetScoreB?: number;
  teamAScore?: number;
  teamBScore?: number;
  scoreA?: number;
  scoreB?: number;
  setsWonA: number;
  setsWonB: number;
  servingTeamId: string;
  serverPlayerId?: string;
  serverPlayerName?: string;
  teamARotation: VolleyballRotation;
  teamBRotation: VolleyballRotation;
  teamATimeouts: number;
  teamBTimeouts: number;
  teamASubstitutions: number;
  teamBSubstitutions: number;
  maxTimeoutsPerSet: number;
  maxSubstitutionsPerSet: number;
  events: VolleyballPointEvent[];
  playerStats: VolleyballPlayerStats[];
  teamAStats: VolleyballTeamStats;
  teamBStats: VolleyballTeamStats;
  isSetPoint?: boolean;
  isMatchPoint?: boolean;
  isDeuce?: boolean;
  isSetComplete: boolean;
  isMatchComplete: boolean;
  matchWinnerId?: string;
  matchResultText?: string;
  lastEvent?: VolleyballPointEvent;
  liberoAId?: string;
  liberoBId?: string;
  teamASetsWon?: number;
  teamBSetsWon?: number;
  courtA?: any;
  courtB?: any;
  serverPlayer?: any;
  matchFormat?: any;
  setsNeededToWin?: number;
  pointsPerSet?: number;
  decidingSetPoints?: number;
  setsList?: any[];
  allRallies?: any[];
  timeoutsRemainingA?: number;
  timeoutsRemainingB?: number;
  subsUsedA?: number;
  subsUsedB?: number;
  matchWinnerTeamId?: string;
}

// Volleyball Full Match Report
export interface VolleyballSetReport {
  id?: string;
  isCompleted?: boolean;
  setNumber: number;
  winnerTeamId?: string;
  winnerTeamName?: string;
  teamAScore: number;
  teamBScore: number;
  durationMinutes?: number;
  totalRallies: number;
  teamAPoints: number;
  teamBPoints: number;
  teamAAces: number;
  teamBAces: number;
  teamABlocks: number;
  teamBBlocks: number;
  teamAAttacks: number;
  teamBAttacks: number;
  teamAErrors: number;
  teamBErrors: number;
}

export interface VolleyballMatchReport {
  match: Match;
  tournament?: Tournament;
  group?: Group;
  teamA?: Team;
  teamB?: Team;
  status: 'LIVE' | 'COMPLETED' | 'SCHEDULED' | 'DRAFT' | 'READY' | 'SET BREAK' | 'CANCELLED';
  isFinalized: boolean;
  isCompleted?: boolean;
  matchDurationMinutes?: number;
  teamAPlayers?: Player[];
  teamBPlayers?: Player[];
  rallies?: any[];
  finalizedAt?: string;
  finalizedBy?: string;
  matchResultText: string;
  winningTeamId?: string;
  winningMarginText?: string;
  setScoresSummary: string; // e.g. "25-21, 22-25, 25-18, 25-19"
  sets: VolleyballSetReport[];
  playerStats: VolleyballPlayerStats[];
  teamAStats: VolleyballTeamStats;
  teamBStats: VolleyballTeamStats;
  timeline: VolleyballPointEvent[];
  timeouts: VolleyballTimeout[];
  substitutions: VolleyballSubstitution[];
  suggestedPlayerOfMatch?: AwardCandidate;
  selectedPlayerOfMatch?: AwardCandidate;
  suggestedBestAttacker?: AwardCandidate;
  selectedBestAttacker?: AwardCandidate;
  suggestedBestServer?: AwardCandidate;
  selectedBestServer?: AwardCandidate;
  suggestedBestBlocker?: AwardCandidate;
  selectedBestBlocker?: AwardCandidate;
  suggestedBestDefender?: AwardCandidate;
  selectedBestDefender?: AwardCandidate;
  squadsReport: {
    teamA: {
      team: Team;
      captain?: Player;
      viceCaptain?: Player;
      libero?: Player;
      startingSix: Player[];
      substitutes: Player[];
    };
    teamB: {
      team: Team;
      captain?: Player;
      viceCaptain?: Player;
      libero?: Player;
      startingSix: Player[];
      substitutes: Player[];
    };
  };
  officialsReport: {
    referee?: string;
    umpire?: string;
    scorer?: string;
    assistant?: string;
    commentator?: string;
  };
  sponsorsReport: {
    tournamentSponsor?: string;
    matchSponsor?: string;
  };
  summaryCards: {
    winnerName: string;
    teamASets: number;
    teamBSets: number;
    totalPointsA: number;
    totalPointsB: number;
    highestScorerText: string;
    bestBlockerText: string;
    bestServerText: string;
    totalAces: number;
    totalBlocks: number;
    totalAttacks: number;
  };
}

// ==========================================
// KABADDI LIVE SCORING ENGINE TYPES
// ==========================================

export type KabaddiRaidOutcome =
  | 'SUCCESS'
  | 'SUCCESSFUL_RAID'
  | 'EMPTY_RAID'
  | 'TOUCH_POINT'
  | 'BONUS_POINT'
  | 'BONUS_AND_TOUCH'
  | 'SUPER_RAID'
  | 'TACKLE_POINT'
  | 'SUPER_TACKLE'
  | 'DO_OR_DIE_SUCCESS'
  | 'DO_OR_DIE_FAIL'
  | 'ALL_OUT'
  | 'RAIDER_OUT'
  | 'TECHNICAL_POINT'
  | 'OTHER';

export interface KabaddiRaidEvent {
  id: string;
  matchId: string;
  half: 1 | 2;
  raidNumber: number;
  teamRaidNumber: number;
  raidingTeamId: string;
  defendingTeamId: string;
  raiderPlayerId: string;
  outcome: KabaddiRaidOutcome;
  isDoOrDie: boolean;
  touchPoints: number;
  bonusPoints: number;
  tacklePoints: number;
  allOutPoints: number;
  technicalPoints: number;
  totalPoints: number;
  pointWinnerTeamId: string; // which team gets the points
  touchedDefenderIds: string[];
  tacklingDefenderIds: string[];
  outPlayerIds: string[]; // which players are put out in this raid
  revivedPlayerIds: string[]; // which players are revived in this raid
  isSuperRaid: boolean;
  isSuperTackle: boolean;
  isAllOut: boolean;
  allOutTeamId?: string;
  scoreA_before: number;
  scoreB_before: number;
  scoreA_after: number;
  scoreB_after: number;
  activePlayersA_after: number;
  activePlayersB_after: number;
  raidDurationSeconds?: number;
  timestamp: string;
  enteredByUserId?: string;
  enteredByUserName?: string;
}

export interface KabaddiTimeout {
  id: string;
  matchId: string;
  half: 1 | 2;
  teamId: string;
  timestamp: string;
  timeoutNumber: number;
}

export interface KabaddiSubstitution {
  id: string;
  matchId: string;
  half: 1 | 2;
  teamId: string;
  playerOutId: string;
  playerInId: string;
  timestamp: string;
  substitutionNumber: number;
}

export interface KabaddiPlayerStats {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  jerseyNumber?: number;
  role?: 'Raider' | 'Defender' | 'All-Rounder' | string;
  isCaptain?: boolean;
  isViceCaptain?: boolean;
  // Raid stats
  raidAttempts: number;
  successfulRaids: number;
  emptyRaids: number;
  unsuccessfulRaids: number;
  touchPoints: number;
  bonusPoints: number;
  totalRaidPoints: number;
  superRaids: number;
  raidSuccessRate: number; // %
  // Tackle stats
  tackleAttempts: number;
  successfulTackles: number;
  superTackles: number;
  tacklePoints: number;
  tackleSuccessRate: number; // %
  // Combined
  allOutPointsContributed: number;
  totalPoints: number;
  totalTacklePoints?: number;
  raidStrikeRate?: number;
  isCurrentlyOnCourt: boolean;
  orderOfDismissal?: number;
}

export interface KabaddiTeamStats {
  teamId: string;
  teamName: string;
  totalPoints: number;
  firstHalfPoints: number;
  secondHalfPoints: number;
  raidPoints: number;
  touchPoints: number;
  bonusPoints: number;
  tacklePoints: number;
  superRaids: number;
  superTackles: number;
  superTacklePoints: number;
  allOutsInflicted: number;
  allOutPoints: number;
  allOutsConceded: number;
  emptyRaids: number;
  successfulRaids: number;
  unsuccessfulRaids: number;
  totalRaids: number;
  totalTackles: number;
  successfulTackles: number;
  timeoutsUsedHalf1: number;
  timeoutsUsedHalf2: number;
  substitutionsUsed: number;
  activeCourtPlayersCount: number;
  consecutiveEmptyRaids?: number;
  timeoutsTaken?: number;
  extraPoints?: number;
}

export interface KabaddiMatchScoringState {
  match: Match;
  sport: 'KABADDI';
  status: MatchStatus;
  currentHalf: 1 | 2;
  halfStatus: 'FIRST_HALF' | 'HALF_TIME' | 'SECOND_HALF' | 'MATCH_COMPLETE';
  totalRaidsCount: number;
  currentRaidNumber: number;
  activeRaidingTeamId?: string;
  nextRaidingTeamId?: string;
  activeRaiderPlayerId?: string;
  consecutiveEmptyRaidsTeamA: number;
  consecutiveEmptyRaidsTeamB: number;
  isCurrentRaidDoOrDie: boolean;
  teamAScore: number;
  teamBScore: number;
  scoreA?: number;
  scoreB?: number;
  teamAScoreHalf1: number;
  teamAScoreHalf2: number;
  teamBScoreHalf1: number;
  teamBScoreHalf2: number;
  activeCourtPlayerIdsA: string[];
  activeCourtPlayerIdsB: string[];
  outPlayerIdsA: string[];
  outPlayerIdsB: string[];
  playerStats: KabaddiPlayerStats[];
  teamAStats: KabaddiTeamStats;
  teamBStats: KabaddiTeamStats;
  raids: KabaddiRaidEvent[];
  lastRaid?: KabaddiRaidEvent;
  timeouts: KabaddiTimeout[];
  substitutions: KabaddiSubstitution[];
  isMatchComplete: boolean;
  matchWinnerId?: string;
  matchResultText?: string;
}

export interface KabaddiMatchReport {
  match: Match;
  tournament?: Tournament;
  group?: Group;
  teamA?: Team;
  teamB?: Team;
  status: 'LIVE' | 'COMPLETED' | 'SCHEDULED' | 'DRAFT' | 'READY' | 'SET BREAK' | 'CANCELLED';
  isFinalized: boolean;
  finalizedAt?: string;
  finalizedBy?: string;
  matchResultText: string;
  matchResult?: string;
  matchMargin?: string;
  winningTeamId?: string;
  winningMarginText?: string;
  teamAScore?: number;
  teamBScore?: number;
  teamAScoreHalf1?: number;
  teamAScoreHalf2?: number;
  teamBScoreHalf1?: number;
  teamBScoreHalf2?: number;
  topRaiders?: any[];
  squadA?: any;
  squadB?: any;
  firstHalfScores: { teamA: number; teamB: number };
  secondHalfScores: { teamA: number; teamB: number };
  finalScores: { teamA: number; teamB: number };
  playerStats: KabaddiPlayerStats[];
  teamAStats: KabaddiTeamStats;
  teamBStats: KabaddiTeamStats;
  raids: KabaddiRaidEvent[];
  timeouts: KabaddiTimeout[];
  substitutions: KabaddiSubstitution[];
  suggestedPlayerOfMatch?: AwardCandidate;
  selectedPlayerOfMatch?: AwardCandidate;
  suggestedManOfMatch?: AwardCandidate;
  selectedManOfMatch?: AwardCandidate;
  suggestedBestRaider?: AwardCandidate;
  selectedBestRaider?: AwardCandidate;
  suggestedBestDefender?: AwardCandidate;
  selectedBestDefender?: AwardCandidate;
  suggestedBestAllRounder?: AwardCandidate;
  selectedBestAllRounder?: AwardCandidate;
  squadsReport: {
    teamA: {
      team: Team;
      captain?: Player;
      viceCaptain?: Player;
      startingSeven: Player[];
      substitutes: Player[];
    };
    teamB: {
      team: Team;
      captain?: Player;
      viceCaptain?: Player;
      startingSeven: Player[];
      substitutes: Player[];
    };
  };
  officialsReport: {
    referee?: string;
    umpire?: string;
    scorer?: string;
    assistant?: string;
    commentator?: string;
  };
  sponsorsReport: {
    tournamentSponsor?: string;
    matchSponsor?: string;
  };
  summaryCards: {
    winnerName: string;
    finalScoreA: number;
    finalScoreB: number;
    highestRaiderText: string;
    bestDefenderText: string;
    totalSuperRaids: number;
    totalSuperTackles: number;
    totalAllOuts: number;
    totalBonusPoints: number;
  };
}

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
  name?: string;
  teamName: string;
  teamId?: string;
  details?: string;
  jerseyNumber?: number | string;
  isStarter?: boolean;
  isCaptain?: boolean;
  points?: number;
  score?: number;
  playerRole?: string;
  playerNumber?: number;
  performanceDescription?: string;
  statsSummary?: Record<string, any>;
  statSummary?: string;
  reason?: string;
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

  ballByBall?: BallByBallReportItem[];
  playerPerformances?: PlayerMatchPerformance[];

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

export interface Report {
  id: string;
  title: string;
  type: string;
  generatedAt: string;
}

// ==========================================
// MANUAL SPORTS GRAPHICS STUDIO TYPES
// ==========================================

export type GraphicElementType =
  | 'TEXT'
  | 'LIVE_DATA'
  | 'SPORT_EVENT_IMAGE'
  | 'SPORT_EVENT_ALERT'
  | 'UNIVERSAL_EVENT_ALERT'
  | 'CRICKET_BALL_EVENT'
  | 'CRICKET_EVENT_ALERT'
  | 'CRICKET_BALL_RESULT'
  | 'CRICKET_WICKET_ALERT'
  | 'CRICKET_BOUNDARY_ALERT'
  | 'CRICKET_MILESTONE_ALERT'
  | 'CRICKET_OVER_COMPLETE'
  | 'CRICKET_INNINGS_BREAK'
  | 'CRICKET_MATCH_RESULT'
  | 'RECTANGLE'
  | 'ROUNDED_RECTANGLE'
  | 'CIRCLE'
  | 'ELLIPSE'
  | 'PILL'
  | 'LINE'
  | 'TRIANGLE'
  | 'POLYGON'
  | 'STAR'
  | 'BADGE'
  | 'ARROW'
  | 'IMAGE'
  | 'LOGO'
  | 'PLAYER_PHOTO'
  | 'TEAM_LOGO'
  | 'TOURNAMENT_LOGO'
  | 'SPONSOR_LOGO'
  | 'CAPTAIN_PHOTO'
  | 'ANGULAR'
  | 'GLASS'
  | 'GROUP';

export type CricketBroadcastEventType =
  | 'DOT'
  | 'RUN_1'
  | 'RUN_2'
  | 'RUN_3'
  | 'FOUR'
  | 'SIX'
  | 'WIDE'
  | 'NO_BALL'
  | 'BYE'
  | 'LEG_BYE'
  | 'PENALTY'
  | 'WICKET'
  | 'BOWLED'
  | 'CAUGHT'
  | 'CAUGHT_BEHIND'
  | 'CAUGHT_BOWLED'
  | 'LBW'
  | 'RUN_OUT'
  | 'STUMPED'
  | 'HIT_WICKET'
  | 'BATSMAN_50'
  | 'BATSMAN_100'
  | 'BATSMAN_150'
  | 'BATSMAN_200'
  | 'BOWLER_3W'
  | 'BOWLER_5W'
  | 'TEAM_50'
  | 'TEAM_100'
  | 'TEAM_150'
  | 'TEAM_200'
  | 'TEAM_250'
  | 'TEAM_300'
  | 'PARTNERSHIP_50'
  | 'PARTNERSHIP_100'
  | 'PARTNERSHIP_150'
  | 'PARTNERSHIP_200'
  | 'OVER_COMPLETE'
  | 'MAIDEN_OVER'
  | 'POWERPLAY_START'
  | 'POWERPLAY_END'
  | 'DRINKS_BREAK'
  | 'STRATEGIC_TIMEOUT'
  | 'RAIN_DELAY'
  | 'MATCH_RESUMED'
  | 'INNINGS_BREAK'
  | 'TARGET_SET'
  | 'MATCH_RESULT'
  | 'CUSTOM_EVENT';

export type CricketEventAlertTheme =
  | 'NEON'
  | 'PREMIUM_GOLD'
  | 'GLOW_GLASS'
  | 'BROADCAST_CLEAN'
  | 'FIRE_STORM'
  | 'METALLIC'
  | 'CYBERPUNK'
  | 'MINIMAL';

export interface CricketEventAlertConfig {
  eventType?: CricketBroadcastEventType;
  themeStyle?: CricketEventAlertTheme;
  bannerTitle?: string;
  bannerSubtitle?: string;
  bannerMessage?: string;
  showPlayerPhoto?: boolean;
  showFielderPhoto?: boolean;
  showDismissalDetails?: boolean;
  showScoreEquation?: boolean;
  showBoundaryTrail?: boolean;
  showStatsPill?: boolean;
  showOverFigures?: boolean;
  autoDismissSeconds?: number;
  animationPreset?: 'POP' | 'ZOOM' | 'SLIDE_UP' | 'SLIDE_DOWN' | 'BOUNCE' | 'GLOW' | 'FADE' | 'FLIP' | 'EXPLODE';
  badgeShape?: 'ROUNDED' | 'CIRCLE' | 'PILL' | 'SQUARE' | 'HEXAGON' | 'ANGULAR';
  priority?: 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';
  primaryColor?: string;
  secondaryColor?: string;
  accentGlowColor?: string;
  soundCueEnabled?: boolean;
}

export type CricketBallEventResult =
  | 'DOT'
  | '1'
  | '2'
  | '3'
  | '4'
  | '6'
  | 'W'
  | 'NB'
  | 'WD'
  | 'B'
  | 'LB'
  | 'P';

export type CricketBallEventDismissal =
  | 'BOWLED'
  | 'CAUGHT'
  | 'CAUGHT_BEHIND'
  | 'CAUGHT_BOWLED'
  | 'LBW'
  | 'STUMPED'
  | 'RUN_OUT'
  | 'HIT_WICKET'
  | 'RETIRED_HURT'
  | 'RETIRED_OUT'
  | 'TIMED_OUT'
  | 'OBSTRUCTING'
  | 'NONE';

export type CricketBallDisplayMode =
  | 'LETTER'
  | 'TEXT'
  | 'COMPACT'
  | 'BADGE'
  | 'RECENT_STRIP'
  | 'CUSTOM';

export interface CricketBallEventElementConfig {
  displayMode?: CricketBallDisplayMode;
  showExtras?: boolean;
  showDismissal?: boolean;
  showBowler?: boolean;
  showStriker?: boolean;
  showOverNumber?: boolean;
  autoDismissSeconds?: number;
  sampleEvent?: CricketBallEventResult;
  sampleDismissal?: CricketBallEventDismissal;
  sampleRuns?: number;
  sampleDescription?: string;
  animationPreset?: 'POP' | 'ZOOM' | 'SLIDE_UP' | 'BOUNCE' | 'GLOW' | 'FADE' | 'FLIP' | 'NONE';
  colorPreset?: 'DYNAMIC_COLOR' | 'CUSTOM' | 'DEFAULT';
  dotColor?: string;
  runColor?: string;
  fourColor?: string;
  sixColor?: string;
  wicketColor?: string;
  extraColor?: string;
  recentBallsCount?: number;
  badgeShape?: 'CIRCLE' | 'ROUNDED' | 'PILL' | 'SQUARE' | 'HEXAGON' | 'ANGULAR';
  eventIconUrl?: string;
  customFormatTemplate?: string;
}

export type GraphicAnimationType =
  | 'NONE'
  | 'FADE'
  | 'SLIDE'
  | 'SLIDE_LEFT'
  | 'SLIDE_RIGHT'
  | 'SLIDE_UP'
  | 'SLIDE_DOWN'
  | 'ZOOM'
  | 'POP'
  | 'SCALE'
  | 'GLOW'
  | 'BOUNCE';

export type GraphicTransitionType =
  | 'FADE_IN'
  | 'FADE_OUT'
  | 'SLIDE_IN'
  | 'SLIDE_OUT'
  | 'ZOOM_IN'
  | 'ZOOM_OUT';

export type GraphicPositionPreset =
  | 'TOP_LEFT'
  | 'TOP_CENTER'
  | 'TOP_RIGHT'
  | 'CENTER_LEFT'
  | 'CENTER'
  | 'CENTER_RIGHT'
  | 'BOTTOM_LEFT'
  | 'BOTTOM_CENTER'
  | 'BOTTOM_RIGHT'
  | 'CUSTOM';

export interface GraphicGradientConfig {
  enabled: boolean;
  type: 'linear' | 'radial';
  direction: 'to right' | 'to bottom' | 'to bottom right' | 'to top' | 'to top right' | 'angle';
  angle?: number;
  startColor: string;
  endColor: string;
  stop1?: number;
  stop2?: number;
}

export interface GraphicBoxShadowConfig {
  enabled: boolean;
  color: string;
  blur: number;
  spread: number;
  x: number;
  y: number;
}

export interface GraphicTextShadowConfig {
  enabled: boolean;
  color: string;
  blur: number;
  x: number;
  y: number;
}

export interface GraphicElement {
  id: string;
  name: string;
  type: GraphicElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  scale?: number;
  zIndex: number;
  visible: boolean;
  locked: boolean;
  opacity?: number;

  // Text Customization
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string | number;
  fontStyle?: 'normal' | 'italic';
  underline?: boolean;
  textColor?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  textAlignVertical?: 'top' | 'middle' | 'bottom';
  letterSpacing?: number;
  lineHeight?: number;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  textOverflow?: 'wrap' | 'nowrap' | 'clip' | 'ellipsis';
  autoFitText?: boolean;
  textShadow?: GraphicTextShadowConfig;
  textGlow?: {
    enabled: boolean;
    color: string;
    blur: number;
    spread?: number;
  };
  textStroke?: {
    enabled: boolean;
    color: string;
    width: number;
  };
  textGradient?: GraphicGradientConfig;
  textBackgroundColor?: string;
  textPadding?: number;
  textBorderRadius?: number;
  blendMode?:
    | 'normal'
    | 'multiply'
    | 'screen'
    | 'overlay'
    | 'darken'
    | 'lighten'
    | 'color-dodge'
    | 'color-burn'
    | 'hard-light'
    | 'soft-light'
    | 'difference'
    | 'exclusion'
    | 'hue'
    | 'saturation'
    | 'color'
    | 'luminosity';

  // Shape Customization
  shapeType?:
    | 'RECTANGLE'
    | 'ROUNDED_RECTANGLE'
    | 'PILL'
    | 'CIRCLE'
    | 'ELLIPSE'
    | 'ANGULAR'
    | 'GLASS'
    | 'LINE'
    | 'TRIANGLE'
    | 'POLYGON'
    | 'STAR'
    | 'BADGE'
    | 'ARROW';
  fillColor?: string;
  gradient?: GraphicGradientConfig;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  borderOpacity?: number;
  boxShadow?: GraphicBoxShadowConfig;
  glow?: {
    enabled: boolean;
    color: string;
    blur: number;
    spread: number;
    inner?: boolean;
  };
  glassBlur?: number;
  glassOpacity?: number;

  // Specific Shape Parameters
  polygonPoints?: string;
  points?: Array<{ x: number; y: number }>;
  sidesCount?: number;
  starPointsCount?: number;
  starPoints?: number;
  innerRadiusRatio?: number;
  badgeStyle?:
    | 'SHIELD'
    | 'ROSETTE'
    | 'HEXAGON'
    | 'CHEVRON'
    | 'RIBBON'
    | 'PLAQUE'
    | 'OCTAGON';
  arrowDirection?:
    | 'RIGHT'
    | 'LEFT'
    | 'UP'
    | 'DOWN'
    | 'CHEVRON_RIGHT'
    | 'DOUBLE_HEAD';
  arrowHeadSize?: number;
  arrowStemWidth?: number;
  clipPath?: string;
  maskShape?:
    | 'none'
    | 'circle'
    | 'rounded'
    | 'hexagon'
    | 'squircle'
    | 'diagonal_cut'
    | 'shield'
    | 'star'
    | 'triangle'
    | 'pill';

  // Grouping & Hierarchy
  groupId?: string;
  groupName?: string;
  isGroup?: boolean;
  childrenIds?: string[];

  // Image & Media Customization
  imageUrl?: string;
  imageFit?: 'contain' | 'cover' | 'fill' | 'scale-down' | 'none';
  imagePlaceholder?: string;
  dynamicFieldKey?: string;
  imageSourceType?: 'STATIC' | 'DYNAMIC' | 'UPLOAD';
  imageFallbackText?: string;
  aspectRatioLock?: boolean;
  aspectRatio?: '1:1' | '16:9' | '4:3' | '3:4' | 'FREE';
  imageFilters?: {
    grayscale?: number;
    sepia?: number;
    brightness?: number;
    contrast?: number;
    blur?: number;
    saturation?: number;
    invert?: number;
    hueRotate?: number;
  };

  // Transform Mode
  transformMode?: 'AUTO' | 'MANUAL';

  // Live Match Data Layer System Properties
  liveDataField?: string;
  liveDataPrefix?: string;
  liveDataSuffix?: string;
  liveDataFallback?: string;
  liveDataTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  liveDataFormatter?: string;
  playerNameFormat?: 'full' | 'first_name' | 'short' | 'initial_surname' | 'surname' | 'none';
  conditionalVisibility?: {
    enabled: boolean;
    condition:
      | 'NOT_EMPTY'
      | 'EQUALS'
      | 'NOT_EQUALS'
      | 'GREATER_THAN'
      | 'LESS_THAN'
      | 'INNINGS_2'
      | 'MATCH_LIVE'
      | 'MATCH_COMPLETED'
      | 'INNINGS_ACTIVE'
      | 'CLOCK_RUNNING'
      | 'STRIKER_EXISTS'
      | 'NON_STRIKER_EXISTS'
      | 'BOWLER_EXISTS'
      | 'WICKET'
      | 'FOUR'
      | 'SIX'
      | 'EXTRA'
      | 'CHASE_ACTIVE'
      | 'PARTNERSHIP_ACTIVE'
      | 'MILESTONE_ACTIVE'
      | 'BALL_EVENT_EXISTS'
      | 'SHOW'
      | 'HIDE'
      | 'AUTO';
    targetValue?: string;
  };

  // Cricket Ball Event Graphics Engine Config
  ballEventConfig?: CricketBallEventElementConfig;

  // Cricket Professional Broadcast Event Alert Config
  eventAlertConfig?: CricketEventAlertConfig;
}

export type GraphicAspectRatio = '16:9' | '4:3' | '1:1' | '9:16' | '4:5' | 'CUSTOM' | string;

export type GraphicResolutionPreset =
  | '4K_UHD'
  | 'QHD'
  | 'FULL_HD'
  | 'HD_900'
  | 'HD_768'
  | 'HD_720'
  | 'SD_576'
  | '4_3_1200'
  | '4_3_960'
  | '4_3_768'
  | '4_3_600'
  | '1_1_2160'
  | '1_1_1080'
  | '1_1_720'
  | '9_16_2160'
  | '9_16_1080'
  | '9_16_720'
  | '4_5_1350'
  | '4_5_1080'
  | 'CUSTOM';

export type GraphicOrientation = 'LANDSCAPE' | 'PORTRAIT' | 'SQUARE';

export type ResolutionConversionStrategy =
  | 'FIT'
  | 'SCALE'
  | 'KEEP_POSITIONS'
  | 'RECENTER'
  | 'CROP'
  | 'CENTER'
  | 'STRETCH';

export interface StudioGraphicSafeAreaConfig {
  enabled: boolean;
  actionSafePercent?: number; // 90%
  titleSafePercent?: number; // 80%
}

export interface StudioGraphicGridConfig {
  enabled: boolean;
  size?: number; // e.g. 16
  snapToGrid?: boolean;
  snapToGuides?: boolean;
}

export interface StudioGraphic {
  id: string;
  name: string;
  sport: SportType;
  category: string;
  width?: number;
  height?: number;
  aspectRatio?: GraphicAspectRatio;
  resolutionPreset?: GraphicResolutionPreset | string;
  customResolution?: {
    width: number;
    height: number;
  };
  orientation?: GraphicOrientation;
  safeArea?: StudioGraphicSafeAreaConfig;
  grid?: StudioGraphicGridConfig;
  canvas: {
    width: number;
    height: number;
    backgroundColor?: string;
  };
  positionPreset: GraphicPositionPreset;
  animation: GraphicAnimationType;
  transition: GraphicTransitionType;
  animationDuration: number; // in seconds
  transitionDuration: number; // in seconds
  displayDuration: number; // in seconds (0 = persistent)
  elements: GraphicElement[];
  type?: string;
  duration?: number;
  durationSeconds?: number;
  dynamicFields: string[];
  status: 'ACTIVE' | 'INACTIVE';
  description?: string;
  tags?: string[];
  isPreset?: boolean;
  presetName?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudioGraphicPreset {
  id: string;
  name: string;
  sport: SportType;
  category: string;
  description: string;
  graphic: Omit<StudioGraphic, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>;
  createdAt: string;
}

export interface GraphicsTemplate {
  id: string;
  name: string;
  category: 'SCOREBOARD' | 'EVENT' | 'FULL_PRESET' | string;
  sport: SportType;
  style: BroadcastTemplateStyle;
  aspectRatio: '16:9' | '9:16' | '1:1';
  elements?: GraphicElement[];
  createdAt: string;
  updatedAt?: string;
}

export interface BroadcastOutput {
  id: string;
  matchId: string;
  templateId: string;
  overlayUrl: string;
  status: 'ACTIVE' | 'IDLE';
}

export type BroadcastTemplateStyle =
  | 'MODERN_SPORTS'
  | 'MINIMAL'
  | 'PREMIUM'
  | 'NEON'
  | 'GLASS'
  | 'CLASSIC_TV'
  | 'BOLD_SPORTS'
  | 'COMPACT'
  | 'ROUNDED'
  | 'ANGULAR'
  | 'CHAMPIONSHIP';

export type ContainerShape =
  | 'RECTANGLE'
  | 'ROUNDED'
  | 'PILL'
  | 'CAPSULE'
  | 'ANGULAR'
  | 'GLASS';

export type BroadcastFontStyle =
  | 'MODERN'
  | 'BOLD'
  | 'CONDENSED'
  | 'SPORTS'
  | 'MINIMAL'
  | 'PREMIUM';

export type BroadcastPosition =
  | 'BOTTOM'
  | 'TOP'
  | 'TOP_LEFT'
  | 'TOP_RIGHT'
  | 'BOTTOM_LEFT'
  | 'BOTTOM_RIGHT'
  | 'CENTER'
  | 'CUSTOM';

export interface BroadcastElementVisibility {
  tournamentLogo: boolean;
  tournamentName: boolean;
  teamLogo: boolean;
  teamName: boolean;
  score: boolean;
  wickets: boolean;
  overs: boolean;
  runRate: boolean;
  target: boolean;
  requiredRuns: boolean;
  requiredRate: boolean;
  striker: boolean;
  nonStriker: boolean;
  batsmanRuns: boolean;
  batsmanBalls: boolean;
  bowlerName: boolean;
  bowlerFigures: boolean;
  partnership: boolean;
  currentOver: boolean;
  sponsorLogo: boolean;
}

export interface BroadcastStyleConfig {
  position: BroadcastPosition;
  customX?: number;
  customY?: number;
  shape: ContainerShape;
  fontStyle: BroadcastFontStyle;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  bgOpacity: number;
  showBorder: boolean;
  showGlow: boolean;
  animation: 'FADE' | 'SLIDE_UP' | 'SLIDE_DOWN' | 'SCALE' | 'POP' | 'BOUNCE' | 'NONE';
}

export interface BroadcastSelectedTemplates {
  scoreboard: BroadcastTemplateStyle;
  four: BroadcastTemplateStyle;
  six: BroadcastTemplateStyle;
  wicket: BroadcastTemplateStyle;
  fifty: BroadcastTemplateStyle;
  century: BroadcastTemplateStyle;
  over: BroadcastTemplateStyle;
  partnership: BroadcastTemplateStyle;
  inningsBreak: BroadcastTemplateStyle;
  matchResult: BroadcastTemplateStyle;
  playerLowerThird: BroadcastTemplateStyle;
}

export interface BroadcastEventDurations {
  four: number;
  six: number;
  wicket: number;
  fifty: number;
  century: number;
  over: number;
  matchResult?: number;
}

export interface BroadcastSponsorConfig {
  name: string;
  logoUrl: string;
  position: 'TOP_RIGHT' | 'TOP_LEFT' | 'SCORE_INTEGRATED';
  animation: 'FADE' | 'PULSE' | 'STATIC';
}

export interface BroadcastConfig {
  id: string;
  matchId: string;
  scoreboardVisible: boolean;
  sponsorVisible: boolean;
  playerLowerThirdVisible: boolean;
  selectedPlayerId?: string;
  enableFour: boolean;
  enableSix: boolean;
  enableWicket: boolean;
  enableFifty: boolean;
  enableCentury: boolean;
  enableOver: boolean;
  enablePartnership: boolean;
  enableInningsBreak: boolean;
  enableMatchResult: boolean;
  selectedTemplates: BroadcastSelectedTemplates;
  elementVisibility: BroadcastElementVisibility;
  styleConfig: BroadcastStyleConfig;
  eventDurations: BroadcastEventDurations;
  sponsorConfig: BroadcastSponsorConfig;
  activeManualOverlay?: 'PLAYER_LOWER_THIRD' | 'SPONSOR' | 'NONE';
  activeGraphicIds?: string[];
  hiddenGraphicIds?: string[];
  updatedAt: string;
}

export interface BroadcastPreset {
  id: string;
  name: string;
  description?: string;
  config: Partial<BroadcastConfig>;
  createdAt: string;
}

export type BroadcastTriggerEventType =
  // Cricket Events
  | 'DOT'
  | 'ONE'
  | 'TWO'
  | 'THREE'
  | 'FOUR'
  | 'SIX'
  | 'WIDE'
  | 'NO_BALL'
  | 'BYE'
  | 'LEG_BYE'
  | 'WICKET'
  | 'LBW'
  | 'BOWLED'
  | 'CAUGHT'
  | 'STUMPED'
  | 'RUN_OUT'
  | 'HIT_WICKET'
  | 'FREE_HIT'
  | 'FIFTY'
  | 'CENTURY'
  | 'HAT_TRICK'
  | 'MAIDEN'
  | 'MAIDEN_OVER'
  | 'OVER_COMPLETE'
  | 'INNINGS_BREAK'
  | 'MATCH_RESULT'
  | 'PLAYER_LOWER_THIRD'
  | 'PARTNERSHIP'
  | 'PARTNERSHIP_MILESTONE'
  // Football / Soccer Events
  | 'GOAL'
  | 'PENALTY_GOAL'
  | 'FREE_KICK_GOAL'
  | 'OWN_GOAL'
  | 'RED_CARD'
  | 'YELLOW_CARD'
  | 'SECOND_YELLOW'
  | 'SUBSTITUTION'
  | 'PENALTY_AWARDED'
  | 'PENALTY_MISSED'
  | 'CORNER'
  | 'HALF_TIME'
  | 'FULL_TIME'
  | 'EXTRA_TIME'
  // Field Hockey Events
  | 'PENALTY_CORNER'
  | 'PENALTY_STROKE'
  | 'GREEN_CARD'
  | 'QUARTER_END'
  | 'SHOOTOUT'
  | 'SHOOTOUT_ATTEMPT'
  | 'SHOOTOUT_GOAL'
  | 'SHOOTOUT_MISS'
  | 'SHOOTOUT_WON'
  // Kabaddi Events
  | 'RAID_START'
  | 'RAID_POINT'
  | 'BONUS_POINT'
  | 'TOUCH_POINT'
  | 'TACKLE'
  | 'SUPER_TACKLE'
  | 'SUPER_RAID'
  | 'ALL_OUT'
  | 'DO_OR_DIE'
  | 'DO_OR_DIE_SUCCESS'
  | 'DO_OR_DIE_FAIL'
  | 'RAIDER_OUT'
  | 'REVIVAL'
  | 'MATCH_AWARDS'
  | 'PLAYER_OF_MATCH'
  | 'MATCH_SUMMARY'
  // Volleyball Events
  | 'POINT'
  | 'SERVICE_ACE'
  | 'BLOCK'
  | 'ATTACK_POINT'
  | 'SPIKE'
  | 'SPIKE_KILL'
  | 'BLOCK_KILL'
  | 'KILL'
  | 'SERVICE_ERROR'
  | 'ATTACK_ERROR'
  | 'TIMEOUT'
  | 'SET_POINT'
  | 'SET_WON'
  | 'DEUCE'
  | 'FINAL_SET'
  | 'MATCH_POINT'
  | 'MATCH_WON'
  // Basketball Events
  | 'ONE_POINT'
  | 'TWO_POINT'
  | 'THREE_POINT'
  | 'THREE_POINTER'
  | 'TWO_POINTER'
  | 'ONE_POINTER'
  | 'FREE_THROW'
  | 'FREE_THROW_MADE'
  | 'FREE_THROW_MISSED'
  | 'DUNK'
  | 'FOUL'
  | 'TECHNICAL_FOUL'
  | 'FLAGRANT_FOUL'
  | 'FOULED_OUT'
  | 'REBOUND'
  | 'STEAL'
  | 'TURNOVER'
  | 'SHOT_CLOCK'
  | 'SHOT_CLOCK_VIOLATION'
  | 'QUARTER_COMPLETE'
  | 'OVERTIME'
  // Tennis Events
  | 'ACE'
  | 'TENNIS_ACE'
  | 'DOUBLE_FAULT'
  | 'WINNER'
  | 'TENNIS_WINNER'
  | 'UNFORCED_ERROR'
  | 'BREAK_POINT'
  | 'BREAK'
  | 'BREAK_POINT_CONVERTED'
  | 'ADVANTAGE'
  | 'TIE_BREAK'
  | 'TENNIS_SET_SUMMARY'
  | 'TENNIS_MATCH_STATS'
  // Badminton Events
  | 'BADMINTON_ACE'
  | 'SMASH_WINNER'
  | 'SMASH'
  | 'NET_WINNER'
  | 'NET_KILL'
  | 'DROP_SHOT_WINNER'
  | 'DROP_SHOT'
  | 'CLEAR_WINNER'
  | 'CLEAR'
  | 'DRIVE_WINNER'
  | 'DRIVE'
  | 'SERVICE_FAULT'
  | 'GAME_POINT'
  | 'GAME_WON'
  | 'INTERVAL'
  | 'DEUCE_20_20'
  | 'GOLDEN_POINT'
  // Table Tennis Events
  | 'TABLE_TENNIS_ACE'
  | 'EDGE'
  | 'EDGE_POINT'
  | 'NET'
  | 'NET_POINT'
  | 'FOREHAND_WINNER'
  | 'BACKHAND_WINNER'
  | 'LOOP_WINNER'
  | 'CHOP_WINNER'
  | 'FORCED_ERROR'
  | 'TT_DEUCE'
  | 'DECIDING_GAME'
  | 'END_CHANGE'
  // Pickleball Events
  | 'DOUBLE_BOUNCE'
  | 'FAULT'
  | 'LET'
  | 'SIDE_OUT'
  | 'KITCHEN_FAULT'
  // Handball Events
  | 'SEVEN_M_PENALTY'
  | 'SEVEN_M_GOAL'
  | 'SEVEN_M_SAVED'
  | 'TWO_MIN_SUSPENSION'
  | 'SUSPENSION'
  // Squash Events
  | 'STROKE'
  | 'TIN'
  // Generic / Custom Sport Events
  | 'POWER_PLAY'
  | 'BONUS'
  | 'PERIOD_START'
  | 'PERIOD_END'
  | 'PERIOD_BREAK'
  | 'PERIOD_COMPLETE'
  | 'CUSTOM_EVENT'
  | 'NONE';

export interface BroadcastActiveEventPayload {
  type: BroadcastTriggerEventType | string;
  durationSeconds: number;
  data?: any;
  timestamp: string;
  sport?: SportType;
  graphicId?: string;
  priority?: number;
}

// ==========================================
// UNIVERSAL MULTI-SPORT EVENT GRAPHICS TYPES
// ==========================================

export type TriggerMode = 'AUTO' | 'MANUAL' | 'AUTO_MANUAL' | 'DISABLED';

export type UniversalEventConditionType =
  | 'EVENT_EQUALS'
  | 'EVENT_EXISTS'
  | 'PLAYER_EXISTS'
  | 'TEAM_EXISTS'
  | 'SCORE_GREATER_THAN'
  | 'SCORE_EQUALS'
  | 'MATCH_LIVE'
  | 'MATCH_COMPLETED'
  | 'PERIOD_ACTIVE'
  | 'SET_ACTIVE'
  | 'GAME_ACTIVE'
  | 'CUSTOM';

export interface UniversalEventCondition {
  id: string;
  type: UniversalEventConditionType;
  targetField?: string;
  operator?: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'not_empty';
  targetValue?: string | number;
  enabled: boolean;
}

export interface SportEventDefinition {
  id: string;
  sport: SportType;
  eventType: string;
  name: string;
  shortName: string;
  category: string;
  defaultPriority: number; // 1-100
  defaultDuration: number; // seconds
  defaultTitle: string;
  defaultSubtitle: string;
  defaultMessage?: string;
  badgeText: string;
  badgeBg: string;
  badgeTextColor: string;
  badgeBorder: string;
  primaryColor: string;
  secondaryColor: string;
  accentGlow: string;
  iconName: string;
  iconType: string;
  description?: string;
  tags?: string[];
  triggerMode?: TriggerMode;
  isCustom?: boolean;
}

export interface UniversalSportEvent {
  eventId: string;
  matchId: string;
  sport: SportType;
  eventType: string;
  eventName?: string;
  timestamp: string;
  period?: string | number;
  set?: number;
  game?: number;
  over?: string | number;
  ball?: number;
  playerId?: string;
  playerName?: string;
  teamId?: string;
  teamName?: string;
  priority: number;
  graphicId?: string;
  payload?: any;
  status: 'QUEUED' | 'ON_AIR' | 'COMPLETED' | 'CANCELLED';
  triggerMode?: TriggerMode;
  durationSeconds?: number;
  entryAnimation?: GraphicAnimationType;
  exitAnimation?: GraphicAnimationType;
  positionPreset?: GraphicPositionPreset;
}

export interface UniversalEventQueueState {
  matchId: string;
  sport: SportType;
  activeEvent: UniversalSportEvent | null;
  queue: UniversalSportEvent[];
  history: UniversalSportEvent[];
  isHeld: boolean;
  cooldownSeconds: number;
  lastEventTimestamp: number;
}

// ==========================================
// FIELD HOCKEY LIVE SCORING ENGINE TYPES
// ==========================================

export type HockeyRole = 'GOALKEEPER' | 'DEFENDER' | 'MIDFIELDER' | 'FORWARD' | 'PLAYER';

export type HockeyGoalType =
  | 'FIELD_GOAL'
  | 'PENALTY_CORNER_GOAL'
  | 'PENALTY_STROKE_GOAL'
  | 'OWN_GOAL';

export type HockeyCardType = 'GREEN' | 'YELLOW' | 'RED';

export type HockeyPenaltyCornerOutcome =
  | 'GOAL'
  | 'SAVED'
  | 'MISSED'
  | 'DEFLECTED'
  | 'NO_GOAL'
  | 'OTHER';

export type HockeyPenaltyStrokeOutcome = 'GOAL' | 'SAVED' | 'MISSED';

export type HockeyShootoutOutcome = 'GOAL' | 'MISS' | 'SAVED';

export type HockeyEventType =
  | 'GOAL'
  | 'PENALTY_CORNER'
  | 'PENALTY_STROKE'
  | 'CARD'
  | 'SUBSTITUTION'
  | 'PERIOD_START'
  | 'PERIOD_END'
  | 'EXTRA_TIME_START'
  | 'EXTRA_TIME_END'
  | 'SHOOTOUT_ATTEMPT'
  | 'SHOOTOUT_END'
  | 'TIMEOUT'
  | 'CLOCK_SYNC';

export interface HockeyScoringEvent {
  id: string;
  matchId: string;
  eventSequence: number;
  period: number; // 1, 2, 3, 4, 5 (ET1), 6 (ET2), 7 (Shootout)
  periodType: 'REGULAR' | 'EXTRA_TIME' | 'SHOOTOUT';
  periodName: string; // 'Q1', 'Q2', 'Q3', 'Q4', 'ET1', 'ET2', 'SO'
  matchTimeDisplay: string; // e.g. "08:42"
  matchTimeSeconds: number; // elapsed seconds in current period
  teamId: string;
  teamName?: string;
  playerId?: string;
  playerName?: string;
  assistPlayerId?: string;
  assistPlayerName?: string;
  eventType: HockeyEventType;
  goalType?: HockeyGoalType;
  cardType?: HockeyCardType;
  cardDurationMinutes?: number;
  cardReason?: string;
  playerOutId?: string;
  playerOutName?: string;
  playerInId?: string;
  playerInName?: string;
  penaltyCornerOutcome?: HockeyPenaltyCornerOutcome;
  penaltyStrokeOutcome?: HockeyPenaltyStrokeOutcome;
  shootoutRound?: number;
  shootoutAttemptOutcome?: HockeyShootoutOutcome;
  metadata?: Record<string, any>;
  scoreA_before: number;
  scoreB_before: number;
  scoreA_after: number;
  scoreB_after: number;
  timestamp: string;
  isUndone?: boolean;
}

export interface HockeyPlayerStats {
  playerId: string;
  playerName: string;
  teamId: string;
  jerseyNumber?: string;
  role?: string;
  isCaptain?: boolean;
  isViceCaptain?: boolean;
  isGoalkeeper?: boolean;
  isStarting?: boolean;
  goals: number;
  fieldGoals: number;
  penaltyCornerGoals: number;
  penaltyStrokeGoals: number;
  assists: number;
  shots: number;
  shotsOnTarget: number;
  greenCards: number;
  yellowCards: number;
  redCards: number;
  isSuspended: boolean;
  activeCardType?: HockeyCardType;
  suspensionRemainingSeconds?: number;
  suspensionEndMatchTimeSeconds?: number;
  suspensionPeriod?: number;
  minutesPlayed?: number;
  saves: number; // For Goalkeepers
  goalsConceded: number;
  penaltyStrokeSaves: number;
  shootoutGoalsScored: number;
  shootoutGoalsConceded: number;
  shootoutSaves: number;
}

export interface HockeyTeamStats {
  teamId: string;
  teamName: string;
  goals: number;
  fieldGoals: number;
  penaltyCornerGoals: number;
  penaltyStrokeGoals: number;
  penaltyCorners: number;
  penaltyCornersConverted: number;
  penaltyStrokes: number;
  penaltyStrokesAwarded?: number;
  penaltyStrokesConverted: number;
  greenCards: number;
  yellowCards: number;
  redCards: number;
  shots: number;
  shotsOnTarget: number;
  saves: number;
  substitutionsCount: number;
  shootoutScore: number;
  shootoutAttempts: number;
}

export interface HockeyPeriodScore {
  period: number;
  periodName: string; // 'Q1', 'Q2', 'Q3', 'Q4', 'ET1', 'ET2', 'SO'
  teamAScore: number;
  teamBScore: number;
  teamAPenaltyCorners: number;
  teamBPenaltyCorners: number;
}

export interface HockeyCardSuspension {
  id: string;
  playerId: string;
  playerName: string;
  teamId: string;
  cardType: HockeyCardType;
  period: number;
  issuedAtMatchTimeSeconds: number;
  durationMinutes: number;
  expiresAtMatchTimeSeconds: number;
  isActive: boolean;
}

export interface HockeySubstitution {
  id: string;
  matchId: string;
  period: number;
  periodName: string;
  matchTimeDisplay: string;
  matchTimeSeconds: number;
  teamId: string;
  playerOutId: string;
  playerOutName: string;
  playerInId: string;
  playerInName: string;
  timestamp: string;
}

export interface HockeyShootoutAttempt {
  id: string;
  matchId: string;
  roundNumber: number;
  attemptNumberInRound: number; // 1 or 2
  teamId: string;
  teamName: string;
  takerPlayerId: string;
  takerPlayerName: string;
  gkPlayerId?: string;
  gkPlayerName?: string;
  outcome: HockeyShootoutOutcome;
  timestamp: string;
}

export interface HockeyMatchClock {
  isRunning: boolean;
  elapsedSeconds: number; // Elapsed seconds within current period (e.g. 0 to 900)
  periodDurationSeconds: number; // e.g. 900 (15 min)
  lastStartedAt?: string;
}

export interface HockeyMatchScoringState {
  match: Match;
  sport: 'HOCKEY';
  status: MatchStatus;
  currentPeriod: number; // 1..4 (or 5,6 for ET, 7 for SO)
  currentPeriodName: string; // '1st Quarter', '2nd Quarter', etc.
  periodStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'PERIOD_BREAK' | 'EXTRA_TIME' | 'SHOOTOUT' | 'MATCH_COMPLETE';
  clock: HockeyMatchClock;
  teamAScore: number;
  teamBScore: number;
  scoreA?: number;
  scoreB?: number;
  teamAPeriodScores: number[];
  teamBPeriodScores: number[];
  periodScores: HockeyPeriodScore[];
  activeCourtPlayerIdsA: string[];
  activeCourtPlayerIdsB: string[];
  goalkeeperIdA?: string;
  goalkeeperIdB?: string;
  activeSuspensions: HockeyCardSuspension[];
  playerStats: HockeyPlayerStats[];
  teamAStats: HockeyTeamStats;
  teamBStats: HockeyTeamStats;
  events: HockeyScoringEvent[];
  lastEvent?: HockeyScoringEvent;
  substitutions: HockeySubstitution[];
  shootoutAttempts: HockeyShootoutAttempt[];
  shootoutScoreA: number;
  shootoutScoreB: number;
  isExtraTime: boolean;
  isShootout: boolean;
  isMatchComplete: boolean;
  matchWinnerId?: string;
  matchResultText?: string;
}

export interface HockeyMatchReport {
  match: Match;
  tournament?: Tournament;
  group?: Group;
  teamA?: Team;
  teamB?: Team;
  status: 'LIVE' | 'COMPLETED' | 'SCHEDULED' | 'DRAFT' | 'READY' | 'SET BREAK' | 'CANCELLED';
  isFinalized: boolean;
  finalizedAt?: string;
  finalizedBy?: string;
  matchResultText: string;
  winningTeamId?: string;
  winningMarginText?: string;
  periodScores: HockeyPeriodScore[];
  finalScore: { teamA: number; teamB: number };
  shootoutScore?: { teamA: number; teamB: number };
  playerStats: HockeyPlayerStats[];
  teamAStats: HockeyTeamStats;
  teamBStats: HockeyTeamStats;
  events: HockeyScoringEvent[];
  goalTimeline: HockeyScoringEvent[];
  penaltyCornersList: HockeyScoringEvent[];
  cardsList: HockeyScoringEvent[];
  substitutions: HockeySubstitution[];
  shootoutAttempts: HockeyShootoutAttempt[];
  suggestedPlayerOfMatch?: AwardCandidate;
  selectedPlayerOfMatch?: AwardCandidate;
  suggestedBestForward?: AwardCandidate;
  selectedBestForward?: AwardCandidate;
  suggestedBestMidfielder?: AwardCandidate;
  selectedBestMidfielder?: AwardCandidate;
  suggestedBestDefender?: AwardCandidate;
  selectedBestDefender?: AwardCandidate;
  suggestedBestGoalkeeper?: AwardCandidate;
  selectedBestGoalkeeper?: AwardCandidate;
  squadsReport: {
    teamA: {
      team: Team;
      captain?: Player;
      viceCaptain?: Player;
      goalkeeper?: Player;
      startingEleven: Player[];
      substitutes: Player[];
    };
    teamB: {
      team: Team;
      captain?: Player;
      viceCaptain?: Player;
      goalkeeper?: Player;
      startingEleven: Player[];
      substitutes: Player[];
    };
  };
  officialsReport: {
    referee?: string;
    umpire?: string;
    scorer?: string;
    assistant?: string;
    commentator?: string;
  };
  sponsorsReport: {
    tournamentSponsor?: string;
    matchSponsor?: string;
  };
  summaryCards: {
    winnerName: string;
    finalScoreA: number;
    finalScoreB: number;
    totalPenaltyCornersA: number;
    totalPenaltyCornersB: number;
    totalCardsA: number;
    totalCardsB: number;
    topScorerText: string;
    bestGoalkeeperText: string;
    isShootout: boolean;
    shootoutResultText?: string;
  };
}

// ==========================================
// FOOTBALL / SOCCER LIVE SCORING ENGINE TYPES
// ==========================================

export type FootballGoalType =
  | 'OPEN_PLAY'
  | 'FREE_KICK'
  | 'PENALTY'
  | 'OWN_GOAL'
  | 'CORNER'
  | 'HEADER'
  | 'OTHER';

export type FootballCardType = 'YELLOW' | 'SECOND_YELLOW' | 'RED';

export type FootballPenaltyOutcome = 'GOAL' | 'MISSED' | 'SAVED';

export type FootballShootoutOutcome = 'GOAL' | 'MISS' | 'SAVED';

export type FootballEventType =
  | 'GOAL'
  | 'ASSIST'
  | 'OWN_GOAL'
  | 'PENALTY_AWARDED'
  | 'PENALTY_GOAL'
  | 'PENALTY_MISSED'
  | 'PENALTY_SAVED'
  | 'CORNER'
  | 'YELLOW_CARD'
  | 'SECOND_YELLOW'
  | 'RED_CARD'
  | 'SUBSTITUTION'
  | 'PERIOD_START'
  | 'PERIOD_END'
  | 'EXTRA_TIME'
  | 'SHOOTOUT_ATTEMPT'
  | 'SCORE_CORRECTION'
  | 'FOUL'
  | 'OFFSIDE'
  | 'SHOT'
  | 'SHOT_ON_TARGET'
  | 'SAVE';

export interface FootballScoringEvent {
  id: string;
  matchId: string;
  period: number; // 1 = 1st Half, 2 = 2nd Half, 3 = ET 1, 4 = ET 2, 5 = Shootout
  periodName: string; // '1st Half', '2nd Half', 'ET 1', 'ET 2', 'Shootout'
  matchTimeDisplay: string; // e.g. "23:45", "45+2'", "89:12", "90+4'"
  matchTimeSeconds: number; // Total match seconds or period elapsed
  teamId: string;
  teamName: string;
  eventType: FootballEventType;
  playerId?: string;
  playerName?: string;
  assistPlayerId?: string;
  assistPlayerName?: string;
  goalType?: FootballGoalType;
  cardType?: FootballCardType;
  cardReason?: string;
  playerOutId?: string;
  playerOutName?: string;
  playerInId?: string;
  playerInName?: string;
  penaltyOutcome?: FootballPenaltyOutcome;
  penaltyReason?: string;
  shootoutOutcome?: FootballShootoutOutcome;
  shootoutRound?: number;
  shootoutAttemptNumber?: number; // 1 (Team A) or 2 (Team B)
  isUndone?: boolean;
  isEdited?: boolean;
  metadata?: Record<string, any>;
  scoreA_before?: number;
  scoreB_before?: number;
  scoreA_after?: number;
  scoreB_after?: number;
  timestamp: string;
  notes?: string;
  createdBy?: string;
}

export interface FootballPlayerStats {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  role: string; // 'Goalkeeper', 'Defender', 'Midfielder', 'Forward'
  jerseyNumber?: string | number;
  isCaptain?: boolean;
  isViceCaptain?: boolean;
  isStartingXI?: boolean;
  isSub?: boolean;
  isSentOff?: boolean;
  goals: number;
  assists: number;
  ownGoals: number;
  shots: number;
  shotsOnTarget: number;
  passes?: number;
  yellowCards: number;
  isSecondYellow: boolean;
  redCards: number;
  fouls: number;
  offsides: number;
  cornersTaken: number;
  penaltiesScored: number;
  penaltiesMissed: number;
  penaltiesSaved: number;
  minutesPlayed?: number;
  saves: number; // For Goalkeepers
  goalsConceded: number;
  cleanSheet: boolean;
  shootoutGoalsScored: number;
  shootoutGoalsMissed: number;
  shootoutSaves: number;
}

export interface FootballTeamStats {
  teamId: string;
  teamName: string;
  goals: number;
  openPlayGoals: number;
  penaltyGoals: number;
  freeKickGoals: number;
  ownGoalsConceded: number;
  corners: number;
  shots: number;
  shotsOnTarget: number;
  possessionPercentage: number;
  fouls: number;
  offsides: number;
  yellowCards: number;
  redCards: number;
  saves: number;
  cleanSheet: boolean;
  substitutionsCount: number;
  maxSubstitutions: number;
  shootoutScore: number;
  shootoutAttempts: number;
}

export interface FootballPeriodScore {
  period: number;
  periodName: string; // '1st Half', '2nd Half', 'ET 1', 'ET 2', 'Shootout'
  teamAScore: number;
  teamBScore: number;
  teamACorners: number;
  teamBCorners: number;
}

export interface FootballSubstitution {
  id: string;
  matchId: string;
  period: number;
  periodName: string;
  matchTimeDisplay: string;
  matchTimeSeconds: number;
  teamId: string;
  teamName: string;
  playerOutId: string;
  playerOutName: string;
  playerInId: string;
  playerInName: string;
  timestamp: string;
}

export interface FootballShootoutAttempt {
  id: string;
  matchId: string;
  roundNumber: number;
  attemptNumberInRound: number; // 1 or 2
  teamId: string;
  teamName: string;
  takerPlayerId: string;
  takerPlayerName: string;
  gkPlayerId?: string;
  gkPlayerName?: string;
  outcome: FootballShootoutOutcome;
  scoreA_after: number;
  scoreB_after: number;
  timestamp: string;
}

export interface FootballMatchClock {
  isRunning: boolean;
  elapsedSeconds: number; // Elapsed seconds within current period (e.g. 0 to 2700)
  period: number;
  periodDurationSeconds: number; // e.g. 2700 (45 min) or 900 (15 min)
  stoppageTimeMinutes: number; // e.g. 3 or 5
  lastStartedAt?: string;
  updatedAt?: string;
}

export interface FootballMatchScoringState {
  match: Match;
  sport: 'FOOTBALL';
  status: MatchStatus;
  currentPeriod: number; // 1..5
  currentPeriodName: string; // '1st Half', '2nd Half', 'ET 1', 'ET 2', 'Shootout'
  periodStatus: 'NOT_STARTED' | 'FIRST_HALF' | 'HALF_TIME' | 'SECOND_HALF' | 'EXTRA_TIME_1' | 'EXTRA_TIME_BREAK' | 'EXTRA_TIME_2' | 'SHOOTOUT' | 'MATCH_COMPLETE';
  clock: FootballMatchClock;
  teamAScore: number;
  teamBScore: number;
  scoreA?: number;
  scoreB?: number;
  halfTimeScore: { teamA: number; teamB: number };
  fullTimeScore: { teamA: number; teamB: number };
  extraTimeScore?: { teamA: number; teamB: number };
  shootoutScore?: { teamA: number; teamB: number };
  periodScores: FootballPeriodScore[];
  activeStartingXI_A: string[];
  activeStartingXI_B: string[];
  sentOffPlayerIds: string[];
  activePlayerCountA: number;
  activePlayerCountB: number;
  formationA?: string;
  formationB?: string;
  playerStats: FootballPlayerStats[];
  teamAStats: FootballTeamStats;
  teamBStats: FootballTeamStats;
  events: FootballScoringEvent[];
  lastEvent?: FootballScoringEvent;
  substitutions: FootballSubstitution[];
  shootoutAttempts: FootballShootoutAttempt[];
  shootoutScoreA: number;
  shootoutScoreB: number;
  isExtraTime: boolean;
  isShootout: boolean;
  isSuddenDeath: boolean;
  isMatchComplete: boolean;
  matchWinnerId?: string;
  matchResultText?: string;
}

export interface FootballMatchReport {
  match: Match;
  tournament?: Tournament;
  group?: Group;
  teamA?: Team;
  teamB?: Team;
  status: 'LIVE' | 'COMPLETED' | 'SCHEDULED' | 'DRAFT' | 'READY' | 'HALF_TIME' | 'EXTRA_TIME' | 'PENALTY_SHOOTOUT' | 'CANCELLED';
  isFinalized: boolean;
  finalizedAt?: string;
  finalizedBy?: string;
  matchResultText: string;
  winningTeamId?: string;
  winningMarginText?: string;
  periodScores: FootballPeriodScore[];
  halfTimeScore: { teamA: number; teamB: number };
  fullTimeScore: { teamA: number; teamB: number };
  extraTimeScore?: { teamA: number; teamB: number };
  shootoutScore?: { teamA: number; teamB: number };
  finalScore: { teamA: number; teamB: number };
  playerStats: FootballPlayerStats[];
  teamAStats: FootballTeamStats;
  teamBStats: FootballTeamStats;
  events: FootballScoringEvent[];
  goalTimeline: FootballScoringEvent[];
  cardsList: FootballScoringEvent[];
  substitutions: FootballSubstitution[];
  cornersList: FootballScoringEvent[];
  penaltiesList: FootballScoringEvent[];
  shootoutAttempts: FootballShootoutAttempt[];
  formations: {
    teamA?: string;
    teamB?: string;
  };
  suggestedPlayerOfMatch?: AwardCandidate;
  selectedPlayerOfMatch?: AwardCandidate;
  suggestedBestGoalkeeper?: AwardCandidate;
  selectedBestGoalkeeper?: AwardCandidate;
  suggestedBestDefender?: AwardCandidate;
  selectedBestDefender?: AwardCandidate;
  suggestedBestMidfielder?: AwardCandidate;
  selectedBestMidfielder?: AwardCandidate;
  suggestedBestForward?: AwardCandidate;
  selectedBestForward?: AwardCandidate;
  suggestedTopScorer?: AwardCandidate;
  selectedTopScorer?: AwardCandidate;
  squadsReport: {
    teamA: {
      team: Team;
      captain?: Player;
      viceCaptain?: Player;
      goalkeeper?: Player;
      startingEleven: Player[];
      substitutes: Player[];
      formation?: string;
    };
    teamB: {
      team: Team;
      captain?: Player;
      viceCaptain?: Player;
      goalkeeper?: Player;
      startingEleven: Player[];
      substitutes: Player[];
      formation?: string;
    };
  };
  officialsReport: {
    referee?: string;
    umpire?: string;
    scorer?: string;
    assistant?: string;
    commentator?: string;
  };
  sponsorsReport: {
    tournamentSponsor?: string;
    matchSponsor?: string;
  };
  summaryCards: {
    winnerName: string;
    finalScoreA: number;
    finalScoreB: number;
    halfTimeScoreText: string;
    fullTimeScoreText: string;
    totalCornersA: number;
    totalCornersB: number;
    totalCardsA: number;
    totalCardsB: number;
    topScorerText: string;
    bestGoalkeeperText: string;
    isShootout: boolean;
    shootoutResultText?: string;
  };
}

// ==========================================
// BASKETBALL LIVE SCORING ENGINE TYPES
// ==========================================

export type BasketballPosition =
  | 'POINT_GUARD'
  | 'SHOOTING_GUARD'
  | 'SMALL_FORWARD'
  | 'POWER_FORWARD'
  | 'CENTER'
  | 'PG'
  | 'SG'
  | 'SF'
  | 'PF'
  | 'C'
  | 'GUARD'
  | 'FORWARD'
  | 'BENCH'
  | 'OTHER';

export type BasketballEventType =
  | 'SCORE_1PT'
  | 'SCORE_2PT'
  | 'SCORE_3PT'
  | 'MISS_1PT'
  | 'MISS_2PT'
  | 'MISS_3PT'
  | 'REBOUND'
  | 'ASSIST'
  | 'STEAL'
  | 'BLOCK'
  | 'TURNOVER'
  | 'FOUL_PERSONAL'
  | 'FOUL_SHOOTING'
  | 'FOUL_OFFENSIVE'
  | 'FOUL_TECHNICAL'
  | 'FOUL_FLAGRANT'
  | 'FOUL_TEAM'
  | 'TIMEOUT'
  | 'SUBSTITUTION'
  | 'JUMP_BALL'
  | 'SHOT_CLOCK_VIOLATION'
  | 'PERIOD_END'
  | 'MATCH_END'
  | 'SCORE_CORRECTION';

export type BasketballShotType =
  | 'FREE_THROW'
  | '2PT_JUMP_SHOT'
  | '2PT_LAYUP'
  | '2PT_DUNK'
  | '3PT_JUMP_SHOT'
  | 'OTHER';

export type BasketballShotResult = 'MADE' | 'MISSED';

export type BasketballReboundType = 'OFFENSIVE' | 'DEFENSIVE';

export type BasketballTurnoverType =
  | 'BAD_PASS'
  | 'TRAVEL'
  | 'DOUBLE_DRIBBLE'
  | 'OFFENSIVE_FOUL'
  | 'SHOT_CLOCK'
  | 'OUT_OF_BOUNDS'
  | 'OTHER';

export type BasketballFoulType =
  | 'PERSONAL'
  | 'SHOOTING'
  | 'OFFENSIVE'
  | 'TECHNICAL'
  | 'FLAGRANT'
  | 'TEAM';

export interface BasketballScoringEvent {
  id: string;
  matchId: string;
  eventSequence: number;
  quarter: number; // 1, 2, 3, 4, 5 (OT1), 6 (OT2)...
  quarterType: 'REGULAR' | 'OVERTIME';
  quarterName: string; // 'Q1', 'Q2', 'Q3', 'Q4', 'OT1', etc.
  gameTimeDisplay: string; // '08:42'
  gameTimeRemainingSeconds: number;
  shotClockRemainingSeconds: number;
  teamId: string;
  teamName: string;
  eventType: BasketballEventType;
  pointsScored: number; // 0, 1, 2, 3
  playerId?: string;
  playerName?: string;
  playerNumber?: number | string;
  assistPlayerId?: string;
  assistPlayerName?: string;
  shotType?: BasketballShotType;
  shotResult?: BasketballShotResult;
  reboundType?: BasketballReboundType;
  turnoverType?: BasketballTurnoverType;
  foulType?: BasketballFoulType;
  freeThrowsAwarded?: number;
  playerInId?: string;
  playerInName?: string;
  playerOutId?: string;
  playerOutName?: string;
  timeoutType?: 'FULL' | '30_SEC' | 'OFFICIAL';
  possessionTeamId?: string;
  scoreA_after: number;
  scoreB_after: number;
  isUndone?: boolean;
  timestamp: string;
  notes?: string;
  createdBy?: string;
}

export interface BasketballMatchClock {
  matchId?: string;
  currentQuarter: number;
  quarterName: string;
  isClockRunning: boolean;
  isShotClockRunning: boolean;
  gameTimeRemainingSeconds: number;
  shotClockRemainingSeconds: number;
  quarterDurationSeconds: number;
  possessionTeamId?: string;
  lastUpdated?: string;
}

export interface BasketballPlayerStats {
  playerId: string;
  playerName: string;
  jerseyNumber?: number | string;
  teamId: string;
  teamName: string;
  isStarter: boolean;
  isCaptain: boolean;
  position?: string;
  isFouledOut: boolean;
  points: number;
  fgm: number; // 2pt + 3pt made
  fga: number; // 2pt + 3pt attempted
  fgPct: number;
  twoPm: number;
  twoPa: number;
  twoPct: number;
  threePm: number;
  threePa: number;
  threePct: number;
  ftm: number;
  fta: number;
  ftPct: number;
  orb: number; // offensive rebounds
  drb: number; // defensive rebounds
  trb: number; // total rebounds
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  personalFouls: number;
  technicalFouls: number;
  efficiency: number; // Standard NBA efficiency rating
  minutesPlayed?: number;
  twoPointersMade?: number;
  twoPointersAttempted?: number;
  threePointersMade?: number;
  threePointersAttempted?: number;
  freeThrowsMade?: number;
  freeThrowsAttempted?: number;
  totalRebounds?: number;
  offensiveRebounds?: number;
  defensiveRebounds?: number;
  fieldGoalsMade?: number;
  fieldGoalsAttempted?: number;
  fieldGoalPercentage?: number;
  threePointPercentage?: number;
  freeThrowPercentage?: number;
}

export interface BasketballTeamStats {
  teamId: string;
  teamName: string;
  points: number;
  fgm: number;
  fga: number;
  fgPct: number;
  twoPm: number;
  twoPa: number;
  twoPct: number;
  threePm: number;
  threePa: number;
  threePct: number;
  ftm: number;
  fta: number;
  ftPct: number;
  orb: number;
  drb: number;
  trb: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
  teamFoulsPerQuarter: Record<number, number>;
  timeoutsUsed: number;
  timeoutsRemaining: number;
  fieldGoalsMade?: number;
  fieldGoalsAttempted?: number;
  fieldGoalPercentage?: number;
  threePointersMade?: number;
  threePointersAttempted?: number;
  threePointPercentage?: number;
  freeThrowsMade?: number;
  freeThrowsAttempted?: number;
  freeThrowPercentage?: number;
  totalRebounds?: number;
  offensiveRebounds?: number;
  defensiveRebounds?: number;
  pointsOffTurnovers?: number;
  pointsInPaint?: number;
  fastBreakPoints?: number;
  secondChancePoints?: number;
  benchPoints?: number;
}

export interface BasketballPeriodScore {
  quarter: number;
  quarterName: string;
  quarterType: 'REGULAR' | 'OVERTIME';
  scoreA: number;
  scoreB: number;
  teamAScore?: number;
  teamBScore?: number;
  foulsA: number;
  foulsB: number;
}

export interface BasketballMatchScoringState {
  sport: 'BASKETBALL';
  match: Match;
  matchStatus?: any;
  rules?: any;
  clock: BasketballMatchClock;
  teamAScore: number;
  teamBScore: number;
  scoreA?: number;
  scoreB?: number;
  currentQuarter: number;
  quarterName: string;
  quarterType: 'REGULAR' | 'OVERTIME';
  isQuarterComplete: boolean;
  isHalfTime: boolean;
  isOvertime: boolean;
  isMatchComplete: boolean;
  winnerTeamId?: string;
  winnerTeamName?: string;
  winningMargin?: string;
  gameTimeRemainingSeconds: number;
  gameTimeDisplay: string;
  shotClockRemainingSeconds: number;
  isClockRunning: boolean;
  isShotClockRunning: boolean;
  possessionTeamId?: string;
  teamAFoulsThisQuarter: number;
  teamBFoulsThisQuarter: number;
  teamATimeoutsRemaining: number;
  teamBTimeoutsRemaining: number;
  teamA_inBonus: boolean;
  teamB_inBonus: boolean;
  periodScores: BasketballPeriodScore[];
  teamAStats: BasketballTeamStats;
  teamBStats: BasketballTeamStats;
  playerStats: BasketballPlayerStats[];
  teamAPlayers?: Player[];
  teamBPlayers?: Player[];
  activeOnCourtA: string[];
  activeOnCourtB: string[];
  fouledOutPlayers: string[];
  events: BasketballScoringEvent[];
  lastEvent?: BasketballScoringEvent;
}

export interface BasketballMatchReport {
  match: Match;
  matchId?: string;
  tournament?: Tournament;
  group?: Group;
  teamA?: Team;
  teamB?: Team;
  status: 'LIVE' | 'COMPLETED' | 'SCHEDULED' | 'DRAFT' | 'READY' | 'HALF_TIME' | 'OVERTIME' | 'CANCELLED';
  isFinalized: boolean;
  finalizedAt?: string;
  finalizedBy?: string;
  matchResultText: string;
  winningTeamId?: string;
  winningMarginText?: string;
  teamAScore?: number;
  teamBScore?: number;
  matchStatus?: string;
  resultText?: string;
  playByPlay?: any[];
  teamASquad?: any[];
  teamBSquad?: any[];
  periodScores: BasketballPeriodScore[];
  halfTimeScore: { teamA: number; teamB: number };
  regulationScore: { teamA: number; teamB: number };
  finalScore: { teamA: number; teamB: number };
  isOvertime: boolean;
  playerStats: BasketballPlayerStats[];
  teamAStats: BasketballTeamStats;
  teamBStats: BasketballTeamStats;
  events: BasketballScoringEvent[];
  pointsTimeline: BasketballScoringEvent[];
  foulsList: BasketballScoringEvent[];
  substitutions: BasketballScoringEvent[];
  timeoutsList: BasketballScoringEvent[];
  suggestedPlayerOfMatch?: AwardCandidate;
  selectedPlayerOfMatch?: AwardCandidate;
  suggestedBestScorer?: AwardCandidate;
  selectedBestScorer?: AwardCandidate;
  suggestedBestRebounder?: AwardCandidate;
  selectedBestRebounder?: AwardCandidate;
  suggestedBestPlaymaker?: AwardCandidate;
  selectedBestPlaymaker?: AwardCandidate;
  suggestedBestDefender?: AwardCandidate;
  selectedBestDefender?: AwardCandidate;
  suggestedBestThreePointShooter?: AwardCandidate;
  selectedBestThreePointShooter?: AwardCandidate;
  suggestedAwards?: {
    playerOfTheMatch?: AwardCandidate;
    bestScorer?: AwardCandidate;
    bestRebounder?: AwardCandidate;
    bestPlaymaker?: AwardCandidate;
    bestDefender?: AwardCandidate;
    bestThreePointShooter?: AwardCandidate;
  };
  selectedAwards?: {
    playerOfTheMatch?: AwardCandidate;
    bestScorer?: AwardCandidate;
    bestRebounder?: AwardCandidate;
    bestPlaymaker?: AwardCandidate;
    bestDefender?: AwardCandidate;
    bestThreePointShooter?: AwardCandidate;
  };
  squadsReport: {
    teamA: {
      team: Team;
      captain?: Player;
      startingFive: Player[];
      substitutes: Player[];
    };
    teamB: {
      team: Team;
      captain?: Player;
      startingFive: Player[];
      substitutes: Player[];
    };
  };
  officialsReport: {
    referee?: string;
    umpire?: string;
    scorer?: string;
    assistant?: string;
    commentator?: string;
  };
  sponsorsReport: {
    tournamentSponsor?: string;
    matchSponsor?: string;
  };
  summaryCards: {
    winnerName: string;
    finalScoreA: number;
    finalScoreB: number;
    halfTimeScoreText: string;
    topScorerText: string;
    topRebounderText: string;
    topAssisterText: string;
    isOvertime: boolean;
  };
}

// ==========================================
// TENNIS DATA STRUCTURES & INTERFACES
// ==========================================

export type TennisPointType =
  | 'REGULAR'
  | 'ACE'
  | 'DOUBLE_FAULT'
  | 'FIRST_SERVE_FAULT'
  | 'WINNER'
  | 'UNFORCED_ERROR'
  | 'SERVICE_WINNER'
  | 'FORCED_ERROR';

export interface TennisScoringEvent {
  id: string;
  matchId: string;
  pointNumber: number;
  setNumber: number;
  gameNumber: number;
  pointInGame: number;
  serverPlayerId: string;
  serverPlayerName: string;
  serverTeamId: string;
  receiverPlayerId: string;
  receiverPlayerName: string;
  receiverTeamId: string;
  pointWinner: 'TEAM_A' | 'TEAM_B';
  pointWinnerTeamId?: string;
  winningPlayerId?: string;
  winningPlayerName?: string;
  pointType: TennisPointType;
  strokeType?: TennisStrokeType | string;
  serveNumber?: number;
  rallyLength?: number;
  netPoint?: boolean;
  scoreAfterPointA?: string;
  scoreAfterPointB?: string;
  shotDetail?: string;
  isAce: boolean;
  isDoubleFault: boolean;
  isFirstServeFault: boolean;
  isWinner: boolean;
  isUnforcedError: boolean;
  isBreakPoint: boolean;
  isBreakPointConverted: boolean;
  isBreakPointSaved: boolean;
  isSetPoint: boolean;
  isSetPointConverted: boolean;
  isMatchPoint: boolean;
  isMatchPointConverted: boolean;
  isGamePoint: boolean;
  isTiebreak: boolean;
  isMatchTiebreak: boolean;
  scoreBefore: {
    setsA: number;
    setsB: number;
    gamesA: number;
    gamesB: number;
    pointsA: string;
    pointsB: string;
    tiebreakPointsA?: number;
    tiebreakPointsB?: number;
  };
  scoreAfter: {
    setsA: number;
    setsB: number;
    gamesA: number;
    gamesB: number;
    pointsA: string;
    pointsB: string;
    tiebreakPointsA?: number;
    tiebreakPointsB?: number;
  };
  gameWon: boolean;
  gameWinnerTeamId?: string;
  gameWinnerPlayerName?: string;
  setWon: boolean;
  setWinnerTeamId?: string;
  setWinnerPlayerName?: string;
  matchWon: boolean;
  matchWinnerTeamId?: string;
  matchWinnerPlayerName?: string;
  timestamp: string;
  isUndone?: boolean;
}

export interface TennisSetScore {
  setNumber: number;
  gamesA: number;
  gamesB: number;
  isTiebreak: boolean;
  isMatchTiebreak?: boolean;
  tiebreakScoreA?: number;
  tiebreakScoreB?: number;
  winnerTeamId?: string;
  isCompleted: boolean;
  durationMinutes?: number;
}

export interface TennisPlayerStats {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  isCaptain?: boolean;
  country?: string;
  ranking?: number | string;
  seed?: number | string;
  photoUrl?: string;
  aces: number;
  doubleFaults: number;
  firstServesIn: number;
  totalFirstServes: number;
  firstServePct: number;
  firstServePointsWon: number;
  firstServePointsTotal: number;
  firstServePointsWonPct: number;
  secondServePointsWon: number;
  secondServePointsTotal: number;
  secondServePointsWonPct: number;
  breakPointsWon: number;
  breakPointsTotal: number;
  breakPointsWonPct: number;
  breakPointsSaved: number;
  breakPointsFaced: number;
  breakPointsSavedPct: number;
  serviceGamesPlayed: number;
  serviceGamesWon: number;
  serviceGamesWonPct: number;
  returnGamesPlayed: number;
  returnGamesWon: number;
  returnGamesWonPct: number;
  winners: number;
  unforcedErrors: number;
  totalPointsWon: number;
  totalPointsPlayed: number;
  pointsWonPct: number;
  breakPointOpportunities?: number;
  firstServePercentage?: number;
  firstServePointsWonPercentage?: number;
  secondServePointsWonPercentage?: number;
  netPointsWon?: number;
  netPointsAttempted?: number;
}

export interface TennisMatchScoringState {
  sport: 'TENNIS';
  match: Match;
  currentSet: number;
  setsA: number;
  setsB: number;
  currentGamesA: number;
  currentGamesB: number;
  currentPointsA: string; // '0', '15', '30', '40', 'AD', or tiebreak string e.g. '6'
  currentPointsB: string;
  currentGameScoreA?: string;
  currentGameScoreB?: string;
  scoreA?: string;
  scoreB?: string;
  currentPointDisplayA: string;
  currentPointDisplayB: string;
  isDeuce: boolean;
  isAdvantageA: boolean;
  isAdvantageB: boolean;
  isTiebreak: boolean;
  isMatchTiebreak: boolean;
  servingTeamId: string;
  servingPlayerId: string;
  servingPlayerName: string;
  receivingTeamId: string;
  receivingPlayerId: string;
  receivingPlayerName: string;
  serverRotationIndex?: number;
  isFirstServeFaultActive: boolean;
  isBreakPoint: boolean;
  breakPointTeamId?: string;
  isSetPoint: boolean;
  setPointTeamId?: string;
  isMatchPoint: boolean;
  matchPointTeamId?: string;
  isGamePoint: boolean;
  gamePointTeamId?: string;
  setScores: TennisSetScore[];
  teamAStats: TennisPlayerStats;
  teamBStats: TennisPlayerStats;
  playerStats: TennisPlayerStats[];
  teamAPlayers?: Player[];
  teamBPlayers?: Player[];
  isMatchComplete: boolean;
  winnerTeamId?: string;
  winnerPlayerName?: string;
  matchResultText?: string;
  events: TennisScoringEvent[];
  lastEvent?: TennisScoringEvent;
  pointEvents?: any[];
  sets?: any[];
  currentServerTeamId?: string;
  currentServerPlayerId?: string;
  currentSetIndex?: number;
  matchWinnerTeamId?: string;
  setScoreTeamA?: number;
  setScoreTeamB?: number;
  currentGameTeamA?: number;
  currentGameTeamB?: number;
  pointsTeamA?: string | number;
  pointsTeamB?: string | number;
}

export type TennisPointEvent = TennisScoringEvent;
export type TennisStrokeType = 'FOREHAND' | 'BACKHAND' | 'SERVE' | 'VOLLEY' | 'OVERHEAD_SMASH' | 'DROP_SHOT' | 'LOB' | 'PASSING_SHOT' | 'OTHER';
export type TennisTeamStats = TennisPlayerStats;

export interface TennisMatchReport {

  match: Match;
  matchId?: string;
  tournament?: Tournament;
  group?: Group;
  teamA?: Team;
  teamB?: Team;
  status: 'LIVE' | 'COMPLETED' | 'SCHEDULED' | 'DRAFT' | 'READY' | 'CANCELLED';
  isFinalized: boolean;
  finalizedAt?: string;
  finalizedBy?: string;
  matchResultText: string;
  winnerName: string;
  winnerTeamId?: string;
  setScores: TennisSetScore[];
  finalSetScoreDisplay: string;
  playerStats: TennisPlayerStats[];
  teamAStats: TennisPlayerStats;
  teamBStats: TennisPlayerStats;
  pointTimeline: TennisScoringEvent[];
  gameTimeline: Array<{
    setNumber: number;
    gameNumber: number;
    winnerTeamId: string;
    serverPlayerName: string;
    scoreDisplay: string;
    isBreak: boolean;
    isTiebreak: boolean;
  }>;
  suggestedPlayerOfMatch?: AwardCandidate;
  selectedPlayerOfMatch?: AwardCandidate;
  suggestedBestServer?: AwardCandidate;
  selectedBestServer?: AwardCandidate;
  suggestedBestReturner?: AwardCandidate;
  selectedBestReturner?: AwardCandidate;
  suggestedBestPerformer?: AwardCandidate;
  selectedBestPerformer?: AwardCandidate;
  suggestedAwards?: {
    playerOfTheMatch?: AwardCandidate;
    bestServer?: AwardCandidate;
    bestReturner?: AwardCandidate;
    bestPerformer?: AwardCandidate;
  };
  selectedAwards?: {
    playerOfTheMatch?: AwardCandidate;
    bestServer?: AwardCandidate;
    bestReturner?: AwardCandidate;
    bestPerformer?: AwardCandidate;
  };
  squadsReport: {
    teamA: {
      team: Team;
      captain?: Player;
      players: Player[];
    };
    teamB: {
      team: Team;
      captain?: Player;
      players: Player[];
    };
  };
  officialsReport: MatchOfficials;
  sponsorsReport: MatchSponsors;
  summaryCards: {
    winnerName: string;
    finalSetsText: string;
    totalAces: number;
    totalDoubleFaults: number;
    totalBreakPointsConverted: number;
    topPerformerText: string;
    surfaceDisplay: string;
    courtDisplay: string;
  };
}

// ==========================================
// BADMINTON DATA STRUCTURES & INTERFACES
// ==========================================

export type BadmintonPointType =
  | 'RALLY_WON'
  | 'SMASH_WINNER'
  | 'DROP_SHOT_WINNER'
  | 'CLEAR_WINNER'
  | 'NET_WINNER'
  | 'SERVICE_ERROR'
  | 'NET_ERROR'
  | 'UNFORCED_ERROR'
  | 'ACE'
  | 'DROP_SHOT'
  | 'NET_KILL'
  | 'CLEAR'
  | 'DRIVE'
  | 'SERVICE_FAULT'
  | 'OUT_OF_BOUNDS';

export interface BadmintonShotDetail {
  stroke?: string;
  rallyLength?: number;
  shuttleSpeedKmh?: number;
}

export interface BadmintonScoringEvent {
  id: string;
  matchId: string;
  rallyNumber: number;
  gameNumber: number; // 1, 2, 3
  rallyInGame: number;
  serverPlayerId: string;
  serverPlayerName?: string;
  receiverPlayerId: string;
  receiverPlayerName?: string;
  servingTeam: 'TEAM_A' | 'TEAM_B';
  servingTeamId: string;
  receivingTeam: 'TEAM_A' | 'TEAM_B';
  receivingTeamId: string;
  winnerSide: 'TEAM_A' | 'TEAM_B';
  winnerTeamId?: string;
  winnerPlayerId?: string;
  winnerPlayerName?: string;
  eventType: BadmintonPointType | string;
  serviceCourt: BadmintonServiceCourt;
  shotDetail?: string;
  scoreBefore: {
    gamesA: number;
    gamesB: number;
    scoreA: number;
    scoreB: number;
  };
  scoreAfter: {
    gamesA: number;
    gamesB: number;
    scoreA: number;
    scoreB: number;
  };
  gameWon: boolean;
  gameWinnerTeamId?: string;
  gameWinnerPlayerName?: string;
  matchWon: boolean;
  matchWinnerTeamId?: string;
  matchWinnerPlayerName?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
  isUndone?: boolean;
}

export interface BadmintonGameScore {
  gameNumber: number;
  scoreA: number;
  scoreB: number;
  winnerSide?: 'TEAM_A' | 'TEAM_B';
  winnerTeamId?: string;
  isCompleted: boolean;
  durationMinutes?: number;
}

export interface BadmintonPlayerStats {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  isCaptain?: boolean;
  country?: string;
  photoUrl?: string;
  pointsWon: number;
  pointsServed: number;
  servicePointsWon: number;
  smashWinners: number;
  dropShotWinners: number;
  clearWinners: number;
  netWinners: number;
  aces: number;
  serviceErrors: number;
  netErrors: number;
  unforcedErrors: number;
  totalErrors: number;
  gamesPlayed: number;
  gamesWon: number;
}

export interface BadmintonMatchScoringState {
  sport: 'BADMINTON';
  match: Match;
  matchId: string;
  matchStatus: 'NOT_STARTED' | 'LIVE' | 'GAME_BREAK' | 'COMPLETED' | 'CANCELLED';
  currentGame: number; // 1, 2, 3
  currentScoreA: number;
  currentScoreB: number;
  currentSetScoreA?: number;
  currentSetScoreB?: number;
  scoreA?: number;
  scoreB?: number;
  gamesWonA: number;
  gamesWonB: number;
  gameScores: BadmintonGameScore[];
  servingTeam: 'TEAM_A' | 'TEAM_B';
  servingTeamId: string;
  servingPlayerId: string;
  servingPlayerName: string;
  receivingTeam: 'TEAM_A' | 'TEAM_B';
  receivingTeamId: string;
  receivingPlayerId: string;
  receivingPlayerName: string;
  serviceCourt: BadmintonServiceCourt;
  doublesPositions?: {
    teamA: {
      rightPlayerId: string;
      leftPlayerId: string;
    };
    teamB: {
      rightPlayerId: string;
      leftPlayerId: string;
    };
  };
  isGamePointA: boolean;
  isGamePointB: boolean;
  isMatchPointA: boolean;
  isMatchPointB: boolean;
  isCompleted: boolean;
  matchWinner?: 'TEAM_A' | 'TEAM_B';
  winnerTeamId?: string;
  winnerPlayerName?: string;
  matchResultText?: string;
  rallyNumber: number;
  events: BadmintonScoringEvent[];
  lastEvent?: BadmintonScoringEvent;
  playerStats?: BadmintonPlayerStats[];
  teamAPlayers?: Player[];
  teamBPlayers?: Player[];
  teamAName?: string;
  teamBName?: string;
  teamARightPlayerId?: string;
  teamALeftPlayerId?: string;
  teamBRightPlayerId?: string;
  teamBLeftPlayerId?: string;
  isInterval?: boolean;
  isGamePoint?: boolean;
  isMatchPoint?: boolean;
  isSuddenDeath?: boolean;
  teamAStats?: any;
  teamBStats?: any;
  config?: BadmintonMatchConfig;
}

export interface BadmintonPlayerExtendedStats {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  isCaptain?: boolean;
  country?: string;
  photoUrl?: string;

  // Games and match totals
  matchesPlayed: number;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;

  // Points
  pointsWon: number;
  pointsLost: number;
  totalPointsPlayed: number;
  pointWinPct: number;

  // Winners Breakdown
  smashWinners: number;
  dropShotWinners: number;
  netWinners: number;
  clearWinners: number;
  driveWinners: number;
  aces: number;
  totalWinners: number;
  winnerPct: number;

  // Errors Breakdown
  serviceFaults: number;
  unforcedErrors: number;
  netErrors: number;
  totalErrors: number;
  errorPct: number;

  // Server Stats
  servicePointsServed: number;
  servicePointsWon: number;
  servicePointsLost: number;
  serviceWinPct: number;
  rightCourtPointsWon: number;
  leftCourtPointsWon: number;

  // Return Stats
  returnPointsReceived: number;
  returnPointsWon: number;
  returnPointsLost: number;
  returnWinPct: number;
  returnSuccessPct: number;

  // Performance Index
  performanceIndex: number;
  performanceFactors: {
    pointsWonFactor: number;
    gameWinsFactor: number;
    matchWinFactor: number;
    winnersFactor: number;
    smashBonus: number;
    netKillBonus: number;
    aceBonus: number;
    errorPenalty: number;
    serviceFaultPenalty: number;
  };
}

export interface BadmintonTeamStats {
  teamId: string;
  teamName: string;
  gamesWon: number;
  gamesLost: number;
  totalPointsWon: number;
  totalPointsLost: number;
  pointWinPct: number;
  totalWinners: number;
  smashWinners: number;
  dropShotWinners: number;
  netWinners: number;
  clearWinners: number;
  driveWinners: number;
  aces: number;
  serviceFaults: number;
  unforcedErrors: number;
  totalErrors: number;
  servicePointsWon: number;
  servicePointsTotal: number;
  serviceWinPct: number;
  returnPointsWon: number;
  returnPointsTotal: number;
  returnWinPct: number;
  maxPointsStreak: number;
  rightCourtPointsWon: number;
  leftCourtPointsWon: number;
}

export interface BadmintonGameDetail {
  gameNumber: number;
  scoreA: number;
  scoreB: number;
  winnerSide?: 'TEAM_A' | 'TEAM_B';
  winnerTeamId?: string;
  winnerTeamName?: string;
  isCompleted: boolean;
  startingServerId?: string;
  startingServerName?: string;
  startingServerTeamId?: string;
  endingServerId?: string;
  endingServerName?: string;
  endingServerTeamId?: string;
  totalRallies: number;
  longestRally?: number;
  shortestRally?: number;
  averageRallyLength?: number;
  intervalScore?: {
    leadTeamId: string;
    leadTeamName: string;
    scoreA: number;
    scoreB: number;
  };
  gamePointCountA: number;
  gamePointCountB: number;
  durationMinutes?: number;
}

export interface BadmintonRallyAnalytics {
  totalRallies: number;
  longestRallyShots: number;
  shortestRallyShots: number;
  averageRallyShots: number;
  shotTypeDistribution: {
    type: string;
    count: number;
    percentage: number;
  }[];
  winnersByShotType: {
    type: string;
    countTeamA: number;
    countTeamB: number;
    total: number;
  }[];
  errorsByShotType: {
    type: string;
    countTeamA: number;
    countTeamB: number;
    total: number;
  }[];
}

export interface BadmintonMatchReport {
  match: Match;
  matchId: string;
  sport: 'BADMINTON';
  tournament?: Tournament;
  group?: Group;
  teamA: Team;
  teamB: Team;
  teamAPlayers: Player[];
  teamBPlayers: Player[];
  matchType: 'SINGLES' | 'DOUBLES';
  format: 'BEST_OF_1' | 'BEST_OF_3' | 'BEST_OF_5';
  status: 'NOT_STARTED' | 'LIVE' | 'GAME_BREAK' | 'COMPLETED' | 'CANCELLED';
  isFinalized: boolean;
  finalizedAt?: string;
  finalizedBy?: string;
  matchResultText: string;
  winnerName: string;
  winnerTeamId?: string;
  gamesWonA: number;
  gamesWonB: number;
  totalGames: number;
  gameScoresDisplay: string;
  gameScores: BadmintonGameScore[];
  gameDetails: BadmintonGameDetail[];
  events: BadmintonScoringEvent[];
  playerStats: BadmintonPlayerExtendedStats[];
  teamAStats: BadmintonTeamStats;
  teamBStats: BadmintonTeamStats;
  rallyAnalytics: BadmintonRallyAnalytics;
  suggestedPlayerOfMatch?: AwardCandidate;
  selectedPlayerOfMatch?: AwardCandidate;
  suggestedBestAttacker?: AwardCandidate;
  selectedBestAttacker?: AwardCandidate;
  suggestedBestServer?: AwardCandidate;
  selectedBestServer?: AwardCandidate;
  suggestedBestReturner?: AwardCandidate;
  selectedBestReturner?: AwardCandidate;
  suggestedBestDefender?: AwardCandidate;
  selectedBestDefender?: AwardCandidate;
  suggestedBestPerformer?: AwardCandidate;
  selectedBestPerformer?: AwardCandidate;
  suggestedAwards?: {
    playerOfTheMatch?: AwardCandidate;
    bestAttacker?: AwardCandidate;
    bestServer?: AwardCandidate;
    bestReturner?: AwardCandidate;
    bestDefender?: AwardCandidate;
    bestPerformer?: AwardCandidate;
  };
  selectedAwards?: {
    playerOfTheMatch?: AwardCandidate;
    bestAttacker?: AwardCandidate;
    bestServer?: AwardCandidate;
    bestReturner?: AwardCandidate;
    bestDefender?: AwardCandidate;
    bestPerformer?: AwardCandidate;
  };
  squadsReport: {
    teamA: {
      team: Team;
      captain?: Player;
      players: Player[];
    };
    teamB: {
      team: Team;
      captain?: Player;
      players: Player[];
    };
  };
  validation: {
    isValid: boolean;
    issues: string[];
    warnings: string[];
    isScoreConsistentWithEvents: boolean;
    isCompleted: boolean;
    hasWinner: boolean;
  };
  officialsReport?: Record<string, string>;
  sponsorsReport?: Record<string, string>;
  summaryCards: {
    winnerName: string;
    finalScoreDisplay: string;
    totalRallies: number;
    totalSmashes: number;
    longestRally: number;
    topPerformerText: string;
    venueCourtDisplay: string;
  };
}

// ==========================================
// TABLE TENNIS DATA STRUCTURES & INTERFACES
// ==========================================

export type TableTennisPointType =
  | 'POINT_WON'
  | 'FOREHAND_WINNER'
  | 'BACKHAND_WINNER'
  | 'SMASH_WINNER'
  | 'LOOP_WINNER'
  | 'FLICK_WINNER'
  | 'CHOP_WINNER'
  | 'SERVICE_ACE'
  | 'SERVICE_ERROR'
  | 'ACE'
  | 'SERVICE_FAULT'
  | 'NET_POINT'
  | 'EDGE_POINT'
  | 'NET_EDGE_BALL'
  | 'WINNER'
  | 'FORCED_ERROR'
  | 'UNFORCED_ERROR'
  | 'LET'
  | 'TIMEOUT'
  | 'END_CHANGE'
  | 'GAME_POINT'
  | 'MATCH_POINT';

export interface TableTennisShotDetail {
  stroke?: string;
  rallyLength?: number;
  placement?: string;
  spinType?: string;
}

export interface TableTennisScoringEvent {
  id: string;
  matchId: string;
  gameNumber: number; // 1, 2, 3, 4, 5, 6, 7
  rallyNumber: number; // overall match rally number
  rallyInGame: number;
  serverPlayerId: string;
  serverPlayerName?: string;
  receiverPlayerId: string;
  receiverPlayerName?: string;
  serverTeamId: string;
  receiverTeamId: string;
  pointWinner: 'TEAM_A' | 'TEAM_B';
  pointWinnerPlayerId?: string;
  pointWinnerPlayerName?: string;
  pointType: TableTennisPointType | string;
  shotDetail?: string;
  scoreBefore: {
    gamesA: number;
    gamesB: number;
    scoreA: number;
    scoreB: number;
  };
  scoreAfter: {
    gamesA: number;
    gamesB: number;
    scoreA: number;
    scoreB: number;
  };
  gameWon: boolean;
  gameWinnerTeamId?: string;
  gameWinnerPlayerName?: string;
  matchWon: boolean;
  matchWinnerTeamId?: string;
  matchWinnerPlayerName?: string;
  isEndChange?: boolean;
  isTimeout?: boolean;
  timeoutTeamId?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
  isUndone?: boolean;
  type?: string;
  isGamePoint?: boolean;
  isMatchPoint?: boolean;
  isDeuce?: boolean;
  winnerTeamId?: string;
  winnerPlayerId?: string;
  teamAScore?: number;
  teamBScore?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TableTennisGameScore {
  gameNumber: number;
  scoreA: number;
  scoreB: number;
  teamAPoints?: number;
  teamBPoints?: number;
  winnerSide?: 'TEAM_A' | 'TEAM_B';
  winnerTeamId?: string;
  winnerTeamName?: string;
  isCompleted: boolean;
  durationMinutes?: number;
}

export interface TableTennisPlayerStats {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  isCaptain?: boolean;
  country?: string;
  photoUrl?: string;
  pointsWon: number;
  pointsServed: number;
  servicePointsWon: number;
  aces: number;
  winners: number;
  edgePoints: number;
  netPoints: number;
  serviceFaults: number;
  unforcedErrors: number;
  forcedErrors: number;
  totalErrors: number;
  gamesPlayed: number;
  gamesWon: number;
}

export interface TableTennisMatchScoringState {
  sport: 'TABLE_TENNIS';
  match: Match;
  matchId: string;
  matchStatus: 'NOT_STARTED' | 'LIVE' | 'GAME_BREAK' | 'COMPLETED' | 'CANCELLED';
  currentGame: number | any; // 1..7 or { teamAPoints, teamBPoints, isEndChanged }
  currentGameNumber?: number;
  currentScoreA: number;
  currentScoreB: number;
  currentSetScoreA?: number;
  currentSetScoreB?: number;
  scoreA?: number;
  scoreB?: number;
  gamesWonA: number;
  gamesWonB: number;
  gameScores: TableTennisGameScore[];
  completedGames?: TableTennisGameScore[];
  servingTeam: 'TEAM_A' | 'TEAM_B';
  servingTeamId: string;
  servingPlayerId: string;
  servingPlayerName: string;
  receivingTeam: 'TEAM_A' | 'TEAM_B';
  receivingTeamId: string;
  receivingPlayerId: string;
  receivingPlayerName: string;
  currentServerTeamId?: string;
  currentServerPlayerId?: string;
  currentReceiverPlayerId?: string;
  serviceCountInRotation: number; // 1 or 2
  servesRemainingInCycle?: number;
  isDeuce: boolean;
  isGamePointA: boolean;
  isGamePointB: boolean;
  isGamePoint?: boolean;
  isMatchPointA: boolean;
  isMatchPointB: boolean;
  isMatchPoint?: boolean;
  isDecidingGame: boolean;
  isEndChange: boolean;
  decidingGameEndChangeCompleted: boolean;
  timeoutsTakenA: number;
  timeoutsTakenB: number;
  isTimeoutActive: boolean;
  timeoutRemainingSeconds?: number;
  isCompleted: boolean;
  isMatchOver?: boolean;
  matchWinner?: 'TEAM_A' | 'TEAM_B';
  winnerTeamId?: string;
  winnerPlayerName?: string;
  matchResultText?: string;
  rallyNumber: number;
  events: TableTennisScoringEvent[];
  lastEvent?: TableTennisScoringEvent;
  playerStats?: TableTennisPlayerStats[];
  statsA?: any;
  statsB?: any;
  teamAPlayers?: Player[];
  teamBPlayers?: Player[];
  teamAName?: string;
  teamBName?: string;
  doublesOrder?: {
    teamAPlayer1Id?: string;
    teamAPlayer2Id?: string;
    teamBPlayer1Id?: string;
    teamBPlayer2Id?: string;
    rotationSequence?: string[];
  };
  config?: TableTennisMatchConfig;
}

export interface TableTennisGameDetail {
  gameNumber: number;
  scoreA: number;
  scoreB: number;
  winnerSide?: 'TEAM_A' | 'TEAM_B';
  winnerTeamId?: string;
  winnerTeamName?: string;
  isCompleted: boolean;
  isDecidingGame: boolean;
  endChangeOccurred: boolean;
  totalRallies: number;
  startingServerId?: string;
  startingServerName?: string;
  startingReceiverId?: string;
  startingReceiverName?: string;
  endingServerId?: string;
  endingServerName?: string;
  deuceReached: boolean;
  deucePointsA: number;
  deucePointsB: number;
  gamePointsCreatedA: number;
  gamePointsCreatedB: number;
  durationMinutes?: number;
}

export interface TableTennisServingStats {
  totalServicePoints: number;
  servicePointsWon: number;
  servicePointsLost: number;
  serviceWinPercentage: number;
  aces: number;
  serviceFaults: number;
  serviceWinners: number;
  serviceErrors: number;
  normalServicePoints: number;
  normalServiceWon: number;
  deuceServicePoints: number;
  deuceServicePointsWon: number;
  deuceServiceWinPercentage: number;
}

export interface TableTennisReturnStats {
  returnPoints: number;
  returnPointsWon: number;
  returnPointsLost: number;
  returnWinPercentage: number;
  returnWinners: number;
  returnErrors: number;
  forcedReturnErrors: number;
  unforcedReturnErrors: number;
}

export interface TableTennisDeuceStats {
  gamesReachingDeuce: number;
  deuceGamesWon: number;
  deuceGamesLost: number;
  deuceGameWinPercentage: number;
  pointsWonAfterDeuce: number;
  pointsLostAfterDeuce: number;
  pointsWinPercentageAfterDeuce: number;
}

export interface TableTennisGamePointStats {
  gamePointsCreated: number;
  gamePointsConverted: number;
  gamePointsSaved: number;
  gamePointsFaced: number;
  gamePointConversionPercentage: number;
}

export interface TableTennisMatchPointStats {
  matchPointsCreated: number;
  matchPointsConverted: number;
  matchPointsSaved: number;
  matchPointsFaced: number;
  matchPointConversionPercentage: number;
}

export interface TableTennisPlayerExtendedStats extends TableTennisPlayerStats {
  matches: number;
  pointsPlayed: number;
  gamesLost: number;
  gameWinPercentage: number;
  pointsLost: number;
  pointWinPercentage: number;
  smashWinners: number;
  forehandWinners: number;
  backhandWinners: number;
  loops: number;
  chops: number;
  netWinners: number;
  edgePoints: number;
  serving: TableTennisServingStats;
  returning: TableTennisReturnStats;
  deuce: TableTennisDeuceStats;
  gamePoints: TableTennisGamePointStats;
  matchPoints: TableTennisMatchPointStats;
  performanceIndex: number;
  doublesContribution?: {
    servicePoints: number;
    returnPoints: number;
    pointsContributed: number;
    winners: number;
    errors: number;
    aces: number;
    smashes: number;
  };
}

export interface TableTennisTeamStats {
  teamId: string;
  teamName: string;
  gamesWon: number;
  pointsWon: number;
  totalPoints: number;
  aces: number;
  winners: number;
  smashWinners: number;
  forehandWinners: number;
  backhandWinners: number;
  loopWinners: number;
  chopWinners: number;
  netEdgeWinners: number;
  serviceFaults: number;
  unforcedErrors: number;
  forcedErrors: number;
  servicePointsPlayed: number;
  servicePointsWon: number;
  serviceWinPercentage: number;
  returnPointsPlayed: number;
  returnPointsWon: number;
  returnWinPercentage: number;
  deuceGamesPlayed: number;
  deuceGamesWon: number;
  gamePointsCreated: number;
  gamePointsConverted: number;
  matchPointsCreated: number;
  matchPointsConverted: number;
  timeoutsTaken: number;
}

export interface TableTennisKeyMoment {
  id: string;
  rallyNumber: number;
  gameNumber: number;
  type: 'FIRST_POINT' | 'FIRST_LEAD' | 'LARGEST_LEAD' | 'DEUCE_10_10' | 'GAME_POINT' | 'GAME_WON' | 'MATCH_POINT' | 'MATCH_WON' | 'COMEBACK' | 'LONGEST_RALLY' | 'TIMEOUT';
  title: string;
  description: string;
  scoreDisplay: string;
  timestamp: string;
}

export interface TableTennisDoublesSequenceStep {
  pointNumber: number;
  gameNumber: number;
  serverPlayerId: string;
  serverPlayerName: string;
  receiverPlayerId: string;
  receiverPlayerName: string;
  serverTeamId: string;
  receiverTeamId: string;
  sequenceNotation: string;
  winnerSide: 'TEAM_A' | 'TEAM_B';
  pointType: string;
}

export interface TableTennisRallyAnalytics {
  totalRallies: number;
  longestRallyShots: number;
  shortestRallyShots: number;
  averageRallyShots: number;
  shotTypeDistribution: {
    type: string;
    count: number;
    percentage: number;
  }[];
  winnersByShotType: {
    type: string;
    countTeamA: number;
    countTeamB: number;
    total: number;
  }[];
  errorsByShotType: {
    type: string;
    countTeamA: number;
    countTeamB: number;
    total: number;
  }[];
}

export interface TableTennisMatchReport {
  match: Match;
  matchId: string;
  sport: 'TABLE_TENNIS';
  tournament?: Tournament;
  group?: Group;
  teamA: Team;
  teamB: Team;
  teamAPlayers: Player[];
  teamBPlayers: Player[];
  matchType: 'SINGLES' | 'DOUBLES';
  format: 'BEST_OF_1' | 'BEST_OF_3' | 'BEST_OF_5' | 'BEST_OF_7';
  status: 'NOT_STARTED' | 'LIVE' | 'GAME_BREAK' | 'COMPLETED' | 'CANCELLED';
  isFinalized: boolean;
  finalizedAt?: string;
  finalizedBy?: string;
  matchResultText: string;
  winnerName: string;
  winnerTeamId?: string;
  gamesWonA: number;
  gamesWonB: number;
  totalGames: number;
  gameScoresDisplay: string;
  gameScores: TableTennisGameScore[];
  gameDetails: TableTennisGameDetail[];
  events: TableTennisScoringEvent[];
  playerStats: TableTennisPlayerExtendedStats[];
  teamAStats: TableTennisTeamStats;
  teamBStats: TableTennisTeamStats;
  keyMoments: TableTennisKeyMoment[];
  doublesSequence: TableTennisDoublesSequenceStep[];
  rallyAnalytics: TableTennisRallyAnalytics;
  suggestedPlayerOfMatch?: AwardCandidate;
  selectedPlayerOfMatch?: AwardCandidate;
  suggestedBestServer?: AwardCandidate;
  selectedBestServer?: AwardCandidate;
  suggestedBestReturner?: AwardCandidate;
  selectedBestReturner?: AwardCandidate;
  suggestedBestAttacker?: AwardCandidate;
  selectedBestAttacker?: AwardCandidate;
  suggestedBestDefender?: AwardCandidate;
  selectedBestDefender?: AwardCandidate;
  suggestedBestPerformer?: AwardCandidate;
  selectedBestPerformer?: AwardCandidate;
  suggestedBestDoublesPlayer?: AwardCandidate;
  selectedBestDoublesPlayer?: AwardCandidate;
  suggestedMostAces?: AwardCandidate;
  selectedMostAces?: AwardCandidate;
  suggestedMostWinners?: AwardCandidate;
  selectedMostWinners?: AwardCandidate;
  suggestedMostConsistent?: AwardCandidate;
  selectedMostConsistent?: AwardCandidate;
  suggestedAwards?: {
    playerOfTheMatch?: AwardCandidate;
    bestServer?: AwardCandidate;
    bestReturner?: AwardCandidate;
    bestAttacker?: AwardCandidate;
    bestDefender?: AwardCandidate;
    bestPerformer?: AwardCandidate;
    bestDoublesPlayer?: AwardCandidate;
    mostAces?: AwardCandidate;
    mostWinners?: AwardCandidate;
    mostConsistent?: AwardCandidate;
  };
  selectedAwards?: {
    playerOfTheMatch?: AwardCandidate;
    bestServer?: AwardCandidate;
    bestReturner?: AwardCandidate;
    bestAttacker?: AwardCandidate;
    bestDefender?: AwardCandidate;
    bestPerformer?: AwardCandidate;
    bestDoublesPlayer?: AwardCandidate;
    mostAces?: AwardCandidate;
    mostWinners?: AwardCandidate;
    mostConsistent?: AwardCandidate;
  };
  squadsReport: {
    teamA: {
      team: Team;
      captain?: Player;
      players: Player[];
    };
    teamB: {
      team: Team;
      captain?: Player;
      players: Player[];
    };
  };
  validation: {
    isValid: boolean;
    issues: string[];
    warnings: string[];
    isScoreConsistentWithEvents: boolean;
    isCompleted: boolean;
    hasWinner: boolean;
    hasValidServiceState: boolean;
  };
  officialsReport?: Record<string, string>;
  sponsorsReport?: Record<string, string>;
  summaryCards: {
    winnerName: string;
    finalScoreDisplay: string;
    totalRallies: number;
    totalWinners: number;
    totalAces: number;
    longestRally: number;
    topPerformerText: string;
    venueTableDisplay: string;
  };
}

// ==========================================
// GENERIC / CUSTOM SPORT ENGINE TYPES
// ==========================================

export type CustomSportMatchPeriodType =
  | 'PERIODS'
  | 'SETS'
  | 'ROUNDS'
  | 'HALVES'
  | 'QUARTERS'
  | 'FRAMES'
  | 'INNINGS'
  | 'CONTINUOUS'
  | 'POINTS_ONLY';

export type CustomSportCategory = 'TEAM' | 'INDIVIDUAL' | 'DOUBLES' | 'MULTI_TEAM' | 'COMBAT' | 'TARGET' | 'RACQUET';

export type CustomEventGraphicType =
  | 'BANNER'
  | 'CENTER_POPUP'
  | 'LOWER_THIRD'
  | 'FULLSCREEN_ALERT'
  | 'BADGE'
  | 'SUBTLE'
  | 'NONE';

export type CustomPlayerAttributionMode = 'REQUIRED' | 'OPTIONAL' | 'DISABLED';
export type CustomTeamAttributionMode = 'REQUIRED' | 'AUTOMATIC' | 'OPPONENT';

export interface CustomScoringEventDef {
  id: string;
  name: string;
  shortName: string;
  points: number;
  icon: string;
  graphicType: CustomEventGraphicType;
  playerAttribution: CustomPlayerAttributionMode;
  teamAttribution: CustomTeamAttributionMode;
  trackStatistics: boolean;
  triggerBroadcast: boolean;
  undoAllowed: boolean;
  color: string;
  description?: string;
  isDefault?: boolean;
}

export interface CustomStatisticDef {
  id: string;
  name: string;
  shortCode: string;
  dataType: 'NUMBER' | 'PERCENTAGE' | 'DECIMAL';
  isPositive: boolean;
  visibleInConsole: boolean;
  visibleInBroadcast: boolean;
  visibleInReport: boolean;
  linkedEventIds?: string[];
}

export interface CustomAwardDef {
  id: string;
  name: string;
  shortCode: string;
  icon: string;
  description: string;
  criteriaStatId?: string;
  isAutoCalculated: boolean;
}

export interface CustomBroadcastPreset {
  id: string;
  name: string;
  description?: string;
  styleConfig: Partial<BroadcastStyleConfig>;
  eventDurations?: Partial<BroadcastEventDurations>;
}

export interface CustomSportTimeoutRules {
  maxTimeoutsPerPeriod: number;
  maxTimeoutsPerMatch: number;
  timeoutDurationSeconds: number;
}

export interface CustomSportSubstitutionRules {
  maxSubstitutionsPerMatch: number;
  maxSubstitutionsPerPeriod: number;
  rollingSubstitutions: boolean;
}

export interface CustomSportExtraTimeRules {
  enabled: boolean;
  durationMinutes: number;
  periodsCount: number;
  goldenGoal: boolean;
}

export interface CustomSportTieBreakRules {
  enabled: boolean;
  targetPoints?: number;
  winByTwo?: boolean;
}

export interface CustomSportShootoutRules {
  enabled: boolean;
  initialRounds: number;
  suddenDeath: boolean;
}

export interface CustomSport {
  id: string;
  name: string;
  shortCode: string;
  logoUrl?: string;
  icon: string;
  iconName?: string;
  description: string;
  sportCategory: CustomSportCategory;
  isIndoor: 'INDOOR' | 'OUTDOOR' | 'BOTH';
  matchType: CustomSportMatchPeriodType;
  totalPeriods: number;
  periodDurationMinutes: number;
  isClockCountdown: boolean;
  breakDurationMinutes: number;
  scoringSystem: 'POINTS' | 'GOALS' | 'RUNS' | 'SETS_AND_GAMES' | 'ROUNDS_AND_POINTS' | 'CUSTOM';
  targetScore?: number;
  winningMargin: number;
  maxScoreCap?: number;
  timeoutRules: CustomSportTimeoutRules;
  substitutionRules: CustomSportSubstitutionRules;
  extraTimeRules: CustomSportExtraTimeRules;
  tieBreakRules: CustomSportTieBreakRules;
  shootoutRules: CustomSportShootoutRules;
  officialsList: string[];
  playerRoles: string[];
  defaultPlayersPerTeam: number;
  scoringEvents: CustomScoringEventDef[];
  customStatistics: CustomStatisticDef[];
  customAwards: CustomAwardDef[];
  broadcastPresets?: CustomBroadcastPreset[];
  createdByUserId?: string;
  isPreset?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomScoringEvent {
  id: string;
  matchId: string;
  teamId: string;
  teamName: string;
  playerId?: string;
  playerName?: string;
  eventDefId: string;
  eventName: string;
  eventShortName: string;
  points: number;
  period: number;
  periodName: string;
  clockDisplay: string;
  clockSeconds: number;
  timestamp: string;
  description: string;
  scoreA_before: number;
  scoreB_before: number;
  scoreA_after: number;
  scoreB_after: number;
  periodScoresA_after?: number[];
  periodScoresB_after?: number[];
  metadata?: Record<string, any>;
  operatorId?: string;
  operatorName?: string;
  isUndone?: boolean;
  isEdited?: boolean;
}

export interface CustomMatchClock {
  running: boolean;
  secondsRemaining: number;
  elapsedSeconds: number;
  currentPeriod: number;
  periodName: string;
  isExtraTime: boolean;
  isShootout: boolean;
  isBreak: boolean;
  breakRemainingSeconds?: number;
}

export interface CustomPlayerStats {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  isCaptain?: boolean;
  role?: string;
  pointsTotal: number;
  eventsCount: number;
  stats: Record<string, number>;
  customStats?: any;
}

export interface CustomTeamStats {
  teamId: string;
  teamName: string;
  totalScore: number;
  periodScores: number[];
  timeoutsUsed: number;
  substitutionsUsed: number;
  foulsTotal: number;
  stats: Record<string, number>;
}

export interface CustomTimeoutRecord {
  id: string;
  matchId: string;
  teamId: string;
  teamName: string;
  period: number;
  matchClock: string;
  timestamp: string;
}

export interface CustomSubstitutionRecord {
  id: string;
  matchId: string;
  teamId: string;
  teamName: string;
  playerOutId?: string;
  playerOutName?: string;
  playerInId?: string;
  playerInName?: string;
  period: number;
  matchClock: string;
  timestamp: string;
}

export interface CustomMatchScoringState {
  sport: 'CUSTOM';
  match: Match;
  matchId: string;
  status: MatchStatus;
  customSport: CustomSport;
  customSportName: string;
  currentPeriod: number;
  currentPeriodName: string;
  totalPeriods: number;
  scoreA: number;
  scoreB: number;
  periodScoresA: number[];
  periodScoresB: number[];
  clock: CustomMatchClock;
  teamAStats: CustomTeamStats;
  teamBStats: CustomTeamStats;
  playerStats: CustomPlayerStats[];
  events: CustomScoringEvent[];
  lastEvent?: CustomScoringEvent;
  timeouts: CustomTimeoutRecord[];
  substitutions: CustomSubstitutionRecord[];
  isCompleted: boolean;
  isMatchComplete?: boolean;
  winnerSide?: 'TEAM_A' | 'TEAM_B' | 'DRAW';
  winnerTeamId?: string;
  winnerName?: string;
  matchResultText?: string;
}

export interface CustomSportAwardNomination {
  awardId: string;
  awardName: string;
  awardIcon: string;
  suggestedPlayer?: AwardCandidate;
  selectedPlayer?: AwardCandidate;
  citation?: string;
  recipientId?: string;
  recipientName?: string;
  reason?: string;
  name?: string;
  icon?: string;
  isOverridden?: boolean;
}

export interface CustomSportMatchReport {
  match: Match;
  matchId: string;
  sport: 'CUSTOM';
  customSport: CustomSport;
  tournament?: Tournament;
  group?: Group;
  teamA: Team;
  teamB: Team;
  teamAPlayers: Player[];
  teamBPlayers: Player[];
  status: MatchStatus;
  isFinalized: boolean;
  officials?: any;
  summary?: any;
  periodScores?: any;
  customStatistics?: any;
  timeline?: any;
  finalizedAt?: string;
  finalizedBy?: string;
  matchResultText: string;
  winnerName: string;
  winnerTeamId?: string;
  scoreA: number;
  scoreB: number;
  periodScoresA: number[];
  periodScoresB: number[];
  periodNames: string[];
  events: CustomScoringEvent[];
  playerStats: CustomPlayerStats[];
  teamAStats: CustomTeamStats;
  teamBStats: CustomTeamStats;
  timeouts: CustomTimeoutRecord[];
  substitutions: CustomSubstitutionRecord[];
  awards: CustomSportAwardNomination[];
  suggestedPlayerOfMatch?: AwardCandidate;
  selectedPlayerOfMatch?: AwardCandidate;
  squadsReport: {
    teamA: { team: Team; players: Player[] };
    teamB: { team: Team; players: Player[] };
  };
  officialsReport?: Record<string, string>;
  sponsorsReport?: Record<string, string>;
  validation: {
    isValid: boolean;
    issues: string[];
    warnings: string[];
    isScoreConsistentWithEvents: boolean;
    isCompleted: boolean;
    hasWinner: boolean;
  };
}

// =========================================================================
// UNIVERSAL LIVE GRAPHICS ASSIGNMENT, PLAYLIST & ON-AIR SCENE MANAGEMENT TYPES
// =========================================================================

export type AssignmentCategory = 'MATCH_STATUS' | 'LIVE_DATA' | 'EVENTS' | 'MILESTONES';

export type GraphicAssignmentStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'ASSIGNED'
  | 'UNASSIGNED'
  | 'ON_AIR'
  | 'QUEUED'
  | 'HOLD'
  | 'DISABLED';

export type GraphicAnimationTypeShort =
  | 'FADE'
  | 'SLIDE_UP'
  | 'SLIDE_DOWN'
  | 'SLIDE_LEFT'
  | 'SLIDE_RIGHT'
  | 'POP'
  | 'ZOOM'
  | 'FLIP';

export interface GraphicAssignment {
  id: string;
  sport: SportType;
  matchId?: string; // If set, overrides sport defaults for this match
  category: AssignmentCategory;
  targetId: string; // Event ID or status key, e.g. 'cricket_wicket', 'MATCH_INTRO', 'LIVE_SCOREBUG', 'football_goal'
  targetName: string;
  targetCategory?: string;
  triggerMode: TriggerMode;
  assignedGraphicId: string | null; // ID reference to StudioGraphic
  assignedGraphicName?: string;
  entryAnimation: GraphicAnimationTypeShort;
  exitAnimation: GraphicAnimationTypeShort;
  displayDuration: number; // Duration in seconds (0 = manual hold)
  priority: number; // 1 to 100 (e.g. WICKET = 90, SIX = 80, FOUR = 70, DOT = 20)
  conflictAction: 'INTERRUPT' | 'QUEUE_BEHIND' | 'REPLACE_QUEUED' | 'CANCEL';
  cooldownSeconds: number; // Cooldown to prevent duplicate spam
  enabled: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type BroadcastPriority = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';

export type PlaylistItemStatus = 'IDLE' | 'QUEUED' | 'PREVIEW' | 'ON_AIR' | 'COMPLETED' | 'SKIPPED' | 'CANCELLED' | 'ERROR';

export interface PlaylistItem {
  id: string;
  order: number;
  name: string;
  graphicId: string; // reference to StudioGraphic
  graphicName: string;
  enabled: boolean;
  duration: number; // in seconds (0 = hold until NEXT)
  transition?: string;
  notes?: string;
  status: PlaylistItemStatus;
  startedAt?: string;
  completedAt?: string;
  skippedAt?: string;
  errorMessage?: string;
}

export interface GraphicPlaylist {
  id: string;
  name: string;
  sport: SportType;
  matchId?: string;
  description?: string;
  loop?: boolean;
  items: PlaylistItem[];
  createdAt: string;
  updatedAt: string;
}

export type OnAirPlaylist = GraphicPlaylist;

export interface GraphicSceneLayer {
  id: string;
  name: string;
  graphicId: string; // reference to StudioGraphic
  graphicName: string;
  enabled: boolean;
  order: number; // Z-index
  opacity?: number;
  offsetX?: number; // relative to 1920x1080 canvas
  offsetY?: number;
  scale?: number;
}

export type SceneLayer = GraphicSceneLayer;

export interface GraphicScene {
  id: string;
  name: string; // e.g. 'PRE MATCH', 'LIVE SCOREBUG', 'WICKET', 'BOUNDARY', 'TIMEOUT', 'MATCH RESULT'
  sport: SportType;
  matchId?: string;
  description?: string;
  durationSeconds?: number;
  layers: GraphicSceneLayer[];
  createdAt: string;
  updatedAt: string;
}

export interface OnAirGraphicItem {
  id: string;
  sourceType: 'ASSIGNMENT' | 'PLAYLIST' | 'SCENE' | 'MANUAL' | 'CUSTOM' | 'SCOREBOARD' | 'EVENT' | string;
  sourceId: string;
  targetId?: string;
  eventName?: string;
  graphicId?: string;
  graphicName?: string;
  sceneId?: string;
  sceneName?: string;
  playlistId?: string;
  playlistItemId?: string;
  graphic?: StudioGraphic; // fully resolved with live data
  layers?: Array<{
    id: string;
    name: string;
    graphicId: string;
    graphic?: StudioGraphic;
    enabled?: boolean;
    order: number;
    opacity?: number;
    offsetX?: number;
    offsetY?: number;
    scale?: number;
  }>;
  entryAnimation?: string;
  exitAnimation?: string;
  triggeredAt: string;
  startedAt?: string;
  endsAt?: number; // epoch ms for accurate countdown across tab sleeps
  durationSeconds: number;
  remainingSeconds: number;
  isHeld: boolean;
  triggerSource: 'AUTO' | 'MANUAL';
  triggerMode: TriggerMode;
  priority: number;
  priorityLevel?: BroadcastPriority;
  conflictAction?: 'INTERRUPT' | 'QUEUE_BEHIND' | 'REPLACE_QUEUED' | 'CANCEL';
  broadcastEventId?: string;
  autoClear?: boolean;
}

export interface OnAirHistoryItem {
  id: string;
  graphicId?: string;
  graphicName: string;
  eventName: string;
  sourceType: string;
  priority: number;
  priorityLevel?: BroadcastPriority;
  triggeredAt: string;
  startedAt?: string;
  finishedAt?: string;
  status: 'ON_AIR' | 'QUEUED' | 'COMPLETED' | 'CANCELLED' | 'SKIPPED' | 'ERROR';
  durationSeconds: number;
  remainingSeconds?: number;
}

export interface BroadcastEventQueueItem {
  id: string;
  broadcastEventId: string;
  targetId: string;
  sport: SportType;
  title: string;
  priority: number;
  priorityLevel: BroadcastPriority;
  conflictAction: 'INTERRUPT' | 'QUEUE_BEHIND' | 'REPLACE_QUEUED' | 'CANCEL';
  enqueuedAt: string;
  source: 'AUTO' | 'MANUAL';
  payload?: any;
}

export interface BroadcastAuditLog {
  id: string;
  timestamp: string;
  action: string;
  matchId: string;
  graphicOrSceneName?: string;
  operatorName?: string;
  details?: string;
  result: 'SUCCESS' | 'FAILED';
}

export interface OnAirState {
  matchId: string;
  selectedMatchId?: string;
  selectedTournamentId?: string;
  connectionStatus?: 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'OFFLINE' | 'ERROR';
  currentOnAir: OnAirGraphicItem | null;
  previewGraphic: OnAirGraphicItem | null;
  programContent?: OnAirGraphicItem | null;
  previewContent?: OnAirGraphicItem | null;
  previewSceneId?: string | null;
  programSceneId?: string | null;
  activeGraphics?: OnAirGraphicItem[];
  recentHistory?: OnAirGraphicItem[];
  queue: OnAirGraphicItem[];
  queuedGraphics?: OnAirGraphicItem[];
  history?: OnAirHistoryItem[];
  completedGraphics?: OnAirHistoryItem[];
  activePlaylistId?: string | null;
  currentPlaylistItemIndex?: number;
  currentPlaylistId?: string | null;
  currentPlaylistItemId?: string | null;
  playlistStatus?: 'IDLE' | 'PLAYING' | 'PAUSED' | 'STOPPED' | 'ERROR';
  transportStatus?: 'IDLE' | 'ON_AIR' | 'HOLD' | 'TRANSITIONING';
  eventQueue?: BroadcastEventQueueItem[];
  currentEvent?: any;
  lastEvent?: any;
  currentGraphic?: OnAirGraphicItem | null;
  currentGraphicStartedAt?: string | null;
  currentGraphicEndsAt?: number | null;
  holdState?: boolean;
  holdActive?: boolean;
  replayState?: boolean;
  operatorLockState?: boolean;
  emergencyState?: boolean;
  remainingSeconds?: number;
  lastAction?: string;
  updatedAt: string;
  lastUpdatedAt?: string;
}

export interface GraphicAssignmentPreset {
  id: string;
  name: string;
  sport: SportType;
  description?: string;
  assignments: Omit<GraphicAssignment, 'id' | 'createdAt' | 'updatedAt'>[];
  createdAt: string;
}

export * from './auction';
