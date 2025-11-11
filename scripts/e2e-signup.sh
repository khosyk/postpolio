#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:4000}"

echo "[E2E] Base URL: $BASE_URL"

if [[ -z "${SUPABASE_URL:-}" || -z "${SUPABASE_SERVICE_KEY:-}" ]]; then
  echo "[E2E] Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment."
  echo "[E2E] Please set them in server/.env and run the server before executing this script."
  exit 1
fi

wait_for_server() {
  local url="$1"
  local retries=20
  local sleep_s=0.5
  for i in $(seq 1 $retries); do
    if curl -s -o /dev/null "$url"; then
      return 0
    fi
    sleep "$sleep_s"
  done
  return 1
}

echo "[E2E] Checking server availability..."
if ! wait_for_server "$BASE_URL/"; then
  echo "[E2E] Server is not responding at $BASE_URL"
  exit 1
fi

random_suffix="$(date +%s)$RANDOM"
valid_email="user_${random_suffix}@example.com"
short_pwd="short1!"
strong_pwd="Aa1!testpass"

echo "[E2E] 1) Invalid email format should fail (400)"
resp1=$(curl -s -X POST "$BASE_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"bad\",\"password\":\"$strong_pwd\"}")
echo "$resp1" | grep -q '"success":false' && echo "  -> OK" || (echo "  -> FAIL"; exit 1)

echo "[E2E] 2) Short password should fail (400)"
resp2=$(curl -s -X POST "$BASE_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$valid_email\",\"password\":\"$short_pwd\"}")
echo "$resp2" | grep -q '"success":false' && echo "  -> OK" || (echo "  -> FAIL"; exit 1)

echo "[E2E] 3) Valid signup should succeed (201)"
resp3=$(curl -s -X POST "$BASE_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$valid_email\",\"password\":\"$strong_pwd\"}")
echo "$resp3" | grep -q '"success":true' && echo "  -> OK" || (echo "  -> FAIL"; echo "$resp3"; exit 1)

echo "[E2E] 4) Duplicate email should fail (409)"
resp4=$(curl -s -X POST "$BASE_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$valid_email\",\"password\":\"$strong_pwd\"}")
echo "$resp4" | grep -q '"success":false' && echo "  -> OK" || (echo "  -> FAIL"; exit 1)

echo "[E2E] All signup tests passed."


