from __future__ import annotations

from app.schemas import AiAnswer, AiClaim, Blocker, ProjectContext


def has_evidence(project: ProjectContext, evidence_type: str) -> list[str]:
    return [item.id for item in project.evidence if item.evidence_type == evidence_type]


def has_open_high_blocker(blockers: list[Blocker]) -> bool:
    for blocker in blockers:
        if blocker.is_open() and (blocker.severity or "").lower() == "high":
            return True
    return False


def has_open_blocker_category(blockers: list[Blocker], category: str) -> bool:
    for blocker in blockers:
        if blocker.is_open() and (blocker.category or "").lower() == category.lower():
            return True
    return False


def enforce_answer_rules(answer: AiAnswer) -> AiAnswer:
    # Triggers schema-level validators for contract guarantees.
    return AiAnswer.model_validate(answer.model_dump())


def claim(
    claim_text: str,
    claim_type: str,
    status: str,
    confidence: float,
    evidence_ids: list[str],
    missing_evidence: list[str],
    reasoning_summary: str,
) -> AiClaim:
    return AiClaim(
        claim_text=claim_text,
        claim_type=claim_type,  # type: ignore[arg-type]
        status=status,  # type: ignore[arg-type]
        confidence=confidence,
        evidence_ids=evidence_ids,
        missing_evidence=missing_evidence,
        reasoning_summary=reasoning_summary,
    )
