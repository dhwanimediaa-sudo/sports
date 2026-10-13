import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { hashPassword } from '../utils/security';
import { User, AuditLog, UserRole, StudioGraphic, Auction, AuctionTeam, AuctionPlayer, AuctionBid, AuctionResult, AuctionRetainedPlayer, AuctionGraphicConfig, AuctionAuditLog, GraphicAssignment, GraphicPlaylist, GraphicScene, GraphicAssignmentPreset, BroadcastAuditLog } from '../../src/types';
import { DEFAULT_CUSTOM_SPORTS } from '../services/customSportPresets';
import { DEFAULT_STUDIO_GRAPHICS } from '../services/studioGraphicsPresets';

export interface DatabaseSchema {
  users: Array<User & { passwordHash: string }>;
  audit_logs: AuditLog[];
  system_config: {
    initializedAt: string;
    version: string;
    appName: string;
  };
  tournaments: any[];
  groups: any[];
  teams: any[];
  players: any[];
  matches: any[];
  match_squads: any[];
  match_innings: any[];
  scoring_events: any[];
  volleyball_sets: any[];
  volleyball_events: any[];
  volleyball_timeouts: any[];
  volleyball_substitutions: any[];
  volleyball_rotations: any[];
  kabaddi_raids: any[];
  kabaddi_timeouts: any[];
  kabaddi_substitutions: any[];
  hockey_scoring_events?: any[];
  hockey_clock_states?: any[];
  football_scoring_events?: any[];
  football_clock_states?: any[];
  basketball_scoring_events?: any[];
  basketball_clock_states?: any[];
  tennis_scoring_events?: any[];
  tennis_serve_states?: any[];
  badminton_scoring_events?: any[];
  badminton_serve_states?: any[];
  table_tennis_scoring_events?: any[];
  table_tennis_serve_states?: any[];
  table_tennis_match_states?: any[];
  custom_sports?: any[];
  custom_scoring_events?: any[];
  custom_clock_states?: any[];
  custom_timeouts?: any[];
  custom_substitutions?: any[];
  statistics: any[];
  reports: any[];
  match_reports: any[];
  match_awards: any[];
  knockout_brackets: any[];
  tournament_awards: any[];
  tournament_award_overrides?: any[];
  tournament_records?: any[];
  tournament_presentation_events?: any[];
  tournament_award_audit_logs?: any[];
  tournament_competition_configs?: any[];
  tournament_standings_overrides?: any[];
  tournament_standings_audit_logs?: any[];
  tournament_standings_cache?: any[];
  tournament_qualification_rules?: any[];
  graphics_templates: any[];
  studio_graphics?: StudioGraphic[];
  broadcast_outputs: any[];
  broadcast_configs: any[];
  broadcast_presets: any[];
  auctions: Auction[];
  auction_teams: AuctionTeam[];
  auction_players: AuctionPlayer[];
  auction_bids: AuctionBid[];
  auction_results: AuctionResult[];
  auction_retained_players: AuctionRetainedPlayer[];
  auction_graphics: AuctionGraphicConfig[];
  auction_audit_logs: AuctionAuditLog[];
  graphic_assignments?: GraphicAssignment[];
  graphic_playlists?: GraphicPlaylist[];
  graphic_scenes?: GraphicScene[];
  graphic_assignment_presets?: GraphicAssignmentPreset[];
  broadcast_audit_logs?: BroadcastAuditLog[];
}

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DB_DIR, 'db.json');

// Memory cache of DB
let dbData: DatabaseSchema | null = null;
let lastLoadedMtime = 0;

/**
 * Ensure database directory and file exist with initial schema
 */
function ensureDatabaseFile(): DatabaseSchema {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const initialData: DatabaseSchema = {
      users: [],
      audit_logs: [],
      system_config: {
        initializedAt: new Date().toISOString(),
        version: '1.0.0',
        appName: 'SportsPulse Engine',
      },
      tournaments: [],
      groups: [],
      teams: [],
      players: [],
      matches: [],
      match_squads: [],
      match_innings: [],
      scoring_events: [],
      volleyball_sets: [],
      volleyball_events: [],
      volleyball_timeouts: [],
      volleyball_substitutions: [],
      volleyball_rotations: [],
      kabaddi_raids: [],
      kabaddi_timeouts: [],
      kabaddi_substitutions: [],
      statistics: [],
      reports: [],
      match_reports: [],
      match_awards: [],
      graphics_templates: [],
      broadcast_outputs: [],
      broadcast_configs: [],
      broadcast_presets: [],
      knockout_brackets: [],
      tournament_awards: [],
      tournament_standings_cache: [],
      tournament_qualification_rules: [],
      auctions: [],
      auction_teams: [],
      auction_players: [],
      auction_bids: [],
      auction_results: [],
      auction_retained_players: [],
      auction_graphics: [],
      auction_audit_logs: [],
      graphic_assignments: [],
      graphic_playlists: [],
      graphic_scenes: [],
      graphic_assignment_presets: [],
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
    return initialData;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as DatabaseSchema;
    if (!parsed.match_innings) parsed.match_innings = [];
    if (!parsed.scoring_events) parsed.scoring_events = [];
    if (!parsed.volleyball_sets) parsed.volleyball_sets = [];
    if (!parsed.volleyball_events) parsed.volleyball_events = [];
    if (!parsed.volleyball_timeouts) parsed.volleyball_timeouts = [];
    if (!parsed.volleyball_substitutions) parsed.volleyball_substitutions = [];
    if (!parsed.volleyball_rotations) parsed.volleyball_rotations = [];
    if (!parsed.kabaddi_raids) parsed.kabaddi_raids = [];
    if (!parsed.kabaddi_timeouts) parsed.kabaddi_timeouts = [];
    if (!parsed.kabaddi_substitutions) parsed.kabaddi_substitutions = [];
    if (!parsed.hockey_scoring_events) parsed.hockey_scoring_events = [];
    if (!parsed.hockey_clock_states) parsed.hockey_clock_states = [];
    if (!parsed.football_scoring_events) parsed.football_scoring_events = [];
    if (!parsed.football_clock_states) parsed.football_clock_states = [];
    if (!parsed.basketball_scoring_events) parsed.basketball_scoring_events = [];
    if (!parsed.basketball_clock_states) parsed.basketball_clock_states = [];
    if (!parsed.tennis_scoring_events) parsed.tennis_scoring_events = [];
    if (!parsed.tennis_serve_states) parsed.tennis_serve_states = [];
    if (!parsed.badminton_scoring_events) parsed.badminton_scoring_events = [];
    if (!parsed.badminton_serve_states) parsed.badminton_serve_states = [];
    if (!parsed.table_tennis_scoring_events) parsed.table_tennis_scoring_events = [];
    if (!parsed.table_tennis_serve_states) parsed.table_tennis_serve_states = [];
    if (!parsed.table_tennis_match_states) parsed.table_tennis_match_states = [];
    if (!parsed.custom_sports || parsed.custom_sports.length === 0) {
      parsed.custom_sports = [...DEFAULT_CUSTOM_SPORTS];
    }
    if (!parsed.custom_scoring_events) parsed.custom_scoring_events = [];
    if (!parsed.custom_clock_states) parsed.custom_clock_states = [];
    if (!parsed.custom_timeouts) parsed.custom_timeouts = [];
    if (!parsed.custom_substitutions) parsed.custom_substitutions = [];
    if (!parsed.match_reports) parsed.match_reports = [];
    if (!parsed.match_awards) parsed.match_awards = [];
    if (!parsed.knockout_brackets) parsed.knockout_brackets = [];
    if (!parsed.tournament_awards) parsed.tournament_awards = [];
    if (!parsed.tournament_award_overrides) parsed.tournament_award_overrides = [];
    if (!parsed.tournament_records) parsed.tournament_records = [];
    if (!parsed.tournament_presentation_events) parsed.tournament_presentation_events = [];
    if (!parsed.tournament_award_audit_logs) parsed.tournament_award_audit_logs = [];
    if (!parsed.tournament_competition_configs) parsed.tournament_competition_configs = [];
    if (!parsed.tournament_standings_overrides) parsed.tournament_standings_overrides = [];
    if (!parsed.tournament_standings_audit_logs) parsed.tournament_standings_audit_logs = [];
    if (!parsed.tournament_standings_cache) parsed.tournament_standings_cache = [];
    if (!parsed.tournament_qualification_rules) parsed.tournament_qualification_rules = [];
    if (!parsed.graphics_templates) parsed.graphics_templates = [];
    if (!parsed.studio_graphics) {
      parsed.studio_graphics = [...DEFAULT_STUDIO_GRAPHICS];
    }
    if (!parsed.broadcast_outputs) parsed.broadcast_outputs = [];
    if (!parsed.broadcast_configs) parsed.broadcast_configs = [];
    if (!parsed.broadcast_presets) parsed.broadcast_presets = [];
    if (!parsed.auctions) parsed.auctions = [];
    if (!parsed.auction_teams) parsed.auction_teams = [];
    if (!parsed.auction_players) parsed.auction_players = [];
    if (!parsed.auction_bids) parsed.auction_bids = [];
    if (!parsed.auction_results) parsed.auction_results = [];
    if (!parsed.auction_retained_players) parsed.auction_retained_players = [];
    if (!parsed.auction_graphics) parsed.auction_graphics = [];
    if (!parsed.auction_audit_logs) parsed.auction_audit_logs = [];
    if (!parsed.graphic_assignments) parsed.graphic_assignments = [];
    if (!parsed.graphic_playlists) parsed.graphic_playlists = [];
    if (!parsed.graphic_scenes) parsed.graphic_scenes = [];
    if (!parsed.graphic_assignment_presets) parsed.graphic_assignment_presets = [];
    return parsed;
  } catch (err) {
    console.error('Failed to parse database file, resetting safely:', err);
    const fallbackData: DatabaseSchema = {
      users: [],
      audit_logs: [],
      system_config: {
        initializedAt: new Date().toISOString(),
        version: '1.0.0',
        appName: 'SportsPulse Engine',
      },
      tournaments: [],
      groups: [],
      teams: [],
      players: [],
      matches: [],
      match_squads: [],
      match_innings: [],
      scoring_events: [],
      volleyball_sets: [],
      volleyball_events: [],
      volleyball_timeouts: [],
      volleyball_substitutions: [],
      volleyball_rotations: [],
      kabaddi_raids: [],
      kabaddi_timeouts: [],
      kabaddi_substitutions: [],
      statistics: [],
      reports: [],
      match_reports: [],
      match_awards: [],
      graphics_templates: [],
      broadcast_outputs: [],
      broadcast_configs: [],
      broadcast_presets: [],
      knockout_brackets: [],
      tournament_awards: [],
      tournament_standings_cache: [],
      tournament_qualification_rules: [],
      auctions: [],
      auction_teams: [],
      auction_players: [],
      auction_bids: [],
      auction_results: [],
      auction_retained_players: [],
      auction_graphics: [],
      auction_audit_logs: [],
      graphic_assignments: [],
      graphic_playlists: [],
      graphic_scenes: [],
      graphic_assignment_presets: [],
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(fallbackData, null, 2), 'utf-8');
    return fallbackData;
  }
}

/**
 * Save database memory cache to file atomically
 */
export function saveDatabase(): void {
  if (!dbData) return;
  const tempFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(dbData, null, 2), 'utf-8');
  fs.renameSync(tempFile, DB_FILE);
  try {
    lastLoadedMtime = fs.statSync(DB_FILE).mtimeMs;
  } catch {
    // Ignore error
  }
}

/**
 * Get active database handle
 */
export function getDb(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const mtime = fs.statSync(DB_FILE).mtimeMs;
      if (!dbData || mtime > lastLoadedMtime) {
        dbData = ensureDatabaseFile();
        lastLoadedMtime = mtime;
      }
    } else if (!dbData) {
      dbData = ensureDatabaseFile();
    }
  } catch {
    if (!dbData) {
      dbData = ensureDatabaseFile();
    }
  }
  if (!dbData.broadcast_audit_logs) {
    dbData.broadcast_audit_logs = [];
  }
  return dbData;
}

/**
 * Initialize database and default admin seed
 */
export async function initDatabase(): Promise<void> {
  const db = getDb();

  // Check if any admin exists
  const hasAdmin = db.users.some((u) => u.role === 'SUPER_ADMIN' || u.role === 'ADMIN');

  if (!hasAdmin) {
    const defaultPassword = 'Admin@123456';
    const passwordHash = await hashPassword(defaultPassword);
    const defaultAdmin: User & { passwordHash: string } = {
      id: crypto.randomUUID(),
      name: 'System Administrator',
      email: 'admin@sportspulse.com',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mustChangePassword: false,
      passwordHash,
    };

    db.users.push(defaultAdmin);

    // Initial audit log
    db.audit_logs.push({
      id: crypto.randomUUID(),
      userId: defaultAdmin.id,
      userName: defaultAdmin.name,
      userEmail: defaultAdmin.email,
      action: 'SYSTEM_INIT',
      details: 'Initialized system database and seeded default administrator account (admin@sportspulse.com).',
      timestamp: new Date().toISOString(),
    });

    saveDatabase();
    console.log('✅ Default Admin created: admin@sportspulse.com / Admin@123456');
  }

  // Seed demo organizer user if not exists
  const organizerUser = db.users.find((u) => u.email.toLowerCase() === 'organizer@sportspulse.com');
  if (!organizerUser) {
    const organizerPassword = 'User@123456';
    const organizerHash = await hashPassword(organizerPassword);
    db.users.push({
      id: 'demo-user-organizer',
      name: 'Tournament Organizer',
      email: 'organizer@sportspulse.com',
      role: 'USER',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mustChangePassword: false,
      passwordHash: organizerHash,
      allowedSports: ['CRICKET', 'VOLLEYBALL', 'KABADDI', 'FOOTBALL'],
    });
    saveDatabase();
  } else if (!organizerUser.allowedSports || organizerUser.allowedSports.length === 0) {
    organizerUser.allowedSports = ['CRICKET', 'VOLLEYBALL', 'KABADDI', 'FOOTBALL'];
    saveDatabase();
  }

  // Seed demo scorer user if not exists
  const scorerUser = db.users.find((u) => u.email.toLowerCase() === 'scorer@sportspulse.com');
  if (!scorerUser) {
    const scorerPassword = 'User@123456';
    const scorerHash = await hashPassword(scorerPassword);
    db.users.push({
      id: 'demo-user-scorer',
      name: 'Official Match Scorer',
      email: 'scorer@sportspulse.com',
      role: 'SCORER',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mustChangePassword: false,
      passwordHash: scorerHash,
      allowedSports: ['CRICKET', 'VOLLEYBALL', 'KABADDI', 'FOOTBALL'],
    });
    saveDatabase();
  } else if (!scorerUser.allowedSports || scorerUser.allowedSports.length === 0) {
    scorerUser.allowedSports = ['CRICKET', 'VOLLEYBALL', 'KABADDI', 'FOOTBALL'];
    saveDatabase();
  }

  // Seed demo broadcaster user if not exists
  const broadcasterUser = db.users.find((u) => u.email.toLowerCase() === 'broadcaster@sportspulse.com');
  if (!broadcasterUser) {
    const broadcasterPassword = 'User@123456';
    const broadcasterHash = await hashPassword(broadcasterPassword);
    db.users.push({
      id: 'demo-user-broadcaster',
      name: 'Broadcast Graphics Operator',
      email: 'broadcaster@sportspulse.com',
      role: 'BROADCASTER',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mustChangePassword: false,
      passwordHash: broadcasterHash,
      allowedSports: ['CRICKET', 'VOLLEYBALL', 'KABADDI', 'FOOTBALL'],
    });
    saveDatabase();
  } else if (!broadcasterUser.allowedSports || broadcasterUser.allowedSports.length === 0) {
    broadcasterUser.allowedSports = ['CRICKET', 'VOLLEYBALL', 'KABADDI', 'FOOTBALL'];
    saveDatabase();
  }
}

/**
 * Get database metrics for status display
 */
export function getDatabaseMetrics() {
  const db = getDb();
  let fileSize = 0;
  if (fs.existsSync(DB_FILE)) {
    const stats = fs.statSync(DB_FILE);
    fileSize = stats.size;
  }

  const totalRecords =
    db.users.length +
    db.audit_logs.length +
    db.tournaments.length +
    db.teams.length +
    db.players.length +
    db.matches.length;

  return {
    connected: true,
    provider: 'File-backed JSON DB Engine',
    path: DB_FILE,
    recordCount: totalRecords,
    dbSizeBytes: fileSize,
  };
}
