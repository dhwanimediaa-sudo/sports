import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Tournament, TournamentStatus, SportType } from '../../types';
import { SPORTS_MASTER, SPORTS_LIST } from '../../constants/sports';
import { api } from '../../services/api';
import { useAuth } from '../../services/authContext';
import { notify } from '../ui/Toast';
import {
  Trophy,
  Plus,
  Search,
  Filter,
  MapPin,
  Calendar,
  Layers,
  Users,
  UserCheck,
  ChevronRight,
  Edit3,
  Trash2,
  Copy,
  RefreshCw,
  Sparkles,
  Shield,
} from 'lucide-react';

export interface TournamentsListProps {
  onOpenTournament: (tournamentId: string) => void;
  onCreateTournament: () => void;
  onEditTournament: (tournament: Tournament) => void;
  onDeleteTournament: (tournament: Tournament) => void;
  refreshTrigger?: number;
}

export const TournamentsList: React.FC<TournamentsListProps> = ({
  onOpenTournament,
  onCreateTournament,
  onEditTournament,
  onDeleteTournament,
  refreshTrigger,
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sportFilter, setSportFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const res = await api.getTournaments({
        search: search || undefined,
        sport: sportFilter !== 'ALL' ? sportFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      setTournaments(res.tournaments || []);
    } catch (err) {
      console.error('Failed to load tournaments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, [search, sportFilter, statusFilter, refreshTrigger]);

  const handleDuplicate = async (tournament: Tournament) => {
    const newName = prompt(`Enter name for the duplicated tournament:`, `${tournament.name} (Copy)`);
    if (!newName) return;

    try {
      await api.duplicateTournament(tournament.id, {
        newName,
        includeGroups: true,
        includeTeams: true,
      });
      notify.success(`Tournament duplicated as "${newName}".`, 'Tournament Duplicated');
      fetchTournaments();
    } catch (err: any) {
      notify.error(err.message || 'Failed to duplicate tournament.', 'Duplicate Error');
    }
  };

  const getStatusBadgeVariant = (status: TournamentStatus) => {
    switch (status) {
      case 'LIVE':
        return 'rose';
      case 'UPCOMING':
        return 'emerald';
      case 'DRAFT':
        return 'amber';
      case 'COMPLETED':
        return 'purple';
      case 'CANCELLED':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-5 h-5 text-emerald-400" />
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              TOURNAMENT COMPETITION ENGINE
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Create multi-group league formats, auto-generate round robin fixtures, manage points tables & single-elimination brackets.
          </p>
        </div>

        <Button
          onClick={onCreateTournament}
          variant="emerald"
          size="md"
          icon={<Plus className="w-4 h-4" />}
          className="shrink-0 shadow-lg shadow-emerald-950/40"
        >
          CREATE TOURNAMENT
        </Button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative col-span-1 sm:col-span-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tournament name, venue, organizer..."
            className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500 shrink-0" />
          <select
            value={sportFilter}
            onChange={(e) => setSportFilter(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Sports</option>
            {SPORTS_LIST.map((s) => (
              <option key={s.id} value={s.id}>
                {s.icon} {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="UPCOMING">UPCOMING</option>
            <option value="LIVE">LIVE</option>
            <option value="DRAFT">DRAFT</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>

          <Button
            onClick={fetchTournaments}
            variant="outline"
            size="sm"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />}
            title="Refresh list"
          />
        </div>
      </div>

      {/* Tournaments Grid */}
      {loading ? (
        <div className="py-16 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-400">Loading tournaments database...</p>
        </div>
      ) : tournaments.length === 0 ? (
        <Card className="text-center py-12 border-dashed border-slate-800 bg-slate-950/50">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
            <Trophy className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-200">
            {search.trim()
              ? `No tournaments found matching "${search}"`
              : sportFilter !== 'ALL'
              ? `No ${sportFilter} tournaments found`
              : 'No tournaments yet.'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4 leading-relaxed">
            {search.trim() || sportFilter !== 'ALL'
              ? 'Try adjusting your search criteria or resetting filters to see more competitions.'
              : 'Create your first tournament to begin.'}
          </p>
          <div className="flex items-center justify-center gap-2">
            {(search.trim() || sportFilter !== 'ALL') && (
              <Button
                onClick={() => {
                  setSearch('');
                  setSportFilter('ALL');
                }}
                variant="outline"
                size="sm"
              >
                Clear Filters
              </Button>
            )}
            <Button onClick={onCreateTournament} variant="emerald" size="sm" icon={<Plus className="w-4 h-4" />}>
              + CREATE TOURNAMENT
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tournaments.map((t) => {
            const sportInfo = SPORTS_MASTER[t.sport] || SPORTS_MASTER.OTHER;
            const isOwner = t.ownerUserId === user?.id || t.createdByUserId === user?.id;
            const collab = t.collaborators?.find((c) => c.userId === user?.id || c.email === user?.email);
            const canManage = isAdmin || isOwner || collab?.role === 'MANAGER';

            return (
              <div
                key={t.id}
                className="group relative rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 p-5 transition-all flex flex-col justify-between shadow-lg"
              >
                <div>
                  {/* Top Badge Row */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-950 border border-slate-800 text-slate-300 flex items-center gap-1.5">
                        <span>{sportInfo.icon}</span>
                        <span>{sportInfo.name}</span>
                      </span>

                      {isOwner ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                          OWNER
                        </span>
                      ) : collab ? (
                        <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold">
                          {collab.role}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {t.competitionFormat && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                          {t.competitionFormat.replace('_', ' ')}
                        </span>
                      )}
                      <Badge variant={getStatusBadgeVariant(t.status)}>
                        {t.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Title & Logo Header */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 shrink-0 overflow-hidden flex items-center justify-center text-slate-500">
                      {t.logoUrl ? (
                        <img src={t.logoUrl} alt={t.name} referrerPolicy="no-referrer" className="w-full h-full object-contain" />
                      ) : (
                        <Trophy className="w-6 h-6 text-slate-600 group-hover:text-emerald-400 transition-colors" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                        {t.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                        {t.season && <span>Season {t.season}</span>}
                        {t.sponsor && <span className="text-amber-400 truncate">• {t.sponsor}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Metadata Row */}
                  <div className="space-y-1.5 text-xs text-slate-400 mb-4 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                    {(t.venue || t.location) && (
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">{t.venue || t.location}</span>
                      </div>
                    )}
                    {(t.startDate || t.endDate) && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span>
                          {t.startDate || 'TBD'} {t.endDate ? `to ${t.endDate}` : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Summary Metric Counters */}
                  <div className="grid grid-cols-3 gap-2 text-center py-2 px-1 mb-4 rounded-xl bg-slate-950/90 border border-slate-800">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-semibold flex items-center justify-center gap-1">
                        <Layers className="w-3 h-3 text-amber-400" />
                        <span>Groups</span>
                      </div>
                      <div className="text-sm font-black text-white font-mono mt-0.5">{t.groupCount ?? 0}</div>
                    </div>

                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-semibold flex items-center justify-center gap-1">
                        <Users className="w-3 h-3 text-blue-400" />
                        <span>Teams</span>
                      </div>
                      <div className="text-sm font-black text-white font-mono mt-0.5">{t.teamCount ?? 0}</div>
                    </div>

                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-semibold flex items-center justify-center gap-1">
                        <UserCheck className="w-3 h-3 text-emerald-400" />
                        <span>Players</span>
                      </div>
                      <div className="text-sm font-black text-white font-mono mt-0.5">{t.playerCount ?? 0}</div>
                    </div>
                  </div>
                </div>

                {/* Primary Card Actions */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800/80">
                  <div className="flex items-center gap-1">
                    {canManage && (
                      <>
                        <Button
                          onClick={() => onEditTournament(t)}
                          variant="outline"
                          size="sm"
                          icon={<Edit3 className="w-3.5 h-3.5" />}
                          title="Edit Tournament"
                        >
                          Edit
                        </Button>
                        <Button
                          onClick={() => handleDuplicate(t)}
                          variant="outline"
                          size="sm"
                          icon={<Copy className="w-3.5 h-3.5 text-slate-400" />}
                          title="Duplicate Tournament"
                        />
                        <Button
                          onClick={() => onDeleteTournament(t)}
                          variant="danger"
                          size="sm"
                          icon={<Trash2 className="w-3.5 h-3.5" />}
                          title="Delete Tournament"
                        />
                      </>
                    )}
                  </div>

                  <Button
                    onClick={() => onOpenTournament(t.id)}
                    variant="emerald"
                    size="sm"
                    icon={<ChevronRight className="w-4 h-4" />}
                  >
                    OPEN
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
