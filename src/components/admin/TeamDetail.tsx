import React, { useState, useEffect } from 'react';
import { Breadcrumbs } from '../ui/Breadcrumbs';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { Team, Player, Group, Tournament } from '../../types';
import { SPORTS_MASTER } from '../../constants/sports';
import { api } from '../../services/api';
import {
  Shield,
  User,
  Plus,
  Edit3,
  Trash2,
  Phone,
  MapPin,
  Award,
  Hash,
  Search,
  RefreshCw,
  UserCheck,
  Camera,
  Upload,
} from 'lucide-react';
import { TeamSheetScannerModal } from './teams/TeamSheetScannerModal';
import { useAuth } from '../../services/authContext';

export interface TeamDetailProps {
  teamId: string;
  onBackToTournament: () => void;
  onEditTeam: (team: Team) => void;
  onAddPlayer: (teamId: string) => void;
  onEditPlayer: (player: Player) => void;
  onDeletePlayer: (player: Player) => void;
  onOpenPlayerDetail: (player: Player) => void;
  refreshTrigger?: number;
}

export const TeamDetail: React.FC<TeamDetailProps> = ({
  teamId,
  onBackToTournament,
  onEditTeam,
  onAddPlayer,
  onEditPlayer,
  onDeletePlayer,
  onOpenPlayerDetail,
  refreshTrigger,
}) => {
  const [data, setData] = useState<{
    team: Team | null;
    players: Player[];
    group: Group | null;
    tournament: Tournament | null;
  }>({
    team: null,
    players: [],
    group: null,
    tournament: null,
  });

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      const res = await api.getTeam(teamId);
      setData({
        team: res.team,
        players: res.players || [],
        group: res.group || null,
        tournament: res.tournament || null,
      });
    } catch (err) {
      console.error('Failed to load team details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamData();
  }, [teamId, refreshTrigger]);

  if (loading || !data.team) {
    return (
      <div className="py-20 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
        <p className="text-xs font-semibold text-slate-400">Loading team roster...</p>
      </div>
    );
  }

  const { team, players, group, tournament } = data;
  const sportConfig = tournament?.sport ? SPORTS_MASTER[tournament.sport] : SPORTS_MASTER.CRICKET;

  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const isOwner = tournament?.ownerUserId === user?.id || tournament?.createdByUserId === user?.id;
  const userCollab = tournament?.collaborators?.find((c) => c.userId === user?.id || (user?.email && c.email === user.email));
  const isManager = isOwner || userCollab?.role === 'MANAGER';
  const canManage = isAdmin || isManager || !tournament;

  const filteredPlayers = players.filter(
    (p) =>
      !searchQuery ||
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.jerseyNumber?.toString().includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumbs
        items={[
          { label: 'Tournaments', onClick: onBackToTournament },
          ...(tournament ? [{ label: tournament.name, onClick: onBackToTournament }] : []),
          ...(group ? [{ label: group.name }] : []),
          { label: team.name, active: true },
        ]}
      />

      {/* Team Profile Header Banner */}
      <div
        className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 space-y-4 shadow-xl relative overflow-hidden"
        style={{
          borderLeftColor: team.teamColor || '#10b981',
          borderLeftWidth: '6px',
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center text-slate-500">
              {team.logoUrl ? (
                <img src={team.logoUrl} alt={team.name} className="w-full h-full object-contain" />
              ) : (
                <Shield className="w-8 h-8 text-emerald-400" />
              )}
            </div>

            <div>
              <div className="flex items-center flex-wrap gap-2 mb-1">
                <span className="font-mono text-xs font-bold text-slate-300 px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                  {team.shortName || team.code || 'TEAM'}
                </span>

                {group && (
                  <Badge variant="amber">
                    {group.name}
                  </Badge>
                )}

                <Badge variant={team.status === 'ACTIVE' ? 'emerald' : 'secondary'}>
                  {team.status || 'ACTIVE'}
                </Badge>
              </div>

              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                {team.name}
              </h1>

              <div className="flex items-center flex-wrap gap-4 text-xs text-slate-400 mt-2">
                {team.captain && (
                  <span className="flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span>Captain: <strong className="text-slate-200">{team.captain}</strong></span>
                  </span>
                )}
                {team.manager && (
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    <span>Manager: <strong className="text-slate-200">{team.manager}</strong></span>
                  </span>
                )}
                {team.homeLocation && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{team.homeLocation}</span>
                  </span>
                )}
                {team.contact && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-purple-400" />
                    <span>{team.contact}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {canManage ? (
              <>
                <Button
                  onClick={() => setIsScannerOpen(true)}
                  variant="outline"
                  size="sm"
                  icon={<Camera className="w-3.5 h-3.5 text-emerald-400" />}
                  className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
                >
                  IMPORT TEAM SHEET
                </Button>
                <Button
                  onClick={() => onEditTeam(team)}
                  variant="outline"
                  size="sm"
                  icon={<Edit3 className="w-3.5 h-3.5" />}
                >
                  EDIT TEAM
                </Button>
                <Button
                  onClick={() => onAddPlayer(team.id)}
                  variant="emerald"
                  size="md"
                  icon={<Plus className="w-4 h-4" />}
                >
                  ADD PLAYER
                </Button>
              </>
            ) : (
              <Badge variant="secondary">Read-only Squad</Badge>
            )}
          </div>
        </div>

        {/* Squad Count Bar */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-bold">Total Squad Size:</span>
            <span className="font-mono text-emerald-400 font-bold">{players.length} Players</span>
          </div>

          <div className="text-[11px] text-slate-400">
            Sport Engine: <span className="font-bold text-slate-200">{sportConfig?.name || 'Cricket'}</span>
          </div>
        </div>
      </div>

      {/* Roster Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search squad players by name, jersey, or role..."
            className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <Button
          onClick={() => onAddPlayer(team.id)}
          variant="emerald"
          size="sm"
          icon={<Plus className="w-3.5 h-3.5" />}
        >
          SAVE PLAYER
        </Button>
      </div>

      {/* Player Roster Grid */}
      {filteredPlayers.length === 0 ? (
        <Card className="text-center py-12 border-dashed border-slate-800 space-y-3">
          <User className="w-10 h-10 text-slate-600 mx-auto" />
          <div>
            <h3 className="text-sm font-bold text-slate-200">No Players Added To {team.name}</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              You can manually add squad members or scan/upload a printed or handwritten team sheet to auto-import the roster.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button
              onClick={() => setIsScannerOpen(true)}
              variant="outline"
              size="sm"
              icon={<Camera className="w-4 h-4 text-emerald-400" />}
              className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
            >
              SCAN TEAM SHEET
            </Button>
            <Button onClick={() => onAddPlayer(team.id)} variant="emerald" size="sm" icon={<Plus className="w-4 h-4" />}>
              ADD PLAYER MANUAL
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredPlayers.map((player) => (
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
                  <div className="flex items-center gap-1.5">
                    <h3
                      onClick={() => onOpenPlayerDetail(player)}
                      className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors truncate cursor-pointer"
                    >
                      {player.name}
                    </h3>
                  </div>

                  <p className="text-xs text-slate-400 font-medium">
                    {player.role || 'Player'}
                  </p>

                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    {player.isCaptain && <Badge variant="amber">Captain (C)</Badge>}
                    {player.isViceCaptain && <Badge variant="blue">Vice Captain (VC)</Badge>}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1 mt-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Style / Position:</span>
                    <span className="font-semibold text-slate-200 truncate max-w-[120px]">
                      {player.battingStyle || player.playingPosition || 'Standard'}
                    </span>
                  </div>
                  {player.bowlingStyle && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Bowling:</span>
                      <span className="font-semibold text-slate-200 truncate max-w-[120px]">
                        {player.bowlingStyle}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Player Row Actions */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
                <Button
                  onClick={() => onOpenPlayerDetail(player)}
                  variant="outline"
                  size="sm"
                  className="text-[11px]"
                >
                  View Profile
                </Button>

                {canManage && (
                  <div className="flex items-center gap-1">
                    <Button
                      onClick={() => onEditPlayer(player)}
                      variant="outline"
                      size="sm"
                      icon={<Edit3 className="w-3.5 h-3.5" />}
                      title="Edit Player"
                    />
                    <Button
                      onClick={() => onDeletePlayer(player)}
                      variant="danger"
                      size="sm"
                      icon={<Trash2 className="w-3.5 h-3.5" />}
                      title="Delete Player"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Team Sheet Scanner Modal */}
      {tournament && (
        <TeamSheetScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          tournamentId={tournament.id}
          tournamentName={tournament.name}
          sportHint={tournament.sport || 'CRICKET'}
          targetTeam={team}
          defaultGroupId={team.groupId || group?.id}
          groups={tournament ? (tournament as any).groups || [] : []}
          onImportSuccess={({ team: updatedTeam, playersCount }) => {
            fetchTeamData();
          }}
        />
      )}
    </div>
  );
};
