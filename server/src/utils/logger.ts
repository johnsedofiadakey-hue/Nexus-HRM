const isProd = process.env.NODE_ENV === 'production';

type Level = 'info' | 'warn' | 'error' | 'debug';

const log = (level: Level, message: string, meta?: Record<string, unknown>) => {
  if (isProd) {
    process.stdout.write(
      JSON.stringify({ ts: new Date().toISOString(), level, message, ...meta }) + '\n'
    );
  } else {
    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    fn(`[${level.toUpperCase()}] ${message}`, meta !== undefined ? meta : '');
  }
};

export const logger = {
  info:  (message: string, meta?: Record<string, unknown>) => log('info',  message, meta),
  warn:  (message: string, meta?: Record<string, unknown>) => log('warn',  message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log('error', message, meta),
  debug: (message: string, meta?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== 'production') log('debug', message, meta);
  },
};
