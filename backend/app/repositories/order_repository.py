import uuid
import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.order import Order

logger = logging.getLogger(__name__)


class OrderRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def insert(self, order: Order) -> Order:
        self._session.add(order)
        await self._session.flush()
        await self._session.refresh(order)
        logger.debug("Inserted order id=%s", order.id)
        return order

    async def get_by_id(self, order_id: uuid.UUID) -> Order | None:
        result = await self._session.execute(
            select(Order)
            .where(Order.id == order_id)
            .options(selectinload(Order.menu_items))
        )
        return result.scalar_one_or_none()
