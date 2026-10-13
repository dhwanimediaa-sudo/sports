import React, { useState } from 'react';
import { SportType } from '../../types';
import { Save, X, Sparkles, Check, Film, Layers, ListOrdered, Sliders } from 'lucide-react';

interface SavePresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  sport: SportType;
  assignedCount: number;
  scenesCount: number;
  playlistsCount: number;
  onSavePreset: (name: string, description: string) => Promise<void>;
  existingPresets?: Array<{ id: string; name: string }>;
}

export const SavePresetModal: React.FC<SavePresetModalProps> = ({
  isOpen,
  onClose,
  sport,
  assignedCount,
  scenesCount,
  playlistsCount,
  onSavePreset,
  existingPresets = [],
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);

  if (!isOpen) return null;

  const isExistingName = existingPresets.some(
    (p) => p.name.trim().toLowerCase() === name.trim().toLowerCase()
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a preset name.');
      return;
    }

    if (isExistingName && !confirmOverwrite) {
      setConfirmOverwrite(true);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onSavePreset(name.trim(), description.trim());
      setName('');
      setDescription('');
      setConfirmOverwrite(false);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save preset.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Save className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">SAVE AS BROADCAST PRESET</h2>
              <p className="text-[11px] text-slate-400">Create a reusable broadcast package</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 rounded-lg text-xs">
              {error}
            </div>
          )}

          {/* Bundle Summary */}
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs">
            <span className="text-[10px] font-mono uppercase text-slate-500 block mb-2">
              PRESET BUNDLE PAYLOAD ({sport})
            </span>
            <div className="grid grid-cols-3 gap-2 text-center font-mono">
              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <span className="text-emerald-400 font-bold block text-sm">{assignedCount}</span>
                <span className="text-[10px] text-slate-400">Assignments</span>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <span className="text-blue-400 font-bold block text-sm">{scenesCount}</span>
                <span className="text-[10px] text-slate-400">Scenes</span>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <span className="text-purple-400 font-bold block text-sm">{playlistsCount}</span>
                <span className="text-[10px] text-slate-400">Playlists</span>
              </div>
            </div>
          </div>

          {/* Preset Name */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              PRESET NAME <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. T20 Premier League Pro Broadcast"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              DESCRIPTION (OPTIONAL)
            </label>
            <textarea
              rows={3}
              placeholder="Broadcast setup with neon boundaries, dynamic striker lower-thirds and custom innings break rundown..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Overwrite Confirmation Notice */}
          {isExistingName && (
            <div className={`p-3 rounded-lg border text-xs ${confirmOverwrite ? 'bg-amber-950/70 border-amber-600 text-amber-200' : 'bg-slate-900 border-slate-700 text-slate-300'}`}>
              <span className="font-bold block mb-1">
                {confirmOverwrite ? '⚠️ CONFIRM OVERWRITE:' : 'ℹ️ NOTE:'}
              </span>
              <span>
                A preset named &quot;{name.trim()}&quot; already exists. Saving will replace the existing configuration.
              </span>
            </div>
          )}

          {/* Modal Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`px-5 py-2 rounded-lg text-white font-black text-xs transition shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                isExistingName && confirmOverwrite
                  ? 'bg-amber-600 hover:bg-amber-500'
                  : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>
                {saving
                  ? 'Saving...'
                  : isExistingName && confirmOverwrite
                  ? 'CONFIRM OVERWRITE'
                  : isExistingName
                  ? 'REPLACE PRESET'
                  : 'SAVE PRESET'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
