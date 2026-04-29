import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ProjectHealthCard } from "../components/ProjectHealthCard";
import { ProjectStageBadge } from "../components/ProjectStageBadge";
import { formatCurrency, formatDate } from "../lib/format";
import { useApi } from "../lib/api-context";
import type {
  DashboardFilters,
  PaginatedResponse,
  PortfolioHealth,
  ProjectSummary,
} from "../lib/types";

const defaultFilters: DashboardFilters = {
  stage: "",
  health: "",
  owner: "",
  hasOpenBlockers: false,
};

function healthBadge(health: ProjectSummary["health"]) {
  return <span className={`badge badge-${health === "unknown" ? "neutral" : health}`}>{health}</span>;
}

export function Dashboard() {
  const api = useApi();
  const [searchParams, setSearchParams] = useSearchParams();
  const [portfolio, setPortfolio] = useState<PortfolioHealth | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectPage, setProjectPage] = useState<PaginatedResponse<ProjectSummary> | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const filterKey = searchParams.toString();

  const filters: DashboardFilters = {
    stage: searchParams.get("stage") ?? defaultFilters.stage,
    health: searchParams.get("health") ?? defaultFilters.health,
    owner: searchParams.get("owner") ?? defaultFilters.owner,
    hasOpenBlockers: searchParams.get("hasOpenBlockers") === "true",
  };

  useEffect(() => {
    let active = true;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const [portfolioResult, projectsResult] = await Promise.all([
          api.getPortfolioHealth(),
          api.getProjects(filters),
        ]);

        if (!active) {
          return;
        }

        setPortfolio(portfolioResult.data);
        setProjectPage(projectsResult.data);
        setProjects(projectsResult.data.items);
        setWarning(portfolioResult.warning ?? projectsResult.warning ?? null);
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Dashboard failed to load.");
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [api, filterKey]);

  async function loadMoreProjects() {
    if (!projectPage?.next_cursor) {
      return;
    }

    setIsLoadingMore(true);
    setError(null);
    try {
      const result = await api.getProjects(filters, projectPage.next_cursor);
      setProjectPage(result.data);
      setProjects((current) => [...current, ...result.data.items]);
      if (result.warning) {
        setWarning(result.warning);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Project page failed to load.");
    } finally {
      setIsLoadingMore(false);
    }
  }

  const owners = Array.from(new Set(projects.map((project) => project.owner_name)));

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      if (filters.stage && project.stage !== filters.stage) {
        return false;
      }
      if (filters.health && project.health !== filters.health) {
        return false;
      }
      if (filters.owner && project.owner_name !== filters.owner) {
        return false;
      }
      if (filters.hasOpenBlockers && project.open_blocker_count === 0) {
        return false;
      }
      return true;
    });
  }, [filters.hasOpenBlockers, filters.health, filters.owner, filters.stage, projects]);

  function updateFilter(key: keyof DashboardFilters, value: string | boolean) {
    const next = new URLSearchParams(searchParams);

    if (typeof value === "boolean") {
      if (value) {
        next.set(key, "true");
      } else {
        next.delete(key);
      }
    } else if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }

    setSearchParams(next);
  }

  const isInitialLoading = isLoading && !portfolio;
  const hasInitialError = error && !portfolio;

  if (isInitialLoading) {
    return <div className="state-panel">Loading portfolio console…</div>;
  }

  if (hasInitialError) {
    return <div className="state-panel state-error">Dashboard error: {error}</div>;
  }

  if (!portfolio) {
    return <div className="state-panel">No portfolio metrics available.</div>;
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Portfolio dashboard</p>
          <h2>Truth-layer operating view</h2>
          <p className="page-copy">
            Track project health, blockers, claims, and financing readiness across the portfolio.
          </p>
        </div>
        {warning ? <div className="notice-banner">{warning}</div> : null}
      </header>

      <section className="metrics-grid">
        <ProjectHealthCard label="Total projects" value={portfolio.total_projects} tone="neutral" />
        <ProjectHealthCard label="Blocked projects" value={portfolio.blocked_projects} tone="red" />
        <ProjectHealthCard
          label="Estimated annual savings"
          value={formatCurrency(portfolio.estimated_annual_savings_usd)}
          tone="green"
        />
        <ProjectHealthCard
          label="Estimated rebates"
          value={formatCurrency(portfolio.estimated_rebates_usd)}
          tone="yellow"
        />
        <ProjectHealthCard
          label="Ready for financing review"
          value={portfolio.projects_ready_for_financing_review}
          subtext={`${portfolio.missing_financing_evidence} with missing evidence`}
          tone="neutral"
        />
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Project filters</h3>
            <p>Slice the portfolio by execution stage, health, owner, and blocker load.</p>
          </div>
        </div>
        <div className="filters-grid">
          <label className="select-field">
            <span className="field-label">Stage</span>
            <span className="select-shell">
              <select
                className="select-control"
                value={filters.stage}
                onChange={(event) => updateFilter("stage", event.target.value)}
              >
                <option value="">All stages</option>
                {Array.from(new Set(projects.map((project) => project.stage))).map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <label className="select-field">
            <span className="field-label">Health</span>
            <span className="select-shell">
              <select
                className="select-control"
                value={filters.health}
                onChange={(event) => updateFilter("health", event.target.value)}
              >
                <option value="">All health states</option>
                {Array.from(new Set(projects.map((project) => project.health))).map((health) => (
                  <option key={health} value={health}>
                    {health}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <label className="select-field">
            <span className="field-label">Owner</span>
            <span className="select-shell">
              <select
                className="select-control"
                value={filters.owner}
                onChange={(event) => updateFilter("owner", event.target.value)}
              >
                <option value="">All owners</option>
                {owners.map((owner) => (
                  <option key={owner} value={owner}>
                    {owner}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={filters.hasOpenBlockers}
              onChange={(event) => updateFilter("hasOpenBlockers", event.target.checked)}
            />
            <span>Has open blockers</span>
          </label>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Projects</h3>
            <p>
              Execution table for owners, blockers, missing evidence, and target COD.
              {projectPage ? ` Showing ${projects.length} of ${projectPage.total}.` : ""}
            </p>
          </div>
          {isLoading ? <span className="inline-status">Updating…</span> : null}
        </div>
        {error ? <div className="notice-banner state-error">Dashboard refresh failed: {error}</div> : null}
        {filteredProjects.length === 0 ? (
          <div className="empty-state">No projects match the current filters.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Organization</th>
                <th>Site</th>
                <th>Stage</th>
                <th>Health</th>
                <th>Owner</th>
                <th>Target COD</th>
                <th>Open blockers</th>
                <th>Missing evidence</th>
                <th>Annual savings</th>
                <th>Estimated rebate</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project) => (
                <tr key={project.id}>
                  <td>
                    <Link to={`/projects/${project.id}`} className="table-link">
                      {project.name}
                    </Link>
                  </td>
                  <td>{project.organization_name}</td>
                  <td>{project.site_name}</td>
                  <td>
                    <ProjectStageBadge stage={project.stage} />
                  </td>
                  <td>{healthBadge(project.health)}</td>
                  <td>{project.owner_name}</td>
                  <td>{formatDate(project.target_cod)}</td>
                  <td>{project.open_blocker_count}</td>
                  <td>{project.missing_evidence_count}</td>
                  <td>{formatCurrency(project.estimated_annual_savings_usd)}</td>
                  <td>{formatCurrency(project.estimated_rebate_usd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {projectPage?.next_cursor ? (
          <div className="table-footer">
            <button
              type="button"
              className="button-secondary"
              onClick={loadMoreProjects}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? "Loading..." : "Load more projects"}
            </button>
          </div>
        ) : null}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Portfolio risk panel</h3>
            <p>High-priority portfolio exceptions and evidence gaps.</p>
          </div>
        </div>
        <div className="risk-grid">
          <div className="list-card">
            <strong>Red projects</strong>
            <span>{portfolio.red}</span>
          </div>
          <div className="list-card">
            <strong>High-severity blockers</strong>
            <span>{portfolio.high_severity_blockers}</span>
          </div>
          <div className="list-card">
            <strong>Missing financing evidence</strong>
            <span>{portfolio.missing_financing_evidence}</span>
          </div>
          <div className="list-card">
            <strong>Stale or conflicting data</strong>
            <span>{portfolio.stale_or_conflicting_projects}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
