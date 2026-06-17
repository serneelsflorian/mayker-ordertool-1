"""Unit tests for EmailService (mocked sender + repos)."""

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.exceptions import EmailSendError, OrderNotClosedError, OrderNotFoundError
from app.schemas.email import OrderEmailSend
from app.services.email_service import EmailService

RESTAURANT = "Trattoria Demo"


def _make_menu_item(name="Margherita", price=None):
    return SimpleNamespace(
        id=uuid.uuid4(),
        name=name,
        price=price,
    )


def _make_selection(item, quantity=1, note=None):
    return SimpleNamespace(
        id=uuid.uuid4(),
        menu_item_id=item.id,
        menu_item=item,
        note=note,
        quantity=quantity,
    )


def _make_guest(selections=None, status="submitted"):
    return SimpleNamespace(
        id=uuid.uuid4(),
        name="Alice",
        status=status,
        selections=selections or [],
    )


def _make_order(state="closed", order_id=None):
    return SimpleNamespace(
        id=order_id or uuid.uuid4(),
        restaurant_name=RESTAURANT,
        state=state,
    )


class FakeEmailSender:
    """Recording fake that captures send calls and succeeds."""

    def __init__(self):
        self.calls: list[dict] = []

    async def send(self, *, to, cc, bcc, subject, body):
        self.calls.append(
            {"to": to, "cc": cc, "bcc": bcc, "subject": subject, "body": body}
        )


class FailingEmailSender:
    """Fake sender that always raises."""

    async def send(self, *, to, cc, bcc, subject, body):
        raise RuntimeError("SMTP connection refused")


def _make_service(order, guests, sender):
    """Build an EmailService with mocked repositories."""
    session = MagicMock()
    # Prevent any accidental commit
    session.commit = AsyncMock(side_effect=AssertionError("commit must not be called"))

    service = EmailService(session, sender)

    order_repo_mock = AsyncMock()
    order_repo_mock.get_by_id = AsyncMock(return_value=order)

    guest_repo_mock = AsyncMock()
    guest_repo_mock.list_by_order = AsyncMock(return_value=guests)

    service._order_repo = order_repo_mock
    service._guest_repo = guest_repo_mock

    return service


class TestSendOrderEmailHappyPath:
    async def test_happy_path_returns_status_sent(self):
        order = _make_order(state="closed")
        sender = FakeEmailSender()
        service = _make_service(order, [], sender)
        payload = OrderEmailSend(to="alice@example.com")

        result = await service.send_order_email(order.id, payload)

        assert result.status == "sent"

    async def test_happy_path_dispatches_to_correct_to_address(self):
        order = _make_order(state="closed")
        sender = FakeEmailSender()
        service = _make_service(order, [], sender)
        payload = OrderEmailSend(to="alice@example.com")

        await service.send_order_email(order.id, payload)

        assert len(sender.calls) == 1
        assert sender.calls[0]["to"] == "alice@example.com"

    async def test_happy_path_dispatches_cc_and_bcc(self):
        order = _make_order(state="closed")
        sender = FakeEmailSender()
        service = _make_service(order, [], sender)
        payload = OrderEmailSend(
            to="alice@example.com",
            cc="boss@example.com",
            bcc="audit@example.com",
        )

        result = await service.send_order_email(order.id, payload)

        call = sender.calls[0]
        assert call["cc"] == "boss@example.com"
        assert call["bcc"] == "audit@example.com"
        assert result.cc == "boss@example.com"
        assert result.bcc == "audit@example.com"

    async def test_happy_path_result_echoes_recipients(self):
        order = _make_order(state="closed")
        sender = FakeEmailSender()
        service = _make_service(order, [], sender)
        payload = OrderEmailSend(to="alice@example.com", cc=None, bcc=None)

        result = await service.send_order_email(order.id, payload)

        assert result.to == "alice@example.com"
        assert result.cc is None
        assert result.bcc is None

    async def test_happy_path_does_not_call_session_commit(self):
        order = _make_order(state="closed")
        sender = FakeEmailSender()
        session = MagicMock()
        commit_mock = AsyncMock()
        session.commit = commit_mock

        service = EmailService(session, sender)
        service._order_repo = AsyncMock()
        service._order_repo.get_by_id = AsyncMock(return_value=order)
        service._guest_repo = AsyncMock()
        service._guest_repo.list_by_order = AsyncMock(return_value=[])

        payload = OrderEmailSend(to="alice@example.com")
        await service.send_order_email(order.id, payload)

        commit_mock.assert_not_called()

    async def test_happy_path_order_state_unchanged(self):
        order = _make_order(state="closed")
        sender = FakeEmailSender()
        service = _make_service(order, [], sender)
        payload = OrderEmailSend(to="alice@example.com")

        await service.send_order_email(order.id, payload)

        assert order.state == "closed"


class TestSendOrderEmailOrderNotFound:
    async def test_missing_order_raises_order_not_found_error(self):
        session = MagicMock()
        sender = FakeEmailSender()
        service = EmailService(session, sender)
        service._order_repo = AsyncMock()
        service._order_repo.get_by_id = AsyncMock(return_value=None)
        service._guest_repo = AsyncMock()

        payload = OrderEmailSend(to="alice@example.com")

        with pytest.raises(OrderNotFoundError):
            await service.send_order_email(uuid.uuid4(), payload)


class TestSendOrderEmailOpenOrder:
    async def test_open_order_raises_order_not_closed_error(self):
        order = _make_order(state="open")
        sender = FakeEmailSender()
        service = _make_service(order, [], sender)
        payload = OrderEmailSend(to="alice@example.com")

        with pytest.raises(OrderNotClosedError):
            await service.send_order_email(order.id, payload)

    async def test_open_order_does_not_dispatch_email(self):
        order = _make_order(state="open")
        sender = FakeEmailSender()
        service = _make_service(order, [], sender)
        payload = OrderEmailSend(to="alice@example.com")

        with pytest.raises(OrderNotClosedError):
            await service.send_order_email(order.id, payload)

        assert len(sender.calls) == 0


class TestSendOrderEmailSenderFailure:
    async def test_sender_exception_raises_email_send_error(self):
        order = _make_order(state="closed")
        sender = FailingEmailSender()
        service = _make_service(order, [], sender)
        payload = OrderEmailSend(to="alice@example.com")

        with pytest.raises(EmailSendError):
            await service.send_order_email(order.id, payload)

    async def test_sender_exception_wraps_original(self):
        order = _make_order(state="closed")
        sender = FailingEmailSender()
        service = _make_service(order, [], sender)
        payload = OrderEmailSend(to="alice@example.com")

        with pytest.raises(EmailSendError) as exc_info:
            await service.send_order_email(order.id, payload)

        assert exc_info.value.code == "EMAIL_SEND_FAILED"
