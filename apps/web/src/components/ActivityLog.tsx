import { formatDate } from "../lib/format";
import type { ActivityEvent } from "../lib/types";

export function ActivityLog({ events }: { events: ActivityEvent[] }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h3>Activity Log</h3>
          <p>Recent actions from operators and truth-layer automation.</p>
        </div>
      </div>
      {events.length === 0 ? (
        <div className="empty-state">No activity recorded yet.</div>
      ) : (
        <div className="stack-list">
          {events.map((event) => (
            <article key={event.id} className="list-card">
              <div className="list-card-head">
                <strong>{event.event_type}</strong>
                <span className="muted-text">{formatDate(event.timestamp)}</span>
              </div>
              <p>{event.description}</p>
              <span className="muted-text">Actor: {event.actor}</span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
