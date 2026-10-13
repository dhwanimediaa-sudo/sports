import React, { useState, useEffect } from 'react';
import {
  Match,
  MatchStatus,
  Player,
} from '../../types';
import { api } from '../../services/api';
import { Breadcrumbs } from '../ui/Breadcrumbs';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { notify } from '../ui/Toast';
import { MatchModal } from './MatchModal';
import { CricketScoringConsole } from '../scoring/CricketScoringConsole';
import { VolleyballScoringConsole } from '../scoring/VolleyballScoringConsole';
import { KabaddiScoringConsole } from '../scoring/KabaddiScoringConsole';
import { HockeyScoringConsole } from '../scoring/HockeyScoringConsole';
import { FootballScoringConsole } from '../scoring/FootballScoringConsole';
import { BasketballScoringConsole } from '../scoring/BasketballScoringConsole';
import { TennisScoringConsole } from '../scoring/TennisScoringConsole';
import { BadmintonScoringConsole } from '../scoring/BadmintonScoringConsole';
import { TableTennisScoringConsole } from '../scoring/TableTennisScoringConsole';
import { CustomSportScoringConsole } from '../scoring/CustomSportScoringConsole';
import { BroadcastControl } from '../broadcast/BroadcastControl';
import { MatchReportView } from '../reports/MatchReportView';
import {
  Trophy,
  Shield,
  Calendar,
  Clock,
  MapPin,
  Users,
  Settings,
  Award,
  Coins,
  Edit2,
  Copy,
  Trash2,
  Tv,
  Zap,
  Play,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowLeft,
  UserCheck,
  UserCheck2,
  FileText,
  Palette,
  FileBarChart,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../services/authContext';

export interface MatchDetailProps {
  matchId: string;
  onBack: () => void;
  onNavigateToTournament?: (tournamentId: string) => void;
  onNavigateToGroup?: (groupId: string) => void;
}

export const MatchDetail: React.FC<MatchDetailProps> = ({
  matchId,
  onBack,
  onNavigateToTournament,
  onNavigateToGroup,
}) => {
  const { user } = useAuth();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const isOwner = (match?.tournament as any)?.ownerUserId === user?.id || (match as any)?.createdByUserId === user?.id;
  const isScorer = (match?.scorerUserIds || []).includes(user?.id || '') || match?.scorerUserId === user?.id;
  const isBroadcaster = (match?.broadcasterUserIds || []).includes(user?.id || '') || match?.broadcastOperatorUserId === user?.id;

  const canScore = isAdmin || isOwner || isScorer;
  const canBroadcast = isAdmin || isOwner || isBroadcaster;
  const canManage = isAdmin || isOwner;

  // Active section tab
  const [activeTab, setActiveTab] = useState<'settings' | 'squads' | 'officials_sponsors' | 'live_scoring' | 'broadcast' | 'report'>('settings');

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Delete Modal State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Status changing state
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Load Match Details
  const loadMatchDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getMatch(matchId);
      setMatch(res.match);
    } catch (err: any) {
      setError(err.message || 'Failed to load match detail.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatchDetail();
  }, [matchId]);

  // Handle Status Change
  const handleStatusChange = async (newStatus: MatchStatus) => {
    if (!match) return;
    setUpdatingStatus(true);
    try {
      const res = await api.updateMatchStatus(match.id, newStatus);
      setMatch(res.match);
      notify.success(`Match status updated to ${newStatus}.`, 'Status Updated');
    } catch (err: any) {
      notify.error(err.message || 'Failed to update match status.', 'Update Error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Handle Duplicate Match
  const handleDuplicate = async () => {
    if (!match) return;
    try {
      const res = await api.duplicateMatch(match.id);
      notify.success(`Match duplicated as "${res.match.name}".`, 'Match Duplicated');
      onBack();
    } catch (err: any) {
      notify.error(err.message || 'Failed to duplicate match.', 'Duplicate Error');
    }
  };

  // Handle Delete Match
  const handleDeleteConfirm = async () => {
    if (!match) return;
    setDeleting(true);
    try {
      await api.deleteMatch(match.id);
      setIsDeleteOpen(false);
      notify.info(`Match "${match.name}" has been deleted.`, 'Match Deleted');
      onBack();
    } catch (err: any) {
      notify.error(err.message || 'Failed to delete match.', 'Delete Error');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs text-slate-400 font-medium">Loading match information...</p>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="p-8 text-center space-y-4 bg-slate-900/60 rounded-2xl border border-slate-800">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <h3 className="text-base font-bold text-slate-200">Match Not Found</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">{error || 'Unable to retrieve match details.'}</p>
        <Button variant="secondary" size="sm" onClick={onBack} icon={<ArrowLeft className="w-4 h-4" />}>
          Back to Matches List
        </Button>
      </div>
    );
  }

  // Breadcrumbs
  const breadcrumbItems = [
    { label: 'Dashboard', onClick: onBack },
    { label: 'Matches', onClick: onBack },
    {
      label: match.tournament?.name || 'Tournament',
      onClick: match.tournamentId && onNavigateToTournament ? () => onNavigateToTournament(match.tournamentId) : undefined,
    },
    {
      label: match.group?.name || 'Group',
      onClick: match.groupId && onNavigateToGroup ? () => onNavigateToGroup(match.groupId) : undefined,
    },
    { label: match.name, active: true },
  ];

  // Separate playing and substitutes for Team A and Team B
  const teamAPlayingPlayers = match.teamAPlayers?.filter((p) => match.teamASquad?.playingIds?.includes(p.id)) || [];
  const teamASubPlayers = match.teamAPlayers?.filter((p) => match.teamBSquad?.substituteIds?.includes(p.id) || match.teamASquad?.substituteIds?.includes(p.id)) || [];

  const teamBPlayingPlayers = match.teamBPlayers?.filter((p) => match.teamBSquad?.playingIds?.includes(p.id)) || [];
  const teamBSubPlayers = match.teamBPlayers?.filter((p) => match.teamBSquad?.substituteIds?.includes(p.id)) || [];

  return (
    <div className="space-y-5">
      {/* Breadcrumbs */}
      <Breadcrumbs items={breadcrumbItems} />

      {/* MATCH HEADER BANNER */}
      <Card className="p-6 bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border-slate-800 space-y-5 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                {match.sport}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold">
                {match.tournament?.name || 'Tournament'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold">
                {match.group?.name || 'Group'}
              </span>
              {match.round && (
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-semibold">
                  {match.round}
                </span>
              )}
            </div>

            <h1 className="text-2xl font-black text-slate-100">{match.name}</h1>

            <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap pt-1">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" /> {match.date}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" /> {match.time}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500" /> {match.venue} {match.ground ? `(${match.ground})` : ''}
              </span>
            </div>
          </div>

          {/* Status & Quick Action Buttons */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
            {canManage && (
              <div className="space-y-1 text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</p>
                <select
                  value={match.status}
                  disabled={updatingStatus}
                  onChange={(e) => handleStatusChange(e.target.value as MatchStatus)}
                  className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none cursor-pointer"
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="SCHEDULED">SCHEDULED</option>
                  <option value="READY">READY</option>
                  <option value="LIVE">LIVE</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
            )}

            {/* Status-Based Primary Actions */}
            <div className="flex items-center gap-1.5 pl-0 sm:pl-2 sm:border-l sm:border-slate-800 flex-wrap">
              {/* UPCOMING ACTIONS */}
              {['DRAFT', 'SCHEDULED', 'READY'].includes(match.status) && (
                <>
                  <Button
                    variant="emerald"
                    size="sm"
                    onClick={() => setActiveTab('squads')}
                    icon={<Zap className="w-4 h-4" />}
                  >
                    OPEN MATCH
                  </Button>

                  {canScore && (
                    <Button
                      variant="emerald"
                      size="sm"
                      onClick={() => setActiveTab('live_scoring')}
                      icon={<Play className="w-4 h-4" />}
                    >
                      START SCORING
                    </Button>
                  )}

                  {canManage && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setActiveTab('officials_sponsors')}
                      icon={<UserCheck className="w-4 h-4 text-emerald-400" />}
                    >
                      ASSIGN SCORER
                    </Button>
                  )}

                  {canManage && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setActiveTab('broadcast')}
                      icon={<Tv className="w-4 h-4 text-sky-400" />}
                    >
                      ASSIGN BROADCAST
                    </Button>
                  )}

                  {canBroadcast && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setActiveTab('broadcast')}
                      icon={<Palette className="w-4 h-4 text-amber-400" />}
                    >
                      GRAPHICS
                    </Button>
                  )}
                </>
              )}

              {/* LIVE ACTIONS */}
              {match.status === 'LIVE' && (
                <>
                  {canScore && (
                    <Button
                      variant="emerald"
                      size="sm"
                      onClick={() => setActiveTab('live_scoring')}
                      icon={<Zap className="w-4 h-4" />}
                    >
                      OPEN SCORING
                    </Button>
                  )}

                  {canBroadcast && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setActiveTab('broadcast')}
                      icon={<Tv className="w-4 h-4 text-sky-400" />}
                    >
                      BROADCAST
                    </Button>
                  )}

                  {canBroadcast && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setActiveTab('broadcast')}
                      icon={<Palette className="w-4 h-4 text-amber-400" />}
                    >
                      GRAPHICS
                    </Button>
                  )}

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setActiveTab('report')}
                    icon={<FileBarChart className="w-4 h-4 text-cyan-400" />}
                  >
                    MATCH REPORT
                  </Button>
                </>
              )}

              {/* COMPLETED ACTIONS */}
              {match.status === 'COMPLETED' && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setActiveTab('report')}
                    icon={<FileBarChart className="w-4 h-4 text-cyan-400" />}
                  >
                    MATCH REPORT
                  </Button>

                  {canBroadcast && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setActiveTab('broadcast')}
                      icon={<Palette className="w-4 h-4 text-amber-400" />}
                    >
                      GRAPHICS
                    </Button>
                  )}

                  <Button
                    variant="emerald"
                    size="sm"
                    onClick={() => setActiveTab('report')}
                    icon={<FileText className="w-4 h-4" />}
                  >
                    FULL SCORECARD
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setActiveTab('report')}
                    icon={<Award className="w-4 h-4 text-amber-400" />}
                  >
                    PLAYER STATS
                  </Button>
                </>
              )}

              {/* Management controls */}
              {canManage && (
                <>
                  <Button variant="secondary" size="sm" onClick={() => setIsEditModalOpen(true)} icon={<Edit2 className="w-4 h-4" />}>
                    Edit
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleDuplicate}
                    icon={<Copy className="w-4 h-4 text-indigo-400" />}
                    title="Duplicate Match"
                  />
                  <Button variant="danger" size="sm" onClick={() => setIsDeleteOpen(true)} icon={<Trash2 className="w-4 h-4" />} />
                </>
              )}
            </div>
          </div>
        </div>

        {/* TEAM VS BANNER */}
        <div className="grid grid-cols-1 md:grid-cols-11 items-center gap-4 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
          {/* Team A */}
          <div className="md:col-span-5 flex items-center gap-4">
            {match.teamA?.logoUrl ? (
              <img
                src={match.teamA.logoUrl}
                alt={match.teamA.name}
                className="w-14 h-14 rounded-xl object-cover bg-slate-900 p-1 border border-slate-800 shrink-0"
              />
            ) : (
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center font-black text-slate-950 text-base shrink-0"
                style={{ backgroundColor: match.teamA?.teamColor || '#10b981' }}
              >
                {match.teamA?.shortName || match.teamA?.name?.slice(0, 3).toUpperCase() || 'T1'}
              </div>
            )}
            <div>
              <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Team A (Home)</p>
              <h2 className="text-lg font-black text-slate-100">{match.teamA?.name || 'Team A'}</h2>
              <p className="text-xs text-slate-400">
                Code: {match.teamA?.code || 'N/A'} • Manager: {match.teamA?.manager || 'N/A'}
              </p>
            </div>
          </div>

          {/* VS Center */}
          <div className="md:col-span-1 text-center py-2 md:py-0">
            <span className="w-9 h-9 rounded-full bg-slate-800 text-xs font-black text-emerald-400 flex items-center justify-center mx-auto border border-slate-700 shadow-md">
              VS
            </span>
          </div>

          {/* Team B */}
          <div className="md:col-span-5 flex items-center justify-start md:justify-end gap-4 text-left md:text-right">
            <div className="order-2 md:order-1">
              <p className="text-xs text-sky-400 font-bold uppercase tracking-wider">Team B (Away)</p>
              <h2 className="text-lg font-black text-slate-100">{match.teamB?.name || 'Team B'}</h2>
              <p className="text-xs text-slate-400">
                Code: {match.teamB?.code || 'N/A'} • Manager: {match.teamB?.manager || 'N/A'}
              </p>
            </div>
            {match.teamB?.logoUrl ? (
              <img
                src={match.teamB.logoUrl}
                alt={match.teamB.name}
                className="w-14 h-14 rounded-xl object-cover bg-slate-900 p-1 border border-slate-800 shrink-0 order-1 md:order-2"
              />
            ) : (
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center font-black text-slate-950 text-base shrink-0 order-1 md:order-2"
                style={{ backgroundColor: match.teamB?.teamColor || '#38bdf8' }}
              >
                {match.teamB?.shortName || match.teamB?.name?.slice(0, 3).toUpperCase() || 'T2'}
              </div>
            )}
          </div>
        </div>

        {/* TOSS SUMMARY IF AVAILABLE */}
        {match.sport === 'CRICKET' && match.toss?.winnerTeamId && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-center gap-2.5 text-amber-300">
            <Coins className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Toss Result:</strong>{' '}
              {match.toss.winnerTeamId === match.teamAId ? match.teamA?.name : match.teamB?.name} won the toss and elected to{' '}
              <strong className="underline uppercase">{match.toss.decision}</strong> first.
            </span>
          </div>
        )}
      </Card>

      {/* TAB NAVIGATION SECTIONS */}
      <div className="flex items-center gap-2 p-1 bg-slate-900/90 rounded-xl border border-slate-800 overflow-x-auto">
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Settings className="w-3.5 h-3.5" /> MATCH SETTINGS
        </button>

        <button
          onClick={() => setActiveTab('squads')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'squads'
              ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Users className="w-3.5 h-3.5" /> TEAMS & PLAYING SQUADS
        </button>

        <button
          onClick={() => setActiveTab('officials_sponsors')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'officials_sponsors'
              ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Award className="w-3.5 h-3.5" /> OFFICIALS & SPONSORS
        </button>

        <button
          onClick={() => setActiveTab('live_scoring')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'live_scoring'
              ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Zap className="w-3.5 h-3.5" /> LIVE SCORING CONSOLE
        </button>

        <button
          onClick={() => setActiveTab('broadcast')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'broadcast'
              ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Tv className="w-3.5 h-3.5" /> BROADCAST GRAPHICS
        </button>

        <button
          onClick={() => setActiveTab('report')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'report'
              ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <FileText className="w-3.5 h-3.5" /> MATCH REPORT & SCORECARD
        </button>
      </div>

      {/* TAB CONTENT 1: MATCH SETTINGS */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-5 bg-slate-900/90 border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
              <Trophy className="w-4 h-4 text-emerald-400" /> Match Configuration
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Match Number:</span>
                <span className="font-bold text-slate-200">{match.matchNumber || 'Not Specified'}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Round / Stage:</span>
                <span className="font-bold text-slate-200">{match.round}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Venue & Pitch:</span>
                <span className="font-bold text-slate-200">
                  {match.venue} {match.ground ? `(${match.ground})` : ''}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Scheduled Date & Time:</span>
                <span className="font-bold text-slate-200">
                  {match.date} at {match.time}
                </span>
              </div>

              {match.description && (
                <div className="pt-2">
                  <span className="text-slate-400 block mb-1">Notes / Description:</span>
                  <p className="p-2.5 rounded-lg bg-slate-950 text-slate-300 leading-relaxed">{match.description}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Sport Specific Configurations */}
          <Card className="p-5 bg-slate-900/90 border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
              <Settings className="w-4 h-4 text-emerald-400" /> {match.sport} Specific Rules
            </h3>

            {match.sport === 'CRICKET' && (
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Match Format:</span>
                  <span className="font-bold text-emerald-400">{match.cricketConfig?.matchType || 'Standard'}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Tournament Default:</span>
                  <span className="font-semibold text-slate-300">
                    {match.tournament?.cricketDefaultOvers || match.tournament?.formatConfig?.defaultMatchConfig?.overs || 20} Overs
                  </span>
                </div>

                {match.cricketConfig?.isOversOverridden || (match.cricketConfig?.overs && match.cricketConfig.overs !== (match.tournament?.cricketDefaultOvers || 20)) ? (
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-amber-400 font-medium">Match Override:</span>
                    <span className="font-bold text-amber-400">{match.effectiveMatchOvers || match.cricketConfig?.overs} Overs</span>
                  </div>
                ) : null}

                <div className="flex justify-between py-1 border-b border-slate-800/60 bg-emerald-950/20 px-2 rounded-lg">
                  <span className="text-emerald-300 font-bold">Effective Match Overs:</span>
                  <span className="font-black text-emerald-300">{match.effectiveMatchOvers || match.cricketConfig?.overs || match.matchOvers || 20} Overs</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Powerplay Rules:</span>
                  <span className="font-bold text-slate-200">{match.cricketConfig?.powerplaySettings || 'Standard'}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Ball Specification:</span>
                  <span className="font-bold text-slate-200">{match.cricketConfig?.ballType || 'Standard Red'}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Pitch Type:</span>
                  <span className="font-bold text-slate-200">{match.cricketConfig?.pitchType || 'Turf Pitch'}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Boundary Distance:</span>
                  <span className="font-bold text-slate-200">{match.cricketConfig?.boundaryInfo || 'Standard'}</span>
                </div>
              </div>
            )}

            {match.sport === 'VOLLEYBALL' && match.volleyballConfig && (
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Format:</span>
                  <span className="font-bold text-slate-200">{match.volleyballConfig.format}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Points per Set:</span>
                  <span className="font-bold text-slate-200">{match.volleyballConfig.pointsPerSet}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Deciding Set Points:</span>
                  <span className="font-bold text-slate-200">{match.volleyballConfig.decidingSetPoints}</span>
                </div>
              </div>
            )}

            {match.sport === 'KABADDI' && match.kabaddiConfig && (
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Half Duration:</span>
                  <span className="font-bold text-slate-200">{match.kabaddiConfig.halfDuration} Mins</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Raid Rules:</span>
                  <span className="font-bold text-slate-200">{match.kabaddiConfig.raidRules || 'Standard'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Timeouts:</span>
                  <span className="font-bold text-slate-200">{match.kabaddiConfig.timeouts || 'Standard'}</span>
                </div>
              </div>
            )}

            {match.sport === 'FOOTBALL' && match.footballConfig && (
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Half Duration:</span>
                  <span className="font-bold text-slate-200">{match.footballConfig.halfDuration} Mins</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Extra Time Enabled:</span>
                  <span className="font-bold text-slate-200">{match.footballConfig.extraTimeEnabled ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Penalty Shootout:</span>
                  <span className="font-bold text-slate-200">{match.footballConfig.penaltyShootoutEnabled ? 'Yes' : 'No'}</span>
                </div>
              </div>
            )}

            {match.sport === 'TENNIS' && match.tennisConfig && (
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Match Format:</span>
                  <span className="font-bold text-slate-200">{match.tennisConfig.matchFormat?.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Discipline:</span>
                  <span className="font-bold text-slate-200">{match.tennisConfig.matchType}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Scoring Style:</span>
                  <span className="font-bold text-slate-200">{match.tennisConfig.scoringType}</span>
                </div>
              </div>
            )}

            {match.sport === 'BADMINTON' && match.badmintonConfig && (
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Match Format:</span>
                  <span className="font-bold text-slate-200">{match.badmintonConfig.matchFormat?.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Discipline:</span>
                  <span className="font-bold text-slate-200">{match.badmintonConfig.matchType}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Points Per Game:</span>
                  <span className="font-bold text-slate-200">{match.badmintonConfig.pointsPerGame} (Cap: {match.badmintonConfig.capPoints})</span>
                </div>
              </div>
            )}

            {match.sport === 'TABLE_TENNIS' && match.tableTennisConfig && (
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Match Format:</span>
                  <span className="font-bold text-slate-200">{match.tableTennisConfig.format?.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Discipline:</span>
                  <span className="font-bold text-slate-200">{match.tableTennisConfig.matchType}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Points Per Game:</span>
                  <span className="font-bold text-slate-200">{match.tableTennisConfig.pointsPerGame} (ITTF 2-Pt Rotation)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Table:</span>
                  <span className="font-bold text-slate-200">{match.tableTennisConfig.tableNumber || 'Table 1'}</span>
                </div>
              </div>
            )}

            {!['CRICKET', 'VOLLEYBALL', 'KABADDI', 'FOOTBALL', 'TENNIS', 'BADMINTON', 'TABLE_TENNIS'].includes(match.sport) && (
              <p className="text-xs text-slate-400">Standard regulations configured for {match.sport}.</p>
            )}
          </Card>
        </div>
      )}

      {/* TAB CONTENT 2: TEAMS & PLAYING SQUADS */}
      {activeTab === 'squads' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" /> Playing XI / Starting Squad Rosters
            </h3>
            <Button variant="secondary" size="sm" onClick={() => setIsEditModalOpen(true)} icon={<Edit2 className="w-3.5 h-3.5" />}>
              Manage Squads
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Team A Squad */}
            <Card className="p-5 bg-slate-900/90 border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-sm font-bold text-slate-100">{match.teamA?.name}</h4>
                </div>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {teamAPlayingPlayers.length} Playing Selected
                </span>
              </div>

              {teamAPlayingPlayers.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-500 space-y-2">
                  <p>No starting squad selected for {match.teamA?.name} yet.</p>
                  <Button variant="secondary" size="sm" onClick={() => setIsEditModalOpen(true)}>
                    + Select Starting XI
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Starting Players</p>
                  <div className="grid grid-cols-1 gap-1.5 max-h-[300px] overflow-y-auto pr-1">
                    {teamAPlayingPlayers.map((player) => (
                      <div
                        key={player.id}
                        className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 text-xs flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                            #{player.jerseyNumber || '-'}
                          </span>
                          <div>
                            <p className="font-bold text-slate-200">{player.name}</p>
                            <p className="text-[10px] text-slate-400">{player.role || 'Player'}</p>
                          </div>
                        </div>
                        <UserCheck2 className="w-4 h-4 text-emerald-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Team B Squad */}
            <Card className="p-5 bg-slate-900/90 border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-sky-400" />
                  <h4 className="text-sm font-bold text-slate-100">{match.teamB?.name}</h4>
                </div>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  {teamBPlayingPlayers.length} Playing Selected
                </span>
              </div>

              {teamBPlayingPlayers.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-500 space-y-2">
                  <p>No starting squad selected for {match.teamB?.name} yet.</p>
                  <Button variant="secondary" size="sm" onClick={() => setIsEditModalOpen(true)}>
                    + Select Starting XI
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Starting Players</p>
                  <div className="grid grid-cols-1 gap-1.5 max-h-[300px] overflow-y-auto pr-1">
                    {teamBPlayingPlayers.map((player) => (
                      <div
                        key={player.id}
                        className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 text-xs flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded bg-sky-500/20 text-sky-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                            #{player.jerseyNumber || '-'}
                          </span>
                          <div>
                            <p className="font-bold text-slate-200">{player.name}</p>
                            <p className="text-[10px] text-slate-400">{player.role || 'Player'}</p>
                          </div>
                        </div>
                        <UserCheck2 className="w-4 h-4 text-sky-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: OFFICIALS & SPONSORS */}
      {activeTab === 'officials_sponsors' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-5 bg-slate-900/90 border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
              <Award className="w-4 h-4 text-emerald-400" /> Match Officials
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Head Referee / Umpire 1:</span>
                <span className="font-bold text-slate-200">{match.officials?.referee || 'Unassigned'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Second Referee / Umpire 2:</span>
                <span className="font-bold text-slate-200">{match.officials?.umpire || 'Unassigned'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Official Scorer:</span>
                <span className="font-bold text-slate-200">{match.officials?.scorer || 'Unassigned'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Assistant / TV Umpire:</span>
                <span className="font-bold text-slate-200">{match.officials?.assistant || 'Unassigned'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Lead Commentator:</span>
                <span className="font-bold text-slate-200">{match.officials?.commentator || 'Unassigned'}</span>
              </div>
            </div>
          </Card>

          <Card className="p-5 bg-slate-900/90 border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
              <Sparkles className="w-4 h-4 text-amber-400" /> Sponsors & Broadcast Branding
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Match Title Sponsor</p>
                  <p className="font-bold text-slate-200 text-sm">{match.sponsors?.sponsorName || 'No Official Sponsor'}</p>
                </div>
                {match.sponsors?.sponsorLogoUrl && (
                  <img
                    src={match.sponsors.sponsorLogoUrl}
                    alt="Sponsor Logo"
                    className="h-8 max-w-[120px] object-contain bg-slate-900 p-1 rounded border border-slate-800"
                  />
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB CONTENT 4: LIVE SCORING CONSOLE */}
      {activeTab === 'live_scoring' && (
        <div className="rounded-2xl overflow-hidden border border-slate-800">
          {match.sport === 'CUSTOM' || match.sport === 'OTHER' || match.sport === 'PICKLEBALL' || match.sport === 'HANDBALL' || match.sport === 'SQUASH' ? (
            <CustomSportScoringConsole
              match={match}
              onMatchUpdated={() => loadMatchDetail()}
              onViewReport={() => setActiveTab('report')}
            />
          ) : match.sport === 'VOLLEYBALL' ? (
            <VolleyballScoringConsole
              match={match}
              onMatchStatusChange={loadMatchDetail}
            />
          ) : match.sport === 'KABADDI' ? (
            <KabaddiScoringConsole
              match={match}
              onMatchStatusChange={loadMatchDetail}
            />
          ) : match.sport === 'HOCKEY' ? (
            <HockeyScoringConsole
              match={match}
              onMatchStatusChange={loadMatchDetail}
            />
          ) : match.sport === 'FOOTBALL' ? (
            <FootballScoringConsole
              match={match}
              onStateChange={() => loadMatchDetail()}
              onViewReport={() => setActiveTab('report')}
            />
          ) : match.sport === 'BASKETBALL' ? (
            <BasketballScoringConsole
              match={match}
              onMatchStatusChange={loadMatchDetail}
              onViewReport={() => setActiveTab('report')}
            />
          ) : match.sport === 'TENNIS' ? (
            <TennisScoringConsole
              match={match}
              onMatchStatusChange={loadMatchDetail}
              onViewReport={() => setActiveTab('report')}
            />
          ) : match.sport === 'BADMINTON' ? (
            <BadmintonScoringConsole
              match={match}
              onMatchStatusChange={loadMatchDetail}
              onViewReport={() => setActiveTab('report')}
            />
          ) : match.sport === 'TABLE_TENNIS' ? (
            <TableTennisScoringConsole
              match={match}
              onMatchStatusChange={loadMatchDetail}
              onViewReport={() => setActiveTab('report')}
            />
          ) : (
            <CricketScoringConsole
              match={match}
              onMatchStatusChange={loadMatchDetail}
            />
          )}
        </div>
      )}

      {/* TAB CONTENT 5: BROADCAST GRAPHICS ENGINE */}
      {activeTab === 'broadcast' && (
        <BroadcastControl match={match} />
      )}

      {/* TAB CONTENT 6: MATCH REPORT & SCORECARD */}
      {activeTab === 'report' && (
        <MatchReportView matchId={match.id} />
      )}

      {/* EDIT MATCH MODAL */}
      {isEditModalOpen && (
        <MatchModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => loadMatchDetail()}
          initialMatch={match}
        />
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {isDeleteOpen && (
        <ConfirmDialog
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          onConfirm={handleDeleteConfirm}
          title="Delete Match Record"
          description={`Delete "${match.name}" permanently?`}
          confirmText="Yes, Delete Match"
          loading={deleting}
        />
      )}
    </div>
  );
};
