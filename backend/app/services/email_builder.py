"""Pure email content builder.

Composes the subject and body for the order overview email from the
consolidated export produced by Story 5's export_builder. Kept free of
all I/O so it can be unit-tested in isolation.
"""

from pydantic import BaseModel

from app.schemas.export import OrderExportRead

PRANK_LINE = (
    "Thank you for ordering! The bill will be sent to your email shortly, "
    "so keep an eye on your inbox \U0001f609"
)


class EmailContent(BaseModel):
    """Subject and plain-text body for the order overview email."""

    subject: str
    body: str


def build_order_email(export: OrderExportRead) -> EmailContent:
    """Compose the email subject and playful body from a consolidated export.

    The body opens with an unambiguous prank line and then includes the full
    export block (restaurant header, grouped item lines, total) so the
    recipient sees exactly what was ordered.
    """
    subject = f"Your {export.restaurant_name} order"
    body = f"{PRANK_LINE}\n\n{export.text}"
    return EmailContent(subject=subject, body=body)
