import React, { useState, useEffect, useRef } from 'react';
import {
  Match,
  Player,
  BadmintonMatchScoringState,
  BadmintonScoringEvent,
  BadmintonPointType,
  BadmintonShotDetail,
  BadmintonPlayerStats,
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
  Target,
  Sparkles,
} from 'lucide-react';

interface BadmintonScoringConsoleProps {
  match: Match;
  onMatchStatusChange?: () => void;
  onViewReport?: () => void;
}

export const BadmintonScoringConsole: React.FC<BadmintonScoringConsoleProps> = ({
  match,
  onMatchStatusChange,
  onViewReport,
}) => {
  const [state, setState] = useState<BadmintonMatchScoringState | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Active Tab in Scoring Console
  const [activeTab, setActiveTab] = useState<'court' | 'rallies' | 'stats' | 'settings'>('court');

  // Quick Rally Config
  const [selectedWinnerSide, setSelectedWinnerSide] = useState<'TEAM_A' | 'TEAM_B'>('TEAM_A');
  const [selectedWinnerPlayerId, setSelectedWinnerPlayerId] = useState<string>('');
  const [eventType, setEventType] = useState<BadmintonPointType>('SMASH_WINNER');
  const [shotDetail, setShotDetail] = useState<BadmintonShotDetail>({
    stroke: 'SMASH',
    rallyLength: 4,
    shuttleSpeedKmh: undefined,
  });

  // Server selection modal
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [newServerPlayerId, setNewServerPlayerId] = useState<string>('');
  const [newServerTeamId, setNewServerTeamId] = useState<string>(match.teamAId);
  const [newReceiverPlayerId, setNewReceiverPlayerId] = useState<string>('');
  const [newReceiverTeamId, setNewReceiverTeamId] = useState<string>(match.teamBId);

  // Edit Rally Modal
  const [editingRally, setEditingRally] = useState<BadmintonScoringEvent | null>(null);
  const [isEditRallyModalOpen, setIsEditRallyModalOpen] = useState(false);
  const [editWinnerSide, setEditWinnerSide] = useState<'TEAM_A' | 'TEAM_B'>('TEAM_A');
  const [editWinnerPlayerId, setEditWinnerPlayerId] = useState<string>('');
  const [editEventType, setEditEventType] = useState<BadmintonPointType>('RALLY_WON');

  // Banner toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filter for rallies
  const [ralliesFilter, setRalliesFilter] = useState<'ALL' | 'SMASHES' | 'FAULTS' | 'GAME_POINTS'>('ALL');

  // Fetch scoring state
  const fetchScoringState = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.getBadmintonScoringState(match.id);
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
      console.error('Error fetching badminton state:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // SSE real-time listener with exponential backoff and deduplication
  useMatchStream({
    matchId: match.id,
    onMessage: (payload) => {
      if (
        payload.type === 'SCORING_UPDATE' ||
        payload.type === 'BADMINTON_STATE_UPDATE' ||
        payload.type === 'STATE_UPDATE'
      ) {
        if (payload.scoringState) {
          setState(payload.scoringState);
        } else {
          fetchScoringState(true);
        }
      } else if (payload.gamesA !== undefined && payload.currentGame) {
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
    return p ? p.name : id;
  };

  // Handle Recording Rally
  const handleRecordRally = async (winnerSide: 'TEAM_A' | 'TEAM_B') => {
    if (actionLoading) return;
    setActionLoading(true);

    try {
      // Determine appropriate winning player
      let winnerPlayerId = selectedWinnerPlayerId;
      if (!winnerPlayerId || (winnerSide === 'TEAM_A' && !teamAPlayers.some(p => p.id === winnerPlayerId)) || (winnerSide === 'TEAM_B' && !teamBPlayers.some(p => p.id === winnerPlayerId))) {
        const targetSquad = winnerSide === 'TEAM_A' ? teamAPlayers : teamBPlayers;
        if (targetSquad.length > 0) {
          winnerPlayerId = targetSquad[0].id;
        }
      }

      const res = await api.recordBadmintonRally(match.id, {
        winnerSide,
        winnerPlayerId,
        eventType,
        shotDetail,
      });

      if (res && res.state) {
        setState(res.state);
        showToast(`Point awarded to ${winnerSide === 'TEAM_A' ? state?.teamAName || 'Team A' : state?.teamBName || 'Team B'} (+1)`);

        if (res.state.isCompleted) {
          if (onMatchStatusChange) onMatchStatusChange();
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to record rally point.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Undo Last Rally
  const handleUndo = async () => {
    if (actionLoading) return;
    if (!window.confirm('Undo the last recorded rally in this badminton match?')) return;
    setActionLoading(true);
    try {
      const res = await api.undoBadmintonRally(match.id);
      if (res && res.state) {
        setState(res.state);
        showToast('Last rally point undone successfully.');
        if (onMatchStatusChange) onMatchStatusChange();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to undo rally.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Server Update
  const handleSaveServer = async () => {
    if (!newServerPlayerId) {
      alert('Please select a server.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.updateBadmintonServer(match.id, {
        serverPlayerId: newServerPlayerId,
        serverTeamId: newServerTeamId,
        receiverPlayerId: newReceiverPlayerId,
        receiverTeamId: newReceiverTeamId,
      });
      if (res && res.state) {
        setState(res.state);
        setIsServerModalOpen(false);
        showToast('Server configuration updated.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update server.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Edit Event Submit
  const handleSaveEditedRally = async () => {
    if (!editingRally) return;
    setActionLoading(true);
    try {
      const updates = {
        winnerSide: editWinnerSide,
        winnerPlayerId: editWinnerPlayerId,
        winnerTeamId: editWinnerSide === 'TEAM_A' ? match.teamAId : match.teamBId,
        eventType: editEventType,
      };

      const res = await api.editBadmintonEvent(match.id, {
        eventId: editingRally.id,
        updates,
      });

      if (res && res.state) {
        setState(res.state);
        setIsEditRallyModalOpen(false);
        setEditingRally(null);
        showToast('Rally event updated successfully.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update rally.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !state) {
    return (
      <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
        <p className="text-sm font-semibold tracking-wide">Loading Badminton Live Console...</p>
      </div>
    );
  }

  const isDoubles = state?.config?.matchType === 'DOUBLES' || state?.config?.matchType === 'MIXED_DOUBLES';
  const isMatchComplete = state?.isCompleted || false;
  const isInterval = state?.isInterval || false;
  const isGamePoint = state?.isGamePoint || false;
  const isMatchPoint = state?.isMatchPoint || false;
  const isSuddenDeath = state?.isSuddenDeath || false;

  const currentScoreA = state?.currentScoreA ?? 0;
  const currentScoreB = state?.currentScoreB ?? 0;
  const gamesWonA = state?.gamesWonA ?? 0;
  const gamesWonB = state?.gamesWonB ?? 0;
  const currentGame = state?.currentGame ?? 1;

  const activeEvents = (state?.events || []).filter((e) => !e.isUndone);
  const filteredEvents = activeEvents.filter((e) => {
    if (ralliesFilter === 'SMASHES') return e.eventType === 'SMASH_WINNER';
    if (ralliesFilter === 'FAULTS') return e.eventType === 'SERVICE_FAULT' || e.eventType === 'UNFORCED_ERROR';
    if (ralliesFilter === 'GAME_POINTS') return e.gameWon || e.matchWon;
    return true;
  });

  return (
    <div className="bg-slate-950 text-slate-100 flex flex-col min-h-screen">
      {/* TOAST ALERT */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP STATUS BAR */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100 tracking-wide uppercase">
                {match.name || `${state?.teamAName} vs ${state?.teamBName}`}
              </h2>
              <Badge variant={isMatchComplete ? 'outline' : 'success'} className="text-[10px] px-2 py-0.5">
                {isMatchComplete ? 'FINAL' : 'LIVE'}
              </Badge>
              <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-700">
                {isDoubles ? 'DOUBLES' : 'SINGLES'}
              </Badge>
            </div>
            <p className="text-xs text-slate-400">
              {match.venue || 'Center Court'} • {state?.config?.matchFormat?.replace('_', ' ')} • Race to {state?.config?.pointsPerGame || 21} (Cap {state?.config?.capPoints || 30})
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleUndo}
            disabled={actionLoading || activeEvents.length === 0}
            className="border-slate-800 hover:bg-slate-800 text-xs text-slate-300"
          >
            <Undo2 className="w-3.5 h-3.5 mr-1" /> Undo Last
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsServerModalOpen(true)}
            className="border-slate-800 hover:bg-slate-800 text-xs text-emerald-400"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 mr-1" /> Serve & Court
          </Button>

          {onViewReport && (
            <Button
              size="sm"
              variant="outline"
              onClick={onViewReport}
              className="border-slate-800 hover:bg-slate-800 text-xs text-amber-400"
            >
              <FileText className="w-3.5 h-3.5 mr-1" /> Report
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchScoringState(false)}
            className="border-slate-800 hover:bg-slate-800 text-xs text-slate-300"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* MATCH / GAME ALERT BANNERS */}
      {isMatchComplete && (
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900/60 to-slate-950 border-b border-emerald-500/40 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Match Concluded</p>
              <h3 className="text-base font-extrabold text-white">
                🏆 Winner: {state?.winnerPlayerName || (state?.winnerTeamId === match.teamAId ? state?.teamAName : state?.teamBName)}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onViewReport && (
              <Button size="sm" onClick={onViewReport} className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold">
                View Full Match Report
              </Button>
            )}
          </div>
        </div>
      )}

      {isMatchPoint && !isMatchComplete && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center justify-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider animate-pulse">
          <Sparkles className="w-4 h-4 text-amber-400" />
          🔥 MATCH POINT ON THE LINE!
        </div>
      )}

      {isGamePoint && !isMatchPoint && !isMatchComplete && (
        <div className="bg-blue-500/10 border-b border-blue-500/30 px-4 py-2 flex items-center justify-center gap-2 text-xs font-bold text-blue-300 uppercase tracking-wider animate-pulse">
          <Target className="w-4 h-4 text-blue-400" />
          GAME POINT FOR {state?.servingTeam === 'TEAM_A' && currentScoreA > currentScoreB ? state?.teamAName : state?.teamBName}
        </div>
      )}

      {isSuddenDeath && !isMatchComplete && (
        <div className="bg-rose-500/10 border-b border-rose-500/30 px-4 py-2 flex items-center justify-center gap-2 text-xs font-bold text-rose-300 uppercase tracking-wider animate-pulse">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          ⚡ 29-29 GOLDEN POINT! NEXT RALLY WINS THE GAME!
        </div>
      )}

      {isInterval && !isMatchComplete && (
        <div className="bg-purple-500/10 border-b border-purple-500/30 px-4 py-2 flex items-center justify-center gap-2 text-xs font-bold text-purple-300 uppercase tracking-wider">
          <Clock className="w-4 h-4 text-purple-400" />
          ⏸️ 11-POINT INTERVAL BREAK (60 SECONDS)
        </div>
      )}

      {/* MAIN SCOREBOARD HERO SECTION */}
      <div className="p-4 md:p-6 bg-slate-900/50 border-b border-slate-800/80">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          
          {/* TEAM A CARD */}
          <div className={`md:col-span-5 p-4 rounded-2xl border transition-all ${state?.servingTeam === 'TEAM_A' ? 'bg-slate-900/90 border-emerald-500/50 shadow-lg shadow-emerald-500/5' : 'bg-slate-900/40 border-slate-800'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-bold text-xs text-emerald-400">
                  A
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-100">{state?.teamAName || 'Team A'}</h3>
                  <p className="text-xs text-slate-400">
                    {isDoubles 
                      ? `${getPlayerName(state?.teamARightPlayerId)} & ${getPlayerName(state?.teamALeftPlayerId)}`
                      : getPlayerName(teamAPlayers[0]?.id)}
                  </p>
                </div>
              </div>
              {state?.servingTeam === 'TEAM_A' && (
                <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] flex items-center gap-1 font-semibold">
                  <Zap className="w-3 h-3 fill-emerald-400" /> SERVING ({state?.serviceCourt} COURT)
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
              <div className="text-left">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Games</span>
                <p className="text-2xl font-black text-slate-200">{gamesWonA}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">Game {currentGame} Points</span>
                <p className="text-5xl font-black tracking-tight text-white">{currentScoreA}</p>
              </div>
            </div>
          </div>

          {/* VS / GAME TRACKER */}
          <div className="md:col-span-2 flex flex-col items-center justify-center text-center py-2">
            <Badge variant="outline" className="text-xs text-slate-400 border-slate-800 uppercase px-3 py-1 font-semibold mb-2">
              Game {currentGame} of {state?.config?.matchFormat === 'BEST_OF_1' ? 1 : state?.config?.matchFormat === 'BEST_OF_5' ? 5 : 3}
            </Badge>

            {/* Set by set score chips */}
            <div className="flex flex-col gap-1 w-full max-w-[140px]">
              {(state?.gameScores || []).map((gs) => (
                <div
                  key={gs.gameNumber}
                  className={`text-[11px] px-2 py-1 rounded-lg flex justify-between font-mono font-medium ${gs.gameNumber === currentGame ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-950 border border-slate-800 text-slate-400'}`}
                >
                  <span>G{gs.gameNumber}</span>
                  <span className="font-bold">{gs.scoreA} - {gs.scoreB}</span>
                </div>
              ))}
            </div>
          </div>

          {/* TEAM B CARD */}
          <div className={`md:col-span-5 p-4 rounded-2xl border transition-all ${state?.servingTeam === 'TEAM_B' ? 'bg-slate-900/90 border-emerald-500/50 shadow-lg shadow-emerald-500/5' : 'bg-slate-900/40 border-slate-800'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center font-bold text-xs text-blue-400">
                  B
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-100">{state?.teamBName || 'Team B'}</h3>
                  <p className="text-xs text-slate-400">
                    {isDoubles 
                      ? `${getPlayerName(state?.teamBRightPlayerId)} & ${getPlayerName(state?.teamBLeftPlayerId)}`
                      : getPlayerName(teamBPlayers[0]?.id)}
                  </p>
                </div>
              </div>
              {state?.servingTeam === 'TEAM_B' && (
                <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] flex items-center gap-1 font-semibold">
                  <Zap className="w-3 h-3 fill-emerald-400" /> SERVING ({state?.serviceCourt} COURT)
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
              <div className="text-left">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Games</span>
                <p className="text-2xl font-black text-slate-200">{gamesWonB}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-blue-400 uppercase font-bold tracking-wider">Game {currentGame} Points</span>
                <p className="text-5xl font-black tracking-tight text-white">{currentScoreB}</p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* QUICK RALLY SCORING BUTTONS */}
      {!isMatchComplete && (
        <div className="p-4 bg-slate-950 border-b border-slate-800">
          <div className="max-w-5xl mx-auto space-y-4">
            
            {/* BIG ACTION BUTTONS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleRecordRally('TEAM_A')}
                className="p-5 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 active:scale-[0.99] text-white font-extrabold shadow-xl shadow-emerald-950/40 flex items-center justify-between transition-all cursor-pointer border border-emerald-400/30 group"
              >
                <div className="text-left">
                  <span className="text-xs uppercase tracking-widest text-emerald-200 block font-semibold">Point to</span>
                  <span className="text-2xl font-black text-white">{state?.teamAName || 'Team A'}</span>
                  <span className="text-xs text-emerald-100/80 block mt-0.5">
                    Current: {currentScoreA} ➔ Next: <strong className="text-white">{currentScoreA + 1}</strong>
                  </span>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-3xl font-black group-hover:scale-110 transition-transform">
                  +1
                </div>
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleRecordRally('TEAM_B')}
                className="p-5 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 active:scale-[0.99] text-white font-extrabold shadow-xl shadow-blue-950/40 flex items-center justify-between transition-all cursor-pointer border border-blue-400/30 group"
              >
                <div className="text-left">
                  <span className="text-xs uppercase tracking-widest text-blue-200 block font-semibold">Point to</span>
                  <span className="text-2xl font-black text-white">{state?.teamBName || 'Team B'}</span>
                  <span className="text-xs text-blue-100/80 block mt-0.5">
                    Current: {currentScoreB} ➔ Next: <strong className="text-white">{currentScoreB + 1}</strong>
                  </span>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-3xl font-black group-hover:scale-110 transition-transform">
                  +1
                </div>
              </button>
            </div>

            {/* RALLY OUTCOME & SHOT TYPE SELECTOR */}
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-400 font-bold uppercase tracking-wider">Point Outcome:</span>
                {(['SMASH_WINNER', 'DROP_SHOT', 'NET_KILL', 'CLEAR', 'DRIVE', 'SERVICE_FAULT', 'UNFORCED_ERROR', 'OUT_OF_BOUNDS'] as BadmintonPointType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setEventType(type)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${eventType === type ? 'bg-emerald-500 text-slate-950 font-bold shadow' : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'}`}
                  >
                    {type.replace('_', ' ')}
                  </button>
                ))}
              </div>

              {/* Rally length controller */}
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">Shots in Rally:</span>
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setShotDetail((prev) => ({ ...prev, rallyLength: Math.max(1, (prev.rallyLength || 1) - 1) }))}
                    className="px-2 py-1 text-slate-400 hover:text-white"
                  >
                    -
                  </button>
                  <span className="px-2 font-mono font-bold text-slate-200">{shotDetail.rallyLength || 1}</span>
                  <button
                    type="button"
                    onClick={() => setShotDetail((prev) => ({ ...prev, rallyLength: (prev.rallyLength || 1) + 1 }))}
                    className="px-2 py-1 text-slate-400 hover:text-white"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* CONSOLE NAVIGATION TABS */}
      <div className="bg-slate-900 border-b border-slate-800 px-4">
        <div className="max-w-5xl mx-auto flex items-center gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('court')}
            className={`py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${activeTab === 'court' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            🏸 Court & Service State
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rallies')}
            className={`py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${activeTab === 'rallies' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            📜 Rally Feed & Undo ({activeEvents.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('stats')}
            className={`py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${activeTab === 'stats' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            📊 Match Statistics
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${activeTab === 'settings' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            ⚙️ Match Rules & Info
          </button>
        </div>
      </div>

      {/* TAB CONTENT 1: COURT & SERVICE POSITIONING */}
      {activeTab === 'court' && (
        <div className="p-4 md:p-6 flex-1 max-w-5xl mx-auto w-full space-y-6">
          
          {/* COURT DIAGRAM */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Badminton Court Positions</h3>
                <p className="text-xs text-slate-400">
                  Active Service Court: <strong className="text-emerald-400">{state?.serviceCourt} Court</strong> (Score is {state?.servingTeam === 'TEAM_A' ? currentScoreA : currentScoreB} - { (state?.servingTeam === 'TEAM_A' ? currentScoreA : currentScoreB) % 2 === 0 ? 'Even' : 'Odd'})
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsServerModalOpen(true)}
                className="text-xs border-slate-700 hover:bg-slate-800 text-emerald-400"
              >
                Change Initial Server / Receiver
              </Button>
            </div>

            {/* Visual Badminton Court layout */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-emerald-950/20 border-2 border-emerald-500/30 relative">
              {/* Center Net Line */}
              <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1 bg-white/40 z-10 flex items-center justify-center">
                <span className="bg-slate-950 text-[10px] font-bold text-slate-300 px-1 py-0.5 rounded border border-white/20">
                  NET
                </span>
              </div>

              {/* TEAM A SIDE */}
              <div className="p-4 rounded-lg bg-slate-950/80 border border-emerald-500/20 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-emerald-400">{state?.teamAName} (Left Side)</span>
                  <span className="text-xs font-mono font-bold text-slate-300">Score: {currentScoreA}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* Left Court (Odd) */}
                  <div className={`p-3 rounded-lg border text-center ${state?.servingTeam === 'TEAM_A' && state?.serviceCourt === 'LEFT' ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-bold' : 'bg-slate-900 border-slate-800 text-slate-300'}`}>
                    <span className="text-[10px] text-slate-500 block uppercase font-mono">Left Court (Odd)</span>
                    <p className="font-bold text-sm mt-1">{getPlayerName(state?.teamALeftPlayerId) || 'Player A2'}</p>
                    {state?.servingTeam === 'TEAM_A' && state?.serviceCourt === 'LEFT' && (
                      <span className="text-[10px] text-emerald-400 font-bold mt-1 inline-block">🏸 SERVING</span>
                    )}
                  </div>

                  {/* Right Court (Even) */}
                  <div className={`p-3 rounded-lg border text-center ${state?.servingTeam === 'TEAM_A' && state?.serviceCourt === 'RIGHT' ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-bold' : 'bg-slate-900 border-slate-800 text-slate-300'}`}>
                    <span className="text-[10px] text-slate-500 block uppercase font-mono">Right Court (Even)</span>
                    <p className="font-bold text-sm mt-1">{getPlayerName(state?.teamARightPlayerId) || 'Player A1'}</p>
                    {state?.servingTeam === 'TEAM_A' && state?.serviceCourt === 'RIGHT' && (
                      <span className="text-[10px] text-emerald-400 font-bold mt-1 inline-block">🏸 SERVING</span>
                    )}
                  </div>
                </div>
              </div>

              {/* TEAM B SIDE */}
              <div className="p-4 rounded-lg bg-slate-950/80 border border-blue-500/20 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-blue-400">{state?.teamBName} (Right Side)</span>
                  <span className="text-xs font-mono font-bold text-slate-300">Score: {currentScoreB}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* Right Court (Even) */}
                  <div className={`p-3 rounded-lg border text-center ${state?.servingTeam === 'TEAM_B' && state?.serviceCourt === 'RIGHT' ? 'bg-blue-500/20 border-blue-400 text-blue-200 font-bold' : 'bg-slate-900 border-slate-800 text-slate-300'}`}>
                    <span className="text-[10px] text-slate-500 block uppercase font-mono">Right Court (Even)</span>
                    <p className="font-bold text-sm mt-1">{getPlayerName(state?.teamBRightPlayerId) || 'Player B1'}</p>
                    {state?.servingTeam === 'TEAM_B' && state?.serviceCourt === 'RIGHT' && (
                      <span className="text-[10px] text-blue-400 font-bold mt-1 inline-block">🏸 SERVING</span>
                    )}
                  </div>

                  {/* Left Court (Odd) */}
                  <div className={`p-3 rounded-lg border text-center ${state?.servingTeam === 'TEAM_B' && state?.serviceCourt === 'LEFT' ? 'bg-blue-500/20 border-blue-400 text-blue-200 font-bold' : 'bg-slate-900 border-slate-800 text-slate-300'}`}>
                    <span className="text-[10px] text-slate-500 block uppercase font-mono">Left Court (Odd)</span>
                    <p className="font-bold text-sm mt-1">{getPlayerName(state?.teamBLeftPlayerId) || 'Player B2'}</p>
                    {state?.servingTeam === 'TEAM_B' && state?.serviceCourt === 'LEFT' && (
                      <span className="text-[10px] text-blue-400 font-bold mt-1 inline-block">🏸 SERVING</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>BWF Rule:</strong> When the serving side wins a rally, the server swaps service courts and serves to the alternate receiver. When the receiving side wins a rally, they become the new serving side without swapping their existing court positions.
              </span>
            </div>
          </div>

        </div>
      )}

      {/* TAB CONTENT 2: RALLIES FEED & UNDO */}
      {activeTab === 'rallies' && (
        <div className="p-4 md:p-6 flex-1 max-w-5xl mx-auto w-full space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Rally History Feed ({activeEvents.length} Points Recorded)
            </h3>

            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 text-xs">
              {(['ALL', 'SMASHES', 'FAULTS', 'GAME_POINTS'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setRalliesFilter(filter)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${ralliesFilter === filter ? 'bg-slate-700 text-white' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'}`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="p-12 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
              No rallies recorded yet. Use the scoring buttons above to begin live scoring.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEvents
                .slice()
                .reverse()
                .map((event) => (
                  <div
                    key={event.id}
                    className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80 flex items-center justify-between hover:border-slate-700 transition-all text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center font-mono font-bold text-slate-300">
                        #{event.rallyNumber}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-100">
                            Point to {event.winnerSide === 'TEAM_A' ? state?.teamAName : state?.teamBName}
                          </span>
                          <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300">
                            {event.eventType.replace('_', ' ')}
                          </Badge>
                          {event.gameWon && (
                            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px]">
                              🏆 GAME {event.gameNumber} WON
                            </Badge>
                          )}
                          {event.matchWon && (
                            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px]">
                              🥇 MATCH WON
                            </Badge>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Game {event.gameNumber} • Score: <strong className="text-slate-200">{event.scoreAfter.scoreA} - {event.scoreAfter.scoreB}</strong> • Server: {event.serverPlayerName || 'Server'} • Court: {event.serviceCourt}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingRally(event);
                          setEditWinnerSide(event.winnerSide);
                          setEditWinnerPlayerId(event.winnerPlayerId || '');
                          setEditEventType((event.eventType as BadmintonPointType) || 'SMASH_WINNER');
                          setIsEditRallyModalOpen(true);
                        }}
                        className="text-xs text-slate-400 hover:text-white border-slate-800"
                      >
                        <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 3: MATCH STATISTICS */}
      {activeTab === 'stats' && (
        <div className="p-4 md:p-6 flex-1 max-w-5xl mx-auto w-full space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* TEAM A STATS */}
            <Card className="p-5 bg-slate-900/80 border-slate-800 space-y-4">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider border-b border-slate-800 pb-2">
                {state?.teamAName} Statistics
              </h4>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Total Points Won:</span>
                  <span className="font-bold text-slate-200">{state?.teamAStats?.totalPointsWon || 0}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Smash Winners:</span>
                  <span className="font-bold text-slate-200">{state?.teamAStats?.smashWinners || 0}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Net Kills & Drop Winners:</span>
                  <span className="font-bold text-slate-200">{(state?.teamAStats?.netKills || 0) + (state?.teamAStats?.dropShotWinners || 0)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Consecutive Points Streak:</span>
                  <span className="font-bold text-slate-200">{state?.teamAStats?.consecutivePointsStreak || 0}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Unforced Errors:</span>
                  <span className="font-bold text-slate-200">{state?.teamAStats?.unforcedErrors || 0}</span>
                </div>
              </div>
            </Card>

            {/* TEAM B STATS */}
            <Card className="p-5 bg-slate-900/80 border-slate-800 space-y-4">
              <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider border-b border-slate-800 pb-2">
                {state?.teamBName} Statistics
              </h4>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Total Points Won:</span>
                  <span className="font-bold text-slate-200">{state?.teamBStats?.totalPointsWon || 0}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Smash Winners:</span>
                  <span className="font-bold text-slate-200">{state?.teamBStats?.smashWinners || 0}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Net Kills & Drop Winners:</span>
                  <span className="font-bold text-slate-200">{(state?.teamBStats?.netKills || 0) + (state?.teamBStats?.dropShotWinners || 0)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Consecutive Points Streak:</span>
                  <span className="font-bold text-slate-200">{state?.teamBStats?.consecutivePointsStreak || 0}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Unforced Errors:</span>
                  <span className="font-bold text-slate-200">{state?.teamBStats?.unforcedErrors || 0}</span>
                </div>
              </div>
            </Card>

          </div>
        </div>
      )}

      {/* TAB CONTENT 4: MATCH SETTINGS & RULES */}
      {activeTab === 'settings' && (
        <div className="p-4 md:p-6 flex-1 max-w-5xl mx-auto w-full space-y-4">
          <Card className="p-5 bg-slate-900/80 border-slate-800 space-y-3 text-xs">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider border-b border-slate-800 pb-2">
              Badminton Match Specifications
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-slate-300">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Format</span>
                <p className="font-bold text-slate-200 text-sm mt-0.5">{state?.config?.matchFormat?.replace('_', ' ')}</p>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Discipline</span>
                <p className="font-bold text-slate-200 text-sm mt-0.5">{state?.config?.matchType}</p>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Points per Game</span>
                <p className="font-bold text-slate-200 text-sm mt-0.5">{state?.config?.pointsPerGame || 21} Points (Cap {state?.config?.capPoints || 30})</p>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Mid-Game Interval</span>
                <p className="font-bold text-slate-200 text-sm mt-0.5">{state?.config?.intervalPoints || 11} Points</p>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Court / Hall</span>
                <p className="font-bold text-slate-200 text-sm mt-0.5">{state?.config?.courtName || 'Court 1'}</p>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Total Rallies Played</span>
                <p className="font-bold text-slate-200 text-sm mt-0.5">{activeEvents.length} Rallies</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* SERVER / RECEIVER ASSIGNMENT MODAL */}
      <Dialog
        isOpen={isServerModalOpen}
        onClose={() => setIsServerModalOpen(false)}
        title="ASSIGN SERVER & RECEIVER"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 font-medium mb-1">Serving Team</label>
            <select
              value={newServerTeamId}
              onChange={(e) => {
                const sTeamId = e.target.value;
                setNewServerTeamId(sTeamId);
                const rTeamId = sTeamId === match.teamAId ? match.teamBId : match.teamAId;
                setNewReceiverTeamId(rTeamId);
              }}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
            >
              <option value={match.teamAId}>{state?.teamAName || 'Team A'}</option>
              <option value={match.teamBId}>{state?.teamBName || 'Team B'}</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Serving Player</label>
            <select
              value={newServerPlayerId}
              onChange={(e) => setNewServerPlayerId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
            >
              <option value="">Select Serving Player</option>
              {(newServerTeamId === match.teamAId ? teamAPlayers : teamBPlayers).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Receiving Player</label>
            <select
              value={newReceiverPlayerId}
              onChange={(e) => setNewReceiverPlayerId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
            >
              <option value="">Select Receiving Player</option>
              {(newReceiverTeamId === match.teamAId ? teamAPlayers : teamBPlayers).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button variant="outline" size="sm" onClick={() => setIsServerModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveServer} disabled={actionLoading}>
              Save Server Setup
            </Button>
          </div>
        </div>
      </Dialog>

      {/* EDIT RALLY MODAL */}
      <Dialog
        isOpen={isEditRallyModalOpen}
        onClose={() => setIsEditRallyModalOpen(false)}
        title={`EDIT RALLY #${editingRally?.rallyNumber}`}
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 font-medium mb-1">Rally Winner Side</label>
            <select
              value={editWinnerSide}
              onChange={(e) => setEditWinnerSide(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
            >
              <option value="TEAM_A">{state?.teamAName || 'Team A'}</option>
              <option value="TEAM_B">{state?.teamBName || 'Team B'}</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Point Outcome / Event</label>
            <select
              value={editEventType}
              onChange={(e) => setEditEventType(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
            >
              <option value="SMASH_WINNER">Smash Winner</option>
              <option value="DROP_SHOT">Drop Shot</option>
              <option value="NET_KILL">Net Kill</option>
              <option value="CLEAR">Clear</option>
              <option value="DRIVE">Drive</option>
              <option value="SERVICE_FAULT">Service Fault</option>
              <option value="UNFORCED_ERROR">Unforced Error</option>
              <option value="OUT_OF_BOUNDS">Out of Bounds</option>
              <option value="RALLY_WON">Rally Won</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button variant="outline" size="sm" onClick={() => setIsEditRallyModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveEditedRally} disabled={actionLoading}>
              Save Rally Edit
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
