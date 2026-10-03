import sys

from sqlalchemy import select

from app.core.config import settings
from app.core.security import hash_password
from app.db.database import SessionLocal
from app.db.models.user import User
from app.models.enums import UserRole


def main() -> int:
    if not all(
        [
            settings.bootstrap_admin_name,
            settings.bootstrap_admin_email,
            settings.bootstrap_admin_password,
        ]
    ):
        print("Bootstrap admin settings are incomplete.")
        return 1

    with SessionLocal() as db:
        existing_admin = db.scalar(
            select(User).where(User.role == UserRole.ADMIN).limit(1)
        )
        if existing_admin:
            print("An admin already exists. No changes made.")
            return 0

        existing_user = db.scalar(
            select(User).where(User.email == settings.bootstrap_admin_email)
        )
        if existing_user:
            existing_user.role = UserRole.ADMIN
            db.commit()
            print("Existing user promoted to admin.")
            return 0

        user = User(
            name=settings.bootstrap_admin_name,
            email=settings.bootstrap_admin_email,
            password_hash=hash_password(settings.bootstrap_admin_password),
            role=UserRole.ADMIN,
        )
        db.add(user)
        db.commit()
        print("Bootstrap admin created.")
        return 0


if __name__ == "__main__":
    sys.exit(main())
