#!/usr/bin/env sh
# Starts the local test system: installs dependencies when missing, builds the
# library (the test page loads dist/ol-cad.umd.js) and runs the test server.
#
#   scripts/start-test-system.sh            # build + serve at http://localhost:8787/
#   scripts/start-test-system.sh --e2e      # build + run the Playwright suite instead
#   scripts/start-test-system.sh --check    # lint + typecheck + unit tests, then serve
#   PORT=9000 scripts/start-test-system.sh  # serve on another port
#
# Run it from anywhere; it changes to the repository root first.

set -eu

cd "$(dirname "$0")/.."

E2E=0
CHECK=0
for arg in "$@"; do
  case "$arg" in
    --e2e) E2E=1 ;;
    --check) CHECK=1 ;;
    -h | --help)
      sed -n '2,11p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 2
      ;;
  esac
done

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is required (npm install -g pnpm)." >&2
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "==> Installing dependencies"
  pnpm install
fi

if [ "$E2E" = 1 ] && [ ! -d "${HOME}/Library/Caches/ms-playwright" ] && [ ! -d "${HOME}/.cache/ms-playwright" ]; then
  echo "==> Installing the Playwright browser"
  pnpm exec playwright install chromium
fi

if [ "$CHECK" = 1 ]; then
  echo "==> Lint, typecheck, unit tests"
  pnpm lint
  pnpm typecheck
  pnpm test
fi

echo "==> Building dist/"
pnpm build

if [ "$E2E" = 1 ]; then
  echo "==> Running the Playwright suite"
  exec pnpm test:e2e
fi

echo "==> Starting the test server at http://localhost:${PORT:-8787}/ (Ctrl+C to stop)"
exec pnpm serve:test
