import React from 'react';
import { TournamentLeaderStat } from '../../types';
import { Trophy, Award, Flame, Star, ChevronRight, User } from 'lucide-react';

interface PublicLeaderboardsGridProps {
  leaderboards: Record<
    string,
    {
      categoryTitle: string;
      statLabel: string;
      leaders: TournamentLeaderStat[];
    }
  >;
  onOpenPlayer?: (playerId: string) => void;
  onOpenTeam?: (teamId: string) => void;
}

export const PublicLeaderboardsGrid: React.FC<PublicLeaderboardsGridProps> = ({
  leaderboards,
  onOpenPlayer,
  onOpenTeam,
}) => {
  const categoryKeys = Object.keys(leaderboards || {});

  if (categoryKeys.length === 0) {
    return (
      <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-12 text-center space-y-3">
        <Award className="w-10 h-10 text-slate-600 mx-auto" />
        <h4 className="text-sm font-bold text-slate-300">Statistical Leaderboards Pending</h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Player leaderboard races will populate automatically as tournament matches progress.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Category Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {categoryKeys.map((catKey) => {
          const category = leaderboards[catKey];
          const leaders = category?.leaders || [];
          const topLeader = leaders[0];

          return (
            <div
              key={catKey}
              className="rounded-3xl bg-slate-900/80 border border-slate-800 p-5 flex flex-col justify-between shadow-xl space-y-4 hover:border-slate-700 transition-all"
            >
              {/* Category Header */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-black text-slate-100 uppercase tracking-wide">
                    {category.categoryTitle}
                  </h3>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-950 px-2.5 py-0.5 rounded-lg border border-slate-800">
                  {category.statLabel}
                </span>
              </div>

              {/* Number 1 Leader Spotlight */}
              {topLeader ? (
                <div
                  onClick={() => topLeader.playerId && onOpenPlayer && onOpenPlayer(topLeader.playerId)}
                  className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/40 flex items-center justify-between gap-3 cursor-pointer hover:border-amber-400 group transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative">
                      {topLeader.playerPhotoUrl ? (
                        <img
                          src={topLeader.playerPhotoUrl}
                          alt={topLeader.playerName}
                          className="w-11 h-11 rounded-xl object-cover border border-amber-500/50"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center font-black text-amber-400">
                          {topLeader.playerName?.slice(0, 1) || '1'}
                        </div>
                      )}
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black flex items-center justify-center shadow">
                        1
                      </span>
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-slate-100 group-hover:text-amber-300 transition-colors truncate">
                        {topLeader.playerName}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate">{topLeader.teamName || 'Team'}</p>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="text-lg font-mono font-black text-amber-400 block leading-tight">
                      {topLeader.statValue}
                    </span>
                    <span className="text-[9px] text-slate-500 uppercase font-bold">{category.statLabel}</span>
                  </div>
                </div>
              ) : null}

              {/* Remaining Leaders (2 - 5) */}
              <div className="space-y-1.5 flex-1">
                {leaders.slice(1, 5).map((player, idx) => (
                  <div
                    key={player.playerId || idx}
                    onClick={() => player.playerId && onOpenPlayer && onOpenPlayer(player.playerId)}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-950/40 hover:bg-slate-800/60 border border-slate-800/40 cursor-pointer transition-colors text-xs group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 font-mono font-bold text-slate-500 text-center text-[11px]">
                        {player.rank || idx + 2}
                      </span>
                      <span className="font-bold text-slate-200 group-hover:text-amber-300 transition-colors truncate max-w-[130px]">
                        {player.playerName}
                      </span>
                      <span className="text-[10px] text-slate-500 truncate hidden sm:inline">
                        • {player.teamShortName || player.teamName}
                      </span>
                    </div>

                    <span className="font-mono font-black text-slate-100 text-xs">
                      {player.statValue}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
