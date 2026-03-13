import crypto from 'crypto';

const KEY_SOURCE = process.env.DATA_ENCRYPTION_KEY || process.env.JWT_SECRET || 'nexus-hrm-default-key';
const KEY = crypto.createHash('sha256').update(KEY_SOURCE).digest(); // 32 bytes

export const encryptValue = (plain: string): string => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
};

export const maybeEncrypt = (value?: string | number | null): string | null => {
  if (value === undefined || value === null) return null;
  const str = String(value).trim();
  if (!str) return null;
  return encryptValue(str);
};
