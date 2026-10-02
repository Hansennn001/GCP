import assert from 'node:assert/strict'
import { once } from 'node:events'
import { before, after, test } from 'node:test'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { createApp } from '../app.js'
import { createTokenService } from '../services/tokenService.js'
import { createUserService } from '../services/userService.js'

const secret = 'test-only-secret-with-at-least-32-bytes'
const tokens = createTokenService(secret)
const password = 'test-only-password'
let user, server, baseUrl
const users = {
  async findByEmail(email) {
    if (email === 'error@example.com') throw new Error('private database detail')
    if (email === 'inactive@example.com') return { ...user, status: 'inactive' }
    return email === user.email ? user : null
  },
  async findById(id) {
    if (id === 'inactive') return { ...user, status: 'inactive' }
    return id === user.user_id ? user : null
  },
}
before(async () => {
  user = { user_id: 'TEST_USER', name: 'Test User', email: 'user@example.com', role: 'viewer', status: 'active', password_hash: await bcrypt.hash(password, 4) }
  server = createApp({ users, tokens }).listen(0, '127.0.0.1')
  await once(server, 'listening')
  baseUrl = `http://127.0.0.1:${server.address().port}`
})
after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())))
const login = body => fetch(`${baseUrl}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
const me = token => fetch(`${baseUrl}/api/auth/me`, { headers: token === undefined ? {} : { Authorization: token } })

test('login issues a one-hour signed JWT and safe user; authenticated me returns current user', async () => {
  const response = await login({ email: ' USER@EXAMPLE.COM ', password })
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  const body = await response.json()
  assert.equal(body.expiresIn, 3600)
  assert.equal(body.tokenType, 'Bearer')
  assert.equal(body.user.userId, user.user_id)
  assert.equal(body.user.password_hash, undefined)
  assert.equal(body.user.password, undefined)
  const claims = tokens.verify(body.token)
  assert.equal(claims.userId, user.user_id)
  assert.equal(claims.role, 'viewer')
  assert.equal(claims.exp - claims.iat, 3600)
  const profile = await me(`Bearer ${body.token}`)
  assert.equal(profile.status, 200)
  assert.deepEqual(await profile.json(), { success: true, user: body.user })
})

test('wrong password, unknown user and inactive user share a generic 401', async () => {
  for (const body of [{ email: user.email, password: 'wrong' }, { email: 'unknown@example.com', password }, { email: 'inactive@example.com', password }]) {
    const response = await login(body)
    assert.equal(response.status, 401)
    assert.deepEqual(await response.json(), { success: false, message: 'Invalid email or password' })
  }
})

test('invalid login input is rejected before database lookup', async () => {
  for (const body of [{}, null, [], { email: {}, password }, { email: 'bad', password }, { email: user.email, password: 123 }, { email: user.email, password: '' }, { email: user.email, password: 'é'.repeat(37) }]) {
    const response = await login(body)
    assert.equal(response.status, 400)
  }
})

test('me rejects missing, malformed, tampered, expired, wrong-key and wrong-algorithm tokens', async () => {
  const options = { issuer: 'sales-insight-dashboard', audience: 'sales-insight-dashboard-api' }
  const payload = { userId: user.user_id, email: user.email, role: user.role }
  for (const header of [undefined, 'Basic abc', 'Bearer invalid', `Bearer ${tokens.sign(user)}x`,
    `Bearer ${jwt.sign(payload, secret, { ...options, expiresIn: -1 })}`,
    `Bearer ${jwt.sign(payload, 'another-secret', { ...options, expiresIn: 3600 })}`,
    `Bearer ${jwt.sign(payload, secret, { ...options, algorithm: 'HS384', expiresIn: 3600 })}`,
    `Bearer ${jwt.sign(payload, secret, { ...options, audience: 'other', expiresIn: 3600 })}`,
    `Bearer ${jwt.sign(payload, secret, options)}`,
    `Bearer ${jwt.sign({ userId: 123 }, secret, { ...options, expiresIn: 3600 })}`]) {
    const response = await me(header)
    assert.equal(response.status, 401)
    assert.deepEqual(await response.json(), { success: false, message: 'Authentication required' })
  }
})

test('me rejects removed and newly inactive users even with valid signed tokens', async () => {
  for (const id of ['removed', 'inactive']) {
    assert.equal((await me(`Bearer ${tokens.sign({ ...user, user_id: id })}`)).status, 401)
  }
})

test('database errors and missing signing configuration fail safely', async () => {
  const response = await login({ email: 'error@example.com', password })
  assert.equal(response.status, 500)
  assert.deepEqual(await response.json(), { success: false, message: 'Internal server error' })
  assert.throws(() => createTokenService('replace_me').sign(user), /at least 32 bytes/)
})

test('user queries parameterize identities and ambiguous matches fail closed', async () => {
  let count = 1
  const repository = createUserService({ async query(sql, params) {
    assert.match(sql, /@value LIMIT 2/)
    assert.equal(sql.includes("' OR 1=1"), false)
    assert.deepEqual(params, { value: "' OR 1=1" })
    return Array.from({ length: count }, () => user)
  } })
  assert.equal(await repository.findByEmail("' OR 1=1"), user)
  count = 2
  assert.equal(await repository.findByEmail("' OR 1=1"), null)
})
