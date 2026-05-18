from fastapi import APIRouter

from schemas.chatbot_schema import ChatRequest, ChatResponse
from services.chatbot_service import build_chat_response


router = APIRouter()


@router.post("", response_model=ChatResponse)
def chat(payload: ChatRequest) -> ChatResponse:
    return build_chat_response(payload)
