import React, { useState } from 'react';
import { CustomSportMatchReport, Player } from '../../types';
import { api } from '../../services/api';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
import {
  Trophy,
  Award,
  Calendar,
  Clock,
  MapPin,
  Users,
  Shield,
  CheckCircle2,
  Lock,
  Unlock,
  Printer,
  ChevronRight,
  Flame,
  Layers,
  BarChart2,
  Sliders,
  Edit2,
} from 'lucide-react';

export interface CustomSportMatchReportViewProps {
  report: CustomSportMatchReport;
  onRefresh?: () => void;
  isAdmin?: boolean;
}

export const CustomSportMatchReportView: React.FC<CustomSportMatchReportViewProps> = ({
  report,
  onRefresh,
  isAdmin = true,
}) => {
  const { match, summary, periodScores, playerStats, awards, customStatistics, timeline, officials, isFinalized } =
    report;

  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [selectedAwardIndex, setSelectedAwardIndex] = useState<number | null>(null);
  const [overridePlayerId, setOverridePlayerId] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Filter timeline
  const [timelinePeriodFilter, setTimelinePeriodFilter] = useState<number | 'ALL'>('ALL');

  const allPlayers: Player[] = [
    ...(match.teamAPlayers || []),
    ...(match.teamBPlayers || []),
  ];

  const handleOpenAwardOverride = (awardIndex: number) => {
    const currentAward = awards[awardIndex];
    setSelectedAwardIndex(awardIndex);
    setOverridePlayerId(currentAward?.recipientId || '');
    setOverrideReason(currentAward?.reason || '');
    setIsOverrideModalOpen(true);
  };

  const handleSaveAwardOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAwardIndex === null) return;
    setActionLoading(true);

    try {
      const selectedPlayer = allPlayers.find((p) => p.id === overridePlayerId);
      const updatedAwards = [...awards];
      updatedAwards[selectedAwardIndex] = {
        ...updatedAwards[selectedAwardIndex],
        recipientId: overridePlayerId,
        recipientName: selectedPlayer?.name || 'Selected Player',
        reason: overrideReason,
        isOverridden: true,
      };

      await api.saveMatchAwards(match.id, {
        playerOfTheMatchId: updatedAwards[0]?.recipientId,
        playerOfTheMatchReason: updatedAwards[0]?.reason,
        customAwards: updatedAwards,
      });

      setIsOverrideModalOpen(false);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to override award.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinalizeToggle = async () => {
    const action = isFinalized ? 'reopen' : 'finalize';
    if (
      !window.confirm(
        isFinalized
          ? 'Reopen this match report for editing?'
          : 'Finalize and lock this match report? Official results will become immutable.'
      )
    ) {
      return;
    }

    setActionLoading(true);
    try {
      if (isFinalized) {
        await api.reopenMatchReport(match.id);
      } else {
        await api.finalizeMatchReport(match.id);
      }
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || `Failed to ${action} match report.`);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredTimeline = timeline.filter((event) => {
    if (timelinePeriodFilter === 'ALL') return true;
    return event.period === timelinePeriodFilter;
  });

  return (
    <div className="space-y-8 print:space-y-4 print:text-black">
      {/* Action Header (Web only) */}
      <div className="flex items-center justify-between gap-4 bg-zinc-900 border border-white/10 rounded-2xl p-4 print:hidden">
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Sliders className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-white">Official Match Report</h2>
            <p className="text-xs text-zinc-400">
              {match.customSportConfig?.name || match.sport} • {isFinalized ? 'Finalized & Verified' : 'Draft / Live'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => window.print()}
            className="text-xs text-zinc-300 hover:text-white gap-1.5"
          >
            <Printer className="w-4 h-4" /> Print Report
          </Button>

          {isAdmin && (
            <Button
              onClick={handleFinalizeToggle}
              disabled={actionLoading}
              className={`text-xs gap-1.5 font-bold ${
                isFinalized
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isFinalized ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              {isFinalized ? 'Reopen Report' : 'Finalize Report'}
            </Button>
          )}
        </div>
      </div>

      {/* Official Match Banner */}
      <div className="bg-zinc-900/90 border border-white/10 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl print:border-black print:bg-white print:p-4">
        {/* Finalized Badge */}
        {isFinalized && (
          <div className="absolute top-4 right-4 px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-bold flex items-center gap-1.5 print:border-green-800 print:text-green-800">
            <CheckCircle2 className="w-3.5 h-3.5" /> OFFICIAL FINAL RESULT
          </div>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-zinc-400 mb-6 print:text-gray-600">
          <span className="font-bold text-amber-400 uppercase tracking-wider">{match.tournament?.name || 'Tournament'}</span>
          <span>•</span>
          <span>Match #{match.matchNumber || '1'}</span>
          <span>•</span>
          <span>{match.round || 'Round'}</span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> {match.date || 'Date'}
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" /> {match.venue || 'Venue'}
          </span>
        </div>

        {/* Scoreboard Result Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 my-4">
          <div className="flex-1 text-center sm:text-left">
            <div className="text-xs uppercase font-bold text-zinc-500 tracking-wider">Home</div>
            <h3 className="text-2xl sm:text-3xl font-black text-white print:text-black">
              {match.teamA?.name || 'Team A'}
            </h3>
          </div>

          <div className="flex items-center gap-6 px-8 py-3 bg-zinc-800/80 border border-white/10 rounded-2xl print:bg-gray-100 print:border-gray-300">
            <span className="text-4xl sm:text-5xl font-black text-white font-mono print:text-black">
              {summary.finalScoreA}
            </span>
            <span className="text-2xl text-zinc-500 font-bold">:</span>
            <span className="text-4xl sm:text-5xl font-black text-white font-mono print:text-black">
              {summary.finalScoreB}
            </span>
          </div>

          <div className="flex-1 text-center sm:text-right">
            <div className="text-xs uppercase font-bold text-zinc-500 tracking-wider">Away</div>
            <h3 className="text-2xl sm:text-3xl font-black text-white print:text-black">
              {match.teamB?.name || 'Team B'}
            </h3>
          </div>
        </div>

        {/* Winner Callout */}
        <div className="mt-6 text-center">
          <div className="inline-block px-5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold text-sm shadow-inner print:border-amber-700 print:text-amber-800">
            🏆 {summary.resultOutcome}
          </div>
        </div>
      </div>

      {/* Period-by-Period Score Breakdown */}
      {periodScores && periodScores.length > 0 && (
        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 print:border-black print:bg-white">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2 print:text-black">
            <Layers className="w-4 h-4 text-amber-400" /> Period Score Breakdown
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-zinc-400 print:border-gray-300 print:text-gray-700">
                  <th className="py-2.5 px-3 font-semibold">Team</th>
                  {periodScores.map((p) => (
                    <th key={p.period} className="py-2.5 px-3 font-semibold text-center">
                      {p.periodName || `P${p.period}`}
                    </th>
                  ))}
                  <th className="py-2.5 px-3 font-bold text-amber-400 text-center">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 print:divide-gray-200">
                <tr className="hover:bg-zinc-800/40">
                  <td className="py-3 px-3 font-bold text-white print:text-black">{match.teamA?.name}</td>
                  {periodScores.map((p) => (
                    <td key={p.period} className="py-3 px-3 text-center font-mono text-zinc-300 print:text-black">
                      {p.scoreA}
                    </td>
                  ))}
                  <td className="py-3 px-3 text-center font-mono font-black text-amber-400 text-sm">
                    {summary.finalScoreA}
                  </td>
                </tr>
                <tr className="hover:bg-zinc-800/40">
                  <td className="py-3 px-3 font-bold text-white print:text-black">{match.teamB?.name}</td>
                  {periodScores.map((p) => (
                    <td key={p.period} className="py-3 px-3 text-center font-mono text-zinc-300 print:text-black">
                      {p.scoreB}
                    </td>
                  ))}
                  <td className="py-3 px-3 text-center font-mono font-black text-amber-400 text-sm">
                    {summary.finalScoreB}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Official Match Awards */}
      {awards && awards.length > 0 && (
        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 print:border-black print:bg-white space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 print:text-black">
              <Award className="w-4 h-4 text-amber-400" /> Match Awards & Honors
            </h3>
            <span className="text-xs text-zinc-400 print:hidden">Auto-calculated with Admin Override</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {awards.map((award, idx) => (
              <div
                key={award.awardId || idx}
                className="p-4 rounded-2xl bg-zinc-800/80 border border-white/10 hover:border-amber-500/40 transition-all relative group print:bg-gray-50 print:border-gray-300"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-2xl p-1.5 rounded-xl bg-zinc-900 border border-white/10">
                    {award.icon || '🏆'}
                  </span>
                  {isAdmin && !isFinalized && (
                    <button
                      onClick={() => handleOpenAwardOverride(idx)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 print:hidden"
                      title="Override Award"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>
                  )}
                </div>

                <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">{award.name}</div>
                <div className="text-base font-extrabold text-white mt-0.5 print:text-black">
                  {award.recipientName || 'Unassigned'}
                </div>
                <div className="text-xs text-zinc-400 mt-1 leading-relaxed print:text-gray-600">
                  {award.reason || 'Outstanding match contribution'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Individual Player Performance Statistics Table */}
      <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 print:border-black print:bg-white">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2 print:text-black">
          <BarChart2 className="w-4 h-4 text-amber-400" /> Individual Player Performance
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-zinc-400 print:border-gray-300 print:text-gray-700">
                <th className="py-2.5 px-3 font-semibold">Player</th>
                <th className="py-2.5 px-3 font-semibold">Team</th>
                <th className="py-2.5 px-3 font-semibold text-center">Points</th>
                <th className="py-2.5 px-3 font-semibold text-center">Events Logged</th>
                {(customStatistics || []).map((cs) => (
                  <th key={cs.id} className="py-2.5 px-3 font-semibold text-center">
                    {cs.shortCode || cs.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 print:divide-gray-200">
              {(!playerStats || playerStats.length === 0) ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-zinc-500">
                    No individual player stats recorded for this match.
                  </td>
                </tr>
              ) : (
                [...playerStats]
                  .sort((a, b) => b.pointsTotal - a.pointsTotal)
                  .map((p) => (
                    <tr key={p.playerId} className="hover:bg-zinc-800/40">
                      <td className="py-2.5 px-3 font-bold text-white print:text-black">{p.playerName}</td>
                      <td className="py-2.5 px-3 text-zinc-400 print:text-gray-600">{p.teamName}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-400">{p.pointsTotal}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-zinc-300 print:text-black">
                        {p.eventsCount}
                      </td>
                      {(customStatistics || []).map((cs) => (
                        <td key={cs.id} className="py-2.5 px-3 text-center font-mono text-zinc-300 print:text-black">
                          {p.customStats?.[cs.id] ?? 0}
                        </td>
                      ))}
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Chronological Event Timeline */}
      <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 print:border-black print:bg-white space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 print:text-black">
            <Flame className="w-4 h-4 text-amber-400" /> Chronological Event Timeline
          </h3>

          <div className="flex items-center gap-2 print:hidden">
            <span className="text-xs text-zinc-400">Filter Period:</span>
            <select
              value={timelinePeriodFilter}
              onChange={(e) => setTimelinePeriodFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              className="bg-zinc-800 border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
            >
              <option value="ALL">All Periods</option>
              {periodScores?.map((p) => (
                <option key={p.period} value={p.period}>
                  {p.periodName || `Period ${p.period}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {filteredTimeline.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-xs">
              No events found for this filter.
            </div>
          ) : (
            filteredTimeline.map((ev) => (
              <div
                key={ev.id}
                className="p-3 bg-zinc-800/60 border border-white/5 rounded-xl flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-zinc-500">[{ev.clockDisplay || '00:00'}]</span>
                  <span className="font-bold text-white print:text-black">{ev.eventName}</span>
                  <span className="font-mono font-bold text-amber-400">
                    ({ev.points >= 0 ? `+${ev.points}` : ev.points}p)
                  </span>
                  <span className="text-zinc-400">• {ev.teamName}</span>
                  {ev.playerName && <span className="text-zinc-300 font-semibold">({ev.playerName})</span>}
                  {ev.description && <span className="text-zinc-500 italic">- {ev.description}</span>}
                </div>

                <div className="font-mono font-bold text-zinc-300 bg-zinc-900 px-2 py-0.5 rounded print:bg-gray-100 print:text-black">
                  {ev.scoreA_after} - {ev.scoreB_after}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Match Officials & Audit Signatures */}
      {officials && officials.length > 0 && (
        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 print:border-black print:bg-white">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2 print:text-black">
            <Shield className="w-4 h-4 text-amber-400" /> Match Officials & Validation
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            {officials.map((off, idx) => (
              <div key={idx} className="p-3 bg-zinc-800/40 rounded-xl border border-white/5 print:border-gray-200">
                <div className="text-zinc-400 font-semibold">{off.role}</div>
                <div className="font-bold text-white mt-0.5 print:text-black">{off.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Award Override Modal */}
      {isOverrideModalOpen && selectedAwardIndex !== null && (
        <Dialog
          isOpen={isOverrideModalOpen}
          onClose={() => setIsOverrideModalOpen(false)}
          title={`Override Award: ${awards[selectedAwardIndex]?.name}`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleSaveAwardOverride} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                Recipient Player
              </label>
              <select
                value={overridePlayerId}
                onChange={(e) => setOverridePlayerId(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-500"
                required
              >
                <option value="">-- Select Recipient --</option>
                {allPlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.teamId === match.teamAId ? match.teamA?.name : match.teamB?.name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                Official Citation / Reason
              </label>
              <Input
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="e.g., Match-winning 4th quarter scoring run"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <Button type="button" variant="secondary" onClick={() => setIsOverrideModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={actionLoading} className="bg-amber-500 text-black font-bold">
                Save Override
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
};
