"""Single-tenant delegated-token validation. No Graph access or client secret.

Mirrors backend/auth.py in the FSP Data Products handbook (C:/Users/DrewButchart/Code/FSP-Data-Products),
which went through its own security review; keep the two in step when either changes. Two things
differ, both deliberately. The API scope is requested through the shared registration's base
identifier, api://<client id>, so no site-specific API alias is added to it. And only this site's own
browser client is accepted: there is no Teams tab yet, so the Teams client IDs are not trusted.
"""
import os
import threading
import time
from dataclasses import dataclass
from uuid import UUID
from urllib.parse import urlsplit

import jwt
from jwt import PyJWKClient


class AccessDenied(Exception):
    pass


class KeysUnavailable(Exception):
    """Microsoft's signing keys could not be read: a service fault, not a denial."""


class SigningKeys:
    """The tenant's token-signing keys, read from Microsoft's key-set endpoint.

    PyJWKClient re-reads the key set for every token naming a key id it does not know, so
    any anonymous caller could make this service call Microsoft on every request, and its
    per-key cache keeps a key Microsoft has withdrawn until the process restarts. Here the
    set is re-read hourly, an unknown key id forces at most one early re-read every five
    minutes, and a withdrawn key stops working at the next re-read.
    """
    LIFESPAN = 3600          # re-read the key set hourly
    EARLIEST_REFRESH = 300   # an unknown key id forces a re-read at most this often
    RETRY_WHEN_EMPTY = 30    # while no keys are held, try again at most this often

    def __init__(self, url, client=None, clock=time.monotonic):
        self._client = client or PyJWKClient(url, cache_keys=False, cache_jwk_set=False, timeout=10)
        self._clock = clock
        self._keys = {}
        self._read_at = None     # last successful read
        self._tried_at = None    # last attempt, successful or not
        self._lock = threading.Lock()

    def _read(self):
        try:
            return {key.key_id: key for key in self._client.get_signing_keys(refresh=True)}
        except Exception as exc:  # connection, HTTP, JSON or empty-set errors alike
            raise KeysUnavailable("The signing keys could not be read") from exc

    def get_signing_key_from_jwt(self, token):
        kid = jwt.get_unverified_header(token).get("kid")
        if not isinstance(kid, str) or not 0 < len(kid) <= 128:
            raise jwt.InvalidTokenError("Token names no usable signing key")
        with self._lock:
            now = self._clock()
            wanted = kid not in self._keys or self._read_at is None or now - self._read_at >= self.LIFESPAN
            gap = self.EARLIEST_REFRESH if self._keys else self.RETRY_WHEN_EMPTY
            if wanted and (self._tried_at is None or now - self._tried_at >= gap):
                self._tried_at = now
                try:
                    self._keys = self._read()
                    self._read_at = now
                except KeysUnavailable:
                    if kid not in self._keys:
                        raise
                    # the keys already held stay in use until the next attempt is allowed
            if not self._keys:
                raise KeysUnavailable("No signing keys have been read yet")
            key = self._keys.get(kid)
        if key is None:
            raise jwt.InvalidTokenError("Unknown signing key")
        return key


@dataclass(frozen=True)
class Settings:
    tenant_id: str
    client_id: str
    public_origin: str

    @classmethod
    def from_environment(cls):
        return cls(os.getenv("TENANT_ID", ""), os.getenv("CLIENT_ID", ""),
                   os.getenv("PUBLIC_ORIGIN", "").rstrip("/"))

    @property
    def configured(self):
        try:
            if not UUID(self.tenant_id).int or not UUID(self.client_id).int:
                return False
            parsed = urlsplit(self.public_origin)
            return parsed.scheme == "https" and bool(parsed.hostname) and not (
                parsed.username or parsed.password or parsed.query or parsed.fragment
                or parsed.path not in ("", "/"))
        except (ValueError, TypeError):
            return False

    @property
    def issuer(self):
        return f"https://login.microsoftonline.com/{self.tenant_id}/v2.0"

    @property
    def api_scope(self):
        return f"api://{self.client_id}/access_as_user"

    def browser_config(self):
        return {
            "configured": self.configured,
            "tenantId": self.tenant_id,
            "clientId": self.client_id,
            "publicOrigin": self.public_origin,
            "apiScope": self.api_scope,
        }


class TokenValidator:
    def __init__(self, settings, key_client=None):
        self.settings = settings
        self.keys = key_client or SigningKeys(
            f"https://login.microsoftonline.com/{settings.tenant_id}/discovery/v2.0/keys")

    def validate(self, token):
        if not self.settings.configured:
            raise AccessDenied("Authentication is not configured")
        try:
            key = self.keys.get_signing_key_from_jwt(token).key
            claims = jwt.decode(
                token, key, algorithms=["RS256"],
                audience=self.settings.client_id, issuer=self.settings.issuer,
                leeway=30,
                options={"require": ["exp", "nbf", "iat", "oid", "tid", "ver", "scp", "acct", "azp"]})
            if claims["tid"] != self.settings.tenant_id or claims["ver"] != "2.0":
                raise AccessDenied("Invalid tenant or token version")
            # 'acct' is an optional ACCESS-TOKEN claim configured on the shared registration.
            # Missing, guest, or unexpected values fail closed.
            if str(claims["acct"]) != "0":
                raise AccessDenied("FSP member account required")
            if "access_as_user" not in str(claims["scp"]).split():
                raise AccessDenied("Required delegated scope absent")
            if claims["azp"] != self.settings.client_id:
                raise AccessDenied("Unapproved client application")
            if not UUID(claims["oid"]).int:
                raise AccessDenied("User identity absent")
            return claims
        except (AccessDenied, KeysUnavailable):
            raise
        except (jwt.PyJWTError, ValueError, TypeError, KeyError) as exc:
            raise AccessDenied("Invalid access token") from exc
