/**
 * SportsPulse - Public Auction Live Viewing Page & OBS Overlay
 */

import React, { useState, useEffect } from 'react';
import {
  Gavel,
  Radio,
  Clock,
  Shield,
  Award,
  Users,
  DollarSign,
  TrendingUp,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Auction, AuctionLiveState, AuctionTeam, AuctionPlayer } from '../../../types';
import { auctionApi } from '../../../services/api';
import { formatAuctionAmount, getCategoryBadgeColor } from '../../../utils/auctionFormatters';

export const PublicAuctionLiveView: React.FC = () => {
  const [auctionId, setAuctionId] = useState<string | null>(null);
  const [isTransparent, setIsTransparent] = useState(false);
  const [liveState, setLiveState] = useState<AuctionLiveState | null>(null);
  const [teams, setTeams] = useState<AuctionTeam[]>([]);
  const [players, setPlayers] = useState<AuctionPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extract query params
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('id');
      const transparent = params.get('transparent') === 'true';
      setAuctionId(id);
      setIsTransparent(transparent);
    }
  }, []);

  // Fetch initial live state & subscribe to SSE
  useEffect(() => {
    if (!auctionId) return;

    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const res = await auctionApi.getPublicLiveState(auctionId);
        setLiveState(res.state);

        // Fetch teams and players for roster views
        const auctionRes = await auctionApi.getAuction(auctionId);
        setTeams(auctionRes.teams || []);
        const playersRes = await auctionApi.getPlayers(auctionId);
        setPlayers(playersRes.players || []);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to connect to auction room.');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();

    // Setup SSE connection
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`/api/auctions/${auctionId}/stream`);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'INITIAL_STATE' || data.type === 'STATE_UPDATE' || data.type === 'BID_PLACED' || data.type === 'PLAYER_SOLD' || data.type === 'PLAYER_UNSOLD' || data.type === 'PLAYER_CHANGED') {
            setLiveState(data.state);
            if (data.state?.teams) {
              setTeams(data.state.teams);
            }
          }
        } catch (e) {
          // ignore parse errors
        }
      };

      eventSource.onerror = () => {
        // SSE will reconnect automatically
      };
    } catch (e) {
      // Fallback
    }

    // Polling fallback every 3s
    const pollInterval = setInterval(async () => {
      try {
        const res = await auctionApi.getPublicLiveState(auctionId);
        setLiveState(res.state);
      } catch (e) {
        // ignore
      }
    }, 3000);

    return () => {
      if (eventSource) eventSource.close();
      clearInterval(pollInterval);
    };
  }, [auctionId]);

  if (!auctionId) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-center">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md">
          <Gavel className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-100">No Auction Selected</h2>
          <p className="text-xs text-slate-400 mt-1">Please provide a valid auction ID in the URL parameter.</p>
        </div>
      </div>
    );
  }

  if (loading && !liveState) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-sm">
        Connecting to Live Auction Stream...
      </div>
    );
  }

  const auction = liveState?.auction;
  const currentPlayer = liveState?.currentPlayer;
  const currentBid = liveState?.currentBid;
  const activeGraphic = liveState?.activeGraphic;
  const leadingTeam = currentBid && teams ? teams.find((t) => t.id === currentBid.teamId) : null;

  // -------------------------------------------------------------
  // TRANSPARENT OBS OVERLAY MODE
  // -------------------------------------------------------------
  if (isTransparent) {
    return (
      <div className="w-screen h-screen bg-transparent overflow-hidden flex flex-col justify-end p-8 font-sans antialiased pointer-events-none select-none">
        {/* Active Overlay Card */}
        {currentPlayer && (
          <div className="w-full max-w-4xl mx-auto bg-slate-950/95 border-2 border-emerald-500/80 rounded-3xl p-6 shadow-2xl backdrop-blur-xl flex items-center justify-between text-white animate-in slide-in-from-bottom duration-500">
            {/* Player Info */}
            <div className="flex items-center gap-5">
              {currentPlayer.photo ? (
                <img
                  src={currentPlayer.photo}
                  alt={currentPlayer.name}
                  className="w-24 h-24 rounded-2xl object-cover border-2 border-slate-700 bg-slate-900 shadow-xl"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center font-black text-3xl text-emerald-400">
                  {currentPlayer.name.substring(0, 1)}
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 bg-emerald-500 text-slate-950 font-black rounded text-xs uppercase tracking-wider">
                    {currentPlayer.category}
                  </span>
                  {currentPlayer.isOverseas && (
                    <span className="px-2 py-0.5 bg-rose-500 text-white font-black rounded text-xs uppercase tracking-wider">
                      OVERSEAS
                    </span>
                  )}
                  <span className="text-xs text-slate-400 font-bold">{currentPlayer.role}</span>
                </div>
                <h2 className="text-3xl font-black tracking-tight">{currentPlayer.name}</h2>
                <p className="text-sm text-slate-300">
                  {currentPlayer.country} • Base Price:{' '}
                  <strong className="text-emerald-400 font-mono">
                    {formatAuctionAmount(currentPlayer.basePrice, auction?.currency)}
                  </strong>
                </p>
              </div>
            </div>

            {/* Current Highest Bid */}
            <div className="text-right pl-6 border-l border-slate-800">
              <span className="text-xs font-black tracking-widest text-emerald-400 uppercase block">
                CURRENT BID
              </span>
              <div className="text-4xl font-black font-mono text-emerald-300">
                {currentBid
                  ? formatAuctionAmount(currentBid.amount, auction?.currency)
                  : formatAuctionAmount(currentPlayer.basePrice, auction?.currency)}
              </div>
              {leadingTeam && (
                <div className="mt-1 flex items-center justify-end gap-2 text-sm font-bold text-slate-200">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: leadingTeam.color || '#10b981' }} />
                  <span>{leadingTeam.name}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // FULL PUBLIC LIVE STREAM FAN DASHBOARD
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Top TV Broadcast Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-6 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Gavel className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-slate-100">{auction?.name || 'Live Auction'}</h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/40 uppercase animate-pulse">
                  <Radio className="w-3 h-3" /> LIVE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {auction?.sport} • Official Broadcast Stream • Real-time Synchronized
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
            <span>
              Sold:{' '}
              <strong className="text-emerald-400">{players.filter((p) => p.status === 'SOLD').length}</strong>
            </span>
            <span>
              Unsold:{' '}
              <strong className="text-rose-400">{players.filter((p) => p.status === 'UNSOLD').length}</strong>
            </span>
          </div>
        </div>
      </header>

      {/* Main Fan Screen Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Stage Hero Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Hero (8 cols): Current Stage & Bid */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <span className="text-xs font-black tracking-widest text-emerald-400 uppercase flex items-center gap-2">
                  <Radio className="w-4 h-4 animate-pulse" />
                  CURRENT PLAYER ON AUCTION STAGE
                </span>

                {liveState?.timerActive && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/15 border border-amber-500/30 rounded-full text-amber-300 text-xs font-mono font-bold">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{liveState.timerSecondsRemaining ?? 15}s</span>
                  </div>
                )}
              </div>

              {currentPlayer ? (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  {/* Photo & Bio (7 cols) */}
                  <div className="md:col-span-7 flex gap-5 items-center">
                    {currentPlayer.photo ? (
                      <img
                        src={currentPlayer.photo}
                        alt={currentPlayer.name}
                        className="w-28 h-28 rounded-2xl object-cover bg-slate-950 border-2 border-slate-700 shadow-2xl"
                      />
                    ) : (
                      <div className="w-28 h-28 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center font-black text-4xl text-emerald-400">
                        {currentPlayer.name.substring(0, 1)}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                            getCategoryBadgeColor(currentPlayer.category).bg
                          } ${getCategoryBadgeColor(currentPlayer.category).text} ${
                            getCategoryBadgeColor(currentPlayer.category).border
                          }`}
                        >
                          {currentPlayer.category}
                        </span>
                        {currentPlayer.isOverseas && (
                          <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded text-[10px] font-black">
                            OVERSEAS
                          </span>
                        )}
                      </div>

                      <h2 className="text-2xl font-black text-slate-100">{currentPlayer.name}</h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {currentPlayer.country} • {currentPlayer.role}
                      </p>
                      <p className="text-xs text-slate-400 mt-1 font-mono">
                        Base Price:{' '}
                        <strong className="text-slate-200">
                          {formatAuctionAmount(currentPlayer.basePrice, auction?.currency)}
                        </strong>
                      </p>
                    </div>
                  </div>

                  {/* Big Live Bid (5 cols) */}
                  <div className="md:col-span-5 bg-slate-950/80 border border-emerald-500/40 rounded-2xl p-5 text-center space-y-2">
                    <span className="text-[11px] font-black tracking-widest text-emerald-400 uppercase block">
                      TOP BID
                    </span>
                    <div className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono tracking-tight">
                      {currentBid
                        ? formatAuctionAmount(currentBid.amount, auction?.currency)
                        : formatAuctionAmount(currentPlayer.basePrice, auction?.currency)}
                    </div>

                    {leadingTeam ? (
                      <div className="flex items-center justify-center gap-2 pt-1">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: leadingTeam.color || '#10b981' }}
                        />
                        <span className="text-xs font-bold text-slate-200">{leadingTeam.name}</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-500 block">Opening bid pending</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 text-slate-500">
                  <Gavel className="w-12 h-12 mx-auto text-slate-700 mb-2" />
                  <p className="text-sm font-bold">Waiting for next player to take the stage...</p>
                </div>
              )}
            </div>

            {/* Live Bid Stream Logs */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Live Bidding Stream
              </span>

              {liveState?.recentBids && liveState.recentBids.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {liveState.recentBids.map((b, idx) => (
                    <div
                      key={b.id || idx}
                      className="flex items-center justify-between p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-500 font-bold">#{b.bidNumber}</span>
                        <span className="font-bold text-slate-200">{b.teamName}</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-400 text-sm">
                        {formatAuctionAmount(b.amount, auction?.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500 text-xs">No active bids logged on stage.</div>
              )}
            </div>
          </div>

          {/* Right Hero (4 cols): Franchise Budget Leaderboard */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  Franchise Purse Leaderboard
                </span>
              </div>

              <div className="space-y-2.5 max-h-[65vh] overflow-y-auto pr-1">
                {teams.map((team) => (
                  <div
                    key={team.id}
                    className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: team.color || '#10b981' }}
                      />
                      <div>
                        <div className="font-bold text-slate-200 text-xs truncate">{team.name}</div>
                        <span className="text-[10px] text-slate-500">
                          Squad: {team.squadCount} (OS: {team.overseasCount})
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-mono font-extrabold text-emerald-400 text-xs">
                        {formatAuctionAmount(team.currentPurse, auction?.currency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
