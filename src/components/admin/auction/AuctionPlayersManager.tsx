/**
 * SportsPulse - Auction Players Pool Manager
 */

import React, { useState, useMemo } from 'react';
import {
  User,
  Plus,
  Upload,
  Search,
  Filter,
  Edit2,
  Trash2,
  Play,
  RotateCcw,
  Globe,
  Award,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { Auction, AuctionPlayer, AuctionTeam, PlayerAuctionStatus, PlayerCategory } from '../../../types';
import { Button } from '../../ui/Button';
import {
  formatAuctionAmount,
  getCategoryBadgeColor,
  getPlayerStatusBadge,
} from '../../../utils/auctionFormatters';
import { AuctionPlayerModal } from './AuctionPlayerModal';
import { AuctionPlayerImportModal } from './AuctionPlayerImportModal';

interface AuctionPlayersManagerProps {
  auction: Auction;
  players: AuctionPlayer[];
  teams: AuctionTeam[];
  onAddPlayer: (data: Partial<AuctionPlayer>) => Promise<void>;
  onEditPlayer: (playerId: string, data: Partial<AuctionPlayer>) => Promise<void>;
  onDeletePlayer: (playerId: string) => Promise<void>;
  onImportPlayers: (players: any[]) => Promise<void>;
  onStartPlayerAuction: (playerId: string) => Promise<void>;
  onReAuctionPlayer: (playerId: string, newBasePrice?: number) => Promise<void>;
  onNavigateToAuctionRoom: () => void;
  loading?: boolean;
}

export const AuctionPlayersManager: React.FC<AuctionPlayersManagerProps> = ({
  auction,
  players,
  teams,
  onAddPlayer,
  onEditPlayer,
  onDeletePlayer,
  onImportPlayers,
  onStartPlayerAuction,
  onReAuctionPlayer,
  onNavigateToAuctionRoom,
  loading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<AuctionPlayer | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [deleteTargetPlayer, setDeleteTargetPlayer] = useState<AuctionPlayer | null>(null);
  const [viewingPlayer, setViewingPlayer] = useState<AuctionPlayer | null>(null);

  const filteredPlayers = useMemo(() => {
    return players.filter((player) => {
      if (selectedCategory !== 'ALL' && player.category !== selectedCategory) return false;
      if (selectedRole !== 'ALL' && player.role !== selectedRole) return false;
      if (selectedStatus !== 'ALL' && player.status !== selectedStatus) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          player.name.toLowerCase().includes(q) ||
          player.country.toLowerCase().includes(q) ||
          player.role.toLowerCase().includes(q) ||
          (player.category && player.category.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [players, selectedCategory, selectedRole, selectedStatus, searchQuery]);

  const statsCount = useMemo(() => {
    return {
      total: players.length,
      available: players.filter((p) => p.status === 'AVAILABLE').length,
      sold: players.filter((p) => p.status === 'SOLD').length,
      unsold: players.filter((p) => p.status === 'UNSOLD').length,
      retained: players.filter((p) => p.status === 'RETAINED').length,
      overseas: players.filter((p) => p.isOverseas).length,
    };
  }, [players]);

  const handleOpenAdd = () => {
    setEditingPlayer(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (player: AuctionPlayer) => {
    setEditingPlayer(player);
    setIsModalOpen(true);
  };

  const handleSave = async (data: Partial<AuctionPlayer>) => {
    if (editingPlayer) {
      await onEditPlayer(editingPlayer.id, data);
    } else {
      await onAddPlayer(data);
    }
  };

  const handleBringToStage = async (playerId: string) => {
    await onStartPlayerAuction(playerId);
    onNavigateToAuctionRoom();
  };

  return (
    <div className="space-y-6">
      {/* Top Controls & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-400" />
            Player Auction Pool ({players.length} Total Players)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage player categories, base prices, statistics, and bidding queue
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsImportModalOpen(true)}
            icon={<Upload className="w-4 h-4" />}
          >
            Import CSV / JSON
          </Button>
          <Button
            variant="primary"
            onClick={handleOpenAdd}
            icon={<Plus className="w-4 h-4" />}
            className="shadow-lg shadow-emerald-500/10"
          >
            Add Player
          </Button>
        </div>
      </div>

      {/* Metric Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={() => setSelectedStatus('ALL')}
          className={`p-3 rounded-xl border text-left transition-all ${
            selectedStatus === 'ALL'
              ? 'bg-slate-800 border-slate-600 shadow-md'
              : 'bg-slate-900/80 border-slate-800 hover:bg-slate-800/60'
          }`}
        >
          <span className="text-[11px] text-slate-400 block">All Players</span>
          <span className="text-xl font-bold font-mono text-slate-100">{statsCount.total}</span>
        </button>

        <button
          onClick={() => setSelectedStatus('AVAILABLE')}
          className={`p-3 rounded-xl border text-left transition-all ${
            selectedStatus === 'AVAILABLE'
              ? 'bg-emerald-950/40 border-emerald-500/60 shadow-md'
              : 'bg-slate-900/80 border-slate-800 hover:bg-slate-800/60'
          }`}
        >
          <span className="text-[11px] text-emerald-400 block">Available in Pool</span>
          <span className="text-xl font-bold font-mono text-emerald-300">{statsCount.available}</span>
        </button>

        <button
          onClick={() => setSelectedStatus('SOLD')}
          className={`p-3 rounded-xl border text-left transition-all ${
            selectedStatus === 'SOLD'
              ? 'bg-blue-950/40 border-blue-500/60 shadow-md'
              : 'bg-slate-900/80 border-slate-800 hover:bg-slate-800/60'
          }`}
        >
          <span className="text-[11px] text-blue-400 block">Sold to Teams</span>
          <span className="text-xl font-bold font-mono text-blue-300">{statsCount.sold}</span>
        </button>

        <button
          onClick={() => setSelectedStatus('UNSOLD')}
          className={`p-3 rounded-xl border text-left transition-all ${
            selectedStatus === 'UNSOLD'
              ? 'bg-rose-950/40 border-rose-500/60 shadow-md'
              : 'bg-slate-900/80 border-slate-800 hover:bg-slate-800/60'
          }`}
        >
          <span className="text-[11px] text-rose-400 block">Unsold</span>
          <span className="text-xl font-bold font-mono text-rose-300">{statsCount.unsold}</span>
        </button>

        <button
          onClick={() => setSelectedStatus('RETAINED')}
          className={`p-3 rounded-xl border text-left transition-all ${
            selectedStatus === 'RETAINED'
              ? 'bg-indigo-950/40 border-indigo-500/60 shadow-md'
              : 'bg-slate-900/80 border-slate-800 hover:bg-slate-800/60'
          }`}
        >
          <span className="text-[11px] text-indigo-400 block">Retained</span>
          <span className="text-xl font-bold font-mono text-indigo-300">{statsCount.retained}</span>
        </button>

        <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl text-left">
          <span className="text-[11px] text-amber-400 block">Overseas Pool</span>
          <span className="text-xl font-bold font-mono text-amber-300">{statsCount.overseas}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by player name, nationality, skill, or style..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Categories</option>
            <option value="ICON">Icon Players</option>
            <option value="MARQUEE">Marquee Set</option>
            <option value="A">Grade A</option>
            <option value="B">Grade B</option>
            <option value="C">Grade C</option>
            <option value="EMERGING">Emerging</option>
            <option value="UNCAPPED">Uncapped</option>
            <option value="OVERSEAS">Overseas</option>
          </select>

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Roles</option>
            <option value="BATTER">Batters</option>
            <option value="BOWLER">Bowlers</option>
            <option value="ALL_ROUNDER">All-Rounders</option>
            <option value="WICKET_KEEPER">Wicketkeepers</option>
          </select>
        </div>
      </div>

      {/* Players Table / Grid */}
      {filteredPlayers.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-8">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
            <User className="w-7 h-7" />
          </div>
          <h4 className="text-base font-bold text-slate-200">No Players Found</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-5">
            {searchQuery || selectedCategory !== 'ALL' || selectedRole !== 'ALL' || selectedStatus !== 'ALL'
              ? 'No players matched your active search or filter criteria.'
              : 'Add players manually or import our ready-to-use IPL player pool.'}
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => setIsImportModalOpen(true)} icon={<Upload className="w-4 h-4" />}>
              Import Player Pool
            </Button>
            <Button variant="primary" onClick={handleOpenAdd} icon={<Plus className="w-4 h-4" />}>
              Add Player
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[11px] font-semibold tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Order</th>
                  <th className="py-3.5 px-4">Player</th>
                  <th className="py-3.5 px-4">Role & Style</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Base Price</th>
                  <th className="py-3.5 px-4">Status / Team</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-900/60">
                {filteredPlayers.map((player) => {
                  const catBadge = getCategoryBadgeColor(player.category);
                  const statusBadge = getPlayerStatusBadge(player.status);
                  const soldTeam = player.soldToTeamId
                    ? teams.find((t) => t.id === player.soldToTeamId)
                    : player.retainedByTeamId
                    ? teams.find((t) => t.id === player.retainedByTeamId)
                    : null;

                  return (
                    <tr key={player.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Order # */}
                      <td className="py-3 px-4 font-mono text-slate-400 font-bold">
                        #{player.orderNumber || '-'}
                      </td>

                      {/* Player Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {player.photo ? (
                            <img
                              src={player.photo}
                              alt={player.name}
                              className="w-9 h-9 rounded-xl object-cover bg-slate-950 border border-slate-700"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300">
                              {player.name.substring(0, 1)}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-100 text-sm">{player.name}</span>
                              {player.isOverseas && (
                                <span className="px-1.5 py-0.2 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded text-[9px] font-bold">
                                  OS
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400">
                              {player.country} {player.age && `• ${player.age} yrs`}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role & Style */}
                      <td className="py-3 px-4">
                        <div className="text-slate-200 font-medium">{player.role}</div>
                        <div className="text-[11px] text-slate-400">
                          {player.battingStyle || 'Right Hand Bat'}
                          {player.bowlingStyle && ` • ${player.bowlingStyle}`}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${catBadge.bg} ${catBadge.text} ${catBadge.border}`}
                        >
                          {player.category}
                        </span>
                      </td>

                      {/* Base Price */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-200">
                        {formatAuctionAmount(player.basePrice, auction.currency)}
                      </td>

                      {/* Status / Sold Info */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}
                          >
                            {statusBadge.label}
                          </span>
                          {soldTeam && (
                            <div className="text-[11px] font-semibold text-slate-200 flex items-center gap-1.5">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: soldTeam.color || '#10b981' }}
                              />
                              <span>{soldTeam.shortCode}</span>
                              <span className="font-mono text-emerald-400">
                                (
                                {formatAuctionAmount(
                                  player.status === 'RETAINED'
                                    ? player.retentionPrice || player.basePrice
                                    : player.soldPrice || player.basePrice,
                                  auction.currency
                                )}
                                )
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Live Auction Stage Action */}
                          {player.status === 'AVAILABLE' && (
                            <button
                              onClick={() => handleBringToStage(player.id)}
                              className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                              title="Bring player to Live Auction stage"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              Auction
                            </button>
                          )}

                          {player.status === 'UNSOLD' && (
                            <button
                              onClick={() => onReAuctionPlayer(player.id)}
                              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                              title="Re-auction unsold player in round 2"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Re-Auction
                            </button>
                          )}

                          <button
                            onClick={() => setViewingPlayer(player)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                            title="View Player Profile Card"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleOpenEdit(player)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                            title="Edit Player"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setDeleteTargetPlayer(player)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Delete Player"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Player Modal */}
      <AuctionPlayerModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingPlayer(null);
        }}
        onSave={handleSave}
        initialPlayer={editingPlayer}
        currency={auction.currency}
      />

      {/* Batch Import Modal */}
      <AuctionPlayerImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={onImportPlayers}
      />

      {/* Player Preview Modal */}
      {viewingPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Player Auction Profile</span>
              <button
                onClick={() => setViewingPlayer(null)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex items-center gap-4">
                {viewingPlayer.photo ? (
                  <img
                    src={viewingPlayer.photo}
                    alt={viewingPlayer.name}
                    className="w-16 h-16 rounded-2xl object-cover bg-slate-950 border border-slate-700 shadow-md"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-extrabold text-2xl">
                    {viewingPlayer.name.substring(0, 1)}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-100">{viewingPlayer.name}</h3>
                    {viewingPlayer.isOverseas && (
                      <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded text-[10px] font-bold">
                        OVERSEAS
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    {viewingPlayer.country} • {viewingPlayer.role} • Category {viewingPlayer.category}
                  </p>
                  <div className="mt-1 font-mono text-xs text-emerald-400 font-bold">
                    Base Price: {formatAuctionAmount(viewingPlayer.basePrice, auction.currency)}
                  </div>
                </div>
              </div>

              {/* Stats Box */}
              {viewingPlayer.stats && (
                <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
                  <h5 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Career Stats</h5>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-2 bg-slate-900 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">Matches</span>
                      <span className="text-sm font-bold text-slate-100 font-mono">
                        {viewingPlayer.stats.matches ?? '-'}
                      </span>
                    </div>
                    <div className="p-2 bg-slate-900 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">Runs</span>
                      <span className="text-sm font-bold text-slate-100 font-mono">
                        {viewingPlayer.stats.runs ?? '-'}
                      </span>
                    </div>
                    <div className="p-2 bg-slate-900 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">Wickets</span>
                      <span className="text-sm font-bold text-slate-100 font-mono">
                        {viewingPlayer.stats.wickets ?? '-'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex justify-between items-center">
              <Button variant="ghost" onClick={() => setViewingPlayer(null)}>
                Close
              </Button>
              {viewingPlayer.status === 'AVAILABLE' && (
                <Button
                  variant="primary"
                  onClick={() => {
                    handleBringToStage(viewingPlayer.id);
                    setViewingPlayer(null);
                  }}
                  icon={<Play className="w-4 h-4 fill-current" />}
                >
                  Start Auction Now
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-100">Delete Player?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Are you sure you want to remove <span className="text-slate-200 font-semibold">{deleteTargetPlayer.name}</span> from the auction pool?
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="ghost" className="flex-1" onClick={() => setDeleteTargetPlayer(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={async () => {
                  await onDeletePlayer(deleteTargetPlayer.id);
                  setDeleteTargetPlayer(null);
                }}
              >
                Delete Player
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
