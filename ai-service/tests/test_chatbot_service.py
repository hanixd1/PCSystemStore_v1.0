import pytest

from schemas.chatbot_schema import CatalogProduct, ChatRequest, ConversationState
from services.chatbot_service import (
    build_chat_response,
    detect_component_query,
    search_catalog,
)


CATALOG = [
    CatalogProduct(id="amd-ryzen", name="AMD Ryzen 7 8700G", category="CPU", price=1200, stock=4, productUrl="/amd-ryzen"),
    CatalogProduct(id="threadripper", name="AMD Ryzen Threadripper 7960X", category="CPU", price=5500, stock=2, productUrl="/threadripper"),
    CatalogProduct(id="intel-i5", name="Intel Core i5-12400F", category="CPU", price=700, stock=5, productUrl="/intel-i5"),
    CatalogProduct(id="rtx-4060", name="NVIDIA RTX 4060", category="GPU", price=1600, stock=3, productUrl="/rtx-4060"),
    CatalogProduct(id="ram-ddr5", name="Memoria RAM DDR5 32GB", category="RAM", price=450, stock=6, productUrl="/ram-ddr5"),
    CatalogProduct(id="psu-750", name="Fuente 750W 80 Plus", category="PSU", price=390, stock=4, productUrl="/psu-750"),
]


@pytest.mark.parametrize(
    ("message", "category", "vendor"),
    [
        ("PROCE AMD", "CPU", "AMD"),
        ("gráfica rtx", "GPU", None),
        ("ram ddr5", "RAM", None),
        ("fuente 750w", "PSU", None),
        ("cpu ryzen", "CPU", "AMD"),
        ("threadripper", "CPU", "AMD"),
        ("procesador intel", "CPU", "INTEL"),
        ("core i5", "CPU", "INTEL"),
        ("core ultra", "CPU", "INTEL"),
    ],
)
def test_detects_commercial_component_queries(message, category, vendor):
    query = detect_component_query(message)

    assert query.category == category
    assert query.vendor == vendor


def test_preserves_technical_cpu_models():
    assert "ryzen 7" in detect_component_query("Ryzen 7").search_terms
    assert "i5-12400f" in detect_component_query("i5-12400F").search_terms


@pytest.mark.parametrize(
    ("terms", "expected_ids"),
    [
        (["amd", "ryzen", "threadripper"], {"amd-ryzen", "threadripper"}),
        (["intel", "core i", "core ultra"], {"intel-i5"}),
    ],
)
def test_vendor_search_terms_rank_expected_cpu_families(terms, expected_ids):
    vendor = "AMD" if "amd" in terms else "INTEL"
    results = search_catalog(CATALOG, terms, " ".join(terms), vendor)
    assert expected_ids.issubset({product.id for product in results})


def test_cpu_brand_context_resolves_amd_on_next_turn():
    first = build_chat_response(ChatRequest(message="estoy buscando procesador", catalog=CATALOG))
    assert first.conversationState.awaiting == "cpu_brand"
    second = build_chat_response(ChatRequest(message="amd", catalog=CATALOG, conversationState=first.conversationState))

    assert second.intent == "product_search"
    assert {product.id for product in second.products} & {"amd-ryzen", "threadripper"}


def test_cpu_brand_context_resolves_intel_on_next_turn():
    first = build_chat_response(ChatRequest(message="estoy buscando procesador", catalog=CATALOG))
    second = build_chat_response(ChatRequest(message="intel", catalog=CATALOG, conversationState=first.conversationState))

    assert second.intent == "product_search"
    assert {product.id for product in second.products} == {"intel-i5"}


def test_vendor_without_context_asks_for_component_category():
    response = build_chat_response(ChatRequest(message="amd", catalog=CATALOG, conversationState=ConversationState()))

    assert response.intent == "unknown"
    assert response.conversationState.awaiting == "component_category"
    assert "Indica" in response.reply


from schemas.chatbot_schema import SearchContext  # noqa: E402
from services.chatbot_service import recommend_pc_from_catalog  # noqa: E402


def ranked(product_id, name, category, price, relevance=500, stock=3, **attributes):
    return CatalogProduct(
        id=product_id, name=name, category=category, price=price, stock=stock,
        productUrl=f"/{product_id}", relevance=relevance, attributes=attributes,
    )


def test_backend_search_hits_answer_any_category():
    catalog = [ranked("g203", "MOUSE LOGITECH G203", "MOUSE", 89), ranked("cobra", "MOUSE REDRAGON COBRA", "MOUSE", 59)]
    response = build_chat_response(
        ChatRequest(
            message="tienen mouse logitech?",
            catalog=catalog,
            search=SearchContext(text="mouse logitech", categories=["MOUSE"], matched=True),
        )
    )

    assert response.intent == "product_search"
    assert [product.id for product in response.products] == ["g203", "cobra"]
    assert "MOUSE LOGITECH G203" in response.reply
    assert response.conversationState.lastSearchQuery == "mouse logitech"


def test_price_limit_is_a_filter_not_a_pc_budget():
    catalog = [ranked("rtx", "RTX 4060", "GPU", 1400)]
    response = build_chat_response(
        ChatRequest(
            message="tarjeta de video hasta 1500 soles",
            catalog=catalog,
            search=SearchContext(text="tarjeta video", maxPrice=1500, categories=["GPU"], matched=True),
        )
    )

    assert response.intent == "product_search"
    assert "hasta S/. 1500" in response.reply
    assert response.conversationState.budget is None


def test_reports_when_nothing_fits_the_price_limit():
    catalog = [ranked("rtx", "RTX 4070", "GPU", 2600)]
    response = build_chat_response(
        ChatRequest(
            message="rtx hasta 1000",
            catalog=catalog,
            search=SearchContext(text="rtx", maxPrice=1000, categories=["GPU"], matched=True),
        )
    )

    assert "No tengo opciones por debajo de S/. 1000" in response.reply


BUILD_CATALOG = [
    ranked("r5", "Ryzen 5 7600", "CPU", 900, socket="AM5", tdp=65),
    ranked("i5", "Intel Core i5-12400F", "CPU", 650, socket="LGA 1700", tdp=65),
    ranked("b650", "Placa B650", "MOTHERBOARD", 700, socket="AM5", memoryType="DDR5"),
    ranked("b760", "Placa B760", "MOTHERBOARD", 600, socket="LGA 1700", memoryType="DDR4"),
    ranked("ddr5", "RAM DDR5 16GB", "RAM", 250, memoryType="DDR5"),
    ranked("ddr4", "RAM DDR4 16GB", "RAM", 180, memoryType="DDR4"),
    ranked("rtx", "RTX 4060", "GPU", 1300, powerWatts=115),
    ranked("ssd", "SSD 1TB", "STORAGE", 250),
    ranked("psu450", "Fuente 450W", "PSU", 150, wattage=450),
    ranked("psu650", "Fuente 650W", "PSU", 250, wattage=650),
    ranked("case", "Case ATX", "CASE", 200),
]


def test_build_uses_compatible_parts():
    state = ConversationState(budget=4000, usage="gaming", includesPeripherals=False)
    build = {product.category: product for product in recommend_pc_from_catalog(BUILD_CATALOG, state)}

    cpu_socket = build["CPU"].attributes["socket"]
    assert build["MOTHERBOARD"].attributes["socket"] == cpu_socket
    assert build["RAM"].attributes["memoryType"] == build["MOTHERBOARD"].attributes["memoryType"]
    # Ryzen (65W) + RTX 4060 (115W) needs more than 450W.
    assert build["PSU"].id == "psu650"


def test_build_stays_within_budget_when_possible():
    state = ConversationState(budget=3400, usage="gaming", includesPeripherals=False)
    build = recommend_pc_from_catalog(BUILD_CATALOG, state)

    assert sum(product.price for product in build) <= 3400
    assert {product.category for product in build} >= {"CPU", "MOTHERBOARD", "RAM", "GPU", "PSU", "CASE"}


def test_build_reply_warns_when_stock_cannot_fit_the_budget():
    state = ConversationState(intent="budget_pc_build", budget=2000, usage="gaming", includesPeripherals=False)
    response = build_chat_response(ChatRequest(message="gaming", catalog=BUILD_CATALOG, conversationState=state))

    assert "Supera tu presupuesto de S/. 2000" in response.reply
    assert response.products


def test_office_build_skips_gpu_when_cpu_has_integrated_graphics():
    catalog = [*BUILD_CATALOG, ranked("8600g", "Ryzen 5 8600G", "CPU", 800, socket="AM5", tdp=65, integratedGraphics=1)]
    state = ConversationState(budget=2500, usage="office", includesPeripherals=False)
    build = {product.category: product for product in recommend_pc_from_catalog(catalog, state)}

    if build["CPU"].attributes.get("integratedGraphics"):
        assert "GPU" not in build


def test_build_picks_a_cpu_that_has_a_compatible_board_in_stock():
    catalog = [
        ranked("i5-10400f", "Intel Core i5-10400F", "CPU", 490, socket="LGA 1200", tdp=65),
        ranked("r5-8500g", "Ryzen 5 8500G", "CPU", 600, socket="AM5", tdp=65, integratedGraphics=1),
        ranked("b650", "Placa B650", "MOTHERBOARD", 450, socket="AM5", memoryType="DDR5"),
    ]
    state = ConversationState(budget=2500, usage="office", includesPeripherals=False)
    build = {product.category: product for product in recommend_pc_from_catalog(catalog, state)}

    assert build["CPU"].id == "r5-8500g"
    assert build["MOTHERBOARD"].id == "b650"
