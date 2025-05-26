from sqlalchemy.orm import Session
from Backend.database.models import User
from Backend.user.security import get_password_hash


def create_admin(
    db: Session,
    email: str = "admin@mail.com",
    password: str = "admin",
    role: str = "admin",
):
    user_db = db.query(User).filter(User.email == email, User.role == role).first()
    if not user_db:
        hashed = get_password_hash(password)
        new_user = User(email=email, hashed_password=hashed, role=role)
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        print("Админ успешно создан")
    else:
        print("Админ уже создан")
