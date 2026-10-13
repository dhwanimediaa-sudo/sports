import React, { useState, useEffect } from 'react';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Match } from '../../types';
import { api } from '../../services/api';
import {
  Calendar,
  Clock,
  MapPin,
  ArrowLeftRight,
  AlertCircle,
  Tag,
} from 'lucide-react';

export interface FixtureEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
  match: Match | null;
  onSuccess: (updatedMatch: Match) => void;
}

export const FixtureEditModal: React.FC<FixtureEditModalProps> = ({
  isOpen,
  onClose,
  tournamentId,
  match,
  onSuccess,
}) => {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');
  const [ground, setGround] = useState('');
  const [matchNumber, setMatchNumber] = useState('');
  const [round, setRound] = useState('');
  const [swapHomeAway, setSwapHomeAway] = useState(false);
  const [description, setDescription] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (match) {
      setDate(match.date || '');
      setTime(match.time || '');
      setVenue(match.venue || '');
      setGround(match.ground || '');
      setMatchNumber(match.matchNumber || '');
      setRound(match.round || '');
      setDescription(match.description || '');
      setSwapHomeAway(false);
      setError(null);
    }
  }, [match]);

  if (!match) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setLoading(true);
      const res = await api.updateTournamentFixture(tournamentId, match.id, {
        date,
        time,
        venue,
        ground,
        matchNumber,
        round,
        swapHomeAway,
        description,
      });

      onSuccess(res.match);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update fixture');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`EDIT FIXTURE: ${match.matchNumber || match.name}`}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Match Teams Header */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-left flex-1">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">
                {swapHomeAway ? 'Away Team' : 'Home Team'}
              </span>
              <span className="text-xs font-bold text-slate-100">
                {match.teamA?.name || 'Home Team'}
              </span>
            </div>

            <div className="flex items-center justify-center px-3">
              <button
                type="button"
                onClick={() => setSwapHomeAway(!swapHomeAway)}
                className={`p-2 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all ${
                  swapHomeAway
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 ring-1 ring-amber-500/30'
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/50'
                }`}
                title="Swap Home and Away designation"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span className="text-[11px]">{swapHomeAway ? 'Swapped' : 'Swap'}</span>
              </button>
            </div>

            <div className="text-right flex-1">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">
                {swapHomeAway ? 'Home Team' : 'Away Team'}
              </span>
              <span className="text-xs font-bold text-slate-100">
                {match.teamB?.name || 'Away Team'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Match Number */}
          <Input
            label="Match Number"
            value={matchNumber}
            onChange={(e) => setMatchNumber(e.target.value)}
            placeholder="e.g. M001"
            icon={<Tag className="w-4 h-4" />}
          />

          {/* Round Label */}
          <Input
            label="Round / Stage Name"
            value={round}
            onChange={(e) => setRound(e.target.value)}
            placeholder="e.g. Round 1"
            icon={<Calendar className="w-4 h-4" />}
          />

          {/* Date */}
          <Input
            label="Scheduled Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            icon={<Calendar className="w-4 h-4" />}
            required
          />

          {/* Time */}
          <Input
            label="Scheduled Time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            icon={<Clock className="w-4 h-4" />}
            required
          />

          {/* Venue */}
          <Input
            label="Venue / Stadium"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="e.g. Wankhede Stadium"
            icon={<MapPin className="w-4 h-4" />}
            required
          />

          {/* Ground / Pitch */}
          <Input
            label="Pitch / Ground / Court"
            value={ground}
            onChange={(e) => setGround(e.target.value)}
            placeholder="e.g. Pitch 1 or Court A"
            icon={<MapPin className="w-4 h-4" />}
          />
        </div>

        {/* Description / Notes */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Match Details / Subtitle
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Group A • Evening Fixture"
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="emerald" size="sm" type="submit" loading={loading}>
            Save Changes
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
