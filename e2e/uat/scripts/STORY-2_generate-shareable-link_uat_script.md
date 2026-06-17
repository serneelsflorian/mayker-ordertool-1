# UAT Script: STORY-2 — Admin generates a shareable link

**Feature:** STORY-2
**Date:** 2026-06-17
**Tester:** ******\_\_\_******
**Environment:** Local / Staging

---

## Prerequisites

### Stack setup

1. Ensure Docker and Docker Compose are installed (`docker --version`, `docker compose version`).
2. Copy `.env.example` to `.env` in the project root and fill in the values (or leave the defaults for local testing).
3. Start the full stack from the project root:
   ```bash
   docker compose up --build
   ```
4. Wait until all three services are healthy:
   - Postgres 16 is listening on port 5432.
   - Backend (FastAPI) is reachable at [http://localhost:8000/docs](http://localhost:8000/docs).
   - Frontend (Vite/Nginx) is reachable at [http://localhost:5173](http://localhost:5173).
5. Open a modern browser and navigate to [http://localhost:5173](http://localhost:5173). The app creates a new order and redirects to `/order/<uuid>` (the admin page).

### Reset between test sessions

If you run multiple test sessions, use `docker compose down -v` and then `docker compose up --build` to start with a clean database.

---

## Test scenarios

### TC-1: Generate share link is disabled until a menu item exists (AC1)

**Steps**

| #   | Action                                                                         | Expected result                                                                                           | Pass/Fail |
| --- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | --------- |
| 1   | On a fresh admin page with no menu items, find the "Share with the team" card. | A "Generate share link" button is visible but disabled, with the hint "Add at least one menu item first." | ☐         |
| 2   | In the menu setup form, add an item named `Margherita` and click "Add".        | The item appears in the menu list.                                                                        | ☐         |
| 3   | Look at the "Generate share link" button again.                                | The button is now enabled (visually active and clickable).                                                | ☐         |

---

### TC-2: Generating produces a shareable URL with the order identifier (AC2)

**Steps**

| #   | Action                                                                | Expected result                                                         | Pass/Fail |
| --- | --------------------------------------------------------------------- | ----------------------------------------------------------------------- | --------- |
| 1   | Note the order id shown in the browser address bar (`/order/<uuid>`). | You can see the order's UUID.                                           | ☐         |
| 2   | Click "Generate share link".                                          | A shareable link field appears in the "Share with the team" card.       | ☐         |
| 3   | Inspect the generated URL.                                            | The URL contains the same order id and ends with `/order/<uuid>/guest`. | ☐         |

---

### TC-3: The URL is read-only and copying shows a confirmation (AC3)

**Steps**

| #   | Action                                                | Expected result                                                                                             | Pass/Fail |
| --- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------- |
| 1   | Try to edit the text inside the shareable link field. | The field is read-only; the text cannot be changed.                                                         | ☐         |
| 2   | Click the "Copy" button next to the field.            | A "Copied" confirmation appears (the button label changes to "Copied" and a confirmation message is shown). | ☐         |
| 3   | Paste (Ctrl/Cmd+V) into any text field.               | The pasted text exactly matches the shareable URL.                                                          | ☐         |

---

### TC-4: Opening the link in a new session shows the guest view (AC4)

**Steps**

| #   | Action                                                                                            | Expected result                                                                                        | Pass/Fail |
| --- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------- |
| 1   | Before sharing, add a second item `Garlic Bread` in the admin menu setup.                         | Both `Margherita` and `Garlic Bread` are in the menu list.                                             | ☐         |
| 2   | Copy the generated share link and open it in a different browser (or a private/incognito window). | The guest order view loads for that specific order.                                                    | ☐         |
| 3   | Check the guest view content.                                                                     | The restaurant name "Trattoria Demo" and both menu items (`Margherita`, `Garlic Bread`) are displayed. | ☐         |
| 4   | Look for any remove/trash controls on the items.                                                  | No remove controls are present — the guest menu is read-only.                                          | ☐         |

---

### TC-5: After generating, the order is open and persists across a refresh (AC5)

**Steps**

| #   | Action                                                      | Expected result                                                                                | Pass/Fail |
| --- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------- |
| 1   | In the guest view (the shared link), refresh the page (F5). | The page reloads and the menu items are still shown.                                           | ☐         |
| 2   | Return to the admin page (`/order/<uuid>`) and refresh it.  | The menu items and the generated-link capability are still available; the order is still open. | ☐         |

---

### TC-6: Edge case — opening an unknown order link shows an error state

**Steps**

| #   | Action                                                                        | Expected result                                          | Pass/Fail |
| --- | ----------------------------------------------------------------------------- | -------------------------------------------------------- | --------- |
| 1   | In the address bar, open `/order/00000000-0000-0000-0000-000000000000/guest`. | An error state ("Order not found." or similar) is shown. | ☐         |
| 2   | Observe the application.                                                      | The app does not crash or show a blank screen.           | ☐         |

---

## Summary table

| TC   | Scenario                               | Status          |
| ---- | -------------------------------------- | --------------- |
| TC-1 | Generate link gated on item count      | ☐ Pass / ☐ Fail |
| TC-2 | URL contains the order identifier      | ☐ Pass / ☐ Fail |
| TC-3 | Read-only URL + copy confirmation      | ☐ Pass / ☐ Fail |
| TC-4 | Shared link loads read-only guest view | ☐ Pass / ☐ Fail |
| TC-5 | Order open and persists across refresh | ☐ Pass / ☐ Fail |
| TC-6 | Unknown order link shows error state   | ☐ Pass / ☐ Fail |

**Overall result:** ☐ Pass / ☐ Fail

**Tester notes:**

---

---
