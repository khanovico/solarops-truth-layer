import { formatDate } from "../lib/format";
import type { Milestone } from "../lib/types";

export function MilestoneTimeline({ milestones }: { milestones: Milestone[] }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h3>Milestone Timeline</h3>
          <p>Ordered project milestones with planned and actual execution dates.</p>
        </div>
      </div>
      {milestones.length === 0 ? (
        <div className="empty-state">No milestones recorded.</div>
      ) : (
        <ol className="timeline">
          {milestones.map((item) => (
            <li key={item.id} className="timeline-item">
              <div className="timeline-dot" />
              <div className="timeline-body">
                <div className="list-card-head">
                  <strong>{item.milestone_type}</strong>
                  <span className="badge badge-stage">{item.status}</span>
                </div>
                <div className="timeline-grid">
                  <span>Planned: {formatDate(item.planned_date)}</span>
                  <span>Actual: {formatDate(item.actual_date)}</span>
                  <span>Owner: {item.owner_name}</span>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
