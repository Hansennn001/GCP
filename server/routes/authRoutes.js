import { Router } from 'express'
import { createAuthController } from '../controllers/authController.js'
import { authenticateToken } from '../middleware/authenticateToken.js'
import { createUserService } from '../services/userService.js'
import { createTokenService } from '../services/tokenService.js'

export function createAuthRoutes({ users = createUserService(), tokens = createTokenService() } = {}) {
  const router = Router()
  const controller = createAuthController(users, tokens)
  router.post('/login', controller.login)
  router.get('/me', authenticateToken(tokens), controller.me)
  return router
}
