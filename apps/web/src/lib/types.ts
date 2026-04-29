export type ProjectStage =
  | "intake"
  | "site_survey"
  | "design"
  | "incentive_review"
  | "rebate_submitted"
  | "financing_review"
  | "permitting"
  | "procurement"
  | "installation"
  | "commissioning"
  | "monitoring"
  | "on_hold"
  | "cancelled";

export type ProjectHealth = "green" | "yellow" | "red" | "unknown";

export type ClaimStatus =
  | "verified"
  | "assumption"
  | "missing_evidence"
  | "contradicted";

export type ProjectSummary = {
  id: string;
  name: string;
  organization_name: string;
  site_name: string;
  stage: ProjectStage;
  health: ProjectHealth;
  owner_name: string;
  open_blocker_count: number;
  missing_evidence_count: number;
  target_cod: string | null;
  estimated_annual_savings_usd: number | null;
  estimated_rebate_usd: number | null;
};

export type PortfolioHealth = {
  total_projects: number;
  open_blockers: number;
  estimated_annual_savings_usd: number;
  estimated_rebates_usd: number;
  projects_ready_for_financing_review: number;
  red_projects: number;
  high_severity_blockers: number;
  missing_financing_evidence: number;
  stale_or_conflicting_projects: number;
};

export type FinancingReadinessStatus =
  | "ready"
  | "blocked"
  | "needs_evidence"
  | "unknown";

export type MilestoneStatus = "planned" | "in_progress" | "done" | "blocked";

export type BlockerSeverity = "low" | "medium" | "high";

export type Blocker = {
  id: string;
  category: string;
  severity: BlockerSeverity;
  owner_name: string;
  description: string;
  is_open: boolean;
};

export type Evidence = {
  id: string;
  evidence_type: string;
  title: string;
  summary: string;
  effective_date: string | null;
  source_uri: string;
};

export type Asset = {
  id: string;
  asset_type: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  capacity_kw: number | null;
  status: string;
};

export type Milestone = {
  id: string;
  milestone_type: string;
  status: MilestoneStatus;
  planned_date: string | null;
  actual_date: string | null;
  owner_name: string;
};

export type Claim = {
  id: string;
  project_id: string;
  project_name: string;
  claim_text: string;
  claim_type: string;
  status: ClaimStatus;
  confidence: number;
  evidence_count: number;
  created_at: string;
};

export type ActivityEvent = {
  id: string;
  event_type: string;
  actor: string;
  description: string;
  timestamp: string;
};

export type AiClaimBreakdown = {
  id: string;
  text: string;
  status: ClaimStatus;
  confidence: number;
  evidence_ids: string[];
};

export type AiAnswer = {
  answer_text: string;
  overall_confidence: number;
  claims: AiClaimBreakdown[];
  evidence_links: Evidence[];
  missing_evidence: string[];
  recommended_next_actions: string[];
};

export type ProjectDetail = ProjectSummary & {
  financing_type: string | null;
  ppa_term_months: number | null;
  financing_readiness_status: FinancingReadinessStatus;
  project_cost_usd: number | null;
  milestones: Milestone[];
  blockers: Blocker[];
  evidence: Evidence[];
  assets: Asset[];
  claims: Claim[];
  activity_log: ActivityEvent[];
};

export type DashboardFilters = {
  stage: string;
  health: string;
  owner: string;
  hasOpenBlockers: boolean;
};

export type ClaimsFilters = {
  status: string;
  claimType: string;
  projectId: string;
};

export type ApiResult<T> = {
  data: T;
  warning?: string;
};
