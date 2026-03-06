import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from fastapi import FastAPI

from app.core.configs import DBBaseModel
from app.core.auth.deps import get_session
from main import app as actual_app
from app.core.auth.security import generate_password_hash
from app.models.user import User
from app.models.room import Room

DATABASE_URL_TEST = "sqlite+aiosqlite:///:memory:"

engine_test = create_async_engine(DATABASE_URL_TEST, echo=False)
TestingSessionLocal = async_sessionmaker(
    autocommit=False, autoflush=False, bind=engine_test
)


@pytest_asyncio.fixture(scope="session", autouse=True)
async def create_test_db():
    async with engine_test.begin() as conn:
        await conn.run_sync(DBBaseModel.metadata.create_all)
    yield
    async with engine_test.begin() as conn:
        await conn.run_sync(DBBaseModel.metadata.drop_all)


@pytest_asyncio.fixture()
async def db_session():
    async with TestingSessionLocal() as session:
        yield session
        await session.rollback()


@pytest.fixture()
def app(db_session):
    async def override_get_session():
        yield db_session

    actual_app.dependency_overrides[get_session] = override_get_session
    yield actual_app
    actual_app.dependency_overrides.clear()


@pytest_asyncio.fixture()
async def client(app: FastAPI):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture()
async def auth_token(client: AsyncClient, db_session):
    from sqlalchemy import select

    result = await db_session.execute(select(User).where(User.username == "tester"))
    user = result.scalars().first()
    if not user:
        user = User(
            username="tester",
            email="test@example.com",
            hashed_password=generate_password_hash("testpass"),
        )
        db_session.add(user)
        await db_session.commit()

    response = await client.post(
        "/api/v1/user/login", json={"username": "tester", "password": "testpass"}
    )
    return response.json()["access_token"]
