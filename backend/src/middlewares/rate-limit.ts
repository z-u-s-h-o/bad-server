import rateLimit from 'express-rate-limit'

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 5,
    message: {
        success: false,
        message: 'Слишком много запросов. Попробуйте позже.',
    },
    standardHeaders: true,
    legacyHeaders: false,
})

export const publicLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, message: 'Превышен лимит запросов.' },
    standardHeaders: true,
    legacyHeaders: false,
})
