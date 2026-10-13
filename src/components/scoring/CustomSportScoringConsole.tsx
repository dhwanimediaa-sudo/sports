import React, { useState, useEffect, useCallback } from 'react';
import {
  Match,
  CustomSport,
  CustomScoringEvent,
  CustomMatchScoringState,
  Player,
  CustomScoringEventDef,
} from '../../types';
import { api } from '../../services/api';
import { useMatchStream } from '../../utils/useMatchStream';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
import {
  Play,
  Pause,
  RotateCcw,
  Undo2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Tv,
  Users,
  Shield,
  Award,
  ChevronRight,
  Flame,
  Plus,
  Minus,
  Edit2,
  Trash2,
  RefreshCw,
  Sparkles,
  Layers,
  Volume2,
} from 'lucide-react';

export interface CustomSportScoringConsoleProps {
  match: Match;
  onMatchUpdated?: (updatedMatch: Match) => void;
  onViewReport?: () => void;
}

export const CustomSportScoringConsole: React.FC<CustomSportScoringConsoleProps> = ({
  match,
  onMatchUpdated,
  onViewReport,
}) => {
  const [scoringState, setScoringState] = useState<CustomMatchScoringState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Player Attribution Modal
  const [selectedEventDef, setSelectedEventDef] = useState<CustomScoringEventDef | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [eventCustomDescription, setEventCustomDescription] = useState<string>('');
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  // Edit Event Modal
  const [editingEvent, setEditingEvent] = useState<CustomScoringEvent | null>(null);
  const [editEventPoints, setEditEventPoints] = useState<number>(1);
  const [editEventPlayerId, setEditEventPlayerId] = useState<string>('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Timeout & Substitution Modals
  const [isTimeoutModalOpen, setIsTimeoutModalOpen] = useState(false);
  const [timeoutTeamId, setTimeoutTeamId] = useState<string>('');

  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [subTeamId, setSubTeamId] = useState<string>('');
  const [subPlayerOutId, setSubPlayerOutId] = useState<string>('');
  const [subPlayerInId, setSubPlayerInId] = useState<string>('');

  // Clock local state
  const [clockRunning, setClockRunning] = useState(false);
  const [clockSeconds, setClockSeconds] = useState(0);

  // Fetch scoring state
  const loadState = useCallback(async () => {
    try {
      const res = await api.getCustomSportScoringState(match.id);
      setScoringState(res.state);
      if (res.state.clock) {
        setClockRunning(Boolean(res.state.clock.running));
        setClockSeconds(Number(res.state.clock.secondsRemaining) || 0);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load scoring state.');
    } finally {
      setLoading(false);
    }
  }, [match.id]);

  // SSE connection with exponential reconnect and deduplication
  useMatchStream({
    matchId: match.id,
    onMessage: (data) => {
      const scoring = data.scoringState || data;
      setScoringState(scoring);
      if (scoring.clock) {
        setClockRunning(Boolean(scoring.clock.running));
        setClockSeconds(Number(scoring.clock.secondsRemaining) || 0);
      }
    },
  });

  useEffect(() => {
    loadState();
  }, [match.id, loadState]);

  // Local Clock Interval
  useEffect(() => {
    let interval: any;
    if (clockRunning) {
      interval = setInterval(() => {
        setClockSeconds((prev) => {
          if (scoringState?.customSport?.isClockCountdown) {
            return prev > 0 ? prev - 1 : 0;
          } else {
            return prev + 1;
          }
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [clockRunning, scoringState?.customSport?.isClockCountdown]);

  // Sync clock to server
  const handleClockToggle = async () => {
    const nextRunning = !clockRunning;
    setClockRunning(nextRunning);
    try {
      await api.updateCustomSportClock(match.id, {
        running: nextRunning,
        secondsRemaining: clockSeconds,
      });
    } catch (err: any) {
      console.error('Failed to toggle clock on server:', err);
    }
  };

  const handleAdjustClock = async (deltaSeconds: number) => {
    const nextSec = Math.max(0, clockSeconds + deltaSeconds);
    setClockSeconds(nextSec);
    try {
      await api.updateCustomSportClock(match.id, {
        secondsRemaining: nextSec,
      });
    } catch (err: any) {
      console.error('Failed to adjust clock:', err);
    }
  };

  // Trigger Event Action
  const handleActionClick = (eventDef: CustomScoringEventDef, teamId: string) => {
    if (actionLoading || scoringState?.isMatchComplete) return;
    const teamPlayers = teamId === match.teamAId ? match.teamAPlayers || [] : match.teamBPlayers || [];

    if (eventDef.playerAttribution === 'REQUIRED' && teamPlayers.length > 0) {
      setSelectedEventDef(eventDef);
      setSelectedTeamId(teamId);
      setSelectedPlayerId(teamPlayers[0]?.id || '');
      setEventCustomDescription('');
      setIsEventModalOpen(true);
    } else {
      // Execute immediately
      executeRecordEvent(eventDef, teamId, undefined);
    }
  };

  const executeRecordEvent = async (
    eventDef: CustomScoringEventDef,
    teamId: string,
    playerId?: string,
    customDesc?: string
  ) => {
    if (actionLoading || scoringState?.isMatchComplete) return;
    setActionLoading(true);
    try {
      const minutes = Math.floor(clockSeconds / 60);
      const seconds = clockSeconds % 60;
      const clockDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;

      await api.recordCustomSportEvent(match.id, {
        teamId,
        playerId,
        eventDefId: eventDef.id,
        eventName: eventDef.name,
        eventShortName: eventDef.shortName,
        points: eventDef.points,
        period: scoringState?.currentPeriod || 1,
        periodName: scoringState?.currentPeriodName || `Period ${scoringState?.currentPeriod || 1}`,
        clockDisplay,
        clockSeconds,
        description: customDesc,
      });

      // If triggerBroadcast is enabled on eventDef, trigger TV overlay
      if (eventDef.triggerBroadcast) {
        api.triggerBroadcastEvent(match.id, {
          type: eventDef.graphicType || 'BANNER',
          durationSeconds: 4,
          data: {
            title: eventDef.name,
            subtitle: teamId === match.teamAId ? match.teamA?.name : match.teamB?.name,
            points: eventDef.points,
          },
        }).catch(() => {});
      }

      setIsEventModalOpen(false);
      loadState();
    } catch (err: any) {
      alert(err.message || 'Failed to record scoring event.');
    } finally {
      setActionLoading(false);
    }
  };

  // Undo Last Event
  const handleUndo = async () => {
    if (!window.confirm('Undo the most recent scoring action?')) return;
    setActionLoading(true);
    try {
      await api.undoCustomSportEvent(match.id);
      loadState();
    } catch (err: any) {
      alert(err.message || 'Failed to undo scoring action.');
    } finally {
      setActionLoading(false);
    }
  };

  // Edit Event Submit
  const handleSaveEditEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;
    setActionLoading(true);
    try {
      await api.editCustomSportEvent(match.id, {
        eventId: editingEvent.id,
        points: editEventPoints,
        playerId: editEventPlayerId || undefined,
      });
      setIsEditModalOpen(false);
      loadState();
    } catch (err: any) {
      alert(err.message || 'Failed to edit event.');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Event
  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this scoring event?')) return;
    setActionLoading(true);
    try {
      await api.deleteCustomSportEvent(match.id, { eventId });
      loadState();
    } catch (err: any) {
      alert(err.message || 'Failed to delete event.');
    } finally {
      setActionLoading(false);
    }
  };

  // Timeout Submit
  const handleRecordTimeout = async () => {
    if (!timeoutTeamId) return;
    setActionLoading(true);
    try {
      const minutes = Math.floor(clockSeconds / 60);
      const seconds = clockSeconds % 60;
      await api.recordCustomSportTimeout(match.id, {
        teamId: timeoutTeamId,
        period: scoringState?.currentPeriod || 1,
        matchClock: `${minutes}:${seconds.toString().padStart(2, '0')}`,
      });

      api.triggerBroadcastEvent(match.id, {
        type: 'LOWER_THIRD',
        durationSeconds: 5,
        data: {
          title: 'TIMEOUT CALLED',
          subtitle: timeoutTeamId === match.teamAId ? match.teamA?.name : match.teamB?.name,
        },
      }).catch(() => {});

      setIsTimeoutModalOpen(false);
      loadState();
    } catch (err: any) {
      alert(err.message || 'Failed to record timeout.');
    } finally {
      setActionLoading(false);
    }
  };

  // Substitution Submit
  const handleRecordSubstitution = async () => {
    if (!subTeamId) return;
    setActionLoading(true);
    try {
      const minutes = Math.floor(clockSeconds / 60);
      const seconds = clockSeconds % 60;
      await api.recordCustomSportSubstitution(match.id, {
        teamId: subTeamId,
        playerOutId: subPlayerOutId || undefined,
        playerInId: subPlayerInId || undefined,
        period: scoringState?.currentPeriod || 1,
        matchClock: `${minutes}:${seconds.toString().padStart(2, '0')}`,
      });

      setIsSubModalOpen(false);
      loadState();
    } catch (err: any) {
      alert(err.message || 'Failed to record substitution.');
    } finally {
      setActionLoading(false);
    }
  };

  // Period Advance
  const handleAdvancePeriod = async () => {
    const current = scoringState?.currentPeriod || 1;
    const total = scoringState?.totalPeriods || 2;
    const next = current + 1;

    if (next > total) {
      if (window.confirm('All scheduled periods completed. Mark match as completed?')) {
        handleCompleteMatch();
      }
      return;
    }

    if (window.confirm(`Advance match to ${scoringState?.customSport?.matchType || 'Period'} ${next}?`)) {
      setActionLoading(true);
      try {
        await api.transitionCustomSportPeriod(match.id, { targetPeriod: next });
        loadState();
      } catch (err: any) {
        alert(err.message || 'Failed to advance period.');
      } finally {
        setActionLoading(false);
      }
    }
  };

  // Complete Match
  const handleCompleteMatch = async () => {
    if (!window.confirm('Are you sure you want to finalize and complete this match?')) return;
    setActionLoading(true);
    try {
      await api.completeCustomSportMatch(match.id);
      loadState();
      if (onViewReport) onViewReport();
    } catch (err: any) {
      alert(err.message || 'Failed to complete match.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !scoringState) {
    return (
      <div className="p-12 text-center text-zinc-400">
        <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-3 text-amber-500" />
        Initializing Custom Sport Scoring Console...
      </div>
    );
  }

  const customSport = scoringState?.customSport || match.customSportConfig;
  const teamAName = match.teamA?.name || 'Team A';
  const teamBName = match.teamB?.name || 'Team B';
  const teamAPlayers = match.teamAPlayers || [];
  const teamBPlayers = match.teamBPlayers || [];

  const clockMinutes = Math.floor(clockSeconds / 60);
  const clockSecs = clockSeconds % 60;
  const formattedClock = `${clockMinutes}:${clockSecs.toString().padStart(2, '0')}`;

  const scoringEventsList = customSport?.scoringEvents || [];

  return (
    <div className="space-y-6">
      {/* Top Banner: Sport & Real-time Status */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-850 to-zinc-900 border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 relative z-10">
          {/* Team A Display */}
          <div className="flex-1 text-center lg:text-left flex items-center justify-center lg:justify-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-2xl font-bold text-amber-400 shadow-lg">
              {match.teamA?.shortName || teamAName.substring(0, 3).toUpperCase()}
            </div>
            <div>
              <div className="text-xs uppercase font-bold text-amber-400 tracking-wider">Home Team</div>
              <h2 className="text-2xl font-extrabold text-white">{teamAName}</h2>
              <div className="text-xs text-zinc-400 mt-0.5 flex items-center gap-2">
                <span>Timeouts: {scoringState?.teamAStats?.timeoutsUsed || 0}</span>
                <span>•</span>
                <span>Subs: {scoringState?.teamAStats?.substitutionsUsed || 0}</span>
              </div>
            </div>
          </div>

          {/* Center Scores & Live Clock */}
          <div className="flex flex-col items-center justify-center bg-black/40 border border-white/10 px-8 py-4 rounded-2xl backdrop-blur-md min-w-[280px]">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {scoringState?.currentPeriodName || `Period ${scoringState?.currentPeriod || 1}`}
              </span>
              <span className="text-xs text-zinc-400">of {scoringState?.totalPeriods || 2}</span>
            </div>

            <div className="flex items-center gap-6 my-1">
              <span className="text-5xl font-black text-white font-mono tracking-tighter">
                {scoringState?.scoreA ?? 0}
              </span>
              <span className="text-2xl text-zinc-600 font-bold">:</span>
              <span className="text-5xl font-black text-white font-mono tracking-tighter">
                {scoringState?.scoreB ?? 0}
              </span>
            </div>

            {/* Match Clock Controls */}
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10 w-full justify-center">
              <button
                onClick={handleClockToggle}
                className={`px-3 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
                  clockRunning
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                }`}
              >
                {clockRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span className="font-mono text-sm">{formattedClock}</span>
              </button>

              <button
                onClick={() => handleAdjustClock(60)}
                className="px-2 py-1 text-xs font-mono bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-white/10"
                title="+1 Minute"
              >
                +1m
              </button>
              <button
                onClick={() => handleAdjustClock(-60)}
                className="px-2 py-1 text-xs font-mono bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-white/10"
                title="-1 Minute"
              >
                -1m
              </button>
            </div>
          </div>

          {/* Team B Display */}
          <div className="flex-1 text-center lg:text-right flex items-center justify-center lg:justify-end gap-4 flex-row-reverse">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border-2 border-cyan-500/30 flex items-center justify-center text-2xl font-bold text-cyan-400 shadow-lg">
              {match.teamB?.shortName || teamBName.substring(0, 3).toUpperCase()}
            </div>
            <div>
              <div className="text-xs uppercase font-bold text-cyan-400 tracking-wider">Away Team</div>
              <h2 className="text-2xl font-extrabold text-white">{teamBName}</h2>
              <div className="text-xs text-zinc-400 mt-0.5 flex items-center justify-center lg:justify-end gap-2">
                <span>Timeouts: {scoringState?.teamBStats?.timeoutsUsed || 0}</span>
                <span>•</span>
                <span>Subs: {scoringState?.teamBStats?.substitutionsUsed || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Period Scores Matrix */}
        {scoringState && scoringState.periodScoresA && scoringState.periodScoresA.length > 0 && (
          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-center gap-4 overflow-x-auto">
            <span className="text-xs font-bold uppercase text-zinc-500 tracking-wider">Breakdown:</span>
            {scoringState.periodScoresA.map((pScoreA, idx) => (
              <div
                key={idx}
                className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-2 ${
                  scoringState.currentPeriod === idx + 1
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                    : 'bg-zinc-800/60 border-white/5 text-zinc-400'
                }`}
              >
                <span className="text-[10px] text-zinc-500 uppercase">P{idx + 1}:</span>
                <span className="text-white">{pScoreA}</span>
                <span className="text-zinc-600">-</span>
                <span className="text-white">{scoringState.periodScoresB?.[idx] ?? 0}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Scoring Action Panels (Side-by-Side Teams) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team A Scoring Pad */}
        <div className="bg-zinc-900/90 border border-amber-500/20 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-400 shadow-sm shadow-amber-400" />
              <h3 className="text-base font-bold text-white">{teamAName} Actions</h3>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setTimeoutTeamId(match.teamAId);
                  setIsTimeoutModalOpen(true);
                }}
                className="text-xs text-zinc-400 hover:text-amber-400 py-1 px-2.5"
              >
                <Clock className="w-3.5 h-3.5 mr-1" /> Timeout
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setSubTeamId(match.teamAId);
                  setIsSubModalOpen(true);
                }}
                className="text-xs text-zinc-400 hover:text-amber-400 py-1 px-2.5"
              >
                <Users className="w-3.5 h-3.5 mr-1" /> Sub
              </Button>
            </div>
          </div>

          {/* Dynamic Buttons from Sport Configuration */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {scoringEventsList.map((eventDef) => {
              const pts = Number(eventDef.points) || 0;
              return (
                <button
                  key={eventDef.id}
                  onClick={() => handleActionClick(eventDef, match.teamAId)}
                  disabled={actionLoading}
                  className="p-3.5 rounded-xl border border-white/10 bg-zinc-800/80 hover:bg-amber-500/20 hover:border-amber-500/40 text-left transition-all active:scale-[0.98] group flex flex-col justify-between min-h-[85px] shadow-sm"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xl">{eventDef.icon || '🎯'}</span>
                    <span className="text-xs font-mono font-extrabold text-amber-400 px-1.5 py-0.5 bg-zinc-900 rounded-md">
                      {pts >= 0 ? `+${pts}` : pts}
                    </span>
                  </div>
                  <div className="font-bold text-sm text-white group-hover:text-amber-300 mt-2 truncate">
                    {eventDef.shortName || eventDef.name}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Team B Scoring Pad */}
        <div className="bg-zinc-900/90 border border-cyan-500/20 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
              <h3 className="text-base font-bold text-white">{teamBName} Actions</h3>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setTimeoutTeamId(match.teamBId);
                  setIsTimeoutModalOpen(true);
                }}
                className="text-xs text-zinc-400 hover:text-cyan-400 py-1 px-2.5"
              >
                <Clock className="w-3.5 h-3.5 mr-1" /> Timeout
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setSubTeamId(match.teamBId);
                  setIsSubModalOpen(true);
                }}
                className="text-xs text-zinc-400 hover:text-cyan-400 py-1 px-2.5"
              >
                <Users className="w-3.5 h-3.5 mr-1" /> Sub
              </Button>
            </div>
          </div>

          {/* Dynamic Buttons from Sport Configuration */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {scoringEventsList.map((eventDef) => {
              const pts = Number(eventDef.points) || 0;
              return (
                <button
                  key={eventDef.id}
                  onClick={() => handleActionClick(eventDef, match.teamBId)}
                  disabled={actionLoading}
                  className="p-3.5 rounded-xl border border-white/10 bg-zinc-800/80 hover:bg-cyan-500/20 hover:border-cyan-500/40 text-left transition-all active:scale-[0.98] group flex flex-col justify-between min-h-[85px] shadow-sm"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xl">{eventDef.icon || '🎯'}</span>
                    <span className="text-xs font-mono font-extrabold text-cyan-400 px-1.5 py-0.5 bg-zinc-900 rounded-md">
                      {pts >= 0 ? `+${pts}` : pts}
                    </span>
                  </div>
                  <div className="font-bold text-sm text-white group-hover:text-cyan-300 mt-2 truncate">
                    {eventDef.shortName || eventDef.name}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Control Strip: Undo, Next Period, Broadcast Triggers, Complete */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-900 border border-white/10 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={handleUndo}
            disabled={actionLoading || (scoringState?.events?.length || 0) === 0}
            className="gap-2 text-xs"
          >
            <Undo2 className="w-4 h-4 text-amber-400" /> Undo Last Event
          </Button>

          <Button
            variant="secondary"
            onClick={handleAdvancePeriod}
            disabled={actionLoading}
            className="gap-2 text-xs"
          >
            <ChevronRight className="w-4 h-4 text-emerald-400" /> Next Period
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => {
              api.triggerBroadcastEvent(match.id, {
                type: 'CENTER_POPUP',
                durationSeconds: 5,
                data: {
                  title: 'MATCH POINT / GOLDEN PLAY',
                  subtitle: `${teamAName} vs ${teamBName}`,
                },
              }).catch(() => {});
            }}
            className="text-xs text-amber-400 hover:bg-amber-500/10 gap-1.5"
          >
            <Tv className="w-3.5 h-3.5" /> Test TV Popup
          </Button>

          {onViewReport && (
            <Button variant="secondary" onClick={onViewReport} className="text-xs gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" /> Match Report
            </Button>
          )}

          <Button
            onClick={handleCompleteMatch}
            disabled={actionLoading}
            className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs"
          >
            <CheckCircle2 className="w-4 h-4" /> Finalize Match
          </Button>
        </div>
      </div>

      {/* Chronological Event Log & Player Statistics Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-time Event Log */}
        <div className="lg:col-span-2 bg-zinc-900/90 border border-white/10 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" /> Live Match Event Timeline
            </h3>
            <span className="text-xs text-zinc-400 font-mono">
              {scoringState?.events?.length || 0} Events Recorded
            </span>
          </div>

          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {(!scoringState?.events || scoringState.events.length === 0) ? (
              <div className="p-8 text-center text-zinc-500 text-xs">
                No scoring events logged yet. Tap any action button above to begin.
              </div>
            ) : (
              [...scoringState.events].reverse().map((ev) => {
                const isTeamA = ev.teamId === match.teamAId;
                return (
                  <div
                    key={ev.id}
                    className="p-3 bg-zinc-800/60 border border-white/5 rounded-xl flex items-center justify-between gap-3 text-xs hover:border-white/20 transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isTeamA ? 'bg-amber-400' : 'bg-cyan-400'
                        }`}
                      />
                      <span className="font-mono text-zinc-500">[{ev.clockDisplay || '00:00'}]</span>
                      <span className="font-bold text-white">{ev.eventName}</span>
                      <span className="font-mono font-bold text-amber-400">({ev.points >= 0 ? `+${ev.points}` : ev.points}p)</span>
                      <span className="text-zinc-400">• {ev.teamName}</span>
                      {ev.playerName && <span className="text-zinc-300 font-semibold">({ev.playerName})</span>}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-zinc-300 bg-zinc-900 px-2 py-0.5 rounded">
                        {ev.scoreA_after} - {ev.scoreB_after}
                      </span>
                      <button
                        onClick={() => {
                          setEditingEvent(ev);
                          setEditEventPoints(ev.points);
                          setEditEventPlayerId(ev.playerId || '');
                          setIsEditModalOpen(true);
                        }}
                        className="text-zinc-500 hover:text-amber-400 transition-colors"
                        title="Edit event"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(ev.id)}
                        className="text-zinc-500 hover:text-red-400 transition-colors"
                        title="Delete event"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Top Performers / Player Stats Summary */}
        <div className="bg-zinc-900/90 border border-white/10 rounded-2xl p-5 shadow-lg space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" /> Player Scoring Leaderboard
          </h3>

          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {(!scoringState?.playerStats || scoringState.playerStats.length === 0) ? (
              <div className="p-8 text-center text-zinc-500 text-xs">
                Player stats will appear as scores are attributed.
              </div>
            ) : (
              [...scoringState.playerStats]
                .sort((a, b) => b.pointsTotal - a.pointsTotal)
                .slice(0, 8)
                .map((pStat, idx) => (
                  <div
                    key={pStat.playerId || idx}
                    className="p-2.5 bg-zinc-800/60 border border-white/5 rounded-xl flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="font-bold text-white">{pStat.playerName}</div>
                      <div className="text-[11px] text-zinc-400">{pStat.teamName}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-extrabold text-amber-400">{pStat.pointsTotal} PTS</div>
                      <div className="text-[10px] text-zinc-500">{pStat.eventsCount} Events</div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>

      {/* Attribution Modal */}
      {isEventModalOpen && selectedEventDef && (
        <Dialog
          isOpen={isEventModalOpen}
          onClose={() => setIsEventModalOpen(false)}
          title={`Attribute Action: ${selectedEventDef.name}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                Select Active Player ({selectedTeamId === match.teamAId ? teamAName : teamBName})
              </label>
              <select
                value={selectedPlayerId}
                onChange={(e) => setSelectedPlayerId(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                {(selectedTeamId === match.teamAId ? teamAPlayers : teamBPlayers).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.jerseyNumber ? `#${p.jerseyNumber} ` : ''}
                    {p.name} {p.role ? `(${p.role})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                Custom Commentary / Notes (Optional)
              </label>
              <Input
                value={eventCustomDescription}
                onChange={(e) => setEventCustomDescription(e.target.value)}
                placeholder="e.g. Great diving save, fast-break counter"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <Button variant="secondary" onClick={() => setIsEventModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() =>
                  executeRecordEvent(
                    selectedEventDef,
                    selectedTeamId,
                    selectedPlayerId,
                    eventCustomDescription
                  )
                }
                disabled={actionLoading}
                className="bg-amber-500 text-black font-bold"
              >
                Confirm & Log (+{selectedEventDef.points} pts)
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Edit Event Modal */}
      {isEditModalOpen && editingEvent && (
        <Dialog
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={`Edit Scoring Event: ${editingEvent.eventName}`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleSaveEditEvent} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                Points Value
              </label>
              <Input
                type="number"
                value={editEventPoints}
                onChange={(e) => setEditEventPoints(Number(e.target.value))}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                Assigned Player
              </label>
              <select
                value={editEventPlayerId}
                onChange={(e) => setEditEventPlayerId(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">-- No Player Assigned --</option>
                {[...teamAPlayers, ...teamBPlayers].map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.teamId === match.teamAId ? teamAName : teamBName})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <Button type="button" variant="secondary" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={actionLoading} className="bg-amber-500 text-black font-bold">
                Save Changes
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Timeout Modal */}
      {isTimeoutModalOpen && (
        <Dialog
          isOpen={isTimeoutModalOpen}
          onClose={() => setIsTimeoutModalOpen(false)}
          title="Call Official Timeout"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <p className="text-sm text-zinc-400">
              Record a timeout for{' '}
              <strong className="text-white">
                {timeoutTeamId === match.teamAId ? teamAName : teamBName}
              </strong>
              . This will be logged on the match sheet and trigger a broadcast banner.
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <Button variant="secondary" onClick={() => setIsTimeoutModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleRecordTimeout} disabled={actionLoading} className="bg-amber-500 text-black font-bold">
                Confirm Timeout
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Substitution Modal */}
      {isSubModalOpen && (
        <Dialog
          isOpen={isSubModalOpen}
          onClose={() => setIsSubModalOpen(false)}
          title="Record Player Substitution"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                Player Going OUT
              </label>
              <select
                value={subPlayerOutId}
                onChange={(e) => setSubPlayerOutId(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">-- Select Player Out --</option>
                {(subTeamId === match.teamAId ? teamAPlayers : teamBPlayers).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                Player Coming IN
              </label>
              <select
                value={subPlayerInId}
                onChange={(e) => setSubPlayerInId(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">-- Select Player In --</option>
                {(subTeamId === match.teamAId ? teamAPlayers : teamBPlayers).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <Button variant="secondary" onClick={() => setIsSubModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleRecordSubstitution} disabled={actionLoading} className="bg-amber-500 text-black font-bold">
                Confirm Substitution
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};
