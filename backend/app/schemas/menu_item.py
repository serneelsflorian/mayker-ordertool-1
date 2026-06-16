import uuid
from typing import Optional
from pydantic import BaseModel


class MenuItemCreate(BaseModel):
    name: str
    price: Optional[str] = None
    category: Optional[str] = None


class MenuItemRead(BaseModel):
    id: uuid.UUID
    name: str
    price: Optional[str] = None
    category: Optional[str] = None

    model_config = {"from_attributes": True}
