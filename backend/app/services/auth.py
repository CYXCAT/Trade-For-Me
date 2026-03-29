from datetime import datetime, timezone

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.api_key import APIKey
from app.models.user import User


def require_active_user(
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
    db: Session = Depends(get_db),
) -> User:
    if not x_api_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing API key")

    stmt = select(APIKey).where(APIKey.key == x_api_key)
    key_row = db.execute(stmt).scalar_one_or_none()
    if not key_row or key_row.status != "active":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")

    user_row = db.get(User, key_row.user_id)
    if not user_row or user_row.status != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is not active")

    key_row.last_used_at = datetime.now(timezone.utc)
    db.commit()
    return user_row
