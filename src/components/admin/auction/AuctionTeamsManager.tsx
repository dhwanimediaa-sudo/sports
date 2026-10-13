/**
 * SportsPulse - Auction Teams Manager
 */

import React, { useState } from 'react';
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Users,
  DollarSign,
  TrendingDown,
  Globe,
  Award,
  AlertCircle,
} from 'lucide-react';
import { Auction, AuctionTeam, AuctionPlayer } from '../../../types';
import { Button } from '../../ui/Button';
import { formatAuctionAmount } from '../../../utils/auctionFormatters';
import { AuctionTeamModal } from './AuctionTeamModal';

interface AuctionTeamsManagerProps {
  auction: Auction;
  teams: AuctionTeam[];
  players: AuctionPlayer[];
  onAddTeam: (data: Partial<AuctionTeam>) => Promise<void>;
  onEditTeam: (teamId: string, data: Partial<AuctionTeam>) => Promise<void>;
  onDeleteTeam: (teamId: string) => Promise<void>;
  onDuplicateTeam?: (teamId: string) => Promise<void>;
  loading?: boolean;
}

export const AuctionTeamsManager: React.FC<AuctionTeamsManagerProps> = ({
  auction,
  teams,
  players,
  onAddTeam,
  onEditTeam,
  onDeleteTeam,
  onDuplicateTeam,
  loading = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<AuctionTeam | null>(null);
  const [selectedTeamForRoster, setSelectedTeamForRoster] = useState<AuctionTeam | null>(null);
  const [deleteTargetTeam, setDeleteTargetTeam] = useState<AuctionTeam | null>(null);

  const handleOpenAdd = () => {
    setEditingTeam(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (team: AuctionTeam) => {
    setEditingTeam(team);
    setIsModalOpen(true);
  };

  const handleSave = async (data: Partial<AuctionTeam>) => {
    if (editingTeam) {
      await onEditTeam(editingTeam.id, data);
    } else {
      await onAddTeam(data);
    }
  };

  const totalPurseBudget = teams.reduce((acc, t) => acc + (t.startingPurse || 0), 0);
  const totalPurseSpent = teams.reduce((acc, t) => acc + (t.totalSpent || 0), 0);
  const totalPurseRemaining = teams.reduce((acc, t) => acc + (t.currentPurse || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Controls & Summary Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            Auction Franchises & Teams ({teams.length})
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage franchise purse limits, overseas quotas, and live squad roster allocations
          </p>
        </div>

        <Button
          variant="primary"
          onClick={handleOpenAdd}
          icon={<Plus className="w-4 h-4" />}
          className="shadow-lg shadow-emerald-500/10"
        >
          Add Franchise
        </Button>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400 block mb-1">Total Teams in Auction</span>
          <span className="text-2xl font-extrabold text-slate-100 font-mono">{teams.length}</span>
        </div>
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400 block mb-1">Total Starting Purse</span>
          <span className="text-2xl font-extrabold text-blue-400 font-mono">
            {formatAuctionAmount(totalPurseBudget, auction.currency)}
          </span>
        </div>
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400 block mb-1">Total Spent So Far</span>
          <span className="text-2xl font-extrabold text-amber-400 font-mono">
            {formatAuctionAmount(totalPurseSpent, auction.currency)}
          </span>
        </div>
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400 block mb-1">Remaining Purse Pool</span>
          <span className="text-2xl font-extrabold text-emerald-400 font-mono">
            {formatAuctionAmount(totalPurseRemaining, auction.currency)}
          </span>
        </div>
      </div>

      {/* Teams Grid */}
      {teams.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-8">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
            <Shield className="w-7 h-7" />
          </div>
          <h4 className="text-base font-bold text-slate-200">No Franchises Configured</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-5">
            Add franchises (e.g. CSK, MI, RCB) to set up starting budgets, squad minimums, and live bidding eligibility.
          </p>
          <Button variant="primary" onClick={handleOpenAdd} icon={<Plus className="w-4 h-4" />}>
            Add First Franchise
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {teams.map((team) => {
            const teamPlayers = players.filter(
              (p) =>
                (p.status === 'SOLD' && p.soldToTeamId === team.id) ||
                (p.status === 'RETAINED' && p.retainedByTeamId === team.id)
            );
            const maxSquad = team.maxSquadSize || auction.maxSquadSize || 25;
            const maxOverseas = auction.maxOverseasPlayers || 8;
            const pursePercentage = Math.round((team.currentPurse / (team.startingPurse || 1)) * 100);

            return (
              <div
                key={team.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                {/* Team Card Header */}
                <div
                  className="p-4 border-b border-slate-800/80 flex items-center justify-between"
                  style={{ backgroundColor: `${team.color || '#10b981'}15` }}
                >
                  <div className="flex items-center gap-3">
                    {team.logo ? (
                      <img
                        src={team.logo}
                        alt={team.name}
                        className="w-10 h-10 rounded-xl object-contain bg-slate-950/80 border border-slate-700 p-1"
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm border font-mono"
                        style={{
                          backgroundColor: `${team.color || '#10b981'}30`,
                          borderColor: `${team.color || '#10b981'}60`,
                          color: team.color || '#10b981',
                        }}
                      >
                        {team.shortCode}
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-slate-100 text-sm leading-tight">{team.name}</h4>
                      <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                        {team.shortCode} {team.ownerName && `• ${team.ownerName}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(team)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                      title="Edit Team"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTargetTeam(team)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Delete Team"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Purse & Budget Tracker */}
                <div className="p-5 space-y-4">
                  <div>
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-xs text-slate-400">Remaining Purse</span>
                      <span className="text-base font-extrabold text-emerald-400 font-mono">
                        {formatAuctionAmount(team.currentPurse, auction.currency)}
                      </span>
                    </div>
                    {/* Purse Bar */}
                    <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          pursePercentage > 50
                            ? 'bg-emerald-500'
                            : pursePercentage > 20
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, pursePercentage))}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                      <span>Spent: {formatAuctionAmount(team.totalSpent, auction.currency)}</span>
                      <span>Initial: {formatAuctionAmount(team.startingPurse, auction.currency)}</span>
                    </div>
                  </div>

                  {/* Squad & Overseas Quota Badges */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="bg-slate-950/70 border border-slate-800/80 p-2.5 rounded-xl">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-0.5">
                        <Users className="w-3.5 h-3.5 text-blue-400" />
                        <span>Squad Size</span>
                      </div>
                      <div className="text-sm font-bold text-slate-100 font-mono">
                        {teamPlayers.length}{' '}
                        <span className="text-xs text-slate-400 font-normal">/ {maxSquad} max</span>
                      </div>
                    </div>

                    <div className="bg-slate-950/70 border border-slate-800/80 p-2.5 rounded-xl">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-0.5">
                        <Globe className="w-3.5 h-3.5 text-rose-400" />
                        <span>Overseas</span>
                      </div>
                      <div className="text-sm font-bold text-slate-100 font-mono">
                        {team.overseasCount}{' '}
                        <span className="text-xs text-slate-400 font-normal">/ {maxOverseas} max</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer / Roster Button */}
                <div className="px-5 py-3 border-t border-slate-800/70 bg-slate-950/40 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {teamPlayers.length} player{teamPlayers.length === 1 ? '' : 's'} acquired
                  </span>
                  <button
                    onClick={() => setSelectedTeamForRoster(team)}
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    View Squad ({teamPlayers.length}) →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Team Modal */}
      <AuctionTeamModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTeam(null);
        }}
        onSave={handleSave}
        initialTeam={editingTeam}
        defaultStartingPurse={auction.startingPurse}
        currency={auction.currency}
      />

      {/* View Squad Roster Modal */}
      {selectedTeamForRoster && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-950/50">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm font-mono border"
                  style={{
                    backgroundColor: `${selectedTeamForRoster.color || '#10b981'}20`,
                    borderColor: `${selectedTeamForRoster.color || '#10b981'}50`,
                    color: selectedTeamForRoster.color || '#10b981',
                  }}
                >
                  {selectedTeamForRoster.shortCode}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">{selectedTeamForRoster.name} Squad Roster</h3>
                  <p className="text-xs text-slate-400">
                    Purse Spent: {formatAuctionAmount(selectedTeamForRoster.totalSpent, auction.currency)} | Remaining:{' '}
                    {formatAuctionAmount(selectedTeamForRoster.currentPurse, auction.currency)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTeamForRoster(null)}
                className="text-slate-400 hover:text-slate-200 p-2 rounded-lg hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {(() => {
                const squad = players.filter(
                  (p) =>
                    (p.status === 'SOLD' && p.soldToTeamId === selectedTeamForRoster.id) ||
                    (p.status === 'RETAINED' && p.retainedByTeamId === selectedTeamForRoster.id)
                );

                if (squad.length === 0) {
                  return (
                    <div className="text-center py-10 text-slate-400 text-xs">
                      No players acquired by {selectedTeamForRoster.name} yet.
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    {squad.map((player, idx) => (
                      <div
                        key={player.id}
                        className="flex items-center justify-between p-3 bg-slate-950/70 border border-slate-800 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono text-slate-400 w-5">{idx + 1}.</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-slate-100">{player.name}</span>
                              {player.status === 'RETAINED' && (
                                <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 rounded text-[10px] font-bold">
                                  RETAINED
                                </span>
                              )}
                              {player.isOverseas && (
                                <span className="px-1.5 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded text-[10px] font-bold">
                                  OS
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-400">
                              {player.role} • {player.country} • {player.category}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-mono font-bold text-emerald-400">
                            {formatAuctionAmount(
                              player.status === 'RETAINED'
                                ? player.retentionPrice || player.basePrice
                                : player.soldPrice || player.basePrice,
                              auction.currency
                            )}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex justify-end">
              <Button variant="ghost" onClick={() => setSelectedTeamForRoster(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-100">Delete Franchise?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Are you sure you want to delete <span className="text-slate-200 font-semibold">{deleteTargetTeam.name}</span>?
                All players acquired by this team will be released back to the available auction pool.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="ghost" className="flex-1" onClick={() => setDeleteTargetTeam(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={async () => {
                  await onDeleteTeam(deleteTargetTeam.id);
                  setDeleteTargetTeam(null);
                }}
              >
                Delete Franchise
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
