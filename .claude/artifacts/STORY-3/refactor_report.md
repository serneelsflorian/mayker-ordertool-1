# Refactor Gate Report — STORY-3

Scope: files created/modified by STORY-3. Self-review (reviewer subagent) found
**no BLOCKING defects**. The findings below are the consolidated MINOR items and
the disposition of each.

| #   | File                                                     | Finding                                                                                                                                   | Category                  | Severity    | Disposition                                                                                                                                                                                                                                                                  |
| --- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | `backend/app/models/order.py:27`                         | `Order.guests` used `lazy="selectin"`, firing an extra query on every order fetch even though guests are never returned by the order read | Excessive work / layering | RECOMMENDED | **Applied** — switched to `lazy="select"` + `passive_deletes=True`; DB FK `ondelete=CASCADE` handles deletes. Full backend suite (82) re-run and green, including the cascade-delete integration test.                                                                       |
| M4  | `backend/tests/conftest.py:93`                           | TRUNCATE table list is hardcoded and must be extended per future story                                                                    | Maintainability           | RECOMMENDED | **Applied** — added a maintenance comment marking the extension point.                                                                                                                                                                                                       |
| M3  | `backend/app/schemas/guest.py:31`                        | `GuestSelectionRead` carries `model_config = {"from_attributes": True}` though it is always built explicitly                              | Dead config               | OPTIONAL    | **Kept** — `OrderRead` and `MenuItemRead` (also built explicitly) both carry it; removing only here would break local convention. Left for codebase-wide consistency.                                                                                                        |
| M2  | `e2e/tests/STORY-3_guest-joins-adds-items.spec.ts` (AC9) | The closed-order E2E case `test.skip`s until the STORY-4 close endpoint exists, leaving AC9 without E2E coverage until then               | Test coverage             | OPTIONAL    | **Kept** — there is no app-API way to close an order before STORY-4, and E2E standards forbid seeding state via direct DB writes. The server-side 409 + read-only behaviour is already covered by integration tests (`TestClosedOrder`). The skip is documented in the spec. |

## Verification

- Backend: `pytest` → 82 passed (41 unit + 41 integration) against a real Postgres 16.
- Frontend: `tsc -b && vite build` → success; `eslint` → clean.
- No observable behaviour change from the applied refactors (API shapes, status
  codes, and DB schema are unchanged).
