# Shared Risk Analysis — STORY-1

STORY-1 is the **scaffold feature** (Wave 1, `depends_on: []`). It creates the entire project skeleton that every later story builds on. Because it runs alone in Wave 1, there are **no concurrent same-wave features** that could touch the same files. The risk surface is instead the **forward contract**: choices made here are consumed by STORY-2…STORY-7.

## Files this feature will create

**Root / infra**
- `docker-compose.yml`
- `.env.example`
- `playwright.config.ts`
- `package.json` (root, Playwright)
- `package-lock.json` (root)

**Backend** (`backend/`)
- `pyproject.toml`, `Dockerfile`, `.dockerignore`
- `alembic.ini`, `alembic/env.py`, `alembic/script.py.mako`, `alembic/versions/0001_initial_order_menu_item.py`
- `app/__init__.py`, `app/main.py`, `app/config.py`, `app/logging_config.py`, `app/database.py`, `app/exceptions.py`, `app/error_handlers.py`, `app/constants.py`
- `app/api/__init__.py`, `app/api/deps.py`, `app/api/orders.py`
- `app/schemas/__init__.py`, `app/schemas/order.py`, `app/schemas/menu_item.py`
- `app/services/__init__.py`, `app/services/order_service.py`
- `app/repositories/__init__.py`, `app/repositories/order_repository.py`, `app/repositories/menu_item_repository.py`
- `app/models/__init__.py`, `app/models/base.py`, `app/models/order.py`, `app/models/menu_item.py`
- `tests/conftest.py`
- `tests/unit/test_order_service_unit.py`
- `tests/integration/test_order_repository_integration.py`, `tests/integration/test_menu_item_repository_integration.py`, `tests/integration/test_orders_router_integration.py`

**Frontend** (`frontend/`)
- `package.json`, `package-lock.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `.eslintrc.cjs`, `index.html`, `Dockerfile`, `nginx.conf`, `.dockerignore`
- `src/main.tsx`, `src/App.tsx`, `src/index.css`
- `src/routes/HomePage.tsx`, `src/routes/OrderAdminPage.tsx`
- `src/components/TopBar.tsx`, `MenuSetupCard.tsx`, `MenuItemForm.tsx`, `MenuItemList.tsx`, `MenuItemRow.tsx`
- `src/components/ui/Button.tsx`, `Input.tsx`, `Label.tsx`, `Card.tsx`, `Badge.tsx`, `Separator.tsx`, `EmptyState.tsx`
- `src/icons/LogoIcon.tsx`
- `src/api/client.ts`, `src/api/orders.ts`, `src/api/types.ts`
- `src/lib/validation.ts`, `src/lib/format.ts`

**E2E / UAT** (`e2e/`)
- `tests/STORY-1_admin-menu-entry.spec.ts`
- `helpers/order.ts`
- `uat/scenarios/.gitkeep`, `uat/scripts/.gitkeep`

## Existing files this feature will modify
- `.gitignore`: add `e2e/uat/screenshots/`, `e2e/uat/reports/`, `dist/`, `node_modules/`, `__pycache__/`, `.pytest_cache/` (only entries not already present).
- `.github/workflows/pr-tests.yml`: **no change expected.** Verify the `detect` job branches match the created layout; touch only if the root e2e `npm ci` needs adjustment (the planned root `package.json` is designed to avoid this).

## Potential conflicts with other features in the same wave
- **None.** STORY-1 is the only feature in Wave 1 (`feature_map.md`). No same-wave feature modifies these files concurrently.

## Forward-contract risks (decisions later stories depend on)
- **Order id is a UUID in the URL (`/order/:id`).** STORY-2 generates the shareable link from this id; the unguessable UUID is chosen here so STORY-2 does not have to re-key the order.
- **`Order.state` column exists with default `"open"`.** Only `"open"` is written in STORY-1; the one-way `open → closed` lifecycle and server-side enforcement are owned by STORY-4. The column is provisioned now to avoid a later breaking migration.
- **Data model is intentionally minimal.** Only `orders` + `menu_items`. Guest, selection, and per-guest status tables are deferred to their owning stories (STORY-3 guests/selections, STORY-7 submit status). No gold-plating of the schema.
- **Price stored as `Numeric(10,2)` nullable, serialized as a JSON string.** Later stories (subtotals in STORY-3, export/email in STORY-5/6) must treat price as nullable and decimal, not float. Flagged so they do not assume a non-null float.
- **API error envelope `{ "error": { "code", "message" } }`.** Established here; all later endpoints should reuse it for consistency.
- **CI root `npm ci` gap.** The existing `e2e-tests` job runs `npm ci` at the repo root, which requires a root `package.json` + `package-lock.json`. This plan creates them. If they are omitted during build, the e2e job will fail at install. Builder must commit the root lockfile.

## Acceptance-vs-prototype divergence (flagged)
- **Price optionality.** The Figma prototype (`docs/prototype/src/app/App.tsx`, `addMenuItem`) makes price **required** (rejects empty or `<= 0`). The STORY-1 acceptance criteria make price **optional** (empty allowed; only a non-numeric or negative *entered* value errors). **The implementation follows the acceptance criteria, not the prototype.** Both backend validation (`MenuItemCreate`) and frontend validation (`lib/validation.ts`) treat price as optional. This is an intentional, documented deviation from the design reference.

## Assumptions recorded
- "On app load with no active order" is satisfied by `HomePage` creating an order via `POST /api/orders` and redirecting to `/order/:id`, keeping order state server-persisted per CLAUDE.md (no localStorage). Assumption: bootstrapping a fresh order on the home route is acceptable for the demo; there is no order-listing/selection UI (out of scope).
- Hardcoded restaurant name is `"Trattoria Demo"` (matching the prototype). Single source on each side: `backend/app/constants.py` and a mirrored frontend constant.
- "Up to 2 decimals" for price is enforced as `^\d+(\.\d{1,2})?$` and `> 0` on the frontend and via a Pydantic decimal-places validator on the backend.
