# Havoc City source

The game is plain JavaScript and three.js (r128), split into numbered files in `game/` that are joined into one HTML page.

## Layout

| Path | What it is |
| --- | --- |
| `game/00-head.html` | Page markup and CSS (menu, HUD, garage, settings, map) |
| `game/10-core.js` ... `game/70-missions.js` | The game, in load order (see `build.sh` for the exact order) |
| `game/13-sounds.js` | The 51 sound effects as embedded MP3s, with loop points, loudness trims and credits |
| `game/98-debug.js` | Debug hooks (`window.__havoc`), only in the test build |
| `game/99-boot.js` | Start-up |
| `build.sh` | Builds `out/havoc-city.html` (the claude.ai page) and `out/dbg.html` (with debug hooks) |
| `release.py` | Makes the published files at the top of the repo: `Havoc-City.html`, `index.html`, `sw.js`, `manifest.webmanifest`, `version.json` |
| `tests/` | Playwright test scripts (`run*.js`), one per feature, plus mock multiplayer rooms |
| `tools/` | Scripts used to find, cut and encode the sounds (`mksnd.py`) and draw the app icon (`mkicon.py`) |
| `macapp/` | The Mac app: an Electron window that loads the website, with the game built in as an offline fallback |

## Build

```bash
./build.sh
```

```bash
python3 release.py 25
```

`build.sh` checks the JavaScript compiles (`SYNTAX_OK`) and that no debug hooks leaked into the release build. `release.py` takes the version number.

## Tests

The tests drive the game in headless Chromium with Playwright. Each takes a folder that holds `test/index.html` (the debug build) and `vendor/package/build/three.min.js` (three.js r128, the same file as `../vendor/three.min.js`):

```bash
TEST_DIR=/path/to/work/test ./build.sh
```

```bash
node tests/run61.js /path/to/work
```

`run61.js` loads every map. `run72.js` checks two players over a mock multiplayer room that enforces the real size and JSON limits. Older `run*.js` files test features that have changed since, so not all of them still pass.

## Mac app

```bash
cd macapp/build && npm install && node pack.js
```

This makes Apple Silicon and Intel builds in `macapp/dist/`. They are not signed with an Apple Developer ID, so the first launch needs System Settings > Privacy & Security > Open Anyway (see `macapp/Read me first.txt`).
