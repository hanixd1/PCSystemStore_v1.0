import re
import unicodedata

from schemas.chatbot_schema import (
    CatalogProduct,
    ChatAction,
    ChatIntent,
    ChatProduct,
    ChatRequest,
    ChatResponse,
    ChatTotals,
    ConversationState,
    StoredProduct,
)


MAX_BUDGET_TEXT_LENGTH = 300
MIN_BUDGET = 100
MAX_BUDGET = 50000

MODEL_PATTERNS = [
    r"\brtx\s?\d{4}\b",
    r"\bgtx\s?\d{3,4}\b",
    r"\brx\s?\d{4}\b",
    r"\bryzen\s?[579]\b",
    r"\bintel\s?i[3579]\b",
    r"\bcore\s?i[3579]\b",
    r"\bb\d{3}\b",
    r"\bz\d{3}\b",
    r"\bddr[45]\b",
    r"\bnvme\b",
    r"\bssd\b",
    r"\bhdd\b",
]

BUDGET_MARKERS = [
    "presupuesto",
    "soles",
    "sol",
    "s/",
    "s/.",
    "tengo",
    "cuento",
    "cuento con",
    "gastar",
    "quiero gastar",
    "maximo",
    "hasta",
    "invertir",
    "para una pc",
    "para pc",
]

BUDGET_CONTEXT_TOKENS = {
    "presupuesto",
    "soles",
    "sol",
    "s/",
    "s/.",
    "tengo",
    "cuento",
    "gastar",
    "maximo",
    "hasta",
    "invertir",
}

BUDGET_CONTEXT_PHRASES = [
    "cuento con",
    "quiero gastar",
]

PRODUCT_MODEL_TOKENS = {
    "rtx",
    "gtx",
    "rx",
    "ryzen",
    "intel",
    "core",
    "i3",
    "i5",
    "i7",
    "i9",
    "ddr4",
    "ddr5",
    "nvme",
    "ssd",
    "hdd",
}

TOTAL_MARKERS = [
    "cuanto sale",
    "cuanto cuesta",
    "total",
    "precio total",
    "en total",
    "cuanto seria",
    "cuanto es",
]

CART_MARKERS = [
    "agregalo al carrito",
    "agrega al carrito",
    "anadelo al carrito",
    "anade al carrito",
    "agrega ese",
    "anade ese",
    "quiero ese",
    "lo quiero",
    "comprar ese",
    "ponlo en mi carrito",
    "mandalo al carrito",
]

CART_ALL_MARKERS = [
    "agrega todo",
    "anade todo",
    "agrega todos",
    "anade todos",
]

CHECKOUT_MARKERS = [
    "comprar ahora",
    "procesar pedido",
    "pagar",
    "finalizar compra",
    "hacer pedido",
    "confirmar compra",
]


def normalize_text(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value.lower())
    return "".join(char for char in normalized if unicodedata.category(char) != "Mn")


def normalize_budget_text(text: str) -> str:
    normalized = normalize_text(text[:MAX_BUDGET_TEXT_LENGTH])
    normalized = normalized.replace(",", ".")
    normalized = normalized.replace("s/.", "s/")
    normalized = normalized.replace("\n", " ")
    normalized = normalized.replace("\r", " ")
    normalized = normalized.replace("\t", " ")
    return normalized


def has_budget_context(text: str, tokens: list[str]) -> bool:
    normalized_tokens = [token.strip(".,;:()[]{}") for token in tokens]
    if any(
        token in BUDGET_CONTEXT_TOKENS or token.startswith("s/")
        for token in normalized_tokens
    ):
        return True
    return any(phrase in text for phrase in BUDGET_CONTEXT_PHRASES)


def has_product_model_context(tokens: list[str]) -> bool:
    return any(token.strip(".,;:()[]{}") in PRODUCT_MODEL_TOKENS for token in tokens)


def is_budget_context_token(token: str) -> bool:
    return token.strip(".,;:()[]{}") in BUDGET_CONTEXT_TOKENS


def is_budget_candidate(tokens: list[str], index: int) -> bool:
    token = tokens[index].strip(".,;:()[]{}")
    if token.startswith("s/") and parse_budget_token(token) is not None:
        return True

    previous_tokens = tokens[max(0, index - 4):index]
    next_token = (
        tokens[index + 1].strip(".,;:()[]{}") if index + 1 < len(tokens) else ""
    )

    if any(is_budget_context_token(previous) for previous in previous_tokens):
        return True
    if next_token in {"sol", "soles"}:
        return True

    previous_text = " ".join(previous_tokens)
    return any(phrase in previous_text for phrase in BUDGET_CONTEXT_PHRASES)


def parse_budget_token(token: str) -> int | None:
    cleaned = token.strip(".,;:()[]{}")
    if cleaned.startswith("s/."):
        cleaned = cleaned[3:]
    elif cleaned.startswith("s/"):
        cleaned = cleaned[2:]

    cleaned = cleaned.strip(".,;:()[]{}").replace(",", ".")
    if not cleaned:
        return None

    multiplier = 1
    if cleaned.endswith("k"):
        multiplier = 1000
        cleaned = cleaned[:-1]

    if cleaned.count(".") > 1:
        return None

    for char in cleaned:
        if not (char.isdigit() or char == "."):
            return None

    try:
        value = float(cleaned) * multiplier
    except ValueError:
        return None

    amount = int(round(value))
    if MIN_BUDGET <= amount <= MAX_BUDGET:
        return amount
    return None


def extract_budget_from_text(text: str) -> int | None:
    normalized = normalize_budget_text(text)
    tokens = normalized.split()
    if not has_budget_context(normalized, tokens):
        return None

    has_product_context = has_product_model_context(tokens)
    has_clear_budget_context = has_budget_context(normalized, tokens)
    if has_product_context and not has_clear_budget_context:
        return None

    for index, token in enumerate(tokens):
        if not is_budget_candidate(tokens, index):
            continue

        amount = parse_budget_token(token)
        if amount is not None:
            return amount

    return None


def detect_model_mentions(message: str) -> list[str]:
    normalized = normalize_text(message)
    mentions: list[str] = []
    for pattern in MODEL_PATTERNS:
        mentions.extend(
            match.group(0).replace("  ", " ")
            for match in re.finditer(pattern, normalized)
        )
    return list(dict.fromkeys(mentions))


def detect_budget(message: str, has_model_mention: bool) -> int | None:
    normalized = normalize_text(message)
    if not any(marker in normalized for marker in BUDGET_MARKERS):
        return None

    if has_model_mention and not any(
        marker in normalized
        for marker in [
            "presupuesto",
            "soles",
            "s/",
            "tengo",
            "cuento con",
            "quiero gastar",
            "maximo",
            "hasta",
        ]
    ):
        return None

    return extract_budget_from_text(message)


def detect_usage(message: str) -> str | None:
    normalized = normalize_text(message)
    if any(word in normalized for word in ["gamer", "gaming", "juegos", "jugar"]):
        return "gaming"
    if any(word in normalized for word in ["oficina", "estudio", "estudiar"]):
        return "office"
    if any(word in normalized for word in ["diseno", "render", "edicion", "editar"]):
        return "creative"
    if "streaming" in normalized:
        return "streaming"
    return None


def detect_peripherals(message: str) -> bool | None:
    normalized = normalize_text(message)
    if any(
        text in normalized
        for text in [
            "solo torre",
            "solo la torre",
            "sin monitor",
            "sin teclado",
            "sin mouse",
            "sin perifericos",
        ]
    ):
        return False
    if any(
        text in normalized
        for text in [
            "con monitor",
            "incluye monitor",
            "con teclado y mouse",
            "todo completo",
            "con todo",
        ]
    ):
        return True
    return None


def classify_intent(
    message: str,
    state: ConversationState,
    mentions: list[str],
    budget: int | None,
    usage: str | None,
) -> ChatIntent:
    normalized = normalize_text(message)
    if any(marker in normalized for marker in CHECKOUT_MARKERS):
        return "checkout_guidance"
    if any(marker in normalized for marker in CART_ALL_MARKERS + CART_MARKERS):
        return "cart_action"
    if any(marker in normalized for marker in TOTAL_MARKERS):
        return "total_query"
    if mentions:
        return "product_search"
    if budget is not None and ("pc" in normalized or usage is not None):
        return "budget_pc_build"
    if any(text in normalized for text in ["armar", "pc", "computadora", "setup"]):
        return "pc_build"
    if state.intent in ["pc_build", "budget_pc_build"] and (
        budget is not None or usage is not None
    ):
        return state.intent
    if state.intent in ["pc_build", "budget_pc_build"] and any(
        text in normalized
        for text in ["solo torre", "solo la torre", "con monitor", "con todo"]
    ):
        return state.intent
    if normalized in ["hola", "buenas", "hello", "ayuda"]:
        return "support"
    return "unknown"


def merge_state(request: ChatRequest) -> tuple[ConversationState, list[str], ChatIntent]:
    state = request.conversationState or ConversationState()
    mentions = detect_model_mentions(request.message)
    budget = detect_budget(request.message, bool(mentions))
    usage = detect_usage(request.message)
    includes_peripherals = detect_peripherals(request.message)
    intent = classify_intent(request.message, state, mentions, budget, usage)

    if budget is not None:
        state.budget = budget
    if usage is not None:
        state.usage = usage
    if includes_peripherals is not None:
        state.includesPeripherals = includes_peripherals
    if mentions:
        state.mentionedProducts = list(
            dict.fromkeys([*state.mentionedProducts, *mentions])
        )
    state.intent = intent
    return state, mentions, intent


def product_to_chat(product: CatalogProduct) -> ChatProduct:
    return ChatProduct(
        id=product.id,
        name=product.name,
        price=product.price,
        stock=product.stock,
        imageUrl=product.imageUrl,
        productUrl=product.productUrl,
    )


def catalog_to_stored(product: CatalogProduct) -> StoredProduct:
    return StoredProduct(
        id=product.id,
        name=product.name,
        category=product.category,
        price=product.price,
        stock=product.stock,
        imageUrl=product.imageUrl,
        productUrl=product.productUrl,
    )


def stored_to_chat(product: StoredProduct) -> ChatProduct:
    return ChatProduct(
        id=product.id,
        name=product.name,
        price=product.price,
        stock=product.stock,
        imageUrl=product.imageUrl,
        productUrl=product.productUrl,
    )


def calculate_totals(products: list[StoredProduct]) -> ChatTotals:
    total = sum(product.price for product in products)
    igv = total * (18 / 118)
    subtotal = total - igv
    return ChatTotals(
        subtotal=round(subtotal, 2),
        igv=round(igv, 2),
        total=round(total, 2),
    )


def get_remembered_products(state: ConversationState) -> list[StoredProduct]:
    return state.lastRecommendedBuild or state.lastRecommendedProducts


def find_remembered_product(state: ConversationState, product_id: str | None) -> StoredProduct | None:
    if not product_id:
        return None
    for product in [*state.lastRecommendedProducts, *state.lastRecommendedBuild]:
        if product.id == product_id:
            return product
    return None


def search_catalog(
    catalog: list[CatalogProduct], terms: list[str], message: str
) -> list[CatalogProduct]:
    normalized_message = normalize_text(message)
    search_terms = terms or [
        term
        for term in re.split(r"[^a-z0-9]+", normalized_message)
        if len(term) > 2
    ]
    scored: list[tuple[int, CatalogProduct]] = []

    for product in catalog:
        product_text = normalize_text(f"{product.name} {product.category}")
        score = 0
        for term in search_terms:
            parts = term.split()
            if term in product_text:
                score += 5
            score += sum(2 for part in parts if part and part in product_text)
        if score > 0:
            if product.stock > 0:
                score += 1
            scored.append((score, product))

    return [
        product
        for _, product in sorted(scored, key=lambda item: (-item[0], item[1].price))[
            :3
        ]
    ]


def recommend_pc_from_catalog(
    catalog: list[CatalogProduct], state: ConversationState
) -> list[CatalogProduct]:
    categories = ["CPU", "MOTHERBOARD", "RAM", "GPU", "STORAGE", "PSU", "CASE"]
    selected: list[CatalogProduct] = []
    remaining_budget = state.budget or 0

    for category in categories:
        candidates = [
            product
            for product in catalog
            if normalize_text(product.category) == normalize_text(category)
            and product.stock > 0
        ]
        if not candidates:
            continue
        affordable = [
            product
            for product in candidates
            if not remaining_budget or product.price <= max(remaining_budget, product.price)
        ]
        choice = sorted(affordable or candidates, key=lambda product: product.price)[0]
        selected.append(choice)
        if remaining_budget:
            remaining_budget -= choice.price

    return selected


def handle_product_search(
    request: ChatRequest,
    state: ConversationState,
    mentions: list[str],
    intent: ChatIntent,
) -> ChatResponse:
    matches = search_catalog(request.catalog, mentions, request.message)
    if not matches:
        return ChatResponse(
            reply="No encontre exactamente ese producto en el catalogo actual. Puedes probar con otro modelo o revisar la seccion correspondiente.",
            intent=intent,
            conversationState=state,
            products=[],
        )

    main = matches[0]
    stored_matches = [catalog_to_stored(product) for product in matches]
    state.lastRecommendedProducts = stored_matches
    state.lastRecommendedBuild = []
    state.lastFocusedProductId = main.id
    state.awaiting = None
    stock_text = "en stock" if main.stock > 0 else "sin stock disponible"
    return ChatResponse(
        reply=f"Encontre una opcion en la tienda: {main.name} por S/. {main.price:.2f}. Estado: {stock_text}.",
        intent="product_search",
        conversationState=state,
        products=[product_to_chat(product) for product in matches],
    )


def handle_pc_build(
    request: ChatRequest, state: ConversationState, intent: ChatIntent
) -> ChatResponse:
    if state.budget is None and state.includesPeripherals is None:
        reply = "Claro. Con que presupuesto cuentas y sera solo la torre o tambien incluye monitor, teclado y mouse?"
        state.awaiting = "budget_and_usage"
    elif state.budget is None:
        reply = "Perfecto. Dime con que presupuesto cuentas en soles para ajustar la recomendacion al catalogo real."
        state.awaiting = "budget"
    elif state.usage is None:
        reply = "Perfecto. Para que uso principal sera la PC: gaming, oficina, estudio, edicion o streaming?"
        state.awaiting = "usage"
    elif state.includesPeripherals is None:
        reply = "Perfecto, ese presupuesto es solo para la torre o tambien debe incluir monitor, teclado y mouse?"
        state.awaiting = "peripherals"
    else:
        products = recommend_pc_from_catalog(request.catalog, state)
        if products:
            stored_products = [catalog_to_stored(product) for product in products]
            state.lastRecommendedBuild = stored_products
            state.lastRecommendedProducts = stored_products
            state.lastFocusedProductId = stored_products[0].id if len(stored_products) == 1 else None
            state.awaiting = None
            scope = "solo torre" if state.includesPeripherals is False else "con perifericos"
            reply = f"Perfecto. Con S/. {state.budget} para una PC {state.usage} {scope}, puedo priorizar estos productos reales del catalogo disponibles."
            return ChatResponse(
                reply=reply,
                intent=intent,
                conversationState=state,
                products=[product_to_chat(product) for product in products],
            )
        reply = "Todavia no tengo una configuracion completa automatica con productos disponibles, pero puedo ayudarte buscando componentes compatibles del catalogo."
        state.awaiting = None

    return ChatResponse(
        reply=reply,
        intent=intent,
        conversationState=state,
        products=[],
    )


def handle_total_query(state: ConversationState) -> ChatResponse:
    products = get_remembered_products(state)
    if not products:
        return ChatResponse(
            reply="Todavia no tengo productos seleccionados para calcular un total. Dime que producto buscas o que tipo de PC quieres armar.",
            intent="total_query",
            conversationState=state,
            products=[],
        )

    totals = calculate_totals(products)
    return ChatResponse(
        reply=f"El total aproximado de los productos recomendados es S/. {totals.total:.2f}. Recuerda verificar el carrito antes de pagar porque el stock y precios pueden variar.",
        intent="total_query",
        conversationState=state,
        products=[stored_to_chat(product) for product in products],
        totals=totals,
    )


def handle_cart_action(request: ChatRequest, state: ConversationState) -> ChatResponse:
    normalized = normalize_text(request.message)
    wants_all = any(marker in normalized for marker in CART_ALL_MARKERS)

    if wants_all:
        products = state.lastRecommendedBuild or state.lastRecommendedProducts
        if not products:
            return ChatResponse(
                reply="Todavia no tengo una lista de productos para agregar. Primero dime que producto buscas o que PC quieres armar.",
                intent="cart_action",
                conversationState=state,
                products=[],
            )

        available = [product for product in products if product.stock > 0]
        if not available:
            return ChatResponse(
                reply="Los productos recomendados figuran sin stock disponible, por eso no puedo agregarlos al carrito.",
                intent="cart_action",
                conversationState=state,
                products=[stored_to_chat(product) for product in products],
            )

        return ChatResponse(
            reply="Listo, enviare los productos disponibles al carrito. Recuerda que el pedido se procesa desde Mi Cesta.",
            intent="cart_action",
            conversationState=state,
            products=[stored_to_chat(product) for product in available],
            actions=[
                ChatAction(type="add_to_cart", productId=product.id, quantity=1)
                for product in available
            ],
        )

    focused = find_remembered_product(state, state.lastFocusedProductId)
    products = state.lastRecommendedProducts

    if focused is None and len(products) == 1:
        focused = products[0]

    if focused is None:
        return ChatResponse(
            reply="Cual de los productos quieres agregar al carrito? Puedes decirme el nombre o usar el boton del producto.",
            intent="cart_action",
            conversationState=state,
            products=[stored_to_chat(product) for product in products],
        )

    if focused.stock <= 0:
        return ChatResponse(
            reply="Ese producto figura sin stock disponible, por eso no puedo agregarlo al carrito.",
            intent="cart_action",
            conversationState=state,
            products=[stored_to_chat(focused)],
        )

    return ChatResponse(
        reply=f"Listo, agregare {focused.name} al carrito. Para procesar el pedido continua desde Mi Cesta.",
        intent="cart_action",
        conversationState=state,
        products=[stored_to_chat(focused)],
        actions=[ChatAction(type="add_to_cart", productId=focused.id, quantity=1)],
    )


def handle_checkout_guidance(state: ConversationState) -> ChatResponse:
    return ChatResponse(
        reply="Ya puedes continuar desde Mi Cesta. Para procesar el pedido, el sistema te pedira iniciar sesion si aun no lo hiciste.",
        intent="checkout_guidance",
        conversationState=state,
        products=[stored_to_chat(product) for product in get_remembered_products(state)],
    )


def build_chat_response(payload: ChatRequest) -> ChatResponse:
    state, mentions, intent = merge_state(payload)

    if intent == "checkout_guidance":
        return handle_checkout_guidance(state)

    if intent == "total_query":
        return handle_total_query(state)

    if intent == "cart_action":
        return handle_cart_action(payload, state)

    if intent == "product_search":
        return handle_product_search(payload, state, mentions, intent)

    if intent in ["pc_build", "budget_pc_build"]:
        return handle_pc_build(payload, state, intent)

    if intent == "support":
        return ChatResponse(
            reply="Hola, soy Alex. Puedo ayudarte a encontrar productos del catalogo o armar una PC segun tu presupuesto.",
            intent="support",
            conversationState=state,
            products=[],
        )

    return ChatResponse(
        reply="Soy Alex. Puedo ayudarte a buscar un producto especifico o a armar una PC por presupuesto. Por ejemplo: busco una RTX 5060, o tengo 3000 soles para una PC gamer.",
        intent="unknown",
        conversationState=state,
        products=[],
    )
