import { router } from '../lib/trpc.js'
import { authRouter } from './auth.js'
import { productsRouter } from './products.js'
import { userRouter } from './users.js'
import { cartRouter } from './cart.js'
import { orderRouter } from './orders.js'

export const appRouter = router({
  auth: authRouter,
  user: userRouter,
  product: productsRouter,
  cart: cartRouter,
  order: orderRouter,
})

export type AppRouter = typeof appRouter