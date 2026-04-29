# Frontend foundation plan

## Goal and scope
Build `apps/web/**` React + Vite + TypeScript foundation and PRD UI skeleton only, matching requirement sections 11-13, 16.3, 17, and 19. Add typed API layer, dense operations-console UI, loading/error/empty states, required routes/components/tests, Dockerfile, and work report. No edits outside `apps/web/**` plus required report/plan artifacts.

## Relevant files and references
- `.agents/memory/INIT_PROJ_REQUIREMENTS.md` sections 11-13, 16.3, 17, 19
- `.agents/workflows/main-execution.md`
- New `apps/web/**`
- New report `.agents/memory/work-report/2026-04-29-frontend-report/frontend.md`

## Task groups
1. Scaffold Vite/TS app config and test harness.
2. Define domain types and resilient API client with mock-safe fallbacks.
3. Build route screens and shared UI components.
4. Add focused tests for required behaviors.
5. Install deps, run tests/build, write report.

## TODO checklist
- [ ] Create app config files (`package.json`, `vite.config.ts`, `tsconfig*.json`, `index.html`, Dockerfile, test setup)
- [ ] Implement typed domain model and API layer with graceful absent-API handling
- [ ] Implement routes `/`, `/projects/:id`, `/claims`
- [ ] Implement required components and shared styles
- [ ] Add required Vitest/Testing Library tests
- [ ] Run `npm install`, `npm test`, `npm run build` if possible
- [ ] Write work report with summary, decisions, tests, risks, branch, hashes, handoff

## Parallel-safe tasks
- Config scaffolding and UI component implementation separable after type shape set
- Tests can be added after route/component shape stabilizes

## Dependencies and merge/conflict risks
- No existing `apps/web` tree detected; low direct conflict risk
- Must keep edits inside `apps/web/**` only
- Backend/API may be absent; UI must degrade gracefully without assuming server availability
