import { test, expect } from "@playwright/test";
import {
  addSelection,
  addTestMenuItem,
  closeTestOrder,
  createTestOrder,
  joinGuest,
} from "../helpers/order";

test.describe("STORY-5: Admin exports the consolidated order", () => {
  test("AC1: the export action is available only once the order is closed", async ({
    page,
    request,
  }) => {
    const order = await createTestOrder(request);
    await addTestMenuItem(request, order.id, {
      name: "Margherita",
      price: "9.50",
    });

    // While open, the export card is not shown.
    await page.goto(`/order/${order.id}`);
    await expect(page.getByTestId("order-export-card")).toHaveCount(0);

    // After closing, the export appears.
    await closeTestOrder(request, order.id);
    await page.reload();
    await expect(page.getByTestId("order-export-card")).toBeVisible();
    await expect(page.getByTestId("export-text")).toBeVisible();
  });

  test("AC2: identical items are grouped as quantity x item name", async ({
    page,
    request,
  }) => {
    const order = await createTestOrder(request);
    const margherita = await addTestMenuItem(request, order.id, {
      name: "Margherita",
      price: "9.50",
    });
    // Two guests each order one Margherita (no note) -> merges to 2x.
    const sara = await joinGuest(request, order.id, "Sara");
    await addSelection(request, order.id, sara.id, {
      menu_item_id: margherita.id,
      quantity: 1,
    });
    const tom = await joinGuest(request, order.id, "Tom");
    await addSelection(request, order.id, tom.id, {
      menu_item_id: margherita.id,
      quantity: 1,
    });
    await closeTestOrder(request, order.id);

    await page.goto(`/order/${order.id}`);

    const exportText = page.getByTestId("export-text");
    await expect(exportText).toContainText("2x Margherita");
    // Grouped by item, not listed per person.
    await expect(exportText).not.toContainText("Sara");
    await expect(exportText).not.toContainText("Tom");
  });

  test("AC3: items merge only when item and note match; different notes stay separate with the note beneath", async ({
    page,
    request,
  }) => {
    const order = await createTestOrder(request);
    const margherita = await addTestMenuItem(request, order.id, {
      name: "Margherita",
      price: "9.50",
    });
    const sara = await joinGuest(request, order.id, "Sara");
    await addSelection(request, order.id, sara.id, {
      menu_item_id: margherita.id,
      quantity: 2,
    });
    const mira = await joinGuest(request, order.id, "Mira");
    await addSelection(request, order.id, mira.id, {
      menu_item_id: margherita.id,
      quantity: 1,
      note: "no onions",
    });
    await closeTestOrder(request, order.id);

    await page.goto(`/order/${order.id}`);

    const exportText = page.getByTestId("export-text");
    // The no-note selections merge (2x); the noted one is a separate line.
    await expect(exportText).toContainText("2x Margherita");
    await expect(exportText).toContainText("1x Margherita");
    // The note is shown beneath its line.
    await expect(exportText).toContainText("- no onions");
  });

  test("AC4: the export shows a final total summing all selections, price-less items as 0", async ({
    page,
    request,
  }) => {
    const order = await createTestOrder(request);
    const margherita = await addTestMenuItem(request, order.id, {
      name: "Margherita",
      price: "9.50",
    });
    const water = await addTestMenuItem(request, order.id, {
      name: "Tap Water",
    });
    const guest = await joinGuest(request, order.id, "Sara");
    await addSelection(request, order.id, guest.id, {
      menu_item_id: margherita.id,
      quantity: 2,
    });
    await addSelection(request, order.id, guest.id, {
      menu_item_id: water.id,
      quantity: 3,
    });
    await closeTestOrder(request, order.id);

    await page.goto(`/order/${order.id}`);

    // 2 * 9.50 + 3 * 0 = 19.00
    await expect(page.getByTestId("export-text")).toContainText(
      "Total: €19.00",
    );
  });

  test("AC5: the copy-all button copies the whole export to the clipboard", async ({
    page,
    context,
    request,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    const order = await createTestOrder(request);
    const margherita = await addTestMenuItem(request, order.id, {
      name: "Margherita",
      price: "9.50",
    });
    const guest = await joinGuest(request, order.id, "Sara");
    await addSelection(request, order.id, guest.id, {
      menu_item_id: margherita.id,
      quantity: 1,
    });
    await closeTestOrder(request, order.id);

    await page.goto(`/order/${order.id}`);

    await page.getByTestId("export-copy-button").click();
    await expect(page.getByTestId("export-copied")).toBeVisible();

    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain("Trattoria Demo");
    expect(clipboard).toContain("1x Margherita");
    expect(clipboard).toContain("Total: €9.50");
  });

  test("AC6: the export includes the restaurant name as a header", async ({
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

    const exportText = page.getByTestId("export-text");
    await expect(exportText).toContainText("Trattoria Demo");
  });

  test("Edge case: a closed order with no selections shows the header and a zero total", async ({
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

    const exportText = page.getByTestId("export-text");
    await expect(exportText).toContainText("Trattoria Demo");
    await expect(exportText).toContainText("Total: €0.00");
  });
});
