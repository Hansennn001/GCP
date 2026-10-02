# Development/demo seed — Phase 5

This seed is restricted to `id-fpoc-0608-data-posindo.sales_dashboard` in
`asia-southeast2`. It fails before any write if the environment targets
another project, dataset, or location. Run it only after Phase 4 setup.

## Seeded data

- Three active demo users: `admin@example.com`, `analyst@example.com`, and
  `viewer@example.com`, with matching admin, analyst, and viewer roles.
- User IDs: `DEMO_ADMIN`, `DEMO_ANALYST`, and `DEMO_VIEWER`.
- 750 deterministic sales IDs: `DEMO_SALE_0001` through `DEMO_SALE_0750`.
- Six products: Google Workspace, Cloud Migration, Managed Service,
  Data Analytics, Security Assessment, and App Modernization.
- Five regions: Jakarta, Bandung, Surabaya, Medan, and Bali.
- Dates: April–September 2026. Amounts use IDR; quantities and costs vary
  by product, with positive revenue and cost below revenue.
- Sales creators reference the demo admin or analyst IDs. The viewer
  does not create sales. Audit logs are not populated in this phase.

The demo IDs are reserved for these fixtures. Frontend pages still use
their Phase 2 mock data until API integration is implemented.

## Passwords

The executed seed used three independently generated random passwords.
Their only persistent plaintext storage is the local macOS login Keychain,
under service `sales-insight-dashboard-demo` and the corresponding email
account. BigQuery stores only bcrypt hashes with cost factor 12. No raw
passwords were added to the repository, `.env`, or seed logs.

To view a demo password in your own Terminal:

```bash
security find-generic-password -s sales-insight-dashboard-demo -a admin@example.com -w
security find-generic-password -s sales-insight-dashboard-demo -a analyst@example.com -w
security find-generic-password -s sales-insight-dashboard-demo -a viewer@example.com -w
```

These are development/demo credentials. Application login endpoints are
not implemented until Phase 6.

## Safe reruns

From `server/`:

```bash
npm run seed
```

The script inserts only missing IDs. Existing sales, users, timestamps,
password hashes, and unrelated rows are preserved. It does not update,
delete, truncate, or reset data. User ID/email collisions, changed demo
identity fields, or an unexpected existing hash format abort the seed.
This deliberately does not reset roles changed by later application phases.

Run one seed process at a time. BigQuery does not enforce uniqueness on
these IDs; concurrent seed runs are not supported. The two insert operations
execute in one transaction, so an insert failure rolls back both.

If a demo user is missing, its `SEED_ADMIN_PASSWORD`,
`SEED_ANALYST_PASSWORD`, or `SEED_VIEWER_PASSWORD` must be supplied via the
process environment before seeding. Passwords must contain 12–72 UTF-8
bytes. Existing users need no password variables for a rerun.

For this Mac, restore the variables from Keychain without printing them:

```bash
export SEED_ADMIN_PASSWORD="$(security find-generic-password -s sales-insight-dashboard-demo -a admin@example.com -w)"
export SEED_ANALYST_PASSWORD="$(security find-generic-password -s sales-insight-dashboard-demo -a analyst@example.com -w)"
export SEED_VIEWER_PASSWORD="$(security find-generic-password -s sales-insight-dashboard-demo -a viewer@example.com -w)"
npm run seed
unset SEED_ADMIN_PASSWORD SEED_ANALYST_PASSWORD SEED_VIEWER_PASSWORD
```

On another machine, supply new demo passwords through the process
environment only if creating missing users. The script hashes passwords
before sending query parameters to BigQuery and does not print them.
Do not put raw passwords in repository files.

## Validation — 2 October 2026

- Verified the users, sales, and audit tables were empty before the first
  seed attempt.
- Corrected a BigQuery anti-join restriction found during the initial
  attempt; verified both target tables remained empty after that failure.
- Successful seed produced three users and exactly 750 distinct sales.
- All three password hashes were checked with `bcrypt.compare` against
  the Keychain credentials, with cost factor 12.
- Reran `npm run seed` without password variables. SHA-256 digests of all
  user and sales rows were identical before and after, including hashes
  and timestamps. There were no duplicate IDs; audit logs stayed empty.
- Verified six products, five regions, six reporting months, valid creators,
  positive quantities/revenue, and valid costs in the live dataset.
- Backend syntax checks, all 12 tests, BigQuery connectivity, and the live
  health endpoint passed.

Phase 6 — Backend Authentication has not started.
