import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ActivityLog } from "../components/ActivityLog";
import { AiAnswerCard } from "../components/AiAnswerCard";
import { AssetTable } from "../components/AssetTable";
import { BlockerPanel } from "../components/BlockerPanel";
import { ClaimStatusBadge } from "../components/ClaimStatusBadge";
import { EvidenceTable } from "../components/EvidenceTable";
import { MilestoneTimeline } from "../components/MilestoneTimeline";
import { ProjectStageBadge } from "../components/ProjectStageBadge";
import { formatCurrency, formatDate } from "../lib/format";
import { useApi } from "../lib/api-context";
import type { AiAnswer, ProjectDetail as ProjectDetailType } from "../lib/types";

function projectHealthBadge(health: ProjectDetailType["health"]) {
  return <span className={`badge badge-${health === "unknown" ? "neutral" : health}`}>{health}</span>;
}

export function ProjectDetail() {
  const api = useApi();
  const { id = "" } = useParams();
  const [project, setProject] = useState<ProjectDetailType | null>(null);
  const [answer, setAnswer] = useState<AiAnswer | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [question, setQuestion] = useState("Is this project ready for financing review?");

  async function refreshProject() {
    const result = await api.getProject(id);
    setProject(result.data);
    setWarning(result.warning ?? null);
  }

  useEffect(() => {
    let active = true;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const result = await api.getProject(id);
        if (!active) {
          return;
        }
        setProject(result.data);
        setWarning(result.warning ?? null);
      } catch (loadError) {
        if (!active) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "Project detail failed to load.");
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
  }, [api, id]);

  async function handleAsk() {
    const result = await api.askProjectAi(id, question);
    setAnswer(result.data);
    if (result.warning) {
      setWarning(result.warning);
    }
  }

  async function handleAddMockEvidence(evidenceType: string) {
    const result = await api.addMockEvidence(id, evidenceType);
    if (result.warning) {
      setWarning(result.warning);
    }
    await refreshProject();
  }

  async function handleResolveBlocker(blockerId: string) {
    const result = await api.resolveBlocker(id, blockerId);
    if (result.warning) {
      setWarning(result.warning);
    }
    await refreshProject();
  }

  async function handleReverifyClaim(claimId: string) {
    const result = await api.reverifyClaim(id, claimId);
    if (result.warning) {
      setWarning(result.warning);
    }
    setProject((current) =>
      current
        ? {
            ...current,
            claims: current.claims.map((claim) =>
              claim.id === claimId ? result.data : claim,
            ),
          }
        : current,
    );
    await refreshProject();
  }

  if (isLoading) {
    return <div className="state-panel">Loading project detail…</div>;
  }

  if (error) {
    return <div className="state-panel state-error">Project error: {error}</div>;
  }

  if (!project) {
    return <div className="state-panel">Project not found.</div>;
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">{project.organization_name}</p>
          <h2>{project.name}</h2>
          <p className="page-copy">
            {project.site_name} · Owner {project.owner_name} · Target COD {formatDate(project.target_cod)}
          </p>
          <div className="badge-row">
            <ProjectStageBadge stage={project.stage} />
            {projectHealthBadge(project.health)}
            <span className="badge badge-stage">{project.financing_readiness_status}</span>
          </div>
        </div>
        {warning ? <div className="notice-banner">{warning}</div> : null}
      </header>

      <section className="metrics-grid">
        <article className="metric-card metric-neutral">
          <span className="metric-label">Project cost</span>
          <strong className="metric-value">{formatCurrency(project.project_cost_usd)}</strong>
        </article>
        <article className="metric-card metric-green">
          <span className="metric-label">Annual savings</span>
          <strong className="metric-value">
            {formatCurrency(project.estimated_annual_savings_usd)}
          </strong>
        </article>
        <article className="metric-card metric-yellow">
          <span className="metric-label">Estimated rebate</span>
          <strong className="metric-value">{formatCurrency(project.estimated_rebate_usd)}</strong>
        </article>
        <article className="metric-card metric-neutral">
          <span className="metric-label">Financing</span>
          <strong className="metric-value">{project.financing_type ?? "Unknown"}</strong>
          <span className="metric-subtext">
            {project.ppa_term_years ? `${project.ppa_term_years} year term` : "No PPA term"}
          </span>
        </article>
      </section>

      <MilestoneTimeline milestones={project.milestones} />
      <BlockerPanel blockers={project.blockers} onResolve={handleResolveBlocker} />
      <EvidenceTable evidence={project.evidence} onAddMockEvidence={handleAddMockEvidence} />
      <AssetTable assets={project.assets} />

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Ask AI assistant</h3>
            <p>Question the truth layer using project evidence and claim state.</p>
          </div>
        </div>
        <div className="question-grid">
          <textarea
            aria-label="AI question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            rows={3}
          />
          <div className="prompt-row">
            {[
              "Is this project ready for financing review?",
              "What is blocking this project?",
              "Can this project move to rebate submission?",
            ].map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="button-chip"
                onClick={() => setQuestion(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>
          <button type="button" className="button-primary" onClick={handleAsk}>
            Ask question
          </button>
        </div>
      </section>

      <AiAnswerCard answer={answer} />

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Claim ledger</h3>
            <p>Structured project claims with evidence coverage and reverification.</p>
          </div>
        </div>
        {project.claims.length === 0 ? (
          <div className="empty-state">No claims tracked yet.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Claim</th>
                <th>Type</th>
                <th>Status</th>
                <th>Confidence</th>
                <th>Evidence count</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {project.claims.map((claim) => (
                <tr key={claim.id}>
                  <td>{claim.claim_text}</td>
                  <td>{claim.claim_type}</td>
                  <td>
                    <ClaimStatusBadge status={claim.status} />
                  </td>
                  <td>{Math.round(claim.confidence * 100)}%</td>
                  <td>{claim.evidence_count}</td>
                  <td>
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() => handleReverifyClaim(claim.id)}
                    >
                      Reverify
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <ActivityLog events={project.activity_log} />
    </div>
  );
}
