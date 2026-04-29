use axum::{
    Json, Router,
    extract::{Path, Query, State},
    routing::{get, patch},
};
use uuid::Uuid;

use crate::{
    AppState,
    db::{
        models::{ProjectDetail, ProjectFilters, ProjectSummary, StageUpdateRequest},
        queries,
    },
    error::AppResult,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/projects", get(list_projects))
        .route("/projects/:project_id", get(project_detail))
        .route("/projects/:project_id/stage", patch(update_stage))
}

async fn list_projects(
    State(state): State<AppState>,
    Query(filters): Query<ProjectFilters>,
) -> AppResult<Json<Vec<ProjectSummary>>> {
    Ok(Json(queries::list_projects(&state.pool, &filters).await?))
}

async fn project_detail(
    State(state): State<AppState>,
    Path(project_id): Path<Uuid>,
) -> AppResult<Json<ProjectDetail>> {
    Ok(Json(
        queries::project_detail(&state.pool, project_id).await?,
    ))
}

async fn update_stage(
    State(state): State<AppState>,
    Path(project_id): Path<Uuid>,
    Json(request): Json<StageUpdateRequest>,
) -> AppResult<Json<ProjectDetail>> {
    Ok(Json(
        queries::update_stage(&state.pool, project_id, request).await?,
    ))
}
