import React, { useState, useRef, useEffect } from 'react';
import {
  StudioGraphic,
  GraphicAspectRatio,
  GraphicResolutionPreset,
  GraphicOrientation,
} from '../../../types';
import {
  RESOLUTION_PRESETS,
  MIN_RESOLUTION_DIMENSION,
  MIN_HEIGHT_DIMENSION,
  MAX_RESOLUTION_DIMENSION,
  detectAspectRatio,
  detectOrientation,
  detectResolutionPreset,
  scaleGraphicElements,
} from '../../../utils/graphicResolutionUtils';
import {
  Maximize2,
  ChevronDown,
  Lock,
  Unlock,
  Check,
  RotateCw,
  X,
  Sliders,
  Tv,
  Smartphone,
  Square as SquareIcon,
  Sparkles,
} from 'lucide-react';

interface ResolutionSelectorDropdownProps {
  graphic: StudioGraphic;
  onApplyResolution: (updatedGraphic: StudioGraphic) => void;
  className?: string;
  showCustomModalDirectly?: boolean;
}

export const ResolutionSelectorDropdown: React.FC<ResolutionSelectorDropdownProps> = ({
  graphic,
  onApplyResolution,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Custom modal state
  const canvasWidth = Number(graphic.width) || Number(graphic.canvas?.width) || 1920;
  const canvasHeight = Number(graphic.height) || Number(graphic.canvas?.height) || 1080;
  const currentAspect = graphic.aspectRatio || detectAspectRatio(canvasWidth, canvasHeight);

  const [customWidth, setCustomWidth] = useState<number>(canvasWidth);
  const [customHeight, setCustomHeight] = useState<number>(canvasHeight);
  const [lockAspect, setLockAspect] = useState<boolean>(true);
  const [lockedRatioValue, setLockedRatioValue] = useState<number>(canvasWidth / canvasHeight);
  const [customError, setCustomError] = useState<string | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update modal inputs when graphic changes
  useEffect(() => {
    setCustomWidth(canvasWidth);
    setCustomHeight(canvasHeight);
    setLockedRatioValue(canvasWidth / canvasHeight);
  }, [canvasWidth, canvasHeight]);

  const handleSelectPreset = (w: number, h: number, presetId?: string) => {
    setIsOpen(false);
    if (w === canvasWidth && h === canvasHeight) return;

    const oldW = canvasWidth;
    const oldH = canvasHeight;

    const scaledElements = scaleGraphicElements(
      graphic.elements,
      oldW,
      oldH,
      w,
      h,
      'FIT'
    );

    const calculatedAspect = detectAspectRatio(w, h);
    const calculatedOrientation = detectOrientation(w, h);
    const matchedPreset = presetId || detectResolutionPreset(w, h);

    const updated: StudioGraphic = {
      ...graphic,
      width: w,
      height: h,
      aspectRatio: calculatedAspect,
      resolutionPreset: matchedPreset,
      customResolution: { width: w, height: h },
      orientation: calculatedOrientation,
      canvas: {
        ...graphic.canvas,
        width: w,
        height: h,
      },
      elements: scaledElements,
      updatedAt: new Date().toISOString(),
    };

    onApplyResolution(updated);
  };

  const handleCustomWidthChange = (val: number) => {
    setCustomWidth(val);
    if (lockAspect && lockedRatioValue > 0) {
      const newH = Math.round(val / lockedRatioValue);
      setCustomHeight(newH);
    }
    validateDimensions(val, lockAspect ? Math.round(val / lockedRatioValue) : customHeight);
  };

  const handleCustomHeightChange = (val: number) => {
    setCustomHeight(val);
    if (lockAspect && lockedRatioValue > 0) {
      const newW = Math.round(val * lockedRatioValue);
      setCustomWidth(newW);
    }
    validateDimensions(lockAspect ? Math.round(val * lockedRatioValue) : customWidth, val);
  };

  const validateDimensions = (w: number, h: number): boolean => {
    if (!w || !h || isNaN(w) || isNaN(h)) {
      setCustomError('Width and Height must be valid numbers.');
      return false;
    }
    if (w < MIN_RESOLUTION_DIMENSION || h < MIN_HEIGHT_DIMENSION) {
      setCustomError(`Min resolution is ${MIN_RESOLUTION_DIMENSION} × ${MIN_HEIGHT_DIMENSION} px.`);
      return false;
    }
    if (w > MAX_RESOLUTION_DIMENSION || h > MAX_RESOLUTION_DIMENSION) {
      setCustomError(`Max resolution is ${MAX_RESOLUTION_DIMENSION} × ${MAX_RESOLUTION_DIMENSION} px.`);
      return false;
    }
    setCustomError(null);
    return true;
  };

  const handleApplyCustom = () => {
    if (!validateDimensions(customWidth, customHeight)) return;
    handleSelectPreset(customWidth, customHeight, 'CUSTOM');
    setShowCustomModal(false);
  };

  const handleOpenCustomModal = () => {
    setIsOpen(false);
    setCustomWidth(canvasWidth);
    setCustomHeight(canvasHeight);
    setLockedRatioValue(canvasWidth / canvasHeight);
    setCustomError(null);
    setShowCustomModal(true);
  };

  const isCurrent = (w: number, h: number) => canvasWidth === w && canvasHeight === h;

  return (
    <div className={`relative inline-flex items-center gap-1.5 ${className}`} ref={dropdownRef}>
      {/* Visual Resolution Trigger Button */}
      <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-700/80 shadow-sm hover:border-emerald-500/80 transition group">
        <span className="text-[10px] font-black uppercase text-emerald-400 pl-2 pr-1.5 tracking-wider select-none flex items-center gap-1">
          <Maximize2 className="w-3 h-3 text-emerald-400" />
          CANVAS
        </span>

        {/* Dropdown Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-mono font-bold transition border border-slate-700/60 group-hover:border-emerald-500/40"
          title="Change Canvas Resolution (Landscape, Portrait, Square, Custom)"
        >
          <span>
            {canvasWidth} × {canvasHeight}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-emerald-400' : ''}`} />
        </button>

        {/* Aspect Ratio Badge */}
        <span className="px-2 py-0.5 text-[11px] font-bold font-mono text-emerald-300 bg-emerald-950/70 border border-emerald-800/60 rounded-md mx-1 select-none">
          {currentAspect}
        </span>
      </div>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden text-xs py-1 animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto">
          {/* Section: STANDARD */}
          <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-950/80 flex items-center justify-between border-b border-slate-800">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Tv className="w-3 h-3" />
              STANDARD (16:9)
            </span>
            <span className="text-[9px] text-slate-500">Landscape</span>
          </div>

          <div className="p-1 space-y-0.5">
            {[
              { w: 3840, h: 2160, label: '3840 × 2160 — 4K UHD', id: '4K_UHD' },
              { w: 2560, h: 1440, label: '2560 × 1440 — QHD', id: 'QHD' },
              { w: 1920, h: 1080, label: '1920 × 1080 — Full HD', id: 'FULL_HD' },
              { w: 1600, h: 900, label: '1600 × 900', id: 'HD_900' },
              { w: 1280, h: 720, label: '1280 × 720 — HD', id: 'HD_720' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectPreset(item.w, item.h, item.id)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition font-medium ${
                  isCurrent(item.w, item.h)
                    ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                    : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span>{item.label}</span>
                {isCurrent(item.w, item.h) && <Check className="w-3.5 h-3.5 text-emerald-400" />}
              </button>
            ))}
          </div>

          {/* Section: PORTRAIT */}
          <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-950/80 flex items-center justify-between border-y border-slate-800 mt-1">
            <span className="flex items-center gap-1.5 text-sky-400">
              <Smartphone className="w-3 h-3" />
              PORTRAIT (9:16)
            </span>
            <span className="text-[9px] text-slate-500">Vertical / Mobile</span>
          </div>

          <div className="p-1 space-y-0.5">
            {[
              { w: 2160, h: 3840, label: '2160 × 3840', id: '9_16_2160' },
              { w: 1080, h: 1920, label: '1080 × 1920', id: '9_16_1080' },
              { w: 720, h: 1280, label: '720 × 1280', id: '9_16_720' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectPreset(item.w, item.h, item.id)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition font-medium ${
                  isCurrent(item.w, item.h)
                    ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/40'
                    : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span>{item.label}</span>
                {isCurrent(item.w, item.h) && <Check className="w-3.5 h-3.5 text-sky-400" />}
              </button>
            ))}
          </div>

          {/* Section: SQUARE */}
          <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-950/80 flex items-center justify-between border-y border-slate-800 mt-1">
            <span className="flex items-center gap-1.5 text-amber-400">
              <SquareIcon className="w-3 h-3" />
              SQUARE (1:1)
            </span>
            <span className="text-[9px] text-slate-500">Feed / Post</span>
          </div>

          <div className="p-1 space-y-0.5">
            {[
              { w: 2160, h: 2160, label: '2160 × 2160', id: '1_1_2160' },
              { w: 1080, h: 1080, label: '1080 × 1080', id: '1_1_1080' },
              { w: 720, h: 720, label: '720 × 720', id: '1_1_720' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectPreset(item.w, item.h, item.id)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition font-medium ${
                  isCurrent(item.w, item.h)
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                    : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span>{item.label}</span>
                {isCurrent(item.w, item.h) && <Check className="w-3.5 h-3.5 text-amber-400" />}
              </button>
            ))}
          </div>

          {/* Section: 4:5 */}
          <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-950/80 flex items-center justify-between border-y border-slate-800 mt-1">
            <span className="flex items-center gap-1.5 text-purple-400">
              4:5 SOCIAL FEED
            </span>
          </div>

          <div className="p-1 space-y-0.5">
            {[
              { w: 1080, h: 1350, label: '1080 × 1350', id: '4_5_1350' },
              { w: 864, h: 1080, label: '864 × 1080', id: '4_5_1080' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectPreset(item.w, item.h, item.id)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition font-medium ${
                  isCurrent(item.w, item.h)
                    ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40'
                    : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span>{item.label}</span>
                {isCurrent(item.w, item.h) && <Check className="w-3.5 h-3.5 text-purple-400" />}
              </button>
            ))}
          </div>

          {/* Section: CUSTOM */}
          <div className="p-1 border-t border-slate-800 mt-1">
            <button
              type="button"
              onClick={handleOpenCustomModal}
              className="w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between bg-slate-950 hover:bg-slate-800 text-emerald-400 font-bold transition border border-slate-800 hover:border-emerald-500/40"
            >
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                Custom Resolution...
              </span>
              <span className="text-[10px] text-slate-500 font-normal">320-7680px</span>
            </button>
          </div>
        </div>
      )}

      {/* Custom Canvas Size Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                  <Maximize2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    CUSTOM CANVAS SIZE
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Set precise pixel resolution (320 × 180 to 7680 × 7680)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 block uppercase">
                    Width
                  </label>
                  <input
                    type="number"
                    min={MIN_RESOLUTION_DIMENSION}
                    max={MAX_RESOLUTION_DIMENSION}
                    step={10}
                    value={customWidth || ''}
                    onChange={(e) => handleCustomWidthChange(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white focus:outline-none"
                    placeholder="1920"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 block uppercase">
                    Height
                  </label>
                  <input
                    type="number"
                    min={MIN_HEIGHT_DIMENSION}
                    max={MAX_RESOLUTION_DIMENSION}
                    step={10}
                    value={customHeight || ''}
                    onChange={(e) => handleCustomHeightChange(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white focus:outline-none"
                    placeholder="1080"
                  />
                </div>
              </div>

              {/* Lock Ratio & Aspect Ratio info */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !lockAspect;
                      setLockAspect(next);
                      if (next && customHeight > 0) {
                        setLockedRatioValue(customWidth / customHeight);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition ${
                      lockAspect
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {lockAspect ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    <span>Lock Aspect Ratio: [{lockAspect ? 'ON' : 'OFF'}]</span>
                  </button>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase">Aspect Ratio</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {detectAspectRatio(customWidth, customHeight)}
                  </span>
                </div>
              </div>

              {customError && (
                <div className="p-2.5 bg-rose-950/60 border border-rose-600/60 rounded-xl text-xs text-rose-300">
                  {customError}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-2 bg-slate-950/80">
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleApplyCustom}
                disabled={Boolean(customError)}
                className={`px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition ${
                  customError ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Check className="w-4 h-4" />
                <span>APPLY</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
