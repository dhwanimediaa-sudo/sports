import React from 'react';
import { AuctionPlayer, AuctionTeam } from '../../../types';
import {
  User,
  Shield,
  Award,
  TrendingUp,
  Hash,
  Activity,
  History,
  Sparkles,
  DollarSign,
  CheckCircle2,
  XCircle,
  X,
  Clock,
  Briefcase,
  Star,
  Layers,
} from 'lucide-react';
import { formatINR } from '../../../utils/auctionFormatters';

interface AuctionPlayerProfileModalProps {
  player: AuctionPlayer | null;
  isOpen: boolean;
  onClose: () => void;
  teams?: AuctionTeam[];
  onBringToStage?: (playerId: string) => void;
}

export const AuctionPlayerProfileModal: React.FC<AuctionPlayerProfileModalProps> = ({
  player,
  isOpen,
  onClose,
  teams = [],
  onBringToStage,
}) => {
  if (!isOpen || !player) return null;

  const soldTeam = player.soldToTeamId
    ? teams.find((t) => t.id === player.soldToTeamId)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Hero Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pb-5 border-b border-slate-800">
          {player.photoUrl ? (
            <img
              src={player.photoUrl}
              alt={player.name}
              className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-500/40 shadow-lg shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-slate-400 font-bold text-2xl shrink-0">
              <User className="w-10 h-10" />
            </div>
          )}

          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {player.category || 'General'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                Lot #{player.orderNumber || '-'}
              </span>
              {player.retainedStatus && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                  <Star className="w-3 h-3" /> Retained
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {player.name}
            </h2>
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <span className="text-emerald-400 font-semibold">{player.role}</span>
              <span>•</span>
              <span>{player.country || 'India'}</span>
              {player.age && <span>• Age {player.age}</span>}
              {player.battingStyle && <span>• {player.battingStyle}</span>}
              {player.bowlingStyle && <span>• {player.bowlingStyle}</span>}
            </p>
          </div>
        </div>

        {/* Auction Financial Status Card */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">
              Base Price
            </span>
            <span className="text-base sm:text-lg font-black font-mono text-slate-200">
              {formatINR(player.basePrice)}
            </span>
          </div>

          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">
              Auction Status
            </span>
            <div className="mt-1">
              {player.status === 'SOLD' ? (
                <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> SOLD
                </span>
              ) : player.status === 'UNSOLD' ? (
                <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 inline-flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> UNSOLD
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-blue-500/20 text-blue-300 border border-blue-500/40 inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> AVAILABLE
                </span>
              )}
            </div>
          </div>

          {player.status === 'SOLD' && (
            <div className="col-span-2 sm:col-span-1 p-3.5 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl">
              <span className="text-[10px] text-emerald-400/80 uppercase tracking-wider block font-bold">
                Sold Price ({soldTeam?.name || 'Franchise'})
              </span>
              <span className="text-base sm:text-lg font-black font-mono text-emerald-300">
                {formatINR(player.soldPrice || player.basePrice)}
              </span>
            </div>
          )}
        </div>

        {/* Career Stats Foundation */}
        {player.stats && Object.keys(player.stats).length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Career Performance Statistics</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {Object.entries(player.stats).map(([key, val]) => (
                <div
                  key={key}
                  className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl"
                >
                  <span className="text-[10px] text-slate-400 capitalize block">
                    {key.replace(/([A-Z])/g, ' $1')}
                  </span>
                  <span className="text-sm font-bold font-mono text-slate-100">{String(val)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Previous Auction Info & Retained Status */}
        {player.previousAuctionInfo && (
          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-1.5">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-amber-400" />
              <span>Previous Auction Track Record</span>
            </h4>
            <div className="grid grid-cols-3 gap-2 text-xs text-slate-400">
              <div>
                <span className="text-[10px] text-slate-500 block">Season</span>
                <span className="text-slate-200 font-semibold">{player.previousAuctionInfo.year || '2024'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Previous Team</span>
                <span className="text-slate-200 font-semibold">{player.previousAuctionInfo.previousTeam || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Previous Price</span>
                <span className="text-emerald-400 font-mono font-bold">
                  {player.previousAuctionInfo.previousPrice
                    ? formatINR(player.previousAuctionInfo.previousPrice)
                    : '—'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Highlights & Records */}
        {(player.careerHighlights?.length || player.records?.length || player.awards?.length) && (
          <div className="space-y-3 pt-1">
            {player.careerHighlights && player.careerHighlights.length > 0 && (
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Career Highlights
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {player.careerHighlights.map((h, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 bg-slate-800/80 text-slate-200 text-[11px] rounded-lg border border-slate-700"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {player.awards && player.awards.length > 0 && (
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90 block mb-1.5 flex items-center gap-1">
                  <Award className="w-3 h-3" /> Awards & Honours
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {player.awards.map((a, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 bg-amber-500/10 text-amber-300 text-[11px] rounded-lg border border-amber-500/20"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors"
          >
            Close Profile
          </button>

          {player.status === 'AVAILABLE' && onBringToStage && (
            <button
              onClick={() => {
                onBringToStage(player.id);
                onClose();
              }}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl transition-all shadow-lg"
            >
              Bring to Live Auction Stage →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
