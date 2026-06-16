import uuid
import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.menu_item import MenuItem

logger = logging.getLogger(__name__)


class MenuItemRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def insert(self, item: MenuItem) -> MenuItem:
        self._session.add(item)
        await self._session.flush()
        await self._session.refresh(item)
        logger.debug("Inserted menu item id=%s order_id=%s", item.id, item.order_id)
        return item

    async def get_by_id_and_order(
        self, item_id: uuid.UUID, order_id: uuid.UUID
    ) -> MenuItem | None:
        result = await self._session.execute(
            select(MenuItem).where(
                MenuItem.id == item_id, MenuItem.order_id == order_id
            )
        )
        return result.scalar_one_or_none()

    async def delete(self, item: MenuItem) -> None:
        await self._session.delete(item)
        await self._session.flush()
        logger.debug("Deleted menu item id=%s", item.id)

    async def list_by_order(self, order_id: uuid.UUID) -> list[MenuItem]:
        result = await self._session.execute(
            select(MenuItem).where(MenuItem.order_id == order_id)
        )
        return list(result.scalars().all())
