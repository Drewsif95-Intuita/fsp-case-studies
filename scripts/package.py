"""Create the FSP site's deployment ZIP from an explicit allowlist.

    python scripts/package.py      # after npm run build:hosted, with the framework's Python

What ships: the FastAPI server, the hosted build of the React shell, the hosted case catalogue and the
decks it lists, and nothing else. The catalogue is exported fresh from the case study framework's
records (see case-framework.json) and refused if any page disagrees with its deck; each deck must
match the hash the catalogue records. The public shell is scanned for case copy, so a change that
bundled the catalogue again fails here rather than on the live site. The ZIP carries version.json
with this repository's commit and the framework's, and a copy is kept per pair in artifacts/releases/.
"""
from datetime import datetime, timezone
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / "artifacts"
OUT = ARTIFACTS / "fsp-case-study-hub.zip"
CATALOGUE = ARTIFACTS / "package" / "cases.json"
# What the exporter reads in the framework: records and decks, its own code and the builders it
# imports, the templates and the taxonomy. A release from uncommitted content cannot be traced.
CONTENT = ("cases", "scripts", "templates", "config")
SERVER = ["app.py", "requirements.txt", "server/__init__.py", "server/app.py", "server/auth.py"]
# Exactly the files server/app.py serves publicly, beside the hashed assets.
SHELL = {"index.html", "bridge.html", "theme-init.js", "product-demos/anomaly-intelligence-original.html"}
ASSET = re.compile(r"^assets/[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*\.(?:js|css|png|svg|woff2?)$")
FORBIDDEN = ("server/tests/", "src/", "public/", "node_modules/", ".venv/", "artifacts/", "deployment/",
             "infra/", "scripts/", "dist/legacy-pages/")


def fail(message):
    sys.exit("Package check failed: " + message)


def git(repo, *args):
    result = subprocess.run(["git", *args], cwd=repo, capture_output=True, text=True)
    return result.stdout.strip() if result.returncode == 0 else ""


def framework_root():
    configured = os.environ.get("FSP_CASE_FRAMEWORK") or json.loads(
        (ROOT / "case-framework.json").read_text(encoding="utf-8"))["path"]
    root = (ROOT / configured).resolve()
    if not (root / "scripts" / "export_site_cases.py").is_file():
        fail(f"no case study framework at {root}; set FSP_CASE_FRAMEWORK or case-framework.json")
    return root


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def copy_samples(case):
    """Long, distinctive strings from a case that must never appear in the public shell."""
    samples = [case["summary"]]
    formats = case["formats"]
    if "longForm" in formats:
        samples += formats["longForm"]["about"]["ambition"]["paragraphs"][:1]
    if "onePager" in formats:
        samples.append(formats["onePager"]["why"]["text"])
    return [s for s in samples if len(s) >= 40]


# 1. The hosted catalogue, exported now. The exporter refuses a page that disagrees with its deck.
FRAMEWORK = framework_root()
CATALOGUE.parent.mkdir(parents=True, exist_ok=True)
exported = subprocess.run([sys.executable, str(FRAMEWORK / "scripts" / "export_site_cases.py"),
                           "--mode", "hosted", "--output", str(CATALOGUE)], cwd=FRAMEWORK)
if exported.returncode:
    fail("the hosted catalogue was refused; see the exporter's report above")
catalogue = json.loads(CATALOGUE.read_text(encoding="utf-8"))
if catalogue.get("mode") != "hosted":
    fail("the catalogue is not a hosted one")

# 2. The decks it lists, byte for byte as the exporter recorded them.
decks = []
for case in catalogue["cases"]:
    for fmt in case["formats"].values():
        deck = fmt["deck"]
        source = FRAMEWORK / "cases" / case["id"] / "outputs" / deck["file"]
        if not source.is_file() or sha256(source) != deck["sha256"]:
            fail(f"{deck['file']} does not match the catalogue; rebuild the deck and package again")
        decks.append((case["id"], deck["file"], source))

# 3. The public shell: exactly what a hosted build produces, and no case copy anywhere in it.
dist = ROOT / "dist"
shell = sorted(p.relative_to(dist).as_posix() for p in dist.rglob("*") if p.is_file())
unexpected = [name for name in shell if name not in SHELL and not ASSET.match(name)]
if unexpected or not SHELL <= set(shell):
    fail(f"dist/ is not a hosted build (unexpected {unexpected[:5]}, missing {sorted(SHELL - set(shell))}); "
         "run npm.cmd run build:hosted")
public_text = "\n".join((dist / name).read_text(encoding="utf-8", errors="ignore")
                        for name in shell if name.endswith((".html", ".js", ".css")))
for case in catalogue["cases"]:
    if any(sample in public_text for sample in copy_samples(case)):
        fail(f"copy from {case['id']} is in the public build; case copy may only come from /api/cases")

# 4. The package itself.
version = {"commit": git(ROOT, "rev-parse", "HEAD") or "unknown", "dirty": bool(git(ROOT, "status", "--porcelain")),
           "framework": {"commit": git(FRAMEWORK, "rev-parse", "HEAD") or "unknown",
                         "dirty": bool(git(FRAMEWORK, "status", "--porcelain", "--", *CONTENT))},
           "builtAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
           "cases": len(catalogue["cases"]), "decks": len(decks)}
ARTIFACTS.mkdir(exist_ok=True)
with ZipFile(OUT, "w", ZIP_DEFLATED) as archive:
    for name in SERVER:
        path = ROOT / name
        if not path.is_file():
            fail(f"missing {name}")
        archive.write(path, name)
    for name in shell:
        archive.write(dist / name, "dist/" + name)
    archive.write(CATALOGUE, "content/cases.json")
    for case_id, file, source in decks:
        archive.write(source, f"content/decks/{case_id}/{file}")
    archive.writestr("version.json", json.dumps(version, indent=2))

with ZipFile(OUT) as archive:
    names = archive.namelist()
    if any(name.startswith(FORBIDDEN) or ".env" in name for name in names):
        fail("a development, legacy or private path was packaged")
    for case_id, file, source in decks:
        if archive.read(f"content/decks/{case_id}/{file}") != source.read_bytes():
            fail(f"the packaged {file} differs from the built deck")

digest = sha256(OUT)
dirty = version["dirty"] or version["framework"]["dirty"]
release = ARTIFACTS / "releases" / (f"{version['commit'][:12]}-{version['framework']['commit'][:12]}"
                                    + ("-dirty" if dirty else "") + ".zip")
release.parent.mkdir(exist_ok=True)
shutil.copyfile(OUT, release)
report = {"zip": str(OUT), "release": str(release), "bytes": OUT.stat().st_size, "sha256": digest,
          "version": version, "entries": names}
(ARTIFACTS / "package-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
print(f"Prepared {OUT.name}: {len(names)} files, {OUT.stat().st_size:,} bytes, {len(catalogue['cases'])} cases, "
      f"{len(decks)} decks, site {version['commit'][:12]}, framework {version['framework']['commit'][:12]}"
      f"{' (uncommitted changes)' if dirty else ''}. No deployment performed.")
