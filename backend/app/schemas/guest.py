import uuid
from typing import Optional
from pydantic import BaseModel


class GuestCreate(BaseModel):
    name: str


class GuestSelectionCreate(BaseModel):
    menu_item_id: uuid.UUID
    note: Optional[str] = None
    quantity: int = 1


class GuestSelectionUpdate(BaseModel):
    quantity: Optional[int] = None
    note: Optional[str] = None


class GuestSelectionRead(BaseModel):
    id: uuid.UUID
    menu_item_id: uuid.UUID
    item_name: str
    item_price: Optional[str]
    item_category: Optional[str]
    note: Optional[str]
    quantity: int
    line_total: str

    model_config = {"from_attributes": True}


class GuestRead(BaseModel):
    id: uuid.UUID
    order_id: uuid.UUID
    name: str
    status: str
    selections: list[GuestSelectionRead]
    subtotal: str

    model_config = {"from_attributes": True}
