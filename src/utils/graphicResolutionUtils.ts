import {
  GraphicElement,
  StudioGraphic,
  GraphicAspectRatio,
  GraphicResolutionPreset,
  GraphicOrientation,
  ResolutionConversionStrategy,
} from '../types';

export interface ResolutionPresetItem {
  id: GraphicResolutionPreset;
  name: string;
  width: number;
  height: number;
  aspectRatio: GraphicAspectRatio;
  category: '16:9' | '4:3' | '1:1' | '9:16' | '4:5' | 'CUSTOM';
  orientation: GraphicOrientation;
  description: string;
  isStandard?: boolean;
}

export const MIN_RESOLUTION_DIMENSION = 320;
export const MIN_HEIGHT_DIMENSION = 240;
export const MAX_RESOLUTION_DIMENSION = 7680;
export const MAX_HEIGHT_DIMENSION = 4320;

export const RESOLUTION_PRESETS: ResolutionPresetItem[] = [
  // 16:9 Standard Broadcast & Video
  {
    id: '4K_UHD',
    name: '3840 × 2160 — 4K UHD',
    width: 3840,
    height: 2160,
    aspectRatio: '16:9',
    category: '16:9',
    orientation: 'LANDSCAPE',
    description: 'Ultra High Definition 2160p Broadcast / Master',
  },
  {
    id: 'QHD',
    name: '2560 × 1440 — QHD',
    width: 2560,
    height: 1440,
    aspectRatio: '16:9',
    category: '16:9',
    orientation: 'LANDSCAPE',
    description: 'Quad HD 1440p Gaming & Esports',
  },
  {
    id: 'FULL_HD',
    name: '1920 × 1080 — Full HD',
    width: 1920,
    height: 1080,
    aspectRatio: '16:9',
    category: '16:9',
    orientation: 'LANDSCAPE',
    description: 'Standard 1080p Broadcast / OBS / vMix Default',
    isStandard: true,
  },
  {
    id: 'HD_900',
    name: '1600 × 900',
    width: 1600,
    height: 900,
    aspectRatio: '16:9',
    category: '16:9',
    orientation: 'LANDSCAPE',
    description: '900p Stream Overlay',
  },
  {
    id: 'HD_768',
    name: '1366 × 768',
    width: 1366,
    height: 768,
    aspectRatio: '16:9',
    category: '16:9',
    orientation: 'LANDSCAPE',
    description: '1366x768 Standard HD Display',
  },
  {
    id: 'HD_720',
    name: '1280 × 720 — HD',
    width: 1280,
    height: 720,
    aspectRatio: '16:9',
    category: '16:9',
    orientation: 'LANDSCAPE',
    description: 'High Definition 720p Lightweight Stream',
  },
  {
    id: 'SD_576',
    name: '1024 × 576',
    width: 1024,
    height: 576,
    aspectRatio: '16:9',
    category: '16:9',
    orientation: 'LANDSCAPE',
    description: '1024x576 Widescreen Standard Definition',
  },

  // 4:3 Classic TV & Stadium Jumbotrons
  {
    id: '4_3_1200',
    name: '1600 × 1200',
    width: 1600,
    height: 1200,
    aspectRatio: '4:3',
    category: '4:3',
    orientation: 'LANDSCAPE',
    description: '4:3 High Resolution Display',
  },
  {
    id: '4_3_960',
    name: '1280 × 960',
    width: 1280,
    height: 960,
    aspectRatio: '4:3',
    category: '4:3',
    orientation: 'LANDSCAPE',
    description: '4:3 Standard Scoreboard Screen',
  },
  {
    id: '4_3_768',
    name: '1024 × 768',
    width: 1024,
    height: 768,
    aspectRatio: '4:3',
    category: '4:3',
    orientation: 'LANDSCAPE',
    description: 'Classic 4:3 Arena Jumbotron',
  },
  {
    id: '4_3_600',
    name: '800 × 600',
    width: 800,
    height: 600,
    aspectRatio: '4:3',
    category: '4:3',
    orientation: 'LANDSCAPE',
    description: 'SVGA 4:3 Compact Display',
  },

  // 1:1 Square Posts & Digital Banners
  {
    id: '1_1_2160',
    name: '2160 × 2160',
    width: 2160,
    height: 2160,
    aspectRatio: '1:1',
    category: '1:1',
    orientation: 'SQUARE',
    description: 'Square 4K High-Res Poster',
  },
  {
    id: '1_1_1080',
    name: '1080 × 1080',
    width: 1080,
    height: 1080,
    aspectRatio: '1:1',
    category: '1:1',
    orientation: 'SQUARE',
    description: 'Square Social Graphic / Instagram Post',
  },
  {
    id: '1_1_720',
    name: '720 × 720',
    width: 720,
    height: 720,
    aspectRatio: '1:1',
    category: '1:1',
    orientation: 'SQUARE',
    description: 'Compact Square Badge / Match Summary',
  },

  // 9:16 Vertical Video / Stories / Shorts / TikTok
  {
    id: '9_16_2160',
    name: '2160 × 3840',
    width: 2160,
    height: 3840,
    aspectRatio: '9:16',
    category: '9:16',
    orientation: 'PORTRAIT',
    description: 'Vertical 4K Mobile Broadcast',
  },
  {
    id: '9_16_1080',
    name: '1080 × 1920',
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    category: '9:16',
    orientation: 'PORTRAIT',
    description: 'Vertical 1080p Stories / Shorts / Reels',
  },
  {
    id: '9_16_720',
    name: '720 × 1280',
    width: 720,
    height: 1280,
    aspectRatio: '9:16',
    category: '9:16',
    orientation: 'PORTRAIT',
    description: 'Vertical 720p Mobile Stream',
  },

  // 4:5 Portrait Social Feed
  {
    id: '4_5_1350',
    name: '1080 × 1350',
    width: 1080,
    height: 1350,
    aspectRatio: '4:5',
    category: '4:5',
    orientation: 'PORTRAIT',
    description: '4:5 Portrait Social Feed / Match Card',
  },
  {
    id: '4_5_1080',
    name: '864 × 1080',
    width: 864,
    height: 1080,
    aspectRatio: '4:5',
    category: '4:5',
    orientation: 'PORTRAIT',
    description: '4:5 Standard Portrait Format',
  },

  // Custom Resolution
  {
    id: 'CUSTOM',
    name: 'Custom Dimensions',
    width: 1920,
    height: 1080,
    aspectRatio: 'CUSTOM',
    category: 'CUSTOM',
    orientation: 'LANDSCAPE',
    description: 'Freely configurable width and height (320-7680px)',
  },
];

export const ASPECT_RATIOS: Array<{ id: GraphicAspectRatio; label: string; ratio: number }> = [
  { id: '16:9', label: '16:9 Landscape', ratio: 16 / 9 },
  { id: '4:3', label: '4:3 Classic', ratio: 4 / 3 },
  { id: '1:1', label: '1:1 Square', ratio: 1 },
  { id: '9:16', label: '9:16 Portrait / Story', ratio: 9 / 16 },
  { id: '4:5', label: '4:5 Portrait Feed', ratio: 4 / 5 },
  { id: 'CUSTOM', label: 'Custom Ratio', ratio: 0 },
];

export const ZOOM_LEVELS: Array<{ id: string; label: string; value: number | 'fit' }> = [
  { id: 'fit', label: 'Fit', value: 'fit' },
  { id: '25', label: '25%', value: 0.25 },
  { id: '50', label: '50%', value: 0.5 },
  { id: '75', label: '75%', value: 0.75 },
  { id: '100', label: '100%', value: 1.0 },
  { id: '150', label: '150%', value: 1.5 },
  { id: '200', label: '200%', value: 2.0 },
];

export const GRID_SIZES: Array<{ label: string; value: number }> = [
  { label: '8 px', value: 8 },
  { label: '16 px', value: 16 },
  { label: '32 px', value: 32 },
  { label: '64 px', value: 64 },
];

/**
 * Detect orientation from width and height
 */
export function detectOrientation(width: number, height: number): GraphicOrientation {
  if (width === height) return 'SQUARE';
  return width > height ? 'LANDSCAPE' : 'PORTRAIT';
}

/**
 * Greatest common divisor for calculating ratio representation
 */
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * Detect or compute aspect ratio string from dimensions
 */
export function detectAspectRatio(width: number, height: number): GraphicAspectRatio {
  if (!width || !height) return '16:9';
  const ratio = width / height;

  if (Math.abs(ratio - 16 / 9) < 0.02) return '16:9';
  if (Math.abs(ratio - 4 / 3) < 0.02) return '4:3';
  if (Math.abs(ratio - 1) < 0.01) return '1:1';
  if (Math.abs(ratio - 9 / 16) < 0.02) return '9:16';
  if (Math.abs(ratio - 4 / 5) < 0.02) return '4:5';

  const divisor = gcd(Math.round(width), Math.round(height));
  if (divisor > 20) {
    const rw = Math.round(width / divisor);
    const rh = Math.round(height / divisor);
    if (rw < 30 && rh < 30) {
      return `${rw}:${rh}`;
    }
  }

  return `${width}:${height}`;
}

/**
 * Match dimensions against known resolution presets
 */
export function detectResolutionPreset(width: number, height: number): GraphicResolutionPreset {
  const match = RESOLUTION_PRESETS.find(
    (p) => p.id !== 'CUSTOM' && p.width === width && p.height === height
  );
  return match ? match.id : 'CUSTOM';
}

/**
 * Normalize and ensure complete backward compatible resolution fields for any StudioGraphic
 */
export function normalizeGraphicResolution(graphic: Partial<StudioGraphic>): {
  width: number;
  height: number;
  aspectRatio: GraphicAspectRatio;
  resolutionPreset: GraphicResolutionPreset | string;
  orientation: GraphicOrientation;
} {
  const width = Number(graphic.width) || Number(graphic.canvas?.width) || 1920;
  const height = Number(graphic.height) || Number(graphic.canvas?.height) || 1080;

  const orientation = graphic.orientation || detectOrientation(width, height);
  const aspectRatio = graphic.aspectRatio || detectAspectRatio(width, height);
  const resolutionPreset = graphic.resolutionPreset || detectResolutionPreset(width, height);

  return {
    width,
    height,
    aspectRatio,
    resolutionPreset,
    orientation,
  };
}

/**
 * Scale graphic elements proportionally when canvas resolution changes.
 * Supports strategies:
 * - 'FIT': scale to fit inside new bounds preserving aspect ratio, center canvas composition
 * - 'CROP': scale to fill entire new canvas preserving element proportions, crop overflow
 * - 'CENTER': keep exact 1:1 element dimensions, center composition in new canvas
 * - 'STRETCH': stretch coordinates independently along X and Y
 */
export function scaleGraphicElements(
  elements: GraphicElement[],
  oldWidth: number,
  oldHeight: number,
  newWidth: number,
  newHeight: number,
  strategy: ResolutionConversionStrategy = 'SCALE'
): GraphicElement[] {
  if (!elements || elements.length === 0) return [];
  if (oldWidth === newWidth && oldHeight === newHeight) return elements;

  const oldW = Math.max(1, oldWidth || 1920);
  const oldH = Math.max(1, oldHeight || 1080);
  const newW = Math.max(1, newWidth || 1920);
  const newH = Math.max(1, newHeight || 1080);

  // KEEP_POSITIONS: Do not touch any coordinate or size
  if (strategy === 'KEEP_POSITIONS') {
    return elements.map((el) => ({ ...el }));
  }

  // RECENTER: Preserve sizes, shift entire composition into center of new canvas
  if (strategy === 'RECENTER') {
    const shiftX = Math.round((newW - oldW) / 2);
    const shiftY = Math.round((newH - oldH) / 2);
    return elements.map((el) => ({
      ...el,
      x: Math.round(el.x + shiftX),
      y: Math.round(el.y + shiftY),
    }));
  }

  let scaleX = newW / oldW;
  let scaleY = newH / oldH;
  let offsetX = 0;
  let offsetY = 0;
  let uniformScale = (scaleX + scaleY) / 2;

  if (strategy === 'CENTER') {
    scaleX = 1;
    scaleY = 1;
    uniformScale = 1;
    offsetX = Math.round((newW - oldW) / 2);
    offsetY = Math.round((newH - oldH) / 2);
  } else if (strategy === 'CROP') {
    // Fill the new canvas
    uniformScale = Math.max(newW / oldW, newH / oldH);
    scaleX = uniformScale;
    scaleY = uniformScale;
    offsetX = Math.round((newW - oldW * uniformScale) / 2);
    offsetY = Math.round((newH - oldH * uniformScale) / 2);
  } else if (strategy === 'FIT') {
    // Fit into new canvas preserving aspect ratio
    uniformScale = Math.min(newW / oldW, newH / oldH);
    scaleX = uniformScale;
    scaleY = uniformScale;
    offsetX = Math.round((newW - oldW * uniformScale) / 2);
    offsetY = Math.round((newH - oldH * uniformScale) / 2);
  } else {
    // Standard 'SCALE' (Direct coordinate map scaleX = newW/oldW, scaleY = newH/oldH)
    scaleX = newW / oldW;
    scaleY = newH / oldH;
    uniformScale = Math.min(scaleX, scaleY);
    offsetX = 0;
    offsetY = 0;
  }

  return elements.map((el) => {
    // If element is explicitly set to MANUAL and user chose not to scale, preserve it
    if (el.transformMode === 'MANUAL' && strategy === 'FIT') {
      return { ...el };
    }

    const nextX = Math.round(offsetX + el.x * scaleX);
    const nextY = Math.round(offsetY + el.y * scaleY);
    const nextW = Math.max(2, Math.round(el.width * scaleX));
    const nextH = Math.max(2, Math.round(el.height * scaleY));

    const updated: GraphicElement = {
      ...el,
      x: nextX,
      y: nextY,
      width: nextW,
      height: nextH,
    };

    // Scale font size proportionally
    if (el.fontSize && typeof el.fontSize === 'number') {
      updated.fontSize = Math.max(8, Math.round(el.fontSize * uniformScale));
    }
    if (el.lineHeight && typeof el.lineHeight === 'number') {
      updated.lineHeight = Math.max(8, Math.round(el.lineHeight * uniformScale));
    }

    // Scale border and corner radiuses
    if (el.borderRadius !== undefined && typeof el.borderRadius === 'number') {
      updated.borderRadius = Math.max(0, Math.round(el.borderRadius * uniformScale));
    }
    if (el.borderWidth !== undefined && typeof el.borderWidth === 'number') {
      updated.borderWidth = Math.max(0, Math.round(el.borderWidth * uniformScale));
    }

    // Scale box shadow
    if (el.boxShadow) {
      updated.boxShadow = {
        ...el.boxShadow,
        x: Math.round((el.boxShadow.x || 0) * uniformScale),
        y: Math.round((el.boxShadow.y || 0) * uniformScale),
        blur: Math.round((el.boxShadow.blur || 0) * uniformScale),
        spread: Math.round((el.boxShadow.spread || 0) * uniformScale),
      };
    }

    // Scale text shadow
    if (el.textShadow) {
      updated.textShadow = {
        ...el.textShadow,
        x: Math.round((el.textShadow.x || 0) * uniformScale),
        y: Math.round((el.textShadow.y || 0) * uniformScale),
        blur: Math.round((el.textShadow.blur || 0) * uniformScale),
      };
    }

    // Scale glow effect
    if (el.glow) {
      updated.glow = {
        ...el.glow,
        blur: Math.round((el.glow.blur || 20) * uniformScale),
        spread: Math.round((el.glow.spread || 4) * uniformScale),
      };
    }

    // Scale glass blur
    if (el.glassBlur !== undefined && typeof el.glassBlur === 'number') {
      updated.glassBlur = Math.max(0, Math.round(el.glassBlur * uniformScale));
    }

    // Scale shape-specific metrics
    if (el.arrowHeadSize !== undefined && typeof el.arrowHeadSize === 'number') {
      updated.arrowHeadSize = Math.max(4, Math.round(el.arrowHeadSize * uniformScale));
    }

    return updated;
  });
}

/**
 * Calculate dynamic Action Safe (90%) and Title Safe (80%) guide boxes for any document resolution
 */
export function calculateSafeAreas(
  width: number,
  height: number,
  actionSafePct: number = 0.9,
  titleSafePct: number = 0.8
) {
  const w = width || 1920;
  const h = height || 1080;

  const actionW = Math.round(w * actionSafePct);
  const actionH = Math.round(h * actionSafePct);
  const actionX = Math.round((w - actionW) / 2);
  const actionY = Math.round((h - actionH) / 2);

  const titleW = Math.round(w * titleSafePct);
  const titleH = Math.round(h * titleSafePct);
  const titleX = Math.round((w - titleW) / 2);
  const titleY = Math.round((h - titleH) / 2);

  return {
    actionSafe: {
      width: actionW,
      height: actionH,
      x: actionX,
      y: actionY,
      label: `${actionW} × ${actionH} (${Math.round(actionSafePct * 100)}%)`,
    },
    titleSafe: {
      width: titleW,
      height: titleH,
      x: titleX,
      y: titleY,
      label: `${titleW} × ${titleH} (${Math.round(titleSafePct * 100)}%)`,
    },
  };
}
