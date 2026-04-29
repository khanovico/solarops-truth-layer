# SolarOps Truth Layer Implementation Plan

## Goal And Scope

Build the PRD-defined greenfield SolarOps Truth Layer demo:

- React/Vite TypeScript frontend on port 5173.
- Rust/Axum API on port 8080.
- Python/FastAPI AI service on port 8001.
- PostgreSQL 16 with deterministic seed data.
- Evidence-first claim validation, tests, docs, Docker Compose, and README.

Out of scope remains unchanged from the PRD: real auth, real integrations, file storage, OCR, GIS, production hardening, and real customer data.

## Assumptions

- `AI_PROVIDER=mock` is the default and must pass without external keys.
- The repo is greenfield; current source graph has 0 indexed source files.
- Backend stores and validates truth; AI service is advisory only.
- Project health and claim verification rules live outside route handlers.
- Root `AGENTS.md` says `.code/AGENTS.md` should exist, but it is absent; `.codex/AGENTS.md` was used as the rule lookup layer.

## Tickets

### T0: Planning And Ticket Ledger

Success:

- Branch created.
- Ticket ledger written.
- Implementation plan written.
- Commit created.

### T1: Foundation Stack

Success:

- Required folders exist under `apps/web`, `apps/api-rust`, `apps/ai-service`, and `docs`.
- Root `.env.example`, `docker-compose.yml`, `Makefile`, and README skeleton exist.
- PostgreSQL schema and deterministic seed data exist.
- Rust `/health` endpoint exists and does not require DB.
- Python `/health` endpoint exists.
- Frontend can render API health state.
- Targeted health tests pass.

### T2: Core Project Operations

Success:

- Rust returns portfolio health, project list with filters/sort, and project detail.
- Dashboard shows KPI values, filters, project table, and risk panel.
- Project detail page shows header, financials, milestones, assets, blockers, evidence, claims, activity.
- Tests cover seed project listing, filtering, KPI rendering, and health badges.

### T3: Evidence, Claims, Blockers, Activity

Success:

- Evidence creation validates enum, writes activity, recomputes health, and updates relevant claims.
- Deterministic claim verification covers rebate, financing, installation, savings, and data conflict rules.
- Claim list and reverify endpoints work.
- Blocker update endpoint resolves/dismisses blockers and records activity.
- UI supports evidence upload, claim ledger, blocker actions, activity log.

### T4: AI Assistant

Success:

- Python mock routes intents for financing, blockers, activity, installation, and summary.
- Pydantic schema rejects unsafe responses.
- Rust proxy validates AI response, downgrades verified claims with no evidence IDs, persists `ai_runs` and returned claims.
- UI assistant shows answer, claim breakdown, evidence links, missing evidence, and next actions.
- Workflows A-E pass through deterministic tests or manual checks.

### T5: Polish, Docs, Review

Success:

- README and `docs/*.md` cover setup, architecture, domain, API, AI contract, tests, and limitations.
- `.agents/docs/PROJECT_STRUCTURE.md` reflects final tree.
- CI workflow added if practical.
- Full relevant validation passes or documented environment-only bypass exists.
- Code-review and scalability reviewers report no unresolved required changes.

## Parallel Plan

Parallel-safe work:

- AI service can be implemented in `apps/ai-service/**` using the PRD request/response schema.
- Frontend can scaffold typed pages/components in `apps/web/**` against the PRD API contract.
- Main executor can implement root orchestration, SQL migrations, and Rust API in `apps/api-rust/**`.

Conflict risks:

- API response shape mismatches between Rust and frontend. Mitigation: keep TS types and Rust response structs aligned with PRD field names.
- Claim rule drift between Python mock and Rust deterministic validator. Mitigation: Rust remains authority; Python can suggest but Rust downgrades unsafe output.
- Root docs conflicts. Mitigation: main executor owns docs/root files.

## Frontend Direction

Visual thesis: dense operations console with bright daylight surfaces, crisp evidence/status color, and low-chrome enterprise rhythm.

Content plan:

- Dashboard first: KPIs, filters, project table, risk panel.
- Project detail: operational status, blockers/evidence/claims, AI assistant.
- Claim ledger: portfolio-wide audit view.

Interaction thesis:

- Fast filter transitions with stable table layout.
- Clear hover/focus affordance on rows and actions.
- AI answer and claim rows reveal progressively after responses.

## Test Plan

- Rust: `cargo fmt --check`, `cargo test` in `apps/api-rust`.
- Python: `pytest` in `apps/ai-service`.
- Frontend: targeted Vitest/component tests, then `npm run build` in `apps/web`.
- Compose: `docker compose config`; run services if local dependencies allow.

## Progress Checklist

- [x] T0 planning docs created.
- [x] T0 committed (`d5c393c`).
- [ ] T1 implemented, tested, documented, committed.
- [ ] T2 implemented, tested, documented, committed.
- [ ] T3 implemented, tested, documented, committed.
- [ ] T4 implemented, tested, documented, committed.
- [ ] T5 validation/review/docs complete and committed.
