import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ApiProvider } from "../lib/api-context";
import { createApiClient } from "../lib/api";
import type {
  AiAnswer,
  Claim,
  Evidence,
  PaginatedResponse,
  PortfolioHealth,
  ProjectDetail,
  ProjectSummary,
} from "../lib/types";
import { ClaimStatusBadge } from "../components/ClaimStatusBadge";
import { ClaimLedger } from "../routes/ClaimLedger";
import { Dashboard } from "../routes/Dashboard";
import { ProjectDetail as ProjectDetailRoute } from "../routes/ProjectDetail";

const portfolio: PortfolioHealth = {
  total_projects: 3,
  blocked_projects: 3,
  green: 1,
  yellow: 1,
  red: 1,
  unknown: 0,
  estimated_annual_savings_usd: 1320000,
  estimated_rebates_usd: 515000,
  projects_ready_for_financing_review: 1,
  high_severity_blockers: 2,
  missing_financing_evidence: 2,
  stale_or_conflicting_projects: 1,
};

const projects: ProjectSummary[] = [
  {
    id: "alpha",
    name: "Project Alpha",
    organization_name: "Northwind Foods",
    site_name: "Oakland Cold Storage",
    stage: "financing_review",
    health: "yellow",
    owner_name: "A. Rivera",
    open_blocker_count: 1,
    missing_evidence_count: 1,
    target_cod: "2026-10-10",
    estimated_annual_savings_usd: 420000,
    estimated_rebate_usd: 180000,
  },
  {
    id: "bravo",
    name: "Project Bravo",
    organization_name: "Evergreen Transit",
    site_name: "San Jose Yard",
    stage: "procurement",
    health: "green",
    owner_name: "L. Gomez",
    open_blocker_count: 0,
    missing_evidence_count: 0,
    target_cod: "2026-08-30",
    estimated_annual_savings_usd: 310000,
    estimated_rebate_usd: 95000,
  },
];

const claims: Claim[] = [
  {
    id: "claim-1",
    project_id: "alpha",
    project_name: "Project Alpha",
    claim_text: "Rebate evidence complete.",
    claim_type: "rebate",
    status: "missing_evidence",
    confidence: 0.41,
    evidence_count: 0,
    created_at: "2026-04-25T12:00:00.000Z",
  },
];

const answer: AiAnswer = {
  answer_text: "Project needs rebate award evidence before financing review.",
  overall_confidence: 0.64,
  claims: [
    {
      id: "ai-1",
      text: "Project is ready for financing review.",
      status: "missing_evidence",
      confidence: 0.44,
      evidence_ids: [],
    },
  ],
  evidence_links: [],
  missing_evidence: ["Rebate award letter"],
  recommended_next_actions: ["Upload rebate award letter"],
};

const projectDetail: ProjectDetail = {
  ...projects[0],
  financing_type: "PPA",
  ppa_term_years: 15,
  financing_readiness_status: "needs_evidence",
  project_cost_usd: 2200000,
  milestones: [],
  blockers: [],
  evidence: [] as Evidence[],
  assets: [],
  claims,
  activity_log: [],
};

function page<T>(items: T[], nextCursor: string | null = null, total = items.length): PaginatedResponse<T> {
  return {
    items,
    next_cursor: nextCursor,
    total,
  };
}

function renderWithApi(
  ui: ReactNode,
  overrides?: Partial<ReturnType<typeof createApiClient>>,
  initialEntries: string[] = ["/"],
) {
  const api = {
    getPortfolioHealth: async () => ({ data: portfolio }),
    getProjects: async () => ({ data: page(projects) }),
    getProject: async () => ({ data: projectDetail }),
    getClaims: async () => ({ data: page(claims) }),
    askProjectAi: async () => ({ data: answer }),
    addMockEvidence: async () => ({ data: projectDetail }),
    resolveBlocker: async () => ({ data: { ok: true } }),
    reverifyClaim: async () => ({ data: claims[0] }),
    ...overrides,
  };

  return render(
    <ApiProvider api={api}>
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </ApiProvider>,
  );
}

test("renders_dashboard_kpis", async () => {
  renderWithApi(<Dashboard />);

  const totalProjectsCard = (await screen.findByText("Total projects")).closest("section");
  const blockersCard = screen.getAllByText("Blocked projects")[0].closest("section");
  const savingsCard = screen.getByText("Estimated annual savings").closest("section");
  const rebatesCard = screen.getByText("Estimated rebates").closest("section");

  expect(within(totalProjectsCard!).getByText("3")).toBeInTheDocument();
  expect(within(blockersCard!).getByText("3")).toBeInTheDocument();
  expect(within(savingsCard!).getByText("$1,320,000")).toBeInTheDocument();
  expect(within(rebatesCard!).getByText("$515,000")).toBeInTheDocument();
});

test("renders_project_health_badges", async () => {
  renderWithApi(<Dashboard />);

  const table = (await screen.findByText("Project Alpha")).closest("table");
  expect(within(table!).getByText("yellow")).toBeInTheDocument();
  expect(within(table!).getByText("green")).toBeInTheDocument();
});

test("loads_more_projects_when_next_page_exists", async () => {
  const nextProject: ProjectSummary = {
    ...projects[1],
    id: "charlie",
    name: "Project Charlie",
  };
  const getProjects = vi.fn(async (_filters: unknown, cursor?: string | null) => ({
    data: cursor === "2" ? page([nextProject], null, 3) : page(projects, "2", 3),
  }));

  renderWithApi(<Dashboard />, { getProjects });

  expect(await screen.findByText(/Showing 2 of 3/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Load more projects" }));

  expect(await screen.findByText("Project Charlie")).toBeInTheDocument();
  expect(screen.getByText(/Showing 3 of 3/)).toBeInTheDocument();
  expect(getProjects).toHaveBeenLastCalledWith(expect.any(Object), "2");
});

test("renders_claim_status_badges", () => {
  render(<ClaimStatusBadge status="missing_evidence" />);
  expect(screen.getByText("Missing Evidence")).toBeInTheDocument();
});

test("loads_more_claims_when_next_page_exists", async () => {
  const nextClaim: Claim = {
    ...claims[0],
    id: "claim-2",
    claim_text: "Installation can start.",
    claim_type: "installation",
    status: "missing_evidence",
  };
  const getClaims = vi.fn(async (_filters: unknown, cursor?: string | null) => ({
    data: cursor === "1" ? page([nextClaim], null, 2) : page(claims, "1", 2),
  }));

  renderWithApi(<ClaimLedger />, { getClaims });

  expect(await screen.findByText(/Showing 1 of 2/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Load more claims" }));

  expect(await screen.findByText("Installation can start.")).toBeInTheDocument();
  expect(screen.getByText(/Showing 2 of 2/)).toBeInTheDocument();
  expect(getClaims).toHaveBeenLastCalledWith(expect.any(Object), "1");
});

test("renders_ai_missing_evidence", async () => {
  renderWithApi(
    <Routes>
      <Route path="/projects/:id" element={<ProjectDetailRoute />} />
    </Routes>,
    undefined,
    ["/projects/alpha"],
  );

  await screen.findByText("Project Alpha");
  await userEvent.click(screen.getByRole("button", { name: "Ask question" }));

  expect(await screen.findByText("Rebate award letter", undefined, { timeout: 3000 })).toBeInTheDocument();
  expect(screen.getByText("Upload rebate award letter")).toBeInTheDocument();
});

test("filters_projects_by_health", async () => {
  renderWithApi(<Dashboard />);

  await screen.findByText("Project Alpha");
  const healthSelect = screen.getByLabelText("Health");
  await userEvent.selectOptions(healthSelect, "green");

  await waitFor(() => {
    expect(screen.queryByText("Project Alpha")).not.toBeInTheDocument();
  });

  const table = screen.getByRole("table");
  expect(within(table).getByText("Project Bravo")).toBeInTheDocument();
});
