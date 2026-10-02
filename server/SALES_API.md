# Sales API (Phase 8)

The backend uses the app-owned BigQuery `sales` and `audit_logs` tables.
[Authentication](AUTHENTICATION.md) and [RBAC](RBAC.md) setup also apply here.
All endpoints require `Authorization: Bearer <token>` and check the user's
current active status and role in BigQuery. Responses are not cached.

## List sales

```text
GET /api/sales?limit=50&offset=0
Roles: admin, analyst, viewer
```

Returns HTTP 200 with `{ "success": true, "sales": [...], "pagination":
{ "limit": 50, "offset": 0 } }`. Defaults: limit 50, offset 0. Limit must
be 1–100; offset must be 0–1,000,000. Invalid pagination returns 400.
Records are ordered by sale date, creation time, and ID, all descending.
This is offset pagination; concurrent changes can move records between pages.

Dates are `YYYY-MM-DD`; creation timestamps are UTC ISO strings. Monetary
values are decimal strings to preserve BigQuery NUMERIC precision. Quantities
are JSON integers. The list contains the fields shown in the create response.

## Create a sale

```text
POST /api/sales
Roles: admin, analyst
Content-Type: application/json
```

Request body:

```json
{
  "sale_date": "2026-10-02",
  "product": "Example Product",
  "category": "Example",
  "region": "Jakarta",
  "quantity": 2,
  "revenue": "123.456789123",
  "cost": "10.25"
}
```

All seven fields are required. Dates must be real calendar dates within
0001–9999. Product/category/region must be nonempty strings, at most 150
characters after trimming. Quantity must be a positive safe integer.
Revenue/cost must be nonnegative plain decimal numbers or strings, with at
most 29 integer and 9 fractional digits; use strings for exact monetary input.
Numeric inputs greater than JavaScript's safe-integer maximum are rejected;
large amounts must use decimal strings.
Negative values, exponent notation, and excess precision are rejected.
Additional fields are rejected, including client-provided `sale_id`,
`created_by`, and `created_at`.

Successful creation returns HTTP 201:

```json
{
  "success": true,
  "sale": {
    "sale_id": "SALE_server-generated-uuid",
    "sale_date": "2026-10-02",
    "product": "Example Product",
    "category": "Example",
    "region": "Jakarta",
    "quantity": 2,
    "revenue": "123.456789123",
    "cost": "10.25",
    "created_by": "DEMO_ANALYST",
    "created_at": "2026-10-02T00:00:00.000000Z"
  }
}
```

Identity and timestamp come from the server. The sale and its `CREATE_SALE`
audit record are inserted in one transaction. No automatic retries are made;
a repeated successful POST creates a distinct sale.

## Delete a sale

```text
DELETE /api/sales/:id
Role: admin
```

IDs accept 1–100 letters, digits, underscores, or hyphens, including existing
`DEMO_SALE_...` and server-generated `SALE_...` IDs. Successful deletion returns
204 with no body and inserts a `DELETE_SALE` audit record in the same
transaction. A nonexistent ID returns 404 (`Sale not found`) without an audit
record. Invalid IDs return 400. Duplicate database identities abort and roll
back the transaction rather than deleting multiple records.

## Audit and errors

Mutation audits contain a server-generated log ID, the current acting user ID,
`CREATE_SALE`/`DELETE_SALE`, resource `sales`, JSON details containing `sale_id`,
and a server timestamp. Listing, denied requests, invalid input, and missing
sale deletions do not create audit records. No audit-log read endpoint is added
in this phase.

Missing/invalid JWTs and inactive users return 401. Insufficient roles return
403. Validation failures return 400 with the existing generic `Request failed`
message; internal database failures return sanitized 500 responses. User input
is passed through named query parameters. BigQuery identifiers are validated.

The transactions use BigQuery's atomic multi-statement behavior: failed
mutations/audit writes roll back together. See the
[Google Cloud transaction documentation](https://docs.cloud.google.com/bigquery/docs/transactions).
Frontend integration and dashboard/analytics endpoints belong to later phases.

## Phase 8 validation results

Commands executed from the repository root:

```bash
npm --prefix server run check
npm --prefix server test
git diff --check
```

A live `node --input-type=module` HTTP/BigQuery integration check was also run
from `server/`, using demo Keychain passwords held in memory. Results:

- All 33 backend tests and syntax/whitespace checks passed.
- Admin, Analyst, and Viewer could list BigQuery sales with pagination.
- Admin and Analyst each created one validation sale with exact decimal
  values and a matching `CREATE_SALE` audit. Viewer creation returned 403.
- Analyst/Viewer deletion returned 403. Admin deleted both validation sales;
  repeated deletion returned 404 without additional audit records.
- Invalid quantity returned 400; missing JWT returned 401.
- Injecting a failing ASSERT after the sale insert and before the audit insert
  caused the whole live BigQuery transaction to roll back. Counts and existing
  row digests were unchanged by this failed operation.
- Validation sales were cleaned up through the Admin API. Before/after digests
  confirmed that all 750 seed sales and three user records remained unchanged.
  Four audit records were retained: two creates and two deletes. Final counts:
  three users, 750 sales, four audit logs.
- Only the app-owned `id-fpoc-0608-data-posindo.sales_dashboard` dataset was
  targeted. No other datasets, IAM, or project settings were modified.

Phase 8 stops here. Phase 9 and frontend API integration have not started.
