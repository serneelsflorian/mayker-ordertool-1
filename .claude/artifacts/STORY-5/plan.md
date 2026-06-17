# Implementation Plan — STORY-5: Admin exports the consolidated order

## Feature

> As an admin, I want a consolidated export grouped by item with quantities and notes, so I can re-enter the order into Deliveroo quickly.

## Acceptance Criteria

- [ ] AC1: An export action is available to the admin once the order is closed.
- [ ] AC2: The export groups identical items together and shows `quantity x item name` (e.g. `3x Margherita`) rather than a per-person list.
- [ ] AC3: Items are considered identical only when both the item **and** its note match; items with different notes are listed as separate lines with their note shown beneath (e.g. `1x Margherita - no onions`).
- [ ] AC4: The export shows a final total equal to the sum of all members' selections. Items with no price are treated as 0 in the total.
- [ ] AC5: The export is displayed as plain, copy-paste-friendly text with a one-tap copy-all button that copies the entire export to the clipboard.
- [ ] AC6: The export includes the restaurant name as a header so the admin knows which Deliveroo restaurant to order from.

## Plan Overview

Add a read-only **consolidated export** to the admin view. A new backend endpoint
`GET /orders/{order_id}/export` builds the consolidated projection server-side: it
gathers every guest's selections (editing **and** submitted, consistent with the
STORY-4 overview rule that in-progress items still count), merges lines by the fixed
**(menu item + note)** rule, computes a final total (missing price = 0), and renders
a canonical plain-text block with the restaurant name as the header. The frontend
adds an `OrderExportCard` shown only when the order is `closed`, displaying that text
and a one-tap "Copy all" button.

**Why server-side merging (key architectural decision):** the export merge rule is a
_fixed product decision_ in `CLAUDE.md` (line items merge ONLY when item AND note match
exactly). Keeping the merge + total + canonical text on the server makes that rule
authoritative in one place and lets STORY-6 (email the overview) reuse the same
rendered text server-side rather than re-deriving it in the browser. No new DB schema
is needed — the data already exists via guests/selections from STORY-3/4.

## Frontend Plan

- **Components to create/modify:**
  - `frontend/src/components/OrderExportCard.tsx` (new) — fetches the export on demand,
    renders the canonical text in a read-only `<pre>` block, and a "Copy all" button
    with a transient "Copied" confirmation. Only rendered when `order.state === "closed"`.
  - `frontend/src/routes/OrderAdminPage.tsx` (modify) — render `<OrderExportCard orderId={orderId} />`
    after `OrderCloseCard`, only when the order is closed.
  - `frontend/src/lib/clipboard.ts` (new) — small `copyText(text)` helper wrapping
    `navigator.clipboard.writeText` with a try/catch (insecure-context safe), so the
    copy behaviour is not duplicated inline. Used by `OrderExportCard`.
- **Routes:** none added — reuses the existing admin route `/order/:id`.
- **State management:** local `useState` in `OrderExportCard` (export text, loading,
  error, copied) plus a one-shot fetch when the card mounts. No global state, no router
  changes. Consistent with existing card-local patterns (`ShareLinkCard`, `OrderCloseCard`).
- **Design reference notes (REPO_DIR — `docs/prototype`):** the prototype spec
  (`src/imports/pasted_text/food-order-prototype.md`) describes Export as _"enabled only
  when closed: a 'Generate export' action displaying plain, copy-paste-friendly text with
  a one-tap Copy all button. Export starts with the restaurant name as a header, then
  groups identical items as quantity x item name … merge only when both item and note
  match — different notes are separate lines with the note beneath. Ends with a final
  total."_ The card follows the existing shadcn-style `Card` + `Button` primitives and
  the established colour tokens (`--teal`, `--taupe`, `--coral`). Copy confirmation mirrors
  `ShareLinkCard` (Check icon + "Copied", 2s reset). `ShareLinkCard` is left untouched
  (scope containment); its inline copy logic is not refactored as part of this story.

## Backend Plan

- **Endpoints:**
  - `GET /orders/{order_id}/export` → `200 OrderExportRead` — consolidated export for the
    order. Returns `404` when the order does not exist (existing `OrderNotFoundError` →
    global handler). Read-only; no state mutation. Availability "once closed" is enforced
    in the UI (the card only renders when closed); the endpoint itself does not 409 on an
    open order because it is a read-only projection, not a guarded mutation (mutations are
    where STORY-4 enforces closed state). Documented assumption below.
- **Service layer:** `OrderService.get_order_export(order_id)` — loads the order (404 if
  missing), loads all guests with selections via `GuestRepository.list_by_order`, delegates
  the merge/total/text construction to the pure `export_builder` module, and returns the DTO.
- **Repository layer:** no new repository methods. Reuses `OrderRepository.get_by_id` and
  `GuestRepository.list_by_order` (already eager-loads selections + menu_item).
- **Pure builder module (business logic, unit-tested in isolation):**
  `backend/app/services/export_builder.py` —
  - `build_export(restaurant_name, guests) -> OrderExportRead`.
  - Merge key = `(menu_item_id, normalized_note)` where `normalized_note` is the note
    trimmed, or `None` when empty/whitespace. Carries `item_name` for display.
  - Per merged line: summed `quantity`; total = Σ over all selections of
    `quantity × price` with `price=None` treated as `Decimal(0)` (reuses the existing
    `guest_mapping.line_total` / `quantize` helpers — DRY).
  - Deterministic ordering: sort lines by `item_name` (case-insensitive) then `note`
    (`None` first) for stable output and stable tests.
  - Renders `text`: restaurant name header line, a blank line, one entry per line
    (`{qty}x {item_name}`, and when a note exists, the note indented beneath as
    `   - {note}`), a blank line, then `Total: €{total}` (€ + 2 decimals, matching the
    frontend `formatCurrency`).
- **Migrations:** none (no schema change).

## API Integration Plan

No external API integration.

## API Contract

- **Method:** `GET`
- **URL:** `/api/orders/{order_id}/export`
- **Request:** none (path param `order_id: uuid`)
- **Response (`200 OrderExportRead`):**

```json
{
  "restaurant_name": "Trattoria Demo",
  "lines": [
    { "quantity": 3, "item_name": "Margherita", "note": null },
    { "quantity": 1, "item_name": "Margherita", "note": "no onions" },
    { "quantity": 1, "item_name": "Diavola", "note": "extra spicy" }
  ],
  "total": "44.50",
  "text": "Trattoria Demo\n\n3x Margherita\n1x Margherita\n   - no onions\n1x Diavola\n   - extra spicy\n\nTotal: €44.50"
}
```

- **Errors:** `404` `{ "error": { "code": "ORDER_NOT_FOUND", "message": "..." } }` when the order id is unknown (consistent with existing handlers).
- Empty order (no guests / no selections): `lines: []`, `total: "0.00"`, `text` = header + `Total: €0.00`.

## File Manifest

### New files

- `backend/app/schemas/export.py`: `OrderExportLine` (`quantity:int`, `item_name:str`, `note:str|None`) and `OrderExportRead` (`restaurant_name:str`, `lines:list[OrderExportLine]`, `total:str`, `text:str`).
- `backend/app/services/export_builder.py`: pure `build_export(restaurant_name, guests)` — merge rule, total, canonical text rendering.
- `backend/tests/unit/test_export_builder_unit.py`: unit tests for the merge/total/text logic.
- `frontend/src/components/OrderExportCard.tsx`: export display card + copy-all button (rendered only when closed).
- `frontend/src/lib/clipboard.ts`: `copyText(text)` clipboard helper.
- `e2e/tests/STORY-5_export-consolidated-order.spec.ts`: E2E specs (one per AC + edge case).
- `e2e/uat/scenarios/STORY-5_export-consolidated-order.feature`: Gherkin UAT scenarios.
- `e2e/uat/scripts/STORY-5_export-consolidated-order_uat_script.md`: manual UAT script.

### Modified files

- `backend/app/services/order_service.py`: add `get_order_export(order_id)` (load order → 404 if missing → build via `export_builder`).
- `backend/app/api/orders.py`: add `GET /orders/{order_id}/export` route returning `OrderExportRead`.
- `backend/app/schemas/__init__.py`: export the new schemas if the package re-exports (match existing convention).
- `backend/tests/unit/test_order_service_unit.py`: add `get_order_export` cases (happy path delegates to builder, 404 when missing).
- `backend/tests/integration/test_orders_router_integration.py`: add export endpoint tests (200 merged output, 404 missing order).
- `frontend/src/api/types.ts`: add `OrderExportLine` and `OrderExport` interfaces.
- `frontend/src/api/orders.ts`: add `getOrderExport(id): Promise<OrderExport>`.
- `frontend/src/routes/OrderAdminPage.tsx`: render `<OrderExportCard>` when `order.state === "closed"`.
- `e2e/helpers/order.ts`: add `getOrderExport(request, orderId)` helper + `OrderExportData` type for E2E setup.

## Testing Strategy

- **Unit tests** (`backend/tests/unit/`, naming `test_{module}_unit.py`):
  - `test_export_builder_unit.py` — the merge/total/text business logic:
    - Happy path: same item + same note merges (`3x Margherita`); same item + different
      note stays separate with note beneath.
    - Restaurant name appears as the header (AC6).
    - Total sums across all guests; **edge:** item with `None` price counts as 0 (AC4).
    - Edge: empty input → `lines: []`, `total: "0.00"`, text = header + `Total: €0.00`.
    - Edge: note normalization — whitespace-only note treated as no-note (merges with no-note line).
    - Includes both editing and submitted guests' selections.
  - `test_order_service_unit.py` (extend) — `get_order_export` delegates to the builder
    with the loaded guests (happy path) and raises `OrderNotFoundError` when the order is missing.
- **Integration tests** (`backend/tests/integration/`, ENABLED per CLAUDE.md):
  - `test_orders_router_integration.py` (extend) — `GET /orders/{id}/export`:
    happy-path `200` with merged lines + total + restaurant header over real DB-seeded
    guests/selections; `404` for an unknown order id.
- **E2E tests** (`e2e/tests/`, ENABLED per CLAUDE.md), file `STORY-5_export-consolidated-order.spec.ts`:
  one spec per AC (see outline) plus an empty-order edge case. Seed via API helpers; assert
  the export card is absent while open and present once closed, grouped lines, notes beneath,
  total, restaurant header, and clipboard copy.
- **UAT scenarios** (`e2e/uat/scenarios/` + `scripts/`, OPTIONAL per CLAUDE.md — generated for
  parity with prior stories): one Gherkin scenario per AC + an empty-order edge case, plus a
  manual clickthrough script.

## Acceptance Test Outline

| #    | Acceptance Criterion                                            | E2E Strategy                                                                                                                                       | UAT Scenario Sketch                                                                                       |
| ---- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1    | Export action available once closed                             | Open order: assert `order-export-card` has count 0. Close via API, reload: assert card visible.                                                    | Given a closed order, When the admin views it, Then the consolidated export is shown.                     |
| 2    | Groups identical items as `Nx item`                             | Seed two guests each picking 1 Margherita (no note), close, open admin: assert export text contains `2x Margherita` and no per-person names.       | Given two members ordered the same item, Then the export shows it grouped as `2x`.                        |
| 3    | Merge only on item+note; different notes separate, note beneath | Seed Margherita (no note) x2 and Margherita "no onions" x1, close: assert `2x Margherita` and a separate `1x Margherita` with `no onions` beneath. | Given differing notes, Then lines are separate with each note shown beneath.                              |
| 4    | Final total = sum; missing price = 0                            | Seed priced + price-less items, close: assert `Total: €{expected}` equals the summed value, price-less counted as 0.                               | Given mixed priced/price-less items, Then the total sums correctly with €0 for price-less.                |
| 5    | Plain copy-paste text + one-tap copy-all                        | Click `export-copy-button`; assert "Copied" confirmation; (where supported) read clipboard and assert it equals the export text.                   | Given the export, When the admin taps Copy all, Then the whole export is copied and a confirmation shows. |
| 6    | Restaurant name as header                                       | Assert the export text/header contains `Trattoria Demo` as the first line.                                                                         | Given the export, Then the restaurant name heads the list.                                                |
| edge | Empty order                                                     | Close an order with no guest selections: assert card shows restaurant header and `Total: €0.00`.                                                   | Given a closed order with no selections, Then the export shows the header and a €0.00 total.              |

## Documented Assumptions

- **Export endpoint is not state-gated server-side.** "Available once the order is closed"
  (AC1) is enforced in the UI (the card renders only when `state === "closed"`). The
  `GET .../export` endpoint returns the projection regardless of state because it is a
  read-only view, not a guarded mutation; STORY-4's server-side closed enforcement targets
  add/edit/remove/submit. This keeps the read path simple and avoids an error path not
  required by the criteria.
- **Canonical text format** (header line, blank line, `Nx item` with indented `   - note`
  beneath, blank line, `Total: €X.XX`) is chosen to be plain and copy-paste-friendly for
  manual Deliveroo re-entry; per-line prices are intentionally omitted (not required by the
  criteria — only the final total is). The € + 2-decimal total matches the frontend `formatCurrency`.
- **All guests included** (editing + submitted), consistent with the STORY-4 rule that
  in-progress items still count toward the final order.
