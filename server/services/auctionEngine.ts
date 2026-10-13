/**
 * SportsPulse - Independent Auction Engine & Validation Service
 */

import { Response } from 'express';
import {
  Auction,
  AuctionTeam,
  AuctionPlayer,
  AuctionBid,
  AuctionResult,
  AuctionRetainedPlayer,
  AuctionGraphicConfig,
  AuctionReportsSummary,
  AuctionLiveState,
  BidIncrementRule,
} from '../../src/types';
import { getDb } from '../db/database';

// Map of connected SSE clients per auction ID
export const auctionSseClientsMap = new Map<string, Response[]>();

// In-memory timer references for live countdowns
export const auctionTimersMap = new Map<
  string,
  {
    intervalId: NodeJS.Timeout;
    remainingSeconds: number;
  }
>();

export const DEFAULT_BID_INCREMENTS: BidIncrementRule[] = [
  { fromAmount: 0, toAmount: 1000000, increment: 50000 }, // 0 to 10L: +50k
  { fromAmount: 1000000, toAmount: 5000000, increment: 100000 }, // 10L to 50L: +1L
  { fromAmount: 5000000, toAmount: 10000000, increment: 200000 }, // 50L to 1Cr: +2L
  { fromAmount: 10000000, toAmount: 20000000, increment: 500000 }, // 1Cr to 2Cr: +5L
  { fromAmount: 20000000, toAmount: 50000000, increment: 1000000 }, // 2Cr to 5Cr: +10L
  { fromAmount: 50000000, toAmount: 100000000, increment: 2500000 }, // 5Cr to 10Cr: +25L
  { fromAmount: 100000000, toAmount: 1000000000, increment: 5000000 }, // 10Cr+: +50L
];

export const DEFAULT_AUCTION_GRAPHICS: Omit<AuctionGraphicConfig, 'id' | 'auctionId' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Player Introduction Banner',
    type: 'PLAYER_INTRO',
    enabled: true,
    position: 'BOTTOM',
    shape: 'ROUNDED',
    primaryColor: '#0f172a',
    secondaryColor: '#1e293b',
    accentColor: '#10b981',
    textColor: '#ffffff',
    opacity: 0.95,
    animation: 'SLIDE_UP',
    durationSeconds: 8,
    showPlayerPhoto: true,
    showTeamLogo: false,
    showSponsorLogo: true,
  },
  {
    name: 'Live Bid Alert Overlay',
    type: 'BID_UPDATE',
    enabled: true,
    position: 'BOTTOM',
    shape: 'ROUNDED',
    primaryColor: '#090d16',
    secondaryColor: '#1e293b',
    accentColor: '#f59e0b',
    textColor: '#ffffff',
    opacity: 0.96,
    animation: 'PULSE',
    durationSeconds: 5,
    showPlayerPhoto: true,
    showTeamLogo: true,
    showSponsorLogo: true,
  },
  {
    name: 'Going Once / Going Twice Alert',
    type: 'GOING_ONCE',
    enabled: true,
    position: 'CENTER',
    shape: 'CYBER_CUT',
    primaryColor: '#7f1d1d',
    secondaryColor: '#450a0a',
    accentColor: '#ef4444',
    textColor: '#ffffff',
    opacity: 0.95,
    animation: 'ZOOM',
    durationSeconds: 4,
    showPlayerPhoto: true,
    showTeamLogo: true,
    showSponsorLogo: false,
  },
  {
    name: 'Hammer Down - Player SOLD Celebration',
    type: 'SOLD',
    enabled: true,
    position: 'CENTER',
    shape: 'ROUNDED',
    primaryColor: '#064e3b',
    secondaryColor: '#022c22',
    accentColor: '#10b981',
    textColor: '#ffffff',
    opacity: 0.98,
    animation: 'BOUNCE',
    durationSeconds: 10,
    showPlayerPhoto: true,
    showTeamLogo: true,
    showSponsorLogo: true,
  },
  {
    name: 'Player Unsold Lower Third',
    type: 'UNSOLD',
    enabled: true,
    position: 'LOWER_THIRD',
    shape: 'ROUNDED',
    primaryColor: '#334155',
    secondaryColor: '#1e293b',
    accentColor: '#94a3b8',
    textColor: '#ffffff',
    opacity: 0.95,
    animation: 'SLIDE_DOWN',
    durationSeconds: 6,
    showPlayerPhoto: true,
    showTeamLogo: false,
    showSponsorLogo: true,
  },
  {
    name: 'Team Purse & Squad Tracker',
    type: 'PURSE_UPDATE',
    enabled: true,
    position: 'SIDEBAR',
    shape: 'GLASS',
    primaryColor: '#0f172a',
    secondaryColor: '#1e293b',
    accentColor: '#38bdf8',
    textColor: '#ffffff',
    opacity: 0.9,
    animation: 'FADE',
    durationSeconds: 12,
    showPlayerPhoto: false,
    showTeamLogo: true,
    showSponsorLogo: true,
  },
];

/**
 * Get the next minimum bid amount according to auction increment rules
 */
export function calculateNextBidAmount(currentAmount: number, basePrice: number, rules: BidIncrementRule[]): number {
  if (!currentAmount || currentAmount === 0) {
    return basePrice > 0 ? basePrice : 100000;
  }

  const effectiveRules = rules && rules.length > 0 ? rules : DEFAULT_BID_INCREMENTS;

  // Find matching slab
  const matched = effectiveRules.find(
    (rule) => currentAmount >= rule.fromAmount && (rule.toAmount === 0 || currentAmount < rule.toAmount)
  );

  const increment = matched ? matched.increment : 100000;
  return currentAmount + increment;
}

/**
 * Validate whether a team can place a bid of a specified amount for a player
 */
export function validateTeamBidEligibility(
  team: AuctionTeam,
  player: AuctionPlayer,
  bidAmount: number,
  auction: Auction
): { eligible: boolean; reason?: string } {
  // 1. Check if team has enough purse
  if (team.currentPurse < bidAmount) {
    return {
      eligible: false,
      reason: `Insufficient purse. Team has ₹${(team.currentPurse / 10000000).toFixed(2)} Cr remaining, requires ₹${(
        bidAmount / 10000000
      ).toFixed(2)} Cr.`,
    };
  }

  // 2. Check squad maximum limit
  const maxSquad = team.maxSquadSize || auction.maxSquadSize || 25;
  if (team.playersBought >= maxSquad) {
    return {
      eligible: false,
      reason: `Maximum squad capacity reached (${team.playersBought}/${maxSquad} players).`,
    };
  }

  // 3. Check overseas quota limit if player is overseas
  if (player.isOverseas) {
    const maxOverseas = auction.maxOverseasPlayers || 8;
    if (team.overseasCount >= maxOverseas) {
      return {
        eligible: false,
        reason: `Maximum overseas player quota reached (${team.overseasCount}/${maxOverseas} overseas players).`,
      };
    }
  }

  // 4. Reserve budget check: Ensure team can fulfill minimum squad size
  const minSquad = team.minSquadSize || auction.minSquadSize || 15;
  const neededSlots = Math.max(0, minSquad - (team.playersBought + 1));
  const minSlotCost = 200000; // minimum ₹2 Lakh per remaining slot
  const requiredReserve = neededSlots * minSlotCost;

  if (team.currentPurse - bidAmount < requiredReserve && neededSlots > 0) {
    return {
      eligible: false,
      reason: `Cannot bid ₹${(bidAmount / 10000000).toFixed(2)} Cr. Must reserve ₹${(
        requiredReserve / 100000
      ).toFixed(2)} Lakh to fill remaining ${neededSlots} minimum squad slots.`,
    };
  }

  return { eligible: true };
}

/**
 * Recalculate team purse, spent, players bought, overseas and domestic counts
 */
export function recalculateTeamPurseAndSquad(auctionId: string, teamId: string): void {
  const db = getDb();
  const team = db.auction_teams.find((t) => t.auctionId === auctionId && t.id === teamId);
  if (!team) return;

  const soldPlayers = db.auction_players.filter(
    (p) => p.auctionId === auctionId && p.status === 'SOLD' && p.soldToTeamId === teamId
  );

  const retainedPlayers = db.auction_players.filter(
    (p) => p.auctionId === auctionId && p.status === 'RETAINED' && p.retainedByTeamId === teamId
  );

  let totalSpent = 0;
  let overseasCount = 0;
  let domesticCount = 0;

  soldPlayers.forEach((p) => {
    totalSpent += p.soldPrice || p.basePrice || 0;
    if (p.isOverseas) {
      overseasCount++;
    } else {
      domesticCount++;
    }
  });

  retainedPlayers.forEach((p) => {
    totalSpent += p.retentionPrice || p.basePrice || 0;
    if (p.isOverseas) {
      overseasCount++;
    } else {
      domesticCount++;
    }
  });

  team.totalSpent = totalSpent;
  team.currentPurse = Math.max(0, team.startingPurse - totalSpent);
  team.playersBought = soldPlayers.length + retainedPlayers.length;
  team.overseasCount = overseasCount;
  team.domesticCount = domesticCount;
  team.updatedAt = new Date().toISOString();
}

/**
 * Generate full real-time live state for an auction
 */
export function getAuctionLiveState(auctionId: string): AuctionLiveState | null {
  const db = getDb();
  const auction = db.auctions.find((a) => a.id === auctionId);
  if (!auction) return null;

  const teams = db.auction_teams.filter((t) => t.auctionId === auctionId);
  const players = db.auction_players.filter((p) => p.auctionId === auctionId);
  const bids = db.auction_bids.filter((b) => b.auctionId === auctionId);
  const results = db.auction_results.filter((r) => r.auctionId === auctionId);
  const graphics = db.auction_graphics.filter((g) => g.auctionId === auctionId);

  const currentPlayer = auction.currentPlayerId
    ? players.find((p) => p.id === auction.currentPlayerId) || null
    : null;

  const playerBids = currentPlayer
    ? bids
        .filter((b) => b.playerId === currentPlayer.id)
        .sort((a, b) => b.bidSequence - a.bidSequence)
    : [];

  const currentBid = playerBids.length > 0 ? playerBids[0] : null;
  const leadingTeam = currentBid ? teams.find((t) => t.id === currentBid.teamId) || null : null;

  const activeGraphic = auction.activeGraphicId
    ? graphics.find((g) => g.id === auction.activeGraphicId) || null
    : null;

  const upcomingPlayers = players
    .filter((p) => p.status === 'AVAILABLE')
    .sort((a, b) => (a.orderNumber || 9999) - (b.orderNumber || 9999));

  const totalSpent = teams.reduce((acc, t) => acc + (t.totalSpent || 0), 0);
  const remainingPurse = teams.reduce((acc, t) => acc + (t.currentPurse || 0), 0);

  const timerState = auctionTimersMap.get(auctionId);
  const timerRemaining = timerState
    ? timerState.remainingSeconds
    : auction.timerRemainingSeconds ?? auction.timerDurationSeconds ?? 15;

  return {
    auction,
    teams,
    currentPlayer,
    currentBid,
    leadingTeam,
    bidHistory: playerBids,
    recentResults: results.slice(-10).reverse(),
    activeGraphic,
    timerRemaining,
    isTimerRunning: Boolean(timerState),
    upcomingPlayers: upcomingPlayers.slice(0, 10),
    stats: {
      totalPlayers: players.length,
      soldCount: players.filter((p) => p.status === 'SOLD').length,
      unsoldCount: players.filter((p) => p.status === 'UNSOLD').length,
      retainedCount: players.filter((p) => p.status === 'RETAINED').length,
      totalSpent,
      remainingPurse,
    },
  };
}

/**
 * Broadcast real-time SSE update to all connected viewers and OBS screens
 */
export function broadcastAuctionUpdate(auctionId: string, eventType: string, payload?: any): void {
  const clients = auctionSseClientsMap.get(auctionId) || [];
  if (clients.length === 0) return;

  const state = getAuctionLiveState(auctionId);
  const data = JSON.stringify({
    eventType,
    timestamp: new Date().toISOString(),
    payload: payload || {},
    state,
  });

  const message = `event: ${eventType}\ndata: ${data}\n\n`;

  clients.forEach((res) => {
    try {
      res.write(message);
    } catch (err) {
      // Client may have disconnected
    }
  });
}

/**
 * Start or reset bidding countdown timer
 */
export function startAuctionCountdown(
  auctionId: string,
  durationSeconds: number,
  onZero?: () => void
): void {
  // Clear any existing timer
  const existing = auctionTimersMap.get(auctionId);
  if (existing) {
    clearInterval(existing.intervalId);
    auctionTimersMap.delete(auctionId);
  }

  const db = getDb();
  const auction = db.auctions.find((a) => a.id === auctionId);
  if (!auction) return;

  auction.timerRemainingSeconds = durationSeconds;
  auction.timerRunning = true;

  let remaining = durationSeconds;

  const intervalId = setInterval(() => {
    remaining--;
    if (auction) {
      auction.timerRemainingSeconds = remaining;
    }

    if (remaining <= 0) {
      clearInterval(intervalId);
      auctionTimersMap.delete(auctionId);
      if (auction) {
        auction.timerRunning = false;
        auction.timerRemainingSeconds = 0;
      }
      broadcastAuctionUpdate(auctionId, 'TIMER_EXPIRED', { remainingSeconds: 0 });
      if (onZero) {
        onZero();
      }
    } else {
      broadcastAuctionUpdate(auctionId, 'TIMER_TICK', { remainingSeconds: remaining });
    }
  }, 1000);

  auctionTimersMap.set(auctionId, {
    intervalId,
    remainingSeconds: durationSeconds,
  });

  broadcastAuctionUpdate(auctionId, 'TIMER_STARTED', { remainingSeconds: durationSeconds });
}

/**
 * Stop active countdown timer
 */
export function stopAuctionCountdown(auctionId: string): void {
  const existing = auctionTimersMap.get(auctionId);
  if (existing) {
    clearInterval(existing.intervalId);
    auctionTimersMap.delete(auctionId);
  }

  const db = getDb();
  const auction = db.auctions.find((a) => a.id === auctionId);
  if (auction) {
    auction.timerRunning = false;
  }

  broadcastAuctionUpdate(auctionId, 'TIMER_STOPPED');
}

/**
 * Generate comprehensive auction reports summary
 */
export function generateAuctionReportsSummary(auctionId: string): AuctionReportsSummary | null {
  const db = getDb();
  const auction = db.auctions.find((a) => a.id === auctionId);
  if (!auction) return null;

  const teams = db.auction_teams.filter((t) => t.auctionId === auctionId);
  const players = db.auction_players.filter((p) => p.auctionId === auctionId);

  const soldPlayers = players.filter((p) => p.status === 'SOLD');
  const unsoldPlayers = players.filter((p) => p.status === 'UNSOLD');
  const retainedPlayers = players.filter((p) => p.status === 'RETAINED');

  const totalPurseBudget = teams.reduce((acc, t) => acc + (t.startingPurse || 0), 0);
  const totalPurseSpent = teams.reduce((acc, t) => acc + (t.totalSpent || 0), 0);
  const totalPurseRemaining = teams.reduce((acc, t) => acc + (t.currentPurse || 0), 0);

  // Highest Bid
  let highestBid: AuctionReportsSummary['highestBid'] = null;
  const sortedByPrice = [...soldPlayers].sort((a, b) => (b.soldPrice || 0) - (a.soldPrice || 0));

  if (sortedByPrice.length > 0) {
    const topPlayer = sortedByPrice[0];
    const topTeam = teams.find((t) => t.id === topPlayer.soldToTeamId);
    highestBid = {
      player: topPlayer,
      team: topTeam,
      amount: topPlayer.soldPrice || topPlayer.basePrice,
    };
  }

  // Top Most Expensive
  const topMostExpensivePlayers = sortedByPrice.slice(0, 10).map((p) => ({
    player: p,
    team: teams.find((t) => t.id === p.soldToTeamId)!,
    amount: p.soldPrice || p.basePrice,
    category: p.category,
  }));

  // Team Reports
  const teamReports = teams.map((team) => {
    const teamSold = soldPlayers.filter((p) => p.soldToTeamId === team.id);
    const teamRetained = retainedPlayers.filter((p) => p.retainedByTeamId === team.id);
    const allTeamPlayers = [...teamSold, ...teamRetained];

    let highestPurchase: { playerName: string; amount: number; role: string } | undefined = undefined;
    const sortedTeamSold = [...teamSold].sort((a, b) => (b.soldPrice || 0) - (a.soldPrice || 0));
    if (sortedTeamSold.length > 0) {
      highestPurchase = {
        playerName: sortedTeamSold[0].name,
        amount: sortedTeamSold[0].soldPrice || sortedTeamSold[0].basePrice,
        role: sortedTeamSold[0].role,
      };
    }

    return {
      team,
      spent: team.totalSpent,
      remaining: team.currentPurse,
      playersCount: allTeamPlayers.length,
      overseasCount: allTeamPlayers.filter((p) => p.isOverseas).length,
      highestPurchase,
      players: allTeamPlayers,
    };
  });

  // Category Breakdown
  const categoryBreakdown: AuctionReportsSummary['categoryBreakdown'] = {};
  players.forEach((p) => {
    const cat = p.category || 'UNCATEGORIZED';
    if (!categoryBreakdown[cat]) {
      categoryBreakdown[cat] = {
        total: 0,
        sold: 0,
        unsold: 0,
        totalSpent: 0,
        averagePrice: 0,
      };
    }
    categoryBreakdown[cat].total++;
    if (p.status === 'SOLD') {
      categoryBreakdown[cat].sold++;
      categoryBreakdown[cat].totalSpent += p.soldPrice || p.basePrice;
    } else if (p.status === 'UNSOLD') {
      categoryBreakdown[cat].unsold++;
    }
  });

  Object.keys(categoryBreakdown).forEach((cat) => {
    const item = categoryBreakdown[cat];
    item.averagePrice = item.sold > 0 ? Math.round(item.totalSpent / item.sold) : 0;
  });

  // Role Breakdown
  const roleBreakdown: AuctionReportsSummary['roleBreakdown'] = {};
  players.forEach((p) => {
    const role = p.role || 'OTHER';
    if (!roleBreakdown[role]) {
      roleBreakdown[role] = {
        total: 0,
        sold: 0,
        unsold: 0,
        totalSpent: 0,
        averagePrice: 0,
      };
    }
    roleBreakdown[role].total++;
    if (p.status === 'SOLD') {
      roleBreakdown[role].sold++;
      roleBreakdown[role].totalSpent += p.soldPrice || p.basePrice;
    } else if (p.status === 'UNSOLD') {
      roleBreakdown[role].unsold++;
    }
  });

  Object.keys(roleBreakdown).forEach((role) => {
    const item = roleBreakdown[role];
    item.averagePrice = item.sold > 0 ? Math.round(item.totalSpent / item.sold) : 0;
  });

  // Country Breakdown
  const countryBreakdown: AuctionReportsSummary['countryBreakdown'] = {};
  players.forEach((p) => {
    const country = p.country || 'Unknown';
    if (!countryBreakdown[country]) {
      countryBreakdown[country] = {
        total: 0,
        sold: 0,
        totalSpent: 0,
      };
    }
    countryBreakdown[country].total++;
    if (p.status === 'SOLD') {
      countryBreakdown[country].sold++;
      countryBreakdown[country].totalSpent += p.soldPrice || p.basePrice;
    }
  });

  return {
    auction,
    totalPurseBudget,
    totalPurseSpent,
    totalPurseRemaining,
    totalPlayersInPool: players.length,
    totalSoldPlayers: soldPlayers.length,
    totalUnsoldPlayers: unsoldPlayers.length,
    totalRetainedPlayers: retainedPlayers.length,
    totalOverseasSold: soldPlayers.filter((p) => p.isOverseas).length,
    totalDomesticSold: soldPlayers.filter((p) => !p.isOverseas).length,
    highestBid,
    topMostExpensivePlayers,
    teamReports,
    categoryBreakdown,
    roleBreakdown,
    countryBreakdown,
    unsoldPlayersList: unsoldPlayers,
  };
}
