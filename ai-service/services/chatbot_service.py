import re
import unicodedata
from dataclasses import dataclass

from schemas.chatbot_schema import (
    CatalogProduct,
    ChatAction,
    ChatIntent,
    ChatProduct,
    ChatRequest,
    ChatResponse,
    ChatTotals,
    ConversationState,
    SearchContext,
    StoredProduct,
)


MAX_BUDGET_TEXT_LENGTH = 300
MIN_BUDGET = 100
MAX_BUDGET = 50000
TOKEN_STRIP_CHARS = ".,;:()[]{}"
BUDGET_CONTEXT_PHRASES = (
    "cuento con",
    "quiero gastar",
)
TOWER_ONLY_PHRASES = (
    "solo torre",
    "solo la torre",
    "sin monitor",
    "sin teclado",
    "sin mouse",
    "sin perifericos",
)
PERIPHERAL_INCLUDED_PHRASES = (
    "con monitor",
    "incluye monitor",
    "con teclado y mouse",
    "todo completo",
    "con todo",
)

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
    *BUDGET_CONTEXT_PHRASES,
    "gastar",
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


# Product-name patterns per chip vendor. Board makers (Gigabyte, ASUS...) sell both GPU brands,
# so the vendor is read from the model name ("RTX 5050", "RX 9060 XT"), not the brand field.
VENDOR_PATTERNS = {
    "NVIDIA": re.compile(r"\b(nvidia|geforce|rtx|gtx)\b"),
    "AMD": re.compile(r"\b(amd|ryzen|threadripper|radeon)\b|\brx\s?\d"),
    "INTEL": re.compile(r"\b(intel|core\s+(?:i[3579]|ultra)|arc)\b|\bi[3579]-\d"),
}
VENDOR_SEARCH_TERMS = {
    "NVIDIA": ["nvidia", "geforce", "rtx"],
    "AMD": ["amd", "ryzen", "radeon"],
    "INTEL": ["intel", "core i", "core ultra"],
}
# Brand question asked for a bare "procesador" / "tarjeta de video" query.
BRAND_QUESTIONS = {
    "CPU": ("cpu_brand", "un procesador", {"AMD": "AMD (Ryzen)", "INTEL": "Intel (Core)"}),
    "GPU": (
        "gpu_brand",
        "una tarjeta de video",
        {"NVIDIA": "NVIDIA (GeForce RTX)", "AMD": "AMD (Radeon RX)", "INTEL": "Intel (Arc)"},
    ),
}
BRAND_AWAITING_CATEGORY = {awaiting: category for category, (awaiting, _, _) in BRAND_QUESTIONS.items()}


def detect_vendor(normalized: str) -> str | None:
    for vendor in ("NVIDIA", "AMD", "INTEL"):
        if VENDOR_PATTERNS[vendor].search(normalized):
            return vendor
    return None


def vendor_matches(product: CatalogProduct, vendor: str | None) -> bool:
    return vendor is None or bool(VENDOR_PATTERNS[vendor].search(normalize_text(product.name)))


@dataclass(frozen=True)
class ComponentQuery:
    category: str | None = None
    vendor: str | None = None
    search_terms: tuple[str, ...] = ()


def detect_component_query(
    message: str, state: ConversationState | None = None
) -> ComponentQuery:
    """Maps commercial wording to stable catalog terms without changing API payloads."""
    normalized = normalize_text(message)
    vendor = detect_vendor(normalized)

    category = None
    if re.search(
        r"\b(proce|procesador|cpu|ryzen|threadripper|core\s+(?:i|ultra)|i[3579]-\d)",
        normalized,
    ):
        category = "CPU"
    elif re.search(r"\b(graficas?|tarjetas? de video|gpu|vga|rtx|gtx|geforce|radeon)\b", normalized):
        category = "GPU"
    elif any(term in normalized for term in ("ram", "memoria", "ddr4", "ddr5")):
        category = "RAM"
    elif any(term in normalized for term in ("fuente", "psu", "watts")) or re.search(
        r"\b\d{3,4}w\b", normalized
    ):
        category = "PSU"
    elif any(term in normalized for term in ("ssd", "nvme", "disco", "almacenamiento")):
        category = "STORAGE"

    if category is None and vendor and state and state.awaiting in BRAND_AWAITING_CATEGORY:
        category = BRAND_AWAITING_CATEGORY[state.awaiting]

    terms: list[str] = []
    if vendor:
        terms.extend(VENDOR_SEARCH_TERMS[vendor])
    if category:
        terms.append(category.lower())
    for pattern in (r"\bryzen\s+[3579]\b", r"\bi[3579]-\d+[a-z]*\b", r"\b(?:rtx|gtx|rx)\s?\d{3,4}\b", r"\bddr[45]\b", r"\b\d{3,4}w\b"):
        terms.extend(match.group(0) for match in re.finditer(pattern, normalized))
    return ComponentQuery(category=category, vendor=vendor, search_terms=tuple(dict.fromkeys(terms)))


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
    normalized_tokens = [token.strip(TOKEN_STRIP_CHARS) for token in tokens]
    if any(
        token in BUDGET_CONTEXT_TOKENS or token.startswith("s/")
        for token in normalized_tokens
    ):
        return True
    return any(phrase in text for phrase in BUDGET_CONTEXT_PHRASES)


def has_product_model_context(tokens: list[str]) -> bool:
    return any(token.strip(TOKEN_STRIP_CHARS) in PRODUCT_MODEL_TOKENS for token in tokens)


def is_budget_context_token(token: str) -> bool:
    return token.strip(TOKEN_STRIP_CHARS) in BUDGET_CONTEXT_TOKENS


def is_budget_candidate(tokens: list[str], index: int) -> bool:
    token = tokens[index].strip(TOKEN_STRIP_CHARS)
    if token.startswith("s/") and parse_budget_token(token) is not None:
        return True

    previous_tokens = tokens[max(0, index - 4):index]
    next_token = (
        tokens[index + 1].strip(TOKEN_STRIP_CHARS) if index + 1 < len(tokens) else ""
    )

    if any(is_budget_context_token(previous) for previous in previous_tokens):
        return True
    if next_token in {"sol", "soles"}:
        return True

    previous_text = " ".join(previous_tokens)
    return any(phrase in previous_text for phrase in BUDGET_CONTEXT_PHRASES)


def parse_budget_token(token: str) -> int | None:
    cleaned = token.strip(TOKEN_STRIP_CHARS)
    if cleaned.startswith("s/."):
        cleaned = cleaned[3:]
    elif cleaned.startswith("s/"):
        cleaned = cleaned[2:]

    cleaned = cleaned.strip(TOKEN_STRIP_CHARS).replace(",", ".")
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
            *BUDGET_CONTEXT_PHRASES,
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
    if any(text in normalized for text in TOWER_ONLY_PHRASES):
        return False
    if any(text in normalized for text in PERIPHERAL_INCLUDED_PHRASES):
        return True
    return None


def classify_intent(
    message: str,
    state: ConversationState,
    mentions: list[str],
    budget: int | None,
    usage: str | None,
    component_query: ComponentQuery,
    search: SearchContext | None = None,
) -> ChatIntent:
    normalized = normalize_text(message)
    if any(marker in normalized for marker in CHECKOUT_MARKERS):
        return "checkout_guidance"
    if any(marker in normalized for marker in CART_ALL_MARKERS + CART_MARKERS):
        return "cart_action"
    if any(marker in normalized for marker in TOTAL_MARKERS):
        return "total_query"
    names_category = search is not None and (search.matched or bool(search.categories))
    if mentions or component_query.category is not None or names_category:
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
        for text in (*TOWER_ONLY_PHRASES[:2], "con monitor", "con todo")
    ):
        return state.intent
    if normalized in ["hola", "buenas", "hello", "ayuda"]:
        return "support"
    return "unknown"


def merge_state(
    request: ChatRequest,
) -> tuple[ConversationState, list[str], ChatIntent, ComponentQuery]:
    state = request.conversationState or ConversationState()
    component_query = detect_component_query(request.message, state)
    # The store search engine knows more category words ("capturadora de video" is not a GPU).
    search_categories = request.search.categories if request.search else []
    if search_categories and component_query.category not in search_categories:
        component_query = ComponentQuery(
            category=search_categories[0] if len(search_categories) == 1 else None,
            vendor=component_query.vendor,
            search_terms=component_query.search_terms,
        )
    mentions = detect_model_mentions(request.message)
    budget = detect_budget(request.message, bool(mentions))
    usage = detect_usage(request.message)
    includes_peripherals = detect_peripherals(request.message)
    intent = classify_intent(
        request.message, state, mentions, budget, usage, component_query, request.search
    )
    # A price in a product search ("rtx hasta 1500") is a filter, not a PC budget.
    if intent == "product_search" and request.search is not None:
        budget = None

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
    if request.anchorProductId:
        state.anchorProductId = request.anchorProductId
    elif intent == "product_search" or state.awaiting != "build_adjust":
        state.anchorProductId = None
    return state, mentions, intent, component_query


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
    catalog: list[CatalogProduct], terms: list[str], message: str, vendor: str | None = None
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
        if not vendor_matches(product, vendor):
            continue
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


BUILD_ORDER = ["CPU", "MOTHERBOARD", "RAM", "GPU", "STORAGE", "PSU", "CASE"]
PERIPHERAL_ORDER = ["MONITOR", "KEYBOARD", "MOUSE"]
# Share of the tower budget per component, by use case.
BUILD_WEIGHTS = {
    "gaming": {"CPU": 0.20, "MOTHERBOARD": 0.13, "RAM": 0.09, "GPU": 0.33, "STORAGE": 0.08, "PSU": 0.08, "CASE": 0.09},
    "streaming": {"CPU": 0.22, "MOTHERBOARD": 0.13, "RAM": 0.10, "GPU": 0.30, "STORAGE": 0.08, "PSU": 0.08, "CASE": 0.09},
    "creative": {"CPU": 0.26, "MOTHERBOARD": 0.14, "RAM": 0.14, "GPU": 0.22, "STORAGE": 0.10, "PSU": 0.07, "CASE": 0.07},
    "office": {"CPU": 0.30, "MOTHERBOARD": 0.20, "RAM": 0.15, "GPU": 0.0, "STORAGE": 0.15, "PSU": 0.08, "CASE": 0.12},
}
PERIPHERAL_SHARE = 0.25
PERIPHERAL_WEIGHTS = {"MONITOR": 0.65, "KEYBOARD": 0.15, "MOUSE": 0.12}


def attribute(product: CatalogProduct | None, key: str):
    return None if product is None else product.attributes.get(key)


def is_compatible(product: CatalogProduct, selected: dict[str, CatalogProduct]) -> bool:
    """Missing spec data is treated as compatible so incomplete catalogs still produce builds."""
    cpu, board, ram = selected.get("CPU"), selected.get("MOTHERBOARD"), selected.get("RAM")
    if product.category == "CPU":
        return same_or_unknown(attribute(product, "socket"), attribute(board, "socket"))
    if product.category == "MOTHERBOARD":
        return same_or_unknown(attribute(cpu, "socket"), attribute(product, "socket")) and same_or_unknown(
            attribute(ram, "memoryType"), attribute(product, "memoryType")
        )
    if product.category == "RAM":
        return same_or_unknown(attribute(board, "memoryType"), attribute(product, "memoryType"))
    if product.category == "PSU":
        wattage = attribute(product, "wattage")
        return not wattage or float(wattage) >= required_psu_watts(selected)
    return True


def same_or_unknown(left, right) -> bool:
    return not left or not right or left == right


def required_psu_watts(selected: dict[str, CatalogProduct]) -> float:
    cpu_tdp = float(attribute(selected.get("CPU"), "tdp") or 65)
    gpu_power = float(attribute(selected.get("GPU"), "powerWatts") or 0)
    return (cpu_tdp + gpu_power + 100) * 1.25


def needs_dedicated_gpu(state: ConversationState, selected: dict[str, CatalogProduct]) -> bool:
    if state.usage != "office":
        return True
    return not attribute(selected.get("CPU"), "integratedGraphics")


def pick_component(
    candidates: list[CatalogProduct], target: float, selected: dict[str, CatalogProduct]
) -> CatalogProduct | None:
    """Most capable (priciest) compatible option within its share, else the cheapest compatible."""
    compatible = [product for product in candidates if is_compatible(product, selected)]
    if not compatible:
        return None
    within = [product for product in compatible if product.price <= target]
    return max(within, key=lambda product: product.price) if within else min(compatible, key=lambda product: product.price)


def cpus_with_available_board(
    cpus: list[CatalogProduct], boards: list[CatalogProduct]
) -> list[CatalogProduct]:
    """Prefer CPUs whose socket has a motherboard in stock, so the build can be completed."""
    if not boards:
        return cpus
    supported = [cpu for cpu in cpus if any(is_compatible(board, {"CPU": cpu}) for board in boards)]
    return supported or cpus


USAGE_LABELS = {
    "gaming": "gamer",
    "office": "de oficina",
    "creative": "de diseno y edicion",
    "streaming": "para streaming",
}


def recommend_pc_from_catalog(
    catalog: list[CatalogProduct],
    state: ConversationState,
    anchor: CatalogProduct | None = None,
) -> list[CatalogProduct]:
    """Compatible build for the budget and use. `anchor` is a part the customer already chose."""
    in_stock = [product for product in catalog if product.stock > 0]
    by_category: dict[str, list[CatalogProduct]] = {}
    for product in in_stock:
        by_category.setdefault(product.category.upper(), []).append(product)

    budget = float(state.budget or 0)
    tower_budget = budget * (1 - PERIPHERAL_SHARE) if budget and state.includesPeripherals else budget
    weights = BUILD_WEIGHTS.get(state.usage or "", BUILD_WEIGHTS["gaming"])
    anchor_category = anchor.category.upper() if anchor else None
    selected: dict[str, CatalogProduct] = {anchor_category: anchor} if anchor else {}

    for category in BUILD_ORDER:
        if category in selected:
            continue
        if category == "GPU" and not needs_dedicated_gpu(state, selected):
            continue
        share = weights.get(category, 0.08)
        target = tower_budget * share if tower_budget else float("inf")
        candidates = by_category.get(category, [])
        if category == "CPU":
            candidates = cpus_with_available_board(candidates, by_category.get("MOTHERBOARD", []))
        choice = pick_component(candidates, target, selected)
        if choice is not None:
            selected[category] = choice

    if state.includesPeripherals:
        peripheral_budget = budget * PERIPHERAL_SHARE if budget else float("inf")
        for category, share in PERIPHERAL_WEIGHTS.items():
            choice = pick_component(by_category.get(category, []), peripheral_budget * share, selected)
            if choice is not None:
                selected[category] = choice

    # Over budget: step down the most expensive parts while keeping the build compatible.
    if budget:
        for category in ["GPU", "CPU", "CASE", "STORAGE", "PSU", "MONITOR", "MOTHERBOARD", "RAM"]:
            if category == anchor_category:
                continue
            while sum(product.price for product in selected.values()) > budget and category in selected:
                current = selected[category]
                others = {key: value for key, value in selected.items() if key != category}
                cheaper = [
                    product
                    for product in by_category.get(category, [])
                    if product.price < current.price and is_compatible(product, others)
                ]
                if not cheaper:
                    break
                selected[category] = max(cheaper, key=lambda product: product.price)

    order = BUILD_ORDER + PERIPHERAL_ORDER
    return [selected[category] for category in order if category in selected]


CATEGORY_NAMES = {
    "CPU": "procesadores", "MOTHERBOARD": "placas madre", "RAM": "memorias RAM",
    "GPU": "tarjetas de video", "STORAGE": "unidades de almacenamiento", "PSU": "fuentes de poder",
    "CASE": "cases", "COOLER": "coolers", "MONITOR": "monitores", "KEYBOARD": "teclados",
    "MOUSE": "mouse", "MOUSEPAD": "mousepads", "HEADSET": "audifonos", "MICROPHONE": "microfonos",
    "SPEAKER": "parlantes", "WEBCAM": "webcams", "CAPTURE_CARD": "capturadoras",
    "CABLE_HUB": "cables y hubs", "LAPTOP": "laptops", "PC_DESKTOP": "PCs armadas",
    "CHAIR": "sillas gamer", "GAMING_DESK": "mesas gamer", "UPS": "UPS",
    "STABILIZER": "estabilizadores", "BACKPACK": "mochilas", "LAPTOP_COOLING_BASE": "bases refrigerantes",
    "SOFTWARE": "licencias de software",
}


def format_product_line(product: CatalogProduct | StoredProduct) -> str:
    stock = "en stock" if product.stock > 0 else "sin stock"
    return f"- {product.name}: S/. {product.price:.2f} ({stock})"


def handle_product_search(
    request: ChatRequest,
    state: ConversationState,
    mentions: list[str],
    intent: ChatIntent,
    vendor: str | None = None,
) -> ChatResponse:
    search = request.search
    ranked_by_backend = search is not None and any(
        product.relevance is not None for product in request.catalog
    )
    if ranked_by_backend:
        matches = [product for product in request.catalog if vendor_matches(product, vendor)][:4]
    else:
        matches = search_catalog(request.catalog, mentions, request.message, vendor)

    if search is not None and search.text:
        state.lastSearchQuery = search.text
    state.awaiting = None

    if not matches:
        categories = list(search.categories) if search else []
        if len(categories) > 1 and "PC_DESKTOP" in categories:
            categories.remove("PC_DESKTOP")  # "fuente para pc" asks for a PSU, not a prebuilt PC
        names = [CATEGORY_NAMES[category] for category in categories if category in CATEGORY_NAMES]
        reply = (
            f"Por ahora no tengo {' ni '.join(names[:2])} con esas caracteristicas en la tienda. "
            "Puedes consultarnos por WhatsApp o pedirme otro producto."
            if names
            else "No encontre ese producto en el catalogo actual. Prueba con la marca, el modelo o la categoria (por ejemplo: mouse Logitech, monitor 144hz, UPS 1000VA)."
        )
        return ChatResponse(
            reply=reply,
            intent=intent,
            conversationState=state,
            products=[],
        )

    stored_matches = [catalog_to_stored(product) for product in matches]
    state.lastRecommendedProducts = stored_matches
    state.lastRecommendedBuild = []
    state.lastFocusedProductId = matches[0].id if len(matches) == 1 else None

    lines = "\n".join(format_product_line(product) for product in matches[:3])
    max_price = search.maxPrice if search else None
    min_price = search.minPrice if search else None
    if max_price is not None and all(product.price > max_price for product in matches):
        intro = f"No tengo opciones por debajo de S/. {max_price:.0f}. Lo mas cercano que tengo es:"
    elif min_price is not None and all(product.price < min_price for product in matches):
        intro = f"No tengo opciones desde S/. {min_price:.0f}. Lo mas cercano que tengo es:"
    else:
        price_note = ""
        if max_price is not None:
            price_note = f" hasta S/. {max_price:.0f}"
        elif min_price is not None:
            price_note = f" desde S/. {min_price:.0f}"
        count = len(matches)
        sort_note = ""
        if search is not None and search.sort == "cheapest":
            sort_note = ", de menor a mayor precio"
        elif search is not None and search.sort == "premium":
            sort_note = ", empezando por las de gama mas alta"
        intro = (
            f"Encontre esta opcion{price_note}:"
            if count == 1
            else f"Encontre {count} opciones{price_note}{sort_note}:"
        )
    tail = "\nPuedes pedirme algo mas barato, otra marca, o decirme 'agregalo al carrito'."
    return ChatResponse(
        reply=f"{intro}\n{lines}{tail}",
        intent="product_search",
        conversationState=state,
        products=[product_to_chat(product) for product in matches],
    )


def find_catalog_product(catalog: list[CatalogProduct], product_id: str | None) -> CatalogProduct | None:
    return next((product for product in catalog if product.id == product_id), None)


def build_response(
    products: list[CatalogProduct],
    state: ConversationState,
    intent: ChatIntent,
    intro: str,
    budget_line: str,
    closing: str = "",
) -> ChatResponse:
    stored_products = [catalog_to_stored(product) for product in products]
    state.lastRecommendedBuild = stored_products
    state.lastRecommendedProducts = stored_products
    state.lastFocusedProductId = None
    chosen = {product.category.upper() for product in products}
    missing = [category for category in ["CPU", "MOTHERBOARD", "RAM", "STORAGE", "PSU", "CASE"] if category not in chosen]
    missing_names = [CATEGORY_NAMES.get(category, category.lower()) for category in missing]
    missing_line = (
        f"\nPor ahora no tengo stock de {', '.join(missing_names)}; consultanos por WhatsApp para completarla."
        if missing
        else ""
    )
    lines = "\n".join(format_product_line(product) for product in products)
    return ChatResponse(
        reply=f"{intro}\n{lines}\n{budget_line}{missing_line}{closing}\nSi te parece, dime 'agrega todo' y la paso al carrito.",
        intent=intent,
        conversationState=state,
        products=[product_to_chat(product) for product in products],
    )


def budget_summary(total: float, budget: int | None) -> str:
    if budget is None:
        return f"Total: S/. {total:.2f}."
    if total <= budget:
        return f"Total: S/. {total:.2f} (dentro de tu presupuesto de S/. {budget})."
    return f"Total: S/. {total:.2f}. Supera tu presupuesto de S/. {budget}; es lo mas ajustado con el stock actual."


def handle_anchored_build(
    request: ChatRequest, state: ConversationState, intent: ChatIntent, anchor: CatalogProduct
) -> ChatResponse:
    """Builds immediately around the chosen part; budget, use and peripherals get sensible defaults."""
    usage = state.usage or "gaming"
    category = anchor.category.upper()
    # Office builds give the GPU no share; size around it as a gaming build would.
    weight = BUILD_WEIGHTS.get(usage, {}).get(category) or BUILD_WEIGHTS["gaming"].get(category, 0.1)
    # Without a budget, size the rest of the build to match the tier of the chosen part.
    tower_budget = anchor.price / weight
    implied_budget = tower_budget / (1 - PERIPHERAL_SHARE) if state.includesPeripherals else tower_budget
    target_budget = state.budget or round(implied_budget)
    build_state = state.model_copy(
        update={"usage": usage, "budget": target_budget, "includesPeripherals": bool(state.includesPeripherals)}
    )
    products = recommend_pc_from_catalog(request.catalog, build_state, anchor)
    state.awaiting = "build_adjust"

    scope = "con perifericos" if state.includesPeripherals else "solo torre"
    adjustments = []
    if state.budget is None:
        adjustments.append("si tienes un presupuesto")
    if state.includesPeripherals is None:
        adjustments.append("si quieres monitor, teclado y mouse")
    if state.usage is None:
        adjustments.append("si es para otro uso (oficina, edicion o streaming)")
    options = ", ".join(adjustments[:-1]) + (", o " if len(adjustments) > 1 else "") + (adjustments[-1] if adjustments else "")
    closing = f"\nDime {options} y la ajusto." if adjustments else ""
    intro = (
        f"Arme una PC {USAGE_LABELS.get(usage, usage)} ({scope}) alrededor de {anchor.name}, "
        "con piezas compatibles del catalogo:"
    )
    total = sum(product.price for product in products)
    return build_response(products, state, intent, intro, budget_summary(total, state.budget), closing)


def handle_pc_build(
    request: ChatRequest, state: ConversationState, intent: ChatIntent
) -> ChatResponse:
    anchor = find_catalog_product(request.catalog, state.anchorProductId)
    if anchor is not None:
        return handle_anchored_build(request, state, intent, anchor)

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
            state.awaiting = None
            scope = "solo torre" if state.includesPeripherals is False else "con perifericos"
            intro = f"Esta es una PC {USAGE_LABELS.get(state.usage or '', state.usage)} ({scope}) con piezas compatibles del catalogo:"
            total = sum(product.price for product in products)
            return build_response(products, state, intent, intro, budget_summary(total, state.budget))
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


def brand_question(
    payload: ChatRequest, state: ConversationState, component_query: ComponentQuery, mentions: list[str]
) -> str | None:
    """For a bare "procesador" / "tarjeta de video" query, ask the brand when more than one is on offer."""
    question = BRAND_QUESTIONS.get(component_query.category or "")
    if question is None or component_query.vendor or mentions:
        return None
    search = payload.search
    if search is not None and (search.maxPrice or search.minPrice or search.sort):
        return None
    awaiting, label, options = question
    products = [product for product in payload.catalog if product.category == component_query.category]
    available = [text for vendor, text in options.items() if any(vendor_matches(product, vendor) for product in products)]
    if len(available) < 2:
        return None
    state.awaiting = awaiting
    choices = f"{', '.join(available[:-1])} o {available[-1]}"
    return f"Buscas {label}. Prefieres {choices}?"


def build_chat_response(payload: ChatRequest) -> ChatResponse:
    state, mentions, intent, component_query = merge_state(payload)

    if intent == "checkout_guidance":
        return handle_checkout_guidance(state)

    if intent == "total_query":
        return handle_total_query(state)

    if intent == "cart_action":
        return handle_cart_action(payload, state)

    if payload.anchorProductId:
        state.intent = "pc_build"
        return handle_pc_build(payload, state, "pc_build")

    if intent == "product_search":
        question = brand_question(payload, state, component_query, mentions)
        if question:
            return ChatResponse(reply=question, intent=intent, conversationState=state, products=[])
        return handle_product_search(
            payload,
            state,
            list(dict.fromkeys([*mentions, *component_query.search_terms])),
            intent,
            component_query.vendor,
        )

    if component_query.vendor and component_query.category is None:
        state.awaiting = "component_category"
        return ChatResponse(
            reply=f"Buscas productos {component_query.vendor}. Indica si necesitas procesador, tarjeta grafica u otro componente para afinar la busqueda.",
            intent="unknown",
            conversationState=state,
            products=[],
        )

    if intent in ["pc_build", "budget_pc_build"]:
        return handle_pc_build(payload, state, intent)

    if intent == "support":
        return ChatResponse(
            reply="Hola, soy Puchi. Puedo ayudarte a encontrar productos del catalogo o armar una PC segun tu presupuesto.",
            intent="support",
            conversationState=state,
            products=[],
        )

    return ChatResponse(
        reply="Soy Puchi. Puedo ayudarte a buscar un producto especifico o a armar una PC por presupuesto. Por ejemplo: busco una RTX 5060, o tengo 3000 soles para una PC gamer.",
        intent="unknown",
        conversationState=state,
        products=[],
    )
