# Dropdown Refetch Flash Fix Plan

## Goal

Stop full-screen flashing when dashboard or claim ledger dropdown filters change.

## Cause

Filter changes trigger data refetch and set page-level `isLoading=true`. The routes return only a loading state while refetching, unmounting the whole page and making the screen flash.

## Scope

- `apps/web/src/routes/Dashboard.tsx`
- `apps/web/src/routes/ClaimLedger.tsx`
- `apps/web/src/styles.css`

## Tasks

- [x] Keep the page mounted after first successful load.
- [x] Show inline updating state during background filter refetch.
- [x] Preserve error fallback only for initial load failures.
- [x] Validate with TypeScript/build. Vitest still blocked by local jsdom ESM worker error before tests execute.
