#!/usr/bin/env bash
# Invoke a production cron endpoint with redirect follow-through and strict validation.
set -euo pipefail

ENDPOINT_NAME="${1:?endpoint name required}"
PATH_SUFFIX="${2:?path required}"
METHOD="${3:-POST}"
BODY="${4:-}"
MAX_TIME="${5:-120}"

if [ -z "${APP_URL:-}" ] || [ -z "${CRON_SECRET:-}" ]; then
  echo "Set GitHub secrets: PRODUCTION_URL, CRON_SECRET"
  exit 1
fi

INITIAL_URL="${APP_URL%/}${PATH_SUFFIX}"
BODY_FILE="$(mktemp)"
trap 'rm -f "$BODY_FILE"' EXIT

CURL_ARGS=(
  -sS
  -L
  -X "$METHOD"
  "$INITIAL_URL"
  -H "Authorization: Bearer ${CRON_SECRET}"
  -o "$BODY_FILE"
  -w "http_code=%{http_code}\nurl_effective=%{url_effective}\nnum_redirects=%{num_redirects}\n"
  --max-time "$MAX_TIME"
)

if [ -n "$BODY" ]; then
  CURL_ARGS+=(-H "Content-Type: application/json" -d "$BODY")
fi

echo "=== [${ENDPOINT_NAME}] request ==="
echo "initial_url=${INITIAL_URL}"
echo "method=${METHOD}"

if ! META="$(curl "${CURL_ARGS[@]}")"; then
  echo "FAIL: curl transport error for ${ENDPOINT_NAME}"
  exit 1
fi

HTTP_CODE="$(printf '%s\n' "$META" | sed -n 's/^http_code=//p')"
URL_EFFECTIVE="$(printf '%s\n' "$META" | sed -n 's/^url_effective=//p')"
NUM_REDIRECTS="$(printf '%s\n' "$META" | sed -n 's/^num_redirects=//p')"
RESPONSE="$(cat "$BODY_FILE")"

echo "=== [${ENDPOINT_NAME}] response meta ==="
echo "http_code=${HTTP_CODE}"
echo "url_effective=${URL_EFFECTIVE}"
echo "num_redirects=${NUM_REDIRECTS}"
echo "=== [${ENDPOINT_NAME}] response body ==="
echo "${RESPONSE}"

if printf '%s' "$RESPONSE" | grep -q 'Redirecting'; then
  echo "FAIL: response body contains redirect stub — API was not reached"
  exit 1
fi

if [ "$HTTP_CODE" != "200" ]; then
  echo "FAIL: expected HTTP 200, got ${HTTP_CODE}"
  exit 1
fi

if printf '%s' "$RESPONSE" | grep -qE '^[[:space:]]*\{'; then
  if command -v jq >/dev/null 2>&1; then
    OK="$(printf '%s' "$RESPONSE" | jq -r '.ok // empty' 2>/dev/null || true)"
    if [ "$OK" = "false" ]; then
      echo "FAIL: API returned ok=false"
      exit 1
    fi
  elif printf '%s' "$RESPONSE" | grep -qE '"ok"[[:space:]]*:[[:space:]]*false'; then
    echo "FAIL: API returned ok=false"
    exit 1
  fi
fi

echo "=== [${ENDPOINT_NAME}] OK ==="
