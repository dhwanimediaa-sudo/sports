import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Team, Tournament, Group, Player } from '../../types';
import { api } from '../../services/api';
import {
  Users,
  Search,
  Plus,
  Shield,
  Edit3,
  Trash2,
  RefreshCw,
  Filter,
  ChevronRight,
  Camera,
  LayoutGrid,
  Layers,
} from 'lucide-react';
import { TeamSheetScannerModal } from './teams/TeamSheetScannerModal';
import { TeamHierarchyTreeView } from './TeamHierarchyTreeView';
import { PlayerModal } from './PlayerModal';

export interface TeamsListProps {
  onOpenTeam: (teamId: string) => void;
  onCreateTeam: () => void;
  onEditTeam: (team: Team) => void;
  onDeleteTeam: (team: Team) => void;
  refreshTrigger?: number;
}

export const TeamsList: React.FC<TeamsListProps> = ({
  onOpenTeam,
  onCreateTeam,
  onEditTeam,
  onDeleteTeam,
  refreshTrigger,
}) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState<'CARDS' | 'TREE'>('TREE');
  const [search, setSearch] = useState('');
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('ALL');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerTargetTeamId, setScannerTargetTeamId] = useState<string | undefined>(undefined);
  const [scannerTargetGroupId, setScannerTargetGroupId] = useState<string | undefined>(undefined);

  // Player editing modal state for tree view
  const [playerModalOpen, setPlayerModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [activePlayerTeamId, setActivePlayerTeamId] = useState<string>('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [teamsRes, tournsRes, groupsRes, playersRes] = await Promise.all([
        api.getTeams({
          search: search || undefined,
          tournamentId: selectedTournamentId !== 'ALL' ? selectedTournamentId : undefined,
        }),
        api.getTournaments(),
        api.getGroups(),
        api.getPlayers({
          tournamentId: selectedTournamentId !== 'ALL' ? selectedTournamentId : undefined,
        }),
      ]);

      setTeams(teamsRes.teams || []);
      setTournaments(tournsRes.tournaments || []);
      setGroups(groupsRes.groups || []);
      setPlayers(playersRes.players || []);
    } catch (err) {
      console.error('Failed to load global teams list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, selectedTournamentId, refreshTrigger]);

  const activeTournament =
    (selectedTournamentId !== 'ALL'
      ? tournaments.find((t) => t.id === selectedTournamentId)
      : tournaments[0]) || {
      id: 'default',
      name: 'SportsPulse Championship',
      sport: 'CRICKET',
    };

  const handleAddPlayerForTeam = (teamId: string) => {
    setActivePlayerTeamId(teamId);
    setSelectedPlayer(null);
    setPlayerModalOpen(true);
  };

  const handleEditPlayerForTeam = (player: Player) => {
    setActivePlayerTeamId(player.teamId);
    setSelectedPlayer(player);
    setPlayerModalOpen(true);
  };

  const handleDeletePlayer = async (playerId: string) => {
    try {
      await api.deletePlayer(playerId);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete player');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-blue-400" />
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              TEAM & SQUAD HIERARCHY
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Organize teams, groups, players, jersey numbers, and dynamic sport positions.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2 shrink-0">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('TREE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'TREE'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Hierarchy Tree</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('CARDS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'CARDS'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid Cards</span>
            </button>
          </div>

          <Button
            onClick={() => {
              setScannerTargetTeamId(undefined);
              setScannerTargetGroupId(undefined);
              setIsScannerOpen(true);
            }}
            variant="outline"
            size="md"
            icon={<Camera className="w-4 h-4 text-emerald-400" />}
            className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
            disabled={tournaments.length === 0}
          >
            SCAN TEAM SHEET
          </Button>

          <Button
            onClick={onCreateTeam}
            variant="emerald"
            size="md"
            icon={<Plus className="w-4 h-4" />}
          >
            ADD TEAM
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search team name, tag, or captain..."
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

          <Button
            onClick={fetchData}
            variant="outline"
            size="sm"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />}
          />
        </div>
      </div>

      {/* Main Content: Tree vs Cards */}
      {loading ? (
        <div className="py-16 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-400">Loading team database...</p>
        </div>
      ) : viewMode === 'TREE' ? (
        <TeamHierarchyTreeView
          tournament={activeTournament as any}
          groups={groups.filter(
            (g) => selectedTournamentId === 'ALL' || g.tournamentId === selectedTournamentId
          )}
          teams={teams}
          players={players}
          sport={activeTournament.sport || 'CRICKET'}
          onAddTeam={(groupId) => onCreateTeam()}
          onEditTeam={(team) => onEditTeam(team)}
          onDeleteTeam={(teamId) => {
            const t = teams.find((x) => x.id === teamId);
            if (t) onDeleteTeam(t);
          }}
          onAddPlayer={handleAddPlayerForTeam}
          onEditPlayer={handleEditPlayerForTeam}
          onDeletePlayer={handleDeletePlayer}
          onOpenScanner={(teamId, groupId) => {
            setScannerTargetTeamId(teamId);
            setScannerTargetGroupId(groupId);
            setIsScannerOpen(true);
          }}
          onViewPlayerProfile={(player) => {
            handleEditPlayerForTeam(player);
          }}
        />
      ) : teams.length === 0 ? (
        <Card className="text-center py-12 border-dashed border-slate-800">
          <Shield className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-200">
            {search.trim()
              ? `No teams found for "${search}"`
              : selectedTournamentId !== 'ALL'
              ? 'No teams in selected tournament'
              : 'No teams added yet'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            {search.trim() || selectedTournamentId !== 'ALL'
              ? 'Try modifying your search query or choosing All Tournaments.'
              : 'Add your first team to build the tournament roster.'}
          </p>
          <div className="flex items-center justify-center gap-2">
            {(search.trim() || selectedTournamentId !== 'ALL') && (
              <Button
                onClick={() => {
                  setSearch('');
                  setSelectedTournamentId('ALL');
                }}
                variant="outline"
                size="sm"
              >
                Clear Filters
              </Button>
            )}
            <Button onClick={onCreateTeam} variant="emerald" size="sm" icon={<Plus className="w-4 h-4" />}>
              ADD TEAM
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {teams.map((team) => {
            const tournament = tournaments.find((t) => t.id === team.tournamentId);
            const group = groups.find((g) => g.id === team.groupId);

            return (
              <div
                key={team.id}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-4 group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center text-slate-500">
                        {team.logoUrl ? (
                          <img src={team.logoUrl} alt={team.name} className="w-full h-full object-contain" />
                        ) : (
                          <Shield className="w-6 h-6 text-slate-600" />
                        )}
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                          {team.name}
                        </h3>
                        <p className="text-xs font-mono font-semibold text-slate-400">
                          {team.shortName || team.code || 'TEAM'}
                        </p>
                      </div>
                    </div>

                    {group && (
                      <Badge variant="amber">
                        {group.name}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1 text-xs text-slate-400 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    {tournament && (
                      <p className="flex justify-between">
                        <span className="text-slate-500">Tournament:</span>
                        <span className="font-semibold text-slate-200 truncate max-w-[150px]">{tournament.name}</span>
                      </p>
                    )}
                    {team.captain && (
                      <p className="flex justify-between">
                        <span className="text-slate-500">Captain:</span>
                        <span className="font-semibold text-slate-200">{team.captain}</span>
                      </p>
                    )}
                    <p className="flex justify-between">
                      <span className="text-slate-500">Rostered Players:</span>
                      <span className="font-bold text-emerald-400 font-mono">{team.playerCount ?? 0}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800">
                  <div className="flex items-center gap-1">
                    <Button
                      onClick={() => onEditTeam(team)}
                      variant="outline"
                      size="sm"
                      icon={<Edit3 className="w-3.5 h-3.5" />}
                    >
                      Edit
                    </Button>
                    <Button
                      onClick={() => onDeleteTeam(team)}
                      variant="danger"
                      size="sm"
                      icon={<Trash2 className="w-3.5 h-3.5" />}
                    />
                  </div>

                  <Button
                    onClick={() => onOpenTeam(team.id)}
                    variant="emerald"
                    size="sm"
                    icon={<ChevronRight className="w-3.5 h-3.5" />}
                  >
                    OPEN TEAM
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Team Sheet Scanner Modal */}
      {activeTournament && (
        <TeamSheetScannerModal
          isOpen={isScannerOpen}
          onClose={() => {
            setIsScannerOpen(false);
            setScannerTargetTeamId(undefined);
            setScannerTargetGroupId(undefined);
          }}
          tournamentId={activeTournament.id}
          tournamentName={activeTournament.name}
          targetTeamId={scannerTargetTeamId}
          targetGroupId={scannerTargetGroupId}
          sportHint={activeTournament.sport || 'CRICKET'}
          groups={groups.filter((g) => g.tournamentId === activeTournament.id)}
          onImportSuccess={({ team, playersCount }) => {
            fetchData();
            onOpenTeam(team.id);
          }}
        />
      )}

      {/* Player Modal for Direct Add/Edit from Hierarchy Tree */}
      {playerModalOpen && (
        <PlayerModal
          isOpen={playerModalOpen}
          onClose={() => {
            setPlayerModalOpen(false);
            setSelectedPlayer(null);
          }}
          teamId={activePlayerTeamId}
          tournamentId={activeTournament.id}
          sport={activeTournament.sport || 'CRICKET'}
          player={selectedPlayer}
          onSuccess={() => {
            setPlayerModalOpen(false);
            setSelectedPlayer(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
};
