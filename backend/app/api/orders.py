import uuid
import logging
from decimal import Decimal
from typing import Annotated
from fastapi import APIRouter, Depends, Response
from app.api.deps import get_order_service
from app.schemas.menu_item import MenuItemCreate, MenuItemRead
from app.schemas.order import OrderRead
from app.services.order_service import OrderService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/orders", tags=["orders"])


def _order_to_read(order: object) -> OrderRead:
    menu_items = []
    for item in getattr(order, "menu_items", []):
        price_val = getattr(item, "price", None)
        menu_items.append(
            MenuItemRead(
                id=getattr(item, "id"),
                name=getattr(item, "name"),
                price=str(price_val.quantize(Decimal("0.01"))) if price_val is not None else None,
                category=getattr(item, "category", None),
            )
        )
    return OrderRead(
        id=getattr(order, "id"),
        restaurant_name=getattr(order, "restaurant_name"),
        state=getattr(order, "state"),
        menu_items=menu_items,
    )


def _item_to_read(item: object) -> MenuItemRead:
    price_val = getattr(item, "price", None)
    return MenuItemRead(
        id=getattr(item, "id"),
        name=getattr(item, "name"),
        price=str(price_val.quantize(Decimal("0.01"))) if price_val is not None else None,
        category=getattr(item, "category", None),
    )


@router.post("", status_code=201, response_model=OrderRead)
async def create_order(
    service: Annotated[OrderService, Depends(get_order_service)],
) -> OrderRead:
    order = await service.create_order()
    logger.info("POST /orders -> order id=%s", order.id)
    return _order_to_read(order)


@router.get("/{order_id}", response_model=OrderRead)
async def get_order(
    order_id: uuid.UUID,
    service: Annotated[OrderService, Depends(get_order_service)],
) -> OrderRead:
    order = await service.get_order(order_id)
    return _order_to_read(order)


@router.post("/{order_id}/menu-items", status_code=201, response_model=MenuItemRead)
async def add_menu_item(
    order_id: uuid.UUID,
    payload: MenuItemCreate,
    service: Annotated[OrderService, Depends(get_order_service)],
) -> MenuItemRead:
    item = await service.add_menu_item(order_id, payload)
    logger.info("POST /orders/%s/menu-items -> item id=%s", order_id, item.id)
    return _item_to_read(item)


@router.delete("/{order_id}/menu-items/{item_id}", status_code=204)
async def remove_menu_item(
    order_id: uuid.UUID,
    item_id: uuid.UUID,
    service: Annotated[OrderService, Depends(get_order_service)],
) -> Response:
    await service.remove_menu_item(order_id, item_id)
    return Response(status_code=204)
