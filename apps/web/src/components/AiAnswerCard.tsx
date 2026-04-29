import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  ListChecks,
  LoaderCircle,
  Sparkles,
} from "lucide-react";
import { formatPercent } from "../lib/format";
import type { AiAnswer, ClaimStatus } from "../lib/types";
import { ClaimStatusBadge } from "./ClaimStatusBadge";

const MAX_VISIBLE_CLAIMS = 6;
const MAX_VISIBLE_SIDE_ITEMS = 5;

const STATUS_LABELS: Record<ClaimStatus, string> = {
  verified: "Verified",
  assumption: "Assumptions",
  missing_evidence: "Missing",
  contradicted: "Conflicts",
};

type AiAnswerCardProps = {
  answer: AiAnswer | null;
  isPending?: boolean;
  question?: string;
  submittedQuestion?: string | null;
  errorMessage?: string | null;
  promptSuggestions?: string[];
  onAsk?: () => void;
  onQuestionChange?: (question: string) => void;
};

export function AiAnswerCard({
  answer,
  isPending = false,
  question = "",
  submittedQuestion = null,
  errorMessage = null,
  promptSuggestions = [],
  onAsk,
  onQuestionChange,
}: AiAnswerCardProps) {
  const stateClass = isPending
    ? "assistant-panel-thinking"
    : answer
      ? "assistant-panel-answered"
      : "assistant-panel-empty";
  const canAsk = Boolean(onAsk) && question.trim().length > 0 && !isPending;
  const visibleClaims = answer?.claims.slice(0, MAX_VISIBLE_CLAIMS) ?? [];
  const visibleEvidence = answer?.evidence_links.slice(0, MAX_VISIBLE_SIDE_ITEMS) ?? [];
  const visibleMissingEvidence = answer?.missing_evidence.slice(0, MAX_VISIBLE_SIDE_ITEMS) ?? [];
  const visibleActions = answer?.recommended_next_actions.slice(0, MAX_VISIBLE_SIDE_ITEMS) ?? [];
  const statusCounts = answer
    ? answer.claims.reduce<Record<ClaimStatus, number>>(
        (counts, claim) => {
          counts[claim.status] += 1;
          return counts;
        },
        {
          verified: 0,
          assumption: 0,
          missing_evidence: 0,
          contradicted: 0,
        },
      )
    : null;
  const answerTone = answer?.missing_evidence.length
    ? "needs evidence"
    : answer?.claims.some((claim) => claim.status === "contradicted")
      ? "blocked"
      : answer
        ? "ready"
        : "idle";

  return (
    <section className={`panel assistant-panel ${stateClass}`} aria-busy={isPending}>
      <div className="assistant-shell">
        <div className="assistant-header">
          <div className="assistant-title">
            <span className="assistant-avatar" aria-hidden="true">
              <Bot size={18} />
            </span>
            <div>
              <h3>AI Assistant</h3>
              <p>Ask a project question to generate claim-by-claim reasoning.</p>
            </div>
          </div>
          {answer ? <span className="badge badge-stage">{formatPercent(answer.overall_confidence)}</span> : null}
        </div>

        {onAsk && onQuestionChange ? (
          <div className="assistant-composer">
            <textarea
              aria-label="AI question"
              value={question}
              onChange={(event) => onQuestionChange(event.target.value)}
              rows={3}
              disabled={isPending}
            />
            <div className="assistant-actions">
              <div className="prompt-row assistant-prompts">
                {promptSuggestions.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="button-chip"
                    onClick={() => onQuestionChange(prompt)}
                    disabled={isPending}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="button-primary"
                onClick={onAsk}
                disabled={!canAsk}
                aria-label="Ask question"
              >
                {isPending ? "Thinking..." : "Ask question"}
              </button>
            </div>
          </div>
        ) : null}

        <div className="sr-only" aria-live="polite">
          {isPending
            ? "AI assistant is checking linked evidence."
            : answer
              ? "AI answer ready."
              : errorMessage
                ? "AI assistant request failed."
              : "AI assistant idle."}
        </div>

        <div className="assistant-body">
          {submittedQuestion ? (
            <div className="chat-message chat-message-user">
              <span className="message-avatar" aria-hidden="true">
                You
              </span>
              <p className="chat-bubble chat-bubble-user">{submittedQuestion}</p>
            </div>
          ) : null}

          {!submittedQuestion && !answer && !isPending ? (
            <div className="assistant-empty">No answer yet. Run a question to inspect claim evidence.</div>
          ) : null}

          {isPending ? (
            <div className="assistant-thinking" role="status">
              <div className="thinking-head">
                <LoaderCircle className="thinking-spinner" size={18} aria-hidden="true" />
                <strong>Building evidence-backed answer</strong>
              </div>
              <div className="thinking-progress" aria-hidden="true">
                <span />
              </div>
              <ul className="thinking-list" aria-label="AI assistant is thinking">
                <li>
                  <span className="thinking-dot" aria-hidden="true" />
                  Reading project claims
                </li>
                <li>
                  <span className="thinking-dot" aria-hidden="true" />
                  Checking linked evidence
                </li>
                <li>
                  <span className="thinking-dot" aria-hidden="true" />
                  Preparing answer
                </li>
              </ul>
            </div>
          ) : null}

          {errorMessage && !isPending ? (
            <div className="assistant-error" role="alert">
              {errorMessage}
            </div>
          ) : null}

          {answer ? (
            <>
              <div className="chat-message chat-message-assistant">
                <span className="message-avatar" aria-hidden="true">
                  <Bot size={16} />
                </span>
                <div className="assistant-verdict">
                  <div className={`verdict-marker verdict-${answerTone.replace(" ", "-")}`}>
                    {answerTone === "ready" ? (
                      <CheckCircle2 size={18} aria-hidden="true" />
                    ) : answerTone === "blocked" ? (
                      <AlertTriangle size={18} aria-hidden="true" />
                    ) : (
                      <FileSearch size={18} aria-hidden="true" />
                    )}
                    <span>{answerTone}</span>
                  </div>
                  <p className="answer-text">{answer.answer_text}</p>
                </div>
              </div>
              {statusCounts ? (
                <div className="assistant-status-strip" aria-label="Claim status summary">
                  {(Object.keys(STATUS_LABELS) as ClaimStatus[]).map((status) => (
                    <div key={status} className={`assistant-status-count status-${status}`}>
                      <span>{STATUS_LABELS[status]}</span>
                      <strong>{statusCounts[status]}</strong>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="assistant-sections">
                <div className="assistant-group assistant-claims">
                  <div className="assistant-group-title">
                    <ListChecks size={17} aria-hidden="true" />
                    <h4>Claim breakdown</h4>
                  </div>
                  <div className="stack-list">
                    {visibleClaims.map((claim) => (
                      <article key={claim.id} className={`assistant-claim-row claim-${claim.status}`}>
                        <div className="list-card-head">
                          <strong>{claim.text}</strong>
                          <ClaimStatusBadge status={claim.status} />
                        </div>
                        <span className="muted-text">
                          Confidence {formatPercent(claim.confidence)} · Evidence refs {claim.evidence_ids.length}
                        </span>
                      </article>
                    ))}
                    {answer.claims.length > visibleClaims.length ? (
                      <p className="muted-text">
                        Showing {visibleClaims.length} of {answer.claims.length} claims.
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="assistant-side-grid">
                  <div className="assistant-evidence-card">
                    <div className="assistant-group-title">
                      <ClipboardCheck size={17} aria-hidden="true" />
                      <h4>Verified evidence</h4>
                    </div>
                    {answer.evidence_links.length === 0 ? (
                      <p className="muted-text">No linked evidence returned.</p>
                    ) : (
                      <ul className="assistant-evidence-list">
                        {visibleEvidence.map((item) => (
                          <li key={item.id}>
                            <CheckCircle2 size={15} aria-hidden="true" />
                            <span>{item.title}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {answer.evidence_links.length > visibleEvidence.length ? (
                      <p className="muted-text">
                        Showing {visibleEvidence.length} of {answer.evidence_links.length} evidence links.
                      </p>
                    ) : null}
                  </div>
                  <div className="assistant-evidence-card">
                    <div className="assistant-group-title">
                      <FileSearch size={17} aria-hidden="true" />
                      <h4>Missing evidence</h4>
                    </div>
                    {answer.missing_evidence.length === 0 ? (
                      <p className="muted-text">No missing evidence detected.</p>
                    ) : (
                      <ul className="assistant-evidence-list evidence-missing">
                        {visibleMissingEvidence.map((item) => (
                          <li key={item}>
                            <AlertTriangle size={15} aria-hidden="true" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {answer.missing_evidence.length > visibleMissingEvidence.length ? (
                      <p className="muted-text">
                        Showing {visibleMissingEvidence.length} of {answer.missing_evidence.length} missing
                        items.
                      </p>
                    ) : null}
                  </div>
                  <div className="assistant-evidence-card">
                    <div className="assistant-group-title">
                      <Sparkles size={17} aria-hidden="true" />
                      <h4>Next actions</h4>
                    </div>
                    <ol className="assistant-action-list">
                      {visibleActions.map((item, index) => (
                        <li key={item}>
                          <span>{index + 1}</span>
                          <strong>{item}</strong>
                        </li>
                      ))}
                    </ol>
                    {answer.recommended_next_actions.length > visibleActions.length ? (
                      <p className="muted-text">
                        Showing {visibleActions.length} of {answer.recommended_next_actions.length} actions.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
