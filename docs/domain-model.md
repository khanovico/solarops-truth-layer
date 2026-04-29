# Domain Model

Core entities: organizations, sites, projects, milestones, assets, evidence documents, claims, claim evidence links, blockers, activity events, and AI runs.

Project health is backend-computed:

- `green`: required evidence exists and no open high blocker exists.
- `yellow`: medium blocker, non-critical missing evidence, or upcoming milestone risk exists.
- `red`: high blocker, data conflict, or overdue required milestone exists.
- `unknown`: insufficient evidence exists to evaluate.

Claim statuses:

- `verified`: directly supported by linked evidence.
- `assumption`: inferred from structured data without direct evidence.
- `missing_evidence`: required support is absent.
- `contradicted`: available records conflict with the claim.
