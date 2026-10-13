import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { CustomSport } from '../../types';
import { CustomSportModal } from './CustomSportModal';
import { Button } from '../ui/Button';
import {
  Plus,
  Copy,
  Edit2,
  Trash2,
  Sparkles,
  Layers,
  Flame,
  Award,
  BarChart2,
  Clock,
  Shield,
  Search,
  CheckCircle2,
  RefreshCw,
  Sliders,
} from 'lucide-react';

export const CustomSportsManager: React.FC = () => {
  const [sports, setSports] = useState<CustomSport[]>([]);
  const [presets, setPresets] = useState<CustomSport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'custom' | 'presets'>('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSport, setEditingSport] = useState<CustomSport | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [customRes, presetsRes] = await Promise.all([
        api.getCustomSports(),
        api.getCustomSportPresets(),
      ]);
      setSports(customRes.customSports || []);
      setPresets(presetsRes.presets || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load custom sports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDuplicate = async (sportId: string) => {
    try {
      await api.duplicateCustomSport(sportId);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to duplicate sport.');
    }
  };

  const handleDelete = async (sportId: string, sportName: string) => {
    if (!window.confirm(`Are you sure you want to delete the "${sportName}" custom sport engine?`)) {
      return;
    }
    try {
      await api.deleteCustomSport(sportId);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete sport.');
    }
  };

  const filteredSports = sports.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.shortCode.toLowerCase().includes(search.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;
    if (activeTab === 'presets') return s.id.startsWith('cs-') && !s.id.includes('-');
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/80 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Sliders className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-wide">Generic / Custom Sport Engine</h2>
          </div>
          <p className="text-sm text-zinc-400">
            Design dynamic scoring rules, custom player statistics, awards criteria, and TV broadcast triggers for any sport.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => {
              setEditingSport(null);
              setIsModalOpen(true);
            }}
            className="gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" /> Create Custom Sport
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search custom sports..."
            className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={loadData}
            className="text-xs text-zinc-400 hover:text-white gap-1.5"
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Grid of Custom Sports */}
      {loading ? (
        <div className="p-12 text-center text-zinc-400">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-3 text-amber-500" />
          Loading Custom Sport Engines...
        </div>
      ) : filteredSports.length === 0 ? (
        <div className="p-12 bg-zinc-900/40 border border-white/5 rounded-2xl text-center">
          <Sliders className="w-12 h-12 mx-auto text-zinc-600 mb-3" />
          <h3 className="text-base font-semibold text-white mb-1">No custom sports found</h3>
          <p className="text-sm text-zinc-400 mb-4">
            {search ? 'Try adjusting your search query.' : 'Create your first custom sport engine to get started.'}
          </p>
          <Button
            onClick={() => {
              setEditingSport(null);
              setIsModalOpen(true);
            }}
            className="gap-2 bg-amber-500 text-black font-bold"
          >
            <Plus className="w-4 h-4" /> Create Custom Sport
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSports.map((sport) => (
            <div
              key={sport.id}
              className="bg-zinc-900/90 border border-white/10 rounded-2xl p-5 hover:border-amber-500/40 transition-all flex flex-col justify-between group shadow-lg shadow-black/40"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl p-2 bg-zinc-800 rounded-xl border border-white/10 shadow-inner">
                      {sport.icon || '⚙️'}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors">
                          {sport.name}
                        </h3>
                        <span className="px-2 py-0.5 text-xs font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-md">
                          {sport.shortCode}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {sport.sportCategory} • {sport.matchType} • {sport.totalPeriods} Periods
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-zinc-400 line-clamp-2 mb-4 leading-relaxed">
                  {sport.description || 'Configurable custom sport scoring rules and broadcast overlays.'}
                </p>

                {/* Badges / Specs */}
                <div className="grid grid-cols-3 gap-2 p-2.5 bg-zinc-800/60 rounded-xl border border-white/5 text-center mb-4">
                  <div>
                    <div className="text-[10px] text-zinc-500 uppercase font-semibold">Events</div>
                    <div className="text-xs font-bold text-white mt-0.5">
                      {sport.scoringEvents?.length || 0} Actions
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-500 uppercase font-semibold">Stats</div>
                    <div className="text-xs font-bold text-amber-400 mt-0.5">
                      {sport.customStatistics?.length || 0} Tracked
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-500 uppercase font-semibold">Awards</div>
                    <div className="text-xs font-bold text-emerald-400 mt-0.5">
                      {sport.customAwards?.length || 0} Criteria
                    </div>
                  </div>
                </div>

                {/* Scoring Buttons Sample preview */}
                <div className="space-y-1.5 mb-4">
                  <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                    Console Buttons:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(sport.scoringEvents || []).slice(0, 4).map((e) => (
                      <span
                        key={e.id}
                        className="px-2 py-1 text-[11px] font-semibold bg-zinc-800 border border-white/10 text-zinc-300 rounded-lg flex items-center gap-1"
                      >
                        <span>{e.icon || '🎯'}</span>
                        <span>{e.shortName || e.name}</span>
                        <span className="text-[10px] text-amber-400 font-mono">({e.points}p)</span>
                      </span>
                    ))}
                    {(sport.scoringEvents || []).length > 4 && (
                      <span className="px-2 py-1 text-[11px] bg-zinc-800/60 text-zinc-500 rounded-lg">
                        +{(sport.scoringEvents?.length || 0) - 4} more
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-white/10 gap-2">
                <Button
                  variant="ghost"
                  onClick={() => handleDuplicate(sport.id)}
                  className="text-xs text-zinc-400 hover:text-white gap-1 px-2.5 py-1.5"
                  title="Duplicate configuration"
                >
                  <Copy className="w-3.5 h-3.5" /> Clone
                </Button>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEditingSport(sport);
                      setIsModalOpen(true);
                    }}
                    className="text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 gap-1 px-2.5 py-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit Rules
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleDelete(sport.id, sport.name)}
                    className="text-xs text-zinc-500 hover:text-red-400 hover:bg-red-500/10 px-2 py-1.5"
                    title="Delete sport"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <CustomSportModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingSport(null);
          }}
          onSuccess={() => {
            loadData();
          }}
          initialSport={editingSport}
        />
      )}
    </div>
  );
};
