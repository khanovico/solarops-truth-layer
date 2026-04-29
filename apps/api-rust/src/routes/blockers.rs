use axum::{
    Json, Router,
    extract::{Path, State},
    routing::{get, patch},
};
use uuid::Uuid;

use crate::{
    AppState,
    db::{
        models::{Blocker, BlockerUpdateRequest},
        queries,
    },
    error::AppResult,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/projects/:project_id/blockers", get(list_blockers))
        .route("/blockers/:blocker_id", patch(update_blocker))
}

async fn list_blockers(
    State(state): State<AppState>,
    Path(project_id): Path<Uuid>,
) -> AppResult<Json<Vec<Blocker>>> {
    Ok(Json(queries::list_blockers(&state.pool, project_id).await?))
}

async fn update_blocker(
    State(state): State<AppState>,
    Path(blocker_id): Path<Uuid>,
    Json(request): Json<BlockerUpdateRequest>,
) -> AppResult<Json<Blocker>> {
    Ok(Json(
        queries::update_blocker(&state.pool, blocker_id, request).await?,
    ))
}
