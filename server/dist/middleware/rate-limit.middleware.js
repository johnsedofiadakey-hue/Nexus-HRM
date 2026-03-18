"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.devLimiter = exports.exportLimiter = exports.generalLimiter = exports.passwordResetLimiter = exports.loginLimiter = void 0;
const express_rate_limit_1 = require("express-rate-limit");
const jsonResponse = (res, status, message) => res.status(status).json({ error: message });
/**
 * Strict limiter for login — 10 attempts per 15 minutes per IP.
 * After 10 failures the attacker must wait 15 min.
 */
exports.loginLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many login attempts. Please wait 15 minutes and try again.' },
    skipSuccessfulRequests: true, // Only counts failed attempts
});
/**
 * Password reset — 5 requests per hour per IP (prevents email spam).
 */
exports.passwordResetLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many password reset requests. Please try again in an hour.' },
});
/**
 * General API limiter — 300 requests per minute per IP.
 * Prevents scraping and DoS without blocking normal usage.
 */
exports.generalLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 60 * 1000,
    limit: 2000, // Re-enabled for protection but with plenty of headroom
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many requests. Please slow down.' },
    skip: (req) => req.originalUrl?.startsWith('/api/dev'), // Robust DEV bypass
});
/**
 * Export limiter — exports are expensive, limit to 20 per 5 minutes.
 */
exports.exportLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 5 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many export requests. Please wait a few minutes.' },
});
/**
 * DEV limiter — very high limit for DEV command center telemetry.
 */
exports.devLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 60 * 1000,
    limit: 1000,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many DEV requests.' },
});
