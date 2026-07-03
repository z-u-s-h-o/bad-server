import { Router } from 'express'
import {
    getCurrentUser,
    getCurrentUserRoles,
    login,
    logout,
    refreshAccessToken,
    register,
    updateCurrentUser,
} from '../controllers/auth'
import auth from '../middlewares/auth'
import crypto from 'crypto'
import { authLimiter } from '../middlewares/rate-limit'

const authRouter = Router()

authRouter.get('/csrf-token', (req, res) => {
    const csrfToken = crypto.randomBytes(32).toString('hex')

    res.cookie('_csrf', csrfToken, {
        httpOnly: false,
        maxAge: 60 * 60 * 1000,
        sameSite: 'lax',
    })

    return res.json({
        success: true,
        csrfToken,
    })
})
authRouter.get('/user', auth, getCurrentUser)
authRouter.patch('/me', auth, updateCurrentUser)
authRouter.get('/user/roles', auth, getCurrentUserRoles)
authRouter.post('/login', authLimiter, login)
authRouter.get('/token', refreshAccessToken)
authRouter.get('/logout', logout)
authRouter.post('/register', authLimiter, register)

export default authRouter
