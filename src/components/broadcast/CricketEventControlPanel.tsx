import React, { useState, useMemo } from 'react';
import {
  Match,
  CricketMatchScoringState,
  WicketType,
  ExtraType,
  Player,
} from '../../types';
import { api } from '../../services/api';
import {
  Zap,
  Radio,
  Flame,
  AlertTriangle,
  CheckCircle2,
  Shield,
  Award,
  Sparkles,
  Layers,
  ChevronRight,
  User,
  X,
  Play,
  RotateCcw,
} from 'lucide-react';

interface CricketEventControlPanelProps {
  match: Match;
  scoringState: CricketMatchScoringState | null;
  onScoringUpdated?: () => void;
  className?: string;
}

export const CricketEventControlPanel: React.FC<CricketEventControlPanelProps> = ({
  match,
  scoringState,
  onScoringUpdated,
  className = '',
}) => {
  // Operational mode: Score + Broadcast vs Graphic Only
  const [controlMode, setControlMode] = useState<'SCORE_AND_BROADCAST' | 'GRAPHIC_ONLY'>('SCORE_AND_BROADCAST');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Wicket dialog state
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [wicketType, setWicketType] = useState<WicketType>('CAUGHT');
  const [selectedDismissedPlayerId, setSelectedDismissedPlayerId] = useState<string>('');
  const [selectedFielderId, setSelectedFielderId] = useState<string>('');
  const [selectedNewBatterId, setSelectedNewBatterId] = useState<string>('');
  const [confirmWicketStep, setConfirmWicketStep] = useState(false);

  // Extras modal state
  const [showExtraModal, setShowExtraModal] = useState(false);
  const [selectedExtraType, setSelectedExtraType] = useState<ExtraType>('WIDE');
  const [extraRunsInput, setExtraRunsInput] = useState<number>(1);
  const [extraBatRunsInput, setExtraBatRunsInput] = useState<number>(0);

  // Derive batting & bowling teams from match and scoring state
  const isTeamABatting = useMemo(() => {
    if (!scoringState) return true;
    return scoringState.currentInnings?.battingTeamId === match.teamAId;
  }, [scoringState, match]);

  const battingTeam = isTeamABatting ? match.teamA : match.teamB;
  const bowlingTeam = isTeamABatting ? match.teamB : match.teamA;

  const currentStriker = scoringState?.currentInnings?.striker;
  const currentNonStriker = scoringState?.currentInnings?.nonStriker;
  const currentBowler = scoringState?.currentInnings?.currentBowler;

  // Available new batters (players in batting squad who have not batted yet)
  const availableNewBatters: Player[] = useMemo(() => {
    if (!battingTeam?.players) return [];
    const innings = scoringState?.currentInnings;
    if (!innings) return battingTeam.players;
    const activeIds = [
      innings.striker?.playerId,
      innings.nonStriker?.playerId,
      ...(innings.batsmenStats || []).map((b) => b.playerId),
    ].filter(Boolean);

    return battingTeam.players.filter((p) => !activeIds.includes(p.id));
  }, [battingTeam, scoringState]);

  // Fielding squad players
  const fieldingPlayers: Player[] = useMemo(() => {
    return bowlingTeam?.players || [];
  }, [bowlingTeam]);

  const showToast = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  // 1. Record Normal Ball (Runs: 0, 1, 2, 3, 4, 6)
  const handleRecordRuns = async (runs: number) => {
    if (!match.id) return;
    setSubmitting(true);
    try {
      if (controlMode === 'SCORE_AND_BROADCAST') {
        await api.recordBall(match.id, {
          runsOffBat: runs,
          extraType: 'NONE',
          extraRuns: 0,
        });
        showToast(`Recorded ${runs} run(s) and broadcasted update`);
        if (onScoringUpdated) onScoringUpdated();
      } else {
        // Broadcast Graphic Only
        const graphicType = runs === 4 ? 'FOUR' : runs === 6 ? 'SIX' : 'NONE';
        if (graphicType !== 'NONE') {
          await api.triggerBroadcastEvent(match.id, {
            type: graphicType,
            durationSeconds: 4,
            data: { runs },
          });
          showToast(`Triggered ${graphicType} broadcast overlay (no score change)`);
        } else {
          showToast(`Graphic-only mode: ${runs} runs`);
        }
      }
    } catch (err: any) {
      console.error('Failed to record runs event:', err);
      showToast(err.message || 'Error executing action');
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Extras Handler
  const handleOpenExtraModal = (type: ExtraType) => {
    setSelectedExtraType(type);
    setExtraRunsInput(1);
    setExtraBatRunsInput(0);
    setShowExtraModal(true);
  };

  const handleConfirmExtra = async () => {
    if (!match.id) return;
    setSubmitting(true);
    try {
      if (controlMode === 'SCORE_AND_BROADCAST') {
        await api.recordBall(match.id, {
          runsOffBat: extraBatRunsInput,
          extraType: selectedExtraType,
          extraRuns: extraRunsInput,
        });
        showToast(`Recorded ${selectedExtraType} extra successfully`);
        if (onScoringUpdated) onScoringUpdated();
      } else {
        await api.triggerBroadcastEvent(match.id, {
          type: selectedExtraType === 'NO_BALL' ? 'FREE_HIT' : 'CUSTOM',
          durationSeconds: 4,
          data: { extraType: selectedExtraType, extraRuns: extraRunsInput },
        });
        showToast(`Triggered ${selectedExtraType} graphic overlay`);
      }
      setShowExtraModal(false);
    } catch (err: any) {
      console.error('Failed to record extra:', err);
      showToast(err.message || 'Error recording extra');
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Wicket Dialog & Confirmation
  const handleOpenWicketModal = () => {
    setSelectedDismissedPlayerId(currentStriker?.playerId || '');
    setSelectedFielderId('');
    setSelectedNewBatterId(availableNewBatters[0]?.id || '');
    setConfirmWicketStep(false);
    setShowWicketModal(true);
  };

  const handleExecuteWicket = async () => {
    if (!match.id) return;
    setSubmitting(true);
    try {
      if (controlMode === 'SCORE_AND_BROADCAST') {
        await api.recordBall(match.id, {
          runsOffBat: 0,
          extraType: 'NONE',
          extraRuns: 0,
          isWicket: true,
          wicketType,
          dismissedPlayerId: selectedDismissedPlayerId || currentStriker?.playerId,
          fielderId: ['CAUGHT', 'RUN_OUT', 'STUMPED'].includes(wicketType) ? selectedFielderId : undefined,
          newBatsmanId: selectedNewBatterId || undefined,
        });
        showToast(`Wicket (${wicketType}) recorded & broadcast overlay triggered!`);
        if (onScoringUpdated) onScoringUpdated();
      } else {
        await api.triggerBroadcastEvent(match.id, {
          type: 'WICKET',
          durationSeconds: 6,
          data: {
            wicketType,
            dismissedPlayer: battingTeam?.players?.find((p) => p.id === selectedDismissedPlayerId)?.name,
          },
        });
        showToast(`Triggered WICKET broadcast graphic (no score change)`);
      }
      setShowWicketModal(false);
    } catch (err: any) {
      console.error('Failed to record wicket:', err);
      showToast(err.message || 'Error recording wicket');
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Quick Standalone Graphic Overlays
  const handleTriggerGraphicOnly = async (type: string, durationSeconds = 4, data?: any) => {
    if (!match.id) return;
    try {
      await api.triggerBroadcastEvent(match.id, {
        type,
        durationSeconds,
        data,
      });
      showToast(`Triggered ${type} broadcast animation`);
    } catch (err: any) {
      console.error('Failed to trigger broadcast animation:', err);
      showToast(err.message || 'Error triggering overlay');
    }
  };

  return (
    <div
      id="sports-pulse-cricket-event-control-panel"
      className={`bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4 shadow-xl font-sans ${className}`}
    >
      {/* Header with Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 mb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>CRICKET EVENT & SCORING CONTROLS</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Tactile ball input integrated with real-time broadcast graphics
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-950 border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setControlMode('SCORE_AND_BROADCAST')}
            className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer min-h-[32px] ${
              controlMode === 'SCORE_AND_BROADCAST'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Records ball in scoring state and triggers broadcast graphics"
          >
            Score & Broadcast
          </button>
          <button
            onClick={() => setControlMode('GRAPHIC_ONLY')}
            className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer min-h-[32px] ${
              controlMode === 'GRAPHIC_ONLY'
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Triggers broadcast animation only without modifying match score"
          >
            Graphic Only
          </button>
        </div>
      </div>

      {/* Toast Feedback */}
      {feedback && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-cyan-950/80 border border-cyan-700/80 text-cyan-200 text-xs font-mono flex items-center gap-2 shadow-md">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Mode Alert Banner */}
      {controlMode === 'GRAPHIC_ONLY' && (
        <div className="mb-3 px-3 py-1.5 rounded-lg bg-purple-950/50 border border-purple-800/60 text-purple-300 text-xs font-mono flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
          <span>GRAPHIC ONLY MODE: Buttons trigger on-screen graphics without updating match score.</span>
        </div>
      )}

      {/* Section 1: Tactile Runs Grid (Touch Targets ≥ 46px) */}
      <div className="mb-4">
        <label className="text-[11px] font-mono text-slate-400 uppercase font-bold block mb-2">
          1. QUICK RUN INPUT (BALL OUTCOME)
        </label>
        <div className="grid grid-cols-6 gap-2">
          {[
            { runs: 0, label: '0', sub: 'DOT', bg: 'bg-slate-800 hover:bg-slate-700 text-slate-200' },
            { runs: 1, label: '1', sub: 'SINGLE', bg: 'bg-slate-800 hover:bg-slate-700 text-slate-200' },
            { runs: 2, label: '2', sub: 'DOUBLE', bg: 'bg-slate-800 hover:bg-slate-700 text-slate-200' },
            { runs: 3, label: '3', sub: 'THREE', bg: 'bg-slate-800 hover:bg-slate-700 text-slate-200' },
            { runs: 4, label: '4', sub: 'FOUR', bg: 'bg-cyan-700 hover:bg-cyan-600 text-white font-black' },
            { runs: 6, label: '6', sub: 'SIX', bg: 'bg-emerald-700 hover:bg-emerald-600 text-white font-black' },
          ].map((r) => (
            <button
              key={r.runs}
              id={`btn-cricket-run-${r.runs}`}
              onClick={() => handleRecordRuns(r.runs)}
              disabled={submitting}
              className={`flex flex-col items-center justify-center rounded-xl p-2 font-black transition cursor-pointer min-h-[56px] shadow-md border border-slate-700/80 active:scale-95 ${r.bg}`}
            >
              <span className="text-lg leading-none">{r.label}</span>
              <span className="text-[9px] font-mono opacity-80 mt-0.5 tracking-wider">{r.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Section 2: Extras & Wicket Dismissal */}
      <div className="mb-4">
        <label className="text-[11px] font-mono text-slate-400 uppercase font-bold block mb-2">
          2. EXTRAS & DISMISSALS
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <button
            onClick={() => handleOpenExtraModal('WIDE')}
            disabled={submitting}
            className="flex flex-col items-center justify-center p-2 rounded-xl bg-amber-950/60 hover:bg-amber-900 text-amber-200 border border-amber-800/80 font-bold transition cursor-pointer min-h-[48px] active:scale-96"
          >
            <span className="text-xs">WIDE</span>
            <span className="text-[9px] font-mono text-amber-400">+1 Extra</span>
          </button>

          <button
            onClick={() => handleOpenExtraModal('NO_BALL')}
            disabled={submitting}
            className="flex flex-col items-center justify-center p-2 rounded-xl bg-amber-950/60 hover:bg-amber-900 text-amber-200 border border-amber-800/80 font-bold transition cursor-pointer min-h-[48px] active:scale-96"
          >
            <span className="text-xs">NO BALL</span>
            <span className="text-[9px] font-mono text-amber-400">+1 & Free Hit</span>
          </button>

          <button
            onClick={() => handleOpenExtraModal('BYE')}
            disabled={submitting}
            className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold transition cursor-pointer min-h-[48px] active:scale-96"
          >
            <span className="text-xs">BYE</span>
            <span className="text-[9px] font-mono text-slate-400">Extra</span>
          </button>

          <button
            onClick={() => handleOpenExtraModal('LEG_BYE')}
            disabled={submitting}
            className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold transition cursor-pointer min-h-[48px] active:scale-96"
          >
            <span className="text-xs">LEG BYE</span>
            <span className="text-[9px] font-mono text-slate-400">Extra</span>
          </button>

          {/* High Stakes Wicket Button */}
          <button
            id="btn-trigger-wicket-modal"
            onClick={handleOpenWicketModal}
            disabled={submitting}
            className="col-span-2 sm:col-span-1 flex flex-col items-center justify-center p-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black transition cursor-pointer min-h-[48px] shadow-lg shadow-red-950/60 active:scale-96 border border-red-400"
          >
            <span className="text-xs tracking-wider">WICKET!</span>
            <span className="text-[9px] font-mono text-red-100">Dismissal</span>
          </button>
        </div>
      </div>

      {/* Section 3: One-Tap Broadcast Animation Overlays */}
      <div>
        <label className="text-[11px] font-mono text-slate-400 uppercase font-bold block mb-2">
          3. BROADCAST ANIMATION QUICK TRIGGERS
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={() => handleTriggerGraphicOnly('FOUR', 4)}
            className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-bold transition cursor-pointer min-h-[44px]"
          >
            <Flame className="w-3.5 h-3.5 text-cyan-400" />
            <span>FOUR OVERLAY</span>
          </button>

          <button
            onClick={() => handleTriggerGraphicOnly('SIX', 4)}
            className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-emerald-300 border border-slate-700 text-xs font-bold transition cursor-pointer min-h-[44px]"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>SIX OVERLAY</span>
          </button>

          <button
            onClick={() => handleTriggerGraphicOnly('WICKET', 5)}
            className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-red-300 border border-slate-700 text-xs font-bold transition cursor-pointer min-h-[44px]"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span>WICKET CARD</span>
          </button>

          <button
            onClick={() => handleTriggerGraphicOnly('MILESTONE', 6, { milestone: 50 })}
            className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-bold transition cursor-pointer min-h-[44px]"
          >
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>50 MILESTONE</span>
          </button>

          <button
            onClick={() => handleTriggerGraphicOnly('MILESTONE', 8, { milestone: 100 })}
            className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-bold transition cursor-pointer min-h-[44px]"
          >
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>100 CENTURY</span>
          </button>

          <button
            onClick={() => handleTriggerGraphicOnly('FREE_HIT', 4)}
            className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-yellow-300 border border-slate-700 text-xs font-bold transition cursor-pointer min-h-[44px]"
          >
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
            <span>FREE HIT</span>
          </button>

          <button
            onClick={() => handleTriggerGraphicOnly('MAIDEN', 5)}
            className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-purple-300 border border-slate-700 text-xs font-bold transition cursor-pointer min-h-[44px]"
          >
            <Shield className="w-3.5 h-3.5 text-purple-400" />
            <span>MAIDEN OVER</span>
          </button>

          <button
            onClick={() => handleTriggerGraphicOnly('CUSTOM', 6, { title: 'INNINGS BREAK' })}
            className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition cursor-pointer min-h-[44px]"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>INNINGS BREAK</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* WICKET MODAL WITH SELECTABLE PLAYERS & CONFIRMATION */}
      {/* ========================================================= */}
      {showWicketModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-5 font-sans">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-red-600/20 border border-red-500/40 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                </div>
                <h4 className="text-sm font-black text-white uppercase tracking-wider">
                  RECORD WICKET DISMISSAL
                </h4>
              </div>
              <button
                onClick={() => setShowWicketModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!confirmWicketStep ? (
              <div className="space-y-3.5 text-xs">
                {/* 1. Dismissal Type */}
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1 font-bold">
                    DISMISSAL TYPE:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      'BOWLED',
                      'CAUGHT',
                      'LBW',
                      'RUN_OUT',
                      'STUMPED',
                      'HIT_WICKET',
                      'RETIRED_OUT',
                    ].map((type) => (
                      <button
                        key={type}
                        onClick={() => setWicketType(type as WicketType)}
                        className={`p-2 rounded-lg font-bold text-[11px] transition cursor-pointer border ${
                          wicketType === type
                            ? 'bg-red-950 text-red-200 border-red-600 shadow'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {type.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Dismissed Batter Dropdown */}
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1 font-bold">
                    DISMISSED BATTER:
                  </label>
                  <select
                    value={selectedDismissedPlayerId}
                    onChange={(e) => setSelectedDismissedPlayerId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-red-500 font-medium"
                  >
                    <option value={currentStriker?.playerId || ''}>
                      Striker: {currentStriker?.playerName || 'Current Striker'} ({currentStriker?.runs || 0} runs)
                    </option>
                    {currentNonStriker && (
                      <option value={currentNonStriker.playerId}>
                        Non-Striker: {currentNonStriker.playerName} ({currentNonStriker.runs || 0} runs)
                      </option>
                    )}
                    {battingTeam?.players?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} #{p.jerseyNumber || ''} ({p.role || 'Batter'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Fielder Dropdown (for Caught, Run Out, Stumped) */}
                {['CAUGHT', 'RUN_OUT', 'STUMPED'].includes(wicketType) && (
                  <div>
                    <label className="text-[11px] font-mono text-slate-400 block mb-1 font-bold">
                      FIELDER / CATCHER ({bowlingTeam?.name || 'Bowling Team'}):
                    </label>
                    <select
                      value={selectedFielderId}
                      onChange={(e) => setSelectedFielderId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-medium"
                    >
                      <option value="">-- Select Fielder --</option>
                      {fieldingPlayers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} #{p.jerseyNumber || ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 4. Next Incoming Batter */}
                {controlMode === 'SCORE_AND_BROADCAST' && (
                  <div>
                    <label className="text-[11px] font-mono text-slate-400 block mb-1 font-bold">
                      NEXT INCOMING BATTER:
                    </label>
                    <select
                      value={selectedNewBatterId}
                      onChange={(e) => setSelectedNewBatterId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-medium"
                    >
                      <option value="">-- Select Next Batter (Optional) --</option>
                      {availableNewBatters.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.role || 'Batter'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Action buttons */}
                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                  <button
                    onClick={() => setShowWicketModal(false)}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setConfirmWicketStep(true)}
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-black flex items-center gap-1.5 cursor-pointer shadow-lg shadow-red-950/60"
                  >
                    <span>Proceed to Confirm</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              /* Confirmation Screen before irreversible score update */
              <div className="space-y-4 text-xs">
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-700/60 space-y-2">
                  <div className="font-bold text-red-300 text-sm">
                    Confirm Dismissal Submission?
                  </div>
                  <div className="text-slate-300 space-y-1">
                    <div>
                      <strong className="text-slate-400">Type:</strong> {wicketType.replace('_', ' ')}
                    </div>
                    <div>
                      <strong className="text-slate-400">Batter:</strong>{' '}
                      {battingTeam?.players?.find((p) => p.id === selectedDismissedPlayerId)?.name ||
                        currentStriker?.playerName ||
                        'Current Striker'}
                    </div>
                    {selectedFielderId && (
                      <div>
                        <strong className="text-slate-400">Fielder:</strong>{' '}
                        {fieldingPlayers.find((p) => p.id === selectedFielderId)?.name}
                      </div>
                    )}
                    <div>
                      <strong className="text-slate-400">Mode:</strong>{' '}
                      {controlMode === 'SCORE_AND_BROADCAST' ? 'Update Score & Fire Overlay' : 'Graphic Overlay Only'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => setConfirmWicketStep(false)}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleExecuteWicket}
                    disabled={submitting}
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-black cursor-pointer shadow-xl shadow-red-950/80"
                  >
                    {submitting ? 'Submitting...' : 'CONFIRM & SUBMIT WICKET'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* EXTRAS MODAL */}
      {/* ========================================================= */}
      {showExtraModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl p-5 font-sans">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <h4 className="text-sm font-black text-white uppercase tracking-wider">
                RECORD {selectedExtraType}
              </h4>
              <button
                onClick={() => setShowExtraModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1 font-bold">
                  EXTRA RUNS (PENALTY):
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      onClick={() => setExtraRunsInput(val)}
                      className={`flex-1 py-2 rounded-lg font-bold text-xs cursor-pointer border ${
                        extraRunsInput === val
                          ? 'bg-amber-600 text-white border-amber-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              {['NO_BALL', 'WIDE'].includes(selectedExtraType) && (
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1 font-bold">
                    ADDITIONAL RUNS SCORED BY BATSMAN:
                  </label>
                  <div className="flex items-center gap-2">
                    {[0, 1, 2, 3, 4, 6].map((val) => (
                      <button
                        key={val}
                        onClick={() => setExtraBatRunsInput(val)}
                        className={`flex-1 py-2 rounded-lg font-bold text-xs cursor-pointer border ${
                          extraBatRunsInput === val
                            ? 'bg-cyan-600 text-white border-cyan-500'
                            : 'bg-slate-950 text-slate-400 border-slate-800'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  onClick={() => setShowExtraModal(false)}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmExtra}
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-black cursor-pointer"
                >
                  {submitting ? 'Recording...' : 'RECORD EXTRA'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
