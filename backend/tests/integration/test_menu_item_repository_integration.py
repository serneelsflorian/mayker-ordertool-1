"""Integration tests for MenuItemRepository against real Postgres."""
import uuid
from decimal import Decimal
import pytest
import pytest_asyncio
from app.models.menu_item import MenuItem
from app.models.order import Order
from app.repositories.menu_item_repository import MenuItemRepository
from app.repositories.order_repository import OrderRepository


@pytest_asyncio.fixture
async def order(db_session):
    repo = OrderRepository(db_session)
    o = Order(restaurant_name="Trattoria Demo", state="open")
    return await repo.insert(o)


class TestMenuItemRepository:
    async def test_insert_and_retrieve_item(self, db_session, order):
        repo = MenuItemRepository(db_session)
        item = MenuItem(order_id=order.id, name="Margherita", price=Decimal("9.50"), category="Pizza")
        inserted = await repo.insert(item)

        assert inserted.id is not None
        fetched = await repo.get_by_id_and_order(inserted.id, order.id)
        assert fetched is not None
        assert fetched.name == "Margherita"
        assert fetched.price == Decimal("9.50")
        assert fetched.category == "Pizza"

    async def test_insert_item_with_null_price_and_category(self, db_session, order):
        repo = MenuItemRepository(db_session)
        item = MenuItem(order_id=order.id, name="Garlic Bread", price=None, category=None)
        inserted = await repo.insert(item)

        fetched = await repo.get_by_id_and_order(inserted.id, order.id)
        assert fetched.price is None
        assert fetched.category is None

    async def test_get_item_returns_none_for_wrong_order(self, db_session, order):
        repo = MenuItemRepository(db_session)
        item = MenuItem(order_id=order.id, name="Item", price=None, category=None)
        inserted = await repo.insert(item)

        result = await repo.get_by_id_and_order(inserted.id, uuid.uuid4())
        assert result is None

    async def test_delete_item(self, db_session, order):
        repo = MenuItemRepository(db_session)
        item = MenuItem(order_id=order.id, name="To delete", price=None, category=None)
        inserted = await repo.insert(item)

        await repo.delete(inserted)
        fetched = await repo.get_by_id_and_order(inserted.id, order.id)
        assert fetched is None

    async def test_list_by_order_returns_empty(self, db_session, order):
        repo = MenuItemRepository(db_session)
        items = await repo.list_by_order(order.id)
        assert items == []

    async def test_list_by_order_returns_items(self, db_session, order):
        repo = MenuItemRepository(db_session)
        for name in ["Pizza", "Pasta"]:
            await repo.insert(MenuItem(order_id=order.id, name=name, price=None, category=None))

        items = await repo.list_by_order(order.id)
        assert len(items) == 2
        names = {i.name for i in items}
        assert names == {"Pizza", "Pasta"}
