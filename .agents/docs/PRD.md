# SolarOps Truth Layer PRD + Execution Plan

  ## Summary

  Populate .agents/docs/PRD.md from .agents/memory/INIT_PROJ_REQUIREMENTS.md as the canonical product and execution spec for a greenfield full-stack demo app.

  Current repo state:

  - Source graph has 0 files indexed.
  - .agents/docs/PRD.md is empty.
  - .agents/docs/PROJECT_STRUCTURE.md is empty.
  - Requirements source is .agents/memory/INIT_PROJ_REQUIREMENTS.md.

  Implementation goal:

  - Build SolarOps Truth Layer: React/Vite frontend, Rust/Axum API, Python/FastAPI AI service, PostgreSQL, Docker Compose, deterministic seed data, tests, README, and docs.
  - Evidence-first AI rule is core: no claim may be verified unless linked evidence supports it.

  ## Key PRD Content To Add

  - Product scope: portfolio dashboard, project list/detail, milestone timeline, asset table, evidence ledger, claim ledger, blocker tracking, activity log, AI assistant.
  - Out of scope: auth, real customer data, real integrations, file storage, OCR, GIS, production hardening.
  - Services:
      - web: React 19 + TypeScript + Vite + Tailwind + shadcn/ui on 5173
      - api-rust: Rust + Axum + SQLx on 8080
      - ai-service: Python + FastAPI + Pydantic on 8001
      - db: PostgreSQL 16 on 5432
  - Request flow: UI -> Rust API -> Postgres -> Python AI -> Rust validation -> Postgres claims/runs -> UI.
  - Domain model: organizations, sites, projects, milestones, assets, evidence, claims, claim/evidence links, blockers, activity events, AI runs.
  - Required enums and deterministic rules for project health, claim status, financing readiness, rebate secured, installation readiness, savings realized, and data conflict.
  - Seed data: five deterministic demo projects A-E with expected blocker/evidence/claim behavior.
  - API contract:
      - GET /health
      - GET /portfolio/health
      - GET /projects
      - GET /projects/{project_id}
      - PATCH /projects/{project_id}/stage
      - POST /projects/{project_id}/evidence
      - GET /projects/{project_id}/claims
      - POST /projects/{project_id}/claims/{claim_id}/reverify
      - GET /projects/{project_id}/blockers
      - PATCH /blockers/{blocker_id}
      - POST /projects/{project_id}/ai/ask
  - AI contract:
      - GET /health
      - POST /ask
      - AI_PROVIDER=mock default
      - AI_PROVIDER=gemini optional
      - Pydantic schema must validate all AI output.
  - Frontend routes:
      - /
      - /projects/:id
      - /claims

  ## Execution Plan

  1. Foundation
      - Create repo structure under apps/web, apps/api-rust, apps/ai-service, docs.
      - Add Docker Compose, .env.example, Makefile, README skeleton.
      - Add Postgres migrations for schema and seed data.
      - Add Rust API skeleton with /health.
      - Add Python AI service skeleton with /health.
      - Add React app skeleton calling Rust health endpoint.
      - Verify: all services start; frontend can reach Rust health endpoint.
  2. Core Project Operations
      - Implement Rust database models, query layer, and project health computation.
      - Implement portfolio health, project list, and project detail endpoints.
      - Build dashboard with KPI cards, filters, project table, and risk panel.
      - Build project detail shell with header, financial summary, milestones, assets, blockers.
      - Verify: user can browse seeded projects and inspect project state.
  3. Evidence + Claim Layer
      - Implement evidence create endpoint.
      - Implement deterministic claim verification in Rust domain modules.
      - Implement claim list and claim reverify endpoints.
      - Implement blocker update endpoint and activity event writes.
      - Build evidence table, claim ledger, blocker actions, activity log.
      - Verify: adding rebate_award_letter changes Project A rebate claim from missing_evidence to verified.
  4. AI Assistant
      - Implement Python mock AI intent routing:
          - financing readiness
          - blockers
          - recent activity
          - installation readiness
          - project summary
      - Implement Rust AI client/proxy.
      - Validate AI responses in Rust.
      - Downgrade unsafe verified claims without evidence IDs.
      - Persist ai_runs and returned claims.
      - Build AI assistant UI with answer, claims, evidence links, missing evidence, next actions.
      - Verify workflows A-E from requirements.
  5. Polish, Docs, Tests
      - Add Rust unit/integration tests for required domain and endpoint cases.
      - Add Python tests for mock AI and schema rules.
      - Add frontend tests for KPI rendering, badges, missing evidence, and filtering.
      - Add README with architecture diagram, setup, migrations, demo workflows, API overview, test commands, known limits.
      - Add docs:
          - docs/architecture.md
          - docs/domain-model.md
          - docs/api-contracts.md
          - docs/ai-contract.md
      - Optional: add CI workflow and Playwright E2E.
      - Verify: docker compose up, Rust tests, Python tests, frontend build.

  ## Public Interfaces / Types

  - Rust API errors use:

    {
      "error": {
        "code": "PROJECT_NOT_FOUND",
        "message": "Project not found.",
        "details": {}
  - Frontend domain types mirror backend enums:
      - ProjectStage
      - ProjectHealth
      - ClaimStatus
      - milestone type/status
      - asset type/status
  - AI response shape includes:
      - answer_markdown
      - overall_confidence
      - structured claims
      - recommended_next_actions

  - Python:
      - mock financing answer marks missing rebate evidence
      - verified claim requires evidence IDs
      - estimated savings not treated as realized savings
      - high blocker prevents readiness approval
      - response matches Pydantic schema
      - project filtering by health works
  - Acceptance workflows:
      - blocked project inspection
      - Project A financing readiness before/after rebate award evidence
      - Project E unknown project evaluation

  ## Assumptions

  - AI_PROVIDER=mock is default and required for deterministic demo/test behavior.
  - Gemini integration stays optional behind env var.
  - No auth or real external integrations in v1.
  - Implementation should use the required repo structure from requirements.
  - .agents/docs/PROJECT_STRUCTURE.md should be filled after or alongside scaffold creation.

  ## Execution Tracking

  Active ticket ledger: `.agents/docs/TICKET_LEDGER.md`.

  Active implementation plan: `.agents/docs/plans/2026-04-29-solarops-truth-layer.md`.

  ## Implementation Status

  - T1 foundation is implemented.
  - T2 core project operations are implemented.
  - T3 evidence, claims, blockers, and activity layer is implemented.
  - T4 AI assistant is implemented.
  - T5 final polish, validation, and review is in progress.
