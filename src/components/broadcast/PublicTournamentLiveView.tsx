/**
 * SportsPulse - Public Tournament Live Presentation & Spectator Center
 * 
 * Served at: /tournament-live/:tournamentId
 * Public viewer portal displaying live ceremony cards, championship podium,
 * live scoreboards, match center, standings, fixtures, brackets, leaderboards,
 * awards, and full-screen Smart TV mode.
 */

import React, { useState, useEffect } from 'react';
import {
  Tournament,
  TournamentHallOfFameData,
  TournamentAwardItem,
  TournamentRecordDetail,
  TournamentPresentationEvent,
  Match,
} from '../../types';
import { api } from '../../services/api';
import { Badge } from '../ui/Badge';
import { PublicLiveMatchCard } from '../public-tournament/PublicLiveMatchCard';
import { PublicMatchCenterModal } from '../public-tournament/PublicMatchCenterModal';
import { PublicStandingsTable } from '../public-tournament/PublicStandingsTable';
import { PublicFixturesResultsView } from '../public-tournament/PublicFixturesResultsView';
import { PublicKnockoutBracketView } from '../public-tournament/PublicKnockoutBracketView';
import { PublicLeaderboardsGrid } from '../public-tournament/PublicLeaderboardsGrid';
import { PublicPodiumAwardsView } from '../public-tournament/PublicPodiumAwardsView';
import { PublicTVDisplayMode } from '../public-tournament/PublicTVDisplayMode';
import { PublicShareModal } from '../public-tournament/PublicShareModal';
import {
  Trophy,
  Crown,
  Medal,
  Award,
  Flame,
  Star,
  MapPin,
  Calendar,
  Sparkles,
  Info,
  Shield,
  Zap,
  Radio,
  Share2,
  Tv,
  Users,
  Clock,
  RefreshCw,
  Search,
  ExternalLink,
} from 'lucide-react';

export const PublicTournamentLiveView: React.FC = () => {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  
  // Extract tournamentId from URL: /tournament-live/:tournamentId or /tournament-live/:tournamentId/match/:matchId
  const pathParts = pathname.split('/tournament-live/')[1]?.split('?')[0]?.split('/') || [];
  const tournamentId = pathParts[0] || '';
  const deepMatchId = pathParts[1] === 'match' ? pathParts[2] : null;

  const [data, setData] = useState<{
    tournament: Tournament;
    hallOfFame: TournamentHallOfFameData;
    awards: TournamentAwardItem[];
    records: TournamentRecordDetail[];
  } | null>(null);

  const [dashboardData, setDashboardData] = useState<any | null>(null);
  const [activeOverlayEvent, setActiveOverlayEvent] = useState<TournamentPresentationEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'MATCHES' | 'STANDINGS' | 'FIXTURES' | 'BRACKET' | 'LEADERBOARDS' | 'AWARDS'>('OVERVIEW');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(deepMatchId || null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isTvMode, setIsTvMode] = useState(searchParams.get('display') === 'tv');
  const [isConnectedSSE, setIsConnectedSSE] = useState(false);

  // Fetch initial tournament data
  const loadTournamentData = async () => {
    if (!tournamentId) return;
    try {
      setLoading(true);
      setError(null);

      // Fetch presentation and dashboard data in parallel
      const [presRes, dashRes] = await Promise.all([
        api.getTournamentPresentationData(tournamentId).catch((err) => {
          console.warn('Presentation data fetch note:', err);
          return null;
        }),
        api.getTournamentDashboard(tournamentId).catch((err) => {
          console.warn('Dashboard fetch note:', err);
          return null;
        }),
      ]);

      if (presRes) {
        setData(presRes);
        if (presRes.tournament?.name) {
          document.title = `${presRes.tournament.name} — Live Tournament Spectator Center`;
        }
      }

      if (dashRes) {
        setDashboardData(dashRes);
      }
    } catch (err: any) {
      console.error('Failed to load tournament spectator data:', err);
      setError(err.message || 'Unable to connect to tournament viewer.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTournamentData();

    if (!tournamentId) return;

    // Connect to Tournament SSE Stream
    const eventSource = new EventSource(`/api/tournaments/${tournamentId}/presentation/sse`);

    eventSource.onopen = () => {
      setIsConnectedSSE(true);
    };

    eventSource.onmessage = (e) => {
      try {
        const payload: TournamentPresentationEvent = JSON.parse(e.data);
        if (payload.type === 'CLEAR') {
          setActiveOverlayEvent(null);
        } else if (payload.type === 'CONNECTED') {
          setIsConnectedSSE(true);
        } else {
          setActiveOverlayEvent(payload);
          // Refresh presentation data if award/champion event triggered
          if (['CHAMPION_CROWN', 'AWARD_REVEAL', 'TROPHY_LIFT'].includes(payload.type)) {
            api.getTournamentPresentationData(tournamentId).then((r: any) => r && setData(r)).catch(() => {});
          }
        }
      } catch (err) {
        console.error('Failed to parse SSE in public view:', err);
      }
    };

    eventSource.onerror = () => {
      setIsConnectedSSE(false);
    };

    return () => {
      eventSource.close();
    };
  }, [tournamentId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <Trophy className="w-16 h-16 text-amber-400 animate-bounce" />
            <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-xl animate-pulse" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-black text-slate-100 uppercase tracking-wide">
              Connecting to Live Tournament Center...
            </h2>
            <p className="text-xs text-slate-400">Loading scores, standings, and spectator stream</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data?.tournament) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl">
          <Trophy className="w-12 h-12 text-rose-400 mx-auto" />
          <div className="space-y-1">
            <h2 className="text-lg font-black text-slate-100">Tournament Portal Unavailable</h2>
            <p className="text-xs text-slate-400">{error || 'Tournament ID not found or not published.'}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const { tournament, hallOfFame, awards, records } = data;
  const matches: Match[] = dashboardData?.matches || [];
  const standings = dashboardData?.standings || { groups: [], overall: [] };
  const leaderboards = dashboardData?.leaderboards || {};
  const bracket = dashboardData?.bracket || null;

  const liveMatches = matches.filter(
    (m) => m.status === 'LIVE'
  );

  // If Smart TV mode is activated
  if (isTvMode) {
    return (
      <PublicTVDisplayMode
        tournament={tournament}
        liveMatches={liveMatches}
        standings={standings}
        leaderboards={leaderboards}
        hallOfFame={hallOfFame}
        awards={awards}
        onExit={() => setIsTvMode(false)}
        onOpenMatch={(id) => setSelectedMatchId(id)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* REAL-TIME CEREMONY PRESENTATION OVERLAY BANNER */}
      {activeOverlayEvent && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-slate-950 px-4 py-2.5 shadow-lg sticky top-0 z-40 flex items-center justify-between text-xs font-black animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2 max-w-6xl mx-auto w-full justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
              <span>LIVE CEREMONY EVENT: {activeOverlayEvent.title}</span>
            </div>
            <span className="font-mono text-[11px] uppercase tracking-wider bg-slate-950/20 px-2 py-0.5 rounded-md">
              {activeOverlayEvent.data?.playerName || activeOverlayEvent.data?.teamName || 'Official Update'}
            </span>
          </div>
        </div>
      )}

      {/* PUBLIC PORTAL HEADER */}
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur-md sticky top-0 z-30 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Tournament Identity & Meta */}
          <div className="flex items-center gap-3.5 text-center sm:text-left w-full md:w-auto justify-center sm:justify-start">
            {tournament.logoUrl ? (
              <img
                src={tournament.logoUrl}
                alt={tournament.name}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-500/60 shadow-xl flex-shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border-2 border-amber-500/60 flex items-center justify-center text-3xl font-black text-amber-400 flex-shrink-0">
                🏆
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                <h1 className="text-lg sm:text-xl font-black text-slate-100 tracking-tight">
                  {tournament.name}
                </h1>
                {liveMatches.length > 0 ? (
                  <Badge variant="success" className="font-bold animate-pulse text-[10px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-1 inline-block" />
                    LIVE MATCHES
                  </Badge>
                ) : (
                  <Badge variant="warning" className="font-bold text-[10px]">
                    OFFICIAL PORTAL
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 justify-center sm:justify-start flex-wrap">
                <span className="font-bold text-slate-300">{tournament.sport}</span>
                <span>•</span>
                <span>Season {tournament.season || '2026'}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-500" />
                  {tournament.venue || tournament.location || 'Championship Arena'}
                </span>
              </div>

              {tournament.sponsor && (
                <div className="text-[11px] text-amber-400 font-semibold mt-0.5">
                  Presented by <span className="font-bold text-amber-300">{tournament.sponsor}</span>
                </div>
              )}
            </div>
          </div>

          {/* Connection Status & Action Controls */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {/* Live Indicator */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-bold">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnectedSSE ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className="text-slate-300">{isConnectedSSE ? 'Live Feed' : 'Connecting'}</span>
            </div>

            {/* TV Mode Button */}
            <button
              onClick={() => setIsTvMode(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold transition-colors"
              title="Switch to Big Screen / TV Spectator Mode"
            >
              <Tv className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">TV Mode</span>
            </button>

            {/* Share Tournament Button */}
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md shadow-amber-500/20 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
          </div>
        </div>

        {/* NAVIGATION TAB BAR */}
        <div className="max-w-6xl mx-auto px-4 overflow-x-auto">
          <div className="flex items-center gap-1 border-t border-slate-800/80 pt-1 pb-2">
            {[
              { id: 'OVERVIEW', label: 'Overview', icon: Sparkles },
              { id: 'MATCHES', label: `Live Matches (${liveMatches.length})`, icon: Radio, highlight: liveMatches.length > 0 },
              { id: 'STANDINGS', label: 'Standings', icon: Shield },
              { id: 'FIXTURES', label: 'Fixtures & Results', icon: Calendar },
              { id: 'BRACKET', label: 'Knockout Bracket', icon: Trophy },
              { id: 'LEADERBOARDS', label: 'Leaderboards', icon: Flame },
              { id: 'AWARDS', label: 'Podium & Awards', icon: Award },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`nav-tab-${tab.id.toLowerCase()}`}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : tab.highlight
                      ? 'text-emerald-400 bg-emerald-950/30 border border-emerald-500/30 hover:bg-emerald-900/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* MAIN VIEW CONTAINER */}
      <main className="max-w-6xl mx-auto px-4 py-6 flex-1 w-full space-y-6">
        {/* 1. TAB: OVERVIEW */}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-6">
            {/* Live Matches Hero Section */}
            {liveMatches.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <h2 className="text-sm font-black uppercase text-slate-100 tracking-wider">
                      Ongoing Live Matches
                    </h2>
                  </div>
                  <button
                    onClick={() => setActiveTab('MATCHES')}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-bold"
                  >
                    View All ({liveMatches.length}) →
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {liveMatches.map((m) => (
                    <PublicLiveMatchCard
                      key={m.id}
                      match={m}
                      onOpenMatch={(id) => setSelectedMatchId(id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Quick Standings & Top Leaders Split */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Standings Snippet (2 cols on lg) */}
              <div className="lg:col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-amber-400" />
                    <h2 className="text-sm font-black uppercase text-slate-100 tracking-wider">
                      Standings Preview
                    </h2>
                  </div>
                  <button
                    onClick={() => setActiveTab('STANDINGS')}
                    className="text-xs text-amber-400 hover:text-amber-300 font-bold"
                  >
                    Full Table →
                  </button>
                </div>

                <PublicStandingsTable tournament={tournament} standings={standings} />
              </div>

              {/* Top Performer Card & Quick Info (1 col on lg) */}
              <div className="space-y-5">
                {/* Tournament Champion or Top Award */}
                <div className="rounded-3xl p-6 bg-gradient-to-b from-amber-500/20 via-slate-900 to-slate-950 border-2 border-amber-500/60 shadow-xl text-center space-y-3">
                  <Trophy className="w-10 h-10 text-amber-400 mx-auto" />
                  <span className="text-[10px] uppercase font-black tracking-widest text-amber-400 block">
                    {tournament.status === 'COMPLETED' ? 'Tournament Winner' : 'Championship Title'}
                  </span>
                  <h3 className="text-xl font-black text-slate-100">
                    {hallOfFame?.champion?.teamName || 'In Competition'}
                  </h3>
                  <p className="text-xs text-amber-300">
                    {hallOfFame?.champion?.scoreSummary || 'Championship Podium Race'}
                  </p>
                  <button
                    onClick={() => setActiveTab('AWARDS')}
                    className="mt-2 w-full py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-black hover:bg-amber-400 transition-colors"
                  >
                    View All Awards & Honors
                  </button>
                </div>

                {/* Next Upcoming Match Preview */}
                {matches.find((m) => m.status === 'SCHEDULED') && (
                  <div className="rounded-3xl p-5 bg-slate-900/80 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-sky-400" />
                        Next Match Up
                      </span>
                    </div>

                    {(() => {
                      const nextM = matches.find((m) => m.status === 'SCHEDULED')!;
                      return (
                        <div
                          onClick={() => setSelectedMatchId(nextM.id)}
                          className="space-y-2 cursor-pointer hover:text-amber-300 transition-colors"
                        >
                          <div className="text-xs font-bold text-slate-100 flex items-center justify-between">
                            <span>{nextM.teamA?.name}</span>
                            <span className="text-slate-500 font-normal">vs</span>
                            <span>{nextM.teamB?.name}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center justify-between">
                            <span>{nextM.date} • {nextM.time}</span>
                            <span>{nextM.venue}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. TAB: LIVE MATCHES */}
        {activeTab === 'MATCHES' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-100 uppercase tracking-wide flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400" />
                <span>Live Match Center</span>
              </h2>
              <span className="text-xs text-slate-400 font-bold">
                {liveMatches.length} Matches In Play
              </span>
            </div>

            {liveMatches.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {liveMatches.map((m) => (
                  <PublicLiveMatchCard
                    key={m.id}
                    match={m}
                    onOpenMatch={(id) => setSelectedMatchId(id)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-12 text-center space-y-3">
                <Clock className="w-10 h-10 text-slate-600 mx-auto" />
                <h4 className="text-sm font-bold text-slate-300">No matches currently in progress</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Check the fixtures schedule for upcoming scheduled match timings.
                </p>
                <button
                  onClick={() => setActiveTab('FIXTURES')}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
                >
                  View Tournament Fixtures Schedule
                </button>
              </div>
            )}
          </div>
        )}

        {/* 3. TAB: STANDINGS */}
        {activeTab === 'STANDINGS' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-100 uppercase tracking-wide flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400" />
                <span>Tournament Standings Table</span>
              </h2>
            </div>
            <PublicStandingsTable tournament={tournament} standings={standings} />
          </div>
        )}

        {/* 4. TAB: FIXTURES & RESULTS */}
        {activeTab === 'FIXTURES' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-100 uppercase tracking-wide flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>Fixtures & Results Schedule</span>
              </h2>
            </div>
            <PublicFixturesResultsView
              matches={matches}
              onOpenMatch={(id) => setSelectedMatchId(id)}
            />
          </div>
        )}

        {/* 5. TAB: KNOCKOUT BRACKET */}
        {activeTab === 'BRACKET' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-100 uppercase tracking-wide flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Knockout Elimination Bracket</span>
              </h2>
            </div>
            <PublicKnockoutBracketView
              bracket={bracket}
              onOpenMatch={(id) => setSelectedMatchId(id)}
            />
          </div>
        )}

        {/* 6. TAB: LEADERBOARDS */}
        {activeTab === 'LEADERBOARDS' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-100 uppercase tracking-wide flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Player Statistical Leaderboards</span>
              </h2>
            </div>
            <PublicLeaderboardsGrid leaderboards={leaderboards} />
          </div>
        )}

        {/* 7. TAB: AWARDS & PODIUM */}
        {activeTab === 'AWARDS' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-100 uppercase tracking-wide flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <span>Championship Podium & Awards Center</span>
              </h2>
            </div>
            <PublicPodiumAwardsView
              tournament={tournament}
              hallOfFame={hallOfFame}
              awards={awards}
              records={records}
            />
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>
            {tournament.name} • Official Spectator Portal Powered by SportsPulse
          </span>
          <div className="flex items-center gap-4 text-slate-400">
            <button onClick={() => setIsTvMode(true)} className="hover:text-amber-400 transition-colors">
              Smart TV Mode
            </button>
            <span>•</span>
            <button onClick={() => setShowShareModal(true)} className="hover:text-amber-400 transition-colors">
              Share Link
            </button>
          </div>
        </div>
      </footer>

      {/* DRILL-DOWN MATCH CENTER MODAL */}
      {selectedMatchId && (
        <PublicMatchCenterModal
          matchId={selectedMatchId}
          onClose={() => setSelectedMatchId(null)}
        />
      )}

      {/* SHARE MODAL */}
      {showShareModal && (
        <PublicShareModal
          title={tournament.name}
          url={window.location.href}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
};
