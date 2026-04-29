import type {
  ActivityEvent,
  AiAnswer,
  Claim,
  ClaimStatus,
  Evidence,
  PortfolioHealth,
  ProjectDetail,
  ProjectSummary,
} from "./types";

type MockStore = {
  portfolioHealth: PortfolioHealth;
  projects: ProjectSummary[];
  projectDetails: Record<string, ProjectDetail>;
};

function makeAiAnswer(project: ProjectDetail): AiAnswer {
  const hasRebateAward = project.evidence.some(
    (item) => item.evidence_type === "rebate_award_letter",
  );
  const hasHighBlocker = project.blockers.some(
    (blocker) => blocker.is_open && blocker.severity === "high",
  );
  const missingEvidence = hasRebateAward ? [] : ["Rebate award letter"];

  return {
    answer_text: hasHighBlocker
      ? "Financing review is blocked by open high-severity blockers and missing proof."
      : hasRebateAward
        ? "Project is materially ready for financing review. Remaining checks are routine."
        : "Project is close, but financing review still needs rebate award evidence.",
    overall_confidence: hasRebateAward && !hasHighBlocker ? 0.87 : 0.62,
    claims: [
      {
        id: `${project.id}-claim-financing`,
        text: "Project is ready for financing review.",
        status: hasHighBlocker
          ? "contradicted"
          : hasRebateAward
            ? "verified"
            : "missing_evidence",
        confidence: hasRebateAward && !hasHighBlocker ? 0.88 : 0.49,
        evidence_ids: hasRebateAward
          ? project.evidence
              .filter((item) => item.evidence_type === "rebate_award_letter")
              .map((item) => item.id)
          : [],
      },
      {
        id: `${project.id}-claim-savings`,
        text: "Estimated annual savings remain within tolerance.",
        status: "assumption",
        confidence: 0.68,
        evidence_ids: [],
      },
    ],
    evidence_links: project.evidence.slice(0, 3),
    missing_evidence: missingEvidence,
    recommended_next_actions: hasHighBlocker
      ? ["Resolve interconnection blocker", "Confirm utility approvals"]
      : hasRebateAward
        ? ["Prepare financing memo", "Schedule lender review"]
        : ["Upload rebate award letter", "Re-run financing readiness check"],
  };
}

function createClaims(projectId: string, projectName: string, evidenceCount = 0): Claim[] {
  return [
    {
      id: `${projectId}-claim-1`,
      project_id: projectId,
      project_name: projectName,
      claim_text: "Rebate award evidence is complete.",
      claim_type: "rebate",
      status: evidenceCount > 0 ? "verified" : "missing_evidence",
      confidence: evidenceCount > 0 ? 0.92 : 0.46,
      evidence_count: evidenceCount,
      created_at: "2026-04-22T18:00:00.000Z",
    },
    {
      id: `${projectId}-claim-2`,
      project_id: projectId,
      project_name: projectName,
      claim_text: "Project can enter financing review this week.",
      claim_type: "financing",
      status: evidenceCount > 0 ? "assumption" : "contradicted",
      confidence: evidenceCount > 0 ? 0.59 : 0.22,
      evidence_count: evidenceCount,
      created_at: "2026-04-25T18:00:00.000Z",
    },
  ];
}

const alphaEvidence: Evidence[] = [
  {
    id: "ev-alpha-1",
    evidence_type: "utility_bill",
    title: "Utility bill Q1",
    summary: "Twelve month load baseline.",
    effective_date: "2026-03-01",
    source_uri: "s3://solarops/project-alpha/utility-bill-q1.pdf",
  },
];

const alphaProject: ProjectDetail = {
  id: "project-alpha",
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
  financing_type: "PPA",
  ppa_term_months: 180,
  financing_readiness_status: "needs_evidence",
  project_cost_usd: 2200000,
  milestones: [
    {
      id: "alpha-ms-1",
      milestone_type: "Site survey",
      status: "done",
      planned_date: "2026-02-10",
      actual_date: "2026-02-12",
      owner_name: "J. Singh",
    },
    {
      id: "alpha-ms-2",
      milestone_type: "Financing review",
      status: "in_progress",
      planned_date: "2026-05-15",
      actual_date: null,
      owner_name: "A. Rivera",
    },
  ],
  blockers: [
    {
      id: "alpha-bl-1",
      category: "Interconnection",
      severity: "high",
      owner_name: "M. Chen",
      description: "Awaiting utility approval package revision.",
      is_open: true,
    },
  ],
  evidence: alphaEvidence,
  assets: [
    {
      id: "alpha-asset-1",
      asset_type: "Inverter",
      manufacturer: "SolarEdge",
      model: "SE100K",
      serial_number: "SE-100K-ALPHA",
      capacity_kw: 100,
      status: "planned",
    },
  ],
  claims: createClaims("project-alpha", "Project Alpha", 0),
  activity_log: [
    {
      id: "alpha-act-1",
      event_type: "blocker_opened",
      actor: "System",
      description: "Interconnection blocker remains unresolved.",
      timestamp: "2026-04-28T14:11:00.000Z",
    },
  ],
};

const bravoEvidence: Evidence[] = [
  {
    id: "ev-bravo-1",
    evidence_type: "rebate_award_letter",
    title: "Rebate award notice",
    summary: "Final award amount confirmed.",
    effective_date: "2026-04-11",
    source_uri: "s3://solarops/project-bravo/rebate-award.pdf",
  },
  {
    id: "ev-bravo-2",
    evidence_type: "ppa_term_sheet",
    title: "Executed term sheet",
    summary: "Counterparty term sheet signed.",
    effective_date: "2026-04-17",
    source_uri: "s3://solarops/project-bravo/ppa-term-sheet.pdf",
  },
];

const bravoProject: ProjectDetail = {
  id: "project-bravo",
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
  financing_type: "Loan",
  ppa_term_months: null,
  financing_readiness_status: "ready",
  project_cost_usd: 1480000,
  milestones: [
    {
      id: "bravo-ms-1",
      milestone_type: "Financing review",
      status: "done",
      planned_date: "2026-03-20",
      actual_date: "2026-03-18",
      owner_name: "L. Gomez",
    },
  ],
  blockers: [],
  evidence: bravoEvidence,
  assets: [
    {
      id: "bravo-asset-1",
      asset_type: "PV module",
      manufacturer: "First Solar",
      model: "Series 7",
      serial_number: "FS7-BRAVO-01",
      capacity_kw: 540,
      status: "ordered",
    },
  ],
  claims: createClaims("project-bravo", "Project Bravo", 1),
  activity_log: [
    {
      id: "bravo-act-1",
      event_type: "evidence_verified",
      actor: "Truth engine",
      description: "Rebate award evidence verified against claim set.",
      timestamp: "2026-04-27T10:00:00.000Z",
    },
  ],
};

const charlieProject: ProjectDetail = {
  id: "project-charlie",
  name: "Project Charlie",
  organization_name: "Harbor Logistics",
  site_name: "Long Beach Depot",
  stage: "rebate_submitted",
  health: "red",
  owner_name: "S. Patel",
  open_blocker_count: 2,
  missing_evidence_count: 2,
  target_cod: "2027-01-15",
  estimated_annual_savings_usd: 590000,
  estimated_rebate_usd: 240000,
  financing_type: "Lease",
  ppa_term_months: null,
  financing_readiness_status: "blocked",
  project_cost_usd: 2700000,
  milestones: [
    {
      id: "charlie-ms-1",
      milestone_type: "Rebate submission",
      status: "blocked",
      planned_date: "2026-04-30",
      actual_date: null,
      owner_name: "S. Patel",
    },
  ],
  blockers: [
    {
      id: "charlie-bl-1",
      category: "Data conflict",
      severity: "high",
      owner_name: "System",
      description: "Contradicting panel capacity values across source docs.",
      is_open: true,
    },
    {
      id: "charlie-bl-2",
      category: "Permitting",
      severity: "medium",
      owner_name: "N. Fox",
      description: "Permit package missing AHJ acknowledgment.",
      is_open: true,
    },
  ],
  evidence: [],
  assets: [
    {
      id: "charlie-asset-1",
      asset_type: "Battery",
      manufacturer: "Tesla",
      model: "Megapack",
      serial_number: "MP-CHARLIE-01",
      capacity_kw: 1500,
      status: "held",
    },
  ],
  claims: createClaims("project-charlie", "Project Charlie", 0),
  activity_log: [
    {
      id: "charlie-act-1",
      event_type: "claim_contradicted",
      actor: "Truth engine",
      description: "Capacity mismatch flagged during rebate submission review.",
      timestamp: "2026-04-29T08:15:00.000Z",
    },
  ],
};

function toSummary(project: ProjectDetail): ProjectSummary {
  return {
    id: project.id,
    name: project.name,
    organization_name: project.organization_name,
    site_name: project.site_name,
    stage: project.stage,
    health: project.health,
    owner_name: project.owner_name,
    open_blocker_count: project.blockers.filter((blocker) => blocker.is_open).length,
    missing_evidence_count: project.claims.filter(
      (claim) => claim.status === "missing_evidence",
    ).length,
    target_cod: project.target_cod,
    estimated_annual_savings_usd: project.estimated_annual_savings_usd,
    estimated_rebate_usd: project.estimated_rebate_usd,
  };
}

function computePortfolioHealth(projects: ProjectDetail[]): PortfolioHealth {
  return {
    total_projects: projects.length,
    open_blockers: projects.reduce(
      (sum, project) => sum + project.blockers.filter((blocker) => blocker.is_open).length,
      0,
    ),
    estimated_annual_savings_usd: projects.reduce(
      (sum, project) => sum + (project.estimated_annual_savings_usd ?? 0),
      0,
    ),
    estimated_rebates_usd: projects.reduce(
      (sum, project) => sum + (project.estimated_rebate_usd ?? 0),
      0,
    ),
    projects_ready_for_financing_review: projects.filter(
      (project) => project.financing_readiness_status === "ready",
    ).length,
    red_projects: projects.filter((project) => project.health === "red").length,
    high_severity_blockers: projects.reduce(
      (sum, project) =>
        sum +
        project.blockers.filter((blocker) => blocker.is_open && blocker.severity === "high")
          .length,
      0,
    ),
    missing_financing_evidence: projects.filter((project) =>
      project.claims.some((claim) => claim.status === "missing_evidence"),
    ).length,
    stale_or_conflicting_projects: projects.filter((project) =>
      project.blockers.some((blocker) => blocker.category === "Data conflict"),
    ).length,
  };
}

function refreshProject(project: ProjectDetail): ProjectDetail {
  const hasRebateAward = project.evidence.some(
    (item) => item.evidence_type === "rebate_award_letter",
  );
  const openHighBlocker = project.blockers.some(
    (blocker) => blocker.is_open && blocker.severity === "high",
  );

  const claims: Claim[] = project.claims.map((claim) => {
    if (claim.claim_type === "rebate") {
      const status: ClaimStatus = hasRebateAward ? "verified" : "missing_evidence";

      return {
        ...claim,
        status,
        confidence: hasRebateAward ? 0.92 : 0.46,
        evidence_count: hasRebateAward ? 1 : 0,
      };
    }

    if (claim.claim_type === "financing") {
      const status: ClaimStatus = openHighBlocker
        ? "contradicted"
        : hasRebateAward
          ? "assumption"
          : "contradicted";

      return {
        ...claim,
        status,
        confidence: openHighBlocker ? 0.22 : hasRebateAward ? 0.59 : 0.22,
        evidence_count: hasRebateAward ? 1 : 0,
      };
    }

    return claim;
  });

  const health = openHighBlocker ? "red" : hasRebateAward ? "green" : "yellow";
  const financing_readiness_status = openHighBlocker
    ? "blocked"
    : hasRebateAward
      ? "ready"
      : "needs_evidence";

  return {
    ...project,
    health,
    financing_readiness_status,
    claims,
    open_blocker_count: project.blockers.filter((blocker) => blocker.is_open).length,
    missing_evidence_count: claims.filter((claim) => claim.status === "missing_evidence").length,
  };
}

const baseProjects = [alphaProject, bravoProject, charlieProject].map(refreshProject);

let mockStore: MockStore = {
  portfolioHealth: computePortfolioHealth(baseProjects),
  projects: baseProjects.map(toSummary),
  projectDetails: Object.fromEntries(baseProjects.map((project) => [project.id, project])),
};

function syncStore() {
  const projects = Object.values(mockStore.projectDetails).map(refreshProject);
  mockStore = {
    portfolioHealth: computePortfolioHealth(projects),
    projects: projects.map(toSummary),
    projectDetails: Object.fromEntries(projects.map((project) => [project.id, project])),
  };
}

export function getMockStore() {
  return mockStore;
}

export function getMockPortfolioHealth() {
  return mockStore.portfolioHealth;
}

export function getMockProjects() {
  return mockStore.projects;
}

export function getMockProjectDetail(projectId: string) {
  return mockStore.projectDetails[projectId];
}

export function getMockClaims() {
  return Object.values(mockStore.projectDetails).flatMap((project) => project.claims);
}

export function askMockAi(projectId: string): AiAnswer {
  const project = getMockProjectDetail(projectId);
  return makeAiAnswer(project);
}

export function addMockEvidence(projectId: string, evidenceType: string): Evidence {
  const project = getMockProjectDetail(projectId);
  const newEvidence: Evidence = {
    id: `ev-${projectId}-${Date.now()}`,
    evidence_type: evidenceType,
    title: "Mock evidence upload",
    summary: "Added from UI skeleton fallback flow.",
    effective_date: new Date().toISOString().slice(0, 10),
    source_uri: `mock://evidence/${projectId}/${evidenceType}`,
  };
  const activity: ActivityEvent = {
    id: `activity-${projectId}-${Date.now()}`,
    event_type: "evidence_added",
    actor: "Operator",
    description: `${evidenceType} added from project detail fallback action.`,
    timestamp: new Date().toISOString(),
  };

  mockStore.projectDetails[projectId] = {
    ...project,
    evidence: [newEvidence, ...project.evidence],
    activity_log: [activity, ...project.activity_log],
  };
  syncStore();
  return newEvidence;
}

export function resolveMockBlocker(projectId: string, blockerId: string) {
  const project = getMockProjectDetail(projectId);

  mockStore.projectDetails[projectId] = {
    ...project,
    blockers: project.blockers.map((blocker) =>
      blocker.id === blockerId ? { ...blocker, is_open: false } : blocker,
    ),
    activity_log: [
      {
        id: `activity-${projectId}-${Date.now()}`,
        event_type: "blocker_resolved",
        actor: "Operator",
        description: "Blocker resolved from fallback UI action.",
        timestamp: new Date().toISOString(),
      },
      ...project.activity_log,
    ],
  };
  syncStore();
}

export function reverifyMockClaim(projectId: string, claimId: string): Claim {
  const project = getMockProjectDetail(projectId);
  const refreshed = refreshProject(project);
  const claim = refreshed.claims.find((item) => item.id === claimId)!;

  mockStore.projectDetails[projectId] = {
    ...refreshed,
    activity_log: [
      {
        id: `activity-${projectId}-${Date.now()}`,
        event_type: "claim_reverified",
        actor: "Truth engine",
        description: `Claim ${claim.claim_type} reverified.`,
        timestamp: new Date().toISOString(),
      },
      ...refreshed.activity_log,
    ],
  };
  syncStore();
  return mockStore.projectDetails[projectId].claims.find((item) => item.id === claimId)!;
}
