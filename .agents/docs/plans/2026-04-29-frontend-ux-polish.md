# Frontend UX Polish Plan

## Goal and Scope

Improve the SolarOps web console UX in three focused areas:

- Keep the sidebar fixed/non-scrolling while the main workspace scrolls independently on desktop.
- Replace plain sidebar and native select styling with cleaner, modern operational UI styling.
- Rework the project AI assistant into an industry-standard chat-style widget with pending latency and mock-thinking state before deterministic fallback answers appear.

Out of scope: backend/API changes, data model changes, new routes, auth, and broad dashboard redesign.

## Visual Thesis

Quiet enterprise operations surface: light workspace, precise ink-and-slate navigation, crisp controls, and a conversational assistant panel that reads like a trustworthy analyst.

## Content Plan

- App shell: persistent sidebar, clear product identity, route-aware nav items.
- Filters: compact labeled dropdown controls with consistent shape, focus, and affordance.
- Assistant: user prompt composer, suggested prompts, thinking timeline, answer bubble, evidence/claims/actions grouped for scan.

## Interaction Thesis

- Sidebar nav uses active, hover, and focus states with a left rail indicator.
- Select controls use stable dimensions and native dropdown behavior with custom visual affordance.
- Assistant shows a short mock-thinking sequence while waiting, then transitions to answer with chat bubbles and evidence groups.

## Relevant Files

- `apps/web/src/App.tsx`: app shell and sidebar route links.
- `apps/web/src/styles.css`: shell layout, nav styling, select styling, assistant styling.
- `apps/web/src/routes/ProjectDetail.tsx`: assistant pending state and question composer.
- `apps/web/src/components/AiAnswerCard.tsx`: chat-style answer rendering.
- `apps/web/src/routes/Dashboard.tsx`, `apps/web/src/routes/ClaimLedger.tsx`, `apps/web/src/components/EvidenceTable.tsx`: select/dropdown markup if needed.
- `apps/web/src/tests/dashboard.test.tsx`: update or add coverage for assistant pending UX if needed.

## Ordered Task Groups

1. Shell and navigation
   - Make desktop app shell `100vh` with `main-panel` as the scroll container.
   - Keep sidebar sticky/full-height and non-scrolling with improved nav item states.
   - Preserve responsive mobile layout.

2. Dropdown/control styling
   - Add modern select wrapper/icon affordance using existing native `<select>`.
   - Apply consistent classes to dashboard, claim ledger, and evidence filters.
   - Keep keyboard and screen-reader behavior native.

3. AI assistant
   - Add delayed mock-thinking pending state to `handleAsk`.
   - Render prompt composer as chat panel with suggested prompt chips.
   - Update `AiAnswerCard` to show empty, thinking, and answered states with claims/evidence/actions grouped.

4. Validation and review
   - Run targeted frontend tests and `cd apps/web && npm run build`.
   - Spawn code review and scalability review agents after implementation.
   - Address actionable findings and commit a focused frontend change.

## TODO Checklist

- [x] Spawn parallel agents for isolated frontend subtasks.
- [x] Implement shell/sidebar changes.
- [x] Implement dropdown styling.
- [x] Implement assistant pending/chat UX.
- [ ] Add or adjust tests where behavior changed. Blocked: current Vitest/jsdom worker fails before tests execute.
- [x] Run frontend type/build validation and attempted tests.
- [x] Run review and scalability agents.
- [x] Commit final scoped changes.

## Parallel-Safe Work

- Worker A: sidebar shell/nav structure in `App.tsx` only.
- Worker B: assistant behavior/rendering in `ProjectDetail.tsx` and `AiAnswerCard.tsx` only.
- Worker C: dropdown markup classes in `Dashboard.tsx`, `ClaimLedger.tsx`, and `EvidenceTable.tsx` only.

Main executor owns `styles.css`, tests, integration, validation, docs, and final commit to avoid CSS conflicts.

## Dependencies and Merge Risks

- `styles.css` is shared by all UX areas, so only main executor edits it.
- Assistant tests may depend on text labels; preserve accessible names where practical.
- Existing unrelated changes in package metadata and AI egg-info must be left untouched.
