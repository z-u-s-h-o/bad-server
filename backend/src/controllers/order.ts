import { NextFunction, Request, Response } from 'express'
import { FilterQuery, Error as MongooseError, Types } from 'mongoose'
import BadRequestError from '../errors/bad-request-error'
import NotFoundError from '../errors/not-found-error'
import Order, { IOrder } from '../models/order'
import Product, { IProduct } from '../models/product'
import User from '../models/user'
import { Role } from '../models/user'

// eslint-disable-next-line max-len
// GET /orders?page=2&limit=5&sort=totalAmount&order=desc&orderDateFrom=2024-07-01&orderDateTo=2024-08-01&status=delivering&totalAmountFrom=100&totalAmountTo=1000&search=%2B1

function sanitizeComment(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

const ALLOWED_SORT_FIELDS = new Set([
    'createdAt',
    'totalAmount',
    'orderNumber',
    'status',
]) as Set<'createdAt' | 'totalAmount' | 'orderNumber' | 'status'>

export const getOrders = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const user = res.locals.user
        if (
            !user ||
            !Array.isArray(user.roles) ||
            !user.roles.includes(Role.Admin)
        ) {
            return res.status(403).json({
                success: false,
                message: 'Доступ запрещён: требуется роль администратора',
            })
        }

        const {
            page = 1,
            limit: limitRaw = 10,
            sortField = 'createdAt',
            sortOrder = 'desc',
            status,
            totalAmountFrom,
            totalAmountTo,
            orderDateFrom,
            orderDateTo,
            search,
        } = req.query

        const limit = Number.isNaN(Number(limitRaw))
            ? 10
            : Math.max(1, Math.min(Number(limitRaw), 100))
        const pageNum = Number.isNaN(Number(page))
            ? 1
            : Math.max(1, Number(page))

        const allowedQueryFields = new Set([
            'page',
            'limit',
            'sortField',
            'sortOrder',
            'status',
            'totalAmountFrom',
            'totalAmountTo',
            'orderDateFrom',
            'orderDateTo',
            'search',
        ])
        for (const key of Object.keys(req.query)) {
            if (!allowedQueryFields.has(key as string)) {
                return res.status(400).json({
                    success: false,
                    message: `Недопустимое поле в запросе: ${key}`,
                })
            }
        }

        const filters: FilterQuery<Partial<IOrder>> = {}

        if (typeof status === 'string') {
            filters.status = status
        } else if (status) {
            return res.status(400).json({
                success: false,
                message: 'Поле "status" должно быть строкой',
            })
        }

        if (totalAmountFrom) {
            const val = Number(totalAmountFrom)
            if (!Number.isNaN(val)) {
                filters.totalAmount = { ...filters.totalAmount, $gte: val }
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'totalAmountFrom должно быть числом',
                })
            }
        }
        if (totalAmountTo) {
            const val = Number(totalAmountTo)
            if (!Number.isNaN(val)) {
                filters.totalAmount = { ...filters.totalAmount, $lte: val }
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'totalAmountTo должно быть числом',
                })
            }
        }

        if (orderDateFrom) {
            const date = new Date(orderDateFrom as string)
            if (!isNaN(date.getTime())) {
                filters.createdAt = { ...filters.createdAt, $gte: date }
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'orderDateFrom должна быть валидной датой',
                })
            }
        }
        if (orderDateTo) {
            const date = new Date(orderDateTo as string)
            if (!isNaN(date.getTime())) {
                filters.createdAt = { ...filters.createdAt, $lte: date }
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'orderDateTo должна быть валидной датой',
                })
            }
        }

        const aggregatePipeline: any[] = [
            { $match: filters },
            {
                $lookup: {
                    from: 'products',
                    localField: 'products',
                    foreignField: '_id',
                    as: 'products',
                },
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'customer',
                    foreignField: '_id',
                    as: 'customer',
                },
            },
            { $unwind: '$customer' },
            { $unwind: '$products' },
        ]

        let searchRegex: RegExp | null = null
        if (search) {
            try {
                searchRegex = new RegExp(search as string, 'i')
            } catch (e) {
                return res.json({
                    orders: [],
                    pagination: {
                        totalOrders: 0,
                        totalPages: 0,
                        currentPage: pageNum,
                        pageSize: limit,
                    },
                })
            }
            const searchNumber = Number(search)
            const searchConditions: any[] = [{ 'products.title': searchRegex }]
            if (!Number.isNaN(searchNumber)) {
                searchConditions.push({ orderNumber: searchNumber })
            }
            aggregatePipeline.push({ $match: { $or: searchConditions } })
            filters.$or = searchConditions
        }

        const sortKey = typeof sortField === 'string' ? sortField : 'createdAt'
        if (!ALLOWED_SORT_FIELDS.has(sortKey as any)) {
            return res.status(400).json({
                success: false,
                message: `Недопустимое поле для сортировки: ${sortKey}`,
            })
        }

        const sortValue = sortOrder === 'asc' ? 1 : -1
        const sort: Record<string, 1 | -1> = { [sortKey]: sortValue }

        aggregatePipeline.push(
            { $sort: sort },
            { $skip: (pageNum - 1) * limit },
            { $limit: limit },
            {
                $group: {
                    _id: '$_id',
                    orderNumber: { $first: '$orderNumber' },
                    status: { $first: '$status' },
                    totalAmount: { $first: '$totalAmount' },
                    products: { $push: '$products' },
                    customer: { $first: '$customer' },
                    createdAt: { $first: '$createdAt' },
                },
            }
        )

        const orders = await Order.aggregate(aggregatePipeline)
        const totalOrders = await Order.countDocuments(filters)
        const totalPages = Math.ceil(totalOrders / limit)

        res.status(200).json({
            orders,
            pagination: {
                totalOrders,
                totalPages,
                currentPage: pageNum,
                pageSize: limit,
            },
        })
    } catch (error) {
        next(error)
    }
}

export const getOrdersCurrentUser = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = res.locals.user._id
        const { search, page = 1, limit = 5 } = req.query
        const options = {
            skip: (Number(page) - 1) * Number(limit),
            limit: Number(limit),
        }

        const user = await User.findById(userId)
            .populate({
                path: 'orders',
                populate: [{ path: 'products' }, { path: 'customer' }],
            })
            .orFail(
                () =>
                    new NotFoundError(
                        'Пользователь по заданному id отсутствует в базе'
                    )
            )

        let orders = user.orders as unknown as IOrder[]

        if (search) {
            let searchRegex: RegExp | null = null

            try {
                searchRegex = new RegExp(search as string, 'i')
            } catch (e) {
                searchRegex = null
            }

            if (searchRegex) {
                const products = await Product.find({ title: searchRegex })
                const productIds = products.map((product) => product._id)

                orders = orders.filter((order) => {
                    const matchesProductTitle = order.products.some((product) =>
                        productIds.some((id) => id.equals(product._id))
                    )

                    const searchNumber = Number(search)
                    const matchesOrderNumber =
                        !Number.isNaN(searchNumber) &&
                        order.orderNumber === searchNumber

                    return matchesOrderNumber || matchesProductTitle
                })
            }
        }

        const totalOrders = orders.length
        const totalPages = Math.ceil(totalOrders / Number(limit))

        orders = orders.slice(options.skip, options.skip + options.limit)

        return res.send({
            orders,
            pagination: {
                totalOrders,
                totalPages,
                currentPage: Number(page),
                pageSize: Number(limit),
            },
        })
    } catch (error) {
        next(error)
    }
}

// Get order by ID
export const getOrderByNumber = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const order = await Order.findOne({
            orderNumber: req.params.orderNumber,
        })
            .populate(['customer', 'products'])
            .orFail(
                () =>
                    new NotFoundError(
                        'Заказ по заданному id отсутствует в базе'
                    )
            )
        return res.status(200).json(order)
    } catch (error) {
        if (error instanceof MongooseError.CastError) {
            return next(new BadRequestError('Передан не валидный ID заказа'))
        }
        return next(error)
    }
}

export const getOrderCurrentUserByNumber = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const userId = res.locals.user._id
    try {
        const order = await Order.findOne({
            orderNumber: req.params.orderNumber,
        })
            .populate(['customer', 'products'])
            .orFail(
                () =>
                    new NotFoundError(
                        'Заказ по заданному id отсутствует в базе'
                    )
            )
        if (!order.customer._id.equals(userId)) {
            // Если нет доступа не возвращаем 403, а отдаем 404
            return next(
                new NotFoundError('Заказ по заданному id отсутствует в базе')
            )
        }
        return res.status(200).json(order)
    } catch (error) {
        if (error instanceof MongooseError.CastError) {
            return next(new BadRequestError('Передан не валидный ID заказа'))
        }
        return next(error)
    }
}

// POST /product
export const createOrder = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const basket: IProduct[] = []
        const products = await Product.find<IProduct>({})
        const userId = res.locals.user._id
        const {
            address,
            payment,
            phone,
            total,
            email,
            items,
            comment: rawComment,
        } = req.body

        let comment =
            typeof rawComment === 'string'
                ? sanitizeComment(rawComment)
                : rawComment

        items.forEach((id: Types.ObjectId) => {
            const product = products.find((p) => p._id.equals(id))
            if (!product) {
                throw new BadRequestError(`Товар с id ${id} не найден`)
            }
            if (product.price === null) {
                throw new BadRequestError(`Товар с id ${id} не продается`)
            }
            return basket.push(product)
        })
        const totalBasket = basket.reduce((a, c) => a + c.price, 0)
        if (totalBasket !== total) {
            return next(new BadRequestError('Неверная сумма заказа'))
        }

        const newOrder = new Order({
            totalAmount: total,
            products: items,
            payment,
            phone,
            email,
            comment,
            customer: userId,
            deliveryAddress: address,
        })
        const populateOrder = await newOrder.populate(['customer', 'products'])
        await populateOrder.save()

        return res.status(200).json(populateOrder)
    } catch (error) {
        if (error instanceof MongooseError.ValidationError) {
            return next(new BadRequestError(error.message))
        }
        return next(error)
    }
}

// Update an order
export const updateOrder = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { status } = req.body
        const updatedOrder = await Order.findOneAndUpdate(
            { orderNumber: req.params.orderNumber },
            { status },
            { new: true, runValidators: true }
        )
            .orFail(
                () =>
                    new NotFoundError(
                        'Заказ по заданному id отсутствует в базе'
                    )
            )
            .populate(['customer', 'products'])
        return res.status(200).json(updatedOrder)
    } catch (error) {
        if (error instanceof MongooseError.ValidationError) {
            return next(new BadRequestError(error.message))
        }
        if (error instanceof MongooseError.CastError) {
            return next(new BadRequestError('Передан не валидный ID заказа'))
        }
        return next(error)
    }
}

// Delete an order
export const deleteOrder = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const deletedOrder = await Order.findByIdAndDelete(req.params.id)
            .orFail(
                () =>
                    new NotFoundError(
                        'Заказ по заданному id отсутствует в базе'
                    )
            )
            .populate(['customer', 'products'])
        return res.status(200).json(deletedOrder)
    } catch (error) {
        if (error instanceof MongooseError.CastError) {
            return next(new BadRequestError('Передан не валидный ID заказа'))
        }
        return next(error)
    }
}
