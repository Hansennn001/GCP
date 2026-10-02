# Sales Insight Dashboard

A proof-of-concept sales analytics dashboard planned with React, Express,
JWT authentication, role-based access control, and Google BigQuery. Later
phases will package the application with Docker and deploy it to Cloud Run.

## Current status

Phase 3 — Create Express Backend Foundation is complete. An independent
Express API provides a health endpoint and predictable JSON error responses.
The frontend dashboard, charts, and tables continue to use static sample
data. All frontend pages remain accessible; login remains a placeholder.

## Repository structure

```text
client/       React frontend built with Vite
server/       Independent Express API
scripts/      Future setup and data scripts
.env.example  Placeholder environment configuration
.gitignore    Local files and generated output to exclude from Git
```

The empty `server/services/`, `server/utils/`, and `scripts/` directories
contain `.gitkeep` files so Git can preserve them.
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
The root URL redirects to `/dashboard`.

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
- `server/routes/healthRoutes.js`: health route definition.
- `server/controllers/healthController.js`: health response.
- `server/middleware/`: JSON 404 and centralized error responses.
- `server/services/` and `server/utils/`: placeholders for later phases.
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

No BigQuery connection, authentication, RBAC, or business API endpoints
have been implemented. Phase 4 — BigQuery Setup Scripts and Connection is
the next planned phase and has not been started.

## Environment configuration

The backend optionally reads `.env` at the repository root. Its path is
resolved relative to the configuration file, so startup works independently
of the current working directory. Existing process environment variables
take precedence over `.env` values.

`PORT` is the only variable currently consumed; it defaults to 8080 and
must be an integer from 1 to 65535. The remaining `.env.example` values are
placeholders for later phases. No environment file is needed to run Phase 3.

Keep real secrets, passwords, and Google Cloud credentials out of the
repository. Prefer Application Default Credentials for local Google Cloud
authentication when BigQuery integration is implemented.
