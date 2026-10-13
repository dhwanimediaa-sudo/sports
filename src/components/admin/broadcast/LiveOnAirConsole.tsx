import React, { useState, useEffect, useRef } from 'react';
import { OnAirState, OnAirGraphicItem, SportType } from '../../../types';
import { api } from '../../../services/api';
import {
  Radio,
  Play,
  Square,
  Pause,
  SkipForward,
  RotateCcw,
  Eye,
  Trash2,
  Clock,
  Sparkles,
  AlertCircle,
  Zap,
  Flame,
  Layers,
  CheckCircle2,
  Activity,
  Keyboard,
} from 'lucide-react';

interface LiveOnAirConsoleProps {
  matchId: string;
  sport?: SportType;
}

export const LiveOnAirConsole: React.FC<LiveOnAirConsoleProps> = ({ matchId, sport = 'CRICKET' }) => {
  const [onAirState, setOnAirState] = useState<OnAirState | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Fetch initial on-air state
  const loadState = async () => {
    try {
      const res = await api.getOnAirState(matchId);
      setOnAirState(res.state);
    } catch (err) {
      console.error('Failed to load on-air state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadState();

    // Subscribe to SSE for live sync
    const sseUrl = `/api/matches/${matchId}/scoring/stream`;
    const eventSource = new EventSource(sseUrl);

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.onAirState) {
          setOnAirState(data.onAirState);
        }
      } catch (err) {
        // ignore parse error
      }
    };

    return () => {
      eventSource.close();
    };
  }, [matchId]);

  // Execute transport action
  const handleTransport = async (action: string, fn: () => Promise<any>) => {
    try {
      setActionInProgress(action);
      const res = await fn();
      if (res && res.state) {
        setOnAirState(res.state);
      }
    } catch (err) {
      console.error(`Error executing ${action}:`, err);
      showToast(`Action ${action} failed`);
    } finally {
      setActionInProgress(null);
    }
  };

  // Transport functions
  const handleTake = () =>
    handleTransport('TAKE', () => api.takeLiveOnAir(matchId, onAirState?.previewGraphic || {}));

  const handleHold = () =>
    handleTransport('HOLD', () => api.holdOnAir(matchId));

  const handleClear = () =>
    handleTransport('CLEAR', () => api.clearOnAir(matchId));

  const handleReplay = () =>
    handleTransport('REPLAY', () => api.replayOnAir(matchId));

  const handleNext = () =>
    handleTransport('NEXT', () => api.nextOnAir(matchId));

  const handleSkip = (index = 0) =>
    handleTransport('SKIP', () => api.skipOnAir(matchId, index));

  const handleStop = () =>
    handleTransport('STOP', () => api.stopOnAir(matchId));

  // Keyboard Shortcuts (Space for Take, C for Clear, H for Hold, N for Next)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid firing when operator is typing into an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleTake();
      } else if (e.key.toLowerCase() === 'c') {
        handleClear();
      } else if (e.key.toLowerCase() === 'h') {
        handleHold();
      } else if (e.key.toLowerCase() === 'n') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onAirState, matchId]);

  const currentLive = onAirState?.currentOnAir;
  const currentPreview = onAirState?.previewGraphic;
  const queue = onAirState?.queue || [];
  const isHolding = Boolean(onAirState?.holdActive);

  // Time remaining calculation
  const remaining = onAirState?.remainingSeconds ?? 0;
  const duration = currentLive?.durationSeconds || 0;
  const progressPercent = duration > 0 ? Math.max(0, Math.min(100, (remaining / duration) * 100)) : 0;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-lg shadow-2xl font-bold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Dual Bus Display: PREVIEW vs PROGRAM */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* PREVIEW BUS */}
        <div className="bg-slate-900 border-2 border-emerald-500/40 rounded-2xl p-5 relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-sm font-black text-emerald-400 tracking-wider uppercase">
                PREVIEW BUS (NEXT UP)
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
              READY
            </span>
          </div>

          <div className="py-6 min-h-[140px] flex flex-col justify-center">
            {currentPreview ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-white">
                    {currentPreview.eventName || currentPreview.graphicName || 'Untitled Graphic'}
                  </span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                    {currentPreview.sourceType}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                  <span>In: {currentPreview.entryAnimation || 'POP'}</span>
                  <span>•</span>
                  <span>Out: {currentPreview.exitAnimation || 'FADE'}</span>
                  <span>•</span>
                  <span>Duration: {currentPreview.durationSeconds ? `${currentPreview.durationSeconds}s` : 'Manual'}</span>
                  <span>•</span>
                  <span>Priority: {currentPreview.priority || 50}</span>
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-500 py-4">
                <Eye className="w-6 h-6 mx-auto mb-1 opacity-40" />
                <span className="text-xs">Preview bus is empty. Click "Preview" on any assignment or scene.</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
            <span className="text-slate-500 font-mono">Cued from {currentPreview?.triggerSource || 'OPERATOR'}</span>
            <button
              onClick={handleTake}
              disabled={!currentPreview || actionInProgress === 'TAKE'}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold rounded-lg transition shadow-md shadow-emerald-950/40"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>CUE TO PROGRAM</span>
            </button>
          </div>
        </div>

        {/* PROGRAM BUS (LIVE ON AIR) */}
        <div
          className={`bg-slate-900 border-2 rounded-2xl p-5 relative overflow-hidden shadow-xl transition-all duration-300 ${
            currentLive
              ? 'border-red-500/80 shadow-red-950/30 ring-1 ring-red-500/40'
              : 'border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  currentLive ? 'bg-red-500 animate-ping' : 'bg-slate-600'
                }`}
              />
              <span
                className={`text-sm font-black tracking-wider uppercase flex items-center gap-2 ${
                  currentLive ? 'text-red-400' : 'text-slate-400'
                }`}
              >
                <span>PROGRAM BUS (LIVE ON AIR)</span>
                {currentLive && (
                  <span className="px-2 py-0.2 bg-red-600 text-white text-[10px] rounded font-black animate-pulse">
                    ON AIR
                  </span>
                )}
              </span>
            </div>

            {isHolding && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-950 border border-amber-600 text-amber-300 font-black animate-pulse">
                HOLD ACTIVE
              </span>
            )}
          </div>

          <div className="py-6 min-h-[140px] flex flex-col justify-center">
            {currentLive ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-2xl font-black text-white flex items-center gap-2">
                      <span>{currentLive.eventName || currentLive.graphicName || 'Live Graphic'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-300 font-mono mt-1">
                      <span className="text-red-400 font-bold">{currentLive.sourceType}</span>
                      <span>•</span>
                      <span>Target: {currentLive.targetId || 'GLOBAL'}</span>
                      <span>•</span>
                      <span>Source: {currentLive.triggerSource}</span>
                    </div>
                  </div>

                  {/* Countdown Timer Display */}
                  <div className="flex flex-col items-end">
                    <div className="text-2xl font-black font-mono text-emerald-400">
                      {isHolding ? 'HOLD' : duration > 0 ? `${remaining.toFixed(1)}s` : 'INF'}
                    </div>
                    {duration > 0 && !isHolding && (
                      <div className="w-24 bg-slate-800 h-1.5 rounded-full mt-1 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full transition-all duration-1000"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-500 py-4">
                <Square className="w-6 h-6 mx-auto mb-1 opacity-40 text-slate-600" />
                <span className="text-xs">No graphic on air. Canvas is running clean background / scorebug.</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
            <span className="text-slate-500 font-mono">
              Output Status: {currentLive ? 'BROADCASTING 1080p' : 'IDLE'}
            </span>
            {currentLive && (
              <button
                onClick={handleClear}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>CUT OFF AIR</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* TACTILE MASTER TRANSPORT BUTTONS */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Master Transport Controls</span>
          </h3>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
            <Keyboard className="w-3.5 h-3.5" />
            <span>Hotkeys: Space (Take) • C (Clear) • H (Hold) • N (Next)</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {/* TAKE LIVE BUTTON */}
          <button
            onClick={handleTake}
            disabled={actionInProgress !== null}
            className="group relative flex flex-col items-center justify-center p-4 bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 active:scale-95 text-white rounded-xl shadow-lg shadow-red-950/60 border border-red-500 transition-all font-black"
          >
            <Zap className="w-6 h-6 mb-1 text-white group-hover:scale-110 transition" />
            <span className="text-sm">TAKE LIVE</span>
            <span className="text-[10px] font-mono opacity-80 mt-0.5">[Space]</span>
          </button>

          {/* HOLD TOGGLE BUTTON */}
          <button
            onClick={handleHold}
            disabled={!currentLive || actionInProgress !== null}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border font-bold transition-all active:scale-95 ${
              isHolding
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-950/60 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-amber-400 border-slate-700 disabled:opacity-40'
            }`}
          >
            <Pause className="w-6 h-6 mb-1 fill-current" />
            <span className="text-sm">{isHolding ? 'HOLDING' : 'HOLD'}</span>
            <span className="text-[10px] font-mono opacity-70 mt-0.5">[H]</span>
          </button>

          {/* CLEAR / CUT OFF BUTTON */}
          <button
            onClick={handleClear}
            disabled={!currentLive || actionInProgress !== null}
            className="flex flex-col items-center justify-center p-4 bg-slate-800 hover:bg-rose-950/70 hover:border-rose-700 text-rose-400 border border-slate-700 disabled:opacity-40 active:scale-95 rounded-xl font-bold transition-all"
          >
            <Square className="w-6 h-6 mb-1" />
            <span className="text-sm">CLEAR</span>
            <span className="text-[10px] font-mono opacity-70 mt-0.5">[C]</span>
          </button>

          {/* REPLAY BUTTON */}
          <button
            onClick={handleReplay}
            disabled={!currentLive && !onAirState?.recentHistory?.length}
            className="flex flex-col items-center justify-center p-4 bg-slate-800 hover:bg-sky-950/70 hover:border-sky-700 text-sky-400 border border-slate-700 disabled:opacity-40 active:scale-95 rounded-xl font-bold transition-all"
          >
            <RotateCcw className="w-6 h-6 mb-1" />
            <span className="text-sm">REPLAY</span>
            <span className="text-[10px] font-mono opacity-70 mt-0.5">Re-fire</span>
          </button>

          {/* NEXT (QUEUE) BUTTON */}
          <button
            onClick={handleNext}
            disabled={queue.length === 0 || actionInProgress !== null}
            className="flex flex-col items-center justify-center p-4 bg-slate-800 hover:bg-purple-950/70 hover:border-purple-700 text-purple-400 border border-slate-700 disabled:opacity-40 active:scale-95 rounded-xl font-bold transition-all"
          >
            <SkipForward className="w-6 h-6 mb-1" />
            <span className="text-sm">NEXT</span>
            <span className="text-[10px] font-mono opacity-70 mt-0.5">({queue.length}) [N]</span>
          </button>

          {/* SKIP QUEUE BUTTON */}
          <button
            onClick={() => handleSkip(0)}
            disabled={queue.length === 0 || actionInProgress !== null}
            className="flex flex-col items-center justify-center p-4 bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 disabled:opacity-40 active:scale-95 rounded-xl font-bold transition-all"
          >
            <Trash2 className="w-6 h-6 mb-1" />
            <span className="text-sm">SKIP QUEUED</span>
            <span className="text-[10px] font-mono opacity-70 mt-0.5">Discard</span>
          </button>

          {/* EMERGENCY STOP BUTTON */}
          <button
            onClick={handleStop}
            disabled={actionInProgress !== null}
            className="flex flex-col items-center justify-center p-4 bg-slate-800 hover:bg-red-950/80 text-rose-500 border border-slate-700 hover:border-red-900 active:scale-95 rounded-xl font-bold transition-all"
          >
            <AlertCircle className="w-6 h-6 mb-1 text-red-500" />
            <span className="text-sm">KILL ALL</span>
            <span className="text-[10px] font-mono opacity-70 mt-0.5">Emergency</span>
          </button>
        </div>
      </div>

      {/* Live Queued Graphics Table & Recent History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pending Live Queue */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              <span>Pending Queue ({queue.length})</span>
            </h4>
            {queue.length > 0 && (
              <button
                onClick={() => handleSkip(0)}
                className="text-[11px] text-rose-400 hover:underline"
              >
                Clear Queue
              </button>
            )}
          </div>

          {queue.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No graphics in queue. When auto-events occur or playlists are queued, they appear here.
            </div>
          ) : (
            <div className="space-y-2">
              {queue.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-purple-400">#{idx + 1}</span>
                    <div>
                      <div className="font-bold text-white">
                        {item.eventName || item.graphicName || 'Queued Item'}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Priority: {item.priority || 50} • {item.durationSeconds || 4}s
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleTake()}
                      className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white font-bold rounded text-[11px]"
                    >
                      Fire Now
                    </button>
                    <button
                      onClick={() => handleSkip(idx)}
                      className="p-1 text-slate-500 hover:text-rose-400"
                      title="Remove from queue"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent On-Air Audit History */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Recent On-Air History</span>
            </h4>
            <span className="text-[11px] font-mono text-slate-500">Last 10 items</span>
          </div>

          {!onAirState?.recentHistory || onAirState.recentHistory.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No on-air history logged for this session yet.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
              {onAirState.recentHistory.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-2 bg-slate-950/40 rounded border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                    <span className="font-bold text-slate-300">
                      {item.eventName || item.graphicName || 'Graphic'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      ({item.triggerSource || 'MANUAL'})
                    </span>
                  </div>
                  <button
                    onClick={() => api.takeLiveOnAir(matchId, item).then(loadState)}
                    className="text-[10px] text-sky-400 hover:text-sky-300 font-mono"
                  >
                    Re-Take ↺
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
