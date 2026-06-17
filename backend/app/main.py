from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.orders import router as orders_router
from app.api.guests import router as guests_router
from app.error_handlers import app_exception_handler
from app.exceptions import AppException
from app.logging_config import configure_logging
from app.config import settings

configure_logging(debug=settings.debug)

app = FastAPI(title="Ordertool API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(AppException, app_exception_handler)

app.include_router(orders_router, prefix="/api")
app.include_router(guests_router, prefix="/api")
