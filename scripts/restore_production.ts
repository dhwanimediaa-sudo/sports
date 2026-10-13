/**
 * SportsPulse Production Restore Utility
 *
 * Safely restores a verified backup snapshot:
 * 1. Takes an emergency pre-restore snapshot of the current live database
 * 2. Validates JSON integrity & schema of the target backup before restoring
 * 3. Restores `data/db.json`
 * 4. Restores associated media assets (`uploads/`) if present in the backup
 * 
 * Usage:
 *   npx tsx scripts/restore_production.ts [path/to/backup/folder]
 * 
 * Example:
 *   npx tsx scripts/restore_production.ts backups/sportspulse_backup_2026-10-13T09-54-57
 *   # Or run without arguments to automatically select the latest backup:
 *   npx tsx scripts/restore_production.ts
 */

import fs from 'fs';
import path from 'path';

export interface RestoreResult {
  success: boolean;
  restoredFrom: string;
  emergencyBackupPath?: string;
  stats: {
    usersCount: number;
    tournamentsCount: number;
    matchesCount: number;
    teamsCount: number;
    uploadsRestored: number;
  };
  error?: string;
}

export function restoreProductionBackup(targetBackupDir?: string): RestoreResult {
  const rootDir = process.cwd();
  const dbFile = path.resolve(rootDir, 'data/db.json');
  const uploadsDir = path.resolve(rootDir, 'uploads');
  const baseBackupsDir = path.resolve(rootDir, 'backups');

  // 1. Determine backup folder to restore
  let chosenBackupDir = targetBackupDir;
  if (!chosenBackupDir) {
    if (!fs.existsSync(baseBackupsDir)) {
      throw new Error(`Backups directory does not exist at ${baseBackupsDir}`);
    }
    const entries = fs.readdirSync(baseBackupsDir)
      .filter((e) => e.startsWith('sportspulse_backup_') && fs.statSync(path.join(baseBackupsDir, e)).isDirectory())
      .sort()
      .reverse();

    if (entries.length === 0) {
      throw new Error(`No backup folders found in ${baseBackupsDir}`);
    }
    chosenBackupDir = path.join(baseBackupsDir, entries[0]);
    console.log(`ℹ️ No target specified. Automatically selected latest backup: ${entries[0]}`);
  }

  const backupDbPath = path.resolve(chosenBackupDir, 'db.json');
  if (!fs.existsSync(backupDbPath)) {
    throw new Error(`Target backup does not contain db.json at ${backupDbPath}`);
  }

  // 2. Validate backup integrity BEFORE touching current live state
  const backupRaw = fs.readFileSync(backupDbPath, 'utf-8');
  let backupData: any;
  try {
    backupData = JSON.parse(backupRaw);
  } catch (err: any) {
    throw new Error(`Target backup corrupt: JSON parse failed: ${err.message}`);
  }

  if (!backupData.system_config || !Array.isArray(backupData.users)) {
    throw new Error('Target backup schema verification failed: missing system_config or users array');
  }

  // 3. Take emergency pre-restore snapshot of current live database if it exists
  let emergencyBackupPath: string | undefined;
  if (fs.existsSync(dbFile)) {
    const emergencyId = `emergency_pre_restore_${new Date().toISOString().replace(/[:.]/g, '-')}`;
    const emergencyDir = path.resolve(baseBackupsDir, emergencyId);
    fs.mkdirSync(emergencyDir, { recursive: true });
    emergencyBackupPath = path.resolve(emergencyDir, 'db.json');
    fs.copyFileSync(dbFile, emergencyBackupPath);
    console.log(`🛡️ Emergency pre-restore snapshot created at: ${emergencyBackupPath}`);
  }

  // 4. Safely restore database file atomically
  const tempRestoreFile = `${dbFile}.restore.tmp`;
  fs.writeFileSync(tempRestoreFile, backupRaw, 'utf-8');
  fs.renameSync(tempRestoreFile, dbFile);
  console.log(`✅ Database successfully restored to ${dbFile}`);

  // 5. Restore uploads if present in the backup folder
  let uploadsRestored = 0;
  const backupUploadsDir = path.resolve(chosenBackupDir, 'uploads');
  if (fs.existsSync(backupUploadsDir)) {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const backupFiles = fs.readdirSync(backupUploadsDir);
    for (const file of backupFiles) {
      const srcFile = path.join(backupUploadsDir, file);
      const destFile = path.join(uploadsDir, file);
      try {
        if (fs.statSync(srcFile).isFile()) {
          fs.copyFileSync(srcFile, destFile);
          uploadsRestored++;
        }
      } catch {
        // ignore individual file error
      }
    }
    console.log(`✅ Restored ${uploadsRestored} media assets to ${uploadsDir}`);
  }

  const result: RestoreResult = {
    success: true,
    restoredFrom: chosenBackupDir,
    emergencyBackupPath,
    stats: {
      usersCount: backupData.users?.length || 0,
      tournamentsCount: backupData.tournaments?.length || 0,
      matchesCount: backupData.matches?.length || 0,
      teamsCount: backupData.teams?.length || 0,
      uploadsRestored,
    },
  };

  return result;
}

// CLI Execution
if (process.argv[1] && process.argv[1].endsWith('restore_production.ts')) {
  try {
    const targetDir = process.argv[2] ? path.resolve(process.cwd(), process.argv[2]) : undefined;
    console.log('================================================================================');
    console.log('SPORTSPULSE: PRODUCTION DATABASE RESTORE UTILITY');
    console.log('================================================================================');
    const result = restoreProductionBackup(targetDir);
    console.log('\n--- Restore Complete Summary ---');
    console.log(`Status: SUCCESS`);
    console.log(`Restored From: ${result.restoredFrom}`);
    console.log(`Emergency Snapshot: ${result.emergencyBackupPath || 'None (no pre-existing db)'}`);
    console.log(`Users: ${result.stats.usersCount}`);
    console.log(`Tournaments: ${result.stats.tournamentsCount}`);
    console.log(`Matches: ${result.stats.matchesCount}`);
    console.log(`Teams: ${result.stats.teamsCount}`);
    console.log(`Uploads Restored: ${result.stats.uploadsRestored}`);
    console.log('================================================================================');
  } catch (error: any) {
    console.error(`\n❌ RESTORE FAILED: ${error.message}`);
    process.exit(1);
  }
}
