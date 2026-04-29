from __future__ import annotations

from app.schemas import AiAnswer, AskRequest, ProjectContext
from app.verification_helpers import (
    claim,
    enforce_answer_rules,
    has_evidence,
    has_open_blocker_category,
    has_open_high_blocker,
    milestone_complete,
)


def answer_question(req: AskRequest) -> AiAnswer:
    question = req.question.lower()
    project = req.project
    if "financing" in question or "financial" in question:
        return evaluate_financing_readiness(project)
    if "blocking" in question or "blocked" in question or "blocker" in question or "block" in question:
        return explain_blockers(project)
    if "rebate submission" in question or "move to rebate" in question:
        return evaluate_rebate_submission_readiness(project)
    if "changed" in question or "this week" in question:
        return summarize_recent_activity(project)
    if "installation" in question or "install" in question:
        return evaluate_installation_readiness(project)
    return summarize_project(project)


def evaluate_financing_readiness(project: ProjectContext) -> AiAnswer:
    financing_evidence = has_evidence(project, "ppa_term_sheet") + has_evidence(project, "financing_document")
    rebate_award = has_evidence(project, "rebate_award_letter")
    has_high_blocker = has_open_high_blocker(project.blockers)
    data_conflict = has_open_blocker_category(project.blockers, "data_conflict")

    missing: list[str] = []
    if project.financials.estimated_project_cost_usd is None:
        missing.append("estimated_project_cost_usd")
    if project.financials.estimated_annual_savings_usd is None:
        missing.append("estimated_annual_savings_usd")
    if project.financials.financing_type is None or project.financials.financing_type.upper() == "TBD":
        missing.append("financing_plan")
    if project.financials.estimated_rebate_usd is None:
        missing.append("rebate_estimate")
    if project.health == "unknown":
        if not has_evidence(project, "utility_bill"):
            missing.append("utility_bill")
        if not has_evidence(project, "asset_spec_sheet"):
            missing.append("battery_specification")
    if not financing_evidence:
        missing.append("ppa_term_sheet_or_financing_document")
    if project.financials.estimated_rebate_usd is not None and not rebate_award:
        missing.append("rebate_award_letter")

    status = "verified"
    confidence = 0.9
    reasoning = "Key financing fields and evidence exist, no open high blockers."
    if has_high_blocker or data_conflict:
        status = "contradicted"
        confidence = 0.15
        reasoning = "Open high-severity blocker or data conflict prevents readiness."
    elif missing:
        status = "missing_evidence"
        confidence = 0.35
        reasoning = "Critical financing fields or evidence missing."

    financing_claim_status = "verified" if financing_evidence else "missing_evidence"
    financing_missing = [] if financing_evidence else ["ppa_term_sheet_or_financing_document"]
    rebate_claim_status = "verified" if rebate_award else "missing_evidence"
    rebate_missing = [] if rebate_award else ["rebate_award_letter"]
    readiness_evidence = financing_evidence + rebate_award if status == "verified" else []

    claims = [
        claim(
            claim_text="PPA or financing term sheet is secured.",
            claim_type="financial",
            status=financing_claim_status,
            confidence=0.9 if financing_evidence else 0.25,
            evidence_ids=financing_evidence,
            missing_evidence=financing_missing,
            reasoning_summary="Financing documentation requires PPA term sheet or financing document evidence.",
        ),
        claim(
            claim_text="Rebate is secured.",
            claim_type="rebate",
            status=rebate_claim_status,
            confidence=0.9 if rebate_award else 0.25,
            evidence_ids=rebate_award,
            missing_evidence=rebate_missing,
            reasoning_summary="Rebate secured requires rebate award letter evidence.",
        ),
        claim(
            claim_text="Project readiness for financing review.",
            claim_type="readiness",
            status=status,
            confidence=confidence,
            evidence_ids=readiness_evidence,
            missing_evidence=missing,
            reasoning_summary=reasoning,
        ),
    ]
    actions = []
    if has_high_blocker:
        actions.append("Resolve open high-severity blocker before approval.")
    if data_conflict:
        actions.append("Resolve open data conflict before approval.")
    other_missing = [
        item
        for item in missing
        if item not in {"rebate_award_letter", "ppa_term_sheet_or_financing_document"}
    ]
    if other_missing:
        actions.append("Complete missing financing fields before approval.")
    if not rebate_award:
        actions.append("Upload rebate award letter evidence.")
    if not financing_evidence:
        actions.append("Upload signed term sheet or financing document.")
    if not actions:
        actions.append(
            "Proceed with financing review package."
            if status == "verified"
            else "Resolve financing readiness gaps before approval."
        )
    answer = AiAnswer(
        answer_markdown="Financing readiness evaluated with deterministic policy checks.",
        overall_confidence=max(c.confidence for c in claims),
        claims=claims,
        recommended_next_actions=actions,
    )
    return enforce_answer_rules(answer)


def explain_blockers(project: ProjectContext) -> AiAnswer:
    has_high = has_open_high_blocker(project.blockers)
    status = "contradicted" if has_high else "assumption"
    claims = [
        claim(
            claim_text="Open blockers affect project readiness.",
            claim_type="risk",
            status=status,
            confidence=0.8 if has_high else 0.55,
            evidence_ids=[],
            missing_evidence=[] if has_high else ["blocker_severity_review"],
            reasoning_summary="High-severity open blocker prevents approval decisions.",
        )
    ]
    answer = AiAnswer(
        answer_markdown="Blocker review complete.",
        overall_confidence=claims[0].confidence,
        claims=claims,
        recommended_next_actions=["Resolve high-severity blockers first."],
    )
    return enforce_answer_rules(answer)


def evaluate_rebate_submission_readiness(project: ProjectContext) -> AiAnswer:
    data_conflict = has_open_blocker_category(project.blockers, "data_conflict")
    high_blocker = has_open_high_blocker(project.blockers)
    status = "contradicted" if data_conflict or high_blocker else "missing_evidence"
    missing = [] if status == "contradicted" else ["rebate_application"]
    actions = (
        ["Reconcile asset specifications before rebate submission."]
        if data_conflict
        else ["Upload rebate application and confirm required supporting evidence."]
    )
    claims = [
        claim(
            claim_text="Project can move to rebate submission.",
            claim_type="readiness",
            status=status,
            confidence=0.15 if status == "contradicted" else 0.35,
            evidence_ids=[],
            missing_evidence=missing,
            reasoning_summary="High-severity data conflicts block rebate submission readiness.",
        )
    ]
    answer = AiAnswer(
        answer_markdown="Rebate submission readiness checked against blockers and evidence.",
        overall_confidence=claims[0].confidence,
        claims=claims,
        recommended_next_actions=actions,
    )
    return enforce_answer_rules(answer)


def summarize_recent_activity(project: ProjectContext) -> AiAnswer:
    has_activity = len(project.activity_events) > 0
    claims = [
        claim(
            claim_text="Recent activity is available for this project.",
            claim_type="schedule",
            status="assumption" if has_activity else "missing_evidence",
            confidence=0.6 if has_activity else 0.25,
            evidence_ids=[],
            missing_evidence=[] if has_activity else ["activity_events"],
            reasoning_summary="Activity summaries use provided activity event records only.",
        )
    ]
    answer = AiAnswer(
        answer_markdown="Recent activity was summarized from provided project events.",
        overall_confidence=claims[0].confidence,
        claims=claims,
        recommended_next_actions=["Review unresolved blockers and latest evidence changes."],
    )
    return enforce_answer_rules(answer)


def evaluate_installation_readiness(project: ProjectContext) -> AiAnswer:
    permit_ids = has_evidence(project, "permit_approval")
    interconnect_ids = has_evidence(project, "interconnection_approval")
    has_blocking_delay = (
        has_open_high_blocker(project.blockers)
        or has_open_blocker_category(project.blockers, "permit_delay")
        or has_open_blocker_category(project.blockers, "interconnection_delay")
    )
    equipment_ordered = milestone_complete(project, "equipment_ordered")
    missing = []
    if not permit_ids:
        missing.append("permit_approval")
    if not interconnect_ids:
        missing.append("interconnection_approval")
    if not equipment_ordered:
        missing.append("equipment_ordered")

    if has_blocking_delay:
        status = "contradicted"
        evidence_ids = []
        confidence = 0.15
        reasoning = "Open permit or interconnection blocker prevents installation readiness."
    elif missing:
        status = "missing_evidence"
        evidence_ids = []
        confidence = 0.25
        reasoning = "Permit approval, interconnection approval, and equipment ordered milestone are required."
    else:
        status = "verified"
        evidence_ids = permit_ids + interconnect_ids
        confidence = 0.9
        reasoning = "Permit and interconnection approvals exist, equipment is ordered, and no delay blockers are open."
    claims = [
        claim(
            claim_text="Installation can start.",
            claim_type="installation",
            status=status,
            confidence=confidence,
            evidence_ids=evidence_ids,
            missing_evidence=missing,
            reasoning_summary=reasoning,
        )
    ]
    answer = AiAnswer(
        answer_markdown="Installation readiness checked.",
        overall_confidence=confidence,
        claims=claims,
        recommended_next_actions=["Provide missing permit/interconnection approvals."],
    )
    return enforce_answer_rules(answer)


def summarize_project(project: ProjectContext) -> AiAnswer:
    monitoring_ids = has_evidence(project, "monitoring_snapshot")
    has_estimate = project.financials.estimated_annual_savings_usd is not None
    if monitoring_ids:
        status = "verified"
        evidence_ids = monitoring_ids
        missing = []
        confidence = 0.85
        summary = "Monitoring snapshot supports realized savings."
    elif has_estimate:
        status = "assumption"
        evidence_ids = []
        missing = ["monitoring_snapshot"]
        confidence = 0.45
        summary = "Only estimate exists, realized savings not verified."
    else:
        status = "missing_evidence"
        evidence_ids = []
        missing = ["estimated_annual_savings_usd", "monitoring_snapshot"]
        confidence = 0.2
        summary = "No estimate or monitoring evidence."

    claims = [
        claim(
            claim_text="Savings are realized.",
            claim_type="financial",
            status=status,
            confidence=confidence,
            evidence_ids=evidence_ids,
            missing_evidence=missing,
            reasoning_summary=summary,
        )
    ]
    answer = AiAnswer(
        answer_markdown="Project summary generated from provided context only.",
        overall_confidence=confidence,
        claims=claims,
        recommended_next_actions=["Attach monitoring snapshot to verify realized savings."],
    )
    return enforce_answer_rules(answer)
