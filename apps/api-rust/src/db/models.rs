use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct ProjectSummaryRow {
    pub id: Uuid,
    pub name: String,
    pub organization_name: String,
    pub site_name: String,
    pub stage: String,
    pub health: String,
    pub estimated_annual_savings_usd: Option<f64>,
    pub estimated_rebate_usd: Option<f64>,
    pub owner_name: String,
    pub open_blocker_count: i64,
    pub target_cod: Option<NaiveDate>,
    pub evidence_types: Vec<String>,
    pub total_count: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct ProjectSummary {
    pub id: Uuid,
    pub name: String,
    pub organization_name: String,
    pub site_name: String,
    pub stage: String,
    pub health: String,
    pub estimated_annual_savings_usd: Option<f64>,
    pub estimated_rebate_usd: Option<f64>,
    pub owner_name: String,
    pub open_blocker_count: i64,
    pub missing_evidence_count: usize,
    pub target_cod: Option<NaiveDate>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct PortfolioHealth {
    pub total_projects: i64,
    pub green: i64,
    pub yellow: i64,
    pub red: i64,
    pub unknown: i64,
    pub blocked_projects: i64,
    pub high_severity_blockers: i64,
    pub missing_financing_evidence: i64,
    pub stale_or_conflicting_projects: i64,
    pub estimated_annual_savings_usd: f64,
    pub estimated_rebates_usd: f64,
    pub projects_ready_for_financing_review: i64,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct ProjectRecord {
    pub id: Uuid,
    pub name: String,
    pub stage: String,
    pub health: String,
    pub system_size_kw_dc: Option<f64>,
    pub estimated_project_cost_usd: Option<f64>,
    pub estimated_annual_savings_usd: Option<f64>,
    pub estimated_rebate_usd: Option<f64>,
    pub financing_type: Option<String>,
    pub ppa_term_years: Option<i32>,
    pub target_cod: Option<NaiveDate>,
    pub owner_name: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct Organization {
    pub id: Uuid,
    pub name: String,
    pub industry: String,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct Site {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub name: String,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub roof_area_sqft: Option<i32>,
    pub utility_provider: Option<String>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct Milestone {
    pub id: Uuid,
    pub project_id: Uuid,
    pub milestone_type: String,
    pub status: String,
    pub planned_date: Option<NaiveDate>,
    pub actual_date: Option<NaiveDate>,
    pub owner_name: Option<String>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct Asset {
    pub id: Uuid,
    pub project_id: Uuid,
    pub asset_type: String,
    pub manufacturer: Option<String>,
    pub model: Option<String>,
    pub serial_number: Option<String>,
    pub capacity_kw: Option<f64>,
    pub status: String,
    pub installed_at: Option<NaiveDate>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct EvidenceDocument {
    pub id: Uuid,
    pub project_id: Uuid,
    pub evidence_type: String,
    pub title: String,
    pub summary: String,
    pub source_uri: Option<String>,
    pub uploaded_by: String,
    pub effective_date: Option<NaiveDate>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct Claim {
    pub id: Uuid,
    pub project_id: Uuid,
    pub claim_text: String,
    pub claim_type: String,
    pub status: String,
    pub confidence: f64,
    pub generated_by: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct LinkedEvidence {
    pub id: Uuid,
    pub title: String,
    pub evidence_type: String,
    pub support_type: String,
}

#[derive(Debug, Clone, FromRow)]
pub struct LinkedEvidenceRow {
    pub claim_id: Uuid,
    pub id: Uuid,
    pub title: String,
    pub evidence_type: String,
    pub support_type: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ClaimWithEvidence {
    pub id: Uuid,
    pub project_id: Uuid,
    pub claim_text: String,
    pub claim_type: String,
    pub status: String,
    pub confidence: f64,
    pub generated_by: String,
    pub created_at: DateTime<Utc>,
    pub evidence: Vec<LinkedEvidence>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct GlobalClaim {
    pub id: Uuid,
    pub project_id: Uuid,
    pub project_name: String,
    pub claim_text: String,
    pub claim_type: String,
    pub status: String,
    pub confidence: f64,
    pub evidence_count: i64,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow)]
pub struct GlobalClaimRow {
    pub id: Uuid,
    pub project_id: Uuid,
    pub project_name: String,
    pub claim_text: String,
    pub claim_type: String,
    pub status: String,
    pub confidence: f64,
    pub evidence_count: i64,
    pub created_at: DateTime<Utc>,
    pub total_count: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct PaginatedResponse<T> {
    pub items: Vec<T>,
    pub next_cursor: Option<String>,
    pub total: i64,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct ClaimEvidenceLink {
    pub claim_id: Uuid,
    pub evidence_id: Uuid,
    pub support_type: String,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct Blocker {
    pub id: Uuid,
    pub project_id: Uuid,
    pub category: String,
    pub severity: String,
    pub title: String,
    pub description: String,
    pub owner_name: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub resolved_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct ActivityEvent {
    pub id: Uuid,
    pub project_id: Uuid,
    pub event_type: String,
    pub actor: String,
    pub description: String,
    pub metadata: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct AiRun {
    pub id: Uuid,
    pub project_id: Uuid,
    pub question: String,
    pub answer: String,
    pub model_name: Option<String>,
    pub input_record_ids: Option<serde_json::Value>,
    pub output_claim_ids: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ProjectDetail {
    pub project: ProjectRecord,
    pub organization: Organization,
    pub site: Site,
    pub milestones: Vec<Milestone>,
    pub assets: Vec<Asset>,
    pub evidence: Vec<EvidenceDocument>,
    pub claims: Vec<ClaimWithEvidence>,
    pub claim_evidence_links: Vec<ClaimEvidenceLink>,
    pub blockers: Vec<Blocker>,
    pub activity_events: Vec<ActivityEvent>,
    pub ai_runs: Vec<AiRun>,
}

#[derive(Debug, Deserialize)]
pub struct ProjectFilters {
    pub stage: Option<String>,
    pub health: Option<String>,
    pub owner: Option<String>,
    pub has_open_blockers: Option<bool>,
    pub limit: Option<i64>,
    pub cursor: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ClaimFilters {
    pub status: Option<String>,
    pub claim_type: Option<String>,
    pub project_id: Option<Uuid>,
    pub limit: Option<i64>,
    pub cursor: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct StageUpdateRequest {
    pub stage: String,
    pub actor: String,
    pub reason: String,
}

#[derive(Debug, Deserialize)]
pub struct EvidenceCreateRequest {
    pub evidence_type: String,
    pub title: String,
    pub summary: String,
    pub source_uri: Option<String>,
    pub effective_date: Option<NaiveDate>,
    pub uploaded_by: String,
}

#[derive(Debug, Deserialize)]
pub struct ClaimReverifyRequest {
    pub actor: String,
}

#[derive(Debug, Deserialize)]
pub struct BlockerUpdateRequest {
    pub status: String,
    pub actor: String,
    pub resolution_note: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AiAskRequestBody {
    pub question: String,
    pub actor: String,
}
