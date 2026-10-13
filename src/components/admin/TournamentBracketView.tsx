import React, { useState, useEffect, useRef } from 'react';
import {
  Tournament,
  Team,
  Match,
  KnockoutBracket,
  KnockoutMatchNode,
  KnockoutBracketRound,
  KnockoutGenerationOptions,
  KnockoutSeedItem,
  KnockoutAuditLogItem,
  ChampionshipSummary,
} from '../../types';
import { api } from '../../services/api';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  Trophy,
  GitMerge,
  Play,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Tv,
  Check,
  ChevronRight,
  Shield,
  Award,
  Sparkles,
  RefreshCw,
  Sliders,
  History,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ExternalLink,
  Edit3,
  Flame,
  Medal,
  Users,
  Info,
  X,
} from 'lucide-react';

export interface TournamentBracketViewProps {
  tournament: Tournament;
  teams: Team[];
  matches: Match[];
  bracket?: KnockoutBracket;
  onRefresh: () => void;
  onOpenMatchScoring?: (matchId: string) => void;
  onEditFixtureMatch?: (match: Match) => void;
}

export const TournamentBracketView: React.FC<TournamentBracketViewProps> = ({
  tournament,
  teams,
  matches,
  bracket: initialBracket,
  onRefresh,
  onOpenMatchScoring,
  onEditFixtureMatch,
}) => {
  const [bracket, setBracket] = useState<KnockoutBracket | null>(initialBracket || null);
  const [championshipSummary, setChampionshipSummary] = useState<ChampionshipSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Modals
  const [isGenModalOpen, setIsGenModalOpen] = useState(false);
  const [isTieModalOpen, setIsTieModalOpen] = useState(false);
  const [selectedTieNode, setSelectedTieNode] = useState<KnockoutMatchNode | null>(null);
  const [tieWinnerId, setTieWinnerId] = useState('');
  const [tieMethod, setTieMethod] = useState('Super Over / Penalty Shootout');

  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [selectedAdvanceNode, setSelectedAdvanceNode] = useState<KnockoutMatchNode | null>(null);
  const [manualWinnerId, setManualWinnerId] = useState('');
  const [manualAdvanceReason, setManualAdvanceReason] = useState('');

  const [isChampionModalOpen, setIsChampionModalOpen] = useState(false);
  const [selectedChampTeamId, setSelectedChampTeamId] = useState(tournament.championTeamId || '');
  const [selectedRunnerUpId, setSelectedRunnerUpId] = useState(tournament.runnerUpTeamId || '');
  const [selectedThirdPlaceId, setSelectedThirdPlaceId] = useState(tournament.thirdPlaceTeamId || '');

  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('Scoring correction / Playoff adjustment');

  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState(false);
  const [isSeedsModalOpen, setIsSeedsModalOpen] = useState(false);

  // Generator form state
  const [genStage, setGenStage] = useState<'ROUND_OF_32' | 'ROUND_OF_16' | 'QUARTER_FINALS' | 'SEMI_FINALS' | 'FINAL'>('QUARTER_FINALS');
  const [genSeedingMethod, setGenSeedingMethod] = useState<'GROUP_CROSSOVER' | 'OVERALL_RANK' | 'MANUAL' | 'RANDOM'>('GROUP_CROSSOVER');
  const [genThirdPlace, setGenThirdPlace] = useState(true);
  const [genCrossGroup, setGenCrossGroup] = useState(true);
  const [genSameGroupProtection, setGenSameGroupProtection] = useState(true);
  const [genCreateMatches, setGenCreateMatches] = useState(true);
  const [genStartDate, setGenStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [genStartTime, setGenStartTime] = useState('15:00');
  const [genInterval, setGenInterval] = useState(120);
  const [genDaysBetween, setGenDaysBetween] = useState(2);
  const [genVenue, setGenVenue] = useState(tournament.venue || tournament.location || 'Main Stadium');
  const [genGround, setGenGround] = useState('Center Pitch');
  const [genPreservePlayed, setGenPreservePlayed] = useState(true);

  // Fetch / Sync bracket
  const fetchBracketData = async () => {
    try {
      setLoading(true);
      const res = await api.getTournamentBracket(tournament.id);
      if (res.bracket) {
        setBracket(res.bracket);
      }
      const champ = await api.getTournamentChampionshipSummary(tournament.id).catch(() => null);
      if (champ) setChampionshipSummary(champ);
    } catch (err) {
      console.error('Failed to fetch bracket data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialBracket) {
      setBracket(initialBracket);
    } else {
      fetchBracketData();
    }
  }, [tournament.id, initialBracket]);

  const handleRecalculateSync = async () => {
    try {
      setSyncing(true);
      const res = await api.recalculateTournamentBracket(tournament.id, { preservePlayedMatches: true });
      if (res.bracket) {
        setBracket(res.bracket);
      }
      const champ = await api.getTournamentChampionshipSummary(tournament.id).catch(() => null);
      if (champ) setChampionshipSummary(champ);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to sync bracket');
    } finally {
      setSyncing(false);
    }
  };

  const handleGenerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload: KnockoutGenerationOptions = {
        tournamentId: tournament.id,
        stage: genStage,
        hasThirdPlaceMatch: genThirdPlace,
        createMatchEntities: genCreateMatches,
        seedingMethod: genSeedingMethod,
        crossGroupRestrictions: genCrossGroup,
        sameGroupProtection: genSameGroupProtection,
        startDate: genStartDate,
        matchStartTime: genStartTime,
        matchIntervalMinutes: Number(genInterval),
        daysBetweenRounds: Number(genDaysBetween),
        venue: genVenue,
        ground: genGround,
        preservePlayedMatches: genPreservePlayed,
      };

      const res = bracket
        ? await api.regenerateTournamentBracket(tournament.id, payload)
        : await api.generateTournamentBracket(tournament.id, payload);

      setBracket(res.bracket);
      setIsGenModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to generate bracket');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveTieSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTieNode || !tieWinnerId) return;

    try {
      setLoading(true);
      const res = await api.resolveTournamentBracketTie(tournament.id, {
        nodeId: selectedTieNode.id,
        winnerTeamId: tieWinnerId,
        resolutionMethod: tieMethod,
      });
      setBracket(res.bracket);
      setIsTieModalOpen(false);
      setSelectedTieNode(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to resolve tie');
    } finally {
      setLoading(false);
    }
  };

  const handleManualAdvanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdvanceNode || !manualWinnerId) return;

    try {
      setLoading(true);
      const res = await api.advanceTournamentBracketWinner(tournament.id, {
        nodeId: selectedAdvanceNode.id,
        winnerTeamId: manualWinnerId,
        reason: manualAdvanceReason || 'Manual Administrator Winner Selection',
      });
      setBracket(res.bracket);
      setIsAdvanceModalOpen(false);
      setSelectedAdvanceNode(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to advance winner');
    } finally {
      setLoading(false);
    }
  };

  const handleDeclareChampionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChampTeamId) return;

    try {
      setLoading(true);
      const res = await api.declareTournamentChampion(tournament.id, {
        championTeamId: selectedChampTeamId,
        runnerUpTeamId: selectedRunnerUpId || undefined,
        thirdPlaceTeamId: selectedThirdPlaceId || undefined,
      });
      setChampionshipSummary(res.summary);
      setIsChampionModalOpen(false);
      onRefresh();
      fetchBracketData();
    } catch (err: any) {
      alert(err.message || 'Failed to declare champion');
    } finally {
      setLoading(false);
    }
  };

  const handleReopenTournamentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.reopenTournamentLifecycle(tournament.id, { reason: reopenReason });
      setIsReopenModalOpen(false);
      onRefresh();
      fetchBracketData();
    } catch (err: any) {
      alert(err.message || 'Failed to reopen tournament');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyBroadcastUrl = (matchId: string) => {
    const url = `${window.location.origin}/broadcast/match/${matchId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(matchId);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const isTournamentCompleted = tournament.status === 'COMPLETED' || bracket?.status === 'COMPLETED';

  return (
    <div className="space-y-6">
      {/* Header Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-100 uppercase tracking-wider">
                Championship Playoff Tree
              </h2>
              {isTournamentCompleted ? (
                <Badge variant="success" className="font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> TOURNAMENT COMPLETED
                </Badge>
              ) : (
                <Badge variant="warning" className="font-bold">
                  ACTIVE KNOCKOUT
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Deterministic single-elimination tournament bracket with automatic advancement & live score synchronization.
            </p>
          </div>
        </div>

        {/* Toolbar Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {bracket && (
            <>
              {/* Seeds Overview */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSeedsModalOpen(true)}
                icon={<Users className="w-3.5 h-3.5 text-blue-400" />}
              >
                Seeds ({bracket.seeds?.length || 0})
              </Button>

              {/* Audit History */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAuditDrawerOpen(true)}
                icon={<History className="w-3.5 h-3.5 text-slate-400" />}
              >
                Audit Log ({bracket.auditLogs?.length || 0})
              </Button>

              {/* Recalculate & Sync */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRecalculateSync}
                disabled={syncing}
                icon={<RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${syncing ? 'animate-spin' : ''}`} />}
              >
                {syncing ? 'Syncing...' : 'Sync Scores'}
              </Button>

              {/* Declare Champion button (if not completed or want to edit) */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedChampTeamId(bracket.championTeamId || tournament.championTeamId || '');
                  setSelectedRunnerUpId(bracket.runnerUpTeamId || tournament.runnerUpTeamId || '');
                  setSelectedThirdPlaceId(bracket.thirdPlaceTeamId || tournament.thirdPlaceTeamId || '');
                  setIsChampionModalOpen(true);
                }}
                className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
                icon={<Award className="w-3.5 h-3.5 text-amber-400" />}
              >
                {isTournamentCompleted ? 'Awards & Podium' : 'Declare Champion'}
              </Button>

              {/* Admin Reopen (if completed) */}
              {isTournamentCompleted && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsReopenModalOpen(true)}
                  className="border-rose-500/40 text-rose-300 hover:bg-rose-500/10"
                  icon={<RotateCcw className="w-3.5 h-3.5 text-rose-400" />}
                >
                  Reopen Tournament
                </Button>
              )}
            </>
          )}

          {/* Generator Modal Trigger */}
          <Button
            variant="emerald"
            size="sm"
            onClick={() => setIsGenModalOpen(true)}
            icon={<GitMerge className="w-3.5 h-3.5" />}
          >
            {bracket ? 'Regenerate Bracket' : 'Generate Bracket'}
          </Button>
        </div>
      </div>

      {/* Championship Podium / Winner Banner */}
      {(bracket?.championTeamName || tournament.championTeamName) && (
        <div className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-r from-amber-500/20 via-amber-600/10 to-slate-900 border border-amber-500/50 shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Trophy className="w-48 h-48 text-amber-400" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-400/60 flex items-center justify-center text-amber-300 shadow-inner shrink-0">
                <Trophy className="w-9 h-9 animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[10px] font-black text-amber-300 uppercase tracking-widest">
                    🏆 TOURNAMENT CHAMPION
                  </span>
                  {isTournamentCompleted && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      Completed: {new Date(tournament.completedAt || bracket?.updatedAt || '').toLocaleDateString()}
                    </span>
                  )}
                </div>
                <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2.5">
                  {bracket?.championTeamLogoUrl && (
                    <img
                      src={bracket.championTeamLogoUrl}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="w-7 h-7 rounded-lg object-cover"
                    />
                  )}
                  <span>{bracket?.championTeamName || tournament.championTeamName}</span>
                </h1>
              </div>
            </div>

            {/* Podium Places (Runner-up & 3rd Place) */}
            <div className="flex flex-wrap items-center gap-3">
              {(bracket?.runnerUpTeamName || tournament.runnerUpTeamName) && (
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-3 min-w-[170px]">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 text-sm font-bold shrink-0">
                    🥈
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider block">
                      RUNNER-UP (2ND)
                    </span>
                    <span className="text-xs font-bold text-slate-200 truncate block">
                      {bracket?.runnerUpTeamName || tournament.runnerUpTeamName}
                    </span>
                  </div>
                </div>
              )}

              {(bracket?.thirdPlaceTeamName || tournament.thirdPlaceTeamName) && (
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-3 min-w-[170px]">
                  <div className="w-8 h-8 rounded-lg bg-amber-900/40 border border-amber-700/50 flex items-center justify-center text-amber-400 text-sm font-bold shrink-0">
                    🥉
                  </div>
                  <div>
                    <span className="text-[9px] text-amber-400 uppercase font-black tracking-wider block">
                      BRONZE (3RD)
                    </span>
                    <span className="text-xs font-bold text-slate-200 truncate block">
                      {bracket?.thirdPlaceTeamName || tournament.thirdPlaceTeamName}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Bracket Interactive Tree */}
      {!bracket || bracket.rounds.length === 0 ? (
        <div className="p-16 text-center bg-slate-900/60 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-emerald-400">
            <GitMerge className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-200">No Knockout Bracket Generated Yet</h3>
            <p className="text-xs text-slate-400 max-w-lg mx-auto">
              Configure and generate the single-elimination tournament bracket automatically from qualified group stage standings or overall seeds.
            </p>
          </div>
          <Button variant="emerald" size="sm" onClick={() => setIsGenModalOpen(true)} icon={<GitMerge className="w-4 h-4" />}>
            Generate Tournament Playoff Bracket
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Zoom & Navigation Bar */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-300">Format:</span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-emerald-400 font-mono text-[11px]">
                {bracket.startingStage.replace('_', ' ')} → FINAL
              </span>
              {bracket.hasThirdPlaceMatch && (
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-400 font-mono text-[11px]">
                  + 3rd Place Match
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.1))}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-mono text-[10px] text-slate-400">{Math.round(zoomLevel * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 ml-1"
                title="Reset Zoom"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Horizontal Scrolling Bracket Canvas */}
          <div className="overflow-x-auto pb-6 pt-2 rounded-2xl bg-slate-950/70 border border-slate-800/80 shadow-2xl custom-scrollbar">
            <div
              className="flex items-start gap-8 p-6 min-w-max transition-transform origin-top-left"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              {bracket.rounds.map((round, rIdx) => {
                const isFinalRound = round.stage === 'FINAL';
                const isBronzeRound = round.stage === 'THIRD_PLACE';

                return (
                  <div key={round.roundKey || rIdx} className="w-80 flex flex-col space-y-4 shrink-0">
                    {/* Round Header Column */}
                    <div
                      className={`p-3 rounded-xl border text-center transition-all ${
                        isFinalRound
                          ? 'bg-amber-950/40 border-amber-500/50 shadow-md ring-1 ring-amber-500/20'
                          : isBronzeRound
                          ? 'bg-blue-950/30 border-blue-500/40'
                          : 'bg-slate-900 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        {isFinalRound && <Trophy className="w-3.5 h-3.5 text-amber-400" />}
                        {isBronzeRound && <Medal className="w-3.5 h-3.5 text-blue-400" />}
                        <h3 className="text-xs font-black text-slate-100 uppercase tracking-wider">
                          {round.title}
                        </h3>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {round.matches.length} {round.matches.length === 1 ? 'Fixture' : 'Fixtures'}
                      </span>
                    </div>

                    {/* Match Cards List */}
                    <div
                      className="flex flex-col justify-around flex-1 space-y-4"
                      style={{ minHeight: `${bracket.rounds[0].matches.length * 130}px` }}
                    >
                      {round.matches.map((node) => {
                        const isNodeCompleted = node.status === 'COMPLETED';
                        const isNodeLive = node.status === 'LIVE';
                        const isTieActionNeeded = node.tieRequiresAdminAction || node.isTie;
                        const matchObj = matches.find((m) => m.id === node.matchId);

                        const homeIsWinner = node.winnerTeamId && node.winnerTeamId === node.homeTeamId;
                        const awayIsWinner = node.winnerTeamId && node.winnerTeamId === node.awayTeamId;

                        return (
                          <div
                            key={node.id}
                            className={`relative rounded-2xl border transition-all shadow-md ${
                              isTieActionNeeded
                                ? 'bg-amber-950/30 border-amber-500 ring-2 ring-amber-500/30'
                                : isNodeLive
                                ? 'bg-slate-900 border-amber-500/60 ring-1 ring-amber-500/30'
                                : isFinalRound
                                ? 'bg-slate-900/90 border-amber-500/40'
                                : isNodeCompleted
                                ? 'bg-slate-900/80 border-slate-800'
                                : 'bg-slate-950 border-slate-800/90 hover:border-slate-700'
                            }`}
                          >
                            {/* Card Header Bar */}
                            <div className="flex items-center justify-between text-[10px] px-3.5 py-2 border-b border-slate-800/70 text-slate-400">
                              <div className="flex items-center gap-1.5 font-mono">
                                <span className="text-slate-300 font-bold">{node.title}</span>
                              </div>

                              <div className="flex items-center gap-1">
                                {node.isBye ? (
                                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[9px] border border-emerald-500/40">
                                    BYE
                                  </span>
                                ) : (
                                  <Badge
                                    variant={
                                      isTieActionNeeded
                                        ? 'warning'
                                        : isNodeLive
                                        ? 'warning'
                                        : isNodeCompleted
                                        ? 'secondary'
                                        : 'neutral'
                                    }
                                  >
                                    {isTieActionNeeded ? 'TIE / ACTION REQ' : node.status}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Teams Matchup Body */}
                            <div className="p-3 space-y-1.5">
                              {/* Home Team Slot */}
                              <div
                                className={`p-2 rounded-xl flex items-center justify-between transition-colors ${
                                  homeIsWinner
                                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold'
                                    : 'bg-slate-950/80 border border-slate-800/60 text-slate-200'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  {node.homeSeed && (
                                    <span className="w-4 h-4 rounded bg-slate-900 border border-slate-800 flex items-center justify-center text-[9px] font-mono text-slate-400 shrink-0">
                                      {node.homeSeed}
                                    </span>
                                  )}
                                  {node.homeTeamLogoUrl && (
                                    <img
                                      src={node.homeTeamLogoUrl}
                                      alt=""
                                      referrerPolicy="no-referrer"
                                      className="w-4 h-4 rounded object-cover shrink-0"
                                    />
                                  )}
                                  <span className="text-xs truncate">
                                    {node.homeTeamName || node.homeTeamPlaceholder || 'TBD'}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0 pl-2">
                                  <span className="font-mono text-xs font-black">
                                    {node.homeTeamScore ?? '-'}
                                  </span>
                                  {homeIsWinner && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                                </div>
                              </div>

                              {/* Away Team Slot */}
                              <div
                                className={`p-2 rounded-xl flex items-center justify-between transition-colors ${
                                  awayIsWinner
                                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold'
                                    : 'bg-slate-950/80 border border-slate-800/60 text-slate-200'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  {node.awaySeed && (
                                    <span className="w-4 h-4 rounded bg-slate-900 border border-slate-800 flex items-center justify-center text-[9px] font-mono text-slate-400 shrink-0">
                                      {node.awaySeed}
                                    </span>
                                  )}
                                  {node.awayTeamLogoUrl && (
                                    <img
                                      src={node.awayTeamLogoUrl}
                                      alt=""
                                      referrerPolicy="no-referrer"
                                      className="w-4 h-4 rounded object-cover shrink-0"
                                    />
                                  )}
                                  <span className="text-xs truncate">
                                    {node.awayTeamName || node.awayTeamPlaceholder || 'TBD'}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0 pl-2">
                                  <span className="font-mono text-xs font-black">
                                    {node.awayTeamScore ?? '-'}
                                  </span>
                                  {awayIsWinner && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                                </div>
                              </div>
                            </div>

                            {/* Tie Warning Action Banner */}
                            {isTieActionNeeded && (
                              <div className="px-3 pb-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedTieNode(node);
                                    setTieWinnerId(node.homeTeamId || '');
                                    setIsTieModalOpen(true);
                                  }}
                                  className="w-full py-1.5 px-2.5 rounded-lg bg-amber-500/20 border border-amber-500/50 text-[11px] font-bold text-amber-300 hover:bg-amber-500/30 flex items-center justify-center gap-1.5 transition-colors"
                                >
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Resolve Tied Match Winner</span>
                                </button>
                              </div>
                            )}

                            {/* Match Footer & Action Controls */}
                            <div className="px-3 py-2 border-t border-slate-800/60 bg-slate-950/40 rounded-b-2xl flex items-center justify-between text-[10px] text-slate-400">
                              <div className="flex items-center gap-2 truncate">
                                {node.matchDate && (
                                  <span className="flex items-center gap-1 text-[10px]">
                                    <Calendar className="w-3 h-3 text-slate-500" />
                                    {node.matchDate}
                                  </span>
                                )}
                                {node.venue && (
                                  <span className="truncate max-w-[90px] text-slate-500">
                                    {node.venue}
                                  </span>
                                )}
                              </div>

                              {/* Action Buttons */}
                              <div className="flex items-center gap-1 shrink-0 ml-auto">
                                {/* Copy Broadcast Link */}
                                {node.matchId && (
                                  <button
                                    type="button"
                                    onClick={() => handleCopyBroadcastUrl(node.matchId!)}
                                    className={`p-1.5 rounded-lg border transition-colors ${
                                      copiedLink === node.matchId
                                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                                    }`}
                                    title="Copy Match Broadcast Overlay URL"
                                  >
                                    {copiedLink === node.matchId ? (
                                      <Check className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <Tv className="w-3 h-3" />
                                    )}
                                  </button>
                                )}

                                {/* Manual Advance / Override */}
                                {node.homeTeamId && node.awayTeamId && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedAdvanceNode(node);
                                      setManualWinnerId(node.winnerTeamId || node.homeTeamId || '');
                                      setIsAdvanceModalOpen(true);
                                    }}
                                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-amber-300 hover:border-amber-500/40 transition-colors"
                                    title="Override Winner / Advance Team"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                )}

                                {/* Open Scoring Engine */}
                                {node.matchId && onOpenMatchScoring && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenMatchScoring(node.matchId!)}
                                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                                  >
                                    <Play className="w-3 h-3" />
                                    <span>{isNodeLive ? 'Scoring' : 'Open'}</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* GENERATE / REGENERATE BRACKET MODAL */}
      {isGenModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <GitMerge className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-slate-100">
                  {bracket ? 'Regenerate Knockout Bracket' : 'Generate Knockout Bracket'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsGenModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Starting Stage */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Playoff Starting Stage</label>
                  <select
                    value={genStage}
                    onChange={(e: any) => setGenStage(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:border-emerald-500"
                  >
                    <option value="FINAL">Final (2 Teams)</option>
                    <option value="SEMI_FINALS">Semi Finals (4 Teams)</option>
                    <option value="QUARTER_FINALS">Quarter Finals (8 Teams)</option>
                    <option value="ROUND_OF_16">Round of 16 (16 Teams)</option>
                    <option value="ROUND_OF_32">Round of 32 (32 Teams)</option>
                  </select>
                </div>

                {/* Seeding Method */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Seeding & Pairing Strategy</label>
                  <select
                    value={genSeedingMethod}
                    onChange={(e: any) => setGenSeedingMethod(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:border-emerald-500"
                  >
                    <option value="GROUP_CROSSOVER">Group Crossover (A1 vs B2, B1 vs A2)</option>
                    <option value="OVERALL_RANK">Overall Rank Seeding (1 vs 8, 2 vs 7)</option>
                    <option value="MANUAL">Manual Standings Seeds</option>
                    <option value="RANDOM">Random Seeding</option>
                  </select>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-2.5 p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={genThirdPlace}
                    onChange={(e) => setGenThirdPlace(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
                  />
                  <span>Include 3rd Place Bronze Medal Playoff Match</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={genCrossGroup}
                    onChange={(e) => setGenCrossGroup(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
                  />
                  <span>Cross-Group Restriction (Group Winners vs Other Group Runners-up)</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={genSameGroupProtection}
                    onChange={(e) => setGenSameGroupProtection(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
                  />
                  <span>Same-Group Protection (Teams from same group cannot meet until Final)</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={genCreateMatches}
                    onChange={(e) => setGenCreateMatches(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
                  />
                  <span>Create Live Match Entities in Match Management</span>
                </label>

                {bracket && (
                  <label className="flex items-center gap-2 text-xs text-amber-300 cursor-pointer font-bold pt-1 border-t border-slate-800">
                    <input
                      type="checkbox"
                      checked={genPreservePlayed}
                      onChange={(e) => setGenPreservePlayed(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0"
                    />
                    <span>Preserve already played/live knockout matches (Recommended)</span>
                  </label>
                )}
              </div>

              {/* Schedule Dates & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Playoffs Start Date</label>
                  <input
                    type="date"
                    value={genStartDate}
                    onChange={(e) => setGenStartDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">First Match Time</label>
                  <input
                    type="time"
                    value={genStartTime}
                    onChange={(e) => setGenStartTime(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Days Between Rounds</label>
                  <input
                    type="number"
                    min="0"
                    max="14"
                    value={genDaysBetween}
                    onChange={(e) => setGenDaysBetween(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Playoff Venue</label>
                  <input
                    type="text"
                    value={genVenue}
                    onChange={(e) => setGenVenue(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:border-emerald-500"
                    placeholder="e.g. National Stadium"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsGenModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="emerald" size="sm" type="submit" loading={loading}>
                  {bracket ? 'Regenerate Bracket' : 'Generate Bracket'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESOLVE TIE MODAL */}
      {isTieModalOpen && selectedTieNode && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-amber-500/50 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-slate-100">Resolve Tied Match Winner</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTieModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs text-amber-300">
              {selectedTieNode.title} concluded in a tie ({selectedTieNode.homeTeamScore} - {selectedTieNode.awayTeamScore}). In knockout stages, a winner must advance to subsequent rounds.
            </div>

            <form onSubmit={handleResolveTieSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Select Advancing Winner</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTieWinnerId(selectedTieNode.homeTeamId || '')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      tieWinnerId === selectedTieNode.homeTeamId
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold ring-1 ring-emerald-500'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    <span className="text-[10px] text-slate-500 uppercase block">Home Team</span>
                    <span className="text-xs font-bold truncate block">{selectedTieNode.homeTeamName}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTieWinnerId(selectedTieNode.awayTeamId || '')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      tieWinnerId === selectedTieNode.awayTeamId
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold ring-1 ring-emerald-500'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    <span className="text-[10px] text-slate-500 uppercase block">Away Team</span>
                    <span className="text-xs font-bold truncate block">{selectedTieNode.awayTeamName}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Resolution Method / Tie-breaker</label>
                <select
                  value={tieMethod}
                  onChange={(e) => setTieMethod(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:border-emerald-500"
                >
                  <option value="Super Over (Cricket)">Super Over (Cricket)</option>
                  <option value="Penalty Shootout (Football/Hockey)">Penalty Shootout (Football/Hockey)</option>
                  <option value="Extra Time Sudden Death">Extra Time / Golden Point</option>
                  <option value="Tie-breaker Raids (Kabaddi)">Tie-breaker Raids (Kabaddi)</option>
                  <option value="Boundary Count Rule">Boundary Count Rule</option>
                  <option value="Head-to-head / Coin Toss">Toss / Coin Flip</option>
                  <option value="Administrator Decision">Administrator Decision</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsTieModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="emerald" size="sm" type="submit" loading={loading} disabled={!tieWinnerId}>
                  Confirm & Advance Team
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANUAL ADVANCE / OVERRIDE MODAL */}
      {isAdvanceModalOpen && selectedAdvanceNode && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Edit3 className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-slate-100">Manual Winner Selection</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAdvanceModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Select which team advances from <span className="text-slate-200 font-bold">{selectedAdvanceNode.title}</span>.
            </p>

            <form onSubmit={handleManualAdvanceSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setManualWinnerId(selectedAdvanceNode.homeTeamId || '')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    manualWinnerId === selectedAdvanceNode.homeTeamId
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold ring-1 ring-emerald-500'
                      : 'bg-slate-950 border-slate-800 text-slate-300'
                  }`}
                >
                  <span className="text-[10px] text-slate-500 uppercase block">Home Team</span>
                  <span className="text-xs font-bold truncate block">{selectedAdvanceNode.homeTeamName}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setManualWinnerId(selectedAdvanceNode.awayTeamId || '')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    manualWinnerId === selectedAdvanceNode.awayTeamId
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold ring-1 ring-emerald-500'
                      : 'bg-slate-950 border-slate-800 text-slate-300'
                  }`}
                >
                  <span className="text-[10px] text-slate-500 uppercase block">Away Team</span>
                  <span className="text-xs font-bold truncate block">{selectedAdvanceNode.awayTeamName}</span>
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Reason / Note for Audit Log</label>
                <input
                  type="text"
                  value={manualAdvanceReason}
                  onChange={(e) => setManualAdvanceReason(e.target.value)}
                  placeholder="e.g. Walkover / Disqualification / Admin manual seed"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsAdvanceModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="emerald" size="sm" type="submit" loading={loading} disabled={!manualWinnerId}>
                  Advance Team
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DECLARE CHAMPION MODAL */}
      {isChampionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-slate-100">Declare Tournament Champions</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsChampionModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDeclareChampionSubmit} className="space-y-4">
              {/* Champion */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <span>🏆 Tournament Champion (1st Place)</span>
                </label>
                <select
                  value={selectedChampTeamId}
                  onChange={(e) => setSelectedChampTeamId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:border-amber-500 font-bold"
                >
                  <option value="">-- Select Champion Team --</option>
                  {teams.map((tm) => (
                    <option key={tm.id} value={tm.id}>
                      {tm.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Runner Up */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <span>🥈 Runner-Up (2nd Place)</span>
                </label>
                <select
                  value={selectedRunnerUpId}
                  onChange={(e) => setSelectedRunnerUpId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:border-slate-600"
                >
                  <option value="">-- Select Runner-Up Team (Optional) --</option>
                  {teams.map((tm) => (
                    <option key={tm.id} value={tm.id}>
                      {tm.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3rd Place */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
                  <span>🥉 3rd Place Bronze (Optional)</span>
                </label>
                <select
                  value={selectedThirdPlaceId}
                  onChange={(e) => setSelectedThirdPlaceId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:border-slate-600"
                >
                  <option value="">-- Select 3rd Place Team (Optional) --</option>
                  {teams.map((tm) => (
                    <option key={tm.id} value={tm.id}>
                      {tm.name}
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-[11px] text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800">
                Declaring the champion transitions tournament status to <span className="text-emerald-400 font-bold">COMPLETED</span> and generates final championship summary.
              </p>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsChampionModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="emerald" size="sm" type="submit" loading={loading} disabled={!selectedChampTeamId}>
                  Declare Champion
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REOPEN TOURNAMENT MODAL */}
      {isReopenModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <RotateCcw className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-bold text-slate-100">Reopen Completed Tournament</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsReopenModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Reopening will return the tournament and bracket status to <span className="text-amber-400 font-bold">LIVE</span>, unlocking match scoring and bracket modifications.
            </p>

            <form onSubmit={handleReopenTournamentSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Reason for Reopening</label>
                <input
                  type="text"
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:border-rose-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsReopenModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="danger" size="sm" type="submit" loading={loading}>
                  Reopen Tournament
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SEEDS MODAL */}
      {isSeedsModalOpen && bracket?.seeds && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-slate-100">Playoff Seed Allocations</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSeedsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              {bracket.seeds.map((s) => (
                <div
                  key={s.seed}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-mono font-black text-emerald-400">
                      #{s.seed}
                    </span>
                    <div>
                      <span className="text-xs font-bold text-slate-200">{s.teamName}</span>
                      {s.groupName && (
                        <span className="text-[10px] text-slate-400 block">
                          {s.groupName} (Rank #{s.groupRank})
                        </span>
                      )}
                    </div>
                  </div>

                  {s.points !== undefined && (
                    <div className="text-right font-mono text-xs">
                      <span className="text-emerald-400 font-bold">{s.points} Pts</span>
                      {s.differenceDisplay && (
                        <span className="text-[10px] text-slate-500 block">Diff: {s.differenceDisplay}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setIsSeedsModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* AUDIT LOG DRAWER */}
      {isAuditDrawerOpen && bracket?.auditLogs && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <History className="w-5 h-5 text-slate-400" />
                <h3 className="text-base font-bold text-slate-100">Knockout Bracket Audit History</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAuditDrawerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {bracket.auditLogs.map((log) => (
                <div key={log.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-mono font-bold text-emerald-400">{log.action}</span>
                    <span>{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-slate-200">{log.details}</p>
                  {log.userName && (
                    <span className="text-[10px] text-slate-500 block">By: {log.userName}</span>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setIsAuditDrawerOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
