import { formatPercent } from "../lib/format";
import type { AiAnswer } from "../lib/types";
import { ClaimStatusBadge } from "./ClaimStatusBadge";

export function AiAnswerCard({ answer }: { answer: AiAnswer | null }) {
  if (!answer) {
    return (
      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>AI Assistant</h3>
            <p>Ask a project question to generate claim-by-claim reasoning.</p>
          </div>
        </div>
        <div className="empty-state">No answer yet. Run a question to inspect claim evidence.</div>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h3>AI Assistant</h3>
          <p>Deterministic claim breakdown tied to evidence and next actions.</p>
        </div>
        <span className="badge badge-stage">{formatPercent(answer.overall_confidence)}</span>
      </div>
      <p className="answer-text">{answer.answer_text}</p>
      <div className="answer-grid">
        <div>
          <h4>Claim breakdown</h4>
          <div className="stack-list">
            {answer.claims.map((claim) => (
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
          </div>
        </div>
        <div>
          <h4>Evidence links</h4>
          <ul className="dense-list">
            {answer.evidence_links.map((item) => (
              <li key={item.id}>{item.title}</li>
            ))}
          </ul>
          <h4>Missing evidence</h4>
          {answer.missing_evidence.length === 0 ? (
            <p className="muted-text">No missing evidence detected.</p>
          ) : (
            <ul className="dense-list">
              {answer.missing_evidence.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
          <h4>Next actions</h4>
          <ul className="dense-list">
            {answer.recommended_next_actions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
