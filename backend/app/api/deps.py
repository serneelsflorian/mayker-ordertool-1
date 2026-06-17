from typing import Annotated
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_session
from app.services.guest_service import GuestService
from app.services.order_service import OrderService


async def get_order_service(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> OrderService:
    return OrderService(session)


async def get_guest_service(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> GuestService:
    return GuestService(session)
