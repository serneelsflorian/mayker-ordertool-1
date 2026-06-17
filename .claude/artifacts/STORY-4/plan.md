# Implementation Plan — STORY-4: Admin closes the order

## Feature

> As an admin, I want to close the order when everyone's done, so the list is final.

## Acceptance Criteria

- [ ] AC1: The admin view shows a close-order action while the order is open.
- [ ] AC2: The admin's order overview shows each guest's selections grouped by person, with a per-guest status badge of "Editing" or "Submitted", plus a summary indicator of how many guests have submitted (e.g. "2 of 3 submitted").
- [ ] AC3: Activating close sets the order state to closed and persists that state.
- [ ] AC4: Once closed, all guest add/edit/remove/submit/reopen controls are disabled across all sessions (reflected after refresh).
- [ ] AC5: The admin sees a confirmation prompt before closing ("Close order? Members can no longer make changes") to prevent accidental closure. Guests still in "Editing" status are still included in the order; their in-progress items count toward the final order.
- [ ] AC6: A closed order cannot be reopened from the UI (closing is final for the demo).

## Plan Overview

STORY-4 adds the one-way `open → closed` lifecycle transition and the admin order overview that lets the admin judge whether it is safe to close.

Most of the backend enforcement already exists and must not be re-derived:

- `Order.state` (String, default `"open"`, values `"open"`/`"closed"`) already persists in Postgres. **No migration is required.**
- `GuestService.add_selection/update_selection/remove_selection` already raise `OrderClosedError` (HTTP 409) when `order.state == "closed"`. AC4's server-side enforcement for add/edit/remove is therefore already in place.

This feature adds exactly two backend endpoints (a close action and an admin overview read), the corresponding service methods, one new repository method, two new schemas, and the frontend admin UI to render the overview, trigger the close, and reflect the closed state.

Scope guardrails (do NOT build here):

- Guest **submit** / **reopen** controls and the guest-facing submit surface belong to STORY-7. This feature only **reads** the existing `Guest.status` ("editing"/"submitted") in the overview. Do not add any submit, reopen, or status-mutating endpoint or UI.
- The **export** textarea / Copy-all / Email buttons shown in the prototype's "Order actions" card (prototype `App.tsx` lines 619–644) belong to STORY-5 and STORY-6. Do not build them.
- The close transition is one-way. Do not add any reopen action anywhere (UI or API).

## Frontend Plan

- **Components to create:**
  - `frontend/src/components/ui/ConfirmDialog.tsx` — generic, reusable confirmation dialog primitive (overlay + panel, title, description, confirm/cancel buttons). Reimplemented cleanly with Tailwind per the Rewrite Rule (prototype `alert-dialog.tsx`/`dialog.tsx` are reference only; do not copy). Controlled via `open`/`onOpenChange`. Accessible: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, focus on confirm, Escape closes, backdrop click cancels.
  - `frontend/src/components/GuestStatusBadge.tsx` — renders the per-guest status badge: "Submitted" (teal/check) or "Editing" (taupe). Wraps the existing `ui/Badge`. (Generic check icon comes from `lucide-react`, not inline svg.)
  - `frontend/src/components/OrderOverviewCard.tsx` — the admin overview card (AC2). Header with title + "X of N submitted" summary badge; one bordered block per guest grouped by person showing name, `GuestStatusBadge`, per-guest subtotal, and the guest's selections as `{qty}x {name} — {note}` lines with line totals. Empty state when no guests joined.
  - `frontend/src/components/OrderCloseCard.tsx` — the close action card (AC1/AC3/AC6). While `state === "open"`: renders a "Close order" button that opens the `ConfirmDialog`. While `state === "closed"`: hides the close button and renders a closed indicator (reuse the `ClosedOrderBanner` pattern or a closed badge). No reopen control (AC6).
- **Components to modify:**
  - `frontend/src/routes/OrderAdminPage.tsx` — extend `useOrder` (or add a sibling hook) to also fetch the overview via `getOrderOverview`, expose `handleCloseOrder` (calls `closeOrder`, then refreshes order + overview state), and render `OrderOverviewCard` and `OrderCloseCard` below the existing `MenuSetupCard` + `ShareLinkCard`.
- **Routes:** No new routes. Admin overview lives on the existing admin page.
- **State management:** React `useState`/`useCallback` within `OrderAdminPage` (native APIs per coding standards). After a successful close the local `order.state` flips to `"closed"`, which hides the close action and disables the overview's implicit edit affordances. The overview is re-fetched on close so badges/counts reflect server state.
- **Design reference notes (REPO_DIR `docs/prototype`):** Mirror the prototype's "Live order overview" card (per-guest bordered blocks, name + status badge on the left, subtotal on the right, item list `{qty}x {name} — {note}`, "X of N submitted" badge in the header) and the "Close order?" AlertDialog copy. Use existing brand tokens already in use across the codebase (`var(--teal-600)`, `var(--taupe)`, `var(--coral)`, soft backgrounds). Do NOT render the export/email "Order actions" sub-section (STORY-5/STORY-6). Reimplement from scratch; do not adapt prototype code.
- **Accessibility & test attributes:** `data-testid` on all interactive elements and key containers, e.g. `order-overview-card`, `overview-summary-badge`, `guest-overview-item-{guestId}`, `guest-status-badge-{guestId}`, `close-order-button`, `confirm-dialog`, `confirm-dialog-confirm`, `confirm-dialog-cancel`, `order-closed-indicator`.

## Backend Plan

- **Endpoints:**
  - `POST /api/orders/{order_id}/close` → `200 OK`, `response_model=OrderRead`. Transitions the order to closed (AC3). Idempotent.
  - `GET /api/orders/{order_id}/overview` → `200 OK`, `response_model=OrderOverviewRead`. Returns the full admin overview (AC2).
  - Both added to the existing `orders` router (`backend/app/api/orders.py`, prefix `/orders`, mounted under `/api`).
- **Service layer (`backend/app/services/order_service.py`):**
  - `close_order(order_id)`: load order via `OrderRepository.get_by_id` (404 → `OrderNotFoundError` if missing); if `order.state == "closed"`, return it as-is (idempotent — closing twice is harmless and avoids races); otherwise set `order.state = "closed"`, `commit`, `refresh`, log, return `_map_order_to_read(order)`.
  - `get_order_overview(order_id)`: load order (404 if missing); load all guests via the new `GuestRepository.list_by_order(order_id)`; map each guest (name, status, grouped selections, subtotal) reusing the shared guest-mapping logic; compute `guest_count = len(guests)` and `submitted_count = count of guests with status == "submitted"`; include **all** guests regardless of status (AC5 — editing guests' in-progress items count toward the final order); return `OrderOverviewRead`.
  - **DRY note (low risk, recommended):** guest→read and selection→read mapping currently lives in `guest_service.py` (`_map_guest_to_read`, `_map_selection_to_read`, `_line_total`, `_quantize`). To avoid duplicating it in `order_service.py`, extract these into a small shared module `backend/app/services/guest_mapping.py` and import from both services. This is a behaviour-preserving extraction; keep the function signatures identical. If the builder judges the extraction risky, the fallback is to import the existing module-level helpers from `guest_service` directly — but the dedicated mapping module is preferred for clarity.
- **Repository layer:**
  - `GuestRepository.list_by_order(order_id)` (NEW, `backend/app/repositories/guest_repository.py`): `select(Guest).where(Guest.order_id == order_id).options(selectinload(Guest.selections).selectinload(GuestSelection.menu_item)).order_by(Guest.created_at)` → returns `list[Guest]`. (Mirrors the eager-loading pattern already used in `get_by_id`/`get_by_order_and_name`. Confirm `Guest.created_at` exists; if not, order by `Guest.name` as a deterministic fallback.)
  - `OrderRepository` — no change; existing `get_by_id` is sufficient for both new service methods.
- **Schemas (`backend/app/schemas/order.py`):**
  - `OrderOverviewRead` (NEW): `id: uuid.UUID`, `restaurant_name: str`, `state: str`, `guests: list[GuestRead]`, `submitted_count: int`, `guest_count: int`. Reuses the existing `GuestRead` from `app.schemas.guest` (which already carries `name`, `status`, grouped `selections`, `subtotal`). Keeps guest data out of `OrderRead`, which guests also consume.
  - `OrderRead` — unchanged (close endpoint reuses it).
- **Error handling:** Reuse existing `OrderNotFoundError` (404) for both endpoints. No new exceptions. The close endpoint deliberately does not raise on an already-closed order (idempotent). Existing `OrderClosedError` (409) on guest mutation endpoints already satisfies AC4 server-side enforcement and needs no change.
- **Migrations:** None. `Order.state` already exists and persists.

## API Integration Plan

No external API integration.

## API Contract

### 1. Close order (AC1, AC3, AC6)

- **Method:** POST
- **URL:** `/api/orders/{order_id}/close`
- **Request body:** none
- **Response 200 (`OrderRead`):**

```json
{
  "id": "8b1f...-uuid",
  "restaurant_name": "Trattoria Demo",
  "state": "closed",
  "menu_items": [
    {
      "id": "a1...-uuid",
      "name": "Margherita",
      "price": "9.50",
      "category": "Pizza"
    }
  ]
}
```

- **Idempotent:** calling close again on an already-closed order returns `200` with the same `OrderRead` (`state: "closed"`).
- **Error 404 (order not found):**

```json
{
  "error": {
    "code": "ORDER_NOT_FOUND",
    "message": "Order '{order_id}' not found"
  }
}
```

### 2. Admin order overview (AC2, AC5)

- **Method:** GET
- **URL:** `/api/orders/{order_id}/overview`
- **Request:** none
- **Response 200 (`OrderOverviewRead`):**

```json
{
  "id": "8b1f...-uuid",
  "restaurant_name": "Trattoria Demo",
  "state": "open",
  "submitted_count": 2,
  "guest_count": 3,
  "guests": [
    {
      "id": "g1...-uuid",
      "order_id": "8b1f...-uuid",
      "name": "Alice",
      "status": "submitted",
      "subtotal": "19.00",
      "selections": [
        {
          "id": "s1...-uuid",
          "menu_item_id": "a1...-uuid",
          "item_name": "Margherita",
          "item_price": "9.50",
          "item_category": "Pizza",
          "note": "no onions",
          "quantity": 2,
          "line_total": "19.00"
        }
      ]
    },
    {
      "id": "g2...-uuid",
      "order_id": "8b1f...-uuid",
      "name": "Bob",
      "status": "editing",
      "subtotal": "0.00",
      "selections": []
    }
  ]
}
```

- **Error 404 (order not found):**

```json
{
  "error": {
    "code": "ORDER_NOT_FOUND",
    "message": "Order '{order_id}' not found"
  }
}
```

### Frontend client additions (`frontend/src/api/orders.ts`)

- `closeOrder(orderId: string): Promise<Order>` → `apiPost<Order>(\`/orders/${orderId}/close\`)`
- `getOrderOverview(orderId: string): Promise<OrderOverview>` → `apiGet<OrderOverview>(\`/orders/${orderId}/overview\`)`

## File Manifest

### New files

- `backend/app/services/guest_mapping.py`: shared guest/selection → read mapping helpers (`_line_total`, `_quantize`, `map_selection_to_read`, `map_guest_to_read`) extracted from `guest_service.py` so both `GuestService` and `OrderService` reuse them (DRY).
- `.claude/artifacts/STORY-4/plan.md`: this plan (artifact).
- `.claude/artifacts/STORY-4/shared_risks.md`: shared risk analysis (artifact).
- `frontend/src/components/ui/ConfirmDialog.tsx`: generic accessible confirmation dialog primitive (AC5).
- `frontend/src/components/GuestStatusBadge.tsx`: per-guest "Editing"/"Submitted" status badge (AC2).
- `frontend/src/components/OrderOverviewCard.tsx`: admin overview card grouped by guest with summary count (AC2, AC5).
- `frontend/src/components/OrderCloseCard.tsx`: close-order action + closed indicator (AC1, AC3, AC4-UI, AC6).
- `backend/tests/unit/test_order_service_unit.py` — already exists; ADD cases (see Testing Strategy). Listed under Modified below.
- `e2e/tests/STORY-4_admin-closes-order.spec.ts`: E2E spec covering the 6 ACs.
- `e2e/uat/scenarios/STORY-4_admin-closes-order.feature`: Gherkin UAT scenarios (UAT optional → generated).
- `e2e/uat/scripts/STORY-4_admin-closes-order_uat_script.md`: manual UAT clickthrough script.

### Modified files

- `backend/app/schemas/order.py`: add `OrderOverviewRead` schema (imports `GuestRead` from `app.schemas.guest`).
- `backend/app/repositories/guest_repository.py`: add `list_by_order(order_id)` with selectinload of selections→menu_item, ordered deterministically.
- `backend/app/services/order_service.py`: add `close_order` and `get_order_overview`; import shared mappers from `guest_mapping.py`.
- `backend/app/services/guest_service.py`: replace the local `_map_guest_to_read`/`_map_selection_to_read`/`_line_total`/`_quantize` with imports from `guest_mapping.py` (behaviour-preserving). No logic change.
- `backend/app/api/orders.py`: add `POST /{order_id}/close` (→ `OrderRead`) and `GET /{order_id}/overview` (→ `OrderOverviewRead`) routes.
- `frontend/src/api/types.ts`: add `OrderOverview` interface (and reuse existing `Guest`/`GuestSelection`/`GuestStatus`).
- `frontend/src/api/orders.ts`: add `closeOrder` and `getOrderOverview` functions.
- `frontend/src/routes/OrderAdminPage.tsx`: fetch overview, wire `handleCloseOrder`, render `OrderOverviewCard` + `OrderCloseCard`.
- `e2e/helpers/order.ts`: add `closeTestOrder(request, orderId)` and `getOrderOverview(request, orderId)` helpers (plus an `OrderOverviewData` type) for deterministic E2E setup.
- `backend/tests/unit/test_order_service_unit.py`: add unit cases for `close_order` and `get_order_overview`.

## Testing Strategy

- **Unit tests** (service-layer business logic, all repos mocked):
  - Directory: `backend/tests/unit/`
  - Naming: `test_{module}_unit.py` → `backend/tests/unit/test_order_service_unit.py` (extend existing).
  - Cases for `close_order`: happy path (open → closed, state persisted, returns `OrderRead` with `state == "closed"`); idempotent edge case (already-closed order returns as-is without error); error case (`OrderNotFoundError` when missing).
  - Cases for `get_order_overview`: happy path (multiple guests, correct `submitted_count`/`guest_count`, selections grouped); edge case (zero guests → empty list, both counts 0; AC5 — an "editing" guest with items is still included and its subtotal counts); error case (`OrderNotFoundError` when missing).
  - If `guest_mapping.py` is extracted, the existing `test_guest_service_unit.py` continues to validate mapping behaviour through `GuestService`; no separate mapper-only suite required.
- **Integration tests** (ENABLED — real DB + full HTTP cycle):
  - Directory: `backend/tests/integration/`, naming `test_{module}_integration.py`, shared fixtures `backend/tests/conftest.py`.
  - Router (`test_orders_router_integration.py`, extend): `POST /api/orders/{id}/close` happy path (200, `state == "closed"`); close on missing order (404); idempotent second close (200). `GET /api/orders/{id}/overview` happy path (200 with seeded guests + selections, correct counts); overview on missing order (404). One cross-cutting case: after close, a guest mutation (`POST .../selections`) returns 409 `ORDER_CLOSED` (proves AC4 server-side enforcement holds — reuses existing behaviour).
  - Repository (`test_guest_repository_integration.py`, extend): `list_by_order` round-trip (insert guests + selections, retrieve ordered, selections eager-loaded); empty-result edge case (order with no guests → empty list).
- **E2E tests** (ENABLED — Playwright TS):
  - Directory: `e2e/tests/`, file `STORY-4_admin-closes-order.spec.ts`. Helpers: `e2e/helpers/order.ts`.
  - Seed via API (`createTestOrder`, `addTestMenuItem`, `joinGuest`, `addSelection`) then drive the UI. Locator precedence: `data-testid` first. No hardcoded waits. Screenshot on failure (config-level).
- **UAT scenarios** (OPTIONAL → generated):
  - Gherkin: `e2e/uat/scenarios/STORY-4_admin-closes-order.feature` (one scenario per AC + one edge case).
  - Manual script: `e2e/uat/scripts/STORY-4_admin-closes-order_uat_script.md` (step-by-step with pass/fail checkboxes).

## Acceptance Test Outline

| #   | Acceptance Criterion                                                | E2E Strategy                                                                                                                                                                                                                                        | UAT Scenario Sketch                                                                                                                                                      |
| --- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Close action shown while order open                                 | Seed an open order; load admin page; assert `close-order-button` is visible/enabled.                                                                                                                                                                | Given an open order, When the admin opens the admin view, Then a "Close order" action is visible.                                                                        |
| 2   | Overview grouped by guest + status badges + "X of N submitted"      | Seed order with 3 guests (2 submitted, 1 editing) each with selections; assert each `guest-overview-item-{id}` shows name, `guest-status-badge-{id}` ("Submitted"/"Editing"), grouped lines, and `overview-summary-badge` reads "2 of 3 submitted". | Given guests with mixed statuses, When the admin views the overview, Then each guest's items and status badge appear and the summary shows "2 of 3 submitted".           |
| 3   | Close sets state to closed and persists                             | Click `close-order-button`, confirm in dialog; assert closed indicator appears; reload page; assert state still closed (persisted server-side).                                                                                                     | Given an open order, When the admin closes it, Then the order shows as closed and remains closed after refresh.                                                          |
| 4   | Closed disables guest add/edit/remove across sessions after refresh | After close, in a separate (guest) browser context attempt to add a selection via UI; assert it is blocked (and API returns 409). Reload confirms closed banner persists.                                                                           | Given a closed order, When a guest reloads and tries to change their order, Then the controls are disabled and changes are rejected for everyone.                        |
| 5   | Confirmation prompt before closing; editing guests still counted    | Click `close-order-button`; assert `confirm-dialog` shows copy "Close order? Members can no longer make changes"; cancel keeps order open; an editing guest's items are visible in the overview and counted.                                        | Given the admin clicks Close, When the confirmation appears, Then closing requires confirming; canceling leaves the order open; in-progress (editing) items still count. |
| 6   | Closed order cannot be reopened from UI                             | After close, assert no reopen control exists anywhere on the admin page and the close button is gone.                                                                                                                                               | Given a closed order, When the admin views the order, Then there is no option to reopen it.                                                                              |
