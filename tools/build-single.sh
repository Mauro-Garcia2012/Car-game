#!/usr/bin/env bash
# Packs the whole game into one self-contained HTML file that runs from
# file:// — no server, no import map, no vendor folder. Handy for sending
# somebody a build they can just double-click.
#
#   ./tools/build-single.sh [output.html]
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${1:-dist/desert-run.html}"
mkdir -p "$(dirname "$OUT")"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# three.js is aliased straight to the vendored copy, so esbuild needs no
# import map and the bundle ends up with no imports left to resolve.
npx --yes esbuild@0.24.0 src/main.js --bundle --format=iife --minify \
  --alias:three=./vendor/three/three.module.min.js \
  --outfile="$TMP/bundle.js"

python3 - "$TMP/bundle.js" "$OUT" <<'PY'
import io, os, re, sys
bundle, out = sys.argv[1], sys.argv[2]
html = io.open('index.html', encoding='utf-8').read()
css = io.open('styles.css', encoding='utf-8').read()
js = io.open(bundle, encoding='utf-8').read()

# A stray closing tag in the payload would end the block early.
for name, text in (('styles.css', css), ('the bundle', js)):
    assert '</script' not in text and '</style' not in text, f'closing tag inside {name}'

html = html.replace('<link rel="stylesheet" href="./styles.css" />',
                    '<style>\n' + css + '\n    </style>', 1)
html = re.sub(r'\s*<script type="importmap">.*?</script>', '', html, flags=re.S)
tag = '<script type="module" src="./src/main.js"></script>'
assert tag in html, 'index.html no longer loads src/main.js the expected way'
html = html.replace(tag, '<script>\n' + js + '\n</script>', 1)

io.open(out, 'w', encoding='utf-8').write(html)
print(f'{out}  {os.path.getsize(out) / 1024:.0f} KB')
PY
