import pytest
from httpx import AsyncClient
from app.models.room import Room
from app.models.outbox import OutboxEvent
from sqlalchemy import select


@pytest.mark.asyncio
async def test_create_user(client: AsyncClient):
    response = await client.post(
        "/api/v1/user/",
        json={"username": "newuser", "email": "new@email.com", "password": "pass"},
    )
    assert response.status_code == 201
    assert response.json()["username"] == "newuser"


@pytest.mark.asyncio
async def test_create_room(client: AsyncClient, auth_token: str):
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = await client.post(
        "/api/v1/rooms/",
        json={"name": "Sala de Testes", "capacity": 10},
        headers=headers,
    )
    assert response.status_code == 201
    assert response.json()["id"] == 1


@pytest.mark.asyncio
async def test_create_booking_and_outbox(
    client: AsyncClient, auth_token: str, db_session
):
    headers = {"Authorization": f"Bearer {auth_token}"}

    resp_room = await client.post(
        "/api/v1/rooms/",
        json={"name": "Sala B", "capacity": 5},
        headers=headers,
    )
    room_id = resp_room.json()["id"]

    resp_short = await client.post(
        "/api/v1/bookings/",
        json={
            "room_id": room_id,
            "title": "Rapida",
            "start_at": "2026-03-10T14:00:00Z",
            "end_at": "2026-03-10T14:10:00Z",
            "participants": "ceo@example.com",
        },
        headers=headers,
    )
    assert resp_short.status_code == 400

    resp_success = await client.post(
        "/api/v1/bookings/",
        json={
            "room_id": room_id,
            "title": "Alinhamento",
            "start_at": "2026-03-10T14:00:00Z",
            "end_at": "2026-03-10T15:00:00Z",
            "participants": "techlead@example.com",
        },
        headers=headers,
    )
    assert resp_success.status_code == 201
    booking_id = resp_success.json()["id"]

    resp_conflict = await client.post(
        "/api/v1/bookings/",
        json={
            "room_id": room_id,
            "title": "Intersecção Proibida",
            "start_at": "2026-03-10T14:30:00Z",
            "end_at": "2026-03-10T15:30:00Z",
            "participants": "infiltrado@example.com",
        },
        headers=headers,
    )
    assert resp_conflict.status_code == 409

    res_outbox = await db_session.execute(select(OutboxEvent))
    outbox_event = res_outbox.scalars().first()

    assert outbox_event is not None
    assert outbox_event.event_type.value == "BOOKING_CREATED"
    assert outbox_event.status.value == "PENDING"

    resp_update = await client.put(
        f"/api/v1/bookings/{booking_id}",
        json={
            "title": "Alinhamento Atualizado",
            "start_at": "2026-03-10T16:00:00Z",
            "end_at": "2026-03-10T17:00:00Z",
            "participants": "techlead@example.com, diretor@example.com",
        },
        headers=headers,
    )
    assert resp_update.status_code == 200
    assert resp_update.json()["title"] == "Alinhamento Atualizado"

    resp_cancel = await client.delete(f"/api/v1/bookings/{booking_id}", headers=headers)
    assert resp_cancel.status_code == 200
    assert resp_cancel.json()["status"] == "CANCELED"

    resp_edit_canceled = await client.put(
        f"/api/v1/bookings/{booking_id}",
        json={
            "title": "Tentar editar algo morto",
            "start_at": "2026-03-10T16:00:00Z",
            "end_at": "2026-03-10T17:00:00Z",
            "participants": "techlead@example.com",
        },
        headers=headers,
    )
    assert resp_edit_canceled.status_code == 400
    assert resp_edit_canceled.json()["detail"] == "Cannot edit a canceled booking"
