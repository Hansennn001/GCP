# Backend RBAC (Phase 7)

Authentication setup and login contracts are in [AUTHENTICATION.md](AUTHENTICATION.md).
This phase adds reusable role authorization and read-only access checks.

## Permission matrix

| Permission | Admin | Analyst | Viewer |
|---|---|---|---|
| `dashboard.read` | Yes | Yes | Yes |
| `analytics.read` | Yes | Yes | Yes |
| `sales.read` | Yes | Yes | Yes |
| `sales.create` | Yes | Yes | No |
| `sales.delete` | Yes | No | No |
| `users.read` | Yes | No | No |
| `users.role.update` | Yes | No | No |
| `audit-logs.read` | Yes | No | No |

The matrix lives in `config/permissions.js`. Unrecognized roles are denied.

## Reusable guard

Use authentication before authorization:

```js
import { authenticateToken } from './middleware/authenticateToken.js'
import { authorizeRoles } from './middleware/authorizeRoles.js'

router.get('/users', authenticateToken(tokens), authorizeRoles('admin'), controller)
```

The example demonstrates guard wiring. `/api/users` is now
implemented in Phase 10; see [MANAGEMENT_API.md](MANAGEMENT_API.md).
`createRoleAuthorizer(users)` allows an injected user repository
for tests and routers. It returns the same `authorizeRoles(...allowedRoles)`
interface. Empty or invalid allowed-role lists are configuration errors.

The guard uses the verified JWT's user ID to read the current user from
BigQuery. It checks active status and the current database role rather than
trusting the token's potentially stale role, client headers, or query input.
Role changes therefore take effect on the next guarded request. A successful
guard places safe current user fields on `req.user`, excluding password hashes.

Missing/invalid/expired JWTs, missing users, and inactive users return 401.
Authenticated users without the required role receive 403 with
`{"success":false,"message":"Forbidden"}`. Database failures propagate to
the existing sanitized 500 handler. Guard responses use `Cache-Control: no-store`.

## Read-only permission probes

For every permission above, the API exposes:

```text
GET /api/access/<permission>
Authorization: Bearer <token>
```

For example, `GET /api/access/users.read` returns HTTP 200 for an active Admin:

```json
{ "success": true, "permission": "users.read" }
```

Analyst and Viewer receive 403 for that endpoint. `sales.create` permits Admin
and Analyst; the read permissions permit all three roles. These GET endpoints
only check access. They do not list users, return business data, create/delete
sales, change roles, or write audit logs. POST/PATCH/DELETE probe methods and
unknown permissions return 404. The actual sales API starts in Phase 8.

## Validation

Run from the repository root:

```bash
npm --prefix server run check
npm --prefix server test
```

The tests exercise the entire permission matrix through HTTP using signed
JWTs and isolated user fixtures. They also cover invalid/expired tokens,
revoked roles, inactive/removed users, unknown roles, client role hints,
sanitized database failures, safe user fields, and future-route boundaries.
Role-change tests only alter in-memory fixtures; cloud users remain unchanged.

Phase 7 validation results:

- Syntax checks and all 26 backend tests passed.
- A read-only live Node HTTP integration check logged in the three demo
  accounts using Keychain credentials held in memory, then exercised all
  eight probes for each role (24 permission checks). Every result matched
  the matrix, including Admin success and Analyst/Viewer rejection on
  Admin-only permissions.
- Every probe returned 401 for missing and invalid JWTs; health returned 200.
- BigQuery counts before/after remained three users, 750 sales, and zero
  audit logs. No cloud records, IAM, or resources were changed.

Phase 7 validation above records its original completion state. Phase 8 now
implements the guarded sales endpoints documented in [SALES_API.md](SALES_API.md).
