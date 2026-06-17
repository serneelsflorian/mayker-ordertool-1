import uuid
from pydantic import BaseModel


class OrderExportLine(BaseModel):
    """A single consolidated export line: a merged item + note with its quantity."""

    quantity: int
    item_name: str
    note: str | None = None

    model_config = {"from_attributes": True}


class OrderExportRead(BaseModel):
    """Consolidated, copy-paste-friendly export for manual Deliveroo re-entry.

    `text` is the canonical plain-text block (restaurant header, grouped lines,
    final total) that the admin copies; `lines` and `total` expose the same data
    in structured form.
    """

    id: uuid.UUID
    restaurant_name: str
    lines: list[OrderExportLine] = []
    total: str
    text: str

    model_config = {"from_attributes": True}
