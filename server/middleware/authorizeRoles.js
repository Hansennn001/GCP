import { createUserService, safeUser } from '../services/userService.js'

export function createRoleAuthorizer(users = createUserService()) {
  return function authorizeRoles(...allowedRoles) {
    if (!allowedRoles.length || allowedRoles.some(role => !['admin', 'analyst', 'viewer'].includes(role))) {
      throw new Error('Authorization requires valid allowed roles')
    }

    return async (req, res, next) => {
      res.set('Cache-Control', 'no-store')
      if (!req.auth?.userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' })
      }

      // Read the current role; a previously issued token must not retain revoked privileges.
      const user = await users.findById(req.auth.userId)
      if (!user || user.status !== 'active') {
        return res.status(401).json({ success: false, message: 'Authentication required' })
      }
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ success: false, message: 'Forbidden' })
      }

      req.user = safeUser(user)
      next()
    }
  }
}

export const authorizeRoles = createRoleAuthorizer()
