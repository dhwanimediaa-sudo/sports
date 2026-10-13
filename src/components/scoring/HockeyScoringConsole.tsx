import React, { useState, useEffect, useRef } from 'react';
import {
  Match,
  HockeyMatchScoringState,
  HockeyScoringEvent,
  HockeyGoalType,
  HockeyCardType,
  HockeyPenaltyCornerOutcome,
  HockeyPenaltyStrokeOutcome,
  HockeyShootoutOutcome,
  Player,
} from '../../types';
import { api } from '../../services/api';
import { useMatchStream } from '../../utils/useMatchStream';
import {
  Zap,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Trophy,
  AlertCircle,
  Clock,
  Shield,
  UserCheck,
  UserX,
  Users,
  Award,
  ChevronRight,
  Sparkles,
  ArrowRightLeft,
  Tv,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sliders,
  Flame,
  Volume2,
} from 'lucide-react';

interface HockeyScoringConsoleProps {
  match: Match;
  onMatchStatusChange?: () => void;
}

export const HockeyScoringConsole: React.FC<HockeyScoringConsoleProps> = ({
  match,
  onMatchStatusChange,
}) => {
  const [state, setState] = useState<HockeyMatchScoringState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals & Panels
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showPCModal, setShowPCModal] = useState(false);
  const [showPSModal, setShowPSModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [showShootoutModal, setShowShootoutModal] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [showClockModal, setShowClockModal] = useState(false);

  // Form State: Goal
  const [goalTeamId, setGoalTeamId] = useState<string>(match.teamAId);
  const [goalPlayerId, setGoalPlayerId] = useState<string>('');
  const [goalAssistPlayerId, setGoalAssistPlayerId] = useState<string>('');
  const [goalType, setGoalType] = useState<HockeyGoalType>('FIELD_GOAL');

  // Form State: Penalty Corner
  const [pcTeamId, setPcTeamId] = useState<string>(match.teamAId);
  const [pcOutcome, setPcOutcome] = useState<HockeyPenaltyCornerOutcome>('NO_GOAL');
  const [pcPlayerId, setPcPlayerId] = useState<string>('');

  // Form State: Penalty Stroke
  const [psTeamId, setPsTeamId] = useState<string>(match.teamAId);
  const [psPlayerId, setPsPlayerId] = useState<string>('');
  const [psOutcome, setPsOutcome] = useState<HockeyPenaltyStrokeOutcome>('GOAL');

  // Form State: Card
  const [cardTeamId, setCardTeamId] = useState<string>(match.teamAId);
  const [cardPlayerId, setCardPlayerId] = useState<string>('');
  const [cardType, setCardType] = useState<HockeyCardType>('GREEN');
  const [cardDuration, setCardDuration] = useState<number>(2);
  const [cardReason, setCardReason] = useState<string>('');

  // Form State: Substitution
  const [subTeamId, setSubTeamId] = useState<string>(match.teamAId);
  const [subPlayerOutId, setSubPlayerOutId] = useState<string>('');
  const [subPlayerInId, setSubPlayerInId] = useState<string>('');

  // Form State: Shootout
  const [soTeamId, setSoTeamId] = useState<string>(match.teamAId);
  const [soPlayerId, setSoPlayerId] = useState<string>('');
  const [soOutcome, setSoOutcome] = useState<HockeyShootoutOutcome>('GOAL');

  // Local Clock timer state
  const [clockSeconds, setClockSeconds] = useState<number>(0);
  const [clockIsRunning, setClockIsRunning] = useState<boolean>(false);
  const [manualClockInput, setManualClockInput] = useState<string>('00:00');

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch initial state
  const fetchScoringState = async () => {
    try {
      setLoading(true);
      const res = await api.getHockeyScoringState(match.id);
      setState(res.state);
      if (res.state.clock) {
        setClockSeconds(res.state.clock.elapsedSeconds);
        setClockIsRunning(res.state.clock.isRunning);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load scoring state.');
    } finally {
      setLoading(false);
    }
  };

  // SSE Realtime Subscription with exponential reconnect and deduplication
  useMatchStream({
    matchId: match.id,
    onMessage: (data) => {
      const scoring = data.scoringState || data;
      if (scoring && (scoring.sport === 'HOCKEY' || scoring.teamAScore !== undefined)) {
        setState(scoring);
        if (scoring.clock) {
          setClockSeconds(scoring.clock.elapsedSeconds);
          setClockIsRunning(scoring.clock.isRunning);
        }
      }
    },
  });

  useEffect(() => {
    fetchScoringState();
  }, [match.id]);

  // Local Clock Tick
  useEffect(() => {
    let timer: any;
    if (clockIsRunning) {
      timer = setInterval(() => {
        setClockSeconds((prev) => {
          const maxSec = state?.clock?.periodDurationSeconds || 900;
          if (prev >= maxSec) {
            setClockIsRunning(false);
            return maxSec;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [clockIsRunning, state?.clock?.periodDurationSeconds]);

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Handlers
  const handleToggleClock = async () => {
    const nextRunning = !clockIsRunning;
    setClockIsRunning(nextRunning);
    try {
      await api.updateHockeyClock(match.id, {
        isRunning: nextRunning,
        elapsedSeconds: clockSeconds,
      });
    } catch (err: any) {
      showToast(err.message || 'Failed to sync clock.');
    }
  };

  const handleResetClock = async () => {
    if (!window.confirm('Reset current quarter clock to 00:00?')) return;
    setClockSeconds(0);
    setClockIsRunning(false);
    try {
      await api.updateHockeyClock(match.id, {
        isRunning: false,
        elapsedSeconds: 0,
      });
      showToast('Clock reset to 00:00.');
    } catch (err: any) {
      showToast(err.message || 'Failed to reset clock.');
    }
  };

  const handleSetManualClock = async () => {
    const parts = manualClockInput.split(':');
    if (parts.length !== 2) return;
    const mins = parseInt(parts[0], 10) || 0;
    const secs = parseInt(parts[1], 10) || 0;
    const total = mins * 60 + secs;
    setClockSeconds(total);
    setShowClockModal(false);
    try {
      await api.updateHockeyClock(match.id, {
        elapsedSeconds: total,
      });
      showToast(`Clock set to ${formatTime(total)}.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to set clock.');
    }
  };

  const handleStartMatch = async () => {
    setActionLoading(true);
    try {
      const res = await api.startHockeyScoring(match.id);
      setState(res.state);
      setClockIsRunning(true);
      setClockSeconds(0);
      showToast('Match live scoring started! Quarter 1 in progress.');
      if (onMatchStatusChange) onMatchStatusChange();
    } catch (err: any) {
      showToast(err.message || 'Failed to start scoring.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordGoal = async () => {
    if (!goalTeamId || actionLoading || state?.isMatchComplete) return;
    setActionLoading(true);
    try {
      const res = await api.recordHockeyGoal(match.id, {
        teamId: goalTeamId,
        playerId: goalPlayerId || undefined,
        assistPlayerId: goalAssistPlayerId || undefined,
        goalType,
        period: state?.currentPeriod || 1,
        matchTimeSeconds: clockSeconds,
        matchTimeDisplay: formatTime(clockSeconds),
      });
      setState(res.state);
      setShowGoalModal(false);
      setGoalPlayerId('');
      setGoalAssistPlayerId('');
      showToast('Goal recorded!');
    } catch (err: any) {
      showToast(err.message || 'Failed to record goal.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordPC = async () => {
    if (!pcTeamId || actionLoading || state?.isMatchComplete) return;
    setActionLoading(true);
    try {
      const res = await api.recordHockeyPenaltyCorner(match.id, {
        teamId: pcTeamId,
        playerId: pcPlayerId || undefined,
        outcome: pcOutcome,
        period: state?.currentPeriod || 1,
        matchTimeSeconds: clockSeconds,
        matchTimeDisplay: formatTime(clockSeconds),
      });
      setState(res.state);
      setShowPCModal(false);
      showToast('Penalty Corner recorded!');
    } catch (err: any) {
      showToast(err.message || 'Failed to record Penalty Corner.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordPS = async () => {
    if (!psTeamId || actionLoading || state?.isMatchComplete) return;
    setActionLoading(true);
    try {
      const res = await api.recordHockeyPenaltyStroke(match.id, {
        teamId: psTeamId,
        playerId: psPlayerId || undefined,
        outcome: psOutcome,
        period: state?.currentPeriod || 1,
        matchTimeSeconds: clockSeconds,
        matchTimeDisplay: formatTime(clockSeconds),
      });
      setState(res.state);
      setShowPSModal(false);
      showToast('Penalty Stroke recorded!');
    } catch (err: any) {
      showToast(err.message || 'Failed to record Penalty Stroke.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordCard = async () => {
    if (!cardTeamId || !cardPlayerId) return;
    setActionLoading(true);
    try {
      const res = await api.recordHockeyCard(match.id, {
        teamId: cardTeamId,
        playerId: cardPlayerId,
        cardType,
        cardDurationMinutes: cardDuration,
        cardReason,
        period: state?.currentPeriod || 1,
        matchTimeSeconds: clockSeconds,
        matchTimeDisplay: formatTime(clockSeconds),
      });
      setState(res.state);
      setShowCardModal(false);
      setCardPlayerId('');
      setCardReason('');
      showToast(`${cardType} card issued!`);
    } catch (err: any) {
      showToast(err.message || 'Failed to issue card.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordSub = async () => {
    if (!subTeamId || !subPlayerOutId || !subPlayerInId) return;
    setActionLoading(true);
    try {
      const res = await api.recordHockeySubstitution(match.id, {
        teamId: subTeamId,
        playerOutId: subPlayerOutId,
        playerInId: subPlayerInId,
        period: state?.currentPeriod || 1,
        matchTimeSeconds: clockSeconds,
        matchTimeDisplay: formatTime(clockSeconds),
      });
      setState(res.state);
      setShowSubModal(false);
      setSubPlayerOutId('');
      setSubPlayerInId('');
      showToast('Substitution recorded!');
    } catch (err: any) {
      showToast(err.message || 'Failed to record substitution.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordShootout = async () => {
    if (!soTeamId || !soPlayerId) return;
    setActionLoading(true);
    try {
      const res = await api.recordHockeyShootout(match.id, {
        teamId: soTeamId,
        playerId: soPlayerId,
        outcome: soOutcome,
      });
      setState(res.state);
      setShowShootoutModal(false);
      setSoPlayerId('');
      showToast('Shootout attempt recorded!');
    } catch (err: any) {
      showToast(err.message || 'Failed to record shootout attempt.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePeriodAction = async (action: string, nextPeriod?: number) => {
    setActionLoading(true);
    try {
      const res = await api.transitionHockeyPeriod(match.id, { action, nextPeriod });
      setState(res.state);
      setShowPeriodModal(false);
      if (action === 'END_PERIOD') {
        setClockIsRunning(false);
        showToast('Period ended.');
      } else if (action === 'START_PERIOD') {
        setClockIsRunning(true);
        setClockSeconds(0);
        showToast(`Quarter ${nextPeriod} started.`);
      } else if (action === 'COMPLETE') {
        setClockIsRunning(false);
        showToast('Match marked as COMPLETED.');
        if (onMatchStatusChange) onMatchStatusChange();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update period.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUndo = async () => {
    if (!window.confirm('Undo the last recorded action?')) return;
    setActionLoading(true);
    try {
      const res = await api.undoHockeyEvent(match.id);
      setState(res.state);
      showToast('Last event undone.');
    } catch (err: any) {
      showToast(err.message || 'Failed to undo.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !state) {
    return (
      <div className="p-8 bg-slate-900 rounded-2xl border border-slate-800 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs text-slate-400 font-medium">Loading Field Hockey Live Scoring Engine...</p>
      </div>
    );
  }

  if (error || !state) {
    return (
      <div className="p-8 bg-rose-950/40 border border-rose-800 rounded-2xl text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
        <p className="text-sm font-bold text-rose-200">{error || 'Scoring state unavailable.'}</p>
        <button
          onClick={fetchScoringState}
          className="px-4 py-1.5 bg-rose-800 hover:bg-rose-700 text-white rounded-lg text-xs font-bold"
        >
          Retry
        </button>
      </div>
    );
  }

  const teamAPlayers = match.teamAPlayers || [];
  const teamBPlayers = match.teamBPlayers || [];
  const currentTeamPlayers = goalTeamId === match.teamAId ? teamAPlayers : teamBPlayers;
  const currentCardTeamPlayers = cardTeamId === match.teamAId ? teamAPlayers : teamBPlayers;
  const currentSubTeamPlayers = subTeamId === match.teamAId ? teamAPlayers : teamBPlayers;
  const currentSoTeamPlayers = soTeamId === match.teamAId ? teamAPlayers : teamBPlayers;

  const activeCourtPlayerIds = new Set(
    subTeamId === match.teamAId ? state.activeCourtPlayerIdsA : state.activeCourtPlayerIdsB
  );

  return (
    <div className="space-y-4">
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 px-4 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs shadow-2xl flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP LIVE SCORECARD BANNER */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-1/4 w-96 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 relative z-10">
          {/* TEAM A */}
          <div className="flex items-center gap-4 flex-1 justify-end text-right">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-white">{match.teamA?.name}</h2>
              <div className="flex items-center justify-end gap-3 text-xs text-slate-400 font-semibold mt-1">
                <span>PC: {state.teamAStats.penaltyCorners}</span>
                <span>•</span>
                <span>Cards: G{state.teamAStats.greenCards} Y{state.teamAStats.yellowCards} R{state.teamAStats.redCards}</span>
              </div>
            </div>
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center text-3xl md:text-4xl font-black text-emerald-400 shadow-inner">
              {state.teamAScore}
            </div>
          </div>

          {/* PERIOD & MATCH CLOCK CONTROLS */}
          <div className="flex flex-col items-center justify-center shrink-0 px-6 py-2 rounded-2xl bg-slate-950/80 border border-slate-800 text-center min-w-[220px]">
            <span className="px-3 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-black tracking-wider uppercase mb-1">
              {state.currentPeriodName}
            </span>

            {/* LIVE DIGITAL CLOCK */}
            <div className="flex items-center gap-2 my-1">
              <span className={`text-3xl md:text-4xl font-black font-mono tracking-tight ${clockIsRunning ? 'text-emerald-400' : 'text-slate-300'}`}>
                {formatTime(clockSeconds)}
              </span>
            </div>

            {/* CLOCK BUTTONS */}
            <div className="flex items-center gap-1.5 mt-1">
              <button
                onClick={handleToggleClock}
                className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                  clockIsRunning
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30'
                    : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                }`}
              >
                {clockIsRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                {clockIsRunning ? 'PAUSE' : 'START'}
              </button>

              <button
                onClick={() => {
                  setManualClockInput(formatTime(clockSeconds));
                  setShowClockModal(true);
                }}
                className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white border border-slate-800 transition"
                title="Adjust Clock Time"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleResetClock}
                className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white border border-slate-800 transition"
                title="Reset Quarter Clock"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* TEAM B */}
          <div className="flex items-center gap-4 flex-1 justify-start text-left">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-sky-500/10 border-2 border-sky-500/30 flex items-center justify-center text-3xl md:text-4xl font-black text-sky-400 shadow-inner">
              {state.teamBScore}
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-white">{match.teamB?.name}</h2>
              <div className="flex items-center justify-start gap-3 text-xs text-slate-400 font-semibold mt-1">
                <span>PC: {state.teamBStats.penaltyCorners}</span>
                <span>•</span>
                <span>Cards: G{state.teamBStats.greenCards} Y{state.teamBStats.yellowCards} R{state.teamBStats.redCards}</span>
              </div>
            </div>
          </div>
        </div>

        {/* QUARTER BREAKDOWN BAR */}
        <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Periods:</span>
            {state.periodScores.map((ps) => (
              <div
                key={ps.period}
                className={`px-3 py-1 rounded-lg border font-mono text-[11px] flex items-center gap-1.5 ${
                  ps.period === state.currentPeriod
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <span className="text-slate-500 font-sans font-bold">{ps.periodName}:</span>
                <span className="font-bold text-slate-200">{ps.teamAScore}-{ps.teamBScore}</span>
                {(ps.teamAPenaltyCorners > 0 || ps.teamBPenaltyCorners > 0) && (
                  <span className="text-[9px] text-amber-400/80">({ps.teamAPenaltyCorners}c-{ps.teamBPenaltyCorners}c)</span>
                )}
              </div>
            ))}
          </div>

          {state.isShootout && (
            <div className="px-3 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold flex items-center gap-2">
              <Trophy className="w-3.5 h-3.5 text-purple-400" />
              <span>Shootout Score: {state.shootoutScoreA} - {state.shootoutScoreB}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPeriodModal(true)}
              className="px-3 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 text-xs font-bold border border-indigo-500/40 flex items-center gap-1 transition"
            >
              <RotateCw className="w-3 h-3" />
              <span>Quarter / Period Actions</span>
            </button>
          </div>
        </div>
      </div>

      {/* MATCH NOT STARTED STATE CALLOUT */}
      {match.status === 'READY' && state.events.length === 0 && (
        <div className="p-6 bg-slate-900 border border-emerald-500/40 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-400" /> Match Ready for Kickoff
            </h3>
            <p className="text-xs text-slate-400">
              Lineups and starting 11 confirmed. Click start to begin official match clock and Quarter 1 scoring.
            </p>
          </div>
          <button
            onClick={handleStartMatch}
            disabled={actionLoading}
            className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/20 transition flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" /> START MATCH & Q1
          </button>
        </div>
      )}

      {/* QUICK LIVE SCORING ACTION PAD */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* + GOAL BUTTON */}
        <button
          onClick={() => {
            setGoalTeamId(match.teamAId);
            setGoalType('FIELD_GOAL');
            setShowGoalModal(true);
          }}
          className="p-4 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 hover:from-emerald-500 hover:to-emerald-700 text-white font-black text-xs md:text-sm border border-emerald-400/40 shadow-lg shadow-emerald-950/50 flex flex-col items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
        >
          <Trophy className="w-6 h-6 text-emerald-200" />
          <span>+ RECORD GOAL</span>
        </button>

        {/* PENALTY CORNER */}
        <button
          onClick={() => {
            setPcTeamId(match.teamAId);
            setPcOutcome('NO_GOAL');
            setShowPCModal(true);
          }}
          className="p-4 rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 hover:from-amber-500 hover:to-amber-700 text-white font-black text-xs md:text-sm border border-amber-400/40 shadow-lg shadow-amber-950/50 flex flex-col items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
        >
          <Flame className="w-6 h-6 text-amber-200" />
          <span>PENALTY CORNER</span>
        </button>

        {/* PENALTY STROKE */}
        <button
          onClick={() => {
            setPsTeamId(match.teamAId);
            setPsOutcome('GOAL');
            setShowPSModal(true);
          }}
          className="p-4 rounded-xl bg-gradient-to-br from-rose-600 to-rose-800 hover:from-rose-500 hover:to-rose-700 text-white font-black text-xs md:text-sm border border-rose-400/40 shadow-lg shadow-rose-950/50 flex flex-col items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
        >
          <Zap className="w-6 h-6 text-rose-200" />
          <span>PENALTY STROKE</span>
        </button>

        {/* ISSUE CARD */}
        <button
          onClick={() => {
            setCardTeamId(match.teamAId);
            setCardType('GREEN');
            setCardDuration(2);
            setShowCardModal(true);
          }}
          className="p-4 rounded-xl bg-gradient-to-br from-indigo-700 to-indigo-900 hover:from-indigo-600 hover:to-indigo-800 text-white font-black text-xs md:text-sm border border-indigo-400/40 shadow-lg shadow-indigo-950/50 flex flex-col items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
        >
          <AlertCircle className="w-6 h-6 text-indigo-200" />
          <span>CARDS & FOULS</span>
        </button>

        {/* SUBSTITUTION */}
        <button
          onClick={() => {
            setSubTeamId(match.teamAId);
            setShowSubModal(true);
          }}
          className="p-4 rounded-xl bg-gradient-to-br from-cyan-700 to-cyan-900 hover:from-cyan-600 hover:to-cyan-800 text-white font-black text-xs md:text-sm border border-cyan-400/40 shadow-lg shadow-cyan-950/50 flex flex-col items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
        >
          <ArrowRightLeft className="w-6 h-6 text-cyan-200" />
          <span>SUBSTITUTION</span>
        </button>

        {/* SHOOTOUT */}
        <button
          onClick={() => {
            setSoTeamId(match.teamAId);
            setSoOutcome('GOAL');
            setShowShootoutModal(true);
          }}
          className="p-4 rounded-xl bg-gradient-to-br from-purple-700 to-purple-900 hover:from-purple-600 hover:to-purple-800 text-white font-black text-xs md:text-sm border border-purple-400/40 shadow-lg shadow-purple-950/50 flex flex-col items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
        >
          <Award className="w-6 h-6 text-purple-200" />
          <span>1v1 SHOOTOUT</span>
        </button>
      </div>

      {/* SUSPENSIONS & ACTIVE SIN-BIN ALERT */}
      {state.activeSuspensions.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 space-y-2">
          <h4 className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4" /> ACTIVE PLAYER SUSPENSIONS (SIN-BIN)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {state.activeSuspensions.map((susp) => (
              <div
                key={susp.id}
                className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-3 h-4 rounded-sm shrink-0 ${
                      susp.cardType === 'GREEN'
                        ? 'bg-emerald-400'
                        : susp.cardType === 'YELLOW'
                        ? 'bg-amber-400'
                        : 'bg-rose-500'
                    }`}
                  ></span>
                  <div>
                    <p className="font-bold text-slate-200">{susp.playerName}</p>
                    <p className="text-[10px] text-slate-400">
                      {susp.teamId === match.teamAId ? match.teamA?.name : match.teamB?.name} • Q{susp.period}
                    </p>
                  </div>
                </div>
                <span className="font-mono font-bold text-amber-400 text-xs">
                  {susp.cardType === 'RED' ? 'OUT' : `${susp.durationMinutes} min`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TWO COLUMN GRID: LIVE TIMELINE & SQUAD OVERVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* COLUMN 1 & 2: LIVE EVENT TIMELINE & UNDO */}
        <div className="lg:col-span-2 space-y-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                  Live Match Timeline ({state.events.length} Events)
                </h3>
              </div>
              <button
                onClick={handleUndo}
                disabled={state.events.length === 0 || actionLoading}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 font-bold text-xs border border-rose-500/20 flex items-center gap-1.5 transition disabled:opacity-40 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Undo Last Event
              </button>
            </div>

            {state.events.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 space-y-1">
                <HelpCircle className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                <p>No events recorded yet.</p>
                <p>Use the action buttons above to record goals, penalty corners, strokes, and cards.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {[...state.events].reverse().map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs hover:border-slate-700 transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-12 text-center font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                        {ev.matchTimeDisplay}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          ev.eventType === 'GOAL'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : ev.eventType === 'PENALTY_CORNER'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : ev.eventType === 'PENALTY_STROKE'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : ev.eventType === 'CARD'
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            : ev.eventType === 'SUBSTITUTION'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {ev.eventType.replace('_', ' ')}
                      </span>
                      <div>
                        <p className="font-bold text-slate-200">
                          {ev.eventType === 'GOAL' ? (
                            <>
                              ⚽ {ev.teamName}: {ev.playerName || 'Goal'}{' '}
                              {ev.assistPlayerName ? `(Assist: ${ev.assistPlayerName})` : ''}
                            </>
                          ) : ev.eventType === 'PENALTY_CORNER' ? (
                            <>PC for {ev.teamName} — Outcome: {ev.penaltyCornerOutcome}</>
                          ) : ev.eventType === 'PENALTY_STROKE' ? (
                            <>PS for {ev.teamName} by {ev.playerName} — {ev.penaltyStrokeOutcome}</>
                          ) : ev.eventType === 'CARD' ? (
                            <>
                              {ev.cardType} Card: {ev.playerName} ({ev.teamName}) • {ev.cardDurationMinutes}m
                            </>
                          ) : ev.eventType === 'SUBSTITUTION' ? (
                            <>
                              🔄 Sub: {ev.playerInName} IN for {ev.playerOutName} ({ev.teamName})
                            </>
                          ) : (
                            <>{ev.eventType} - {ev.periodName}</>
                          )}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Period: {ev.periodName} • Score: {ev.scoreA_after} - {ev.scoreB_after}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 3: PLAYING SQUADS & KEY STATS */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
              <Users className="w-4 h-4 text-emerald-400" /> Active Players on Pitch
            </h3>

            {/* TEAM A ROSTER */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                <span className="text-emerald-400">{match.teamA?.name}</span>
                <span className="text-[10px] text-slate-400">
                  {state.activeCourtPlayerIdsA.length} on pitch
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {state.activeCourtPlayerIdsA.map((id) => {
                  const p = teamAPlayers.find((pl) => pl.id === id);
                  const isGK = state.goalkeeperIdA === id;
                  const isSusp = state.activeSuspensions.some((s) => s.playerId === id);
                  return (
                    <span
                      key={id}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                        isSusp
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : isGK
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-slate-950 text-slate-300 border border-slate-800'
                      }`}
                    >
                      {isGK && <Shield className="w-2.5 h-2.5" />}
                      #{p?.jerseyNumber || '-'} {p?.name || 'Player'}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* TEAM B ROSTER */}
            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                <span className="text-sky-400">{match.teamB?.name}</span>
                <span className="text-[10px] text-slate-400">
                  {state.activeCourtPlayerIdsB.length} on pitch
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {state.activeCourtPlayerIdsB.map((id) => {
                  const p = teamBPlayers.find((pl) => pl.id === id);
                  const isGK = state.goalkeeperIdB === id;
                  const isSusp = state.activeSuspensions.some((s) => s.playerId === id);
                  return (
                    <span
                      key={id}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                        isSusp
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : isGK
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-slate-950 text-slate-300 border border-slate-800'
                      }`}
                    >
                      {isGK && <Shield className="w-2.5 h-2.5" />}
                      #{p?.jerseyNumber || '-'} {p?.name || 'Player'}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: RECORD GOAL */}
      {/* ========================================================================= */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-emerald-400" /> Record Field Hockey Goal
              </h3>
              <button onClick={() => setShowGoalModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Scoring Team */}
              <div>
                <label className="text-slate-400 font-bold block mb-1">Scoring Team</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGoalTeamId(match.teamAId)}
                    className={`p-3 rounded-xl border font-bold text-center transition ${
                      goalTeamId === match.teamAId
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    {match.teamA?.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => setGoalTeamId(match.teamBId)}
                    className={`p-3 rounded-xl border font-bold text-center transition ${
                      goalTeamId === match.teamBId
                        ? 'bg-sky-500 text-slate-950 border-sky-400'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    {match.teamB?.name}
                  </button>
                </div>
              </div>

              {/* Goal Type */}
              <div>
                <label className="text-slate-400 font-bold block mb-1">Goal Classification</label>
                <select
                  value={goalType}
                  onChange={(e) => setGoalType(e.target.value as HockeyGoalType)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                >
                  <option value="FIELD_GOAL">Field Goal (Open Play)</option>
                  <option value="PENALTY_CORNER_GOAL">Penalty Corner Conversion (PC Goal)</option>
                  <option value="PENALTY_STROKE_GOAL">Penalty Stroke Goal</option>
                  <option value="OWN_GOAL">Own Goal (Deflection)</option>
                </select>
              </div>

              {/* Goal Scorer */}
              <div>
                <label className="text-slate-400 font-bold block mb-1">Goal Scorer</label>
                <select
                  value={goalPlayerId}
                  onChange={(e) => setGoalPlayerId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                >
                  <option value="">-- Select Goal Scorer --</option>
                  {currentTeamPlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.jerseyNumber || '-'} {p.name} ({p.role || 'Player'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Assist Player */}
              <div>
                <label className="text-slate-400 font-bold block mb-1">Assist (Optional)</label>
                <select
                  value={goalAssistPlayerId}
                  onChange={(e) => setGoalAssistPlayerId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                >
                  <option value="">-- None / Direct --</option>
                  {currentTeamPlayers
                    .filter((p) => p.id !== goalPlayerId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        #{p.jerseyNumber || '-'} {p.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowGoalModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRecordGoal}
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20"
              >
                Confirm & Record Goal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: PENALTY CORNER */}
      {/* ========================================================================= */}
      {showPCModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-400" /> Record Penalty Corner (PC)
              </h3>
              <button onClick={() => setShowPCModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-bold block mb-1">Attacking Team</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPcTeamId(match.teamAId)}
                    className={`p-3 rounded-xl border font-bold text-center transition ${
                      pcTeamId === match.teamAId
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    {match.teamA?.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPcTeamId(match.teamBId)}
                    className={`p-3 rounded-xl border font-bold text-center transition ${
                      pcTeamId === match.teamBId
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    {match.teamB?.name}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">PC Execution Outcome</label>
                <select
                  value={pcOutcome}
                  onChange={(e) => setPcOutcome(e.target.value as HockeyPenaltyCornerOutcome)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                >
                  <option value="NO_GOAL">No Goal / Defended</option>
                  <option value="SAVED">Saved by Goalkeeper</option>
                  <option value="MISSED">Shot Missed / Wide</option>
                  <option value="DEFLECTED">Deflected Out by Defender</option>
                  <option value="GOAL">GOAL (Converts to Goal Score)</option>
                </select>
              </div>

              {pcOutcome === 'GOAL' && (
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Scorer (Drag-Flicker / Striker)</label>
                  <select
                    value={pcPlayerId}
                    onChange={(e) => setPcPlayerId(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                  >
                    <option value="">-- Select Scorer --</option>
                    {(pcTeamId === match.teamAId ? teamAPlayers : teamBPlayers).map((p) => (
                      <option key={p.id} value={p.id}>
                        #{p.jerseyNumber || '-'} {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowPCModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRecordPC}
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20"
              >
                Confirm Penalty Corner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: PENALTY STROKE */}
      {/* ========================================================================= */}
      {showPSModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-rose-400" /> Record Penalty Stroke
              </h3>
              <button onClick={() => setShowPSModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-bold block mb-1">Attacking Team</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPsTeamId(match.teamAId)}
                    className={`p-3 rounded-xl border font-bold text-center transition ${
                      psTeamId === match.teamAId
                        ? 'bg-rose-500 text-slate-950 border-rose-400'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    {match.teamA?.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPsTeamId(match.teamBId)}
                    className={`p-3 rounded-xl border font-bold text-center transition ${
                      psTeamId === match.teamBId
                        ? 'bg-rose-500 text-slate-950 border-rose-400'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    {match.teamB?.name}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">Stroke Taker</label>
                <select
                  value={psPlayerId}
                  onChange={(e) => setPsPlayerId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                >
                  <option value="">-- Select Stroke Taker --</option>
                  {(psTeamId === match.teamAId ? teamAPlayers : teamBPlayers).map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.jerseyNumber || '-'} {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">Stroke Outcome</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPsOutcome('GOAL')}
                    className={`p-2.5 rounded-xl border font-bold text-center ${
                      psOutcome === 'GOAL'
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    GOAL
                  </button>
                  <button
                    type="button"
                    onClick={() => setPsOutcome('SAVED')}
                    className={`p-2.5 rounded-xl border font-bold text-center ${
                      psOutcome === 'SAVED'
                        ? 'bg-sky-500 text-slate-950 border-sky-400'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    SAVED
                  </button>
                  <button
                    type="button"
                    onClick={() => setPsOutcome('MISSED')}
                    className={`p-2.5 rounded-xl border font-bold text-center ${
                      psOutcome === 'MISSED'
                        ? 'bg-rose-500 text-slate-950 border-rose-400'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    MISSED
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowPSModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRecordPS}
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-black text-xs shadow-lg shadow-rose-500/20"
              >
                Confirm Penalty Stroke
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CARDS & SUSPENSIONS */}
      {/* ========================================================================= */}
      {showCardModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-indigo-400" /> Issue Field Hockey Card
              </h3>
              <button onClick={() => setShowCardModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Card Type */}
              <div>
                <label className="text-slate-400 font-bold block mb-1">Card Type</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCardType('GREEN');
                      setCardDuration(2);
                    }}
                    className={`p-3 rounded-xl border font-bold text-center flex flex-col items-center gap-1 ${
                      cardType === 'GREEN'
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/20'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    <span className="w-4 h-5 rounded-sm bg-emerald-400 border border-emerald-200"></span>
                    <span>GREEN (2 min)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCardType('YELLOW');
                      setCardDuration(5);
                    }}
                    className={`p-3 rounded-xl border font-bold text-center flex flex-col items-center gap-1 ${
                      cardType === 'YELLOW'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    <span className="w-4 h-5 rounded-sm bg-amber-400 border border-amber-200"></span>
                    <span>YELLOW (5 min)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCardType('RED');
                      setCardDuration(999);
                    }}
                    className={`p-3 rounded-xl border font-bold text-center flex flex-col items-center gap-1 ${
                      cardType === 'RED'
                        ? 'bg-rose-500 text-slate-950 border-rose-400 shadow-lg shadow-rose-500/20'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    <span className="w-4 h-5 rounded-sm bg-rose-500 border border-rose-200"></span>
                    <span>RED (Expulsion)</span>
                  </button>
                </div>
              </div>

              {/* Team */}
              <div>
                <label className="text-slate-400 font-bold block mb-1">Team</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCardTeamId(match.teamAId)}
                    className={`p-2.5 rounded-xl border font-bold text-center ${
                      cardTeamId === match.teamAId
                        ? 'bg-slate-800 text-white border-emerald-400'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    {match.teamA?.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardTeamId(match.teamBId)}
                    className={`p-2.5 rounded-xl border font-bold text-center ${
                      cardTeamId === match.teamBId
                        ? 'bg-slate-800 text-white border-sky-400'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    {match.teamB?.name}
                  </button>
                </div>
              </div>

              {/* Player */}
              <div>
                <label className="text-slate-400 font-bold block mb-1">Infringing Player</label>
                <select
                  value={cardPlayerId}
                  onChange={(e) => setCardPlayerId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                >
                  <option value="">-- Select Player --</option>
                  {currentCardTeamPlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.jerseyNumber || '-'} {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reason */}
              <div>
                <label className="text-slate-400 font-bold block mb-1">Reason / Infraction (Optional)</label>
                <input
                  type="text"
                  value={cardReason}
                  onChange={(e) => setCardReason(e.target.value)}
                  placeholder="e.g. Stick tackle, obstruction, dissent"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCardModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRecordCard}
                disabled={actionLoading || !cardPlayerId}
                className="px-5 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-black text-xs shadow-lg shadow-indigo-500/20"
              >
                Issue Card
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: SUBSTITUTION */}
      {/* ========================================================================= */}
      {showSubModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-cyan-400" /> Rolling Substitution
              </h3>
              <button onClick={() => setShowSubModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-bold block mb-1">Team</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSubTeamId(match.teamAId)}
                    className={`p-2.5 rounded-xl border font-bold text-center ${
                      subTeamId === match.teamAId
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    {match.teamA?.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubTeamId(match.teamBId)}
                    className={`p-2.5 rounded-xl border font-bold text-center ${
                      subTeamId === match.teamBId
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    {match.teamB?.name}
                  </button>
                </div>
              </div>

              {/* Player Out */}
              <div>
                <label className="text-rose-400 font-bold block mb-1">Player OUT (Coming Off Pitch)</label>
                <select
                  value={subPlayerOutId}
                  onChange={(e) => setSubPlayerOutId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                >
                  <option value="">-- Select Player Coming OFF --</option>
                  {currentSubTeamPlayers
                    .filter((p) => activeCourtPlayerIds.has(p.id))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        #{p.jerseyNumber || '-'} {p.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Player In */}
              <div>
                <label className="text-emerald-400 font-bold block mb-1">Player IN (Going Onto Pitch)</label>
                <select
                  value={subPlayerInId}
                  onChange={(e) => setSubPlayerInId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                >
                  <option value="">-- Select Player Going ON --</option>
                  {currentSubTeamPlayers
                    .filter((p) => !activeCourtPlayerIds.has(p.id))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        #{p.jerseyNumber || '-'} {p.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowSubModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRecordSub}
                disabled={actionLoading || !subPlayerOutId || !subPlayerInId}
                className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/20"
              >
                Confirm Substitution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: 1v1 SHOOTOUT CONSOLE */}
      {/* ========================================================================= */}
      {showShootoutModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-400" /> Record 1v1 Shootout Attempt
              </h3>
              <button onClick={() => setShowShootoutModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-800/40 text-purple-200 text-center font-bold">
                Shootout Score: {state.shootoutScoreA} - {state.shootoutScoreB}
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">Attacking Team</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSoTeamId(match.teamAId)}
                    className={`p-2.5 rounded-xl border font-bold text-center ${
                      soTeamId === match.teamAId
                        ? 'bg-purple-500 text-slate-950 border-purple-400'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    {match.teamA?.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSoTeamId(match.teamBId)}
                    className={`p-2.5 rounded-xl border font-bold text-center ${
                      soTeamId === match.teamBId
                        ? 'bg-purple-500 text-slate-950 border-purple-400'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    {match.teamB?.name}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">Attacking Shooter</label>
                <select
                  value={soPlayerId}
                  onChange={(e) => setSoPlayerId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                >
                  <option value="">-- Select Shooter --</option>
                  {currentSoTeamPlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.jerseyNumber || '-'} {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">1v1 Attempt Outcome (8 sec limit)</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSoOutcome('GOAL')}
                    className={`p-2.5 rounded-xl border font-bold text-center ${
                      soOutcome === 'GOAL'
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    GOAL
                  </button>
                  <button
                    type="button"
                    onClick={() => setSoOutcome('SAVED')}
                    className={`p-2.5 rounded-xl border font-bold text-center ${
                      soOutcome === 'SAVED'
                        ? 'bg-sky-500 text-slate-950 border-sky-400'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    SAVED
                  </button>
                  <button
                    type="button"
                    onClick={() => setSoOutcome('MISS')}
                    className={`p-2.5 rounded-xl border font-bold text-center ${
                      soOutcome === 'MISS'
                        ? 'bg-rose-500 text-slate-950 border-rose-400'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    MISSED
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowShootoutModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRecordShootout}
                disabled={actionLoading || !soPlayerId}
                className="px-5 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-black text-xs shadow-lg shadow-purple-500/20"
              >
                Log Shootout Attempt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: PERIOD ACTIONS */}
      {/* ========================================================================= */}
      {showPeriodModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <RotateCw className="w-5 h-5 text-indigo-400" /> Quarter & Match Actions
              </h3>
              <button onClick={() => setShowPeriodModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => handlePeriodAction('END_PERIOD')}
                className="w-full p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-bold text-xs flex items-center justify-between transition"
              >
                <span>End Current Period ({state.currentPeriodName})</span>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              <button
                onClick={() => handlePeriodAction('START_PERIOD', state.currentPeriod + 1)}
                className="w-full p-3 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/40 text-emerald-200 font-bold text-xs flex items-center justify-between transition"
              >
                <span>Start Next Quarter / Period</span>
                <ChevronRight className="w-4 h-4 text-emerald-400" />
              </button>

              <button
                onClick={() => handlePeriodAction('SHOOTOUT')}
                className="w-full p-3 rounded-xl bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/40 text-purple-200 font-bold text-xs flex items-center justify-between transition"
              >
                <span>Transition to Penalty Shootout</span>
                <ChevronRight className="w-4 h-4 text-purple-400" />
              </button>

              <button
                onClick={() => {
                  if (window.confirm('Finalize match and mark status as COMPLETED?')) {
                    handlePeriodAction('COMPLETE');
                  }
                }}
                className="w-full p-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/40 text-rose-200 font-bold text-xs flex items-center justify-between transition"
              >
                <span>Complete & Lock Match</span>
                <CheckCircle2 className="w-4 h-4 text-rose-400" />
              </button>
            </div>

            <div className="pt-2 border-t border-slate-800 text-right">
              <button
                type="button"
                onClick={() => setShowPeriodModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 8: MANUAL CLOCK SYNC */}
      {/* ========================================================================= */}
      {showClockModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-400" /> Adjust Match Clock
              </h3>
              <button onClick={() => setShowClockModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="text-slate-400 font-bold block">Enter Time (mm:ss)</label>
              <input
                type="text"
                value={manualClockInput}
                onChange={(e) => setManualClockInput(e.target.value)}
                placeholder="e.g. 08:30"
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-lg font-bold text-center"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowClockModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSetManualClock}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs"
              >
                Apply Time
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
