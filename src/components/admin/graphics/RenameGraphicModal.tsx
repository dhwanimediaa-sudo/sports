import React, { useState, useEffect } from 'react';
import { StudioGraphic } from '../../../types';
import { X, Edit3, AlertTriangle, Check } from 'lucide-react';

interface RenameGraphicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmRename: (graphicIdOrName: any, newName?: string) => Promise<void>;
  graphic?: StudioGraphic | null;
  currentGraphic?: StudioGraphic | null;
  existingGraphics: StudioGraphic[];
}

export const RenameGraphicModal: React.FC<RenameGraphicModalProps> = ({
  isOpen,
  onClose,
  onConfirmRename,
  graphic: propGraphic,
  currentGraphic,
  existingGraphics,
}) => {
  const graphic = propGraphic || currentGraphic || null;
  const [name, setName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && graphic) {
      setName(graphic.name || '');
      setError(null);
    }
  }, [isOpen, graphic]);

  if (!isOpen || !graphic) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const trimmed = name.trim();
    if (!trimmed) {
      setError('Graphic Name cannot be empty.');
      return;
    }

    if (trimmed === graphic.name) {
      onClose();
      return;
    }

    // Check duplicate
    const isDuplicate = existingGraphics.some(
      (g) => g.id !== graphic.id && g.name.trim().toLowerCase() === trimmed.toLowerCase()
    );

    if (isDuplicate) {
      setError(`A graphic named "${trimmed}" already exists. Please choose a unique name.`);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onConfirmRename(trimmed, trimmed);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to rename graphic.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Rename Graphic</h3>
              <p className="text-[11px] text-slate-400">
                {graphic.sport} • {graphic.category}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-950/60 border border-rose-600/50 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
              Graphic Name
            </label>
            <input
              type="text"
              autoFocus
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Enter new graphic name..."
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center gap-1.5 disabled:opacity-60"
            >
              {loading ? 'Saving...' : 'Rename Graphic'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
