import React, { useState, useMemo } from 'react';
import {
  Tournament,
  Group,
  Team,
  Player,
  SportType,
} from '../../types';
import {
  ChevronRight,
  ChevronDown,
  Users,
  User,
  Shield,
  Search,
  Plus,
  Camera,
  Crown,
  Star,
  Edit2,
  Trash2,
  Filter,
  Layers,
  Sparkles,
  Award,
  Maximize2,
  Minimize2,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { SPORTS_MASTER } from '../../constants/sports';

interface TeamHierarchyTreeViewProps {
  tournament: Tournament;
  groups: Group[];
  teams: Team[];
  players: Player[];
  sport?: SportType;
  onAddTeam: (groupId?: string) => void;
  onEditTeam: (team: Team) => void;
  onDeleteTeam: (teamId: string) => void;
  onAddPlayer: (teamId: string) => void;
  onEditPlayer: (player: Player) => void;
  onDeletePlayer: (playerId: string) => void;
  onOpenScanner?: (teamId?: string, groupId?: string) => void;
  onViewPlayerProfile?: (player: Player) => void;
}

export const TeamHierarchyTreeView: React.FC<TeamHierarchyTreeViewProps> = ({
  tournament,
  groups = [],
  teams = [],
  players = [],
  sport = 'CRICKET',
  onAddTeam,
  onEditTeam,
  onDeleteTeam,
  onAddPlayer,
  onEditPlayer,
  onDeletePlayer,
  onOpenScanner,
  onViewPlayerProfile,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    __all__: true,
  });
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});

  // Group teams by groupId
  const { groupedData, totalPlayersCount } = useMemo(() => {
    const map: Record<string, { group: Group | null; teams: Array<{ team: Team; players: Player[] }> }> = {};

    // Create entry for ungrouped / default pool
    map['__ungrouped__'] = { group: null, teams: [] };

    // Initialize configured groups
    groups.forEach((g) => {
      map[g.id] = { group: g, teams: [] };
    });

    let pCount = 0;

    // Filter players if search term or role filter active
    const cleanSearch = searchTerm.toLowerCase().trim();

    teams.forEach((t) => {
      let teamPlayers = players.filter((p) => p.teamId === t.id);
      pCount += teamPlayers.length;

      if (cleanSearch) {
        teamPlayers = teamPlayers.filter(
          (p) =>
            p.name?.toLowerCase().includes(cleanSearch) ||
            p.displayName?.toLowerCase().includes(cleanSearch) ||
            p.jerseyNumber?.toString().includes(cleanSearch) ||
            p.role?.toLowerCase().includes(cleanSearch) ||
            t.name?.toLowerCase().includes(cleanSearch)
        );
      }

      if (roleFilter !== 'ALL') {
        teamPlayers = teamPlayers.filter(
          (p) => p.role?.toUpperCase() === roleFilter.toUpperCase()
        );
      }

      const entry = t.groupId && map[t.groupId] ? map[t.groupId] : map['__ungrouped__'];
      entry.teams.push({ team: t, players: teamPlayers });
    });

    return { groupedData: map, totalPlayersCount: pCount };
  }, [groups, teams, players, searchTerm, roleFilter]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: prev[groupId] === undefined ? false : !prev[groupId],
    }));
  };

  const toggleTeam = (teamId: string) => {
    setExpandedTeams((prev) => ({
      ...prev,
      [teamId]: !prev[teamId],
    }));
  };

  const expandAll = () => {
    const gObj: Record<string, boolean> = { __all__: true, __ungrouped__: true };
    groups.forEach((g) => {
      gObj[g.id] = true;
    });
    setExpandedGroups(gObj);

    const tObj: Record<string, boolean> = {};
    teams.forEach((t) => {
      tObj[t.id] = true;
    });
    setExpandedTeams(tObj);
  };

  const collapseAll = () => {
    setExpandedGroups({});
    setExpandedTeams({});
  };

  const sportConfig = SPORTS_MASTER[sport] || SPORTS_MASTER.OTHER;

  return (
    <div className="space-y-4">
      {/* Controls & Summary Bar */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              <span>{tournament.name}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {tournament.sport}
              </span>
            </h3>
            <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
              <span>{groups.length} Groups</span>
              <span>•</span>
              <span>{teams.length} Teams</span>
              <span>•</span>
              <span className="text-emerald-400 font-bold">{totalPlayersCount} Players Registered</span>
            </p>
          </div>
        </div>

        {/* Search & Actions */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search player, jersey, role..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={expandAll}
              title="Expand All Nodes"
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl border border-slate-700 flex items-center gap-1 transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Expand</span>
            </button>
            <button
              onClick={collapseAll}
              title="Collapse All Nodes"
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl border border-slate-700 flex items-center gap-1 transition-colors"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Collapse</span>
            </button>
          </div>

          {onOpenScanner && (
            <button
              onClick={() => onOpenScanner()}
              className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>AI Scan Team Sheet</span>
            </button>
          )}

          <button
            onClick={() => onAddTeam()}
            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Team</span>
          </button>
        </div>
      </div>

      {/* Main Tree Container */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-4">
        {/* Render Groups */}
        {(Object.entries(groupedData) as [string, { group: Group | null; teams: Array<{ team: Team; players: Player[] }> }][]).map(([groupId, groupData]) => {
          const isUngrouped = groupId === '__ungrouped__';
          if (isUngrouped && groupData.teams.length === 0) return null;

          const isGroupExpanded = expandedGroups[groupId] !== false;
          const groupName = isUngrouped
            ? groups.length > 0
              ? 'Unassigned / Open Pool'
              : 'Teams & Squads'
            : groupData.group?.name || `Group ${groupId}`;

          const totalGroupPlayers = groupData.teams.reduce((acc, t) => acc + t.players.length, 0);

          return (
            <div
              key={groupId}
              className="border border-slate-800/90 bg-slate-900/40 rounded-2xl overflow-hidden transition-all"
            >
              {/* Group Level Header */}
              <div
                onClick={() => toggleGroup(groupId)}
                className="px-4 py-3 bg-slate-900/80 hover:bg-slate-850 cursor-pointer flex items-center justify-between transition-colors border-b border-slate-800/60 select-none"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-slate-400 hover:text-white transition-colors">
                    {isGroupExpanded ? (
                      <ChevronDown className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-xs">
                    {isUngrouped ? '★' : groupData.group?.code || 'G'}
                  </div>
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-slate-100">
                      {groupName}
                    </span>
                    {groupData.group?.code && (
                      <span className="ml-2 text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-800">
                        {groupData.group.code}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-400 font-medium">
                    <strong className="text-emerald-400">{groupData.teams.length}</strong> Teams •{' '}
                    <strong className="text-slate-200">{totalGroupPlayers}</strong> Players
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddTeam(isUngrouped ? undefined : groupId);
                    }}
                    className="p-1 px-2 text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg border border-slate-700 flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Team
                  </button>
                </div>
              </div>

              {/* Group Teams List */}
              {isGroupExpanded && (
                <div className="p-3 space-y-3">
                  {groupData.teams.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
                      No teams registered in this group yet. Click "+ Team" above to create one.
                    </div>
                  ) : (
                    groupData.teams.map(({ team, players: teamPlayers }) => {
                      const isTeamExpanded = expandedTeams[team.id] !== false; // default expanded

                      return (
                        <div
                          key={team.id}
                          className="border border-slate-800/80 bg-slate-950/70 rounded-xl overflow-hidden shadow-sm"
                        >
                          {/* Team Level Header */}
                          <div
                            onClick={() => toggleTeam(team.id)}
                            className="px-3.5 py-2.5 bg-slate-900/90 hover:bg-slate-850 cursor-pointer flex items-center justify-between transition-colors select-none"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="text-slate-400">
                                {isTeamExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                )}
                              </span>

                              {team.logoUrl ? (
                                <img
                                  src={team.logoUrl}
                                  alt={team.name}
                                  className="w-6 h-6 rounded-md object-contain bg-slate-900 p-0.5 border border-slate-800"
                                />
                              ) : (
                                <div
                                  className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black text-white"
                                  style={{ backgroundColor: team.teamColor || '#10b981' }}
                                >
                                  {team.shortName?.substring(0, 3) || team.name.substring(0, 2)}
                                </div>
                              )}

                              <div>
                                <span className="text-xs font-bold text-white tracking-wide">
                                  {team.name}
                                </span>
                                {team.shortName && (
                                  <span className="ml-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-1 py-0.5 rounded border border-emerald-500/20">
                                    {team.shortName}
                                  </span>
                                )}
                                {team.captain && (
                                  <span className="ml-2 text-[10px] text-amber-400/90 hidden sm:inline-flex items-center gap-1">
                                    <Crown className="w-2.5 h-2.5" /> Cap: {team.captain}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700">
                                {teamPlayers.length} Players
                              </span>

                              <button
                                type="button"
                                title="Add Player to Squad"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAddPlayer(team.id);
                                }}
                                className="p-1 px-2 text-[10px] font-bold bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 rounded-lg border border-emerald-500/40 flex items-center gap-1 transition-colors"
                              >
                                <Plus className="w-3 h-3" /> Player
                              </button>

                              {onOpenScanner && (
                                <button
                                  type="button"
                                  title="Scan & Append Players via OCR"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenScanner(team.id, team.groupId);
                                  }}
                                  className="p-1 px-1.5 text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 flex items-center gap-1 transition-colors"
                                >
                                  <Camera className="w-3 h-3 text-emerald-400" />
                                </button>
                              )}

                              <button
                                type="button"
                                title="Edit Team Details"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditTeam(team);
                                }}
                                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>

                              <button
                                type="button"
                                title="Delete Team"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (
                                    confirm(
                                      `Are you sure you want to delete "${team.name}" and its player roster?`
                                    )
                                  ) {
                                    onDeleteTeam(team.id);
                                  }
                                }}
                                className="p-1.5 text-slate-500 hover:text-rose-400 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Team Players Roster (Leaf Nodes) */}
                          {isTeamExpanded && (
                            <div className="p-2.5 bg-slate-950/90 border-t border-slate-800/60">
                              {teamPlayers.length === 0 ? (
                                <div className="text-center py-3 text-[11px] text-slate-500 bg-slate-900/30 rounded-lg border border-dashed border-slate-800 flex items-center justify-center gap-2">
                                  <span>Squad roster is empty.</span>
                                  <button
                                    type="button"
                                    onClick={() => onAddPlayer(team.id)}
                                    className="text-emerald-400 underline font-semibold hover:text-emerald-300"
                                  >
                                    Add first player
                                  </button>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {teamPlayers.map((player) => (
                                    <div
                                      key={player.id}
                                      onClick={() => onViewPlayerProfile && onViewPlayerProfile(player)}
                                      className="p-2 bg-slate-900/90 hover:bg-slate-850 rounded-xl border border-slate-800/80 hover:border-emerald-500/40 flex items-center justify-between gap-2 group transition-all cursor-pointer"
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        {/* Jersey / Avatar */}
                                        {player.photoUrl ? (
                                          <img
                                            src={player.photoUrl}
                                            alt={player.name}
                                            className="w-7 h-7 rounded-full object-cover border border-slate-700 shrink-0"
                                          />
                                        ) : (
                                          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-mono font-black text-emerald-400 shrink-0">
                                            {player.jerseyNumber || '#'}
                                          </div>
                                        )}

                                        {/* Name & Role */}
                                        <div className="min-w-0">
                                          <p className="text-xs font-bold text-white truncate flex items-center gap-1">
                                            <span>{player.name}</span>
                                            {player.isCaptain && (
                                              <span title="Captain" className="text-amber-400">
                                                <Crown className="w-3 h-3" />
                                              </span>
                                            )}
                                            {player.isViceCaptain && (
                                              <span title="Vice Captain" className="text-blue-400">
                                                <Star className="w-3 h-3" />
                                              </span>
                                            )}
                                          </p>
                                          <p className="text-[10px] text-slate-400 truncate flex items-center gap-1.5">
                                            <span className="text-emerald-400 font-semibold">
                                              {player.role || 'Player'}
                                            </span>
                                            {player.battingStyle && (
                                              <span>• {player.battingStyle}</span>
                                            )}
                                          </p>
                                        </div>
                                      </div>

                                      {/* Quick Edit/Delete buttons */}
                                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                        <button
                                          type="button"
                                          title="Edit Player"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onEditPlayer(player);
                                          }}
                                          className="p-1 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
                                        >
                                          <Edit2 className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          title="Remove Player"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (
                                              confirm(
                                                `Remove player "${player.name}" from team squad?`
                                              )
                                            ) {
                                              onDeletePlayer(player.id);
                                            }
                                          }}
                                          className="p-1 text-slate-500 hover:text-rose-400 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
