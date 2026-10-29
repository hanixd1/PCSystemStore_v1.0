"""Command-line entry point (``pcs``). Each research phase adds its own command."""

from __future__ import annotations

import json
import os
from collections.abc import Callable
from pathlib import Path
from typing import Annotated

import typer
from pydantic import ValidationError

from pcsforecast import __version__
from pcsforecast.audit.receipts_run import run_audit_receipts, run_stage_receipts
from pcsforecast.audit.run import StepInputError, run_audit, run_stage
from pcsforecast.catalog.prices_run import PriceInputError, run_ingest_prices, run_link_prices
from pcsforecast.config import (
    CONFIG_FILES,
    CatalogConfig,
    DataRulesConfig,
    InventoryConfig,
    ModelsConfig,
    PriceLinksConfig,
    ProtocolConfig,
    SeriesConfig,
    SheetDateOverridesConfig,
    StatsConfig,
    TuningConfig,
    file_sha256,
    load_config,
    load_project_config,
)
from pcsforecast.evaluation.compare import CompareInputError, compare_predictions
from pcsforecast.final_test.panel import FinalTestError
from pcsforecast.final_test.run import run_final_test
from pcsforecast.freeze.run import FreezeError, readiness, write_freeze
from pcsforecast.ingest.raw_registry import RawRegistryError, register_raw_sources
from pcsforecast.inventory.run import InventoryInputError, run_inventory
from pcsforecast.manifest import read_manifest
from pcsforecast.paths import ProjectPaths, project_paths
from pcsforecast.privacy import (
    known_identifiers,
    scan_for_document_numbers,
    scan_for_identifiers,
    secure_private,
)
from pcsforecast.protocol.stages import Stage
from pcsforecast.reference.crosscheck import (
    ReferenceInputError,
    run_compare_reference,
    run_reference_cases,
)
from pcsforecast.reporting.article import ArticleInputError, run_article_tables
from pcsforecast.reporting.figures import FigureInputError, run_thesis_figures
from pcsforecast.reporting.thesis import run_thesis_tables
from pcsforecast.runner.run import Condition, Frequency, RunInputError, run_validation
from pcsforecast.runtime import environment_fingerprint
from pcsforecast.series.run import SeriesInputError, run_series
from pcsforecast.stats.run import StatsInputError, run_stats
from pcsforecast.tuning.run import TuningInputError, run_tuning, tuned_params

app = typer.Typer(no_args_is_help=True, add_completion=False, help=__doc__)

# Pretrained weights live in the project's models_cache/ (ignored by Git), never in a user-wide
# cache, and Hugging Face telemetry stays off.
os.environ.setdefault("HF_HOME", str(Path.cwd() / "models_cache"))
os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")

RootOption = Annotated[
    Path | None,
    typer.Option("--root", help="Project root (defaults to PCS_PROJECT_ROOT or the cwd)."),
]


@app.command("version")
def show_version() -> None:
    """Print the package version."""
    typer.echo(__version__)


@app.command("env")
def show_env() -> None:
    """Print the execution-environment fingerprint as JSON."""
    typer.echo(json.dumps(environment_fingerprint(), indent=2, sort_keys=True))


@app.command("check-config")
def check_config(root: RootOption = None) -> None:
    """Validate every file in configs/ and print its status and SHA-256."""
    configs_dir = project_paths(root).configs
    failures = 0
    for filename, model in CONFIG_FILES.items():
        path = configs_dir / filename
        if not path.is_file():
            typer.echo(f"MISSING  {filename}", err=True)
            failures += 1
            continue
        try:
            config = load_config(path, model)
        except ValidationError as error:
            typer.echo(f"INVALID  {filename}\n{error}", err=True)
            failures += 1
            continue
        status = getattr(config, "status", "?")
        typer.echo(f"OK       {filename}  status={status}  sha256={file_sha256(path)}")
    if failures:
        raise typer.Exit(code=1)


@app.command("register-raw")
def register_raw(root: RootOption = None) -> None:
    """F1: copy delivered files into data/00_raw (read-only) with a SHA-256 manifest."""
    paths = project_paths(root)
    rules = load_project_config(paths.configs, DataRulesConfig)
    try:
        files = register_raw_sources(paths, rules)
    except RawRegistryError as error:
        typer.echo(f"ERROR  {error}", err=True)
        raise typer.Exit(code=1) from error
    for raw in files:
        typer.echo(f"OK  {raw.source_id}  {raw.path.name}  sha256={raw.sha256}")
    withdrawn = read_manifest(paths.raw)["details"]
    for path in withdrawn.get("withdrawn", []) if isinstance(withdrawn, dict) else []:
        typer.echo(f"NOTE  no longer delivered (kept read-only, not read): {path}")
    if not files:
        typer.echo("No delivered files matched the source globs.", err=True)
        raise typer.Exit(code=1)


@app.command("stage")
def stage(root: RootOption = None) -> None:
    """F1: extract the registered vecinos workbook into data/01_staged."""
    _run_step(run_stage, root)


@app.command("audit")
def audit(root: RootOption = None) -> None:
    """F1: resolve sheet dates, clean, anonymise and audit into data/02_clean."""
    paths = project_paths(root)
    rules = load_project_config(paths.configs, DataRulesConfig)
    overrides = load_project_config(paths.configs, SheetDateOverridesConfig)
    try:
        manifest = run_audit(paths, rules, overrides)
    except (StepInputError, PriceInputError) as error:
        typer.echo(f"ERROR  {error}", err=True)
        raise typer.Exit(code=1) from error
    typer.echo(f"OK  {manifest}")


@app.command("stage-receipts")
def stage_receipts_command(root: RootOption = None) -> None:
    """F1: read the registered retail receipts into data/01_staged/retail (customers as codes)."""
    _run_step(run_stage_receipts, root)


@app.command("audit-receipts")
def audit_receipts_command(root: RootOption = None) -> None:
    """F1: validate, reconcile and clean the staged receipts into data/02_clean/retail."""
    _run_step(run_audit_receipts, root)


def _run_step(step: Callable[[ProjectPaths], Path], root: Path | None) -> None:
    try:
        manifest = step(project_paths(root))
    except (StepInputError, PriceInputError) as error:
        typer.echo(f"ERROR  {error}", err=True)
        raise typer.Exit(code=1) from error
    typer.echo(f"OK  {manifest}")


@app.command("ingest-prices")
def ingest_prices_command(root: RootOption = None) -> None:
    """F2b: read the registered distributor price list into data/02_clean/prices."""
    _run_step(run_ingest_prices, root)


@app.command("link-prices")
def link_prices_command(root: RootOption = None) -> None:
    """F2b: link catalog SKUs and retail texts to the price list (data/03_series/price_links)."""
    paths = project_paths(root)

    def step(project: ProjectPaths) -> Path:
        return run_link_prices(
            project,
            load_project_config(project.configs, CatalogConfig),
            load_project_config(project.configs, PriceLinksConfig),
        )

    _run_step(step, paths.root)


@app.command("build-series")
def build_series(root: RootOption = None) -> None:
    """F2: catalog, calendars, demand panels (development and sealed test) and profiles."""
    paths = project_paths(root)
    try:
        manifest = run_series(
            paths,
            load_project_config(paths.configs, CatalogConfig),
            load_project_config(paths.configs, SeriesConfig),
            load_project_config(paths.configs, ProtocolConfig),
        )
    except SeriesInputError as error:
        typer.echo(f"ERROR  {error}", err=True)
        raise typer.Exit(code=1) from error
    typer.echo(f"OK  {manifest}")


@app.command("run-validation")
def run_validation_command(
    frequency: Annotated[Frequency, typer.Option(help="weekly or monthly")] = "weekly",
    root: RootOption = None,
    condition: Annotated[
        Condition, typer.Option(help="full, truncated history or expanding window (HE3, Table 17)")
    ] = "full",
) -> None:
    """F3: rolling-origin internal validation of every implemented model (test stays sealed)."""
    paths = project_paths(root)
    try:
        out = run_validation(
            paths,
            frequency,
            load_project_config(paths.configs, ProtocolConfig),
            load_project_config(paths.configs, ModelsConfig),
            condition=condition,
        )
    except RunInputError as error:
        typer.echo(f"ERROR  {error}", err=True)
        raise typer.Exit(code=1) from error
    typer.echo(f"OK  {out}")


@app.command("tune")
def tune_command(
    frequency: Annotated[Frequency, typer.Option(help="weekly or monthly")] = "weekly",
    root: RootOption = None,
) -> None:
    """F3-F5: hyperparameter search on internal origins; writes configs/tuned.yaml."""
    paths = project_paths(root)
    try:
        out = run_tuning(
            paths,
            frequency,
            load_project_config(paths.configs, ProtocolConfig),
            load_project_config(paths.configs, ModelsConfig),
            load_project_config(paths.configs, TuningConfig),
        )
    except TuningInputError as error:
        typer.echo(f"ERROR  {error}", err=True)
        raise typer.Exit(code=1) from error
    typer.echo(f"OK  {out}")


@app.command("reference-cases")
def reference_cases_command(
    frequency: Annotated[Frequency, typer.Option(help="weekly or monthly")] = "weekly",
    root: RootOption = None,
) -> None:
    """Cross-check step 1: training windows for the statsforecast reference (ADR-0004)."""
    paths = project_paths(root)
    try:
        out = run_reference_cases(
            paths,
            frequency,
            load_project_config(paths.configs, ProtocolConfig),
            tuned_params(paths, frequency).get("tsb", {}),
        )
    except ReferenceInputError as error:
        typer.echo(f"ERROR  {error}", err=True)
        raise typer.Exit(code=1) from error
    typer.echo(f"OK  {out}")


def _agreement(agrees: bool, must_match: bool) -> str:
    if agrees:
        return "OK  "
    return "DIFF" if must_match else "NOTE"


@app.command("compare-reference")
def compare_reference_command(
    directory: Annotated[Path, typer.Argument(help="Directory written by reference-cases")],
) -> None:
    """Cross-check step 3: own forecasts against statsforecast's on the same cases."""
    try:
        table = run_compare_reference(directory)
    except ReferenceInputError as error:
        typer.echo(f"ERROR  {error}", err=True)
        raise typer.Exit(code=1) from error
    for row in table.itertuples():
        status = _agreement(bool(row.agrees), bool(row.must_match))
        typer.echo(
            f"{status}  {row.method:<13} cases={row.cases}  "
            f"max_abs_diff={row.max_abs_difference:.3g}"
        )
    if not table.loc[table["must_match"], "agrees"].all():
        raise typer.Exit(code=1)


@app.command("run-stats")
def run_stats_command(
    frequency: Annotated[Frequency, typer.Option(help="weekly or monthly")] = "weekly",
    root: RootOption = None,
) -> None:
    """F7: Friedman/Nemenyi, Diebold-Mariano, Wilcoxon, Spearman and HE3 on the latest runs."""
    paths = project_paths(root)
    protocol = load_project_config(paths.configs, ProtocolConfig)
    try:
        out = run_stats(
            paths,
            frequency,
            load_project_config(paths.configs, StatsConfig),
            protocol.structural_break,
        )
    except StatsInputError as error:
        typer.echo(f"ERROR  {error}", err=True)
        raise typer.Exit(code=1) from error
    typer.echo(f"OK  {out}")


@app.command("simulate")
def simulate_command(
    frequency: Annotated[Frequency, typer.Option(help="weekly or monthly")] = "weekly",
    root: RootOption = None,
) -> None:
    """F6: (R, S) inventory simulation with calibrated safety stock (test stays sealed)."""
    paths = project_paths(root)
    try:
        out = run_inventory(
            paths,
            frequency,
            load_project_config(paths.configs, ProtocolConfig),
            load_project_config(paths.configs, ModelsConfig),
            load_project_config(paths.configs, InventoryConfig),
        )
    except InventoryInputError as error:
        typer.echo(f"ERROR  {error}", err=True)
        raise typer.Exit(code=1) from error
    typer.echo(f"OK  {out}")


@app.command("compare-runs")
def compare_runs_command(
    first: Annotated[Path, typer.Argument(help="Run directory")],
    second: Annotated[Path, typer.Argument(help="Run directory of the same configuration")],
) -> None:
    """Reliability: per-model differences between the predictions of two runs."""
    try:
        table = compare_predictions(first, second)
    except CompareInputError as error:
        typer.echo(f"ERROR  {error}", err=True)
        raise typer.Exit(code=1) from error
    for row in table.itertuples():
        typer.echo(
            f"{row.model:<20} forecasts={row.forecasts}  identical={row.identical}  "
            f"only_in_one={row.only_in_one_run}  max_abs_diff={row.max_abs_difference:.3g}"
        )


StageOption = Annotated[Stage, typer.Option(help="development, rehearsal or test (final test, F9)")]


@app.command("run-final-test")
def run_final_test_command(
    rehearsal: Annotated[
        bool, typer.Option("--rehearsal", help="Run on the development span; the test stays sealed")
    ] = False,
    commit: Annotated[
        str | None, typer.Option(help="Checked-out commit (given by scripts/open_test.sh)")
    ] = None,
    root: RootOption = None,
) -> None:
    """F9: open the final test once: accuracy, inventory and statistics of every frequency."""
    try:
        result = run_final_test(
            project_paths(root), "rehearsal" if rehearsal else "test", commit=commit
        )
    except (FinalTestError, RunInputError, InventoryInputError, StatsInputError) as error:
        typer.echo(f"ERROR  {error}", err=True)
        raise typer.Exit(code=1) from error
    for out in [*result.runs, *result.stats]:
        typer.echo(f"OK  {out}")


@app.command("article-tables")
def article_tables_command(root: RootOption = None, stage: StageOption = "development") -> None:
    """Article evidence: data governance, temporal split, reproducibility and statistics."""
    try:
        out = run_article_tables(project_paths(root), stage)
    except (ArticleInputError, StatsInputError) as error:
        typer.echo(f"ERROR  {error}", err=True)
        raise typer.Exit(code=1) from error
    typer.echo(f"OK  {out / 'tables.md'}")


@app.command("thesis-tables")
def thesis_tables_command(root: RootOption = None, stage: StageOption = "test") -> None:
    """Thesis chapter III: normality, demand, model application and hypothesis tables."""
    try:
        out = run_thesis_tables(project_paths(root), stage)
    except (ArticleInputError, StatsInputError, FinalTestError, FileNotFoundError) as error:
        typer.echo(f"ERROR  {error}", err=True)
        raise typer.Exit(code=1) from error
    typer.echo(f"OK  {out / 'tables.md'}")


@app.command("thesis-figures")
def thesis_figures_command(root: RootOption = None, stage: StageOption = "test") -> None:
    """Thesis figures: critical-difference diagrams and service against stock."""
    try:
        out = run_thesis_figures(project_paths(root), stage)
    except (FigureInputError, StatsInputError, ModuleNotFoundError) as error:
        typer.echo(f"ERROR  {error}", err=True)
        raise typer.Exit(code=1) from error
    typer.echo(f"OK  {out}")


@app.command("freeze")
def freeze_command(
    commit: Annotated[
        str | None, typer.Option(help="Commit to freeze (given by scripts/freeze.sh)")
    ] = None,
    tag: Annotated[str, typer.Option(help="Tag recorded in FREEZE.json")] = (
        "v1.0.0-research-freeze"
    ),
    check: Annotated[bool, typer.Option("--check", help="Only list what blocks the freeze")] = (
        False
    ),
    root: RootOption = None,
) -> None:
    """F8: verify every freeze condition and write FREEZE.json (opens the way to the test)."""
    paths = project_paths(root)
    checks = readiness(paths, commit)
    for item in checks:
        typer.echo(f"{'OK  ' if item.passed else 'TODO'}  {item.name:<20} {item.detail}")
    if check:
        return
    if commit is None:
        typer.echo("ERROR  give --commit (run scripts/freeze.sh)", err=True)
        raise typer.Exit(code=1)
    try:
        out = write_freeze(paths, commit, tag)
    except FreezeError as error:
        typer.echo(f"ERROR  {error}", err=True)
        raise typer.Exit(code=1) from error
    typer.echo(f"OK  {out}")


@app.command("check-privacy")
def check_privacy(
    root: RootOption = None,
    show_names: Annotated[
        bool, typer.Option("--show-names", help="Print the matched names (your terminal only).")
    ] = False,
) -> None:
    """Restrict data/private to the owner and search every shareable output for customer names.

    Reports customer codes, not names, unless --show-names is given. A match that is an ordinary
    word where it appears (a shop named after a brand) is confirmed by adding the name to
    data/private/privacy_allowlist.txt. Exits with 1 while any unconfirmed match remains.
    """
    paths = project_paths(root)
    fixed = secure_private(paths.private)
    for name in fixed:
        typer.echo(f"FIXED    permissions of data/private/{name}")
    roots = [
        p
        for p in (paths.staged, paths.clean, paths.series, paths.runs.parent, paths.root / "docs")
        if p.exists()
    ]
    identifiers = known_identifiers(paths.private)
    findings = scan_for_identifiers(roots, identifiers, paths.root)
    findings += scan_for_document_numbers(roots, paths.root)
    for finding in findings:
        typer.echo(f"MATCH    {finding.describe(show_names)}", err=True)
    scanned = ", ".join(p.relative_to(paths.root).as_posix() for p in roots)
    typer.echo(f"Searched {len(identifiers)} customer names and DNI/RUC numbers in: {scanned}")
    if findings:
        typer.echo(
            "Review the matches (pcs check-privacy --show-names) and either fix the source or "
            "add confirmed ordinary words to data/private/privacy_allowlist.txt.",
            err=True,
        )
        raise typer.Exit(code=1)
    typer.echo("OK       no customer name or DNI/RUC found outside data/private")
