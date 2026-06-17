"""Email router: POST /orders/{order_id}/email."""

import uuid
import logging
from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.deps import get_email_service
from app.schemas.email import OrderEmailResult, OrderEmailSend
from app.services.email_service import EmailService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/orders", tags=["email"])


@router.post("/{order_id}/email", response_model=OrderEmailResult)
async def send_order_email(
    order_id: uuid.UUID,
    payload: OrderEmailSend,
    service: Annotated[EmailService, Depends(get_email_service)],
) -> OrderEmailResult:
    result = await service.send_order_email(order_id, payload)
    logger.info(
        "POST /orders/%s/email -> status=%s to=%s",
        order_id,
        result.status,
        result.to,
    )
    return result
