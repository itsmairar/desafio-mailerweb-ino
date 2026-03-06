from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List
from sqlalchemy import select

from app.core.auth.deps import SessionDep
from app.models.room import Room
from app.api.v1.endpoints.booking import CurrentUser

router = APIRouter()


class RoomCreateSchema(BaseModel):
    name: str = Field(..., max_length=100)
    capacity: int = Field(..., gt=0)


class RoomResponseSchema(BaseModel):
    id: int
    name: str
    capacity: int

    model_config = {"from_attributes": True}


@router.post(
    "/", response_model=RoomResponseSchema, status_code=status.HTTP_201_CREATED
)
async def create_room(
    payload: RoomCreateSchema, session: SessionDep, user_id: int = CurrentUser
):
    existing = await session.execute(select(Room).where(Room.name == payload.name))
    if existing.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Room name already exists",
        )

    room = Room(name=payload.name, capacity=payload.capacity)
    session.add(room)
    await session.commit()
    await session.refresh(room)
    return room


@router.get("/", response_model=List[RoomResponseSchema])
async def list_rooms(session: SessionDep):
    result = await session.execute(select(Room))
    return result.scalars().all()


@router.get("/{room_id}", response_model=RoomResponseSchema)
async def get_room(room_id: int, session: SessionDep):
    result = await session.execute(select(Room).where(Room.id == room_id))
    room = result.scalars().first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room
