import { execFile } from 'child_process';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import prisma from '../prisma/client';

const BACKUP_DIR = path.join(process.cwd(), 'storage', 'backups');

if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

const runCommand = (command: string, args: string[]) => new Promise<void>((resolve, reject) => {
  execFile(command, args, { maxBuffer: 10 * 1024 * 1024 }, (error) => {
    if (error) reject(error);
    else resolve();
  });
});

const sha256File = (filepath: string): Promise<string> => new Promise((resolve, reject) => {
  const hash = crypto.createHash('sha256');
  const stream = fs.createReadStream(filepath);
  stream.on('error', reject);
  stream.on('data', chunk => hash.update(chunk));
  stream.on('end', () => resolve(hash.digest('hex')));
});

export interface BackupResult {
  filename: string;
  path: string;
  sizeKB: number;
  checksumSha256: string;
  verified: true;
  cloudSynced: boolean;
  cloudId?: string;
}

export const runBackup = async (): Promise<BackupResult> => {
  const date = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-core-${date}.dump`;
  const filepath = path.join(BACKUP_DIR, filename);
  const dbUrl = process.env.DATABASE_URL;
  const requireCloud = process.env.NODE_ENV === 'production' && process.env.REQUIRE_CLOUD_BACKUP !== 'false';

  if (!dbUrl) throw new Error('DATABASE_URL not set — backup requires PostgreSQL');

  try {
    await runCommand('pg_dump', ['--format=custom', '--file', filepath, dbUrl]);

    const stat = fs.statSync(filepath);
    const header = Buffer.alloc(5);
    const fd = fs.openSync(filepath, 'r');
    fs.readSync(fd, header, 0, header.length, 0);
    fs.closeSync(fd);

    if (stat.size <= 0 || header.toString('ascii') !== 'PGDMP') {
      throw new Error('Backup validation failed: pg_dump did not produce a valid custom-format archive');
    }

    // pg_restore --list parses the archive catalog without restoring or writing
    // to a database. A corrupt/incomplete dump fails here.
    await runCommand('pg_restore', ['--list', filepath]);

    const checksumSha256 = await sha256File(filepath);
    let cloudId: string | undefined;

    try {
      const { GoogleDriveService } = await import('./google-drive.service');
      cloudId = await GoogleDriveService.syncFileToCloud(filepath);
      if (!cloudId) throw new Error('Cloud provider did not return an uploaded file ID');
      await GoogleDriveService.verifyUploadedFile(cloudId, filepath);
    } catch (error: any) {
      if (requireCloud) throw new Error(`Cloud backup verification failed: ${error.message}`);
      console.warn('[Lifecycle] Cloud backup unavailable in non-required mode:', error.message);
    }

    const result: BackupResult = {
      filename,
      path: `/backups/${filename}`,
      sizeKB: Math.ceil(stat.size / 1024),
      checksumSha256,
      verified: true,
      cloudSynced: !!cloudId,
      cloudId,
    };

    try {
      await prisma.backupLog.create({
        data: {
          organizationId: 'default-tenant',
          filename,
          sizeBytes: stat.size,
          status: cloudId || !requireCloud ? 'SUCCESS' : 'FAILED',
        },
      });
    } catch (error: any) {
      console.error('[Backup] Could not persist success log:', error.message);
    }

    return result;
  } catch (error: any) {
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    try {
      await prisma.backupLog.create({
        data: {
          organizationId: 'default-tenant',
          filename,
          sizeBytes: 0,
          status: 'FAILED',
          errorMessage: String(error.message || error).slice(0, 1000),
        },
      });
    } catch (logError: any) {
      console.error('[Backup] Could not persist failure log:', logError.message);
    }
    throw error;
  }
};

export const listBackups = () => {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('backup-core-'))
    .map(f => {
      const stat = fs.statSync(path.join(BACKUP_DIR, f));
      return { filename: f, sizeKB: Math.round(stat.size / 1024), createdAt: stat.mtime.toISOString() };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const getSystemHealth = async () => {
  const mem = process.memoryUsage();
  return {
    status: 'HEALTHY',
    uptime: Math.floor(process.uptime()),
    uptimeFormatted: formatUptime(process.uptime()),
    memory: {
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024) + 'MB',
      rss: Math.round(mem.rss / 1024 / 1024) + 'MB'
    },
    pid: process.pid,
    version: process.version
  };
};

const formatUptime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
};
