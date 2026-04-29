from fastapi.testclient import TestClient

from app.main import app
from app.schemas import AiAnswer, AiClaim

client = TestClient(app)


def _base_project() -> dict:
    return {
        "id": "proj-1",
        "name": "Small Roof Solar + Storage",
        "stage": "financing_review",
        "health": "yellow",
        "financials": {
            "estimated_project_cost_usd": 1720000,
            "estimated_annual_savings_usd": 51000,
            "estimated_rebate_usd": 1180000,
            "financing_type": "PPA",
            "ppa_term_years": 10,
        },
        "milestones": [],
        "assets": [],
        "evidence": [],
        "blockers": [],
    }


def test_mock_financing_answer_marks_missing_rebate_evidence() -> None:
    payload = {"project": _base_project(), "question": "Is this project ready for financing review?"}
    resp = client.post("/ask", json=payload)
    assert resp.status_code == 200
    body = resp.json()
    readiness_claim = next(claim for claim in body["claims"] if claim["claim_type"] == "readiness")
    assert readiness_claim["status"] != "verified"
    rebate_claim = next(claim for claim in body["claims"] if claim["claim_type"] == "rebate")
    assert rebate_claim["status"] == "missing_evidence"
    assert "rebate_award_letter" in rebate_claim["missing_evidence"]


def test_verified_claim_requires_evidence_ids() -> None:
    try:
        AiClaim(
            claim_text="Ready",
            claim_type="readiness",
            status="verified",
            confidence=0.8,
            evidence_ids=[],
            missing_evidence=[],
            reasoning_summary="Missing evidence should fail.",
        )
        assert False, "expected validation error"
    except Exception as exc:
        assert "evidence_id" in str(exc)


def test_savings_estimate_not_realized_without_monitoring() -> None:
    payload = {"project": _base_project(), "question": "Give a project summary"}
    resp = client.post("/ask", json=payload)
    assert resp.status_code == 200
    body = resp.json()
    savings_claim = body["claims"][0]
    assert savings_claim["claim_text"] == "Savings are realized."
    assert savings_claim["status"] == "assumption"
    assert "monitoring_snapshot" in savings_claim["missing_evidence"]


def test_high_blocker_prevents_readiness_approval() -> None:
    project = _base_project()
    project["evidence"] = [{"id": "ev-1", "type": "ppa_term_sheet", "status": "approved"}]
    project["blockers"] = [{"id": "b1", "category": "permit_delay", "severity": "high", "status": "open"}]
    payload = {"project": project, "question": "Is this project ready for financing review?"}
    resp = client.post("/ask", json=payload)
    assert resp.status_code == 200
    body = resp.json()
    readiness = next(claim for claim in body["claims"] if claim["claim_type"] == "readiness")
    assert readiness["status"] == "contradicted"


def test_ai_response_matches_pydantic_schema() -> None:
    payload = {"project": _base_project(), "question": "Is this project blocked?"}
    resp = client.post("/ask", json=payload)
    assert resp.status_code == 200
    parsed = AiAnswer.model_validate(resp.json())
    assert len(parsed.claims) >= 1
    assert len(parsed.recommended_next_actions) >= 1


def test_blocking_prompt_routes_to_blocker_answer() -> None:
    project = _base_project()
    project["blockers"] = [
        {"id": "b1", "category": "data_conflict", "severity": "high", "status": "open"}
    ]
    payload = {"project": project, "question": "What is blocking this project?"}
    resp = client.post("/ask", json=payload)
    assert resp.status_code == 200
    body = resp.json()
    assert body["claims"][0]["claim_type"] == "risk"
    assert body["claims"][0]["status"] == "contradicted"


def test_rebate_submission_prompt_contradicted_by_data_conflict() -> None:
    project = _base_project()
    project["blockers"] = [
        {"id": "b1", "category": "data_conflict", "severity": "high", "status": "open"}
    ]
    payload = {"project": project, "question": "Can this project move to rebate submission?"}
    resp = client.post("/ask", json=payload)
    assert resp.status_code == 200
    body = resp.json()
    assert body["claims"][0]["claim_type"] == "readiness"
    assert body["claims"][0]["status"] == "contradicted"


def test_health_endpoint_returns_expected_defaults() -> None:
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok", "service": "solarops-ai", "model_mode": "mock"}
