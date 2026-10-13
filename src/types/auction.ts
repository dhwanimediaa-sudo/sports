/**
 * SportsPulse - Professional Player Auction System Types
 * Inspired by IPL-style live player auctions
 */

export type AuctionStatus = 'DRAFT' | 'READY' | 'LIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export type AuctionType = 'CRICKET_IPL' | 'FOOTBALL_TRANSFER' | 'GENERAL_SPORTS' | 'CUSTOM';

export type AuctionCurrency = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'AUD';

export type PlayerAuctionStatus = 'DRAFT' | 'AVAILABLE' | 'IN_AUCTION' | 'SOLD' | 'UNSOLD' | 'RETAINED';

export type PlayerCategory =
  | 'ICON'
  | 'MARQUEE'
  | 'A'
  | 'B'
  | 'C'
  | 'EMERGING'
  | 'UNCAPPED'
  | 'OVERSEAS'
  | 'LOCAL'
  | string;

export interface BidIncrementRule {
  fromAmount: number;
  toAmount: number;
  increment: number;
}

export interface Auction {
  id: string;
  name: string;
  season?: string;
  sport?: string;
  date?: string;
  startTime?: string;
  venue?: string;
  description?: string;
  auctionType: AuctionType;
  currency: AuctionCurrency;
  startingPurse: number; // e.g. 100000000 (10 Cr)
  maxSquadSize: number; // e.g. 25
  minSquadSize: number; // e.g. 15
  maxOverseasPlayers: number; // e.g. 8
  maxPlayersPerTeam?: number;
  timerDurationSeconds: number; // e.g. 15
  bidIncrements: BidIncrementRule[];
  status: AuctionStatus;
  currentPlayerId?: string | null;
  currentBidAmount?: number;
  currentBidTeamId?: string | null;
  bidCount?: number;
  timerRemainingSeconds?: number;
  timerRunning?: boolean;
  activeGraphicId?: string | null;
  sponsorName?: string;
  sponsorLogo?: string;
  bannerLogo?: string;
  rules?: {
    allowCustomBids?: boolean;
    allowPass?: boolean;
    allowWithdrawBid?: boolean;
    autoSoldOnTimerZero?: boolean;
    soundEffectsEnabled?: boolean;
  };
  ownerUserId?: string;
  createdByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuctionTeam {
  id: string;
  auctionId: string;
  name: string;
  shortCode: string; // e.g. "CSK", "MI", "RCB"
  logo?: string;
  color?: string;
  secondaryColor?: string;
  ownerName?: string;
  coach?: string;
  manager?: string;
  startingPurse: number;
  currentPurse: number;
  totalSpent: number;
  playersBought: number;
  overseasCount: number;
  domesticCount: number;
  squadCount?: number;
  maxSquadSize?: number;
  minSquadSize?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuctionPlayerStats {
  matches?: number;
  runs?: number;
  wickets?: number;
  battingAverage?: number;
  bowlingAverage?: number;
  strikeRate?: number;
  economyRate?: number;
  fifties?: number;
  hundreds?: number;
  bestFigures?: string;
  catches?: number;
  customStats?: Record<string, string | number>;
}

export interface AuctionPlayer {
  id: string;
  auctionId: string;
  name: string;
  photo?: string;
  photoUrl?: string;
  country: string;
  nationality?: string;
  isOverseas: boolean;
  age?: number;
  role: string; // e.g. "BATTER", "BOWLER", "ALL_ROUNDER", "WICKET_KEEPER", "FORWARD", "DEFENDER", etc.
  primarySkill?: string;
  secondarySkill?: string;
  battingStyle?: string; // e.g. "Right Handed Bat"
  bowlingStyle?: string; // e.g. "Right Arm Fast"
  basePrice: number; // In currency units
  category: PlayerCategory;
  status: PlayerAuctionStatus;
  orderNumber?: number; // Auction sequence
  playerNumber?: number | string; // Jersey #
  currentBid?: number;
  soldPrice?: number;
  soldToTeamId?: string;
  soldAt?: string;
  retainedByTeamId?: string;
  retentionPrice?: number;
  unsoldReason?: string;
  auctionRound?: number; // 1 = regular, 2 = accelerated / re-auction
  biography?: string;
  stats?: AuctionPlayerStats;
  previousTeam?: string;
  specialTags?: string[];
  careerHighlights?: string[];
  awards?: string[];
  records?: string[];
  previousAuctionInfo?: {
    year?: string;
    teamName?: string;
    previousTeam?: string;
    soldPrice?: number;
    previousPrice?: number;
    status?: string;
  };
  retainedStatus?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuctionBid {
  id: string;
  auctionId: string;
  playerId: string;
  teamId: string;
  teamName: string;
  teamShortCode: string;
  teamLogo?: string;
  amount: number;
  bidSequence: number;
  bidNumber?: number;
  timestamp: string;
  operatorId?: string;
  operatorName?: string;
  isCustom?: boolean;
}

export interface AuctionRetainedPlayer {
  id: string;
  auctionId: string;
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  retentionPrice: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuctionResult {
  id: string;
  auctionId: string;
  playerId: string;
  playerName: string;
  playerRole: string;
  isOverseas: boolean;
  category: string;
  status: 'SOLD' | 'UNSOLD' | 'RETAINED';
  winningTeamId?: string;
  winningTeamName?: string;
  soldPrice?: number;
  basePrice: number;
  bidCount: number;
  auctionRound: number;
  completedAt: string;
  bidsSummary: Array<{
    teamId: string;
    teamName: string;
    amount: number;
    timestamp: string;
  }>;
}

export type AuctionGraphicType =
  | 'PLAYER_INTRO'
  | 'BASE_PRICE'
  | 'BID_UPDATE'
  | 'NEW_BID'
  | 'GOING_ONCE'
  | 'GOING_TWICE'
  | 'SOLD'
  | 'UNSOLD'
  | 'RE_AUCTION'
  | 'TEAM_PURCHASE'
  | 'PURSE_UPDATE'
  | 'AUCTION_BREAK'
  | 'NEXT_PLAYER'
  | 'AUCTION_COMPLETED';

export interface AuctionGraphicConfig {
  id: string;
  auctionId: string;
  name: string;
  type: AuctionGraphicType;
  enabled: boolean;
  position: 'BOTTOM' | 'TOP' | 'CENTER' | 'LOWER_THIRD' | 'FULL_OVERLAY' | 'SIDEBAR';
  shape: 'ROUNDED' | 'RECTANGLE' | 'PILL' | 'GLASS' | 'CYBER_CUT';
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  opacity: number;
  animation: 'SLIDE_UP' | 'SLIDE_DOWN' | 'FADE' | 'ZOOM' | 'BOUNCE' | 'PULSE';
  durationSeconds: number;
  showPlayerPhoto: boolean;
  showTeamLogo: boolean;
  showSponsorLogo: boolean;
  customTitle?: string;
  customSubtitle?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuctionAuditLog {
  id: string;
  auctionId: string;
  userId?: string;
  userName?: string;
  action:
    | 'AUCTION_CREATED'
    | 'AUCTION_UPDATED'
    | 'AUCTION_DELETED'
    | 'AUCTION_STARTED'
    | 'AUCTION_PAUSED'
    | 'AUCTION_RESUMED'
    | 'AUCTION_COMPLETED'
    | 'TEAM_ADDED'
    | 'TEAM_UPDATED'
    | 'TEAM_DELETED'
    | 'PLAYER_ADDED'
    | 'PLAYER_UPDATED'
    | 'PLAYER_DELETED'
    | 'PLAYERS_IMPORTED'
    | 'RETAINED_PLAYER_ADDED'
    | 'RETAINED_PLAYER_REMOVED'
    | 'PLAYER_AUCTION_STARTED'
    | 'BID_PLACED'
    | 'BID_WITHDRAWN'
    | 'TIMER_RESET'
    | 'PLAYER_SOLD'
    | 'PLAYER_UNSOLD'
    | 'PLAYER_REAUCTIONED'
    | 'RESULT_EDITED'
    | 'GRAPHIC_TRIGGERED'
    | string;
  details: string;
  metadata?: Record<string, any>;
  timestamp: string;
  createdAt?: string;
  entityType?: string;
}

export interface AuctionReportsSummary {
  auction: Auction;
  totalPurseBudget: number;
  totalPurseSpent: number;
  totalPurseRemaining: number;
  totalPlayersInPool: number;
  totalSoldPlayers: number;
  totalUnsoldPlayers: number;
  totalRetainedPlayers: number;
  totalOverseasSold: number;
  totalDomesticSold: number;
  highestBid: {
    player?: AuctionPlayer;
    team?: AuctionTeam;
    amount: number;
  } | null;
  topMostExpensivePlayers: Array<{
    player: AuctionPlayer;
    team: AuctionTeam;
    amount: number;
    category: string;
  }>;
  teamReports: Array<{
    team: AuctionTeam;
    spent: number;
    remaining: number;
    playersCount: number;
    overseasCount: number;
    highestPurchase?: {
      playerName: string;
      amount: number;
      role: string;
    };
    players: AuctionPlayer[];
  }>;
  categoryBreakdown: Record<
    string,
    {
      total: number;
      sold: number;
      unsold: number;
      totalSpent: number;
      averagePrice: number;
    }
  >;
  roleBreakdown: Record<
    string,
    {
      total: number;
      sold: number;
      unsold: number;
      totalSpent: number;
      averagePrice: number;
    }
  >;
  countryBreakdown: Record<
    string,
    {
      total: number;
      sold: number;
      totalSpent: number;
    }
  >;
  unsoldPlayersList: AuctionPlayer[];
}

export interface AuctionLiveState {
  auction: Auction;
  teams: AuctionTeam[];
  currentPlayer: AuctionPlayer | null;
  currentBid: AuctionBid | null;
  leadingTeam: AuctionTeam | null;
  bidHistory: AuctionBid[];
  recentResults: AuctionResult[];
  activeGraphic: AuctionGraphicConfig | null;
  graphicTriggerEvent?: {
    type: AuctionGraphicType;
    playerId?: string;
    teamId?: string;
    amount?: number;
    timestamp: string;
  } | null;
  timerRemaining: number;
  timerSecondsRemaining?: number;
  timerActive?: boolean;
  isTimerRunning: boolean;
  recentBids?: AuctionBid[];
  upcomingPlayers: AuctionPlayer[];
  stats: {
    totalPlayers: number;
    soldCount: number;
    unsoldCount: number;
    retainedCount: number;
    totalSpent: number;
    remainingPurse: number;
  };
}
