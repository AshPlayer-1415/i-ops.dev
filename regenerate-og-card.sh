#!/bin/sh
# Re-render og-card.png from og-card.html at exactly 1200x630.
#
# The card is rendered from a real page rather than drawn, so it uses the site's own fonts, palette
# and wording and cannot drift from them. Headless Chrome because the pane screenshot downsamples
# to fit, and a social card below 1200x630 is upscaled by every platform that shows it.
#
# Needs a local server on 4321:  python3 -m http.server 4321
set -eu
cd "$(dirname "$0")"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
TMP=$(mktemp -d)
"$CHROME" --headless --disable-gpu --no-first-run --no-default-browser-check \
  --user-data-dir="$TMP" --window-size=1200,630 --force-device-scale-factor=1 \
  --default-background-color=000000 --virtual-time-budget=6000 \
  --screenshot="$PWD/og-card.png" "http://localhost:4321/og-card.html" >/dev/null 2>&1 || true
rm -rf "$TMP"
file og-card.png
