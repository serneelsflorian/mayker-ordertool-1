"""Consolidated export builder.

Pure functions that merge every guest's selections into a single, copy-paste
friendly export for manual Deliveroo re-entry. The merge rule is a fixed product
decision (see CLAUDE.md): line items merge ONLY when both the menu item AND its
note match exactly; selections with different notes stay on separate lines.

Kept free of any database/session access so the merge, total, and text-rendering
logic can be unit-tested in isolation and reused server-side by later stories
(e.g. emailing the overview).
"""

import uuid
from decimal import Decimal

from app.models.guest import Guest
from app.schemas.export import OrderExportLine, OrderExportRead
from app.services.guest_mapping import line_total, quantize


def _normalize_note(note: str | None) -> str | None:
    """Empty or whitespace-only notes are treated as "no note" for merging."""
    if note is None:
        return None
    stripped = note.strip()
    return stripped or None


def build_export(
    order_id: uuid.UUID, restaurant_name: str, guests: list[Guest]
) -> OrderExportRead:
    """Build the consolidated export across all guests of an order.

    All guests are included regardless of status: in-progress ("editing")
    selections still count toward the final order, consistent with the admin
    overview. Items with no price contribute 0 to the total.
    """
    # Merge key: (menu_item_id, normalized_note). Preserves a running quantity
    # plus the display name needed to render the line.
    grouped: dict[tuple[uuid.UUID, str | None], dict] = {}
    total = Decimal(0)

    for guest in guests:
        for selection in guest.selections or []:
            item = selection.menu_item
            price = item.price if item is not None else None
            name = item.name if item is not None else ""
            note = _normalize_note(selection.note)
            key = (selection.menu_item_id, note)

            entry = grouped.get(key)
            if entry is None:
                grouped[key] = {
                    "item_name": name,
                    "note": note,
                    "quantity": selection.quantity,
                }
            else:
                entry["quantity"] += selection.quantity

            total += line_total(selection.quantity, price)

    # Deterministic ordering: item name (case-insensitive), then no-note line
    # before noted lines, then note text — stable output for copy-paste and tests.
    ordered = sorted(
        grouped.values(),
        key=lambda e: (
            e["item_name"].casefold(),
            e["note"] is not None,
            (e["note"] or "").casefold(),
        ),
    )

    lines = [
        OrderExportLine(
            quantity=entry["quantity"],
            item_name=entry["item_name"],
            note=entry["note"],
        )
        for entry in ordered
    ]
    total_str = quantize(total)
    text = _render_text(restaurant_name, lines, total_str)

    return OrderExportRead(
        id=order_id,
        restaurant_name=restaurant_name,
        lines=lines,
        total=total_str,
        text=text,
    )


def _render_text(restaurant_name: str, lines: list[OrderExportLine], total: str) -> str:
    """Render the canonical plain-text export block.

    Format: restaurant name header, a blank line, one entry per line
    (``{qty}x {item}`` with the note indented beneath when present), a blank
    line, then ``Total: €{amount}``.
    """
    parts: list[str] = [restaurant_name, ""]
    for line in lines:
        parts.append(f"{line.quantity}x {line.item_name}")
        if line.note:
            parts.append(f"   - {line.note}")
    if lines:
        parts.append("")
    parts.append(f"Total: €{total}")
    return "\n".join(parts)
