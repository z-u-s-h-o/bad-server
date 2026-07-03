import Joi from 'joi'
import { Types } from 'mongoose'

export const phoneRegExp = /^[\d\s-+()]{7,20}$/

export enum PaymentType {
    Card = 'card',
    Online = 'online',
}

// Схема для тела заказа
export const orderBodySchema = Joi.object().keys({
    items: Joi.array()
        .items(
            Joi.string().custom((value, helpers) => {
                if (Types.ObjectId.isValid(value)) return value
                return helpers.message({ custom: 'Невалидный id' })
            })
        )
        .min(1)
        .messages({ 'array.empty': 'Не указаны товары' }),
    payment: Joi.string()
        .valid(...Object.values(PaymentType))
        .required()
        .messages({
            'string.valid':
                'Указано не валидное значение для способа оплаты, возможные значения - "card", "online"',
            'string.empty': 'Не указан способ оплаты',
        }),
    email: Joi.string()
        .email()
        .required()
        .messages({ 'string.empty': 'Не указан email' }),
    phone: Joi.string()
        .required()
        .pattern(phoneRegExp)
        .messages({ 'string.empty': 'Не указан телефон' }),
    address: Joi.string()
        .required()
        .messages({ 'string.empty': 'Не указан адрес' }),
    total: Joi.number()
        .required()
        .messages({ 'number.empty': 'Не указана сумма заказа' }),
    comment: Joi.string().optional().allow(''),
})

// Схема для создания товара
export const productBodySchema = Joi.object().keys({
    title: Joi.string().required().min(2).max(30).messages({
        'string.min': 'Минимальная длина поля "name" - 2',
        'string.max': 'Максимальная длина поля "name" - 30',
        'string.empty': 'Поле "title" должно быть заполнено',
    }),
    image: Joi.object()
        .keys({
            fileName: Joi.string().required(),
            originalName: Joi.string().required(),
        })
        .optional(),
    category: Joi.string().required().messages({
        'string.empty': 'Поле "category" должно быть заполнено',
    }),
    description: Joi.string().required().messages({
        'string.empty': 'Поле "description" должно быть заполнено',
    }),
    price: Joi.number().allow(null),
})

// Схема для обновления товара
export const productUpdateBodySchema = Joi.object()
    .keys({
        title: Joi.string().min(2).max(30),
        image: Joi.object()
            .keys({
                fileName: Joi.string().required(),
                originalName: Joi.string().required(),
            })
            .optional(),
        category: Joi.string(),
        description: Joi.string(),
        price: Joi.number().allow(null),
    })
    .optional()

// Валидация ID (параметры)
export const objIdSchema = Joi.object().keys({
    productId: Joi.string()
        .required()
        .custom((value, helpers) => {
            if (Types.ObjectId.isValid(value)) return value
            return helpers.message({ any: 'Невалидный id' })
        }),
})

// Схема для регистрации пользователя
export const userBodySchema = Joi.object().keys({
    name: Joi.string().min(2).max(30).messages({
        'string.min': 'Минимальная длина поля "name" - 2',
        'string.max': 'Максимальная длина поля "name" - 30',
    }),
    password: Joi.string().min(6).required().messages({
        'string.empty': 'Поле "password" должно быть заполнено',
    }),
    email: Joi.string()
        .required()
        .email()
        .message('Поле "email" должно быть валидным email-адресом')
        .messages({
            'string.required': 'Поле "email" должно быть заполнено',
        }),
})

// Схема для входа
export const authBodySchema = Joi.object().keys({
    email: Joi.string()
        .required()
        .email()
        .message('Поле "email" должно быть валидным email-адресом')
        .messages({
            'string.required': 'Поле "email" должно быть заполнено',
        }),
    password: Joi.string().required().messages({
        'string.empty': 'Поле "password" должно быть заполнено',
    }),
})
