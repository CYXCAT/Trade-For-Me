import hashlib

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.api_key import APIKey
from app.models.user import User


def main():
    db = SessionLocal()
    try:
        user = db.execute(select(User).where(User.email == "demo@local.dev")).scalar_one_or_none()
        if not user:
            user = User(
                email="demo@local.dev",
                password_hash=hashlib.sha256("demo-password".encode()).hexdigest(),
                name="Demo User",
                status="active",
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        key = db.execute(select(APIKey).where(APIKey.key == "dev-demo-key")).scalar_one_or_none()
        if not key:
            key = APIKey(
                key="dev-demo-key",
                user_id=user.id,
                name="demo-frontend-key",
                status="active",
            )
            db.add(key)
            db.commit()
        print("Seed done: demo@local.dev / dev-demo-key")
    finally:
        db.close()


if __name__ == "__main__":
    main()
