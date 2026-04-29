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

const ASSISTANT_THINKING_DELAY_MS = 2000;
const ASSISTANT_PROMPTS = [
  "Is this project ready for financing review?",
  "What is blocking this project?",
  "Can this project move to rebate submission?",
];

function projectHealthBadge(health: ProjectDetailType["health"]) {
  return <span className={`badge badge-${health === "unknown" ? "neutral" : health}`}>{health}</span>;
}

function wait(milliseconds: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

export function ProjectDetail() {
  const api = useApi();
  const { id = "" } = useParams();
  const [project, setProject] = useState<ProjectDetailType | null>(null);
  const [answer, setAnswer] = useState<AiAnswer | null>(null);
  const [assistantError, setAssistantError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [question, setQuestion] = useState("Is this project ready for financing review?");
  const [submittedQuestion, setSubmittedQuestion] = useState<string | null>(null);

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
    const askedQuestion = question.trim();
    if (!askedQuestion) {
      return;
    }

    setPendingAction("ask");
    setAnswer(null);
    setSubmittedQuestion(askedQuestion);
    setAssistantError(null);
    try {
      const startedAt = window.performance.now();
      const result = await api.askProjectAi(id, askedQuestion);
      const elapsedMs = window.performance.now() - startedAt;
      await wait(Math.max(0, ASSISTANT_THINKING_DELAY_MS - elapsedMs));
      const linkedEvidenceIds = new Set(
        result.data.claims.flatMap((claim) => claim.evidence_ids),
      );
      setAnswer({
        ...result.data,
        evidence_links: project?.evidence.filter((item) => linkedEvidenceIds.has(item.id)) ?? [],
      });
      if (result.warning) {
        setWarning(result.warning);
      }
    } catch (askError) {
      setAssistantError(askError instanceof Error ? askError.message : "AI service unavailable.");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleAddMockEvidence(evidenceType: string) {
    setPendingAction(`evidence:${evidenceType}`);
    try {
      const result = await api.addMockEvidence(id, evidenceType);
      if (result.warning) {
        setWarning(result.warning);
      }
      setProject(result.data);
    } catch (evidenceError) {
      setError(evidenceError instanceof Error ? evidenceError.message : "Evidence upload failed.");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleResolveBlocker(blockerId: string) {
    setPendingAction(`blocker:${blockerId}`);
    try {
      const result = await api.resolveBlocker(id, blockerId);
      if (result.warning) {
        setWarning(result.warning);
      }
      await refreshProject();
    } catch (blockerError) {
      setError(blockerError instanceof Error ? blockerError.message : "Blocker update failed.");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleReverifyClaim(claimId: string) {
    setPendingAction(`claim:${claimId}`);
    try {
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
    } catch (claimError) {
      setError(claimError instanceof Error ? claimError.message : "Claim reverification failed.");
    } finally {
      setPendingAction(null);
    }
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
      <BlockerPanel
        blockers={project.blockers}
        onResolve={handleResolveBlocker}
        pendingBlockerId={pendingAction?.startsWith("blocker:") ? pendingAction.slice(8) : null}
      />
      <EvidenceTable
        evidence={project.evidence}
        onAddMockEvidence={handleAddMockEvidence}
        isAdding={pendingAction?.startsWith("evidence:") ?? false}
      />
      <AssetTable assets={project.assets} />

      <AiAnswerCard
        answer={answer}
        isPending={pendingAction === "ask"}
        question={question}
        submittedQuestion={submittedQuestion}
        errorMessage={assistantError}
        promptSuggestions={ASSISTANT_PROMPTS}
        onAsk={handleAsk}
        onQuestionChange={setQuestion}
      />

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
                      disabled={pendingAction === `claim:${claim.id}`}
                    >
                      {pendingAction === `claim:${claim.id}` ? "Reverifying..." : "Reverify"}
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
