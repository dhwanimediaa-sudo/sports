/**
 * SportsPulse Production Backup Utility
 *
 * Safely creates a timestamped, integrity-verified backup of:
 * 1. Primary database (data/db.json)
 * 2. Uploaded media assets (uploads/)
 *
 * Safeguards:
 * - Never modifies or overwrites the live database
 * - Validates JSON parseability and schema integrity before finalizing
 * - Stores backups in `backups/` directory (protected from HTTP access)
 * - Conservative retention policy (keeps recent backups, never deletes live data)
 */

import fs from 'fs';
import path from 'path';

export interface BackupResult {
  success: boolean;
  backupId: string;
  backupDir: string;
  dbBackupPath: string;
  timestamp: string;
  stats: {
    usersCount: number;
    tournamentsCount: number;
    teamsCount: number;
    playersCount: number;
    matchesCount: number;
    scoringEventsCount: number;
    uploadedFilesCount: number;
    dbSizeBytes: number;
  };
  error?: string;
}

export function createProductionBackup(customBackupDir?: string, maxRetentionCount = 14): BackupResult {
  const rootDir = process.cwd();
  const dbFile = path.resolve(rootDir, 'data/db.json');
  const uploadsDir = path.resolve(rootDir, 'uploads');
  const baseBackupsDir = customBackupDir || path.resolve(rootDir, 'backups');

  if (!fs.existsSync(dbFile)) {
    throw new Error(`Primary database file not found at ${dbFile}`);
  }

  // 1. Verify live database integrity before backing up
  const rawDb = fs.readFileSync(dbFile, 'utf-8');
  let parsedDb: any;
  try {
    parsedDb = JSON.parse(rawDb);
  } catch (err: any) {
    throw new Error(`Integrity check failed: data/db.json contains invalid JSON: ${err.message}`);
  }

  if (!parsedDb.system_config || !Array.isArray(parsedDb.users)) {
    throw new Error('Integrity check failed: Expected schema properties (system_config, users) missing.');
  }

  // 2. Prepare timestamped backup directory
  const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
  const backupId = `sportspulse_backup_${timestampStr}`;
  const backupDir = path.resolve(baseBackupsDir, backupId);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // 3. Copy database to backup
  const dbBackupPath = path.resolve(backupDir, 'db.json');
  fs.writeFileSync(dbBackupPath, rawDb, 'utf-8');

  // Verify backup copy
  const copiedContent = fs.readFileSync(dbBackupPath, 'utf-8');
  if (copiedContent.length !== rawDb.length) {
    throw new Error('Backup verification failed: Byte size mismatch after write.');
  }

  // 4. Copy uploaded assets if any exist
  let uploadedFilesCount = 0;
  const backupUploadsDir = path.resolve(backupDir, 'uploads');
  if (fs.existsSync(uploadsDir)) {
    const files = fs.readdirSync(uploadsDir);
    if (files.length > 0) {
      fs.mkdirSync(backupUploadsDir, { recursive: true });
      for (const file of files) {
        const srcFile = path.join(uploadsDir, file);
        const destFile = path.join(backupUploadsDir, file);
        try {
          if (fs.statSync(srcFile).isFile()) {
            fs.copyFileSync(srcFile, destFile);
            uploadedFilesCount++;
          }
        } catch {
          // ignore unreadable temporary file
        }
      }
    }
  }

  // 5. Generate backup metadata manifest
  const manifest = {
    backupId,
    timestamp: new Date().toISOString(),
    version: parsedDb.system_config.version || '1.0.0',
    dbSizeBytes: rawDb.length,
    entityCounts: {
      users: parsedDb.users?.length || 0,
      tournaments: parsedDb.tournaments?.length || 0,
      teams: parsedDb.teams?.length || 0,
      players: parsedDb.players?.length || 0,
      matches: parsedDb.matches?.length || 0,
      scoringEvents: parsedDb.scoring_events?.length || 0,
      broadcastConfigs: parsedDb.broadcast_configs?.length || 0,
    },
    uploadedFilesCount,
  };
  fs.writeFileSync(path.resolve(backupDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');

  // 6. Conservative Retention: retain most recent N backups, never prune live data
  if (maxRetentionCount > 0 && fs.existsSync(baseBackupsDir)) {
    try {
      const allBackups = fs.readdirSync(baseBackupsDir)
        .filter((dir) => dir.startsWith('sportspulse_backup_'))
        .sort(); // Lexicographical sort matches ISO timestamp order

      if (allBackups.length > maxRetentionCount) {
        const toPrune = allBackups.slice(0, allBackups.length - maxRetentionCount);
        for (const dirName of toPrune) {
          const prunePath = path.resolve(baseBackupsDir, dirName);
          try {
            fs.rmSync(prunePath, { recursive: true, force: true });
          } catch {
            // Ignore retention cleanup errors
          }
        }
      }
    } catch {
      // Ignore retention errors
    }
  }

  return {
    success: true,
    backupId,
    backupDir,
    dbBackupPath,
    timestamp: manifest.timestamp,
    stats: {
      usersCount: manifest.entityCounts.users,
      tournamentsCount: manifest.entityCounts.tournaments,
      teamsCount: manifest.entityCounts.teams,
      playersCount: manifest.entityCounts.players,
      matchesCount: manifest.entityCounts.matches,
      scoringEventsCount: manifest.entityCounts.scoringEvents,
      uploadedFilesCount,
      dbSizeBytes: rawDb.length,
    },
  };
}

// Direct CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🔄 Initiating SportsPulse Production Backup...');
  try {
    const res = createProductionBackup();
    console.log(`✅ Backup successfully created!`);
    console.log(`   ID:        ${res.backupId}`);
    console.log(`   Location:  ${res.backupDir}`);
    console.log(`   DB Size:   ${(res.stats.dbSizeBytes / 1024).toFixed(2)} KB`);
    console.log(`   Records:   ${res.stats.usersCount} users, ${res.stats.tournamentsCount} tournaments, ${res.stats.matchesCount} matches, ${res.stats.scoringEventsCount} events`);
    console.log(`   Uploads:   ${res.stats.uploadedFilesCount} media assets`);
  } catch (err: any) {
    console.error(`❌ Backup failed:`, err.message);
    process.exit(1);
  }
}
