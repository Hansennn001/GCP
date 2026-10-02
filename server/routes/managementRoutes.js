import { Router } from 'express'
import { permissionRoles } from '../config/permissions.js'
import { authenticateToken } from '../middleware/authenticateToken.js'
import { createRoleAuthorizer } from '../middleware/authorizeRoles.js'
import { createUserService } from '../services/userService.js'
import { createTokenService } from '../services/tokenService.js'
import { createManagementService } from '../services/managementService.js'
import { createManagementController } from '../controllers/managementController.js'

export function createManagementRoutes({ users = createUserService(), tokens = createTokenService(), management = createManagementService() } = {}) {
  const router = Router()
  const controller = createManagementController(management)
  const authorizeRoles = createRoleAuthorizer(users)
  const authenticate = authenticateToken(tokens)
  router.get('/users', authenticate, authorizeRoles(...permissionRoles['users.read']), controller.listUsers)
  router.patch('/users/:id/role', authenticate, authorizeRoles(...permissionRoles['users.role.update']), controller.updateRole)
  router.get('/audit-logs', authenticate, authorizeRoles(...permissionRoles['audit-logs.read']), controller.listAuditLogs)
  return router
}
