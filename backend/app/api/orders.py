import uuid
import logging
from typing import Annotated
from fastapi import APIRouter, Depends, Response
from app.api.deps import get_order_service
from app.schemas.export import OrderExportRead
from app.schemas.menu_item import MenuItemCreate, MenuItemRead
from app.schemas.order import OrderOverviewRead, OrderRead
from app.services.order_service import OrderService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("", status_code=201, response_model=OrderRead)
async def create_order(
    service: Annotated[OrderService, Depends(get_order_service)],
) -> OrderRead:
    order_read = await service.create_order()
    logger.info("POST /orders -> order id=%s", order_read.id)
    return order_read


@router.get("/{order_id}", response_model=OrderRead)
async def get_order(
    order_id: uuid.UUID,
    service: Annotated[OrderService, Depends(get_order_service)],
) -> OrderRead:
    return await service.get_order(order_id)


@router.post("/{order_id}/close", response_model=OrderRead)
async def close_order(
    order_id: uuid.UUID,
    service: Annotated[OrderService, Depends(get_order_service)],
) -> OrderRead:
    order_read = await service.close_order(order_id)
    logger.info("POST /orders/%s/close -> state=%s", order_id, order_read.state)
    return order_read


@router.get("/{order_id}/overview", response_model=OrderOverviewRead)
async def get_order_overview(
    order_id: uuid.UUID,
    service: Annotated[OrderService, Depends(get_order_service)],
) -> OrderOverviewRead:
    return await service.get_order_overview(order_id)


@router.get("/{order_id}/export", response_model=OrderExportRead)
async def get_order_export(
    order_id: uuid.UUID,
    service: Annotated[OrderService, Depends(get_order_service)],
) -> OrderExportRead:
    return await service.get_order_export(order_id)


@router.post("/{order_id}/menu-items", status_code=201, response_model=MenuItemRead)
async def add_menu_item(
    order_id: uuid.UUID,
    payload: MenuItemCreate,
    service: Annotated[OrderService, Depends(get_order_service)],
) -> MenuItemRead:
    item_read = await service.add_menu_item(order_id, payload)
    logger.info("POST /orders/%s/menu-items -> item id=%s", order_id, item_read.id)
    return item_read


@router.delete("/{order_id}/menu-items/{item_id}", status_code=204)
async def remove_menu_item(
    order_id: uuid.UUID,
    item_id: uuid.UUID,
    service: Annotated[OrderService, Depends(get_order_service)],
) -> Response:
    await service.remove_menu_item(order_id, item_id)
    return Response(status_code=204)
