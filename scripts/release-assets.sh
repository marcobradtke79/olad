#!/usr/bin/env sh
# Collects the release assets into release/ and writes SHA256SUMS next to them:
#   ol-cad-<version>.tgz (from pnpm pack), ol-cad.umd.js, ol-cad.umd.js.map, ui.css (from dist/).
# Run after `pnpm build && pnpm pack`; the release workflow runs it before attesting and uploading.
# Verify a download later with `shasum -a 256 -c SHA256SUMS` in the folder that holds the files.

set -eu

cd "$(dirname "$0")/.."

version=$(node -p "require('./package.json').version")
tgz="ol-cad-$version.tgz"
for file in "$tgz" dist/ol-cad.umd.js dist/ol-cad.umd.js.map dist/ui.css; do
  if [ ! -f "$file" ]; then
    echo "missing $file: run pnpm build && pnpm pack first" >&2
    exit 1
  fi
done

rm -rf release
mkdir release
cp "$tgz" dist/ol-cad.umd.js dist/ol-cad.umd.js.map dist/ui.css release/
(cd release && shasum -a 256 "$tgz" ol-cad.umd.js ol-cad.umd.js.map ui.css > SHA256SUMS)

echo "release/"
cat release/SHA256SUMS
