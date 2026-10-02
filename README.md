# Sales Insight Dashboard

A proof-of-concept sales analytics dashboard planned with React, Express,
JWT authentication, role-based access control, and Google BigQuery. Later
phases will package the application with Docker and deploy it to Cloud Run.

## Current status

Phase 12 — Frontend RBAC is complete. The application dataset has
three demo users and 750 sample sales records. The Express API provides
BigQuery-backed bcrypt login, JWT authentication, `/api/auth/me`, a health
endpoint, reusable role guards, permission probes, and a sales API with
transactional create/delete audit logs, plus BigQuery dashboard and analytics
aggregations, Admin user management, and audit-log listing.
The frontend dashboard, charts, and tables continue to use static sample
data. Login now communicates with Express, validates the session, and protects
workspace routes. Navigation, page access, and preview actions now follow
the signed-in user's role.

## Repository structure

```text
client/       React frontend built with Vite
server/       Independent Express API
scripts/      BigQuery setup SQL and instructions
.env.example  Placeholder environment configuration
.gitignore    Local files and generated output to exclude from Git
```

The implementation plan is in
[CODEX_BUILD_PLAN_SALES_INSIGHT_DASHBOARD.md](CODEX_BUILD_PLAN_SALES_INSIGHT_DASHBOARD.md).
Work proceeds one phase at a time, with an explicit instruction required to
begin the next phase.

## Local frontend setup

Use Node.js 22.13+ on the 22.x release line, or Node.js 24+. The frontend was
validated with Node.js 24.21.0 and npm 11.19.0.

From the repository root:

```bash
cd client
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`).
The root URL redirects to `/dashboard`. Anonymous workspace visits redirect
to `/login`. Start the Express backend on port 8080 to sign in; Vite proxies
`/api` requests to it. See [frontend authentication setup](client/AUTHENTICATION.md).

Available routes:

- `/login`
- `/dashboard`
- `/transactions`
- `/analytics`
- `/users`
- `/audit-logs`

The sidebar highlights the active page. On smaller screens, use the
navigation toggle to show or hide the sidebar. Wide tables scroll within
their panels. Unknown routes display a link back to the dashboard.

From `client/`, run the frontend checks and production preview:

```bash
npm run lint
npm run build
npm run preview
```

The production build is generated in `client/dist/` and is ignored by Git.
The preview command serves that build locally; backend production serving
belongs to a later phase.

## Local backend setup

From the repository root, using the same Node.js versions as the frontend:

```bash
cd server
npm install
npm run dev
```

The development script uses Node's watch mode. For a normal start, run
`npm start` from `server/`. The API listens on `0.0.0.0` and defaults to
port 8080. To use a different port:

```bash
PORT=18083 npm start
```

Verify the default health endpoint:

```bash
curl --fail-with-body http://localhost:8080/api/health
```

Expected HTTP 200 response:

```json
{"status":"ok","service":"sales-insight-dashboard"}
```

From `server/`, run the backend checks:

```bash
npm run check
npm test
```

`check` validates application JavaScript syntax. The tests use Node's
built-in test runner and temporary local HTTP listeners, so they do not
require a running server, database, or Google Cloud credentials.

## Backend foundation

The backend uses Express, CORS, dotenv, and Helmet:

- `server/app.js`: middleware setup and route registration; importing it
  does not start a listener.
- `server/index.js`: listener startup and startup error handling.
- `server/config/env.js`: root `.env` loading and port validation.
- `server/config/bigquery.js`: lazy ADC-based BigQuery client configuration.
- `server/services/bigqueryService.js`: reusable parameterized GoogleSQL queries.
- `server/scripts/checkBigQuery.js`: standalone live connection check.
- `server/routes/healthRoutes.js`: health route definition.
- `server/controllers/healthController.js`: health response.
- `server/middleware/`: JSON 404 and centralized error responses.
- `server/utils/`: placeholder for later phases.
- `server/test/app.test.js`: HTTP behavior and configuration checks.

Unknown routes return HTTP 404 with
`{"success":false,"message":"Not found"}`. Malformed JSON returns HTTP
400; JSON bodies exceeding 100 KB return HTTP 413. Internal errors return
a generic HTTP 500 response without internal messages or stack traces.
Helmet sets security headers, and the Express identification header is
disabled. CORS currently permits all origins for this foundation phase;
deployment configuration will be reviewed in the planned production phase.

The API currently provides only `/api/health`. The frontend still runs
through Vite independently and does not call the API. Production static
frontend serving belongs to Phase 14.

## Frontend foundation

The frontend uses React, Vite, Tailwind CSS, React Router, Lucide React,
Recharts, and shadcn/ui. shadcn/ui is initialized for JavaScript with the neutral
Radix Nova style, a shared Button component, and a locally bundled Geist
font. Both Vite and the editor resolve `@/` imports to `client/src/`.

- `src/App.jsx`: route definitions and the default redirect.
- `src/lib/navigation.js`: page names, icons, and navigation metadata.
- `src/layouts/DashboardLayout.jsx`: shared header and responsive layout.
- `src/components/Sidebar.jsx`: sidebar links and active states.
- `src/pages/`: dashboard, transactions, analytics, users, audit logs,
  login placeholder, and the unknown-route page.
- `src/data/mockData.js`: static records and consistent view aggregates.
- `src/lib/format.js`: IDR currency and Asia/Jakarta date formatting.
- `src/components/`: shared page headers, stat cards, panels, data tables,
  role badges, loading/empty states, and charts.
- `src/index.css`: Tailwind imports, theme, and base styles.

## Static mockup

- Dashboard: Total Revenue, Total Orders, Average Order Value, Top Product,
  a revenue trend chart, leading products, and recent transactions.
- Transactions: all eight planned columns and a local search across product,
  category, region, creator, and transaction ID. An unmatched search displays
  the shared empty state.
- Analytics: Revenue Trend, Revenue by Product, Revenue by Region, and
  Top Products charts with currency tooltips and expandable data tables.
- Users: sample names, emails, role badges, statuses, and creation dates.
- Audit Logs: sample LOGIN, CREATE_SALE, DELETE_SALE, and UPDATE_ROLE events
  with timestamps displayed in WIB.

The fixtures contain 18 transactions across six products and five regions
for April–September 2026, five users, and six illustrative audit events.
Revenue totals and rankings derive from those same static transactions.
Total revenue is IDR 566,000,000; total orders counts transactions, while
quantity records the units in each transaction. Currency cards use compact
formatting, and chart axes display millions of IDR.

The header labels the content as sample data. Transaction search runs only
in the browser. Role badges are display-only, and the tables are read-only.
The chart module loads separately with a shared loading state so Recharts
is not included in the initial application bundle.

## Phase 2 validation

- Dependency installation, ESLint, and the production build passed.
- Vite started successfully on `127.0.0.1:5173`.
- Static data checks confirmed equal revenue totals across the summary,
  monthly trend, products, and regions, plus coverage of all roles and audit
  action types.
- Chrome checks passed for all six routes, refresh, page titles, chart
  dimensions, and expected table/row counts. Transaction search and empty
  state recovery passed.
- All routes passed at 320, 390, and 768 pixels with no page-level horizontal
  overflow. Desktop and mobile screenshots were visually reviewed.
- The production preview passed for direct navigation to analytics, lazy
  chart loading, the loading fallback, four charts, and currency tooltips.
- Final browser checks reported no API requests, console/runtime errors,
  chart size warnings, or HTTP resource errors.

## Phase 3 validation

- Backend dependencies installed successfully with zero reported npm audit
  vulnerabilities.
- JavaScript syntax checks and all seven backend tests passed.
- `npm start` served the expected health response on port 8080.
- `PORT=18083 npm run dev` served the same response on the configured port.
- Live HTTP checks confirmed JSON 404 and malformed-body 400 responses.
- Tests verified security headers, CORS preflight, oversized-body 413,
  sanitized synchronous/asynchronous 500 responses, default/custom ports,
  and invalid-port rejection.

## Phase 4 setup and validation

See [the step-by-step BigQuery guide](scripts/bigquery/README.md) for Google
login, permissions, dataset/table creation, and connection validation.

- Installed `@google-cloud/bigquery` and the local Google Cloud CLI.
- Added SQL for `sales_dashboard.users`, `sales_dashboard.sales`, and
  `sales_dashboard.audit_logs`, plus dataset creation SQL.
- Configured the target project `id-fpoc-0608-data-posindo` and
  Jakarta location (`asia-southeast2`). A local ignored `.env` contains
  only non-secret configuration.
- On 2 October 2026, confirmed `sales_dashboard` did not exist, then created
  it in Jakarta with empty `users`, `sales`, and `audit_logs` tables. Only
  these new resources were targeted; no existing datasets, tables, IAM, or
  project settings were modified.
- SQL uses strict `CREATE` statements: existing resources cause an error
  rather than being reused or replaced. Do not rerun setup against an
  existing dataset.
- At the end of Phase 4, all three table schemas matched the build plan
  and contained zero rows.
- Local syntax checks and all ten backend tests passed. The live
  `npm run check:bigquery` succeeded using ADC, and the running Express
  health endpoint returned HTTP 200 with the expected service JSON.

## Phase 5 seed and validation

See [the demo seeding guide](scripts/bigquery/SEEDING.md) for demo accounts,
Keychain password retrieval, safe reruns, and validation details.

- Added deterministic sales generation, bcrypt user hashing, and
  `npm run seed` in `server/`.
- Seeded only `id-fpoc-0608-data-posindo.sales_dashboard`: three active
  demo users and 750 transactions covering six products, five regions,
  and April–September 2026. Audit logs remain empty.
- Passwords are stored in macOS Keychain; BigQuery contains bcrypt hashes
  with cost factor 12. No plaintext passwords are stored in repo files.
- Seed reruns insert missing records only, preserve existing rows and
  credentials, and abort on conflicting user identities.
- Live validation confirmed each bcrypt hash matches its demo password.
  Rerun checks confirmed unchanged row digests, no duplicates, and no
  changes to audit logs.
- Syntax checks, all 12 backend tests, the BigQuery connection check, and
  the live health endpoint passed.

## Phase 6 authentication and validation

See [the backend authentication guide](server/AUTHENTICATION.md) for local
secret setup, API contracts, and validation details.

- Added `POST /api/auth/login` and authenticated `GET /api/auth/me`.
- Login uses parameterized BigQuery queries, checks active status, verifies
  bcrypt passwords, and issues one-hour HS256 JWTs with safe user data.
- Authentication rejects invalid tokens; `/me` checks the current user's
  active status in BigQuery. Password hashes and secrets are never returned.
- Syntax checks and all 19 backend tests passed. Live login and `/me` checks
  passed for all three demo roles. Invalid credentials and missing tokens
  returned 401, and health returned 200.
- BigQuery counts remained three users, 750 sales, and zero audit logs;
  authentication did not modify cloud resources.

## Phase 7 role authorization

See [the backend RBAC guide](server/RBAC.md) for the permission matrix,
reusable middleware, and read-only `/api/access/<permission>` checks.

- Added `authorizeRoles(...)` for Admin-only operations, Admin/Analyst sales
  creation, and read permissions for all three roles.
- Each guard checks the current active user and role in BigQuery so revoked
  privileges are not retained by previously issued tokens.
- Missing/invalid JWTs return 401; insufficient roles return 403. The access
  probes only demonstrate authorization; they do not perform business actions.
- Syntax checks and all 26 backend tests passed. Live checks passed for all
  eight permissions across the three demo accounts (24 permission checks).
  Every probe rejected missing/invalid JWTs with 401, and health returned 200.
- BigQuery counts remained three users, 750 sales, and zero audit logs; no
  cloud resources or records were changed.

## Phase 8 sales API

See [the sales API guide](server/SALES_API.md) for requests, responses,
validation limits, pagination, and transactional audit behavior.

- `GET /api/sales`: all three roles can list sales with bounded pagination.
- `POST /api/sales`: Admin/Analyst can create; Viewer receives 403.
- `DELETE /api/sales/:id`: Admin can delete; Analyst/Viewer receive 403.
- Server-generated IDs and authenticated user identities prevent client
  impersonation. Dates, text, quantities, monetary values, and IDs are validated.
- Create/delete and their corresponding audit records are committed together.
  Missing sale deletions return 404 without creating an audit record.
- Syntax checks and all 33 backend tests passed. Live BigQuery checks verified
  listing, role restrictions, exact monetary values, create/delete audits,
  and rollback after an intentional transaction failure.
- The two validation sales were deleted using the Admin API. The original
  750 seed sales and three user records remained unchanged; four validation
  create/delete audit records were retained. No other project resources changed.

## Phase 9 dashboard and analytics API

See [the reporting API guide](server/REPORTING_API.md) for response contracts,
metric definitions, ordering, empty-table behavior, and numeric precision.

- Added dashboard summary and monthly revenue trend endpoints.
- Added product, region, and top-five-product aggregation endpoints.
- All three active roles can read reports. Calculations run in BigQuery;
  the backend returns chart-friendly aggregate data.
- Reports only read the application dataset and do not create audit logs.
- Syntax checks and all 39 backend tests passed. `npm --prefix server run
  check:reporting` validated all five endpoints across the three demo roles,
  seed aggregate totals, empty sources, revenue ties, and exact NUMERIC ranking.
- Summary returned revenue 32,052,442,000 from 750 orders, with
  `App Modernization` as the top product.
- All table counts and row digests were unchanged: three users, 750 sales,
  four audit logs. Other project resources were not modified.

## Phase 10 user management and audit API

See [the management API guide](server/MANAGEMENT_API.md) for safe user fields,
role updates, audit details, and validation instructions.

- Added Admin-only `GET /api/users`, `PATCH /api/users/:id/role`, and
  `GET /api/audit-logs` with bounded list pagination.
- Only admin/analyst/viewer roles are accepted. User responses never expose
  password hashes. Actual role changes and their `UPDATE_ROLE` audit records
  are committed together; unchanged roles add no audit record.
- Syntax checks and all 46 backend tests passed. Live integration verified
  Admin access, Analyst/Viewer rejection, role/audit updates, immediate JWT
  permission changes, and rollback on audit failure.
- The uniquely identified validation user was removed. Existing users, sales,
  and prior audits remained unchanged. Final counts: three users, 750 sales,
  seven audit logs; three role validation audits were retained.

## Phase 11 frontend authentication

See [the frontend authentication guide](client/AUTHENTICATION.md) for startup,
session behavior, and browser validation.

- Added a responsive login form, `AuthContext`, API layer, protected routes,
  signed-in user display, and logout.
- JWTs are stored in tab-scoped sessionStorage. Login and reload validate
  the session through `/api/auth/me`; authenticated 401 responses clear it.
- Temporary session verification errors permit retry without displaying
  protected content. Login restores the requested workspace destination.
- ESLint, production build, and all seven Chromium browser tests passed.
  Live browser checks passed for all three demo accounts through the real
  Vite proxy, Express, and BigQuery, including reload and logout.
- BigQuery counts/digests remained unchanged: three users, 750 sales,
  seven audit logs. No business APIs were called by the frontend.

## Phase 12 frontend permissions

See [the frontend RBAC guide](client/RBAC.md) for the role matrix,
route guards, action visibility, and validation.

- Added `hasRole()`/`can()` helpers, filtered navigation, permission guards
  for direct routes, and a current-role badge that remains visible on mobile.
- Only Admin sees Users/Audit Logs pages. Admin/Analyst see Create transaction;
  only Admin sees Delete actions. Sample-data controls remain disabled.
- ESLint, production build, and all 20 browser tests passed. Live checks with
  all three demo accounts matched UI permissions and backend guards.
- Counts and full-row digests remained unchanged: three users, 750 sales,
  seven audit logs. No frontend business API calls were introduced.

Phase 13 — Replace Mock Data with Real API Data is next and has not started.
Workspace content still uses static sample data; forms and API mutations
remain for Phase 13.

## Environment configuration

The backend optionally reads `.env` at the repository root. Its path is
resolved relative to the configuration file, so startup works independently
of the current working directory. Existing process environment variables
take precedence over `.env` values.

`PORT` defaults to 8080 and must be an integer from 1 to 65535. BigQuery
uses `GOOGLE_CLOUD_PROJECT`, `BIGQUERY_DATASET` (default `sales_dashboard`),
and `BIGQUERY_LOCATION` (default `asia-southeast2`, which must match the
dataset location). `JWT_SECRET` must be a random secret of at least 32 bytes
for token issuance and verification; the example value must be replaced.
The health endpoint does not require BigQuery configuration or credentials.

Keep real secrets, passwords, and Google Cloud credentials out of the
repository. Prefer Application Default Credentials for local Google Cloud
authentication when BigQuery integration is implemented.
