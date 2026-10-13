/**
 * SportsPulse - Professional Player Auction Center (Master Hub)
 */

import React, { useState, useEffect } from 'react';
import {
  Gavel,
  Shield,
  User,
  Radio,
  FileText,
  Tv,
  Award,
  ShieldAlert,
  LayoutDashboard,
  ArrowLeft,
  Settings,
  Plus,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  Auction,
  AuctionTeam,
  AuctionPlayer,
  AuctionRetainedPlayer,
  AuctionAuditLog,
  AuctionReportsSummary,
  AuctionLiveState,
} from '../../../types';
import { auctionApi } from '../../../services/api';
import { AuctionList } from './AuctionList';
import { AuctionFormModal } from './AuctionFormModal';
import { AuctionTeamsManager } from './AuctionTeamsManager';
import { AuctionPlayersManager } from './AuctionPlayersManager';
import { AuctionRetainedPlayersManager } from './AuctionRetainedPlayersManager';
import { AuctionRoom } from './AuctionRoom';
import { AuctionReportsView } from './AuctionReportsView';
import { AuctionGraphicsManager } from './AuctionGraphicsManager';
import { AuctionAuditLogsModal } from './AuctionAuditLogsModal';
import { Button } from '../../ui/Button';
import { formatAuctionAmount, getAuctionStatusBadge } from '../../../utils/auctionFormatters';

type AuctionSubView =
  | 'LIST'
  | 'DASHBOARD'
  | 'TEAMS'
  | 'PLAYERS'
  | 'ROOM'
  | 'RETAINED'
  | 'REPORTS'
  | 'GRAPHICS';

export const AuctionCenter: React.FC = () => {
  const [currentView, setCurrentView] = useState<AuctionSubView>('LIST');
  const [auctions, setAuctions] = useState<
    (Auction & {
      teamsCount: number;
      playersCount: number;
      soldCount: number;
      unsoldCount: number;
      totalSpent: number;
    })[]
  >([]);
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [teams, setTeams] = useState<AuctionTeam[]>([]);
  const [players, setPlayers] = useState<AuctionPlayer[]>([]);
  const [retainedPlayers, setRetainedPlayers] = useState<AuctionRetainedPlayer[]>([]);
  const [liveState, setLiveState] = useState<AuctionLiveState | null>(null);
  const [reports, setReports] = useState<AuctionReportsSummary | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuctionAuditLog[]>([]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all auctions
  const loadAuctions = async () => {
    try {
      setLoading(true);
      const res = await auctionApi.getAuctions();
      setAuctions(res.auctions || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load auctions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuctions();
  }, []);

  // Load active auction details
  const loadAuctionDetails = async (auctionId: string) => {
    try {
      const [auctionRes, teamsRes, playersRes, retainedRes, stateRes] = await Promise.all([
        auctionApi.getAuction(auctionId),
        auctionApi.getTeams(auctionId),
        auctionApi.getPlayers(auctionId),
        auctionApi.getRetainedPlayers(auctionId),
        auctionApi.getLiveState(auctionId),
      ]);

      setSelectedAuction(auctionRes.auction);
      setTeams(teamsRes.teams || []);
      setPlayers(playersRes.players || []);
      setRetainedPlayers(retainedRes.retained || []);
      setLiveState(stateRes.state || null);
    } catch (err: any) {
      setError(err.message || 'Failed to load auction data.');
    }
  };

  // SSE Subscription for real-time room updates
  useEffect(() => {
    if (!selectedAuction) return;

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`/api/auctions/${selectedAuction.id}/stream`);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'INITIAL_STATE' || data.type === 'STATE_UPDATE' || data.type === 'BID_PLACED' || data.type === 'PLAYER_SOLD' || data.type === 'PLAYER_UNSOLD' || data.type === 'PLAYER_CHANGED' || data.type === 'AUCTION_PAUSED' || data.type === 'AUCTION_RESUMED') {
            if (data.state) {
              setLiveState(data.state);
              if (data.state.teams) setTeams(data.state.teams);
            }
          }
        } catch (e) {
          // ignore
        }
      };
    } catch (e) {
      // ignore
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [selectedAuction?.id]);

  const handleSelectAuction = async (auction: Auction, view: AuctionSubView = 'DASHBOARD') => {
    setSelectedAuction(auction);
    await loadAuctionDetails(auction.id);
    setCurrentView(view);
  };

  const handleCreateOrUpdateAuction = async (data: Partial<Auction>) => {
    if (selectedAuction && currentView !== 'LIST') {
      const res = await auctionApi.updateAuction(selectedAuction.id, data);
      setSelectedAuction(res.auction);
    } else {
      const res = await auctionApi.createAuction(data);
      setSelectedAuction(res.auction);
      await loadAuctionDetails(res.auction.id);
      setCurrentView('DASHBOARD');
    }
    await loadAuctions();
  };

  const handleDeleteAuction = async (auctionId: string) => {
    if (confirm('Are you sure you want to delete this auction? All teams, players, and bid logs will be permanently deleted.')) {
      await auctionApi.deleteAuction(auctionId);
      if (selectedAuction?.id === auctionId) {
        setSelectedAuction(null);
        setCurrentView('LIST');
      }
      await loadAuctions();
    }
  };

  const handleDuplicateAuction = async (auctionId: string) => {
    await auctionApi.duplicateAuction(auctionId);
    await loadAuctions();
  };

  // Team actions
  const handleAddTeam = async (data: Partial<AuctionTeam>) => {
    if (!selectedAuction) return;
    await auctionApi.createTeam(selectedAuction.id, data);
    const res = await auctionApi.getTeams(selectedAuction.id);
    setTeams(res.teams || []);
  };

  const handleEditTeam = async (teamId: string, data: Partial<AuctionTeam>) => {
    if (!selectedAuction) return;
    await auctionApi.updateTeam(selectedAuction.id, teamId, data);
    const res = await auctionApi.getTeams(selectedAuction.id);
    setTeams(res.teams || []);
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!selectedAuction) return;
    await auctionApi.deleteTeam(selectedAuction.id, teamId);
    const res = await auctionApi.getTeams(selectedAuction.id);
    setTeams(res.teams || []);
  };

  // Player actions
  const handleAddPlayer = async (data: Partial<AuctionPlayer>) => {
    if (!selectedAuction) return;
    await auctionApi.createPlayer(selectedAuction.id, data);
    const res = await auctionApi.getPlayers(selectedAuction.id);
    setPlayers(res.players || []);
  };

  const handleEditPlayer = async (playerId: string, data: Partial<AuctionPlayer>) => {
    if (!selectedAuction) return;
    await auctionApi.updatePlayer(selectedAuction.id, playerId, data);
    const res = await auctionApi.getPlayers(selectedAuction.id);
    setPlayers(res.players || []);
  };

  const handleDeletePlayer = async (playerId: string) => {
    if (!selectedAuction) return;
    await auctionApi.deletePlayer(selectedAuction.id, playerId);
    const res = await auctionApi.getPlayers(selectedAuction.id);
    setPlayers(res.players || []);
  };

  const handleImportPlayers = async (importedPlayers: any[]) => {
    if (!selectedAuction) return;
    await auctionApi.importPlayers(selectedAuction.id, importedPlayers);
    const res = await auctionApi.getPlayers(selectedAuction.id);
    setPlayers(res.players || []);
  };

  // Retained actions
  const handleAddRetainedPlayer = async (data: { playerId: string; teamId: string; retentionPrice?: number }) => {
    if (!selectedAuction) return;
    await auctionApi.addRetainedPlayer(selectedAuction.id, data);
    await loadAuctionDetails(selectedAuction.id);
  };

  const handleRemoveRetainedPlayer = async (retainedId: string) => {
    if (!selectedAuction) return;
    await auctionApi.removeRetainedPlayer(selectedAuction.id, retainedId);
    await loadAuctionDetails(selectedAuction.id);
  };

  // Live Room Actions
  const handleSetCurrentPlayer = async (playerId: string) => {
    if (!selectedAuction) return;
    const res = await auctionApi.setCurrentPlayer(selectedAuction.id, playerId);
    setLiveState(res.state);
  };

  const handlePlaceBid = async (teamId: string, customAmount?: number) => {
    if (!selectedAuction) return;
    const res = await auctionApi.placeBid(selectedAuction.id, teamId, customAmount);
    setLiveState(res.state);
  };

  const handleWithdrawBid = async () => {
    if (!selectedAuction) return;
    const res = await auctionApi.withdrawBid(selectedAuction.id);
    setLiveState(res.state);
  };

  const handleSellCurrentPlayer = async () => {
    if (!selectedAuction) return;
    const res = await auctionApi.sellCurrentPlayer(selectedAuction.id);
    setLiveState(res.state);
    await loadAuctionDetails(selectedAuction.id);
  };

  const handleMarkCurrentPlayerUnsold = async (reason?: string) => {
    if (!selectedAuction) return;
    const res = await auctionApi.markCurrentPlayerUnsold(selectedAuction.id, reason);
    setLiveState(res.state);
    await loadAuctionDetails(selectedAuction.id);
  };

  const handleReAuctionPlayer = async (playerId: string, newBasePrice?: number) => {
    if (!selectedAuction) return;
    await auctionApi.reAuctionPlayer(selectedAuction.id, playerId, newBasePrice);
    await loadAuctionDetails(selectedAuction.id);
  };

  const handleStartTimer = async (seconds?: number) => {
    if (!selectedAuction) return;
    await auctionApi.startTimer(selectedAuction.id, seconds);
  };

  const handleStopTimer = async () => {
    if (!selectedAuction) return;
    await auctionApi.stopTimer(selectedAuction.id);
  };

  const handlePauseAuction = async () => {
    if (!selectedAuction) return;
    const res = await auctionApi.pauseAuction(selectedAuction.id);
    setLiveState(res.state);
  };

  const handleResumeAuction = async () => {
    if (!selectedAuction) return;
    const res = await auctionApi.resumeAuction(selectedAuction.id);
    setLiveState(res.state);
  };

  const handleTriggerGraphic = async (options: { graphicType: string }) => {
    if (!selectedAuction) return;
    await auctionApi.triggerGraphic(selectedAuction.id, options);
  };

  const handleClearGraphic = async () => {
    if (!selectedAuction) return;
    await auctionApi.clearGraphic(selectedAuction.id);
  };

  const handleOpenAuditLogs = async () => {
    if (!selectedAuction) return;
    const res = await auctionApi.getAuditLogs(selectedAuction.id);
    setAuditLogs(res.logs || []);
    setIsAuditModalOpen(true);
  };

  // -------------------------------------------------------------
  // VIEW: AUCTIONS LIST
  // -------------------------------------------------------------
  if (currentView === 'LIST' || !selectedAuction) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <AuctionList
          auctions={auctions}
          onCreateAuction={() => {
            setSelectedAuction(null);
            setIsCreateModalOpen(true);
          }}
          onSelectAuction={(a) => handleSelectAuction(a, 'DASHBOARD')}
          onEnterLiveRoom={(a) => handleSelectAuction(a, 'ROOM')}
          onEditAuction={(a) => {
            setSelectedAuction(a);
            setIsCreateModalOpen(true);
          }}
          onDuplicateAuction={handleDuplicateAuction}
          onDeleteAuction={handleDeleteAuction}
          loading={loading}
        />

        <AuctionFormModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSave={handleCreateOrUpdateAuction}
          initialAuction={selectedAuction}
        />
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW: SINGLE AUCTION ACTIVE DASHBOARD & SUB-VIEWS
  // -------------------------------------------------------------
  const statusBadge = getAuctionStatusBadge(selectedAuction.status);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Breadcrumb & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentView('LIST')}
            className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Back to All Auctions"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-black text-slate-100">{selectedAuction.name}</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${statusBadge.bg}`}>
                {statusBadge.label}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {selectedAuction.sport} • {selectedAuction.season} • Base Starting Purse:{' '}
              {formatAuctionAmount(selectedAuction.startingPurse, selectedAuction.currency)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Enter Live Room Button */}
          {currentView !== 'ROOM' && (
            <Button
              variant="primary"
              onClick={() => setCurrentView('ROOM')}
              icon={<Play className="w-4 h-4 fill-current" />}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-lg shadow-emerald-500/20"
            >
              Live Auction Desk
            </Button>
          )}

          <Button
            variant="outline"
            onClick={handleOpenAuditLogs}
            icon={<ShieldAlert className="w-4 h-4" />}
          >
            Audit Log
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsCreateModalOpen(true)}
            icon={<Settings className="w-4 h-4" />}
          >
            Config
          </Button>
        </div>
      </div>

      {/* Sub-View Navigation Tabs */}
      <div className="flex overflow-x-auto border-b border-slate-800 bg-slate-900/60 rounded-2xl px-4 pt-2 gap-1">
        {[
          { id: 'DASHBOARD', label: 'Auction Hub', icon: <LayoutDashboard className="w-4 h-4" /> },
          { id: 'ROOM', label: 'Live Auction Room', icon: <Gavel className="w-4 h-4 text-emerald-400" /> },
          { id: 'TEAMS', label: `Teams (${teams.length})`, icon: <Shield className="w-4 h-4 text-blue-400" /> },
          { id: 'PLAYERS', label: `Player Pool (${players.length})`, icon: <User className="w-4 h-4 text-amber-400" /> },
          { id: 'RETAINED', label: `Retained (${retainedPlayers.length})`, icon: <Award className="w-4 h-4 text-indigo-400" /> },
          { id: 'REPORTS', label: 'Reports & Ledger', icon: <FileText className="w-4 h-4 text-teal-400" /> },
          { id: 'GRAPHICS', label: 'OBS & Broadcast', icon: <Tv className="w-4 h-4 text-purple-400" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCurrentView(tab.id as AuctionSubView)}
            className={`flex items-center gap-2 pb-3 px-4 text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap border-b-2 ${
              currentView === tab.id
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* RENDER CURRENT SUB-VIEW */}
      {currentView === 'DASHBOARD' && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <span className="text-xs text-slate-400 block mb-1">Franchises Registered</span>
              <div className="text-2xl font-black text-slate-100 font-mono">{teams.length}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <span className="text-xs text-slate-400 block mb-1">Total Pool Players</span>
              <div className="text-2xl font-black text-slate-100 font-mono">{players.length}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <span className="text-xs text-slate-400 block mb-1">Players Sold / Unsold</span>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                {players.filter((p) => p.status === 'SOLD').length} Sold /{' '}
                {players.filter((p) => p.status === 'UNSOLD').length} Unsold
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <span className="text-xs text-slate-400 block mb-1">Total Spent Across Teams</span>
              <div className="text-2xl font-black text-amber-400 font-mono">
                {formatAuctionAmount(
                  teams.reduce((acc, t) => acc + (t.totalSpent || 0), 0),
                  selectedAuction.currency
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Live Room Card */}
            <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
                  <Gavel className="w-6 h-6" />
                </div>
                <h3 className="text-base font-extrabold text-slate-100">Enter Live Auction Stage</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Launch the live bidding console, control timers, hammer down sales, and manage auctioneer calls.
                </p>
              </div>

              <Button
                variant="primary"
                onClick={() => setCurrentView('ROOM')}
                icon={<Play className="w-4 h-4 fill-current" />}
                className="w-full justify-center bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black"
              >
                Launch Auction Desk
              </Button>
            </div>

            {/* Franchise Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-3">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-base font-extrabold text-slate-100">Franchises & Purse</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Manage {teams.length} teams, starting purse balances, colors, logos, and squad minimum/maximum limits.
                </p>
              </div>

              <Button
                variant="outline"
                onClick={() => setCurrentView('TEAMS')}
                className="w-full justify-center"
              >
                Manage Franchises
              </Button>
            </div>

            {/* Player Pool Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
                  <User className="w-6 h-6" />
                </div>
                <h3 className="text-base font-extrabold text-slate-100">Player Pool & Sets</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Manage {players.length} players, batch import star rosters, arrange categories, and configure base prices.
                </p>
              </div>

              <Button
                variant="outline"
                onClick={() => setCurrentView('PLAYERS')}
                className="w-full justify-center"
              >
                Manage Players
              </Button>
            </div>
          </div>
        </div>
      )}

      {currentView === 'ROOM' && (
        <AuctionRoom
          auction={selectedAuction}
          teams={teams}
          players={players}
          liveState={
            liveState ||
            ({
              auction: selectedAuction,
              teams,
              currentPlayer: null,
              currentBid: null,
              leadingTeam: null,
              bidHistory: [],
              recentResults: [],
              activeGraphic: null,
              timerRemaining: 15,
              timerSecondsRemaining: 15,
              timerActive: false,
              isTimerRunning: false,
              upcomingPlayers: [],
              stats: {
                totalPlayers: players.length,
                soldCount: 0,
                unsoldCount: 0,
                retainedCount: 0,
              },
            } as AuctionLiveState)
          }
          onSetCurrentPlayer={handleSetCurrentPlayer}
          onPlaceBid={handlePlaceBid}
          onWithdrawBid={handleWithdrawBid}
          onSellCurrentPlayer={handleSellCurrentPlayer}
          onMarkCurrentPlayerUnsold={handleMarkCurrentPlayerUnsold}
          onReAuctionPlayer={handleReAuctionPlayer}
          onStartTimer={handleStartTimer}
          onStopTimer={handleStopTimer}
          onPauseAuction={handlePauseAuction}
          onResumeAuction={handleResumeAuction}
          onTriggerGraphic={(type) => handleTriggerGraphic({ graphicType: type })}
        />
      )}

      {currentView === 'TEAMS' && (
        <AuctionTeamsManager
          auction={selectedAuction}
          teams={teams}
          players={players}
          onAddTeam={handleAddTeam}
          onEditTeam={handleEditTeam}
          onDeleteTeam={handleDeleteTeam}
        />
      )}

      {currentView === 'PLAYERS' && (
        <AuctionPlayersManager
          auction={selectedAuction}
          players={players}
          teams={teams}
          onAddPlayer={handleAddPlayer}
          onEditPlayer={handleEditPlayer}
          onDeletePlayer={handleDeletePlayer}
          onImportPlayers={handleImportPlayers}
          onStartPlayerAuction={handleSetCurrentPlayer}
          onReAuctionPlayer={handleReAuctionPlayer}
          onNavigateToAuctionRoom={() => setCurrentView('ROOM')}
        />
      )}

      {currentView === 'RETAINED' && (
        <AuctionRetainedPlayersManager
          auction={selectedAuction}
          teams={teams}
          players={players}
          retainedPlayers={retainedPlayers}
          onAddRetainedPlayer={handleAddRetainedPlayer}
          onRemoveRetainedPlayer={handleRemoveRetainedPlayer}
        />
      )}

      {currentView === 'REPORTS' && (
        <AuctionReportsView
          auction={selectedAuction}
          reports={reports}
          teams={teams}
          players={players}
        />
      )}

      {currentView === 'GRAPHICS' && (
        <AuctionGraphicsManager
          auction={selectedAuction}
          liveState={liveState || undefined}
          onTriggerGraphic={handleTriggerGraphic}
          onClearGraphic={handleClearGraphic}
        />
      )}

      {/* Edit Auction Modal */}
      <AuctionFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateOrUpdateAuction}
        initialAuction={selectedAuction}
      />

      {/* Audit Logs Modal */}
      <AuctionAuditLogsModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        logs={auditLogs}
      />
    </div>
  );
};
