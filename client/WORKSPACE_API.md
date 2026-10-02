# Workspace API integration (Phase 13)

All five core pages use protected Express APIs backed by the application
BigQuery dataset. `src/data/mockData.js` has been removed. Authentication and
local startup are documented in [AUTHENTICATION.md](AUTHENTICATION.md).

## Page contracts

| Page | API paths (relative to `/api`) | Behavior |
|---|---|---|
| Dashboard | `/dashboard/summary`, `/dashboard/revenue-trend`, `/analytics/top-products`, `/sales?limit=5&offset=0` | Summary metrics, trend, leading products, latest five sales |
| Transactions | `/sales?limit=50&offset=…` | Sales table, search within the loaded page, create/delete actions |
| Analytics | `/dashboard/revenue-trend`, `/analytics/products`, `/analytics/regions`, `/analytics/top-products` | Four charts and expandable chart-data tables |
| Users | `/users?limit=50&offset=…` | Admin directory, page-level member/active counts, role editing |
| Audit Logs | `/audit-logs?limit=50&offset=…` | Admin activity list, wrapped JSON details, WIB timestamps |

`services/workspace.js` wraps the shared authenticated API client.
`useApiData` provides loading, error/retry, explicit refresh, and cancellation
when a page unmounts or its query changes. Failed requests show safe messages;
no page falls back to mock records. Empty results show dedicated empty states,
including empty charts. A forbidden response explains the access restriction.

Lists use 50-row offset pagination because the API does not return a total
count. Next is enabled when the current page is full; an exact multiple may
therefore lead to an empty final page. Previous remains available. Transaction
search applies only to the loaded page and is labelled accordingly. There is
no claim of server-side search or a global user count.

Sales use the backend's snake_case fields. Users and logs use its camelCase
fields, including `userId`, `createdAt`, and `logId`. Monetary form values are
submitted as decimal strings to preserve BigQuery NUMERIC precision; quantity
must be a positive safe integer. Currency display retains the existing IDR
formatter, which rounds to whole rupiah. Chart aggregates use the API's numeric
reporting values, as described in [REPORTING_API.md](../server/REPORTING_API.md).

## Mutations and permissions

- Admin/Analyst can open Create transaction and submit all seven sale fields
  through `POST /sales`. Valid inputs and a successful response close the
  dialog and reload sales. The backend independently validates each field.
- Only Admin sees Delete. Its dialog identifies the selected sale, and Cancel
  sends no request. Confirmation calls `DELETE /sales/:id`, then refreshes the
  list. An already-removed sale also causes a refresh.
- Only Admin accesses Users or Audit Logs. Change role calls
  `PATCH /users/:id/role`; unchanged roles cannot be submitted. Successful
  updates refresh the directory. Updating your own role also revalidates
  `/auth/me`, so reduced permissions immediately restrict the current page.
- Dialogs use native modal focus/Escape behavior. Pending mutations disable
  submission and dismissal. Rejected mutations remain visible with safe errors
  and do not report success. Mutation requests are never automatically retried.
- The client permission matrix controls visibility/routes; backend guards
  independently check the current active user and role on every operation.

## Validation

Commands executed from the repository root:

```bash
npm --prefix client run lint
npm --prefix client run build
npm --prefix client test
git diff --check
```

ESLint and the production build passed. All 29 Chromium tests passed, including
existing authentication/RBAC coverage and API rendering, loading/empty/error
states, retry, pagination/page search, creation with exact decimal strings,
delete cancellation/confirmation, rejected mutations, role update/retry, and
current-user role demotion. Controlled API fixtures need no cloud credentials.
Generated browser artifacts are excluded from Git and ESLint traversal.

An additional inline Node/Playwright validation used real Vite, Express, and
BigQuery with all three demo accounts. Passwords came from Keychain into memory;
no credentials or JWTs were printed or saved. It verified real dashboard and
analytics charts, sales lists, Admin/Analyst creation and refresh, Viewer
read-only behavior at 390px, Admin deletion with cancellation, temporary-user
role changes, refreshed user rows, and mutation records in the audit UI.
There were no browser runtime errors. Desktop dashboard/charts, create dialog,
and audit-log layouts were visually reviewed.

Only uniquely tagged temporary sales and one temporary user were mutated.
The validation removed those fixtures afterward. Full-row digests confirmed
that the original three users, 750 sales, and seven existing audit logs were
unchanged. Six new audit rows (two creates, two deletes, two role updates) remain
as the history of successful test actions. Final table counts are **3 users,
750 sales, 13 audit logs** in
`id-fpoc-0608-data-posindo.sales_dashboard` (`asia-southeast2`). No other dataset,
IAM policy, or project setting was modified. Local validation servers were
stopped afterward.

Phase 13 is complete. Phase 14 production integration, Docker, and Cloud Run
have not started.
