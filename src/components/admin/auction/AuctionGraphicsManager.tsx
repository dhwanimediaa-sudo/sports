/**
 * SportsPulse - Auction Broadcast Graphics Studio Manager
 */

import React, { useState } from 'react';
import {
  Tv,
  Radio,
  Play,
  Square,
  Copy,
  ExternalLink,
  Sparkles,
  Sliders,
  Check,
  Eye,
} from 'lucide-react';
import { Auction, AuctionGraphicConfig, AuctionLiveState } from '../../../types';
import { Button } from '../../ui/Button';
import { formatAuctionAmount } from '../../../utils/auctionFormatters';

interface AuctionGraphicsManagerProps {
  auction: Auction;
  liveState?: AuctionLiveState;
  onTriggerGraphic: (options: { graphicType: string }) => Promise<void>;
  onClearGraphic: () => Promise<void>;
  loading?: boolean;
}

export const AuctionGraphicsManager: React.FC<AuctionGraphicsManagerProps> = ({
  auction,
  liveState,
  onTriggerGraphic,
  onClearGraphic,
  loading = false,
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [selectedOverlayType, setSelectedOverlayType] = useState<string>('PLAYER_CARD');

  // Dynamic Browser Source URL (Works on VPS, localhost, or any domain)
  const obsUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/auction-live?id=${auction.id}&transparent=true`
    : `/auction-live?id=${auction.id}&transparent=true`;

  const publicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/auction-live?id=${auction.id}`
    : `/auction-live?id=${auction.id}`;

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const overlayPresets = [
    {
      id: 'PLAYER_CARD',
      name: 'Player Introduction Card',
      desc: 'Full lower-third with player photo, stats, base price, and nationality badge.',
    },
    {
      id: 'LIVE_BID',
      name: 'Live Bidding Bar',
      desc: 'Sleek top/bottom ticker showing current highest bid, leading team logo & timer.',
    },
    {
      id: 'GOING_CALL',
      name: 'Going Once / Twice Alert',
      desc: 'High-visibility animated alert flashing countdown and final warning.',
    },
    {
      id: 'SOLD_BANNER',
      name: 'Hammer Down (SOLD) Overlay',
      desc: 'Gold & emerald celebration graphic with buyer team crest and final purchase price.',
    },
    {
      id: 'UNSOLD_BANNER',
      name: 'Unsold Player Graphic',
      desc: 'Clean graphic marking player unsold and returning to subsequent sets.',
    },
    {
      id: 'PURSE_SUMMARY',
      name: 'Franchise Purse Leaderboard',
      desc: 'Full-screen / split-screen graphic comparing remaining budgets across all franchises.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header & OBS Link */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Tv className="w-5 h-5 text-blue-400" />
              Broadcast & OBS Graphics Studio
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live broadcast overlays designed for OBS Studio, vMix, and YouTube/Twitch live streams
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={onClearGraphic}
              icon={<Square className="w-4 h-4 text-rose-400" />}
            >
              Clear Active Overlay
            </Button>
          </div>
        </div>

        {/* OBS Browser Source URL Box */}
        <div className="p-4 bg-slate-950/80 border border-blue-500/30 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              OBS / vMix Browser Source URL (Transparent Overlay):
            </span>
            <span className="text-[11px] text-slate-400">Resolution: 1920x1080 @ 60fps</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={obsUrl}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs font-mono select-all focus:outline-none"
            />
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleCopyUrl(obsUrl)}
              icon={copiedUrl ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            >
              {copiedUrl ? 'Copied!' : 'Copy'}
            </Button>
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
              title="Open Public Viewer"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Graphics Trigger Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {overlayPresets.map((preset) => (
          <div
            key={preset.id}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-100">{preset.name}</span>
                <Sparkles className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">{preset.desc}</p>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full justify-center"
              onClick={() => onTriggerGraphic({ graphicType: preset.id })}
              icon={<Play className="w-3.5 h-3.5 fill-current text-blue-400" />}
            >
              Trigger to Stream
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
