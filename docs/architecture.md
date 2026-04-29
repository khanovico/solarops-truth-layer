# Architecture

SolarOps Truth Layer uses a four-service local stack: React UI, Rust API, Python AI service, and PostgreSQL.

```mermaid
flowchart LR
  UI[React + Vite UI] --> API[Rust Axum API]
  API --> DB[(PostgreSQL)]
  API --> AI[Python FastAPI AI Service]
  AI --> API
  API --> DB
```

The Rust API is the system-of-record boundary. It reads project context from PostgreSQL, calls the AI service for structured suggestions, validates unsafe AI output, persists claims and AI runs, and returns normalized responses to the UI.
