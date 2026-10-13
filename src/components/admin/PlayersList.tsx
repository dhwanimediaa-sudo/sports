import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Player, Team, Tournament } from '../../types';
import { SPORTS_MASTER } from '../../constants/sports';
import { api } from '../../services/api';
import {
  UserCheck,
  Search,
  Plus,
  User,
  Shield,
  Edit3,
  Trash2,
  RefreshCw,
  Filter,
} from 'lucide-react';

export interface PlayersListProps {
  onOpenPlayerDetail: (player: Player) => void;
  onEditPlayer: (player: Player) => void;
  onDeletePlayer: (player: Player) => void;
  refreshTrigger?: number;
}

export const PlayersList: React.FC<PlayersListProps> = ({
  onOpenPlayerDetail,
  onEditPlayer,
  onDeletePlayer,
  refreshTrigger,
}) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('ALL');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pRes, tRes, tmRes] = await Promise.all([
        api.getPlayers({
          search: search || undefined,
          tournamentId: selectedTournamentId !== 'ALL' ? selectedTournamentId : undefined,
          role: selectedRole !== 'ALL' ? selectedRole : undefined,
        }),
        api.getTournaments(),
        api.getTeams(),
      ]);

      setPlayers(pRes.players || []);
      setTournaments(tRes.tournaments || []);
      setTeams(tmRes.teams || []);
    } catch (err) {
      console.error('Failed to load global players list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, selectedTournamentId, selectedRole, refreshTrigger]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <UserCheck className="w-5 h-5 text-emerald-400" />
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              PLAYER DATABASE & ROSTERS
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Centralized player directory with jersey assignments, position roles, and career record tracking.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search player name, jersey number..."
            className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500 shrink-0" />
          <select
            value={selectedTournamentId}
            onChange={(e) => setSelectedTournamentId(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Tournaments</option>
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Roles / Positions</option>
            <option value="Batter">Batter</option>
            <option value="Bowler">Bowler</option>
            <option value="All-Rounder">All-Rounder</option>
            <option value="Wicket Keeper">Wicket Keeper</option>
            <option value="Raider">Raider</option>
            <option value="Defender">Defender</option>
            <option value="Setter">Setter</option>
            <option value="Goalkeeper">Goalkeeper</option>
            <option value="Striker">Striker</option>
          </select>

          <Button
            onClick={fetchData}
            variant="outline"
            size="sm"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />}
          />
        </div>
      </div>

      {/* Players List Grid */}
      {loading ? (
        <div className="py-16 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-400">Loading player records...</p>
        </div>
      ) : players.length === 0 ? (
        <Card className="text-center py-12 border-dashed border-slate-800">
          <User className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-200">
            {search.trim()
              ? `No players found for "${search}"`
              : selectedRole !== 'ALL'
              ? `No players found with role "${selectedRole}"`
              : 'No players registered'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            {search.trim() || selectedRole !== 'ALL' || selectedTournamentId !== 'ALL'
              ? 'Try clearing active filters to see all player profiles.'
              : 'Add players individually or scan a team sheet.'}
          </p>
          {(search.trim() || selectedRole !== 'ALL' || selectedTournamentId !== 'ALL') && (
            <div className="flex items-center justify-center gap-2">
              <Button
                onClick={() => {
                  setSearch('');
                  setSelectedRole('ALL');
                  setSelectedTournamentId('ALL');
                }}
                variant="outline"
                size="sm"
              >
                Clear Filters
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {players.map((player) => {
            const team = teams.find((t) => t.id === player.teamId);
            const tournament = tournaments.find((t) => t.id === player.tournamentId || t.id === team?.tournamentId);
            const sportConfig = tournament?.sport ? SPORTS_MASTER[tournament.sport] : SPORTS_MASTER.CRICKET;

            return (
              <div
                key={player.id}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-3 group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center text-slate-600">
                      {player.photoUrl ? (
                        <img src={player.photoUrl} alt={player.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-6 h-6" />
                      )}
                    </div>

                    <div className="text-right">
                      {player.jerseyNumber && (
                        <span className="font-mono text-sm font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          #{player.jerseyNumber}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3
                      onClick={() => onOpenPlayerDetail(player)}
                      className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors truncate cursor-pointer"
                    >
                      {player.name}
                    </h3>

                    <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                      <span>{sportConfig?.icon || '🥇'}</span>
                      <span>{player.role || 'Player'}</span>
                    </p>

                    {team && (
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 truncate mt-0.5">
                        <Shield className="w-3 h-3 text-slate-500" />
                        <span className="truncate">{team.name}</span>
                      </p>
                    )}

                    <div className="flex items-center gap-1 flex-wrap pt-1">
                      {player.isCaptain && <Badge variant="amber">Captain</Badge>}
                      {player.isViceCaptain && <Badge variant="blue">VC</Badge>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
                  <Button
                    onClick={() => onOpenPlayerDetail(player)}
                    variant="outline"
                    size="sm"
                    className="text-[11px]"
                  >
                    Profile
                  </Button>

                  <div className="flex items-center gap-1">
                    <Button
                      onClick={() => onEditPlayer(player)}
                      variant="outline"
                      size="sm"
                      icon={<Edit3 className="w-3.5 h-3.5" />}
                    />
                    <Button
                      onClick={() => onDeletePlayer(player)}
                      variant="danger"
                      size="sm"
                      icon={<Trash2 className="w-3.5 h-3.5" />}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
