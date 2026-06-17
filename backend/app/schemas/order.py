import uuid
from pydantic import BaseModel
from app.schemas.guest import GuestRead
from app.schemas.menu_item import MenuItemRead


class OrderRead(BaseModel):
    id: uuid.UUID
    restaurant_name: str
    state: str
    menu_items: list[MenuItemRead] = []

    model_config = {"from_attributes": True}


class OrderOverviewRead(BaseModel):
    id: uuid.UUID
    restaurant_name: str
    state: str
    guests: list[GuestRead] = []
    submitted_count: int
    guest_count: int

    model_config = {"from_attributes": True}
