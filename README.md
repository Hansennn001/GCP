# Sales Insight Dashboard

A proof-of-concept sales analytics dashboard planned with React, Express,
JWT authentication, role-based access control, and Google BigQuery. Later
phases will package the application with Docker and deploy it to Cloud Run.

## Current status

Phase 0 — Repository Initialization is complete. This repository contains
the base structure only; application code and development commands will be
added in later phases.

## Repository structure

```text
client/       Future React frontend
server/       Future Express backend
scripts/      Future setup and data scripts
.env.example  Placeholder environment configuration
.gitignore    Local files and generated output to exclude from Git
```

The empty directories contain `.gitkeep` files so Git can preserve them.
The implementation plan is in
[CODEX_BUILD_PLAN_SALES_INSIGHT_DASHBOARD.md](CODEX_BUILD_PLAN_SALES_INSIGHT_DASHBOARD.md).
Work proceeds one phase at a time, with an explicit instruction required to
begin the next phase.

## Environment configuration

`.env.example` documents the planned variables using placeholder values.
Keep real secrets, passwords, and Google Cloud credentials out of the
repository. Prefer Application Default Credentials for local Google Cloud
authentication when BigQuery integration is implemented.
