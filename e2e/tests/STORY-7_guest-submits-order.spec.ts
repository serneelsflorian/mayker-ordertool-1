import { test, expect } from "@playwright/test";
import {
  addSelection,
  addTestMenuItem,
  closeTestOrder,
  createTestOrder,
  getOrderOverview,
  joinGuest,
} from "../helpers/order";

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:8000/api";

test.describe("STORY-7: Guest submits their order", () => {
  test("AC1: submit button is visible and enabled after adding an item", async ({
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

    // No item yet: submit button is disabled.
    await expect(page.getByTestId("guest-submit-button")).toBeVisible();
    await expect(page.getByTestId("guest-submit-button")).toBeDisabled();

    // After adding an item: button becomes enabled.
    await page.getByTestId(`menu-item-add-${item.id}`).click();
    await expect(page.getByTestId("guest-submit-button")).toBeEnabled();
  });

  test("AC2: submit is disabled with no items and the API returns 422 on direct call", async ({
    page,
    request,
  }) => {
    const order = await createTestOrder(request);
    await addTestMenuItem(request, order.id, {
      name: "Margherita",
      price: "9.50",
    });
    const guest = await joinGuest(request, order.id, "Sara");

    await page.goto(`/order/${order.id}/guest`);
    await page.getByTestId("guest-name-input").fill("Sara");
    await page.getByTestId("guest-join-button").click();

    // Button exists and is disabled because the guest has no selections.
    await expect(page.getByTestId("guest-submit-button")).toBeDisabled();

    // Server also rejects a direct submit with no items.
    const resp = await request.post(
      `${API_BASE}/orders/${order.id}/guests/${guest.id}/submit`,
    );
    expect(resp.status()).toBe(422);
    expect((await resp.json()).error.code).toBe("VALIDATION_ERROR");
  });

  test("AC3: submitting sets status to Submitted and shows the confirmation banner", async ({
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
    await page.getByTestId(`menu-item-add-${item.id}`).click();

    await page.getByTestId("guest-submit-button").click();

    // Status badge updates to Submitted.
    await expect(page.getByTestId("guest-status-badge")).toHaveText(
      "Submitted",
    );

    // Confirmation banner is visible with expected copy.
    await expect(page.getByTestId("guest-submitted-banner")).toBeVisible();
    await expect(page.getByTestId("guest-submitted-banner")).toContainText(
      "Your order is submitted",
    );
    await expect(page.getByTestId("guest-submitted-banner")).toContainText(
      "The organizer can see it",
    );
    await expect(page.getByTestId("guest-submitted-banner")).toContainText(
      "reopen to make changes",
    );

    // Submit button is no longer shown; reopen button is present.
    await expect(page.getByTestId("guest-submit-button")).toHaveCount(0);
    await expect(page.getByTestId("guest-reopen-button")).toBeVisible();
  });

  test("AC4: reopening returns the guest to Editing status", async ({
    page,
    request,
  }) => {
    const order = await createTestOrder(request);
    const item = await addTestMenuItem(request, order.id, {
      name: "Margherita",
      price: "9.50",
    });
    const guest = await joinGuest(request, order.id, "Sara");
    await addSelection(request, order.id, guest.id, { menu_item_id: item.id });

    // Seed as submitted via API so we start in submitted state.
    await request.post(
      `${API_BASE}/orders/${order.id}/guests/${guest.id}/submit`,
    );

    await page.goto(`/order/${order.id}/guest`);
    await page.getByTestId("guest-name-input").fill("Sara");
    await page.getByTestId("guest-join-button").click();

    // Confirm submitted state is shown.
    await expect(page.getByTestId("guest-status-badge")).toHaveText(
      "Submitted",
    );
    await expect(page.getByTestId("guest-submitted-banner")).toBeVisible();

    // Reopen and confirm editing state.
    await page.getByTestId("guest-reopen-button").click();
    await expect(page.getByTestId("guest-status-badge")).toHaveText("Editing");
    await expect(page.getByTestId("guest-submit-button")).toBeVisible();
    await expect(page.getByTestId("guest-submitted-banner")).toHaveCount(0);
  });

  test("AC5: editing after submit auto-reverts status to Editing without manual reopen", async ({
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

    // Submit via API.
    await request.post(
      `${API_BASE}/orders/${order.id}/guests/${guest.id}/submit`,
    );

    await page.goto(`/order/${order.id}/guest`);
    await page.getByTestId("guest-name-input").fill("Sara");
    await page.getByTestId("guest-join-button").click();

    await expect(page.getByTestId("guest-status-badge")).toHaveText(
      "Submitted",
    );

    // Increment quantity: status should auto-revert to Editing.
    await page.getByTestId(`quantity-increment-${selectionId}`).click();
    await expect(page.getByTestId("guest-status-badge")).toHaveText("Editing");
    await expect(page.getByTestId("guest-submit-button")).toBeVisible();
    await expect(page.getByTestId("guest-submitted-banner")).toHaveCount(0);
  });

  test("AC6: submitted guest is shown as Submitted in the admin overview with updated count", async ({
    page,
    request,
  }) => {
    const order = await createTestOrder(request);
    const item = await addTestMenuItem(request, order.id, {
      name: "Margherita",
      price: "9.50",
    });
    const alice = await joinGuest(request, order.id, "Alice");
    await addSelection(request, order.id, alice.id, { menu_item_id: item.id });
    const bob = await joinGuest(request, order.id, "Bob");
    await addSelection(request, order.id, bob.id, { menu_item_id: item.id });

    // Alice submits; Bob stays editing.
    await request.post(
      `${API_BASE}/orders/${order.id}/guests/${alice.id}/submit`,
    );

    await page.goto(`/order/${order.id}`);

    await expect(page.getByTestId(`guest-status-badge-${alice.id}`)).toHaveText(
      "Submitted",
    );
    await expect(page.getByTestId(`guest-status-badge-${bob.id}`)).toHaveText(
      "Editing",
    );

    // Overview summary reflects 1 of 2 submitted.
    await expect(page.getByTestId("overview-summary-badge")).toHaveText(
      "1 of 2 submitted",
    );

    // Also verify via API.
    const overview = await getOrderOverview(request, order.id);
    expect(overview.submitted_count).toBe(1);
    expect(overview.guest_count).toBe(2);
  });

  test("AC7: closed order disables submit/reopen controls and API returns 409", async ({
    page,
    request,
  }) => {
    const order = await createTestOrder(request);
    const item = await addTestMenuItem(request, order.id, {
      name: "Margherita",
      price: "9.50",
    });
    const guest = await joinGuest(request, order.id, "Sara");
    await addSelection(request, order.id, guest.id, { menu_item_id: item.id });

    await closeTestOrder(request, order.id);

    await page.goto(`/order/${order.id}/guest`);

    // Closed banner is shown; no submit or reopen controls.
    await expect(page.getByTestId("closed-order-banner")).toBeVisible();
    await expect(page.getByTestId("guest-submit-button")).toHaveCount(0);
    await expect(page.getByTestId("guest-reopen-button")).toHaveCount(0);

    // Server rejects submit on a closed order.
    const submitResp = await request.post(
      `${API_BASE}/orders/${order.id}/guests/${guest.id}/submit`,
    );
    expect(submitResp.status()).toBe(409);
    expect((await submitResp.json()).error.code).toBe("ORDER_CLOSED");

    // Server rejects reopen on a closed order.
    const reopenResp = await request.post(
      `${API_BASE}/orders/${order.id}/guests/${guest.id}/reopen`,
    );
    expect(reopenResp.status()).toBe(409);
    expect((await reopenResp.json()).error.code).toBe("ORDER_CLOSED");
  });

  test("Edge case: submitting and reopening multiple times keeps state consistent", async ({
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
    await page.getByTestId(`menu-item-add-${item.id}`).click();

    // Submit -> reopen -> submit cycle.
    await page.getByTestId("guest-submit-button").click();
    await expect(page.getByTestId("guest-status-badge")).toHaveText(
      "Submitted",
    );

    await page.getByTestId("guest-reopen-button").click();
    await expect(page.getByTestId("guest-status-badge")).toHaveText("Editing");

    await page.getByTestId("guest-submit-button").click();
    await expect(page.getByTestId("guest-status-badge")).toHaveText(
      "Submitted",
    );
  });
});
