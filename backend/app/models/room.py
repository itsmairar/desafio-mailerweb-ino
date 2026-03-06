from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Integer
from sqlalchemy.orm import relationship

from app.core.configs import DBBaseModel


class Room(DBBaseModel):
    __tablename__ = "rooms"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    capacity: Mapped[int] = mapped_column(Integer)

    bookings: Mapped[list["Booking"]] = relationship("Booking", back_populates="room")
