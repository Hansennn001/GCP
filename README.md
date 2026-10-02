# Sales Insight Dashboard

A proof-of-concept sales analytics dashboard planned with React, Express,
JWT authentication, role-based access control, and Google BigQuery. Later
phases will package the application with Docker and deploy it to Cloud Run.

## Current status

Phase 2 — Improve Frontend Dashboard Mockup is complete. The frontend has
a dashboard, analytics charts, and transaction, user, and audit log tables
using static sample data. Authentication is not required in this phase;
all pages are accessible. The login route remains a placeholder.

## Repository structure

```text
client/       React frontend built with Vite
server/       Future Express backend
scripts/      Future setup and data scripts
.env.example  Placeholder environment configuration
.gitignore    Local files and generated output to exclude from Git
```

The empty `server/` and `scripts/` directories contain `.gitkeep` files so
Git can preserve them.
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

No API integration, authentication, role enforcement, or Express code has
been added. Phase 3 — Create Express Backend Foundation is the next phase and
has not been started.

## Environment configuration

`.env.example` documents the planned variables using placeholder values.
Keep real secrets, passwords, and Google Cloud credentials out of the
repository. Prefer Application Default Credentials for local Google Cloud
authentication when BigQuery integration is implemented.
