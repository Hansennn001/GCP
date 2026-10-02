import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import healthRoutes from './routes/healthRoutes.js'
import { createAuthRoutes } from './routes/authRoutes.js'
import { createAccessRoutes } from './routes/accessRoutes.js'
import notFound from './middleware/notFound.js'
import errorHandler from './middleware/errorHandler.js'

export function createApp(authDependencies) {
  const app = express()

  app.disable('x-powered-by')
  app.use(helmet())
  app.use(cors())
  app.use(express.json({ limit: '100kb' }))
  app.use('/api', healthRoutes)
  app.use('/api/auth', createAuthRoutes(authDependencies))
  app.use('/api/access', createAccessRoutes(authDependencies))
  app.use(notFound)
  app.use(errorHandler)

  return app
}

export default createApp()
