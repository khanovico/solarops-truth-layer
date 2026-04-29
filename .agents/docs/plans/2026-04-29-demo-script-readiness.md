# Demo Script Readiness Plan

## Goal

Make the demo narrative true end-to-end:

- Adding `rebate_award_letter` automatically resolves the Prairie Mart missing-document blocker.
- Adding `rebate_award_letter` automatically completes the rebate award milestone.
- The financing AI answer explicitly separates the verified PPA term-sheet claim from rebate readiness.
- AI next actions reflect what is still missing after evidence is uploaded.
- Frontend fallback data no longer contradicts the Prairie Mart script when the Rust API is unavailable.

## Scope

- Rust API evidence workflow and tests under `apps/api-rust`.
- Python mock AI service and tests under `apps/ai-service`.
- Frontend fallback seed data under `apps/web/src/lib/mockData.ts`.

Out of scope: new product screens, auth, real file uploads, non-demo integrations.

## Relevant Files

- `apps/api-rust/src/db/queries.rs`
- `apps/api-rust/src/domain/claim_verification.rs`
- `apps/api-rust/migrations/002_seed.sql`
- `apps/ai-service/app/mock_model.py`
- `apps/ai-service/tests/test_ai_service.py`
- `apps/web/src/lib/mockData.ts`
- `README.md`, `docs/*` only if wording becomes stale

## Ordered Tasks

1. Rust evidence automation
   - On `rebate_award_letter` evidence creation, resolve matching open `missing_document` blocker(s).
   - Complete `rebate_award_received` milestone for the project.
   - Keep claim reverification and project health recompute correct after these state changes.
   - Add targeted Rust tests if there is an existing test harness for these functions.

2. Python AI answer
   - Include a distinct verified PPA term-sheet claim in financing readiness answer when evidence exists.
   - Make recommended next actions conditional on missing evidence.
   - Add/update Python tests for before/after rebate award behavior.

3. Frontend fallback data
   - Align fallback Project Alpha with the live Prairie Mart story or rename it to Prairie Mart.
   - Make fallback evidence upload update claims/blockers consistently enough for offline demo.

4. Validation and review
   - Run targeted Rust, Python, and frontend validation.
   - Run code review and scalability review agents.
   - Address actionable findings.
   - Commit scoped changes.

## TODO Checklist

- [x] Spawn isolated workers for parallel-safe slices.
- [x] Integrate Rust evidence automation.
- [x] Integrate Python AI answer/action updates.
- [x] Integrate frontend fallback data alignment.
- [x] Run targeted validation.
- [x] Run review agents and address findings.
- [x] Commit scoped changes.

## Parallel-Safe Work

- Worker A owns `apps/api-rust/src/db/queries.rs` and any Rust tests it directly needs.
- Worker B owns `apps/ai-service/app/mock_model.py` and `apps/ai-service/tests/test_ai_service.py`.
- Worker C owns `apps/web/src/lib/mockData.ts`.

Main executor owns plan, integration, validation, review, and final commit. Avoid overlapping edits.

## Risks

- Existing live database may contain already-mutated demo state; tests should focus on code behavior rather than current local DB state.
- `apps/web/package-lock.json`, `apps/package-lock.json`, and `apps/ai-service/UNKNOWN.egg-info/` are unrelated dirty state and must not be included.
