import React, { useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { api } from '../../services/api';
import {
  GitMerge,
  Trophy,
  Calendar,
  MapPin,
  Sparkles,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export interface KnockoutGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
  onSuccess: () => void;
}

export const KnockoutGeneratorModal: React.FC<KnockoutGeneratorModalProps> = ({
  isOpen,
  onClose,
  tournamentId,
  onSuccess,
}) => {
  const [stage, setStage] = useState<'ROUND_OF_16' | 'QUARTER_FINALS' | 'SEMI_FINALS' | 'FINAL'>('SEMI_FINALS');
  const [hasThirdPlaceMatch, setHasThirdPlaceMatch] = useState(true);
  const [createMatchEntities, setCreateMatchEntities] = useState(true);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [venue, setVenue] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setLoading(true);
      await api.generateTournamentKnockout(tournamentId, {
        stage,
        hasThirdPlaceMatch,
        createMatchEntities,
        startDate,
        venue: venue.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to generate knockout bracket.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="GENERATE KNOCKOUT BRACKET"
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleGenerate} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Automatically seeds top qualified teams from group standings (e.g. Winner Group A vs Runner-up Group B) and connects advancing paths through to the Championship Final.
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Starting Knockout Stage
            </label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as any)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              <option value="FINAL">Championship Final (2 Teams)</option>
              <option value="SEMI_FINALS">Semi Finals (4 Teams → 2 Semis + Final)</option>
              <option value="QUARTER_FINALS">Quarter Finals (8 Teams → 4 QFs + SFs + Final)</option>
              <option value="ROUND_OF_16">Round of 16 (16 Teams → 8 R16 + QFs + SFs + Final)</option>
            </select>
          </div>

          <Input
            label="Knockout Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            icon={<Calendar className="w-4 h-4" />}
          />
        </div>

        <Input
          label="Knockout Venue / Pitch"
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
          placeholder="e.g. National Stadium - Main Field"
          icon={<MapPin className="w-4 h-4" />}
        />

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="thirdPlaceToggle"
              checked={hasThirdPlaceMatch}
              onChange={(e) => setHasThirdPlaceMatch(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-500 bg-slate-950 border-slate-800 focus:ring-emerald-500"
            />
            <label htmlFor="thirdPlaceToggle" className="text-xs text-slate-200 font-medium cursor-pointer">
              Include 3rd Place Bronze Medal Playoff
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="createMatchToggle"
              checked={createMatchEntities}
              onChange={(e) => setCreateMatchEntities(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-500 bg-slate-950 border-slate-800 focus:ring-emerald-500"
            />
            <label htmlFor="createMatchToggle" className="text-xs text-slate-200 font-medium cursor-pointer">
              Create live scorable match fixtures in Match Engine for each bracket node
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="emerald"
            size="sm"
            type="submit"
            loading={loading}
            icon={<GitMerge className="w-4 h-4" />}
          >
            GENERATE BRACKET
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
