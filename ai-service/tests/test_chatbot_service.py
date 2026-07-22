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
