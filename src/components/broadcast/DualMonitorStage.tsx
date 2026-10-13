import React, { useEffect, useRef, useState } from 'react';
import { OnAirGraphicItem, Match, SportType } from '../../types';
import { BroadcastCanvas } from './BroadcastCanvas';
import {
  Eye,
  Tv,
  Radio,
  Clock,
  Sparkles,
  Play,
  Maximize2,
  ExternalLink,
  Shield,
  Flame,
  CheckCircle2,
  Pause,
} from 'lucide-react';

interface DualMonitorStageProps {
  matchId: string;
  sport: SportType;
  match?: Match | null;
  scoringState?: any;
  previewGraphic: OnAirGraphicItem | null;
  currentOnAir: OnAirGraphicItem | null;
  onTakePreviewToLive?: () => void;
  onClearOnAir?: () => void;
  onHoldOnAir?: () => void;
}

export const DualMonitorStage: React.FC<DualMonitorStageProps> = ({
  matchId,
  sport,
  match,
  scoringState,
  previewGraphic,
  currentOnAir,
  onTakePreviewToLive,
  onClearOnAir,
  onHoldOnAir,
}) => {
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const programContainerRef = useRef<HTMLDivElement>(null);

  const [previewScale, setPreviewScale] = useState<number>(0.3);
  const [programScale, setProgramScale] = useState<number>(0.3);

  // Measure and calculate exact 1920x1080 fit scale using ResizeObserver
  useEffect(() => {
    const updatePreviewScale = () => {
      if (!previewContainerRef.current) return;
      const rect = previewContainerRef.current.getBoundingClientRect();
      const s = Math.min(rect.width / 1920, rect.height / 1080);
      setPreviewScale(Math.max(0.05, s));
    };

    const updateProgramScale = () => {
      if (!programContainerRef.current) return;
      const rect = programContainerRef.current.getBoundingClientRect();
      const s = Math.min(rect.width / 1920, rect.height / 1080);
      setProgramScale(Math.max(0.05, s));
    };

    updatePreviewScale();
    updateProgramScale();

    const pObserver = new ResizeObserver(() => updatePreviewScale());
    const progObserver = new ResizeObserver(() => updateProgramScale());

    if (previewContainerRef.current) pObserver.observe(previewContainerRef.current);
    if (programContainerRef.current) progObserver.observe(programContainerRef.current);

    return () => {
      pObserver.disconnect();
      progObserver.disconnect();
    };
  }, []);

  // Time remaining on-air calculation
  const remaining = currentOnAir?.remainingSeconds ?? 0;
  const totalDuration = currentOnAir?.durationSeconds ?? 4;
  const progressPercent =
    totalDuration > 0 ? Math.max(0, Math.min(100, (remaining / totalDuration) * 100)) : 0;
  const isHeld = Boolean(currentOnAir?.isHeld);

  const broadcastUrl = `${window.location.origin}/broadcast/match/${matchId}`;

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Dual Bus Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 flex-1 min-h-[360px] lg:min-h-[420px]">
        {/* ========================================================= */}
        {/* 1. PREVIEW MONITOR (PST BUS) */}
        {/* ========================================================= */}
        <div className="flex flex-col bg-slate-950 border-2 border-emerald-500/40 rounded-xl overflow-hidden shadow-2xl relative">
          {/* Monitor Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-emerald-500/30">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              <span className="text-xs font-black tracking-widest text-emerald-400 uppercase">
                PREVIEW BUS (PST)
              </span>
              <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                1920 × 1080 CANVAS
              </span>
            </div>

            <div className="flex items-center gap-2">
              {previewGraphic ? (
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-emerald-500 text-slate-950">
                  READY TO TAKE
                </span>
              ) : (
                <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                  STANDBY
                </span>
              )}
            </div>
          </div>

          {/* 1920x1080 Scaled Stage Container */}
          <div
            ref={previewContainerRef}
            className="flex-1 relative w-full h-full min-h-[220px] bg-slate-950 flex items-center justify-center overflow-hidden"
          >
            {/* Checkerboard transparency / broadcast backdrop */}
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage: `radial-gradient(#10b981 1px, transparent 1px)`,
                backgroundSize: '20px 20px',
              }}
            />

            {/* Broadcast Stage Container fixed at 1920x1080 scaled down */}
            <div
              style={{
                width: 1920,
                height: 1080,
                transform: `scale(${previewScale})`,
                transformOrigin: 'center center',
              }}
              className="absolute pointer-events-none shadow-2xl border border-emerald-500/20"
            >
              {matchId ? (
                <BroadcastCanvas
                  matchId={matchId}
                  previewMode={true}
                  previewOnAirItemOverride={previewGraphic}
                />
              ) : null}
            </div>

            {/* If no preview item cued */}
            {!previewGraphic && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/60 pointer-events-none text-center p-4">
                <Eye className="w-8 h-8 text-emerald-500/40 mb-2" />
                <span className="text-xs font-bold text-slate-400">Preview Bus Idle</span>
                <span className="text-[10px] text-slate-600 mt-0.5">
                  Click "Preview" on any Event Trigger, Scene, or Playlist item to cue
                </span>
              </div>
            )}
          </div>

          {/* Monitor Footer Bar */}
          <div className="flex items-center justify-between px-3 py-2 bg-slate-900/90 border-t border-slate-800 text-xs font-mono">
            <div className="flex items-center gap-2 overflow-hidden truncate">
              <span className="text-slate-500">CUED:</span>
              <span className="font-bold text-white truncate">
                {previewGraphic?.graphicName || previewGraphic?.eventName || previewGraphic?.sceneName || 'None'}
              </span>
              {previewGraphic?.sourceType && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-emerald-400">
                  {previewGraphic.sourceType}
                </span>
              )}
            </div>

            {previewGraphic && onTakePreviewToLive && (
              <button
                onClick={onTakePreviewToLive}
                className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded transition shadow-md shrink-0 cursor-pointer"
                title="Cut preview graphic to Program (Space)"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>CUT TO PROGRAM</span>
              </button>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. PROGRAM MONITOR (PGM BUS - ON AIR) */}
        {/* ========================================================= */}
        <div
          className={`flex flex-col bg-slate-950 border-2 rounded-xl overflow-hidden shadow-2xl relative transition-all duration-300 ${
            currentOnAir
              ? 'border-red-500/90 shadow-[0_0_24px_rgba(239,68,68,0.3)] ring-1 ring-red-500/60'
              : 'border-slate-800'
          }`}
        >
          {/* Monitor Header */}
          <div
            className={`flex items-center justify-between px-3 py-2 border-b transition-colors ${
              currentOnAir
                ? 'bg-red-950/80 border-red-500/50'
                : 'bg-slate-900 border-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  currentOnAir
                    ? 'bg-red-500 animate-ping shadow-[0_0_10px_rgba(239,68,68,1)]'
                    : 'bg-slate-600'
                }`}
              />
              <span
                className={`text-xs font-black tracking-widest uppercase ${
                  currentOnAir ? 'text-red-400' : 'text-slate-400'
                }`}
              >
                PROGRAM BUS (PGM)
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-black ${
                  currentOnAir
                    ? 'bg-red-600 text-white animate-pulse'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                {currentOnAir ? '● LIVE ON AIR' : 'OFF AIR'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={broadcastUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] font-mono text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 transition"
                title="Open broadcast output in standalone tab"
              >
                <ExternalLink className="w-2.5 h-2.5" />
                <span>OBS POP-OUT</span>
              </a>
            </div>
          </div>

          {/* 1920x1080 Scaled Stage Container */}
          <div
            ref={programContainerRef}
            className="flex-1 relative w-full h-full min-h-[220px] bg-slate-950 flex items-center justify-center overflow-hidden"
          >
            {/* Checkerboard pattern */}
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage: `radial-gradient(${currentOnAir ? '#ef4444' : '#475569'} 1px, transparent 1px)`,
                backgroundSize: '20px 20px',
              }}
            />

            {/* Broadcast Stage Container fixed at 1920x1080 scaled down */}
            <div
              style={{
                width: 1920,
                height: 1080,
                transform: `scale(${programScale})`,
                transformOrigin: 'center center',
              }}
              className="absolute pointer-events-none shadow-2xl border border-red-500/20"
            >
              {matchId ? (
                <BroadcastCanvas matchId={matchId} previewMode={false} />
              ) : null}
            </div>

            {/* If off air */}
            {!currentOnAir && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/60 pointer-events-none text-center p-4">
                <Tv className="w-8 h-8 text-slate-700 mb-2" />
                <span className="text-xs font-bold text-slate-500">Live Presentation Idle</span>
                <span className="text-[10px] text-slate-600 mt-0.5">
                  Base scoreboard remains visible on OBS output. No event overlay active.
                </span>
              </div>
            )}
          </div>

          {/* Progress bar countdown */}
          {currentOnAir && totalDuration > 0 && (
            <div className="w-full bg-slate-950 h-1 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  isHeld ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}

          {/* Monitor Footer Bar */}
          <div className="flex items-center justify-between px-3 py-2 bg-slate-900/90 border-t border-slate-800 text-xs font-mono">
            <div className="flex items-center gap-2 overflow-hidden truncate">
              <span className="text-slate-500">ON AIR:</span>
              <span className="font-bold text-white truncate">
                {currentOnAir?.graphicName || currentOnAir?.eventName || currentOnAir?.sceneName || 'Standby Output'}
              </span>
              {currentOnAir && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                    isHeld
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : 'bg-red-950 text-red-300 border border-red-800'
                  }`}
                >
                  {isHeld ? 'HOLD' : `${remaining}s`}
                </span>
              )}
            </div>

            {currentOnAir && (
              <div className="flex items-center gap-1.5 shrink-0">
                {onHoldOnAir && (
                  <button
                    onClick={onHoldOnAir}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition flex items-center gap-1 ${
                      isHeld
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-800 hover:bg-slate-700 text-amber-400'
                    }`}
                    title="Toggle timer freeze (H)"
                  >
                    <Pause className="w-2.5 h-2.5" />
                    <span>{isHeld ? 'RESUME' : 'HOLD'}</span>
                  </button>
                )}
                {onClearOnAir && (
                  <button
                    onClick={onClearOnAir}
                    className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-slate-800 hover:bg-red-900 text-red-400 hover:text-white transition"
                    title="Cut graphic off air immediately (C)"
                  >
                    CLEAR
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
