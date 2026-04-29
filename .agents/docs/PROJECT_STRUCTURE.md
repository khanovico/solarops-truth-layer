# Project Structure

SolarOps Truth Layer uses a four-service local stack.

```txt
.
├── apps/
│   ├── api-rust/       # Rust/Axum system-of-record API on port 8080
│   │   └── migrations/ # PostgreSQL schema and deterministic seed data
│   ├── ai-service/     # Python/FastAPI AI service on port 8001
│   └── web/            # React/Vite frontend on port 5173
├── docs/               # Human-readable architecture/API/domain docs
├── .agents/
│   ├── docs/           # PRD, plans, ticket ledger, project structure
│   ├── memory/         # Reusable project lessons
│   └── workflows/      # Agent execution workflow
├── docker-compose.yml  # Local four-service stack
├── Makefile            # Common dev/test commands
├── .env.example        # Local environment template
└── README.md           # Setup and demo overview
```

## Service Boundaries

- `apps/web` talks only to `api-rust`, never directly to PostgreSQL or the AI service.
- `apps/api-rust` owns database access, deterministic verification, activity events, and AI response validation.
- `apps/ai-service` produces schema-validated structured answers; mock provider is deterministic by default.
- `apps/api-rust/migrations` seeds deterministic demo data for Projects A-E.

## Root-Owned Files

Root orchestration and docs are owned by the main executor during implementation to avoid cross-agent conflicts:

- `docker-compose.yml`
- `.env.example`
- `Makefile`
- `README.md`
- `.agents/docs/**`
- `docs/**`
- `apps/api-rust/migrations/**`
