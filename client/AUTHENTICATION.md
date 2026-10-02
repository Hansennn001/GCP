# Frontend authentication (Phase 11)

React now signs in through Express, validates sessions using `/api/auth/me`,
and protects workspace routes. Backend configuration is documented in
[the backend authentication guide](../server/AUTHENTICATION.md).

## Run locally

From the repository root, in separate terminals:

```bash
npm --prefix server start
```

```bash
npm --prefix client run dev
```

Open the Vite URL (normally `http://localhost:5173`). Vite proxies relative
`/api` requests to `http://127.0.0.1:8080`. Use backend port 8080 for this setup;
if you change it, update the development proxy target in `vite.config.js`.
The backend requires the existing ADC login and local root `.env` JWT secret.
No backend secret or Google Cloud credential belongs in frontend configuration.

Demo accounts and Keychain password retrieval are described in
[SEEDING.md](../scripts/bigquery/SEEDING.md). Enter the account email and its
password into the login form; passwords are never stored by this application.

## Session behavior

- `/login` is a public, responsive form with email/password validation,
  loading state, safe error messages, and browser autocomplete support.
- `AuthProvider` exposes current user, session status, `login()`, `logout()`,
  and session retry through `useAuth()` and `AuthContext`.
- Login posts credentials to `/api/auth/login`, then validates the issued JWT
  through `/api/auth/me` before saving it or entering the workspace.
- Only the JWT is stored in tab-scoped `sessionStorage`. User data comes from
  the server. Reload revalidates the token through `/me`; rejected tokens are
  removed and the user returns to login.
- Temporary verification failures show a retry screen and retain the token.
  Protected content is withheld until verification succeeds. The user can
  also discard the session and return to sign in.
- All workspace pages require authentication. Anonymous deep links redirect
  to `/login`; successful login returns to the originally requested page.
- The header displays the signed-in user's name and a Sign out button.
  Logout clears the current tab's token and user state. There is no new
  backend logout endpoint; JWT verification remains server-side.
- The API layer adds `Authorization: Bearer <token>` and JSON headers when
  appropriate, handles a 30-second request timeout, and clears the current
  session on an authenticated 401. Stale requests cannot restore a session
  after logout, and an old token's 401 cannot clear a newer stored token.

`sessionStorage` is the simple PoC storage choice. The sidebar does not link
back to the public login screen once signed in. Phase 12 now applies
role-based navigation, page guards, and action visibility as described
in [RBAC.md](RBAC.md). Backend business permissions remain enforced by the
existing server RBAC.

Dashboard, analytics, users, audit logs, and transactions now call protected
business APIs as documented in [WORKSPACE_API.md](WORKSPACE_API.md). Serving
the React production build from Express is documented in
[the production guide](../server/PRODUCTION.md). Docker and Cloud Run remain
for later phases.

## Validation

Commands executed from the repository root:

```bash
npm --prefix client run lint
npm --prefix client run build
npm --prefix client test
git diff --check
```

The Chromium browser tests use controlled API responses and need no cloud
credentials. On a fresh checkout, install dependencies and Chromium first:

```bash
npm --prefix client ci
cd client
npx playwright install chromium
npm test
```

The test runner starts its own Vite server on port 4173. Traces, screenshots,
and videos are disabled; generated test artifacts and authentication state
are excluded from Git. Test passwords/tokens are fixtures, not real accounts.

Results:

- ESLint and production build passed; all seven browser tests passed.
- Tests covered deep-link protection, login, safe credential/network errors,
  session persistence and rejection, verification retry, authenticated API
  401 handling, logout, and narrow-screen navigation.
- A live headless Chromium check used the real Vite proxy, Express API, and
  BigQuery for Admin, Analyst, and Viewer. Each account signed in, entered
  a protected deep link, reloaded with `/me`, and signed out successfully.
- Demo passwords were read from Keychain into memory. The live check did not
  save password/token state, record traces, or print credentials. Invalid
  credentials and a rejected saved JWT returned to the expected login UI.
- Live browser checks reported zero runtime errors and only login/me API
  requests. Desktop and 390px-wide mobile login layouts were visually checked.
- Before/after counts and full-row digests were unchanged for all app tables:
  three users, 750 sales, seven audit logs. No cloud resources were modified.
- Local servers started for validation were stopped afterward.

The results above record Phase 11 validation. The current expanded browser
suite and Phase 12 permissions are documented in [RBAC.md](RBAC.md).
Phase 13 business-data integration and current validation results are documented
in [WORKSPACE_API.md](WORKSPACE_API.md).
