import React from 'react';
import { StudioGraphic } from '../../../types';
import {
  Maximize2,
  Move,
  Minimize2,
  X,
  Sparkles,
  Layers,
  ArrowRight,
  Check,
} from 'lucide-react';

export interface PendingResolutionChange {
  width: number;
  height: number;
  aspectRatio: string;
  resolutionPreset: string;
  orientation: 'LANDSCAPE' | 'PORTRAIT' | 'SQUARE';
}

interface ResolutionTransformConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  graphic: StudioGraphic;
  pendingResolution: PendingResolutionChange | null;
  onConfirm: (strategy: 'SCALE' | 'KEEP_POSITIONS' | 'RECENTER') => void;
}

export const ResolutionTransformConfirmModal: React.FC<ResolutionTransformConfirmModalProps> = ({
  isOpen,
  onClose,
  graphic,
  pendingResolution,
  onConfirm,
}) => {
  if (!isOpen || !pendingResolution) return null;

  const currentW = Number(graphic.width) || Number(graphic.canvas?.width) || 1920;
  const currentH = Number(graphic.height) || Number(graphic.canvas?.height) || 1080;
  const targetW = pendingResolution.width;
  const targetH = pendingResolution.height;
  const elementCount = graphic.elements?.length || 0;

  return (
    <div
      id="resolution-transform-modal"
      className="fixed inset-0 z-[100000] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
    >
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Canvas Resolution Change
              </h3>
              <p className="text-xs text-slate-400">
                Choose how to adapt {elementCount} layer{elementCount === 1 ? '' : 's'} to the new canvas size
              </p>
            </div>
          </div>
          <button
            id="close-resolution-transform-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Resolution Comparison Badge */}
        <div className="px-6 py-4 bg-slate-950/50 border-b border-slate-800 flex items-center justify-center gap-4 text-xs font-mono">
          <div className="flex flex-col items-center bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-[10px] uppercase font-sans text-slate-400">Current</span>
            <span className="text-white font-bold text-sm">
              {currentW} × {currentH}
            </span>
            <span className="text-slate-400 text-[10px]">
              {graphic.aspectRatio || `${currentW}:${currentH}`}
            </span>
          </div>

          <ArrowRight className="w-4 h-4 text-emerald-400 shrink-0" />

          <div className="flex flex-col items-center bg-emerald-950/30 border border-emerald-500/40 px-3 py-1.5 rounded-lg">
            <span className="text-[10px] uppercase font-sans text-emerald-400 font-semibold">
              New Target
            </span>
            <span className="text-emerald-300 font-bold text-sm">
              {targetW} × {targetH}
            </span>
            <span className="text-emerald-400/80 text-[10px]">
              {pendingResolution.aspectRatio} • {pendingResolution.orientation}
            </span>
          </div>
        </div>

        {/* Options */}
        <div className="p-6 space-y-3">
          {/* Option 1: Scale Artwork (Recommended) */}
          <button
            id="strategy-scale-btn"
            type="button"
            onClick={() => onConfirm('SCALE')}
            className="w-full text-left p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-950/20 hover:bg-emerald-950/40 hover:border-emerald-400 transition flex items-start gap-3.5 group"
          >
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 mt-0.5 group-hover:scale-110 transition-transform">
              <Maximize2 className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white group-hover:text-emerald-300">
                  Scale Artwork
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">
                  Recommended
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Proportionally scales and moves all shapes, text, font sizes, and borders to perfectly fit the new stage.
              </p>
            </div>
          </button>

          {/* Option 2: Re-center Artwork */}
          <button
            id="strategy-recenter-btn"
            type="button"
            onClick={() => onConfirm('RECENTER')}
            className="w-full text-left p-3.5 rounded-xl border border-slate-700 bg-slate-800/40 hover:bg-slate-800 hover:border-slate-600 transition flex items-start gap-3.5 group"
          >
            <div className="p-2 rounded-lg bg-slate-700/60 text-slate-300 mt-0.5 group-hover:scale-110 transition-transform">
              <Move className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <span className="text-sm font-bold text-white group-hover:text-amber-300">
                Re-center Artwork
              </span>
              <p className="text-xs text-slate-400 mt-0.5">
                Maintains original pixel dimensions and shifts all layers into the center of the new canvas.
              </p>
            </div>
          </button>

          {/* Option 3: Keep Positions */}
          <button
            id="strategy-keep-btn"
            type="button"
            onClick={() => onConfirm('KEEP_POSITIONS')}
            className="w-full text-left p-3.5 rounded-xl border border-slate-700 bg-slate-800/40 hover:bg-slate-800 hover:border-slate-600 transition flex items-start gap-3.5 group"
          >
            <div className="p-2 rounded-lg bg-slate-700/60 text-slate-300 mt-0.5 group-hover:scale-110 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <span className="text-sm font-bold text-white group-hover:text-blue-300">
                Keep Exact Positions
              </span>
              <p className="text-xs text-slate-400 mt-0.5">
                Keeps all layers at their exact current X, Y, Width, and Height coordinates.
              </p>
            </div>
          </button>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-slate-800/60 border-t border-slate-700 flex items-center justify-end gap-3">
          <button
            id="cancel-resolution-change-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
