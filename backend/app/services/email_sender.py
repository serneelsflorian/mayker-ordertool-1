"""Email sender abstraction and implementations.

`EmailSender` is a Protocol so any object with the right async `send` signature
works — useful for substituting a recording fake in tests without inheriting.

`SmtpEmailSender` dispatches over SMTP via aiosmtplib (async, fits the FastAPI
stack). `LoggingEmailSender` logs the composed message and returns success; it
is the default when no SMTP host is configured (demo/CI).

`build_email_sender` selects the implementation from the application settings.
"""

import logging
from email.message import EmailMessage
from typing import Protocol

import aiosmtplib

logger = logging.getLogger(__name__)


class EmailSender(Protocol):
    """Protocol for asynchronous email dispatch."""

    async def send(
        self,
        *,
        to: str,
        cc: str | None,
        bcc: str | None,
        subject: str,
        body: str,
    ) -> None:
        """Send an email.

        BCC recipients must receive the message (via the SMTP envelope) but
        must not appear in the message headers visible to other recipients.
        """
        ...  # pragma: no cover


class SmtpEmailSender:
    """Sends email over SMTP using aiosmtplib.

    ``tls_mode`` selects how the connection is secured, because the right
    mechanism depends on the port:
      - "starttls": connect in plaintext then upgrade (submission port 587).
      - "tls": implicit TLS from the first byte (SMTPS port 465).
      - "none": no encryption (local test servers such as MailHog).
    Passing the wrong one (e.g. implicit TLS to a 587 STARTTLS server) makes
    the connection hang or fail, so it must be explicit rather than a single
    boolean.
    """

    def __init__(
        self,
        host: str,
        port: int,
        username: str,
        password: str,
        tls_mode: str,
        from_address: str,
    ) -> None:
        self._host = host
        self._port = port
        self._username = username
        self._password = password
        self._tls_mode = tls_mode
        self._from_address = from_address

    def _tls_kwargs(self) -> dict[str, bool]:
        """Translate the TLS mode into aiosmtplib connection kwargs."""
        if self._tls_mode == "tls":
            return {"use_tls": True}
        if self._tls_mode == "none":
            # Disable both implicit TLS and the automatic STARTTLS upgrade.
            return {"use_tls": False, "start_tls": False}
        # Default: STARTTLS upgrade after a plaintext connect (port 587).
        return {"start_tls": True}

    async def send(
        self,
        *,
        to: str,
        cc: str | None,
        bcc: str | None,
        subject: str,
        body: str,
    ) -> None:
        message = EmailMessage()
        message["From"] = self._from_address
        message["To"] = to
        message["Subject"] = subject
        if cc:
            message["Cc"] = cc

        # BCC is intentionally omitted from headers; it is passed only in the
        # SMTP envelope (recipients list) so the BCC addressee receives the
        # mail but is invisible to To/Cc recipients.
        message.set_content(body)

        recipients = [to]
        if cc:
            recipients.append(cc)
        if bcc:
            recipients.append(bcc)

        await aiosmtplib.send(
            message,
            hostname=self._host,
            port=self._port,
            username=self._username or None,
            password=self._password or None,
            recipients=recipients,
            **self._tls_kwargs(),
        )
        logger.info(
            "Email sent via SMTP: to=%s cc=%s bcc=%s subject=%r",
            to,
            cc,
            bcc,
            subject,
        )


class LoggingEmailSender:
    """Demo/CI sender that logs the email and returns success without dispatching."""

    async def send(
        self,
        *,
        to: str,
        cc: str | None,
        bcc: str | None,
        subject: str,
        body: str,
    ) -> None:
        logger.info(
            "Email (logging only): to=%s cc=%s bcc=%s subject=%r body_preview=%r",
            to,
            cc,
            bcc,
            subject,
            body[:120],
        )


def build_email_sender(settings: object) -> EmailSender:
    """Factory: return SmtpEmailSender when smtp_host is configured, else LoggingEmailSender."""
    smtp_host: str = getattr(settings, "smtp_host", "")
    if smtp_host:
        return SmtpEmailSender(
            host=smtp_host,
            port=getattr(settings, "smtp_port", 587),
            username=getattr(settings, "smtp_username", ""),
            password=getattr(settings, "smtp_password", ""),
            tls_mode=getattr(settings, "smtp_tls_mode", "starttls"),
            from_address=getattr(settings, "email_from", "orders@ordertool.demo"),
        )
    logger.debug("SMTP host not configured; using LoggingEmailSender")
    return LoggingEmailSender()
