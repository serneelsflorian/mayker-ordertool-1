"""Unit tests for the consolidated export builder (pure, no DB)."""

import uuid
from decimal import Decimal
from types import SimpleNamespace

from app.schemas.export import OrderExportRead
from app.services.export_builder import build_export

RESTAURANT = "Trattoria Demo"


def _item(name="Margherita", price="9.50"):
    return SimpleNamespace(
        id=uuid.uuid4(),
        name=name,
        price=Decimal(price) if price is not None else None,
    )


def _selection(item, quantity=1, note=None):
    return SimpleNamespace(
        id=uuid.uuid4(),
        menu_item_id=item.id,
        menu_item=item,
        note=note,
        quantity=quantity,
    )


def _guest(selections, status="editing"):
    return SimpleNamespace(
        id=uuid.uuid4(), name="Guest", status=status, selections=selections
    )


class TestMergeRule:
    def test_same_item_same_note_merges_quantities(self):
        margherita = _item()
        guests = [
            _guest([_selection(margherita, quantity=2)]),
            _guest([_selection(margherita, quantity=1)]),
        ]

        result = build_export(uuid.uuid4(), RESTAURANT, guests)

        assert isinstance(result, OrderExportRead)
        assert len(result.lines) == 1
        assert result.lines[0].quantity == 3
        assert result.lines[0].item_name == "Margherita"
        assert result.lines[0].note is None
        assert "3x Margherita" in result.text

    def test_same_item_different_notes_stay_separate(self):
        margherita = _item()
        guests = [
            _guest(
                [
                    _selection(margherita, quantity=2),
                    _selection(margherita, quantity=1, note="no onions"),
                ]
            )
        ]

        result = build_export(uuid.uuid4(), RESTAURANT, guests)

        assert len(result.lines) == 2
        noted = [line for line in result.lines if line.note == "no onions"]
        plain = [line for line in result.lines if line.note is None]
        assert noted and noted[0].quantity == 1
        assert plain and plain[0].quantity == 2
        # Note is rendered beneath its line in the text block.
        assert "1x Margherita" in result.text
        assert "   - no onions" in result.text

    def test_whitespace_only_note_treated_as_no_note(self):
        margherita = _item()
        guests = [
            _guest(
                [
                    _selection(margherita, quantity=1),
                    _selection(margherita, quantity=1, note="   "),
                ]
            )
        ]

        result = build_export(uuid.uuid4(), RESTAURANT, guests)

        # Both selections merge into a single no-note line.
        assert len(result.lines) == 1
        assert result.lines[0].quantity == 2
        assert result.lines[0].note is None

    def test_distinct_items_are_separate_lines(self):
        margherita = _item(name="Margherita", price="9.50")
        diavola = _item(name="Diavola", price="12.00")
        guests = [_guest([_selection(margherita), _selection(diavola)])]

        result = build_export(uuid.uuid4(), RESTAURANT, guests)

        names = {line.item_name for line in result.lines}
        assert names == {"Margherita", "Diavola"}
        # Deterministic ordering: alphabetical by item name (Diavola before Margherita).
        assert [line.item_name for line in result.lines] == ["Diavola", "Margherita"]


class TestTotal:
    def test_total_sums_across_all_guests(self):
        margherita = _item(price="9.50")
        guests = [
            _guest([_selection(margherita, quantity=2)]),  # 19.00
            _guest([_selection(margherita, quantity=1)]),  # 9.50
        ]

        result = build_export(uuid.uuid4(), RESTAURANT, guests)

        assert result.total == "28.50"
        assert "Total: €28.50" in result.text

    def test_item_with_no_price_counts_as_zero(self):
        priced = _item(name="Margherita", price="9.50")
        free = _item(name="Garlic Bread", price=None)
        guests = [
            _guest([_selection(priced, quantity=1), _selection(free, quantity=3)])
        ]

        result = build_export(uuid.uuid4(), RESTAURANT, guests)

        # 1 * 9.50 + 3 * 0 = 9.50
        assert result.total == "9.50"
        # The price-less item still appears as a line.
        assert "3x Garlic Bread" in result.text

    def test_editing_and_submitted_guests_both_counted(self):
        margherita = _item(price="9.50")
        guests = [
            _guest([_selection(margherita, quantity=1)], status="submitted"),
            _guest([_selection(margherita, quantity=1)], status="editing"),
        ]

        result = build_export(uuid.uuid4(), RESTAURANT, guests)

        assert result.lines[0].quantity == 2
        assert result.total == "19.00"


class TestHeaderAndEmpty:
    def test_restaurant_name_is_the_header(self):
        result = build_export(uuid.uuid4(), RESTAURANT, [])
        assert result.restaurant_name == RESTAURANT
        assert result.text.splitlines()[0] == RESTAURANT

    def test_empty_order_has_no_lines_and_zero_total(self):
        result = build_export(uuid.uuid4(), RESTAURANT, [])
        assert result.lines == []
        assert result.total == "0.00"
        assert result.text == f"{RESTAURANT}\n\nTotal: €0.00"

    def test_guest_with_no_selections_is_ignored(self):
        result = build_export(uuid.uuid4(), RESTAURANT, [_guest([])])
        assert result.lines == []
        assert result.total == "0.00"
