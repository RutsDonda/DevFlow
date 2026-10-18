"""
app/core/firebase.py – Firebase Admin SDK initialisation and ID-token verification.

Credentials, in order of preference:
  1. FIREBASE_CREDENTIALS_JSON – the service-account JSON as a string
  2. FIREBASE_CREDENTIALS_PATH – path to the service-account JSON file
  3. Neither – project-ID-only mode. Verifying ID tokens only needs the project ID
     (Google's public signing keys are fetched automatically), so this is enough
     for this API. A service account is needed only for admin features such as
     checking revoked tokens or managing users.
"""

import json
import logging
from dataclasses import dataclass

import firebase_admin
from firebase_admin import auth, credentials
from google.auth.credentials import AnonymousCredentials

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class FirebaseUser:
    """The authenticated caller, built from verified ID-token claims."""

    uid: str
    email: str | None
    name: str | None
    picture: str | None
    email_verified: bool
    sign_in_provider: str | None


class _AnonymousCredential(credentials.Base):
    """Project-ID-only mode: ID-token checks use public keys, so no Google credentials are needed."""

    def get_credential(self):
        return AnonymousCredentials()


def init_firebase() -> None:
    if firebase_admin._apps:
        return

    cred = None
    if settings.firebase_credentials_json:
        cred = credentials.Certificate(json.loads(settings.firebase_credentials_json))
    elif settings.firebase_credentials_path:
        cred = credentials.Certificate(settings.firebase_credentials_path)

    options = {"projectId": settings.firebase_project_id} if settings.firebase_project_id else None
    if cred is None and not options:
        logger.warning("Neither Firebase credentials nor FIREBASE_PROJECT_ID are set – all API calls will be rejected.")

    firebase_admin.initialize_app(cred or _AnonymousCredential(), options)
    logger.info(
        "Firebase Admin initialised (%s)",
        "service account" if cred else f"project-id only: {settings.firebase_project_id or '<unset>'}",
    )


def verify_id_token(id_token: str) -> FirebaseUser:
    """Verify a Firebase ID token (signature, expiry, audience). Raises on failure. Blocking."""
    claims = auth.verify_id_token(id_token, clock_skew_seconds=10)
    return FirebaseUser(
        uid=claims["uid"],
        email=claims.get("email"),
        name=claims.get("name"),
        picture=claims.get("picture"),
        email_verified=bool(claims.get("email_verified")),
        sign_in_provider=(claims.get("firebase") or {}).get("sign_in_provider"),
    )
