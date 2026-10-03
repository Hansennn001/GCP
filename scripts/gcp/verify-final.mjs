import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'

// Explicit opt-in: writes demo records, restores roles, retains truthful audit logs.
if (!process.argv.includes('--run-demo-writes')) {
  throw new Error('Use --run-demo-writes to verify live demo mutations and audit logging')
}
const project = 'id-fpoc-0608-data-posindo'
const region = 'asia-southeast2'
const prefix = `${project}.sales_dashboard`
function command(binary, args) {
  try { return execFileSync(binary, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim() }
  catch { throw new Error('Local authentication/query command failed') }
}
function query(sql) {
  return JSON.parse(command('bq', ['--format=json', 'query', '--use_legacy_sql=false', `--project_id=${project}`, `--location=${region}`, sql]))
}
function snapshot() {
  return query(['users', 'sales'].map(table => `SELECT '${table}' AS table_name, COUNT(*) AS row_count, TO_HEX(SHA256(STRING_AGG(TO_JSON_STRING(t), '' ORDER BY TO_JSON_STRING(t)))) AS digest FROM \`${prefix}.${table}\` t`).join(' UNION ALL ') + ' ORDER BY table_name')
}
const url = command('gcloud', ['run', 'services', 'describe', 'sales-insight-dashboard', `--project=${project}`, `--region=${region}`, '--format=value(status.url)'])
const identity = command('gcloud', ['auth', 'print-identity-token'])
async function api(path, expected, token, method = 'GET', body) {
  const response = await fetch(new URL(`/api${path}`, url), {
    method, headers: { 'X-Serverless-Authorization': `Bearer ${identity}`, ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(60000),
  })
  if (response.status !== expected) throw new Error(`${method} ${path}: expected ${expected}, received ${response.status}`)
  return response.status === 204 ? undefined : response.json()
}
const tokens = {}
const pendingSales = new Set()
let restoreRole = false
let originalRole
try {
  const before = snapshot()
  const logsBefore = query(`SELECT * FROM \`${prefix}.audit_logs\` ORDER BY log_id`)
  for (const role of ['admin', 'analyst', 'viewer']) {
    const email = `${role}@example.com`
    const password = command('security', ['find-generic-password', '-s', 'sales-insight-dashboard-demo', '-a', email, '-w'])
    tokens[role] = (await api('/auth/login', 200, undefined, 'POST', { email, password })).token
  }
  const users = (await api('/users', 200, tokens.admin)).users
  const viewer = users.find(user => user.userId === 'DEMO_VIEWER')
  if (!viewer || viewer.role !== 'viewer') throw new Error('Demo Viewer baseline is unexpected')
  originalRole = viewer.role
  const marker = `Phase20 validation ${randomUUID()}`
  const payload = { sale_date: '2026-10-03', product: marker, category: 'Demo verification', region: 'Jakarta', quantity: 1, revenue: '100.25', cost: '60.10' }
  await api('/sales', 403, tokens.viewer, 'POST', payload)
  for (const role of ['viewer', 'analyst']) {
    await api('/sales/PHASE20_NOT_A_REAL_SALE', 403, tokens[role], 'DELETE')
    await api('/users', 403, tokens[role])
    await api('/users/DEMO_VIEWER/role', 403, tokens[role], 'PATCH', { role: 'admin' })
    await api('/audit-logs', 403, tokens[role])
  }
  console.log('PASS: Viewer create denied; Viewer/Analyst delete, user management, and audit access denied')
  const createdIds = []
  for (const role of ['admin', 'analyst']) {
    const result = await api('/sales', 201, tokens[role], 'POST', payload)
    const id = result.sale.sale_id
    if (!/^SALE_[a-f0-9-]+$/.test(id)) throw new Error('Unexpected created sale ID')
    pendingSales.add(id)
    createdIds.push(id)
    await api(`/sales/${id}`, 204, tokens.admin, 'DELETE')
    pendingSales.delete(id)
  }
  console.log('PASS: Admin/Analyst real sale creation and Admin deletion; temporary sales removed')
  restoreRole = true
  await api('/users/DEMO_VIEWER/role', 200, tokens.admin, 'PATCH', { role: 'analyst' })
  const changed = await api('/auth/me', 200, tokens.viewer)
  if (changed.user.role !== 'analyst') throw new Error('Current role did not replace JWT role')
  await api('/access/sales.create', 200, tokens.viewer)
  await api('/users/DEMO_VIEWER/role', 200, tokens.admin, 'PATCH', { role: originalRole })
  restoreRole = false
  await api('/access/sales.create', 403, tokens.viewer)
  console.log('PASS: Admin role change, current-role revalidation, and Viewer role restoration')
  const after = snapshot()
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('Users/sales baseline changed')
  const logsAfter = query(`SELECT * FROM \`${prefix}.audit_logs\` ORDER BY log_id`)
  const priorIds = new Set(logsBefore.map(log => log.log_id))
  const oldLogs = logsAfter.filter(log => priorIds.has(log.log_id))
  if (JSON.stringify(oldLogs) !== JSON.stringify(logsBefore)) throw new Error('Existing audit records changed')
  const added = logsAfter.filter(log => !priorIds.has(log.log_id))
  if (added.length !== 6) throw new Error('Expected exactly six new audit logs')
  for (const id of createdIds) {
    const matching = added.filter(log => JSON.parse(log.details).sale_id === id)
    if (matching.length !== 2 || !matching.some(log => log.action === 'CREATE_SALE') || !matching.some(log => log.action === 'DELETE_SALE')) throw new Error('Sale audit mismatch')
  }
  const roleLogs = added.filter(log => log.action === 'UPDATE_ROLE' && JSON.parse(log.details).user_id === 'DEMO_VIEWER')
  if (roleLogs.length !== 2) throw new Error('Role audit mismatch')
  console.log(`PASS: users/sales counts and full-row digests unchanged; old audit records unchanged; ${added.length} valid audit records retained (total ${logsAfter.length})`)
} catch {
  console.error('FAIL: final live verification; credential details suppressed. Review the last completed group and cleanup result.')
  process.exitCode = 1
} finally {
  try {
    if (restoreRole) await api('/users/DEMO_VIEWER/role', 200, tokens.admin, 'PATCH', { role: originalRole })
    for (const id of pendingSales) await api(`/sales/${id}`, 204, tokens.admin, 'DELETE')
    console.log('Cleanup complete: no tracked temporary sales or role changes remain')
  } catch {
    console.error('Cleanup failed: inspect app-owned demo data before retrying')
    process.exitCode = 1
  }
}
