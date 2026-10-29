"""Every HTTP test runs on a synthetic store: data/ and outputs/ are never in the repository."""

import os
import tempfile
from pathlib import Path

import pytest

from pcsforecast.service.synthetic import write_synthetic_project

TEST_INTERNAL_API_KEY = "test-internal-api-key"

# Set before main.py and core.config are imported by the test modules.
_SYNTHETIC_ROOT = Path(tempfile.mkdtemp(prefix="pcs-synthetic-"))
write_synthetic_project(_SYNTHETIC_ROOT)
os.environ["PCS_PROJECT_ROOT"] = str(_SYNTHETIC_ROOT)
os.environ.pop("PCS_SERVICE_SERIES", None)
os.environ["FORECAST_WARM_UP"] = "false"
os.environ["ENVIRONMENT"] = "test"
os.environ["INTERNAL_API_KEY"] = TEST_INTERNAL_API_KEY


@pytest.fixture(autouse=True, scope="session")
def statistical_model():
    """SES on every host, also where PyTorch and Chronos are installed (no weights in CI)."""
    from pcsforecast.service import router
    from pcsforecast.service.forecast import StatisticalQuantiles

    with pytest.MonkeyPatch.context() as patch:
        patch.setattr(router, "default_model", lambda _models_cache: StatisticalQuantiles())
        router._build_engine.cache_clear()
        router._paths.cache_clear()
        yield
        router._build_engine.cache_clear()
        router._paths.cache_clear()
