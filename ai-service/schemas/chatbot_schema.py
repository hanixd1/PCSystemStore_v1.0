from typing import Literal

from pydantic import BaseModel, Field


ChatIntent = Literal[
    "product_search",
    "pc_build",
    "budget_pc_build",
    "cart_action",
    "total_query",
    "checkout_guidance",
    "support",
    "unknown",
]


class StoredProduct(BaseModel):
    id: str
    name: str
    category: str | None = None
    price: float
    stock: int
    imageUrl: str | None = None
    productUrl: str


class ConversationState(BaseModel):
    intent: ChatIntent | None = None
    budget: int | None = None
    usage: str | None = None
    includesPeripherals: bool | None = None
    mentionedProducts: list[str] = Field(default_factory=list)
    lastRecommendedProducts: list[StoredProduct] = Field(default_factory=list)
    lastRecommendedBuild: list[StoredProduct] = Field(default_factory=list)
    lastFocusedProductId: str | None = None
    awaiting: str | None = None


class CatalogProduct(BaseModel):
    id: str
    name: str
    slug: str | None = None
    category: str = "GENERAL"
    price: float = Field(ge=0)
    stock: int = Field(ge=0)
    imageUrl: str | None = None
    productUrl: str


class ChatRequest(BaseModel):
    message: str
    sessionId: str | None = None
    conversationState: ConversationState | None = None
    catalog: list[CatalogProduct] = Field(default_factory=list)


class ChatProduct(BaseModel):
    id: str
    name: str
    price: float
    stock: int
    imageUrl: str | None = None
    productUrl: str


class ChatAction(BaseModel):
    type: Literal["add_to_cart"]
    productId: str
    quantity: int = Field(default=1, ge=1)


class ChatTotals(BaseModel):
    subtotal: float
    igv: float
    total: float


class ChatResponse(BaseModel):
    reply: str
    intent: ChatIntent
    conversationState: ConversationState
    products: list[ChatProduct] = Field(default_factory=list)
    actions: list[ChatAction] = Field(default_factory=list)
    totals: ChatTotals | None = None
    status: Literal["ok", "degraded"] = "ok"
