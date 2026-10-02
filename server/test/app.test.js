import assert from 'node:assert/strict'
import { once } from 'node:events'
import { after, before, test } from 'node:test'
import { spawnSync } from 'node:child_process'
import express from 'express'
import { createApp } from '../app.js'
const app = createApp(undefined, { frontendDir: null, corsOrigins: ['http://localhost:5173'] })
import errorHandler from '../middleware/errorHandler.js'

let server
let baseUrl

before(async () => {
  server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(() => new Promise((resolve, reject) => {
  server.close((error) => error ? reject(error) : resolve())
}))

test('health responds with the service contract and security headers', async () => {
  const response = await fetch(`${baseUrl}/api/health`)
  assert.equal(response.status, 200)
  assert.match(response.headers.get('content-type'), /application\/json/)
  assert.deepEqual(await response.json(), { status: 'ok', service: 'sales-insight-dashboard' })
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
  assert.equal(response.headers.get('x-frame-options'), 'SAMEORIGIN')
  assert.equal(response.headers.get('x-powered-by'), null)
})

test('unknown and future routes return a JSON 404', async () => {
  for (const path of ['/missing', '/api/missing']) {
    const response = await fetch(`${baseUrl}${path}`)
    assert.equal(response.status, 404)
    assert.deepEqual(await response.json(), { success: false, message: 'Not found' })
  }
})

test('malformed JSON returns 400 without echoing request contents', async () => {
  const response = await fetch(`${baseUrl}/api/health`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{private-input',
  })
  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), { success: false, message: 'Invalid JSON body' })
})

test('oversized JSON returns a predictable 413', async () => {
  const response = await fetch(`${baseUrl}/api/health`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: 'x'.repeat(110 * 1024) }),
  })
  assert.equal(response.status, 413)
  assert.deepEqual(await response.json(), { success: false, message: 'Request body too large' })
})

test('CORS responds to a local development preflight', async () => {
  const response = await fetch(`${baseUrl}/api/health`, {
    method: 'OPTIONS', headers: { Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'GET' },
  })
  assert.equal(response.status, 204)
  assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:5173')
  assert.match(response.headers.get('access-control-allow-methods'), /GET/)
})

test('synchronous and asynchronous failures do not expose internal details', async (t) => {
  // Test-only routes: no failure/debug endpoints are added to the application.
  const failingApp = express()
  failingApp.get('/sync', () => { throw new Error('private internal details') })
  failingApp.get('/async', async () => { throw new Error('private internal details') })
  failingApp.use(errorHandler)
  const failingServer = failingApp.listen(0, '127.0.0.1')
  await once(failingServer, 'listening')
  t.after(() => new Promise((resolve, reject) => {
    failingServer.close((error) => error ? reject(error) : resolve())
  }))
  for (const path of ['/sync', '/async']) {
    const response = await fetch(`http://127.0.0.1:${failingServer.address().port}${path}`)
    assert.equal(response.status, 500)
    assert.deepEqual(await response.json(), { success: false, message: 'Internal server error' })
  }
})

test('port configuration supports the default, overrides, and rejects invalid values', () => {
  for (const [value, expected] of [['', 8080], ['18083', 18083]]) {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', 'import env from "./config/env.js"; console.log(env.port)'], {
      cwd: new URL('../', import.meta.url), env: { ...process.env, PORT: value }, encoding: 'utf8',
    })
    assert.equal(result.status, 0, result.stderr)
    assert.equal(Number(result.stdout.trim()), expected)
  }
  for (const value of ['abc', '-1', '0', '8080.5', '65536']) {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', 'import "./config/env.js"'], {
      cwd: new URL('../', import.meta.url), env: { ...process.env, PORT: value }, encoding: 'utf8',
    })
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /PORT must be an integer between 1 and 65535/)
  }
})
