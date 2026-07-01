import { NextFunction, Request, Response } from 'express'
import { constants } from 'http2'
import path from 'path'
import fs from 'fs'
import sharp from 'sharp'
import BadRequestError from '../errors/bad-request-error'

export const uploadFile = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (!req.file) {
        return next(new BadRequestError('Файл не загружен'))
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
