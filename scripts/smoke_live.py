"""Anonymous checks against the live FSP site: the shell answers, and nothing private does.

    python scripts/smoke_live.py [origin]    # defaults to publicOrigin in deployment/target.json

These never sign in, so they cannot prove that an FSP member gets in; that stays a check done in a
browser with a real account. What they prove is that case copy and decks are refused without one.
"""
import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
target = json.loads((ROOT / "deployment" / "target.json").read_text(encoding="utf-8"))
origin = (sys.argv[1] if len(sys.argv) > 1 else target["publicOrigin"]).rstrip("/")
if not origin:
    sys.exit("No origin recorded; pass one, or provision first.")


def fetch(path, headers=None):
    request = urllib.request.Request(origin + path, headers=headers or {})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.status, response.headers, response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.headers, error.read()


results = []


def check(name, ok):
    results.append((name, bool(ok)))


status, _, body = fetch("/healthz")
check("health endpoint answers", status == 200 and json.loads(body).get("status") == "ok")
status, _, body = fetch("/api/config")
config = json.loads(body) if status == 200 else {}
check("sign-in is configured with the shared client",
      config.get("configured") is True and config.get("clientId") == target["entraClientId"]
      and config.get("apiScope") == f"api://{target['entraClientId']}/access_as_user")
status, headers, shell = fetch("/")
check("the shell loads under a strict policy",
      status == 200 and b'<div id="root">' in shell
      and "script-src 'self';" in (headers.get("Content-Security-Policy") or ""))
script = re.search(rb'src="(/assets/[^"]+\.js)"', shell)
check("the shell's script loads", script is not None and fetch(script.group(1).decode())[0] == 200)
check("the sign-in bridge loads", fetch("/auth/bridge")[0] == 200)
check("the case catalogue needs sign-in", fetch("/api/cases")[0] == 401)
check("a forged token is refused", fetch("/api/cases", {"Authorization": "Bearer not-a-token"})[0] == 403)
check("decks need sign-in",
      fetch("/api/decks/hyperoptic-datahub/hyperoptic-datahub-long-form-draft.pptx")[0] == 401)
for path in ("/content/cases.json", "/legacy-pages/hyperoptic.html", "/app.py", "/server/auth.py",
             "/version.json", "/requirements.txt"):
    check(f"{path} is not served", fetch(path)[0] == 404)

for name, ok in results:
    print(("PASS  " if ok else "FAIL  ") + name)
failed = sum(not ok for _, ok in results)
print(f"{len(results) - failed} of {len(results)} anonymous checks passed against {origin}")
sys.exit(1 if failed else 0)
