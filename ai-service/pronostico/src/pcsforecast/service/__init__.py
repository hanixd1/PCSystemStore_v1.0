"""Production layer (F11): monthly forecasts of the frozen models for the store's web page.

The research pipeline stays untouched. This layer only reads its outputs (series panels, run
records) and serves recurring forecasts through the ai-service:

- ``data``: monthly demand histories of the total channel (development + opened test span).
- ``forecast``: quantile forecasts for a target month and sale probabilities.
- ``research``: summary of the thesis results (final test) for the admin dashboard.
- ``fit``: light fine-tuning of Chronos on the full history (``pcs service-fit``).
- ``web_sales``: PAID web-store orders (backend export) added to the served panel.
- ``precomputed``: Chronos quantiles computed offline, served without PyTorch.
- ``bundle``: series and final-test tables for a deployment without ``data/`` (private volume).
- ``router``: FastAPI routes mounted by the ai-service under ``/forecast``.
"""
