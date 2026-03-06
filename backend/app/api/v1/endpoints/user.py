from typing import List
from fastapi import APIRouter, HTTPException, status
from sqlalchemy.future import select

from app.core.auth.auth import create_token_form_access
from app.core.auth.deps import SessionDep
from app.core.auth.security import generate_password_hash, verify_password
from app.models.user import User as UserModel
from app.schemas.user_schema import User, UserCreate, UserLoginSchema

router = APIRouter()


@router.post("/", response_model=User, status_code=status.HTTP_201_CREATED)
async def create_user(user: UserCreate, session: SessionDep):
    result = await session.execute(select(UserModel).filter_by(email=user.email))
    existing_user = result.scalars().first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    result_username = await session.execute(
        select(UserModel).filter_by(username=user.username)
    )
    if result_username.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )

    hashed_password = generate_password_hash(user.password)
    db_user = UserModel(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
    )
    session.add(db_user)
    await session.commit()
    await session.refresh(db_user)

    return db_user


@router.post("/login", status_code=status.HTTP_200_OK)
async def login(user_login: UserLoginSchema, session: SessionDep):
    result = await session.execute(
        select(UserModel).filter_by(username=user_login.username)
    )
    user = result.scalars().first()

    if user is None or not verify_password(user_login.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_token_form_access(sub=user.username)
    return {"access_token": token, "token_type": "bearer"}
