import React, { useState, useEffect } from 'react';
import { GraphicPlaylist, PlaylistItem, SportType, StudioGraphic } from '../../../types';
import { api } from '../../../services/api';
import {
  ListOrdered,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Play,
  Save,
  Film,
  Clock,
  RotateCw,
  Sparkles,
  Check,
  Search,
  X,
  Copy,
  FolderOpen,
} from 'lucide-react';

interface OnAirPlaylistManagerProps {
  sport?: SportType;
  matchId?: string;
  onPlayItem?: (item: PlaylistItem) => void;
  onPreviewPlaylist?: (pl: GraphicPlaylist) => void;
  onTakeLivePlaylist?: (pl: GraphicPlaylist) => void;
}

export const OnAirPlaylistManager: React.FC<OnAirPlaylistManagerProps> = ({
  sport = 'CRICKET',
  matchId,
  onPlayItem,
}) => {
  const [playlists, setPlaylists] = useState<GraphicPlaylist[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [savedGraphics, setSavedGraphics] = useState<StudioGraphic[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Add Item modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState('');

  // New Playlist form modal
  const [isNewPlaylistModalOpen, setIsNewPlaylistModalOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [plRes, gRes] = await Promise.all([
        api.getGraphicPlaylists({ sport, matchId }),
        api.getStudioGraphics(),
      ]);
      const list = plRes.playlists || [];
      setPlaylists(list);
      setSavedGraphics(gRes.graphics || []);
      if (list.length > 0 && !selectedPlaylistId) {
        setSelectedPlaylistId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load playlists:', err);
      showToast('Error loading playlists.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [sport, matchId]);

  const activePlaylist = playlists.find((p) => p.id === selectedPlaylistId) || playlists[0] || null;

  // Handle active playlist updates
  const updateActivePlaylist = (updates: Partial<GraphicPlaylist>) => {
    if (!activePlaylist) return;
    setPlaylists((prev) =>
      prev.map((p) => (p.id === activePlaylist.id ? { ...p, ...updates } : p))
    );
  };

  // Reordering playlist items
  const moveItem = (index: number, direction: 'UP' | 'DOWN') => {
    if (!activePlaylist) return;
    const items = [...activePlaylist.items];
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const temp = items[index];
    items[index] = items[targetIndex];
    items[targetIndex] = temp;

    // renumber order
    items.forEach((item, idx) => {
      item.order = idx + 1;
    });

    updateActivePlaylist({ items });
  };

  // Remove item
  const removeItem = (id: string) => {
    if (!activePlaylist) return;
    const items = activePlaylist.items
      .filter((i) => i.id !== id)
      .map((item, idx) => ({ ...item, order: idx + 1 }));
    updateActivePlaylist({ items });
  };

  // Add graphic item to playlist
  const handleAddGraphic = (graphic: StudioGraphic) => {
    if (!activePlaylist) return;
    const newItem: PlaylistItem = {
      id: crypto.randomUUID(),
      order: activePlaylist.items.length + 1,
      name: graphic.name,
      graphicId: graphic.id,
      graphicName: graphic.name,
      enabled: true,
      duration: graphic.displayDuration || 4,
      transition: graphic.transition || 'FADE',
      notes: `Category: ${graphic.category || 'Standard'}`,
      status: 'IDLE',
    };
    updateActivePlaylist({ items: [...activePlaylist.items, newItem] });
    setIsAddModalOpen(false);
  };

  // Save playlist
  const handleSave = async () => {
    if (!activePlaylist) return;
    try {
      setSaving(true);
      await api.saveGraphicPlaylist(activePlaylist);
      showToast('Playlist saved successfully!');
    } catch (err) {
      console.error('Failed to save playlist:', err);
      showToast('Error saving playlist.');
    } finally {
      setSaving(false);
    }
  };

  // Create new playlist
  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    try {
      setSaving(true);
      const res = await api.saveGraphicPlaylist({
        name: newPlaylistName.trim(),
        description: newPlaylistDesc.trim(),
        sport: (sport || 'CRICKET') as SportType,
        matchId,
        loop: false,
        items: [],
      });
      setPlaylists((prev) => [...prev, res.playlist]);
      setSelectedPlaylistId(res.playlist.id);
      setIsNewPlaylistModalOpen(false);
      setNewPlaylistName('');
      setNewPlaylistDesc('');
      showToast('New playlist created!');
    } catch (err) {
      console.error('Failed to create playlist:', err);
      showToast('Error creating playlist.');
    } finally {
      setSaving(false);
    }
  };

  // Delete playlist
  const handleDeletePlaylist = async () => {
    if (!activePlaylist) return;
    if (!window.confirm(`Delete playlist "${activePlaylist.name}"?`)) return;
    try {
      setSaving(true);
      await api.deleteGraphicPlaylist(activePlaylist.id);
      const remaining = playlists.filter((p) => p.id !== activePlaylist.id);
      setPlaylists(remaining);
      setSelectedPlaylistId(remaining.length > 0 ? remaining[0].id : null);
      showToast('Playlist deleted.');
    } catch (err) {
      console.error('Failed to delete playlist:', err);
      showToast('Error deleting playlist.');
    } finally {
      setSaving(false);
    }
  };

  // Load all enabled items into live queue
  const handleLoadToQueue = async () => {
    if (!activePlaylist || !matchId) return;
    const enabledItems = activePlaylist.items.filter((i) => i.enabled);
    if (enabledItems.length === 0) {
      showToast('No enabled items in playlist.');
      return;
    }

    try {
      // Send the first item live and the rest into queue
      const first = enabledItems[0];
      await api.takeLiveOnAir(matchId, {
        sourceType: 'PLAYLIST',
        sourceId: activePlaylist.id,
        graphicId: first.graphicId,
        graphicName: first.graphicName,
        durationSeconds: first.duration,
        triggerSource: 'MANUAL',
      });
      showToast(`Playlist "${activePlaylist.name}" loaded and started on air!`);
    } catch (err) {
      console.error('Failed to queue playlist:', err);
      showToast('Error loading playlist into on-air queue.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-lg shadow-2xl font-bold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Playlist Top Toolbar */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
            <ListOrdered className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <span>On-Air Graphic Playlist</span>
            </h2>
            <p className="text-xs text-slate-400">
              Arrange timed rundowns of sponsor spots, bumpers, lineups, and in-game sequences.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Playlist selector */}
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg">
            <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={activePlaylist?.id || ''}
              onChange={(e) => setSelectedPlaylistId(e.target.value)}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer max-w-[200px] truncate"
            >
              {playlists.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                  {p.name} ({p.items?.length || 0} items)
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setIsNewPlaylistModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold border border-slate-700 transition"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>New Playlist</span>
          </button>

          {activePlaylist && (
            <button
              onClick={handleDeletePlaylist}
              disabled={saving}
              className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-lg border border-transparent hover:border-rose-900/40 transition"
              title="Delete current playlist"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={saving || !activePlaylist}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-emerald-950/50 transition"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Playlist'}</span>
          </button>
        </div>
      </div>

      {/* Main Playlist Content */}
      {activePlaylist ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
          {/* Metadata & Loop Switch */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div className="flex-1">
              <input
                type="text"
                value={activePlaylist.name}
                onChange={(e) => updateActivePlaylist({ name: e.target.value })}
                placeholder="Playlist Name"
                className="text-base font-black text-white bg-transparent border-b border-transparent hover:border-slate-700 focus:border-emerald-500 focus:outline-none w-full max-w-md py-0.5"
              />
              <input
                type="text"
                value={activePlaylist.description || ''}
                onChange={(e) => updateActivePlaylist({ description: e.target.value })}
                placeholder="Optional description or notes..."
                className="text-xs text-slate-400 bg-transparent border-b border-transparent hover:border-slate-700 focus:border-emerald-500 focus:outline-none w-full max-w-lg mt-1"
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300">
                <input
                  type="checkbox"
                  checked={Boolean(activePlaylist.loop)}
                  onChange={(e) => updateActivePlaylist({ loop: e.target.checked })}
                  className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0 w-4 h-4"
                />
                <RotateCw className="w-3.5 h-3.5 text-purple-400" />
                <span>Loop Sequence</span>
              </label>

              {matchId && (
                <button
                  onClick={handleLoadToQueue}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-black shadow-lg shadow-red-950/40 transition"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>START ON AIR</span>
                </button>
              )}
            </div>
          </div>

          {/* Items Header */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Sequence Items ({activePlaylist.items.length})
            </span>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg text-xs font-bold border border-slate-700 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Graphic to Playlist</span>
            </button>
          </div>

          {/* Items List */}
          {activePlaylist.items.length === 0 ? (
            <div className="p-12 text-center text-slate-400 border border-dashed border-slate-800 rounded-xl">
              <Film className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p className="text-sm font-semibold">Playlist is empty</p>
              <p className="text-xs text-slate-500 mt-1">
                Add graphics from your studio library to build your on-air sequence.
              </p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="mt-4 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition"
              >
                + Add First Graphic
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {activePlaylist.items.map((item, idx) => (
                <div
                  key={item.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition ${
                    item.enabled
                      ? 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-950/30 border-slate-800/40 opacity-50'
                  }`}
                >
                  {/* Left: Reorder & Name */}
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <button
                        onClick={() => moveItem(idx, 'UP')}
                        disabled={idx === 0}
                        className="text-slate-500 hover:text-white disabled:opacity-20 transition"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveItem(idx, 'DOWN')}
                        disabled={idx === activePlaylist.items.length - 1}
                        className="text-slate-500 hover:text-white disabled:opacity-20 transition"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>

                    <span className="font-mono text-xs font-bold text-slate-500 w-5 text-center">
                      #{item.order}
                    </span>

                    <input
                      type="checkbox"
                      checked={item.enabled}
                      onChange={(e) => {
                        const items = [...activePlaylist.items];
                        items[idx].enabled = e.target.checked;
                        updateActivePlaylist({ items });
                      }}
                      className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0 w-4 h-4 cursor-pointer"
                    />

                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>{item.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-slate-300">
                          {item.graphicName}
                        </span>
                      </div>
                      <input
                        type="text"
                        value={item.notes || ''}
                        onChange={(e) => {
                          const items = [...activePlaylist.items];
                          items[idx].notes = e.target.value;
                          updateActivePlaylist({ items });
                        }}
                        placeholder="Operator note / cue..."
                        className="text-[11px] text-slate-400 bg-transparent border-none focus:outline-none w-full max-w-xs"
                      />
                    </div>
                  </div>

                  {/* Middle & Right: Duration & Actions */}
                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <input
                        type="number"
                        min="0"
                        max="60"
                        step="0.5"
                        value={item.duration}
                        onChange={(e) => {
                          const items = [...activePlaylist.items];
                          items[idx].duration = parseFloat(e.target.value) || 0;
                          updateActivePlaylist({ items });
                        }}
                        className="w-12 text-center text-xs font-mono font-bold text-emerald-400 bg-transparent focus:outline-none"
                        title="Display duration in seconds (0 = manual advance)"
                      />
                      <span className="text-[10px] text-slate-500 font-mono">sec</span>
                    </div>

                    {onPlayItem && (
                      <button
                        onClick={() => onPlayItem(item)}
                        className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 rounded-lg transition"
                        title="Take this item live now"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition"
                      title="Remove from playlist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="p-16 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-xl">
          <ListOrdered className="w-8 h-8 mx-auto mb-2 text-slate-600" />
          <p className="text-sm font-semibold">No playlists available.</p>
          <button
            onClick={() => setIsNewPlaylistModalOpen(true)}
            className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold"
          >
            + Create New Playlist
          </button>
        </div>
      )}

      {/* ADD GRAPHIC TO PLAYLIST MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Film className="w-4 h-4 text-emerald-400" />
                <span>Add Studio Graphic to Playlist</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
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
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-2">
              {savedGraphics
                .filter(
                  (g) =>
                    !modalSearch ||
                    g.name.toLowerCase().includes(modalSearch.toLowerCase()) ||
                    (g.category && g.category.toLowerCase().includes(modalSearch.toLowerCase()))
                )
                .map((g) => (
                  <div
                    key={g.id}
                    onClick={() => handleAddGraphic(g)}
                    className="p-3 rounded-lg border border-slate-800 hover:border-emerald-500 hover:bg-slate-800/60 cursor-pointer transition flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{g.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {g.sport} • {g.category || 'General'} • {g.displayDuration || 4}s
                      </div>
                    </div>
                    <span className="text-xs text-emerald-400 font-bold">+ Add to Playlist</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* CREATE PLAYLIST MODAL */}
      {isNewPlaylistModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Create New Playlist</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Playlist Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Innings Break Highlights Rundown"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Description
                </label>
                <textarea
                  placeholder="Notes on when and how this playlist should be cued..."
                  value={newPlaylistDesc}
                  onChange={(e) => setNewPlaylistDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsNewPlaylistModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePlaylist}
                disabled={!newPlaylistName.trim() || saving}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition"
              >
                Create Playlist
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
