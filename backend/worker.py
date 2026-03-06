import asyncio
import logging
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi_mail import FastMail, MessageSchema

from app.core.configs import config
from app.core.database import Session
from app.models.outbox import OutboxEvent, OutboxStatus

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def process_events_batch(session: AsyncSession) -> int:
    processed_count = 0
    async with session.begin():
        stmt = (
            select(OutboxEvent)
            .where(OutboxEvent.status == OutboxStatus.PENDING)
            .order_by(OutboxEvent.created_at.asc())
            .with_for_update(skip_locked=True)
        )

        result = await session.execute(stmt)
        events = result.scalars().all()

        if not events:
            return 0

        for event in events:
            logger.info(f"Processing event: {event.id} of type {event.event_type}")
            processed_count += 1

            payload = event.payload
            participants = payload.get("participants", "")
            recipients = [
                email.strip() for email in participants.split(",") if email.strip()
            ]

            if not recipients:
                event.status = OutboxStatus.FAILED
                event.error_message = "No valid participants."
                continue

            body = f"""
                <h3>Notificação de Sala de Reunião</h3>
                <p><strong>Operação:</strong> {event.event_type.value}</p>
                <p><strong>Reunião:</strong> {payload.get('title')}</p>
                <p><strong>Início:</strong> {payload.get('start_at')}</p>
                <p><strong>Fim:</strong> {payload.get('end_at')}</p>
            """

            message = MessageSchema(
                subject=f"Aviso de Reserva: {payload.get('title')}",
                recipients=recipients,
                body=body,
                subtype="html",
            )

            try:
                fm = FastMail(config)
                await fm.send_message(message)

                event.status = OutboxStatus.PROCESSED
                event.processed_at = datetime.utcnow()
                logger.info(f"Event {event.id} PROCESSED successfully.")

            except Exception as e:
                logger.error(f"Failed to process event {event.id}: {str(e)}")
                event.retry_count += 1
                if event.retry_count >= 3:
                    event.status = OutboxStatus.FAILED
                    event.error_message = str(e)
    return processed_count


async def process_outbox_events():
    while True:
        try:
            async with Session() as session:
                await process_events_batch(session)
        except Exception as e:
            logger.error(f"Worker critical loop error: {str(e)}")

        await asyncio.sleep(5)


if __name__ == "__main__":
    logger.info("Starting Async Notification Worker...")
    asyncio.run(process_outbox_events())
