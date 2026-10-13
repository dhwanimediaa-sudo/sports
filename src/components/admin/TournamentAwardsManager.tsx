/**
 * SportsPulse - Official Tournament Awards & Honors Manager
 * 
 * Features:
 * - Deterministic sport-specific award calculation
 * - Ranked candidate leaderboard per award
 * - Transparent "Why This Player?" formula & statistical breakdown
 * - Admin override recipient with official reason & audit logging
 * - Restore algorithmic recommendation
 * - Finalize & lock / Reopen workflows
 * - Live broadcast presentation triggers
 */

import React, { useState, useEffect } from 'react';
import {
  Tournament,
  Team,
  Player,
  TournamentAwardItem,
  TournamentAwardCandidate,
  TournamentAwardAuditLog,
  TournamentPresentationEvent,
} from '../../types';
import { api } from '../../services/api';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  Trophy,
  Award,
  Sparkles,
  Shield,
  CheckCircle2,
  Lock,
  Unlock,
  RotateCcw,
  Edit3,
  Tv,
  Info,
  History,
  TrendingUp,
  Flame,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Zap,
} from 'lucide-react';

interface TournamentAwardsManagerProps {
  tournament: Tournament;
  teams: Team[];
  players: Player[];
  onOpenPresentationConsole?: () => void;
  onRefresh?: () => void;
}

export const TournamentAwardsManager: React.FC<TournamentAwardsManagerProps> = ({
  tournament,
  teams,
  players,
  onOpenPresentationConsole,
  onRefresh,
}) => {
  const [awards, setAwards] = useState<TournamentAwardItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<TournamentAwardAuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFormulaCandidate, setSelectedFormulaCandidate] = useState<{
    award: TournamentAwardItem;
    candidate: TournamentAwardCandidate;
  } | null>(null);

  // Override Modal State
  const [overrideModalAward, setOverrideModalAward] = useState<TournamentAwardItem | null>(null);
  const [selectedOverridePlayerId, setSelectedOverridePlayerId] = useState<string>('');
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [overrideCitation, setOverrideCitation] = useState<string>('');
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);

  // Audit Log Modal State
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  // Action status message
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Expanded candidates accordion per award
  const [expandedAwards, setExpandedAwards] = useState<{ [awardId: string]: boolean }>({});

  const loadAwardsData = async () => {
    try {
      setLoading(true);
      const [awardsRes, logsRes] = await Promise.all([
        api.getTournamentAwards(tournament.id),
        api.getTournamentAwardAuditLogs(tournament.id).catch(() => ({ logs: [] })),
      ]);
      setAwards(awardsRes.awards || []);
      setAuditLogs(logsRes.logs || []);
    } catch (err: any) {
      console.error('Failed to load awards:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAwardsData();
  }, [tournament.id]);

  const toggleExpandAward = (awardId: string) => {
    setExpandedAwards((prev) => ({ ...prev, [awardId]: !prev[awardId] }));
  };

  const handleOpenOverrideModal = (award: TournamentAwardItem) => {
    setOverrideModalAward(award);
    setSelectedOverridePlayerId(award.recipientPlayerId || award.recommendedPlayerId || '');
    setOverrideReason(award.overrideReason || '');
    setOverrideCitation(award.citation || '');
    setStatusMessage(null);
  };

  const handleSubmitOverride = async () => {
    if (!overrideModalAward || !selectedOverridePlayerId || !overrideReason.trim()) {
      setStatusMessage({ type: 'error', text: 'Please select a player and provide a reason for the override.' });
      return;
    }

    try {
      setOverrideSubmitting(true);
      const res = await api.overrideTournamentAward(tournament.id, {
        awardId: overrideModalAward.id,
        newPlayerId: selectedOverridePlayerId,
        reason: overrideReason.trim(),
        citation: overrideCitation.trim(),
      });
      setStatusMessage({ type: 'success', text: `Award overridden: ${res.award.recipientName}` });
      setOverrideModalAward(null);
      await loadAwardsData();
      onRefresh?.();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to override award recipient.' });
    } finally {
      setOverrideSubmitting(false);
    }
  };

  const handleRestoreRecommendation = async (award: TournamentAwardItem) => {
    if (!confirm(`Restore automatic algorithmic recommendation for "${award.title}"?`)) return;
    try {
      setLoading(true);
      await api.restoreTournamentAward(tournament.id, award.id);
      setStatusMessage({ type: 'success', text: `Restored automatic recommendation for ${award.title}.` });
      await loadAwardsData();
      onRefresh?.();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to restore recommendation.' });
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizeAwards = async () => {
    if (!confirm('Are you sure you want to FINALIZE and lock tournament awards for official broadcast presentation?')) {
      return;
    }
    try {
      setLoading(true);
      const res = await api.finalizeTournamentAwards(tournament.id);
      setStatusMessage({ type: 'success', text: 'Tournament awards officially finalized and locked!' });
      await loadAwardsData();
      onRefresh?.();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to finalize awards.' });
    } finally {
      setLoading(false);
    }
  };

  const handleReopenAwards = async () => {
    if (!confirm('Reopen tournament awards for modifications?')) return;
    try {
      setLoading(true);
      await api.reopenTournamentAwards(tournament.id);
      setStatusMessage({ type: 'success', text: 'Tournament awards unlocked for editing.' });
      await loadAwardsData();
      onRefresh?.();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to reopen awards.' });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickTriggerBroadcast = async (award: TournamentAwardItem) => {
    try {
      await api.triggerTournamentPresentation(tournament.id, {
        type: award.awardKey === 'MVP' ? 'MVP' : 'AWARD',
        data: {
          awardTitle: award.title,
          awardKey: award.awardKey,
          playerName: award.recipientName,
          teamName: award.recipientTeamName,
          photo: award.recipientPhoto,
          citation: award.citation,
          statSummary: award.recommendedStatSummary,
          awardIcon: award.awardIcon || '🏆',
          tournamentName: tournament.name,
        },
      });
      setStatusMessage({ type: 'success', text: `Sent "${award.title}" presentation to Broadcast Overlay Live!` });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to trigger broadcast presentation.' });
    }
  };

  const isAllFinalized = awards.length > 0 && awards.every((a) => a.isFinalized);

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Deck */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏆</span>
            <h2 className="text-base font-black text-slate-100 uppercase tracking-wider">
              Tournament Awards & Honors Center
            </h2>
            {isAllFinalized ? (
              <Badge variant="success" className="gap-1 font-bold">
                <Lock className="w-3 h-3" /> FINALIZED & LOCKED
              </Badge>
            ) : (
              <Badge variant="warning" className="gap-1 font-bold">
                <Unlock className="w-3 h-3" /> LIVE CALCULATING
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            Deterministic sports analytics engine calculates official Player of the Tournament, Golden honors, and category awards with complete candidate score breakdowns, audit tracking, and broadcast triggers.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAuditModalOpen(true)}
            icon={<History className="w-3.5 h-3.5 text-blue-400" />}
          >
            Audit Log ({auditLogs.length})
          </Button>

          {isAllFinalized ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleReopenAwards}
              icon={<Unlock className="w-3.5 h-3.5 text-amber-400" />}
            >
              Reopen Awards
            </Button>
          ) : (
            <Button
              variant="emerald"
              size="sm"
              onClick={handleFinalizeAwards}
              icon={<Lock className="w-3.5 h-3.5" />}
            >
              Finalize Awards
            </Button>
          )}

          {onOpenPresentationConsole && (
            <Button
              variant="amber"
              size="sm"
              onClick={onOpenPresentationConsole}
              icon={<Tv className="w-3.5 h-3.5" />}
            >
              Presentation Deck
            </Button>
          )}
        </div>
      </div>

      {/* Status Notifications */}
      {statusMessage && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-200"
          >
            ✕
          </button>
        </div>
      )}

      {/* Awards Grid */}
      {loading && awards.length === 0 ? (
        <div className="p-12 text-center text-slate-400 text-xs">
          Computing deterministic tournament awards and candidate matrix...
        </div>
      ) : awards.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/60 rounded-2xl border border-slate-800 space-y-3">
          <Trophy className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300">No Award Categories Found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Match scorecards will automatically generate award candidates as tournament fixtures progress.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {awards.map((award) => {
            const isExpanded = !!expandedAwards[award.id];
            const isOverridden = award.isOverridden;
            const topCandidate = award.candidates?.[0];

            return (
              <div
                key={award.id}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  award.awardKey === 'MVP'
                    ? 'bg-gradient-to-b from-amber-950/20 via-slate-900 to-slate-950 border-amber-500/40 shadow-xl'
                    : isOverridden
                    ? 'bg-slate-900/90 border-blue-500/40'
                    : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Award Header */}
                <div className="p-4 border-b border-slate-800/80 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-xl shrink-0">
                      {award.awardIcon || '🏆'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-slate-100">{award.title}</h3>
                        {award.awardKey === 'MVP' && (
                          <Badge variant="warning" className="text-[10px] py-0 px-1.5 font-bold">
                            PREMIER HONOR
                          </Badge>
                        )}
                        {isOverridden && (
                          <Badge variant="info" className="text-[10px] py-0 px-1.5 font-bold">
                            ADMIN OVERRIDE
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{award.subtitle || award.category}</p>
                    </div>
                  </div>

                  {/* Confidence Badge */}
                  {award.confidenceScore && !isOverridden && (
                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Algorithmic Confidence</span>
                      <span className="text-xs font-black text-emerald-400">{award.confidenceScore}%</span>
                    </div>
                  )}
                </div>

                {/* Recipient Spotlight Card */}
                <div className="p-4 space-y-3">
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {award.recipientPhoto ? (
                        <img
                          src={award.recipientPhoto}
                          alt={award.recipientName || 'Recipient'}
                          className="w-11 h-11 rounded-full object-cover border border-slate-700 shrink-0"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 font-black text-sm shrink-0">
                          {award.recipientName?.charAt(0) || 'P'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            {isOverridden ? 'Designated Recipient (Admin)' : 'Rank #1 Recommended Recipient'}
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-emerald-400 truncate">
                          {award.recipientName || 'To Be Determined'}
                        </h4>
                        {award.recipientTeamName && (
                          <span className="text-xs text-slate-400 truncate block">
                            {award.recipientTeamName}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Trigger Broadcast Button */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleQuickTriggerBroadcast(award)}
                        title="Display this award card on the live broadcast presentation"
                        icon={<Tv className="w-3.5 h-3.5 text-amber-400" />}
                      >
                        Broadcast
                      </Button>
                    </div>
                  </div>

                  {/* Citation & Statistical Summary */}
                  {award.recommendedStatSummary && (
                    <div className="text-xs text-slate-300 font-medium px-1 flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{award.recommendedStatSummary}</span>
                    </div>
                  )}

                  {award.citation && (
                    <p className="text-xs text-slate-400 italic px-1">
                      "{award.citation}"
                    </p>
                  )}

                  {isOverridden && award.overrideReason && (
                    <div className="p-2.5 rounded-lg bg-blue-950/30 border border-blue-800/40 text-xs text-blue-300">
                      <span className="font-bold">Override Note ({award.overrideBy || 'Admin'}):</span> {award.overrideReason}
                    </div>
                  )}

                  {/* Actions & Candidate Toggle */}
                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      {!award.isFinalized && (
                        <button
                          onClick={() => handleOpenOverrideModal(award)}
                          className="flex items-center gap-1 text-slate-300 hover:text-emerald-400 transition-colors font-semibold"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{isOverridden ? 'Edit Override' : 'Override Recipient'}</span>
                        </button>
                      )}

                      {isOverridden && !award.isFinalized && (
                        <button
                          onClick={() => handleRestoreRecommendation(award)}
                          className="flex items-center gap-1 text-amber-400 hover:text-amber-300 transition-colors font-semibold ml-2"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restore Auto</span>
                        </button>
                      )}
                    </div>

                    {award.candidates && award.candidates.length > 0 && (
                      <button
                        onClick={() => toggleExpandAward(award.id)}
                        className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors font-semibold"
                      >
                        <span>Candidates ({award.candidates.length})</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Candidates Leaderboard */}
                {isExpanded && award.candidates && (
                  <div className="p-4 bg-slate-950/70 border-t border-slate-800/80 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <span>Ranked Candidates</span>
                      <span>Statistical Evaluation</span>
                    </div>

                    <div className="space-y-2">
                      {award.candidates.map((cand, cIdx) => {
                        const isSelected = cand.playerId === award.recipientPlayerId;
                        return (
                          <div
                            key={cand.playerId || cIdx}
                            className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                              isSelected
                                ? 'bg-emerald-950/20 border-emerald-500/40 text-slate-100'
                                : 'bg-slate-900/60 border-slate-800 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] shrink-0 ${
                                  cIdx === 0
                                    ? 'bg-amber-500 text-slate-950'
                                    : cIdx === 1
                                    ? 'bg-slate-300 text-slate-950'
                                    : cIdx === 2
                                    ? 'bg-amber-700 text-white'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                #{cIdx + 1}
                              </span>

                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-200 truncate">{cand.playerName}</span>
                                  {isSelected && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                                      CHOSEN
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-400 truncate block">{cand.teamName}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-mono font-bold text-emerald-400">
                                {cand.score} pts
                              </span>

                              <button
                                onClick={() => setSelectedFormulaCandidate({ award, candidate: cand })}
                                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 flex items-center gap-1"
                                title="View Why This Player mathematical formula breakdown"
                              >
                                <Info className="w-3 h-3 text-blue-400" />
                                <span>Why?</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* WHY THIS PLAYER? FORMULA BREAKDOWN MODAL */}
      {selectedFormulaCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🧮</span>
                <div>
                  <h3 className="text-sm font-black text-slate-100">
                    Transparent Formula Breakdown: {selectedFormulaCandidate.candidate.playerName}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedFormulaCandidate.award.title} • Score: {selectedFormulaCandidate.candidate.score} Points
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFormulaCandidate(null)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Algorithm Rationale</span>
                <p className="text-xs text-emerald-300 font-medium">
                  {selectedFormulaCandidate.candidate.recommendationReason}
                </p>
              </div>

              {/* Component breakdown */}
              {selectedFormulaCandidate.candidate.formulaDetails && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Formula Components & Weighted Point Contribution
                  </span>
                  <div className="space-y-2">
                    {selectedFormulaCandidate.candidate.formulaDetails.components.map((comp, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-200">{comp.label}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-semibold">
                              Weight {comp.weight}%
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 block">{comp.description}</span>
                          <span className="text-[11px] text-slate-300 font-mono">Raw Value: {comp.value}</span>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-sm font-mono font-black text-emerald-400">
                            +{comp.points}
                          </span>
                          <span className="text-[10px] text-slate-500 block">points</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Statistical Raw Metrics */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Immutable Scorecard Metrics
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(selectedFormulaCandidate.candidate.statisticalBreakdown || {}).map(([k, v]) => (
                    <div key={k} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block">{k}</span>
                      <span className="text-xs font-black text-slate-200">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setSelectedFormulaCandidate(null)}>
                Close Breakdown
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN OVERRIDE MODAL */}
      {overrideModalAward && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-black text-slate-100">
                  Override Recipient: {overrideModalAward.title}
                </h3>
              </div>
              <button
                onClick={() => setOverrideModalAward(null)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-800/40 text-blue-300">
                <span className="font-bold">Audit Policy:</span> Overriding an award will be permanently recorded in the official tournament audit log with your administrative user identity, timestamp, and justification reason.
              </div>

              {/* Player Selector */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">Select New Recipient Player *</label>
                <select
                  value={selectedOverridePlayerId}
                  onChange={(e) => setSelectedOverridePlayerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Choose Player from Tournament Teams --</option>
                  {players.map((p) => {
                    const team = teams.find((t) => t.id === p.teamId);
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name} ({team?.name || 'Unassigned'}) - #{p.jerseyNumber || '-'} {p.role || ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Justification Reason */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">Official Justification / Reason *</label>
                <textarea
                  rows={3}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Provide official jury, committee or match referee reason for this award override..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Citation */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">Presentation Citation</label>
                <input
                  type="text"
                  value={overrideCitation}
                  onChange={(e) => setOverrideCitation(e.target.value)}
                  placeholder="e.g. Outstanding match-winning performance in championship playoff"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setOverrideModalAward(null)}>
                Cancel
              </Button>
              <Button
                variant="emerald"
                size="sm"
                onClick={handleSubmitOverride}
                disabled={overrideSubmitting || !selectedOverridePlayerId || !overrideReason.trim()}
              >
                {overrideSubmitting ? 'Saving Override...' : 'Confirm & Save Override'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* AUDIT LOG MODAL */}
      {isAuditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-black text-slate-100">
                  Tournament Awards Official Audit Trail
                </h3>
              </div>
              <button
                onClick={() => setIsAuditModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 max-h-[70vh] overflow-y-auto space-y-3">
              {auditLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No award modifications or overrides logged for this tournament yet.
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">{log.awardTitle || log.action}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="font-semibold text-amber-400">{log.action}:</span>
                      <span>From <strong className="text-slate-400">{log.previousRecipient || 'None'}</strong> to <strong className="text-emerald-400">{log.newRecipient}</strong></span>
                    </div>

                    {log.reason && (
                      <p className="text-[11px] text-slate-400 italic">
                        "{log.reason}"
                      </p>
                    )}

                    <div className="text-[10px] text-slate-500 pt-1">
                      Logged by: <span className="text-slate-300">{log.administrator}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setIsAuditModalOpen(false)}>
                Close Audit Log
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
