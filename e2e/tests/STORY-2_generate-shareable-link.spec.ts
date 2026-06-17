import { test, expect } from "@playwright/test";
import { createTestOrder, addTestMenuItem } from "../helpers/order";

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:8000/api";

test.describe("STORY-2: Admin generates a shareable link", () => {
  test("AC1: generate-link action is disabled until at least one menu item exists", async ({
    page,
    request,
  }) => {
    const order = await createTestOrder(request);
    await page.goto(`/order/${order.id}`);

    const button = page.getByTestId("generate-link-button");
    await expect(button).toBeDisabled();

    // Add one item via the UI
    await page.getByTestId("menu-item-name-input").fill("Margherita");
    await page.getByTestId("menu-item-add-button").click();

    await expect(button).not.toBeDisabled();
  });

  test("AC2/AC3: generating produces a read-only URL with the order id and a copy confirmation", async ({
    page,
    request,
  }) => {
    const order = await createTestOrder(request);
    await addTestMenuItem(request, order.id, {
      name: "Margherita",
      price: "9.50",
    });

    await page.goto(`/order/${order.id}`);

    // The share URL is not shown until the action is taken
    await expect(page.getByTestId("share-url-input")).toHaveCount(0);

    await page.getByTestId("generate-link-button").click();

    const input = page.getByTestId("share-url-input");
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute("readonly", "");

    // URL contains the order identifier and points at the guest route
    const value = await input.inputValue();
    expect(value).toContain(order.id);
    expect(value.endsWith(`/order/${order.id}/guest`)).toBe(true);

    // One-tap copy shows a "Copied" confirmation
    await page.getByTestId("copy-link-button").click();
    await expect(page.getByTestId("copy-confirmation")).toBeVisible();
    await expect(page.getByTestId("copy-link-button")).toContainText("Copied");
  });

  test("AC4: opening the generated URL loads the read-only guest view with the same restaurant and menu", async ({
    page,
    request,
  }) => {
    const order = await createTestOrder(request);
    const item1 = await addTestMenuItem(request, order.id, {
      name: "Margherita",
      price: "9.50",
      category: "Pizza",
    });
    const item2 = await addTestMenuItem(request, order.id, {
      name: "Garlic Bread",
    });

    // Simulate a fresh session opening the shared link directly
    await page.goto(`/order/${order.id}/guest`);

    await expect(page.getByTestId("guest-menu-card")).toBeVisible();
    await expect(page.getByTestId("guest-menu-card")).toContainText(
      "Trattoria Demo",
    );
    await expect(page.getByTestId(`menu-item-row-${item1.id}`)).toBeVisible();
    await expect(page.getByTestId(`menu-item-row-${item2.id}`)).toBeVisible();

    // Read-only: guests cannot remove items
    await expect(page.getByTestId(`menu-item-remove-${item1.id}`)).toHaveCount(
      0,
    );
    await expect(page.getByTestId(`menu-item-remove-${item2.id}`)).toHaveCount(
      0,
    );
  });

  test("AC5: after generating, the order is open and persists across a refresh", async ({
    page,
    request,
  }) => {
    const order = await createTestOrder(request);
    const item = await addTestMenuItem(request, order.id, {
      name: "Carbonara",
      price: "13.50",
    });

    await page.goto(`/order/${order.id}`);
    await page.getByTestId("generate-link-button").click();
    await expect(page.getByTestId("share-url-input")).toBeVisible();

    // Refresh the guest view: the menu still loads from server-persisted state
    await page.goto(`/order/${order.id}/guest`);
    await page.reload();
    await expect(page.getByTestId(`menu-item-row-${item.id}`)).toBeVisible();

    // The order state remains open (server-side source of truth)
    const resp = await request.get(`${API_BASE}/orders/${order.id}`);
    expect(resp.ok()).toBe(true);
    const data = await resp.json();
    expect(data.state).toBe("open");
    expect(data.menu_items).toHaveLength(1);
  });

  test("Edge case: opening an unknown order link shows an error state, not a crash", async ({
    page,
  }) => {
    await page.goto("/order/00000000-0000-0000-0000-000000000000/guest");
    await expect(page.getByTestId("guest-error")).toBeVisible();
  });
});
