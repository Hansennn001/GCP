# User management and audit API (Phase 10)

All endpoints require `Authorization: Bearer <token>` and an active Admin
account. [Authentication](AUTHENTICATION.md) and [RBAC](RBAC.md) apply.
Authorization uses the current BigQuery role, so role changes affect the next
request even when an old JWT is still valid. Responses use `Cache-Control:
no-store`. Frontend integration starts in later phases.

## List users

```text
GET /api/users?limit=50&offset=0
```

Returns HTTP 200:

```json
{
  "success": true,
  "users": [
    {
      "userId": "DEMO_VIEWER",
      "name": "Demo Viewer",
      "email": "viewer@example.com",
      "role": "viewer",
      "status": "active",
      "createdAt": "2026-04-01T02:00:00.000000Z"
    }
  ],
  "pagination": { "limit": 50, "offset": 0 }
}
```

Users are ordered by creation time descending, then ID ascending. Queries
select public columns only. The controller also explicitly projects allowed
response fields; password hashes are never returned.

## Change a user's role

```text
PATCH /api/users/:id/role
Content-Type: application/json
```

```json
{ "role": "analyst" }
```

The role must exactly match `admin`, `analyst`, or `viewer`. Extra fields are
rejected. IDs must contain 1–100 letters, digits, underscores, or hyphens.
Invalid input returns 400 with the existing `Request failed` response.

Successful updates return 200 with `{ "success": true, "user": {...} }`,
using the same safe user fields as the list. Missing users return 404 with
`{"success":false,"message":"User not found"}`. Setting the existing role
returns 200 without a new audit record because no role change occurred.

Updates and their `UPDATE_ROLE` audit record are committed in one BigQuery
transaction. Details contain the target user ID, old role, and new role. The
log's user ID identifies the acting Admin. Duplicate target identities abort
and roll back the operation. Name, email, password, status, and creation time
are not changed by this endpoint.

## List audit logs

```text
GET /api/audit-logs?limit=50&offset=0
```

Returns HTTP 200:

```json
{
  "success": true,
  "logs": [
    {
      "logId": "server-generated-uuid",
      "userId": "DEMO_ADMIN",
      "action": "UPDATE_ROLE",
      "resource": "users",
      "details": "{\"user_id\":\"DEMO_VIEWER\",\"old_role\":\"viewer\",\"new_role\":\"analyst\"}",
      "createdAt": "2026-10-02T00:00:00.000000Z"
    }
  ],
  "pagination": { "limit": 50, "offset": 0 }
}
```

Logs are ordered by creation time descending, then log ID descending.
`details` remains the JSON string stored in BigQuery. This endpoint also
returns existing sales mutation audits. Reading users/logs does not add audits.

Both lists default to limit 50 and offset 0. Limits must be 1–100; offsets
must be 0–1,000,000. Empty lists return empty arrays. Pagination shares the
existing sales pagination validator. Concurrent mutations can move rows
between offset pages.

All three endpoints return 401 for missing/invalid tokens or inactive users,
403 for insufficient roles, and sanitized 500 responses for database failures.
They use parameterized queries against the configured app dataset. Only the
three operations above are implemented; no user creation or deletion API is
added in this phase.

## Validation

Commands executed from the repository root:

```bash
npm --prefix server run check
npm --prefix server test
npm --prefix server run check:management
git diff --check
```

All 46 backend tests passed, covering safe response fields, pagination,
Admin-only access, missing/invalid JWTs, accepted/rejected roles, audit details,
no-op/missing-user updates, stale-token permissions, and sanitized errors.

The manual `check:management` integration script requires ADC, a configured
local JWT secret, and the three existing demo users. It is restricted to
`id-fpoc-0608-data-posindo.sales_dashboard` in `asia-southeast2`. It signs demo
tokens locally in memory and never prints passwords, hashes, tokens, or SDK
request metadata. It does not repeat login/password testing.

The check creates one uniquely identified temporary user in the app dataset,
changes that user's role viewer → analyst → admin → viewer, and deletes only
that exact fixture identity in cleanup. Existing demo roles are never changed.
Each successful check adds three retained `UPDATE_ROLE` audits; rerunning the
check intentionally retains three more audit records.

Live results:

- Admin could list safe user records and audit logs; Analyst/Viewer returned
  403 for all three operations. Missing/invalid JWTs returned 401.
- Admin role changes returned 200 and produced the correct actor, target,
  old/new roles, and audit action. Invalid role returned 400 and nonexistent
  target returned 404. No-op and rejected updates added no audits.
- The temporary user's preexisting JWT gained/lost Admin access immediately
  as its database role changed.
- An intentional failure between the role update and audit insert rolled
  back both operations; the user's role and audit count remained unchanged.
- Cleanup removed the temporary user. Before/after full-row digests confirmed
  existing users, sales, and prior audit records remained unchanged.
- Final counts: three users, 750 sales, seven audit logs (four earlier sales
  audits plus three role validation audits).
- No other datasets, IAM, or project settings were modified.

Phase 10 stops here. Phase 11 and frontend integration have not started.
