"""Integration tests for POST /orders/{order_id}/email router."""

import uuid

import pytest

from app.api.deps import get_email_service
from app.main import app
from app.services.email_service import EmailService


class RecordingEmailSender:
    """Fake sender that records calls; used via dependency override."""

    def __init__(self):
        self.calls: list[dict] = []

    async def send(self, *, to, cc, bcc, subject, body):
        self.calls.append(
            {"to": to, "cc": cc, "bcc": bcc, "subject": subject, "body": body}
        )


_recording_sender = RecordingEmailSender()


@pytest.fixture(autouse=True)
def _override_email_sender(db_session):
    """Route the email endpoint through a recording sender bound to the test
    session, so dispatch is captured without contacting a real mail server.

    The sender's recorded calls are reset before every test so no mutable state
    leaks between tests regardless of execution order."""
    _recording_sender.calls.clear()
    app.dependency_overrides[get_email_service] = lambda: EmailService(
        db_session, _recording_sender
    )
    yield
    app.dependency_overrides.pop(get_email_service, None)


class TestEmailRouterHappyPath:
    async def test_post_email_closed_order_returns_200_with_status_sent(self, client):
        order_id = (await client.post("/api/orders")).json()["id"]
        await client.post(f"/api/orders/{order_id}/close")

        resp = await client.post(
            f"/api/orders/{order_id}/email",
            json={"to": "alice@example.com"},
        )

        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "sent"
        assert body["to"] == "alice@example.com"

    async def test_post_email_records_to_recipient(self, client):
        order_id = (await client.post("/api/orders")).json()["id"]
        await client.post(f"/api/orders/{order_id}/close")

        await client.post(
            f"/api/orders/{order_id}/email",
            json={"to": "alice@example.com"},
        )

        assert len(_recording_sender.calls) == 1
        assert _recording_sender.calls[0]["to"] == "alice@example.com"

    async def test_post_email_with_cc_and_bcc_records_all_recipients(self, client):
        order_id = (await client.post("/api/orders")).json()["id"]
        await client.post(f"/api/orders/{order_id}/close")

        resp = await client.post(
            f"/api/orders/{order_id}/email",
            json={
                "to": "alice@example.com",
                "cc": "boss@example.com",
                "bcc": "audit@example.com",
            },
        )

        assert resp.status_code == 200
        body = resp.json()
        assert body["cc"] == "boss@example.com"
        assert body["bcc"] == "audit@example.com"
        call = _recording_sender.calls[0]
        assert call["cc"] == "boss@example.com"
        assert call["bcc"] == "audit@example.com"

    async def test_post_email_cc_bcc_absent_when_not_provided(self, client):
        order_id = (await client.post("/api/orders")).json()["id"]
        await client.post(f"/api/orders/{order_id}/close")

        resp = await client.post(
            f"/api/orders/{order_id}/email",
            json={"to": "alice@example.com"},
        )

        body = resp.json()
        assert body["cc"] is None
        assert body["bcc"] is None

    async def test_post_email_blank_cc_coerced_to_null(self, client):
        order_id = (await client.post("/api/orders")).json()["id"]
        await client.post(f"/api/orders/{order_id}/close")

        resp = await client.post(
            f"/api/orders/{order_id}/email",
            json={"to": "alice@example.com", "cc": "   ", "bcc": ""},
        )

        assert resp.status_code == 200
        body = resp.json()
        assert body["cc"] is None
        assert body["bcc"] is None

    async def test_post_email_order_state_unchanged_after_send(self, client):
        order_id = (await client.post("/api/orders")).json()["id"]
        await client.post(f"/api/orders/{order_id}/close")

        await client.post(
            f"/api/orders/{order_id}/email",
            json={"to": "alice@example.com"},
        )

        get_resp = await client.get(f"/api/orders/{order_id}")
        assert get_resp.json()["state"] == "closed"


class TestEmailRouterValidation:
    async def test_post_email_empty_to_returns_422(self, client):
        order_id = (await client.post("/api/orders")).json()["id"]
        await client.post(f"/api/orders/{order_id}/close")

        resp = await client.post(
            f"/api/orders/{order_id}/email",
            json={"to": ""},
        )

        assert resp.status_code == 422

    async def test_post_email_malformed_to_returns_422(self, client):
        order_id = (await client.post("/api/orders")).json()["id"]
        await client.post(f"/api/orders/{order_id}/close")

        resp = await client.post(
            f"/api/orders/{order_id}/email",
            json={"to": "not-an-email"},
        )

        assert resp.status_code == 422

    async def test_post_email_missing_to_returns_422(self, client):
        order_id = (await client.post("/api/orders")).json()["id"]
        await client.post(f"/api/orders/{order_id}/close")

        resp = await client.post(f"/api/orders/{order_id}/email", json={})

        assert resp.status_code == 422

    async def test_post_email_malformed_cc_returns_422(self, client):
        order_id = (await client.post("/api/orders")).json()["id"]
        await client.post(f"/api/orders/{order_id}/close")

        resp = await client.post(
            f"/api/orders/{order_id}/email",
            json={"to": "alice@example.com", "cc": "not-an-email"},
        )

        assert resp.status_code == 422


class TestEmailRouterOrderState:
    async def test_post_email_open_order_returns_409(self, client):
        order_id = (await client.post("/api/orders")).json()["id"]

        resp = await client.post(
            f"/api/orders/{order_id}/email",
            json={"to": "alice@example.com"},
        )

        assert resp.status_code == 409
        assert resp.json()["error"]["code"] == "ORDER_NOT_CLOSED"

    async def test_post_email_missing_order_returns_404(self, client):
        resp = await client.post(
            f"/api/orders/{uuid.uuid4()}/email",
            json={"to": "alice@example.com"},
        )

        assert resp.status_code == 404
        assert resp.json()["error"]["code"] == "ORDER_NOT_FOUND"
