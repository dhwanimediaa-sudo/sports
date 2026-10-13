import React, { useState, useEffect } from 'react';
import { User, SportType, Tournament, Match, Team } from '../../types';
import { useAuth } from '../../services/authContext';
import { api } from '../../services/api';
import {
  Trophy,
  Swords,
  Users,
  UserCheck,
  Palette,
  FileBarChart,
  Plus,
  Play,
  Calendar,
  MapPin,
  Clock,
  Sparkles,
  ChevronRight,
  Shield,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Radio,
  Tv,
  Camera,
  Search,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Layers,
  Copy,
  Zap,
} from 'lucide-react';

export const SPORT_META: Record<
  SportType,
  { label: string; icon: string; desc: string; color: string; bgGradient: string }
> = {
  CRICKET: {
    label: 'Cricket',
    icon: '🏏',
    desc: 'T20, T10, One Day & Custom Overs with Ball-by-ball, DLS & Wagon Wheel',
    color: 'emerald',
    bgGradient: 'from-emerald-950/60 via-slate-900 to-slate-950',
  },
  VOLLEYBALL: {
    label: 'Volleyball',
    icon: '🏐',
    desc: 'Sets, Rotations, Ace/Block tracking, Libero swaps & Match Point alerts',
    color: 'cyan',
    bgGradient: 'from-cyan-950/60 via-slate-900 to-slate-950',
  },
  KABADDI: {
    label: 'Kabaddi',
    icon: '🤼',
    desc: '30s Raid Clock, Super Raids, Super Tackles, All Out (Lona) & Bonus Points',
    color: 'orange',
    bgGradient: 'from-orange-950/60 via-slate-900 to-slate-950',
  },
  FOOTBALL: {
    label: 'Football / Soccer',
    icon: '⚽',
    desc: 'Halves, Extra Time, Cards, Goal events, Offsides & Live Clock',
    color: 'blue',
    bgGradient: 'from-blue-950/60 via-slate-900 to-slate-950',
  },
  HOCKEY: {
    label: 'Field Hockey',
    icon: '🏑',
    desc: 'Quarters, Penalty Corners, Green/Yellow/Red cards & Shootouts',
    color: 'teal',
    bgGradient: 'from-teal-950/60 via-slate-900 to-slate-950',
  },
  BASKETBALL: {
    label: 'Basketball',
    icon: '🏀',
    desc: 'Quarters, 24s Shot Clock, 2pt/3pt Shots, Fouls & Timeouts',
    color: 'amber',
    bgGradient: 'from-amber-950/60 via-slate-900 to-slate-950',
  },
  TENNIS: {
    label: 'Tennis',
    icon: '🎾',
    desc: 'Games, Advantage, Deuce, Tiebreak & Grand Slam Sets',
    color: 'lime',
    bgGradient: 'from-lime-950/60 via-slate-900 to-slate-950',
  },
  BADMINTON: {
    label: 'Badminton',
    icon: '🏸',
    desc: '21-point Rally scoring, Change of ends, Service Court tracking',
    color: 'sky',
    bgGradient: 'from-sky-950/60 via-slate-900 to-slate-950',
  },
  TABLE_TENNIS: {
    label: 'Table Tennis',
    icon: '🏓',
    desc: '11-point sets, Alternating 2-serve rotations & Expedite System',
    color: 'rose',
    bgGradient: 'from-rose-950/60 via-slate-900 to-slate-950',
  },
  PICKLEBALL: {
    label: 'Pickleball',
    icon: '🥒',
    desc: 'Side-out scoring, Kitchen rule violations & 11-point games',
    color: 'emerald',
    bgGradient: 'from-emerald-950/60 via-slate-900 to-slate-950',
  },
  HANDBALL: {
    label: 'Handball',
    icon: '🤾',
    desc: '7-meter throws, 2-minute suspensions & Fast break counters',
    color: 'purple',
    bgGradient: 'from-purple-950/60 via-slate-900 to-slate-950',
  },
  SQUASH: {
    label: 'Squash',
    icon: '🏸',
    desc: 'PAR-11 scoring, Lets, Strokes & Tin faults',
    color: 'yellow',
    bgGradient: 'from-yellow-950/60 via-slate-900 to-slate-950',
  },
  CUSTOM: {
    label: 'Custom Sport Engine',
    icon: '⚙️',
    desc: 'Custom rule builder, Periods, Point increments & Overtime',
    color: 'slate',
    bgGradient: 'from-slate-900 via-slate-900 to-slate-950',
  },
  OTHER: {
    label: 'Multi-Sport Engine',
    icon: '🥇',
    desc: 'Universal sporting engine and generic scoreboard management',
    color: 'slate',
    bgGradient: 'from-slate-900 via-slate-900 to-slate-950',
  },
};

export interface UserWorkspaceProps {
  activeSport: SportType | null;
  onSelectSport: (sport: SportType) => void;
  onCreateTournament: (sport: SportType) => void;
  onCreateTeam?: (sport: SportType) => void;
  onCreateMatch: (sport: SportType) => void;
  onNavigateSection: (section: string) => void;
  onOpenTournament: (id: string) => void;
  onOpenTeam?: (teamId: string) => void;
  onOpenMatch: (id: string, tab?: string) => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const UserWorkspace: React.FC<UserWorkspaceProps> = ({
  activeSport,
  onSelectSport,
  onCreateTournament,
  onCreateTeam,
  onCreateMatch,
  onNavigateSection,
  onOpenTournament,
  onOpenTeam,
  onOpenMatch,
  onToast,
}) => {
  const { user } = useAuth();
  const allowedSports: SportType[] =
    user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN'
      ? (Object.keys(SPORT_META) as SportType[])
      : user?.allowedSports && user.allowedSports.length > 0
      ? user.allowedSports
      : ['CRICKET'];

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'tournaments' | 'teams' | 'matches' | 'graphics' | 'reports'>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [tRes, mRes, teamRes] = await Promise.all([
        api.getTournaments().catch(() => ({ tournaments: [] })),
        api.getMatches().catch(() => ({ matches: [] })),
        api.getTeams().catch(() => ({ teams: [] })),
      ]);
      setTournaments(tRes.tournaments || []);
      setMatches(mRes.matches || []);
      setTeams(teamRes.teams || []);
    } catch (err: any) {
      console.error('Failed to load workspace data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeSport]);

  // If user has not selected a sport, or selected sport is not allowed, pick first allowed
  const currentSport: SportType =
    activeSport && allowedSports.includes(activeSport)
      ? activeSport
      : allowedSports[0] || 'CRICKET';

  const sportInfo = SPORT_META[currentSport] || {
    label: currentSport,
    icon: '🏆',
    desc: 'Self-service tournament management',
    color: 'emerald',
    bgGradient: 'from-slate-900 to-slate-950',
  };

  // Filter tournaments & matches by active sport
  const sportTournaments = tournaments.filter((t) => t.sport === currentSport);
  const sportTournamentIds = new Set(sportTournaments.map((t) => t.id));

  const sportTeams = teams.filter(
    (tm) => tm.sport === currentSport || (tm.tournamentId && sportTournamentIds.has(tm.tournamentId))
  );

  const sportMatches = matches.filter(
    (m) => m.sport === currentSport || (m.tournamentId && sportTournamentIds.has(m.tournamentId))
  );

  const liveMatches = sportMatches.filter((m) => m.status === 'LIVE');
  const upcomingMatches = sportMatches.filter(
    (m) => m.status === 'SCHEDULED' || m.status === 'READY' || m.status === 'DRAFT' || (m.status as string) === 'UPCOMING'
  );
  const completedMatches = sportMatches.filter((m) => m.status === 'COMPLETED');
  const upcomingAndLiveCount = liveMatches.length + upcomingMatches.length;

  const handleCopyBroadcastUrl = (matchId: string) => {
    const url = `${window.location.origin}/broadcast/match/${matchId}`;
    navigator.clipboard.writeText(url);
    onToast('Broadcast overlay URL copied to clipboard!', 'success');
  };

  // If no sport is selected and multiple allowed, render Sport Selection Portal
  if (!activeSport && allowedSports.length > 1) {
    return (
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="bg-slate-900/80 border border-slate-800 p-6 md:p-8 rounded-2xl shadow-xl">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Sparkles className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">
                WELCOME, {user?.name || 'ORGANIZER'}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Your account is configured with dedicated access to the following sports. Select a sport workspace below to manage tournaments, rosters, matches, and broadcast overlays.
              </p>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Your Assigned Sports ({allowedSports.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allowedSports.map((sp) => {
              const meta = SPORT_META[sp] || {
                label: sp,
                icon: '🏆',
                desc: 'Sport workspace',
                color: 'emerald',
                bgGradient: 'from-slate-900 to-slate-950',
              };
              const tourCount = tournaments.filter((t) => t.sport === sp).length;
              const matchCount = matches.filter((m) => m.sport === sp).length;

              return (
                <div
                  key={sp}
                  onClick={() => onSelectSport(sp)}
                  className={`p-6 rounded-2xl border border-slate-800/80 bg-gradient-to-br ${meta.bgGradient} hover:border-emerald-500/50 cursor-pointer transition-all shadow-lg hover:shadow-emerald-950/30 group flex flex-col justify-between`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-3xl p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                        {meta.icon}
                      </span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-950/70 text-slate-400 border border-slate-800">
                        {tourCount} Tournaments
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white mt-4 group-hover:text-emerald-300 transition-colors">
                      {meta.label}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {meta.desc}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-800/60 flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-medium">
                      {matchCount} Matches scheduled
                    </span>
                    <button className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 group-hover:translate-x-1 transition-transform">
                      Manage {meta.label}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Active Sport Workspace
  return (
    <div className="space-y-6">
      {/* 1. SPORT WORKSPACE HEADER */}
      <div className={`p-6 rounded-2xl border border-slate-800 bg-gradient-to-r ${sportInfo.bgGradient} shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-5`}>
        <div className="flex items-start sm:items-center gap-4">
          <span className="text-4xl p-3 rounded-2xl bg-slate-950/80 border border-slate-800/90 shadow-lg shrink-0">
            {sportInfo.icon}
          </span>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-black text-white tracking-tight uppercase">
                {sportInfo.label} Workspace
              </h1>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wide">
                Active Sport
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-300 flex-wrap">
              <span className="flex items-center gap-1.5 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800/80">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <strong className="text-white">{sportTournaments.length}</strong> Tournaments
              </span>
              <span className="flex items-center gap-1.5 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800/80">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <strong className="text-white">{sportTeams.length}</strong> Teams
              </span>
              <span className="flex items-center gap-1.5 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800/80">
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                <strong className="text-white">{upcomingAndLiveCount}</strong> Live / Upcoming Matches
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions & Sport Switcher */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
          {/* Quick Actions Group */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onCreateTournament(currentSport)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-950/40 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ CREATE TOURNAMENT</span>
            </button>

            <button
              onClick={() => {
                if (onCreateTeam) onCreateTeam(currentSport);
                else onNavigateSection('teams');
              }}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span>+ ADD TEAM</span>
            </button>

            <button
              onClick={() => onCreateMatch(currentSport)}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Swords className="w-3.5 h-3.5 text-emerald-400" />
              <span>+ CREATE MATCH</span>
            </button>

            <button
              onClick={() => onNavigateSection('graphics')}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Palette className="w-3.5 h-3.5 text-amber-400" />
              <span>GRAPHICS</span>
            </button>

            {liveMatches.length > 0 && (
              <button
                onClick={() => setActiveTab('matches')}
                className="px-3 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer animate-pulse"
              >
                <Radio className="w-3.5 h-3.5 text-rose-400" />
                <span>LIVE MATCHES ({liveMatches.length})</span>
              </button>
            )}
          </div>

          {/* Simple Sport Switcher (ONLY if user has multiple sports assigned) */}
          {allowedSports.length > 1 && (
            <div className="flex items-center gap-1.5 pl-0 sm:pl-3 sm:border-l sm:border-slate-800/80 pt-2 sm:pt-0">
              <span className="text-[11px] text-slate-400 hidden xl:inline">Switch Sport:</span>
              <div className="flex gap-1 flex-wrap">
                {allowedSports.map((sp) => (
                  <button
                    key={sp}
                    onClick={() => onSelectSport(sp)}
                    title={SPORT_META[sp]?.label || sp}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                      sp === currentSport
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md font-extrabold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <span>{SPORT_META[sp]?.icon || '🏆'}</span>
                    <span className="ml-1 hidden md:inline">{SPORT_META[sp]?.label || sp}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. GUIDED END-TO-END FLOW PIPELINE */}
      <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3.5 shadow-lg overflow-x-auto">
        <div className="flex items-center justify-between min-w-[760px] text-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">
            Sport Workflow Pipeline:
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <span>{sportInfo.icon}</span>
              <span>SPORT</span>
            </button>

            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />

            <button
              onClick={() => setActiveTab('tournaments')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                activeTab === 'tournaments'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>TOURNAMENT</span>
            </button>

            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />

            <button
              onClick={() => onNavigateSection('tournaments')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-slate-400 hover:text-white hover:bg-slate-900 transition cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>GROUP/LEAGUE</span>
            </button>

            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />

            <button
              onClick={() => setActiveTab('teams')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                activeTab === 'teams'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span>TEAM & PLAYERS</span>
            </button>

            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />

            <button
              onClick={() => setActiveTab('matches')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                activeTab === 'matches'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Swords className="w-3.5 h-3.5 text-emerald-400" />
              <span>MATCH & SCORING</span>
            </button>

            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />

            <button
              onClick={() => onNavigateSection('graphics')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-slate-400 hover:text-white hover:bg-slate-900 transition cursor-pointer"
            >
              <Palette className="w-3.5 h-3.5 text-amber-400" />
              <span>GRAPHICS</span>
            </button>

            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />

            <button
              onClick={() => onNavigateSection('broadcast')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-slate-400 hover:text-white hover:bg-slate-900 transition cursor-pointer"
            >
              <Tv className="w-3.5 h-3.5 text-sky-400" />
              <span>BROADCAST</span>
            </button>

            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />

            <button
              onClick={() => onNavigateSection('reports')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-slate-400 hover:text-white hover:bg-slate-900 transition cursor-pointer"
            >
              <FileBarChart className="w-3.5 h-3.5 text-cyan-400" />
              <span>REPORTS</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. WORKSPACE SUB-NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-slate-800 text-emerald-400 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Overview & Live
        </button>

        <button
          onClick={() => setActiveTab('tournaments')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'tournaments'
              ? 'bg-slate-800 text-emerald-400 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>My Tournaments</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-900 text-[10px] text-slate-300 border border-slate-700">
            {sportTournaments.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('teams')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'teams'
              ? 'bg-slate-800 text-emerald-400 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>Teams & Rosters</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-900 text-[10px] text-slate-300 border border-slate-700">
            {sportTeams.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('matches')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'matches'
              ? 'bg-slate-800 text-emerald-400 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>Matches & Scoring</span>
          {liveMatches.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
              {liveMatches.length} LIVE
            </span>
          )}
        </button>

        <button
          onClick={() => onNavigateSection('graphics')}
          className="px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap text-slate-400 hover:text-white"
        >
          Graphics Studio
        </button>

        <button
          onClick={() => onNavigateSection('reports')}
          className="px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap text-slate-400 hover:text-white"
        >
          Reports & Records
        </button>
      </div>

      {/* 4. TAB CONTENTS */}
      {/* TAB A: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* LIVE MATCHES HERO (if any live) */}
          {liveMatches.length > 0 && (
            <div className="bg-slate-950 border border-emerald-500/30 rounded-2xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <span>Live Matches Underway</span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px]">
                      {liveMatches.length} Active
                    </span>
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {liveMatches.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        <span>{m.name}</span>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-2">
                        <span>{m.teamA?.name || 'Team A'}</span>
                        <span className="text-emerald-400 font-black">vs</span>
                        <span>{m.teamB?.name || 'Team B'}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-2">
                        <MapPin className="w-3 h-3 text-slate-600" />
                        <span>{m.venue || 'Stadium'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onOpenMatch(m.id, 'live_scoring')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm flex items-center gap-1 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" />
                        OPEN SCORING
                      </button>
                      <button
                        onClick={() => handleCopyBroadcastUrl(m.id)}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
                        title="Copy Broadcast Overlay URL (/broadcast/match/:matchId)"
                      >
                        <Copy className="w-3.5 h-3.5 text-sky-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* QUICK START / SIMPLE FLOW GUIDE */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Self-Service {sportInfo.label} Operations
            </h3>
            <p className="text-xs text-slate-400">
              Follow these simple steps to run your entire sporting event from a single workspace:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              <div
                onClick={() => onCreateTournament(currentSport)}
                className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/40 cursor-pointer transition group"
              >
                <div className="text-[10px] font-bold text-emerald-400 uppercase">Step 1</div>
                <div className="text-xs font-bold text-white mt-1 group-hover:text-emerald-300 transition">Create Tournament</div>
                <p className="text-[11px] text-slate-400 mt-0.5">Define league, knockout, or custom format</p>
              </div>

              <div
                onClick={() => {
                  if (onCreateTeam) onCreateTeam(currentSport);
                  else onNavigateSection('teams');
                }}
                className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/40 cursor-pointer transition group"
              >
                <div className="text-[10px] font-bold text-blue-400 uppercase">Step 2</div>
                <div className="text-xs font-bold text-white mt-1 group-hover:text-blue-300 transition">Add Teams & Rosters</div>
                <p className="text-[11px] text-slate-400 mt-0.5">Manual entry or 1-click Team Sheet OCR</p>
              </div>

              <div
                onClick={() => onCreateMatch(currentSport)}
                className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/40 cursor-pointer transition group"
              >
                <div className="text-[10px] font-bold text-purple-400 uppercase">Step 3</div>
                <div className="text-xs font-bold text-white mt-1 group-hover:text-purple-300 transition">Schedule Fixtures</div>
                <p className="text-[11px] text-slate-400 mt-0.5">Pair teams and assign overs/duration</p>
              </div>

              <div
                onClick={() => onNavigateSection('broadcast')}
                className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/40 cursor-pointer transition group"
              >
                <div className="text-[10px] font-bold text-amber-400 uppercase">Step 4</div>
                <div className="text-xs font-bold text-white mt-1 group-hover:text-amber-300 transition">Score & Broadcast</div>
                <p className="text-[11px] text-slate-400 mt-0.5">Realtime overlay via /broadcast/match/:id</p>
              </div>
            </div>
          </div>

          {/* DUAL COLUMN: TOURNAMENTS & UPCOMING MATCHES */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tournaments Snapshot */}
            <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    My {sportInfo.label} Tournaments ({sportTournaments.length})
                  </h3>
                </div>

                <button
                  onClick={() => onCreateTournament(currentSport)}
                  className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Tournament
                </button>
              </div>

              {sportTournaments.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-slate-900/30 rounded-xl border border-dashed border-slate-800">
                  <Trophy className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-400">No {sportInfo.label} tournaments created yet.</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Create your first tournament to start adding groups, teams, player rosters, and fixtures.
                  </p>
                  <button
                    onClick={() => onCreateTournament(currentSport)}
                    className="mt-3 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    CREATE TOURNAMENT
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {sportTournaments.slice(0, 4).map((t) => (
                    <div
                      key={t.id}
                      onClick={() => onOpenTournament(t.id)}
                      className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 cursor-pointer transition flex items-center justify-between group"
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition">
                          {t.name}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2">
                          <span>{t.competitionFormat?.replace('_', ' ') || 'League'}</span>
                          <span>•</span>
                          <span>{t.venue || 'Venue'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-bold text-emerald-400 group-hover:translate-x-0.5 transition-transform">
                        <span>Open</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  ))}

                  {sportTournaments.length > 4 && (
                    <button
                      onClick={() => setActiveTab('tournaments')}
                      className="w-full text-center text-xs font-bold text-slate-400 hover:text-emerald-400 py-1.5 transition"
                    >
                      View all {sportTournaments.length} tournaments →
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Upcoming Matches Snapshot */}
            <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Upcoming Matches ({upcomingMatches.length})
                  </h3>
                </div>

                <button
                  onClick={() => onCreateMatch(currentSport)}
                  className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Schedule Match
                </button>
              </div>

              {upcomingMatches.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-slate-900/30 rounded-xl border border-dashed border-slate-800">
                  <Swords className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-400">No upcoming matches scheduled.</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Schedule a match fixture between two teams to start scoring.
                  </p>
                  <button
                    onClick={() => onCreateMatch(currentSport)}
                    className="mt-3 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    CREATE MATCH
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {upcomingMatches.slice(0, 4).map((m) => (
                    <div
                      key={m.id}
                      onClick={() => onOpenMatch(m.id)}
                      className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer transition flex items-center justify-between"
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-white">{m.name}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{m.date} {m.time}</span>
                          <span>•</span>
                          <span>{m.venue || 'Stadium'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenMatch(m.id, 'live_scoring');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold hover:bg-emerald-600 hover:text-white transition"
                        >
                          Score
                        </button>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                    </div>
                  ))}

                  {upcomingMatches.length > 4 && (
                    <button
                      onClick={() => setActiveTab('matches')}
                      className="w-full text-center text-xs font-bold text-slate-400 hover:text-emerald-400 py-1.5 transition"
                    >
                      View all {upcomingMatches.length} matches →
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB B: TOURNAMENTS */}
      {activeTab === 'tournaments' && (
        <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                My {sportInfo.label} Tournaments ({sportTournaments.length})
              </h2>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter tournaments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                onClick={() => onCreateTournament(currentSport)}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ CREATE TOURNAMENT</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
              Loading tournaments...
            </div>
          ) : sportTournaments.length === 0 ? (
            <div className="p-10 text-center text-slate-500 bg-slate-900/30 rounded-xl border border-dashed border-slate-800">
              <Trophy className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-300">No {sportInfo.label} tournaments found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Create your first {sportInfo.label} tournament to organize teams, groups, and matches.
              </p>
              <button
                onClick={() => onCreateTournament(currentSport)}
                className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                CREATE YOUR FIRST TOURNAMENT
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sportTournaments
                .filter((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase()) || (t.venue && t.venue.toLowerCase().includes(searchQuery.toLowerCase())))
                .map((t) => (
                  <div
                    key={t.id}
                    onClick={() => onOpenTournament(t.id)}
                    className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 cursor-pointer transition-all shadow-md group flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800 uppercase">
                          {t.competitionFormat?.replace('_', ' ') || 'LEAGUE'}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-emerald-400">
                          {t.status}
                        </span>
                      </div>

                      <h3 className="text-base font-black text-white group-hover:text-emerald-300 transition-colors">
                        {t.name}
                      </h3>

                      <div className="text-xs text-slate-400 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{t.venue || t.location || 'Local Stadium'}</span>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                      <span>Season {t.season || '2026'}</span>
                      <span className="text-emerald-400 font-bold group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                        Open Tournament <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* TAB C: TEAMS & ROSTERS */}
      {activeTab === 'teams' && (
        <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                {sportInfo.label} Teams & Rosters ({sportTeams.length})
              </h2>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => {
                  if (onCreateTeam) onCreateTeam(currentSport);
                  else onNavigateSection('teams');
                }}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ ADD TEAM</span>
              </button>
            </div>
          </div>

          {sportTeams.length === 0 ? (
            <div className="p-10 text-center text-slate-500 bg-slate-900/30 rounded-xl border border-dashed border-slate-800">
              <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-300">No teams added yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Add team franchises, club squads, or scan paper team sheets via OCR.
              </p>
              <button
                onClick={() => {
                  if (onCreateTeam) onCreateTeam(currentSport);
                  else onNavigateSection('teams');
                }}
                className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                ADD YOUR FIRST TEAM
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sportTeams.map((team) => (
                <div
                  key={team.id}
                  onClick={() => {
                    if (onOpenTeam) onOpenTeam(team.id);
                    else onNavigateSection('teams');
                  }}
                  className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-blue-500/40 cursor-pointer transition flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3">
                    {team.logoUrl ? (
                      <img
                        src={team.logoUrl}
                        alt={team.name}
                        className="w-11 h-11 rounded-xl object-cover bg-slate-950 p-0.5 border border-slate-800"
                      />
                    ) : (
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-slate-950 text-sm"
                        style={{ backgroundColor: team.teamColor || '#10b981' }}
                      >
                        {team.shortName || team.name.slice(0, 3).toUpperCase()}
                      </div>
                    )}

                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-blue-300 transition">
                        {team.name}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {team.shortName ? `Code: ${team.shortName}` : 'Squad'} • {team.players?.length || 0} Players
                      </p>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-0.5 transition" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB D: MATCHES & FIXTURES */}
      {activeTab === 'matches' && (
        <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Swords className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                {sportInfo.label} Fixtures & Scoring ({sportMatches.length})
              </h2>
            </div>

            <button
              onClick={() => onCreateMatch(currentSport)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ CREATE MATCH</span>
            </button>
          </div>

          {sportMatches.length === 0 ? (
            <div className="p-10 text-center text-slate-500 bg-slate-900/30 rounded-xl border border-dashed border-slate-800">
              <Swords className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-300">No matches found for {sportInfo.label}</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Schedule your first match to start live scoring and streaming overlays.
              </p>
              <button
                onClick={() => onCreateMatch(currentSport)}
                className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                CREATE MATCH
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {sportMatches.map((m) => {
                const isLive = m.status === 'LIVE';
                const isCompleted = m.status === 'COMPLETED';

                return (
                  <div
                    key={m.id}
                    onClick={() => onOpenMatch(m.id)}
                    className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 cursor-pointer transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider ${
                            isLive
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : isCompleted
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {m.status}
                        </span>
                        <h4 className="text-sm font-black text-white">{m.name}</h4>
                      </div>

                      <div className="text-xs text-slate-300 flex items-center gap-2">
                        <span className="font-semibold">{m.teamA?.name || 'Team A'}</span>
                        <span className="text-emerald-400 font-bold">vs</span>
                        <span className="font-semibold">{m.teamB?.name || 'Team B'}</span>
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {m.date} {m.time}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          {m.venue || 'Stadium'}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons according to match status */}
                    <div
                      className="flex items-center gap-2 shrink-0 flex-wrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isLive ? (
                        <>
                          <button
                            onClick={() => onOpenMatch(m.id, 'live_scoring')}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5" />
                            OPEN SCORING
                          </button>
                          <button
                            onClick={() => handleCopyBroadcastUrl(m.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-bold border border-slate-700 transition flex items-center gap-1 cursor-pointer"
                            title="Copy broadcast overlay link"
                          >
                            <Tv className="w-3.5 h-3.5" />
                            BROADCAST
                          </button>
                          <button
                            onClick={() => onOpenMatch(m.id, 'broadcast')}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition flex items-center gap-1 cursor-pointer"
                          >
                            <Palette className="w-3.5 h-3.5 text-amber-400" />
                            GRAPHICS
                          </button>
                          <button
                            onClick={() => onOpenMatch(m.id, 'report')}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition flex items-center gap-1 cursor-pointer"
                          >
                            <FileBarChart className="w-3.5 h-3.5 text-cyan-400" />
                            REPORT
                          </button>
                        </>
                      ) : isCompleted ? (
                        <>
                          <button
                            onClick={() => onOpenMatch(m.id, 'report')}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition flex items-center gap-1 cursor-pointer"
                          >
                            <FileBarChart className="w-3.5 h-3.5 text-cyan-400" />
                            MATCH REPORT
                          </button>
                          <button
                            onClick={() => onOpenMatch(m.id, 'report')}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600 hover:text-white border border-emerald-500/30 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            FULL SCORECARD
                          </button>
                          <button
                            onClick={() => onOpenMatch(m.id, 'broadcast')}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition flex items-center gap-1 cursor-pointer"
                          >
                            <Palette className="w-3.5 h-3.5 text-amber-400" />
                            GRAPHICS
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => onOpenMatch(m.id, 'live_scoring')}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            <Zap className="w-3.5 h-3.5" />
                            OPEN MATCH
                          </button>
                          <button
                            onClick={() => onOpenMatch(m.id, 'broadcast')}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition flex items-center gap-1 cursor-pointer"
                          >
                            <Palette className="w-3.5 h-3.5 text-amber-400" />
                            GRAPHICS
                          </button>
                          <button
                            onClick={() => handleCopyBroadcastUrl(m.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition cursor-pointer"
                            title="Copy Broadcast Overlay URL"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
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
    </div>
  );
};
