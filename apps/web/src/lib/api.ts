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
  ApiResult,
  Claim,
  Evidence,
  PortfolioHealth,
  ProjectDetail,
  ProjectSummary,
} from "./types";

export type ApiClient = ReturnType<typeof createApiClient>;

type FetchLike = typeof fetch;

type RequestOptions = RequestInit & {
  fallback: () => unknown;
  warning: string;
};

function getApiBaseUrl() {
  return (
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.VITE_API_BASE_URL) ||
    "http://localhost:8080"
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
    } catch {
      return {
        data: options.fallback() as T,
        warning: options.warning,
      };
    }
  }

  return {
    async getPortfolioHealth() {
      return request<PortfolioHealth>("/portfolio/health", {
        method: "GET",
        fallback: getMockPortfolioHealth,
        warning: "Live portfolio health unavailable. Showing seeded fallback data.",
      });
    },
    async getProjects() {
      return request<ProjectSummary[]>("/projects", {
        method: "GET",
        fallback: getMockProjects,
        warning: "Live project list unavailable. Showing seeded fallback data.",
      });
    },
    async getProject(projectId: string) {
      return request<ProjectDetail>(`/projects/${projectId}`, {
        method: "GET",
        fallback: () => getMockProjectDetail(projectId),
        warning: "Live project detail unavailable. Showing seeded fallback data.",
      });
    },
    async getClaims() {
      return request<Claim[]>("/claims", {
        method: "GET",
        fallback: getMockClaims,
        warning: "Live claim ledger unavailable. Showing seeded fallback data.",
      });
    },
    async askProjectAi(projectId: string, question: string) {
      return request<AiAnswer>(`/projects/${projectId}/ai/ask`, {
        method: "POST",
        body: JSON.stringify({ question }),
        fallback: () => askMockAi(projectId),
        warning: "Live AI endpoint unavailable. Using deterministic fallback answer.",
      });
    },
    async addMockEvidence(projectId: string, evidenceType: string) {
      return request<Evidence>(`/projects/${projectId}/evidence/mock`, {
        method: "POST",
        body: JSON.stringify({ evidence_type: evidenceType }),
        fallback: () => addMockEvidence(projectId, evidenceType),
        warning: "Evidence API unavailable. Added fallback mock evidence locally.",
      });
    },
    async resolveBlocker(projectId: string, blockerId: string) {
      return request<{ ok: boolean }>(`/projects/${projectId}/blockers/${blockerId}/resolve`, {
        method: "POST",
        fallback: () => {
          resolveMockBlocker(projectId, blockerId);
          return { ok: true };
        },
        warning: "Blocker API unavailable. Resolved blocker in fallback store.",
      });
    },
    async reverifyClaim(projectId: string, claimId: string) {
      return request<Claim>(`/projects/${projectId}/claims/${claimId}/reverify`, {
        method: "POST",
        fallback: () => reverifyMockClaim(projectId, claimId),
        warning: "Claim reverification unavailable. Recomputed claim in fallback store.",
      });
    },
  };
}
