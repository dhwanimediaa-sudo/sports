import React, { useState, useEffect } from 'react';
import {
  Match,
  CricketMatchScoringState,
  CricketBallEvent,
  Player,
  WicketType,
  ExtraType,
} from '../../types';
import { api } from '../../services/api';
import { useMatchStream } from '../../utils/useMatchStream';
import {
  Trophy,
  Play,
  RotateCcw,
  Edit3,
  UserCheck,
  Zap,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  X,
  ChevronRight,
  Shield,
  Layers,
  Award,
  Clock,
  Radio,
  Tv,
} from 'lucide-react';
import { BroadcastOutputUrlBox } from '../broadcast/BroadcastOutputUrlBox';

interface CricketScoringConsoleProps {
  match: Match;
  onClose?: () => void;
  onMatchStatusChange?: () => void;
}

export const CricketScoringConsole: React.FC<CricketScoringConsoleProps> = ({
  match,
  onClose,
  onMatchStatusChange,
}) => {
  const [scoringState, setScoringState] = useState<CricketMatchScoringState | null>(null);
  const [currentMatchStatus, setCurrentMatchStatus] = useState<string>(match.status || 'SCHEDULED');
  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modals and dialog states
  const [showStartModal, setShowStartModal] = useState<boolean>(false);
  const [startBattingTeamId, setStartBattingTeamId] = useState<string>(
    match.toss?.winnerTeamId && match.toss.decision === 'BAT'
      ? match.toss.winnerTeamId
      : match.toss?.winnerTeamId && match.toss.decision === 'BOWL'
      ? match.toss.winnerTeamId === match.teamAId
        ? match.teamBId
        : match.teamAId
      : match.teamAId
  );
  const [startStrikerId, setStartStrikerId] = useState<string>('');
  const [startNonStrikerId, setStartNonStrikerId] = useState<string>('');
  const [startBowlerId, setStartBowlerId] = useState<string>('');

  // Extras modal state
  const [activeExtraType, setActiveExtraType] = useState<ExtraType | null>(null);
  const [extraRunsInput, setExtraRunsInput] = useState<number>(1);
  const [extraBatRunsInput, setExtraBatRunsInput] = useState<number>(0);

  // Wicket modal state
  const [showWicketModal, setShowWicketModal] = useState<boolean>(false);
  const [wicketType, setWicketType] = useState<WicketType>('BOWLED');
  const [dismissedPlayerId, setDismissedPlayerId] = useState<string>('');
  const [fielderId, setFielderId] = useState<string>('');
  const [assistFielderId, setAssistFielderId] = useState<string>('');
  const [newBatsmanId, setNewBatsmanId] = useState<string>('');

  // New Bowler modal state
  const [showBowlerModal, setShowBowlerModal] = useState<boolean>(false);
  const [selectedNextBowlerId, setSelectedNextBowlerId] = useState<string>('');

  // Undo confirmation modal
  const [showUndoConfirm, setShowUndoConfirm] = useState<boolean>(false);

  // Edit last ball modal
  const [showEditLastModal, setShowEditLastModal] = useState<boolean>(false);
  const [editRunsOffBat, setEditRunsOffBat] = useState<number>(0);
  const [editExtraRuns, setEditExtraRuns] = useState<number>(0);
  const [editExtraType, setEditExtraType] = useState<ExtraType>('NONE');

  // Second Innings start modal
  const [showInnings2Modal, setShowInnings2Modal] = useState<boolean>(false);
  const [inn2StrikerId, setInn2StrikerId] = useState<string>('');
  const [inn2NonStrikerId, setInn2NonStrikerId] = useState<string>('');
  const [inn2BowlerId, setInn2BowlerId] = useState<string>('');

  // Ball-by-ball drawer
  const [showBallHistoryDrawer, setShowBallHistoryDrawer] = useState<boolean>(false);
  const [showBroadcastDrawer, setShowBroadcastDrawer] = useState<boolean>(false);

  // Load Scoring State from API
  const fetchScoringState = async () => {
    try {
      setLoading(true);
      const res = await api.getScoringState(match.id);
      setScoringState(res.state);
      setError(null);

      // Check if match needs initialization
      if (
        (match.status === 'SCHEDULED' || match.status === 'DRAFT' || (match.status as string) === 'READY' || (match.status as string) === 'UPCOMING') &&
        !res.state.currentInnings
      ) {
        setShowStartModal(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load scoring state.');
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
      } else if (data.currentInnings || data.events) {
        setScoringState(data);
      }
      if (data.match?.status) {
        setCurrentMatchStatus(data.match.status);
      }
    },
  });

  useEffect(() => {
    fetchScoringState();
  }, [match.id]);

  const teamAPlayers = match.teamAPlayers || [];
  const teamBPlayers = match.teamBPlayers || [];
  const allPlayers = [...teamAPlayers, ...teamBPlayers];

  // Helper getters for teams
  const battingTeamId = scoringState?.currentInnings?.battingTeamId || startBattingTeamId;
  const bowlingTeamId =
    battingTeamId === match.teamAId ? match.teamBId : match.teamAId;

  const battingTeam = battingTeamId === match.teamAId ? match.teamA : match.teamB;
  const bowlingTeam = bowlingTeamId === match.teamAId ? match.teamA : match.teamB;

  const battingTeamPlayers = allPlayers.filter((p) => p.teamId === battingTeamId);
  const bowlingTeamPlayers = allPlayers.filter((p) => p.teamId === bowlingTeamId);

  const currentStriker = allPlayers.find((p) => p.id === scoringState?.currentInnings?.currentStrikerId);
  const currentNonStriker = allPlayers.find((p) => p.id === scoringState?.currentInnings?.currentNonStrikerId);
  const currentBowler = allPlayers.find((p) => p.id === scoringState?.currentInnings?.currentBowlerId);

  const strikerStats = scoringState?.batsmenStats?.find((b) => b.playerId === currentStriker?.id);
  const nonStrikerStats = scoringState?.batsmenStats?.find((b) => b.playerId === currentNonStriker?.id);
  const bowlerFigures = scoringState?.bowlerStats?.find((b) => b.playerId === currentBowler?.id);

  // Eligible un-dismissed squad players for new batsman
  const dismissedPlayerIds = (scoringState?.events || [])
    .filter((e) => e.isWicket && e.dismissedPlayerId && e.wicketType !== 'RETIRED_HURT')
    .map((e) => e.dismissedPlayerId);

  const activePlayerIds = [currentStriker?.id, currentNonStriker?.id].filter(Boolean);

  const availableNewBatsmen = battingTeamPlayers.filter(
    (p) => !dismissedPlayerIds.includes(p.id) && !activePlayerIds.includes(p.id)
  );

  // Available bowlers for next over (cannot be same as last bowler unless configured)
  const lastBowlerId = scoringState?.currentInnings?.lastBowlerId;
  const availableBowlers = bowlingTeamPlayers.filter((p) => p.id !== lastBowlerId);

  // Trigger flash banner
  const triggerSuccess = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 3000);
  };

  // 1. START LIVE SCORING
  const handleConfirmStartScoring = async () => {
    if (!startStrikerId || !startNonStrikerId || !startBowlerId) {
      setError('Please select Striker, Non-Striker, and Opening Bowler.');
      return;
    }
    if (startStrikerId === startNonStrikerId) {
      setError('Striker and Non-Striker must be different players.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.startScoring(match.id, {
        battingTeamId: startBattingTeamId,
        bowlingTeamId: startBattingTeamId === match.teamAId ? match.teamBId : match.teamAId,
        strikerId: startStrikerId,
        nonStrikerId: startNonStrikerId,
        bowlerId: startBowlerId,
      });

      setScoringState(res.state);
      setCurrentMatchStatus('LIVE');
      setShowStartModal(false);
      triggerSuccess('Live Scoring Started! Status updated to LIVE.');
      if (onMatchStatusChange) onMatchStatusChange();
    } catch (err: any) {
      setError(err.message || 'Failed to start live scoring.');
    } finally {
      setLoading(false);
    }
  };

  // 2. RECORD NORMAL BALL (0, 1, 2, 3, 4, 5, 6)
  const handleRecordRun = async (runs: number) => {
    if (!scoringState || scoringState.isMatchComplete || isSubmitting || currentMatchStatus === 'COMPLETED') return;

    try {
      setIsSubmitting(true);
      const res = await api.recordBall(match.id, {
        runsOffBat: runs,
        extraRuns: 0,
        extraType: 'NONE',
        isWicket: false,
      });

      setScoringState(res.state);
      setCurrentMatchStatus('LIVE');
      triggerSuccess(`${runs} Run${runs === 1 ? '' : 's'} Recorded`);

      // Check if over completed
      if (res.state.isOverComplete) {
        setShowBowlerModal(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to record run.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. RECORD EXTRAS (WIDE, NO BALL, BYE, LEG BYE)
  const handleConfirmExtra = async () => {
    if (!activeExtraType || isSubmitting || currentMatchStatus === 'COMPLETED') return;

    try {
      setIsSubmitting(true);
      let runsOffBat = 0;
      let extraRuns = 0;

      if (activeExtraType === 'WIDE') {
        extraRuns = extraRunsInput; // 1, 2, 3, 4, 5...
      } else if (activeExtraType === 'NO_BALL') {
        extraRuns = 1;
        runsOffBat = extraBatRunsInput; // Bat runs on No Ball
      } else if (activeExtraType === 'BYE' || activeExtraType === 'LEG_BYE' || activeExtraType === 'PENALTY') {
        extraRuns = extraRunsInput;
      }

      const res = await api.recordBall(match.id, {
        runsOffBat,
        extraRuns,
        extraType: activeExtraType,
        isWicket: false,
      });

      setScoringState(res.state);
      setCurrentMatchStatus('LIVE');
      setActiveExtraType(null);
      setExtraRunsInput(1);
      setExtraBatRunsInput(0);
      triggerSuccess(`${activeExtraType} Recorded`);

      if (res.state.isOverComplete) {
        setShowBowlerModal(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to record extra.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. CONFIRM WICKET
  const handleConfirmWicket = async () => {
    if (isSubmitting || currentMatchStatus === 'COMPLETED') return;
    const targetDismissedId = dismissedPlayerId || currentStriker?.id;

    if (!targetDismissedId) {
      setError('Please select the dismissed player.');
      return;
    }

    if (availableNewBatsmen.length > 0 && !newBatsmanId && wicketType !== 'RETIRED_HURT') {
      setError('Please select a new batsman.');
      return;
    }

    try {
      const res = await api.recordBall(match.id, {
        runsOffBat: 0,
        extraRuns: 0,
        extraType: 'NONE',
        isWicket: true,
        wicketType,
        dismissedPlayerId: targetDismissedId,
        fielderId,
        assistFielderId,
        newStrikerId: targetDismissedId === currentStriker?.id ? newBatsmanId : undefined,
        newNonStrikerId: targetDismissedId === currentNonStriker?.id ? newBatsmanId : undefined,
      });

      setScoringState(res.state);
      setShowWicketModal(false);
      setWicketType('BOWLED');
      setDismissedPlayerId('');
      setFielderId('');
      setAssistFielderId('');
      setNewBatsmanId('');
      triggerSuccess('WICKET Confirmed & Updated!');

      if (res.state.isOverComplete) {
        setShowBowlerModal(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to record wicket.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. SELECT NEXT BOWLER
  const handleSelectNextBowler = async () => {
    if (!selectedNextBowlerId) {
      setError('Please select the next bowler.');
      return;
    }

    try {
      const res = await api.setBowler(match.id, selectedNextBowlerId);
      setScoringState(res.state);
      setShowBowlerModal(false);
      setSelectedNextBowlerId('');
      triggerSuccess('Next Bowler Selected!');
    } catch (err: any) {
      setError(err.message || 'Failed to set bowler.');
    }
  };

  // 6. SWAP STRIKE MANUALLY
  const handleSwapStrike = async () => {
    try {
      const res = await api.swapStrike(match.id);
      setScoringState(res.state);
      triggerSuccess('Strike Swapped!');
    } catch (err: any) {
      setError(err.message || 'Failed to swap strike.');
    }
  };

  // 7. UNDO LAST BALL
  const handleConfirmUndo = async () => {
    try {
      const res = await api.undoLastBall(match.id);
      setScoringState(res.state);
      setShowUndoConfirm(false);
      triggerSuccess('Last Delivery Undone Successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to undo delivery.');
    }
  };

  // 8. EDIT LAST BALL
  const handleConfirmEditLast = async () => {
    try {
      const res = await api.editLastBall(match.id, {
        runsOffBat: editRunsOffBat,
        extraRuns: editExtraRuns,
        extraType: editExtraType,
      });

      setScoringState(res.state);
      setShowEditLastModal(false);
      triggerSuccess('Last Delivery Updated!');
    } catch (err: any) {
      setError(err.message || 'Failed to edit last delivery.');
    }
  };

  // 9. START SECOND INNINGS
  const handleConfirmStartInnings2 = async () => {
    if (!inn2StrikerId || !inn2NonStrikerId || !inn2BowlerId) {
      setError('Please select Striker, Non-Striker, and Bowler for 2nd Innings.');
      return;
    }

    try {
      const res = await api.startInnings2(match.id, {
        strikerId: inn2StrikerId,
        nonStrikerId: inn2NonStrikerId,
        bowlerId: inn2BowlerId,
      });

      setScoringState(res.state);
      setShowInnings2Modal(false);
      triggerSuccess('Second Innings Started! Target Calculated.');
    } catch (err: any) {
      setError(err.message || 'Failed to start 2nd Innings.');
    }
  };

  // 10. END MATCH
  const handleEndMatch = async () => {
    if (!window.confirm('Are you sure you want to end and complete this match?')) return;

    try {
      const res = await api.endMatchScoring(match.id);
      setScoringState(res.state);
      triggerSuccess('Match Completed!');
      if (onMatchStatusChange) onMatchStatusChange();
    } catch (err: any) {
      setError(err.message || 'Failed to end match.');
    }
  };

  if (loading && !scoringState) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] bg-slate-950 text-white rounded-2xl p-8">
        <RefreshCw className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
        <h3 className="text-lg font-semibold">Loading Cricket Scoring Engine...</h3>
        <p className="text-sm text-slate-400 mt-1">Fetching persistent database state</p>
      </div>
    );
  }

  const activeInningsNum = scoringState?.currentInnings?.inningsNumber || 1;
  const currentInningsState = scoringState?.currentInnings;

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen font-sans pb-24 md:pb-8 flex flex-col">
      {/* FLASH NOTIFICATION BANNERS */}
      {error && (
        <div className="bg-rose-500/90 text-white px-4 py-3 rounded-none flex items-center justify-between shadow-lg sticky top-0 z-50 animate-fade-in">
          <div className="flex items-center gap-2 text-sm font-medium">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="p-1 hover:bg-rose-600 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="bg-emerald-600/90 text-white px-4 py-2.5 rounded-none flex items-center justify-between shadow-lg sticky top-0 z-50 animate-fade-in">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="p-1 hover:bg-emerald-700 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TOP SCORER CONSOLE BAR */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-4 py-3 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/20 text-emerald-400 p-2 rounded-xl border border-emerald-500/30">
              <Radio className="w-5 h-5 animate-pulse text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                  LIVE SCORING CONSOLE
                </span>
                <span className="text-xs text-slate-400 hidden sm:inline">
                  {match.tournament?.name} ({match.round})
                </span>
              </div>
              <h1 className="text-sm md:text-base font-bold text-white tracking-tight mt-0.5 line-clamp-1">
                {match.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBroadcastDrawer(true)}
              className="px-3 py-1.5 bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 text-xs font-semibold rounded-lg transition-colors border border-cyan-500/30 flex items-center gap-1.5 cursor-pointer"
              title="View single live broadcast URL for OBS/vMix"
            >
              <Tv className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Broadcast URL</span>
            </button>

            <button
              onClick={() => setShowBallHistoryDrawer(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors border border-slate-700 flex items-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Ball History</span>
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors border border-slate-700"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-5xl mx-auto w-full px-3 sm:px-4 py-4 space-y-4 flex-1">
        {/* MATCH STATUS AUTO-START BANNER */}
        {currentMatchStatus !== 'LIVE' && currentMatchStatus !== 'COMPLETED' && (
          <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/20 border border-amber-500/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-200 shadow-xl">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
              </span>
              <div>
                <p className="font-bold text-amber-300">
                  Match is currently in <span className="uppercase">{currentMatchStatus}</span> state
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Recording balls or extras will automatically set the match to LIVE.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={async () => {
                try {
                  if (!scoringState?.currentInnings) {
                    setShowStartModal(true);
                    return;
                  }
                  await api.updateMatchStatus(match.id, 'LIVE');
                  setCurrentMatchStatus('LIVE');
                  triggerSuccess('Match status set to LIVE');
                  if (onMatchStatusChange) onMatchStatusChange();
                } catch (err: any) {
                  setError(err.message || 'Failed to update match status to LIVE');
                }
              }}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition shadow cursor-pointer shrink-0"
            >
              Start Live Scoring Now
            </button>
          </div>
        )}

        {/* SECTION 1: SCOREBOARD DISPLAY */}
        <section className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-4 md:p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Header Team info */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="bg-slate-800 text-slate-300 text-xs font-bold px-2.5 py-1 rounded-md border border-slate-700">
                INNINGS {activeInningsNum}
              </span>
              <span className="text-sm font-semibold text-emerald-400">
                {battingTeam?.name || 'Batting Team'}
              </span>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400 font-medium">CRR: </span>
              <span className="text-xs font-bold text-white">
                {Number(scoringState?.currentRunRate ?? scoringState?.runRate ?? 0).toFixed(2)}
              </span>
            </div>
          </div>

          {/* BIG SCORE METRIC */}
          <div className="py-5 flex flex-col md:flex-row md:items-baseline justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
                {battingTeam?.name || 'BATTING TEAM'}
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl sm:text-6xl font-black text-white tracking-tight">
                  {currentInningsState?.totalRuns || 0}
                  <span className="text-slate-500 text-3xl sm:text-5xl font-light">/</span>
                  <span className="text-emerald-400">{currentInningsState?.totalWickets || 0}</span>
                </span>
                <span className="text-lg sm:text-2xl font-bold text-slate-400">
                  {Number(currentInningsState?.totalOvers ?? 0).toFixed(1)}{' '}
                  <span className="text-xs sm:text-sm font-semibold uppercase text-slate-500">
                    / {match.effectiveMatchOvers || match.cricketConfig?.overs || match.matchOvers || 20} Ov
                  </span>
                </span>
              </div>
            </div>

            {/* CHASE / TARGET SUMMARY (FOR 2ND INNINGS) */}
            {activeInningsNum === 2 && scoringState?.target && (
              <div className="bg-slate-950/80 border border-emerald-500/30 p-3.5 rounded-xl md:text-right">
                <div className="text-xs text-emerald-400 font-bold uppercase tracking-wider">
                  TARGET: {scoringState.target}
                </div>
                <div className="text-base font-extrabold text-white mt-0.5">
                  Need {scoringState.runsRequired} runs in {scoringState.ballsRemaining} balls
                </div>
                <div className="text-xs text-slate-400 font-medium mt-0.5">
                  Required RR: <span className="text-emerald-400 font-bold">{scoringState.requiredRunRate}</span>
                </div>
              </div>
            )}
          </div>

          {/* EXTRAS SUMMARY BAR */}
          <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs gap-2 text-slate-400">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-300">EXTRAS:</span>
              <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                {scoringState?.extras?.total || 0}
              </span>
              <span className="text-slate-500">
                (WD {scoringState?.extras?.wides || 0}, NB {scoringState?.extras?.noBalls || 0}, B{' '}
                {scoringState?.extras?.byes || 0}, LB {scoringState?.extras?.legByes || 0})
              </span>
            </div>

            {scoringState?.currentPartnership && (
              <div className="text-slate-300">
                <span className="text-slate-400">Partnership: </span>
                <span className="font-bold text-emerald-400">
                  {scoringState.currentPartnership.runs} runs
                </span>{' '}
                <span className="text-slate-500">({scoringState.currentPartnership.balls} balls)</span>
              </div>
            )}
          </div>
        </section>

        {/* SECTION 2: BATSMEN & BOWLER CENTER CARDS */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* CURRENT BATSMEN CARD */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-400" /> Current Batsmen
              </h3>
              <button
                onClick={handleSwapStrike}
                className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-md border border-slate-700 transition-colors font-medium flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3 text-emerald-400" /> Swap Strike
              </button>
            </div>

            {/* Striker */}
            <div className="bg-emerald-950/30 border border-emerald-500/40 p-3 rounded-xl flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-white">
                    {currentStriker?.name || 'Select Striker'}
                  </span>
                  <span className="text-xs bg-emerald-500 text-slate-950 font-black px-1.5 py-0.2 rounded text-[10px]">
                    STRIKER *
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  4s: <span className="text-white font-semibold">{strikerStats?.fours || 0}</span> | 6s:{' '}
                  <span className="text-white font-semibold">{strikerStats?.sixes || 0}</span> | SR:{' '}
                  <span className="text-emerald-400 font-semibold">{strikerStats?.strikeRate || '0.00'}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xl font-black text-white">
                  {strikerStats?.runs || 0}
                </span>
                <span className="text-xs text-slate-400 font-semibold">
                  {' '}({strikerStats?.ballsFaced || 0}b)
                </span>
              </div>
            </div>

            {/* Non-Striker */}
            <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-slate-200">
                    {currentNonStriker?.name || 'Select Non-Striker'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Non-Striker</span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  4s: <span className="text-white font-semibold">{nonStrikerStats?.fours || 0}</span> | 6s:{' '}
                  <span className="text-white font-semibold">{nonStrikerStats?.sixes || 0}</span> | SR:{' '}
                  <span className="text-slate-300 font-semibold">{nonStrikerStats?.strikeRate || '0.00'}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xl font-bold text-slate-200">
                  {nonStrikerStats?.runs || 0}
                </span>
                <span className="text-xs text-slate-400 font-semibold">
                  {' '}({nonStrikerStats?.ballsFaced || 0}b)
                </span>
              </div>
            </div>
          </div>

          {/* CURRENT BOWLER CARD */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-emerald-400" /> Current Bowler
              </h3>
              <button
                onClick={() => setShowBowlerModal(true)}
                className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-md border border-slate-700 transition-colors font-medium"
              >
                Change Bowler
              </button>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-base font-bold text-white">
                    {currentBowler?.name || 'Select Bowler'}
                  </span>
                  <div className="text-xs text-slate-400 mt-1">
                    Overs: <span className="text-white font-bold">{bowlerFigures?.oversDisplay || '0.0'}</span> | Maidens:{' '}
                    <span className="text-white font-bold">{bowlerFigures?.maidens || 0}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xl font-black text-white">
                    {bowlerFigures?.runsConceded || 0}
                    <span className="text-slate-500 font-light text-base"> / </span>
                    <span className="text-emerald-400">{bowlerFigures?.wickets || 0}</span>
                  </div>
                  <div className="text-xs text-slate-400 font-semibold mt-0.5">
                    Eco: <span className="text-emerald-400">{bowlerFigures?.economy || '0.00'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CURRENT OVER BALL BADGES */}
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                THIS OVER DELIVERIES
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {scoringState?.currentOverEvents && scoringState.currentOverEvents.length > 0 ? (
                  scoringState.currentOverEvents.map((e, idx) => {
                    let badgeBg = 'bg-slate-800 text-slate-200 border-slate-700';
                    let label = `${e.totalRuns}`;

                    if (e.isWicket) {
                      badgeBg = 'bg-rose-600 text-white border-rose-500 font-black';
                      label = 'W';
                    } else if (e.isSix) {
                      badgeBg = 'bg-purple-600 text-white border-purple-500 font-black';
                      label = '6';
                    } else if (e.isFour) {
                      badgeBg = 'bg-emerald-600 text-white border-emerald-500 font-black';
                      label = '4';
                    } else if (e.extraType === 'WIDE') {
                      badgeBg = 'bg-amber-600/80 text-white border-amber-500';
                      label = `${e.extraRuns}wd`;
                    } else if (e.extraType === 'NO_BALL') {
                      badgeBg = 'bg-amber-600/80 text-white border-amber-500';
                      label = `${e.totalRuns}nb`;
                    } else if (e.runsOffBat === 0) {
                      label = '•';
                    }

                    return (
                      <div
                        key={idx}
                        className={`min-w-[32px] h-8 px-2 rounded-lg border text-xs font-bold flex items-center justify-center flex-shrink-0 ${badgeBg}`}
                      >
                        {label}
                      </div>
                    );
                  })
                ) : (
                  <span className="text-xs text-slate-500 italic">No deliveries in current over yet</span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: LARGE TOUCH-FRIENDLY SCORING CONTROLS */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              SCORING CONTROLS (TAP TO SCORE)
            </span>
            <span className="text-xs text-emerald-400 font-semibold">One-Tap Auto Calculate</span>
          </div>

          {/* RUN BUTTONS (0 to 6) */}
          <div className="grid grid-cols-7 gap-2 sm:gap-3">
            {[0, 1, 2, 3, 4, 5, 6].map((run) => {
              let btnStyle = 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700';
              if (run === 4) btnStyle = 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-950';
              if (run === 6) btnStyle = 'bg-purple-600 hover:bg-purple-500 text-white border-purple-500 shadow-lg shadow-purple-950';
              if (run === 0) btnStyle = 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700';

              return (
                <button
                  key={run}
                  onClick={() => handleRecordRun(run)}
                  disabled={scoringState?.isMatchComplete || isSubmitting || currentMatchStatus === 'COMPLETED'}
                  className={`h-14 sm:h-16 rounded-xl border text-xl sm:text-2xl font-black transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center ${btnStyle}`}
                >
                  {run === 0 ? '0' : run}
                </button>
              );
            })}
          </div>

          {/* EXTRAS BUTTONS (WD, NB, B, LB, PENALTY) */}
          <div className="grid grid-cols-5 gap-2 sm:gap-3 pt-2">
            {[
              { type: 'WIDE' as ExtraType, label: 'WD', color: 'bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border-amber-500/50' },
              { type: 'NO_BALL' as ExtraType, label: 'NB', color: 'bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border-amber-500/50' },
              { type: 'BYE' as ExtraType, label: 'BYE', color: 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' },
              { type: 'LEG_BYE' as ExtraType, label: 'LB', color: 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' },
              { type: 'PENALTY' as ExtraType, label: 'PEN', color: 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' },
            ].map((ext) => (
              <button
                key={ext.type}
                onClick={() => {
                  setActiveExtraType(ext.type);
                  setExtraRunsInput(1);
                  setExtraBatRunsInput(0);
                }}
                disabled={scoringState?.isMatchComplete || isSubmitting || currentMatchStatus === 'COMPLETED'}
                className={`h-12 sm:h-14 rounded-xl border font-bold text-sm sm:text-base transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${ext.color}`}
              >
                {ext.label}
              </button>
            ))}
          </div>

          {/* ACTION BUTTONS (WICKET, UNDO, EDIT LAST BALL) */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-2">
            <button
              onClick={() => setShowWicketModal(true)}
              disabled={scoringState?.isMatchComplete || isSubmitting || currentMatchStatus === 'COMPLETED'}
              className="h-14 bg-rose-600 hover:bg-rose-500 text-white font-black text-base sm:text-lg rounded-xl border border-rose-500 shadow-lg shadow-rose-950/50 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <X className="w-5 h-5 stroke-[3]" /> WICKET
            </button>

            <button
              onClick={() => setShowUndoConfirm(true)}
              disabled={scoringState?.events.length === 0}
              className="h-14 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm sm:text-base rounded-xl border border-slate-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <RotateCcw className="w-4 h-4 text-emerald-400" /> UNDO
            </button>

            <button
              onClick={() => {
                if (scoringState?.events && scoringState.events.length > 0) {
                  const last = scoringState.events[scoringState.events.length - 1];
                  setEditRunsOffBat(last.runsOffBat);
                  setEditExtraRuns(last.extraRuns);
                  setEditExtraType(last.extraType);
                  setShowEditLastModal(true);
                }
              }}
              disabled={scoringState?.events.length === 0}
              className="h-14 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm sm:text-base rounded-xl border border-slate-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <Edit3 className="w-4 h-4 text-emerald-400" /> EDIT LAST
            </button>
          </div>
        </section>

        {/* SECTION 4: INNINGS MANAGEMENT ACTIONS */}
        <section className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {activeInningsNum === 1 && (
            <button
              onClick={() => setShowInnings2Modal(true)}
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold text-sm rounded-xl transition-all shadow-lg shadow-emerald-950 flex items-center gap-2"
            >
              <ChevronRight className="w-5 h-5 stroke-[3]" /> START SECOND INNINGS
            </button>
          )}

          <button
            onClick={handleEndMatch}
            disabled={scoringState?.isMatchComplete}
            className="px-5 py-3 bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 text-slate-300 font-bold text-sm rounded-xl border border-slate-700 transition-all ml-auto"
          >
            End & Complete Match
          </button>
        </section>
      </main>

      {/* ==================== MODALS & DIALOGS ==================== */}

      {/* 1. START MATCH INITIALIZATION MODAL */}
      {showStartModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="bg-emerald-500/20 text-emerald-400 p-2.5 rounded-xl border border-emerald-500/30">
                <Play className="w-6 h-6 fill-current" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Start Live Scoring</h2>
                <p className="text-xs text-slate-400">Confirm openers and match setup to start</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Batting Team selection */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  Batting Team
                </label>
                <select
                  value={startBattingTeamId}
                  onChange={(e) => {
                    setStartBattingTeamId(e.target.value);
                    setStartStrikerId('');
                    setStartNonStrikerId('');
                    setStartBowlerId('');
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-semibold focus:outline-none focus:border-emerald-500"
                >
                  <option value={match.teamAId}>{match.teamA?.name || 'Team A'}</option>
                  <option value={match.teamBId}>{match.teamB?.name || 'Team B'}</option>
                </select>
              </div>

              {/* Striker */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  Opening Striker (*)
                </label>
                <select
                  value={startStrikerId}
                  onChange={(e) => setStartStrikerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-medium focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Select Striker...</option>
                  {battingTeamPlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.role ? `(${p.role})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Non-Striker */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  Opening Non-Striker
                </label>
                <select
                  value={startNonStrikerId}
                  onChange={(e) => setStartNonStrikerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-medium focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Select Non-Striker...</option>
                  {battingTeamPlayers
                    .filter((p) => p.id !== startStrikerId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.role ? `(${p.role})` : ''}
                      </option>
                    ))}
                </select>
              </div>

              {/* Opening Bowler */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  Opening Bowler
                </label>
                <select
                  value={startBowlerId}
                  onChange={(e) => setStartBowlerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-medium focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Select Bowler...</option>
                  {bowlingTeamPlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.bowlingType ? `(${p.bowlingType})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={handleConfirmStartScoring}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-sm rounded-xl transition-all shadow-lg shadow-emerald-950"
              >
                START LIVE SCORING CONSOLE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. EXTRAS CONFIGURATION MODAL */}
      {activeExtraType && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="bg-amber-500/20 text-amber-400 p-1.5 rounded-lg border border-amber-500/30 text-xs font-black">
                  {activeExtraType}
                </span>
                Configure Extra Delivery
              </h3>
              <button onClick={() => setActiveExtraType(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {activeExtraType === 'WIDE' && (
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-2">
                    Wide Runs (Default 1)
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        key={num}
                        onClick={() => setExtraRunsInput(num)}
                        className={`py-3 rounded-xl border text-base font-bold transition-all ${
                          extraRunsInput === num
                            ? 'bg-amber-600 text-white border-amber-500 shadow-md'
                            : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        +{num}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeExtraType === 'NO_BALL' && (
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-2">
                    Runs Scored Off Bat on No-Ball
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {[0, 1, 2, 3, 4, 6].map((num) => (
                      <button
                        key={num}
                        onClick={() => setExtraBatRunsInput(num)}
                        className={`py-3 rounded-xl border text-base font-bold transition-all ${
                          extraBatRunsInput === num
                            ? 'bg-amber-600 text-white border-amber-500 shadow-md'
                            : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    Total: +1 No-Ball extra + {extraBatRunsInput} bat run(s) = {1 + extraBatRunsInput} total runs
                  </p>
                </div>
              )}

              {(activeExtraType === 'BYE' || activeExtraType === 'LEG_BYE' || activeExtraType === 'PENALTY') && (
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-2">
                    {activeExtraType} Runs
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((num) => (
                      <button
                        key={num}
                        onClick={() => setExtraRunsInput(num)}
                        className={`py-3 rounded-xl border text-base font-bold transition-all ${
                          extraRunsInput === num
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                            : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        +{num}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={handleConfirmExtra}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-sm rounded-xl transition-all shadow-lg"
              >
                RECORD {activeExtraType}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. WICKET DIALOG */}
      {showWicketModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="bg-rose-500/20 text-rose-400 p-1.5 rounded-lg border border-rose-500/30 text-xs font-black">
                  WICKET
                </span>
                Record Wicket Event
              </h3>
              <button onClick={() => setShowWicketModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Dismissed Player */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  Dismissed Player
                </label>
                <select
                  value={dismissedPlayerId || currentStriker?.id || ''}
                  onChange={(e) => setDismissedPlayerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-semibold focus:outline-none focus:border-rose-500"
                >
                  <option value={currentStriker?.id}>
                    {currentStriker?.name} (Striker)
                  </option>
                  <option value={currentNonStriker?.id}>
                    {currentNonStriker?.name} (Non-Striker)
                  </option>
                </select>
              </div>

              {/* Wicket Type */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  Wicket Type
                </label>
                <select
                  value={wicketType}
                  onChange={(e) => setWicketType(e.target.value as WicketType)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-semibold focus:outline-none focus:border-rose-500"
                >
                  <option value="BOWLED">Bowled</option>
                  <option value="CAUGHT">Caught</option>
                  <option value="CAUGHT_BEHIND">Caught Behind</option>
                  <option value="CAUGHT_BOWLED">Caught & Bowled</option>
                  <option value="LBW">LBW</option>
                  <option value="RUN_OUT">Run Out</option>
                  <option value="STUMPED">Stumped</option>
                  <option value="HIT_WICKET">Hit Wicket</option>
                  <option value="OBSTRUCTING">Obstructing the Field</option>
                  <option value="TIMED_OUT">Timed Out</option>
                  <option value="RETIRED_OUT">Retired Out</option>
                  <option value="RETIRED_HURT">Retired Hurt</option>
                </select>
              </div>

              {/* Fielder dropdown for Applicable wicket types */}
              {['CAUGHT', 'CAUGHT_BEHIND', 'RUN_OUT', 'STUMPED'].includes(wicketType) && (
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                    Fielder
                  </label>
                  <select
                    value={fielderId}
                    onChange={(e) => setFielderId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-medium focus:outline-none focus:border-rose-500"
                  >
                    <option value="">Select Fielder...</option>
                    {bowlingTeamPlayers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Select New Batsman */}
              {wicketType !== 'RETIRED_HURT' && availableNewBatsmen.length > 0 && (
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                    Select New Batsman
                  </label>
                  <select
                    value={newBatsmanId}
                    onChange={(e) => setNewBatsmanId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-semibold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Select New Batsman...</option>
                    {availableNewBatsmen.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.role ? `(${p.role})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={handleConfirmWicket}
                className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-black text-sm rounded-xl transition-all shadow-lg"
              >
                CONFIRM WICKET
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. SELECT NEXT BOWLER MODAL */}
      {showBowlerModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">OVER COMPLETE!</h3>
                <p className="text-xs text-slate-400">Select next bowler for upcoming over</p>
              </div>
              <button onClick={() => setShowBowlerModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                Next Bowler
              </label>
              <select
                value={selectedNextBowlerId}
                onChange={(e) => setSelectedNextBowlerId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white font-semibold focus:outline-none focus:border-emerald-500"
              >
                <option value="">Select Bowler...</option>
                {availableBowlers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.bowlingType ? `(${p.bowlingType})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2">
              <button
                onClick={handleSelectNextBowler}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-sm rounded-xl transition-all shadow-lg"
              >
                CONFIRM BOWLER
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. UNDO CONFIRMATION MODAL */}
      {showUndoConfirm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="bg-amber-500/20 text-amber-400 p-2.5 rounded-xl border border-amber-500/30">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Undo Last Delivery?</h3>
                <p className="text-xs text-slate-400">
                  This will reverse all affected statistics, overs, wickets, and strike.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowUndoConfirm(false)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUndo}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg"
              >
                Confirm Undo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. EDIT LAST BALL MODAL */}
      {showEditLastModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-400" /> Edit Last Delivery
              </h3>
              <button onClick={() => setShowEditLastModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  Runs Off Bat
                </label>
                <input
                  type="number"
                  min="0"
                  max="6"
                  value={editRunsOffBat}
                  onChange={(e) => setEditRunsOffBat(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  Extra Type
                </label>
                <select
                  value={editExtraType}
                  onChange={(e) => setEditExtraType(e.target.value as ExtraType)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white font-semibold"
                >
                  <option value="NONE">NONE</option>
                  <option value="WIDE">WIDE</option>
                  <option value="NO_BALL">NO BALL</option>
                  <option value="BYE">BYE</option>
                  <option value="LEG_BYE">LEG BYE</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  Extra Runs
                </label>
                <input
                  type="number"
                  min="0"
                  value={editExtraRuns}
                  onChange={(e) => setEditExtraRuns(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white font-bold"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleConfirmEditLast}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-sm rounded-xl shadow-lg"
              >
                SAVE CHANGES & RECALCULATE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. START SECOND INNINGS MODAL */}
      {showInnings2Modal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">START SECOND INNINGS</h3>
                <p className="text-xs text-emerald-400 font-semibold">
                  Target: {(scoringState?.currentInnings?.totalRuns || 0) + 1} runs
                </p>
              </div>
              <button onClick={() => setShowInnings2Modal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  Striker
                </label>
                <select
                  value={inn2StrikerId}
                  onChange={(e) => setInn2StrikerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-semibold"
                >
                  <option value="">Select Striker...</option>
                  {bowlingTeamPlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  Non-Striker
                </label>
                <select
                  value={inn2NonStrikerId}
                  onChange={(e) => setInn2NonStrikerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-semibold"
                >
                  <option value="">Select Non-Striker...</option>
                  {bowlingTeamPlayers
                    .filter((p) => p.id !== inn2StrikerId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  Opening Bowler
                </label>
                <select
                  value={inn2BowlerId}
                  onChange={(e) => setInn2BowlerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-semibold"
                >
                  <option value="">Select Bowler...</option>
                  {battingTeamPlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleConfirmStartInnings2}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-sm rounded-xl shadow-lg"
              >
                START SECOND INNINGS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. BALL HISTORY DRAWER */}
      {showBallHistoryDrawer && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-slate-900 border-l border-slate-800 max-w-md w-full h-full p-6 space-y-4 flex flex-col shadow-2xl animate-slide-in-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-400" /> Ball-by-Ball History
              </h3>
              <button onClick={() => setShowBallHistoryDrawer(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {scoringState?.events && scoringState.events.length > 0 ? (
                [...scoringState.events].reverse().map((e) => {
                  const striker = allPlayers.find((p) => p.id === e.strikerId);
                  const bowler = allPlayers.find((p) => p.id === e.bowlerId);

                  return (
                    <div
                      key={e.id}
                      className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-200">
                          Over {e.overDisplay} • {striker?.name || 'Batsman'} to {bowler?.name || 'Bowler'}
                        </div>
                        <div className="text-slate-400 mt-0.5">
                          {e.isWicket
                            ? `WICKET (${e.wicketType})`
                            : `${e.runsOffBat} run(s) ${e.extraType !== 'NONE' ? `[${e.extraType} +${e.extraRuns}]` : ''}`}
                        </div>
                      </div>

                      <div className="font-black text-sm text-emerald-400">
                        {e.isWicket ? 'W' : e.totalRuns}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-slate-500 text-xs italic text-center py-8">
                  No deliveries recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 9. BROADCAST URL & LIVE OVERLAYS DRAWER */}
      {showBroadcastDrawer && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-slate-900 border-l border-slate-800 max-w-lg w-full h-full p-6 space-y-4 flex flex-col shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Tv className="w-5 h-5 text-cyan-400" /> Broadcast Output & Overlays
              </h3>
              <button
                onClick={() => setShowBroadcastDrawer(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              This single transparent URL delivers all active overlays (scorebugs, wickets, boundaries, lower thirds, batter stats) directly into OBS Studio or vMix.
            </p>

            <BroadcastOutputUrlBox
              matchId={match.id}
              sport={match.sport || 'CRICKET'}
              matchTitle={match.name}
            />

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Independent Graphics Control
              </div>
              <p className="text-xs text-slate-400">
                To manage individual graphics (cue, play, stop, custom banners, lower thirds, player cards) without interrupting scoring, open the Master Broadcast Control Center.
              </p>
              <div className="pt-2">
                <a
                  href={`/broadcast/match/${match.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition"
                >
                  <Tv className="w-4 h-4" />
                  <span>Open Live Graphics Output Tab</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
