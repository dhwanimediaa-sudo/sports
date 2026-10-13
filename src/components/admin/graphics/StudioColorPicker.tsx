import React, { useState, useRef, useEffect } from 'react';
import { GraphicGradientConfig } from '../../../types';
import { Palette, Check, Sparkles, Sliders, ChevronDown } from 'lucide-react';

export const BROADCAST_PRESET_COLORS = [
  // Row 1: Vivid Sports Broadcast Accents
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Electric Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber / Gold
  '#eab308', // Yellow
  '#84cc16', // Lime

  // Row 2: Dark & Theme Broadcast Backgrounds
  '#ffffff', // Pure White
  '#f1f5f9', // Slate Light
  '#cbd5e1', // Slate Mid
  '#94a3b8', // Slate Gray
  '#64748b', // Cool Gray
  '#475569', // Medium Slate
  '#334155', // Dark Slate
  '#1e293b', // Deep Slate
  '#0f172a', // Obsidian Slate
  '#020617', // Midnight Black
  '#000000', // Pure Black
  'transparent', // Transparent
];

interface StudioColorPickerProps {
  color?: string;
  gradient?: GraphicGradientConfig;
  opacity?: number;
  label?: string;
  allowGradient?: boolean;
  allowOpacity?: boolean;
  onChangeColor: (color: string) => void;
  onChangeGradient?: (gradient: GraphicGradientConfig | undefined) => void;
  onChangeOpacity?: (opacity: number) => void;
  className?: string;
  compact?: boolean;
}

export const StudioColorPicker: React.FC<StudioColorPickerProps> = ({
  color = '#ffffff',
  gradient,
  opacity = 1,
  label,
  allowGradient = false,
  allowOpacity = true,
  onChangeColor,
  onChangeGradient,
  onChangeOpacity,
  className = '',
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'SOLID' | 'GRADIENT'>(
    gradient?.enabled ? 'GRADIENT' : 'SOLID'
  );
  const [hexInput, setHexInput] = useState(color || '#ffffff');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Sync hexInput when color prop changes
  useEffect(() => {
    setHexInput(color || '#ffffff');
    if (gradient?.enabled) {
      setActiveTab('GRADIENT');
    }
  }, [color, gradient?.enabled]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleHexSubmit = (val: string) => {
    let clean = val.trim();
    if (!clean.startsWith('#') && clean !== 'transparent' && clean.length === 6) {
      clean = `#${clean}`;
    }
    setHexInput(clean);
    onChangeColor(clean);
  };

  const isTransparent = color === 'transparent' || color === '';

  return (
    <div className={`relative inline-block ${className}`} ref={popoverRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`flex items-center gap-1.5 rounded-lg border transition ${
          compact
            ? 'p-1 bg-slate-900 border-slate-700 hover:border-emerald-500'
            : 'px-2 py-1.5 bg-slate-950 border-slate-800 hover:border-slate-700 w-full justify-between'
        } ${isOpen ? 'ring-2 ring-emerald-500/50 border-emerald-500' : ''}`}
        title={label || 'Select Color'}
      >
        <div className="flex items-center gap-2 min-w-0">
          {/* Swatch Preview Pill */}
          <div
            className="w-5 h-5 rounded-md border border-slate-600/80 shrink-0 shadow-inner relative overflow-hidden"
            style={{
              backgroundImage:
                gradient?.enabled && gradient.type === 'linear'
                  ? `linear-gradient(${gradient.direction === 'angle' ? `${gradient.angle || 90}deg` : gradient.direction || 'to right'}, ${gradient.startColor}, ${gradient.endColor})`
                  : undefined,
              backgroundColor: gradient?.enabled ? undefined : isTransparent ? '#0f172a' : color,
              opacity: opacity !== undefined ? opacity : 1,
            }}
          >
            {isTransparent && (
              <div className="absolute inset-0 flex items-center justify-center text-[8px] font-mono text-rose-400 font-bold">
                ✕
              </div>
            )}
          </div>

          {!compact && (
            <div className="flex flex-col text-left min-w-0">
              {label && <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{label}</span>}
              <span className="text-[11px] font-mono font-bold text-slate-200 truncate">
                {gradient?.enabled ? 'Gradient' : isTransparent ? 'Transparent' : color}
              </span>
            </div>
          )}
        </div>

        {!compact && <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
      </button>

      {/* Popover Color Picker Window */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-full left-0 mt-2 z-[999999] w-64 bg-slate-950/98 border border-slate-700/90 rounded-xl shadow-2xl p-3 text-slate-200 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Tabs for Solid vs Gradient */}
          {allowGradient && onChangeGradient && (
            <div className="grid grid-cols-2 gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 mb-2.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('SOLID');
                  onChangeGradient({ ...gradient!, enabled: false });
                }}
                className={`py-1 rounded-md transition flex items-center justify-center gap-1 ${
                  activeTab === 'SOLID'
                    ? 'bg-emerald-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Palette className="w-3 h-3" />
                <span>Solid</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('GRADIENT');
                  onChangeGradient({
                    enabled: true,
                    type: gradient?.type || 'linear',
                    direction: gradient?.direction || 'to right',
                    startColor: gradient?.startColor || color || '#10b981',
                    endColor: gradient?.endColor || '#3b82f6',
                    angle: gradient?.angle || 90,
                  });
                }}
                className={`py-1 rounded-md transition flex items-center justify-center gap-1 ${
                  activeTab === 'GRADIENT'
                    ? 'bg-emerald-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>Gradient</span>
              </button>
            </div>
          )}

          {/* SOLID COLOR CONTROLS */}
          {activeTab === 'SOLID' && (
            <div className="space-y-2.5">
              {/* Native Color Input + Direct Hex Input */}
              <div className="flex items-center gap-2">
                <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-700 shrink-0 cursor-pointer shadow">
                  <input
                    type="color"
                    value={isTransparent ? '#ffffff' : color.startsWith('#') ? color.substring(0, 7) : '#ffffff'}
                    onChange={(e) => {
                      const val = e.target.value;
                      setHexInput(val);
                      onChangeColor(val);
                    }}
                    className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer opacity-0"
                  />
                  <div
                    className="w-full h-full"
                    style={{ backgroundColor: isTransparent ? '#0f172a' : color }}
                  />
                </div>

                <div className="flex-1">
                  <input
                    type="text"
                    value={hexInput}
                    onChange={(e) => {
                      setHexInput(e.target.value);
                      handleHexSubmit(e.target.value);
                    }}
                    placeholder="#ffffff"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-white uppercase focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Preset Swatches Palette */}
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400 mb-1.5 tracking-wider">
                  Presets
                </div>
                <div className="grid grid-cols-6 gap-1.5">
                  {BROADCAST_PRESET_COLORS.map((preset) => {
                    const isSelected = color.toLowerCase() === preset.toLowerCase();
                    const isTrans = preset === 'transparent';
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setHexInput(preset);
                          onChangeColor(preset);
                        }}
                        className={`w-7 h-7 rounded-md border transition relative flex items-center justify-center ${
                          isSelected
                            ? 'border-emerald-400 scale-110 shadow-lg ring-1 ring-emerald-400/50 z-10'
                            : 'border-slate-700/80 hover:scale-105 hover:border-slate-500'
                        }`}
                        style={{
                          backgroundColor: isTrans ? '#0f172a' : preset,
                        }}
                        title={preset}
                      >
                        {isSelected && (
                          <Check
                            className={`w-3.5 h-3.5 drop-shadow ${
                              preset === '#ffffff' || preset === '#f1f5f9' || preset === '#eab308' || preset === '#84cc16'
                                ? 'text-slate-950'
                                : 'text-white'
                            }`}
                          />
                        )}
                        {isTrans && (
                          <span className="text-[8px] font-bold text-rose-400 font-mono">✕</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* GRADIENT CONTROLS */}
          {activeTab === 'GRADIENT' && allowGradient && onChangeGradient && (
            <div className="space-y-2.5 text-xs">
              {/* Start & End Color Pickers */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Start Color
                  </label>
                  <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 p-1 rounded-lg">
                    <input
                      type="color"
                      value={gradient?.startColor || '#10b981'}
                      onChange={(e) =>
                        onChangeGradient({
                          ...gradient!,
                          enabled: true,
                          startColor: e.target.value,
                        })
                      }
                      className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                    />
                    <span className="text-[10px] font-mono font-bold text-slate-200 uppercase truncate">
                      {gradient?.startColor || '#10b981'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    End Color
                  </label>
                  <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 p-1 rounded-lg">
                    <input
                      type="color"
                      value={gradient?.endColor || '#3b82f6'}
                      onChange={(e) =>
                        onChangeGradient({
                          ...gradient!,
                          enabled: true,
                          endColor: e.target.value,
                        })
                      }
                      className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                    />
                    <span className="text-[10px] font-mono font-bold text-slate-200 uppercase truncate">
                      {gradient?.endColor || '#3b82f6'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Gradient Direction Selector */}
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Direction / Angle
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { label: '→ Right', dir: 'to right', angle: 90 },
                    { label: '↓ Down', dir: 'to bottom', angle: 180 },
                    { label: '↘ Diag', dir: 'to bottom right', angle: 135 },
                    { label: '↗ UpDiag', dir: 'to top right', angle: 45 },
                  ].map((d) => {
                    const isDirActive = (gradient?.direction || 'to right') === d.dir;
                    return (
                      <button
                        key={d.dir}
                        type="button"
                        onClick={() =>
                          onChangeGradient({
                            ...gradient!,
                            enabled: true,
                            direction: d.dir as any,
                            angle: d.angle,
                          })
                        }
                        className={`py-1 rounded text-[10px] font-bold border transition ${
                          isDirActive
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Opacity Slider */}
          {allowOpacity && onChangeOpacity && (
            <div className="pt-2.5 mt-2.5 border-t border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Opacity</span>
                <span className="font-mono text-emerald-400">
                  {Math.round((opacity !== undefined ? opacity : 1) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={opacity !== undefined ? opacity : 1}
                onChange={(e) => onChangeOpacity(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
