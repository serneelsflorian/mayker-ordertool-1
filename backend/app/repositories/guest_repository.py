import uuid
import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.guest import Guest
from app.models.guest_selection import GuestSelection

logger = logging.getLogger(__name__)


class GuestRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def insert(self, guest: Guest) -> Guest:
        self._session.add(guest)
        await self._session.flush()
        await self._session.refresh(guest)
        logger.debug(
            "Inserted guest id=%s order_id=%s name=%s",
            guest.id,
            guest.order_id,
            guest.name,
        )
        return guest

    async def get_by_id(self, guest_id: uuid.UUID) -> Guest | None:
        result = await self._session.execute(
            select(Guest)
            .where(Guest.id == guest_id)
            .options(
                selectinload(Guest.selections).selectinload(GuestSelection.menu_item)
            )
            # Refresh already-identity-mapped instances so selection
            # mutations within a session are reflected in the reload.
            .execution_options(populate_existing=True)
        )
        return result.scalar_one_or_none()

    async def get_by_order_and_name(
        self, order_id: uuid.UUID, name: str
    ) -> Guest | None:
        result = await self._session.execute(
            select(Guest)
            .where(Guest.order_id == order_id, Guest.name == name)
            .options(
                selectinload(Guest.selections).selectinload(GuestSelection.menu_item)
            )
        )
        return result.scalar_one_or_none()

    async def list_by_order(self, order_id: uuid.UUID) -> list[Guest]:
        """All guests for an order, ordered by join time for a stable overview."""
        result = await self._session.execute(
            select(Guest)
            .where(Guest.order_id == order_id)
            .options(
                selectinload(Guest.selections).selectinload(GuestSelection.menu_item)
            )
            .order_by(Guest.created_at)
        )
        return list(result.scalars().all())
