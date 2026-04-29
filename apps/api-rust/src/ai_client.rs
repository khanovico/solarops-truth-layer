use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    db::models::ProjectDetail,
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

        for claim in &mut self.claims {
            if !is_valid_claim_status(&claim.status)
                || !is_valid_claim_type(&claim.claim_type)
                || !(0.0..=1.0).contains(&claim.confidence)
            {
                return Err(AppError::AiResponseInvalid);
            }
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
        }

        Ok(self)
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
