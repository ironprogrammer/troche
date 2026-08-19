#!/usr/bin/env bash
#
# Run the plugin-logic harness (post type, REST CRUD, auth gates, revisions)
# against the plugin source in a fresh WordPress via WordPress Playground.
# Requires Node 20+.
#
#   npm run test:plugin     # or: bash tests/plugin.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Node 20+ required (found $(node -v 2>/dev/null || echo none)). Try: nvm use 20" >&2
  exit 1
fi

cd "$ROOT"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
cp "$ROOT/tests/plugin.php" "$WORK/checks.php"
# Set in the blueprint, not via the CLI's --wp flag, which v1 blueprints ignore.
WP_VERSION="${TROCHE_WP:-latest}"
PHP_VERSION="${TROCHE_PHP:-8.5}"

cat > "$WORK/blueprint.json" <<JSON
{
  "\$schema": "https://playground.wordpress.net/blueprint-schema.json",
  "preferredVersions": { "wp": "$WP_VERSION", "php": "$PHP_VERSION" },
  "steps": [
    { "step": "activatePlugin", "pluginPath": "troche/troche.php" },
    { "step": "runPHP", "code": "<?php require '/work/checks.php';" }
  ]
}
JSON

echo "==> Running plugin harness (Playground, WordPress $WP_VERSION, PHP $PHP_VERSION)"
npx --yes @wp-playground/cli@latest run-blueprint \
  --blueprint="$WORK/blueprint.json" \
  --mount="$ROOT/wp-plugin:/wordpress/wp-content/plugins/troche" \
  --mount="$WORK:/work" >/dev/null 2>&1 || true

echo
if [ ! -f "$WORK/result.txt" ]; then
  echo "No results written — the harness did not complete." >&2
  exit 1
fi
cat "$WORK/result.txt"
if grep -q '^FAIL' "$WORK/result.txt"; then
  echo "PLUGIN HARNESS: FAILED"
  exit 1
fi
# A PHP fatal mid-run writes no FAIL line, it just stops appending. Require the
# summary line the harness writes last, so a truncated run can't read as a pass.
if ! grep -q '^=== .* passed, .* failed ===$' "$WORK/result.txt"; then
  echo "PLUGIN HARNESS: FAILED (run ended early — no summary line)"
  exit 1
fi
echo "PLUGIN HARNESS: PASSED"
