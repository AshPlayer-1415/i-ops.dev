#!/bin/sh
# Check the site: the things that have actually broken here, asserted rather than eyeballed.
#
# Written 2026-10-31 after two defects that had both shipped live and that no check could have
# caught, because the repo had no check beyond stamp-assets.sh.
#
#   The nav list exists twice on every page, header and mobile menu, and the alternating red hover
#   is positional. In 2026-09 the two copies disagreed on two pages and shipped; the verification
#   then compared only .nav-links and went green. On 2026-10-31 the copies agreed within each page
#   and the PAGES disagreed with each other: index.html carried an "Open source" item that the
#   seven subpages did not. Both are the same defect, so both are checked here: header against
#   mobile within a page, and every page against index.html.
#
#   site.js was never stamped, so six pages served a token from an older build while three served
#   the right one. Tokens are now counted across every page rather than sampled from the first one
#   grep reaches.
#
# Run with --local to skip everything needing the network. Exit 0 if every check passes, 1 if any
# fails, so it can gate a push.
set -u
cd "$(dirname "$0")"

SITE="https://i-ops.dev"
LIVE=1
[ "${1:-}" = "--local" ] && LIVE=0

PASS=0; FAIL=0
ok()  { PASS=$((PASS+1)); printf '  PASS  %s\n' "$1"; }
bad() { FAIL=$((FAIL+1)); printf '  FAIL  %s\n' "$1"; }
run() { if "$@"; then PASS=$((PASS+1)); else FAIL=$((FAIL+1)); fi; }

echo "--- the two nav copies, on every page ---"
# Parsed from the DOM, never from indentation: the 2026-09 script anchored on an unindented
# </div>, two pages closed that block indented, and it silently rewrote nothing.
run python3 - <<'PY'
import sys, glob
from html.parser import HTMLParser

class Nav(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.depth = {}          # which container we are inside -> nesting depth
        self.out = {"nav-links": [], "mobile-menu": []}
        self.grab = None
    def handle_starttag(self, tag, attrs):
        cls = dict(attrs).get("class", "").split()
        for key in self.out:
            if key in cls and key not in self.depth:
                self.depth[key] = 0
        for key in list(self.depth):
            self.depth[key] += 1
        if tag == "a" and self.depth:
            self.grab = [k for k in self.depth]
    def handle_endtag(self, tag):
        for key in list(self.depth):
            self.depth[key] -= 1
            if self.depth[key] == 0:
                del self.depth[key]
    def handle_data(self, data):
        if self.grab and data.strip():
            for k in self.grab:
                self.out[k].append(data.strip())
            self.grab = None

def navs(path):
    p = Nav(); p.feed(open(path, encoding="utf-8").read())
    return p.out["nav-links"], p.out["mobile-menu"]

ref_header, _ = navs("index.html")
pages = sorted(f for f in glob.glob("*.html") + glob.glob("*/index.html") + glob.glob("*/*/index.html")
               if 'class="nav-links"' in open(f, encoding="utf-8").read())
bad = []
for f in pages:
    header, mobile = navs(f)
    if header != ref_header:
        bad.append(f"{f}: header {header} != index.html {ref_header}")
    # The mobile menu is the header list plus page-specific extras appended after it.
    if mobile[:len(header)] != header:
        bad.append(f"{f}: mobile menu does not start with its own header list\n          header {header}\n          mobile {mobile[:len(header)]}")
for b in bad:
    print(f"  FAIL  {b}")
if not bad:
    print(f"  PASS  {len(pages)} pages: header == index, and mobile starts with header")
sys.exit(1 if bad else 0)
PY

echo "--- asset tokens are the current content hash, on every page ---"
stale() {
  grep -rhoE "$1\?v=[A-Za-z0-9]+" --include='*.html' . 2>/dev/null \
    | sed 's/.*v=//' | grep -vx "$2" | wc -l | tr -d ' '
}
CSS=$(shasum -a 256 site.css | cut -c1-10)
SJS=$(shasum -a 256 site.js | cut -c1-10)
FJS=$(shasum -a 256 forms.js | cut -c1-10)
OJS=$(shasum -a 256 vendor/thinking-orbs/orb.js | cut -c1-10)
for pair in "site\\.css:$CSS" "site\\.js:$SJS" "forms\\.js:$FJS" "orb\\.js:$OJS" \
            "favicon\\.svg:$CSS" "apple-touch-icon\\.png:$CSS"; do
  a="${pair%:*}"; want="${pair##*:}"; n=$(stale "$a" "$want")
  [ "$n" = "0" ] && ok "$(echo "$a" | tr -d '\\') all current ($want)" \
                 || bad "$(echo "$a" | tr -d '\\') has $n token(s) that are not $want — run ./stamp-assets.sh"
done

echo "--- agents.md and /agents/ say the same things ---"
run python3 - <<'PY'
import re, sys
md = open("agents.md", encoding="utf-8").read()
ht = open("agents/index.html", encoding="utf-8").read()
md_h = re.findall(r'^##\s+(.+)$', md, re.M)
ht_h = [re.sub(r'<[^>]+>', '', h).strip() for h in re.findall(r'<h2[^>]*>(.*?)</h2>', ht, re.S)]
md_b = len(re.findall(r'^- ', md[md.find("## What we do not claim"):].split("## Contact")[0], re.M))
ht_b = ht[ht.find("What we do not claim"):].split("<h2")[0].count("<li>")
bad = []
if md_h != ht_h:
    bad.append(f"section headings differ\n          agents.md     {md_h}\n          agents/index  {ht_h}")
if md_b != ht_b:
    bad.append(f'"what we do not claim" has {md_b} bullets in agents.md and {ht_b} in agents/index.html')
for b in bad: print(f"  FAIL  {b}")
if not bad: print(f"  PASS  {len(md_h)} sections and {md_b} bullets, in both")
sys.exit(1 if bad else 0)
PY

if [ "$LIVE" = "0" ]; then
  echo; echo "===== $PASS passed, $FAIL failed (local only) ====="
  [ "$FAIL" -eq 0 ] || exit 1
  exit 0
fi

echo "--- the live site is serving this commit ---"
# last-modified is what proves which deploy answered. A query string does NOT bust the cache here:
# Pages fronts with Fastly at max-age=600, keyed on path. A new page therefore goes live before an
# edit to an existing page does, and a check that greps for a string without pinning the deploy can
# report success against the previous one -- or, as happened on 2026-10-31, failure against it.
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
DEPLOY=$(curl -sSI "$SITE/" | grep -i '^last-modified:' | cut -d' ' -f2- | tr -d '\r')
echo "  (serving last-modified: $DEPLOY)"
for f in $(find . -name '*.html' -not -path './node_modules/*' | sed 's|^\./||' | sort) \
         agents.md llms.txt sitemap.xml robots.txt; do
  case "$f" in
    404.html) continue ;;                      # served as the 404 body, not at its own path
    */index.html) url="/${f%index.html}" ;;
    index.html)   url="/" ;;
    *)            url="/$f" ;;
  esac
  code=$(curl -s -o "$TMP/body" -D "$TMP/head" -w '%{http_code}' "$SITE$url")
  if [ "$code" != "200" ]; then bad "$url returned $code"; continue; fi
  lm=$(grep -i '^last-modified:' "$TMP/head" | cut -d' ' -f2- | tr -d '\r')
  if [ "$lm" != "$DEPLOY" ]; then bad "$url is from an earlier deploy ($lm)"; continue; fi
  if [ "$(shasum -a 256 "$TMP/body" | cut -d' ' -f1)" != "$(shasum -a 256 "$f" | cut -d' ' -f1)" ]; then
    bad "$url does not match $f byte for byte"
  else
    ok "$url == $f"
  fi
done

echo "--- no page asks a third party for anything ---"
EXT=$(grep -rhoE '<(script|link|img|iframe|source)[^>]*' --include='*.html' . \
      | grep -oE '(src|href)="https?://[^"]*"' | grep -v 'i-ops\.dev' | sort -u)
if [ -z "$EXT" ]; then ok "every stylesheet, script, icon and image is same-origin"
else bad "off-site resource request(s):"; printf '          %s\n' $EXT; fi

echo
echo "===== $PASS passed, $FAIL failed ====="
[ "$FAIL" -eq 0 ] || exit 1
