#!/bin/bash
# Builds the game from source/game/ into source/out/:
#   havoc-city.html  the page as published on claude.ai (no debug hooks)
#   dbg.html         the same plus window.__havoc debug hooks, used by the tests
# With TEST_DIR=<folder> it also writes <folder>/index.html, the debug build as a full page for the test scripts.
set -e
cd "$(dirname "$0")"
FILES="00-head.html 10-core.js 12-look.js 13-sounds.js 20-cars.js 30-world.js 35-perth.js 36-nyc.js 37-base.js 37t-testzone.js 40-vehicles.js 50-peds.js
  55-hero.js 57-weapons.js 58-shops.js 59-boom.js 60-game.js 61-destruct.js 62-air.js 62b-airport.js 63-bigmap.js 64-net.js 65-peer.js
  66-stores.js 67-dealer.js 68-extras.js 68c-construct.js 68m-military.js 68s-school.js 69-gfx.js 70-missions.js"
mkdir -p out
b() { (cd game && cat $FILES $1 99-boot.js) > "$2" && printf '\n})();\n</script>\n' >> "$2"; }
b "" out/havoc-city.html
b 98-debug.js out/dbg.html
sed -n '/<script>/,/<\/script>/p' out/havoc-city.html | sed '1d;$d' > out/check.js && node --check out/check.js && echo SYNTAX_OK
echo "debug refs in release: $(grep -c '__havoc' out/havoc-city.html || true)"
if [ -n "$TEST_DIR" ]; then
  mkdir -p "$TEST_DIR"
  { printf '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0}[hidden]{display:none!important}</style></head><body>'; cat out/dbg.html; printf '</body></html>'; } > "$TEST_DIR/index.html"
  cp out/dbg.html "$TEST_DIR/dbg.html"
fi
