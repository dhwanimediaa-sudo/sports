import React, { useState, useEffect, useRef } from 'react';
import {
  Match,
  Player,
  TableTennisMatchScoringState,
  TableTennisScoringEvent,
  TableTennisPointType,
  TableTennisShotDetail,
  TableTennisPlayerStats,
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
  Timer,
  Play,
  Pause,
  Layers,
} from 'lucide-react';

interface TableTennisScoringConsoleProps {
  match: Match;
  onMatchStatusChange?: () => void;
  onViewReport?: () => void;
}

export const TableTennisScoringConsole: React.FC<TableTennisScoringConsoleProps> = ({
  match,
  onMatchStatusChange,
  onViewReport,
}) => {
  const [state, setState] = useState<TableTennisMatchScoringState | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Active Tab in Scoring Console
  const [activeTab, setActiveTab] = useState<'table' | 'points' | 'stats' | 'rules'>('table');

  // Quick Point Config
  const [selectedWinnerSide, setSelectedWinnerSide] = useState<'TEAM_A' | 'TEAM_B'>('TEAM_A');
  const [selectedWinnerPlayerId, setSelectedWinnerPlayerId] = useState<string>('');
  const [eventType, setEventType] = useState<TableTennisPointType>('FOREHAND_WINNER');
  const [shotDetail, setShotDetail] = useState<TableTennisShotDetail>({
    stroke: 'FOREHAND_TOPSPIN',
    rallyLength: 4,
    placement: 'CROSS_COURT',
  });

  // Server selection modal
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [newServerPlayerId, setNewServerPlayerId] = useState<string>('');
  const [newServerTeamId, setNewServerTeamId] = useState<string>(match.teamAId);
  const [newReceiverPlayerId, setNewReceiverPlayerId] = useState<string>('');
  const [newReceiverTeamId, setNewReceiverTeamId] = useState<string>(match.teamBId);

  // Edit Point Modal
  const [editingPoint, setEditingPoint] = useState<TableTennisScoringEvent | null>(null);
  const [isEditPointModalOpen, setIsEditPointModalOpen] = useState(false);
  const [editWinnerSide, setEditWinnerSide] = useState<'TEAM_A' | 'TEAM_B'>('TEAM_A');
  const [editWinnerPlayerId, setEditWinnerPlayerId] = useState<string>('');
  const [editEventType, setEditEventType] = useState<TableTennisPointType>('POINT_WON');

  // Timeout Countdown Timer
  const [activeTimeoutSide, setActiveTimeoutSide] = useState<'TEAM_A' | 'TEAM_B' | null>(null);
  const [timeoutSecondsLeft, setTimeoutSecondsLeft] = useState<number>(60);
  const timeoutTimerRef = useRef<any>(null);

  // Banner toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filter for points log
  const [pointsFilter, setPointsFilter] = useState<'ALL' | 'WINNERS' | 'ERRORS' | 'SERVICE' | 'GAME_POINTS'>('ALL');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch scoring state
  const fetchScoringState = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.getTableTennisScoringState(match.id);
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
      console.error('Error fetching table tennis state:', err);
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
        payload.type === 'TABLE_TENNIS_STATE_UPDATE' ||
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

    return () => {
      if (timeoutTimerRef.current) clearInterval(timeoutTimerRef.current);
    };
  }, [match.id]);

  // Start / Resume scoring
  const handleStartScoring = async () => {
    setActionLoading(true);
    try {
      const res = await api.startTableTennisScoring(match.id, {
        serverTeamId: match.teamAId,
        serverPlayerId: match.teamASquad?.playingIds?.[0],
        receiverTeamId: match.teamBId,
        receiverPlayerId: match.teamBSquad?.playingIds?.[0],
      });
      if (res.state) setState(res.state);
      showToast('Live scoring engine initialized!');
      if (onMatchStatusChange) onMatchStatusChange();
    } catch (err: any) {
      showToast(`Failed to start: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Record a point
  const handleRecordPoint = async (
    winnerSide: 'TEAM_A' | 'TEAM_B',
    customType?: TableTennisPointType,
    customPlayerId?: string
  ) => {
    if (!state || state.isMatchOver) return;

    setActionLoading(true);
    const winnerTeamId = winnerSide === 'TEAM_A' ? match.teamAId : match.teamBId;
    const winnerPlayerId =
      customPlayerId ||
      (winnerSide === 'TEAM_A'
        ? state.teamAPlayers[0]?.id || ''
        : state.teamBPlayers[0]?.id || '');

    const type = customType || eventType;

    try {
      const res = await api.recordTableTennisPoint(match.id, {
        winnerTeamId,
        winnerPlayerId,
        type,
        shotDetail,
      });

      if (res.state) {
        setState(res.state);
        showToast(
          `Point awarded to ${winnerSide === 'TEAM_A' ? match.teamA?.name : match.teamB?.name} (${type.replace(/_/g, ' ')})`
        );
      }
    } catch (err: any) {
      showToast(`Error recording point: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Undo last point
  const handleUndo = async () => {
    if (!state || !state.events || state.events.length === 0) return;
    if (!window.confirm('Undo the last recorded point in this table tennis match?')) return;
    setActionLoading(true);
    try {
      const res = await api.undoTableTennisPoint(match.id);
      if (res.state) {
        setState(res.state);
        showToast('Last point undone successfully.');
      }
    } catch (err: any) {
      showToast(`Undo failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Edit point
  const handleSaveEditPoint = async () => {
    if (!editingPoint) return;
    setActionLoading(true);
    try {
      const winnerTeamId = editWinnerSide === 'TEAM_A' ? match.teamAId : match.teamBId;
      const res = await api.editTableTennisEvent(match.id, {
        eventId: editingPoint.id,
        updates: {
          winnerTeamId,
          winnerPlayerId: editWinnerPlayerId,
          type: editEventType,
        },
      });
      if (res.state) {
        setState(res.state);
        showToast('Point event updated successfully.');
      }
      setIsEditPointModalOpen(false);
      setEditingPoint(null);
    } catch (err: any) {
      showToast(`Edit failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Change Server / Receiver
  const handleSaveServer = async () => {
    setActionLoading(true);
    try {
      const res = await api.updateTableTennisServer(match.id, {
        serverPlayerId: newServerPlayerId || undefined,
        serverTeamId: newServerTeamId || undefined,
        receiverPlayerId: newReceiverPlayerId || undefined,
        receiverTeamId: newReceiverTeamId || undefined,
      });
      if (res.state) {
        setState(res.state);
        showToast('Server and receiver updated.');
      }
      setIsServerModalOpen(false);
    } catch (err: any) {
      showToast(`Update server failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Call 60s Timeout
  const handleCallTimeout = async (teamSide: 'TEAM_A' | 'TEAM_B') => {
    if (!state || state.isMatchOver) return;
    const teamId = teamSide === 'TEAM_A' ? match.teamAId : match.teamBId;

    setActionLoading(true);
    try {
      const res = await api.recordTableTennisTimeout(match.id, { teamId });
      if (res.state) {
        setState(res.state);
        setActiveTimeoutSide(teamSide);
        setTimeoutSecondsLeft(60);

        if (timeoutTimerRef.current) clearInterval(timeoutTimerRef.current);
        timeoutTimerRef.current = setInterval(() => {
          setTimeoutSecondsLeft((prev) => {
            if (prev <= 1) {
              clearInterval(timeoutTimerRef.current);
              setActiveTimeoutSide(null);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        showToast(
          `Timeout called for ${teamSide === 'TEAM_A' ? match.teamA?.name : match.teamB?.name} (60 seconds)`
        );
      }
    } catch (err: any) {
      showToast(`Timeout error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Change Ends
  const handleEndChange = async () => {
    setActionLoading(true);
    try {
      const res = await api.recordTableTennisEndChange(match.id);
      if (res.state) {
        setState(res.state);
        showToast('Table ends switched.');
      }
    } catch (err: any) {
      showToast(`End change error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const copyBroadcastUrl = () => {
    const url = `${window.location.origin}/broadcast/match/${match.id}`;
    navigator.clipboard.writeText(url);
    showToast('Broadcast overlay URL copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 bg-slate-950 text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-emerald-400 mr-3" />
        <span>Loading Table Tennis Live Scoring Engine...</span>
      </div>
    );
  }

  // Find active players and server info
  const isMatchLive = match.status === 'LIVE';
  const isMatchFinished = match.status === 'COMPLETED' || (state && state.isMatchOver);

  const teamAName = match.teamA?.name || 'Team A';
  const teamBName = match.teamB?.name || 'Team B';

  const teamAGamesWon = state?.gamesWonA || 0;
  const teamBGamesWon = state?.gamesWonB || 0;

  const currentPointsA = state?.currentGame?.teamAPoints || 0;
  const currentPointsB = state?.currentGame?.teamBPoints || 0;

  const currentGameNumber = state?.currentGameNumber || 1;
  const totalGamesConfig = state?.config?.format || 'BEST_OF_3';

  // Server identification
  const currentServerTeamId = state?.currentServerTeamId;
  const currentServerPlayerId = state?.currentServerPlayerId;
  const isTeamAServing = currentServerTeamId === match.teamAId;

  const currentServerPlayer = isTeamAServing
    ? state?.teamAPlayers?.find((p) => p.id === currentServerPlayerId)
    : state?.teamBPlayers?.find((p) => p.id === currentServerPlayerId);

  const currentReceiverPlayer = !isTeamAServing
    ? state?.teamBPlayers?.find((p) => p.id === state?.currentReceiverPlayerId)
    : state?.teamAPlayers?.find((p) => p.id === state?.currentReceiverPlayerId);

  const servesRemainingForCurrentServer = state?.servesRemainingInCycle ?? 2;

  // Filtered Points Log
  const events = state?.events || [];
  const filteredEvents = events.filter((ev) => {
    if (pointsFilter === 'WINNERS') return ev.type.includes('WINNER') || ev.type.includes('ACE');
    if (pointsFilter === 'ERRORS') return ev.type.includes('ERROR') || ev.type.includes('FAULT');
    if (pointsFilter === 'SERVICE') return ev.type.includes('SERVICE') || ev.type.includes('ACE');
    if (pointsFilter === 'GAME_POINTS') return ev.isGamePoint || ev.isMatchPoint;
    return true;
  });

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen flex flex-col">
      {/* TOAST BANNER */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500 text-slate-950 font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-sm border border-emerald-400">
          <Sparkles className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP STATUS BAR & HEADER */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 font-bold">
            🏓
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-white">{match.name}</h1>
              <Badge
                variant={isMatchFinished ? 'slate' : isMatchLive ? 'emerald' : 'amber'}
                className="text-[10px] font-bold uppercase tracking-wider"
              >
                {state?.matchStatus || match.status}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <span>{match.tableTennisConfig?.tableNumber || 'Table 1'}</span>
              <span>•</span>
              <span>{match.tableTennisConfig?.format?.replace('_', ' ') || 'Best of 3'}</span>
              <span>•</span>
              <span>11 Points ITTF Standard</span>
              <span>•</span>
              <span>{match.tableTennisConfig?.matchType || 'SINGLES'}</span>
            </p>
          </div>
        </div>

        {/* Action buttons header */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={copyBroadcastUrl}
            className="border-slate-700 text-slate-300 hover:text-white"
            icon={<Tv className="w-3.5 h-3.5 text-cyan-400" />}
          >
            Universal Broadcast URL
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/broadcast/match/${match.id}`, '_blank')}
            className="border-slate-700 text-slate-300 hover:text-white"
            icon={<Tv className="w-3.5 h-3.5" />}
          >
            Launch Overlay
          </Button>

          {onViewReport && (
            <Button
              variant="outline"
              size="sm"
              onClick={onViewReport}
              className="border-slate-700 text-slate-300 hover:text-white"
              icon={<FileText className="w-3.5 h-3.5 text-amber-400" />}
            >
              Full Match Report
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchScoringState(false)}
            disabled={actionLoading}
            className="border-slate-700 text-slate-300 hover:text-white"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />}
          >
            Sync
          </Button>
        </div>
      </div>

      {/* TIMEOUT NOTIFICATION BAR */}
      {activeTimeoutSide && (
        <div className="bg-amber-500/20 border-b border-amber-500/40 px-6 py-2.5 flex items-center justify-between text-amber-300 text-xs font-bold animate-pulse">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-amber-400" />
            <span>
              60-SECOND OFFICIAL TIMEOUT IN PROGRESS ({activeTimeoutSide === 'TEAM_A' ? teamAName : teamBName})
            </span>
          </div>
          <div className="text-sm font-black bg-amber-500/30 px-3 py-0.5 rounded-full border border-amber-400/40">
            00:{timeoutSecondsLeft < 10 ? `0${timeoutSecondsLeft}` : timeoutSecondsLeft}
          </div>
        </div>
      )}

      {/* DECIDING GAME END CHANGE ALERT */}
      {state?.isDecidingGame && state?.currentGame?.isEndChanged && (
        <div className="bg-cyan-500/10 border-b border-cyan-500/30 px-6 py-2 flex items-center justify-center text-cyan-300 text-xs font-semibold gap-2">
          <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
          <span>Deciding Game 5-Point End Change completed. Sides switched.</span>
        </div>
      )}

      {/* WINNER BANNER */}
      {isMatchFinished && state?.winnerTeamId && (
        <div className="bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-amber-500/20 border-b border-amber-500/40 p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-amber-400 font-black text-lg">
            <Trophy className="w-6 h-6 text-amber-400 animate-bounce" />
            <span>MATCH COMPLETED: {state.winnerTeamId === match.teamAId ? teamAName : teamBName} WINS!</span>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Final Game Score: {teamAGamesWon} - {teamBGamesWon} (
            {state.completedGames.map((g, i) => `G${g.gameNumber}: ${g.teamAPoints}-${g.teamBPoints}`).join(', ')}
            )
          </p>
        </div>
      )}

      {/* MAIN CONSOLE TABS */}
      <div className="border-b border-slate-800 bg-slate-900/40 px-6 flex items-center gap-2">
        <button
          onClick={() => setActiveTab('table')}
          className={`px-4 py-3 text-xs font-bold tracking-wider uppercase border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'table'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" /> Live Table & Scoring
        </button>

        <button
          onClick={() => setActiveTab('points')}
          className={`px-4 py-3 text-xs font-bold tracking-wider uppercase border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'points'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-4 h-4" /> Point-by-Point Log ({events.length})
        </button>

        <button
          onClick={() => setActiveTab('stats')}
          className={`px-4 py-3 text-xs font-bold tracking-wider uppercase border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'stats'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Target className="w-4 h-4" /> Match & Player Stats
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-3 text-xs font-bold tracking-wider uppercase border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'rules'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Shield className="w-4 h-4" /> Regulations & Settings
        </button>
      </div>

      {/* TAB CONTENT: LIVE TABLE & SCORING */}
      {activeTab === 'table' && (
        <div className="p-6 flex-1 max-w-7xl mx-auto w-full space-y-6">
          {/* MAIN SCOREBOARD HERO */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* TEAM A CARD */}
            <div
              className={`lg:col-span-5 rounded-2xl p-6 transition-all border ${
                isTeamAServing
                  ? 'bg-slate-900/90 border-orange-500/50 shadow-lg shadow-orange-500/5'
                  : 'bg-slate-900/50 border-slate-800'
              } flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-emerald-400" />
                    <h2 className="text-xl font-black text-white">{teamAName}</h2>
                  </div>
                  {isTeamAServing && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center gap-1">
                      <Zap className="w-3 h-3 fill-orange-400" /> SERVING ({servesRemainingForCurrentServer} LEFT)
                    </span>
                  )}
                </div>

                {/* Player squad display */}
                <div className="text-xs text-slate-400 space-y-1 mb-4">
                  {state?.teamAPlayers?.map((p) => (
                    <div key={p.id} className="flex items-center gap-1.5">
                      <span className="text-slate-300 font-medium">{p.name}</span>
                      {p.id === currentServerPlayerId && isTeamAServing && (
                        <span className="text-[10px] text-orange-400 font-bold">(Server)</span>
                      )}
                      {p.id === state?.currentReceiverPlayerId && !isTeamAServing && (
                        <span className="text-[10px] text-cyan-400 font-bold">(Receiver)</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-end justify-between border-t border-slate-800/80 pt-4">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Games Won</span>
                  <div className="text-3xl font-black text-emerald-400">{teamAGamesWon}</div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Current Game Points</span>
                  <div className="text-7xl font-black text-white tracking-tighter">{currentPointsA}</div>
                </div>
              </div>

              {/* Point Button A */}
              <div className="mt-6">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => handleRecordPoint('TEAM_A')}
                  disabled={actionLoading || isMatchFinished}
                  className="w-full h-16 text-lg font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-950/40"
                  icon={<Plus className="w-6 h-6" />}
                >
                  +1 POINT ({teamAName.split(' ')[0]})
                </Button>
              </div>
            </div>

            {/* CENTER GAME INFO / TABLE PING-PONG DIAGRAM */}
            <div className="lg:col-span-2 flex flex-col justify-between rounded-2xl bg-slate-900/60 border border-slate-800 p-4 text-center space-y-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">GAME {currentGameNumber}</span>
                <div className="text-xs text-slate-300 mt-1 font-bold">
                  {state?.isDeuce ? (
                    <span className="text-amber-400 font-black animate-pulse">DEUCE (1-Pt Serve)</span>
                  ) : state?.isMatchPoint ? (
                    <span className="text-rose-400 font-black animate-pulse">MATCH POINT</span>
                  ) : state?.isGamePoint ? (
                    <span className="text-amber-400 font-black animate-pulse">GAME POINT</span>
                  ) : (
                    <span>Race to 11 (By 2)</span>
                  )}
                </div>
              </div>

              {/* Ping Pong Table Mini Graphic */}
              <div className="relative w-full h-32 bg-blue-900/40 border-2 border-blue-400/40 rounded-lg flex items-center justify-center overflow-hidden my-2">
                {/* Center Net */}
                <div className="absolute inset-y-0 left-1/2 w-1 bg-white/70 shadow-sm transform -translate-x-1/2" />
                {/* White Table Border Lines */}
                <div className="absolute inset-x-0 top-1/2 h-[1px] bg-white/20" />

                {/* Left Side (Team A) */}
                <div className="w-1/2 h-full flex flex-col items-center justify-center p-1">
                  <span className="text-[10px] font-black text-slate-200 truncate">{teamAName.split(' ')[0]}</span>
                  {isTeamAServing && <Zap className="w-4 h-4 text-orange-400 fill-orange-400 mt-1 animate-bounce" />}
                </div>

                {/* Right Side (Team B) */}
                <div className="w-1/2 h-full flex flex-col items-center justify-center p-1">
                  <span className="text-[10px] font-black text-slate-200 truncate">{teamBName.split(' ')[0]}</span>
                  {!isTeamAServing && <Zap className="w-4 h-4 text-orange-400 fill-orange-400 mt-1 animate-bounce" />}
                </div>
              </div>

              {/* Completed Games History Strip */}
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase">Games Score</span>
                <div className="flex flex-wrap items-center justify-center gap-1">
                  {state?.completedGames?.map((cg, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-slate-950 text-[10px] font-bold text-slate-200 border border-slate-800"
                    >
                      G{cg.gameNumber}: {cg.teamAPoints}-{cg.teamBPoints}
                    </span>
                  ))}
                  {state?.completedGames?.length === 0 && (
                    <span className="text-[10px] text-slate-400">No completed games yet</span>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUndo}
                  disabled={actionLoading || events.length === 0}
                  className="w-full text-xs text-slate-300 hover:text-white border-slate-700"
                  icon={<Undo2 className="w-3.5 h-3.5 text-rose-400" />}
                >
                  Undo Last Point
                </Button>
              </div>
            </div>

            {/* TEAM B CARD */}
            <div
              className={`lg:col-span-5 rounded-2xl p-6 transition-all border ${
                !isTeamAServing
                  ? 'bg-slate-900/90 border-orange-500/50 shadow-lg shadow-orange-500/5'
                  : 'bg-slate-900/50 border-slate-800'
              } flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-cyan-400" />
                    <h2 className="text-xl font-black text-white">{teamBName}</h2>
                  </div>
                  {!isTeamAServing && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center gap-1">
                      <Zap className="w-3 h-3 fill-orange-400" /> SERVING ({servesRemainingForCurrentServer} LEFT)
                    </span>
                  )}
                </div>

                {/* Player squad display */}
                <div className="text-xs text-slate-400 space-y-1 mb-4">
                  {state?.teamBPlayers?.map((p) => (
                    <div key={p.id} className="flex items-center gap-1.5">
                      <span className="text-slate-300 font-medium">{p.name}</span>
                      {p.id === currentServerPlayerId && !isTeamAServing && (
                        <span className="text-[10px] text-orange-400 font-bold">(Server)</span>
                      )}
                      {p.id === state?.currentReceiverPlayerId && isTeamAServing && (
                        <span className="text-[10px] text-cyan-400 font-bold">(Receiver)</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-end justify-between border-t border-slate-800/80 pt-4">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Games Won</span>
                  <div className="text-3xl font-black text-cyan-400">{teamBGamesWon}</div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Current Game Points</span>
                  <div className="text-7xl font-black text-white tracking-tighter">{currentPointsB}</div>
                </div>
              </div>

              {/* Point Button B */}
              <div className="mt-6">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => handleRecordPoint('TEAM_B')}
                  disabled={actionLoading || isMatchFinished}
                  className="w-full h-16 text-lg font-black bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-lg shadow-cyan-950/40"
                  icon={<Plus className="w-6 h-6" />}
                >
                  +1 POINT ({teamBName.split(' ')[0]})
                </Button>
              </div>
            </div>
          </div>

          {/* QUICK STROKE / POINT TYPE SELECTOR */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-400" /> Shot & Point Classification
              </h3>
              <span className="text-[11px] text-slate-400">Click a shot to tag the next scored point</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
              {[
                { type: 'FOREHAND_WINNER', label: 'Forehand Winner', icon: '🏓', color: 'emerald' },
                { type: 'BACKHAND_WINNER', label: 'Backhand Winner', icon: '🏓', color: 'emerald' },
                { type: 'SMASH_WINNER', label: 'Smash Winner', icon: '💥', color: 'orange' },
                { type: 'LOOP_WINNER', label: 'Loop / Topspin', icon: '🌀', color: 'emerald' },
                { type: 'FLICK_WINNER', label: 'Flick / Flip', icon: '⚡', color: 'emerald' },
                { type: 'CHOP_WINNER', label: 'Chop / Defense', icon: '🛡️', color: 'cyan' },
                { type: 'SERVICE_ACE', label: 'Service Ace', icon: '🎯', color: 'amber' },
                { type: 'SERVICE_ERROR', label: 'Service Fault', icon: '❌', color: 'rose' },
                { type: 'UNFORCED_ERROR', label: 'Unforced Error', icon: '⚠️', color: 'rose' },
                { type: 'FORCED_ERROR', label: 'Forced Error', icon: '🛑', color: 'rose' },
                { type: 'NET_EDGE_BALL', label: 'Edge / Net Cord', icon: '✨', color: 'purple' },
                { type: 'POINT_WON', label: 'General Rally Won', icon: '✅', color: 'blue' },
              ].map((item) => (
                <button
                  key={item.type}
                  onClick={() => setEventType(item.type as TableTennisPointType)}
                  className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all flex flex-col justify-between gap-1.5 ${
                    eventType === item.type
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-950/40'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </div>

            {/* Quick point direct action triggers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 min-w-[70px]">For Team A:</span>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRecordPoint('TEAM_A', 'FOREHAND_WINNER')}
                    className="text-xs bg-slate-950 border-slate-800 text-emerald-400"
                  >
                    +FH Winner
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRecordPoint('TEAM_A', 'SMASH_WINNER')}
                    className="text-xs bg-slate-950 border-slate-800 text-emerald-400"
                  >
                    +Smash
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRecordPoint('TEAM_A', 'SERVICE_ACE')}
                    className="text-xs bg-slate-950 border-slate-800 text-amber-400"
                  >
                    +Ace
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRecordPoint('TEAM_A', 'UNFORCED_ERROR')}
                    className="text-xs bg-slate-950 border-slate-800 text-rose-400"
                  >
                    Opponent Error
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 min-w-[70px]">For Team B:</span>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRecordPoint('TEAM_B', 'FOREHAND_WINNER')}
                    className="text-xs bg-slate-950 border-slate-800 text-cyan-400"
                  >
                    +FH Winner
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRecordPoint('TEAM_B', 'SMASH_WINNER')}
                    className="text-xs bg-slate-950 border-slate-800 text-cyan-400"
                  >
                    +Smash
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRecordPoint('TEAM_B', 'SERVICE_ACE')}
                    className="text-xs bg-slate-950 border-slate-800 text-amber-400"
                  >
                    +Ace
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRecordPoint('TEAM_B', 'UNFORCED_ERROR')}
                    className="text-xs bg-slate-950 border-slate-800 text-rose-400"
                  >
                    Opponent Error
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* SECONDARY MATCH OPERATIONS & CONTROLS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Change Server / Receiver */}
            <Card className="p-4 bg-slate-900/60 border-slate-800 flex flex-col justify-between space-y-3">
              <div>
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-orange-400" /> Service Rotation
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Current: <strong className="text-slate-200">{currentServerPlayer?.name || 'Assigned'}</strong>
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNewServerPlayerId(currentServerPlayerId || '');
                  setNewServerTeamId(currentServerTeamId || match.teamAId);
                  setIsServerModalOpen(true);
                }}
                className="w-full text-xs border-slate-700"
              >
                Change Server / Receiver
              </Button>
            </Card>

            {/* Timeouts */}
            <Card className="p-4 bg-slate-900/60 border-slate-800 flex flex-col justify-between space-y-3">
              <div>
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Timer className="w-3.5 h-3.5 text-amber-400" /> 60s Timeouts
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Team A: <strong className="text-slate-200">{state?.timeoutsTakenA || 0}/1</strong> | Team B:{' '}
                  <strong className="text-slate-200">{state?.timeoutsTakenB || 0}/1</strong>
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCallTimeout('TEAM_A')}
                  disabled={actionLoading || (state?.timeoutsTakenA || 0) >= 1}
                  className="w-1/2 text-xs border-slate-700 text-emerald-400"
                >
                  Timeout A
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCallTimeout('TEAM_B')}
                  disabled={actionLoading || (state?.timeoutsTakenB || 0) >= 1}
                  className="w-1/2 text-xs border-slate-700 text-cyan-400"
                >
                  Timeout B
                </Button>
              </div>
            </Card>

            {/* Table Ends Switch */}
            <Card className="p-4 bg-slate-900/60 border-slate-800 flex flex-col justify-between space-y-3">
              <div>
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-cyan-400" /> Switch Ends
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">Swap table positions manually</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEndChange}
                disabled={actionLoading}
                className="w-full text-xs border-slate-700"
              >
                Change Ends
              </Button>
            </Card>

            {/* Start / Reset Scoring */}
            <Card className="p-4 bg-slate-900/60 border-slate-800 flex flex-col justify-between space-y-3">
              <div>
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-purple-400" /> Engine State
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">Status: {state?.matchStatus || 'LIVE'}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleStartScoring}
                disabled={actionLoading}
                className="w-full text-xs border-slate-700 text-purple-300"
              >
                Reinitialize Engine
              </Button>
            </Card>
          </div>
        </div>
      )}

      {/* TAB CONTENT: POINT-BY-POINT LOG */}
      {activeTab === 'points' && (
        <div className="p-6 flex-1 max-w-7xl mx-auto w-full space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase text-slate-300">Filter Points</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['ALL', 'WINNERS', 'ERRORS', 'SERVICE', 'GAME_POINTS'] as const).map((flt) => (
                <button
                  key={flt}
                  onClick={() => setPointsFilter(flt)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-colors ${
                    pointsFilter === flt
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {flt.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Game</th>
                    <th className="py-3 px-4">Point Winner</th>
                    <th className="py-3 px-4">Score</th>
                    <th className="py-3 px-4">Server</th>
                    <th className="py-3 px-4">Shot / Event</th>
                    <th className="py-3 px-4">Tags</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredEvents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No point events recorded yet.
                      </td>
                    </tr>
                  ) : (
                    [...filteredEvents].reverse().map((ev, index) => {
                      const isWinnerA = ev.winnerTeamId === match.teamAId;
                      const winnerPlayer = isWinnerA
                        ? state?.teamAPlayers?.find((p) => p.id === ev.winnerPlayerId)
                        : state?.teamBPlayers?.find((p) => p.id === ev.winnerPlayerId);

                      const serverPlayer = ev.serverTeamId === match.teamAId
                        ? state?.teamAPlayers?.find((p) => p.id === ev.serverPlayerId)
                        : state?.teamBPlayers?.find((p) => p.id === ev.serverPlayerId);

                      return (
                        <tr key={ev.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-400">
                            {filteredEvents.length - index}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-300">
                            Game {ev.gameNumber}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`font-bold ${
                                isWinnerA ? 'text-emerald-400' : 'text-cyan-400'
                              }`}
                            >
                              {isWinnerA ? teamAName : teamBName}
                            </span>
                            {winnerPlayer && (
                              <span className="text-[10px] text-slate-400 block font-normal">
                                ({winnerPlayer.name})
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-white">
                            {ev.teamAScore} - {ev.teamBScore}
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {serverPlayer?.name || (ev.serverTeamId === match.teamAId ? teamAName : teamBName)}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-200">
                            {ev.type.replace(/_/g, ' ')}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {ev.isGamePoint && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  Game Pt
                                </span>
                              )}
                              {ev.isMatchPoint && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                  Match Pt
                                </span>
                              )}
                              {ev.isDeuce && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                  Deuce
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingPoint(ev);
                                setEditWinnerSide(isWinnerA ? 'TEAM_A' : 'TEAM_B');
                                setEditWinnerPlayerId(ev.winnerPlayerId || '');
                                setEditEventType((ev.type as TableTennisPointType) || 'POINT_WON');
                                setIsEditPointModalOpen(true);
                              }}
                              className="text-slate-400 hover:text-white p-1"
                              icon={<Edit3 className="w-3.5 h-3.5" />}
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: STATS */}
      {activeTab === 'stats' && (
        <div className="p-6 flex-1 max-w-7xl mx-auto w-full space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Team A Stats */}
            <Card className="p-6 bg-slate-900/80 border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-bold text-white">{teamAName} Statistics</h3>
                </div>
                <Badge variant="emerald">Games Won: {teamAGamesWon}</Badge>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Total Points Won:</span>
                  <span className="font-mono font-bold text-slate-100">{state?.statsA?.totalPointsWon || 0}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Service Points Won:</span>
                  <span className="font-mono font-bold text-slate-100">{state?.statsA?.servicePointsWon || 0}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Receiver Points Won:</span>
                  <span className="font-mono font-bold text-slate-100">{state?.statsA?.receiverPointsWon || 0}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Service Aces:</span>
                  <span className="font-mono font-bold text-slate-100">{state?.statsA?.serviceAces || 0}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Forehand Winners:</span>
                  <span className="font-mono font-bold text-slate-100">{state?.statsA?.forehandWinners || 0}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Backhand Winners:</span>
                  <span className="font-mono font-bold text-slate-100">{state?.statsA?.backhandWinners || 0}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Smash Winners:</span>
                  <span className="font-mono font-bold text-slate-100">{state?.statsA?.smashWinners || 0}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Max Consecutive Points (Streak):</span>
                  <span className="font-mono font-bold text-emerald-400">{state?.statsA?.maxConsecutivePoints || 0}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Unforced Errors:</span>
                  <span className="font-mono font-bold text-rose-400">{state?.statsA?.unforcedErrors || 0}</span>
                </div>
              </div>
            </Card>

            {/* Team B Stats */}
            <Card className="p-6 bg-slate-900/80 border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-base font-bold text-white">{teamBName} Statistics</h3>
                </div>
                <Badge variant="blue">Games Won: {teamBGamesWon}</Badge>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Total Points Won:</span>
                  <span className="font-mono font-bold text-slate-100">{state?.statsB?.totalPointsWon || 0}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Service Points Won:</span>
                  <span className="font-mono font-bold text-slate-100">{state?.statsB?.servicePointsWon || 0}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Receiver Points Won:</span>
                  <span className="font-mono font-bold text-slate-100">{state?.statsB?.receiverPointsWon || 0}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Service Aces:</span>
                  <span className="font-mono font-bold text-slate-100">{state?.statsB?.serviceAces || 0}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Forehand Winners:</span>
                  <span className="font-mono font-bold text-slate-100">{state?.statsB?.forehandWinners || 0}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Backhand Winners:</span>
                  <span className="font-mono font-bold text-slate-100">{state?.statsB?.backhandWinners || 0}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Smash Winners:</span>
                  <span className="font-mono font-bold text-slate-100">{state?.statsB?.smashWinners || 0}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Max Consecutive Points (Streak):</span>
                  <span className="font-mono font-bold text-cyan-400">{state?.statsB?.maxConsecutivePoints || 0}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Unforced Errors:</span>
                  <span className="font-mono font-bold text-rose-400">{state?.statsB?.unforcedErrors || 0}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB CONTENT: RULES & REGULATIONS */}
      {activeTab === 'rules' && (
        <div className="p-6 flex-1 max-w-4xl mx-auto w-full space-y-6">
          <Card className="p-6 bg-slate-900/80 border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
              <Shield className="w-4 h-4 text-emerald-400" /> ITTF Official Table Tennis Regulations
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Scoring Rule</span>
                <span className="font-bold text-slate-200">First to 11 points (Must win by 2 clear points)</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Service Sequence</span>
                <span className="font-bold text-slate-200">2 serves per player, rotates to 1 serve each in deuce (10-10)</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Match Format</span>
                <span className="font-bold text-slate-200">{match.tableTennisConfig?.format?.replace('_', ' ') || 'Best of 3'}</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Deciding Game End Change</span>
                <span className="font-bold text-slate-200">Automatic switch of table ends at 5 points in deciding game</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Official Timeouts</span>
                <span className="font-bold text-slate-200">One 60-second timeout per player/pair per entire match</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Table Assignment</span>
                <span className="font-bold text-slate-200">{match.tableTennisConfig?.tableNumber || 'Table 1'} ({match.venue})</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* MODAL: CHANGE SERVER / RECEIVER */}
      <Dialog
        isOpen={isServerModalOpen}
        onClose={() => setIsServerModalOpen(false)}
        title="Update Server & Receiver"
      >
        <div className="space-y-4 p-2 text-xs">
          <div>
            <label className="block font-medium text-slate-400 mb-1.5">Serving Side</label>
            <select
              value={newServerTeamId}
              onChange={(e) => {
                setNewServerTeamId(e.target.value);
                const players = e.target.value === match.teamAId ? state?.teamAPlayers : state?.teamBPlayers;
                if (players && players[0]) setNewServerPlayerId(players[0].id);
              }}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
            >
              <option value={match.teamAId}>{teamAName}</option>
              <option value={match.teamBId}>{teamBName}</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-400 mb-1.5">Server Player</label>
            <select
              value={newServerPlayerId}
              onChange={(e) => setNewServerPlayerId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
            >
              {(newServerTeamId === match.teamAId ? state?.teamAPlayers : state?.teamBPlayers)?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
            <Button variant="ghost" size="sm" onClick={() => setIsServerModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveServer} disabled={actionLoading}>
              Save Server
            </Button>
          </div>
        </div>
      </Dialog>

      {/* MODAL: EDIT POINT */}
      <Dialog
        isOpen={isEditPointModalOpen}
        onClose={() => {
          setIsEditPointModalOpen(false);
          setEditingPoint(null);
        }}
        title="Edit Point Event"
      >
        <div className="space-y-4 p-2 text-xs">
          <div>
            <label className="block font-medium text-slate-400 mb-1.5">Point Winner</label>
            <select
              value={editWinnerSide}
              onChange={(e) => {
                const side = e.target.value as 'TEAM_A' | 'TEAM_B';
                setEditWinnerSide(side);
                const players = side === 'TEAM_A' ? state?.teamAPlayers : state?.teamBPlayers;
                if (players && players[0]) setEditWinnerPlayerId(players[0].id);
              }}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
            >
              <option value="TEAM_A">{teamAName}</option>
              <option value="TEAM_B">{teamBName}</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-400 mb-1.5">Point / Shot Classification</label>
            <select
              value={editEventType}
              onChange={(e) => setEditEventType(e.target.value as TableTennisPointType)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
            >
              <option value="FOREHAND_WINNER">Forehand Topspin Winner</option>
              <option value="BACKHAND_WINNER">Backhand Topspin Winner</option>
              <option value="SMASH_WINNER">Smash Winner</option>
              <option value="LOOP_WINNER">Loop / Topspin</option>
              <option value="FLICK_WINNER">Flick / Flip</option>
              <option value="CHOP_WINNER">Chop / Defense</option>
              <option value="SERVICE_ACE">Service Ace</option>
              <option value="SERVICE_ERROR">Service Fault</option>
              <option value="UNFORCED_ERROR">Unforced Error</option>
              <option value="FORCED_ERROR">Forced Error</option>
              <option value="NET_EDGE_BALL">Edge / Net Cord</option>
              <option value="POINT_WON">Point Won (General)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsEditPointModalOpen(false);
                setEditingPoint(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveEditPoint} disabled={actionLoading}>
              Save Changes
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
