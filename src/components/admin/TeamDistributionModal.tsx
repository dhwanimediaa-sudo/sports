import React, { useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Group, Team } from '../../types';
import { api } from '../../services/api';
import {
  Shuffle,
  Users,
  Shield,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

export interface TeamDistributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
  groups: Group[];
  teams: Team[];
  onSuccess: () => void;
}

export const TeamDistributionModal: React.FC<TeamDistributionModalProps> = ({
  isOpen,
  onClose,
  tournamentId,
  groups,
  teams,
  onSuccess,
}) => {
  const [method, setMethod] = useState<'SNAKE' | 'RANDOM' | 'BALANCED'>('SNAKE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDistribute = async () => {
    if (groups.length === 0) {
      setError('Please create at least one group first.');
      return;
    }
    if (teams.length === 0) {
      setError('No registered teams in this tournament to distribute.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await api.distributeTeams(tournamentId, method);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to distribute teams.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="AUTOMATIC TEAM DISTRIBUTION"
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-xs font-bold text-slate-200">
            DISTRIBUTION POOL: {teams.length} Teams across {groups.length} Groups
          </div>
          <div className="text-[11px] text-slate-400">
            Select a distribution algorithm to automatically balance teams across all active tournament groups.
          </div>
        </div>

        {/* Method cards */}
        <div className="grid grid-cols-1 gap-2.5">
          <button
            type="button"
            onClick={() => setMethod('SNAKE')}
            className={`p-3 rounded-xl border text-left transition-all ${
              method === 'SNAKE'
                ? 'bg-emerald-950/30 border-emerald-500 text-slate-100 ring-1 ring-emerald-500'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className={`w-4 h-4 ${method === 'SNAKE' ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span className="text-xs font-bold uppercase tracking-wider">Snake Seeding Distribution (Recommended)</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold">
                PARITY
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 pl-6">
              Distributes teams in serpentine order (A → B → C → C → B → A). Ideal for seeded teams to ensure maximum group parity.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setMethod('RANDOM')}
            className={`p-3 rounded-xl border text-left transition-all ${
              method === 'RANDOM'
                ? 'bg-emerald-950/30 border-emerald-500 text-slate-100 ring-1 ring-emerald-500'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shuffle className={`w-4 h-4 ${method === 'RANDOM' ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span className="text-xs font-bold uppercase tracking-wider">Random Lottery Draw</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold">
                BLIND DRAW
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 pl-6">
              Randomizes and shuffles the team pool before filling groups evenly. Perfect for open cups and randomized draws.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setMethod('BALANCED')}
            className={`p-3 rounded-xl border text-left transition-all ${
              method === 'BALANCED'
                ? 'bg-emerald-950/30 border-emerald-500 text-slate-100 ring-1 ring-emerald-500'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className={`w-4 h-4 ${method === 'BALANCED' ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span className="text-xs font-bold uppercase tracking-wider">Sequential Round Robin Fill</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold">
                ORDERED
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 pl-6">
              Places teams in order (A → B → C → A → B → C) based on current team list registration order.
            </p>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="emerald"
            size="sm"
            type="button"
            loading={loading}
            onClick={handleDistribute}
            icon={<CheckCircle2 className="w-4 h-4" />}
          >
            APPLY AUTO-DISTRIBUTION
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
