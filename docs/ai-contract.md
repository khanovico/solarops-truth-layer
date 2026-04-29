# AI Contract

The AI service is advisory. The Rust API remains the source of truth and validates AI output before persistence.

Provider modes:

- `AI_PROVIDER=mock`: deterministic default, no external calls.
- `AI_PROVIDER=gemini`: optional structured-output provider behind `GEMINI_API_KEY`.

AI claims must include:

- `claim_text`
- `claim_type`
- `status`
- `confidence`
- `evidence_ids`
- `missing_evidence`
- `reasoning_summary`

Unsafe output handling:

- Verified claims without evidence IDs are downgraded.
- Estimated savings are not treated as realized savings without monitoring evidence.
- Rebate secured claims require `rebate_award_letter`.
- Installation readiness requires permit approval, interconnection approval, and equipment ordered.

Mock routing:

- Questions containing `financing` or `financial` evaluate financing readiness.
- Questions containing `blocked` or `blocker` explain blockers.
- Questions containing `changed` or `this week` summarize recent activity.
- Questions containing `installation` or `install` evaluate installation readiness.
- Other questions summarize project state from provided context only.
