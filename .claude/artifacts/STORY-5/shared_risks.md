# Shared Risk Analysis — STORY-5

## Files this feature will create

- `backend/app/schemas/export.py`
- `backend/app/services/export_builder.py`
- `backend/tests/unit/test_export_builder_unit.py`
- `frontend/src/components/OrderExportCard.tsx`
- `frontend/src/lib/clipboard.ts`
- `e2e/tests/STORY-5_export-consolidated-order.spec.ts`
- `e2e/uat/scenarios/STORY-5_export-consolidated-order.feature`
- `e2e/uat/scripts/STORY-5_export-consolidated-order_uat_script.md`

## Existing files this feature will modify

- `backend/app/services/order_service.py`: add `get_order_export(order_id)` method (additive; no change to existing methods).
- `backend/app/api/orders.py`: add `GET /orders/{order_id}/export` route (additive).
- `backend/app/schemas/__init__.py`: re-export new export schemas if the package re-exports (additive).
- `backend/tests/unit/test_order_service_unit.py`: add `get_order_export` test cases (additive).
- `backend/tests/integration/test_orders_router_integration.py`: add export endpoint tests (additive).
- `frontend/src/api/types.ts`: add `OrderExportLine` / `OrderExport` interfaces (additive).
- `frontend/src/api/orders.ts`: add `getOrderExport` function (additive).
- `frontend/src/routes/OrderAdminPage.tsx`: render `OrderExportCard` when closed (additive block; no change to existing cards).
- `e2e/helpers/order.ts`: add `getOrderExport` helper + `OrderExportData` type (additive).

## Potential conflicts with other features in the same wave

- **STORY-7 (Guest submits their order)** runs in the same wave (Wave 5). Per `feature_map.md`,
  STORY-7 extends the guest view (STORY-3) and the admin overview status badges (STORY-4) —
  mostly separate files from STORY-5's export surface. **Possible overlap points to watch:**
  - `frontend/src/routes/OrderAdminPage.tsx` — both may touch the admin page. STORY-5's change
    is an additive card rendered when closed; STORY-7's likely touches overview badges. Low risk
    if edits stay localized; resolve by keeping each card/section self-contained.
  - `e2e/helpers/order.ts` — both may add helpers. Additive functions; conflicts are trivial to merge.
  - `backend/app/api/orders.py` / `order_service.py` — STORY-7 is more likely to touch the
    guest router/service, but if it touches order overview there could be light overlap. Additive
    methods/routes minimize risk.
- No shared database migrations: STORY-5 adds **no** schema changes, so no migration-ordering
  conflict with STORY-7 (which may add a submit migration).

## Downstream dependency

- **STORY-6 (email the order overview)** depends on STORY-5 and is designed to **reuse** the
  server-rendered consolidated export `text`/structure from `export_builder`. Keeping the merge
  rule and canonical text server-side (this plan) is what makes that reuse clean; STORY-6 should
  not re-derive the merge in the frontend.
