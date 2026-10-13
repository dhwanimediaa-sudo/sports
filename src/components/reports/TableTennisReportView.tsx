import React, { useState } from 'react';
import {
  TableTennisMatchReport,
  TableTennisPlayerExtendedStats,
  TableTennisGameDetail,
  TableTennisKeyMoment,
  TableTennisDoublesSequenceStep,
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
  Table,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface TableTennisReportViewProps {
  report: TableTennisMatchReport | any;
  onRefresh: () => void;
}

export const TableTennisReportView: React.FC<TableTennisReportViewProps> = ({ report, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<
    'scorecard' | 'games' | 'rallies' | 'players' | 'teams' | 'doubles' | 'moments' | 'awards' | 'officials' | 'validation'
  >('scorecard');
  const [ralliesFilter, setRalliesFilter] = useState<string>('ALL');
  const [rallySearch, setRallySearch] = useState<string>('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Awards Editing State
  const [editingAwards, setEditingAwards] = useState(false);
  const [selectedPotmId, setSelectedPotmId] = useState(report?.selectedPlayerOfMatch?.playerId || '');
  const [potmReason, setPotmReason] = useState(report?.selectedPlayerOfMatch?.reason || '');
  const [selectedServerId, setSelectedServerId] = useState(report?.selectedBestServer?.playerId || '');
  const [serverReason, setServerReason] = useState(report?.selectedBestServer?.reason || '');
  const [selectedReturnerId, setSelectedReturnerId] = useState(report?.selectedBestReturner?.playerId || '');
  const [returnerReason, setReturnerReason] = useState(report?.selectedBestReturner?.reason || '');
  const [selectedAttackerId, setSelectedAttackerId] = useState(report?.selectedBestAttacker?.playerId || '');
  const [attackerReason, setAttackerReason] = useState(report?.selectedBestAttacker?.reason || '');
  const [selectedDefenderId, setSelectedDefenderId] = useState(report?.selectedBestDefender?.playerId || '');
  const [defenderReason, setDefenderReason] = useState(report?.selectedBestDefender?.reason || '');
  const [selectedPerformerId, setSelectedPerformerId] = useState(report?.selectedBestPerformer?.playerId || '');
  const [performerReason, setPerformerReason] = useState(report?.selectedBestPerformer?.reason || '');
  const [selectedDoublesId, setSelectedDoublesId] = useState(report?.selectedBestDoublesPlayer?.playerId || '');
  const [doublesReason, setDoublesReason] = useState(report?.selectedBestDoublesPlayer?.reason || '');
  const [selectedAcesId, setSelectedAcesId] = useState(report?.selectedMostAces?.playerId || '');
  const [acesReason, setAcesReason] = useState(report?.selectedMostAces?.reason || '');
  const [selectedWinnersId, setSelectedWinnersId] = useState(report?.selectedMostWinners?.playerId || '');
  const [winnersReason, setWinnersReason] = useState(report?.selectedMostWinners?.reason || '');
  const [selectedConsistentId, setSelectedConsistentId] = useState(report?.selectedMostConsistent?.playerId || '');
  const [consistentReason, setConsistentReason] = useState(report?.selectedMostConsistent?.reason || '');
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
        bestServerId: selectedServerId || undefined,
        bestServerReason: serverReason || undefined,
        bestReturnerId: selectedReturnerId || undefined,
        bestReturnerReason: returnerReason || undefined,
        bestAttackerId: selectedAttackerId || undefined,
        bestAttackerReason: attackerReason || undefined,
        bestDefenderId: selectedDefenderId || undefined,
        bestDefenderReason: defenderReason || undefined,
        bestPerformerId: selectedPerformerId || undefined,
        bestPerformerReason: performerReason || undefined,
        bestDoublesPlayerId: selectedDoublesId || undefined,
        bestDoublesPlayerReason: doublesReason || undefined,
        mostAcesId: selectedAcesId || undefined,
        mostAcesReason: acesReason || undefined,
        mostWinnersId: selectedWinnersId || undefined,
        mostWinnersReason: winnersReason || undefined,
        mostConsistentId: selectedConsistentId || undefined,
        mostConsistentReason: consistentReason || undefined,
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
      showToast('Table Tennis Match Report finalized and locked successfully!');
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
  const teamAName = report.teamA?.name || match.teamA?.name || 'Team A';
  const teamBName = report.teamB?.name || match.teamB?.name || 'Team B';
  const gamesWonA = report.gamesWonA ?? 0;
  const gamesWonB = report.gamesWonB ?? 0;
  const isCompleted = report.isFinalized || report.status === 'COMPLETED';
  const matchType = report.matchType || match.tableTennisConfig?.matchType || 'SINGLES';
  const format = report.format || match.tableTennisConfig?.format || 'BEST_OF_5';

  const allPlayers: Player[] = [
    ...(report.teamAPlayers || []),
    ...(report.teamBPlayers || []),
  ];

  const gameScores = report.gameScores || [];
  const gameDetails: TableTennisGameDetail[] = report.gameDetails || [];
  const playerStats: TableTennisPlayerExtendedStats[] = report.playerStats || [];
  const teamAStats = report.teamAStats || {};
  const teamBStats = report.teamBStats || {};
  const keyMoments: TableTennisKeyMoment[] = report.keyMoments || [];
  const doublesSequence: TableTennisDoublesSequenceStep[] = report.doublesSequence || [];
  const activeEvents = (report.events || []).filter((e: any) => !e.isUndone);

  // Filtered Rallies
  const filteredEvents = activeEvents.filter((e: any) => {
    if (ralliesFilter !== 'ALL') {
      const type = (e.pointType || '').toUpperCase();
      if (ralliesFilter === 'ACE' && !type.includes('ACE')) return false;
      if (ralliesFilter === 'SMASH' && !type.includes('SMASH')) return false;
      if (ralliesFilter === 'FOREHAND' && !type.includes('FOREHAND')) return false;
      if (ralliesFilter === 'BACKHAND' && !type.includes('BACKHAND')) return false;
      if (ralliesFilter === 'LOOP' && !type.includes('LOOP')) return false;
      if (ralliesFilter === 'CHOP' && !type.includes('CHOP')) return false;
      if (ralliesFilter === 'NET_EDGE' && !type.includes('NET') && !type.includes('EDGE')) return false;
      if (ralliesFilter === 'SERVICE_FAULT' && !type.includes('FAULT') && !type.includes('ERROR') && !type.includes('SERVICE_ERROR')) return false;
      if (ralliesFilter === 'UNFORCED_ERROR' && !type.includes('UNFORCED')) return false;
      if (ralliesFilter === 'DECIDERS' && !e.gameWon && !e.matchWon) return false;
    }

    if (rallySearch.trim()) {
      const q = rallySearch.toLowerCase();
      const server = (e.serverPlayerName || '').toLowerCase();
      const receiver = (e.receiverPlayerName || '').toLowerCase();
      const winner = (e.pointWinnerPlayerName || '').toLowerCase();
      const type = (e.pointType || '').toLowerCase();
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

      {/* HEADER SECTION */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-xl print:bg-white print:border-gray-300 print:p-4">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                TABLE TENNIS
              </span>
              <Badge variant="outline" className="text-slate-300 border-slate-700 bg-slate-800/60 text-xs">
                {matchType} • {format.replace('_', ' ')}
              </Badge>
              {match.tableTennisConfig?.tableNumber && (
                <Badge variant="outline" className="text-cyan-300 border-cyan-700/50 bg-cyan-950/40 text-xs">
                  {match.tableTennisConfig.tableNumber}
                </Badge>
              )}
              {report.isFinalized ? (
                <Badge className="bg-emerald-600 text-white flex items-center gap-1 text-xs">
                  <Lock className="w-3 h-3" /> FINALIZED & LOCKED
                </Badge>
              ) : report.status === 'COMPLETED' ? (
                <Badge className="bg-blue-600 text-white text-xs">COMPLETED</Badge>
              ) : (
                <Badge className="bg-amber-600 text-white flex items-center gap-1 text-xs animate-pulse">
                  <Flame className="w-3 h-3" /> LIVE
                </Badge>
              )}
            </div>

            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-white print:text-black">
              {match.name || `${teamAName} vs ${teamBName}`}
            </h1>

            <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
              {tournament && <span>Tournament: <strong className="text-slate-200">{tournament.name}</strong></span>}
              {match.venue && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" /> {match.venue}
                </span>
              )}
              {match.date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" /> {match.date} {match.time && `• ${match.time}`}
                </span>
              )}
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex items-center gap-2 flex-wrap print:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
            >
              <Printer className="w-4 h-4 mr-1.5" /> Print / PDF
            </Button>

            <div className="relative group">
              <Button
                variant="outline"
                size="sm"
                className="border-cyan-500/40 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/60"
              >
                <Tv className="w-4 h-4 mr-1.5 text-cyan-400" /> Broadcast Graphic
              </Button>
              <div className="absolute right-0 top-full mt-1.5 hidden group-hover:flex flex-col bg-slate-900 border border-slate-700 rounded-xl p-1.5 shadow-2xl z-50 min-w-[200px]">
                <button
                  onClick={() => handleSendToBroadcast('table_tennis_summary')}
                  className="px-3 py-2 text-left text-xs font-semibold text-slate-200 hover:bg-slate-800 rounded-lg transition flex items-center justify-between"
                >
                  <span>Match Summary Card</span>
                  <ChevronRight className="w-3 h-3 text-slate-500" />
                </button>
                <button
                  onClick={() => handleSendToBroadcast('player_of_match')}
                  className="px-3 py-2 text-left text-xs font-semibold text-slate-200 hover:bg-slate-800 rounded-lg transition flex items-center justify-between"
                >
                  <span>Player of the Match</span>
                  <ChevronRight className="w-3 h-3 text-slate-500" />
                </button>
                <button
                  onClick={() => handleSendToBroadcast('table_tennis_stats')}
                  className="px-3 py-2 text-left text-xs font-semibold text-slate-200 hover:bg-slate-800 rounded-lg transition flex items-center justify-between"
                >
                  <span>Comparison Radar</span>
                  <ChevronRight className="w-3 h-3 text-slate-500" />
                </button>
              </div>
            </div>

            {report.isFinalized ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReopenReport}
                disabled={reopening}
                className="border-amber-600/50 bg-amber-950/40 text-amber-300 hover:bg-amber-900/60"
              >
                <Unlock className="w-4 h-4 mr-1.5 text-amber-400" />
                {reopening ? 'Reopening...' : 'Unlock / Reopen'}
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => setShowFinalizeModal(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
              >
                <FileCheck className="w-4 h-4 mr-1.5" /> Finalize & Lock
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 p-2"
              title="Refresh Report"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* MATCH SCORE BANNER */}
        <div className="mt-6 pt-6 border-t border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6 w-full md:w-auto justify-center">
            {/* Team A */}
            <div className={`text-right ${gamesWonA > gamesWonB ? 'text-cyan-400' : 'text-slate-200'}`}>
              <h2 className="text-xl font-bold tracking-tight">{teamAName}</h2>
              <div className="text-xs text-slate-400">
                {report.teamAPlayers?.map((p: any) => p.name).join(' / ') || 'Team A'}
              </div>
            </div>

            {/* Score */}
            <div className="flex items-center gap-3 bg-slate-950/80 px-5 py-2.5 rounded-xl border border-slate-800 shadow-inner">
              <span className={`text-3xl font-black ${gamesWonA > gamesWonB ? 'text-cyan-400' : 'text-slate-200'}`}>
                {gamesWonA}
              </span>
              <span className="text-slate-600 font-bold text-lg">:</span>
              <span className={`text-3xl font-black ${gamesWonB > gamesWonA ? 'text-cyan-400' : 'text-slate-200'}`}>
                {gamesWonB}
              </span>
            </div>

            {/* Team B */}
            <div className={`text-left ${gamesWonB > gamesWonA ? 'text-cyan-400' : 'text-slate-200'}`}>
              <h2 className="text-xl font-bold tracking-tight">{teamBName}</h2>
              <div className="text-xs text-slate-400">
                {report.teamBPlayers?.map((p: any) => p.name).join(' / ') || 'Team B'}
              </div>
            </div>
          </div>

          {/* Game breakdown pills */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {gameDetails.map((gd) => (
              <div
                key={gd.gameNumber}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex flex-col items-center min-w-[54px] ${
                  gd.isCompleted
                    ? gd.scoreA > gd.scoreB
                      ? 'bg-cyan-950/40 border-cyan-700/60 text-cyan-300'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300'
                    : 'bg-slate-900 border-dashed border-slate-700 text-slate-500'
                }`}
              >
                <span className="text-[10px] text-slate-400 uppercase">G{gd.gameNumber}</span>
                <span>{gd.scoreA}-{gd.scoreB}</span>
              </div>
            ))}
          </div>
        </div>

        {report.matchResultText && (
          <div className="mt-4 p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-center text-xs font-semibold text-cyan-300">
            🏆 {report.matchResultText}
          </div>
        )}
      </div>

      {/* SUMMARY STATISTIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 print:grid-cols-3">
        <Card className="bg-slate-900 border-slate-800 p-4 flex flex-col justify-between">
          <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" /> Total Rallies
          </div>
          <div className="text-2xl font-black text-white mt-1">
            {report.summaryCards?.totalRallies || activeEvents.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Total points contested</div>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-4 flex flex-col justify-between">
          <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" /> Total Winners
          </div>
          <div className="text-2xl font-black text-amber-400 mt-1">
            {report.summaryCards?.totalWinners || (teamAStats.winners || 0) + (teamBStats.winners || 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {teamAStats.winners || 0} A • {teamBStats.winners || 0} B
          </div>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-4 flex flex-col justify-between">
          <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-red-400" /> Service Aces
          </div>
          <div className="text-2xl font-black text-red-400 mt-1">
            {report.summaryCards?.totalAces || (teamAStats.aces || 0) + (teamBStats.aces || 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Clean service winners</div>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-4 flex flex-col justify-between">
          <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-emerald-400" /> Smashes
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {(teamAStats.smashWinners || 0) + (teamBStats.smashWinners || 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">High-speed kills</div>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-4 flex flex-col justify-between">
          <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-purple-400" /> Top Performer
          </div>
          <div className="text-sm font-bold text-white mt-1 truncate" title={report.selectedPlayerOfMatch?.playerName || 'N/A'}>
            {report.selectedPlayerOfMatch?.playerName || 'Top Scorer'}
          </div>
          <div className="text-[11px] text-purple-400 mt-1">
            MPI: {report.selectedPlayerOfMatch?.score || report.playerStats?.[0]?.performanceIndex || 0}
          </div>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-4 flex flex-col justify-between">
          <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <Table className="w-3.5 h-3.5 text-cyan-400" /> Table & Venue
          </div>
          <div className="text-sm font-bold text-white mt-1 truncate">
            {match.tableTennisConfig?.tableNumber || 'Table 1'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">{match.venue || 'Center Court'}</div>
        </Card>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-800 pb-2 print:hidden scrollbar-none">
        <button
          onClick={() => setActiveTab('scorecard')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'scorecard'
              ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" /> Scorecard & Games
        </button>

        <button
          onClick={() => setActiveTab('games')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'games'
              ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" /> Game Details
        </button>

        <button
          onClick={() => setActiveTab('rallies')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'rallies'
              ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" /> Point Timeline ({activeEvents.length})
        </button>

        <button
          onClick={() => setActiveTab('players')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'players'
              ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" /> Player Analytics
        </button>

        <button
          onClick={() => setActiveTab('teams')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'teams'
              ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" /> Team Comparison
        </button>

        {matchType === 'DOUBLES' && (
          <button
            onClick={() => setActiveTab('doubles')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'doubles'
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" /> Doubles Rotation
          </button>
        )}

        <button
          onClick={() => setActiveTab('moments')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'moments'
              ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Flame className="w-4 h-4" /> Key Moments
        </button>

        <button
          onClick={() => setActiveTab('awards')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'awards'
              ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Award className="w-4 h-4" /> Awards & MPI
        </button>

        <button
          onClick={() => setActiveTab('officials')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'officials'
              ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Shield className="w-4 h-4" /> Officials & Squads
        </button>

        <button
          onClick={() => setActiveTab('validation')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'validation'
              ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <FileCheck className="w-4 h-4" /> Audit & Integrity
        </button>
      </div>

      {/* TAB 1: SCORECARD & GAMES TABLE */}
      {activeTab === 'scorecard' && (
        <div className="space-y-6">
          <Card className="bg-slate-900 border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Table className="w-4 h-4 text-cyan-400" /> ITTF Official Game-by-Game Scorecard
              </h3>
              <span className="text-xs text-slate-400">Standard 11-Point / 2-Point Margin</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                    <th className="py-3 px-4 font-semibold">Game #</th>
                    <th className="py-3 px-4 font-semibold">{teamAName}</th>
                    <th className="py-3 px-4 font-semibold">{teamBName}</th>
                    <th className="py-3 px-4 font-semibold">Winner</th>
                    <th className="py-3 px-4 font-semibold">Margin</th>
                    <th className="py-3 px-4 font-semibold">Deuce?</th>
                    <th className="py-3 px-4 font-semibold">Total Rallies</th>
                    <th className="py-3 px-4 font-semibold">Opening Server</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {gameDetails.map((gd) => {
                    const isWinA = gd.scoreA > gd.scoreB;
                    const diff = Math.abs(gd.scoreA - gd.scoreB);
                    return (
                      <tr key={gd.gameNumber} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 px-4 font-bold text-white">Game {gd.gameNumber}</td>
                        <td className={`py-3 px-4 font-extrabold text-sm ${isWinA ? 'text-cyan-400' : 'text-slate-300'}`}>
                          {gd.scoreA}
                        </td>
                        <td className={`py-3 px-4 font-extrabold text-sm ${!isWinA && gd.isCompleted ? 'text-cyan-400' : 'text-slate-300'}`}>
                          {gd.scoreB}
                        </td>
                        <td className="py-3 px-4">
                          {gd.isCompleted ? (
                            <span className="font-semibold text-emerald-400">
                              {gd.winnerTeamName || (isWinA ? teamAName : teamBName)}
                            </span>
                          ) : (
                            <span className="text-amber-400 text-[11px] font-medium">In Progress</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-medium">
                          {gd.isCompleted ? `+${diff} pts` : '-'}
                        </td>
                        <td className="py-3 px-4">
                          {gd.deuceReached ? (
                            <Badge className="bg-amber-950/60 text-amber-300 border-amber-800/50 text-[10px]">
                              10-10 Deuce
                            </Badge>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-300">{gd.totalRallies} rallies</td>
                        <td className="py-3 px-4 text-slate-400">{gd.startingServerName || 'N/A'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* TEAM COMPARISON BARS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-slate-900 border-slate-800 p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-cyan-400" /> Points & Scoring Comparison
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Total Points Won</span>
                    <span>{teamAStats.pointsWon || 0} vs {teamBStats.pointsWon || 0}</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full flex overflow-hidden">
                    <div
                      className="bg-cyan-500 h-full"
                      style={{
                        width: `${
                          (teamAStats.pointsWon || 0) + (teamBStats.pointsWon || 0) > 0
                            ? ((teamAStats.pointsWon || 0) / ((teamAStats.pointsWon || 0) + (teamBStats.pointsWon || 0))) * 100
                            : 50
                        }%`,
                      }}
                    />
                    <div className="bg-slate-600 h-full flex-1" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Winners (Smash, FH, BH, Loops)</span>
                    <span>{teamAStats.winners || 0} vs {teamBStats.winners || 0}</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full flex overflow-hidden">
                    <div
                      className="bg-amber-500 h-full"
                      style={{
                        width: `${
                          (teamAStats.winners || 0) + (teamBStats.winners || 0) > 0
                            ? ((teamAStats.winners || 0) / ((teamAStats.winners || 0) + (teamBStats.winners || 0))) * 100
                            : 50
                        }%`,
                      }}
                    />
                    <div className="bg-slate-600 h-full flex-1" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Service Aces</span>
                    <span>{teamAStats.aces || 0} vs {teamBStats.aces || 0}</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full flex overflow-hidden">
                    <div
                      className="bg-red-500 h-full"
                      style={{
                        width: `${
                          (teamAStats.aces || 0) + (teamBStats.aces || 0) > 0
                            ? ((teamAStats.aces || 0) / ((teamAStats.aces || 0) + (teamBStats.aces || 0))) * 100
                            : 50
                        }%`,
                      }}
                    />
                    <div className="bg-slate-600 h-full flex-1" />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="bg-slate-900 border-slate-800 p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" /> Service & Return Efficiency
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Service Win %</span>
                    <span>{teamAStats.serviceWinPercentage || 0}% vs {teamBStats.serviceWinPercentage || 0}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full flex overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full"
                      style={{ width: `${teamAStats.serviceWinPercentage || 50}%` }}
                    />
                    <div className="bg-slate-600 h-full flex-1" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Return Win %</span>
                    <span>{teamAStats.returnWinPercentage || 0}% vs {teamBStats.returnWinPercentage || 0}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full flex overflow-hidden">
                    <div
                      className="bg-purple-500 h-full"
                      style={{ width: `${teamAStats.returnWinPercentage || 50}%` }}
                    />
                    <div className="bg-slate-600 h-full flex-1" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Unforced Errors (Fewer is better)</span>
                    <span>{teamAStats.unforcedErrors || 0} vs {teamBStats.unforcedErrors || 0}</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full flex overflow-hidden">
                    <div
                      className="bg-rose-500 h-full"
                      style={{
                        width: `${
                          (teamAStats.unforcedErrors || 0) + (teamBStats.unforcedErrors || 0) > 0
                            ? ((teamAStats.unforcedErrors || 0) / ((teamAStats.unforcedErrors || 0) + (teamBStats.unforcedErrors || 0))) * 100
                            : 50
                        }%`,
                      }}
                    />
                    <div className="bg-slate-600 h-full flex-1" />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: GAME DETAILS */}
      {activeTab === 'games' && (
        <div className="space-y-4">
          {gameDetails.map((gd) => {
            const gameEvents = activeEvents.filter((e) => e.gameNumber === gd.gameNumber);
            return (
              <Card key={gd.gameNumber} className="bg-slate-900 border-slate-800 p-5 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 font-black text-sm flex items-center justify-center border border-cyan-500/30">
                      G{gd.gameNumber}
                    </span>
                    <div>
                      <h4 className="text-base font-bold text-white">
                        Game {gd.gameNumber} Result: <span className="text-cyan-400">{gd.scoreA} - {gd.scoreB}</span>
                      </h4>
                      <p className="text-xs text-slate-400">
                        {gd.isCompleted ? `Won by ${gd.winnerTeamName || (gd.scoreA > gd.scoreB ? teamAName : teamBName)}` : 'Game in progress'}
                        {gd.deuceReached && ' • Reached 10-10 Deuce'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400">{gameEvents.length} Total Points</span>
                    {gd.startingServerName && (
                      <Badge variant="outline" className="text-slate-300 border-slate-700 bg-slate-800 text-[11px]">
                        Server: {gd.startingServerName}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Game Point Progression Mini Grid */}
                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  {gameEvents.map((evt, pIdx) => {
                    const isWinA = evt.pointWinner === 'TEAM_A';
                    return (
                      <div
                        key={evt.id || pIdx}
                        className={`px-2 py-1 rounded text-[10px] font-mono flex items-center gap-1 border ${
                          isWinA
                            ? 'bg-cyan-950/40 border-cyan-800/60 text-cyan-300'
                            : 'bg-slate-800/60 border-slate-700 text-slate-300'
                        }`}
                        title={`${evt.serverPlayerName} → ${evt.receiverPlayerName} (${evt.pointType})`}
                      >
                        <span className="font-bold">{evt.scoreAfter.scoreA}-{evt.scoreAfter.scoreB}</span>
                        <span className="text-[9px] text-slate-400">({evt.pointType.split('_')[0]})</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* TAB 3: POINT TIMELINE */}
      {activeTab === 'rallies' && (
        <Card className="bg-slate-900 border-slate-800 p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" /> Table Tennis Rally by Rally Log
              </h3>
              <p className="text-xs text-slate-400">Chronological replay of each rally point</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search player, shot..."
                  value={rallySearch}
                  onChange={(e) => setRallySearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <select
                value={ralliesFilter}
                onChange={(e) => setRalliesFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="ALL">All Points</option>
                <option value="ACE">Aces Only</option>
                <option value="SMASH">Smashes Only</option>
                <option value="FOREHAND">Forehand Winners</option>
                <option value="BACKHAND">Backhand Winners</option>
                <option value="LOOP">Loops Only</option>
                <option value="CHOP">Chops Only</option>
                <option value="NET_EDGE">Net / Edge Balls</option>
                <option value="SERVICE_FAULT">Service Faults</option>
                <option value="UNFORCED_ERROR">Unforced Errors</option>
                <option value="DECIDERS">Game/Match Enders</option>
              </select>
            </div>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No scoring events found matching your filter criteria.
              </div>
            ) : (
              filteredEvents.map((evt, idx) => {
                const isWinA = evt.pointWinner === 'TEAM_A';
                return (
                  <div
                    key={evt.id || idx}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition flex items-center justify-between gap-4 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 font-bold flex items-center justify-center text-xs">
                        #{evt.rallyNumber || idx + 1}
                      </span>

                      <div>
                        <div className="flex items-center gap-2 font-medium text-white">
                          <span className="text-cyan-400 font-bold">Game {evt.gameNumber}</span>
                          <span>•</span>
                          <span>{evt.serverPlayerName || 'Server'} (S) ➔ {evt.receiverPlayerName || 'Receiver'} (R)</span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span className="text-amber-400 font-semibold">{evt.pointType.replace(/_/g, ' ')}</span>
                          <span>•</span>
                          <span>Winner: <strong className={isWinA ? 'text-cyan-400' : 'text-slate-200'}>{evt.pointWinnerPlayerName || (isWinA ? teamAName : teamBName)}</strong></span>
                          {evt.isDeuce && (
                            <Badge className="bg-amber-950/60 text-amber-300 border-amber-800 text-[9px] py-0 px-1">
                              Deuce Point
                            </Badge>
                          )}
                          {evt.gameWon && (
                            <Badge className="bg-emerald-950/60 text-emerald-300 border-emerald-800 text-[9px] py-0 px-1">
                              Game Decider
                            </Badge>
                          )}
                          {evt.matchWon && (
                            <Badge className="bg-purple-950/60 text-purple-300 border-purple-800 text-[9px] py-0 px-1">
                              Match Point Converted
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-extrabold text-white">
                        {evt.scoreAfter.scoreA} - {evt.scoreAfter.scoreB}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Before: {evt.scoreBefore.scoreA}-{evt.scoreBefore.scoreB}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      )}

      {/* TAB 4: PLAYER ANALYTICS */}
      {activeTab === 'players' && (
        <Card className="bg-slate-900 border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" /> Complete Player Performance Matrix & MPI
            </h3>
            <span className="text-xs text-slate-400">Match Performance Index (MPI) Ranked</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                  <th className="py-3 px-4 font-semibold">Player</th>
                  <th className="py-3 px-4 font-semibold">Team</th>
                  <th className="py-3 px-4 font-semibold">Pts Won (%)</th>
                  <th className="py-3 px-4 font-semibold">Winners (Smash/FH/BH/Loop/Chop)</th>
                  <th className="py-3 px-4 font-semibold">Aces</th>
                  <th className="py-3 px-4 font-semibold">Serve Win %</th>
                  <th className="py-3 px-4 font-semibold">Return Win %</th>
                  <th className="py-3 px-4 font-semibold">Errors (UE/FE)</th>
                  <th className="py-3 px-4 font-semibold">MPI Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {playerStats.map((p, idx) => (
                  <tr key={p.playerId || idx} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 text-[10px] flex items-center justify-center font-mono">
                        {idx + 1}
                      </span>
                      {p.playerName}
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-medium">{p.teamName}</td>
                    <td className="py-3 px-4 font-bold text-cyan-400">
                      {p.pointsWon} <span className="text-[11px] text-slate-500 font-normal">({p.pointWinPercentage}%)</span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-medium">
                      <strong className="text-amber-400">{p.winners}</strong>
                      <span className="text-[11px] text-slate-500"> ({p.smashWinners}/{p.forehandWinners}/{p.backhandWinners}/{p.loops}/{p.chops})</span>
                    </td>
                    <td className="py-3 px-4 text-red-400 font-bold">{p.aces}</td>
                    <td className="py-3 px-4 text-emerald-400 font-semibold">
                      {p.serving.serviceWinPercentage}% <span className="text-[10px] text-slate-500">({p.serving.servicePointsWon}/{p.serving.totalServicePoints})</span>
                    </td>
                    <td className="py-3 px-4 text-purple-400 font-semibold">
                      {p.returning.returnWinPercentage}% <span className="text-[10px] text-slate-500">({p.returning.returnPointsWon}/{p.returning.returnPoints})</span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      <span className="text-rose-400 font-semibold">{p.unforcedErrors}</span> / {p.forcedErrors}
                    </td>
                    <td className="py-3 px-4">
                      <Badge className="bg-cyan-950 text-cyan-300 border-cyan-800 font-mono font-bold text-xs">
                        {p.performanceIndex}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 5: TEAM COMPARISON */}
      {activeTab === 'teams' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-slate-900 border-slate-800 p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Table className="w-4 h-4 text-cyan-400" /> Detailed Team Technical Metrics
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-800 text-slate-300">
                <span>Games Won</span>
                <span className="font-bold text-white">{gamesWonA} - {gamesWonB}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800 text-slate-300">
                <span>Total Points Won</span>
                <span className="font-bold text-white">{teamAStats.pointsWon || 0} - {teamBStats.pointsWon || 0}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800 text-slate-300">
                <span>Clean Winners Executed</span>
                <span className="font-bold text-amber-400">{teamAStats.winners || 0} - {teamBStats.winners || 0}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800 text-slate-300">
                <span>Service Aces</span>
                <span className="font-bold text-red-400">{teamAStats.aces || 0} - {teamBStats.aces || 0}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800 text-slate-300">
                <span>Unforced Errors</span>
                <span className="font-bold text-rose-400">{teamAStats.unforcedErrors || 0} - {teamBStats.unforcedErrors || 0}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800 text-slate-300">
                <span>Game Points Converted</span>
                <span className="font-bold text-emerald-400">{teamAStats.gamePointsConverted || 0} - {teamBStats.gamePointsConverted || 0}</span>
              </div>
              <div className="flex justify-between py-2 text-slate-300">
                <span>Timeouts Taken</span>
                <span className="font-bold text-white">{teamAStats.timeoutsTaken || 0} - {teamBStats.timeoutsTaken || 0}</span>
              </div>
            </div>
          </Card>

          <Card className="bg-slate-900 border-slate-800 p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" /> Shot Breakdown Distribution
            </h3>

            <div className="space-y-2 text-xs">
              {(report.rallyAnalytics?.shotTypeDistribution || []).map((st: any) => (
                <div key={st.type} className="space-y-1">
                  <div className="flex justify-between text-slate-300">
                    <span className="font-medium">{st.type.replace(/_/g, ' ')}</span>
                    <span className="text-slate-400">{st.count} ({st.percentage}%)</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-cyan-400 h-full rounded-full" style={{ width: `${st.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 6: DOUBLES ROTATION */}
      {activeTab === 'doubles' && matchType === 'DOUBLES' && (
        <Card className="bg-slate-900 border-slate-800 p-5 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" /> ITTF Doubles 4-Step Service & Receiver Order
            </h3>
            <p className="text-xs text-slate-400">
              Sequence: Server A1 ➔ Receiver B1, then Server B1 ➔ Receiver A2, then Server A2 ➔ Receiver B2, then Server B2 ➔ Receiver A1.
            </p>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {doublesSequence.map((step, sIdx) => (
              <div
                key={sIdx}
                className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs font-mono"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 font-bold flex items-center justify-center text-xs">
                    #{step.pointNumber}
                  </span>
                  <div>
                    <div className="text-white font-bold">Game {step.gameNumber} • {step.sequenceNotation}</div>
                    <div className="text-[11px] text-slate-400">{step.serverPlayerName} to {step.receiverPlayerName}</div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className={`text-[10px] ${step.winnerSide === 'TEAM_A' ? 'bg-cyan-950 text-cyan-300' : 'bg-slate-800 text-slate-200'}`}>
                    Won by {step.winnerSide === 'TEAM_A' ? teamAName : teamBName}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* TAB 7: KEY MOMENTS */}
      {activeTab === 'moments' && (
        <Card className="bg-slate-900 border-slate-800 p-5 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" /> Match Turning Points & Key Moments
            </h3>
            <p className="text-xs text-slate-400">Pivotal lead shifts, deuce moments, and match-clinching points</p>
          </div>

          <div className="space-y-3">
            {keyMoments.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">No key moments recorded.</div>
            ) : (
              keyMoments.map((km) => (
                <div
                  key={km.id}
                  className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-3.5 hover:border-slate-700 transition"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white">{km.title}</h4>
                      <span className="text-[11px] font-mono font-bold text-cyan-400">{km.scoreDisplay}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{km.description}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* TAB 8: AWARDS & COMMITTEE OVERRIDES */}
      {activeTab === 'awards' && (
        <div className="space-y-6">
          <Card className="bg-slate-900 border-slate-800 p-5 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-cyan-400" /> Match Awards & Tournament Honors
                </h3>
                <p className="text-xs text-slate-400">
                  Statistical suggestions with optional Tournament Committee override
                </p>
              </div>

              {!editingAwards ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingAwards(true)}
                  className="border-slate-700 bg-slate-800 text-slate-200 text-xs hover:bg-slate-700"
                >
                  Edit / Override Awards
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingAwards(false)}
                    className="border-slate-700 text-slate-300 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveAwards}
                    disabled={savingAwards}
                    className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
                  >
                    {savingAwards ? 'Saving...' : 'Save Overrides'}
                  </Button>
                </div>
              )}
            </div>

            {/* AWARDS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Player of the Match */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Trophy className="w-4 h-4" /> Player of the Match
                  </span>
                  <Badge className="bg-amber-950 text-amber-300 border-amber-800 text-[10px]">Grand Prize</Badge>
                </div>

                {!editingAwards ? (
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      {report.selectedPlayerOfMatch?.playerName || report.suggestedPlayerOfMatch?.playerName || 'N/A'}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      {report.selectedPlayerOfMatch?.reason || report.suggestedPlayerOfMatch?.reason || 'Calculated by Match Performance Index'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <select
                      value={selectedPotmId}
                      onChange={(e) => setSelectedPotmId(e.target.value)}
                      className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                    >
                      <option value="">-- Select Player --</option>
                      {allPlayers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.teamId === match.teamAId ? teamAName : teamBName})
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={potmReason}
                      onChange={(e) => setPotmReason(e.target.value)}
                      placeholder="Citation / Justification..."
                      className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200"
                    />
                  </div>
                )}
              </div>

              {/* Best Server */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                    <Zap className="w-4 h-4" /> Best Server
                  </span>
                  <Badge className="bg-cyan-950 text-cyan-300 border-cyan-800 text-[10px]">Service Accuracy</Badge>
                </div>

                {!editingAwards ? (
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      {report.selectedBestServer?.playerName || report.suggestedBestServer?.playerName || 'N/A'}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      {report.selectedBestServer?.reason || report.suggestedBestServer?.reason || 'Service Win % & Aces'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <select
                      value={selectedServerId}
                      onChange={(e) => setSelectedServerId(e.target.value)}
                      className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                    >
                      <option value="">-- Select Server --</option>
                      {allPlayers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.teamId === match.teamAId ? teamAName : teamBName})
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={serverReason}
                      onChange={(e) => setServerReason(e.target.value)}
                      placeholder="Citation..."
                      className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200"
                    />
                  </div>
                )}
              </div>

              {/* Best Returner */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                    <Shield className="w-4 h-4" /> Best Returner
                  </span>
                  <Badge className="bg-purple-950 text-purple-300 border-purple-800 text-[10px]">Return Conversion</Badge>
                </div>

                {!editingAwards ? (
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      {report.selectedBestReturner?.playerName || report.suggestedBestReturner?.playerName || 'N/A'}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      {report.selectedBestReturner?.reason || report.suggestedBestReturner?.reason || 'Return Conversion %'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <select
                      value={selectedReturnerId}
                      onChange={(e) => setSelectedReturnerId(e.target.value)}
                      className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                    >
                      <option value="">-- Select Returner --</option>
                      {allPlayers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.teamId === match.teamAId ? teamAName : teamBName})
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={returnerReason}
                      onChange={(e) => setReturnerReason(e.target.value)}
                      placeholder="Citation..."
                      className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200"
                    />
                  </div>
                )}
              </div>

              {/* Best Attacker */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Target className="w-4 h-4" /> Best Attacker
                  </span>
                  <Badge className="bg-emerald-950 text-emerald-300 border-emerald-800 text-[10px]">Smashes & Winners</Badge>
                </div>

                {!editingAwards ? (
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      {report.selectedBestAttacker?.playerName || report.suggestedBestAttacker?.playerName || 'N/A'}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      {report.selectedBestAttacker?.reason || report.suggestedBestAttacker?.reason || 'Aggressive Winner Execution'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <select
                      value={selectedAttackerId}
                      onChange={(e) => setSelectedAttackerId(e.target.value)}
                      className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                    >
                      <option value="">-- Select Attacker --</option>
                      {allPlayers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.teamId === match.teamAId ? teamAName : teamBName})
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={attackerReason}
                      onChange={(e) => setAttackerReason(e.target.value)}
                      placeholder="Citation..."
                      className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200"
                    />
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 9: OFFICIALS & SQUADS */}
      {activeTab === 'officials' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-slate-900 border-slate-800 p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" /> Team Squads & Captains
            </h3>

            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">{teamAName}</h4>
                <ul className="space-y-1 text-xs text-slate-300">
                  {report.squadsReport?.teamA?.players?.map((p: any, i: number) => (
                    <li key={p.id || i} className="flex items-center justify-between p-2 rounded bg-slate-950/40">
                      <span>{p.name}</span>
                      {i === 0 && <Badge className="bg-cyan-950 text-cyan-300 border-cyan-800 text-[10px]">Lead</Badge>}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">{teamBName}</h4>
                <ul className="space-y-1 text-xs text-slate-300">
                  {report.squadsReport?.teamB?.players?.map((p: any, i: number) => (
                    <li key={p.id || i} className="flex items-center justify-between p-2 rounded bg-slate-950/40">
                      <span>{p.name}</span>
                      {i === 0 && <Badge className="bg-cyan-950 text-cyan-300 border-cyan-800 text-[10px]">Lead</Badge>}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          <Card className="bg-slate-900 border-slate-800 p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" /> Certified Match Officials
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/80">
                <span className="text-slate-400">Table Umpire:</span>
                <span className="font-bold text-white">{report.officialsReport?.umpire || 'ITTF Certified Umpire'}</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/80">
                <span className="text-slate-400">Official Scorer:</span>
                <span className="font-bold text-white">{report.officialsReport?.scorer || 'Official Table Scorer'}</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/80">
                <span className="text-slate-400">Tournament Referee:</span>
                <span className="font-bold text-white">{report.officialsReport?.referee || 'Chief Referee'}</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 10: AUDIT & INTEGRITY */}
      {activeTab === 'validation' && (
        <Card className="bg-slate-900 border-slate-800 p-5 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-400" /> Match Audit & Rule Integrity Report
            </h3>
            <p className="text-xs text-slate-400">Continuous mathematical parity verification</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-medium">Rules Engine Parity:</span>
                <Badge className="bg-emerald-950 text-emerald-300 border-emerald-800 text-[10px]">
                  100% Deterministic
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500">
                All statistics are dynamically generated from {activeEvents.length} raw scoring events.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-medium">Validation Status:</span>
                {report.validation?.isValid ? (
                  <Badge className="bg-emerald-950 text-emerald-300 border-emerald-800 text-[10px]">
                    Valid Report
                  </Badge>
                ) : (
                  <Badge className="bg-red-950 text-red-300 border-red-800 text-[10px]">Issues Found</Badge>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                {report.validation?.issues?.length || 0} issues, {report.validation?.warnings?.length || 0} warnings.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* FINALIZE MODAL */}
      {showFinalizeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Finalize Match Report</h3>
                <p className="text-xs text-slate-400">Lock table tennis match score and archive report</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1">
              <p>• Final Score: <strong>{gamesWonA} - {gamesWonB}</strong></p>
              <p>• Winner: <strong>{report.winnerName}</strong></p>
              <p>• Total Points Contested: <strong>{activeEvents.length}</strong></p>
            </div>

            <p className="text-xs text-slate-400">
              Once finalized, the scoring console will be locked. Administrators can unlock this match anytime using the Reopen button.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFinalizeModal(false)}
                className="border-slate-700 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleFinalizeReport}
                disabled={finalizing}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                {finalizing ? 'Finalizing...' : 'Confirm & Lock Match'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
