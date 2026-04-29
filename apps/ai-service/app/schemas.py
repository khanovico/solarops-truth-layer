from __future__ import annotations

from typing import Literal

from pydantic import AliasChoices, BaseModel, Field, model_validator


ClaimStatus = Literal["verified", "assumption", "missing_evidence", "contradicted"]
ClaimType = Literal[
    "financial",
    "rebate",
    "tax",
    "installation",
    "asset",
    "schedule",
    "risk",
    "readiness",
]


class Financials(BaseModel):
    estimated_project_cost_usd: float | None = None
    estimated_annual_savings_usd: float | None = None
    estimated_rebate_usd: float | None = None
    financing_type: str | None = None
    ppa_term_years: int | None = None


class ProjectEvidence(BaseModel):
    id: str
    evidence_type: str = Field(validation_alias=AliasChoices("type", "evidence_type"))
    status: str | None = None


class Blocker(BaseModel):
    id: str | None = None
    category: str | None = None
    severity: str | None = None
    status: str | None = None

    def is_open(self) -> bool:
        return (self.status or "open").lower() == "open"


class ProjectContext(BaseModel):
    id: str
    name: str
    stage: str
    health: str
    financials: Financials
    milestones: list[dict] = Field(default_factory=list)
    assets: list[dict] = Field(default_factory=list)
    evidence: list[ProjectEvidence] = Field(default_factory=list)
    blockers: list[Blocker] = Field(default_factory=list)
    activity_events: list[dict] = Field(default_factory=list)


class AskRequest(BaseModel):
    project: ProjectContext
    question: str


class AiClaim(BaseModel):
    claim_text: str
    claim_type: ClaimType
    status: ClaimStatus
    confidence: float = Field(ge=0, le=1)
    evidence_ids: list[str] = Field(default_factory=list)
    missing_evidence: list[str] = Field(default_factory=list)
    reasoning_summary: str

    @model_validator(mode="after")
    def validate_verified_requires_evidence_ids(self) -> "AiClaim":
        if self.status == "verified" and not self.evidence_ids:
            raise ValueError("verified claims require at least one evidence_id")
        return self


class AiAnswer(BaseModel):
    answer_markdown: str
    overall_confidence: float = Field(ge=0, le=1)
    claims: list[AiClaim]
    recommended_next_actions: list[str]

    @model_validator(mode="after")
    def validate_minimum_shape(self) -> "AiAnswer":
        if not self.claims:
            raise ValueError("at least one claim is required")
        if not self.recommended_next_actions:
            raise ValueError("recommended_next_actions is required")
        return self
