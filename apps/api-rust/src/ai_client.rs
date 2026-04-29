use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    db::models::ProjectDetail,
    domain::claim_verification,
    error::{AppError, AppResult},
};

#[derive(Clone)]
pub struct AiClient {
    base_url: String,
    http: reqwest::Client,
}

impl AiClient {
    pub fn new(base_url: impl AsRef<str>) -> Self {
        Self {
            base_url: base_url.as_ref().trim_end_matches('/').to_owned(),
            http: reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(10))
                .build()
                .expect("AI HTTP client builds"),
        }
    }

    pub async fn ask(&self, detail: &ProjectDetail, question: &str) -> AppResult<AiAnswer> {
        let request = AiAskRequest {
            project: AiProjectContext::from_detail(detail),
            question: question.to_owned(),
        };
        let url = format!("{}/ask", self.base_url);
        let response = self
            .http
            .post(url)
            .json(&request)
            .send()
            .await
            .map_err(|_| AppError::AiServiceUnavailable)?;

        if !response.status().is_success() {
            return Err(AppError::AiServiceUnavailable);
        }

        response
            .json::<AiAnswer>()
            .await
            .map_err(|_| AppError::AiResponseInvalid)
    }
}

#[derive(Debug, Serialize)]
struct AiAskRequest {
    project: AiProjectContext,
    question: String,
}

#[derive(Debug, Serialize)]
struct AiProjectContext {
    id: Uuid,
    name: String,
    stage: String,
    health: String,
    financials: AiFinancials,
    milestones: Vec<serde_json::Value>,
    assets: Vec<serde_json::Value>,
    evidence: Vec<AiEvidence>,
    blockers: Vec<AiBlocker>,
    activity_events: Vec<serde_json::Value>,
}

impl AiProjectContext {
    fn from_detail(detail: &ProjectDetail) -> Self {
        Self {
            id: detail.project.id,
            name: detail.project.name.clone(),
            stage: detail.project.stage.clone(),
            health: detail.project.health.clone(),
            financials: AiFinancials {
                estimated_project_cost_usd: detail.project.estimated_project_cost_usd,
                estimated_annual_savings_usd: detail.project.estimated_annual_savings_usd,
                estimated_rebate_usd: detail.project.estimated_rebate_usd,
                financing_type: detail.project.financing_type.clone(),
                ppa_term_years: detail.project.ppa_term_years,
            },
            milestones: detail
                .milestones
                .iter()
                .map(|m| serde_json::json!(m))
                .collect(),
            assets: detail.assets.iter().map(|a| serde_json::json!(a)).collect(),
            evidence: detail
                .evidence
                .iter()
                .map(|e| AiEvidence {
                    id: e.id,
                    evidence_type: e.evidence_type.clone(),
                    r#type: e.evidence_type.clone(),
                    title: e.title.clone(),
                })
                .collect(),
            blockers: detail
                .blockers
                .iter()
                .map(|b| AiBlocker {
                    id: b.id,
                    category: b.category.clone(),
                    severity: b.severity.clone(),
                    status: b.status.clone(),
                    title: b.title.clone(),
                })
                .collect(),
            activity_events: detail
                .activity_events
                .iter()
                .map(|event| serde_json::json!(event))
                .collect(),
        }
    }
}

#[derive(Debug, Serialize)]
struct AiFinancials {
    estimated_project_cost_usd: Option<f64>,
    estimated_annual_savings_usd: Option<f64>,
    estimated_rebate_usd: Option<f64>,
    financing_type: Option<String>,
    ppa_term_years: Option<i32>,
}

#[derive(Debug, Serialize)]
struct AiEvidence {
    id: Uuid,
    evidence_type: String,
    #[serde(rename = "type")]
    r#type: String,
    title: String,
}

#[derive(Debug, Serialize)]
struct AiBlocker {
    id: Uuid,
    category: String,
    severity: String,
    status: String,
    title: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiAnswer {
    pub answer_markdown: String,
    pub overall_confidence: f64,
    pub claims: Vec<AiClaim>,
    pub recommended_next_actions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiClaim {
    pub claim_text: String,
    pub claim_type: String,
    pub status: String,
    pub confidence: f64,
    pub evidence_ids: Vec<Uuid>,
    pub missing_evidence: Vec<String>,
    pub reasoning_summary: String,
}

impl AiAnswer {
    pub fn validate_against_project(mut self, detail: &ProjectDetail) -> AppResult<Self> {
        if self.claims.is_empty() || self.recommended_next_actions.is_empty() {
            return Err(AppError::AiResponseInvalid);
        }
        if !(0.0..=1.0).contains(&self.overall_confidence) {
            return Err(AppError::AiResponseInvalid);
        }

        let allowed_evidence: std::collections::HashSet<Uuid> =
            detail.evidence.iter().map(|e| e.id).collect();
        let evidence: Vec<(Uuid, String)> = detail
            .evidence
            .iter()
            .map(|e| (e.id, e.evidence_type.clone()))
            .collect();

        let mut corrected_claims = false;
        for claim in &mut self.claims {
            if !is_valid_claim_status(&claim.status)
                || !is_valid_claim_type(&claim.claim_type)
                || !(0.0..=1.0).contains(&claim.confidence)
            {
                return Err(AppError::AiResponseInvalid);
            }
            let original_status = claim.status.clone();
            let original_confidence = claim.confidence;
            let original_evidence_ids = claim.evidence_ids.clone();
            claim
                .evidence_ids
                .retain(|evidence_id| allowed_evidence.contains(evidence_id));
            let evaluation = claim_verification::evaluate_claim(
                &claim.claim_type,
                &claim.claim_text,
                &detail.project,
                &evidence,
                &detail.blockers,
                &detail.milestones,
            );
            apply_stricter_evaluation(claim, &evaluation);
            claim
                .evidence_ids
                .retain(|evidence_id| allowed_evidence.contains(evidence_id));
            if claim.status == "verified" && claim.evidence_ids.is_empty() {
                "missing_evidence".clone_into(&mut claim.status);
                claim.confidence = claim.confidence.min(0.4);
                if claim.missing_evidence.is_empty() {
                    claim.missing_evidence.push("linked_evidence".to_owned());
                }
            }
            corrected_claims |= original_status != claim.status
                || (original_confidence - claim.confidence).abs() > f64::EPSILON
                || original_evidence_ids != claim.evidence_ids;
        }

        self.overall_confidence = self
            .claims
            .iter()
            .map(|claim| claim.confidence)
            .reduce(f64::min)
            .ok_or(AppError::AiResponseInvalid)?;
        if corrected_claims {
            "AI answer adjusted by deterministic project verification rules."
                .clone_into(&mut self.answer_markdown);
            if !self
                .recommended_next_actions
                .iter()
                .any(|action| action == "Review corrected claim statuses and missing evidence.")
            {
                self.recommended_next_actions.insert(
                    0,
                    "Review corrected claim statuses and missing evidence.".to_owned(),
                );
            }
        }

        Ok(self)
    }
}

fn apply_stricter_evaluation(
    claim: &mut AiClaim,
    evaluation: &claim_verification::ClaimEvaluation,
) {
    if status_rank(&evaluation.status) >= status_rank(&claim.status) {
        claim.status.clone_from(&evaluation.status);
        claim.confidence = claim.confidence.min(evaluation.confidence);
        claim.evidence_ids.clone_from(&evaluation.evidence_ids);
        claim
            .missing_evidence
            .clone_from(&evaluation.missing_evidence);
    }
}

fn status_rank(status: &str) -> u8 {
    match status {
        "verified" => 0,
        "assumption" => 1,
        "missing_evidence" => 2,
        _ => 3,
    }
}

fn is_valid_claim_status(status: &str) -> bool {
    matches!(
        status,
        "verified" | "assumption" | "missing_evidence" | "contradicted"
    )
}

fn is_valid_claim_type(claim_type: &str) -> bool {
    matches!(
        claim_type,
        "financial"
            | "rebate"
            | "tax"
            | "installation"
            | "asset"
            | "schedule"
            | "risk"
            | "readiness"
    )
}

#[cfg(test)]
mod tests {
    use chrono::Utc;

    use crate::db::models::{
        ActivityEvent, AiRun, Asset, Blocker, ClaimEvidenceLink, ClaimWithEvidence,
        EvidenceDocument, Milestone, Organization, ProjectRecord, Site,
    };

    use super::*;

    fn project_record(project_id: Uuid) -> ProjectRecord {
        ProjectRecord {
            id: project_id,
            name: "Solar + Storage".to_owned(),
            stage: "installation".to_owned(),
            health: "yellow".to_owned(),
            system_size_kw_dc: Some(100.0),
            estimated_project_cost_usd: Some(500_000.0),
            estimated_annual_savings_usd: Some(50_000.0),
            estimated_rebate_usd: Some(100_000.0),
            financing_type: Some("PPA".to_owned()),
            ppa_term_years: Some(10),
            target_cod: None,
            owner_name: "Maya Patel".to_owned(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    fn organization() -> Organization {
        Organization {
            id: Uuid::new_v4(),
            name: "Org".to_owned(),
            industry: "Solar".to_owned(),
        }
    }

    fn site(organization_id: Uuid) -> Site {
        Site {
            id: Uuid::new_v4(),
            organization_id,
            name: "Site".to_owned(),
            address: None,
            city: None,
            state: None,
            roof_area_sqft: None,
            utility_provider: None,
        }
    }

    fn evidence(project_id: Uuid, evidence_type: &str) -> EvidenceDocument {
        EvidenceDocument {
            id: Uuid::new_v4(),
            project_id,
            evidence_type: evidence_type.to_owned(),
            title: evidence_type.to_owned(),
            summary: String::new(),
            source_uri: None,
            uploaded_by: "Test".to_owned(),
            effective_date: None,
            created_at: Utc::now(),
        }
    }

    fn blocker(project_id: Uuid, category: &str, severity: &str) -> Blocker {
        Blocker {
            id: Uuid::new_v4(),
            project_id,
            category: category.to_owned(),
            severity: severity.to_owned(),
            title: "Blocker".to_owned(),
            description: "Open blocker".to_owned(),
            owner_name: None,
            status: "open".to_owned(),
            created_at: Utc::now(),
            resolved_at: None,
        }
    }

    fn detail(
        evidence_documents: Vec<EvidenceDocument>,
        blockers: Vec<Blocker>,
        milestones: Vec<Milestone>,
    ) -> ProjectDetail {
        let project_id = evidence_documents
            .first()
            .map_or_else(Uuid::new_v4, |document| document.project_id);
        let organization = organization();
        let site = site(organization.id);
        ProjectDetail {
            project: project_record(project_id),
            organization,
            site,
            milestones,
            assets: Vec::<Asset>::new(),
            evidence: evidence_documents,
            claims: Vec::<ClaimWithEvidence>::new(),
            claim_evidence_links: Vec::<ClaimEvidenceLink>::new(),
            blockers,
            activity_events: Vec::<ActivityEvent>::new(),
            ai_runs: Vec::<AiRun>::new(),
        }
    }

    fn verified_installation_answer(evidence_ids: Vec<Uuid>) -> AiAnswer {
        AiAnswer {
            answer_markdown: "Installation readiness checked.".to_owned(),
            overall_confidence: 0.9,
            claims: vec![AiClaim {
                claim_text: "Installation can start.".to_owned(),
                claim_type: "installation".to_owned(),
                status: "verified".to_owned(),
                confidence: 0.9,
                evidence_ids,
                missing_evidence: Vec::new(),
                reasoning_summary: "AI says permit and interconnection are ready.".to_owned(),
            }],
            recommended_next_actions: vec!["Schedule installation.".to_owned()],
        }
    }

    #[test]
    fn validation_downgrades_installation_claim_missing_equipment_milestone() {
        let project_id = Uuid::new_v4();
        let permit = evidence(project_id, "permit_approval");
        let interconnection = evidence(project_id, "interconnection_approval");
        let evidence_ids = vec![permit.id, interconnection.id];
        let answer = verified_installation_answer(evidence_ids);

        let validated = answer
            .validate_against_project(&detail(
                vec![permit, interconnection],
                Vec::new(),
                Vec::new(),
            ))
            .expect("AI answer validates");
        let claim = &validated.claims[0];

        assert_eq!(claim.status, "missing_evidence");
        assert_eq!(validated.overall_confidence, 0.25);
        assert_eq!(
            validated.answer_markdown,
            "AI answer adjusted by deterministic project verification rules."
        );
        assert!(claim.evidence_ids.is_empty());
        assert!(
            claim
                .missing_evidence
                .contains(&"equipment_ordered".to_owned())
        );
    }

    #[test]
    fn validation_contradicts_installation_claim_with_open_delay_blocker() {
        let project_id = Uuid::new_v4();
        let permit = evidence(project_id, "permit_approval");
        let interconnection = evidence(project_id, "interconnection_approval");
        let evidence_ids = vec![permit.id, interconnection.id];
        let answer = verified_installation_answer(evidence_ids);

        let validated = answer
            .validate_against_project(&detail(
                vec![permit, interconnection],
                vec![blocker(project_id, "interconnection_delay", "medium")],
                Vec::new(),
            ))
            .expect("AI answer validates");

        assert_eq!(validated.claims[0].status, "contradicted");
        assert!(validated.claims[0].evidence_ids.is_empty());
    }
}
