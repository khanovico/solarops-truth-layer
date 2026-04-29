use axum::{
    Json, Router,
    extract::{Path, Query, State},
    routing::{get, post},
};
use uuid::Uuid;

use crate::{
    AppState,
    db::{
        models::{
            ClaimFilters, ClaimReverifyRequest, ClaimWithEvidence, GlobalClaim, PaginatedResponse,
        },
        queries,
    },
    error::AppResult,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/claims", get(list_all_claims))
        .route("/projects/:project_id/claims", get(list_claims))
        .route(
            "/projects/:project_id/claims/:claim_id/reverify",
            post(reverify_claim),
        )
}

async fn list_all_claims(
    State(state): State<AppState>,
    Query(filters): Query<ClaimFilters>,
) -> AppResult<Json<PaginatedResponse<GlobalClaim>>> {
    Ok(Json(queries::list_all_claims(&state.pool, &filters).await?))
}

async fn list_claims(
    State(state): State<AppState>,
    Path(project_id): Path<Uuid>,
) -> AppResult<Json<Vec<ClaimWithEvidence>>> {
    Ok(Json(queries::list_claims(&state.pool, project_id).await?))
}

async fn reverify_claim(
    State(state): State<AppState>,
    Path((project_id, claim_id)): Path<(Uuid, Uuid)>,
    Json(request): Json<ClaimReverifyRequest>,
) -> AppResult<Json<ClaimWithEvidence>> {
    Ok(Json(
        queries::reverify_claim(&state.pool, project_id, claim_id, request).await?,
    ))
}
