#!/usr/bin/env bash
set -eu

# Bumps the version in every package.json under packages/ and creates a
# matching git commit + tag. Push the tag to trigger the Release workflow.
#
# Usage:
#   ./scripts/bump-version.sh 0.0.2

if [ $# -lt 1 ]; then
  echo "Usage: $0 <new-version>"
  echo "Example: $0 0.0.2"
  exit 1
fi

new_version=$1

if [ -n "$(git status --porcelain)" ]; then
  echo "Working tree is dirty. Commit or stash first."
  exit 1
fi

for pkg_json in packages/*/package.json; do
  echo "Bumping $pkg_json -> $new_version"
  # Edit just the top-level "version" line. Avoids touching nested
  # workspace:* deps which pnpm handles at publish time.
  node -e "
    const fs = require('fs');
    const path = '$pkg_json';
    const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
    pkg.version = '$new_version';
    fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
  "
done

git add packages/*/package.json
git commit -m "Bump packages to $new_version"
git tag -a "v$new_version" -m "v$new_version"

echo
echo "Done. Commit and tag created locally:"
git log --oneline -1
echo
echo "Push to trigger the Release workflow:"
echo "  git push origin main && git push origin v$new_version"
