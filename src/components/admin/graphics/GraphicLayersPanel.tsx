import React, { useState } from 'react';
import {
  StudioGraphic,
  GraphicElement,
  GraphicElementType,
  GraphicAnimationType,
  GraphicTransitionType,
  SportType,
} from '../../../types';
import {
  Layers,
  Plus,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Copy,
  Type,
  Square,
  Circle,
  Triangle,
  Star,
  Shield,
  ArrowRight,
  Minus,
  Image as ImageIcon,
  Sparkles,
  Sliders,
  Clock,
  Zap,
  CircleDot,
  Flame,
} from 'lucide-react';

interface GraphicLayersPanelProps {
  graphic: StudioGraphic;
  sport?: SportType;
  selectedElementId: string | null;
  selectedElementIds?: string[];
  onSelectElement: (id: string, isMulti?: boolean) => void;
  onAddElement: (type: GraphicElementType) => void;
  onOpenInsertLiveDataModal?: () => void;
  onUpdateGraphicConfig: (updated: Partial<StudioGraphic>) => void;
  onReorderElement: (id: string, direction: 'UP' | 'DOWN') => void;
  onDuplicateElement: (id: string) => void;
  onDeleteElement: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
}

export const GraphicLayersPanel: React.FC<GraphicLayersPanelProps> = ({
  graphic,
  sport = 'CRICKET',
  selectedElementId,
  selectedElementIds = [],
  onSelectElement,
  onAddElement,
  onOpenInsertLiveDataModal,
  onUpdateGraphicConfig,
  onReorderElement,
  onDuplicateElement,
  onDeleteElement,
  onToggleVisibility,
  onToggleLock,
}) => {
  const [activeTab, setActiveTab] = useState<'LAYERS' | 'ANIMATION'>('LAYERS');

  const animationOptions: GraphicAnimationType[] = [
    'NONE',
    'FADE',
    'SLIDE',
    'SLIDE_LEFT',
    'SLIDE_RIGHT',
    'SLIDE_UP',
    'SLIDE_DOWN',
    'ZOOM',
    'POP',
    'SCALE',
    'GLOW',
    'BOUNCE',
  ];

  const transitionOptions: GraphicTransitionType[] = [
    'FADE_IN',
    'FADE_OUT',
    'SLIDE_IN',
    'SLIDE_OUT',
    'ZOOM_IN',
    'ZOOM_OUT',
  ];

  // Sort elements by zIndex descending for layer stack visualization (top layer at top)
  const sortedElements = [...graphic.elements].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));

  const effectiveSelectedIds =
    selectedElementIds.length > 0
      ? selectedElementIds
      : selectedElementId
      ? [selectedElementId]
      : [];

  const renderLayerIcon = (type: GraphicElementType) => {
    switch (type) {
      case 'LIVE_DATA':
        return <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      case 'CRICKET_BALL_EVENT':
        return <CircleDot className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
      case 'TEXT':
        return <Type className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      case 'RECTANGLE':
      case 'ROUNDED_RECTANGLE':
      case 'ANGULAR':
        return <Square className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case 'CIRCLE':
      case 'ELLIPSE':
        return <Circle className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
      case 'PILL':
        return <span className="text-[12px] font-black text-cyan-400 leading-none">💊</span>;
      case 'TRIANGLE':
        return <Triangle className="w-3.5 h-3.5 text-orange-400 shrink-0" />;
      case 'POLYGON':
        return <span className="text-[11px] font-black text-teal-400 leading-none">⬡</span>;
      case 'STAR':
        return <Star className="w-3.5 h-3.5 text-yellow-400 shrink-0" />;
      case 'BADGE':
        return <Shield className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
      case 'ARROW':
        return <ArrowRight className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
      case 'LINE':
        return <Minus className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
      case 'GLASS':
        return <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
      case 'IMAGE':
      case 'PLAYER_PHOTO':
      case 'LOGO':
      case 'TEAM_LOGO':
      case 'TOURNAMENT_LOGO':
      case 'SPONSOR_LOGO':
      case 'CAPTAIN_PHOTO':
        return <ImageIcon className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
      default:
        return <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
    }
  };

  return (
    <div className="w-full flex flex-col h-full bg-slate-900 border-r border-slate-800 text-slate-200 overflow-hidden select-none">
      {/* Header Tabs */}
      <div className="grid grid-cols-2 border-b border-slate-800 bg-slate-950 text-xs font-bold uppercase tracking-wider">
        <button
          onClick={() => setActiveTab('LAYERS')}
          className={`py-3 text-center transition flex items-center justify-center gap-1.5 ${
            activeTab === 'LAYERS'
              ? 'text-emerald-400 border-b-2 border-emerald-500 bg-slate-900'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Layers ({graphic.elements.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('ANIMATION')}
          className={`py-3 text-center transition flex items-center justify-center gap-1.5 ${
            activeTab === 'ANIMATION'
              ? 'text-emerald-400 border-b-2 border-emerald-500 bg-slate-900'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Animation</span>
        </button>
      </div>

      {/* Content Area */}
      {activeTab === 'LAYERS' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Quick Add Element Bar */}
          <div className="p-2.5 border-b border-slate-800 bg-slate-950/70 space-y-2">
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  if (onOpenInsertLiveDataModal) {
                    onOpenInsertLiveDataModal();
                  } else {
                    onAddElement('LIVE_DATA');
                  }
                }}
                className="py-2 px-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-black rounded-lg flex items-center justify-center gap-1.5 shadow-md transition active:scale-98 cursor-pointer"
                title="Add Dynamic Live Match Data Layer (Score, Batsman, Clock, Bowler, etc.)"
              >
                <Sparkles className="w-3.5 h-3.5 fill-slate-950 text-slate-950 shrink-0" />
                <span className="text-[10px] tracking-wide uppercase font-black truncate">+ Live Data</span>
              </button>

              <button
                type="button"
                onClick={() => onAddElement('CRICKET_BALL_EVENT')}
                className="py-2 px-2.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black rounded-lg flex items-center justify-center gap-1.5 shadow-md transition active:scale-98 cursor-pointer"
                title="Add Cricket Ball Event Dynamic Graphic (4s, 6s, Wicket, Recent Balls, Badges)"
              >
                <CircleDot className="w-3.5 h-3.5 text-white shrink-0 animate-pulse" />
                <span className="text-[10px] tracking-wide uppercase font-black truncate">+ Ball Event</span>
              </button>
            </div>

            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              + Insert Vector Layer
            </span>
            <div className="grid grid-cols-4 gap-1 text-[10px]">
              <button
                type="button"
                onClick={() => onAddElement('TEXT')}
                className="p-1.5 bg-slate-800 hover:bg-emerald-600 hover:text-slate-950 text-slate-300 font-bold rounded flex flex-col items-center justify-center gap-0.5 transition"
                title="Add Text Block"
              >
                <Type className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[9px]">Text</span>
              </button>
              <button
                type="button"
                onClick={() => onAddElement('IMAGE')}
                className="p-1.5 bg-slate-800 hover:bg-emerald-600 hover:text-slate-950 text-slate-300 font-bold rounded flex flex-col items-center justify-center gap-0.5 transition"
                title="Add Image / Photo Box"
              >
                <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[9px]">Image</span>
              </button>
              <button
                type="button"
                onClick={() => onAddElement('RECTANGLE')}
                className="p-1.5 bg-slate-800 hover:bg-emerald-600 hover:text-slate-950 text-slate-300 font-bold rounded flex flex-col items-center justify-center gap-0.5 transition"
                title="Add Rectangle Box"
              >
                <Square className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[9px]">Box</span>
              </button>
              <button
                type="button"
                onClick={() => onAddElement('ROUNDED_RECTANGLE')}
                className="p-1.5 bg-slate-800 hover:bg-emerald-600 hover:text-slate-950 text-slate-300 font-bold rounded flex flex-col items-center justify-center gap-0.5 transition"
                title="Add Rounded Box"
              >
                <span className="text-[12px] font-bold text-amber-400 leading-none">▢</span>
                <span className="text-[9px]">Rounded</span>
              </button>
              <button
                type="button"
                onClick={() => onAddElement('CIRCLE')}
                className="p-1.5 bg-slate-800 hover:bg-emerald-600 hover:text-slate-950 text-slate-300 font-bold rounded flex flex-col items-center justify-center gap-0.5 transition"
                title="Add Circle"
              >
                <Circle className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[9px]">Circle</span>
              </button>
              <button
                type="button"
                onClick={() => onAddElement('ELLIPSE')}
                className="p-1.5 bg-slate-800 hover:bg-emerald-600 hover:text-slate-950 text-slate-300 font-bold rounded flex flex-col items-center justify-center gap-0.5 transition"
                title="Add Ellipse"
              >
                <span className="text-[11px] font-black text-cyan-400 leading-none">⬭</span>
                <span className="text-[9px]">Ellipse</span>
              </button>
              <button
                type="button"
                onClick={() => onAddElement('PILL')}
                className="p-1.5 bg-slate-800 hover:bg-emerald-600 hover:text-slate-950 text-slate-300 font-bold rounded flex flex-col items-center justify-center gap-0.5 transition"
                title="Add Pill Badge"
              >
                <span className="text-[10px] leading-none">💊</span>
                <span className="text-[9px]">Pill</span>
              </button>
              <button
                type="button"
                onClick={() => onAddElement('TRIANGLE')}
                className="p-1.5 bg-slate-800 hover:bg-emerald-600 hover:text-slate-950 text-slate-300 font-bold rounded flex flex-col items-center justify-center gap-0.5 transition"
                title="Add Triangle"
              >
                <Triangle className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-[9px]">Triangle</span>
              </button>
              <button
                type="button"
                onClick={() => onAddElement('POLYGON')}
                className="p-1.5 bg-slate-800 hover:bg-emerald-600 hover:text-slate-950 text-slate-300 font-bold rounded flex flex-col items-center justify-center gap-0.5 transition"
                title="Add Polygon (Hexagon/Octagon)"
              >
                <span className="text-[11px] font-black text-teal-400 leading-none">⬡</span>
                <span className="text-[9px]">Polygon</span>
              </button>
              <button
                type="button"
                onClick={() => onAddElement('STAR')}
                className="p-1.5 bg-slate-800 hover:bg-emerald-600 hover:text-slate-950 text-slate-300 font-bold rounded flex flex-col items-center justify-center gap-0.5 transition"
                title="Add Star"
              >
                <Star className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-[9px]">Star</span>
              </button>
              <button
                type="button"
                onClick={() => onAddElement('BADGE')}
                className="p-1.5 bg-slate-800 hover:bg-emerald-600 hover:text-slate-950 text-slate-300 font-bold rounded flex flex-col items-center justify-center gap-0.5 transition"
                title="Add Sports Shield / Badge"
              >
                <Shield className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-[9px]">Badge</span>
              </button>
              <button
                type="button"
                onClick={() => onAddElement('ARROW')}
                className="p-1.5 bg-slate-800 hover:bg-emerald-600 hover:text-slate-950 text-slate-300 font-bold rounded flex flex-col items-center justify-center gap-0.5 transition"
                title="Add Arrow Indicator"
              >
                <ArrowRight className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-[9px]">Arrow</span>
              </button>
            </div>
          </div>

          {/* Layer Items List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {sortedElements.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No layers in this graphic. Click a button above to add elements.
              </div>
            ) : (
              sortedElements.map((el) => {
                const isSelected = effectiveSelectedIds.includes(el.id);
                return (
                  <div
                    key={el.id}
                    onClick={(e) => {
                      const isMulti = e.shiftKey || e.ctrlKey || e.metaKey;
                      onSelectElement(el.id, isMulti);
                    }}
                    className={`group px-2.5 py-2 rounded-lg text-xs font-medium flex items-center justify-between gap-2 cursor-pointer transition ${
                      isSelected
                        ? 'bg-emerald-950/60 border border-emerald-500 text-white shadow-sm'
                        : 'bg-slate-950/40 border border-slate-800/80 hover:bg-slate-800/60 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-[10px] font-mono text-slate-500 w-4 text-center">
                        {el.zIndex}
                      </span>
                      {renderLayerIcon(el.type)}
                      <span className="truncate font-semibold text-[11px]">{el.name}</span>
                      {(el.type === 'LIVE_DATA' || el.liveDataField) && (
                        <span className="px-1.5 py-0.2 text-[8px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded shrink-0">
                          LIVE
                        </span>
                      )}
                    </div>

                    {/* Quick controls per layer */}
                    <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onReorderElement(el.id, 'UP');
                        }}
                        title="Bring Forward"
                        className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onReorderElement(el.id, 'DOWN');
                        }}
                        title="Send Backward"
                        className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleLock(el.id);
                        }}
                        title={el.locked ? 'Unlock' : 'Lock'}
                        className={`p-1 rounded ${
                          el.locked ? 'text-amber-400' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {el.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleVisibility(el.id);
                        }}
                        title={el.visible ? 'Hide' : 'Show'}
                        className={`p-1 rounded ${
                          !el.visible ? 'text-rose-400' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {el.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!el.locked) onDeleteElement(el.id);
                        }}
                        disabled={el.locked}
                        title={el.locked ? 'Layer is locked' : 'Delete Layer'}
                        className={`p-1 rounded ${
                          el.locked
                            ? 'opacity-30 cursor-not-allowed text-slate-600'
                            : 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/40'
                        }`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Animation Config Panel */}
      {activeTab === 'ANIMATION' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          <div className="space-y-1">
            <label className="text-slate-400 uppercase font-bold text-[10px] tracking-wider block">
              Graphic Entry Animation
            </label>
            <select
              value={graphic.animation || 'FADE'}
              onChange={(e) =>
                onUpdateGraphicConfig({
                  animation: e.target.value as GraphicAnimationType,
                })
              }
              className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-medium focus:outline-none focus:border-emerald-500"
            >
              {animationOptions.map((anim) => (
                <option key={anim} value={anim}>
                  {anim}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 uppercase font-bold text-[10px] tracking-wider block">
              Transition Type
            </label>
            <select
              value={graphic.transition || 'FADE_IN'}
              onChange={(e) =>
                onUpdateGraphicConfig({
                  transition: e.target.value as GraphicTransitionType,
                })
              }
              className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-medium focus:outline-none focus:border-emerald-500"
            >
              {transitionOptions.map((trans) => (
                <option key={trans} value={trans}>
                  {trans}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1 pt-2 border-t border-slate-800">
            <div className="flex justify-between text-slate-400">
              <span className="uppercase font-bold text-[10px] tracking-wider">
                Animation Duration
              </span>
              <span className="font-mono text-emerald-400">
                {graphic.animationDuration || 500}ms
              </span>
            </div>
            <input
              type="range"
              min="100"
              max="2000"
              step="50"
              value={graphic.animationDuration || 500}
              onChange={(e) =>
                onUpdateGraphicConfig({
                  animationDuration: parseInt(e.target.value),
                })
              }
              className="w-full accent-emerald-500"
            />
          </div>

          <div className="space-y-1 pt-2 border-t border-slate-800">
            <div className="flex justify-between text-slate-400">
              <span className="uppercase font-bold text-[10px] tracking-wider">
                Auto-Hide After Duration
              </span>
              <span className="font-mono text-emerald-400">
                {graphic.duration ? `${graphic.duration}s` : 'Manual Dismiss'}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="30"
              step="1"
              value={graphic.duration || 0}
              onChange={(e) =>
                onUpdateGraphicConfig({
                  duration: parseInt(e.target.value),
                })
              }
              className="w-full accent-emerald-500"
            />
            <p className="text-[10px] text-slate-500 italic mt-1">
              Set to 0s to keep overlay permanently visible until manually taken off air.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
