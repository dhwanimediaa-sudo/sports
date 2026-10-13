import React, { useState, useEffect } from 'react';
import {
  Match,
  CricketMatchScoringState,
  BroadcastConfig,
  BroadcastTemplateStyle,
  ContainerShape,
  BroadcastFontStyle,
  BroadcastPosition,
  BroadcastPreset,
  SportType,
} from '../../types';
import { getSportEvents, getSportEventVisualInfo } from '../../constants/universalSportEvents';
import { api } from '../../services/api';
import { BroadcastCanvas } from './BroadcastCanvas';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { GraphicAssignmentManager } from '../admin/broadcast/GraphicAssignmentManager';
import { OnAirPlaylistManager } from '../admin/broadcast/OnAirPlaylistManager';
import { GraphicScenesManager } from '../admin/broadcast/GraphicScenesManager';
import { LiveOnAirConsole } from '../admin/broadcast/LiveOnAirConsole';
import { MasterBroadcastControl } from './MasterBroadcastControl';
import { UserGraphicsControlPanel } from './UserGraphicsControlPanel';
import { CricketEventControlPanel } from './CricketEventControlPanel';
import { BroadcastOutputUrlBox } from './BroadcastOutputUrlBox';
import {
  Tv,
  Copy,
  Check,
  Eye,
  EyeOff,
  Palette,
  Layout,
  Layers,
  Settings,
  Sparkles,
  Zap,
  Flame,
  Shield,
  ShieldAlert,
  Award,
  RefreshCw,
  Save,
  Sliders,
  Maximize2,
  Radio,
  ListOrdered,
  Film,
} from 'lucide-react';

interface BroadcastControlProps {
  match: Match;
}

export const BroadcastControl: React.FC<BroadcastControlProps> = ({ match }) => {
  const [config, setConfig] = useState<BroadcastConfig | null>(null);
  const [scoringState, setScoringState] = useState<any>(null);
  const [presets, setPresets] = useState<BroadcastPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Copy URL state
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Active Tab inside Broadcast Control Panel
  const [activeTab, setActiveTab] = useState<
    'master' | 'user_graphics' | 'onair' | 'assignments' | 'playlist' | 'scenes' | 'quick' | 'elements' | 'templates' | 'style' | 'presets'
  >('master');
  const [simulatorSport, setSimulatorSport] = useState<SportType>(match.sport || 'CRICKET');

  // Confirmation dialog state
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [savePresetName, setSavePresetName] = useState('');
  const [isSavePresetModalOpen, setIsSavePresetModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const broadcastUrl = `${window.location.origin}/broadcast/match/${match.id}`;

  // Fetch match broadcast config, scoring state, and presets
  const loadBroadcastData = async () => {
    try {
      setLoading(true);
      const [stateRes, presetsRes] = await Promise.all([
        api.getBroadcastState(match.id),
        api.getBroadcastPresets(),
      ]);
      setScoringState(stateRes.scoringState);
      setConfig(stateRes.broadcastConfig);
      setPresets(presetsRes.presets || []);
    } catch (err) {
      console.error('Failed to load broadcast config:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBroadcastData();
  }, [match.id]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(broadcastUrl);
    setCopiedUrl(true);
    showToast('Broadcast URL copied to clipboard!');
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const handleSaveConfig = async () => {
    if (!config) return;
    try {
      setSaving(true);
      const res = await api.saveBroadcastConfig(match.id, config);
      setConfig(res.config);
      showToast('Broadcast graphics configuration saved!');
    } catch (err) {
      console.error('Failed to save broadcast setup:', err);
      showToast('Error saving broadcast setup.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefault = async () => {
    try {
      const res = await api.resetBroadcastConfig(match.id);
      setConfig(res.config);
      setIsResetConfirmOpen(false);
      showToast('Reset configuration to default!');
    } catch (err) {
      console.error('Failed to reset config:', err);
    }
  };

  const handleTriggerTestEvent = async (type: string) => {
    try {
      await api.triggerBroadcastEvent(match.id, {
        type,
        durationSeconds: 3,
      });
      showToast(`Triggered test graphic event: ${type}`);
    } catch (err) {
      console.error('Failed to trigger test event:', err);
    }
  };

  const handleToggleManualOverlay = async (type: 'PLAYER_LOWER_THIRD' | 'SPONSOR' | 'NONE') => {
    if (!config) return;
    const newOverlay = config.activeManualOverlay === type ? 'NONE' : type;
    const updated = { ...config, activeManualOverlay: newOverlay };
    setConfig(updated);
    try {
      await api.triggerBroadcastEvent(match.id, {
        type: 'NONE',
        activeManualOverlay: newOverlay,
      });
    } catch (err) {
      console.error('Failed to update overlay:', err);
    }
  };

  const handleSavePreset = async () => {
    if (!savePresetName.trim() || !config) return;
    try {
      const res = await api.createBroadcastPreset({
        name: savePresetName.trim(),
        description: `Custom graphics preset created on ${new Date().toLocaleDateString()}`,
        config: {
          selectedTemplates: config.selectedTemplates,
          styleConfig: config.styleConfig,
          elementVisibility: config.elementVisibility,
        },
      });
      setPresets([...presets, res.preset]);
      setIsSavePresetModalOpen(false);
      setSavePresetName('');
      showToast(`Preset "${res.preset.name}" saved!`);
    } catch (err) {
      console.error('Failed to save preset:', err);
    }
  };

  const handleApplyPreset = (preset: BroadcastPreset) => {
    if (!config) return;
    const updated: BroadcastConfig = {
      ...config,
      selectedTemplates: {
        ...config.selectedTemplates,
        ...(preset.config.selectedTemplates || {}),
      },
      styleConfig: {
        ...config.styleConfig,
        ...(preset.config.styleConfig || {}),
      },
      elementVisibility: {
        ...config.elementVisibility,
        ...(preset.config.elementVisibility || {}),
      },
    };
    setConfig(updated);
    showToast(`Loaded preset "${preset.name}"`);
  };

  if (loading || !config) {
    return (
      <div className="p-12 text-center text-slate-400 font-medium">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-500" />
        Connecting to Broadcast Graphics Engine...
      </div>
    );
  }

  const templateStyles: { id: BroadcastTemplateStyle; name: string; desc: string }[] = [
    { id: 'MODERN_SPORTS', name: 'Modern Sports', desc: 'Sleek gradient headers & clean stats' },
    { id: 'MINIMAL', name: 'Minimal Oval', desc: 'Ultra-thin slate bar with high contrast' },
    { id: 'PREMIUM', name: 'Premium Gold', desc: 'Metallic luxury highlights & glass backdrop' },
    { id: 'NEON', name: 'Neon Cyber', desc: 'Futuristic glowing cyan & emerald borders' },
    { id: 'GLASS', name: 'Frosted Glass', desc: 'Blurry glassmorphism with white accents' },
    { id: 'CLASSIC_TV', name: 'Classic TV', desc: 'Traditional solid broadcast block layout' },
    { id: 'BOLD_SPORTS', name: 'Bold Sports', desc: 'Heavy uppercase display with high impact' },
    { id: 'COMPACT', name: 'Compact Pill', desc: 'Space-saving single-line ribbon' },
    { id: 'ROUNDED', name: 'Soft Rounded', desc: 'Friendly pill contours & smooth shapes' },
    { id: 'ANGULAR', name: 'Angular Slash', desc: '45-degree diagonal tech sports geometry' },
  ];

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-lg shadow-2xl font-bold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. SINGLE BROADCAST OUTPUT URL & OBS SETUP PANEL */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              MATCH BROADCAST GRAPHICS CENTER
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                OBS / vMix Ready
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Universal hardware-ready transparent canvas output and independent user controls.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-lg shadow-lg flex items-center gap-2 transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'SAVE SETUP'}</span>
            </button>
            <button
              onClick={() => setIsResetConfirmOpen(true)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm rounded-lg flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Single Dedicated Broadcast URL Box */}
        <BroadcastOutputUrlBox
          matchId={match.id}
          sport={match.sport}
          matchTitle={`${match.teamA?.name || 'Team A'} vs ${match.teamB?.name || 'Team B'}`}
        />
      </div>

      {/* 2. REALTIME LIVE GRAPHICS PREVIEW */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Maximize2 className="w-4 h-4 text-emerald-400" />
            LIVE GRAPHICS PREVIEW (TRANSPARENT CANVAS)
          </h3>
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Simulating OBS Canvas
          </span>
        </div>

        {/* Preview Container Box */}
        <div className="relative w-full aspect-video max-h-[380px] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-inner flex items-center justify-center">
          <BroadcastCanvas
            matchId={match.id}
            previewMode={true}
            previewConfigOverride={config}
            previewScoringStateOverride={scoringState || undefined}
          />
        </div>
      </div>

      {/* 3. BROADCAST CONTROL NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('master')}
          className={`px-4 py-2.5 rounded-lg font-black text-xs uppercase tracking-wider transition flex items-center gap-2 ${
            activeTab === 'master'
              ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-950/60 ring-1 ring-red-400'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
          <span>MASTER BROADCAST CENTER</span>
        </button>

        <button
          onClick={() => setActiveTab('user_graphics')}
          className={`px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition flex items-center gap-2 ${
            activeTab === 'user_graphics'
              ? 'bg-cyan-600 text-white shadow-md'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Graphics & Overlays</span>
        </button>

        <button
          onClick={() => setActiveTab('onair')}
          className={`px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition flex items-center gap-2 ${
            activeTab === 'onair'
              ? 'bg-red-600 text-white shadow-md shadow-red-950/60'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <span>Live Console</span>
        </button>

        <button
          onClick={() => setActiveTab('assignments')}
          className={`px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition flex items-center gap-2 ${
            activeTab === 'assignments'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Film className="w-4 h-4" />
          <span>Graphic Assignments</span>
        </button>

        <button
          onClick={() => setActiveTab('playlist')}
          className={`px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition flex items-center gap-2 ${
            activeTab === 'playlist'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <ListOrdered className="w-4 h-4" />
          <span>Playlist</span>
        </button>

        <button
          onClick={() => setActiveTab('scenes')}
          className={`px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition flex items-center gap-2 ${
            activeTab === 'scenes'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Graphic Scenes</span>
        </button>

        <button
          onClick={() => setActiveTab('quick')}
          className={`px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition flex items-center gap-2 ${
            activeTab === 'quick'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Quick Scorebug</span>
        </button>

        <button
          onClick={() => setActiveTab('elements')}
          className={`px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition flex items-center gap-2 ${
            activeTab === 'elements'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Element Toggles</span>
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition flex items-center gap-2 ${
            activeTab === 'templates'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Layout className="w-4 h-4" />
          <span>Templates</span>
        </button>

        <button
          onClick={() => setActiveTab('style')}
          className={`px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition flex items-center gap-2 ${
            activeTab === 'style'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Styles & Colors</span>
        </button>

        <button
          onClick={() => setActiveTab('presets')}
          className={`px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition flex items-center gap-2 ${
            activeTab === 'presets'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Presets</span>
        </button>
      </div>

      {/* TAB MASTER: UNIFIED MASTER BROADCAST CONTROL CENTER */}
      {activeTab === 'master' && (
        <MasterBroadcastControl initialMatchId={match.id} initialSport={match.sport} />
      )}

      {/* TAB USER GRAPHICS: INDEPENDENT USER-CONTROLLED GRAPHICS & CRICKET EVENTS */}
      {activeTab === 'user_graphics' && (
        <div className="space-y-6">
          <UserGraphicsControlPanel
            matchId={match.id}
            sport={match.sport}
            onAirState={null}
            match={match}
            scoringState={scoringState}
            broadcastConfig={config}
            onConfigChange={(newCfg) => setConfig(newCfg)}
          />
          {match.sport === 'CRICKET' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
              <CricketEventControlPanel
                match={match}
                scoringState={scoringState}
                onScoringUpdated={loadBroadcastData}
              />
            </div>
          )}
        </div>
      )}

      {/* TAB 0: LIVE ON-AIR MASTER CONSOLE */}
      {activeTab === 'onair' && (
        <LiveOnAirConsole matchId={match.id} sport={match.sport} />
      )}

      {/* TAB 0.1: GRAPHIC ASSIGNMENTS */}
      {activeTab === 'assignments' && (
        <GraphicAssignmentManager
          sport={match.sport}
          matchId={match.id}
          onSelectForLive={() => {
            setActiveTab('onair');
          }}
          onSelectForPreview={() => {
            setActiveTab('onair');
          }}
        />
      )}

      {/* TAB 0.2: PLAYLIST MANAGER */}
      {activeTab === 'playlist' && (
        <OnAirPlaylistManager
          sport={match.sport}
          matchId={match.id}
          onPlayItem={() => {
            setActiveTab('onair');
          }}
        />
      )}

      {/* TAB 0.3: GRAPHIC SCENES MANAGER */}
      {activeTab === 'scenes' && (
        <GraphicScenesManager
          sport={match.sport}
          matchId={match.id}
          onTakeSceneLive={() => {
            setActiveTab('onair');
          }}
          onPreviewScene={() => {
            setActiveTab('onair');
          }}
        />
      )}

      {/* TAB 1: QUICK CONTROLS & MANUAL TRIGGERS */}
      {activeTab === 'quick' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Main Overlay Visibility Toggles */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-400" />
              MAIN OVERLAY VISIBILITY
            </h4>

            <div className="space-y-3">
              <div className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div>
                  <div className="text-sm font-bold text-white">SCOREBOARD STRIP</div>
                  <div className="text-xs text-slate-400">Persistent match score strip</div>
                </div>
                <button
                  onClick={() => setConfig({ ...config, scoreboardVisible: !config.scoreboardVisible })}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-1.5 ${
                    config.scoreboardVisible ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {config.scoreboardVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  <span>{config.scoreboardVisible ? 'VISIBLE' : 'HIDDEN'}</span>
                </button>
              </div>

              <div className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div>
                  <div className="text-sm font-bold text-white">SPONSOR GRAPHIC</div>
                  <div className="text-xs text-slate-400">Top-right sponsor branding badge</div>
                </div>
                <button
                  onClick={() => setConfig({ ...config, sponsorVisible: !config.sponsorVisible })}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-1.5 ${
                    config.sponsorVisible ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {config.sponsorVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  <span>{config.sponsorVisible ? 'VISIBLE' : 'HIDDEN'}</span>
                </button>
              </div>

              <div className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div>
                  <div className="text-sm font-bold text-white">BATSMAN LOWER THIRD</div>
                  <div className="text-xs text-slate-400">On-demand lower third stats card</div>
                </div>
                <button
                  onClick={() => handleToggleManualOverlay('PLAYER_LOWER_THIRD')}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-1.5 ${
                    config.activeManualOverlay === 'PLAYER_LOWER_THIRD'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {config.activeManualOverlay === 'PLAYER_LOWER_THIRD' ? (
                    <Eye className="w-4 h-4" />
                  ) : (
                    <EyeOff className="w-4 h-4" />
                  )}
                  <span>{config.activeManualOverlay === 'PLAYER_LOWER_THIRD' ? 'ACTIVE' : 'OFF'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Universal Multi-Sport Event Animation & Trigger Engine */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  UNIVERSAL EVENT GRAPHICS TRIGGER & SIMULATOR
                </h4>
                <p className="text-xs text-slate-400">
                  Trigger isolated animated broadcast popups for {simulatorSport} on the 1920×1080 canvas.
                </p>
              </div>

              {/* Sport Selector for Test Simulator */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Sport:</span>
                <select
                  value={simulatorSport}
                  onChange={(e) => setSimulatorSport(e.target.value as SportType)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                >
                  <option value="CRICKET">Cricket</option>
                  <option value="FOOTBALL">Football / Soccer</option>
                  <option value="HOCKEY">Field Hockey</option>
                  <option value="KABADDI">Kabaddi</option>
                  <option value="VOLLEYBALL">Volleyball</option>
                  <option value="BASKETBALL">Basketball</option>
                  <option value="TENNIS">Tennis</option>
                  <option value="BADMINTON">Badminton</option>
                  <option value="TABLE_TENNIS">Table Tennis</option>
                  <option value="PICKLEBALL">Pickleball</option>
                  <option value="HANDBALL">Handball</option>
                  <option value="SQUASH">Squash</option>
                  <option value="CUSTOM">Custom / Multi-Sport</option>
                </select>
              </div>
            </div>

            {/* Dynamic Event Catalog for Selected Sport */}
            {(() => {
              const sportEvents = getSportEvents(simulatorSport);
              return (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-[420px] overflow-y-auto pr-1">
                  {sportEvents.map((evt) => {
                    const visual = getSportEventVisualInfo(simulatorSport, evt.eventType);
                    return (
                      <button
                        key={evt.id}
                        onClick={() => handleTriggerTestEvent(evt.eventType)}
                        className="group relative p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all duration-200 hover:scale-[1.02] shadow-md hover:shadow-lg overflow-hidden"
                        style={{
                          background: visual.gradientBackground,
                          borderColor: visual.badgeBorder,
                        }}
                      >
                        <div className="flex items-center justify-between gap-1 w-full mb-1">
                          <span
                            className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider font-mono shadow-sm"
                            style={{
                              backgroundColor: visual.badgeBg,
                              color: visual.badgeTextColor,
                            }}
                          >
                            {evt.category}
                          </span>
                          <span className="text-[9px] text-white/70 font-mono">P{evt.defaultPriority}</span>
                        </div>

                        <div className="flex items-center gap-2 my-1">
                          <span className="text-base">{visual.badgeText || '⚡'}</span>
                          <span className="text-xs font-black text-white truncate drop-shadow-sm">
                            {evt.defaultTitle || evt.name}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-white/80 mt-1 font-mono">
                          <span className="truncate">{evt.defaultDuration || 4}s hold</span>
                          <span className="text-emerald-300 font-bold group-hover:underline">TRIGGER</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* TAB 2: ELEMENT VISIBILITY TOGGLES */}
      {activeTab === 'elements' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                INDIVIDUAL SCOREBOARD ELEMENT TOGGLES
              </h4>
              <p className="text-xs text-slate-400">
                Turn specific data items ON or OFF on the broadcast output strip.
              </p>
            </div>
            <button
              onClick={() => {
                const allOn = Object.values(config.elementVisibility).every(Boolean);
                const nextVal = !allOn;
                const newVis = { ...config.elementVisibility };
                Object.keys(newVis).forEach((k) => {
                  (newVis as any)[k] = nextVal;
                });
                setConfig({ ...config, elementVisibility: newVis });
              }}
              className="text-xs text-emerald-400 hover:underline font-bold"
            >
              Toggle All
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(config.elementVisibility).map(([key, val]) => (
              <label
                key={key}
                className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition ${
                  val
                    ? 'bg-slate-950 border-emerald-500/50 text-white'
                    : 'bg-slate-950/40 border-slate-800 text-slate-500'
                }`}
              >
                <span className="text-xs font-bold capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <input
                  type="checkbox"
                  checked={val}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      elementVisibility: {
                        ...config.elementVisibility,
                        [key]: e.target.checked,
                      },
                    })
                  }
                  className="rounded text-emerald-500 focus:ring-0 bg-slate-800 border-slate-700"
                />
              </label>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: TEMPLATE SELECTION LIBRARY */}
      {activeTab === 'templates' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              GRAPHIC TEMPLATE SELECTION
            </h4>
            <p className="text-xs text-slate-400">
              Select different design styles for the scoreboard strip and event graphic popups.
            </p>
          </div>

          <div className="space-y-4">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Scoreboard Template Style
            </label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {templateStyles.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() =>
                    setConfig({
                      ...config,
                      selectedTemplates: {
                        ...config.selectedTemplates,
                        scoreboard: tpl.id,
                      },
                    })
                  }
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                    config.selectedTemplates.scoreboard === tpl.id
                      ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-lg'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="text-xs font-black text-white">{tpl.name}</span>
                  <span className="text-[10px] text-slate-400 mt-1 line-clamp-2">{tpl.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: STYLES, COLORS & SHAPES */}
      {activeTab === 'style' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">
            STYLING, COLORS & POSITIONING
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Colors */}
            <div className="space-y-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <h5 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Color Palette</h5>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Primary Background</label>
                  <input
                    type="color"
                    value={config.styleConfig.primaryColor}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        styleConfig: { ...config.styleConfig, primaryColor: e.target.value },
                      })
                    }
                    className="w-full h-10 bg-slate-900 border border-slate-700 rounded cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Accent Color</label>
                  <input
                    type="color"
                    value={config.styleConfig.accentColor}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        styleConfig: { ...config.styleConfig, accentColor: e.target.value },
                      })
                    }
                    className="w-full h-10 bg-slate-900 border border-slate-700 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Container Shape & Position */}
            <div className="space-y-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <h5 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Container Shape</h5>
              <div className="grid grid-cols-3 gap-2">
                {(['ROUNDED', 'RECTANGLE', 'PILL', 'CAPSULE', 'ANGULAR', 'GLASS'] as ContainerShape[]).map((shp) => (
                  <button
                    key={shp}
                    onClick={() =>
                      setConfig({
                        ...config,
                        styleConfig: { ...config.styleConfig, shape: shp },
                      })
                    }
                    className={`py-2 px-3 rounded text-xs font-bold border ${
                      config.styleConfig.shape === shp
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    {shp}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: PRESETS */}
      {activeTab === 'presets' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">GRAPHICS PRESETS</h4>
              <p className="text-xs text-slate-400">Save current match setup or load pre-built broadcast styles.</p>
            </div>
            <button
              onClick={() => setIsSavePresetModalOpen(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow"
            >
              <Save className="w-4 h-4" />
              <span>SAVE NEW PRESET</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {presets.map((p) => (
              <div key={p.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="font-black text-sm text-white">{p.name}</div>
                <div className="text-xs text-slate-400">{p.description}</div>
                <button
                  onClick={() => handleApplyPreset(p)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs rounded-lg border border-emerald-500/30 transition"
                >
                  APPLY PRESET
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Dialogs & Modals */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        title="Reset Broadcast Configuration?"
        message="Are you sure you want to reset all broadcast graphic settings for this match to default? Saved presets will not be deleted."
        confirmText="Yes, Reset Default"
        confirmVariant="danger"
        onConfirm={handleResetDefault}
        onCancel={() => setIsResetConfirmOpen(false)}
      />

      {isSavePresetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-lg font-black text-white">Save Graphics Preset</h3>
            <p className="text-xs text-slate-400">
              Save current templates, colors, and element toggles as a reusable preset.
            </p>

            <input
              type="text"
              placeholder="e.g., Kerala Premier League Style"
              value={savePresetName}
              onChange={(e) => setSavePresetName(e.target.value)}
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:border-emerald-500 focus:outline-none"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsSavePresetModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 font-bold text-xs rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePreset}
                disabled={!savePresetName.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow"
              >
                Save Preset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
