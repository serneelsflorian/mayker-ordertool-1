import uuid
import logging
from decimal import Decimal, InvalidOperation
from sqlalchemy.ext.asyncio import AsyncSession
from app.constants import RESTAURANT_NAME
from app.exceptions import MenuItemNotFoundError, OrderNotFoundError, ValidationError
from app.models.menu_item import MenuItem
from app.models.order import Order
from app.repositories.menu_item_repository import MenuItemRepository
from app.repositories.order_repository import OrderRepository
from app.schemas.menu_item import MenuItemCreate

logger = logging.getLogger(__name__)


class OrderService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._order_repo = OrderRepository(session)
        self._item_repo = MenuItemRepository(session)

    async def create_order(self) -> Order:
        order = Order(restaurant_name=RESTAURANT_NAME, state="open")
        order = await self._order_repo.insert(order)
        await self._session.commit()
        await self._session.refresh(order)
        logger.info("Created order id=%s restaurant=%s", order.id, RESTAURANT_NAME)
        return order

    async def get_order(self, order_id: uuid.UUID) -> Order:
        order = await self._order_repo.get_by_id(order_id)
        if order is None:
            raise OrderNotFoundError(str(order_id))
        return order

    async def add_menu_item(self, order_id: uuid.UUID, data: MenuItemCreate) -> MenuItem:
        # Verify order exists
        order = await self._order_repo.get_by_id(order_id)
        if order is None:
            raise OrderNotFoundError(str(order_id))

        # Validate name
        name = data.name.strip() if data.name else ""
        if not name:
            raise ValidationError("Name is required")

        # Validate and parse price
        price_decimal: Decimal | None = None
        if data.price is not None:
            raw = data.price.strip()
            if raw:
                try:
                    price_decimal = Decimal(raw)
                except InvalidOperation:
                    raise ValidationError("Price must be a positive number with up to 2 decimals")
                if price_decimal <= 0:
                    raise ValidationError("Price must be a positive number with up to 2 decimals")
                if price_decimal.as_tuple().exponent < -2:
                    raise ValidationError("Price must be a positive number with up to 2 decimals")

        category = data.category.strip() if data.category else None
        if not category:
            category = None

        item = MenuItem(
            order_id=order_id,
            name=name,
            price=price_decimal,
            category=category,
        )
        item = await self._item_repo.insert(item)
        await self._session.commit()
        await self._session.refresh(item)
        logger.info("Added menu item id=%s order_id=%s name=%s", item.id, order_id, name)
        return item

    async def remove_menu_item(self, order_id: uuid.UUID, item_id: uuid.UUID) -> None:
        # Verify order exists
        order = await self._order_repo.get_by_id(order_id)
        if order is None:
            raise OrderNotFoundError(str(order_id))

        item = await self._item_repo.get_by_id_and_order(item_id, order_id)
        if item is None:
            raise MenuItemNotFoundError(str(item_id))

        await self._item_repo.delete(item)
        await self._session.commit()
        logger.info("Removed menu item id=%s from order_id=%s", item_id, order_id)
