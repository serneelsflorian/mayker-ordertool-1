"""Unit tests for the pure email content builder."""

import uuid


from app.schemas.export import OrderExportLine, OrderExportRead
from app.services.email_builder import PRANK_LINE, build_order_email

RESTAURANT = "Trattoria Demo"


def _export(
    restaurant_name: str = RESTAURANT,
    lines: list[OrderExportLine] | None = None,
    total: str = "0.00",
    text: str | None = None,
) -> OrderExportRead:
    resolved_lines = lines or []
    if text is None:
        parts = [restaurant_name, ""]
        for line in resolved_lines:
            parts.append(f"{line.quantity}x {line.item_name}")
            if line.note:
                parts.append(f"   - {line.note}")
        if resolved_lines:
            parts.append("")
        parts.append(f"Total: €{total}")
        resolved_text = "\n".join(parts)
    else:
        resolved_text = text
    return OrderExportRead(
        id=uuid.uuid4(),
        restaurant_name=restaurant_name,
        lines=resolved_lines,
        total=total,
        text=resolved_text,
    )


class TestSubject:
    def test_subject_contains_restaurant_name(self):
        content = build_order_email(_export(restaurant_name="Pizza Palace"))
        assert "Pizza Palace" in content.subject

    def test_subject_format(self):
        content = build_order_email(_export(restaurant_name=RESTAURANT))
        assert content.subject == f"Your {RESTAURANT} order"


class TestBodyPrankLine:
    def test_body_contains_prank_line(self):
        content = build_order_email(_export())
        assert PRANK_LINE in content.body

    def test_prank_line_is_unambiguously_playful(self):
        # The prank line must mention the bill and inbox to be clearly tongue-in-cheek.
        content = build_order_email(_export())
        assert "bill" in content.body
        assert "inbox" in content.body

    def test_prank_line_precedes_export_text(self):
        export = _export(
            lines=[OrderExportLine(quantity=2, item_name="Margherita", note=None)],
            total="19.00",
        )
        content = build_order_email(export)
        prank_pos = content.body.index(PRANK_LINE)
        header_pos = content.body.index(RESTAURANT)
        assert prank_pos < header_pos


class TestBodyExportContent:
    def test_body_contains_restaurant_header(self):
        content = build_order_email(_export(restaurant_name=RESTAURANT))
        assert RESTAURANT in content.body

    def test_body_contains_grouped_line(self):
        lines = [OrderExportLine(quantity=3, item_name="Margherita", note=None)]
        content = build_order_email(_export(lines=lines, total="28.50"))
        assert "3x Margherita" in content.body

    def test_body_contains_total(self):
        lines = [OrderExportLine(quantity=1, item_name="Diavola", note=None)]
        content = build_order_email(_export(lines=lines, total="12.00"))
        assert "Total: €12.00" in content.body

    def test_body_contains_note_line(self):
        lines = [OrderExportLine(quantity=1, item_name="Margherita", note="no onions")]
        content = build_order_email(_export(lines=lines, total="9.50"))
        assert "no onions" in content.body


class TestEdgeCases:
    def test_empty_order_body_contains_header_and_zero_total(self):
        export = _export(restaurant_name=RESTAURANT, lines=[], total="0.00")
        content = build_order_email(export)
        assert RESTAURANT in content.body
        assert "Total: €0.00" in content.body

    def test_empty_order_body_still_has_prank_line(self):
        export = _export(lines=[], total="0.00")
        content = build_order_email(export)
        assert PRANK_LINE in content.body

    def test_subject_and_body_are_non_empty_strings(self):
        content = build_order_email(_export())
        assert isinstance(content.subject, str) and content.subject
        assert isinstance(content.body, str) and content.body
