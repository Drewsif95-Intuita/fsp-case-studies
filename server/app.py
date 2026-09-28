"""Only the app shell and its assets are public; the case catalogue and decks need FSP sign-in.

Built on the Data Products handbook's server (backend/app.py there). The public routes return the
React shell, which holds no case copy: the catalogue and every deck come from /api/* only after
server/auth.py has validated a delegated FSP member token.
"""
import json
import logging
import re
from pathlib import Path
from urllib.parse import urlsplit

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse
from starlette.middleware.gzip import GZipMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from .auth import AccessDenied, KeysUnavailable, Settings, TokenValidator

ROOT = Path(__file__).resolve().parents[1]
log = logging.getLogger("case-hub")   # reasons only; a token or its claims are never logged
PPTX = "application/vnd.openxmlformats-officedocument.presentationml.presentation"

CSP = "; ".join((
    "default-src 'self'",
    "script-src 'self'",
    # The Adobe Fonts kit: its stylesheet imports p.typekit.net and its fonts load from use.typekit.net.
    "style-src 'self' 'unsafe-inline' https://use.typekit.net https://p.typekit.net",
    "font-src 'self' data: https://use.typekit.net",
    "img-src 'self' data: blob: https://p.typekit.net",
    "connect-src 'self' https://login.microsoftonline.com",
    "frame-src 'self' https://login.microsoftonline.com",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "form-action 'self' https://login.microsoftonline.com",
))
# The product demo is a self-contained page with one inline script and Google Fonts. It carries no
# client content, so it keeps its own looser policy instead of loosening the app's.
DEMO = "/product-demos/anomaly-intelligence-original.html"
DEMO_CSP = "; ".join((
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "form-action 'self'",
))

# The React routes the shell answers, and the few files the build produces beside it.
APP_ROUTES = re.compile(r"^/(?:|auth/complete|cases/[a-z0-9-]+|products/[a-z0-9-]+)$")
ASSET = re.compile(r"^/assets/([A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*\.(?:js|css|png|svg|woff2?))$")
SHELL_FILES = {"/auth/bridge": "bridge.html", "/theme-init.js": "theme-init.js"}


def listed_decks(catalogue_path):
    """(case id, file name) for every deck the catalogue lists; only these are ever served."""
    if not catalogue_path.is_file():
        return set()
    catalogue = json.loads(catalogue_path.read_text(encoding="utf-8"))
    return {(case["id"], fmt["deck"]["file"])
            for case in catalogue["cases"] for fmt in case["formats"].values()}


def create_app(settings=None, validator=None, root=ROOT):
    settings = settings or Settings.from_environment()
    validator = validator or TokenValidator(settings)
    dist, content = root / "dist", root / "content"
    catalogue_path = content / "cases.json"
    decks = listed_decks(catalogue_path)

    application = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
    if settings.configured:
        application.add_middleware(
            TrustedHostMiddleware,
            allowed_hosts=[urlsplit(settings.public_origin).hostname, "localhost",
                           "127.0.0.1", "testserver"])
    # Nothing served here reflects request input beside a secret, so compression gives nothing away.
    application.add_middleware(GZipMiddleware, minimum_size=1024, compresslevel=6)

    @application.middleware("http")
    async def security_headers(request, call_next):
        response = await call_next(request)
        path = request.url.path
        # Built assets carry a content hash in their names and no case copy, so they may be cached.
        cache = ("public, max-age=31536000, immutable" if path.startswith("/assets/")
                 and response.status_code == 200 else "no-store")
        response.headers.update({
            "Cache-Control": cache,
            "Content-Security-Policy": DEMO_CSP if path == DEMO else CSP,
            "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "no-referrer",
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
            "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
        })
        if cache == "no-store":
            response.headers["Pragma"] = "no-cache"
        # Do not add X-Frame-Options or COOP: these break MSAL's silent sign-in frame.
        return response

    # async: health and config never wait behind sign-in checks in the worker threads
    @application.get("/healthz")
    async def health():
        return {"status": "ok"}

    @application.get("/api/config")
    async def config():
        return settings.browser_config()

    def authorize(request):
        if not settings.configured:
            return JSONResponse({"error": "Sign-in setup is not complete."}, status_code=503)
        header = request.headers.get("authorization", "")
        parts = header.split()
        if len(parts) != 2 or parts[0].lower() != "bearer" or len(parts[1]) > 32768:
            return JSONResponse({"error": "Company sign-in required."}, status_code=401,
                                headers={"WWW-Authenticate": "Bearer"})
        try:
            return validator.validate(parts[1])
        except AccessDenied as denial:
            log.warning("Sign-in denied: %s", denial)
            return JSONResponse({"error": "A valid FSP member sign-in is required."},
                                status_code=403)
        except KeysUnavailable:
            log.warning("Sign-in check unavailable: Microsoft signing keys could not be read")
        except Exception:
            log.exception("Sign-in check failed unexpectedly")
        # a service fault is not a denial: the browser shows "try again", not "sign in"
        return JSONResponse({"error": "Sign-in checks are temporarily unavailable. Try again shortly."},
                            status_code=503, headers={"Retry-After": "30"})

    @application.get("/api/cases")
    def cases(request: Request):
        principal = authorize(request)
        if not isinstance(principal, dict):
            return principal
        if not catalogue_path.is_file():
            return JSONResponse({"error": "The case catalogue is not available."}, status_code=503)
        return FileResponse(catalogue_path, media_type="application/json")

    @application.get("/api/decks/{case_id}/{file}")
    def deck(case_id: str, file: str, request: Request):
        # Sign-in first, so an anonymous caller cannot learn which decks exist.
        principal = authorize(request)
        if not isinstance(principal, dict):
            return principal
        if (case_id, file) not in decks:
            return JSONResponse({"error": "Not found"}, status_code=404)
        return FileResponse(content / "decks" / case_id / file, media_type=PPTX, filename=file)

    @application.get("/{path:path}")
    def public(path: str):
        requested = "/" + path
        if APP_ROUTES.match(requested):
            return FileResponse(dist / "index.html", media_type="text/html")
        if requested in SHELL_FILES:
            return FileResponse(dist / SHELL_FILES[requested])
        if requested == DEMO:
            return FileResponse(dist / DEMO.lstrip("/"), media_type="text/html")
        asset = ASSET.match(requested)
        if asset and (dist / "assets" / asset.group(1)).is_file():
            return FileResponse(dist / "assets" / asset.group(1))
        return JSONResponse({"error": "Not found"}, status_code=404)

    return application
