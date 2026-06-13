import unittest

from schemas.stock_prediction_schema import (
    StockRiskBatchInput,
    StockRiskInput,
)
from services.stock_prediction_service import (
    INSUFFICIENT_DATA_REASON,
    calculate_batch_stock_risk,
    calculate_stock_risk,
)


class StockPredictionServiceTest(unittest.TestCase):
    def test_out_of_stock_is_critical(self):
        result = calculate_stock_risk(
            StockRiskInput(name="AMD Ryzen 5 7600", stockActual=0)
        )

        self.assertEqual(result.riskLevel, "CRITICAL")
        self.assertEqual(result.status, "CRITICAL")
        self.assertGreaterEqual(result.riskScore, 90)

    def test_low_stock_without_sales_is_watch_not_high(self):
        result = calculate_stock_risk(
            StockRiskInput(name="Memoria DDR5 16GB", stockActual=2, umbralStockBajo=3)
        )

        self.assertEqual(result.status, "WATCH")
        self.assertIn(result.riskLevel, {"LOW", "MEDIUM"})
        self.assertLess(result.riskScore, 70)

    def test_low_stock_with_recent_sales_is_high_risk(self):
        result = calculate_stock_risk(
            StockRiskInput(
                name="AMD Ryzen 5 9600X",
                stockActual=3,
                ventasUltimos7Dias=4,
                ventasUltimos30Dias=10,
                diasReposicionEstimados=7,
                umbralStockBajo=3,
            )
        )

        self.assertEqual(result.riskLevel, "HIGH")
        self.assertEqual(result.status, "RISK")

    def test_normal_stock_with_high_velocity_can_be_risk(self):
        result = calculate_stock_risk(
            StockRiskInput(
                name="RTX 4060",
                stockActual=8,
                ventasUltimos7Dias=10,
                ventasUltimos30Dias=24,
                diasReposicionEstimados=10,
                umbralStockBajo=3,
            )
        )

        self.assertIn(result.riskLevel, {"MEDIUM", "HIGH", "CRITICAL"})
        self.assertGreaterEqual(result.riskScore, 50)

    def test_insufficient_data_reason_is_present(self):
        result = calculate_stock_risk(
            StockRiskInput(name="Fuente 650W", stockActual=12)
        )

        self.assertIn(INSUFFICIENT_DATA_REASON, result.reasons)
        self.assertEqual(result.mode, "HEURISTIC_V1")

    def test_batch_summary_counts_high_and_critical_only(self):
        response = calculate_batch_stock_risk(
            StockRiskBatchInput(
                products=[
                    StockRiskInput(productId="p1", name="Agotado", stockActual=0),
                    StockRiskInput(productId="p2", name="Bajo sin ventas", stockActual=2),
                    StockRiskInput(
                        productId="p3",
                        name="Alta rotacion",
                        stockActual=3,
                        ventasUltimos7Dias=4,
                        ventasUltimos30Dias=10,
                    ),
                ]
            )
        )

        self.assertEqual(response.summary.totalProducts, 3)
        self.assertEqual(response.summary.riskProducts, 2)
        self.assertEqual(response.summary.criticalProducts, 1)
        self.assertEqual(response.mode, "HEURISTIC_V1")


if __name__ == "__main__":
    unittest.main()
