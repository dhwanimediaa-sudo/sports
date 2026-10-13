/**
 * SportsPulse Graphics Studio - Shape & Vector Path Generators
 * Native 1920x1080 SVG Path and Clipping utilities for shapes and image masks.
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * Generate regular polygon points (e.g. triangle, pentagon, hexagon, octagon)
 */
export function generateRegularPolygonPoints(
  width: number,
  height: number,
  sides: number = 6
): string {
  const cx = width / 2;
  const cy = height / 2;
  const rx = width / 2;
  const ry = height / 2;
  const points: Point[] = [];

  for (let i = 0; i < sides; i++) {
    // Start at top (-PI/2)
    const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
    const x = cx + rx * Math.cos(angle);
    const y = cy + ry * Math.sin(angle);
    points.push({ x, y });
  }

  return points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
}

/**
 * Generate star points with customizable point count and inner radius ratio
 */
export function generateStarPoints(
  width: number,
  height: number,
  pointsCount: number = 5,
  innerRatio: number = 0.45
): string {
  const cx = width / 2;
  const cy = height / 2;
  const rx = width / 2;
  const ry = height / 2;
  const innerRx = rx * innerRatio;
  const innerRy = ry * innerRatio;
  const totalVertices = pointsCount * 2;
  const points: Point[] = [];

  for (let i = 0; i < totalVertices; i++) {
    const isEven = i % 2 === 0;
    const rCurrentX = isEven ? rx : innerRx;
    const rCurrentY = isEven ? ry : innerRy;
    const angle = (i * 2 * Math.PI) / totalVertices - Math.PI / 2;
    const x = cx + rCurrentX * Math.cos(angle);
    const y = cy + rCurrentY * Math.sin(angle);
    points.push({ x, y });
  }

  return points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
}

/**
 * Generate SVG Path for Badge Styles
 */
export function generateBadgePath(
  width: number,
  height: number,
  style: 'SHIELD' | 'ROSETTE' | 'HEXAGON' | 'CHEVRON' | 'RIBBON' | 'PLAQUE' | 'OCTAGON' = 'SHIELD'
): string {
  const w = width;
  const h = height;

  switch (style) {
    case 'SHIELD': {
      // Classic curved athletic shield
      const topCornerR = Math.min(w, h) * 0.08;
      return `M 0,${topCornerR} Q 0,0 ${topCornerR},0 L ${w - topCornerR},0 Q ${w},0 ${w},${topCornerR} L ${w},${h * 0.55} C ${w},${h * 0.85} ${w * 0.65},${h * 0.98} ${w * 0.5},${h} C ${w * 0.35},${h * 0.98} 0,${h * 0.85} 0,${h * 0.55} Z`;
    }
    case 'HEXAGON': {
      // Pointed top/bottom or vertical hexagon
      const points = generateRegularPolygonPoints(w, h, 6);
      return `M ${points.split(' ').join(' L ')} Z`;
    }
    case 'CHEVRON': {
      const indent = w * 0.15;
      return `M 0,0 L ${w - indent},0 L ${w},${h / 2} L ${w - indent},${h} L 0,${h} L ${indent},${h / 2} Z`;
    }
    case 'RIBBON': {
      const notch = w * 0.1;
      return `M 0,0 L ${w},0 L ${w - notch},${h / 2} L ${w},${h} L 0,${h} L ${notch},${h / 2} Z`;
    }
    case 'PLAQUE': {
      const c = Math.min(w, h) * 0.18;
      return `M ${c},0 L ${w - c},0 L ${w},${c} L ${w},${h - c} L ${w - c},${h} L ${c},${h} L 0,${h - c} L 0,${c} Z`;
    }
    case 'OCTAGON': {
      const points = generateRegularPolygonPoints(w, h, 8);
      return `M ${points.split(' ').join(' L ')} Z`;
    }
    case 'ROSETTE':
    default: {
      // 12-point rosette medal badge
      const points = generateStarPoints(w, h, 12, 0.85);
      return `M ${points.split(' ').join(' L ')} Z`;
    }
  }
}

/**
 * Generate SVG Path for Arrow Shapes
 */
export function generateArrowPath(
  width: number,
  height: number,
  direction: 'RIGHT' | 'LEFT' | 'UP' | 'DOWN' | 'CHEVRON_RIGHT' | 'DOUBLE_HEAD' = 'RIGHT',
  headRatio: number = 0.35,
  stemRatio: number = 0.4
): string {
  const w = width;
  const h = height;

  switch (direction) {
    case 'RIGHT': {
      const headW = w * headRatio;
      const stemH = h * stemRatio;
      const stemY = (h - stemH) / 2;
      return `M 0,${stemY} L ${w - headW},${stemY} L ${w - headW},0 L ${w},${h / 2} L ${w - headW},${h} L ${w - headW},${stemY + stemH} L 0,${stemY + stemH} Z`;
    }
    case 'LEFT': {
      const headW = w * headRatio;
      const stemH = h * stemRatio;
      const stemY = (h - stemH) / 2;
      return `M ${w},${stemY} L ${headW},${stemY} L ${headW},0 L 0,${h / 2} L ${headW},${h} L ${headW},${stemY + stemH} L ${w},${stemY + stemH} Z`;
    }
    case 'UP': {
      const headH = h * headRatio;
      const stemW = w * stemRatio;
      const stemX = (w - stemW) / 2;
      return `M ${stemX},${h} L ${stemX},${headH} L 0,${headH} L ${w / 2},0 L ${w},${headH} L ${stemX + stemW},${headH} L ${stemX + stemW},${h} Z`;
    }
    case 'DOWN': {
      const headH = h * headRatio;
      const stemW = w * stemRatio;
      const stemX = (w - stemW) / 2;
      return `M ${stemX},0 L ${stemX},${h - headH} L 0,${h - headH} L ${w / 2},${h} L ${w},${h - headH} L ${stemX + stemW},${h - headH} L ${stemX + stemW},0 Z`;
    }
    case 'DOUBLE_HEAD': {
      const headW = w * (headRatio * 0.7);
      const stemH = h * stemRatio;
      const stemY = (h - stemH) / 2;
      return `M ${headW},${stemY} L ${w - headW},${stemY} L ${w - headW},0 L ${w},${h / 2} L ${w - headW},${h} L ${w - headW},${stemY + stemH} L ${headW},${stemY + stemH} L ${headW},${h} L 0,${h / 2} L ${headW},0 Z`;
    }
    case 'CHEVRON_RIGHT':
    default: {
      const thickness = w * 0.25;
      return `M 0,0 L ${w - thickness},0 L ${w},${h / 2} L ${w - thickness},${h} L 0,${h} L ${thickness},${h / 2} Z`;
    }
  }
}

/**
 * Image Box Mask Shapes & Clip-Path CSS generator
 */
export function getMaskClipPath(
  maskShape: string = 'none',
  borderRadius: number = 0
): string | undefined {
  switch (maskShape) {
    case 'circle':
      return 'circle(50% at 50% 50%)';
    case 'pill':
      return undefined; // Handled with border-radius 9999px
    case 'hexagon':
      return 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';
    case 'shield':
      return 'polygon(0% 0%, 100% 0%, 100% 60%, 50% 100%, 0% 60%)';
    case 'star':
      return 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';
    case 'triangle':
      return 'polygon(50% 0%, 0% 100%, 100% 100%)';
    case 'diagonal_cut':
      return 'polygon(0 0, 100% 0, 85% 100%, 0% 100%)';
    case 'squircle':
      return 'polygon(15% 0%, 85% 0%, 100% 15%, 100% 85%, 85% 100%, 15% 100%, 0% 85%, 0% 15%)';
    case 'rounded':
    case 'none':
    default:
      return undefined;
  }
}

/**
 * Dynamic Image Variables Directory with high-res sample presets
 */
export interface DynamicImageVariable {
  key: string;
  label: string;
  category: 'Players' | 'Teams' | 'Tournament' | 'Sponsors' | 'Flags';
  sampleUrl: string;
  description: string;
}

export const DYNAMIC_IMAGE_VARIABLES: DynamicImageVariable[] = [
  {
    key: '{{PLAYER_PHOTO}}',
    label: 'Active Player Headshot',
    category: 'Players',
    sampleUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    description: 'Portrait photo of current batsman, server, raider, or player of match',
  },
  {
    key: '{{PLAYER_IMAGE}}',
    label: 'Player Full Photo',
    category: 'Players',
    sampleUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    description: 'Full profile / action headshot for introduction lower-thirds',
  },
  {
    key: '{{CAPTAIN_PHOTO}}',
    label: 'Team Captain Photo',
    category: 'Players',
    sampleUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
    description: 'Photo of team captain for toss and captain graphic cards',
  },
  {
    key: '{{TEAM_A_LOGO}}',
    label: 'Team A Emblem / Logo',
    category: 'Teams',
    sampleUrl: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=200&auto=format&fit=crop&q=80',
    description: 'Official crest or logo of Team 1 / Home team',
  },
  {
    key: '{{TEAM_B_LOGO}}',
    label: 'Team B Emblem / Logo',
    category: 'Teams',
    sampleUrl: 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=200&auto=format&fit=crop&q=80',
    description: 'Official crest or logo of Team 2 / Away team',
  },
  {
    key: '{{TEAM_LOGO}}',
    label: 'Active Team Logo',
    category: 'Teams',
    sampleUrl: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=200&auto=format&fit=crop&q=80',
    description: 'Logo of active batting / serving / scoring team',
  },
  {
    key: '{{TOURNAMENT_LOGO}}',
    label: 'Tournament / League Logo',
    category: 'Tournament',
    sampleUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=200&auto=format&fit=crop&q=80',
    description: 'Main championship logo displayed in bugs and intro cards',
  },
  {
    key: '{{TROPHY_IMAGE}}',
    label: 'Championship Trophy',
    category: 'Tournament',
    sampleUrl: 'https://images.unsplash.com/photo-1614036417651-efe5912149d8?w=300&auto=format&fit=crop&q=80',
    description: 'Championship trophy asset for awards and final scorecards',
  },
  {
    key: '{{SPONSOR_LOGO}}',
    label: 'Title Sponsor Logo',
    category: 'Sponsors',
    sampleUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
    description: 'Title or event sponsor emblem for lower third placement',
  },
  {
    key: '{{ORGANIZER_LOGO}}',
    label: 'Organizer / Federation Logo',
    category: 'Sponsors',
    sampleUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=200&auto=format&fit=crop&q=80',
    description: 'Sports federation or club organizer logo',
  },
  {
    key: '{{FLAG}}',
    label: 'Country / State Flag',
    category: 'Flags',
    sampleUrl: 'https://images.unsplash.com/photo-1532375810709-75b1da00537c?w=200&auto=format&fit=crop&q=80',
    description: 'Country or region flag for international/state players',
  },
];

/**
 * Built-in Sample Graphics & Texture Assets
 */
export const SAMPLE_STUDIO_IMAGES = [
  {
    name: 'Player Headshot (Male)',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    category: 'Avatars',
  },
  {
    name: 'Player Headshot (Female)',
    url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80',
    category: 'Avatars',
  },
  {
    name: 'Golden Trophy Cup',
    url: 'https://images.unsplash.com/photo-1614036417651-efe5912149d8?w=300&auto=format&fit=crop&q=80',
    category: 'Trophies',
  },
  {
    name: 'Championship Shield',
    url: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=300&auto=format&fit=crop&q=80',
    category: 'Logos',
  },
  {
    name: 'Cyber Sports Texture',
    url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=600&auto=format&fit=crop&q=80',
    category: 'Backgrounds',
  },
  {
    name: 'Stadium Spotlight Glow',
    url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&auto=format&fit=crop&q=80',
    category: 'Backgrounds',
  },
];
