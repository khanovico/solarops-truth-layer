from __future__ import annotations

import os

from fastapi import FastAPI, HTTPException

from app import gemini_model, mock_model
from app.schemas import AiAnswer, AskRequest

app = FastAPI(title="solarops-ai")


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "solarops-ai",
        "model_mode": os.getenv("AI_PROVIDER", "mock"),
    }


@app.post("/ask", response_model=AiAnswer)
def ask(req: AskRequest) -> AiAnswer:
    mode = os.getenv("AI_PROVIDER", "mock").lower()
    if mode == "mock":
        return mock_model.answer_question(req)
    if mode == "gemini":
        try:
            return gemini_model.answer_question(req)
        except NotImplementedError as exc:
            raise HTTPException(status_code=501, detail=str(exc)) from exc
    raise HTTPException(status_code=400, detail=f"Unsupported AI_PROVIDER: {mode}")
