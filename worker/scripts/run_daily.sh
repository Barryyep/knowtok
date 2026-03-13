#!/usr/bin/env bash
set -euo pipefail

HERE="$(cd "$(dirname "$0")/.." && pwd)"
cd "$HERE"

# Load environment variables from an external file if provided.
# Usage: KNOWTOK_ENV=/path/to/knowtok-worker.env ./scripts/run_daily.sh
if [ -n "${KNOWTOK_ENV:-}" ] && [ -f "$KNOWTOK_ENV" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$KNOWTOK_ENV"
  set +a
fi

if [ ! -d ".venv" ]; then
  echo "Missing .venv. Create it with: python3.11 -m venv .venv && . .venv/bin/activate && pip install -e '.[dev]'" >&2
  exit 2
fi

. .venv/bin/activate

python scripts/run_pipeline.py "$@"
