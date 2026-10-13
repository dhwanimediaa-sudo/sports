import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { SystemStatus, AuditLog, SportType, Tournament, Match } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../services/authContext';
import {
  Trophy,
  Swords,
  Users,
  UserCheck,
  UserCog,
  Database,
  ShieldCheck,
  Activity,
  Globe,
  Radio,
  Tv,
  ListFilter,
  RefreshCw,
  ExternalLink,
  Edit3,
  Key,
  Flame,
  Plus,
  Zap,
  Calendar,
  MapPin,
  ChevronRight,
  Shield,
  Copy,
  Check,
  Sparkles,
  Clock,
  Layers,
} from 'lucide-react';

export interface DashboardProps {
  onOpenProfile: () => void;
  onOpenEditProfile: () => void;
  onOpenChangePassword: () => void;
  onOpenAuditLogs: () => void;
  onNavigateToTournaments?: () => void;
  onCreateTournament?: () => void;
  onOpenTournament?: (tournamentId: string) => void;
  onOpenMatch?: (matchId: string, tab?: 'live_scoring' | 'broadcast' | 'settings') => void;
}

const SUPPORTED_SPORTS: Array<{ type: SportType; name: string; icon: string; players: number }> = [
  { type: 'CRICKET', name: 'Cricket', icon: '🏏', players: 11 },
  { type: 'VOLLEYBALL', name: 'Volleyball', icon: '🏐', players: 6 },
  { type: 'KABADDI', name: 'Kabaddi', icon: '🤼', players: 7 },
  { type: 'HOCKEY', name: 'Field Hockey', icon: '🏑', players: 11 },
  { type: 'FOOTBALL', name: 'Football / Soccer', icon: '⚽', players: 11 },
  { type: 'BASKETBALL', name: 'Basketball', icon: '🏀', players: 5 },
  { type: 'TENNIS', name: 'Tennis', icon: '🎾', players: 1 },
  { type: 'BADMINTON', name: 'Badminton', icon: '🏸', players: 1 },
  { type: 'TABLE_TENNIS', name: 'Table Tennis', icon: '🏓', players: 1 },
  { type: 'OTHER', name: 'Multi-Sport Engine', icon: '🥇', players: 0 },
];

export const Dashboard: React.FC<DashboardProps> = ({
  onOpenProfile,
  onOpenEditProfile,
  onOpenChangePassword,
  onOpenAuditLogs,
  onNavigateToTournaments,
  onCreateTournament,
  onOpenTournament,
  onOpenMatch,
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & State
  const [recentFilter, setRecentFilter] = useState<'ALL' | 'LIVE' | 'UPCOMING' | 'COMPLETED'>('ALL');
  const [copiedMatchId, setCopiedMatchId] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statusRes, logsRes, tourRes, matchRes] = await Promise.all([
        api.getSystemStatus().catch(() => null),
        isAdmin ? api.getAuditLogs(5).catch(() => ({ logs: [] })) : Promise.resolve({ logs: [] }),
        api.getTournaments().catch(() => ({ tournaments: [] })),
        api.getMatches().catch(() => ({ matches: [] })),
      ]);
      setStatus(statusRes);
      setAuditLogs(logsRes?.logs || []);
      setTournaments(tourRes?.tournaments || []);
      setMatches(matchRes?.matches || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatUptime = (seconds?: number) => {
    if (!seconds) return '0s';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  // Helper to determine match permissions and role label for current user
  const getMatchUserRole = (m: Match) => {
    if (isAdmin) {
      return { isScorer: true, isBroadcaster: true, isManager: true, label: 'ADMIN ACCESS' };
    }
    const isScorer = m.scorerUserId === user?.id || m.scorerUserIds?.includes(user?.id || '');
    const isBroadcaster = m.broadcastOperatorUserId === user?.id || m.broadcasterUserIds?.includes(user?.id || '');
    const tour = tournaments.find((t) => t.id === m.tournamentId);
    const isTourOwner = tour?.ownerUserId === user?.id || tour?.createdByUserId === user?.id;
    const collabRole = tour?.collaborators?.find((c) => c.userId === user?.id || c.email === user?.email)?.role;
    const isManager = isTourOwner || collabRole === 'MANAGER';

    let label = 'VIEWER';
    if (isManager) label = 'TOURNAMENT MANAGER';
    else if (isScorer && isBroadcaster) label = 'SCORER & OPERATOR';
    else if (isScorer) label = 'OFFICIAL SCORER';
    else if (isBroadcaster) label = 'BROADCAST OPERATOR';

    return {
      isScorer: isScorer || isManager,
      isBroadcaster: isBroadcaster || isManager,
      isManager,
      label,
    };
  };

  const handleCopyBroadcastUrl = (matchId: string) => {
    const url = `${window.location.origin}/broadcast/match/${matchId}`;
    navigator.clipboard.writeText(url);
    setCopiedMatchId(matchId);
    setTimeout(() => setCopiedMatchId(null), 2500);
  };

  // 1. My Assigned Matches
  const assignedMatches = matches.filter((m) => {
    if (isAdmin) return true;
    const isScorer = m.scorerUserId === user?.id || m.scorerUserIds?.includes(user?.id || '');
    const isBroadcaster = m.broadcastOperatorUserId === user?.id || m.broadcasterUserIds?.includes(user?.id || '');
    const tour = tournaments.find((t) => t.id === m.tournamentId);
    const isTourOwner = tour?.ownerUserId === user?.id || tour?.createdByUserId === user?.id;
    const collabRole = tour?.collaborators?.find((c) => c.userId === user?.id || c.email === user?.email)?.role;
    return isScorer || isBroadcaster || isTourOwner || collabRole === 'MANAGER';
  });

  // 2. My Tournaments
  const userTournaments = tournaments.filter((t) => {
    if (isAdmin) return true;
    const isOwner = t.ownerUserId === user?.id || t.createdByUserId === user?.id;
    const isCollab = t.collaborators?.some((c) => c.userId === user?.id || c.email === user?.email);
    return isOwner || isCollab;
  });

  // 3. Recent Matches filtered
  const filteredRecentMatches = matches.filter((m) => {
    if (recentFilter === 'LIVE') return m.status === 'LIVE';
    if (recentFilter === 'UPCOMING') return m.status === 'SCHEDULED' || m.status === 'READY';
    if (recentFilter === 'COMPLETED') return m.status === 'COMPLETED';
    return true;
  });

  // 4. Matches ready for broadcast
  const broadcastMatches = matches.filter((m) => m.status === 'LIVE' || m.status === 'READY' || m.status === 'SCHEDULED');

  return (
    <div className="space-y-6">
      {/* Welcome & Platform Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                SportsPulse Broadcast Engine
              </span>
              <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Role: {user?.role || 'USER'}
              </span>
              {isAdmin && (
                <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Global Administrator
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {user?.name || 'Operator'}
            </h1>
            <p className="text-sm text-slate-400 mt-1.5 max-w-2xl leading-relaxed">
              {isAdmin
                ? 'Central administrative control center for tournament fixtures, multi-sport scoring consoles, broadcast overlays, and system infrastructure.'
                : 'Your personalized match operations workspace. Access your assigned scoring consoles, broadcast graphics controls, and tournament fixtures.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button onClick={onOpenProfile} variant="emerald" size="sm" icon={<Edit3 className="w-3.5 h-3.5" />}>
              Profile Settings
            </Button>

            <Button onClick={onOpenChangePassword} variant="secondary" size="sm" icon={<Key className="w-3.5 h-3.5" />}>
              Security
            </Button>

            <Button onClick={fetchDashboardData} variant="outline" size="sm" icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />}>
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Primary Metrics Counter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-slate-900/90 border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">My Assignments</span>
            <Swords className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-white font-mono">{assignedMatches.length}</div>
          <p className="text-[10px] text-slate-500 mt-1">Staff Appointments</p>
        </Card>

        <Card className="bg-slate-900/90 border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">My Tournaments</span>
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-black text-white font-mono">{userTournaments.length}</div>
          <p className="text-[10px] text-slate-500 mt-1">Competitions</p>
        </Card>

        <Card className="bg-slate-900/90 border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">Live Matches</span>
            <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
          </div>
          <div className="text-xl font-black text-rose-400 font-mono">
            {matches.filter((m) => m.status === 'LIVE').length}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">In-Play Action</p>
        </Card>

        <Card className="bg-slate-900/90 border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">Match Ready</span>
            <Flame className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-emerald-400 font-mono">
            {matches.filter((m) => m.status === 'READY').length}
          </div>
          <p className="text-[10px] text-emerald-400/80 mt-1">Ready for Toss / Play</p>
        </Card>

        <Card className="bg-slate-900/90 border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">Upcoming</span>
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-xl font-black text-white font-mono">
            {matches.filter((m) => m.status === 'SCHEDULED').length}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Scheduled Fixtures</p>
        </Card>

        <Card className="bg-slate-900/90 border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">Completed</span>
            <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-xl font-black text-white font-mono">
            {matches.filter((m) => m.status === 'COMPLETED').length}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Archived Results</p>
        </Card>
      </div>

      {/* SECTION 1: MY ASSIGNED MATCHES */}
      <Card
        title={isAdmin ? "PLATFORM ACTIVE MATCHES & ASSIGNMENTS" : "MY ASSIGNED MATCHES"}
        subtitle={
          isAdmin
            ? "Direct operational access for all fixtures across the system"
            : "Matches where you are assigned as Official Scorer, Broadcast Operator, or Tournament Manager"
        }
        action={
          <div className="flex items-center gap-2">
            <Badge variant="emerald">
              {assignedMatches.length} Assigned Match{assignedMatches.length === 1 ? '' : 'es'}
            </Badge>
          </div>
        }
      >
        {assignedMatches.length === 0 ? (
          <div className="py-8 text-center bg-slate-950/60 rounded-xl border border-slate-800/80 p-6 space-y-2">
            <Swords className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs font-semibold text-slate-300">No Match Assignments Currently</p>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto">
              When a tournament manager appoints you as an Official Scorer or Broadcast Operator for a fixture, it will appear here with direct one-click console access.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignedMatches.map((m) => {
              const { isScorer, isBroadcaster, isManager, label } = getMatchUserRole(m);
              const isReadyOrLive = m.status === 'READY' || m.status === 'LIVE';

              return (
                <div
                  key={m.id}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800/90 hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-3 shadow-md"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                          {m.sport}
                        </span>
                        <span className="text-[11px] text-slate-400 font-semibold truncate">
                          {m.tournament?.name || 'Tournament'}
                        </span>
                      </div>
                      <Badge variant={m.status === 'LIVE' ? 'rose' : m.status === 'READY' ? 'emerald' : 'secondary'}>
                        {m.status}
                      </Badge>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-100">{m.name}</h4>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" /> {m.date}
                        </span>
                        {m.time && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" /> {m.time}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500" /> {m.venue || 'TBA'}
                        </span>
                      </div>
                    </div>

                    {/* Assigned Role Badge */}
                    <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <Shield className="w-3 h-3" /> {label}
                      </span>
                      {!isReadyOrLive && (
                        <span className="text-[10px] text-slate-500 font-medium italic">
                          ({m.status === 'SCHEDULED' ? 'Scheduled' : 'Draft mode'})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Direct Action Buttons */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isScorer && (
                        <Button
                          variant="emerald"
                          size="sm"
                          icon={<Zap className="w-3.5 h-3.5" />}
                          onClick={() => onOpenMatch && onOpenMatch(m.id, 'live_scoring')}
                        >
                          Open Scorer
                        </Button>
                      )}
                      {isBroadcaster && (
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<Tv className="w-3.5 h-3.5 text-amber-400" />}
                          onClick={() => onOpenMatch && onOpenMatch(m.id, 'broadcast')}
                        >
                          Broadcast Control
                        </Button>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      icon={<ChevronRight className="w-3.5 h-3.5" />}
                      onClick={() => onOpenMatch && onOpenMatch(m.id, 'settings')}
                    >
                      View Match
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* SECTION 2: MY TOURNAMENTS */}
      <Card
        title={isAdmin ? "PLATFORM TOURNAMENTS" : "MY TOURNAMENTS"}
        subtitle={
          isAdmin
            ? "All tournaments created across the platform"
            : "Tournaments owned by you or shared with your account via tournament ACLs"
        }
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="emerald"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={onCreateTournament}
            >
              REGISTER TOURNAMENT
            </Button>
          </div>
        }
      >
        {userTournaments.length === 0 ? (
          <div className="py-8 text-center bg-slate-950/60 rounded-xl border border-slate-800/80 p-6 space-y-3">
            <Trophy className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs font-semibold text-slate-300">No Tournaments Registered Yet</p>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto">
              Start by registering your tournament competition. You can configure league groups, team rosters, and invite collaborators.
            </p>
            <Button
              variant="emerald"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={onCreateTournament}
              className="mt-2"
            >
              Create Your First Tournament
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userTournaments.slice(0, 6).map((t) => {
              const isOwner = t.ownerUserId === user?.id || t.createdByUserId === user?.id;
              const collab = t.collaborators?.find((c) => c.userId === user?.id || c.email === user?.email);

              return (
                <div
                  key={t.id}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800/90 hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-3 shadow-md"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-300">
                        {t.sport}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {isOwner ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            OWNER
                          </span>
                        ) : collab ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {collab.role}
                          </span>
                        ) : null}
                        <Badge variant={t.status === 'LIVE' ? 'rose' : 'secondary'}>{t.status}</Badge>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white truncate">{t.name}</h4>
                      {(t.venue || t.location) && (
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-1 truncate">
                          <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate">{t.venue || t.location}</span>
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center py-1.5 px-1 rounded-lg bg-slate-900/60 border border-slate-800 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500">Teams</span>
                        <p className="font-mono font-bold text-slate-200">{t.teamCount ?? 0}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500">Matches</span>
                        <p className="font-mono font-bold text-slate-200">{t.matchCount ?? 0}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-end">
                    <Button
                      variant="emerald"
                      size="sm"
                      icon={<ChevronRight className="w-3.5 h-3.5" />}
                      onClick={() => onOpenTournament && onOpenTournament(t.id)}
                    >
                      Open Tournament
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* SECTION 3: RECENT MATCHES & QUICK ACCESS */}
      <Card
        title="RECENT MATCHES & QUICK ACCESS"
        subtitle="Browse all available fixtures with status filtering and permission indicators"
        action={
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {(['ALL', 'LIVE', 'UPCOMING', 'COMPLETED'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setRecentFilter(tab)}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  recentFilter === tab
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab === 'LIVE' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 mr-1 animate-pulse" />}
                {tab}
              </button>
            ))}
          </div>
        }
      >
        {filteredRecentMatches.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No matches found in this category.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredRecentMatches.slice(0, 9).map((m) => {
              const { isScorer, isBroadcaster, label } = getMatchUserRole(m);
              return (
                <div
                  key={m.id}
                  className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-2.5"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] font-bold text-slate-400">{m.sport}</span>
                      <Badge variant={m.status === 'LIVE' ? 'rose' : m.status === 'READY' ? 'emerald' : 'secondary'}>
                        {m.status}
                      </Badge>
                    </div>
                    <h5 className="text-xs font-bold text-slate-100 truncate">{m.name}</h5>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {m.tournament?.name || 'Tournament'} • {m.date}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                      {label}
                    </span>
                    <div className="flex items-center gap-1">
                      {isScorer && (
                        <button
                          onClick={() => onOpenMatch && onOpenMatch(m.id, 'live_scoring')}
                          className="px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30"
                        >
                          Score
                        </button>
                      )}
                      {isBroadcaster && (
                        <button
                          onClick={() => onOpenMatch && onOpenMatch(m.id, 'broadcast')}
                          className="px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[10px] font-bold border border-amber-500/30"
                        >
                          Broadcast
                        </button>
                      )}
                      <button
                        onClick={() => onOpenMatch && onOpenMatch(m.id, 'settings')}
                        className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 text-[10px] font-semibold border border-slate-700"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* SECTION 4: BROADCAST OPERATIONS HUB */}
      <Card
        title="BROADCAST OPERATIONS & OVERLAY OUTPUT"
        subtitle="Transparent 1920x1080 alpha overlay outputs designed for OBS Studio and vMix"
        action={
          <Badge variant="purple" icon={<Tv className="w-3 h-3" />}>
            OBS & vMix Ready
          </Badge>
        }
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Flame className="w-4 h-4 text-emerald-400" /> Single Broadcast Match Output URL
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                Each match has a single authoritative transparent browser source URL: <code className="text-emerald-400 font-mono text-[11px]">/broadcast/match/:matchId</code>.
                Graphics, lower thirds, scorebug, and scenes are triggered remotely from the Broadcast Control console.
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <a
                href="/broadcast/overlay/demo-1"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-semibold transition-all"
              >
                <span>Demo Canvas</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Quick Active Match Broadcast URLs */}
          {broadcastMatches.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Active & Upcoming Match Broadcast Feeds:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {broadcastMatches.slice(0, 4).map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-200 truncate">{m.name}</span>
                        <Badge variant={m.status === 'LIVE' ? 'rose' : 'secondary'}>{m.status}</Badge>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
                        /broadcast/match/{m.id}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleCopyBroadcastUrl(m.id)}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-all flex items-center gap-1 text-[11px]"
                        title="Copy OBS Browser Source URL"
                      >
                        {copiedMatchId === m.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy URL</span>
                          </>
                        )}
                      </button>

                      <a
                        href={`/broadcast/match/${m.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 transition-all"
                        title="Open Broadcast Canvas in New Tab"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* SECTION 5: SUPPORTED SPORTS ENGINE */}
      <Card
        title="SUPPORTED SPORTS ENGINE ARCHITECTURE"
        subtitle="Extensible sports engine prepared for sport-specific scoring rules, squads, and statistics"
      >
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {SUPPORTED_SPORTS.map((sport) => (
            <div
              key={sport.type}
              className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl text-center hover:border-emerald-500/30 transition-all group"
            >
              <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">{sport.icon}</div>
              <h4 className="text-xs font-bold text-slate-200">{sport.name}</h4>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {sport.players > 0 ? `${sport.players} Players/Team` : 'Custom Roster'}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* SECTION 6: SYSTEM DIAGNOSTICS & INFRASTRUCTURE (ADMIN ONLY) */}
      {isAdmin && (
        <Card
          title="SYSTEM DIAGNOSTICS & INFRASTRUCTURE"
          subtitle="Real-time monitoring of backend services, database persistence, and VPS environment (Admin Only)"
          action={
            <Badge variant="emerald" icon={<Activity className="w-3 h-3" />}>
              All Systems Operational
            </Badge>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Database Diagnostics */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  Database Engine
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Provider:</span>
                  <span className="font-semibold text-slate-200">{status?.database.provider || 'File-backed JSON DB'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Records:</span>
                  <span className="font-mono text-emerald-400 font-bold">{status?.database.recordCount ?? 0} records</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Storage Size:</span>
                  <span className="font-mono text-slate-300">
                    {status?.database.dbSizeBytes ? `${(status.database.dbSizeBytes / 1024).toFixed(2)} KB` : '12 KB'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Persistence:</span>
                  <span className="text-emerald-400 font-semibold">Atomic Disk Commit</span>
                </div>
              </div>
            </div>

            {/* Security & Auth Diagnostics */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  Authentication Layer
                </span>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Active Session:</span>
                  <span className="font-semibold text-slate-200">JWT + HTTP-Only Cookie</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Password Encryption:</span>
                  <span className="font-mono text-slate-300">Bcrypt Salt 10</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Rate Limiting:</span>
                  <span className="text-emerald-400 font-semibold">Active (5 Attempts)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Role Checking:</span>
                  <span className="text-slate-300">Granular Permissions</span>
                </div>
              </div>
            </div>

            {/* VPS & Environment Diagnostics */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-400" />
                  Server & Network
                </span>
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">App URL / Public IP:</span>
                  <span className="font-mono text-emerald-300 font-bold truncate max-w-[150px]">
                    {status?.application.appUrl || 'Dynamic Host'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Listening Port:</span>
                  <span className="font-mono text-slate-200">{status?.application.port || 3000}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Node Runtime:</span>
                  <span className="font-mono text-slate-300">{status?.application.nodeVersion || process.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Process Uptime:</span>
                  <span className="font-mono text-slate-300">{formatUptime(status?.application.uptimeSeconds)}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* SECTION 7: SYSTEM AUDIT TRAIL (ADMIN ONLY) */}
      {isAdmin && (
        <Card
          title="SYSTEM AUDIT TRAIL"
          subtitle="Recent administrator logins and security activity"
          action={
            <button
              onClick={onOpenAuditLogs}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
            >
              <span>View All Logs</span>
              <ListFilter className="w-3.5 h-3.5" />
            </button>
          }
        >
          <div className="space-y-2">
            {auditLogs.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No recent audit log events recorded.</p>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-start gap-3"
                >
                  <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-200">{log.action}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{log.details}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
