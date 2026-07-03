import rateLimit from 'express-rate-limit'

export const authLimiter = rateLimit({
    windowMs: 1000, // 1 секунда
    max: 2,
    message: {
        success: false,
        message: 'Слишком много запросов. Попробуйте позже.',
    },
    standardHeaders: true,
    legacyHeaders: false,
})

export const publicLimiter = rateLimit({
    windowMs: 1000, // 1 секунда
    max: 3,
    message: { success: false, message: 'Превышен лимит запросов.' },
    standardHeaders: true,
    legacyHeaders: false,
})
