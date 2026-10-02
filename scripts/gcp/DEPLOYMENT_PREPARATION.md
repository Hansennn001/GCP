# GCP deployment preparation (Phase 17)

The following preparation results record Phase 17 for project `id-fpoc-0608-data-posindo`
(project number `797252500656`). Phase 18 image publication is now documented in
[IMAGE_PUBLICATION.md](IMAGE_PUBLICATION.md); Cloud Run has not been deployed.
The application region and existing BigQuery dataset location are
`asia-southeast2` (Jakarta). Existing applications and datasets are outside
this preparation scope.

## Prepared resources

| Resource | Purpose | Phase 17 result |
|---|---|---|
| BigQuery API | Existing query/auth/reporting/DML backend | Already enabled; no table/data/ACL changes |
| Artifact Registry API | Store versioned container images | Enabled |
| Cloud Run API | Future managed container service | Enabled; no service deployed |
| IAM API | Future application service-account/custom-role management | Enabled |
| Logging API | Cloud Run stdout/stderr | Already enabled |
| Secret Manager API | Future JWT secret supplied at deployment | Already enabled; no secret created |
| Cloud Build | Optional hosted image build | Not enabled/used; local Docker build planned |
| Docker repository `sales-insight-dashboard` | Dedicated application image storage | Created in `asia-southeast2`; currently empty |

The repository is a standard Docker repository with Google-managed encryption,
application/management labels, and an application-specific description. No
existing repository was reused or modified. Enabling project APIs is additive;
Google may provision its own required service identities. Existing enabled
services were not disabled, and no manual IAM bindings were applied.

## Commands executed

All cloud commands explicitly targeted this project (except global role
inspection). The local gcloud project was also verified/set:

```bash
gcloud config set project id-fpoc-0608-data-posindo --quiet

gcloud services enable \
  artifactregistry.googleapis.com run.googleapis.com iam.googleapis.com \
  --project=id-fpoc-0608-data-posindo --quiet

gcloud artifacts repositories create sales-insight-dashboard \
  --project=id-fpoc-0608-data-posindo \
  --location=asia-southeast2 \
  --repository-format=docker \
  --description='Dedicated container images for Sales Insight Dashboard; Phase 17 preparation' \
  --labels=application=sales-insight-dashboard,managed-by=codex --quiet
```

This create command was executed once after confirming no repository existed
in the chosen location. For future verification, use `describe` instead of
recreating or changing another repository.

## Runtime identity strategy — planned, not applied

Use a dedicated user-managed account:

```text
sales-insight-runtime@id-fpoc-0608-data-posindo.iam.gserviceaccount.com
```

Cloud Run should use that identity through ADC/metadata credentials. Do not
upload local ADC, create/download service-account keys, or mount the local
Docker helper's credential files in Cloud Run. The local runner remains local.

The backend submits SQL jobs, selects existing tables, and uses transactions
for INSERT/UPDATE/DELETE plus audit writes. It does not create/drop tables,
change schemas, export data, manage IAM, or enumerate other datasets.

| Planned role | Binding scope | Permissions/reason |
|---|---|---|
| Custom `salesInsightQueryJobs` | Target project | `bigquery.jobs.create` to submit SQL jobs |
| Custom `salesInsightTableData` | Each of `sales_dashboard.users`, `sales_dashboard.sales`, `sales_dashboard.audit_logs` | `bigquery.tables.get`, `bigquery.tables.getData`, `bigquery.tables.updateData` for metadata, SELECT, and DML |
| Secret Manager Secret Accessor | Only the future application JWT secret | Read JWT secret at runtime/deployment |

Custom-role definitions are in `runtime-query-role.yaml` and
`runtime-table-role.yaml`. Table-level bindings preserve the dataset ACL and
other table bindings. The service account must not receive project-wide data
roles, Owner/Editor, BigQuery Admin, dataset creation, table deletion, or IAM
administration. `updateData` is a table permission: it cannot restrict DML to
an individual application role or make audit writes append-only. Backend RBAC
continues to enforce those application policies.

The current `roles/bigquery.jobUser` definition was inspected and contains
additional Dataform/Gemini permissions, so the proposed job role is narrower.
The application reads results of its own jobs; broad access to other users'
job metadata is not planned. The proposed identity must be validated against
actual query/transaction paths before deployment. Only add a permission if
that validation demonstrates it is needed.

Commands below are a concrete plan for later identity preparation; **they were
not executed in Phase 17**. Run from the repository root only after checking
these dedicated account/role names are unused, or already belong to this app.
Do not overwrite existing unrelated roles/accounts.

```bash
gcloud iam service-accounts create sales-insight-runtime \
  --project=id-fpoc-0608-data-posindo \
  --display-name='Sales Insight Dashboard runtime'

gcloud iam roles create salesInsightQueryJobs \
  --project=id-fpoc-0608-data-posindo \
  --file=scripts/gcp/runtime-query-role.yaml

gcloud iam roles create salesInsightTableData \
  --project=id-fpoc-0608-data-posindo \
  --file=scripts/gcp/runtime-table-role.yaml

gcloud projects add-iam-policy-binding id-fpoc-0608-data-posindo \
  --member=serviceAccount:sales-insight-runtime@id-fpoc-0608-data-posindo.iam.gserviceaccount.com \
  --role=projects/id-fpoc-0608-data-posindo/roles/salesInsightQueryJobs \
  --condition=None

for table in users sales audit_logs; do
  bq add-iam-policy-binding \
    --member=serviceAccount:sales-insight-runtime@id-fpoc-0608-data-posindo.iam.gserviceaccount.com \
    --role=projects/id-fpoc-0608-data-posindo/roles/salesInsightTableData \
    id-fpoc-0608-data-posindo:sales_dashboard."$table"
done
```

## Deployer and system identities

Keep the human deployer separate from the runtime identity. The later image
publisher needs `roles/artifactregistry.writer` on this repository only.
Deployment needs `roles/run.developer` at a scope that permits service creation,
repository image read access, and `roles/iam.serviceAccountUser` on the dedicated
runtime account only. Resource/IAM preparation needs separate administration
permissions; none of these human bindings were added in this phase.

Cloud Run's Google-managed service agent handles image retrieval. Do not grant
its service-agent role to the runtime account. Keep the repository/service in
this same project and verify the standard service-agent permissions during
deployment; no cross-project grant is planned. JWT secret access must be scoped
to its future dedicated secret. Public/private invocation and any resulting
service IAM policy are deployment-phase decisions, with no binding now.

## Expected image path and next-phase constraint

```text
asia-southeast2-docker.pkg.dev/id-fpoc-0608-data-posindo/sales-insight-dashboard/sales-insight-dashboard:TAG
```

`TAG` should identify the tested revision (for example `git-<short-commit>`).
This was the planned path in Phase 17. The actual tag and digest are now in
[image-release.json](image-release.json).
The Phase 16 local image is linux/arm64; Phase 18 must build/test a linux/amd64
image or multi-architecture image containing linux/amd64 before pushing.
Cloud Run requires the x86_64 ABI. Do not just retag the ARM-only local image.
Docker authentication for this registry hostname will be configured for the
image-push phase, rather than changing Docker credentials now.

## Validation and boundaries

Project description/configuration, enabled-service listing, repository
listing/description, image listing, target-region Cloud Run service listing,
BigQuery dataset metadata, and custom-role permission support were checked.
Repository format/location/labels are correct and image listing is empty.
No Cloud Run service was created. The SDK YAML parser validated both custom-role files and their exact permission
lists. Proposed definitions contain only the four specified BigQuery permissions
and are plans, not granted authority. Dataset metadata/ACL etag matched the
preparation baseline. All resource assertions and `git diff --check` passed.

No application data, dataset ACL, existing workload, runtime service account,
custom IAM role, secret, image push, or Cloud Run deployment was changed/created
by this phase. The only cloud mutations were enabling the three required APIs
and creating the dedicated repository. These results record Phase 17. The tested amd64 image is now published as
documented in [IMAGE_PUBLICATION.md](IMAGE_PUBLICATION.md); Phase 19 deployment
has not started.

Primary references:

- [Artifact Registry repository creation](https://docs.cloud.google.com/artifact-registry/docs/repositories/create-repos)
- [BigQuery IAM and table-level custom roles](https://docs.cloud.google.com/bigquery/docs/control-access-to-resources-iam)
- [BigQuery permissions](https://docs.cloud.google.com/bigquery/docs/access-control)
- [Cloud Run deployment permissions](https://docs.cloud.google.com/run/docs/deploying)
- [Cloud Run container contract](https://docs.cloud.google.com/run/docs/container-contract)
