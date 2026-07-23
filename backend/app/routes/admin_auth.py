from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.core.rate_limit import rate_limit
from app.core.security import (
    ADMIN_SESSION_COOKIE,
    create_admin_session,
    get_admin_csrf_token,
    get_cookie_samesite,
    get_cookie_secure,
    get_current_admin_user,
    get_jwt_expire_minutes,
    verify_password,
)
from app.database import get_db
from app.models.admin_user import AdminUser
from app.schemas.auth import (
    AdminLoginRequest,
    AdminLoginResponse,
    AdminSessionResponse,
    AdminUserResponse,
)

router = APIRouter(prefix="/admin/auth", tags=["admin-auth"])


@router.post("/login", response_model=AdminLoginResponse)
def login_admin(
    credentials: AdminLoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> AdminLoginResponse:
    normalized_email = str(credentials.email).lower()
    rate_limit(request, "admin_login", identifier=normalized_email)
    admin_user = db.query(AdminUser).filter(AdminUser.email == normalized_email).first()
    if not admin_user or not verify_password(
        credentials.password, str(admin_user.password_hash)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin credentials.",
        )
    if not admin_user.active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin user is inactive."
        )

    token, csrf_token = create_admin_session(admin_user)
    response.set_cookie(
        key=ADMIN_SESSION_COOKIE,
        value=token,
        max_age=get_jwt_expire_minutes() * 60,
        httponly=True,
        secure=get_cookie_secure(),
        samesite=get_cookie_samesite(),
        path="/",
    )
    return AdminLoginResponse(
        admin=to_admin_user_response(admin_user), csrf_token=csrf_token
    )


@router.get("/me", response_model=AdminSessionResponse)
def get_current_admin(
    request: Request,
    admin_user: AdminUser = Depends(get_current_admin_user),
) -> AdminSessionResponse:
    return AdminSessionResponse(
        admin=to_admin_user_response(admin_user),
        csrf_token=get_admin_csrf_token(request),
    )


@router.post("/logout", status_code=204)
def logout_admin(
    response: Response,
    _: AdminUser = Depends(get_current_admin_user),
) -> Response:
    response.delete_cookie(
        key=ADMIN_SESSION_COOKIE,
        httponly=True,
        secure=get_cookie_secure(),
        samesite=get_cookie_samesite(),
        path="/",
    )
    response.status_code = 204
    return response


def to_admin_user_response(admin_user: AdminUser) -> AdminUserResponse:
    return AdminUserResponse(
        id=int(admin_user.id),
        email=str(admin_user.email),
        role=str(admin_user.role),
        active=bool(admin_user.active),
    )
