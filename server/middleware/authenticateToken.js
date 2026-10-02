export function authenticateToken(tokens) {
  return (req, res, next) => {
    const match = /^Bearer ([^\s]+)$/i.exec(req.get('authorization') ?? '')
    const claims = match ? tokens.verify(match[1]) : null
    if (!claims) return res.status(401).json({ success: false, message: 'Authentication required' })
    req.auth = claims
    next()
  }
}
