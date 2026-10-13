import React, { useState, useEffect, useRef } from 'react';
import { Match, SportType, BroadcastConfig } from '../../types';
import { BroadcastCanvas } from './BroadcastCanvas';
import { StudioGraphicElementRenderer } from '../admin/graphics/StudioGraphicElementRenderer';
import { getBroadcastPreviewData } from '../../utils/sampleBroadcastData';
import {
  X,
  Eye,
  EyeOff,
  Plus,
  Play,
  Tv,
  AlertTriangle,
  RotateCw,
} from 'lucide-react';

export interface GraphicControlItem {
  id: string;
  name: string;
  category: 'MATCH_DATA' | 'PLAYER' | 'TEAM' | 'EVENT_POPUP' | 'CUSTOM_STUDIO' | 'SCENE';
  sport?: SportType;
  description: string;
  defaultDuration: number;
  isScene?: boolean;
  isCustomStudio?: boolean;
  studioGraphic?: any;
  scene?: any;
  badge?: string;
  icon?: string;
  targetId?: string;
  targetName?: string;
  isUniversal?: boolean;
}

interface BroadcastGraphicPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: GraphicControlItem | null;
  sport: SportType;
  matchId?: string;
  match?: Match | null;
  scoringState?: any;
  broadcastConfig?: BroadcastConfig | null;
  isActive: boolean;
  onToggleActive: (item: GraphicControlItem) => void;
  onCue?: (item: GraphicControlItem) => void;
  onPlay?: (item: GraphicControlItem) => void;
}

/**
 * Isolated React Error Boundary for the Preview Stage.
 * Ensures that if a single graphic's template or dynamic bindings fail,
 * the main Broadcast Control Center is never crashed and does not show "App Error".
 */
interface PreviewErrorBoundaryProps {
  children: React.ReactNode;
  onClose: () => void;
  graphicName?: string;
  onRetry?: () => void;
}

interface PreviewErrorBoundaryState {
  hasError: boolean;
  errorMessage?: string;
}

export class PreviewErrorBoundary extends React.Component<PreviewErrorBoundaryProps, PreviewErrorBoundaryState> {
  override state: PreviewErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: any): PreviewErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unknown render error',
    };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(
      `[Broadcast Graphic Preview] Rendering error caught by boundary for graphic "${this.props.graphicName}":`,
      error,
      errorInfo
    );
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: undefined });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-4 sm:p-8 text-center w-full h-full min-h-[220px] sm:min-h-[300px] bg-slate-950/95 rounded-xl border border-red-800/60 pointer-events-auto">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-red-950/80 border border-red-700/80 flex items-center justify-center text-red-400 mb-2 sm:mb-3 shadow-lg">
            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <h4 className="text-sm sm:text-base font-black text-white uppercase tracking-wider mb-1">
            Preview unavailable for this graphic
          </h4>
          <p className="text-[11px] sm:text-xs text-slate-400 max-w-md mb-4 sm:mb-5 leading-relaxed px-2">
            The graphic template or dynamic telemetry could not be rendered safely. The live broadcast engine and master control center remain unaffected.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 text-xs font-bold uppercase transition cursor-pointer min-h-[40px]"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Retry Preview</span>
            </button>
            <button
              onClick={this.props.onClose}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 active:bg-red-700 text-white text-xs font-bold uppercase transition cursor-pointer min-h-[40px]"
            >
              Close
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export const BroadcastGraphicPreviewModal: React.FC<BroadcastGraphicPreviewModalProps> = ({
  isOpen,
  onClose,
  item,
  sport,
  matchId,
  match,
  scoringState,
  broadcastConfig,
  isActive,
  onToggleActive,
  onCue,
  onPlay,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageScale, setStageScale] = useState<number>(0.5);
  const [dataSource, setDataSource] = useState<'SAMPLE' | 'LIVE'>('SAMPLE');
  const [retryNonce, setRetryNonce] = useState<number>(0);

  const isLiveAvailable = Boolean(match && scoringState && match.status !== 'CANCELLED');

  // Handle preview lifecycle: reset clean state when graphic changes or opens
  useEffect(() => {
    if (isOpen) {
      setRetryNonce((n) => n + 1);
      // Default to LIVE only if valid telemetry exists, otherwise SAMPLE
      setDataSource(isLiveAvailable ? 'LIVE' : 'SAMPLE');
    }
  }, [isOpen, item?.id, isLiveAvailable]);

  // Calculate 1920x1080 stage scale dynamically across window resizes, container resizes, and orientation changes
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    const updateScale = () => {
      if (!isMounted || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        // Calculate exact proportional scale maintaining 16:9 aspect ratio
        const scaleX = rect.width / 1920;
        const scaleY = rect.height / 1080;
        const s = Math.min(scaleX, scaleY);
        if (s > 0) {
          setStageScale(s);
        }
      }
    };

    // Immediate calculation + requestAnimationFrame to guarantee layout pass completion
    updateScale();
    const rafId = requestAnimationFrame(updateScale);

    const handleResize = () => {
      requestAnimationFrame(updateScale);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      isMounted = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [isOpen, item]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Section 5: Handle Missing or Invalid Graphic Safely
  if (!item || !item.id) {
    return (
      <div
        id="sports-pulse-graphic-preview-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Broadcast Graphic Preview"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md"
        style={{
          paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))',
          paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
          paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))',
          paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))',
        }}
      >
        <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-5 sm:p-6 text-center shadow-2xl mx-2">
          <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 mx-auto mb-3">
            <Tv className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white mb-2">Graphic preview unavailable</h3>
          <p className="text-xs text-slate-400 mb-6">No graphic item was selected for preview.</p>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white text-xs font-bold uppercase transition cursor-pointer min-h-[42px]"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Section 5: Check if custom studio template or scene layers could not be loaded
  const isTemplateMissing =
    (item.isCustomStudio && (!item.studioGraphic || !Array.isArray(item.studioGraphic.elements))) ||
    (item.isScene && (!item.scene || !Array.isArray(item.scene.layers)));

  // Section 3: Obtain normalized sample preview data
  const effectiveDataSource = isLiveAvailable && dataSource === 'LIVE' ? 'LIVE' : 'SAMPLE';

  const previewData = getBroadcastPreviewData({
    sport: item.sport || sport,
    match: effectiveDataSource === 'LIVE' ? match : null,
    scoringState: effectiveDataSource === 'LIVE' ? scoringState : null,
    graphic: item,
  });

  const previewMatch = effectiveDataSource === 'LIVE' && match ? match : previewData.match;
  const previewScoring = effectiveDataSource === 'LIVE' && scoringState ? scoringState : previewData.scoringState;
  const previewConfig = broadcastConfig ? { ...previewData.config, ...broadcastConfig } : previewData.config;

  // If item is scorebug or has specific override, enforce visibility in previewConfig
  if (item.category === 'MATCH_DATA' && (item.id.includes('scorebug') || item.targetId?.includes('SCOREBUG'))) {
    previewConfig.scoreboardVisible = true;
  } else if (item.id.includes('sponsor')) {
    previewConfig.sponsorVisible = true;
  } else if (item.id.includes('player-lower-third') || item.category === 'PLAYER') {
    previewConfig.playerLowerThirdVisible = true;
  }

  return (
    <div
      id="sports-pulse-graphic-preview-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Broadcast Graphic Preview"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-150 overflow-y-auto overflow-x-hidden"
      style={{
        paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(0.5rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(0.5rem, env(safe-area-inset-right, 0px))',
      }}
    >
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[96dvh] sm:max-h-[92vh] my-auto">
        {/* Modal Top Header Bar */}
        <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3.5 bg-slate-950 border-b border-slate-800 gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="p-1.5 sm:p-2 rounded-lg bg-cyan-950/80 border border-cyan-800/80 text-cyan-400 shrink-0">
              <Tv className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider truncate max-w-[140px] xs:max-w-[200px] sm:max-w-[320px]">
                  {item.name}
                </h3>
                {item.badge && (
                  <span className="text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-bold uppercase shrink-0">
                    {item.badge}
                  </span>
                )}
                <span className="text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-cyan-400 border border-slate-700 shrink-0">
                  {item.sport || 'UNIVERSAL'}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate max-w-full hidden xs:block">{item.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Live Data vs Sample Toggle (when match is connected) */}
            {isLiveAvailable && (
              <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-900 border border-slate-700 rounded-lg p-0.5 text-xs font-mono">
                <button
                  onClick={() => setDataSource('SAMPLE')}
                  className={`px-1.5 sm:px-2 py-1 rounded text-[10px] sm:text-[11px] font-bold transition cursor-pointer min-h-[32px] sm:min-h-[auto] flex items-center ${
                    dataSource === 'SAMPLE'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  SAMPLE
                </button>
                <button
                  onClick={() => setDataSource('LIVE')}
                  className={`px-1.5 sm:px-2 py-1 rounded text-[10px] sm:text-[11px] font-bold transition cursor-pointer min-h-[32px] sm:min-h-[auto] flex items-center ${
                    dataSource === 'LIVE'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  LIVE
                </button>
              </div>
            )}

            {/* Close Button - Guaranteed visible, never clipped, touch friendly */}
            <button
              onClick={onClose}
              className="p-2 sm:p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 hover:text-white transition cursor-pointer min-w-[38px] min-h-[38px] flex items-center justify-center shrink-0 border border-slate-700/60"
              title="Close Preview"
              aria-label="Close Preview Modal"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Modal Notice & Mode Banner */}
        <div className="flex flex-wrap items-center justify-between px-3 sm:px-5 py-1.5 sm:py-2 bg-slate-950/70 border-b border-slate-800/80 text-xs font-mono gap-1.5 shrink-0">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded-full font-black text-[10px] flex items-center gap-1.5 shrink-0 ${
                effectiveDataSource === 'SAMPLE'
                  ? 'bg-amber-950/80 text-amber-300 border border-amber-800/80'
                  : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  effectiveDataSource === 'SAMPLE' ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'
                }`}
              />
              {effectiveDataSource === 'SAMPLE'
                ? 'OFFLINE PREVIEW — SAMPLE DATA'
                : 'LIVE DATA PREVIEW'}
            </span>
            <span className="text-slate-500 text-[10px] sm:text-[11px] hidden md:inline">
              1920 × 1080 Native Canvas (OBS / vMix Hardware Alpha Transparency)
            </span>
          </div>

          <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
            <span className="text-[10px] sm:text-[11px] text-slate-400">STATUS:</span>
            <span
              className={`text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded font-mono shrink-0 ${
                isActive
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {isActive ? 'ACTIVE IN BROADCAST' : 'HIDDEN / NOT SELECTED'}
            </span>
          </div>
        </div>

        {/* 1920x1080 Stage Viewport with Transparent Checkerboard Pattern */}
        <div className="relative flex-1 p-2 sm:p-4 md:p-5 flex items-center justify-center overflow-hidden bg-slate-950 min-h-[180px]">
          <div
            ref={containerRef}
            className="relative w-full max-w-full aspect-video max-h-[50vh] sm:max-h-[58vh] md:max-h-[62vh] rounded-lg sm:rounded-xl border border-slate-800/90 overflow-hidden shadow-2xl flex items-center justify-center bg-[radial-gradient(#1e293b_1.5px,transparent_1.5px)] [background-size:16px_16px] bg-slate-950"
          >
            {/* Section 5: If template could not be loaded */}
            {isTemplateMissing ? (
              <div className="flex flex-col items-center justify-center p-4 sm:p-8 text-center w-full h-full min-h-[220px]">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-amber-950/80 border border-amber-700/80 flex items-center justify-center text-amber-400 mb-2 sm:mb-3 shadow-lg">
                  <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h4 className="text-sm sm:text-base font-bold text-white mb-1">
                  Graphic template could not be loaded.
                </h4>
                <p className="text-[11px] sm:text-xs text-slate-400 max-w-sm mb-4 sm:mb-5 px-2">
                  The graphic definition was not found or contains empty layers.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                  <button
                    onClick={() => setRetryNonce((n) => n + 1)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 text-xs font-bold uppercase transition cursor-pointer min-h-[40px]"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Retry</span>
                  </button>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white text-xs font-bold uppercase transition cursor-pointer min-h-[40px]"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              /* Section 2: Isolated Error Boundary wraps the entire preview stage */
              <PreviewErrorBoundary
                key={`${item.id}-${effectiveDataSource}-${retryNonce}`}
                graphicName={item.name}
                onClose={onClose}
                onRetry={() => setRetryNonce((n) => n + 1)}
              >
                {/* Absolute 1920x1080 Virtual Canvas scaled down smoothly maintaining 16:9 ratio */}
                <div
                  style={{
                    width: '1920px',
                    height: '1080px',
                    transform: `scale(${stageScale})`,
                    transformOrigin: 'center center',
                    position: 'absolute',
                  }}
                  className="pointer-events-none select-none"
                >
                  {/* If Custom Studio Graphic */}
                  {item.isCustomStudio && item.studioGraphic && Array.isArray(item.studioGraphic.elements) ? (
                    <div className="relative w-[1920px] h-[1080px]">
                      {[...item.studioGraphic.elements]
                        .filter((el) => el && typeof el === 'object' && el.type)
                        .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
                        .map((el) => (
                          <StudioGraphicElementRenderer
                            key={el.id || Math.random().toString()}
                            element={el}
                            isSimulatingData={false}
                            dataContext={previewData.dataContext}
                          />
                        ))}
                    </div>
                  ) : item.isScene && item.scene && Array.isArray(item.scene.layers) ? (
                    <div className="relative w-[1920px] h-[1080px]">
                      {[...item.scene.layers]
                        .filter((l) => l && l.enabled && l.graphic && Array.isArray(l.graphic.elements))
                        .sort((a, b) => (a.order || 0) - (b.order || 0))
                        .map((layer) => (
                          <div
                            key={layer.id || Math.random().toString()}
                            style={{
                              position: 'absolute',
                              inset: 0,
                              opacity: typeof layer.opacity === 'number' ? layer.opacity : 1,
                              transform: `translate(${layer.offsetX || 0}px, ${layer.offsetY || 0}px) scale(${layer.scale ?? 1})`,
                              transformOrigin: 'center center',
                              zIndex: layer.order || 1,
                            }}
                          >
                            {(layer.graphic?.elements || [])
                              .filter((el: any) => el && typeof el === 'object' && el.type)
                              .sort((a: any, b: any) => (a.zIndex || 0) - (b.zIndex || 0))
                              .map((el: any) => (
                                <StudioGraphicElementRenderer
                                  key={el.id || Math.random().toString()}
                                  element={el}
                                  isSimulatingData={false}
                                  dataContext={previewData.dataContext}
                                />
                              ))}
                          </div>
                        ))}
                    </div>
                  ) : (
                    /* BroadcastCanvas handles all standard scorebugs, events, and overlays */
                    <BroadcastCanvas
                      previewMode={true}
                      previewConfigOverride={previewConfig}
                      previewScoringStateOverride={previewScoring}
                      previewOnAirItemOverride={previewData.onAirItem}
                      previewMatchOverride={previewMatch}
                      previewActiveEventOverride={previewData.activeEvent}
                    />
                  )}
                </div>
              </PreviewErrorBoundary>
            )}
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-3 sm:px-5 py-2.5 sm:py-3.5 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {/* Toggle Active / Hide from broadcast list */}
            <button
              onClick={() => onToggleActive(item)}
              className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-lg font-black text-xs uppercase tracking-wider transition cursor-pointer min-h-[42px] w-full sm:w-auto ${
                isActive
                  ? 'bg-amber-950/80 hover:bg-amber-900 active:bg-amber-800 text-amber-300 border border-amber-700/80 shadow-sm'
                  : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-md shadow-emerald-950/50'
              }`}
            >
              {isActive ? (
                <>
                  <EyeOff className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>HIDE FROM BROADCAST LIST</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 text-white shrink-0" />
                  <span>ADD TO ACTIVE BROADCAST</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end">
            {/* Cue to Preview PST */}
            {onCue && (
              <button
                onClick={() => {
                  onCue(item);
                  onClose();
                }}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs uppercase transition cursor-pointer min-h-[42px]"
                title="Cue to Preview Bus"
              >
                <Eye className="w-3.5 h-3.5 shrink-0" />
                <span>CUE TO PREVIEW</span>
              </button>
            )}

            {/* Play Directly Live PGM */}
            {onPlay && matchId && (
              <button
                onClick={() => {
                  onPlay(item);
                  onClose();
                }}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-black text-xs uppercase transition cursor-pointer min-h-[42px]"
                title="Take Live to Program Bus"
              >
                <Play className="w-3.5 h-3.5 fill-white shrink-0" />
                <span>TAKE LIVE</span>
              </button>
            )}

            {/* Dismiss */}
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 hover:text-white font-bold text-xs uppercase transition cursor-pointer min-h-[42px] border border-slate-700/60"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
