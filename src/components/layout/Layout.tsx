import React, { useState, useEffect } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Dashboard } from '../admin/Dashboard';
import { ProfileModal } from '../admin/ProfileModal';
import { EditProfileModal } from '../admin/EditProfileModal';
import { ChangePasswordModal } from '../admin/ChangePasswordModal';
import { AuditLogModal } from '../admin/AuditLogModal';

import { TournamentsList } from '../admin/TournamentsList';
import { TournamentDetail } from '../admin/TournamentDetail';
import { TeamsList } from '../admin/TeamsList';
import { TeamDetail } from '../admin/TeamDetail';
import { PlayersList } from '../admin/PlayersList';
import { MatchesList } from '../admin/MatchesList';
import { MatchDetail } from '../admin/MatchDetail';
import { GraphicsManagement } from '../admin/GraphicsManagement';
import { GraphicsStudio } from '../admin/graphics/GraphicsStudio';
import { ReportsDashboard } from '../reports/ReportsDashboard';
import { AuctionCenter } from '../admin/auction/AuctionCenter';
import { MasterBroadcastControl } from '../broadcast/MasterBroadcastControl';

import { TournamentModal } from '../admin/TournamentModal';
import { GroupModal } from '../admin/GroupModal';
import { TeamModal } from '../admin/TeamModal';
import { PlayerModal } from '../admin/PlayerModal';
import { PlayerDetailModal } from '../admin/PlayerDetailModal';
import { MatchModal } from '../admin/MatchModal';
import { ConfirmDialog } from '../ui/ConfirmDialog';

import { ToastContainer, ToastMessage } from '../ui/Toast';
import { EmptyState } from '../ui/EmptyState';
import { AccessRestricted } from '../ui/AccessRestricted';
import { UserManagement } from '../admin/UserManagement';
import { UserWorkspace } from '../admin/UserWorkspace';
import { GraphicsTemplateCatalog } from '../admin/graphics/GraphicsTemplateCatalog';
import { useAuth } from '../../services/authContext';
import { Tournament, Group, Team, Player, Match, SportType } from '../../types';
import { api } from '../../services/api';
import { Layers } from 'lucide-react';

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const allowedSports: SportType[] = isAdmin
    ? [
        'CRICKET',
        'VOLLEYBALL',
        'KABADDI',
        'FOOTBALL',
        'HOCKEY',
        'BASKETBALL',
        'TENNIS',
        'BADMINTON',
        'TABLE_TENNIS',
        'PICKLEBALL',
        'HANDBALL',
        'SQUASH',
        'CUSTOM',
      ]
    : user?.allowedSports && user.allowedSports.length > 0
    ? user.allowedSports
    : ['CRICKET'];

  const [selectedSportWorkspace, setSelectedSportWorkspace] = useState<SportType | null>(
    isAdmin ? null : (allowedSports[0] || 'CRICKET')
  );

  const [activeSection, setActiveSection] = useState(isAdmin ? 'matches' : 'dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Deep Navigation State
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  // Refresh key to force re-fetches
  const [refreshKey, setRefreshKey] = useState(0);

  // User Profile Modals
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isAuditLogOpen, setIsAuditLogOpen] = useState(false);

  // CRUD Modals State
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [isTournamentModalOpen, setIsTournamentModalOpen] = useState(false);

  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupModalTournamentId, setGroupModalTournamentId] = useState<string>('');

  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [teamModalTournamentId, setTeamModalTournamentId] = useState<string>('');
  const [teamModalDefaultGroupId, setTeamModalDefaultGroupId] = useState<string | undefined>(undefined);
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);

  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [playerModalTeamId, setPlayerModalTeamId] = useState<string>('');

  const [viewingPlayer, setViewingPlayer] = useState<Player | null>(null);
  const [isPlayerDetailModalOpen, setIsPlayerDetailModalOpen] = useState(false);

  // Match Modal State
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);

  // Confirm Delete Dialog State
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'TOURNAMENT' | 'GROUP' | 'TEAM' | 'PLAYER' | 'MATCH';
    id: string;
    name: string;
    description: string;
  } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Toast state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success', title?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, title }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  useEffect(() => {
    const handleToastEvent = (e: any) => {
      if (e.detail?.message) {
        addToast(e.detail.message, e.detail.type || 'info', e.detail.title);
      }
    };
    window.addEventListener('sportspulse:toast', handleToastEvent);
    return () => window.removeEventListener('sportspulse:toast', handleToastEvent);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const triggerRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  // Helper to open TeamModal with group context
  const handleOpenCreateTeamModal = async (tournamentId?: string, defaultGroupId?: string) => {
    const targetTournamentId = tournamentId || selectedTournamentId || '';
    setTeamModalTournamentId(targetTournamentId);
    setTeamModalDefaultGroupId(defaultGroupId);
    setEditingTeam(null);

    if (targetTournamentId) {
      try {
        const res = await api.getGroups(targetTournamentId);
        setAvailableGroups(res.groups || []);
      } catch (err) {
        setAvailableGroups([]);
      }
    } else {
      setAvailableGroups([]);
    }

    setIsTeamModalOpen(true);
  };

  const handleOpenEditTeamModal = async (team: Team) => {
    setEditingTeam(team);
    setTeamModalTournamentId(team.tournamentId);
    setTeamModalDefaultGroupId(team.groupId);

    try {
      const res = await api.getGroups(team.tournamentId);
      setAvailableGroups(res.groups || []);
    } catch (err) {
      setAvailableGroups([]);
    }

    setIsTeamModalOpen(true);
  };

  // Helper to open PlayerModal
  const handleOpenCreatePlayerModal = (teamId: string) => {
    setPlayerModalTeamId(teamId);
    setEditingPlayer(null);
    setIsPlayerModalOpen(true);
  };

  const handleOpenEditPlayerModal = (player: Player) => {
    setPlayerModalTeamId(player.teamId);
    setEditingPlayer(player);
    setIsPlayerModalOpen(true);
  };

  // Execute Deletion
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      setDeleteLoading(true);
      if (deleteTarget.type === 'TOURNAMENT') {
        await api.deleteTournament(deleteTarget.id);
        addToast(`Deleted Tournament "${deleteTarget.name}"`, 'info', 'Tournament Removed');
        if (selectedTournamentId === deleteTarget.id) setSelectedTournamentId(null);
      } else if (deleteTarget.type === 'GROUP') {
        await api.deleteGroup(deleteTarget.id);
        addToast(`Deleted Group "${deleteTarget.name}"`, 'info', 'Group Removed');
      } else if (deleteTarget.type === 'TEAM') {
        await api.deleteTeam(deleteTarget.id);
        addToast(`Deleted Team "${deleteTarget.name}"`, 'info', 'Team Removed');
        if (selectedTeamId === deleteTarget.id) setSelectedTeamId(null);
      } else if (deleteTarget.type === 'PLAYER') {
        await api.deletePlayer(deleteTarget.id);
        addToast(`Deleted Player "${deleteTarget.name}"`, 'info', 'Player Removed');
      } else if (deleteTarget.type === 'MATCH') {
        await api.deleteMatch(deleteTarget.id);
        addToast(`Deleted Match "${deleteTarget.name}"`, 'info', 'Match Removed');
        if (selectedMatchId === deleteTarget.id) setSelectedMatchId(null);
      }

      setDeleteTarget(null);
      triggerRefresh();
    } catch (err: any) {
      addToast(err.message || 'Failed to delete record.', 'error', 'Delete Error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'dashboard':
        if (!isAdmin) {
          return (
            <UserWorkspace
              activeSport={selectedSportWorkspace}
              onSelectSport={(sport) => setSelectedSportWorkspace(sport)}
              onCreateTournament={(sport) => {
                setSelectedSportWorkspace(sport);
                setEditingTournament(null);
                setIsTournamentModalOpen(true);
              }}
              onCreateTeam={(sport) => {
                setSelectedSportWorkspace(sport);
                handleOpenCreateTeamModal();
              }}
              onCreateMatch={(sport) => {
                setSelectedSportWorkspace(sport);
                setEditingMatch(null);
                setIsMatchModalOpen(true);
              }}
              onNavigateSection={(sec) => setActiveSection(sec)}
              onOpenTournament={(id) => {
                setSelectedTournamentId(id);
                setActiveSection('tournaments');
              }}
              onOpenTeam={(teamId) => {
                setSelectedTeamId(teamId);
                setActiveSection('teams');
              }}
              onOpenMatch={(id, tab) => {
                setSelectedMatchId(id);
                setActiveSection('matches');
              }}
              onToast={addToast}
            />
          );
        }
        return (
          <Dashboard
            onOpenProfile={() => setIsProfileOpen(true)}
            onOpenEditProfile={() => setIsEditProfileOpen(true)}
            onOpenChangePassword={() => setIsChangePasswordOpen(true)}
            onOpenAuditLogs={() => setIsAuditLogOpen(true)}
            onNavigateToTournaments={() => {
              setSelectedTournamentId(null);
              setSelectedTeamId(null);
              setActiveSection('tournaments');
            }}
            onCreateTournament={() => {
              setEditingTournament(null);
              setIsTournamentModalOpen(true);
            }}
            onOpenTournament={(tournamentId) => {
              setSelectedTournamentId(tournamentId);
              setSelectedTeamId(null);
              setActiveSection('tournaments');
            }}
            onOpenMatch={(matchId) => {
              setSelectedMatchId(matchId);
              setActiveSection('matches');
            }}
          />
        );

      case 'tournaments':
        if (selectedTeamId) {
          return (
            <TeamDetail
              teamId={selectedTeamId}
              onBackToTournament={() => setSelectedTeamId(null)}
              onEditTeam={(team) => handleOpenEditTeamModal(team)}
              onAddPlayer={(teamId) => handleOpenCreatePlayerModal(teamId)}
              onEditPlayer={(player) => handleOpenEditPlayerModal(player)}
              onDeletePlayer={(player) =>
                setDeleteTarget({
                  type: 'PLAYER',
                  id: player.id,
                  name: player.name,
                  description: `Deleting ${player.name} will remove them from this squad roster.`,
                })
              }
              onOpenPlayerDetail={(player) => {
                setViewingPlayer(player);
                setIsPlayerDetailModalOpen(true);
              }}
              refreshTrigger={refreshKey}
            />
          );
        }

        if (selectedTournamentId) {
          return (
            <TournamentDetail
              tournamentId={selectedTournamentId}
              onBackToTournaments={() => setSelectedTournamentId(null)}
              onOpenTeam={(teamId) => setSelectedTeamId(teamId)}
              onEditTournament={(tournament) => {
                setEditingTournament(tournament);
                setIsTournamentModalOpen(true);
              }}
              onCreateGroup={() => {
                setGroupModalTournamentId(selectedTournamentId);
                setEditingGroup(null);
                setIsGroupModalOpen(true);
              }}
              onEditGroup={(group) => {
                setGroupModalTournamentId(selectedTournamentId);
                setEditingGroup(group);
                setIsGroupModalOpen(true);
              }}
              onDeleteGroup={(group) =>
                setDeleteTarget({
                  type: 'GROUP',
                  id: group.id,
                  name: group.name,
                  description: `Deleting ${group.name} will unassign its teams. The teams themselves will remain safely in the tournament.`,
                })
              }
              onCreateTeam={(defaultGroupId) => handleOpenCreateTeamModal(selectedTournamentId, defaultGroupId)}
              onEditTeam={(team) => handleOpenEditTeamModal(team)}
              onDeleteTeam={(team) =>
                setDeleteTarget({
                  type: 'TEAM',
                  id: team.id,
                  name: team.name,
                  description: `Deleting ${team.name} will remove all associated players and unassign it from matches.`,
                })
              }
              onAddPlayer={(teamId) => handleOpenCreatePlayerModal(teamId)}
              onOpenPlayer={(player) => {
                setViewingPlayer(player);
                setIsPlayerDetailModalOpen(true);
              }}
              onAddMatch={(groupId) => {
                setEditingMatch(null);
                setIsMatchModalOpen(true);
              }}
              onOpenMatchScoring={(matchId) => {
                setSelectedMatchId(matchId);
                setActiveSection('matches');
              }}
              refreshTrigger={refreshKey}
            />
          );
        }

        return (
          <TournamentsList
            onOpenTournament={(id) => setSelectedTournamentId(id)}
            onCreateTournament={() => {
              setEditingTournament(null);
              setIsTournamentModalOpen(true);
            }}
            onEditTournament={(tournament) => {
              setEditingTournament(tournament);
              setIsTournamentModalOpen(true);
            }}
            onDeleteTournament={(tournament) =>
              setDeleteTarget({
                type: 'TOURNAMENT',
                id: tournament.id,
                name: tournament.name,
                description: `Deleting ${tournament.name} will clean up all associated groups, teams, and player rosters. This operation cannot be undone.`,
              })
            }
            refreshTrigger={refreshKey}
          />
        );

      case 'teams':
        if (selectedTeamId) {
          return (
            <TeamDetail
              teamId={selectedTeamId}
              onBackToTournament={() => setSelectedTeamId(null)}
              onEditTeam={(team) => handleOpenEditTeamModal(team)}
              onAddPlayer={(teamId) => handleOpenCreatePlayerModal(teamId)}
              onEditPlayer={(player) => handleOpenEditPlayerModal(player)}
              onDeletePlayer={(player) =>
                setDeleteTarget({
                  type: 'PLAYER',
                  id: player.id,
                  name: player.name,
                  description: `Deleting ${player.name} will remove them from this squad roster.`,
                })
              }
              onOpenPlayerDetail={(player) => {
                setViewingPlayer(player);
                setIsPlayerDetailModalOpen(true);
              }}
              refreshTrigger={refreshKey}
            />
          );
        }

        return (
          <TeamsList
            onOpenTeam={(id) => setSelectedTeamId(id)}
            onCreateTeam={() => handleOpenCreateTeamModal()}
            onEditTeam={(team) => handleOpenEditTeamModal(team)}
            onDeleteTeam={(team) =>
              setDeleteTarget({
                type: 'TEAM',
                id: team.id,
                name: team.name,
                description: `Deleting ${team.name} will remove all associated players and unassign it from matches.`,
              })
            }
            refreshTrigger={refreshKey}
          />
        );

      case 'players':
        return (
          <PlayersList
            onOpenPlayerDetail={(player) => {
              setViewingPlayer(player);
              setIsPlayerDetailModalOpen(true);
            }}
            onEditPlayer={(player) => handleOpenEditPlayerModal(player)}
            onDeletePlayer={(player) =>
              setDeleteTarget({
                type: 'PLAYER',
                id: player.id,
                name: player.name,
                description: `Deleting ${player.name} will remove them from squad rosters.`,
              })
            }
            refreshTrigger={refreshKey}
          />
        );

      case 'matches':
        if (selectedMatchId) {
          return (
            <MatchDetail
              matchId={selectedMatchId}
              onBack={() => setSelectedMatchId(null)}
              onNavigateToTournament={(tourId) => {
                setActiveSection('tournaments');
                setSelectedTournamentId(tourId);
                setSelectedMatchId(null);
              }}
            />
          );
        }

        return (
          <MatchesList
            onSelectMatch={(id) => setSelectedMatchId(id)}
            onCreateMatch={() => {
              setEditingMatch(null);
              setIsMatchModalOpen(true);
            }}
            onEditMatch={(match) => {
              setEditingMatch(match);
              setIsMatchModalOpen(true);
            }}
          />
        );

      case 'graphics-studio':
        return <GraphicsStudio />;

      case 'auction-center':
        return <AuctionCenter />;

      case 'graphics':
        if (!isAdmin) {
          return (
            <GraphicsTemplateCatalog
              activeSport={selectedSportWorkspace || allowedSports[0] || 'CRICKET'}
              selectedMatchId={selectedMatchId}
              onToast={addToast}
              onOpenAdvancedStudio={() => setActiveSection('graphics-studio')}
            />
          );
        }
        return <GraphicsManagement />;

      case 'broadcast':
        return <MasterBroadcastControl />;

      case 'reports':
        return <ReportsDashboard />;

      case 'users':
        if (!isAdmin) {
          return (
            <AccessRestricted
              title="Administrator Privileges Required"
              reason="User Management and system administration are restricted to platform administrators."
              actionRequired="Contact a system administrator if you believe your account needs upgraded privileges."
              onGoDashboard={() => setActiveSection('dashboard')}
              onGoMyMatches={() => setActiveSection('matches')}
            />
          );
        }
        return <UserManagement onToast={addToast} />;

      default:
        return (
          <EmptyState
            title={`${activeSection.toUpperCase()} MODULE`}
            description={`The ${activeSection} module is architected and scheduled for implementation in the next step. Core database schemas and permissions are ready.`}
            badgeText="Coming in next module"
            icon={<Layers className="w-10 h-10 text-emerald-500/80" />}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      <Header
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenChangePassword={() => setIsChangePasswordOpen(true)}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeSection={activeSection}
          onSelectSection={(section) => {
            setActiveSection(section);
            setSelectedTournamentId(null);
            setSelectedTeamId(null);
          }}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        <main className="flex-1 p-4 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {renderSectionContent()}
        </main>
      </div>

      {/* User Modals */}
      {user && (
        <>
          <ProfileModal
            isOpen={isProfileOpen}
            onClose={() => setIsProfileOpen(false)}
            user={user}
            onOpenEditProfile={() => setIsEditProfileOpen(true)}
            onOpenChangePassword={() => setIsChangePasswordOpen(true)}
            onLogout={logout}
          />

          <EditProfileModal
            isOpen={isEditProfileOpen}
            onClose={() => setIsEditProfileOpen(false)}
            user={user}
            onSuccessToast={(msg) => addToast(msg, 'success', 'Profile Updated')}
          />

          <ChangePasswordModal
            isOpen={isChangePasswordOpen}
            onClose={() => setIsChangePasswordOpen(false)}
            onSuccessToast={(msg) => addToast(msg, 'success', 'Password Changed')}
          />

          <AuditLogModal
            isOpen={isAuditLogOpen}
            onClose={() => setIsAuditLogOpen(false)}
          />
        </>
      )}

      {/* Domain Management Modals */}
      <TournamentModal
        isOpen={isTournamentModalOpen}
        onClose={() => setIsTournamentModalOpen(false)}
        tournament={editingTournament}
        defaultSport={selectedSportWorkspace || undefined}
        allowedSports={isAdmin ? undefined : allowedSports}
        onSuccess={(saved, isEdit) => {
          addToast(
            isEdit ? `Updated Tournament "${saved.name}"` : `Created Tournament "${saved.name}"`,
            'success',
            'Tournament Saved'
          );
          triggerRefresh();
        }}
        onOpenTournament={(tourId) => {
          setSelectedTournamentId(tourId);
          setActiveSection('tournaments');
        }}
        onAddTeams={(tourId) => {
          handleOpenCreateTeamModal(tourId);
        }}
        onCreateGroup={(tourId) => {
          setGroupModalTournamentId(tourId);
          setEditingGroup(null);
          setIsGroupModalOpen(true);
        }}
        onCreateMatch={(tourId) => {
          setSelectedTournamentId(tourId);
          setEditingMatch(null);
          setIsMatchModalOpen(true);
        }}
      />

      <GroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        tournamentId={groupModalTournamentId}
        group={editingGroup}
        onSuccess={(saved, isEdit) => {
          addToast(
            isEdit ? `Updated Group "${saved.name}"` : `Created Group "${saved.name}"`,
            'success',
            'Group Saved'
          );
          triggerRefresh();
        }}
      />

      <TeamModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        tournamentId={teamModalTournamentId}
        defaultGroupId={teamModalDefaultGroupId}
        groups={availableGroups}
        team={editingTeam}
        onSuccess={(saved, isEdit) => {
          addToast(
            isEdit ? `Updated Team "${saved.name}"` : `Created Team "${saved.name}"`,
            'success',
            'Team Saved'
          );
          triggerRefresh();
        }}
        onAddPlayerToTeam={(teamId) => handleOpenCreatePlayerModal(teamId)}
        onOpenTeamDetail={(teamId) => setSelectedTeamId(teamId)}
      />

      <PlayerModal
        isOpen={isPlayerModalOpen}
        onClose={() => setIsPlayerModalOpen(false)}
        teamId={playerModalTeamId}
        player={editingPlayer}
        onSuccess={(saved, isEdit) => {
          addToast(
            isEdit ? `Updated Player "${saved.name}"` : `Added Player "${saved.name}"`,
            'success',
            'Player Saved'
          );
          triggerRefresh();
        }}
      />

      <PlayerDetailModal
        isOpen={isPlayerDetailModalOpen}
        onClose={() => setIsPlayerDetailModalOpen(false)}
        player={viewingPlayer}
        onEdit={() => {
          if (viewingPlayer) {
            handleOpenEditPlayerModal(viewingPlayer);
          }
        }}
        onDelete={() => {
          if (viewingPlayer) {
            setDeleteTarget({
              type: 'PLAYER',
              id: viewingPlayer.id,
              name: viewingPlayer.name,
              description: `Deleting ${viewingPlayer.name} will remove them from the team roster.`,
            });
          }
        }}
      />

      {/* Match Modal */}
      {isMatchModalOpen && (
        <MatchModal
          isOpen={isMatchModalOpen}
          onClose={() => setIsMatchModalOpen(false)}
          initialMatch={editingMatch}
          defaultSport={selectedSportWorkspace || undefined}
          allowedSports={isAdmin ? undefined : allowedSports}
          defaultTournamentId={selectedTournamentId || undefined}
          onSuccess={(saved, isEdit) => {
            addToast(
              isEdit ? `Updated Match "${saved.name}"` : `Created Match "${saved.name}"`,
              'success',
              'Match Saved'
            );
            triggerRefresh();
          }}
        />
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title={`DELETE ${deleteTarget?.type || ''}`}
        description={deleteTarget?.description || ''}
        loading={deleteLoading}
      />

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};
