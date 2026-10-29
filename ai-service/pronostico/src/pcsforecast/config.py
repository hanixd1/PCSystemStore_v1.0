"""Typed, validated loaders for the YAML files in ``configs/``.

Every experiment parameter lives in configuration, never hard-coded, so that the
F8 freeze can hash exactly what was run.
"""

from __future__ import annotations

import hashlib
import re
from collections import Counter
from collections.abc import Iterable
from datetime import date
from enum import StrEnum
from pathlib import Path
from typing import Annotated, Literal

import yaml
from pydantic import BaseModel, ConfigDict, Field, NonNegativeInt, model_validator

IDENTIFIER = r"^[a-z][a-z0-9_]*$"
PositiveInt = Annotated[int, Field(gt=0)]
Probability = Annotated[float, Field(gt=0.0, lt=1.0)]
FrequencyName = Literal["weekly", "monthly"]


def duplicates(items: Iterable[str]) -> list[str]:
    """Values that appear more than once, sorted (linear time)."""
    return sorted(value for value, count in Counter(items).items() if count > 1)


class Status(StrEnum):
    DRAFT = "draft"
    FROZEN = "frozen"


class StrictModel(BaseModel):
    """Immutable configuration model that rejects unknown keys."""

    model_config = ConfigDict(extra="forbid", frozen=True)


# --- protocol.yaml -------------------------------------------------------------


class StudyPeriod(StrictModel):
    start: date
    end: date

    @model_validator(mode="after")
    def _ordered(self) -> StudyPeriod:
        if self.start >= self.end:
            raise ValueError("study_period.start must be before study_period.end")
        return self


class FinalTest(StrictModel):
    last_complete_months: PositiveInt
    # End of the recorded span declared by the company, when the last daily sheet does not reach
    # it (amendment v5: low sales left no vecinos sheet after 23 August 2026, receipts are complete
    # to the end of the month). ``None``: the span ends with the last dated sheet.
    record_end: date | None = None


class Window(StrictModel):
    primary: Literal["rolling", "expanding"]
    length: PositiveInt
    contrast: Literal["rolling", "expanding"] | None = None


class FrequencyProtocol(StrictModel):
    min_train_periods: PositiveInt
    horizons: list[PositiveInt] = Field(min_length=1)
    sensitivity_horizons: list[PositiveInt] = Field(default_factory=list)
    origin_step: PositiveInt
    window: Window
    # HE3 truncated-history condition: the rolling window shortened to this many periods.
    truncated_length: PositiveInt | None = None

    @model_validator(mode="after")
    def _truncated_is_shorter(self) -> FrequencyProtocol:
        if self.truncated_length is not None and self.truncated_length >= self.window.length:
            raise ValueError("truncated_length must be shorter than the primary window")
        return self


class ProtocolConfig(StrictModel):
    status: Status
    study_period: StudyPeriod
    final_test: FinalTest
    # Channel-composition break (amendment v3, D4): fixed from the owner's dating of the component
    # shortage and development-span channel shares, never from test-span errors.
    structural_break: date | None = None
    frequencies: dict[FrequencyName, FrequencyProtocol] = Field(min_length=1)


# --- inventory.yaml ------------------------------------------------------------


class LeadTime(StrictModel):
    primary: PositiveInt
    sensitivity: list[PositiveInt] = Field(default_factory=list)


class FillRateTarget(StrictModel):
    primary: Probability
    sensitivity: list[Probability] = Field(default_factory=list)


class LostSalesValuation(StrictModel):
    primary: Literal["price_known_at_origin", "mean_training_price"]
    sensitivity: Literal["price_known_at_origin", "mean_training_price"] | None = None


class SafetyStock(StrictModel):
    grid_multipliers: list[Annotated[float, Field(ge=0.0)]] = Field(min_length=1)

    @model_validator(mode="after")
    def _sorted_unique(self) -> SafetyStock:
        grid = self.grid_multipliers
        if grid != sorted(set(grid)):
            raise ValueError("safety_stock.grid_multipliers must be strictly increasing")
        return self


class InventoryConfig(StrictModel):
    status: Status
    policy: Literal["periodic_review_order_up_to"]
    review_period: PositiveInt
    lead_time: LeadTime
    fill_rate_target: FillRateTarget
    initial_stock: Literal["target_level_at_first_origin"]
    lost_sales_valuation: LostSalesValuation
    safety_stock: SafetyStock


# --- models.yaml ---------------------------------------------------------------


class ModelSpec(StrictModel):
    name: str = Field(pattern=IDENTIFIER)
    hf_repo: str | None = None
    hf_revision: str | None = None
    params: dict[str, float] = Field(default_factory=dict)
    # Settings that depend on the period length (for example a refit cadence), merged over params.
    params_by_frequency: dict[FrequencyName, dict[str, float]] = Field(default_factory=dict)


class ModelsConfig(StrictModel):
    status: Status
    families: dict[
        Literal["baseline", "intermittent", "machine_learning", "pretrained"], list[ModelSpec]
    ]

    @model_validator(mode="after")
    def _unique_names(self) -> ModelsConfig:
        names = [spec.name for specs in self.families.values() for spec in specs]
        repeated = duplicates(names)
        if repeated:
            raise ValueError(f"duplicate model names: {repeated}")
        return self

    @model_validator(mode="after")
    def _pinned_when_frozen(self) -> ModelsConfig:
        if self.status is Status.FROZEN:
            unpinned = [
                spec.name
                for spec in self.families.get("pretrained", [])
                if not (spec.hf_repo and spec.hf_revision)
            ]
            if unpinned:
                raise ValueError(f"frozen pretrained models need hf_repo/hf_revision: {unpinned}")
        return self


# --- data_rules.yaml -----------------------------------------------------------


class SourceSpec(StrictModel):
    id: str = Field(pattern=IDENTIFIER)
    channel: Literal["vecinos", "facturado", "reference"]
    description: str
    file_glob: str
    # Column headings checked in tabular sources; empty for documents such as PDF receipts.
    expected_columns: list[str] = Field(default_factory=list)


class CleaningRule(StrictModel):
    id: str = Field(pattern=r"^R\d{3}$")
    description: str
    reason: str


MovementType = Literal[
    "sale_paid", "sale_credit", "return", "warranty", "damaged", "not_sold", "unknown"
]


class MovementSpec(StrictModel):
    codes: list[str] = Field(default_factory=list)
    confirmed: bool


class DataRulesConfig(StrictModel):
    status: Status
    delivery_dir: str
    sources: list[SourceSpec] = Field(min_length=1)
    movement_types: dict[MovementType, MovementSpec]
    empty_code_type: MovementType
    rules: list[CleaningRule] = Field(default_factory=list)

    @model_validator(mode="after")
    def _types_reachable(self) -> DataRulesConfig:
        if self.empty_code_type not in self.movement_types:
            raise ValueError(f"empty_code_type {self.empty_code_type!r} is not a movement type")
        unreachable = sorted(
            name
            for name, spec in self.movement_types.items()
            if not spec.codes and name != self.empty_code_type
        )
        if unreachable:
            raise ValueError(f"movement types without codes: {unreachable}")
        return self

    @model_validator(mode="after")
    def _codes_unique(self) -> DataRulesConfig:
        codes = [code for spec in self.movement_types.values() for code in spec.codes]
        repeated = duplicates(codes)
        if repeated:
            raise ValueError(f"OBS codes mapped to more than one movement type: {repeated}")
        return self

    def rule_ids(self) -> set[str]:
        return {rule.id for rule in self.rules}

    def movement_lookup(self) -> dict[str, str]:
        """Upper-case OBS code → movement type."""
        return {
            code.upper(): movement
            for movement, spec in self.movement_types.items()
            for code in spec.codes
        }


# --- sheet_date_overrides.yaml ---------------------------------------------------


class SheetDateOverride(StrictModel):
    sheet_name: str = Field(min_length=1)
    date_start: date
    date_end: date
    reason: str = Field(min_length=1)
    confirmed_by: str = Field(min_length=1)

    @model_validator(mode="after")
    def _ordered(self) -> SheetDateOverride:
        if self.date_start > self.date_end:
            raise ValueError(f"{self.sheet_name}: date_start is after date_end")
        return self


class SheetDateOverridesConfig(StrictModel):
    status: Status
    overrides: list[SheetDateOverride] = Field(default_factory=list)

    @model_validator(mode="after")
    def _unique_sheets(self) -> SheetDateOverridesConfig:
        names = [o.sheet_name for o in self.overrides]
        repeated = duplicates(names)
        if repeated:
            raise ValueError(f"duplicate overrides: {repeated}")
        return self


# --- catalog.yaml --------------------------------------------------------------


class CategoryRule(StrictModel):
    id: str = Field(pattern=IDENTIFIER)
    label: str = Field(min_length=1)
    pattern: str = Field(min_length=1)

    @model_validator(mode="after")
    def _compiles(self) -> CategoryRule:
        try:
            re.compile(self.pattern)
        except re.error as error:
            raise ValueError(f"category {self.id}: invalid pattern ({error})") from error
        return self


class FallbackCategory(StrictModel):
    id: str = Field(pattern=IDENTIFIER)
    label: str = Field(min_length=1)


class SkuMerge(StrictModel):
    name: str = Field(min_length=1)
    keys: list[str] = Field(min_length=2)
    reason: str = Field(min_length=1)


class CatalogConfig(StrictModel):
    status: Status
    synonyms: dict[str, str] = Field(default_factory=dict)
    stopwords: list[str] = Field(default_factory=list)
    categories: list[CategoryRule] = Field(min_length=1)
    fallback_category: FallbackCategory
    merges: list[SkuMerge] = Field(default_factory=list)

    @model_validator(mode="after")
    def _unique_categories(self) -> CatalogConfig:
        ids = [c.id for c in self.categories] + [self.fallback_category.id]
        repeated = duplicates(ids)
        if repeated:
            raise ValueError(f"duplicate category ids: {repeated}")
        return self


# --- price_links.yaml ----------------------------------------------------------


class PriceLinksConfig(StrictModel):
    """How catalog texts are linked to the distributor price list (phase F2b)."""

    status: Status
    # Applied only to the linking tokens, never to the SKU keys of the series.
    synonyms: dict[str, str] = Field(default_factory=dict)
    stopwords: list[str] = Field(default_factory=list)
    brands: list[str] = Field(default_factory=list)
    exclusive_groups: list[list[str]] = Field(default_factory=list)
    # Regular expressions (on the normalised text) of texts that are not one list product.
    excluded_patterns: list[str] = Field(default_factory=list)
    min_part_number_length: int = Field(ge=3)
    min_link_score: Probability
    min_candidate_score: Probability
    min_margin: Probability

    @model_validator(mode="after")
    def _ordered_scores(self) -> PriceLinksConfig:
        if self.min_candidate_score > self.min_link_score:
            raise ValueError("min_candidate_score must not exceed min_link_score")
        return self


# --- series.yaml ---------------------------------------------------------------


Channel = Literal["total", "vecinos", "facturado", "total_dedup"]


def _primary_channel() -> list[Channel]:
    return ["total"]


class SeriesConfig(StrictModel):
    status: Status
    # Demand channels (amendment v3, D1): total = vecinos record + delivered receipts (primary),
    # each source alone, and total without receipt lines that may repeat a vecinos sale.
    channels: list[Channel] = Field(default_factory=_primary_channel, min_length=1)
    duplicate_window_days: NonNegativeInt = 3
    # Receipts carry prices without IGV; amounts are converted to the price the customer paid.
    receipt_tax_rate: Annotated[float, Field(ge=0.0, lt=1.0)] = 0.18
    demand_movements: list[MovementType] = Field(min_length=1)
    date_confidences: list[Literal["confirmed", "high", "medium", "low"]] = Field(min_length=1)
    week_start: Literal["monday"]
    sku_volume_share: Probability
    sku_volume_share_sensitivity: list[Probability] = Field(default_factory=list)
    adi_cutoff: Annotated[float, Field(gt=1.0)]
    cv2_cutoff: Annotated[float, Field(gt=0.0)]


# --- stats.yaml ----------------------------------------------------------------


class InventoryScenario(StrictModel):
    lead_time: PositiveInt
    target: Probability


class StatsConfig(StrictModel):
    """Statistical comparison of the models (plan 2.6.6, Tables 14 and 22; phase F7)."""

    status: Status
    alpha: Probability
    # Pairs for Diebold-Mariano and Wilcoxon, declared before any test-span result.
    pairs: list[tuple[str, str]] = Field(min_length=1)
    bootstrap_resamples: PositiveInt
    seed: int
    spearman_threshold: float = Field(ge=-1.0, le=1.0)
    channels: list[Channel] = Field(min_length=1)
    levels: list[Literal["total", "category", "sku"]] = Field(min_length=1)
    primary_scenario: InventoryScenario


# --- tuning.yaml / tuned.yaml -------------------------------------------------


class TuningFrequency(StrictModel):
    # Every k-th validation origin is a tuning origin (part of the declared search budget).
    origin_stride: PositiveInt


class TunedModel(StrictModel):
    # Candidate values per hyperparameter; the candidates are their full product.
    grid: dict[str, list[float]] = Field(min_length=1)
    # Maximum candidates evaluated, the declared configuration included. A larger product is
    # sampled with the seed.
    budget: PositiveInt

    @model_validator(mode="after")
    def _non_empty_values(self) -> TunedModel:
        empty = sorted(name for name, values in self.grid.items() if not values)
        if empty:
            raise ValueError(f"empty grid values: {empty}")
        return self


class TuningConfig(StrictModel):
    """Hyperparameter search on internal origins before the final test (plan 2.6.3)."""

    status: Status
    seed: int
    metric: Literal["mase"]
    # Series that score the candidates; panel models are still trained on the whole panel.
    channel: Channel
    frequencies: dict[FrequencyName, TuningFrequency] = Field(min_length=1)
    models: dict[str, TunedModel] = Field(min_length=1)


class TunedConfig(StrictModel):
    """Hyperparameters selected by ``pcs tune`` (generated; frozen in F8)."""

    status: Status
    frequencies: dict[FrequencyName, dict[str, dict[str, float]]] = Field(default_factory=dict)
    sources: dict[FrequencyName, str] = Field(default_factory=dict)


# --- loading -------------------------------------------------------------------

CONFIG_FILES: dict[str, type[StrictModel]] = {
    "protocol.yaml": ProtocolConfig,
    "inventory.yaml": InventoryConfig,
    "models.yaml": ModelsConfig,
    "data_rules.yaml": DataRulesConfig,
    "sheet_date_overrides.yaml": SheetDateOverridesConfig,
    "catalog.yaml": CatalogConfig,
    "series.yaml": SeriesConfig,
    "price_links.yaml": PriceLinksConfig,
    "stats.yaml": StatsConfig,
    "tuning.yaml": TuningConfig,
    "tuned.yaml": TunedConfig,
}


def load_config[T: StrictModel](path: Path, model: type[T]) -> T:
    """Parse ``path`` and validate it against ``model``."""
    with path.open(encoding="utf-8") as handle:
        raw = yaml.safe_load(handle)
    return model.model_validate(raw)


def load_project_config[T: StrictModel](configs_dir: Path, model: type[T]) -> T:
    """Load the file of ``configs_dir`` that ``CONFIG_FILES`` assigns to ``model``."""
    filename = next(name for name, kind in CONFIG_FILES.items() if kind is model)
    return load_config(configs_dir / filename, model)


def file_sha256(path: Path) -> str:
    """Hex SHA-256 of a file's bytes."""
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()
