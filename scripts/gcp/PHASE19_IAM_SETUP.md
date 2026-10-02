# Phase 19: private Cloud Run preparation and administrator handoff

Phase 19 is **incomplete**. No Cloud Run service or revision has been deployed.
The user selected private access: keep invoker IAM checks enabled and do not
grant `allUsers` or `allAuthenticatedUsers` access.

## Resources already created

Only these new application resources were created in this phase:

- Service account: `sales-insight-runtime@id-fpoc-0608-data-posindo.iam.gserviceaccount.com`.
- Secret: `sales-insight-jwt`, with enabled version `1`.

The JWT value was generated in memory and submitted through stdin. It was not
printed, committed, or written to a local file. Do not recreate the account,
regenerate the secret, or request a service-account JSON key.

The existing tested linux/amd64 image is recorded in
[image-release.json](image-release.json). Dataset `sales_dashboard` already
contains the app's `users`, `sales`, and `audit_logs` tables in `asia-southeast2`.
No table data, schema, dataset ACL, or existing workload was modified here.

## Why an administrator is needed

The active account `alhan.husen@point-star.com` can create the Cloud Run service
and act as the dedicated runtime account, but permission checks reported these
permissions missing:

- `iam.roles.create`
- `resourcemanager.projects.setIamPolicy`
- `secretmanager.secrets.setIamPolicy`
- `run.services.setIamPolicy`

The attempted creation of `salesInsightQueryJobs` failed with
`PERMISSION_DENIED` for `iam.roles.create`. The remaining IAM commands were
aborted. Neither custom role nor any runtime binding has been applied.
Deploying now would leave the runtime unable to access its secret and BigQuery.

An authorized project administrator can execute the following steps directly;
granting Owner/Editor or broad administrative access to the developer is not
required. This handoff does not authorize changes to unrelated resources.

## Administrator steps

Run from this repository root using an administrator's own authenticated
account. All commands name the project explicitly. Stop on any error.

1. Inspect both proposed role IDs before creating them:

   ```bash
   gcloud iam roles describe salesInsightQueryJobs --project=id-fpoc-0608-data-posindo
   gcloud iam roles describe salesInsightTableData --project=id-fpoc-0608-data-posindo
   ```

   `NOT_FOUND` is expected for new roles. Permission denied is not evidence of
   absence. If either already exists, verify it belongs to this app and exactly
   matches its YAML definition; do not overwrite or reuse an unrelated role.
   Create only absent roles:

   ```bash
   gcloud iam roles create salesInsightQueryJobs \
     --project=id-fpoc-0608-data-posindo \
     --file=scripts/gcp/runtime-query-role.yaml
   gcloud iam roles create salesInsightTableData \
     --project=id-fpoc-0608-data-posindo \
     --file=scripts/gcp/runtime-table-role.yaml
   ```

2. Grant query-job submission at project scope. This role contains only
   `bigquery.jobs.create` and grants no table-data access:

   ```bash
   gcloud projects add-iam-policy-binding id-fpoc-0608-data-posindo \
     --member=serviceAccount:sales-insight-runtime@id-fpoc-0608-data-posindo.iam.gserviceaccount.com \
     --role=projects/id-fpoc-0608-data-posindo/roles/salesInsightQueryJobs \
     --condition=None
   ```

3. Grant metadata, read, and DML permissions on only the three application
   tables. These additive bindings preserve existing bindings and dataset ACLs:

   ```bash
   for table in users sales audit_logs; do
     bq add-iam-policy-binding \
       --member=serviceAccount:sales-insight-runtime@id-fpoc-0608-data-posindo.iam.gserviceaccount.com \
       --role=projects/id-fpoc-0608-data-posindo/roles/salesInsightTableData \
       "id-fpoc-0608-data-posindo:sales_dashboard.${table}" || break
   done
   ```

   All three commands must succeed before proceeding. Do not grant this role
   at dataset or project scope.

4. Grant access to only the application JWT secret:

   ```bash
   gcloud secrets add-iam-policy-binding sales-insight-jwt \
     --project=id-fpoc-0608-data-posindo \
     --member=serviceAccount:sales-insight-runtime@id-fpoc-0608-data-posindo.iam.gserviceaccount.com \
     --role=roles/secretmanager.secretAccessor \
     --condition=None
   ```

5. Verify role definitions and bindings without reading the secret value:

   ```bash
   gcloud iam roles describe salesInsightQueryJobs --project=id-fpoc-0608-data-posindo
   gcloud iam roles describe salesInsightTableData --project=id-fpoc-0608-data-posindo
   gcloud projects get-iam-policy id-fpoc-0608-data-posindo \
     --flatten='bindings[].members' \
     --filter='bindings.members:serviceAccount:sales-insight-runtime@id-fpoc-0608-data-posindo.iam.gserviceaccount.com' \
     --format='table(bindings.role,bindings.members)'
   for table in users sales audit_logs; do
     bq get-iam-policy "id-fpoc-0608-data-posindo:sales_dashboard.${table}"
   done
   gcloud secrets get-iam-policy sales-insight-jwt --project=id-fpoc-0608-data-posindo
   gcloud secrets versions list sales-insight-jwt --project=id-fpoc-0608-data-posindo
   ```

## Deployment after the IAM gate passes

These commands are prepared, **not executed**. First verify the bindings above
and ensure the target service name is absent. The last service listing was
empty; repeat immediately before creation. Stop if an unrelated service now
uses this name.

```bash
gcloud run services list --project=id-fpoc-0608-data-posindo \
  --region=asia-southeast2 --format='table(metadata.name,status.url)'

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

Cloud Run sets `PORT` from `--port`. The new service uses default private IAM;
no public-access flag or binding is applied. Verify its policy after creation,
including inherited project permissions. The current developer's permission
test returned `run.routes.invoke`; no new invoker grant is needed for that
account. If a different tester needs access, an administrator can add
`roles/run.invoker` for that named account on this service only after creation.

Required remaining validation: healthy revision, correct runtime identity,
no public binding, unauthenticated request denied, authenticated `/api/health`,
`/login`, `/dashboard`, and real BigQuery login/RBAC for Admin/Analyst/Viewer.
These checks have **not** run against Cloud Run.

For authenticated validation, send the Google ID token in
`X-Serverless-Authorization` and reserve `Authorization` for the application's
JWT. A private URL requires Google IAM authentication in addition to the app
login; entering it in an ordinary browser alone does not complete this check.
Do not log tokens or secret values. After Phase 19 passes, stop before Phase 20.

## Validation completed during preparation

- Service-account describe: dedicated account exists.
- Secret-version list: version `1` is enabled; value was not retrieved.
- Target-region Cloud Run service list: empty; no deployment performed.
- Permission preflight: IAM administration unavailable; private invocation allowed.
- Repeated `bq get-iam-policy` on all three tables: unchanged empty bindings,
  with etag `ACAB`; no changes applied.
- Local CLI help checked deployment flags; `git diff --check` passed.
- All seven prepared shell blocks passed `bash -n` syntax validation without
  executing the deployment or IAM mutations.

References: [table-level BigQuery IAM](https://docs.cloud.google.com/bigquery/docs/control-access-to-resources-iam),
[Cloud Run deploy flags](https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy),
[Cloud Run secrets](https://docs.cloud.google.com/run/docs/configuring/services/secrets),
[separate Google and app authentication headers](https://docs.cloud.google.com/run/docs/authenticating/service-to-service).
