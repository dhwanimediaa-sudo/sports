import React, { useState, useEffect, useRef } from 'react';
import {
  Match,
  VolleyballMatchScoringState,
  VolleyballPointType,
  Player,
  VolleyballRotation,
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
  RotateCw,
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
} from 'lucide-react';

export interface VolleyballScoringConsoleProps {
  match: Match;
  onMatchStatusChange?: () => void;
}

const POINT_TYPE_OPTIONS: { type: VolleyballPointType; label: string; icon: string; desc: string }[] = [
  { type: 'ATTACK_POINT', label: 'Attack / Spike Kill', icon: '⚡', desc: 'Direct spike kill into opponent court' },
  { type: 'SERVICE_ACE', label: 'Service Ace', icon: '🎯', desc: 'Direct ace from service' },
  { type: 'BLOCK_POINT', label: 'Block Kill', icon: '🛡️', desc: 'Stuff block resulting in direct point' },
  { type: 'ATTACK_ERROR', label: 'Opponent Attack Error', icon: '❌', desc: 'Opponent spike out of bounds or into net' },
  { type: 'SERVICE_ERROR', label: 'Opponent Service Fault', icon: '⚠️', desc: 'Opponent serve into net or out' },
  { type: 'NET_VIOLATION', label: 'Opponent Net Violation', icon: '🛑', desc: 'Opponent touched net or crossed line' },
  { type: 'ROTATION_FAULT', label: 'Opponent Rotation Fault', icon: '🔄', desc: 'Opponent out of rotation position' },
  { type: 'UNFORCED_ERROR', label: 'Opponent Unforced Error', icon: '📉', desc: 'Ball handling / double touch / lift' },
];

export const VolleyballScoringConsole: React.FC<VolleyballScoringConsoleProps> = ({
  match,
  onMatchStatusChange,
}) => {
  const [scoringState, setScoringState] = useState<VolleyballMatchScoringState | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Setup / Start Match Modal State
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [servingFirstTeamId, setServingFirstTeamId] = useState<string>(match.teamAId);

  // Substitution Modal State
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [subTeamId, setSubTeamId] = useState<string>(match.teamAId);
  const [subPlayerOutId, setSubPlayerOutId] = useState<string>('');
  const [subPlayerInId, setSubPlayerInId] = useState<string>('');

  // Timeout Confirmation State
  const [isTimeoutConfirmOpen, setIsTimeoutConfirmOpen] = useState(false);
  const [timeoutTeamId, setTimeoutTeamId] = useState<string>(match.teamAId);

  // Score Correction Modal State
  const [isScoreCorrectionOpen, setIsScoreCorrectionOpen] = useState(false);
  const [correctTeamAScore, setCorrectTeamAScore] = useState<number>(0);
  const [correctTeamBScore, setCorrectTeamBScore] = useState<number>(0);

  // Edit Last Point Modal State
  const [isEditLastPointOpen, setIsEditLastPointOpen] = useState(false);
  const [editPointWinner, setEditPointWinner] = useState<string>('');
  const [editPointType, setEditPointType] = useState<VolleyballPointType>('ATTACK_POINT');
  const [editPlayerId, setEditPlayerId] = useState<string>('');

  // Detailed Point Builder selection
  const [selectedPointType, setSelectedPointType] = useState<VolleyballPointType>('ATTACK_POINT');
  const [attributedPlayerId, setAttributedPlayerId] = useState<string>('');

  // Load live scoring state
  const loadScoringState = async () => {
    try {
      setError(null);
      const res = await api.getVolleyballScoringState(match.id);
      setScoringState(res.state);
    } catch (err: any) {
      setError(err.message || 'Failed to load volleyball live scoring state.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScoringState();
  }, [match.id]);

  // SSE Stream Listener with exponential backoff reconnect and deduplication
  useMatchStream({
    matchId: match.id,
    onMessage: (data) => {
      if (data.scoringState) {
        setScoringState(data.scoringState);
      } else if (data.setsList || data.allRallies || data.teamAScore !== undefined) {
        setScoringState(data);
      }
    },
  });

  // Start Volleyball Match
  const handleStartMatch = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      const res = await api.startVolleyballScoring(match.id, {
        servingFirstTeamId,
      });
      setScoringState(res.state);
      setIsStartModalOpen(false);
      if (onMatchStatusChange) onMatchStatusChange();
    } catch (err: any) {
      setError(err.message || 'Failed to start volleyball match.');
    } finally {
      setActionLoading(false);
    }
  };

  // Record a Point
  const handleRecordPoint = async (winnerTeamId: string, customPointType?: VolleyballPointType, customPlayerId?: string) => {
    if (actionLoading || scoringState?.isMatchComplete) return;
    setActionLoading(true);
    try {
      const pType = customPointType || selectedPointType;
      const pId = customPlayerId !== undefined ? customPlayerId : attributedPlayerId;
      const res = await api.recordVolleyballPoint(match.id, {
        pointWinner: winnerTeamId,
        pointType: pType,
        playerId: pId || undefined,
        opponentError: pType.includes('ERROR') || pType.includes('VIOLATION') || pType.includes('FAULT'),
      });
      setScoringState(res.state);
      setAttributedPlayerId('');
      if (onMatchStatusChange) {
        onMatchStatusChange();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to record point.');
    } finally {
      setActionLoading(false);
    }
  };

  // Start Next Set
  const handleStartNextSet = async () => {
    setActionLoading(true);
    try {
      const res = await api.startVolleyballNextSet(match.id);
      setScoringState(res.state);
      if (onMatchStatusChange) onMatchStatusChange();
    } catch (err: any) {
      alert(err.message || 'Failed to start next set.');
    } finally {
      setActionLoading(false);
    }
  };

  // Request Timeout
  const handleCallTimeout = async () => {
    setActionLoading(true);
    try {
      const res = await api.recordVolleyballTimeout(match.id, timeoutTeamId);
      setScoringState(res.state);
      setIsTimeoutConfirmOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to record timeout.');
    } finally {
      setActionLoading(false);
    }
  };

  // Perform Substitution
  const handleSubstitution = async () => {
    if (!subPlayerOutId || !subPlayerInId) {
      alert('Please select both the outgoing player and incoming player.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.recordVolleyballSubstitution(match.id, {
        teamId: subTeamId,
        playerOutId: subPlayerOutId,
        playerInId: subPlayerInId,
      });
      setScoringState(res.state);
      setIsSubModalOpen(false);
      setSubPlayerOutId('');
      setSubPlayerInId('');
    } catch (err: any) {
      alert(err.message || 'Failed to perform substitution.');
    } finally {
      setActionLoading(false);
    }
  };

  // Manual Score Correction
  const handleScoreCorrection = async () => {
    setActionLoading(true);
    try {
      const res = await api.correctVolleyballScore(match.id, {
        teamAScore: correctTeamAScore,
        teamBScore: correctTeamBScore,
        setNumber: scoringState?.currentSetNumber || 1,
      });
      setScoringState(res.state);
      setIsScoreCorrectionOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to correct score.');
    } finally {
      setActionLoading(false);
    }
  };

  // Undo Last Point
  const handleUndo = async () => {
    if (!window.confirm('Undo the last recorded point for this match? This action cannot be undone.')) return;
    setActionLoading(true);
    try {
      const res = await api.undoVolleyballPoint(match.id);
      setScoringState(res.state);
      if (onMatchStatusChange) onMatchStatusChange();
    } catch (err: any) {
      alert(err.message || 'Failed to undo last point.');
    } finally {
      setActionLoading(false);
    }
  };

  // Edit Last Point
  const handleEditLastPoint = async () => {
    setActionLoading(true);
    try {
      const res = await api.editLastVolleyballPoint(match.id, {
        pointWinner: editPointWinner,
        pointType: editPointType,
        playerId: editPlayerId || undefined,
      });
      setScoringState(res.state);
      setIsEditLastPointOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to edit last point.');
    } finally {
      setActionLoading(false);
    }
  };

  // End Match
  const handleEndMatch = async () => {
    if (!window.confirm('Are you sure you want to end and finalize this Volleyball match?')) return;
    setActionLoading(true);
    try {
      const res = await api.endMatchScoring(match.id);
      setScoringState(res.state as any);
      if (onMatchStatusChange) onMatchStatusChange();
    } catch (err: any) {
      alert(err.message || 'Failed to end match.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center space-y-3 bg-slate-900/60 rounded-2xl border border-slate-800">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs text-slate-400 font-medium">Initializing Volleyball Live Scoring Console...</p>
      </div>
    );
  }

  if (error || !scoringState) {
    return (
      <div className="p-8 text-center space-y-4 bg-slate-900/80 rounded-2xl border border-slate-800">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <h3 className="text-base font-bold text-slate-200">Scoring Console Error</h3>
        <p className="text-xs text-slate-400">{error || 'Unable to retrieve live volleyball state.'}</p>
        <Button size="sm" variant="secondary" onClick={loadScoringState} icon={<RefreshCw className="w-4 h-4" />}>
          Retry Connection
        </Button>
      </div>
    );
  }

  const isMatchLive = match.status === 'LIVE' || (match.status as string) === 'SET BREAK';
  const currentSet = scoringState.currentSet;
  const teamAScore = currentSet?.teamAScore || 0;
  const teamBScore = currentSet?.teamBScore || 0;
  const teamASets = scoringState.teamASetsWon || 0;
  const teamBSets = scoringState.teamBSetsWon || 0;
  const isTeamAServing = scoringState.servingTeamId === match.teamAId;
  const isTeamBServing = scoringState.servingTeamId === match.teamBId;

  // Active court players
  const courtA = scoringState.courtA;
  const courtB = scoringState.courtB;
  const serverPlayer = scoringState.serverPlayer;

  // Available Bench Players for subs
  const teamAPlayers = courtA?.allTeamPlayers || [];
  const teamBPlayers = courtB?.allTeamPlayers || [];
  const courtAPlayerIds = courtA ? [courtA.position1?.id, courtA.position2?.id, courtA.position3?.id, courtA.position4?.id, courtA.position5?.id, courtA.position6?.id] : [];
  const courtBPlayerIds = courtB ? [courtB.position1?.id, courtB.position2?.id, courtB.position3?.id, courtB.position4?.id, courtB.position5?.id, courtB.position6?.id] : [];
  const benchAPlayers = teamAPlayers.filter((p) => !courtAPlayerIds.includes(p.id));
  const benchBPlayers = teamBPlayers.filter((p) => !courtBPlayerIds.includes(p.id));

  // If match has not started yet
  if (match.status === 'SCHEDULED' || match.status === 'READY') {
    return (
      <div className="p-8 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
          <Zap className="w-8 h-8" />
        </div>
        <div className="space-y-2 max-w-md mx-auto">
          <h3 className="text-lg font-black text-slate-100 uppercase tracking-wider">
            Volleyball Live Scoring Ready
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Configure the starting server and starting six rotation to initiate live Set 1 scoring for{' '}
            <strong className="text-slate-200">{match.teamA?.name}</strong> vs{' '}
            <strong className="text-slate-200">{match.teamB?.name}</strong>.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Button
            size="lg"
            variant="primary"
            onClick={() => setIsStartModalOpen(true)}
            icon={<PlayCircle className="w-5 h-5" />}
          >
            Start Set 1 & Live Scoring
          </Button>
        </div>

        {/* Start Match Modal */}
        {isStartModalOpen && (
          <Dialog
            isOpen={isStartModalOpen}
            onClose={() => setIsStartModalOpen(false)}
            title="Start Volleyball Match: Set 1"
          >
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Select which team serves first in Set 1 ({scoringState.matchFormat || 'Best of 5'}).
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">First Serving Team</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setServingFirstTeamId(match.teamAId)}
                    className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                      servingFirstTeamId === match.teamAId
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <div>
                      <p className="text-xs">{match.teamA?.name}</p>
                      <p className="text-[10px] text-slate-400 font-normal">Team A (Home)</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setServingFirstTeamId(match.teamBId)}
                    className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                      servingFirstTeamId === match.teamBId
                        ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <Shield className="w-4 h-4 text-sky-400" />
                    <div>
                      <p className="text-xs">{match.teamB?.name}</p>
                      <p className="text-[10px] text-slate-400 font-normal">Team B (Away)</p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1">
                <p>
                  • Format: <strong className="text-slate-200">{scoringState.matchFormat}</strong> ({scoringState.setsNeededToWin} sets to win)
                </p>
                <p>
                  • Standard Sets: <strong className="text-slate-200">{scoringState.pointsPerSet} Points</strong> (Win by 2)
                </p>
                <p>
                  • Deciding Set: <strong className="text-slate-200">{scoringState.decidingSetPoints} Points</strong> (Win by 2)
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" size="sm" onClick={() => setIsStartModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleStartMatch}
                  loading={actionLoading}
                  icon={<Zap className="w-4 h-4" />}
                >
                  Confirm & Begin Set 1
                </Button>
              </div>
            </div>
          </Dialog>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 1. TOP LIVE VOLLEYBALL SCOREBOARD BANNER */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <Zap className="w-64 h-64 text-emerald-400" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
              SET {scoringState.currentSetNumber} OF {scoringState.setsList.length || 1}
            </span>
            <Badge variant="slate" className="text-[10px] font-bold">
              {scoringState.matchFormat}
            </Badge>
            {scoringState.isDeuce && (
              <Badge variant="amber" className="animate-pulse font-black text-[10px]">
                🔥 DEUCE ({scoringState.currentSet?.teamAScore} - {scoringState.currentSet?.teamBScore})
              </Badge>
            )}
            {scoringState.isSetPoint && !scoringState.isMatchPoint && (
              <Badge variant="amber" className="animate-pulse font-black text-[10px]">
                ⚡ SET POINT
              </Badge>
            )}
            {scoringState.isMatchPoint && (
              <Badge variant="rose" className="animate-pulse font-black text-[10px]">
                🏆 MATCH POINT
              </Badge>
            )}
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setCorrectTeamAScore(teamAScore);
                setCorrectTeamBScore(teamBScore);
                setIsScoreCorrectionOpen(true);
              }}
              icon={<Sliders className="w-3.5 h-3.5 text-amber-400" />}
              className="text-xs"
            >
              Correct Score
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleUndo}
              disabled={scoringState.allRallies.length === 0 || actionLoading}
              icon={<Undo2 className="w-3.5 h-3.5 text-rose-400" />}
              className="text-xs"
            >
              Undo Point
            </Button>
          </div>
        </div>

        {/* MAIN DIGITAL SCORE DISPLAY */}
        <div className="grid grid-cols-1 md:grid-cols-11 items-center gap-4 py-2">
          {/* Team A Score Column */}
          <div className="md:col-span-5 flex items-center justify-between p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-100">{match.teamA?.name}</h3>
                {isTeamAServing && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black flex items-center gap-1 animate-pulse">
                    <Radio className="w-3 h-3 text-emerald-400" /> SERVING
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Sets Won: <strong className="text-emerald-400 font-black text-sm">{teamASets}</strong></span>
                <span>•</span>
                <span>TOs: <strong className="text-slate-200">{scoringState.timeoutsRemainingA}/2</strong></span>
                <span>•</span>
                <span>Subs: <strong className="text-slate-200">{scoringState.subsUsedA}/6</strong></span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-4xl md:text-5xl font-black font-mono text-emerald-400 tracking-tighter">
                {teamAScore}
              </span>
            </div>
          </div>

          {/* VS Divider & Sets Summary */}
          <div className="md:col-span-1 text-center py-1">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">SETS</div>
            <div className="text-lg font-black text-slate-200 font-mono">
              {teamASets} - {teamBSets}
            </div>
          </div>

          {/* Team B Score Column */}
          <div className="md:col-span-5 flex items-center justify-between p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="text-left">
              <span className="text-4xl md:text-5xl font-black font-mono text-sky-400 tracking-tighter">
                {teamBScore}
              </span>
            </div>

            <div className="space-y-1 text-right">
              <div className="flex items-center justify-end gap-2">
                {isTeamBServing && (
                  <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-black flex items-center gap-1 animate-pulse">
                    <Radio className="w-3 h-3 text-sky-400" /> SERVING
                  </span>
                )}
                <h3 className="text-base font-black text-slate-100">{match.teamB?.name}</h3>
              </div>
              <div className="flex items-center justify-end gap-2 text-xs text-slate-400">
                <span>Sets Won: <strong className="text-sky-400 font-black text-sm">{teamBSets}</strong></span>
                <span>•</span>
                <span>TOs: <strong className="text-slate-200">{scoringState.timeoutsRemainingB}/2</strong></span>
                <span>•</span>
                <span>Subs: <strong className="text-slate-200">{scoringState.subsUsedB}/6</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* SET-BY-SET PROGRESS STRIP */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 overflow-x-auto text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
            Set Breakdown:
          </span>
          <div className="flex items-center gap-2">
            {scoringState.setsList.map((st) => (
              <div
                key={st.id}
                className={`px-3 py-1 rounded-lg border text-center font-mono ${
                  st.isCompleted
                    ? 'bg-slate-900 border-slate-700 text-slate-200'
                    : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-bold'
                }`}
              >
                <span className="text-[9px] uppercase block text-slate-400 font-sans">Set {st.setNumber}</span>
                <span className="text-xs font-black">
                  {st.teamAScore} - {st.teamBScore}
                </span>
              </div>
            ))}
          </div>

          {/* Active Server Info */}
          {serverPlayer && (
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800 text-slate-300 text-xs">
              <span className="text-slate-500 text-[10px] uppercase font-bold">Active Server:</span>
              <span className="font-black text-amber-300 flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold flex items-center justify-center">
                  1
                </span>
                {serverPlayer.name} {serverPlayer.jerseyNumber ? `(#${serverPlayer.jerseyNumber})` : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* SET COMPLETED OR MATCH WON BANNER */}
      {scoringState.isMatchComplete ? (
        <Card className="p-6 bg-gradient-to-r from-emerald-950/40 to-slate-900 border-emerald-500/40 text-center space-y-4">
          <Trophy className="w-12 h-12 text-amber-400 mx-auto animate-bounce" />
          <h2 className="text-xl font-black text-slate-100 tracking-wider uppercase">
            Match Won by {scoringState.matchWinnerTeamId === match.teamAId ? match.teamA?.name : match.teamB?.name}!
          </h2>
          <p className="text-xs text-emerald-300 font-medium">
            Final Result: {match.teamA?.name} {teamASets} - {teamBSets} {match.teamB?.name} ({scoringState.setsList.map((s) => `${s.teamAScore}-${s.teamBScore}`).join(', ')})
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="primary" size="sm" onClick={handleEndMatch} icon={<CheckCircle2 className="w-4 h-4" />}>
              Confirm & Finalize Match
            </Button>
          </div>
        </Card>
      ) : scoringState.isSetComplete ? (
        <Card className="p-5 bg-gradient-to-r from-amber-950/30 to-slate-900 border-amber-500/40 text-center space-y-3">
          <Award className="w-8 h-8 text-amber-400 mx-auto" />
          <h3 className="text-base font-black text-slate-100 uppercase tracking-wider">
            Set {scoringState.currentSetNumber} Concluded ({teamAScore} - {teamBScore})
          </h3>
          <p className="text-xs text-slate-400">
            Set winner:{' '}
            <strong className="text-amber-300">
              {teamAScore > teamBScore ? match.teamA?.name : match.teamB?.name}
            </strong>
            . Match score is currently {teamASets} - {teamBSets}.
          </p>
          <div className="flex justify-center gap-3 pt-1">
            <Button
              variant="primary"
              size="md"
              onClick={handleStartNextSet}
              loading={actionLoading}
              icon={<PlayCircle className="w-4 h-4" />}
            >
              Start Set {scoringState.currentSetNumber + 1}
            </Button>
          </div>
        </Card>
      ) : null}

      {/* 2. PRIMARY LIVE ACTION CONSOLE & RALLY RECORDER */}
      {!scoringState.isMatchComplete && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* LEFT: POINT ATTRIBUTION & QUICK ACTION BUTTONS */}
          <div className="lg:col-span-7 space-y-4">
            {/* BIG POINT WINNER BUTTONS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* +1 Team A */}
              <button
                type="button"
                onClick={() => handleRecordPoint(match.teamAId)}
                disabled={actionLoading}
                className="p-5 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 hover:from-emerald-500 hover:to-emerald-700 active:scale-98 text-slate-950 font-black shadow-lg shadow-emerald-950/50 border border-emerald-400/30 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <span className="text-xs uppercase tracking-widest text-slate-950/80 font-bold">POINT FOR</span>
                <span className="text-lg font-black text-slate-950 truncate max-w-full">{match.teamA?.name}</span>
                <span className="text-3xl font-black text-slate-950 flex items-center gap-1">
                  <Plus className="w-6 h-6 stroke-[3]" /> 1 POINT
                </span>
              </button>

              {/* +1 Team B */}
              <button
                type="button"
                onClick={() => handleRecordPoint(match.teamBId)}
                disabled={actionLoading}
                className="p-5 rounded-2xl bg-gradient-to-br from-sky-600 to-sky-800 hover:from-sky-500 hover:to-sky-700 active:scale-98 text-slate-950 font-black shadow-lg shadow-sky-950/50 border border-sky-400/30 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <span className="text-xs uppercase tracking-widest text-slate-950/80 font-bold">POINT FOR</span>
                <span className="text-lg font-black text-slate-950 truncate max-w-full">{match.teamB?.name}</span>
                <span className="text-3xl font-black text-slate-950 flex items-center gap-1">
                  <Plus className="w-6 h-6 stroke-[3]" /> 1 POINT
                </span>
              </button>
            </div>

            {/* DETAILED POINT TYPE SELECTOR */}
            <Card className="p-4 bg-slate-900/90 border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" /> Rally End Event / Point Category
                </span>
                <span className="text-[10px] text-slate-400">Selected: {selectedPointType}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {POINT_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setSelectedPointType(opt.type)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      selectedPointType === opt.type
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-base mb-1">{opt.icon}</span>
                    <span className="text-xs font-bold block">{opt.label}</span>
                  </button>
                ))}
              </div>

              {/* Player Attribution (Attacker / Blocker / Server) */}
              <div className="pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Attribute to Player (Optional Kill / Ace / Block)
                  </label>
                  <select
                    value={attributedPlayerId}
                    onChange={(e) => setAttributedPlayerId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs outline-none"
                  >
                    <option value="">No Specific Player Attribution</option>
                    <optgroup label={`${match.teamA?.name} Players`}>
                      {teamAPlayers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.jerseyNumber ? `(#${p.jerseyNumber})` : ''} - {p.role}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label={`${match.teamB?.name} Players`}>
                      {teamBPlayers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.jerseyNumber ? `(#${p.jerseyNumber})` : ''} - {p.role}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div className="flex items-end gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => {
                      setTimeoutTeamId(match.teamAId);
                      setIsTimeoutConfirmOpen(true);
                    }}
                    icon={<Clock className="w-3.5 h-3.5 text-emerald-400" />}
                  >
                    Timeout: {match.teamA?.shortName || 'Team A'}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => {
                      setTimeoutTeamId(match.teamBId);
                      setIsTimeoutConfirmOpen(true);
                    }}
                    icon={<Clock className="w-3.5 h-3.5 text-sky-400" />}
                  >
                    Timeout: {match.teamB?.shortName || 'Team B'}
                  </Button>
                </div>
              </div>
            </Card>

            {/* SUBSTITUTION & ROTATION MANAGEMENT CONTROLS */}
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  setSubTeamId(match.teamAId);
                  setIsSubModalOpen(true);
                }}
                icon={<Users className="w-3.5 h-3.5 text-emerald-400" />}
              >
                Sub Player: {match.teamA?.shortName || 'Team A'} ({scoringState.subsUsedA}/6)
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  setSubTeamId(match.teamBId);
                  setIsSubModalOpen(true);
                }}
                icon={<Users className="w-3.5 h-3.5 text-sky-400" />}
              >
                Sub Player: {match.teamB?.shortName || 'Team B'} ({scoringState.subsUsedB}/6)
              </Button>
            </div>
          </div>

          {/* RIGHT: 6-POSITION ROTATION COURT VISUALIZER */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="p-4 bg-slate-900/90 border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <RotateCw className="w-4 h-4 text-emerald-400" /> Court Rotation System (1-6)
                </span>
                <span className="text-[10px] text-slate-400">Side-out auto-rotates</span>
              </div>

              {/* Team A Court Display */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" /> {match.teamA?.name} (Court)
                  </span>
                  {isTeamAServing && (
                    <span className="text-[10px] text-emerald-300 font-bold bg-emerald-500/20 px-2 py-0.5 rounded">
                      Server: #{courtA?.position1?.jerseyNumber || '1'} {courtA?.position1?.name}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-center">
                  {/* Front Row: Pos 4, Pos 3, Pos 2 */}
                  <div className="p-1.5 rounded-lg bg-slate-950/80 border border-emerald-500/20">
                    <span className="text-[9px] text-slate-400 font-bold block">P4 (LF)</span>
                    <span className="text-xs font-bold text-slate-200 truncate block">{courtA?.position4?.name || 'P4'}</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-950/80 border border-emerald-500/20">
                    <span className="text-[9px] text-slate-400 font-bold block">P3 (MF)</span>
                    <span className="text-xs font-bold text-slate-200 truncate block">{courtA?.position3?.name || 'P3'}</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-950/80 border border-emerald-500/20">
                    <span className="text-[9px] text-slate-400 font-bold block">P2 (RF)</span>
                    <span className="text-xs font-bold text-slate-200 truncate block">{courtA?.position2?.name || 'P2'}</span>
                  </div>

                  {/* Back Row: Pos 5, Pos 6, Pos 1 (Server) */}
                  <div className="p-1.5 rounded-lg bg-slate-950/80 border border-emerald-500/20">
                    <span className="text-[9px] text-slate-400 font-bold block">P5 (LB)</span>
                    <span className="text-xs font-bold text-slate-200 truncate block">{courtA?.position5?.name || 'P5'}</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-950/80 border border-emerald-500/20">
                    <span className="text-[9px] text-slate-400 font-bold block">P6 (MB)</span>
                    <span className="text-xs font-bold text-slate-200 truncate block">{courtA?.position6?.name || 'P6'}</span>
                  </div>
                  <div className={`p-1.5 rounded-lg border ${isTeamAServing ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold' : 'bg-slate-950/80 border-emerald-500/20'}`}>
                    <span className="text-[9px] font-bold block text-amber-400">P1 (Server) 🎯</span>
                    <span className="text-xs font-bold truncate block">{courtA?.position1?.name || 'P1'}</span>
                  </div>
                </div>
              </div>

              {/* NET DIVIDER */}
              <div className="py-1 text-center">
                <div className="h-0.5 bg-slate-700 w-full relative flex items-center justify-center">
                  <span className="bg-slate-900 px-3 text-[10px] text-slate-400 font-black tracking-widest">
                    ════ NET ════
                  </span>
                </div>
              </div>

              {/* Team B Court Display */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-sky-400 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" /> {match.teamB?.name} (Court)
                  </span>
                  {isTeamBServing && (
                    <span className="text-[10px] text-sky-300 font-bold bg-sky-500/20 px-2 py-0.5 rounded">
                      Server: #{courtB?.position1?.jerseyNumber || '1'} {courtB?.position1?.name}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-sky-950/20 border border-sky-500/30 text-center">
                  {/* Front Row */}
                  <div className="p-1.5 rounded-lg bg-slate-950/80 border border-sky-500/20">
                    <span className="text-[9px] text-slate-400 font-bold block">P2 (RF)</span>
                    <span className="text-xs font-bold text-slate-200 truncate block">{courtB?.position2?.name || 'P2'}</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-950/80 border border-sky-500/20">
                    <span className="text-[9px] text-slate-400 font-bold block">P3 (MF)</span>
                    <span className="text-xs font-bold text-slate-200 truncate block">{courtB?.position3?.name || 'P3'}</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-950/80 border border-sky-500/20">
                    <span className="text-[9px] text-slate-400 font-bold block">P4 (LF)</span>
                    <span className="text-xs font-bold text-slate-200 truncate block">{courtB?.position4?.name || 'P4'}</span>
                  </div>

                  {/* Back Row */}
                  <div className={`p-1.5 rounded-lg border ${isTeamBServing ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold' : 'bg-slate-950/80 border-sky-500/20'}`}>
                    <span className="text-[9px] font-bold block text-amber-400">P1 (Server) 🎯</span>
                    <span className="text-xs font-bold truncate block">{courtB?.position1?.name || 'P1'}</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-950/80 border border-sky-500/20">
                    <span className="text-[9px] text-slate-400 font-bold block">P6 (MB)</span>
                    <span className="text-xs font-bold text-slate-200 truncate block">{courtB?.position6?.name || 'P6'}</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-950/80 border border-sky-500/20">
                    <span className="text-[9px] text-slate-400 font-bold block">P5 (LB)</span>
                    <span className="text-xs font-bold text-slate-200 truncate block">{courtB?.position5?.name || 'P5'}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* 3. POINT-BY-POINT RECENT RALLIES FEED */}
      <Card className="p-4 bg-slate-900/90 border-slate-800 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" /> Recent Rallies & Scoring Events (Set {scoringState.currentSetNumber})
          </span>
          <span className="text-[10px] text-slate-400">
            Total Rallies: {scoringState.allRallies.length}
          </span>
        </div>

        {scoringState.allRallies.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">No points scored yet in this match.</p>
        ) : (
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {scoringState.allRallies.slice(0, 15).map((rally) => {
              const isTeamAWinner = rally.pointWinner === match.teamAId;
              return (
                <div
                  key={rally.id}
                  className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px] font-bold flex items-center justify-center">
                      #{rally.rallyNumber}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isTeamAWinner
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                      }`}
                    >
                      {isTeamAWinner ? match.teamA?.shortName || 'Team A' : match.teamB?.shortName || 'Team B'}
                    </span>
                    <span className="text-slate-300 font-medium">{rally.pointType.replace(/_/g, ' ')}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-slate-200">
                      {rally.scoreAfter.teamA} - {rally.scoreAfter.teamB}
                    </span>
                    <span className="text-[10px] text-slate-500">Set {rally.setNumber}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* 4. MODALS & DIALOGS */}

      {/* TIMEOUT CONFIRMATION */}
      {isTimeoutConfirmOpen && (
        <ConfirmDialog
          isOpen={isTimeoutConfirmOpen}
          onClose={() => setIsTimeoutConfirmOpen(false)}
          onConfirm={handleCallTimeout}
          title={`Call Timeout for ${timeoutTeamId === match.teamAId ? match.teamA?.name : match.teamB?.name}`}
          description={`Record official 30-second technical timeout for Set ${scoringState.currentSetNumber}?`}
          confirmText="Yes, Call Timeout"
          loading={actionLoading}
        />
      )}

      {/* SUBSTITUTION MODAL */}
      {isSubModalOpen && (
        <Dialog
          isOpen={isSubModalOpen}
          onClose={() => setIsSubModalOpen(false)}
          title={`Player Substitution: ${subTeamId === match.teamAId ? match.teamA?.name : match.teamB?.name}`}
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              Select the player coming out from court and the bench substitute coming in.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Player OUT (Currently on Court) <span className="text-rose-400">*</span>
                </label>
                <select
                  value={subPlayerOutId}
                  onChange={(e) => setSubPlayerOutId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs outline-none"
                >
                  <option value="">Select Outgoing Player</option>
                  {(subTeamId === match.teamAId ? courtAPlayerIds : courtBPlayerIds).map((pId) => {
                    const player = (subTeamId === match.teamAId ? teamAPlayers : teamBPlayers).find((p) => p.id === pId);
                    if (!player) return null;
                    return (
                      <option key={player.id} value={player.id}>
                        {player.name} {player.jerseyNumber ? `(#${player.jerseyNumber})` : ''} - {player.role}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Player IN (Bench Substitute) <span className="text-emerald-400">*</span>
                </label>
                <select
                  value={subPlayerInId}
                  onChange={(e) => setSubPlayerInId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs outline-none"
                >
                  <option value="">Select Incoming Player</option>
                  {(subTeamId === match.teamAId ? benchAPlayers : benchBPlayers).map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name} {player.jerseyNumber ? `(#${player.jerseyNumber})` : ''} - {player.role}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setIsSubModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubstitution}
                loading={actionLoading}
                icon={<Users className="w-4 h-4" />}
              >
                Confirm Substitution
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* SCORE CORRECTION MODAL */}
      {isScoreCorrectionOpen && (
        <Dialog
          isOpen={isScoreCorrectionOpen}
          onClose={() => setIsScoreCorrectionOpen(false)}
          title={`Correct Score for Set ${scoringState.currentSetNumber}`}
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              Adjust the points score directly if a scorekeeper error occurred during the set.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-emerald-400 mb-1">
                  {match.teamA?.name} Score
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={correctTeamAScore}
                  onChange={(e) => setCorrectTeamAScore(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-emerald-400 text-base font-bold outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-sky-400 mb-1">
                  {match.teamB?.name} Score
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={correctTeamBScore}
                  onChange={(e) => setCorrectTeamBScore(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sky-400 text-base font-bold outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setIsScoreCorrectionOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleScoreCorrection}
                loading={actionLoading}
                icon={<CheckCircle2 className="w-4 h-4" />}
              >
                Save Corrected Score
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};
