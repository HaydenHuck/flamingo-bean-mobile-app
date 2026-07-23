from __future__ import annotations

import os
from dataclasses import dataclass

import firebase_admin
from fastapi import Header, HTTPException, status
from firebase_admin import auth, credentials


class FirebaseAuthConfigurationError(Exception):
    pass


@dataclass(frozen=True)
class FirebaseUser:
    uid: str
    email: str | None
    email_verified: bool


def get_current_customer(
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> FirebaseUser:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Firebase authentication is required.",
        )

    return verify_authorization_header(authorization)


def get_optional_current_customer(
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> FirebaseUser | None:
    if not authorization:
        return None

    return verify_authorization_header(authorization)


def verify_authorization_header(authorization: str) -> FirebaseUser:
    scheme, _, token = authorization.partition(" ")

    if scheme.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header must use Bearer token format.",
        )

    try:
        decoded_token = auth.verify_id_token(token, app=get_firebase_app())
    except FirebaseAuthConfigurationError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Firebase token.") from exc

    return FirebaseUser(
        uid=str(decoded_token["uid"]),
        email=decoded_token.get("email"),
        email_verified=bool(decoded_token.get("email_verified", False)),
    )


def get_firebase_app() -> firebase_admin.App:
    if firebase_admin._apps:
        return firebase_admin.get_app()

    project_id = os.getenv("FIREBASE_PROJECT_ID")
    credentials_path = os.getenv("FIREBASE_CREDENTIALS_PATH")

    if not project_id or not credentials_path:
        raise FirebaseAuthConfigurationError(
            "FIREBASE_PROJECT_ID and FIREBASE_CREDENTIALS_PATH are required for customer authentication."
        )

    if not os.path.exists(credentials_path):
        raise FirebaseAuthConfigurationError("Firebase service account file was not found.")

    firebase_credentials = credentials.Certificate(credentials_path)
    return firebase_admin.initialize_app(firebase_credentials, {"projectId": project_id})
