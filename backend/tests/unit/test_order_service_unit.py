"""Unit tests for OrderService - all repository calls are mocked."""
import uuid
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock
import pytest

from app.exceptions import MenuItemNotFoundError, OrderNotFoundError, ValidationError
from app.models.menu_item import MenuItem
from app.models.order import Order
from app.schemas.menu_item import MenuItemCreate
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

    async def test_create_order_returns_order(self, service, mock_order_repo, mock_session):
        order = _make_order()
        mock_order_repo.insert.return_value = order
        result = await service.create_order()
        assert result == order


# ---------- get_order ----------

class TestGetOrder:
    async def test_get_order_returns_order_when_found(
        self, service, mock_order_repo
    ):
        order = _make_order()
        mock_order_repo.get_by_id.return_value = order
        result = await service.get_order(order.id)
        assert result == order

    async def test_get_order_raises_not_found_when_missing(
        self, service, mock_order_repo
    ):
        mock_order_repo.get_by_id.return_value = None
        with pytest.raises(OrderNotFoundError):
            await service.get_order(uuid.uuid4())

    async def test_get_order_queries_with_correct_id(
        self, service, mock_order_repo
    ):
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
        assert result == item

    async def test_add_item_happy_path_with_price_and_category(
        self, service, mock_order_repo, mock_item_repo, mock_session
    ):
        order = _make_order()
        mock_order_repo.get_by_id.return_value = order
        item = _make_item(price=Decimal("9.50"), category="Pizza")
        mock_item_repo.insert.return_value = item

        data = MenuItemCreate(name="Margherita", price="9.50", category="Pizza")
        result = await service.add_menu_item(order.id, data)
        assert result == item

    async def test_add_item_with_price_exactly_two_decimals(
        self, service, mock_order_repo, mock_item_repo, mock_session
    ):
        order = _make_order()
        mock_order_repo.get_by_id.return_value = order
        item = _make_item(price=Decimal("12.99"))
        mock_item_repo.insert.return_value = item

        data = MenuItemCreate(name="Pasta", price="12.99")
        result = await service.add_menu_item(order.id, data)
        assert result == item

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
            await service.add_menu_item(order.id, MenuItemCreate(name="Item", price="-1"))
        assert "Price" in exc_info.value.message

    async def test_add_item_price_with_three_decimals_raises_validation_error(
        self, service, mock_order_repo
    ):
        order = _make_order()
        mock_order_repo.get_by_id.return_value = order

        with pytest.raises(ValidationError) as exc_info:
            await service.add_menu_item(order.id, MenuItemCreate(name="Item", price="9.999"))
        assert "Price" in exc_info.value.message

    async def test_add_item_nonnumeric_price_raises_validation_error(
        self, service, mock_order_repo
    ):
        order = _make_order()
        mock_order_repo.get_by_id.return_value = order

        with pytest.raises(ValidationError):
            await service.add_menu_item(order.id, MenuItemCreate(name="Item", price="abc"))

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
