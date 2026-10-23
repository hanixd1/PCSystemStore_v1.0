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
    lastSearchQuery: str | None = None
    # Component a requested build is based on ("armalo con una pc").
    anchorProductId: str | None = None


class CatalogProduct(BaseModel):
    id: str
    name: str
    slug: str | None = None
    category: str = "GENERAL"
    price: float = Field(ge=0)
    stock: int = Field(ge=0)
    imageUrl: str | None = None
    productUrl: str
    brand: str | None = None
    # Store-search score computed by the backend; None when the catalog was not searched.
    relevance: float | None = None
    # Compatibility data for builds: socket, memoryType, tdp, powerWatts, wattage...
    attributes: dict[str, str | int | float | None] = Field(default_factory=dict)


class SearchContext(BaseModel):
    text: str = ""
    maxPrice: float | None = None
    minPrice: float | None = None
    sort: Literal["cheapest", "premium"] | None = None
    categories: list[str] = Field(default_factory=list)
    matched: bool = False


class ChatRequest(BaseModel):
    message: str
    sessionId: str | None = None
    conversationState: ConversationState | None = None
    catalog: list[CatalogProduct] = Field(default_factory=list)
    search: SearchContext | None = None
    # Set by the backend when the customer asks to build a PC around a specific component.
    anchorProductId: str | None = None


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
