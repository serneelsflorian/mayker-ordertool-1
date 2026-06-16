"""Integration tests for OrderRepository against real Postgres."""
import uuid
import pytest
from app.models.order import Order
from app.repositories.order_repository import OrderRepository


class TestOrderRepository:
    async def test_insert_and_retrieve_order(self, db_session):
        repo = OrderRepository(db_session)
        order = Order(restaurant_name="Trattoria Demo", state="open")
        inserted = await repo.insert(order)

        assert inserted.id is not None
        fetched = await repo.get_by_id(inserted.id)
        assert fetched is not None
        assert fetched.restaurant_name == "Trattoria Demo"
        assert fetched.state == "open"

    async def test_get_order_returns_none_for_missing_id(self, db_session):
        repo = OrderRepository(db_session)
        result = await repo.get_by_id(uuid.uuid4())
        assert result is None

    async def test_get_order_eager_loads_empty_menu_items(self, db_session):
        repo = OrderRepository(db_session)
        order = Order(restaurant_name="Trattoria Demo", state="open")
        inserted = await repo.insert(order)

        fetched = await repo.get_by_id(inserted.id)
        assert fetched.menu_items == []

    async def test_insert_sets_default_state(self, db_session):
        repo = OrderRepository(db_session)
        order = Order(restaurant_name="Trattoria Demo", state="open")
        inserted = await repo.insert(order)
        assert inserted.state == "open"
