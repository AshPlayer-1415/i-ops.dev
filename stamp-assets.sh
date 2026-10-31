#!/bin/sh
# Stamp every ?v= asset token with a hash of the file it points at.
#
# A hand-picked date token is wrong the second time the file changes in one day, and the symptom is
# a CSS fix that never reaches a browser while the source plainly contains it. That has now happened
# three times here. A content hash cannot go stale: it changes exactly when the file does, and not
# otherwise. Run this before committing any change to site.css, site.js, forms.js or orb.js.
#
# Two gaps closed 2026-10-31, both found by reading a token rather than by a failure.
#
# site.js was never stamped at all. Its hash was 4164c0e673 while six pages served ?v=20260911, a
# date token left from an older build, and three carried the right one. So a site.js fix reached
# some pages and not others, which is exactly the symptom in the paragraph above, in the one file
# the script did not cover. orb.js had the same shape: its token was rewritten inside forms.js and
# never in the pages, so 404.html's import would have gone stale the next time orb.js changed.
#
# And the check deciding whether there was work to do read the FIRST match of a recursive grep.
# With six pages wrong and three right, which answer it got depended on which file grep reached
# first, and it said "already stamped" over a tree that was not. It now counts every token in
# every page: one copy of a thing that exists twenty-two times is not a sample. That is the same
# defect the two nav menus had, in a different file.
set -eu
cd "$(dirname "$0")"

# forms.js imports orb.js, so its token is rewritten first and its own hash taken after.
ORB0=$(shasum -a 256 vendor/thinking-orbs/orb.js | cut -c1-10)
sed -i '' -E "s|orb\.js\?v=[A-Za-z0-9]+|orb.js?v=$ORB0|g" forms.js

HASH=$(shasum -a 256 site.css | cut -c1-10)
SITEJS=$(shasum -a 256 site.js | cut -c1-10)
JSHASH=$(shasum -a 256 forms.js | cut -c1-10)
ORBHASH=$(shasum -a 256 vendor/thinking-orbs/orb.js | cut -c1-10)

# How many tokens for $1 carry something other than $2, across every page. Counting, not sampling.
stale() {
  grep -rhoE "$1\?v=[A-Za-z0-9]+" --include='*.html' . 2>/dev/null \
    | sed 's/.*v=//' | grep -vx "$2" | wc -l | tr -d ' '
}
STALE=$(( $(stale 'site\.css' "$HASH") + $(stale 'site\.js' "$SITEJS") \
        + $(stale 'forms\.js' "$JSHASH") + $(stale 'orb\.js' "$ORBHASH") \
        + $(stale 'favicon\.svg' "$HASH") + $(stale 'apple-touch-icon\.png' "$HASH") \
        + $(stale 'icon-512\.png' "$HASH") ))
[ "$STALE" -eq 0 ] && { echo "already stamped"; exit 0; }

# Any token that is not the current hash, so a page added since the last stamp is caught too.
FILES=$(grep -rlE "v=[A-Za-z0-9]+" --include='*.html' . | grep -v node_modules)
echo "$FILES" | xargs sed -i '' -E "\
s/(favicon\.svg|apple-touch-icon\.png|icon-512\.png)\?v=[A-Za-z0-9]+/\1?v=$HASH/g; \
s/site\.css\?v=[A-Za-z0-9]+/site.css?v=$HASH/g; \
s/site\.js\?v=[A-Za-z0-9]+/site.js?v=$SITEJS/g; \
s/forms\.js\?v=[A-Za-z0-9]+/forms.js?v=$JSHASH/g; \
s|orb\.js\?v=[A-Za-z0-9]+|orb.js?v=$ORBHASH|g"
echo "stamped $STALE stale token(s) across $(echo "$FILES" | wc -l | tr -d ' ') page(s)"
echo "  site.css $HASH · site.js $SITEJS · forms.js $JSHASH · orb.js $ORBHASH"
