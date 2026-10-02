import jwt from 'jsonwebtoken'
import env from '../config/env.js'

export function createTokenService(secret = env.jwtSecret) {
  function signingKey() {
    if (typeof secret !== 'string' || Buffer.byteLength(secret) < 32) {
      throw new Error('JWT_SECRET must contain at least 32 bytes')
    }
    return secret
  }
  return {
    sign(user) {
      return jwt.sign({ userId: user.user_id, email: user.email, role: user.role }, signingKey(), {
        algorithm: 'HS256', expiresIn: 3600, issuer: 'sales-insight-dashboard', audience: 'sales-insight-dashboard-api',
      })
    },
    verify(token) {
      const key = signingKey()
      try {
        const claims = jwt.verify(token, key, {
          algorithms: ['HS256'], issuer: 'sales-insight-dashboard', audience: 'sales-insight-dashboard-api',
        })
        if (typeof claims !== 'object' || typeof claims.userId !== 'string' || !claims.userId ||
            typeof claims.email !== 'string' || typeof claims.role !== 'string' || !Number.isInteger(claims.exp)) return null
        return claims
      } catch {
        return null
      }
    },
  }
}
