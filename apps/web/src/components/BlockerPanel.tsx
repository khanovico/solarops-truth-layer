import type { Blocker } from "../lib/types";

type BlockerPanelProps = {
  blockers: Blocker[];
  onResolve: (blockerId: string) => Promise<void> | void;
};

export function BlockerPanel({ blockers, onResolve }: BlockerPanelProps) {
  const ordered = [...blockers].sort((left, right) => Number(right.is_open) - Number(left.is_open));

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h3>Blockers</h3>
          <p>Open issues first, with owner and severity attached.</p>
        </div>
      </div>
      {ordered.length === 0 ? (
        <div className="empty-state">No blockers on this project.</div>
      ) : (
        <div className="stack-list">
          {ordered.map((blocker) => (
            <article key={blocker.id} className={`list-card ${blocker.is_open ? "list-card-open" : ""}`}>
              <div className="list-card-head">
                <div className="badge-row">
                  <span className={`badge badge-${blocker.severity === "high" ? "red" : blocker.severity === "medium" ? "yellow" : "neutral"}`}>
                    {blocker.severity}
                  </span>
                  <span className={`badge ${blocker.is_open ? "badge-red" : "badge-green"}`}>
                    {blocker.is_open ? "Open" : "Resolved"}
                  </span>
                </div>
                {blocker.is_open ? (
                  <button type="button" className="button-secondary" onClick={() => onResolve(blocker.id)}>
                    Resolve
                  </button>
                ) : null}
              </div>
              <strong>{blocker.category}</strong>
              <p>{blocker.description}</p>
              <span className="muted-text">Owner: {blocker.owner_name}</span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
