"""Schemas for the order email endpoint."""

from typing import Literal

from pydantic import BaseModel, EmailStr, field_validator


class OrderEmailSend(BaseModel):
    """Request body for sending the consolidated order overview by email."""

    to: EmailStr
    cc: EmailStr | None = None
    bcc: EmailStr | None = None

    @field_validator("cc", mode="before")
    @classmethod
    def _coerce_cc(cls, v: object) -> object:
        """Coerce blank/whitespace-only strings to None before EmailStr validates."""
        if isinstance(v, str) and not v.strip():
            return None
        return v

    @field_validator("bcc", mode="before")
    @classmethod
    def _coerce_bcc(cls, v: object) -> object:
        """Coerce blank/whitespace-only strings to None before EmailStr validates."""
        if isinstance(v, str) and not v.strip():
            return None
        return v


class OrderEmailResult(BaseModel):
    """Response returned after a successful email dispatch."""

    status: Literal["sent"]
    to: str
    cc: str | None
    bcc: str | None
