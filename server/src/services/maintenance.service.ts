import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

export const runBackup = async () => {
    return new Promise((resolve, reject) => {
        const date = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(process.cwd(), 'public/backups');
        const filename = `backup-nexus-${date}.sql`;
        const filepath = path.join(backupDir, filename);

        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        // Use pg_dump with DATABASE_URL
        // NOTE: This assumes pg_dump is available in the system PATH.
        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) return reject(new Error("DATABASE_URL not found"));

        const command = `pg_dump "${dbUrl}" -f "${filepath}"`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Backup error: ${error.message}`);
                return reject(error);
            }
            if (stderr) {
                console.warn(`Backup stderr: ${stderr}`);
            }
            resolve({ filename, path: `/backups/${filename}` });
        });
    });
};

export const getSystemHealth = async () => {
    // Basic check
    const uptime = process.uptime();
    const memory = process.memoryUsage();
    return {
        status: 'HEALTHY',
        uptime: Math.floor(uptime),
        memory: {
            heapUsed: Math.round(memory.heapUsed / 1024 / 1024) + 'MB',
            rss: Math.round(memory.rss / 1024 / 1024) + 'MB'
        }
    };
};
