from sqlalchemy.orm import Session
from database.models import User
from user.security import get_password_hash, verify_password

def create_user(db: Session, email: str, password: str):
    user_db = db.query(User).filter(User.email == email).first()
    if user_db:
        raise ValueError("Пользователь с таким email уже существует")

    hashed = get_password_hash(password)
    new_user = User(email=email, hashed_password=hashed)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

def authenticate_user(db: Session, email: str, password: str):
    user_db = db.query(User).filter(User.email == email).first()
    if not user_db:
        return None
    if not verify_password(password, user_db.hashed_password):
        return None
    return user_db
