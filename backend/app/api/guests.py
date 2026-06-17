import uuid
import logging
from typing import Annotated
from fastapi import APIRouter, Depends
from app.api.deps import get_guest_service
from app.schemas.guest import (
    GuestCreate,
    GuestRead,
    GuestSelectionCreate,
    GuestSelectionUpdate,
)
from app.services.guest_service import GuestService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/orders", tags=["guests"])


@router.post("/{order_id}/guests", status_code=201, response_model=GuestRead)
async def join_guest(
    order_id: uuid.UUID,
    payload: GuestCreate,
    service: Annotated[GuestService, Depends(get_guest_service)],
) -> GuestRead:
    guest = await service.join_guest(order_id, payload)
    logger.info("POST /orders/%s/guests -> guest id=%s", order_id, guest.id)
    return guest


@router.get("/{order_id}/guests/{guest_id}", response_model=GuestRead)
async def get_guest(
    order_id: uuid.UUID,
    guest_id: uuid.UUID,
    service: Annotated[GuestService, Depends(get_guest_service)],
) -> GuestRead:
    return await service.get_guest(order_id, guest_id)


@router.post("/{order_id}/guests/{guest_id}/selections", response_model=GuestRead)
async def add_selection(
    order_id: uuid.UUID,
    guest_id: uuid.UUID,
    payload: GuestSelectionCreate,
    service: Annotated[GuestService, Depends(get_guest_service)],
) -> GuestRead:
    guest = await service.add_selection(order_id, guest_id, payload)
    logger.info("POST /orders/%s/guests/%s/selections", order_id, guest_id)
    return guest


@router.patch(
    "/{order_id}/guests/{guest_id}/selections/{selection_id}", response_model=GuestRead
)
async def update_selection(
    order_id: uuid.UUID,
    guest_id: uuid.UUID,
    selection_id: uuid.UUID,
    payload: GuestSelectionUpdate,
    service: Annotated[GuestService, Depends(get_guest_service)],
) -> GuestRead:
    guest = await service.update_selection(order_id, guest_id, selection_id, payload)
    logger.info(
        "PATCH /orders/%s/guests/%s/selections/%s", order_id, guest_id, selection_id
    )
    return guest


@router.delete(
    "/{order_id}/guests/{guest_id}/selections/{selection_id}", response_model=GuestRead
)
async def remove_selection(
    order_id: uuid.UUID,
    guest_id: uuid.UUID,
    selection_id: uuid.UUID,
    service: Annotated[GuestService, Depends(get_guest_service)],
) -> GuestRead:
    guest = await service.remove_selection(order_id, guest_id, selection_id)
    logger.info(
        "DELETE /orders/%s/guests/%s/selections/%s", order_id, guest_id, selection_id
    )
    return guest
