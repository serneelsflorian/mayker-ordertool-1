import { test, expect } from "@playwright/test";
import {
  addSelection,
  addTestMenuItem,
  closeTestOrder,
  createTestOrder,
  joinGuest,
} from "../helpers/order";

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:8000/api";

test.describe("STORY-4: Admin closes the order", () => {
  test("AC1: the admin view shows a close-order action while the order is open", async ({
    page,
    request,
  }) => {
    const order = await createTestOrder(request);
    await addTestMenuItem(request, order.id, {
      name: "Margherita",
      price: "9.50",
    });

    await page.goto(`/order/${order.id}`);

    await expect(page.getByTestId("close-order-button")).toBeVisible();
    await expect(page.getByTestId("close-order-button")).toBeEnabled();
  });

  test("AC2: the overview groups selections by guest with status badges and a submitted summary", async ({
    page,
    request,
  }) => {
    const order = await createTestOrder(request);
    const item = await addTestMenuItem(request, order.id, {
      name: "Margherita",
      price: "9.50",
    });
    const alice = await joinGuest(request, order.id, "Alice");
    await addSelection(request, order.id, alice.id, {
      menu_item_id: item.id,
      quantity: 2,
      note: "no onions",
    });
    const bob = await joinGuest(request, order.id, "Bob");

    await page.goto(`/order/${order.id}`);

    const aliceBlock = page.getByTestId(`guest-overview-item-${alice.id}`);
    await expect(aliceBlock).toContainText("Alice");
    await expect(aliceBlock).toContainText("2x Margherita");
    await expect(aliceBlock).toContainText("no onions");
    await expect(page.getByTestId(`guest-status-badge-${alice.id}`)).toHaveText(
      "Editing",
    );

    await expect(
      page.getByTestId(`guest-overview-item-${bob.id}`),
    ).toContainText("Bob");

    // Newly joined guests are still "Editing", so none are submitted yet.
    await expect(page.getByTestId("overview-summary-badge")).toHaveText(
      "0 of 2 submitted",
    );
  });

  test("AC3: closing sets the state to closed and persists across a refresh", async ({
    page,
    request,
  }) => {
    const order = await createTestOrder(request);
    await addTestMenuItem(request, order.id, {
      name: "Margherita",
      price: "9.50",
    });

    await page.goto(`/order/${order.id}`);
    await page.getByTestId("close-order-button").click();
    await page.getByTestId("confirm-dialog-confirm").click();

    await expect(page.getByTestId("order-closed-indicator")).toBeVisible();

    // Persisted server-side: a fresh load still shows closed.
    await page.reload();
    await expect(page.getByTestId("order-closed-indicator")).toBeVisible();
    await expect(page.getByTestId("close-order-button")).toHaveCount(0);
  });

  test("AC4: once closed, guest controls are disabled across sessions after refresh", async ({
    page,
    request,
  }) => {
    const order = await createTestOrder(request);
    const item = await addTestMenuItem(request, order.id, {
      name: "Margherita",
      price: "9.50",
    });
    const guest = await joinGuest(request, order.id, "Sara");

    await closeTestOrder(request, order.id);

    // A separate guest session sees the closed, read-only view after loading.
    await page.goto(`/order/${order.id}/guest`);
    await expect(page.getByTestId("closed-order-banner")).toBeVisible();
    await expect(page.getByTestId(`menu-item-add-${item.id}`)).toHaveCount(0);

    // And the server rejects mutations for everyone.
    const resp = await request.post(
      `${API_BASE}/orders/${order.id}/guests/${guest.id}/selections`,
      { data: { menu_item_id: item.id } },
    );
    expect(resp.status()).toBe(409);
  });

  test("AC5: a confirmation prompt guards closing and cancelling keeps the order open", async ({
    page,
    request,
  }) => {
    const order = await createTestOrder(request);
    const item = await addTestMenuItem(request, order.id, {
      name: "Margherita",
      price: "9.50",
    });
    // An editing guest with in-progress items still counts toward the order.
    const dana = await joinGuest(request, order.id, "Dana");
    await addSelection(request, order.id, dana.id, {
      menu_item_id: item.id,
      quantity: 1,
    });

    await page.goto(`/order/${order.id}`);

    await page.getByTestId("close-order-button").click();
    const dialog = page.getByTestId("confirm-dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Close order?");
    await expect(dialog).toContainText("Members can no longer make changes");

    // Cancelling leaves the order open.
    await page.getByTestId("confirm-dialog-cancel").click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByTestId("close-order-button")).toBeVisible();

    // The editing guest's items are still shown in the overview.
    await expect(
      page.getByTestId(`guest-overview-item-${dana.id}`),
    ).toContainText("1x Margherita");
    await expect(page.getByTestId(`guest-status-badge-${dana.id}`)).toHaveText(
      "Editing",
    );
  });

  test("AC6: a closed order offers no way to reopen it from the UI", async ({
    page,
    request,
  }) => {
    const order = await createTestOrder(request);
    await addTestMenuItem(request, order.id, {
      name: "Margherita",
      price: "9.50",
    });
    await closeTestOrder(request, order.id);

    await page.goto(`/order/${order.id}`);

    await expect(page.getByTestId("order-closed-indicator")).toBeVisible();
    await expect(page.getByTestId("close-order-button")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /reopen/i })).toHaveCount(0);
  });

  test("Edge case: the overview shows an empty state when no guests have joined", async ({
    page,
    request,
  }) => {
    const order = await createTestOrder(request);
    await addTestMenuItem(request, order.id, {
      name: "Margherita",
      price: "9.50",
    });

    await page.goto(`/order/${order.id}`);

    await expect(page.getByTestId("order-overview-card")).toContainText(
      "No guests have joined yet.",
    );
    await expect(page.getByTestId("overview-summary-badge")).toHaveText(
      "0 of 0 submitted",
    );
  });
});
