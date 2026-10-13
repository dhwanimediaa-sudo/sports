/**
 * SportsPulse - Live Auction Room Control Center
 * Professional IPL-Style Stage, Timer, Bidding Grid, and Auctioneer Desk
 */

import React, { useState, useEffect } from 'react';
import {
  Gavel,
  Clock,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Play,
  Pause,
  AlertTriangle,
  Users,
  DollarSign,
  TrendingUp,
  Volume2,
  VolumeX,
  Radio,
  Tv,
  ArrowRight,
  Shield,
  Award,
  Sparkles,
  ChevronRight,
  Maximize2,
  Eye,
  Plus,
} from 'lucide-react';
import {
  Auction,
  AuctionTeam,
  AuctionPlayer,
  AuctionBid,
  AuctionLiveState,
  AuctionGraphicConfig,
} from '../../../types';
import { Button } from '../../ui/Button';
import {
  formatAuctionAmount,
  formatINR,
  getCategoryBadgeColor,
  getPlayerStatusBadge,
} from '../../../utils/auctionFormatters';
import { AuctionPlayerProfileModal } from './AuctionPlayerProfileModal';

interface AuctionRoomProps {
  auction: Auction;
  teams: AuctionTeam[];
  players: AuctionPlayer[];
  liveState: AuctionLiveState;
  onSetCurrentPlayer: (playerId: string) => Promise<void>;
  onPlaceBid: (teamId: string, customAmount?: number) => Promise<void>;
  onWithdrawBid: () => Promise<void>;
  onSellCurrentPlayer: () => Promise<void>;
  onMarkCurrentPlayerUnsold: (reason?: string) => Promise<void>;
  onReAuctionPlayer: (playerId: string, newBasePrice?: number) => Promise<void>;
  onStartTimer: (seconds?: number) => Promise<void>;
  onStopTimer: () => Promise<void>;
  onPauseAuction: () => Promise<void>;
  onResumeAuction: () => Promise<void>;
  onTriggerGraphic?: (graphicType: string) => Promise<void>;
  loading?: boolean;
}

export const AuctionRoom: React.FC<AuctionRoomProps> = ({
  auction,
  teams,
  players,
  liveState,
  onSetCurrentPlayer,
  onPlaceBid,
  onWithdrawBid,
  onSellCurrentPlayer,
  onMarkCurrentPlayerUnsold,
  onReAuctionPlayer,
  onStartTimer,
  onStopTimer,
  onPauseAuction,
  onResumeAuction,
  onTriggerGraphic,
  loading = false,
}) => {
  const [manualBidInput, setManualBidInput] = useState<string>('');
  const [selectedBidTeamId, setSelectedBidTeamId] = useState<string>('');
  const [showSoldConfirm, setShowSoldConfirm] = useState(false);
  const [showUnsoldConfirm, setShowUnsoldConfirm] = useState(false);
  const [unsoldReason, setUnsoldReason] = useState('No bids placed');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [localSecondsRemaining, setLocalSecondsRemaining] = useState<number>(15);
  const [profileModalPlayer, setProfileModalPlayer] = useState<AuctionPlayer | null>(null);

  const currentPlayer = liveState?.currentPlayer;
  const currentBid = liveState?.currentBid;
  const recentBids = liveState?.recentBids || [];
  const leadingTeam = currentBid ? teams.find((t) => t.id === currentBid.teamId) : null;

  // Local tick down for smooth UI rendering
  useEffect(() => {
    if (liveState?.timerActive && liveState.timerSecondsRemaining !== undefined) {
      setLocalSecondsRemaining(liveState.timerSecondsRemaining);
    }
  }, [liveState?.timerSecondsRemaining, liveState?.timerActive]);

  useEffect(() => {
    let interval: any = null;
    if (liveState?.timerActive) {
      interval = setInterval(() => {
        setLocalSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [liveState?.timerActive]);

  // Audio effects synthesizer (Clean browser audio Web API, no external files needed)
  const playSoundEffect = (type: 'BID' | 'GOING' | 'SOLD' | 'UNSOLD' | 'BUZZER') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'BID') {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'GOING') {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'SOLD') {
        // Gavel double strike
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else if (type === 'UNSOLD') {
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch (e) {
      // Audio context might be blocked by browser autoplay policy
    }
  };

  const handlePlaceQuickBid = async (team: AuctionTeam) => {
    playSoundEffect('BID');
    await onPlaceBid(team.id);
  };

  const handlePlaceManualBid = async () => {
    if (!selectedBidTeamId) return;
    const cleanNumber = Number(manualBidInput.replace(/[^0-9.]/g, ''));
    if (isNaN(cleanNumber) || cleanNumber <= 0) return;

    playSoundEffect('BID');
    await onPlaceBid(selectedBidTeamId, cleanNumber);
    setManualBidInput('');
  };

  const handleAddManualDelta = (delta: number) => {
    const base = currentBid ? currentBid.amount : currentPlayer ? currentPlayer.basePrice : 0;
    const currentManual = manualBidInput ? Number(manualBidInput.replace(/[^0-9.]/g, '')) : base;
    const target = (isNaN(currentManual) ? base : currentManual) + delta;
    setManualBidInput(target.toString());
  };

  const handleConfirmSold = async () => {
    playSoundEffect('SOLD');
    await onSellCurrentPlayer();
    setShowSoldConfirm(false);
  };

  const handleConfirmUnsold = async () => {
    playSoundEffect('UNSOLD');
    await onMarkCurrentPlayerUnsold(unsoldReason);
    setShowUnsoldConfirm(false);
  };

  // Next eligible amount to display on team buttons
  const getNextBidAmount = () => {
    if (!currentPlayer) return 0;
    if (!currentBid) return currentPlayer.basePrice;

    const currentAmt = currentBid.amount;
    if (auction.currency === 'INR') {
      if (currentAmt < 1000000) return currentAmt + 50000;
      if (currentAmt < 5000000) return currentAmt + 100000;
      if (currentAmt < 10000000) return currentAmt + 200000;
      if (currentAmt < 20000000) return currentAmt + 500000;
      if (currentAmt < 50000000) return currentAmt + 1000000;
      if (currentAmt < 100000000) return currentAmt + 2500000;
      return currentAmt + 5000000;
    }
    return currentAmt + 50000;
  };

  const nextBidAmount = getNextBidAmount();

  // Upcoming queue
  const availableQueue = players.filter((p) => p.status === 'AVAILABLE');

  return (
    <div className="space-y-6">
      {/* Top Live Bar & Broadcaster Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 bg-rose-500/20 border border-rose-500/50 rounded-full">
            <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
            <span className="text-xs font-black tracking-wider text-rose-400 uppercase font-mono">
              LIVE AUCTION DESK (INR ₹)
            </span>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
            <span>{auction.name}</span>
            <span>•</span>
            <span className="font-mono text-emerald-400 font-bold">
              {players.filter((p) => p.status === 'SOLD').length} Sold / {players.length} Total
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border transition-colors ${
              soundEnabled
                ? 'bg-slate-800 border-slate-700 text-emerald-400'
                : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
            title={soundEnabled ? 'Sound Effects Active' : 'Sound Effects Muted'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Pause / Resume */}
          {auction.status === 'PAUSED' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onResumeAuction}
              icon={<Play className="w-3.5 h-3.5 fill-current text-emerald-400" />}
            >
              Resume Auction
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={onPauseAuction}
              icon={<Pause className="w-3.5 h-3.5 text-amber-400" />}
            >
              Pause
            </Button>
          )}

          {/* Graphics Trigger Quick Actions */}
          {onTriggerGraphic && (
            <div className="flex gap-1.5">
              <button
                onClick={() => onTriggerGraphic('PLAYER_CARD')}
                className="px-2.5 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/40 text-blue-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                title="Send Player Info Card to Broadcast Overlay"
              >
                <Tv className="w-3.5 h-3.5" />
                Overlay Card
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main 3-Pane Live Stage Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* PANE 1 (Left 4 cols): CURRENT PLAYER ON STAGE */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Gavel className="w-3.5 h-3.5 text-emerald-400" />
                Current Player on Stage
              </span>
              {currentPlayer && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setProfileModalPlayer(currentPlayer)}
                    title="View Full Profile & Career Stats"
                    className="p-1 text-slate-400 hover:text-emerald-400 bg-slate-800 rounded-md transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    Lot #{currentPlayer.orderNumber || 1}
                  </span>
                </div>
              )}
            </div>

            {currentPlayer ? (
              <div className="p-5 space-y-4">
                {/* Photo & Main Info */}
                <div className="flex gap-4 items-center">
                  <div
                    className="relative cursor-pointer group"
                    onClick={() => setProfileModalPlayer(currentPlayer)}
                  >
                    {currentPlayer.photoUrl || (currentPlayer as any).photo ? (
                      <img
                        src={currentPlayer.photoUrl || (currentPlayer as any).photo}
                        alt={currentPlayer.name}
                        className="w-20 h-20 rounded-2xl object-cover bg-slate-950 border border-slate-700 shadow-xl group-hover:border-emerald-500 transition-all"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-black text-2xl text-emerald-400 group-hover:border-emerald-500 transition-all">
                        {currentPlayer.name.substring(0, 1)}
                      </div>
                    )}
                    {currentPlayer.isOverseas && (
                      <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 bg-rose-500 text-white rounded font-bold text-[9px] shadow">
                        OS
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3
                      onClick={() => setProfileModalPlayer(currentPlayer)}
                      className="text-lg font-black text-slate-100 truncate cursor-pointer hover:text-emerald-400 transition-colors"
                    >
                      {currentPlayer.name}
                    </h3>
                    <p className="text-xs text-slate-400">{currentPlayer.country || 'India'} • {currentPlayer.role}</p>

                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          getCategoryBadgeColor(currentPlayer.category).bg
                        } ${getCategoryBadgeColor(currentPlayer.category).text} ${
                          getCategoryBadgeColor(currentPlayer.category).border
                        }`}
                      >
                        {currentPlayer.category}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        Base: <strong className="text-slate-200">{formatINR(currentPlayer.basePrice)}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Skill & Style Details */}
                <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-500">Batting / Style:</span>
                    <span className="font-medium">{currentPlayer.battingStyle || 'Right Hand'}</span>
                  </div>
                  {currentPlayer.bowlingStyle && (
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-500">Bowling:</span>
                      <span className="font-medium">{currentPlayer.bowlingStyle}</span>
                    </div>
                  )}
                  {currentPlayer.age && (
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-500">Age:</span>
                      <span className="font-medium">{currentPlayer.age} Yrs</span>
                    </div>
                  )}
                </div>

                {/* Switch Next Player Select Dropdown */}
                <div className="space-y-1.5 pt-1 border-t border-slate-800">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Switch Player on Stage:
                  </label>
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) onSetCurrentPlayer(e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Choose Next Player --</option>
                    {availableQueue.map((p) => (
                      <option key={p.id} value={p.id}>
                        Lot #{p.orderNumber || '-'} {p.name} ({p.role} - {formatINR(p.basePrice)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center space-y-4">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                  <Gavel className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-200 text-sm">No Player on Stage</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Select an available player from the upcoming pool below to start live bidding.
                  </p>
                </div>

                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) onSetCurrentPlayer(e.target.value);
                  }}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-emerald-500/50 rounded-xl text-emerald-300 font-bold text-xs focus:outline-none"
                >
                  <option value="">-- Bring First Player to Stage --</option>
                  {availableQueue.map((p) => (
                    <option key={p.id} value={p.id}>
                      Lot #{p.orderNumber || '-'} {p.name} ({p.role} - {formatINR(p.basePrice)})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Upcoming Queue Preview */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Up Next in Pool ({availableQueue.length})
              </span>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {availableQueue.slice(0, 6).map((p, idx) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs hover:bg-slate-800/50 transition-colors"
                >
                  <div
                    onClick={() => setProfileModalPlayer(p)}
                    className="flex items-center gap-2 truncate cursor-pointer flex-1"
                  >
                    <span className="font-mono text-slate-500 w-4">#{idx + 1}</span>
                    <span className="font-semibold text-slate-200 truncate hover:text-emerald-400">{p.name}</span>
                    <span className="text-[10px] text-slate-400">({p.role})</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setProfileModalPlayer(p)}
                      title="View Profile"
                      className="p-1 text-slate-400 hover:text-white bg-slate-800 rounded-md"
                    >
                      <Eye className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onSetCurrentPlayer(p.id)}
                      className="px-2 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-lg text-[11px] font-bold transition-colors"
                    >
                      Stage →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* PANE 2 (Center 5 cols): BIG LIVE BID DISPLAY & AUCTIONEER HAMMER */}
        <div className="lg:col-span-5 space-y-4">
          {/* Main Giant Bidding Board */}
          <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-emerald-500/30 rounded-3xl p-6 shadow-2xl space-y-5 text-center relative overflow-hidden">
            {/* Ambient Lighting */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Stage Status */}
            <div className="flex items-center justify-center gap-2">
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full text-xs font-black uppercase tracking-widest animate-pulse">
                CURRENT HIGHEST BID
              </span>
            </div>

            {/* Big Amount */}
            <div className="py-2">
              <div className="text-4xl sm:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-200 to-emerald-400 font-mono tracking-tight">
                {currentBid
                  ? formatINR(currentBid.amount)
                  : currentPlayer
                  ? formatINR(currentPlayer.basePrice)
                  : '—'}
              </div>
              <span className="text-xs text-slate-400 font-medium block mt-1">
                {currentBid
                  ? `${currentBid.bidNumber} Bid${currentBid.bidNumber > 1 ? 's' : ''} Placed`
                  : currentPlayer
                  ? 'Opening Base Price'
                  : 'Awaiting Player'}
              </span>
            </div>

            {/* Leading Team Display */}
            {leadingTeam ? (
              <div className="p-3.5 bg-slate-950/80 border border-slate-700/70 rounded-2xl flex items-center justify-center gap-3">
                {leadingTeam.logo ? (
                  <img src={leadingTeam.logo} alt={leadingTeam.name} className="w-8 h-8 rounded-lg object-contain" />
                ) : (
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs border"
                    style={{
                      backgroundColor: `${leadingTeam.color}30`,
                      borderColor: `${leadingTeam.color}70`,
                      color: leadingTeam.color,
                    }}
                  >
                    {leadingTeam.shortCode}
                  </div>
                )}
                <div className="text-left">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Leading Bidder</span>
                  <span className="text-sm font-bold text-slate-100">{leadingTeam.name}</span>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-950/40 border border-dashed border-slate-800 rounded-2xl text-xs text-slate-400">
                No active bids placed yet. First bid will start at base price.
              </div>
            )}

            {/* Countdown Timer Visual */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs px-2">
                <span className="text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  Bidding Countdown
                </span>
                <span
                  className={`font-mono font-black text-sm ${
                    localSecondsRemaining <= 5 ? 'text-rose-400 animate-ping' : 'text-emerald-400'
                  }`}
                >
                  {localSecondsRemaining}s
                </span>
              </div>

              <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    localSecondsRemaining <= 5
                      ? 'bg-rose-500'
                      : localSecondsRemaining <= 10
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(0, (localSecondsRemaining / (auction.timerDurationSeconds || 15)) * 100)
                    )}%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  onClick={() => onStartTimer(15)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors"
                >
                  Reset (15s)
                </button>
                <button
                  onClick={() => onStartTimer(5)}
                  className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-xs font-semibold border border-amber-500/40 transition-colors"
                >
                  Final Call (5s)
                </button>
                <button
                  onClick={onStopTimer}
                  className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-slate-400 rounded-lg text-xs font-semibold border border-slate-800 transition-colors"
                >
                  Stop
                </button>
              </div>
            </div>

            {/* Auctioneer Stage Action Buttons */}
            <div className="pt-3 grid grid-cols-2 gap-3">
              {/* SOLD BUTTON */}
              <button
                disabled={!currentPlayer || !currentBid}
                onClick={() => setShowSoldConfirm(true)}
                className={`py-3.5 px-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all ${
                  currentPlayer && currentBid
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 active:scale-95'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
                Hammer Down (SOLD)
              </button>

              {/* UNSOLD BUTTON */}
              <button
                disabled={!currentPlayer}
                onClick={() => setShowUnsoldConfirm(true)}
                className={`py-3.5 px-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all ${
                  currentPlayer
                    ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20 active:scale-95'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                }`}
              >
                <XCircle className="w-5 h-5" />
                Mark UNSOLD
              </button>
            </div>

            {/* Auctioneer Sound Calls & Undo */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <div className="flex gap-2">
                <button
                  onClick={() => playSoundEffect('GOING')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-xs font-bold transition-colors"
                >
                  "Going Once!"
                </button>
                <button
                  onClick={() => playSoundEffect('GOING')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-300 rounded-lg text-xs font-bold transition-colors"
                >
                  "Going Twice!"
                </button>
              </div>

              {currentBid && (
                <button
                  onClick={onWithdrawBid}
                  className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 font-medium transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Undo Last Bid
                </button>
              )}
            </div>
          </div>

          {/* Live Bid Stream Logs */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Recent Bid Stream ({recentBids.length})
            </span>

            {recentBids.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">No bids recorded for current player.</div>
            ) : (
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {recentBids.map((b, idx) => (
                  <div
                    key={b.id || idx}
                    className="flex items-center justify-between p-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-500 font-bold">#{b.bidNumber}</span>
                      <span className="font-bold text-slate-200">{b.teamName}</span>
                    </div>
                    <div className="font-mono font-bold text-emerald-400">
                      {formatINR(b.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* PANE 3 (Right 3 cols): ALL TEAMS QUICK-BIDDING PAD */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                Team Bidding Panel
              </span>
              <span className="text-[11px] font-mono text-emerald-400 font-bold">
                Next: {formatINR(nextBidAmount)}
              </span>
            </div>

            {/* Team Buttons Grid */}
            <div className="space-y-2 max-h-[42vh] overflow-y-auto pr-1">
              {teams.map((team) => {
                const maxSquad = team.maxSquadSize || auction.maxSquadSize || 25;
                const isFull = team.squadCount >= maxSquad;
                const isLeading = currentBid?.teamId === team.id;
                const hasPurse = team.currentPurse >= nextBidAmount;
                const canBid = currentPlayer && !isLeading && !isFull && hasPurse;

                return (
                  <div
                    key={team.id}
                    className={`p-3 rounded-xl border transition-all ${
                      isLeading
                        ? 'bg-emerald-950/40 border-emerald-500 shadow-md ring-1 ring-emerald-500/50'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: team.color || '#10b981' }}
                        />
                        <span className="font-bold text-slate-200 text-xs truncate">{team.name}</span>
                      </div>
                      <span className="font-mono font-bold text-slate-300 text-xs">
                        {formatINR(team.currentPurse)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">
                        Squad: {team.squadCount}/{maxSquad} (OS: {team.overseasCount})
                      </span>

                      {isLeading ? (
                        <span className="px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded font-bold text-[10px] border border-emerald-500/40">
                          LEADING
                        </span>
                      ) : (
                        <button
                          disabled={!canBid}
                          onClick={() => handlePlaceQuickBid(team)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                            canBid
                              ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow active:scale-95'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                          }`}
                        >
                          Bid {formatINR(nextBidAmount)}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* MANUAL INR BID ENTRY (No Forced Increments) */}
            <div className="pt-3 border-t border-slate-800 space-y-2.5">
              <label className="block text-[11px] font-black text-emerald-400 uppercase tracking-wider">
                Manual INR Bid Entry (₹):
              </label>

              {/* Quick Delta Increment Pills */}
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => handleAddManualDelta(50000)}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono rounded border border-slate-700"
                >
                  +₹50K
                </button>
                <button
                  type="button"
                  onClick={() => handleAddManualDelta(100000)}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono rounded border border-slate-700"
                >
                  +₹1L
                </button>
                <button
                  type="button"
                  onClick={() => handleAddManualDelta(500000)}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono rounded border border-slate-700"
                >
                  +₹5L
                </button>
                <button
                  type="button"
                  onClick={() => handleAddManualDelta(1000000)}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono rounded border border-slate-700"
                >
                  +₹10L
                </button>
                <button
                  type="button"
                  onClick={() => handleAddManualDelta(5000000)}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono rounded border border-slate-700"
                >
                  +₹50L
                </button>
                <button
                  type="button"
                  onClick={() => handleAddManualDelta(10000000)}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono rounded border border-slate-700"
                >
                  +₹1Cr
                </button>
              </div>

              <div className="flex gap-2">
                <select
                  value={selectedBidTeamId}
                  onChange={(e) => setSelectedBidTeamId(e.target.value)}
                  className="w-1/2 px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Choose Team</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.shortCode} - {t.name}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  placeholder="Exact ₹ (e.g. 7500000)"
                  value={manualBidInput}
                  onChange={(e) => setManualBidInput(e.target.value)}
                  className="w-1/2 px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              {manualBidInput && Number(manualBidInput) > 0 && (
                <div className="text-[11px] text-emerald-400 font-mono px-1">
                  Preview: <strong>{formatINR(Number(manualBidInput))}</strong>
                </div>
              )}

              <Button
                variant="emerald"
                size="sm"
                className="w-full font-bold"
                disabled={!selectedBidTeamId || !manualBidInput || Number(manualBidInput) <= 0}
                onClick={handlePlaceManualBid}
              >
                Place Custom INR Bid
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* SOLD CONFIRMATION MODAL */}
      {showSoldConfirm && currentPlayer && currentBid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-slate-900 border border-emerald-500/50 rounded-2xl p-6 shadow-2xl space-y-5 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
              <Gavel className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs font-black tracking-widest text-emerald-400 uppercase">
                CONFIRM PLAYER SALE
              </span>
              <h3 className="text-xl font-black text-slate-100 mt-1">{currentPlayer.name}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{currentPlayer.country || 'India'} • {currentPlayer.role}</p>
            </div>

            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
              <div className="text-xs text-slate-400">Sold To Franchise:</div>
              <div className="text-lg font-black text-slate-100">{currentBid.teamName}</div>
              <div className="text-2xl font-black font-mono text-emerald-400">
                {formatINR(currentBid.amount)}
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setShowSoldConfirm(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black"
                onClick={handleConfirmSold}
              >
                Hammer Down (CONFIRM)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* UNSOLD CONFIRMATION MODAL */}
      {showUnsoldConfirm && currentPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-slate-900 border border-rose-500/50 rounded-2xl p-6 shadow-2xl space-y-5 text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto">
              <XCircle className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs font-black tracking-widest text-rose-400 uppercase">
                CONFIRM UNSOLD PLAYER
              </span>
              <h3 className="text-xl font-black text-slate-100 mt-1">{currentPlayer.name}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Player will be moved to the Unsold Pool and can be re-auctioned later in accelerated rounds.
              </p>
            </div>

            <div className="text-left space-y-1">
              <label className="block text-xs font-medium text-slate-300">Reason (Optional)</label>
              <input
                type="text"
                value={unsoldReason}
                onChange={(e) => setUnsoldReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-xs focus:outline-none"
              />
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setShowUnsoldConfirm(false)}>
                Cancel
              </Button>
              <Button variant="danger" className="flex-1" onClick={handleConfirmUnsold}>
                Confirm Unsold
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Auction Player Profile Modal */}
      <AuctionPlayerProfileModal
        isOpen={Boolean(profileModalPlayer)}
        player={profileModalPlayer}
        teams={teams}
        onClose={() => setProfileModalPlayer(null)}
        onBringToStage={async (playerId) => {
          await onSetCurrentPlayer(playerId);
        }}
      />
    </div>
  );
};
