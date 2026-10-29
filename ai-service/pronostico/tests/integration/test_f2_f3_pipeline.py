"""End-to-end F1 → F2 → F3 on a synthetic year of daily sheets."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import openpyxl
import pandas as pd
import pytest
import yaml
from typer.testing import CliRunner

from pcsforecast.cli import app
from pcsforecast.paths import project_paths
from pcsforecast.reference.crosscheck import load_cases, own_forecasts
from pcsforecast.reporting.dashboard_data import (
    leaderboard,
    load_dashboard_data,
    service_inventory,
)

pytestmark = pytest.mark.integration

runner = CliRunner()


def _invoke(*args: str) -> str:
    result = runner.invoke(app, list(args))
    assert result.exit_code == 0, result.output
    return result.output


def test_series_and_validation_run(project: Path) -> None:
    root = str(project)
    for step in ("register-raw", "stage", "audit", "build-series"):
        _invoke(step, "--root", root)

    series_dir = project / "data" / "03_series"
    details = json.loads((series_dir / "manifest.json").read_text(encoding="utf-8"))["details"]
    assert details["windows"]["test_start"] == "2024-10-01"
    assert details["windows"]["test_end"] == "2024-11-30"
    assert details["skus"] == 3

    development = pd.read_parquet(series_dir / "panel_development.parquet")
    sealed = pd.read_parquet(series_dir / "sealed" / "panel_sealed.parquet")
    assert development["period_end"].max() < pd.Timestamp("2024-10-01")
    assert sealed["period_start"].min() >= pd.Timestamp("2024-09-30")
    totals = development[development["level"] == "total"]
    categories = development[development["level"] == "category"]
    assert totals["units"].sum() == categories["units"].sum() > 0

    profile = pd.read_parquet(series_dir / "profile.parquet")
    assert set(profile["level"]) == {"total", "category", "sku"}
    assert profile.loc[profile["level"] != "sku", "selected"].all()

    for frequency in ("weekly", "monthly"):
        output = _invoke("run-validation", "--frequency", frequency, "--root", root)
        run_dir = Path(output.split("OK  ")[1].strip())
        record = json.loads((run_dir / "run.json").read_text(encoding="utf-8"))
        assert record["test_span_used"] is False
        assert record["failures"] == []
        assert record["models"] == [
            "naive",
            "ses",
            "croston",
            "sba",
            "tsb",
            "two_stage_trees",
            "global_gbm",
        ]
        predictions = pd.read_parquet(run_dir / "predictions.parquet")
        assert predictions["target_period"].max() < pd.Timestamp("2024-10-01")
        metrics = pd.read_parquet(run_dir / "metrics.parquet")
        assert set(metrics["model"]) == set(record["models"])
        assert metrics["level"].notna().all()

    output = _invoke("simulate", "--frequency", "weekly", "--root", root)
    inventory_dir = Path(output.split("OK  ")[1].strip())
    simulation = pd.read_parquet(inventory_dir / "simulation.parquet")
    record = json.loads((inventory_dir / "run.json").read_text(encoding="utf-8"))
    assert record["test_span_used"] is False
    assert len(record["scenarios"]) == 4
    assert set(simulation["model"]) == set(record["models"])
    balance = simulation["served"] + simulation["lost_units"] - simulation["demand"]
    assert balance.abs().max() < 1e-9

    data = load_dashboard_data(project_paths(project))
    assert set(data.runs) == {"weekly", "monthly"}
    assert data.panel["split"].eq("development").all()
    assert data.windows["test_start"] == "2024-10-01"
    table = leaderboard(data.runs["weekly"].metrics, 1)
    assert set(data.inventory) == {"weekly"}
    service = service_inventory(data.inventory["weekly"].simulation, 1, 0.95)
    assert service["fill_rate"].between(0, 1).all()
    assert {"two_stage_trees", "global_gbm"} <= set(table["model"])


def test_series_refuses_changed_clean_data(project: Path) -> None:
    root = str(project)
    for step in ("register-raw", "stage", "audit"):
        _invoke(step, "--root", root)
    clean = project / "data" / "02_clean" / "vecinos_lines.parquet"
    clean.write_bytes(clean.read_bytes() + b"x")
    result = runner.invoke(app, ["build-series", "--root", root])
    assert result.exit_code == 1
    assert "differ from the audit manifest" in result.output


def test_validation_refuses_changed_series(project: Path) -> None:
    root = str(project)
    for step in ("register-raw", "stage", "audit", "build-series"):
        _invoke(step, "--root", root)
    panel = project / "data" / "03_series" / "panel_development.parquet"
    panel.write_bytes(panel.read_bytes() + b"x")
    result = runner.invoke(app, ["run-validation", "--root", root])
    assert result.exit_code == 1
    assert "differ from the series manifest" in result.output


def test_simulation_refuses_unsupported_review_period(project: Path) -> None:
    root = str(project)
    for step in ("register-raw", "stage", "audit", "build-series"):
        _invoke(step, "--root", root)
    inventory_path = project / "configs" / "inventory.yaml"
    inventory = yaml.safe_load(inventory_path.read_text(encoding="utf-8"))
    inventory["review_period"] = 2
    inventory_path.write_text(yaml.safe_dump(inventory), encoding="utf-8")
    result = runner.invoke(app, ["simulate", "--root", root])
    assert result.exit_code == 1
    assert "review period of 1" in result.output


def _write_price_list(path: Path) -> None:
    workbook = openpyxl.Workbook()
    sheet = workbook.active
    sheet.title = "SSD-RAM"
    heading: list[object] = [None, "PART NUMBER", "DESCRIPCIÓN ", "PRECIO"]
    for row in [
        [],
        ["DISCOS SOLIDOS"],
        heading,
        [1, "SNV2S/1000G ", "DISCO SOLIDO KINGSTON 1TB NV2 NVME", 100],
        ["MEMORIAS RAM PC"],
        heading,
        [1, "(PSD48G)", "MEMORIA RAM PATRIOT 8GB DDR4", 150],
    ]:
        sheet.append(row)
    mice = workbook.create_sheet("LOGITECH")
    for row in [
        ["MOUSE LOGITECH"],
        heading,
        [1, "910-005790", "MOUSE LOGITECH G203 LIGHTSYNC BLACK", 0, None, 99],
    ]:
        mice.append(row)
    workbook.save(path)


def test_price_list_links_value_lost_sales(project: Path) -> None:
    _write_price_list(project / "datos" / "LISTA DISTRIBUCION TEST.xlsx")
    root = str(project)
    for step in ("register-raw", "stage", "audit", "build-series", "ingest-prices", "link-prices"):
        _invoke(step, "--root", root)

    prices = pd.read_parquet(project / "data" / "02_clean" / "prices" / "price_list.parquet")
    assert prices["family"].tolist() == ["DISCOS SOLIDOS", "MEMORIAS RAM PC", "MOUSE LOGITECH"]
    assert prices["part_number"].tolist() == ["SNV2S/1000G", "PSD48G", "910-005790"]
    assert prices["has_price"].tolist() == [True, True, False]
    assert prices["extra_cells"].tolist()[2] == "F=99"

    links_dir = project / "data" / "03_series" / "price_links"
    sku_prices = pd.read_parquet(links_dir / "sku_prices.parquet")
    assert sorted(sku_prices["list_price"]) == [100.0, 150.0]
    report = json.loads((links_dir / "report.json").read_text(encoding="utf-8"))
    assert report["price_level"]["median_list_to_observed"] == 1.25
    assert report["catalog"]["unit_share_by_method"] == {"tokens": 1.0}

    _invoke("simulate", "--frequency", "weekly", "--root", root)
    paths = project_paths(project)
    simulation = load_dashboard_data(paths).inventory["weekly"].simulation
    at_sku = simulation[simulation["level"] == "sku"]
    assert set(at_sku["list_price"].dropna()) <= {100.0, 150.0}
    assert at_sku["list_price"].notna().any()
    assert simulation.loc[simulation["level"] == "total", "list_price"].isna().all()
    assert (simulation["lost_value_list_fill"] >= simulation["lost_value"]).all()


def test_link_prices_needs_an_ingested_price_list(project: Path) -> None:
    root = str(project)
    for step in ("register-raw", "stage", "audit", "build-series"):
        _invoke(step, "--root", root)
    result = runner.invoke(app, ["link-prices", "--root", root])
    assert result.exit_code == 1
    assert "ingested price list not found" in result.output
    result = runner.invoke(app, ["ingest-prices", "--root", root])
    assert result.exit_code == 1
    assert "no registered price list" in result.output


def test_retail_items_get_skus_and_links(project: Path) -> None:
    from conftest import factura_pages, write_pdf  # noqa: PLC0415 (test helper)

    _write_price_list(project / "datos" / "LISTA DISTRIBUCION TEST.xlsx")
    write_pdf(
        project / "datos" / "Boletas y Facturas" / "2024" / "Mayo" / "Factura" / "f.pdf",
        factura_pages(15, "04/05/2024"),
    )
    root = str(project)
    for step in (
        "register-raw",
        "stage",
        "audit",
        "stage-receipts",
        "audit-receipts",
        "build-series",
        "ingest-prices",
        "link-prices",
    ):
        _invoke(step, "--root", root)

    series_dir = project / "data" / "03_series"
    profile = pd.read_parquet(series_dir / "profile.parquet")
    assert set(profile["channel"]) == {"total", "vecinos", "facturado", "total_dedup"}
    totals = profile[(profile["level"] == "total") & (profile["frequency"] == "monthly")]
    units = totals.set_index("channel")["units"]
    assert units["total"] == units["vecinos"] + units["facturado"]
    assert units["total_dedup"] <= units["total"]
    details = json.loads((series_dir / "manifest.json").read_text(encoding="utf-8"))["details"]
    assert details["channels"] == ["total", "vecinos", "facturado", "total_dedup"]
    assert details["structural_break"] == "2025-05-01"
    # The factura is dated 2024-05-04, inside the development span of the synthetic year.
    assert details["demand_units"]["receipts"] == 3.0

    links_dir = project / "data" / "03_series" / "price_links"
    retail = pd.read_parquet(links_dir / "retail_catalog.parquet").set_index("product_text")
    ssd = retail.loc["SSD KINGSTON 1TB NV2"]
    assert (ssd["method"], ssd["category"], ssd["units"]) == ("tokens", "storage", 2.0)
    # "SSD" and "DISCO SOLIDO" stay different SKUs until the owner confirms the proposed merge.
    proposals = pd.read_parquet(links_dir / "merge_proposals.parquet")
    group = proposals[proposals["item_description"].str.contains("KINGSTON 1TB NV2")]
    assert group["sku_id"].nunique() == 2  # one SKU written by each channel
    assert "SSD KINGSTON 1TB NV2" in (links_dir / "review_merges.md").read_text(encoding="utf-8")
    report = json.loads((links_dir / "report.json").read_text(encoding="utf-8"))
    assert report["retail_catalog"]["skus"] == 2

    prices = project / "data" / "02_clean" / "prices" / "price_list.parquet"
    pd.read_parquet(prices).head(1).to_parquet(prices, index=False)
    result = runner.invoke(app, ["link-prices", "--root", root])
    assert result.exit_code == 1
    assert "differ from their manifest" in result.output


def test_statistics_on_full_and_truncated_runs(project: Path) -> None:
    root = str(project)
    for step in ("register-raw", "stage", "audit", "build-series"):
        _invoke(step, "--root", root)
    missing = runner.invoke(app, ["run-stats", "--root", root])
    assert missing.exit_code == 1
    assert "no full validation run" in missing.output
    _invoke("run-validation", "--root", root)
    _invoke("run-validation", "--condition", "truncated", "--root", root)
    _invoke("run-validation", "--condition", "expanding", "--root", root)
    _invoke("simulate", "--root", root)
    out = Path(_invoke("run-stats", "--root", root).split()[-1])
    record = json.loads((out / "stats.json").read_text(encoding="utf-8"))
    assert record["sources"]["truncated"].endswith("validation-truncated")
    assert record["sources"]["expanding"].endswith("validation-expanding")
    he3 = pd.read_parquet(out / "he3_robustness.parquet")
    assert {"truncated", "expanding"} <= set(he3["condition"])
    expanding = next((project / "outputs" / "runs").glob("*-validation-expanding"))
    expanding_record = json.loads((expanding / "run.json").read_text(encoding="utf-8"))
    assert expanding_record["window"]["primary"] == "expanding"
    inventory = next((project / "outputs" / "runs").glob("*-weekly-inventory"))
    simulation = pd.read_parquet(inventory / "simulation.parquet")
    assert {"lost_value", "lost_value_sensitivity"} <= set(simulation.columns)
    profile = pd.read_parquet(project / "data" / "03_series" / "profile.parquet")
    total = profile[(profile["level"] == "total") & (profile["channel"] == "total")].iloc[0]
    assert total["months_with_sales"] > 0
    assert total["customers"] > 0
    assert 0 < total["top_customer_share"] <= 1
    assert 0 < total["top_sku_share"] <= 1
    monthly = Path(_invoke("run-validation", "--frequency", "monthly", "--root", root).split()[-1])
    monthly_record = json.loads((monthly / "run.json").read_text(encoding="utf-8"))
    # 3 months: Table 17 sensitivity, in a separate pass that leaves the 1-month results alone.
    assert (monthly_record["horizons"], monthly_record["sensitivity_horizons"]) == ([1], [3])
    missing_stats = runner.invoke(app, ["article-tables", "--root", root])
    assert missing_stats.exit_code == 1
    _invoke("simulate", "--frequency", "monthly", "--root", root)
    _invoke("run-stats", "--frequency", "monthly", "--root", root)
    tables = Path(_invoke("article-tables", "--root", root).split()[-1]).read_text(encoding="utf-8")
    for title in ("Table A1.", "Table B1.", "Table C3.", "Table D4 (Weekly)", "Table D6 (Monthly)"):
        assert title in tables
    assert "Table A2." not in tables  # no fiscal receipts in this project
    assert "| weekly | 2024" in tables
    assert monthly_record["sensitivity_pass"]["horizons"] == [3]
    monthly_metrics = pd.read_parquet(monthly / "metrics.parquet")
    assert set(monthly_metrics["horizon"]) == {1, 3}
    assert record["structural_break"] == "2025-05-01"
    assert record["rows"]["he1_friedman"] > 0
    truncated_runs = list((project / "outputs" / "runs").glob("*-validation-truncated"))
    run = json.loads((truncated_runs[0] / "run.json").read_text(encoding="utf-8"))
    assert (run["condition"], run["window"]["length"]) == ("truncated", 4)
    # The dashboard keeps showing the main (full) run.
    assert (
        load_dashboard_data(project_paths(project)).runs["weekly"].record.get("condition", "full")
        == "full"
    )


def test_tuning_selection_reaches_validation_and_reference_cross_check(project: Path) -> None:
    root = str(project)
    for step in ("register-raw", "stage", "audit", "build-series"):
        _invoke(step, "--root", root)
    tuning_path = project / "configs" / "tuning.yaml"
    tuning = yaml.safe_load(tuning_path.read_text(encoding="utf-8"))
    tuning["frequencies"]["weekly"]["origin_stride"] = 2
    for name in ("two_stage_trees", "global_gbm"):
        tuning["models"][name]["budget"] = 2
    tuning_path.write_text(yaml.safe_dump(tuning), encoding="utf-8")
    (project / "configs" / "tuned.yaml").unlink()

    out = Path(_invoke("tune", "--frequency", "weekly", "--root", root).split()[-1])
    record = json.loads((out / "tuning.json").read_text(encoding="utf-8"))
    assert record["test_span_used"] is False
    assert record["candidates"]["tsb"] == 16
    assert record["candidates"]["global_gbm"] == 2
    candidates = pd.read_parquet(out / "candidates.parquet")
    assert set(candidates["model"]) == set(tuning["models"])
    tuned = yaml.safe_load((project / "configs" / "tuned.yaml").read_text(encoding="utf-8"))
    assert tuned["sources"]["weekly"] == out.name
    assert set(tuned["frequencies"]["weekly"]) == set(tuning["models"])

    run = Path(_invoke("run-validation", "--frequency", "weekly", "--root", root).split()[-1])
    run_record = json.loads((run / "run.json").read_text(encoding="utf-8"))
    assert "tuned.yaml" in run_record["inputs"]
    assert run_record["params"]["tsb"] == tuned["frequencies"]["weekly"]["tsb"]

    cases = Path(_invoke("reference-cases", "--frequency", "weekly", "--root", root).split()[-1])
    missing = runner.invoke(app, ["compare-reference", str(cases)])
    assert missing.exit_code == 1
    own = own_forecasts(load_cases(cases))
    reference = {k: v for k, v in own.items() if k != "tsb_declared"}
    np.savez(cases / "reference.npz", versions=np.array("statsforecast test"), **reference)  # type: ignore[arg-type]
    output = _invoke("compare-reference", str(cases))
    assert "OK    croston" in output
    assert json.loads((cases / "crosscheck.json").read_text(encoding="utf-8"))["all_agree"]
    reference["sba"] = reference["sba"] + 1.0
    np.savez(cases / "reference.npz", **reference)  # type: ignore[arg-type]
    assert runner.invoke(app, ["compare-reference", str(cases)]).exit_code == 1


def test_tuning_refuses_undeclared_frequency_and_models(project: Path) -> None:
    root = str(project)
    for step in ("register-raw", "stage", "audit", "build-series"):
        _invoke(step, "--root", root)
    tuning_path = project / "configs" / "tuning.yaml"
    tuning = yaml.safe_load(tuning_path.read_text(encoding="utf-8"))
    del tuning["frequencies"]["monthly"]
    tuning["models"] = {"prophet": {"grid": {"a": [1.0]}, "budget": 1}}
    tuning_path.write_text(yaml.safe_dump(tuning), encoding="utf-8")
    monthly = runner.invoke(app, ["tune", "--frequency", "monthly", "--root", root])
    assert monthly.exit_code == 1
    assert "no search for monthly" in monthly.output
    unknown = runner.invoke(app, ["tune", "--frequency", "weekly", "--root", root])
    assert unknown.exit_code == 1
    assert "prophet" in unknown.output
    (project / "data" / "03_series" / "profile.parquet").write_bytes(b"changed")
    changed = runner.invoke(app, ["tune", "--frequency", "weekly", "--root", root])
    assert changed.exit_code == 1
    assert "differ" in changed.output
    cases = runner.invoke(app, ["reference-cases", "--root", root])
    assert cases.exit_code == 1


def test_declared_record_end_sets_the_test_window(project: Path) -> None:
    protocol_path = project / "configs" / "protocol.yaml"
    protocol = yaml.safe_load(protocol_path.read_text(encoding="utf-8"))
    protocol["final_test"]["record_end"] = "2024-12-31"
    protocol_path.write_text(yaml.safe_dump(protocol), encoding="utf-8")
    root = str(project)
    for step in ("register-raw", "stage", "audit", "build-series"):
        _invoke(step, "--root", root)
    manifest = json.loads((project / "data" / "03_series" / "manifest.json").read_text())
    windows = manifest["details"]["windows"]
    assert (windows["test_start"], windows["test_end"]) == ("2024-11-01", "2024-12-31")
    assert windows["record_end"] == "2024-12-31"
