/**
 * SportsPulse - Retained Players Manager
 */

import React, { useState } from 'react';
import { Award, Plus, Trash2, Shield, DollarSign, AlertCircle } from 'lucide-react';
import { Auction, AuctionTeam, AuctionPlayer, AuctionRetainedPlayer } from '../../../types';
import { Button } from '../../ui/Button';
import { formatAuctionAmount } from '../../../utils/auctionFormatters';

interface AuctionRetainedPlayersManagerProps {
  auction: Auction;
  teams: AuctionTeam[];
  players: AuctionPlayer[];
  retainedPlayers: AuctionRetainedPlayer[];
  onAddRetainedPlayer: (data: { playerId: string; teamId: string; retentionPrice?: number }) => Promise<void>;
  onRemoveRetainedPlayer: (retainedId: string) => Promise<void>;
  loading?: boolean;
}

export const AuctionRetainedPlayersManager: React.FC<AuctionRetainedPlayersManagerProps> = ({
  auction,
  teams,
  players,
  retainedPlayers,
  onAddRetainedPlayer,
  onRemoveRetainedPlayer,
  loading = false,
}) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [retentionPriceCr, setRetentionPriceCr] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Available players who are not yet sold/retained
  const availablePlayers = players.filter((p) => p.status === 'AVAILABLE');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!selectedPlayerId || !selectedTeamId) {
      setError('Please select both a player and a team.');
      return;
    }

    const multiplier = auction.currency === 'INR' ? 10000000 : 1000000;
    const finalPrice = retentionPriceCr ? Math.round(Number(retentionPriceCr) * multiplier) : undefined;

    try {
      await onAddRetainedPlayer({
        playerId: selectedPlayerId,
        teamId: selectedTeamId,
        retentionPrice: finalPrice,
      });
      setSelectedPlayerId('');
      setSelectedTeamId('');
      setRetentionPriceCr('');
      setIsAdding(false);
    } catch (err: any) {
      setError(err.message || 'Failed to add retained player.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-400" />
            Pre-Auction Retained Players ({retainedPlayers.length})
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Retained players deduct their retention fee from the franchise starting purse before the live auction begins
          </p>
        </div>

        {!isAdding && (
          <Button
            variant="primary"
            onClick={() => setIsAdding(true)}
            icon={<Plus className="w-4 h-4" />}
            className="bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/10"
          >
            Retain Player
          </Button>
        )}
      </div>

      {/* Add Form Inline */}
      {isAdding && (
        <form
          onSubmit={handleAdd}
          className="p-5 bg-slate-900 border border-indigo-500/40 rounded-2xl space-y-4 shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-400" />
              Retain Player for Franchise
            </h4>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-slate-400 hover:text-slate-200 text-xs"
            >
              Cancel
            </button>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Select Player <span className="text-indigo-400">*</span>
              </label>
              <select
                required
                value={selectedPlayerId}
                onChange={(e) => {
                  setSelectedPlayerId(e.target.value);
                  const p = players.find((pl) => pl.id === e.target.value);
                  if (p && !retentionPriceCr) {
                    const mult = auction.currency === 'INR' ? 10000000 : 1000000;
                    setRetentionPriceCr((p.basePrice / mult).toString());
                  }
                }}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
              >
                <option value="">-- Choose Player --</option>
                {availablePlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.role} • {p.country})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Retaining Team <span className="text-indigo-400">*</span>
              </label>
              <select
                required
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
              >
                <option value="">-- Choose Team --</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.shortCode} - Purse: {formatAuctionAmount(t.currentPurse, auction.currency)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Retention Fee {auction.currency === 'INR' ? '(in Crores)' : '(in Millions)'}
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                placeholder="e.g. 15 (₹15 Cr)"
                value={retentionPriceCr}
                onChange={(e) => setRetentionPriceCr(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={loading}
              className="bg-indigo-600 hover:bg-indigo-500"
            >
              Confirm Retention
            </Button>
          </div>
        </form>
      )}

      {/* Retained Players Table */}
      {retainedPlayers.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-8">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3">
            <Award className="w-7 h-7" />
          </div>
          <h4 className="text-base font-bold text-slate-200">No Retained Players</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-5">
            Franchises can retain star players before the main auction starts (e.g. MS Dhoni for CSK, Jasprit Bumrah for MI).
          </p>
          <Button
            variant="primary"
            onClick={() => setIsAdding(true)}
            icon={<Plus className="w-4 h-4" />}
            className="bg-indigo-600 hover:bg-indigo-500"
          >
            Retain Player
          </Button>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[11px] font-semibold tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Player</th>
                <th className="py-3 px-4">Retaining Franchise</th>
                <th className="py-3 px-4">Retention Deduction</th>
                <th className="py-3 px-4">Date Added</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-slate-900/60">
              {retainedPlayers.map((item, idx) => {
                const player = players.find((p) => p.id === item.playerId);
                const team = teams.find((t) => t.id === item.teamId);

                return (
                  <tr key={item.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono text-slate-400 font-bold">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-100 text-sm">{item.playerName || player?.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {player?.role} • {player?.country}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: team?.color || '#6366f1' }}
                        />
                        <span className="font-semibold text-slate-200">{item.teamName || team?.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400 text-sm">
                      {formatAuctionAmount(item.retentionPrice, auction.currency)}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onRemoveRetainedPlayer(item.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Remove retention and return to pool"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
