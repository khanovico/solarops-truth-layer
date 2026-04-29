import { useMemo, useState } from "react";
import { formatDate } from "../lib/format";
import type { Evidence } from "../lib/types";

type EvidenceTableProps = {
  evidence: Evidence[];
  onAddMockEvidence: (evidenceType: string) => Promise<void> | void;
  isAdding?: boolean;
};

export function EvidenceTable({ evidence, onAddMockEvidence, isAdding = false }: EvidenceTableProps) {
  const [filter, setFilter] = useState("all");
  const filteredEvidence = useMemo(() => {
    if (filter === "all") {
      return evidence;
    }

    return evidence.filter((item) => item.evidence_type === filter);
  }, [evidence, filter]);

  const evidenceTypes = Array.from(new Set(evidence.map((item) => item.evidence_type)));

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h3>Evidence Ledger</h3>
          <p>Source records and proof artifacts linked to project truth claims.</p>
        </div>
        <div className="toolbar">
          <label className="select-field">
            <span className="field-label">Type</span>
            <span className="select-shell">
              <select className="select-control" value={filter} onChange={(event) => setFilter(event.target.value)}>
                <option value="all">All evidence</option>
                {evidenceTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <button
            type="button"
            className="button-secondary"
            onClick={() => onAddMockEvidence("rebate_award_letter")}
            disabled={isAdding}
          >
            {isAdding ? "Adding..." : "Add mock evidence"}
          </button>
        </div>
      </div>
      {filteredEvidence.length === 0 ? (
        <div className="empty-state">No evidence for this filter yet.</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Title</th>
              <th>Summary</th>
              <th>Effective date</th>
              <th>Source URI</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvidence.map((item) => (
              <tr key={item.id}>
                <td>{item.evidence_type}</td>
                <td>{item.title}</td>
                <td>{item.summary}</td>
                <td>{formatDate(item.effective_date)}</td>
                <td className="mono-cell">{item.source_uri}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
