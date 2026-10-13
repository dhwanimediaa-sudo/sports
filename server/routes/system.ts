import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { isUserAdmin } from '../middleware/accessControl';
import { getDb, getDatabaseMetrics } from '../db/database';
import { SystemStatus } from '../../src/types';

const router = Router();
const startTime = Date.now();

/**
 * GET /api/system/status
 * Get System Status & Diagnostic Metrics
 */
router.get('/status', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const db = getDb();
  const dbMetrics = getDatabaseMetrics();

  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  const appUrl = process.env.APP_URL || `http://${req.headers.host || '127.0.0.1:3000'}`;

  const statusResponse: SystemStatus = {
    database: dbMetrics,
    authentication: {
      activeSessions: 1,
      jwtAlgorithm: 'HS256',
      passwordHashing: 'Bcrypt (Salt 10 rounds)',
      rateLimitingEnabled: true,
    },
    application: {
      name: 'SportsPulse Engine',
      version: '1.0.0-foundation',
      uptimeSeconds,
      nodeVersion: process.version,
      port: Number(process.env.PORT) || 3000,
      environment: process.env.NODE_ENV || 'development',
      appUrl,
    },
    counts: {
      tournaments: db.tournaments.length,
      groups: db.groups.length,
      teams: db.teams.length,
      players: db.players.length,
      matches: (db.matches || []).length,
      scheduledMatches: (db.matches || []).filter((m) => m.status === 'SCHEDULED').length,
      readyMatches: (db.matches || []).filter((m) => m.status === 'READY').length,
      liveMatches: (db.matches || []).filter((m) => m.status === 'LIVE').length,
      completedMatches: (db.matches || []).filter((m) => m.status === 'COMPLETED').length,
      draftMatches: (db.matches || []).filter((m) => m.status === 'DRAFT').length,
      users: db.users.length,
    },
  };

  res.json(statusResponse);
});

/**
 * GET /api/system/audit-logs
 * Fetch Recent System Audit Logs
 */
router.get('/audit-logs', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  if (!isUserAdmin(req.user)) {
    res.status(403).json({ error: 'Forbidden: Super Admin or Admin access required to view system audit logs.' });
    return;
  }
  const db = getDb();
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const logs = db.audit_logs.slice(0, limit);
  res.json({ logs });
});

export default router;
