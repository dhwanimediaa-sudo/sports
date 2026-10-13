import React from 'react';
import { KnockoutBracketRound, KnockoutMatchNode } from '../../types';
import { Trophy, Shield, ChevronRight, CheckCircle2, Clock } from 'lucide-react';

interface PublicKnockoutBracketViewProps {
  bracket?: {
    type?: string;
    championTeamName?: string;
    rounds?: KnockoutBracketRound[];
  } | null;
  onOpenMatch: (matchId: string) => void;
  onOpenTeam?: (teamId: string) => void;
}

export const PublicKnockoutBracketView: React.FC<PublicKnockoutBracketViewProps> = ({
  bracket,
  onOpenMatch,
  onOpenTeam,
}) => {
  if (!bracket || !bracket.rounds || bracket.rounds.length === 0) {
    return (
      <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-12 text-center space-y-3">
        <Trophy className="w-10 h-10 text-slate-600 mx-auto" />
        <h4 className="text-sm font-bold text-slate-300">Knockout Bracket Not Yet Generated</h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          The playoff elimination bracket will be unveiled as teams qualify from group stages.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex items-center justify-between bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2.5">
          <Trophy className="w-5 h-5 text-amber-400" />
          <div>
            <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider">
              Official Championship Bracket
            </h3>
            <p className="text-xs text-slate-400">
              {bracket.type || 'Single Elimination'} • {bracket.rounds.length} Rounds of Play
            </p>
          </div>
        </div>

        {bracket.championTeamName && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black">
            <span>🏆 Champion:</span>
            <span className="text-slate-100">{bracket.championTeamName}</span>
          </div>
        )}
      </div>

      {/* Bracket Tree Container */}
      <div className="overflow-x-auto pb-6">
        <div className="flex items-stretch gap-6 sm:gap-8 min-w-[700px] p-2">
          {bracket.rounds.map((round: KnockoutBracketRound, rIdx: number) => (
            <div key={round.roundKey || rIdx} className="flex-1 flex flex-col min-w-[240px] space-y-4">
              {/* Round Header */}
              <div className="text-center py-2 px-3 rounded-xl bg-slate-900 border border-slate-800/80">
                <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                  {round.title || `Round ${rIdx + 1}`}
                </span>
              </div>

              {/* Round Match Nodes */}
              <div className="flex-1 flex flex-col justify-around space-y-4 py-2">
                {(round.matches || []).map((node: KnockoutMatchNode, nIdx: number) => {
                  const isCompleted = node.status === 'COMPLETED';
                  const isLive = node.status === 'LIVE';
                  const isTeamAWinner = node.winnerTeamId === node.homeTeamId;
                  const isTeamBWinner = node.winnerTeamId === node.awayTeamId;

                  return (
                    <div
                      key={node.id || nIdx}
                      id={`bracket-node-${node.id}`}
                      onClick={() => node.matchId && onOpenMatch(node.matchId)}
                      className={`relative rounded-2xl p-3 border transition-all duration-200 ${
                        node.matchId ? 'cursor-pointer hover:border-amber-500/60 hover:shadow-lg' : ''
                      } ${
                        isLive
                          ? 'bg-slate-900/90 border-emerald-500 shadow-md shadow-emerald-500/10'
                          : isCompleted
                          ? 'bg-slate-900/80 border-slate-800'
                          : 'bg-slate-900/40 border-slate-800/60'
                      }`}
                    >
                      {/* Live Badge */}
                      {isLive && (
                        <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500 text-slate-950 flex items-center gap-1 shadow">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
                          LIVE
                        </div>
                      )}

                      <div className="text-[10px] font-bold text-slate-500 mb-1.5 flex items-center justify-between">
                        <span>{node.matchNumber ? `Match #${node.matchNumber}` : `Slot ${nIdx + 1}`}</span>
                        {node.matchDate && <span>{node.matchDate}</span>}
                      </div>

                      {/* Team A (Home) */}
                      <div
                        className={`flex items-center justify-between p-1.5 rounded-lg mb-1 transition-colors ${
                          isTeamAWinner ? 'bg-amber-500/15 text-amber-200 font-black' : 'text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-[10px] font-mono text-slate-500 w-4 text-center">
                            {node.homeSeed || '•'}
                          </span>
                          <span className="text-xs truncate font-bold">{node.homeTeamName || node.homeTeamPlaceholder || 'TBD'}</span>
                        </div>
                        <span className="text-xs font-mono font-black text-slate-100 ml-2">
                          {node.homeTeamScore !== undefined ? node.homeTeamScore : ''}
                        </span>
                      </div>

                      {/* Team B (Away) */}
                      <div
                        className={`flex items-center justify-between p-1.5 rounded-lg transition-colors ${
                          isTeamBWinner ? 'bg-amber-500/15 text-amber-200 font-black' : 'text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-[10px] font-mono text-slate-500 w-4 text-center">
                            {node.awaySeed || '•'}
                          </span>
                          <span className="text-xs truncate font-bold">{node.awayTeamName || node.awayTeamPlaceholder || 'TBD'}</span>
                        </div>
                        <span className="text-xs font-mono font-black text-slate-100 ml-2">
                          {node.awayTeamScore !== undefined ? node.awayTeamScore : ''}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
