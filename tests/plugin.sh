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
cat > "$WORK/blueprint.json" <<'JSON'
{
  "$schema": "https://playground.wordpress.net/blueprint-schema.json",
  "steps": [
    { "step": "activatePlugin", "pluginPath": "troche/troche.php" },
    { "step": "runPHP", "code": "<?php require '/work/checks.php';" }
  ]
}
JSON

echo "==> Running plugin harness (Playground)"
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
echo "PLUGIN HARNESS: PASSED"
