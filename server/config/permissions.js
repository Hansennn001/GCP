// The build plan's permission matrix is shared by guards and access checks.
const allRoles = Object.freeze(['admin', 'analyst', 'viewer'])
const editors = Object.freeze(['admin', 'analyst'])
const adminOnly = Object.freeze(['admin'])

export const permissionRoles = Object.freeze({
  'dashboard.read': allRoles,
  'analytics.read': allRoles,
  'sales.read': allRoles,
  'sales.create': editors,
  'sales.delete': adminOnly,
  'users.read': adminOnly,
  'users.role.update': adminOnly,
  'audit-logs.read': adminOnly,
})
