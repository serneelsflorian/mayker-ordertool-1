# UAT Script: STORY-1 — Admin starts a group order and enters the menu

**Feature:** STORY-1
**Date:** 2026-06-16
**Tester:** _______________
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
5. Open a modern browser (Chrome, Firefox, or Edge) and navigate to [http://localhost:5173](http://localhost:5173).

### Reset between test sessions

If you run multiple test sessions, use `docker compose down -v` and then `docker compose up --build` to start with a clean database.

---

## Test scenarios

### TC-1: Restaurant name displayed on load (AC1)

**Steps**

| # | Action | Expected result | Pass/Fail |
|---|--------|-----------------|-----------|
| 1 | Open [http://localhost:5173](http://localhost:5173) in the browser. | The page briefly shows "Setting up your group order…" and then redirects to `/order/<uuid>`. | ☐ |
| 2 | Look at the top navigation bar. | The text "Trattoria Demo" is displayed in the top bar. | ☐ |
| 3 | Observe the subtitle below the restaurant name. | The subtitle reads "Group order · Open" with "Open" in teal. | ☐ |

---

### TC-2: Empty form displayed on load (AC1)

**Steps**

| # | Action | Expected result | Pass/Fail |
|---|--------|-----------------|-----------|
| 1 | After the redirect from TC-1, look at the form below the top bar. | Three input fields are visible: "Item name", "Price (optional)", "Category (optional)", and an "Add" button. | ☐ |
| 2 | Check the item name input. | The input is empty. | ☐ |
| 3 | Check the price and category inputs. | Both inputs are empty. | ☐ |
| 4 | Look below the form. | The empty state message "No menu items yet. Add your first item above." is displayed. | ☐ |

---

### TC-3: Add a menu item with name only — price is optional (AC2)

**Steps**

| # | Action | Expected result | Pass/Fail |
|---|--------|-----------------|-----------|
| 1 | In the "Item name" field, type `Garlic Bread`. | The text appears in the input. | ☐ |
| 2 | Leave the "Price" and "Category" fields empty. | Both remain empty. | ☐ |
| 3 | Click the "Add" button. | The item is added to the list below. | ☐ |
| 4 | Look at the new row in the list. | The row shows "Garlic Bread". No price value is shown. No category badge is shown. | ☐ |
| 5 | Check the form inputs. | All three inputs have been cleared. | ☐ |

---

### TC-4: Add a menu item with name, price, and category (AC2)

**Steps**

| # | Action | Expected result | Pass/Fail |
|---|--------|-----------------|-----------|
| 1 | In the "Item name" field, type `Margherita`. | The text appears in the input. | ☐ |
| 2 | In the "Price" field, type `9.50`. | The value appears in the input. | ☐ |
| 3 | In the "Category" field, type `Pizza`. | The text appears in the input. | ☐ |
| 4 | Click the "Add" button. | The item is added to the list. | ☐ |
| 5 | Look at the new row. | The row shows "Margherita", the formatted price "€9.50", and a "Pizza" category badge. | ☐ |

---

### TC-5: Empty name shows inline error and does not add item (AC3)

**Steps**

| # | Action | Expected result | Pass/Fail |
|---|--------|-----------------|-----------|
| 1 | Leave the "Item name" field empty. | The field is empty. | ☐ |
| 2 | Click the "Add" button. | No item is added to the list. | ☐ |
| 3 | Look at the area below the name input. | An inline error message appears (e.g. "Name is required"). | ☐ |
| 4 | Count the items in the list. | The item count has not changed. | ☐ |

---

### TC-6: Empty price is allowed (AC3)

**Steps**

| # | Action | Expected result | Pass/Fail |
|---|--------|-----------------|-----------|
| 1 | Type `No-price item` in the "Item name" field. | The text appears in the input. | ☐ |
| 2 | Leave the "Price" field empty. | The field remains empty. | ☐ |
| 3 | Click the "Add" button. | The item is added without error. | ☐ |
| 4 | Check that no inline error appears under the price field. | No error message is shown. | ☐ |

---

### TC-7: Non-numeric price shows inline error and blocks add (AC3)

**Steps**

| # | Action | Expected result | Pass/Fail |
|---|--------|-----------------|-----------|
| 1 | Type `Bruschetta` in the "Item name" field. | The text appears. | ☐ |
| 2 | Type `abc` in the "Price" field. | The text appears. | ☐ |
| 3 | Click the "Add" button. | No item is added. | ☐ |
| 4 | Check below the price field. | An inline error appears (e.g. "Enter a positive number (up to 2 decimals)"). | ☐ |

---

### TC-8: Negative price shows inline error (AC3)

**Steps**

| # | Action | Expected result | Pass/Fail |
|---|--------|-----------------|-----------|
| 1 | Type `Bruschetta` in the "Item name" field. | The text appears. | ☐ |
| 2 | Type `-5` in the "Price" field. | The value appears. | ☐ |
| 3 | Click the "Add" button. | No item is added. | ☐ |
| 4 | Check below the price field. | An inline error appears. | ☐ |

---

### TC-9: Added item appears immediately (AC4)

**Steps**

| # | Action | Expected result | Pass/Fail |
|---|--------|-----------------|-----------|
| 1 | Add an item with name `Carbonara`, price `13.50`, category `Pasta`. | The item appears in the list immediately after clicking Add, without a page reload. | ☐ |
| 2 | Verify the row content without refreshing the page. | "Carbonara", "€13.50", and "Pasta" are all visible in the row. | ☐ |

---

### TC-10: Remove an item and the list updates immediately (AC5)

**Steps**

| # | Action | Expected result | Pass/Fail |
|---|--------|-----------------|-----------|
| 1 | Ensure at least two items are in the list (add them if needed). | Two or more rows are visible. | ☐ |
| 2 | Click the trash/remove icon on the first item. | The first item disappears from the list immediately, without a page reload. | ☐ |
| 3 | Verify the remaining items. | All other items are still in the list. | ☐ |

---

### TC-11: Generate share link disabled until at least one item exists (AC6)

**Steps**

| # | Action | Expected result | Pass/Fail |
|---|--------|-----------------|-----------|
| 1 | Start with an empty menu (no items in the list). | The "Generate share link" button is visible but disabled (greyed out, not clickable). | ☐ |
| 2 | Add one menu item (e.g. `Pizza`). | The "Generate share link" button becomes enabled (visually active). | ☐ |
| 3 | Remove that item by clicking its remove icon. | The "Generate share link" button becomes disabled again. | ☐ |

---

### TC-12: Edge case — Price with more than 2 decimal places is rejected

**Steps**

| # | Action | Expected result | Pass/Fail |
|---|--------|-----------------|-----------|
| 1 | Type `Tiramisu` in the "Item name" field. | The text appears. | ☐ |
| 2 | Type `6.999` in the "Price" field. | The value appears. | ☐ |
| 3 | Click the "Add" button. | No item is added. | ☐ |
| 4 | Check below the price field. | An inline error appears indicating the price format is invalid. | ☐ |

---

## Summary table

| TC | Scenario | Status |
|----|----------|--------|
| TC-1 | Restaurant name in top bar | ☐ Pass / ☐ Fail |
| TC-2 | Empty form on load | ☐ Pass / ☐ Fail |
| TC-3 | Add item — name only | ☐ Pass / ☐ Fail |
| TC-4 | Add item — name, price, category | ☐ Pass / ☐ Fail |
| TC-5 | Empty name shows error | ☐ Pass / ☐ Fail |
| TC-6 | Empty price is allowed | ☐ Pass / ☐ Fail |
| TC-7 | Non-numeric price shows error | ☐ Pass / ☐ Fail |
| TC-8 | Negative price shows error | ☐ Pass / ☐ Fail |
| TC-9 | Item appears immediately | ☐ Pass / ☐ Fail |
| TC-10 | Remove item updates list | ☐ Pass / ☐ Fail |
| TC-11 | Generate link gated on item count | ☐ Pass / ☐ Fail |
| TC-12 | Price with 3+ decimals rejected | ☐ Pass / ☐ Fail |

**Overall result:** ☐ Pass / ☐ Fail

**Tester notes:**

_______________________________________________________________________________

_______________________________________________________________________________
