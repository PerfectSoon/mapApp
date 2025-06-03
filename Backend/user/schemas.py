from pydantic import BaseModel, EmailStr
from Backend.database.models import UserRole


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: UserRole


class UserOut(BaseModel):
    id: int
    email: EmailStr
    role: UserRole

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str
