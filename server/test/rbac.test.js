import assert from 'node:assert/strict'
import { once } from 'node:events'
import { before, after, test } from 'node:test'
import express from 'express'
import jwt from 'jsonwebtoken'
import { createApp } from '../app.js'
import { createTokenService } from '../services/tokenService.js'
import { createRoleAuthorizer } from '../middleware/authorizeRoles.js'

const tokens = createTokenService('rbac-test-only-secret-at-least-32-bytes')
const records = new Map(['admin', 'analyst', 'viewer'].map(role => [role, {
  user_id: role, name: role, email: `${role}@example.com`, role, status: 'active', password_hash: 'private-hash',
}]))
let lookups = 0
const users = { async findById(id) {
  lookups++
  if (id === 'database-error') throw new Error('private database failure')
  return records.get(id) ?? null
} }
// Expected results are independent of the permission configuration under test.
const matrix = {
  'dashboard.read': [200, 200, 200],
  'analytics.read': [200, 200, 200],
  'sales.read': [200, 200, 200],
  'sales.create': [200, 200, 403],
  'sales.delete': [200, 403, 403],
  'users.read': [200, 403, 403],
  'users.role.update': [200, 403, 403],
  'audit-logs.read': [200, 403, 403],
}
let server, baseUrl
before(async () => {
  server = createApp({ users, tokens }).listen(0, '127.0.0.1')
  await once(server, 'listening')
  baseUrl = `http://127.0.0.1:${server.address().port}`
})
after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())))
const probe = (permission, token, extraHeaders = {}) => fetch(`${baseUrl}/api/access/${permission}`, {
  headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extraHeaders },
})

test('all eight permission guards enforce the complete three-role matrix', async () => {
  for (const [permission, statuses] of Object.entries(matrix)) {
    for (const [index, role] of ['admin', 'analyst', 'viewer'].entries()) {
      const response = await probe(permission, tokens.sign(records.get(role)))
      assert.equal(response.status, statuses[index], `${role}: ${permission}`)
      assert.equal(response.headers.get('cache-control'), 'no-store')
      assert.deepEqual(await response.json(), statuses[index] === 200
        ? { success: true, permission } : { success: false, message: 'Forbidden' })
    }
  }
})

test('every guard rejects missing, invalid, tampered and expired JWTs before user lookup', async () => {
  const valid = tokens.sign(records.get('admin'))
  const invalid = createTokenService('other-test-secret-at-least-32-bytes').sign(records.get('admin'))
  const expired = jwt.sign({ userId: 'admin', email: 'admin@example.com', role: 'admin' },
    'rbac-test-only-secret-at-least-32-bytes', {
      expiresIn: -1, issuer: 'sales-insight-dashboard', audience: 'sales-insight-dashboard-api',
    })
  const beforeLookups = lookups
  for (const permission of Object.keys(matrix)) {
    for (const token of [undefined, 'invalid', `${valid}x`, invalid, expired]) {
      const response = await probe(permission, token)
      assert.equal(response.status, 401)
      assert.deepEqual(await response.json(), { success: false, message: 'Authentication required' })
    }
  }
  assert.equal(lookups, beforeLookups)
})

test('current database role overrides a stale JWT and client role hints', async () => {
  records.set('changed', { ...records.get('admin'), user_id: 'changed' })
  const oldAdminToken = tokens.sign(records.get('changed'))
  records.get('changed').role = 'viewer'
  assert.equal((await probe('users.read?role=admin', oldAdminToken, { 'X-Role': 'admin' })).status, 403)
  assert.equal((await probe('sales.create', oldAdminToken)).status, 403)
  assert.equal((await probe('dashboard.read', oldAdminToken)).status, 200)
  // A new assignment is also effective without requiring a new login.
  records.get('changed').role = 'admin'
  const viewerClaim = tokens.sign({ ...records.get('changed'), role: 'viewer' })
  assert.equal((await probe('users.read', viewerClaim)).status, 200)
})

test('deleted and inactive users receive 401; unknown roles receive 403', async () => {
  for (const [id, role, status, expected] of [
    ['deleted', 'admin', 'active', 401],
    ['inactive', 'admin', 'inactive', 401],
    ['unknown-role', 'superadmin', 'active', 403],
  ]) {
    const user = { ...records.get('admin'), user_id: id, role, status }
    if (id !== 'deleted') records.set(id, user)
    assert.equal((await probe('users.read', tokens.sign(user))).status, expected)
    assert.equal((await probe('dashboard.read', tokens.sign(user))).status, expected)
  }
})

test('authorization database failures return a sanitized 500', async () => {
  const response = await probe('users.read', tokens.sign({ ...records.get('admin'), user_id: 'database-error' }))
  assert.equal(response.status, 500)
  assert.deepEqual(await response.json(), { success: false, message: 'Internal server error' })
})

test('reusable role guard requires authentication and exposes only safe current user fields', async (t) => {
  const authorizeRoles = createRoleAuthorizer(users)
  assert.throws(() => authorizeRoles(), /valid allowed roles/)
  assert.throws(() => authorizeRoles('superadmin'), /valid allowed roles/)
  const app = express()
  app.get('/missing-auth', authorizeRoles('admin'), (_req, res) => res.sendStatus(200))
  app.get('/safe-user', (req, _res, next) => { req.auth = { userId: 'admin' }; next() },
    authorizeRoles('admin'), (req, res) => res.json(req.user))
  const localServer = app.listen(0, '127.0.0.1')
  await once(localServer, 'listening')
  t.after(() => new Promise(resolve => localServer.close(resolve)))
  const url = `http://127.0.0.1:${localServer.address().port}`
  assert.equal((await fetch(`${url}/missing-auth`)).status, 401)
  const response = await fetch(`${url}/safe-user`)
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { userId: 'admin', name: 'admin', email: 'admin@example.com', role: 'admin', status: 'active' })
})

test('permission probes do not expose future business routes or mutation methods', async () => {
  for (const path of ['/api/users', '/api/audit-logs', '/api/access/unknown']) {
    assert.equal((await fetch(`${baseUrl}${path}`)).status, 404)
  }
  for (const method of ['POST', 'PATCH', 'DELETE']) {
    assert.equal((await fetch(`${baseUrl}/api/access/sales.create`, {
      method, headers: { Authorization: `Bearer ${tokens.sign(records.get('admin'))}` },
    })).status, 404)
  }
})
