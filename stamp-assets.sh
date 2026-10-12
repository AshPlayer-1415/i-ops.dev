#!/bin/sh
# Stamp every ?v= asset token with a hash of site.css.
#
# A hand-picked date token is wrong the second time the file changes in one day, and the symptom is
# a CSS fix that never reaches a browser while the source plainly contains it. That has now happened
# three times here. A content hash cannot go stale: it changes exactly when the file does, and not
# otherwise. Run this before committing any change to site.css.
set -eu
cd "$(dirname "$0")"
HASH=$(shasum -a 256 site.css | cut -c1-10)
CUR=$(grep -ho 'site\.css?v=[A-Za-z0-9]*' index.html | head -n 1 | sed 's/.*v=//')
[ "$HASH" = "$CUR" ] && { echo "already stamped $HASH"; exit 0; }
# Any token that is not the current hash, so a page added since the last stamp is caught too.
FILES=$(grep -rlE "v=[A-Za-z0-9]+" --include='*.html' . | grep -v node_modules)
echo "$FILES" | xargs sed -i '' -E "s/(site\.css|favicon\.svg|apple-touch-icon\.png|icon-512\.png)\?v=[A-Za-z0-9]+/\1?v=$HASH/g"
echo "stamped $CUR -> $HASH on $(echo "$FILES" | wc -l | tr -d ' ') page(s)"
