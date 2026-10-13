import React, { useState, useEffect } from 'react';
import { StudioGraphic, SportType } from '../../../types';
import { api } from '../../../services/api';
import { Sparkles, X, Check, Eye, Plus, Palette, Loader2 } from 'lucide-react';

interface PresetPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (preset: StudioGraphic) => void;
  currentSport?: SportType;
}

export const PresetPickerModal: React.FC<PresetPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectPreset,
  currentSport,
}) => {
  const [selectedSport, setSelectedSport] = useState<string>(currentSport || 'ALL');
  const [presets, setPresets] = useState<StudioGraphic[]>([]);
  const [previewPreset, setPreviewPreset] = useState<StudioGraphic | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      api
        .getStudioGraphicPresets()
        .then((res) => {
          if (res?.presets && Array.isArray(res.presets)) {
            const list = res.presets.map((p) => p.graphic as StudioGraphic).filter(Boolean);
            setPresets(list);
            if (list.length > 0) {
              setPreviewPreset(list[0]);
            }
          }
        })
        .catch((err) => {
          console.error('Failed to load presets:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const sportsList: string[] = [
    'ALL',
    'CRICKET',
    'TENNIS',
    'VOLLEYBALL',
    'KABADDI',
    'FOOTBALL',
    'HOCKEY',
    'BASKETBALL',
  ];

  const filteredPresets = presets.filter(
    (p) => selectedSport === 'ALL' || p.sport === selectedSport
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Broadcast Graphics Template Presets</h2>
              <p className="text-xs text-slate-400">
                Choose a pre-built broadcast overlay design to start editing immediately.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sport Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
          {sportsList.map((sport) => (
            <button
              key={sport}
              onClick={() => setSelectedSport(sport)}
              className={`px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition whitespace-nowrap ${
                selectedSport === sport
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {sport}
            </button>
          ))}
        </div>

        {/* Content Area: Grid + Preview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto min-h-0 pr-1">
          {/* Preset Cards */}
          <div className="space-y-2.5 overflow-y-auto max-h-[440px] pr-2">
            {filteredPresets.map((preset) => {
              const isSelected = previewPreset?.id === preset.id;
              return (
                <div
                  key={preset.id}
                  onClick={() => setPreviewPreset(preset)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-emerald-950/30 border-emerald-500 shadow-md shadow-emerald-950/50'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white">{preset.name}</span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {preset.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span>Sport: <strong className="text-slate-300">{preset.sport}</strong></span>
                      <span>•</span>
                      <span>{preset.elements.length} elements</span>
                      <span>•</span>
                      <span>Pos: {preset.positionPreset}</span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectPreset(preset);
                      onClose();
                    }}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-lg transition flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Use</span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Preset Preview Box */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between overflow-hidden">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Preset Live Preview
                </span>
                <span className="text-[11px] text-emerald-400 font-mono">
                  {(previewPreset?.canvas?.width || previewPreset?.width || 1920)} × {(previewPreset?.canvas?.height || previewPreset?.height || 1080)}
                </span>
              </div>

              {previewPreset && (() => {
                const canvasW = previewPreset.canvas?.width || previewPreset.width || 1920;
                const canvasH = previewPreset.canvas?.height || previewPreset.height || 1080;
                const isVertical = canvasH > canvasW;

                return (
                  <div className={`relative w-full ${isVertical ? 'aspect-[9/16] max-h-[300px] mx-auto' : 'aspect-video'} bg-slate-900/90 rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center p-2`}>
                    {/* Checkerboard transparent grid background */}
                    <div
                      className="absolute inset-0 opacity-20"
                      style={{
                        backgroundImage:
                          'radial-gradient(#475569 1px, transparent 1px), radial-gradient(#475569 1px, transparent 1px)',
                        backgroundSize: '16px 16px',
                        backgroundPosition: '0 0, 8px 8px',
                      }}
                    />

                    {/* Scaled Preview Elements */}
                    <div
                      className="relative"
                      style={{
                        width: '100%',
                        height: '100%',
                        transform: 'scale(1)',
                        transformOrigin: 'center center',
                      }}
                    >
                      {previewPreset.elements.map((el) => {
                        const scaleFactor = 0.22; // rough fit for aspect-video box
                        const elStyle: React.CSSProperties = {
                          position: 'absolute',
                          left: `${(el.x / canvasW) * 100}%`,
                          top: `${(el.y / canvasH) * 100}%`,
                          width: `${(el.width / canvasW) * 100}%`,
                          height: `${(el.height / canvasH) * 100}%`,
                          zIndex: el.zIndex,
                          backgroundColor: el.fillColor,
                          borderRadius: el.borderRadius ? `${el.borderRadius * scaleFactor}px` : undefined,
                          borderColor: el.borderColor,
                          borderWidth: el.borderWidth ? `${el.borderWidth}px` : undefined,
                          borderStyle: el.borderWidth ? 'solid' : undefined,
                          color: el.textColor || '#ffffff',
                          fontSize: el.fontSize ? `${Math.max(8, el.fontSize * scaleFactor)}px` : undefined,
                          fontWeight: (el.fontWeight as any) || 'bold',
                          textAlign: el.textAlign || 'center',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent:
                            el.textAlign === 'left'
                              ? 'flex-start'
                              : el.textAlign === 'right'
                              ? 'flex-end'
                              : 'center',
                          padding: '2px',
                          overflow: 'hidden',
                        };

                        if (el.gradient?.enabled) {
                          elStyle.backgroundImage = `linear-gradient(${el.gradient.direction || 'to right'}, ${el.gradient.startColor}, ${el.gradient.endColor})`;
                        }

                        return (
                          <div key={el.id} style={elStyle}>
                            {el.text ? (
                              <span className="truncate leading-none">{el.text}</span>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            {previewPreset && (
              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">{previewPreset.name}</h4>
                  <p className="text-xs text-slate-400">
                    Category: <strong className="text-emerald-400">{previewPreset.category}</strong>
                  </p>
                </div>
                <button
                  onClick={() => {
                    onSelectPreset(previewPreset);
                    onClose();
                  }}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition"
                >
                  <Check className="w-4 h-4" />
                  <span>Use This Preset</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
