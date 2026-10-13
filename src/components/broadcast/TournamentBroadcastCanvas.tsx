/**
 * SportsPulse - Standalone Universal Tournament Broadcast Canvas (1920x1080)
 * 
 * Served at: /broadcast/tournament/:tournamentId
 * Connects directly via Server-Sent Events (SSE) to display broadcast-grade
 * presentation graphics for Champions, MVPs, Awards, and Records.
 */

import React, { useState, useEffect } from 'react';
import { TournamentPresentationEvent } from '../../types';

interface TournamentBroadcastCanvasProps {
  tournamentId: string;
}

export const TournamentBroadcastCanvas: React.FC<TournamentBroadcastCanvasProps> = ({
  tournamentId,
}) => {
  const [currentEvent, setCurrentEvent] = useState<TournamentPresentationEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!tournamentId) return;

    // Connect to SSE presentation stream
    const eventSource = new EventSource(`/api/tournaments/${tournamentId}/presentation/sse`);

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (e) => {
      try {
        const payload: TournamentPresentationEvent = JSON.parse(e.data);
        if (payload.type === 'CLEAR') {
          setCurrentEvent(null);
        } else if (payload.type === 'CONNECTED') {
          // handshake
        } else {
          setCurrentEvent(payload);
        }
      } catch (err) {
        console.error('Failed to parse presentation event:', err);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [tournamentId]);

  if (!currentEvent || currentEvent.type === 'CLEAR') {
    return <div className="w-screen h-screen bg-transparent pointer-events-none" />;
  }

  const { type, title, data, cardConfig } = currentEvent;
  const template = cardConfig?.template || 'CHAMPIONSHIP_GOLD';
  const sponsor = cardConfig?.sponsor;

  return (
    <div className="w-screen h-screen bg-transparent flex items-center justify-center p-12 overflow-hidden select-none font-sans">
      {/* CARD WRAPPER */}
      <div
        className={`w-full max-w-4xl p-10 rounded-3xl border-2 shadow-2xl backdrop-blur-xl relative overflow-hidden transition-all duration-500 animate-in fade-in zoom-in-95 ${
          template === 'CHAMPIONSHIP_GOLD'
            ? 'bg-slate-950/95 border-amber-500/80 shadow-amber-500/20'
            : template === 'EMERALD_LUXURY'
            ? 'bg-slate-950/95 border-emerald-500/80 shadow-emerald-500/20'
            : 'bg-slate-950/95 border-slate-700'
        }`}
      >
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Badge */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-6 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{data?.awardIcon || data?.icon || '🏆'}</span>
            <div>
              <span className="text-xs uppercase font-black tracking-widest text-amber-400 block">
                Official Tournament Presentation
              </span>
              <h1 className="text-2xl font-black text-slate-100 uppercase tracking-tight">
                {title}
              </h1>
            </div>
          </div>

          {sponsor?.name && (
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Presented By</span>
              <span className="text-base font-black text-amber-400 tracking-wide">{sponsor.name}</span>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        {type === 'CHAMPION' ? (
          <div className="flex items-center gap-8 py-4">
            {data?.teamLogoUrl ? (
              <img
                src={data.teamLogoUrl}
                alt={data.teamName}
                className="w-32 h-32 rounded-3xl object-cover border-4 border-amber-500/60 shadow-2xl"
              />
            ) : (
              <div className="w-32 h-32 rounded-3xl bg-amber-500/20 border-4 border-amber-500/60 flex items-center justify-center text-5xl font-black text-amber-400">
                🥇
              </div>
            )}

            <div className="space-y-2 flex-1">
              <span className="text-xs font-black uppercase tracking-widest text-amber-400">
                TOURNAMENT CHAMPIONS
              </span>
              <h2 className="text-4xl font-black text-slate-100 tracking-tight">
                {data?.teamName || 'Champions'}
              </h2>
              {data?.scoreSummary && (
                <div className="text-base font-bold text-emerald-400">{data.scoreSummary}</div>
              )}
              {data?.runnerUpName && (
                <div className="text-xs text-slate-400">Finalist: {data.runnerUpName}</div>
              )}
            </div>
          </div>
        ) : type === 'MVP' || type === 'AWARD' ? (
          <div className="flex items-center gap-8 py-4">
            {data?.photo || data?.recipientPhoto ? (
              <img
                src={data.photo || data.recipientPhoto}
                alt={data?.playerName || 'Recipient'}
                className="w-32 h-32 rounded-full object-cover border-4 border-emerald-500/60 shadow-2xl"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-emerald-500/20 border-4 border-emerald-500/60 flex items-center justify-center text-4xl font-black text-emerald-400">
                {data?.playerName?.charAt(0) || 'P'}
              </div>
            )}

            <div className="space-y-2 flex-1">
              <span className="text-xs font-black uppercase tracking-widest text-emerald-400">
                {data?.awardTitle || 'Tournament Award Recipient'}
              </span>
              <h2 className="text-4xl font-black text-slate-100 tracking-tight">
                {data?.playerName || data?.recipientName || 'Award Winner'}
              </h2>
              {data?.teamName && (
                <div className="text-base font-bold text-slate-300">{data.teamName}</div>
              )}
              {data?.statSummary && (
                <div className="text-xs font-mono font-semibold text-amber-400">{data.statSummary}</div>
              )}
              {data?.citation && (
                <p className="text-xs text-slate-400 italic">"{data.citation}"</p>
              )}
            </div>
          </div>
        ) : type === 'RECORD' ? (
          <div className="space-y-6 py-4">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs uppercase font-bold text-amber-400">Record Benchmark</span>
                <div className="text-3xl font-black text-slate-100 font-mono">{data?.recordValue}</div>
              </div>
              <div className="text-right">
                <span className="text-xs uppercase font-bold text-slate-400">Holder</span>
                <div className="text-xl font-black text-emerald-400">{data?.playerName || data?.holderName}</div>
                {data?.teamName && <span className="text-xs text-slate-400">{data.teamName}</span>}
              </div>
            </div>

            {data?.supportingStats && (
              <div className="grid grid-cols-3 gap-3 text-xs">
                {Object.entries(data.supportingStats).map(([k, v]) => (
                  <div key={k} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">{k}</span>
                    <span className="text-sm font-bold text-slate-200">{String(v)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="py-4 text-slate-200 text-base font-medium">
            {JSON.stringify(data)}
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-slate-800/80 pt-4 mt-6 flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold">{data?.tournamentName || 'SportsPulse Tournament'}</span>
          <span className="font-mono text-[10px] text-emerald-400">LIVE PRESENTATION OVERLAY</span>
        </div>
      </div>
    </div>
  );
};
