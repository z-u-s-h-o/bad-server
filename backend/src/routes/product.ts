import { Router } from 'express'
import {
    createProduct,
    deleteProduct,
    getProducts,
    updateProduct,
} from '../controllers/products'
import auth, { roleGuardMiddleware } from '../middlewares/auth'
import { Role } from '../models/user'

const productRouter = Router()

productRouter.get('/', getProducts)
productRouter.post('/', auth, roleGuardMiddleware(Role.Admin), createProduct)
productRouter.delete(
    '/:productId',
    auth,
    roleGuardMiddleware(Role.Admin),
    deleteProduct
)
productRouter.patch(
    '/:productId',
    auth,
    roleGuardMiddleware(Role.Admin),
    updateProduct
)

export default productRouter
