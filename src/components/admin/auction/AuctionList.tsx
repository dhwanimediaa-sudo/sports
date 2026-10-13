/**
 * SportsPulse - Auction List & Hub
 */

import React, { useState } from 'react';
import {
  Gavel,
  Plus,
  Play,
  Settings,
  Copy,
  Trash2,
  Edit2,
  ExternalLink,
  Users,
  DollarSign,
  Calendar,
  Check,
  Search,
  Sparkles,
} from 'lucide-react';
import { Auction } from '../../../types';
import { Button } from '../../ui/Button';
import { formatAuctionAmount, getAuctionStatusBadge } from '../../../utils/auctionFormatters';

interface AuctionListProps {
  auctions: (Auction & {
    teamsCount: number;
    playersCount: number;
    soldCount: number;
    unsoldCount: number;
    totalSpent: number;
  })[];
  onCreateAuction: () => void;
  onSelectAuction: (auction: Auction) => void;
  onEnterLiveRoom: (auction: Auction) => void;
  onEditAuction: (auction: Auction) => void;
  onDuplicateAuction: (auctionId: string) => Promise<void>;
  onDeleteAuction: (auctionId: string) => Promise<void>;
  loading?: boolean;
}

export const AuctionList: React.FC<AuctionListProps> = ({
  auctions,
  onCreateAuction,
  onSelectAuction,
  onEnterLiveRoom,
  onEditAuction,
  onDuplicateAuction,
  onDeleteAuction,
  loading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredAuctions = auctions.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.sport && a.sport.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (a.season && a.season.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCopyPublicUrl = (auctionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/auction-live?id=${auctionId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(auctionId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Gavel className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-100">Professional Player Auction Center</h2>
              <p className="text-xs text-slate-400">
                IPL-style real-time player bidding engine, team purse management, and broadcast overlays
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="primary"
          onClick={onCreateAuction}
          icon={<Plus className="w-4 h-4" />}
          className="shadow-lg shadow-emerald-500/20"
        >
          Create New Auction
        </Button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-3 rounded-2xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search auctions by title, season, sport..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Auction Cards Grid */}
      {filteredAuctions.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl p-8 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Gavel className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-200">No Auctions Created</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              Create your first standalone player auction event to configure franchise budgets, import star players, and launch the live bidding room.
            </p>
          </div>
          <Button variant="primary" onClick={onCreateAuction} icon={<Plus className="w-4 h-4" />}>
            Create Auction Event
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAuctions.map((auction) => {
            const statusBadge = getAuctionStatusBadge(auction.status);

            return (
              <div
                key={auction.id}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl hover:border-slate-700 transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Status Badge & Date */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold border ${statusBadge.bg}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${statusBadge.dotColor}`} />
                      {statusBadge.label}
                    </span>

                    <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      {auction.date || 'TBD'}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-extrabold text-slate-100 group-hover:text-emerald-400 transition-colors line-clamp-1">
                    {auction.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {auction.season && `Season ${auction.season} • `}
                    {auction.sport} Auction
                    {auction.venue && ` • ${auction.venue}`}
                  </p>

                  {/* Quick Metrics */}
                  <div className="grid grid-cols-3 gap-2 my-5 p-3 bg-slate-950/70 border border-slate-800 rounded-2xl text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Teams</span>
                      <span className="text-sm font-extrabold font-mono text-slate-200">
                        {auction.teamsCount ?? 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Players</span>
                      <span className="text-sm font-extrabold font-mono text-slate-200">
                        {auction.playersCount ?? 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Sold / Unsold</span>
                      <span className="text-sm font-extrabold font-mono text-emerald-400">
                        {auction.soldCount ?? 0} / {auction.unsoldCount ?? 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onEnterLiveRoom(auction)}
                      icon={<Play className="w-3.5 h-3.5 fill-current" />}
                      className="justify-center font-bold"
                    >
                      Enter Live Stage
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSelectAuction(auction)}
                      icon={<Settings className="w-3.5 h-3.5" />}
                      className="justify-center"
                    >
                      Dashboard
                    </Button>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={(e) => handleCopyPublicUrl(auction.id, e)}
                      className="text-[11px] text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors"
                      title="Copy Public Live Viewing Link"
                    >
                      {copiedId === auction.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400 font-semibold">URL Copied!</span>
                        </>
                      ) : (
                        <>
                          <ExternalLink className="w-3 h-3" />
                          <span>Public URL</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEditAuction(auction)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                        title="Edit Auction"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDuplicateAuction(auction.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                        title="Duplicate Auction"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteAuction(auction.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete Auction"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
