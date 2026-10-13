import React, { useState, useEffect, useRef } from 'react';
import {
  Match,
  Player,
  TennisMatchScoringState,
  TennisPointEvent,
  TennisPointType,
  TennisStrokeType,
  TennisPlayerStats,
  TennisTeamStats,
} from '../../types';
import { api } from '../../services/api';
import { useMatchStream } from '../../utils/useMatchStream';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
import {
  Trophy,
  RotateCcw,
  Undo2,
  Tv,
  CheckCircle2,
  Edit3,
  Activity,
  Award,
  Zap,
  Flame,
  FileText,
  Clock,
  ArrowRightLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Plus,
  Minus,
  AlertTriangle,
  Users,
  Shield,
} from 'lucide-react';

interface TennisScoringConsoleProps {
  match: Match;
  onMatchStatusChange?: () => void;
  onViewReport?: () => void;
}

export const TennisScoringConsole: React.FC<TennisScoringConsoleProps> = ({
  match,
  onMatchStatusChange,
  onViewReport,
}) => {
  const [state, setState] = useState<TennisMatchScoringState | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Active Tab in Scoring Console
  const [activeTab, setActiveTab] = useState<'court' | 'points' | 'stats' | 'adjustments'>('court');

  // Quick Point Config
  const [selectedWinnerTeamId, setSelectedWinnerTeamId] = useState<string>(match.teamAId);
  const [selectedWinnerPlayerId, setSelectedWinnerPlayerId] = useState<string>('');
  const [pointType, setPointType] = useState<TennisPointType>('WINNER');
  const [strokeType, setStrokeType] = useState<TennisStrokeType>('FOREHAND');
  const [serveNumber, setServeNumber] = useState<1 | 2>(1);
  const [rallyLength, setRallyLength] = useState<number>(3);
  const [serveSpeedKmh, setServeSpeedKmh] = useState<number | undefined>(undefined);
  const [netPoint, setNetPoint] = useState<boolean>(false);

  // Server selection modal
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [newServerPlayerId, setNewServerPlayerId] = useState<string>('');
  const [newServerTeamId, setNewServerTeamId] = useState<string>(match.teamAId);

  // Edit Point Modal
  const [editingPoint, setEditingPoint] = useState<TennisPointEvent | null>(null);
  const [isEditPointModalOpen, setIsEditPointModalOpen] = useState(false);
  const [editPointWinnerTeamId, setEditPointWinnerTeamId] = useState<string>('');
  const [editPointType, setEditPointType] = useState<TennisPointType>('WINNER');
  const [editStrokeType, setEditStrokeType] = useState<TennisStrokeType>('FOREHAND');

  // Broadcast banner toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Points filter
  const [pointsFilter, setPointsFilter] = useState<'ALL' | 'ACES' | 'DOUBLE_FAULTS' | 'BREAK_POINTS' | 'WINNERS'>('ALL');

  // Fetch scoring state
  const fetchScoringState = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.getTennisScoringState(match.id);
      if (res && res.state) {
        setState(res.state);
        // Default winner player if not set
        if (!selectedWinnerPlayerId) {
          const defaultTeamPlayers = res.state.teamAPlayers;
          if (defaultTeamPlayers && defaultTeamPlayers.length > 0) {
            setSelectedWinnerPlayerId(defaultTeamPlayers[0].id);
          }
        }
      }
    } catch (err: any) {
      console.error('Error fetching tennis state:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // SSE real-time listener with exponential backoff and deduplication
  useMatchStream({
    matchId: match.id,
    onMessage: (payload) => {
      if (payload.type === 'SCORING_UPDATE' || payload.type === 'TENNIS_STATE_UPDATE' || payload.type === 'STATE_UPDATE') {
        if (payload.scoringState) {
          setState(payload.scoringState);
        } else {
          fetchScoringState(true);
        }
      } else if (payload.gamesA !== undefined && payload.sets) {
        setState(payload);
      }
    },
  });

  useEffect(() => {
    fetchScoringState();
  }, [match.id]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Team players lookup
  const teamAPlayers = state?.teamAPlayers || [];
  const teamBPlayers = state?.teamBPlayers || [];
  const allPlayers = [...teamAPlayers, ...teamBPlayers];

  const getPlayerName = (id?: string) => {
    if (!id) return '';
    const p = allPlayers.find((player) => player.id === id);
    return p ? p.name : 'Player';
  };

  // Record a tennis point
  const handleRecordPoint = async (overridePointType?: TennisPointType, winnerTeamIdOverride?: string) => {
    if (actionLoading) return;
    setActionLoading(true);

    const winnerTeamId = winnerTeamIdOverride || selectedWinnerTeamId;
    const finalPointType = overridePointType || pointType;

    // Determine default player if not selected
    let winnerPlayerId = selectedWinnerPlayerId;
    if (!winnerPlayerId || (winnerTeamId === match.teamAId && !teamAPlayers.some(p => p.id === winnerPlayerId)) || (winnerTeamId === match.teamBId && !teamBPlayers.some(p => p.id === winnerPlayerId))) {
      const candidates = winnerTeamId === match.teamAId ? teamAPlayers : teamBPlayers;
      winnerPlayerId = candidates[0]?.id || '';
    }

    try {
      const payload = {
        pointWinnerTeamId: winnerTeamId,
        pointWinnerPlayerId: winnerPlayerId,
        pointType: finalPointType,
        strokeType: strokeType,
        serveNumber: serveNumber,
        rallyLength: rallyLength,
        serveSpeedKmh: serveSpeedKmh,
        netPoint: netPoint,
      };

      const res = await api.recordTennisPoint(match.id, payload);
      setState(res.state);
      showToast(`Point awarded to ${winnerTeamId === match.teamAId ? match.teamA?.name : match.teamB?.name} (${finalPointType.replace('_', ' ')})`);

      // Reset point transient modifiers
      setNetPoint(false);
      setServeNumber(1);
    } catch (err: any) {
      alert(err.message || 'Failed to record point');
    } finally {
      setActionLoading(false);
    }
  };

  // Quick Action Buttons
  const handleAce = (teamId: string) => {
    const isTeamA = teamId === match.teamAId;
    const player = isTeamA ? teamAPlayers[0]?.id : teamBPlayers[0]?.id;
    if (player) setSelectedWinnerPlayerId(player);
    setSelectedWinnerTeamId(teamId);
    setPointType('ACE');
    handleRecordPoint('ACE', teamId);
  };

  const handleDoubleFault = (serverTeamId: string) => {
    // Receiver team wins point on double fault
    const receiverTeamId = serverTeamId === match.teamAId ? match.teamBId : match.teamAId;
    const receiverPlayer = receiverTeamId === match.teamAId ? teamAPlayers[0]?.id : teamBPlayers[0]?.id;
    if (receiverPlayer) setSelectedWinnerPlayerId(receiverPlayer);
    setSelectedWinnerTeamId(receiverTeamId);
    setPointType('DOUBLE_FAULT');
    handleRecordPoint('DOUBLE_FAULT', receiverTeamId);
  };

  // Undo point
  const handleUndo = async () => {
    if (actionLoading) return;
    if (!window.confirm('Undo the last recorded point in this tennis match?')) return;
    setActionLoading(true);
    try {
      const res = await api.undoTennisPoint(match.id);
      setState(res.state);
      showToast('Previous point undone');
    } catch (err: any) {
      alert(err.message || 'Failed to undo point');
    } finally {
      setActionLoading(false);
    }
  };

  // Change Server
  const handleSaveServer = async () => {
    if (!newServerPlayerId) return;
    try {
      const res = await api.updateTennisServer(match.id, {
        serverPlayerId: newServerPlayerId,
        serverTeamId: newServerTeamId,
      });
      setState(res.state);
      setIsServerModalOpen(false);
      showToast(`Server updated to ${getPlayerName(newServerPlayerId)}`);
    } catch (err: any) {
      alert(err.message || 'Failed to change server');
    }
  };

  // Edit Point
  const handleOpenEditPoint = (pt: TennisPointEvent) => {
    setEditingPoint(pt);
    setEditPointWinnerTeamId(pt.pointWinnerTeamId);
    setEditPointType(pt.pointType);
    setEditStrokeType((pt.strokeType as TennisStrokeType) || 'FOREHAND');
    setIsEditPointModalOpen(true);
  };

  const handleSaveEditPoint = async () => {
    if (!editingPoint) return;
    try {
      const res = await api.editTennisEvent(match.id, {
        eventId: editingPoint.id,
        updates: {
          pointWinnerTeamId: editPointWinnerTeamId,
          pointType: editPointType,
          strokeType: editStrokeType,
        },
      });
      setState(res.state);
      setIsEditPointModalOpen(false);
      setEditingPoint(null);
      showToast('Point event updated successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to update point');
    }
  };

  // Broadcast graphics triggers
  const triggerBroadcastGraphic = async (type: string, data?: any) => {
    try {
      await api.triggerBroadcastEvent(match.id, {
        type,
        durationSeconds: 12,
        data,
      });
      showToast(`Broadcast graphic "${type}" triggered on Live URL!`);
    } catch (err: any) {
      alert(err.message || 'Failed to trigger graphic');
    }
  };

  if (loading && !state) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-950 text-slate-300 min-h-[400px]">
        <RefreshCw className="w-10 h-10 animate-spin text-emerald-500 mb-4" />
        <p className="font-semibold text-lg">Loading Tennis Live Scoring Engine...</p>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="p-8 text-center bg-slate-950 text-slate-300">
        <p>No active scoring state found for this tennis match.</p>
        <Button onClick={() => fetchScoringState()} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  // Filtered point events list
  const filteredPoints = (state.pointEvents || []).filter((pt) => {
    if (pointsFilter === 'ACES') return pt.pointType === 'ACE';
    if (pointsFilter === 'DOUBLE_FAULTS') return pt.pointType === 'DOUBLE_FAULTS';
    if (pointsFilter === 'BREAK_POINTS') return pt.isBreakPoint;
    if (pointsFilter === 'WINNERS') return pt.pointType === 'WINNER' || pt.pointType === 'ACE';
    return true;
  });

  const isTiebreak = state.isTiebreak;
  const isMatchComplete = state.isMatchComplete;
  const currentServerTeamId = state.currentServerTeamId;
  const currentServerPlayerId = state.currentServerPlayerId;

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen p-4 md:p-6 space-y-6">
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-emerald-400 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-100" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* TOP BAR: MATCH HEADER & STATUS */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 md:p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            🎾
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-white uppercase">
                {match.title || `${match.teamA?.name} vs ${match.teamB?.name}`}
              </h1>
              <Badge variant={isMatchComplete ? 'slate' : 'emerald'}>
                {isMatchComplete ? 'FINAL' : 'LIVE'}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {match.tennisConfig?.matchFormat?.replace('_', ' ') || 'BEST OF 3'} • {match.tennisConfig?.surface || 'HARD'} COURT • {match.tennisConfig?.courtName || 'Center Court'} • Set {state.currentSetIndex + 1}
            </p>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleUndo}
            disabled={actionLoading || (state.pointEvents && state.pointEvents.length === 0)}
            className="border-slate-700 hover:bg-slate-800 text-slate-300 flex items-center gap-1.5"
          >
            <Undo2 className="w-4 h-4 text-amber-400" /> Undo Point
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setNewServerTeamId(currentServerTeamId || match.teamAId);
              setNewServerPlayerId(currentServerPlayerId || teamAPlayers[0]?.id || '');
              setIsServerModalOpen(true);
            }}
            className="border-slate-700 hover:bg-slate-800 text-slate-300 flex items-center gap-1.5"
          >
            <ArrowRightLeft className="w-4 h-4 text-emerald-400" /> Change Server
          </Button>

          {onViewReport && (
            <Button
              size="sm"
              variant="outline"
              onClick={onViewReport}
              className="border-slate-700 hover:bg-slate-800 text-slate-300 flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4 text-cyan-400" /> Report & Stats
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => triggerBroadcastGraphic('TENNIS_SCOREBUG')}
            className="border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 flex items-center gap-1.5"
          >
            <Tv className="w-4 h-4 text-purple-400" /> Push Scorebug
          </Button>
        </div>
      </div>

      {/* MATCH WINNER BANNER */}
      {isMatchComplete && (
        <div className="p-4 bg-emerald-950/70 border border-emerald-500/50 rounded-2xl flex items-center justify-between text-emerald-200">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-400 animate-bounce" />
            <div>
              <h3 className="font-extrabold text-base tracking-wide text-white">MATCH COMPLETED</h3>
              <p className="text-xs text-emerald-300">
                Winner: <strong className="text-white">{state.matchWinnerTeamId === match.teamAId ? match.teamA?.name : match.teamB?.name}</strong> ({state.setScoreTeamA} - {state.setScoreTeamB} Sets)
              </p>
            </div>
          </div>
          {onViewReport && (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold" onClick={onViewReport}>
              View Full Match Scorecard
            </Button>
          )}
        </div>
      )}

      {/* MAIN SCOREBOARD DISPLAY */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {/* SCOREBOARD HEADER */}
        <div className="bg-slate-950/80 px-6 py-3 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <span>Official Grand Slam / Tour Scoreboard</span>
            {isTiebreak && (
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">
                TIE-BREAK
              </span>
            )}
          </div>
          <div className="flex items-center gap-6">
            <span className="w-16 text-center">SETS</span>
            <div className="flex items-center gap-2">
              {state.sets.map((_, idx) => (
                <span key={idx} className="w-8 text-center">S{idx + 1}</span>
              ))}
            </div>
            <span className="w-16 text-center text-emerald-400 font-bold">GAMES</span>
            <span className="w-20 text-center text-yellow-400 font-bold">POINTS</span>
          </div>
        </div>

        {/* TEAM A ROW */}
        <div className={`px-6 py-4 flex items-center justify-between border-b border-slate-800/60 transition-colors ${
          currentServerTeamId === match.teamAId ? 'bg-emerald-950/20' : 'bg-slate-900/40'
        }`}>
          <div className="flex items-center gap-3">
            {currentServerTeamId === match.teamAId ? (
              <span className="text-base animate-pulse" title="Serving">🎾</span>
            ) : (
              <span className="w-5 text-transparent">•</span>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-white tracking-wide">
                  {match.teamA?.name || 'Player / Team A'}
                </span>
                {match.teamA?.code && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                    {match.teamA.code}
                  </span>
                )}
              </div>
              {teamAPlayers.length > 0 && (
                <p className="text-xs text-slate-400">
                  {teamAPlayers.map(p => p.name).join(' / ')}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Sets Won */}
            <span className="w-16 text-center text-2xl font-black text-white">
              {state.setScoreTeamA}
            </span>

            {/* Set by Set Games */}
            <div className="flex items-center gap-2">
              {state.sets.map((s, idx) => (
                <span
                  key={idx}
                  className={`w-8 text-center text-lg font-mono font-bold ${
                    idx === state.currentSetIndex ? 'text-emerald-400' : 'text-slate-300'
                  }`}
                >
                  {s.gamesTeamA}{s.tiebreakPointsTeamA !== undefined ? <sup className="text-[10px] text-amber-400">{s.tiebreakPointsTeamA}</sup> : ''}
                </span>
              ))}
            </div>

            {/* Current Set Games */}
            <span className="w-16 text-center text-2xl font-black text-emerald-400 font-mono">
              {state.currentGameTeamA}
            </span>

            {/* Points / Score */}
            <span className="w-20 text-center text-2xl font-black text-yellow-400 font-mono bg-yellow-500/10 py-1 rounded-xl border border-yellow-500/20">
              {state.pointsTeamA}
            </span>
          </div>
        </div>

        {/* TEAM B ROW */}
        <div className={`px-6 py-4 flex items-center justify-between transition-colors ${
          currentServerTeamId === match.teamBId ? 'bg-emerald-950/20' : 'bg-slate-900/40'
        }`}>
          <div className="flex items-center gap-3">
            {currentServerTeamId === match.teamBId ? (
              <span className="text-base animate-pulse" title="Serving">🎾</span>
            ) : (
              <span className="w-5 text-transparent">•</span>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-white tracking-wide">
                  {match.teamB?.name || 'Player / Team B'}
                </span>
                {match.teamB?.code && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                    {match.teamB.code}
                  </span>
                )}
              </div>
              {teamBPlayers.length > 0 && (
                <p className="text-xs text-slate-400">
                  {teamBPlayers.map(p => p.name).join(' / ')}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Sets Won */}
            <span className="w-16 text-center text-2xl font-black text-white">
              {state.setScoreTeamB}
            </span>

            {/* Set by Set Games */}
            <div className="flex items-center gap-2">
              {state.sets.map((s, idx) => (
                <span
                  key={idx}
                  className={`w-8 text-center text-lg font-mono font-bold ${
                    idx === state.currentSetIndex ? 'text-emerald-400' : 'text-slate-300'
                  }`}
                >
                  {s.gamesTeamB}{s.tiebreakPointsTeamB !== undefined ? <sup className="text-[10px] text-amber-400">{s.tiebreakPointsTeamB}</sup> : ''}
                </span>
              ))}
            </div>

            {/* Current Set Games */}
            <span className="w-16 text-center text-2xl font-black text-emerald-400 font-mono">
              {state.currentGameTeamB}
            </span>

            {/* Points / Score */}
            <span className="w-20 text-center text-2xl font-black text-yellow-400 font-mono bg-yellow-500/10 py-1 rounded-xl border border-yellow-500/20">
              {state.pointsTeamB}
            </span>
          </div>
        </div>

        {/* SITUATION & GAME STATE BAR */}
        <div className="bg-slate-950 px-6 py-2.5 border-t border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="text-slate-400">Current Server:</span>
            <strong className="text-emerald-300 flex items-center gap-1.5">
              <span>🎾</span>
              {getPlayerName(currentServerPlayerId) || (currentServerTeamId === match.teamAId ? match.teamA?.name : match.teamB?.name)}
            </strong>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">Game Score:</span>
            <span className="font-mono font-bold text-white">
              {state.pointsTeamA} - {state.pointsTeamB}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {state.isMatchPoint && (
              <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 font-bold uppercase tracking-wider animate-pulse">
                🔥 MATCH POINT
              </span>
            )}
            {state.isSetPoint && !state.isMatchPoint && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold uppercase tracking-wider">
                ⚡ SET POINT
              </span>
            )}
            {state.isBreakPoint && !state.isSetPoint && !state.isMatchPoint && (
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold uppercase tracking-wider">
                🎯 BREAK POINT
              </span>
            )}
            {state.isGamePoint && !state.isBreakPoint && !state.isSetPoint && !state.isMatchPoint && (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold">
                GAME POINT
              </span>
            )}
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('court')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === 'court'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          🎮 Live Court Controls
        </button>
        <button
          onClick={() => setActiveTab('points')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === 'points'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          📋 Point-by-Point Ledger ({state.pointEvents?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === 'stats'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          📊 Head-to-Head Statistics
        </button>
        <button
          onClick={() => setActiveTab('adjustments')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === 'adjustments'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          📺 Broadcast Overlays
        </button>
      </div>

      {/* TAB 1: LIVE COURT SCORING CONTROLS */}
      {activeTab === 'court' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: RAPID POINT ENTRY PAD (8 COLS) */}
          <div className="lg:col-span-8 space-y-5">
            {/* BIG ACTION: AWARD POINT TO A OR B */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* AWARD TO TEAM A */}
              <div className="bg-gradient-to-br from-emerald-950/40 to-slate-900 border-2 border-emerald-500/40 rounded-2xl p-5 space-y-4 hover:border-emerald-500 transition-all shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    {match.teamA?.name || 'Player A'}
                  </span>
                  <span className="text-2xl font-black font-mono text-white">
                    {state.pointsTeamA}
                  </span>
                </div>

                <Button
                  size="lg"
                  onClick={() => {
                    setSelectedWinnerTeamId(match.teamAId);
                    handleRecordPoint(pointType, match.teamAId);
                  }}
                  disabled={actionLoading || isMatchComplete}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-base py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-5 h-5" /> POINT TO {match.teamA?.name || 'TEAM A'}
                </Button>

                {/* Quick specific buttons for Team A */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAce(match.teamAId)}
                    disabled={actionLoading || isMatchComplete}
                    className="border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-200 text-xs font-bold"
                  >
                    ⚡ Ace Team A
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedWinnerTeamId(match.teamAId);
                      setPointType('WINNER');
                      handleRecordPoint('WINNER', match.teamAId);
                    }}
                    disabled={actionLoading || isMatchComplete}
                    className="border-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-bold"
                  >
                    🎯 Winner Team A
                  </Button>
                </div>
              </div>

              {/* AWARD TO TEAM B */}
              <div className="bg-gradient-to-br from-cyan-950/40 to-slate-900 border-2 border-cyan-500/40 rounded-2xl p-5 space-y-4 hover:border-cyan-500 transition-all shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                    {match.teamB?.name || 'Player B'}
                  </span>
                  <span className="text-2xl font-black font-mono text-white">
                    {state.pointsTeamB}
                  </span>
                </div>

                <Button
                  size="lg"
                  onClick={() => {
                    setSelectedWinnerTeamId(match.teamBId);
                    handleRecordPoint(pointType, match.teamBId);
                  }}
                  disabled={actionLoading || isMatchComplete}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black text-base py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-5 h-5" /> POINT TO {match.teamB?.name || 'TEAM B'}
                </Button>

                {/* Quick specific buttons for Team B */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAce(match.teamBId)}
                    disabled={actionLoading || isMatchComplete}
                    className="border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-200 text-xs font-bold"
                  >
                    ⚡ Ace Team B
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedWinnerTeamId(match.teamBId);
                      setPointType('WINNER');
                      handleRecordPoint('WINNER', match.teamBId);
                    }}
                    disabled={actionLoading || isMatchComplete}
                    className="border-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-bold"
                  >
                    🎯 Winner Team B
                  </Button>
                </div>
              </div>
            </div>

            {/* POINT DETAILS & SHOT ATTRIBUTION */}
            <Card className="p-5 bg-slate-900/90 border-slate-800 space-y-4">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" /> Point Detail & Stroke Classification
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {/* Point Outcome Type */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase">
                    Point Outcome
                  </label>
                  <select
                    value={pointType}
                    onChange={(e) => setPointType(e.target.value as TennisPointType)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 font-medium focus:outline-none focus:border-emerald-500"
                  >
                    <option value="WINNER">Clean Winner</option>
                    <option value="ACE">Ace (Direct Serve)</option>
                    <option value="SERVICE_WINNER">Service Winner</option>
                    <option value="UNFORCED_ERROR">Opponent Unforced Error</option>
                    <option value="FORCED_ERROR">Opponent Forced Error</option>
                    <option value="DOUBLE_FAULT">Opponent Double Fault</option>
                    <option value="PENALTY">Penalty Point</option>
                  </select>
                </div>

                {/* Stroke Type */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase">
                    Stroke / Shot
                  </label>
                  <select
                    value={strokeType}
                    onChange={(e) => setStrokeType(e.target.value as TennisStrokeType)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 font-medium focus:outline-none focus:border-emerald-500"
                  >
                    <option value="FOREHAND">Forehand Drive</option>
                    <option value="BACKHAND">Backhand Drive</option>
                    <option value="VOLLEY">Volley</option>
                    <option value="OVERHEAD_SMASH">Overhead / Smash</option>
                    <option value="DROP_SHOT">Drop Shot</option>
                    <option value="LOB">Lob</option>
                    <option value="PASSING_SHOT">Passing Shot</option>
                    <option value="SERVE">Serve</option>
                  </select>
                </div>

                {/* Serve Number */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase">
                    Serve In Play
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setServeNumber(1)}
                      className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        serveNumber === 1
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      1st Serve
                    </button>
                    <button
                      type="button"
                      onClick={() => setServeNumber(2)}
                      className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        serveNumber === 2
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      2nd Serve
                    </button>
                  </div>
                </div>

                {/* Rally Length */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase">
                    Rally Length ({rallyLength} Shots)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setRallyLength(Math.max(1, rallyLength - 1))}
                      className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 hover:bg-slate-800 cursor-pointer text-xs font-bold"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={rallyLength}
                      onChange={(e) => setRallyLength(Number(e.target.value) || 1)}
                      className="w-full text-center py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setRallyLength(rallyLength + 1)}
                      className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 hover:bg-slate-800 cursor-pointer text-xs font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Extra Modifiers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-800/60">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <input
                    type="checkbox"
                    id="netPoint"
                    checked={netPoint}
                    onChange={(e) => setNetPoint(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 bg-slate-950 border-slate-800"
                  />
                  <label htmlFor="netPoint" className="text-xs text-slate-200 font-medium cursor-pointer">
                    Net Approach / Volley Play (Track Net Points Won)
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDoubleFault(currentServerTeamId || match.teamAId)}
                    disabled={actionLoading || isMatchComplete}
                    className="w-full border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs font-bold"
                  >
                    ⚠️ Record Double Fault on Server
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* RIGHT: LIVE MATCH SUMMARY & RECENT POINTS (4 COLS) */}
          <div className="lg:col-span-4 space-y-5">
            {/* RECENT POINTS MINI FEED */}
            <Card className="p-4 bg-slate-900/90 border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Recent Points
                </span>
                <span className="text-[10px] text-slate-500">
                  {state.pointEvents?.length || 0} Total
                </span>
              </div>

              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {(state.pointEvents || []).slice(-6).reverse().map((pt, idx) => {
                  const isTeamA = pt.pointWinnerTeamId === match.teamAId;
                  return (
                    <div
                      key={pt.id || idx}
                      className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isTeamA ? 'bg-emerald-400' : 'bg-cyan-400'
                            }`}
                          />
                          <strong className="text-white">
                            {isTeamA ? match.teamA?.name : match.teamB?.name}
                          </strong>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-semibold">
                            {pt.pointType.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Set {pt.setNumber} • Game {pt.gameNumber} • {pt.scoreAfterPointA}-{pt.scoreAfterPointB}
                          {pt.rallyLength ? ` • ${pt.rallyLength} shots` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditPoint(pt)}
                          className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded cursor-pointer"
                          title="Edit point"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {(!state.pointEvents || state.pointEvents.length === 0) && (
                  <p className="text-xs text-slate-500 py-6 text-center">
                    No points recorded yet. Use the buttons above to begin live scoring.
                  </p>
                )}
              </div>
            </Card>

            {/* QUICK STATS SNAPSHOT */}
            <Card className="p-4 bg-slate-900/90 border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Live Match Statistics
                </span>
                <span className="text-[10px] text-emerald-400 font-bold">Auto-derived</span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="font-bold text-emerald-400">{state.teamAStats?.aces || 0}</span>
                  <span className="text-slate-400">Aces</span>
                  <span className="font-bold text-cyan-400">{state.teamBStats?.aces || 0}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="font-bold text-emerald-400">{state.teamAStats?.doubleFaults || 0}</span>
                  <span className="text-slate-400">Double Faults</span>
                  <span className="font-bold text-cyan-400">{state.teamBStats?.doubleFaults || 0}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="font-bold text-emerald-400">{state.teamAStats?.winners || 0}</span>
                  <span className="text-slate-400">Winners</span>
                  <span className="font-bold text-cyan-400">{state.teamBStats?.winners || 0}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="font-bold text-emerald-400">{state.teamAStats?.breakPointsWon || 0}/{state.teamAStats?.breakPointOpportunities || 0}</span>
                  <span className="text-slate-400">Break Points Converted</span>
                  <span className="font-bold text-cyan-400">{state.teamBStats?.breakPointsWon || 0}/{state.teamBStats?.breakPointOpportunities || 0}</span>
                </div>

                <div className="flex justify-between py-1">
                  <span className="font-bold text-emerald-400">{state.teamAStats?.totalPointsWon || 0}</span>
                  <span className="text-slate-400">Total Points Won</span>
                  <span className="font-bold text-cyan-400">{state.teamBStats?.totalPointsWon || 0}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: POINT-BY-POINT AUDIT LEDGER */}
      {activeTab === 'points' && (
        <Card className="p-5 bg-slate-900 border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Full Immutable Point-by-Point Ledger
              </h3>
              <p className="text-xs text-slate-400">
                Every point recorded in this match with timestamp, score progression, and shot details.
              </p>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={pointsFilter}
                onChange={(e) => setPointsFilter(e.target.value as any)}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
              >
                <option value="ALL">All Points ({state.pointEvents?.length || 0})</option>
                <option value="ACES">Aces Only</option>
                <option value="DOUBLE_FAULTS">Double Faults Only</option>
                <option value="BREAK_POINTS">Break Points</option>
                <option value="WINNERS">Clean Winners</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Set</th>
                  <th className="py-2.5 px-3">Game</th>
                  <th className="py-2.5 px-3">Winner</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Stroke</th>
                  <th className="py-2.5 px-3">Serve</th>
                  <th className="py-2.5 px-3">Rally</th>
                  <th className="py-2.5 px-3">Score After</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredPoints.map((pt, idx) => {
                  const isTeamA = pt.pointWinnerTeamId === match.teamAId;
                  return (
                    <tr key={pt.id || idx} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono text-slate-500">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-300">Set {pt.setNumber}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">Game {pt.gameNumber}</td>
                      <td className="py-2.5 px-3">
                        <span className={`font-bold ${isTeamA ? 'text-emerald-400' : 'text-cyan-400'}`}>
                          {isTeamA ? match.teamA?.name : match.teamB?.name}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-semibold text-[11px]">
                          {pt.pointType.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">{pt.strokeType || '—'}</td>
                      <td className="py-2.5 px-3 text-slate-400">{pt.serveNumber ? `${pt.serveNumber}st` : '—'}</td>
                      <td className="py-2.5 px-3 text-slate-400 font-mono">{pt.rallyLength ? `${pt.rallyLength} shots` : '—'}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-yellow-400">
                        {pt.scoreAfterPointA} - {pt.scoreAfterPointB}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenEditPoint(pt)}
                          className="text-[10px] py-1 px-2 border-slate-700 text-slate-300 hover:bg-slate-800"
                        >
                          <Edit3 className="w-3 h-3 mr-1" /> Edit
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredPoints.length === 0 && (
              <p className="text-center text-xs text-slate-500 py-8">
                No matching point events found in ledger.
              </p>
            )}
          </div>
        </Card>
      )}

      {/* TAB 3: HEAD TO HEAD STATISTICS */}
      {activeTab === 'stats' && (
        <Card className="p-5 bg-slate-900 border-slate-800 space-y-6">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Head-to-Head Player & Match Analytics
              </h3>
              <p className="text-xs text-slate-400">
                Official ITF/ATP Standard Metrics derived dynamically from point events.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => triggerBroadcastGraphic('TENNIS_MATCH_STATS')}
              className="border-purple-500/40 text-purple-300 hover:bg-purple-500/20"
            >
              <Tv className="w-3.5 h-3.5 mr-1" /> Push Stats to Broadcast
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Team A Column */}
            <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30 space-y-3">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider text-center border-b border-slate-800 pb-2">
                {match.teamA?.name || 'Player A'}
              </h4>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Aces</span>
                  <span className="font-bold text-white">{state.teamAStats?.aces || 0}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Double Faults</span>
                  <span className="font-bold text-white">{state.teamAStats?.doubleFaults || 0}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">1st Serve In %</span>
                  <span className="font-bold text-white">{state.teamAStats?.firstServePercentage || 0}%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">1st Serve Points Won %</span>
                  <span className="font-bold text-white">{state.teamAStats?.firstServePointsWonPercentage || 0}%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">2nd Serve Points Won %</span>
                  <span className="font-bold text-white">{state.teamAStats?.secondServePointsWonPercentage || 0}%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Break Points Won</span>
                  <span className="font-bold text-white">{state.teamAStats?.breakPointsWon || 0} / {state.teamAStats?.breakPointOpportunities || 0}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Net Points Won</span>
                  <span className="font-bold text-white">{state.teamAStats?.netPointsWon || 0} / {state.teamAStats?.netPointsAttempted || 0}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Winners</span>
                  <span className="font-bold text-white">{state.teamAStats?.winners || 0}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Unforced Errors</span>
                  <span className="font-bold text-white">{state.teamAStats?.unforcedErrors || 0}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Total Points Won</span>
                  <span className="font-bold text-emerald-400">{state.teamAStats?.totalPointsWon || 0}</span>
                </div>
              </div>
            </div>

            {/* Metric Names Center Comparison */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3 flex flex-col justify-center text-center">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">
                Metric Comparison
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed py-2">
                Metrics are automatically calculated from every shot, point, and serve logged during the match.
              </p>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs text-left space-y-1.5">
                <p className="text-slate-300 font-semibold">Total Match Points: <strong className="text-white">{(state.teamAStats?.totalPointsWon || 0) + (state.teamBStats?.totalPointsWon || 0)}</strong></p>
                <p className="text-slate-300 font-semibold">Total Games Played: <strong className="text-white">{state.sets.reduce((sum, s) => sum + s.gamesTeamA + s.gamesTeamB, 0)}</strong></p>
                <p className="text-slate-300 font-semibold">Sets Completed: <strong className="text-white">{state.sets.filter(s => s.isCompleted).length}</strong></p>
              </div>
            </div>

            {/* Team B Column */}
            <div className="bg-slate-950 p-4 rounded-xl border border-cyan-500/30 space-y-3">
              <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider text-center border-b border-slate-800 pb-2">
                {match.teamB?.name || 'Player B'}
              </h4>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Aces</span>
                  <span className="font-bold text-white">{state.teamBStats?.aces || 0}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Double Faults</span>
                  <span className="font-bold text-white">{state.teamBStats?.doubleFaults || 0}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">1st Serve In %</span>
                  <span className="font-bold text-white">{state.teamBStats?.firstServePercentage || 0}%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">1st Serve Points Won %</span>
                  <span className="font-bold text-white">{state.teamBStats?.firstServePointsWonPercentage || 0}%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">2nd Serve Points Won %</span>
                  <span className="font-bold text-white">{state.teamBStats?.secondServePointsWonPercentage || 0}%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Break Points Won</span>
                  <span className="font-bold text-white">{state.teamBStats?.breakPointsWon || 0} / {state.teamBStats?.breakPointOpportunities || 0}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Net Points Won</span>
                  <span className="font-bold text-white">{state.teamBStats?.netPointsWon || 0} / {state.teamBStats?.netPointsAttempted || 0}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Winners</span>
                  <span className="font-bold text-white">{state.teamBStats?.winners || 0}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Unforced Errors</span>
                  <span className="font-bold text-white">{state.teamBStats?.unforcedErrors || 0}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Total Points Won</span>
                  <span className="font-bold text-cyan-400">{state.teamBStats?.totalPointsWon || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* TAB 4: BROADCAST GRAPHICS CONTROLS */}
      {activeTab === 'adjustments' && (
        <Card className="p-5 bg-slate-900 border-slate-800 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Tv className="w-4 h-4 text-purple-400" /> Dedicated Tennis Broadcast Engine
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Trigger broadcast graphics overlays to single OBS / vMix browser source URL.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <Button
              onClick={() => triggerBroadcastGraphic('TENNIS_SCOREBUG')}
              className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold py-3"
            >
              📺 Full Tennis Scorebug
            </Button>
            <Button
              onClick={() => triggerBroadcastGraphic('TENNIS_MATCH_STATS')}
              className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold py-3"
            >
              📊 Match Statistics Card
            </Button>
            <Button
              onClick={() => triggerBroadcastGraphic('TENNIS_SET_SUMMARY')}
              className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold py-3"
            >
              📑 Set Summary Overlay
            </Button>
            <Button
              onClick={() => triggerBroadcastGraphic('TENNIS_ACE_POPUP')}
              className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold py-3"
            >
              ⚡ Ace Alert Graphic
            </Button>
          </div>
        </Card>
      )}

      {/* MODAL 1: CHANGE SERVER */}
      <Dialog
        isOpen={isServerModalOpen}
        onClose={() => setIsServerModalOpen(false)}
        title="Select Active Tennis Server"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Serving Team</label>
            <select
              value={newServerTeamId}
              onChange={(e) => {
                const tId = e.target.value;
                setNewServerTeamId(tId);
                const teamPlayers = tId === match.teamAId ? teamAPlayers : teamBPlayers;
                setNewServerPlayerId(teamPlayers[0]?.id || '');
              }}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200"
            >
              <option value={match.teamAId}>{match.teamA?.name || 'Team A'}</option>
              <option value={match.teamBId}>{match.teamB?.name || 'Team B'}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Serving Player</label>
            <select
              value={newServerPlayerId}
              onChange={(e) => setNewServerPlayerId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200"
            >
              {(newServerTeamId === match.teamAId ? teamAPlayers : teamBPlayers).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button variant="outline" onClick={() => setIsServerModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveServer}>
              Update Server
            </Button>
          </div>
        </div>
      </Dialog>

      {/* MODAL 2: EDIT POINT */}
      <Dialog
        isOpen={isEditPointModalOpen}
        onClose={() => setIsEditPointModalOpen(false)}
        title="Edit Point Event in Ledger"
      >
        {editingPoint && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              Modifying an immutable point will trigger a clean re-calculation of all games, sets, and derived statistics from the beginning of the match.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Point Winner</label>
              <select
                value={editPointWinnerTeamId}
                onChange={(e) => setEditPointWinnerTeamId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200"
              >
                <option value={match.teamAId}>{match.teamA?.name || 'Team A'}</option>
                <option value={match.teamBId}>{match.teamB?.name || 'Team B'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Point Type</label>
              <select
                value={editPointType}
                onChange={(e) => setEditPointType(e.target.value as TennisPointType)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200"
              >
                <option value="WINNER">Winner</option>
                <option value="ACE">Ace</option>
                <option value="SERVICE_WINNER">Service Winner</option>
                <option value="UNFORCED_ERROR">Unforced Error</option>
                <option value="FORCED_ERROR">Forced Error</option>
                <option value="DOUBLE_FAULT">Double Fault</option>
                <option value="PENALTY">Penalty</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Stroke Type</label>
              <select
                value={editStrokeType}
                onChange={(e) => setEditStrokeType(e.target.value as TennisStrokeType)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200"
              >
                <option value="FOREHAND">Forehand</option>
                <option value="BACKHAND">Backhand</option>
                <option value="VOLLEY">Volley</option>
                <option value="OVERHEAD_SMASH">Overhead / Smash</option>
                <option value="DROP_SHOT">Drop Shot</option>
                <option value="LOB">Lob</option>
                <option value="PASSING_SHOT">Passing Shot</option>
                <option value="SERVE">Serve</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <Button variant="outline" onClick={() => setIsEditPointModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEditPoint}>
                Save & Recalculate State
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};
