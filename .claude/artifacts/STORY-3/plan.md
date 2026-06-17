# Implementation Plan — STORY-3: A guest joins via the link and adds items

## Feature

> As anyone with the share link, I want to open it, enter my name, and add menu
> items with optional notes, so my meal is included and attributed to me.

## Acceptance Criteria

- [ ] AC1: Opening the shared link shows the restaurant name and the full menu as read-only selectable items, with no login or account step.
- [ ] AC2: Before adding anything, the guest must enter a name (required, non-empty text); the add controls are disabled until a name is entered.
- [ ] AC3: The guest can add any menu item to the order; each addition is tagged with their entered name.
- [ ] AC4: For each item added, the guest can enter an optional free-text note (e.g. no onions) attached to that specific item.
- [ ] AC5: The guest can adjust quantity (minimum 1) and remove their own added items while the order is open.
- [ ] AC6: The guest sees a running subtotal of only their own selections, updating on every change. Items with no price are treated as 0 in the subtotal (and displayed without a price).
- [ ] AC7: A guest cannot view, edit, or remove items added by others.
- [ ] AC8: The guest has a status of "Editing" or "Submitted"; newly-joined guests start as "Editing". (Submit/reopen behavior is defined in Story 7.)
- [ ] AC9: If the order state is closed, the menu is shown read-only, all add/edit/remove controls are disabled, and a message states the order is closed.

## Plan Overview

This feature introduces **guest selections** on top of the existing order/menu
foundation (STORY-1) and the `/order/:id/guest` route (STORY-2). It adds two new
persisted entities — `guests` (identified by a typed name, with an
"editing"/"submitted" status) and `guest_selections` (a guest's chosen menu items
with an optional note and a quantity) — exposed through a new guest-scoped API and
a redesigned interactive guest order page.

All order state remains **server-persisted in Postgres** and keyed by the order id
in the URL (per the fixed architecture constraint). A guest is identified by the
`(order_id, name)` pair, so re-entering the same name on any browser/session returns
that guest's existing selections. Per-guest isolation (AC7) is enforced structurally:
guest endpoints are scoped by `guest_id`, and the public order read continues to
return only the menu + state, never other guests' selections.

**Scope guard (STORY-7 boundary):** STORY-3 creates the `status` column defaulting to
`"editing"` and surfaces it read-only. It does **not** implement submit/reopen — that
is STORY-7. No submit endpoint or submit button is added here.

### Layers touched

- Backend: new models, schemas, repositories, a dedicated `GuestService`, a new
  `guests` router, new exceptions + status mappings, one Alembic migration.
- Frontend: new guest API functions/types, a rebuilt `GuestOrderPage`, and new
  guest-ordering components.

## Frontend Plan

The guest page is rebuilt into three states driven by the server-side order `state`
and the in-session guest identity (held in React state only — **not** localStorage):

1. **Closed order (AC9):** read-only menu via the existing `GuestMenuCard` plus a
   closed banner. No name form, no add/edit/remove controls.
2. **Open, no name yet (AC1, AC2):** read-only menu via `GuestMenuCard` (preserves
   the `guest-menu-card` contract STORY-2 relies on) plus a name form. Add controls
   are not rendered/enabled until the guest joins.
3. **Open, joined (AC3–AC8):** interactive menu (each item gets an "Add" button) plus
   a "My order" panel showing the guest's status badge, their selections (note field,
   quantity stepper, remove, line total), and a running subtotal.

- **Components to create:**
  - `frontend/src/components/GuestNameForm.tsx` — required name input + join button; gates add controls (AC2).
  - `frontend/src/components/GuestOrderPanel.tsx` — "My order" organism: status badge, selection list, subtotal, empty state.
  - `frontend/src/components/GuestSelectionRow.tsx` — one selection: item name/price, note input (blur-saved), quantity stepper (min 1), line total, remove.
  - `frontend/src/components/QuantityStepper.tsx` — reusable −/value/+ stepper (min 1).
  - `frontend/src/components/ClosedOrderBanner.tsx` — closed message (AC9).
- **Components to modify:**
  - `frontend/src/components/GuestMenuCard.tsx` — add optional `onAddItem` + `addDisabled` props; when `onAddItem` is provided, render a per-row "Add" button. Defaults preserve current read-only behaviour (and STORY-2 tests).
  - `frontend/src/components/MenuItemList.tsx` / `MenuItemRow.tsx` — thread an optional `onAdd`/`addDisabled` through to render a per-row add button (`menu-item-add-{id}`). Existing admin remove behaviour unchanged.
  - `frontend/src/routes/GuestOrderPage.tsx` — orchestrate the three states above and wire the guest API.
- **Routes:** none added (`/order/:id/guest` already exists).
- **State management:** local React state via hooks. The guest's `name`/`guestId`
  live in component state; selection mutations return the updated `GuestRead`
  (status + selections + recomputed subtotal), which becomes the source of truth so
  the UI never recomputes money client-side.
- **Design reference notes (REPO_DIR `docs/prototype`):** teal primary actions,
  coral for destructive/remove and errors, taupe/blue-grey neutrals (CSS vars already
  in `index.css`). "Editing" badge uses a neutral tone, "Submitted" teal (status is
  read-only here). Mobile-first; guests open on phones.

## Backend Plan

### Endpoints (exactly 5, all under the existing `/orders/{order_id}` tree)

| #   | Method | Path                                                             | Purpose                                                                                            |
| --- | ------ | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1   | POST   | `/orders/{order_id}/guests`                                      | Join: get-or-create a guest by name; returns the guest with selections + subtotal (AC2, AC3, AC8). |
| 2   | GET    | `/orders/{order_id}/guests/{guest_id}`                           | Read the guest's own selections + subtotal (AC6, AC7; reload after refresh).                       |
| 3   | POST   | `/orders/{order_id}/guests/{guest_id}/selections`                | Add a menu item to the guest's order (note optional, quantity default 1) (AC3, AC4).               |
| 4   | PATCH  | `/orders/{order_id}/guests/{guest_id}/selections/{selection_id}` | Adjust quantity (min 1) and/or edit note of an own selection (AC4, AC5).                           |
| 5   | DELETE | `/orders/{order_id}/guests/{guest_id}/selections/{selection_id}` | Remove an own selection (AC5).                                                                     |

- Endpoints 3/4/5 return the updated `GuestRead` (200) so the client gets the
  server-computed subtotal in one round-trip. DELETE intentionally returns 200 + body
  (a deliberate deviation from STORY-1's 204) to keep the subtotal authoritative.
- The existing `GET /orders/{order_id}` is **unchanged** and continues to return only
  `{ id, restaurant_name, state, menu_items }` — it never exposes guest selections,
  preserving AC7.

### Service layer (`GuestService`)

A dedicated `GuestService` (separate from `OrderService`, SRP) holds all guest
business logic and the transactional boundaries:

- `join_guest(order_id, name)` — validate order exists; validate name non-empty
  (trimmed); get-or-create guest by `(order_id, name)`; default status `"editing"`.
- `get_guest(order_id, guest_id)` — load guest + selections; compute subtotal.
- `add_selection(order_id, guest_id, data)` — guard order open; validate the
  `menu_item_id` belongs to this order; validate quantity ≥ 1 (default 1); insert.
- `update_selection(order_id, guest_id, selection_id, data)` — guard order open;
  verify the selection belongs to this guest (else not-found → enforces AC7); apply
  quantity (≥ 1) and/or note.
- `remove_selection(order_id, guest_id, selection_id)` — guard order open; verify
  ownership; delete.
- Subtotal / line-total are pure helpers (unit-tested): `line_total = quantity *
(price or 0)`; `subtotal = sum(line_totals)`; rendered as a `"0.01"`-quantized
  string. Null price → 0 (AC6).

### Repository layer

- `GuestRepository`: `insert`, `get_by_id` (eager-load selections → menu_item),
  `get_by_order_and_name`.
- `GuestSelectionRepository`: `insert`, `get_by_id_and_guest`, `delete`.

### Migrations

- `backend/alembic/versions/0002_add_guests_and_selections.py` (down_revision `0001`):
  - `guests`: `id` UUID PK, `order_id` UUID FK→orders (ondelete CASCADE, indexed),
    `name` String not null, `status` String not null server_default `"editing"`,
    `created_at` timestamptz. Unique constraint on `(order_id, name)`.
  - `guest_selections`: `id` UUID PK, `guest_id` UUID FK→guests (ondelete CASCADE,
    indexed), `menu_item_id` UUID FK→menu_items (ondelete CASCADE), `note` String
    nullable, `quantity` Integer not null server_default `"1"`, `created_at`
    timestamptz.

### Exceptions + handlers

Add to `app/exceptions.py`: `GuestNotFoundError` (404), `GuestSelectionNotFoundError`
(404), `OrderClosedError` (409). Register in `app/error_handlers.py` `_STATUS_MAP`.
Reuse existing `MenuItemNotFoundError` (404) when a selection references an item not
in the order, and `ValidationError` (422) for empty name / quantity < 1.

### Closed-order enforcement (AC9, server-side)

`add_selection`, `update_selection`, and `remove_selection` raise `OrderClosedError`
(409) when `order.state == "closed"`, so edits are rejected across all sessions, not
just hidden in the UI (per CLAUDE.md). `join_guest`/`get_guest` remain read-safe.

## API Integration Plan

No external API integration. (Deliveroo is manual re-entry only; no third-party calls.)

## API Contract

**1. Join guest**

```
POST /api/orders/{order_id}/guests
Request:  { "name": "Sara" }
Response 201: {
  "id": "e2b1...", "order_id": "a14f...", "name": "Sara",
  "status": "editing", "selections": [], "subtotal": "0.00"
}
```

**2. Get guest**

```
GET /api/orders/{order_id}/guests/{guest_id}
Response 200: { ...same shape as above, selections populated... }
```

**3. Add selection**

```
POST /api/orders/{order_id}/guests/{guest_id}/selections
Request:  { "menu_item_id": "9f1c...", "note": "no onions", "quantity": 2 }
Response 200 (GuestRead): {
  "id": "...", "name": "Sara", "status": "editing",
  "selections": [
    { "id": "s1...", "menu_item_id": "9f1c...", "item_name": "Margherita",
      "item_price": "9.50", "item_category": "Pizza",
      "note": "no onions", "quantity": 2, "line_total": "19.00" }
  ],
  "subtotal": "19.00"
}
```

**4. Update selection**

```
PATCH /api/orders/{order_id}/guests/{guest_id}/selections/{selection_id}
Request:  { "quantity": 3 }            // or { "note": "extra cheese" } or both
Response 200: GuestRead (recomputed subtotal)
```

**5. Remove selection**

```
DELETE /api/orders/{order_id}/guests/{guest_id}/selections/{selection_id}
Response 200: GuestRead (recomputed subtotal)
```

**Error responses** (existing envelope `{ "error": { "code", "message" } }`):
`404 ORDER_NOT_FOUND | GUEST_NOT_FOUND | GUEST_SELECTION_NOT_FOUND | MENU_ITEM_NOT_FOUND`,
`409 ORDER_CLOSED`, `422 VALIDATION_ERROR`.

## File Manifest

### New files — backend

- `backend/app/models/guest.py`: `Guest` ORM model + relationships.
- `backend/app/models/guest_selection.py`: `GuestSelection` ORM model + relationships.
- `backend/app/schemas/guest.py`: `GuestCreate`, `GuestSelectionCreate`, `GuestSelectionUpdate`, `GuestSelectionRead`, `GuestRead`.
- `backend/app/repositories/guest_repository.py`: `GuestRepository`.
- `backend/app/repositories/guest_selection_repository.py`: `GuestSelectionRepository`.
- `backend/app/services/guest_service.py`: `GuestService` + subtotal/line-total helpers.
- `backend/app/api/guests.py`: guests router (5 endpoints).
- `backend/alembic/versions/0002_add_guests_and_selections.py`: migration.

### New files — frontend

- `frontend/src/components/GuestNameForm.tsx`
- `frontend/src/components/GuestOrderPanel.tsx`
- `frontend/src/components/GuestSelectionRow.tsx`
- `frontend/src/components/QuantityStepper.tsx`
- `frontend/src/components/ClosedOrderBanner.tsx`

### New files — tests

- `backend/tests/unit/test_guest_service_unit.py`
- `backend/tests/integration/test_guest_repository_integration.py`
- `backend/tests/integration/test_guests_router_integration.py`
- `e2e/tests/STORY-3_guest-joins-adds-items.spec.ts`
- `e2e/uat/scenarios/STORY-3_guest-joins-adds-items.feature`
- `e2e/uat/scripts/STORY-3_guest-joins-adds-items_uat_script.md`

### Modified files — backend

- `backend/app/models/__init__.py`: export new models (so Alembic/metadata see them).
- `backend/app/models/order.py`: add `guests` relationship (cascade delete-orphan).
- `backend/app/exceptions.py`: add 3 new exceptions.
- `backend/app/error_handlers.py`: map new exceptions to status codes.
- `backend/app/api/deps.py`: add `get_guest_service`.
- `backend/app/main.py`: include the guests router.

### Modified files — frontend

- `frontend/src/api/types.ts`: add `Guest`, `GuestSelection`, and payload types.
- `frontend/src/api/orders.ts`: add `joinGuest`, `getGuest`, `addSelection`, `updateSelection`, `removeSelection`.
- `frontend/src/routes/GuestOrderPage.tsx`: orchestrate the three states.
- `frontend/src/components/GuestMenuCard.tsx`: optional `onAddItem` + `addDisabled`.
- `frontend/src/components/MenuItemList.tsx` + `MenuItemRow.tsx`: optional per-row add.

### Modified files — tests

- `e2e/helpers/order.ts`: add `joinGuest` + `addSelection` API helpers.

## Testing Strategy

- **Unit tests** (`backend/tests/unit/`, naming `test_{module}_unit.py`):
  `test_guest_service_unit.py` — mock repositories. Cover, per method, happy + edge +
  error: join (create / get-or-create existing / empty-name error), add_selection
  (default qty / item-not-in-order 404 / closed 409), update_selection (qty change /
  note edit / qty<1 422 / not-owned 404), remove_selection (happy / not-owned 404),
  and subtotal/line-total helpers (null price → 0, quantity multiply, mixed items).
- **Integration tests** (ENABLED, `backend/tests/integration/`):
  - `test_guest_repository_integration.py` — insert+get round-trip, get_by_order_and_name (hit + miss), selection insert/get/delete, cascade on order delete.
  - `test_guests_router_integration.py` — full HTTP cycle: join 201, join existing returns same id, GET guest, add selection 200, PATCH qty/note 200, DELETE 200, closed → 409, unknown guest/selection → 404, empty name / qty<1 → 422, ownership (other guest's selection) → 404.
- **E2E tests** (ENABLED, `e2e/tests/`, file `STORY-3_guest-joins-adds-items.spec.ts`):
  one+ case per AC (table below). Seed via API helpers; locate by `data-testid`.
- **UAT scenarios** (OPTIONAL — included): Gherkin
  `e2e/uat/scenarios/STORY-3_guest-joins-adds-items.feature` + manual script
  `e2e/uat/scripts/STORY-3_guest-joins-adds-items_uat_script.md`.

## Acceptance Test Outline

| #   | Acceptance Criterion                                    | E2E Strategy                                                                                                                               | UAT Scenario Sketch                                                                                       |
| --- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| 1   | Link shows restaurant + read-only menu, no login        | Goto guest route; assert `guest-menu-card`, restaurant name, menu rows visible; no login prompt                                            | Given an open order link, When a guest opens it, Then they see the restaurant and full menu with no login |
| 2   | Name required; add controls disabled until name entered | Assert add buttons absent/disabled before join; enter name + join → enabled                                                                | Given the guest view, When no name is entered, Then add controls are disabled                             |
| 3   | Add item, tagged with name                              | Join as "Sara", add Margherita; assert selection appears in My order; verify via API it is attributed to Sara                              | Given a name is entered, When the guest adds an item, Then it appears under their order                   |
| 4   | Optional per-item note                                  | Add item, type a note, blur; reload guest → note persisted                                                                                 | Given an added item, When the guest types a note, Then the note is saved to that item                     |
| 5   | Adjust quantity (min 1), remove own items               | Use stepper to 2 then attempt below 1 (blocked at 1); remove → item gone                                                                   | Given an added item, When quantity is changed/removed, Then the list and totals update                    |
| 6   | Running subtotal of own selections; null price = 0      | Add priced + price-less items; assert `guest-subtotal` equals expected; price-less shows no price                                          | Given selections, When they change, Then the subtotal updates and unpriced items count as 0               |
| 7   | Cannot view/edit/remove others' items                   | Via API create guest B with an item; open as guest A; assert B's item not shown; PATCH/DELETE of B's selection as A → 404                  | Given two guests, When one views their order, Then they never see the other's items                       |
| 8   | Status Editing on join                                  | After join assert `guest-status-badge` reads "Editing"                                                                                     | Given a newly joined guest, Then their status is "Editing"                                                |
| 9   | Closed order: read-only, controls disabled, message     | Close order via API (state=closed) or seed closed; open guest route; assert closed banner, no add/edit/remove controls; API mutation → 409 | Given a closed order, When a guest opens it, Then the menu is read-only with a closed message             |
