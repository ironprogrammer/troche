#!/usr/bin/env bash
#
# Build troche.zip and verify it installs and activates cleanly on a fresh
# WordPress — the same path as uploading the zip in wp-admin. Uses WordPress
# Playground (real WP on SQLite, no Docker). Requires Node 20+.
#
#   npm run test:zip     # or: bash tests/zip-install.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Node 20+ required (found $(node -v 2>/dev/null || echo none)). Try: nvm use 20" >&2
  exit 1
fi

cd "$ROOT"

echo "==> Building troche.zip"
npm run build:wp
( cd wp-plugin && rm -f troche.zip && npx --yes @wordpress/scripts plugin-zip )

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
cp wp-plugin/troche.zip "$WORK/troche.zip"
cp "$ROOT/tests/zip-install.php" "$WORK/checks.php"
cat > "$WORK/blueprint.json" <<'JSON'
{
  "$schema": "https://playground.wordpress.net/blueprint-schema.json",
  "steps": [
    { "step": "setSiteOptions", "options": { "permalink_structure": "/%postname%/" } },
    { "step": "installPlugin", "pluginData": { "resource": "vfs", "path": "/work/troche.zip" } },
    { "step": "runPHP", "code": "<?php require '/work/checks.php';" }
  ]
}
JSON

echo "==> Installing the zip into a fresh WordPress (Playground)"
npx --yes @wp-playground/cli@latest run-blueprint \
  --blueprint="$WORK/blueprint.json" --mount="$WORK:/work" >/dev/null 2>&1 || true

echo
if [ ! -f "$WORK/result.txt" ]; then
  echo "No results written — the install step did not complete." >&2
  exit 1
fi
cat "$WORK/result.txt"
if grep -q '^FAIL' "$WORK/result.txt"; then
  echo "ZIP INSTALL TEST: FAILED"
  exit 1
fi
# A PHP fatal mid-run writes no FAIL line, it just stops appending. Require the
# summary line the harness writes last, so a truncated run can't read as a pass.
if ! grep -q '^=== .* passed, .* failed ===$' "$WORK/result.txt"; then
  echo "ZIP INSTALL TEST: FAILED (run ended early — no summary line)"
  exit 1
fi
echo "ZIP INSTALL TEST: PASSED"
