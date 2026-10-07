#!/usr/bin/env bash
# Usage: ./scripts/check-compiler.sh [out-dir]   (default out-dir: /tmp/angular-articles-11)
set -euo pipefail

folder="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
repo="$(cd "$folder/.." && pwd)"
out_dir="${1:-/tmp/angular-articles-11}"
configs=(
  default
  strict
  loose
  ng-new-no-strict
  strict-templates-only
  signal-warning
  signal-error
  fixed
)

strip_colors() {
  perl -pe 's/\e\[[0-9;]*m//g'
}

mkdir -p "$out_dir"
cd "$repo"

for config in "${configs[@]}"; do
  echo "=== ngc -p cases/tsconfig.$config.json"
  status=0
  corepack pnpm exec ngc -p "$folder/cases/tsconfig.$config.json" > "$out_dir/ngc.log" 2>&1 || status=$?
  strip_colors < "$out_dir/ngc.log" | grep -E ' - (error|warning) ' || true
  echo "exit $status"
  echo
done

for aot in true false; do
  echo "=== ng build lost-in-the-merge --aot=$aot (cases/broken, strictTemplates: true)"
  status=0
  corepack pnpm exec ng build lost-in-the-merge \
    --aot="$aot" \
    --browser="11-lost-in-the-merge/cases/broken/main.ts" \
    --ts-config="11-lost-in-the-merge/cases/tsconfig.build.json" \
    --output-path="$out_dir/dist-aot-$aot" > "$out_dir/build.log" 2>&1 || status=$?
  strip_colors < "$out_dir/build.log" | grep -E '\[(ERROR|WARNING)\]|bundle generation' || true
  echo "exit $status"
  echo
done
