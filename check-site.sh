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
every = sorted(set(glob.glob("*.html") + glob.glob("*/index.html") + glob.glob("*/*/index.html")))
src = {f: open(f, encoding="utf-8").read() for f in every}
pages = [f for f in every if 'class="nav-links"' in src[f]]
bad = []

# A page selected by nav-links alone is a page that disappears from this check the moment it loses
# its nav, and silence then looks exactly like a pass. So the three parts of the chrome are held
# together: a page with the site header has all of nav-links, mobile-menu and the burger that opens
# it, or none of them. None of them is what the gated early-release pages have on purpose -- brand
# and "Back to site", no nav -- and that stays legal without naming them here, because a list of
# exceptions goes stale and an invariant does not.
for f in every:
    has = ['class="nav-links"' in src[f], 'class="mobile-menu"' in src[f], 'class="burger"' in src[f]]
    if 'class="nav" id="nav"' in src[f] and any(has) and not all(has):
        bad.append(f"{f}: has only part of the header chrome "
                   f"(nav-links={has[0]}, mobile-menu={has[1]}, burger={has[2]})")

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
    print(f"  PASS  {len(pages)} of {len(every)} pages carry a nav: header == index, mobile starts with header")
    print(f"  PASS  {len(every) - len(pages)} pages carry no nav, and none carries only part of one")
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

echo "--- the live site is serving what is committed here ---"
# The hash is the question; the headers only explain a failure. An earlier version of this asserted
# that every file carried the SAME last-modified as the home page, on the theory that it pinned the
# deploy. It does not: Pages writes a deploy's files over a second or two, so a healthy deploy spans
# several timestamps -- 23:54:22 to 23:54:23 on 2026-10-31 -- and ten files whose bytes were correct
# were reported as coming from an earlier deploy. A check that fails on a correct site is worse than
# no check, because the next real failure reads as more of the same.
#
# What the timestamp is good for is explaining a mismatch. A query string does NOT bust the cache
# here: Pages fronts with Fastly at max-age=600, keyed on path. So a new page goes live before an
# edit to an existing page does, and right after a push an edge can still hold the previous copy.
#
# The set of files to check is derived from git, not listed here. It used to be a hand-written set
# -- the HTML pages plus four text files -- which left og-card.png unverified, and that is the image
# every page advertises as its og:image and the one asset third parties fetch most. Both icons,
# site.css, site.js, forms.js, orb.js and all four font files were unlisted too: a font that failed
# to deploy would have taken the typeface off every page while this check still reported everything
# passing. A hand-written set is the same defect as reading one copy of the nav or one asset token,
# and it goes stale the first time somebody adds a file. Pages serves the whole repository, dotfiles
# included -- checked, not assumed -- so every tracked file is fetched at its own path, and each
# index.html is fetched again at the clean URL the site actually links to, since directory-index
# serving could break while /about/index.html still answered.
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
TAB=$(printf '\t')
git ls-files > "$TMP/files"
: > "$TMP/urls"
while read -r f; do
  printf '%s\t%s\n' "/$f" "$f" >> "$TMP/urls"
  case "$f" in
    index.html)   printf '%s\t%s\n' "/" "$f" >> "$TMP/urls" ;;
    */index.html) printf '%s\t%s\n' "/${f%index.html}" "$f" >> "$TMP/urls" ;;
  esac
done < "$TMP/files"
sort -u -o "$TMP/urls" "$TMP/urls"

MATCH=0
while IFS="$TAB" read -r url f; do
  code=$(curl -s -o "$TMP/body" -D "$TMP/head" -w '%{http_code}' "$SITE$url" < /dev/null)
  if [ "$code" != "200" ]; then bad "$url returned $code (expected to serve $f)"; continue; fi
  if [ "$(shasum -a 256 "$TMP/body" | cut -d' ' -f1)" = "$(shasum -a 256 "$f" | cut -d' ' -f1)" ]; then
    MATCH=$((MATCH+1))
  else
    lm=$(grep -i '^last-modified:' "$TMP/head" | cut -d' ' -f2- | tr -d '\r')
    age=$(grep -i '^age:' "$TMP/head" | cut -d' ' -f2- | tr -d '\r')
    bad "$url does not match $f (last-modified $lm, cache age ${age:-0}s; within 600s of a push an edge may still hold the previous copy)"
  fi
done < "$TMP/urls"
# One line, with both numbers in it, so the denominator is visible. A check whose scope can shrink
# without the summary changing is the hole this whole section was rewritten to close.
[ "$MATCH" = "$(wc -l < "$TMP/urls" | tr -d ' ')" ] \
  && ok "$MATCH URLs over $(wc -l < "$TMP/files" | tr -d ' ') tracked files, every byte matching" \
  || echo "  ....  $MATCH of $(wc -l < "$TMP/urls" | tr -d ' ') URLs matched"

echo "--- no page asks a third party for anything ---"
EXT=$(grep -rhoE '<(script|link|img|iframe|source)[^>]*' --include='*.html' . \
      | grep -oE '(src|href)="https?://[^"]*"' | grep -v 'i-ops\.dev' | sort -u)
if [ -z "$EXT" ]; then ok "every stylesheet, script, icon and image is same-origin"
else bad "off-site resource request(s):"; printf '          %s\n' $EXT; fi

echo
echo "===== $PASS passed, $FAIL failed ====="
[ "$FAIL" -eq 0 ] || exit 1
