import { test, expect } from "@playwright/test";
import {
  addSelection,
  addTestMenuItem,
  createTestOrder,
  joinGuest,
} from "../helpers/order";

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:8000/api";

test.describe("STORY-3: A guest joins via the link and adds items", () => {
  test("AC1: the link shows the restaurant and full menu with no login step", async ({
    page,
    request,
  }) => {
    const order = await createTestOrder(request);
    const item = await addTestMenuItem(request, order.id, {
      name: "Margherita",
      price: "9.50",
      category: "Pizza",
    });

    await page.goto(`/order/${order.id}/guest`);

    await expect(page.getByTestId("guest-menu-card")).toContainText(
      "Trattoria Demo",
    );
    await expect(page.getByTestId(`menu-item-row-${item.id}`)).toBeVisible();
    // No account / login affordance, no password field.
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
  });

  test("AC2: a name is required and add controls appear only after joining", async ({
    page,
    request,
  }) => {
    const order = await createTestOrder(request);
    const item = await addTestMenuItem(request, order.id, {
      name: "Margherita",
      price: "9.50",
    });

    await page.goto(`/order/${order.id}/guest`);

    // Before joining: no per-item Add control, join button disabled until name typed.
    await expect(page.getByTestId(`menu-item-add-${item.id}`)).toHaveCount(0);
    await expect(page.getByTestId("guest-join-button")).toBeDisabled();

    await page.getByTestId("guest-name-input").fill("Sara");
    await expect(page.getByTestId("guest-join-button")).not.toBeDisabled();
    await page.getByTestId("guest-join-button").click();

    await expect(page.getByTestId(`menu-item-add-${item.id}`)).toBeVisible();
  });

  test("AC3/AC8: adding an item attributes it to the guest, who starts as Editing", async ({
    page,
    request,
  }) => {
    const order = await createTestOrder(request);
    const item = await addTestMenuItem(request, order.id, {
      name: "Margherita",
      price: "9.50",
    });

    await page.goto(`/order/${order.id}/guest`);
    await page.getByTestId("guest-name-input").fill("Sara");
    await page.getByTestId("guest-join-button").click();

    await expect(page.getByTestId("guest-status-badge")).toHaveText("Editing");

    await page.getByTestId(`menu-item-add-${item.id}`).click();
    await expect(page.getByTestId("guest-selection-list")).toContainText(
      "Margherita",
    );
  });

  test("AC4: an optional per-item note is saved and persists on reload", async ({
    page,
    request,
  }) => {
    const order = await createTestOrder(request);
    const item = await addTestMenuItem(request, order.id, {
      name: "Margherita",
      price: "9.50",
    });
    const guest = await joinGuest(request, order.id, "Sara");
    const seeded = await addSelection(request, order.id, guest.id, {
      menu_item_id: item.id,
    });
    const selectionId = seeded.selections[0].id;

    await page.goto(`/order/${order.id}/guest`);
    await page.getByTestId("guest-name-input").fill("Sara");
    await page.getByTestId("guest-join-button").click();

    const noteField = page.getByTestId(`guest-selection-note-${selectionId}`);
    await noteField.fill("no onions");
    await noteField.blur();

    // Confirm persisted server-side.
    await expect
      .poll(async () => {
        const resp = await request.get(
          `${API_BASE}/orders/${order.id}/guests/${guest.id}`,
        );
        const data = await resp.json();
        return data.selections[0].note;
      })
      .toBe("no onions");
  });

  test("AC5: quantity adjusts (min 1) and items can be removed", async ({
    page,
    request,
  }) => {
    const order = await createTestOrder(request);
    const item = await addTestMenuItem(request, order.id, {
      name: "Margherita",
      price: "9.50",
    });
    const guest = await joinGuest(request, order.id, "Sara");
    const seeded = await addSelection(request, order.id, guest.id, {
      menu_item_id: item.id,
    });
    const selectionId = seeded.selections[0].id;

    await page.goto(`/order/${order.id}/guest`);
    await page.getByTestId("guest-name-input").fill("Sara");
    await page.getByTestId("guest-join-button").click();

    // Minimum is 1: decrement is disabled at quantity 1.
    await expect(
      page.getByTestId(`quantity-decrement-${selectionId}`),
    ).toBeDisabled();
    await page.getByTestId(`quantity-increment-${selectionId}`).click();
    await expect(page.getByTestId(`quantity-value-${selectionId}`)).toHaveText(
      "2",
    );

    await page.getByTestId(`guest-selection-remove-${selectionId}`).click();
    await expect(
      page.getByTestId(`guest-selection-row-${selectionId}`),
    ).toHaveCount(0);
  });

  test("AC6: the subtotal reflects only the guest's own selections; unpriced items count as 0", async ({
    page,
    request,
  }) => {
    const order = await createTestOrder(request);
    const priced = await addTestMenuItem(request, order.id, {
      name: "Margherita",
      price: "10.00",
    });
    const free = await addTestMenuItem(request, order.id, {
      name: "Tap Water",
    });

    await page.goto(`/order/${order.id}/guest`);
    await page.getByTestId("guest-name-input").fill("Sara");
    await page.getByTestId("guest-join-button").click();

    await page.getByTestId(`menu-item-add-${priced.id}`).click();
    await expect(page.getByTestId("guest-subtotal")).toHaveText("€10.00");

    await page.getByTestId(`menu-item-add-${free.id}`).click();
    // Unpriced item adds 0 to the subtotal.
    await expect(page.getByTestId("guest-subtotal")).toHaveText("€10.00");
  });

  test("AC7: a guest never sees another guest's items and cannot modify them", async ({
    page,
    request,
  }) => {
    const order = await createTestOrder(request);
    const item = await addTestMenuItem(request, order.id, {
      name: "Margherita",
      price: "9.50",
    });

    // Guest B (via API) has a selection.
    const guestB = await joinGuest(request, order.id, "Bob");
    const bSel = (
      await addSelection(request, order.id, guestB.id, {
        menu_item_id: item.id,
      })
    ).selections[0];

    // Guest A opens the link.
    await page.goto(`/order/${order.id}/guest`);
    await page.getByTestId("guest-name-input").fill("Alice");
    await page.getByTestId("guest-join-button").click();

    // Bob's selection row is not visible in Alice's order.
    await expect(
      page.getByTestId(`guest-selection-row-${bSel.id}`),
    ).toHaveCount(0);
    await expect(page.getByTestId("guest-order-panel")).not.toContainText(
      "Margherita",
    );

    // Alice cannot modify Bob's selection via the API (ownership enforced -> 404).
    const guestA = await joinGuest(request, order.id, "Alice");
    const resp = await request.delete(
      `${API_BASE}/orders/${order.id}/guests/${guestA.id}/selections/${bSel.id}`,
    );
    expect(resp.status()).toBe(404);
  });

  test("AC9: a closed order is read-only with a closed message and no controls", async ({
    page,
    request,
  }) => {
    const order = await createTestOrder(request);
    const item = await addTestMenuItem(request, order.id, {
      name: "Margherita",
      price: "9.50",
    });
    const guest = await joinGuest(request, order.id, "Sara");

    // Close the order server-side via the admin close endpoint (available from STORY-4)
    // or fall back to leaving it open if that endpoint is not present yet.
    const closeResp = await request.post(
      `${API_BASE}/orders/${order.id}/close`,
    );
    test.skip(
      !closeResp.ok(),
      "Order close endpoint not available yet (STORY-4)",
    );

    await page.goto(`/order/${order.id}/guest`);

    await expect(page.getByTestId("closed-order-banner")).toBeVisible();
    await expect(page.getByTestId(`menu-item-add-${item.id}`)).toHaveCount(0);
    await expect(page.getByTestId("guest-name-card")).toHaveCount(0);

    // Server rejects mutations on a closed order.
    const resp = await request.post(
      `${API_BASE}/orders/${order.id}/guests/${guest.id}/selections`,
      { data: { menu_item_id: item.id } },
    );
    expect(resp.status()).toBe(409);
  });

  test("Edge case: opening an unknown order link shows an error, not a crash", async ({
    page,
  }) => {
    await page.goto("/order/00000000-0000-0000-0000-000000000000/guest");
    await expect(page.getByTestId("guest-error")).toBeVisible();
  });
});
