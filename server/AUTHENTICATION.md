# Backend authentication (Phase 6)

The API authenticates users from the app's BigQuery `users` table. Backend
role authorization is documented in [RBAC.md](RBAC.md); frontend login
integration belongs to a later phase.

## Local setup

Use the existing ADC login and root `.env` BigQuery configuration. Set
`JWT_SECRET` to a random value of at least 32 bytes. To generate a local
secret without printing it, run this once from the repository root:

```bash
node --input-type=module <<'JS'
import { readFileSync, appendFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
const path = '.env'
if (/^JWT_SECRET=/m.test(readFileSync(path, 'utf8'))) {
  throw new Error('JWT_SECRET already exists; replace the placeholder locally if needed')
}
appendFileSync(path, '\nJWT_SECRET=' + randomBytes(48).toString('base64url') + '\n')
JS
```

If `.env` was copied from `.env.example`, remove its `JWT_SECRET=replace_me`
line before running this command. Keep `.env` ignored. The current development
environment already has a generated secret. Changing the secret invalidates
existing tokens. Health checks remain available without cloud credentials or
a JWT secret; login cannot issue tokens until a valid secret is configured.

Start the backend with `npm --prefix server start`. Demo accounts and Keychain
password retrieval are documented in [SEEDING.md](../scripts/bigquery/SEEDING.md).

## API contract

`POST /api/auth/login`, JSON body:

```json
{ "email": "admin@example.com", "password": "your-demo-password" }
```

A successful response is HTTP 200:

```json
{
  "success": true,
  "token": "signed-jwt",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "user": {
    "userId": "DEMO_ADMIN",
    "name": "Demo Admin",
    "email": "admin@example.com",
    "role": "admin",
    "status": "active"
  }
}
```

Email is trimmed and lowercased. Passwords are not trimmed and must fit
bcrypt's 72-byte limit. Invalid input returns 400. Unknown users, wrong
passwords, and inactive users all return the same 401 response:
`{"success":false,"message":"Invalid email or password"}`.

`GET /api/auth/me` requires `Authorization: Bearer <token>` and returns
`{"success":true,"user":{...}}` with the same safe user fields. It reads the
current user from BigQuery, rejecting removed or inactive users with 401.
Malformed, expired, tampered, and missing tokens also return 401.

JWTs use HS256, a one-hour expiration, a fixed issuer/audience, and the
`userId`, `email`, and `role` claims. Authentication does not authorize roles.
Neither endpoint returns password hashes. Responses use `Cache-Control:
no-store`; internal failures return the existing sanitized 500 response.
These endpoints perform read-only BigQuery queries and do not write audit logs.

## Validation

- `npm --prefix server run check`: syntax checks passed.
- `npm --prefix server test`: all 19 tests passed, including real bcrypt/JWT
  HTTP tests with isolated user fixtures. Inactive-account tests do not alter
  cloud records.
- Read-only live integration checks against the existing dataset authenticated
  admin, analyst, and viewer accounts using passwords read into memory from
  Keychain, then called `/me` with each issued token. All returned 200.
- Live wrong-password and unknown-user requests returned 401; unauthenticated
  `/me` returned 401; `/api/health` returned 200.
- Before/after counts remained three users, 750 sales, and zero audit logs.
  No other datasets, tables, IAM, or project settings were modified.
