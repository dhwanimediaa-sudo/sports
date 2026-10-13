import React, { useState, useEffect, useMemo } from 'react';
import {
  GraphicAssignment,
  SportType,
  AssignmentCategory,
  TriggerMode,
  StudioGraphic,
  GraphicAnimationTypeShort,
  BroadcastConfig,
  OnAirState,
} from '../../../types';
import { api } from '../../../services/api';
import {
  Layers,
  Search,
  Check,
  Zap,
  Play,
  Eye,
  RefreshCw,
  Save,
  Sliders,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Film,
  Clock,
  Radio,
  SlidersHorizontal,
  ChevronDown,
  X,
} from 'lucide-react';

interface GraphicAssignmentManagerProps {
  sport?: SportType;
  initialSport?: SportType;
  matchId?: string;
  onSelectForLive?: (assignment: GraphicAssignment) => void;
  onSelectForPreview?: (assignment: GraphicAssignment) => void;
}

const ALL_SPORTS: { id: SportType; label: string }[] = [
  { id: 'CRICKET', label: 'Cricket' },
  { id: 'FOOTBALL', label: 'Football / Soccer' },
  { id: 'KABADDI', label: 'Kabaddi' },
  { id: 'VOLLEYBALL', label: 'Volleyball' },
  { id: 'BASKETBALL', label: 'Basketball' },
  { id: 'HOCKEY', label: 'Field Hockey' },
  { id: 'TENNIS', label: 'Tennis' },
  { id: 'BADMINTON', label: 'Badminton' },
  { id: 'TABLE_TENNIS', label: 'Table Tennis' },
  { id: 'PICKLEBALL', label: 'Pickleball' },
  { id: 'HANDBALL', label: 'Handball' },
  { id: 'SQUASH', label: 'Squash' },
  { id: 'CUSTOM', label: 'Custom / Multi-Sport' },
];

const CATEGORIES: { id: 'ALL' | AssignmentCategory; label: string }[] = [
  { id: 'ALL', label: 'All Categories' },
  { id: 'MATCH_STATUS', label: 'Match Status' },
  { id: 'LIVE_DATA', label: 'Live Data' },
  { id: 'EVENTS', label: 'In-Game Events' },
  { id: 'MILESTONES', label: 'Milestones & Honors' },
];

const ANIMATIONS: GraphicAnimationTypeShort[] = [
  'POP',
  'ZOOM',
  'FADE',
  'SLIDE_UP',
  'SLIDE_DOWN',
  'SLIDE_LEFT',
  'SLIDE_RIGHT',
  'FLIP',
];

export const GraphicAssignmentManager: React.FC<GraphicAssignmentManagerProps> = ({
  sport: initialSport = 'CRICKET',
  matchId,
  onSelectForLive,
  onSelectForPreview,
}) => {
  const [selectedSport, setSelectedSport] = useState<SportType>(initialSport);
  const [activeCategory, setActiveCategory] = useState<'ALL' | AssignmentCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [assignments, setAssignments] = useState<GraphicAssignment[]>([]);
  const [savedGraphics, setSavedGraphics] = useState<StudioGraphic[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal for graphic selector
  const [targetAssignmentForGraphic, setTargetAssignmentForGraphic] = useState<GraphicAssignment | null>(null);
  const [graphicModalSearch, setGraphicModalSearch] = useState('');
  const [graphicModalFilterSport, setGraphicModalFilterSport] = useState<'ALL' | SportType>('ALL');

  // Track modified assignments
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [broadcastConfig, setBroadcastConfig] = useState<BroadcastConfig | null>(null);
  const [onAirState, setOnAirState] = useState<OnAirState | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Load assignments and studio graphics
  const loadData = async (sportToLoad = selectedSport) => {
    try {
      setLoading(true);
      const [assignRes, graphicsRes] = await Promise.all([
        api.getGraphicAssignments({ sport: sportToLoad, matchId }),
        api.getStudioGraphics(),
      ]);
      setAssignments(assignRes.assignments || []);
      setSavedGraphics(graphicsRes.graphics || []);
      setHasUnsavedChanges(false);

      if (matchId) {
        try {
          const [bRes, oRes] = await Promise.all([
            api.getBroadcastState(matchId).catch(() => null),
            api.getOnAirState(matchId).catch(() => null),
          ]);
          if (bRes?.config) setBroadcastConfig(bRes.config);
          if (oRes?.state) setOnAirState(oRes.state);
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.error('Failed to load graphic assignments:', err);
      showToast('Error loading assignments.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualTrigger = async (assignment: GraphicAssignment) => {
    if (!matchId) {
      showToast('Connect or select a match to execute triggers.');
      return;
    }
    try {
      const res = await api.triggerEventAssignment(matchId, {
        sport: assignment.sport || selectedSport,
        targetId: assignment.targetId,
        isManual: true,
      });
      if (res.result?.success) {
        showToast(`Triggered "${assignment.targetName}"`);
        if (res.state) setOnAirState(res.state);
      } else {
        showToast(res.result?.reason || res.message || 'Trigger blocked.');
      }
    } catch (err: any) {
      showToast(err.message || 'Trigger failed.');
    }
  };

  useEffect(() => {
    loadData(selectedSport);
  }, [selectedSport, matchId]);

  // Handle local assignment update
  const handleUpdateAssignment = (id: string, updates: Partial<GraphicAssignment>) => {
    setAssignments((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
    setHasUnsavedChanges(true);
  };

  // Save changes to backend
  const handleSaveAll = async () => {
    try {
      setSaving(true);
      await api.saveGraphicAssignments(assignments);
      setHasUnsavedChanges(false);
      showToast('Graphic assignments saved successfully!');
    } catch (err) {
      console.error('Failed to save assignments:', err);
      showToast('Failed to save assignments.');
    } finally {
      setSaving(false);
    }
  };

  // Reset to sport defaults
  const handleResetDefaults = async () => {
    if (!window.confirm(`Reset all assignments to standard defaults for ${selectedSport}?`)) {
      return;
    }
    try {
      setSaving(true);
      const res = await api.resetGraphicAssignments(selectedSport, matchId);
      setAssignments(res.assignments || []);
      setHasUnsavedChanges(false);
      showToast('Assignments reset to sport defaults!');
    } catch (err) {
      console.error('Failed to reset assignments:', err);
      showToast('Failed to reset assignments.');
    } finally {
      setSaving(false);
    }
  };

  // Filtered assignments
  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const matchCat = activeCategory === 'ALL' || a.category === activeCategory;
      const matchSearch =
        !searchQuery ||
        a.targetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.targetId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.assignedGraphicName && a.assignedGraphicName.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [assignments, activeCategory, searchQuery]);

  // Filtered graphics for selector modal
  const filteredModalGraphics = useMemo(() => {
    return savedGraphics.filter((g) => {
      const matchSport =
        graphicModalFilterSport === 'ALL' || g.sport === graphicModalFilterSport || g.sport === 'CUSTOM';
      const matchSearch =
        !graphicModalSearch ||
        g.name.toLowerCase().includes(graphicModalSearch.toLowerCase()) ||
        (g.category && g.category.toLowerCase().includes(graphicModalSearch.toLowerCase()));
      return matchSport && matchSearch;
    });
  }, [savedGraphics, graphicModalFilterSport, graphicModalSearch]);

  const handleSelectGraphicForAssignment = (graphic: StudioGraphic | null) => {
    if (!targetAssignmentForGraphic) return;
    handleUpdateAssignment(targetAssignmentForGraphic.id, {
      assignedGraphicId: graphic ? graphic.id : null,
      assignedGraphicName: graphic ? graphic.name : undefined,
    });
    setTargetAssignmentForGraphic(null);
  };

  // Quick live test
  const handleTakeLive = (assignment: GraphicAssignment) => {
    if (onSelectForLive) {
      onSelectForLive(assignment);
    } else if (matchId) {
      api
        .takeLiveOnAir(matchId, {
          sourceType: 'ASSIGNMENT',
          sourceId: assignment.id,
          targetId: assignment.targetId,
          eventName: assignment.targetName,
          graphicId: assignment.assignedGraphicId || undefined,
          graphicName: assignment.assignedGraphicName,
          entryAnimation: assignment.entryAnimation,
          exitAnimation: assignment.exitAnimation,
          durationSeconds: assignment.displayDuration,
          triggerSource: 'MANUAL',
          priority: assignment.priority,
        })
        .then(() => showToast(`Sent "${assignment.targetName}" Live!`))
        .catch(() => showToast('Error sending to Live.'));
    }
  };

  const handlePreview = (assignment: GraphicAssignment) => {
    if (onSelectForPreview) {
      onSelectForPreview(assignment);
    } else if (matchId) {
      api
        .setOnAirPreview(matchId, {
          sourceType: 'ASSIGNMENT',
          sourceId: assignment.id,
          targetId: assignment.targetId,
          eventName: assignment.targetName,
          graphicId: assignment.assignedGraphicId || undefined,
          graphicName: assignment.assignedGraphicName,
          entryAnimation: assignment.entryAnimation,
          exitAnimation: assignment.exitAnimation,
          durationSeconds: assignment.displayDuration,
          triggerSource: 'MANUAL',
          priority: assignment.priority,
        })
        .then(() => showToast(`Loaded "${assignment.targetName}" into Preview!`))
        .catch(() => showToast('Error sending to Preview.'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-lg shadow-2xl font-bold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Control Header & Sport Selector */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <Radio className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <span>Graphic Assignment Manager</span>
              {matchId && (
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 font-mono">
                  MATCH OVERRIDE
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">
              Map live match data and sport events to Studio Graphics with custom triggers, animations, and priority queues.
            </p>
          </div>
        </div>

        {/* Sport Selector & Save Button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 px-3 py-1.5 rounded-lg">
            <span className="text-xs text-slate-400 font-bold uppercase">Sport:</span>
            <select
              value={selectedSport}
              onChange={(e) => setSelectedSport(e.target.value as SportType)}
              className="bg-transparent text-sm font-semibold text-white focus:outline-none cursor-pointer"
            >
              {ALL_SPORTS.map((s) => (
                <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleResetDefaults}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold border border-slate-700 transition"
            title="Reset to factory default assignments for this sport"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Defaults</span>
          </button>

          <button
            onClick={handleSaveAll}
            disabled={saving || !hasUnsavedChanges}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition shadow-lg ${
              hasUnsavedChanges
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white animate-pulse'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                activeCategory === cat.id
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search events, tokens, or graphics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Assignments List */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 bg-slate-900/50 border border-slate-800 rounded-xl">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-500" />
          Loading {selectedSport} assignments catalog...
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="p-16 text-center text-slate-400 bg-slate-900/50 border border-slate-800 rounded-xl">
          <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-amber-500 opacity-60" />
          <p className="text-sm font-semibold text-slate-300">No assignments match current filter.</p>
          <button
            onClick={() => {
              setActiveCategory('ALL');
              setSearchQuery('');
            }}
            className="mt-3 text-xs text-emerald-400 hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAssignments.map((assignment) => {
            const hasGraphic = Boolean(assignment.assignedGraphicId);
            const isAuto = assignment.triggerMode === 'AUTO' || assignment.triggerMode === 'AUTO_MANUAL';

            // Check if graphic is hidden or active in broadcast list
            const isHidden = Boolean(
              broadcastConfig?.hiddenGraphicIds?.some(
                (hId) =>
                  hId === assignment.assignedGraphicId ||
                  hId === assignment.targetId ||
                  (assignment.assignedGraphicName && assignment.assignedGraphicName.toLowerCase() === hId.toLowerCase())
              )
            );

            // Check current on-air / queued status
            const isOnAir = Boolean(
              onAirState?.currentOnAir &&
              (onAirState.currentOnAir.sourceId === assignment.id ||
                onAirState.currentOnAir.targetId === assignment.targetId ||
                onAirState.currentOnAir.graphicId === assignment.assignedGraphicId)
            );

            const isQueued = Boolean(
              onAirState?.queue?.some(
                (q) =>
                  q.sourceId === assignment.id ||
                  q.targetId === assignment.targetId ||
                  q.graphicId === assignment.assignedGraphicId
              )
            );

            const priorityNum = assignment.priority ?? 50;
            const priorityBadge =
              priorityNum >= 90
                ? { label: 'CRITICAL', cls: 'bg-red-950 text-red-300 border-red-800' }
                : priorityNum >= 70
                ? { label: 'HIGH', cls: 'bg-amber-950 text-amber-300 border-amber-800' }
                : priorityNum >= 40
                ? { label: 'NORMAL', cls: 'bg-blue-950 text-blue-300 border-blue-800' }
                : { label: 'LOW', cls: 'bg-slate-800 text-slate-400 border-slate-700' };

            return (
              <div
                key={assignment.id}
                className={`bg-slate-900 border rounded-xl p-4 transition-all duration-200 ${
                  !assignment.enabled
                    ? 'border-slate-800/50 opacity-60 bg-slate-950/40'
                    : isOnAir
                    ? 'border-red-700 bg-red-950/20 shadow-md shadow-red-950/40'
                    : isQueued
                    ? 'border-amber-700/80 bg-amber-950/20 shadow-md shadow-amber-950/40'
                    : hasGraphic
                    ? 'border-slate-800 hover:border-slate-700'
                    : 'border-amber-900/40 bg-amber-950/10'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Target & Category Info */}
                  <div className="flex items-start gap-3 min-w-[280px]">
                    <button
                      type="button"
                      onClick={() => handleUpdateAssignment(assignment.id, { enabled: !assignment.enabled })}
                      className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center transition border ${
                        assignment.enabled
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'bg-slate-800 border-slate-700 text-transparent'
                      }`}
                      title={assignment.enabled ? 'Click to disable' : 'Click to enable'}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm">{assignment.targetName}</span>
                        <span
                          className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded font-bold ${
                            assignment.category === 'MATCH_STATUS'
                              ? 'bg-blue-950 text-blue-300 border border-blue-800'
                              : assignment.category === 'LIVE_DATA'
                              ? 'bg-purple-950 text-purple-300 border border-purple-800'
                              : assignment.category === 'EVENTS'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {assignment.category}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                          {assignment.sport}
                        </span>
                        {/* Status Badge: Active vs Hidden */}
                        <span
                          className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${
                            isHidden
                              ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                              : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                          }`}
                        >
                          {isHidden ? 'HIDDEN' : 'ACTIVE'}
                        </span>
                        {/* On-Air State Indicator */}
                        {isOnAir && (
                          <span className="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded bg-red-600 text-white flex items-center gap-1 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            ON AIR
                          </span>
                        )}
                        {isQueued && (
                          <span className="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded bg-amber-600 text-white flex items-center gap-1 shadow-sm">
                            QUEUED
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        ID: <span className="text-slate-400">{assignment.targetId}</span>
                        {assignment.targetCategory && (
                          <span className="text-slate-500"> • {assignment.targetCategory}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle: Trigger Mode, Graphic Selector, Cooldown, Conflict, Priority */}
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Trigger Mode */}
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Trigger Mode
                      </span>
                      <select
                        value={assignment.triggerMode}
                        onChange={(e) =>
                          handleUpdateAssignment(assignment.id, {
                            triggerMode: e.target.value as TriggerMode,
                          })
                        }
                        className={`text-xs px-2.5 py-1.5 rounded-lg border font-semibold focus:outline-none cursor-pointer ${
                          assignment.triggerMode === 'AUTO_MANUAL'
                            ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                            : assignment.triggerMode === 'AUTO'
                            ? 'bg-blue-950/80 border-blue-700 text-blue-300'
                            : assignment.triggerMode === 'MANUAL'
                            ? 'bg-purple-950/80 border-purple-700 text-purple-300'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        <option value="AUTO_MANUAL" className="bg-slate-900 text-white">AUTO + MANUAL</option>
                        <option value="AUTO" className="bg-slate-900 text-white">AUTO ONLY</option>
                        <option value="MANUAL" className="bg-slate-900 text-white">MANUAL ONLY</option>
                        <option value="DISABLED" className="bg-slate-900 text-white">DISABLED</option>
                      </select>
                    </div>

                    {/* Assigned Graphic Button */}
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Assigned Graphic
                      </span>
                      <button
                        onClick={() => setTargetAssignmentForGraphic(assignment)}
                        className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border font-semibold text-left max-w-[240px] truncate transition ${
                          hasGraphic
                            ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white'
                            : 'bg-amber-950/40 hover:bg-amber-950/70 border-amber-700 text-amber-300 animate-pulse'
                        }`}
                      >
                        <Film className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                        <span className="truncate">
                          {assignment.assignedGraphicName || '⚠️ Click to Assign'}
                        </span>
                        <ChevronDown className="w-3 h-3 shrink-0 ml-auto text-slate-400" />
                      </button>
                    </div>

                    {/* Priority with Level Badge */}
                    <div className="flex flex-col w-20">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Priority
                        </span>
                        <span className={`text-[8px] font-black uppercase px-1 rounded font-mono border ${priorityBadge.cls}`}>
                          {priorityBadge.label}
                        </span>
                      </div>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={assignment.priority ?? 50}
                        onChange={(e) =>
                          handleUpdateAssignment(assignment.id, {
                            priority: parseInt(e.target.value, 10) || 50,
                          })
                        }
                        className="text-xs px-2 py-1.5 bg-slate-800 border border-slate-700 text-slate-200 font-mono rounded-lg focus:outline-none text-center"
                        title="1 to 100 priority rating"
                      />
                    </div>

                    {/* Cooldown */}
                    <div className="flex flex-col w-20">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Cooldown
                      </span>
                      <div className="flex items-center">
                        <input
                          type="number"
                          min="0"
                          max="60"
                          step="0.5"
                          value={assignment.cooldownSeconds ?? 1.0}
                          onChange={(e) =>
                            handleUpdateAssignment(assignment.id, {
                              cooldownSeconds: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full text-xs px-2 py-1.5 bg-slate-800 border border-slate-700 text-cyan-400 font-mono font-bold rounded-lg focus:outline-none text-center"
                          title="Cooldown period in seconds before repeating"
                        />
                      </div>
                    </div>

                    {/* Conflict Strategy */}
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Conflict
                      </span>
                      <select
                        value={assignment.conflictAction || 'QUEUE_BEHIND'}
                        onChange={(e) =>
                          handleUpdateAssignment(assignment.id, {
                            conflictAction: e.target.value as any,
                          })
                        }
                        className="text-xs px-2 py-1.5 bg-slate-800 border border-slate-700 text-slate-200 rounded-lg focus:outline-none cursor-pointer"
                        title="Conflict resolution strategy"
                      >
                        <option value="INTERRUPT" className="bg-slate-900 text-white">INTERRUPT</option>
                        <option value="QUEUE_BEHIND" className="bg-slate-900 text-white">QUEUE BEHIND</option>
                        <option value="REPLACE_QUEUED" className="bg-slate-900 text-white">REPLACE QUEUED</option>
                        <option value="CANCEL" className="bg-slate-900 text-white">CANCEL / DROP</option>
                      </select>
                    </div>

                    {/* Duration / Hold */}
                    <div className="flex flex-col w-18">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Hold (s)
                      </span>
                      <input
                        type="number"
                        min="0"
                        max="60"
                        step="0.5"
                        value={assignment.displayDuration}
                        onChange={(e) =>
                          handleUpdateAssignment(assignment.id, {
                            displayDuration: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="text-xs px-2 py-1.5 bg-slate-800 border border-slate-700 text-emerald-400 font-mono font-bold rounded-lg focus:outline-none text-center"
                        title="0 = Keep on-air until manual clear or next"
                      />
                    </div>
                  </div>

                  {/* Right: Quick Action Buttons (Preview, TAKE, Trigger) */}
                  <div className="flex items-center gap-1.5 self-end lg:self-center">
                    <button
                      onClick={() => handlePreview(assignment)}
                      disabled={!hasGraphic}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-emerald-400 border border-slate-700 rounded-lg text-xs font-bold transition"
                      title="Load into Preview Bus"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>

                    <button
                      onClick={() => handleTakeLive(assignment)}
                      disabled={!hasGraphic}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-600/90 hover:bg-red-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-lg text-xs font-black shadow-lg shadow-red-950/50 transition"
                      title="Take Live Immediately on Air"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>TAKE</span>
                    </button>

                    <button
                      onClick={() => handleManualTrigger(assignment)}
                      disabled={!hasGraphic || !assignment.enabled || assignment.triggerMode === 'DISABLED'}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-cyan-700/80 hover:bg-cyan-600 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold transition shadow-sm"
                      title="Test Event Trigger on this Assignment"
                    >
                      <Radio className="w-3.5 h-3.5" />
                      <span>Trigger</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* GRAPHIC SELECTOR MODAL */}
      {targetAssignmentForGraphic && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Film className="w-5 h-5 text-emerald-400" />
                  <span>Select Studio Graphic for "{targetAssignmentForGraphic.targetName}"</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pick any pre-designed template or custom saved graphic from the Studio Graphics Library.
                </p>
              </div>
              <button
                onClick={() => setTargetAssignmentForGraphic(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Filters */}
            <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search graphics by name or category..."
                  value={graphicModalSearch}
                  onChange={(e) => setGraphicModalSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-xs text-slate-500">Filter Sport:</span>
                <select
                  value={graphicModalFilterSport}
                  onChange={(e) => setGraphicModalFilterSport(e.target.value as any)}
                  className="bg-slate-900 border border-slate-800 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Sports</option>
                  {ALL_SPORTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => handleSelectGraphicForAssignment(null)}
                className="text-xs text-rose-400 hover:text-rose-300 font-semibold px-2 py-1 rounded hover:bg-rose-950/30"
              >
                Unassign Graphic
              </button>
            </div>

            {/* Modal Grid of Graphics */}
            <div className="p-4 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredModalGraphics.length === 0 ? (
                <div className="col-span-2 py-12 text-center text-slate-400">
                  <Film className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  <p className="text-sm font-semibold">No graphics found.</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Try adjusting search keywords or creating a new design in Graphics Studio.
                  </p>
                </div>
              ) : (
                filteredModalGraphics.map((g) => {
                  const isCurrent = targetAssignmentForGraphic.assignedGraphicId === g.id;

                  return (
                    <div
                      key={g.id}
                      onClick={() => handleSelectGraphicForAssignment(g)}
                      className={`group p-3 rounded-xl border cursor-pointer transition-all duration-150 flex flex-col justify-between ${
                        isCurrent
                          ? 'bg-emerald-950/30 border-emerald-500 shadow-md ring-1 ring-emerald-500'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-xs font-bold text-white truncate group-hover:text-emerald-400 transition">
                            {g.name}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                            {g.sport}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                          <span className="text-emerald-400 font-semibold">{g.category || 'General'}</span>
                          <span>•</span>
                          <span>{g.elements?.length || 0} Elements</span>
                          <span>•</span>
                          <span>{g.positionPreset || 'Freeform'}</span>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                        <span className="text-[10px] text-slate-500">
                          {g.canvas?.width || 1920}x{g.canvas?.height || 1080}
                        </span>
                        <span
                          className={`font-bold text-[11px] ${
                            isCurrent ? 'text-emerald-400' : 'text-slate-400 group-hover:text-white'
                          }`}
                        >
                          {isCurrent ? '✓ Currently Assigned' : 'Select Graphic →'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
              <button
                onClick={() => setTargetAssignmentForGraphic(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
