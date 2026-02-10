import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    message: {
        statusCode: 429,
        success: false,
        message: "Too many attempts, please try again later",
        errors: [],
        data: null
    },
    standardHeaders: true,
    legacyHeaders: false,
});

export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: {
        statusCode: 429,
        success: false,
        message: "Too many requests, please try again later",
        errors: [],
        data: null
    },
    standardHeaders: true,
    legacyHeaders: false,
});
