import { Router } from 'express'
import { permissionRoles } from '../config/permissions.js'
import { authenticateToken } from '../middleware/authenticateToken.js'
import { createRoleAuthorizer } from '../middleware/authorizeRoles.js'
import { createUserService } from '../services/userService.js'
import { createTokenService } from '../services/tokenService.js'
import { createSalesService } from '../services/salesService.js'
import { createSalesController } from '../controllers/salesController.js'

export function createSalesRoutes({ users = createUserService(), tokens = createTokenService(), sales = createSalesService() } = {}) {
  const router = Router()
  const authorizeRoles = createRoleAuthorizer(users)
  const controller = createSalesController(sales)
  router.use(authenticateToken(tokens))
  router.get('/', authorizeRoles(...permissionRoles['sales.read']), controller.list)
  router.post('/', authorizeRoles(...permissionRoles['sales.create']), controller.create)
  router.delete('/:id', authorizeRoles(...permissionRoles['sales.delete']), controller.remove)
  return router
}
