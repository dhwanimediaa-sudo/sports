import crypto from 'crypto';
import { getDb, saveDatabase } from '../db/database';
import { AuditLog } from '../../src/types';

export function addAuditLog(
  action: AuditLog['action'],
  details: string,
  user?: { id?: string; name?: string; email?: string },
  ipAddress?: string
): AuditLog {
  const db = getDb();
  const log: AuditLog = {
    id: crypto.randomUUID(),
    userId: user?.id,
    userName: user?.name,
    userEmail: user?.email,
    action,
    details,
    ipAddress: ipAddress || '127.0.0.1',
    timestamp: new Date().toISOString(),
  };

  db.audit_logs.unshift(log); // newest first

  // Keep last 500 audit logs
  if (db.audit_logs.length > 500) {
    db.audit_logs = db.audit_logs.slice(0, 500);
  }

  saveDatabase();
  return log;
}
