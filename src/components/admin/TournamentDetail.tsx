import React, { useState, useEffect } from 'react';
import { Breadcrumbs } from '../ui/Breadcrumbs';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import {
  Tournament,
  Group,
  Team,
  Player,
  Match,
  TournamentGroupStandings,
  TournamentStandingRow,
  KnockoutBracket,
  TournamentStatisticsSummary,
  TournamentLeaderStat,
  TournamentAwardItem,
} from '../../types';
import { SPORTS_MASTER } from '../../constants/sports';
import { api } from '../../services/api';
import { FixtureGeneratorModal } from './FixtureGeneratorModal';
import { FixtureEditModal } from './FixtureEditModal';
import { TeamDistributionModal } from './TeamDistributionModal';
import { KnockoutGeneratorModal } from './KnockoutGeneratorModal';
import { TournamentAwardModal } from './TournamentAwardModal';
import { TeamSheetScannerModal } from './teams/TeamSheetScannerModal';
import { TournamentStandingsManager } from './TournamentStandingsManager';
import { TournamentBracketView } from './TournamentBracketView';
import { TournamentLiveDashboardView } from './TournamentLiveDashboardView';
import { TournamentAwardsManager } from './TournamentAwardsManager';
import { TournamentRecordsCenterView } from './TournamentRecordsCenterView';
import { TournamentHallOfFameView } from './TournamentHallOfFameView';
import { TournamentPresentationConsoleModal } from './TournamentPresentationConsoleModal';
import { TournamentAclManager } from './TournamentAclManager';
import { useAuth } from '../../services/authContext';
import {
  Trophy,
  Layers,
  Users,
  Calendar,
  MapPin,
  AlertCircle,
  BarChart3,
  Radio,
  RefreshCw,
  Sparkles,
  GitMerge,
  Award,
  Activity,
  Play,
  CheckCircle2,
  Trash2,
  Copy,
  ExternalLink,
  Plus,
  Edit3,
  Shuffle,
  Shield,
  Clock,
  Filter,
  Search,
  Check,
  ChevronRight,
  TrendingUp,
  Flame,
  Star,
  Tv,
  Camera,
  Swords,
  Palette,
  FileBarChart,
  Eye,
  UserPlus,
} from 'lucide-react';

export interface TournamentDetailProps {
  tournamentId: string;
  onBackToTournaments: () => void;
  onOpenTeam: (teamId: string) => void;
  onEditTournament: (tournament: Tournament) => void;
  onCreateGroup: () => void;
  onEditGroup: (group: Group) => void;
  onDeleteGroup: (group: Group) => void;
  onCreateTeam: (defaultGroupId?: string) => void;
  onEditTeam: (team: Team) => void;
  onDeleteTeam: (team: Team) => void;
  onAddPlayer: (teamId: string) => void;
  onOpenPlayer: (player: Player) => void;
  onAddMatch?: (groupId?: string) => void;
  onOpenMatchScoring?: (matchId: string) => void;
  refreshTrigger?: number;
}

export const TournamentDetail: React.FC<TournamentDetailProps> = ({
  tournamentId,
  onBackToTournaments,
  onOpenTeam,
  onEditTournament,
  onCreateGroup,
  onEditGroup,
  onDeleteGroup,
  onCreateTeam,
  onEditTeam,
  onDeleteTeam,
  onAddPlayer,
  onOpenPlayer,
  onAddMatch,
  onOpenMatchScoring,
  refreshTrigger,
}) => {
  const [data, setData] = useState<{
    tournament: Tournament | null;
    groups: Group[];
    teams: Team[];
    players: Player[];
    matches: Match[];
    bracket?: KnockoutBracket;
  }>({
    tournament: null,
    groups: [],
    teams: [],
    players: [],
    matches: [],
  });

  const [standings, setStandings] = useState<{
    groups: TournamentGroupStandings[];
    overall: TournamentStandingRow[];
  }>({ groups: [], overall: [] });

  const [statistics, setStatistics] = useState<TournamentStatisticsSummary | null>(null);
  const [awards, setAwards] = useState<TournamentAwardItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'OVERVIEW' | 'COMPETITION' | 'TEAMS' | 'MATCHES' | 'GRAPHICS' | 'REPORTS' | 'ACL' | 'DASHBOARD' | 'GROUPS' | 'STANDINGS' | 'FIXTURES' | 'KNOCKOUT' | 'STATISTICS' | 'AWARDS' | 'RECORDS' | 'HALL_OF_FAME' | 'BROADCAST'
  >('OVERVIEW');
  const [competitionSubTab, setCompetitionSubTab] = useState<'GROUPS' | 'FIXTURES' | 'STANDINGS' | 'KNOCKOUT'>('GROUPS');
  const [reportsSubTab, setReportsSubTab] = useState<'STATISTICS' | 'AWARDS' | 'RECORDS' | 'HALL_OF_FAME'>('STATISTICS');
  const [matchesStatusFilter, setMatchesStatusFilter] = useState<'ALL' | 'UPCOMING' | 'LIVE' | 'COMPLETED'>('ALL');

  // Modals state
  const [isFixtureModalOpen, setIsFixtureModalOpen] = useState(false);
  const [editingFixtureMatch, setEditingFixtureMatch] = useState<Match | null>(null);
  const [isDistributionModalOpen, setIsDistributionModalOpen] = useState(false);
  const [isKnockoutModalOpen, setIsKnockoutModalOpen] = useState(false);
  const [isAwardModalOpen, setIsAwardModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isPresentationConsoleOpen, setIsPresentationConsoleOpen] = useState(false);

  // Fixtures filtering
  const [fixtureGroupFilter, setFixtureGroupFilter] = useState<string>('ALL');
  const [fixtureStatusFilter, setFixtureStatusFilter] = useState<string>('ALL');
  const [fixtureRoundFilter, setFixtureRoundFilter] = useState<string>('ALL');
  const [fixtureSearchQuery, setFixtureSearchQuery] = useState<string>('');
  const [copiedMatchLink, setCopiedMatchLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Group quick team assignment state
  const [selectedUnassignedTeam, setSelectedUnassignedTeam] = useState<{ [groupId: string]: string }>({});

  const fetchAllTournamentData = async () => {
    try {
      setLoading(true);
      const [detailRes, standingsRes, statsRes, awardsRes] = await Promise.all([
        api.getTournament(tournamentId),
        api.getTournamentStandings(tournamentId).catch(() => ({ groups: [], overall: [] })),
        api.getTournamentStatistics(tournamentId).catch(() => ({ statistics: null as any })),
        api.getTournamentAwards(tournamentId).catch(() => ({ awards: [] })),
      ]);

      setData({
        tournament: detailRes.tournament,
        groups: detailRes.groups || [],
        teams: detailRes.teams || [],
        players: detailRes.players || [],
        matches: (detailRes as any).matches || [],
        bracket: (detailRes as any).bracket,
      });

      setStandings(standingsRes);
      if (statsRes.statistics) setStatistics(statsRes.statistics);
      if (awardsRes.awards) setAwards(awardsRes.awards);
    } catch (err) {
      console.error('Failed to load tournament detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllTournamentData();
  }, [tournamentId, refreshTrigger]);

  const handleRecalculateStandings = async () => {
    try {
      const res = await api.recalculateStandings(tournamentId);
      setStandings({ groups: res.groups, overall: res.overall });
      fetchAllTournamentData();
    } catch (err) {
      console.error('Failed to recalculate standings:', err);
    }
  };

  const handleAssignTeamToGroup = async (groupId: string, teamId: string) => {
    if (!teamId) return;
    try {
      await api.assignTeamsToGroup(tournamentId, groupId, teamId);
      setSelectedUnassignedTeam((prev) => ({ ...prev, [groupId]: '' }));
      fetchAllTournamentData();
    } catch (err: any) {
      alert(err.message || 'Failed to assign team');
    }
  };

  const handleRemoveTeamFromGroup = async (groupId: string, teamId: string) => {
    try {
      await api.removeTeamFromGroup(tournamentId, groupId, teamId);
      fetchAllTournamentData();
    } catch (err: any) {
      alert(err.message || 'Failed to remove team');
    }
  };

  const handleClearAllFixtures = async () => {
    if (!window.confirm('Are you sure you want to clear all unplayed fixtures for this tournament? LIVE and COMPLETED matches will not be affected.')) return;
    try {
      await api.clearAllTournamentFixtures(tournamentId);
      fetchAllTournamentData();
    } catch (err: any) {
      alert(err.message || 'Failed to clear fixtures');
    }
  };

  const handleDeleteSingleFixture = async (matchId: string, matchTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete fixture "${matchTitle}"?`)) return;
    try {
      await api.deleteTournamentFixture(tournamentId, matchId);
      fetchAllTournamentData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete fixture');
    }
  };

  const handleCopyMatchBroadcastUrl = (matchId: string) => {
    const url = `${window.location.origin}/broadcast/match/${matchId}`;
    navigator.clipboard.writeText(url);
    setCopiedMatchLink(matchId);
    setTimeout(() => setCopiedMatchLink(null), 2000);
  };

  const handleCopyBroadcastUrl = (overlayType: string = 'standings') => {
    const url = `${window.location.origin}/broadcast/overlay?tournamentId=${tournamentId}&view=${overlayType}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading || !data.tournament) {
    return (
      <div className="py-20 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
        <p className="text-xs font-semibold text-slate-400">Loading Tournament Management Engine...</p>
      </div>
    );
  }

  const { tournament, groups, teams, players, matches, bracket } = data;
  const sportConfig = SPORTS_MASTER[tournament.sport] || SPORTS_MASTER.OTHER;
  const unassignedTeams = teams.filter((t) => !t.groupId);

  // Extract distinct rounds for filtering
  const distinctRounds = Array.from(new Set(matches.map((m) => m.round).filter(Boolean))) as string[];

  // User permission calculation
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const isOwner = tournament?.ownerUserId === user?.id || tournament?.createdByUserId === user?.id;
  const userCollab = tournament?.collaborators?.find((c) => c.userId === user?.id || (user?.email && c.email === user.email));
  const isManager = isOwner || userCollab?.role === 'MANAGER';
  const isViewer = !isAdmin && !isManager && userCollab?.role === 'VIEWER';
  const canManage = isAdmin || isManager;

  // Filtered fixtures
  const filteredMatches = matches.filter((m) => {
    const matchesGroup = fixtureGroupFilter === 'ALL' || m.groupId === fixtureGroupFilter;
    const matchesStatus =
      fixtureStatusFilter === 'ALL'
        ? true
        : fixtureStatusFilter === 'UPCOMING'
        ? m.status === 'SCHEDULED' || m.status === 'DRAFT'
        : m.status === fixtureStatusFilter;
    const matchesRound = fixtureRoundFilter === 'ALL' || m.round === fixtureRoundFilter;
    const q = fixtureSearchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      m.teamA?.name?.toLowerCase().includes(q) ||
      m.teamB?.name?.toLowerCase().includes(q) ||
      m.venue?.toLowerCase().includes(q) ||
      m.matchNumber?.toLowerCase().includes(q) ||
      m.round?.toLowerCase().includes(q) ||
      m.name?.toLowerCase().includes(q);

    return matchesGroup && matchesStatus && matchesRound && matchesSearch;
  });

  // Navigation mapping to 6 clean tabs
  const activeMainTab: 'OVERVIEW' | 'COMPETITION' | 'TEAMS' | 'MATCHES' | 'GRAPHICS' | 'REPORTS' | 'ACL' =
    activeTab === 'DASHBOARD' || activeTab === 'OVERVIEW'
      ? 'OVERVIEW'
      : ['GROUPS', 'FIXTURES', 'STANDINGS', 'KNOCKOUT', 'COMPETITION'].includes(activeTab)
      ? 'COMPETITION'
      : activeTab === 'TEAMS'
      ? 'TEAMS'
      : activeTab === 'MATCHES'
      ? 'MATCHES'
      : activeTab === 'BROADCAST' || activeTab === 'GRAPHICS'
      ? 'GRAPHICS'
      : ['STATISTICS', 'AWARDS', 'RECORDS', 'HALL_OF_FAME', 'REPORTS'].includes(activeTab)
      ? 'REPORTS'
      : (activeTab as any);

  const currentCompSubTab = ['GROUPS', 'FIXTURES', 'STANDINGS', 'KNOCKOUT'].includes(activeTab)
    ? (activeTab as 'GROUPS' | 'FIXTURES' | 'STANDINGS' | 'KNOCKOUT')
    : competitionSubTab;

  const currentReportsSubTab = ['STATISTICS', 'AWARDS', 'RECORDS', 'HALL_OF_FAME'].includes(activeTab)
    ? (activeTab as 'STATISTICS' | 'AWARDS' | 'RECORDS' | 'HALL_OF_FAME')
    : reportsSubTab;

  const upcomingMatches = matches.filter((m) => ['SCHEDULED', 'DRAFT', 'READY'].includes(m.status));
  const liveMatches = matches.filter((m) => m.status === 'LIVE');
  const completedMatches = matches.filter((m) => m.status === 'COMPLETED');

  const displayedMatches =
    matchesStatusFilter === 'ALL'
      ? matches
      : matchesStatusFilter === 'UPCOMING'
      ? upcomingMatches
      : matchesStatusFilter === 'LIVE'
      ? liveMatches
      : completedMatches;

  return (
    <div className="space-y-6 pb-12">
      {/* Breadcrumbs Navigation */}
      <Breadcrumbs
        items={[
          { label: 'Admin Console' },
          { label: 'Tournaments', onClick: onBackToTournaments },
          { label: tournament.name },
        ]}
      />

      {/* Tournament Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            {tournament.logoUrl ? (
              <img
                src={tournament.logoUrl}
                alt={tournament.name}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-xl object-cover bg-slate-950 border border-slate-700 shadow-md shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Trophy className="w-8 h-8" />
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
                  {tournament.name}
                </h1>
                <Badge variant="emerald" className="font-bold">
                  {sportConfig.icon} {sportConfig.name}
                </Badge>
                <Badge
                  variant={
                    tournament.status === 'LIVE'
                      ? 'emerald'
                      : tournament.status === 'COMPLETED'
                      ? 'secondary'
                      : 'warning'
                  }
                >
                  {tournament.status}
                </Badge>
                {tournament.competitionFormat && (
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {tournament.competitionFormat.replace('_', ' ')}
                  </span>
                )}
                {isViewer && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/30">
                    Role: Viewer (Read-only)
                  </span>
                )}
                {isManager && !isOwner && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Role: Manager
                  </span>
                )}
                {isOwner && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Role: Owner
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-400">
                <span className="flex items-center gap-1 text-slate-300">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  Owner: <strong className="text-white">{(tournament as any).ownerUser?.name || (tournament as any).ownerUser?.email || (isOwner ? (user?.name || user?.email || 'You') : (tournament.ownerUserId || 'Organizer'))}</strong>
                </span>

                {(tournament.startDate || tournament.endDate) ? (
                  <span className="flex items-center gap-1 text-slate-300">
                    <Calendar className="w-3.5 h-3.5 text-blue-400" />
                    {tournament.startDate} {tournament.endDate ? `to ${tournament.endDate}` : ''}
                  </span>
                ) : tournament.season ? (
                  <span className="flex items-center gap-1 text-slate-400">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    Season {tournament.season}
                  </span>
                ) : null}

                {(tournament.venue || tournament.location) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    {tournament.venue || tournament.location}
                  </span>
                )}
                {tournament.organizer && (
                  <span className="text-slate-400 font-medium">
                    Organizer: <span className="text-slate-200">{tournament.organizer}</span>
                  </span>
                )}
                {tournament.sponsor && (
                  <span className="text-amber-400 font-medium">
                    Presented by {tournament.sponsor}
                  </span>
                )}
              </div>

              {tournament.description && (
                <p className="text-xs text-slate-400 max-w-2xl line-clamp-2 pt-0.5">
                  {tournament.description}
                </p>
              )}
            </div>
          </div>

          {/* Quick Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {canManage && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onEditTournament(tournament)}
                  icon={<Edit3 className="w-3.5 h-3.5" />}
                >
                  Edit Details
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsFixtureModalOpen(true)}
                  icon={<Calendar className="w-3.5 h-3.5 text-emerald-400" />}
                >
                  Generate Fixtures
                </Button>
              </>
            )}
            <Button
              variant="emerald"
              size="sm"
              onClick={() => handleCopyBroadcastUrl('standings')}
              icon={copiedLink ? <Check className="w-3.5 h-3.5" /> : <Tv className="w-3.5 h-3.5" />}
            >
              {copiedLink ? 'Copied Overlay URL' : 'Broadcast Overlay'}
            </Button>
          </div>
        </div>

        {/* Tournament Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-6 pt-4 border-t border-slate-800/80">
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Groups</span>
            <span className="text-lg font-black text-slate-100">{groups.length}</span>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Teams</span>
            <span className="text-lg font-black text-slate-100">{teams.length}</span>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Players</span>
            <span className="text-lg font-black text-slate-100">{players.length}</span>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Matches</span>
            <span className="text-lg font-black text-slate-100">{matches.length}</span>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Completed</span>
            <span className="text-lg font-black text-emerald-400">
              {matches.filter((m) => m.status === 'COMPLETED').length}
            </span>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Live Matches</span>
            <span className="text-lg font-black text-amber-400">
              {matches.filter((m) => m.status === 'LIVE').length}
            </span>
          </div>
        </div>
      </div>

      {/* 6 Simplified Primary Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-800 overflow-x-auto pb-px">
        {[
          { id: 'OVERVIEW', label: 'Overview', icon: Trophy },
          { id: 'COMPETITION', label: 'Competition', icon: Layers },
          { id: 'TEAMS', label: 'Teams', icon: Users, count: teams.length },
          { id: 'MATCHES', label: 'Matches', icon: Swords, count: matches.length },
          { id: 'GRAPHICS', label: 'Graphics', icon: Palette },
          { id: 'REPORTS', label: 'Reports', icon: FileBarChart },
          ...(canManage ? [{ id: 'ACL', label: 'Staff (ACL)', icon: Shield }] : []),
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeMainTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold whitespace-nowrap transition-all border-b-2 cursor-pointer ${
                isActive
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* COMPETITION SUB-NAV */}
      {activeMainTab === 'COMPETITION' && (
        <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-900 border border-slate-800 overflow-x-auto">
          {[
            { id: 'GROUPS', label: 'Groups & Leagues', icon: Layers },
            { id: 'FIXTURES', label: 'Fixtures & Schedule', icon: Calendar, count: matches.length },
            { id: 'STANDINGS', label: 'Points Tables / Standings', icon: BarChart3 },
            { id: 'KNOCKOUT', label: 'Knockout & Playoffs', icon: GitMerge },
          ].map((sub) => {
            const SubIcon = sub.icon;
            const isSubActive = currentCompSubTab === sub.id;
            return (
              <button
                key={sub.id}
                onClick={() => {
                  setActiveTab(sub.id as any);
                  setCompetitionSubTab(sub.id as any);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isSubActive
                    ? 'bg-emerald-500 text-slate-950 shadow font-black'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <SubIcon className="w-3.5 h-3.5" />
                <span>{sub.label}</span>
                {typeof sub.count === 'number' && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isSubActive ? 'bg-emerald-950/20 text-emerald-950 font-bold' : 'bg-slate-800 text-slate-400'}`}>
                    {sub.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* REPORTS SUB-NAV */}
      {activeMainTab === 'REPORTS' && (
        <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-900 border border-slate-800 overflow-x-auto">
          {[
            { id: 'STATISTICS', label: 'Player Statistics & Leaders', icon: TrendingUp },
            { id: 'AWARDS', label: 'Awards & Honors', icon: Award },
            { id: 'RECORDS', label: 'Tournament Records', icon: Star },
            { id: 'HALL_OF_FAME', label: 'Hall of Fame & Podium', icon: Trophy },
          ].map((sub) => {
            const SubIcon = sub.icon;
            const isSubActive = currentReportsSubTab === sub.id;
            return (
              <button
                key={sub.id}
                onClick={() => {
                  setActiveTab(sub.id as any);
                  setReportsSubTab(sub.id as any);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isSubActive
                    ? 'bg-emerald-500 text-slate-950 shadow font-black'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <SubIcon className="w-3.5 h-3.5" />
                <span>{sub.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* TAB: OVERVIEW */}
      {activeMainTab === 'OVERVIEW' && (
        <TournamentLiveDashboardView
          tournament={tournament}
          onOpenMatch={onOpenMatchScoring}
          onOpenTeam={onOpenTeam}
          onOpenBracket={() => {
            setActiveTab('KNOCKOUT');
            setCompetitionSubTab('KNOCKOUT');
          }}
          onOpenStandings={() => {
            setActiveTab('STANDINGS');
            setCompetitionSubTab('STANDINGS');
          }}
        />
      )}

      {/* COMPETITION SUBTAB: STANDINGS */}
      {activeMainTab === 'COMPETITION' && currentCompSubTab === 'STANDINGS' && (
        <TournamentStandingsManager
          tournament={tournament}
          standings={standings}
          onRefresh={handleRecalculateStandings}
          onOpenTeam={onOpenTeam}
        />
      )}

      {/* COMPETITION SUBTAB: GROUPS */}
      {activeMainTab === 'COMPETITION' && currentCompSubTab === 'GROUPS' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                Tournament Groups & Team Assignment
              </h2>
              <p className="text-xs text-slate-400">
                Organize teams into official competition groups or auto-distribute using seeding algorithms.
              </p>
            </div>

            {canManage && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsScannerOpen(true)}
                  icon={<Camera className="w-3.5 h-3.5 text-emerald-400" />}
                  className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
                >
                  Scan Team Sheet
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onCreateGroup}
                  icon={<Plus className="w-3.5 h-3.5" />}
                >
                  Add Group
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onCreateTeam()}
                  icon={<Plus className="w-3.5 h-3.5" />}
                >
                  Register Team
                </Button>
                <Button
                  variant="emerald"
                  size="sm"
                  onClick={() => setIsDistributionModalOpen(true)}
                  icon={<Shuffle className="w-3.5 h-3.5" />}
                >
                  Auto-Distribute Teams
                </Button>
              </div>
            )}
          </div>

          {/* Groups Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.map((grp) => {
              const groupTeams = teams.filter((t) => t.groupId === grp.id);
              return (
                <div
                  key={grp.id}
                  className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-4 shadow-lg"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-emerald-400" />
                        <h3 className="text-sm font-bold text-slate-100">{grp.name}</h3>
                        <Badge variant="secondary">{groupTeams.length} Teams</Badge>
                      </div>
                      {grp.description && (
                        <p className="text-[11px] text-slate-400 mt-0.5">{grp.description}</p>
                      )}
                    </div>

                    {canManage && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onEditGroup(grp)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteGroup(grp)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Team List inside Group */}
                  <div className="space-y-2">
                    {groupTeams.length === 0 ? (
                      <p className="text-xs text-slate-500 py-3 text-center">
                        No teams assigned to this group yet.
                      </p>
                    ) : (
                      groupTeams.map((tm) => (
                        <div
                          key={tm.id}
                          className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between hover:border-slate-700 transition-colors"
                        >
                          <div
                            onClick={() => onOpenTeam(tm.id)}
                            className="flex items-center gap-2.5 cursor-pointer flex-1"
                          >
                            {tm.logoUrl ? (
                              <img
                                src={tm.logoUrl}
                                alt={tm.name}
                                referrerPolicy="no-referrer"
                                className="w-6 h-6 rounded-full object-cover bg-slate-900"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-400 font-bold">
                                {tm.shortName || tm.name.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <span className="text-xs font-bold text-slate-200 hover:text-emerald-400">
                                {tm.name}
                              </span>
                              {tm.captain && (
                                <span className="text-[10px] text-slate-400 block">
                                  Capt: {tm.captain}
                                </span>
                              )}
                            </div>
                          </div>

                          {canManage && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleRemoveTeamFromGroup(grp.id, tm.id)}
                                className="text-[10px] px-2 py-1 rounded bg-slate-900 text-slate-400 hover:text-rose-400 border border-slate-800"
                              >
                                Remove
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Quick Assign Dropdown */}
                  {canManage && unassignedTeams.length > 0 && (
                    <div className="pt-2 border-t border-slate-800/60 flex items-center gap-2">
                      <select
                        value={selectedUnassignedTeam[grp.id] || ''}
                        onChange={(e) =>
                          setSelectedUnassignedTeam({
                            ...selectedUnassignedTeam,
                            [grp.id]: e.target.value,
                          })
                        }
                        className="flex-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="">+ Assign Unassigned Team...</option>
                        {unassignedTeams.map((ut) => (
                          <option key={ut.id} value={ut.id}>
                            {ut.name}
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          handleAssignTeamToGroup(grp.id, selectedUnassignedTeam[grp.id])
                        }
                        disabled={!selectedUnassignedTeam[grp.id]}
                      >
                        Assign
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Unassigned Teams Pool */}
          {unassignedTeams.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-950/15 border border-amber-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                    Unassigned Teams Pool ({unassignedTeams.length} Teams)
                  </h3>
                </div>
                <Button
                  variant="emerald"
                  size="sm"
                  onClick={() => setIsDistributionModalOpen(true)}
                  icon={<Shuffle className="w-3.5 h-3.5" />}
                >
                  Distribute All Teams
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {unassignedTeams.map((ut) => (
                  <div
                    key={ut.id}
                    className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-300 flex items-center justify-between"
                  >
                    <span>{ut.name}</span>
                    <button
                      type="button"
                      onClick={() => onOpenTeam(ut.id)}
                      className="text-slate-500 hover:text-slate-300"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* COMPETITION SUBTAB: FIXTURES */}
      {activeMainTab === 'COMPETITION' && currentCompSubTab === 'FIXTURES' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                  Tournament Fixtures & Schedule Management
                </h2>
                <Badge variant="neutral" className="font-mono">
                  {matches.length} matches
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                Deterministic Circle Method fixtures, home/away scheduling, venue allocations, and live scorelinks.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleClearAllFixtures}
                icon={<Trash2 className="w-3.5 h-3.5" />}
              >
                Clear Unplayed
              </Button>
              <Button
                variant="emerald"
                size="sm"
                onClick={() => setIsFixtureModalOpen(true)}
                icon={<Sparkles className="w-3.5 h-3.5" />}
              >
                Generate Round Robin Fixtures
              </Button>
            </div>
          </div>

          {/* Quick Metrics Header */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Fixtures</span>
              <span className="text-lg font-black text-slate-200 font-mono">{matches.length}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Scheduled / Draft</span>
              <span className="text-lg font-black text-emerald-400 font-mono">
                {matches.filter((m) => m.status === 'SCHEDULED' || m.status === 'DRAFT').length}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Live In Progress</span>
              <span className="text-lg font-black text-amber-400 font-mono">
                {matches.filter((m) => m.status === 'LIVE').length}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Completed</span>
              <span className="text-lg font-black text-slate-400 font-mono">
                {matches.filter((m) => m.status === 'COMPLETED').length}
              </span>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-900/60 rounded-xl border border-slate-800">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search team, venue, match #..."
                value={fixtureSearchQuery}
                onChange={(e) => setFixtureSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span>Group:</span>
              <select
                value={fixtureGroupFilter}
                onChange={(e) => setFixtureGroupFilter(e.target.value)}
                className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">All Groups</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            {distinctRounds.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Round:</span>
                <select
                  value={fixtureRoundFilter}
                  onChange={(e) => setFixtureRoundFilter(e.target.value)}
                  className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">All Rounds</option>
                  {distinctRounds.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Status:</span>
              <select
                value={fixtureStatusFilter}
                onChange={(e) => setFixtureStatusFilter(e.target.value)}
                className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="UPCOMING">Upcoming / Scheduled</option>
                <option value="LIVE">Live Now</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>

            <span className="ml-auto text-xs text-slate-400">
              Showing {filteredMatches.length} of {matches.length} fixtures
            </span>
          </div>

          {/* Matches List */}
          {filteredMatches.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/60 rounded-2xl border border-slate-800 space-y-3">
              <Calendar className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-300">No Fixtures Found</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {matches.length === 0
                  ? 'Generate automatic round robin fixtures to populate the match schedule.'
                  : 'No fixtures match the selected search and filter criteria.'}
              </p>
              {matches.length === 0 ? (
                canManage ? (
                  <Button variant="emerald" size="sm" onClick={() => setIsFixtureModalOpen(true)}>
                    Generate Fixtures Now
                  </Button>
                ) : null
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setFixtureGroupFilter('ALL');
                    setFixtureStatusFilter('ALL');
                    setFixtureRoundFilter('ALL');
                    setFixtureSearchQuery('');
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredMatches.map((m) => {
                const groupObj = groups.find((g) => g.id === m.groupId);
                const isScheduled = m.status === 'SCHEDULED' || m.status === 'DRAFT';

                return (
                  <div
                    key={m.id}
                    className={`p-4 rounded-xl border transition-all ${
                      m.status === 'LIVE'
                        ? 'bg-slate-900 border-amber-500/50 shadow-md ring-1 ring-amber-500/20'
                        : m.status === 'COMPLETED'
                        ? 'bg-slate-900/70 border-slate-800'
                        : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    {/* Fixture Header Bar */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800/60 pb-2 mb-3">
                      <div className="flex items-center gap-2">
                        {m.matchNumber && (
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono font-bold text-emerald-400 text-[10px]">
                            {m.matchNumber}
                          </span>
                        )}
                        {m.round && (
                          <span className="font-semibold text-slate-300">
                            {m.round}
                          </span>
                        )}
                        {groupObj && (
                          <span className="text-[10px] text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                            {groupObj.name}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant={
                            m.status === 'LIVE'
                              ? 'warning'
                              : m.status === 'COMPLETED'
                              ? 'secondary'
                              : 'neutral'
                          }
                        >
                          {m.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Teams Matchup Row */}
                    <div className="flex items-center justify-between gap-4 py-2">
                      <div className="text-left flex-1 space-y-0.5">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">
                          Home
                        </span>
                        <div className="font-bold text-xs text-slate-100 flex items-center gap-2">
                          {m.homeTeam?.logoUrl && (
                            <img
                              src={m.homeTeam.logoUrl}
                              alt=""
                              referrerPolicy="no-referrer"
                              className="w-4 h-4 rounded object-cover"
                            />
                          )}
                          <span className="truncate">{m.homeTeam?.name || 'Home Team'}</span>
                        </div>
                      </div>

                      <div className="px-2.5 py-1 bg-slate-900 rounded-lg border border-slate-800 text-[11px] font-mono font-black text-emerald-400 shrink-0">
                        VS
                      </div>

                      <div className="text-right flex-1 space-y-0.5">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">
                          Away
                        </span>
                        <div className="font-bold text-xs text-slate-100 flex items-center justify-end gap-2">
                          <span className="truncate">{m.awayTeam?.name || 'Away Team'}</span>
                          {m.awayTeam?.logoUrl && (
                            <img
                              src={m.awayTeam.logoUrl}
                              alt=""
                              referrerPolicy="no-referrer"
                              className="w-4 h-4 rounded object-cover"
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Match Schedule / Venue Footer */}
                    <div className="flex flex-wrap items-center justify-between pt-3 mt-2 border-t border-slate-800/60 text-[10px] text-slate-400 gap-2">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        {(m.scheduledDate || m.date) && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            <span>{m.scheduledDate || m.date}</span>
                          </div>
                        )}
                        {(m.scheduledTime || m.time) && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            <span>{m.scheduledTime || m.time}</span>
                          </div>
                        )}
                        {m.venue && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-500" />
                            <span>
                              {m.venue} {m.ground ? `(${m.ground})` : ''}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons Toolbar */}
                      <div className="flex items-center gap-1.5 ml-auto">
                        {/* Edit Fixture Button */}
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => setEditingFixtureMatch(m)}
                            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors"
                            title="Edit Fixture Details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Copy Broadcast URL */}
                        <button
                          type="button"
                          onClick={() => handleCopyMatchBroadcastUrl(m.id)}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            copiedMatchLink === m.id
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                          }`}
                          title="Copy Match Broadcast URL"
                        >
                          {copiedMatchLink === m.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Tv className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Delete Fixture Button */}
                        {canManage && isScheduled && (
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteSingleFixture(
                                m.id,
                                `${m.homeTeam?.name || 'Home'} vs ${m.awayTeam?.name || 'Away'}`
                              )
                            }
                            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/40 transition-colors"
                            title="Delete Fixture"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Open Scoring / Match Engine */}
                        {onOpenMatchScoring && (
                          <button
                            type="button"
                            onClick={() => onOpenMatchScoring(m.id)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition-colors ml-1"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>{m.status === 'LIVE' ? 'Scoring' : 'Open Match'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* COMPETITION SUBTAB: KNOCKOUT */}
      {activeMainTab === 'COMPETITION' && currentCompSubTab === 'KNOCKOUT' && (
        <TournamentBracketView
          tournament={tournament}
          teams={teams}
          matches={matches}
          bracket={bracket}
          onRefresh={() => {
            fetchAllTournamentData();
          }}
          onOpenMatchScoring={onOpenMatchScoring}
          onEditFixtureMatch={(match) => setEditingFixtureMatch(match)}
        />
      )}

      {/* TAB: TEAMS & ROSTERS */}
      {activeMainTab === 'TEAMS' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                  Tournament Teams & Squad Rosters
                </h2>
                <Badge variant="neutral" className="font-mono">
                  {teams.length} teams
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage registered teams, squad player sheets, roster additions, and athlete credentials.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsScannerOpen(true)}
                icon={<Camera className="w-3.5 h-3.5 text-blue-400" />}
              >
                Scan Team Sheet (OCR)
              </Button>
              {canManage && onCreateTeam && (
                <Button
                  variant="emerald"
                  size="sm"
                  onClick={() => onCreateTeam()}
                  icon={<Plus className="w-3.5 h-3.5" />}
                >
                  Add Team
                </Button>
              )}
            </div>
          </div>

          {/* Teams Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Teams</span>
              <span className="text-lg font-black text-slate-200 font-mono">{teams.length}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Rostered Players</span>
              <span className="text-lg font-black text-emerald-400 font-mono">{players.length}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">In Groups / Leagues</span>
              <span className="text-lg font-black text-blue-400 font-mono">{teams.length - unassignedTeams.length}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Unassigned Teams</span>
              <span className="text-lg font-black text-amber-400 font-mono">{unassignedTeams.length}</span>
            </div>
          </div>

          {/* Teams Grid */}
          {teams.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/60 rounded-2xl border border-slate-800 space-y-3">
              <Users className="w-12 h-12 text-slate-600 mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-300">No teams registered yet</p>
                <p className="text-xs text-slate-400">
                  Register tournament teams and manage squad rosters or scan physical paper team sheets.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                {canManage && onCreateTeam && (
                  <Button variant="emerald" size="sm" onClick={() => onCreateTeam()} icon={<Plus className="w-3.5 h-3.5" />}>
                    Add First Team
                  </Button>
                )}
                <Button variant="secondary" size="sm" onClick={() => setIsScannerOpen(true)} icon={<Camera className="w-3.5 h-3.5" />}>
                  Scan Team Sheet
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map((t) => {
                const teamPlayers = players.filter((p) => p.teamId === t.id);
                const assignedGroup = groups.find((g) => g.id === t.groupId);
                return (
                  <div
                    key={t.id}
                    className="p-4 rounded-2xl bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div>
                      {/* Team Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {t.logoUrl ? (
                            <img
                              src={t.logoUrl}
                              alt=""
                              referrerPolicy="no-referrer"
                              className="w-10 h-10 rounded-xl object-cover border border-slate-700 bg-slate-950 shrink-0"
                            />
                          ) : (
                            <div
                              className="w-10 h-10 rounded-xl border border-slate-700 flex items-center justify-center font-bold text-xs shrink-0"
                              style={{
                                backgroundColor: t.primaryColor || '#10b981',
                                color: '#030712',
                              }}
                            >
                              {t.shortName || t.name.slice(0, 3).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <h3 className="font-bold text-sm text-slate-100 truncate">{t.name}</h3>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                              <span className="font-mono font-bold text-slate-300">
                                {t.shortName || t.code || 'TEAM'}
                              </span>
                              {assignedGroup ? (
                                <Badge variant="emerald" className="text-[9px] py-0 px-1.5">
                                  {assignedGroup.name}
                                </Badge>
                              ) : (
                                <Badge variant="neutral" className="text-[9px] py-0 px-1.5">
                                  Independent
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {canManage && onEditTeam && (
                            <button
                              type="button"
                              onClick={() => onEditTeam(t)}
                              className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors"
                              title="Edit Team"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canManage && onDeleteTeam && (
                            <button
                              type="button"
                              onClick={() => onDeleteTeam(t)}
                              className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/40 transition-colors"
                              title="Delete Team"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Coach & Manager Info */}
                      {(t.coach || t.manager || t.contactPhone || t.contactEmail) && (
                        <div className="mt-3 pt-2.5 border-t border-slate-800/60 text-[11px] text-slate-400 space-y-1">
                          {t.coach && (
                            <div>
                              <span className="text-slate-500 font-medium">Coach:</span>{' '}
                              <span className="text-slate-200">{t.coach}</span>
                            </div>
                          )}
                          {t.manager && (
                            <div>
                              <span className="text-slate-500 font-medium">Manager:</span>{' '}
                              <span className="text-slate-200">{t.manager}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Squad Preview */}
                      <div className="mt-3 pt-2.5 border-t border-slate-800/60">
                        <div className="flex items-center justify-between text-[11px] mb-2 font-bold">
                          <span className="text-slate-400 uppercase tracking-wider">
                            Roster ({teamPlayers.length} Athletes)
                          </span>
                          {onAddPlayer && canManage && (
                            <button
                              type="button"
                              onClick={() => onAddPlayer(t.id)}
                              className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 text-[11px]"
                            >
                              <Plus className="w-3 h-3" />
                              Add Player
                            </button>
                          )}
                        </div>

                        {teamPlayers.length === 0 ? (
                          <div className="p-3 text-center rounded-xl bg-slate-950/60 border border-slate-800/50 text-[11px] text-slate-500">
                            No players added yet
                          </div>
                        ) : (
                          <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                            {teamPlayers.slice(0, 6).map((p) => (
                              <div
                                key={p.id}
                                className="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/40 text-xs"
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <span className="w-5 text-center font-mono font-bold text-slate-400 text-[10px]">
                                    {p.jerseyNumber != null ? `#${p.jerseyNumber}` : '-'}
                                  </span>
                                  <span className="font-medium text-slate-200 truncate">{p.name}</span>
                                </div>
                                {p.role && (
                                  <Badge variant="neutral" className="text-[9px] py-0 px-1.5 shrink-0">
                                    {p.role}
                                  </Badge>
                                )}
                              </div>
                            ))}
                            {teamPlayers.length > 6 && (
                              <p className="text-[10px] text-center text-slate-500 pt-1">
                                + {teamPlayers.length - 6} more players
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Team Card Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
                      {onOpenTeam && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex-1"
                          onClick={() => onOpenTeam(t.id)}
                          icon={<Eye className="w-3.5 h-3.5" />}
                        >
                          Open Team
                        </Button>
                      )}
                      {onAddPlayer && canManage && (
                        <Button
                          variant="primary"
                          size="sm"
                          className="flex-1"
                          onClick={() => onAddPlayer(t.id)}
                          icon={<UserPlus className="w-3.5 h-3.5" />}
                        >
                          Add Player
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: MATCHES */}
      {activeMainTab === 'MATCHES' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Swords className="w-5 h-5 text-emerald-400" />
                <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                  Tournament Matches & Fixtures
                </h2>
                <Badge variant="neutral" className="font-mono">
                  {matches.length} total
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Upcoming, live, and completed matches with real-time scoring and broadcast controllers.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsFixtureModalOpen(true)}
                icon={<Sparkles className="w-3.5 h-3.5" />}
              >
                Generate Fixtures
              </Button>
              {canManage && onAddMatch && (
                <Button
                  variant="emerald"
                  size="sm"
                  onClick={() => onAddMatch()}
                  icon={<Plus className="w-3.5 h-3.5" />}
                >
                  Create Match
                </Button>
              )}
            </div>
          </div>

          {/* Match Status Filters */}
          <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-900 border border-slate-800 overflow-x-auto">
            {[
              { id: 'ALL', label: 'All Matches', count: matches.length },
              { id: 'UPCOMING', label: 'Upcoming', count: upcomingMatches.length },
              { id: 'LIVE', label: 'Live Now', count: liveMatches.length },
              { id: 'COMPLETED', label: 'Completed', count: completedMatches.length },
            ].map((f) => {
              const isSelected = matchesStatusFilter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setMatchesStatusFilter(f.id as any)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500 text-slate-950 shadow font-black'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <span>{f.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isSelected ? 'bg-emerald-950/20 text-emerald-950 font-bold' : 'bg-slate-800 text-slate-400'}`}>
                    {f.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Match Cards List */}
          {displayedMatches.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/60 rounded-2xl border border-slate-800 space-y-3">
              <Swords className="w-12 h-12 text-slate-600 mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-300">No matches found</p>
                <p className="text-xs text-slate-400">
                  {matchesStatusFilter === 'ALL'
                    ? 'No matches have been scheduled for this tournament yet.'
                    : `No ${matchesStatusFilter.toLowerCase()} matches right now.`}
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button variant="emerald" size="sm" onClick={() => setIsFixtureModalOpen(true)} icon={<Sparkles className="w-3.5 h-3.5" />}>
                  Generate Round Robin Fixtures
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayedMatches.map((m) => {
                const isLive = m.status === 'LIVE';
                const isCompleted = m.status === 'COMPLETED';
                const isUpcoming = !isLive && !isCompleted;
                const assignedGroup = groups.find((g) => g.id === m.groupId);

                return (
                  <div
                    key={m.id}
                    className={`p-4 rounded-2xl bg-slate-900 border transition-all space-y-3 ${
                      isLive
                        ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/20'
                        : 'border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        {isLive ? (
                          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-black uppercase tracking-wider animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                            Live
                          </span>
                        ) : isCompleted ? (
                          <Badge variant="neutral" className="bg-slate-800 text-slate-300 text-[10px]">
                            Completed
                          </Badge>
                        ) : (
                          <Badge variant="neutral" className="bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px]">
                            Upcoming
                          </Badge>
                        )}
                        {m.round && (
                          <span className="text-slate-400 font-medium text-[11px]">{m.round}</span>
                        )}
                        {assignedGroup && (
                          <Badge variant="neutral" className="text-[9px] py-0 px-1.5">
                            {assignedGroup.name}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        {m.scheduledDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            {m.scheduledDate} {m.scheduledTime || ''}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Teams Matchup Row */}
                    <div className="flex items-center justify-between gap-4 py-2 px-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        {m.homeTeam?.logoUrl ? (
                          <img
                            src={m.homeTeam.logoUrl}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="w-6 h-6 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
                            H
                          </div>
                        )}
                        <span className="font-bold text-xs text-slate-100 truncate">
                          {m.homeTeam?.name || 'Home Team'}
                        </span>
                      </div>

                      <div className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono font-black text-emerald-400 shrink-0">
                        VS
                      </div>

                      <div className="flex items-center justify-end gap-2.5 flex-1 min-w-0 text-right">
                        <span className="font-bold text-xs text-slate-100 truncate">
                          {m.awayTeam?.name || 'Away Team'}
                        </span>
                        {m.awayTeam?.logoUrl ? (
                          <img
                            src={m.awayTeam.logoUrl}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="w-6 h-6 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-[10px]">
                            A
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Venue & Result Summary */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      {m.venue ? (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate">{m.venue}</span>
                        </span>
                      ) : (
                        <span />
                      )}
                      {m.resultSummary && (
                        <span className="text-emerald-400 font-semibold truncate max-w-[50%]">
                          {m.resultSummary}
                        </span>
                      )}
                    </div>

                    {/* Status-Based Action Buttons */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
                      {isUpcoming && (
                        <>
                          <div className="flex items-center gap-1.5">
                            {onOpenMatchScoring && (
                              <Button
                                variant="emerald"
                                size="sm"
                                onClick={() => onOpenMatchScoring(m.id)}
                                icon={<Play className="w-3.5 h-3.5" />}
                              >
                                Open Match
                              </Button>
                            )}
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleCopyMatchBroadcastUrl(m.id)}
                              icon={<Tv className="w-3.5 h-3.5" />}
                            >
                              Broadcast
                            </Button>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveTab('GRAPHICS')}
                            icon={<Palette className="w-3.5 h-3.5 text-amber-400" />}
                          >
                            Graphics
                          </Button>
                        </>
                      )}

                      {isLive && (
                        <>
                          <div className="flex items-center gap-1.5">
                            {onOpenMatchScoring && (
                              <Button
                                variant="emerald"
                                size="sm"
                                onClick={() => onOpenMatchScoring(m.id)}
                                icon={<Radio className="w-3.5 h-3.5 animate-pulse" />}
                                className="font-bold shadow-md shadow-emerald-500/20"
                              >
                                Open Scoring
                              </Button>
                            )}
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleCopyMatchBroadcastUrl(m.id)}
                              icon={<Tv className="w-3.5 h-3.5" />}
                            >
                              Broadcast
                            </Button>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveTab('GRAPHICS')}
                            icon={<Palette className="w-3.5 h-3.5 text-amber-400" />}
                          >
                            Graphics
                          </Button>
                        </>
                      )}

                      {isCompleted && (
                        <>
                          <div className="flex items-center gap-1.5">
                            {onOpenMatchScoring && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => onOpenMatchScoring(m.id)}
                                icon={<FileBarChart className="w-3.5 h-3.5" />}
                              >
                                Scorecard
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyMatchBroadcastUrl(m.id)}
                              icon={<Tv className="w-3.5 h-3.5" />}
                            >
                              Broadcast
                            </Button>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setActiveTab('REPORTS');
                              setReportsSubTab('STATISTICS');
                            }}
                            icon={<TrendingUp className="w-3.5 h-3.5 text-blue-400" />}
                          >
                            Player Stats
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* REPORTS SUBTAB: STATISTICS & LEADERS */}
      {activeMainTab === 'REPORTS' && currentReportsSubTab === 'STATISTICS' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                Tournament Statistics & Leaderboards
              </h2>
              <p className="text-xs text-slate-400">
                Automated statistical analysis and individual performance metrics for {sportConfig.name}.
              </p>
            </div>
          </div>

          {!statistics ? (
            <div className="p-12 text-center bg-slate-900/60 rounded-2xl border border-slate-800">
              <TrendingUp className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400">No statistics recorded yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Leaderboard Category 1 */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    {tournament.sport === 'CRICKET'
                      ? 'Top Run Scorers (Orange Cap)'
                      : tournament.sport === 'FOOTBALL' || tournament.sport === 'HOCKEY' || (tournament.sport as string) === 'FIELD_HOCKEY'
                      ? 'Top Goal Scorers (Golden Boot)'
                      : tournament.sport === 'KABADDI'
                      ? 'Top Raiders'
                      : 'Top Scorers'}
                  </h3>
                </div>

                <div className="space-y-2">
                  {(() => {
                    const performers: TournamentLeaderStat[] = Array.isArray(statistics.topPerformers)
                      ? statistics.topPerformers
                      : Object.values(statistics.topPerformers || {}).flat();
                    if (!performers || performers.length === 0) {
                      return <p className="text-xs text-slate-500 py-3 text-center">No individual stats recorded yet.</p>;
                    }
                    return performers.slice(0, 5).map((tp, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                          <div>
                            <span className="text-xs font-bold text-slate-200">{tp.playerName}</span>
                            <span className="text-[10px] text-slate-400 block">{tp.teamName}</span>
                          </div>
                        </div>
                        <span className="text-sm font-black text-emerald-400 font-mono">
                          {tp.statValue} {tp.statLabel}
                        </span>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Tournament Summary Overview */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Competition Overview
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Matches</span>
                    <span className="text-lg font-black text-slate-100">{statistics.totalMatches}</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Completed Matches</span>
                    <span className="text-lg font-black text-emerald-400">{statistics.completedMatches}</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Points / Runs</span>
                    <span className="text-lg font-black text-amber-400">{statistics.totalPointsOrRuns}</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Avg Per Match</span>
                    <span className="text-lg font-black text-slate-200">{statistics.averageScorePerMatch}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* REPORTS SUBTAB: AWARDS & HONORS */}
      {activeMainTab === 'REPORTS' && currentReportsSubTab === 'AWARDS' && (
        <TournamentAwardsManager
          tournament={tournament}
          teams={teams}
          players={players}
          onOpenPresentationConsole={() => setIsPresentationConsoleOpen(true)}
          onRefresh={() => fetchAllTournamentData()}
        />
      )}

      {/* REPORTS SUBTAB: TOURNAMENT RECORDS */}
      {activeMainTab === 'REPORTS' && currentReportsSubTab === 'RECORDS' && (
        <TournamentRecordsCenterView
          tournament={tournament}
          onOpenPresentationConsole={() => setIsPresentationConsoleOpen(true)}
        />
      )}

      {/* REPORTS SUBTAB: HALL OF FAME & PODIUM */}
      {activeMainTab === 'REPORTS' && currentReportsSubTab === 'HALL_OF_FAME' && (
        <TournamentHallOfFameView
          tournament={tournament}
          onOpenPresentationConsole={() => setIsPresentationConsoleOpen(true)}
        />
      )}

      {/* TAB: GRAPHICS & BROADCAST */}
      {activeMainTab === 'GRAPHICS' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Tv className="w-5 h-5 text-amber-400" />
                <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                  Universal Tournament Broadcast & Presentation Overlays
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Direct transparent 1920x1080 OBS/vMix browser sources and real-time ceremony presentation triggers via Server-Sent Events.
              </p>
            </div>

            <Button
              variant="amber"
              size="sm"
              onClick={() => setIsPresentationConsoleOpen(true)}
              icon={<Sparkles className="w-3.5 h-3.5" />}
            >
              Open Live Presentation Console
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Live Presentation Stream (1920x1080) */}
            <div className="p-4 bg-slate-900 rounded-2xl border border-amber-500/30 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-slate-100">Ceremony Overlay (1920x1080)</h3>
              </div>
              <p className="text-[11px] text-slate-400">
                Synchronized live overlay for Champions, MVPs, Awards, and Record cards.
              </p>
              <Button
                variant="amber"
                size="sm"
                className="w-full text-slate-950 font-bold"
                onClick={() => {
                  const url = `${window.location.origin}/broadcast/tournament/${tournamentId}`;
                  navigator.clipboard.writeText(url);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                icon={<Copy className="w-3.5 h-3.5" />}
              >
                {copiedLink ? 'Copied Overlay URL' : 'Copy Broadcast URL'}
              </Button>
            </div>

            {/* Standings Overlay */}
            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-slate-200">Points Table Overlay</h3>
              </div>
              <p className="text-[11px] text-slate-400">
                Full-screen or lower-third live points table updated automatically via SSE.
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => handleCopyBroadcastUrl('standings')}
                icon={<Copy className="w-3.5 h-3.5" />}
              >
                Copy Standings URL
              </Button>
            </div>

            {/* Bracket Overlay */}
            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <GitMerge className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-slate-200">Knockout Tree Overlay</h3>
              </div>
              <p className="text-[11px] text-slate-400">
                Broadcast-ready interactive knockout tree for presentation graphics.
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => handleCopyBroadcastUrl('bracket')}
                icon={<Copy className="w-3.5 h-3.5" />}
              >
                Copy Bracket URL
              </Button>
            </div>

            {/* Public Spectator Live Stream */}
            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-bold text-slate-200">Public Spectator Portal</h3>
              </div>
              <p className="text-[11px] text-slate-400">
                Public viewer web portal for awards ceremony, records, and podium showcase.
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => {
                  const url = `${window.location.origin}/tournament-live/${tournamentId}`;
                  navigator.clipboard.writeText(url);
                }}
                icon={<ExternalLink className="w-3.5 h-3.5" />}
              >
                Copy Public URL
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TAB: ACCESS CONTROL & STAFF (ACL) */}
      {activeMainTab === 'ACL' && (
        <TournamentAclManager
          tournament={tournament}
          onRefresh={fetchAllTournamentData}
        />
      )}

      {/* Tournament Presentation Director Console Modal */}
      <TournamentPresentationConsoleModal
        isOpen={isPresentationConsoleOpen}
        onClose={() => setIsPresentationConsoleOpen(false)}
        tournamentId={tournamentId}
      />

      {/* Fixture Generator Modal */}
      <FixtureGeneratorModal
        isOpen={isFixtureModalOpen}
        onClose={() => setIsFixtureModalOpen(false)}
        tournamentId={tournamentId}
        sport={tournament.sport}
        groups={groups}
        onSuccess={() => fetchAllTournamentData()}
      />

      {/* Fixture Edit & Reschedule Modal */}
      <FixtureEditModal
        isOpen={Boolean(editingFixtureMatch)}
        onClose={() => setEditingFixtureMatch(null)}
        tournamentId={tournamentId}
        match={editingFixtureMatch}
        onSuccess={() => fetchAllTournamentData()}
      />

      {/* Team Auto Distribution Modal */}
      <TeamDistributionModal
        isOpen={isDistributionModalOpen}
        onClose={() => setIsDistributionModalOpen(false)}
        tournamentId={tournamentId}
        groups={groups}
        teams={teams}
        onSuccess={() => fetchAllTournamentData()}
      />

      {/* Knockout Bracket Generator Modal */}
      <KnockoutGeneratorModal
        isOpen={isKnockoutModalOpen}
        onClose={() => setIsKnockoutModalOpen(false)}
        tournamentId={tournamentId}
        onSuccess={() => fetchAllTournamentData()}
      />

      {/* Tournament Awards Modal */}
      <TournamentAwardModal
        isOpen={isAwardModalOpen}
        onClose={() => setIsAwardModalOpen(false)}
        tournamentId={tournamentId}
        initialAwards={awards}
        players={players}
        teams={teams}
        onSuccess={(updated) => setAwards(updated)}
      />

      {/* Team Sheet Scanner Modal */}
      <TeamSheetScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        tournamentId={tournamentId}
        tournamentName={tournament.name}
        sportHint={tournament.sport || 'CRICKET'}
        groups={groups}
        onImportSuccess={({ team, playersCount }) => {
          fetchAllTournamentData();
          onOpenTeam(team.id);
        }}
      />
    </div>
  );
};
