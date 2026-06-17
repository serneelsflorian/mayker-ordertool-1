# Shared Risk Analysis — STORY-7

## Files this feature will create

- `frontend/src/components/GuestSubmitBar.tsx`
- `e2e/tests/STORY-7_guest-submits-order.spec.ts`
- (optional) `e2e/uat/scenarios/STORY-7_guest-submits-order.feature`
- (optional) `e2e/uat/scripts/STORY-7_guest-submits-order_uat_script.md`

## Existing files this feature will modify

- `backend/app/constants.py`: add `GUEST_STATUS_EDITING` / `GUEST_STATUS_SUBMITTED`.
- `backend/app/services/guest_service.py`: add `submit_guest`/`reopen_guest`; add
  auto-revert to status on `add_selection`/`update_selection`/`remove_selection`.
- `backend/app/api/guests.py`: add `POST .../submit` and `POST .../reopen` routes.
- `backend/tests/unit/test_guest_service_unit.py`: add submit/reopen/auto-revert cases.
- `backend/tests/integration/test_guests_router_integration.py`: add router cases.
- `frontend/src/api/orders.ts`: add `submitGuestOrder` / `reopenGuestOrder`.
- `frontend/src/components/GuestOrderPanel.tsx`: render `GuestSubmitBar`, new props.
- `frontend/src/routes/GuestOrderPage.tsx`: add submit/reopen handlers.

## Potential conflicts with other features in the same wave

STORY-7 shares Wave 5 with **STORY-5** (export consolidated order). Per `feature_map.md`,
overlap is expected to be low.

- **`backend/app/services/guest_service.py`** — STORY-7 modifies this. STORY-5 (export)
  is expected to live in the order/export service path, not `guest_service`, so direct
  conflict is unlikely. If STORY-5 also touches selection mapping, coordinate on
  `guest_mapping.py` (STORY-7 does **not** modify it).
- **`backend/app/api/guests.py`** — STORY-7 adds two routes here; STORY-5 is order-scoped
  (`/orders/{id}/export` or similar) and should not touch this file.
- **`frontend/src/routes/GuestOrderPage.tsx` / `GuestOrderPanel.tsx`** — guest-side only;
  STORY-5 is admin-side, so no overlap expected.
- **`e2e/helpers/order.ts`** — both stories may want helpers here. STORY-7 reuses the
  existing helpers and avoids adding new ones to minimise merge surface. If a `submit`
  helper is added, keep it additive (append, do not reorder existing exports).
- **No migration** is introduced by STORY-7, so there is zero risk of a migration-ordering
  conflict with STORY-5.
