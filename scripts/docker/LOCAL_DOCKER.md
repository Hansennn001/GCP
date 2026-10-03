# Local Docker deployment (Phase 16)

The existing `sales-insight-dashboard:latest` image now runs locally with
real BigQuery authentication. No cloud deployment or GCP resource preparation
is performed by these commands. Image construction is documented in the root
[README](../../README.md#production-and-docker).

## Run

Prerequisites: Docker Desktop/Engine running, Node.js supported by the project,
the built image, and the existing Application Default Credentials login with
access to the app-owned dataset. Build the image if it is not present:

```bash
docker build -t sales-insight-dashboard .
```

From the repository root:

```bash
node scripts/docker/run-local.mjs
```

Open **http://localhost:8080** or **http://127.0.0.1:8080**. The helper runs in
the foreground. Use **Ctrl+C** in that terminal to stop/remove its container
and delete the temporary runtime files. It uses a unique container name and
does not stop other containers. The helper itself uses only Node built-ins;
no host npm dependencies are required to start the image.

For a different host port:

```bash
LOCAL_DOCKER_PORT=18080 node scripts/docker/run-local.mjs
```

For testing a specific image, set `LOCAL_DOCKER_IMAGE`. For amd64 testing on
this ARM Mac, also set `LOCAL_DOCKER_PLATFORM=linux/amd64`; `linux/arm64` is
also supported. Defaults still use `sales-insight-dashboard:latest` without
overriding its platform.

The container still uses port 8080. Host publication is restricted to
`127.0.0.1`; the application inside the container listens on `0.0.0.0`.
No host Vite or Express process is needed. Use the demo accounts/passwords
already configured in [SEEDING.md](../bigquery/SEEDING.md).

## Runtime configuration and ADC

The helper explicitly targets only:

```text
Project:  id-fpoc-0608-data-posindo
Dataset:  sales_dashboard
Location: asia-southeast2
```

It locates the existing ADC file through `GOOGLE_APPLICATION_CREDENTIALS`,
otherwise `CLOUDSDK_CONFIG/application_default_credentials.json`, otherwise
`~/.config/gcloud/application_default_credentials.json`. It validates the
credential JSON type and copies the file without changing the original.
If ADC is missing, use the previously documented `gcloud auth
application-default login` flow; CLI login and ADC are different credentials.

The runner creates a private host temporary directory (mode 0700) with two
files: a copy of ADC and generated backend configuration. Those individual
files are read-only (0444), which allows the image's non-root `node` user to
read them while other host users cannot traverse their private parent.
They are mounted read-only at `/run/local-adc.json` and `/app/.env`. The
container receives `GOOGLE_APPLICATION_CREDENTIALS=/run/local-adc.json`.
The mounted `.env` supplies the dataset configuration and a fresh random
32-byte JWT secret for each run. Restarting therefore invalidates existing
sessions; sign in again after restart.

No existing root `.env`, entire gcloud directory, or service-account key is
copied into the image. Secret values are not placed in command arguments or
Docker environment metadata, and the helper does not print their contents.
The temporary files are removed after normal exit or SIGINT/SIGTERM shutdown.
The source ADC file stays unchanged. No credentials are committed to Git.

This follows Google's
[local container ADC guidance](https://docs.cloud.google.com/run/docs/testing/local)
and [ADC lookup order](https://docs.cloud.google.com/docs/authentication/application-default-credentials),
using Docker's [read-only bind mounts](https://docs.docker.com/engine/storage/bind-mounts/)
and [localhost port publication](https://docs.docker.com/engine/network/port-publishing/).
The local ADC identity's existing permissions apply to queries; no IAM role
or other GCP setting is changed by the runner.

## Repeat browser checks

Keep the container running in one terminal. With frontend test dependencies
and Chromium installed, use another terminal:

```bash
npm --prefix client run test:docker
```

For an alternate port, pass the same `LOCAL_DOCKER_PORT` to this command.
The Docker Playwright configuration points at the running container and starts
no substitute host server. It runs the existing auth, RBAC, workspace, and
production suites against the image's real HTML/assets/security headers.
Business API fixtures isolate automated mutations from the cloud dataset.

## Phase 16 validation results

Executed:

```bash
node --check scripts/docker/run-local.mjs
node scripts/docker/run-local.mjs
npm --prefix client run test:docker
npm --prefix client run lint
git diff --check
```

Additional inline Node/Python checks verified:

- HTTP `/` and `/api/health` at localhost:8080 return 200. Unknown APIs return
  JSON 404 and anonymous sales requests return 401.
- Docker inspect confirms a running non-root container, localhost-only port,
  both read-only mounts, and no JWT secret in the container environment.
- All **31 browser tests passed** against container-served production assets.
  Syntax, lint, and whitespace checks passed.
- A separate live Chromium check signed in Admin, Analyst, and Viewer through
  the container's Express API and real BigQuery. Dashboard metrics, charts,
  transactions, Admin user directory, and Audit Logs loaded after direct
  navigation and refresh. Create and role dialogs opened and were cancelled.
- The complete eight-permission matrix passed for all three roles (24 backend
  probes). Analyst/Viewer admin routes were denied in the UI and API; real
  forbidden create/delete/role-update requests returned 403. No permitted
  cloud mutations were submitted in this phase.
- Desktop and 390px layouts, role-specific actions, and logout worked without
  browser runtime errors or CSP violations. Dashboard, Users, and mobile
  Analytics screenshots were visually reviewed.
- Real demo passwords came from Keychain into memory. No credentials, JWTs,
  or authenticated browser state were printed or saved.
- Before/after counts and full-row digests for all three BigQuery tables were
  identical: **3 users, 750 sales, 13 audit logs**. No other datasets, IAM,
  project settings, or cloud resources were modified.
- Ctrl+C shutdown succeeded. The validation container and temporary ADC/config
  copies were confirmed removed. The reusable image remains available locally.

These historical results validate the local linux/arm64 image. The tested amd64
image is published and deployed to private Cloud Run. See [cloud deployment](../gcp/CLOUD_RUN_DEPLOYMENT.md)
and [final verification](../gcp/FINAL_VERIFICATION.md) for the current release.
