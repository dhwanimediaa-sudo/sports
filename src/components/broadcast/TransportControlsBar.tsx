import React, { useEffect } from 'react';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  SkipForward,
  FastForward,
  AlertOctagon,
  Sparkles,
} from 'lucide-react';

interface TransportControlsBarProps {
  onTake: () => void;
  onHold: () => void;
  onClear: () => void;
  onReplay: () => void;
  onNext: () => void;
  onSkip: () => void;
  onKillAll: () => void;
  isTakeDisabled?: boolean;
  isHolding?: boolean;
  isOnAir?: boolean;
  isQueueEmpty?: boolean;
  actionInProgress?: string | null;
  isLocked?: boolean;
}

export const TransportControlsBar: React.FC<TransportControlsBarProps> = ({
  onTake,
  onHold,
  onClear,
  onReplay,
  onNext,
  onSkip,
  onKillAll,
  isTakeDisabled = false,
  isHolding = false,
  isOnAir = false,
  isQueueEmpty = true,
  actionInProgress = null,
  isLocked = false,
}) => {
  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Never trigger shortcuts while typing inside text inputs, textareas, selects, or contenteditable
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        onTake();
      } else if (e.key.toLowerCase() === 'h' || e.code === 'F1') {
        e.preventDefault();
        onHold();
      } else if (e.key.toLowerCase() === 'c' || e.key === 'Escape') {
        e.preventDefault();
        onClear();
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        onReplay();
      } else if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        onNext();
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        onSkip();
      } else if (e.key.toLowerCase() === 'k' || e.key === 'Delete') {
        e.preventDefault();
        onKillAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onTake, onHold, onClear, onReplay, onNext, onSkip, onKillAll]);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-xl backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left Side: Core Transport Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {/* TAKE LIVE (Hero Button) */}
          <button
            id="btn-transport-take-live"
            onClick={onTake}
            disabled={actionInProgress === 'TAKE'}
            className="group relative flex items-center gap-2 px-5 py-2.5 min-h-[46px] sm:min-h-[48px] bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm rounded-lg shadow-lg shadow-emerald-950/60 transition active:scale-95 cursor-pointer disabled:opacity-50 touch-manipulation select-none"
            title="Cut Preview or Next Queued item onto Air (Shortcut: Space)"
          >
            <Play className="w-4 h-4 fill-current transition group-hover:scale-110" />
            <span className="tracking-wide">TAKE LIVE</span>
            <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-black/30 border border-white/20 rounded font-normal text-emerald-200">
              SPACE
            </kbd>
          </button>

          {/* HOLD */}
          <button
            id="btn-transport-hold"
            onClick={onHold}
            disabled={!isOnAir || actionInProgress === 'HOLD'}
            className={`flex items-center gap-1.5 px-4 py-2.5 min-h-[46px] sm:min-h-[48px] font-bold text-xs rounded-lg transition active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer touch-manipulation select-none ${
              isHolding
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-950/60 ring-2 ring-amber-400'
                : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700'
            }`}
            title="Freeze/Resume on-air countdown timer (Shortcut: H)"
          >
            <Pause className="w-3.5 h-3.5" />
            <span>{isHolding ? 'HOLD ACTIVE' : 'HOLD'}</span>
            <kbd className="hidden sm:inline-block ml-0.5 px-1.5 py-0.5 text-[9px] font-mono bg-slate-950/60 border border-slate-700 rounded text-slate-300">
              H
            </kbd>
          </button>

          {/* CLEAR */}
          <button
            id="btn-transport-clear"
            onClick={onClear}
            disabled={!isOnAir || actionInProgress === 'CLEAR'}
            className="flex items-center gap-1.5 px-4 py-2.5 min-h-[46px] sm:min-h-[48px] bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-bold text-xs rounded-lg transition active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer touch-manipulation select-none"
            title="Cut on-air graphic immediately (Shortcut: C)"
          >
            <Square className="w-3.5 h-3.5 fill-current opacity-70" />
            <span>CLEAR</span>
            <kbd className="hidden sm:inline-block ml-0.5 px-1.5 py-0.5 text-[9px] font-mono bg-slate-950/60 border border-slate-700 rounded text-slate-300">
              C
            </kbd>
          </button>

          {/* REPLAY */}
          <button
            id="btn-transport-replay"
            onClick={onReplay}
            disabled={actionInProgress === 'REPLAY'}
            className="flex items-center gap-1.5 px-3.5 py-2.5 min-h-[46px] sm:min-h-[48px] bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 font-bold text-xs rounded-lg transition active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer touch-manipulation select-none"
            title="Re-fire current or preview graphic with freshly evaluated live data (Shortcut: R)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>REPLAY</span>
            <kbd className="hidden sm:inline-block ml-0.5 px-1.5 py-0.5 text-[9px] font-mono bg-slate-950/60 border border-slate-700 rounded text-slate-300">
              R
            </kbd>
          </button>

          {/* NEXT */}
          <button
            id="btn-transport-next"
            onClick={onNext}
            disabled={actionInProgress === 'NEXT'}
            className="flex items-center gap-1.5 px-3.5 py-2.5 min-h-[46px] sm:min-h-[48px] bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 font-bold text-xs rounded-lg transition active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer touch-manipulation select-none"
            title="Advance to next item in active playlist or queue (Shortcut: N)"
          >
            <FastForward className="w-3.5 h-3.5" />
            <span>NEXT</span>
            <kbd className="hidden sm:inline-block ml-0.5 px-1.5 py-0.5 text-[9px] font-mono bg-slate-950/60 border border-slate-700 rounded text-slate-300">
              N
            </kbd>
          </button>

          {/* SKIP */}
          <button
            id="btn-transport-skip"
            onClick={onSkip}
            disabled={isQueueEmpty || actionInProgress === 'SKIP'}
            className="flex items-center gap-1.5 px-3.5 py-2.5 min-h-[46px] sm:min-h-[48px] bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 font-bold text-xs rounded-lg transition active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer touch-manipulation select-none"
            title="Skip top queued item (Shortcut: S)"
          >
            <SkipForward className="w-3.5 h-3.5" />
            <span>SKIP</span>
            <kbd className="hidden sm:inline-block ml-0.5 px-1.5 py-0.5 text-[9px] font-mono bg-slate-950/60 border border-slate-700 rounded text-slate-300">
              S
            </kbd>
          </button>
        </div>

        {/* Right Side: Emergency KILL ALL */}
        <div className="flex items-center gap-2">
          <button
            id="btn-transport-kill-all"
            onClick={onKillAll}
            className="group flex items-center gap-2 px-4 py-2.5 min-h-[46px] sm:min-h-[48px] bg-red-700/80 hover:bg-red-600 text-white font-black text-xs rounded-lg shadow-lg shadow-red-950/60 border border-red-500 transition active:scale-95 cursor-pointer touch-manipulation select-none"
            title="Emergency Kill: Instantly cuts on-air graphic and clears queue. Does not modify match scores. (Shortcut: K)"
          >
            <AlertOctagon className="w-4 h-4 text-red-200 transition group-hover:rotate-12" />
            <span className="tracking-wider">KILL ALL</span>
            <kbd className="hidden sm:inline-block ml-0.5 px-1.5 py-0.5 text-[9px] font-mono bg-black/40 border border-red-400/40 rounded text-red-100">
              K
            </kbd>
          </button>
        </div>
      </div>
    </div>
  );
};
