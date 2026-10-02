import { validatePagination } from '../utils/salesValidation.js'
import { validateRoleUpdate } from '../utils/managementValidation.js'

// Explicit response projections protect the API even if a repository returns extra fields.
function publicUser({ userId, name, email, role, status, createdAt }) {
  return { userId, name, email, role, status, createdAt }
}
function publicLog({ logId, userId, action, resource, details, createdAt }) {
  return { logId, userId, action, resource, details, createdAt }
}

export function createManagementController(management) {
  return {
    async listUsers(req, res) {
      const pagination = validatePagination(req.query)
      const users = (await management.listUsers(pagination)).map(publicUser)
      res.json({ success: true, users, pagination })
    },
    async updateRole(req, res) {
      const { id, role } = validateRoleUpdate(req.params.id, req.body)
      const user = await management.updateRole(id, role, req.user.userId)
      if (!user) return res.status(404).json({ success: false, message: 'User not found' })
      res.json({ success: true, user: publicUser(user) })
    },
    async listAuditLogs(req, res) {
      const pagination = validatePagination(req.query)
      const logs = (await management.listAuditLogs(pagination)).map(publicLog)
      res.json({ success: true, logs, pagination })
    },
  }
}
