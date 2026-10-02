import assert from 'node:assert/strict'
import { once } from 'node:events'
import { before, after, test } from 'node:test'
import { createApp } from '../app.js'
import { createTokenService } from '../services/tokenService.js'

const tokens = createTokenService('management-test-only-secret-at-least-32-bytes')
const records = new Map(['admin', 'analyst', 'viewer'].map(role => [role, {
  userId: role, name: role, email: `${role}@example.com`, role, status: 'active', createdAt: '2026-10-02T00:00:00Z',
  password_hash: 'private-hash', password: 'private-password',
}]))
records.set('target', { ...records.get('viewer'), userId: 'target' })
const users = { async findById(id) {
  const user = records.get(id)
  return user ? { ...user, user_id: user.userId } : null
} }
const audit = []
let calls = 0, fail = false
function track() { calls++; if (fail) throw new Error('private database detail') }
const management = {
  async listUsers({ limit, offset }) { track(); return [...records.values()].slice(offset, offset + limit) },
  async updateRole(id, role, actorId) {
    track()
    const user = records.get(id)
    if (!user) return null
    if (user.role !== role) audit.push({ logId: `LOG_${audit.length}`, userId: actorId, action: 'UPDATE_ROLE', resource: 'users', details: JSON.stringify({ user_id: id, old_role: user.role, new_role: role }), createdAt: '2026-10-02T00:00:00Z' })
    user.role = role
    return user
  },
  async listAuditLogs({ limit, offset }) { track(); return audit.slice(offset, offset + limit) },
}
let server, baseUrl
before(async () => {
  server = createApp({ users, tokens, management }).listen(0, '127.0.0.1')
  await once(server, 'listening')
  baseUrl = `http://127.0.0.1:${server.address().port}/api`
})
after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())))
const tokenFor = role => tokens.sign({ user_id: role, email: `${role}@example.com`, role })
function request(path, role = 'admin', method = 'GET', body) {
  return fetch(`${baseUrl}${path}`, { method,
    headers: { ...(role ? { Authorization: `Bearer ${tokenFor(role)}` } : {}), 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}
const endpoints = [['/users', 'GET'], ['/users/target/role', 'PATCH'], ['/audit-logs', 'GET']]

test('Admin lists users with safe fields and bounded pagination', async () => {
  const response = await request('/users?limit=2&offset=1')
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  const body = await response.json()
  assert.equal(body.users.length, 2)
  assert.deepEqual(body.pagination, { limit: 2, offset: 1 })
  for (const user of body.users) {
    assert.deepEqual(Object.keys(user).sort(), ['userId', 'name', 'email', 'role', 'status', 'createdAt'].sort())
    assert.equal(user.password_hash, undefined)
    assert.equal(user.password, undefined)
  }
})

test('Analyst and Viewer cannot list users, change roles, or view audits', async () => {
  const beforeCalls = calls
  for (const role of ['analyst', 'viewer']) {
    for (const [path, method] of endpoints) {
      const response = await request(path, role, method, method === 'PATCH' ? { role: 'admin' } : undefined)
      assert.equal(response.status, 403)
      assert.deepEqual(await response.json(), { success: false, message: 'Forbidden' })
    }
  }
  assert.equal(calls, beforeCalls)
})

test('all management endpoints reject missing or invalid JWTs before service calls', async () => {
  const beforeCalls = calls
  for (const [path, method] of endpoints) {
    assert.equal((await request(path, null, method)).status, 401)
    assert.equal((await fetch(`${baseUrl}${path}`, { method, headers: { Authorization: 'Bearer invalid' } })).status, 401)
  }
  assert.equal(calls, beforeCalls)
})

test('Admin changes roles and audit records actor, target, previous role, and new role', async () => {
  for (const role of ['analyst', 'admin', 'viewer']) {
    const previous = records.get('target').role
    const response = await request('/users/target/role', 'admin', 'PATCH', { role })
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.equal(body.user.role, role)
    assert.equal(body.user.password_hash, undefined)
    assert.equal(body.user.password, undefined)
    const entry = audit.at(-1)
    assert.equal(entry.userId, 'admin')
    assert.equal(entry.action, 'UPDATE_ROLE')
    assert.deepEqual(JSON.parse(entry.details), { user_id: 'target', old_role: previous, new_role: role })
  }
  const count = audit.length
  assert.equal((await request('/users/target/role', 'admin', 'PATCH', { role: 'viewer' })).status, 200)
  assert.equal(audit.length, count, 'unchanged role is not an actual change')
  assert.equal((await request('/users/missing/role', 'admin', 'PATCH', { role: 'viewer' })).status, 404)
  assert.equal(audit.length, count)
  const response = await request('/audit-logs')
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { success: true, logs: audit, pagination: { limit: 50, offset: 0 } })
})

test('invalid roles, extra fields, IDs, and pagination are rejected before mutations', async () => {
  const beforeCalls = calls
  for (const body of [null, [], {}, { role: 'owner' }, { role: 'Admin' }, { role: ' admin ' }, { role: 123 },
    { role: 'admin', status: 'active' }, { role: 'admin', userId: 'other' }]) {
    assert.equal((await request('/users/target/role', 'admin', 'PATCH', body)).status, 400)
  }
  assert.equal((await request('/users/bad%20id/role', 'admin', 'PATCH', { role: 'viewer' })).status, 400)
  for (const path of ['/users', '/audit-logs']) {
    for (const query of ['limit=101', 'limit=0', 'offset=-1', 'limit=1&limit=2']) {
      assert.equal((await request(`${path}?${query}`)).status, 400)
    }
  }
  assert.equal(calls, beforeCalls)
})

test('role changes revoke or grant access on an already issued token', async () => {
  const staleViewerToken = tokenFor('target')
  await request('/users/target/role', 'admin', 'PATCH', { role: 'admin' })
  assert.equal((await fetch(`${baseUrl}/users`, { headers: { Authorization: `Bearer ${staleViewerToken}` } })).status, 200)
  await request('/users/target/role', 'admin', 'PATCH', { role: 'viewer' })
  assert.equal((await fetch(`${baseUrl}/users`, { headers: { Authorization: `Bearer ${staleViewerToken}` } })).status, 403)
})

test('management service failures return sanitized 500 responses', async () => {
  fail = true
  try {
    for (const [path, method] of endpoints) {
      const response = await request(path, 'admin', method, method === 'PATCH' ? { role: 'viewer' } : undefined)
      assert.equal(response.status, 500)
      assert.deepEqual(await response.json(), { success: false, message: 'Internal server error' })
    }
  } finally { fail = false }
})
