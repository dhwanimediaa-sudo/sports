import React, { useState } from 'react';
import {
  BasketballMatchReport,
  BasketballPlayerStats,
  BasketballTeamStats,
  BasketballPeriodScore,
  AwardCandidate,
} from '../../types';
import { api } from '../../services/api';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
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
  TrendingUp,
  Users,
  Shield,
  Calendar,
  Clock,
  MapPin,
  ChevronRight,
  Filter,
  Search,
  Check,
  Send,
  Flame,
  Activity,
  Edit3,
} from 'lucide-react';

interface BasketballReportViewProps {
  report: BasketballMatchReport;
  onRefresh?: () => void;
}

export const BasketballReportView: React.FC<BasketballReportViewProps> = ({
  report,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'scorecard' | 'stats' | 'timeline' | 'awards'>('scorecard');

  // Awards Editing State
  const [editingAwards, setEditingAwards] = useState(false);
  const [selectedPlayerOfTheMatchId, setSelectedPlayerOfTheMatchId] = useState(
    report.selectedAwards?.playerOfTheMatch?.playerId || report.suggestedAwards?.playerOfTheMatch?.playerId || ''
  );
  const [playerOfTheMatchReason, setPlayerOfTheMatchReason] = useState(
    report.selectedAwards?.playerOfTheMatch?.details || report.suggestedAwards?.playerOfTheMatch?.details || ''
  );
  const [selectedBestScorerId, setSelectedBestScorerId] = useState(
    report.selectedAwards?.bestScorer?.playerId || report.suggestedAwards?.bestScorer?.playerId || ''
  );
  const [selectedBestRebounderId, setSelectedBestRebounderId] = useState(
    report.selectedAwards?.bestRebounder?.playerId || report.suggestedAwards?.bestRebounder?.playerId || ''
  );
  const [selectedBestPlaymakerId, setSelectedBestPlaymakerId] = useState(
    report.selectedAwards?.bestPlaymaker?.playerId || report.suggestedAwards?.bestPlaymaker?.playerId || ''
  );
  const [selectedBestThreePointShooterId, setSelectedBestThreePointShooterId] = useState(
    report.selectedAwards?.bestThreePointShooter?.playerId || report.suggestedAwards?.bestThreePointShooter?.playerId || ''
  );
  const [savingAwards, setSavingAwards] = useState(false);

  // Finalization State
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [reopening, setReopening] = useState(false);

  // Play by play filter & search
  const [playSearch, setPlaySearch] = useState('');
  const [quarterFilter, setQuarterFilter] = useState<number | 'ALL'>('ALL');

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const matchId = report.match?.id || report.matchId || '';

  const handleSaveAwards = async () => {
    setSavingAwards(true);
    try {
      await api.updateMatchAwards(matchId, {
        playerOfTheMatchId: selectedPlayerOfTheMatchId,
        playerOfTheMatchReason: playerOfTheMatchReason,
        bestScorerId: selectedBestScorerId,
        bestRebounderId: selectedBestRebounderId,
        bestPlaymakerId: selectedBestPlaymakerId,
        bestThreePointShooterId: selectedBestThreePointShooterId,
      });
      setEditingAwards(false);
      showToast('Match awards updated successfully!');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to save awards.');
    } finally {
      setSavingAwards(false);
    }
  };

  const handleFinalizeReport = async () => {
    setFinalizing(true);
    try {
      await api.finalizeMatchReport(matchId);
      setShowFinalizeModal(false);
      showToast('Match report officially finalized & certified!');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to finalize report.');
    } finally {
      setFinalizing(false);
    }
  };

  const handleReopenReport = async () => {
    if (!window.confirm('Reopen this match report for administrative edits?')) return;
    setReopening(true);
    try {
      await api.reopenMatchReport(matchId);
      showToast('Match report reopened for edits.');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to reopen report.');
    } finally {
      setReopening(false);
    }
  };

  const handleSendToBroadcast = async (overlayType: string) => {
    try {
      await api.triggerBroadcastEvent(report.matchId, {
        type: overlayType,
        durationSeconds: 15,
      });
      showToast(`Triggered "${overlayType}" graphic overlay on broadcast URL!`);
    } catch (err: any) {
      showToast(err.message || 'Failed to trigger broadcast.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Filtered plays
  const filteredPlays = (report.playByPlay || []).filter((play) => {
    if (quarterFilter !== 'ALL' && play.quarter !== quarterFilter) return false;
    if (playSearch) {
      const q = playSearch.toLowerCase();
      const pName = (play.playerName || '').toLowerCase();
      const tName = (play.teamName || '').toLowerCase();
      const desc = (play.notes || '').toLowerCase();
      return pName.includes(q) || tName.includes(q) || desc.includes(q);
    }
    return true;
  });

  const allPlayers = [...report.teamASquad, ...report.teamBSquad];

  return (
    <div className="space-y-6 text-slate-100 print:text-black">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-amber-500/50 text-amber-300 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* 1. TOP HEADER & MATCH RESULT BANNER */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden print:border-none print:shadow-none print:p-0">
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-800 pb-4 mb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                🏀 BASKETBALL MATCH REPORT
              </span>
              <span className="text-xs text-slate-400 font-bold">
                {report.tournament?.name || 'Tournament'} • {report.group?.name || 'Group'} • Round: {report.match?.round || 'Standard'}
              </span>
              {report.isFinalized ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Certified & Finalized
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Unlock className="w-3 h-3" /> Live / Unlocked
                </span>
              )}
            </div>
            <h1 className="text-2xl font-black text-slate-100 mt-1">
              {report.match?.name}
            </h1>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-3">
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {report.match?.date}</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {report.match?.time}</span>
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {report.match?.venue || 'Main Court'}</span>
            </p>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2 print:hidden">
            <Button variant="secondary" size="sm" onClick={handlePrint} icon={<Printer className="w-3.5 h-3.5" />}>
              Print Report
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleSendToBroadcast('MATCH_SUMMARY')}
              icon={<Send className="w-3.5 h-3.5" />}
            >
              Overlay Summary
            </Button>
            {report.isFinalized ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReopenReport}
                disabled={reopening}
                icon={<Unlock className="w-3.5 h-3.5 text-amber-400" />}
              >
                Reopen Report
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowFinalizeModal(true)}
                icon={<Lock className="w-3.5 h-3.5" />}
              >
                Finalize & Lock
              </Button>
            )}
          </div>
        </div>

        {/* Big Score Cards & Outcome */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Team A Score */}
          <div className="md:col-span-5 flex items-center justify-between p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-black text-amber-400 text-xl">
                {report.teamA?.shortName || 'A'}
              </div>
              <div>
                <h2 className="font-black text-lg text-slate-100 leading-tight">{report.teamA?.name}</h2>
                <p className="text-xs text-slate-400 font-medium">Team A</p>
              </div>
            </div>
            <div className="text-5xl font-black text-amber-400 font-mono">{report.teamAScore}</div>
          </div>

          {/* Center Outcome Details */}
          <div className="md:col-span-2 text-center space-y-1">
            <Badge variant="outline" className="text-xs font-bold bg-slate-800/80 text-slate-300 border-slate-700">
              {report.matchStatus}
            </Badge>
            <p className="font-extrabold text-sm text-slate-200 mt-1">{report.resultText}</p>
            <p className="text-[11px] text-slate-400">{report.periodScores.length} Quarters Played</p>
          </div>

          {/* Team B Score */}
          <div className="md:col-span-5 flex items-center justify-between p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
            <div className="text-5xl font-black text-sky-400 font-mono order-last md:order-first">
              {report.teamBScore}
            </div>
            <div className="flex items-center gap-3 text-right">
              <div>
                <h2 className="font-black text-lg text-slate-100 leading-tight">{report.teamB?.name}</h2>
                <p className="text-xs text-slate-400 font-medium">Team B</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center font-black text-sky-400 text-xl">
                {report.teamB?.shortName || 'B'}
              </div>
            </div>
          </div>
        </div>

        {/* Quarter by Quarter Matrix Table */}
        <div className="mt-6 pt-4 border-t border-slate-800 overflow-x-auto">
          <table className="w-full text-xs text-center">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold">
                <th className="py-2 text-left px-3">Team</th>
                {report.periodScores.map((ps) => (
                  <th key={ps.quarter} className="py-2 px-3">{ps.quarterName}</th>
                ))}
                <th className="py-2 px-3 font-extrabold text-amber-400">TOTAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              <tr>
                <td className="py-2.5 text-left px-3 font-bold font-sans text-amber-300">{report.teamA?.name}</td>
                {report.periodScores.map((ps) => (
                  <td key={ps.quarter} className="py-2.5 px-3 text-slate-300">{ps.teamAScore}</td>
                ))}
                <td className="py-2.5 px-3 font-black text-amber-400 text-sm">{report.teamAScore}</td>
              </tr>
              <tr>
                <td className="py-2.5 text-left px-3 font-bold font-sans text-sky-300">{report.teamB?.name}</td>
                {report.periodScores.map((ps) => (
                  <td key={ps.quarter} className="py-2.5 px-3 text-slate-300">{ps.teamBScore}</td>
                ))}
                <td className="py-2.5 px-3 font-black text-sky-400 text-sm">{report.teamBScore}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. REPORT NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 print:hidden">
        <button
          onClick={() => setActiveTab('scorecard')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'scorecard'
              ? 'bg-amber-500 text-slate-950 font-black shadow-lg'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Full Player Box Scores
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'stats'
              ? 'bg-amber-500 text-slate-950 font-black shadow-lg'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Team Statistics Comparison
        </button>
        <button
          onClick={() => setActiveTab('awards')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'awards'
              ? 'bg-amber-500 text-slate-950 font-black shadow-lg'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          Match Awards & MVP
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'timeline'
              ? 'bg-amber-500 text-slate-950 font-black shadow-lg'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          Play-by-Play Stream ({report.playByPlay.length})
        </button>
      </div>

      {/* 3. TAB 1: PLAYER BOX SCORES */}
      {activeTab === 'scorecard' && (
        <div className="space-y-6">
          {/* Team A Box Score */}
          <Card className="p-5 bg-slate-900 border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400" />
                <h3 className="font-extrabold text-slate-100 text-sm">
                  {report.teamA?.name} — Player Statistics
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-amber-400">
                {report.teamAScore} PTS • FG: {report.teamAStats.fieldGoalsMade}/{report.teamAStats.fieldGoalsAttempted} ({report.teamAStats.fieldGoalPercentage}%)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold">
                    <th className="py-2.5 px-2">#</th>
                    <th className="py-2.5 px-2">Player</th>
                    <th className="py-2.5 px-2 text-center font-extrabold text-amber-400">PTS</th>
                    <th className="py-2.5 px-2 text-center">FGM-A</th>
                    <th className="py-2.5 px-2 text-center">FG%</th>
                    <th className="py-2.5 px-2 text-center">3PM-A</th>
                    <th className="py-2.5 px-2 text-center">3P%</th>
                    <th className="py-2.5 px-2 text-center">FTM-A</th>
                    <th className="py-2.5 px-2 text-center">FT%</th>
                    <th className="py-2.5 px-2 text-center">OREB</th>
                    <th className="py-2.5 px-2 text-center">DREB</th>
                    <th className="py-2.5 px-2 text-center font-bold">REB</th>
                    <th className="py-2.5 px-2 text-center text-sky-400">AST</th>
                    <th className="py-2.5 px-2 text-center text-emerald-400">STL</th>
                    <th className="py-2.5 px-2 text-center text-purple-400">BLK</th>
                    <th className="py-2.5 px-2 text-center text-rose-400">TO</th>
                    <th className="py-2.5 px-2 text-center">PF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {report.playerStats
                    .filter((p) => p.teamId === report.match?.teamAId)
                    .map((p) => (
                      <tr key={p.playerId} className="hover:bg-slate-950/40">
                        <td className="py-2 px-2 text-slate-400 font-bold">#{p.jerseyNumber || '-'}</td>
                        <td className="py-2 px-2 font-bold text-slate-200 font-sans">{p.playerName}</td>
                        <td className="py-2 px-2 text-center font-black text-amber-400">{p.points}</td>
                        <td className="py-2 px-2 text-center text-slate-300">{p.fieldGoalsMade}-{p.fieldGoalsAttempted}</td>
                        <td className="py-2 px-2 text-center text-slate-400">{p.fieldGoalPercentage}%</td>
                        <td className="py-2 px-2 text-center text-slate-300">{p.threePointersMade}-{p.threePointersAttempted}</td>
                        <td className="py-2 px-2 text-center text-slate-400">{p.threePointPercentage}%</td>
                        <td className="py-2 px-2 text-center text-slate-300">{p.freeThrowsMade}-{p.freeThrowsAttempted}</td>
                        <td className="py-2 px-2 text-center text-slate-400">{p.freeThrowPercentage}%</td>
                        <td className="py-2 px-2 text-center text-slate-400">{p.offensiveRebounds}</td>
                        <td className="py-2 px-2 text-center text-slate-400">{p.defensiveRebounds}</td>
                        <td className="py-2 px-2 text-center font-bold text-slate-200">{p.totalRebounds}</td>
                        <td className="py-2 px-2 text-center text-sky-300">{p.assists}</td>
                        <td className="py-2 px-2 text-center text-emerald-300">{p.steals}</td>
                        <td className="py-2 px-2 text-center text-purple-300">{p.blocks}</td>
                        <td className="py-2 px-2 text-center text-rose-300">{p.turnovers}</td>
                        <td className="py-2 px-2 text-center text-slate-300">{p.personalFouls}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Team B Box Score */}
          <Card className="p-5 bg-slate-900 border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-sky-400" />
                <h3 className="font-extrabold text-slate-100 text-sm">
                  {report.teamB?.name} — Player Statistics
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-sky-400">
                {report.teamBScore} PTS • FG: {report.teamBStats.fieldGoalsMade}/{report.teamBStats.fieldGoalsAttempted} ({report.teamBStats.fieldGoalPercentage}%)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold">
                    <th className="py-2.5 px-2">#</th>
                    <th className="py-2.5 px-2">Player</th>
                    <th className="py-2.5 px-2 text-center font-extrabold text-sky-400">PTS</th>
                    <th className="py-2.5 px-2 text-center">FGM-A</th>
                    <th className="py-2.5 px-2 text-center">FG%</th>
                    <th className="py-2.5 px-2 text-center">3PM-A</th>
                    <th className="py-2.5 px-2 text-center">3P%</th>
                    <th className="py-2.5 px-2 text-center">FTM-A</th>
                    <th className="py-2.5 px-2 text-center">FT%</th>
                    <th className="py-2.5 px-2 text-center">OREB</th>
                    <th className="py-2.5 px-2 text-center">DREB</th>
                    <th className="py-2.5 px-2 text-center font-bold">REB</th>
                    <th className="py-2.5 px-2 text-center text-sky-400">AST</th>
                    <th className="py-2.5 px-2 text-center text-emerald-400">STL</th>
                    <th className="py-2.5 px-2 text-center text-purple-400">BLK</th>
                    <th className="py-2.5 px-2 text-center text-rose-400">TO</th>
                    <th className="py-2.5 px-2 text-center">PF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {report.playerStats
                    .filter((p) => p.teamId === report.match?.teamBId)
                    .map((p) => (
                      <tr key={p.playerId} className="hover:bg-slate-950/40">
                        <td className="py-2 px-2 text-slate-400 font-bold">#{p.jerseyNumber || '-'}</td>
                        <td className="py-2 px-2 font-bold text-slate-200 font-sans">{p.playerName}</td>
                        <td className="py-2 px-2 text-center font-black text-sky-400">{p.points}</td>
                        <td className="py-2 px-2 text-center text-slate-300">{p.fieldGoalsMade}-{p.fieldGoalsAttempted}</td>
                        <td className="py-2 px-2 text-center text-slate-400">{p.fieldGoalPercentage}%</td>
                        <td className="py-2 px-2 text-center text-slate-300">{p.threePointersMade}-{p.threePointersAttempted}</td>
                        <td className="py-2 px-2 text-center text-slate-400">{p.threePointPercentage}%</td>
                        <td className="py-2 px-2 text-center text-slate-300">{p.freeThrowsMade}-{p.freeThrowsAttempted}</td>
                        <td className="py-2 px-2 text-center text-slate-400">{p.freeThrowPercentage}%</td>
                        <td className="py-2 px-2 text-center text-slate-400">{p.offensiveRebounds}</td>
                        <td className="py-2 px-2 text-center text-slate-400">{p.defensiveRebounds}</td>
                        <td className="py-2 px-2 text-center font-bold text-slate-200">{p.totalRebounds}</td>
                        <td className="py-2 px-2 text-center text-sky-300">{p.assists}</td>
                        <td className="py-2 px-2 text-center text-emerald-300">{p.steals}</td>
                        <td className="py-2 px-2 text-center text-purple-300">{p.blocks}</td>
                        <td className="py-2 px-2 text-center text-rose-300">{p.turnovers}</td>
                        <td className="py-2 px-2 text-center text-slate-300">{p.personalFouls}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* 4. TAB 2: TEAM STATISTICS COMPARISON */}
      {activeTab === 'stats' && (
        <Card className="p-6 bg-slate-900 border-slate-800 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-extrabold text-slate-100 text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              Head-to-Head Team Statistics Comparison
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSendToBroadcast('TEAM_STATS')}
              className="text-xs font-bold"
            >
              Overlay Team Comparison
            </Button>
          </div>

          <div className="space-y-4 text-xs font-mono">
            {[
              {
                label: 'Field Goals (FGM / FGA)',
                valA: `${report.teamAStats.fieldGoalsMade}/${report.teamAStats.fieldGoalsAttempted}`,
                pctA: report.teamAStats.fieldGoalPercentage,
                valB: `${report.teamBStats.fieldGoalsMade}/${report.teamBStats.fieldGoalsAttempted}`,
                pctB: report.teamBStats.fieldGoalPercentage,
              },
              {
                label: '3-Point Field Goals (3PM / 3PA)',
                valA: `${report.teamAStats.threePointersMade}/${report.teamAStats.threePointersAttempted}`,
                pctA: report.teamAStats.threePointPercentage,
                valB: `${report.teamBStats.threePointersMade}/${report.teamBStats.threePointersAttempted}`,
                pctB: report.teamBStats.threePointPercentage,
              },
              {
                label: 'Free Throws (FTM / FTA)',
                valA: `${report.teamAStats.freeThrowsMade}/${report.teamAStats.freeThrowsAttempted}`,
                pctA: report.teamAStats.freeThrowPercentage,
                valB: `${report.teamBStats.freeThrowsMade}/${report.teamBStats.freeThrowsAttempted}`,
                pctB: report.teamBStats.freeThrowPercentage,
              },
              {
                label: 'Total Rebounds (Off / Def)',
                valA: `${report.teamAStats.totalRebounds} (${report.teamAStats.offensiveRebounds}/${report.teamAStats.defensiveRebounds})`,
                valB: `${report.teamBStats.totalRebounds} (${report.teamBStats.offensiveRebounds}/${report.teamBStats.defensiveRebounds})`,
              },
              {
                label: 'Assists',
                valA: report.teamAStats.assists,
                valB: report.teamBStats.assists,
              },
              {
                label: 'Steals',
                valA: report.teamAStats.steals,
                valB: report.teamBStats.steals,
              },
              {
                label: 'Blocks',
                valA: report.teamAStats.blocks,
                valB: report.teamBStats.blocks,
              },
              {
                label: 'Turnovers',
                valA: report.teamAStats.turnovers,
                valB: report.teamBStats.turnovers,
              },
              {
                label: 'Points off Turnovers',
                valA: `${report.teamAStats.pointsOffTurnovers} pts`,
                valB: `${report.teamBStats.pointsOffTurnovers} pts`,
              },
              {
                label: 'Points in the Paint',
                valA: `${report.teamAStats.pointsInPaint} pts`,
                valB: `${report.teamBStats.pointsInPaint} pts`,
              },
              {
                label: 'Fast Break Points',
                valA: `${report.teamAStats.fastBreakPoints} pts`,
                valB: `${report.teamBStats.fastBreakPoints} pts`,
              },
              {
                label: 'Second Chance Points',
                valA: `${report.teamAStats.secondChancePoints} pts`,
                valB: `${report.teamBStats.secondChancePoints} pts`,
              },
              {
                label: 'Bench Points',
                valA: `${report.teamAStats.benchPoints} pts`,
                valB: `${report.teamBStats.benchPoints} pts`,
              },
              {
                label: 'Team Personal Fouls',
                valA: report.teamAStats.fouls,
                valB: report.teamBStats.fouls,
              },
            ].map((stat, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="flex items-center justify-between font-sans text-xs text-slate-400 font-bold mb-1.5">
                  <span className="text-amber-400 font-mono font-bold text-sm">{stat.valA}</span>
                  <span className="text-slate-300 font-medium">{stat.label}</span>
                  <span className="text-sky-400 font-mono font-bold text-sm">{stat.valB}</span>
                </div>
                {stat.pctA !== undefined && stat.pctB !== undefined && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[11px] text-amber-300 w-12 text-left">{stat.pctA}%</span>
                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden flex">
                      <div
                        className="bg-amber-500 h-full"
                        style={{ width: `${(stat.pctA / (stat.pctA + stat.pctB || 1)) * 100}%` }}
                      />
                      <div
                        className="bg-sky-500 h-full"
                        style={{ width: `${(stat.pctB / (stat.pctA + stat.pctB || 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-sky-300 w-12 text-right">{stat.pctB}%</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 5. TAB 3: MATCH AWARDS */}
      {activeTab === 'awards' && (
        <div className="space-y-6">
          <Card className="p-6 bg-slate-900 border-slate-800 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-slate-100 text-base">Official Match Honors & Awards</h3>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSendToBroadcast('PLAYER_OF_THE_MATCH')}
                  className="text-xs font-bold"
                >
                  Overlay MVP Graphic
                </Button>
                {!editingAwards ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setEditingAwards(true)}
                    icon={<Edit3 className="w-3.5 h-3.5" />}
                  >
                    Edit Honors
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveAwards}
                    disabled={savingAwards}
                    icon={<Check className="w-3.5 h-3.5" />}
                  >
                    {savingAwards ? 'Saving...' : 'Save Honors'}
                  </Button>
                )}
              </div>
            </div>

            {/* Award Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Player of the Match (MVP) */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 to-slate-950 border border-amber-500/30 space-y-3">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <span className="font-extrabold text-amber-300 text-sm">Player of the Match (MVP)</span>
                </div>
                {editingAwards ? (
                  <div className="space-y-2">
                    <select
                      value={selectedPlayerOfTheMatchId}
                      onChange={(e) => setSelectedPlayerOfTheMatchId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                    >
                      <option value="">-- Select MVP --</option>
                      {allPlayers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (#{p.jerseyNumber})
                        </option>
                      ))}
                    </select>
                    <Input
                      placeholder="MVP citation / reason..."
                      value={playerOfTheMatchReason}
                      onChange={(e) => setPlayerOfTheMatchReason(e.target.value)}
                    />
                  </div>
                ) : (
                  <div>
                    <h4 className="font-black text-lg text-slate-100">
                      {report.selectedAwards?.playerOfTheMatch?.playerName || 'Not Assigned'}
                    </h4>
                    <p className="text-xs text-amber-400 font-mono mt-1">
                      {report.selectedAwards?.playerOfTheMatch?.details || 'Outstanding performance'}
                    </p>
                  </div>
                )}
              </div>

              {/* Best Scorer */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-rose-400" />
                  <span className="font-extrabold text-rose-300 text-sm">Top Scorer Award</span>
                </div>
                {editingAwards ? (
                  <select
                    value={selectedBestScorerId}
                    onChange={(e) => setSelectedBestScorerId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  >
                    <option value="">-- Select Top Scorer --</option>
                    {allPlayers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (#{p.jerseyNumber})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div>
                    <h4 className="font-black text-lg text-slate-100">
                      {report.selectedAwards?.bestScorer?.playerName || 'Not Assigned'}
                    </h4>
                    <p className="text-xs text-rose-400 font-mono mt-1">
                      {report.selectedAwards?.bestScorer?.details || 'High Points Leader'}
                    </p>
                  </div>
                )}
              </div>

              {/* Best Rebounder */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-sky-400" />
                  <span className="font-extrabold text-sky-300 text-sm">Dominant Rebounder</span>
                </div>
                {editingAwards ? (
                  <select
                    value={selectedBestRebounderId}
                    onChange={(e) => setSelectedBestRebounderId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  >
                    <option value="">-- Select Rebounder --</option>
                    {allPlayers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (#{p.jerseyNumber})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div>
                    <h4 className="font-black text-lg text-slate-100">
                      {report.selectedAwards?.bestRebounder?.playerName || 'Not Assigned'}
                    </h4>
                    <p className="text-xs text-sky-400 font-mono mt-1">
                      {report.selectedAwards?.bestRebounder?.details || 'Glass Cleaner'}
                    </p>
                  </div>
                )}
              </div>

              {/* Best Playmaker */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-purple-400" />
                  <span className="font-extrabold text-purple-300 text-sm">Master Playmaker</span>
                </div>
                {editingAwards ? (
                  <select
                    value={selectedBestPlaymakerId}
                    onChange={(e) => setSelectedBestPlaymakerId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  >
                    <option value="">-- Select Playmaker --</option>
                    {allPlayers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (#{p.jerseyNumber})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div>
                    <h4 className="font-black text-lg text-slate-100">
                      {report.selectedAwards?.bestPlaymaker?.playerName || 'Not Assigned'}
                    </h4>
                    <p className="text-xs text-purple-400 font-mono mt-1">
                      {report.selectedAwards?.bestPlaymaker?.details || 'Assists Leader'}
                    </p>
                  </div>
                )}
              </div>

              {/* Best 3PT Shooter */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-emerald-400" />
                  <span className="font-extrabold text-emerald-300 text-sm">Sharpshooter (3PT)</span>
                </div>
                {editingAwards ? (
                  <select
                    value={selectedBestThreePointShooterId}
                    onChange={(e) => setSelectedBestThreePointShooterId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  >
                    <option value="">-- Select 3PT Shooter --</option>
                    {allPlayers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (#{p.jerseyNumber})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div>
                    <h4 className="font-black text-lg text-slate-100">
                      {report.selectedAwards?.bestThreePointShooter?.playerName || 'Not Assigned'}
                    </h4>
                    <p className="text-xs text-emerald-400 font-mono mt-1">
                      {report.selectedAwards?.bestThreePointShooter?.details || 'Long-range precision'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 6. TAB 4: PLAY-BY-PLAY TIMELINE */}
      {activeTab === 'timeline' && (
        <Card className="p-6 bg-slate-900 border-slate-800 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-800 pb-3">
            <h3 className="font-extrabold text-slate-100 text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" />
              Complete Play-by-Play Event Chronology
            </h3>

            <div className="flex items-center gap-2 text-xs">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search player / team / note..."
                  value={playSearch}
                  onChange={(e) => setPlaySearch(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <select
                value={quarterFilter}
                onChange={(e) => setQuarterFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200"
              >
                <option value="ALL">All Quarters</option>
                {report.periodScores.map((ps) => (
                  <option key={ps.quarter} value={ps.quarter}>
                    {ps.quarterName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredPlays.length === 0 ? (
              <p className="text-center py-12 text-xs text-slate-500">No events found matching your search.</p>
            ) : (
              filteredPlays.map((play) => (
                <div
                  key={play.id}
                  className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs hover:border-slate-700"
                >
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] font-bold">
                      {play.quarterName} {play.gameTimeDisplay}
                    </span>
                    <div>
                      <p className="font-bold text-slate-200">
                        <span className={play.teamId === report.match?.teamAId ? 'text-amber-400' : 'text-sky-400'}>
                          [{play.teamName}]
                        </span>{' '}
                        {play.playerName ? `${play.playerName} ` : ''}
                        <span className="text-slate-300">
                          {play.eventType === 'SCORE_3PT' && '🎯 made a 3-Point Shot!'}
                          {play.eventType === 'SCORE_2PT' && '🏀 scored 2-Points'}
                          {play.eventType === 'SCORE_1PT' && '🎯 made Free Throw (+1)'}
                          {play.eventType === 'REBOUND' && `grabbed ${play.reboundType || ''} Rebound`}
                          {play.eventType === 'STEAL' && 'recorded a Steal'}
                          {play.eventType === 'BLOCK' && 'blocked shot'}
                          {play.eventType === 'TURNOVER' && `Turnover (${play.turnoverType || 'Ball Loss'})`}
                          {play.eventType === 'SHOT_CLOCK_VIOLATION' && '24-Second Shot Clock Violation'}
                          {play.eventType.startsWith('FOUL') && `Foul committed (${play.foulType || 'Personal'})`}
                          {play.eventType === 'TIMEOUT' && `Team Timeout called`}
                          {play.eventType === 'SUBSTITUTION' && `Sub: ${play.playerInName} in for ${play.playerOutName}`}
                        </span>
                        {play.assistPlayerName && (
                          <span className="text-slate-400 font-normal"> (Assist: {play.assistPlayerName})</span>
                        )}
                      </p>
                      {play.notes && <p className="text-[10px] text-slate-400 mt-0.5">{play.notes}</p>}
                    </div>
                  </div>

                  <div className="font-mono text-xs font-black text-slate-300">
                    {play.scoreA_after} - {play.scoreB_after}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* 7. OFFICIALS & SPONSORS FOOTER */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs print:grid-cols-2">
        <Card className="p-4 bg-slate-900 border-slate-800 space-y-2">
          <h4 className="font-extrabold text-slate-200 uppercase tracking-wider text-[11px] border-b border-slate-800 pb-1">
            Match Officials & Table Crew
          </h4>
          <div className="grid grid-cols-2 gap-2 text-slate-300">
            <div>
              <p className="text-[10px] text-slate-500 font-bold">Crew Chief (Referee 1)</p>
              <p className="font-bold">{report.match?.officials?.referee || 'Unassigned'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold">Referee 2</p>
              <p className="font-bold">{report.match?.officials?.umpire || 'Unassigned'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold">Official Scorer</p>
              <p className="font-bold">{report.match?.officials?.scorer || 'Unassigned'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold">Table Assistant / 24s Operator</p>
              <p className="font-bold">{report.match?.officials?.assistant || 'Unassigned'}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-slate-900 border-slate-800 space-y-2">
          <h4 className="font-extrabold text-slate-200 uppercase tracking-wider text-[11px] border-b border-slate-800 pb-1">
            Sponsorship & Certification
          </h4>
          <div className="space-y-1 text-slate-300">
            <p>
              <strong className="text-slate-500">Official Title Sponsor:</strong>{' '}
              {report.match?.sponsors?.sponsorName || 'Standard League Broadcast'}
            </p>
            <p>
              <strong className="text-slate-500">Certified by:</strong>{' '}
              {report.finalizedBy || 'System Certified'}
            </p>
            <p>
              <strong className="text-slate-500">Report Status:</strong>{' '}
              {report.isFinalized ? `Locked at ${report.finalizedAt}` : 'Open Live Report'}
            </p>
          </div>
        </Card>
      </div>

      {/* MODAL: FINALIZE REPORT */}
      {showFinalizeModal && (
        <Dialog isOpen={showFinalizeModal} onClose={() => setShowFinalizeModal(false)} title="Finalize & Lock Match Report">
          <div className="space-y-4 text-xs text-slate-200">
            <p className="text-slate-300">
              Finalizing this basketball match report will officially certify all player box score statistics, team totals, and match awards.
            </p>
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
              ⚠️ Once locked, no further scoring edits can be made unless an admin unlocks the report.
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <Button variant="secondary" size="sm" onClick={() => setShowFinalizeModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleFinalizeReport} disabled={finalizing}>
                {finalizing ? 'Finalizing...' : 'Certify & Lock Report'}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};
