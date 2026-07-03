import { NextFunction, Request, Response } from 'express'
import { constants } from 'http2'
import { Error as MongooseError } from 'mongoose'
import { join } from 'path'
import BadRequestError from '../errors/bad-request-error'
import ConflictError from '../errors/conflict-error'
import NotFoundError from '../errors/not-found-error'
import Product from '../models/product'
import movingFile from '../utils/movingFile'
import {
    objIdSchema,
    productBodySchema,
    productUpdateBodySchema,
} from '../middlewares/validations'

// GET /product
const getProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { page = 1, limit = 5 } = req.query

        const MAX_LIMIT = 5

        const rawLimit = Number(limit)
        const safeLimit = Number.isNaN(rawLimit)
            ? MAX_LIMIT
            : Math.min(rawLimit, MAX_LIMIT)

        const options = {
            skip: (Number(page) - 1) * safeLimit,
            limit: safeLimit,
        }
        const products = await Product.find({}, null, options)
        const totalProducts = await Product.countDocuments({})
        const totalPages = Math.ceil(totalProducts / safeLimit)
        return res.send({
            items: products,
            pagination: {
                totalProducts,
                totalPages,
                currentPage: Number(page),
                pageSize: safeLimit,
            },
        })
    } catch (err) {
        return next(err)
    }
}

// POST /product
const createProduct = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { error, value } = productBodySchema.validate(req.body, {
            abortEarly: false,
        })
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Ошибка валидации товара',
                details: error.details.map((d) => d.message),
            })
        }
        const { description, category, price, title, image } = value

        if (image) {
            movingFile(
                image.fileName,
                join(__dirname, `../public/${process.env.UPLOAD_PATH_TEMP}`),
                join(__dirname, `../public/${process.env.UPLOAD_PATH}`)
            )
        }

        const product = await Product.create({
            description,
            image,
            category,
            price,
            title,
        })
        return res.status(constants.HTTP_STATUS_CREATED).send(product)
    } catch (error) {
        if (error instanceof MongooseError.ValidationError) {
            return next(new BadRequestError(error.message))
        }
        if (error instanceof Error && error.message.includes('E11000')) {
            return next(
                new ConflictError('Товар с таким заголовком уже существует')
            )
        }
        return next(error)
    }
}

// TODO: Добавить guard admin
// PUT /product
const updateProduct = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { productId } = req.params

        const idValidation = objIdSchema.validate(
            { productId },
            { abortEarly: false }
        )
        if (idValidation.error) {
            return res.status(400).json({
                success: false,
                message: 'Ошибка валидации ID товара',
                details: idValidation.error.details.map((d) => d.message),
            })
        }

        const { error, value } = productUpdateBodySchema.validate(req.body, {
            abortEarly: false,
        })
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Ошибка валидации полей товара',
                details: error.details.map((d) => d.message),
            })
        }

        if (value.image) {
            movingFile(
                value.image.fileName,
                join(__dirname, `../public/${process.env.UPLOAD_PATH_TEMP}`),
                join(__dirname, `../public/${process.env.UPLOAD_PATH}`)
            )
        }

        const product = await Product.findByIdAndUpdate(
            productId,
            {
                $set: {
                    ...value, // используем проверенные данные
                    price: value.price !== undefined ? value.price : null,
                    image: value.image !== undefined ? value.image : undefined,
                },
            },
            { runValidators: true, new: true }
        ).orFail(() => new NotFoundError('Нет товара по заданному id'))

        return res.send(product)
    } catch (error) {
        if (error instanceof MongooseError.ValidationError) {
            return next(new BadRequestError(error.message))
        }
        if (error instanceof MongooseError.CastError) {
            return next(new BadRequestError('Передан не валидный ID товара'))
        }
        if (error instanceof Error && error.message.includes('E11000')) {
            return next(
                new ConflictError('Товар с таким заголовком уже существует')
            )
        }
        return next(error)
    }
}

// TODO: Добавить guard admin
// DELETE /product
const deleteProduct = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { productId } = req.params
        const idValidation = objIdSchema.validate(
            { productId },
            { abortEarly: false }
        )
        if (idValidation.error) {
            return res.status(400).json({
                success: false,
                message: 'Ошибка валидации ID товара',
                details: idValidation.error.details.map((d) => d.message),
            })
        }

        const product = await Product.findByIdAndDelete(productId).orFail(
            () => new NotFoundError('Нет товара по заданному id')
        )
        return res.send(product)
    } catch (error) {
        if (error instanceof MongooseError.CastError) {
            return next(new BadRequestError('Передан не валидный ID товара'))
        }
        return next(error)
    }
}

export { createProduct, deleteProduct, getProducts, updateProduct }
