import React, { useState, useMemo } from 'react';
import {
  DYNAMIC_FIELDS,
  DynamicFieldDefinition,
  formatLiveFieldValue,
  substituteDynamicFields,
} from '../../../constants/studioGraphicsConstants';
import { SportType, GraphicElement } from '../../../types';
import {
  Zap,
  Search,
  Plus,
  Sparkles,
  Sliders,
  X,
  Layers,
  Image as ImageIcon,
  Check,
  Eye,
  Type,
  Maximize2,
  Clock,
  Trophy,
  Shield,
  User,
  Activity,
  Flame,
  ArrowUpRight,
  Hash,
  CircleDot,
  Award,
  Users,
  Target,
  Flag,
  Percent,
} from 'lucide-react';

interface InsertLiveDataModalProps {
  sport: SportType;
  isOpen: boolean;
  onClose: () => void;
  onInsertElement: (element: Partial<GraphicElement>) => void;
  activeVariables?: Record<string, string>;
}

export type CricketCategory =
  | 'ALL'
  | 'EVENT_ALERTS'
  | 'MATCH'
  | 'TEAM'
  | 'SCORE'
  | 'BATSMAN'
  | 'BOWLER'
  | 'OVER'
  | 'BALL'
  | 'PARTNERSHIP'
  | 'WICKET'
  | 'RECENT_BALLS'
  | 'MILESTONE'
  | 'RESULT';

interface CricketBroadcastItem {
  id: string;
  name: string;
  category: CricketCategory;
  description: string;
  tokens: string[];
  sampleText: string;
  defaultWidth: number;
  defaultHeight: number;
  icon: string;
  defaultFillColor?: string;
  defaultBorderColor?: string;
  defaultTextColor?: string;
  defaultFontSize?: number;
  defaultFontWeight?: string;
  defaultBorderRadius?: number;
  badgeShape?: 'ROUNDED' | 'CIRCLE' | 'PILL' | 'SQUARE' | 'HEXAGON';
  isBallEventEngine?: boolean;
  ballEventConfig?: any;
  isImage?: boolean;
  conditionalVisibility?: any;
  playerNameFormat?: 'full' | 'first_name' | 'short' | 'initial_surname' | 'surname';
  createElement: (pos: { x: number; y: number; width: number; height: number }, customFormat?: any) => Partial<GraphicElement>;
}

export const InsertLiveDataModal: React.FC<InsertLiveDataModalProps> = ({
  sport,
  isOpen,
  onClose,
  onInsertElement,
  activeVariables = {},
}) => {
  const [activeTab, setActiveTab] = useState<'cricket_library' | 'ball_events' | 'catalog' | 'formula' | 'images'>(
    sport === 'CRICKET' ? 'cricket_library' : 'catalog'
  );
  const [selectedSport, setSelectedSport] = useState<SportType | 'ALL'>(sport);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedCricketCategory, setSelectedCricketCategory] = useState<CricketCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlacement, setSelectedPlacement] = useState<
    'top_left' | 'top_center' | 'top_right' | 'lower_left' | 'lower_center' | 'lower_right' | 'center'
  >('lower_center');

  // Custom Formula Builder State
  const [customFormula, setCustomFormula] = useState<string>('{{SCORE}} ({{OVERS}} ov)');
  const [formulaPrefix, setFormulaPrefix] = useState<string>('');
  const [formulaSuffix, setFormulaSuffix] = useState<string>('');
  const [formulaFallback, setFormulaFallback] = useState<string>('0/0 (0.0 ov)');
  const [formulaFormatter, setFormulaFormatter] = useState<string>('none');
  const [formulaTransform, setFormulaTransform] = useState<'none' | 'uppercase' | 'lowercase' | 'capitalize'>('none');
  const [formulaFontSize, setFormulaFontSize] = useState<number>(36);
  const [formulaColor, setFormulaColor] = useState<string>('#ffffff');

  // Placement bounding box calculation in 1920x1080 canvas
  const getCoordinatesForPlacement = (
    placement: string,
    w = 360,
    h = 80
  ): { x: number; y: number; width: number; height: number } => {
    switch (placement) {
      case 'top_left':
        return { x: 80, y: 60, width: w, height: h };
      case 'top_center':
        return { x: Math.round((1920 - w) / 2), y: 60, width: w, height: h };
      case 'top_right':
        return { x: 1920 - 80 - w, y: 60, width: w, height: h };
      case 'lower_left':
        return { x: 80, y: 1080 - 100 - h, width: w, height: h };
      case 'lower_center':
        return { x: Math.round((1920 - w) / 2), y: 1080 - 100 - h, width: w, height: h };
      case 'lower_right':
        return { x: 1920 - 80 - w, y: 1080 - 100 - h, width: w, height: h };
      case 'center':
      default:
        return { x: Math.round((1920 - w) / 2), y: Math.round((1080 - h) / 2), width: w, height: h };
    }
  };

  // Comprehensive Cricket Broadcast Elements Definitions
  const cricketBroadcastLibrary: CricketBroadcastItem[] = useMemo(
    () => [
      // 1. MATCH CATEGORY
      {
        id: 'cricket-match-header',
        name: 'Match Tournament & Venue Header',
        category: 'MATCH',
        description: 'Top broadcast header showing Tournament Name, Series, Ground Venue & Status.',
        tokens: ['{{TOURNAMENT_NAME}}', '{{VENUE}}', '{{MATCH_STATUS}}'],
        sampleText: 'PREMIER CRICKET LEAGUE • EDEN GARDENS • LIVE',
        defaultWidth: 700,
        defaultHeight: 50,
        icon: '🏆',
        createElement: (pos) => ({
          name: 'Match Header • Tournament & Venue',
          type: 'LIVE_DATA',
          x: pos.x,
          y: pos.y,
          width: pos.width,
          height: pos.height,
          text: '{{TOURNAMENT_NAME}} • {{VENUE}} • {{MATCH_STATUS}}',
          liveDataField: '{{TOURNAMENT_NAME}} • {{VENUE}} • {{MATCH_STATUS}}',
          dynamicFieldKey: '{{TOURNAMENT_NAME}}',
          liveDataFallback: 'PREMIER CRICKET LEAGUE • EDEN GARDENS • LIVE',
          fontSize: 22,
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: '800',
          textColor: '#f8fafc',
          fillColor: '#090d16',
          borderColor: '#0284c7',
          borderWidth: 2,
          borderRadius: 12,
          textAlign: 'center',
          textAlignVertical: 'middle',
          textShadow: { enabled: true, color: 'rgba(0,0,0,0.85)', blur: 4, x: 0, y: 2 },
        }),
      },
      {
        id: 'cricket-chase-equation',
        name: 'Chase Equation Banner',
        category: 'MATCH',
        description: 'Displays runs needed from remaining balls and required run rate during 2nd innings.',
        tokens: ['{{RUNS_NEEDED}}', '{{BALLS_REMAINING}}', '{{RRR}}'],
        sampleText: 'Need 27 runs from 15 balls • RRR: 11.45',
        defaultWidth: 640,
        defaultHeight: 64,
        icon: '🎯',
        createElement: (pos) => ({
          name: 'Chase Equation Banner',
          type: 'LIVE_DATA',
          x: pos.x,
          y: pos.y,
          width: pos.width,
          height: pos.height,
          text: 'Need {{RUNS_NEEDED}} runs from {{BALLS_REMAINING}} balls • Req Rate: {{RRR}}',
          liveDataField: 'Need {{RUNS_NEEDED}} runs from {{BALLS_REMAINING}} balls • Req Rate: {{RRR}}',
          dynamicFieldKey: '{{RUNS_NEEDED}}',
          liveDataFallback: 'Need 27 runs from 15 balls • Req Rate: 11.45',
          fontSize: 24,
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: '900',
          textColor: '#fef08a',
          fillColor: '#450a0a',
          borderColor: '#ef4444',
          borderWidth: 2,
          borderRadius: 14,
          textAlign: 'center',
          textAlignVertical: 'middle',
          conditionalVisibility: { enabled: true, condition: 'CHASE_ACTIVE' },
        }),
      },
      {
        id: 'cricket-target-score-bug',
        name: 'Target Score & Rates Bug',
        category: 'MATCH',
        description: 'Shows target total with active CRR and Required Run Rate.',
        tokens: ['{{TARGET}}', '{{CRR}}', '{{RRR}}'],
        sampleText: 'TARGET: 205 • CRR: 9.94 • RRR: 11.45',
        defaultWidth: 540,
        defaultHeight: 56,
        icon: '📊',
        createElement: (pos) => ({
          name: 'Target Score Bug',
          type: 'LIVE_DATA',
          x: pos.x,
          y: pos.y,
          width: pos.width,
          height: pos.height,
          text: 'TARGET: {{TARGET}} • CRR: {{CRR}} • RRR: {{RRR}}',
          liveDataField: 'TARGET: {{TARGET}} • CRR: {{CRR}} • RRR: {{RRR}}',
          dynamicFieldKey: '{{TARGET}}',
          liveDataFallback: 'TARGET: 205 • CRR: 9.94 • RRR: 11.45',
          fontSize: 20,
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: '800',
          textColor: '#38bdf8',
          fillColor: '#0b132b',
          borderColor: '#38bdf8',
          borderWidth: 1.5,
          borderRadius: 12,
          textAlign: 'center',
          textAlignVertical: 'middle',
        }),
      },

      // 2. TEAM CATEGORY
      {
        id: 'cricket-batting-team-pill',
        name: 'Batting Team Name Pill',
        category: 'TEAM',
        description: 'Prominent badge indicating the batting team with team branding color.',
        tokens: ['{{BATTING_TEAM_NAME}}', '{{INNINGS}}'],
        sampleText: 'Royal Challengers • Innings 2',
        defaultWidth: 380,
        defaultHeight: 60,
        icon: '🛡️',
        createElement: (pos) => ({
          name: 'Batting Team Pill',
          type: 'LIVE_DATA',
          x: pos.x,
          y: pos.y,
          width: pos.width,
          height: pos.height,
          text: '{{BATTING_TEAM_NAME}} • {{INNINGS}}',
          liveDataField: '{{BATTING_TEAM_NAME}} • {{INNINGS}}',
          dynamicFieldKey: '{{BATTING_TEAM_NAME}}',
          liveDataFallback: 'Royal Challengers • Innings 2',
          fontSize: 22,
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: '800',
          textColor: '#ffffff',
          fillColor: '#b91c1c',
          borderColor: '#f87171',
          borderWidth: 2,
          borderRadius: 16,
          textAlign: 'center',
          textAlignVertical: 'middle',
        }),
      },
      {
        id: 'cricket-team-vs-dual-score',
        name: 'Team A vs Team B Score Matchup',
        category: 'TEAM',
        description: 'Complete dual scoreline with both teams and active scores.',
        tokens: ['{{TEAM_A_SHORT}}', '{{TEAM_A_SCORE}}', '{{TEAM_B_SHORT}}', '{{TEAM_B_SCORE}}'],
        sampleText: 'RCB 184/4 (20.0) vs TITANS 162/6 (18.3)',
        defaultWidth: 720,
        defaultHeight: 64,
        icon: '⚔️',
        createElement: (pos) => ({
          name: 'Team Matchup Scores',
          type: 'LIVE_DATA',
          x: pos.x,
          y: pos.y,
          width: pos.width,
          height: pos.height,
          text: '{{TEAM_A_SHORT}} {{TEAM_A_SCORE}} • {{TEAM_B_SHORT}} {{TEAM_B_SCORE}}',
          liveDataField: '{{TEAM_A_SHORT}} {{TEAM_A_SCORE}} • {{TEAM_B_SHORT}} {{TEAM_B_SCORE}}',
          dynamicFieldKey: '{{TEAM_A_SCORE}}',
          liveDataFallback: 'RCB 184/4 (20.0) • TITANS 162/6 (18.3)',
          fontSize: 24,
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: '800',
          textColor: '#f8fafc',
          fillColor: '#0f172a',
          borderColor: '#e2e8f0',
          borderWidth: 2,
          borderRadius: 16,
          textAlign: 'center',
          textAlignVertical: 'middle',
        }),
      },

      // 3. SCORE CATEGORY
      {
        id: 'cricket-scorebug-primary',
        name: 'Full Match Scorebug (Score + Overs + CRR)',
        category: 'SCORE',
        description: 'Premium scorebug displaying Runs/Wickets, Overs delivered and Current Run Rate.',
        tokens: ['{{SCORE}}', '{{CRR}}', '{{INNINGS}}'],
        sampleText: '184/4 (18.3 ov) • CRR: 9.94',
        defaultWidth: 440,
        defaultHeight: 80,
        icon: '⚡',
        createElement: (pos) => ({
          name: 'Primary Scorebug • Score & Overs',
          type: 'LIVE_DATA',
          x: pos.x,
          y: pos.y,
          width: pos.width,
          height: pos.height,
          text: '{{SCORE}} • CRR: {{CRR}}',
          liveDataField: '{{SCORE}} • CRR: {{CRR}}',
          dynamicFieldKey: '{{SCORE}}',
          liveDataFallback: '184/4 (18.3 ov) • CRR: 9.94',
          fontSize: 32,
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: '900',
          textColor: '#ffffff',
          fillColor: '#0284c7',
          borderColor: '#38bdf8',
          borderWidth: 2.5,
          borderRadius: 18,
          textAlign: 'center',
          textAlignVertical: 'middle',
          textShadow: { enabled: true, color: 'rgba(0,0,0,0.9)', blur: 6, x: 0, y: 3 },
        }),
      },
      {
        id: 'cricket-runs-wickets-big',
        name: 'Large Runs / Wickets Counter',
        category: 'SCORE',
        description: 'Overs-free massive numeric score display (e.g. 184/4) with neon drop glow.',
        tokens: ['{{RUNS}}', '{{WICKETS}}'],
        sampleText: '184/4',
        defaultWidth: 240,
        defaultHeight: 90,
        icon: '🔢',
        createElement: (pos) => ({
          name: 'Big Score Counter (Runs/Wickets)',
          type: 'LIVE_DATA',
          x: pos.x,
          y: pos.y,
          width: pos.width,
          height: pos.height,
          text: '{{RUNS}}/{{WICKETS}}',
          liveDataField: '{{RUNS}}/{{WICKETS}}',
          dynamicFieldKey: '{{SCORE_RUNS_WICKETS}}',
          liveDataFallback: '184/4',
          fontSize: 56,
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: '900',
          textColor: '#38bdf8',
          textAlign: 'center',
          textAlignVertical: 'middle',
          textShadow: { enabled: true, color: 'rgba(56, 189, 248, 0.6)', blur: 12, x: 0, y: 0 },
        }),
      },
      {
        id: 'cricket-overs-progress-pill',
        name: 'Overs Count & Progress Pill',
        category: 'SCORE',
        description: 'Displays current overs vs total overs (e.g. 18.3 / 20 OVERS).',
        tokens: ['{{OVERS}}', '{{TOTAL_OVERS}}'],
        sampleText: '18.3 / 20 OVERS',
        defaultWidth: 260,
        defaultHeight: 50,
        icon: '⏱️',
        createElement: (pos) => ({
          name: 'Overs Progress Pill',
          type: 'LIVE_DATA',
          x: pos.x,
          y: pos.y,
          width: pos.width,
          height: pos.height,
          text: '{{OVERS}} / {{TOTAL_OVERS}} OVERS',
          liveDataField: '{{OVERS}} / {{TOTAL_OVERS}} OVERS',
          dynamicFieldKey: '{{OVER_PROGRESS}}',
          liveDataFallback: '18.3 / 20 OVERS',
          fontSize: 20,
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: '800',
          textColor: '#a7f3d0',
          fillColor: '#064e3b',
          borderColor: '#10b981',
          borderWidth: 1.5,
          borderRadius: 9999,
          textAlign: 'center',
          textAlignVertical: 'middle',
        }),
      },

      // 4. BATSMAN / STRIKER CATEGORY
      {
        id: 'cricket-striker-full-scoreline',
        name: 'Striker Full Scoreline (Runs, Balls, 4s, 6s, SR)',
        category: 'BATSMAN',
        description: 'Comprehensive batsman statistics bar including boundary counts and strike rate.',
        tokens: ['{{STRIKER_SHORT_NAME}}', '{{STRIKER_SCORE}}', '{{STRIKER_BALLS}}', '{{STRIKER_4S}}', '{{STRIKER_6S}}', '{{STRIKER_SR}}'],
        sampleText: 'V. Kohli 76* (42b • 8x4 4x6 • SR: 180.95)',
        defaultWidth: 620,
        defaultHeight: 64,
        icon: '🏏',
        createElement: (pos) => ({
          name: 'Striker Full Scoreline',
          type: 'LIVE_DATA',
          x: pos.x,
          y: pos.y,
          width: pos.width,
          height: pos.height,
          text: '{{STRIKER_SHORT_NAME}} {{STRIKER_SCORE}} ({{STRIKER_BALLS}}b • {{STRIKER_4S}}x4 {{STRIKER_6S}}x6 • SR: {{STRIKER_SR}})',
          liveDataField: '{{STRIKER_SHORT_NAME}} {{STRIKER_SCORE}} ({{STRIKER_BALLS}}b • {{STRIKER_4S}}x4 {{STRIKER_6S}}x6 • SR: {{STRIKER_SR}})',
          dynamicFieldKey: '{{STRIKER}}',
          liveDataFallback: 'V. Kohli 76* (42b • 8x4 4x6 • SR: 180.95)',
          fontSize: 22,
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: '800',
          textColor: '#ffffff',
          fillColor: '#0f172a',
          borderColor: '#eab308',
          borderWidth: 2,
          borderRadius: 14,
          textAlign: 'center',
          textAlignVertical: 'middle',
          conditionalVisibility: { enabled: true, condition: 'STRIKER_EXISTS' },
        }),
      },
      {
        id: 'cricket-striker-compact-pill',
        name: 'Striker Compact Score Pill',
        category: 'BATSMAN',
        description: 'Compact scorebug strip for active batsman on strike.',
        tokens: ['{{STRIKER_SHORT_NAME}}', '{{STRIKER_SCORE}}', '{{STRIKER_BALLS}}'],
        sampleText: 'V. Kohli 76* (42)',
        defaultWidth: 320,
        defaultHeight: 52,
        icon: '🏏',
        createElement: (pos) => ({
          name: 'Striker Compact Pill',
          type: 'LIVE_DATA',
          x: pos.x,
          y: pos.y,
          width: pos.width,
          height: pos.height,
          text: '{{STRIKER_SHORT_NAME}} {{STRIKER_SCORE}} ({{STRIKER_BALLS}})',
          liveDataField: '{{STRIKER_SHORT_NAME}} {{STRIKER_SCORE}} ({{STRIKER_BALLS}})',
          dynamicFieldKey: '{{STRIKER}}',
          liveDataFallback: 'V. Kohli 76* (42)',
          fontSize: 22,
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: '900',
          textColor: '#fef08a',
          fillColor: '#1e1b4b',
          borderColor: '#6366f1',
          borderWidth: 2,
          borderRadius: 9999,
          textAlign: 'center',
          textAlignVertical: 'middle',
          conditionalVisibility: { enabled: true, condition: 'STRIKER_EXISTS' },
        }),
      },
      {
        id: 'cricket-non-striker-full',
        name: 'Non-Striker Scoreline',
        category: 'BATSMAN',
        description: 'Scoreline strip for batsman at the non-striker end.',
        tokens: ['{{NON_STRIKER_SHORT_NAME}}', '{{NON_STRIKER_SCORE}}', '{{NON_STRIKER_BALLS}}', '{{NON_STRIKER_SR}}'],
        sampleText: 'K. Rahul 34* (21b • SR: 161.90)',
        defaultWidth: 460,
        defaultHeight: 54,
        icon: '🏏',
        createElement: (pos) => ({
          name: 'Non-Striker Scoreline',
          type: 'LIVE_DATA',
          x: pos.x,
          y: pos.y,
          width: pos.width,
          height: pos.height,
          text: '{{NON_STRIKER_SHORT_NAME}} {{NON_STRIKER_SCORE}} ({{NON_STRIKER_BALLS}}b • SR: {{NON_STRIKER_SR}})',
          liveDataField: '{{NON_STRIKER_SHORT_NAME}} {{NON_STRIKER_SCORE}} ({{NON_STRIKER_BALLS}}b • SR: {{NON_STRIKER_SR}})',
          dynamicFieldKey: '{{NON_STRIKER}}',
          liveDataFallback: 'K. Rahul 34* (21b • SR: 161.90)',
          fontSize: 20,
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: '700',
          textColor: '#e2e8f0',
          fillColor: '#1e293b',
          borderColor: '#475569',
          borderWidth: 1.5,
          borderRadius: 12,
          textAlign: 'center',
          textAlignVertical: 'middle',
          conditionalVisibility: { enabled: true, condition: 'NON_STRIKER_EXISTS' },
        }),
      },
      {
        id: 'cricket-dual-batsmen-bar',
        name: 'Dual Batsmen Crease Bar',
        category: 'BATSMAN',
        description: 'Side-by-side combined bar showing both active batsmen on crease simultaneously.',
        tokens: ['{{STRIKER_SHORT_NAME}}', '{{STRIKER_SCORE}}', '{{NON_STRIKER_SHORT_NAME}}', '{{NON_STRIKER_SCORE}}'],
        sampleText: '★ V. Kohli 76* (42)  |  K. Rahul 34* (21)',
        defaultWidth: 640,
        defaultHeight: 56,
        icon: '👥',
        createElement: (pos) => ({
          name: 'Dual Batsmen Crease Bar',
          type: 'LIVE_DATA',
          x: pos.x,
          y: pos.y,
          width: pos.width,
          height: pos.height,
          text: '★ {{STRIKER_SHORT_NAME}} {{STRIKER_SCORE}} ({{STRIKER_BALLS}})  |  {{NON_STRIKER_SHORT_NAME}} {{NON_STRIKER_SCORE}} ({{NON_STRIKER_BALLS}})',
          liveDataField: '★ {{STRIKER_SHORT_NAME}} {{STRIKER_SCORE}} ({{STRIKER_BALLS}})  |  {{NON_STRIKER_SHORT_NAME}} {{NON_STRIKER_SCORE}} ({{NON_STRIKER_BALLS}})',
          dynamicFieldKey: '{{STRIKER}}',
          liveDataFallback: '★ V. Kohli 76* (42)  |  K. Rahul 34* (21)',
          fontSize: 20,
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: '800',
          textColor: '#ffffff',
          fillColor: '#0f172a',
          borderColor: '#38bdf8',
          borderWidth: 2,
          borderRadius: 14,
          textAlign: 'center',
          textAlignVertical: 'middle',
        }),
      },
      {
        id: 'cricket-striker-photo-badge',
        name: 'Striker Headshot Photo Badge',
        category: 'BATSMAN',
        description: 'Dynamic circular headshot photo of the batsman on strike.',
        tokens: ['{{STRIKER_PHOTO}}'],
        sampleText: 'Headshot Image',
        defaultWidth: 120,
        defaultHeight: 120,
        icon: '👤',
        isImage: true,
        createElement: (pos) => ({
          name: 'Striker Headshot Photo',
          type: 'IMAGE',
          x: pos.x,
          y: pos.y,
          width: 120,
          height: 120,
          imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
          dynamicFieldKey: '{{STRIKER_PHOTO}}',
          liveDataField: '{{STRIKER_PHOTO}}',
          imageFit: 'cover',
          maskShape: 'circle',
          borderRadius: 9999,
          borderColor: '#eab308',
          borderWidth: 3,
          boxShadow: { enabled: true, color: 'rgba(234, 179, 8, 0.5)', blur: 16, spread: 2, x: 0, y: 4 },
          conditionalVisibility: { enabled: true, condition: 'STRIKER_EXISTS' },
        }),
      },

      // 5. BOWLER CATEGORY
      {
        id: 'cricket-bowler-figures-card',
        name: 'Active Bowler Figures Card',
        category: 'BOWLER',
        description: 'Complete bowling figures with Wickets, Runs, Overs bowled and Economy Rate.',
        tokens: ['{{BOWLER_SHORT_NAME}}', '{{BOWLER_WICKETS}}', '{{BOWLER_RUNS}}', '{{BOWLER_OVERS}}', '{{BOWLER_ECONOMY}}'],
        sampleText: 'J. Bumrah 2/28 (3.3 ov) • Econ: 8.00',
        defaultWidth: 560,
        defaultHeight: 64,
        icon: '🎯',
        createElement: (pos) => ({
          name: 'Active Bowler Figures Card',
          type: 'LIVE_DATA',
          x: pos.x,
          y: pos.y,
          width: pos.width,
          height: pos.height,
          text: '{{BOWLER_SHORT_NAME}} {{BOWLER_WICKETS}}/{{BOWLER_RUNS}} ({{BOWLER_OVERS}} ov) • Econ: {{BOWLER_ECONOMY}}',
          liveDataField: '{{BOWLER_SHORT_NAME}} {{BOWLER_WICKETS}}/{{BOWLER_RUNS}} ({{BOWLER_OVERS}} ov) • Econ: {{BOWLER_ECONOMY}}',
          dynamicFieldKey: '{{BOWLER}}',
          liveDataFallback: 'J. Bumrah 2/28 (3.3 ov) • Econ: 8.00',
          fontSize: 22,
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: '800',
          textColor: '#ffffff',
          fillColor: '#172554',
          borderColor: '#3b82f6',
          borderWidth: 2,
          borderRadius: 14,
          textAlign: 'center',
          textAlignVertical: 'middle',
          conditionalVisibility: { enabled: true, condition: 'BOWLER_EXISTS' },
        }),
      },
      {
        id: 'cricket-bowler-dots-pill',
        name: 'Bowler Dot Balls & Economy Pill',
        category: 'BOWLER',
        description: 'Displays bowler dot balls delivered and active economy rate.',
        tokens: ['{{BOWLER_SHORT_NAME}}', '{{BOWLER_DOTS}}', '{{BOWLER_ECONOMY}}'],
        sampleText: 'J. Bumrah • 12 Dots • Econ: 8.00',
        defaultWidth: 420,
        defaultHeight: 52,
        icon: '🎯',
        createElement: (pos) => ({
          name: 'Bowler Dots & Economy Pill',
          type: 'LIVE_DATA',
          x: pos.x,
          y: pos.y,
          width: pos.width,
          height: pos.height,
          text: '{{BOWLER_SHORT_NAME}} • {{BOWLER_DOTS}} Dots • Econ: {{BOWLER_ECONOMY}}',
          liveDataField: '{{BOWLER_SHORT_NAME}} • {{BOWLER_DOTS}} Dots • Econ: {{BOWLER_ECONOMY}}',
          dynamicFieldKey: '{{BOWLER_DOTS}}',
          liveDataFallback: 'J. Bumrah • 12 Dots • Econ: 8.00',
          fontSize: 18,
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: '800',
          textColor: '#93c5fd',
          fillColor: '#0f172a',
          borderColor: '#38bdf8',
          borderWidth: 1.5,
          borderRadius: 9999,
          textAlign: 'center',
          textAlignVertical: 'middle',
        }),
      },
      {
        id: 'cricket-bowler-photo-badge',
        name: 'Bowler Headshot Photo Badge',
        category: 'BOWLER',
        description: 'Dynamic circular headshot photo of active bowler currently bowling.',
        tokens: ['{{BOWLER_PHOTO}}'],
        sampleText: 'Headshot Image',
        defaultWidth: 120,
        defaultHeight: 120,
        icon: '👤',
        isImage: true,
        createElement: (pos) => ({
          name: 'Bowler Headshot Photo',
          type: 'IMAGE',
          x: pos.x,
          y: pos.y,
          width: 120,
          height: 120,
          imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
          dynamicFieldKey: '{{BOWLER_PHOTO}}',
          liveDataField: '{{BOWLER_PHOTO}}',
          imageFit: 'cover',
          maskShape: 'circle',
          borderRadius: 9999,
          borderColor: '#3b82f6',
          borderWidth: 3,
          boxShadow: { enabled: true, color: 'rgba(59, 130, 246, 0.5)', blur: 16, spread: 2, x: 0, y: 4 },
          conditionalVisibility: { enabled: true, condition: 'BOWLER_EXISTS' },
        }),
      },

      // 6. OVER CATEGORY
      {
        id: 'cricket-over-summary-bar',
        name: 'Over Summary String (Balls + Runs)',
        category: 'OVER',
        description: 'Full over summary showing all deliveries bowled and total runs conceded in the over.',
        tokens: ['{{OVER_SUMMARY}}'],
        sampleText: 'OVER 19: 1 • 4 • 6 • W • 2 • 1 (14 runs)',
        defaultWidth: 540,
        defaultHeight: 56,
        icon: '📋',
        createElement: (pos) => ({
          name: 'Over Summary Bar',
          type: 'LIVE_DATA',
          x: pos.x,
          y: pos.y,
          width: pos.width,
          height: pos.height,
          text: '{{OVER_SUMMARY}}',
          liveDataField: '{{OVER_SUMMARY}}',
          dynamicFieldKey: '{{OVER_SUMMARY}}',
          liveDataFallback: 'OVER 19: 1 • 4 • 6 • W • 2 • 1 (14 runs)',
          fontSize: 20,
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: '800',
          textColor: '#f8fafc',
          fillColor: '#090d16',
          borderColor: '#10b981',
          borderWidth: 1.5,
          borderRadius: 12,
          textAlign: 'center',
          textAlignVertical: 'middle',
        }),
      },
      {
        id: 'cricket-last-over-runs-card',
        name: 'Last Over Runs Conceded Card',
        category: 'OVER',
        description: 'Displays runs and wickets from the previous completed over.',
        tokens: ['{{LAST_OVER}}'],
        sampleText: 'Last Over: 14 Runs (1 Wicket)',
        defaultWidth: 380,
        defaultHeight: 52,
        icon: '🔁',
        createElement: (pos) => ({
          name: 'Last Over Summary',
          type: 'LIVE_DATA',
          x: pos.x,
          y: pos.y,
          width: pos.width,
          height: pos.height,
          text: 'Last Over: {{LAST_OVER}}',
          liveDataField: 'Last Over: {{LAST_OVER}}',
          dynamicFieldKey: '{{LAST_OVER}}',
          liveDataFallback: 'Last Over: 14 Runs (1 Wicket)',
          fontSize: 18,
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: '700',
          textColor: '#cbd5e1',
          fillColor: '#1e293b',
          borderColor: '#64748b',
          borderWidth: 1.5,
          borderRadius: 12,
          textAlign: 'center',
          textAlignVertical: 'middle',
        }),
      },

      // 7. BALL CATEGORY
      {
        id: 'cricket-ball-event-badge',
        name: 'Cricket Ball Event Badge',
        category: 'BALL',
        description: 'Dedicated real-time delivery badge with color-coded orb, over position, and event tag.',
        tokens: ['{{CURRENT_BALL_EVENT}}', '{{LAST_BALL_RESULT}}'],
        sampleText: '4 (BOUNDARY FOUR)',
        defaultWidth: 340,
        defaultHeight: 90,
        icon: '🔴',
        isBallEventEngine: true,
        createElement: (pos) => ({
          type: 'CRICKET_BALL_EVENT',
          name: 'Ball Event • Broadcast Badge',
          x: pos.x,
          y: pos.y,
          width: 340,
          height: 90,
          fillColor: '#059669',
          borderColor: '#10b981',
          borderWidth: 2,
          borderRadius: 16,
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
          },
        }),
      },
      {
        id: 'cricket-ball-letter-orb',
        name: 'Circular Ball Delivery Orb',
        category: 'BALL',
        description: 'Stand-alone circular delivery token with neon glowing stroke.',
        tokens: ['{{LAST_BALL_RESULT}}'],
        sampleText: '6',
        defaultWidth: 90,
        defaultHeight: 90,
        icon: '🟣',
        isBallEventEngine: true,
        createElement: (pos) => ({
          type: 'CRICKET_BALL_EVENT',
          name: 'Ball Event • Letter Orb',
          x: pos.x,
          y: pos.y,
          width: 90,
          height: 90,
          fillColor: '#7e22ce',
          borderColor: '#c084fc',
          borderWidth: 2,
          borderRadius: 9999,
          ballEventConfig: {
            displayMode: 'LETTER',
            colorPreset: 'DYNAMIC_COLOR',
            animationPreset: 'POP',
            sampleEvent: '6',
            badgeShape: 'CIRCLE',
          },
        }),
      },

      // 8. PARTNERSHIP CATEGORY
      {
        id: 'cricket-partnership-full-banner',
        name: 'Active Partnership Banner',
        category: 'PARTNERSHIP',
        description: 'Displays current batting partnership runs, balls faced, and run rate.',
        tokens: ['{{PARTNERSHIP_RUNS}}', '{{PARTNERSHIP_BALLS}}', '{{PARTNERSHIP_RATE}}'],
        sampleText: 'Partnership: 88 runs (49 balls) • Rate: 10.77',
        defaultWidth: 580,
        defaultHeight: 60,
        icon: '🤝',
        createElement: (pos) => ({
          name: 'Partnership Full Banner',
          type: 'LIVE_DATA',
          x: pos.x,
          y: pos.y,
          width: pos.width,
          height: pos.height,
          text: 'Partnership: {{PARTNERSHIP_RUNS}} runs ({{PARTNERSHIP_BALLS}} balls) • Rate: {{PARTNERSHIP_RATE}}',
          liveDataField: 'Partnership: {{PARTNERSHIP_RUNS}} runs ({{PARTNERSHIP_BALLS}} balls) • Rate: {{PARTNERSHIP_RATE}}',
          dynamicFieldKey: '{{PARTNERSHIP}}',
          liveDataFallback: 'Partnership: 88 runs (49 balls) • Rate: 10.77',
          fontSize: 20,
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: '800',
          textColor: '#fef08a',
          fillColor: '#0f172a',
          borderColor: '#eab308',
          borderWidth: 2,
          borderRadius: 14,
          textAlign: 'center',
          textAlignVertical: 'middle',
          conditionalVisibility: { enabled: true, condition: 'PARTNERSHIP_ACTIVE' },
        }),
      },

      // 9. WICKET CATEGORY
      {
        id: 'cricket-wicket-alert-flash',
        name: 'Wicket Alert Flash Card',
        category: 'WICKET',
        description: 'Bold red dismissal alert displaying batsman name, dismissal mode, and score.',
        tokens: ['{{DISMISSED_PLAYER}}', '{{DISMISSAL_TEXT}}', '{{SCORE}}'],
        sampleText: 'WICKET! Virat Kohli c Rahul b Bumrah',
        defaultWidth: 640,
        defaultHeight: 84,
        icon: '🔥',
        createElement: (pos) => ({
          name: 'Wicket Alert Flash Card',
          type: 'LIVE_DATA',
          x: pos.x,
          y: pos.y,
          width: pos.width,
          height: pos.height,
          text: '🔥 WICKET! {{DISMISSED_PLAYER}} {{DISMISSAL_TEXT}}',
          liveDataField: '🔥 WICKET! {{DISMISSED_PLAYER}} {{DISMISSAL_TEXT}}',
          dynamicFieldKey: '{{DISMISSAL_TEXT}}',
          liveDataFallback: '🔥 WICKET! Virat Kohli c Rahul b Bumrah',
          fontSize: 24,
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: '900',
          textColor: '#ffffff',
          fillColor: '#881337',
          borderColor: '#f43f5e',
          borderWidth: 3,
          borderRadius: 16,
          textAlign: 'center',
          textAlignVertical: 'middle',
          conditionalVisibility: { enabled: true, condition: 'WICKET' },
          textShadow: { enabled: true, color: 'rgba(0,0,0,0.9)', blur: 6, x: 0, y: 2 },
        }),
      },

      // 10. RECENT BALLS CATEGORY
      {
        id: 'cricket-recent-balls-strip',
        name: 'Recent 6 Deliveries Strip',
        category: 'RECENT_BALLS',
        description: 'Live interactive strip showing the sequential balls of the over with color-coded circular badges.',
        tokens: ['{{RECENT_BALLS}}', '{{THIS_OVER}}'],
        sampleText: '1 • 4 • 6 • W • 2 • 1',
        defaultWidth: 380,
        defaultHeight: 60,
        icon: '⚪',
        isBallEventEngine: true,
        createElement: (pos) => ({
          type: 'CRICKET_BALL_EVENT',
          name: 'Recent Deliveries Strip (6 Balls)',
          x: pos.x,
          y: pos.y,
          width: 380,
          height: 60,
          fillColor: '#0f172a',
          borderColor: '#38bdf8',
          borderWidth: 1.5,
          borderRadius: 14,
          ballEventConfig: {
            displayMode: 'RECENT_STRIP',
            colorPreset: 'DYNAMIC_COLOR',
            animationPreset: 'SLIDE_UP',
            recentBallsCount: 6,
            badgeShape: 'CIRCLE',
          },
        }),
      },

      // 11. MILESTONE CATEGORY
      {
        id: 'cricket-fifty-milestone-banner',
        name: 'Batsman 50 Milestone Card',
        category: 'MILESTONE',
        description: 'Celebratory golden lower third triggered upon batsman reaching 50 runs.',
        tokens: ['{{BATSMAN_NAME}}', '{{BATSMAN_RUNS}}', '{{BATSMAN_BALLS}}'],
        sampleText: 'HALF CENTURY • 50 FOR VIRAT KOHLI (32 BALLS)',
        defaultWidth: 680,
        defaultHeight: 74,
        icon: '👑',
        createElement: (pos) => ({
          name: 'Fifty Milestone Banner',
          type: 'LIVE_DATA',
          x: pos.x,
          y: pos.y,
          width: pos.width,
          height: pos.height,
          text: '★ HALF CENTURY: {{BATSMAN_NAME}} {{BATSMAN_RUNS}} ({{BATSMAN_BALLS}}b)',
          liveDataField: '★ HALF CENTURY: {{BATSMAN_NAME}} {{BATSMAN_RUNS}} ({{BATSMAN_BALLS}}b)',
          dynamicFieldKey: '{{BATSMAN_MILESTONE}}',
          liveDataFallback: '★ HALF CENTURY: Virat Kohli 50* (32b)',
          fontSize: 24,
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: '900',
          textColor: '#fef08a',
          fillColor: '#713f12',
          borderColor: '#facc15',
          borderWidth: 2.5,
          borderRadius: 16,
          textAlign: 'center',
          textAlignVertical: 'middle',
          conditionalVisibility: { enabled: true, condition: 'MILESTONE_ACTIVE' },
        }),
      },
      {
        id: 'cricket-century-milestone-banner',
        name: 'Batsman 100 Century Splash',
        category: 'MILESTONE',
        description: 'Elite fireworks celebration card for 100 runs milestone.',
        tokens: ['{{BATSMAN_NAME}}', '{{BATSMAN_RUNS}}', '{{BATSMAN_BALLS}}'],
        sampleText: 'MAGNIFICENT CENTURY! 100* FOR VIRAT KOHLI',
        defaultWidth: 740,
        defaultHeight: 84,
        icon: '💎',
        createElement: (pos) => ({
          name: 'Century Milestone Splash',
          type: 'LIVE_DATA',
          x: pos.x,
          y: pos.y,
          width: pos.width,
          height: pos.height,
          text: '💎 MAGNIFICENT 100! {{BATSMAN_NAME}} {{BATSMAN_RUNS}} ({{BATSMAN_BALLS}}b)',
          liveDataField: '💎 MAGNIFICENT 100! {{BATSMAN_NAME}} {{BATSMAN_RUNS}} ({{BATSMAN_BALLS}}b)',
          dynamicFieldKey: '{{BATSMAN_MILESTONE}}',
          liveDataFallback: '💎 MAGNIFICENT 100! Virat Kohli 100* (58b)',
          fontSize: 26,
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: '900',
          textColor: '#ffffff',
          fillColor: '#581c87',
          borderColor: '#c084fc',
          borderWidth: 3,
          borderRadius: 18,
          textAlign: 'center',
          textAlignVertical: 'middle',
          conditionalVisibility: { enabled: true, condition: 'MILESTONE_ACTIVE' },
        }),
      },

      // 12. RESULT CATEGORY
      {
        id: 'cricket-match-winner-announcement',
        name: 'Match Winner Full Announcement',
        category: 'RESULT',
        description: 'End-of-match victory banner declaring the winning team and margin.',
        tokens: ['{{WINNING_TEAM}}', '{{WIN_MARGIN}}', '{{RESULT_TEXT}}'],
        sampleText: 'Royal Challengers won by 24 runs',
        defaultWidth: 700,
        defaultHeight: 80,
        icon: '🏆',
        createElement: (pos) => ({
          name: 'Match Winner Banner',
          type: 'LIVE_DATA',
          x: pos.x,
          y: pos.y,
          width: pos.width,
          height: pos.height,
          text: '🏆 {{RESULT_TEXT}}',
          liveDataField: '🏆 {{RESULT_TEXT}}',
          dynamicFieldKey: '{{RESULT_TEXT}}',
          liveDataFallback: '🏆 Royal Challengers won by 24 runs',
          fontSize: 26,
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: '900',
          textColor: '#fef08a',
          fillColor: '#064e3b',
          borderColor: '#10b981',
          borderWidth: 3,
          borderRadius: 18,
          textAlign: 'center',
          textAlignVertical: 'middle',
          conditionalVisibility: { enabled: true, condition: 'MATCH_COMPLETED' },
        }),
      },
      {
        id: 'cricket-potm-presentation-card',
        name: 'Player of the Match Presentation',
        category: 'RESULT',
        description: 'Post-match presentation card with POTM name and headshot photo.',
        tokens: ['{{POTM_NAME}}', '{{POTM_PHOTO}}'],
        sampleText: 'PLAYER OF THE MATCH: Virat Kohli',
        defaultWidth: 640,
        defaultHeight: 74,
        icon: '🎖️',
        createElement: (pos) => ({
          name: 'Player of the Match Card',
          type: 'LIVE_DATA',
          x: pos.x,
          y: pos.y,
          width: pos.width,
          height: pos.height,
          text: '🎖️ PLAYER OF THE MATCH: {{POTM_NAME}}',
          liveDataField: '🎖️ PLAYER OF THE MATCH: {{POTM_NAME}}',
          dynamicFieldKey: '{{POTM_NAME}}',
          liveDataFallback: '🎖️ PLAYER OF THE MATCH: Virat Kohli',
          fontSize: 22,
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: '900',
          textColor: '#ffffff',
          fillColor: '#1e1b4b',
          borderColor: '#a855f7',
          borderWidth: 2.5,
          borderRadius: 16,
          textAlign: 'center',
          textAlignVertical: 'middle',
          conditionalVisibility: { enabled: true, condition: 'MATCH_COMPLETED' },
        }),
      },
      {
        id: 'cricket-innings-break-card',
        name: 'Innings Break Top Performers',
        category: 'RESULT',
        description: 'Innings interval card summarizing top batsman and top bowler.',
        tokens: ['{{INNINGS_BREAK_TITLE}}', '{{TOP_BATSMAN}}', '{{TOP_BOWLER}}'],
        sampleText: 'INNINGS BREAK • Top Bat: Virat Kohli 76* • Best Bowl: J. Bumrah 2/28',
        defaultWidth: 760,
        defaultHeight: 70,
        icon: '☕',
        createElement: (pos) => ({
          name: 'Innings Break Card',
          type: 'LIVE_DATA',
          x: pos.x,
          y: pos.y,
          width: pos.width,
          height: pos.height,
          text: '{{INNINGS_BREAK_TITLE}} • {{TOP_BATSMAN}} • {{TOP_BOWLER}}',
          liveDataField: '{{INNINGS_BREAK_TITLE}} • {{TOP_BATSMAN}} • {{TOP_BOWLER}}',
          dynamicFieldKey: '{{INNINGS_BREAK_TITLE}}',
          liveDataFallback: 'INNINGS BREAK • Virat Kohli 76* (42b) • Jasprit Bumrah 2/28 (3.3 ov)',
          fontSize: 20,
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: '800',
          textColor: '#e0f2fe',
          fillColor: '#0c4a6e',
          borderColor: '#38bdf8',
          borderWidth: 2,
          borderRadius: 16,
          textAlign: 'center',
          textAlignVertical: 'middle',
        }),
      },

      // 13. EVENT & BROADCAST ALERTS (Live Event Presentation Engine)
      {
        id: 'cricket-event-alert-multipurpose',
        name: 'Live Cricket Event Alert Banner',
        category: 'EVENT_ALERTS',
        description: 'Dynamic event banner with headshot, badge, headline, and animated border glow.',
        tokens: ['{{EVENT_TYPE}}', '{{EVENT_TITLE}}', '{{EVENT_SUBTITLE}}', '{{STRIKER_PHOTO}}'],
        sampleText: 'BOUNDARY FOUR! • Cracked through extra cover',
        defaultWidth: 640,
        defaultHeight: 88,
        icon: '⚡',
        createElement: (pos) => ({
          type: 'CRICKET_EVENT_ALERT',
          name: 'Cricket Event Alert Banner',
          x: pos.x,
          y: pos.y,
          width: 640,
          height: 88,
          borderRadius: 18,
          borderWidth: 2,
          eventAlertConfig: {
            eventType: 'FOUR',
            themeStyle: 'NEON',
            bannerTitle: 'BOUNDARY FOUR!',
            bannerSubtitle: 'Cracked through extra cover',
            showPlayerPhoto: true,
            showStatsPill: true,
            animationPreset: 'POP',
            autoDismissSeconds: 4,
          },
        }),
      },
      {
        id: 'cricket-wicket-broadcast-alert',
        name: 'Cricket Wicket Alert Presentation',
        category: 'EVENT_ALERTS',
        description: 'High-impact wicket alert showing dismissal mode, batsman photo, score, and bowler.',
        tokens: ['{{DISMISSED_BATSMAN_NAME}}', '{{DISMISSAL_MODE}}', '{{BOWLER_NAME}}'],
        sampleText: 'WICKET! • CAUGHT • Virat Kohli 76 (42) b Bumrah',
        defaultWidth: 680,
        defaultHeight: 96,
        icon: '🔥',
        createElement: (pos) => ({
          type: 'CRICKET_WICKET_ALERT',
          name: 'Cricket Wicket Presentation Alert',
          x: pos.x,
          y: pos.y,
          width: 680,
          height: 96,
          borderRadius: 20,
          borderWidth: 2,
          eventAlertConfig: {
            eventType: 'WICKET',
            themeStyle: 'FIRE_STORM',
            bannerTitle: 'WICKET OUT!',
            showPlayerPhoto: true,
            showDismissalDetails: true,
            autoDismissSeconds: 5,
          },
        }),
      },
      {
        id: 'cricket-boundary-broadcast-alert',
        name: 'Boundary (4 / 6) Celebration Banner',
        category: 'EVENT_ALERTS',
        description: 'Animated 4 or 6 boundary flash card with striker photo and live score summary.',
        tokens: ['{{BALL_RESULT}}', '{{STRIKER_NAME}}', '{{STRIKER_SCORE}}'],
        sampleText: 'MAXIMUM 6! • Virat Kohli 54* (28)',
        defaultWidth: 620,
        defaultHeight: 90,
        icon: '💥',
        createElement: (pos) => ({
          type: 'CRICKET_BOUNDARY_ALERT',
          name: 'Boundary 4/6 Celebration Banner',
          x: pos.x,
          y: pos.y,
          width: 620,
          height: 90,
          borderRadius: 20,
          borderWidth: 2,
          eventAlertConfig: {
            eventType: 'SIX',
            themeStyle: 'NEON',
            showPlayerPhoto: true,
            autoDismissSeconds: 4,
          },
        }),
      },
      {
        id: 'cricket-milestone-broadcast-card',
        name: 'Milestone Celebration Card (50 / 100)',
        category: 'EVENT_ALERTS',
        description: 'Golden milestone banner celebrating 50 or 100 runs, 3W/5W haul, or 50 partnership.',
        tokens: ['{{MILESTONE_TITLE}}', '{{STRIKER_NAME}}', '{{MILESTONE_BALLS}}', '{{MILESTONE_SR}}'],
        sampleText: 'HALF CENTURY • Virat Kohli 50 (28 balls, 7x4, 2x6)',
        defaultWidth: 720,
        defaultHeight: 100,
        icon: '👑',
        createElement: (pos) => ({
          type: 'CRICKET_MILESTONE_ALERT',
          name: 'Milestone Celebration Card',
          x: pos.x,
          y: pos.y,
          width: 720,
          height: 100,
          borderRadius: 20,
          borderWidth: 2,
          eventAlertConfig: {
            eventType: 'BATSMAN_50',
            themeStyle: 'PREMIUM_GOLD',
            showPlayerPhoto: true,
            autoDismissSeconds: 6,
          },
        }),
      },
      {
        id: 'cricket-over-complete-summary-bar',
        name: 'Over Complete Presentation Bar',
        category: 'EVENT_ALERTS',
        description: 'End-of-over graphic showing all deliveries in the over and bowler figures.',
        tokens: ['{{OVER_NUMBER}}', '{{BOWLER_NAME}}', '{{RECENT_BALLS}}', '{{OVER_TOTAL_RUNS}}'],
        sampleText: 'END OF OVER 18 • J. Bumrah (3.0-0-18-1) • 12 Runs in Over',
        defaultWidth: 700,
        defaultHeight: 68,
        icon: '🎯',
        createElement: (pos) => ({
          type: 'CRICKET_OVER_COMPLETE',
          name: 'Over Complete Summary Bar',
          x: pos.x,
          y: pos.y,
          width: 700,
          height: 68,
          borderRadius: 16,
          borderWidth: 2,
          eventAlertConfig: {
            eventType: 'OVER_COMPLETE',
            autoDismissSeconds: 5,
          },
        }),
      },
      {
        id: 'cricket-innings-break-presentation',
        name: 'Innings Break Full Presentation Card',
        category: 'EVENT_ALERTS',
        description: 'Innings break board with 1st innings score, target equation, and top performers.',
        tokens: ['{{SCORE}}', '{{TARGET_RUNS}}', '{{TARGET_RRR}}', '{{TOP_BATSMAN}}', '{{TOP_BOWLER}}'],
        sampleText: 'INNINGS BREAK • 184/4 (20.0 ov) • Target: 185 • Top Bat: V. Kohli 76*',
        defaultWidth: 780,
        defaultHeight: 140,
        icon: '☕',
        createElement: (pos) => ({
          type: 'CRICKET_INNINGS_BREAK',
          name: 'Innings Break Full Board',
          x: pos.x,
          y: pos.y,
          width: 780,
          height: 140,
          borderRadius: 20,
          borderWidth: 2,
          eventAlertConfig: {
            eventType: 'INNINGS_BREAK',
            autoDismissSeconds: 10,
          },
        }),
      },
      {
        id: 'cricket-match-result-presentation',
        name: 'Match Result & POTM Victory Banner',
        category: 'EVENT_ALERTS',
        description: 'Championship victory announcement card with Player of the Match showcase.',
        tokens: ['{{RESULT_TEXT}}', '{{POTM_NAME}}', '{{POTM_PHOTO}}'],
        sampleText: 'MATCH RESULT: Royal Challengers won by 24 runs • POTM: Virat Kohli',
        defaultWidth: 800,
        defaultHeight: 96,
        icon: '🏆',
        createElement: (pos) => ({
          type: 'CRICKET_MATCH_RESULT',
          name: 'Match Result & POTM Banner',
          x: pos.x,
          y: pos.y,
          width: 800,
          height: 96,
          borderRadius: 20,
          borderWidth: 2,
          eventAlertConfig: {
            eventType: 'MATCH_RESULT',
            themeStyle: 'PREMIUM_GOLD',
            autoDismissSeconds: 8,
          },
        }),
      },
    ],
    []
  );

  // Filtered Cricket items
  const filteredCricketItems = useMemo(() => {
    return cricketBroadcastLibrary.filter((item) => {
      const matchCategory = selectedCricketCategory === 'ALL' || item.category === selectedCricketCategory;
      const matchSearch =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tokens.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCategory && matchSearch;
    });
  }, [cricketBroadcastLibrary, selectedCricketCategory, searchQuery]);

  // Categories list for General Catalog
  const categories = useMemo(() => {
    const cats = new Set<string>();
    DYNAMIC_FIELDS.forEach((f) => {
      if (f.category) cats.add(f.category);
    });
    return ['ALL', ...Array.from(cats.values())];
  }, []);

  // Filtered fields
  const filteredFields = useMemo(() => {
    return DYNAMIC_FIELDS.filter((f) => {
      const matchTab = activeTab === 'images' ? f.isImage : activeTab === 'catalog' ? !f.isImage : true;
      const matchSport =
        selectedSport === 'ALL' ||
        f.sports.includes('ALL') ||
        f.sports.includes(selectedSport as SportType);
      const matchCat = selectedCategory === 'ALL' || f.category === selectedCategory;
      const matchSearch =
        !searchQuery.trim() ||
        f.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.description.toLowerCase().includes(searchQuery.toLowerCase());

      return matchTab && matchSport && matchCat && matchSearch;
    });
  }, [activeTab, selectedSport, selectedCategory, searchQuery]);

  // 1-Click Insert Cricket Broadcast Item Handler
  const handleInsertCricketItem = (item: CricketBroadcastItem) => {
    const coords = getCoordinatesForPlacement(selectedPlacement, item.defaultWidth, item.defaultHeight);
    const newEl = item.createElement(coords);
    onInsertElement(newEl);
    onClose();
  };

  // 1-Click Insert Single Field Handler
  const handleInsertSingleField = (field: DynamicFieldDefinition) => {
    const isImg = field.isImage || field.key.includes('LOGO') || field.key.includes('PHOTO') || field.key.includes('IMAGE');
    const width = isImg ? 120 : 340;
    const height = isImg ? 120 : 70;
    const coords = getCoordinatesForPlacement(selectedPlacement, width, height);

    const newElement: Partial<GraphicElement> = {
      name: `LIVE • ${field.label}`,
      type: isImg ? 'IMAGE' : 'LIVE_DATA',
      x: coords.x,
      y: coords.y,
      width: coords.width,
      height: coords.height,
      visible: true,
      locked: false,
      opacity: 1,
      zIndex: 10,
      liveDataField: field.key,
      dynamicFieldKey: field.key,
      liveDataFallback: isImg ? field.sampleValue : field.sampleValue,
      liveDataPrefix: '',
      liveDataSuffix: '',
      liveDataTransform: 'none',
      ...(isImg
        ? {
            imageUrl: field.sampleValue,
            imageFit: 'contain',
            borderRadius: 12,
          }
        : {
            text: field.key,
            fontSize: 32,
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 'bold',
            textColor: '#ffffff',
            textAlign: 'center',
            textAlignVertical: 'middle',
            textShadow: {
              enabled: true,
              color: 'rgba(0, 0, 0, 0.85)',
              blur: 6,
              x: 0,
              y: 2,
            },
          }),
    };

    onInsertElement(newElement);
    onClose();
  };

  // Custom Formula Insert Handler
  const handleInsertFormula = () => {
    const coords = getCoordinatesForPlacement(selectedPlacement, 460, 90);
    const newElement: Partial<GraphicElement> = {
      name: `LIVE • Custom Formula`,
      type: 'LIVE_DATA',
      x: coords.x,
      y: coords.y,
      width: coords.width,
      height: coords.height,
      visible: true,
      locked: false,
      opacity: 1,
      zIndex: 10,
      liveDataField: customFormula,
      dynamicFieldKey: customFormula,
      liveDataFallback: formulaFallback || customFormula,
      liveDataPrefix: formulaPrefix,
      liveDataSuffix: formulaSuffix,
      liveDataTransform: formulaTransform,
      text: customFormula,
      fontSize: formulaFontSize,
      fontFamily: 'Montserrat, sans-serif',
      fontWeight: 'bold',
      textColor: formulaColor,
      textAlign: 'center',
      textAlignVertical: 'middle',
      textShadow: {
        enabled: true,
        color: 'rgba(0, 0, 0, 0.85)',
        blur: 6,
        x: 0,
        y: 2,
      },
    };

    (newElement as any).liveDataFormatter = formulaFormatter;

    onInsertElement(newElement);
    onClose();
  };

  // Formula Templates Presets
  const formulaPresets = [
    { label: 'Cricket Score + Overs', formula: '{{SCORE}} ({{OVERS}} ov)', fallback: '184/4 (18.3 ov)' },
    { label: 'Striker Scoreline (Full)', formula: '{{STRIKER_SHORT_NAME}} {{STRIKER_SCORE}} ({{STRIKER_BALLS}}b • {{STRIKER_4S}}x4 {{STRIKER_6S}}x6 • SR: {{STRIKER_SR}})', fallback: 'V. Kohli 76* (42b • 8x4 4x6 • SR: 180.95)' },
    { label: 'Non-Striker Scoreline', formula: '{{NON_STRIKER_SHORT_NAME}} {{NON_STRIKER_SCORE}} ({{NON_STRIKER_BALLS}}b)', fallback: 'K. Rahul 34* (21b)' },
    { label: 'Bowler Figures & Economy', formula: '{{BOWLER_SHORT_NAME}} {{BOWLER_WICKETS}}/{{BOWLER_RUNS}} ({{BOWLER_OVERS}} ov) • Econ: {{BOWLER_ECONOMY}}', fallback: 'J. Bumrah 2/28 (3.3 ov) • Econ: 8.00' },
    { label: 'Ball Event Banner', formula: '{{LAST_BALL_OVER_BALL}}: {{CURRENT_BALL_EVENT}}', fallback: 'Over 18.3: 4 (BOUNDARY)' },
    { label: 'Partnership Banner', formula: 'Partnership: {{PARTNERSHIP_RUNS}} runs ({{PARTNERSHIP_BALLS}} balls)', fallback: 'Partnership: 88 runs (49 balls)' },
    { label: 'Cricket Run Rates', formula: 'CRR: {{CRR}} • RRR: {{RRR}}', fallback: 'CRR: 9.94 • RRR: 11.45' },
    { label: 'Cricket Chase Equation', formula: 'Need {{RUNS_NEEDED}} runs from {{BALLS_REMAINING}} balls', fallback: 'Need 27 runs from 15 balls' },
    { label: 'Recent Deliveries', formula: 'This Over: {{RECENT_BALLS}}', fallback: 'This Over: 1 • 4 • 6 • W • 2 • 1' },
    { label: 'Football Match Line', formula: '{{TEAM_A_SHORT}} {{TEAM_A_GOALS}} - {{TEAM_B_GOALS}} {{TEAM_B_SHORT}} • {{MATCH_CLOCK}}', fallback: 'MCI 2 - 1 ARS • 78:24' },
    { label: 'Basketball Score & Clock', formula: '{{TEAM_A_SHORT}} {{TEAM_A_POINTS}} - {{TEAM_B_POINTS}} {{TEAM_B_SHORT}} ({{QUARTER}} {{GAME_CLOCK}})', fallback: 'LAL 86 - 82 GSW (Q3 04:18)' },
    { label: 'Kabaddi Raid Alert', formula: '{{RAIDER_NAME}} • {{RAID_POINTS}} ({{ACTIVE_DEFENDERS}} Def)', fallback: 'P. Narwal • +3 Super Raid (5 Defenders)' },
  ];

  // Live Formula Preview Computation
  const previewResolvedFormula = useMemo(() => {
    let text = customFormula;
    const mergedVars = { ...activeVariables };
    DYNAMIC_FIELDS.forEach((f) => {
      if (!mergedVars[f.key]) mergedVars[f.key] = f.sampleValue;
    });

    Object.entries(mergedVars).forEach(([k, v]) => {
      if (text.includes(k)) {
        text = text.replaceAll(k, String(v));
      }
    });
    text = substituteDynamicFields(text, mergedVars);

    return formatLiveFieldValue(
      text,
      formulaFormatter,
      formulaPrefix,
      formulaSuffix,
      formulaTransform
    );
  }, [customFormula, activeVariables, formulaFormatter, formulaPrefix, formulaSuffix, formulaTransform]);

  if (!isOpen) return null;

  const cricketCategories: { key: CricketCategory; label: string }[] = [
    { key: 'ALL', label: 'All Elements' },
    { key: 'EVENT_ALERTS', label: '⚡ Live Event Alerts' },
    { key: 'MATCH', label: 'Match & Targets' },
    { key: 'TEAM', label: 'Teams & Logos' },
    { key: 'SCORE', label: 'Score & Overs' },
    { key: 'BATSMAN', label: 'Batsman / Striker' },
    { key: 'BOWLER', label: 'Bowler Figures' },
    { key: 'OVER', label: 'Over Summary' },
    { key: 'BALL', label: 'Ball Delivery' },
    { key: 'PARTNERSHIP', label: 'Partnership' },
    { key: 'WICKET', label: 'Wicket Alert' },
    { key: 'RECENT_BALLS', label: 'Recent Deliveries' },
    { key: 'MILESTONE', label: 'Milestones (50/100)' },
    { key: 'RESULT', label: 'Result & Awards' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-6xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 text-slate-950 rounded-xl shadow-lg shadow-emerald-500/20 font-black">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-wide">
                  INSERT LIVE MATCH DATA & BROADCAST ELEMENTS
                </h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  1920×1080 Broadcast
                </span>
              </div>
              <p className="text-xs text-slate-400">
                1-Click insert broadcast-grade live graphics synchronized with real-time scorer updates
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 bg-slate-900/90 text-sm">
          <div className="flex items-center gap-2 py-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('cricket_library')}
              className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition text-xs whitespace-nowrap ${
                activeTab === 'cricket_library'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Cricket Broadcast Library</span>
            </button>
            <button
              onClick={() => setActiveTab('ball_events')}
              className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition text-xs whitespace-nowrap ${
                activeTab === 'ball_events'
                  ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <CircleDot className="w-3.5 h-3.5" />
              <span>Ball Events Engine</span>
            </button>
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition text-xs whitespace-nowrap ${
                activeTab === 'catalog'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>All Tokens Catalog</span>
            </button>
            <button
              onClick={() => setActiveTab('formula')}
              className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition text-xs whitespace-nowrap ${
                activeTab === 'formula'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Formula Builder</span>
            </button>
            <button
              onClick={() => setActiveTab('images')}
              className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition text-xs whitespace-nowrap ${
                activeTab === 'images'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Dynamic Logos</span>
            </button>
          </div>

          {/* Quick Canvas Placement Selector */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 shrink-0">
            <span className="text-[11px] font-medium text-slate-400">Target Placement:</span>
            <select
              value={selectedPlacement}
              onChange={(e) => setSelectedPlacement(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
            >
              <option value="lower_center">Lower Third Center (Default)</option>
              <option value="lower_left">Lower Third Left</option>
              <option value="lower_right">Lower Third Right</option>
              <option value="top_left">Top Left (Scorebug)</option>
              <option value="top_center">Top Center (Header)</option>
              <option value="top_right">Top Right (Clock/Bug)</option>
              <option value="center">Center of Canvas</option>
            </select>
          </div>
        </div>

        {/* TAB 1: CRICKET BROADCAST LIBRARY */}
        {activeTab === 'cricket_library' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Filter Bar */}
            <div className="p-4 border-b border-slate-800/80 bg-slate-950/40 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3 items-center">
                {/* Search */}
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search Cricket broadcast elements (e.g. Scorebug, Striker, Wicket, Bowler, Chase, 50 Milestone)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
                <span className="text-[11px] font-bold text-slate-500 uppercase px-1 shrink-0">Category:</span>
                {cricketCategories.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => setSelectedCricketCategory(cat.key)}
                    className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition ${
                      selectedCricketCategory === cat.key
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Elements Grid */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCricketItems.length === 0 ? (
                <div className="col-span-full py-16 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                    <Search className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-400">
                    No Cricket broadcast elements found matching criteria.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCricketCategory('ALL');
                    }}
                    className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold hover:bg-emerald-500/30 transition"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                filteredCricketItems.map((item) => (
                  <div
                    key={item.id}
                    className="group bg-slate-950/80 border border-slate-800/80 hover:border-emerald-500/60 rounded-2xl p-4 flex flex-col justify-between gap-3 hover:bg-slate-900/60 transition shadow-xl relative overflow-hidden"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {item.category}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {item.defaultWidth} × {item.defaultHeight} px
                        </span>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition flex items-center gap-1.5">
                          <span>{item.icon}</span>
                          <span>{item.name}</span>
                        </h4>
                        <p className="text-xs text-slate-400 leading-relaxed mt-1">
                          {item.description}
                        </p>
                      </div>

                      {/* Visual Broadcast Preview Card */}
                      <div className="bg-slate-900 rounded-xl p-2.5 border border-slate-800/70 flex items-center justify-center min-h-[58px]">
                        {item.isImage ? (
                          <div className="flex items-center gap-3">
                            <img
                              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80"
                              alt="Headshot"
                              className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500 shadow"
                            />
                            <span className="text-xs font-bold text-slate-300">Live Dynamic Headshot Layer</span>
                          </div>
                        ) : (
                          <div className="w-full text-center px-2 py-1 bg-slate-950/80 rounded-lg border border-slate-800">
                            <span className="text-xs font-mono font-bold text-emerald-400 break-words">
                              {item.sampleText}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Tokens List */}
                      <div className="flex flex-wrap gap-1">
                        {item.tokens.map((token) => (
                          <span
                            key={token}
                            className="font-mono text-[9px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800"
                          >
                            {token}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleInsertCricketItem(item)}
                      className="mt-2 w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/50"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Insert on Canvas</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CRICKET BALL EVENTS ENGINE */}
        {activeTab === 'ball_events' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <div className="bg-gradient-to-r from-rose-950/40 via-slate-950 to-amber-950/40 border border-rose-500/30 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CircleDot className="w-5 h-5 text-rose-400 animate-pulse" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Cricket Ball Event Graphics Engine
                  </h3>
                  <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-full">
                    SSE Real-Time Synced
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                  Dynamic ball outcome layers that react instantly as the scorer records each delivery (Dots, 1s, 2s, 3s, 4s, 6s, Wickets, Wides, No-Balls).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Preset 1: Full Broadcast Badge */}
              <div className="bg-slate-950/80 border border-slate-800 hover:border-emerald-500/60 rounded-2xl p-4 flex flex-col justify-between transition group shadow-lg">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Broadcast Badge
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">340 × 90 px</span>
                  </div>

                  <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition">
                    Full Ball Event Badge
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Broadcast-grade score badge with delivery orb, over number, outcome label, and current striker info.
                  </p>

                  <div className="h-16 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-center p-2">
                    <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 px-3 py-2 rounded-xl border border-emerald-500/40 shadow-inner">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-sm shadow">
                        4
                      </div>
                      <div>
                        <div className="text-[9px] font-mono text-emerald-400 font-bold">OVER 18.3</div>
                        <div className="text-[11px] font-black text-white tracking-wide">FOUR • BOUNDARY</div>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const pos = getCoordinatesForPlacement(selectedPlacement, 340, 90);
                    onInsertElement({
                      type: 'CRICKET_BALL_EVENT',
                      name: 'Ball Event • Broadcast Badge',
                      x: pos.x,
                      y: pos.y,
                      width: 340,
                      height: 90,
                      fillColor: '#059669',
                      borderColor: '#10b981',
                      borderWidth: 2,
                      borderRadius: 16,
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
                      },
                    });
                    onClose();
                  }}
                  className="mt-4 w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Insert Broadcast Badge</span>
                </button>
              </div>

              {/* Preset 2: Recent Deliveries Strip */}
              <div className="bg-slate-950/80 border border-slate-800 hover:border-cyan-500/60 rounded-2xl p-4 flex flex-col justify-between transition group shadow-lg">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                      Over Summary
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">380 × 60 px</span>
                  </div>

                  <h4 className="text-sm font-bold text-white group-hover:text-cyan-400 transition">
                    Recent Balls Strip (6 Deliveries)
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Live strip showing the sequence of balls in the current over with color-coded circular badges.
                  </p>

                  <div className="h-16 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-center p-2">
                    <div className="flex items-center gap-1.5 bg-slate-950/80 px-2 py-1.5 rounded-xl border border-slate-700/60">
                      <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 text-[10px] font-black flex items-center justify-center border border-slate-700">1</span>
                      <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center shadow">4</span>
                      <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-[10px] font-black flex items-center justify-center shadow">6</span>
                      <span className="w-6 h-6 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center shadow">W</span>
                      <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 text-[10px] font-black flex items-center justify-center border border-slate-700">0</span>
                      <span className="w-6 h-6 rounded-full bg-amber-600 text-white text-[10px] font-black flex items-center justify-center shadow">2</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const pos = getCoordinatesForPlacement(selectedPlacement, 380, 60);
                    onInsertElement({
                      type: 'CRICKET_BALL_EVENT',
                      name: 'Recent Deliveries Strip',
                      x: pos.x,
                      y: pos.y,
                      width: 380,
                      height: 60,
                      fillColor: '#0f172a',
                      borderColor: '#38bdf8',
                      borderWidth: 1.5,
                      borderRadius: 14,
                      ballEventConfig: {
                        displayMode: 'RECENT_STRIP',
                        colorPreset: 'DYNAMIC_COLOR',
                        animationPreset: 'SLIDE_UP',
                        recentBallsCount: 6,
                        badgeShape: 'CIRCLE',
                      },
                    });
                    onClose();
                  }}
                  className="mt-4 w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Insert Recent Balls Strip</span>
                </button>
              </div>

              {/* Preset 3: Circular Letter Orb */}
              <div className="bg-slate-950/80 border border-slate-800 hover:border-purple-500/60 rounded-2xl p-4 flex flex-col justify-between transition group shadow-lg">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                      Letter Orb
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">90 × 90 px</span>
                  </div>

                  <h4 className="text-sm font-bold text-white group-hover:text-purple-400 transition">
                    Circular Delivery Orb
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Stand-alone high-visibility circular badge displaying the active ball event token with bold neon glow.
                  </p>

                  <div className="h-16 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-center p-2">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 text-white font-black text-xl flex items-center justify-center shadow-lg shadow-purple-500/30 border border-purple-400">
                      6
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const pos = getCoordinatesForPlacement(selectedPlacement, 90, 90);
                    onInsertElement({
                      type: 'CRICKET_BALL_EVENT',
                      name: 'Ball Event • Letter Orb',
                      x: pos.x,
                      y: pos.y,
                      width: 90,
                      height: 90,
                      fillColor: '#7e22ce',
                      borderColor: '#c084fc',
                      borderWidth: 2,
                      borderRadius: 9999,
                      ballEventConfig: {
                        displayMode: 'LETTER',
                        colorPreset: 'DYNAMIC_COLOR',
                        animationPreset: 'POP',
                        sampleEvent: '6',
                        badgeShape: 'CIRCLE',
                      },
                    });
                    onClose();
                  }}
                  className="mt-4 w-full py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Insert Circular Orb</span>
                </button>
              </div>

              {/* Preset 4: Compact Pill */}
              <div className="bg-slate-950/80 border border-slate-800 hover:border-amber-500/60 rounded-2xl p-4 flex flex-col justify-between transition group shadow-lg">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      Compact Pill
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">260 × 54 px</span>
                  </div>

                  <h4 className="text-sm font-bold text-white group-hover:text-amber-400 transition">
                    Scorebug Ball Pill
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Sleek horizontal pill badge ideal for placing in the lower scorebug alongside current over count.
                  </p>

                  <div className="h-16 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-center p-2">
                    <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-full border border-amber-500/40">
                      <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
                        Wd
                      </span>
                      <span className="text-xs font-bold text-slate-200">WIDE +1 RUN</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const pos = getCoordinatesForPlacement(selectedPlacement, 260, 54);
                    onInsertElement({
                      type: 'CRICKET_BALL_EVENT',
                      name: 'Ball Event • Compact Pill',
                      x: pos.x,
                      y: pos.y,
                      width: 260,
                      height: 54,
                      fillColor: '#0f172a',
                      borderColor: '#f59e0b',
                      borderWidth: 2,
                      borderRadius: 9999,
                      ballEventConfig: {
                        displayMode: 'COMPACT',
                        colorPreset: 'DYNAMIC_COLOR',
                        animationPreset: 'FADE',
                        sampleEvent: 'WD',
                        badgeShape: 'PILL',
                      },
                    });
                    onClose();
                  }}
                  className="mt-4 w-full py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Insert Compact Pill</span>
                </button>
              </div>

              {/* Preset 5: Wicket / Boundary Alert Banner */}
              <div className="bg-slate-950/80 border border-slate-800 hover:border-rose-500/60 rounded-2xl p-4 flex flex-col justify-between transition group shadow-lg">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                      Big Text Banner
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">460 × 80 px</span>
                  </div>

                  <h4 className="text-sm font-bold text-white group-hover:text-rose-400 transition">
                    Wicket / Boundary Alert
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Bold typography banner with glowing backplate that highlights big events (Wickets, 4s, 6s) with full dismissal info.
                  </p>

                  <div className="h-16 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-center p-2">
                    <div className="flex items-center gap-3 bg-gradient-to-r from-rose-950 to-slate-950 px-4 py-2 rounded-xl border border-rose-500/40">
                      <Flame className="w-5 h-5 text-rose-400 animate-bounce" />
                      <div>
                        <div className="text-[9px] font-mono text-rose-400 font-bold">WICKET • CAUGHT</div>
                        <div className="text-xs font-black text-white">V. Kohli c Rahul b Bumrah</div>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const pos = getCoordinatesForPlacement(selectedPlacement, 460, 80);
                    onInsertElement({
                      type: 'CRICKET_BALL_EVENT',
                      name: 'Ball Event • Alert Banner',
                      x: pos.x,
                      y: pos.y,
                      width: 460,
                      height: 80,
                      fillColor: '#991b1b',
                      borderColor: '#f43f5e',
                      borderWidth: 2,
                      borderRadius: 16,
                      ballEventConfig: {
                        displayMode: 'TEXT',
                        colorPreset: 'DYNAMIC_COLOR',
                        animationPreset: 'BOUNCE',
                        sampleEvent: 'W',
                        sampleDismissal: 'CAUGHT',
                        showDismissal: true,
                        showStriker: true,
                        showBowler: true,
                        badgeShape: 'ROUNDED',
                      },
                    });
                    onClose();
                  }}
                  className="mt-4 w-full py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Insert Alert Banner</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: VARIABLE CATALOG & ASSETS */}
        {(activeTab === 'catalog' || activeTab === 'images') && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Filters Bar */}
            <div className="p-4 border-b border-slate-800/80 bg-slate-950/40 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3 items-center">
                {/* Search */}
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Filter live variables (e.g. {{SCORE}}, {{BATSMAN_RUNS}}, {{MATCH_CLOCK}})..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Sport Selector Filter */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                  {(['ALL', 'CRICKET', 'FOOTBALL', 'HOCKEY', 'KABADDI', 'VOLLEYBALL', 'BASKETBALL', 'TENNIS', 'BADMINTON', 'TABLE_TENNIS'] as (SportType | 'ALL')[]).map(
                    (s) => (
                      <button
                        key={s}
                        onClick={() => setSelectedSport(s)}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition ${
                          selectedSport === s
                            ? 'bg-emerald-500 text-slate-950 shadow-sm'
                            : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                        }`}
                      >
                        {s}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
                <span className="text-[11px] font-bold text-slate-500 uppercase px-1">Category:</span>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition ${
                      selectedCategory === cat
                        ? 'bg-slate-700 text-white font-bold'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid of Dynamic Fields */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredFields.length === 0 ? (
                <div className="col-span-full py-16 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                    <Search className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-400">
                    No live data variables found matching criteria.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedSport('ALL');
                      setSelectedCategory('ALL');
                    }}
                    className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold hover:bg-emerald-500/30 transition"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                filteredFields.map((field) => (
                  <div
                    key={field.key}
                    onClick={() => handleInsertSingleField(field)}
                    className="group bg-slate-950/70 border border-slate-800/80 hover:border-emerald-500/60 rounded-xl p-3.5 flex flex-col justify-between gap-3 hover:bg-slate-800/50 cursor-pointer transition shadow-lg relative overflow-hidden"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60 break-all">
                          {field.key}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded font-medium shrink-0">
                          {field.category}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition">
                          {field.label}
                        </h4>
                        <p className="text-[11px] text-slate-400 leading-snug line-clamp-2 mt-0.5">
                          {field.description}
                        </p>
                      </div>

                      {/* Sample / Live Preview */}
                      <div className="bg-slate-900/90 rounded-lg p-2 border border-slate-800/50 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-slate-500 font-semibold uppercase">
                          Simulated Live:
                        </span>
                        {field.isImage ? (
                          <div className="flex items-center gap-2">
                            <img
                              src={field.sampleValue}
                              alt={field.label}
                              referrerPolicy="no-referrer"
                              className="w-6 h-6 rounded object-cover border border-slate-700"
                            />
                            <span className="text-[10px] text-emerald-400 font-bold">Image URL</span>
                          </div>
                        ) : (
                          <span className="text-xs font-mono font-bold text-amber-400 truncate">
                            {field.sampleValue}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Click to place on canvas</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition">
                        <Plus className="w-3.5 h-3.5" />
                        <span>Insert</span>
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: COMPOSITE FORMULA BUILDER */}
        {activeTab === 'formula' && (
          <div className="flex-1 flex flex-col lg:flex-row min-h-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
            {/* Left Column: Preset Templates & Token Insertions */}
            <div className="w-full lg:w-1/2 p-5 overflow-y-auto space-y-5">
              <div>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Popular Composite Presets
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {formulaPresets.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setCustomFormula(preset.formula);
                        setFormulaFallback(preset.fallback);
                      }}
                      className={`p-2.5 text-left rounded-xl border text-xs transition ${
                        customFormula === preset.formula
                          ? 'bg-emerald-500/10 border-emerald-500 text-white font-bold'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40'
                      }`}
                    >
                      <p className="font-semibold text-white truncate">{preset.label}</p>
                      <p className="font-mono text-[10px] text-emerald-400 mt-1 truncate">
                        {preset.formula}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Token Selector */}
              <div>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Click to Append Token into Formula:
                </h3>
                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-1 bg-slate-950/60 border border-slate-800 rounded-xl">
                  {DYNAMIC_FIELDS.filter((f) => !f.isImage).map((field) => (
                    <button
                      key={field.key}
                      type="button"
                      onClick={() => setCustomFormula((prev) => `${prev} ${field.key}`)}
                      className="px-2 py-1 rounded bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-300 font-mono text-[11px] transition flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3 text-emerald-400" />
                      <span>{field.key}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Formatting Controls */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Value Formatter
                  </label>
                  <select
                    value={formulaFormatter}
                    onChange={(e) => setFormulaFormatter(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="none">Raw Text / No Format</option>
                    <option value="integer">Integer (Rounded)</option>
                    <option value="decimal_1">1 Decimal (0.0)</option>
                    <option value="decimal_2">2 Decimals (0.00)</option>
                    <option value="overs_format">Overs Notation (18.2 ov)</option>
                    <option value="strike_rate">Strike Rate (150.0)</option>
                    <option value="percentage">Percentage (54.2%)</option>
                    <option value="currency">Currency ($1,500)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Case Transform
                  </label>
                  <select
                    value={formulaTransform}
                    onChange={(e) => setFormulaTransform(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="none">Default</option>
                    <option value="uppercase">UPPERCASE</option>
                    <option value="lowercase">lowercase</option>
                    <option value="capitalize">Capitalize Words</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Right Column: Custom Expression Input & Live Preview */}
            <div className="w-full lg:w-1/2 p-5 flex flex-col justify-between space-y-4 bg-slate-950/40">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">
                    Custom Template Expression:
                  </label>
                  <textarea
                    rows={3}
                    value={customFormula}
                    onChange={(e) => setCustomFormula(e.target.value)}
                    placeholder="e.g. {{SCORE}} ({{OVERS}} ov) • CRR: {{CRR}}"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl p-3 font-mono text-sm text-emerald-300 placeholder-slate-600 focus:outline-none shadow-inner"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Static Prefix
                    </label>
                    <input
                      type="text"
                      value={formulaPrefix}
                      onChange={(e) => setFormulaPrefix(e.target.value)}
                      placeholder="e.g. LIVE: "
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Static Suffix
                    </label>
                    <input
                      type="text"
                      value={formulaSuffix}
                      onChange={(e) => setFormulaSuffix(e.target.value)}
                      placeholder="e.g. (Final)"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Offline / Pre-Match Fallback Text
                  </label>
                  <input
                    type="text"
                    value={formulaFallback}
                    onChange={(e) => setFormulaFallback(e.target.value)}
                    placeholder="e.g. MATCH ABOUT TO BEGIN"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Live Real-time Simulation Preview */}
                <div>
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1.5">
                    <Eye className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Real-time Studio Preview:</span>
                  </label>
                  <div className="bg-slate-900 border border-emerald-500/40 rounded-xl p-5 text-center shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />
                    <div
                      style={{
                        fontSize: `${formulaFontSize}px`,
                        color: formulaColor,
                        fontFamily: 'Montserrat, sans-serif',
                        fontWeight: 'bold',
                        textShadow: '0px 2px 8px rgba(0,0,0,0.85)',
                      }}
                      className="break-words"
                    >
                      {previewResolvedFormula || '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleInsertFormula}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition"
                >
                  <Sparkles className="w-4 h-4 fill-current" />
                  <span>Insert Formula Element</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
