import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'

// Resolve the root environment file independently of the working directory.
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true })

const configuredPort = process.env.PORT || 8080
const port = Number(configuredPort)

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535')
}

export default {
  port,
  jwtSecret: process.env.JWT_SECRET ?? '',
  bigquery: {
    projectId: process.env.GOOGLE_CLOUD_PROJECT?.trim() ?? '',
    dataset: process.env.BIGQUERY_DATASET?.trim() || 'sales_dashboard',
    location: process.env.BIGQUERY_LOCATION?.trim() || 'asia-southeast2',
  },
}
