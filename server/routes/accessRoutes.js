import { Router } from 'express'
import { permissionRoles } from '../config/permissions.js'
import { authenticateToken } from '../middleware/authenticateToken.js'
import { createRoleAuthorizer } from '../middleware/authorizeRoles.js'
import { createUserService } from '../services/userService.js'
import { createTokenService } from '../services/tokenService.js'

// Read-only permission probes demonstrate RBAC without implementing future business APIs.
export function createAccessRoutes({ users = createUserService(), tokens = createTokenService() } = {}) {
  const router = Router()
  const authorizeRoles = createRoleAuthorizer(users)

  for (const [permission, roles] of Object.entries(permissionRoles)) {
    router.get(`/${permission}`, authenticateToken(tokens), authorizeRoles(...roles), (_req, res) => {
      res.json({ success: true, permission })
    })
  }

  return router
}
