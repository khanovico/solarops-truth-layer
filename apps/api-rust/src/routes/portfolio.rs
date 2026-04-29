use axum::{Json, Router, extract::State, routing::get};

use crate::{AppState, db::queries, error::AppResult};

pub fn router() -> Router<AppState> {
    Router::new().route("/portfolio/health", get(health))
}

async fn health(
    State(state): State<AppState>,
) -> AppResult<Json<crate::db::models::PortfolioHealth>> {
    Ok(Json(queries::portfolio_health(&state.pool).await?))
}
