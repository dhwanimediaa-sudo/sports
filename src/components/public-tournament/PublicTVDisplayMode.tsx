import React, { useState, useEffect } from 'react';
import {
  Tournament,
  TournamentDashboardData,
  TournamentHallOfFameData,
  TournamentAwardItem,
  TournamentRecordDetail,
  Match,
} from '../../types';
import {
  Trophy,
  Radio,
  Clock,
  MapPin,
  Calendar,
  Award,
  Crown,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  X,
  Flame,
  Shield,
  Star,
} from 'lucide-react';

interface PublicTVDisplayModeProps {
  tournament: Tournament;
  liveMatches: Match[];
  standings: any;
  leaderboards: any;
  hallOfFame?: TournamentHallOfFameData;
  awards?: TournamentAwardItem[];
  onExit: () => void;
  onOpenMatch: (matchId: string) => void;
}

export const PublicTVDisplayMode: React.FC<PublicTVDisplayModeProps> = ({
  tournament,
  liveMatches,
  standings,
  leaderboards,
  hallOfFame,
  awards,
  onExit,
  onOpenMatch,
}) => {
  const slides = ['LIVE_MATCHES', 'STANDINGS', 'LEADERBOARDS', 'PODIUM_AWARDS'];
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  const SLIDE_DURATION_MS = 14000;
  const UPDATE_INTERVAL_MS = 100;

  // Digital clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-slide rotation loop
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setCurrentSlideIndex((old) => (old + 1) % slides.length);
          return 0;
        }
        return prev + (UPDATE_INTERVAL_MS / SLIDE_DURATION_MS) * 100;
      });
    }, UPDATE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isPaused, slides.length]);

  const currentSlide = slides[currentSlideIndex];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col justify-between overflow-hidden font-sans select-none p-6 sm:p-8">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* TOP TV HEADER */}
      <header className="flex items-center justify-between border-b border-slate-800/80 pb-4 relative z-10">
        <div className="flex items-center gap-4">
          {tournament.logoUrl ? (
            <img
              src={tournament.logoUrl}
              alt={tournament.name}
              className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-500/80 shadow-lg"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border-2 border-amber-500/80 flex items-center justify-center text-3xl">
              🏆
            </div>
          )}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-100 tracking-tight uppercase">
                {tournament.name}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                TV LIVE SPECTATOR
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              {tournament.sport} • Season {tournament.season || '2026'} • {tournament.venue || tournament.location || 'Championship Arena'}
            </p>
          </div>
        </div>

        {/* Sponsor & Live Clock */}
        <div className="flex items-center gap-6">
          {tournament.sponsor && (
            <div className="text-right hidden sm:block">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Presented By</span>
              <span className="text-sm font-black text-amber-400">{tournament.sponsor}</span>
            </div>
          )}

          <div className="text-right bg-slate-900 px-4 py-2 rounded-2xl border border-slate-800 font-mono font-black text-lg text-slate-200">
            {currentTime}
          </div>

          <button
            onClick={onExit}
            className="p-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-100 border border-slate-800 transition-colors"
            title="Exit TV Display Mode"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* MAIN CAROUSEL STAGE */}
      <main className="flex-1 my-6 flex flex-col justify-center relative z-10 overflow-hidden">
        {/* SLIDE 1: LIVE MATCHES */}
        {currentSlide === 'LIVE_MATCHES' && (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-6 h-6 text-emerald-400 animate-pulse" />
                <h2 className="text-xl font-black uppercase text-slate-100 tracking-wide">
                  Live Match Center
                </h2>
              </div>
              <span className="text-xs font-bold text-slate-400">
                {liveMatches.length} Active Games
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {liveMatches.length > 0 ? (
                liveMatches.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => onOpenMatch(m.id)}
                    className="p-6 rounded-3xl bg-slate-900/90 border-2 border-emerald-500/60 shadow-2xl space-y-4 cursor-pointer hover:border-emerald-400 transition-all"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 uppercase font-black">
                        LIVE
                      </span>
                      <span>{m.round} • {m.venue}</span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xl font-black text-slate-100">{m.teamA?.name}</span>
                      </div>
                      <span className="text-3xl font-mono font-black text-slate-100">
                        {m.cricketConfig?.teamAScore || (m as any).scoreA || '-'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xl font-black text-slate-100">{m.teamB?.name}</span>
                      </div>
                      <span className="text-3xl font-mono font-black text-slate-100">
                        {m.cricketConfig?.teamBScore || (m as any).scoreB || '-'}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-800 text-xs text-emerald-400 font-bold">
                      {m.liveScoreText || m.liveDetailText || 'In Progress'}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-16 text-center text-slate-400 space-y-2">
                  <Clock className="w-12 h-12 text-slate-600 mx-auto" />
                  <p className="text-base font-bold">No matches actively in play right now.</p>
                  <p className="text-xs text-slate-500">Upcoming fixtures will begin shortly.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SLIDE 2: STANDINGS */}
        {currentSlide === 'STANDINGS' && (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-amber-400" />
              <h2 className="text-xl font-black uppercase text-slate-100 tracking-wide">
                Tournament Standings
              </h2>
            </div>

            <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-4 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold">
                    <th className="py-2.5 px-4 text-center w-14">POS</th>
                    <th className="py-2.5 px-4">TEAM</th>
                    <th className="py-2.5 px-4 text-center">PLAYED</th>
                    <th className="py-2.5 px-4 text-center text-emerald-400">WON</th>
                    <th className="py-2.5 px-4 text-center text-rose-400">LOST</th>
                    <th className="py-2.5 px-4 text-center font-black text-amber-400">POINTS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {((standings?.groups?.[0]?.rows || standings?.overall || []) as any[]).slice(0, 8).map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 text-center font-mono font-black text-amber-400">
                        #{row.rank || i + 1}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-100 text-base">{row.teamName}</td>
                      <td className="py-3 px-4 text-center font-mono">{row.played || 0}</td>
                      <td className="py-3 px-4 text-center font-mono text-emerald-400 font-bold">{row.won || 0}</td>
                      <td className="py-3 px-4 text-center font-mono text-rose-400">{row.lost || 0}</td>
                      <td className="py-3 px-4 text-center font-mono font-black text-amber-400 text-lg">
                        {row.points || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SLIDE 3: LEADERBOARDS */}
        {currentSlide === 'LEADERBOARDS' && (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center gap-2">
              <Flame className="w-6 h-6 text-amber-400" />
              <h2 className="text-xl font-black uppercase text-slate-100 tracking-wide">
                Tournament Statistical Leaders
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {Object.keys(leaderboards || {}).slice(0, 3).map((catKey) => {
                const cat = leaderboards[catKey];
                const top = cat.leaders?.[0];
                return (
                  <div key={catKey} className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <h3 className="text-sm font-black text-amber-400 uppercase">{cat.categoryTitle}</h3>
                      <span className="text-[10px] font-bold text-slate-500">{cat.statLabel}</span>
                    </div>

                    {top ? (
                      <div className="text-center space-y-2 py-3">
                        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-500/60 mx-auto flex items-center justify-center text-2xl font-black text-amber-400">
                          {top.playerName?.slice(0, 1) || '1'}
                        </div>
                        <h4 className="text-lg font-black text-slate-100">{top.playerName}</h4>
                        <p className="text-xs text-slate-400">{top.teamName}</p>
                        <span className="text-3xl font-mono font-black text-amber-400 block pt-1">
                          {top.statValue}
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 py-6 text-center">Pending results</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SLIDE 4: PODIUM & AWARDS */}
        {currentSlide === 'PODIUM_AWARDS' && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-400" />
              <h2 className="text-xl font-black uppercase text-slate-100 tracking-wide">
                Championship Honors
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
              <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-700 text-center space-y-2">
                <span className="text-xs font-black uppercase text-slate-400">Runner-Up 🥈</span>
                <h3 className="text-2xl font-black text-slate-100">{hallOfFame?.runnerUp?.teamName || 'TBD'}</h3>
              </div>

              <div className="p-8 rounded-3xl bg-gradient-to-b from-amber-500/25 via-slate-900 to-slate-950 border-2 border-amber-500 text-center space-y-3 shadow-2xl scale-105">
                <Crown className="w-12 h-12 text-amber-400 mx-auto animate-bounce" />
                <span className="text-xs font-black uppercase text-amber-400">Champion 🏆</span>
                <h3 className="text-3xl font-black text-slate-100">{hallOfFame?.champion?.teamName || 'TBD'}</h3>
              </div>

              <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-700 text-center space-y-2">
                <span className="text-xs font-black uppercase text-amber-600">3rd Place 🥉</span>
                <h3 className="text-2xl font-black text-slate-100">{hallOfFame?.thirdPlace?.teamName || 'TBD'}</h3>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* BOTTOM TICKER & PROGRESS BAR */}
      <footer className="space-y-3 relative z-10">
        {/* Carousel Progress Bar */}
        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-amber-500 h-full transition-all duration-100 ease-linear rounded-full shadow-md shadow-amber-500/50"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Slide navigation controls */}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors"
            >
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            </button>
            <span className="font-bold">
              Displaying {currentSlide.replace('_', ' ')} ({currentSlideIndex + 1} of {slides.length})
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {slides.map((s, idx) => (
              <button
                key={s}
                onClick={() => {
                  setCurrentSlideIndex(idx);
                  setProgress(0);
                }}
                className={`h-2 rounded-full transition-all ${
                  idx === currentSlideIndex ? 'w-6 bg-amber-500' : 'w-2 bg-slate-800'
                }`}
              />
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};
