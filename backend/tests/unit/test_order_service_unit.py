"""Unit tests for OrderService - all repository calls are mocked."""

import uuid
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock
import pytest

from app.exceptions import MenuItemNotFoundError, OrderNotFoundError, ValidationError
from app.models.guest import Guest
from app.models.guest_selection import GuestSelection
from app.models.menu_item import MenuItem
from app.models.order import Order
from app.schemas.menu_item import MenuItemCreate, MenuItemRead
from app.schemas.order import OrderOverviewRead, OrderRead
from app.services.order_service import OrderService


def _make_order(**kwargs) -> Order:
    defaults = dict(
        id=uuid.uuid4(),
        restaurant_name="Trattoria Demo",
        state="open",
        menu_items=[],
    )
    defaults.update(kwargs)
    o = MagicMock(spec=Order)
    for k, v in defaults.items():
        setattr(o, k, v)
    return o


def _make_item(**kwargs) -> MenuItem:
    defaults = dict(
        id=uuid.uuid4(),
        order_id=uuid.uuid4(),
        name="Margherita",
        price=Decimal("9.50"),
        category="Pizza",
    )
    defaults.update(kwargs)
    item = MagicMock(spec=MenuItem)
    for k, v in defaults.items():
        setattr(item, k, v)
    return item


@pytest.fixture
def mock_session():
    session = AsyncMock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    return session


@pytest.fixture
def service(mock_session):
    return OrderService(mock_session)


@pytest.fixture
def mock_order_repo(service):
    repo = AsyncMock()
    service._order_repo = repo
    return repo


@pytest.fixture
def mock_item_repo(service):
    repo = AsyncMock()
    service._item_repo = repo
    return repo


@pytest.fixture
def mock_guest_repo(service):
    repo = AsyncMock()
    service._guest_repo = repo
    return repo


def _make_guest(name="Alice", status="editing", selections=None, **kwargs) -> Guest:
    defaults = dict(
        id=uuid.uuid4(),
        order_id=uuid.uuid4(),
        name=name,
        status=status,
        selections=selections if selections is not None else [],
    )
    defaults.update(kwargs)
    guest = MagicMock(spec=Guest)
    for k, v in defaults.items():
        setattr(guest, k, v)
    return guest


def _make_selection(quantity=1, note=None, price=Decimal("9.50")) -> GuestSelection:
    item = _make_item(price=price)
    sel = MagicMock(spec=GuestSelection)
    sel.id = uuid.uuid4()
    sel.menu_item_id = item.id
    sel.menu_item = item
    sel.note = note
    sel.quantity = quantity
    return sel


# ---------- create_order ----------


class TestCreateOrder:
    async def test_create_order_sets_hardcoded_restaurant_and_open_state(
        self, service, mock_order_repo, mock_session
    ):
        order = _make_order()
        mock_order_repo.insert.return_value = order
        mock_session.refresh = AsyncMock()

        result = await service.create_order()

        mock_order_repo.insert.assert_called_once()
        inserted: Order = mock_order_repo.insert.call_args[0][0]
        assert inserted.restaurant_name == "Trattoria Demo"
        assert inserted.state == "open"
        mock_session.commit.assert_called_once()

    async def test_create_order_returns_order_read_dto(
        self, service, mock_order_repo, mock_session
    ):
        order = _make_order()
        mock_order_repo.insert.return_value = order
        result = await service.create_order()
        assert isinstance(result, OrderRead)
        assert result.id == order.id
        assert result.restaurant_name == order.restaurant_name
        assert result.state == order.state


# ---------- get_order ----------


class TestGetOrder:
    async def test_get_order_returns_order_read_dto_when_found(
        self, service, mock_order_repo
    ):
        order = _make_order()
        mock_order_repo.get_by_id.return_value = order
        result = await service.get_order(order.id)
        assert isinstance(result, OrderRead)
        assert result.id == order.id
        assert result.restaurant_name == order.restaurant_name

    async def test_get_order_raises_not_found_when_missing(
        self, service, mock_order_repo
    ):
        mock_order_repo.get_by_id.return_value = None
        with pytest.raises(OrderNotFoundError):
            await service.get_order(uuid.uuid4())

    async def test_get_order_queries_with_correct_id(self, service, mock_order_repo):
        order_id = uuid.uuid4()
        mock_order_repo.get_by_id.return_value = _make_order(id=order_id)
        await service.get_order(order_id)
        mock_order_repo.get_by_id.assert_called_once_with(order_id)


# ---------- add_menu_item ----------


class TestAddMenuItem:
    async def test_add_item_happy_path_name_only(
        self, service, mock_order_repo, mock_item_repo, mock_session
    ):
        order = _make_order()
        mock_order_repo.get_by_id.return_value = order
        item = _make_item(price=None, category=None)
        mock_item_repo.insert.return_value = item

        data = MenuItemCreate(name="Garlic Bread")
        result = await service.add_menu_item(order.id, data)

        mock_item_repo.insert.assert_called_once()
        mock_session.commit.assert_called_once()
        assert isinstance(result, MenuItemRead)
        assert result.id == item.id
        assert result.name == item.name
        assert result.price is None

    async def test_add_item_happy_path_with_price_and_category(
        self, service, mock_order_repo, mock_item_repo, mock_session
    ):
        order = _make_order()
        mock_order_repo.get_by_id.return_value = order
        item = _make_item(price=Decimal("9.50"), category="Pizza")
        mock_item_repo.insert.return_value = item

        data = MenuItemCreate(name="Margherita", price="9.50", category="Pizza")
        result = await service.add_menu_item(order.id, data)
        assert isinstance(result, MenuItemRead)
        assert result.price == "9.50"
        assert result.category == "Pizza"

    async def test_add_item_with_price_exactly_two_decimals(
        self, service, mock_order_repo, mock_item_repo, mock_session
    ):
        order = _make_order()
        mock_order_repo.get_by_id.return_value = order
        item = _make_item(price=Decimal("12.99"))
        mock_item_repo.insert.return_value = item

        data = MenuItemCreate(name="Pasta", price="12.99")
        result = await service.add_menu_item(order.id, data)
        assert isinstance(result, MenuItemRead)
        assert result.price == "12.99"

    async def test_add_item_empty_name_raises_validation_error(
        self, service, mock_order_repo
    ):
        order = _make_order()
        mock_order_repo.get_by_id.return_value = order

        with pytest.raises(ValidationError) as exc_info:
            await service.add_menu_item(order.id, MenuItemCreate(name="  "))
        assert "Name is required" in exc_info.value.message

    async def test_add_item_negative_price_raises_validation_error(
        self, service, mock_order_repo
    ):
        order = _make_order()
        mock_order_repo.get_by_id.return_value = order

        with pytest.raises(ValidationError) as exc_info:
            await service.add_menu_item(
                order.id, MenuItemCreate(name="Item", price="-1")
            )
        assert "Price" in exc_info.value.message

    async def test_add_item_price_with_three_decimals_raises_validation_error(
        self, service, mock_order_repo
    ):
        order = _make_order()
        mock_order_repo.get_by_id.return_value = order

        with pytest.raises(ValidationError) as exc_info:
            await service.add_menu_item(
                order.id, MenuItemCreate(name="Item", price="9.999")
            )
        assert "Price" in exc_info.value.message

    async def test_add_item_nonnumeric_price_raises_validation_error(
        self, service, mock_order_repo
    ):
        order = _make_order()
        mock_order_repo.get_by_id.return_value = order

        with pytest.raises(ValidationError):
            await service.add_menu_item(
                order.id, MenuItemCreate(name="Item", price="abc")
            )

    async def test_add_item_order_not_found_raises_error(
        self, service, mock_order_repo
    ):
        mock_order_repo.get_by_id.return_value = None

        with pytest.raises(OrderNotFoundError):
            await service.add_menu_item(uuid.uuid4(), MenuItemCreate(name="Item"))

    async def test_add_item_empty_price_string_treated_as_no_price(
        self, service, mock_order_repo, mock_item_repo, mock_session
    ):
        order = _make_order()
        mock_order_repo.get_by_id.return_value = order
        item = _make_item(price=None)
        mock_item_repo.insert.return_value = item

        data = MenuItemCreate(name="Item", price="")
        result = await service.add_menu_item(order.id, data)
        # Should not raise; price treated as None
        inserted_item = mock_item_repo.insert.call_args[0][0]
        assert inserted_item.price is None


# ---------- remove_menu_item ----------


class TestRemoveMenuItem:
    async def test_remove_item_happy_path(
        self, service, mock_order_repo, mock_item_repo, mock_session
    ):
        order = _make_order()
        mock_order_repo.get_by_id.return_value = order
        item = _make_item()
        mock_item_repo.get_by_id_and_order.return_value = item

        await service.remove_menu_item(order.id, item.id)

        mock_item_repo.delete.assert_called_once_with(item)
        mock_session.commit.assert_called_once()

    async def test_remove_item_not_found_raises_error(
        self, service, mock_order_repo, mock_item_repo
    ):
        order = _make_order()
        mock_order_repo.get_by_id.return_value = order
        mock_item_repo.get_by_id_and_order.return_value = None

        with pytest.raises(MenuItemNotFoundError):
            await service.remove_menu_item(order.id, uuid.uuid4())

    async def test_remove_item_order_not_found_raises_error(
        self, service, mock_order_repo
    ):
        mock_order_repo.get_by_id.return_value = None

        with pytest.raises(OrderNotFoundError):
            await service.remove_menu_item(uuid.uuid4(), uuid.uuid4())


# ---------- close_order ----------


class TestCloseOrder:
    async def test_close_order_open_transitions_to_closed_and_persists(
        self, service, mock_order_repo, mock_session
    ):
        order = _make_order(state="open")
        mock_order_repo.get_by_id.return_value = order

        result = await service.close_order(order.id)

        assert order.state == "closed"
        mock_session.commit.assert_called_once()
        assert isinstance(result, OrderRead)
        assert result.state == "closed"

    async def test_close_order_already_closed_is_idempotent_noop(
        self, service, mock_order_repo, mock_session
    ):
        order = _make_order(state="closed")
        mock_order_repo.get_by_id.return_value = order

        result = await service.close_order(order.id)

        assert result.state == "closed"
        # No write when already closed.
        mock_session.commit.assert_not_called()

    async def test_close_order_missing_raises_not_found(self, service, mock_order_repo):
        mock_order_repo.get_by_id.return_value = None

        with pytest.raises(OrderNotFoundError):
            await service.close_order(uuid.uuid4())


# ---------- get_order_overview ----------


class TestGetOrderOverview:
    async def test_overview_counts_submitted_and_includes_all_guests(
        self, service, mock_order_repo, mock_guest_repo
    ):
        order = _make_order()
        mock_order_repo.get_by_id.return_value = order
        guests = [
            _make_guest(
                name="Alice",
                status="submitted",
                selections=[_make_selection(quantity=2)],
            ),
            _make_guest(name="Bob", status="submitted"),
            _make_guest(name="Cara", status="editing"),
        ]
        mock_guest_repo.list_by_order.return_value = guests

        result = await service.get_order_overview(order.id)

        assert isinstance(result, OrderOverviewRead)
        assert result.guest_count == 3
        assert result.submitted_count == 2
        assert [g.name for g in result.guests] == ["Alice", "Bob", "Cara"]

    async def test_overview_editing_guest_with_items_is_counted_in_subtotal(
        self, service, mock_order_repo, mock_guest_repo
    ):
        order = _make_order()
        mock_order_repo.get_by_id.return_value = order
        editing_guest = _make_guest(
            name="Dana",
            status="editing",
            selections=[_make_selection(quantity=3, price=Decimal("4.00"))],
        )
        mock_guest_repo.list_by_order.return_value = [editing_guest]

        result = await service.get_order_overview(order.id)

        assert result.guest_count == 1
        assert result.submitted_count == 0
        # In-progress (editing) items still count toward the order.
        assert result.guests[0].subtotal == "12.00"

    async def test_overview_no_guests_returns_empty_with_zero_counts(
        self, service, mock_order_repo, mock_guest_repo
    ):
        order = _make_order()
        mock_order_repo.get_by_id.return_value = order
        mock_guest_repo.list_by_order.return_value = []

        result = await service.get_order_overview(order.id)

        assert result.guests == []
        assert result.guest_count == 0
        assert result.submitted_count == 0

    async def test_overview_missing_order_raises_not_found(
        self, service, mock_order_repo
    ):
        mock_order_repo.get_by_id.return_value = None

        with pytest.raises(OrderNotFoundError):
            await service.get_order_overview(uuid.uuid4())
