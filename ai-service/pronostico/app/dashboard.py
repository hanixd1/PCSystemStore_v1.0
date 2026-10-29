"""Read-only research dashboard (run with ``make dashboard``).

Shows the audited record, the demand series of the development span and the internal-validation
results. The final-test span is sealed and is never loaded.
"""

from __future__ import annotations

from typing import Any

import altair as alt
import pandas as pd
import streamlit as st

from pcsforecast.paths import project_paths
from pcsforecast.reporting.dashboard_data import (
    DashboardData,
    channel_options,
    channel_volumes,
    friedman_summary,
    leaderboard,
    load_dashboard_data,
    monthly_counts,
    series_options,
    service_inventory,
    with_channel,
)

MODEL_LABELS = {
    "naive": "Ingenuo",
    "ses": "SES",
    "croston": "Croston",
    "sba": "SBA",
    "tsb": "TSB",
    "two_stage_trees": "Árboles en dos etapas",
    "global_gbm": "LightGBM global",
    "chronos_zero_shot": "Chronos (zero-shot)",
    "chronos_fine_tuned": "Chronos (ajuste ligero)",
}
LEVEL_LABELS = {"total": "Total", "category": "Categoría", "sku": "SKU"}
CHANNEL_LABELS = {
    "total": "Demanda total",
    "vecinos": "Vecinos",
    "facturado": "Facturado (comprobantes)",
    "total_dedup": "Total sin posibles duplicados",
}
FREQUENCY_LABELS = {"weekly": "Semanal", "monthly": "Mensual"}
PATTERN_LABELS = {
    "smooth": "Suave",
    "erratic": "Errática",
    "intermittent": "Intermitente",
    "lumpy": "Irregular (lumpy)",
    "no_demand": "Sin demanda",
}


FREQUENCIES = list(FREQUENCY_LABELS)
MONTH_AXIS = "month:N"
UNITS_AXIS = "units:Q"
LEVELS = list(LEVEL_LABELS)


def _frequency_label(value: str) -> str:
    return FREQUENCY_LABELS.get(value, value)


def _channel_label(value: str) -> str:
    return CHANNEL_LABELS.get(value, value)


def _channel(container: Any, frame: pd.DataFrame, label: str = "Canal") -> str:
    return str(container.selectbox(label, channel_options(frame), format_func=_channel_label))


def _level_label(value: str) -> str:
    return LEVEL_LABELS.get(value, value)


@st.cache_data(show_spinner=False)
def _load() -> DashboardData:
    return load_dashboard_data(project_paths())


def _summary(data: DashboardData) -> None:
    completeness = data.audit["completeness"]
    consistency = data.audit["consistency"]
    reconciliation = consistency["reconciliation"]
    cols = st.columns(4)
    cols[0].metric("Líneas válidas", f"{completeness['valid_lines']:,}")
    cols[1].metric("Unidades", f"{completeness['valid_units']:,}")
    cols[2].metric("SKU en catálogo", f"{len(data.skus):,}")
    cols[3].metric(
        "Bloques que cuadran con TOTAL",
        f"{reconciliation.get('match', 0)} / {consistency['blocks_total']}",
    )
    st.caption(
        f"Registro del {data.windows['record_start']} al {data.windows['record_end']}. "
        f"Tramo de prueba sellado: {data.windows['test_start']} a {data.windows['test_end']}."
    )
    counts = monthly_counts(data.audit)
    chart = (
        alt.Chart(counts)
        .mark_bar()
        .encode(
            x=alt.X(MONTH_AXIS, title="Mes"),
            y=alt.Y(UNITS_AXIS, title="Unidades"),
            tooltip=["month", "lines", "units"],
        )
    )
    st.subheader("Unidades por mes (canal vecinos)")
    st.altair_chart(chart, width="stretch")
    volumes = channel_volumes(data.panel)
    if set(volumes["channel"]) == {"vecinos", "facturado"}:
        by_channel = (
            alt.Chart(volumes.assign(channel=volumes["channel"].map(_channel_label)))
            .mark_bar()
            .encode(
                x=alt.X("yearmonth(period_start):O", title="Mes"),
                y=alt.Y(UNITS_AXIS, title="Unidades", stack=True),
                color=alt.Color("channel:N", title="Fuente"),
                tooltip=["period_start", "channel", "units"],
            )
        )
        st.subheader("Demanda total por fuente (tramo de desarrollo)")
        st.caption(
            "Enmienda v3: la serie principal suma el registro de vecinos y los comprobantes "
            "entregados. Quiebre por escasez de componentes: mayo de 2025."
        )
        st.altair_chart(by_channel, width="stretch")


def _quality(data: DashboardData) -> None:
    st.subheader("Auditoría de calidad (ISO/IEC 25012)")
    for section, values in data.audit.items():
        if section == "source":
            continue
        with st.expander(section.replace("_", " ").capitalize()):
            st.json(values, expanded=False)


DOC_KIND_LABELS = {"factura": "Factura", "boleta": "Boleta"}


def _retail(data: DashboardData) -> None:
    retail = data.retail
    if retail is None:
        st.info("Aún no hay comprobantes auditados (pcs stage-receipts y pcs audit-receipts).")
        return
    completeness = retail.audit["completeness"]
    numbering = retail.audit["numbering"]
    cols = st.columns(4)
    cols[0].metric("Comprobantes válidos", f"{completeness['valid_receipts']:,}")
    cols[1].metric("Ítems", f"{completeness['item_lines']:,}")
    cols[2].metric("Unidades", f"{completeness['units']:,.0f}")
    cols[3].metric(
        "Comprobantes entregados / emitidos", f"{numbering['delivered_share_overall']:.0%}"
    )
    st.caption(
        f"Boletas y facturas del {completeness['first_issue_date']} al "
        f"{completeness['last_issue_date']}. Los clientes figuran solo como códigos; nombres, "
        "DNI/RUC y direcciones nunca salen de data/private."
    )
    monthly = retail.monthly.assign(kind=retail.monthly["doc_kind"].map(DOC_KIND_LABELS))
    units = (
        alt.Chart(monthly)
        .mark_bar()
        .encode(
            x=alt.X(MONTH_AXIS, title="Mes de emisión"),
            y=alt.Y(UNITS_AXIS, title="Unidades"),
            color=alt.Color("kind:N", title="Comprobante"),
            tooltip=[
                "month",
                "kind",
                "receipts",
                "units",
                alt.Tooltip("net_sales:Q", format=",.2f"),
            ],
        )
    )
    st.subheader("Unidades por mes (canal facturado)")
    st.altair_chart(units, width="stretch")
    coverage = retail.coverage.assign(kind=retail.coverage["doc_kind"].map(DOC_KIND_LABELS))
    share = (
        alt.Chart(coverage)
        .mark_line(point=True)
        .encode(
            x=alt.X(MONTH_AXIS, title="Mes de emisión"),
            y=alt.Y("delivered_share:Q", title="Entregados / emitidos", axis=alt.Axis(format="%")),
            color=alt.Color("kind:N", title="Comprobante"),
            tooltip=["month", "kind", "delivered", "missing_within_month"],
        )
    )
    st.subheader("Cobertura según la numeración de cada serie")
    st.caption(
        "Números de serie que faltan entre dos comprobantes entregados del mismo mes. "
        "No se imputan: miden qué parte del canal cubren los archivos entregados."
    )
    st.altair_chart(share, width="stretch")
    with st.expander("Auditoría de comprobantes (ISO/IEC 25012)"):
        st.json(retail.audit, expanded=False)


def _series(data: DashboardData) -> None:
    left, middle, right = st.columns(3)
    frequency = str(left.selectbox("Frecuencia", FREQUENCIES, format_func=_frequency_label))
    level = str(middle.selectbox("Nivel", LEVELS, format_func=_level_label))
    profiles = with_channel(data.profile)
    channel = _channel(st, profiles)
    options = series_options(profiles, frequency, level, channel)
    labels = dict(zip(data.skus["sku_id"], data.skus["sku_name"], strict=True))
    labels.update(data.category_labels)
    labels["ALL"] = "Total"
    key = str(right.selectbox("Serie", options, format_func=lambda k: labels.get(str(k), str(k))))
    match = profiles[
        (profiles["frequency"] == frequency)
        & (profiles["channel"] == channel)
        & (profiles["level"] == level)
        & (profiles["key"] == key)
    ]
    series_id = str(match["series_id"].iloc[0])
    rows = data.panel[data.panel["series_id"] == series_id]
    chart = (
        alt.Chart(rows)
        .mark_line(point=True)
        .encode(
            x=alt.X("period_start:T", title="Periodo"),
            y=alt.Y(UNITS_AXIS, title="Unidades"),
            tooltip=["period_start", "units", "recorded_days"],
        )
    )
    st.altair_chart(chart, width="stretch")
    profile = data.profile.set_index("series_id").loc[series_id]
    cols = st.columns(4)
    cols[0].metric("Patrón", PATTERN_LABELS.get(str(profile["pattern"]), str(profile["pattern"])))
    cols[1].metric("ADI", "—" if pd.isna(profile["adi"]) else f"{profile['adi']:.2f}")
    cols[2].metric("CV²", "—" if pd.isna(profile["cv2"]) else f"{profile['cv2']:.2f}")
    cols[3].metric("Periodos sin venta", f"{profile['zero_share']:.0%}")
    st.caption("Solo se muestra el tramo de desarrollo; el tramo de prueba permanece sellado.")


def _patterns(data: DashboardData) -> None:
    frequency = str(
        st.radio("Frecuencia", FREQUENCIES, format_func=_frequency_label, horizontal=True)
    )
    profiles = with_channel(data.profile)
    channel = _channel(st, profiles, "Canal ")
    selected = profiles[
        (profiles["frequency"] == frequency)
        & (profiles["channel"] == channel)
        & profiles["selected"]
    ]
    counts = selected.groupby(["level", "pattern"]).size().rename("series").reset_index()
    counts["level"] = counts["level"].map(LEVEL_LABELS)
    counts["pattern"] = counts["pattern"].map(PATTERN_LABELS)
    st.dataframe(
        counts.pivot_table(index="level", columns="pattern", values="series", fill_value=0)
    )
    scatter = (
        alt.Chart(selected.dropna(subset=["adi", "cv2"]))
        .mark_circle(opacity=0.6)
        .encode(
            x=alt.X("adi:Q", title="ADI", scale=alt.Scale(type="log")),
            y=alt.Y("cv2:Q", title="CV²"),
            color=alt.Color("level:N", title="Nivel"),
            tooltip=["key", "units", "pattern"],
        )
    )
    st.subheader("Clasificación ADI-CV² (Syntetos-Boylan)")
    st.altair_chart(scatter, width="stretch")


def _validation(data: DashboardData) -> None:
    if not data.runs:
        st.info("Aún no hay corridas de validación. Ejecute `pcs run-validation`.")
        return
    left, right = st.columns(2)
    frequency = str(left.selectbox("Frecuencia ", list(data.runs), format_func=_frequency_label))
    run = data.runs[frequency]
    horizon = int(right.selectbox("Horizonte", run.record["horizons"]))
    metrics = with_channel(run.metrics)
    channel = _channel(st, metrics, "Canal  ")
    table = leaderboard(metrics[metrics["channel"] == channel], horizon)
    table["level"] = table["level"].map(LEVEL_LABELS)
    table["model"] = table["model"].map(lambda m: MODEL_LABELS.get(m, m))
    st.subheader("Validación interna con origen móvil")
    st.caption(
        f"Corrida {run.run_id}: {run.record['series']} series, {run.record['origins']} orígenes, "
        f"ventana {run.record['window']['primary']} de {run.record['window']['length']} periodos. "
        "Resultados del tramo de desarrollo; no son resultados de la prueba final."
    )
    st.dataframe(
        table.rename(
            columns={
                "level": "Nivel",
                "model": "Modelo",
                "series": "Series",
                "median_mase": "MASE (mediana)",
                "median_rmsse": "RMSSE (mediana)",
                "mean_bias": "Sesgo medio",
                "mean_rank": "Rango medio",
                "share_beats_naive": "Supera al ingenuo",
            }
        ),
        hide_index=True,
    )
    pending = run.record.get("not_implemented", [])
    if pending:
        st.caption("Familias aún no implementadas: " + ", ".join(pending))


def _inventory(data: DashboardData) -> None:
    if not data.inventory:
        st.info("Aún no hay simulaciones de inventario. Ejecute `pcs simulate`.")
        return
    first, second, third = st.columns(3)
    frequency = str(
        first.selectbox("Frecuencia  ", list(data.inventory), format_func=_frequency_label)
    )
    run = data.inventory[frequency]
    scenarios = run.record["scenarios"]
    lead_times = sorted({int(s["lead_time"]) for s in scenarios})
    targets = sorted({float(s["target"]) for s in scenarios})
    lead_time = int(second.selectbox("Plazo de entrega (periodos)", lead_times))
    target = float(
        third.selectbox(
            "Meta de fill rate", targets, index=targets.index(0.95), format_func="{:.0%}".format
        )
    )
    simulation = with_channel(run.simulation)
    channel = _channel(st, simulation, "Canal   ")
    table = service_inventory(simulation[simulation["channel"] == channel], lead_time, target)
    st.subheader("Servicio frente a inventario - política (R, S) común")
    st.caption(
        f"Simulación {run.run_id}. El stock de seguridad se calibra en la primera mitad de "
        "los orígenes de desarrollo y se evalúa, fijo, en la segunda mitad. "
        "La prueba final sigue sellada. Las ventas perdidas se valorizan al precio conocido en "
        "cada origen; la columna con precio de lista completa con la lista de distribución las "
        "unidades sin precio (solo SKU enlazados)."
    )
    chart_data = table.assign(
        level=table["level"].map(LEVEL_LABELS),
        model=table["model"].map(lambda m: MODEL_LABELS.get(m, m)),
    )
    chart = (
        alt.Chart(chart_data)
        .mark_point(filled=True, size=120)
        .encode(
            x=alt.X("mean_on_hand:Q", title="Inventario promedio (unidades por serie)"),
            y=alt.Y("fill_rate:Q", title="Fill rate agregado", axis=alt.Axis(format="%")),
            color=alt.Color("model:N", title="Modelo"),
            tooltip=["level", "model", "fill_rate", "mean_on_hand", "lost_units"],
        )
        .properties(width=220, height=260)
        .facet(column=alt.Column("level:N", title=None))
        .resolve_scale(x="independent", y="independent")
    )
    st.altair_chart(chart, width="stretch")
    st.dataframe(
        chart_data.rename(
            columns={
                "level": "Nivel",
                "model": "Modelo",
                "series": "Series",
                "demand": "Demanda",
                "served": "Atendida",
                "lost_units": "Ventas perdidas (u)",
                "lost_value": "Ventas perdidas (S/)",
                "lost_value_list_fill": "Ventas perdidas (S/, con precio de lista)",
                "mean_on_hand": "Inventario promedio",
                "mean_safety_stock": "Stock de seguridad promedio",
                "target_reached": "Meta alcanzada en calibración",
                "median_multiplier": "Multiplicador (mediana)",
                "fill_rate": "Fill rate",
            }
        ),
        hide_index=True,
    )


P_VALUE = "Valor p"
FRIEDMAN_CHI2 = "Chi² de Friedman"
STAT_FORMATS = {
    P_VALUE: st.column_config.NumberColumn(format="%.2e"),
    FRIEDMAN_CHI2: st.column_config.NumberColumn(format="%.1f"),
    "Diferencia crítica (Nemenyi)": st.column_config.NumberColumn(format="%.2f"),
    "Estadístico mediano": st.column_config.NumberColumn(format="%.2f"),
    "Rho de Spearman": st.column_config.NumberColumn(format="%.3f"),
    "IC 95 % inferior": st.column_config.NumberColumn(format="%.3f"),
    "IC 95 % superior": st.column_config.NumberColumn(format="%.3f"),
}


def _statistics(data: DashboardData) -> None:
    if not data.stats:
        st.info("Aún no hay comparación estadística. Ejecute `pcs run-stats`.")
        return
    left, right = st.columns(2)
    frequency = str(left.selectbox("Frecuencia   ", list(data.stats), format_func=_frequency_label))
    run = data.stats[frequency]
    tables = run.tables
    channel = _channel(right, tables["he1_friedman"], "Canal    ")
    st.caption(
        f"Comparación {run.run_id} sobre la validación interna (tramo de desarrollo), nivel de "
        f"significancia {run.record['alpha']}. No son resultados de la prueba final, que sigue "
        "sellada; la misma rutina se aplicará una sola vez tras el congelamiento."
    )
    st.subheader("HE1 - Exactitud: Friedman y Nemenyi sobre el MASE")
    summary = friedman_summary(tables["he1_friedman"], channel)
    for column in ("best_model", "worst_model"):
        summary[column] = summary[column].map(lambda m: MODEL_LABELS.get(m, m))
    summary["level"] = summary["level"].map(LEVEL_LABELS)
    st.dataframe(
        summary.rename(
            columns={
                "level": "Nivel",
                "horizon": "Horizonte",
                "series": "Series",
                "statistic": FRIEDMAN_CHI2,
                "p_value": P_VALUE,
                "critical_difference": "Diferencia crítica (Nemenyi)",
                "best_model": "Mejor rango medio",
                "worst_model": "Peor rango medio",
            }
        ),
        hide_index=True,
        column_config=STAT_FORMATS,
    )
    dm = tables["he1_diebold_mariano"]
    dm = dm[dm["channel"] == channel].assign(
        model_a=lambda f: f["model_a"].map(lambda m: MODEL_LABELS.get(m, m)),
        model_b=lambda f: f["model_b"].map(lambda m: MODEL_LABELS.get(m, m)),
    )
    st.subheader("HE1 - Diebold-Mariano por serie (pares predefinidos, Holm)")
    st.dataframe(
        dm.drop(columns=["channel"]).rename(
            columns={
                "horizon": "Horizonte",
                "model_a": "Modelo A",
                "model_b": "Modelo B",
                "series_tested": "Series",
                "a_better": "A mejor",
                "b_better": "B mejor",
                "median_statistic": "Estadístico mediano",
            }
        ),
        hide_index=True,
        column_config=STAT_FORMATS,
    )
    st.subheader("HE2 - Concordancia entre ranking por MASE y por fill rate (Spearman)")
    spearman = tables["he2_spearman"]
    spearman = spearman[spearman["channel"] == channel].assign(
        level=lambda f: f["level"].map(LEVEL_LABELS)
    )
    st.dataframe(
        spearman[["level", "rho", "ci_low", "ci_high", "models", "below_threshold"]].rename(
            columns={
                "level": "Nivel",
                "rho": "Rho de Spearman",
                "ci_low": "IC 95 % inferior",
                "ci_high": "IC 95 % superior",
                "models": "Modelos",
                "below_threshold": "Rho < 0,5 (H1 de HE2)",
            }
        ),
        hide_index=True,
        column_config=STAT_FORMATS,
    )
    robustness = tables.get("he3_robustness", pd.DataFrame())
    if not robustness.empty:
        st.subheader("HE3 - Robustez: cambio del MASE tras el quiebre y con historial truncado")
        shown = robustness[robustness["channel"] == channel].assign(
            level=lambda f: f["level"].map(LEVEL_LABELS),
            condition=lambda f: f["condition"].map(
                {"break": "Tras el quiebre (mayo 2025)", "truncated": "Historial truncado"}
            ),
        )
        st.dataframe(
            shown[["condition", "level", "horizon", "series", "statistic", "p_value"]].rename(
                columns={
                    "condition": "Condición",
                    "level": "Nivel",
                    "horizon": "Horizonte",
                    "series": "Series",
                    "statistic": FRIEDMAN_CHI2,
                    "p_value": P_VALUE,
                }
            ),
            hide_index=True,
            column_config=STAT_FORMATS,
        )


def main() -> None:
    st.set_page_config(page_title="Sistema comparativo de pronóstico", layout="wide")
    st.title("Sistema comparativo de pronóstico de demanda — PCSystemStore")
    data = _load()
    tabs = st.tabs(
        [
            "Resumen",
            "Calidad de datos",
            "Canal facturado",
            "Series",
            "Patrones de demanda",
            "Modelos",
            "Inventario",
            "Estadística",
        ]
    )
    views = [_summary, _quality, _retail, _series, _patterns, _validation, _inventory, _statistics]
    for tab, view in zip(tabs, views, strict=True):
        with tab:
            view(data)


main()
