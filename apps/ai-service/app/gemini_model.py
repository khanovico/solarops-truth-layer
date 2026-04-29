from __future__ import annotations

from app.schemas import AskRequest, AiAnswer


def answer_question(_req: AskRequest) -> AiAnswer:
    raise NotImplementedError("Gemini mode not implemented yet. Use AI_PROVIDER=mock.")
