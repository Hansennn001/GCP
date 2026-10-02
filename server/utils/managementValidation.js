export function validateRoleUpdate(id, body) {
  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(id) ||
      !body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).length !== 1 || !['admin', 'analyst', 'viewer'].includes(body.role)) {
    const error = new Error('Invalid user ID or role')
    error.status = 400
    throw error
  }
  return { id, role: body.role }
}
