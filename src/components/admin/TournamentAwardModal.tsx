import React, { useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { TournamentAwardItem, Player, Team, Tournament } from '../../types';
import { api } from '../../services/api';
import {
  Award,
  Trophy,
  Star,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Lock,
} from 'lucide-react';

export interface TournamentAwardModalProps {
  isOpen?: boolean;
  onClose: () => void;
  tournamentId?: string;
  tournament?: Tournament;
  initialAwards?: TournamentAwardItem[];
  players?: Player[];
  teams?: Team[];
  onSuccess?: (updatedAwards: TournamentAwardItem[]) => void;
}

export const TournamentAwardModal: React.FC<TournamentAwardModalProps> = ({
  isOpen = true,
  onClose,
  tournamentId: propTournamentId,
  tournament,
  initialAwards = [],
  players = [],
  teams = [],
  onSuccess,
}) => {
  const tournamentId = propTournamentId || tournament?.id || '';
  const [awards, setAwards] = useState<TournamentAwardItem[]>(initialAwards || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddAward = () => {
    const newAward: TournamentAwardItem = {
      id: crypto.randomUUID(),
      tournamentId,
      awardKey: `CUSTOM_${Date.now()}`,
      awardTitle: 'Special Recognition Award',
      title: 'Special Recognition Award',
      category: 'CUSTOM',
      sponsor: '',
      cashPrize: '',
      citation: '',
      isFinalized: false,
    };
    setAwards([...awards, newAward]);
  };

  const handleRemoveAward = (index: number) => {
    setAwards(awards.filter((_, i) => i !== index));
  };

  const handleUpdateField = (index: number, field: keyof TournamentAwardItem, value: any) => {
    const updated = [...awards];
    updated[index] = { ...updated[index], [field]: value };

    // Auto update names if player or team ID chosen
    if (field === 'recipientPlayerId') {
      const p = players.find((pl) => pl.id === value);
      updated[index].recipientName = p ? p.name : '';
      if (p?.teamId) {
        updated[index].recipientTeamId = p.teamId;
        const tm = teams.find((t) => t.id === p.teamId);
        updated[index].recipientTeamName = tm?.name;
      }
    } else if (field === 'recipientTeamId') {
      const tm = teams.find((t) => t.id === value);
      updated[index].recipientTeamName = tm ? tm.name : '';
      if (!updated[index].recipientPlayerId) {
        updated[index].recipientName = tm?.name;
      }
    }

    setAwards(updated);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.saveTournamentAwards(tournamentId, awards);
      onSuccess(res.awards);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save tournament awards.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="MANAGE TOURNAMENT AWARDS & HONORS"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Configure official tournament awards, player of the series, golden boots, best defenders, and sponsored citations.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleAddAward}
            icon={<Plus className="w-4 h-4" />}
          >
            Add Award
          </Button>
        </div>

        {awards.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/60 rounded-xl border border-slate-800">
            <Award className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <p className="text-xs text-slate-400">No awards configured yet. Click "Add Award" above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {awards.map((award, idx) => (
              <div
                key={award.id || idx}
                className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-3 relative"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <input
                      type="text"
                      value={award.title}
                      onChange={(e) => handleUpdateField(idx, 'title', e.target.value)}
                      placeholder="Award Title (e.g. Player of the Tournament)"
                      className="bg-transparent text-xs font-bold text-slate-100 border-b border-transparent hover:border-slate-700 focus:border-emerald-500 focus:outline-none px-1 py-0.5"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAward(idx)}
                    className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Category */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase">Category</label>
                    <select
                      value={award.category}
                      onChange={(e) => handleUpdateField(idx, 'category', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="PLAYER_OF_TOURNAMENT">Player of the Tournament</option>
                      <option value="BEST_BATTER">Best Batter / Top Scorer</option>
                      <option value="BEST_BOWLER">Best Bowler / Golden Glove</option>
                      <option value="BEST_DEFENDER">Best Defender / Raider</option>
                      <option value="EMERGING_PLAYER">Emerging Player</option>
                      <option value="FAIR_PLAY">Fair Play Team Award</option>
                      <option value="CHAMPION_TEAM">Tournament Champion</option>
                      <option value="RUNNER_UP">Runner-Up</option>
                      <option value="CUSTOM">Custom Award</option>
                    </select>
                  </div>

                  {/* Recipient Player */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase">Recipient Player</label>
                    <select
                      value={award.recipientPlayerId || ''}
                      onChange={(e) => handleUpdateField(idx, 'recipientPlayerId', e.target.value || undefined)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">-- Select Player or Team Award --</option>
                      {players.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.role || 'Player'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Recipient Team */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase">Recipient Team</label>
                    <select
                      value={award.recipientTeamId || ''}
                      onChange={(e) => handleUpdateField(idx, 'recipientTeamId', e.target.value || undefined)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">-- Select Team --</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Award Sponsor / Presenter"
                    value={award.sponsor || ''}
                    onChange={(e) => handleUpdateField(idx, 'sponsor', e.target.value)}
                    placeholder="e.g. RedBull Sports or Title Sponsor"
                  />
                  <Input
                    label="Prize / Citation Details"
                    value={award.citation || award.cashPrize || ''}
                    onChange={(e) => handleUpdateField(idx, 'citation', e.target.value)}
                    placeholder="e.g. $5,000 + Golden Trophy (450 runs scored)"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="emerald"
            size="sm"
            type="button"
            loading={loading}
            onClick={handleSave}
            icon={<CheckCircle2 className="w-4 h-4" />}
          >
            SAVE AWARDS
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
