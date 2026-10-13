import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { getDb } from '../db/database';
import { verifyToken } from '../utils/security';
import { User, Tournament, Match, MatchAccessRole, SportType } from '../../src/types';

/**
 * Extract authenticated user from request headers or cookies if present
 */
export function getUserFromRequest(req: any): User | undefined {
  if (req.user) {
    if (req.user.status === 'DISABLED' || req.user.status === 'SUSPENDED') return undefined;
    return req.user;
  }
  const authHeader = req.headers?.authorization;
  const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const token = tokenFromHeader || req.cookies?.token;
  if (!token) return undefined;
  const payload = verifyToken(token);
  if (!payload) return undefined;
  const db = getDb();
  const user = db.users?.find((u) => u.id === payload.userId);
  if (!user || user.status === 'DISABLED' || user.status === 'SUSPENDED') return undefined;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    allowedSports: user.allowedSports,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

declare module './auth' {
  interface AuthenticatedRequest {
    tournament?: Tournament;
    match?: Match;
    matchRole?: MatchAccessRole;
  }
}

/**
 * Check if a user has global admin authority
 */
export function isUserAdmin(user: User | undefined): boolean {
  if (!user) return false;
  return user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';
}

/**
 * Hard server-side permission check:
 * Validates whether a user is permitted to interact with a specific sport.
 * SUPER_ADMIN and ADMIN bypass this check and have access to all sports.
 */
export function canAccessSport(
  user: User | undefined,
  sport: SportType | string | undefined
): boolean {
  if (!user) return false;
  if (user.status === 'DISABLED' || user.status === 'SUSPENDED') return false;
  if (isUserAdmin(user)) return true;

  // If no sport specified (e.g. legacy/general endpoints)
  if (!sport) return true;

  const targetSport = String(sport).toUpperCase().trim();

  // If user has allowedSports array defined by Super Admin
  if (Array.isArray(user.allowedSports)) {
    return user.allowedSports.some((s) => String(s).toUpperCase().trim() === targetSport);
  }

  // Safe backward compatibility: If user is legacy organizer with no allowedSports set,
  // we do not automatically grant all unless configured, but preserve access if not explicitly restricted.
  return false;
}

/**
 * Check if user can create a tournament for a given sport
 */
export function canCreateTournamentForSport(
  user: User | undefined,
  sport: SportType | string | undefined
): boolean {
  if (!user) return false;
  if (user.status === 'DISABLED') return false;
  return canAccessSport(user, sport);
}

/**
 * Check if a user is authorized for a tournament
 */
export function isAuthorizedForTournament(
  tournament: Tournament,
  user: User | undefined,
  requiredLevel: 'MANAGE' | 'VIEW' = 'MANAGE'
): boolean {
  if (!user) return false;
  if (user.status === 'DISABLED' || user.status === 'SUSPENDED') return false;
  if (isUserAdmin(user)) return true;

  // Hard sport access restriction: If user does not have access to this tournament's sport, deny!
  if (tournament.sport && !canAccessSport(user, tournament.sport)) {
    return false;
  }

  // Explicit creator or owner
  if (
    tournament.ownerUserId === user.id ||
    tournament.createdByUserId === user.id ||
    tournament.authorizedUserIds?.includes(user.id)
  ) {
    return true;
  }

  // Check tournament collaborators list
  if (tournament.collaborators && tournament.collaborators.length > 0) {
    const collaborator = tournament.collaborators.find((c) => c.userId === user.id);
    if (collaborator) {
      if (requiredLevel === 'VIEW') return true;
      if (collaborator.role === 'OWNER' || collaborator.role === 'MANAGER') return true;
    }
  }

  // If no owner is recorded (e.g. initial demo tournaments before ownership migration)
  if (!tournament.ownerUserId && !tournament.createdByUserId) {
    if (requiredLevel === 'VIEW') return true;
    return false; // Only admins can mutate unowned legacy tournaments
  }

  // If checking VIEW access, check if user is assigned to any match in this tournament
  if (requiredLevel === 'VIEW') {
    const db = getDb();
    const tournamentMatches = (db.matches || []).filter((m) => m.tournamentId === tournament.id);
    const hasMatchAssignment = tournamentMatches.some((m) => {
      const role = getMatchAccessRole(m, user);
      return role !== null;
    });
    if (hasMatchAssignment) return true;
  }

  return false;
}

/**
 * Determine the user's specific role for a given match
 */
export function getMatchAccessRole(match: Match, user: User | undefined): MatchAccessRole | null {
  if (!user) return null;
  if (user.status === 'DISABLED' || user.status === 'SUSPENDED') return null;
  if (isUserAdmin(user)) return 'OWNER';

  const db = getDb();

  // Check parent tournament ownership & ACL collaborators
  const tournament = (db.tournaments || []).find((t) => t.id === match.tournamentId);
  if (
    tournament &&
    (tournament.ownerUserId === user.id ||
      tournament.createdByUserId === user.id ||
      tournament.authorizedUserIds?.includes(user.id))
  ) {
    return 'OWNER';
  }

  if (tournament && tournament.collaborators && tournament.collaborators.length > 0) {
    const coll = tournament.collaborators.find((c) => c.userId === user.id);
    if (coll) {
      if (coll.role === 'OWNER') return 'OWNER';
      if (coll.role === 'MANAGER') return 'MANAGER';
      if (coll.role === 'SCORER') return 'SCORER';
      if (coll.role === 'BROADCAST_OPERATOR') return 'BROADCAST_OPERATOR';
      if (coll.role === 'VIEWER') return 'VIEWER';
    }
  }

  // Direct match ownership
  if (match.ownerUserId === user.id || match.createdByUserId === user.id) {
    return 'OWNER';
  }

  // Match manager assignment
  if (match.managerUserIds?.includes(user.id)) {
    return 'MANAGER';
  }

  // Explicit accessAssignments array
  if (match.accessAssignments && match.accessAssignments.length > 0) {
    const assignment = match.accessAssignments.find((a) => a.userId === user.id);
    if (assignment) {
      return assignment.role;
    }
  }

  // Match scorer assignment
  if (match.scorerUserIds?.includes(user.id) || (match as any).scorerUserId === user.id) {
    return 'SCORER';
  }

  // Match broadcaster assignment
  if (match.broadcasterUserIds?.includes(user.id) || (match as any).broadcastOperatorUserId === user.id) {
    return 'BROADCAST_OPERATOR';
  }

  // General authorized users for match
  if (match.authorizedUserIds?.includes(user.id)) {
    return 'VIEWER';
  }

  // Legacy matches with no ownership:
  if (!match.ownerUserId && !match.createdByUserId && (!tournament || (!tournament.ownerUserId && !tournament.createdByUserId))) {
    if (user.role === 'SCORER') return 'SCORER';
    if (user.role === 'BROADCASTER') return 'BROADCAST_OPERATOR';
    return 'VIEWER';
  }

  return null;
}

/**
 * Check whether a user can perform a specific match action
 */
export function canUserAccessMatch(
  user: User | undefined,
  match: Match,
  requiredAction: 'VIEW' | 'SCORING' | 'BROADCAST' | 'MANAGE'
): boolean {
  if (!user) return false;
  if (user.status === 'DISABLED' || user.status === 'SUSPENDED') return false;
  if (isUserAdmin(user)) return true;

  // Hard sport access restriction: If user does not have access to this match's sport, deny!
  const db = getDb();
  const tournament = match.tournamentId ? (db.tournaments || []).find((t) => t.id === match.tournamentId) : undefined;
  const matchSport = match.sport || tournament?.sport;
  if (matchSport && !canAccessSport(user, matchSport)) {
    return false;
  }

  const role = getMatchAccessRole(match, user);
  if (!role) return false;

  if (role === 'OWNER' || role === 'MANAGER') {
    return true;
  }

  if (requiredAction === 'VIEW') {
    return true;
  }

  if (requiredAction === 'SCORING') {
    return role === 'SCORER';
  }

  if (requiredAction === 'BROADCAST') {
    return role === 'BROADCAST_OPERATOR';
  }

  if (requiredAction === 'MANAGE') {
    return false;
  }

  return false;
}

/**
 * Express middleware to enforce tournament access
 */
export function requireTournamentAccess(requiredLevel: 'MANAGE' | 'VIEW' = 'MANAGE') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const tournamentId =
      req.params.tournamentId ||
      req.params.id ||
      req.body.tournamentId ||
      (req.query.tournamentId as string);

    if (!tournamentId) {
      res.status(400).json({ error: 'Tournament ID is required.' });
      return;
    }

    const db = getDb();
    const tournament = (db.tournaments || []).find((t) => t.id === tournamentId);

    if (!tournament) {
      res.status(404).json({ error: 'Tournament not found.' });
      return;
    }

    if (!isAuthorizedForTournament(tournament, req.user, requiredLevel)) {
      res.status(403).json({
        error: `Forbidden: You do not have ${requiredLevel} access to this tournament.`,
      });
      return;
    }

    req.tournament = tournament;
    next();
  };
}

/**
 * Express middleware to enforce match access
 */
export function requireMatchAccess(requiredAction: 'VIEW' | 'SCORING' | 'BROADCAST' | 'MANAGE') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const matchId =
      req.params.matchId ||
      req.params.id ||
      req.body.matchId ||
      (req.query.matchId as string);

    if (!matchId) {
      res.status(400).json({ error: 'Match ID is required.' });
      return;
    }

    const db = getDb();
    const match = (db.matches || []).find((m) => m.id === matchId);

    if (!match) {
      res.status(404).json({ error: 'Match not found.' });
      return;
    }

    if (!canUserAccessMatch(req.user, match, requiredAction)) {
      res.status(403).json({
        error: `Forbidden: You do not have permission to ${requiredAction.toLowerCase()} this match.`,
      });
      return;
    }

    req.match = match;
    req.matchRole = getMatchAccessRole(match, req.user) || undefined;
    next();
  };
}

/**
 * Reusable centralized authorization helper functions
 */
export function isAuthenticated(user: User | undefined): boolean {
  return !!user && !!user.id;
}

export function canViewTournament(user: User | undefined, tournamentId: string): boolean {
  if (!user) return false;
  if (isUserAdmin(user)) return true;
  const db = getDb();
  const tournament = (db.tournaments || []).find((t) => t.id === tournamentId);
  if (!tournament) return false;
  return isAuthorizedForTournament(tournament, user, 'VIEW');
}

export function canManageTournament(user: User | undefined, tournamentId: string): boolean {
  if (!user) return false;
  if (isUserAdmin(user)) return true;
  const db = getDb();
  const tournament = (db.tournaments || []).find((t) => t.id === tournamentId);
  if (!tournament) return false;
  return isAuthorizedForTournament(tournament, user, 'MANAGE');
}

export function canManageTeams(user: User | undefined, tournamentId: string): boolean {
  return canManageTournament(user, tournamentId);
}

export function canManagePlayers(user: User | undefined, tournamentId: string): boolean {
  return canManageTournament(user, tournamentId);
}

export function canViewMatch(user: User | undefined, matchId: string): boolean {
  if (!user) return false;
  if (isUserAdmin(user)) return true;
  const db = getDb();
  const match = (db.matches || []).find((m) => m.id === matchId);
  if (!match) return false;
  return canUserAccessMatch(user, match, 'VIEW');
}

export function canScoreMatch(user: User | undefined, matchId: string): boolean {
  if (!user) return false;
  if (isUserAdmin(user)) return true;
  const db = getDb();
  const match = (db.matches || []).find((m) => m.id === matchId);
  if (!match) return false;
  return canUserAccessMatch(user, match, 'SCORING');
}

export function canBroadcastMatch(user: User | undefined, matchId: string): boolean {
  if (!user) return false;
  if (isUserAdmin(user)) return true;
  const db = getDb();
  const match = (db.matches || []).find((m) => m.id === matchId);
  if (!match) return false;
  return canUserAccessMatch(user, match, 'BROADCAST');
}

export function canManageMatch(user: User | undefined, matchId: string): boolean {
  if (!user) return false;
  if (isUserAdmin(user)) return true;
  const db = getDb();
  const match = (db.matches || []).find((m) => m.id === matchId);
  if (!match) return false;
  return canUserAccessMatch(user, match, 'MANAGE');
}

export function canManageGraphicsForMatch(user: User | undefined, matchId: string): boolean {
  return canBroadcastMatch(user, matchId);
}

export function canManageTournamentForSport(
  user: User | undefined,
  tournamentId: string,
  sport?: SportType | string
): boolean {
  if (!user) return false;
  if (isUserAdmin(user)) return true;
  const db = getDb();
  const tournament = (db.tournaments || []).find((t) => t.id === tournamentId);
  if (!tournament) return false;
  const targetSport = sport || tournament.sport;
  if (!canAccessSport(user, targetSport)) return false;
  return isAuthorizedForTournament(tournament, user, 'MANAGE');
}

export function canOperateMatchForSport(
  user: User | undefined,
  matchId: string,
  action: 'VIEW' | 'SCORING' | 'BROADCAST' | 'MANAGE',
  sport?: SportType | string
): boolean {
  if (!user) return false;
  if (isUserAdmin(user)) return true;
  const db = getDb();
  const match = (db.matches || []).find((m) => m.id === matchId);
  if (!match) return false;
  const tournament = match.tournamentId
    ? (db.tournaments || []).find((t) => t.id === match.tournamentId)
    : undefined;
  const targetSport = sport || match.sport || tournament?.sport;
  if (!canAccessSport(user, targetSport)) return false;
  return canUserAccessMatch(user, match, action);
}
