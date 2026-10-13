import React, { useState } from 'react';
import { TennisMatchReport, AwardCandidate } from '../../types';
import { api } from '../../services/api';
import {
  Trophy,
  Award,
  Printer,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  Share2,
  RefreshCw,
  FileText,
  UserCheck,
  Zap,
  Activity,
  Users,
  Shield,
  Calendar,
  MapPin,
  ChevronRight,
  Filter,
  Tv,
  Check,
} from 'lucide-react';

interface TennisReportViewProps {
  report: TennisMatchReport;
  onRefresh: () => void;
}

export const TennisReportView: React.FC<TennisReportViewProps> = ({ report, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'stats' | 'scorecard' | 'timeline' | 'awards' | 'squads'>('summary');
  const [editingAwards, setEditingAwards] = useState(false);
  const [savingAwards, setSavingAwards] = useState(false);
  const [selectedMomId, setSelectedMomId] = useState(
    report.selectedPlayerOfMatch?.playerId || report.suggestedPlayerOfMatch?.playerId || ''
  );
  const [momReason, setMomReason] = useState(
    report.selectedPlayerOfMatch?.performanceDescription || report.suggestedPlayerOfMatch?.performanceDescription || ''
  );
  const [selectedServerId, setSelectedServerId] = useState(
    report.selectedBestServer?.playerId || report.suggestedBestServer?.playerId || ''
  );
  const [selectedReturnerId, setSelectedReturnerId] = useState(
    report.selectedBestReturner?.playerId || report.suggestedBestReturner?.playerId || ''
  );
  const [finalizing, setFinalizing] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState<'ALL' | 'BREAKS' | 'ACES' | 'WINNERS'>('ALL');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveAwards = async () => {
    setSavingAwards(true);
    try {
      await api.updateMatchAwards(report.match.id, {
        manOfTheMatchId: selectedMomId,
        manOfTheMatchReason: momReason,
        bestBatterId: selectedServerId,
        bestBowlerId: selectedReturnerId,
      });
      showToast('Tennis awards updated successfully!');
      setEditingAwards(false);
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to save awards.', 'error');
    } finally {
      setSavingAwards(false);
    }
  };

  const handleFinalize = async () => {
    if (!window.confirm('Are you sure you want to finalize and lock this official Tennis Match Report?')) return;
    setFinalizing(true);
    try {
      await api.finalizeMatchReport(report.match.id);
      showToast('Match report finalized and locked.');
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to finalize report.', 'error');
    } finally {
      setFinalizing(false);
    }
  };

  const handleReopen = async () => {
    if (!window.confirm('Are you sure you want to unlock and reopen this match report for editing?')) return;
    setReopening(true);
    try {
      await api.reopenMatchReport(report.match.id);
      showToast('Match report unlocked for editing.');
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to reopen report.', 'error');
    } finally {
      setReopening(false);
    }
  };

  const handleSendToBroadcast = async (overlayType: string) => {
    try {
      await api.triggerBroadcastEvent(report.match.id, {
        type: overlayType,
        durationSeconds: 15,
      });
      showToast(`Broadcast overlay "${overlayType}" pushed to live output!`);
    } catch (err: any) {
      showToast(err.message || 'Failed to trigger broadcast graphic.', 'error');
    }
  };

  const teamA = report.teamA || { id: report.match.teamAId, name: 'Player A' };
  const teamB = report.teamB || { id: report.match.teamBId, name: 'Player B' };
  const statsA = report.teamAStats;
  const statsB = report.teamBStats;

  return (
    <div className="space-y-6">
      {/* TOAST */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl border text-sm font-semibold flex items-center gap-2 ${
            toast.type === 'success'
              ? 'bg-emerald-950 border-emerald-500 text-emerald-200'
              : 'bg-red-950 border-red-500 text-red-200'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5 text-red-400" />}
          {toast.message}
        </div>
      )}

      {/* HEADER & ACTION BAR */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-wider mb-1">
            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-bold border border-emerald-800">
              TENNIS OFFICIAL MATCH REPORT
            </span>
            <span>•</span>
            <span>{report.tournament?.name || 'Tournament'}</span>
            <span>•</span>
            <span>{report.match.round || 'Main Draw'}</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            {teamA.name} vs {teamB.name}
          </h1>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-3">
            <span><Calendar className="w-3.5 h-3.5 inline mr-1 text-slate-500" /> {report.match.date} {report.match.time}</span>
            <span><MapPin className="w-3.5 h-3.5 inline mr-1 text-slate-500" /> {report.match.venue || 'Center Court'}</span>
            {report.summaryCards?.surfaceDisplay && (
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                Surface: {report.summaryCards.surfaceDisplay}
              </span>
            )}
          </p>
        </div>

        {/* ACTIONS */}
        <div className="flex items-center gap-2 print:hidden">
          <button
            onClick={() => onRefresh()}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs text-slate-300 font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button
            onClick={handlePrint}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs text-slate-300 font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> Print / PDF
          </button>
          <button
            onClick={() => handleSendToBroadcast('TENNIS_MATCH_STATS')}
            className="px-3 py-2 bg-purple-900/60 hover:bg-purple-900 border border-purple-700 rounded-xl text-xs text-purple-200 font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Tv className="w-3.5 h-3.5" /> Push Broadcast Stats
          </button>

          {report.isFinalized ? (
            <button
              onClick={handleReopen}
              disabled={reopening}
              className="px-3 py-2 bg-amber-950/60 hover:bg-amber-900 border border-amber-700 text-amber-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Unlock className="w-3.5 h-3.5" /> {reopening ? 'Reopening...' : 'Unlock Report'}
            </button>
          ) : (
            <button
              onClick={handleFinalize}
              disabled={finalizing}
              className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950"
            >
              <Lock className="w-3.5 h-3.5" /> {finalizing ? 'Finalizing...' : 'Finalize & Lock'}
            </button>
          )}
        </div>
      </div>

      {/* FINAL MATCH RESULT BANNER */}
      <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-cyan-950/60 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Team A Profile */}
          <div className={`text-center md:text-left ${report.winnerTeamId === teamA.id ? 'scale-105' : 'opacity-80'}`}>
            <div className="flex items-center gap-3 justify-center md:justify-start">
              <span className="text-xl md:text-2xl font-black text-white">{teamA.name}</span>
              {report.winnerTeamId === teamA.id && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold flex items-center gap-1">
                  <Trophy className="w-3 h-3" /> Winner
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {report.playerStats?.find(p => p.teamId === teamA.id)?.playerName || 'Singles Player A'}
            </p>
          </div>

          {/* Center Scores */}
          <div className="text-center space-y-1.5">
            <div className="text-2xl md:text-3xl font-black font-mono text-amber-400 tracking-wider">
              {report.finalSetScoreDisplay || 'In Progress'}
            </div>
            <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              {report.matchResultText}
            </p>
            {report.isFinalized && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-700 text-[10px] font-bold">
                <CheckCircle2 className="w-3 h-3" /> Official & Certified
              </span>
            )}
          </div>

          {/* Team B Profile */}
          <div className={`text-center md:text-right ${report.winnerTeamId === teamB.id ? 'scale-105' : 'opacity-80'}`}>
            <div className="flex items-center gap-3 justify-center md:justify-end">
              {report.winnerTeamId === teamB.id && (
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 text-xs font-bold flex items-center gap-1">
                  <Trophy className="w-3 h-3" /> Winner
                </span>
              )}
              <span className="text-xl md:text-2xl font-black text-white">{teamB.name}</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {report.playerStats?.find(p => p.teamId === teamB.id)?.playerName || 'Singles Player B'}
            </p>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'summary', label: 'Match Overview', icon: Activity },
          { id: 'stats', label: 'ITF Head-to-Head Stats', icon: Zap },
          { id: 'scorecard', label: 'Set Scorecard', icon: FileText },
          { id: 'timeline', label: 'Point & Game Timeline', icon: ChevronRight },
          { id: 'awards', label: 'Awards & Honors', icon: Award },
          { id: 'squads', label: 'Players & Officials', icon: Users },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === t.id
                  ? 'bg-emerald-600 text-white shadow-lg'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: SUMMARY OVERVIEW */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          {/* Key Stat Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center space-y-1">
              <span className="text-[11px] text-slate-400 font-bold uppercase">Total Aces</span>
              <p className="text-2xl font-black text-emerald-400 font-mono">
                {(statsA?.aces || 0) + (statsB?.aces || 0)}
              </p>
              <p className="text-[10px] text-slate-500">
                {statsA?.aces || 0} ({teamA.name}) - {statsB?.aces || 0} ({teamB.name})
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center space-y-1">
              <span className="text-[11px] text-slate-400 font-bold uppercase">Double Faults</span>
              <p className="text-2xl font-black text-amber-400 font-mono">
                {(statsA?.doubleFaults || 0) + (statsB?.doubleFaults || 0)}
              </p>
              <p className="text-[10px] text-slate-500">
                {statsA?.doubleFaults || 0} - {statsB?.doubleFaults || 0}
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center space-y-1">
              <span className="text-[11px] text-slate-400 font-bold uppercase">Break Points Converted</span>
              <p className="text-2xl font-black text-cyan-400 font-mono">
                {(statsA?.breakPointsWon || 0) + (statsB?.breakPointsWon || 0)}
              </p>
              <p className="text-[10px] text-slate-500">
                {statsA?.breakPointsWon || 0}/{statsA?.breakPointsTotal || 0} vs {statsB?.breakPointsWon || 0}/{statsB?.breakPointsTotal || 0}
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center space-y-1">
              <span className="text-[11px] text-slate-400 font-bold uppercase">Total Points Played</span>
              <p className="text-2xl font-black text-purple-400 font-mono">
                {(statsA?.totalPointsWon || 0) + (statsB?.totalPointsWon || 0)}
              </p>
              <p className="text-[10px] text-slate-500">
                {report.pointTimeline?.length || 0} Points Recorded
              </p>
            </div>
          </div>

          {/* Quick Scorecard Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" /> Set by Set Breakdown
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Player / Team</th>
                    {report.setScores?.map((s) => (
                      <th key={s.setNumber} className="py-3 px-4 text-center">
                        Set {s.setNumber}
                      </th>
                    ))}
                    <th className="py-3 px-4 text-right">Total Sets</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  <tr className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      {teamA.name}
                    </td>
                    {report.setScores?.map((s) => (
                      <td key={s.setNumber} className="py-3 px-4 text-center font-mono font-bold text-slate-200">
                        {s.gamesA}
                        {s.isTiebreak && s.tiebreakScoreA !== undefined ? (
                          <sup className="text-[9px] text-emerald-400 font-bold ml-0.5">({s.tiebreakScoreA})</sup>
                        ) : null}
                      </td>
                    ))}
                    <td className="py-3 px-4 text-right font-mono font-black text-emerald-400 text-sm">
                      {report.setScores?.filter((s) => s.winnerTeamId === teamA.id).length || 0}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                      {teamB.name}
                    </td>
                    {report.setScores?.map((s) => (
                      <td key={s.setNumber} className="py-3 px-4 text-center font-mono font-bold text-slate-200">
                        {s.gamesB}
                        {s.isTiebreak && s.tiebreakScoreB !== undefined ? (
                          <sup className="text-[9px] text-cyan-400 font-bold ml-0.5">({s.tiebreakScoreB})</sup>
                        ) : null}
                      </td>
                    ))}
                    <td className="py-3 px-4 text-right font-mono font-black text-cyan-400 text-sm">
                      {report.setScores?.filter((s) => s.winnerTeamId === teamB.id).length || 0}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ITF HEAD TO HEAD STATS */}
      {activeTab === 'stats' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Official ITF / Grand Slam Head-to-Head Statistics
              </h3>
              <p className="text-xs text-slate-400">
                Derived directly from immutable point-level events.
              </p>
            </div>
          </div>

          <div className="space-y-4 max-w-3xl mx-auto">
            {/* Stat Row Component */}
            {[
              { label: 'Aces', valA: statsA?.aces || 0, valB: statsB?.aces || 0 },
              { label: 'Double Faults', valA: statsA?.doubleFaults || 0, valB: statsB?.doubleFaults || 0 },
              { label: '1st Serve In %', valA: `${statsA?.firstServePct || 0}%`, valB: `${statsB?.firstServePct || 0}%` },
              { label: '1st Serve Points Won %', valA: `${statsA?.firstServePointsWonPct || 0}%`, valB: `${statsB?.firstServePointsWonPct || 0}%` },
              { label: '2nd Serve Points Won %', valA: `${statsA?.secondServePointsWonPct || 0}%`, valB: `${statsB?.secondServePointsWonPct || 0}%` },
              { label: 'Break Points Converted', valA: `${statsA?.breakPointsWon || 0} / ${statsA?.breakPointsTotal || 0} (${statsA?.breakPointsWonPct || 0}%)`, valB: `${statsB?.breakPointsWon || 0} / ${statsB?.breakPointsTotal || 0} (${statsB?.breakPointsWonPct || 0}%)` },
              { label: 'Break Points Saved', valA: `${statsA?.breakPointsSaved || 0} / ${statsA?.breakPointsFaced || 0} (${statsA?.breakPointsSavedPct || 0}%)`, valB: `${statsB?.breakPointsSaved || 0} / ${statsB?.breakPointsFaced || 0} (${statsB?.breakPointsSavedPct || 0}%)` },
              { label: 'Service Games Won %', valA: `${statsA?.serviceGamesWonPct || 0}% (${statsA?.serviceGamesWon || 0}/${statsA?.serviceGamesPlayed || 0})`, valB: `${statsB?.serviceGamesWonPct || 0}% (${statsB?.serviceGamesWon || 0}/${statsB?.serviceGamesPlayed || 0})` },
              { label: 'Return Games Won %', valA: `${statsA?.returnGamesWonPct || 0}% (${statsA?.returnGamesWon || 0}/${statsA?.returnGamesPlayed || 0})`, valB: `${statsB?.returnGamesWonPct || 0}% (${statsB?.returnGamesWon || 0}/${statsB?.returnGamesPlayed || 0})` },
              { label: 'Clean Winners', valA: statsA?.winners || 0, valB: statsB?.winners || 0 },
              { label: 'Unforced Errors', valA: statsA?.unforcedErrors || 0, valB: statsB?.unforcedErrors || 0 },
              { label: 'Total Points Won', valA: `${statsA?.totalPointsWon || 0} (${statsA?.pointsWonPct || 0}%)`, valB: `${statsB?.totalPointsWon || 0} (${statsB?.pointsWonPct || 0}%)` },
            ].map((row, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-800/60 text-xs">
                <span className="w-1/3 font-bold text-emerald-400 font-mono text-left">{row.valA}</span>
                <span className="w-1/3 text-center text-slate-400 font-semibold">{row.label}</span>
                <span className="w-1/3 font-bold text-cyan-400 font-mono text-right">{row.valB}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: FULL SET SCORECARD */}
      {activeTab === 'scorecard' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Official Match Scorecard & Set Progression
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {report.setScores?.map((set) => (
              <div key={set.setNumber} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-white uppercase">Set {set.setNumber}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                    {set.isCompleted ? 'Completed' : 'Live'}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className={`font-bold ${set.winnerTeamId === teamA.id ? 'text-emerald-400' : 'text-slate-300'}`}>
                      {teamA.name}
                    </span>
                    <span className="font-mono font-bold text-sm text-white">
                      {set.gamesA}
                      {set.isTiebreak && set.tiebreakScoreA !== undefined ? ` (${set.tiebreakScoreA})` : ''}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className={`font-bold ${set.winnerTeamId === teamB.id ? 'text-cyan-400' : 'text-slate-300'}`}>
                      {teamB.name}
                    </span>
                    <span className="font-mono font-bold text-sm text-white">
                      {set.gamesB}
                      {set.isTiebreak && set.tiebreakScoreB !== undefined ? ` (${set.tiebreakScoreB})` : ''}
                    </span>
                  </div>
                </div>

                {set.isTiebreak && (
                  <p className="text-[10px] text-amber-400 font-semibold pt-1 border-t border-slate-800/60">
                    Decided by 7-Point Tiebreak
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: TIMELINE */}
      {activeTab === 'timeline' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Full Match Point & Game Ledger
              </h3>
              <p className="text-xs text-slate-400">
                {report.pointTimeline?.length || 0} total points in audit trail.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={timelineFilter}
                onChange={(e) => setTimelineFilter(e.target.value as any)}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
              >
                <option value="ALL">All Points</option>
                <option value="BREAKS">Break Points Only</option>
                <option value="ACES">Aces Only</option>
                <option value="WINNERS">Winners Only</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Set</th>
                  <th className="py-2.5 px-3">Game</th>
                  <th className="py-2.5 px-3">Server</th>
                  <th className="py-2.5 px-3">Winner</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Score After</th>
                  <th className="py-2.5 px-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {(report.pointTimeline || [])
                  .filter((p) => {
                    if (timelineFilter === 'ACES') return p.isAce || p.pointType === 'ACE';
                    if (timelineFilter === 'WINNERS') return p.isWinner || p.pointType === 'WINNER';
                    if (timelineFilter === 'BREAKS') return p.isBreakPoint || p.isBreakPointConverted;
                    return true;
                  })
                  .map((p, idx) => (
                    <tr key={p.id || idx} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 text-slate-500 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-300">Set {p.setNumber}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">Game {p.gameNumber}</td>
                      <td className="py-2.5 px-3 text-slate-400">{p.serverPlayerName || 'Server'}</td>
                      <td className="py-2.5 px-3 font-bold">
                        <span className={p.pointWinner === 'TEAM_A' ? 'text-emerald-400' : 'text-cyan-400'}>
                          {p.pointWinner === 'TEAM_A' ? teamA.name : teamB.name}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-semibold text-[11px]">
                          {p.pointType.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-amber-400">
                        {p.scoreAfter?.pointsA || p.scoreAfterPointA || '0'} - {p.scoreAfter?.pointsB || p.scoreAfterPointB || '0'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {p.isAce ? '⚡ Ace' : p.isWinner ? '🎯 Winner' : p.isBreakPointConverted ? '🔥 Break Point Converted' : p.shotDetail || '—'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: AWARDS & HONORS */}
      {activeTab === 'awards' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Official Tennis Match Awards & Citations
              </h3>
              <p className="text-xs text-slate-400">
                Algorithmically recommended from performance metrics; customizable by tournament admins.
              </p>
            </div>
            {!report.isFinalized && !editingAwards && (
              <button
                onClick={() => setEditingAwards(true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold cursor-pointer"
              >
                Edit Awards
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Player of the Match */}
            <div className="bg-slate-950 border border-amber-500/40 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                <Trophy className="w-4 h-4" /> Player of the Match
              </div>
              <h4 className="text-lg font-black text-white">
                {report.selectedPlayerOfMatch?.playerName || report.suggestedPlayerOfMatch?.playerName || 'Unassigned'}
              </h4>
              <p className="text-xs text-slate-400">
                {report.selectedPlayerOfMatch?.teamName || report.suggestedPlayerOfMatch?.teamName}
              </p>
              <p className="text-xs text-amber-300/80 italic">
                "{report.selectedPlayerOfMatch?.performanceDescription || report.suggestedPlayerOfMatch?.performanceDescription || 'Exceptional performance throughout the match.'}"
              </p>
            </div>

            {/* Best Server */}
            <div className="bg-slate-950 border border-emerald-500/40 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                <Zap className="w-4 h-4" /> Best Server Award
              </div>
              <h4 className="text-lg font-black text-white">
                {report.selectedBestServer?.playerName || report.suggestedBestServer?.playerName || 'Unassigned'}
              </h4>
              <p className="text-xs text-slate-400">
                {report.selectedBestServer?.teamName || report.suggestedBestServer?.teamName}
              </p>
              <p className="text-xs text-emerald-300/80 italic">
                "{report.selectedBestServer?.performanceDescription || report.suggestedBestServer?.performanceDescription || 'Dominant service games and high ace count.'}"
              </p>
            </div>

            {/* Best Returner */}
            <div className="bg-slate-950 border border-cyan-500/40 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                <Award className="w-4 h-4" /> Best Returner Award
              </div>
              <h4 className="text-lg font-black text-white">
                {report.selectedBestReturner?.playerName || report.suggestedBestReturner?.playerName || 'Unassigned'}
              </h4>
              <p className="text-xs text-slate-400">
                {report.selectedBestReturner?.teamName || report.suggestedBestReturner?.teamName}
              </p>
              <p className="text-xs text-cyan-300/80 italic">
                "{report.selectedBestReturner?.performanceDescription || report.suggestedBestReturner?.performanceDescription || 'High return percentage and key break points converted.'}"
              </p>
            </div>
          </div>

          {/* EDIT AWARDS FORM */}
          {editingAwards && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4 pt-4 border-t border-slate-800">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Override Official Match Awards
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Player of the Match</label>
                  <select
                    value={selectedMomId}
                    onChange={(e) => setSelectedMomId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                  >
                    <option value="">Select Candidate</option>
                    {(report.playerStats || []).map((p) => (
                      <option key={p.playerId} value={p.playerId}>{p.playerName} ({p.teamName})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Best Server</label>
                  <select
                    value={selectedServerId}
                    onChange={(e) => setSelectedServerId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                  >
                    <option value="">Select Candidate</option>
                    {(report.playerStats || []).map((p) => (
                      <option key={p.playerId} value={p.playerId}>{p.playerName} ({p.teamName})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Best Returner</label>
                  <select
                    value={selectedReturnerId}
                    onChange={(e) => setSelectedReturnerId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                  >
                    <option value="">Select Candidate</option>
                    {(report.playerStats || []).map((p) => (
                      <option key={p.playerId} value={p.playerId}>{p.playerName} ({p.teamName})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Award Citation / Reason</label>
                <input
                  type="text"
                  value={momReason}
                  onChange={(e) => setMomReason(e.target.value)}
                  placeholder="e.g. Converted 4 break points and served 8 aces."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setEditingAwards(false)}
                  className="px-3 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAwards}
                  disabled={savingAwards}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  {savingAwards ? 'Saving...' : 'Save Awards'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: SQUADS & OFFICIALS */}
      {activeTab === 'squads' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" /> Match Participants
            </h3>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <p className="font-bold text-emerald-400">{teamA.name}</p>
                <p className="text-slate-300 mt-1">
                  {report.playerStats?.find(p => p.teamId === teamA.id)?.playerName || 'Player A'}
                </p>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <p className="font-bold text-cyan-400">{teamB.name}</p>
                <p className="text-slate-300 mt-1">
                  {report.playerStats?.find(p => p.teamId === teamB.id)?.playerName || 'Player B'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" /> Officials & Venue
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Chair Umpire:</span>
                <span className="font-bold text-slate-200">{report.officialsReport?.umpire || 'Assigned Umpire'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Match Referee:</span>
                <span className="font-bold text-slate-200">{report.officialsReport?.referee || 'ITF Referee'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Official Scorer:</span>
                <span className="font-bold text-slate-200">{report.officialsReport?.scorer || 'Certified Scorer'}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Title Sponsor:</span>
                <span className="font-bold text-slate-200">{report.sponsorsReport?.sponsorName || 'Tournament Sponsor'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
