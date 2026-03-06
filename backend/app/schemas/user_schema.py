from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict


class UserLoginSchema(BaseModel):
    username: str
    password: str


class UserBase(BaseModel):
    username: str
    email: Optional[str]


class UserCreate(UserBase):
    password: str


class User(UserBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class EmailSchema(BaseModel):
    email: EmailStr
