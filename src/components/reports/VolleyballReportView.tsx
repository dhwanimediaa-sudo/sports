import React, { useState } from 'react';
import { VolleyballMatchReport, VolleyballPlayerStats } from '../../types';
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
} from 'lucide-react';

export interface VolleyballReportViewProps {
  report: VolleyballMatchReport;
  onRefresh: () => void;
}

export const VolleyballReportView: React.FC<VolleyballReportViewProps> = ({ report, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'scorecard' | 'player_stats' | 'team_stats' | 'rallies' | 'awards' | 'squads'>('scorecard');

  // Awards Editing State
  const [editingAwards, setEditingAwards] = useState(false);
  const [selectedPomId, setSelectedPomId] = useState(
    report.selectedPlayerOfMatch?.playerId || report.suggestedPlayerOfMatch?.playerId || ''
  );
  const [pomReason, setPomReason] = useState(
    report.selectedPlayerOfMatch?.details || report.suggestedPlayerOfMatch?.details || ''
  );
  const [selectedAttackerId, setSelectedAttackerId] = useState(
    report.selectedBestAttacker?.playerId || report.suggestedBestAttacker?.playerId || ''
  );
  const [selectedBlockerId, setSelectedBlockerId] = useState(
    report.selectedBestBlocker?.playerId || report.suggestedBestBlocker?.playerId || ''
  );
  const [selectedServerId, setSelectedServerId] = useState(
    report.selectedBestServer?.playerId || report.suggestedBestServer?.playerId || ''
  );
  const [selectedDefenderId, setSelectedDefenderId] = useState(
    report.selectedBestDefender?.playerId || report.suggestedBestDefender?.playerId || ''
  );
  const [savingAwards, setSavingAwards] = useState(false);

  // Finalization State
  const [finalizing, setFinalizing] = useState(false);
  const [reopening, setReopening] = useState(false);

  // Rally Filter
  const [rallyFilter, setRallyFilter] = useState<'ALL' | 'ATTACK_POINT' | 'SERVICE_ACE' | 'BLOCK_POINT' | 'ERROR'>('ALL');
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
        playerOfTheMatchId: selectedPomId,
        playerOfTheMatchReason: pomReason,
        bestAttackerId: selectedAttackerId,
        bestBlockerId: selectedBlockerId,
        bestServerId: selectedServerId,
        bestDefenderId: selectedDefenderId,
      } as any);
      showToast('Volleyball match awards saved successfully!');
      setEditingAwards(false);
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to save awards.', 'error');
    } finally {
      setSavingAwards(false);
    }
  };

  const handleFinalize = async () => {
    setFinalizing(true);
    try {
      await api.finalizeMatchReport(report.match.id);
      showToast('Volleyball match report finalized and locked.');
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to finalize report.', 'error');
    } finally {
      setFinalizing(false);
    }
  };

  const handleReopen = async () => {
    if (!window.confirm('Are you sure you want to reopen this finalized report for editing?')) return;
    setReopening(true);
    try {
      await api.reopenMatchReport(report.match.id);
      showToast('Match report reopened for edits.');
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to reopen report.', 'error');
    } finally {
      setReopening(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredRallies = report.rallies.filter((r) => {
    if (rallyFilter === 'ATTACK_POINT' && r.pointType !== 'ATTACK_POINT') return false;
    if (rallyFilter === 'SERVICE_ACE' && r.pointType !== 'SERVICE_ACE') return false;
    if (rallyFilter === 'BLOCK_POINT' && r.pointType !== 'BLOCK_POINT') return false;
    if (rallyFilter === 'ERROR' && !r.pointType.includes('ERROR') && !r.pointType.includes('VIOLATION') && !r.pointType.includes('FAULT')) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchPlayer = r.player?.name?.toLowerCase().includes(q);
      const matchType = r.pointType.toLowerCase().includes(q);
      if (!matchPlayer && !matchType) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5 print:space-y-3">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl border text-xs font-semibold flex items-center gap-2 ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50'
              : 'bg-rose-950/90 text-rose-300 border-rose-500/50'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* HEADER BANNER WITH METADATA & ACTIONS */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 shadow-xl space-y-4 print:p-2 print:border-none">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider">
                VOLLEYBALL FULL MATCH REPORT
              </span>
              {report.isFinalized ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                  <Lock className="w-3 h-3" /> OFFICIAL & FINALIZED
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1">
                  <Unlock className="w-3 h-3" /> DRAFT / LIVE SYNCED
                </span>
              )}
            </div>
            <h1 className="text-xl font-black text-slate-100">{report.match.name}</h1>
            <p className="text-xs text-slate-400">
              {report.match.tournament?.name} • {report.match.round} • Venue: {report.match.venue} • {report.match.date}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 print:hidden">
            <Button variant="secondary" size="sm" onClick={handlePrint} icon={<Printer className="w-4 h-4" />}>
              Print Report
            </Button>
            {report.isFinalized ? (
              <Button variant="secondary" size="sm" onClick={handleReopen} loading={reopening} icon={<Unlock className="w-4 h-4 text-amber-400" />}>
                Reopen Report
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={handleFinalize} loading={finalizing} icon={<Lock className="w-4 h-4" />}>
                Finalize & Lock
              </Button>
            )}
          </div>
        </div>

        {/* SUMMARY CARDS GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Match Result</p>
            <p className="text-sm font-black text-emerald-400">{report.matchResultText}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Sets Breakdown</p>
            <p className="text-sm font-black text-slate-200 font-mono">
              {report.summaryCards.teamASets} - {report.summaryCards.teamBSets} Sets
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Top Scorer</p>
            <p className="text-xs font-bold text-amber-300 truncate">{report.summaryCards.highestScorerText}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Best Blocker</p>
            <p className="text-xs font-bold text-sky-300 truncate">{report.summaryCards.bestBlockerText}</p>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-xl border border-slate-800 overflow-x-auto print:hidden">
        <button
          type="button"
          onClick={() => setActiveTab('scorecard')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'scorecard'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <FileText className="w-3.5 h-3.5" /> Set Scorecard
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('player_stats')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'player_stats'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" /> Player Statistics
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('team_stats')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'team_stats'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Shield className="w-3.5 h-3.5" /> Team Comparison
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rallies')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'rallies'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Activity className="w-3.5 h-3.5" /> Rally Event Log
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('awards')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'awards'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" /> Match Awards
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('squads')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'squads'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Users className="w-3.5 h-3.5" /> Rosters & Rotations
        </button>
      </div>

      {/* TAB 1: SET-BY-SET SCORECARD */}
      {activeTab === 'scorecard' && (
        <div className="space-y-4">
          <Card className="p-4 bg-slate-900/90 border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
              <FileText className="w-4 h-4 text-emerald-400" /> Official Set-by-Set Scorecard
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Set</th>
                    <th className="py-2.5 px-3">{report.teamA.name}</th>
                    <th className="py-2.5 px-3">{report.teamB.name}</th>
                    <th className="py-2.5 px-3">Winning Margin</th>
                    <th className="py-2.5 px-3">Winner</th>
                    <th className="py-2.5 px-3">Duration</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {report.sets.map((set) => {
                    const isAWinner = set.teamAScore > set.teamBScore;
                    return (
                      <tr key={set.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-slate-200 font-sans">Set {set.setNumber}</td>
                        <td className={`py-2.5 px-3 font-black text-sm ${isAWinner ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
                          {set.teamAScore}
                        </td>
                        <td className={`py-2.5 px-3 font-black text-sm ${!isAWinner && set.isCompleted ? 'text-sky-400 font-bold' : 'text-slate-300'}`}>
                          {set.teamBScore}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">
                          {Math.abs(set.teamAScore - set.teamBScore)} pts
                        </td>
                        <td className="py-2.5 px-3 font-sans font-bold">
                          {set.isCompleted ? (
                            <span className={isAWinner ? 'text-emerald-400' : 'text-sky-400'}>
                              {isAWinner ? report.teamA.name : report.teamB.name}
                            </span>
                          ) : (
                            <span className="text-amber-400 font-normal">In Progress</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 font-sans">{set.durationMinutes || '—'} min</td>
                        <td className="py-2.5 px-3 font-sans">
                          {set.isCompleted ? (
                            <Badge variant="success" className="text-[10px]">Completed</Badge>
                          ) : (
                            <Badge variant="warning" className="text-[10px]">Live</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-slate-950 font-bold text-slate-100 font-sans border-t-2 border-slate-700">
                    <td className="py-3 px-3 uppercase text-[10px]">Total Match Points</td>
                    <td className="py-3 px-3 text-emerald-400 font-mono font-black text-sm">{report.teamAStats.totalPoints} pts</td>
                    <td className="py-3 px-3 text-sky-400 font-mono font-black text-sm">{report.teamBStats.totalPoints} pts</td>
                    <td className="py-3 px-3 text-slate-400 font-mono">{Math.abs(report.teamAStats.totalPoints - report.teamBStats.totalPoints)} pts</td>
                    <td className="py-3 px-3 text-emerald-400">{report.summaryCards.winnerName || '—'}</td>
                    <td className="py-3 px-3 text-slate-400">{report.matchDurationMinutes || '—'} min</td>
                    <td className="py-3 px-3">
                      <Badge variant={report.isCompleted ? 'success' : 'warning'} className="text-[10px]">
                        {report.isCompleted ? 'Final' : 'In Progress'}
                      </Badge>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: PLAYER STATISTICS */}
      {activeTab === 'player_stats' && (
        <div className="space-y-4">
          {/* Team A Players */}
          <Card className="p-4 bg-slate-900/90 border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
              <Shield className="w-4 h-4" /> {report.teamA.name} — Player Performance Table
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Player</th>
                    <th className="py-2.5 px-3 text-center">Spike Kills</th>
                    <th className="py-2.5 px-3 text-center">Block Kills</th>
                    <th className="py-2.5 px-3 text-center">Service Aces</th>
                    <th className="py-2.5 px-3 text-center">Digs / Saves</th>
                    <th className="py-2.5 px-3 text-center font-black text-emerald-400">Total Points</th>
                    <th className="py-2.5 px-3 text-center">Kill %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {report.playerStats
                    .filter((p) => p.teamId === report.teamA.id)
                    .map((stat) => (
                      <tr key={stat.playerId} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2 px-3 font-sans">
                          <span className="font-bold text-slate-200">{stat.playerName}</span>
                          <span className="text-slate-500 text-[10px] ml-1.5">
                            {stat.jerseyNumber ? `(#${stat.jerseyNumber})` : ''} • {stat.role}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center text-slate-200">{stat.attackPoints}</td>
                        <td className="py-2 px-3 text-center text-slate-200">{stat.blockPoints}</td>
                        <td className="py-2 px-3 text-center text-slate-200">{stat.serviceAces}</td>
                        <td className="py-2 px-3 text-center text-slate-200">{stat.digs}</td>
                        <td className="py-2 px-3 text-center font-black text-emerald-400 text-sm">{stat.totalPoints}</td>
                        <td className="py-2 px-3 text-center text-slate-400">{stat.attackEfficiency}%</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Team B Players */}
          <Card className="p-4 bg-slate-900/90 border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
              <Shield className="w-4 h-4" /> {report.teamB.name} — Player Performance Table
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Player</th>
                    <th className="py-2.5 px-3 text-center">Spike Kills</th>
                    <th className="py-2.5 px-3 text-center">Block Kills</th>
                    <th className="py-2.5 px-3 text-center">Service Aces</th>
                    <th className="py-2.5 px-3 text-center">Digs / Saves</th>
                    <th className="py-2.5 px-3 text-center font-black text-sky-400">Total Points</th>
                    <th className="py-2.5 px-3 text-center">Kill %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {report.playerStats
                    .filter((p) => p.teamId === report.teamB.id)
                    .map((stat) => (
                      <tr key={stat.playerId} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2 px-3 font-sans">
                          <span className="font-bold text-slate-200">{stat.playerName}</span>
                          <span className="text-slate-500 text-[10px] ml-1.5">
                            {stat.jerseyNumber ? `(#${stat.jerseyNumber})` : ''} • {stat.role}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center text-slate-200">{stat.attackPoints}</td>
                        <td className="py-2 px-3 text-center text-slate-200">{stat.blockPoints}</td>
                        <td className="py-2 px-3 text-center text-slate-200">{stat.serviceAces}</td>
                        <td className="py-2 px-3 text-center text-slate-200">{stat.digs}</td>
                        <td className="py-2 px-3 text-center font-black text-sky-400 text-sm">{stat.totalPoints}</td>
                        <td className="py-2 px-3 text-center text-slate-400">{stat.attackEfficiency}%</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: TEAM COMPARISON STATS */}
      {activeTab === 'team_stats' && (
        <Card className="p-4 bg-slate-900/90 border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
            <BarChart2 className="w-4 h-4 text-emerald-400" /> Team Statistical Breakdown
          </h3>

          <div className="space-y-3 max-w-xl mx-auto py-2">
            {[
              { label: 'Total Sets Won', valA: report.teamAStats.setsWon, valB: report.teamBStats.setsWon },
              { label: 'Total Points Scored', valA: report.teamAStats.totalPoints, valB: report.teamBStats.totalPoints },
              { label: 'Spike / Attack Kills', valA: report.teamAStats.attackPoints, valB: report.teamBStats.attackPoints },
              { label: 'Stuff Block Points', valA: report.teamAStats.blockPoints, valB: report.teamBStats.blockPoints },
              { label: 'Service Aces', valA: report.teamAStats.serviceAces, valB: report.teamBStats.serviceAces },
              { label: 'Opponent Errors Capitalized', valA: report.teamAStats.opponentErrors, valB: report.teamBStats.opponentErrors },
              { label: 'Timeouts Used', valA: report.teamAStats.timeoutsUsed, valB: report.teamBStats.timeoutsUsed },
              { label: 'Substitutions Made', valA: report.teamAStats.substitutionsUsed, valB: report.teamBStats.substitutionsUsed },
            ].map((row, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-emerald-400">{row.valA}</span>
                  <span className="text-slate-400 text-[11px] uppercase">{row.label}</span>
                  <span className="text-sky-400">{row.valB}</span>
                </div>
                <div className="h-2 bg-slate-950 rounded-full flex overflow-hidden border border-slate-800">
                  <div
                    className="bg-emerald-500 transition-all"
                    style={{ width: `${(row.valA / (row.valA + row.valB || 1)) * 100}%` }}
                  />
                  <div
                    className="bg-sky-500 transition-all"
                    style={{ width: `${(row.valB / (row.valA + row.valB || 1)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* TAB 4: RALLY EVENT LOG */}
      {activeTab === 'rallies' && (
        <Card className="p-4 bg-slate-900/90 border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" /> Sequential Rally Log ({filteredRallies.length})
            </h3>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[10px]">
                {(['ALL', 'ATTACK_POINT', 'SERVICE_ACE', 'BLOCK_POINT', 'ERROR'] as const).map((flt) => (
                  <button
                    key={flt}
                    onClick={() => setRallyFilter(flt)}
                    className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                      rallyFilter === flt ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {flt.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Search player or event..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
            {filteredRallies.map((rally) => {
              const isTeamA = rally.pointWinner === report.teamA.id;
              return (
                <div
                  key={rally.id}
                  className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-slate-900 border border-slate-700 text-slate-300 font-mono text-[10px] font-bold flex items-center justify-center">
                      #{rally.rallyNumber}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black ${
                        isTeamA
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                      }`}
                    >
                      {isTeamA ? report.teamA.name : report.teamB.name}
                    </span>
                    <span className="text-slate-200 font-medium">
                      {rally.pointType.replace(/_/g, ' ')}
                      {rally.player && <strong className="text-amber-300 ml-1">({rally.player.name})</strong>}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono font-black text-slate-200">
                      {rally.scoreAfter.teamA} - {rally.scoreAfter.teamB}
                    </span>
                    <span className="text-[10px] text-slate-500">Set {rally.setNumber}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* TAB 5: MATCH AWARDS */}
      {activeTab === 'awards' && (
        <Card className="p-4 bg-slate-900/90 border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" /> Match Awards & Honors
            </h3>
            {!report.isFinalized && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setEditingAwards(!editingAwards)}
                className="text-xs"
              >
                {editingAwards ? 'Cancel Editing' : 'Edit / Override Awards'}
              </Button>
            )}
          </div>

          {editingAwards ? (
            <div className="space-y-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-amber-400 mb-1">Player of the Match</label>
                  <select
                    value={selectedPomId}
                    onChange={(e) => setSelectedPomId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs outline-none"
                  >
                    <option value="">Select Player of Match</option>
                    {report.playerStats.map((p) => (
                      <option key={p.playerId} value={p.playerId}>
                        {p.playerName} ({p.teamName}) — {p.totalPoints} pts ({p.attackPoints} Kills, {p.blockPoints} Blk, {p.serviceAces} Aces)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Award Citation / Reason</label>
                  <input
                    type="text"
                    value={pomReason}
                    onChange={(e) => setPomReason(e.target.value)}
                    placeholder="e.g. Dominant performance with 18 kills and match-winning blocks"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Best Attacker / Spiker</label>
                  <select
                    value={selectedAttackerId}
                    onChange={(e) => setSelectedAttackerId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs outline-none"
                  >
                    <option value="">Select Best Attacker</option>
                    {report.playerStats.map((p) => (
                      <option key={p.playerId} value={p.playerId}>
                        {p.playerName} ({p.teamName}) — {p.attackPoints} Kills ({p.attackEfficiency}%)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Best Blocker</label>
                  <select
                    value={selectedBlockerId}
                    onChange={(e) => setSelectedBlockerId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs outline-none"
                  >
                    <option value="">Select Best Blocker</option>
                    {report.playerStats.map((p) => (
                      <option key={p.playerId} value={p.playerId}>
                        {p.playerName} ({p.teamName}) — {p.blockPoints} Stuff Blocks
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Best Server</label>
                  <select
                    value={selectedServerId}
                    onChange={(e) => setSelectedServerId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs outline-none"
                  >
                    <option value="">Select Best Server</option>
                    {report.playerStats.map((p) => (
                      <option key={p.playerId} value={p.playerId}>
                        {p.playerName} ({p.teamName}) — {p.serviceAces} Aces
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Best Defender / Libero</label>
                  <select
                    value={selectedDefenderId}
                    onChange={(e) => setSelectedDefenderId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs outline-none"
                  >
                    <option value="">Select Best Defender</option>
                    {report.playerStats.map((p) => (
                      <option key={p.playerId} value={p.playerId}>
                        {p.playerName} ({p.teamName}) — {p.digs} Digs
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" size="sm" onClick={() => setEditingAwards(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={handleSaveAwards} loading={savingAwards} icon={<CheckCircle2 className="w-4 h-4" />}>
                  Save Awards
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Player of Match Card */}
              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-2">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <span className="text-xs font-black uppercase text-amber-300">PLAYER OF THE MATCH</span>
                </div>
                <h4 className="text-base font-black text-slate-100">
                  {report.selectedPlayerOfMatch?.playerName || report.suggestedPlayerOfMatch?.playerName || 'Not Assigned'}
                </h4>
                <p className="text-xs text-slate-400">
                  Team: <strong className="text-slate-200">{report.selectedPlayerOfMatch?.teamName || report.suggestedPlayerOfMatch?.teamName || '—'}</strong>
                </p>
                <p className="text-xs text-amber-200/80 italic">
                  {report.selectedPlayerOfMatch?.details || report.suggestedPlayerOfMatch?.details || 'Outstanding overall match performance'}
                </p>
              </div>

              {/* Best Attacker Card */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-rose-400" />
                  <span className="text-xs font-black uppercase text-rose-300">BEST ATTACKER</span>
                </div>
                <h4 className="text-base font-black text-slate-100">
                  {report.selectedBestAttacker?.playerName || report.suggestedBestAttacker?.playerName || 'Not Assigned'}
                </h4>
                <p className="text-xs text-slate-400">
                  {report.selectedBestAttacker?.details || report.suggestedBestAttacker?.details || '—'}
                </p>
              </div>

              {/* Best Blocker Card */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-sky-400" />
                  <span className="text-xs font-black uppercase text-sky-300">BEST BLOCKER</span>
                </div>
                <h4 className="text-base font-black text-slate-100">
                  {report.selectedBestBlocker?.playerName || report.suggestedBestBlocker?.playerName || 'Not Assigned'}
                </h4>
                <p className="text-xs text-slate-400">
                  {report.selectedBestBlocker?.details || report.suggestedBestBlocker?.details || '—'}
                </p>
              </div>

              {/* Best Server Card */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs font-black uppercase text-emerald-300">BEST SERVER</span>
                </div>
                <h4 className="text-base font-black text-slate-100">
                  {report.selectedBestServer?.playerName || report.suggestedBestServer?.playerName || 'Not Assigned'}
                </h4>
                <p className="text-xs text-slate-400">
                  {report.selectedBestServer?.details || report.suggestedBestServer?.details || '—'}
                </p>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* TAB 6: SQUADS & ROTATIONS */}
      {activeTab === 'squads' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4 bg-slate-900/90 border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
              <Shield className="w-4 h-4" /> {report.teamA.name} Squad & Starting 6
            </h3>
            <div className="space-y-1.5 text-xs">
              {report.teamAPlayers.map((p) => (
                <div key={p.id} className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span className="font-bold text-slate-200">
                    {p.name} {p.jerseyNumber ? `(#${p.jerseyNumber})` : ''}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">{p.role}</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4 bg-slate-900/90 border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
              <Shield className="w-4 h-4" /> {report.teamB.name} Squad & Starting 6
            </h3>
            <div className="space-y-1.5 text-xs">
              {report.teamBPlayers.map((p) => (
                <div key={p.id} className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span className="font-bold text-slate-200">
                    {p.name} {p.jerseyNumber ? `(#${p.jerseyNumber})` : ''}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">{p.role}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
