# SolarOps Truth Layer Ticket Ledger

Status values: `todo`, `in_progress`, `review`, `done`, `blocked`.

| Ticket | Status | Scope | Verification | Commit |
| --- | --- | --- | --- | --- |
| T0 | done | Project management plan, ticket ledger, branch setup | Plan reviewed against PRD and requirements | d5c393c |
| T1 | todo | Foundation stack: repo structure, root Docker/Make/env, database schema/seed, service health endpoints | Service health tests; compose config sanity; first docs update | pending |
| T2 | todo | Core project operations: Rust project queries, portfolio/list/detail endpoints, dashboard and detail browse UI | Rust endpoint tests; frontend component/query tests; build | pending |
| T3 | todo | Evidence, claim, blocker, and activity layer | Deterministic rule tests; endpoint tests; frontend ledger/action tests | pending |
| T4 | todo | AI assistant: Python mock AI, Rust proxy/validation/persistence, frontend assistant | Python AI tests; Rust AI endpoint tests; workflow A-E checks | pending |
| T5 | todo | Polish, docs, full validation, self-review, scalability review | Rust/Python/frontend tests; `npm run build`; reviewer findings resolved | pending |

## Batch Plan

- Batch 1: T1 plus isolated AI-service and frontend scaffolds in parallel.
- Batch 2: T2 and T3, with main executor owning Rust/database contracts and frontend work sequenced after API shapes stabilize.
- Batch 3: T4, then T5 full validation and review.

## Ownership Rules

- Main executor owns root files, docs, migrations, Rust API integration, final validation, commits, and merges.
- AI worker owns only `apps/ai-service/**`.
- Frontend worker owns only `apps/web/**`.
- Review agents are predefined fixed-role agents; no model override.
