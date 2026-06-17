import uuid
import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.guest_selection import GuestSelection

logger = logging.getLogger(__name__)


class GuestSelectionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def insert(self, sel: GuestSelection) -> GuestSelection:
        self._session.add(sel)
        await self._session.flush()
        await self._session.refresh(sel)
        logger.debug("Inserted guest_selection id=%s guest_id=%s", sel.id, sel.guest_id)
        return sel

    async def get_by_id_and_guest(
        self, selection_id: uuid.UUID, guest_id: uuid.UUID
    ) -> GuestSelection | None:
        result = await self._session.execute(
            select(GuestSelection).where(
                GuestSelection.id == selection_id,
                GuestSelection.guest_id == guest_id,
            )
        )
        return result.scalar_one_or_none()

    async def delete(self, sel: GuestSelection) -> None:
        await self._session.delete(sel)
        await self._session.flush()
        logger.debug("Deleted guest_selection id=%s", sel.id)
