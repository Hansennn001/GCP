# Phase 20 — final verification and technical summary

## Result

Final verification executed on 3 October 2026. No application code or deployed
image changed. Cloud Run revision `sales-insight-dashboard-00001-hxz` remains
healthy, private, and serves 100% of traffic in `asia-southeast2`.

| Component | Verification |
|---|---|
| React | Client lint/build; real desktop/mobile routes; 31 browser tests |
| Express | Syntax checks, 54 backend tests, deployed API contracts |
| JWT | Real login, rejected missing/invalid JWT, session revalidation |
| RBAC | 24 permission probes, actual forbidden mutations, actual permitted writes |
| BigQuery | Runtime SA reads/writes and atomic audit transactions succeed |
| Docker | Published amd64 image starts locally as non-root; health/routes/JWT guard pass |
| Artifact Registry | Immutable OCI index and amd64 descriptor verified |
| Cloud Run | Healthy revision, dedicated SA/secret reference, private requests denied |

## Role verification

| Capability | Viewer | Analyst | Admin |
|---|---|---|---|
| Dashboard, transactions, analytics | Allowed | Allowed | Allowed |
| Create sales | Denied | Allowed | Allowed |
| Delete sales | Denied | Denied | Allowed |
| List users / change roles | Denied | Denied | Allowed |
| Read audit logs | Denied | Denied | Allowed |

Real `/api` calls against the deployed container verified all rows in this
matrix. Existing fixture tests also verify navigation and UI restrictions.
Admin changed `DEMO_VIEWER` to Analyst, then restored Viewer. The same previously
issued token gained and then lost `sales.create` access because authorization
rechecks current BigQuery user state rather than trusting stale role claims.

## Live write scope and cleanup

The explicitly opted-in validator created one uniquely marked temporary sale
as Admin and one as Analyst. Admin deleted both. No existing sale was deleted.
Viewer creation and Viewer/Analyst delete/user-management attempts returned 403.
All writes used application APIs and their normal transactional audit paths.

After cleanup:

- 3 users and their full-row digest match the pre-test baseline.
- 750 sales and their full-row digest match the pre-test baseline.
- The original 13 audit records are unchanged.
- 6 new audit records remain: 2 CREATE_SALE, 2 DELETE_SALE, 2 UPDATE_ROLE.
- Audit total is **19**. These records are intentionally retained, not erased.
- No temporary sale or changed demo role remains.

The read-only validator ran again after this cleanup and checks counts/digests
against its new 19-audit baseline. No dataset ACL, schema, runtime IAM, other
workload, or Cloud Run configuration was changed during Phase 20.

## Commands executed

From the repository root:

```bash
npm run check --prefix server
npm test --prefix server
npm run lint --prefix client
npm run build --prefix client
node --check scripts/gcp/verify-final.mjs
node scripts/gcp/verify-final.mjs --run-demo-writes
node scripts/gcp/validate-cloud-run.mjs
gcloud run services describe sales-insight-dashboard --project=id-fpoc-0608-data-posindo --region=asia-southeast2 --format=json
docker buildx imagetools inspect asia-southeast2-docker.pkg.dev/id-fpoc-0608-data-posindo/sales-insight-dashboard/sales-insight-dashboard@sha256:39fb866ab65624df041ae04a7a356eef01d2f1b7492710e75b769d94234760cd
git diff --check
```

The read-only validator obtains the Google ID token internally, runs live API
and browser checks for all roles, then invokes the 31-test Playwright suite with
the Cloud Run configuration. Most suite business responses are fixtures;
real BigQuery checks are separate. Tokens/passwords are not printed by these
validators. Local prerequisites: dependencies installed, Chromium installed,
authenticated `gcloud`/`bq`, and demo passwords in the user's macOS Keychain.

The Docker smoke used `docker run --platform linux/amd64` with a uniquely named
container, an ephemeral loopback port, and a private temporary env file holding
a fresh test JWT secret. Health and `/login`/`/dashboard` returned 200;
unauthenticated `/api/sales` returned 401. Container user was `node`.
Only that temporary container and env directory were removed afterward.
BigQuery writes were verified on Cloud Run under its runtime SA, not by injecting
cloud credentials into this smoke container.

## Technical summary

React 19/Vite 8 serves Dashboard, Transactions, Analytics, Users, and Audit Logs
through a same-origin Express 5 API. The production Express server serves the
compiled React app and direct-route fallback; Vite development uses an API proxy.
JWT login checks bcrypt hashes stored in BigQuery and issues one-hour tokens.
Every protected request checks the current active user and role; UI controls
reflect those roles while backend guards enforce them.

BigQuery dataset `sales_dashboard` contains users, sales, and audit tables.
Queries use named parameters; sales mutations and role changes pair with audit
inserts in transactions. Monetary values use BigQuery NUMERIC and decimal strings.
The Docker multi-stage build separates frontend tooling and Linux production
dependencies, then runs Express as the non-root Node user. The immutable amd64
Artifact Registry image runs in Cloud Run with the dedicated runtime SA,
metadata-based ADC, and a Secret Manager JWT reference. No SA JSON is in the image.

Deployment URLs, digest, settings, and browser proxy commands remain documented
in [CLOUD_RUN_DEPLOYMENT.md](CLOUD_RUN_DEPLOYMENT.md). Phase 19 release metadata
records the historical 13-audit baseline; current final state is in
[final-verification.json](final-verification.json).

## Known limitations

- Runtime BigQuery Data Editor and Secret Accessor are mentor-granted at project
  scope, broader than the intended three-table/one-secret plan. Narrowing these
  grants requires an authorized administrator and was not performed here.
- Private Cloud Run requires Google IAM authentication before app login. The
  documented localhost proxy is the tested browser access method; no IAP flow
  or public invoker access was introduced.
- BigQuery mutation paths work for this small PoC. They have query latency and
  job costs; this verification does not establish production transactional scale.
- Demo accounts and local Keychain-based validation are development facilities.
  There is no signup/password-recovery workflow. Validation credentials are not
  included in the deliverable.

The Phase 19 report also records its temporary proxy-token diagnostic incident.
Phase 20 validators do not print process arguments, tokens, or raw subprocess
errors. No further phase or deployment is started after this verification.
