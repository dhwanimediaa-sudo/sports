import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Activity,
  Flame,
  TrendingUp,
  Award,
  Calendar,
  Clock,
  Shield,
  Users,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Printer,
  Copy,
  Check,
  Radio,
  Sparkles,
  Info,
  Filter,
  CheckCircle2,
  XCircle,
  BarChart3,
  Medal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  Tournament,
  TournamentDashboardData,
  TournamentLeaderStat,
  TournamentTeamFormItem,
  TournamentRecordItem,
  TournamentPerformanceIndexItem,
  TournamentAwardItem,
  Match,
} from '../../types';
import { api } from '../../services/api';
import { TournamentPlayerProfileModal } from './TournamentPlayerProfileModal';
import { TournamentTeamProfileModal } from './TournamentTeamProfileModal';
import { TournamentAwardModal } from './TournamentAwardModal';

interface TournamentLiveDashboardViewProps {
  tournament: Tournament;
  onOpenMatch?: (matchId: string) => void;
  onOpenTeam?: (teamId: string) => void;
  onOpenBracket?: () => void;
  onOpenStandings?: () => void;
}

export const TournamentLiveDashboardView: React.FC<TournamentLiveDashboardViewProps> = ({
  tournament,
  onOpenMatch,
  onOpenTeam,
  onOpenBracket,
  onOpenStandings,
}) => {
  const [data, setData] = useState<TournamentDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [isAwardModalOpen, setIsAwardModalOpen] = useState<boolean>(false);
  const [resultsFilterGroup, setResultsFilterGroup] = useState<string>('ALL');
  const [resultsFilterRound, setResultsFilterRound] = useState<string>('ALL');
  const [expandedLeaderboard, setExpandedLeaderboard] = useState<string | null>(null);
  const [showFormulaDetails, setShowFormulaDetails] = useState<boolean>(false);

  const fetchDashboardData = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      else setRefreshing(true);

      const res = await api.getTournamentDashboard(tournament.id);
      setData(res);
    } catch (err) {
      console.error('Failed to load tournament live dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Auto-refresh periodically for real-time live match scores
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 15000);

    return () => clearInterval(interval);
  }, [tournament.id]);

  const handleRecalculateStats = async () => {
    try {
      setRefreshing(true);
      const res = await api.recalculateTournamentStatistics(tournament.id);
      if (res.dashboard) {
        setData(res.dashboard);
      } else {
        await fetchDashboardData();
      }
    } catch (err) {
      console.error('Failed to recalculate statistics:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleCopyBroadcastUrl = () => {
    const url = `${window.location.origin}/api/tournaments/${tournament.id}/broadcast-data`;
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-4">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium">Loading Tournament Live Dashboard...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16 bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
        <p className="text-slate-400 text-sm">Failed to load dashboard data.</p>
        <button
          onClick={() => fetchDashboardData()}
          className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
        >
          Retry
        </button>
      </div>
    );
  }

  const {
    stats,
    leaderTeam,
    qualifiedTeams,
    eliminatedTeams,
    championStatus,
    liveMatches,
    nextMatch,
    recentResults,
    teamForm,
    playerLeaderboards,
    performanceIndexLeaders,
    records,
    awards,
  } = data;

  // Filter recent results
  const filteredResults = recentResults.filter((m) => {
    if (resultsFilterGroup !== 'ALL' && m.groupId !== resultsFilterGroup) return false;
    if (resultsFilterRound !== 'ALL' && m.round !== resultsFilterRound) return false;
    return true;
  });

  const availableRounds = Array.from(new Set(recentResults.map((m) => m.round).filter(Boolean)));
  const availableGroups = Array.from(new Set(data.standings.groups.map((g) => g.groupId)));

  return (
    <div id="tournament-live-dashboard" className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Quick Metrics Bar */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <Activity className="w-3 h-3 animate-pulse text-emerald-400" />
                LIVE TOURNAMENT DASHBOARD
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                {stats.currentPhase}
              </span>
              {championStatus?.isCompleted && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-amber-400" />
                  CHAMPION: {championStatus.champion?.teamName || 'Declared'}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              {tournament.name}
            </h1>
            <p className="text-xs text-slate-400">
              Sport: <strong className="text-slate-200">{tournament.sport}</strong> • Season:{' '}
              <strong className="text-slate-200">{tournament.season || '2026'}</strong> • Organizer:{' '}
              <strong className="text-slate-200">{tournament.organizer || 'SportsPulse Live'}</strong>
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="recalculate-stats-btn"
              onClick={handleRecalculateStats}
              disabled={refreshing}
              className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-800 text-slate-200 rounded-xl border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition shadow-sm hover:border-slate-600 disabled:opacity-50"
              title="Recalculate and synchronize all leaderboards and form records"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
              {refreshing ? 'Recalculating...' : 'Refresh Stats'}
            </button>

            <button
              id="copy-broadcast-url-btn"
              onClick={handleCopyBroadcastUrl}
              className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-800 text-slate-200 rounded-xl border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition shadow-sm hover:border-slate-600"
              title="Copy public API JSON endpoint for broadcast graphics and studio overlays"
            >
              {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              {copiedUrl ? 'Copied URL!' : 'Broadcast API'}
            </button>

            <button
              id="print-summary-btn"
              onClick={handlePrint}
              className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-800 text-slate-200 rounded-xl border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition shadow-sm hover:border-slate-600"
              title="Print clean tournament summary sheet"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              Print
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Teams</span>
            <span className="text-xl font-black text-white">{stats.totalTeams}</span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Groups</span>
            <span className="text-xl font-black text-white">{stats.totalGroups}</span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Scheduled</span>
            <span className="text-xl font-black text-white">{stats.matchesScheduled}</span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] font-bold uppercase text-emerald-400 block tracking-wider">Completed</span>
            <span className="text-xl font-black text-emerald-400">{stats.matchesCompleted}</span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] font-bold uppercase text-amber-400 block tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              LIVE
            </span>
            <span className="text-xl font-black text-amber-400">{stats.matchesLive}</span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] font-bold uppercase text-indigo-400 block tracking-wider">Upcoming</span>
            <span className="text-xl font-black text-indigo-400">{stats.upcomingMatches}</span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Remaining</span>
            <span className="text-xl font-black text-slate-300">{stats.remainingMatches}</span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] font-bold uppercase text-purple-400 block tracking-wider">Players</span>
            <span className="text-xl font-black text-purple-300">{stats.totalPlayers}</span>
          </div>
        </div>
      </div>

      {/* Champion / Podium Card (if completed or final reached) */}
      {championStatus?.champion && (
        <div className="p-5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-slate-900 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl shadow">
              🏆
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/30 text-amber-300 px-2 py-0.5 rounded">
                  Championship Final
                </span>
                <span className="text-xs text-slate-400">Tournament Winner</span>
              </div>
              <h3 className="text-xl font-black text-white mt-0.5">{championStatus.champion.teamName}</h3>
              {championStatus.runnerUp && (
                <p className="text-xs text-slate-400">
                  Runner Up:{' '}
                  <strong className="text-slate-300">{championStatus.runnerUp.teamName}</strong>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenBracket && (
              <button
                onClick={onOpenBracket}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5"
              >
                <Trophy className="w-4 h-4" />
                View Championship Bracket
              </button>
            )}
          </div>
        </div>
      )}

      {/* LIVE MATCH CENTER */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
            <h2 className="text-base font-black text-white tracking-wide uppercase flex items-center gap-2">
              Live Match Center
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {liveMatches.length} Active
              </span>
            </h2>
          </div>
        </div>

        {liveMatches.length === 0 ? (
          <div className="py-8 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
            <Radio className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-400">No matches are currently LIVE.</p>
            <p className="text-xs text-slate-500 mt-1">
              When a match status changes to LIVE in the scoring console, real-time score updates will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {liveMatches.map((match) => (
              <div
                key={match.id}
                className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 border-2 border-rose-500/40 rounded-2xl shadow-xl space-y-4 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 bg-rose-500 text-slate-950 font-black text-[10px] rounded tracking-wider uppercase">
                      LIVE
                    </span>
                    <span className="text-xs font-bold text-slate-400">Match #{match.matchNumber || '1'}</span>
                    {match.round && (
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                        {match.round}
                      </span>
                    )}
                  </div>
                  {match.venue && <span className="text-[11px] text-slate-400">{match.venue}</span>}
                </div>

                {/* Teams & Score display */}
                <div className="py-2 px-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-sm font-black text-white">
                    <span>{match.teamA?.name || 'Team A'}</span>
                    <span className="text-emerald-400">
                      {typeof match.teamAScore === 'number'
                        ? match.teamAScore
                        : (match.teamAScore as any)?.runs !== undefined
                        ? `${(match.teamAScore as any).runs}/${(match.teamAScore as any).wickets ?? 0}`
                        : (match.teamAScore as any)?.score ?? '0'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-black text-white">
                    <span>{match.teamB?.name || 'Team B'}</span>
                    <span className="text-emerald-400">
                      {typeof match.teamBScore === 'number'
                        ? match.teamBScore
                        : (match.teamBScore as any)?.runs !== undefined
                        ? `${(match.teamBScore as any).runs}/${(match.teamBScore as any).wickets ?? 0}`
                        : (match.teamBScore as any)?.score ?? '0'}
                    </span>
                  </div>

                  {match.liveDetailText && (
                    <p className="text-[11px] text-amber-300 font-semibold pt-1 border-t border-slate-800/80">
                      ⚡ {match.liveDetailText}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400 italic">Streaming live telemetry</span>
                  {onOpenMatch && (
                    <button
                      onClick={() => onOpenMatch(match.id)}
                      className="px-3.5 py-1.5 bg-rose-500 hover:bg-rose-400 text-slate-950 font-black text-xs rounded-xl shadow transition flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open Live Match
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* NEXT FIXTURE SPOTLIGHT */}
      {nextMatch && (
        <div className="p-5 bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-950 border border-indigo-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
                Next Upcoming Fixture
              </span>
              <h4 className="text-base font-bold text-white">
                {nextMatch.teamA?.name} vs {nextMatch.teamB?.name}
              </h4>
              <p className="text-xs text-slate-400">
                {nextMatch.round || 'Stage Match'} • {nextMatch.date || 'Scheduled'} {nextMatch.time ? `@ ${nextMatch.time}` : ''}{' '}
                {nextMatch.venue ? `• ${nextMatch.venue}` : ''}
              </p>
            </div>
          </div>

          {onOpenMatch && (
            <button
              onClick={() => onOpenMatch(nextMatch.id)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5"
            >
              Open Match Fixture
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* TEAM FORM TRACKER & LEADERBOARD GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* TEAM FORM (L5) TABLE - 2 cols on desktop */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white tracking-wide uppercase flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Tournament Team Standings & Form (L5)
            </h3>
            {onOpenStandings && (
              <button
                onClick={onOpenStandings}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
              >
                View Full Standings →
              </button>
            )}
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-3">#</th>
                    <th className="py-3 px-3">Team</th>
                    <th className="py-3 px-2 text-center">P</th>
                    <th className="py-3 px-2 text-center">W</th>
                    <th className="py-3 px-2 text-center">L</th>
                    <th className="py-3 px-2 text-center">Pts</th>
                    <th className="py-3 px-2 text-center">Win%</th>
                    <th className="py-3 px-3 text-center">Form (Last 5)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {teamForm.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500 italic">
                        No team standings calculated yet.
                      </td>
                    </tr>
                  ) : (
                    teamForm.map((row) => (
                      <tr
                        key={row.teamId}
                        onClick={() => setSelectedTeamId(row.teamId)}
                        className="hover:bg-slate-800/40 cursor-pointer transition"
                      >
                        <td className="py-3 px-3 font-bold text-slate-400">{row.rank}</td>
                        <td className="py-3 px-3">
                          <div className="flex items-center space-x-2.5">
                            {row.teamLogoUrl ? (
                              <img
                                src={row.teamLogoUrl}
                                alt={row.teamName}
                                referrerPolicy="no-referrer"
                                className="w-6 h-6 rounded-md object-cover bg-slate-950"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center font-bold text-[10px] text-slate-300">
                                {row.teamName.charAt(0)}
                              </div>
                            )}
                            <div>
                              <span className="font-bold text-white block hover:text-emerald-400 transition">
                                {row.teamName}
                              </span>
                              {row.groupName && (
                                <span className="text-[10px] text-slate-400">{row.groupName}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center font-semibold text-slate-300">{row.played}</td>
                        <td className="py-3 px-2 text-center font-bold text-emerald-400">{row.won}</td>
                        <td className="py-3 px-2 text-center font-semibold text-rose-400">{row.lost}</td>
                        <td className="py-3 px-2 text-center font-black text-white">{row.points}</td>
                        <td className="py-3 px-2 text-center font-semibold text-slate-300">{row.winPercentage}</td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            {row.form.length === 0 ? (
                              <span className="text-slate-500 text-[10px]">-</span>
                            ) : (
                              row.form.map((res, idx) => (
                                <span
                                  key={idx}
                                  className={`w-4 h-4 rounded flex items-center justify-center text-[9px] font-black ${
                                    res === 'W'
                                      ? 'bg-emerald-500 text-slate-950'
                                      : res === 'L'
                                      ? 'bg-rose-500 text-white'
                                      : 'bg-slate-700 text-slate-300'
                                  }`}
                                >
                                  {res}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* PERFORMANCE INDEX RANKINGS - 1 col on desktop */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white tracking-wide uppercase flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Performance Index (Top 5)
            </h3>
            <button
              onClick={() => setShowFormulaDetails(!showFormulaDetails)}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
            >
              <Info className="w-3.5 h-3.5 text-amber-400" />
              Formula
            </button>
          </div>

          {showFormulaDetails && (
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 space-y-1 animate-in fade-in">
              <p className="font-semibold text-emerald-400">Deterministic Multi-Sport Metric</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Aggregates sport scoring events, boundaries, assists, tackles, saves, and kills into a normalized performance score.
              </p>
            </div>
          )}

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-2.5 shadow-xl">
            {performanceIndexLeaders.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-6 text-center">
                Performance Index calculations will appear once match scorecards are submitted.
              </p>
            ) : (
              performanceIndexLeaders.slice(0, 5).map((pi, idx) => (
                <div
                  key={pi.playerId}
                  onClick={() => setSelectedPlayerId(pi.playerId)}
                  className="p-2.5 bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800/80 rounded-xl flex items-center justify-between cursor-pointer transition"
                >
                  <div className="flex items-center space-x-3">
                    <span
                      className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-black ${
                        idx === 0
                          ? 'bg-amber-400 text-slate-950'
                          : idx === 1
                          ? 'bg-slate-300 text-slate-950'
                          : idx === 2
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-white hover:text-emerald-400 transition">
                        {pi.playerName}
                      </p>
                      <p className="text-[10px] text-slate-400">{pi.teamName}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-black text-amber-400">{pi.score} PI</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* MULTI-SPORT PLAYER LEADERBOARDS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-white tracking-wide uppercase flex items-center gap-2">
            <Medal className="w-4 h-4 text-emerald-400" />
            Tournament Player Leaderboards ({tournament.sport})
          </h3>
        </div>

        {Object.keys(playerLeaderboards).length === 0 ? (
          <div className="py-8 text-center bg-slate-900/40 border border-slate-800 rounded-2xl">
            <p className="text-xs text-slate-500 italic">No player leaderboard stats recorded yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(playerLeaderboards).map(([catKey, category]: [string, any]) => (
              <div
                key={catKey}
                className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-xl"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wide">
                    {category.categoryTitle}
                  </h4>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                    {category.statLabel}
                  </span>
                </div>

                <div className="space-y-2">
                  {category.leaders.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-3 text-center">No data yet</p>
                  ) : (
                    category.leaders.slice(0, 4).map((ldr, idx) => (
                      <div
                        key={ldr.id || idx}
                        onClick={() => setSelectedPlayerId(ldr.playerId)}
                        className="p-2 bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800/60 rounded-xl flex items-center justify-between cursor-pointer transition"
                      >
                        <div className="flex items-center space-x-2.5">
                          <span
                            className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-black ${
                              idx === 0
                                ? 'bg-amber-400 text-slate-950'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <div>
                            <p className="text-xs font-bold text-white hover:text-emerald-400 transition">
                              {ldr.playerName}
                            </p>
                            <p className="text-[10px] text-slate-400">{ldr.teamName}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-black text-emerald-400">{ldr.statValue}</span>
                          {ldr.secondaryStat && (
                            <span className="block text-[9px] text-slate-500">{ldr.secondaryStat}</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TOURNAMENT RECORDS & AWARDS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TOURNAMENT RECORDS */}
        <div className="space-y-3">
          <h3 className="text-sm font-black text-white tracking-wide uppercase flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            Tournament Records
          </h3>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-xl">
            {records.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-6 text-center">
                Tournament records will be highlighted as matches progress.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {records.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-slate-400">{rec.title}</span>
                      <span className="text-base">{rec.icon || '🏅'}</span>
                    </div>
                    <p className="text-lg font-black text-amber-400">{rec.recordValue}</p>
                    <p className="text-xs font-bold text-white truncate">{rec.holderName}</p>
                    {rec.holderTeamName && (
                      <p className="text-[10px] text-slate-400 truncate">{rec.holderTeamName}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* TOURNAMENT AWARDS CENTER */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white tracking-wide uppercase flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-400" />
              Tournament Awards Center
            </h3>
            <button
              id="manage-awards-btn"
              onClick={() => setIsAwardModalOpen(true)}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              Manage & Override Awards →
            </button>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-xl">
            {awards.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-6 text-center">
                Awards recommendations will generate dynamically based on tournament leaderboards.
              </p>
            ) : (
              <div className="space-y-2.5">
                {awards.slice(0, 3).map((aw) => (
                  <div
                    key={aw.id}
                    className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{aw.awardIcon || '🏆'}</span>
                      <div>
                        <p className="text-xs font-bold text-indigo-300">{aw.title || aw.awardTitle}</p>
                        <p className="text-sm font-black text-white">
                          {aw.recipientName || aw.recommendedPlayerName || 'TBD'}
                        </p>
                        {aw.recipientTeamName && (
                          <p className="text-[10px] text-slate-400">{aw.recipientTeamName}</p>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      {aw.isFinalized ? (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">
                          Finalized
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/20">
                          Recommended
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RECENT MATCH RESULTS SECTION WITH FILTERS */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-sm font-black text-white tracking-wide uppercase flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Recent Tournament Results ({filteredResults.length})
          </h3>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {availableRounds.length > 1 && (
              <select
                value={resultsFilterRound}
                onChange={(e) => setResultsFilterRound(e.target.value)}
                className="bg-slate-800 text-slate-200 text-xs px-2.5 py-1 rounded-lg border border-slate-700"
              >
                <option value="ALL">All Rounds</option>
                {availableRounds.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {filteredResults.length === 0 ? (
          <div className="py-8 text-center bg-slate-900/40 border border-slate-800 rounded-2xl">
            <p className="text-xs text-slate-500 italic">No completed matches match the filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredResults.map((m) => (
              <div
                key={m.id}
                onClick={() => onOpenMatch && onOpenMatch(m.id)}
                className="p-4 bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 rounded-2xl shadow transition cursor-pointer space-y-2"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-bold">{m.round || 'Match'}</span>
                  <span>{m.date || 'Final'}</span>
                </div>

                <div className="space-y-1 py-1 font-bold text-sm">
                  <div className="flex items-center justify-between">
                    <span className={m.winnerTeamId === m.teamAId ? 'text-white' : 'text-slate-400'}>
                      {m.teamA?.name || 'Team A'}
                    </span>
                    <span className="text-emerald-400">
                      {typeof m.teamAScore === 'number'
                        ? m.teamAScore
                        : (m.teamAScore as any)?.runs !== undefined
                        ? `${(m.teamAScore as any).runs}/${(m.teamAScore as any).wickets ?? 0}`
                        : (m.teamAScore as any)?.score ?? '0'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={m.winnerTeamId === m.teamBId ? 'text-white' : 'text-slate-400'}>
                      {m.teamB?.name || 'Team B'}
                    </span>
                    <span className="text-emerald-400">
                      {typeof m.teamBScore === 'number'
                        ? m.teamBScore
                        : (m.teamBScore as any)?.runs !== undefined
                        ? `${(m.teamBScore as any).runs}/${(m.teamBScore as any).wickets ?? 0}`
                        : (m.teamBScore as any)?.score ?? '0'}
                    </span>
                  </div>
                </div>

                {m.resultSummary && (
                  <p className="text-[11px] text-emerald-300 font-semibold pt-1 border-t border-slate-800/80 truncate">
                    {m.resultSummary}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedPlayerId && (
        <TournamentPlayerProfileModal
          tournamentId={tournament.id}
          playerId={selectedPlayerId}
          onClose={() => setSelectedPlayerId(null)}
        />
      )}

      {selectedTeamId && (
        <TournamentTeamProfileModal
          tournamentId={tournament.id}
          teamId={selectedTeamId}
          onClose={() => setSelectedTeamId(null)}
          onSelectPlayer={(pId) => {
            setSelectedTeamId(null);
            setSelectedPlayerId(pId);
          }}
          onOpenMatch={onOpenMatch}
        />
      )}

      {isAwardModalOpen && (
        <TournamentAwardModal
          tournament={tournament}
          onClose={() => {
            setIsAwardModalOpen(false);
            fetchDashboardData(true);
          }}
        />
      )}
    </div>
  );
};
