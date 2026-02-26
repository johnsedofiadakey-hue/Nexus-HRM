import { rateLimit } from 'express-rate-limit';

const jsonResponse = (res: any, status: number, message: string) =>
  res.status(status).json({ error: message });

/**
 * Strict limiter for login — 10 attempts per 15 minutes per IP.
 * After 10 failures the attacker must wait 15 min.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait 15 minutes and try again.' },
  skipSuccessfulRequests: true,  // Only counts failed attempts
});

/**
 * Password reset — 5 requests per hour per IP (prevents email spam).
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many password reset requests. Please try again in an hour.' },
});

/**
 * General API limiter — 300 requests per minute per IP.
 * Prevents scraping and DoS without blocking normal usage.
 */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

/**
 * Export limiter — exports are expensive, limit to 20 per 5 minutes.
 */
export const exportLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many export requests. Please wait a few minutes.' },
});
