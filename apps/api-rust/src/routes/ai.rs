use axum::{
    Json, Router,
    extract::{Path, State},
    routing::post,
};
use uuid::Uuid;

use crate::{
    AppState,
    ai_client::AiAnswer,
    db::{models::AiAskRequestBody, queries},
    error::AppResult,
};

pub fn router() -> Router<AppState> {
    Router::new().route("/projects/:project_id/ai/ask", post(ask))
}

async fn ask(
    State(state): State<AppState>,
    Path(project_id): Path<Uuid>,
    Json(request): Json<AiAskRequestBody>,
) -> AppResult<Json<AiAnswer>> {
    let detail = queries::project_detail(&state.pool, project_id).await?;
    let answer = state
        .ai_client
        .ask(&detail, &request.question)
        .await?
        .validate_against_project(&detail)?;
    queries::persist_ai_answer(
        &state.pool,
        project_id,
        &request.question,
        &request.actor,
        &answer,
    )
    .await?;
    Ok(Json(answer))
}
