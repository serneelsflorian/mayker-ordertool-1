# Shared Risk Analysis — STORY-6

## Files this feature will create

- `backend/app/schemas/email.py`
- `backend/app/services/email_builder.py`
- `backend/app/services/email_sender.py`
- `backend/app/services/email_service.py`
- `backend/app/api/email.py`
- `backend/tests/unit/test_email_builder_unit.py`
- `backend/tests/unit/test_email_service_unit.py`
- `backend/tests/integration/test_email_router_integration.py`
- `frontend/src/components/OrderEmailCard.tsx`
- `e2e/tests/STORY-6_email-order-overview.spec.ts`
- `e2e/uat/scenarios/STORY-6_email-order-overview.feature`
- `e2e/uat/scripts/STORY-6_email-order-overview_uat_script.md`

## Existing files this feature will modify

- `backend/app/config.py`: add SMTP/email settings fields (additive).
- `backend/app/exceptions.py`: add `OrderNotClosedError`, `EmailSendError` (additive).
- `backend/app/error_handlers.py`: add two entries to `_STATUS_MAP` (additive).
- `backend/app/api/deps.py`: add `get_email_service` (additive).
- `backend/app/main.py`: register the email router under `/api` (one new line).
- `backend/pyproject.toml`: add `aiosmtplib`, `email-validator` (additive).
- `docker-compose.yml`: pass optional `SMTP_*` / `EMAIL_FROM` env to `backend` (additive, empty defaults).
- `frontend/src/api/types.ts`: add `SendOrderEmailPayload`, `OrderEmailResult` (additive).
- `frontend/src/api/orders.ts`: add `sendOrderEmail` (additive).
- `frontend/src/lib/validation.ts`: add email helpers (additive).
- `frontend/src/routes/OrderAdminPage.tsx`: render `<OrderEmailCard />` in the existing closed-state block (one block).

## Potential conflicts with other features in the same wave

STORY-6 is the sole feature in **Wave 6** (per `feature_map.md`), and its only dependency (STORY-5) is Done. No other feature is being built concurrently in this wave, so there is no cross-feature file contention.

Cross-wave notes (low risk, all upstream features are Done):

- The changes to `OrderAdminPage.tsx`, `api/orders.ts`, `api/types.ts`, and `validation.ts` are purely additive and extend Story 5's already-merged surface; they do not alter existing exports or the export card.
- The new endpoint is additive and does not touch existing order/guest routes or the `build_export` logic it reuses.
- No database migrations, so no schema contention with any feature.
