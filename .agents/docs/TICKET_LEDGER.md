# SolarOps Truth Layer Ticket Ledger

Status values: `todo`, `in_progress`, `review`, `done`, `blocked`.

| Ticket | Status | Scope | Verification | Commit |
| --- | --- | --- | --- | --- |
| T0 | done | Project management plan, ticket ledger, branch setup | Plan reviewed against PRD and requirements | d5c393c |
| T1 | done | Foundation stack: repo structure, root Docker/Make/env, database schema/seed, service health endpoints | `docker compose config`; Rust health test; Python health test; frontend build | d647c36, 03c74d2 |
| T2 | done | Core project operations: Rust project queries, portfolio/list/detail endpoints, dashboard and detail browse UI | Rust domain/API compile tests; frontend component/query tests; build | d647c36, 03c74d2, 2c13200 |
| T3 | done | Evidence, claim, blocker, and activity layer | Rust deterministic claim tests; Python AI tests; frontend ledger/action tests | d647c36, 2c13200 |
| T4 | done | AI assistant: Python mock AI, Rust proxy/validation/persistence, frontend assistant | Python mock tests; Rust AI client compile; frontend AI missing-evidence test | d647c36, 03c74d2, 2c13200 |
| T5 | done | Polish, docs, full validation, self-review, scalability review | Rust fmt/test/clippy; Python tests; frontend tests/build/audit; `docker compose config`; reviewer findings resolved | 14c71c3, 18da86f |

## Batch Plan

- Batch 1: T1 plus isolated AI-service and frontend scaffolds in parallel.
- Batch 2: T2 and T3, with main executor owning Rust/database contracts and frontend work sequenced after API shapes stabilize.
- Batch 3: T4, then T5 full validation and review.

## Ownership Rules

- Main executor owns root files, docs, migrations, Rust API integration, final validation, commits, and merges.
- AI worker owns only `apps/ai-service/**`.
- Frontend worker owns only `apps/web/**`.
- Review agents are predefined fixed-role agents; no model override.
