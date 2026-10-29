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


# The backend validates the same bounds (backend/src/ai/dto/chat.dto.ts); these protect the
# service if it is ever called directly.
MAX_TEXT = 500
MAX_ID = 100
MAX_NAME = 300
MAX_URL = 2048
MAX_STATE_PRODUCTS = 20
# The backend sends at most its build catalog (600) plus the anchor product.
MAX_CATALOG = 700


class StoredProduct(BaseModel):
    id: str = Field(max_length=MAX_ID)
    name: str = Field(max_length=MAX_NAME)
    category: str | None = Field(default=None, max_length=40)
    price: float = Field(ge=0)
    stock: int = Field(ge=0)
    imageUrl: str | None = Field(default=None, max_length=MAX_URL)
    productUrl: str = Field(max_length=MAX_URL)


class ConversationState(BaseModel):
    intent: ChatIntent | None = None
    budget: int | None = None
    usage: str | None = Field(default=None, max_length=50)
    includesPeripherals: bool | None = None
    mentionedProducts: list[str] = Field(default_factory=list, max_length=MAX_STATE_PRODUCTS)
    lastRecommendedProducts: list[StoredProduct] = Field(
        default_factory=list, max_length=MAX_STATE_PRODUCTS
    )
    lastRecommendedBuild: list[StoredProduct] = Field(
        default_factory=list, max_length=MAX_STATE_PRODUCTS
    )
    lastFocusedProductId: str | None = Field(default=None, max_length=MAX_ID)
    awaiting: str | None = Field(default=None, max_length=50)
    lastSearchQuery: str | None = Field(default=None, max_length=MAX_TEXT)
    # Component a requested build is based on ("armalo con una pc").
    anchorProductId: str | None = Field(default=None, max_length=MAX_ID)


class CatalogProduct(BaseModel):
    id: str = Field(max_length=MAX_ID)
    name: str = Field(max_length=MAX_NAME)
    slug: str | None = Field(default=None, max_length=MAX_NAME)
    category: str = Field(default="GENERAL", max_length=40)
    price: float = Field(ge=0)
    stock: int = Field(ge=0)
    imageUrl: str | None = Field(default=None, max_length=MAX_URL)
    productUrl: str = Field(max_length=MAX_URL)
    brand: str | None = Field(default=None, max_length=100)
    # Store-search score computed by the backend; None when the catalog was not searched.
    relevance: float | None = None
    # Compatibility data for builds: socket, memoryType, tdp, powerWatts, wattage...
    attributes: dict[str, str | int | float | None] = Field(default_factory=dict)


class SearchContext(BaseModel):
    text: str = Field(default="", max_length=MAX_TEXT)
    maxPrice: float | None = None
    minPrice: float | None = None
    sort: Literal["cheapest", "premium"] | None = None
    categories: list[str] = Field(default_factory=list, max_length=40)
    matched: bool = False


class ChatRequest(BaseModel):
    message: str = Field(max_length=MAX_TEXT)
    sessionId: str | None = Field(default=None, max_length=MAX_ID)
    conversationState: ConversationState | None = None
    catalog: list[CatalogProduct] = Field(default_factory=list, max_length=MAX_CATALOG)
    search: SearchContext | None = None
    # Set by the backend when the customer asks to build a PC around a specific component.
    anchorProductId: str | None = Field(default=None, max_length=MAX_ID)


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
