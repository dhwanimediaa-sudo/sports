import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StudioGraphic, GraphicElement, GraphicElementType } from '../../../types';
import { StudioGraphicElementRenderer } from './StudioGraphicElementRenderer';
import { ResolutionSelectorDropdown } from './ResolutionSelectorDropdown';
import { StudioColorPicker } from './StudioColorPicker';
import { detectAspectRatio, detectOrientation } from '../../../utils/graphicResolutionUtils';
import {
  Play,
  Crosshair,
  Grid,
  Sparkles,
  MousePointer,
  Square,
  Circle,
  Triangle,
  Star,
  Shield,
  ArrowRight,
  Minus,
  Image as ImageIcon,
  Type,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Layers,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Trash2,
  Copy,
  RotateCw,
  RotateCcw,
  ChevronDown,
  Info,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Magnet,
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  AlignStartVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignEndHorizontal,
  Palette,
} from 'lucide-react';

interface GraphicCanvasPreviewProps {
  graphic: StudioGraphic;
  selectedElementId: string | null;
  selectedElementIds?: string[];
  onSelectElement: (id: string | null, isMulti?: boolean) => void;
  onUpdateElement?: (updated: Partial<GraphicElement>) => void;
  onUpdateElementPosition?: (id: string, x: number, y: number) => void;
  onUpdateElementTransform?: (
    id: string,
    updates: { x?: number; y?: number; width?: number; height?: number; rotation?: number }
  ) => void;
  onDeleteElement?: (id: string) => void;
  onDuplicateElement?: (id: string) => void;
  onReorderElement?: (id: string, direction: 'UP' | 'DOWN' | 'TOP' | 'BOTTOM') => void;
  onToggleLock?: (id: string) => void;
  onToggleVisibility?: (id: string) => void;
  onBatchAlign?: (
    type:
      | 'LEFT'
      | 'CENTER_H'
      | 'RIGHT'
      | 'TOP'
      | 'MIDDLE_V'
      | 'BOTTOM'
      | 'DISTRIBUTE_H'
      | 'DISTRIBUTE_V'
  ) => void;
  onBatchDelete?: () => void;
  onBatchDuplicate?: () => void;
  onBatchToggleLock?: () => void;
  onBatchToggleVisibility?: () => void;
  onAddDrawnShape?: (
    type: GraphicElementType,
    box: { x: number; y: number; width: number; height: number }
  ) => void;
  onApplyResolution?: (updatedGraphic: StudioGraphic) => void;
  previewBg: 'transparent' | 'stadium' | 'pitch' | 'court' | 'dark';
  onChangePreviewBg: (bg: 'transparent' | 'stadium' | 'pitch' | 'court' | 'dark') => void;
  isSimulatingData: boolean;
  onToggleSimulatingData: () => void;
  dataContext?: any;
  customData?: Record<string, string>;
}

// 8-Handle mathematical resize calculation with rotation, shift aspect-ratio lock, and alt center-scale
function calculateResizedBounds({
  handle,
  dx,
  dy,
  origX,
  origY,
  origW,
  origH,
  rotation = 0,
  isShift = false,
  isAlt = false,
  minSize = 10,
}: {
  handle: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
  dx: number;
  dy: number;
  origX: number;
  origY: number;
  origW: number;
  origH: number;
  rotation?: number;
  isShift?: boolean;
  isAlt?: boolean;
  minSize?: number;
}): { x: number; y: number; width: number; height: number } {
  const rotRad = (rotation * Math.PI) / 180;
  const cos = Math.cos(-rotRad);
  const sin = Math.sin(-rotRad);

  // Unrotate delta into element local coordinates
  const localDx = dx * cos - dy * sin;
  const localDy = dx * sin + dy * cos;

  const origAR = Math.max(0.001, origW / Math.max(1, origH));

  // Determine raw delta in local width/height
  let rawW = origW;
  let rawH = origH;

  const factor = isAlt ? 2 : 1;

  if (handle.includes('e')) {
    rawW = origW + localDx * factor;
  } else if (handle.includes('w')) {
    rawW = origW - localDx * factor;
  }

  if (handle.includes('s')) {
    rawH = origH + localDy * factor;
  } else if (handle.includes('n')) {
    rawH = origH - localDy * factor;
  }

  let finalW = rawW;
  let finalH = rawH;

  if (isShift) {
    if (handle === 'e' || handle === 'w') {
      finalW = Math.max(minSize, rawW);
      finalH = Math.max(minSize, finalW / origAR);
    } else if (handle === 'n' || handle === 's') {
      finalH = Math.max(minSize, rawH);
      finalW = Math.max(minSize, finalH * origAR);
    } else {
      // Corner handles: NW, NE, SE, SW
      const scaleW = rawW / origW;
      const scaleH = rawH / origH;
      const chosenScale = Math.abs(scaleW - 1) >= Math.abs(scaleH - 1) ? scaleW : scaleH;

      finalW = origW * chosenScale;
      finalH = origH * chosenScale;

      if (finalW < minSize) {
        finalW = minSize;
        finalH = minSize / origAR;
      }
      if (finalH < minSize) {
        finalH = minSize;
        finalW = minSize * origAR;
      }
    }
  } else {
    if (handle.includes('e') || handle.includes('w')) {
      finalW = Math.max(minSize, rawW);
    }
    if (handle.includes('n') || handle.includes('s')) {
      finalH = Math.max(minSize, rawH);
    }
  }

  finalW = Math.round(Math.max(minSize, finalW));
  finalH = Math.round(Math.max(minSize, finalH));

  const origCenterX = origX + origW / 2;
  const origCenterY = origY + origH / 2;

  let newCenterX = origCenterX;
  let newCenterY = origCenterY;

  if (!isAlt) {
    let localShiftX = 0;
    let localShiftY = 0;

    if (handle.includes('e')) {
      localShiftX = (finalW - origW) / 2;
    } else if (handle.includes('w')) {
      localShiftX = -(finalW - origW) / 2;
    }

    if (handle.includes('s')) {
      localShiftY = (finalH - origH) / 2;
    } else if (handle.includes('n')) {
      localShiftY = -(finalH - origH) / 2;
    }

    // Rotate local shift by +rotRad back into stage coordinates
    const worldCos = Math.cos(rotRad);
    const worldSin = Math.sin(rotRad);
    const shiftWorldX = localShiftX * worldCos - localShiftY * worldSin;
    const shiftWorldY = localShiftX * worldSin + localShiftY * worldCos;

    newCenterX = origCenterX + shiftWorldX;
    newCenterY = origCenterY + shiftWorldY;
  }

  const finalX = Math.round(newCenterX - finalW / 2);
  const finalY = Math.round(newCenterY - finalH / 2);

  return {
    x: finalX,
    y: finalY,
    width: finalW,
    height: finalH,
  };
}

export const GraphicCanvasPreview: React.FC<GraphicCanvasPreviewProps> = ({
  graphic,
  selectedElementId,
  selectedElementIds = [],
  onSelectElement,
  onUpdateElement,
  onUpdateElementPosition,
  onUpdateElementTransform,
  onDeleteElement,
  onDuplicateElement,
  onReorderElement,
  onToggleLock,
  onToggleVisibility,
  onBatchAlign,
  onBatchDelete,
  onBatchDuplicate,
  onBatchToggleLock,
  onBatchToggleVisibility,
  onAddDrawnShape,
  onApplyResolution,
  previewBg,
  onChangePreviewBg,
  isSimulatingData,
  onToggleSimulatingData,
  dataContext,
  customData,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const [scale, setScale] = useState<number>(0.5);
  const [zoomMode, setZoomMode] = useState<'fit' | '25' | '50' | '75' | '100' | '150' | '200'>('fit');
  const [isZoomDropdownOpen, setIsZoomDropdownOpen] = useState<boolean>(false);
  const zoomDropdownRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [showSafeAreas, setShowSafeAreas] = useState<boolean>(false);
  const [showGridLines, setShowGridLines] = useState<boolean>(false);
  const [snapEnabled, setSnapEnabled] = useState<boolean>(true);
  const [animKey, setAnimKey] = useState<number>(0);

  // Active floating color picker popup in contextual toolbar
  const [toolbarColorPickerTarget, setToolbarColorPickerTarget] = useState<
    'TEXT' | 'FILL' | 'BORDER' | null
  >(null);

  // Active snap visual lines { x?: number, y?: number, label?: string }
  const [activeSnapGuides, setActiveSnapGuides] = useState<{
    vertical?: { x: number; label: string };
    horizontal?: { y: number; label: string };
  }>({});

  // Close zoom dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (zoomDropdownRef.current && !zoomDropdownRef.current.contains(e.target as Node)) {
        setIsZoomDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Active Tool: 'SELECT' or a Shape / Image / Text tool
  const [activeTool, setActiveTool] = useState<
    | 'SELECT'
    | 'RECTANGLE'
    | 'ROUNDED_RECTANGLE'
    | 'CIRCLE'
    | 'ELLIPSE'
    | 'LINE'
    | 'TRIANGLE'
    | 'POLYGON'
    | 'STAR'
    | 'PILL'
    | 'BADGE'
    | 'ARROW'
    | 'IMAGE'
    | 'TEXT'
  >('SELECT');

  // Drawing state (when user drags on canvas with a shape tool active)
  const [drawingState, setDrawingState] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  // Element Move Drag State (supports single or multi-element relative dragging)
  const [dragMoveState, setDragMoveState] = useState<{
    elementId: string;
    startX: number;
    startY: number;
    initialPositions: Record<string, { x: number; y: number }>;
  } | null>(null);

  // Element Resize Drag State (8 handles: nw, n, ne, e, se, s, sw, w)
  const [resizeState, setResizeState] = useState<{
    elementId: string;
    handle: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
    origRotation: number;
    aspectRatioLocked: boolean;
  } | null>(null);

  // Element Rotation Drag State
  const [rotateState, setRotateState] = useState<{
    elementId: string;
    centerX: number;
    centerY: number;
    startAngle: number;
    origRotation: number;
  } | null>(null);

  const canvasWidth = Number(graphic.width) || Number(graphic.canvas?.width) || 1920;
  const canvasHeight = Number(graphic.height) || Number(graphic.canvas?.height) || 1080;
  const currentAspectRatio = graphic.aspectRatio || detectAspectRatio(canvasWidth, canvasHeight);
  const currentOrientation = graphic.orientation || detectOrientation(canvasWidth, canvasHeight);

  // Selected element reference
  const effectiveSelectedIds =
    selectedElementIds.length > 0
      ? selectedElementIds
      : selectedElementId
      ? [selectedElementId]
      : [];

  const selectedElement =
    graphic.elements.find((el) => el.id === (selectedElementId || effectiveSelectedIds[0])) || null;

  const isMultiSelected = effectiveSelectedIds.length > 1;

  // Auto-calculate scale to fit container perfectly
  const recalculateFitScale = useCallback(() => {
    if (!containerRef.current || zoomMode !== 'fit') return;
    const rect = containerRef.current.getBoundingClientRect();
    const padding = 48;
    const availW = Math.max(100, rect.width - padding);
    const availH = Math.max(100, rect.height - padding);

    const scaleX = availW / canvasWidth;
    const scaleY = availH / canvasHeight;
    const fitScale = Math.min(scaleX, scaleY, 1.0);
    setScale(fitScale);
  }, [canvasWidth, canvasHeight, zoomMode]);

  useEffect(() => {
    recalculateFitScale();
    const observer = new ResizeObserver(() => {
      recalculateFitScale();
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [recalculateFitScale]);

  // Set explicit zoom
  const handleSetZoom = (mode: 'fit' | '25' | '50' | '75' | '100' | '150' | '200') => {
    setZoomMode(mode);
    setIsZoomDropdownOpen(false);
    if (mode === '25') setScale(0.25);
    else if (mode === '50') setScale(0.5);
    else if (mode === '75') setScale(0.75);
    else if (mode === '100') setScale(1.0);
    else if (mode === '150') setScale(1.5);
    else if (mode === '200') setScale(2.0);
    else {
      recalculateFitScale();
    }
  };

  const handlePlayAnimation = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setAnimKey((k) => k + 1);
      setIsAnimating(true);
    }, 50);
  };

  // Convert mouse screen coordinates to canvas coordinates
  const getCanvasCoords = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      if (!stageRef.current) return { x: 0, y: 0 };
      const rect = stageRef.current.getBoundingClientRect();
      if (!rect.width || !rect.height) return { x: 0, y: 0 };

      const scaleX = rect.width / canvasWidth;
      const scaleY = rect.height / canvasHeight;
      if (!scaleX || !scaleY) return { x: 0, y: 0 };

      const x = Math.round((clientX - rect.left) / scaleX);
      const y = Math.round((clientY - rect.top) / scaleY);
      return {
        x: Math.max(0, Math.min(canvasWidth, x)),
        y: Math.max(0, Math.min(canvasHeight, y)),
      };
    },
    [canvasWidth, canvasHeight]
  );

  // Stage Pointer Down Handler (handles Drawing or Deselecting)
  const handleStagePointerDown = (e: React.PointerEvent) => {
    if (activeTool !== 'SELECT') {
      e.preventDefault();
      const coords = getCanvasCoords(e.clientX, e.clientY);
      setDrawingState({
        startX: coords.x,
        startY: coords.y,
        currentX: coords.x,
        currentY: coords.y,
      });
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      return;
    }

    // In SELECT mode, clicking stage background deselects
    if (
      e.target === stageRef.current ||
      (e.target as HTMLElement).id === 'canvas-background' ||
      (e.target as HTMLElement).id === 'canvas-stage-wrapper'
    ) {
      onSelectElement(null, false);
      setToolbarColorPickerTarget(null);
    }
  };

  // Element Pointer Down Handler (for moving in SELECT mode with multi-selection support)
  const handleElementPointerDown = (el: GraphicElement, e: React.PointerEvent) => {
    if (activeTool !== 'SELECT') return;

    e.stopPropagation();
    const isMultiKey = e.shiftKey || e.metaKey || e.ctrlKey;

    if (isMultiKey) {
      onSelectElement(el.id, true);
    } else {
      if (!effectiveSelectedIds.includes(el.id)) {
        onSelectElement(el.id, false);
      }
    }

    if (el.locked) return;

    // Collect positions of all currently selected elements
    const idsToDrag = effectiveSelectedIds.includes(el.id)
      ? effectiveSelectedIds
      : [el.id];

    const initialPositions: Record<string, { x: number; y: number }> = {};
    idsToDrag.forEach((id) => {
      const match = graphic.elements.find((item) => item.id === id);
      if (match) {
        initialPositions[id] = { x: match.x, y: match.y };
      }
    });

    setDragMoveState({
      elementId: el.id,
      startX: e.clientX,
      startY: e.clientY,
      initialPositions,
    });
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  // Resize Handle Pointer Down
  const handleResizePointerDown = (
    handle: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w',
    e: React.PointerEvent
  ) => {
    if (!selectedElement || selectedElement.locked) return;
    e.stopPropagation();
    setResizeState({
      elementId: selectedElement.id,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      origX: selectedElement.x,
      origY: selectedElement.y,
      origW: selectedElement.width,
      origH: selectedElement.height,
      origRotation: selectedElement.rotation || 0,
      aspectRatioLocked: Boolean(
        selectedElement.aspectRatioLock || (selectedElement as any).lockAspectRatio
      ),
    });
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  // Rotation Handle Pointer Down
  const handleRotatePointerDown = (e: React.PointerEvent) => {
    if (!selectedElement || selectedElement.locked || !stageRef.current) return;
    e.stopPropagation();
    const stageRect = stageRef.current.getBoundingClientRect();
    const currentScale = stageRect.width / canvasWidth;
    const elCenterX =
      stageRect.left + (selectedElement.x + selectedElement.width / 2) * currentScale;
    const elCenterY =
      stageRect.top + (selectedElement.y + selectedElement.height / 2) * currentScale;
    const startAngle =
      Math.atan2(e.clientY - elCenterY, e.clientX - elCenterX) * (180 / Math.PI);

    setRotateState({
      elementId: selectedElement.id,
      centerX: elCenterX,
      centerY: elCenterY,
      startAngle,
      origRotation: selectedElement.rotation || 0,
    });
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  // Global Pointer Move Handler
  const handlePointerMove = useCallback(
    (e: PointerEvent | React.PointerEvent) => {
      // 1. Handling Shape Drawing
      if (drawingState) {
        const coords = getCanvasCoords(e.clientX, e.clientY);
        setDrawingState((prev) =>
          prev ? { ...prev, currentX: coords.x, currentY: coords.y } : null
        );
        return;
      }

      const currentScale = stageRef.current
        ? stageRef.current.getBoundingClientRect().width / canvasWidth
        : scale;

      // 2. Handling Element Drag Movement (with Magnetic Snapping & Multi-element drag)
      if (dragMoveState) {
        const dx = (e.clientX - dragMoveState.startX) / currentScale;
        const dy = (e.clientY - dragMoveState.startY) / currentScale;

        const mainInitial = dragMoveState.initialPositions[dragMoveState.elementId] || {
          x: 0,
          y: 0,
        };
        let targetX = Math.round(mainInitial.x + dx);
        let targetY = Math.round(mainInitial.y + dy);

        let snapVertical: { x: number; label: string } | undefined = undefined;
        let snapHorizontal: { y: number; label: string } | undefined = undefined;

        if (snapEnabled && selectedElement) {
          const snapThreshold = 8;
          const elW = selectedElement.width;
          const elH = selectedElement.height;

          const centerX = targetX + elW / 2;
          const centerY = targetY + elH / 2;

          // Snap to Canvas Center X
          if (Math.abs(centerX - canvasWidth / 2) < snapThreshold) {
            targetX = Math.round(canvasWidth / 2 - elW / 2);
            snapVertical = { x: Math.round(canvasWidth / 2), label: 'Center X (50%)' };
          }
          // Snap to Left Edge
          else if (Math.abs(targetX - 0) < snapThreshold) {
            targetX = 0;
            snapVertical = { x: 0, label: 'Left Edge (0px)' };
          }
          // Snap to Right Edge
          else if (Math.abs(targetX + elW - canvasWidth) < snapThreshold) {
            targetX = canvasWidth - elW;
            snapVertical = { x: canvasWidth, label: `Right Edge (${canvasWidth}px)` };
          }

          // Snap to Canvas Center Y
          if (Math.abs(centerY - canvasHeight / 2) < snapThreshold) {
            targetY = Math.round(canvasHeight / 2 - elH / 2);
            snapHorizontal = { y: Math.round(canvasHeight / 2), label: 'Center Y (50%)' };
          }
          // Snap to Top Edge
          else if (Math.abs(targetY - 0) < snapThreshold) {
            targetY = 0;
            snapHorizontal = { y: 0, label: 'Top Edge (0px)' };
          }
          // Snap to Bottom Edge
          else if (Math.abs(targetY + elH - canvasHeight) < snapThreshold) {
            targetY = canvasHeight - elH;
            snapHorizontal = { y: canvasHeight, label: `Bottom Edge (${canvasHeight}px)` };
          }
        }

        setActiveSnapGuides({ vertical: snapVertical, horizontal: snapHorizontal });

        const actualDx = targetX - mainInitial.x;
        const actualDy = targetY - mainInitial.y;

        // Apply translation to all dragging elements
        Object.entries(dragMoveState.initialPositions).forEach(([id, initPos]) => {
          const pos = initPos as { x: number; y: number };
          const finalX = Math.round(pos.x + actualDx);
          const finalY = Math.round(pos.y + actualDy);
          if (onUpdateElementTransform) {
            onUpdateElementTransform(id, { x: finalX, y: finalY });
          } else if (onUpdateElementPosition) {
            onUpdateElementPosition(id, finalX, finalY);
          }
        });

        return;
      }

      // 3. Handling Element Resizing with 8 Handles, Rotation, Shift, and Alt support
      if (resizeState && onUpdateElementTransform) {
        const dx = (e.clientX - resizeState.startX) / currentScale;
        const dy = (e.clientY - resizeState.startY) / currentScale;

        const isShift = e.shiftKey || resizeState.aspectRatioLocked;
        const isAlt = e.altKey;

        const newBounds = calculateResizedBounds({
          handle: resizeState.handle,
          dx,
          dy,
          origX: resizeState.origX,
          origY: resizeState.origY,
          origW: resizeState.origW,
          origH: resizeState.origH,
          rotation: resizeState.origRotation,
          isShift,
          isAlt,
          minSize: 10,
        });

        onUpdateElementTransform(resizeState.elementId, newBounds);
        return;
      }

      // 4. Handling Element Rotation
      if (rotateState && onUpdateElementTransform) {
        const currentAngle =
          Math.atan2(e.clientY - rotateState.centerY, e.clientX - rotateState.centerX) *
          (180 / Math.PI);
        let angleDelta = currentAngle - rotateState.startAngle;
        let newRotation = Math.round((rotateState.origRotation + angleDelta) % 360);
        if (newRotation < 0) newRotation += 360;

        if (e.shiftKey) {
          // Snap to 15-degree increments with Shift key
          newRotation = Math.round(newRotation / 15) * 15;
        }

        onUpdateElementTransform(rotateState.elementId, { rotation: newRotation });
      }
    },
    [
      drawingState,
      dragMoveState,
      resizeState,
      rotateState,
      getCanvasCoords,
      canvasWidth,
      canvasHeight,
      scale,
      snapEnabled,
      selectedElement,
      onUpdateElementTransform,
      onUpdateElementPosition,
    ]
  );

  // Global Pointer Up Handler
  const handlePointerUp = useCallback(() => {
    // If we were drawing a shape
    if (drawingState && onAddDrawnShape && activeTool !== 'SELECT') {
      const x1 = Math.min(drawingState.startX, drawingState.currentX);
      const y1 = Math.min(drawingState.startY, drawingState.currentY);
      const w = Math.abs(drawingState.currentX - drawingState.startX);
      const h = Math.abs(drawingState.currentY - drawingState.startY);

      // Only create if size >= 10px
      if (w >= 10 && h >= 10) {
        onAddDrawnShape(activeTool as GraphicElementType, {
          x: x1,
          y: y1,
          width: w,
          height: h,
        });
      }

      setDrawingState(null);
      setActiveTool('SELECT'); // Return to select tool after drawing
      return;
    }

    setDrawingState(null);
    setDragMoveState(null);
    setResizeState(null);
    setRotateState(null);
    setActiveSnapGuides({});
  }, [drawingState, onAddDrawnShape, activeTool]);

  // Window pointer listeners to ensure drag operations never get stuck outside canvas
  useEffect(() => {
    const isInteracting = Boolean(drawingState || dragMoveState || resizeState || rotateState);
    if (!isInteracting) return;

    const onWinPointerMove = (e: PointerEvent) => handlePointerMove(e);
    const onWinPointerUp = () => handlePointerUp();
    const onWinBlur = () => handlePointerUp();

    window.addEventListener('pointermove', onWinPointerMove, { passive: false });
    window.addEventListener('pointerup', onWinPointerUp);
    window.addEventListener('pointercancel', onWinPointerUp);
    window.addEventListener('blur', onWinBlur);

    return () => {
      window.removeEventListener('pointermove', onWinPointerMove);
      window.removeEventListener('pointerup', onWinPointerUp);
      window.removeEventListener('pointercancel', onWinPointerUp);
      window.removeEventListener('blur', onWinBlur);
    };
  }, [drawingState, dragMoveState, resizeState, rotateState, handlePointerMove, handlePointerUp]);

  // Keyboard Shortcuts (Delete, Nudge, Duplicate, Deselect)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        activeTag === 'select' ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (!selectedElementId && effectiveSelectedIds.length === 0) return;

      // Delete / Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (isMultiSelected && onBatchDelete) {
          onBatchDelete();
        } else if (selectedElement && !selectedElement.locked && onDeleteElement) {
          onDeleteElement(selectedElement.id);
        }
        return;
      }

      // Escape -> Deselect
      if (e.key === 'Escape') {
        e.preventDefault();
        onSelectElement(null, false);
        setToolbarColorPickerTarget(null);
        return;
      }

      // Cmd+D / Ctrl+D -> Duplicate
      if ((e.metaKey || e.ctrlKey) && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        if (isMultiSelected && onBatchDuplicate) {
          onBatchDuplicate();
        } else if (selectedElement && onDuplicateElement) {
          onDuplicateElement(selectedElement.id);
        }
        return;
      }

      // Arrow keys -> Nudge position
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        if (!selectedElement || selectedElement.locked) return;
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        let deltaX = 0;
        let deltaY = 0;
        if (e.key === 'ArrowLeft') deltaX = -step;
        if (e.key === 'ArrowRight') deltaX = step;
        if (e.key === 'ArrowUp') deltaY = -step;
        if (e.key === 'ArrowDown') deltaY = step;

        effectiveSelectedIds.forEach((id) => {
          const target = graphic.elements.find((item) => item.id === id);
          if (target && !target.locked) {
            const newX = Math.round(target.x + deltaX);
            const newY = Math.round(target.y + deltaY);
            if (onUpdateElementTransform) {
              onUpdateElementTransform(id, { x: newX, y: newY });
            } else if (onUpdateElementPosition) {
              onUpdateElementPosition(id, newX, newY);
            }
          }
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedElementId,
    effectiveSelectedIds,
    isMultiSelected,
    selectedElement,
    graphic.elements,
    onDeleteElement,
    onDuplicateElement,
    onBatchDelete,
    onBatchDuplicate,
    onSelectElement,
    onUpdateElementTransform,
    onUpdateElementPosition,
  ]);

  // Quick Action Helpers
  const handleCenterHorizontal = () => {
    if (!selectedElement || selectedElement.locked || !onUpdateElementTransform) return;
    const newX = Math.round((canvasWidth - selectedElement.width) / 2);
    onUpdateElementTransform(selectedElement.id, { x: newX });
  };

  const handleCenterVertical = () => {
    if (!selectedElement || selectedElement.locked || !onUpdateElementTransform) return;
    const newY = Math.round((canvasHeight - selectedElement.height) / 2);
    onUpdateElementTransform(selectedElement.id, { y: newY });
  };

  const handleRotateDelta = (delta: number) => {
    if (!selectedElement || selectedElement.locked || !onUpdateElementTransform) return;
    let newRot = Math.round(((selectedElement.rotation || 0) + delta) % 360);
    if (newRot < 0) newRot += 360;
    onUpdateElementTransform(selectedElement.id, { rotation: newRot });
  };

  const handleResetRotation = () => {
    if (!selectedElement || selectedElement.locked || !onUpdateElementTransform) return;
    onUpdateElementTransform(selectedElement.id, { rotation: 0 });
  };

  // Background style helper
  const getBackgroundStyle = () => {
    switch (previewBg) {
      case 'stadium':
        return {
          backgroundImage:
            'radial-gradient(ellipse at center, #1e293b 0%, #090d16 100%), linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(2, 6, 23, 0.95) 100%)',
        };
      case 'pitch':
        return {
          backgroundImage:
            'radial-gradient(circle at 50% 120%, #15803d 0%, #064e3b 50%, #022c22 100%)',
        };
      case 'court':
        return {
          backgroundImage:
            'linear-gradient(135deg, #1e3a8a 0%, #172554 50%, #0f172a 100%)',
        };
      case 'dark':
        return {
          backgroundColor: '#020617',
        };
      case 'transparent':
      default:
        return {
          backgroundImage:
            'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)',
          backgroundSize: '24px 24px',
          backgroundPosition: '0 0, 0 12px, 12px -12px, -12px 0px',
          backgroundColor: '#0f172a',
        };
    }
  };

  // Animation CSS Class helper
  const getAnimationClass = () => {
    if (!isAnimating) return '';
    switch (graphic.animation) {
      case 'BOUNCE':
        return 'animate-bounce';
      case 'POP':
      case 'SCALE':
        return 'animate-in zoom-in-50 duration-500';
      case 'FADE':
        return 'animate-in fade-in duration-500';
      case 'SLIDE':
      case 'SLIDE_UP':
        return 'animate-in slide-in-from-bottom duration-500';
      case 'SLIDE_DOWN':
        return 'animate-in slide-in-from-top duration-500';
      case 'SLIDE_LEFT':
        return 'animate-in slide-in-from-right duration-500';
      case 'SLIDE_RIGHT':
        return 'animate-in slide-in-from-left duration-500';
      case 'GLOW':
        return 'animate-pulse';
      default:
        return 'animate-in fade-in duration-300';
    }
  };

  // Compute live active rubber-band drawing box for stage overlay
  const drawingBox = drawingState
    ? {
        x: Math.min(drawingState.startX, drawingState.currentX),
        y: Math.min(drawingState.startY, drawingState.currentY),
        width: Math.abs(drawingState.currentX - drawingState.startX),
        height: Math.abs(drawingState.currentY - drawingState.startY),
      }
    : null;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden select-none">
      {/* Top Toolbar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 z-20">
        {/* Left Side: Active Tool Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-700/80">
            <button
              type="button"
              onClick={() => setActiveTool('SELECT')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition ${
                activeTool === 'SELECT'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Select, Move, Resize & Transform (V)"
            >
              <MousePointer className="w-3.5 h-3.5" />
              <span>Select</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool('RECTANGLE')}
              className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 text-xs font-bold transition ${
                activeTool === 'RECTANGLE'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Draw Box / Banner"
            >
              <Square className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Box</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool('ROUNDED_RECTANGLE')}
              className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 text-xs font-bold transition ${
                activeTool === 'ROUNDED_RECTANGLE'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Draw Rounded Card"
            >
              <Square className="w-3.5 h-3.5 rounded-sm" />
              <span className="hidden md:inline">Card</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool('CIRCLE')}
              className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 text-xs font-bold transition ${
                activeTool === 'CIRCLE'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Draw Circle / Avatar Ring"
            >
              <Circle className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Circle</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool('BADGE')}
              className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 text-xs font-bold transition ${
                activeTool === 'BADGE'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Draw Badge / Shield"
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Badge</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool('IMAGE')}
              className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 text-xs font-bold transition ${
                activeTool === 'IMAGE'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Draw Image Frame"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Image</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool('TEXT')}
              className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 text-xs font-bold transition ${
                activeTool === 'TEXT'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Draw Text Box"
            >
              <Type className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Text</span>
            </button>
          </div>
        </div>

        {/* Right Side: Preview & Canvas Controls */}
        <div className="flex items-center gap-2 text-xs">
          {/* Resolution Selector Dropdown */}
          {onApplyResolution && (
            <ResolutionSelectorDropdown
              graphic={graphic}
              onApplyResolution={onApplyResolution}
            />
          )}

          {/* Magnetic Snap Toggle */}
          <button
            type="button"
            onClick={() => setSnapEnabled(!snapEnabled)}
            className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition ${
              snapEnabled
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="Toggle Magnetic Smart Snapping (Centers, Edges, Safe Areas)"
          >
            <Magnet className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">{snapEnabled ? 'SNAP: ON' : 'SNAP: OFF'}</span>
          </button>

          {/* Zoom Dropdown Control */}
          <div className="relative" ref={zoomDropdownRef}>
            <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-700/80">
              <span className="text-[10px] font-black uppercase text-sky-400 pl-2 pr-1 tracking-wider select-none hidden sm:inline">
                ZOOM
              </span>
              <button
                type="button"
                onClick={() => setIsZoomDropdownOpen(!isZoomDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-mono font-bold transition border border-slate-700/60"
                title="Canvas Viewport Zoom"
              >
                <span>
                  {zoomMode === 'fit' ? `FIT (${Math.round(scale * 100)}%)` : `${zoomMode}%`}
                </span>
                <ChevronDown
                  className={`w-3 h-3 text-slate-400 transition-transform ${
                    isZoomDropdownOpen ? 'rotate-180 text-sky-400' : ''
                  }`}
                />
              </button>
            </div>

            {isZoomDropdownOpen && (
              <div className="absolute top-full right-0 mt-1.5 w-36 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 p-1 font-mono text-xs animate-in fade-in zoom-in-95 duration-150">
                {[
                  { id: 'fit', label: `FIT (${Math.round(scale * 100)}%)` },
                  { id: '25', label: '25%' },
                  { id: '50', label: '50%' },
                  { id: '75', label: '75%' },
                  { id: '100', label: '100% (1:1)' },
                  { id: '150', label: '150%' },
                  { id: '200', label: '200%' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSetZoom(item.id as any)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition ${
                      zoomMode === item.id
                        ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/40'
                        : 'text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <span>{item.label}</span>
                    {zoomMode === item.id && <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Safe Areas Button */}
          <button
            type="button"
            onClick={() => setShowSafeAreas(!showSafeAreas)}
            className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition ${
              showSafeAreas
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="Toggle Broadcast Safe Area Guides (90% Action / 80% Title)"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">SAFE AREA</span>
          </button>

          {/* Grid Button */}
          <button
            type="button"
            onClick={() => setShowGridLines(!showGridLines)}
            className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition ${
              showGridLines
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="Toggle Center Alignment Guides"
          >
            <Grid className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">GRID</span>
          </button>

          {/* Play Animation Test */}
          <button
            type="button"
            onClick={handlePlayAnimation}
            className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg flex items-center gap-1 font-bold transition"
            title="Test Entry Animation"
          >
            <Play className="w-3 h-3 fill-current" />
            <span className="hidden lg:inline">Play</span>
          </button>

          {/* Live Data Toggle */}
          <button
            type="button"
            onClick={onToggleSimulatingData}
            className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition ${
              isSimulatingData
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="Toggle between raw dynamic tags and simulated live match data"
          >
            <Sparkles className="w-3 h-3" />
            <span className="hidden lg:inline">
              {isSimulatingData ? 'Live Data: ON' : 'Raw Tags'}
            </span>
          </button>

          {/* Background Selector */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {(['transparent', 'stadium', 'pitch', 'court', 'dark'] as const).map((bg) => (
              <button
                key={bg}
                type="button"
                onClick={() => onChangePreviewBg(bg)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium capitalize transition ${
                  previewBg === bg
                    ? 'bg-slate-700 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {bg}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Scaled Canvas Viewport */}
      <div
        ref={containerRef}
        onPointerDown={handleStagePointerDown}
        className={`flex-1 flex items-center justify-center p-6 overflow-auto relative touch-none select-none ${
          activeTool !== 'SELECT' ? 'cursor-crosshair' : 'cursor-default'
        }`}
      >
        {/* Stage Layout Outer Box with exact scaled physical dimension */}
        <div
          id="canvas-stage-wrapper"
          style={{
            width: `${Math.max(1, Math.round(canvasWidth * scale))}px`,
            height: `${Math.max(1, Math.round(canvasHeight * scale))}px`,
            position: 'relative',
            flexShrink: 0,
          }}
          className="shadow-2xl rounded-sm"
        >
          {/* The Scaled Stage with Native Resolution Dimensions */}
          <div
            ref={stageRef}
            key={animKey}
            id="canvas-background"
            style={{
              width: `${canvasWidth}px`,
              height: `${canvasHeight}px`,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              position: 'absolute',
              top: 0,
              left: 0,
              ...getBackgroundStyle(),
            }}
            className={`border-2 border-slate-700/80 overflow-hidden ${getAnimationClass()}`}
          >
            {/* Safe Area Guides */}
            {showSafeAreas && (
              <>
                {/* Action Safe (90%) */}
                <div className="absolute inset-[5%] border border-dashed border-cyan-500/40 pointer-events-none z-50 flex items-start justify-end p-2">
                  <span className="text-[14px] font-mono text-cyan-400 bg-slate-950/80 px-2 py-0.5 rounded">
                    Action Safe (90%)
                  </span>
                </div>
                {/* Title Safe (80%) */}
                <div className="absolute inset-[10%] border border-dashed border-amber-500/40 pointer-events-none z-50 flex items-start justify-end p-2">
                  <span className="text-[14px] font-mono text-amber-400 bg-slate-950/80 px-2 py-0.5 rounded">
                    Title Safe (80%)
                  </span>
                </div>
              </>
            )}

            {/* Grid Centerlines */}
            {showGridLines && (
              <>
                <div className="absolute top-1/2 left-0 w-full h-px bg-rose-500/40 pointer-events-none z-50" />
                <div className="absolute top-0 left-1/2 w-px h-full bg-rose-500/40 pointer-events-none z-50" />
              </>
            )}

            {/* Dynamic Magnetic Snapping Guide Overlays */}
            {activeSnapGuides.vertical && (
              <div
                style={{
                  position: 'absolute',
                  left: `${activeSnapGuides.vertical.x}px`,
                  top: 0,
                  width: '1px',
                  height: '100%',
                  zIndex: 99998,
                }}
                className="bg-cyan-400 shadow-[0_0_8px_#22d3ee] pointer-events-none"
              >
                <div className="absolute top-4 left-2 bg-cyan-500 text-slate-950 font-mono text-[11px] font-black px-1.5 py-0.5 rounded shadow">
                  {activeSnapGuides.vertical.label}
                </div>
              </div>
            )}

            {activeSnapGuides.horizontal && (
              <div
                style={{
                  position: 'absolute',
                  top: `${activeSnapGuides.horizontal.y}px`,
                  left: 0,
                  width: '100%',
                  height: '1px',
                  zIndex: 99998,
                }}
                className="bg-cyan-400 shadow-[0_0_8px_#22d3ee] pointer-events-none"
              >
                <div className="absolute left-4 top-2 bg-cyan-500 text-slate-950 font-mono text-[11px] font-black px-1.5 py-0.5 rounded shadow">
                  {activeSnapGuides.horizontal.label}
                </div>
              </div>
            )}

            {/* Render All Graphic Elements (Sorted by Z-Index) */}
            {[...graphic.elements]
              .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
              .map((el) => {
                const isSelected = effectiveSelectedIds.includes(el.id);
                const isPrimarySelected = selectedElement?.id === el.id;

                return (
                  <React.Fragment key={el.id}>
                    {/* Visual Element Renderer */}
                    <StudioGraphicElementRenderer
                      element={el}
                      isSimulatingData={isSimulatingData}
                      customData={customData}
                      dataContext={dataContext}
                      isSelected={isSelected}
                      onMouseDown={() => {}}
                      className={
                        el.locked
                          ? 'cursor-not-allowed'
                          : activeTool === 'SELECT'
                          ? 'cursor-move'
                          : 'cursor-crosshair'
                      }
                    />

                    {/* Move Hitbox overlay to intercept pointer on element */}
                    <div
                      onPointerDown={(e) => handleElementPointerDown(el, e)}
                      style={{
                        position: 'absolute',
                        left: `${el.x}px`,
                        top: `${el.y}px`,
                        width: `${el.width}px`,
                        height: `${el.height}px`,
                        transform: `rotate(${el.rotation || 0}deg) scale(${el.scale || 1})`,
                        transformOrigin: 'center center',
                        zIndex: (el.zIndex || 1) + 10,
                      }}
                      className={
                        el.locked
                          ? 'cursor-not-allowed'
                          : activeTool === 'SELECT'
                          ? 'cursor-move'
                          : 'cursor-crosshair pointer-events-none'
                      }
                    />

                    {/* Multi-selection bounding box for secondary items */}
                    {isSelected && !isPrimarySelected && activeTool === 'SELECT' && (
                      <div
                        style={{
                          position: 'absolute',
                          left: `${el.x}px`,
                          top: `${el.y}px`,
                          width: `${el.width}px`,
                          height: `${el.height}px`,
                          transform: `rotate(${el.rotation || 0}deg) scale(${el.scale || 1})`,
                          transformOrigin: 'center center',
                          pointerEvents: 'none',
                          zIndex: 9998,
                        }}
                        className="border-2 border-dashed border-sky-400 bg-sky-500/10"
                      />
                    )}

                    {/* Interactive Transform Bounding Box & 8-Point Resize Handles (only for primary selected) */}
                    {isPrimarySelected && activeTool === 'SELECT' && (
                      <div
                        style={{
                          position: 'absolute',
                          left: `${el.x}px`,
                          top: `${el.y}px`,
                          width: `${el.width}px`,
                          height: `${el.height}px`,
                          transform: `rotate(${el.rotation || 0}deg) scale(${el.scale || 1})`,
                          transformOrigin: 'center center',
                          pointerEvents: 'none',
                          zIndex: 9999,
                        }}
                        className="border-2 border-emerald-400 ring-2 ring-emerald-500/30"
                      >
                        {/* Contextual Toolbar Floating Above/Below Element */}
                        <div
                          style={{
                            position: 'absolute',
                            left: '50%',
                            top: el.y < 90 ? `${el.height + 16}px` : '-54px',
                            transform: 'translateX(-50%)',
                            pointerEvents: 'auto',
                          }}
                          className="bg-slate-950/95 border border-slate-700/90 shadow-2xl rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 text-slate-300 font-sans z-50 backdrop-blur-md whitespace-nowrap animate-in fade-in zoom-in-95 duration-100"
                        >
                          {/* Batch Selection Mode */}
                          {isMultiSelected ? (
                            <>
                              <span className="text-[11px] font-mono font-black text-sky-400 pr-1.5 border-r border-slate-800">
                                {effectiveSelectedIds.length} Layers Selected
                              </span>

                              {/* Batch Alignment Tools */}
                              {onBatchAlign && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => onBatchAlign('LEFT')}
                                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                                    title="Align Left Edges"
                                  >
                                    <AlignStartVertical className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onBatchAlign('CENTER_H')}
                                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                                    title="Align Centers Horizontally"
                                  >
                                    <AlignHorizontalJustifyCenter className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onBatchAlign('RIGHT')}
                                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                                    title="Align Right Edges"
                                  >
                                    <AlignEndVertical className="w-3.5 h-3.5" />
                                  </button>

                                  <div className="w-px h-3.5 bg-slate-800 mx-0.5" />

                                  <button
                                    type="button"
                                    onClick={() => onBatchAlign('TOP')}
                                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                                    title="Align Top Edges"
                                  >
                                    <AlignStartHorizontal className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onBatchAlign('MIDDLE_V')}
                                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                                    title="Align Centers Vertically"
                                  >
                                    <AlignVerticalJustifyCenter className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onBatchAlign('BOTTOM')}
                                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                                    title="Align Bottom Edges"
                                  >
                                    <AlignEndHorizontal className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}

                              {/* Batch Lock / Unlock */}
                              {onBatchToggleLock && (
                                <button
                                  type="button"
                                  onClick={onBatchToggleLock}
                                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition"
                                  title="Toggle Lock Selected Layers"
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Batch Duplicate */}
                              {onBatchDuplicate && (
                                <button
                                  type="button"
                                  onClick={onBatchDuplicate}
                                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition"
                                  title="Duplicate Selected Layers"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Batch Delete */}
                              {onBatchDelete && (
                                <button
                                  type="button"
                                  onClick={onBatchDelete}
                                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-950/50 hover:bg-rose-900/80 border border-rose-700/60 text-rose-400 hover:text-rose-200 transition text-[10px] font-bold active:scale-95"
                                  title="Delete Selected Layers (Delete / Backspace)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete ({effectiveSelectedIds.length})</span>
                                </button>
                              )}
                            </>
                          ) : (
                            /* Single Element Contextual Toolbar */
                            <>
                              {/* Element Name Badge */}
                              <span className="text-[11px] font-mono font-bold text-emerald-400 pr-1.5 border-r border-slate-800 truncate max-w-[120px]">
                                {el.name}
                              </span>

                              {/* Text Specific Quick Formatting Controls */}
                              {el.type === 'TEXT' && onUpdateElement && !el.locked && (
                                <>
                                  {/* Font Family Quick Select */}
                                  <select
                                    value={el.fontFamily || 'Montserrat'}
                                    onChange={(e) => onUpdateElement({ fontFamily: e.target.value })}
                                    className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-white focus:outline-none focus:border-emerald-500 font-bold max-w-[90px]"
                                  >
                                    <option value="Montserrat">Montserrat</option>
                                    <option value="Oswald">Oswald</option>
                                    <option value="Bebas Neue">Bebas Neue</option>
                                    <option value="Impact">Impact</option>
                                    <option value="Orbitron">Orbitron</option>
                                    <option value="Inter">Inter</option>
                                    <option value="Playfair Display">Playfair</option>
                                    <option value="monospace">Mono</option>
                                  </select>

                                  {/* Bold Toggle */}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onUpdateElement({
                                        fontWeight:
                                          el.fontWeight === 'bold' ||
                                          el.fontWeight === '800' ||
                                          el.fontWeight === '900'
                                            ? '400'
                                            : '800',
                                      })
                                    }
                                    className={`p-1 rounded transition ${
                                      el.fontWeight === 'bold' ||
                                      el.fontWeight === '800' ||
                                      el.fontWeight === '900'
                                        ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                    }`}
                                    title="Toggle Bold"
                                  >
                                    <Bold className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Italic Toggle */}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onUpdateElement({
                                        fontStyle: el.fontStyle === 'italic' ? 'normal' : 'italic',
                                      })
                                    }
                                    className={`p-1 rounded transition ${
                                      el.fontStyle === 'italic'
                                        ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                    }`}
                                    title="Toggle Italic"
                                  >
                                    <Italic className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Underline Toggle */}
                                  <button
                                    type="button"
                                    onClick={() => onUpdateElement({ underline: !el.underline })}
                                    className={`p-1 rounded transition ${
                                      el.underline
                                        ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                    }`}
                                    title="Toggle Underline"
                                  >
                                    <Underline className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Font Size Quick Stepper */}
                                  <div className="flex items-center bg-slate-900 border border-slate-700 rounded px-1 py-0.5 gap-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onUpdateElement({
                                          fontSize: Math.max(8, (el.fontSize || 24) - 2),
                                        })
                                      }
                                      className="text-[10px] font-bold text-slate-400 hover:text-white px-0.5"
                                      title="Decrease Font Size"
                                    >
                                      -
                                    </button>
                                    <span className="text-[10px] font-mono font-bold text-white min-w-[18px] text-center">
                                      {el.fontSize || 24}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onUpdateElement({
                                          fontSize: Math.min(200, (el.fontSize || 24) + 2),
                                        })
                                      }
                                      className="text-[10px] font-bold text-slate-400 hover:text-white px-0.5"
                                      title="Increase Font Size"
                                    >
                                      +
                                    </button>
                                  </div>

                                  {/* Text Color Picker Popover Button */}
                                  <div className="relative">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setToolbarColorPickerTarget(
                                          toolbarColorPickerTarget === 'TEXT' ? null : 'TEXT'
                                        )
                                      }
                                      className="flex items-center gap-1 p-1 rounded hover:bg-slate-800 border border-slate-700"
                                      title="Text Color"
                                    >
                                      <div
                                        style={{ backgroundColor: el.textColor || '#ffffff' }}
                                        className="w-3.5 h-3.5 rounded-full border border-white/40"
                                      />
                                      <Palette className="w-3 h-3 text-slate-400" />
                                    </button>

                                    {toolbarColorPickerTarget === 'TEXT' && (
                                      <div className="absolute top-full left-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                                        <StudioColorPicker
                                          color={el.textColor || '#ffffff'}
                                          gradient={el.textGradient}
                                          allowGradient={true}
                                          onChangeColor={(c) =>
                                            onUpdateElement({
                                              textColor: c,
                                              textGradient: {
                                                ...el.textGradient!,
                                                enabled: false,
                                              },
                                            })
                                          }
                                          onChangeGradient={(grad) =>
                                            onUpdateElement({ textGradient: grad })
                                          }
                                        />
                                      </div>
                                    )}
                                  </div>
                                </>
                              )}

                              {/* Shapes Quick Fill & Stroke Color Picker */}
                              {el.type !== 'TEXT' &&
                                el.type !== 'IMAGE' &&
                                onUpdateElement &&
                                !el.locked && (
                                  <>
                                    {/* Fill Color Picker Popover */}
                                    <div className="relative">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setToolbarColorPickerTarget(
                                            toolbarColorPickerTarget === 'FILL' ? null : 'FILL'
                                          )
                                        }
                                        className="flex items-center gap-1 p-1 rounded hover:bg-slate-800 border border-slate-700"
                                        title="Fill Color & Gradient"
                                      >
                                        <div
                                          style={{
                                            backgroundColor: el.fillColor || '#0f172a',
                                          }}
                                          className="w-3.5 h-3.5 rounded-sm border border-white/40"
                                        />
                                        <span className="text-[10px] text-slate-300">Fill</span>
                                      </button>

                                      {toolbarColorPickerTarget === 'FILL' && (
                                        <div className="absolute top-full left-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                                          <StudioColorPicker
                                            color={el.fillColor || '#0f172a'}
                                            gradient={el.gradient}
                                            allowGradient={true}
                                            onChangeColor={(c) =>
                                              onUpdateElement({
                                                fillColor: c,
                                                gradient: {
                                                  ...el.gradient!,
                                                  enabled: false,
                                                },
                                              })
                                            }
                                            onChangeGradient={(grad) =>
                                              onUpdateElement({ gradient: grad })
                                            }
                                          />
                                        </div>
                                      )}
                                    </div>

                                    {/* Border Width Stepper */}
                                    <div className="flex items-center bg-slate-900 border border-slate-700 rounded px-1 py-0.5 gap-1">
                                      <span className="text-[9px] text-slate-400 font-bold">
                                        BORDER
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          onUpdateElement({
                                            borderWidth: Math.max(0, (el.borderWidth || 0) - 1),
                                          })
                                        }
                                        className="text-[10px] font-bold text-slate-400 hover:text-white px-0.5"
                                      >
                                        -
                                      </button>
                                      <span className="text-[10px] font-mono font-bold text-white min-w-[14px] text-center">
                                        {el.borderWidth || 0}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          onUpdateElement({
                                            borderWidth: Math.min(30, (el.borderWidth || 0) + 1),
                                          })
                                        }
                                        className="text-[10px] font-bold text-slate-400 hover:text-white px-0.5"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </>
                                )}

                              {/* Quick Alignment */}
                              {!el.locked && (
                                <>
                                  <div className="w-px h-3.5 bg-slate-800 mx-0.5" />
                                  <button
                                    type="button"
                                    onClick={handleCenterHorizontal}
                                    className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-slate-400 hover:text-sky-300 hover:bg-slate-800 transition"
                                    title="Center Horizontally on Canvas"
                                  >
                                    Center H
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleCenterVertical}
                                    className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-slate-400 hover:text-sky-300 hover:bg-slate-800 transition"
                                    title="Center Vertically on Canvas"
                                  >
                                    Center V
                                  </button>
                                </>
                              )}

                              {/* Rotation Quick Controls */}
                              {!el.locked && (
                                <>
                                  <div className="w-px h-3.5 bg-slate-800 mx-0.5" />
                                  <button
                                    type="button"
                                    onClick={() => handleRotateDelta(-90)}
                                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                                    title="Rotate -90°"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRotateDelta(90)}
                                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                                    title="Rotate +90°"
                                  >
                                    <RotateCw className="w-3.5 h-3.5" />
                                  </button>
                                  {(el.rotation || 0) !== 0 && (
                                    <button
                                      type="button"
                                      onClick={handleResetRotation}
                                      className="px-1 py-0.5 rounded text-[10px] font-mono text-amber-400 hover:bg-slate-800 transition"
                                      title="Reset Rotation to 0°"
                                    >
                                      0°
                                    </button>
                                  )}
                                </>
                              )}

                              {/* Lock / Unlock */}
                              {onToggleLock && (
                                <button
                                  type="button"
                                  onClick={() => onToggleLock(el.id)}
                                  className={`p-1 rounded hover:bg-slate-800 transition ${
                                    el.locked
                                      ? 'text-amber-400 bg-amber-950/40'
                                      : 'text-slate-400 hover:text-white'
                                  }`}
                                  title={
                                    el.locked ? 'Unlock Element' : 'Lock Element Position & Size'
                                  }
                                >
                                  {el.locked ? (
                                    <Lock className="w-3.5 h-3.5" />
                                  ) : (
                                    <Unlock className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}

                              {/* Visibility */}
                              {onToggleVisibility && (
                                <button
                                  type="button"
                                  onClick={() => onToggleVisibility(el.id)}
                                  className={`p-1 rounded hover:bg-slate-800 transition ${
                                    el.visible === false
                                      ? 'text-rose-400'
                                      : 'text-slate-400 hover:text-white'
                                  }`}
                                  title={el.visible === false ? 'Show Element' : 'Hide Element'}
                                >
                                  {el.visible === false ? (
                                    <EyeOff className="w-3.5 h-3.5" />
                                  ) : (
                                    <Eye className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}

                              {/* Reorder / Layers */}
                              {onReorderElement && !el.locked && (
                                <>
                                  <div className="w-px h-3.5 bg-slate-800 mx-0.5" />
                                  <button
                                    type="button"
                                    onClick={() => onReorderElement(el.id, 'TOP')}
                                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                                    title="Bring to Front"
                                  >
                                    <ChevronsUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onReorderElement(el.id, 'UP')}
                                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                                    title="Bring Forward"
                                  >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onReorderElement(el.id, 'DOWN')}
                                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                                    title="Send Backward"
                                  >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onReorderElement(el.id, 'BOTTOM')}
                                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                                    title="Send to Back"
                                  >
                                    <ChevronsDown className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}

                              {/* Duplicate & Delete */}
                              <div className="w-px h-3.5 bg-slate-800 mx-0.5" />
                              {onDuplicateElement && (
                                <button
                                  type="button"
                                  onClick={() => onDuplicateElement(el.id)}
                                  className="p-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition"
                                  title="Duplicate Element (Ctrl+D / Cmd+D)"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {onDeleteElement && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!el.locked) {
                                      onDeleteElement(el.id);
                                    }
                                  }}
                                  disabled={el.locked}
                                  className={`flex items-center gap-1 px-2 py-0.5 rounded transition text-[10px] font-bold ${
                                    el.locked
                                      ? 'opacity-40 cursor-not-allowed text-slate-500 bg-slate-900/50'
                                      : 'text-rose-400 hover:text-rose-200 bg-rose-950/50 hover:bg-rose-900/80 border border-rose-700/60 shadow-sm active:scale-95'
                                  }`}
                                  title={
                                    el.locked
                                      ? 'Element is locked. Unlock to delete.'
                                      : 'Delete Element (Delete / Backspace)'
                                  }
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete</span>
                                </button>
                              )}
                            </>
                          )}
                        </div>

                        {/* Element Info HUD Header */}
                        <div className="absolute -top-7 left-0 bg-emerald-500 text-slate-950 font-mono font-black text-[11px] px-2 py-0.5 rounded shadow-xl flex items-center gap-1.5 whitespace-nowrap pointer-events-none">
                          {el.locked && <Lock className="w-3 h-3 text-slate-950" />}
                          <span>{el.name}</span>
                          <span className="opacity-85">
                            ({Math.round(el.x)}, {Math.round(el.y)}) • {Math.round(el.width)}×
                            {Math.round(el.height)}
                            {el.rotation ? ` • ${el.rotation}°` : ''}
                          </span>
                        </div>

                        {/* Rotation Pin & Handle (Top Center) */}
                        {!el.locked && (
                          <>
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-emerald-400 pointer-events-none" />
                            <div
                              onPointerDown={handleRotatePointerDown}
                              className="absolute -top-8 left-1/2 -translate-x-1/2 w-5 h-5 bg-emerald-400 border-2 border-slate-950 rounded-full cursor-grab active:cursor-grabbing pointer-events-auto hover:scale-125 transition-transform flex items-center justify-center shadow-lg"
                              title="Drag to Rotate (Hold Shift to snap 15°)"
                            >
                              <RotateCw className="w-3 h-3 text-slate-950" />
                            </div>
                          </>
                        )}

                        {/* 8-Point Interactive Resize Handles */}
                        {!el.locked && (
                          <>
                            {/* NW */}
                            <div
                              onPointerDown={(e) => handleResizePointerDown('nw', e)}
                              className="absolute -top-2.5 -left-2.5 w-5 h-5 bg-white border-2 border-emerald-500 rounded-sm cursor-nwse-resize pointer-events-auto shadow hover:scale-125 active:bg-emerald-200 transition-transform"
                              title="Resize Top-Left (Hold Shift for Aspect Ratio, Alt for Center)"
                            />
                            {/* N */}
                            <div
                              onPointerDown={(e) => handleResizePointerDown('n', e)}
                              className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-5 h-5 bg-white border-2 border-emerald-500 rounded-sm cursor-ns-resize pointer-events-auto shadow hover:scale-125 active:bg-emerald-200 transition-transform"
                              title="Resize Top Height"
                            />
                            {/* NE */}
                            <div
                              onPointerDown={(e) => handleResizePointerDown('ne', e)}
                              className="absolute -top-2.5 -right-2.5 w-5 h-5 bg-white border-2 border-emerald-500 rounded-sm cursor-nesw-resize pointer-events-auto shadow hover:scale-125 active:bg-emerald-200 transition-transform"
                              title="Resize Top-Right"
                            />
                            {/* E */}
                            <div
                              onPointerDown={(e) => handleResizePointerDown('e', e)}
                              className="absolute top-1/2 -right-2.5 -translate-y-1/2 w-5 h-5 bg-white border-2 border-emerald-500 rounded-sm cursor-ew-resize pointer-events-auto shadow hover:scale-125 active:bg-emerald-200 transition-transform"
                              title="Resize Right Width"
                            />
                            {/* SE */}
                            <div
                              onPointerDown={(e) => handleResizePointerDown('se', e)}
                              className="absolute -bottom-2.5 -right-2.5 w-5 h-5 bg-white border-2 border-emerald-500 rounded-sm cursor-nwse-resize pointer-events-auto shadow hover:scale-125 active:bg-emerald-200 transition-transform"
                              title="Resize Bottom-Right (Hold Shift for Aspect Ratio, Alt for Center)"
                            />
                            {/* S */}
                            <div
                              onPointerDown={(e) => handleResizePointerDown('s', e)}
                              className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-5 h-5 bg-white border-2 border-emerald-500 rounded-sm cursor-ns-resize pointer-events-auto shadow hover:scale-125 active:bg-emerald-200 transition-transform"
                              title="Resize Bottom Height"
                            />
                            {/* SW */}
                            <div
                              onPointerDown={(e) => handleResizePointerDown('sw', e)}
                              className="absolute -bottom-2.5 -left-2.5 w-5 h-5 bg-white border-2 border-emerald-500 rounded-sm cursor-nesw-resize pointer-events-auto shadow hover:scale-125 active:bg-emerald-200 transition-transform"
                              title="Resize Bottom-Left"
                            />
                            {/* W */}
                            <div
                              onPointerDown={(e) => handleResizePointerDown('w', e)}
                              className="absolute top-1/2 -left-2.5 -translate-y-1/2 w-5 h-5 bg-white border-2 border-emerald-500 rounded-sm cursor-ew-resize pointer-events-auto shadow hover:scale-125 active:bg-emerald-200 transition-transform"
                              title="Resize Left Width"
                            />
                          </>
                        )}
                      </div>
                    )}
                  </React.Fragment>
                );
              })}

            {/* Active Rubber-Band Drawing Box */}
            {drawingBox && drawingBox.width > 5 && drawingBox.height > 5 && (
              <div
                style={{
                  position: 'absolute',
                  left: `${drawingBox.x}px`,
                  top: `${drawingBox.y}px`,
                  width: `${drawingBox.width}px`,
                  height: `${drawingBox.height}px`,
                  pointerEvents: 'none',
                  zIndex: 99999,
                }}
                className="border-2 border-dashed border-emerald-400 bg-emerald-500/10"
              >
                <div className="absolute -top-7 left-0 bg-emerald-500 text-slate-950 font-mono font-black text-[11px] px-2 py-0.5 rounded shadow">
                  Draw {activeTool} • {Math.round(drawingBox.width)} ×{' '}
                  {Math.round(drawingBox.height)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Visible Canvas Info & Diagnostics Status Bar */}
      <div
        id="canvas-diagnostic-bar"
        className="bg-slate-950/95 border-t border-slate-800/80 px-4 py-1.5 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-slate-400 select-none shrink-0"
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 text-slate-200">
            <span className="text-emerald-400 font-bold">Master:</span>
            <span className="font-bold text-white font-mono">{canvasWidth} × {canvasHeight}</span>
          </span>
          <span className="text-slate-700">|</span>
          <span className="flex items-center gap-1 text-slate-300">
            <span className="text-slate-400">Viewport:</span>
            <span className="text-sky-300 font-mono font-semibold">
              {Math.round(canvasWidth * scale)} × {Math.round(canvasHeight * scale)}px
            </span>
          </span>
          <span className="text-slate-700">|</span>
          <span className="flex items-center gap-1">
            <span className="text-slate-400">Aspect:</span>
            <span className="text-emerald-400 font-bold font-mono">{currentAspectRatio}</span>
          </span>
          <span className="text-slate-700">|</span>
          <span className="flex items-center gap-1">
            <span className="text-slate-400">Zoom:</span>
            <span className="text-sky-400 font-bold font-mono">{Math.round(scale * 100)}%</span>
            <span className="text-[10px] text-slate-500">({zoomMode.toUpperCase()})</span>
          </span>
          <span className="text-slate-700 hidden sm:inline">|</span>
          <span className="hidden sm:inline-flex items-center gap-1 text-slate-400">
            <span>Orientation:</span>
            <span className="text-amber-400 font-semibold uppercase">{currentOrientation}</span>
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <span className="text-slate-400">
            Layers: <span className="text-white font-bold">{graphic.elements.length}</span>
          </span>
          {isMultiSelected ? (
            <span className="text-sky-400 bg-sky-950/60 border border-sky-800/60 px-2 py-0.5 rounded text-[10px] font-bold">
              Multi-Select: {effectiveSelectedIds.length} layers
            </span>
          ) : selectedElement ? (
            <span className="text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded text-[10px] truncate max-w-[200px]">
              Selected: {selectedElement.name}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
};
