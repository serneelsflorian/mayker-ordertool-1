# Shared Risk Analysis — STORY-3

## Files this feature will create

### Backend

- `backend/app/models/guest.py`
- `backend/app/models/guest_selection.py`
- `backend/app/schemas/guest.py`
- `backend/app/repositories/guest_repository.py`
- `backend/app/repositories/guest_selection_repository.py`
- `backend/app/services/guest_service.py`
- `backend/app/api/guests.py`
- `backend/alembic/versions/0002_add_guests_and_selections.py`

### Frontend

- `frontend/src/components/GuestNameForm.tsx`
- `frontend/src/components/GuestOrderPanel.tsx`
- `frontend/src/components/GuestSelectionRow.tsx`
- `frontend/src/components/QuantityStepper.tsx`
- `frontend/src/components/ClosedOrderBanner.tsx`

### Tests

- `backend/tests/unit/test_guest_service_unit.py`
- `backend/tests/integration/test_guest_repository_integration.py`
- `backend/tests/integration/test_guests_router_integration.py`
- `e2e/tests/STORY-3_guest-joins-adds-items.spec.ts`
- `e2e/uat/scenarios/STORY-3_guest-joins-adds-items.feature`
- `e2e/uat/scripts/STORY-3_guest-joins-adds-items_uat_script.md`

## Existing files this feature will modify

- `backend/app/models/__init__.py`: export `Guest`, `GuestSelection`.
- `backend/app/models/order.py`: add `guests` relationship.
- `backend/app/exceptions.py`: add `GuestNotFoundError`, `GuestSelectionNotFoundError`, `OrderClosedError`.
- `backend/app/error_handlers.py`: map the 3 new exceptions in `_STATUS_MAP`.
- `backend/app/api/deps.py`: add `get_guest_service`.
- `backend/app/main.py`: include the guests router.
- `frontend/src/api/types.ts`: add guest types.
- `frontend/src/api/orders.ts`: add guest API functions.
- `frontend/src/routes/GuestOrderPage.tsx`: rebuild into 3 states.
- `frontend/src/components/GuestMenuCard.tsx`: optional `onAddItem`/`addDisabled` props.
- `frontend/src/components/MenuItemList.tsx`, `MenuItemRow.tsx`: optional per-row add control.
- `e2e/helpers/order.ts`: add `joinGuest`/`addSelection` helpers.

## Potential conflicts with other features in the same wave

- **None in Wave 3.** STORY-3 is the only feature in its wave; it runs alone, so
  there is no concurrent contention on these files.

## Cross-wave compatibility notes (downstream features that build on this)

- **STORY-4 (Admin closes order / overview)** will read guest selections and add the
  one-way open→closed lifecycle. STORY-3 already enforces `state == "closed"`
  server-side on guest mutations and ships `OrderClosedError` (409), so STORY-4 only
  needs to flip the state and add the admin-side overview. STORY-4 will likely add a
  `list_by_order` to `GuestRepository` and an admin overview read — non-conflicting
  additions.
- **STORY-7 (Guest submits)** will extend the `guests.status` field (already created
  here defaulting to `"editing"`) with submit/reopen transitions and a submit button.
  STORY-3 deliberately leaves `status` read-only to avoid pre-empting STORY-7.

## Regression risk on existing tests

- `GuestMenuCard` / `MenuItemRow` changes are additive (new optional props with
  current defaults preserved). The STORY-2 E2E (`guest-menu-card`, no
  `menu-item-remove-*`, restaurant name + rows visible in the pre-name state) must
  continue to pass — explicitly verified during build.
- `GET /orders/{order_id}` response shape is unchanged (no guest data leaked),
  protecting STORY-1/STORY-2 router integration tests and AC7.
