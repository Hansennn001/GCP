# Dashboard and analytics API (Phase 9)

All five endpoints require `Authorization: Bearer <token>` and permit active
Admin, Analyst, and Viewer accounts. [Authentication](AUTHENTICATION.md) and
[RBAC](RBAC.md) setup apply. The guard checks the current role in BigQuery.
Responses use `Cache-Control: no-store`.

Reports aggregate the entire configured `sales` table in BigQuery using SUM,
COUNT, AVG, and GROUP BY. The server returns aggregate results; it does not
fetch sale rows to compute metrics in Node.js. This phase adds no date filters
or frontend integration.

## Dashboard summary

```text
GET /api/dashboard/summary
```

Example shape (values are illustrative):

```json
{
  "success": true,
  "summary": {
    "totalRevenue": 300,
    "totalOrders": 2,
    "averageOrderValue": 150,
    "topProduct": "Example Product"
  }
}
```

`totalRevenue` sums revenue, `totalOrders` counts sales records, and
`averageOrderValue` averages revenue per record (not per unit). `topProduct`
is the product with the largest total revenue. Revenue ties use product name
ascending. An empty table returns zero metrics and `topProduct: null`.

## Monthly revenue trend

```text
GET /api/dashboard/revenue-trend
```

```json
{
  "success": true,
  "trend": [
    { "month": "2026-04", "revenue": 100, "orders": 1 },
    { "month": "2026-05", "revenue": 200, "orders": 1 }
  ]
}
```

Months are `YYYY-MM`, grouped by sale date and ordered chronologically.
Only months containing sales appear; missing months are not filled with zeroes.
An empty table returns an empty array.

## Product and region aggregates

```text
GET /api/analytics/products
GET /api/analytics/regions
```

Products return `{ "success": true, "products": [...] }`, with each item:

```json
{ "product": "Example Product", "revenue": 300, "orders": 2, "quantity": 4 }
```

Regions return `{ "success": true, "regions": [...] }`, with each item:

```json
{ "region": "Jakarta", "revenue": 300, "orders": 2, "quantity": 4 }
```

`orders` counts records; `quantity` sums units. Groups are sorted by revenue
descending, with product/region name ascending for ties. Empty tables return
empty arrays.

## Top products

```text
GET /api/analytics/top-products
```

Returns `{ "success": true, "products": [...] }` with the same product
fields and ordering, limited to the top five products by revenue. Fewer than
five products returns all available groups.

## Numeric values and errors

BigQuery performs monetary aggregation using NUMERIC and converts the final
chart values to FLOAT64. Report monetary values are JSON numbers for charts
and may be approximate for high-precision or very large amounts. The detailed
[sales API](SALES_API.md) retains monetary values as decimal strings.

Missing/invalid/expired JWTs and removed/inactive users return 401. Unsupported
roles receive 403. Query failures return sanitized 500 responses. Only GET is
implemented. Reports do not mutate sales, users, or audit logs. User management
and audit-log read endpoints belong to Phase 10 and are not implemented here.

## Phase 9 validation

Commands executed from the repository root:

```bash
npm --prefix server run check
npm --prefix server test
npm --prefix server run check:reporting
git diff --check
```

All 39 backend tests passed. The read-only `check:reporting` script requires
ADC, the configured local JWT secret, and this app's original 750-sale seed
state in `id-fpoc-0608-data-posindo.sales_dashboard`. It generates short-lived
demo authentication tokens in memory from the configured secret; it does not
print credentials or tokens. It does not test the login/password flow again.
Adding real sales later will intentionally make seed comparisons fail; the
validator never resets data to satisfy its assertions.

Live validation verified:

- All five endpoints for each of the three demo roles (15 successful reports).
- Report results matched independent calculations from the deterministic seed.
- Revenue trend contained six chronological months, product aggregation six
  groups, region aggregation five groups, and top products five groups.
- Summary: total revenue 32,052,442,000; 750 orders; average order value about
  42,736,589.333333; top product `App Modernization`.
- Empty-table behavior, alphabetical tie handling, and chronological month
  ordering using inline SELECT fixtures executed in BigQuery.
- Ranking retained exact NUMERIC order even when chart FLOAT64 values could
  round to the same number. No cloud fixture tables were created.
- Missing/invalid tokens returned 401 for every endpoint; health returned 200.
- Before/after counts and full-row digests remained unchanged for users,
  sales, and audit logs: three users, 750 sales, four audit logs.

The validator prints only the error type/code on failure to avoid dumping
SDK request metadata. API failures retain the existing sanitized responses.
No cloud resources, IAM, or project settings were changed. Phase 9 stops here;
Phase 10 and frontend integration have not started.
