# Express production build (Phase 14)

Express serves the API and the built React application from one origin. Vite
is needed to build the frontend, but no Vite process is needed to serve it.
Docker image build instructions are now in
[CONTAINER_IMAGE.md](CONTAINER_IMAGE.md). Local Docker startup is documented in
[LOCAL_DOCKER.md](../scripts/docker/LOCAL_DOCKER.md); private Cloud Run deployment is documented in
[CLOUD_RUN_DEPLOYMENT.md](../scripts/gcp/CLOUD_RUN_DEPLOYMENT.md).

## Run locally

Install dependencies on a fresh checkout using the Node.js version supported
by both packages (`^22.13.0 || >=24.0.0`):

```bash
npm --prefix client ci
npm --prefix server ci
```

Keep the existing backend configuration in the ignored root `.env`: project,
dataset, location, and a random JWT secret of at least 32 bytes. The configured
application dataset is `id-fpoc-0608-data-posindo.sales_dashboard` in
`asia-southeast2`. Local BigQuery access uses Application Default Credentials;
no Google credentials or backend secrets are included in the frontend build.

From the repository root:

```bash
npm --prefix client run build
NODE_ENV=production PORT=8080 npm --prefix server start
```

Open `http://127.0.0.1:8080`. Login and business APIs use relative `/api` URLs
on that same origin. `/dashboard`, `/analytics`, and the other React routes
work on direct navigation and refresh. Production startup fails with a clear
build instruction if `client/dist/index.html` is missing. Build paths are
resolved relative to the server module, independently of the shell directory.

For development, keep using Vite and Express as described in
[the frontend authentication guide](../client/AUTHENTICATION.md). Express
also serves a build if present in development; rebuild to update it. If the
build is absent, development still supports the API alone. `dist/` remains
ignored by Git and must be generated after checkout.

## Routing, cache, and errors

1. API routes and guards run first. Unknown `/api` paths return JSON 404,
   including requests that accept HTML; authentication failures remain JSON.
2. Vite's content-hashed `/assets` files receive one-year immutable caching.
   A missing asset returns JSON 404 rather than the SPA document.
3. Other public build files and the SPA entry use `Cache-Control: no-cache`
   so the browser revalidates them. GET/HEAD HTML navigation falls back to
   `index.html`; React handles unknown application routes.
4. Missing file paths, hidden paths, non-HTML requests, and unsupported
   methods do not receive the SPA document. Only the build directory is
   served; backend source and environment files are outside the static root.

The existing 100 KB JSON limit and sanitized error responses remain in place.
Auth/business responses retain their existing `no-store` headers and backend
RBAC checks. There is no change to mutation or BigQuery query contracts.

## Environment, CORS, and headers

- `PORT` defaults to 8080; Express listens on `0.0.0.0`.
- `NODE_ENV=production` requires the React build and enables production
  Helmet HSTS and CSP `upgrade-insecure-requests`. HTTPS termination will be
  handled during deployment. Local validation used Chromium at `127.0.0.1`.
- Development disables HSTS and CSP HTTPS upgrading for HTTP local tooling.
  All other Helmet protections remain enabled.
- CSP restricts scripts and API connections to the same origin. Helmet's
  default inline-style allowance supports the chart library; no inline-script
  or eval permission is added. Fonts and build assets are bundled locally.
- `CORS_ORIGINS` defaults to empty: same-origin production and the Vite proxy
  require no cross-origin grant. Optional API clients can be granted exact,
  comma-separated HTTP(S) origins, for example
  `https://example.com,http://localhost:5173`. Wildcards, paths, credentials,
  and malformed values are rejected at startup. Unlisted origins receive no
  allow-origin header. CORS does not replace authentication or RBAC.
- Root `.env` is optional and process environment values take precedence.
  JWT and ADC configuration remain backend-only; no frontend environment
  variable is needed for API routing.

The Express 5 fallback syntax follows its
[official migration guide](https://expressjs.com/en/guide/migrating-5/).
Security configuration follows the
[Helmet documentation](https://github.com/helmetjs/helmet), including its
local HTTP caveat for `upgrade-insecure-requests`.

## Validation

Executed from the repository root:

```bash
npm --prefix server run check
npm --prefix server test
npm --prefix client run lint
npm --prefix client run build
npm --prefix client test
npm --prefix client run test:production
git diff --check
```

The production browser command rebuilds React and starts Express with
`NODE_ENV=production` on port 4173. It runs the shared authentication, RBAC,
and workspace tests plus production-specific routing/header/CSP checks.
Business API fixtures keep these automated tests independent of cloud data.
Chromium setup is documented in
[AUTHENTICATION.md](../client/AUTHENTICATION.md).

Results: syntax checks, lint, and build passed; **54 backend tests**, **29 Vite
browser tests**, and **31 Express production browser tests** passed. Checks
cover GET/HEAD direct routes, caching, missing assets, JSON API boundaries,
CORS allowlists/configuration, missing-build startup, authentication/session
expiry, page permissions, charts under CSP, and workspace mutations/states.

A separate read-only inline Node/Playwright check used real Express production
serving on port 4186 and BigQuery with Admin, Analyst, and Viewer. All permitted
pages rendered after direct navigation and refresh; charts, restricted routes,
390px layouts, and logout worked. No browser runtime or CSP violations were
reported. Desktop dashboard/analytics and mobile analytics were visually
reviewed. Passwords were read from Keychain into memory; no credentials,
JWTs, or session artifacts were printed or saved.

Full-row digests and counts before/after were identical: **3 users, 750 sales,
13 audit logs**. This phase introduced no cloud data mutations or changes to
other datasets, IAM, or project settings. Validation servers were stopped.

The results above record Phase 14 production integration. Phase 15 image
build and inspection results are documented in
[CONTAINER_IMAGE.md](CONTAINER_IMAGE.md). Local container deployment is documented
in [LOCAL_DOCKER.md](../scripts/docker/LOCAL_DOCKER.md).
