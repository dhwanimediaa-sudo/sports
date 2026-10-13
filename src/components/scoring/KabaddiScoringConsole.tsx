import React, { useState, useEffect, useRef } from 'react';
import {
  Match,
  KabaddiMatchScoringState,
  KabaddiRaidOutcome,
  Player,
} from '../../types';
import { api } from '../../services/api';
import { useMatchStream } from '../../utils/useMatchStream';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Dialog } from '../ui/Dialog';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import {
  Zap,
  Shield,
  Award,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  User,
  Users,
  Undo2,
  Edit3,
  Flame,
  Activity,
  Plus,
  RefreshCw,
  PauseCircle,
  PlayCircle,
  Trophy,
  Sliders,
  ChevronRight,
  Radio,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';

export interface KabaddiScoringConsoleProps {
  match: Match;
  onMatchStatusChange?: () => void;
}

export const KabaddiScoringConsole: React.FC<KabaddiScoringConsoleProps> = ({
  match,
  onMatchStatusChange,
}) => {
  const [scoringState, setScoringState] = useState<KabaddiMatchScoringState | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected raiding team and active raider
  const [currentRaidingTeamId, setCurrentRaidingTeamId] = useState<string>(match.teamAId);
  const [selectedRaiderId, setSelectedRaiderId] = useState<string>('');

  // Raid details builder
  const [isDoOrDie, setIsDoOrDie] = useState<boolean>(false);
  const [selectedOutcome, setSelectedOutcome] = useState<KabaddiRaidOutcome>('SUCCESSFUL_RAID');
  const [touchPointsCount, setTouchPointsCount] = useState<number>(1);
  const [hasBonus, setHasBonus] = useState<boolean>(false);
  const [touchedDefenderIds, setTouchedDefenderIds] = useState<string[]>([]);
  const [tacklingDefenderIds, setTacklingDefenderIds] = useState<string[]>([]);
  const [isSuperTackleActive, setIsSuperTackleActive] = useState<boolean>(false);

  // Raid 30s Countdown Timer
  const [raidTimerSeconds, setRaidTimerSeconds] = useState<number>(30);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timeout Modal
  const [isTimeoutModalOpen, setIsTimeoutModalOpen] = useState(false);
  const [timeoutTeamId, setTimeoutTeamId] = useState<string>(match.teamAId);

  // Substitution Modal
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [subTeamId, setSubTeamId] = useState<string>(match.teamAId);
  const [subPlayerOutId, setSubPlayerOutId] = useState<string>('');
  const [subPlayerInId, setSubPlayerInId] = useState<string>('');

  // Edit Last Raid Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRaid, setEditingRaid] = useState<any>(null);

  // Half Transition Confirmation
  const [isHalfModalOpen, setIsHalfModalOpen] = useState(false);
  const [targetHalfStatus, setTargetHalfStatus] = useState<'HALF_TIME' | 'SECOND_HALF' | 'COMPLETED'>('HALF_TIME');

  // Load Scoring State
  const loadScoringState = async () => {
    try {
      setError(null);
      const res = await api.getKabaddiScoringState(match.id);
      setScoringState(res.state);

      // Auto-set raiding team based on previous raid alternation
      if (res.state.nextRaidingTeamId) {
        setCurrentRaidingTeamId(res.state.nextRaidingTeamId);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load Kabaddi scoring state.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScoringState();
  }, [match.id]);

  // Connect SSE with exponential reconnect and deduplication
  useMatchStream({
    matchId: match.id,
    onMessage: (data) => {
      const state = data.scoringState || data;
      if (state && (state.teamAScore !== undefined || state.raids)) {
        setScoringState(state);
        if (state.nextRaidingTeamId) {
          setCurrentRaidingTeamId(state.nextRaidingTeamId);
        }
      }
    },
  });

  // Raid Timer Logic
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setRaidTimerSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  const resetRaidTimer = (duration = 30) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsTimerRunning(false);
    setRaidTimerSeconds(duration);
  };

  const startRaidTimer = () => {
    setIsTimerRunning(true);
  };

  const pauseRaidTimer = () => {
    setIsTimerRunning(false);
  };

  const defendingTeamId = currentRaidingTeamId === match.teamAId ? match.teamBId : match.teamAId;
  const raidingTeamName = currentRaidingTeamId === match.teamAId ? match.teamA?.name || 'Team A' : match.teamB?.name || 'Team B';
  const defendingTeamName = defendingTeamId === match.teamAId ? match.teamA?.name || 'Team A' : match.teamB?.name || 'Team B';

  // Players on active court
  const activeRaidingCourtIds = currentRaidingTeamId === match.teamAId
    ? scoringState?.activeCourtPlayerIdsA || []
    : scoringState?.activeCourtPlayerIdsB || [];

  const activeDefendingCourtIds = defendingTeamId === match.teamAId
    ? scoringState?.activeCourtPlayerIdsA || []
    : scoringState?.activeCourtPlayerIdsB || [];

  const allPlayers = match.teamAPlayers && match.teamBPlayers
    ? [...match.teamAPlayers, ...match.teamBPlayers]
    : [];

  const raidingCourtPlayers = allPlayers.filter((p) => activeRaidingCourtIds.includes(p.id));
  const defendingCourtPlayers = allPlayers.filter((p) => activeDefendingCourtIds.includes(p.id));

  // Determine if Super Tackle is naturally on (defending team has <= 3 players on court)
  const isSuperTackleCondition = activeDefendingCourtIds.length <= 3 && activeDefendingCourtIds.length > 0;

  // Auto detect if current raid is Do-or-Die based on empty raid streaks
  const emptyRaidsCurrent = currentRaidingTeamId === match.teamAId
    ? (scoringState?.teamAStats.consecutiveEmptyRaids || 0)
    : (scoringState?.teamBStats.consecutiveEmptyRaids || 0);

  const isAutoDoOrDie = emptyRaidsCurrent >= 2;

  // Sync Do-or-Die flag if auto triggered
  useEffect(() => {
    if (isAutoDoOrDie) {
      setIsDoOrDie(true);
    }
  }, [emptyRaidsCurrent, isAutoDoOrDie, currentRaidingTeamId]);

  // Select default raider if current selection invalid
  useEffect(() => {
    if (raidingCourtPlayers.length > 0 && !activeRaidingCourtIds.includes(selectedRaiderId)) {
      setSelectedRaiderId(raidingCourtPlayers[0].id);
    }
  }, [currentRaidingTeamId, activeRaidingCourtIds]);

  // Handle Recording Raid
  const handleRecordRaid = async (outcomeType: KabaddiRaidOutcome, overrides: any = {}) => {
    if (!scoringState || actionLoading || scoringState.isMatchComplete) return;

    if (!selectedRaiderId && outcomeType !== 'TECHNICAL_POINT') {
      setError('Please select an active raider first.');
      return;
    }

    setActionLoading(true);
    setError(null);

    let touchPts = overrides.touchPoints !== undefined ? overrides.touchPoints : touchPointsCount;
    let bonusPts = overrides.bonusPoints !== undefined ? overrides.bonusPoints : (hasBonus ? 1 : 0);
    let tacklePts = overrides.tacklePoints !== undefined ? overrides.tacklePoints : 0;
    let techPts = overrides.technicalPoints !== undefined ? overrides.technicalPoints : 0;
    let isSuperRaid = false;
    let isSuperTack = false;

    if (outcomeType === 'EMPTY_RAID') {
      touchPts = 0;
      bonusPts = 0;
      tacklePts = 0;
    } else if (outcomeType === 'BONUS_POINT') {
      bonusPts = 1;
      touchPts = 0;
    } else if (outcomeType === 'TOUCH_POINT' || outcomeType === 'SUCCESSFUL_RAID') {
      if (touchPts === 0) touchPts = 1;
    } else if (outcomeType === 'BONUS_AND_TOUCH') {
      bonusPts = 1;
      if (touchPts === 0) touchPts = 1;
    } else if (outcomeType === 'SUPER_RAID') {
      if (touchPts < 3) touchPts = 3;
      isSuperRaid = true;
    } else if (outcomeType === 'SUPER_TACKLE') {
      tacklePts = 2;
      isSuperTack = true;
      touchPts = 0;
      bonusPts = 0;
    } else if (outcomeType === 'TACKLE_POINT' || outcomeType === 'RAIDER_OUT' || outcomeType === 'DO_OR_DIE_FAIL') {
      if (isSuperTackleCondition || isSuperTackleActive) {
        tacklePts = 2;
        isSuperTack = true;
      } else {
        tacklePts = 1;
      }
      touchPts = 0;
      bonusPts = 0;
    }

    const payload = {
      half: scoringState.currentHalf || 1,
      raidingTeamId: currentRaidingTeamId,
      defendingTeamId,
      raiderPlayerId: selectedRaiderId,
      outcome: outcomeType,
      isDoOrDie: overrides.isDoOrDie !== undefined ? overrides.isDoOrDie : isDoOrDie,
      touchPoints: touchPts,
      bonusPoints: bonusPts,
      tacklePoints: tacklePts,
      technicalPoints: techPts,
      touchedDefenderIds: overrides.touchedDefenderIds || touchedDefenderIds,
      tacklingDefenderIds: overrides.tacklingDefenderIds || tacklingDefenderIds,
      isSuperRaid: isSuperRaid || (touchPts + bonusPts >= 3 && ['TOUCH_POINT', 'SUCCESSFUL_RAID', 'SUPER_RAID', 'BONUS_AND_TOUCH'].includes(outcomeType)),
      isSuperTackle: isSuperTack,
      raidDurationSeconds: 30 - raidTimerSeconds,
    };

    try {
      const res = await api.recordKabaddiRaid(match.id, payload);
      setScoringState(res.state);

      // Reset raid controls
      setTouchPointsCount(1);
      setHasBonus(false);
      setTouchedDefenderIds([]);
      setTacklingDefenderIds([]);
      setIsDoOrDie(false);
      setIsSuperTackleActive(false);
      resetRaidTimer(30);

      // Toggle raiding team
      setCurrentRaidingTeamId(defendingTeamId);

      if (match.status !== 'LIVE' && onMatchStatusChange) {
        onMatchStatusChange();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to record raid.');
    } finally {
      setActionLoading(false);
    }
  };

  // Undo Last Raid
  const handleUndoRaid = async () => {
    if (!window.confirm('Undo the last recorded raid for this match? This action cannot be undone.')) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await api.undoLastKabaddiRaid(match.id);
      setScoringState(res.state);
      if (res.state.nextRaidingTeamId) {
        setCurrentRaidingTeamId(res.state.nextRaidingTeamId);
      }
      resetRaidTimer(30);
    } catch (err: any) {
      setError(err.message || 'Failed to undo raid.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Timeout
  const handleRecordTimeout = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await api.recordKabaddiTimeout(match.id, {
        teamId: timeoutTeamId,
        half: scoringState?.currentHalf || 1,
      });
      setScoringState(res.state);
      setIsTimeoutModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to record timeout.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Substitution
  const handleRecordSubstitution = async () => {
    if (!subPlayerOutId || !subPlayerInId) {
      setError('Please select both outgoing and incoming players.');
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      const res = await api.recordKabaddiSubstitution(match.id, {
        teamId: subTeamId,
        playerOutId: subPlayerOutId,
        playerInId: subPlayerInId,
        half: scoringState?.currentHalf || 1,
      });
      setScoringState(res.state);
      setIsSubModalOpen(false);
      setSubPlayerOutId('');
      setSubPlayerInId('');
    } catch (err: any) {
      setError(err.message || 'Failed to record substitution.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Half Transitions
  const handleTransitionHalf = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await api.transitionKabaddiHalf(match.id, targetHalfStatus);
      setScoringState(res.state);
      setIsHalfModalOpen(false);
      if (onMatchStatusChange) onMatchStatusChange();
    } catch (err: any) {
      setError(err.message || 'Failed to transition half.');
    } finally {
      setActionLoading(false);
    }
  };

  // Trigger manual broadcast overlay
  const handleTriggerBroadcast = async (type: string, data: any = {}) => {
    try {
      await api.triggerBroadcastEvent(match.id, {
        type,
        durationSeconds: 4,
        data,
      });
    } catch (err: any) {
      console.error('Trigger broadcast error:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center bg-slate-900/60 rounded-2xl border border-slate-800">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs text-slate-400">Connecting to Kabaddi Live Scoring Engine...</p>
      </div>
    );
  }

  const teamAScore = scoringState?.teamAScore ?? 0;
  const teamBScore = scoringState?.teamBScore ?? 0;
  const teamAPlayersOnCourt = scoringState?.activeCourtPlayerIdsA.length ?? 7;
  const teamBPlayersOnCourt = scoringState?.activeCourtPlayerIdsB.length ?? 7;

  return (
    <div className="space-y-4 bg-slate-950 p-3 sm:p-5 rounded-2xl border border-slate-800 text-slate-100">
      {/* ERROR ALERT */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200 text-xs font-bold">
            ✕
          </button>
        </div>
      )}

      {/* TOP LIVE SCOREBOARD HEADER */}
      <Card className="p-4 sm:p-5 bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border-amber-500/20 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              KABADDI PRO ENGINE
            </span>
            <span className="text-xs font-bold text-slate-300 px-2 py-0.5 rounded bg-slate-800/80">
              Half {scoringState?.currentHalf || 1}
            </span>
            {scoringState?.isMatchComplete && (
              <Badge variant="success" className="text-xs">
                MATCH COMPLETE
              </Badge>
            )}
          </div>

          {/* Quick Actions & Broadcast Links */}
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const target = scoringState?.currentHalf === 1 ? 'HALF_TIME' : 'COMPLETED';
                setTargetHalfStatus(target);
                setIsHalfModalOpen(true);
              }}
              className="text-xs font-bold bg-slate-800 hover:bg-slate-700"
            >
              <Clock className="w-3.5 h-3.5 mr-1 text-amber-400" />
              {scoringState?.currentHalf === 1 ? 'End 1st Half' : 'End Match'}
            </Button>

            <a
              href={`/broadcast/match/${match.id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-all"
            >
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              Live OBS Graphics
            </a>
          </div>
        </div>

        {/* Big Teams Score Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4 py-2">
          {/* Team A Score Column */}
          <div
            onClick={() => setCurrentRaidingTeamId(match.teamAId)}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              currentRaidingTeamId === match.teamAId
                ? 'bg-amber-500/10 border-amber-500/50 ring-2 ring-amber-500/20'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-extrabold text-slate-100">{match.teamA?.name || 'Team A'}</h3>
                  <p className="text-[11px] text-slate-400">
                    {teamAPlayersOnCourt} on Court • {7 - teamAPlayersOnCourt} Out
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-3xl sm:text-4xl font-black text-amber-400 tracking-tight font-mono">
                  {teamAScore}
                </span>
                <p className="text-[10px] text-slate-400 font-bold">
                  H1: {scoringState?.teamAScoreHalf1 ?? 0} | H2: {scoringState?.teamAScoreHalf2 ?? 0}
                </p>
              </div>
            </div>

            {/* Badges for Team A */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-800/80">
              {currentRaidingTeamId === match.teamAId && (
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500 text-slate-950">
                  ⚡ RAIDING
                </span>
              )}
              {scoringState?.teamAStats.consecutiveEmptyRaids ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                  Empty Raids: {scoringState.teamAStats.consecutiveEmptyRaids}
                </span>
              ) : null}
              {scoringState?.teamAStats.allOutsInflicted ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  All-Outs: {scoringState.teamAStats.allOutsInflicted}
                </span>
              ) : null}
            </div>
          </div>

          {/* Central Raid Timer & Status */}
          <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center space-y-2">
            <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
              Raid Countdown Clock
            </span>
            <div className="flex items-center gap-3">
              <span
                className={`text-4xl sm:text-5xl font-black font-mono tracking-tighter ${
                  raidTimerSeconds <= 5
                    ? 'text-rose-500 animate-ping'
                    : raidTimerSeconds <= 10
                    ? 'text-amber-400'
                    : 'text-slate-100'
                }`}
              >
                {raidTimerSeconds < 10 ? `0${raidTimerSeconds}` : raidTimerSeconds}
                <span className="text-sm font-bold text-slate-500 ml-1">s</span>
              </span>

              <div className="flex flex-col gap-1">
                {isTimerRunning ? (
                  <button
                    onClick={pauseRaidTimer}
                    className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-all"
                    title="Pause Timer"
                  >
                    <PauseCircle className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    onClick={startRaidTimer}
                    className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all"
                    title="Start Timer"
                  >
                    <PlayCircle className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={() => resetRaidTimer(30)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 transition-all"
                  title="Reset 30s"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Do-or-Die & Super Tackle situation indicators */}
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {isDoOrDie && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500 text-slate-950 font-black text-[10px] animate-pulse">
                  🚨 DO-OR-DIE RAID
                </span>
              )}
              {isSuperTackleCondition && (
                <span className="px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-300 font-bold text-[10px]">
                  🛡️ SUPER TACKLE ON ({activeDefendingCourtIds.length} Def)
                </span>
              )}
            </div>
          </div>

          {/* Team B Score Column */}
          <div
            onClick={() => setCurrentRaidingTeamId(match.teamBId)}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              currentRaidingTeamId === match.teamBId
                ? 'bg-sky-500/10 border-sky-500/50 ring-2 ring-sky-500/20'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-sky-400" />
                <div>
                  <h3 className="text-base font-extrabold text-slate-100">{match.teamB?.name || 'Team B'}</h3>
                  <p className="text-[11px] text-slate-400">
                    {teamBPlayersOnCourt} on Court • {7 - teamBPlayersOnCourt} Out
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-3xl sm:text-4xl font-black text-sky-400 tracking-tight font-mono">
                  {teamBScore}
                </span>
                <p className="text-[10px] text-slate-400 font-bold">
                  H1: {scoringState?.teamBScoreHalf1 ?? 0} | H2: {scoringState?.teamBScoreHalf2 ?? 0}
                </p>
              </div>
            </div>

            {/* Badges for Team B */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-800/80">
              {currentRaidingTeamId === match.teamBId && (
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-sky-500 text-slate-950">
                  ⚡ RAIDING
                </span>
              )}
              {scoringState?.teamBStats.consecutiveEmptyRaids ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                  Empty Raids: {scoringState.teamBStats.consecutiveEmptyRaids}
                </span>
              ) : null}
              {scoringState?.teamBStats.allOutsInflicted ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  All-Outs: {scoringState.teamBStats.allOutsInflicted}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </Card>

      {/* ACTIVE RAIDER & COURT INTERACTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Raider & Court Section (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          {/* Active Raider Selector */}
          <Card className="p-4 bg-slate-900/80 border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Active Raider ({raidingTeamName})
                </h4>
              </div>
              <button
                onClick={() => setCurrentRaidingTeamId(defendingTeamId)}
                className="text-[11px] font-bold text-amber-400 hover:underline flex items-center gap-1"
              >
                Switch Raiding Team 🔄
              </button>
            </div>

            {raidingCourtPlayers.length === 0 ? (
              <p className="text-xs text-rose-400 py-2">No active players on court for {raidingTeamName} (ALL OUT).</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {raidingCourtPlayers.map((player) => {
                  const isSelected = selectedRaiderId === player.id;
                  const stats = scoringState?.playerStats.find((s) => s.playerId === player.id);

                  return (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => setSelectedRaiderId(player.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-500 text-amber-200 shadow-md ring-1 ring-amber-500/30'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="w-5 h-5 rounded bg-slate-800 text-[10px] font-bold flex items-center justify-center">
                          #{player.jerseyNumber || '-'}
                        </span>
                        {stats && (
                          <span className="text-[10px] font-extrabold text-amber-400">
                            {stats.totalRaidPoints} pts
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-xs mt-1 truncate">{player.name}</p>
                      <p className="text-[10px] text-slate-400">{player.role || 'Raider'}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Defending Court Players (Tap to select touched defenders) */}
          <Card className="p-4 bg-slate-900/80 border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-sky-400" />
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Defending Court ({defendingTeamName} - {defendingCourtPlayers.length} Active)
                </h4>
              </div>
              <span className="text-[10px] font-bold text-slate-400">Tap to tag touched defender</span>
            </div>

            <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
              {defendingCourtPlayers.map((player) => {
                const isTouched = touchedDefenderIds.includes(player.id);
                const isTackler = tacklingDefenderIds.includes(player.id);

                return (
                  <div
                    key={player.id}
                    className={`p-2 rounded-lg border text-xs flex items-center justify-between transition-all ${
                      isTouched
                        ? 'bg-rose-500/20 border-rose-500/50 text-rose-200'
                        : isTackler
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-slate-800 text-[10px] font-bold flex items-center justify-center">
                        #{player.jerseyNumber || '-'}
                      </span>
                      <span className="font-semibold">{player.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setTouchedDefenderIds((prev) =>
                            prev.includes(player.id) ? prev.filter((id) => id !== player.id) : [...prev, player.id]
                          );
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                          isTouched ? 'bg-rose-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {isTouched ? '✓ TOUCHED' : '+ Touch'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setTacklingDefenderIds((prev) =>
                            prev.includes(player.id) ? prev.filter((id) => id !== player.id) : [player.id]
                          );
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                          isTackler ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {isTackler ? '🛡️ TACKLER' : '+ Tackle'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* HIGH-SPEED TOUCH KEYPAD (7 Cols) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Quick Outcome Action Matrix */}
          <Card className="p-4 sm:p-5 bg-slate-900/90 border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" /> Fast Touch Scoring Keypad
              </h4>

              {/* Do-or-Die and Super Tackle Toggles */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsDoOrDie((prev) => !prev)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black tracking-wider transition-all cursor-pointer ${
                    isDoOrDie
                      ? 'bg-rose-500 text-slate-950 shadow-md'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {isDoOrDie ? '🚨 DO-OR-DIE [ON]' : 'Do-or-Die'}
                </button>

                <button
                  type="button"
                  onClick={() => setHasBonus((prev) => !prev)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black tracking-wider transition-all cursor-pointer ${
                    hasBonus
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {hasBonus ? '🌟 BONUS [ON]' : '+ Bonus'}
                </button>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {/* 1. Empty Raid */}
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleRecordRaid('EMPTY_RAID')}
                className="p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-left transition-all active:scale-[0.98] cursor-pointer"
              >
                <span className="text-lg">⚪</span>
                <p className="font-extrabold text-sm mt-1">Empty Raid</p>
                <p className="text-[10px] text-slate-400">0 Pts • Safe return</p>
              </button>

              {/* 2. Touch Point (1 pt) */}
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleRecordRaid('TOUCH_POINT', { touchPoints: 1 })}
                className="p-3.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/40 text-emerald-200 text-left transition-all active:scale-[0.98] cursor-pointer"
              >
                <span className="text-lg">🟢</span>
                <p className="font-extrabold text-sm mt-1">1 Touch Point</p>
                <p className="text-[10px] text-emerald-400">1 Defender out + Revive</p>
              </button>

              {/* 3. Multi-Touch 2 Points */}
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleRecordRaid('SUCCESSFUL_RAID', { touchPoints: 2 })}
                className="p-3.5 rounded-xl bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-500/60 text-emerald-200 text-left transition-all active:scale-[0.98] cursor-pointer"
              >
                <span className="text-lg">⚡</span>
                <p className="font-extrabold text-sm mt-1">2 Touch Points</p>
                <p className="text-[10px] text-emerald-400">2 Defenders out</p>
              </button>

              {/* 4. Super Raid (3+ Pts) */}
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleRecordRaid('SUPER_RAID', { touchPoints: 3, isSuperRaid: true })}
                className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/50 text-amber-200 text-left transition-all active:scale-[0.98] cursor-pointer"
              >
                <span className="text-lg">🔥</span>
                <p className="font-extrabold text-sm mt-1">SUPER RAID (3 Pts)</p>
                <p className="text-[10px] text-amber-300">3+ points recorded</p>
              </button>

              {/* 5. Bonus Point Only */}
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleRecordRaid('BONUS_POINT', { bonusPoints: 1, touchPoints: 0 })}
                className="p-3.5 rounded-xl bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/40 text-yellow-200 text-left transition-all active:scale-[0.98] cursor-pointer"
              >
                <span className="text-lg">🌟</span>
                <p className="font-extrabold text-sm mt-1">Bonus Point</p>
                <p className="text-[10px] text-yellow-400">+1 Pt (No revival)</p>
              </button>

              {/* 6. Bonus + Touch */}
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleRecordRaid('BONUS_AND_TOUCH', { bonusPoints: 1, touchPoints: 1 })}
                className="p-3.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500 text-emerald-200 text-left transition-all active:scale-[0.98] cursor-pointer"
              >
                <span className="text-lg">💫</span>
                <p className="font-extrabold text-sm mt-1">Bonus + 1 Touch (2 Pts)</p>
                <p className="text-[10px] text-emerald-300">1 Bonus + 1 Touch</p>
              </button>

              {/* 7. Tackle Point (Defense +1) */}
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleRecordRaid('TACKLE_POINT', { tacklePoints: 1 })}
                className="p-3.5 rounded-xl bg-sky-950/40 hover:bg-sky-900/50 border border-sky-500/40 text-sky-200 text-left transition-all active:scale-[0.98] cursor-pointer"
              >
                <span className="text-lg">🛡️</span>
                <p className="font-extrabold text-sm mt-1">Tackle Point</p>
                <p className="text-[10px] text-sky-400">Raider Out + 1 Defense Pt</p>
              </button>

              {/* 8. Super Tackle (2 Pts) */}
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleRecordRaid('SUPER_TACKLE', { tacklePoints: 2, isSuperTackle: true })}
                className="p-3.5 rounded-xl bg-gradient-to-r from-sky-500/20 to-indigo-500/20 hover:from-sky-500/30 hover:to-indigo-500/30 border border-sky-400 text-sky-200 text-left transition-all active:scale-[0.98] cursor-pointer"
              >
                <span className="text-lg">🏆</span>
                <p className="font-extrabold text-sm mt-1">SUPER TACKLE (2 Pts)</p>
                <p className="text-[10px] text-sky-300">Defenders ≤ 3 on court</p>
              </button>

              {/* 9. Technical Point */}
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleRecordRaid('TECHNICAL_POINT', { technicalPoints: 1 })}
                className="p-3.5 rounded-xl bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/40 text-purple-200 text-left transition-all active:scale-[0.98] cursor-pointer"
              >
                <span className="text-lg">🟨</span>
                <p className="font-extrabold text-sm mt-1">Technical Point</p>
                <p className="text-[10px] text-purple-300">Penalty / Line violation</p>
              </button>
            </div>

            {/* Utility Bar: Undo, Timeout, Substitution */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <Button
                  variant="danger"
                  size="sm"
                  disabled={actionLoading || (scoringState?.raids.length || 0) === 0}
                  onClick={handleUndoRaid}
                  className="text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40"
                >
                  <Undo2 className="w-3.5 h-3.5 mr-1" />
                  Undo Last Raid
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsTimeoutModalOpen(true)}
                  className="text-xs font-bold bg-slate-800 hover:bg-slate-700"
                >
                  <Clock className="w-3.5 h-3.5 mr-1 text-amber-400" />
                  Timeout ({scoringState?.teamAStats.timeoutsTaken ?? 0}/2 - {scoringState?.teamBStats.timeoutsTaken ?? 0}/2)
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsSubModalOpen(true)}
                  className="text-xs font-bold bg-slate-800 hover:bg-slate-700"
                >
                  <Users className="w-3.5 h-3.5 mr-1 text-sky-400" />
                  Substitute
                </Button>
              </div>

              {/* Quick Broadcast Manual Triggers */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleTriggerBroadcast('SUPER_RAID', { points: 3 })}
                  className="px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[10px] font-bold border border-amber-500/30"
                  title="Trigger Super Raid Overlay"
                >
                  🔥 Super Raid FX
                </button>
                <button
                  type="button"
                  onClick={() => handleTriggerBroadcast('ALL_OUT', { points: 2 })}
                  className="px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] font-bold border border-rose-500/30"
                  title="Trigger All-Out Overlay"
                >
                  💥 All-Out FX
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* RECENT RAIDS TIMELINE (LAST 8 RAIDS) */}
      <Card className="p-4 bg-slate-900/80 border-slate-800 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" /> Recent Raids Feed ({scoringState?.raids.length || 0} Total)
          </h4>
          <span className="text-[10px] text-slate-400">Live immutable event stream</span>
        </div>

        {scoringState?.raids.length === 0 ? (
          <p className="text-xs text-slate-500 py-3 text-center">No raids recorded yet. Select an active raider and press an outcome button above.</p>
        ) : (
          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
            {[...(scoringState?.raids || [])].reverse().slice(0, 8).map((raid) => {
              const raider = allPlayers.find((p) => p.id === raid.raiderPlayerId);
              const team = raid.raidingTeamId === match.teamAId ? match.teamA : match.teamB;

              return (
                <div
                  key={raid.id}
                  className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded bg-slate-800 text-[11px] font-mono font-bold flex items-center justify-center text-slate-300 shrink-0">
                      #{raid.raidNumber}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-slate-200">{raider?.name || 'Raider'}</span>
                        <span className="text-[10px] text-slate-400">({team?.name || 'Team'})</span>
                        {raid.isDoOrDie && (
                          <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold text-[9px]">
                            DOD
                          </span>
                        )}
                        {raid.isSuperRaid && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold text-[9px]">
                            SUPER RAID
                          </span>
                        )}
                        {raid.isSuperTackle && (
                          <span className="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 font-bold text-[9px]">
                            SUPER TACKLE
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Outcome: <span className="font-semibold text-slate-300">{raid.outcome}</span> • Touch: {raid.touchPoints} | Bonus: {raid.bonusPoints} | Tackle: {raid.tacklePoints}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-extrabold font-mono text-amber-400">
                      {raid.scoreA_after} - {raid.scoreB_after}
                    </span>
                    <p className="text-[9px] text-slate-500">{new Date(raid.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* TIMEOUT MODAL */}
      {isTimeoutModalOpen && (
        <Dialog
          isOpen={isTimeoutModalOpen}
          onClose={() => setIsTimeoutModalOpen(false)}
          title="Record Team Timeout"
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-300">
              Each team is permitted 2 official timeouts per half (30 seconds each).
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Requesting Team</label>
              <select
                value={timeoutTeamId}
                onChange={(e) => setTimeoutTeamId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 outline-none"
              >
                <option value={match.teamAId}>{match.teamA?.name || 'Team A'}</option>
                <option value={match.teamBId}>{match.teamB?.name || 'Team B'}</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button variant="secondary" size="sm" onClick={() => setIsTimeoutModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" loading={actionLoading} onClick={handleRecordTimeout}>
                Confirm Timeout
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* SUBSTITUTION MODAL */}
      {isSubModalOpen && (
        <Dialog
          isOpen={isSubModalOpen}
          onClose={() => setIsSubModalOpen(false)}
          title="Player Substitution"
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Team</label>
              <select
                value={subTeamId}
                onChange={(e) => {
                  setSubTeamId(e.target.value);
                  setSubPlayerOutId('');
                  setSubPlayerInId('');
                }}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 outline-none"
              >
                <option value={match.teamAId}>{match.teamA?.name || 'Team A'}</option>
                <option value={match.teamBId}>{match.teamB?.name || 'Team B'}</option>
              </select>
            </div>

            {/* Outgoing Court Player */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Outgoing Player (Court)</label>
              <select
                value={subPlayerOutId}
                onChange={(e) => setSubPlayerOutId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 outline-none"
              >
                <option value="">Select player to come off...</option>
                {allPlayers
                  .filter((p) => p.teamId === subTeamId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.jerseyNumber || '-'} {p.name} ({p.role || 'Player'})
                    </option>
                  ))}
              </select>
            </div>

            {/* Incoming Bench Player */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Incoming Player (Bench)</label>
              <select
                value={subPlayerInId}
                onChange={(e) => setSubPlayerInId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 outline-none"
              >
                <option value="">Select substitute player to enter...</option>
                {allPlayers
                  .filter((p) => p.teamId === subTeamId && p.id !== subPlayerOutId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.jerseyNumber || '-'} {p.name} ({p.role || 'Player'})
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button variant="secondary" size="sm" onClick={() => setIsSubModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" loading={actionLoading} onClick={handleRecordSubstitution}>
                Confirm Substitution
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* HALF TRANSITION MODAL */}
      {isHalfModalOpen && (
        <ConfirmDialog
          isOpen={isHalfModalOpen}
          onClose={() => setIsHalfModalOpen(false)}
          onConfirm={handleTransitionHalf}
          title={targetHalfStatus === 'HALF_TIME' ? 'End 1st Half & Enter Half-Time?' : 'Complete Match?'}
          description={
            targetHalfStatus === 'HALF_TIME'
              ? 'This will record First Half final scores and trigger the Half-Time broadcast graphics overlay.'
              : 'This will mark the match as COMPLETED, lock scoring events, and calculate the final result.'
          }
          confirmText={targetHalfStatus === 'HALF_TIME' ? 'Start Half-Time' : 'Complete Match'}
          loading={actionLoading}
        />
      )}
    </div>
  );
};
