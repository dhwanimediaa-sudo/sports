import React from 'react';
import { Match, MatchStatus } from '../../types';
import { Radio, MapPin, Clock, Trophy, ChevronRight, Sparkles } from 'lucide-react';

interface PublicLiveMatchCardProps {
  match: Match & { liveScoreText?: string; liveDetailText?: string };
  onOpenMatch: (matchId: string) => void;
  onOpenTeam?: (teamId: string) => void;
}

export const PublicLiveMatchCard: React.FC<PublicLiveMatchCardProps> = ({
  match,
  onOpenMatch,
  onOpenTeam,
}) => {
  const isLive = match.status === 'LIVE';
  const isCompleted = match.status === 'COMPLETED';

  // Sport-specific scoring displays
  const getSportScore = () => {
    if (match.liveScoreText) {
      return {
        primary: match.liveScoreText,
        secondary: match.liveDetailText || match.round || '',
      };
    }

    if (match.sport === 'CRICKET' && match.cricketConfig) {
      const { teamAScore, teamBScore, currentInnings } = match.cricketConfig as any;
      return {
        primary: `${match.teamA?.shortName || match.teamA?.name || 'Team A'} vs ${match.teamB?.shortName || match.teamB?.name || 'Team B'}`,
        secondary: currentInnings ? `Innings ${currentInnings}` : 'Live Cricket Match',
      };
    }

    return {
      primary: isLive ? 'Live In Progress' : isCompleted ? 'Full Time' : `${match.time} • ${match.date}`,
      secondary: match.round || 'Tournament Match',
    };
  };

  const scoreInfo = getSportScore();

  return (
    <div
      id={`live-match-card-${match.id}`}
      onClick={() => onOpenMatch(match.id)}
      className={`group relative rounded-2xl p-4 sm:p-5 transition-all duration-300 cursor-pointer overflow-hidden border ${
        isLive
          ? 'bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border-emerald-500/60 shadow-lg shadow-emerald-500/10 hover:border-emerald-400 hover:shadow-emerald-500/20'
          : isCompleted
          ? 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'
          : 'bg-slate-900/50 border-slate-800/60 hover:border-slate-700 hover:bg-slate-900/80'
      }`}
    >
      {/* Glow highlight for Live */}
      {isLive && (
        <div className="absolute -top-12 -right-12 w-24 h-24 bg-emerald-500/15 rounded-full blur-xl pointer-events-none" />
      )}

      {/* Top Meta Bar */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          {isLive ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wider uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              LIVE
            </span>
          ) : isCompleted ? (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-800 text-slate-400 border border-slate-700">
              FT • COMPLETED
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-sky-950 text-sky-400 border border-sky-800/50 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              UPCOMING
            </span>
          )}
          <span className="text-[11px] font-medium text-slate-400 truncate max-w-[140px] sm:max-w-[200px]">
            {match.matchNumber ? `Match #${match.matchNumber}` : ''} {match.round ? `• ${match.round}` : ''}
          </span>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-slate-400 truncate">
          <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" />
          <span className="truncate max-w-[120px]">{match.venue || 'Main Arena'}</span>
        </div>
      </div>

      {/* Teams and Scoreline */}
      <div className="space-y-2.5 py-1">
        {/* Team A */}
        <div className="flex items-center justify-between gap-3">
          <div
            className="flex items-center gap-2.5 min-w-0 flex-1"
            onClick={(e) => {
              if (match.teamAId && onOpenTeam) {
                e.stopPropagation();
                onOpenTeam(match.teamAId);
              }
            }}
          >
            {match.teamA?.logoUrl ? (
              <img
                src={match.teamA.logoUrl}
                alt={match.teamA.name}
                className="w-7 h-7 rounded-lg object-cover border border-slate-700 flex-shrink-0"
              />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 flex-shrink-0">
                {match.teamA?.shortName?.slice(0, 2) || match.teamA?.name?.slice(0, 2) || 'TA'}
              </div>
            )}
            <span className="text-sm font-bold text-slate-100 truncate group-hover:text-emerald-300 transition-colors">
              {match.teamA?.name || 'Team A'}
            </span>
          </div>

          <div className="text-right flex-shrink-0">
            <span className="text-base sm:text-lg font-black text-slate-100 font-mono tracking-tight">
              {match.cricketConfig?.teamAScore || (match as any).scoreA || (isCompleted ? '-' : '')}
            </span>
          </div>
        </div>

        {/* Team B */}
        <div className="flex items-center justify-between gap-3">
          <div
            className="flex items-center gap-2.5 min-w-0 flex-1"
            onClick={(e) => {
              if (match.teamBId && onOpenTeam) {
                e.stopPropagation();
                onOpenTeam(match.teamBId);
              }
            }}
          >
            {match.teamB?.logoUrl ? (
              <img
                src={match.teamB.logoUrl}
                alt={match.teamB.name}
                className="w-7 h-7 rounded-lg object-cover border border-slate-700 flex-shrink-0"
              />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 flex-shrink-0">
                {match.teamB?.shortName?.slice(0, 2) || match.teamB?.name?.slice(0, 2) || 'TB'}
              </div>
            )}
            <span className="text-sm font-bold text-slate-100 truncate group-hover:text-emerald-300 transition-colors">
              {match.teamB?.name || 'Team B'}
            </span>
          </div>

          <div className="text-right flex-shrink-0">
            <span className="text-base sm:text-lg font-black text-slate-100 font-mono tracking-tight">
              {match.cricketConfig?.teamBScore || (match as any).scoreB || (isCompleted ? '-' : '')}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Summary Bar */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
        <div className="text-slate-300 font-medium truncate max-w-[240px]">
          {scoreInfo.primary || scoreInfo.secondary}
        </div>
        <div className="flex items-center gap-1 text-emerald-400 font-bold group-hover:translate-x-0.5 transition-transform flex-shrink-0">
          <span>Match Center</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
};
