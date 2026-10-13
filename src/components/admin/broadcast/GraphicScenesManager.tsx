import React, { useState, useEffect } from 'react';
import { GraphicScene, SceneLayer, SportType, StudioGraphic } from '../../../types';
import { api } from '../../../services/api';
import {
  Layers,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Move,
  Save,
  Zap,
  Film,
  Sparkles,
  Sliders,
  ChevronUp,
  ChevronDown,
  Copy,
  Search,
  X,
  SlidersHorizontal,
} from 'lucide-react';

interface GraphicScenesManagerProps {
  sport?: SportType;
  matchId?: string;
  onPreviewScene?: (scene: GraphicScene) => void;
  onTakeSceneLive?: (scene: GraphicScene) => void;
  onTakeLiveScene?: (scene: GraphicScene) => void;
}

export const GraphicScenesManager: React.FC<GraphicScenesManagerProps> = ({
  sport = 'CRICKET',
  matchId,
  onPreviewScene,
  onTakeSceneLive,
}) => {
  const [scenes, setScenes] = useState<GraphicScene[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [savedGraphics, setSavedGraphics] = useState<StudioGraphic[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Add Layer modal
  const [isAddLayerModalOpen, setIsAddLayerModalOpen] = useState(false);
  const [layerSearch, setLayerSearch] = useState('');

  // New Scene modal
  const [isNewSceneModalOpen, setIsNewSceneModalOpen] = useState(false);
  const [newSceneName, setNewSceneName] = useState('');
  const [newSceneDesc, setNewSceneDesc] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [scenesRes, gRes] = await Promise.all([
        api.getGraphicScenes({ sport, matchId }),
        api.getStudioGraphics(),
      ]);
      const list = scenesRes.scenes || [];
      setScenes(list);
      setSavedGraphics(gRes.graphics || []);
      if (list.length > 0 && !selectedSceneId) {
        setSelectedSceneId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load scenes:', err);
      showToast('Error loading scenes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [sport, matchId]);

  const activeScene = scenes.find((s) => s.id === selectedSceneId) || scenes[0] || null;

  const updateActiveScene = (updates: Partial<GraphicScene>) => {
    if (!activeScene) return;
    setScenes((prev) =>
      prev.map((s) => (s.id === activeScene.id ? { ...s, ...updates } : s))
    );
  };

  // Add Layer from catalog
  const handleAddLayer = (graphic: StudioGraphic) => {
    if (!activeScene) return;
    const newLayer: SceneLayer = {
      id: crypto.randomUUID(),
      name: graphic.name,
      graphicId: graphic.id,
      graphicName: graphic.name,
      order: activeScene.layers.length + 1,
      enabled: true,
      opacity: 1,
      offsetX: 0,
      offsetY: 0,
      scale: 1,
    };
    updateActiveScene({ layers: [...activeScene.layers, newLayer] });
    setIsAddLayerModalOpen(false);
  };

  // Update specific layer
  const updateLayer = (layerId: string, updates: Partial<SceneLayer>) => {
    if (!activeScene) return;
    const layers = activeScene.layers.map((l) => (l.id === layerId ? { ...l, ...updates } : l));
    updateActiveScene({ layers });
  };

  // Move layer order
  const moveLayer = (index: number, direction: 'UP' | 'DOWN') => {
    if (!activeScene) return;
    const layers = [...activeScene.layers];
    const target = direction === 'UP' ? index - 1 : index + 1;
    if (target < 0 || target >= layers.length) return;

    const temp = layers[index];
    layers[index] = layers[target];
    layers[target] = temp;

    layers.forEach((l, idx) => {
      l.order = idx + 1;
    });

    updateActiveScene({ layers });
  };

  // Remove layer
  const removeLayer = (layerId: string) => {
    if (!activeScene) return;
    const layers = activeScene.layers
      .filter((l) => l.id !== layerId)
      .map((l, idx) => ({ ...l, order: idx + 1 }));
    updateActiveScene({ layers });
  };

  // Save active scene
  const handleSave = async () => {
    if (!activeScene) return;
    try {
      setSaving(true);
      await api.saveGraphicScene(activeScene);
      showToast('Graphic scene saved!');
    } catch (err) {
      console.error('Failed to save scene:', err);
      showToast('Error saving scene.');
    } finally {
      setSaving(false);
    }
  };

  // Create new scene
  const handleCreateScene = async () => {
    if (!newSceneName.trim()) return;
    try {
      setSaving(true);
      const res = await api.saveGraphicScene({
        name: newSceneName.trim(),
        description: newSceneDesc.trim(),
        sport: (sport || 'CRICKET') as SportType,
        matchId,
        layers: [],
      });
      setScenes((prev) => [...prev, res.scene]);
      setSelectedSceneId(res.scene.id);
      setIsNewSceneModalOpen(false);
      setNewSceneName('');
      setNewSceneDesc('');
      showToast('New scene created!');
    } catch (err) {
      console.error('Failed to create scene:', err);
      showToast('Error creating scene.');
    } finally {
      setSaving(false);
    }
  };

  // Delete scene
  const handleDeleteScene = async () => {
    if (!activeScene) return;
    if (!window.confirm(`Delete scene "${activeScene.name}"?`)) return;
    try {
      setSaving(true);
      await api.deleteGraphicScene(activeScene.id);
      const remaining = scenes.filter((s) => s.id !== activeScene.id);
      setScenes(remaining);
      setSelectedSceneId(remaining.length > 0 ? remaining[0].id : null);
      showToast('Scene deleted.');
    } catch (err) {
      console.error('Failed to delete scene:', err);
      showToast('Error deleting scene.');
    } finally {
      setSaving(false);
    }
  };

  // Preview & Take Live
  const handlePreview = () => {
    if (!activeScene || !matchId) return;
    if (onPreviewScene) {
      onPreviewScene(activeScene);
    } else {
      api
        .setOnAirPreview(matchId, {
          sourceType: 'SCENE',
          sourceId: activeScene.id,
          eventName: activeScene.name,
          layers: activeScene.layers,
          triggerSource: 'MANUAL',
        })
        .then(() => showToast(`Scene "${activeScene.name}" loaded into Preview Bus!`))
        .catch(() => showToast('Error sending scene to Preview.'));
    }
  };

  const handleTakeLive = () => {
    if (!activeScene || !matchId) return;
    if (onTakeSceneLive) {
      onTakeSceneLive(activeScene);
    } else {
      api
        .takeLiveOnAir(matchId, {
          sourceType: 'SCENE',
          sourceId: activeScene.id,
          eventName: activeScene.name,
          layers: activeScene.layers,
          triggerSource: 'MANUAL',
        })
        .then(() => showToast(`Scene "${activeScene.name}" is now LIVE ON AIR!`))
        .catch(() => showToast('Error taking scene live.'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-lg shadow-2xl font-bold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <span>Multiple Graphic Scenes Manager</span>
            </h2>
            <p className="text-xs text-slate-400">
              Composite multi-layered broadcast scenes combining lower thirds, sponsor bugs, scoreboards, and full-frame visuals.
            </p>
          </div>
        </div>

        {/* Scene controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Scene selector */}
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg">
            <span className="text-xs font-bold text-slate-400 uppercase">Scene:</span>
            <select
              value={activeScene?.id || ''}
              onChange={(e) => setSelectedSceneId(e.target.value)}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer max-w-[200px] truncate"
            >
              {scenes.map((s) => (
                <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                  {s.name} ({s.layers?.length || 0} layers)
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setIsNewSceneModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold border border-slate-700 transition"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>New Scene</span>
          </button>

          {activeScene && (
            <button
              onClick={handleDeleteScene}
              disabled={saving}
              className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-lg border border-transparent hover:border-rose-900/40 transition"
              title="Delete current scene"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={saving || !activeScene}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-emerald-950/50 transition"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Scene'}</span>
          </button>
        </div>
      </div>

      {/* Main Scene Body */}
      {activeScene ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-6">
          {/* Metadata & On-Air Transport */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div className="flex-1">
              <input
                type="text"
                value={activeScene.name}
                onChange={(e) => updateActiveScene({ name: e.target.value })}
                placeholder="Scene Name (e.g., PRE MATCH INTRO)"
                className="text-base font-black text-white bg-transparent border-b border-transparent hover:border-slate-700 focus:border-emerald-500 focus:outline-none w-full max-w-md py-0.5"
              />
              <input
                type="text"
                value={activeScene.description || ''}
                onChange={(e) => updateActiveScene({ description: e.target.value })}
                placeholder="Description / notes..."
                className="text-xs text-slate-400 bg-transparent border-b border-transparent hover:border-slate-700 focus:border-emerald-500 focus:outline-none w-full max-w-lg mt-1"
              />
            </div>

            {matchId && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePreview}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-lg text-xs font-bold transition"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview Scene</span>
                </button>

                <button
                  onClick={handleTakeLive}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-black shadow-lg shadow-red-950/50 transition"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>TAKE SCENE LIVE</span>
                </button>
              </div>
            )}
          </div>

          {/* Layers Header */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Layer Stack (Top to Bottom)
            </span>

            <button
              onClick={() => setIsAddLayerModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg text-xs font-bold border border-slate-700 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Layer to Scene</span>
            </button>
          </div>

          {/* Layers List */}
          {activeScene.layers.length === 0 ? (
            <div className="p-12 text-center text-slate-400 border border-dashed border-slate-800 rounded-xl">
              <Layers className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p className="text-sm font-semibold">Scene has no layers yet</p>
              <p className="text-xs text-slate-500 mt-1">
                Add multiple graphics to layer them together into a unified broadcast scene.
              </p>
              <button
                onClick={() => setIsAddLayerModalOpen(true)}
                className="mt-4 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold"
              >
                + Add First Layer
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {activeScene.layers.map((layer, idx) => (
                <div
                  key={layer.id}
                  className={`p-4 rounded-xl border transition ${
                    layer.enabled
                      ? 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-950/30 border-slate-800/40 opacity-50'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Reorder & Name */}
                    <div className="flex items-center gap-3 min-w-[260px]">
                      <div className="flex flex-col">
                        <button
                          onClick={() => moveLayer(idx, 'UP')}
                          disabled={idx === 0}
                          className="text-slate-500 hover:text-white disabled:opacity-20 transition"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moveLayer(idx, 'DOWN')}
                          disabled={idx === activeScene.layers.length - 1}
                          className="text-slate-500 hover:text-white disabled:opacity-20 transition"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>

                      <span className="font-mono text-xs font-bold text-slate-500 w-6 text-center">
                        Z:{layer.order}
                      </span>

                      <button
                        onClick={() => updateLayer(layer.id, { enabled: !layer.enabled })}
                        className={`p-1.5 rounded-lg border transition ${
                          layer.enabled
                            ? 'bg-emerald-950/60 border-emerald-700 text-emerald-400'
                            : 'bg-slate-800 border-slate-700 text-slate-500'
                        }`}
                        title={layer.enabled ? 'Layer is visible' : 'Layer is hidden'}
                      >
                        {layer.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>

                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <span>{layer.name}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-slate-300">
                            {layer.graphicName}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          ID: {layer.graphicId.slice(0, 8)}...
                        </div>
                      </div>
                    </div>

                    {/* Middle: Offset, Scale, Opacity Controls */}
                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                      {/* Offset X & Y */}
                      <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Pos:</span>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 text-[10px]">X:</span>
                          <input
                            type="number"
                            value={layer.offsetX || 0}
                            onChange={(e) => updateLayer(layer.id, { offsetX: parseInt(e.target.value) || 0 })}
                            className="w-12 text-center text-white bg-transparent focus:outline-none"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 text-[10px]">Y:</span>
                          <input
                            type="number"
                            value={layer.offsetY || 0}
                            onChange={(e) => updateLayer(layer.id, { offsetY: parseInt(e.target.value) || 0 })}
                            className="w-12 text-center text-white bg-transparent focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Scale */}
                      <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Scale:</span>
                        <input
                          type="number"
                          step="0.05"
                          min="0.1"
                          max="2"
                          value={layer.scale ?? 1}
                          onChange={(e) => updateLayer(layer.id, { scale: parseFloat(e.target.value) || 1 })}
                          className="w-12 text-center text-emerald-400 bg-transparent focus:outline-none font-bold"
                        />
                      </div>

                      {/* Opacity */}
                      <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Opacity:</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="1"
                          value={layer.opacity ?? 1}
                          onChange={(e) => updateLayer(layer.id, { opacity: parseFloat(e.target.value) || 1 })}
                          className="w-12 text-center text-sky-400 bg-transparent focus:outline-none font-bold"
                        />
                      </div>
                    </div>

                    {/* Right: Delete */}
                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => removeLayer(layer.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition"
                        title="Remove layer from scene"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="p-16 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-xl">
          <Layers className="w-8 h-8 mx-auto mb-2 text-slate-600" />
          <p className="text-sm font-semibold">No scenes available.</p>
          <button
            onClick={() => setIsNewSceneModalOpen(true)}
            className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold"
          >
            + Create New Scene
          </button>
        </div>
      )}

      {/* ADD LAYER MODAL */}
      {isAddLayerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Add Studio Graphic as Scene Layer</span>
              </h3>
              <button
                onClick={() => setIsAddLayerModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 border-b border-slate-800 bg-slate-950/40">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search graphics..."
                  value={layerSearch}
                  onChange={(e) => setLayerSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-2">
              {savedGraphics
                .filter(
                  (g) =>
                    !layerSearch ||
                    g.name.toLowerCase().includes(layerSearch.toLowerCase()) ||
                    (g.category && g.category.toLowerCase().includes(layerSearch.toLowerCase()))
                )
                .map((g) => (
                  <div
                    key={g.id}
                    onClick={() => handleAddLayer(g)}
                    className="p-3 rounded-lg border border-slate-800 hover:border-emerald-500 hover:bg-slate-800/60 cursor-pointer transition flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{g.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {g.sport} • {g.category || 'General'} • {g.elements?.length || 0} elements
                      </div>
                    </div>
                    <span className="text-xs text-emerald-400 font-bold">+ Add as Layer</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* CREATE SCENE MODAL */}
      {isNewSceneModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Create New Scene</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Scene Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., INNINGS BREAK COMPOSITE"
                  value={newSceneName}
                  onChange={(e) => setNewSceneName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Description
                </label>
                <textarea
                  placeholder="Notes on composition..."
                  value={newSceneDesc}
                  onChange={(e) => setNewSceneDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsNewSceneModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateScene}
                disabled={!newSceneName.trim() || saving}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition"
              >
                Create Scene
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
