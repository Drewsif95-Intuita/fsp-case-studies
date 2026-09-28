"""The case hub serves case copy and decks to validated FSP members only. Fictional content only.

Run from the repository root:  python -m unittest discover -s server/tests -t .
"""
import json
import shutil
import time
import unittest
import uuid
from pathlib import Path
from types import SimpleNamespace

import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient

from server.app import CSP, DEMO, DEMO_CSP, create_app
from server.auth import KeysUnavailable, Settings, TokenValidator

SITE = Path(__file__).resolve().parents[2]
SETTINGS = Settings("805d0794-f9ac-42a6-b40a-9e41418a213e",
                    "11111111-1111-4111-8111-111111111111", "https://case-hub.example")
KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
OTHER_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
TEAMS_WEB = "5e3ce6c0-2b1f-4285-8d4b-75ee78787346"
DECK = "fictional-case-one-pager-draft.pptx"
CATALOGUE = {"mode": "hosted", "generatedFrom": "cases/*/case-study.yaml", "warning": "FSP internal.",
             "cases": [{"id": "fictional-case", "formats": {"onePager": {"deck": {"file": DECK}}}}]}


class KeyClient:
    def get_signing_key_from_jwt(self, token):
        return SimpleNamespace(key=KEY.public_key())


class KeyOutage:
    def get_signing_key_from_jwt(self, token):
        raise KeysUnavailable("simulated outage")


def token(changes=None, remove=(), signing_key=KEY):
    now = int(time.time())
    claims = dict(iss=SETTINGS.issuer, aud=SETTINGS.client_id, tid=SETTINGS.tenant_id,
                  ver="2.0", exp=now + 3600, nbf=now - 10, iat=now - 10,
                  oid="22222222-2222-4222-8222-222222222222",
                  acct="0", scp="access_as_user", azp=SETTINGS.client_id)
    claims.update(changes or {})
    for name in remove:
        claims.pop(name, None)
    return jwt.encode(claims, signing_key, algorithm="RS256", headers={"kid": "test-key"})


def bearer(value=None):
    return {"Authorization": "Bearer " + (value or token())}


class SiteFixture:
    """A build and content folder shaped like the deployment package."""

    def __init__(self):
        base = (SITE / ".cache" / "test-server").resolve()
        self.root = base / uuid.uuid4().hex
        files = {
            "dist/index.html": "<!doctype html><title>shell</title>",
            "dist/bridge.html": "<!doctype html><title>bridge</title>",
            "dist/theme-init.js": "// theme",
            "dist/assets/main-abc123.js": "console.log('shell')",
            "dist" + DEMO: "<!doctype html><title>demo</title>",
            "dist/legacy-pages/hyperoptic.html": "legacy",
            "content/cases.json": json.dumps(CATALOGUE),
            f"content/decks/fictional-case/{DECK}": "PK fictional deck",
            "content/decks/fictional-case/unlisted.pptx": "PK not in the catalogue",
        }
        for name, text in files.items():
            path = self.root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text, encoding="utf-8")

    def close(self):
        shutil.rmtree(self.root)


class SecurityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.site = SiteFixture()
        cls.client = TestClient(create_app(SETTINGS, TokenValidator(SETTINGS, KeyClient()), cls.site.root))

    @classmethod
    def tearDownClass(cls):
        cls.site.close()

    def test_config_names_the_base_scope_and_nothing_secret(self):
        config = self.client.get("/api/config").json()
        self.assertEqual(config["apiScope"], f"api://{SETTINGS.client_id}/access_as_user")
        self.assertTrue(config["configured"])
        self.assertEqual(set(config), {"configured", "tenantId", "clientId", "publicOrigin", "apiScope"})

    def test_anonymous_and_forged_requests_get_no_content(self):
        for path in ("/api/cases", f"/api/decks/fictional-case/{DECK}"):
            for headers in ({}, {"X-MS-CLIENT-PRINCIPAL": "forged"},
                            {"Authorization": "Basic anything"}, {"Authorization": "Bearer"}):
                response = self.client.get(path, headers=headers)
                self.assertEqual(response.status_code, 401, (path, headers))
                self.assertNotIn(b"fictional", response.content)

    def test_invalid_claims_are_denied(self):
        invalid = [
            ("tenant", {"tid": "33333333-3333-4333-8333-333333333333"}, ()),
            ("issuer", {"iss": "https://attacker.example"}, ()),
            ("audience", {"aud": "other-api"}, ()),
            ("expired", {"exp": int(time.time()) - 3600}, ()),
            ("future", {"nbf": int(time.time()) + 3600}, ()),
            ("guest", {"acct": "1"}, ()),
            ("unknown-account", {"acct": "unexpected"}, ()),
            ("missing-account", {}, ("acct",)),
            ("id-token", {}, ("scp",)),
            ("application-token", {"roles": ["access_as_user"]}, ("scp",)),
            ("wrong-scope", {"scp": "User.Read"}, ()),
            ("wrong-client", {"azp": "unapproved"}, ()),
            ("teams-client", {"azp": TEAMS_WEB}, ()),   # no Teams tab yet, so not trusted
            ("missing-expiry", {}, ("exp",)),
            ("version", {"ver": "1.0"}, ()),
            ("missing-user", {}, ("oid",)),
        ]
        for name, changes, remove in invalid:
            with self.subTest(name):
                response = self.client.get("/api/cases", headers=bearer(token(changes, remove)))
                self.assertEqual(response.status_code, 403)
        forged = self.client.get("/api/cases", headers=bearer(token(signing_key=OTHER_KEY)))
        self.assertEqual(forged.status_code, 403)

    def test_member_receives_the_catalogue_uncached(self):
        response = self.client.get("/api/cases", headers=bearer())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, (self.site.root / "content/cases.json").read_bytes())
        self.assertEqual(response.headers["cache-control"], "no-store")

    def test_member_receives_listed_decks_only(self):
        response = self.client.get(f"/api/decks/fictional-case/{DECK}", headers=bearer())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"PK fictional deck")
        self.assertIn("attachment", response.headers["content-disposition"])
        self.assertIn("presentationml", response.headers["content-type"])
        for path in ("/api/decks/fictional-case/unlisted.pptx", "/api/decks/other-case/" + DECK,
                     "/api/decks/fictional-case/..%2Fcases.json", "/api/decks/../content/cases.json"):
            self.assertEqual(self.client.get(path, headers=bearer()).status_code, 404, path)

    def test_the_public_shell_holds_the_routes_the_app_needs(self):
        shell = (self.site.root / "dist/index.html").read_bytes()
        for path in ("/", "/cases/fictional-case", "/products/anomaly-intelligence", "/auth/complete"):
            response = self.client.get(path)
            self.assertEqual((response.status_code, response.content), (200, shell), path)
        self.assertIn(b"bridge", self.client.get("/auth/bridge").content)
        self.assertEqual(self.client.get("/theme-init.js").status_code, 200)
        asset = self.client.get("/assets/main-abc123.js")
        self.assertEqual(asset.status_code, 200)
        self.assertIn("immutable", asset.headers["cache-control"])
        demo = self.client.get(DEMO)
        self.assertEqual(demo.status_code, 200)
        self.assertEqual(demo.headers["content-security-policy"], DEMO_CSP)

    def test_content_sources_and_legacy_pages_are_not_served(self):
        for path in ("/content/cases.json", f"/content/decks/fictional-case/{DECK}", "/dist/index.html",
                     "/server/app.py", "/app.py", "/requirements.txt", "/legacy-pages/hyperoptic.html",
                     "/assets/../content/cases.json", "/assets/missing.js", "/api/unknown",
                     "/cases/Not_A_Case", "/bundle", "/case-studies/hyperoptic"):
            self.assertEqual(self.client.get(path).status_code, 404, path)

    def test_security_headers_apply_everywhere(self):
        for path in ("/", "/api/config", "/nothing-here"):
            headers = self.client.get(path).headers
            self.assertEqual(headers["content-security-policy"], CSP)
            self.assertEqual(headers["x-content-type-options"], "nosniff")
            self.assertIn("max-age", headers["strict-transport-security"])
            self.assertEqual(headers["cache-control"], "no-store")
        scripts = next(d for d in CSP.split("; ") if d.startswith("script-src"))
        self.assertEqual(scripts, "script-src 'self'")

    def test_an_unconfigured_service_fails_closed(self):
        unset = Settings(SETTINGS.tenant_id, "", "")
        client = TestClient(create_app(unset, TokenValidator(unset, KeyClient()), self.site.root))
        self.assertFalse(client.get("/api/config").json()["configured"])
        self.assertEqual(client.get("/api/cases", headers=bearer()).status_code, 503)

    def test_a_key_outage_is_unavailable_not_a_denial(self):
        client = TestClient(create_app(SETTINGS, TokenValidator(SETTINGS, KeyOutage()), self.site.root))
        response = client.get("/api/cases", headers=bearer())
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.headers["retry-after"], "30")

    def test_an_unexpected_host_is_refused(self):
        self.assertEqual(self.client.get("/", headers={"Host": "attacker.example"}).status_code, 400)


if __name__ == "__main__":
    unittest.main()
