"""Builds the configured models; families not implemented yet are reported, not substituted.

The parameters of a model are, in order of precedence: those selected by the hyperparameter
search for the frequency (``tuned.yaml``), the frequency-specific ones of ``models.yaml`` and its
general ``params``.
"""

from __future__ import annotations

import importlib.util
from collections.abc import Callable, Mapping
from dataclasses import dataclass

from pcsforecast.config import FrequencyName, ModelsConfig, ModelSpec
from pcsforecast.models.base import AnyForecaster
from pcsforecast.models.foundation import ChronosFineTuned, ChronosZeroShot, FineTuneSettings
from pcsforecast.models.gbm import GlobalGBM, TwoStageGBM
from pcsforecast.models.statistical import SES, TSB, Croston, Naive, sba

Params = Mapping[str, float]

BUILDERS: Mapping[str, Callable[[Params], AnyForecaster]] = {
    "naive": lambda _: Naive(),
    "ses": lambda _: SES(),
    "croston": lambda p: Croston(alpha=p.get("alpha", 0.1)),
    "sba": lambda p: sba(alpha=p.get("alpha", 0.1)),
    "tsb": lambda p: TSB(alpha_d=p.get("alpha_d", 0.1), alpha_p=p.get("alpha_p", 0.1)),
    "two_stage_trees": lambda p: TwoStageGBM(params=dict(p)),
    "global_gbm": lambda p: GlobalGBM(params=dict(p)),
}


FOUNDATION_MODULES = ("torch", "chronos")
DEFAULT_BATCH = 256


def foundation_available() -> bool:
    """Whether the optional ``foundation`` extra (PyTorch, Chronos) is installed."""
    return all(importlib.util.find_spec(module) is not None for module in FOUNDATION_MODULES)


def _fine_tune_settings(params: Params) -> FineTuneSettings:
    defaults = FineTuneSettings()
    return FineTuneSettings(
        learning_rate=float(params.get("learning_rate", defaults.learning_rate)),
        max_steps=int(params.get("max_steps", defaults.max_steps)),
        train_batch=int(params.get("train_batch", defaults.train_batch)),
        eval_every=int(params.get("eval_every", defaults.eval_every)),
        patience=int(params.get("patience", defaults.patience)),
        min_context=int(params.get("min_context", defaults.min_context)),
        seed=int(params.get("seed", defaults.seed)),
    )


def _pretrained(spec: ModelSpec, params: Params) -> AnyForecaster | None:
    """Chronos when its weights are pinned and the extra is installed."""
    if not (spec.hf_repo and spec.hf_revision) or not foundation_available():
        return None
    batch = int(params.get("batch_size", DEFAULT_BATCH))
    if spec.name == "chronos_zero_shot":
        return ChronosZeroShot(repo=spec.hf_repo, revision=spec.hf_revision, batch_size=batch)
    if spec.name == "chronos_fine_tuned":
        return ChronosFineTuned(
            repo=spec.hf_repo,
            revision=spec.hf_revision,
            batch_size=batch,
            settings=_fine_tune_settings(params),
            refit_every=int(params.get("refit_every", 1)),
        )
    return None


def model_params(
    spec: ModelSpec, frequency: FrequencyName | None, tuned: Mapping[str, Params] | None = None
) -> dict[str, float]:
    """Effective parameters of ``spec`` for ``frequency`` (see the module docstring)."""
    params = dict(spec.params)
    if frequency is not None:
        params.update(spec.params_by_frequency.get(frequency, {}))
    params.update((tuned or {}).get(spec.name, {}))
    return params


def build_model(spec: ModelSpec, params: Params) -> AnyForecaster | None:
    """One model with the given parameters, or ``None`` when it cannot be built here."""
    if spec.name in BUILDERS:
        return BUILDERS[spec.name](params)
    return _pretrained(spec, params)


@dataclass(frozen=True)
class ModelSet:
    models: tuple[AnyForecaster, ...]
    not_implemented: tuple[str, ...]
    params: Mapping[str, Mapping[str, float]]


def build_models(
    config: ModelsConfig,
    frequency: FrequencyName | None = None,
    tuned: Mapping[str, Params] | None = None,
) -> ModelSet:
    """Instantiate every configured model that has an implementation."""
    specs: list[ModelSpec] = [spec for specs in config.families.values() for spec in specs]
    models: list[AnyForecaster] = []
    missing: list[str] = []
    used: dict[str, Mapping[str, float]] = {}
    for spec in specs:
        params = model_params(spec, frequency, tuned)
        model = build_model(spec, params)
        if model is None:
            missing.append(spec.name)
        else:
            models.append(model)
            used[spec.name] = params
    return ModelSet(tuple(models), tuple(missing), used)


def pretrained_versions(config: ModelsConfig) -> dict[str, dict[str, str | None]]:
    """Repository and pinned revision of every pretrained model (experiment record, Table 30)."""
    return {
        spec.name: {"repo": spec.hf_repo, "revision": spec.hf_revision}
        for spec in config.families.get("pretrained", [])
    }
