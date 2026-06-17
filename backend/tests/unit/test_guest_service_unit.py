"""Unit tests for GuestService - all repository calls are mocked."""

import uuid
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock
import pytest

from app.exceptions import (
    GuestNotFoundError,
    GuestSelectionNotFoundError,
    MenuItemNotFoundError,
    OrderClosedError,
    OrderNotFoundError,
    ValidationError,
)
from app.models.guest import Guest
from app.models.guest_selection import GuestSelection
from app.models.menu_item import MenuItem
from app.models.order import Order
from app.schemas.guest import (
    GuestCreate,
    GuestRead,
    GuestSelectionCreate,
    GuestSelectionUpdate,
)
from app.services.guest_service import GuestService
from app.services.guest_mapping import (
    line_total as _line_total,
    quantize as _quantize,
    map_guest_to_read as _map_guest_to_read,
)


def _make_order(**kwargs) -> Order:
    defaults = dict(id=uuid.uuid4(), restaurant_name="Trattoria Demo", state="open")
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


def _make_selection(**kwargs) -> GuestSelection:
    item = kwargs.pop("menu_item", None) or _make_item()
    defaults = dict(
        id=uuid.uuid4(),
        guest_id=uuid.uuid4(),
        menu_item_id=item.id,
        note=None,
        quantity=1,
        menu_item=item,
    )
    defaults.update(kwargs)
    sel = MagicMock(spec=GuestSelection)
    for k, v in defaults.items():
        setattr(sel, k, v)
    return sel


def _make_guest(**kwargs) -> Guest:
    defaults = dict(
        id=uuid.uuid4(),
        order_id=uuid.uuid4(),
        name="Sara",
        status="editing",
        selections=[],
    )
    defaults.update(kwargs)
    g = MagicMock(spec=Guest)
    for k, v in defaults.items():
        setattr(g, k, v)
    return g


@pytest.fixture
def mock_session():
    session = AsyncMock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    return session


@pytest.fixture
def service(mock_session):
    svc = GuestService(mock_session)
    svc._order_repo = AsyncMock()
    svc._item_repo = AsyncMock()
    svc._guest_repo = AsyncMock()
    svc._selection_repo = AsyncMock()
    return svc


# ---------- helpers ----------


class TestHelpers:
    def test_line_total_multiplies_quantity_by_price(self):
        assert _line_total(3, Decimal("9.50")) == Decimal("28.50")

    def test_line_total_null_price_is_zero(self):
        assert _line_total(5, None) == Decimal(0)

    def test_quantize_formats_two_decimals(self):
        assert _quantize(Decimal("19")) == "19.00"

    def test_map_guest_subtotal_sums_mixed_priced_and_priceless(self):
        priced = _make_selection(
            menu_item=_make_item(price=Decimal("10.00")), quantity=2
        )
        free = _make_selection(menu_item=_make_item(price=None), quantity=3)
        guest = _make_guest(selections=[priced, free])
        result = _map_guest_to_read(guest)
        assert result.subtotal == "20.00"
        assert isinstance(result, GuestRead)
        # price-less item exposed without a price
        free_read = next(s for s in result.selections if s.line_total == "0.00")
        assert free_read.item_price is None


# ---------- join_guest ----------


class TestJoinGuest:
    async def test_join_creates_new_guest_when_none_exists(self, service):
        order = _make_order()
        service._order_repo.get_by_id.return_value = order
        service._guest_repo.get_by_order_and_name.return_value = None
        created = _make_guest(order_id=order.id)
        service._guest_repo.insert.return_value = created
        service._guest_repo.get_by_id.return_value = created

        result = await service.join_guest(order.id, GuestCreate(name="Sara"))

        service._guest_repo.insert.assert_called_once()
        assert isinstance(result, GuestRead)
        assert result.name == "Sara"
        assert result.status == "editing"

    async def test_join_returns_existing_guest_when_name_matches(self, service):
        order = _make_order()
        service._order_repo.get_by_id.return_value = order
        existing = _make_guest(order_id=order.id, name="Sara")
        service._guest_repo.get_by_order_and_name.return_value = existing

        result = await service.join_guest(order.id, GuestCreate(name="Sara"))

        service._guest_repo.insert.assert_not_called()
        assert result.id == existing.id

    async def test_join_empty_name_raises_validation_error(self, service):
        order = _make_order()
        service._order_repo.get_by_id.return_value = order
        with pytest.raises(ValidationError):
            await service.join_guest(order.id, GuestCreate(name="   "))

    async def test_join_order_not_found_raises(self, service):
        service._order_repo.get_by_id.return_value = None
        with pytest.raises(OrderNotFoundError):
            await service.join_guest(uuid.uuid4(), GuestCreate(name="Sara"))


# ---------- add_selection ----------


class TestAddSelection:
    async def test_add_selection_default_quantity_is_one(self, service):
        order = _make_order()
        guest = _make_guest(order_id=order.id)
        item = _make_item(order_id=order.id)
        service._order_repo.get_by_id.return_value = order
        service._guest_repo.get_by_id.return_value = guest
        service._item_repo.get_by_id_and_order.return_value = item

        await service.add_selection(
            order.id, guest.id, GuestSelectionCreate(menu_item_id=item.id)
        )

        inserted = service._selection_repo.insert.call_args[0][0]
        assert inserted.quantity == 1

    async def test_add_selection_item_not_in_order_raises(self, service):
        order = _make_order()
        guest = _make_guest(order_id=order.id)
        service._order_repo.get_by_id.return_value = order
        service._guest_repo.get_by_id.return_value = guest
        service._item_repo.get_by_id_and_order.return_value = None
        with pytest.raises(MenuItemNotFoundError):
            await service.add_selection(
                order.id, guest.id, GuestSelectionCreate(menu_item_id=uuid.uuid4())
            )

    async def test_add_selection_closed_order_raises(self, service):
        order = _make_order(state="closed")
        service._order_repo.get_by_id.return_value = order
        with pytest.raises(OrderClosedError):
            await service.add_selection(
                order.id, uuid.uuid4(), GuestSelectionCreate(menu_item_id=uuid.uuid4())
            )

    async def test_add_selection_quantity_below_one_raises(self, service):
        order = _make_order()
        guest = _make_guest(order_id=order.id)
        item = _make_item(order_id=order.id)
        service._order_repo.get_by_id.return_value = order
        service._guest_repo.get_by_id.return_value = guest
        service._item_repo.get_by_id_and_order.return_value = item
        with pytest.raises(ValidationError):
            await service.add_selection(
                order.id,
                guest.id,
                GuestSelectionCreate(menu_item_id=item.id, quantity=0),
            )

    async def test_add_selection_unknown_guest_raises(self, service):
        order = _make_order()
        service._order_repo.get_by_id.return_value = order
        service._guest_repo.get_by_id.return_value = None
        with pytest.raises(GuestNotFoundError):
            await service.add_selection(
                order.id, uuid.uuid4(), GuestSelectionCreate(menu_item_id=uuid.uuid4())
            )


# ---------- update_selection ----------


class TestUpdateSelection:
    async def test_update_quantity(self, service):
        order = _make_order()
        guest = _make_guest(order_id=order.id)
        selection = _make_selection(guest_id=guest.id, quantity=1)
        service._order_repo.get_by_id.return_value = order
        service._guest_repo.get_by_id.return_value = guest
        service._selection_repo.get_by_id_and_guest.return_value = selection

        await service.update_selection(
            order.id, guest.id, selection.id, GuestSelectionUpdate(quantity=3)
        )
        assert selection.quantity == 3

    async def test_update_note(self, service):
        order = _make_order()
        guest = _make_guest(order_id=order.id)
        selection = _make_selection(guest_id=guest.id)
        service._order_repo.get_by_id.return_value = order
        service._guest_repo.get_by_id.return_value = guest
        service._selection_repo.get_by_id_and_guest.return_value = selection

        await service.update_selection(
            order.id, guest.id, selection.id, GuestSelectionUpdate(note="no onions")
        )
        assert selection.note == "no onions"

    async def test_update_quantity_below_one_raises(self, service):
        order = _make_order()
        guest = _make_guest(order_id=order.id)
        selection = _make_selection(guest_id=guest.id)
        service._order_repo.get_by_id.return_value = order
        service._guest_repo.get_by_id.return_value = guest
        service._selection_repo.get_by_id_and_guest.return_value = selection
        with pytest.raises(ValidationError):
            await service.update_selection(
                order.id, guest.id, selection.id, GuestSelectionUpdate(quantity=0)
            )

    async def test_update_selection_not_owned_raises_not_found(self, service):
        order = _make_order()
        guest = _make_guest(order_id=order.id)
        service._order_repo.get_by_id.return_value = order
        service._guest_repo.get_by_id.return_value = guest
        service._selection_repo.get_by_id_and_guest.return_value = None
        with pytest.raises(GuestSelectionNotFoundError):
            await service.update_selection(
                order.id, guest.id, uuid.uuid4(), GuestSelectionUpdate(quantity=2)
            )

    async def test_update_selection_closed_order_raises(self, service):
        order = _make_order(state="closed")
        service._order_repo.get_by_id.return_value = order
        with pytest.raises(OrderClosedError):
            await service.update_selection(
                order.id, uuid.uuid4(), uuid.uuid4(), GuestSelectionUpdate(quantity=2)
            )


# ---------- remove_selection ----------


class TestRemoveSelection:
    async def test_remove_selection_happy_path(self, service):
        order = _make_order()
        guest = _make_guest(order_id=order.id)
        selection = _make_selection(guest_id=guest.id)
        service._order_repo.get_by_id.return_value = order
        service._guest_repo.get_by_id.return_value = guest
        service._selection_repo.get_by_id_and_guest.return_value = selection

        await service.remove_selection(order.id, guest.id, selection.id)
        service._selection_repo.delete.assert_called_once_with(selection)

    async def test_remove_selection_not_owned_raises_not_found(self, service):
        order = _make_order()
        guest = _make_guest(order_id=order.id)
        service._order_repo.get_by_id.return_value = order
        service._guest_repo.get_by_id.return_value = guest
        service._selection_repo.get_by_id_and_guest.return_value = None
        with pytest.raises(GuestSelectionNotFoundError):
            await service.remove_selection(order.id, guest.id, uuid.uuid4())

    async def test_remove_selection_closed_order_raises(self, service):
        order = _make_order(state="closed")
        service._order_repo.get_by_id.return_value = order
        with pytest.raises(OrderClosedError):
            await service.remove_selection(order.id, uuid.uuid4(), uuid.uuid4())


# ---------- get_guest ----------


class TestGetGuest:
    async def test_get_guest_returns_read_dto(self, service):
        guest = _make_guest()
        service._guest_repo.get_by_id.return_value = guest
        result = await service.get_guest(guest.order_id, guest.id)
        assert isinstance(result, GuestRead)
        assert result.id == guest.id

    async def test_get_guest_unknown_raises_not_found(self, service):
        service._guest_repo.get_by_id.return_value = None
        with pytest.raises(GuestNotFoundError):
            await service.get_guest(uuid.uuid4(), uuid.uuid4())

    async def test_get_guest_wrong_order_raises_not_found(self, service):
        guest = _make_guest(order_id=uuid.uuid4())
        service._guest_repo.get_by_id.return_value = guest
        with pytest.raises(GuestNotFoundError):
            await service.get_guest(uuid.uuid4(), guest.id)


# ---------- submit_guest ----------


class TestSubmitGuest:
    async def test_submit_guest_happy_path_sets_status_submitted(self, service):
        order = _make_order()
        selection = _make_selection()
        guest = _make_guest(order_id=order.id, selections=[selection])
        submitted_guest = _make_guest(
            id=guest.id, order_id=order.id, status="submitted", selections=[selection]
        )
        service._order_repo.get_by_id.return_value = order
        service._guest_repo.get_by_id.side_effect = [guest, submitted_guest]

        result = await service.submit_guest(order.id, guest.id)

        assert guest.status == "submitted"
        assert result.status == "submitted"
        assert isinstance(result, GuestRead)

    async def test_submit_guest_with_no_selections_raises_validation_error(
        self, service
    ):
        order = _make_order()
        guest = _make_guest(order_id=order.id, selections=[])
        service._order_repo.get_by_id.return_value = order
        service._guest_repo.get_by_id.return_value = guest

        with pytest.raises(ValidationError, match="at least one item"):
            await service.submit_guest(order.id, guest.id)

    async def test_submit_guest_on_closed_order_raises_order_closed_error(
        self, service
    ):
        order = _make_order(state="closed")
        service._order_repo.get_by_id.return_value = order

        with pytest.raises(OrderClosedError):
            await service.submit_guest(order.id, uuid.uuid4())

    async def test_submit_guest_unknown_guest_raises_guest_not_found_error(
        self, service
    ):
        order = _make_order()
        service._order_repo.get_by_id.return_value = order
        service._guest_repo.get_by_id.return_value = None

        with pytest.raises(GuestNotFoundError):
            await service.submit_guest(order.id, uuid.uuid4())


# ---------- reopen_guest ----------


class TestReopenGuest:
    async def test_reopen_guest_happy_path_sets_status_editing(self, service):
        order = _make_order()
        selection = _make_selection()
        guest = _make_guest(
            order_id=order.id, status="submitted", selections=[selection]
        )
        editing_guest = _make_guest(
            id=guest.id, order_id=order.id, status="editing", selections=[selection]
        )
        service._order_repo.get_by_id.return_value = order
        service._guest_repo.get_by_id.side_effect = [guest, editing_guest]

        result = await service.reopen_guest(order.id, guest.id)

        assert guest.status == "editing"
        assert result.status == "editing"
        assert isinstance(result, GuestRead)

    async def test_reopen_guest_on_closed_order_raises_order_closed_error(
        self, service
    ):
        order = _make_order(state="closed")
        service._order_repo.get_by_id.return_value = order

        with pytest.raises(OrderClosedError):
            await service.reopen_guest(order.id, uuid.uuid4())

    async def test_reopen_guest_unknown_guest_raises_guest_not_found_error(
        self, service
    ):
        order = _make_order()
        service._order_repo.get_by_id.return_value = order
        service._guest_repo.get_by_id.return_value = None

        with pytest.raises(GuestNotFoundError):
            await service.reopen_guest(order.id, uuid.uuid4())


# ---------- auto-revert on selection mutations ----------


class TestAutoRevertOnSelectionMutation:
    async def test_add_selection_on_submitted_guest_returns_status_editing(
        self, service
    ):
        order = _make_order()
        item = _make_item(order_id=order.id)
        # Guest starts as submitted
        guest = _make_guest(order_id=order.id, status="submitted", selections=[])
        editing_guest = _make_guest(
            id=guest.id, order_id=order.id, status="editing", selections=[]
        )
        service._order_repo.get_by_id.return_value = order
        service._guest_repo.get_by_id.side_effect = [guest, editing_guest]
        service._item_repo.get_by_id_and_order.return_value = item

        result = await service.add_selection(
            order.id, guest.id, GuestSelectionCreate(menu_item_id=item.id)
        )

        assert guest.status == "editing"
        assert result.status == "editing"

    async def test_update_selection_on_submitted_guest_returns_status_editing(
        self, service
    ):
        order = _make_order()
        guest = _make_guest(order_id=order.id, status="submitted")
        selection = _make_selection(guest_id=guest.id, quantity=1)
        editing_guest = _make_guest(id=guest.id, order_id=order.id, status="editing")
        service._order_repo.get_by_id.return_value = order
        service._guest_repo.get_by_id.side_effect = [guest, editing_guest]
        service._selection_repo.get_by_id_and_guest.return_value = selection

        result = await service.update_selection(
            order.id, guest.id, selection.id, GuestSelectionUpdate(quantity=2)
        )

        assert guest.status == "editing"
        assert result.status == "editing"

    async def test_remove_selection_on_submitted_guest_returns_status_editing(
        self, service
    ):
        order = _make_order()
        guest = _make_guest(order_id=order.id, status="submitted")
        selection = _make_selection(guest_id=guest.id)
        editing_guest = _make_guest(id=guest.id, order_id=order.id, status="editing")
        service._order_repo.get_by_id.return_value = order
        service._guest_repo.get_by_id.side_effect = [guest, editing_guest]
        service._selection_repo.get_by_id_and_guest.return_value = selection

        result = await service.remove_selection(order.id, guest.id, selection.id)

        assert guest.status == "editing"
        assert result.status == "editing"
