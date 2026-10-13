import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/security';
import { getDb } from '../db/database';
import { User, Permission, UserRole } from '../../src/types';

export interface AuthenticatedRequest extends Request {
  user?: User;
  tokenPayload?: TokenPayload;
}

// Rate Limiting Store for Login Attempts
interface LoginAttempt {
  count: number;
  lockoutUntil?: number;
}
const loginAttempts = new Map<string, LoginAttempt>();

/**
 * Check if IP/Email is locked out due to too many failed attempts
 */
export function checkLoginRateLimit(key: string): { allowed: boolean; remainingSeconds?: number } {
  const attempt = loginAttempts.get(key);
  if (!attempt) return { allowed: true };

  if (attempt.lockoutUntil && Date.now() < attempt.lockoutUntil) {
    const remainingSeconds = Math.ceil((attempt.lockoutUntil - Date.now()) / 1000);
    return { allowed: false, remainingSeconds };
  }

  // Lockout expired
  if (attempt.lockoutUntil && Date.now() >= attempt.lockoutUntil) {
    loginAttempts.delete(key);
    return { allowed: true };
  }

  return { allowed: true };
}

/**
 * Record a failed login attempt
 */
export function recordFailedLogin(key: string): number {
  const attempt = loginAttempts.get(key) || { count: 0 };
  attempt.count += 1;

  if (attempt.count >= 5) {
    attempt.lockoutUntil = Date.now() + 3 * 60 * 1000; // 3 minutes lockout
  }

  loginAttempts.set(key, attempt);
  return attempt.count;
}

/**
 * Reset failed login count on successful login
 */
export function resetLoginAttempts(key: string): void {
  loginAttempts.delete(key);
}

/**
 * Middleware: Verify user authentication
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  let token: string | undefined;

  // Check Authorization Header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // Check Cookies
  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    res.status(401).json({ error: 'Unauthorized: No token provided. Please log in.' });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
    return;
  }

  const db = getDb();
  const foundUser = db.users.find((u) => u.id === payload.userId && u.status === 'ACTIVE');

  if (!foundUser) {
    res.status(401).json({ error: 'User account not found or suspended.' });
    return;
  }

  // Strip password hash before attaching to request
  const { passwordHash, ...safeUser } = foundUser;
  req.user = safeUser;
  req.tokenPayload = payload;

  next();
}

/**
 * Role Permission Mapping
 */
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    'TOURNAMENTS_MANAGE',
    'TEAMS_MANAGE',
    'PLAYERS_MANAGE',
    'MATCHES_MANAGE',
    'SCORING_WRITE',
    'REPORTS_VIEW',
    'GRAPHICS_MANAGE',
    'BROADCAST_MANAGE',
    'USERS_MANAGE',
    'SYSTEM_SETTINGS',
  ],
  ADMIN: [
    'TOURNAMENTS_MANAGE',
    'TEAMS_MANAGE',
    'PLAYERS_MANAGE',
    'MATCHES_MANAGE',
    'SCORING_WRITE',
    'REPORTS_VIEW',
    'GRAPHICS_MANAGE',
    'BROADCAST_MANAGE',
    'USERS_MANAGE',
  ],
  SCORER: ['MATCHES_MANAGE', 'SCORING_WRITE', 'REPORTS_VIEW'],
  BROADCASTER: ['GRAPHICS_MANAGE', 'BROADCAST_MANAGE', 'REPORTS_VIEW'],
  USER: ['REPORTS_VIEW'],
};

/**
 * Check if a role possesses a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role] || [];
  return perms.includes(permission);
}

/**
 * Middleware: Require specific role or permission
 */
export function requirePermission(permission: Permission) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (!hasPermission(req.user.role, permission)) {
      res.status(403).json({ error: 'You do not have permission to access this resource.' });
      return;
    }

    next();
  };
}
