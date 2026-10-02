import assert from 'node:assert/strict'
import { randomUUID, randomBytes } from 'node:crypto'
import { once } from 'node:events'
import bcrypt from 'bcrypt'
import app from '../app.js'
import env from '../config/env.js'
import { createBigQueryService } from '../services/bigqueryService.js'
import { createUserService } from '../services/userService.js'
import { createTokenService } from '../services/tokenService.js'
import { createManagementService } from '../services/managementService.js'

async function main() {
  // This manual integration check only targets the app-owned dataset.
  assert.equal(env.bigquery.projectId, 'id-fpoc-0608-data-posindo')
  assert.equal(env.bigquery.dataset, 'sales_dashboard')
  assert.equal(env.bigquery.location, 'asia-southeast2')
  const query = createBigQueryService()
  const users = createUserService()
  const tokens = createTokenService()
  const id = `PHASE10_VALIDATE_${randomUUID()}`
  const email = `${id.toLowerCase()}@example.invalid`
  const snapshotSql = `SELECT
    (SELECT COUNT(*) FROM \`id-fpoc-0608-data-posindo.sales_dashboard.users\`) users,
    (SELECT COUNT(*) FROM \`id-fpoc-0608-data-posindo.sales_dashboard.sales\`) sales,
    (SELECT COUNT(*) FROM \`id-fpoc-0608-data-posindo.sales_dashboard.audit_logs\`) audit_logs,
    (SELECT TO_HEX(SHA256(STRING_AGG(TO_JSON_STRING(u), '' ORDER BY user_id))) FROM \`id-fpoc-0608-data-posindo.sales_dashboard.users\` u) users_digest,
    (SELECT TO_HEX(SHA256(STRING_AGG(TO_JSON_STRING(s), '' ORDER BY sale_id))) FROM \`id-fpoc-0608-data-posindo.sales_dashboard.sales\` s) sales_digest,
    (SELECT TO_HEX(SHA256(STRING_AGG(TO_JSON_STRING(a), '' ORDER BY log_id))) FROM \`id-fpoc-0608-data-posindo.sales_dashboard.audit_logs\` a
      WHERE JSON_VALUE(details, '$.user_id') IS DISTINCT FROM @id) existing_audit_digest`
  const snapshot = async () => (await query.query(snapshotSql, { id }))[0]
  const before = await snapshot()
  const demoTokens = {}
  for (const role of ['admin', 'analyst', 'viewer']) {
    const user = await users.findById(`DEMO_${role.toUpperCase()}`)
    assert.equal(user?.role, role)
    demoTokens[role] = tokens.sign(user)
  }
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const url = `http://127.0.0.1:${server.address().port}/api`
  async function request(path, token = demoTokens.admin, method = 'GET', body) {
    return fetch(`${url}${path}`, { method,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  }
  const roleLogs = () => query.query(`SELECT user_id, action, resource, details FROM
    \`id-fpoc-0608-data-posindo.sales_dashboard.audit_logs\` WHERE JSON_VALUE(details, '$.user_id') = @id`, { id })
  let inserted = false
  try {
    for (const path of ['/users', '/audit-logs']) {
      const response = await request(path)
      assert.equal(response.status, 200)
      const body = await response.json()
      for (const row of body.users ?? body.logs) {
        assert.equal(row.password_hash, undefined)
        assert.equal(row.password, undefined)
      }
    }
    for (const token of [demoTokens.analyst, demoTokens.viewer, null, 'invalid']) {
      for (const [path, method] of [['/users', 'GET'], ['/audit-logs', 'GET'], [`/users/${id}/role`, 'PATCH']]) {
        assert.equal((await request(path, token, method, method === 'PATCH' ? { role: 'admin' } : undefined)).status,
          token === null || token === 'invalid' ? 401 : 403)
      }
    }
    const hash = await bcrypt.hash(randomBytes(32).toString('base64url'), 12)
    await query.query(`ASSERT NOT EXISTS(SELECT 1 FROM \`id-fpoc-0608-data-posindo.sales_dashboard.users\` WHERE user_id=@id OR email=@email) AS 'Validation identity exists';
      INSERT INTO \`id-fpoc-0608-data-posindo.sales_dashboard.users\` (user_id,name,email,password_hash,role,status,created_at)
      VALUES (@id,'Phase 10 Temporary Validation',@email,@hash,'viewer','active',CURRENT_TIMESTAMP());`, { id, email, hash })
    inserted = true
    const oldViewerToken = tokens.sign(await users.findById(id))
    const rolePath = `/users/${id}/role`
    let response = await request(rolePath, demoTokens.admin, 'PATCH', { role: 'analyst' })
    assert.equal(response.status, 200)
    let body = await response.json()
    assert.equal(body.user.role, 'analyst')
    assert.equal(body.user.password_hash, undefined)
    let logs = await roleLogs()
    assert.equal(logs.length, 1)
    assert.equal(logs[0].user_id, 'DEMO_ADMIN')
    assert.equal(logs[0].action, 'UPDATE_ROLE')
    assert.equal(logs[0].resource, 'users')
    assert.deepEqual(JSON.parse(logs[0].details), { user_id: id, old_role: 'viewer', new_role: 'analyst' })
    assert.equal((await request(rolePath, demoTokens.admin, 'PATCH', { role: 'analyst' })).status, 200)
    assert.equal((await request(rolePath, demoTokens.admin, 'PATCH', { role: 'owner' })).status, 400)
    assert.equal((await request('/users/PHASE10_MISSING/role', demoTokens.admin, 'PATCH', { role: 'viewer' })).status, 404)
    assert.equal((await roleLogs()).length, 1)
    assert.equal((await request(rolePath, demoTokens.admin, 'PATCH', { role: 'admin' })).status, 200)
    assert.equal((await request('/users', oldViewerToken)).status, 200)
    assert.equal((await request(rolePath, demoTokens.admin, 'PATCH', { role: 'viewer' })).status, 200)
    assert.equal((await request('/users', oldViewerToken)).status, 403)
    assert.equal((await roleLogs()).length, 3)
    const beforeFailureUser = await users.findById(id)
    const failing = createManagementService({ query(sql, params) {
      return query.query(sql.replace('INSERT INTO `id-fpoc-0608-data-posindo.sales_dashboard.audit_logs`',
        "ASSERT FALSE AS 'Phase 10 intentional rollback'; INSERT INTO `id-fpoc-0608-data-posindo.sales_dashboard.audit_logs`"), params)
    } })
    await assert.rejects(failing.updateRole(id, 'analyst', 'DEMO_ADMIN'), error => error.message.includes('Phase 10 intentional rollback'))
    assert.deepEqual(await users.findById(id), beforeFailureUser)
    assert.equal((await roleLogs()).length, 3)
    response = await request('/audit-logs?limit=100')
    assert.equal(response.status, 200)
    body = await response.json()
    assert.equal(body.logs.filter(row => row.action === 'UPDATE_ROLE' && JSON.parse(row.details).user_id === id).length, 3)
    console.log('PASS: Admin safe lists and role changes; Analyst/Viewer rejected; invalid/missing inputs handled')
    console.log('PASS: no-op creates no audit; old JWT follows new roles; failed audit rolls back the role change')
  } finally {
    try {
      // Delete only the exact fixture identity inserted by this run; retain its role audits.
      if (inserted) await query.query('DELETE FROM `id-fpoc-0608-data-posindo.sales_dashboard.users` WHERE user_id=@id AND email=@email', { id, email })
    } finally {
      await new Promise(resolve => server.close(resolve))
    }
  }
  const after = await snapshot()
  assert.equal(after.users, before.users)
  assert.equal(after.sales, before.sales)
  assert.equal(after.users_digest, before.users_digest)
  assert.equal(after.sales_digest, before.sales_digest)
  assert.equal(after.existing_audit_digest, before.existing_audit_digest)
  assert.equal(Number(after.audit_logs), Number(before.audit_logs) + 3)
  console.log('PASS: temporary user removed; existing users, sales, and audit records unchanged')
  console.log(JSON.stringify({ users: after.users, sales: after.sales, audit_logs: after.audit_logs }))
}

// SDK error objects can contain credentials; emit only their type/code.
main().catch(error => {
  console.error(`FAIL: management validation (${error.code ?? error.name ?? 'unknown error'})`)
  process.exitCode = 1
})
