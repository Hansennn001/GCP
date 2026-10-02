import { Router } from 'express'
import { permissionRoles } from '../config/permissions.js'
import { authenticateToken } from '../middleware/authenticateToken.js'
import { createRoleAuthorizer } from '../middleware/authorizeRoles.js'
import { createUserService } from '../services/userService.js'
import { createTokenService } from '../services/tokenService.js'
import { createReportingService } from '../services/reportingService.js'
import { createReportingController } from '../controllers/reportingController.js'

export function createReportingRoutes({ users = createUserService(), tokens = createTokenService(), reports = createReportingService() } = {}) {
  const router = Router()
  const controller = createReportingController(reports)
  const authorizeRoles = createRoleAuthorizer(users)
  const authenticate = authenticateToken(tokens)
  for (const [path, method, permission] of [
    ['/dashboard/summary', 'summary', 'dashboard.read'],
    ['/dashboard/revenue-trend', 'revenueTrend', 'dashboard.read'],
    ['/analytics/products', 'products', 'analytics.read'],
    ['/analytics/regions', 'regions', 'analytics.read'],
    ['/analytics/top-products', 'topProducts', 'analytics.read'],
  ]) {
    router.get(path, authenticate, authorizeRoles(...permissionRoles[permission]), controller[method])
  }
  return router
}
