use serde::Serialize;
use uuid::Uuid;

use crate::{
    db::models::{Blocker, Milestone, ProjectRecord},
    domain::readiness::{
        financial_fields_exist, has_evidence, has_open_blocker_category, has_open_high_blocker,
        milestone_complete,
    },
};

#[derive(Debug, Clone, Serialize)]
pub struct ClaimEvaluation {
    pub status: String,
    pub confidence: f64,
    pub evidence_ids: Vec<Uuid>,
    pub missing_evidence: Vec<String>,
}

pub fn rebate_secured(
    project: &ProjectRecord,
    evidence: &[(Uuid, String)],
    blockers: &[Blocker],
) -> ClaimEvaluation {
    if has_open_blocker_category(blockers, "rebate_risk") {
        return evaluation("contradicted", 0.1, vec![], no_missing());
    }

    let award_ids = evidence_ids(evidence, "rebate_award_letter");
    if !award_ids.is_empty() {
        return evaluation("verified", 0.95, award_ids, no_missing());
    }

    if project.estimated_rebate_usd.is_some() {
        return evaluation("missing_evidence", 0.2, vec![], vec!["rebate_award_letter"]);
    }

    evaluation(
        "missing_evidence",
        0.1,
        vec![],
        vec!["estimated_rebate_usd"],
    )
}

pub fn financing_ready(
    project: &ProjectRecord,
    evidence: &[(Uuid, String)],
    blockers: &[Blocker],
) -> ClaimEvaluation {
    if has_open_high_blocker(blockers) || has_open_blocker_category(blockers, "data_conflict") {
        return evaluation("contradicted", 0.1, vec![], no_missing());
    }

    let evidence_types = evidence_types(evidence);
    let financing_ids = evidence_ids(evidence, "ppa_term_sheet");
    let rebate_ids = evidence_ids(evidence, "rebate_award_letter");
    let mut missing = Vec::new();

    if project.estimated_project_cost_usd.is_none() {
        missing.push("estimated_project_cost_usd".to_owned());
    }
    if project.estimated_annual_savings_usd.is_none() {
        missing.push("estimated_annual_savings_usd".to_owned());
    }
    if project.financing_type.is_none() {
        missing.push("financing_type".to_owned());
    }
    if !has_evidence(&evidence_types, "ppa_term_sheet") {
        missing.push("ppa_term_sheet".to_owned());
    }
    if project.estimated_rebate_usd.is_some() && rebate_ids.is_empty() {
        missing.push("rebate_award_letter".to_owned());
    }

    if missing.is_empty() && financial_fields_exist(project) {
        let mut ids = financing_ids;
        ids.extend(rebate_ids);
        return evaluation("verified", 0.92, ids, no_missing());
    }

    if financial_fields_exist(project) && missing.len() == 1 {
        return evaluation("assumption", 0.62, financing_ids, missing);
    }

    evaluation("missing_evidence", 0.25, financing_ids, missing)
}

pub fn installation_ready(
    evidence: &[(Uuid, String)],
    blockers: &[Blocker],
    milestones: &[Milestone],
) -> ClaimEvaluation {
    if has_open_high_blocker(blockers)
        || has_open_blocker_category(blockers, "permit_delay")
        || has_open_blocker_category(blockers, "interconnection_delay")
    {
        return evaluation("contradicted", 0.15, vec![], no_missing());
    }

    let permit_ids = evidence_ids(evidence, "permit_approval");
    let interconnection_ids = evidence_ids(evidence, "interconnection_approval");
    let equipment_ordered = milestone_complete(milestones, "equipment_ordered");
    let mut missing = Vec::new();

    if permit_ids.is_empty() {
        missing.push("permit_approval".to_owned());
    }
    if interconnection_ids.is_empty() {
        missing.push("interconnection_approval".to_owned());
    }
    if !equipment_ordered {
        missing.push("equipment_ordered".to_owned());
    }

    if missing.is_empty() {
        let mut ids = permit_ids;
        ids.extend(interconnection_ids);
        return evaluation("verified", 0.92, ids, no_missing());
    }

    evaluation("missing_evidence", 0.25, vec![], missing)
}

pub fn savings_realized(
    project: &ProjectRecord,
    evidence: &[(Uuid, String)],
    milestones: &[Milestone],
) -> ClaimEvaluation {
    let monitoring_ids = evidence_ids(evidence, "monitoring_snapshot");
    if milestone_complete(milestones, "commissioning_completed") && !monitoring_ids.is_empty() {
        return evaluation("verified", 0.9, monitoring_ids, no_missing());
    }

    if project.estimated_annual_savings_usd.is_some() {
        return evaluation(
            "assumption",
            0.45,
            vec![],
            vec!["monitoring_snapshot", "commissioning_completed"],
        );
    }

    evaluation(
        "missing_evidence",
        0.2,
        vec![],
        vec!["estimated_annual_savings_usd", "monitoring_snapshot"],
    )
}

pub fn evaluate_claim(
    claim_type: &str,
    claim_text: &str,
    project: &ProjectRecord,
    evidence: &[(Uuid, String)],
    blockers: &[Blocker],
    milestones: &[Milestone],
) -> ClaimEvaluation {
    let text = claim_text.to_lowercase();
    if claim_type == "rebate" || text.contains("rebate") {
        return rebate_secured(project, evidence, blockers);
    }
    if claim_type == "installation" || text.contains("installation") || text.contains("install") {
        return installation_ready(evidence, blockers, milestones);
    }
    if text.contains("savings") && text.contains("realized") {
        return savings_realized(project, evidence, milestones);
    }
    if claim_type == "readiness" || text.contains("financing") {
        return financing_ready(project, evidence, blockers);
    }
    if has_open_blocker_category(blockers, "data_conflict") {
        return evaluation("contradicted", 0.1, vec![], no_missing());
    }
    evaluation("assumption", 0.5, vec![], vec!["direct_evidence"])
}

fn evidence_types(evidence: &[(Uuid, String)]) -> Vec<String> {
    evidence.iter().map(|(_, kind)| kind.clone()).collect()
}

fn evidence_ids(evidence: &[(Uuid, String)], evidence_type: &str) -> Vec<Uuid> {
    evidence
        .iter()
        .filter_map(|(id, kind)| (kind == evidence_type).then_some(*id))
        .collect()
}

fn no_missing() -> Vec<String> {
    Vec::new()
}

fn evaluation<T>(
    status: &str,
    confidence: f64,
    evidence_ids: Vec<Uuid>,
    missing_evidence: Vec<T>,
) -> ClaimEvaluation
where
    T: Into<String>,
{
    ClaimEvaluation {
        status: status.to_owned(),
        confidence,
        evidence_ids,
        missing_evidence: missing_evidence.into_iter().map(Into::into).collect(),
    }
}

#[cfg(test)]
mod tests {
    use chrono::Utc;
    use uuid::Uuid;

    use super::*;

    fn project() -> ProjectRecord {
        ProjectRecord {
            id: Uuid::nil(),
            name: "Small Roof Solar + Storage".to_owned(),
            stage: "financing_review".to_owned(),
            health: "yellow".to_owned(),
            system_size_kw_dc: Some(610.0),
            estimated_project_cost_usd: Some(1_720_000.0),
            estimated_annual_savings_usd: Some(51_000.0),
            estimated_rebate_usd: Some(1_180_000.0),
            financing_type: Some("PPA".to_owned()),
            ppa_term_years: Some(10),
            target_cod: None,
            owner_name: "Maya Patel".to_owned(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    fn blocker(category: &str, severity: &str) -> Blocker {
        Blocker {
            id: Uuid::nil(),
            project_id: Uuid::nil(),
            category: category.to_owned(),
            severity: severity.to_owned(),
            title: "Blocker".to_owned(),
            description: "Description".to_owned(),
            owner_name: None,
            status: "open".to_owned(),
            created_at: Utc::now(),
            resolved_at: None,
        }
    }

    #[test]
    fn test_rebate_claim_missing_without_award_letter() {
        let result = rebate_secured(&project(), &[], &[]);
        assert_eq!(result.status, "missing_evidence");
        assert_eq!(result.missing_evidence, vec!["rebate_award_letter"]);
    }

    #[test]
    fn test_rebate_claim_verified_with_award_letter() {
        let id = Uuid::new_v4();
        let result = rebate_secured(&project(), &[(id, "rebate_award_letter".to_owned())], &[]);
        assert_eq!(result.status, "verified");
        assert_eq!(result.evidence_ids, vec![id]);
    }

    #[test]
    fn test_financing_readiness_blocked_by_high_severity_blocker() {
        let result = financing_ready(&project(), &[], &[blocker("data_conflict", "high")]);
        assert_eq!(result.status, "contradicted");
    }

    #[test]
    fn test_installation_readiness_requires_interconnection_approval() {
        let result =
            installation_ready(&[(Uuid::new_v4(), "permit_approval".to_owned())], &[], &[]);
        assert_eq!(result.status, "missing_evidence");
        assert!(
            result
                .missing_evidence
                .contains(&"interconnection_approval".to_owned())
        );
    }
}
