use chrono::Utc;

use crate::db::models::Blocker;

pub const PROJECT_STAGES: &[&str] = &[
    "intake",
    "site_survey",
    "design",
    "incentive_review",
    "rebate_submitted",
    "financing_review",
    "permitting",
    "procurement",
    "installation",
    "commissioning",
    "monitoring",
    "on_hold",
    "cancelled",
];

pub const EVIDENCE_TYPES: &[&str] = &[
    "utility_bill",
    "site_survey",
    "roof_lease",
    "ppa_term_sheet",
    "rebate_application",
    "rebate_award_letter",
    "permit_application",
    "permit_approval",
    "interconnection_application",
    "interconnection_approval",
    "installer_update",
    "asset_spec_sheet",
    "commissioning_report",
    "monitoring_snapshot",
    "tax_memo",
    "customer_approval",
];

pub fn is_valid_stage(stage: &str) -> bool {
    PROJECT_STAGES.contains(&stage)
}

pub fn is_valid_evidence_type(evidence_type: &str) -> bool {
    EVIDENCE_TYPES.contains(&evidence_type)
}

pub fn required_evidence_for_stage(stage: &str) -> &'static [&'static str] {
    match stage {
        "site_survey" => &["utility_bill", "site_survey"],
        "design" => &["site_survey", "asset_spec_sheet"],
        "rebate_submitted" => &["rebate_application"],
        "financing_review" => &["ppa_term_sheet", "rebate_award_letter"],
        "permitting" => &["permit_application"],
        "installation" => &["permit_approval", "interconnection_approval"],
        "commissioning" => &["commissioning_report"],
        "monitoring" => &["commissioning_report", "monitoring_snapshot"],
        _ => &[],
    }
}

pub fn missing_required_evidence_count(stage: &str, evidence_types: &[String]) -> usize {
    required_evidence_for_stage(stage)
        .iter()
        .filter(|required| !evidence_types.iter().any(|actual| actual == **required))
        .count()
}

pub fn compute_project_health(
    stage: &str,
    evidence_types: &[String],
    blockers: &[Blocker],
    overdue_milestone_count: i64,
) -> String {
    if blockers
        .iter()
        .any(|b| b.status == "open" && (b.severity == "high" || b.category == "data_conflict"))
        || overdue_milestone_count > 0
    {
        return "red".to_owned();
    }

    let missing = missing_required_evidence_count(stage, evidence_types);
    if stage == "site_survey" && missing > 0 {
        return "unknown".to_owned();
    }

    if blockers
        .iter()
        .any(|b| b.status == "open" && b.severity == "medium")
        || missing > 0
    {
        return "yellow".to_owned();
    }

    if missing == 0 {
        return "green".to_owned();
    }

    "unknown".to_owned()
}

pub fn is_overdue(planned_date: Option<chrono::NaiveDate>, status: &str) -> bool {
    matches!(status, "not_started" | "in_progress" | "blocked")
        && planned_date.is_some_and(|date| date < Utc::now().date_naive())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn blocker(category: &str, severity: &str) -> Blocker {
        Blocker {
            id: uuid::Uuid::nil(),
            project_id: uuid::Uuid::nil(),
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
    fn high_data_conflict_makes_project_red() {
        let health = compute_project_health(
            "design",
            &["site_survey".to_owned(), "asset_spec_sheet".to_owned()],
            &[blocker("data_conflict", "high")],
            0,
        );
        assert_eq!(health, "red");
    }

    #[test]
    fn financing_review_missing_rebate_award_is_yellow() {
        let health =
            compute_project_health("financing_review", &["ppa_term_sheet".to_owned()], &[], 0);
        assert_eq!(health, "yellow");
    }
}
