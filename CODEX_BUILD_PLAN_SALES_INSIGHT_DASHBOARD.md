# Codex Build Plan — Sales Insight Dashboard

## 1. Project Overview

Build a simple but polished full-stack web application called **Sales Insight Dashboard**.

The purpose of this project is to demonstrate and validate the following stack and deployment flow:

- React frontend
- Express.js backend
- REST API
- Authentication using JWT
- Role-Based Access Control (RBAC)
- Google BigQuery as the project database
- Docker containerization
- Local deployment using Docker
- Google Cloud deployment using Cloud Run
- Container-based deployment to Cloud Run

This is a **proof-of-concept / learning project**, not a production-scale application.

The project should remain intentionally simple, understandable, and easy to demonstrate, while still looking professional.

---

# 2. Important Codex Execution Rule

## DO NOT BUILD THE WHOLE PROJECT IN ONE RUN

This project MUST be implemented incrementally.

Codex must work on **only one phase at a time**.

For every phase:

1. Read this document.
2. Identify the currently requested phase.
3. Modify only what is required for that phase.
4. Do not implement features belonging to future phases.
5. Run the relevant validation commands.
6. Fix errors found during validation.
7. Summarize:
   - what was created,
   - what was changed,
   - commands that were run,
   - validation result,
   - files created/modified,
   - anything the developer needs to know.
8. STOP.

Do not automatically continue to the next phase.

Wait until the developer explicitly asks:

> Continue to Phase X

or provides another specific instruction.

---

# 3. Project Goal

Create a dashboard application that allows users to view simple sales analytics and access different functionality based on their assigned role.

The application should demonstrate:

```text
React Frontend
      |
      v
Express REST API
      |
      v
Authentication + RBAC
      |
      v
Google BigQuery
```

Later, the entire application will be packaged into a Docker container and deployed to Google Cloud Run.

---

# 4. Application Concept

## Application Name

**Sales Insight Dashboard**

## Application Purpose

An internal company dashboard for monitoring sales performance.

Users can:

- log in,
- view dashboard metrics,
- view sales transactions,
- view simple analytics,
- perform actions depending on their role,
- manage users if they are an administrator.

---

# 5. User Roles

Use three roles:

```text
admin
analyst
viewer
```

## Permission Matrix

| Feature | Admin | Analyst | Viewer |
|---|---|---|---|
| Login | Yes | Yes | Yes |
| Dashboard | Yes | Yes | Yes |
| Analytics | Yes | Yes | Yes |
| View transactions | Yes | Yes | Yes |
| Create transaction | Yes | Yes | No |
| Delete transaction | Yes | No | No |
| User management | Yes | No | No |
| Change user role | Yes | No | No |
| View audit logs | Yes | No | No |

RBAC must be enforced in **both frontend and backend**.

Frontend permissions are only for UX.

Backend permissions are the actual security enforcement.

---

# 6. Main Pages

The final application should contain:

```text
/login

/dashboard

/transactions

/analytics

/users

/audit-logs
```

### Login

Contains:

- email input
- password input
- login button
- simple validation
- professional-looking card layout

### Dashboard

Contains summary cards such as:

- Total Revenue
- Total Orders
- Average Order Value
- Top Product

Also display a small revenue trend chart.

### Transactions

Display sales records in a table.

Expected columns:

- Date
- Product
- Category
- Region
- Quantity
- Revenue
- Cost
- Created By

Actions should respect the user's role.

### Analytics

Display basic charts:

- Revenue Trend
- Revenue by Product
- Revenue by Region
- Top Products

### User Management

Admin only.

Display:

- Name
- Email
- Role
- Status
- Created At

Admin can update roles.

### Audit Logs

Admin only.

Display basic activity logs such as:

- LOGIN
- CREATE_SALE
- DELETE_SALE
- UPDATE_ROLE

---

# 7. UI Requirements

The UI should look professional but remain simple.

Preferred stack:

```text
React
Vite
Tailwind CSS
shadcn/ui
Lucide React
Recharts
```

Do not over-engineer the UI.

Use:

- responsive sidebar
- top navigation/header
- cards
- tables
- charts
- badges
- loading states
- empty states
- simple error states

Visual direction:

- modern SaaS dashboard
- clean spacing
- neutral colors
- professional typography
- responsive desktop-first design

Do not spend excessive effort on animations.

---

# 8. Backend Requirements

Use:

```text
Node.js
Express.js
JWT
bcrypt
@google-cloud/bigquery
```

Backend responsibilities:

- authentication
- JWT generation
- JWT validation
- RBAC authorization
- input validation
- BigQuery queries
- dashboard aggregation endpoints
- user management
- sales CRUD where required
- audit logging

Use clear separation between:

```text
routes
controllers
middleware
services
config
utils
```

---

# 9. Database

Google BigQuery is intentionally used because it is part of this proof-of-concept requirement.

Dataset:

```text
sales_dashboard
```

Tables:

```text
users
sales
audit_logs
```

---

## 9.1 users

Suggested schema:

| Column | Type |
|---|---|
| user_id | STRING |
| name | STRING |
| email | STRING |
| password_hash | STRING |
| role | STRING |
| status | STRING |
| created_at | TIMESTAMP |

Valid roles:

```text
admin
analyst
viewer
```

Status:

```text
active
inactive
```

---

## 9.2 sales

Suggested schema:

| Column | Type |
|---|---|
| sale_id | STRING |
| sale_date | DATE |
| product | STRING |
| category | STRING |
| region | STRING |
| quantity | INT64 |
| revenue | NUMERIC |
| cost | NUMERIC |
| created_by | STRING |
| created_at | TIMESTAMP |

---

## 9.3 audit_logs

Suggested schema:

| Column | Type |
|---|---|
| log_id | STRING |
| user_id | STRING |
| action | STRING |
| resource | STRING |
| details | STRING |
| created_at | TIMESTAMP |

---

# 10. Expected Repository Structure

Target structure:

```text
sales-insight-dashboard/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── server/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── app.js
│   ├── index.js
│   └── package.json
│
├── scripts/
│
├── .env.example
├── .gitignore
├── .dockerignore
├── Dockerfile
├── package.json
└── README.md
```

The exact structure may evolve slightly if technically justified, but keep it simple.

---

# 11. Environment Variables

The project should eventually support variables similar to:

```env
PORT=8080

JWT_SECRET=replace_me

GOOGLE_CLOUD_PROJECT=your-project-id

BIGQUERY_DATASET=sales_dashboard
```

Do NOT commit:

- credentials
- service account JSON
- secrets
- real passwords

Create `.env.example`.

For local Google authentication, prefer Application Default Credentials where possible.

Example:

```bash
gcloud auth application-default login
```

Never copy service-account credentials into the Docker image.

---

# 12. API Target

The final API can use the following routes.

## Authentication

```text
POST /api/auth/login
GET  /api/auth/me
```

## Dashboard

```text
GET /api/dashboard/summary
GET /api/dashboard/revenue-trend
```

## Transactions

```text
GET    /api/sales
POST   /api/sales
DELETE /api/sales/:id
```

## Analytics

```text
GET /api/analytics/products
GET /api/analytics/regions
GET /api/analytics/top-products
```

## Users

```text
GET   /api/users
PATCH /api/users/:id/role
```

## Audit Logs

```text
GET /api/audit-logs
```

## System

```text
GET /api/health
```

The health endpoint should eventually return something similar to:

```json
{
  "status": "ok",
  "service": "sales-insight-dashboard"
}
```

---

# 13. Authentication Flow

Expected flow:

```text
User submits email/password
        |
        v
POST /api/auth/login
        |
        v
Backend finds user
        |
        v
bcrypt password verification
        |
        v
Generate JWT
        |
        v
Frontend stores authentication state
        |
        v
JWT included in API requests
        |
        v
Express authentication middleware
        |
        v
RBAC middleware
        |
        v
Controller
```

Never trust the frontend role alone.

---

# 14. Docker Target Architecture

The final deployment should use a single container.

Recommended approach:

```text
Docker Build Stage
        |
        +--> build React application
        |
        v
Production Stage
        |
        +--> Express backend
        |
        +--> React static production build
```

Express should serve:

```text
/api/*
```

and also the built React frontend.

Target:

```text
Browser
   |
   v
Container :8080
   |
   +--> React
   |
   +--> Express API
             |
             v
          BigQuery
```

The application MUST support:

```js
const PORT = process.env.PORT || 8080;
```

This is required for Cloud Run compatibility.

---

# 15. Google Cloud Target

Target GCP project:

```text
id-fpoc-0608-data-posindo
```

Target deployment:

```text
Source Code
    |
    v
Docker Build
    |
    v
Container Image
    |
    v
Artifact Registry
    |
    v
Cloud Run
    |
    v
BigQuery
```

Cloud Run must deploy from a container image.

Do not deploy the project as a non-containerized application.

---

# 16. DEVELOPMENT PHASES

---

# PHASE 0 — Repository Initialization

## Objective

Prepare the base project repository only.

## Tasks

Create:

```text
client/
server/
scripts/
.gitignore
.env.example
README.md
```

Create a root `package.json` only if needed to simplify development scripts.

Recommended root scripts may eventually include:

```json
{
  "scripts": {
    "dev:client": "...",
    "dev:server": "...",
    "build": "..."
  }
}
```

Do not implement React or Express functionality yet.

## Acceptance Criteria

- Repository structure exists.
- `.gitignore` exists.
- `.env.example` exists.
- README has a short project description.
- No application feature has been implemented.

## STOP CONDITION

After finishing Phase 0:

**STOP. Do not start Phase 1.**

---

# PHASE 1 — Create React Frontend Foundation

## Objective

Create only the React frontend foundation.

## Tasks

Inside:

```text
client/
```

Create a React application using:

```text
Vite
React
```

Install/configure:

```text
Tailwind CSS
React Router
Lucide React
```

If shadcn/ui installation is straightforward for the current setup, initialize it.

Do not implement backend integration yet.

## Create Initial Routes

Create placeholder routes:

```text
/login
/dashboard
/transactions
/analytics
/users
/audit-logs
```

## Create Base UI

Implement:

- sidebar
- header
- main content area
- responsive layout

Create placeholder page content.

Example:

```text
Dashboard
Sales dashboard content will appear here.
```

## Routing

Use React Router.

Navigation should work between pages.

For this phase only, authentication is NOT required.

## Validation

Run:

```bash
npm install
npm run dev
```

and:

```bash
npm run build
```

Fix all build errors.

## Acceptance Criteria

- React starts locally.
- All placeholder pages work.
- Sidebar navigation works.
- UI looks clean and organized.
- Production build succeeds.
- No Express code is implemented.

## STOP CONDITION

After finishing Phase 1:

**STOP. Do not start Phase 2.**

---

# PHASE 2 — Improve Frontend Dashboard Mockup

## Objective

Build a polished static frontend mockup before backend integration.

## Tasks

Create reusable components such as:

```text
StatCard
PageHeader
DataTable
LoadingState
EmptyState
RoleBadge
```

Build mock UI for:

### Dashboard

Cards:

```text
Total Revenue
Total Orders
Average Order Value
Top Product
```

Add a mock Revenue Trend chart.

### Transactions

Create a mock sales table.

### Analytics

Create mock charts using Recharts:

```text
Revenue Trend
Revenue by Product
Revenue by Region
Top Products
```

### Users

Create mock user table.

### Audit Logs

Create mock activity table.

Use static mock data only.

Do not create API calls yet.

## Acceptance Criteria

- All pages visually work.
- Charts render correctly.
- Tables render correctly.
- Responsive layout is acceptable.
- Frontend build succeeds.
- Data still comes from static mock files.

## STOP CONDITION

After finishing Phase 2:

**STOP. Do not start Phase 3.**

---

# PHASE 3 — Create Express Backend Foundation

## Objective

Create an independent Express backend.

## Tasks

Inside:

```text
server/
```

Initialize Node.js project.

Install:

```text
express
cors
dotenv
helmet
```

Optional:

```text
morgan
```

Create:

```text
server/
├── config/
├── controllers/
├── middleware/
├── routes/
├── services/
├── utils/
├── app.js
└── index.js
```

Create:

```text
GET /api/health
```

Expected result:

```json
{
  "status": "ok",
  "service": "sales-insight-dashboard"
}
```

Use:

```js
process.env.PORT || 8080
```

Do not connect to BigQuery yet.

Do not implement authentication yet.

## Validation

Run backend locally.

Verify:

```text
GET http://localhost:<PORT>/api/health
```

## Acceptance Criteria

- Express starts successfully.
- Health endpoint works.
- Basic error handling exists.
- Server structure is clean.
- No database integration yet.

## STOP CONDITION

After finishing Phase 3:

**STOP. Do not start Phase 4.**

---

# PHASE 4 — BigQuery Setup Scripts and Connection

## Objective

Prepare BigQuery connectivity.

## Tasks

Install:

```text
@google-cloud/bigquery
```

Create BigQuery service configuration.

Do not create authentication features yet.

Add environment variables:

```env
GOOGLE_CLOUD_PROJECT=
BIGQUERY_DATASET=sales_dashboard
```

Create scripts or SQL documentation for creating:

```text
sales_dashboard.users
sales_dashboard.sales
sales_dashboard.audit_logs
```

Prefer SQL files under:

```text
scripts/bigquery/
```

Example:

```text
scripts/bigquery/create_dataset.sql
scripts/bigquery/create_users.sql
scripts/bigquery/create_sales.sql
scripts/bigquery/create_audit_logs.sql
```

Create a simple test endpoint if needed:

```text
GET /api/debug/bigquery
```

It should only confirm that a BigQuery query can execute.

Do not expose credentials.

## Validation

Test using Application Default Credentials.

Suggested local setup:

```bash
gcloud auth application-default login
```

Then start Express and confirm a simple query succeeds.

## Acceptance Criteria

- Backend connects to BigQuery.
- Dataset/table creation SQL exists.
- BigQuery service is reusable.
- Credentials are not committed.
- Health endpoint still works.

## STOP CONDITION

After finishing Phase 4:

**STOP. Do not start Phase 5.**

---

# PHASE 5 — BigQuery Seed Data

## Objective

Populate development data.

## Tasks

Create seed scripts for:

```text
users
sales
```

Generate approximately:

```text
500–1000 sales records
```

Use realistic sample values.

Example products:

```text
Google Workspace
Cloud Migration
Managed Service
Data Analytics
Security Assessment
App Modernization
```

Example regions:

```text
Jakarta
Bandung
Surabaya
Medan
Bali
```

Create three initial users:

```text
Admin
Analyst
Viewer
```

Passwords MUST be hashed using bcrypt.

Never store raw passwords in repository files.

Provide development credentials through documentation only if necessary and clearly mark them as local/demo credentials.

## Acceptance Criteria

- BigQuery contains demo users.
- BigQuery contains sufficient sales records.
- Password hashes exist.
- Seed scripts can be rerun safely or provide clear reset instructions.

## STOP CONDITION

After finishing Phase 5:

**STOP. Do not start Phase 6.**

---

# PHASE 6 — Backend Authentication

## Objective

Implement JWT authentication.

## Dependencies

Install:

```text
jsonwebtoken
bcrypt
```

## Implement

```text
POST /api/auth/login
GET /api/auth/me
```

Login flow:

1. validate email/password
2. query user from BigQuery
3. verify status is active
4. verify password using bcrypt
5. generate JWT
6. return safe user data

Suggested JWT payload:

```json
{
  "userId": "USR001",
  "email": "admin@example.com",
  "role": "admin"
}
```

Create authentication middleware:

```text
authenticateToken
```

Do not implement role authorization yet except what is required for `/me`.

## Security Rules

Never:

- return password_hash,
- log raw passwords,
- commit JWT secrets.

## Acceptance Criteria

- Valid login works.
- Invalid password fails.
- Unknown user fails.
- Inactive user fails.
- JWT is generated.
- `/api/auth/me` requires authentication.

## STOP CONDITION

After finishing Phase 6:

**STOP. Do not start Phase 7.**

---

# PHASE 7 — Backend RBAC

## Objective

Implement reusable Role-Based Access Control.

## Create Middleware

Example:

```text
authorizeRoles(...)
```

Possible usage:

```js
router.get(
  "/users",
  authenticateToken,
  authorizeRoles("admin"),
  controller
);
```

Define permissions clearly.

At minimum implement guards for:

```text
Admin:
- users
- role management
- delete sales
- audit logs

Analyst:
- create sales
- analytics

Viewer:
- read-only dashboard
- read-only analytics
- read-only sales
```

Do not implement every business endpoint unless necessary for testing RBAC.

Create minimal test/protected endpoints if useful.

## Acceptance Criteria

- Admin-only route rejects Analyst.
- Admin-only route rejects Viewer.
- Authenticated Admin succeeds.
- Missing JWT returns unauthorized.
- Invalid JWT returns unauthorized.

## STOP CONDITION

After finishing Phase 7:

**STOP. Do not start Phase 8.**

---

# PHASE 8 — Sales Backend API

## Objective

Implement sales API connected to BigQuery.

## Implement

```text
GET /api/sales
POST /api/sales
DELETE /api/sales/:id
```

Permissions:

```text
GET
admin, analyst, viewer

POST
admin, analyst

DELETE
admin
```

Add input validation.

When a transaction is created or deleted, insert an audit record.

Do not implement frontend API integration yet.

## Acceptance Criteria

- Sales can be listed.
- Admin/Analyst can create.
- Viewer cannot create.
- Admin can delete.
- Analyst cannot delete.
- Viewer cannot delete.
- Audit record is created for mutations.

## STOP CONDITION

After finishing Phase 8:

**STOP. Do not start Phase 9.**

---

# PHASE 9 — Dashboard and Analytics Backend API

## Objective

Create BigQuery aggregation endpoints.

## Implement

```text
GET /api/dashboard/summary
GET /api/dashboard/revenue-trend

GET /api/analytics/products
GET /api/analytics/regions
GET /api/analytics/top-products
```

Suggested dashboard summary:

```json
{
  "totalRevenue": 125000000,
  "totalOrders": 1240,
  "averageOrderValue": 100806,
  "topProduct": "Google Workspace"
}
```

All three roles may access these endpoints.

Use BigQuery aggregations rather than fetching all rows and aggregating in Node.js.

## Acceptance Criteria

- Summary metrics are generated from BigQuery.
- Revenue trend returns chart-friendly data.
- Product aggregation works.
- Region aggregation works.
- Top products works.

## STOP CONDITION

After finishing Phase 9:

**STOP. Do not start Phase 10.**

---

# PHASE 10 — User Management and Audit API

## Objective

Implement Admin-only management endpoints.

## Implement

```text
GET /api/users

PATCH /api/users/:id/role

GET /api/audit-logs
```

All endpoints are Admin-only.

Role update must only accept:

```text
admin
analyst
viewer
```

Record role changes in:

```text
audit_logs
```

Never return password hashes.

## Acceptance Criteria

- Admin can list users.
- Analyst cannot list users.
- Viewer cannot list users.
- Admin can update role.
- Invalid role is rejected.
- Audit logs record role changes.
- Admin can view audit logs.

## STOP CONDITION

After finishing Phase 10:

**STOP. Do not start Phase 11.**

---

# PHASE 11 — Frontend Authentication Integration

## Objective

Connect React login flow to Express.

## Implement

Frontend:

```text
AuthContext
login()
logout()
current user
JWT storage
protected routes
```

Use a simple approach suitable for this PoC.

Create an API service layer.

Example:

```text
client/src/services/api.js
```

Add Authorization header:

```text
Authorization: Bearer <token>
```

Implement protected routes.

Unauthenticated user should be redirected to:

```text
/login
```

Do not integrate all dashboard APIs yet.

## Acceptance Criteria

- Login communicates with backend.
- Correct credentials log in.
- Invalid credentials display an error.
- Authenticated user can enter protected pages.
- Logout works.
- Reload preserves authentication if appropriate.
- `/api/auth/me` validates session.

## STOP CONDITION

After finishing Phase 11:

**STOP. Do not start Phase 12.**

---

# PHASE 12 — Frontend RBAC

## Objective

Apply user permissions to navigation and UI.

## Requirements

Viewer:

```text
Dashboard
Transactions
Analytics
```

Analyst:

```text
Dashboard
Transactions
Analytics
```

Analyst also sees Create Transaction actions.

Admin:

```text
Dashboard
Transactions
Analytics
Users
Audit Logs
```

Create helper utilities such as:

```text
hasRole()
can()
```

Hide inaccessible navigation items.

Still rely on backend authorization for security.

Add a clear role badge in the interface.

## Acceptance Criteria

- Viewer cannot see admin navigation.
- Analyst cannot see admin navigation.
- Admin sees user/audit navigation.
- Viewer does not see create/delete actions.
- Analyst sees create but not delete.
- Admin sees all required actions.

## STOP CONDITION

After finishing Phase 12:

**STOP. Do not start Phase 13.**

---

# PHASE 13 — Replace Mock Data with Real API Data

## Objective

Connect frontend dashboard to backend APIs.

## Replace Static Data

Integrate:

```text
Dashboard
Transactions
Analytics
Users
Audit Logs
```

Use API services.

Add:

- loading states
- empty states
- error states
- refresh after mutation

Transactions:

- list from BigQuery
- create transaction form/modal
- delete confirmation for Admin

Users:

- role update control for Admin

## Acceptance Criteria

- No core page depends on mock data anymore.
- Dashboard loads BigQuery metrics.
- Charts use real API data.
- Transactions use real API data.
- User Management works.
- Audit Logs works.
- RBAC still works.

## STOP CONDITION

After finishing Phase 13:

**STOP. Do not start Phase 14.**

---

# PHASE 14 — Integration Cleanup and Production Build

## Objective

Prepare the application before Docker.

## Tasks

Review:

```text
frontend
backend
API paths
error handling
environment variables
CORS
security headers
```

Create production-compatible setup.

Build React:

```bash
npm run build
```

Configure Express to serve the React production build.

Expected final architecture:

```text
Express
 |
 +-- /api/*
 |
 +-- React dist/*
```

Configure SPA fallback so direct routes such as:

```text
/dashboard
/analytics
```

work correctly.

Do not create Dockerfile yet.

## Acceptance Criteria

- Backend serves API.
- Backend serves built React frontend.
- Browser can load production app through Express.
- Direct React routes work after refresh.
- Production build succeeds.

## STOP CONDITION

After finishing Phase 14:

**STOP. Do not start Phase 15.**

---

# PHASE 15 — Dockerfile

## Objective

Containerize the application.

## Requirements

Use a multi-stage Docker build.

Suggested concept:

```text
Stage 1
Build React frontend

Stage 2
Install production backend dependencies
Copy frontend build
Run Express
```

Create:

```text
Dockerfile
.dockerignore
```

The container must listen on:

```text
process.env.PORT || 8080
```

Do not put credentials inside the image.

## Recommended Validation

Build:

```bash
docker build -t sales-insight-dashboard .
```

Do not deploy to Cloud Run yet.

## Acceptance Criteria

- Docker image builds successfully.
- Image contains production app.
- Secrets are excluded.
- `.dockerignore` excludes unnecessary files.

## STOP CONDITION

After finishing Phase 15:

**STOP. Do not start Phase 16.**

---

# PHASE 16 — Local Docker Deployment

## Objective

Validate the final container locally.

## Run

Example:

```bash
docker run \
  --rm \
  -p 8080:8080 \
  -e PORT=8080 \
  -e JWT_SECRET=<local-secret> \
  -e GOOGLE_CLOUD_PROJECT=id-fpoc-0608-data-posindo \
  -e BIGQUERY_DATASET=sales_dashboard \
  sales-insight-dashboard
```

Authentication configuration for local BigQuery access must be handled securely.

Do not embed credentials inside the container.

If mounting local Application Default Credentials is required for the local Docker test, document the secure method clearly.

## Test

Verify:

```text
/
```

and:

```text
/api/health
```

Then test:

- login
- dashboard
- transactions
- analytics
- user management
- RBAC

## Acceptance Criteria

- Container starts successfully.
- App loads at localhost:8080.
- API works inside container.
- BigQuery connectivity works.
- Authentication works.
- RBAC works.

## STOP CONDITION

After finishing Phase 16:

**STOP. Do not start Phase 17.**

---

# PHASE 17 — GCP Deployment Preparation

## Objective

Prepare required Google Cloud resources without deploying the application yet.

Target project:

```text
id-fpoc-0608-data-posindo
```

## Review / Prepare

Potential services:

```text
Cloud Run
Artifact Registry
BigQuery
IAM
Cloud Build if required
```

Verify project:

```bash
gcloud config set project id-fpoc-0608-data-posindo
```

Enable only required APIs.

Create or identify an Artifact Registry repository.

Plan the runtime service account.

The Cloud Run service account should have only the BigQuery permissions required by the application.

Avoid using broad roles if a more specific role is sufficient.

## Deliverable

Codex should produce:

- commands required,
- explanation for each resource,
- IAM requirements,
- expected container image path.

Do not deploy Cloud Run yet.

## Acceptance Criteria

- GCP project is correctly selected.
- Required APIs are identified/enabled.
- Artifact Registry is ready.
- Cloud Run runtime service account strategy is defined.
- No deployment performed yet.

## STOP CONDITION

After finishing Phase 17:

**STOP. Do not start Phase 18.**

---

# PHASE 18 — Build and Push Container Image

## Objective

Push the tested Docker image to Google Artifact Registry.

## Workflow

```text
Dockerfile
   |
   v
Container Image
   |
   v
Artifact Registry
```

Use the previously configured GCP project:

```text
id-fpoc-0608-data-posindo
```

Tag the image properly.

Example pattern:

```text
REGION-docker.pkg.dev/PROJECT_ID/REPOSITORY/sales-insight-dashboard:TAG
```

Do not deploy Cloud Run yet.

## Acceptance Criteria

- Container builds successfully.
- Image is pushed to Artifact Registry.
- Image is visible in GCP.
- Exact deployed image URI is documented.

## STOP CONDITION

After finishing Phase 18:

**STOP. Do not start Phase 19.**

---

# PHASE 19 — Deploy Container to Cloud Run

## Objective

Deploy the application container to Google Cloud Run.

## Requirement

Deployment MUST use the container image from Artifact Registry.

Target:

```text
Cloud Run
```

Project:

```text
id-fpoc-0608-data-posindo
```

Configure:

```text
PORT
JWT_SECRET
GOOGLE_CLOUD_PROJECT
BIGQUERY_DATASET
```

Use Secret Manager for sensitive production secrets if available and appropriate.

Assign the correct Cloud Run service account.

Ensure the service account can execute required BigQuery queries.

Do not use a service-account JSON file inside the container.

## Validate

Check:

```text
Cloud Run URL
/api/health
/login
/dashboard
```

Verify BigQuery integration.

## Acceptance Criteria

- Cloud Run revision becomes healthy.
- Container starts successfully.
- Public/private access matches the intended PoC configuration.
- React application loads.
- Express API works.
- BigQuery queries succeed.
- Login works.
- RBAC works.

## STOP CONDITION

After finishing Phase 19:

**STOP. Do not automatically proceed to optimization.**

---

# PHASE 20 — Final Verification and Documentation

## Objective

Perform final project verification.

## Verify Roles

### Viewer

Can:

```text
view dashboard
view transactions
view analytics
```

Cannot:

```text
create sales
delete sales
manage users
view audit logs
```

### Analyst

Can:

```text
view dashboard
view transactions
create sales
view analytics
```

Cannot:

```text
delete sales
manage users
view audit logs
```

### Admin

Can:

```text
view dashboard
view analytics
view sales
create sales
delete sales
manage users
change roles
view audit logs
```

## Verify Deployment

Confirm:

```text
React -> OK
Express -> OK
JWT -> OK
RBAC -> OK
BigQuery -> OK
Docker -> OK
Artifact Registry -> OK
Cloud Run -> OK
```

## README

Finalize README with:

```text
Project overview
Architecture
Tech stack
Local frontend setup
Local backend setup
BigQuery setup
Environment variables
Docker build
Docker run
GCP deployment
RBAC roles
API summary
Screenshots if desired
```

## Final Deliverable

Provide a concise technical summary of:

- architecture,
- implementation,
- RBAC,
- BigQuery integration,
- Docker,
- Cloud Run deployment,
- known limitations.

---

# 17. General Coding Rules

Throughout all phases:

## Keep It Simple

Prefer:

```text
simple
readable
maintainable
demonstrable
```

Avoid unnecessary:

```text
microservices
event buses
complex state management
Redis
GraphQL
Kubernetes
Terraform
CI/CD
advanced caching
```

unless explicitly requested later.

---

# 18. Code Quality

Use:

- clear naming,
- small functions,
- reusable services,
- centralized error handling where practical,
- async/await,
- meaningful HTTP status codes.

Avoid:

- giant files,
- duplicated queries,
- hardcoded secrets,
- deeply nested logic.

---

# 19. Error Handling

Backend should return predictable JSON.

Example:

```json
{
  "success": false,
  "message": "Unauthorized"
}
```

Frontend should display understandable messages.

Do not expose internal stack traces to users.

---

# 20. HTTP Status Guidelines

Use appropriate status codes:

```text
200 OK
201 Created
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
500 Internal Server Error
```

---

# 21. Security Basics

Even though this is a PoC:

- hash passwords,
- validate JWT,
- enforce RBAC server-side,
- use environment variables,
- do not commit secrets,
- do not commit credentials,
- do not expose password hashes,
- use Helmet,
- validate inputs,
- use parameterized BigQuery query parameters where applicable.

---

# 22. BigQuery Notes

BigQuery is being used because it is an explicit project requirement.

For a real production system:

```text
authentication / transactional data
```

would normally be better suited to a transactional database such as PostgreSQL.

BigQuery is particularly useful here for:

```text
sales analytics
aggregations
reporting
dashboard queries
```

Do not redesign the architecture unless explicitly requested.

---

# 23. Definition of Done for Every Phase

Before declaring a phase complete, Codex MUST:

1. Ensure the requested phase requirements are implemented.
2. Run relevant lint/build/start/test commands.
3. Fix obvious errors.
4. Avoid implementing future phases.
5. Report modified files.
6. Report validation result.
7. State the recommended next phase.
8. STOP.

---

# 24. Required Codex Completion Format

At the end of every phase, respond using this structure:

```markdown
## Phase Completed

Phase:
<phase number and name>

## Implemented

- ...
- ...
- ...

## Files Created

- ...

## Files Modified

- ...

## Validation Performed

```bash
<commands>
```

Result:

- PASS / FAIL
- explanation

## Notes

- ...

## Next Recommended Step

Phase X — <name>

I have not started the next phase.
```

---

# 25. Example Instruction to Start

To begin the project, the developer will tell Codex:

```text
Read CODEX_BUILD_PLAN.md carefully.

Start PHASE 0 only.

Follow all scope restrictions, acceptance criteria, validation steps, and STOP conditions.

Do not begin Phase 1.
```

After Phase 0 is reviewed, the developer may say:

```text
Continue to PHASE 1 only.

Do not work on any later phase.
```

And continue in the same way until the project is complete.

---

# 26. Final Architecture Target

```text
                           USER
                            |
                            v
                    +----------------+
                    |   Cloud Run    |
                    |   Container    |
                    +-------+--------+
                            |
             +--------------+--------------+
             |                             |
             v                             v
      React Static Build              Express API
                                           |
                                 +---------+---------+
                                 |                   |
                                 v                   v
                           JWT Authentication      RBAC
                                 |                   |
                                 +---------+---------+
                                           |
                                           v
                                      BigQuery
                                           |
                           +---------------+---------------+
                           |               |               |
                           v               v               v
                         users            sales         audit_logs
```

---

# 27. Final Success Criteria

The project is complete when:

```text
[ ] React frontend works
[ ] Express backend works
[ ] BigQuery is connected
[ ] Demo data exists
[ ] Login works
[ ] JWT authentication works
[ ] RBAC works
[ ] Dashboard uses BigQuery data
[ ] Transactions use BigQuery data
[ ] Analytics uses BigQuery data
[ ] User Management works for Admin
[ ] Audit Logs work for Admin
[ ] React production build works
[ ] Express serves React build
[ ] Docker image builds
[ ] Docker container works locally
[ ] Image is stored in Artifact Registry
[ ] Cloud Run uses the container image
[ ] Cloud Run can access BigQuery
[ ] Application works through Cloud Run URL
[ ] README documents the complete process
```

---

# END OF BUILD PLAN

Always implement **one phase only** unless the developer explicitly requests otherwise.
