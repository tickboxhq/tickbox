#!/usr/bin/env bash
set -eu

# Bundle-size budgets for each published package's main entry.
# Numbers are bytes of the unminified ESM build (what tsup / nuxt-module-build
# emit to dist/). Generous headroom over current sizes — they're meant to catch
# regressions, not nag.
#
# Format: <file>:<budget-in-bytes>
# Update these when you intentionally make a package bigger.

budgets='
packages/core/dist/index.js:18000
packages/react/dist/index.js:5500
packages/vue/dist/index.js:6500
packages/nuxt/dist/module.mjs:2500
packages/nuxt/dist/runtime/plugin.js:2500
'

failed=0
printf '%-40s  %10s  %10s  %s\n' 'file' 'size' 'budget' 'status'
printf '%-40s  %10s  %10s  %s\n' '----' '----' '------' '------'

while IFS=: read -r file budget; do
  [ -z "$file" ] && continue
  if [ ! -f "$file" ]; then
    printf '%-40s  %10s  %10s  %s\n' "$file" '-' "$budget" 'MISSING'
    failed=1
    continue
  fi
  size=$(wc -c < "$file" | tr -d ' ')
  if [ "$size" -gt "$budget" ]; then
    status='FAIL'
    failed=1
  else
    status='ok'
  fi
  printf '%-40s  %10s  %10s  %s\n' "$file" "$size" "$budget" "$status"
done <<EOF
$budgets
EOF

if [ $failed -ne 0 ]; then
  echo
  echo 'Bundle size check failed. Either reduce the size or, if intentional,'
  echo 'bump the budget in scripts/check-bundle-sizes.sh.'
  exit 1
fi
