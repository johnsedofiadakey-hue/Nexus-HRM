import fs from 'fs';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { execFileMock, verifyUploadedFileMock, syncFileToCloudMock } = vi.hoisted(() => ({
  execFileMock: vi.fn(),
  verifyUploadedFileMock: vi.fn(),
  syncFileToCloudMock: vi.fn(),
}));

vi.mock('child_process', () => ({
  execFile: execFileMock,
}));

vi.mock('../services/google-drive.service', () => ({
  GoogleDriveService: {
    syncFileToCloud: syncFileToCloudMock,
    verifyUploadedFile: verifyUploadedFileMock,
  },
}));

import prisma from '../prisma/client';
import { runBackup } from '../services/maintenance.service';

const backupDir = path.join(process.cwd(), 'storage', 'backups');
const createdFiles: string[] = [];

describe('maintenance backup safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.NODE_ENV = 'test';
    delete process.env.REQUIRE_CLOUD_BACKUP;
  });

  afterEach(() => {
    for (const filepath of createdFiles.splice(0)) {
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    }
  });

  it('fails closed when pg_dump is unavailable instead of creating a fake backup', async () => {
    execFileMock.mockImplementation((_command, _args, _options, callback) => {
      callback(new Error('pg_dump unavailable'));
    });

    await expect(runBackup()).rejects.toThrow('pg_dump unavailable');
    expect(prisma.backupLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'FAILED', sizeBytes: 0 }),
    }));
  });

  it('returns a verified backup only after dump parsing and cloud verification succeed', async () => {
    execFileMock.mockImplementation((command, args, _options, callback) => {
      if (command === 'pg_dump') {
        const filepath = args[args.indexOf('--file') + 1];
        fs.mkdirSync(backupDir, { recursive: true });
        fs.writeFileSync(filepath, Buffer.concat([Buffer.from('PGDMP'), Buffer.alloc(128, 1)]));
        createdFiles.push(filepath);
      }
      callback(null);
    });
    syncFileToCloudMock.mockResolvedValue('cloud-file-id');
    verifyUploadedFileMock.mockResolvedValue({ id: 'cloud-file-id', size: 133, md5Checksum: 'test' });

    const result = await runBackup();

    expect(result.verified).toBe(true);
    expect(result.cloudSynced).toBe(true);
    expect(result.checksumSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(execFileMock).toHaveBeenCalledWith(
      'pg_restore',
      expect.arrayContaining(['--list']),
      expect.any(Object),
      expect.any(Function)
    );
    expect(verifyUploadedFileMock).toHaveBeenCalledWith('cloud-file-id', expect.any(String));
  });
});
