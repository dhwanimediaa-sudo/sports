import React from 'react';
import { CheckCircle2, Eye, Library, ArrowRight, X, Sparkles } from 'lucide-react';
import { StudioGraphic } from '../../../types';

interface SaveSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewInLibrary: () => void;
  graphic: StudioGraphic | null;
  isNewGraphic?: boolean;
}

export const SaveSuccessModal: React.FC<SaveSuccessModalProps> = ({
  isOpen,
  onClose,
  onViewInLibrary,
  graphic,
  isNewGraphic = false,
}) => {
  if (!isOpen || !graphic) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl w-full max-w-md shadow-2xl shadow-emerald-950/40 overflow-hidden">
        {/* Top Banner */}
        <div className="p-6 text-center bg-gradient-to-b from-emerald-950/60 to-slate-900 border-b border-slate-800 space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-white tracking-wide">
              {isNewGraphic ? 'Graphic Created Successfully!' : 'Graphic Saved Successfully!'}
            </h3>
            <p className="text-xs text-slate-400">
              Your broadcast design and layers are preserved and ready for live production.
            </p>
          </div>
        </div>

        {/* Saved Graphic Details */}
        <div className="p-6 space-y-4 text-xs">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Graphic Name
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                {graphic.sport}
              </span>
            </div>
            <p className="text-sm font-black text-white truncate">{graphic.name}</p>

            <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
              <span className="font-semibold text-slate-300">Category: {graphic.category}</span>
              <span>•</span>
              <span className="font-mono text-[10px]">
                {graphic.canvas?.width || graphic.width || 1920}×
                {graphic.canvas?.height || graphic.height || 1080}
              </span>
              <span>•</span>
              <span className="text-emerald-400 font-bold">{graphic.elements.length} Layers</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition flex items-center justify-center gap-1.5"
            >
              <span>Continue Editing</span>
            </button>

            <button
              type="button"
              onClick={onViewInLibrary}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-1.5"
            >
              <Library className="w-4 h-4" />
              <span>View in Library</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
