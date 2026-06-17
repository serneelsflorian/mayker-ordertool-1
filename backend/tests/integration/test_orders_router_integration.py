"""Integration tests for the orders router through ASGI."""

import uuid

from sqlalchemy import update

from app.models.guest import Guest


class TestCreateOrder:
    async def test_post_orders_returns_201_with_order(self, client):
        resp = await client.post("/api/orders")
        assert resp.status_code == 201
        body = resp.json()
        assert body["restaurant_name"] == "Trattoria Demo"
        assert body["state"] == "open"
        assert "id" in body
        assert body["menu_items"] == []

    async def test_post_orders_returns_uuid_id(self, client):
        resp = await client.post("/api/orders")
        body = resp.json()
        # Should parse as UUID
        uuid.UUID(body["id"])


class TestGetOrder:
    async def test_get_order_returns_200_with_items(self, client):
        # Create order first
        create_resp = await client.post("/api/orders")
        order_id = create_resp.json()["id"]

        resp = await client.get(f"/api/orders/{order_id}")
        assert resp.status_code == 200
        body = resp.json()
        assert body["id"] == order_id
        assert body["restaurant_name"] == "Trattoria Demo"

    async def test_get_order_returns_404_for_missing_order(self, client):
        resp = await client.get(f"/api/orders/{uuid.uuid4()}")
        assert resp.status_code == 404
        body = resp.json()
        assert body["error"]["code"] == "ORDER_NOT_FOUND"


class TestAddMenuItem:
    async def test_post_menu_items_returns_201(self, client):
        create_resp = await client.post("/api/orders")
        order_id = create_resp.json()["id"]

        resp = await client.post(
            f"/api/orders/{order_id}/menu-items",
            json={"name": "Margherita", "price": "9.50", "category": "Pizza"},
        )
        assert resp.status_code == 201
        body = resp.json()
        assert body["name"] == "Margherita"
        assert body["price"] == "9.50"
        assert body["category"] == "Pizza"

    async def test_post_menu_items_without_price_returns_201(self, client):
        create_resp = await client.post("/api/orders")
        order_id = create_resp.json()["id"]

        resp = await client.post(
            f"/api/orders/{order_id}/menu-items",
            json={"name": "Garlic Bread"},
        )
        assert resp.status_code == 201
        body = resp.json()
        assert body["price"] is None

    async def test_post_menu_items_empty_name_returns_422(self, client):
        create_resp = await client.post("/api/orders")
        order_id = create_resp.json()["id"]

        resp = await client.post(
            f"/api/orders/{order_id}/menu-items",
            json={"name": ""},
        )
        assert resp.status_code == 422
        body = resp.json()
        assert body["error"]["code"] == "VALIDATION_ERROR"

    async def test_post_menu_items_negative_price_returns_422(self, client):
        create_resp = await client.post("/api/orders")
        order_id = create_resp.json()["id"]

        resp = await client.post(
            f"/api/orders/{order_id}/menu-items",
            json={"name": "Item", "price": "-1"},
        )
        assert resp.status_code == 422
        body = resp.json()
        assert body["error"]["code"] == "VALIDATION_ERROR"

    async def test_post_menu_items_order_not_found_returns_404(self, client):
        resp = await client.post(
            f"/api/orders/{uuid.uuid4()}/menu-items",
            json={"name": "Item"},
        )
        assert resp.status_code == 404


class TestRemoveMenuItem:
    async def test_delete_menu_item_returns_204(self, client):
        create_resp = await client.post("/api/orders")
        order_id = create_resp.json()["id"]

        add_resp = await client.post(
            f"/api/orders/{order_id}/menu-items",
            json={"name": "Item to delete"},
        )
        item_id = add_resp.json()["id"]

        resp = await client.delete(f"/api/orders/{order_id}/menu-items/{item_id}")
        assert resp.status_code == 204

    async def test_delete_menu_item_returns_404_for_missing_item(self, client):
        create_resp = await client.post("/api/orders")
        order_id = create_resp.json()["id"]

        resp = await client.delete(f"/api/orders/{order_id}/menu-items/{uuid.uuid4()}")
        assert resp.status_code == 404
        body = resp.json()
        assert body["error"]["code"] == "MENU_ITEM_NOT_FOUND"


class TestCloseOrder:
    async def test_close_returns_200_with_closed_state(self, client):
        order_id = (await client.post("/api/orders")).json()["id"]

        resp = await client.post(f"/api/orders/{order_id}/close")
        assert resp.status_code == 200
        assert resp.json()["state"] == "closed"

        # Persisted: a fresh read still reports closed.
        get_resp = await client.get(f"/api/orders/{order_id}")
        assert get_resp.json()["state"] == "closed"

    async def test_close_is_idempotent(self, client):
        order_id = (await client.post("/api/orders")).json()["id"]

        first = await client.post(f"/api/orders/{order_id}/close")
        second = await client.post(f"/api/orders/{order_id}/close")
        assert first.status_code == 200
        assert second.status_code == 200
        assert second.json()["state"] == "closed"

    async def test_close_missing_order_returns_404(self, client):
        resp = await client.post(f"/api/orders/{uuid.uuid4()}/close")
        assert resp.status_code == 404
        assert resp.json()["error"]["code"] == "ORDER_NOT_FOUND"

    async def test_guest_mutation_after_close_returns_409(self, client):
        order_id = (await client.post("/api/orders")).json()["id"]
        item_id = (
            await client.post(
                f"/api/orders/{order_id}/menu-items",
                json={"name": "Margherita", "price": "9.50"},
            )
        ).json()["id"]
        guest_id = (
            await client.post(f"/api/orders/{order_id}/guests", json={"name": "Sara"})
        ).json()["id"]

        await client.post(f"/api/orders/{order_id}/close")

        resp = await client.post(
            f"/api/orders/{order_id}/guests/{guest_id}/selections",
            json={"menu_item_id": item_id, "quantity": 1},
        )
        assert resp.status_code == 409
        assert resp.json()["error"]["code"] == "ORDER_CLOSED"


class TestOrderOverview:
    async def test_overview_groups_guests_with_counts(self, client, db_session):
        order_id = (await client.post("/api/orders")).json()["id"]
        item_id = (
            await client.post(
                f"/api/orders/{order_id}/menu-items",
                json={"name": "Margherita", "price": "9.50"},
            )
        ).json()["id"]

        alice = (
            await client.post(f"/api/orders/{order_id}/guests", json={"name": "Alice"})
        ).json()["id"]
        await client.post(
            f"/api/orders/{order_id}/guests/{alice}/selections",
            json={"menu_item_id": item_id, "quantity": 2, "note": "no onions"},
        )
        # Bob joins but stays editing with no items.
        await client.post(f"/api/orders/{order_id}/guests", json={"name": "Bob"})

        # Mark Alice as submitted (submit endpoint belongs to Story 7).
        await db_session.execute(
            update(Guest).where(Guest.id == uuid.UUID(alice)).values(status="submitted")
        )
        await db_session.commit()

        resp = await client.get(f"/api/orders/{order_id}/overview")
        assert resp.status_code == 200
        body = resp.json()
        assert body["guest_count"] == 2
        assert body["submitted_count"] == 1
        guests = {g["name"]: g for g in body["guests"]}
        assert guests["Alice"]["status"] == "submitted"
        assert guests["Alice"]["subtotal"] == "19.00"
        assert guests["Alice"]["selections"][0]["note"] == "no onions"
        assert guests["Bob"]["status"] == "editing"
        assert guests["Bob"]["selections"] == []

    async def test_overview_empty_when_no_guests(self, client):
        order_id = (await client.post("/api/orders")).json()["id"]
        resp = await client.get(f"/api/orders/{order_id}/overview")
        assert resp.status_code == 200
        body = resp.json()
        assert body["guests"] == []
        assert body["guest_count"] == 0
        assert body["submitted_count"] == 0

    async def test_overview_missing_order_returns_404(self, client):
        resp = await client.get(f"/api/orders/{uuid.uuid4()}/overview")
        assert resp.status_code == 404
        assert resp.json()["error"]["code"] == "ORDER_NOT_FOUND"
