import React, { useState, useEffect, useRef } from 'react';
import {
  Match,
  Player,
  BasketballMatchScoringState,
  BasketballScoringEvent,
  BasketballEventType,
  BasketballShotType,
  BasketballReboundType,
  BasketballTurnoverType,
  BasketballFoulType,
  BasketballPlayerStats,
  BasketballTeamStats,
} from '../../types';
import { api } from '../../services/api';
import { useMatchStream } from '../../utils/useMatchStream';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
import {
  Clock,
  Play,
  Pause,
  RotateCcw,
  Undo2,
  Trophy,
  Shield,
  UserCheck,
  AlertTriangle,
  Flame,
  Zap,
  Activity,
  ArrowRightLeft,
  Tv,
  CheckCircle2,
  Edit3,
  TrendingUp,
  FileText,
  ChevronRight,
  Filter,
  RefreshCw,
  Plus,
  Minus,
  Timer,
  Award,
} from 'lucide-react';

interface BasketballScoringConsoleProps {
  match: Match;
  onMatchStatusChange?: () => void;
  onViewReport?: () => void;
}

export const BasketballScoringConsole: React.FC<BasketballScoringConsoleProps> = ({
  match,
  onMatchStatusChange,
  onViewReport,
}) => {
  const [state, setState] = useState<BasketballMatchScoringState | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string>(match.teamAId);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [selectedAssistPlayerId, setSelectedAssistPlayerId] = useState<string>('');

  // Active Tab in Scoring Console
  const [activeTab, setActiveTab] = useState<'court' | 'events' | 'boxscore' | 'adjustments'>('court');

  // Modals
  const [isFoulModalOpen, setIsFoulModalOpen] = useState(false);
  const [foulType, setFoulType] = useState<BasketballFoulType>('PERSONAL');
  const [freeThrowsAwarded, setFreeThrowsAwarded] = useState<number>(0);

  const [isTurnoverModalOpen, setIsTurnoverModalOpen] = useState(false);
  const [turnoverType, setTurnoverType] = useState<BasketballTurnoverType>('BAD_PASS');

  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [subPlayerOutId, setSubPlayerOutId] = useState<string>('');
  const [subPlayerInId, setSubPlayerInId] = useState<string>('');

  const [isEditEventModalOpen, setIsEditEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<BasketballScoringEvent | null>(null);
  const [editNotes, setEditNotes] = useState('');

  const [isClockAdjustModalOpen, setIsClockAdjustModalOpen] = useState(false);
  const [adjustMinutes, setAdjustMinutes] = useState(10);
  const [adjustSeconds, setAdjustSeconds] = useState(0);
  const [adjustShotClock, setAdjustShotClock] = useState(24);

  // Events filter
  const [eventFilter, setEventFilter] = useState<'ALL' | 'POINTS' | 'FOULS' | 'TURNOVERS' | 'TIMEOUTS'>('ALL');

  // Clock Ticking Ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initial fetch and SSE subscription
  const fetchScoringState = async () => {
    try {
      const res = await api.getMatchScoring(match.id);
      setState(res.state as BasketballMatchScoringState);
    } catch (err) {
      console.error('Failed to fetch basketball scoring state:', err);
    } finally {
      setLoading(false);
    }
  };

  // SSE connection with exponential reconnect and deduplication
  useMatchStream({
    matchId: match.id,
    onMessage: (data) => {
      if (data.type === 'INITIAL_STATE' || data.type === 'SCORING_UPDATE') {
        if (data.state) {
          setState(data.state as BasketballMatchScoringState);
        } else if (data.scoringState) {
          setState(data.scoringState as BasketballMatchScoringState);
        }
      } else if (data.teamAScore !== undefined && data.clock) {
        setState(data as BasketballMatchScoringState);
      }
    },
  });

  useEffect(() => {
    fetchScoringState();
  }, [match.id]);

  // Local clock interval simulation when clock is running
  useEffect(() => {
    if (state?.clock.isClockRunning) {
      timerRef.current = setInterval(() => {
        setState((prev) => {
          if (!prev || !prev.clock.isClockRunning) return prev;
          const nextGameTime = Math.max(0, prev.clock.gameTimeRemainingSeconds - 1);
          let nextShotClock = prev.clock.shotClockRemainingSeconds;
          if (prev.clock.isShotClockRunning && nextShotClock > 0) {
            nextShotClock = Math.max(0, nextShotClock - 1);
          }
          return {
            ...prev,
            clock: {
              ...prev.clock,
              gameTimeRemainingSeconds: nextGameTime,
              shotClockRemainingSeconds: nextShotClock,
            },
          };
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state?.clock.isClockRunning, state?.clock.isShotClockRunning]);

  // Set default selected player when team changes
  useEffect(() => {
    if (state) {
      const teamPlayers = selectedTeamId === match.teamAId ? state.teamAPlayers : state.teamBPlayers;
      if (teamPlayers && teamPlayers.length > 0 && !selectedPlayerId) {
        setSelectedPlayerId(teamPlayers[0].id);
      }
    }
  }, [selectedTeamId, state]);

  // Clock Actions
  const handleToggleGameClock = async () => {
    if (!state) return;
    const newRunning = !state.clock.isClockRunning;
    try {
      await api.updateBasketballClock(match.id, {
        isClockRunning: newRunning,
        isShotClockRunning: newRunning,
        gameTimeRemainingSeconds: state.clock.gameTimeRemainingSeconds,
        shotClockRemainingSeconds: state.clock.shotClockRemainingSeconds,
      });
      fetchScoringState();
    } catch (err: any) {
      alert(err.message || 'Failed to update clock');
    }
  };

  const handleToggleShotClock = async () => {
    if (!state) return;
    try {
      await api.updateBasketballClock(match.id, {
        isShotClockRunning: !state.clock.isShotClockRunning,
      });
      fetchScoringState();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle shot clock');
    }
  };

  const handleResetShotClock = async (duration: number) => {
    try {
      await api.resetBasketballShotClock(match.id, duration);
      fetchScoringState();
    } catch (err: any) {
      alert(err.message || 'Failed to reset shot clock');
    }
  };

  const handleTogglePossession = async () => {
    if (!state) return;
    const nextPossession = state.clock.possessionTeamId === match.teamAId ? match.teamBId : match.teamAId;
    try {
      await api.updateBasketballClock(match.id, {
        possessionTeamId: nextPossession,
      });
      fetchScoringState();
    } catch (err: any) {
      alert(err.message || 'Failed to switch possession');
    }
  };

  const handleSaveClockAdjust = async () => {
    const totalGameSeconds = adjustMinutes * 60 + adjustSeconds;
    try {
      await api.updateBasketballClock(match.id, {
        gameTimeRemainingSeconds: totalGameSeconds,
        shotClockRemainingSeconds: adjustShotClock,
      });
      setIsClockAdjustModalOpen(false);
      fetchScoringState();
    } catch (err: any) {
      alert(err.message || 'Failed to adjust clocks');
    }
  };

  // Quarter Transitions
  const handleAdvanceQuarter = async () => {
    if (!state) return;
    const currentQ = state.clock.currentQuarter || 1;
    const confirmNext = window.confirm(`Advance from Q${currentQ} to next Quarter / Overtime?`);
    if (!confirmNext) return;

    try {
      await api.advanceBasketballQuarter(match.id, {
        action: 'NEXT_QUARTER',
        targetQuarter: currentQ + 1,
      });
      fetchScoringState();
    } catch (err: any) {
      alert(err.message || 'Failed to advance quarter');
    }
  };

  const handleCompleteMatch = async () => {
    const confirmDone = window.confirm('Finalize and complete this basketball match?');
    if (!confirmDone) return;

    try {
      await api.advanceBasketballQuarter(match.id, {
        action: 'COMPLETE_MATCH',
      });
      fetchScoringState();
      if (onMatchStatusChange) onMatchStatusChange();
    } catch (err: any) {
      alert(err.message || 'Failed to complete match');
    }
  };

  // Scoring Event Record
  const handleRecordEvent = async (
    eventType: BasketballEventType,
    extraPayload: Partial<Record<string, any>> = {}
  ) => {
    if (!state || actionLoading || state.isMatchComplete) return;
    setActionLoading(true);

    try {
      await api.recordBasketballEvent(match.id, {
        eventType,
        teamId: selectedTeamId,
        playerId: selectedPlayerId || undefined,
        assistPlayerId: selectedAssistPlayerId || undefined,
        gameTimeRemainingSeconds: state.clock.gameTimeRemainingSeconds,
        shotClockRemainingSeconds: state.clock.shotClockRemainingSeconds,
        possessionTeamId: state.clock.possessionTeamId,
        ...extraPayload,
      });

      // Clear assist after point
      if (eventType === 'SCORE_2PT' || eventType === 'SCORE_3PT') {
        setSelectedAssistPlayerId('');
      }

      fetchScoringState();
    } catch (err: any) {
      alert(err.message || `Failed to record ${eventType}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Undo Last Event
  const handleUndo = async () => {
    const confirmUndo = window.confirm('Undo the last recorded event?');
    if (!confirmUndo) return;

    try {
      await api.undoBasketballEvent(match.id);
      fetchScoringState();
    } catch (err: any) {
      alert(err.message || 'Failed to undo last event');
    }
  };

  // Timeout Action
  const handleRecordTimeout = async (type: 'FULL' | '30_SEC' | 'OFFICIAL') => {
    handleRecordEvent('TIMEOUT', { timeoutType: type });
  };

  // Foul Action Submit
  const handleRecordFoul = async () => {
    if (!selectedPlayerId) {
      alert('Please select a player who committed the foul.');
      return;
    }
    const eventType =
      foulType === 'SHOOTING'
        ? 'FOUL_SHOOTING'
        : foulType === 'OFFENSIVE'
        ? 'FOUL_OFFENSIVE'
        : foulType === 'TECHNICAL'
        ? 'FOUL_TECHNICAL'
        : foulType === 'FLAGRANT'
        ? 'FOUL_FLAGRANT'
        : 'FOUL_PERSONAL';

    await handleRecordEvent(eventType, {
      foulType,
      freeThrowsAwarded: freeThrowsAwarded > 0 ? freeThrowsAwarded : undefined,
    });
    setIsFoulModalOpen(false);
    setFreeThrowsAwarded(0);
  };

  // Turnover Action Submit
  const handleRecordTurnover = async () => {
    await handleRecordEvent('TURNOVER', { turnoverType });
    setIsTurnoverModalOpen(false);
  };

  // Substitution Submit
  const handleRecordSubstitution = async () => {
    if (!subPlayerInId || !subPlayerOutId) {
      alert('Please select both outgoing and incoming players.');
      return;
    }
    await handleRecordEvent('SUBSTITUTION', {
      playerInId: subPlayerInId,
      playerOutId: subPlayerOutId,
    });
    setIsSubModalOpen(false);
    setSubPlayerInId('');
    setSubPlayerOutId('');
  };

  // Edit Event
  const handleSaveEditedEvent = async () => {
    if (!editingEvent) return;
    try {
      await api.editBasketballEvent(match.id, {
        eventId: editingEvent.id,
        updates: {
          notes: editNotes,
        },
      });
      setIsEditEventModalOpen(false);
      setEditingEvent(null);
      fetchScoringState();
    } catch (err: any) {
      alert(err.message || 'Failed to edit event');
    }
  };

  if (loading || !state) {
    return (
      <div className="p-12 text-center space-y-3 bg-slate-900/60 rounded-2xl border border-slate-800">
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
        <p className="text-sm font-semibold text-slate-300">Connecting to Basketball Live Engine...</p>
      </div>
    );
  }

  const isTeamA = selectedTeamId === match.teamAId;
  const currentTeam = isTeamA ? match.teamA : match.teamB;
  const currentTeamPlayers = isTeamA ? state.teamAPlayers : state.teamBPlayers;
  const selectedPlayer = currentTeamPlayers.find((p) => p.id === selectedPlayerId);

  // Time format calculations
  const gameMinutes = Math.floor(state.clock.gameTimeRemainingSeconds / 60);
  const gameSecs = state.clock.gameTimeRemainingSeconds % 60;
  const formattedGameTime = `${String(gameMinutes).padStart(2, '0')}:${String(gameSecs).padStart(2, '0')}`;

  // Filter events
  const filteredEvents = (state.events || []).filter((e) => {
    if (eventFilter === 'POINTS') return e.pointsScored > 0;
    if (eventFilter === 'FOULS') return e.eventType.startsWith('FOUL');
    if (eventFilter === 'TURNOVERS') return e.eventType === 'TURNOVER' || e.eventType === 'SHOT_CLOCK_VIOLATION';
    if (eventFilter === 'TIMEOUTS') return e.eventType === 'TIMEOUT';
    return true;
  });

  return (
    <div className="space-y-4">
      {/* 1. TOP LIVE SCOREBOARD & CLOCK CONSOLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl text-white">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          {/* Team A Panel */}
          <div
            onClick={() => setSelectedTeamId(match.teamAId)}
            className={`lg:col-span-4 p-3 rounded-xl cursor-pointer transition-all border ${
              selectedTeamId === match.teamAId
                ? 'bg-gradient-to-r from-amber-500/20 to-slate-900 border-amber-500/50 shadow-lg'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-black text-amber-400 text-lg">
                  {match.teamA?.shortName || 'A'}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-100 text-base leading-tight flex items-center gap-1.5">
                    {match.teamA?.name}
                    {state.clock.possessionTeamId === match.teamAId && (
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping inline-block" title="Possession" />
                    )}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 font-medium">
                    <span>Fouls: <strong className="text-amber-300">{state.teamAFoulsThisQuarter}</strong></span>
                    <span>•</span>
                    <span>TOs: <strong className="text-slate-200">{state.teamATimeoutsRemaining}</strong></span>
                    {state.teamA_inBonus && (
                      <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/30">
                        BONUS
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-4xl font-black text-amber-400 tabular-nums">{state.teamAScore}</div>
            </div>
          </div>

          {/* Center Clock & Period Master Control */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center text-center p-2 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-xs px-2.5 py-0.5 bg-amber-500/10 text-amber-400 border-amber-500/30 font-extrabold">
                {state.clock.quarterName}
              </Badge>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {state.matchStatus}
              </span>
            </div>

            {/* Main Game Time Display & Shot Clock */}
            <div className="flex items-center justify-center gap-6">
              <div>
                <div className="text-3xl lg:text-4xl font-black tracking-tight text-slate-100 font-mono">
                  {formattedGameTime}
                </div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Game Clock</p>
              </div>

              <div className="h-10 w-px bg-slate-800" />

              <div>
                <div
                  className={`text-3xl lg:text-4xl font-black tracking-tight font-mono ${
                    state.clock.shotClockRemainingSeconds <= 5
                      ? 'text-rose-500 animate-pulse'
                      : state.clock.shotClockRemainingSeconds <= 10
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {state.clock.shotClockRemainingSeconds}s
                </div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Shot Clock</p>
              </div>
            </div>

            {/* Quick Clock Controllers */}
            <div className="flex items-center gap-1.5 flex-wrap justify-center pt-1">
              <Button
                variant={state.clock.isClockRunning ? 'danger' : 'primary'}
                size="sm"
                onClick={handleToggleGameClock}
                className="h-7 text-xs px-2.5 font-bold"
                icon={state.clock.isClockRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              >
                {state.clock.isClockRunning ? 'Stop Clock' : 'Start Clock'}
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleResetShotClock(24)}
                className="h-7 text-xs px-2 font-bold"
                title="Reset Shot Clock to 24s"
              >
                24s
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleResetShotClock(14)}
                className="h-7 text-xs px-2 font-bold"
                title="Reset Shot Clock to 14s (Offensive Rebound)"
              >
                14s
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleTogglePossession}
                className="h-7 text-xs px-2 font-bold text-slate-300"
                title="Switch Possession Arrow"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAdjustMinutes(Math.floor(state.clock.gameTimeRemainingSeconds / 60));
                  setAdjustSeconds(state.clock.gameTimeRemainingSeconds % 60);
                  setAdjustShotClock(state.clock.shotClockRemainingSeconds);
                  setIsClockAdjustModalOpen(true);
                }}
                className="h-7 text-xs px-2 text-slate-400 hover:text-slate-200"
                title="Custom Clock Adjustments"
              >
                <Timer className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Team B Panel */}
          <div
            onClick={() => setSelectedTeamId(match.teamBId)}
            className={`lg:col-span-4 p-3 rounded-xl cursor-pointer transition-all border ${
              selectedTeamId === match.teamBId
                ? 'bg-gradient-to-l from-sky-500/20 to-slate-900 border-sky-500/50 shadow-lg'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="text-4xl font-black text-sky-400 tabular-nums order-last lg:order-first">
                {state.teamBScore}
              </div>
              <div className="flex items-center gap-3 text-right">
                <div>
                  <h3 className="font-extrabold text-slate-100 text-base leading-tight flex items-center justify-end gap-1.5">
                    {state.clock.possessionTeamId === match.teamBId && (
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping inline-block" title="Possession" />
                    )}
                    {match.teamB?.name}
                  </h3>
                  <div className="flex items-center justify-end gap-2 text-xs text-slate-400 mt-0.5 font-medium">
                    {state.teamB_inBonus && (
                      <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/30">
                        BONUS
                      </span>
                    )}
                    <span>Fouls: <strong className="text-sky-300">{state.teamBFoulsThisQuarter}</strong></span>
                    <span>•</span>
                    <span>TOs: <strong className="text-slate-200">{state.teamBTimeoutsRemaining}</strong></span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center font-black text-sky-400 text-lg">
                  {match.teamB?.shortName || 'B'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Period Scores Matrix Bar */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px]">Quarter Scores:</span>
            <div className="flex items-center gap-2">
              {state.periodScores.map((ps) => (
                <div
                  key={ps.quarter}
                  className={`px-2.5 py-1 rounded-lg border font-mono ${
                    ps.quarter === state.clock.currentQuarter
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 font-bold'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300'
                  }`}
                >
                  <span className="text-[10px] text-slate-400 mr-1.5">{ps.quarterName}:</span>
                  <span>{ps.teamAScore} - {ps.teamBScore}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAdvanceQuarter}
              className="h-7 text-xs border-amber-500/30 text-amber-300 hover:bg-amber-500/10 font-bold"
            >
              Advance Quarter ({state.clock.quarterName} → Q{state.clock.currentQuarter + 1})
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCompleteMatch}
              className="h-7 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200"
            >
              End Match
            </Button>
            {onViewReport && (
              <Button
                variant="primary"
                size="sm"
                onClick={onViewReport}
                icon={<FileText className="w-3.5 h-3.5" />}
                className="h-7 text-xs font-bold"
              >
                Match Report
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 2. NAVIGATION TABS */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('court')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'court'
                ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Live Scoring Console
          </button>
          <button
            onClick={() => setActiveTab('boxscore')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'boxscore'
                ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Live Box Score
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'events'
                ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Play-by-Play Stream ({state.events.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndo}
            disabled={state.events.length === 0 || actionLoading}
            className="h-8 text-xs text-rose-300 border-rose-500/30 hover:bg-rose-500/10 font-bold"
            icon={<Undo2 className="w-3.5 h-3.5" />}
          >
            Undo Last Action
          </Button>
        </div>
      </div>

      {/* 3. TAB 1: LIVE SCORING CONSOLE */}
      {activeTab === 'court' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Panel: Selected Team & Active Players Roster */}
          <div className="lg:col-span-4 space-y-4">
            {/* Team Selector Segmented Control */}
            <div className="bg-slate-900 p-1.5 rounded-xl border border-slate-800 grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setSelectedTeamId(match.teamAId)}
                className={`py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                  selectedTeamId === match.teamAId
                    ? 'bg-amber-500 text-slate-950 shadow font-extrabold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                {match.teamA?.name}
              </button>
              <button
                onClick={() => setSelectedTeamId(match.teamBId)}
                className={`py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                  selectedTeamId === match.teamBId
                    ? 'bg-sky-500 text-slate-950 shadow font-extrabold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                {match.teamB?.name}
              </button>
            </div>

            {/* Players on Court List */}
            <Card className="p-3 bg-slate-900 border-slate-800 space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Select Active Player ({currentTeam?.name})
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSubModalOpen(true)}
                  className="h-6 text-[11px] px-2 text-amber-400 border-amber-500/30"
                >
                  + Substitution
                </Button>
              </div>

              <div className="space-y-1 max-h-[360px] overflow-y-auto pr-1">
                {currentTeamPlayers.map((player) => {
                  const pStats = state.playerStats.find((p) => p.playerId === player.id);
                  const isSelected = selectedPlayerId === player.id;
                  const isFouledOut = pStats ? pStats.personalFouls >= state.rules.playerFoulLimit : false;

                  return (
                    <div
                      key={player.id}
                      onClick={() => !isFouledOut && setSelectedPlayerId(player.id)}
                      className={`p-2 rounded-xl text-xs flex items-center justify-between cursor-pointer border transition-all ${
                        isSelected
                          ? isTeamA
                            ? 'bg-amber-500/20 border-amber-500/60 text-amber-200 shadow'
                            : 'bg-sky-500/20 border-sky-500/60 text-sky-200 shadow'
                          : isFouledOut
                          ? 'bg-rose-950/20 border-rose-900/40 text-slate-500 opacity-60 cursor-not-allowed'
                          : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-6 h-6 rounded-lg font-bold font-mono text-[11px] flex items-center justify-center ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          #{player.jerseyNumber || '-'}
                        </span>
                        <div>
                          <p className="font-bold text-slate-200 leading-tight flex items-center gap-1.5">
                            {player.name}
                            {isFouledOut && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                FOULED OUT
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-slate-400">{player.role || 'Player'}</p>
                        </div>
                      </div>

                      {/* Stat summary pills */}
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span className="text-amber-400 font-bold" title="Points Scored">
                          {pStats?.points || 0} pts
                        </span>
                        <span className="text-slate-400" title="Rebounds">
                          {pStats?.totalRebounds || 0} reb
                        </span>
                        <span className="text-sky-400" title="Assists">
                          {pStats?.assists || 0} ast
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            (pStats?.personalFouls || 0) >= state.rules.playerFoulLimit - 1
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                          title="Personal Fouls"
                        >
                          {pStats?.personalFouls || 0} PF
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Optional: Assist Selector */}
            <Card className="p-3 bg-slate-900 border-slate-800 space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Assisted By (Optional for 2PT / 3PT Made)
              </span>
              <select
                value={selectedAssistPlayerId}
                onChange={(e) => setSelectedAssistPlayerId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="">-- No Assist (Unassisted Shot) --</option>
                {currentTeamPlayers
                  .filter((p) => p.id !== selectedPlayerId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.jerseyNumber} {p.name}
                    </option>
                  ))}
              </select>
            </Card>
          </div>

          {/* Center & Right Panel: Primary Action Keypad */}
          <div className="lg:col-span-8 space-y-4">
            {/* Primary Scoring Action Keypad */}
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span className="font-extrabold text-sm text-slate-200">
                    Shot & Scoring Engine
                  </span>
                </div>
                {selectedPlayer && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    Active: #{selectedPlayer.jerseyNumber} {selectedPlayer.name}
                  </span>
                )}
              </div>

              {/* Point Made Buttons (Primary Large) */}
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  1. Points Made (Adds to Score & Resets Shot Clock)
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => handleRecordEvent('SCORE_1PT', { shotType: '1PT_FREE_THROW' })}
                    disabled={actionLoading}
                    className="p-4 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-lg text-center transition-all transform active:scale-95 disabled:opacity-50"
                  >
                    <div className="text-2xl lg:text-3xl font-black font-mono">+1 PT</div>
                    <div className="text-xs font-bold text-emerald-100 mt-0.5">Free Throw Made</div>
                  </button>

                  <button
                    onClick={() => handleRecordEvent('SCORE_2PT', { shotType: '2PT_JUMP_SHOT' })}
                    disabled={actionLoading}
                    className="p-4 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white shadow-lg text-center transition-all transform active:scale-95 disabled:opacity-50"
                  >
                    <div className="text-2xl lg:text-3xl font-black font-mono">+2 PTS</div>
                    <div className="text-xs font-bold text-amber-100 mt-0.5">2-Point Field Goal</div>
                  </button>

                  <button
                    onClick={() => handleRecordEvent('SCORE_3PT', { shotType: '3PT_JUMP_SHOT' })}
                    disabled={actionLoading}
                    className="p-4 rounded-2xl bg-gradient-to-br from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white shadow-lg text-center transition-all transform active:scale-95 disabled:opacity-50"
                  >
                    <div className="text-2xl lg:text-3xl font-black font-mono">+3 PTS</div>
                    <div className="text-xs font-bold text-rose-100 mt-0.5">3-Point Shot</div>
                  </button>
                </div>
              </div>

              {/* Special Shot Variations */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleRecordEvent('SCORE_2PT', { shotType: '2PT_LAYUP' })}
                  className="font-bold text-xs bg-slate-950 hover:bg-slate-800 text-amber-300 border border-slate-800"
                >
                  Layup (+2)
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleRecordEvent('SCORE_2PT', { shotType: '2PT_DUNK' })}
                  className="font-bold text-xs bg-slate-950 hover:bg-slate-800 text-amber-300 border border-slate-800"
                >
                  ⚡ Slam Dunk (+2)
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleRecordEvent('MISS_2PT', { shotType: '2PT_JUMP_SHOT' })}
                  className="font-bold text-xs bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-800"
                >
                  Missed 2PT
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleRecordEvent('MISS_3PT', { shotType: '3PT_JUMP_SHOT' })}
                  className="font-bold text-xs bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-800"
                >
                  Missed 3PT
                </Button>
              </div>

              {/* Advanced Possession & Ball Events */}
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  2. Ball Events & Defensive Statistics
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  <Button
                    variant="outline"
                    onClick={() => handleRecordEvent('REBOUND', { reboundType: 'DEFENSIVE' })}
                    className="p-3 bg-slate-950/80 hover:bg-slate-800 border-slate-800 text-left flex flex-col items-start h-auto"
                  >
                    <span className="text-xs font-black text-sky-300">Def Rebound</span>
                    <span className="text-[10px] text-slate-400">Resets to 24s</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => handleRecordEvent('REBOUND', { reboundType: 'OFFENSIVE' })}
                    className="p-3 bg-slate-950/80 hover:bg-slate-800 border-slate-800 text-left flex flex-col items-start h-auto"
                  >
                    <span className="text-xs font-black text-amber-300">Off Rebound</span>
                    <span className="text-[10px] text-slate-400">Resets to 14s</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => handleRecordEvent('STEAL')}
                    className="p-3 bg-slate-950/80 hover:bg-slate-800 border-slate-800 text-left flex flex-col items-start h-auto"
                  >
                    <span className="text-xs font-black text-emerald-300">Steal</span>
                    <span className="text-[10px] text-slate-400">Flips Possession</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => handleRecordEvent('BLOCK')}
                    className="p-3 bg-slate-950/80 hover:bg-slate-800 border-slate-800 text-left flex flex-col items-start h-auto"
                  >
                    <span className="text-xs font-black text-purple-300">Shot Block</span>
                    <span className="text-[10px] text-slate-400">Defensive Stop</span>
                  </Button>
                </div>
              </div>

              {/* Fouls, Turnovers & Timeouts */}
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  3. Fouls, Turnovers & Stoppages
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  <Button
                    variant="danger"
                    onClick={() => setIsFoulModalOpen(true)}
                    className="h-10 text-xs font-bold"
                  >
                    🚨 Record Foul
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setIsTurnoverModalOpen(true)}
                    className="h-10 text-xs font-bold text-rose-300 border-rose-500/30 hover:bg-rose-500/10"
                  >
                    Turnover (TO)
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => handleRecordEvent('SHOT_CLOCK_VIOLATION')}
                    className="h-10 text-xs font-bold text-amber-300 border-amber-500/30 hover:bg-amber-500/10"
                  >
                    24s Violation
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => handleRecordTimeout('FULL')}
                    className="h-10 text-xs font-bold text-slate-300 border-slate-700 hover:bg-slate-800"
                  >
                    Timeout Call
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB 2: LIVE BOX SCORE */}
      {activeTab === 'boxscore' && (
        <div className="space-y-4">
          {/* Team A Box Score */}
          <Card className="p-4 bg-slate-900 border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400" />
                <h3 className="font-extrabold text-slate-100 text-sm">{match.teamA?.name} Player Box Score</h3>
              </div>
              <span className="text-xs font-mono font-bold text-amber-400">Total: {state.teamAScore} PTS</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold">
                    <th className="py-2 px-2">#</th>
                    <th className="py-2 px-2">Player</th>
                    <th className="py-2 px-2 text-center">PTS</th>
                    <th className="py-2 px-2 text-center">2PT</th>
                    <th className="py-2 px-2 text-center">3PT</th>
                    <th className="py-2 px-2 text-center">FT</th>
                    <th className="py-2 px-2 text-center">REB (O/D)</th>
                    <th className="py-2 px-2 text-center">AST</th>
                    <th className="py-2 px-2 text-center">STL</th>
                    <th className="py-2 px-2 text-center">BLK</th>
                    <th className="py-2 px-2 text-center">TO</th>
                    <th className="py-2 px-2 text-center">PF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {state.teamAPlayers.map((p) => {
                    const stats = state.playerStats.find((s) => s.playerId === p.id);
                    return (
                      <tr key={p.id} className="hover:bg-slate-950/40">
                        <td className="py-2 px-2 font-bold text-slate-400">#{p.jerseyNumber || '-'}</td>
                        <td className="py-2 px-2 font-bold text-slate-200 font-sans">{p.name}</td>
                        <td className="py-2 px-2 text-center font-black text-amber-400">{stats?.points || 0}</td>
                        <td className="py-2 px-2 text-center text-slate-300">{stats?.twoPointersMade || 0}/{stats?.twoPointersAttempted || 0}</td>
                        <td className="py-2 px-2 text-center text-slate-300">{stats?.threePointersMade || 0}/{stats?.threePointersAttempted || 0}</td>
                        <td className="py-2 px-2 text-center text-slate-300">{stats?.freeThrowsMade || 0}/{stats?.freeThrowsAttempted || 0}</td>
                        <td className="py-2 px-2 text-center text-slate-300">{stats?.totalRebounds || 0} ({stats?.offensiveRebounds || 0}/{stats?.defensiveRebounds || 0})</td>
                        <td className="py-2 px-2 text-center text-sky-300">{stats?.assists || 0}</td>
                        <td className="py-2 px-2 text-center text-emerald-300">{stats?.steals || 0}</td>
                        <td className="py-2 px-2 text-center text-purple-300">{stats?.blocks || 0}</td>
                        <td className="py-2 px-2 text-center text-rose-300">{stats?.turnovers || 0}</td>
                        <td className="py-2 px-2 text-center font-bold text-slate-200">{stats?.personalFouls || 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Team B Box Score */}
          <Card className="p-4 bg-slate-900 border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-sky-400" />
                <h3 className="font-extrabold text-slate-100 text-sm">{match.teamB?.name} Player Box Score</h3>
              </div>
              <span className="text-xs font-mono font-bold text-sky-400">Total: {state.teamBScore} PTS</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold">
                    <th className="py-2 px-2">#</th>
                    <th className="py-2 px-2">Player</th>
                    <th className="py-2 px-2 text-center">PTS</th>
                    <th className="py-2 px-2 text-center">2PT</th>
                    <th className="py-2 px-2 text-center">3PT</th>
                    <th className="py-2 px-2 text-center">FT</th>
                    <th className="py-2 px-2 text-center">REB (O/D)</th>
                    <th className="py-2 px-2 text-center">AST</th>
                    <th className="py-2 px-2 text-center">STL</th>
                    <th className="py-2 px-2 text-center">BLK</th>
                    <th className="py-2 px-2 text-center">TO</th>
                    <th className="py-2 px-2 text-center">PF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {state.teamBPlayers.map((p) => {
                    const stats = state.playerStats.find((s) => s.playerId === p.id);
                    return (
                      <tr key={p.id} className="hover:bg-slate-950/40">
                        <td className="py-2 px-2 font-bold text-slate-400">#{p.jerseyNumber || '-'}</td>
                        <td className="py-2 px-2 font-bold text-slate-200 font-sans">{p.name}</td>
                        <td className="py-2 px-2 text-center font-black text-sky-400">{stats?.points || 0}</td>
                        <td className="py-2 px-2 text-center text-slate-300">{stats?.twoPointersMade || 0}/{stats?.twoPointersAttempted || 0}</td>
                        <td className="py-2 px-2 text-center text-slate-300">{stats?.threePointersMade || 0}/{stats?.threePointersAttempted || 0}</td>
                        <td className="py-2 px-2 text-center text-slate-300">{stats?.freeThrowsMade || 0}/{stats?.freeThrowsAttempted || 0}</td>
                        <td className="py-2 px-2 text-center text-slate-300">{stats?.totalRebounds || 0} ({stats?.offensiveRebounds || 0}/{stats?.defensiveRebounds || 0})</td>
                        <td className="py-2 px-2 text-center text-sky-300">{stats?.assists || 0}</td>
                        <td className="py-2 px-2 text-center text-emerald-300">{stats?.steals || 0}</td>
                        <td className="py-2 px-2 text-center text-purple-300">{stats?.blocks || 0}</td>
                        <td className="py-2 px-2 text-center text-rose-300">{stats?.turnovers || 0}</td>
                        <td className="py-2 px-2 text-center font-bold text-slate-200">{stats?.personalFouls || 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* 5. TAB 3: PLAY-BY-PLAY STREAM */}
      {activeTab === 'events' && (
        <Card className="p-4 bg-slate-900 border-slate-800 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" />
              <h3 className="font-extrabold text-slate-100 text-sm">Full Play-by-Play Event Log</h3>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1.5 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400 mr-1" />
              {(['ALL', 'POINTS', 'FOULS', 'TURNOVERS', 'TIMEOUTS'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setEventFilter(filter)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                    eventFilter === filter
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
            {filteredEvents.length === 0 ? (
              <p className="text-center py-8 text-xs text-slate-500">No events found matching this filter.</p>
            ) : (
              [...filteredEvents].reverse().map((ev) => (
                <div
                  key={ev.id}
                  className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs hover:border-slate-700"
                >
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] font-bold">
                      {ev.quarterName} {ev.gameTimeDisplay}
                    </span>
                    <div>
                      <p className="font-bold text-slate-200">
                        <span className={ev.teamId === match.teamAId ? 'text-amber-400' : 'text-sky-400'}>
                          [{ev.teamName}]
                        </span>{' '}
                        {ev.playerName ? `${ev.playerName} ` : ''}
                        <span className="text-slate-300">
                          {ev.eventType === 'SCORE_3PT' && '🎯 made a 3-Point Shot!'}
                          {ev.eventType === 'SCORE_2PT' && '🏀 scored 2-Points (Field Goal)'}
                          {ev.eventType === 'SCORE_1PT' && '🎯 made Free Throw (+1)'}
                          {ev.eventType === 'MISS_3PT' && 'missed 3-Point Shot'}
                          {ev.eventType === 'MISS_2PT' && 'missed 2-Point Shot'}
                          {ev.eventType === 'MISS_1PT' && 'missed Free Throw'}
                          {ev.eventType === 'REBOUND' && `grabbed ${ev.reboundType || ''} Rebound`}
                          {ev.eventType === 'STEAL' && 'recorded a Steal'}
                          {ev.eventType === 'BLOCK' && 'blocked shot'}
                          {ev.eventType === 'TURNOVER' && `Turnover (${ev.turnoverType || 'Ball Loss'})`}
                          {ev.eventType === 'SHOT_CLOCK_VIOLATION' && '24-Second Shot Clock Violation'}
                          {ev.eventType.startsWith('FOUL') && `Foul committed (${ev.foulType || 'Personal'})`}
                          {ev.eventType === 'TIMEOUT' && `Team Timeout called (${ev.timeoutType || 'Full'})`}
                          {ev.eventType === 'SUBSTITUTION' && `Sub: ${ev.playerInName} in for ${ev.playerOutName}`}
                        </span>
                        {ev.assistPlayerName && (
                          <span className="text-slate-400 font-normal"> (Assist: {ev.assistPlayerName})</span>
                        )}
                      </p>
                      {ev.notes && <p className="text-[10px] text-slate-400 mt-0.5">{ev.notes}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-black text-slate-300">
                      {ev.scoreA_after} - {ev.scoreB_after}
                    </span>
                    <button
                      onClick={() => {
                        setEditingEvent(ev);
                        setEditNotes(ev.notes || '');
                        setIsEditEventModalOpen(true);
                      }}
                      className="p-1 rounded text-slate-500 hover:text-slate-200"
                      title="Edit event note"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* MODAL: RECORD FOUL */}
      {isFoulModalOpen && (
        <Dialog isOpen={isFoulModalOpen} onClose={() => setIsFoulModalOpen(false)} title="Record Foul & Free Throws">
          <div className="space-y-4 text-xs text-slate-200">
            <div>
              <label className="font-bold text-slate-400 block mb-1">Foul Type</label>
              <select
                value={foulType}
                onChange={(e) => setFoulType(e.target.value as BasketballFoulType)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
              >
                <option value="PERSONAL">Personal Foul (Standard Defense/Push/Hold)</option>
                <option value="SHOOTING">Shooting Foul (Foul during shot attempt)</option>
                <option value="OFFENSIVE">Offensive Foul / Charge</option>
                <option value="TECHNICAL">Technical Foul (Unsportsmanlike / Bench)</option>
                <option value="FLAGRANT">Flagrant Foul (Excessive / Violent Contact)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-400 block mb-1">Free Throws Awarded to Opponent</label>
              <div className="grid grid-cols-4 gap-2">
                {[0, 1, 2, 3].map((ft) => (
                  <button
                    key={ft}
                    type="button"
                    onClick={() => setFreeThrowsAwarded(ft)}
                    className={`py-2 rounded-xl font-bold font-mono transition-all ${
                      freeThrowsAwarded === ft
                        ? 'bg-amber-500 text-slate-950 font-extrabold'
                        : 'bg-slate-950 border border-slate-800 text-slate-300'
                    }`}
                  >
                    {ft} FTs
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <Button variant="secondary" size="sm" onClick={() => setIsFoulModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={handleRecordFoul}>
                Confirm Foul
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* MODAL: RECORD TURNOVER */}
      {isTurnoverModalOpen && (
        <Dialog isOpen={isTurnoverModalOpen} onClose={() => setIsTurnoverModalOpen(false)} title="Record Turnover">
          <div className="space-y-4 text-xs text-slate-200">
            <div>
              <label className="font-bold text-slate-400 block mb-1">Turnover Type</label>
              <select
                value={turnoverType}
                onChange={(e) => setTurnoverType(e.target.value as BasketballTurnoverType)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
              >
                <option value="BAD_PASS">Bad Pass / Interception</option>
                <option value="LOST_BALL">Lost Ball / Handling Error</option>
                <option value="TRAVELING">Traveling Violation</option>
                <option value="DOUBLE_DRIBBLE">Double Dribble</option>
                <option value="3_SECOND_VIOLATION">3-Second Paint Violation</option>
                <option value="5_SECOND_VIOLATION">5-Second Inbound Violation</option>
                <option value="8_SECOND_VIOLATION">8-Second Backcourt Violation</option>
                <option value="BACKCOURT_VIOLATION">Backcourt Violation</option>
                <option value="OUT_OF_BOUNDS">Stepped Out of Bounds</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <Button variant="secondary" size="sm" onClick={() => setIsTurnoverModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={handleRecordTurnover}>
                Confirm Turnover
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* MODAL: RECORD SUBSTITUTION */}
      {isSubModalOpen && (
        <Dialog isOpen={isSubModalOpen} onClose={() => setIsSubModalOpen(false)} title="Player Substitution">
          <div className="space-y-4 text-xs text-slate-200">
            <div>
              <label className="font-bold text-slate-400 block mb-1">Outgoing Player (Off Court)</label>
              <select
                value={subPlayerOutId}
                onChange={(e) => setSubPlayerOutId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
              >
                <option value="">-- Select Outgoing Player --</option>
                {currentTeamPlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.jerseyNumber} {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-400 block mb-1">Incoming Player (On Court)</label>
              <select
                value={subPlayerInId}
                onChange={(e) => setSubPlayerInId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
              >
                <option value="">-- Select Incoming Player --</option>
                {currentTeamPlayers
                  .filter((p) => p.id !== subPlayerOutId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.jerseyNumber} {p.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <Button variant="secondary" size="sm" onClick={() => setIsSubModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleRecordSubstitution}>
                Confirm Substitution
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* MODAL: CUSTOM CLOCK ADJUST */}
      {isClockAdjustModalOpen && (
        <Dialog isOpen={isClockAdjustModalOpen} onClose={() => setIsClockAdjustModalOpen(false)} title="Adjust Clocks">
          <div className="space-y-4 text-xs text-slate-200">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-400 block mb-1">Game Time Minutes</label>
                <Input
                  type="number"
                  min="0"
                  max="60"
                  value={adjustMinutes}
                  onChange={(e) => setAdjustMinutes(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="font-bold text-slate-400 block mb-1">Game Time Seconds</label>
                <Input
                  type="number"
                  min="0"
                  max="59"
                  value={adjustSeconds}
                  onChange={(e) => setAdjustSeconds(Number(e.target.value))}
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-400 block mb-1">Shot Clock Seconds</label>
              <Input
                type="number"
                min="0"
                max="35"
                value={adjustShotClock}
                onChange={(e) => setAdjustShotClock(Number(e.target.value))}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <Button variant="secondary" size="sm" onClick={() => setIsClockAdjustModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveClockAdjust}>
                Save Clock Time
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* MODAL: EDIT EVENT */}
      {isEditEventModalOpen && editingEvent && (
        <Dialog isOpen={isEditEventModalOpen} onClose={() => setIsEditEventModalOpen(false)} title="Edit Event Notes">
          <div className="space-y-4 text-xs text-slate-200">
            <p className="text-slate-400">
              Editing <strong className="text-slate-200">{editingEvent.eventType}</strong> recorded at {editingEvent.gameTimeDisplay} in {editingEvent.quarterName}.
            </p>
            <div>
              <label className="font-bold text-slate-400 block mb-1">Event Note / Description</label>
              <Input
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Optional remark, foul details, or review outcome..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <Button variant="secondary" size="sm" onClick={() => setIsEditEventModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveEditedEvent}>
                Save Changes
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};
