import { NextFunction, Request, Response } from 'express'
import { constants } from 'http2'
import path from 'path'
import sharp from 'sharp'
import BadRequestError from '../errors/bad-request-error'

const MIN_SIZE_BYTES = 2 * 1024 // 2 KB
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

export const uploadFile = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (!req.file) {
        return next(new BadRequestError('Файл не загружен'))
    }

    if (req.file.size < MIN_SIZE_BYTES || req.file.size > MAX_SIZE_BYTES) {
        const err = new Error(
            `Файл недопустимого размера: ${MIN_SIZE_BYTES} байт`
        )
        ;(err as any).status = 413
        return next(err)
    }

    try {
        const baseDir = path.join(__dirname, '../public')
        const uploadSubPath = process.env.UPLOAD_PATH_TEMP || ''
        const filePath = path.join(baseDir, uploadSubPath, req.file.filename)

        await sharp(filePath).metadata()

        const fileName = process.env.UPLOAD_PATH
            ? `/${process.env.UPLOAD_PATH}/${req.file.filename}`
            : `/${req.file?.filename}`

        return res.status(constants.HTTP_STATUS_CREATED).json({
            fileName,
            originalName: req.file?.originalname,
        })
    } catch (error) {
        return next(error)
    }
}

export default {}
