import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Match,
  Player,
  FootballMatchScoringState,
  FootballScoringEvent,
  FootballGoalType,
  FootballCardType,
  FootballPenaltyOutcome,
  FootballShootoutOutcome,
  FootballEventType,
} from '../../types';
import { api } from '../../services/api';
import { useMatchStream } from '../../utils/useMatchStream';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Dialog as Modal } from '../ui/Dialog';
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  Minus,
  Clock,
  Shield,
  Award,
  AlertTriangle,
  Flame,
  ArrowRightLeft,
  Undo2,
  Edit3,
  CheckCircle2,
  XCircle,
  ChevronRight,
  TrendingUp,
  Volume2,
  Radio,
  FileText,
  UserCheck,
  Zap,
} from 'lucide-react';

interface FootballScoringConsoleProps {
  match: Match;
  onStateChange?: (state: FootballMatchScoringState) => void;
  onViewReport?: () => void;
}

export const FootballScoringConsole: React.FC<FootballScoringConsoleProps> = ({
  match,
  onStateChange,
  onViewReport,
}) => {
  const [scoringState, setScoringState] = useState<FootballMatchScoringState | null>(null);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Local Clock State for Smooth Second-by-Second Tick
  const [localSeconds, setLocalSeconds] = useState<number>(0);
  const [clockRunning, setClockRunning] = useState<boolean>(false);
  const [stoppageMins, setStoppageMins] = useState<number>(0);

  // Modals state
  const [activeModal, setActiveModal] = useState<
    'GOAL' | 'CARD' | 'PENALTY' | 'SUB' | 'CORRECTION' | 'SHOOTOUT' | 'PERIOD_TRANSITION' | null
  >(null);

  // Goal Form State
  const [goalTeamId, setGoalTeamId] = useState<string>(match.teamAId);
  const [goalScorerId, setGoalScorerId] = useState<string>('');
  const [goalAssistId, setGoalAssistId] = useState<string>('');
  const [goalType, setGoalType] = useState<FootballGoalType>('OPEN_PLAY');
  const [goalNotes, setGoalNotes] = useState<string>('');

  // Card Form State
  const [cardTeamId, setCardTeamId] = useState<string>(match.teamAId);
  const [cardPlayerId, setCardPlayerId] = useState<string>('');
  const [cardType, setCardType] = useState<FootballCardType>('YELLOW');
  const [cardReason, setCardReason] = useState<string>('Tactical Foul');

  // Penalty Form State
  const [penaltyTeamId, setPenaltyTeamId] = useState<string>(match.teamAId);
  const [penaltyPlayerId, setPenaltyPlayerId] = useState<string>('');
  const [penaltyOutcome, setPenaltyOutcome] = useState<FootballPenaltyOutcome>('GOAL');
  const [penaltyReason, setPenaltyReason] = useState<string>('Foul inside penalty area');

  // Substitution Form State
  const [subTeamId, setSubTeamId] = useState<string>(match.teamAId);
  const [subPlayerOutId, setSubPlayerOutId] = useState<string>('');
  const [subPlayerInId, setSubPlayerInId] = useState<string>('');

  // Shootout Form State
  const [soTeamId, setSoTeamId] = useState<string>(match.teamAId);
  const [soTakerId, setSoTakerId] = useState<string>('');
  const [soGkId, setSoGkId] = useState<string>('');
  const [soOutcome, setSoOutcome] = useState<FootballShootoutOutcome>('GOAL');

  // Score Correction Form State
  const [correctionScoreA, setCorrectionScoreA] = useState<number>(0);
  const [correctionScoreB, setCorrectionScoreB] = useState<number>(0);

  // Active Tab in lower section
  const [activeTab, setActiveTab] = useState<'timeline' | 'stats' | 'squads' | 'shootout'>('timeline');

  // Load initial scoring state and roster players
  const fetchScoringState = async () => {
    try {
      setLoading(true);
      const [stateRes, playersRes] = await Promise.all([
        api.getFootballScoringState(match.id),
        api.getPlayers(),
      ]);

      if (stateRes?.state) {
        setScoringState(stateRes.state);
        setLocalSeconds(stateRes.state.clock?.elapsedSeconds || 0);
        setClockRunning(stateRes.state.clock?.isRunning || false);
        setStoppageMins(stateRes.state.clock?.stoppageTimeMinutes || 0);
        setCorrectionScoreA(stateRes.state.teamAScore);
        setCorrectionScoreB(stateRes.state.teamBScore);
        if (onStateChange) onStateChange(stateRes.state);
      }

      if (playersRes?.players) {
        setAllPlayers(playersRes.players);
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to load scoring state' });
    } finally {
      setLoading(false);
    }
  };

  // Real-time SSE stream with exponential reconnect and deduplication
  useMatchStream({
    matchId: match.id,
    onMessage: (data) => {
      if (data.scoringState) {
        setScoringState(data.scoringState);
        if (data.scoringState.clockState) {
          setLocalSeconds(data.scoringState.clockState.elapsedSeconds || 0);
          setClockRunning(Boolean(data.scoringState.clockState.isClockRunning));
        }
        if (data.scoringState.isMatchComplete) {
          setClockRunning(false);
        }
      }
    },
  });

  useEffect(() => {
    fetchScoringState();
  }, [match.id]);

  // Realtime ticking clock
  useEffect(() => {
    let timer: any = null;
    if (clockRunning) {
      timer = setInterval(() => {
        setLocalSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [clockRunning]);

  // Helper formatting for live match time
  const currentMatchTimeDisplay = useMemo(() => {
    if (!scoringState) return '00:00';
    const period = scoringState.currentPeriod || 1;
    const totalMins = Math.floor(localSeconds / 60);
    const secs = localSeconds % 60;
    const secsPadded = secs < 10 ? `0${secs}` : `${secs}`;

    let baseMins = 0;
    if (period === 1) baseMins = 0;
    else if (period === 2) baseMins = 45;
    else if (period === 3) baseMins = 90;
    else if (period === 4) baseMins = 105;

    const nominalMin = baseMins + totalMins;
    const periodMaxMins = period >= 3 && period <= 4 ? 15 : 45;

    if (totalMins > periodMaxMins) {
      const extraMins = totalMins - periodMaxMins;
      const stoppageNominal = baseMins + periodMaxMins;
      return `${stoppageNominal}+${extraMins}'`;
    }

    const minsPadded = nominalMin < 10 ? `0${nominalMin}` : `${nominalMin}`;
    return `${minsPadded}:${secsPadded}`;
  }, [scoringState, localSeconds]);

  // Players filtered by team
  const teamAPlayers = useMemo(() => {
    return allPlayers.filter((p) => p.teamId === match.teamAId);
  }, [allPlayers, match.teamAId]);

  const teamBPlayers = useMemo(() => {
    return allPlayers.filter((p) => p.teamId === match.teamBId);
  }, [allPlayers, match.teamBId]);

  // Active players on pitch
  const activePitchPlayersA = useMemo(() => {
    if (!scoringState?.activeStartingXI_A) return teamAPlayers;
    return teamAPlayers.filter((p) => scoringState.activeStartingXI_A.includes(p.id));
  }, [teamAPlayers, scoringState?.activeStartingXI_A]);

  const activePitchPlayersB = useMemo(() => {
    if (!scoringState?.activeStartingXI_B) return teamBPlayers;
    return teamBPlayers.filter((p) => scoringState.activeStartingXI_B.includes(p.id));
  }, [teamBPlayers, scoringState?.activeStartingXI_B]);

  // Substitutes on bench
  const benchPlayersA = useMemo(() => {
    if (!scoringState?.activeStartingXI_A) return [];
    return teamAPlayers.filter(
      (p) =>
        !scoringState.activeStartingXI_A.includes(p.id) &&
        !scoringState.sentOffPlayerIds.includes(p.id)
    );
  }, [teamAPlayers, scoringState]);

  const benchPlayersB = useMemo(() => {
    if (!scoringState?.activeStartingXI_B) return [];
    return teamBPlayers.filter(
      (p) =>
        !scoringState.activeStartingXI_B.includes(p.id) &&
        !scoringState.sentOffPlayerIds.includes(p.id)
    );
  }, [teamBPlayers, scoringState]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ type, text });
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 4000);
  };

  // Clock Actions
  const handleClockToggle = async () => {
    const action = clockRunning ? 'PAUSE' : 'START';
    setClockRunning(!clockRunning);
    try {
      const res = await api.updateFootballClock(match.id, {
        action,
        elapsedSeconds: localSeconds,
      });
      if (res?.state) {
        setScoringState(res.state);
        if (onStateChange) onStateChange(res.state);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update clock', 'error');
    }
  };

  const handleResetClock = async () => {
    if (!window.confirm('Reset current half clock to 00:00?')) return;
    setLocalSeconds(0);
    setClockRunning(false);
    try {
      const res = await api.updateFootballClock(match.id, { action: 'RESET' });
      if (res?.state) {
        setScoringState(res.state);
        if (onStateChange) onStateChange(res.state);
      }
      showToast('Clock reset to 00:00');
    } catch (err: any) {
      showToast(err.message || 'Failed to reset clock', 'error');
    }
  };

  const handleAdjustClock = async (deltaSeconds: number) => {
    const newSec = Math.max(0, localSeconds + deltaSeconds);
    setLocalSeconds(newSec);
    try {
      const res = await api.updateFootballClock(match.id, {
        action: 'SET_TIME',
        elapsedSeconds: newSec,
      });
      if (res?.state) {
        setScoringState(res.state);
        if (onStateChange) onStateChange(res.state);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to adjust clock', 'error');
    }
  };

  const handleSetStoppageTime = async (mins: number) => {
    setStoppageMins(mins);
    try {
      const res = await api.updateFootballClock(match.id, {
        action: 'SET_STOPPAGE',
        stoppageTimeMinutes: mins,
      });
      if (res?.state) {
        setScoringState(res.state);
        if (onStateChange) onStateChange(res.state);
      }
      showToast(`Stoppage time set: +${mins} mins`);
    } catch (err: any) {
      showToast(err.message || 'Failed to update stoppage time', 'error');
    }
  };

  // Period / Halves Transitions
  const handlePeriodAction = async (action: string, nextPeriod?: number) => {
    try {
      setActionLoading(true);
      const res = await api.transitionFootballPeriod(match.id, { action, nextPeriod });
      if (res?.state) {
        setScoringState(res.state);
        setLocalSeconds(res.state.clock?.elapsedSeconds || 0);
        setClockRunning(res.state.clock?.isRunning || false);
        if (onStateChange) onStateChange(res.state);
      }
      showToast(res.message || `Transitioned: ${action}`);
      setActiveModal(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to transition period', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Record Goal
  const handleRecordGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (actionLoading) return;
    try {
      setActionLoading(true);
      const res = await api.recordFootballEvent(match.id, {
        eventType: goalType === 'OWN_GOAL' ? 'OWN_GOAL' : 'GOAL',
        teamId: goalTeamId,
        playerId: goalScorerId || undefined,
        assistPlayerId: goalAssistId || undefined,
        goalType,
        period: scoringState?.currentPeriod || 1,
        matchTimeSeconds: localSeconds,
        matchTimeDisplay: currentMatchTimeDisplay,
        notes: goalNotes || undefined,
      });

      if (res?.state) {
        setScoringState(res.state);
        if (onStateChange) onStateChange(res.state);
      }
      showToast('⚽ GOAL RECORDED!');
      setActiveModal(null);
      setGoalScorerId('');
      setGoalAssistId('');
      setGoalNotes('');
    } catch (err: any) {
      showToast(err.message || 'Failed to record goal', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Record Card
  const handleRecordCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (actionLoading) return;
    if (!cardPlayerId) {
      showToast('Please select a player for card sanction', 'error');
      return;
    }

    try {
      setActionLoading(true);
      const eventType =
        cardType === 'YELLOW'
          ? 'YELLOW_CARD'
          : cardType === 'SECOND_YELLOW'
          ? 'SECOND_YELLOW'
          : 'RED_CARD';

      const res = await api.recordFootballEvent(match.id, {
        eventType,
        teamId: cardTeamId,
        playerId: cardPlayerId,
        cardType,
        cardReason,
        period: scoringState?.currentPeriod || 1,
        matchTimeSeconds: localSeconds,
        matchTimeDisplay: currentMatchTimeDisplay,
      });

      if (res?.state) {
        setScoringState(res.state);
        if (onStateChange) onStateChange(res.state);
      }
      showToast(`${cardType} card recorded.`);
      setActiveModal(null);
      setCardPlayerId('');
    } catch (err: any) {
      showToast(err.message || 'Failed to record card', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Record In-Match Penalty Kick
  const handleRecordPenalty = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      let eventType: FootballEventType = 'PENALTY_AWARDED';
      if (penaltyOutcome === 'GOAL') eventType = 'PENALTY_GOAL';
      else if (penaltyOutcome === 'MISSED') eventType = 'PENALTY_MISSED';
      else if (penaltyOutcome === 'SAVED') eventType = 'PENALTY_SAVED';

      const res = await api.recordFootballEvent(match.id, {
        eventType,
        teamId: penaltyTeamId,
        playerId: penaltyPlayerId || undefined,
        penaltyOutcome,
        period: scoringState?.currentPeriod || 1,
        matchTimeSeconds: localSeconds,
        matchTimeDisplay: currentMatchTimeDisplay,
        notes: penaltyReason,
      });

      if (res?.state) {
        setScoringState(res.state);
        if (onStateChange) onStateChange(res.state);
      }
      showToast(`Penalty ${penaltyOutcome.toLowerCase()} recorded.`);
      setActiveModal(null);
      setPenaltyPlayerId('');
    } catch (err: any) {
      showToast(err.message || 'Failed to record penalty', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Record Substitution
  const handleRecordSubstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subPlayerOutId || !subPlayerInId) {
      showToast('Please select both Player Out and Player In', 'error');
      return;
    }

    try {
      setActionLoading(true);
      const res = await api.recordFootballSubstitution(match.id, {
        teamId: subTeamId,
        playerOutId: subPlayerOutId,
        playerInId: subPlayerInId,
        period: scoringState?.currentPeriod || 1,
        matchTimeSeconds: localSeconds,
        matchTimeDisplay: currentMatchTimeDisplay,
      });

      if (res?.state) {
        setScoringState(res.state);
        if (onStateChange) onStateChange(res.state);
      }
      showToast('🔄 Substitution recorded successfully');
      setActiveModal(null);
      setSubPlayerOutId('');
      setSubPlayerInId('');
    } catch (err: any) {
      showToast(err.message || 'Failed to record substitution', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Quick Stat Event (Corner, Shot, Save, Foul, Offside)
  const handleQuickStat = async (eventType: FootballEventType, teamId: string) => {
    try {
      const res = await api.recordFootballEvent(match.id, {
        eventType,
        teamId,
        period: scoringState?.currentPeriod || 1,
        matchTimeSeconds: localSeconds,
        matchTimeDisplay: currentMatchTimeDisplay,
      });

      if (res?.state) {
        setScoringState(res.state);
        if (onStateChange) onStateChange(res.state);
      }
      showToast(`+1 ${eventType.replace('_', ' ')} recorded`);
    } catch (err: any) {
      showToast(err.message || 'Failed to record stat', 'error');
    }
  };

  // Record Shootout Kick
  const handleRecordShootoutAttempt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!soTakerId) {
      showToast('Please select a shooter', 'error');
      return;
    }

    try {
      setActionLoading(true);
      const res = await api.recordFootballShootout(match.id, {
        teamId: soTeamId,
        playerId: soTakerId,
        assistPlayerId: soGkId || undefined,
        outcome: soOutcome,
      });

      if (res?.state) {
        setScoringState(res.state);
        if (onStateChange) onStateChange(res.state);
      }
      showToast(`Shootout Kick: ${soOutcome}`);
      setActiveModal(null);
      setSoTakerId('');
    } catch (err: any) {
      showToast(err.message || 'Failed to record shootout kick', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Score Correction
  const handleApplyScoreCorrection = async () => {
    try {
      setActionLoading(true);
      const res = await api.recordFootballEvent(match.id, {
        eventType: 'SCORE_CORRECTION',
        teamId: match.teamAId,
        scoreA_after: Number(correctionScoreA),
        scoreB_after: Number(correctionScoreB),
        period: scoringState?.currentPeriod || 1,
        matchTimeSeconds: localSeconds,
        matchTimeDisplay: currentMatchTimeDisplay,
      });

      if (res?.state) {
        setScoringState(res.state);
        if (onStateChange) onStateChange(res.state);
      }
      showToast('Score updated.');
      setActiveModal(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to correct score', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Undo Last Event
  const handleUndo = async () => {
    if (!window.confirm('Undo the last recorded event?')) return;
    try {
      setActionLoading(true);
      const res = await api.undoFootballEvent(match.id);
      if (res?.state) {
        setScoringState(res.state);
        if (onStateChange) onStateChange(res.state);
      }
      showToast('Undid previous event');
    } catch (err: any) {
      showToast(err.message || 'Failed to undo', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !scoringState) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm">Initializing Football Live Scoring Console...</p>
      </div>
    );
  }

  const teamAName = match.teamA?.name || 'Team A';
  const teamBName = match.teamB?.name || 'Team B';
  const scoreA = scoringState?.teamAScore || 0;
  const scoreB = scoringState?.teamBScore || 0;
  const currentPeriod = scoringState?.currentPeriod || 1;
  const periodName = scoringState?.currentPeriodName || '1st Half';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast feedback */}
      {feedbackMsg && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-semibold border backdrop-blur-md transition-all animate-bounce ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/90 border-rose-500/50 text-rose-200'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* TOP LIVE SCORECARD & MATCH CLOCK HEADER */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        {/* Top Badges & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {scoringState?.isMatchComplete ? 'COMPLETED' : 'LIVE SOCCER'}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
              {periodName}
            </span>
            {scoringState?.isShootout && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                PENALTY SHOOTOUT
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleUndo}
              disabled={actionLoading || !scoringState?.events?.length}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 gap-1.5"
            >
              <Undo2 className="w-3.5 h-3.5" />
              Undo Last Event
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveModal('CORRECTION')}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Correct Score
            </Button>

            {onViewReport && (
              <Button
                variant="outline"
                size="sm"
                onClick={onViewReport}
                className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                Match Report
              </Button>
            )}
          </div>
        </div>

        {/* Main Score & Teams Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center pt-6">
          {/* Team A */}
          <div className="lg:col-span-4 flex flex-col items-center lg:items-end text-center lg:text-right">
            <div className="flex items-center gap-3">
              <div>
                <h2 className="text-2xl font-black text-white tracking-wide">{teamAName}</h2>
                <div className="flex items-center justify-end gap-2 text-xs text-slate-400 mt-1">
                  <span>Formation: {scoringState?.formationA || '4-3-3'}</span>
                  <span>•</span>
                  <span>{scoringState?.activePlayerCountA || 11} On Pitch</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center font-black text-xl text-white shadow-lg">
                {teamAName.substring(0, 2).toUpperCase()}
              </div>
            </div>

            {/* Quick Cards & Stats Bar */}
            <div className="flex items-center gap-2 mt-3 text-xs text-slate-300">
              <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                🟨 {scoringState?.teamAStats.yellowCards || 0}
              </span>
              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                🟥 {scoringState?.teamAStats.redCards || 0}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                🚩 {scoringState?.teamAStats.corners || 0}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                🎯 {scoringState?.teamAStats.shotsOnTarget || 0}
              </span>
            </div>
          </div>

          {/* Score & Clock Center Block */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center">
            {/* Big Score Display */}
            <div className="flex items-center justify-center gap-4 bg-slate-950/80 px-8 py-3 rounded-2xl border border-slate-800 shadow-inner">
              <span className="text-5xl font-black text-white tracking-tight">{scoreA}</span>
              <span className="text-2xl font-bold text-slate-600">-</span>
              <span className="text-5xl font-black text-white tracking-tight">{scoreB}</span>
            </div>

            {/* Shootout Score If Active */}
            {scoringState?.isShootout && (
              <div className="text-xs font-bold text-purple-300 mt-2 bg-purple-950/60 px-3 py-1 rounded-full border border-purple-500/30">
                Penalties: {scoringState.shootoutScoreA} - {scoringState.shootoutScoreB}
              </div>
            )}

            {/* Live Clock & Match Minute */}
            <div className="mt-4 flex flex-col items-center">
              <div className="flex items-center gap-2">
                <Clock className={`w-5 h-5 ${clockRunning ? 'text-emerald-400 animate-spin' : 'text-slate-400'}`} />
                <span className="text-3xl font-mono font-bold text-emerald-400 tracking-wider">
                  {currentMatchTimeDisplay}
                </span>
                {stoppageMins > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    +{stoppageMins}'
                  </span>
                )}
              </div>

              {/* Clock Controls */}
              <div className="flex items-center gap-1.5 mt-3">
                <Button
                  size="sm"
                  variant={clockRunning ? 'danger' : 'primary'}
                  onClick={handleClockToggle}
                  className="px-3 py-1.5 h-8 gap-1 text-xs"
                >
                  {clockRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {clockRunning ? 'Pause Clock' : 'Start Clock'}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAdjustClock(-60)}
                  className="px-2 py-1.5 h-8 text-xs border-slate-700 text-slate-300"
                  title="-1 Minute"
                >
                  -1m
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAdjustClock(60)}
                  className="px-2 py-1.5 h-8 text-xs border-slate-700 text-slate-300"
                  title="+1 Minute"
                >
                  +1m
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleResetClock}
                  className="px-2 py-1.5 h-8 text-xs border-slate-700 text-slate-300 hover:text-rose-400"
                  title="Reset Period Clock"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>

                {/* Stoppage Time Quick Drops */}
                <div className="flex items-center gap-1 ml-2 pl-2 border-l border-slate-800">
                  <button
                    onClick={() => handleSetStoppageTime(2)}
                    className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                  >
                    +2'
                  </button>
                  <button
                    onClick={() => handleSetStoppageTime(3)}
                    className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                  >
                    +3'
                  </button>
                  <button
                    onClick={() => handleSetStoppageTime(5)}
                    className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                  >
                    +5'
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Team B */}
          <div className="lg:col-span-4 flex flex-col items-center lg:items-start text-center lg:text-left">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-600 to-amber-700 flex items-center justify-center font-black text-xl text-white shadow-lg">
                {teamBName.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl font-black text-white tracking-wide">{teamBName}</h2>
                <div className="flex items-center justify-start gap-2 text-xs text-slate-400 mt-1">
                  <span>Formation: {scoringState?.formationB || '4-4-2'}</span>
                  <span>•</span>
                  <span>{scoringState?.activePlayerCountB || 11} On Pitch</span>
                </div>
              </div>
            </div>

            {/* Quick Cards & Stats Bar */}
            <div className="flex items-center gap-2 mt-3 text-xs text-slate-300">
              <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                🟨 {scoringState?.teamBStats.yellowCards || 0}
              </span>
              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                🟥 {scoringState?.teamBStats.redCards || 0}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                🚩 {scoringState?.teamBStats.corners || 0}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                🎯 {scoringState?.teamBStats.shotsOnTarget || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Period & Halves Transition Quick Bar */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Halves Control:</span>
            {currentPeriod === 1 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handlePeriodAction('HALF_TIME')}
                className="text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
              >
                End 1st Half (Half-Time)
              </Button>
            )}
            {currentPeriod === 1 && !clockRunning && localSeconds > 0 && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => handlePeriodAction('START_PERIOD', 2)}
                className="text-xs bg-emerald-600 hover:bg-emerald-500"
              >
                Start 2nd Half (45:00)
              </Button>
            )}
            {currentPeriod === 2 && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePeriodAction('EXTRA_TIME')}
                  className="text-xs border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
                >
                  Go To Extra Time (ET1)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePeriodAction('SHOOTOUT')}
                  className="text-xs border-pink-500/30 text-pink-300 hover:bg-pink-500/10"
                >
                  Go To Penalty Shootout
                </Button>
              </>
            )}
            {currentPeriod === 3 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handlePeriodAction('START_PERIOD', 4)}
                className="text-xs border-purple-500/30 text-purple-300"
              >
                Start Extra Time 2 (ET2)
              </Button>
            )}
            {currentPeriod >= 3 && currentPeriod <= 4 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handlePeriodAction('SHOOTOUT')}
                className="text-xs border-pink-500/30 text-pink-300"
              >
                Start Penalty Shootout
              </Button>
            )}
          </div>

          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              if (window.confirm('Complete and finalize this football match?')) {
                handlePeriodAction('COMPLETE');
              }
            }}
            className="text-xs"
          >
            Finalize Match Result
          </Button>
        </div>
      </div>

      {/* ACTION PANELS GRID: PRIMARY SCORING & EVENT LOGGING */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* TEAM A ACTIONS PANEL */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <h3 className="font-bold text-white text-base">{teamAName}</h3>
            </div>
            <span className="text-xs text-slate-400">
              Subs: {scoringState?.teamAStats.substitutionsCount || 0} / {scoringState?.teamAStats.maxSubstitutions || 5}
            </span>
          </div>

          {/* Primary Big Action Buttons */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Button
              onClick={() => {
                setGoalTeamId(match.teamAId);
                setActiveModal('GOAL');
              }}
              className="h-14 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2"
            >
              <Zap className="w-5 h-5 text-yellow-300" />
              <div className="text-left">
                <div className="text-sm font-extrabold">⚽ RECORD GOAL</div>
                <div className="text-[10px] text-emerald-100 font-normal">Scorer, Assist, Type</div>
              </div>
            </Button>

            <Button
              onClick={() => {
                setCardTeamId(match.teamAId);
                setActiveModal('CARD');
              }}
              className="h-14 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-2"
            >
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <div className="text-left">
                <div className="text-sm font-bold">CARDS & FOULS</div>
                <div className="text-[10px] text-slate-400 font-normal">Yellow / Red Card</div>
              </div>
            </Button>
          </div>

          {/* Secondary Buttons (Penalty & Subs) */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Button
              variant="outline"
              onClick={() => {
                setPenaltyTeamId(match.teamAId);
                setActiveModal('PENALTY');
              }}
              className="h-11 border-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5"
            >
              <Shield className="w-4 h-4 text-emerald-400" />
              Penalty Kick
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setSubTeamId(match.teamAId);
                setActiveModal('SUB');
              }}
              className="h-11 border-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5"
            >
              <ArrowRightLeft className="w-4 h-4 text-blue-400" />
              Substitution
            </Button>
          </div>

          {/* Quick Stat Buttons Grid */}
          <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-800/80">
            <button
              onClick={() => handleQuickStat('CORNER', match.teamAId)}
              className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 flex flex-col items-center transition"
            >
              <span className="text-xs font-bold text-slate-200">🚩 Corner</span>
              <span className="text-[10px] text-slate-500 mt-0.5">+{scoringState?.teamAStats.corners || 0}</span>
            </button>

            <button
              onClick={() => handleQuickStat('SHOT_ON_TARGET', match.teamAId)}
              className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 flex flex-col items-center transition"
            >
              <span className="text-xs font-bold text-slate-200">🎯 On Target</span>
              <span className="text-[10px] text-slate-500 mt-0.5">+{scoringState?.teamAStats.shotsOnTarget || 0}</span>
            </button>

            <button
              onClick={() => handleQuickStat('SAVE', match.teamAId)}
              className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 flex flex-col items-center transition"
            >
              <span className="text-xs font-bold text-slate-200">🧤 Save (GK)</span>
              <span className="text-[10px] text-slate-500 mt-0.5">+{scoringState?.teamAStats.saves || 0}</span>
            </button>

            <button
              onClick={() => handleQuickStat('FOUL', match.teamAId)}
              className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 flex flex-col items-center transition"
            >
              <span className="text-xs font-bold text-slate-200">⚠️ Foul</span>
              <span className="text-[10px] text-slate-500 mt-0.5">+{scoringState?.teamAStats.fouls || 0}</span>
            </button>
          </div>
        </div>

        {/* TEAM B ACTIONS PANEL */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500"></div>
              <h3 className="font-bold text-white text-base">{teamBName}</h3>
            </div>
            <span className="text-xs text-slate-400">
              Subs: {scoringState?.teamBStats.substitutionsCount || 0} / {scoringState?.teamBStats.maxSubstitutions || 5}
            </span>
          </div>

          {/* Primary Big Action Buttons */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Button
              onClick={() => {
                setGoalTeamId(match.teamBId);
                setActiveModal('GOAL');
              }}
              className="h-14 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2"
            >
              <Zap className="w-5 h-5 text-yellow-300" />
              <div className="text-left">
                <div className="text-sm font-extrabold">⚽ RECORD GOAL</div>
                <div className="text-[10px] text-rose-100 font-normal">Scorer, Assist, Type</div>
              </div>
            </Button>

            <Button
              onClick={() => {
                setCardTeamId(match.teamBId);
                setActiveModal('CARD');
              }}
              className="h-14 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-2"
            >
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <div className="text-left">
                <div className="text-sm font-bold">CARDS & FOULS</div>
                <div className="text-[10px] text-slate-400 font-normal">Yellow / Red Card</div>
              </div>
            </Button>
          </div>

          {/* Secondary Buttons (Penalty & Subs) */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Button
              variant="outline"
              onClick={() => {
                setPenaltyTeamId(match.teamBId);
                setActiveModal('PENALTY');
              }}
              className="h-11 border-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5"
            >
              <Shield className="w-4 h-4 text-emerald-400" />
              Penalty Kick
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setSubTeamId(match.teamBId);
                setActiveModal('SUB');
              }}
              className="h-11 border-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5"
            >
              <ArrowRightLeft className="w-4 h-4 text-blue-400" />
              Substitution
            </Button>
          </div>

          {/* Quick Stat Buttons Grid */}
          <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-800/80">
            <button
              onClick={() => handleQuickStat('CORNER', match.teamBId)}
              className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 flex flex-col items-center transition"
            >
              <span className="text-xs font-bold text-slate-200">🚩 Corner</span>
              <span className="text-[10px] text-slate-500 mt-0.5">+{scoringState?.teamBStats.corners || 0}</span>
            </button>

            <button
              onClick={() => handleQuickStat('SHOT_ON_TARGET', match.teamBId)}
              className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 flex flex-col items-center transition"
            >
              <span className="text-xs font-bold text-slate-200">🎯 On Target</span>
              <span className="text-[10px] text-slate-500 mt-0.5">+{scoringState?.teamBStats.shotsOnTarget || 0}</span>
            </button>

            <button
              onClick={() => handleQuickStat('SAVE', match.teamBId)}
              className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 flex flex-col items-center transition"
            >
              <span className="text-xs font-bold text-slate-200">🧤 Save (GK)</span>
              <span className="text-[10px] text-slate-500 mt-0.5">+{scoringState?.teamBStats.saves || 0}</span>
            </button>

            <button
              onClick={() => handleQuickStat('FOUL', match.teamBId)}
              className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 flex flex-col items-center transition"
            >
              <span className="text-xs font-bold text-slate-200">⚠️ Foul</span>
              <span className="text-[10px] text-slate-500 mt-0.5">+{scoringState?.teamBStats.fouls || 0}</span>
            </button>
          </div>
        </div>
      </div>

      {/* PENALTY SHOOTOUT CONSOLE (WHEN SHOOTOUT ACTIVE) */}
      {(scoringState?.isShootout || currentPeriod === 5) && (
        <div className="bg-gradient-to-br from-purple-950/70 to-slate-900 border border-purple-500/30 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-purple-500/20">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-400" />
              <h3 className="font-bold text-white text-base">Penalty Shootout Tracker</h3>
            </div>
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                onClick={() => {
                  setSoTeamId(match.teamAId);
                  setActiveModal('SHOOTOUT');
                }}
                className="bg-purple-600 hover:bg-purple-500 text-xs font-bold"
              >
                + Kick: {teamAName}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setSoTeamId(match.teamBId);
                  setActiveModal('SHOOTOUT');
                }}
                className="bg-pink-600 hover:bg-pink-500 text-xs font-bold"
              >
                + Kick: {teamBName}
              </Button>
            </div>
          </div>

          {/* Shootout Rounds Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Team A Shootout Log */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-purple-500/20">
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-slate-200 text-sm">{teamAName}</span>
                <span className="text-lg font-mono font-black text-purple-400">
                  {scoringState?.shootoutScoreA || 0} Scored
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {(scoringState?.shootoutAttempts || [])
                  .filter((s) => s.teamId === match.teamAId)
                  .map((attempt, idx) => (
                    <div
                      key={attempt.id}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shadow ${
                        attempt.outcome === 'GOAL'
                          ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-300'
                          : 'bg-rose-500/20 border border-rose-500 text-rose-300'
                      }`}
                      title={`Round ${attempt.roundNumber}: ${attempt.takerPlayerName} (${attempt.outcome})`}
                    >
                      {attempt.outcome === 'GOAL' ? '✓' : '✗'}
                    </div>
                  ))}
              </div>
            </div>

            {/* Team B Shootout Log */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-purple-500/20">
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-slate-200 text-sm">{teamBName}</span>
                <span className="text-lg font-mono font-black text-pink-400">
                  {scoringState?.shootoutScoreB || 0} Scored
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {(scoringState?.shootoutAttempts || [])
                  .filter((s) => s.teamId === match.teamBId)
                  .map((attempt, idx) => (
                    <div
                      key={attempt.id}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shadow ${
                        attempt.outcome === 'GOAL'
                          ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-300'
                          : 'bg-rose-500/20 border border-rose-500 text-rose-300'
                      }`}
                      title={`Round ${attempt.roundNumber}: ${attempt.takerPlayerName} (${attempt.outcome})`}
                    >
                      {attempt.outcome === 'GOAL' ? '✓' : '✗'}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LOWER TABBED PANEL: TIMELINE, MATCH STATS COMPARISON, LINEUPS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-6">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'timeline'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Match Event Timeline ({scoringState?.events?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'stats'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Live Match Statistics
          </button>

          <button
            onClick={() => setActiveTab('squads')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'squads'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            On-Pitch Lineups & Discipline
          </button>
        </div>

        {/* TAB 1: TIMELINE */}
        {activeTab === 'timeline' && (
          <div className="space-y-3">
            {(!scoringState?.events || scoringState.events.length === 0) && (
              <div className="text-center py-10 text-slate-500 text-xs">
                No match events recorded yet. Use the action buttons above to record goals, cards, and fouls.
              </div>
            )}

            <div className="divide-y divide-slate-800/60">
              {[...(scoringState?.events || [])].reverse().map((evt) => {
                const isA = evt.teamId === match.teamAId;
                const isGoal = evt.eventType === 'GOAL' || evt.eventType === 'OWN_GOAL' || evt.eventType === 'PENALTY_GOAL';
                const isCard = evt.eventType.includes('CARD') || evt.eventType === 'SECOND_YELLOW';
                const isSub = evt.eventType === 'SUBSTITUTION';

                return (
                  <div key={evt.id} className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                        {evt.matchTimeDisplay || `${evt.periodName}`}
                      </span>

                      <div className="flex items-center gap-2">
                        {isGoal && <span className="text-base">⚽</span>}
                        {evt.eventType === 'YELLOW_CARD' && <span className="text-base">🟨</span>}
                        {evt.eventType === 'SECOND_YELLOW' && <span className="text-base">🟨🟥</span>}
                        {evt.eventType === 'RED_CARD' && <span className="text-base">🟥</span>}
                        {isSub && <span className="text-base">🔄</span>}
                        {evt.eventType === 'CORNER' && <span className="text-base">🚩</span>}

                        <span className="font-bold text-slate-200">
                          {evt.eventType.replace('_', ' ')}
                        </span>

                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          isA ? 'bg-blue-500/20 text-blue-300' : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {isA ? teamAName : teamBName}
                        </span>

                        {evt.playerName && (
                          <span className="text-slate-300 font-medium">
                            • {evt.playerName}
                          </span>
                        )}

                        {evt.assistPlayerName && (
                          <span className="text-slate-400">
                            (Assist: {evt.assistPlayerName})
                          </span>
                        )}

                        {evt.goalType && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                            {evt.goalType.replace('_', ' ')}
                          </span>
                        )}

                        {isSub && (
                          <span className="text-slate-400">
                            (OUT: <span className="text-rose-400">{evt.playerOutName}</span> → IN: <span className="text-emerald-400">{evt.playerInName}</span>)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 font-mono font-semibold text-slate-400">
                      <span>
                        {evt.scoreA_after !== undefined && evt.scoreB_after !== undefined
                          ? `${evt.scoreA_after} - ${evt.scoreB_after}`
                          : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: LIVE MATCH STATS COMPARISON */}
        {activeTab === 'stats' && scoringState && (
          <div className="space-y-4 max-w-2xl mx-auto">
            {/* Stat Row Component */}
            {[
              {
                label: 'Possession %',
                valA: `${scoringState.teamAStats.possessionPercentage}%`,
                valB: `${scoringState.teamBStats.possessionPercentage}%`,
                numA: scoringState.teamAStats.possessionPercentage,
                numB: scoringState.teamBStats.possessionPercentage,
              },
              {
                label: 'Total Shots',
                valA: scoringState.teamAStats.shots,
                valB: scoringState.teamBStats.shots,
                numA: scoringState.teamAStats.shots,
                numB: scoringState.teamBStats.shots,
              },
              {
                label: 'Shots on Target',
                valA: scoringState.teamAStats.shotsOnTarget,
                valB: scoringState.teamBStats.shotsOnTarget,
                numA: scoringState.teamAStats.shotsOnTarget,
                numB: scoringState.teamBStats.shotsOnTarget,
              },
              {
                label: 'Corner Kicks',
                valA: scoringState.teamAStats.corners,
                valB: scoringState.teamBStats.corners,
                numA: scoringState.teamAStats.corners,
                numB: scoringState.teamBStats.corners,
              },
              {
                label: 'Goalkeeper Saves',
                valA: scoringState.teamAStats.saves,
                valB: scoringState.teamBStats.saves,
                numA: scoringState.teamAStats.saves,
                numB: scoringState.teamBStats.saves,
              },
              {
                label: 'Fouls Committed',
                valA: scoringState.teamAStats.fouls,
                valB: scoringState.teamBStats.fouls,
                numA: scoringState.teamAStats.fouls,
                numB: scoringState.teamBStats.fouls,
              },
              {
                label: 'Yellow Cards',
                valA: scoringState.teamAStats.yellowCards,
                valB: scoringState.teamBStats.yellowCards,
                numA: scoringState.teamAStats.yellowCards,
                numB: scoringState.teamBStats.yellowCards,
              },
              {
                label: 'Red Cards',
                valA: scoringState.teamAStats.redCards,
                valB: scoringState.teamBStats.redCards,
                numA: scoringState.teamAStats.redCards,
                numB: scoringState.teamBStats.redCards,
              },
            ].map((stat, idx) => {
              const total = (stat.numA || 0) + (stat.numB || 0);
              const pctA = total > 0 ? ((stat.numA || 0) / total) * 100 : 50;

              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-blue-400 font-mono">{stat.valA}</span>
                    <span className="text-slate-300">{stat.label}</span>
                    <span className="text-rose-400 font-mono">{stat.valB}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-950 flex overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${pctA}%` }}
                    ></div>
                    <div
                      className="h-full bg-rose-500 transition-all duration-500"
                      style={{ width: `${100 - pctA}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 3: SQUADS & DISCIPLINE */}
        {activeTab === 'squads' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Team A Roster */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="font-bold text-slate-200 text-xs uppercase tracking-wider">{teamAName} On Pitch</span>
                <span className="text-xs text-slate-400">{activePitchPlayersA.length} Players</span>
              </div>
              <div className="space-y-1.5">
                {activePitchPlayersA.map((p) => {
                  const stat = scoringState?.playerStats.find((s) => s.playerId === p.id);
                  return (
                    <div key={p.id} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-900/60">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-mono w-5">#{p.jerseyNumber || '-'}</span>
                        <span className="text-slate-200 font-semibold">{p.name}</span>
                        <span className="text-[10px] text-slate-500">({p.role || 'Player'})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {stat && stat.goals > 0 && <span className="text-xs font-bold text-emerald-400">⚽ {stat.goals}</span>}
                        {stat && stat.yellowCards > 0 && <span className="text-xs">🟨</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Team B Roster */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="font-bold text-slate-200 text-xs uppercase tracking-wider">{teamBName} On Pitch</span>
                <span className="text-xs text-slate-400">{activePitchPlayersB.length} Players</span>
              </div>
              <div className="space-y-1.5">
                {activePitchPlayersB.map((p) => {
                  const stat = scoringState?.playerStats.find((s) => s.playerId === p.id);
                  return (
                    <div key={p.id} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-900/60">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-mono w-5">#{p.jerseyNumber || '-'}</span>
                        <span className="text-slate-200 font-semibold">{p.name}</span>
                        <span className="text-[10px] text-slate-500">({p.role || 'Player'})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {stat && stat.goals > 0 && <span className="text-xs font-bold text-rose-400">⚽ {stat.goals}</span>}
                        {stat && stat.yellowCards > 0 && <span className="text-xs">🟨</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODALS */}
      {/* ======================================================== */}

      {/* GOAL MODAL */}
      {activeModal === 'GOAL' && (
        <Modal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          title="⚽ Record Goal"
        >
          <form onSubmit={handleRecordGoal} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Scoring Team</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setGoalTeamId(match.teamAId)}
                  className={`p-2.5 rounded-lg text-xs font-bold border ${
                    goalTeamId === match.teamAId
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  {teamAName}
                </button>
                <button
                  type="button"
                  onClick={() => setGoalTeamId(match.teamBId)}
                  className={`p-2.5 rounded-lg text-xs font-bold border ${
                    goalTeamId === match.teamBId
                      ? 'bg-rose-600 text-white border-rose-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  {teamBName}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Goal Scorer</label>
              <select
                value={goalScorerId}
                onChange={(e) => setGoalScorerId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200"
              >
                <option value="">-- Select Goal Scorer (Optional / Unknown) --</option>
                {(goalTeamId === match.teamAId ? teamAPlayers : teamBPlayers).map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.jerseyNumber || '-'} {p.name} ({p.role || 'Player'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Assist Provider (Optional)</label>
              <select
                value={goalAssistId}
                onChange={(e) => setGoalAssistId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200"
              >
                <option value="">-- No Assist / Solo Effort --</option>
                {(goalTeamId === match.teamAId ? teamAPlayers : teamBPlayers)
                  .filter((p) => p.id !== goalScorerId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.jerseyNumber || '-'} {p.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Goal Type</label>
              <select
                value={goalType}
                onChange={(e) => setGoalType(e.target.value as FootballGoalType)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200"
              >
                <option value="OPEN_PLAY">Open Play</option>
                <option value="FREE_KICK">Direct Free Kick</option>
                <option value="PENALTY">Penalty Kick</option>
                <option value="HEADER">Header</option>
                <option value="CORNER">Direct Corner</option>
                <option value="OWN_GOAL">Own Goal (Deflected in)</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <Input
              label="Goal Notes / Description"
              value={goalNotes}
              onChange={(e) => setGoalNotes(e.target.value)}
              placeholder="e.g. Curled into top-right corner from 25 yards"
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" type="button" onClick={() => setActiveModal(null)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={actionLoading}>
                {actionLoading ? 'Recording...' : 'Confirm Goal'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* CARD MODAL */}
      {activeModal === 'CARD' && (
        <Modal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          title="🟨🟥 Issue Card / Disciplinary Action"
        >
          <form onSubmit={handleRecordCard} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Team</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCardTeamId(match.teamAId)}
                  className={`p-2.5 rounded-lg text-xs font-bold border ${
                    cardTeamId === match.teamAId
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  {teamAName}
                </button>
                <button
                  type="button"
                  onClick={() => setCardTeamId(match.teamBId)}
                  className={`p-2.5 rounded-lg text-xs font-bold border ${
                    cardTeamId === match.teamBId
                      ? 'bg-rose-600 text-white border-rose-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  {teamBName}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Player</label>
              <select
                value={cardPlayerId}
                onChange={(e) => setCardPlayerId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200"
              >
                <option value="">-- Select Player --</option>
                {(cardTeamId === match.teamAId ? teamAPlayers : teamBPlayers).map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.jerseyNumber || '-'} {p.name} ({p.role || 'Player'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Card Sanction</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setCardType('YELLOW')}
                  className={`p-2.5 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 ${
                    cardType === 'YELLOW'
                      ? 'bg-yellow-500 text-slate-950 border-yellow-400'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  🟨 Yellow Card
                </button>
                <button
                  type="button"
                  onClick={() => setCardType('SECOND_YELLOW')}
                  className={`p-2.5 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 ${
                    cardType === 'SECOND_YELLOW'
                      ? 'bg-amber-600 text-white border-amber-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  🟨🟥 2nd Yellow
                </button>
                <button
                  type="button"
                  onClick={() => setCardType('RED')}
                  className={`p-2.5 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 ${
                    cardType === 'RED'
                      ? 'bg-rose-600 text-white border-rose-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  🟥 Direct Red
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Reason / Infraction</label>
              <select
                value={cardReason}
                onChange={(e) => setCardReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200"
              >
                <option value="Tactical Foul">Tactical Foul / Stopping Counter</option>
                <option value="Unsporting Behavior">Unsporting Behavior</option>
                <option value="Dissent towards Official">Dissent towards Official</option>
                <option value="Delaying the Restart of Play">Delaying Restart of Play</option>
                <option value="Serious Foul Play">Serious Foul Play / Dangerous Tackle</option>
                <option value="Violent Conduct">Violent Conduct</option>
                <option value="Denying an Obvious Goal-Scoring Opportunity (DOGSO)">DOGSO (Denying Goal Opportunity)</option>
                <option value="Handball">Deliberate Handball</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" type="button" onClick={() => setActiveModal(null)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={actionLoading}>
                {actionLoading ? 'Issuing...' : 'Issue Card'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* PENALTY KICK MODAL */}
      {activeModal === 'PENALTY' && (
        <Modal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          title="⚡ In-Match Penalty Kick"
        >
          <form onSubmit={handleRecordPenalty} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Awarded Team</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPenaltyTeamId(match.teamAId)}
                  className={`p-2.5 rounded-lg text-xs font-bold border ${
                    penaltyTeamId === match.teamAId
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  {teamAName}
                </button>
                <button
                  type="button"
                  onClick={() => setPenaltyTeamId(match.teamBId)}
                  className={`p-2.5 rounded-lg text-xs font-bold border ${
                    penaltyTeamId === match.teamBId
                      ? 'bg-rose-600 text-white border-rose-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  {teamBName}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Penalty Taker</label>
              <select
                value={penaltyPlayerId}
                onChange={(e) => setPenaltyPlayerId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200"
              >
                <option value="">-- Select Penalty Taker --</option>
                {(penaltyTeamId === match.teamAId ? teamAPlayers : teamBPlayers).map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.jerseyNumber || '-'} {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Penalty Outcome</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPenaltyOutcome('GOAL')}
                  className={`p-2.5 rounded-lg text-xs font-bold border ${
                    penaltyOutcome === 'GOAL'
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  ⚽ Goal Scored
                </button>
                <button
                  type="button"
                  onClick={() => setPenaltyOutcome('SAVED')}
                  className={`p-2.5 rounded-lg text-xs font-bold border ${
                    penaltyOutcome === 'SAVED'
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  🧤 Saved by GK
                </button>
                <button
                  type="button"
                  onClick={() => setPenaltyOutcome('MISSED')}
                  className={`p-2.5 rounded-lg text-xs font-bold border ${
                    penaltyOutcome === 'MISSED'
                      ? 'bg-rose-600 text-white border-rose-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  ❌ Missed / Wide
                </button>
              </div>
            </div>

            <Input
              label="Infraction Reason"
              value={penaltyReason}
              onChange={(e) => setPenaltyReason(e.target.value)}
              placeholder="e.g. Tripping inside box"
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" type="button" onClick={() => setActiveModal(null)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={actionLoading}>
                {actionLoading ? 'Recording...' : 'Confirm Penalty Outcome'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* SUBSTITUTION MODAL */}
      {activeModal === 'SUB' && (
        <Modal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          title="🔄 Player Substitution"
        >
          <form onSubmit={handleRecordSubstitution} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Team</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSubTeamId(match.teamAId);
                    setSubPlayerOutId('');
                    setSubPlayerInId('');
                  }}
                  className={`p-2.5 rounded-lg text-xs font-bold border ${
                    subTeamId === match.teamAId
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  {teamAName}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSubTeamId(match.teamBId);
                    setSubPlayerOutId('');
                    setSubPlayerInId('');
                  }}
                  className={`p-2.5 rounded-lg text-xs font-bold border ${
                    subTeamId === match.teamBId
                      ? 'bg-rose-600 text-white border-rose-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  {teamBName}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Player Out (Coming OFF Pitch)
              </label>
              <select
                value={subPlayerOutId}
                onChange={(e) => setSubPlayerOutId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200"
              >
                <option value="">-- Select Active Player to Sub Off --</option>
                {(subTeamId === match.teamAId ? activePitchPlayersA : activePitchPlayersB).map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.jerseyNumber || '-'} {p.name} ({p.role || 'Player'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Player In (Coming ON from Bench)
              </label>
              <select
                value={subPlayerInId}
                onChange={(e) => setSubPlayerInId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200"
              >
                <option value="">-- Select Bench Player --</option>
                {(subTeamId === match.teamAId ? benchPlayersA : benchPlayersB).map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.jerseyNumber || '-'} {p.name} ({p.role || 'Player'})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" type="button" onClick={() => setActiveModal(null)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={actionLoading}>
                {actionLoading ? 'Subbing...' : 'Confirm Substitution'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* SHOOTOUT KICK MODAL */}
      {activeModal === 'SHOOTOUT' && (
        <Modal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          title="🎯 Record Penalty Shootout Kick"
        >
          <form onSubmit={handleRecordShootoutAttempt} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Shooting Team</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSoTeamId(match.teamAId)}
                  className={`p-2.5 rounded-lg text-xs font-bold border ${
                    soTeamId === match.teamAId
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  {teamAName}
                </button>
                <button
                  type="button"
                  onClick={() => setSoTeamId(match.teamBId)}
                  className={`p-2.5 rounded-lg text-xs font-bold border ${
                    soTeamId === match.teamBId
                      ? 'bg-rose-600 text-white border-rose-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  {teamBName}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Penalty Shooter</label>
              <select
                value={soTakerId}
                onChange={(e) => setSoTakerId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200"
              >
                <option value="">-- Select Penalty Taker --</option>
                {(soTeamId === match.teamAId ? teamAPlayers : teamBPlayers).map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.jerseyNumber || '-'} {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Kick Outcome</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSoOutcome('GOAL')}
                  className={`p-2.5 rounded-lg text-xs font-bold border ${
                    soOutcome === 'GOAL'
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  ⚽ Goal
                </button>
                <button
                  type="button"
                  onClick={() => setSoOutcome('SAVED')}
                  className={`p-2.5 rounded-lg text-xs font-bold border ${
                    soOutcome === 'SAVED'
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  🧤 Saved by GK
                </button>
                <button
                  type="button"
                  onClick={() => setSoOutcome('MISS')}
                  className={`p-2.5 rounded-lg text-xs font-bold border ${
                    soOutcome === 'MISS'
                      ? 'bg-rose-600 text-white border-rose-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  ❌ Missed
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" type="button" onClick={() => setActiveModal(null)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={actionLoading}>
                {actionLoading ? 'Recording...' : 'Confirm Shootout Kick'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* SCORE CORRECTION MODAL */}
      {activeModal === 'CORRECTION' && (
        <Modal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          title="Manual Score Correction"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              Adjust total match goals if official referee overruled or adjusted goals post-match.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label={`${teamAName} Goals`}
                type="number"
                value={correctionScoreA}
                onChange={(e) => setCorrectionScoreA(Number(e.target.value))}
              />
              <Input
                label={`${teamBName} Goals`}
                type="number"
                value={correctionScoreB}
                onChange={(e) => setCorrectionScoreB(Number(e.target.value))}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setActiveModal(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleApplyScoreCorrection} disabled={actionLoading}>
                Apply Score Correction
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
