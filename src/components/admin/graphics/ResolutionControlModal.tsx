import React, { useState, useEffect } from 'react';
import {
  StudioGraphic,
  GraphicAspectRatio,
  GraphicResolutionPreset,
  GraphicOrientation,
  ResolutionConversionStrategy,
} from '../../../types';
import {
  RESOLUTION_PRESETS,
  ASPECT_RATIOS,
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
  X,
  Check,
  Lock,
  Unlock,
  RotateCw,
  Sparkles,
  Sliders,
  Tv,
  Smartphone,
  Square,
  Crop,
  Layers,
  AlertCircle,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';

interface ResolutionControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  graphic: StudioGraphic;
  onApplyResolution: (updatedGraphic: StudioGraphic) => void;
}

export const ResolutionControlModal: React.FC<ResolutionControlModalProps> = ({
  isOpen,
  onClose,
  graphic,
  onApplyResolution,
}) => {
  const currentW = Number(graphic.width) || Number(graphic.canvas?.width) || 1920;
  const currentH = Number(graphic.height) || Number(graphic.canvas?.height) || 1080;

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    graphic.resolutionPreset || detectResolutionPreset(currentW, currentH)
  );

  const [width, setWidth] = useState<number>(currentW);
  const [height, setHeight] = useState<number>(currentH);
  const [lockRatio, setLockRatio] = useState<boolean>(true);
  const [lockedRatioValue, setLockedRatioValue] = useState<number>(currentW / currentH);
  const [strategy, setStrategy] = useState<ResolutionConversionStrategy>('FIT');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync state when opening modal
  useEffect(() => {
    if (isOpen) {
      const w = Number(graphic.width) || Number(graphic.canvas?.width) || 1920;
      const h = Number(graphic.height) || Number(graphic.canvas?.height) || 1080;
      setWidth(w);
      setHeight(h);
      setLockedRatioValue(w / h);
      setSelectedPresetId(graphic.resolutionPreset || detectResolutionPreset(w, h));
      setValidationError(null);
    }
  }, [isOpen, graphic]);

  if (!isOpen) return null;

  // Handle Preset Click
  const handleSelectPreset = (preset: (typeof RESOLUTION_PRESETS)[0]) => {
    setSelectedPresetId(preset.id);
    if (preset.id !== 'CUSTOM') {
      setWidth(preset.width);
      setHeight(preset.height);
      setLockedRatioValue(preset.width / preset.height);
      setValidationError(null);
    }
  };

  // Handle Width change with Lock Aspect Ratio
  const handleWidthChange = (newW: number) => {
    setWidth(newW);
    setSelectedPresetId(detectResolutionPreset(newW, lockRatio ? Math.round(newW / lockedRatioValue) : height));

    if (lockRatio && lockedRatioValue > 0) {
      const computedH = Math.round(newW / lockedRatioValue);
      setHeight(computedH);
    }

    validateDimensions(newW, lockRatio ? Math.round(newW / lockedRatioValue) : height);
  };

  // Handle Height change with Lock Aspect Ratio
  const handleHeightChange = (newH: number) => {
    setHeight(newH);
    setSelectedPresetId(detectResolutionPreset(lockRatio ? Math.round(newH * lockedRatioValue) : width, newH));

    if (lockRatio && lockedRatioValue > 0) {
      const computedW = Math.round(newH * lockedRatioValue);
      setWidth(computedW);
    }

    validateDimensions(lockRatio ? Math.round(newH * lockedRatioValue) : width, newH);
  };

  // Swap Orientation (Landscape <-> Portrait)
  const handleSwapOrientation = () => {
    const newW = height;
    const newH = width;
    setWidth(newW);
    setHeight(newH);
    setLockedRatioValue(newW / newH);
    setSelectedPresetId(detectResolutionPreset(newW, newH));
    validateDimensions(newW, newH);
  };

  const validateDimensions = (w: number, h: number): boolean => {
    if (!w || !h || isNaN(w) || isNaN(h)) {
      setValidationError('Width and Height must be valid numbers.');
      return false;
    }
    if (w < MIN_RESOLUTION_DIMENSION || h < MIN_HEIGHT_DIMENSION) {
      setValidationError(
        `Minimum resolution supported is ${MIN_RESOLUTION_DIMENSION} × ${MIN_HEIGHT_DIMENSION} px.`
      );
      return false;
    }
    if (w > MAX_RESOLUTION_DIMENSION || h > MAX_RESOLUTION_DIMENSION) {
      setValidationError(
        `Maximum resolution supported is ${MAX_RESOLUTION_DIMENSION} × ${MAX_RESOLUTION_DIMENSION} px.`
      );
      return false;
    }
    setValidationError(null);
    return true;
  };

  // Apply resolution changes
  const handleApply = () => {
    if (!validateDimensions(width, height)) return;

    const oldW = Number(graphic.width) || Number(graphic.canvas?.width) || 1920;
    const oldH = Number(graphic.height) || Number(graphic.canvas?.height) || 1080;

    let updatedElements = graphic.elements;
    if (oldW !== width || oldH !== height) {
      updatedElements = scaleGraphicElements(
        graphic.elements,
        oldW,
        oldH,
        width,
        height,
        strategy
      );
    }

    const calculatedAspect = detectAspectRatio(width, height);
    const calculatedOrientation = detectOrientation(width, height);
    const matchedPreset = detectResolutionPreset(width, height);

    const updatedGraphic: StudioGraphic = {
      ...graphic,
      width,
      height,
      aspectRatio: calculatedAspect,
      resolutionPreset: matchedPreset,
      customResolution: { width, height },
      orientation: calculatedOrientation,
      canvas: {
        ...graphic.canvas,
        width,
        height,
      },
      elements: updatedElements,
      updatedAt: new Date().toISOString(),
    };

    onApplyResolution(updatedGraphic);
    onClose();
  };

  // Filter presets
  const categoriesList = [
    { id: 'ALL', label: 'All Formats' },
    { id: '16:9', label: '16:9 Broadcast' },
    { id: '9:16', label: '9:16 Mobile / Stories' },
    { id: '1:1', label: '1:1 Square' },
    { id: '4:3', label: '4:3 Classic / Jumbotron' },
    { id: '4:5', label: '4:5 Social Feed' },
    { id: 'CUSTOM', label: 'Custom' },
  ];

  const filteredPresets = RESOLUTION_PRESETS.filter(
    (p) => selectedCategory === 'ALL' || p.category === selectedCategory
  );

  const previewRatio = width / height;
  const currentAspectRatioString = detectAspectRatio(width, height);
  const currentOrientation = detectOrientation(width, height);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Maximize2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Canvas Resolution & Dimensions
                <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {currentW} × {currentH} px
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Change broadcast resolution. All graphic elements, text boxes, and shapes will be
                automatically scaled proportionally without distortion.
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

        {/* Content Body: Presets + Custom Inputs + Strategy */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 overflow-y-auto pr-1">
          {/* Left Column: Preset Catalog (7 Cols) */}
          <div className="lg:col-span-7 space-y-3 flex flex-col min-h-0">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
              {categoriesList.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1.5 rounded-lg font-bold transition whitespace-nowrap text-[11px] ${
                    selectedCategory === cat.id
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Presets List Grid */}
            <div className="space-y-2 overflow-y-auto max-h-[380px] pr-1.5 flex-1">
              {filteredPresets.map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <div
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-950/40'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/30'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Mini Aspect Ratio Visual Thumbnail */}
                      <div className="w-12 h-10 bg-slate-900 border border-slate-700 rounded-lg flex items-center justify-center p-1 shrink-0">
                        <div
                          style={{
                            width: preset.width > preset.height ? '32px' : `${Math.round(32 * (preset.width / preset.height))}px`,
                            height: preset.height > preset.width ? '26px' : `${Math.round(26 * (preset.height / preset.width))}px`,
                          }}
                          className={`border rounded-sm ${
                            isSelected ? 'bg-emerald-500/20 border-emerald-400' : 'bg-slate-800 border-slate-600'
                          }`}
                        />
                      </div>

                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white truncate">
                            {preset.name}
                          </span>
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 shrink-0">
                            {preset.aspectRatio}
                          </span>
                          {preset.isStandard && (
                            <span className="text-[9px] uppercase font-black px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 shrink-0">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">{preset.description}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono text-xs font-bold text-emerald-400">
                        {preset.width} × {preset.height}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Custom Dimension Controls + Scaling Strategy (5 Cols) */}
          <div className="lg:col-span-5 space-y-4 bg-slate-950/80 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Custom Dimensions Heading */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                  Target Dimensions
                </span>
                <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                  {currentAspectRatioString} • {currentOrientation}
                </span>
              </div>

              {/* Width & Height Number Inputs */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-400 block">
                      Width (px)
                    </label>
                    <input
                      type="number"
                      min={MIN_RESOLUTION_DIMENSION}
                      max={MAX_RESOLUTION_DIMENSION}
                      step={10}
                      value={width || ''}
                      onChange={(e) => handleWidthChange(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm font-mono font-bold text-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-400 block">
                      Height (px)
                    </label>
                    <input
                      type="number"
                      min={MIN_HEIGHT_DIMENSION}
                      max={MAX_RESOLUTION_DIMENSION}
                      step={10}
                      value={height || ''}
                      onChange={(e) => handleHeightChange(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm font-mono font-bold text-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Lock Ratio & Swap Orientation Controls */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const nextLock = !lockRatio;
                      setLockRatio(nextLock);
                      if (nextLock && height > 0) {
                        setLockedRatioValue(width / height);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition ${
                      lockRatio
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {lockRatio ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    <span>{lockRatio ? 'Ratio Locked' : 'Free Ratio'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSwapOrientation}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                    title="Swap Width and Height (Landscape <-> Portrait)"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Flip Ratio</span>
                  </button>
                </div>

                {validationError && (
                  <div className="p-2.5 bg-rose-950/60 border border-rose-600/60 rounded-lg text-xs text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{validationError}</span>
                  </div>
                )}
              </div>

              {/* Element Scaling Strategy Selector */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                    Element Conversion Strategy
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {graphic.elements.length} elements to scale
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStrategy('FIT')}
                    className={`p-2.5 rounded-xl border text-left transition space-y-1 ${
                      strategy === 'FIT'
                        ? 'bg-emerald-950/50 border-emerald-500'
                        : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Scale to Fit</span>
                      {strategy === 'FIT' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Preserve proportions, center composition
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStrategy('CROP')}
                    className={`p-2.5 rounded-xl border text-left transition space-y-1 ${
                      strategy === 'CROP'
                        ? 'bg-emerald-950/50 border-emerald-500'
                        : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Crop / Fill</span>
                      {strategy === 'CROP' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Fill entire canvas, crop outer overflow
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStrategy('CENTER')}
                    className={`p-2.5 rounded-xl border text-left transition space-y-1 ${
                      strategy === 'CENTER'
                        ? 'bg-emerald-950/50 border-emerald-500'
                        : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Center 1:1</span>
                      {strategy === 'CENTER' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Keep exact pixel sizes, center layout
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStrategy('STRETCH')}
                    className={`p-2.5 rounded-xl border text-left transition space-y-1 ${
                      strategy === 'STRETCH'
                        ? 'bg-emerald-950/50 border-emerald-500'
                        : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Stretch</span>
                      {strategy === 'STRETCH' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Stretch X and Y independently
                    </p>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Apply Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={Boolean(validationError)}
                className={`px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition ${
                  validationError ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Check className="w-4 h-4" />
                <span>Apply Canvas Resolution</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
