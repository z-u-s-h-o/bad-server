import { Router } from 'express'
import {
    deleteCustomer,
    getCustomerById,
    getCustomers,
    updateCustomer,
} from '../controllers/customers'
import auth, { roleGuardMiddleware } from '../middlewares/auth'
import { Role } from '../models/user'
import { authLimiter } from '../middlewares/rate-limit'

const customerRouter = Router()

customerRouter.get(
    '/',
    auth,
    authLimiter,
    roleGuardMiddleware(Role.Admin),
    getCustomers
)
customerRouter.get('/:id', auth, getCustomerById)
customerRouter.patch('/:id', auth, updateCustomer)
customerRouter.delete('/:id', auth, deleteCustomer)

export default customerRouter
