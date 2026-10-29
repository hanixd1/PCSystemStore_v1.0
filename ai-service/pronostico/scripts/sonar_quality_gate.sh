#!/usr/bin/env bash
# Create (or recreate) the project quality gate defined in docs/quality/quality_plan.md
# and assign it to the pcsforecast project. Conditions apply to overall code, so the gate
# holds from the first analysis instead of only on "new code".
# Needs a token with "Administer Quality Gates" (a User token); the Global Analysis token in
# SONAR_TOKEN cannot change gates.
set -euo pipefail

: "${SONAR_ADMIN_TOKEN:?set SONAR_ADMIN_TOKEN to a SonarQube User token (see .env.example)}"
HOST="${SONAR_LOCAL_URL:-http://localhost:9000}"
GATE="pcsforecast-gate"
PROJECT="pcsforecast"

api() { curl -sf -u "${SONAR_ADMIN_TOKEN}:" -X POST "${HOST}/api/$1" "${@:2}"; }

api qualitygates/destroy --data-urlencode "name=${GATE}" >/dev/null 2>&1 || true
api qualitygates/create --data-urlencode "name=${GATE}" >/dev/null

add() {  # metric operator threshold
  api qualitygates/create_condition --data-urlencode "gateName=${GATE}" \
    -d "metric=$1" -d "op=$2" -d "error=$3" >/dev/null
}
add coverage                   LT 80
add duplicated_lines_density   GT 3
add reliability_rating         GT 1
add security_rating            GT 1
add sqale_rating               GT 1
add security_hotspots_reviewed LT 100
add new_violations             GT 0

api qualitygates/select --data-urlencode "gateName=${GATE}" -d "projectKey=${PROJECT}" >/dev/null
echo "Quality gate '${GATE}' assigned to ${PROJECT}"
