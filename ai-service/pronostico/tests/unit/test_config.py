from __future__ import annotations

import re
from pathlib import Path

import pytest
import yaml
from pydantic import ValidationError

from pcsforecast.config import (
    CONFIG_FILES,
    DataRulesConfig,
    InventoryConfig,
    ModelsConfig,
    ProtocolConfig,
    SheetDateOverridesConfig,
    Status,
    StrictModel,
    file_sha256,
    load_config,
)


def _load_raw(path: Path) -> dict[str, object]:
    with path.open(encoding="utf-8") as handle:
        data: dict[str, object] = yaml.safe_load(handle)
    return data


@pytest.mark.parametrize(("filename", "model"), list(CONFIG_FILES.items()))
def test_project_configs_are_valid(
    project_root: Path, filename: str, model: type[StrictModel]
) -> None:
    config = load_config(project_root / "configs" / filename, model)
    assert getattr(config, "status", None) is Status.FROZEN


def test_protocol_matches_plan_table_17(project_root: Path) -> None:
    protocol = load_config(project_root / "configs" / "protocol.yaml", ProtocolConfig)
    weekly = protocol.frequencies["weekly"]
    monthly = protocol.frequencies["monthly"]
    assert (weekly.min_train_periods, weekly.horizons) == (52, [1, 4])
    assert (monthly.min_train_periods, monthly.horizons) == (18, [1])
    assert monthly.sensitivity_horizons == [3]
    assert protocol.final_test.last_complete_months == 6


def test_unknown_keys_are_rejected(project_root: Path) -> None:
    raw = _load_raw(project_root / "configs" / "protocol.yaml")
    raw["unexpected"] = 1
    with pytest.raises(ValidationError, match="unexpected"):
        ProtocolConfig.model_validate(raw)


def test_study_period_must_be_ordered(project_root: Path) -> None:
    raw = _load_raw(project_root / "configs" / "protocol.yaml")
    raw["study_period"] = {"start": "2026-09-30", "end": "2024-01-01"}
    with pytest.raises(ValidationError, match="before"):
        ProtocolConfig.model_validate(raw)


@pytest.mark.parametrize("grid", [[0.0, 1.0, 0.5], [0.0, 0.5, 0.5], [-0.5, 0.0]])
def test_safety_stock_grid_must_be_increasing_and_non_negative(
    project_root: Path, grid: list[float]
) -> None:
    raw = _load_raw(project_root / "configs" / "inventory.yaml")
    raw["safety_stock"] = {"grid_multipliers": grid}
    with pytest.raises(ValidationError):
        InventoryConfig.model_validate(raw)


@pytest.mark.parametrize("target", [0.0, 1.0, 1.5])
def test_fill_rate_target_is_a_probability(project_root: Path, target: float) -> None:
    raw = _load_raw(project_root / "configs" / "inventory.yaml")
    raw["fill_rate_target"] = {"primary": target}
    with pytest.raises(ValidationError):
        InventoryConfig.model_validate(raw)


def test_duplicate_model_names_are_rejected() -> None:
    raw = {"status": "draft", "families": {"baseline": [{"name": "naive"}, {"name": "naive"}]}}
    with pytest.raises(ValidationError, match="duplicate"):
        ModelsConfig.model_validate(raw)


def test_frozen_models_require_pinned_pretrained_weights() -> None:
    unpinned = {"name": "chronos_zero_shot", "hf_repo": "amazon/chronos-bolt-small"}
    raw = {"status": "frozen", "families": {"pretrained": [unpinned]}}
    with pytest.raises(ValidationError, match="hf_revision"):
        ModelsConfig.model_validate(raw)

    pinned = {**unpinned, "hf_revision": "abc123"}
    config = ModelsConfig.model_validate({"status": "frozen", "families": {"pretrained": [pinned]}})
    assert config.status is Status.FROZEN


def test_file_sha256_matches_known_digest(tmp_path: Path) -> None:
    path = tmp_path / "sample.txt"
    path.write_bytes(b"abc")
    expected = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    assert file_sha256(path) == expected


def test_movement_codes_must_be_unique(project_root: Path) -> None:
    raw = _load_raw(project_root / "configs" / "data_rules.yaml")
    raw["movement_types"] = {
        "sale_paid": {"codes": ["PAGO"], "confirmed": True},
        "return": {"codes": ["PAGO"], "confirmed": True},
        "not_sold": {"codes": [], "confirmed": True},
    }
    with pytest.raises(ValidationError, match="more than one movement type"):
        DataRulesConfig.model_validate(raw)


def test_empty_code_type_must_exist(project_root: Path) -> None:
    raw = _load_raw(project_root / "configs" / "data_rules.yaml")
    raw["empty_code_type"] = "unknown"
    with pytest.raises(ValidationError, match="not a movement type"):
        DataRulesConfig.model_validate(raw)


def test_movement_types_need_codes_unless_they_take_empty_obs(project_root: Path) -> None:
    raw = _load_raw(project_root / "configs" / "data_rules.yaml")
    movement_types = raw["movement_types"]
    assert isinstance(movement_types, dict)
    movement_types["damaged"] = {"codes": [], "confirmed": True}
    with pytest.raises(ValidationError, match="without codes"):
        DataRulesConfig.model_validate(raw)


def test_movement_lookup_is_upper_case(project_root: Path) -> None:
    rules = load_config(project_root / "configs" / "data_rules.yaml", DataRulesConfig)
    lookup = rules.movement_lookup()
    assert lookup["PAGO"] == "sale_paid"
    assert lookup["T"] == "sale_paid"
    assert lookup["REEMP GARANTIA"] == "warranty"
    assert lookup["DAÑADA"] == "damaged"
    assert rules.empty_code_type == "not_sold"


def test_every_rule_used_in_code_is_declared(project_root: Path) -> None:
    rules = load_config(project_root / "configs" / "data_rules.yaml", DataRulesConfig)
    used = {
        rule
        for path in (project_root / "src").rglob("*.py")
        for rule in re.findall(r"\"(R\d{3})\"", path.read_text(encoding="utf-8"))
    }
    assert used, "no rule ids found in the source"
    assert used <= rules.rule_ids()


def test_overrides_are_validated() -> None:
    entry = {
        "sheet_name": "x",
        "date_start": "2026-04-18",
        "date_end": "2026-04-14",
        "reason": "r",
        "confirmed_by": "m",
    }
    with pytest.raises(ValidationError, match="after"):
        SheetDateOverridesConfig.model_validate({"status": "draft", "overrides": [entry]})
    entry["date_start"] = "2026-04-14"
    with pytest.raises(ValidationError, match="duplicate"):
        SheetDateOverridesConfig.model_validate({"status": "draft", "overrides": [entry, entry]})
