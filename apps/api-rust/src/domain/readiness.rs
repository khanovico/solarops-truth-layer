use crate::db::models::{Blocker, Milestone, ProjectRecord};

pub fn has_open_high_blocker(blockers: &[Blocker]) -> bool {
    blockers
        .iter()
        .any(|b| b.status == "open" && b.severity == "high")
}

pub fn has_open_blocker_category(blockers: &[Blocker], category: &str) -> bool {
    blockers
        .iter()
        .any(|b| b.status == "open" && b.category == category)
}

pub fn has_evidence(evidence_types: &[String], evidence_type: &str) -> bool {
    evidence_types.iter().any(|actual| actual == evidence_type)
}

pub fn milestone_complete(milestones: &[Milestone], milestone_type: &str) -> bool {
    milestones
        .iter()
        .any(|m| m.milestone_type == milestone_type && m.status == "complete")
}

pub fn financial_fields_exist(project: &ProjectRecord) -> bool {
    project.estimated_project_cost_usd.is_some()
        && project.estimated_annual_savings_usd.is_some()
        && project.financing_type.is_some()
}
