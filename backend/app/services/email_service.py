"""Email service: composes and dispatches the order overview email.

This service is intentionally read-only with respect to the order — it never
mutates the order row and never calls session.commit(). The closed-state guard
is enforced server-side here so the restriction holds across all sessions
(AC6, AC1).
"""

import logging
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import EmailSendError, OrderNotClosedError, OrderNotFoundError
from app.repositories.guest_repository import GuestRepository
from app.repositories.order_repository import OrderRepository
from app.schemas.email import OrderEmailResult, OrderEmailSend
from app.services.email_builder import build_order_email
from app.services.email_sender import EmailSender
from app.services.export_builder import build_export

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self, session: AsyncSession, sender: EmailSender) -> None:
        self._session = session
        self._sender = sender
        self._order_repo = OrderRepository(session)
        self._guest_repo = GuestRepository(session)

    async def send_order_email(
        self, order_id: uuid.UUID, payload: OrderEmailSend
    ) -> OrderEmailResult:
        """Send the consolidated order overview to the given recipients.

        Steps:
        1. Load the order; raise OrderNotFoundError if missing.
        2. Enforce closed state (server-side guard); raise OrderNotClosedError if open.
        3. Load guests and rebuild the consolidated export.
        4. Compose email content via the pure email_builder.
        5. Dispatch via the injected EmailSender; wrap any error as EmailSendError.
        6. Return OrderEmailResult — no order mutation, no session.commit().
        """
        order = await self._order_repo.get_by_id(order_id)
        if order is None:
            raise OrderNotFoundError(str(order_id))

        if order.state != "closed":
            raise OrderNotClosedError()

        guests = await self._guest_repo.list_by_order(order_id)
        export = build_export(order.id, order.restaurant_name, guests)
        content = build_order_email(export)

        try:
            await self._sender.send(
                to=payload.to,
                cc=payload.cc,
                bcc=payload.bcc,
                subject=content.subject,
                body=content.body,
            )
        except Exception as exc:
            logger.error(
                "Email send failed: order_id=%s to=%s error=%s",
                order_id,
                payload.to,
                exc,
                exc_info=True,
            )
            raise EmailSendError(str(exc)) from exc

        logger.info(
            "Order email dispatched: order_id=%s to=%s cc=%s bcc=%s",
            order_id,
            payload.to,
            payload.cc,
            payload.bcc,
        )
        return OrderEmailResult(
            status="sent",
            to=payload.to,
            cc=payload.cc,
            bcc=payload.bcc,
        )
