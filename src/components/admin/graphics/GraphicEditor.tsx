import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StudioGraphic,
  GraphicElement,
  GraphicElementType,
  SportType,
  GraphicResolutionPreset,
  ResolutionConversionStrategy,
} from '../../../types';
import { api } from '../../../services/api';
import { SPORT_GRAPHIC_CATEGORIES } from '../../../constants/studioGraphicsConstants';
import { GraphicCanvasPreview } from './GraphicCanvasPreview';
import { GraphicLayersPanel } from './GraphicLayersPanel';
import { GraphicElementInspector } from './GraphicElementInspector';
import { ResolutionControlModal } from './ResolutionControlModal';
import { ResolutionSelectorDropdown } from './ResolutionSelectorDropdown';
import {
  ResolutionTransformConfirmModal,
  PendingResolutionChange,
} from './ResolutionTransformConfirmModal';
import { SaveGraphicModal } from './SaveGraphicModal';
import { SaveSuccessModal } from './SaveSuccessModal';
import { UnsavedChangesModal } from './UnsavedChangesModal';
import { InsertLiveDataModal } from './InsertLiveDataModal';
import {
  RESOLUTION_PRESETS,
  detectAspectRatio,
  detectOrientation,
  detectResolutionPreset,
  scaleGraphicElements,
} from '../../../utils/graphicResolutionUtils';
import {
  Save,
  ArrowLeft,
  Copy,
  Sparkles,
  Check,
  Palette,
  Eye,
  Sliders,
  Tv,
  Layers,
  Zap,
  Radio,
  RefreshCw,
  Database,
  Edit3,
  X,
  Play,
  Maximize2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Monitor,
  Smartphone,
  Square as SquareIcon,
  Undo2,
  Redo2,
  Trash2,
  Plus,
  FilePlus,
  FolderOpen,
} from 'lucide-react';

interface GraphicEditorProps {
  initialGraphic: StudioGraphic;
  onBack: () => void;
  onSaveSuccess: (saved: StudioGraphic) => void;
  allGraphics?: StudioGraphic[];
  onCreateNew?: () => void;
}

export const GraphicEditor: React.FC<GraphicEditorProps> = ({
  initialGraphic,
  onBack,
  onSaveSuccess,
  allGraphics = [],
  onCreateNew,
}) => {
  const [graphic, setGraphic] = useState<StudioGraphic>(initialGraphic);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    initialGraphic.elements.length > 0 ? initialGraphic.elements[0].id : null
  );
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>(
    initialGraphic.elements.length > 0 ? [initialGraphic.elements[0].id] : []
  );

  // Undo / Redo History State Engine
  const [history, setHistory] = useState<StudioGraphic[]>([initialGraphic]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  const [saving, setSaving] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [deletedToast, setDeletedToast] = useState<{ message: string; timestamp: number } | null>(
    null
  );
  const [previewBg, setPreviewBg] = useState<'transparent' | 'stadium' | 'pitch' | 'court' | 'dark'>(
    'transparent'
  );
  const [isSimulatingData, setIsSimulatingData] = useState<boolean>(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // Save Modal, Save-As-New & Confirmation State
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [isSaveAsNewMode, setIsSaveAsNewMode] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [savedSuccessData, setSavedSuccessData] = useState<{
    graphic: StudioGraphic;
    isNew: boolean;
  } | null>(null);

  // Unsaved Changes Modal State
  const [showUnsavedModal, setShowUnsavedModal] = useState<boolean>(false);
  const [pendingNavigationAction, setPendingNavigationAction] = useState<(() => void) | null>(null);

  // 3-Panel Resizable Layout State
  const [leftPanelWidth, setLeftPanelWidth] = useState<number>(270);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState<boolean>(false);
  const [rightPanelWidth, setRightPanelWidth] = useState<number>(320);
  const [isRightCollapsed, setIsRightCollapsed] = useState<boolean>(false);
  const [isDraggingSplitter, setIsDraggingSplitter] = useState<'LEFT' | 'RIGHT' | null>(null);

  // Resolution Management & Confirmation State
  const [showResolutionModal, setShowResolutionModal] = useState<boolean>(false);
  const [pendingResolution, setPendingResolution] = useState<PendingResolutionChange | null>(null);
  const [showTransformModal, setShowTransformModal] = useState<boolean>(false);

  // Dynamic Data Binding Context Engine State
  const [dataMode, setDataMode] = useState<'SAMPLE' | 'MATCH' | 'LIVE'>('SAMPLE');
  const [availableMatches, setAvailableMatches] = useState<
    Array<{
      id: string;
      name: string;
      sport: string;
      status: string;
      teamAName: string;
      teamBName: string;
      tournamentName?: string;
    }>
  >([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');
  const [dataContext, setDataContext] = useState<any>(null);
  const [customDataOverrides, setCustomDataOverrides] = useState<Record<string, string>>({});
  const [showOverrideModal, setShowOverrideModal] = useState<boolean>(false);
  const [showInsertLiveDataModal, setShowInsertLiveDataModal] = useState<boolean>(false);
  const [overrideInputKey, setOverrideInputKey] = useState<string>('');
  const [overrideInputValue, setOverrideInputValue] = useState<string>('');
  const [isRefreshingContext, setIsRefreshingContext] = useState<boolean>(false);
  const [liveStreamStatus, setLiveStreamStatus] = useState<'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'IDLE'>('IDLE');
  const [lastLiveSyncTime, setLastLiveSyncTime] = useState<Date | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  const isNewGraphic = !allGraphics.some((g) => g.id === graphic.id);

  // Browser navigation warning for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const canvasWidth = Number(graphic.width) || Number(graphic.canvas?.width) || 1920;
  const canvasHeight = Number(graphic.height) || Number(graphic.canvas?.height) || 1080;
  const currentAspectRatio = graphic.aspectRatio || detectAspectRatio(canvasWidth, canvasHeight);
  const currentPreset = graphic.resolutionPreset || detectResolutionPreset(canvasWidth, canvasHeight);
  const currentOrientation = graphic.orientation || detectOrientation(canvasWidth, canvasHeight);

  // Helper to commit graphic changes and record history
  const commitGraphicChange = useCallback(
    (newGraphic: StudioGraphic | ((prev: StudioGraphic) => StudioGraphic)) => {
      setGraphic((prev) => {
        const next = typeof newGraphic === 'function' ? newGraphic(prev) : newGraphic;
        setHistory((prevHist) => {
          const truncated = prevHist.slice(0, historyIndex + 1);
          return [...truncated, next].slice(-30);
        });
        setHistoryIndex((prevIdx) => Math.min(29, prevIdx + 1));
        return next;
      });
      setHasUnsavedChanges(true);
    },
    [historyIndex]
  );

  // Undo Handler
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      const targetState = history[nextIndex];
      setHistoryIndex(nextIndex);
      setGraphic(targetState);
      setHasUnsavedChanges(true);
    }
  }, [history, historyIndex]);

  // Redo Handler
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const targetState = history[nextIndex];
      setHistoryIndex(nextIndex);
      setGraphic(targetState);
      setHasUnsavedChanges(true);
    }
  }, [history, historyIndex]);

  // Window Undo/Redo & Delete keyboard listeners
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        activeTag === 'select' ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Delete / Backspace keys to delete selected element
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!selectedElementId && selectedElementIds.length === 0) return;
        e.preventDefault();
        if (selectedElementIds.length > 1) {
          handleBatchDelete();
        } else if (selectedElementId) {
          handleDeleteElement(selectedElementId);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [handleUndo, handleRedo, selectedElementId, selectedElementIds]);

  // Auto-dismiss deleted toast
  useEffect(() => {
    if (!deletedToast) return;
    const timer = setTimeout(() => {
      setDeletedToast(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [deletedToast]);

  // Load available matches for dynamic binding
  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await api.getContextMatches();
        if (res.matches && res.matches.length > 0) {
          setAvailableMatches(res.matches);
          const matchingSportMatch = res.matches.find(
            (m) => m.sport.toUpperCase() === graphic.sport.toUpperCase()
          );
          if (matchingSportMatch) {
            setSelectedMatchId(matchingSportMatch.id);
          } else {
            setSelectedMatchId(res.matches[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load context matches:', err);
      }
    };

    fetchMatches();
  }, [graphic.sport]);

  // Load data context based on mode and selected match
  const loadDataContext = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshingContext(true);
    try {
      if (dataMode === 'SAMPLE') {
        const res = await api.getSampleDataContext(graphic.sport);
        if (res.context) {
          setDataContext(res.context);
          setLastLiveSyncTime(new Date());
        }
      } else if ((dataMode === 'MATCH' || dataMode === 'LIVE') && selectedMatchId) {
        const res = await api.getMatchDataContext(selectedMatchId);
        if (res.context) {
          setDataContext(res.context);
          setLastLiveSyncTime(new Date());
        }
      }
    } catch (err) {
      console.error('Failed to load data context:', err);
    } finally {
      if (!silent) setIsRefreshingContext(false);
    }
  }, [dataMode, selectedMatchId, graphic.sport]);

  useEffect(() => {
    loadDataContext();
  }, [loadDataContext]);

  // Real-Time Server-Sent Events (SSE) Stream Integration for LIVE Data Mode
  useEffect(() => {
    if (dataMode !== 'LIVE' || !selectedMatchId) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      setLiveStreamStatus('IDLE');
      return;
    }

    let isSubscribed = true;
    setLiveStreamStatus('CONNECTING');

    const connectSSE = () => {
      if (!isSubscribed) return;

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      try {
        const sseUrl = `/api/matches/${selectedMatchId}/scoring/stream`;
        const es = new EventSource(sseUrl);
        eventSourceRef.current = es;

        es.onopen = () => {
          if (!isSubscribed) return;
          setLiveStreamStatus('CONNECTED');
          setLastLiveSyncTime(new Date());
        };

        es.onmessage = (_event) => {
          if (!isSubscribed) return;
          try {
            // Upon scoring update, refresh data context silently to keep variables synchronized
            loadDataContext(true);
            setLastLiveSyncTime(new Date());
          } catch (parseErr) {
            console.error('Error handling SSE live score update:', parseErr);
          }
        };

        es.onerror = (_err) => {
          if (!isSubscribed) return;
          setLiveStreamStatus('DISCONNECTED');
          if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
          }

          // Schedule reconnection with backoff
          if (!reconnectTimeoutRef.current) {
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectTimeoutRef.current = null;
              if (isSubscribed && dataMode === 'LIVE') {
                setLiveStreamStatus('CONNECTING');
                connectSSE();
              }
            }, 3000);
          }
        };
      } catch (err) {
        console.error('Failed to initialize EventSource:', err);
        setLiveStreamStatus('DISCONNECTED');
      }
    };

    connectSSE();

    return () => {
      isSubscribed = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [dataMode, selectedMatchId, loadDataContext]);

  // Handle Splitter Resizing with Window Pointer Capture
  const handleLeftSplitterPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDraggingSplitter('LEFT');
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handleRightSplitterPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDraggingSplitter('RIGHT');
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  useEffect(() => {
    if (!isDraggingSplitter) return;

    const onPointerMove = (e: PointerEvent) => {
      if (isDraggingSplitter === 'LEFT') {
        const newW = Math.max(200, Math.min(460, e.clientX));
        setLeftPanelWidth(newW);
        if (isLeftCollapsed && newW > 200) setIsLeftCollapsed(false);
      } else if (isDraggingSplitter === 'RIGHT') {
        const newW = Math.max(260, Math.min(520, window.innerWidth - e.clientX));
        setRightPanelWidth(newW);
        if (isRightCollapsed && newW > 260) setIsRightCollapsed(false);
      }
    };

    const onPointerUp = () => {
      setIsDraggingSplitter(null);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [isDraggingSplitter, isLeftCollapsed, isRightCollapsed]);

  // Selected element object reference
  const selectedElement =
    graphic.elements.find((el) => el.id === (selectedElementId || selectedElementIds[0])) || null;

  // Multi-element selection handler
  const handleSelectElement = (id: string | null, isMulti = false) => {
    if (!id) {
      setSelectedElementId(null);
      setSelectedElementIds([]);
      return;
    }

    if (isMulti) {
      setSelectedElementIds((prev) => {
        const exists = prev.includes(id);
        const next = exists ? prev.filter((item) => item !== id) : [...prev, id];
        setSelectedElementId(next.length > 0 ? next[next.length - 1] : null);
        return next;
      });
    } else {
      setSelectedElementId(id);
      setSelectedElementIds([id]);
    }
  };

  // Handle Save: If it's a new graphic, open the Save Modal to enter a name; if existing, save directly
  const handleSave = async () => {
    if (isNewGraphic) {
      setIsSaveAsNewMode(false);
      setShowSaveModal(true);
      return;
    }

    try {
      setSaving(true);
      const normalizedToSave: StudioGraphic = {
        ...graphic,
        name: graphic.name.trim() || 'Untitled Graphic',
        width: canvasWidth,
        height: canvasHeight,
        aspectRatio: currentAspectRatio,
        resolutionPreset: currentPreset,
        orientation: currentOrientation,
        canvas: {
          ...graphic.canvas,
          width: canvasWidth,
          height: canvasHeight,
        },
      };

      const res = await api.updateStudioGraphic(graphic.id, normalizedToSave);
      setGraphic(res.graphic);
      setSaveToast(`Graphic "${res.graphic.name}" saved successfully!`);
      setHasUnsavedChanges(false);
      onSaveSuccess(res.graphic);
      setTimeout(() => setSaveToast(null), 3000);
    } catch (err: any) {
      console.error('Failed to save graphic:', err);
      // Fallback to open modal in case it needs recreation
      setIsSaveAsNewMode(false);
      setShowSaveModal(true);
    } finally {
      setSaving(false);
    }
  };

  // Handle Save As New: Always open modal to input a new custom name
  const handleSaveAsNew = () => {
    setIsSaveAsNewMode(true);
    setShowSaveModal(true);
  };

  // Handle Save confirmed from SaveGraphicModal
  const handleConfirmModalSave = async (saveData: {
    name: string;
    sport: SportType;
    category: string;
    description: string;
    tags: string[];
    presetName?: string;
    overwriteExistingId?: string;
  }) => {
    const normalizedToSave: StudioGraphic = {
      ...graphic,
      name: saveData.name,
      sport: saveData.sport,
      category: saveData.category,
      description: saveData.description,
      tags: saveData.tags,
      presetName: saveData.presetName,
      width: canvasWidth,
      height: canvasHeight,
      aspectRatio: currentAspectRatio,
      resolutionPreset: currentPreset,
      orientation: currentOrientation,
      canvas: {
        ...graphic.canvas,
        width: canvasWidth,
        height: canvasHeight,
      },
    };

    if (saveData.overwriteExistingId) {
      const res = await api.updateStudioGraphic(saveData.overwriteExistingId, {
        ...normalizedToSave,
        id: saveData.overwriteExistingId,
      });
      setGraphic(res.graphic);
      setHasUnsavedChanges(false);
      onSaveSuccess(res.graphic);
      setSavedSuccessData({ graphic: res.graphic, isNew: false });
      setShowSuccessModal(true);
      return;
    }

    if (isSaveAsNewMode || isNewGraphic) {
      const { id, ...dataWithoutId } = normalizedToSave;
      const res = await api.createStudioGraphic(dataWithoutId);
      setGraphic(res.graphic);
      setHasUnsavedChanges(false);
      onSaveSuccess(res.graphic);
      setSavedSuccessData({ graphic: res.graphic, isNew: true });
      setShowSuccessModal(true);
    } else {
      const res = await api.updateStudioGraphic(graphic.id, normalizedToSave);
      setGraphic(res.graphic);
      setHasUnsavedChanges(false);
      onSaveSuccess(res.graphic);
      setSavedSuccessData({ graphic: res.graphic, isNew: false });
      setShowSuccessModal(true);
    }
  };

  // Safe Navigation checks
  const handleBackWithCheck = () => {
    if (hasUnsavedChanges) {
      setPendingNavigationAction(() => onBack);
      setShowUnsavedModal(true);
    } else {
      onBack();
    }
  };

  const handleCreateNewWithCheck = () => {
    if (hasUnsavedChanges) {
      setPendingNavigationAction(() => () => {
        if (onCreateNew) onCreateNew();
      });
      setShowUnsavedModal(true);
    } else {
      if (onCreateNew) onCreateNew();
    }
  };

  const handleSaveAndProceed = async () => {
    setShowUnsavedModal(false);
    if (isNewGraphic) {
      setIsSaveAsNewMode(false);
      setShowSaveModal(true);
    } else {
      await handleSave();
      if (pendingNavigationAction) {
        pendingNavigationAction();
        setPendingNavigationAction(null);
      }
    }
  };

  const handleDiscardAndProceed = () => {
    setShowUnsavedModal(false);
    setHasUnsavedChanges(false);
    if (pendingNavigationAction) {
      pendingNavigationAction();
      setPendingNavigationAction(null);
    }
  };

  // Trigger resolution change: If there are elements and resolution differs, show confirmation modal
  const handleApplyResolution = (updatedGraphic: StudioGraphic) => {
    const targetW = Number(updatedGraphic.width) || Number(updatedGraphic.canvas?.width) || 1920;
    const targetH = Number(updatedGraphic.height) || Number(updatedGraphic.canvas?.height) || 1080;

    if (targetW === canvasWidth && targetH === canvasHeight) {
      commitGraphicChange(updatedGraphic);
      return;
    }

    if (graphic.elements && graphic.elements.length > 0) {
      setPendingResolution({
        width: targetW,
        height: targetH,
        aspectRatio: updatedGraphic.aspectRatio || detectAspectRatio(targetW, targetH),
        resolutionPreset: updatedGraphic.resolutionPreset || detectResolutionPreset(targetW, targetH),
        orientation: (updatedGraphic.orientation || detectOrientation(targetW, targetH)) as any,
      });
      setShowTransformModal(true);
    } else {
      // No elements, update canvas immediately
      commitGraphicChange(updatedGraphic);
      setSaveToast(`Canvas switched to ${targetW} × ${targetH} (${updatedGraphic.aspectRatio || '16:9'})`);
      setTimeout(() => setSaveToast(null), 3000);
    }
  };

  // Confirm resolution transformation strategy from modal
  const handleConfirmTransform = (strategy: ResolutionConversionStrategy) => {
    if (!pendingResolution) return;

    const oldW = canvasWidth;
    const oldH = canvasHeight;
    const newW = pendingResolution.width;
    const newH = pendingResolution.height;

    const transformedElements = scaleGraphicElements(
      graphic.elements,
      oldW,
      oldH,
      newW,
      newH,
      strategy
    );

    const updated: StudioGraphic = {
      ...graphic,
      width: newW,
      height: newH,
      aspectRatio: pendingResolution.aspectRatio,
      resolutionPreset: pendingResolution.resolutionPreset,
      customResolution: { width: newW, height: newH },
      orientation: pendingResolution.orientation as any,
      canvas: {
        ...graphic.canvas,
        width: newW,
        height: newH,
      },
      elements: transformedElements,
      updatedAt: new Date().toISOString(),
    };

    commitGraphicChange(updated);
    setShowTransformModal(false);
    setPendingResolution(null);
    setSaveToast(`Canvas resolution updated to ${newW} × ${newH} (${strategy})`);
    setTimeout(() => setSaveToast(null), 3000);
  };

  // Helper to build a new GraphicElement with smart defaults centered on dynamic canvas
  const createDefaultElement = (
    type: GraphicElementType,
    box?: { x: number; y: number; width: number; height: number }
  ): GraphicElement => {
    const newId = `el-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const nextZ = Math.max(0, ...graphic.elements.map((e) => e.zIndex || 0)) + 1;

    const defaultW = box?.width ?? Math.min(300, Math.round(canvasWidth * 0.4));
    const defaultH = box?.height ?? Math.min(160, Math.round(canvasHeight * 0.2));
    const defaultX = box?.x ?? Math.round(canvasWidth / 2 - defaultW / 2);
    const defaultY = box?.y ?? Math.round(canvasHeight / 2 - defaultH / 2);

    let el: GraphicElement = {
      id: newId,
      name: `${type.charAt(0) + type.slice(1).toLowerCase()} Layer`,
      type,
      x: defaultX,
      y: defaultY,
      width: defaultW,
      height: defaultH,
      zIndex: nextZ,
      visible: true,
      locked: false,
      opacity: 1,
      rotation: 0,
      transformMode: 'AUTO',
    };

    switch (type) {
      case 'TEXT':
        const textW = box?.width ?? Math.min(450, Math.round(canvasWidth * 0.6));
        const textH = box?.height ?? Math.min(80, Math.round(canvasHeight * 0.12));
        el = {
          ...el,
          name: 'Broadcast Text',
          width: textW,
          height: textH,
          x: box?.x ?? Math.round(canvasWidth / 2 - textW / 2),
          y: box?.y ?? Math.round(canvasHeight / 2 - textH / 2),
          text: 'BROADCAST TEXT',
          fontFamily: 'Montserrat',
          fontSize: Math.max(18, Math.round(canvasHeight * 0.035)),
          fontWeight: '800',
          textColor: '#ffffff',
          textAlign: 'center',
          textShadow: { enabled: true, color: 'rgba(0,0,0,0.8)', blur: 8, x: 2, y: 2 },
        };
        break;

      case 'RECTANGLE':
        const rectW = box?.width ?? Math.min(600, Math.round(canvasWidth * 0.7));
        const rectH = box?.height ?? Math.min(140, Math.round(canvasHeight * 0.16));
        el = {
          ...el,
          name: 'Card Container',
          width: rectW,
          height: rectH,
          x: box?.x ?? Math.round(canvasWidth / 2 - rectW / 2),
          y: box?.y ?? Math.round(canvasHeight / 2 - rectH / 2),
          fillColor: '#0f172a',
          borderColor: '#3b82f6',
          borderWidth: 2,
          borderRadius: 0,
          boxShadow: { enabled: true, color: 'rgba(0,0,0,0.6)', blur: 20, spread: 2, x: 0, y: 8 },
        };
        break;

      case 'ROUNDED_RECTANGLE':
        const rrectW = box?.width ?? Math.min(600, Math.round(canvasWidth * 0.7));
        const rrectH = box?.height ?? Math.min(140, Math.round(canvasHeight * 0.16));
        el = {
          ...el,
          name: 'Rounded Card',
          width: rrectW,
          height: rrectH,
          x: box?.x ?? Math.round(canvasWidth / 2 - rrectW / 2),
          y: box?.y ?? Math.round(canvasHeight / 2 - rrectH / 2),
          fillColor: '#0f172a',
          borderColor: '#10b981',
          borderWidth: 2,
          borderRadius: 16,
          boxShadow: { enabled: true, color: 'rgba(0,0,0,0.6)', blur: 20, spread: 2, x: 0, y: 8 },
        };
        break;

      case 'CIRCLE':
        const circDim = box?.width ?? Math.min(160, Math.round(canvasHeight * 0.2));
        el = {
          ...el,
          name: 'Circle Badge',
          width: circDim,
          height: circDim,
          fillColor: '#1e293b',
          borderColor: '#10b981',
          borderWidth: 3,
          borderRadius: 9999,
        };
        break;

      case 'BADGE':
        const badgeW = box?.width ?? Math.min(220, Math.round(canvasWidth * 0.25));
        const badgeH = box?.height ?? Math.min(220, Math.round(canvasHeight * 0.25));
        el = {
          ...el,
          name: 'Shield Emblem',
          width: badgeW,
          height: badgeH,
          badgeStyle: 'SHIELD',
          fillColor: '#0f172a',
          borderColor: '#fbbf24',
          borderWidth: 3,
        };
        break;

      case 'IMAGE':
        const imgW = box?.width ?? Math.min(200, Math.round(canvasWidth * 0.25));
        const imgH = box?.height ?? Math.min(200, Math.round(canvasHeight * 0.25));
        el = {
          ...el,
          name: 'Team Crest Image',
          width: imgW,
          height: imgH,
          imageUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&auto=format&fit=crop&q=80',
          imageFit: 'contain',
          borderRadius: 8,
          borderColor: '#38bdf8',
          borderWidth: 1,
        };
        break;

      case 'LIVE_DATA':
        const liveW = box?.width ?? Math.min(380, Math.round(canvasWidth * 0.45));
        const liveH = box?.height ?? Math.min(80, Math.round(canvasHeight * 0.12));
        el = {
          ...el,
          name: 'LIVE • Match Score',
          width: liveW,
          height: liveH,
          x: box?.x ?? Math.round(canvasWidth / 2 - liveW / 2),
          y: box?.y ?? Math.round(canvasHeight / 2 - liveH / 2),
          liveDataField: '{{SCORE}}',
          dynamicFieldKey: '{{SCORE}}',
          liveDataFallback: '0/0 (0.0 ov)',
          liveDataPrefix: '',
          liveDataSuffix: '',
          liveDataTransform: 'none',
          text: '{{SCORE}}',
          fontFamily: 'Montserrat, sans-serif',
          fontSize: Math.max(26, Math.round(canvasHeight * 0.045)),
          fontWeight: '900',
          textColor: '#ffffff',
          textAlign: 'center',
          textAlignVertical: 'middle',
          textShadow: { enabled: true, color: 'rgba(0,0,0,0.85)', blur: 8, x: 0, y: 2 },
        };
        break;

      case 'CRICKET_BALL_EVENT':
        const ballW = box?.width ?? Math.min(320, Math.round(canvasWidth * 0.35));
        const ballH = box?.height ?? Math.min(90, Math.round(canvasHeight * 0.12));
        el = {
          ...el,
          name: 'LIVE • Cricket Ball Event',
          width: ballW,
          height: ballH,
          x: box?.x ?? Math.round(canvasWidth / 2 - ballW / 2),
          y: box?.y ?? Math.round(canvasHeight / 2 - ballH / 2),
          liveDataField: '{{CURRENT_BALL_EVENT}}',
          dynamicFieldKey: '{{CURRENT_BALL_EVENT}}',
          liveDataFallback: '4',
          fillColor: '#059669',
          borderColor: '#10b981',
          borderWidth: 2,
          borderRadius: 16,
          textColor: '#ffffff',
          fontSize: 28,
          ballEventConfig: {
            displayMode: 'BADGE',
            colorPreset: 'DYNAMIC_COLOR',
            animationPreset: 'POP',
            sampleEvent: '4',
            sampleDismissal: 'NONE',
            sampleRuns: 4,
            showExtras: true,
            showDismissal: true,
            showOverNumber: true,
            showStriker: true,
            showBowler: false,
            badgeShape: 'ROUNDED',
            recentBallsCount: 6,
          },
        };
        break;

      default:
        break;
    }

    return el;
  };

  // Add Element to Canvas
  const handleAddElement = (type: GraphicElementType) => {
    const newElement = createDefaultElement(type);
    commitGraphicChange((prev) => ({
      ...prev,
      elements: [...prev.elements, newElement],
    }));
    setSelectedElementId(newElement.id);
    setSelectedElementIds([newElement.id]);
  };

  // Insert custom element from InsertLiveDataModal or template
  const handleInsertCustomElement = (elementData: Partial<GraphicElement>) => {
    const newId = `el-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const nextZ = Math.max(0, ...graphic.elements.map((e) => e.zIndex || 0)) + 1;

    const newElement: GraphicElement = {
      id: newId,
      name: elementData.name || 'Live Data Layer',
      type: elementData.type || 'LIVE_DATA',
      x: elementData.x ?? Math.round(canvasWidth / 2 - (elementData.width || 340) / 2),
      y: elementData.y ?? Math.round(canvasHeight / 2 - (elementData.height || 70) / 2),
      width: elementData.width || 340,
      height: elementData.height || 70,
      zIndex: nextZ,
      visible: elementData.visible ?? true,
      locked: elementData.locked ?? false,
      opacity: elementData.opacity ?? 1,
      rotation: elementData.rotation ?? 0,
      transformMode: 'AUTO',
      ...elementData,
    };

    commitGraphicChange((prev) => ({
      ...prev,
      elements: [...prev.elements, newElement],
    }));
    setSelectedElementId(newElement.id);
    setSelectedElementIds([newElement.id]);
    setSaveToast(`Placed "${newElement.name}" onto canvas`);
    setTimeout(() => setSaveToast(null), 2500);
  };

  // Add Shape drawn interactively via canvas rubberband
  const handleAddDrawnShape = (
    type: GraphicElementType,
    box: { x: number; y: number; width: number; height: number }
  ) => {
    const newElement = createDefaultElement(type, box);
    commitGraphicChange((prev) => ({
      ...prev,
      elements: [...prev.elements, newElement],
    }));
    setSelectedElementId(newElement.id);
    setSelectedElementIds([newElement.id]);
  };

  // Update Element Properties
  const handleUpdateElement = (updated: Partial<GraphicElement>) => {
    if (!selectedElementId) return;

    commitGraphicChange((prev) => ({
      ...prev,
      elements: prev.elements.map((el) =>
        el.id === selectedElementId ? { ...el, ...updated } : el
      ),
    }));
  };

  // Update element transform (coordinates, width, height, rotation)
  const handleUpdateElementTransform = (
    id: string,
    updates: { x?: number; y?: number; width?: number; height?: number; rotation?: number }
  ) => {
    setGraphic((prev) => ({
      ...prev,
      elements: prev.elements.map((el) =>
        el.id === id ? { ...el, ...updates, transformMode: 'MANUAL' } : el
      ),
    }));
    setHasUnsavedChanges(true);
  };

  // Update position
  const handleUpdateElementPosition = (id: string, x: number, y: number) => {
    setGraphic((prev) => ({
      ...prev,
      elements: prev.elements.map((el) => (el.id === id ? { ...el, x, y, transformMode: 'MANUAL' } : el)),
    }));
    setHasUnsavedChanges(true);
  };

  // Delete element (guarded against locked elements)
  const handleDeleteElement = (id: string) => {
    const target = graphic.elements.find((el) => el.id === id);
    if (!target) return;
    if (target.locked) return; // Do not delete locked element

    commitGraphicChange((prev) => ({
      ...prev,
      elements: prev.elements.filter((el) => el.id !== id),
    }));
    if (selectedElementId === id || selectedElementIds.includes(id)) {
      setSelectedElementId(null);
      setSelectedElementIds((prev) => prev.filter((item) => item !== id));
    }
    setDeletedToast({
      message: `Deleted "${target.name || 'Layer'}"`,
      timestamp: Date.now(),
    });
  };

  // Duplicate element
  const handleDuplicateElement = (id: string) => {
    const original = graphic.elements.find((el) => el.id === id);
    if (!original) return;

    const newId = `el-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const nextZ = Math.max(0, ...graphic.elements.map((e) => e.zIndex || 0)) + 1;

    const duplicated: GraphicElement = {
      ...original,
      id: newId,
      name: `${original.name} (Copy)`,
      x: original.x + 30,
      y: original.y + 30,
      zIndex: nextZ,
    };

    commitGraphicChange((prev) => ({
      ...prev,
      elements: [...prev.elements, duplicated],
    }));
    setSelectedElementId(newId);
    setSelectedElementIds([newId]);
  };

  // Reorder element (Up / Down / Top / Bottom)
  const handleReorderElement = (id: string, direction: 'UP' | 'DOWN' | 'TOP' | 'BOTTOM') => {
    commitGraphicChange((prev) => {
      const idx = prev.elements.findIndex((e) => e.id === id);
      if (idx === -1) return prev;

      const currentZ = prev.elements[idx].zIndex || 1;
      const allZ = prev.elements.map((e) => e.zIndex || 1);
      const maxZ = Math.max(1, ...allZ);
      const minZ = Math.min(1, ...allZ);

      let newZ = currentZ;
      if (direction === 'TOP') newZ = maxZ + 1;
      else if (direction === 'BOTTOM') newZ = Math.max(1, minZ - 1);
      else if (direction === 'UP') newZ = currentZ + 1;
      else if (direction === 'DOWN') newZ = Math.max(1, currentZ - 1);

      return {
        ...prev,
        elements: prev.elements.map((el) =>
          el.id === id ? { ...el, zIndex: newZ } : el
        ),
      };
    });
  };

  const handleToggleVisibility = (id: string) => {
    commitGraphicChange((prev) => ({
      ...prev,
      elements: prev.elements.map((el) =>
        el.id === id ? { ...el, visible: !el.visible } : el
      ),
    }));
  };

  const handleToggleLock = (id: string) => {
    commitGraphicChange((prev) => ({
      ...prev,
      elements: prev.elements.map((el) =>
        el.id === id ? { ...el, locked: !el.locked } : el
      ),
    }));
  };

  // Batch Operations Handlers
  const handleBatchAlign = (
    type:
      | 'LEFT'
      | 'CENTER_H'
      | 'RIGHT'
      | 'TOP'
      | 'MIDDLE_V'
      | 'BOTTOM'
      | 'DISTRIBUTE_H'
      | 'DISTRIBUTE_V'
  ) => {
    if (selectedElementIds.length < 2) return;

    const selectedElements = graphic.elements.filter((el) => selectedElementIds.includes(el.id));
    if (selectedElements.length < 2) return;

    const minX = Math.min(...selectedElements.map((el) => el.x));
    const maxX = Math.max(...selectedElements.map((el) => el.x + el.width));
    const minY = Math.min(...selectedElements.map((el) => el.y));
    const maxY = Math.max(...selectedElements.map((el) => el.y + el.height));
    const centerX = minX + (maxX - minX) / 2;
    const centerY = minY + (maxY - minY) / 2;

    commitGraphicChange((prev) => {
      const updatedElements = prev.elements.map((el) => {
        if (!selectedElementIds.includes(el.id) || el.locked) return el;

        let newX = el.x;
        let newY = el.y;

        if (type === 'LEFT') newX = minX;
        else if (type === 'RIGHT') newX = maxX - el.width;
        else if (type === 'CENTER_H') newX = Math.round(centerX - el.width / 2);
        else if (type === 'TOP') newY = minY;
        else if (type === 'BOTTOM') newY = maxY - el.height;
        else if (type === 'MIDDLE_V') newY = Math.round(centerY - el.height / 2);

        return { ...el, x: newX, y: newY, transformMode: 'MANUAL' as const };
      });

      return { ...prev, elements: updatedElements };
    });
  };

  const handleBatchDelete = () => {
    if (selectedElementIds.length === 0) return;
    const unlockedIds = selectedElementIds.filter(
      (id) => !graphic.elements.find((el) => el.id === id)?.locked
    );
    if (unlockedIds.length === 0) return; // All selected items are locked

    const count = unlockedIds.length;
    commitGraphicChange((prev) => ({
      ...prev,
      elements: prev.elements.filter((el) => !unlockedIds.includes(el.id)),
    }));
    setSelectedElementId(null);
    setSelectedElementIds([]);
    setDeletedToast({
      message: `Deleted ${count} ${count === 1 ? 'layer' : 'layers'}`,
      timestamp: Date.now(),
    });
  };

  const handleBatchDuplicate = () => {
    if (selectedElementIds.length === 0) return;

    const toDuplicate = graphic.elements.filter((el) => selectedElementIds.includes(el.id));
    const newItems: GraphicElement[] = [];
    const newIds: string[] = [];
    let currentZ = Math.max(0, ...graphic.elements.map((e) => e.zIndex || 0));

    toDuplicate.forEach((item) => {
      currentZ += 1;
      const newId = `el-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      newIds.push(newId);
      newItems.push({
        ...item,
        id: newId,
        name: `${item.name} (Copy)`,
        x: item.x + 30,
        y: item.y + 30,
        zIndex: currentZ,
      });
    });

    commitGraphicChange((prev) => ({
      ...prev,
      elements: [...prev.elements, ...newItems],
    }));
    setSelectedElementIds(newIds);
    setSelectedElementId(newIds[0] || null);
  };

  const handleBatchToggleLock = () => {
    if (selectedElementIds.length === 0) return;
    const shouldLock = selectedElementIds.some(
      (id) => !graphic.elements.find((el) => el.id === id)?.locked
    );
    commitGraphicChange((prev) => ({
      ...prev,
      elements: prev.elements.map((el) =>
        selectedElementIds.includes(el.id) ? { ...el, locked: shouldLock } : el
      ),
    }));
  };

  const handleBatchToggleVisibility = () => {
    if (selectedElementIds.length === 0) return;
    const shouldShow = selectedElementIds.some(
      (id) => graphic.elements.find((el) => el.id === id)?.visible === false
    );
    commitGraphicChange((prev) => ({
      ...prev,
      elements: prev.elements.map((el) =>
        selectedElementIds.includes(el.id) ? { ...el, visible: shouldShow } : el
      ),
    }));
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* Toast Alert */}
      {saveToast && (
        <div className="fixed top-20 right-8 z-[99999] bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl font-bold flex items-center gap-2 animate-in slide-in-from-top duration-300">
          <Check className="w-5 h-5" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <div className="h-16 border-b border-slate-800 bg-slate-900 px-5 flex items-center justify-between gap-4 shrink-0 z-30">
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            type="button"
            onClick={handleBackWithCheck}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition flex items-center gap-1.5 text-xs font-bold"
            title="Return to Studio Graphics Gallery"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Library</span>
          </button>

          {onCreateNew && (
            <button
              type="button"
              onClick={handleCreateNewWithCheck}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition flex items-center gap-1 text-xs font-bold"
              title="Create New Blank Graphic"
            >
              <FilePlus className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">New</span>
            </button>
          )}

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={graphic.name}
                onChange={(e) => {
                  setGraphic((prev) => ({ ...prev, name: e.target.value }));
                  setHasUnsavedChanges(true);
                }}
                className="bg-transparent font-black text-base text-white focus:outline-none border-b border-transparent focus:border-emerald-500 truncate max-w-xs md:max-w-sm"
                placeholder="Enter Graphic Name..."
              />
              {hasUnsavedChanges && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-950/80 text-amber-400 border border-amber-800 animate-pulse" title="You have unsaved changes">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>Unsaved</span>
                </span>
              )}
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                {graphic.sport}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
                {graphic.category}
              </span>
            </div>

            {/* Interactive Canvas Resolution Indicator */}
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setShowResolutionModal(true)}
                className="font-mono text-slate-300 hover:text-emerald-400 font-bold flex items-center gap-1.5 transition hover:underline text-[11px]"
                title="Click to open Resolution Settings"
              >
                <Maximize2 className="w-3 h-3 text-emerald-400" />
                <span>
                  Canvas: {canvasWidth} × {canvasHeight} px ({currentAspectRatio} • {currentPreset})
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons & Resolution Selector Dropdown */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Undo / Redo Controls */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-700/80">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className={`p-2 rounded-lg transition ${
                historyIndex > 0
                  ? 'text-slate-200 hover:bg-slate-800 hover:text-white'
                  : 'text-slate-600 cursor-not-allowed'
              }`}
              title="Undo (Ctrl+Z / Cmd+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className={`p-2 rounded-lg transition ${
                historyIndex < history.length - 1
                  ? 'text-slate-200 hover:bg-slate-800 hover:text-white'
                  : 'text-slate-600 cursor-not-allowed'
              }`}
              title="Redo (Ctrl+Y / Cmd+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          {/* Prominent Canvas Resolution Control */}
          <ResolutionSelectorDropdown
            graphic={graphic}
            onApplyResolution={handleApplyResolution}
          />

          {/* Status Switcher */}
          <button
            type="button"
            onClick={() => {
              commitGraphicChange((prev) => ({
                ...prev,
                status: prev.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
              }));
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
              graphic.status === 'ACTIVE'
                ? 'bg-emerald-950/60 border-emerald-600 text-emerald-400'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                graphic.status === 'ACTIVE' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
              }`}
            />
            <span>{graphic.status}</span>
          </button>

          {/* Save As New Button */}
          <button
            type="button"
            onClick={handleSaveAsNew}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs rounded-xl border border-slate-700 transition flex items-center gap-1.5"
            title="Save as a new independent graphic copy"
          >
            <Copy className="w-3.5 h-3.5 text-emerald-400" />
            <span>Save As New</span>
          </button>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={`px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition ${
              saving ? 'opacity-70 cursor-not-allowed' : ''
            }`}
            title="Save current graphic design"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* Main 3-Column Studio Workspace with Draggable Splitters */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Column: Layer Stack & Animation Controller */}
        <div
          style={{
            width: isLeftCollapsed ? '0px' : `${leftPanelWidth}px`,
            minWidth: isLeftCollapsed ? '0px' : '200px',
            maxWidth: '460px',
          }}
          className={`h-full bg-slate-900 border-r border-slate-800 flex flex-col transition-[width] duration-150 overflow-hidden relative ${
            isLeftCollapsed ? 'w-0 border-r-0' : ''
          }`}
        >
          {!isLeftCollapsed && (
            <GraphicLayersPanel
              graphic={graphic}
              sport={graphic.sport}
              selectedElementId={selectedElementId}
              selectedElementIds={selectedElementIds}
              onSelectElement={handleSelectElement}
              onAddElement={handleAddElement}
              onOpenInsertLiveDataModal={() => setShowInsertLiveDataModal(true)}
              onUpdateGraphicConfig={(cfg) => {
                commitGraphicChange((prev) => ({ ...prev, ...cfg }));
              }}
              onReorderElement={handleReorderElement}
              onDuplicateElement={handleDuplicateElement}
              onDeleteElement={handleDeleteElement}
              onToggleVisibility={handleToggleVisibility}
              onToggleLock={handleToggleLock}
            />
          )}
        </div>

        {/* Left Draggable Splitter Divider */}
        <div
          onPointerDown={handleLeftSplitterPointerDown}
          className={`w-2 hover:w-3 group bg-slate-950 hover:bg-emerald-500/20 active:bg-emerald-500/40 cursor-col-resize flex flex-col items-center justify-center relative select-none z-20 transition-all border-x border-slate-800/80 ${
            isDraggingSplitter === 'LEFT' ? 'bg-emerald-500/50 w-3' : ''
          }`}
          title="Drag to resize Layers Panel (Double click to toggle)"
          onDoubleClick={() => setIsLeftCollapsed(!isLeftCollapsed)}
        >
          {/* Grip Line */}
          <div className="w-0.5 h-8 bg-slate-600 group-hover:bg-emerald-400 rounded-full transition" />

          {/* Quick Collapse / Expand Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsLeftCollapsed(!isLeftCollapsed);
            }}
            className="absolute top-3 -right-3 z-30 p-1 bg-slate-800 hover:bg-emerald-500 text-slate-300 hover:text-slate-950 rounded-full shadow-md border border-slate-700 transition"
            title={isLeftCollapsed ? 'Expand Layers' : 'Collapse Layers'}
          >
            {isLeftCollapsed ? (
              <ChevronRight className="w-3 h-3" />
            ) : (
              <ChevronLeft className="w-3 h-3" />
            )}
          </button>
        </div>

        {/* Center Column: Dynamic Data Preview Bar + Interactive Canvas */}
        <div className="flex-1 flex flex-col min-w-[320px] bg-slate-950 overflow-hidden">
          {/* Dynamic Match Context Control Bar */}
          <div className="bg-slate-900/95 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 z-20">
            {/* Left: Mode Switcher */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setDataMode('SAMPLE')}
                  className={`px-3 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1.5 ${
                    dataMode === 'SAMPLE'
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Sample Data</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDataMode('MATCH')}
                  className={`px-3 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1.5 ${
                    dataMode === 'MATCH'
                      ? 'bg-sky-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Database className="w-3 h-3" />
                  <span>Select Match</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDataMode('LIVE')}
                  className={`px-3 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1.5 ${
                    dataMode === 'LIVE'
                      ? 'bg-rose-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Radio className="w-3 h-3 animate-pulse text-white" />
                  <span>Live Match</span>
                </button>
              </div>

              {/* Match Selector Dropdown (when MATCH or LIVE mode active) */}
              {(dataMode === 'MATCH' || dataMode === 'LIVE') && (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedMatchId}
                    onChange={(e) => setSelectedMatchId(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-sky-500 max-w-[240px] truncate"
                  >
                    {availableMatches.length === 0 ? (
                      <option value="">No matches found</option>
                    ) : (
                      availableMatches.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name || `${m.teamAName} vs ${m.teamBName}`} ({m.sport} • {m.status})
                        </option>
                      ))
                    )}
                  </select>

                  <button
                    type="button"
                    onClick={() => loadDataContext()}
                    disabled={isRefreshingContext}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                    title="Refresh Match Data"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${isRefreshingContext ? 'animate-spin' : ''}`}
                    />
                  </button>
                </div>
              )}
            </div>

            {/* Right: Stream Status Badge & Manual Variable Overrides Tester */}
            <div className="flex items-center gap-2.5">
              {/* LIVE Stream Status Indicator */}
              {dataMode === 'LIVE' && (
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold ${
                    liveStreamStatus === 'CONNECTED'
                      ? 'bg-emerald-950/70 border-emerald-600/80 text-emerald-400'
                      : liveStreamStatus === 'CONNECTING'
                      ? 'bg-amber-950/70 border-amber-600/80 text-amber-300'
                      : 'bg-rose-950/70 border-rose-600/80 text-rose-400'
                  }`}
                  title={
                    liveStreamStatus === 'CONNECTED'
                      ? 'Connected to live scoring SSE stream'
                      : liveStreamStatus === 'CONNECTING'
                      ? 'Connecting to live scoring stream...'
                      : 'Stream disconnected. Reconnecting automatically...'
                  }
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      liveStreamStatus === 'CONNECTED'
                        ? 'bg-emerald-400 animate-pulse'
                        : liveStreamStatus === 'CONNECTING'
                        ? 'bg-amber-400 animate-ping'
                        : 'bg-rose-500'
                    }`}
                  />
                  <span>
                    {liveStreamStatus === 'CONNECTED'
                      ? 'LIVE STREAM'
                      : liveStreamStatus === 'CONNECTING'
                      ? 'CONNECTING'
                      : 'OFFLINE'}
                  </span>
                  {lastLiveSyncTime && liveStreamStatus === 'CONNECTED' && (
                    <span className="text-[10px] text-emerald-500/80 font-mono hidden md:inline">
                      ({lastLiveSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })})
                    </span>
                  )}
                </div>
              )}

              {dataMode === 'MATCH' && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-sky-800 bg-sky-950/60 text-sky-400 text-[11px] font-bold">
                  <Database className="w-3 h-3" />
                  <span>MATCH SNAPSHOT</span>
                </div>
              )}

              {dataMode === 'SAMPLE' && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 text-[11px] font-bold">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>SAMPLE DATA</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowOverrideModal(true)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg flex items-center gap-1.5 font-bold transition border border-slate-700/60"
              >
                <Edit3 className="w-3 h-3 text-amber-400" />
                <span>Test Overrides</span>
                {Object.keys(customDataOverrides).length > 0 && (
                  <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 text-[10px] font-black rounded-full">
                    {Object.keys(customDataOverrides).length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Center Canvas Preview Viewport */}
          <div className="flex-1 flex overflow-hidden">
            <GraphicCanvasPreview
              graphic={graphic}
              selectedElementId={selectedElementId}
              selectedElementIds={selectedElementIds}
              onSelectElement={handleSelectElement}
              onUpdateElement={handleUpdateElement}
              onUpdateElementPosition={handleUpdateElementPosition}
              onUpdateElementTransform={handleUpdateElementTransform}
              onDeleteElement={handleDeleteElement}
              onDuplicateElement={handleDuplicateElement}
              onReorderElement={handleReorderElement}
              onToggleLock={handleToggleLock}
              onToggleVisibility={handleToggleVisibility}
              onBatchAlign={handleBatchAlign}
              onBatchDelete={handleBatchDelete}
              onBatchDuplicate={handleBatchDuplicate}
              onBatchToggleLock={handleBatchToggleLock}
              onBatchToggleVisibility={handleBatchToggleVisibility}
              onAddDrawnShape={handleAddDrawnShape}
              onApplyResolution={handleApplyResolution}
              previewBg={previewBg}
              onChangePreviewBg={setPreviewBg}
              isSimulatingData={isSimulatingData}
              onToggleSimulatingData={() => setIsSimulatingData(!isSimulatingData)}
              dataContext={dataContext}
              customData={customDataOverrides}
            />
          </div>
        </div>

        {/* Right Draggable Splitter Divider */}
        <div
          onPointerDown={handleRightSplitterPointerDown}
          className={`w-2 hover:w-3 group bg-slate-950 hover:bg-emerald-500/20 active:bg-emerald-500/40 cursor-col-resize flex flex-col items-center justify-center relative select-none z-20 transition-all border-x border-slate-800/80 ${
            isDraggingSplitter === 'RIGHT' ? 'bg-emerald-500/50 w-3' : ''
          }`}
          title="Drag to resize Inspector (Double click to toggle)"
          onDoubleClick={() => setIsRightCollapsed(!isRightCollapsed)}
        >
          {/* Grip Line */}
          <div className="w-0.5 h-8 bg-slate-600 group-hover:bg-emerald-400 rounded-full transition" />

          {/* Quick Collapse / Expand Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsRightCollapsed(!isRightCollapsed);
            }}
            className="absolute top-3 -left-3 z-30 p-1 bg-slate-800 hover:bg-emerald-500 text-slate-300 hover:text-slate-950 rounded-full shadow-md border border-slate-700 transition"
            title={isRightCollapsed ? 'Expand Inspector' : 'Collapse Inspector'}
          >
            {isRightCollapsed ? (
              <ChevronLeft className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>
        </div>

        {/* Right Column: Element Properties Inspector */}
        <div
          style={{
            width: isRightCollapsed ? '0px' : `${rightPanelWidth}px`,
            minWidth: isRightCollapsed ? '0px' : '260px',
            maxWidth: '520px',
          }}
          className={`h-full bg-slate-900 border-l border-slate-800 flex flex-col transition-[width] duration-150 overflow-hidden relative ${
            isRightCollapsed ? 'w-0 border-l-0' : ''
          }`}
        >
          {!isRightCollapsed && (
            <GraphicElementInspector
              element={selectedElement}
              sport={graphic.sport}
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
              graphic={graphic}
              onApplyResolution={handleApplyResolution}
              contextVariables={{
                ...(dataContext?.variables || {}),
                ...customDataOverrides,
              }}
              onUpdateElement={handleUpdateElement}
              onDeleteElement={handleDeleteElement}
              onDuplicateElement={handleDuplicateElement}
              onDuplicateElementDirect={handleDuplicateElement}
            />
          )}
        </div>
      </div>

      {/* Resolution Settings Modal */}
      <ResolutionControlModal
        isOpen={showResolutionModal}
        onClose={() => setShowResolutionModal(false)}
        graphic={graphic}
        onApplyResolution={(updated) => {
          handleApplyResolution(updated);
        }}
      />

      {/* Resolution Conversion Strategy Modal */}
      <ResolutionTransformConfirmModal
        isOpen={showTransformModal}
        onClose={() => {
          setShowTransformModal(false);
          setPendingResolution(null);
        }}
        graphic={graphic}
        pendingResolution={pendingResolution}
        onConfirm={handleConfirmTransform}
      />

      {/* Manual Variable Overrides Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Manual Variable Overrides</h3>
                  <p className="text-[11px] text-slate-400">
                    Test how this graphic looks with custom names, high scores, or long text
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOverrideModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Add new override */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                  Add Custom Variable Value
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="e.g. {{match.score_a}}"
                    value={overrideInputKey}
                    onChange={(e) => setOverrideInputKey(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 font-mono"
                  />
                  <input
                    type="text"
                    placeholder="e.g. 245/4 (19.4)"
                    value={overrideInputValue}
                    onChange={(e) => setOverrideInputValue(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (overrideInputKey.trim() && overrideInputValue.trim()) {
                      let key = overrideInputKey.trim();
                      if (!key.startsWith('{{')) key = `{{${key}`;
                      if (!key.endsWith('}}')) key = `${key}}}`;
                      setCustomDataOverrides((prev) => ({
                        ...prev,
                        [key]: overrideInputValue.trim(),
                      }));
                      setOverrideInputKey('');
                      setOverrideInputValue('');
                    }
                  }}
                  className="w-full py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition"
                >
                  Apply Override
                </button>
              </div>

              {/* Existing overrides list */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Active Overrides ({Object.keys(customDataOverrides).length})
                </span>

                {Object.keys(customDataOverrides).length === 0 ? (
                  <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800 text-center text-xs text-slate-500">
                    No custom overrides active. Graphic will use sample or live match context.
                  </div>
                ) : (
                  Object.entries(customDataOverrides).map(([key, val]) => (
                    <div
                      key={key}
                      className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-mono text-emerald-400 font-bold block truncate">
                          {key}
                        </span>
                        <span className="text-white font-mono text-[11px] truncate block">
                          → {val}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomDataOverrides((prev) => {
                            const next = { ...prev };
                            delete next[key];
                            return next;
                          });
                        }}
                        className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded transition shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCustomDataOverrides({})}
                className="text-xs text-rose-400 hover:underline font-bold"
              >
                Clear All Overrides
              </button>
              <button
                type="button"
                onClick={() => setShowOverrideModal(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Undoable Deleted Element Toast Notification */}
      {deletedToast && (
        <div className="fixed bottom-6 right-6 z-[99999] bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-3 duration-200 backdrop-blur-md">
          <div className="p-1.5 bg-rose-500/20 text-rose-400 rounded-lg">
            <Trash2 className="w-4 h-4" />
          </div>
          <div className="text-xs font-medium text-slate-200">
            <span>{deletedToast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              handleUndo();
              setDeletedToast(null);
            }}
            className="ml-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition shadow-md flex items-center gap-1.5 active:scale-95 cursor-pointer"
            title="Restore deleted element (Ctrl+Z / Cmd+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
          <button
            type="button"
            onClick={() => setDeletedToast(null)}
            className="p-1 text-slate-400 hover:text-white rounded transition"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Insert Live Data Modal */}
      <InsertLiveDataModal
        sport={graphic.sport || 'CRICKET'}
        isOpen={showInsertLiveDataModal}
        onClose={() => setShowInsertLiveDataModal(false)}
        onInsertElement={handleInsertCustomElement}
        activeVariables={{ ...(dataContext || {}), ...customDataOverrides }}
      />

      {/* Save Graphic Modal with Custom Name & Validation */}
      <SaveGraphicModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onConfirmSave={handleConfirmModalSave}
        existingGraphics={allGraphics}
        currentGraphic={graphic}
        isSaveAsNew={isSaveAsNewMode}
      />

      {/* Save Success Confirmation Modal */}
      <SaveSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onViewInLibrary={() => {
          setShowSuccessModal(false);
          onBack();
        }}
        graphic={savedSuccessData?.graphic || graphic}
        isNewGraphic={savedSuccessData?.isNew}
      />

      {/* Unsaved Changes Protection Modal */}
      <UnsavedChangesModal
        isOpen={showUnsavedModal}
        onSaveAndProceed={handleSaveAndProceed}
        onDiscardAndProceed={handleDiscardAndProceed}
        onCancel={() => {
          setShowUnsavedModal(false);
          setPendingNavigationAction(null);
        }}
        graphicName={graphic.name}
      />
    </div>
  );
};
