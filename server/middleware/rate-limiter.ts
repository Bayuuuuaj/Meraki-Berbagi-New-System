import { rateLimit } from 'express-rate-limit';
import { logger } from '../utils/logger';

// General API Rate Limiter
// 100 requests per 15 minutes is generous for a user session
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
        status: 429,
        message: "Too many requests, please try again later."
    },
    handler: (req, res, next, options) => {
        logger.warn(`Rate Limit Exceeded: ${req.ip}`);
        res.status(options.statusCode).send(options.message);
    }
});

// Stricter Limiter for AI Endpoints (prevent billing spikes)
// 10 requests per minute is plenty for a human interaction
export const aiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
        status: 429,
        message: "AI Request Limit Exceeded. Please wait a moment."
    },
    handler: (req, res, next, options) => {
        logger.warn(`AI Rate Limit Exceeded: ${req.ip} on ${req.path}`);
        res.status(options.statusCode).send(options.message);
    }
});

// Login Rate Limiter (Prevent Brute Force)
// 5 attempts per 15 minutes
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
        status: 429,
        message: "Terlalu banyak percobaan login. Silakan coba lagi dalam 15 menit."
    },
    handler: (req, res, next, options) => {
        logger.warn(`Login Rate Limit Exceeded: ${req.ip}`);
        res.status(options.statusCode).send(options.message);
    }
});
