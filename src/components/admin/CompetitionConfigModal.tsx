import React, { useState, useEffect } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import {
  Tournament,
  SportType,
  CompetitionFormat,
  TournamentCompetitionConfig,
  TieBreakerRule,
} from '../../types';
import { api } from '../../services/api';
import {
  Layers,
  Settings,
  ListOrdered,
  Award,
  AlertCircle,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  Shield,
  HelpCircle,
} from 'lucide-react';

export interface CompetitionConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: Tournament;
  initialConfig?: TournamentCompetitionConfig | null;
  onSuccess: (savedConfig: TournamentCompetitionConfig) => void;
}

const ALL_TIE_BREAKERS: { id: TieBreakerRule; label: string; sports: string }[] = [
  { id: 'POINTS', label: 'Total Points Earned', sports: 'All Sports' },
  { id: 'NET_RUN_RATE', label: 'Net Run Rate (NRR)', sports: 'Cricket' },
  { id: 'GOAL_DIFFERENCE', label: 'Goal Difference (GF - GA)', sports: 'Football, Field Hockey' },
  { id: 'GOALS_SCORED', label: 'Total Goals Scored (GF)', sports: 'Football, Field Hockey' },
  { id: 'SET_DIFFERENCE', label: 'Set Difference (Sets Won - Lost)', sports: 'Volleyball, Tennis, Badminton, Table Tennis' },
  { id: 'SET_RATIO', label: 'Set Ratio (Sets Won / Lost)', sports: 'Volleyball' },
  { id: 'POINT_DIFFERENCE', label: 'Point Difference / Score Margin', sports: 'Volleyball, Kabaddi, Basketball, Racket Sports' },
  { id: 'POINT_RATIO', label: 'Point Ratio (Points Won / Lost)', sports: 'Volleyball' },
  { id: 'HEAD_TO_HEAD_POINTS', label: 'Head-to-Head Points', sports: 'All Sports' },
  { id: 'HEAD_TO_HEAD_DIFFERENCE', label: 'Head-to-Head Score Difference', sports: 'All Sports' },
  { id: 'WINS_COUNT', label: 'Most Matches Won', sports: 'All Sports' },
  { id: 'BONUS_POINTS', label: 'Bonus Points Total', sports: 'Kabaddi, Rugby' },
  { id: 'ALPHABETICAL', label: 'Alphabetical Team Name (Fallback)', sports: 'All Sports' },
];

export const CompetitionConfigModal: React.FC<CompetitionConfigModalProps> = ({
  isOpen,
  onClose,
  tournament,
  initialConfig,
  onSuccess,
}) => {
  const [format, setFormat] = useState<CompetitionFormat>('GROUP_STAGE_KNOCKOUT');
  const [pointsForWin, setPointsForWin] = useState<number>(2);
  const [pointsForDraw, setPointsForDraw] = useState<number>(1);
  const [pointsForTie, setPointsForTie] = useState<number>(1);
  const [pointsForLoss, setPointsForLoss] = useState<number>(0);
  const [pointsForNoResult, setPointsForNoResult] = useState<number>(1);
  const [pointsForAbandoned, setPointsForAbandoned] = useState<number>(1);
  const [qualificationSlotsPerGroup, setQualificationSlotsPerGroup] = useState<number>(2);
  const [directQualificationSlots, setDirectQualificationSlots] = useState<number>(2);
  const [qualificationTrackingEnabled, setQualificationTrackingEnabled] = useState<boolean>(true);
  const [manualPointsOverrideEnabled, setManualPointsOverrideEnabled] = useState<boolean>(true);
  const [tieBreakerOrder, setTieBreakerOrder] = useState<TieBreakerRule[]>(['POINTS', 'NET_RUN_RATE', 'HEAD_TO_HEAD_POINTS', 'WINS_COUNT', 'ALPHABETICAL']);

  // Custom Sport Metrics
  const [customPrimaryMetric, setCustomPrimaryMetric] = useState<string>('Goal Difference');
  const [customSecondaryMetric, setCustomSecondaryMetric] = useState<string>('Goals Scored');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialConfig) {
      setFormat(initialConfig.format || 'GROUP_STAGE_KNOCKOUT');
      setPointsForWin(initialConfig.pointsForWin ?? (tournament.sport === 'FOOTBALL' || tournament.sport === 'HOCKEY' || (tournament.sport as string) === 'FIELD_HOCKEY' ? 3 : 2));
      setPointsForDraw(initialConfig.pointsForDraw ?? 1);
      setPointsForTie(initialConfig.pointsForTie ?? 1);
      setPointsForLoss(initialConfig.pointsForLoss ?? 0);
      setPointsForNoResult(initialConfig.pointsForNoResult ?? 1);
      setPointsForAbandoned(initialConfig.pointsForAbandoned ?? 1);
      setQualificationSlotsPerGroup(initialConfig.qualificationSlotsPerGroup ?? 2);
      setDirectQualificationSlots(initialConfig.directQualificationSlots ?? 2);
      setQualificationTrackingEnabled(initialConfig.qualificationTrackingEnabled ?? true);
      setManualPointsOverrideEnabled(initialConfig.manualPointsOverrideEnabled ?? true);
      if (initialConfig.tieBreakerOrder && initialConfig.tieBreakerOrder.length > 0) {
        setTieBreakerOrder(initialConfig.tieBreakerOrder);
      }
      if (initialConfig.customSportMetrics) {
        setCustomPrimaryMetric(initialConfig.customSportMetrics.primaryMetricName || 'Score Difference');
        setCustomSecondaryMetric(initialConfig.customSportMetrics.secondaryMetricName || 'Points Scored');
      }
    } else {
      // Default based on sport
      const isFoot = tournament.sport === 'FOOTBALL' || tournament.sport === 'HOCKEY' || (tournament.sport as string) === 'FIELD_HOCKEY';
      const isKab = tournament.sport === 'KABADDI';
      const isVoll = tournament.sport === 'VOLLEYBALL';

      setPointsForWin(isFoot ? 3 : isKab ? 5 : 2);
      setPointsForDraw(isFoot ? 1 : isKab ? 3 : 0);
      setPointsForTie(1);
      setPointsForLoss(0);
      setPointsForNoResult(1);
      setPointsForAbandoned(1);
      setQualificationSlotsPerGroup(2);
      setDirectQualificationSlots(2);

      if (tournament.sport === 'CRICKET') {
        setTieBreakerOrder(['POINTS', 'NET_RUN_RATE', 'HEAD_TO_HEAD_POINTS', 'WINS_COUNT', 'ALPHABETICAL']);
      } else if (isFoot) {
        setTieBreakerOrder(['POINTS', 'GOAL_DIFFERENCE', 'GOALS_SCORED', 'HEAD_TO_HEAD_POINTS', 'WINS_COUNT', 'ALPHABETICAL']);
      } else if (isVoll) {
        setTieBreakerOrder(['POINTS', 'SET_RATIO', 'SET_DIFFERENCE', 'POINT_RATIO', 'HEAD_TO_HEAD_POINTS', 'ALPHABETICAL']);
      } else if (isKab) {
        setTieBreakerOrder(['POINTS', 'POINT_DIFFERENCE', 'HEAD_TO_HEAD_POINTS', 'WINS_COUNT', 'ALPHABETICAL']);
      } else {
        setTieBreakerOrder(['POINTS', 'POINT_DIFFERENCE', 'HEAD_TO_HEAD_POINTS', 'WINS_COUNT', 'ALPHABETICAL']);
      }
    }
  }, [initialConfig, tournament, isOpen]);

  const moveTieBreaker = (index: number, direction: 'UP' | 'DOWN') => {
    const newOrder = [...tieBreakerOrder];
    const targetIdx = direction === 'UP' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newOrder.length) return;
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIdx];
    newOrder[targetIdx] = temp;
    setTieBreakerOrder(newOrder);
  };

  const addTieBreaker = (ruleId: TieBreakerRule) => {
    if (!tieBreakerOrder.includes(ruleId)) {
      setTieBreakerOrder([...tieBreakerOrder, ruleId]);
    }
  };

  const removeTieBreaker = (ruleId: TieBreakerRule) => {
    setTieBreakerOrder(tieBreakerOrder.filter((r) => r !== ruleId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload: Partial<TournamentCompetitionConfig> = {
        format,
        pointsForWin: Number(pointsForWin),
        pointsForDraw: Number(pointsForDraw),
        pointsForTie: Number(pointsForTie),
        pointsForLoss: Number(pointsForLoss),
        pointsForNoResult: Number(pointsForNoResult),
        pointsForAbandoned: Number(pointsForAbandoned),
        qualificationSlotsPerGroup: Number(qualificationSlotsPerGroup),
        directQualificationSlots: Number(directQualificationSlots),
        qualificationTrackingEnabled,
        manualPointsOverrideEnabled,
        tieBreakerOrder,
        customSportMetrics:
          tournament.sport === 'CUSTOM' || (tournament.sport as string) === 'CUSTOM_SPORT'
            ? {
                primaryMetricName: customPrimaryMetric,
                secondaryMetricName: customSecondaryMetric,
              }
            : undefined,
      };

      const res = await api.updateTournamentCompetitionConfig(tournament.id, payload);
      onSuccess(res.config);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update competition configuration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Tournament Competition & Points Table Configuration"
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Section 1: Competition Format */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              1. Competition Format Structure
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-400">
                Tournament Competition Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as CompetitionFormat)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-medium"
              >
                <option value="GROUP_STAGE_KNOCKOUT">Group Stage + Knockout Bracket (Standard)</option>
                <option value="SINGLE_LEAGUE">Single League (All Teams in 1 Table)</option>
                <option value="MULTI_GROUP_LEAGUE">Multi-Group League (Multiple Tables)</option>
                <option value="PAGE_PLAYOFF">Page Playoff System (Top 4 Playoff)</option>
                <option value="SINGLE_ROUND_ROBIN">Single Round Robin</option>
                <option value="DOUBLE_ROUND_ROBIN">Double Round Robin (Home & Away)</option>
                <option value="SINGLE_ELIMINATION">Single Elimination Knockout</option>
                <option value="DOUBLE_ELIMINATION">Double Elimination Bracket</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-400">
                Advancing Teams (Per Group)
              </label>
              <input
                type="number"
                min="1"
                max="16"
                value={qualificationSlotsPerGroup}
                onChange={(e) => setQualificationSlotsPerGroup(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Points System Configuration */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <Award className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              2. Points System Scoring Rules ({tournament.sport})
            </h4>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-emerald-400">Points for Win</label>
              <input
                type="number"
                step="0.5"
                value={pointsForWin}
                onChange={(e) => setPointsForWin(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-emerald-500/40 rounded-xl text-xs text-slate-100 font-bold font-mono focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-300">Points for Draw</label>
              <input
                type="number"
                step="0.5"
                value={pointsForDraw}
                onChange={(e) => setPointsForDraw(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 font-medium font-mono focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-300">Points for Tie</label>
              <input
                type="number"
                step="0.5"
                value={pointsForTie}
                onChange={(e) => setPointsForTie(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 font-medium font-mono focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-rose-400">Points for Loss</label>
              <input
                type="number"
                step="0.5"
                value={pointsForLoss}
                onChange={(e) => setPointsForLoss(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 font-medium font-mono focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-400">No Result (NR)</label>
              <input
                type="number"
                step="0.5"
                value={pointsForNoResult}
                onChange={(e) => setPointsForNoResult(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 font-medium font-mono focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-400">Abandoned Match</label>
              <input
                type="number"
                step="0.5"
                value={pointsForAbandoned}
                onChange={(e) => setPointsForAbandoned(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 font-medium font-mono focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>
        </div>

        {/* Section 3: Dynamic Tie-Breaker Ordering Hierarchy */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <ListOrdered className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                3. Configurable Tie-Breaker Hierarchy
              </h4>
            </div>
            <span className="text-[10px] text-slate-400">Evaluated Top-to-Bottom</span>
          </div>

          <p className="text-[11px] text-slate-400">
            When two or more teams finish with equal points, rankings are resolved strictly by this priority order:
          </p>

          <div className="space-y-1.5">
            {tieBreakerOrder.map((ruleId, index) => {
              const ruleMeta = ALL_TIE_BREAKERS.find((r) => r.id === ruleId);
              return (
                <div
                  key={ruleId}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center text-[10px] font-bold font-mono">
                      #{index + 1}
                    </span>
                    <div>
                      <span className="text-xs font-bold text-slate-200">
                        {ruleMeta?.label || ruleId}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        Applicable: {ruleMeta?.sports || 'All'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveTieBreaker(index, 'UP')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 disabled:opacity-30"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === tieBreakerOrder.length - 1}
                      onClick={() => moveTieBreaker(index, 'DOWN')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 disabled:opacity-30"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeTieBreaker(ruleId)}
                      className="text-[10px] px-2 py-1 rounded bg-slate-900 text-slate-400 hover:text-rose-400 border border-slate-800"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Available Tie Breakers */}
          {ALL_TIE_BREAKERS.some((r) => !tieBreakerOrder.includes(r.id)) && (
            <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Add criterion:</span>
              <div className="flex flex-wrap gap-1.5">
                {ALL_TIE_BREAKERS.filter((r) => !tieBreakerOrder.includes(r.id)).map((avail) => (
                  <button
                    key={avail.id}
                    type="button"
                    onClick={() => addTieBreaker(avail.id)}
                    className="text-[10px] px-2 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-emerald-400 border border-emerald-500/30 transition-colors"
                  >
                    + {avail.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Section 4: Engine Policies */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              4. Qualification & Override Engine Controls
            </h4>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={qualificationTrackingEnabled}
                onChange={(e) => setQualificationTrackingEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 bg-slate-950 border-slate-800 focus:ring-emerald-500"
              />
              <div>
                <span className="text-xs font-bold text-slate-200 block">
                  Automatic Qualification & Elimination Calculation
                </span>
                <span className="text-[11px] text-slate-400 block">
                  Dynamically marks teams as Guaranteed Qualified (Q) or Mathematically Eliminated based on remaining fixtures.
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={manualPointsOverrideEnabled}
                onChange={(e) => setManualPointsOverrideEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 bg-slate-950 border-slate-800 focus:ring-emerald-500"
              />
              <div>
                <span className="text-xs font-bold text-slate-200 block">
                  Allow Manual Admin Standings Adjustments (with Audit Trail)
                </span>
                <span className="text-[11px] text-slate-400 block">
                  Permits authorized tournament directors to deduct penalty points or force qualification status with full audit logging.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="emerald" size="sm" type="submit" disabled={loading}>
            {loading ? 'Saving Rules...' : 'Save Competition Configuration'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
