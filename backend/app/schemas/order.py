import uuid
from pydantic import BaseModel
from app.schemas.menu_item import MenuItemRead


class OrderRead(BaseModel):
    id: uuid.UUID
    restaurant_name: str
    state: str
    menu_items: list[MenuItemRead] = []

    model_config = {"from_attributes": True}
