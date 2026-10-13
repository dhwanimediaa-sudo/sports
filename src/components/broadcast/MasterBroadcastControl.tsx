import React, { useState, useEffect, useRef } from 'react';
import {
  Match,
  Tournament,
  SportType,
  OnAirState,
  OnAirGraphicItem,
  BroadcastConfig,
  BroadcastPreset,
  StudioGraphic,
  GraphicScene,
  OnAirPlaylist,
  GraphicAssignment,
} from '../../types';
import { api } from '../../services/api';
import { DualMonitorStage } from './DualMonitorStage';
import { TransportControlsBar } from './TransportControlsBar';
import { ManualEventTriggers } from './ManualEventTriggers';
import { InsertGraphicModal } from './InsertGraphicModal';
import { ActiveGraphicsMonitor } from './ActiveGraphicsMonitor';
import { EventTimeline } from './EventTimeline';
import { SavePresetModal } from './SavePresetModal';
import { UserGraphicsControlPanel } from './UserGraphicsControlPanel';
import { CricketEventControlPanel } from './CricketEventControlPanel';
import { BroadcastOutputUrlBox } from './BroadcastOutputUrlBox';
import { GraphicAssignmentManager } from '../admin/broadcast/GraphicAssignmentManager';
import { OnAirPlaylistManager } from '../admin/broadcast/OnAirPlaylistManager';
import { GraphicScenesManager } from '../admin/broadcast/GraphicScenesManager';
import { BroadcastAuditLogView } from './BroadcastAuditLogView';
import {
  Tv,
  Copy,
  Check,
  ExternalLink,
  Plus,
  RefreshCw,
  Save,
  Radio,
  Clock,
  Layers,
  ListOrdered,
  Film,
  Sparkles,
  Zap,
  Activity,
  AlertTriangle,
  Play,
  SkipForward,
  ChevronDown,
  Lock,
  Unlock,
  Keyboard,
  History,
  X,
  Sliders,
} from 'lucide-react';

interface MasterBroadcastControlProps {
  initialMatchId?: string;
  initialSport?: SportType;
}

export const MasterBroadcastControl: React.FC<MasterBroadcastControlProps> = ({
  initialMatchId,
  initialSport,
}) => {
  // Navigation & Selection State
  const [sport, setSport] = useState<SportType>(initialSport || 'CRICKET');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>(initialMatchId || '');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [scoringState, setScoringState] = useState<any>(null);

  // Broadcast & On-Air State
  const [onAirState, setOnAirState] = useState<OnAirState | null>(null);
  const [broadcastConfig, setBroadcastConfig] = useState<BroadcastConfig | null>(null);
  const [presets, setPresets] = useState<BroadcastPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');

  // Auxiliary Broadcast Collections
  const [customGraphics, setCustomGraphics] = useState<StudioGraphic[]>([]);
  const [scenes, setScenes] = useState<GraphicScene[]>([]);
  const [playlists, setPlaylists] = useState<OnAirPlaylist[]>([]);
  const [assignments, setAssignments] = useState<GraphicAssignment[]>([]);

  // SSE Stream Connection Status
  const [connectionStatus, setConnectionStatus] = useState<
    'CONNECTED' | 'CONNECTING' | 'OFFLINE' | 'RECONNECTING'
  >('CONNECTING');
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [syncSecondsAgo, setSyncSecondsAgo] = useState<string>('0.0s');

  // UI Modals & Actions
  const [isInsertModalOpen, setIsInsertModalOpen] = useState(false);
  const [isSavePresetModalOpen, setIsSavePresetModalOpen] = useState(false);
  const [isConfirmKillOpen, setIsConfirmKillOpen] = useState(false);
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Bottom Dock Active Tab
  const [dockTab, setDockTab] = useState<
    'graphics_control' | 'active_monitor' | 'timeline' | 'scenes' | 'playlist' | 'assignments' | 'audit_logs'
  >('graphics_control');

  const sseRef = useRef<EventSource | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Fetch initial tournaments & presets
  useEffect(() => {
    const initData = async () => {
      try {
        const [tournamentsRes, presetsRes, graphicsRes] = await Promise.all([
          api.getTournaments(),
          api.getBroadcastPresets(),
          api.getStudioGraphics(),
        ]);
        setTournaments(tournamentsRes.tournaments || []);
        setPresets(presetsRes.presets || []);
        setCustomGraphics(graphicsRes.graphics || []);

        // Filter tournaments matching current sport
        const sportTournaments = (tournamentsRes.tournaments || []).filter(
          (t) => t.sport === sport
        );
        if (sportTournaments.length > 0 && !selectedTournamentId) {
          setSelectedTournamentId(sportTournaments[0].id);
        }
      } catch (err) {
        console.error('Failed to initialize master broadcast data:', err);
      }
    };
    initData();
  }, [sport]);

  // 2. Fetch matches when tournament changes
  useEffect(() => {
    const loadMatches = async () => {
      if (!selectedTournamentId) return;
      try {
        const res = await api.getMatches({ tournamentId: selectedTournamentId });
        const tourMatches = res.matches || [];
        setMatches(tourMatches);
        if (tourMatches.length > 0 && (!selectedMatchId || !tourMatches.find((m) => m.id === selectedMatchId))) {
          setSelectedMatchId(tourMatches[0].id);
        }
      } catch (err) {
        console.error('Failed to load tournament matches:', err);
      }
    };
    loadMatches();
  }, [selectedTournamentId]);

  // 2.1 Calculate time since last synchronization
  useEffect(() => {
    const timer = setInterval(() => {
      const diff = Math.max(0, (Date.now() - lastSyncTime.getTime()) / 1000);
      setSyncSecondsAgo(`${diff.toFixed(1)}s`);
    }, 1000);
    return () => clearInterval(timer);
  }, [lastSyncTime]);

  // 3. Load Match Data, Scenes, Playlists, Assignments, and Subscribe to SSE with Exponential Backoff
  useEffect(() => {
    if (!selectedMatchId) return;

    let isMounted = true;
    let retryTimeout: NodeJS.Timeout | null = null;
    let retryCount = 0;
    const backoffDelays = [1000, 2000, 4000, 8000, 15000];

    const loadMatchDetails = async () => {
      try {
        setConnectionStatus('CONNECTING');
        const [matchRes, onAirRes, stateRes, scenesRes, playlistsRes, assignRes] = await Promise.all([
          api.getMatch(selectedMatchId),
          api.getOnAirState(selectedMatchId),
          api.getBroadcastState(selectedMatchId),
          api.getGraphicScenes(),
          api.getGraphicPlaylists({ sport }),
          api.getGraphicAssignments({ sport }),
        ]);

        if (!isMounted) return;

        setSelectedMatch(matchRes.match);
        setOnAirState(onAirRes.state);
        setBroadcastConfig(stateRes.broadcastConfig);
        setScoringState(stateRes.scoringState);
        setScenes(scenesRes.scenes || []);
        setPlaylists(playlistsRes.playlists || []);
        setAssignments(assignRes.assignments || []);
        setLastSyncTime(new Date());
      } catch (err) {
        console.error('Failed to load match broadcast data:', err);
        if (isMounted) setConnectionStatus('OFFLINE');
      }
    };

    loadMatchDetails();

    const connectSSE = () => {
      if (!isMounted) return;
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }

      setConnectionStatus(retryCount > 0 ? 'RECONNECTING' : 'CONNECTING');
      const sseUrl = `/api/matches/${selectedMatchId}/scoring/stream`;
      const es = new EventSource(sseUrl);
      sseRef.current = es;

      es.onopen = async () => {
        if (!isMounted) return;
        setConnectionStatus('CONNECTED');
        setLastSyncTime(new Date());

        // Reconnection reconciliation: revalidate match, broadcast, and on-air state
        // without clearing Program, Preview, or operator selections
        if (retryCount > 0) {
          try {
            const [matchRes, onAirRes, stateRes, playlistsRes] = await Promise.all([
              api.getMatch(selectedMatchId),
              api.getOnAirState(selectedMatchId),
              api.getBroadcastState(selectedMatchId),
              api.getGraphicPlaylists({ sport }),
            ]);
            if (isMounted) {
              if (matchRes?.match) setSelectedMatch(matchRes.match);
              if (onAirRes?.state) setOnAirState(onAirRes.state);
              if (stateRes?.broadcastConfig) setBroadcastConfig(stateRes.broadcastConfig);
              if (stateRes?.scoringState) setScoringState(stateRes.scoringState);
              if (playlistsRes?.playlists) setPlaylists(playlistsRes.playlists);
              setLastSyncTime(new Date());
            }
          } catch (revalidateErr) {
            console.warn('Reconnection revalidation warning:', revalidateErr);
          }
        }
        retryCount = 0;
      };

      es.onerror = () => {
        if (!isMounted) return;
        setConnectionStatus(retryCount >= 4 ? 'OFFLINE' : 'RECONNECTING');
        es.close();
        sseRef.current = null;

        const delay = backoffDelays[Math.min(retryCount, backoffDelays.length - 1)];
        retryCount++;
        retryTimeout = setTimeout(() => {
          connectSSE();
        }, delay);
      };

      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.onAirState) {
            setOnAirState(payload.onAirState);
          }
          if (payload.scoringState) {
            setScoringState(payload.scoringState);
          }
          if (payload.match) {
            setSelectedMatch(payload.match);
          }
          setLastSyncTime(new Date());
        } catch (e) {
          // parse error ignored
        }
      };
    };

    connectSSE();

    return () => {
      isMounted = false;
      if (retryTimeout) clearTimeout(retryTimeout);
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
    };
  }, [selectedMatchId, sport]);

  // Sync operator lock state from onAirState
  useEffect(() => {
    if (onAirState?.operatorLockState !== undefined) {
      setIsLocked(
        typeof onAirState.operatorLockState === 'object'
          ? Boolean((onAirState.operatorLockState as any).isLocked)
          : Boolean(onAirState.operatorLockState)
      );
    }
  }, [onAirState]);

  // Operator Lock Toggle
  const handleToggleOperatorLock = async () => {
    if (!selectedMatchId) return;
    try {
      const nextLocked = !isLocked;
      const res = await api.setBroadcastOperatorLock(selectedMatchId, nextLocked);
      setIsLocked(nextLocked);
      if (res.state) {
        setOnAirState(res.state);
      }
      showToast(
        nextLocked
          ? '🔒 Broadcast OPERATOR LOCKED. Live controls protected.'
          : '🔓 Broadcast UNLOCKED. Live controls active.'
      );
    } catch (err: any) {
      console.error('Failed to toggle lock:', err);
      showToast(err?.message || 'Failed to toggle operator lock');
    }
  };

  // 4. Transport execution wrapper
  const handleExecuteTransport = async (
    actionName: string,
    actionFn: () => Promise<{ state: OnAirState }>
  ) => {
    if (!selectedMatchId) return;
    if (isLocked && actionName !== 'LOCK') {
      showToast('⚠️ Broadcast is OPERATOR LOCKED. Unlock to execute live actions.');
      return;
    }
    try {
      setActionInProgress(actionName);
      const res = await actionFn();
      if (res && res.state) {
        setOnAirState(res.state);
      }
    } catch (err: any) {
      console.error(`Transport ${actionName} error:`, err);
      showToast(err?.message || `Failed to execute ${actionName}`);
    } finally {
      setActionInProgress(null);
    }
  };

  // Hardware transport handlers
  const handleTake = () =>
    handleExecuteTransport('TAKE', () =>
      api.takeLiveOnAir(selectedMatchId, onAirState?.previewGraphic || {})
    );

  const handleHold = () =>
    handleExecuteTransport('HOLD', () => api.holdOnAir(selectedMatchId));

  const handleClear = () => {
    const isGraphicActive = Boolean(onAirState?.currentGraphic || onAirState?.currentOnAir);
    if (isGraphicActive) {
      setIsConfirmClearOpen(true);
    } else {
      handleExecuteTransport('CLEAR', () => api.clearOnAir(selectedMatchId));
    }
  };

  const handleConfirmClear = () => {
    setIsConfirmClearOpen(false);
    handleExecuteTransport('CLEAR', () => api.clearOnAir(selectedMatchId));
  };

  const handleReplay = () =>
    handleExecuteTransport('REPLAY', () => api.replayOnAir(selectedMatchId));

  const handleNext = () =>
    handleExecuteTransport('NEXT', () => api.nextOnAir(selectedMatchId));

  const handleSkip = (index = 0) =>
    handleExecuteTransport('SKIP', () => api.skipOnAir(selectedMatchId, index));

  const handleKillAll = () => {
    setIsConfirmKillOpen(true);
  };

  const handleConfirmKillAll = () => {
    setIsConfirmKillOpen(false);
    handleExecuteTransport('KILL', () => api.stopOnAir(selectedMatchId));
  };

  // Manual Event Trigger handler
  const handleTriggerEvent = async (targetId: string, previewOnly = false) => {
    if (!selectedMatchId) return;
    try {
      const res = await api.triggerOnAirEvent(selectedMatchId, {
        sport,
        targetId,
        isManual: true,
        previewOnly,
      });
      if (res.state) {
        setOnAirState(res.state);
      }
      showToast(
        previewOnly
          ? `Cued to PREVIEW: ${targetId}`
          : res.message || `Triggered: ${targetId}`
      );
    } catch (err: any) {
      console.error('Trigger event error:', err);
      showToast(err?.message || 'Trigger failed');
    }
  };

  // Insert Graphic Handlers
  const handleCueToPreview = async (item: Partial<OnAirGraphicItem>) => {
    if (!selectedMatchId) return;
    try {
      const res = await api.setOnAirPreview(selectedMatchId, item);
      if (res.state) setOnAirState(res.state);
      showToast(`Cued to Preview: ${item.graphicName || item.eventName || 'Graphic'}`);
    } catch (err: any) {
      showToast(err?.message || 'Failed to cue to preview');
    }
  };

  const handleTakeDirectlyLive = async (item: Partial<OnAirGraphicItem>) => {
    if (!selectedMatchId) return;
    try {
      const res = await api.takeLiveOnAir(selectedMatchId, item);
      if (res.state) setOnAirState(res.state);
      showToast(`Taken Live: ${item.graphicName || item.eventName || 'Graphic'}`);
    } catch (err: any) {
      showToast(err?.message || 'Failed to take live');
    }
  };

  // Preset Save As handler
  const handleSavePreset = async (name: string, description: string) => {
    try {
      const payload = {
        name,
        description,
        config: {
          sport,
          assignments,
          scenes,
          playlists,
          broadcastConfig,
        },
      };
      const res = await api.createBroadcastPreset(payload);
      if (res.preset) {
        setPresets((prev) => [...prev, res.preset]);
        setSelectedPresetId(res.preset.id);
        showToast(`Preset "${name}" saved and added to library!`);
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to save preset.');
    }
  };

  const broadcastUrl = selectedMatchId
    ? `${window.location.origin}/broadcast/match/${selectedMatchId}`
    : '';

  const handleCopyUrl = () => {
    if (!broadcastUrl) return;
    navigator.clipboard.writeText(broadcastUrl);
    setCopiedUrl(true);
    showToast('Single broadcast output URL copied to clipboard!');
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2.5 bg-slate-900 border border-emerald-500/60 text-emerald-300 font-bold text-xs rounded-xl shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. MASTER BROADCAST HEADER & CONTROLS */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-slate-900/95 border-b border-slate-800 backdrop-blur-md px-4 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Brand & Connection Badge */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500 shadow-md">
              <Tv className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black text-white tracking-wider uppercase">
                  MASTER BROADCAST CONTROL CENTER
                </h1>
                {/* Live SSE Stream Connection Badge */}
                <div
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border transition ${
                    connectionStatus === 'CONNECTED'
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                      : connectionStatus === 'CONNECTING' || connectionStatus === 'RECONNECTING'
                      ? 'bg-amber-950/80 text-amber-300 border-amber-700'
                      : 'bg-red-950/80 text-red-300 border-red-700'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      connectionStatus === 'CONNECTED'
                        ? 'bg-emerald-400 animate-pulse'
                        : connectionStatus === 'CONNECTING' || connectionStatus === 'RECONNECTING'
                        ? 'bg-amber-400 animate-ping'
                        : 'bg-red-400'
                    }`}
                  />
                  <span>
                    {connectionStatus === 'CONNECTED'
                      ? 'LIVE STREAM CONNECTED'
                      : connectionStatus === 'CONNECTING'
                      ? 'CONNECTING...'
                      : connectionStatus === 'RECONNECTING'
                      ? 'AUTO-RECONNECTING'
                      : 'OFFLINE'}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                1920×1080 Real-time Dual-Bus Scoreboard, Scene & Rundown Master Engine
              </p>
            </div>
          </div>

          {/* Match & Sport Selector Controls */}
          <div className="flex items-center flex-wrap gap-2 text-xs">
            {/* Sport Selector */}
            <select
              value={sport}
              onChange={(e) => setSport(e.target.value as SportType)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-emerald-500"
            >
              <option value="CRICKET">🏏 Cricket</option>
              <option value="FOOTBALL">⚽ Football</option>
              <option value="KABADDI">🤼 Kabaddi</option>
              <option value="VOLLEYBALL">🏐 Volleyball</option>
              <option value="BASKETBALL">🏀 Basketball</option>
              <option value="TENNIS">🎾 Tennis</option>
              <option value="BADMINTON">🏸 Badminton</option>
              <option value="TABLE_TENNIS">🏓 Table Tennis</option>
              <option value="PICKLEBALL">🏓 Pickleball</option>
              <option value="FIELD_HOCKEY">🏑 Field Hockey</option>
              <option value="HANDBALL">🤾 Handball</option>
              <option value="SQUASH">🏸 Squash</option>
              <option value="CUSTOM">⚡ Custom Sport</option>
            </select>

            {/* Tournament Selector */}
            <select
              value={selectedTournamentId}
              onChange={(e) => setSelectedTournamentId(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 max-w-[160px] truncate"
            >
              <option value="">-- Select Tournament --</option>
              {tournaments
                .filter((t) => t.sport === sport)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </select>

            {/* Match Selector */}
            <select
              value={selectedMatchId}
              onChange={(e) => setSelectedMatchId(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-emerald-400 font-bold focus:outline-none focus:border-emerald-500 max-w-[200px] truncate"
            >
              <option value="">-- Select Live Match --</option>
              {matches.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.teamA?.name || 'Team A'} vs {m.teamB?.name || 'Team B'}{' '}
                  {m.status ? `(${m.status})` : ''}
                </option>
              ))}
            </select>

            {/* OBS Output Copy Button */}
            <button
              onClick={handleCopyUrl}
              disabled={!selectedMatchId}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition cursor-pointer disabled:opacity-40"
              title="Copy transparent 1920x1080 Browser Source URL for OBS or vMix"
            >
              {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedUrl ? 'COPIED' : 'COPY OBS URL'}</span>
            </button>

            {/* Standalone Pop-out */}
            {selectedMatchId && (
              <a
                href={broadcastUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                title="Open broadcast canvas popout"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            {/* Operator Lock Toggle Button */}
            <button
              id="btn-operator-lock-toggle"
              onClick={handleToggleOperatorLock}
              disabled={!selectedMatchId}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer border ${
                isLocked
                  ? 'bg-cyan-950 text-cyan-300 border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title={isLocked ? 'Broadcast is LOCKED. Click to unlock live controls.' : 'Click to LOCK broadcast controls to prevent accidental triggers.'}
            >
              {isLocked ? <Lock className="w-3.5 h-3.5 text-cyan-400" /> : <Unlock className="w-3.5 h-3.5" />}
              <span>{isLocked ? 'LOCKED' : 'LOCK'}</span>
            </button>

            {/* Keyboard Shortcuts Cheatsheet Button */}
            <button
              id="btn-keyboard-shortcuts"
              onClick={() => setIsShortcutsModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-bold text-xs transition cursor-pointer"
              title="View Hardware Keyboard Shortcuts (Space, H, C/Esc, R, N, S, K)"
            >
              <Keyboard className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">KEYS</span>
            </button>

            {/* Save Preset Buttons */}
            <button
              onClick={() => setIsSavePresetModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition shadow-md cursor-pointer"
              title="Save current layout, assignments, and rundown as reusable preset"
            >
              <Save className="w-3.5 h-3.5" />
              <span>SAVE AS PRESET</span>
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 1.5. COMPACT BROADCAST HEALTH & TELEMETRY STRIP (ITEM 11) */}
      {/* ========================================================================= */}
      <section className="bg-slate-950/90 border-b border-slate-800 px-4 py-1.5 font-mono text-[11px] overflow-x-auto shadow-inner">
        <div className="flex items-center gap-4 min-w-max">
          {/* SSE Connection Indicator */}
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'CONNECTED'
                  ? 'bg-emerald-400 animate-pulse'
                  : connectionStatus === 'RECONNECTING'
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-red-500'
              }`}
            />
            <span
              className={`font-black uppercase tracking-wider ${
                connectionStatus === 'CONNECTED'
                  ? 'text-emerald-400'
                  : connectionStatus === 'RECONNECTING'
                  ? 'text-amber-400'
                  : 'text-red-400'
              }`}
            >
              ● {connectionStatus}
            </span>
          </div>

          <span className="text-slate-700">|</span>

          {/* Server Status */}
          <div className="flex items-center gap-1 text-slate-300">
            <span className="text-slate-500">SERVER:</span>
            <span className={`font-bold ${connectionStatus === 'OFFLINE' ? 'text-red-400' : 'text-emerald-400'}`}>
              ● {connectionStatus === 'OFFLINE' ? 'OFFLINE' : 'ONLINE'}
            </span>
          </div>

          <span className="text-slate-700">|</span>

          {/* Match State */}
          <div className="flex items-center gap-1 text-slate-300">
            <span className="text-slate-500">MATCH:</span>
            <span className="font-bold text-cyan-400">
              ● {selectedMatch?.status || 'IN_PROGRESS'}
            </span>
          </div>

          <span className="text-slate-700">|</span>

          {/* Program State */}
          <div className="flex items-center gap-1 text-slate-300">
            <span className="text-slate-500">PROGRAM:</span>
            <span
              className={`font-bold truncate max-w-[150px] ${
                onAirState?.currentGraphic || onAirState?.currentOnAir
                  ? 'text-red-400'
                  : 'text-slate-500'
              }`}
              title={onAirState?.currentGraphic?.graphicName || onAirState?.currentOnAir?.graphicName || 'IDLE'}
            >
              ● {onAirState?.currentGraphic?.graphicName || onAirState?.currentOnAir?.graphicName || 'IDLE'}
            </span>
          </div>

          <span className="text-slate-700">|</span>

          {/* Preview State */}
          <div className="flex items-center gap-1 text-slate-300">
            <span className="text-slate-500">PREVIEW:</span>
            <span
              className={`font-bold truncate max-w-[150px] ${
                onAirState?.previewGraphic ? 'text-emerald-400' : 'text-slate-500'
              }`}
              title={onAirState?.previewGraphic?.graphicName || 'CLEAR'}
            >
              ● {onAirState?.previewGraphic?.graphicName || 'CLEAR'}
            </span>
          </div>

          <span className="text-slate-700">|</span>

          {/* Playlist / Rundown State */}
          <div className="flex items-center gap-1 text-slate-300">
            <span className="text-slate-500">RUNDOWN:</span>
            <span className="font-bold text-purple-400">
              ● {onAirState?.playlistStatus || 'IDLE'}
            </span>
          </div>

          <span className="text-slate-700">|</span>

          {/* Queue Count */}
          <div className="flex items-center gap-1 text-slate-300">
            <span className="text-slate-500">QUEUE:</span>
            <span className="font-bold text-amber-400">
              ● {onAirState?.queue?.length || 0}
            </span>
          </div>

          <span className="text-slate-700">|</span>

          {/* Last Event */}
          <div className="flex items-center gap-1 text-slate-300">
            <span className="text-slate-500">LAST EVENT:</span>
            <span
              className="font-bold text-slate-200 truncate max-w-[140px]"
              title={onAirState?.lastAction || 'READY'}
            >
              ● {onAirState?.lastAction || 'READY'}
            </span>
          </div>

          <span className="text-slate-700">|</span>

          {/* Last Sync Time */}
          <div className="flex items-center gap-1 text-slate-400">
            <span className="text-slate-500">SYNC:</span>
            <span className="font-bold text-slate-300">
              ● {syncSecondsAgo} AGO
            </span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 1.6. SINGLE LIVE BROADCAST OUTPUT URL STRIP */}
      {/* ========================================================================= */}
      {selectedMatchId && (
        <section className="bg-slate-950/80 px-3 sm:px-4 py-2 border-b border-slate-800">
          <BroadcastOutputUrlBox
            matchId={selectedMatchId}
            sport={sport}
            matchTitle={selectedMatch ? `${selectedMatch.teamA?.name || 'Team A'} vs ${selectedMatch.teamB?.name || 'Team B'}` : undefined}
          />
        </section>
      )}

      {/* ========================================================================= */}
      {/* 2. MAIN BROADCAST WORKSTATION (3-COLUMN LAYOUT) */}
      {/* ========================================================================= */}
      <main className="flex-1 p-3 lg:p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ========================================================= */}
        {/* LEFT COLUMN: LIVE MATCH DATA & MANUAL EVENT TRIGGERS (3 COLS) */}
        {/* ========================================================= */}
        <section className="lg:col-span-3 flex flex-col gap-3">
          {/* Live Match Summary Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-lg">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                LIVE SCORE FEED
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-bold">
                {selectedMatch?.status || 'IN_PROGRESS'}
              </span>
            </div>

            {/* Match Teams & Score Header */}
            <div className="space-y-1.5 font-mono">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-white truncate max-w-[120px]">
                  {selectedMatch?.teamA?.name || 'TEAM A'}
                </span>
                <span className="font-black text-emerald-400 text-sm">
                  {scoringState?.currentInnings?.score ?? 0}/{scoringState?.currentInnings?.wickets ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="truncate max-w-[120px]">{selectedMatch?.teamB?.name || 'TEAM B'}</span>
                <span className="text-[11px]">
                  Overs: {scoringState?.currentInnings?.overs ?? 0}.{scoringState?.currentInnings?.ballsInCurrentOver ?? 0}
                </span>
              </div>

              {/* CRICKET SPECIFIC METRICS */}
              {sport === 'CRICKET' && (
                <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                  <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
                    <span className="text-[9px] text-slate-500 block">CRR / RRR:</span>
                    <span className="font-bold text-cyan-400">
                      {Number(scoringState?.currentInnings?.runRate ?? scoringState?.currentRunRate ?? scoringState?.runRate ?? 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
                    <span className="text-[9px] text-slate-500 block">TARGET:</span>
                    <span className="font-bold text-amber-400">
                      {scoringState?.targetRuns ? `${scoringState.targetRuns}` : '1st Inn'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Manual Tactile Broadcast Event Triggers or Cricket Event Panel */}
          {sport === 'CRICKET' && selectedMatch ? (
            <div className="space-y-3">
              <CricketEventControlPanel
                match={selectedMatch}
                scoringState={scoringState}
                onScoringUpdated={async () => {
                  try {
                    const res = await api.getBroadcastState(selectedMatchId);
                    setScoringState(res.scoringState);
                    const onAirRes = await api.getOnAirState(selectedMatchId);
                    if (onAirRes?.state) setOnAirState(onAirRes.state);
                  } catch (e) {
                    console.error('Failed to reload scoring state:', e);
                  }
                }}
              />
              <details className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs">
                <summary className="text-slate-400 font-bold uppercase cursor-pointer hover:text-white flex items-center justify-between">
                  <span>Universal Quick Overlays (Generic)</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                </summary>
                <div className="pt-2">
                  <ManualEventTriggers
                    sport={sport}
                    onTriggerEvent={handleTriggerEvent}
                    disabled={!selectedMatchId}
                  />
                </div>
              </details>
            </div>
          ) : (
            <ManualEventTriggers
              sport={sport}
              onTriggerEvent={handleTriggerEvent}
              disabled={!selectedMatchId}
            />
          )}
        </section>

        {/* ========================================================= */}
        {/* CENTER COLUMN: DUAL BUS STAGE & HARDWARE TRANSPORTS (6 COLS) */}
        {/* ========================================================= */}
        <section className="lg:col-span-6 flex flex-col gap-3">
          {/* Dual Bus Monitors (PREVIEW & PROGRAM) */}
          <div className="flex-1">
            <DualMonitorStage
              matchId={selectedMatchId}
              sport={sport}
              match={selectedMatch}
              scoringState={scoringState}
              previewGraphic={onAirState?.previewGraphic || null}
              currentOnAir={onAirState?.currentGraphic || null}
              onTakePreviewToLive={handleTake}
              onClearOnAir={handleClear}
              onHoldOnAir={handleHold}
            />
          </div>

          {/* Tactile Hardware Transport Controls Bar */}
          <TransportControlsBar
            onTake={handleTake}
            onHold={handleHold}
            onClear={handleClear}
            onReplay={handleReplay}
            onNext={handleNext}
            onSkip={handleSkip}
            onKillAll={handleKillAll}
            isTakeDisabled={!onAirState?.previewGraphic && (!onAirState?.queue || onAirState.queue.length === 0)}
            isHolding={Boolean(onAirState?.currentGraphic?.isHeld || onAirState?.currentOnAir?.isHeld)}
            isOnAir={Boolean(onAirState?.currentGraphic || onAirState?.currentOnAir)}
            isQueueEmpty={!onAirState?.queue || onAirState.queue.length === 0}
            actionInProgress={actionInProgress}
            isLocked={isLocked}
          />
        </section>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: QUICK INSERTER, ACTIVE QUEUE & SCENES (3 COLS) */}
        {/* ========================================================= */}
        <section className="lg:col-span-3 flex flex-col gap-3">
          {/* Hero "+ INSERT GRAPHIC" Button */}
          <button
            id="btn-open-insert-graphic-modal"
            onClick={() => setIsInsertModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-slate-950 font-black text-sm rounded-xl shadow-xl shadow-emerald-950/60 transition active:scale-98 cursor-pointer"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
            <span className="tracking-wider text-white">+ INSERT GRAPHIC</span>
          </button>

          {/* Active On-Air Detail Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-lg font-mono">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase">
                ACTIVE ON-AIR DETAIL
              </span>
              {onAirState?.currentGraphic ? (
                <span className="text-[10px] px-2 py-0.5 rounded bg-red-950 text-red-300 font-bold border border-red-800">
                  ON AIR
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-500">
                  IDLE
                </span>
              )}
            </div>

            {onAirState?.currentGraphic ? (
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">TITLE / EVENT:</span>
                  <span className="font-black text-white text-sm">
                    {onAirState.currentGraphic.graphicName || onAirState.currentGraphic.eventName}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="bg-slate-950 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 block">PRIORITY:</span>
                    <span className="text-amber-400 font-bold">
                      P{onAirState.currentGraphic.priority || 50}
                    </span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 block">TIME LEFT:</span>
                    <span className="text-red-400 font-bold">
                      {onAirState.currentGraphic.isHeld
                        ? 'HOLD'
                        : `${onAirState.currentGraphic.remainingSeconds || 0}s`}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500 text-xs">
                No active graphic on air.
              </div>
            )}
          </div>

          {/* Live Queue Monitor */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-lg flex-1 flex flex-col font-mono min-h-[160px]">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase">
                ON-AIR QUEUE ({onAirState?.queue?.length || 0})
              </span>
              {onAirState?.queue && onAirState.queue.length > 0 && (
                <button
                  onClick={() => handleSkip(0)}
                  className="text-[10px] text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <SkipForward className="w-2.5 h-2.5" />
                  <span>Skip Top</span>
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[160px] pr-1">
              {!onAirState?.queue || onAirState.queue.length === 0 ? (
                <div className="text-center py-6 text-slate-600 text-xs">Queue is empty.</div>
              ) : (
                onAirState.queue.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-2 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-[10px] font-bold text-slate-500">#{idx + 1}</span>
                      <span className="font-bold text-white truncate">
                        {item.graphicName || item.eventName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] text-amber-400 font-bold">
                        {item.durationSeconds}s
                      </span>
                      <button
                        onClick={() => handleSkip(idx)}
                        className="p-1 rounded bg-slate-800 hover:bg-purple-900 text-purple-300 transition"
                        title="Skip this item"
                      >
                        <SkipForward className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>

      {/* ========================================================================= */}
      {/* 3. BOTTOM MULTI-VIEW DOCK (TABS: GRAPHICS CONTROL, ACTIVE MONITOR, TIMELINE, SCENES, PLAYLIST, ASSIGNMENTS) */}
      {/* ========================================================================= */}
      <section className="border-t border-slate-800 bg-slate-950 p-4">
        {/* Tab Selection Bar */}
        <div className="flex items-center gap-1 pb-3 mb-3 border-b border-slate-800 overflow-x-auto">
          {[
            { id: 'graphics_control', label: '1. GRAPHICS & OVERLAYS', icon: <Sliders className="w-4 h-4 text-cyan-400" /> },
            { id: 'active_monitor', label: '2. ACTIVE MONITOR', icon: <Activity className="w-4 h-4 text-emerald-400" /> },
            { id: 'timeline', label: '3. LIVE EVENT TIMELINE', icon: <Clock className="w-4 h-4 text-cyan-400" /> },
            { id: 'scenes', label: `4. GRAPHIC SCENES (${scenes.length})`, icon: <Layers className="w-4 h-4 text-blue-400" /> },
            { id: 'playlist', label: `5. PLAYLIST / RUNDOWN (${playlists.length})`, icon: <ListOrdered className="w-4 h-4 text-purple-400" /> },
            { id: 'assignments', label: '6. GRAPHIC ASSIGNMENTS', icon: <Film className="w-4 h-4 text-amber-400" /> },
            { id: 'audit_logs', label: '7. AUDIT & OPERATIONS LOG', icon: <History className="w-4 h-4 text-emerald-400" /> },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setDockTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition whitespace-nowrap cursor-pointer ${
                dockTab === t.id
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div className="min-h-[380px]">
          {dockTab === 'graphics_control' && (
            <UserGraphicsControlPanel
              matchId={selectedMatchId}
              sport={sport}
              onAirState={onAirState}
              customGraphics={customGraphics}
              scenes={scenes}
              assignments={assignments}
              match={selectedMatch}
              scoringState={scoringState}
              broadcastConfig={broadcastConfig}
              onStateChange={(nextState) => setOnAirState(nextState)}
              onConfigChange={(newCfg) => setBroadcastConfig(newCfg)}
            />
          )}

          {dockTab === 'active_monitor' && (
            <ActiveGraphicsMonitor
              onAirState={onAirState}
              onPreview={handleCueToPreview}
              onTakeLive={handleTakeDirectlyLive}
              onHold={handleHold}
              onReplay={handleReplay}
              onSkipQueued={handleSkip}
              onClearOnAir={handleClear}
              onCancelQueued={handleSkip}
            />
          )}

          {dockTab === 'timeline' && (
            <EventTimeline
              sport={sport}
              scoringState={scoringState}
              onTriggerEvent={handleTriggerEvent}
            />
          )}

          {dockTab === 'scenes' && (
            <GraphicScenesManager
              onPreviewScene={(scene) =>
                handleCueToPreview({
                  sceneId: scene.id,
                  sceneName: scene.name,
                  sourceType: 'SCENE',
                  durationSeconds: scene.durationSeconds || 6,
                })
              }
              onTakeLiveScene={(scene) =>
                handleTakeDirectlyLive({
                  sceneId: scene.id,
                  sceneName: scene.name,
                  sourceType: 'SCENE',
                  durationSeconds: scene.durationSeconds || 6,
                })
              }
            />
          )}

          {dockTab === 'playlist' && (
            <OnAirPlaylistManager
              onPreviewPlaylist={(pl) =>
                handleCueToPreview({
                  playlistId: pl.id,
                  sourceType: 'PLAYLIST',
                  graphicName: `Playlist: ${pl.name}`,
                  durationSeconds: 5,
                })
              }
              onTakeLivePlaylist={(pl) =>
                handleTakeDirectlyLive({
                  playlistId: pl.id,
                  sourceType: 'PLAYLIST',
                  graphicName: `Playlist: ${pl.name}`,
                  durationSeconds: 5,
                })
              }
            />
          )}

          {dockTab === 'assignments' && (
            <GraphicAssignmentManager initialSport={sport} />
          )}

          {dockTab === 'audit_logs' && (
            <BroadcastAuditLogView matchId={selectedMatchId} />
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. MODALS */}
      {/* ========================================================================= */}
      {/* Emergency KILL ALL Confirmation Modal */}
      {isConfirmKillOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/60 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2 rounded-xl bg-red-950 border border-red-800">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wider">
                  EMERGENCY KILL ALL?
                </h3>
                <p className="text-xs text-slate-400">Broadcast Program Bus Safety Cut</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This action will immediately <strong>cut the active on-air graphic</strong> and{' '}
              <strong>purge all queued items</strong> on the single broadcast output channel. Match scores and
              statistics will <em>not</em> be affected.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsConfirmKillOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                CANCEL
              </button>
              <button
                onClick={handleConfirmKillAll}
                className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-black text-xs transition shadow-lg shadow-red-950/80 cursor-pointer"
              >
                CONFIRM KILL ALL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Live Graphic Confirmation Modal */}
      {isConfirmClearOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/60 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="p-2 rounded-xl bg-amber-950 border border-amber-800">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wider">
                  CLEAR ACTIVE PROGRAM GRAPHIC?
                </h3>
                <p className="text-xs text-slate-400">Program Bus Cut Confirmation</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              A graphic (<strong>{onAirState?.currentGraphic?.graphicName || onAirState?.currentOnAir?.graphicName || 'Live Graphic'}</strong>) is currently active on Program. Cutting now will transition Program output to clear immediately.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsConfirmClearOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                CANCEL
              </button>
              <button
                onClick={handleConfirmClear}
                className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs transition shadow-lg shadow-amber-950/80 cursor-pointer"
              >
                CONFIRM CLEAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Cheatsheet Modal */}
      {isShortcutsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-emerald-400">
                <Keyboard className="w-5 h-5" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  BROADCAST HARDWARE KEYBOARD SHORTCUTS
                </h3>
              </div>
              <button
                onClick={() => setIsShortcutsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 text-xs">
              {[
                { key: 'SPACE', label: 'TAKE LIVE', desc: 'Transition Preview bus or top of rundown live to Program output' },
                { key: 'H / F1', label: 'HOLD', desc: 'Freeze or unfreeze auto-dismiss timer on active graphic' },
                { key: 'C / ESC', label: 'CLEAR', desc: 'Instantly cut active on-air graphic from Program bus' },
                { key: 'R', label: 'REPLAY', desc: 'Re-render graphic with freshly evaluated live scoring telemetry' },
                { key: 'N', label: 'NEXT', desc: 'Advance to next graphic in current rundown or playlist' },
                { key: 'S', label: 'SKIP', desc: 'Remove first pending item from queue without airing' },
                { key: 'K / DEL', label: 'KILL ALL', desc: 'Emergency cut Program bus and flush all pending queued graphics' },
              ].map((sc) => (
                <div key={sc.key} className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="flex items-center gap-3">
                    <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-emerald-300 font-bold text-[11px] min-w-[64px] text-center">
                      {sc.key}
                    </kbd>
                    <span className="font-bold text-white text-xs">{sc.label}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 max-w-[220px] text-right truncate" title={sc.desc}>
                    {sc.desc}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-slate-500 pt-2 border-t border-slate-800 text-center">
              Shortcuts are globally active except when typing in search bars or form inputs.
            </p>
          </div>
        </div>
      )}

      {/* Insert Graphic Modal */}
      <InsertGraphicModal
        isOpen={isInsertModalOpen}
        onClose={() => setIsInsertModalOpen(false)}
        sport={sport}
        customGraphics={customGraphics}
        scenes={scenes}
        playlists={playlists}
        onCueToPreview={handleCueToPreview}
        onTakeLive={handleTakeDirectlyLive}
      />

      {/* Save Preset Modal */}
      <SavePresetModal
        isOpen={isSavePresetModalOpen}
        onClose={() => setIsSavePresetModalOpen(false)}
        sport={sport}
        assignedCount={assignments.length}
        scenesCount={scenes.length}
        playlistsCount={playlists.length}
        onSavePreset={handleSavePreset}
        existingPresets={presets}
      />
    </div>
  );
};
