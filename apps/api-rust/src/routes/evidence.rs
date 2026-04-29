use axum::{
    Json, Router,
    extract::{Path, State},
    routing::post,
};
use uuid::Uuid;

use crate::{
    AppState,
    db::{
        models::{EvidenceCreateRequest, ProjectDetail},
        queries,
    },
    error::AppResult,
};

pub fn router() -> Router<AppState> {
    Router::new().route("/projects/:project_id/evidence", post(create_evidence))
}

async fn create_evidence(
    State(state): State<AppState>,
    Path(project_id): Path<Uuid>,
    Json(request): Json<EvidenceCreateRequest>,
) -> AppResult<Json<ProjectDetail>> {
    Ok(Json(
        queries::create_evidence(&state.pool, project_id, request).await?,
    ))
}
