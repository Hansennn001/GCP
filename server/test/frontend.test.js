import assert from 'node:assert/strict'
import { once } from 'node:events'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { before, after, test } from 'node:test'
import { spawnSync } from 'node:child_process'
import { createApp } from '../app.js'

let directory, server, baseUrl
const html = '<!doctype html><html><body><div id="root">Production fixture</div></body></html>'
before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'sales-insight-frontend-'))
  await mkdir(join(directory, 'assets'))
  await writeFile(join(directory, 'index.html'), html)
  await writeFile(join(directory, 'assets', 'app-test123.js'), 'console.log("fixture")')
  await writeFile(join(directory, '.env'), 'PRIVATE_FIXTURE')
  server = createApp(undefined, { frontendDir: directory, production: true, corsOrigins: ['https://allowed.example'] }).listen(0, '127.0.0.1')
  await once(server, 'listening')
  baseUrl = `http://127.0.0.1:${server.address().port}`
})
after(async () => {
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  await rm(directory, { recursive: true, force: true })
})

test('React entry and direct routes support GET/HEAD with revalidation', async () => {
  for (const path of ['/', '/dashboard', '/analytics', '/users', '/transactions', '/audit-logs', '/login', '/unknown-client-route', '/index.html']) {
    const response = await fetch(`${baseUrl}${path}`, { headers: { Accept: 'text/html' } })
    assert.equal(response.status, 200, path)
    assert.match(response.headers.get('content-type'), /text\/html/)
    assert.equal(response.headers.get('cache-control'), 'no-cache')
    assert.equal(await response.text(), html)
    const head = await fetch(`${baseUrl}${path}`, { method: 'HEAD', headers: { Accept: 'text/html' } })
    assert.equal(head.status, 200)
    assert.equal(await head.text(), '')
  }
})

test('hashed assets are served as JavaScript with immutable caching', async () => {
  const response = await fetch(`${baseUrl}/assets/app-test123.js`)
  assert.equal(response.status, 200)
  assert.match(response.headers.get('content-type'), /javascript/)
  assert.match(response.headers.get('cache-control'), /max-age=31536000, immutable/)
  assert.match(await response.text(), /fixture/)
})

test('API routes retain JSON and authentication instead of SPA fallback', async () => {
  const health = await fetch(`${baseUrl}/api/health`)
  assert.equal(health.status, 200)
  assert.equal((await health.json()).status, 'ok')
  for (const path of ['/api', '/api/missing', '/api/missing.js']) {
    const response = await fetch(`${baseUrl}${path}`, { headers: { Accept: 'text/html' } })
    assert.equal(response.status, 404)
    assert.deepEqual(await response.json(), { success: false, message: 'Not found' })
  }
  const protectedApi = await fetch(`${baseUrl}/api/sales`)
  assert.equal(protectedApi.status, 401)
  assert.match(protectedApi.headers.get('content-type'), /json/)
})

test('missing assets, private paths, non-navigation requests stay JSON 404', async () => {
  for (const path of ['/assets/missing.js', '/assets/missing', '/missing.css', '/.env', '/.git/config', '/server/app.js']) {
    const response = await fetch(`${baseUrl}${path}`, { headers: { Accept: 'text/html' } })
    assert.equal(response.status, 404, path)
    assert.deepEqual(await response.json(), { success: false, message: 'Not found' })
  }
  for (const options of [{ method: 'POST' }, { headers: { Accept: 'application/json' } }]) {
    const response = await fetch(`${baseUrl}/dashboard`, options)
    assert.equal(response.status, 404)
    assert.deepEqual(await response.json(), { success: false, message: 'Not found' })
  }
})

test('CORS only grants configured exact origins; same-origin API works without it', async () => {
  for (const origin of ['https://allowed.example', 'https://untrusted.example']) {
    const response = await fetch(`${baseUrl}/api/health`, { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'GET' } })
    assert.equal(response.status, 204)
    assert.equal(response.headers.get('access-control-allow-origin'), origin.includes('allowed') ? origin : null)
    assert.match(response.headers.get('vary'), /Origin/)
  }
  const response = await fetch(`${baseUrl}/api/health`)
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('access-control-allow-origin'), null)
})

test('production security headers cover HTML and default CORS grants no origin', async () => {
  const response = await fetch(`${baseUrl}/dashboard`)
  const csp = response.headers.get('content-security-policy')
  assert.match(csp, /script-src 'self'/)
  assert.match(csp, /connect-src 'self'/)
  assert.match(csp, /upgrade-insecure-requests/)
  assert.match(response.headers.get('strict-transport-security'), /max-age=/)
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
  assert.equal(response.headers.get('x-powered-by'), null)
  const dev = createApp(undefined, { frontendDir: null, production: false, corsOrigins: [] }).listen(0, '127.0.0.1')
  await once(dev, 'listening')
  try {
    const local = await fetch(`http://127.0.0.1:${dev.address().port}/api/health`, { headers: { Origin: 'https://untrusted.example' } })
    assert.equal(local.headers.get('access-control-allow-origin'), null)
    assert.equal(local.headers.get('strict-transport-security'), null)
    assert.doesNotMatch(local.headers.get('content-security-policy'), /upgrade-insecure-requests/)
  } finally { await new Promise(resolve => dev.close(resolve)) }
})

test('production startup requires a build, while API development can omit it', () => {
  const options = { frontendDir: join(directory, 'missing') }
  assert.throws(() => createApp(undefined, { ...options, production: true }), /React build missing/)
  assert.doesNotThrow(() => createApp(undefined, { ...options, production: false }))
})

test('CORS environment accepts origins and rejects wildcard/path/credentials', () => {
  for (const value of ['', 'https://example.com,http://localhost:5173', '*', 'https://example.com/path', 'https://user:pass@example.com', 'invalid']) {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', 'import env from "./config/env.js"; console.log(env.corsOrigins.length)'], {
      cwd: new URL('../', import.meta.url), env: { ...process.env, CORS_ORIGINS: value }, encoding: 'utf8',
    })
    if (value === '' || value.includes('localhost')) assert.equal(result.status, 0, result.stderr)
    else { assert.notEqual(result.status, 0); assert.match(result.stderr, /CORS_ORIGINS must contain/) }
  }
})
