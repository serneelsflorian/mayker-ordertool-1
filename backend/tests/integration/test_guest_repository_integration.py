"""Integration tests for guest repositories against a real database."""

import uuid
from decimal import Decimal
from sqlalchemy import select

from app.models.guest import Guest
from app.models.guest_selection import GuestSelection
from app.models.menu_item import MenuItem
from app.models.order import Order
from app.repositories.guest_repository import GuestRepository
from app.repositories.guest_selection_repository import GuestSelectionRepository


async def _make_order_with_item(db_session) -> tuple[Order, MenuItem]:
    order = Order(restaurant_name="Trattoria Demo", state="open")
    db_session.add(order)
    await db_session.flush()
    item = MenuItem(
        order_id=order.id, name="Margherita", price=Decimal("9.50"), category="Pizza"
    )
    db_session.add(item)
    await db_session.flush()
    return order, item


class TestGuestRepository:
    async def test_insert_and_get_by_id_round_trip(self, db_session):
        order, _ = await _make_order_with_item(db_session)
        repo = GuestRepository(db_session)

        guest = await repo.insert(
            Guest(order_id=order.id, name="Sara", status="editing")
        )
        await db_session.commit()

        fetched = await repo.get_by_id(guest.id)
        assert fetched is not None
        assert fetched.name == "Sara"
        assert fetched.status == "editing"
        assert fetched.selections == []

    async def test_get_by_order_and_name_hit(self, db_session):
        order, _ = await _make_order_with_item(db_session)
        repo = GuestRepository(db_session)
        await repo.insert(Guest(order_id=order.id, name="Sara"))
        await db_session.commit()

        found = await repo.get_by_order_and_name(order.id, "Sara")
        assert found is not None
        assert found.name == "Sara"

    async def test_get_by_order_and_name_miss(self, db_session):
        order, _ = await _make_order_with_item(db_session)
        repo = GuestRepository(db_session)
        found = await repo.get_by_order_and_name(order.id, "Nobody")
        assert found is None

    async def test_list_by_order_returns_guests_with_eager_selections(self, db_session):
        order, item = await _make_order_with_item(db_session)
        guest_repo = GuestRepository(db_session)
        sel_repo = GuestSelectionRepository(db_session)
        alice = await guest_repo.insert(Guest(order_id=order.id, name="Alice"))
        await guest_repo.insert(Guest(order_id=order.id, name="Bob"))
        await db_session.commit()
        await sel_repo.insert(
            GuestSelection(guest_id=alice.id, menu_item_id=item.id, quantity=2)
        )
        await db_session.commit()

        guests = await guest_repo.list_by_order(order.id)
        assert [g.name for g in guests] == ["Alice", "Bob"]
        # Selections are eager-loaded (no lazy access error after the query).
        alice_loaded = next(g for g in guests if g.name == "Alice")
        assert alice_loaded.selections[0].quantity == 2
        assert alice_loaded.selections[0].menu_item.name == "Margherita"

    async def test_list_by_order_empty_when_no_guests(self, db_session):
        order, _ = await _make_order_with_item(db_session)
        repo = GuestRepository(db_session)
        assert await repo.list_by_order(order.id) == []


class TestGuestSelectionRepository:
    async def test_insert_get_and_delete_selection(self, db_session):
        order, item = await _make_order_with_item(db_session)
        guest_repo = GuestRepository(db_session)
        sel_repo = GuestSelectionRepository(db_session)
        guest = await guest_repo.insert(Guest(order_id=order.id, name="Sara"))
        await db_session.commit()

        sel = await sel_repo.insert(
            GuestSelection(
                guest_id=guest.id, menu_item_id=item.id, note="no onions", quantity=2
            )
        )
        await db_session.commit()

        fetched = await sel_repo.get_by_id_and_guest(sel.id, guest.id)
        assert fetched is not None
        assert fetched.quantity == 2
        assert fetched.note == "no onions"

        # ownership filter: wrong guest -> miss
        assert await sel_repo.get_by_id_and_guest(sel.id, uuid.uuid4()) is None

        await sel_repo.delete(fetched)
        await db_session.commit()
        assert await sel_repo.get_by_id_and_guest(sel.id, guest.id) is None

    async def test_deleting_order_cascades_to_guests_and_selections(self, db_session):
        order, item = await _make_order_with_item(db_session)
        guest_repo = GuestRepository(db_session)
        sel_repo = GuestSelectionRepository(db_session)
        guest = await guest_repo.insert(Guest(order_id=order.id, name="Sara"))
        await db_session.commit()
        sel = await sel_repo.insert(
            GuestSelection(guest_id=guest.id, menu_item_id=item.id, quantity=1)
        )
        await db_session.commit()

        order_obj = await db_session.get(Order, order.id)
        await db_session.delete(order_obj)
        await db_session.commit()

        remaining_guests = (await db_session.execute(select(Guest))).scalars().all()
        remaining_sels = (
            (await db_session.execute(select(GuestSelection))).scalars().all()
        )
        assert remaining_guests == []
        assert remaining_sels == []
