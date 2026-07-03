import rateLimit from 'express-rate-limit'

export const authLimiter = rateLimit({
    windowMs: 1000, // 1 секунда
    max: 5,
    message: {
        success: false,
        message: 'Слишком много запросов. Попробуйте позже.',
    },
    standardHeaders: true,
    legacyHeaders: false,
})

export const publicLimiter = rateLimit({
    windowMs: 1000, // 1 секунда
    max: 10,
    message: { success: false, message: 'Превышен лимит запросов.' },
    standardHeaders: true,
    legacyHeaders: false,
})
