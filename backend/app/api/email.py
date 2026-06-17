"""Email router: POST /orders/{order_id}/email."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.deps import get_email_service
from app.schemas.email import OrderEmailResult, OrderEmailSend
from app.services.email_service import EmailService

router = APIRouter(prefix="/orders", tags=["email"])


@router.post("/{order_id}/email", response_model=OrderEmailResult)
async def send_order_email(
    order_id: uuid.UUID,
    payload: OrderEmailSend,
    service: Annotated[EmailService, Depends(get_email_service)],
) -> OrderEmailResult:
    # Dispatch is logged at the service layer; the router stays thin.
    return await service.send_order_email(order_id, payload)
