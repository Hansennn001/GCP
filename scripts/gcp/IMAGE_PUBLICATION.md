# Build and publish container image (Phase 18)

The tested production image is published in Artifact Registry and deployed to
private Cloud Run. This guide records the original publication workflow;
current service configuration is in [CLOUD_RUN_DEPLOYMENT.md](CLOUD_RUN_DEPLOYMENT.md).

## Exact published image

Tag URI:

```text
asia-southeast2-docker.pkg.dev/id-fpoc-0608-data-posindo/sales-insight-dashboard/sales-insight-dashboard:git-6653fac73558
```

Published immutable image URI:

```text
asia-southeast2-docker.pkg.dev/id-fpoc-0608-data-posindo/sales-insight-dashboard/sales-insight-dashboard@sha256:39fb866ab65624df041ae04a7a356eef01d2f1b7492710e75b769d94234760cd
```

The build source revision is `6653fac7355821b5d6892a99b6b16db66733e007`.
Subsequent commits change the host validation helper and documentation, not
the contents of the published image. Later cleanup removes an unused placeholder
component; this does not change the already deployed image. Machine-readable release metadata is in
[image-release.json](image-release.json). The image remains configured for
non-root execution, `NODE_ENV=production`, and default port 8080.

The registry object is an OCI index containing the **linux/amd64** image and
BuildKit provenance attestation. The extra attestation descriptor is not an
application platform. The registry digest above identifies the entire index;
its runtime image descriptor was checked to be linux/amd64. This satisfies
Cloud Run's [container architecture requirement](https://docs.cloud.google.com/run/docs/container-contract).
The ARM-only local image from Phase 16 was not merely retagged or uploaded.

## Executed build/test/push workflow

The following commands record this release. Future releases should use a fresh
revision tag and be validated before pushing; do not reuse this release tag.

```bash
gcloud auth configure-docker asia-southeast2-docker.pkg.dev --quiet

docker buildx build --platform linux/amd64 --load \
  -t sales-insight-dashboard:git-6653fac73558-amd64 .
```

The Docker credential helper was configured only for this registry hostname.
No token/password was embedded in commands, source, or image configuration.
`--load` makes the single-platform image available locally before publication,
as described in [Docker's buildx reference](https://docs.docker.com/reference/cli/docker/buildx/build/).

The amd64 image ran locally on this ARM Mac through Docker Desktop emulation:

```bash
LOCAL_DOCKER_IMAGE=sales-insight-dashboard:git-6653fac73558-amd64 \
LOCAL_DOCKER_PLATFORM=linux/amd64 \
node scripts/docker/run-local.mjs
```

In another terminal:

```bash
npm --prefix client run test:docker
```

The helper accepts the selected image/platform, uses temporary read-only ADC
and runtime configuration mounts, and never modifies the image with credentials.
After the automated/live tests passed, the same image was tagged and pushed:

```bash
docker tag sales-insight-dashboard:git-6653fac73558-amd64 \
  asia-southeast2-docker.pkg.dev/id-fpoc-0608-data-posindo/sales-insight-dashboard/sales-insight-dashboard:git-6653fac73558

docker push \
  asia-southeast2-docker.pkg.dev/id-fpoc-0608-data-posindo/sales-insight-dashboard/sales-insight-dashboard:git-6653fac73558
```

Authentication and publication follow Google's
[Docker authentication](https://docs.cloud.google.com/artifact-registry/docs/docker/authentication)
and [image push guidance](https://docs.cloud.google.com/artifact-registry/docs/docker/pushing-and-pulling).
No Cloud Build job, new API, manual IAM grant, or other repository was used.

## Verification

```bash
gcloud artifacts docker images describe \
  asia-southeast2-docker.pkg.dev/id-fpoc-0608-data-posindo/sales-insight-dashboard/sales-insight-dashboard:git-6653fac73558 \
  --project=id-fpoc-0608-data-posindo --format=json --quiet

docker buildx imagetools inspect \
  asia-southeast2-docker.pkg.dev/id-fpoc-0608-data-posindo/sales-insight-dashboard/sales-insight-dashboard:git-6653fac73558 --raw

gcloud run services list --project=id-fpoc-0608-data-posindo \
  --region=asia-southeast2 --format=json --quiet

node --check scripts/docker/run-local.mjs
git diff --check
```

Results:

- Multi-stage linux/amd64 build succeeded, including Vite production build and
  Linux backend dependencies. Image inspection confirmed the architecture,
  non-root user, and absence of secret/ADC environment variables.
- Filesystem inspection via a stopped container/export found React HTML,
  eight compiled assets, backend runtime files, and bcrypt dependencies.
  Environment files, credential/private-key paths, frontend sources/tooling,
  and application setup/test scripts were absent. Inspection artifacts were
  removed after checking.
- Container health returned 200. All **31 browser tests** passed against the
  amd64 image, covering sessions, RBAC, core API fixtures/mutations, direct
  routes, refresh, charts under CSP, and error/loading/empty states.
- A separate real BigQuery Chromium check passed for Admin, Analyst, and Viewer:
  native bcrypt login, dashboard, analytics, transactions, permitted Admin
  pages, direct navigation/reload, all eight permission probes per role,
  denied Admin pages for other roles, mobile layout, and logout.
  No runtime errors or CSP violations were observed. No real data mutation
  was submitted by this check.
- Before/after BigQuery counts and full-row digests stayed unchanged:
  **3 users, 750 sales, 13 audit logs**. Passwords were held in memory from
  Keychain; credentials/JWT/browser state were not printed or saved.
- Docker push succeeded. Artifact Registry description confirmed the exact
  remote digest; it matched the pushed/local repository digest. The remote
  manifest contained linux/amd64. Target-region Cloud Run service listing
  remained empty.
- Validation containers and temporary ADC/config copies were removed. Other
  existing containers, workloads, datasets, IAM, and project settings were
  not changed. The image remains locally and in the dedicated registry.

Publication is complete. The image is deployed; see
[CLOUD_RUN_DEPLOYMENT.md](CLOUD_RUN_DEPLOYMENT.md) for private access and
[FINAL_VERIFICATION.md](FINAL_VERIFICATION.md) for final verification results.
