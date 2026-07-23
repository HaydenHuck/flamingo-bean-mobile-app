import os
import sys
from pathlib import Path

from dotenv import load_dotenv

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.core.security import hash_password  # noqa: E402
from app.database import SessionLocal, ensure_database_is_migrated  # noqa: E402
from app.models.admin_user import AdminUser  # noqa: E402


def main() -> None:
    load_dotenv()
    email = os.getenv("ADMIN_EMAIL", "").lower().strip()
    password = os.getenv("ADMIN_PASSWORD", "")

    if not email or not password:
        raise RuntimeError(
            "ADMIN_EMAIL and ADMIN_PASSWORD are required to create a local admin user."
        )

    if len(password) < 8:
        raise RuntimeError("ADMIN_PASSWORD must be at least 8 characters long.")

    ensure_database_is_migrated()
    db = SessionLocal()

    try:
        admin_user = db.query(AdminUser).filter(AdminUser.email == email).first()

        if admin_user:
            admin_user.password_hash = hash_password(password)
            admin_user.role = "admin"
            admin_user.active = True
            message = f"Updated admin user {email}."
        else:
            db.add(
                AdminUser(
                    email=email,
                    password_hash=hash_password(password),
                    role="admin",
                    active=True,
                )
            )
            message = f"Created admin user {email}."

        db.commit()
        print(message)
    finally:
        db.close()


if __name__ == "__main__":
    main()
