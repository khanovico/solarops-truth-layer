import { formatPercent } from "../lib/format";
import type { AiAnswer } from "../lib/types";
import { ClaimStatusBadge } from "./ClaimStatusBadge";

const MAX_VISIBLE_CLAIMS = 6;
const MAX_VISIBLE_SIDE_ITEMS = 5;

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

  return (
    <section className={`panel assistant-panel ${stateClass}`} aria-busy={isPending}>
      <div className="assistant-shell">
        <div className="assistant-header">
          <div className="assistant-title">
            <span className="assistant-avatar" aria-hidden="true">
              AI
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
                  AI
                </span>
                <p className="chat-bubble answer-text">{answer.answer_text}</p>
              </div>
              <div className="assistant-sections">
                <div className="assistant-group">
                  <h4>Claim breakdown</h4>
                  <div className="stack-list">
                    {visibleClaims.map((claim) => (
                      <article key={claim.id} className="list-card">
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
                <div className="assistant-group">
                  <h4>Evidence links</h4>
                  {answer.evidence_links.length === 0 ? (
                    <p className="muted-text">No linked evidence returned.</p>
                  ) : (
                    <ul className="dense-list">
                      {visibleEvidence.map((item) => (
                        <li key={item.id}>{item.title}</li>
                      ))}
                    </ul>
                  )}
                  {answer.evidence_links.length > visibleEvidence.length ? (
                    <p className="muted-text">
                      Showing {visibleEvidence.length} of {answer.evidence_links.length} evidence links.
                    </p>
                  ) : null}
                  <h4>Missing evidence</h4>
                  {answer.missing_evidence.length === 0 ? (
                    <p className="muted-text">No missing evidence detected.</p>
                  ) : (
                    <ul className="dense-list">
                      {visibleMissingEvidence.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                  {answer.missing_evidence.length > visibleMissingEvidence.length ? (
                    <p className="muted-text">
                      Showing {visibleMissingEvidence.length} of {answer.missing_evidence.length} missing items.
                    </p>
                  ) : null}
                  <h4>Next actions</h4>
                  <ul className="dense-list">
                    {visibleActions.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  {answer.recommended_next_actions.length > visibleActions.length ? (
                    <p className="muted-text">
                      Showing {visibleActions.length} of {answer.recommended_next_actions.length} actions.
                    </p>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
