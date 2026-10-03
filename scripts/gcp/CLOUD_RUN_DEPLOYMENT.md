# Phase 19 — private Cloud Run container deployment

Phase 19 is complete. Phase 20 has not started.

## Deployed service

| Setting | Value |
|---|---|
| Project | `id-fpoc-0608-data-posindo` |
| Region | `asia-southeast2` |
| Service | `sales-insight-dashboard` |
| URL | https://sales-insight-dashboard-797252500656.asia-southeast2.run.app |
| Alternate service URL | https://sales-insight-dashboard-gi6r3sbeka-et.a.run.app |
| Ready revision | `sales-insight-dashboard-00001-hxz` |
| Traffic | 100% to this revision |
| Runtime SA | `sales-insight-runtime@id-fpoc-0608-data-posindo.iam.gserviceaccount.com` |
| CPU / memory | 1 CPU / 512 MiB |
| Revision scaling | Minimum 0, maximum 2 instances |
| Container port | 8080; Cloud Run supplies `PORT` |
| Secret | `JWT_SECRET` references Secret Manager `sales-insight-jwt:1` |
| Access | Private IAM authentication; invoker checks enabled |

Release details are in [cloud-run-release.json](cloud-run-release.json).
The original tested Artifact Registry image is an OCI index. Cloud Run resolved
its linux/amd64 runtime manifest to
`sha256:58ed55b50a895df9dd57c857ac2f46cbe488fa6673772c04d7aba0cf6930ad2c`,
which matches the index descriptor verified with `docker buildx imagetools inspect`.
The other index descriptor is BuildKit provenance, not a runtime image.

## Command executed

The target-region service list was empty before creating this dedicated service.
Deployment used the existing immutable container image, not source code:

```bash
gcloud run deploy sales-insight-dashboard \
  --project=id-fpoc-0608-data-posindo \
  --region=asia-southeast2 \
  --image=asia-southeast2-docker.pkg.dev/id-fpoc-0608-data-posindo/sales-insight-dashboard/sales-insight-dashboard@sha256:39fb866ab65624df041ae04a7a356eef01d2f1b7492710e75b769d94234760cd \
  --service-account=sales-insight-runtime@id-fpoc-0608-data-posindo.iam.gserviceaccount.com \
  --port=8080 \
  --set-env-vars=NODE_ENV=production,GOOGLE_CLOUD_PROJECT=id-fpoc-0608-data-posindo,BIGQUERY_DATASET=sales_dashboard,BIGQUERY_LOCATION=asia-southeast2 \
  --set-secrets=JWT_SECRET=sales-insight-jwt:1 \
  --invoker-iam-check \
  --cpu=1 --memory=512Mi --min-instances=0 --max-instances=2 \
  --quiet
```

No service-account JSON file or secret value is stored in the image/repository.
BigQuery uses the attached SA through Application Default Credentials.
No public invoker grant was applied. Service IAM has no explicit bindings;
project IAM has no `allUsers`/`allAuthenticatedUsers` binding. Invocation by the
current developer uses existing inherited permissions.

## Open the private application

The ordinary remote URL requires Google IAM authentication before the app login.
To open it in a browser using your authorized Google account:

```bash
gcloud auth login alhan.husen@point-star.com
gcloud run services proxy sales-insight-dashboard \
  --project=id-fpoc-0608-data-posindo \
  --region=asia-southeast2 --port=8081
```

Keep that terminal running and open http://127.0.0.1:8081/login.
Use the app's existing demo credentials; Google identity and app login are
separate authentication steps. Stop the proxy with Ctrl+C when finished.
Other testers need their own authorized Google identity.

The CLI installed `cloud-run-proxy` component 0.5.1 during validation. Its first
automatic invocation reported the binary unavailable immediately after install;
rerunning the proxy command succeeded. Proxy health, real Viewer login, app JWT
preservation, and browser dashboard were tested successfully. The validation
proxy was stopped afterward.

For direct automated requests, `X-Serverless-Authorization` carries the Google
ID token, leaving `Authorization` for the app JWT. The automated validator does
not save or print these tokens.

During proxy cleanup, a process-list diagnostic inadvertently displayed the
proxy's temporary Google ID token in tool output because the SDK passes it as a
process argument. It was not written to files or Git. The proxy and its parent
were stopped, and port 8081 was confirmed closed. Stopping the proxy does not
invalidate an issued token; that token remains valid until its expiry. Avoid
printing full process arguments when inspecting this proxy in future.

## Validation executed and results

```bash
gcloud run services describe sales-insight-dashboard --project=id-fpoc-0608-data-posindo --region=asia-southeast2 --format=json
gcloud run revisions describe sales-insight-dashboard-00001-hxz --project=id-fpoc-0608-data-posindo --region=asia-southeast2 --format=json
gcloud run services get-iam-policy sales-insight-dashboard --project=id-fpoc-0608-data-posindo --region=asia-southeast2 --format=json
node scripts/gcp/validate-cloud-run.mjs
node --check scripts/gcp/validate-cloud-run.mjs
npm run lint --prefix client
git diff --check
```

- Revision Ready, ContainerHealthy, ContainerReady, and Active are true.
- Unauthenticated `/api/health`, `/login`, `/dashboard`: HTTP 403.
- Google-authenticated health: HTTP 200. Missing/invalid app JWT: HTTP 401.
- Invalid credentials: HTTP 401. Real BigQuery login: successful for all 3 roles.
- Real reporting/sales APIs and session verification pass for all roles.
- Users/audit APIs allow Admin and reject Analyst/Viewer with HTTP 403.
- All 24 read-only RBAC probes pass against real current BigQuery user roles.
- Real browser login, permitted direct routes, chart/table rendering, mobile
  layout, and logout pass for Admin/Analyst/Viewer; no observed runtime/API errors
  or CSP violations.
- All 31 existing browser tests pass against the Cloud Run container. These use
  fixtures for most business APIs; they complement the separate real-data checks.
- Counts and full-row SHA256 digests remain identical before/after:
  3 users, 750 sales, 13 audit logs. Dataset metadata/ACL etag remains
  `0MgeAYv3ZnctdXOFsGch9g==`.
- Manifest inspection confirms the revision uses the published amd64 image.
- Client lint, script syntax check, and whitespace checks pass.

The validator requires client dependencies/Playwright Chromium, local `gcloud`
and `bq` authentication, and demo passwords in macOS Keychain under service
`sales-insight-dashboard-demo` with the demo email as account. It does not create,
delete, or modify live records; production write paths remain for later final
verification. Browser tracing/screenshots/video are disabled to avoid token files.

## IAM scope and boundaries

Mentor granted the runtime SA `roles/bigquery.jobUser`, `roles/bigquery.dataEditor`,
and `roles/secretmanager.secretAccessor` at **project scope**. These grants work
but are broader than the original three-table/one-secret custom-role plan.
This deployment retained the mentor's grants; no IAM binding was added/removed
and no custom role was created. Narrowing them requires an authorized IAM admin;
the developer still lacks the corresponding IAM administration permissions.

Only the dedicated new Cloud Run service/revision was created in this phase.
No other workload, dataset ACL, schema, or application data was changed. No new
image was built/pushed, no Cloud Build job ran, and no additional cloud API or
secret version was created in this deployment step. Phase 20 remains separate.

References: [container deployment](https://docs.cloud.google.com/run/docs/deploying),
[authentication headers](https://docs.cloud.google.com/run/docs/authenticating/service-to-service),
[local authenticated proxy](https://docs.cloud.google.com/sdk/gcloud/reference/run/services/proxy).
