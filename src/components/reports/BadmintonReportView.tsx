import React, { useState } from 'react';
import {
  BadmintonMatchReport,
  BadmintonPlayerExtendedStats,
  BadmintonGameDetail,
  AwardCandidate,
  Player,
} from '../../types';
import { api } from '../../services/api';
import {
  Trophy,
  Award,
  Printer,
  CheckCircle2,
  RefreshCw,
  Zap,
  Activity,
  Users,
  Shield,
  Calendar,
  MapPin,
  Filter,
  Tv,
  Clock,
  Target,
  Sparkles,
  Lock,
  Unlock,
  AlertTriangle,
  FileCheck,
  ChevronRight,
  Flame,
  Search,
  Check,
  BarChart3,
  Layers,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface BadmintonReportViewProps {
  report: BadmintonMatchReport | any;
  onRefresh: () => void;
}

export const BadmintonReportView: React.FC<BadmintonReportViewProps> = ({ report, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<
    'scorecard' | 'games' | 'rallies' | 'players' | 'teams' | 'analytics' | 'awards' | 'officials' | 'validation'
  >('scorecard');
  const [ralliesFilter, setRalliesFilter] = useState<string>('ALL');
  const [rallySearch, setRallySearch] = useState<string>('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Awards Editing State
  const [editingAwards, setEditingAwards] = useState(false);
  const [selectedPotmId, setSelectedPotmId] = useState(report?.selectedPlayerOfMatch?.playerId || '');
  const [potmReason, setPotmReason] = useState(report?.selectedPlayerOfMatch?.reason || '');
  const [selectedAttackerId, setSelectedAttackerId] = useState(report?.selectedBestAttacker?.playerId || '');
  const [attackerReason, setAttackerReason] = useState(report?.selectedBestAttacker?.reason || '');
  const [selectedServerId, setSelectedServerId] = useState(report?.selectedBestServer?.playerId || '');
  const [serverReason, setServerReason] = useState(report?.selectedBestServer?.reason || '');
  const [selectedReturnerId, setSelectedReturnerId] = useState(report?.selectedBestReturner?.playerId || '');
  const [returnerReason, setReturnerReason] = useState(report?.selectedBestReturner?.reason || '');
  const [selectedDefenderId, setSelectedDefenderId] = useState(report?.selectedBestDefender?.playerId || '');
  const [defenderReason, setDefenderReason] = useState(report?.selectedBestDefender?.reason || '');
  const [selectedPerformerId, setSelectedPerformerId] = useState(report?.selectedBestPerformer?.playerId || '');
  const [performerReason, setPerformerReason] = useState(report?.selectedBestPerformer?.reason || '');
  const [savingAwards, setSavingAwards] = useState(false);

  // Finalize / Reopen State
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [reopening, setReopening] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendToBroadcast = async (overlayType: string) => {
    try {
      await api.triggerBroadcastEvent(report.matchId || report.match?.id, {
        type: overlayType,
        durationSeconds: 15,
      });
      showToast(`Broadcast graphic overlay "${overlayType}" triggered on live output!`);
    } catch (err: any) {
      showToast(err.message || 'Failed to trigger broadcast.', 'error');
    }
  };

  const handleSaveAwards = async () => {
    setSavingAwards(true);
    try {
      await api.updateMatchAwards(report.matchId || report.match?.id, {
        playerOfTheMatchId: selectedPotmId || undefined,
        playerOfTheMatchReason: potmReason || undefined,
        bestAttackerId: selectedAttackerId || undefined,
        bestAttackerReason: attackerReason || undefined,
        bestServerId: selectedServerId || undefined,
        bestServerReason: serverReason || undefined,
        bestReturnerId: selectedReturnerId || undefined,
        bestReturnerReason: returnerReason || undefined,
        bestDefenderId: selectedDefenderId || undefined,
        bestDefenderReason: defenderReason || undefined,
        bestPerformerId: selectedPerformerId || undefined,
        bestPerformerReason: performerReason || undefined,
      });
      setEditingAwards(false);
      showToast('Match awards & citations updated successfully!');
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to save match awards.', 'error');
    } finally {
      setSavingAwards(false);
    }
  };

  const handleFinalizeReport = async () => {
    setFinalizing(true);
    try {
      await api.finalizeMatchReport(report.matchId || report.match?.id);
      setShowFinalizeModal(false);
      showToast('Badminton Match Report finalized and locked successfully!');
      onRefresh();
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
      await api.reopenMatchReport(report.matchId || report.match?.id);
      showToast('Match report reopened and unlocked for editing.');
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to reopen report.', 'error');
    } finally {
      setReopening(false);
    }
  };

  const match = report.match || {};
  const tournament = report.tournament || match.tournament;
  const teamAName = report.teamA?.name || report.teamAName || match.teamA?.name || 'Team A';
  const teamBName = report.teamB?.name || report.teamBName || match.teamB?.name || 'Team B';
  const gamesWonA = report.gamesWonA ?? 0;
  const gamesWonB = report.gamesWonB ?? 0;
  const isCompleted = report.isFinalized || report.status === 'COMPLETED' || report.matchStatus === 'COMPLETED';
  const matchType = report.matchType || match.badmintonConfig?.matchType || 'SINGLES';
  const format = report.format || match.badmintonConfig?.format || 'BEST_OF_3';

  const allPlayers: Player[] = [
    ...(report.teamAPlayers || []),
    ...(report.teamBPlayers || []),
  ];

  const gameScores = report.gameScores || [];
  const gameDetails: BadmintonGameDetail[] = report.gameDetails || [];
  const playerStats: BadmintonPlayerExtendedStats[] = report.playerStats || [];
  const teamAStats = report.teamAStats || {};
  const teamBStats = report.teamBStats || {};
  const rallyAnalytics = report.rallyAnalytics || {
    totalRallies: 0,
    longestRallyShots: 0,
    shortestRallyShots: 0,
    averageRallyShots: 0,
    shotTypeDistribution: [],
    winnersByShotType: [],
    errorsByShotType: [],
  };
  const activeEvents = (report.events || []).filter((e: any) => !e.isUndone);

  // Filtered Rallies
  const filteredEvents = activeEvents.filter((e: any) => {
    if (ralliesFilter !== 'ALL') {
      const type = (e.eventType || '').toUpperCase();
      if (ralliesFilter === 'SMASH' && !type.includes('SMASH')) return false;
      if (ralliesFilter === 'DROP' && !type.includes('DROP')) return false;
      if (ralliesFilter === 'NET' && !type.includes('NET')) return false;
      if (ralliesFilter === 'CLEAR' && !type.includes('CLEAR')) return false;
      if (ralliesFilter === 'DRIVE' && !type.includes('DRIVE')) return false;
      if (ralliesFilter === 'ACE' && type !== 'ACE') return false;
      if (ralliesFilter === 'SERVICE_FAULT' && !type.includes('FAULT') && !type.includes('SERVICE_ERROR')) return false;
      if (ralliesFilter === 'UNFORCED_ERROR' && !type.includes('UNFORCED') && !type.includes('OUT_OF_BOUNDS')) return false;
      if (ralliesFilter === 'DECIDERS' && !e.gameWon && !e.matchWon) return false;
    }

    if (rallySearch.trim()) {
      const q = rallySearch.toLowerCase();
      const server = (e.serverPlayerName || '').toLowerCase();
      const receiver = (e.receiverPlayerName || '').toLowerCase();
      const winner = (e.winnerPlayerName || '').toLowerCase();
      const type = (e.eventType || '').toLowerCase();
      return server.includes(q) || receiver.includes(q) || winner.includes(q) || type.includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6 print:space-y-4 print:text-black">
      {/* TOAST ALERT */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-top-2 print:hidden ${
            toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* REPORT HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4 print:border-b-2 print:border-black">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-500/30">
              🏸 BADMINTON OFFICIAL SCORECARD & REPORT
            </Badge>
            <Badge variant="outline" className="text-xs text-indigo-300 border-indigo-500/30">
              {matchType} • {format.replace('_', ' ')}
            </Badge>
            <Badge variant={isCompleted ? 'outline' : 'success'} className="text-xs">
              {report.isFinalized ? '🔒 FINALIZED & VERIFIED' : isCompleted ? 'COMPLETED' : 'LIVE REPORT'}
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1 tracking-tight print:text-black">
            {teamAName} vs {teamBName}
          </h1>
          <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-3 print:text-slate-700">
            {tournament?.name && (
              <span className="flex items-center gap-1 font-semibold text-slate-300 print:text-black">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                {tournament.name}
              </span>
            )}
            {match.matchNumber && <span>Match #{match.matchNumber}</span>}
            {match.round && <span>• Round: {match.round}</span>}
            {match.venue && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                {match.venue} {match.ground ? `(${match.ground})` : ''}
              </span>
            )}
            {match.date && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {match.date} {match.time ? `@ ${match.time}` : ''}
              </span>
            )}
          </div>
        </div>

        {/* ACTION BUTTONS (PRINT HIDDEN) */}
        <div className="flex items-center gap-2 print:hidden flex-wrap">
          <Button variant="outline" size="sm" onClick={onRefresh} title="Refresh report calculation">
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Recalculate
          </Button>

          <Button variant="outline" size="sm" onClick={handlePrint} className="border-slate-700 hover:bg-slate-800">
            <Printer className="w-4 h-4 mr-1.5 text-slate-300" />
            Print / PDF
          </Button>

          {/* Broadcast Trigger */}
          <div className="relative group">
            <Button variant="outline" size="sm" className="border-indigo-600/50 text-indigo-300 hover:bg-indigo-950/40">
              <Tv className="w-4 h-4 mr-1.5 text-indigo-400" />
              Broadcast Overlay
            </Button>
            <div className="absolute right-0 mt-1 w-52 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-30 hidden group-hover:block">
              <div className="px-3 py-1 text-[11px] font-bold text-slate-400 tracking-wider">TRIGGER LIVE GRAPHIC</div>
              <button
                onClick={() => handleSendToBroadcast('MATCH_RESULT')}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-indigo-600/30 hover:text-white flex items-center gap-2"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                Match Result Card
              </button>
              <button
                onClick={() => handleSendToBroadcast('SCORECARD')}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-indigo-600/30 hover:text-white flex items-center gap-2"
              >
                <Target className="w-3.5 h-3.5 text-emerald-400" />
                Game Breakdown Board
              </button>
              <button
                onClick={() => handleSendToBroadcast('MAN_OF_MATCH')}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-indigo-600/30 hover:text-white flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                Player of Match Graphic
              </button>
            </div>
          </div>

          {/* Finalize or Reopen Button */}
          {report.isFinalized ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReopenReport}
              disabled={reopening}
              className="border-amber-600/50 text-amber-300 hover:bg-amber-950/40"
            >
              <Unlock className="w-4 h-4 mr-1.5" />
              {reopening ? 'Reopening...' : 'Reopen Report'}
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowFinalizeModal(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 font-semibold"
            >
              <FileCheck className="w-4 h-4 mr-1.5" />
              Finalize Report
            </Button>
          )}
        </div>
      </div>

      {/* FINALIZATION BANNER / INTEGRITY NOTICE */}
      {report.isFinalized && (
        <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs text-emerald-300 print:border print:border-emerald-800 print:text-black">
          <div className="flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Official Finalized Report:</strong> Verified & locked by {report.finalizedBy || 'Admin'}{' '}
              {report.finalizedAt ? `on ${new Date(report.finalizedAt).toLocaleString()}` : ''}. Event sequence is immutable.
            </span>
          </div>
          <Badge variant="outline" className="text-emerald-400 border-emerald-500/40 shrink-0">
            AUDIT VERIFIED
          </Badge>
        </div>
      )}

      {/* VALIDATION WARNINGS IF ANY */}
      {report.validation && report.validation.warnings && report.validation.warnings.length > 0 && !report.isFinalized && (
        <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-3.5 flex items-center gap-3 text-xs text-amber-200 print:hidden">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="flex-1">
            <strong>Integrity Notice:</strong> {report.validation.warnings.join(' ')}
          </div>
        </div>
      )}

      {/* SUMMARY SCORECARD BANNER */}
      <Card className="bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border-slate-800 overflow-hidden shadow-2xl print:border-2 print:border-black print:bg-white">
        <div className="p-5 sm:p-6 space-y-5">
          {/* Result Headline */}
          <div className="text-center pb-3 border-b border-slate-800/80 print:border-b print:border-slate-300">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Trophy className="w-3.5 h-3.5" />
              {isCompleted ? 'MATCH RESULT' : 'LIVE MATCH PROGRESSION'}
            </div>
            <div className="text-xl sm:text-2xl font-black text-white tracking-tight print:text-black">
              {report.matchResultText || `${teamAName} vs ${teamBName}`}
            </div>
            {report.winnerName && isCompleted && (
              <p className="text-sm font-semibold text-emerald-400 mt-0.5 print:text-emerald-800">
                Winner: {report.winnerName} ({gamesWonA} - {gamesWonB})
              </p>
            )}
          </div>

          {/* Professional Game-by-Game Score Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider print:border-b-2 print:border-black print:text-black">
                  <th className="py-2.5 px-3">Team / Player(s)</th>
                  {gameScores.map((gs: any) => (
                    <th key={gs.gameNumber} className="py-2.5 px-3 text-center w-20">
                      Game {gs.gameNumber}
                    </th>
                  ))}
                  <th className="py-2.5 px-3 text-center w-24 bg-slate-800/30 print:bg-slate-100 font-black text-white print:text-black">
                    Games Won
                  </th>
                  <th className="py-2.5 px-3 text-center w-24 text-slate-300 print:text-black">Total Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 print:divide-y print:divide-slate-300 font-medium">
                {/* Team A Row */}
                <tr className={`${report.winnerTeamId === match.teamAId ? 'bg-emerald-500/5' : ''}`}>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white print:text-black text-base">{teamAName}</span>
                      {report.winnerTeamId === match.teamAId && isCompleted && (
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                          WINNER
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 print:text-slate-600 mt-0.5">
                      {report.teamAPlayers?.map((p: any) => p.name).join(' & ') || 'Singles Player'}
                    </div>
                  </td>
                  {gameScores.map((gs: any) => {
                    const isGameWinner = gs.winnerSide === 'TEAM_A';
                    return (
                      <td key={gs.gameNumber} className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-md text-base ${
                            isGameWinner
                              ? 'font-black text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 print:text-black print:bg-slate-200'
                              : 'text-slate-300 print:text-black'
                          }`}
                        >
                          {gs.scoreA}
                        </span>
                      </td>
                    );
                  })}
                  <td className="py-3 px-3 text-center font-black text-xl text-emerald-400 bg-slate-800/30 print:bg-slate-100 print:text-black">
                    {gamesWonA}
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-slate-300 print:text-black">
                    {teamAStats.totalPointsWon ?? gameScores.reduce((acc: number, g: any) => acc + (g.scoreA || 0), 0)}
                  </td>
                </tr>

                {/* Team B Row */}
                <tr className={`${report.winnerTeamId === match.teamBId ? 'bg-emerald-500/5' : ''}`}>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white print:text-black text-base">{teamBName}</span>
                      {report.winnerTeamId === match.teamBId && isCompleted && (
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                          WINNER
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 print:text-slate-600 mt-0.5">
                      {report.teamBPlayers?.map((p: any) => p.name).join(' & ') || 'Singles Player'}
                    </div>
                  </td>
                  {gameScores.map((gs: any) => {
                    const isGameWinner = gs.winnerSide === 'TEAM_B';
                    return (
                      <td key={gs.gameNumber} className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-md text-base ${
                            isGameWinner
                              ? 'font-black text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 print:text-black print:bg-slate-200'
                              : 'text-slate-300 print:text-black'
                          }`}
                        >
                          {gs.scoreB}
                        </span>
                      </td>
                    );
                  })}
                  <td className="py-3 px-3 text-center font-black text-xl text-emerald-400 bg-slate-800/30 print:bg-slate-100 print:text-black">
                    {gamesWonB}
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-slate-300 print:text-black">
                    {teamBStats.totalPointsWon ?? gameScores.reduce((acc: number, g: any) => acc + (g.scoreB || 0), 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 print:border-slate-300">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                Total Rallies
              </div>
              <div className="text-xl font-black text-white mt-1 print:text-black">{activeEvents.length}</div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 print:border-slate-300">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                Total Smashes
              </div>
              <div className="text-xl font-black text-white mt-1 print:text-black">
                {(teamAStats.smashWinners || 0) + (teamBStats.smashWinners || 0)}
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 print:border-slate-300">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                Longest Rally
              </div>
              <div className="text-xl font-black text-white mt-1 print:text-black">
                {rallyAnalytics.longestRallyShots} <span className="text-xs text-slate-400 font-normal">shots</span>
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 print:border-slate-300">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                Top Performer
              </div>
              <div className="text-sm font-black text-white mt-1 truncate print:text-black" title={report.summaryCards?.topPerformerText}>
                {report.summaryCards?.topPerformerText || 'Calculated'}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* NAVIGATION TABS (PRINT HIDDEN) */}
      <div className="flex border-b border-slate-800 overflow-x-auto gap-2 pb-1 print:hidden">
        {[
          { id: 'scorecard', label: 'Full Scorecard', icon: Trophy },
          { id: 'games', label: 'Game Analysis', icon: Target },
          { id: 'rallies', label: `Rally Log (${activeEvents.length})`, icon: Activity },
          { id: 'players', label: 'Player Statistics', icon: Users },
          { id: 'teams', label: 'Team Comparison', icon: Shield },
          { id: 'analytics', label: 'Rally Analytics', icon: BarChart3 },
          { id: 'awards', label: 'Match Awards', icon: Award },
          { id: 'officials', label: 'Officials & Sponsors', icon: Layers },
          { id: 'validation', label: 'Audit & Validation', icon: CheckCircle2 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap rounded-t-xl transition ${
                isActive
                  ? 'bg-slate-800 text-emerald-400 border-b-2 border-emerald-400 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: FULL SCORECARD */}
      {(activeTab === 'scorecard' || window.matchMedia?.('print').matches) && (
        <div className="space-y-6">
          {/* Game Details Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {gameDetails.map((gd) => (
              <Card key={gd.gameNumber} className="bg-slate-900/90 border-slate-800 p-4 print:border-slate-400">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                  <span className="font-bold text-white text-sm">Game {gd.gameNumber}</span>
                  <Badge variant={gd.isCompleted ? 'outline' : 'success'} className="text-[10px]">
                    {gd.isCompleted ? `Winner: ${gd.winnerTeamName || (gd.winnerSide === 'TEAM_A' ? teamAName : teamBName)}` : 'In Progress'}
                  </Badge>
                </div>
                <div className="flex items-center justify-around py-2 my-1 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  <div className="text-center">
                    <div className="text-xs text-slate-400 font-semibold">{teamAName}</div>
                    <div className={`text-2xl font-black ${gd.winnerSide === 'TEAM_A' ? 'text-emerald-400' : 'text-white'}`}>
                      {gd.scoreA}
                    </div>
                  </div>
                  <div className="text-xs font-bold text-slate-500">VS</div>
                  <div className="text-center">
                    <div className="text-xs text-slate-400 font-semibold">{teamBName}</div>
                    <div className={`text-2xl font-black ${gd.winnerSide === 'TEAM_B' ? 'text-emerald-400' : 'text-white'}`}>
                      {gd.scoreB}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-slate-400">
                  <div>
                    <span className="text-slate-500">Rallies:</span> {gd.totalRallies}
                  </div>
                  <div>
                    <span className="text-slate-500">11-Pt Lead:</span>{' '}
                    {gd.intervalScore ? `${gd.intervalScore.leadTeamName} (${gd.intervalScore.scoreA}-${gd.intervalScore.scoreB})` : 'N/A'}
                  </div>
                  <div>
                    <span className="text-slate-500">Start Server:</span> {gd.startingServerName || 'N/A'}
                  </div>
                  <div>
                    <span className="text-slate-500">Duration:</span> {gd.durationMinutes ? `${gd.durationMinutes} mins` : 'N/A'}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Quick Awards Highlight on Scorecard */}
          <Card className="bg-slate-900/90 border-slate-800 p-5 print:border-slate-400">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                Featured Match Honors & Player of the Match
              </h3>
              <button
                onClick={() => {
                  setActiveTab('awards');
                  setEditingAwards(true);
                }}
                className="text-xs text-emerald-400 hover:underline font-semibold print:hidden"
              >
                Edit / Override Awards →
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {/* Player of the Match */}
              <div className="bg-slate-950/80 border border-amber-500/30 rounded-xl p-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
                <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30 mb-2">
                  ⭐ PLAYER OF THE MATCH
                </Badge>
                <div className="text-base font-bold text-white">
                  {report.selectedPlayerOfMatch?.playerName || report.suggestedPlayerOfMatch?.playerName || 'Pending Selection'}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {report.selectedPlayerOfMatch?.reason || report.suggestedPlayerOfMatch?.reason || 'Calculated based on match performance index.'}
                </div>
              </div>

              {/* Best Attacker */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                <Badge variant="outline" className="text-[10px] text-red-400 border-red-500/30 mb-2">
                  🔥 BEST ATTACKER
                </Badge>
                <div className="text-base font-bold text-white">
                  {report.selectedBestAttacker?.playerName || report.suggestedBestAttacker?.playerName || 'Pending Selection'}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {report.selectedBestAttacker?.reason || report.suggestedBestAttacker?.reason || 'Most smash and attacking winners.'}
                </div>
              </div>

              {/* Best Server */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                <Badge variant="outline" className="text-[10px] text-indigo-400 border-indigo-500/30 mb-2">
                  🎯 BEST SERVER
                </Badge>
                <div className="text-base font-bold text-white">
                  {report.selectedBestServer?.playerName || report.suggestedBestServer?.playerName || 'Pending Selection'}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {report.selectedBestServer?.reason || report.suggestedBestServer?.reason || 'Highest service win rate & precision.'}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB CONTENT: GAME ANALYSIS */}
      {activeTab === 'games' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {gameDetails.map((gd) => (
              <Card key={gd.gameNumber} className="bg-slate-900/90 border-slate-800 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 font-black flex items-center justify-center text-sm border border-emerald-500/30">
                      G{gd.gameNumber}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base">Game {gd.gameNumber} Detailed Breakdown</h3>
                      <p className="text-xs text-slate-400">
                        {gd.isCompleted ? `Winner: ${gd.winnerTeamName}` : 'Game in Progress'} • Total Rallies: {gd.totalRallies}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-emerald-400">
                      {gd.scoreA} - {gd.scoreB}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block mb-1">Starting Server</span>
                    <span className="font-bold text-white">{gd.startingServerName || 'N/A'}</span>
                  </div>
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block mb-1">Ending Server</span>
                    <span className="font-bold text-white">{gd.endingServerName || 'N/A'}</span>
                  </div>
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block mb-1">11-Point Interval Score</span>
                    <span className="font-bold text-amber-400">
                      {gd.intervalScore ? `${gd.intervalScore.scoreA}-${gd.intervalScore.scoreB} (${gd.intervalScore.leadTeamName})` : 'N/A'}
                    </span>
                  </div>
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block mb-1">Game Points Reached</span>
                    <span className="font-bold text-white">
                      {teamAName}: {gd.gamePointCountA} | {teamBName}: {gd.gamePointCountB}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: RALLY LOG WITH FILTERS */}
      {activeTab === 'rallies' && (
        <div className="space-y-4">
          {/* FILTER CONTROLS */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              <Filter className="w-4 h-4 text-emerald-400 mr-1" />
              {[
                { id: 'ALL', label: 'All Rallies' },
                { id: 'SMASH', label: 'Smashes' },
                { id: 'DROP', label: 'Drop Shots' },
                { id: 'NET', label: 'Net Kills' },
                { id: 'CLEAR', label: 'Clears' },
                { id: 'DRIVE', label: 'Drives' },
                { id: 'ACE', label: 'Aces' },
                { id: 'SERVICE_FAULT', label: 'Service Faults' },
                { id: 'UNFORCED_ERROR', label: 'Errors' },
                { id: 'DECIDERS', label: 'Game/Match Pts' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setRalliesFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                    ralliesFilter === f.id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* SEARCH */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search players, shots..."
                value={rallySearch}
                onChange={(e) => setRallySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* RALLIES TIMELINE */}
          <div className="space-y-2">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/40 rounded-xl border border-slate-800 text-slate-400 text-sm">
                No rallies found matching the selected filter.
              </div>
            ) : (
              filteredEvents.map((ev: any, idx: number) => {
                const isTeamAWon = ev.winnerSide === 'TEAM_A';
                const isFault = (ev.eventType || '').includes('FAULT') || (ev.eventType || '').includes('ERROR');
                const isSmash = (ev.eventType || '').includes('SMASH');
                return (
                  <div
                    key={ev.id || idx}
                    className={`p-3.5 rounded-xl border transition flex flex-wrap items-center justify-between gap-3 ${
                      isTeamAWon
                        ? 'bg-slate-900/80 border-slate-800 hover:border-emerald-500/40'
                        : 'bg-slate-900/80 border-slate-800 hover:border-indigo-500/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 text-center">
                        <span className="text-[10px] font-bold text-slate-500 block">RALLY</span>
                        <span className="text-sm font-black text-white">#{ev.rallyNumber || idx + 1}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-bold text-slate-300 border-slate-700">
                        G{ev.gameNumber || 1}
                      </Badge>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-sm ${isTeamAWon ? 'text-emerald-400' : 'text-indigo-300'}`}>
                            {ev.winnerPlayerName || (isTeamAWon ? teamAName : teamBName)}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              isSmash
                                ? 'bg-red-950/40 text-red-400 border-red-500/30'
                                : isFault
                                ? 'bg-amber-950/40 text-amber-400 border-amber-500/30'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {(ev.eventType || 'RALLY_WON').replace(/_/g, ' ')}
                          </Badge>
                          {ev.serviceCourt && (
                            <span className="text-[10px] text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                              Court: {ev.serviceCourt}
                            </span>
                          )}
                          {ev.gameWon && (
                            <Badge variant="outline" className="text-[10px] bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                              GAME WON
                            </Badge>
                          )}
                          {ev.matchWon && (
                            <Badge variant="outline" className="text-[10px] bg-amber-500/20 text-amber-300 border-amber-500/40">
                              MATCH WON
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>
                            Server: <strong>{ev.serverPlayerName || 'Server'}</strong>
                          </span>
                          {ev.receiverPlayerName && (
                            <>
                              <span>•</span>
                              <span>
                                Receiver: <strong>{ev.receiverPlayerName}</strong>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-black text-white">
                        {ev.scoreAfter?.scoreA ?? ev.scoreA_after ?? 0} - {ev.scoreAfter?.scoreB ?? ev.scoreB_after ?? 0}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        From {ev.scoreBefore?.scoreA ?? 0}-{ev.scoreBefore?.scoreB ?? 0}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: PLAYER STATISTICS (SINGLES & DOUBLES) */}
      {activeTab === 'players' && (
        <div className="space-y-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-3">Player</th>
                  <th className="py-3 px-3">Team</th>
                  <th className="py-3 px-3 text-center">Pts Won/Played</th>
                  <th className="py-3 px-3 text-center">Win %</th>
                  <th className="py-3 px-3 text-center text-red-400">Smashes</th>
                  <th className="py-3 px-3 text-center">Drops</th>
                  <th className="py-3 px-3 text-center">Net Kills</th>
                  <th className="py-3 px-3 text-center">Aces</th>
                  <th className="py-3 px-3 text-center font-bold text-emerald-400">Total Winners</th>
                  <th className="py-3 px-3 text-center text-amber-400">Faults / Errors</th>
                  <th className="py-3 px-3 text-center">Serve Win %</th>
                  <th className="py-3 px-3 text-center">Return Win %</th>
                  <th className="py-3 px-3 text-center bg-slate-800/60 text-amber-300 font-black">Performance Index</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-medium">
                {playerStats.map((ps) => (
                  <tr key={ps.playerId} className="hover:bg-slate-900/50">
                    <td className="py-3 px-3 font-bold text-white flex items-center gap-1.5">
                      {ps.playerName}
                      {ps.isCaptain && <span className="text-[10px] text-amber-400 font-bold">(C)</span>}
                    </td>
                    <td className="py-3 px-3 text-slate-300">{ps.teamName}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="font-bold text-white">{ps.pointsWon}</span> / {ps.totalPointsPlayed}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-400">{ps.pointWinPct}%</td>
                    <td className="py-3 px-3 text-center font-bold text-red-400">{ps.smashWinners}</td>
                    <td className="py-3 px-3 text-center">{ps.dropShotWinners}</td>
                    <td className="py-3 px-3 text-center">{ps.netWinners}</td>
                    <td className="py-3 px-3 text-center">{ps.aces}</td>
                    <td className="py-3 px-3 text-center font-black text-emerald-400">{ps.totalWinners}</td>
                    <td className="py-3 px-3 text-center text-amber-400">
                      {ps.serviceFaults} / {ps.unforcedErrors}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {ps.serviceWinPct}% <span className="text-[10px] text-slate-500">({ps.servicePointsWon}/{ps.servicePointsServed})</span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {ps.returnWinPct}% <span className="text-[10px] text-slate-500">({ps.returnPointsWon}/{ps.returnPointsReceived})</span>
                    </td>
                    <td className="py-3 px-3 text-center font-black text-amber-400 bg-slate-800/40 text-sm">
                      {ps.performanceIndex}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Performance Index Algorithm Transparency Box */}
          <Card className="bg-slate-900/60 border-slate-800 p-4 text-xs">
            <div className="flex items-center gap-2 font-bold text-white mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Transparent Performance Index Calculation
            </div>
            <p className="text-slate-400 leading-relaxed">
              Formula: <code>(Points Won × 1.5) + (Game Wins × 10) + (Match Win Bonus × 15) + (Winners × 2) + (Smashes × 3) + (Net Kills × 2.5) + (Aces × 3) - (Errors × 2) - (Faults × 2)</code>. All ranking metrics are calculated directly from official scoring events.
            </p>
          </Card>
        </div>
      )}

      {/* TAB CONTENT: TEAM COMPARISON */}
      {activeTab === 'teams' && (
        <div className="space-y-4">
          <Card className="bg-slate-900 border-slate-800 p-5">
            <h3 className="font-bold text-white text-base mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              Head-to-Head Team Statistics Comparison
            </h3>
            <div className="space-y-4 text-sm font-medium">
              {[
                { label: 'Games Won', valA: teamAStats.gamesWon ?? gamesWonA, valB: teamBStats.gamesWon ?? gamesWonB },
                { label: 'Total Points Won', valA: teamAStats.totalPointsWon, valB: teamBStats.totalPointsWon },
                { label: 'Point Win Percentage', valA: `${teamAStats.pointWinPct}%`, valB: `${teamBStats.pointWinPct}%` },
                { label: 'Total Winners', valA: teamAStats.totalWinners, valB: teamBStats.totalWinners },
                { label: 'Smash Winners', valA: teamAStats.smashWinners, valB: teamBStats.smashWinners },
                { label: 'Drop Shot Winners', valA: teamAStats.dropShotWinners, valB: teamBStats.dropShotWinners },
                { label: 'Net Kill Winners', valA: teamAStats.netWinners, valB: teamBStats.netWinners },
                { label: 'Service Faults', valA: teamAStats.serviceFaults, valB: teamBStats.serviceFaults },
                { label: 'Unforced Errors', valA: teamAStats.unforcedErrors, valB: teamBStats.unforcedErrors },
                { label: 'Service Points Won (Win %)', valA: `${teamAStats.serviceWinPct}%`, valB: `${teamBStats.serviceWinPct}%` },
                { label: 'Return Points Won (Win %)', valA: `${teamAStats.returnWinPct}%`, valB: `${teamBStats.returnWinPct}%` },
                { label: 'Max Points Streak', valA: teamAStats.maxPointsStreak, valB: teamBStats.maxPointsStreak },
              ].map((stat, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <span className="w-24 text-left font-bold text-emerald-400">{stat.valA ?? '0'}</span>
                  <span className="text-slate-300 text-xs font-semibold uppercase tracking-wider">{stat.label}</span>
                  <span className="w-24 text-right font-bold text-indigo-400">{stat.valB ?? '0'}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* TAB CONTENT: RALLY ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Shot Type Breakdown */}
            <Card className="bg-slate-900 border-slate-800 p-5">
              <h3 className="font-bold text-white text-base mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
                Winners by Shot Type Breakdown
              </h3>
              <div className="space-y-3">
                {rallyAnalytics.winnersByShotType.map((w: any, idx: number) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-300">{w.type}</span>
                      <span className="text-white">
                        {teamAName}: {w.countTeamA} | {teamBName}: {w.countTeamB} (Total: {w.total})
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden flex">
                      <div
                        className="bg-emerald-500 h-full"
                        style={{ width: `${w.total > 0 ? (w.countTeamA / w.total) * 100 : 0}%` }}
                      />
                      <div
                        className="bg-indigo-500 h-full"
                        style={{ width: `${w.total > 0 ? (w.countTeamB / w.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Error Distribution */}
            <Card className="bg-slate-900 border-slate-800 p-5">
              <h3 className="font-bold text-white text-base mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                Errors & Faults Breakdown
              </h3>
              <div className="space-y-3">
                {rallyAnalytics.errorsByShotType.map((err: any, idx: number) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-300">{err.type}</span>
                      <span className="text-white">
                        {teamAName}: {err.countTeamA} | {teamBName}: {err.countTeamB} (Total: {err.total})
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden flex">
                      <div
                        className="bg-amber-500 h-full"
                        style={{ width: `${err.total > 0 ? (err.countTeamA / err.total) * 100 : 0}%` }}
                      />
                      <div
                        className="bg-red-500 h-full"
                        style={{ width: `${err.total > 0 ? (err.countTeamB / err.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB CONTENT: MATCH AWARDS & CITATIONS */}
      {activeTab === 'awards' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                Badminton Match Awards & Citations
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated recommendations derived from the Performance Index algorithm. Admin can override candidates and enter custom citations.
              </p>
            </div>
            {!editingAwards && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingAwards(true)}
                className="border-amber-500/40 text-amber-300 hover:bg-amber-950/40"
              >
                Edit / Override Awards
              </Button>
            )}
          </div>

          {editingAwards ? (
            <Card className="bg-slate-900 border-amber-500/40 p-5 space-y-5">
              <div className="font-bold text-white text-sm border-b border-slate-800 pb-2">
                ✏️ Match Awards Admin Editor
              </div>

              {/* PotM */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-amber-400">Player of the Match</label>
                <select
                  value={selectedPotmId}
                  onChange={(e) => setSelectedPotmId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Select Player --</option>
                  {allPlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Citation reason..."
                  value={potmReason}
                  onChange={(e) => setPotmReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300"
                />
              </div>

              {/* Best Attacker */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-red-400">Best Attacker</label>
                <select
                  value={selectedAttackerId}
                  onChange={(e) => setSelectedAttackerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Select Player --</option>
                  {allPlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Citation reason..."
                  value={attackerReason}
                  onChange={(e) => setAttackerReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300"
                />
              </div>

              {/* Best Server */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-indigo-400">Best Server</label>
                <select
                  value={selectedServerId}
                  onChange={(e) => setSelectedServerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Select Player --</option>
                  {allPlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Citation reason..."
                  value={serverReason}
                  onChange={(e) => setServerReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <Button variant="outline" size="sm" onClick={() => setEditingAwards(false)}>
                  Cancel
                </Button>
                <Button variant="default" size="sm" onClick={handleSaveAwards} disabled={savingAwards} className="bg-emerald-600">
                  {savingAwards ? 'Saving...' : 'Save Awards & Citations'}
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { title: 'Player of the Match', award: report.selectedPlayerOfMatch || report.suggestedPlayerOfMatch, color: 'text-amber-400' },
                { title: 'Best Attacker', award: report.selectedBestAttacker || report.suggestedBestAttacker, color: 'text-red-400' },
                { title: 'Best Server', award: report.selectedBestServer || report.suggestedBestServer, color: 'text-indigo-400' },
                { title: 'Best Returner', award: report.selectedBestReturner || report.suggestedBestReturner, color: 'text-emerald-400' },
                { title: 'Best Defender', award: report.selectedBestDefender || report.suggestedBestDefender, color: 'text-sky-400' },
                { title: 'Best Overall Performer', award: report.selectedBestPerformer || report.suggestedBestPerformer, color: 'text-yellow-400' },
              ].map((item, idx) => (
                <Card key={idx} className="bg-slate-900 border-slate-800 p-4 space-y-2">
                  <div className={`text-xs font-bold uppercase tracking-wider ${item.color}`}>{item.title}</div>
                  <div className="text-base font-bold text-white">{item.award?.playerName || 'Not Assigned'}</div>
                  <p className="text-xs text-slate-400">{item.award?.reason || 'Calculated automatically.'}</p>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: OFFICIALS & SPONSORS */}
      {activeTab === 'officials' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-slate-900 border-slate-800 p-5">
            <h3 className="font-bold text-white text-base mb-3 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              Match Officials
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Referee:</span>
                <span className="font-bold text-white">{report.officialsReport?.referee || match.officials?.referee || 'BWF Official'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Umpire:</span>
                <span className="font-bold text-white">{report.officialsReport?.umpire || match.officials?.umpire || 'Chair Umpire'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Service Judge:</span>
                <span className="font-bold text-white">{report.officialsReport?.assistant || 'Certified Judge'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Official Scorer:</span>
                <span className="font-bold text-white">{report.officialsReport?.scorer || 'Digital Scorer'}</span>
              </div>
            </div>
          </Card>

          <Card className="bg-slate-900 border-slate-800 p-5">
            <h3 className="font-bold text-white text-base mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Sponsors & Partners
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Tournament Sponsor:</span>
                <span className="font-bold text-white">{report.sponsorsReport?.tournamentSponsor || 'Title Partner'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Match Sponsor:</span>
                <span className="font-bold text-white">{report.sponsorsReport?.matchSponsor || 'Official Sponsor'}</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB CONTENT: AUDIT & VALIDATION */}
      {activeTab === 'validation' && (
        <div className="space-y-4">
          <Card className="bg-slate-900 border-slate-800 p-5">
            <h3 className="font-bold text-white text-base mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              Data Integrity & Validation Checks
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span>Event Sequence Consistency</span>
                <Badge variant={report.validation?.isScoreConsistentWithEvents !== false ? 'success' : 'danger'}>
                  {report.validation?.isScoreConsistentWithEvents !== false ? '100% CONSISTENT' : 'MISMATCH DETECTED'}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span>Match Rules & Score Limits</span>
                <Badge variant="success">BWF 21-POINT SYSTEM (MAX 30)</Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span>Finalization Status</span>
                <Badge variant={report.isFinalized ? 'outline' : 'warning'}>
                  {report.isFinalized ? `FINALIZED BY ${report.finalizedBy || 'ADMIN'}` : 'DRAFT / EDITABLE'}
                </Badge>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* FINALIZE REPORT MODAL */}
      {showFinalizeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">Finalize Match Report</h3>
                <p className="text-xs text-slate-400">Lock scorecard, verify awards, and record audit log.</p>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl text-xs space-y-2 border border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">Match Winner:</span>
                <span className="font-bold text-emerald-400">{report.winnerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Games:</span>
                <span className="font-bold text-white">{gamesWonA} - {gamesWonB}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Rallies Logged:</span>
                <span className="font-bold text-white">{activeEvents.length}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowFinalizeModal(false)}>
                Cancel
              </Button>
              <Button
                variant="default"
                onClick={handleFinalizeReport}
                disabled={finalizing}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                {finalizing ? 'Finalizing...' : 'Confirm & Lock Report'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
