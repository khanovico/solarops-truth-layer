mod ai_client;
mod db;
mod domain;
mod error;
mod routes;

use std::net::SocketAddr;

use anyhow::Context;
use axum::{Router, routing::get};
use sqlx::{PgPool, postgres::PgPoolOptions};
use tower_http::{cors::CorsLayer, trace::TraceLayer};

use crate::ai_client::AiClient;

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub ai_client: AiClient,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    init_tracing();

    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://solarops:solarops@localhost:5432/solarops".to_owned());
    let ai_service_url =
        std::env::var("AI_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8001".to_owned());

    let pool = PgPoolOptions::new()
        .max_connections(8)
        .connect(&database_url)
        .await
        .context("failed to connect to postgres")?;

    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .context("failed to run migrations")?;

    let app = app(AppState {
        pool,
        ai_client: AiClient::new(ai_service_url),
    });
    let addr: SocketAddr = "0.0.0.0:8080"
        .parse()
        .context("failed to parse bind address")?;
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .context("failed to bind API listener")?;

    tracing::info!(%addr, "solarops API listening");
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .context("API server failed")?;

    Ok(())
}

pub fn app(state: AppState) -> Router {
    Router::new()
        .route("/health", get(routes::health::health))
        .merge(routes::portfolio::router())
        .merge(routes::projects::router())
        .merge(routes::evidence::router())
        .merge(routes::claims::router())
        .merge(routes::blockers::router())
        .merge(routes::ai::router())
        .with_state(state)
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
}

pub fn health_app() -> Router {
    Router::new()
        .route("/health", get(routes::health::health))
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
}

fn init_tracing() {
    let filter = tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| "solarops_api=info,tower_http=info".into());

    tracing_subscriber::fmt()
        .with_env_filter(filter)
        .with_target(false)
        .compact()
        .init();
}

async fn shutdown_signal() {
    let _ = tokio::signal::ctrl_c().await;
}

#[cfg(test)]
mod tests {
    use axum::{
        body::Body,
        http::{Request, StatusCode},
    };
    use tower::ServiceExt;

    use super::health_app;

    #[tokio::test]
    async fn test_health_endpoint_returns_ok() {
        let response = health_app()
            .oneshot(
                Request::builder()
                    .uri("/health")
                    .body(Body::empty())
                    .expect("request builds"),
            )
            .await
            .expect("health response");

        assert_eq!(response.status(), StatusCode::OK);
    }
}
