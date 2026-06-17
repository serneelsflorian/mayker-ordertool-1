import uuid
import logging
from sqlalchemy.ext.asyncio import AsyncSession
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
from app.repositories.guest_repository import GuestRepository
from app.repositories.guest_selection_repository import GuestSelectionRepository
from app.repositories.menu_item_repository import MenuItemRepository
from app.repositories.order_repository import OrderRepository
from app.schemas.guest import (
    GuestCreate,
    GuestRead,
    GuestSelectionCreate,
    GuestSelectionUpdate,
)
from app.services.guest_mapping import (
    map_guest_to_read as _map_guest_to_read,
)

logger = logging.getLogger(__name__)


class GuestService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._order_repo = OrderRepository(session)
        self._item_repo = MenuItemRepository(session)
        self._guest_repo = GuestRepository(session)
        self._selection_repo = GuestSelectionRepository(session)

    async def _require_order(self, order_id: uuid.UUID):
        order = await self._order_repo.get_by_id(order_id)
        if order is None:
            raise OrderNotFoundError(str(order_id))
        return order

    async def _require_guest(self, order_id: uuid.UUID, guest_id: uuid.UUID) -> Guest:
        guest = await self._guest_repo.get_by_id(guest_id)
        if guest is None or guest.order_id != order_id:
            raise GuestNotFoundError(str(guest_id))
        return guest

    async def join_guest(self, order_id: uuid.UUID, data: GuestCreate) -> GuestRead:
        await self._require_order(order_id)

        name = data.name.strip() if data.name else ""
        if not name:
            raise ValidationError("Name is required")

        existing = await self._guest_repo.get_by_order_and_name(order_id, name)
        if existing is not None:
            logger.info(
                "Guest re-joined order_id=%s name=%s id=%s", order_id, name, existing.id
            )
            return _map_guest_to_read(existing)

        guest = Guest(order_id=order_id, name=name, status="editing")
        guest = await self._guest_repo.insert(guest)
        await self._session.commit()
        guest = await self._guest_repo.get_by_id(guest.id)
        logger.info("Guest joined order_id=%s name=%s id=%s", order_id, name, guest.id)
        return _map_guest_to_read(guest)

    async def get_guest(self, order_id: uuid.UUID, guest_id: uuid.UUID) -> GuestRead:
        guest = await self._require_guest(order_id, guest_id)
        return _map_guest_to_read(guest)

    async def add_selection(
        self, order_id: uuid.UUID, guest_id: uuid.UUID, data: GuestSelectionCreate
    ) -> GuestRead:
        order = await self._require_order(order_id)
        if order.state == "closed":
            raise OrderClosedError()

        await self._require_guest(order_id, guest_id)

        item = await self._item_repo.get_by_id_and_order(data.menu_item_id, order_id)
        if item is None:
            raise MenuItemNotFoundError(str(data.menu_item_id))

        quantity = data.quantity if data.quantity is not None else 1
        if quantity < 1:
            raise ValidationError("Quantity must be at least 1")

        note = data.note.strip() if data.note else None
        if not note:
            note = None

        selection = GuestSelection(
            guest_id=guest_id,
            menu_item_id=data.menu_item_id,
            note=note,
            quantity=quantity,
        )
        await self._selection_repo.insert(selection)
        await self._session.commit()
        guest = await self._guest_repo.get_by_id(guest_id)
        logger.info(
            "Added selection guest_id=%s item_id=%s qty=%s",
            guest_id,
            data.menu_item_id,
            quantity,
        )
        return _map_guest_to_read(guest)

    async def update_selection(
        self,
        order_id: uuid.UUID,
        guest_id: uuid.UUID,
        selection_id: uuid.UUID,
        data: GuestSelectionUpdate,
    ) -> GuestRead:
        order = await self._require_order(order_id)
        if order.state == "closed":
            raise OrderClosedError()

        await self._require_guest(order_id, guest_id)

        selection = await self._selection_repo.get_by_id_and_guest(
            selection_id, guest_id
        )
        if selection is None:
            raise GuestSelectionNotFoundError(str(selection_id))

        if data.quantity is not None:
            if data.quantity < 1:
                raise ValidationError("Quantity must be at least 1")
            selection.quantity = data.quantity

        if data.note is not None:
            note = data.note.strip()
            selection.note = note if note else None

        await self._session.commit()
        guest = await self._guest_repo.get_by_id(guest_id)
        logger.info("Updated selection id=%s guest_id=%s", selection_id, guest_id)
        return _map_guest_to_read(guest)

    async def remove_selection(
        self, order_id: uuid.UUID, guest_id: uuid.UUID, selection_id: uuid.UUID
    ) -> GuestRead:
        order = await self._require_order(order_id)
        if order.state == "closed":
            raise OrderClosedError()

        await self._require_guest(order_id, guest_id)

        selection = await self._selection_repo.get_by_id_and_guest(
            selection_id, guest_id
        )
        if selection is None:
            raise GuestSelectionNotFoundError(str(selection_id))

        await self._selection_repo.delete(selection)
        await self._session.commit()
        guest = await self._guest_repo.get_by_id(guest_id)
        logger.info("Removed selection id=%s guest_id=%s", selection_id, guest_id)
        return _map_guest_to_read(guest)
