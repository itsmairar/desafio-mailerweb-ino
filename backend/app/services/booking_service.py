from datetime import timedelta, datetime
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_
from fastapi import HTTPException, status
import json

from app.models.booking import Booking, BookingStatus
from app.models.room import Room
from app.models.outbox import OutboxEvent, EventType, OutboxStatus


class BookingService:
    @staticmethod
    async def get_room_by_id(session: AsyncSession, room_id: int) -> Room:
        result = await session.execute(select(Room).where(Room.id == room_id))
        room = result.scalars().first()
        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Room not found"
            )
        return room

    @staticmethod
    def validate_booking_duration(start_at: datetime, end_at: datetime):
        if start_at >= end_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="start_at must be before end_at",
            )

        duration = end_at - start_at
        if duration < timedelta(minutes=15):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Minimum duration is 15 minutes",
            )
        if duration > timedelta(hours=8):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum duration is 8 hours",
            )

    @staticmethod
    async def check_overlap(
        session: AsyncSession,
        room_id: int,
        start_at: datetime,
        end_at: datetime,
        exclude_booking_id: Optional[int] = None,
    ):

        stmt = (
            select(Booking)
            .where(Booking.room_id == room_id)
            .where(Booking.status == BookingStatus.ACTIVE)
            .where(and_(start_at < Booking.end_at, end_at > Booking.start_at))
            .with_for_update()
        )

        if exclude_booking_id:
            stmt = stmt.where(Booking.id != exclude_booking_id)

        result = await session.execute(stmt)
        overlap = result.scalars().first()

        if overlap:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Room is already booked during this time (Conflicts with Booking ID: {overlap.id})",
            )

    @staticmethod
    async def create_outbox_event(
        session: AsyncSession, event_type: EventType, booking: Booking
    ):
        payload = {
            "booking_id": booking.id,
            "title": booking.title,
            "room_id": booking.room_id,
            "start_at": booking.start_at.isoformat(),
            "end_at": booking.end_at.isoformat(),
            "participants": booking.participants,
            "status": booking.status.value,
        }

        event = OutboxEvent(
            event_type=event_type, payload=payload, status=OutboxStatus.PENDING
        )
        session.add(event)

    @staticmethod
    async def create_booking(
        session: AsyncSession,
        user_id: int,
        room_id: int,
        title: str,
        start_at: datetime,
        end_at: datetime,
        participants: str,
    ) -> Booking:
        BookingService.validate_booking_duration(start_at, end_at)
        await BookingService.get_room_by_id(session, room_id)

        await BookingService.check_overlap(session, room_id, start_at, end_at)

        booking = Booking(
            title=title,
            start_at=start_at,
            end_at=end_at,
            participants=participants,
            user_id=user_id,
            room_id=room_id,
            status=BookingStatus.ACTIVE,
        )
        session.add(booking)
        await session.flush()

        await BookingService.create_outbox_event(
            session, EventType.BOOKING_CREATED, booking
        )
        await session.commit()
        await session.refresh(booking)

        return booking

    @staticmethod
    async def update_booking(
        session: AsyncSession,
        user_id: int,
        booking_id: int,
        title: str,
        start_at: datetime,
        end_at: datetime,
        participants: str,
    ) -> Booking:
        BookingService.validate_booking_duration(start_at, end_at)

        result = await session.execute(
            select(Booking).where(Booking.id == booking_id).with_for_update()
        )
        booking = result.scalars().first()
        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found"
            )

        if booking.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only edit your own bookings",
            )

        if booking.status == BookingStatus.CANCELED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot edit a canceled booking",
            )

        await BookingService.check_overlap(
            session,
            booking.room_id,
            start_at,
            end_at,
            exclude_booking_id=booking.id,
        )

        booking.title = title
        booking.start_at = start_at
        booking.end_at = end_at
        booking.participants = participants

        await session.flush()
        await BookingService.create_outbox_event(
            session, EventType.BOOKING_UPDATED, booking
        )
        await session.commit()
        await session.refresh(booking)

        return booking

    @staticmethod
    async def cancel_booking(
        session: AsyncSession, user_id: int, booking_id: int
    ) -> Booking:
        result = await session.execute(
            select(Booking).where(Booking.id == booking_id).with_for_update()
        )
        booking = result.scalars().first()
        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found"
            )

        if booking.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only cancel your own bookings",
            )

        if booking.status == BookingStatus.CANCELED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Booking is already canceled",
            )

        booking.status = BookingStatus.CANCELED

        await session.flush()
        await BookingService.create_outbox_event(
            session, EventType.BOOKING_CANCELED, booking
        )
        await session.commit()
        await session.refresh(booking)

        return booking
