from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.api import api_router
from app.core.configs import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.core.database import engine
    from app.core.configs import DBBaseModel

    import app.models.user
    import app.models.room
    import app.models.booking
    import app.models.outbox

    async with engine.begin() as conn:
        await conn.run_sync(DBBaseModel.metadata.create_all)
    yield


app = FastAPI(title=settings.TITLE, lifespan=lifespan)
app.include_router(api_router, prefix=settings.API_V1_STR)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
