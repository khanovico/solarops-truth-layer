# API Contracts

Rust API base URL: `http://localhost:8080`.

Endpoints:

- `GET /health`
- `GET /portfolio/health`
- `GET /projects`
- `GET /projects/{project_id}`
- `PATCH /projects/{project_id}/stage`
- `POST /projects/{project_id}/evidence`
- `GET /projects/{project_id}/claims`
- `POST /projects/{project_id}/claims/{claim_id}/reverify`
- `GET /projects/{project_id}/blockers`
- `PATCH /blockers/{blocker_id}`
- `POST /projects/{project_id}/ai/ask`

List endpoints are bounded by default:

- `GET /projects?limit=100&cursor=0&stage=financing_review&health=yellow&has_open_blockers=true`
- `GET /claims?limit=100&cursor=0&status=missing_evidence&claim_type=rebate`

Paginated responses use:

```json
{
  "items": [],
  "next_cursor": null,
  "total": 5
}
```

## Examples

`POST /projects/{project_id}/evidence`

```json
{
  "evidence_type": "rebate_award_letter",
  "title": "Utility rebate award letter",
  "summary": "Utility rebate approval for rooftop solar package.",
  "source_uri": "mock://docs/rebate-award.pdf",
  "effective_date": "2026-05-15",
  "uploaded_by": "Demo User"
}
```

`POST /projects/{project_id}/ai/ask`

```json
{
  "question": "Is this project ready for financing review?",
  "actor": "Demo User"
}
```

Standard errors:

```json
{
  "error": {
    "code": "PROJECT_NOT_FOUND",
    "message": "Project not found.",
    "details": {}
  }
}
```
