import React, { useState, useMemo } from 'react';
import { DYNAMIC_FIELDS, DynamicFieldDefinition } from '../../../constants/studioGraphicsConstants';
import { SportType } from '../../../types';
import { Search, Tag, Copy, Check, Plus, Sparkles, X } from 'lucide-react';

interface DynamicFieldsPickerProps {
  sport: SportType;
  onSelectField: (key: string) => void;
  onClose?: () => void;
}

export const DynamicFieldsPicker: React.FC<DynamicFieldsPickerProps> = ({
  sport,
  onSelectField,
  onClose,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    (DYNAMIC_FIELDS || []).forEach((f) => {
      if (f && f.category) {
        cats.add(f.category);
      }
    });
    return ['ALL', ...Array.from(cats.values())];
  }, []);

  const filteredFields = useMemo(() => {
    return (DYNAMIC_FIELDS || []).filter((f) => {
      if (!f) return false;
      const sports = f.sports || ['ALL'];
      const matchSport = sports.includes('ALL') || sports.includes(sport);
      const matchCat = selectedCategory === 'ALL' || f.category === selectedCategory;
      const matchSearch =
        !search.trim() ||
        (f.key && f.key.toLowerCase().includes(search.toLowerCase())) ||
        (f.label && f.label.toLowerCase().includes(search.toLowerCase())) ||
        (f.description && f.description.toLowerCase().includes(search.toLowerCase()));
      return matchSport && matchCat && matchSearch;
    });
  }, [sport, selectedCategory, search]);

  const handleCopy = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[500px] w-full text-slate-100">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Dynamic Data Variables</h3>
            <p className="text-[11px] text-slate-400">Click a variable to insert it into text</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search & Category filter */}
      <div className="p-3 border-b border-slate-800 space-y-2 bg-slate-900">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search variables (e.g. {{PLAYER_NAME}}, {{SCORE}})..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Variables List */}
      <div className="p-3 overflow-y-auto space-y-2 flex-1 divide-y divide-slate-800/60">
        {filteredFields.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            No dynamic variables match your search.
          </div>
        ) : (
          filteredFields.map((field) => (
            <div
              key={field.key}
              onClick={() => onSelectField(field.key)}
              className="pt-2 first:pt-0 group flex items-start justify-between gap-3 p-2 rounded-lg hover:bg-slate-800/80 cursor-pointer transition"
            >
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                    {field.key}
                  </span>
                  <span className="text-xs font-semibold text-slate-200 truncate">{field.label}</span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded">
                    {field.category}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">{field.description}</p>
                <p className="text-[10px] text-slate-500 font-mono">
                  Sample: <span className="text-amber-400/90">{field.sampleValue}</span>
                </p>
              </div>

              <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                <button
                  type="button"
                  title="Copy tag"
                  onClick={(e) => handleCopy(field.key, e)}
                  className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-700 rounded-md transition"
                >
                  {copiedKey === field.key ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  title="Insert tag"
                  className="p-1.5 bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 rounded-md transition flex items-center gap-1 text-[11px] font-bold px-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Insert</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
