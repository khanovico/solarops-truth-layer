# AI Service Work Report — 2026-04-29

## Summary

Implemented Python FastAPI AI service foundation under `apps/ai-service/**` with deterministic mock contract for `GET /health` and `POST /ask`. Default `AI_PROVIDER` mode is `mock`. Response contract enforced with Pydantic validators and deterministic verification helpers.

## Files Changed

- `apps/ai-service/pyproject.toml`
- `apps/ai-service/Dockerfile`
- `apps/ai-service/app/__init__.py`
- `apps/ai-service/app/main.py`
- `apps/ai-service/app/schemas.py`
- `apps/ai-service/app/mock_model.py`
- `apps/ai-service/app/gemini_model.py`
- `apps/ai-service/app/verification_helpers.py`
- `apps/ai-service/tests/test_ai_service.py`

## Key Decisions

- Enforced `verified` claim evidence rule at schema level (`AiClaim` validator): verified claim without `evidence_ids` fails validation.
- Kept deterministic intent routing in mock mode:
  - financing → financing readiness evaluator
  - blocked/blocker → blocker evaluator
  - installation/install → installation evaluator
  - fallback → project summary evaluator
- Implemented deterministic policy checks from requirements:
  - rebate secured requires `rebate_award_letter`
  - high open blocker prevents financing readiness approval
  - savings realized not marked verified without `monitoring_snapshot`
- Added `gemini_model.py` as explicit stub that preserves mode contract while returning `501` from API when selected.

## Tests

Implemented required Python AI tests:

- `test_mock_financing_answer_marks_missing_rebate_evidence`
- `test_verified_claim_requires_evidence_ids`
- `test_savings_estimate_not_realized_without_monitoring`
- `test_high_blocker_prevents_readiness_approval`
- `test_ai_response_matches_pydantic_schema`

Additional:

- `test_health_endpoint_returns_expected_defaults`

Execution:

- Command: `python3 -m pytest -q` (run in `apps/ai-service`)
- Result: `6 passed in 0.19s`

## Risks / Gaps

- `AI_PROVIDER=gemini` path intentionally not implemented yet; API returns `501`.
- Docker image installs runtime deps directly in Dockerfile for stability now; can be aligned to lockfile-based build later.

## Branch / Worktree

- Branch: `codex/solarops-truth-layer`
- Worktree: `/Users/admin/khan_work/solarops`
- Base commit at run time: `cf3f330`
- New commit hashes: none (no commit created in this task)

## Next-Step Handoff

- Implement Gemini structured-output adapter in `app/gemini_model.py`, validate into `AiAnswer`, and preserve deterministic post-validation guard.
- Integrate with compose service wiring once root infra files are in scope.
