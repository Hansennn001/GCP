import bcrypt from 'bcrypt'
import { readFile } from 'node:fs/promises'
import env from '../config/env.js'
import { createBigQueryService } from '../services/bigqueryService.js'
import { demoUsers, generateSales } from './seedData.js'

try {
  // This seed is deliberately restricted to the dataset provisioned for this app.
  if (env.bigquery.projectId !== 'id-fpoc-0608-data-posindo' || env.bigquery.dataset !== 'sales_dashboard' || env.bigquery.location !== 'asia-southeast2') {
    throw new Error('Seed target must be the application dataset in the configured Posindo project and Jakarta location')
  }
  const service = createBigQueryService()
  const existing = await service.query(
    'SELECT user_id, name, email, role, status, password_hash FROM `id-fpoc-0608-data-posindo.sales_dashboard.users` WHERE user_id IN UNNEST(@ids) OR email IN UNNEST(@emails)',
    { ids: demoUsers.map((user) => user.user_id), emails: demoUsers.map((user) => user.email) },
  )
  const newUsers = []
  for (const user of demoUsers) {
    const matches = existing.filter((row) => row.user_id === user.user_id || row.email === user.email)
    if (matches.length) {
      const row = matches[0]
      if (matches.length !== 1 || ['user_id', 'name', 'email', 'role', 'status'].some((key) => row[key] !== user[key]) || !/^\$2[aby]\$12\$/.test(row.password_hash ?? '')) {
        throw new Error(`Existing demo identity conflicts with the seed: ${user.user_id}; no data was changed`)
      }
      continue
    }
    const password = process.env[user.passwordVariable]
    if (!password || Buffer.byteLength(password) < 12 || Buffer.byteLength(password) > 72) {
      throw new Error(`Provide ${user.passwordVariable} through the process environment (12–72 bytes); do not save it in repository files`)
    }
    const { passwordVariable: _passwordVariable, ...fields } = user
    newUsers.push({ ...fields, password_hash: await bcrypt.hash(password, 12) })
  }
  const sql = await readFile(new URL('../../scripts/bigquery/seed_data.sql', import.meta.url), 'utf8')
  const rows = await service.query(sql, {
    users: JSON.stringify(newUsers), sales: JSON.stringify(generateSales()), identities: JSON.stringify(demoUsers.map(({ passwordVariable: _variable, ...user }) => user)),
  })
  console.log('PASS: Seed committed. Existing rows and passwords were preserved.')
  console.log(JSON.stringify(rows[0]))
} catch (error) {
  // Only locally constructed errors are safe to display; SDK errors may contain query parameters.
  if (!error.code && !error.errors && !error.response) console.error(error.message)
  else console.error('Seed failed. Check ADC, BigQuery permissions, and dataset access; SDK details are omitted.')
  process.exitCode = 1
}
