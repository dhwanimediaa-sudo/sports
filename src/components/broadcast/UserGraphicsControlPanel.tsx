import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  OnAirState,
  OnAirGraphicItem,
  StudioGraphic,
  GraphicScene,
  GraphicAssignment,
  BroadcastConfig,
  Match,
  SportType,
} from '../../types';
import { api } from '../../services/api';
import { BroadcastGraphicPreviewModal, GraphicControlItem } from './BroadcastGraphicPreviewModal';
import {
  Play,
  Square,
  Eye,
  EyeOff,
  Layers,
  Sparkles,
  Clock,
  Search,
  CheckCircle2,
  Tv,
  AlertCircle,
  Radio,
  Sliders,
  Flame,
  Shield,
  Award,
  Zap,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  AlertTriangle,
  Check,
  CheckSquare,
  SquareDashed,
  Filter,
} from 'lucide-react';

interface UserGraphicsControlPanelProps {
  matchId: string;
  sport: SportType;
  onAirState: OnAirState | null;
  customGraphics?: StudioGraphic[];
  scenes?: GraphicScene[];
  assignments?: GraphicAssignment[];
  match?: Match | null;
  scoringState?: any;
  broadcastConfig?: BroadcastConfig | null;
  onStateChange?: (state: OnAirState) => void;
  onConfigChange?: (config: BroadcastConfig) => void;
  className?: string;
}

export const UserGraphicsControlPanel: React.FC<UserGraphicsControlPanelProps> = ({
  matchId,
  sport,
  onAirState,
  customGraphics = [],
  scenes = [],
  assignments = [],
  match,
  scoringState,
  broadcastConfig,
  onStateChange,
  onConfigChange,
  className = '',
}) => {
  // Filter & Search State
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [itemDurations, setItemDurations] = useState<Record<string, number>>({});
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Active vs Hidden Graphics State
  const [activeGraphicIds, setActiveGraphicIds] = useState<string[]>([]);
  const [hiddenGraphicIds, setHiddenGraphicIds] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Offline Preview Modal State
  const [previewItem, setPreviewItem] = useState<GraphicControlItem | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Non-blocking warning notification
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // 1. Build the Master Catalog of Available Graphics for this Sport & Universal Graphics
  const masterCatalog: GraphicControlItem[] = useMemo(() => {
    const items: GraphicControlItem[] = [
      // Built-in Core Overlays
      {
        id: 'built-in-scorebug',
        name: `${sport} Scorebug / Scoreboard`,
        category: 'MATCH_DATA',
        sport,
        description: 'Persistent live score header with team badges, overs, and match status',
        defaultDuration: 0,
        badge: 'PERSISTENT',
        targetId: 'LIVE_SCOREBUG',
        targetName: 'Live Main Scorebug',
      },
      {
        id: 'built-in-sponsor',
        name: 'Sponsor Bug & Watermark',
        category: 'MATCH_DATA',
        sport,
        description: 'Corner sponsor branding and tournament watermark bug',
        defaultDuration: 0,
        badge: 'PERSISTENT',
        isUniversal: true,
        targetId: 'SPONSOR_LOGO',
        targetName: 'Commercial Broadcast Sponsor Bug',
      },
      {
        id: 'built-in-player-lower-third',
        name: 'Player Spotlight Lower-Third',
        category: 'PLAYER',
        sport,
        description: 'Current batter/bowler/striker profile bar with live telemetry',
        defaultDuration: 6,
        badge: 'TIMED 6s',
        targetId: 'PLAYER_STATS',
        targetName: 'Player Profile & Match Figures',
      },
      {
        id: 'universal-team-lineup',
        name: 'Team Lineup & Squad Roster',
        category: 'TEAM',
        sport,
        description: 'Full team presentation board with starting squad and reserves',
        defaultDuration: 8,
        badge: 'ROSTER',
        isUniversal: true,
        targetId: 'TEAM_INTRO',
        targetName: 'Team Lineup & Playing Squad',
      },
    ];

    // Sport-specific overlays
    if (sport === 'CRICKET') {
      items.push(
        {
          id: 'cricket-four',
          name: 'FOUR Boundary Animation',
          category: 'EVENT_POPUP',
          sport: 'CRICKET',
          description: 'High-energy 4 runs celebratory broadcast overlay',
          defaultDuration: 4,
          badge: 'EVENT',
          targetId: 'CRICKET_FOUR',
          targetName: 'Four Boundary Animation',
        },
        {
          id: 'cricket-six',
          name: 'MAXIMUM SIX Celebration',
          category: 'EVENT_POPUP',
          sport: 'CRICKET',
          description: 'Explosive 6 runs broadcast animation with particles',
          defaultDuration: 4,
          badge: 'EVENT',
          targetId: 'CRICKET_SIX',
          targetName: 'Maximum Six Celebration',
        },
        {
          id: 'cricket-wicket',
          name: 'WICKET Dismissal Card',
          category: 'EVENT_POPUP',
          sport: 'CRICKET',
          description: 'Full-screen / lower-third wicket banner with dismissal mode',
          defaultDuration: 5,
          badge: 'EVENT',
          targetId: 'CRICKET_WICKET',
          targetName: 'Wicket Dismissal Card',
        },
        {
          id: 'cricket-fifty',
          name: 'Half-Century (50) Milestone',
          category: 'EVENT_POPUP',
          sport: 'CRICKET',
          description: 'Golden 50 runs achievement card for batsman',
          defaultDuration: 6,
          badge: 'MILESTONE',
          targetId: 'CRICKET_FIFTY',
          targetName: 'Half-Century Milestone',
        },
        {
          id: 'cricket-century',
          name: 'CENTURY (100) Celebration',
          category: 'EVENT_POPUP',
          sport: 'CRICKET',
          description: 'Historic 100 runs milestone card with stats',
          defaultDuration: 8,
          badge: 'MILESTONE',
          targetId: 'CRICKET_CENTURY',
          targetName: 'Century Celebration',
        },
        {
          id: 'cricket-over-summary',
          name: 'Over Summary / Ball-by-Ball',
          category: 'MATCH_DATA',
          sport: 'CRICKET',
          description: 'End of over run tally and wicket breakdown',
          defaultDuration: 6,
          badge: 'DATA',
          targetId: 'CRICKET_OVER_SUMMARY',
          targetName: 'Over Summary',
        },
        {
          id: 'cricket-partnership',
          name: 'Current Partnership Card',
          category: 'MATCH_DATA',
          sport: 'CRICKET',
          description: 'Runs and balls faced partnership breakdown',
          defaultDuration: 6,
          badge: 'DATA',
          targetId: 'CRICKET_PARTNERSHIP',
          targetName: 'Current Partnership Card',
        },
        {
          id: 'cricket-free-hit',
          name: 'FREE HIT Banner',
          category: 'EVENT_POPUP',
          sport: 'CRICKET',
          description: 'Flashing Free Hit alert following a no-ball',
          defaultDuration: 4,
          badge: 'EVENT',
          targetId: 'CRICKET_FREE_HIT',
          targetName: 'Free Hit Alert',
        },
        {
          id: 'cricket-innings-break',
          name: 'Innings Break / Target Card',
          category: 'MATCH_DATA',
          sport: 'CRICKET',
          description: 'Target to win and required run rate overview',
          defaultDuration: 0,
          badge: 'PERSISTENT',
          targetId: 'PERIOD_BREAK',
          targetName: 'Innings Break',
        },
        {
          id: 'cricket-match-result',
          name: 'Final Match Result Card',
          category: 'MATCH_DATA',
          sport: 'CRICKET',
          description: 'Official victory statement and Player of the Match banner',
          defaultDuration: 0,
          badge: 'PERSISTENT',
          targetId: 'MATCH_RESULT',
          targetName: 'Final Match Result',
        }
      );
    } else if (sport === 'FOOTBALL') {
      items.push(
        {
          id: 'football-goal',
          name: 'GOAL Celebratory Overlay',
          category: 'EVENT_POPUP',
          sport: 'FOOTBALL',
          description: 'Dynamic Goal animation with scorer and assist details',
          defaultDuration: 6,
          badge: 'EVENT',
          targetId: 'FOOTBALL_GOAL',
          targetName: 'Goal Celebration',
        },
        {
          id: 'football-yellow-card',
          name: 'Yellow Card Caution',
          category: 'EVENT_POPUP',
          sport: 'FOOTBALL',
          description: 'Official referee caution card for player',
          defaultDuration: 4,
          badge: 'EVENT',
          targetId: 'FOOTBALL_YELLOW_CARD',
          targetName: 'Yellow Card',
        },
        {
          id: 'football-red-card',
          name: 'RED CARD Dismissal',
          category: 'EVENT_POPUP',
          sport: 'FOOTBALL',
          description: 'High-contrast red card sending-off graphic',
          defaultDuration: 5,
          badge: 'EVENT',
          targetId: 'FOOTBALL_RED_CARD',
          targetName: 'Red Card Dismissal',
        },
        {
          id: 'football-penalty',
          name: 'PENALTY KICK Lower Third',
          category: 'EVENT_POPUP',
          sport: 'FOOTBALL',
          description: 'High stakes penalty box spotlight',
          defaultDuration: 5,
          badge: 'EVENT',
          targetId: 'FOOTBALL_PENALTY',
          targetName: 'Penalty Kick',
        },
        {
          id: 'football-substitution',
          name: 'Player Substitution Banner',
          category: 'PLAYER',
          sport: 'FOOTBALL',
          description: 'Player IN / OUT tactical change overlay',
          defaultDuration: 6,
          badge: 'EVENT',
          targetId: 'FOOTBALL_SUBSTITUTION',
          targetName: 'Substitution',
        }
      );
    } else if (sport === 'KABADDI') {
      items.push(
        {
          id: 'kabaddi-super-raid',
          name: 'SUPER RAID (3+ Points)',
          category: 'EVENT_POPUP',
          sport: 'KABADDI',
          description: 'Super raid celebration banner with multi-point tally',
          defaultDuration: 5,
          badge: 'EVENT',
          targetId: 'KABADDI_SUPER_RAID',
          targetName: 'Super Raid',
        },
        {
          id: 'kabaddi-super-tackle',
          name: 'SUPER TACKLE (+2 Points)',
          category: 'EVENT_POPUP',
          sport: 'KABADDI',
          description: 'Defensive super tackle highlight card',
          defaultDuration: 5,
          badge: 'EVENT',
          targetId: 'KABADDI_SUPER_TACKLE',
          targetName: 'Super Tackle',
        },
        {
          id: 'kabaddi-all-out',
          name: 'ALL OUT (+2 Points)',
          category: 'EVENT_POPUP',
          sport: 'KABADDI',
          description: 'Opposition All-Out milestone overlay',
          defaultDuration: 6,
          badge: 'EVENT',
          targetId: 'KABADDI_ALL_OUT',
          targetName: 'All Out',
        }
      );
    } else {
      // Universal Sports (Volleyball, Basketball, Tennis, Badminton, Table Tennis, Hockey, etc.)
      items.push(
        {
          id: 'generic-point',
          name: 'POINT / SCORE Overlay',
          category: 'EVENT_POPUP',
          sport,
          description: 'Rally/point won celebration graphic',
          defaultDuration: 3,
          badge: 'EVENT',
          targetId: 'POINT_SCORED',
          targetName: 'Point Scored',
        },
        {
          id: 'generic-match-point',
          name: 'MATCH POINT Alert',
          category: 'EVENT_POPUP',
          sport,
          description: 'Decisive match point celebration banner',
          defaultDuration: 5,
          badge: 'EVENT',
          targetId: 'MATCH_POINT',
          targetName: 'Match Point',
        },
        {
          id: 'generic-timeout',
          name: 'TACTICAL TIMEOUT Banner',
          category: 'EVENT_POPUP',
          sport,
          description: 'Team timeout broadcast countdown banner',
          defaultDuration: 6,
          badge: 'EVENT',
          targetId: 'TIMEOUT',
          targetName: 'Timeout Alert',
        }
      );
    }

    // Add Custom Studio Graphics (filter by current sport or universal/CUSTOM)
    customGraphics.forEach((g) => {
      const isCompatible = !g.sport || g.sport === sport || g.sport === 'CUSTOM';
      if (isCompatible) {
        items.push({
          id: g.id,
          name: g.name,
          category: 'CUSTOM_STUDIO',
          sport: g.sport || sport,
          description: `Custom Studio Template (${g.type}) • ${g.elements?.length || 0} element(s)`,
          defaultDuration: g.durationSeconds || 0,
          isCustomStudio: true,
          studioGraphic: g,
          badge: 'STUDIO',
          isUniversal: g.sport === 'CUSTOM' || !g.sport,
          targetId: g.id,
          targetName: g.name,
        });
      }
    });

    // Add Graphic Scenes
    scenes.forEach((s) => {
      const isCompatible = !s.sport || s.sport === sport || s.sport === 'CUSTOM';
      if (isCompatible) {
        items.push({
          id: s.id,
          name: s.name,
          category: 'SCENE',
          sport: s.sport || sport,
          description: `Multi-Layer Scene • ${s.layers?.length || 0} layer(s)`,
          defaultDuration: s.durationSeconds || 6,
          isScene: true,
          scene: s,
          badge: 'SCENE',
          isUniversal: s.sport === 'CUSTOM' || !s.sport,
          targetId: s.id,
          targetName: s.name,
        });
      }
    });

    return items;
  }, [sport, customGraphics, scenes]);

  // 2. Initial Suggestion & Persistence Synchronization
  useEffect(() => {
    // Determine initial suggestion
    const defaultInitialActiveSuggestions = [
      'built-in-scorebug',
      'built-in-sponsor',
      'built-in-player-lower-third',
      'cricket-four',
      'cricket-six',
      'cricket-wicket',
      'football-goal',
      'kabaddi-super-raid',
      'generic-point',
    ];

    // Priority 1: Config saved in database
    if (broadcastConfig?.activeGraphicIds && Array.isArray(broadcastConfig.activeGraphicIds)) {
      setActiveGraphicIds(broadcastConfig.activeGraphicIds);
      setHiddenGraphicIds(broadcastConfig.hiddenGraphicIds || []);
      setIsInitialized(true);
      return;
    }

    // Priority 2: Local storage cache
    const cacheKey = `sportspulse_active_graphics_${matchId || sport}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.active && Array.isArray(parsed.active)) {
          setActiveGraphicIds(parsed.active);
          setHiddenGraphicIds(parsed.hidden || []);
          setIsInitialized(true);
          return;
        }
      } catch (e) {
        // Fallback to default
      }
    }

    // Priority 3: Sensible initial suggestions (NOT all graphics)
    const initialActive = masterCatalog
      .filter((item) => defaultInitialActiveSuggestions.includes(item.id))
      .map((item) => item.id);

    const initialHidden = masterCatalog
      .filter((item) => !defaultInitialActiveSuggestions.includes(item.id))
      .map((item) => item.id);

    setActiveGraphicIds(initialActive);
    setHiddenGraphicIds(initialHidden);
    setIsInitialized(true);
  }, [sport, matchId, broadcastConfig, masterCatalog]);

  // Persist selections
  const persistSelections = useCallback(
    async (nextActive: string[], nextHidden: string[]) => {
      setActiveGraphicIds(nextActive);
      setHiddenGraphicIds(nextHidden);

      // Cache locally for offline preview resilience
      const cacheKey = `sportspulse_active_graphics_${matchId || sport}`;
      localStorage.setItem(
        cacheKey,
        JSON.stringify({ active: nextActive, hidden: nextHidden, timestamp: Date.now() })
      );

      // Save to match configuration on backend if matchId is present
      if (matchId && broadcastConfig) {
        try {
          const updatedConfig: BroadcastConfig = {
            ...broadcastConfig,
            activeGraphicIds: nextActive,
            hiddenGraphicIds: nextHidden,
          };
          if (onConfigChange) onConfigChange(updatedConfig);
          await api.saveBroadcastConfig(matchId, updatedConfig);
        } catch (err) {
          console.error('Failed to save active graphic selections to match config:', err);
        }
      }
    },
    [matchId, sport, broadcastConfig, onConfigChange]
  );

  // Add graphic to active list
  const handleAddGraphic = (item: GraphicControlItem) => {
    if (activeGraphicIds.includes(item.id)) return;
    const nextActive = [...activeGraphicIds, item.id];
    const nextHidden = hiddenGraphicIds.filter((id) => id !== item.id);
    persistSelections(nextActive, nextHidden);
  };

  // Remove/Hide graphic from active list (Preserves master template)
  const handleRemoveGraphic = (item: GraphicControlItem) => {
    const nextActive = activeGraphicIds.filter((id) => id !== item.id);
    const nextHidden = hiddenGraphicIds.includes(item.id)
      ? hiddenGraphicIds
      : [...hiddenGraphicIds, item.id];

    // Check if any event assignment points to this graphic
    const matchingAssignment = assignments.find(
      (a) =>
        a.assignedGraphicId === item.id ||
        a.targetId === item.id ||
        (a.assignedGraphicName && a.assignedGraphicName.toLowerCase() === item.name.toLowerCase())
    );

    if (matchingAssignment) {
      setWarningMessage(
        `"${item.name}" was removed from the active broadcast list. Note: Event assignment "${matchingAssignment.targetName}" references this graphic and will be skipped while hidden.`
      );
      setTimeout(() => setWarningMessage(null), 6000);
    }

    persistSelections(nextActive, nextHidden);
  };

  // Reorder active graphics
  const handleMoveGraphic = (index: number, direction: 'UP' | 'DOWN') => {
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= activeGraphicIds.length) return;

    const next = [...activeGraphicIds];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    persistSelections(next, hiddenGraphicIds);
  };

  // Helper to open offline preview
  const handleOpenPreview = (item: GraphicControlItem) => {
    setPreviewItem(item);
    setIsPreviewOpen(true);
  };

  // Active layers from onAirState
  const activeLayers: OnAirGraphicItem[] = useMemo(() => {
    if (onAirState?.activeGraphics && onAirState.activeGraphics.length > 0) {
      return onAirState.activeGraphics;
    }
    if (onAirState?.currentOnAir) {
      return [onAirState.currentOnAir];
    }
    return [];
  }, [onAirState]);

  // Separate catalog into Active and Available
  const { activeItems, availableItems } = useMemo(() => {
    const active: GraphicControlItem[] = [];
    const available: GraphicControlItem[] = [];

    // Map by order in activeGraphicIds
    activeGraphicIds.forEach((id) => {
      const found = masterCatalog.find((item) => item.id === id);
      if (found) active.push(found);
    });

    masterCatalog.forEach((item) => {
      if (!activeGraphicIds.includes(item.id)) {
        available.push(item);
      }
    });

    return { activeItems: active, availableItems: available };
  }, [masterCatalog, activeGraphicIds]);

  // Filter items based on category tabs and search query
  const filterList = (list: GraphicControlItem[]) => {
    return list.filter((item) => {
      const matchSearch =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchCat =
        selectedCategory === 'ALL' ||
        item.category === selectedCategory ||
        (selectedCategory === 'PERSISTENT' && item.defaultDuration === 0) ||
        (selectedCategory === 'EVENT' && item.category === 'EVENT_POPUP') ||
        (selectedCategory === 'SCORE' && item.category === 'MATCH_DATA') ||
        (selectedCategory === 'PLAYER' && item.category === 'PLAYER') ||
        (selectedCategory === 'TEAM' && item.category === 'TEAM') ||
        (selectedCategory === 'STUDIO' && item.isCustomStudio) ||
        (selectedCategory === 'SCENE' && item.isScene) ||
        (selectedCategory === 'UNIVERSAL' && item.isUniversal);

      return matchSearch && matchCat;
    });
  };

  const filteredActiveItems = useMemo(() => filterList(activeItems), [activeItems, searchQuery, selectedCategory]);
  const filteredAvailableItems = useMemo(() => filterList(availableItems), [availableItems, searchQuery, selectedCategory]);

  // Check if item is on air or in preview
  const isItemOnAir = (item: GraphicControlItem) => {
    return activeLayers.some(
      (layer) =>
        layer.id === item.id ||
        layer.graphicId === item.id ||
        layer.targetId === item.id ||
        layer.sceneId === item.id ||
        layer.graphicName?.toLowerCase() === item.name.toLowerCase()
    );
  };

  const isItemInPreview = (item: GraphicControlItem) => {
    const preview = onAirState?.previewGraphic;
    if (!preview) return false;
    return (
      preview.id === item.id ||
      preview.graphicId === item.id ||
      preview.targetId === item.id ||
      preview.sceneId === item.id ||
      preview.graphicName?.toLowerCase() === item.name.toLowerCase()
    );
  };

  const getDurationForItem = (item: GraphicControlItem) => {
    if (itemDurations[item.id] !== undefined) {
      return itemDurations[item.id];
    }
    return item.defaultDuration;
  };

  // Play, Stop, Cue handlers
  const handlePlay = async (item: GraphicControlItem) => {
    if (!matchId) return;
    setActionInProgress(`play-${item.id}`);
    try {
      const duration = getDurationForItem(item);
      const res = await api.playGraphic(matchId, {
        graphicId: item.isCustomStudio ? item.id : undefined,
        targetId: item.id,
        graphicName: item.name,
        sceneId: item.isScene ? item.id : undefined,
        sceneName: item.isScene ? item.name : undefined,
        layers: item.scene?.layers,
        graphic: item.studioGraphic,
        durationSeconds: duration,
        isHeld: duration === 0,
        sourceType: item.isScene ? 'SCENE' : 'MANUAL',
        triggerSource: 'MANUAL',
      });
      if (onStateChange && res.state) {
        onStateChange(res.state);
      }
    } catch (err) {
      console.error('Failed to play graphic:', err);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleStop = async (item: GraphicControlItem) => {
    if (!matchId) return;
    setActionInProgress(`stop-${item.id}`);
    try {
      const res = await api.stopGraphic(matchId, item.id);
      if (onStateChange && res.state) {
        onStateChange(res.state);
      }
    } catch (err) {
      console.error('Failed to stop graphic:', err);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleCue = async (item: GraphicControlItem) => {
    if (!matchId) return;
    setActionInProgress(`cue-${item.id}`);
    try {
      const duration = getDurationForItem(item);
      const res = await api.cueGraphic(matchId, {
        graphicId: item.isCustomStudio ? item.id : undefined,
        targetId: item.id,
        graphicName: item.name,
        sceneId: item.isScene ? item.id : undefined,
        sceneName: item.isScene ? item.name : undefined,
        layers: item.scene?.layers,
        graphic: item.studioGraphic,
        durationSeconds: duration,
        isHeld: duration === 0,
        sourceType: item.isScene ? 'SCENE' : 'MANUAL',
        triggerSource: 'MANUAL',
      });
      if (onStateChange && res.state) {
        onStateChange(res.state);
      }
    } catch (err) {
      console.error('Failed to cue graphic:', err);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleClearAll = async () => {
    if (!matchId) return;
    setActionInProgress('clear-all');
    try {
      const res = await api.clearOnAir(matchId);
      if (onStateChange && res.state) {
        onStateChange(res.state);
      }
    } catch (err) {
      console.error('Failed to clear on air:', err);
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div
      id="sports-pulse-user-graphics-control-panel"
      className={`bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4 shadow-xl font-sans space-y-4 ${className}`}
    >
      {/* 1. Header Bar with Counts & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>GRAPHICS & OVERLAYS MANAGEMENT</span>
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
              {activeItems.length} ACTIVE IN BROADCAST
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              {availableItems.length} AVAILABLE IN LIBRARY
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Select only the graphics you want for this broadcast. Built-in templates are optional suggestions.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Quick jump to available library */}
          <a
            href="#available-graphics-section"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 font-bold text-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Graphic</span>
          </a>

          {/* Stop All */}
          {activeLayers.length > 0 && (
            <button
              onClick={handleClearAll}
              disabled={Boolean(actionInProgress)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 font-bold text-xs transition cursor-pointer"
              title="Cut all active layers to black"
            >
              <Square className="w-3.5 h-3.5 fill-red-400 text-red-400" />
              <span>STOP ALL ({activeLayers.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Non-blocking Warning Notification */}
      {warningMessage && (
        <div className="p-3 rounded-lg bg-amber-950/70 border border-amber-800/80 text-amber-200 text-xs flex items-start gap-2 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">{warningMessage}</div>
          <button
            onClick={() => setWarningMessage(null)}
            className="text-amber-400 hover:text-white p-0.5 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Live On-Air Active Program Strip */}
      <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80">
        <div className="flex items-center justify-between text-xs font-mono mb-1.5">
          <span className="text-slate-400 font-bold uppercase flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-red-400 animate-pulse" />
            <span>PROGRAM ON-AIR BUS ({activeLayers.length} Active Layer{activeLayers.length === 1 ? '' : 's'})</span>
          </span>
          <span className="text-[11px] text-slate-500">
            {activeLayers.length === 0 ? 'OBS / vMix output is clean transparent' : 'Multi-layer composite rendering'}
          </span>
        </div>

        {activeLayers.length === 0 ? (
          <div className="py-2 text-center text-xs text-slate-500 font-mono">
            No graphics are live on Program. Click <strong className="text-emerald-400">PLAY</strong> on any active graphic below to take it live.
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {activeLayers.map((layer) => (
              <div
                key={layer.id}
                className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-red-950/60 border border-red-800/60 text-xs font-mono shadow-sm"
              >
                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                <span className="font-bold text-white max-w-[150px] truncate">
                  {layer.graphicName || layer.sceneName || layer.eventName}
                </span>
                <span className="text-[10px] px-1 py-0.2 rounded bg-red-900/60 text-red-300 font-semibold">
                  {layer.isHeld || layer.durationSeconds === 0
                    ? 'PERSISTENT'
                    : `${layer.remainingSeconds}s`}
                </span>
                <button
                  onClick={() => handleStop({ id: layer.id, name: layer.graphicName || '' } as any)}
                  disabled={Boolean(actionInProgress)}
                  className="ml-1 p-1 rounded bg-slate-900 hover:bg-red-800 text-slate-300 hover:text-white transition cursor-pointer"
                  title={`Stop only "${layer.graphicName}"`}
                >
                  <Square className="w-2.5 h-2.5 fill-current" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Search & Category Filter Navigation */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'ALL', label: 'ALL' },
            { id: 'SCORE', label: 'SCORE OVERLAYS' },
            { id: 'EVENT', label: 'EVENTS' },
            { id: 'PLAYER', label: 'PLAYERS' },
            { id: 'TEAM', label: 'TEAMS & LINEUPS' },
            { id: 'STUDIO', label: 'CUSTOM STUDIO' },
            { id: 'SCENE', label: 'SCENES' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer min-h-[34px] ${
                selectedCategory === tab.id
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-60 shrink-0">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search graphics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 4. SECTION 1: ACTIVE BROADCAST GRAPHICS */}
      {/* ===================================================================== */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400">
              ACTIVE BROADCAST GRAPHICS ({activeItems.length})
            </h4>
            <span className="text-[10px] text-slate-400">
              — Only these graphics will be loaded and triggered
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            {filteredActiveItems.length} matching filter
          </span>
        </div>

        {activeItems.length === 0 ? (
          <div className="p-6 rounded-xl border border-dashed border-slate-700/80 bg-slate-950/40 text-center space-y-2">
            <p className="text-xs font-bold text-slate-300">
              No graphics are currently selected for this broadcast.
            </p>
            <p className="text-[11px] text-slate-500">
              Click <strong className="text-cyan-400">+ Add to Broadcast</strong> on any graphic from the library below to activate it.
            </p>
          </div>
        ) : filteredActiveItems.length === 0 ? (
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 text-center text-xs text-slate-500">
            No active graphics match "{searchQuery}"
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {filteredActiveItems.map((item, index) => {
              const onAir = isItemOnAir(item);
              const inPreview = isItemInPreview(item);
              const currentDuration = getDurationForItem(item);
              const isBusy = actionInProgress?.includes(item.id);

              // Check if mapped by an automated event assignment
              const mappedAssignment = assignments.find(
                (a) =>
                  a.assignedGraphicId === item.id ||
                  a.targetId === item.id ||
                  (a.assignedGraphicName && a.assignedGraphicName.toLowerCase() === item.name.toLowerCase())
              );

              return (
                <div
                  key={item.id}
                  id={`active-graphic-${item.id}`}
                  className={`p-3 rounded-xl border transition flex flex-col justify-between gap-2.5 ${
                    onAir
                      ? 'bg-red-950/25 border-red-700/80 shadow-md shadow-red-950/40'
                      : inPreview
                      ? 'bg-blue-950/20 border-blue-600/80 shadow-md shadow-blue-950/40'
                      : 'bg-slate-950/90 border-emerald-900/60 hover:border-emerald-700/80 shadow-sm'
                  }`}
                >
                  {/* Top: Header, Checkmark & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="w-4 h-4 rounded flex items-center justify-center bg-emerald-600/30 text-emerald-400 font-bold text-[10px]">
                          ✓
                        </span>
                        <span className="font-black text-xs text-white truncate">
                          {item.name}
                        </span>
                        {item.badge && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                            {item.badge}
                          </span>
                        )}
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800/80 text-cyan-400 border border-slate-700 uppercase">
                          {item.sport || 'UNIVERSAL'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {item.description}
                      </p>

                      {/* Event assignment badge */}
                      {mappedAssignment && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                          <Zap className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="truncate">Mapped: {mappedAssignment.targetName}</span>
                        </div>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-1 shrink-0">
                      {onAir ? (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded bg-red-600 text-white flex items-center gap-1 shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          ON AIR
                        </span>
                      ) : inPreview ? (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded bg-blue-600 text-white flex items-center gap-1 shadow-sm">
                          PREVIEW
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/80">
                          ACTIVE
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle: Duration Settings & Reorder Controls */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80 text-[11px] font-mono">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500 text-[10px]">ORDER:</span>
                      <button
                        onClick={() => handleMoveGraphic(index, 'UP')}
                        disabled={index === 0}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-2.5 h-2.5" />
                      </button>
                      <button
                        onClick={() => handleMoveGraphic(index, 'DOWN')}
                        disabled={index === activeGraphicIds.length - 1}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-2.5 h-2.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      {[
                        { label: 'PERSIST', val: 0 },
                        { label: '3s', val: 3 },
                        { label: '5s', val: 5 },
                        { label: '8s', val: 8 },
                      ].map((d) => (
                        <button
                          key={d.val}
                          onClick={() => setItemDurations((prev) => ({ ...prev, [item.id]: d.val }))}
                          className={`px-1.5 py-0.5 rounded text-[10px] transition cursor-pointer ${
                            currentDuration === d.val
                              ? 'bg-cyan-900 text-cyan-200 font-bold border border-cyan-700'
                              : 'bg-slate-900 text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bottom: Action Buttons (Preview, Play, Stop, Hide) */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    {/* Offline Preview Button */}
                    <button
                      onClick={() => handleOpenPreview(item)}
                      className="flex items-center justify-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer min-h-[40px] border border-slate-700"
                      title="Preview Graphic with Offline / Live Data"
                    >
                      <Eye className="w-3.5 h-3.5 text-cyan-400" />
                      <span>PREVIEW</span>
                    </button>

                    {/* CUE Button */}
                    <button
                      onClick={() => handleCue(item)}
                      disabled={isBusy}
                      className={`flex items-center justify-center gap-1 rounded-lg font-bold text-xs transition cursor-pointer min-h-[40px] ${
                        inPreview
                          ? 'bg-blue-600 text-white shadow-blue-900/50'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      }`}
                      title="Cue to Preview Bus (PST)"
                    >
                      <span>CUE</span>
                    </button>

                    {/* PLAY Button */}
                    <button
                      onClick={() => handlePlay(item)}
                      disabled={isBusy}
                      className={`flex items-center justify-center gap-1 rounded-lg font-black text-xs transition cursor-pointer min-h-[40px] ${
                        onAir
                          ? 'bg-emerald-700 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/60'
                      }`}
                      title="Take Live to Program (PGM)"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>{onAir ? 'UPDATE' : 'PLAY'}</span>
                    </button>

                    {/* HIDE / REMOVE FROM BROADCAST LIST */}
                    <button
                      onClick={() => handleRemoveGraphic(item)}
                      className="flex items-center justify-center gap-1 rounded-lg bg-slate-800/80 hover:bg-amber-950/80 text-slate-400 hover:text-amber-300 hover:border-amber-700 border border-slate-700/80 font-bold text-xs transition cursor-pointer min-h-[40px]"
                      title="Hide from current broadcast list (preserves template)"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>HIDE</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* 5. SECTION 2: AVAILABLE GRAPHICS / LIBRARY (Hidden from active broadcast) */}
      {/* ===================================================================== */}
      <div id="available-graphics-section" className="space-y-2 pt-3 border-t border-slate-800">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-black uppercase tracking-wider text-cyan-400">
              AVAILABLE GRAPHICS / LIBRARY ({availableItems.length})
            </h4>
            <span className="text-[10px] text-slate-400">
              — Not currently loaded. Click "+ Add" to activate for this broadcast
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            {filteredAvailableItems.length} matching filter
          </span>
        </div>

        {availableItems.length === 0 ? (
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 text-center text-xs text-slate-500">
            All available graphics are currently active in the broadcast list.
          </div>
        ) : filteredAvailableItems.length === 0 ? (
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 text-center text-xs text-slate-500">
            No available graphics match "{searchQuery}"
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {filteredAvailableItems.map((item) => {
              // Check if any event assignment points to this hidden graphic
              const mappedAssignment = assignments.find(
                (a) =>
                  a.assignedGraphicId === item.id ||
                  a.targetId === item.id ||
                  (a.assignedGraphicName && a.assignedGraphicName.toLowerCase() === item.name.toLowerCase())
              );

              return (
                <div
                  key={item.id}
                  id={`available-graphic-${item.id}`}
                  className="p-3 rounded-xl border border-slate-800/80 bg-slate-950/60 hover:border-slate-700 transition flex flex-col justify-between gap-2.5"
                >
                  {/* Top: Header, Empty check & Badge */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="w-4 h-4 rounded flex items-center justify-center bg-slate-800 text-slate-500 font-mono text-[10px]">
                            ○
                          </span>
                          <span className="font-bold text-xs text-slate-300 truncate">
                            {item.name}
                          </span>
                          {item.badge && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800 uppercase">
                              {item.badge}
                            </span>
                          )}
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-cyan-400 border border-slate-800 uppercase">
                            {item.sport || 'UNIVERSAL'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {item.description}
                        </p>
                      </div>

                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700 shrink-0">
                        HIDDEN
                      </span>
                    </div>

                    {/* Warning if mapped by event assignment */}
                    {mappedAssignment && (
                      <div className="mt-2 p-1.5 rounded bg-amber-950/40 border border-amber-900/60 text-[10px] text-amber-300 font-mono flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">
                          ⚠️ Mapped to "{mappedAssignment.targetName}" but currently hidden.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Bottom: Preview & Add Button */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                    <button
                      onClick={() => handleOpenPreview(item)}
                      className="flex items-center justify-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer min-h-[38px] border border-slate-700"
                      title="Inspect graphic with offline sample data"
                    >
                      <Eye className="w-3.5 h-3.5 text-cyan-400" />
                      <span>PREVIEW</span>
                    </button>

                    <button
                      onClick={() => handleAddGraphic(item)}
                      className="flex items-center justify-center gap-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition cursor-pointer min-h-[38px] shadow-sm shadow-cyan-950/50"
                      title="Add this graphic to the active broadcast list"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ ADD TO LIST</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. Offline / Live Graphic Preview Modal */}
      {previewItem && (
        <BroadcastGraphicPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => {
            setIsPreviewOpen(false);
            setPreviewItem(null);
          }}
          item={previewItem}
          sport={sport}
          matchId={matchId}
          match={match}
          scoringState={scoringState}
          broadcastConfig={broadcastConfig}
          isActive={activeGraphicIds.includes(previewItem.id)}
          onToggleActive={(itemToToggle) => {
            if (activeGraphicIds.includes(itemToToggle.id)) {
              handleRemoveGraphic(itemToToggle);
            } else {
              handleAddGraphic(itemToToggle);
            }
          }}
          onCue={(itemToCue) => handleCue(itemToCue)}
          onPlay={(itemToPlay) => handlePlay(itemToPlay)}
        />
      )}
    </div>
  );
};
