# Shared Risk Analysis — STORY-4

## Files this feature will create

- `backend/app/services/guest_mapping.py` — shared guest/selection → read mapping helpers (extracted from `guest_service.py`).
- `frontend/src/components/ui/ConfirmDialog.tsx` — generic accessible confirmation dialog primitive.
- `frontend/src/components/GuestStatusBadge.tsx` — per-guest "Editing"/"Submitted" status badge.
- `frontend/src/components/OrderOverviewCard.tsx` — admin overview card grouped by guest with "X of N submitted" summary.
- `frontend/src/components/OrderCloseCard.tsx` — close-order action + closed indicator.
- `e2e/tests/STORY-4_admin-closes-order.spec.ts` — E2E spec.
- `e2e/uat/scenarios/STORY-4_admin-closes-order.feature` — Gherkin UAT scenarios.
- `e2e/uat/scripts/STORY-4_admin-closes-order_uat_script.md` — manual UAT script.
- `.claude/artifacts/STORY-4/plan.md`, `.claude/artifacts/STORY-4/shared_risks.md` — plan artifacts.

## Existing files this feature will modify

- `backend/app/schemas/order.py` — add `OrderOverviewRead` (reuses `GuestRead` from `app.schemas.guest`). `OrderRead` unchanged.
- `backend/app/repositories/guest_repository.py` — add `list_by_order(order_id)` (selectinload selections→menu_item, deterministic order). No change to existing methods.
- `backend/app/services/order_service.py` — add `close_order` and `get_order_overview`; import shared mappers from `guest_mapping.py`.
- `backend/app/services/guest_service.py` — replace local mapping helpers with imports from `guest_mapping.py` (behaviour-preserving; no logic change).
- `backend/app/api/orders.py` — add `POST /{order_id}/close` and `GET /{order_id}/overview` routes.
- `frontend/src/api/types.ts` — add `OrderOverview` interface (reuses existing `Guest`/`GuestSelection`/`GuestStatus`).
- `frontend/src/api/orders.ts` — add `closeOrder` and `getOrderOverview`.
- `frontend/src/routes/OrderAdminPage.tsx` — fetch overview, wire close, render new cards.
- `e2e/helpers/order.ts` — add `closeTestOrder`, `getOrderOverview`, and `OrderOverviewData` type.
- `backend/tests/unit/test_order_service_unit.py` — add `close_order` / `get_order_overview` cases.
- `backend/tests/integration/test_orders_router_integration.py` — add close + overview router cases.
- `backend/tests/integration/test_guest_repository_integration.py` — add `list_by_order` cases.

## Potential conflicts with other features in the same / adjacent waves

STORY-4 is the sole feature in Wave 4. Its downstream consumers are STORY-5 (export) and STORY-7 (guest submits), both in Wave 5 and both depending on STORY-4.

- **STORY-7 (guest submits) — HIGHEST overlap.** STORY-7 will extend the per-guest status surface that STORY-4 creates: it adds the submit/reopen transitions that flip `Guest.status` between "editing" and "submitted", and will likely touch `GuestStatusBadge.tsx` and the overview's `submitted_count` semantics, plus `guest_service.py` and the guest router/view.
  - Mitigation: keep `GuestStatusBadge` purely presentational and driven only by `status` (no submit logic baked in) so STORY-7 can reuse it unchanged.
  - Mitigation: keep the `GET /api/orders/{id}/overview` endpoint and `OrderOverviewRead` schema stable and well-named. STORY-7 should be able to extend it additively (e.g. richer per-guest fields) without renaming or reshaping existing fields. `submitted_count`/`guest_count` are computed from `Guest.status` and must remain the contract.
  - Mitigation: STORY-4 only READS `Guest.status`; it adds no status-mutating endpoint, leaving that surface entirely to STORY-7 to avoid collision.
  - File-level: STORY-7 and STORY-4 both touch `guest_service.py`, `frontend/src/api/types.ts`, and `frontend/src/api/orders.ts`. STORY-4 lands first; STORY-7 builds on the committed STORY-4 state. Additive changes minimize merge friction.

- **STORY-5 (export consolidated order) — consumes the closed order.** STORY-5 renders export only when the order is closed and consumes the same grouped-guest data.
  - Mitigation: the `OrderOverviewRead` schema (guests + grouped selections + subtotals) is a stable, reusable read surface STORY-5 can build the export on. Do not couple it to UI specifics; keep it a clean data contract.
  - File-level: STORY-5 will add to `OrderAdminPage.tsx`, `backend/app/api/orders.py`, `frontend/src/api/orders.ts`, and `frontend/src/api/types.ts` (export endpoint/types). These are the same files STORY-4 touches; changes are additive (new endpoint, new card). The prototype's export/email "Order actions" sub-section is intentionally NOT built in STORY-4, leaving that region free for STORY-5/STORY-6.

- **Shared mapping extraction (`guest_mapping.py`).** Moving the mapping helpers out of `guest_service.py` is a behaviour-preserving refactor that benefits STORY-5/STORY-7 (both need guest read mapping). Risk is low but it touches `guest_service.py`; the existing `test_guest_service_unit.py` guards against regressions. If STORY-7 is developed in parallel on a branch that also edits `guest_service.py`, expect a small merge around the import block — keep the extraction minimal and the helper signatures identical to what `guest_service.py` exported.
