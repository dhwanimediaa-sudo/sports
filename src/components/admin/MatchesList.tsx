import React, { useState, useEffect } from 'react';
import {
  Match,
  MatchStatus,
  Tournament,
  Group,
  SportType,
} from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../services/authContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { EmptyState } from '../ui/EmptyState';
import { notify } from '../ui/Toast';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  MapPin,
  Trophy,
  Copy,
  Edit2,
  Trash2,
  ExternalLink,
  Shield,
  Activity,
  Layers,
  Radio,
  Tv,
} from 'lucide-react';

export interface MatchesListProps {
  onSelectMatch: (matchId: string) => void;
  onCreateMatch: () => void;
  onEditMatch: (match: Match) => void;
  defaultTournamentId?: string;
}

export const MatchesList: React.FC<MatchesListProps> = ({
  onSelectMatch,
  onCreateMatch,
  onEditMatch,
  defaultTournamentId = '',
}) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  // Filter State
  const [search, setSearch] = useState('');
  const [selectedTournament, setSelectedTournament] = useState<string>(defaultTournamentId);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedSport, setSelectedSport] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onlyMyAssignments, setOnlyMyAssignments] = useState(false);

  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  // Delete modal state
  const [matchToDelete, setMatchToDelete] = useState<Match | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load matches
  const loadMatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const [matchesRes, tourRes, groupRes] = await Promise.all([
        api.getMatches({
          tournamentId: selectedTournament || undefined,
          groupId: selectedGroup || undefined,
          sport: selectedSport || undefined,
          status: selectedStatus || undefined,
          search: search || undefined,
        }),
        api.getTournaments(),
        api.getGroups(),
      ]);

      setMatches(matchesRes.matches || []);
      setTournaments(tourRes.tournaments || []);
      setGroups(groupRes.groups || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch matches list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, [selectedTournament, selectedGroup, selectedSport, selectedStatus]);

  // Handle Search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadMatches();
  };

  // Handle Duplicate Match
  const handleDuplicate = async (match: Match) => {
    try {
      await api.duplicateMatch(match.id);
      notify.success(`Match duplicated as "${match.name} (Copy)".`, 'Match Duplicated');
      loadMatches();
    } catch (err: any) {
      notify.error(err.message || 'Failed to duplicate match.', 'Duplicate Error');
    }
  };

  // Handle Delete Match
  const handleDeleteConfirm = async () => {
    if (!matchToDelete) return;
    setDeleting(true);
    try {
      await api.deleteMatch(matchToDelete.id);
      notify.info(`Match "${matchToDelete.name}" has been deleted.`, 'Match Deleted');
      setMatchToDelete(null);
      loadMatches();
    } catch (err: any) {
      notify.error(err.message || 'Failed to delete match.', 'Delete Error');
    } finally {
      setDeleting(false);
    }
  };

  // Helper for Status Badge Styling
  const isOwnerOrManager = (m: Match) => {
    if (isAdmin) return true;
    if (m.ownerUserId === user?.id || m.createdByUserId === user?.id) return true;
    const tour = tournaments.find((t) => t.id === m.tournamentId);
    if (tour?.ownerUserId === user?.id || tour?.createdByUserId === user?.id) return true;
    const role = tour?.collaborators?.find((c) => c.userId === user?.id || c.email === user?.email)?.role;
    return role === 'MANAGER';
  };

  const displayedMatches = matches.filter((m) => {
    if (onlyMyAssignments) {
      const isAssigned =
        m.scorerUserId === user?.id ||
        m.scorerUserIds?.includes(user?.id || '') ||
        m.broadcastOperatorUserId === user?.id ||
        m.broadcasterUserIds?.includes(user?.id || '');
      return isAssigned;
    }
    return true;
  });

  const renderStatusBadge = (status: MatchStatus) => {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="neutral">DRAFT</Badge>;
      case 'SCHEDULED':
        return <Badge variant="info">SCHEDULED</Badge>;
      case 'READY':
        return <Badge variant="success">READY</Badge>;
      case 'LIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            LIVE
          </span>
        );
      case 'COMPLETED':
        return <Badge variant="success">COMPLETED</Badge>;
      case 'CANCELLED':
        return <Badge variant="danger">CANCELLED</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const filteredGroups = selectedTournament
    ? groups.filter((g) => g.tournamentId === selectedTournament)
    : groups;

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            Match Management & Fixtures
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Create and setup match fixtures, sport rules, tossing, and playing rosters.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={onCreateMatch}
          icon={<Plus className="w-4 h-4 text-slate-950" />}
        >
          Create Match
        </Button>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4 bg-slate-900/90 border-slate-800 space-y-3">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Search */}
          <div className="md:col-span-1 relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search match / venue..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
            />
          </div>

          {/* Tournament Filter */}
          <div>
            <select
              value={selectedTournament}
              onChange={(e) => {
                setSelectedTournament(e.target.value);
                setSelectedGroup('');
              }}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
            >
              <option value="">All Tournaments</option>
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Group Filter */}
          <div>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
            >
              <option value="">All Groups</option>
              {filteredGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sport Filter */}
          <div>
            <select
              value={selectedSport}
              onChange={(e) => setSelectedSport(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
            >
              <option value="">All Sports</option>
              <option value="CRICKET">Cricket</option>
              <option value="VOLLEYBALL">Volleyball</option>
              <option value="KABADDI">Kabaddi</option>
              <option value="FOOTBALL">Football</option>
              <option value="HOCKEY">Hockey</option>
              <option value="BASKETBALL">Basketball</option>
              <option value="TENNIS">Tennis</option>
              <option value="BADMINTON">Badminton</option>
              <option value="TABLE_TENNIS">Table Tennis</option>
              <option value="OTHER">Other Sports</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="READY">Ready</option>
              <option value="LIVE">Live</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </form>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => setOnlyMyAssignments(!onlyMyAssignments)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              onlyMyAssignments
                ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-md shadow-emerald-500/20'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>My Assigned Matches Only</span>
          </button>
          <span className="text-xs text-slate-500 font-mono">
            Showing {displayedMatches.length} match{displayedMatches.length === 1 ? '' : 'es'}
          </span>
        </div>
      </Card>

      {/* Match Cards List */}
      {loading ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-400 font-medium">Fetching real database matches...</p>
        </div>
      ) : displayedMatches.length === 0 ? (
        <Card className="p-8 text-center bg-slate-900/60 border-slate-800">
          <EmptyState
            title={onlyMyAssignments ? "No Assigned Matches Found" : "No matches created yet."}
            description={onlyMyAssignments ? "You have no matches assigned to your user account." : "Create a match or generate fixtures."}
            actionLabel="+ CREATE MATCH"
            onAction={onCreateMatch}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {displayedMatches.map((match) => {
            const isScorer = match.scorerUserId === user?.id || match.scorerUserIds?.includes(user?.id || '');
            const isBroadcaster = match.broadcastOperatorUserId === user?.id || match.broadcasterUserIds?.includes(user?.id || '');
            const canManage = isOwnerOrManager(match);

            return (
              <Card
                key={match.id}
                className="p-4 bg-slate-900/90 border-slate-800/80 hover:border-slate-700 transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Header: Tournament, Group & Status */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="font-bold text-emerald-400 flex items-center gap-1">
                          <Trophy className="w-3.5 h-3.5" />
                          {match.tournament?.name || 'Tournament'}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold text-[11px]">
                          {match.group?.name || 'Group'}
                        </span>
                        {match.round && (
                          <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[11px]">
                            {match.round}
                          </span>
                        )}
                        {isScorer && (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-[10px] flex items-center gap-1">
                            <Radio className="w-3 h-3" /> Scorer
                          </span>
                        )}
                        {isBroadcaster && (
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-[10px] flex items-center gap-1">
                            <Tv className="w-3 h-3" /> Broadcaster
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-black text-slate-100">{match.name}</h3>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold text-[10px] uppercase tracking-wider">
                        {match.sport}
                      </span>
                      {renderStatusBadge(match.status)}
                    </div>
                  </div>

                {/* Teams VS Section */}
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 grid grid-cols-11 items-center gap-2">
                  {/* Team A */}
                  <div className="col-span-5 flex items-center gap-2.5">
                    {match.teamA?.logoUrl ? (
                      <img
                        src={match.teamA.logoUrl}
                        alt={match.teamA.name}
                        className="w-9 h-9 rounded-lg object-cover bg-slate-900 p-0.5 border border-slate-800"
                      />
                    ) : (
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-slate-950 text-xs shrink-0"
                        style={{ backgroundColor: match.teamA?.teamColor || '#10b981' }}
                      >
                        {match.teamA?.shortName || match.teamA?.name?.slice(0, 3).toUpperCase() || 'T1'}
                      </div>
                    )}
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-100 truncate">{match.teamA?.name || 'Team A'}</p>
                      <p className="text-[10px] text-slate-400">
                        {match.teamASquad?.playingIds?.length ? `${match.teamASquad.playingIds.length} Playing` : 'Squad Pending'}
                      </p>
                    </div>
                  </div>

                  {/* VS Badge */}
                  <div className="col-span-1 text-center">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-[10px] font-black text-slate-400 flex items-center justify-center mx-auto border border-slate-700">
                      VS
                    </span>
                  </div>

                  {/* Team B */}
                  <div className="col-span-5 flex items-center justify-end gap-2.5 text-right">
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-100 truncate">{match.teamB?.name || 'Team B'}</p>
                      <p className="text-[10px] text-slate-400">
                        {match.teamBSquad?.playingIds?.length ? `${match.teamBSquad.playingIds.length} Playing` : 'Squad Pending'}
                      </p>
                    </div>
                    {match.teamB?.logoUrl ? (
                      <img
                        src={match.teamB.logoUrl}
                        alt={match.teamB.name}
                        className="w-9 h-9 rounded-lg object-cover bg-slate-900 p-0.5 border border-slate-800"
                      />
                    ) : (
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-slate-950 text-xs shrink-0"
                        style={{ backgroundColor: match.teamB?.teamColor || '#38bdf8' }}
                      >
                        {match.teamB?.shortName || match.teamB?.name?.slice(0, 3).toUpperCase() || 'T2'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Match Metadata: Date, Time, Venue, Sport Details */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-400 pt-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{match.date}</span>
                  </div>

                  <div className="flex items-center gap-1.5 truncate">
                    <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{match.time}</span>
                  </div>

                  <div className="flex items-center gap-1.5 truncate col-span-2 sm:col-span-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{match.venue}</span>
                  </div>
                </div>

                {/* Sport specific summary */}
                {match.sport === 'CRICKET' && (
                  <div className="p-2 rounded-lg bg-slate-950/40 text-[11px] text-slate-300 flex items-center justify-between border border-slate-800/60">
                    <span className="flex items-center gap-1.5">
                      <span>Overs: <strong className="text-emerald-400 font-bold">{match.effectiveMatchOvers || match.cricketConfig?.overs || match.matchOvers || 20} Overs</strong></span>
                      {match.cricketConfig?.isOversOverridden && (
                        <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-semibold border border-amber-500/30">
                          Override
                        </span>
                      )}
                    </span>
                    {match.toss?.winnerTeamId ? (
                      <span className="text-amber-400 font-semibold">
                        Toss: {match.toss.winnerTeamId === match.teamAId ? match.teamA?.name : match.teamB?.name} ({match.toss.decision})
                      </span>
                    ) : (
                      <span className="text-slate-500">Toss: Pending</span>
                    )}
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onSelectMatch(match.id)}
                  icon={<ExternalLink className="w-3.5 h-3.5 text-slate-950" />}
                >
                  Open Match
                </Button>

                {canManage && (
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onEditMatch(match)}
                      icon={<Edit2 className="w-3.5 h-3.5" />}
                    >
                      Edit
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDuplicate(match)}
                      icon={<Copy className="w-3.5 h-3.5 text-indigo-400" />}
                      title="Duplicate Match Fixture"
                    >
                      Duplicate
                    </Button>

                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setMatchToDelete(match)}
                      icon={<Trash2 className="w-3.5 h-3.5" />}
                    />
                  </div>
                )}
              </div>
            </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {matchToDelete && (
        <ConfirmDialog
          isOpen={!!matchToDelete}
          onClose={() => setMatchToDelete(null)}
          onConfirm={handleDeleteConfirm}
          title="Delete Match Fixture"
          description={`Are you sure you want to delete "${matchToDelete.name}"? This action is permanent.`}
          confirmText="Yes, Delete Match"
          loading={deleting}
        />
      )}
    </div>
  );
};
