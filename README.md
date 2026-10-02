# Sales Insight Dashboard

A proof-of-concept sales analytics dashboard planned with React, Express,
JWT authentication, role-based access control, and Google BigQuery. Later
phases will package the application with Docker and deploy it to Cloud Run.

## Current status

Phase 1 — Create React Frontend Foundation is complete. The frontend has
six placeholder routes, a responsive sidebar, a header, and a main content
area. Authentication is not required in this phase; all pages are accessible.
The backend and application features will be implemented in later phases.

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

Use Node.js 22.13+ on the 22.x release line, or Node.js 24+. Phase 1 was
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

Each route displays placeholder content. The sidebar highlights the active
page. On smaller screens, use the navigation toggle to show or hide the
sidebar. Unknown routes display a page with a link back to the dashboard.

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
and shadcn/ui. shadcn/ui is initialized for JavaScript with the neutral
Radix Nova style, a shared Button component, and a locally bundled Geist
font. Both Vite and the editor resolve `@/` imports to `client/src/`.

- `src/App.jsx`: route definitions and the default redirect.
- `src/lib/navigation.js`: page names, icons, and placeholder text.
- `src/layouts/DashboardLayout.jsx`: shared header and responsive layout.
- `src/components/Sidebar.jsx`: sidebar links and active states.
- `src/pages/`: placeholder content and the unknown-route page.
- `src/index.css`: Tailwind imports, theme, and base styles.

## Phase 1 validation

- Dependency installation, ESLint, and the production build passed.
- Vite started successfully on `127.0.0.1:5173`.
- Chrome browser checks passed for all six routes, navigation, active
  states, direct-route refresh, and page titles.
- Mobile navigation passed at 320, 390, and 768 pixels with no horizontal
  overflow. Desktop and mobile screenshots were visually reviewed.
- Unknown-route recovery and the keyboard skip-to-content link passed.
- The final browser check reported no console, runtime, or HTTP resource
  errors.

Pages contain placeholders only. No API integration, authentication,
role enforcement, mock sales data, charts, or Express code has been added.
Phase 2 — Improve Frontend Dashboard Mockup is the next planned phase and
has not been started.

## Environment configuration

`.env.example` documents the planned variables using placeholder values.
Keep real secrets, passwords, and Google Cloud credentials out of the
repository. Prefer Application Default Credentials for local Google Cloud
authentication when BigQuery integration is implemented.
