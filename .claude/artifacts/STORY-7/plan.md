# Implementation Plan — STORY-7: Guest submits their order

## Feature

> As a guest, I want to submit my order when I'm done so the admin knows my
> selections are final, with the ability to reopen and edit if I change my mind.
>
> **Note:** This addresses a gap found during implementation of v1 — guests could
> add/modify items but had no way to signal completion to the admin. Submit is a
> _soft_ action: it flags the guest as done but does not lock their items.

## Acceptance Criteria

- [ ] AC1: While the order is open, the guest sees a prominent "Submit my order" action.
- [ ] AC2: The submit action is disabled until the guest has added at least one item.
- [ ] AC3: Submitting sets the guest's status to "Submitted" and shows a confirmation state in the guest view (banner: "Your order is submitted — the organizer can see it. You can still reopen to make changes.").
- [ ] AC4: A submitted guest can click "Reopen / edit my order" to return to "Editing" status and modify their items.
- [ ] AC5: If a submitted guest edits any item (add/remove/quantity/note), their status automatically reverts to "Editing" so the admin's view stays accurate.
- [ ] AC6: Guest status (Editing / Submitted) is part of the shared order state and visible to the admin (Story 3 / Story 4 surfaces it).
- [ ] AC7: When the order is closed, the submit/reopen controls are disabled along with all other guest editing controls.

## Plan Overview

This feature is **incremental**. STORY-3 and STORY-4 already shipped the data model
groundwork: the `guests.status` column (default `editing`), the `status` field on
`GuestRead`, the `GuestStatusBadge`, and the admin overview's per-guest badges and
`X of N submitted` summary (AC6 is largely satisfied by existing code and will be
verified, not rebuilt).

STORY-7 adds the missing **behaviour**:

- **Backend:** two new state-transition endpoints (`/submit`, `/reopen`) on the guest
  resource, plus an auto-revert rule so any selection mutation by a submitted guest
  flips their status back to `editing`. No schema change — the `status` column already
  exists, so **no migration**.
- **Frontend:** a submit/reopen control bar in the guest "My order" panel, wired to the
  two new endpoints, with the submitted confirmation banner. Closed-order disabling is
  inherited from the existing guest page behaviour (the whole editing panel is hidden
  when the order is closed) and additionally enforced server-side.

Chosen behaviour for AC5: **automatic revert** (not "prompt to reopen first"). The AC
allows either; auto-revert keeps the client simple and the admin view always accurate
without an extra interaction. The server is the single source of truth and returns the
updated guest (with `status: "editing"`) on every selection mutation, so the UI reflects
the revert with no extra round-trip.

## Frontend Plan

- **Components to create:**
  - `frontend/src/components/GuestSubmitBar.tsx` — presentational control bar rendered
    inside the "My order" panel. Receives `guest`, `onSubmit`, `onReopen`, `disabled`.
    - When `status === "editing"`: renders a prominent **"Submit my order"** button
      (`data-testid="guest-submit-button"`), disabled when `guest.selections.length === 0`
      or `disabled` (in-flight mutation).
    - When `status === "submitted"`: renders the confirmation banner
      (`data-testid="guest-submitted-banner"`) with the AC3 copy, plus a
      **"Reopen / edit my order"** button (`data-testid="guest-reopen-button"`).
- **Components to modify:**
  - `frontend/src/components/GuestOrderPanel.tsx` — accept `onSubmit` and `onReopen`
    props and render `<GuestSubmitBar>` beneath the subtotal. No other change.
  - `frontend/src/routes/GuestOrderPage.tsx` — add `handleSubmit` and `handleReopen`
    handlers (both go through the existing `runMutation` helper, which already swaps in
    the server-returned guest and manages the `isMutating`/`actionError` state) and pass
    them to `GuestOrderPanel`.
- **API client:**
  - `frontend/src/api/orders.ts` — add `submitGuestOrder(orderId, guestId)` and
    `reopenGuestOrder(orderId, guestId)`, both `POST` returning `Guest`.
- **Routes:** No new routes.
- **State management:** Reuse the existing `GuestOrderPageInner` local state; the
  server-returned `Guest` remains the single source of truth. No new state library.
- **Closed-order handling (AC7):** `GuestOrderPage` already renders the editing panel
  only when `!isClosed && guest`, so submit/reopen controls are absent when closed and
  the `ClosedOrderBanner` shows instead. The backend also rejects `/submit` and
  `/reopen` on a closed order (defence in depth, enforced across all sessions).
- **Design reference notes (REPO_DIR, `docs/prototype`):** Match the existing card/badge
  visual language. The submit button uses the primary `Button` variant (teal accent
  already used for subtotal/CTAs); the submitted banner reuses the soft info-banner
  treatment consistent with `ClosedOrderBanner`. No new colors or icons beyond the
  `lucide-react` set already in use (e.g. `Check` already used by `GuestStatusBadge`).

## Backend Plan

- **Endpoints (2 new):**
  - `POST /orders/{order_id}/guests/{guest_id}/submit` → `200`, `GuestRead`
  - `POST /orders/{order_id}/guests/{guest_id}/reopen` → `200`, `GuestRead`
- **Service layer (`GuestService`):**
  - `submit_guest(order_id, guest_id)`:
    1. Require order (404 if missing); reject if `order.state == "closed"` → `OrderClosedError` (409).
    2. Require guest belongs to order (404 if not).
    3. Reject if the guest has zero selections → `ValidationError` (422) — server-side
       mirror of AC2.
    4. Set `guest.status = "submitted"`, commit, reload, return mapped `GuestRead`.
  - `reopen_guest(order_id, guest_id)`:
    1. Require order (404); reject if closed → `OrderClosedError` (409).
    2. Require guest (404).
    3. Set `guest.status = "editing"`, commit, reload, return `GuestRead`.
  - **Auto-revert (AC5):** in `add_selection`, `update_selection`, and `remove_selection`,
    after the existing mutation set `guest.status = "editing"` (idempotent — no-op when
    already editing) before commit. Keeps the admin view accurate. A small private helper
    keeps this DRY.
- **Repository layer:** No new queries. Reuse `GuestRepository.get_by_id`
  (already eager-loads selections via `selectinload` and uses `populate_existing` so the
  reload reflects the status change).
- **Constants:** add `GUEST_STATUS_EDITING = "editing"` and
  `GUEST_STATUS_SUBMITTED = "submitted"` to `backend/app/constants.py` and use them in the
  new/updated service paths to remove magic strings (existing literal usages left as-is to
  contain scope).
- **Migrations:** None. The `guests.status` column already exists
  (`0002_add_guests_and_selections.py`).

## API Integration Plan

No external API integration.

## API Contract

### Submit

- **Method:** `POST`
- **URL:** `/orders/{order_id}/guests/{guest_id}/submit`
- **Request:** no body
- **Response 200:** `GuestRead`

```json
{
  "id": "f1e2...",
  "order_id": "a1b2...",
  "name": "Sara",
  "status": "submitted",
  "selections": [
    {
      "id": "...",
      "menu_item_id": "...",
      "item_name": "Margherita",
      "item_price": "9.50",
      "item_category": "Pizza",
      "note": null,
      "quantity": 1,
      "line_total": "9.50"
    }
  ],
  "subtotal": "9.50"
}
```

- **Errors:** `404` (order/guest not found), `409` (`ORDER_CLOSED`),
  `422` (`VALIDATION_ERROR` — no items added).

### Reopen

- **Method:** `POST`
- **URL:** `/orders/{order_id}/guests/{guest_id}/reopen`
- **Request:** no body
- **Response 200:** `GuestRead` with `"status": "editing"`.
- **Errors:** `404` (order/guest not found), `409` (`ORDER_CLOSED`).

### Side effect on existing endpoints (AC5)

`POST .../selections`, `PATCH .../selections/{id}`, `DELETE .../selections/{id}` now return
the guest with `"status": "editing"` whenever the guest was previously `submitted`.

## File Manifest

### New files

- `backend/tests/unit/test_guest_service_unit.py` — _(exists; extend, see Modified)_
- `frontend/src/components/GuestSubmitBar.tsx` — submit button + submitted banner + reopen button.
- `e2e/tests/STORY-7_guest-submits-order.spec.ts` — E2E coverage for AC1–AC7.

### Modified files

- `backend/app/constants.py` — add `GUEST_STATUS_EDITING` / `GUEST_STATUS_SUBMITTED`.
- `backend/app/services/guest_service.py` — add `submit_guest`, `reopen_guest`; add
  auto-revert to `add_selection`/`update_selection`/`remove_selection`.
- `backend/app/api/guests.py` — add `POST .../submit` and `POST .../reopen` routes.
- `backend/tests/unit/test_guest_service_unit.py` — unit tests for submit/reopen/auto-revert.
- `backend/tests/integration/test_guests_router_integration.py` — router tests for the
  two new endpoints (happy path + error cases).
- `frontend/src/api/orders.ts` — add `submitGuestOrder` / `reopenGuestOrder`.
- `frontend/src/components/GuestOrderPanel.tsx` — accept `onSubmit`/`onReopen`, render `GuestSubmitBar`.
- `frontend/src/routes/GuestOrderPage.tsx` — add submit/reopen handlers wired via `runMutation`.

> No change to `frontend/src/api/types.ts` (the `Guest.status` union and `OrderOverview`
> fields already exist) and no change to the admin overview components (AC6 already
> satisfied by STORY-4).

## Testing Strategy

- **Unit tests** (service-layer business logic):
  - Directory: `backend/tests/unit/` · Naming: `test_guest_service_unit.py`
  - Cases: `submit_guest` happy path (status→submitted); `submit_guest` with no
    selections raises `ValidationError`; `submit_guest` on a closed order raises
    `OrderClosedError`; `submit_guest` on unknown guest raises `GuestNotFoundError`;
    `reopen_guest` happy path (status→editing); `reopen_guest` on closed order raises
    `OrderClosedError`; auto-revert: adding/updating/removing a selection on a
    `submitted` guest returns `editing`.
- **Integration tests** (router, real DB + HTTP) — ENABLED per CLAUDE.md:
  - Directory: `backend/tests/integration/` · File: `test_guests_router_integration.py`
  - Cases: `POST /submit` → `200` with `status: "submitted"`; `POST /submit` with no
    items → `422`; `POST /submit` on closed order → `409`; `POST /submit` unknown guest
    → `404`; `POST /reopen` → `200` with `status: "editing"`; `POST /reopen` on closed
    order → `409`; selection mutation after submit → guest comes back `editing`.
- **E2E tests** (Playwright) — ENABLED per CLAUDE.md:
  - Directory: `e2e/tests/` · File: `STORY-7_guest-submits-order.spec.ts`
  - Reuse `e2e/helpers/order.ts` (`createTestOrder`, `addTestMenuItem`, `joinGuest`,
    `addSelection`, `closeTestOrder`, `getOrderOverview`). Add no new helpers unless a
    submit helper is genuinely reused; prefer driving submit/reopen through the UI.
- **UAT scenarios** — OPTIONAL per CLAUDE.md (UAT Generation: OPTIONAL). Will generate a
  Gherkin feature + manual script (`e2e/uat/.../STORY-7_guest-submits-order...`) if the
  build step opts in; not required to pass the gate.

## Acceptance Test Outline

| #   | Acceptance Criterion                            | E2E Strategy                                                                                                                                               | UAT Scenario Sketch                                                                   |
| --- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 1   | Prominent "Submit my order" action while open   | Join + add item; assert `guest-submit-button` visible & enabled                                                                                            | Given an open order, When I have added an item, Then I see a "Submit my order" button |
| 2   | Submit disabled until ≥1 item                   | Join (no items); assert `guest-submit-button` disabled; add item; assert enabled. API: `POST /submit` with no items → 422                                  | Given I have no items, Then the submit button is disabled                             |
| 3   | Submit → status Submitted + confirmation banner | Click submit; assert `guest-status-badge` = "Submitted" and `guest-submitted-banner` visible with AC3 copy                                                 | When I submit, Then I see a confirmation banner and my status is Submitted            |
| 4   | Reopen → back to Editing                        | From submitted state, click `guest-reopen-button`; assert badge = "Editing" and submit button returns                                                      | When I reopen, Then I can edit again and my status is Editing                         |
| 5   | Editing after submit auto-reverts to Editing    | Submit, then change quantity/add/remove; assert badge flips to "Editing" without manual reopen                                                             | Given I am Submitted, When I change an item, Then my status reverts to Editing        |
| 6   | Status visible to admin                         | Submit as guest; on admin overview assert `guest-status-badge-{id}` = "Submitted" and `overview-summary-badge` increments                                  | Given a guest submitted, Then the admin overview shows them as Submitted              |
| 7   | Closed order disables submit/reopen             | Close order; reload guest page; assert `closed-order-banner` shown and no `guest-submit-button`/`guest-reopen-button`. API: `POST /submit` on closed → 409 | Given the order is closed, Then I cannot submit or reopen                             |
