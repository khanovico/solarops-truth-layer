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
