import { BigQuery } from '@google-cloud/bigquery'
import env from './env.js'

let client

export function createBigQueryClient(config = env.bigquery) {
  if (!config.projectId || config.projectId === 'your-project-id') {
    throw new Error('Set GOOGLE_CLOUD_PROJECT to your Google Cloud project ID')
  }
  if (!/^[A-Za-z0-9_]+$/.test(config.dataset)) {
    throw new Error('BIGQUERY_DATASET must contain only letters, numbers, and underscores')
  }
  if (!config.location) throw new Error('Set BIGQUERY_LOCATION to the dataset location')

  // The SDK uses Application Default Credentials; no credential files are loaded here.
  return new BigQuery({ projectId: config.projectId, location: config.location })
}

export function getBigQueryClient() {
  client ??= createBigQueryClient()
  return client
}
