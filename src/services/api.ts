import {
  User,
  SystemStatus,
  AuditLog,
  Tournament,
  Group,
  Team,
  Player,
  Match,
  CricketMatchScoringState,
  VolleyballMatchScoringState,
  KabaddiMatchScoringState,
  FullMatchReport,
  VolleyballMatchReport,
  KabaddiMatchReport,
  HockeyMatchScoringState,
  HockeyMatchReport,
  FootballMatchScoringState,
  FootballMatchReport,
  BasketballMatchScoringState,
  BasketballMatchReport,
  TennisMatchScoringState,
  TennisMatchReport,
  BadmintonMatchScoringState,
  BadmintonMatchReport,
  TableTennisMatchScoringState,
  CustomSport,
  CustomScoringEvent,
  CustomMatchScoringState,
  CustomSportMatchReport,
  CustomTimeoutRecord,
  CustomSubstitutionRecord,
  BroadcastConfig,
  BroadcastPreset,
  GraphicsTemplate,
  TournamentGroupStandings,
  TournamentStandingRow,
  TournamentCompetitionConfig,
  TieBreakerRule,
  StandingsOverrideAuditLog,
  FixtureGenerationOptions,
  FixturePreviewResponse,
  FixtureConflictWarning,
  KnockoutBracket,
  ChampionshipSummary,
  TournamentStatisticsSummary,
  TournamentAwardItem,
  TournamentAwardAuditLog,
  TournamentRecordDetail,
  TournamentHallOfFameData,
  TournamentPresentationEvent,
  TournamentDashboardData,
  TournamentTeamFormItem,
  TournamentPlayerProfileData,
  TournamentTeamProfileData,
  TournamentPerformanceIndexItem,
  TournamentRecordItem,
  TournamentLeaderStat,
  StudioGraphic,
  StudioGraphicPreset,
  GraphicAssignment,
  GraphicPlaylist,
  GraphicScene,
  OnAirState,
  OnAirGraphicItem,
  SportType,
  BroadcastAuditLog,
  TeamSheetScanResult,
  TeamSheetImportPayload,
  SampleTeamSheetTemplate,
  Auction,
  AuctionTeam,
  AuctionPlayer,
  AuctionBid,
  AuctionResult,
  AuctionRetainedPlayer,
  AuctionGraphicConfig,
  AuctionAuditLog,
  AuctionReportsSummary,
  AuctionLiveState,
} from '../types';

// Dynamic API Base URL - works on any VPS Public IP, domain, or environment
const API_BASE = '/api';

export class ApiError extends Error {
  status: number;
  data?: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
  }
}

/**
 * Format raw error responses or HTTP status codes into consistent, helpful user-facing messages
 */
export function formatApiErrorMessage(status: number, rawError?: any): string {
  if (typeof rawError === 'string' && rawError.trim() && !rawError.includes('Error:') && !rawError.includes('stack')) {
    return rawError;
  }
  if (rawError && typeof rawError === 'object' && typeof rawError.error === 'string' && !rawError.error.includes('stack')) {
    return rawError.error;
  }
  if (rawError && typeof rawError === 'object' && typeof rawError.message === 'string' && !rawError.message.includes('stack')) {
    return rawError.message;
  }

  switch (status) {
    case 400:
      return 'The request could not be completed due to invalid input. Please check the fields and try again.';
    case 401:
      return 'Your session has expired. Please log in again.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested record was not found.';
    case 409:
      return 'A conflict occurred with the current state of this record.';
    case 422:
      return 'Validation error: please verify that all required fields are correctly formatted.';
    case 429:
      return 'Too many requests. Please wait a moment before trying again.';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'The server could not complete this action. Please try again.';
    case 0:
    case 408:
      return 'Unable to connect to server. Please check your network connection.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('sportspulse_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35000);
    const signal = options.signal || controller.signal;

    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      signal,
    });
    clearTimeout(timeout);
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new ApiError('Request timed out. Please check your connection and try again.', 408);
    }
    throw new ApiError('Unable to connect to server. Please check your network connection.', 0);
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = formatApiErrorMessage(response.status, data);

    // If 401 on an authenticated endpoint, notify app of session expiration
    if (response.status === 401 && token && !endpoint.includes('/auth/login')) {
      localStorage.removeItem('sportspulse_token');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('sportspulse:session-expired', {
            detail: { message },
          })
        );
      }
    }

    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request<{ message: string; user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  logout: () =>
    request<{ message: string }>('/auth/logout', {
      method: 'POST',
    }),

  getMe: () =>
    request<{ user: User }>('/auth/me'),

  updateProfile: (name: string, email: string) =>
    request<{ message: string; user: User; token: string }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ name, email }),
    }),

  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) =>
    request<{ message: string }>('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
    }),

  getUsers: (search?: string) =>
    request<{ users: User[] }>(`/auth/users${search ? `?search=${encodeURIComponent(search)}` : ''}`),

  // Super Admin User & Sport Access Management
  getAdminUsers: (search?: string) =>
    request<{ users: (User & { tournamentCount: number })[] }>(
      `/auth/admin/users${search ? `?search=${encodeURIComponent(search)}` : ''}`
    ),

  createAdminUser: (data: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    role?: string;
    status?: string;
    allowedSports?: SportType[];
  }) =>
    request<{ message: string; user: User }>('/auth/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateAdminUser: (
    id: string,
    data: {
      name?: string;
      email?: string;
      role?: string;
      status?: string;
      allowedSports?: SportType[];
    }
  ) =>
    request<{ message: string; user: User }>(`/auth/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  resetAdminUserPassword: (id: string, data: { newPassword: string; confirmPassword: string }) =>
    request<{ message: string }>(`/auth/admin/users/${id}/password`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  setAdminUserStatus: (id: string, status: 'ACTIVE' | 'DISABLED') =>
    request<{ message: string; user: User }>(`/auth/admin/users/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),

  getAdminUserTournaments: (id: string) =>
    request<{ tournaments: Tournament[] }>(`/auth/admin/users/${id}/tournaments`),

  // System
  getSystemStatus: () =>
    request<SystemStatus>('/system/status'),

  getAuditLogs: (limit = 50) =>
    request<{ logs: AuditLog[] }>(`/system/audit-logs?limit=${limit}`),

  // Tournaments
  getTournaments: (params: { search?: string; sport?: string; status?: string; season?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.sport) query.append('sport', params.sport);
    if (params.status) query.append('status', params.status);
    if (params.season) query.append('season', params.season);
    const queryString = query.toString();
    return request<{ tournaments: Tournament[] }>(`/tournaments${queryString ? `?${queryString}` : ''}`);
  },

  getTournament: (id: string) =>
    request<{ tournament: Tournament; groups: Group[]; teams: Team[]; players: Player[] }>(`/tournaments/${id}`),

  createTournament: (data: Partial<Tournament>) =>
    request<{ message: string; tournament: Tournament }>('/tournaments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTournament: (id: string, data: Partial<Tournament>) =>
    request<{ message: string; tournament: Tournament }>(`/tournaments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteTournament: (id: string) =>
    request<{ message: string }>(`/tournaments/${id}`, {
      method: 'DELETE',
    }),

  duplicateTournament: (id: string, data: { includeTeams?: boolean; includeGroups?: boolean; newName?: string }) =>
    request<{ message: string; tournament: Tournament }>(`/tournaments/${id}/duplicate`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  bulkCreateGroups: (tournamentId: string, data: { count?: number; groupNames?: string[]; maxTeams?: number }) =>
    request<{ message: string; groups: Group[] }>(`/tournaments/${tournamentId}/groups/bulk`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  distributeTeams: (tournamentId: string, method: 'SNAKE' | 'RANDOM' | 'BALANCED') =>
    request<{ message: string; teams: Team[] }>(`/tournaments/${tournamentId}/groups/distribute-teams`, {
      method: 'POST',
      body: JSON.stringify({ method }),
    }),

  assignTeamsToGroup: (tournamentId: string, groupId: string, teamIds: string[] | string) =>
    request<{ message: string; groupTeams: Team[] }>(`/tournaments/${tournamentId}/groups/${groupId}/teams/assign`, {
      method: 'POST',
      body: JSON.stringify({ teamIds }),
    }),

  removeTeamFromGroup: (tournamentId: string, groupId: string, teamId: string) =>
    request<{ message: string }>(`/tournaments/${tournamentId}/groups/${groupId}/teams/remove`, {
      method: 'POST',
      body: JSON.stringify({ teamId }),
    }),

  getTournamentStandings: (tournamentId: string) =>
    request<{ groups: TournamentGroupStandings[]; overall: TournamentStandingRow[]; competitionConfig?: TournamentCompetitionConfig }>(`/tournaments/${tournamentId}/standings`),

  getTournamentGroupStandings: (tournamentId: string, groupId: string) =>
    request<{ groups: TournamentGroupStandings[]; overall: TournamentStandingRow[]; competitionConfig?: TournamentCompetitionConfig }>(`/tournaments/${tournamentId}/standings/group/${groupId}`),

  getTournamentCompetitionConfig: (tournamentId: string) =>
    request<TournamentCompetitionConfig>(`/tournaments/${tournamentId}/competition`),

  updateTournamentCompetitionConfig: (tournamentId: string, config: Partial<TournamentCompetitionConfig>) =>
    request<{ message: string; config: TournamentCompetitionConfig; standings: { groups: TournamentGroupStandings[]; overall: TournamentStandingRow[] } }>(`/tournaments/${tournamentId}/competition`, {
      method: 'PUT',
      body: JSON.stringify(config),
    }),

  getTournamentStandingsRules: (tournamentId: string) =>
    request<{
      tournamentId: string;
      sport: string;
      format: string;
      pointsRules: any;
      tieBreakerOrder: TieBreakerRule[];
      qualificationSlotsPerGroup: number;
      directQualificationSlots: number;
      manualPointsOverrideEnabled: boolean;
      qualificationTrackingEnabled: boolean;
      customSportMetrics?: any;
    }>(`/tournaments/${tournamentId}/standings/rules`),

  getTournamentStandingsAuditLogs: (tournamentId: string) =>
    request<StandingsOverrideAuditLog[]>(`/tournaments/${tournamentId}/standings/audit-logs`),

  setStandingsOverride: (
    tournamentId: string,
    teamId: string,
    data: { pointsAdjustment?: number; qualificationStatusOverride?: 'AUTO' | 'QUALIFIED' | 'ELIMINATED' | 'CONTENTION'; rankOverride?: number; reason: string }
  ) =>
    request<{ message: string; auditLog: StandingsOverrideAuditLog; standings: { groups: TournamentGroupStandings[]; overall: TournamentStandingRow[] } }>(
      `/tournaments/${tournamentId}/standings/${teamId}/override`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    ),

  resetStandingsOverride: (tournamentId: string, teamId: string) =>
    request<{ message: string; auditLog: StandingsOverrideAuditLog; standings: { groups: TournamentGroupStandings[]; overall: TournamentStandingRow[] } }>(
      `/tournaments/${tournamentId}/standings/${teamId}/override`,
      {
        method: 'DELETE',
      }
    ),

  getTournamentAcl: (tournamentId: string) =>
    request<{
      owner: { id: string; name: string; email: string; role: string } | null;
      collaborators: Array<{
        userId: string;
        role: 'MANAGER' | 'SCORER' | 'BROADCAST_OPERATOR' | 'VIEWER';
        name: string;
        email: string;
        assignedAt: string;
      }>;
    }>(`/tournaments/${tournamentId}/acl`),

  addTournamentCollaborator: (
    tournamentId: string,
    data: { email?: string; userId?: string; role: 'MANAGER' | 'SCORER' | 'BROADCAST_OPERATOR' | 'VIEWER' }
  ) =>
    request<{ message: string; collaborators: any[] }>(`/tournaments/${tournamentId}/acl`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  removeTournamentCollaborator: (tournamentId: string, userId: string) =>
    request<{ message: string }>(`/tournaments/${tournamentId}/acl/${userId}`, {
      method: 'DELETE',
    }),

  recalculateStandings: (tournamentId: string) =>
    request<{ message: string; groups: TournamentGroupStandings[]; overall: TournamentStandingRow[] }>(`/tournaments/${tournamentId}/standings/recalculate`, {
      method: 'POST',
    }),

  overrideQualification: (tournamentId: string, data: { groupId?: string; teamId: string; status: 'QUALIFIED' | 'ELIMINATED' | 'AUTO' | 'CONTENTION'; pointsAdjustment?: number; reason?: string }) =>
    request<{ message: string; standings: { groups: TournamentGroupStandings[]; overall: TournamentStandingRow[] } }>(`/tournaments/${tournamentId}/standings/qualification-override`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  previewTournamentFixtures: (tournamentId: string, data: Partial<FixtureGenerationOptions>) =>
    request<FixturePreviewResponse>(`/tournaments/${tournamentId}/fixtures/preview`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  generateTournamentFixtures: (tournamentId: string, data: Partial<FixtureGenerationOptions>) =>
    request<{
      createdMatches: Match[];
      warnings: FixtureConflictWarning[];
      message: string;
      summary: FixturePreviewResponse['summary'];
    }>(`/tournaments/${tournamentId}/fixtures/generate`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTournamentFixture: (
    tournamentId: string,
    matchId: string,
    data: {
      date?: string;
      time?: string;
      venue?: string;
      ground?: string;
      matchNumber?: string;
      round?: string;
      swapHomeAway?: boolean;
      description?: string;
    }
  ) =>
    request<{ match: Match; message: string }>(`/tournaments/${tournamentId}/fixtures/${matchId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteTournamentFixture: (tournamentId: string, matchId: string) =>
    request<{ message: string }>(`/tournaments/${tournamentId}/fixtures/${matchId}`, {
      method: 'DELETE',
    }),

  deleteGroupFixtures: (tournamentId: string, groupId: string) =>
    request<{ message: string }>(`/tournaments/${tournamentId}/fixtures/group/${groupId}`, {
      method: 'DELETE',
    }),

  clearAllTournamentFixtures: (tournamentId: string) =>
    request<{ message: string }>(`/tournaments/${tournamentId}/fixtures/clear-all`, {
      method: 'DELETE',
    }),

  getTournamentKnockout: (tournamentId: string) =>
    request<{ bracket?: KnockoutBracket; validation?: { isValid: boolean; errors: string[]; warnings: string[] } }>(`/tournaments/${tournamentId}/bracket`),

  getTournamentBracket: (tournamentId: string) =>
    request<{ bracket?: KnockoutBracket; validation?: { isValid: boolean; errors: string[]; warnings: string[] } }>(`/tournaments/${tournamentId}/bracket`),

  generateTournamentKnockout: (tournamentId: string, data: any) =>
    request<{ message: string; bracket: KnockoutBracket }>(`/tournaments/${tournamentId}/bracket/generate`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  generateTournamentBracket: (tournamentId: string, data: any) =>
    request<{ message: string; bracket: KnockoutBracket }>(`/tournaments/${tournamentId}/bracket/generate`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  regenerateTournamentBracket: (tournamentId: string, data: any) =>
    request<{ message: string; bracket: KnockoutBracket }>(`/tournaments/${tournamentId}/bracket/regenerate`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  advanceTournamentBracketWinner: (tournamentId: string, data: { nodeId: string; winnerTeamId: string; reason?: string }) =>
    request<{ success: boolean; message: string; bracket: KnockoutBracket }>(`/tournaments/${tournamentId}/bracket/advance`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  resolveTournamentBracketTie: (tournamentId: string, data: { nodeId: string; winnerTeamId: string; resolutionMethod?: string }) =>
    request<{ success: boolean; message: string; bracket: KnockoutBracket }>(`/tournaments/${tournamentId}/bracket/resolve-tie`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  resolveTournamentBracketBye: (tournamentId: string, data: { nodeId: string }) =>
    request<{ success: boolean; message: string; bracket: KnockoutBracket }>(`/tournaments/${tournamentId}/bracket/resolve-bye`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  recalculateTournamentBracket: (tournamentId: string, data?: { preservePlayedMatches?: boolean }) =>
    request<{ success: boolean; message: string; bracket: KnockoutBracket }>(`/tournaments/${tournamentId}/bracket/recalculate`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),

  declareTournamentChampion: (tournamentId: string, data: { championTeamId: string; runnerUpTeamId?: string; thirdPlaceTeamId?: string }) =>
    request<{ success: boolean; message: string; summary: ChampionshipSummary }>(`/tournaments/${tournamentId}/champion`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  reopenTournamentLifecycle: (tournamentId: string, data?: { reason?: string }) =>
    request<{ success: boolean; message: string; tournament: Tournament }>(`/tournaments/${tournamentId}/reopen`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),

  getTournamentChampionshipSummary: (tournamentId: string) =>
    request<ChampionshipSummary>(`/tournaments/${tournamentId}/championship-summary`),

  updateKnockoutMatch: (tournamentId: string, data: any) =>
    request<{ message: string; bracket: KnockoutBracket }>(`/tournaments/${tournamentId}/knockout/match`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getTournamentDashboard: (tournamentId: string) =>
    request<TournamentDashboardData>(`/tournaments/${tournamentId}/dashboard`),

  getTournamentLiveMatches: (tournamentId: string) =>
    request<{ liveMatches: Array<Match & { liveScoreText?: string; liveDetailText?: string }> }>(`/tournaments/${tournamentId}/live-matches`),

  getTournamentResults: (tournamentId: string, params?: { groupId?: string; round?: string; teamId?: string }) => {
    const q = new URLSearchParams();
    if (params?.groupId) q.append('groupId', params.groupId);
    if (params?.round) q.append('round', params.round);
    if (params?.teamId) q.append('teamId', params.teamId);
    const qs = q.toString();
    return request<{ results: Match[] }>(`/tournaments/${tournamentId}/results${qs ? `?${qs}` : ''}`);
  },

  getTournamentPlayerLeaderboards: (tournamentId: string) =>
    request<{ leaderboards: Record<string, { categoryTitle: string; statLabel: string; leaders: TournamentLeaderStat[] }> }>(`/tournaments/${tournamentId}/player-leaderboards`),

  getTournamentTeamStats: (tournamentId: string) =>
    request<{ teamStats: TournamentTeamFormItem[] }>(`/tournaments/${tournamentId}/team-stats`),

  getTournamentPlayerProfile: (tournamentId: string, playerId: string) =>
    request<TournamentPlayerProfileData>(`/tournaments/${tournamentId}/player/${playerId}`),

  getTournamentTeamProfile: (tournamentId: string, teamId: string) =>
    request<TournamentTeamProfileData>(`/tournaments/${tournamentId}/team/${teamId}`),

  getTournamentPerformanceIndex: (tournamentId: string) =>
    request<{ performanceIndex: TournamentPerformanceIndexItem[] }>(`/tournaments/${tournamentId}/performance-index`),

  getTournamentRecords: (tournamentId: string) =>
    request<{ records: TournamentRecordItem[] }>(`/tournaments/${tournamentId}/records`),

  recalculateTournamentStatistics: (tournamentId: string) =>
    request<{ message: string; statistics: TournamentStatisticsSummary; dashboard: TournamentDashboardData }>(`/tournaments/${tournamentId}/statistics/recalculate`, {
      method: 'POST',
    }),

  getTournamentStatistics: (tournamentId: string) =>
    request<{ statistics: TournamentStatisticsSummary }>(`/tournaments/${tournamentId}/statistics`),

  getTournamentAwards: (tournamentId: string) =>
    request<{ awards: TournamentAwardItem[] }>(`/tournaments/${tournamentId}/awards`),

  overrideTournamentAward: (tournamentId: string, payload: { awardId: string; newPlayerId: string; reason: string; citation?: string }) =>
    request<{ message: string; award: TournamentAwardItem; auditLog: TournamentAwardAuditLog }>(`/tournaments/${tournamentId}/awards/override`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  restoreTournamentAward: (tournamentId: string, awardId: string) =>
    request<{ message: string; award: TournamentAwardItem; auditLog: TournamentAwardAuditLog }>(`/tournaments/${tournamentId}/awards/restore`, {
      method: 'POST',
      body: JSON.stringify({ awardId }),
    }),

  saveTournamentAwards: (tournamentId: string, awards: TournamentAwardItem[]) =>
    request<{ message: string; awards: TournamentAwardItem[] }>(`/tournaments/${tournamentId}/awards`, {
      method: 'POST',
      body: JSON.stringify({ awards }),
    }),

  finalizeTournamentAwards: (tournamentId: string) =>
    request<{ message: string; awards: TournamentAwardItem[]; auditLog?: TournamentAwardAuditLog }>(`/tournaments/${tournamentId}/awards/finalize`, {
      method: 'POST',
    }),

  reopenTournamentAwards: (tournamentId: string) =>
    request<{ message: string; awards: TournamentAwardItem[]; auditLog?: TournamentAwardAuditLog }>(`/tournaments/${tournamentId}/awards/reopen`, {
      method: 'POST',
    }),

  getTournamentAwardAuditLogs: (tournamentId: string) =>
    request<{ logs: TournamentAwardAuditLog[] }>(`/tournaments/${tournamentId}/awards/audit-logs`),

  getTournamentHallOfFame: (tournamentId: string) =>
    request<TournamentHallOfFameData>(`/tournaments/${tournamentId}/hall-of-fame`),

  getTournamentPresentationData: (tournamentId: string) =>
    request<{
      tournament: Tournament;
      championship: any;
      hallOfFame: TournamentHallOfFameData;
      awards: TournamentAwardItem[];
      records: TournamentRecordDetail[];
      sponsor?: { name: string };
    }>(`/tournaments/${tournamentId}/presentation-data`),

  triggerTournamentPresentation: (tournamentId: string, payload: { type: string; data?: any; cardConfig?: any }) =>
    request<{ message: string; event: TournamentPresentationEvent }>(`/tournaments/${tournamentId}/presentation/trigger`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getTournamentBroadcastData: (tournamentId: string) =>
    request<any>(`/tournaments/${tournamentId}/broadcast-data`),

  // Groups
  getGroups: (tournamentId?: string) =>
    request<{ groups: Group[] }>(`/groups${tournamentId ? `?tournamentId=${tournamentId}` : ''}`),

  getGroup: (id: string) =>
    request<{ group: Group; teams: Team[] }>(`/groups/${id}`),

  createGroup: (data: Partial<Group>) =>
    request<{ message: string; group: Group }>('/groups', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateGroup: (id: string, data: Partial<Group>) =>
    request<{ message: string; group: Group }>(`/groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteGroup: (id: string) =>
    request<{ message: string }>(`/groups/${id}`, {
      method: 'DELETE',
    }),

  // Teams
  getTeams: (params: { tournamentId?: string; groupId?: string; search?: string; status?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.tournamentId) query.append('tournamentId', params.tournamentId);
    if (params.groupId) query.append('groupId', params.groupId);
    if (params.search) query.append('search', params.search);
    if (params.status) query.append('status', params.status);
    const queryString = query.toString();
    return request<{ teams: Team[] }>(`/teams${queryString ? `?${queryString}` : ''}`);
  },

  getTeam: (id: string) =>
    request<{ team: Team; players: Player[]; group: Group | null; tournament: Tournament | null }>(`/teams/${id}`),

  createTeam: (data: Partial<Team>) =>
    request<{ message: string; team: Team }>('/teams', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTeam: (id: string, data: Partial<Team>) =>
    request<{ message: string; team: Team }>(`/teams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteTeam: (id: string) =>
    request<{ message: string }>(`/teams/${id}`, {
      method: 'DELETE',
    }),

  getSampleTeamSheets: () =>
    request<{ samples: SampleTeamSheetTemplate[] }>('/teams/sample-team-sheets'),

  scanTeamSheet: (data: {
    imageBase64?: string;
    mimeType?: string;
    sportHint?: string;
    sampleId?: string;
    tournamentId?: string;
    teamId?: string;
  }) =>
    request<TeamSheetScanResult & { existingSquadCount?: number }>('/teams/scan-team-sheet', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  importTeamSheet: (payload: TeamSheetImportPayload) =>
    request<{
      message: string;
      team: Team;
      players: Player[];
      importedCount: number;
      updatedCount: number;
    }>('/teams/import-team-sheet', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Players
  getPlayers: (params: { teamId?: string; tournamentId?: string; role?: string; status?: string; search?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.teamId) query.append('teamId', params.teamId);
    if (params.tournamentId) query.append('tournamentId', params.tournamentId);
    if (params.role) query.append('role', params.role);
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    const queryString = query.toString();
    return request<{ players: Player[] }>(`/players${queryString ? `?${queryString}` : ''}`);
  },

  getPlayer: (id: string) =>
    request<{ player: Player; team: Team | null; tournament: Tournament | null }>(`/players/${id}`),

  createPlayer: (data: Partial<Player>) =>
    request<{ message: string; player: Player }>('/players', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updatePlayer: (id: string, data: Partial<Player>) =>
    request<{ message: string; player: Player }>(`/players/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deletePlayer: (id: string) =>
    request<{ message: string }>(`/players/${id}`, {
      method: 'DELETE',
    }),

  // Matches
  getMatches: (params: { tournamentId?: string; groupId?: string; sport?: string; status?: string; search?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.tournamentId) query.append('tournamentId', params.tournamentId);
    if (params.groupId) query.append('groupId', params.groupId);
    if (params.sport) query.append('sport', params.sport);
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    const queryString = query.toString();
    return request<{ matches: Match[] }>(`/matches${queryString ? `?${queryString}` : ''}`);
  },

  getMatch: (id: string) =>
    request<{ match: Match }>(`/matches/${id}`),

  getPublicMatch: (id: string) =>
    request<{ match: Match }>(`/matches/${id}/public`),

  getPublicMatchReport: (id: string) =>
    request<{ report: any }>(`/matches/${id}/public-report`),

  createMatch: (data: Partial<Match>) =>
    request<{ message: string; match: Match }>('/matches', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateMatch: (id: string, data: Partial<Match>) =>
    request<{ message: string; match: Match }>(`/matches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  duplicateMatch: (id: string) =>
    request<{ message: string; match: Match }>(`/matches/${id}/duplicate`, {
      method: 'POST',
    }),

  deleteMatch: (id: string) =>
    request<{ message: string }>(`/matches/${id}`, {
      method: 'DELETE',
    }),

  updateMatchSquad: (id: string, teamASquad?: any, teamBSquad?: any) =>
    request<{ message: string; match: Match }>(`/matches/${id}/squad`, {
      method: 'PUT',
      body: JSON.stringify({ teamASquad, teamBSquad }),
    }),

  updateMatchStatus: (id: string, status: string) =>
    request<{ message: string; match: Match }>(`/matches/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // Generic Live Scoring Engine
  getMatchScoring: (matchId: string) =>
    request<{ state: any }>(`/matches/${matchId}/scoring`),

  // Cricket Live Scoring Engine
  getScoringState: (matchId: string) =>
    request<{ state: CricketMatchScoringState }>(`/matches/${matchId}/scoring`),

  startScoring: (
    matchId: string,
    data: { battingTeamId: string; bowlingTeamId: string; strikerId: string; nonStrikerId: string; bowlerId: string }
  ) =>
    request<{ message: string; state: CricketMatchScoringState }>(`/matches/${matchId}/scoring/start`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  recordBall: (matchId: string, data: any) =>
    request<{ message: string; state: CricketMatchScoringState }>(`/matches/${matchId}/scoring/ball`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  undoLastBall: (matchId: string) =>
    request<{ message: string; state: CricketMatchScoringState }>(`/matches/${matchId}/scoring/undo`, {
      method: 'POST',
    }),

  editLastBall: (matchId: string, data: any) =>
    request<{ message: string; state: CricketMatchScoringState }>(`/matches/${matchId}/scoring/edit-last`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  setBowler: (matchId: string, bowlerId: string) =>
    request<{ message: string; state: CricketMatchScoringState }>(`/matches/${matchId}/scoring/bowler`, {
      method: 'POST',
      body: JSON.stringify({ bowlerId }),
    }),

  swapStrike: (matchId: string) =>
    request<{ message: string; state: CricketMatchScoringState }>(`/matches/${matchId}/scoring/swap-strike`, {
      method: 'POST',
    }),

  startInnings2: (
    matchId: string,
    data: { strikerId: string; nonStrikerId: string; bowlerId: string }
  ) =>
    request<{ message: string; state: CricketMatchScoringState }>(`/matches/${matchId}/scoring/start-innings2`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  endMatchScoring: (matchId: string) =>
    request<{ message: string; state: CricketMatchScoringState }>(`/matches/${matchId}/scoring/end-match`, {
      method: 'POST',
    }),

  // Volleyball Live Scoring Engine
  getVolleyballScoringState: (matchId: string) =>
    request<{ state: VolleyballMatchScoringState }>(`/matches/${matchId}/scoring`),

  startVolleyballScoring: (
    matchId: string,
    data: { servingFirstTeamId?: string; startingPositionsA?: any; startingPositionsB?: any } = {}
  ) =>
    request<{ message: string; state: VolleyballMatchScoringState }>(`/matches/${matchId}/scoring/volleyball/start`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  recordVolleyballPoint: (
    matchId: string,
    data: {
      pointWinner: string;
      pointType: string;
      playerId?: string;
      opponentError?: boolean;
      description?: string;
    }
  ) =>
    request<{ message: string; state: VolleyballMatchScoringState }>(`/matches/${matchId}/scoring/volleyball/point`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  startVolleyballNextSet: (matchId: string) =>
    request<{ message: string; state: VolleyballMatchScoringState }>(`/matches/${matchId}/scoring/volleyball/start-set`, {
      method: 'POST',
    }),

  recordVolleyballTimeout: (matchId: string, teamId: string) =>
    request<{ message: string; state: VolleyballMatchScoringState }>(`/matches/${matchId}/scoring/volleyball/timeout`, {
      method: 'POST',
      body: JSON.stringify({ teamId }),
    }),

  recordVolleyballSubstitution: (
    matchId: string,
    data: { teamId: string; playerOutId: string; playerInId: string; position?: number }
  ) =>
    request<{ message: string; state: VolleyballMatchScoringState }>(`/matches/${matchId}/scoring/volleyball/substitution`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateVolleyballRotation: (matchId: string, data: { teamId: string; rotation: any }) =>
    request<{ message: string; state: VolleyballMatchScoringState }>(`/matches/${matchId}/scoring/volleyball/rotation`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  setVolleyballServer: (matchId: string, data: { teamId: string; serverPlayerId: string }) =>
    request<{ message: string; state: VolleyballMatchScoringState }>(`/matches/${matchId}/scoring/volleyball/server`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  correctVolleyballScore: (
    matchId: string,
    data: { teamAScore: number; teamBScore: number; setNumber?: number }
  ) =>
    request<{ message: string; state: VolleyballMatchScoringState }>(`/matches/${matchId}/scoring/volleyball/correct-score`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  undoVolleyballPoint: (matchId: string) =>
    request<{ message: string; state: VolleyballMatchScoringState }>(`/matches/${matchId}/scoring/undo`, {
      method: 'POST',
    }),

  editLastVolleyballPoint: (matchId: string, data: any) =>
    request<{ message: string; state: VolleyballMatchScoringState }>(`/matches/${matchId}/scoring/edit-last`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Kabaddi Live Scoring Engine
  getKabaddiScoringState: (matchId: string) =>
    request<{ state: KabaddiMatchScoringState }>(`/matches/${matchId}/scoring`),

  startKabaddiScoring: (matchId: string) =>
    request<{ message: string; state: KabaddiMatchScoringState }>(`/matches/${matchId}/scoring/kabaddi/start`, {
      method: 'POST',
    }),

  recordKabaddiRaid: (matchId: string, data: any) =>
    request<{ message: string; state: KabaddiMatchScoringState; raid: any }>(`/matches/${matchId}/scoring/kabaddi/raid`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  undoLastKabaddiRaid: (matchId: string) =>
    request<{ message: string; state: KabaddiMatchScoringState }>(`/matches/${matchId}/scoring/kabaddi/undo`, {
      method: 'POST',
    }),

  editKabaddiRaid: (matchId: string, raidId: string, data: any) =>
    request<{ message: string; state: KabaddiMatchScoringState; raid: any }>(`/matches/${matchId}/scoring/kabaddi/raid/${raidId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  recordKabaddiTimeout: (matchId: string, data: { teamId: string; half?: number }) =>
    request<{ message: string; state: KabaddiMatchScoringState; timeout: any }>(`/matches/${matchId}/scoring/kabaddi/timeout`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  recordKabaddiSubstitution: (matchId: string, data: { teamId: string; playerOutId: string; playerInId: string; half?: number }) =>
    request<{ message: string; state: KabaddiMatchScoringState; substitution: any }>(`/matches/${matchId}/scoring/kabaddi/substitution`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  transitionKabaddiHalf: (matchId: string, targetStatus: 'HALF_TIME' | 'SECOND_HALF' | 'COMPLETED') =>
    request<{ message: string; state: KabaddiMatchScoringState }>(`/matches/${matchId}/scoring/kabaddi/half`, {
      method: 'POST',
      body: JSON.stringify({ targetStatus }),
    }),

  // Field Hockey Live Scoring Engine
  getHockeyScoringState: (matchId: string) =>
    request<{ state: HockeyMatchScoringState }>(`/matches/${matchId}/scoring`),

  startHockeyScoring: (matchId: string) =>
    request<{ message: string; state: HockeyMatchScoringState }>(`/matches/${matchId}/scoring/hockey/start`, {
      method: 'POST',
    }),

  recordHockeyGoal: (matchId: string, data: any) =>
    request<{ message: string; state: HockeyMatchScoringState }>(`/matches/${matchId}/scoring/hockey/goal`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  recordHockeyPenaltyCorner: (matchId: string, data: any) =>
    request<{ message: string; state: HockeyMatchScoringState }>(`/matches/${matchId}/scoring/hockey/penalty-corner`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  recordHockeyPenaltyStroke: (matchId: string, data: any) =>
    request<{ message: string; state: HockeyMatchScoringState }>(`/matches/${matchId}/scoring/hockey/penalty-stroke`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  recordHockeyCard: (matchId: string, data: any) =>
    request<{ message: string; state: HockeyMatchScoringState }>(`/matches/${matchId}/scoring/hockey/card`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  recordHockeySubstitution: (matchId: string, data: any) =>
    request<{ message: string; state: HockeyMatchScoringState }>(`/matches/${matchId}/scoring/hockey/substitution`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateHockeyClock: (matchId: string, data: any) =>
    request<{ message: string; clock: any; state: HockeyMatchScoringState }>(`/matches/${matchId}/scoring/hockey/clock`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  transitionHockeyPeriod: (matchId: string, data: { action: string; nextPeriod?: number }) =>
    request<{ message: string; state: HockeyMatchScoringState }>(`/matches/${matchId}/scoring/hockey/period`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  recordHockeyShootout: (matchId: string, data: any) =>
    request<{ message: string; state: HockeyMatchScoringState }>(`/matches/${matchId}/scoring/hockey/shootout`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  undoHockeyEvent: (matchId: string) =>
    request<{ message: string; state: HockeyMatchScoringState }>(`/matches/${matchId}/scoring/hockey/undo`, {
      method: 'POST',
    }),

  editHockeyEvent: (matchId: string, data: { eventId: string; updates: any }) =>
    request<{ message: string; state: HockeyMatchScoringState }>(`/matches/${matchId}/scoring/hockey/edit-event`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Football / Soccer Live Scoring Engine
  getFootballScoringState: (matchId: string) =>
    request<{ state: FootballMatchScoringState }>(`/matches/${matchId}/scoring`),

  recordFootballEvent: (matchId: string, data: any) =>
    request<{ message: string; state: FootballMatchScoringState }>(`/matches/${matchId}/scoring/football/event`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  recordFootballSubstitution: (matchId: string, data: any) =>
    request<{ message: string; state: FootballMatchScoringState }>(`/matches/${matchId}/scoring/football/substitution`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateFootballClock: (matchId: string, data: any) =>
    request<{ message: string; clock: any; state: FootballMatchScoringState }>(`/matches/${matchId}/scoring/football/clock`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  transitionFootballPeriod: (matchId: string, data: { action: string; nextPeriod?: number }) =>
    request<{ message: string; state: FootballMatchScoringState }>(`/matches/${matchId}/scoring/football/period`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  recordFootballShootout: (matchId: string, data: any) =>
    request<{ message: string; state: FootballMatchScoringState }>(`/matches/${matchId}/scoring/football/shootout`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  undoFootballEvent: (matchId: string) =>
    request<{ message: string; state: FootballMatchScoringState }>(`/matches/${matchId}/scoring/football/undo`, {
      method: 'POST',
    }),

  editFootballEvent: (matchId: string, data: { eventId: string; updates: any }) =>
    request<{ message: string; state: FootballMatchScoringState }>(`/matches/${matchId}/scoring/football/edit-event`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Basketball Live Scoring Engine
  getBasketballScoringState: (matchId: string) =>
    request<{ state: BasketballMatchScoringState }>(`/matches/${matchId}/scoring`),

  recordBasketballEvent: (matchId: string, data: any) =>
    request<{ message: string; event: any; state: BasketballMatchScoringState }>(`/matches/${matchId}/scoring/basketball/event`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateBasketballClock: (matchId: string, data: any) =>
    request<{ message: string; state: BasketballMatchScoringState }>(`/matches/${matchId}/scoring/basketball/clock`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  resetBasketballShotClock: (matchId: string, duration?: number) =>
    request<{ message: string; state: BasketballMatchScoringState }>(`/matches/${matchId}/scoring/basketball/shot-clock/reset`, {
      method: 'POST',
      body: JSON.stringify({ duration: duration || 24 }),
    }),

  advanceBasketballQuarter: (matchId: string, data: { action: string; targetQuarter?: number }) =>
    request<{ message: string; state: BasketballMatchScoringState }>(`/matches/${matchId}/scoring/basketball/quarter`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  undoBasketballEvent: (matchId: string) =>
    request<{ message: string; state: BasketballMatchScoringState }>(`/matches/${matchId}/scoring/basketball/undo`, {
      method: 'POST',
    }),

  editBasketballEvent: (matchId: string, data: { eventId: string; updates: any }) =>
    request<{ message: string; state: BasketballMatchScoringState }>(`/matches/${matchId}/scoring/basketball/edit-event`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Tennis Live Scoring Engine
  getTennisScoringState: (matchId: string) =>
    request<{ state: TennisMatchScoringState }>(`/matches/${matchId}/scoring`),

  recordTennisPoint: (matchId: string, data: any) =>
    request<{ message: string; event: any; state: TennisMatchScoringState }>(`/matches/${matchId}/scoring/tennis/point`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTennisServer: (matchId: string, data: { serverPlayerId: string; serverTeamId: string }) =>
    request<{ message: string; state: TennisMatchScoringState }>(`/matches/${matchId}/scoring/tennis/server`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  undoTennisPoint: (matchId: string) =>
    request<{ message: string; state: TennisMatchScoringState }>(`/matches/${matchId}/scoring/tennis/undo`, {
      method: 'POST',
    }),

  editTennisEvent: (matchId: string, data: { eventId: string; updates: any }) =>
    request<{ message: string; state: TennisMatchScoringState }>(`/matches/${matchId}/scoring/tennis/edit-event`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Badminton Live Scoring Engine
  getBadmintonScoringState: (matchId: string) =>
    request<{ state: BadmintonMatchScoringState }>(`/matches/${matchId}/scoring`),

  startBadmintonScoring: (matchId: string, data: any = {}) =>
    request<{ message: string; state: BadmintonMatchScoringState }>(`/matches/${matchId}/scoring/badminton/start`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  recordBadmintonRally: (matchId: string, data: any) =>
    request<{ message: string; event: any; state: BadmintonMatchScoringState }>(`/matches/${matchId}/scoring/badminton/rally`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateBadmintonServer: (matchId: string, data: { serverPlayerId?: string; serverTeamId?: string; receiverPlayerId?: string; receiverTeamId?: string }) =>
    request<{ message: string; state: BadmintonMatchScoringState }>(`/matches/${matchId}/scoring/badminton/server`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  undoBadmintonRally: (matchId: string) =>
    request<{ message: string; state: BadmintonMatchScoringState }>(`/matches/${matchId}/scoring/badminton/undo`, {
      method: 'POST',
    }),

  editBadmintonEvent: (matchId: string, data: { eventId: string; updates: any }) =>
    request<{ message: string; state: BadmintonMatchScoringState }>(`/matches/${matchId}/scoring/badminton/edit-event`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Table Tennis Live Scoring Engine
  getTableTennisScoringState: (matchId: string) =>
    request<{ state: TableTennisMatchScoringState }>(`/matches/${matchId}/scoring`),

  startTableTennisScoring: (matchId: string, data: any = {}) =>
    request<{ message: string; state: TableTennisMatchScoringState }>(`/matches/${matchId}/scoring/table-tennis/start`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  recordTableTennisPoint: (matchId: string, data: any) =>
    request<{ message: string; event: any; state: TableTennisMatchScoringState }>(`/matches/${matchId}/scoring/table-tennis/point`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTableTennisServer: (matchId: string, data: { serverPlayerId?: string; serverTeamId?: string; receiverPlayerId?: string; receiverTeamId?: string }) =>
    request<{ message: string; state: TableTennisMatchScoringState }>(`/matches/${matchId}/scoring/table-tennis/server`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  undoTableTennisPoint: (matchId: string) =>
    request<{ message: string; state: TableTennisMatchScoringState }>(`/matches/${matchId}/scoring/table-tennis/undo`, {
      method: 'POST',
    }),

  editTableTennisEvent: (matchId: string, data: { eventId: string; updates: any }) =>
    request<{ message: string; state: TableTennisMatchScoringState }>(`/matches/${matchId}/scoring/table-tennis/edit-event`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  recordTableTennisTimeout: (matchId: string, data: { teamId: string }) =>
    request<{ message: string; state: TableTennisMatchScoringState; event: any }>(`/matches/${matchId}/scoring/table-tennis/timeout`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  recordTableTennisEndChange: (matchId: string) =>
    request<{ message: string; state: TableTennisMatchScoringState; event: any }>(`/matches/${matchId}/scoring/table-tennis/end-change`, {
      method: 'POST',
    }),

  // Full Match Report & Statistics Engine
  getMatchReport: (matchId: string) =>
    request<{ report: FullMatchReport | VolleyballMatchReport | KabaddiMatchReport | HockeyMatchReport | FootballMatchReport | BasketballMatchReport | TennisMatchReport }>(`/matches/${matchId}/report`),

  getVolleyballMatchReport: (matchId: string) =>
    request<{ report: VolleyballMatchReport }>(`/matches/${matchId}/report`),

  getKabaddiMatchReport: (matchId: string) =>
    request<{ report: KabaddiMatchReport }>(`/matches/${matchId}/report`),

  getHockeyMatchReport: (matchId: string) =>
    request<{ report: HockeyMatchReport }>(`/matches/${matchId}/report`),

  getFootballMatchReport: (matchId: string) =>
    request<{ report: FootballMatchReport }>(`/matches/${matchId}/report`),

  getBasketballMatchReport: (matchId: string) =>
    request<{ report: BasketballMatchReport }>(`/matches/${matchId}/report`),

  getTennisMatchReport: (matchId: string) =>
    request<{ report: TennisMatchReport }>(`/matches/${matchId}/report`),

  getBadmintonMatchReport: (matchId: string) =>
    request<{ report: BadmintonMatchReport }>(`/matches/${matchId}/report`),

  updateMatchAwards: (
    matchId: string,
    data: {
      manOfTheMatchId?: string;
      manOfTheMatchReason?: string;
      bestBatterId?: string;
      bestBowlerId?: string;
      playerOfTheMatchId?: string;
      playerOfTheMatchReason?: string;
      bestAttackerId?: string;
      bestAttackerReason?: string;
      bestServerId?: string;
      bestServerReason?: string;
      bestBlockerId?: string;
      bestDefenderId?: string;
      bestDefenderReason?: string;
      bestReturnerId?: string;
      bestReturnerReason?: string;
      bestPerformerId?: string;
      bestPerformerReason?: string;
      bestRaiderId?: string;
      bestAllRounderId?: string;
      bestForwardId?: string;
      bestGoalkeeperId?: string;
      bestPlaymakerId?: string;
      bestScorerId?: string;
      bestRebounderId?: string;
      bestThreePointShooterId?: string;
      bestDoublesPlayerId?: string;
      bestDoublesPlayerReason?: string;
      mostAcesId?: string;
      mostAcesReason?: string;
      mostWinnersId?: string;
      mostWinnersReason?: string;
      mostConsistentId?: string;
      mostConsistentReason?: string;
      customAwards?: any;
      [key: string]: any;
    }
  ) =>
    request<{ message: string; report: any }>(`/matches/${matchId}/report/awards`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  saveMatchAwards: (matchId: string, data: any) =>
    request<{ message: string; report: any }>(`/matches/${matchId}/report/awards`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  finalizeMatchReport: (matchId: string) =>
    request<{ message: string; report: FullMatchReport }>(`/matches/${matchId}/report/finalize`, {
      method: 'POST',
    }),

  reopenMatchReport: (matchId: string) =>
    request<{ message: string; report: FullMatchReport }>(`/matches/${matchId}/report/reopen`, {
      method: 'POST',
    }),

  getReportBroadcastData: (matchId: string) =>
    request<any>(`/matches/${matchId}/report/broadcast-data`),

  // Broadcast Graphics Engine
  getBroadcastState: (matchId: string) =>
    request<{ match: Match; scoringState: CricketMatchScoringState; broadcastConfig: BroadcastConfig; timestamp: string }>(
      `/matches/${matchId}/broadcast/state`
    ),

  getBroadcastConfig: (matchId: string) =>
    request<{ config: BroadcastConfig }>(`/matches/${matchId}/broadcast/config`),

  saveBroadcastConfig: (matchId: string, config: Partial<BroadcastConfig>) =>
    request<{ message: string; config: BroadcastConfig }>(`/matches/${matchId}/broadcast/config`, {
      method: 'POST',
      body: JSON.stringify(config),
    }),

  triggerBroadcastEvent: (
    matchId: string,
    payload: { type: string; durationSeconds?: number; data?: any; playerId?: string; activeManualOverlay?: string }
  ) =>
    request<{ message: string; config: BroadcastConfig }>(`/matches/${matchId}/broadcast/trigger-event`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  resetBroadcastConfig: (matchId: string) =>
    request<{ message: string; config: BroadcastConfig }>(`/matches/${matchId}/broadcast/reset`, {
      method: 'POST',
    }),

  getBroadcastPresets: () =>
    request<{ presets: BroadcastPreset[] }>('/broadcast/presets'),

  createBroadcastPreset: (preset: { name: string; description?: string; config: any }) =>
    request<{ message: string; preset: BroadcastPreset }>('/broadcast/presets', {
      method: 'POST',
      body: JSON.stringify(preset),
    }),

  getGraphicsTemplates: () =>
    request<{ templates: GraphicsTemplate[] }>('/broadcast/templates'),

  saveGraphicsTemplate: (template: Partial<GraphicsTemplate>) =>
    request<{ message: string; template: GraphicsTemplate }>('/broadcast/templates', {
      method: 'POST',
      body: JSON.stringify(template),
    }),

  // ==========================================
  // MANUAL SPORTS GRAPHICS STUDIO API METHODS
  // ==========================================
  getStudioGraphics: (params?: { sport?: string; category?: string; status?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.sport) query.set('sport', params.sport);
    if (params?.category) query.set('category', params.category);
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<{ graphics: StudioGraphic[]; total: number; sportsCategories: Record<string, string[]> }>(
      `/graphics${qs}`
    );
  },

  getStudioGraphic: (id: string) =>
    request<{ graphic: StudioGraphic }>(`/graphics/${id}`),

  createStudioGraphic: (graphic: Partial<StudioGraphic>) =>
    request<{ message: string; graphic: StudioGraphic }>('/graphics', {
      method: 'POST',
      body: JSON.stringify(graphic),
    }),

  updateStudioGraphic: (id: string, graphic: Partial<StudioGraphic>) =>
    request<{ message: string; graphic: StudioGraphic }>(`/graphics/${id}`, {
      method: 'PUT',
      body: JSON.stringify(graphic),
    }),

  deleteStudioGraphic: (id: string) =>
    request<{ message: string; id: string }>(`/graphics/${id}`, {
      method: 'DELETE',
    }),

  duplicateStudioGraphic: (id: string, name?: string) =>
    request<{ message: string; graphic: StudioGraphic }>(`/graphics/${id}/duplicate`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  activateStudioGraphic: (id: string) =>
    request<{ message: string; graphic: StudioGraphic }>(`/graphics/${id}/activate`, {
      method: 'POST',
    }),

  deactivateStudioGraphic: (id: string) =>
    request<{ message: string; graphic: StudioGraphic }>(`/graphics/${id}/deactivate`, {
      method: 'POST',
    }),

  getStudioGraphicPresets: () =>
    request<{ presets: StudioGraphicPreset[] }>('/graphics/presets'),

  createStudioGraphicPreset: (data: { name: string; sport?: string; category?: string; description?: string; graphic: any }) =>
    request<{ message: string; preset: any }>('/graphics/presets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getDynamicFieldsCatalog: () =>
    request<{ dynamicFields: any[]; sportsCategories: Record<string, string[]> }>('/graphics/dynamic-fields'),

  getContextMatches: () =>
    request<{
      matches: Array<{
        id: string;
        name: string;
        sport: string;
        status: string;
        teamAName: string;
        teamBName: string;
        teamALogo?: string;
        teamBLogo?: string;
        tournamentName?: string;
        date?: string;
        time?: string;
        venue?: string;
      }>;
    }>('/graphics/context/matches'),

  getMatchDataContext: (matchId: string) =>
    request<{
      context: {
        matchId: string;
        sport: string;
        matchTitle: string;
        status: string;
        variables: Record<string, string>;
        imageVariables: Record<string, string>;
        fallbackImages: Record<string, string>;
        lastUpdated: string;
      };
    }>(`/graphics/context/match/${matchId}`),

  getSampleDataContext: (sport: string) =>
    request<{
      context: {
        sport: string;
        matchTitle: string;
        status: string;
        variables: Record<string, string>;
        imageVariables: Record<string, string>;
        fallbackImages: Record<string, string>;
        lastUpdated: string;
      };
    }>(`/graphics/context/sample/${sport}`),

  resolveGraphicWithContext: (graphic: StudioGraphic, matchId?: string, customData?: Record<string, string>) =>
    request<{ graphic: StudioGraphic; context: any }>('/graphics/resolve', {
      method: 'POST',
      body: JSON.stringify({ graphic, matchId, customData }),
    }),

  resetDefaultStudioGraphics: () =>
    request<{ message: string; graphics: StudioGraphic[] }>('/graphics/reset-defaults', {
      method: 'POST',
    }),

  // =========================================================================
  // UNIVERSAL LIVE GRAPHICS ASSIGNMENT, PLAYLIST & ON-AIR SCENE MANAGEMENT
  // =========================================================================
  getGraphicAssignments: (params?: { sport?: string; matchId?: string }) => {
    const query = new URLSearchParams();
    if (params?.sport) query.set('sport', params.sport);
    if (params?.matchId) query.set('matchId', params.matchId);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<{ assignments: GraphicAssignment[]; sport: SportType; matchId?: string }>(`/broadcast/assignments${qs}`);
  },

  saveGraphicAssignments: (assignments: GraphicAssignment[]) =>
    request<{ message: string; assignments: GraphicAssignment[] }>('/broadcast/assignments', {
      method: 'PUT',
      body: JSON.stringify({ assignments }),
    }),

  resetGraphicAssignments: (sport: SportType, matchId?: string) =>
    request<{ message: string; assignments: GraphicAssignment[] }>('/broadcast/assignments/reset-defaults', {
      method: 'POST',
      body: JSON.stringify({ sport, matchId }),
    }),

  getGraphicPlaylists: (params?: { sport?: string; matchId?: string }) => {
    const query = new URLSearchParams();
    if (params?.sport) query.set('sport', params.sport);
    if (params?.matchId) query.set('matchId', params.matchId);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<{ playlists: GraphicPlaylist[] }>(`/broadcast/playlists${qs}`);
  },

  saveGraphicPlaylist: (playlist: Partial<GraphicPlaylist>) =>
    request<{ message: string; playlist: GraphicPlaylist }>('/broadcast/playlists', {
      method: 'POST',
      body: JSON.stringify(playlist),
    }),

  deleteGraphicPlaylist: (playlistId: string) =>
    request<{ message: string }>(`/broadcast/playlists/${playlistId}`, {
      method: 'DELETE',
    }),

  getGraphicScenes: (params?: { sport?: string; matchId?: string }) => {
    const query = new URLSearchParams();
    if (params?.sport) query.set('sport', params.sport);
    if (params?.matchId) query.set('matchId', params.matchId);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<{ scenes: GraphicScene[] }>(`/broadcast/scenes${qs}`);
  },

  saveGraphicScene: (scene: Partial<GraphicScene>) =>
    request<{ message: string; scene: GraphicScene }>('/broadcast/scenes', {
      method: 'POST',
      body: JSON.stringify(scene),
    }),

  deleteGraphicScene: (sceneId: string) =>
    request<{ message: string }>(`/broadcast/scenes/${sceneId}`, {
      method: 'DELETE',
    }),

  // On-Air Console Transport
  getOnAirState: (matchId: string) =>
    request<{ state: OnAirState }>(`/broadcast/onair/${matchId}`),

  setOnAirPreview: (matchId: string, item: Partial<OnAirGraphicItem>) =>
    request<{ message: string; state: OnAirState }>(`/broadcast/onair/${matchId}/preview`, {
      method: 'POST',
      body: JSON.stringify(item),
    }),

  cueGraphic: (matchId: string, item: Partial<OnAirGraphicItem>) =>
    request<{ message: string; state: OnAirState }>(`/broadcast/onair/${matchId}/cue`, {
      method: 'POST',
      body: JSON.stringify(item),
    }),

  playGraphic: (matchId: string, item: Partial<OnAirGraphicItem>) =>
    request<{ message: string; state: OnAirState }>(`/broadcast/onair/${matchId}/play`, {
      method: 'POST',
      body: JSON.stringify(item),
    }),

  stopGraphic: (matchId: string, graphicId: string) =>
    request<{ message: string; state: OnAirState }>(`/broadcast/onair/${matchId}/stop-graphic`, {
      method: 'POST',
      body: JSON.stringify({ graphicId }),
    }),

  takeLiveOnAir: (matchId: string, item?: Partial<OnAirGraphicItem>) =>
    request<{ message: string; state: OnAirState }>(`/broadcast/onair/${matchId}/take`, {
      method: 'POST',
      body: JSON.stringify(item || {}),
    }),

  holdOnAir: (matchId: string) =>
    request<{ message: string; state: OnAirState }>(`/broadcast/onair/${matchId}/hold`, {
      method: 'POST',
    }),

  clearOnAir: (matchId: string) =>
    request<{ message: string; state: OnAirState }>(`/broadcast/onair/${matchId}/clear`, {
      method: 'POST',
    }),

  replayOnAir: (matchId: string) =>
    request<{ message: string; state: OnAirState }>(`/broadcast/onair/${matchId}/replay`, {
      method: 'POST',
    }),

  nextOnAir: (matchId: string) =>
    request<{ message: string; state: OnAirState }>(`/broadcast/onair/${matchId}/next`, {
      method: 'POST',
    }),

  skipOnAir: (matchId: string, index?: number) =>
    request<{ message: string; state: OnAirState }>(`/broadcast/onair/${matchId}/skip`, {
      method: 'POST',
      body: JSON.stringify({ index }),
    }),

  stopOnAir: (matchId: string) =>
    request<{ message: string; state: OnAirState }>(`/broadcast/onair/${matchId}/stop`, {
      method: 'POST',
    }),

  triggerOnAirEvent: (
    matchId: string,
    params: { sport: SportType; targetId: string; isManual?: boolean; previewOnly?: boolean; eventData?: any; broadcastEventId?: string }
  ) =>
    request<{ message: string; result: any; state: OnAirState }>(`/broadcast/onair/${matchId}/trigger-event`, {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  triggerManualEvent: (
    matchId: string,
    params: { sport: SportType; targetId: string; isManual?: boolean; previewOnly?: boolean; eventData?: any; broadcastEventId?: string }
  ) =>
    request<{ message: string; result: any; state: OnAirState }>(`/broadcast/onair/${matchId}/trigger-event`, {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  triggerEventAssignment: (
    matchId: string,
    params: { sport: SportType; targetId: string; isManual?: boolean; previewOnly?: boolean; eventData?: any; broadcastEventId?: string }
  ) =>
    request<{ message?: string; result?: any; state?: OnAirState }>(`/broadcast/onair/${matchId}/trigger-event`, {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  setBroadcastOperatorLock: (matchId: string, locked: boolean) =>
    request<{ message: string; state: OnAirState }>(`/broadcast/onair/${matchId}/lock`, {
      method: 'POST',
      body: JSON.stringify({ locked }),
    }),

  getBroadcastAuditLogs: (matchId?: string) => {
    const qs = matchId ? `?matchId=${encodeURIComponent(matchId)}` : '';
    return request<{ auditLogs: BroadcastAuditLog[] }>(`/broadcast/audit-logs${qs}`);
  },

  // ==========================================
  // CUSTOM SPORT ENGINE API METHODS
  // ==========================================
  getCustomSports: () =>
    request<{ customSports: CustomSport[] }>('/custom-sports'),

  getCustomSportPresets: () =>
    request<{ presets: CustomSport[] }>('/custom-sports/presets'),

  getCustomSport: (id: string) =>
    request<{ customSport: CustomSport }>(`/custom-sports/${id}`),

  createCustomSport: (sport: Partial<CustomSport>) =>
    request<{ message: string; customSport: CustomSport }>('/custom-sports', {
      method: 'POST',
      body: JSON.stringify(sport),
    }),

  updateCustomSport: (id: string, sport: Partial<CustomSport>) =>
    request<{ message: string; customSport: CustomSport }>(`/custom-sports/${id}`, {
      method: 'PUT',
      body: JSON.stringify(sport),
    }),

  duplicateCustomSport: (id: string) =>
    request<{ message: string; customSport: CustomSport }>(`/custom-sports/${id}/duplicate`, {
      method: 'POST',
    }),

  deleteCustomSport: (id: string) =>
    request<{ message: string }>(`/custom-sports/${id}`, {
      method: 'DELETE',
    }),

  // Custom Sport Live Scoring
  getCustomSportScoringState: (matchId: string) =>
    request<{ state: CustomMatchScoringState }>(`/matches/${matchId}/scoring`),

  recordCustomSportEvent: (matchId: string, data: any) =>
    request<{ message: string; event: CustomScoringEvent; state: CustomMatchScoringState }>(
      `/matches/${matchId}/scoring/custom/record-event`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),

  undoCustomSportEvent: (matchId: string) =>
    request<{ message: string; state: CustomMatchScoringState; undoneEvent: CustomScoringEvent }>(
      `/matches/${matchId}/scoring/custom/undo`,
      {
        method: 'POST',
      }
    ),

  editCustomSportEvent: (matchId: string, data: any) =>
    request<{ message: string; state: CustomMatchScoringState; event: CustomScoringEvent }>(
      `/matches/${matchId}/scoring/custom/edit-event`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),

  deleteCustomSportEvent: (matchId: string, data: { eventId: string }) =>
    request<{ message: string; state: CustomMatchScoringState }>(
      `/matches/${matchId}/scoring/custom/delete-event`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),

  updateCustomSportClock: (matchId: string, data: any) =>
    request<{ message: string; state: CustomMatchScoringState; clock: any }>(
      `/matches/${matchId}/scoring/custom/clock`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),

  recordCustomSportTimeout: (matchId: string, data: any) =>
    request<{ message: string; timeout: CustomTimeoutRecord; state: CustomMatchScoringState }>(
      `/matches/${matchId}/scoring/custom/timeout`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),

  recordCustomSportSubstitution: (matchId: string, data: any) =>
    request<{ message: string; substitution: CustomSubstitutionRecord; state: CustomMatchScoringState }>(
      `/matches/${matchId}/scoring/custom/substitution`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),

  transitionCustomSportPeriod: (matchId: string, data: { targetPeriod: number }) =>
    request<{ message: string; state: CustomMatchScoringState }>(
      `/matches/${matchId}/scoring/custom/period`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),

  completeCustomSportMatch: (matchId: string) =>
    request<{ message: string; state: CustomMatchScoringState }>(
      `/matches/${matchId}/scoring/custom/complete`,
      {
        method: 'POST',
      }
    ),
};

export const auctionApi = {
  // Auctions
  getAuctions: () =>
    request<{ auctions: (Auction & { teamsCount: number; playersCount: number; soldCount: number; unsoldCount: number; totalSpent: number })[] }>('/auctions'),

  getAuction: (id: string) =>
    request<{
      auction: Auction;
      teams: AuctionTeam[];
      playersCount: number;
      soldCount: number;
      unsoldCount: number;
      retainedCount: number;
    }>(`/auctions/${id}`),

  createAuction: (data: Partial<Auction>) =>
    request<{ message: string; auction: Auction }>('/auctions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateAuction: (id: string, data: Partial<Auction>) =>
    request<{ message: string; auction: Auction }>(`/auctions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteAuction: (id: string) =>
    request<{ message: string }>(`/auctions/${id}`, {
      method: 'DELETE',
    }),

  duplicateAuction: (id: string) =>
    request<{ message: string; auction: Auction }>(`/auctions/${id}/duplicate`, {
      method: 'POST',
    }),

  // Teams
  getTeams: (auctionId: string) =>
    request<{ teams: AuctionTeam[] }>(`/auctions/${auctionId}/teams`),

  createTeam: (auctionId: string, data: Partial<AuctionTeam>) =>
    request<{ message: string; team: AuctionTeam }>(`/auctions/${auctionId}/teams`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTeam: (auctionId: string, teamId: string, data: Partial<AuctionTeam>) =>
    request<{ message: string; team: AuctionTeam }>(`/auctions/${auctionId}/teams/${teamId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteTeam: (auctionId: string, teamId: string) =>
    request<{ message: string }>(`/auctions/${auctionId}/teams/${teamId}`, {
      method: 'DELETE',
    }),

  // Players
  getPlayers: (
    auctionId: string,
    params?: { category?: string; role?: string; status?: string; search?: string }
  ) => {
    const query = new URLSearchParams(params as any).toString();
    return request<{ players: AuctionPlayer[] }>(`/auctions/${auctionId}/players${query ? `?${query}` : ''}`);
  },

  createPlayer: (auctionId: string, data: Partial<AuctionPlayer>) =>
    request<{ message: string; player: AuctionPlayer }>(`/auctions/${auctionId}/players`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updatePlayer: (auctionId: string, playerId: string, data: Partial<AuctionPlayer>) =>
    request<{ message: string; player: AuctionPlayer }>(`/auctions/${auctionId}/players/${playerId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deletePlayer: (auctionId: string, playerId: string) =>
    request<{ message: string }>(`/auctions/${auctionId}/players/${playerId}`, {
      method: 'DELETE',
    }),

  importPlayers: (auctionId: string, players: any[]) =>
    request<{
      message: string;
      addedCount: number;
      skippedDuplicates: number;
      players: AuctionPlayer[];
    }>(`/auctions/${auctionId}/players/import`, {
      method: 'POST',
      body: JSON.stringify({ players }),
    }),

  // Retained
  getRetainedPlayers: (auctionId: string) =>
    request<{ retained: AuctionRetainedPlayer[] }>(`/auctions/${auctionId}/retained`),

  addRetainedPlayer: (auctionId: string, data: { playerId: string; teamId: string; retentionPrice?: number }) =>
    request<{ message: string; retainedRecord: AuctionRetainedPlayer }>(`/auctions/${auctionId}/retained`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  removeRetainedPlayer: (auctionId: string, retainedId: string) =>
    request<{ message: string }>(`/auctions/${auctionId}/retained/${retainedId}`, {
      method: 'DELETE',
    }),

  // Live Auction Room & Actions
  getLiveState: (auctionId: string) =>
    request<{ state: AuctionLiveState }>(`/auctions/${auctionId}/state`),

  getPublicLiveState: (auctionId: string) =>
    request<{ state: AuctionLiveState }>(`/auctions/${auctionId}/public`),

  setCurrentPlayer: (auctionId: string, playerId: string) =>
    request<{ message: string; state: AuctionLiveState }>(`/auctions/${auctionId}/set-current-player`, {
      method: 'POST',
      body: JSON.stringify({ playerId }),
    }),

  placeBid: (auctionId: string, teamId: string, customAmount?: number) =>
    request<{ message: string; bid: AuctionBid; state: AuctionLiveState }>(`/auctions/${auctionId}/bid`, {
      method: 'POST',
      body: JSON.stringify({ teamId, customAmount }),
    }),

  withdrawBid: (auctionId: string) =>
    request<{ message: string; state: AuctionLiveState }>(`/auctions/${auctionId}/withdraw-bid`, {
      method: 'POST',
    }),

  sellCurrentPlayer: (auctionId: string) =>
    request<{ message: string; result: AuctionResult; state: AuctionLiveState }>(`/auctions/${auctionId}/sell`, {
      method: 'POST',
    }),

  markCurrentPlayerUnsold: (auctionId: string, reason?: string) =>
    request<{ message: string; result: AuctionResult; state: AuctionLiveState }>(`/auctions/${auctionId}/unsold`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  reAuctionPlayer: (auctionId: string, playerId: string, newBasePrice?: number) =>
    request<{ message: string; player: AuctionPlayer }>(`/auctions/${auctionId}/reauction`, {
      method: 'POST',
      body: JSON.stringify({ playerId, newBasePrice }),
    }),

  startTimer: (auctionId: string, seconds?: number) =>
    request<{ message: string }>(`/auctions/${auctionId}/timer/start`, {
      method: 'POST',
      body: JSON.stringify({ seconds }),
    }),

  stopTimer: (auctionId: string) =>
    request<{ message: string }>(`/auctions/${auctionId}/timer/stop`, {
      method: 'POST',
    }),

  pauseAuction: (auctionId: string) =>
    request<{ message: string; state: AuctionLiveState }>(`/auctions/${auctionId}/pause`, {
      method: 'POST',
    }),

  resumeAuction: (auctionId: string) =>
    request<{ message: string; state: AuctionLiveState }>(`/auctions/${auctionId}/resume`, {
      method: 'POST',
    }),

  completeAuction: (auctionId: string) =>
    request<{ message: string; state: AuctionLiveState }>(`/auctions/${auctionId}/complete`, {
      method: 'POST',
    }),

  // Graphics
  getGraphics: (auctionId: string) =>
    request<{ graphics: AuctionGraphicConfig[] }>(`/auctions/${auctionId}/graphics`),

  saveGraphic: (auctionId: string, data: Partial<AuctionGraphicConfig>) =>
    request<{ message: string; graphic: AuctionGraphicConfig }>(`/auctions/${auctionId}/graphics`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  triggerGraphic: (auctionId: string, options: { graphicId?: string; graphicType?: string }) =>
    request<{ message: string; graphic?: AuctionGraphicConfig }>(`/auctions/${auctionId}/graphics/trigger`, {
      method: 'POST',
      body: JSON.stringify(options),
    }),

  clearGraphic: (auctionId: string) =>
    request<{ message: string }>(`/auctions/${auctionId}/graphics/clear`, {
      method: 'POST',
    }),

  // Reports & Logs
  getReports: (auctionId: string) =>
    request<{ reports: AuctionReportsSummary }>(`/auctions/${auctionId}/reports`),

  getAuditLogs: (auctionId: string) =>
    request<{ logs: AuctionAuditLog[] }>(`/auctions/${auctionId}/audit-logs`),
};
