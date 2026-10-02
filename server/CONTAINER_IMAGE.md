# Container image (Phase 15)

The root Dockerfile packages the production application prepared in
[PRODUCTION.md](PRODUCTION.md). This phase builds and inspects the image;
local application deployment and BigQuery tests inside the container belong
to Phase 16. Cloud Run deployment has not started.

## Build

From the repository root, with Docker running:

```bash
docker build -t sales-insight-dashboard .
```

The image uses Node.js 24.21.0 on Debian Bookworm slim, pinned to the official
image's manifest digest. The version satisfies both application packages'
Node.js requirements. The Dockerfile has three stages:

1. `frontend-build` installs the locked frontend dependencies using `npm ci`
   and generates React assets inside Linux. Host `client/dist` is not copied.
2. `backend-dependencies` installs only the locked production backend
   dependencies using `npm ci --omit=dev`. Host `node_modules` is not copied.
3. `runtime` copies those dependencies, explicit backend runtime directories,
   and the generated frontend build into the existing `/app/server` and
   `/app/client/dist` layout. It runs `node index.js` directly as the non-root
   `node` user, with `NODE_ENV=production` and default `PORT=8080`.

`EXPOSE 8080` documents the default port; runtime `PORT` can override it.
Express already listens on `0.0.0.0` and uses `process.env.PORT || 8080` through
its validated environment configuration. The image does not publish a port,
start a host service, or configure cloud resources by itself.

The strategy follows Docker's
[multi-stage build documentation](https://docs.docker.com/build/building/multi-stage/)
and uses the [official Node image](https://github.com/nodejs/docker-node).

## Build context and secrets

`.dockerignore` denies files by default and permits only package manifests,
lockfiles, frontend build inputs, and backend runtime sources. Additional
exclusions apply even inside permitted directories. Git metadata, host
modules, generated builds, documentation, tests, browser artifacts, setup
scripts, `.env` files, npm configuration, credential directories, credential
JSON filenames, private keys, and logs are excluded. The ignore rules follow
[Docker's build-context documentation](https://docs.docker.com/build/concepts/context/).

There are no JWT or Google credentials in `ARG`, `ENV`, or `COPY` instructions.
Only `NODE_ENV` and `PORT` are configured by the application Dockerfile.
Existing local environment and ADC files are not sent to the build. Secret
values and BigQuery authentication must be supplied at runtime in the later
local deployment phase; the image does not contain demo passwords.

Runtime copies omit frontend sources/tooling and application tests/seeding
scripts. The application files remain root-owned and readable by `node`; the
application does not need to write to its source directory.

## Phase 15 validation

Executed:

```bash
docker version
docker build -t sales-insight-dashboard .
docker build --check .
git diff --check
```

Additional inline Python checks used Docker APIs through the CLI:

- A temporary scratch build with `COPY . /` and a local output exported the
  actual filtered context. All 81 permitted files were checked for required
  source/build inputs and excluded secrets/generated/tooling paths. Temporary
  context output was removed afterward.
- `docker image inspect` verified the non-root user, entry command, production
  environment, default port, work directory, and absence of credential/secret
  environment variables.
- `docker create` made a stopped container solely for filesystem inspection;
  it was never started and no port or credentials were supplied. `docker export`
  inspected the image filesystem for Express and bcrypt packages, backend
  sources, React HTML, and eight generated assets. Private paths and the local
  JWT secret were absent from application files. Host frontend dependencies,
  source, and application test/setup scripts were absent. The stopped container
  and temporary archive were removed afterward.

Results: Docker build and Linux React production build succeeded. Dockerfile
checks completed with no warnings. Context/image checks and `git diff --check`
passed. The resulting local image is `sales-insight-dashboard:latest`, built
as **linux/arm64** on this Mac; Docker reported an image size of **84.8 MB**.
The base digest supports platform selection, but this phase did not build or
validate an amd64 image. The target deployment architecture will be handled
in its deployment phase.

No application container was started, no BigQuery requests were made, and no
cloud data, IAM, or other project resources were changed. Runtime connectivity,
login, and RBAC inside Docker are intentionally reserved for Phase 16.

Phase 15 stops here. Phase 16 and Cloud Run deployment have not started.
