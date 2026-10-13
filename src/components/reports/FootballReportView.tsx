import React, { useState } from 'react';
import { FootballMatchReport, AwardCandidate } from '../../types';
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
  Download,
  Flame,
  ArrowRightLeft,
} from 'lucide-react';
import { Button } from '../ui/Button';

interface FootballReportViewProps {
  report: FootballMatchReport;
  onRefresh?: () => void;
}

export const FootballReportView: React.FC<FootballReportViewProps> = ({
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

  const periods = report.periodScores || [];
  const timelineEvents = report.events || [];
  const goalEvents = report.goalTimeline || [];
  const cardEvents = report.cardsList || [];
  const subEvents = report.substitutions || [];
  const allPlayers = report.playerStats || [];
  const teamAPlayers = allPlayers.filter((p) => p.teamId === teamA.id);
  const teamBPlayers = allPlayers.filter((p) => p.teamId === teamB.id);

  const teamAStats = report.teamAStats || {
    goals: 0,
    openPlayGoals: 0,
    penaltyGoals: 0,
    freeKickGoals: 0,
    corners: 0,
    shots: 0,
    shotsOnTarget: 0,
    possessionPercentage: 50,
    fouls: 0,
    offsides: 0,
    yellowCards: 0,
    redCards: 0,
    saves: 0,
    cleanSheet: true,
  };

  const teamBStats = report.teamBStats || {
    goals: 0,
    openPlayGoals: 0,
    penaltyGoals: 0,
    freeKickGoals: 0,
    corners: 0,
    shots: 0,
    shotsOnTarget: 0,
    possessionPercentage: 50,
    fouls: 0,
    offsides: 0,
    yellowCards: 0,
    redCards: 0,
    saves: 0,
    cleanSheet: true,
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
    report.selectedPlayerOfMatch?.performanceDescription || report.suggestedPlayerOfMatch?.performanceDescription || ''
  );
  const [selectedBestForwardId, setSelectedBestForwardId] = useState(
    report.selectedBestForward?.playerId || report.suggestedBestForward?.playerId || ''
  );
  const [selectedBestMidfielderId, setSelectedBestMidfielderId] = useState(
    report.selectedBestMidfielder?.playerId || report.suggestedBestMidfielder?.playerId || ''
  );
  const [selectedBestDefenderId, setSelectedBestDefenderId] = useState(
    report.selectedBestDefender?.playerId || report.suggestedBestDefender?.playerId || ''
  );
  const [selectedBestGoalkeeperId, setSelectedBestGoalkeeperId] = useState(
    report.selectedBestGoalkeeper?.playerId || report.suggestedBestGoalkeeper?.playerId || ''
  );
  const [selectedTopScorerId, setSelectedTopScorerId] = useState(
    report.selectedTopScorer?.playerId || report.suggestedTopScorer?.playerId || ''
  );
  const [savingAwards, setSavingAwards] = useState(false);

  // Finalization State
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const rows = [
      ['Match', `${teamA.name} vs ${teamB.name}`],
      ['Score', `${teamAScore} - ${teamBScore}`],
      ['Result', report.matchResultText || ''],
      ['Tournament', report.tournament?.name || ''],
      ['Date', report.match?.date || ''],
      ['Venue', report.match?.venue || ''],
      [],
      ['Player Performance', 'Team', 'Role', 'Goals', 'Assists', 'Shots on Target', 'Yellow Cards', 'Red Cards', 'Saves', 'Clean Sheet'],
      ...allPlayers.map((p) => [
        p.playerName,
        p.teamName,
        p.role,
        p.goals,
        p.assists,
        p.shotsOnTarget,
        p.yellowCards,
        p.redCards,
        p.saves,
        p.cleanSheet ? 'Yes' : 'No',
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `football_match_${report.match?.id || 'report'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveAwards = async () => {
    if (!matchId) return;
    setSavingAwards(true);
    try {
      await api.updateMatchAwards(matchId, {
        playerOfTheMatchId: selectedPlayerOfMatchId || undefined,
        playerOfTheMatchReason: playerOfMatchReason || undefined,
        bestForwardId: selectedBestForwardId || undefined,
        bestGoalkeeperId: selectedBestGoalkeeperId || undefined,
        bestDefenderId: selectedBestDefenderId || undefined,
        bestPlaymakerId: selectedBestMidfielderId || undefined,
      });
      showToast('Official Match Awards saved successfully!');
      setEditingAwards(false);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to save match awards', 'error');
    } finally {
      setSavingAwards(false);
    }
  };

  const handleFinalizeMatch = async () => {
    if (!matchId) return;
    setFinalizing(true);
    try {
      await api.finalizeMatchReport(matchId);
      showToast('Match report officially finalized & signed.');
      setShowFinalizeModal(false);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to finalize report', 'error');
    } finally {
      setFinalizing(false);
    }
  };

  const handleReopenMatch = async () => {
    if (!matchId) return;
    if (!window.confirm('Reopen match report for official corrections?')) return;
    try {
      await api.reopenMatchReport(matchId);
      showToast('Match report unlocked for editing.');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to reopen report', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 print:p-0 print:space-y-4">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-semibold border backdrop-blur-md transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/90 border-rose-500/50 text-rose-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* TOP HEADER CONTROLS BAR (Hidden in print) */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900 border border-slate-800 rounded-2xl print:hidden shadow-lg">
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            ⚽
          </span>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              Official Football Match Report & Scorecard
              {report.isFinalized ? (
                <span className="flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Lock className="w-3 h-3" /> Finalized
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Unlock className="w-3 h-3" /> Draft / Live
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-400">
              {report.tournament?.name || 'Tournament'} • {report.group?.name || 'Group'} • {report.match?.round || 'Round'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="border-slate-700 text-slate-300 hover:bg-slate-800 gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="border-slate-700 text-slate-300 hover:bg-slate-800 gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Report
          </Button>

          {report.isFinalized ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReopenMatch}
              className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 gap-1.5"
            >
              <Unlock className="w-3.5 h-3.5" />
              Reopen
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowFinalizeModal(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              Finalize Scorecard
            </Button>
          )}
        </div>
      </div>

      {/* MATCH SUMMARY BANNER (PRINTABLE) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden print:border-slate-300 print:bg-white print:text-black">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Team A */}
          <div className="flex-1 text-center md:text-right">
            <h2 className="text-2xl md:text-3xl font-black text-white print:text-black">{teamA.name}</h2>
            <div className="text-xs text-slate-400 print:text-slate-600 mt-1">
              Formation: {report.formations?.teamA || '4-3-3'}
            </div>
            <div className="text-xs text-slate-400 print:text-slate-600 mt-0.5">
              🚩 {teamAStats.corners} Corners • 🟨 {teamAStats.yellowCards} • 🟥 {teamAStats.redCards}
            </div>
          </div>

          {/* Center Score & Result */}
          <div className="flex flex-col items-center justify-center px-6">
            <div className="flex items-center gap-4 bg-slate-950/80 print:bg-slate-100 px-8 py-3 rounded-2xl border border-slate-800 print:border-slate-300">
              <span className="text-4xl md:text-5xl font-black text-white print:text-black">{teamAScore}</span>
              <span className="text-2xl font-bold text-slate-600">-</span>
              <span className="text-4xl md:text-5xl font-black text-white print:text-black">{teamBScore}</span>
            </div>

            {isShootout && (
              <div className="mt-2 text-xs font-bold text-purple-400 print:text-purple-700 bg-purple-950/50 print:bg-purple-50 px-3 py-1 rounded-full border border-purple-500/30">
                Penalties: {shootoutScoreA} - {shootoutScoreB}
              </div>
            )}

            <div className="mt-3 text-sm font-bold text-emerald-400 print:text-emerald-700 text-center">
              {report.matchResultText}
            </div>

            {/* Halves Breakdown */}
            <div className="mt-2 text-xs text-slate-400 print:text-slate-600 font-mono">
              HT: ({report.halfTimeScore?.teamA || 0} - {report.halfTimeScore?.teamB || 0}) • FT: ({report.fullTimeScore?.teamA || teamAScore} - {report.fullTimeScore?.teamB || teamBScore})
              {report.extraTimeScore && ` • ET: (${report.extraTimeScore.teamA} - ${report.extraTimeScore.teamB})`}
            </div>
          </div>

          {/* Team B */}
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl md:text-3xl font-black text-white print:text-black">{teamB.name}</h2>
            <div className="text-xs text-slate-400 print:text-slate-600 mt-1">
              Formation: {report.formations?.teamB || '4-4-2'}
            </div>
            <div className="text-xs text-slate-400 print:text-slate-600 mt-0.5">
              🚩 {teamBStats.corners} Corners • 🟨 {teamBStats.yellowCards} • 🟥 {teamBStats.redCards}
            </div>
          </div>
        </div>

        {/* Match Details Meta */}
        <div className="mt-6 pt-4 border-t border-slate-800 print:border-slate-300 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-400 print:text-slate-600">
          <div>
            <span className="font-semibold text-slate-300 print:text-black block">Date & Time:</span>
            {report.match?.date} {report.match?.time}
          </div>
          <div>
            <span className="font-semibold text-slate-300 print:text-black block">Venue:</span>
            {report.match?.venue} {report.match?.ground ? `(${report.match.ground})` : ''}
          </div>
          <div>
            <span className="font-semibold text-slate-300 print:text-black block">Referee / Officials:</span>
            {report.officialsReport?.referee || 'Referee Not Assigned'}
          </div>
          <div>
            <span className="font-semibold text-slate-300 print:text-black block">Match Sponsor:</span>
            {report.sponsorsReport?.matchSponsor || 'Official Match'}
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS (Hidden in print) */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 print:hidden overflow-x-auto">
        {[
          { id: 'summary', label: 'Summary & Goals', icon: Zap },
          { id: 'stats', label: 'Match Statistics', icon: BarChart2 },
          { id: 'players', label: 'Player Performance', icon: Users },
          { id: 'timeline', label: 'Match Events', icon: Clock },
          { id: 'awards', label: 'Awards & Honors', icon: Trophy },
          { id: 'squads', label: 'Team Lineups', icon: Shield },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: SUMMARY & KEY HIGHLIGHTS */}
      {(activeTab === 'summary' || typeof window !== 'undefined' && window.matchMedia && window.matchMedia('print').matches) && (
        <div className="space-y-6">
          {/* Key Summary Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400">Match Winner</span>
              <div className="text-lg font-bold text-white mt-1">
                {report.summaryCards?.winnerName || 'Draw'}
              </div>
              <span className="text-[10px] text-emerald-400">{report.matchResultText}</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400">Top Goalscorer</span>
              <div className="text-lg font-bold text-white mt-1">
                {report.suggestedTopScorer?.playerName || 'None'}
              </div>
              <span className="text-[10px] text-slate-400">
                {report.suggestedTopScorer ? `${report.suggestedTopScorer.statsSummary?.goals} Goals` : '0 Goals'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400">Player of the Match</span>
              <div className="text-lg font-bold text-yellow-400 mt-1">
                {report.selectedPlayerOfMatch?.playerName || report.suggestedPlayerOfMatch?.playerName || 'N/A'}
              </div>
              <span className="text-[10px] text-slate-400">
                {report.selectedPlayerOfMatch?.performanceDescription || 'Top rated performer'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400">Discipline Total</span>
              <div className="text-lg font-bold text-white mt-1">
                {report.summaryCards?.totalCardsA + report.summaryCards?.totalCardsB} Cards
              </div>
              <span className="text-[10px] text-slate-400">
                Team A: {report.summaryCards?.totalCardsA} • Team B: {report.summaryCards?.totalCardsB}
              </span>
            </div>
          </div>

          {/* Goal Highlights Timeline */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
            <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
              <span>⚽</span> Goal Scoring Timeline ({goalEvents.length})
            </h3>
            {goalEvents.length === 0 ? (
              <p className="text-xs text-slate-500">No goals recorded in this match (0 - 0).</p>
            ) : (
              <div className="space-y-3">
                {goalEvents.map((g) => {
                  const isA = g.teamId === teamA.id;
                  return (
                    <div
                      key={g.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-1 rounded border border-emerald-500/30">
                          {g.matchTimeDisplay || `${g.periodName}`}
                        </span>
                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>{g.playerName || 'Goal'}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                              isA ? 'bg-blue-500/20 text-blue-300' : 'bg-rose-500/20 text-rose-300'
                            }`}>
                              {isA ? teamA.name : teamB.name}
                            </span>
                            {g.goalType && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                                {g.goalType.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                          {g.assistPlayerName && (
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Assist by: {g.assistPlayerName}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="font-mono font-bold text-slate-300">
                        {g.scoreA_after} - {g.scoreB_after}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DETAILED MATCH STATISTICS */}
      {activeTab === 'stats' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
          <h3 className="font-bold text-white text-base">Comprehensive Match Statistics</h3>

          <div className="space-y-4 max-w-2xl mx-auto">
            {[
              {
                label: 'Possession',
                valA: `${teamAStats.possessionPercentage}%`,
                valB: `${teamBStats.possessionPercentage}%`,
                numA: teamAStats.possessionPercentage,
                numB: teamBStats.possessionPercentage,
              },
              {
                label: 'Total Shots',
                valA: teamAStats.shots,
                valB: teamBStats.shots,
                numA: teamAStats.shots,
                numB: teamBStats.shots,
              },
              {
                label: 'Shots on Target',
                valA: teamAStats.shotsOnTarget,
                valB: teamBStats.shotsOnTarget,
                numA: teamAStats.shotsOnTarget,
                numB: teamBStats.shotsOnTarget,
              },
              {
                label: 'Corner Kicks',
                valA: teamAStats.corners,
                valB: teamBStats.corners,
                numA: teamAStats.corners,
                numB: teamBStats.corners,
              },
              {
                label: 'Goalkeeper Saves',
                valA: teamAStats.saves,
                valB: teamBStats.saves,
                numA: teamAStats.saves,
                numB: teamBStats.saves,
              },
              {
                label: 'Fouls Committed',
                valA: teamAStats.fouls,
                valB: teamBStats.fouls,
                numA: teamAStats.fouls,
                numB: teamBStats.fouls,
              },
              {
                label: 'Offsides',
                valA: teamAStats.offsides,
                valB: teamBStats.offsides,
                numA: teamAStats.offsides,
                numB: teamBStats.offsides,
              },
              {
                label: 'Yellow Cards',
                valA: teamAStats.yellowCards,
                valB: teamBStats.yellowCards,
                numA: teamAStats.yellowCards,
                numB: teamBStats.yellowCards,
              },
              {
                label: 'Red Cards',
                valA: teamAStats.redCards,
                valB: teamBStats.redCards,
                numA: teamAStats.redCards,
                numB: teamBStats.redCards,
              },
            ].map((stat, idx) => {
              const total = (stat.numA || 0) + (stat.numB || 0);
              const pctA = total > 0 ? ((stat.numA || 0) / total) * 100 : 50;

              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-blue-400 font-mono">{stat.valA}</span>
                    <span className="text-slate-300">{stat.label}</span>
                    <span className="text-rose-400 font-mono">{stat.valB}</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-950 flex overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${pctA}%` }}
                    ></div>
                    <div
                      className="h-full bg-rose-500 transition-all duration-500"
                      style={{ width: `${100 - pctA}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: PLAYER PERFORMANCE TABLES */}
      {activeTab === 'players' && (
        <div className="space-y-6">
          {/* Team A Players */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="font-bold text-white text-base flex items-center justify-between">
              <span>{teamA.name} Player Performance</span>
              <span className="text-xs text-slate-400">{teamAPlayers.length} Players</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="pb-3">Player</th>
                    <th className="pb-3">Role</th>
                    <th className="pb-3 text-center">Goals</th>
                    <th className="pb-3 text-center">Assists</th>
                    <th className="pb-3 text-center">Shots (On Tgt)</th>
                    <th className="pb-3 text-center">Corners</th>
                    <th className="pb-3 text-center">Fouls</th>
                    <th className="pb-3 text-center">Cards</th>
                    <th className="pb-3 text-center">Saves</th>
                    <th className="pb-3 text-center">Clean Sheet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {teamAPlayers.map((p) => (
                    <tr key={p.playerId} className="hover:bg-slate-800/40">
                      <td className="py-2.5 font-semibold text-slate-200">
                        #{p.jerseyNumber || '-'} {p.playerName}
                        {p.isCaptain && <span className="ml-1 text-[10px] text-amber-400">(C)</span>}
                      </td>
                      <td className="py-2.5 text-slate-400">{p.role}</td>
                      <td className="py-2.5 text-center font-bold text-emerald-400">{p.goals || '-'}</td>
                      <td className="py-2.5 text-center text-slate-300">{p.assists || '-'}</td>
                      <td className="py-2.5 text-center text-slate-300">
                        {p.shots > 0 ? `${p.shots} (${p.shotsOnTarget})` : '-'}
                      </td>
                      <td className="py-2.5 text-center text-slate-400">{p.cornersTaken || '-'}</td>
                      <td className="py-2.5 text-center text-slate-400">{p.fouls || '-'}</td>
                      <td className="py-2.5 text-center">
                        {p.yellowCards > 0 && <span className="mr-1">🟨{p.yellowCards}</span>}
                        {p.redCards > 0 && <span>🟥{p.redCards}</span>}
                        {!p.yellowCards && !p.redCards && '-'}
                      </td>
                      <td className="py-2.5 text-center text-slate-300">{p.saves || '-'}</td>
                      <td className="py-2.5 text-center text-slate-400">
                        {p.role.toLowerCase().includes('keeper') || p.role.toLowerCase() === 'gk'
                          ? p.cleanSheet ? 'Yes' : 'No'
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Team B Players */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="font-bold text-white text-base flex items-center justify-between">
              <span>{teamB.name} Player Performance</span>
              <span className="text-xs text-slate-400">{teamBPlayers.length} Players</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="pb-3">Player</th>
                    <th className="pb-3">Role</th>
                    <th className="pb-3 text-center">Goals</th>
                    <th className="pb-3 text-center">Assists</th>
                    <th className="pb-3 text-center">Shots (On Tgt)</th>
                    <th className="pb-3 text-center">Corners</th>
                    <th className="pb-3 text-center">Fouls</th>
                    <th className="pb-3 text-center">Cards</th>
                    <th className="pb-3 text-center">Saves</th>
                    <th className="pb-3 text-center">Clean Sheet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {teamBPlayers.map((p) => (
                    <tr key={p.playerId} className="hover:bg-slate-800/40">
                      <td className="py-2.5 font-semibold text-slate-200">
                        #{p.jerseyNumber || '-'} {p.playerName}
                        {p.isCaptain && <span className="ml-1 text-[10px] text-amber-400">(C)</span>}
                      </td>
                      <td className="py-2.5 text-slate-400">{p.role}</td>
                      <td className="py-2.5 text-center font-bold text-rose-400">{p.goals || '-'}</td>
                      <td className="py-2.5 text-center text-slate-300">{p.assists || '-'}</td>
                      <td className="py-2.5 text-center text-slate-300">
                        {p.shots > 0 ? `${p.shots} (${p.shotsOnTarget})` : '-'}
                      </td>
                      <td className="py-2.5 text-center text-slate-400">{p.cornersTaken || '-'}</td>
                      <td className="py-2.5 text-center text-slate-400">{p.fouls || '-'}</td>
                      <td className="py-2.5 text-center">
                        {p.yellowCards > 0 && <span className="mr-1">🟨{p.yellowCards}</span>}
                        {p.redCards > 0 && <span>🟥{p.redCards}</span>}
                        {!p.yellowCards && !p.redCards && '-'}
                      </td>
                      <td className="py-2.5 text-center text-slate-300">{p.saves || '-'}</td>
                      <td className="py-2.5 text-center text-slate-400">
                        {p.role.toLowerCase().includes('keeper') || p.role.toLowerCase() === 'gk'
                          ? p.cleanSheet ? 'Yes' : 'No'
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: COMPLETE MATCH TIMELINE */}
      {activeTab === 'timeline' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="font-bold text-white text-base">Full Chronological Event Feed</h3>
          <div className="divide-y divide-slate-800/60">
            {timelineEvents.map((evt) => {
              const isA = evt.teamId === teamA.id;
              return (
                <div key={evt.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                      {evt.matchTimeDisplay || evt.periodName}
                    </span>
                    <span className="font-bold text-slate-200">{evt.eventType.replace('_', ' ')}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      isA ? 'bg-blue-500/20 text-blue-300' : 'bg-rose-500/20 text-rose-300'
                    }`}>
                      {isA ? teamA.name : teamB.name}
                    </span>
                    {evt.playerName && <span className="text-slate-300">• {evt.playerName}</span>}
                    {evt.notes && <span className="text-slate-400 italic">({evt.notes})</span>}
                  </div>
                  <div className="font-mono text-slate-400 font-bold">
                    {evt.scoreA_after !== undefined && evt.scoreB_after !== undefined
                      ? `${evt.scoreA_after} - ${evt.scoreB_after}`
                      : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: AWARDS & HONORS */}
      {activeTab === 'awards' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-white text-base">Official Match Honors & Awards</h3>
              <p className="text-xs text-slate-400">Algorithmic suggestions with official jury overrides</p>
            </div>
            {!editingAwards ? (
              <Button size="sm" variant="outline" onClick={() => setEditingAwards(true)}>
                Edit Official Awards
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditingAwards(false)}>
                  Cancel
                </Button>
                <Button size="sm" variant="primary" onClick={handleSaveAwards} disabled={savingAwards}>
                  {savingAwards ? 'Saving...' : 'Save Awards'}
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Player of the Match */}
            <div className="p-5 rounded-xl bg-gradient-to-br from-amber-500/10 to-slate-950 border border-amber-500/30 space-y-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                <h4 className="font-bold text-white text-sm">Player of the Match (POTM)</h4>
              </div>

              {!editingAwards ? (
                <div>
                  <div className="text-lg font-extrabold text-yellow-400">
                    {report.selectedPlayerOfMatch?.playerName || report.suggestedPlayerOfMatch?.playerName || 'None Selected'}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {report.selectedPlayerOfMatch?.performanceDescription || report.suggestedPlayerOfMatch?.performanceDescription}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <select
                    value={selectedPlayerOfMatchId}
                    onChange={(e) => setSelectedPlayerOfMatchId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200"
                  >
                    <option value="">-- Select Player of Match --</option>
                    {allPlayers.map((p) => (
                      <option key={p.playerId} value={p.playerId}>
                        {p.playerName} ({p.teamName}) - {p.goals} Goals, {p.assists} Assists
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={playerOfMatchReason}
                    onChange={(e) => setPlayerOfMatchReason(e.target.value)}
                    placeholder="Performance note e.g. Hat-trick hero"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
                  />
                </div>
              )}
            </div>

            {/* Best Goalkeeper */}
            <div className="p-5 rounded-xl bg-gradient-to-br from-blue-500/10 to-slate-950 border border-blue-500/30 space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-400" />
                <h4 className="font-bold text-white text-sm">Best Goalkeeper (Golden Glove)</h4>
              </div>

              {!editingAwards ? (
                <div>
                  <div className="text-lg font-extrabold text-blue-400">
                    {report.selectedBestGoalkeeper?.playerName || report.suggestedBestGoalkeeper?.playerName || 'None Selected'}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {report.selectedBestGoalkeeper?.performanceDescription || report.suggestedBestGoalkeeper?.performanceDescription}
                  </div>
                </div>
              ) : (
                <select
                  value={selectedBestGoalkeeperId}
                  onChange={(e) => setSelectedBestGoalkeeperId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200"
                >
                  <option value="">-- Select Best Goalkeeper --</option>
                  {allPlayers.map((p) => (
                    <option key={p.playerId} value={p.playerId}>
                      {p.playerName} ({p.teamName}) - {p.saves} Saves
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Best Defender */}
            <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-400" />
                <h4 className="font-bold text-white text-sm">Best Defender</h4>
              </div>
              {!editingAwards ? (
                <div className="text-base font-bold text-slate-200">
                  {report.selectedBestDefender?.playerName || report.suggestedBestDefender?.playerName || 'N/A'}
                </div>
              ) : (
                <select
                  value={selectedBestDefenderId}
                  onChange={(e) => setSelectedBestDefenderId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200"
                >
                  <option value="">-- Select Best Defender --</option>
                  {allPlayers.map((p) => (
                    <option key={p.playerId} value={p.playerId}>
                      {p.playerName} ({p.teamName})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Best Forward / Striker */}
            <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-rose-400" />
                <h4 className="font-bold text-white text-sm">Best Forward / Striker</h4>
              </div>
              {!editingAwards ? (
                <div className="text-base font-bold text-slate-200">
                  {report.selectedBestForward?.playerName || report.suggestedBestForward?.playerName || 'N/A'}
                </div>
              ) : (
                <select
                  value={selectedBestForwardId}
                  onChange={(e) => setSelectedBestForwardId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200"
                >
                  <option value="">-- Select Best Forward --</option>
                  {allPlayers.map((p) => (
                    <option key={p.playerId} value={p.playerId}>
                      {p.playerName} ({p.teamName}) - {p.goals} Goals
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: TEAM LINEUPS & FORMATIONS */}
      {activeTab === 'squads' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Team A Lineup */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">{teamA.name} Lineup</h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                Formation: {report.formations?.teamA || '4-3-3'}
              </span>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Starting XI</span>
              {(report.squadsReport?.teamA?.startingEleven || teamAPlayers.slice(0, 11)).map((p) => (
                <div key={p.id} className="flex justify-between items-center text-xs py-1 px-2 rounded bg-slate-950">
                  <span className="text-slate-200 font-medium">#{p.jerseyNumber || '-'} {p.name}</span>
                  <span className="text-slate-500">{p.role || 'Player'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Team B Lineup */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">{teamB.name} Lineup</h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">
                Formation: {report.formations?.teamB || '4-4-2'}
              </span>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Starting XI</span>
              {(report.squadsReport?.teamB?.startingEleven || teamBPlayers.slice(0, 11)).map((p) => (
                <div key={p.id} className="flex justify-between items-center text-xs py-1 px-2 rounded bg-slate-950">
                  <span className="text-slate-200 font-medium">#{p.jerseyNumber || '-'} {p.name}</span>
                  <span className="text-slate-500">{p.role || 'Player'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FINALIZE MODAL */}
      {showFinalizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Finalize & Sign Match Report</h3>
                <p className="text-xs text-slate-400">Lock official result for records & standings</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Finalizing will lock all match statistics, goals, cards, and awards into the permanent tournament archives.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowFinalizeModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleFinalizeMatch} disabled={finalizing}>
                {finalizing ? 'Finalizing...' : 'Confirm & Finalize'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
