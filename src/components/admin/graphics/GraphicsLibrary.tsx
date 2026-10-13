import React, { useState, useMemo } from 'react';
import { StudioGraphic, SportType } from '../../../types';
import { api } from '../../../services/api';
import { SPORT_GRAPHIC_CATEGORIES } from '../../../constants/studioGraphicsConstants';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { PresetPickerModal } from './PresetPickerModal';
import { RenameGraphicModal } from './RenameGraphicModal';
import { DuplicateGraphicModal } from './DuplicateGraphicModal';
import {
  Palette,
  Plus,
  Search,
  Filter,
  Trash2,
  Copy,
  Edit3,
  Power,
  Sparkles,
  Layers,
  Check,
  RefreshCw,
  Eye,
  Sliders,
  Tv,
  ArrowRight,
  Tag,
  Clock,
  Calendar,
} from 'lucide-react';

interface GraphicsLibraryProps {
  graphics: StudioGraphic[];
  loading: boolean;
  onRefresh: () => void;
  onOpenEditor: (graphic: StudioGraphic) => void;
  onCreateNew: () => void;
}

export const GraphicsLibrary: React.FC<GraphicsLibraryProps> = ({
  graphics,
  loading,
  onRefresh,
  onOpenEditor,
  onCreateNew,
}) => {
  const [selectedSport, setSelectedSport] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [search, setSearch] = useState<string>('');

  // Modals
  const [deleteTarget, setDeleteTarget] = useState<StudioGraphic | null>(null);
  const [renameTarget, setRenameTarget] = useState<StudioGraphic | null>(null);
  const [duplicateTarget, setDuplicateTarget] = useState<StudioGraphic | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const sportsList: string[] = [
    'ALL',
    'CRICKET',
    'TENNIS',
    'VOLLEYBALL',
    'KABADDI',
    'FOOTBALL',
    'HOCKEY',
    'BASKETBALL',
    'BADMINTON',
    'TABLE_TENNIS',
    'CUSTOM',
  ];

  // Dynamic category options based on chosen sport
  const categoryOptions = useMemo(() => {
    if (selectedSport === 'ALL') {
      const allCats = new Set<string>();
      Object.values(SPORT_GRAPHIC_CATEGORIES || {}).forEach((cats) => {
        if (Array.isArray(cats)) {
          cats.forEach((c) => allCats.add(c));
        }
      });
      return ['ALL', ...Array.from(allCats.values())];
    }
    const categoriesMap = SPORT_GRAPHIC_CATEGORIES || {};
    const cats = categoriesMap[selectedSport as SportType] || categoriesMap['CUSTOM'] || [];
    return ['ALL', ...cats];
  }, [selectedSport]);

  // Filtered graphics
  const filteredGraphics = useMemo(() => {
    const q = search.trim().toLowerCase();
    return graphics.filter((g) => {
      const matchSport = selectedSport === 'ALL' || g.sport === selectedSport;
      const matchCategory = selectedCategory === 'ALL' || g.category === selectedCategory;
      const matchStatus = selectedStatus === 'ALL' || g.status === selectedStatus;
      const matchSearch =
        !q ||
        g.name.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q) ||
        g.sport.toLowerCase().includes(q) ||
        (g.description && g.description.toLowerCase().includes(q)) ||
        (g.presetName && g.presetName.toLowerCase().includes(q)) ||
        (g.tags && g.tags.some((t) => t.toLowerCase().includes(q)));

      return matchSport && matchCategory && matchStatus && matchSearch;
    });
  }, [graphics, selectedSport, selectedCategory, selectedStatus, search]);

  // Actions
  const handleToggleStatus = async (graphic: StudioGraphic, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (graphic.status === 'ACTIVE') {
        await api.deactivateStudioGraphic(graphic.id);
        showToast(`Deactivated "${graphic.name}"`);
      } else {
        await api.activateStudioGraphic(graphic.id);
        showToast(`Activated "${graphic.name}"`);
      }
      onRefresh();
    } catch (err: any) {
      alert(err?.message || 'Failed to update graphic status.');
    }
  };

  const handleConfirmRename = async (newName: string) => {
    if (!renameTarget) return;
    try {
      await api.updateStudioGraphic(renameTarget.id, {
        name: newName,
      });
      showToast(`Renamed to "${newName}"`);
      setRenameTarget(null);
      onRefresh();
    } catch (err: any) {
      alert(err?.message || 'Failed to rename graphic.');
    }
  };

  const handleConfirmDuplicate = async (newName: string) => {
    if (!duplicateTarget) return;
    try {
      const res = await api.duplicateStudioGraphic(duplicateTarget.id, newName);
      showToast(`Duplicated -> "${res.graphic.name}"`);
      setDuplicateTarget(null);
      onRefresh();
    } catch (err: any) {
      alert(err?.message || 'Failed to duplicate graphic.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      await api.deleteStudioGraphic(deleteTarget.id);
      showToast(`Deleted "${deleteTarget.name}"`);
      setDeleteTarget(null);
      onRefresh();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete graphic.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSelectPreset = async (preset: StudioGraphic) => {
    try {
      const newGraphicData = {
        ...preset,
        id: undefined,
        name: `${preset.name} (Customized)`,
        status: 'ACTIVE' as const,
      };
      const res = await api.createStudioGraphic(newGraphicData);
      showToast(`Loaded preset "${res.graphic.name}"`);
      onRefresh();
      onOpenEditor(res.graphic);
    } catch (err: any) {
      alert(err?.message || 'Failed to create graphic from preset.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl font-bold flex items-center gap-2 animate-in slide-in-from-top duration-300">
          <Check className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modals */}
      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        graphicName={deleteTarget?.name || ''}
        loading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      <RenameGraphicModal
        isOpen={Boolean(renameTarget)}
        onClose={() => setRenameTarget(null)}
        onConfirmRename={handleConfirmRename}
        currentGraphic={renameTarget}
        existingGraphics={graphics}
      />

      <DuplicateGraphicModal
        isOpen={Boolean(duplicateTarget)}
        onClose={() => setDuplicateTarget(null)}
        onConfirmDuplicate={handleConfirmDuplicate}
        sourceGraphic={duplicateTarget}
        existingGraphics={graphics}
      />

      <PresetPickerModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        onSelectPreset={handleSelectPreset}
        currentSport={selectedSport !== 'ALL' ? (selectedSport as SportType) : undefined}
      />

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20 shadow-inner">
            <Palette className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <span>MANUAL SPORTS GRAPHICS STUDIO</span>
              <span className="text-xs font-bold px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
                PRO OVERLAY ENGINE
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Create, edit, animate, and preview broadcast overlays with dynamic variables & transparent layers.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPresetModalOpen(true)}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Presets Gallery</span>
          </button>

          <button
            onClick={onCreateNew}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Graphic</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-3">
        {/* Sport Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
          <span className="text-slate-500 font-bold text-[11px] uppercase tracking-wider pl-1">Sport:</span>
          {sportsList.map((sport) => (
            <button
              key={sport}
              onClick={() => {
                setSelectedSport(sport);
                setSelectedCategory('ALL');
              }}
              className={`px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition whitespace-nowrap ${
                selectedSport === sport
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800/80'
              }`}
            >
              {sport}
            </button>
          ))}
        </div>

        {/* Search, Category, and Status Filters */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center pt-2 border-t border-slate-800/80 text-xs">
          {/* Search */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search graphics by name or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Category Dropdown */}
          <div className="md:col-span-4 flex items-center gap-2">
            <span className="text-slate-400 font-medium whitespace-nowrap text-[11px]">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-bold focus:outline-none focus:border-emerald-500"
            >
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="md:col-span-3 flex items-center justify-end gap-1.5">
            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-3 py-1.5 rounded-lg font-bold text-[11px] uppercase tracking-wider transition ${
                  selectedStatus === st
                    ? 'bg-slate-700 text-white font-black'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {st}
              </button>
            ))}

            <button
              onClick={onRefresh}
              title="Refresh library"
              className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-800 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Graphic Cards */}
      {loading ? (
        <div className="p-16 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-500" />
          <p className="font-bold">Loading Graphics Library...</p>
        </div>
      ) : filteredGraphics.length === 0 ? (
        <div className="p-16 text-center bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl space-y-4">
          <Palette className="w-12 h-12 mx-auto text-slate-600 opacity-60" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">No Graphics Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No broadcast graphics match your current filter criteria. Create a new graphic or pick from presets.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setIsPresetModalOpen(true)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
            >
              Browse Presets
            </button>
            <button
              onClick={onCreateNew}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition"
            >
              Create Graphic
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGraphics.map((graphic) => {
            const isActive = graphic.status === 'ACTIVE';

            return (
              <div
                key={graphic.id}
                onClick={() => onOpenEditor(graphic)}
                className="group bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-4 shadow-lg hover:shadow-emerald-950/20 transition cursor-pointer flex flex-col justify-between space-y-3"
              >
                {/* Top Card Info */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <h3 className="text-sm font-black text-white group-hover:text-emerald-400 transition truncate">
                        {graphic.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                        <span className="font-semibold text-slate-300">{graphic.sport}</span>
                        <span>•</span>
                        <span className="font-bold text-emerald-400 px-1.5 py-0.2 bg-emerald-950/60 rounded border border-emerald-800/40">
                          {graphic.category}
                        </span>
                        <span>•</span>
                        <span className="font-mono text-[10px] text-slate-400 px-1.5 py-0.5 bg-slate-950 rounded border border-slate-800">
                          {(graphic.canvas?.width || graphic.width || 1920)}×{(graphic.canvas?.height || graphic.height || 1080)}
                        </span>
                        {graphic.presetName && (
                          <>
                            <span>•</span>
                            <span className="text-[10px] text-amber-300 px-1.5 py-0.2 bg-amber-950/50 rounded border border-amber-800/40">
                              {graphic.presetName}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Status Pill Button */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleStatus(graphic, e)}
                      title={isActive ? 'Click to Deactivate' : 'Click to Activate'}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase transition flex items-center gap-1.5 border shrink-0 ${
                        isActive
                          ? 'bg-emerald-950/70 text-emerald-400 border-emerald-600/60 shadow-sm shadow-emerald-500/20'
                          : 'bg-slate-950 text-slate-500 border-slate-800'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                        }`}
                      />
                      <span>{graphic.status}</span>
                    </button>
                  </div>

                  {/* Optional Description */}
                  {graphic.description && (
                    <p className="text-xs text-slate-400 line-clamp-2 italic">
                      {graphic.description}
                    </p>
                  )}

                  {/* Optional Tags */}
                  {graphic.tags && graphic.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {graphic.tags.slice(0, 4).map((t, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 bg-slate-950 text-slate-400 text-[10px] rounded border border-slate-800 flex items-center gap-0.5"
                        >
                          <Tag className="w-2.5 h-2.5 text-slate-500" />
                          <span>{t}</span>
                        </span>
                      ))}
                      {graphic.tags.length > 4 && (
                        <span className="text-[10px] text-slate-500 self-center">
                          +{graphic.tags.length - 4}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Visual Mini Thumbnail Mockup */}
                  {(() => {
                    const canvasW = graphic.canvas?.width || graphic.width || 1920;
                    const canvasH = graphic.canvas?.height || graphic.height || 1080;

                    return (
                      <div className="relative w-full h-28 bg-slate-950 rounded-xl border border-slate-800/80 overflow-hidden flex items-center justify-center p-2">
                        {/* Checkerboard subtle pattern */}
                        <div
                          className="absolute inset-0 opacity-15 pointer-events-none"
                          style={{
                            backgroundImage:
                              'radial-gradient(#64748b 1px, transparent 1px), radial-gradient(#64748b 1px, transparent 1px)',
                            backgroundSize: '12px 12px',
                            backgroundPosition: '0 0, 6px 6px',
                          }}
                        />

                        {/* Scaled Mini Elements Preview */}
                        <div className="relative w-full h-full">
                          {graphic.elements.map((el) => {
                            const style: React.CSSProperties = {
                              position: 'absolute',
                              left: `${(el.x / canvasW) * 100}%`,
                              top: `${(el.y / canvasH) * 100}%`,
                              width: `${(el.width / canvasW) * 100}%`,
                              height: `${(el.height / canvasH) * 100}%`,
                              backgroundColor: el.fillColor,
                              borderRadius: el.borderRadius ? `${el.borderRadius * 0.12}px` : undefined,
                              borderColor: el.borderColor,
                              borderWidth: el.borderWidth ? 1 : undefined,
                              borderStyle: el.borderWidth ? 'solid' : undefined,
                              color: el.textColor || '#ffffff',
                              fontSize: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                            };

                            if (el.gradient?.enabled) {
                              style.backgroundImage = `linear-gradient(${el.gradient.direction || 'to right'}, ${el.gradient.startColor}, ${el.gradient.endColor})`;
                            }

                            return (
                              <div key={el.id} style={style}>
                                {el.text ? (
                                  <span className="truncate text-[7px] font-bold px-0.5 leading-none">
                                    {el.text}
                                  </span>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Metadata Specs */}
                  <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] text-slate-400">
                    <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/60 text-center">
                      <span className="text-[10px] text-slate-500 block">Elements</span>
                      <strong className="text-slate-200">{graphic.elements.length} Layers</strong>
                    </div>
                    <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/60 text-center">
                      <span className="text-[10px] text-slate-500 block">Animation</span>
                      <strong className="text-slate-200 truncate block">{graphic.animation}</strong>
                    </div>
                    <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/60 text-center">
                      <span className="text-[10px] text-slate-500 block">Placement</span>
                      <strong className="text-slate-200 truncate block">{graphic.positionPreset}</strong>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div className="flex flex-col text-[10px] text-slate-500 font-mono">
                    <span title={`Updated: ${new Date(graphic.updatedAt || graphic.createdAt).toLocaleString()}`}>
                      Mod: {new Date(graphic.updatedAt || graphic.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Rename Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenameTarget(graphic);
                      }}
                      title="Rename Graphic"
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {/* Duplicate Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDuplicateTarget(graphic);
                      }}
                      title="Duplicate Graphic"
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(graphic);
                      }}
                      title="Delete Graphic"
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Open in Editor Button */}
                    <button
                      type="button"
                      onClick={() => onOpenEditor(graphic)}
                      className="ml-1 px-3 py-1.5 bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-200 text-xs font-bold rounded-lg transition flex items-center gap-1"
                    >
                      <Sliders className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
