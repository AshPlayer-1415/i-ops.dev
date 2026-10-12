#!/bin/sh
# Stamp every ?v= asset token with a hash of site.css.
#
# A hand-picked date token is wrong the second time the file changes in one day, and the symptom is
# a CSS fix that never reaches a browser while the source plainly contains it. That has now happened
# three times here. A content hash cannot go stale: it changes exactly when the file does, and not
# otherwise. Run this before committing any change to site.css.
set -eu
cd "$(dirname "$0")"
# forms.js imports orb.js, so its token is rewritten first and its own hash taken after.
ORB0=$(shasum -a 256 vendor/thinking-orbs/orb.js | cut -c1-10)
sed -i '' -E "s|orb\.js\?v=[A-Za-z0-9]+|orb.js?v=$ORB0|g" forms.js
HASH=$(shasum -a 256 site.css | cut -c1-10)
JSHASH=$(shasum -a 256 forms.js | cut -c1-10)
ORBHASH=$(shasum -a 256 vendor/thinking-orbs/orb.js | cut -c1-10)
CUR=$(grep -ho 'site\.css?v=[A-Za-z0-9]*' index.html | head -n 1 | sed 's/.*v=//')
CURJS=$(grep -ho 'forms\.js?v=[A-Za-z0-9]*' -r --include='*.html' . | head -n 1 | sed 's/.*v=//')
CURORB=$(grep -ho 'orb\.js?v=[A-Za-z0-9]*' -r --include='*.html' . | head -n 1 | sed 's/.*v=//')
[ "$HASH" = "$CUR" ] && [ "$JSHASH" = "$CURJS" ] && [ "$ORBHASH" = "$CURORB" ] && { echo "already stamped"; exit 0; }
# Any token that is not the current hash, so a page added since the last stamp is caught too.
FILES=$(grep -rlE "v=[A-Za-z0-9]+" --include='*.html' . | grep -v node_modules)
echo "$FILES" | xargs sed -i '' -E "s/(favicon\.svg|apple-touch-icon\.png|icon-512\.png)\?v=[A-Za-z0-9]+/\1?v=$HASH/g; s/site\.css\?v=[A-Za-z0-9]+/site.css?v=$HASH/g; s/forms\.js\?v=[A-Za-z0-9]+/forms.js?v=$JSHASH/g"
echo "stamped $CUR -> $HASH on $(echo "$FILES" | wc -l | tr -d ' ') page(s)"
