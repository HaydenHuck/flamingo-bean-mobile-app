import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from fastapi import Depends, HTTPException, Request, status
import jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.admin_user import AdminUser

ADMIN_SESSION_COOKIE = "flamingo_bean_admin_session"
SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}
ALLOWED_JWT_ALGORITHMS = {"HS256", "HS384", "HS512"}

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def create_admin_session(admin_user: AdminUser) -> tuple[str, str]:
    now = datetime.now(timezone.utc)
    csrf_token = secrets.token_urlsafe(32)
    payload: dict[str, Any] = {
        "sub": str(admin_user.id),
        "email": admin_user.email,
        "role": admin_user.role,
        "csrf": csrf_token,
        "iat": now,
        "exp": now + timedelta(minutes=get_jwt_expire_minutes()),
    }
    token = jwt.encode(payload, get_jwt_secret_key(), algorithm=get_jwt_algorithm())
    return token, csrf_token


def get_current_admin_user(
    request: Request, db: Session = Depends(get_db)
) -> AdminUser:
    token = request.cookies.get(ADMIN_SESSION_COOKIE)
    if not token:
        raise admin_auth_error("Missing admin session.")

    try:
        payload = jwt.decode(
            token, get_jwt_secret_key(), algorithms=[get_jwt_algorithm()]
        )
        admin_user_id = int(payload.get("sub", ""))
        csrf_claim = payload.get("csrf")
    except (jwt.PyJWTError, TypeError, ValueError) as exc:
        raise admin_auth_error("Invalid or expired admin session.") from exc

    if request.method.upper() not in SAFE_METHODS:
        csrf_header = request.headers.get("X-CSRF-Token")
        if (
            not isinstance(csrf_claim, str)
            or not csrf_header
            or not hmac.compare_digest(csrf_claim, csrf_header)
        ):
            raise HTTPException(status_code=403, detail="CSRF validation failed.")

    admin_user = db.query(AdminUser).filter(AdminUser.id == admin_user_id).first()
    if not admin_user:
        raise admin_auth_error("Admin user not found.")
    if not admin_user.active:
        raise HTTPException(status_code=403, detail="Admin user is inactive.")
    return admin_user


def get_admin_csrf_token(request: Request) -> str:
    token = request.cookies.get(ADMIN_SESSION_COOKIE)
    if not token:
        raise admin_auth_error("Missing admin session.")
    try:
        payload = jwt.decode(
            token, get_jwt_secret_key(), algorithms=[get_jwt_algorithm()]
        )
    except jwt.PyJWTError as exc:
        raise admin_auth_error("Invalid or expired admin session.") from exc
    csrf_token = payload.get("csrf")
    if not isinstance(csrf_token, str) or not csrf_token:
        raise admin_auth_error("Invalid admin session.")
    return csrf_token


def admin_auth_error(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


def get_jwt_secret_key() -> str:
    secret_key = os.getenv("JWT_SECRET_KEY", "")
    if len(secret_key) < 32:
        raise RuntimeError("JWT_SECRET_KEY must contain at least 32 characters.")
    return secret_key


def get_jwt_algorithm() -> str:
    algorithm = os.getenv("JWT_ALGORITHM", "HS256")
    if algorithm not in ALLOWED_JWT_ALGORITHMS:
        raise RuntimeError("JWT_ALGORITHM must be HS256, HS384, or HS512.")
    return algorithm


def get_jwt_expire_minutes() -> int:
    raw_value = os.getenv("JWT_EXPIRE_MINUTES", "30")
    try:
        expire_minutes = int(raw_value)
    except ValueError as exc:
        raise RuntimeError("JWT_EXPIRE_MINUTES must be an integer.") from exc
    if not 1 <= expire_minutes <= 120:
        raise RuntimeError("JWT_EXPIRE_MINUTES must be between 1 and 120.")
    return expire_minutes


def get_cookie_secure() -> bool:
    raw_value = os.getenv("ADMIN_COOKIE_SECURE", "true").lower()
    if raw_value not in {"true", "false"}:
        raise RuntimeError("ADMIN_COOKIE_SECURE must be true or false.")
    return raw_value == "true"


def get_cookie_samesite() -> Literal["lax", "strict"]:
    value = os.getenv("ADMIN_COOKIE_SAMESITE", "strict").lower()
    if value not in {"lax", "strict"}:
        raise RuntimeError("ADMIN_COOKIE_SAMESITE must be lax or strict.")
    return value
