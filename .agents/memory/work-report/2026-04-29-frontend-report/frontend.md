# Frontend foundation report

## Task summary
- Built `apps/web/**` React + Vite + TypeScript frontend foundation for the SolarOps truth-layer console.
- Added dense operations-console UI skeleton for routes `/`, `/projects/:id`, and `/claims`.
- Added typed API client, PRD-aligned domain types, seeded fallback data, loading/error/empty states, and required Vitest coverage.

## Files changed
- `apps/web/package.json`
- `apps/web/package-lock.json`
- `apps/web/vite.config.ts`
- `apps/web/tsconfig.json`
- `apps/web/tsconfig.app.json`
- `apps/web/tsconfig.node.json`
- `apps/web/index.html`
- `apps/web/Dockerfile`
- `apps/web/src/App.tsx`
- `apps/web/src/main.tsx`
- `apps/web/src/styles.css`
- `apps/web/src/vite-env.d.ts`
- `apps/web/src/lib/api.ts`
- `apps/web/src/lib/api-context.tsx`
- `apps/web/src/lib/format.ts`
- `apps/web/src/lib/mockData.ts`
- `apps/web/src/lib/types.ts`
- `apps/web/src/routes/Dashboard.tsx`
- `apps/web/src/routes/ProjectDetail.tsx`
- `apps/web/src/routes/ClaimLedger.tsx`
- `apps/web/src/components/ProjectHealthCard.tsx`
- `apps/web/src/components/ProjectStageBadge.tsx`
- `apps/web/src/components/ClaimStatusBadge.tsx`
- `apps/web/src/components/EvidenceTable.tsx`
- `apps/web/src/components/BlockerPanel.tsx`
- `apps/web/src/components/MilestoneTimeline.tsx`
- `apps/web/src/components/AssetTable.tsx`
- `apps/web/src/components/AiAnswerCard.tsx`
- `apps/web/src/components/ActivityLog.tsx`
- `apps/web/src/tests/setup.ts`
- `apps/web/src/tests/dashboard.test.tsx`
- `.agents/docs/plans/2026-04-29-frontend-foundation-plan.md`

## Key decisions
- Used seeded in-memory fallback data in `api.ts` + `mockData.ts` so UI works when PRD endpoints are absent, while still calling expected backend routes first.
- Kept dashboard filters in query params to satisfy PRD filter acceptance and make state shareable.
- Implemented project-detail interactions for mock evidence add, blocker resolve, AI ask, and claim reverification so skeleton reflects expected truth-layer workflows without needing live backend availability.
- Kept styling dense, table-forward, and operational. No marketing layout, no decorative hero treatment.

## Tests run and results
- `cd apps/web && npm install` — passed
- `cd apps/web && npm test` — passed; 5 required tests green
- `cd apps/web && npm run build` — passed

## Risks / unresolved
- Fallback store is intentionally deterministic and local-only; live backend response shapes may still require small adapter changes once API contracts land.
- React Router emits future-flag warnings in tests only; not build-blocking.
- No browser/manual visual QA run yet.

## Branch / worktree
- Branch: `codex/solarops-truth-layer`
- Worktree: `/Users/admin/khan_work/solarops`

## Commit hashes
- Created focused commit: `Add web frontend foundation`
- Exact final hash omitted in report body because the report is part of that commit and would self-change on amend.

## Next-step handoff
- Wire real backend responses to `src/lib/types.ts` and trim fallback adapters once Rust API contracts stabilize.
- Add browser QA against live API and verify mobile table overflow ergonomics with real payload sizes.
