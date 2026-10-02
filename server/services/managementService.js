import { randomUUID } from 'node:crypto'
import env from '../config/env.js'
import { createBigQueryService } from './bigqueryService.js'

export function createManagementService(queryService) {
  function tables() {
    const { projectId, dataset } = env.bigquery
    if (!/^[a-z][a-z0-9-]+$/.test(projectId) || !/^[A-Za-z0-9_]+$/.test(dataset)) {
      throw new Error('Invalid BigQuery management table configuration')
    }
    return { users: `\`${projectId}.${dataset}.users\``, audit: `\`${projectId}.${dataset}.audit_logs\`` }
  }
  const query = (sql, params) => (queryService ?? createBigQueryService()).query(sql, params)
  const userColumns = `user_id AS userId, name, email, role, status,
    FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%E6SZ', created_at, 'UTC') AS createdAt`

  return {
    async listUsers({ limit, offset }) {
      return query(`SELECT ${userColumns} FROM ${tables().users}
        ORDER BY created_at DESC, user_id ASC LIMIT @limit OFFSET @offset`, { limit, offset })
    },
    async updateRole(id, role, actorId) {
      const { users, audit } = tables()
      const rows = await query(`
        DECLARE matched_count INT64 DEFAULT 0;
        DECLARE previous_role STRING;
        BEGIN TRANSACTION;
        SET (matched_count, previous_role) = (
          SELECT AS STRUCT COUNT(*), ANY_VALUE(role) FROM ${users} WHERE user_id = @id
        );
        ASSERT matched_count <= 1 AS 'Ambiguous user identity';
        IF matched_count = 1 AND previous_role IS DISTINCT FROM @role THEN
          UPDATE ${users} SET role = @role WHERE user_id = @id;
          INSERT INTO ${audit} (log_id, user_id, action, resource, details, created_at)
          VALUES (@logId, @actorId, 'UPDATE_ROLE', 'users',
            TO_JSON_STRING(STRUCT(@id AS user_id, previous_role AS old_role, @role AS new_role)), CURRENT_TIMESTAMP());
        END IF;
        COMMIT TRANSACTION;
        SELECT ${userColumns} FROM ${users} WHERE user_id = @id LIMIT 1;
      `, { id, role, actorId, logId: randomUUID() })
      return rows[0] ?? null
    },
    async listAuditLogs({ limit, offset }) {
      return query(`SELECT log_id AS logId, user_id AS userId, action, resource, details,
        FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%E6SZ', created_at, 'UTC') AS createdAt
        FROM ${tables().audit} ORDER BY created_at DESC, log_id DESC LIMIT @limit OFFSET @offset`, { limit, offset })
    },
  }
}
