import React, { useState } from 'react';
import { HockeyMatchReport, AwardCandidate } from '../../types';
import { api } from '../../services/api';
import {
  Trophy,
  Award,
  Printer,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Zap,
  BarChart2,
  Users,
  Shield,
  Clock,
  Tv,
} from 'lucide-react';

interface HockeyReportViewProps {
  report: HockeyMatchReport;
  onRefresh?: () => void;
}

export const HockeyReportView: React.FC<HockeyReportViewProps> = ({
  report,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<
    'summary' | 'stats' | 'players' | 'timeline' | 'awards' | 'squads'
  >('summary');

  const matchId = report.match?.id || '';
  const teamA = report.teamA || report.match?.teamA || { id: 'teamA', name: 'Team A' };
  const teamB = report.teamB || report.match?.teamB || { id: 'teamB', name: 'Team B' };

  const teamAScore = report.finalScore?.teamA ?? report.summaryCards?.finalScoreA ?? 0;
  const teamBScore = report.finalScore?.teamB ?? report.summaryCards?.finalScoreB ?? 0;

  const quarters = report.periodScores || [];
  const timelineEvents = report.events || [];
  const allPlayers = report.playerStats || [];
  const teamAPlayers = allPlayers.filter((p) => p.teamId === teamA.id);
  const teamBPlayers = allPlayers.filter((p) => p.teamId === teamB.id);

  const teamAStats = report.teamAStats || {
    penaltyCorners: 0,
    shotsOnTarget: 0,
    shots: 0,
    greenCards: 0,
    yellowCards: 0,
    redCards: 0,
    penaltyStrokesAwarded: 0,
    penaltyStrokesConverted: 0,
  };
  const teamBStats = report.teamBStats || {
    penaltyCorners: 0,
    shotsOnTarget: 0,
    shots: 0,
    greenCards: 0,
    yellowCards: 0,
    redCards: 0,
    penaltyStrokesAwarded: 0,
    penaltyStrokesConverted: 0,
  };

  const isShootout = !!report.summaryCards?.isShootout || (report.shootoutAttempts && report.shootoutAttempts.length > 0);
  const shootoutScoreA = report.shootoutScore?.teamA ?? 0;
  const shootoutScoreB = report.shootoutScore?.teamB ?? 0;

  // Awards Editing State
  const [editingAwards, setEditingAwards] = useState(false);
  const [selectedPlayerOfMatchId, setSelectedPlayerOfMatchId] = useState(
    report.selectedPlayerOfMatch?.playerId || report.suggestedPlayerOfMatch?.playerId || ''
  );
  const [playerOfMatchReason, setPlayerOfMatchReason] = useState(
    report.selectedPlayerOfMatch?.details || report.suggestedPlayerOfMatch?.details || ''
  );
  const [selectedBestForwardId, setSelectedBestForwardId] = useState(
    report.selectedBestForward?.playerId || report.suggestedBestForward?.playerId || ''
  );
  const [selectedBestGoalkeeperId, setSelectedBestGoalkeeperId] = useState(
    report.selectedBestGoalkeeper?.playerId || report.suggestedBestGoalkeeper?.playerId || ''
  );
  const [savingAwards, setSavingAwards] = useState(false);

  // Finalization State
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [reopening, setReopening] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSaveAwards = async () => {
    setSavingAwards(true);
    try {
      await api.updateMatchAwards(matchId, {
        playerOfTheMatchId: selectedPlayerOfMatchId,
        playerOfTheMatchReason: playerOfMatchReason,
        bestForwardId: selectedBestForwardId,
        bestGoalkeeperId: selectedBestGoalkeeperId,
      });
      setEditingAwards(false);
      showToast('Match awards updated successfully!');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to save awards.', 'error');
    } finally {
      setSavingAwards(false);
    }
  };

  const handleFinalizeReport = async () => {
    setFinalizing(true);
    try {
      await api.finalizeMatchReport(matchId);
      setShowFinalizeModal(false);
      showToast('Field Hockey match report finalized and locked successfully!');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to finalize report.', 'error');
    } finally {
      setFinalizing(false);
    }
  };

  const handleReopenReport = async () => {
    if (!window.confirm('Are you sure you want to reopen this finalized report for editing?')) return;
    setReopening(true);
    try {
      await api.reopenMatchReport(matchId);
      showToast('Match report reopened for editing.');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to reopen report.', 'error');
    } finally {
      setReopening(false);
    }
  };

  const handleSendToBroadcast = async (overlayType: string) => {
    try {
      await api.triggerBroadcastEvent(matchId, {
        type: overlayType,
        durationSeconds: 15,
      });
      showToast(`Broadcast graphic overlay "${overlayType}" triggered on single broadcast URL!`);
    } catch (err: any) {
      showToast(err.message || 'Failed to send to broadcast.', 'error');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* TOAST */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-2.5 rounded-xl font-bold text-xs shadow-2xl flex items-center gap-2 ${
            toast.type === 'error' ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-slate-950'
          }`}
        >
          {toast.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* TOP REPORT HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-black tracking-wider uppercase">
              FIELD HOCKEY OFFICIAL MATCH REPORT
            </span>
            {report.isFinalized ? (
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[11px] font-bold flex items-center gap-1">
                <Lock className="w-3 h-3" /> Finalized & Verified
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-bold flex items-center gap-1">
                <Unlock className="w-3 h-3" /> Draft / Live
              </span>
            )}
          </div>
          <h1 className="text-xl md:text-2xl font-black text-white">{report.match?.name || `${teamA.name} vs ${teamB.name}`}</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {report.tournament?.name || 'Tournament'} • {report.group?.name || 'Group'} • {report.match?.venue || 'Hockey Turf Stadium'}
          </p>
        </div>

        {/* TOP ACTIONS */}
        <div className="flex items-center flex-wrap gap-2 print:hidden">
          <button
            onClick={handlePrint}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> Print / PDF
          </button>

          {report.isFinalized ? (
            <button
              onClick={handleReopenReport}
              disabled={reopening}
              className="px-3 py-2 rounded-xl bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Unlock className="w-3.5 h-3.5" /> Reopen Report
            </button>
          ) : (
            <button
              onClick={() => setShowFinalizeModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" /> Finalize & Lock
            </button>
          )}
        </div>
      </div>

      {/* FINAL SCORECARD HERO BANNER */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 relative z-10">
          {/* TEAM A */}
          <div className="flex items-center gap-4 flex-1 justify-end text-right">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-white">{teamA.name}</h2>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">
                PC: {teamAStats.penaltyCorners} • Shots: {teamAStats.shotsOnTarget}
              </p>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center text-4xl font-black text-emerald-400 shadow-inner">
              {teamAScore}
            </div>
          </div>

          {/* VS / RESULT BADGE */}
          <div className="text-center px-4">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest block mb-1">
              {report.match?.status === 'COMPLETED' ? 'FULL TIME' : 'MATCH STATUS'}
            </span>
            <div className="px-4 py-1.5 rounded-full bg-slate-950 border border-slate-800 text-xs font-black text-emerald-400 shadow-sm">
              {report.matchResultText || `${teamAScore} - ${teamBScore}`}
            </div>
          </div>

          {/* TEAM B */}
          <div className="flex items-center gap-4 flex-1 justify-start text-left">
            <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border-2 border-sky-500/30 flex items-center justify-center text-4xl font-black text-sky-400 shadow-inner">
              {teamBScore}
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-white">{teamB.name}</h2>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">
                PC: {teamBStats.penaltyCorners} • Shots: {teamBStats.shotsOnTarget}
              </p>
            </div>
          </div>
        </div>

        {/* QUARTERS TABLE */}
        <div className="mt-6 pt-4 border-t border-slate-800 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="text-slate-500 border-b border-slate-800/80">
                <th className="py-1.5 font-bold">Team</th>
                {quarters.map((q) => (
                  <th key={q.period} className="py-1.5 text-center font-bold font-mono">
                    {q.periodName}
                  </th>
                ))}
                {isShootout && <th className="py-1.5 text-center font-bold text-purple-400">Shootout</th>}
                <th className="py-1.5 text-right font-black text-slate-200">TOTAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              <tr>
                <td className="py-2 font-bold text-emerald-400">{teamA.name}</td>
                {quarters.map((q) => (
                  <td key={q.period} className="py-2 text-center font-mono font-bold text-slate-300">
                    {q.teamAScore}
                  </td>
                ))}
                {isShootout && (
                  <td className="py-2 text-center font-mono font-bold text-purple-300">
                    {shootoutScoreA}
                  </td>
                )}
                <td className="py-2 text-right font-mono font-black text-white text-sm">
                  {teamAScore}
                </td>
              </tr>
              <tr>
                <td className="py-2 font-bold text-sky-400">{teamB.name}</td>
                {quarters.map((q) => (
                  <td key={q.period} className="py-2 text-center font-mono font-bold text-slate-300">
                    {q.teamBScore}
                  </td>
                ))}
                {isShootout && (
                  <td className="py-2 text-center font-mono font-bold text-purple-300">
                    {shootoutScoreB}
                  </td>
                )}
                <td className="py-2 text-right font-mono font-black text-white text-sm">
                  {teamBScore}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex items-center gap-1 border-b border-slate-800 overflow-x-auto pb-1 text-xs font-bold">
        <button
          onClick={() => setActiveTab('summary')}
          className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'summary'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5" /> Overview
        </button>

        <button
          onClick={() => setActiveTab('stats')}
          className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'stats'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" /> Team Stats Comparison
        </button>

        <button
          onClick={() => setActiveTab('players')}
          className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'players'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" /> Player Statistics
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'timeline'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5" /> Match Timeline ({timelineEvents.length})
        </button>

        <button
          onClick={() => setActiveTab('awards')}
          className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'awards'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" /> Match Awards
        </button>

        <button
          onClick={() => setActiveTab('squads')}
          className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'squads'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Shield className="w-3.5 h-3.5" /> Playing Squads
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW & GOAL SCORERS */}
      {/* ========================================================================= */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          {/* GOAL SCORERS SUMMARY */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* TEAM A GOALS */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
                <span>{teamA.name} Goals</span>
                <span>{teamAScore}</span>
              </h3>
              {timelineEvents.filter((e) => e.eventType === 'GOAL' && e.teamId === teamA.id).length === 0 ? (
                <p className="text-xs text-slate-500 italic">No goals scored</p>
              ) : (
                <div className="space-y-2">
                  {timelineEvents
                    .filter((e) => e.eventType === 'GOAL' && e.teamId === teamA.id)
                    .map((g) => (
                      <div key={g.id} className="p-2 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                            {g.matchTimeDisplay}
                          </span>
                          <span className="font-bold text-white">{g.playerName || 'Goal'}</span>
                          {g.assistPlayerName && <span className="text-slate-400 text-[11px]">(ast: {g.assistPlayerName})</span>}
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">{g.goalType?.replace('_', ' ')}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* TEAM B GOALS */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center justify-between">
                <span>{teamB.name} Goals</span>
                <span>{teamBScore}</span>
              </h3>
              {timelineEvents.filter((e) => e.eventType === 'GOAL' && e.teamId === teamB.id).length === 0 ? (
                <p className="text-xs text-slate-500 italic">No goals scored</p>
              ) : (
                <div className="space-y-2">
                  {timelineEvents
                    .filter((e) => e.eventType === 'GOAL' && e.teamId === teamB.id)
                    .map((g) => (
                      <div key={g.id} className="p-2 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-sky-400 bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-800/40">
                            {g.matchTimeDisplay}
                          </span>
                          <span className="font-bold text-white">{g.playerName || 'Goal'}</span>
                          {g.assistPlayerName && <span className="text-slate-400 text-[11px]">(ast: {g.assistPlayerName})</span>}
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">{g.goalType?.replace('_', ' ')}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* BROADCAST ACTIONS BAR */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/40 to-slate-900 border border-indigo-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <Tv className="w-4 h-4 text-indigo-400" /> Send Match Graphics to Broadcast
              </h4>
              <p className="text-[11px] text-slate-400">Trigger real-time broadcast overlays for live streaming or big screen display.</p>
            </div>
            <div className="flex items-center flex-wrap gap-2">
              <button
                onClick={() => handleSendToBroadcast('MATCH_SUMMARY')}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition"
              >
                Match Summary
              </button>
              <button
                onClick={() => handleSendToBroadcast('PENALTY_CORNER_STATS')}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition"
              >
                PC Stats
              </button>
              <button
                onClick={() => handleSendToBroadcast('PLAYER_OF_MATCH')}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition"
              >
                Player of Match
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TEAM STATISTICS COMPARISON */}
      {/* ========================================================================= */}
      {activeTab === 'stats' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider border-b border-slate-800 pb-3">
            Team Head-to-Head Key Statistics
          </h3>

          <div className="space-y-4 max-w-2xl mx-auto">
            {/* GOALS */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-emerald-400">{teamAScore}</span>
                <span className="text-slate-400 uppercase">Goals</span>
                <span className="text-sky-400">{teamBScore}</span>
              </div>
              <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-950 border border-slate-800">
                <div
                  style={{ width: `${((teamAScore || 0) / Math.max(1, (teamAScore || 0) + (teamBScore || 0))) * 100}%` }}
                  className="bg-emerald-500"
                ></div>
                <div
                  style={{ width: `${((teamBScore || 0) / Math.max(1, (teamAScore || 0) + (teamBScore || 0))) * 100}%` }}
                  className="bg-sky-500"
                ></div>
              </div>
            </div>

            {/* PENALTY CORNERS */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-emerald-400">{teamAStats.penaltyCorners}</span>
                <span className="text-slate-400 uppercase">Penalty Corners</span>
                <span className="text-sky-400">{teamBStats.penaltyCorners}</span>
              </div>
              <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-950 border border-slate-800">
                <div
                  style={{
                    width: `${
                      ((teamAStats.penaltyCorners || 0) /
                        Math.max(1, (teamAStats.penaltyCorners || 0) + (teamBStats.penaltyCorners || 0))) *
                      100
                    }%`,
                  }}
                  className="bg-emerald-500"
                ></div>
                <div
                  style={{
                    width: `${
                      ((teamBStats.penaltyCorners || 0) /
                        Math.max(1, (teamAStats.penaltyCorners || 0) + (teamBStats.penaltyCorners || 0))) *
                      100
                    }%`,
                  }}
                  className="bg-sky-500"
                ></div>
              </div>
            </div>

            {/* SHOTS ON TARGET */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-emerald-400">{teamAStats.shotsOnTarget}</span>
                <span className="text-slate-400 uppercase">Shots on Target</span>
                <span className="text-sky-400">{teamBStats.shotsOnTarget}</span>
              </div>
              <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-950 border border-slate-800">
                <div
                  style={{
                    width: `${
                      ((teamAStats.shotsOnTarget || 0) /
                        Math.max(1, (teamAStats.shotsOnTarget || 0) + (teamBStats.shotsOnTarget || 0))) *
                      100
                    }%`,
                  }}
                  className="bg-emerald-500"
                ></div>
                <div
                  style={{
                    width: `${
                      ((teamBStats.shotsOnTarget || 0) /
                        Math.max(1, (teamAStats.shotsOnTarget || 0) + (teamBStats.shotsOnTarget || 0))) *
                      100
                    }%`,
                  }}
                  className="bg-sky-500"
                ></div>
              </div>
            </div>

            {/* PENALTY STROKES */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-emerald-400">{teamAStats.penaltyStrokesAwarded} ({teamAStats.penaltyStrokesConverted} scored)</span>
                <span className="text-slate-400 uppercase">Penalty Strokes</span>
                <span className="text-sky-400">{teamBStats.penaltyStrokesAwarded} ({teamBStats.penaltyStrokesConverted} scored)</span>
              </div>
            </div>

            {/* DISCIPLINE / CARDS */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-emerald-400">
                  G: {teamAStats.greenCards} • Y: {teamAStats.yellowCards} • R: {teamAStats.redCards}
                </span>
                <span className="text-slate-400 uppercase">Cards (Green / Yellow / Red)</span>
                <span className="text-sky-400">
                  G: {teamBStats.greenCards} • Y: {teamBStats.yellowCards} • R: {teamBStats.redCards}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PLAYER STATISTICS */}
      {/* ========================================================================= */}
      {activeTab === 'players' && (
        <div className="space-y-6">
          {/* TEAM A PLAYERS */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              {teamA.name} — Player Match Performance
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-800">
                    <th className="py-2">#</th>
                    <th className="py-2">Player</th>
                    <th className="py-2">Role</th>
                    <th className="py-2 text-center">Goals</th>
                    <th className="py-2 text-center">Assists</th>
                    <th className="py-2 text-center">PC Goals</th>
                    <th className="py-2 text-center">Saves (GK)</th>
                    <th className="py-2 text-center">Cards</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {teamAPlayers.map((p) => (
                    <tr key={p.playerId} className="hover:bg-slate-950/50">
                      <td className="py-2 font-mono text-slate-400">#{p.jerseyNumber || '-'}</td>
                      <td className="py-2 font-bold text-white">{p.playerName}</td>
                      <td className="py-2 text-slate-400">{p.role || 'Player'}</td>
                      <td className="py-2 text-center font-bold text-emerald-400">{p.goals || 0}</td>
                      <td className="py-2 text-center text-slate-300">{p.assists || 0}</td>
                      <td className="py-2 text-center text-amber-300">{p.penaltyCornerGoals || 0}</td>
                      <td className="py-2 text-center text-purple-300">{p.saves || 0}</td>
                      <td className="py-2 text-center">
                        <span className="text-[11px] font-bold text-slate-300">
                          {p.greenCards > 0 && <span className="text-emerald-400 mr-1">G{p.greenCards}</span>}
                          {p.yellowCards > 0 && <span className="text-amber-400 mr-1">Y{p.yellowCards}</span>}
                          {p.redCards > 0 && <span className="text-rose-500">R{p.redCards}</span>}
                          {p.greenCards === 0 && p.yellowCards === 0 && p.redCards === 0 && '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* TEAM B PLAYERS */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider">
              {teamB.name} — Player Match Performance
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-800">
                    <th className="py-2">#</th>
                    <th className="py-2">Player</th>
                    <th className="py-2">Role</th>
                    <th className="py-2 text-center">Goals</th>
                    <th className="py-2 text-center">Assists</th>
                    <th className="py-2 text-center">PC Goals</th>
                    <th className="py-2 text-center">Saves (GK)</th>
                    <th className="py-2 text-center">Cards</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {teamBPlayers.map((p) => (
                    <tr key={p.playerId} className="hover:bg-slate-950/50">
                      <td className="py-2 font-mono text-slate-400">#{p.jerseyNumber || '-'}</td>
                      <td className="py-2 font-bold text-white">{p.playerName}</td>
                      <td className="py-2 text-slate-400">{p.role || 'Player'}</td>
                      <td className="py-2 text-center font-bold text-sky-400">{p.goals || 0}</td>
                      <td className="py-2 text-center text-slate-300">{p.assists || 0}</td>
                      <td className="py-2 text-center text-amber-300">{p.penaltyCornerGoals || 0}</td>
                      <td className="py-2 text-center text-purple-300">{p.saves || 0}</td>
                      <td className="py-2 text-center">
                        <span className="text-[11px] font-bold text-slate-300">
                          {p.greenCards > 0 && <span className="text-emerald-400 mr-1">G{p.greenCards}</span>}
                          {p.yellowCards > 0 && <span className="text-amber-400 mr-1">Y{p.yellowCards}</span>}
                          {p.redCards > 0 && <span className="text-rose-500">R{p.redCards}</span>}
                          {p.greenCards === 0 && p.yellowCards === 0 && p.redCards === 0 && '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: MATCH TIMELINE */}
      {/* ========================================================================= */}
      {activeTab === 'timeline' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider border-b border-slate-800 pb-3">
            Chronological Match Event Timeline
          </h3>

          {timelineEvents.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No timeline events recorded.</p>
          ) : (
            <div className="space-y-2">
              {timelineEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-12 text-center font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                      {ev.matchTimeDisplay}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        ev.eventType === 'GOAL'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : ev.eventType === 'PENALTY_CORNER'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : ev.eventType === 'PENALTY_STROKE'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : ev.eventType === 'CARD'
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          : ev.eventType === 'SUBSTITUTION'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {ev.eventType.replace('_', ' ')}
                    </span>
                    <div>
                      <p className="font-bold text-slate-200">
                        {ev.eventType === 'GOAL' ? (
                          <>
                            ⚽ {ev.teamName}: {ev.playerName || 'Goal'}{' '}
                            {ev.assistPlayerName ? `(Assist: ${ev.assistPlayerName})` : ''}
                          </>
                        ) : ev.eventType === 'PENALTY_CORNER' ? (
                          <>PC for {ev.teamName} — Outcome: {ev.penaltyCornerOutcome}</>
                        ) : ev.eventType === 'PENALTY_STROKE' ? (
                          <>PS for {ev.teamName} by {ev.playerName} — {ev.penaltyStrokeOutcome}</>
                        ) : ev.eventType === 'CARD' ? (
                          <>
                            {ev.cardType} Card: {ev.playerName} ({ev.teamName}) • {ev.cardDurationMinutes}m
                          </>
                        ) : ev.eventType === 'SUBSTITUTION' ? (
                          <>
                            🔄 Sub: {ev.playerInName} IN for {ev.playerOutName} ({ev.teamName})
                          </>
                        ) : (
                          <>{ev.eventType}</>
                        )}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Quarter: {ev.periodName} • Score: {ev.scoreA_after} - {ev.scoreB_after}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: MATCH AWARDS */}
      {/* ========================================================================= */}
      {activeTab === 'awards' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Trophy className="w-4 h-4 text-emerald-400" /> Match Awards & Honors
            </h3>
            {!report.isFinalized && (
              <button
                onClick={() => setEditingAwards(!editingAwards)}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition cursor-pointer"
              >
                {editingAwards ? 'Cancel Edit' : 'Edit / Override Awards'}
              </button>
            )}
          </div>

          {/* AWARDS CARDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* PLAYER OF THE MATCH */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" /> PLAYER OF THE MATCH
                </span>
              </div>
              <div>
                <h4 className="text-base font-black text-white">
                  {report.selectedPlayerOfMatch?.playerName || report.selectedPlayerOfMatch?.name || report.suggestedPlayerOfMatch?.playerName || report.suggestedPlayerOfMatch?.name || 'Not Awarded'}
                </h4>
                <p className="text-xs text-amber-200/80 mt-1">
                  {report.selectedPlayerOfMatch?.details || report.suggestedPlayerOfMatch?.details || 'Outstanding performance'}
                </p>
              </div>
            </div>

            {/* BEST FORWARD */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" /> BEST FORWARD / STRIKER
                </span>
              </div>
              <div>
                <h4 className="text-base font-black text-white">
                  {report.selectedBestForward?.playerName || report.selectedBestForward?.name || report.suggestedBestForward?.playerName || report.suggestedBestForward?.name || 'Not Awarded'}
                </h4>
                <p className="text-xs text-emerald-200/80 mt-1">
                  {report.selectedBestForward?.details || report.suggestedBestForward?.details || 'Top attacking play'}
                </p>
              </div>
            </div>

            {/* BEST GOALKEEPER */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-900 border border-purple-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-purple-400 uppercase tracking-wider flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" /> BEST GOALKEEPER
                </span>
              </div>
              <div>
                <h4 className="text-base font-black text-white">
                  {report.selectedBestGoalkeeper?.playerName || report.selectedBestGoalkeeper?.name || report.suggestedBestGoalkeeper?.playerName || report.suggestedBestGoalkeeper?.name || 'Not Awarded'}
                </h4>
                <p className="text-xs text-purple-200/80 mt-1">
                  {report.selectedBestGoalkeeper?.details || report.suggestedBestGoalkeeper?.details || 'Crucial stops and defense'}
                </p>
              </div>
            </div>
          </div>

          {/* EDIT FORM (WHEN ACTIVE) */}
          {editingAwards && (
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Select Award Winners</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1 font-bold">Player of Match</label>
                  <select
                    value={selectedPlayerOfMatchId}
                    onChange={(e) => setSelectedPlayerOfMatchId(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                  >
                    <option value="">-- Select Player --</option>
                    {allPlayers.map((p) => (
                      <option key={p.playerId} value={p.playerId}>
                        {p.playerName} ({p.teamId === teamA.id ? teamA.name : teamB.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-bold">Best Forward</label>
                  <select
                    value={selectedBestForwardId}
                    onChange={(e) => setSelectedBestForwardId(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                  >
                    <option value="">-- Select Forward --</option>
                    {allPlayers.map((p) => (
                      <option key={p.playerId} value={p.playerId}>
                        {p.playerName} ({p.teamId === teamA.id ? teamA.name : teamB.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-bold">Best Goalkeeper</label>
                  <select
                    value={selectedBestGoalkeeperId}
                    onChange={(e) => setSelectedBestGoalkeeperId(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                  >
                    <option value="">-- Select Goalkeeper --</option>
                    {allPlayers.map((p) => (
                      <option key={p.playerId} value={p.playerId}>
                        {p.playerName} ({p.teamId === teamA.id ? teamA.name : teamB.name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-bold text-xs">Award Citation / Reason</label>
                <input
                  type="text"
                  value={playerOfMatchReason}
                  onChange={(e) => setPlayerOfMatchReason(e.target.value)}
                  placeholder="e.g. Scored 2 field goals and 1 penalty corner in Q4 comeback"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingAwards(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAwards}
                  disabled={savingAwards}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  Save Awards
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: PLAYING SQUADS */}
      {/* ========================================================================= */}
      {activeTab === 'squads' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              {teamA.name} Squad ({teamAPlayers.length} Players)
            </h3>
            <div className="space-y-1">
              {teamAPlayers.map((p) => (
                <div key={p.playerId} className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-400">#{p.jerseyNumber || '-'}</span>
                    <span className="font-bold text-slate-200">{p.playerName}</span>
                  </div>
                  <span className="text-[11px] text-slate-400">{p.role || 'Player'}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider">
              {teamB.name} Squad ({teamBPlayers.length} Players)
            </h3>
            <div className="space-y-1">
              {teamBPlayers.map((p) => (
                <div key={p.playerId} className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-400">#{p.jerseyNumber || '-'}</span>
                    <span className="font-bold text-slate-200">{p.playerName}</span>
                  </div>
                  <span className="text-[11px] text-slate-400">{p.role || 'Player'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: FINALIZE REPORT */}
      {/* ========================================================================= */}
      {showFinalizeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-emerald-400" /> Finalize Match Report
              </h3>
              <button onClick={() => setShowFinalizeModal(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <p className="text-xs text-slate-300">
              Finalizing will lock all event logs, score totals, player statistics, and match awards for this match.
            </p>

            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs font-bold">
              ✔ Consistency checks passed: Scores match event totals ({teamAScore} - {teamBScore}).
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowFinalizeModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFinalizeReport}
                disabled={finalizing}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                {finalizing ? 'Finalizing...' : 'Lock & Finalize'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
