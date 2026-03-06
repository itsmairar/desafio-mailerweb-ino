from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from app.core.configs import settings

engine = create_async_engine(settings.DB_URL, echo=False)

Session = async_sessionmaker(
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    bind=engine,
)
