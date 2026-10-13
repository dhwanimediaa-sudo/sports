import React from 'react';
import { GraphicElement } from '../../../types';
import {
  substituteDynamicFields,
  resolveLiveFieldValue,
  checkConditionalVisibility,
  DYNAMIC_FIELDS,
  DEFAULT_FALLBACK_IMAGES,
  getBallEventVisualInfo,
  getCricketEventAlertVisualInfo,
} from '../../../constants/studioGraphicsConstants';
import { getSportEventVisualInfo } from '../../../constants/universalSportEvents';
import {
  generateRegularPolygonPoints,
  generateStarPoints,
  generateBadgePath,
  generateArrowPath,
  getMaskClipPath,
} from './shapeUtils';
import {
  Image as ImageIcon,
  User,
  Shield,
  Trophy,
  Flag,
  Sparkles,
  Flame,
  Zap,
  CircleDot,
  Award,
  Target,
  ShieldAlert,
  TrendingUp,
  Activity,
  CheckCircle2,
} from 'lucide-react';

interface StudioGraphicElementRendererProps {
  element: GraphicElement;
  isSimulatingData?: boolean;
  customData?: Record<string, string>;
  dataContext?: {
    variables?: Record<string, string>;
    imageVariables?: Record<string, string>;
    fallbackImages?: Record<string, string>;
  };
  isSelected?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
}

export const StudioGraphicElementRenderer: React.FC<StudioGraphicElementRendererProps> = ({
  element: el,
  isSimulatingData = true,
  customData,
  dataContext,
  isSelected = false,
  className = '',
  onClick,
  onMouseDown,
}) => {
  if (!el || typeof el !== 'object' || el.visible === false) return null;

  if (!el.type) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[StudioGraphicElementRenderer] Skipping invalid layer with missing type:', el);
    }
    return null;
  }

  // Merge variables: dataContext > customData > default samples
  const activeVars: Record<string, string> = {
    ...(dataContext?.variables || {}),
    ...(customData || {}),
  };

  // Evaluate conditional visibility
  const isConditionMet = checkConditionalVisibility(el, activeVars);
  if (!isConditionMet && !isSelected) {
    return null;
  }

  // Resolve dynamic text if enabled or if LIVE_DATA element
  let displayText = el.text || '';
  if (el.type === 'LIVE_DATA') {
    displayText = resolveLiveFieldValue(el, activeVars, isSimulatingData);
  } else if (displayText) {
    if (el.liveDataField) {
      displayText = resolveLiveFieldValue(el, activeVars, isSimulatingData);
    } else {
      if (Object.keys(activeVars).length > 0) {
        Object.entries(activeVars).forEach(([k, v]) => {
          if (displayText.includes(k)) {
            displayText = displayText.replaceAll(k, String(v));
          }
        });
      }
      if (isSimulatingData) {
        displayText = substituteDynamicFields(displayText, activeVars);
      } else if (displayText.includes('{{')) {
        // Strip any remaining unresolved template tags on live broadcast
        displayText = displayText.replace(/\{\{[A-Z0-9_]+\}\}/g, '');
      }
    }
  }

  // Resolve dynamic image URL if it contains tags like {{STRIKER_PHOTO}}, {{BOWLER_PHOTO}}, {{PLAYER_PHOTO}} or dynamicFieldKey
  let finalImageUrl = el.imageUrl || '';
  if (el.dynamicFieldKey && activeVars[el.dynamicFieldKey]) {
    finalImageUrl = activeVars[el.dynamicFieldKey];
  } else if (el.dynamicFieldKey) {
    const matchedField = DYNAMIC_FIELDS.find((f) => f.key === el.dynamicFieldKey);
    if (matchedField && isSimulatingData) {
      finalImageUrl = matchedField.sampleValue;
    }
  } else if (finalImageUrl.includes('{{')) {
    if (Object.keys(activeVars).length > 0) {
      Object.entries(activeVars).forEach(([k, v]) => {
        if (finalImageUrl.includes(k)) {
          finalImageUrl = finalImageUrl.replaceAll(k, String(v));
        }
      });
    }
    if (isSimulatingData) {
      finalImageUrl = substituteDynamicFields(finalImageUrl, activeVars);
    } else if (finalImageUrl.includes('{{')) {
      finalImageUrl = '';
    }
  }

  // Fallback cascade for image types
  if (!finalImageUrl || finalImageUrl.startsWith('{{')) {
    const tagMatch = DYNAMIC_FIELDS.find((f) => f.key === finalImageUrl);
    if (tagMatch && isSimulatingData) {
      finalImageUrl = tagMatch.sampleValue;
    } else if (el.type === 'PLAYER_PHOTO' || el.type === 'CAPTAIN_PHOTO') {
      finalImageUrl = activeVars['{{STRIKER_PHOTO}}'] || activeVars['{{PLAYER_PHOTO}}'] || DEFAULT_FALLBACK_IMAGES.PLAYER_PLACEHOLDER;
    } else if (el.type === 'TEAM_LOGO') {
      finalImageUrl = activeVars['{{TEAM_LOGO}}'] || activeVars['{{TEAM_A_LOGO}}'] || DEFAULT_FALLBACK_IMAGES.TEAM_PLACEHOLDER;
    } else if (el.type === 'TOURNAMENT_LOGO') {
      finalImageUrl = activeVars['{{TOURNAMENT_LOGO}}'] || DEFAULT_FALLBACK_IMAGES.TOURNAMENT_PLACEHOLDER;
    } else if (el.type === 'SPONSOR_LOGO') {
      finalImageUrl = activeVars['{{SPONSOR_LOGO}}'] || DEFAULT_FALLBACK_IMAGES.SPONSOR_PLACEHOLDER;
    }
  }

  // Generate unique gradient ID for SVGs
  const gradientId = `grad-${el.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  // Common Box Shadow & Glow calculation
  let computedBoxShadow = '';
  if (el.boxShadow?.enabled) {
    const sx = typeof el.boxShadow.x === 'number' && !isNaN(el.boxShadow.x) ? el.boxShadow.x : 0;
    const sy = typeof el.boxShadow.y === 'number' && !isNaN(el.boxShadow.y) ? el.boxShadow.y : 0;
    const sblur = typeof el.boxShadow.blur === 'number' && !isNaN(el.boxShadow.blur) ? el.boxShadow.blur : 4;
    const sspread = typeof el.boxShadow.spread === 'number' && !isNaN(el.boxShadow.spread) ? el.boxShadow.spread : 0;
    const scolor = el.boxShadow.color || 'rgba(0,0,0,0.5)';
    computedBoxShadow = `${sx}px ${sy}px ${sblur}px ${sspread}px ${scolor}`;
  }
  if (el.glow?.enabled) {
    const glowStr = `${el.glow.inner ? 'inset ' : ''}0px 0px ${el.glow.blur || 20}px ${el.glow.spread || 4}px ${el.glow.color || '#10b981'}`;
    computedBoxShadow = computedBoxShadow ? `${computedBoxShadow}, ${glowStr}` : glowStr;
  }

  // Safe Transform & Dimensional Normalization (Section 7)
  const safeX = typeof el.x === 'number' && !isNaN(el.x) ? el.x : 0;
  const safeY = typeof el.y === 'number' && !isNaN(el.y) ? el.y : 0;
  const safeWidth = typeof el.width === 'number' && !isNaN(el.width) ? Math.max(1, el.width) : 200;
  const safeHeight = typeof el.height === 'number' && !isNaN(el.height) ? Math.max(1, el.height) : 60;
  const safeOpacity = typeof el.opacity === 'number' && !isNaN(el.opacity) ? Math.max(0, Math.min(1, el.opacity)) : 1;
  const safeRotation = typeof el.rotation === 'number' && !isNaN(el.rotation) ? el.rotation : 0;
  const safeScale = typeof el.scale === 'number' && !isNaN(el.scale) ? el.scale : 1;
  const safeZIndex = typeof el.zIndex === 'number' && !isNaN(el.zIndex) ? el.zIndex : 1;

  // Common Base Element Styles
  const elementStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${safeX}px`,
    top: `${safeY}px`,
    width: `${safeWidth}px`,
    height: `${safeHeight}px`,
    zIndex: safeZIndex,
    opacity: safeOpacity,
    transform: `rotate(${safeRotation}deg) scale(${safeScale})`,
    transformOrigin: 'center center',
    boxShadow: computedBoxShadow || undefined,
    mixBlendMode: (el.blendMode && el.blendMode !== 'normal' ? el.blendMode : undefined) as any,
  };

  // Border formatting
  const borderOpacity = el.borderOpacity !== undefined ? el.borderOpacity : 1;
  let computedBorderColor = el.borderColor || '#ffffff';
  if (borderOpacity < 1 && computedBorderColor.startsWith('#') && computedBorderColor.length === 7) {
    const alphaHex = Math.round(borderOpacity * 255).toString(16).padStart(2, '0');
    computedBorderColor = `${computedBorderColor}${alphaHex}`;
  }

  const borderStyleStr = el.borderStyle || 'solid';

  // Glassmorphism
  if (el.glassBlur) {
    elementStyle.backdropFilter = `blur(${el.glassBlur}px)`;
    elementStyle.WebkitBackdropFilter = `blur(${el.glassBlur}px)`;
  }

  // Gradient background fill for regular CSS shapes
  const isSvgShape =
    el.type === 'TRIANGLE' ||
    el.type === 'POLYGON' ||
    el.type === 'STAR' ||
    el.type === 'BADGE' ||
    el.type === 'ARROW' ||
    el.type === 'ELLIPSE';

  if (!isSvgShape && el.type !== 'TEXT' && el.type !== 'LIVE_DATA') {
    if (el.gradient?.enabled) {
      if (el.gradient.type === 'radial') {
        elementStyle.backgroundImage = `radial-gradient(circle, ${el.gradient.startColor}, ${el.gradient.endColor})`;
      } else {
        const dir = el.gradient.direction === 'angle' ? `${el.gradient.angle || 90}deg` : (el.gradient.direction || 'to right');
        elementStyle.backgroundImage = `linear-gradient(${dir}, ${el.gradient.startColor}, ${el.gradient.endColor})`;
      }
    } else if (el.fillColor) {
      elementStyle.backgroundColor = el.fillColor;
    }

    if (el.borderWidth) {
      elementStyle.borderWidth = `${el.borderWidth}px`;
      elementStyle.borderStyle = borderStyleStr;
      elementStyle.borderColor = computedBorderColor;
    }

    if (el.borderRadius !== undefined) {
      elementStyle.borderRadius = `${el.borderRadius}px`;
    }

    if (el.type === 'PILL' || el.shapeType === 'PILL') {
      elementStyle.borderRadius = '9999px';
    } else if (el.type === 'CIRCLE' || el.shapeType === 'CIRCLE') {
      elementStyle.borderRadius = '50%';
    }
  }

  // SVG Fill & Stroke attributes
  const svgFill = el.gradient?.enabled ? `url(#${gradientId})` : (el.fillColor || '#0f172a');
  const svgStroke = el.borderWidth ? computedBorderColor : 'none';
  const svgStrokeWidth = el.borderWidth || 0;
  const svgStrokeDasharray =
    el.borderStyle === 'dashed' ? '8,4' : el.borderStyle === 'dotted' ? '3,3' : undefined;

  // Render SVG gradient defs helper
  const renderSvgGradient = () => {
    if (!el.gradient?.enabled) return null;
    if (el.gradient.type === 'radial') {
      return (
        <defs>
          <radialGradient id={gradientId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={el.gradient.startColor} />
            <stop offset="100%" stopColor={el.gradient.endColor} />
          </radialGradient>
        </defs>
      );
    }
    return (
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={el.gradient.startColor} />
          <stop offset="100%" stopColor={el.gradient.endColor} />
        </linearGradient>
      </defs>
    );
  };

  // Image CSS Filters
  const imageFilterParts: string[] = [];
  if (el.imageFilters) {
    if (el.imageFilters.grayscale) imageFilterParts.push(`grayscale(${el.imageFilters.grayscale}%)`);
    if (el.imageFilters.sepia) imageFilterParts.push(`sepia(${el.imageFilters.sepia}%)`);
    if (el.imageFilters.brightness && el.imageFilters.brightness !== 100)
      imageFilterParts.push(`brightness(${el.imageFilters.brightness}%)`);
    if (el.imageFilters.contrast && el.imageFilters.contrast !== 100)
      imageFilterParts.push(`contrast(${el.imageFilters.contrast}%)`);
    if (el.imageFilters.saturation && el.imageFilters.saturation !== 100)
      imageFilterParts.push(`saturate(${el.imageFilters.saturation}%)`);
    if (el.imageFilters.blur) imageFilterParts.push(`blur(${el.imageFilters.blur}px)`);
    if (el.imageFilters.invert) imageFilterParts.push(`invert(${el.imageFilters.invert}%)`);
    if (el.imageFilters.hueRotate) imageFilterParts.push(`hue-rotate(${el.imageFilters.hueRotate}deg)`);
  }
  const imageFilterStyle = imageFilterParts.length > 0 ? imageFilterParts.join(' ') : undefined;

  // Clip Path for Masked Image Boxes
  const maskClipPath = getMaskClipPath(el.maskShape, el.borderRadius || 0);

  // Text Gradient Helper
  const isTextGradient = el.textGradient?.enabled;
  const textGradientBackground = isTextGradient
    ? el.textGradient?.type === 'radial'
      ? `radial-gradient(circle, ${el.textGradient.startColor}, ${el.textGradient.endColor})`
      : `linear-gradient(${el.textGradient?.direction === 'angle' ? `${el.textGradient.angle || 90}deg` : el.textGradient?.direction || 'to right'}, ${el.textGradient?.startColor || '#ffffff'}, ${el.textGradient?.endColor || '#10b981'})`
    : undefined;

  // Text Shadow and Glow combination
  const textShadowList: string[] = [];
  if (el.textShadow?.enabled) {
    textShadowList.push(`${el.textShadow.x || 0}px ${el.textShadow.y || 0}px ${el.textShadow.blur || 0}px ${el.textShadow.color || '#000000'}`);
  }
  if (el.textGlow?.enabled) {
    textShadowList.push(`0px 0px ${el.textGlow.blur || 15}px ${el.textGlow.color || '#10b981'}`);
  } else if (el.glow?.enabled && (el.type === 'TEXT' || el.type === 'LIVE_DATA')) {
    textShadowList.push(`0px 0px ${el.glow.blur || 15}px ${el.glow.color || '#10b981'}`);
  }
  const computedTextShadow = textShadowList.length > 0 ? textShadowList.join(', ') : undefined;

  // SVG drop-shadow filter parts
  const svgFilterList: string[] = [];
  if (el.textShadow?.enabled) {
    svgFilterList.push(`drop-shadow(${el.textShadow.x || 0}px ${el.textShadow.y || 0}px ${el.textShadow.blur || 0}px ${el.textShadow.color || '#000000'})`);
  }
  if (el.textGlow?.enabled) {
    svgFilterList.push(`drop-shadow(0px 0px ${el.textGlow.blur || 15}px ${el.textGlow.color || '#10b981'})`);
  } else if (el.glow?.enabled && (el.type === 'TEXT' || el.type === 'LIVE_DATA')) {
    svgFilterList.push(`drop-shadow(0px 0px ${el.glow.blur || 15}px ${el.glow.color || '#10b981'})`);
  }
  const computedSvgFilter = svgFilterList.length > 0 ? svgFilterList.join(' ') : undefined;

  return (
    <div
      id={el.id}
      style={elementStyle}
      onClick={onClick}
      onMouseDown={onMouseDown}
      className={`select-none ${className}`}
    >
      {/* 1. TEXT / LIVE DATA ELEMENT */}
      {(el.type === 'TEXT' || el.type === 'LIVE_DATA') && (() => {
        // Vertical Alignment
        const alignItemVal =
          el.textAlignVertical === 'top'
            ? 'flex-start'
            : el.textAlignVertical === 'bottom'
            ? 'flex-end'
            : 'center';

        // Horizontal Justification
        const justifyVal =
          el.textAlign === 'left'
            ? 'flex-start'
            : el.textAlign === 'right'
            ? 'flex-end'
            : el.textAlign === 'justify'
            ? 'space-between'
            : 'center';

        // Text Overflow & Whitespace
        let whiteSpaceVal: React.CSSProperties['whiteSpace'] = 'pre-wrap';
        let overflowVal: React.CSSProperties['overflow'] = 'hidden';
        let textOverflowVal: React.CSSProperties['textOverflow'] = undefined;
        let wordBreakVal: React.CSSProperties['wordBreak'] = 'break-word';

        if (el.textOverflow === 'nowrap') {
          whiteSpaceVal = 'nowrap';
          overflowVal = 'visible';
        } else if (el.textOverflow === 'clip') {
          whiteSpaceVal = 'nowrap';
          overflowVal = 'hidden';
          textOverflowVal = 'clip';
        } else if (el.textOverflow === 'ellipsis') {
          whiteSpaceVal = 'nowrap';
          overflowVal = 'hidden';
          textOverflowVal = 'ellipsis';
        } else if (el.textOverflow === 'wrap') {
          whiteSpaceVal = 'pre-wrap';
          overflowVal = 'hidden';
          wordBreakVal = 'break-word';
        }

        // Line height calculation
        const numLineHeight = typeof el.lineHeight === 'number' ? el.lineHeight : 1.2;
        const computedLineHeight = numLineHeight > 5 ? `${numLineHeight}px` : numLineHeight;

        return (
          <div
            className="w-full h-full flex"
            style={{
              fontFamily: el.fontFamily || 'Montserrat, sans-serif',
              fontSize: `${Math.max(1, Number(el.fontSize) || 32)}px`,
              fontWeight: (el.fontWeight as any) || '800',
              fontStyle: el.fontStyle || 'normal',
              textDecoration: el.underline ? 'underline' : undefined,
              color: isTextGradient ? 'transparent' : el.textColor || '#ffffff',
              backgroundImage: textGradientBackground,
              WebkitBackgroundClip: isTextGradient ? 'text' : undefined,
              WebkitTextFillColor: isTextGradient ? 'transparent' : undefined,
              textAlign: el.textAlign || 'center',
              letterSpacing: el.letterSpacing !== undefined ? `${el.letterSpacing}px` : undefined,
              lineHeight: computedLineHeight,
              textTransform: el.textTransform || 'none',
              textShadow: computedTextShadow,
              WebkitTextStroke: el.textStroke?.enabled
                ? `${el.textStroke.width || 1}px ${el.textStroke.color || '#000000'}`
                : undefined,
              backgroundColor: el.textBackgroundColor || el.fillColor || undefined,
              padding: el.textPadding !== undefined ? `${el.textPadding}px` : '2px 6px',
              borderRadius: el.textBorderRadius ? `${el.textBorderRadius}px` : el.borderRadius ? `${el.borderRadius}px` : undefined,
              alignItems: alignItemVal,
              justifyContent: justifyVal,
              overflow: overflowVal,
              whiteSpace: whiteSpaceVal,
              textOverflow: textOverflowVal,
              wordBreak: wordBreakVal,
            }}
          >
            {el.autoFitText ? (
              <svg
                viewBox={`0 0 ${Math.max(10, el.width)} ${Math.max(10, el.height)}`}
                className="w-full h-full"
                preserveAspectRatio={
                  el.textAlign === 'left'
                    ? 'xMinYMid meet'
                    : el.textAlign === 'right'
                    ? 'xMaxYMid meet'
                    : 'xMidYMid meet'
                }
              >
                <text
                  x={
                    el.textAlign === 'left'
                      ? '2%'
                      : el.textAlign === 'right'
                      ? '98%'
                      : '50%'
                  }
                  y={
                    el.textAlignVertical === 'top'
                      ? '35%'
                      : el.textAlignVertical === 'bottom'
                      ? '85%'
                      : '55%'
                  }
                  dominantBaseline="central"
                  textAnchor={
                    el.textAlign === 'left'
                      ? 'start'
                      : el.textAlign === 'right'
                      ? 'end'
                      : 'middle'
                  }
                  fill={isTextGradient ? 'url(#' + gradientId + ')' : el.textColor || '#ffffff'}
                  fontFamily={el.fontFamily || 'Montserrat, sans-serif'}
                  fontSize={el.fontSize || 32}
                  fontWeight={(el.fontWeight as any) || '800'}
                  fontStyle={el.fontStyle || 'normal'}
                  letterSpacing={el.letterSpacing ? `${el.letterSpacing}px` : undefined}
                  stroke={el.textStroke?.enabled ? el.textStroke.color : 'none'}
                  strokeWidth={el.textStroke?.enabled ? el.textStroke.width || 1 : 0}
                  filter={computedSvgFilter}
                >
                  {displayText || 'Empty Text'}
                </text>
              </svg>
            ) : (
              <span className="inline-block max-w-full">
                {displayText || <span className="opacity-40 italic">Empty Text</span>}
              </span>
            )}
          </div>
        );
      })()}

      {/* 2. RECTANGLE, ROUNDED RECTANGLE, PILL, CIRCLE, GLASS */}
      {(el.type === 'RECTANGLE' ||
        el.type === 'ROUNDED_RECTANGLE' ||
        el.type === 'PILL' ||
        el.type === 'CIRCLE' ||
        el.type === 'GLASS' ||
        el.type === 'ANGULAR') && <div className="w-full h-full" />}

      {/* 3. LINE SHAPE */}
      {el.type === 'LINE' && (
        <div
          className="w-full h-full flex items-center"
          style={{
            height: '100%',
          }}
        >
          <div
            className="w-full"
            style={{
              height: `${Math.max(2, el.borderWidth || 4)}px`,
              backgroundColor: el.borderColor || el.fillColor || '#ffffff',
              borderRadius: `${el.borderRadius || 2}px`,
              borderStyle: el.borderStyle || 'solid',
            }}
          />
        </div>
      )}

      {/* 4. TRIANGLE SHAPE */}
      {el.type === 'TRIANGLE' && (
        <svg
          viewBox={`0 0 ${el.width} ${el.height}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          {renderSvgGradient()}
          <polygon
            points={`${el.width / 2},0 0,${el.height} ${el.width},${el.height}`}
            fill={svgFill}
            stroke={svgStroke}
            strokeWidth={svgStrokeWidth}
            strokeDasharray={svgStrokeDasharray}
            strokeLinejoin="round"
          />
        </svg>
      )}

      {/* 5. POLYGON SHAPE (N sides) */}
      {el.type === 'POLYGON' && (
        <svg
          viewBox={`0 0 ${el.width} ${el.height}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          {renderSvgGradient()}
          <polygon
            points={generateRegularPolygonPoints(el.width, el.height, el.sidesCount || 6)}
            fill={svgFill}
            stroke={svgStroke}
            strokeWidth={svgStrokeWidth}
            strokeDasharray={svgStrokeDasharray}
            strokeLinejoin="round"
          />
        </svg>
      )}

      {/* 6. STAR SHAPE */}
      {el.type === 'STAR' && (
        <svg
          viewBox={`0 0 ${el.width} ${el.height}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          {renderSvgGradient()}
          <polygon
            points={generateStarPoints(
              el.width,
              el.height,
              el.starPoints || el.starPointsCount || 5,
              el.innerRadiusRatio || 0.45
            )}
            fill={svgFill}
            stroke={svgStroke}
            strokeWidth={svgStrokeWidth}
            strokeDasharray={svgStrokeDasharray}
            strokeLinejoin="round"
          />
        </svg>
      )}

      {/* 7. BADGE SHAPE (Shield, Rosette, Hexagon, Chevron, Ribbon, Plaque, Octagon) */}
      {el.type === 'BADGE' && (
        <svg
          viewBox={`0 0 ${el.width} ${el.height}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          {renderSvgGradient()}
          <path
            d={generateBadgePath(el.width, el.height, el.badgeStyle || 'SHIELD')}
            fill={svgFill}
            stroke={svgStroke}
            strokeWidth={svgStrokeWidth}
            strokeDasharray={svgStrokeDasharray}
            strokeLinejoin="round"
          />
        </svg>
      )}

      {/* 8. ARROW SHAPE (Right, Left, Up, Down, Chevron, Double) */}
      {el.type === 'ARROW' && (
        <svg
          viewBox={`0 0 ${el.width} ${el.height}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          {renderSvgGradient()}
          <path
            d={generateArrowPath(
              el.width,
              el.height,
              el.arrowDirection || 'RIGHT',
              (el.arrowHeadSize || 35) / 100,
              (el.arrowStemWidth || 40) / 100
            )}
            fill={svgFill}
            stroke={svgStroke}
            strokeWidth={svgStrokeWidth}
            strokeDasharray={svgStrokeDasharray}
            strokeLinejoin="round"
          />
        </svg>
      )}

      {/* 9. ELLIPSE SHAPE */}
      {el.type === 'ELLIPSE' && (
        <svg
          viewBox={`0 0 ${el.width} ${el.height}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          {renderSvgGradient()}
          <ellipse
            cx={el.width / 2}
            cy={el.height / 2}
            rx={el.width / 2 - (svgStrokeWidth ? svgStrokeWidth / 2 : 0)}
            ry={el.height / 2 - (svgStrokeWidth ? svgStrokeWidth / 2 : 0)}
            fill={svgFill}
            stroke={svgStroke}
            strokeWidth={svgStrokeWidth}
            strokeDasharray={svgStrokeDasharray}
          />
        </svg>
      )}

      {/* 10. ADVANCED IMAGE BOX & MEDIA LAYERS */}
      {(el.type === 'IMAGE' ||
        el.type === 'LOGO' ||
        el.type === 'PLAYER_PHOTO' ||
        el.type === 'TEAM_LOGO' ||
        el.type === 'TOURNAMENT_LOGO' ||
        el.type === 'SPONSOR_LOGO' ||
        el.type === 'CAPTAIN_PHOTO') && (
        <div
          className="w-full h-full overflow-hidden flex items-center justify-center relative"
          style={{
            borderRadius:
              el.maskShape === 'circle'
                ? '50%'
                : el.maskShape === 'pill'
                ? '9999px'
                : el.borderRadius !== undefined
                ? `${el.borderRadius}px`
                : undefined,
            clipPath: maskClipPath,
            borderWidth: el.borderWidth ? `${el.borderWidth}px` : undefined,
            borderStyle: el.borderWidth ? borderStyleStr : undefined,
            borderColor: el.borderWidth ? computedBorderColor : undefined,
          }}
        >
          {finalImageUrl ? (
            <img
              src={finalImageUrl}
              alt={el.name}
              referrerPolicy="no-referrer"
              className="w-full h-full"
              style={{
                objectFit: el.imageFit || 'cover',
                filter: imageFilterStyle,
              }}
            />
          ) : (
            <div className="w-full h-full bg-slate-900/90 border border-dashed border-slate-700/80 flex flex-col items-center justify-center p-3 text-slate-400 text-center select-none">
              {el.type === 'PLAYER_PHOTO' || el.type === 'CAPTAIN_PHOTO' ? (
                <User className="w-8 h-8 mb-1.5 text-emerald-400 opacity-80" />
              ) : el.type === 'TOURNAMENT_LOGO' ? (
                <Trophy className="w-8 h-8 mb-1.5 text-amber-400 opacity-80" />
              ) : el.type === 'TEAM_LOGO' ? (
                <Shield className="w-8 h-8 mb-1.5 text-sky-400 opacity-80" />
              ) : (
                <ImageIcon className="w-8 h-8 mb-1.5 text-emerald-400 opacity-80" />
              )}
              <span className="text-[12px] font-bold text-slate-200 truncate max-w-full px-2">
                {el.name}
              </span>
              <span className="text-[10px] text-emerald-400 font-mono mt-0.5 truncate max-w-full px-2">
                {el.dynamicFieldKey || el.imageFallbackText || el.type}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 11. CRICKET BALL EVENT GRAPHICS ENGINE LAYER */}
      {el.type === 'CRICKET_BALL_EVENT' && (() => {
        const config = el.ballEventConfig || {};
        const mode = config.displayMode || 'BADGE';

        // 1. Resolve raw ball event data
        const eventRaw =
          activeVars['{{CURRENT_BALL_EVENT}}'] ||
          activeVars['{{LAST_BALL_RESULT}}'] ||
          activeVars['{{BALL_EVENT}}'] ||
          activeVars['{{BALL_EVENT_TYPE}}'] ||
          (isSimulatingData ? config.sampleEvent || '4' : '4');

        const dismissalRaw =
          activeVars['{{LAST_BALL_DISMISSAL}}'] ||
          (isSimulatingData ? config.sampleDismissal || '' : '');

        const runsRaw =
          activeVars['{{LAST_BALL_RUNS}}'] !== undefined
            ? parseInt(activeVars['{{LAST_BALL_RUNS}}'], 10)
            : isSimulatingData
            ? config.sampleRuns
            : undefined;

        const visual = getBallEventVisualInfo(eventRaw, dismissalRaw, runsRaw);

        // 2. Resolve colors based on dynamic color mode or overrides
        const isDynamic = config.colorPreset !== 'CUSTOM';
        let badgeBg = isDynamic ? visual.bgColor : el.fillColor || visual.bgColor;
        let badgeText = isDynamic ? visual.textColor : el.textColor || visual.textColor;
        let badgeBorder = isDynamic ? visual.borderColor : el.borderColor || visual.borderColor;
        let badgeGlow = isDynamic ? visual.glowColor : visual.glowColor;

        if (config.colorPreset === 'CUSTOM') {
          if (visual.isWicket && config.wicketColor) badgeBg = config.wicketColor;
          if (visual.isSix && config.sixColor) badgeBg = config.sixColor;
          if (visual.isFour && config.fourColor) badgeBg = config.fourColor;
          if (visual.isDot && config.dotColor) badgeBg = config.dotColor;
          if (visual.isExtra && config.extraColor) badgeBg = config.extraColor;
          if (!visual.isBoundary && !visual.isWicket && !visual.isDot && !visual.isExtra && config.runColor) {
            badgeBg = config.runColor;
          }
        }

        // Shape radius for badge
        const badgeShape = config.badgeShape || 'ROUNDED';
        let shapeRadius = '12px';
        if (badgeShape === 'CIRCLE') shapeRadius = '50%';
        else if (badgeShape === 'PILL') shapeRadius = '9999px';
        else if (badgeShape === 'SQUARE') shapeRadius = '0px';
        else if (badgeShape === 'ROUNDED') shapeRadius = el.borderRadius !== undefined ? `${el.borderRadius}px` : '16px';

        // Animation preset class / styling
        let animStyle: React.CSSProperties = {};
        if (config.animationPreset === 'POP') {
          animStyle = { animation: 'pulse 1.8s infinite' };
        } else if (config.animationPreset === 'GLOW') {
          animStyle = { filter: `drop-shadow(0 0 16px ${badgeGlow})` };
        }

        // --- SUB-VIEW A: RECENT BALLS STRIP ---
        if (mode === 'RECENT_STRIP') {
          const recentBallsCount = config.recentBallsCount || 6;
          const rawRecentStr = activeVars['{{RECENT_BALLS}}'] || activeVars['{{THIS_OVER}}'] || '';
          
          let ballsList: string[] = [];
          if (rawRecentStr.trim()) {
            ballsList = rawRecentStr.split(/[\s,•|]+/).filter(Boolean);
          }
          if (ballsList.length === 0 && isSimulatingData) {
            ballsList = ['1', '4', '•', 'W', '6', '2'];
          }
          while (ballsList.length < recentBallsCount) {
            ballsList.push('•');
          }
          const displayBalls = ballsList.slice(-recentBallsCount);

          return (
            <div
              className="w-full h-full flex items-center justify-between gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700/80 bg-slate-950/90 shadow-2xl backdrop-blur-md overflow-hidden select-none"
              style={{
                borderRadius: shapeRadius,
                borderColor: el.borderWidth ? computedBorderColor : undefined,
                borderWidth: el.borderWidth ? `${el.borderWidth}px` : undefined,
                ...animStyle,
              }}
            >
              {displayBalls.map((b, idx) => {
                const bVisual = getBallEventVisualInfo(b);
                const isLast = idx === displayBalls.length - 1;
                return (
                  <div
                    key={idx}
                    className={`flex-1 h-full max-h-[85%] aspect-square flex items-center justify-center font-mono font-black text-xs sm:text-sm rounded-full transition-all duration-300 shadow-md ${
                      isLast ? 'scale-110 ring-2 ring-white/80 ring-offset-1 ring-offset-slate-950' : 'opacity-90'
                    }`}
                    style={{
                      backgroundColor: bVisual.bgColor,
                      color: bVisual.textColor,
                      border: `1.5px solid ${bVisual.borderColor}`,
                      boxShadow: isLast ? `0 0 12px ${bVisual.glowColor}` : undefined,
                    }}
                  >
                    {bVisual.shortLetter}
                  </div>
                );
              })}
            </div>
          );
        }

        // --- SUB-VIEW B: LETTER ONLY (Big Bold Result) ---
        if (mode === 'LETTER') {
          return (
            <div
              className="w-full h-full flex items-center justify-center font-black select-none transition-transform"
              style={{
                backgroundColor: badgeBg,
                color: badgeText,
                borderRadius: shapeRadius,
                border: `${el.borderWidth || 2}px solid ${badgeBorder}`,
                boxShadow: `0 8px 24px ${badgeGlow}`,
                fontSize: `${el.fontSize || Math.min(el.width, el.height) * 0.55}px`,
                fontFamily: el.fontFamily || 'Montserrat, sans-serif',
                ...animStyle,
              }}
            >
              {visual.shortLetter}
            </div>
          );
        }

        // --- SUB-VIEW C: COMPACT (Badge + Run Label) ---
        if (mode === 'COMPACT') {
          return (
            <div
              className="w-full h-full flex items-center justify-between gap-3 px-4 py-2 select-none shadow-xl border backdrop-blur-md overflow-hidden"
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                borderColor: badgeBorder,
                borderRadius: shapeRadius,
                borderWidth: `${el.borderWidth || 2}px`,
                boxShadow: `0 8px 24px ${badgeGlow}`,
                ...animStyle,
              }}
            >
              <div
                className="h-full aspect-square rounded-full flex items-center justify-center font-mono font-black shadow-lg"
                style={{
                  backgroundColor: badgeBg,
                  color: badgeText,
                  fontSize: `${el.fontSize ? el.fontSize * 0.75 : Math.min(el.width, el.height) * 0.45}px`,
                }}
              >
                {visual.shortLetter}
              </div>
              <div className="flex-1 flex flex-col justify-center overflow-hidden">
                <span
                  className="font-black truncate uppercase tracking-wider"
                  style={{
                    color: '#ffffff',
                    fontSize: `${el.fontSize ? el.fontSize * 0.5 : 18}px`,
                    fontFamily: el.fontFamily || 'Montserrat, sans-serif',
                  }}
                >
                  {visual.fullText}
                </span>
                {config.showExtras && visual.isExtra && (
                  <span className="text-[10px] text-amber-400 font-mono font-bold truncate">
                    EXTRA RUNS AWARDED
                  </span>
                )}
              </div>
            </div>
          );
        }

        // --- SUB-VIEW D: TEXT ONLY BANNER ---
        if (mode === 'TEXT') {
          return (
            <div
              className="w-full h-full flex items-center justify-center px-4 py-2 select-none text-center uppercase tracking-wider font-black shadow-xl border overflow-hidden"
              style={{
                backgroundColor: badgeBg,
                color: badgeText,
                borderRadius: shapeRadius,
                border: `${el.borderWidth || 2}px solid ${badgeBorder}`,
                boxShadow: `0 8px 24px ${badgeGlow}`,
                fontSize: `${el.fontSize || 26}px`,
                fontFamily: el.fontFamily || 'Montserrat, sans-serif',
                ...animStyle,
              }}
            >
              {visual.fullText}
            </div>
          );
        }

        // --- SUB-VIEW E: CUSTOM TEMPLATE ---
        if (mode === 'CUSTOM') {
          let customText = config.customFormatTemplate || el.text || '{{CURRENT_BALL_EVENT}}';
          customText = substituteDynamicFields(customText, activeVars);
          return (
            <div
              className="w-full h-full flex items-center justify-center px-4 py-2 select-none text-center font-bold shadow-xl border overflow-hidden"
              style={{
                backgroundColor: badgeBg,
                color: badgeText,
                borderRadius: shapeRadius,
                border: `${el.borderWidth || 2}px solid ${badgeBorder}`,
                boxShadow: `0 8px 24px ${badgeGlow}`,
                fontSize: `${el.fontSize || 22}px`,
                fontFamily: el.fontFamily || 'Montserrat, sans-serif',
                ...animStyle,
              }}
            >
              {customText}
            </div>
          );
        }

        // --- SUB-VIEW F: FULL BROADCAST BADGE (Default) ---
        return (
          <div
            className="w-full h-full relative overflow-hidden flex items-center gap-3.5 p-3.5 select-none shadow-2xl backdrop-blur-md border transition-all duration-300"
            style={{
              backgroundColor: 'rgba(11, 17, 32, 0.94)',
              borderRadius: shapeRadius,
              borderColor: badgeBorder,
              borderWidth: `${el.borderWidth || 2}px`,
              boxShadow: `0 12px 36px ${badgeGlow}`,
              ...animStyle,
            }}
          >
            {/* Left Result Indicator Orb */}
            <div
              className="h-full aspect-square flex items-center justify-center font-mono font-black rounded-xl shadow-inner border border-white/20 shrink-0 relative overflow-hidden"
              style={{
                backgroundColor: badgeBg,
                color: badgeText,
                fontSize: `${el.fontSize ? el.fontSize * 0.9 : Math.min(el.width, el.height) * 0.45}px`,
              }}
            >
              {/* Subtle light streak */}
              <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/30 pointer-events-none" />
              <span className="relative z-10">{visual.shortLetter}</span>
            </div>

            {/* Right Meta Info */}
            <div className="flex-1 flex flex-col justify-center overflow-hidden min-w-0 pr-1">
              <div className="flex items-center gap-1.5">
                {visual.isBoundary && (
                  <Flame className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
                )}
                {visual.isWicket && (
                  <Zap className="w-4 h-4 text-rose-400 shrink-0 animate-bounce" />
                )}
                <span
                  className="font-black uppercase tracking-wider truncate text-white"
                  style={{
                    fontSize: `${el.fontSize ? el.fontSize * 0.45 : 18}px`,
                    fontFamily: el.fontFamily || 'Montserrat, sans-serif',
                  }}
                >
                  {visual.fullText}
                </span>
              </div>

              {/* Dismissal / Over detail or Striker summary */}
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-300 font-medium truncate">
                {config.showOverNumber && (
                  <span className="font-mono text-emerald-400 font-bold">
                    {activeVars['{{LAST_BALL_OVER_BALL}}'] || activeVars['{{OVERS}}'] || 'Ov 18.4'}
                  </span>
                )}
                {config.showStriker && (
                  <span className="truncate text-slate-400">
                    {activeVars['{{STRIKER_SHORT_NAME}}'] || activeVars['{{STRIKER_NAME}}'] || 'Striker'}
                  </span>
                )}
                {config.showBowler && (
                  <span className="truncate text-slate-400">
                    to {activeVars['{{BOWLER_SHORT_NAME}}'] || activeVars['{{BOWLER_NAME}}'] || 'Bowler'}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* 4. CRICKET EVENT ALERT (Multipurpose Event Banner) */}
      {el.type === 'CRICKET_EVENT_ALERT' && (() => {
        const config = el.eventAlertConfig || {};
        const eventType = config.eventType || activeVars['{{EVENT_TYPE}}'] || 'FOUR';
        const visual = getCricketEventAlertVisualInfo(eventType, config.themeStyle);

        const bannerTitle = substituteDynamicFields(
          config.bannerTitle || activeVars['{{EVENT_TITLE}}'] || visual.defaultTitle,
          activeVars
        );
        const bannerSubtitle = substituteDynamicFields(
          config.bannerSubtitle || activeVars['{{EVENT_SUBTITLE}}'] || visual.defaultSubtitle,
          activeVars
        );
        const bannerMessage = substituteDynamicFields(
          config.bannerMessage || activeVars['{{EVENT_MESSAGE}}'] || visual.defaultMessage,
          activeVars
        );

        const playerPhoto = activeVars['{{STRIKER_PHOTO}}'] || activeVars['{{PLAYER_PHOTO}}'] || DEFAULT_FALLBACK_IMAGES.PLAYER;
        const playerName = activeVars['{{STRIKER_NAME}}'] || activeVars['{{PLAYER_NAME}}'] || 'Virat Kohli';

        const shapeRadius = el.borderRadius !== undefined ? `${el.borderRadius}px` : '18px';

        return (
          <div
            className="w-full h-full relative overflow-hidden flex items-center justify-between gap-4 p-4 select-none shadow-2xl border backdrop-blur-xl"
            style={{
              background: visual.gradientBackground,
              borderRadius: shapeRadius,
              borderColor: visual.badgeBorder,
              borderWidth: `${el.borderWidth || 2}px`,
              boxShadow: `0 16px 40px ${visual.accentGlow}`,
            }}
          >
            {/* Left Badge / Icon Indicator */}
            <div className="flex items-center gap-3 shrink-0">
              <div
                className="h-14 w-14 rounded-2xl flex items-center justify-center font-mono font-black text-xl shadow-2xl border shrink-0 relative overflow-hidden"
                style={{
                  backgroundColor: visual.badgeBg,
                  borderColor: visual.badgeBorder,
                  color: visual.badgeTextColor,
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-transparent pointer-events-none" />
                <span>{visual.badgeText}</span>
              </div>

              {config.showPlayerPhoto !== false && (
                <div className="h-14 w-14 rounded-2xl overflow-hidden border-2 border-white/40 shadow-lg shrink-0 bg-slate-900">
                  <img
                    src={playerPhoto}
                    alt={playerName}
                    className="w-full h-full object-cover object-top"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
            </div>

            {/* Center Text Info */}
            <div className="flex-1 flex flex-col justify-center overflow-hidden min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className="font-black uppercase tracking-wider text-white truncate drop-shadow-md"
                  style={{
                    fontSize: `${el.fontSize ? el.fontSize * 0.55 : 22}px`,
                    fontFamily: el.fontFamily || 'Montserrat, sans-serif',
                  }}
                >
                  {bannerTitle}
                </span>
              </div>
              <p className="text-xs text-white/90 font-medium truncate mt-0.5">
                {bannerSubtitle}
              </p>
              {bannerMessage && (
                <p className="text-[11px] text-white/75 font-mono truncate mt-0.5">
                  {bannerMessage}
                </p>
              )}
            </div>

            {/* Right Tag / Status Pill */}
            {config.showStatsPill !== false && (
              <div className="hidden sm:flex flex-col items-end justify-center shrink-0 pr-2">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase bg-black/40 text-white border border-white/20 shadow-inner">
                  {activeVars['{{OVERS}}'] || 'Ov 14.2'} • {activeVars['{{SCORE}}'] || '142/3'}
                </span>
              </div>
            )}
          </div>
        );
      })()}

      {/* 5. CRICKET BALL RESULT (Single Delivery Orb / Badge) */}
      {el.type === 'CRICKET_BALL_RESULT' && (() => {
        const ballVal = activeVars['{{BALL_RESULT}}'] || activeVars['{{CURRENT_BALL_EVENT}}'] || '4';
        const visual = getBallEventVisualInfo(ballVal);

        return (
          <div
            className="w-full h-full flex items-center justify-center font-black select-none transition-all shadow-2xl relative overflow-hidden"
            style={{
              backgroundColor: visual.bgColor,
              color: visual.textColor,
              borderRadius: el.borderRadius !== undefined ? `${el.borderRadius}px` : '50%',
              border: `${el.borderWidth || 2}px solid ${visual.borderColor}`,
              boxShadow: `0 8px 30px ${visual.glowColor}`,
              fontSize: `${el.fontSize || Math.min(el.width, el.height) * 0.5}px`,
              fontFamily: el.fontFamily || 'Montserrat, sans-serif',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-black/30 pointer-events-none" />
            <span className="relative z-10">{visual.shortLetter}</span>
          </div>
        );
      })()}

      {/* 6. CRICKET WICKET ALERT (Dramatic Out / Dismissal Presentation) */}
      {el.type === 'CRICKET_WICKET_ALERT' && (() => {
        const dismissedName = activeVars['{{DISMISSED_BATSMAN_NAME}}'] || activeVars['{{STRIKER_NAME}}'] || 'Virat Kohli';
        const dismissedScore = activeVars['{{DISMISSED_BATSMAN_SCORE}}'] || '76 (42)';
        const bowlerName = activeVars['{{BOWLER_NAME}}'] || 'Jasprit Bumrah';
        const assistPlayer = activeVars['{{ASSIST_PLAYER}}'] || activeVars['{{FIELDER_NAME}}'] || '';
        const dismissalMode = activeVars['{{DISMISSAL_MODE}}'] || 'CAUGHT';
        const playerPhoto = activeVars['{{STRIKER_PHOTO}}'] || DEFAULT_FALLBACK_IMAGES.PLAYER;

        return (
          <div
            className="w-full h-full relative overflow-hidden flex items-center justify-between gap-4 p-4 select-none shadow-2xl border backdrop-blur-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(225, 29, 72, 0.95) 0%, rgba(136, 19, 55, 0.98) 100%)',
              borderRadius: el.borderRadius !== undefined ? `${el.borderRadius}px` : '20px',
              borderColor: '#fda4af',
              borderWidth: `${el.borderWidth || 2}px`,
              boxShadow: '0 20px 50px rgba(225, 29, 72, 0.65)',
            }}
          >
            {/* Left Out Badge & Batsman Avatar */}
            <div className="flex items-center gap-3.5 shrink-0">
              <div className="h-16 w-16 rounded-2xl bg-rose-950/90 border-2 border-rose-300 flex flex-col items-center justify-center font-mono font-black shadow-2xl shrink-0">
                <Zap className="w-5 h-5 text-rose-300 animate-bounce" />
                <span className="text-sm text-white">OUT</span>
              </div>

              <div className="h-16 w-16 rounded-2xl overflow-hidden border-2 border-rose-300/80 shadow-xl shrink-0 bg-slate-950">
                <img
                  src={playerPhoto}
                  alt={dismissedName}
                  className="w-full h-full object-cover object-top"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            {/* Center Dismissal Details */}
            <div className="flex-1 flex flex-col justify-center overflow-hidden min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-rose-900 text-rose-200 border border-rose-400 rounded text-[10px] font-black uppercase tracking-wider">
                  {dismissalMode}
                </span>
                <span
                  className="font-black uppercase tracking-wide text-white truncate drop-shadow-md"
                  style={{
                    fontSize: `${el.fontSize ? el.fontSize * 0.55 : 24}px`,
                    fontFamily: el.fontFamily || 'Montserrat, sans-serif',
                  }}
                >
                  {dismissedName}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-1 text-xs text-rose-100 font-medium truncate">
                <span className="font-bold text-white font-mono">{dismissedScore}</span>
                <span>•</span>
                <span className="truncate">
                  {assistPlayer ? `c ${assistPlayer} ` : ''}b {bowlerName}
                </span>
              </div>
            </div>

            {/* Right Fall of Wicket Score Tag */}
            <div className="hidden sm:flex flex-col items-end justify-center shrink-0 pr-2">
              <span className="text-[10px] uppercase font-bold text-rose-200 tracking-wider">
                FALL OF WICKET
              </span>
              <span className="text-base font-black font-mono text-white">
                {activeVars['{{SCORE}}'] || '142/3'} ({activeVars['{{OVERS}}'] || '15.4 ov'})
              </span>
            </div>
          </div>
        );
      })()}

      {/* 7. CRICKET BOUNDARY ALERT (Four / Six Celebration Banner) */}
      {el.type === 'CRICKET_BOUNDARY_ALERT' && (() => {
        const isSix = activeVars['{{BALL_RESULT}}'] === '6' || el.eventAlertConfig?.eventType === 'SIX';
        const runsLabel = isSix ? 'MAXIMUM 6!' : 'BOUNDARY 4!';
        const strikerName = activeVars['{{STRIKER_NAME}}'] || 'Virat Kohli';
        const strikerPhoto = activeVars['{{STRIKER_PHOTO}}'] || DEFAULT_FALLBACK_IMAGES.PLAYER;
        const strikerScore = activeVars['{{STRIKER_SCORE}}'] || '54* (28)';

        const gradientBg = isSix
          ? 'linear-gradient(135deg, rgba(109, 40, 217, 0.95) 0%, rgba(59, 7, 100, 0.98) 100%)'
          : 'linear-gradient(135deg, rgba(4, 120, 87, 0.95) 0%, rgba(6, 78, 59, 0.98) 100%)';
        const borderColor = isSix ? '#c4b5fd' : '#6ee7b7';
        const glowColor = isSix ? 'rgba(139, 92, 246, 0.7)' : 'rgba(16, 185, 129, 0.7)';

        return (
          <div
            className="w-full h-full relative overflow-hidden flex items-center justify-between gap-4 p-4 select-none shadow-2xl border backdrop-blur-xl"
            style={{
              background: gradientBg,
              borderRadius: el.borderRadius !== undefined ? `${el.borderRadius}px` : '20px',
              borderColor: borderColor,
              borderWidth: `${el.borderWidth || 2}px`,
              boxShadow: `0 20px 50px ${glowColor}`,
            }}
          >
            {/* Left Big Number Badge */}
            <div className="flex items-center gap-3.5 shrink-0">
              <div
                className="h-16 w-16 rounded-2xl flex items-center justify-center font-mono font-black text-3xl shadow-2xl border shrink-0 relative overflow-hidden"
                style={{
                  backgroundColor: isSix ? '#4c1d95' : '#064e3b',
                  borderColor: borderColor,
                  color: '#ffffff',
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-white/30 via-transparent to-transparent pointer-events-none" />
                <span className="relative z-10">{isSix ? '6' : '4'}</span>
              </div>

              <div className="h-16 w-16 rounded-2xl overflow-hidden border-2 border-white/50 shadow-xl shrink-0 bg-slate-950">
                <img
                  src={strikerPhoto}
                  alt={strikerName}
                  className="w-full h-full object-cover object-top"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            {/* Center Info */}
            <div className="flex-1 flex flex-col justify-center overflow-hidden min-w-0">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-300 animate-pulse shrink-0" />
                <span
                  className="font-black uppercase tracking-wider text-white truncate drop-shadow-md"
                  style={{
                    fontSize: `${el.fontSize ? el.fontSize * 0.55 : 24}px`,
                    fontFamily: el.fontFamily || 'Montserrat, sans-serif',
                  }}
                >
                  {runsLabel}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-1 text-xs text-white/90 font-medium truncate">
                <span className="font-bold text-white">{strikerName}</span>
                <span>•</span>
                <span className="font-mono text-amber-200">{strikerScore}</span>
              </div>
            </div>

            {/* Right Over Ball Tracker */}
            <div className="hidden sm:flex flex-col items-end justify-center shrink-0 pr-2">
              <span className="text-[10px] uppercase font-bold text-white/75 tracking-wider">
                MATCH SCORE
              </span>
              <span className="text-base font-black font-mono text-white">
                {activeVars['{{SCORE}}'] || '148/2'}
              </span>
            </div>
          </div>
        );
      })()}

      {/* 8. CRICKET MILESTONE ALERT (50, 100, 3W, 5W Celebration Card) */}
      {el.type === 'CRICKET_MILESTONE_ALERT' && (() => {
        const milestoneTitle = activeVars['{{MILESTONE_TITLE}}'] || activeVars['{{BATSMAN_MILESTONE}}'] || 'HALF CENTURY (50 RUNS)';
        const playerName = activeVars['{{STRIKER_NAME}}'] || 'Virat Kohli';
        const playerPhoto = activeVars['{{STRIKER_PHOTO}}'] || DEFAULT_FALLBACK_IMAGES.PLAYER;
        const runs = activeVars['{{MILESTONE_VALUE}}'] || '50';
        const balls = activeVars['{{MILESTONE_BALLS}}'] || '28';
        const fours = activeVars['{{MILESTONE_4S}}'] || '7';
        const sixes = activeVars['{{MILESTONE_6S}}'] || '2';
        const sr = activeVars['{{MILESTONE_SR}}'] || '178.57';

        return (
          <div
            className="w-full h-full relative overflow-hidden flex items-center justify-between gap-4 p-4 select-none shadow-2xl border backdrop-blur-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(180, 83, 9, 0.95) 0%, rgba(69, 26, 3, 0.98) 100%)',
              borderRadius: el.borderRadius !== undefined ? `${el.borderRadius}px` : '20px',
              borderColor: '#fde68a',
              borderWidth: `${el.borderWidth || 2}px`,
              boxShadow: '0 20px 50px rgba(245, 158, 11, 0.7)',
            }}
          >
            {/* Left Trophy/Laurel Icon & Player Avatar */}
            <div className="flex items-center gap-3.5 shrink-0">
              <div className="h-16 w-16 rounded-2xl bg-amber-950/90 border-2 border-amber-300 flex flex-col items-center justify-center font-mono font-black shadow-2xl shrink-0">
                <Trophy className="w-5 h-5 text-amber-300 animate-pulse" />
                <span className="text-xs text-amber-100 font-bold">{runs}</span>
              </div>

              <div className="h-16 w-16 rounded-2xl overflow-hidden border-2 border-amber-300 shadow-xl shrink-0 bg-slate-950">
                <img
                  src={playerPhoto}
                  alt={playerName}
                  className="w-full h-full object-cover object-top"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            {/* Center Info */}
            <div className="flex-1 flex flex-col justify-center overflow-hidden min-w-0">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                <span
                  className="font-black uppercase tracking-wider text-amber-200 truncate drop-shadow-md text-xs sm:text-sm"
                >
                  {milestoneTitle}
                </span>
              </div>
              <span
                className="font-black uppercase tracking-wide text-white truncate drop-shadow-md mt-0.5"
                style={{
                  fontSize: `${el.fontSize ? el.fontSize * 0.55 : 22}px`,
                  fontFamily: el.fontFamily || 'Montserrat, sans-serif',
                }}
              >
                {playerName}
              </span>
              <div className="flex items-center gap-3 mt-1 text-xs text-amber-100/90 font-mono">
                <span>{runs} Runs ({balls} balls)</span>
                <span>•</span>
                <span>{fours}x4, {sixes}x6</span>
                <span>•</span>
                <span>SR {sr}</span>
              </div>
            </div>

            {/* Right Celebration Tag */}
            <div className="hidden sm:flex flex-col items-end justify-center shrink-0 pr-2">
              <span className="px-3 py-1.5 bg-amber-500/30 border border-amber-300/60 rounded-xl text-xs font-mono font-bold text-amber-100">
                ★ MILESTONE ★
              </span>
            </div>
          </div>
        );
      })()}

      {/* 9. CRICKET OVER COMPLETE (Over Summary & Ball Breakdown Bar) */}
      {el.type === 'CRICKET_OVER_COMPLETE' && (() => {
        const overNum = activeVars['{{OVER_NUMBER}}'] || '18';
        const bowlerName = activeVars['{{BOWLER_NAME}}'] || 'Jasprit Bumrah';
        const bowlerStats = activeVars['{{BOWLER_FIGURES}}'] || '3.0-0-18-1';
        const runsInOver = activeVars['{{OVER_TOTAL_RUNS}}'] || '12';

        const rawBalls = activeVars['{{RECENT_BALLS}}'] || activeVars['{{THIS_OVER}}'] || '1 4 • W 6 2';
        const balls = rawBalls.split(/[\s,•|]+/).filter(Boolean);

        return (
          <div
            className="w-full h-full relative overflow-hidden flex items-center justify-between gap-3 px-4 py-2 select-none shadow-2xl border backdrop-blur-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
              borderRadius: el.borderRadius !== undefined ? `${el.borderRadius}px` : '16px',
              borderColor: '#a5b4fc',
              borderWidth: `${el.borderWidth || 2}px`,
              boxShadow: '0 16px 40px rgba(99, 102, 241, 0.5)',
            }}
          >
            {/* Left Over Identifier */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="h-12 px-3 rounded-xl bg-indigo-900 border border-indigo-400 flex flex-col items-center justify-center font-mono font-bold text-white shadow-inner">
                <span className="text-[9px] uppercase tracking-wider text-indigo-200">END OF OVER</span>
                <span className="text-sm font-black">{overNum}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white uppercase truncate">{bowlerName}</span>
                <span className="text-[11px] font-mono text-indigo-300">{bowlerStats}</span>
              </div>
            </div>

            {/* Center Ball Result Badges */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              {balls.map((b, idx) => {
                const bVisual = getBallEventVisualInfo(b);
                return (
                  <div
                    key={idx}
                    className="w-7 h-7 rounded-full flex items-center justify-center font-mono font-black text-xs shadow-md border"
                    style={{
                      backgroundColor: bVisual.bgColor,
                      color: bVisual.textColor,
                      borderColor: bVisual.borderColor,
                    }}
                  >
                    {bVisual.shortLetter}
                  </div>
                );
              })}
            </div>

            {/* Right Over Run Total */}
            <div className="flex flex-col items-end justify-center shrink-0 pr-1 font-mono">
              <span className="text-[10px] text-indigo-200 uppercase font-bold">RUNS IN OVER</span>
              <span className="text-base font-black text-emerald-400">{runsInOver} Runs</span>
            </div>
          </div>
        );
      })()}

      {/* 10. CRICKET INNINGS BREAK (Innings Summary & Chase Equation) */}
      {el.type === 'CRICKET_INNINGS_BREAK' && (() => {
        const teamName = activeVars['{{BATTING_TEAM}}'] || 'Royal Challengers';
        const teamScore = activeVars['{{SCORE}}'] || '184/4';
        const overs = activeVars['{{OVERS}}'] || '20.0';
        const target = activeVars['{{TARGET_RUNS}}'] || '185';
        const rrr = activeVars['{{TARGET_RRR}}'] || '9.25';
        const topBatsman = activeVars['{{TOP_BATSMAN}}'] || 'Virat Kohli 76* (42b)';
        const topBowler = activeVars['{{TOP_BOWLER}}'] || 'Jasprit Bumrah 2/28 (4.0 ov)';

        return (
          <div
            className="w-full h-full relative overflow-hidden flex flex-col justify-between p-4 select-none shadow-2xl border backdrop-blur-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(131, 24, 67, 0.95) 0%, rgba(30, 27, 75, 0.98) 100%)',
              borderRadius: el.borderRadius !== undefined ? `${el.borderRadius}px` : '20px',
              borderColor: '#f472b6',
              borderWidth: `${el.borderWidth || 2}px`,
              boxShadow: '0 20px 50px rgba(236, 72, 153, 0.6)',
            }}
          >
            {/* Header Banner */}
            <div className="flex items-center justify-between border-b border-pink-400/30 pb-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-pink-500 text-white rounded text-[11px] font-black uppercase">
                  INNINGS BREAK
                </span>
                <span className="text-sm font-bold text-pink-100">{teamName} 1st Innings Concluded</span>
              </div>
              <span className="text-xs font-mono font-bold text-pink-200">
                TARGET: {target} ({rrr} RRR)
              </span>
            </div>

            {/* Middle Main Equation */}
            <div className="flex items-center justify-between my-2">
              <div className="flex flex-col">
                <span className="text-xs text-pink-200 uppercase font-bold">TOTAL SCORE</span>
                <span className="text-2xl sm:text-3xl font-black font-mono text-white">
                  {teamScore} <span className="text-sm text-pink-300">({overs} ov)</span>
                </span>
              </div>

              <div className="flex flex-col items-end text-xs text-pink-100 space-y-0.5">
                <span className="font-semibold">Top Bat: <span className="font-bold text-white">{topBatsman}</span></span>
                <span className="font-semibold">Top Bowl: <span className="font-bold text-white">{topBowler}</span></span>
              </div>
            </div>

            {/* Bottom Chase Prompt */}
            <div className="bg-black/40 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs font-mono border border-pink-500/20">
              <span className="text-pink-300">2nd Innings Chase Begins Shortly</span>
              <span className="text-white font-bold">Require {target} runs in {overs} overs</span>
            </div>
          </div>
        );
      })()}

      {/* 11. CRICKET MATCH RESULT (Victory Celebration & POTM Showcase) */}
      {el.type === 'CRICKET_MATCH_RESULT' && (() => {
        const resultText = activeVars['{{RESULT_TEXT}}'] || 'Royal Challengers won by 24 runs';
        const potmName = activeVars['{{POTM_NAME}}'] || 'Virat Kohli';
        const potmPhoto = activeVars['{{POTM_PHOTO}}'] || DEFAULT_FALLBACK_IMAGES.PLAYER;

        return (
          <div
            className="w-full h-full relative overflow-hidden flex items-center justify-between gap-4 p-4 select-none shadow-2xl border backdrop-blur-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(161, 98, 7, 0.95) 0%, rgba(66, 32, 6, 0.98) 100%)',
              borderRadius: el.borderRadius !== undefined ? `${el.borderRadius}px` : '20px',
              borderColor: '#fde047',
              borderWidth: `${el.borderWidth || 2}px`,
              boxShadow: '0 20px 50px rgba(234, 179, 8, 0.7)',
            }}
          >
            {/* Left Trophy & Result */}
            <div className="flex items-center gap-3.5 shrink-0">
              <div className="h-16 w-16 rounded-2xl bg-amber-950/90 border-2 border-yellow-400 flex flex-col items-center justify-center font-mono font-black shadow-2xl shrink-0">
                <Trophy className="w-6 h-6 text-yellow-300 animate-pulse" />
              </div>

              <div className="flex flex-col">
                <span className="px-2 py-0.5 bg-yellow-400 text-slate-950 rounded text-[10px] font-black uppercase tracking-wider w-fit mb-1">
                  MATCH RESULT
                </span>
                <span
                  className="font-black uppercase tracking-wide text-white truncate drop-shadow-md"
                  style={{
                    fontSize: `${el.fontSize ? el.fontSize * 0.55 : 22}px`,
                    fontFamily: el.fontFamily || 'Montserrat, sans-serif',
                  }}
                >
                  {resultText}
                </span>
              </div>
            </div>

            {/* Right Player of Match */}
            <div className="flex items-center gap-3 bg-black/40 px-3 py-1.5 rounded-2xl border border-yellow-400/30 shrink-0">
              <div className="h-12 w-12 rounded-xl overflow-hidden border border-yellow-300 shadow-md shrink-0 bg-slate-950">
                <img
                  src={potmPhoto}
                  alt={potmName}
                  className="w-full h-full object-cover object-top"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[9px] uppercase font-bold text-yellow-300 tracking-wider">PLAYER OF MATCH</span>
                <span className="text-xs font-black text-white">{potmName}</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 12. UNIVERSAL MULTI-SPORT EVENT ALERT & SPORT_EVENT_IMAGE / SPORT_EVENT_ALERT */}
      {(el.type === 'UNIVERSAL_EVENT_ALERT' ||
        el.type === 'SPORT_EVENT_ALERT' ||
        el.type === 'SPORT_EVENT_IMAGE') && (() => {
        const sport = activeVars['{{SPORT}}'] || activeVars['{{SPORT_TYPE}}'] || 'FOOTBALL';
        const eventType = activeVars['{{EVENT_TYPE}}'] || activeVars['{{CURRENT_EVENT}}'] || el.liveDataField || 'GOAL';
        const visual = getSportEventVisualInfo(sport, eventType);

        const titleText = activeVars['{{EVENT_TITLE}}'] || visual.defaultTitle;
        const subtitleText = activeVars['{{EVENT_SUBTITLE}}'] || visual.defaultSubtitle;
        const playerName = activeVars['{{PLAYER_NAME}}'] || activeVars['{{SCORER_NAME}}'] || activeVars['{{RAIDER_NAME}}'] || 'Kylian Mbappe';
        const playerPhoto = activeVars['{{PLAYER_PHOTO}}'] || DEFAULT_FALLBACK_IMAGES.PLAYER;
        const teamName = activeVars['{{TEAM_NAME}}'] || activeVars['{{SCORING_TEAM}}'] || activeVars['{{TEAM_A_NAME}}'] || 'Royal Challengers';
        const teamLogo = activeVars['{{TEAM_LOGO}}'] || activeVars['{{TEAM_A_LOGO}}'] || DEFAULT_FALLBACK_IMAGES.TEAM;
        const scoreText = activeVars['{{SCORE}}'] || activeVars['{{MATCH_SCORE}}'] || '2 - 1 (68\')';

        return (
          <div
            className="w-full h-full relative overflow-hidden flex items-center justify-between gap-4 p-4 select-none shadow-2xl border backdrop-blur-xl transition-all duration-300"
            style={{
              background: visual.gradientBackground,
              borderRadius: el.borderRadius !== undefined ? `${el.borderRadius}px` : '20px',
              borderColor: visual.badgeBorder,
              borderWidth: `${el.borderWidth || 2}px`,
              boxShadow: `0 20px 50px ${visual.accentGlow}`,
            }}
          >
            {/* Left Badge & Icon Indicator */}
            <div className="flex items-center gap-3.5 shrink-0 min-w-0">
              <div
                className="h-16 w-16 rounded-2xl flex flex-col items-center justify-center font-mono font-black shadow-2xl border shrink-0 relative overflow-hidden"
                style={{
                  backgroundColor: visual.badgeBg,
                  borderColor: visual.badgeBorder,
                  color: visual.badgeTextColor,
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-transparent pointer-events-none" />
                <span className="text-xl sm:text-2xl font-black relative z-10">{visual.badgeText}</span>
              </div>

              {/* Player / Team Media Showcase */}
              <div className="h-16 w-16 rounded-2xl overflow-hidden border-2 border-white/50 shadow-xl shrink-0 bg-slate-950 relative">
                <img
                  src={playerPhoto}
                  alt={playerName}
                  className="w-full h-full object-cover object-top"
                  referrerPolicy="no-referrer"
                />
                {teamLogo && (
                  <img
                    src={teamLogo}
                    alt={teamName}
                    className="w-6 h-6 rounded-full border border-white/80 absolute bottom-1 right-1 bg-black/60 object-contain p-0.5"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>

              {/* Center Headlines */}
              <div className="flex flex-col text-left justify-center min-w-0 overflow-hidden">
                <div className="flex items-center gap-2">
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider"
                    style={{
                      backgroundColor: visual.badgeBg,
                      color: visual.badgeTextColor,
                      border: `1px solid ${visual.badgeBorder}`,
                    }}
                  >
                    {sport.toUpperCase()} • {visual.tag}
                  </span>
                  <span className="text-xs font-mono font-bold text-white/90 truncate">{teamName}</span>
                </div>

                <span
                  className="font-black uppercase tracking-wide text-white truncate drop-shadow-md mt-0.5"
                  style={{
                    fontSize: `${el.fontSize ? el.fontSize * 0.6 : 22}px`,
                    fontFamily: el.fontFamily || 'Montserrat, sans-serif',
                  }}
                >
                  {titleText}
                </span>

                <span className="text-xs font-medium text-white/80 truncate">{subtitleText}</span>
              </div>
            </div>

            {/* Right Active Score & Match Clock Tag */}
            <div className="hidden sm:flex flex-col items-end justify-center shrink-0 pr-2 font-mono">
              <span className="text-[10px] uppercase font-bold text-white/70 tracking-wider">
                MATCH SCORE
              </span>
              <span className="text-lg font-black text-white">{scoreText}</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
