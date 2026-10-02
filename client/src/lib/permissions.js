const readers = Object.freeze(['admin', 'analyst', 'viewer'])
const editors = Object.freeze(['admin', 'analyst'])
const admins = Object.freeze(['admin'])

// Client permissions control UX. The backend independently authorizes every API request.
export const permissionRoles = Object.freeze({
  'dashboard.read': readers,
  'analytics.read': readers,
  'sales.read': readers,
  'sales.create': editors,
  'sales.delete': admins,
  'users.read': admins,
  'users.role.update': admins,
  'audit-logs.read': admins,
})

export function hasRole(user, ...roles) {
  return readers.includes(user?.role) && roles.includes(user.role)
}

export function can(user, permission) {
  return Object.hasOwn(permissionRoles, permission) && hasRole(user, ...permissionRoles[permission])
}
