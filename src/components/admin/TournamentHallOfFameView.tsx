/**
 * SportsPulse - Tournament Hall of Fame View
 * 
 * Features:
 * - High-impact Championship Podium (1st, 2nd, 3rd, MVP)
 * - Finalized award winners gallery
 * - All-time tournament record holders roster
 * - Top 10 Performance Index Honor Roll
 * - One-click presentation broadcast triggers
 */

import React, { useState, useEffect } from 'react';
import {
  Tournament,
  TournamentHallOfFameData,
  TournamentPresentationEvent,
} from '../../types';
import { api } from '../../services/api';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  Trophy,
  Crown,
  Medal,
  Award,
  Star,
  Tv,
  Sparkles,
  Flame,
  Check,
  Shield,
  Zap,
} from 'lucide-react';

interface TournamentHallOfFameViewProps {
  tournament: Tournament;
  onOpenPresentationConsole?: () => void;
}

export const TournamentHallOfFameView: React.FC<TournamentHallOfFameViewProps> = ({
  tournament,
  onOpenPresentationConsole,
}) => {
  const [hallOfFame, setHallOfFame] = useState<TournamentHallOfFameData | null>(null);
  const [loading, setLoading] = useState(false);
  const [broadcastTriggered, setBroadcastTriggered] = useState<string | null>(null);

  const fetchHallOfFame = async () => {
    try {
      setLoading(true);
      const res = await api.getTournamentHallOfFame(tournament.id);
      setHallOfFame(res);
    } catch (err) {
      console.error('Failed to load hall of fame:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHallOfFame();
  }, [tournament.id]);

  const handleBroadcastPodium = async (type: 'CHAMPION' | 'MVP' | 'HALL_OF_FAME') => {
    try {
      await api.triggerTournamentPresentation(tournament.id, {
        type,
        data: hallOfFame,
      });
      setBroadcastTriggered(type);
      setTimeout(() => setBroadcastTriggered(null), 3000);
    } catch (err) {
      alert('Failed to trigger broadcast presentation');
    }
  };

  if (loading && !hallOfFame) {
    return (
      <div className="p-12 text-center text-slate-400 text-xs">
        Loading Tournament Hall of Fame & Championship Podium...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/30 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏛️</span>
            <h2 className="text-base font-black text-slate-100 uppercase tracking-wider">
              Official Tournament Hall of Fame
            </h2>
            <Badge variant="warning" className="font-bold">
              CHAMPIONSHIP PODIUM & HONORS
            </Badge>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            The permanent honor roll celebrating tournament champions, podium finishers, Most Valuable Players, and record breakers of {tournament.name}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            variant="amber"
            size="sm"
            onClick={() => handleBroadcastPodium('HALL_OF_FAME')}
            icon={broadcastTriggered === 'HALL_OF_FAME' ? <Check className="w-3.5 h-3.5" /> : <Tv className="w-3.5 h-3.5" />}
          >
            {broadcastTriggered === 'HALL_OF_FAME' ? 'Sent Hall of Fame' : 'Broadcast Hall of Fame'}
          </Button>

          {onOpenPresentationConsole && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onOpenPresentationConsole}
              icon={<Sparkles className="w-3.5 h-3.5 text-amber-400" />}
            >
              Presentation Console
            </Button>
          )}
        </div>
      </div>

      {/* CHAMPIONSHIP PODIUM */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* CHAMPION 1ST PLACE */}
        <div className="md:col-span-2 p-5 rounded-2xl bg-gradient-to-b from-amber-500/20 via-slate-900 to-slate-950 border-2 border-amber-500/60 shadow-2xl space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-400 animate-bounce" />
              <span className="text-xs font-black uppercase tracking-widest text-amber-400">
                Tournament Champions 🏆
              </span>
            </div>
            <Button
              variant="amber"
              size="sm"
              onClick={() => handleBroadcastPodium('CHAMPION')}
              icon={<Tv className="w-3.5 h-3.5" />}
            >
              Broadcast Champions
            </Button>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-amber-500/30 flex items-center gap-4">
            {hallOfFame?.champion?.teamLogoUrl ? (
              <img
                src={hallOfFame.champion.teamLogoUrl}
                alt="Champion"
                className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-500/60 shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-500/60 flex items-center justify-center text-2xl font-black text-amber-400 shrink-0">
                🥇
              </div>
            )}

            <div className="min-w-0 space-y-1">
              <h3 className="text-xl font-black text-slate-100 truncate">
                {hallOfFame?.champion?.teamName || 'To Be Decided'}
              </h3>
              <p className="text-xs text-amber-300 font-semibold">
                {hallOfFame?.champion?.scoreSummary || 'Championship Title Winner'}
              </p>
              <span className="text-[10px] text-slate-400 block">
                Official Winner of {tournament.name}
              </span>
            </div>
          </div>
        </div>

        {/* RUNNER-UP 2ND PLACE */}
        <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-800/40 via-slate-900 to-slate-950 border border-slate-700 shadow-xl space-y-3">
          <div className="flex items-center gap-2">
            <Medal className="w-5 h-5 text-slate-300" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-300">
              Runner-Up 🥈
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <h4 className="text-base font-black text-slate-200 truncate">
              {hallOfFame?.runnerUp?.teamName || 'Finalist'}
            </h4>
            <p className="text-xs text-slate-400 font-medium">
              {hallOfFame?.runnerUp?.scoreSummary || 'Tournament Finalist'}
            </p>
          </div>
        </div>

        {/* TOURNAMENT MVP */}
        <div className="p-5 rounded-2xl bg-gradient-to-b from-amber-950/30 via-slate-900 to-slate-950 border border-amber-500/40 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400" />
              <span className="text-xs font-black uppercase tracking-widest text-amber-400">
                Tournament MVP 👑
              </span>
            </div>
            <button
              onClick={() => handleBroadcastPodium('MVP')}
              className="text-slate-400 hover:text-amber-400 transition-colors"
              title="Broadcast MVP Card"
            >
              <Tv className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5 flex items-center gap-3">
            {hallOfFame?.mvp?.photoUrl ? (
              <img
                src={hallOfFame.mvp.photoUrl}
                alt="MVP"
                className="w-10 h-10 rounded-full object-cover border border-amber-500/40 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-sm shrink-0">
                MVP
              </div>
            )}

            <div className="min-w-0">
              <h4 className="text-sm font-black text-emerald-400 truncate">
                {hallOfFame?.mvp?.playerName || 'Tournament MVP'}
              </h4>
              <span className="text-[11px] text-slate-400 truncate block">
                {hallOfFame?.mvp?.teamName || 'Tournament XI'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* AWARDS WINNERS ROSTER */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
              Official Award Winners Honor Roll
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(hallOfFame?.awardWinners || []).map((aw) => (
            <div
              key={aw.id}
              className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{aw.awardIcon || '🏆'}</span>
                <span className="text-xs font-bold text-slate-200 truncate">{aw.title}</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Recipient</span>
                <span className="text-xs font-black text-emerald-400 truncate block">
                  {aw.recipientName || 'To Be Announced'}
                </span>
                {aw.recipientTeamName && (
                  <span className="text-[10px] text-slate-400 truncate block">{aw.recipientTeamName}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* TOP 10 PERFORMANCE INDEX HONOR ROLL */}
      {hallOfFame?.bestPerformers && hallOfFame.bestPerformers.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
              Top 10 Tournament Performance Index (PI) Leaders
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {hallOfFame.bestPerformers.map((pi, idx) => (
              <div
                key={pi.playerId || idx}
                className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2.5"
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                    idx === 0
                      ? 'bg-amber-500 text-slate-950'
                      : idx === 1
                      ? 'bg-slate-300 text-slate-950'
                      : idx === 2
                      ? 'bg-amber-700 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  #{idx + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-slate-200 truncate">{pi.playerName}</h4>
                  <span className="text-[10px] text-slate-400 truncate block">{pi.teamName}</span>
                </div>

                <span className="text-xs font-mono font-black text-emerald-400 shrink-0">
                  {pi.score}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
