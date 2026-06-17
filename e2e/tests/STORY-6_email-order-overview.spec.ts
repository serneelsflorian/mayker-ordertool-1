import { test, expect } from "@playwright/test";
import {
  addSelection,
  addTestMenuItem,
  closeTestOrder,
  createTestOrder,
  getOrder,
  joinGuest,
} from "../helpers/order";

test.describe("STORY-6: Admin emails the order overview (demo prank)", () => {
  test("AC1: the email action is available only once the order is closed", async ({
    page,
    request,
  }) => {
    const order = await createTestOrder(request);
    await addTestMenuItem(request, order.id, {
      name: "Margherita",
      price: "9.50",
    });

    // While open, the email card is not shown.
    await page.goto(`/order/${order.id}`);
    await expect(page.getByTestId("order-email-card")).toHaveCount(0);

    // After closing, the email card appears alongside the export.
    await closeTestOrder(request, order.id);
    await page.reload();
    await expect(page.getByTestId("order-email-card")).toBeVisible();
    await expect(page.getByTestId("email-to-input")).toBeVisible();
  });

  test("AC3: an empty recipient shows an inline error and does not send", async ({
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

    // Send with an empty To field.
    await page.getByTestId("email-send-button").click();

    await expect(page.getByTestId("email-to-error")).toBeVisible();
    // Nothing was sent: no confirmation appears.
    await expect(page.getByTestId("email-sent")).toHaveCount(0);
  });

  test("AC2: a malformed recipient shows an inline error and does not send", async ({
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

    await page.getByTestId("email-to-input").fill("not-an-email");
    await page.getByTestId("email-send-button").click();

    await expect(page.getByTestId("email-to-error")).toBeVisible();
    await expect(page.getByTestId("email-sent")).toHaveCount(0);
  });

  test("AC2: a malformed CC shows an inline error and does not send", async ({
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

    await page.getByTestId("email-to-input").fill("alice@example.com");
    await page.getByTestId("email-cc-input").fill("bad-cc");
    await page.getByTestId("email-send-button").click();

    await expect(page.getByTestId("email-cc-error")).toBeVisible();
    await expect(page.getByTestId("email-sent")).toHaveCount(0);
  });

  test("AC4 & AC5: the preview shows the consolidated overview and the playful prank line", async ({
    page,
    request,
  }) => {
    const order = await createTestOrder(request);
    const margherita = await addTestMenuItem(request, order.id, {
      name: "Margherita",
      price: "9.50",
    });
    const guest = await joinGuest(request, order.id, "Sara");
    await addSelection(request, order.id, guest.id, {
      menu_item_id: margherita.id,
      quantity: 2,
    });
    await closeTestOrder(request, order.id);

    await page.goto(`/order/${order.id}`);

    const preview = page.getByTestId("email-preview");
    // The consolidated overview from Story 5: header, grouped line, total.
    await expect(preview).toContainText("Trattoria Demo");
    await expect(preview).toContainText("2x Margherita");
    await expect(preview).toContainText("Total: €19.00");
    // The unambiguous prank line.
    await expect(preview).toContainText(
      "the bill will be sent to your email shortly",
    );
  });

  test("AC6: sending with a valid recipient confirms Sent and leaves the order closed", async ({
    page,
    request,
  }) => {
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

    await page.getByTestId("email-to-input").fill("alice@example.com");
    await page.getByTestId("email-send-button").click();

    await expect(page.getByTestId("email-sent")).toBeVisible();

    // Sending must not reopen or alter the order.
    const refreshed = await getOrder(request, order.id);
    expect(refreshed.state).toBe("closed");
  });

  test("Edge case: a closed order with no selections can still be emailed", async ({
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

    // The preview still shows the header and a zero total.
    const preview = page.getByTestId("email-preview");
    await expect(preview).toContainText("Trattoria Demo");
    await expect(preview).toContainText("Total: €0.00");

    await page.getByTestId("email-to-input").fill("alice@example.com");
    await page.getByTestId("email-send-button").click();
    await expect(page.getByTestId("email-sent")).toBeVisible();
  });
});
