from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from app.models.user import User
from sqlalchemy import select

from app.core.auth.deps import SessionDep, validate_form_token
from app.services.booking_service import BookingService
from app.models.booking import Booking, BookingStatus

router = APIRouter()


class BookingCreateSchema(BaseModel):
    room_id: int
    title: str = Field(..., max_length=200)
    start_at: datetime
    end_at: datetime
    participants: str = Field(..., description="Comma separated e-mail participants")


class BookingUpdateSchema(BaseModel):
    title: str = Field(..., max_length=200)
    start_at: datetime
    end_at: datetime
    participants: str


class BookingResponseSchema(BaseModel):
    id: int
    room_id: int
    user_id: int
    title: str
    start_at: datetime
    end_at: datetime
    status: BookingStatus
    participants: str

    model_config = {"from_attributes": True}


async def get_current_user_id(
    session: SessionDep, username: str = Depends(validate_form_token)
) -> int:
    result = await session.execute(select(User).where(User.username == username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user.id


CurrentUser = Depends(get_current_user_id)


@router.post(
    "/", response_model=BookingResponseSchema, status_code=status.HTTP_201_CREATED
)
async def create_booking(
    payload: BookingCreateSchema, session: SessionDep, user_id: int = CurrentUser
):
    booking = await BookingService.create_booking(
        session=session,
        user_id=user_id,
        room_id=payload.room_id,
        title=payload.title,
        start_at=payload.start_at,
        end_at=payload.end_at,
        participants=payload.participants,
    )
    return booking


@router.put("/{booking_id}", response_model=BookingResponseSchema)
async def update_booking(
    booking_id: int,
    payload: BookingUpdateSchema,
    session: SessionDep,
    user_id: int = CurrentUser,
):
    booking = await BookingService.update_booking(
        session=session,
        user_id=user_id,
        booking_id=booking_id,
        title=payload.title,
        start_at=payload.start_at,
        end_at=payload.end_at,
        participants=payload.participants,
    )
    return booking


@router.delete("/{booking_id}", response_model=BookingResponseSchema)
async def cancel_booking(
    booking_id: int, session: SessionDep, user_id: int = CurrentUser
):
    booking = await BookingService.cancel_booking(
        session=session, user_id=user_id, booking_id=booking_id
    )
    return booking


@router.get("/", response_model=List[BookingResponseSchema])
async def list_bookings(session: SessionDep, user_id: int = CurrentUser):
    result = await session.execute(select(Booking))
    return result.scalars().all()
