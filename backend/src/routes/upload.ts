import { Router } from 'express'
import { uploadFile } from '../controllers/upload'
import fileMiddleware from '../middlewares/file'
import { publicLimiter } from '../middlewares/rate-limit'

const uploadRouter = Router()
uploadRouter.post('/', publicLimiter, fileMiddleware.single('file'), uploadFile)

export default uploadRouter
