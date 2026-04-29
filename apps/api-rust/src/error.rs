use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::Serialize;
use serde_json::{Value, json};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Project not found.")]
    ProjectNotFound,
    #[error("Blocker not found.")]
    BlockerNotFound,
    #[error("Invalid project stage.")]
    InvalidProjectStage,
    #[error("Invalid evidence type.")]
    InvalidEvidenceType,
    #[error("Invalid claim status.")]
    InvalidClaimStatus,
    #[error("AI service unavailable.")]
    AiServiceUnavailable,
    #[error("AI response invalid.")]
    AiResponseInvalid,
    #[error("Database error.")]
    Database(#[from] sqlx::Error),
}

#[derive(Debug, Serialize)]
struct ErrorEnvelope {
    error: ErrorBody,
}

#[derive(Debug, Serialize)]
struct ErrorBody {
    code: &'static str,
    message: String,
    details: Value,
}

impl AppError {
    fn status_code(&self) -> StatusCode {
        match self {
            Self::ProjectNotFound | Self::BlockerNotFound => StatusCode::NOT_FOUND,
            Self::InvalidProjectStage | Self::InvalidEvidenceType | Self::InvalidClaimStatus => {
                StatusCode::BAD_REQUEST
            }
            Self::AiServiceUnavailable => StatusCode::BAD_GATEWAY,
            Self::AiResponseInvalid => StatusCode::BAD_GATEWAY,
            Self::Database(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    fn code(&self) -> &'static str {
        match self {
            Self::ProjectNotFound => "PROJECT_NOT_FOUND",
            Self::BlockerNotFound => "BLOCKER_NOT_FOUND",
            Self::InvalidProjectStage => "INVALID_PROJECT_STAGE",
            Self::InvalidEvidenceType => "INVALID_EVIDENCE_TYPE",
            Self::InvalidClaimStatus => "INVALID_CLAIM_STATUS",
            Self::AiServiceUnavailable => "AI_SERVICE_UNAVAILABLE",
            Self::AiResponseInvalid => "AI_RESPONSE_INVALID",
            Self::Database(_) => "DATABASE_ERROR",
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        tracing::warn!(code = self.code(), error = %self, "request failed");
        let status = self.status_code();
        let body = ErrorEnvelope {
            error: ErrorBody {
                code: self.code(),
                message: self.to_string(),
                details: json!({}),
            },
        };
        (status, Json(body)).into_response()
    }
}

pub type AppResult<T> = Result<T, AppError>;
