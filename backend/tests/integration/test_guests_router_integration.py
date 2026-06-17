"""Integration tests for the guests router through ASGI."""

import uuid
from sqlalchemy import update

from app.models.order import Order


async def _seed_order_with_item(client, name="Margherita", price="9.50"):
    order_id = (await client.post("/api/orders")).json()["id"]
    item = (
        await client.post(
            f"/api/orders/{order_id}/menu-items",
            json={"name": name, "price": price, "category": "Pizza"},
        )
    ).json()
    return order_id, item


class TestJoinGuest:
    async def test_join_returns_201_with_editing_status(self, client):
        order_id, _ = await _seed_order_with_item(client)
        resp = await client.post(
            f"/api/orders/{order_id}/guests", json={"name": "Sara"}
        )
        assert resp.status_code == 201
        body = resp.json()
        assert body["name"] == "Sara"
        assert body["status"] == "editing"
        assert body["selections"] == []
        assert body["subtotal"] == "0.00"

    async def test_join_existing_name_returns_same_guest(self, client):
        order_id, _ = await _seed_order_with_item(client)
        first = (
            await client.post(f"/api/orders/{order_id}/guests", json={"name": "Sara"})
        ).json()
        second = (
            await client.post(f"/api/orders/{order_id}/guests", json={"name": "Sara"})
        ).json()
        assert first["id"] == second["id"]

    async def test_join_empty_name_returns_422(self, client):
        order_id, _ = await _seed_order_with_item(client)
        resp = await client.post(f"/api/orders/{order_id}/guests", json={"name": "  "})
        assert resp.status_code == 422
        assert resp.json()["error"]["code"] == "VALIDATION_ERROR"

    async def test_join_unknown_order_returns_404(self, client):
        resp = await client.post(
            f"/api/orders/{uuid.uuid4()}/guests", json={"name": "Sara"}
        )
        assert resp.status_code == 404
        assert resp.json()["error"]["code"] == "ORDER_NOT_FOUND"


class TestGetGuest:
    async def test_get_guest_returns_selections_and_subtotal(self, client):
        order_id, item = await _seed_order_with_item(client)
        guest_id = (
            await client.post(f"/api/orders/{order_id}/guests", json={"name": "Sara"})
        ).json()["id"]
        await client.post(
            f"/api/orders/{order_id}/guests/{guest_id}/selections",
            json={"menu_item_id": item["id"], "quantity": 2},
        )
        resp = await client.get(f"/api/orders/{order_id}/guests/{guest_id}")
        assert resp.status_code == 200
        body = resp.json()
        assert body["subtotal"] == "19.00"
        assert len(body["selections"]) == 1

    async def test_get_unknown_guest_returns_404(self, client):
        order_id, _ = await _seed_order_with_item(client)
        resp = await client.get(f"/api/orders/{order_id}/guests/{uuid.uuid4()}")
        assert resp.status_code == 404
        assert resp.json()["error"]["code"] == "GUEST_NOT_FOUND"


class TestSelections:
    async def test_add_selection_returns_200_with_line_total(self, client):
        order_id, item = await _seed_order_with_item(client)
        guest_id = (
            await client.post(f"/api/orders/{order_id}/guests", json={"name": "Sara"})
        ).json()["id"]
        resp = await client.post(
            f"/api/orders/{order_id}/guests/{guest_id}/selections",
            json={"menu_item_id": item["id"], "note": "no onions", "quantity": 2},
        )
        assert resp.status_code == 200
        body = resp.json()
        sel = body["selections"][0]
        assert sel["item_name"] == "Margherita"
        assert sel["note"] == "no onions"
        assert sel["line_total"] == "19.00"
        assert body["subtotal"] == "19.00"

    async def test_add_selection_unknown_item_returns_404(self, client):
        order_id, _ = await _seed_order_with_item(client)
        guest_id = (
            await client.post(f"/api/orders/{order_id}/guests", json={"name": "Sara"})
        ).json()["id"]
        resp = await client.post(
            f"/api/orders/{order_id}/guests/{guest_id}/selections",
            json={"menu_item_id": str(uuid.uuid4())},
        )
        assert resp.status_code == 404
        assert resp.json()["error"]["code"] == "MENU_ITEM_NOT_FOUND"

    async def test_add_selection_quantity_below_one_returns_422(self, client):
        order_id, item = await _seed_order_with_item(client)
        guest_id = (
            await client.post(f"/api/orders/{order_id}/guests", json={"name": "Sara"})
        ).json()["id"]
        resp = await client.post(
            f"/api/orders/{order_id}/guests/{guest_id}/selections",
            json={"menu_item_id": item["id"], "quantity": 0},
        )
        assert resp.status_code == 422

    async def test_patch_quantity_and_note(self, client):
        order_id, item = await _seed_order_with_item(client)
        guest_id = (
            await client.post(f"/api/orders/{order_id}/guests", json={"name": "Sara"})
        ).json()["id"]
        sel_id = (
            await client.post(
                f"/api/orders/{order_id}/guests/{guest_id}/selections",
                json={"menu_item_id": item["id"]},
            )
        ).json()["selections"][0]["id"]

        resp = await client.patch(
            f"/api/orders/{order_id}/guests/{guest_id}/selections/{sel_id}",
            json={"quantity": 3, "note": "extra cheese"},
        )
        assert resp.status_code == 200
        sel = resp.json()["selections"][0]
        assert sel["quantity"] == 3
        assert sel["note"] == "extra cheese"
        assert resp.json()["subtotal"] == "28.50"

    async def test_delete_selection_returns_200_with_body(self, client):
        order_id, item = await _seed_order_with_item(client)
        guest_id = (
            await client.post(f"/api/orders/{order_id}/guests", json={"name": "Sara"})
        ).json()["id"]
        sel_id = (
            await client.post(
                f"/api/orders/{order_id}/guests/{guest_id}/selections",
                json={"menu_item_id": item["id"]},
            )
        ).json()["selections"][0]["id"]

        resp = await client.delete(
            f"/api/orders/{order_id}/guests/{guest_id}/selections/{sel_id}"
        )
        assert resp.status_code == 200
        assert resp.json()["selections"] == []
        assert resp.json()["subtotal"] == "0.00"

    async def test_patch_unknown_selection_returns_404(self, client):
        order_id, _ = await _seed_order_with_item(client)
        guest_id = (
            await client.post(f"/api/orders/{order_id}/guests", json={"name": "Sara"})
        ).json()["id"]
        resp = await client.patch(
            f"/api/orders/{order_id}/guests/{guest_id}/selections/{uuid.uuid4()}",
            json={"quantity": 2},
        )
        assert resp.status_code == 404
        assert resp.json()["error"]["code"] == "GUEST_SELECTION_NOT_FOUND"


class TestOwnershipIsolation:
    async def test_guest_cannot_modify_another_guests_selection(self, client):
        """AC7: a guest editing/removing another guest's selection gets 404."""
        order_id, item = await _seed_order_with_item(client)
        guest_a = (
            await client.post(f"/api/orders/{order_id}/guests", json={"name": "Alice"})
        ).json()
        guest_b = (
            await client.post(f"/api/orders/{order_id}/guests", json={"name": "Bob"})
        ).json()
        b_sel = (
            await client.post(
                f"/api/orders/{order_id}/guests/{guest_b['id']}/selections",
                json={"menu_item_id": item["id"]},
            )
        ).json()["selections"][0]

        # Alice tries to PATCH / DELETE Bob's selection
        patch_resp = await client.patch(
            f"/api/orders/{order_id}/guests/{guest_a['id']}/selections/{b_sel['id']}",
            json={"quantity": 5},
        )
        delete_resp = await client.delete(
            f"/api/orders/{order_id}/guests/{guest_a['id']}/selections/{b_sel['id']}"
        )
        assert patch_resp.status_code == 404
        assert delete_resp.status_code == 404

    async def test_order_read_never_exposes_guest_data(self, client):
        """AC7: GET /orders/{id} returns only menu + state, never guest selections."""
        order_id, item = await _seed_order_with_item(client)
        guest_id = (
            await client.post(f"/api/orders/{order_id}/guests", json={"name": "Sara"})
        ).json()["id"]
        await client.post(
            f"/api/orders/{order_id}/guests/{guest_id}/selections",
            json={"menu_item_id": item["id"]},
        )
        body = (await client.get(f"/api/orders/{order_id}")).json()
        assert set(body.keys()) == {"id", "restaurant_name", "state", "menu_items"}


class TestClosedOrder:
    async def test_mutations_rejected_with_409_when_closed(self, client, db_session):
        """AC9: closed-order enforcement is server-side across sessions."""
        order_id, item = await _seed_order_with_item(client)
        guest_id = (
            await client.post(f"/api/orders/{order_id}/guests", json={"name": "Sara"})
        ).json()["id"]

        # Close the order directly in the DB (no close endpoint until STORY-4)
        await db_session.execute(
            update(Order).where(Order.id == uuid.UUID(order_id)).values(state="closed")
        )
        await db_session.commit()

        resp = await client.post(
            f"/api/orders/{order_id}/guests/{guest_id}/selections",
            json={"menu_item_id": item["id"]},
        )
        assert resp.status_code == 409
        assert resp.json()["error"]["code"] == "ORDER_CLOSED"


class TestSubmitGuest:
    async def test_submit_returns_200_with_status_submitted(self, client):
        order_id, item = await _seed_order_with_item(client)
        guest_id = (
            await client.post(f"/api/orders/{order_id}/guests", json={"name": "Sara"})
        ).json()["id"]
        await client.post(
            f"/api/orders/{order_id}/guests/{guest_id}/selections",
            json={"menu_item_id": item["id"]},
        )

        resp = await client.post(f"/api/orders/{order_id}/guests/{guest_id}/submit")
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "submitted"
        assert body["id"] == guest_id

    async def test_submit_with_no_items_returns_422(self, client):
        order_id, _ = await _seed_order_with_item(client)
        guest_id = (
            await client.post(f"/api/orders/{order_id}/guests", json={"name": "Sara"})
        ).json()["id"]

        resp = await client.post(f"/api/orders/{order_id}/guests/{guest_id}/submit")
        assert resp.status_code == 422
        assert resp.json()["error"]["code"] == "VALIDATION_ERROR"

    async def test_submit_on_closed_order_returns_409(self, client, db_session):
        order_id, item = await _seed_order_with_item(client)
        guest_id = (
            await client.post(f"/api/orders/{order_id}/guests", json={"name": "Sara"})
        ).json()["id"]
        await client.post(
            f"/api/orders/{order_id}/guests/{guest_id}/selections",
            json={"menu_item_id": item["id"]},
        )

        await db_session.execute(
            update(Order).where(Order.id == uuid.UUID(order_id)).values(state="closed")
        )
        await db_session.commit()

        resp = await client.post(f"/api/orders/{order_id}/guests/{guest_id}/submit")
        assert resp.status_code == 409
        assert resp.json()["error"]["code"] == "ORDER_CLOSED"

    async def test_submit_unknown_guest_returns_404(self, client):
        order_id, _ = await _seed_order_with_item(client)

        resp = await client.post(f"/api/orders/{order_id}/guests/{uuid.uuid4()}/submit")
        assert resp.status_code == 404
        assert resp.json()["error"]["code"] == "GUEST_NOT_FOUND"


class TestReopenGuest:
    async def test_reopen_returns_200_with_status_editing(self, client):
        order_id, item = await _seed_order_with_item(client)
        guest_id = (
            await client.post(f"/api/orders/{order_id}/guests", json={"name": "Sara"})
        ).json()["id"]
        await client.post(
            f"/api/orders/{order_id}/guests/{guest_id}/selections",
            json={"menu_item_id": item["id"]},
        )
        # Submit first
        await client.post(f"/api/orders/{order_id}/guests/{guest_id}/submit")

        resp = await client.post(f"/api/orders/{order_id}/guests/{guest_id}/reopen")
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "editing"
        assert body["id"] == guest_id

    async def test_reopen_on_closed_order_returns_409(self, client, db_session):
        order_id, item = await _seed_order_with_item(client)
        guest_id = (
            await client.post(f"/api/orders/{order_id}/guests", json={"name": "Sara"})
        ).json()["id"]

        await db_session.execute(
            update(Order).where(Order.id == uuid.UUID(order_id)).values(state="closed")
        )
        await db_session.commit()

        resp = await client.post(f"/api/orders/{order_id}/guests/{guest_id}/reopen")
        assert resp.status_code == 409
        assert resp.json()["error"]["code"] == "ORDER_CLOSED"


class TestAutoRevertOnSelectionMutation:
    async def test_selection_mutation_after_submit_returns_guest_with_status_editing(
        self, client
    ):
        order_id, item = await _seed_order_with_item(client)
        guest_id = (
            await client.post(f"/api/orders/{order_id}/guests", json={"name": "Sara"})
        ).json()["id"]
        sel_id = (
            await client.post(
                f"/api/orders/{order_id}/guests/{guest_id}/selections",
                json={"menu_item_id": item["id"]},
            )
        ).json()["selections"][0]["id"]

        # Submit the guest
        submit_body = (
            await client.post(f"/api/orders/{order_id}/guests/{guest_id}/submit")
        ).json()
        assert submit_body["status"] == "submitted"

        # Now update a selection: status must revert to editing
        resp = await client.patch(
            f"/api/orders/{order_id}/guests/{guest_id}/selections/{sel_id}",
            json={"quantity": 2},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "editing"
