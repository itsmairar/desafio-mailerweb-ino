from fastapi import APIRouter

from app.api.v1.endpoints import user, booking, room

api_router = APIRouter()
api_router.include_router(user.router, prefix="/user", tags=["user"])
api_router.include_router(booking.router, prefix="/bookings", tags=["booking"])
api_router.include_router(room.router, prefix="/rooms", tags=["room"])
