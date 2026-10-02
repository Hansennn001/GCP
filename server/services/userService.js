import env from '../config/env.js'
import { createBigQueryService } from './bigqueryService.js'

export function createUserService(queryService) {
  async function find(column, value) {
    // Validate identifiers separately; user input is always a query parameter.
    const { projectId, dataset } = env.bigquery
    if (!/^[a-z][a-z0-9-]+$/.test(projectId) || !/^[A-Za-z0-9_]+$/.test(dataset)) {
      throw new Error('Invalid BigQuery user table configuration')
    }
    const rows = await (queryService ?? createBigQueryService()).query(
      `SELECT user_id, name, email, password_hash, role, status FROM \`${projectId}.${dataset}.users\` WHERE ${column} = @value LIMIT 2`,
      { value },
    )
    // Ambiguous identities must never authenticate.
    return rows.length === 1 ? rows[0] : null
  }
  return {
    findByEmail: (email) => find('LOWER(email)', email),
    findById: (id) => find('user_id', id),
  }
}

export function safeUser(user) {
  return { userId: user.user_id, name: user.name, email: user.email, role: user.role, status: user.status }
}
