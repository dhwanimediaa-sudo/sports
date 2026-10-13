import React, { useState } from 'react';
import { KabaddiMatchReport, KabaddiPlayerStats } from '../../types';
import { api } from '../../services/api';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  Trophy,
  Award,
  Printer,
  Lock,
  Unlock,
  CheckCircle2,
  Share2,
  FileText,
  Zap,
  BarChart2,
  Users,
  Shield,
  Calendar,
  MapPin,
  Filter,
  Search,
  Check,
  Send,
  Flame,
  Activity,
  ArrowRight,
  Clock,
  Sparkles,
} from 'lucide-react';

export interface KabaddiReportViewProps {
  report: KabaddiMatchReport;
  onRefresh: () => void;
}

export const KabaddiReportView: React.FC<KabaddiReportViewProps> = ({ report, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'scorecard' | 'player_stats' | 'team_stats' | 'raids' | 'awards' | 'squads'>('scorecard');

  // Awards Editing State
  const [editingAwards, setEditingAwards] = useState(false);
  const [selectedMomId, setSelectedMomId] = useState(
    report.selectedManOfMatch?.playerId || report.suggestedManOfMatch?.playerId || ''
  );
  const [momReason, setMomReason] = useState(
    report.selectedManOfMatch?.details || report.suggestedManOfMatch?.details || ''
  );
  const [selectedRaiderId, setSelectedRaiderId] = useState(
    report.selectedBestRaider?.playerId || report.suggestedBestRaider?.playerId || ''
  );
  const [selectedDefenderId, setSelectedDefenderId] = useState(
    report.selectedBestDefender?.playerId || report.suggestedBestDefender?.playerId || ''
  );
  const [selectedAllRounderId, setSelectedAllRounderId] = useState(
    report.selectedBestAllRounder?.playerId || report.suggestedBestAllRounder?.playerId || ''
  );
  const [savingAwards, setSavingAwards] = useState(false);

  // Finalization State
  const [finalizing, setFinalizing] = useState(false);
  const [reopening, setReopening] = useState(false);

  // Raids filter
  const [raidFilter, setRaidFilter] = useState<'ALL' | 'SUPER_RAID' | 'SUPER_TACKLE' | 'DO_OR_DIE' | 'BONUS'>('ALL');
  const [halfFilter, setHalfFilter] = useState<'ALL' | 1 | 2>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSaveAwards = async () => {
    setSavingAwards(true);
    try {
      await api.updateMatchAwards(report.match.id, {
        manOfTheMatchId: selectedMomId,
        manOfTheMatchReason: momReason,
        bestRaiderId: selectedRaiderId,
        bestDefenderId: selectedDefenderId,
        bestAllRounderId: selectedAllRounderId,
      });
      setEditingAwards(false);
      showToast('Kabaddi Match Awards updated successfully!');
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to save awards.', 'error');
    } finally {
      setSavingAwards(false);
    }
  };

  const handleFinalizeReport = async () => {
    setFinalizing(true);
    try {
      await api.finalizeMatchReport(report.match.id);
      showToast('Match report finalized and locked!');
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to finalize report.', 'error');
    } finally {
      setFinalizing(false);
    }
  };

  const handleReopenReport = async () => {
    if (!window.confirm('Are you sure you want to unlock this report for further edits?')) return;
    setReopening(true);
    try {
      await api.reopenMatchReport(report.match.id);
      showToast('Match report unlocked.');
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to unlock report.', 'error');
    } finally {
      setReopening(false);
    }
  };

  const handleTriggerBroadcast = async (type: string, data: any = {}) => {
    try {
      await api.triggerBroadcastEvent(report.match.id, {
        type,
        durationSeconds: 10,
        data,
      });
      showToast(`Broadcast graphic overlay "${type}" pushed to live output!`);
    } catch (err: any) {
      showToast(err.message || 'Failed to trigger broadcast.', 'error');
    }
  };

  const match = report.match;
  const isFinalized = report.isFinalized;
  const teamA = match.teamA;
  const teamB = match.teamB;

  // Filtered raids
  const filteredRaids = (report.raids || []).filter((r) => {
    if (halfFilter !== 'ALL' && r.half !== halfFilter) return false;
    if (raidFilter === 'SUPER_RAID' && !r.isSuperRaid) return false;
    if (raidFilter === 'SUPER_TACKLE' && !r.isSuperTackle) return false;
    if (raidFilter === 'DO_OR_DIE' && !r.isDoOrDie) return false;
    if (raidFilter === 'BONUS' && (!r.bonusPoints || r.bonusPoints <= 0)) return false;

    if (searchQuery.trim()) {
      const raider = report.playerStats.find((p) => p.playerId === r.raiderPlayerId);
      const query = searchQuery.toLowerCase();
      const matchRaider = raider?.playerName.toLowerCase().includes(query);
      const matchOutcome = r.outcome.toLowerCase().includes(query);
      if (!matchRaider && !matchOutcome) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 text-slate-100">
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border text-xs font-bold transition-all animate-bounce ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/50'
              : 'bg-rose-950/90 text-rose-200 border-rose-500/50'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* MATCH HEADER & REPORT CONTROLS */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-amber-500/20 shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-wider">
                KABADDI MATCH REPORT
              </span>
              <Badge variant={isFinalized ? 'success' : 'warning'}>
                {isFinalized ? '🔒 FINALIZED & OFFICIAL' : '⚡ LIVE / IN PROGRESS'}
              </Badge>
              {match.round && (
                <span className="text-xs text-slate-400 font-semibold">• {match.round}</span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">{match.name}</h1>
            <p className="text-xs text-slate-400 flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" /> {match.date || 'TBD'} {match.time ? `@ ${match.time}` : ''}
              </span>
              {match.venue && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" /> {match.venue}
                </span>
              )}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => window.print()} className="bg-slate-800 hover:bg-slate-700">
              <Printer className="w-3.5 h-3.5 mr-1 text-slate-300" />
              Print PDF
            </Button>

            {!isFinalized ? (
              <Button
                variant="primary"
                size="sm"
                loading={finalizing}
                onClick={handleFinalizeReport}
                className="bg-emerald-600 hover:bg-emerald-500 font-bold"
              >
                <Lock className="w-3.5 h-3.5 mr-1" />
                Finalize Report
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                loading={reopening}
                onClick={handleReopenReport}
                className="bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40"
              >
                <Unlock className="w-3.5 h-3.5 mr-1" />
                Reopen Report
              </Button>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleTriggerBroadcast('MATCH_RESULT')}
              className="bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold"
            >
              <Send className="w-3.5 h-3.5 mr-1 text-sky-400" />
              Push Result to Stream
            </Button>
          </div>
        </div>

        {/* Big Teams Score Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center py-2">
          {/* Team A */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-amber-500/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {teamA?.logoUrl ? (
                <img src={teamA.logoUrl} alt={teamA.name} className="w-10 h-10 rounded-lg object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 font-black text-sm">
                  {teamA?.shortName || teamA?.name.slice(0, 3).toUpperCase()}
                </div>
              )}
              <div>
                <h3 className="font-extrabold text-sm text-slate-100">{teamA?.name}</h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  H1: {report.teamAScoreHalf1} | H2: {report.teamAScoreHalf2}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-4xl font-black font-mono text-amber-400">{report.teamAScore}</span>
              <p className="text-[10px] text-slate-400 font-bold">TOTAL POINTS</p>
            </div>
          </div>

          {/* Match Outcome Summary */}
          <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-1">
            <Trophy className="w-6 h-6 text-amber-400 mb-1" />
            <h4 className="text-sm font-extrabold text-slate-100">{report.matchResult}</h4>
            <p className="text-xs font-semibold text-emerald-400">{report.matchMargin}</p>
            <span className="text-[10px] text-slate-500">{report.raids?.length || 0} Total Raids Completed</span>
          </div>

          {/* Team B */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-sky-500/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {teamB?.logoUrl ? (
                <img src={teamB.logoUrl} alt={teamB.name} className="w-10 h-10 rounded-lg object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-sky-500/20 flex items-center justify-center text-sky-400 font-black text-sm">
                  {teamB?.shortName || teamB?.name.slice(0, 3).toUpperCase()}
                </div>
              )}
              <div>
                <h3 className="font-extrabold text-sm text-slate-100">{teamB?.name}</h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  H1: {report.teamBScoreHalf1} | H2: {report.teamBScoreHalf2}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-4xl font-black font-mono text-sky-400">{report.teamBScore}</span>
              <p className="text-[10px] text-slate-400 font-bold">TOTAL POINTS</p>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK HIGHLIGHTS METRICS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Super Raids</span>
          <p className="text-2xl font-black font-mono text-amber-400 mt-1">
            {(report.teamAStats.superRaids || 0) + (report.teamBStats.superRaids || 0)}
          </p>
          <p className="text-[10px] text-slate-500">
            {teamA?.name?.slice(0, 3)}: {report.teamAStats.superRaids} | {teamB?.name?.slice(0, 3)}: {report.teamBStats.superRaids}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Super Tackles</span>
          <p className="text-2xl font-black font-mono text-sky-400 mt-1">
            {(report.teamAStats.superTackles || 0) + (report.teamBStats.superTackles || 0)}
          </p>
          <p className="text-[10px] text-slate-500">
            {teamA?.name?.slice(0, 3)}: {report.teamAStats.superTackles} | {teamB?.name?.slice(0, 3)}: {report.teamBStats.superTackles}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase">All-Outs Inflicted</span>
          <p className="text-2xl font-black font-mono text-rose-400 mt-1">
            {(report.teamAStats.allOutsInflicted || 0) + (report.teamBStats.allOutsInflicted || 0)}
          </p>
          <p className="text-[10px] text-slate-500">
            {teamA?.name?.slice(0, 3)}: {report.teamAStats.allOutsInflicted} | {teamB?.name?.slice(0, 3)}: {report.teamBStats.allOutsInflicted}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Bonus Points</span>
          <p className="text-2xl font-black font-mono text-yellow-400 mt-1">
            {(report.teamAStats.bonusPoints || 0) + (report.teamBStats.bonusPoints || 0)}
          </p>
          <p className="text-[10px] text-slate-500">
            {teamA?.name?.slice(0, 3)}: {report.teamAStats.bonusPoints} | {teamB?.name?.slice(0, 3)}: {report.teamBStats.bonusPoints}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Touch Points</span>
          <p className="text-2xl font-black font-mono text-emerald-400 mt-1">
            {(report.teamAStats.touchPoints || 0) + (report.teamBStats.touchPoints || 0)}
          </p>
          <p className="text-[10px] text-slate-500">
            {teamA?.name?.slice(0, 3)}: {report.teamAStats.touchPoints} | {teamB?.name?.slice(0, 3)}: {report.teamBStats.touchPoints}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Tackle Points</span>
          <p className="text-2xl font-black font-mono text-indigo-400 mt-1">
            {(report.teamAStats.tacklePoints || 0) + (report.teamBStats.tacklePoints || 0)}
          </p>
          <p className="text-[10px] text-slate-500">
            {teamA?.name?.slice(0, 3)}: {report.teamAStats.tacklePoints} | {teamB?.name?.slice(0, 3)}: {report.teamBStats.tacklePoints}
          </p>
        </div>
      </div>

      {/* TAB NAVIGATION */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-900/80 rounded-xl border border-slate-800 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('scorecard')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'scorecard'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          1. Match Scorecard
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('player_stats')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'player_stats'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          2. Player Statistics
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('team_stats')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'team_stats'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          3. Team Comparison
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('raids')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'raids'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          4. Raid-by-Raid Log ({report.raids?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('awards')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'awards'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          5. Match Awards
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('squads')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'squads'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          6. Squads & Line-ups
        </button>
      </div>

      {/* TAB 1: SCORECARD BREAKDOWN */}
      {activeTab === 'scorecard' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Team A Scorecard */}
          <Card className="p-5 bg-slate-900/80 border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm text-amber-400 flex items-center gap-2">
                <Shield className="w-4 h-4" /> {teamA?.name} Scorecard
              </h3>
              <span className="text-xl font-black font-mono text-amber-400">{report.teamAScore} Pts</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60">
                <span className="text-slate-400">Raid Touch Points</span>
                <span className="font-bold text-slate-200">{report.teamAStats.touchPoints}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60">
                <span className="text-slate-400">Raid Bonus Points</span>
                <span className="font-bold text-slate-200">{report.teamAStats.bonusPoints}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60">
                <span className="text-slate-400">Tackle Points (Standard)</span>
                <span className="font-bold text-slate-200">{report.teamAStats.tacklePoints}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60">
                <span className="text-slate-400">All-Out Points Earned</span>
                <span className="font-bold text-emerald-400">{report.teamAStats.allOutPoints}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60">
                <span className="text-slate-400">Extra / Technical Points</span>
                <span className="font-bold text-purple-400">{report.teamAStats.extraPoints}</span>
              </div>
            </div>
          </Card>

          {/* Team B Scorecard */}
          <Card className="p-5 bg-slate-900/80 border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm text-sky-400 flex items-center gap-2">
                <Shield className="w-4 h-4" /> {teamB?.name} Scorecard
              </h3>
              <span className="text-xl font-black font-mono text-sky-400">{report.teamBScore} Pts</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60">
                <span className="text-slate-400">Raid Touch Points</span>
                <span className="font-bold text-slate-200">{report.teamBStats.touchPoints}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60">
                <span className="text-slate-400">Raid Bonus Points</span>
                <span className="font-bold text-slate-200">{report.teamBStats.bonusPoints}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60">
                <span className="text-slate-400">Tackle Points (Standard)</span>
                <span className="font-bold text-slate-200">{report.teamBStats.tacklePoints}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60">
                <span className="text-slate-400">All-Out Points Earned</span>
                <span className="font-bold text-emerald-400">{report.teamBStats.allOutPoints}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60">
                <span className="text-slate-400">Extra / Technical Points</span>
                <span className="font-bold text-purple-400">{report.teamBStats.extraPoints}</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: PLAYER STATISTICS */}
      {activeTab === 'player_stats' && (
        <Card className="p-5 bg-slate-900/80 border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-extrabold text-sm text-slate-100 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-amber-400" /> Individual Player Match Statistics
              </h3>
              <p className="text-[11px] text-slate-400">Complete raid, tackle, and strike rate breakdown for all squad members</p>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleTriggerBroadcast('TOP_RAIDER', { raider: report.topRaiders[0] })}
              className="bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-bold"
            >
              <Send className="w-3 h-3 mr-1" />
              Broadcast Top Raider
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Player</th>
                  <th className="py-2.5 px-2">Team</th>
                  <th className="py-2.5 px-2 text-center">Total Pts</th>
                  <th className="py-2.5 px-2 text-center">Raid Pts</th>
                  <th className="py-2.5 px-2 text-center">Touch</th>
                  <th className="py-2.5 px-2 text-center">Bonus</th>
                  <th className="py-2.5 px-2 text-center">Super Raids</th>
                  <th className="py-2.5 px-2 text-center">Tackle Pts</th>
                  <th className="py-2.5 px-2 text-center">Super Tackles</th>
                  <th className="py-2.5 px-2 text-center">Raid SR%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {report.playerStats.map((player) => {
                  const isTeamA = player.teamId === match.teamAId;

                  return (
                    <tr key={player.playerId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-200">
                        #{player.jerseyNumber || '-'} {player.playerName}
                      </td>
                      <td className="py-2.5 px-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isTeamA ? 'bg-amber-500/10 text-amber-400' : 'bg-sky-500/10 text-sky-400'
                          }`}
                        >
                          {player.teamName?.slice(0, 3).toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center font-black font-mono text-amber-400">
                        {player.totalPoints}
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-slate-200">{player.totalRaidPoints}</td>
                      <td className="py-2.5 px-2 text-center text-slate-300">{player.touchPoints}</td>
                      <td className="py-2.5 px-2 text-center text-slate-300">{player.bonusPoints}</td>
                      <td className="py-2.5 px-2 text-center">
                        {player.superRaids > 0 ? (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                            {player.superRaids}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-sky-300">{player.totalTacklePoints}</td>
                      <td className="py-2.5 px-2 text-center">
                        {player.superTackles > 0 ? (
                          <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold">
                            {player.superTackles}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono text-slate-400">
                        {player.raidStrikeRate ? `${player.raidStrikeRate}%` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: TEAM COMPARISON */}
      {activeTab === 'team_stats' && (
        <Card className="p-5 bg-slate-900/80 border-slate-800 space-y-5">
          <h3 className="font-extrabold text-sm text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
            <Activity className="w-4 h-4 text-emerald-400" /> Head-to-Head Tactical Metrics
          </h3>

          <div className="space-y-4 text-xs">
            {/* Total Raids */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-bold text-slate-300">
                <span>{report.teamAStats.totalRaids}</span>
                <span className="text-slate-400 uppercase text-[10px]">Total Raids Attempted</span>
                <span>{report.teamBStats.totalRaids}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 flex overflow-hidden">
                <div
                  className="bg-amber-500 h-full"
                  style={{
                    width: `${
                      (report.teamAStats.totalRaids /
                        ((report.teamAStats.totalRaids + report.teamBStats.totalRaids) || 1)) *
                      100
                    }%`,
                  }}
                />
                <div
                  className="bg-sky-500 h-full"
                  style={{
                    width: `${
                      (report.teamBStats.totalRaids /
                        ((report.teamAStats.totalRaids + report.teamBStats.totalRaids) || 1)) *
                      100
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Raid Points */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-bold text-slate-300">
                <span>{report.teamAStats.touchPoints + report.teamAStats.bonusPoints}</span>
                <span className="text-slate-400 uppercase text-[10px]">Raid Points (Touch + Bonus)</span>
                <span>{report.teamBStats.touchPoints + report.teamBStats.bonusPoints}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 flex overflow-hidden">
                <div
                  className="bg-amber-500 h-full"
                  style={{
                    width: `${
                      ((report.teamAStats.touchPoints + report.teamAStats.bonusPoints) /
                        ((report.teamAStats.touchPoints +
                          report.teamAStats.bonusPoints +
                          report.teamBStats.touchPoints +
                          report.teamBStats.bonusPoints) || 1)) *
                      100
                    }%`,
                  }}
                />
                <div
                  className="bg-sky-500 h-full"
                  style={{
                    width: `${
                      ((report.teamBStats.touchPoints + report.teamBStats.bonusPoints) /
                        ((report.teamAStats.touchPoints +
                          report.teamAStats.bonusPoints +
                          report.teamBStats.touchPoints +
                          report.teamBStats.bonusPoints) || 1)) *
                      100
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Tackle Points */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-bold text-slate-300">
                <span>{report.teamAStats.tacklePoints}</span>
                <span className="text-slate-400 uppercase text-[10px]">Tackle Points</span>
                <span>{report.teamBStats.tacklePoints}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 flex overflow-hidden">
                <div
                  className="bg-amber-500 h-full"
                  style={{
                    width: `${
                      (report.teamAStats.tacklePoints /
                        ((report.teamAStats.tacklePoints + report.teamBStats.tacklePoints) || 1)) *
                      100
                    }%`,
                  }}
                />
                <div
                  className="bg-sky-500 h-full"
                  style={{
                    width: `${
                      (report.teamBStats.tacklePoints /
                        ((report.teamAStats.tacklePoints + report.teamBStats.tacklePoints) || 1)) *
                      100
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* TAB 4: RAID-BY-RAID TIMELINE */}
      {activeTab === 'raids' && (
        <Card className="p-5 bg-slate-900/80 border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-extrabold text-sm text-slate-100 flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" /> Immutable Raid Log
              </h3>
              <p className="text-[11px] text-slate-400">Sequential chronological log of every raid event in the match</p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={halfFilter}
                onChange={(e) => setHalfFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value) as 1 | 2)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 outline-none"
              >
                <option value="ALL">All Halves</option>
                <option value="1">1st Half Only</option>
                <option value="2">2nd Half Only</option>
              </select>

              <select
                value={raidFilter}
                onChange={(e) => setRaidFilter(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 outline-none"
              >
                <option value="ALL">All Outcomes</option>
                <option value="SUPER_RAID">Super Raids Only</option>
                <option value="SUPER_TACKLE">Super Tackles Only</option>
                <option value="DO_OR_DIE">Do-or-Die Only</option>
                <option value="BONUS">Bonus Points</option>
              </select>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search raider..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 outline-none w-36 sm:w-48"
                />
              </div>
            </div>
          </div>

          {filteredRaids.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No raids match the selected filter criteria.</p>
          ) : (
            <div className="space-y-2">
              {filteredRaids.map((raid) => {
                const raider = report.playerStats.find((p) => p.playerId === raid.raiderPlayerId);
                const isTeamA = raid.raidingTeamId === match.teamAId;

                return (
                  <div
                    key={raid.id}
                    className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs flex items-center justify-between hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-slate-800 font-mono font-black text-[11px] flex items-center justify-center text-slate-300 shrink-0">
                        #{raid.raidNumber}
                      </span>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-200">
                            {raider ? raider.playerName : 'Unknown Raider'}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              isTeamA ? 'bg-amber-500/20 text-amber-300' : 'bg-sky-500/20 text-sky-300'
                            }`}
                          >
                            {isTeamA ? teamA?.name : teamB?.name}
                          </span>

                          {raid.isDoOrDie && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold text-[9px]">
                              DOD
                            </span>
                          )}
                          {raid.isSuperRaid && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[9px]">
                              SUPER RAID
                            </span>
                          )}
                          {raid.isSuperTackle && (
                            <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold text-[9px]">
                              SUPER TACKLE
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-400">
                          Outcome: <span className="font-semibold text-slate-200">{raid.outcome}</span> • Touch:{' '}
                          {raid.touchPoints} | Bonus: {raid.bonusPoints} | Tackle: {raid.tacklePoints}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-black font-mono text-amber-400">
                        {raid.scoreA_after} - {raid.scoreB_after}
                      </span>
                      <p className="text-[10px] text-slate-500">Half {raid.half}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* TAB 5: MATCH AWARDS */}
      {activeTab === 'awards' && (
        <Card className="p-5 bg-slate-900/80 border-slate-800 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-extrabold text-sm text-slate-100 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" /> Official Kabaddi Match Awards
              </h3>
              <p className="text-[11px] text-slate-400">AI-suggested algorithm rankings with admin override capabilities</p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setEditingAwards((prev) => !prev)}
                className="text-xs font-bold bg-slate-800 hover:bg-slate-700"
              >
                {editingAwards ? 'Cancel Edit' : 'Edit Awards'}
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleTriggerBroadcast('MATCH_AWARDS', { awards: report.selectedManOfMatch })}
                className="bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-bold"
              >
                <Send className="w-3 h-3 mr-1" />
                Push Awards to Stream
              </Button>
            </div>
          </div>

          {editingAwards ? (
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Man of the Match */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Man of the Match / Player of Match</label>
                  <select
                    value={selectedMomId}
                    onChange={(e) => setSelectedMomId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 outline-none"
                  >
                    <option value="">Select player...</option>
                    {report.playerStats.map((p) => (
                      <option key={p.playerId} value={p.playerId}>
                        {p.playerName} ({p.teamName}) - {p.totalPoints} Total Pts
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reason */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Citation / Performance Reason</label>
                  <input
                    type="text"
                    value={momReason}
                    onChange={(e) => setMomReason(e.target.value)}
                    placeholder="e.g. 14 raid points including 2 super raids and crucial tackle"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 outline-none"
                  />
                </div>

                {/* Best Raider */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Best Raider</label>
                  <select
                    value={selectedRaiderId}
                    onChange={(e) => setSelectedRaiderId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 outline-none"
                  >
                    <option value="">Select best raider...</option>
                    {report.playerStats.map((p) => (
                      <option key={p.playerId} value={p.playerId}>
                        {p.playerName} ({p.teamName}) - {p.totalRaidPoints} Raid Pts
                      </option>
                    ))}
                  </select>
                </div>

                {/* Best Defender */}
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Best Defender</label>
                  <select
                    value={selectedDefenderId}
                    onChange={(e) => setSelectedDefenderId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 outline-none"
                  >
                    <option value="">Select best defender...</option>
                    {report.playerStats.map((p) => (
                      <option key={p.playerId} value={p.playerId}>
                        {p.playerName} ({p.teamName}) - {p.totalTacklePoints} Tackle Pts
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" size="sm" onClick={() => setEditingAwards(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" loading={savingAwards} onClick={handleSaveAwards}>
                  Save Awards
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Man of the Match Card */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 space-y-2">
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                  🏆 MAN OF THE MATCH
                </span>
                <h4 className="text-base font-extrabold text-slate-100">
                  {report.selectedManOfMatch?.playerName || report.suggestedManOfMatch?.playerName || 'Not Assigned'}
                </h4>
                <p className="text-xs text-amber-300 font-semibold">
                  {report.selectedManOfMatch?.details || report.suggestedManOfMatch?.details || 'N/A'}
                </p>
              </div>

              {/* Best Raider */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">
                  ⚡ BEST RAIDER
                </span>
                <h4 className="text-base font-extrabold text-slate-100">
                  {report.selectedBestRaider?.playerName || report.suggestedBestRaider?.playerName || 'Not Assigned'}
                </h4>
                <p className="text-xs text-slate-400">
                  {report.selectedBestRaider?.details || report.suggestedBestRaider?.details || 'N/A'}
                </p>
              </div>

              {/* Best Defender */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <span className="text-[10px] font-black uppercase text-sky-400 tracking-wider">
                  🛡️ BEST DEFENDER
                </span>
                <h4 className="text-base font-extrabold text-slate-100">
                  {report.selectedBestDefender?.playerName || report.suggestedBestDefender?.playerName || 'Not Assigned'}
                </h4>
                <p className="text-xs text-slate-400">
                  {report.selectedBestDefender?.details || report.suggestedBestDefender?.details || 'N/A'}
                </p>
              </div>

              {/* Best All-Rounder */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <span className="text-[10px] font-black uppercase text-purple-400 tracking-wider">
                  🌟 BEST ALL-ROUNDER
                </span>
                <h4 className="text-base font-extrabold text-slate-100">
                  {report.selectedBestAllRounder?.playerName || report.suggestedBestAllRounder?.playerName || 'Not Assigned'}
                </h4>
                <p className="text-xs text-slate-400">
                  {report.selectedBestAllRounder?.details || report.suggestedBestAllRounder?.details || 'N/A'}
                </p>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* TAB 6: SQUADS & LINE-UPS */}
      {activeTab === 'squads' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Team A Squad */}
          <Card className="p-5 bg-slate-900/80 border-slate-800 space-y-3">
            <h3 className="font-extrabold text-sm text-amber-400 flex items-center gap-2 border-b border-slate-800 pb-2">
              <Shield className="w-4 h-4" /> {teamA?.name} Squad
            </h3>
            <div className="space-y-1.5 text-xs">
              {report.squadA.map((player) => (
                <div
                  key={player.id}
                  className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-slate-800 text-[10px] font-bold flex items-center justify-center">
                      #{player.jerseyNumber || '-'}
                    </span>
                    <span className="font-semibold text-slate-200">{player.name}</span>
                    <span className="text-[10px] text-slate-500">({player.role || 'Player'})</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400">
                    {player.isPlaying ? 'STARTING 7' : 'BENCH'}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Team B Squad */}
          <Card className="p-5 bg-slate-900/80 border-slate-800 space-y-3">
            <h3 className="font-extrabold text-sm text-sky-400 flex items-center gap-2 border-b border-slate-800 pb-2">
              <Shield className="w-4 h-4" /> {teamB?.name} Squad
            </h3>
            <div className="space-y-1.5 text-xs">
              {report.squadB.map((player) => (
                <div
                  key={player.id}
                  className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-slate-800 text-[10px] font-bold flex items-center justify-center">
                      #{player.jerseyNumber || '-'}
                    </span>
                    <span className="font-semibold text-slate-200">{player.name}</span>
                    <span className="text-[10px] text-slate-500">({player.role || 'Player'})</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/10 text-sky-400">
                    {player.isPlaying ? 'STARTING 7' : 'BENCH'}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
