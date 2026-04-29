import { useEffect, useMemo, useState } from "react";
import { ClaimStatusBadge } from "../components/ClaimStatusBadge";
import { useApi } from "../lib/api-context";
import type { Claim, PaginatedResponse } from "../lib/types";

export function ClaimLedger() {
  const api = useApi();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [claimPage, setClaimPage] = useState<PaginatedResponse<Claim> | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [status, setStatus] = useState("");
  const [claimType, setClaimType] = useState("");
  const [projectId, setProjectId] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const result = await api.getClaims({ status, claimType, projectId });
        if (!active) {
          return;
        }
        setClaimPage(result.data);
        setClaims(result.data.items);
        setWarning(result.warning ?? null);
      } catch (loadError) {
        if (!active) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "Claim ledger failed to load.");
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
  }, [api, status, claimType, projectId]);

  async function loadMoreClaims() {
    if (!claimPage?.next_cursor) {
      return;
    }

    setIsLoadingMore(true);
    setError(null);
    try {
      const result = await api.getClaims({ status, claimType, projectId }, claimPage.next_cursor);
      setClaimPage(result.data);
      setClaims((current) => [...current, ...result.data.items]);
      if (result.warning) {
        setWarning(result.warning);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Claim page failed to load.");
    } finally {
      setIsLoadingMore(false);
    }
  }

  const filteredClaims = useMemo(() => {
    return claims.filter((claim) => {
      if (status && claim.status !== status) {
        return false;
      }
      if (claimType && claim.claim_type !== claimType) {
        return false;
      }
      if (projectId && claim.project_id !== projectId) {
        return false;
      }
      return true;
    });
  }, [claimType, claims, projectId, status]);

  const isInitialLoading = isLoading && !claimPage;
  const hasInitialError = error && !claimPage;

  if (isInitialLoading) {
    return <div className="state-panel">Loading claim ledger…</div>;
  }

  if (hasInitialError) {
    return <div className="state-panel state-error">Claim error: {error}</div>;
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Claims</p>
          <h2>Cross-project claim ledger</h2>
          <p className="page-copy">
            Inspect claim status, confidence, and evidence coverage across the full portfolio.
          </p>
        </div>
        {warning ? <div className="notice-banner">{warning}</div> : null}
      </header>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Filters</h3>
            <p>Status, claim type, and project filters for rapid triage.</p>
          </div>
        </div>
        <div className="filters-grid">
          <label className="select-field">
            <span className="field-label">Status</span>
            <span className="select-shell">
              <select className="select-control" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="">All statuses</option>
                {Array.from(new Set(claims.map((claim) => claim.status))).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <label className="select-field">
            <span className="field-label">Claim type</span>
            <span className="select-shell">
              <select
                className="select-control"
                value={claimType}
                onChange={(event) => setClaimType(event.target.value)}
              >
                <option value="">All claim types</option>
                {Array.from(new Set(claims.map((claim) => claim.claim_type))).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <label className="select-field">
            <span className="field-label">Project</span>
            <span className="select-shell">
              <select
                className="select-control"
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
              >
                <option value="">All projects</option>
                {Array.from(new Map(claims.map((claim) => [claim.project_id, claim.project_name])).entries()).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </select>
            </span>
          </label>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Claim ledger</h3>
            <p>
              Missing evidence claims remain visually obvious. Contradictions stay urgent.
              {claimPage ? ` Showing ${claims.length} of ${claimPage.total}.` : ""}
            </p>
          </div>
          {isLoading ? <span className="inline-status">Updating…</span> : null}
        </div>
        {error ? <div className="notice-banner state-error">Claim refresh failed: {error}</div> : null}
        {filteredClaims.length === 0 ? (
          <div className="empty-state">No claims match the current filters.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Claim</th>
                <th>Claim type</th>
                <th>Status</th>
                <th>Confidence</th>
                <th>Evidence count</th>
                <th>Created at</th>
              </tr>
            </thead>
            <tbody>
              {filteredClaims.map((claim) => (
                <tr key={claim.id}>
                  <td>{claim.project_name}</td>
                  <td>{claim.claim_text}</td>
                  <td>{claim.claim_type}</td>
                  <td>
                    <ClaimStatusBadge status={claim.status} />
                  </td>
                  <td>{Math.round(claim.confidence * 100)}%</td>
                  <td>{claim.evidence_count}</td>
                  <td>{new Date(claim.created_at).toLocaleDateString("en-US")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {claimPage?.next_cursor ? (
          <div className="table-footer">
            <button
              type="button"
              className="button-secondary"
              onClick={loadMoreClaims}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? "Loading..." : "Load more claims"}
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
