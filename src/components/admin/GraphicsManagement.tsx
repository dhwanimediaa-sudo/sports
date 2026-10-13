import React, { useState, useEffect } from 'react';
import { GraphicsTemplate, BroadcastPreset } from '../../types';
import { api } from '../../services/api';
import { GraphicAssignmentManager } from './broadcast/GraphicAssignmentManager';
import { OnAirPlaylistManager } from './broadcast/OnAirPlaylistManager';
import { GraphicScenesManager } from './broadcast/GraphicScenesManager';
import {
  Tv,
  Layout,
  Sliders,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Sparkles,
  Check,
  RefreshCw,
  Palette,
  Film,
  ListOrdered,
  Layers,
} from 'lucide-react';

export const GraphicsManagement: React.FC = () => {
  const [templates, setTemplates] = useState<GraphicsTemplate[]>([]);
  const [presets, setPresets] = useState<BroadcastPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<
    'assignments' | 'playlists' | 'scenes' | 'templates' | 'presets' | 'defaults'
  >('assignments');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tplRes, prsRes] = await Promise.all([
        api.getGraphicsTemplates(),
        api.getBroadcastPresets(),
      ]);
      setTemplates(tplRes.templates || []);
      setPresets(prsRes.presets || []);
    } catch (err) {
      console.error('Failed to load graphics management data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 font-medium">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-500" />
        Loading Graphics Management Library...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-lg shadow-2xl font-bold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <Tv className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">GRAPHICS & BROADCAST MANAGEMENT</h1>
            <p className="text-xs text-slate-400">
              Manage broadcast graphic templates, global presets, fonts, shapes, and OBS/vMix defaults.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-lg flex items-center gap-1.5 transition"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh Library</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('assignments')}
          className={`px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition flex items-center gap-2 ${
            activeSubTab === 'assignments'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Film className="w-4 h-4" />
          <span>Graphic Assignments</span>
        </button>

        <button
          onClick={() => setActiveSubTab('playlists')}
          className={`px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition flex items-center gap-2 ${
            activeSubTab === 'playlists'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <ListOrdered className="w-4 h-4" />
          <span>On-Air Playlists</span>
        </button>

        <button
          onClick={() => setActiveSubTab('scenes')}
          className={`px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition flex items-center gap-2 ${
            activeSubTab === 'scenes'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Graphic Scenes</span>
        </button>

        <button
          onClick={() => setActiveSubTab('templates')}
          className={`px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition flex items-center gap-2 ${
            activeSubTab === 'templates'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Layout className="w-4 h-4" />
          <span>Templates ({templates.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('presets')}
          className={`px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition flex items-center gap-2 ${
            activeSubTab === 'presets'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Presets ({presets.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('defaults')}
          className={`px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition flex items-center gap-2 ${
            activeSubTab === 'defaults'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Global Defaults</span>
        </button>
      </div>

      {/* GRAPHIC ASSIGNMENTS TAB */}
      {activeSubTab === 'assignments' && (
        <GraphicAssignmentManager />
      )}

      {/* ON-AIR PLAYLISTS TAB */}
      {activeSubTab === 'playlists' && (
        <OnAirPlaylistManager />
      )}

      {/* GRAPHIC SCENES TAB */}
      {activeSubTab === 'scenes' && (
        <GraphicScenesManager />
      )}

      {/* TEMPLATES LIBRARY LIST */}
      {activeSubTab === 'templates' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: 'Modern Sports', style: 'MODERN_SPORTS', category: 'SCOREBOARD' },
              { name: 'Minimal Oval', style: 'MINIMAL', category: 'SCOREBOARD' },
              { name: 'Premium Gold', style: 'PREMIUM', category: 'SCOREBOARD' },
              { name: 'Neon Cyber', style: 'NEON', category: 'SCOREBOARD' },
              { name: 'Frosted Glass', style: 'GLASS', category: 'SCOREBOARD' },
              { name: 'Classic TV', style: 'CLASSIC_TV', category: 'SCOREBOARD' },
              { name: 'Bold Sports', style: 'BOLD_SPORTS', category: 'EVENT' },
              { name: 'Compact Pill', style: 'COMPACT', category: 'SCOREBOARD' },
              { name: 'Soft Rounded', style: 'ROUNDED', category: 'SCOREBOARD' },
              { name: 'Angular Slash', style: 'ANGULAR', category: 'EVENT' },
            ].map((tpl, i) => (
              <div
                key={i}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 shadow-lg flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                    {tpl.category}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase font-mono">16:9 TRANSPARENT</span>
                </div>

                <div>
                  <h3 className="text-lg font-black text-white">{tpl.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Style key: <code className="text-emerald-400">{tpl.style}</code>
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">READY FOR OBS / VMIX</span>
                  <button
                    onClick={() => showToast(`Template "${tpl.name}" loaded for management.`)}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs rounded transition"
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PRESETS LIST */}
      {activeSubTab === 'presets' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {presets.map((p) => (
            <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                  PRESET
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date(p.createdAt).toLocaleDateString()}
                </span>
              </div>
              <h3 className="text-lg font-black text-white">{p.name}</h3>
              <p className="text-xs text-slate-400">{p.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* DEFAULTS */}
      {activeSubTab === 'defaults' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            GLOBAL BROADCAST ENGINE PARAMETERS
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono text-slate-300">
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-1">
              <span className="text-slate-500 block text-[10px]">DEFAULT RESOLUTION:</span>
              <span className="text-white font-bold">1920 × 1080 (Full HD Viewport)</span>
            </div>
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-1">
              <span className="text-slate-500 block text-[10px]">REALTIME ENGINE PROTOCOL:</span>
              <span className="text-emerald-400 font-bold">SSE + Fallback Polling Loop</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
