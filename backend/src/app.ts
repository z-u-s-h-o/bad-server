import { errors } from 'celebrate'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import 'dotenv/config'
import express, { json, urlencoded } from 'express'
import mongoose from 'mongoose'
import path from 'path'
import csurf from 'csurf'
import rateLimit from 'express-rate-limit'

import { DB_ADDRESS } from './config'
import errorHandler from './middlewares/error-handler'
import serveStatic from './middlewares/serverStatic'
import routes from './routes'

const { PORT = 3000 } = process.env
const app = express()

app.use(cookieParser())

const ORIGIN_ALLOW = process.env.CORS_ORIGIN || 'http://localhost:5173'

// app.use(cors())
// // app.use(cors({ origin: ORIGIN_ALLOW, credentials: true }));
// // app.use(express.static(path.join(__dirname, 'public')));
app.use(cors({
  origin: ORIGIN_ALLOW,
  credentials: true, // критично для CSRF с cookie
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
}))

app.use(serveStatic(path.join(__dirname, 'public')))

app.use(urlencoded({ extended: true }))
app.use(json({ limit: '10mb' }))

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // максимум 100 запросов с одного IP
  message: { success: false, message: 'Слишком много запросов' },
  standardHeaders: true,
  legacyHeaders: false,
})

app.use(['/auth/login', '/auth/register', '/auth/csrf-token', '/orders', '/users'], publicLimiter)

const csrfMiddleware = csurf({ cookie: true })

app.use(csrfMiddleware)

app.get('/auth/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() })
})

app.options('*', cors())
app.use(routes)
app.use(errors())
app.use(errorHandler)

// eslint-disable-next-line no-console

const bootstrap = async () => {
    try {
        await mongoose.connect(DB_ADDRESS)
        await app.listen(PORT, () => console.log('ok'))
    } catch (error) {
        console.error(error)
    }
}

bootstrap()
