import React, { useState } from 'react';
import {
  GraphicElement,
  GraphicElementType,
  GraphicPositionPreset,
  SportType,
  StudioGraphic,
} from '../../../types';
import { DynamicFieldsPicker } from './DynamicFieldsPicker';
import { DynamicImageBinding } from './DynamicImageBinding';
import { StudioColorPicker } from './StudioColorPicker';
import { ResolutionSelectorDropdown } from './ResolutionSelectorDropdown';
import {
  detectAspectRatio,
  detectOrientation,
  detectResolutionPreset,
  scaleGraphicElements,
} from '../../../utils/graphicResolutionUtils';
import {
  DYNAMIC_FIELDS,
  resolveLiveFieldValue,
} from '../../../constants/studioGraphicsConstants';
import {
  Type,
  Square,
  Image as ImageIcon,
  Move,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  AlignVerticalJustifyCenter,
  AlignStartVertical,
  AlignEndVertical,
  WrapText,
  Baseline,
  Scaling,
  Plus,
  Minus,
  Sparkles,
  Layers,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Palette,
  Sliders,
  Maximize2,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  Upload,
  Circle,
  Triangle,
  Star,
  Shield,
  ArrowRight,
  Sun,
  Wand2,
  Tv,
  Smartphone,
  Square as SquareIcon,
  Check,
  Bold,
  Italic,
  Underline,
  Heading,
  CircleDot,
  Flame,
} from 'lucide-react';

interface GraphicElementInspectorProps {
  element: GraphicElement | null;
  sport: SportType;
  canvasWidth: number;
  canvasHeight: number;
  graphic?: StudioGraphic;
  onApplyResolution?: (updated: StudioGraphic) => void;
  contextVariables?: Record<string, string>;
  resolvedImageUrl?: string;
  onUpdateElement: (updated: Partial<GraphicElement>) => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement: (id: string) => void;
  onDuplicateElementDirect?: (id: string) => void;
}

export const GraphicElementInspector: React.FC<GraphicElementInspectorProps> = ({
  element,
  sport,
  canvasWidth,
  canvasHeight,
  graphic,
  onApplyResolution,
  contextVariables,
  resolvedImageUrl,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
}) => {
  const [showDynamicPicker, setShowDynamicPicker] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<'CONTENT' | 'STYLE' | 'POSITION'>('CONTENT');

  // If no element is selected, show the Canvas & Resolution Settings Panel
  if (!element) {
    return (
      <div className="p-4 space-y-4 overflow-y-auto h-full text-xs">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Maximize2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white uppercase tracking-wider text-xs">
                CANVAS SETTINGS
              </h3>
              <p className="text-[10px] text-slate-400">Document resolution & scale</p>
            </div>
          </div>
          <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 rounded-md">
            {graphic?.aspectRatio || detectAspectRatio(canvasWidth, canvasHeight)}
          </span>
        </div>

        {/* Current Dimensions Card */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Active Resolution</span>
            <span className="text-[10px] font-mono text-emerald-400">
              {graphic?.orientation || detectOrientation(canvasWidth, canvasHeight)}
            </span>
          </div>

          <div className="text-xl font-mono font-black text-white flex items-baseline gap-2">
            <span>{canvasWidth} × {canvasHeight}</span>
            <span className="text-xs font-normal text-slate-400 font-sans">px</span>
          </div>

          {/* Quick Resolution Dropdown */}
          {graphic && onApplyResolution && (
            <div className="pt-2">
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5">
                Change Resolution
              </label>
              <ResolutionSelectorDropdown
                graphic={graphic}
                onApplyResolution={onApplyResolution}
                className="w-full"
              />
            </div>
          )}
        </div>

        {/* Quick Resolution Buttons */}
        {graphic && onApplyResolution && (
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
              Quick Presets
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: '1080p FHD (16:9)', w: 1920, h: 1080, icon: Tv },
                { label: '4K UHD (16:9)', w: 3840, h: 2160, icon: Tv },
                { label: '720p HD (16:9)', w: 1280, h: 720, icon: Tv },
                { label: 'Stories (9:16)', w: 1080, h: 1920, icon: Smartphone },
                { label: 'Square (1:1)', w: 1080, h: 1080, icon: SquareIcon },
                { label: 'Feed (4:5)', w: 1080, h: 1350, icon: SquareIcon },
              ].map((p) => {
                const isActive = canvasWidth === p.w && canvasHeight === p.h;
                const Icon = p.icon;
                return (
                  <button
                    key={`${p.w}x${p.h}`}
                    type="button"
                    onClick={() => {
                      if (isActive) return;
                      const scaledElements = scaleGraphicElements(
                        graphic.elements,
                        canvasWidth,
                        canvasHeight,
                        p.w,
                        p.h,
                        'FIT'
                      );
                      onApplyResolution({
                        ...graphic,
                        width: p.w,
                        height: p.h,
                        aspectRatio: detectAspectRatio(p.w, p.h),
                        resolutionPreset: detectResolutionPreset(p.w, p.h),
                        customResolution: { width: p.w, height: p.h },
                        orientation: detectOrientation(p.w, p.h),
                        canvas: {
                          ...graphic.canvas,
                          width: p.w,
                          height: p.h,
                        },
                        elements: scaledElements,
                        updatedAt: new Date().toISOString(),
                      });
                    }}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-1 ${
                      isActive
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Icon className="w-3.5 h-3.5 opacity-70" />
                      {isActive && <Check className="w-3 h-3 text-emerald-400" />}
                    </div>
                    <span className="text-[11px] leading-tight font-bold">{p.label}</span>
                    <span className="text-[9px] font-mono text-slate-500">{p.w} × {p.h}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tip Box */}
        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
          <p className="font-bold text-slate-300">💡 Pro Tip:</p>
          <p>
            Select any element on canvas or in the layers panel to inspect and customize typography, vector fills, gradients, borders, and image filters.
          </p>
        </div>
      </div>
    );
  }

  // Quick positioning helper
  const applyPositionPreset = (preset: GraphicPositionPreset) => {
    let newX = element.x;
    let newY = element.y;
    const pad = 40;

    switch (preset) {
      case 'TOP_LEFT':
        newX = pad;
        newY = pad;
        break;
      case 'TOP_CENTER':
        newX = Math.round((canvasWidth - element.width) / 2);
        newY = pad;
        break;
      case 'TOP_RIGHT':
        newX = canvasWidth - element.width - pad;
        newY = pad;
        break;
      case 'CENTER_LEFT':
        newX = pad;
        newY = Math.round((canvasHeight - element.height) / 2);
        break;
      case 'CENTER':
        newX = Math.round((canvasWidth - element.width) / 2);
        newY = Math.round((canvasHeight - element.height) / 2);
        break;
      case 'CENTER_RIGHT':
        newX = canvasWidth - element.width - pad;
        newY = Math.round((canvasHeight - element.height) / 2);
        break;
      case 'BOTTOM_LEFT':
        newX = pad;
        newY = canvasHeight - element.height - pad;
        break;
      case 'BOTTOM_CENTER':
        newX = Math.round((canvasWidth - element.width) / 2);
        newY = canvasHeight - element.height - pad;
        break;
      case 'BOTTOM_RIGHT':
        newX = canvasWidth - element.width - pad;
        newY = canvasHeight - element.height - pad;
        break;
    }

    onUpdateElement({ x: newX, y: newY });
  };

  const handleInsertTag = (tagKey: string) => {
    const currentText = element.text || '';
    onUpdateElement({ text: `${currentText} ${tagKey}` });
    setShowDynamicPicker(false);
  };

  const handleFontSizeChange = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num)) return;
    const clamped = Math.min(1000, Math.max(1, Number(num.toFixed(1))));
    onUpdateElement({ fontSize: clamped });
  };

  const handleStepFontSize = (delta: number) => {
    const current = Number(element?.fontSize) || 32;
    const next = Math.min(1000, Math.max(1, Number((current + delta).toFixed(1))));
    onUpdateElement({ fontSize: next });
  };

  const handleFitBoxToText = () => {
    if (!element || (element.type !== 'TEXT' && element.type !== 'LIVE_DATA')) return;
    const rawText = element.type === 'LIVE_DATA'
      ? resolveLiveFieldValue(element, contextVariables || {}, true)
      : element.text || 'Sample Text';
    const lines = rawText.split('\n');
    const maxLineLen = Math.max(...lines.map((l) => l.length), 4);
    const fs = element.fontSize || 32;
    const ls = element.letterSpacing || 0;
    const pad = element.textPadding !== undefined ? element.textPadding : 8;
    const lhRatio =
      typeof element.lineHeight === 'number' && element.lineHeight <= 4
        ? element.lineHeight
        : 1.25;
    const newW = Math.max(
      80,
      Math.round(maxLineLen * (fs * 0.65) + ls * maxLineLen + pad * 2 + 16)
    );
    const newH = Math.max(30, Math.round(lines.length * (fs * lhRatio) + pad * 2 + 8));

    // Keep visual center stable
    const oldCenterX = element.x + element.width / 2;
    const oldCenterY = element.y + element.height / 2;
    const newX = Math.round(oldCenterX - newW / 2);
    const newY = Math.round(oldCenterY - newH / 2);

    onUpdateElement({
      x: Math.max(0, newX),
      y: Math.max(0, newY),
      width: newW,
      height: newH,
    });
  };

  const isImageType =
    element.type === 'IMAGE' ||
    element.type === 'LOGO' ||
    element.type === 'PLAYER_PHOTO' ||
    element.type === 'TEAM_LOGO' ||
    element.type === 'TOURNAMENT_LOGO' ||
    element.type === 'SPONSOR_LOGO' ||
    element.type === 'CAPTAIN_PHOTO';

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 text-slate-200 overflow-hidden select-none">
      {/* Element Header Bar */}
      <div className="p-3 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
          <input
            type="text"
            value={element.name}
            onChange={(e) => onUpdateElement({ name: e.target.value })}
            className="bg-transparent font-bold text-sm text-white focus:outline-none border-b border-transparent focus:border-emerald-500 truncate"
          />
        </div>

        <div className="flex items-center gap-1">
          {/* Lock / Unlock */}
          <button
            type="button"
            onClick={() => onUpdateElement({ locked: !element.locked })}
            className={`p-1.5 rounded hover:bg-slate-800 transition ${
              element.locked ? 'text-amber-400' : 'text-slate-400'
            }`}
            title={element.locked ? 'Unlock Layer' : 'Lock Layer'}
          >
            {element.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>

          {/* Visibility Toggle */}
          <button
            type="button"
            onClick={() => onUpdateElement({ visible: !element.visible })}
            className={`p-1.5 rounded hover:bg-slate-800 transition ${
              !element.visible ? 'text-rose-400' : 'text-slate-400'
            }`}
            title={element.visible ? 'Hide Layer' : 'Show Layer'}
          >
            {element.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>

          {/* Duplicate Layer */}
          <button
            type="button"
            onClick={() => onDuplicateElement(element.id)}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
            title="Duplicate Layer (Ctrl+D)"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          {/* Delete Layer */}
          <button
            type="button"
            onClick={() => {
              if (!element.locked) onDeleteElement(element.id);
            }}
            disabled={element.locked}
            className={`p-1.5 rounded transition ${
              element.locked
                ? 'opacity-40 cursor-not-allowed text-slate-600'
                : 'hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 active:scale-95'
            }`}
            title={
              element.locked
                ? 'Element is locked (Unlock to delete)'
                : 'Delete Layer (Delete / Backspace)'
            }
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Navigation Tabs (Content/Data, Style/Vector, Position/Size) */}
      <div className="flex border-b border-slate-800 bg-slate-950/60 p-1 gap-1 text-xs">
        <button
          type="button"
          onClick={() => setActiveSection('CONTENT')}
          className={`flex-1 py-1.5 rounded font-semibold transition ${
            activeSection === 'CONTENT'
              ? 'bg-slate-800 text-emerald-400 shadow-sm font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {isImageType ? 'Image & Data' : element.type === 'LIVE_DATA' ? 'Live Data' : element.type === 'CRICKET_BALL_EVENT' ? 'Ball Event' : element.type === 'TEXT' ? 'Text & Data' : 'Shape Config'}
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('STYLE')}
          className={`flex-1 py-1.5 rounded font-semibold transition ${
            activeSection === 'STYLE'
              ? 'bg-slate-800 text-emerald-400 shadow-sm font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Style & Effects
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('POSITION')}
          className={`flex-1 py-1.5 rounded font-semibold transition ${
            activeSection === 'POSITION'
              ? 'bg-slate-800 text-emerald-400 shadow-sm font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Transform
        </button>
      </div>

      {/* Inspector Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
        {/* ========================================== */}
        {/* SECTION 1: CONTENT & DATA & SPECIFIC SHAPE */}
        {/* ========================================== */}
        {activeSection === 'CONTENT' && (
          <div className="space-y-4 text-xs">
            {/* LIVE_DATA ELEMENT Content & Binding Fields */}
            {element.type === 'LIVE_DATA' && (
              <div className="space-y-4">
                {/* Live Binding Header Card */}
                <div className="p-3 bg-gradient-to-br from-emerald-950/80 to-slate-950 border border-emerald-500/40 rounded-xl space-y-3 shadow-lg shadow-black/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                        Live Match Data Binding
                      </span>
                    </div>
                    <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-emerald-900/60 text-emerald-300 border border-emerald-600/50 rounded">
                      {sport}
                    </span>
                  </div>

                  {/* Primary Variable Selector */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">
                        Data Variable Key
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowDynamicPicker(!showDynamicPicker)}
                        className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold transition"
                      >
                        <Sparkles className="w-3 h-3" />
                        Browse Catalog
                      </button>
                    </div>

                    <div className="relative">
                      <select
                        value={element.liveDataField || element.text || '{{SCORE}}'}
                        onChange={(e) => {
                          const val = e.target.value;
                          onUpdateElement({
                            liveDataField: val,
                            text: val,
                            name: `Live: ${val.replace(/[{}]/g, '')}`,
                          });
                        }}
                        className="w-full px-2.5 py-2 bg-slate-900 border border-emerald-500/50 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-emerald-400 appearance-none font-bold"
                      >
                        <optgroup label="Popular Variables">
                          <option value="{{SCORE}}">Score / Total (e.g. 214/4)</option>
                          <option value="{{OVERS}}">Overs (e.g. 18.2)</option>
                          <option value="{{RUN_RATE}}">Current Run Rate (e.g. 8.42)</option>
                          <option value="{{REQ_RUN_RATE}}">Required Run Rate (e.g. 9.15)</option>
                          <option value="{{TARGET}}">Target (e.g. 195)</option>
                          <option value="{{MATCH_CLOCK}}">Match Clock (e.g. 78:24)</option>
                          <option value="{{STRIKER}}">Active Striker (e.g. V. Kohli 74*)</option>
                          <option value="{{NON_STRIKER}}">Non-Striker (e.g. R. Sharma 45)</option>
                          <option value="{{CURRENT_BOWLER}}">Active Bowler (e.g. J. Bumrah 2/24)</option>
                          <option value="{{TEAM_A}}">Team A Name</option>
                          <option value="{{TEAM_B}}">Team B Name</option>
                          <option value="{{MATCH_STATUS}}">Match Status / Chase</option>
                        </optgroup>
                        <optgroup label="All Supported Live Variables">
                          {DYNAMIC_FIELDS.map((df) => (
                            <option key={df.key} value={df.key}>
                              {df.key} - {df.label} ({df.category})
                            </option>
                          ))}
                        </optgroup>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-emerald-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {/* Manual tag or formula input */}
                    <div className="pt-1">
                      <span className="text-[9px] text-slate-400 block mb-0.5">
                        Or enter custom tag / composite formula:
                      </span>
                      <input
                        type="text"
                        value={element.liveDataField || element.text || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          onUpdateElement({ liveDataField: val, text: val });
                        }}
                        placeholder="{{SCORE}} ({{OVERS}})"
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {showDynamicPicker && (
                    <div className="border border-slate-800 rounded-xl overflow-hidden shadow-xl bg-slate-950 p-2 mt-2">
                      <DynamicFieldsPicker
                        sport={sport}
                        onSelectField={(key) => {
                          onUpdateElement({
                            liveDataField: key,
                            text: key,
                            name: `Live: ${key.replace(/[{}]/g, '')}`,
                          });
                          setShowDynamicPicker(false);
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Formatted Output Simulator Box */}
                <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
                    <span>Live Output Preview</span>
                    <span className="text-emerald-400 font-mono">SIMULATED</span>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-emerald-300 font-black truncate">
                      {resolveLiveFieldValue(element, contextVariables || {}, true)}
                    </span>
                    <span className="text-[9px] font-mono text-slate-500 shrink-0">
                      {element.liveDataField || element.text || '{{SCORE}}'}
                    </span>
                  </div>
                </div>

                {/* Prefix, Suffix & Fallback Configuration */}
                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
                  <span className="text-slate-300 font-bold uppercase tracking-wider text-[11px] block">
                    Text Framing & Fallback
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Prefix Text</span>
                      <input
                        type="text"
                        value={element.liveDataPrefix || ''}
                        onChange={(e) => onUpdateElement({ liveDataPrefix: e.target.value })}
                        placeholder="e.g. SCORE: "
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Suffix Text</span>
                      <input
                        type="text"
                        value={element.liveDataSuffix || ''}
                        onChange={(e) => onUpdateElement({ liveDataSuffix: e.target.value })}
                        placeholder="e.g.  Ovs,  PTS,  *"
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">
                      Fallback When Empty / Null
                    </span>
                    <input
                      type="text"
                      value={element.liveDataFallback || ''}
                      onChange={(e) => onUpdateElement({ liveDataFallback: e.target.value })}
                      placeholder="e.g. - or 00:00 or TBD"
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Live Data Formatter & Player Name Format */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Number / Stat Format</span>
                      <select
                        value={element.liveDataFormatter || 'none'}
                        onChange={(e) => onUpdateElement({ liveDataFormatter: e.target.value as any })}
                        className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs font-mono"
                      >
                        <option value="none">None / Raw</option>
                        <option value="integer">Integer (e.g. 76)</option>
                        <option value="decimal_1">1 Decimal (e.g. 180.9)</option>
                        <option value="decimal_2">2 Decimals (e.g. 8.00)</option>
                        <option value="strike_rate">Strike Rate (e.g. 180.95)</option>
                        <option value="overs_format">Overs Format (e.g. 3.3 ov)</option>
                        <option value="percentage">Percentage (e.g. 48.5%)</option>
                        <option value="currency">Currency ($100k)</option>
                      </select>
                    </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block mb-1">Player Name Format</span>
                        <select
                          value={element.playerNameFormat || 'none'}
                          onChange={(e) => onUpdateElement({ playerNameFormat: e.target.value as any })}
                          className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs font-mono"
                        >
                          <option value="none">As Is / Default</option>
                          <option value="full">Full Name (Virat Kohli)</option>
                          <option value="first_name">First Name Only (Virat)</option>
                          <option value="short">Initial + Surname (V. Kohli)</option>
                          <option value="initial_surname">Initial + Surname (V. Kohli)</option>
                          <option value="surname">Surname Only (Kohli)</option>
                        </select>
                      </div>
                  </div>

                  {/* Text Case Transform */}
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">
                      Text Transform / Capitalization
                    </span>
                    <div className="grid grid-cols-4 gap-1">
                      {(
                        [
                          ['none', 'None'],
                          ['uppercase', 'UPPER'],
                          ['lowercase', 'lower'],
                          ['capitalize', 'Capital'],
                        ] as const
                      ).map(([tf, label]) => (
                        <button
                          key={tf}
                          type="button"
                          onClick={() => onUpdateElement({ liveDataTransform: tf as any, textTransform: tf as any })}
                          className={`py-1 rounded text-center text-[10px] font-bold transition ${
                            (element.liveDataTransform || element.textTransform || 'none') === tf
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Conditional Visibility Engine */}
                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-amber-400" />
                      Conditional Visibility Rule
                    </span>
                    <input
                      type="checkbox"
                      checked={Boolean(element.conditionalVisibility?.enabled)}
                      onChange={(e) =>
                        onUpdateElement({
                          conditionalVisibility: {
                            enabled: e.target.checked,
                            condition: element.conditionalVisibility?.condition || 'NOT_EMPTY',
                            targetValue: element.conditionalVisibility?.targetValue || '',
                          },
                        })
                      }
                      className="accent-emerald-500"
                    />
                  </div>

                  {element.conditionalVisibility?.enabled && (
                    <div className="space-y-2 pt-1">
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-1">Visibility Condition</span>
                        <select
                          value={element.conditionalVisibility.condition || 'NOT_EMPTY'}
                          onChange={(e) =>
                            onUpdateElement({
                              conditionalVisibility: {
                                ...element.conditionalVisibility!,
                                condition: e.target.value as any,
                              },
                            })
                          }
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs"
                        >
                          <optgroup label="Value-based Rules">
                            <option value="NOT_EMPTY">Show only if Value is NOT EMPTY</option>
                            <option value="EQUALS">Show if Value EQUALS target</option>
                            <option value="NOT_EQUALS">Show if Value DOES NOT EQUAL target</option>
                            <option value="GREATER_THAN">Show if Numeric Value &gt; target</option>
                            <option value="LESS_THAN">Show if Numeric Value &lt; target</option>
                            <option value="SHOW">Always SHOW Layer</option>
                            <option value="HIDE">Always HIDE Layer</option>
                            <option value="AUTO">Auto (Hide if empty or dash)</option>
                          </optgroup>
                          <optgroup label="Cricket Match State & Live Delivery">
                            <option value="STRIKER_EXISTS">Show when Striker is on Crease</option>
                            <option value="NON_STRIKER_EXISTS">Show when Non-Striker is on Crease</option>
                            <option value="BOWLER_EXISTS">Show when Bowler is Active</option>
                            <option value="BALL_EVENT_EXISTS">Show when Ball Event is Present</option>
                            <option value="WICKET">Show on Wicket Delivery / Dismissal</option>
                            <option value="FOUR">Show on FOUR (Boundary)</option>
                            <option value="SIX">Show on SIX (Maximum)</option>
                            <option value="EXTRA">Show on Extra (Wide/No-ball)</option>
                            <option value="INNINGS_ACTIVE">Show during Active Innings</option>
                            <option value="INNINGS_2">Show during 2nd Innings / Chase</option>
                            <option value="CHASE_ACTIVE">Show when Chase is in progress</option>
                            <option value="PARTNERSHIP_ACTIVE">Show when Partnership is Active</option>
                            <option value="MILESTONE_ACTIVE">Show when 50/100 Milestone occurs</option>
                          </optgroup>
                          <optgroup label="Match Lifecycle & Clock Rules">
                            <option value="MATCH_LIVE">Show only when Match is Live</option>
                            <option value="MATCH_COMPLETED">Show only when Match is Completed</option>
                            <option value="CLOCK_RUNNING">Show only when Game Clock is Running</option>
                          </optgroup>
                        </select>
                      </div>

                      {(element.conditionalVisibility.condition === 'EQUALS' ||
                        element.conditionalVisibility.condition === 'NOT_EQUALS' ||
                        element.conditionalVisibility.condition === 'GREATER_THAN' ||
                        element.conditionalVisibility.condition === 'LESS_THAN') && (
                        <div>
                          <span className="text-[10px] text-slate-400 block mb-1">Target Value to Match</span>
                          <input
                            type="text"
                            value={element.conditionalVisibility.targetValue || ''}
                            onChange={(e) =>
                              onUpdateElement({
                                conditionalVisibility: {
                                  ...element.conditionalVisibility!,
                                  targetValue: e.target.value,
                                },
                              })
                            }
                            placeholder="e.g. OUT, 50, 2nd Innings, 0"
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Quick Font Size & Box Controls for LIVE_DATA */}
                <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5 text-emerald-400" />
                      Quick Font Size
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {element.fontSize || 32}px
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleStepFontSize(-2)}
                      className="p-1.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition"
                      title="Decrease font size (-2px)"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      step="0.5"
                      value={element.fontSize || 32}
                      onChange={(e) => handleFontSizeChange(e.target.value)}
                      className="w-20 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-center font-bold text-xs focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleStepFontSize(2)}
                      className="p-1.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition"
                      title="Increase font size (+2px)"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={handleFitBoxToText}
                      className="ml-auto px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-emerald-400 rounded-lg text-[10px] font-bold flex items-center gap-1 transition"
                      title="Fit bounding box snuggly to resolved live text"
                    >
                      <Scaling className="w-3 h-3" />
                      Fit Box
                    </button>
                  </div>

                  {/* Quick Presets */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {[16, 24, 32, 48, 64, 80, 100, 120].map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => handleFontSizeChange(sz)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold transition ${
                          Number(element.fontSize) === sz
                            ? 'bg-emerald-500 text-slate-950 font-bold'
                            : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* CRICKET BALL EVENT ELEMENT Content Fields */}
            {element.type === 'CRICKET_BALL_EVENT' && (
              <div className="space-y-4">
                {/* Header Info Card */}
                <div className="p-3 bg-gradient-to-br from-rose-950/80 via-slate-950 to-amber-950/80 border border-rose-500/40 rounded-xl space-y-3 shadow-lg shadow-black/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <CircleDot className="w-4 h-4 text-rose-400 animate-pulse" />
                      <span className="text-[11px] font-black text-rose-300 uppercase tracking-wider">
                        Cricket Ball Event Engine
                      </span>
                    </div>
                    <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-rose-950/80 text-rose-300 border border-rose-500/40 rounded">
                      Live Synced
                    </span>
                  </div>

                  {/* Display Mode */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-300 font-bold uppercase tracking-wider block">
                      Display Mode
                    </label>
                    <select
                      value={element.ballEventConfig?.displayMode || 'BADGE'}
                      onChange={(e) =>
                        onUpdateElement({
                          ballEventConfig: {
                            ...element.ballEventConfig,
                            displayMode: e.target.value as any,
                          },
                        })
                      }
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-medium text-xs focus:outline-none focus:border-rose-500"
                    >
                      <option value="BADGE">Full Broadcast Badge (Orb + Over + Striker)</option>
                      <option value="RECENT_STRIP">Recent Deliveries Strip (Over Summary)</option>
                      <option value="LETTER">Single Delivery Letter Orb (Circle)</option>
                      <option value="COMPACT">Compact Scorebug Pill</option>
                      <option value="TEXT">Large Typography Banner (Alert)</option>
                      <option value="CUSTOM">Custom Layer Layout</option>
                    </select>
                  </div>

                  {/* Shape & Color Theme */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Badge Shape</span>
                      <select
                        value={element.ballEventConfig?.badgeShape || 'ROUNDED'}
                        onChange={(e) =>
                          onUpdateElement({
                            ballEventConfig: {
                              ...element.ballEventConfig,
                              badgeShape: e.target.value as any,
                            },
                          })
                        }
                        className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs font-mono"
                      >
                        <option value="ROUNDED">Rounded Box</option>
                        <option value="CIRCLE">Circle Orb</option>
                        <option value="PILL">Stadium Pill</option>
                        <option value="SQUARE">Square Box</option>
                        <option value="HEXAGON">Hexagon Badge</option>
                      </select>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Color Palette</span>
                      <select
                        value={element.ballEventConfig?.colorPreset || 'DYNAMIC_COLOR'}
                        onChange={(e) =>
                          onUpdateElement({
                            ballEventConfig: {
                              ...element.ballEventConfig,
                              colorPreset: e.target.value as any,
                            },
                          })
                        }
                        className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs font-mono"
                      >
                        <option value="DYNAMIC_COLOR">Dynamic by Outcome (4/6/W/WD)</option>
                        <option value="EMERALD_NEON">Emerald Neon</option>
                        <option value="CYAN_ELECTRIC">Electric Cyan</option>
                        <option value="SUNSET_ORANGE">Sunset Orange</option>
                        <option value="DARK_SLATE">Dark Slate Pro</option>
                        <option value="CUSTOM">Custom Colors</option>
                      </select>
                    </div>
                  </div>

                  {/* Animation Preset */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-300 font-bold uppercase tracking-wider block">
                      Ball Change Animation
                    </label>
                    <select
                      value={element.ballEventConfig?.animationPreset || 'POP'}
                      onChange={(e) =>
                        onUpdateElement({
                          ballEventConfig: {
                            ...element.ballEventConfig,
                            animationPreset: e.target.value as any,
                          },
                        })
                      }
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-medium text-xs focus:outline-none focus:border-rose-500"
                    >
                      <option value="POP">Pop & Scale In (Recommended)</option>
                      <option value="BOUNCE">Bounce In</option>
                      <option value="SLIDE">Slide In</option>
                      <option value="GLOW">Neon Glow Flash</option>
                      <option value="PULSE">Pulse Impact</option>
                      <option value="FADE">Smooth Fade</option>
                      <option value="NONE">Instant (No Animation)</option>
                    </select>
                  </div>
                </div>

                {/* Studio Live Test Simulator Controls */}
                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                      Studio Test Simulator
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Live Preview Value</span>
                  </div>

                  {/* Quick Outcome buttons */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { key: '0', label: '0 • Dot', bg: 'bg-slate-800 hover:bg-slate-700' },
                      { key: '1', label: '1 Run', bg: 'bg-slate-800 hover:bg-slate-700' },
                      { key: '4', label: '4 • Four', bg: 'bg-emerald-800 hover:bg-emerald-700' },
                      { key: '6', label: '6 • Six', bg: 'bg-purple-800 hover:bg-purple-700' },
                      { key: 'W', label: 'W • Out', bg: 'bg-rose-800 hover:bg-rose-700' },
                      { key: 'WD', label: 'Wd • Wide', bg: 'bg-amber-800 hover:bg-amber-700' },
                      { key: 'NB', label: 'NB • No-Ball', bg: 'bg-orange-800 hover:bg-orange-700' },
                      { key: 'B', label: 'Bye', bg: 'bg-slate-800 hover:bg-slate-700' },
                    ].map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() =>
                          onUpdateElement({
                            ballEventConfig: {
                              ...element.ballEventConfig,
                              sampleEvent: item.key as any,
                            },
                          })
                        }
                        className={`py-1.5 px-1 rounded-lg text-center font-bold text-[10px] text-white transition ${item.bg} ${
                          element.ballEventConfig?.sampleEvent === item.key
                            ? 'ring-2 ring-white shadow-lg'
                            : 'opacity-80'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  {/* Dismissal Type Selector if Wicket */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Sample Dismissal</span>
                      <select
                        value={element.ballEventConfig?.sampleDismissal || 'NONE'}
                        onChange={(e) =>
                          onUpdateElement({
                            ballEventConfig: {
                              ...element.ballEventConfig,
                              sampleDismissal: e.target.value as any,
                            },
                          })
                        }
                        className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs font-mono"
                      >
                        <option value="NONE">None</option>
                        <option value="BOWLED">Bowled</option>
                        <option value="CAUGHT">Caught</option>
                        <option value="LBW">LBW</option>
                        <option value="RUN_OUT">Run Out</option>
                        <option value="STUMPED">Stumped</option>
                      </select>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Recent Balls Count</span>
                      <select
                        value={element.ballEventConfig?.recentBallsCount || 6}
                        onChange={(e) =>
                          onUpdateElement({
                            ballEventConfig: {
                              ...element.ballEventConfig,
                              recentBallsCount: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs font-mono"
                      >
                        <option value={4}>4 Deliveries</option>
                        <option value={6}>6 Deliveries (1 Over)</option>
                        <option value={8}>8 Deliveries</option>
                        <option value={10}>10 Deliveries</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Layer Content Toggles */}
                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2.5">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    Information Toggles
                  </span>

                  <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                    <span>Show Over Number (e.g. Over 18.3)</span>
                    <input
                      type="checkbox"
                      checked={element.ballEventConfig?.showOverNumber !== false}
                      onChange={(e) =>
                        onUpdateElement({
                          ballEventConfig: {
                            ...element.ballEventConfig,
                            showOverNumber: e.target.checked,
                          },
                        })
                      }
                      className="w-4 h-4 rounded text-rose-500 bg-slate-900 border-slate-700 focus:ring-rose-500"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                    <span>Show Striker Batsman Name</span>
                    <input
                      type="checkbox"
                      checked={element.ballEventConfig?.showStriker !== false}
                      onChange={(e) =>
                        onUpdateElement({
                          ballEventConfig: {
                            ...element.ballEventConfig,
                            showStriker: e.target.checked,
                          },
                        })
                      }
                      className="w-4 h-4 rounded text-rose-500 bg-slate-900 border-slate-700 focus:ring-rose-500"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                    <span>Show Dismissal Details on Wicket</span>
                    <input
                      type="checkbox"
                      checked={element.ballEventConfig?.showDismissal !== false}
                      onChange={(e) =>
                        onUpdateElement({
                          ballEventConfig: {
                            ...element.ballEventConfig,
                            showDismissal: e.target.checked,
                          },
                        })
                      }
                      className="w-4 h-4 rounded text-rose-500 bg-slate-900 border-slate-700 focus:ring-rose-500"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                    <span>Show Bowler Name</span>
                    <input
                      type="checkbox"
                      checked={Boolean(element.ballEventConfig?.showBowler)}
                      onChange={(e) =>
                        onUpdateElement({
                          ballEventConfig: {
                            ...element.ballEventConfig,
                            showBowler: e.target.checked,
                          },
                        })
                      }
                      className="w-4 h-4 rounded text-rose-500 bg-slate-900 border-slate-700 focus:ring-rose-500"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                    <span>Show Extras Breakdown (Wd, NB, Leg-Byes)</span>
                    <input
                      type="checkbox"
                      checked={element.ballEventConfig?.showExtras !== false}
                      onChange={(e) =>
                        onUpdateElement({
                          ballEventConfig: {
                            ...element.ballEventConfig,
                            showExtras: e.target.checked,
                          },
                        })
                      }
                      className="w-4 h-4 rounded text-rose-500 bg-slate-900 border-slate-700 focus:ring-rose-500"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* TEXT ELEMENT Content Fields */}
            {element.type === 'TEXT' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                    Text Content
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowDynamicPicker(!showDynamicPicker)}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold"
                  >
                    <Sparkles className="w-3 h-3" />
                    Insert Live Data Tag
                  </button>
                </div>

                <textarea
                  rows={3}
                  value={element.text || ''}
                  onChange={(e) => onUpdateElement({ text: e.target.value })}
                  placeholder="Enter text or dynamic variable tag..."
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-emerald-500 resize-none"
                />

                {showDynamicPicker && (
                  <div className="border border-slate-800 rounded-xl overflow-hidden shadow-xl bg-slate-950 p-2">
                    <DynamicFieldsPicker sport={sport} onSelectField={handleInsertTag} />
                  </div>
                )}

                {/* Quick Font Size & Box Controls */}
                <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5 text-emerald-400" />
                      Quick Font Size
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {element.fontSize || 32}px
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleStepFontSize(-2)}
                      className="p-1.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition"
                      title="Decrease font size (-2px)"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      step="0.5"
                      value={element.fontSize || 32}
                      onChange={(e) => handleFontSizeChange(e.target.value)}
                      className="w-20 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-center font-bold text-xs focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleStepFontSize(2)}
                      className="p-1.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition"
                      title="Increase font size (+2px)"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={handleFitBoxToText}
                      className="ml-auto px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-emerald-400 rounded-lg text-[10px] font-bold flex items-center gap-1 transition"
                      title="Fit bounding box snuggly to text"
                    >
                      <Scaling className="w-3 h-3" />
                      Fit Box
                    </button>
                  </div>

                  {/* Quick Presets */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {[16, 24, 32, 48, 64, 80, 100, 120].map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => handleFontSizeChange(sz)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold transition ${
                          Number(element.fontSize) === sz
                            ? 'bg-emerald-500 text-slate-950 font-bold'
                            : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STAR SPECIFIC CONTROLS */}
            {element.type === 'STAR' && (
              <div className="space-y-3 p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                    Star Points ({element.starPoints || element.starPointsCount || 5})
                  </label>
                  <span className="text-emerald-400 font-mono">
                    {element.starPoints || element.starPointsCount || 5} pts
                  </span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="12"
                  step="1"
                  value={element.starPoints || element.starPointsCount || 5}
                  onChange={(e) =>
                    onUpdateElement({
                      starPoints: parseInt(e.target.value),
                      starPointsCount: parseInt(e.target.value),
                    })
                  }
                  className="w-full accent-emerald-500"
                />

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <label className="text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                    Inner Radius Depth
                  </label>
                  <span className="text-emerald-400 font-mono">
                    {Math.round((element.innerRadiusRatio || 0.45) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.15"
                  max="0.85"
                  step="0.05"
                  value={element.innerRadiusRatio || 0.45}
                  onChange={(e) => onUpdateElement({ innerRadiusRatio: parseFloat(e.target.value) })}
                  className="w-full accent-emerald-500"
                />
              </div>
            )}

            {/* POLYGON SPECIFIC CONTROLS */}
            {element.type === 'POLYGON' && (
              <div className="space-y-3 p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                    Polygon Sides ({element.sidesCount || 6})
                  </label>
                  <span className="text-emerald-400 font-mono">
                    {element.sidesCount === 3
                      ? 'Triangle (3)'
                      : element.sidesCount === 4
                      ? 'Diamond/Square (4)'
                      : element.sidesCount === 5
                      ? 'Pentagon (5)'
                      : element.sidesCount === 6
                      ? 'Hexagon (6)'
                      : element.sidesCount === 8
                      ? 'Octagon (8)'
                      : `${element.sidesCount || 6}-gon`}
                  </span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="12"
                  step="1"
                  value={element.sidesCount || 6}
                  onChange={(e) => onUpdateElement({ sidesCount: parseInt(e.target.value) })}
                  className="w-full accent-emerald-500"
                />
              </div>
            )}

            {/* BADGE SPECIFIC CONTROLS */}
            {element.type === 'BADGE' && (
              <div className="space-y-3 p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                <label className="text-slate-300 font-bold uppercase tracking-wider text-[11px] block">
                  Badge Archetype
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      ['SHIELD', '🛡️ Shield'],
                      ['ROSETTE', '🏵️ Rosette (12-Pt)'],
                      ['HEXAGON', '⬡ Hex Badge'],
                      ['CHEVRON', '🔰 Chevron'],
                      ['RIBBON', '🎀 Ribbon Banner'],
                      ['PLAQUE', '📜 Plaque'],
                      ['OCTAGON', '🛑 Octagon Badge'],
                    ] as const
                  ).map(([styleKey, label]) => (
                    <button
                      key={styleKey}
                      type="button"
                      onClick={() => onUpdateElement({ badgeStyle: styleKey as any })}
                      className={`p-2 rounded-lg text-left text-[11px] font-bold transition ${
                        (element.badgeStyle || 'SHIELD') === styleKey
                          ? 'bg-emerald-500 text-slate-950 shadow'
                          : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ARROW SPECIFIC CONTROLS */}
            {element.type === 'ARROW' && (
              <div className="space-y-3 p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                <label className="text-slate-300 font-bold uppercase tracking-wider text-[11px] block">
                  Arrow Direction & Head Style
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {(
                    [
                      ['RIGHT', '→ Right'],
                      ['LEFT', '← Left'],
                      ['UP', '↑ Up'],
                      ['DOWN', '↓ Down'],
                      ['CHEVRON_RIGHT', '» Chevron'],
                      ['DOUBLE_HEAD', '↔ Double'],
                    ] as const
                  ).map(([dir, label]) => (
                    <button
                      key={dir}
                      type="button"
                      onClick={() => onUpdateElement({ arrowDirection: dir as any })}
                      className={`py-1.5 px-2 rounded text-center text-[10px] font-bold transition ${
                        (element.arrowDirection || 'RIGHT') === dir
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400">Head Size</span>
                    <input
                      type="range"
                      min="20"
                      max="60"
                      value={element.arrowHeadSize || 35}
                      onChange={(e) =>
                        onUpdateElement({ arrowHeadSize: parseInt(e.target.value) })
                      }
                      className="w-full accent-emerald-500"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Stem Thickness</span>
                    <input
                      type="range"
                      min="15"
                      max="70"
                      value={element.arrowStemWidth || 40}
                      onChange={(e) =>
                        onUpdateElement({ arrowStemWidth: parseInt(e.target.value) })
                      }
                      className="w-full accent-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* IMAGE / MEDIA BOX ADVANCED CONTROLS */}
            {isImageType && (
              <div className="space-y-4">
                {/* Dynamic Image Binding & Source Controls */}
                <DynamicImageBinding
                  element={element}
                  sport={sport}
                  resolvedImageUrl={resolvedImageUrl}
                  contextVariables={contextVariables}
                  onChange={onUpdateElement}
                />

                {/* Crop & Mask Shape */}
                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
                  <label className="text-slate-300 font-bold uppercase tracking-wider text-[11px] block">
                    Crop & Mask Shape
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        ['none', 'Square (None)'],
                        ['circle', 'Circle (50%)'],
                        ['pill', 'Pill Badge'],
                        ['shield', 'Shield Mask'],
                        ['hexagon', 'Hexagon'],
                        ['star', 'Star Mask'],
                        ['squircle', 'Squircle'],
                        ['diagonal_cut', 'Angle Cut'],
                        ['triangle', 'Triangle'],
                      ] as const
                    ).map(([mask, label]) => (
                      <button
                        key={mask}
                        type="button"
                        onClick={() => onUpdateElement({ maskShape: mask as any })}
                        className={`p-1.5 rounded text-center text-[10px] font-bold truncate transition ${
                          (element.maskShape || 'none') === mask
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-900 text-slate-400 hover:text-white'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Image Fit & Aspect Ratio */}
                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
                  <label className="text-slate-300 font-bold uppercase tracking-wider text-[11px] block">
                    Image Fit Mode
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {(['cover', 'contain', 'fill', 'scale-down'] as const).map((fit) => (
                      <button
                        key={fit}
                        type="button"
                        onClick={() => onUpdateElement({ imageFit: fit })}
                        className={`py-1 rounded text-center capitalize text-[10px] transition ${
                          (element.imageFit || 'cover') === fit
                            ? 'bg-emerald-500 text-slate-950 font-bold'
                            : 'bg-slate-900 text-slate-400 hover:text-white'
                        }`}
                      >
                        {fit}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Visual Image Filters (Grayscale, Saturation, Brightness, Contrast, Blur, Invert, Hue Rotate) */}
                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1">
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      Color Grading & Filters
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateElement({
                          imageFilters: {
                            brightness: 100,
                            contrast: 100,
                            saturation: 100,
                            grayscale: 0,
                            sepia: 0,
                            blur: 0,
                            invert: 0,
                            hueRotate: 0,
                          },
                        })
                      }
                      className="text-[10px] text-rose-400 hover:text-rose-300 font-bold underline"
                    >
                      Reset
                    </button>
                  </div>

                  {/* Filter Presets */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      Grading Presets
                    </span>
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        {
                          name: 'Normal',
                          f: { brightness: 100, contrast: 100, saturation: 100, grayscale: 0, sepia: 0, blur: 0, invert: 0, hueRotate: 0 },
                        },
                        {
                          name: 'Vivid Sport',
                          f: { brightness: 108, contrast: 120, saturation: 140, grayscale: 0, sepia: 0, blur: 0, invert: 0, hueRotate: 0 },
                        },
                        {
                          name: 'Punchy',
                          f: { brightness: 115, contrast: 130, saturation: 120, grayscale: 0, sepia: 0, blur: 0, invert: 0, hueRotate: 0 },
                        },
                        {
                          name: 'B&W Sharp',
                          f: { brightness: 105, contrast: 140, saturation: 0, grayscale: 100, sepia: 0, blur: 0, invert: 0, hueRotate: 0 },
                        },
                        {
                          name: 'Warm Gold',
                          f: { brightness: 105, contrast: 110, saturation: 120, grayscale: 0, sepia: 45, blur: 0, invert: 0, hueRotate: 15 },
                        },
                        {
                          name: 'Cool Broadcast',
                          f: { brightness: 100, contrast: 115, saturation: 110, grayscale: 0, sepia: 0, blur: 0, invert: 0, hueRotate: 190 },
                        },
                        {
                          name: 'Cyberpunk',
                          f: { brightness: 110, contrast: 135, saturation: 160, grayscale: 0, sepia: 0, blur: 0, invert: 0, hueRotate: 280 },
                        },
                        {
                          name: 'Soft Mood',
                          f: { brightness: 95, contrast: 90, saturation: 85, grayscale: 0, sepia: 15, blur: 1, invert: 0, hueRotate: 0 },
                        },
                      ].map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => onUpdateElement({ imageFilters: { ...element.imageFilters, ...preset.f } })}
                          className="py-1 px-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500 rounded text-[10px] font-bold text-slate-300 hover:text-white truncate transition"
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Brightness */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Brightness</span>
                      <span className="font-mono text-emerald-400">{element.imageFilters?.brightness ?? 100}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="200"
                      value={element.imageFilters?.brightness ?? 100}
                      onChange={(e) =>
                        onUpdateElement({
                          imageFilters: {
                            ...element.imageFilters,
                            brightness: parseInt(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-emerald-500"
                    />
                  </div>

                  {/* Contrast */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Contrast</span>
                      <span className="font-mono text-emerald-400">{element.imageFilters?.contrast ?? 100}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="200"
                      value={element.imageFilters?.contrast ?? 100}
                      onChange={(e) =>
                        onUpdateElement({
                          imageFilters: {
                            ...element.imageFilters,
                            contrast: parseInt(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-emerald-500"
                    />
                  </div>

                  {/* Saturation */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Saturation</span>
                      <span className="font-mono text-emerald-400">{element.imageFilters?.saturation ?? 100}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={element.imageFilters?.saturation ?? 100}
                      onChange={(e) =>
                        onUpdateElement({
                          imageFilters: {
                            ...element.imageFilters,
                            saturation: parseInt(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-emerald-500"
                    />
                  </div>

                  {/* Grayscale */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Grayscale (B&W)</span>
                      <span className="font-mono text-emerald-400">{element.imageFilters?.grayscale || 0}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={element.imageFilters?.grayscale || 0}
                      onChange={(e) =>
                        onUpdateElement({
                          imageFilters: {
                            ...element.imageFilters,
                            grayscale: parseInt(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-emerald-500"
                    />
                  </div>

                  {/* Sepia */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Sepia (Vintage)</span>
                      <span className="font-mono text-emerald-400">{element.imageFilters?.sepia || 0}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={element.imageFilters?.sepia || 0}
                      onChange={(e) =>
                        onUpdateElement({
                          imageFilters: {
                            ...element.imageFilters,
                            sepia: parseInt(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-emerald-500"
                    />
                  </div>

                  {/* Blur */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Blur</span>
                      <span className="font-mono text-emerald-400">{element.imageFilters?.blur || 0}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={element.imageFilters?.blur || 0}
                      onChange={(e) =>
                        onUpdateElement({
                          imageFilters: {
                            ...element.imageFilters,
                            blur: parseInt(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-emerald-500"
                    />
                  </div>

                  {/* Invert */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Invert</span>
                      <span className="font-mono text-emerald-400">{element.imageFilters?.invert || 0}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={element.imageFilters?.invert || 0}
                      onChange={(e) =>
                        onUpdateElement({
                          imageFilters: {
                            ...element.imageFilters,
                            invert: parseInt(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-emerald-500"
                    />
                  </div>

                  {/* Hue Rotate */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Hue Rotate</span>
                      <span className="font-mono text-emerald-400">{element.imageFilters?.hueRotate || 0}°</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={element.imageFilters?.hueRotate || 0}
                      onChange={(e) =>
                        onUpdateElement({
                          imageFilters: {
                            ...element.imageFilters,
                            hueRotate: parseInt(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* General Layer Opacity Slider */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                  Master Opacity
                </span>
                <span className="text-emerald-400 font-mono">
                  {Math.round((element.opacity !== undefined ? element.opacity : 1) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={element.opacity !== undefined ? element.opacity : 1}
                onChange={(e) => onUpdateElement({ opacity: parseFloat(e.target.value) })}
                className="w-full accent-emerald-500"
              />
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* SECTION 2: STYLING & VECTOR / EFFECTS      */}
        {/* ========================================== */}
        {activeSection === 'STYLE' && (
          <div className="space-y-4 text-xs">
            {/* TEXT & LIVE_DATA TYPOGRAPHY SPECIFIC CONTROLS */}
            {(element.type === 'TEXT' || element.type === 'LIVE_DATA') && (
              <div className="space-y-4">
                {/* DEDICATED FONT SIZE & AUTO-FIT CONTROLS */}
                <div className="p-3 bg-slate-950/90 border border-emerald-500/30 rounded-xl space-y-3 shadow-lg shadow-black/20">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-200 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5 text-emerald-400" />
                      Font Size
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs rounded border border-emerald-500/30">
                        {element.fontSize || 32} px
                      </span>
                    </div>
                  </div>

                  {/* Stepper + Manual Input */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleStepFontSize(-1)}
                      className="p-2 bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition flex items-center justify-center"
                      title="Decrease font size by 1px"
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        step="0.5"
                        value={element.fontSize || 32}
                        onChange={(e) => handleFontSizeChange(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-center font-bold text-sm focus:outline-none focus:border-emerald-500"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] font-mono pointer-events-none">
                        px
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStepFontSize(1)}
                      className="p-2 bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition flex items-center justify-center"
                      title="Increase font size by 1px"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Range Slider */}
                  <div className="space-y-1">
                    <input
                      type="range"
                      min="8"
                      max="200"
                      step="1"
                      value={Math.min(200, Math.max(8, Number(element.fontSize) || 32))}
                      onChange={(e) => handleFontSizeChange(parseInt(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] font-mono text-slate-500">
                      <span>8px</span>
                      <span>48px</span>
                      <span>100px</span>
                      <span>200px</span>
                    </div>
                  </div>

                  {/* Font Size Presets */}
                  <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                      Quick Size Presets
                    </span>
                    <div className="grid grid-cols-4 gap-1">
                      {[12, 16, 20, 24, 32, 40, 48, 64, 80, 100, 120, 160].map((sizeVal) => (
                        <button
                          key={sizeVal}
                          type="button"
                          onClick={() => handleFontSizeChange(sizeVal)}
                          className={`py-1 rounded text-center text-[10px] font-mono font-bold transition ${
                            Number(element.fontSize) === sizeVal
                              ? 'bg-emerald-500 text-slate-950 font-black shadow'
                              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
                          }`}
                        >
                          {sizeVal}px
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Auto-Fit Text & Fit Box To Text Actions */}
                  <div className="pt-2 border-t border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                      <div>
                        <span className="text-[11px] font-bold text-slate-200 block">
                          Auto Fit Text
                        </span>
                        <span className="text-[9px] text-slate-400 block">
                          Scales text dynamically to container box
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(element.autoFitText)}
                        onChange={(e) => onUpdateElement({ autoFitText: e.target.checked })}
                        className="w-4 h-4 accent-emerald-500 cursor-pointer"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleFitBoxToText}
                      className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-700 border border-slate-700 text-slate-200 hover:text-emerald-400 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition"
                    >
                      <Scaling className="w-3.5 h-3.5 text-emerald-400" />
                      Fit Bounding Box to Text
                    </button>
                  </div>
                </div>

                {/* Font Family Selection */}
                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                  <label className="text-slate-300 font-bold uppercase tracking-wider text-[11px] block">
                    Font Family
                  </label>
                  <select
                    value={element.fontFamily || 'Montserrat'}
                    onChange={(e) => onUpdateElement({ fontFamily: e.target.value })}
                    className="w-full px-2.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 font-semibold text-xs"
                  >
                    <option value="Montserrat">Montserrat (Sports Modern)</option>
                    <option value="Oswald">Oswald (Condensed Scoreboard)</option>
                    <option value="Bebas Neue">Bebas Neue (Heavy Headline)</option>
                    <option value="Impact">Impact (Broadcast Heavy)</option>
                    <option value="Orbitron">Orbitron (Sci-Fi / Esports)</option>
                    <option value="Inter">Inter (Clean UI)</option>
                    <option value="Poppins">Poppins (Clean Rounded)</option>
                    <option value="Outfit">Outfit (Geometric Modern)</option>
                    <option value="Chakra Petch">Chakra Petch (Racing/Motorsport)</option>
                    <option value="Playfair Display">Playfair Display (Premium Elegance)</option>
                    <option value="monospace">Monospace (Score Numbers)</option>
                  </select>
                </div>

                {/* Weight & Style Buttons */}
                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2.5">
                  <label className="text-slate-300 font-bold uppercase tracking-wider text-[11px] block">
                    Weight & Style
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={element.fontWeight || '700'}
                      onChange={(e) => onUpdateElement({ fontWeight: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-semibold"
                    >
                      <option value="400">Regular (400)</option>
                      <option value="500">Medium (500)</option>
                      <option value="600">SemiBold (600)</option>
                      <option value="700">Bold (700)</option>
                      <option value="800">ExtraBold (800)</option>
                      <option value="900">Black (900)</option>
                    </select>

                    <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-700 gap-0.5">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateElement({
                            fontWeight:
                              element.fontWeight === 'bold' ||
                              element.fontWeight === '800' ||
                              element.fontWeight === '900'
                                ? '400'
                                : '800',
                          })
                        }
                        className={`flex-1 py-1 rounded flex items-center justify-center transition ${
                          element.fontWeight === 'bold' ||
                          element.fontWeight === '800' ||
                          element.fontWeight === '900'
                            ? 'bg-emerald-500 text-slate-950 font-bold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title="Bold"
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onUpdateElement({
                            fontStyle: element.fontStyle === 'italic' ? 'normal' : 'italic',
                          })
                        }
                        className={`flex-1 py-1 rounded flex items-center justify-center transition ${
                          element.fontStyle === 'italic'
                            ? 'bg-emerald-500 text-slate-950 font-bold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title="Italic"
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onUpdateElement({ underline: !element.underline })}
                        className={`flex-1 py-1 rounded flex items-center justify-center transition ${
                          element.underline
                            ? 'bg-emerald-500 text-slate-950 font-bold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title="Underline"
                      >
                        <Underline className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Horizontal & Vertical Alignment */}
                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">
                        H-Align
                      </label>
                      <div className="grid grid-cols-4 gap-0.5 bg-slate-900 p-0.5 rounded-lg border border-slate-700">
                        {(['left', 'center', 'right', 'justify'] as const).map((align) => (
                          <button
                            key={align}
                            type="button"
                            onClick={() => onUpdateElement({ textAlign: align })}
                            className={`p-1 rounded flex items-center justify-center transition ${
                              (element.textAlign || 'center') === align
                                ? 'bg-emerald-500 text-slate-950 font-bold'
                                : 'text-slate-400 hover:text-white'
                            }`}
                            title={`Align ${align}`}
                          >
                            {align === 'left' && <AlignLeft className="w-3.5 h-3.5" />}
                            {align === 'center' && <AlignCenter className="w-3.5 h-3.5" />}
                            {align === 'right' && <AlignRight className="w-3.5 h-3.5" />}
                            {align === 'justify' && <AlignJustify className="w-3.5 h-3.5" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">
                        V-Align
                      </label>
                      <div className="grid grid-cols-3 gap-0.5 bg-slate-900 p-0.5 rounded-lg border border-slate-700">
                        {(['top', 'middle', 'bottom'] as const).map((vAlign) => (
                          <button
                            key={vAlign}
                            type="button"
                            onClick={() => onUpdateElement({ textAlignVertical: vAlign })}
                            className={`p-1 rounded flex items-center justify-center transition ${
                              (element.textAlignVertical || 'middle') === vAlign
                                ? 'bg-emerald-500 text-slate-950 font-bold'
                                : 'text-slate-400 hover:text-white'
                            }`}
                            title={`Vertical Align ${vAlign}`}
                          >
                            {vAlign === 'top' && <AlignStartVertical className="w-3.5 h-3.5" />}
                            {vAlign === 'middle' && (
                              <AlignVerticalJustifyCenter className="w-3.5 h-3.5" />
                            )}
                            {vAlign === 'bottom' && <AlignEndVertical className="w-3.5 h-3.5" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Text Wrapping & Overflow Handling */}
                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                  <label className="text-slate-300 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <WrapText className="w-3.5 h-3.5 text-emerald-400" />
                    Text Wrapping & Overflow
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {(
                      [
                        ['wrap', 'Wrap'],
                        ['nowrap', 'No Wrap'],
                        ['clip', 'Clip'],
                        ['ellipsis', '... Ellipsis'],
                      ] as const
                    ).map(([mode, label]) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => onUpdateElement({ textOverflow: mode as any })}
                        className={`py-1 px-1 rounded text-center text-[10px] font-bold truncate transition ${
                          (element.textOverflow || 'wrap') === mode
                            ? 'bg-emerald-500 text-slate-950 font-black'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Line Height & Letter Spacing (Kerning) */}
                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
                  {/* Line Height */}
                  <div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                      <span className="font-bold uppercase tracking-wider">Line Height</span>
                      <span className="font-mono text-emerald-400 font-bold">
                        {element.lineHeight !== undefined ? element.lineHeight : 1.2}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0.6"
                        max="3.0"
                        step="0.05"
                        value={element.lineHeight !== undefined ? element.lineHeight : 1.2}
                        onChange={(e) =>
                          onUpdateElement({ lineHeight: parseFloat(e.target.value) })
                        }
                        className="flex-1 accent-emerald-500 cursor-pointer"
                      />
                      <input
                        type="number"
                        min="0.5"
                        max="5"
                        step="0.1"
                        value={element.lineHeight !== undefined ? element.lineHeight : 1.2}
                        onChange={(e) =>
                          onUpdateElement({ lineHeight: parseFloat(e.target.value) || 1.2 })
                        }
                        className="w-14 px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-white font-mono text-center text-xs"
                      />
                    </div>
                    <div className="flex gap-1 mt-1.5">
                      {[0.8, 1.0, 1.2, 1.5, 2.0].map((lh) => (
                        <button
                          key={lh}
                          type="button"
                          onClick={() => onUpdateElement({ lineHeight: lh })}
                          className={`flex-1 py-0.5 rounded text-[9px] font-mono transition ${
                            element.lineHeight === lh
                              ? 'bg-emerald-500 text-slate-950 font-bold'
                              : 'bg-slate-900 text-slate-400 hover:text-white'
                          }`}
                        >
                          {lh}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Letter Spacing (Tracking) */}
                  <div className="pt-2 border-t border-slate-800">
                    <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                      <span className="font-bold uppercase tracking-wider">Letter Spacing (Tracking)</span>
                      <span className="font-mono text-emerald-400 font-bold">
                        {element.letterSpacing || 0}px
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="-5"
                        max="25"
                        step="0.5"
                        value={element.letterSpacing || 0}
                        onChange={(e) =>
                          onUpdateElement({ letterSpacing: parseFloat(e.target.value) })
                        }
                        className="flex-1 accent-emerald-500 cursor-pointer"
                      />
                      <input
                        type="number"
                        min="-10"
                        max="50"
                        step="0.5"
                        value={element.letterSpacing || 0}
                        onChange={(e) =>
                          onUpdateElement({ letterSpacing: parseFloat(e.target.value) || 0 })
                        }
                        className="w-14 px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-white font-mono text-center text-xs"
                      />
                    </div>
                    <div className="flex gap-1 mt-1.5">
                      {[-1, 0, 2, 4, 8, 12].map((ls) => (
                        <button
                          key={ls}
                          type="button"
                          onClick={() => onUpdateElement({ letterSpacing: ls })}
                          className={`flex-1 py-0.5 rounded text-[9px] font-mono transition ${
                            (element.letterSpacing || 0) === ls
                              ? 'bg-emerald-500 text-slate-950 font-bold'
                              : 'bg-slate-900 text-slate-400 hover:text-white'
                          }`}
                        >
                          {ls}px
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Text Transform */}
                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                  <label className="text-slate-300 font-bold uppercase tracking-wider text-[11px] block">
                    Text Transform / Case
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {(
                      [
                        ['none', 'None'],
                        ['uppercase', 'UPPER'],
                        ['lowercase', 'lower'],
                        ['capitalize', 'Capital'],
                      ] as const
                    ).map(([tf, label]) => (
                      <button
                        key={tf}
                        type="button"
                        onClick={() => onUpdateElement({ textTransform: tf as any })}
                        className={`py-1 rounded text-center text-[10px] font-bold transition ${
                          (element.textTransform || 'none') === tf
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Text Color Picker with StudioColorPicker */}
                <div>
                  <label className="text-slate-300 font-bold uppercase tracking-wider text-[11px] block mb-1">
                    Text Color & Fill
                  </label>
                  <StudioColorPicker
                    color={element.textColor || '#ffffff'}
                    gradient={element.textGradient}
                    allowGradient={true}
                    onChangeColor={(c) =>
                      onUpdateElement({
                        textColor: c,
                        textGradient: { ...element.textGradient!, enabled: false },
                      })
                    }
                    onChangeGradient={(grad) =>
                      onUpdateElement({
                        textGradient: grad,
                      })
                    }
                  />
                </div>

                {/* Text Stroke / Outline Controls */}
                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                      Text Outline / Stroke
                    </span>
                    <input
                      type="checkbox"
                      checked={Boolean(element.textStroke?.enabled)}
                      onChange={(e) =>
                        onUpdateElement({
                          textStroke: {
                            enabled: e.target.checked,
                            color: element.textStroke?.color || '#000000',
                            width: element.textStroke?.width || 2,
                          },
                        })
                      }
                      className="accent-emerald-500"
                    />
                  </div>

                  {element.textStroke?.enabled && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-1">Stroke Width</span>
                        <input
                          type="number"
                          min="1"
                          max="12"
                          value={element.textStroke.width || 2}
                          onChange={(e) =>
                            onUpdateElement({
                              textStroke: {
                                ...element.textStroke!,
                                width: parseInt(e.target.value) || 1,
                              },
                            })
                          }
                          className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-1">Stroke Color</span>
                        <StudioColorPicker
                          color={element.textStroke.color || '#000000'}
                          onChangeColor={(c) =>
                            onUpdateElement({
                              textStroke: { ...element.textStroke!, color: c },
                            })
                          }
                          compact
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Text Shadow Controls */}
                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Text Drop Shadow
                    </span>
                    <input
                      type="checkbox"
                      checked={Boolean(element.textShadow?.enabled)}
                      onChange={(e) =>
                        onUpdateElement({
                          textShadow: {
                            enabled: e.target.checked,
                            x: element.textShadow?.x ?? 2,
                            y: element.textShadow?.y ?? 2,
                            blur: element.textShadow?.blur ?? 4,
                            color: element.textShadow?.color || '#000000',
                          },
                        })
                      }
                      className="accent-emerald-500"
                    />
                  </div>

                  {element.textShadow?.enabled && (
                    <div className="space-y-2 pt-1">
                      {/* Shadow Presets */}
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          Shadow Presets
                        </span>
                        <div className="grid grid-cols-4 gap-1">
                          {[
                            { name: 'Subtle', s: { x: 1, y: 1, blur: 2, color: 'rgba(0,0,0,0.6)' } },
                            { name: 'Hard 3D', s: { x: 3, y: 3, blur: 0, color: '#000000' } },
                            { name: 'Broadcast', s: { x: 2, y: 4, blur: 6, color: '#000000' } },
                            { name: 'Soft Dark', s: { x: 0, y: 4, blur: 12, color: 'rgba(0,0,0,0.8)' } },
                          ].map((preset) => (
                            <button
                              key={preset.name}
                              type="button"
                              onClick={() =>
                                onUpdateElement({
                                  textShadow: { enabled: true, ...preset.s },
                                })
                              }
                              className="py-1 px-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500 rounded text-[10px] font-bold text-slate-300 hover:text-white truncate transition"
                            >
                              {preset.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <span className="text-[10px] text-slate-400 block mb-1">Offset X ({element.textShadow.x || 0}px)</span>
                          <input
                            type="number"
                            min="-50"
                            max="50"
                            value={element.textShadow.x ?? 0}
                            onChange={(e) =>
                              onUpdateElement({
                                textShadow: {
                                  ...element.textShadow!,
                                  x: parseInt(e.target.value) || 0,
                                },
                              })
                            }
                            className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white font-mono text-xs"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block mb-1">Offset Y ({element.textShadow.y || 0}px)</span>
                          <input
                            type="number"
                            min="-50"
                            max="50"
                            value={element.textShadow.y ?? 0}
                            onChange={(e) =>
                              onUpdateElement({
                                textShadow: {
                                  ...element.textShadow!,
                                  y: parseInt(e.target.value) || 0,
                                },
                              })
                            }
                            className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white font-mono text-xs"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block mb-1">Blur ({element.textShadow.blur || 0}px)</span>
                          <input
                            type="number"
                            min="0"
                            max="50"
                            value={element.textShadow.blur ?? 0}
                            onChange={(e) =>
                              onUpdateElement({
                                textShadow: {
                                  ...element.textShadow!,
                                  blur: parseInt(e.target.value) || 0,
                                },
                              })
                            }
                            className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block mb-1">Shadow Color</span>
                        <StudioColorPicker
                          color={element.textShadow.color || '#000000'}
                          onChangeColor={(c) =>
                            onUpdateElement({
                              textShadow: { ...element.textShadow!, color: c },
                            })
                          }
                          compact
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Text Neon Glow Controls */}
                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1">
                      <Wand2 className="w-3.5 h-3.5 text-emerald-400" />
                      Text Neon Glow
                    </span>
                    <input
                      type="checkbox"
                      checked={Boolean(element.textGlow?.enabled)}
                      onChange={(e) =>
                        onUpdateElement({
                          textGlow: {
                            enabled: e.target.checked,
                            color: element.textGlow?.color || '#10b981',
                            blur: element.textGlow?.blur || 15,
                          },
                        })
                      }
                      className="accent-emerald-500"
                    />
                  </div>

                  {element.textGlow?.enabled && (
                    <div className="space-y-2 pt-1">
                      {/* Glow Color Presets */}
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          Glow Presets
                        </span>
                        <div className="grid grid-cols-4 gap-1">
                          {[
                            { name: 'Emerald', color: '#10b981', blur: 15 },
                            { name: 'Cyan', color: '#06b6d4', blur: 18 },
                            { name: 'Electric', color: '#3b82f6', blur: 20 },
                            { name: 'Gold', color: '#f59e0b', blur: 16 },
                          ].map((preset) => (
                            <button
                              key={preset.name}
                              type="button"
                              onClick={() =>
                                onUpdateElement({
                                  textGlow: { enabled: true, color: preset.color, blur: preset.blur },
                                })
                              }
                              className="py-1 px-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500 rounded text-[10px] font-bold text-slate-300 hover:text-white truncate transition"
                            >
                              {preset.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>Glow Radius / Intensity</span>
                          <span className="font-mono text-emerald-400">{element.textGlow.blur || 15}px</span>
                        </div>
                        <input
                          type="range"
                          min="2"
                          max="50"
                          value={element.textGlow.blur || 15}
                          onChange={(e) =>
                            onUpdateElement({
                              textGlow: {
                                ...element.textGlow!,
                                blur: parseInt(e.target.value) || 15,
                              },
                            })
                          }
                          className="w-full accent-emerald-500"
                        />
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block mb-1">Glow Color</span>
                        <StudioColorPicker
                          color={element.textGlow.color || '#10b981'}
                          onChangeColor={(c) =>
                            onUpdateElement({
                              textGlow: { ...element.textGlow!, color: c },
                            })
                          }
                          compact
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Text Background Box & Padding */}
                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2.5">
                  <label className="text-slate-300 font-bold uppercase tracking-wider text-[11px] block">
                    Text Badge Background & Radius
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Bg Color</span>
                      <StudioColorPicker
                        color={element.textBackgroundColor || element.fillColor || 'transparent'}
                        onChangeColor={(c) =>
                          onUpdateElement({
                            textBackgroundColor: c,
                            fillColor: c,
                          })
                        }
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Corner Radius</span>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={element.textBorderRadius || element.borderRadius || 0}
                        onChange={(e) =>
                          onUpdateElement({
                            textBorderRadius: parseInt(e.target.value) || 0,
                            borderRadius: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                      />
                    </div>
                  </div>
                  <div className="pt-1">
                    <span className="text-[10px] text-slate-400 block mb-1">Inner Padding ({element.textPadding || 8}px)</span>
                    <input
                      type="range"
                      min="0"
                      max="40"
                      value={element.textPadding !== undefined ? element.textPadding : 8}
                      onChange={(e) => onUpdateElement({ textPadding: parseInt(e.target.value) || 0 })}
                      className="w-full accent-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SHAPES FILL & GRADIENT */}
            {element.type !== 'TEXT' && element.type !== 'LIVE_DATA' && (
              <div className="space-y-3">
                {/* Fill Color with StudioColorPicker */}
                <div>
                  <label className="text-slate-300 font-bold uppercase tracking-wider text-[11px] block mb-1">
                    Fill & Gradient
                  </label>
                  <StudioColorPicker
                    color={element.fillColor || '#0f172a'}
                    gradient={element.gradient}
                    allowGradient={true}
                    onChangeColor={(c) =>
                      onUpdateElement({
                        fillColor: c,
                        gradient: { ...element.gradient!, enabled: false },
                      })
                    }
                    onChangeGradient={(grad) =>
                      onUpdateElement({
                        gradient: grad,
                      })
                    }
                  />
                </div>
              </div>
            )}

            {/* BORDER & CORNER RADIUS */}
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
              <span className="text-slate-300 font-bold uppercase tracking-wider text-[11px] block">
                Border & Stroke
              </span>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400">Width ({element.borderWidth || 0}px)</span>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={element.borderWidth || 0}
                    onChange={(e) =>
                      onUpdateElement({ borderWidth: parseInt(e.target.value) || 0 })
                    }
                    className="w-full mt-0.5 px-2 py-1 bg-slate-900 border border-slate-800 rounded text-white font-mono text-[11px]"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">Style</span>
                  <select
                    value={element.borderStyle || 'solid'}
                    onChange={(e) => onUpdateElement({ borderStyle: e.target.value as any })}
                    className="w-full mt-0.5 px-2 py-1 bg-slate-900 border border-slate-800 rounded text-white text-[11px]"
                  >
                    <option value="solid">Solid</option>
                    <option value="dashed">Dashed</option>
                    <option value="dotted">Dotted</option>
                  </select>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">Radius ({element.borderRadius || 0}px)</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={element.borderRadius || 0}
                    onChange={(e) =>
                      onUpdateElement({ borderRadius: parseInt(e.target.value) || 0 })
                    }
                    className="w-full mt-0.5 px-2 py-1 bg-slate-900 border border-slate-800 rounded text-white font-mono text-[11px]"
                  />
                </div>
              </div>

              {/* Border Color */}
              <div>
                <span className="text-[10px] text-slate-400 block mb-1">Border Color</span>
                <StudioColorPicker
                  color={element.borderColor || '#3b82f6'}
                  onChangeColor={(c) => onUpdateElement({ borderColor: c })}
                />
              </div>
            </div>

            {/* BOX DROP SHADOW */}
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Box Drop Shadow
                </span>
                <input
                  type="checkbox"
                  checked={Boolean(element.boxShadow?.enabled)}
                  onChange={(e) =>
                    onUpdateElement({
                      boxShadow: {
                        enabled: e.target.checked,
                        color: element.boxShadow?.color || 'rgba(0,0,0,0.5)',
                        blur: element.boxShadow?.blur ?? 15,
                        spread: element.boxShadow?.spread ?? 0,
                        x: element.boxShadow?.x ?? 0,
                        y: element.boxShadow?.y ?? 8,
                      },
                    })
                  }
                  className="accent-emerald-500"
                />
              </div>

              {element.boxShadow?.enabled && (
                <div className="space-y-2 pt-1">
                  {/* Shadow Presets */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      Shadow Presets
                    </span>
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { name: 'Elevated', s: { x: 0, y: 4, blur: 12, spread: 0, color: 'rgba(0,0,0,0.4)' } },
                        { name: 'Deep Float', s: { x: 0, y: 12, blur: 28, spread: -4, color: 'rgba(0,0,0,0.6)' } },
                        { name: 'Hard Edge', s: { x: 6, y: 6, blur: 0, spread: 0, color: '#000000' } },
                        { name: 'Broadcast', s: { x: 0, y: 8, blur: 20, spread: 2, color: 'rgba(0,0,0,0.7)' } },
                      ].map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() =>
                            onUpdateElement({
                              boxShadow: { enabled: true, ...preset.s },
                            })
                          }
                          className="py-1 px-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500 rounded text-[10px] font-bold text-slate-300 hover:text-white truncate transition"
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Offset X ({element.boxShadow.x || 0}px)</span>
                      <input
                        type="number"
                        min="-50"
                        max="50"
                        value={element.boxShadow.x ?? 0}
                        onChange={(e) =>
                          onUpdateElement({
                            boxShadow: {
                              ...element.boxShadow!,
                              x: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                        className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white font-mono text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Offset Y ({element.boxShadow.y || 0}px)</span>
                      <input
                        type="number"
                        min="-50"
                        max="50"
                        value={element.boxShadow.y ?? 0}
                        onChange={(e) =>
                          onUpdateElement({
                            boxShadow: {
                              ...element.boxShadow!,
                              y: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                        className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Blur ({element.boxShadow.blur || 0}px)</span>
                      <input
                        type="number"
                        min="0"
                        max="80"
                        value={element.boxShadow.blur ?? 0}
                        onChange={(e) =>
                          onUpdateElement({
                            boxShadow: {
                              ...element.boxShadow!,
                              blur: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                        className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white font-mono text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Spread ({element.boxShadow.spread || 0}px)</span>
                      <input
                        type="number"
                        min="-20"
                        max="40"
                        value={element.boxShadow.spread ?? 0}
                        onChange={(e) =>
                          onUpdateElement({
                            boxShadow: {
                              ...element.boxShadow!,
                              spread: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                        className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Shadow Color</span>
                    <StudioColorPicker
                      color={element.boxShadow.color || 'rgba(0,0,0,0.5)'}
                      onChangeColor={(c) =>
                        onUpdateElement({
                          boxShadow: { ...element.boxShadow!, color: c },
                        })
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            {/* NEON GLOW & SHADOW */}
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1">
                  <Wand2 className="w-3.5 h-3.5 text-emerald-400" />
                  Neon Glow Effect
                </span>
                <input
                  type="checkbox"
                  checked={Boolean(element.glow?.enabled)}
                  onChange={(e) =>
                    onUpdateElement({
                      glow: {
                        enabled: e.target.checked,
                        color: element.glow?.color || '#10b981',
                        blur: element.glow?.blur || 20,
                        spread: element.glow?.spread || 4,
                        inner: element.glow?.inner || false,
                      },
                    })
                  }
                  className="accent-emerald-500"
                />
              </div>

              {element.glow?.enabled && (
                <div className="space-y-2 pt-1">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 block">Glow Color</span>
                    <StudioColorPicker
                      color={element.glow.color || '#10b981'}
                      onChangeColor={(c) =>
                        onUpdateElement({ glow: { ...element.glow!, color: c } })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400">Glow Radius</span>
                      <input
                        type="range"
                        min="5"
                        max="60"
                        value={element.glow.blur || 20}
                        onChange={(e) =>
                          onUpdateElement({
                            glow: { ...element.glow!, blur: parseInt(e.target.value) },
                          })
                        }
                        className="w-full accent-emerald-500"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">Spread</span>
                      <input
                        type="range"
                        min="0"
                        max="20"
                        value={element.glow.spread || 4}
                        onChange={(e) =>
                          onUpdateElement({
                            glow: { ...element.glow!, spread: parseInt(e.target.value) },
                          })
                        }
                        className="w-full accent-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-400">Inner Glow (Inset)</span>
                    <input
                      type="checkbox"
                      checked={Boolean(element.glow?.inner)}
                      onChange={(e) =>
                        onUpdateElement({
                          glow: { ...element.glow!, inner: e.target.checked },
                        })
                      }
                      className="accent-emerald-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* GLASSMORPHISM BACKDROP BLUR */}
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                  Glass Backdrop Blur
                </label>
                <span className="text-emerald-400 font-mono text-[11px]">
                  {element.glassBlur || 0}px
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                value={element.glassBlur || 0}
                onChange={(e) => onUpdateElement({ glassBlur: parseInt(e.target.value) || 0 })}
                className="w-full accent-emerald-500"
              />
            </div>

            {/* MASTER LAYER OPACITY & BLEND MODE */}
            <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-xl space-y-3">
              <span className="text-slate-300 font-bold uppercase tracking-wider text-[11px] block">
                Layer Blending & Opacity
              </span>

              {/* Master Opacity Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">
                    Master Opacity
                  </span>
                  <span className="text-emerald-400 font-mono font-bold">
                    {Math.round((element.opacity !== undefined ? element.opacity : 1) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={element.opacity !== undefined ? element.opacity : 1}
                  onChange={(e) => onUpdateElement({ opacity: parseFloat(e.target.value) })}
                  className="w-full accent-emerald-500"
                />
              </div>

              {/* Blend Mode Selector */}
              <div className="space-y-1">
                <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">
                  Blend Mode
                </label>
                <select
                  value={element.blendMode || 'normal'}
                  onChange={(e) => onUpdateElement({ blendMode: e.target.value as any })}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="normal">Normal</option>
                  <option value="multiply">Multiply (Darken)</option>
                  <option value="screen">Screen (Lighten)</option>
                  <option value="overlay">Overlay (Contrast)</option>
                  <option value="darken">Darken</option>
                  <option value="lighten">Lighten</option>
                  <option value="color-dodge">Color Dodge</option>
                  <option value="color-burn">Color Burn</option>
                  <option value="hard-light">Hard Light</option>
                  <option value="soft-light">Soft Light</option>
                  <option value="difference">Difference</option>
                  <option value="exclusion">Exclusion</option>
                  <option value="hue">Hue</option>
                  <option value="saturation">Saturation</option>
                  <option value="color">Color</option>
                  <option value="luminosity">Luminosity</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* SECTION 3: POSITION, SIZING & PRESETS      */}
        {/* ========================================== */}
        {activeSection === 'POSITION' && (
          <div className="space-y-4 text-xs">
            {/* Quick 9-Point Alignment Grid */}
            <div className="space-y-1.5">
              <label className="text-slate-300 font-bold uppercase tracking-wider text-[11px] block">
                Quick Placement Presets
              </label>
              <div className="grid grid-cols-3 gap-1 bg-slate-950 p-2 rounded-xl border border-slate-800">
                {(
                  [
                    ['TOP_LEFT', 'Top L'],
                    ['TOP_CENTER', 'Top C'],
                    ['TOP_RIGHT', 'Top R'],
                    ['CENTER_LEFT', 'Mid L'],
                    ['CENTER', 'Center'],
                    ['CENTER_RIGHT', 'Mid R'],
                    ['BOTTOM_LEFT', 'Bot L'],
                    ['BOTTOM_CENTER', 'Bot C'],
                    ['BOTTOM_RIGHT', 'Bot R'],
                  ] as const
                ).map(([pos, label]) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => applyPositionPreset(pos as GraphicPositionPreset)}
                    className="py-2 px-1 text-[10px] font-bold bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-300 rounded transition text-center"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Coordinates & Dimensions */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              {/* Transform Mode: AUTO (Responsive) vs MANUAL (Fixed) */}
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Transform Mode
                  </label>
                  <span className="text-[10px] font-mono font-bold text-emerald-400">
                    {element.transformMode || 'AUTO'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => onUpdateElement({ transformMode: 'AUTO' })}
                    className={`py-1.5 text-[11px] font-bold rounded transition ${
                      (element.transformMode || 'AUTO') === 'AUTO'
                        ? 'bg-emerald-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    AUTO (Responsive)
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateElement({ transformMode: 'MANUAL' })}
                    className={`py-1.5 text-[11px] font-bold rounded transition ${
                      element.transformMode === 'MANUAL'
                        ? 'bg-sky-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    MANUAL (Fixed)
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  {(element.transformMode || 'AUTO') === 'AUTO'
                    ? 'Scales and repositions proportionally when canvas resolution changes.'
                    : 'Locks exact pixel position and size when resolution changes.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 font-bold text-[11px] block mb-1">X Position</label>
                  <input
                    type="number"
                    value={element.x}
                    onChange={(e) => onUpdateElement({ x: parseInt(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-bold text-[11px] block mb-1">Y Position</label>
                  <input
                    type="number"
                    value={element.y}
                    onChange={(e) => onUpdateElement({ y: parseInt(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 font-bold text-[11px] block mb-1">Width (px)</label>
                  <input
                    type="number"
                    min="1"
                    value={element.width}
                    onChange={(e) => onUpdateElement({ width: parseInt(e.target.value) || 10 })}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-bold text-[11px] block mb-1">Height (px)</label>
                  <input
                    type="number"
                    min="1"
                    value={element.height}
                    onChange={(e) => onUpdateElement({ height: parseInt(e.target.value) || 10 })}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 font-bold text-[11px] block mb-1">Rotation (°)</label>
                  <input
                    type="number"
                    min="-360"
                    max="360"
                    value={element.rotation || 0}
                    onChange={(e) => onUpdateElement({ rotation: parseInt(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-bold text-[11px] block mb-1">Z-Index (Layer)</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={element.zIndex || 1}
                    onChange={(e) => onUpdateElement({ zIndex: parseInt(e.target.value) || 1 })}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
