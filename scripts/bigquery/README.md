# BigQuery setup — Phase 4

Target project: `id-fpoc-0608-data-posindo`.
Dataset: `sales_dashboard`.
Location: Jakarta (`asia-southeast2`).

The four SQL files create an empty dataset and the planned tables. They use
strict `CREATE` statements: setup fails if a resource already exists. They
do not reuse, replace, migrate, or delete existing resources.
No users, passwords, sales records, or audit events are inserted in Phase 4.

## 1. Install and authenticate

Google Cloud CLI was installed locally with Homebrew during Phase 4:

```bash
brew install --cask gcloud-cli
```

On another machine, install the CLI first. Then run these commands yourself
in Terminal and complete the Google browser login:

```bash
gcloud auth login
gcloud config set project id-fpoc-0608-data-posindo
gcloud auth application-default login
gcloud auth application-default set-quota-project id-fpoc-0608-data-posindo
```

CLI authentication is used by `gcloud` and `bq`. Application Default
Credentials are used by the Node.js BigQuery SDK. Keep credentials outside
the repository; do not send tokens or credential files through chat.

## 2. Check the project prerequisites

Use an account with access to the existing target project and an enabled
billing account. Dataset/table creation and query execution require
`bigquery.datasets.create`, `bigquery.tables.create`, and
`bigquery.jobs.create`. Setting an ADC quota project also requires
`serviceusage.services.use` on that project. Request the required access
from the project administrator if a command reports permission denied.

Enable only the API needed for this phase, if it is not already enabled:

```bash
gcloud services enable bigquery.googleapis.com --project=id-fpoc-0608-data-posindo
```

Enabling an API requires appropriate Service Usage permissions. This phase
does not prepare Cloud Run or Artifact Registry.

## 3. Create the dataset and tables

Confirm Jakarta is the desired location before executing. For another
location, change `create_dataset.sql`, `BIGQUERY_LOCATION` in the local
environment file, and the `--location` values below together.

The Phase 4 resources have already been created; do not rerun these commands
for the current setup. For a future fresh setup, first check that the target
dataset does not exist. If it exists, stop and choose a new dataset name,
updating all SQL paths and the environment configuration together.

Run from the repository root, in this order, only for a confirmed new dataset.
Stop immediately if any command fails; do not continue with the table SQL:

```bash
bq --project_id=id-fpoc-0608-data-posindo --location=asia-southeast2 query --use_legacy_sql=false < scripts/bigquery/create_dataset.sql
bq --project_id=id-fpoc-0608-data-posindo --location=asia-southeast2 query --use_legacy_sql=false < scripts/bigquery/create_users.sql
bq --project_id=id-fpoc-0608-data-posindo --location=asia-southeast2 query --use_legacy_sql=false < scripts/bigquery/create_sales.sql
bq --project_id=id-fpoc-0608-data-posindo --location=asia-southeast2 query --use_legacy_sql=false < scripts/bigquery/create_audit_logs.sql
```

Verify the resulting resources:

```bash
bq show id-fpoc-0608-data-posindo:sales_dashboard
bq ls id-fpoc-0608-data-posindo:sales_dashboard
```

Never use an existing dataset for this fresh setup. The SQL targets only
the explicitly named project and dataset. There are no `OR REPLACE`,
`ALTER`, `DROP`, or data mutation statements.

## 4. Verify the backend connection

The local ignored root `.env` was created with the target project, dataset,
and Jakarta location. On another checkout, create a root `.env` using
`.env.example`; existing process variables take precedence.

```bash
cd server
npm install
npm run check
npm test
npm run check:bigquery
npm start
```

In another terminal:

```bash
curl --fail-with-body http://localhost:8080/api/health
```

`check:bigquery` runs a parameterized `SELECT @value AS connection_ok` using
ADC. It does not modify any resources or read user data. It checks query
execution, while `bq show`/`bq ls` verify dataset/table creation separately.
It exits nonzero when configuration, authentication, IAM, or API access is
unavailable and prints no credential details. No public debug endpoint is
added to the unauthenticated API.

## Validation status

Phase 4 completed on 2 October 2026:

- ADC successfully executed a parameterized GoogleSQL query.
- A read-only existence check confirmed `sales_dashboard` was absent before
  executing the strict creation SQL.
- All four SQL statements executed successfully in the target project.
- Dataset location is `asia-southeast2`.
- Exactly three tables exist: `users` (7 columns), `sales` (10 columns), and
  `audit_logs` (6 columns). Column names and types match the plan.
- Every table contains zero rows; no seed data was inserted.
- `npm run check`, all ten backend tests, and `npm run check:bigquery` passed.
- The running Express health endpoint returned HTTP 200 and the expected
  service JSON.
- No existing datasets/tables, IAM, or project settings were modified.

No credentials were added to the repository. Phase 5 subsequently added
demo users and sales; see [the seeding guide](SEEDING.md) for the current
data state and safe rerun instructions. Do not rerun resource creation.

References: [CLI installation](https://docs.cloud.google.com/sdk/docs/install-sdk),
[local ADC](https://docs.cloud.google.com/docs/authentication/set-up-adc-local-dev-environment),
[GoogleSQL DDL](https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/data-definition-language),
[dataset creation](https://docs.cloud.google.com/bigquery/docs/datasets).
