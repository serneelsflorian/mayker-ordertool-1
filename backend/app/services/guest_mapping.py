"""Shared guest/selection → read-schema mapping helpers.

Extracted from guest_service so both GuestService and OrderService can reuse
the same mapping logic without duplication.
"""

from decimal import Decimal

from app.models.guest import Guest
from app.models.guest_selection import GuestSelection
from app.schemas.guest import GuestRead, GuestSelectionRead


def line_total(quantity: int, price: Decimal | None) -> Decimal:
    """Line total for a selection. A missing price counts as 0."""
    return Decimal(quantity) * (price if price is not None else Decimal(0))


def quantize(value: Decimal) -> str:
    return str(value.quantize(Decimal("0.01")))


def map_selection_to_read(selection: GuestSelection) -> GuestSelectionRead:
    item = selection.menu_item
    price = item.price if item is not None else None
    return GuestSelectionRead(
        id=selection.id,
        menu_item_id=selection.menu_item_id,
        item_name=item.name if item is not None else "",
        item_price=quantize(price) if price is not None else None,
        item_category=item.category if item is not None else None,
        note=selection.note,
        quantity=selection.quantity,
        line_total=quantize(line_total(selection.quantity, price)),
    )


def map_guest_to_read(guest: Guest) -> GuestRead:
    selections = list(guest.selections or [])
    selection_reads = [map_selection_to_read(sel) for sel in selections]
    subtotal = sum(
        (
            line_total(sel.quantity, sel.menu_item.price if sel.menu_item else None)
            for sel in selections
        ),
        Decimal(0),
    )
    return GuestRead(
        id=guest.id,
        order_id=guest.order_id,
        name=guest.name,
        status=guest.status,
        selections=selection_reads,
        subtotal=quantize(subtotal),
    )
