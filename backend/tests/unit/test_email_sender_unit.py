"""Unit tests for the email sender abstraction and TLS-mode selection."""

from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

from app.services.email_sender import (
    LoggingEmailSender,
    SmtpEmailSender,
    build_email_sender,
)


def _smtp(tls_mode: str = "starttls") -> SmtpEmailSender:
    return SmtpEmailSender(
        host="smtp.example.com",
        port=587,
        username="user",
        password="secret",
        tls_mode=tls_mode,
        from_address="orders@ordertool.demo",
    )


class TestTlsKwargs:
    def test_starttls_mode_uses_start_tls(self):
        assert _smtp("starttls")._tls_kwargs() == {"start_tls": True}

    def test_tls_mode_uses_implicit_tls(self):
        assert _smtp("tls")._tls_kwargs() == {"use_tls": True}

    def test_none_mode_disables_all_encryption(self):
        # Both flags off so aiosmtplib does not auto-upgrade via STARTTLS.
        assert _smtp("none")._tls_kwargs() == {"use_tls": False, "start_tls": False}


class TestSmtpSend:
    async def test_send_passes_starttls_kwargs_to_aiosmtplib(self):
        sender = _smtp("starttls")
        with patch(
            "app.services.email_sender.aiosmtplib.send", new=AsyncMock()
        ) as mock_send:
            await sender.send(
                to="alice@example.com",
                cc=None,
                bcc=None,
                subject="Hi",
                body="Body",
            )

        _, kwargs = mock_send.call_args
        assert kwargs["start_tls"] is True
        assert "use_tls" not in kwargs
        assert kwargs["recipients"] == ["alice@example.com"]

    async def test_send_includes_bcc_in_envelope_but_not_headers(self):
        sender = _smtp("tls")
        with patch(
            "app.services.email_sender.aiosmtplib.send", new=AsyncMock()
        ) as mock_send:
            await sender.send(
                to="alice@example.com",
                cc="boss@example.com",
                bcc="audit@example.com",
                subject="Hi",
                body="Body",
            )

        args, kwargs = mock_send.call_args
        message = args[0]
        # BCC is delivered (envelope) but hidden from the visible headers.
        assert kwargs["recipients"] == [
            "alice@example.com",
            "boss@example.com",
            "audit@example.com",
        ]
        assert message["To"] == "alice@example.com"
        assert message["Cc"] == "boss@example.com"
        assert message["Bcc"] is None

    async def test_send_propagates_transport_error(self):
        sender = _smtp("starttls")
        with patch(
            "app.services.email_sender.aiosmtplib.send",
            new=AsyncMock(side_effect=ConnectionError("refused")),
        ):
            with pytest.raises(ConnectionError):
                await sender.send(
                    to="alice@example.com",
                    cc=None,
                    bcc=None,
                    subject="Hi",
                    body="Body",
                )


class TestBuildEmailSender:
    def test_returns_logging_sender_when_host_empty(self):
        settings = SimpleNamespace(smtp_host="")
        assert isinstance(build_email_sender(settings), LoggingEmailSender)

    def test_returns_smtp_sender_when_host_configured(self):
        settings = SimpleNamespace(
            smtp_host="smtp.example.com",
            smtp_port=465,
            smtp_username="user",
            smtp_password="secret",
            smtp_tls_mode="tls",
            email_from="orders@ordertool.demo",
        )
        sender = build_email_sender(settings)
        assert isinstance(sender, SmtpEmailSender)
        assert sender._tls_mode == "tls"


class TestLoggingSender:
    async def test_logging_sender_send_succeeds_without_dispatch(self):
        sender = LoggingEmailSender()
        # Should not raise and returns None.
        result = await sender.send(
            to="alice@example.com",
            cc=None,
            bcc=None,
            subject="Hi",
            body="Body",
        )
        assert result is None
