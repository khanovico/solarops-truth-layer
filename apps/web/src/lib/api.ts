import {
  addMockEvidence,
  askMockAi,
  getMockClaims,
  getMockPortfolioHealth,
  getMockProjectDetail,
  getMockProjects,
  reverifyMockClaim,
  resolveMockBlocker,
} from "./mockData";
import type {
  AiAnswer,
  AiClaimBreakdown,
  ApiResult,
  Claim,
  ClaimsFilters,
  DashboardFilters,
  Evidence,
  PaginatedResponse,
  PortfolioHealth,
  ProjectDetail,
  ProjectSummary,
} from "./types";

export type ApiClient = ReturnType<typeof createApiClient>;

type FetchLike = typeof fetch;

type RequestOptions = RequestInit & {
  fallback: () => unknown;
  warning: string;
  allowFallback?: boolean;
};

function getApiBaseUrl() {
  return (
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.VITE_API_BASE_URL) ||
    "http://localhost:8080"
  );
}

function shouldUseFallback() {
  if (typeof import.meta === "undefined" || !import.meta.env) {
    return false;
  }

  return (
    import.meta.env.VITE_ENABLE_MOCK_FALLBACK === "true" ||
    import.meta.env.DEV ||
    import.meta.env.MODE === "test"
  );
}

export function createApiClient(fetchImpl: FetchLike = fetch) {
  const baseUrl = getApiBaseUrl();

  async function request<T>(path: string, options: RequestOptions): Promise<ApiResult<T>> {
    try {
      const response = await fetchImpl(`${baseUrl}${path}`, {
        headers: {
          "Content-Type": "application/json",
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const data = (await response.json()) as T;
      return { data };
    } catch (error) {
      if (options.allowFallback ?? shouldUseFallback()) {
        return {
          data: options.fallback() as T,
          warning: options.warning,
        };
      }
      throw error;
    }
  }

  async function requestProjectDetail(path: string, options: RequestOptions): Promise<ApiResult<ProjectDetail>> {
    const result = await request<unknown>(path, options);
    return { ...result, data: normalizeProjectDetail(result.data) };
  }

  async function requestClaim(path: string, options: RequestOptions): Promise<ApiResult<Claim>> {
    const result = await request<unknown>(path, options);
    return { ...result, data: normalizeClaim(result.data) };
  }

  function projectListPage(input: unknown): PaginatedResponse<ProjectSummary> {
    if (Array.isArray(input)) {
      const items = input as ProjectSummary[];
      return { items, next_cursor: null, total: items.length };
    }
    if (input && typeof input === "object" && "items" in input) {
      const page = input as Partial<PaginatedResponse<ProjectSummary>>;
      return {
        items: page.items ?? [],
        next_cursor: page.next_cursor ?? null,
        total: page.total ?? page.items?.length ?? 0,
      };
    }
    return { items: [], next_cursor: null, total: 0 };
  }

  function claimsPage(input: unknown): PaginatedResponse<unknown> {
    if (Array.isArray(input)) {
      return { items: input, next_cursor: null, total: input.length };
    }
    if (input && typeof input === "object" && "items" in input) {
      const page = input as Partial<PaginatedResponse<unknown>>;
      return {
        items: page.items ?? [],
        next_cursor: page.next_cursor ?? null,
        total: page.total ?? page.items?.length ?? 0,
      };
    }
    return { items: [], next_cursor: null, total: 0 };
  }

  return {
    async getPortfolioHealth() {
      const result = await request<unknown>("/portfolio/health", {
        method: "GET",
        fallback: getMockPortfolioHealth,
        warning: "Live portfolio health unavailable. Showing seeded fallback data.",
      });
      return { ...result, data: normalizePortfolioHealth(result.data) };
    },
    async getProjects(filters?: DashboardFilters, cursor?: string | null) {
      const params = new URLSearchParams({ limit: "100" });
      if (cursor) {
        params.set("cursor", cursor);
      }
      if (filters?.stage) {
        params.set("stage", filters.stage);
      }
      if (filters?.health) {
        params.set("health", filters.health);
      }
      if (filters?.owner) {
        params.set("owner", filters.owner);
      }
      if (filters?.hasOpenBlockers) {
        params.set("has_open_blockers", "true");
      }
      const result = await request<unknown>(`/projects?${params.toString()}`, {
        method: "GET",
        fallback: getMockProjects,
        warning: "Live project list unavailable. Showing seeded fallback data.",
      });
      return { ...result, data: projectListPage(result.data) };
    },
    async getProject(projectId: string) {
      const result = await request<unknown>(`/projects/${projectId}`, {
        method: "GET",
        fallback: () => getMockProjectDetail(projectId),
        warning: "Live project detail unavailable. Showing seeded fallback data.",
      });
      return { ...result, data: normalizeProjectDetail(result.data) };
    },
    async getClaims(filters?: ClaimsFilters, cursor?: string | null) {
      const params = new URLSearchParams({ limit: "100" });
      if (cursor) {
        params.set("cursor", cursor);
      }
      if (filters?.status) {
        params.set("status", filters.status);
      }
      if (filters?.claimType) {
        params.set("claim_type", filters.claimType);
      }
      if (filters?.projectId) {
        params.set("project_id", filters.projectId);
      }
      const result = await request<unknown>(`/claims?${params.toString()}`, {
        method: "GET",
        fallback: getMockClaims,
        warning: "Live claim ledger unavailable. Showing seeded fallback data.",
      });
      const page = claimsPage(result.data);
      return {
        ...result,
        data: {
          ...page,
          items: page.items.map((claim) => normalizeClaim(claim)),
        },
      };
    },
    async askProjectAi(projectId: string, question: string) {
      const result = await request<unknown>(`/projects/${projectId}/ai/ask`, {
        method: "POST",
        body: JSON.stringify({ question, actor: "Demo User" }),
        fallback: () => askMockAi(projectId),
        warning: "Live AI endpoint unavailable. Using deterministic fallback answer.",
      });
      return { ...result, data: normalizeAiAnswer(result.data) };
    },
    async addMockEvidence(projectId: string, evidenceType: string) {
      return requestProjectDetail(`/projects/${projectId}/evidence`, {
        method: "POST",
        body: JSON.stringify({
          evidence_type: evidenceType,
          title: titleForEvidence(evidenceType),
          summary: `Mock ${evidenceType.split("_").join(" ")} evidence added from the demo UI.`,
          source_uri: `mock://docs/${evidenceType}.pdf`,
          effective_date: new Date().toISOString().slice(0, 10),
          uploaded_by: "Demo User",
        }),
        fallback: () => addMockEvidence(projectId, evidenceType),
        warning: "Evidence API unavailable. Added fallback mock evidence locally.",
      });
    },
    async resolveBlocker(projectId: string, blockerId: string) {
      return request<{ ok: boolean }>(`/blockers/${blockerId}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "resolved",
          actor: "Demo User",
          resolution_note: `Resolved from project ${projectId}.`,
        }),
        fallback: () => {
          resolveMockBlocker(projectId, blockerId);
          return { ok: true };
        },
        warning: "Blocker API unavailable. Resolved blocker in fallback store.",
      });
    },
    async reverifyClaim(projectId: string, claimId: string) {
      const result = await requestClaim(`/projects/${projectId}/claims/${claimId}/reverify`, {
        method: "POST",
        body: JSON.stringify({ actor: "Demo User" }),
        fallback: () => reverifyMockClaim(projectId, claimId),
        warning: "Claim reverification unavailable. Recomputed claim in fallback store.",
      });
      return { ...result, data: normalizeClaim(result.data, projectId) };
    },
  };
}

function normalizePortfolioHealth(input: unknown): PortfolioHealth {
  const data = input as Partial<PortfolioHealth> & {
    open_blockers?: number;
    red_projects?: number;
  };

  return {
    total_projects: data.total_projects ?? 0,
    blocked_projects: data.blocked_projects ?? data.open_blockers ?? 0,
    green: data.green ?? 0,
    yellow: data.yellow ?? 0,
    red: data.red ?? data.red_projects ?? 0,
    unknown: data.unknown ?? 0,
    estimated_annual_savings_usd: data.estimated_annual_savings_usd ?? 0,
    estimated_rebates_usd: data.estimated_rebates_usd ?? 0,
    projects_ready_for_financing_review: data.projects_ready_for_financing_review ?? 0,
    high_severity_blockers: data.high_severity_blockers ?? 0,
    missing_financing_evidence: data.missing_financing_evidence ?? 0,
    stale_or_conflicting_projects: data.stale_or_conflicting_projects ?? 0,
  };
}

function normalizeProjectDetail(input: unknown): ProjectDetail {
  if (!input || typeof input !== "object" || !("project" in input)) {
    return input as ProjectDetail;
  }

  const detail = input as {
    project: Record<string, unknown>;
    organization: Record<string, unknown>;
    site: Record<string, unknown>;
    milestones: Record<string, unknown>[];
    blockers: Record<string, unknown>[];
    evidence: Record<string, unknown>[];
    assets: Record<string, unknown>[];
    claims: Record<string, unknown>[];
    activity_events: Record<string, unknown>[];
  };
  const project = detail.project;

  const claims = detail.claims.map((claim) =>
    normalizeClaim(claim, String(project.id), String(project.name)),
  );

  return {
    id: String(project.id),
    name: String(project.name),
    organization_name: String(detail.organization.name),
    site_name: String(detail.site.name),
    stage: project.stage as ProjectSummary["stage"],
    health: project.health as ProjectSummary["health"],
    owner_name: String(project.owner_name),
    open_blocker_count: detail.blockers.filter((blocker) => blocker.status === "open").length,
    missing_evidence_count: claims.filter((claim) => claim.status === "missing_evidence").length,
    target_cod: nullableString(project.target_cod),
    estimated_annual_savings_usd: nullableNumber(project.estimated_annual_savings_usd),
    estimated_rebate_usd: nullableNumber(project.estimated_rebate_usd),
    financing_type: nullableString(project.financing_type),
    ppa_term_years: nullableNumber(project.ppa_term_years),
    financing_readiness_status: claims.some((claim) => claim.status === "contradicted")
      ? "blocked"
      : claims.some((claim) => claim.status === "missing_evidence")
        ? "needs_evidence"
        : "unknown",
    project_cost_usd: nullableNumber(project.estimated_project_cost_usd),
    milestones: detail.milestones.map((milestone) => ({
      id: String(milestone.id),
      milestone_type: String(milestone.milestone_type),
      status: milestone.status as ProjectDetail["milestones"][number]["status"],
      planned_date: nullableString(milestone.planned_date),
      actual_date: nullableString(milestone.actual_date),
      owner_name: String(milestone.owner_name ?? ""),
    })),
    blockers: detail.blockers.map((blocker) => ({
      id: String(blocker.id),
      category: String(blocker.category),
      title: String(blocker.title ?? blocker.category),
      severity: blocker.severity as ProjectDetail["blockers"][number]["severity"],
      owner_name: nullableString(blocker.owner_name),
      description: String(blocker.description),
      is_open: blocker.status === "open",
      status: String(blocker.status),
    })),
    evidence: detail.evidence.map((item) => normalizeEvidence(item)),
    assets: detail.assets.map((asset) => ({
      id: String(asset.id),
      asset_type: String(asset.asset_type),
      manufacturer: String(asset.manufacturer ?? ""),
      model: String(asset.model ?? ""),
      serial_number: String(asset.serial_number ?? ""),
      capacity_kw: nullableNumber(asset.capacity_kw),
      status: String(asset.status),
    })),
    claims,
    activity_log: detail.activity_events.map((event) => ({
      id: String(event.id),
      event_type: String(event.event_type),
      actor: String(event.actor),
      description: String(event.description),
      timestamp: String(event.created_at),
    })),
  };
}

function normalizeClaim(input: unknown, projectId = "", projectName = ""): Claim {
  const claim = input as Record<string, unknown>;
  const evidence = Array.isArray(claim.evidence) ? claim.evidence : [];
  return {
    id: String(claim.id),
    project_id: String(claim.project_id ?? projectId),
    project_name: String(claim.project_name ?? projectName),
    claim_text: String(claim.claim_text),
    claim_type: String(claim.claim_type),
    status: claim.status as Claim["status"],
    confidence: Number(claim.confidence ?? 0),
    evidence_count: Number(claim.evidence_count ?? evidence.length),
    created_at: String(claim.created_at ?? new Date().toISOString()),
  };
}

function normalizeEvidence(input: Record<string, unknown>): Evidence {
  return {
    id: String(input.id),
    evidence_type: String(input.evidence_type),
    title: String(input.title),
    summary: String(input.summary),
    effective_date: nullableString(input.effective_date),
    source_uri: nullableString(input.source_uri),
  };
}

function normalizeAiAnswer(input: unknown): AiAnswer {
  if (!input || typeof input !== "object" || "answer_text" in input) {
    return input as AiAnswer;
  }

  const answer = input as {
    answer_markdown?: string;
    overall_confidence?: number;
    claims?: Array<Record<string, unknown>>;
    recommended_next_actions?: string[];
  };
  const claims: AiClaimBreakdown[] = (answer.claims ?? []).map((claim, index) => ({
    id: String(claim.id ?? `ai-claim-${index}`),
    text: String(claim.claim_text ?? ""),
    status: claim.status as AiClaimBreakdown["status"],
    confidence: Number(claim.confidence ?? 0),
    evidence_ids: Array.isArray(claim.evidence_ids) ? claim.evidence_ids.map(String) : [],
  }));

  return {
    answer_text: answer.answer_markdown ?? "",
    overall_confidence: answer.overall_confidence ?? 0,
    claims,
    evidence_links: [],
    missing_evidence: Array.from(
      new Set(
        (answer.claims ?? []).flatMap((claim) =>
          Array.isArray(claim.missing_evidence) ? claim.missing_evidence.map(String) : [],
        ),
      ),
    ),
    recommended_next_actions: answer.recommended_next_actions ?? [],
  };
}

function nullableString(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value);
}

function nullableNumber(value: unknown): number | null {
  return value === null || value === undefined ? null : Number(value);
}

function titleForEvidence(evidenceType: string) {
  return evidenceType
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}
