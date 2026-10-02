import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import env from './config/env.js'
import { mountFrontend } from './middleware/frontend.js'
import healthRoutes from './routes/healthRoutes.js'
import { createAuthRoutes } from './routes/authRoutes.js'
import { createAccessRoutes } from './routes/accessRoutes.js'
import { createSalesRoutes } from './routes/salesRoutes.js'
import { createReportingRoutes } from './routes/reportingRoutes.js'
import { createManagementRoutes } from './routes/managementRoutes.js'
import notFound from './middleware/notFound.js'
import errorHandler from './middleware/errorHandler.js'

export function createApp(authDependencies, options = {}) {
  const app = express()

  app.disable('x-powered-by')
  const production = options.production ?? env.production
  const corsOrigins = options.corsOrigins ?? env.corsOrigins
  app.use(helmet({
    contentSecurityPolicy: { directives: {
      'connect-src': ["'self'"],
      'upgrade-insecure-requests': production ? [] : null,
    } },
    strictTransportSecurity: production,
  }))
  // Same-origin production and Vite proxy need no cross-origin permission.
  app.use('/api', cors({ origin: corsOrigins, methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'] }))
  app.use(express.json({ limit: '100kb' }))
  app.use('/api', healthRoutes)
  app.use('/api/auth', createAuthRoutes(authDependencies))
  app.use('/api/access', createAccessRoutes(authDependencies))
  app.use('/api/sales', createSalesRoutes(authDependencies))
  app.use('/api', createReportingRoutes(authDependencies))
  app.use('/api', createManagementRoutes(authDependencies))
  // An unknown API must never receive React HTML or a cached frontend response.
  app.use('/api', notFound)
  mountFrontend(app, { ...options, production })
  app.use(notFound)
  app.use(errorHandler)

  return app
}

export default createApp()
