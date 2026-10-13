import React, { useState, useEffect, useMemo } from 'react';
import { StudioGraphic, SportType } from '../../../types';
import { SPORT_GRAPHIC_CATEGORIES } from '../../../constants/studioGraphicsConstants';
import {
  X,
  Save,
  Sparkles,
  AlertTriangle,
  Tag,
  CheckCircle2,
  Layers,
  Copy,
  Plus,
} from 'lucide-react';

interface SaveGraphicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSave: (saveData: {
    name: string;
    sport: SportType;
    category: string;
    description: string;
    tags: string[];
    presetName?: string;
    overwriteExistingId?: string;
  }) => Promise<void>;
  existingGraphics: StudioGraphic[];
  currentGraphic: StudioGraphic;
  isSaveAsNew?: boolean;
}

const ALL_SPORTS: { id: SportType; label: string }[] = [
  { id: 'CRICKET', label: 'Cricket' },
  { id: 'TENNIS', label: 'Tennis' },
  { id: 'KABADDI', label: 'Kabaddi' },
  { id: 'FOOTBALL', label: 'Football' },
  { id: 'BASKETBALL', label: 'Basketball' },
  { id: 'VOLLEYBALL', label: 'Volleyball' },
  { id: 'HOCKEY', label: 'Field Hockey' },
  { id: 'BADMINTON', label: 'Badminton' },
  { id: 'TABLE_TENNIS', label: 'Table Tennis' },
  { id: 'CUSTOM', label: 'Custom / Generic' },
];

export const SaveGraphicModal: React.FC<SaveGraphicModalProps> = ({
  isOpen,
  onClose,
  onConfirmSave,
  existingGraphics,
  currentGraphic,
  isSaveAsNew = false,
}) => {
  const [name, setName] = useState<string>('');
  const [sport, setSport] = useState<SportType>(currentGraphic.sport || 'CRICKET');
  const [category, setCategory] = useState<string>(currentGraphic.category || 'Scorebug');
  const [description, setDescription] = useState<string>(currentGraphic.description || '');
  const [tags, setTags] = useState<string[]>(currentGraphic.tags || []);
  const [tagInput, setTagInput] = useState<string>('');
  const [presetName, setPresetName] = useState<string>(currentGraphic.presetName || '');
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState<boolean>(false);
  const [duplicateTarget, setDuplicateTarget] = useState<StudioGraphic | null>(null);

  // Initialize form when opened
  useEffect(() => {
    if (isOpen) {
      if (isSaveAsNew) {
        // Provide clean copy name
        const baseName = currentGraphic.name.replace(/\s*\(Copy(\s+\d+)?\)$/i, '').trim();
        setName(`${baseName} (Copy)`);
      } else {
        setName(currentGraphic.name || '');
      }
      setSport(currentGraphic.sport || 'CRICKET');
      setCategory(currentGraphic.category || 'Scorebug');
      setDescription(currentGraphic.description || '');
      setTags(currentGraphic.tags || []);
      setPresetName(currentGraphic.presetName || '');
      setError(null);
      setShowDuplicateWarning(false);
      setDuplicateTarget(null);
      setTagInput('');
    }
  }, [isOpen, currentGraphic, isSaveAsNew]);

  // Categories list for selected sport
  const categoryList: string[] = useMemo(() => {
    const catsMap: Record<string, string[]> = (SPORT_GRAPHIC_CATEGORIES as Record<string, string[]>) || {};
    const cats: string[] = catsMap[sport] || catsMap['CUSTOM'] || ['Scorebug', 'Lower Third', 'Full Screen'];
    return Array.from(new Set<string>(cats));
  }, [sport]);

  // Ensure category is in categoryList
  useEffect(() => {
    if (!categoryList.includes(category) && categoryList.length > 0) {
      setCategory(categoryList[0]);
    }
  }, [categoryList, category]);

  // Check for duplicate name
  const checkDuplicate = (checkName: string): StudioGraphic | null => {
    const trimmed = checkName.trim().toLowerCase();
    if (!trimmed) return null;

    return (
      existingGraphics.find((g) => {
        // If updating the same graphic and not Save As New, it's fine
        if (!isSaveAsNew && g.id === currentGraphic.id) {
          return false;
        }
        return g.name.trim().toLowerCase() === trimmed;
      }) || null
    );
  };

  const handleGenerateSuggestion = () => {
    const sportObj = ALL_SPORTS.find((s) => s.id === sport);
    const sportName = sportObj ? sportObj.label : sport;
    const cleanCat = category || 'Overlay';
    const suggested = `${sportName} - ${cleanCat}`;
    setName(suggested);
    setError(null);
    setShowDuplicateWarning(false);
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = async (e?: React.FormEvent, forceOverwriteId?: string) => {
    if (e) e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Graphic Name is required. Please enter a name.');
      return;
    }

    // Check duplicate
    if (!forceOverwriteId) {
      const duplicate = checkDuplicate(trimmedName);
      if (duplicate) {
        setDuplicateTarget(duplicate);
        setShowDuplicateWarning(true);
        return;
      }
    }

    try {
      setSaving(true);
      setError(null);
      await onConfirmSave({
        name: trimmedName,
        sport,
        category,
        description: description.trim(),
        tags,
        presetName: presetName.trim() || undefined,
        overwriteExistingId: forceOverwriteId,
      });
      onClose();
    } catch (err: any) {
      console.error('Save failed:', err);
      setError(err?.message || 'Failed to save graphic.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              {isSaveAsNew ? <Copy className="w-5 h-5" /> : <Save className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-wide">
                {isSaveAsNew ? 'Save As New Graphic' : 'Save Graphic Design'}
              </h2>
              <p className="text-xs text-slate-400">
                {isSaveAsNew
                  ? 'Create a separate independent graphic record'
                  : 'Assign a custom name and metadata before saving'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-3.5 bg-rose-950/60 border border-rose-600/60 rounded-xl text-rose-300 flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span className="font-semibold text-xs">{error}</span>
            </div>
          )}

          {/* Duplicate Name Warning Box */}
          {showDuplicateWarning && duplicateTarget && (
            <div className="p-4 bg-amber-950/70 border border-amber-500/60 rounded-xl text-amber-200 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-black text-white text-xs block">
                    Duplicate Name Detected
                  </span>
                  <p className="text-xs text-amber-200/90 leading-relaxed">
                    A graphic named <strong className="text-white font-mono bg-black/40 px-1.5 py-0.5 rounded">"{duplicateTarget.name}"</strong> already exists in <span className="font-bold text-amber-300">{duplicateTarget.sport} • {duplicateTarget.category}</span>.
                  </p>
                </div>
              </div>

              <div className="pt-1 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSubmit(undefined, duplicateTarget.id)}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition shadow"
                >
                  Overwrite Existing
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setName(`${name.trim()} (v2)`);
                    setShowDuplicateWarning(false);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-lg border border-slate-700 transition"
                >
                  Save as "{name.trim()} (v2)"
                </button>
                <button
                  type="button"
                  onClick={() => setShowDuplicateWarning(false)}
                  className="px-3 py-1.5 text-slate-400 hover:text-white text-xs font-semibold"
                >
                  Change Name
                </button>
              </div>
            </div>
          )}

          <form onSubmit={(e) => handleSubmit(e)} className="space-y-4">
            {/* Graphic Name (Required) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-slate-200 font-bold tracking-wide uppercase text-[11px] flex items-center gap-1">
                  <span>Graphic Name</span>
                  <span className="text-rose-400 font-black">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleGenerateSuggestion}
                  className="text-emerald-400 hover:text-emerald-300 font-bold text-[11px] flex items-center gap-1 transition"
                  title="Auto-suggest a name based on sport and category"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Suggest Name</span>
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Cricket - Wicket Celebration, Final Scorecard"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError(null);
                    if (showDuplicateWarning) setShowDuplicateWarning(false);
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm transition"
                />
                {name.trim() && (
                  <button
                    type="button"
                    onClick={() => setName('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Quick Suggestion Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-slate-500 font-semibold">Quick Ideas:</span>
                {[
                  `${ALL_SPORTS.find((s) => s.id === sport)?.label || sport} - ${category}`,
                  `${category} Premium`,
                  `${ALL_SPORTS.find((s) => s.id === sport)?.label || sport} - Match Point`,
                  `Lower Third Highlight`,
                ].map((sug, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setName(sug)}
                    className="px-2 py-0.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 rounded text-[10px] font-mono border border-slate-800 transition"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>

            {/* Sport & Category Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Sport Selector */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold uppercase tracking-wider text-[11px] block">
                  Sport
                </label>
                <select
                  value={sport}
                  onChange={(e) => setSport(e.target.value as SportType)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold focus:outline-none focus:border-emerald-500"
                >
                  {ALL_SPORTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Selector */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold uppercase tracking-wider text-[11px] block">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold focus:outline-none focus:border-emerald-500"
                >
                  {categoryList.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description (Optional) */}
            <div className="space-y-1.5">
              <label className="text-slate-300 font-bold uppercase tracking-wider text-[11px] flex items-center justify-between">
                <span>Description (Optional)</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  {description.length}/200
                </span>
              </label>
              <textarea
                rows={2}
                maxLength={200}
                placeholder="e.g. Broadcast overlay with team colors, live score ticker, and wicket animation banner."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none text-xs"
              />
            </div>

            {/* Tags (Optional) */}
            <div className="space-y-1.5">
              <label className="text-slate-300 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1">
                <Tag className="w-3 h-3 text-slate-400" />
                <span>Tags (Optional)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type tag and press Enter (e.g. broadcast, 4k, finals)..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-lg border border-slate-700 transition flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>

              {/* Tag Pills */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[11px] font-medium"
                    >
                      #{t}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(t)}
                        className="hover:text-rose-400 transition"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Preset / Style Name (Optional) */}
            <div className="space-y-1.5">
              <label className="text-slate-300 font-bold uppercase tracking-wider text-[11px] block">
                Template / Style Name (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Modern Glass Dark, Vibrant Neon, ESPN Classic"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs"
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={saving || !name.trim()}
              className={`px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center gap-2 ${
                saving || !name.trim() ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : isSaveAsNew ? 'Save As New' : 'Save Graphic'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
