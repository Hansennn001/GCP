import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'

// Resolve the root environment file independently of the working directory.
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true })

const configuredPort = process.env.PORT || 8080
const port = Number(configuredPort)

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535')
}

const corsOrigins = (process.env.CORS_ORIGINS ?? '').split(',').map(value => value.trim()).filter(Boolean)
for (const origin of corsOrigins) {
  let url
  try { url = new URL(origin) } catch { throw new Error('CORS_ORIGINS must contain comma-separated HTTP(S) origins') }
  if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) {
    throw new Error('CORS_ORIGINS must contain comma-separated HTTP(S) origins')
  }
}

export default {
  production: process.env.NODE_ENV === 'production',
  corsOrigins,
  port,
  jwtSecret: process.env.JWT_SECRET ?? '',
  bigquery: {
    projectId: process.env.GOOGLE_CLOUD_PROJECT?.trim() ?? '',
    dataset: process.env.BIGQUERY_DATASET?.trim() || 'sales_dashboard',
    location: process.env.BIGQUERY_LOCATION?.trim() || 'asia-southeast2',
  },
}
