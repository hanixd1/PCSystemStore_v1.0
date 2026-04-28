import json
import sys
from pathlib import Path
from typing import Any, Dict, List

try:
    import joblib
except ImportError:
    print(
        json.dumps(
            {
                "error": "Falta la dependencia Python 'joblib'",
                "detalle": "Instala joblib con 'python -m pip install joblib' o 'py -m pip install joblib'.",
            }
        )
    )
    sys.exit(0)


MODEL_PATH = Path(__file__).resolve().parent / "model" / "stock_predictor.joblib"
DEFAULT_MODEL: Dict[str, Any] = {
    "base_daily_sales": 0.9,
    "reference_price": 900.0,
    "critical_stock": 3,
    "fast_turnover_days": 7,
    "moderate_turnover_days": 15,
    "min_price_factor": 0.35,
    "max_price_factor": 1.9,
    "default_category_velocity": 0.85,
    "category_velocity": {
        "CPU": 1.15,
        "GPU": 1.05,
        "RAM": 1.3,
        "STORAGE": 1.25,
        "MOTHERBOARD": 0.95,
        "PSU": 0.8,
        "CASE": 0.7,
        "COOLER": 0.75,
        "PERIPHERAL": 1.1,
        "MONITOR": 0.78,
    },
}


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(value, maximum))


def ensure_model() -> Dict[str, Any]:
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)

    if MODEL_PATH.exists():
        loaded = joblib.load(MODEL_PATH)
        if isinstance(loaded, dict):
            merged = DEFAULT_MODEL.copy()
            merged.update(loaded)
            merged["category_velocity"] = {
                **DEFAULT_MODEL["category_velocity"],
                **loaded.get("category_velocity", {}),
            }
            return merged

    joblib.dump(DEFAULT_MODEL, MODEL_PATH)
    return DEFAULT_MODEL.copy()


def read_products_from_stdin() -> List[Dict[str, Any]]:
    raw_input = sys.stdin.read().strip()
    if not raw_input:
        raise ValueError("No se recibieron datos por stdin.")

    parsed = json.loads(raw_input)
    if not isinstance(parsed, list):
        raise ValueError("La entrada debe ser un arreglo JSON de productos.")

    return parsed


def estimate_daily_sales(
    price: float, stock: int, category: str, model_config: Dict[str, Any]
) -> float:
    base_daily_sales = float(model_config["base_daily_sales"])
    reference_price = float(model_config["reference_price"])
    min_price_factor = float(model_config["min_price_factor"])
    max_price_factor = float(model_config["max_price_factor"])
    default_category_velocity = float(model_config["default_category_velocity"])
    category_velocity_map = model_config["category_velocity"]

    price_factor = clamp(
        reference_price / max(price, 1.0), min_price_factor, max_price_factor
    )
    category_velocity = float(
        category_velocity_map.get(str(category).upper(), default_category_velocity)
    )
    stock_pressure = 1.15 if stock <= int(model_config["critical_stock"]) else 1.0

    return max(0.1, base_daily_sales * price_factor * category_velocity * stock_pressure)


def classify_product(
    stock: int, days_remaining: float, model_config: Dict[str, Any]
) -> Dict[str, str]:
    critical_stock = int(model_config["critical_stock"])
    fast_turnover_days = float(model_config["fast_turnover_days"])
    moderate_turnover_days = float(model_config["moderate_turnover_days"])

    if stock <= 0:
        return {
            "estado": "AGOTADO",
            "mensaje_cliente": "Agotado temporalmente. Preguntame por alternativas similares.",
            "alerta_admin": "Reposicion urgente requerida.",
        }

    if stock <= critical_stock or days_remaining < fast_turnover_days:
        return {
            "estado": "CRITICO",
            "mensaje_cliente": f"Alta demanda. Solo quedan {stock} unidades disponibles.",
            "alerta_admin": f"Riesgo de quiebre de stock. Cobertura estimada: {int(days_remaining)} dias.",
        }

    if days_remaining < moderate_turnover_days:
        return {
            "estado": "MODERADO",
            "mensaje_cliente": "Stock disponible, pero se esta moviendo rapido.",
            "alerta_admin": f"Demanda media. Revisar reposicion pronto. Cobertura: {int(days_remaining)} dias.",
        }

    return {
        "estado": "SALUDABLE",
        "mensaje_cliente": "Tenemos stock disponible para entrega inmediata.",
        "alerta_admin": "Stock saludable.",
    }


def predict_inventory_status(products: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    model_config = ensure_model()
    results: List[Dict[str, Any]] = []

    for item in products:
        price = float(item.get("price", 0) or 0)
        stock = int(item.get("stock", 0) or 0)
        category = str(item.get("category", "GENERAL") or "GENERAL")
        daily_sales = estimate_daily_sales(price, stock, category, model_config)
        days_remaining = 0.0 if stock <= 0 else round(stock / daily_sales, 2)
        labels = classify_product(stock, days_remaining, model_config)

        results.append(
            {
                "id": item.get("id"),
                "nombre": item.get("name", "Producto desconocido"),
                "stock": stock,
                "estado": labels["estado"],
                "mensaje_cliente": labels["mensaje_cliente"],
                "alerta_admin": labels["alerta_admin"],
                "dias_restantes_estimados": days_remaining,
            }
        )

    return results


def main() -> None:
    try:
        products = read_products_from_stdin()
        predictions = predict_inventory_status(products)
        print(json.dumps({"success": True, "data": predictions}))
    except Exception as error:
        print(
            json.dumps(
                {"error": "Error interno en el motor de prediccion", "detalle": str(error)}
            )
        )


if __name__ == "__main__":
    main()
