import bcrypt from 'bcrypt'
import { safeUser } from '../services/userService.js'

export function createAuthController(users, tokens) {
  return {
    async login(req, res) {
      res.set('Cache-Control', 'no-store')
      const { email, password } = req.body ?? {}
      if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
          typeof password !== 'string' || !password || Buffer.byteLength(password) > 72) {
        return res.status(400).json({ success: false, message: 'A valid email and password are required' })
      }
      const user = await users.findByEmail(email.trim().toLowerCase())
      if (!user || user.status !== 'active' || !await bcrypt.compare(password, user.password_hash)) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' })
      }
      res.json({ success: true, token: tokens.sign(user), tokenType: 'Bearer', expiresIn: 3600, user: safeUser(user) })
    },
    async me(req, res) {
      res.set('Cache-Control', 'no-store')
      const user = await users.findById(req.auth.userId)
      if (!user || user.status !== 'active') {
        return res.status(401).json({ success: false, message: 'Authentication required' })
      }
      res.json({ success: true, user: safeUser(user) })
    },
  }
}
