from fastapi import APIRouter

from chatbot.schemas import ChatRequest, ChatResponse
from chatbot.service import build_chat_response


router = APIRouter()


@router.post("", response_model=ChatResponse)
def chat(payload: ChatRequest) -> ChatResponse:
    return build_chat_response(payload)
