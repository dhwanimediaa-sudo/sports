import React, { useState, useEffect } from 'react';
import { Match, FullMatchReport } from '../../types';
import { api } from '../../services/api';
import {
  X,
  Radio,
  Share2,
  Trophy,
  Award,
  Calendar,
  Clock,
  MapPin,
  Shield,
  Activity,
  Users,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Flame,
  Zap,
} from 'lucide-react';

interface PublicMatchCenterModalProps {
  matchId: string;
  onClose: () => void;
  onOpenTeam?: (teamId: string) => void;
  onOpenPlayer?: (playerId: string) => void;
}

export const PublicMatchCenterModal: React.FC<PublicMatchCenterModalProps> = ({
  matchId,
  onClose,
  onOpenTeam,
  onOpenPlayer,
}) => {
  const [match, setMatch] = useState<Match | null>(null);
  const [report, setReport] = useState<any | null>(null);
  const [liveState, setLiveState] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'SCORECARD' | 'TIMELINE' | 'SQUADS' | 'AWARDS'>('SCORECARD');
  const [copiedLink, setCopiedLink] = useState(false);

  // Load match data
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch match details
        const matchRes = await api.getPublicMatch(matchId).catch(() => api.getMatch(matchId));
        if (isMounted) setMatch(matchRes.match);

        // Fetch match report
        const reportRes = await api.getPublicMatchReport(matchId).catch(() => null);
        if (isMounted && reportRes?.report) {
          setReport(reportRes.report);
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to load match center.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    // Connect to Match SSE stream for instant live scoring updates
    const eventSource = new EventSource(`/api/matches/${matchId}/scoring/stream`);

    eventSource.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (isMounted) {
          setLiveState(payload);
          // Also refresh report if match status changes
          if (payload.match?.status === 'COMPLETED') {
            api.getPublicMatchReport(matchId).then((r) => r?.report && setReport(r.report)).catch(() => {});
          }
        }
      } catch (err) {
        console.error('Failed to parse match SSE event:', err);
      }
    };

    return () => {
      isMounted = false;
      eventSource.close();
    };
  }, [matchId]);

  const handleShare = () => {
    const url = window.location.origin + window.location.pathname.split('/match/')[0] + `/match/${matchId}`;
    if (navigator.share) {
      navigator.share({
        title: `${match?.teamA?.name} vs ${match?.teamB?.name} — Match Center`,
        url,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const isLive = match?.status === 'LIVE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div
        id="public-match-center-modal"
        className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
      >
        {/* Top Action Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center gap-2">
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                LIVE MATCH CENTER
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                MATCH CENTER • {match?.status || 'SCHEDULED'}
              </span>
            )}
            <span className="text-xs text-slate-400 hidden sm:inline">
              {match?.tournament?.name || 'Tournament'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{copiedLink ? 'Link Copied!' : 'Share Match'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Loading or Display */}
        {loading ? (
          <div className="p-12 text-center space-y-3 flex-1 flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto" />
            <p className="text-sm font-bold text-slate-300">Loading Live Match Data...</p>
          </div>
        ) : error || !match ? (
          <div className="p-12 text-center space-y-3 flex-1">
            <p className="text-sm font-bold text-rose-400">{error || 'Match details not found.'}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 p-4 sm:p-6">
            {/* MATCH HERO SCOREBOARD */}
            <div className="rounded-2xl p-5 sm:p-6 bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 relative overflow-hidden shadow-xl">
              {/* Background ambient glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
                {/* Team A */}
                <div
                  className="flex items-center sm:flex-row-reverse gap-3 text-center sm:text-right cursor-pointer group"
                  onClick={() => match.teamAId && onOpenTeam && onOpenTeam(match.teamAId)}
                >
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-100 group-hover:text-emerald-400 transition-colors">
                      {match.teamA?.name || 'Team A'}
                    </h3>
                    <p className="text-xs text-slate-400">{match.teamA?.city || match.group?.name || 'Home'}</p>
                  </div>
                  {match.teamA?.logoUrl ? (
                    <img
                      src={match.teamA.logoUrl}
                      alt={match.teamA.name}
                      className="w-12 h-12 rounded-2xl object-cover border border-slate-700 shadow-md"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-base font-black text-slate-300">
                      {match.teamA?.shortName?.slice(0, 3) || 'TA'}
                    </div>
                  )}
                </div>

                {/* Score & Period Display */}
                <div className="text-center space-y-1 bg-slate-950/80 px-6 py-3 rounded-2xl border border-slate-800/80 shadow-inner">
                  <div className="text-2xl sm:text-3xl font-black text-slate-100 font-mono tracking-tight">
                    {liveState?.scoreSummary || report?.matchResultText || match.cricketConfig?.teamAScore ? (
                      <span>
                        {match.cricketConfig?.teamAScore || (match as any).scoreA || '0'}
                        <span className="text-slate-500 mx-2 font-sans font-light">:</span>
                        {match.cricketConfig?.teamBScore || (match as any).scoreB || '0'}
                      </span>
                    ) : (
                      <span className="text-lg font-bold text-slate-400 font-sans">VS</span>
                    )}
                  </div>
                  <div className="text-xs font-bold text-emerald-400 tracking-wide uppercase">
                    {report?.matchResultText || liveState?.currentInnings || match.round || 'Official Match'}
                  </div>
                </div>

                {/* Team B */}
                <div
                  className="flex items-center gap-3 text-center sm:text-left cursor-pointer group"
                  onClick={() => match.teamBId && onOpenTeam && onOpenTeam(match.teamBId)}
                >
                  {match.teamB?.logoUrl ? (
                    <img
                      src={match.teamB.logoUrl}
                      alt={match.teamB.name}
                      className="w-12 h-12 rounded-2xl object-cover border border-slate-700 shadow-md"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-base font-black text-slate-300">
                      {match.teamB?.shortName?.slice(0, 3) || 'TB'}
                    </div>
                  )}
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-100 group-hover:text-emerald-400 transition-colors">
                      {match.teamB?.name || 'Team B'}
                    </h3>
                    <p className="text-xs text-slate-400">{match.teamB?.city || match.group?.name || 'Away'}</p>
                  </div>
                </div>
              </div>

              {/* Match Meta Footer */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-center sm:justify-between gap-3 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>{match.date}</span>
                  <span>•</span>
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{match.time}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span>{match.venue} {match.ground ? `(${match.ground})` : ''}</span>
                </div>
                {match.officials?.umpires && match.officials.umpires.length > 0 && (
                  <div className="text-[11px] text-slate-500 hidden md:block">
                    Referees: {match.officials.umpires.join(', ')}
                  </div>
                )}
              </div>
            </div>

            {/* TAB NAVIGATION */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              {[
                { id: 'SCORECARD', label: 'Scorecard', icon: Activity },
                { id: 'TIMELINE', label: 'Events & Timeline', icon: Clock },
                { id: 'SQUADS', label: 'Lineups & Squads', icon: Users },
                { id: 'AWARDS', label: 'Match Awards', icon: Award },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB CONTENT: SCORECARD */}
            {activeTab === 'SCORECARD' && (
              <div className="space-y-4">
                {report?.innings && report.innings.length > 0 ? (
                  report.innings.map((inn: any, idx: number) => (
                    <div key={idx} className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 sm:p-5 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-black">
                            Innings {inn.inningsNumber || idx + 1}
                          </span>
                          <h4 className="text-sm font-black text-slate-100">{inn.battingTeamName || 'Batting Team'}</h4>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-mono font-black text-slate-100">
                            {inn.totalRuns}/{inn.totalWickets}
                          </span>
                          <span className="text-xs text-slate-400 ml-2 font-mono">({inn.overs} ov)</span>
                        </div>
                      </div>

                      {/* Batting Table */}
                      {inn.batsmen && inn.batsmen.length > 0 && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="text-slate-400 border-b border-slate-800/60 font-semibold">
                                <th className="pb-2">Batter</th>
                                <th className="pb-2 text-right">R</th>
                                <th className="pb-2 text-right">B</th>
                                <th className="pb-2 text-right">4s</th>
                                <th className="pb-2 text-right">6s</th>
                                <th className="pb-2 text-right">SR</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/40">
                              {inn.batsmen.map((b: any, bIdx: number) => (
                                <tr key={bIdx} className="hover:bg-slate-800/40">
                                  <td className="py-2 font-bold text-slate-200">
                                    {b.playerName} {b.isNotOut ? '*' : ''}
                                    <span className="text-[10px] text-slate-400 block font-normal">{b.dismissalText || (b.isNotOut ? 'not out' : '')}</span>
                                  </td>
                                  <td className="py-2 text-right font-mono font-black text-slate-100">{b.runs}</td>
                                  <td className="py-2 text-right font-mono text-slate-400">{b.balls}</td>
                                  <td className="py-2 text-right font-mono text-slate-400">{b.fours}</td>
                                  <td className="py-2 text-right font-mono text-slate-400">{b.sixes}</td>
                                  <td className="py-2 text-right font-mono text-slate-300">{b.strikeRate != null && !isNaN(Number(b.strikeRate)) ? Number(b.strikeRate).toFixed(1) : '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Bowling Table */}
                      {inn.bowlers && inn.bowlers.length > 0 && (
                        <div className="overflow-x-auto mt-3 pt-3 border-t border-slate-800/60">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="text-slate-400 border-b border-slate-800/60 font-semibold">
                                <th className="pb-2">Bowler</th>
                                <th className="pb-2 text-right">O</th>
                                <th className="pb-2 text-right">M</th>
                                <th className="pb-2 text-right">R</th>
                                <th className="pb-2 text-right">W</th>
                                <th className="pb-2 text-right">ECON</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/40">
                              {inn.bowlers.map((bw: any, bwIdx: number) => (
                                <tr key={bwIdx} className="hover:bg-slate-800/40">
                                  <td className="py-2 font-bold text-slate-200">{bw.playerName}</td>
                                  <td className="py-2 text-right font-mono text-slate-300">{bw.overs}</td>
                                  <td className="py-2 text-right font-mono text-slate-400">{bw.maidens || 0}</td>
                                  <td className="py-2 text-right font-mono text-slate-300">{bw.runsConceded}</td>
                                  <td className="py-2 text-right font-mono font-black text-emerald-400">{bw.wickets}</td>
                                  <td className="py-2 text-right font-mono text-slate-300">{bw.economy != null && !isNaN(Number(bw.economy)) ? Number(bw.economy).toFixed(2) : '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-8 text-center space-y-2">
                    <Activity className="w-8 h-8 text-slate-600 mx-auto" />
                    <h4 className="text-sm font-bold text-slate-300">Detailed Scorecard Pending</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Innings details and ball-by-ball breakdown will display once the scorer enters points or overs.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: TIMELINE */}
            {activeTab === 'TIMELINE' && (
              <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 space-y-3">
                <h4 className="text-sm font-black text-slate-200 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span>Match Activity & Commentary</span>
                </h4>
                {report?.recentEvents && report.recentEvents.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {report.recentEvents.map((evt: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs">
                        <span className="font-mono font-bold text-emerald-400 flex-shrink-0">{evt.time || evt.over || `#${i + 1}`}</span>
                        <div className="flex-1 text-slate-300">
                          <span className="font-bold text-slate-100 mr-1.5">{evt.title || evt.eventType}:</span>
                          {evt.description || evt.summary}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-6 text-center">No real-time timeline events logged yet.</p>
                )}
              </div>
            )}

            {/* TAB CONTENT: SQUADS */}
            {activeTab === 'SQUADS' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Team A Lineup */}
                <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-sm font-black text-slate-100">{match.teamA?.name} Squad</h4>
                  </div>
                  <div className="space-y-1.5">
                    {(match.teamAPlayers || []).map((p) => (
                      <div
                        key={p.id}
                        onClick={() => onOpenPlayer && onOpenPlayer(p.id)}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800/60 text-xs cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center font-mono font-bold text-[10px] text-slate-300">
                            {p.jerseyNumber || '•'}
                          </span>
                          <span className="font-bold text-slate-200">{p.name}</span>
                        </div>
                        <span className="text-[11px] text-slate-400">{p.role || 'Player'}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Team B Lineup */}
                <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-sm font-black text-slate-100">{match.teamB?.name} Squad</h4>
                  </div>
                  <div className="space-y-1.5">
                    {(match.teamBPlayers || []).map((p) => (
                      <div
                        key={p.id}
                        onClick={() => onOpenPlayer && onOpenPlayer(p.id)}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800/60 text-xs cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center font-mono font-bold text-[10px] text-slate-300">
                            {p.jerseyNumber || '•'}
                          </span>
                          <span className="font-bold text-slate-200">{p.name}</span>
                        </div>
                        <span className="text-[11px] text-slate-400">{p.role || 'Player'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: AWARDS */}
            {activeTab === 'AWARDS' && (
              <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 space-y-4">
                <h4 className="text-sm font-black text-slate-100 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>Official Match Honors & Awards</span>
                </h4>

                {report?.selectedManOfMatch || report?.selectedPlayerOfMatch ? (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-slate-900 to-slate-900 border border-amber-500/50 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/60 flex items-center justify-center text-2xl flex-shrink-0">
                      🌟
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-black tracking-widest text-amber-400 block">
                        Player of the Match
                      </span>
                      <h3 className="text-base font-black text-slate-100">
                        {report.selectedManOfMatch?.playerName || report.selectedPlayerOfMatch?.playerName || 'Honoree'}
                      </h3>
                      <p className="text-xs text-amber-300">
                        {report.selectedManOfMatch?.teamName || report.selectedPlayerOfMatch?.teamName} • {report.selectedManOfMatch?.reason || 'Exceptional all-round match performance.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-500 text-xs">
                    Match honors and Player of the Match will be officially designated upon conclusion of play.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
