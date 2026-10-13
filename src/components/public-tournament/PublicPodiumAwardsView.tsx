import React, { useState } from 'react';
import {
  TournamentHallOfFameData,
  TournamentAwardItem,
  TournamentRecordDetail,
  Tournament,
} from '../../types';
import {
  Trophy,
  Crown,
  Medal,
  Award,
  Star,
  Sparkles,
  Shield,
  Zap,
  Users,
  Flame,
} from 'lucide-react';

interface PublicPodiumAwardsViewProps {
  tournament: Tournament;
  hallOfFame: TournamentHallOfFameData;
  awards: TournamentAwardItem[];
  records: TournamentRecordDetail[];
  onOpenTeam?: (teamId: string) => void;
  onOpenPlayer?: (playerId: string) => void;
}

export const PublicPodiumAwardsView: React.FC<PublicPodiumAwardsViewProps> = ({
  tournament,
  hallOfFame,
  awards,
  records,
  onOpenTeam,
  onOpenPlayer,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'PODIUM' | 'AWARDS' | 'DREAM_TEAM' | 'RECORDS'>('PODIUM');

  return (
    <div className="space-y-6">
      {/* Sub-navigation Pills */}
      <div className="flex items-center gap-1.5 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 w-fit">
        {[
          { id: 'PODIUM', label: 'Championship Podium', icon: Trophy },
          { id: 'AWARDS', label: 'Official Awards', icon: Award },
          { id: 'DREAM_TEAM', label: 'Dream Team Best XI', icon: Users },
          { id: 'RECORDS', label: 'Records Center', icon: Star },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. PODIUM VIEW */}
      {activeSubTab === 'PODIUM' && (
        <div className="space-y-6">
          {/* 3D-Styled Championship Podium Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            {/* Runner-Up 2nd */}
            <div className="md:order-1 p-6 rounded-3xl bg-slate-900/90 border border-slate-700 shadow-xl text-center space-y-3 relative overflow-hidden">
              <Medal className="w-10 h-10 text-slate-300 mx-auto" />
              <span className="text-xs uppercase font-black tracking-widest text-slate-400 block">
                2nd Place • Runner-Up 🥈
              </span>
              <h3 className="text-xl font-black text-slate-100">
                {hallOfFame?.runnerUp?.teamName || 'To Be Decided'}
              </h3>
              <p className="text-xs text-slate-400">
                {hallOfFame?.runnerUp?.scoreSummary || 'Championship Finalist'}
              </p>
            </div>

            {/* Champion 1st */}
            <div className="md:order-2 p-7 rounded-3xl bg-gradient-to-b from-amber-500/20 via-slate-900 to-slate-950 border-2 border-amber-500/80 shadow-2xl shadow-amber-500/10 text-center space-y-3 relative overflow-hidden scale-105 z-10">
              <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />
              <Crown className="w-14 h-14 text-amber-400 mx-auto animate-bounce" />
              <span className="text-xs uppercase font-black tracking-widest text-amber-400 block">
                Official Champion 🏆
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-100">
                {hallOfFame?.champion?.teamName || 'To Be Decided'}
              </h3>
              <p className="text-xs text-amber-300 font-semibold">
                {hallOfFame?.champion?.scoreSummary || 'Championship Title Winner'}
              </p>
            </div>

            {/* Third Place 3rd */}
            <div className="md:order-3 p-6 rounded-3xl bg-slate-900/90 border border-amber-900/40 shadow-xl text-center space-y-3 relative overflow-hidden">
              <Medal className="w-10 h-10 text-amber-700 mx-auto" />
              <span className="text-xs uppercase font-black tracking-widest text-amber-600 block">
                3rd Place • Bronze 🥉
              </span>
              <h3 className="text-lg font-black text-slate-100">
                {hallOfFame?.thirdPlace?.teamName || 'To Be Decided'}
              </h3>
              <p className="text-xs text-slate-400">
                {hallOfFame?.thirdPlace?.scoreSummary || 'Semi-Finalist Winner'}
              </p>
            </div>
          </div>

          {/* Tournament MVP Spotlight */}
          {hallOfFame?.mvp && (
            <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500/20 via-slate-900 to-slate-950 border border-amber-500/60 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4 text-center sm:text-left">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-500/60 flex items-center justify-center text-3xl shadow-inner flex-shrink-0">
                  🌟
                </div>
                <div>
                  <span className="text-xs uppercase font-black tracking-widest text-amber-400 block">
                    Tournament MVP / Player of the Series
                  </span>
                  <h3 className="text-xl font-black text-slate-100">{hallOfFame.mvp.playerName}</h3>
                  <p className="text-xs text-slate-300">
                    {hallOfFame.mvp.teamName} • {(hallOfFame.mvp as any).statHighlight || hallOfFame.mvp.statSummary}
                  </p>
                </div>
              </div>

              <div className="bg-slate-950/80 px-5 py-3 rounded-2xl border border-slate-800 text-center">
                <span className="text-xs text-slate-400 font-bold block uppercase">Index Rating</span>
                <span className="text-2xl font-mono font-black text-amber-400">
                  {(hallOfFame.mvp as any).rating || hallOfFame.mvp.piScore || '98.5'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. OFFICIAL AWARDS GRID */}
      {activeSubTab === 'AWARDS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {awards && awards.length > 0 ? (
            awards.map((award, aIdx) => (
              <div
                key={award.id || aIdx}
                className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 transition-all shadow-lg space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{award.icon || '🏆'}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    OFFICIAL
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block">
                    {award.title}
                  </span>
                  <h4 className="text-base font-black text-slate-100">{award.winnerName || 'To Be Announced'}</h4>
                  <p className="text-xs text-amber-400 font-semibold">{award.teamName || 'Contender'}</p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 text-xs text-slate-400">
                  <p className="line-clamp-2">{award.citation || award.description}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-12 text-center text-slate-500 text-xs">
              Official awards will be finalized during the post-tournament ceremony.
            </div>
          )}
        </div>
      )}

      {/* 3. DREAM TEAM BEST XI */}
      {activeSubTab === 'DREAM_TEAM' && (
        <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-amber-400" />
              <div>
                <h3 className="text-base font-black text-slate-100 uppercase tracking-wide">
                  All-Tournament Dream Team Selection
                </h3>
                <p className="text-xs text-slate-400">
                  Top performing athletes across all matches by Tournament Performance Index
                </p>
              </div>
            </div>
          </div>

          {/* Tactical Pitch Container */}
          <div className="relative rounded-3xl bg-gradient-to-b from-emerald-950/80 via-emerald-900/50 to-slate-950 border-2 border-emerald-600/40 p-6 sm:p-8 min-h-[420px] flex flex-col justify-between overflow-hidden shadow-2xl">
            {/* Pitch markings */}
            <div className="absolute inset-0 border-2 border-white/10 m-4 rounded-2xl pointer-events-none" />
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-white/10 pointer-events-none" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border border-white/10 pointer-events-none" />

            {/* Squad Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 relative z-10">
              {(hallOfFame?.dreamTeam || []).map((player: any, idx: number) => (
                <div
                  key={idx}
                  onClick={() => player.playerId && onOpenPlayer && onOpenPlayer(player.playerId)}
                  className="p-3 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-slate-800/80 hover:border-amber-400 text-center space-y-1.5 cursor-pointer transition-all shadow-lg group"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 mx-auto flex items-center justify-center font-bold text-xs text-amber-400 group-hover:scale-105 transition-transform">
                    {player.jerseyNumber || idx + 1}
                  </div>
                  <h4 className="text-xs font-black text-slate-100 truncate group-hover:text-amber-300">
                    {player.playerName}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold truncate">{player.position || player.role || 'Athlete'}</p>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold block">
                    {player.teamName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. RECORDS CENTER */}
      {activeSubTab === 'RECORDS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {records && records.length > 0 ? (
            records.map((rec, rIdx) => (
              <div
                key={rec.id || rIdx}
                className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-2 flex items-start justify-between gap-4"
              >
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-black tracking-wider text-amber-400 block">
                    {rec.category || 'Tournament Record'}
                  </span>
                  <h4 className="text-sm font-black text-slate-100">{rec.title}</h4>
                  <p className="text-xs text-slate-300">
                    Held by <span className="font-bold text-slate-100">{rec.holderName}</span> ({rec.teamName})
                  </p>
                  <p className="text-[11px] text-slate-500">{rec.matchContext || 'Set during tournament match'}</p>
                </div>

                <div className="text-right flex-shrink-0 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  <span className="text-lg font-mono font-black text-amber-400 block">{rec.value}</span>
                  <span className="text-[9px] uppercase font-bold text-slate-500">{rec.unit || 'RECORD'}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-12 text-center text-slate-500 text-xs">
              No tournament records broken yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
