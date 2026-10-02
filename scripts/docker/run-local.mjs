import { spawn, execFileSync } from 'node:child_process'
import { randomBytes, randomUUID } from 'node:crypto'
import { mkdtemp, readFile, writeFile, chmod, rm } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { once } from 'node:events'

async function main() {
  const port = Number(process.env.LOCAL_DOCKER_PORT || 8080)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid local port')
  const adcSource = process.env.GOOGLE_APPLICATION_CREDENTIALS
    ? resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS)
    : join(process.env.CLOUDSDK_CONFIG || join(homedir(), '.config/gcloud'), 'application_default_credentials.json')
  const adc = await readFile(adcSource)
  if (!JSON.parse(adc).type) throw new Error('ADC credential type missing')
  const directory = await mkdtemp(join(tmpdir(), 'sales-insight-docker-'))
  await chmod(directory, 0o700)
  const name = `sales-insight-local-${randomUUID()}`
  const stop = () => {
    try { execFileSync('docker', ['stop', '--time', '10', name], { stdio: 'ignore', timeout: 15000 }) } catch { /* Already stopped or startup failed. */ }
  }
  try {
    // Individual read-only binds let the image's non-root user read the files.
    // The private host parent directory prevents access by other host users.
    const adcCopy = join(directory, 'adc.json')
    const runtimeConfig = join(directory, 'runtime.env')
    await writeFile(adcCopy, adc, { mode: 0o444 })
    await writeFile(runtimeConfig, [
      'PORT=8080',
      `JWT_SECRET=${randomBytes(32).toString('hex')}`,
      'GOOGLE_CLOUD_PROJECT=id-fpoc-0608-data-posindo',
      'BIGQUERY_DATASET=sales_dashboard',
      'BIGQUERY_LOCATION=asia-southeast2',
      'CORS_ORIGINS=',
    ].join('\n') + '\n', { mode: 0o444 })
    console.log(`Starting local container at http://127.0.0.1:${port}; Ctrl+C stops it and removes temporary credentials.`)
    const child = spawn('docker', [
      'run', '--rm', '--init', '--name', name,
      '--publish', `127.0.0.1:${port}:8080`,
      '--mount', `type=bind,source=${runtimeConfig},target=/app/.env,readonly`,
      '--mount', `type=bind,source=${adcCopy},target=/run/local-adc.json,readonly`,
      '--env', 'GOOGLE_APPLICATION_CREDENTIALS=/run/local-adc.json',
      'sales-insight-dashboard:latest',
    ], { stdio: 'inherit' })
    process.on('SIGINT', stop)
    process.on('SIGTERM', stop)
    try {
      const [code] = await once(child, 'exit')
      if (code !== 0 && code !== 130 && code !== 143) process.exitCode = code || 1
    } finally {
      process.off('SIGINT', stop)
      process.off('SIGTERM', stop)
    }
  } finally {
    stop()
    await rm(directory, { recursive: true, force: true })
  }
}

main().catch(error => {
  // Never print a subprocess object or credential/config contents.
  console.error(`Local Docker startup failed (${error.code || error.name}). Check Docker, the image, ADC login, and port availability.`)
  process.exitCode = 1
})
