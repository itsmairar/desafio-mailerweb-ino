import pytest
from httpx import AsyncClient
from app.models.room import Room
from app.models.outbox import OutboxEvent, OutboxStatus
from worker import process_events_batch
from sqlalchemy import select


@pytest.mark.asyncio
async def test_booking_duration_validation(
    client: AsyncClient, auth_token: str, db_session
):
    headers = {"Authorization": f"Bearer {auth_token}"}

    room = Room(name="Sala Validation", capacity=5)
    db_session.add(room)
    await db_session.commit()
    await db_session.refresh(room)

    resp_8h = await client.post(
        "/api/v1/bookings/",
        json={
            "room_id": room.id,
            "title": "Maratona",
            "start_at": "2026-03-10T08:00:00Z",
            "end_at": "2026-03-10T17:00:00Z",
            "participants": "ceo@example.com",
        },
        headers=headers,
    )
    assert resp_8h.status_code == 400
    assert "Maximum duration is 8 hours" in resp_8h.json()["detail"]

    resp_start = await client.post(
        "/api/v1/bookings/",
        json={
            "room_id": room.id,
            "title": "Invertida",
            "start_at": "2026-03-10T15:00:00Z",
            "end_at": "2026-03-10T14:00:00Z",
            "participants": "ceo@example.com",
        },
        headers=headers,
    )
    assert resp_start.status_code == 400
    assert "start_at must be before end_at" in resp_start.json()["detail"]


@pytest.mark.asyncio
async def test_worker_processing_and_idempotency(db_session):
    event1 = OutboxEvent(
        event_type="BOOKING_CREATED",
        payload={
            "title": "Test Email",
            "start_at": "2026-03-10T14:00:00Z",
            "end_at": "2026-03-10T15:00:00Z",
            "participants": "valid@email.com",
            "room_id": 999,
        },
        status=OutboxStatus.PENDING,
    )

    event2 = OutboxEvent(
        event_type="BOOKING_CANCELED",
        payload={
            "title": "Invalid Participants",
            "start_at": "2026-03-10T14:00:00Z",
            "end_at": "2026-03-10T15:00:00Z",
            "participants": "",
            "room_id": 999,
        },
        status=OutboxStatus.PENDING,
    )

    db_session.add(event1)
    db_session.add(event2)
    await db_session.commit()

    count = await process_events_batch(db_session)
    assert count >= 2

    await db_session.refresh(event1)
    await db_session.refresh(event2)

    assert event1.status == OutboxStatus.PROCESSED
    assert event2.status == OutboxStatus.FAILED
    assert "No valid participants." in event2.error_message

    await db_session.commit()

    count2 = await process_events_batch(db_session)
    assert count2 == 0
