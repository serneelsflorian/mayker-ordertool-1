# Implementation Plan — STORY-1: Admin starts a group order and enters the menu

## Feature
> As an admin, I want to start a group order for the preselected restaurant and enter its menu items, so the team has an accurate list to order from.
>
> **Acceptance criteria:**
> - On app load with no active order, the admin sees the preselected restaurant name displayed (hardcoded, not editable) and an empty menu-entry form.
> - The admin can add a menu item by entering a name (required, text); price is optional (when provided, must be a positive number with up to 2 decimals); category is an optional text field.
> - Attempting to add an item with an empty name shows an inline error and does not add the item. A price left empty is allowed; only a non-numeric or negative price (when something is entered) shows an inline error and blocks adding.
> - Each added item appears immediately in a list below the form, showing name, price if provided, and category if provided.
> - The admin can remove any item from the list before sharing; removal updates the list immediately.
> - The admin cannot proceed to generate a link until at least one valid menu item exists; the generate-link action is disabled until then.

Source: ClickUp task `86ca9md8h` (https://app.clickup.com/t/86ca9md8h).

## Acceptance Criteria
- [ ] AC1: On app load with no active order, the admin sees the preselected restaurant name (hardcoded, not editable) and an empty menu-entry form.
- [ ] AC2: Admin can add a menu item by entering name (required, text); price optional (when provided, positive number, up to 2 decimals); category optional text.
- [ ] AC3: Empty name shows an inline error and does not add. Empty price is allowed; only a non-numeric or negative price (when something is entered) shows an inline error and blocks adding.
- [ ] AC4: Each added item appears immediately in a list below the form, showing name, price if provided, and category if provided.
- [ ] AC5: Admin can remove any item from the list before sharing; removal updates the list immediately.
- [ ] AC6: The generate-link action is disabled until at least one valid menu item exists; enabled once ≥1 item exists. (STORY-1 renders only the disabled/enabled affordance — actual link generation is STORY-2.)

## Plan Overview

STORY-1 is the **scaffold feature**: it stands up the entire monorepo (backend, frontend, e2e, Docker Compose, Postgres, test infra) and then implements the admin menu-entry flow on top of it.

Per CLAUDE.md Architecture Notes, order state is **server-persisted in Postgres**, not in browser storage. Therefore STORY-1 does not keep the menu in React state alone: on app load the frontend creates (or loads) an order for the hardcoded restaurant via the FastAPI backend, and every add/remove of a menu item is persisted through the backend. This gives STORY-2 a real, persisted order to produce a shareable link to.

Layers built:
- **Backend** (FastAPI, async SQLAlchemy 2.x, Pydantic v2, Postgres 16): Router → Service → Repository, with `Order` and `MenuItem` ORM models, Alembic migration, Pydantic settings, custom exceptions + global handlers, structured logging.
- **Frontend** (React + TS + Vite + Tailwind + React Router): a home/admin route and an `/order/:id` route, a typed `api/` client, reusable UI atoms (reimplemented from the prototype, not copied), and the menu-setup admin screen with inline validation and the disabled-until-valid generate affordance.
- **Tests**: pytest unit + integration (real Postgres fixture, async httpx client, Alembic migration runner), Playwright E2E. UAT generation is OPTIONAL and is included as a stretch artifact only.

Scope discipline: this plan implements menu entry plus the persisted order/menu and the disabled/enabled generate affordance. It does **not** implement link generation (STORY-2), guest views (STORY-3), closing (STORY-4), export (STORY-5), email (STORY-6) or guest submit (STORY-7). The data model includes only what STORY-1 needs (`Order` with hardcoded restaurant + `MenuItem`); guest/selection tables are intentionally deferred to their owning stories.

## Infrastructure Scaffolding (scaffold feature only)

The following infrastructure will be created alongside the feature.

### Project Structure
```
backend/                  FastAPI app + tests
  app/
    __init__.py
    main.py               app factory, router registration, exception handlers
    config.py             Pydantic settings (DATABASE_URL, etc.)
    logging_config.py     structured logging setup
    database.py           async engine, async_sessionmaker, get_session dependency
    exceptions.py         AppException base + domain exceptions
    error_handlers.py     global exception handlers -> JSON error envelope
    api/
      __init__.py
      deps.py             DI wiring (session -> repo -> service)
      orders.py           order + menu-item routers
    schemas/
      __init__.py
      order.py            OrderRead, RestaurantRead
      menu_item.py        MenuItemCreate, MenuItemRead
    services/
      __init__.py
      order_service.py    business logic: create/get order, add/remove menu item, validation
    repositories/
      __init__.py
      order_repository.py     Order persistence
      menu_item_repository.py MenuItem persistence
    models/
      __init__.py
      base.py             DeclarativeBase
      order.py            Order ORM model
      menu_item.py        MenuItem ORM model
    constants.py          RESTAURANT_NAME hardcoded constant
  alembic/
    env.py
    script.py.mako
    versions/0001_initial_order_menu_item.py
  alembic.ini
  tests/
    conftest.py           Postgres container fixture, async httpx client, migration runner
    unit/
      test_order_service_unit.py
    integration/
      test_order_repository_integration.py
      test_menu_item_repository_integration.py
      test_orders_router_integration.py
  pyproject.toml          deps + [dev] extras + pytest/asyncio config
  Dockerfile
  .dockerignore

frontend/                 Vite + React + TS + Tailwind + React Router
  src/
    main.tsx              React Router provider + routes
    App.tsx               layout shell (TopBar + routed content)
    index.css             Tailwind directives + brand CSS vars
    routes/
      HomePage.tsx        bootstraps an order, redirects to /order/:id
      OrderAdminPage.tsx  admin menu-setup screen for an existing order
    components/
      TopBar.tsx          sticky bar: restaurant name + "Group order · Open"
      MenuSetupCard.tsx   form row + inline errors + item list (organism)
      MenuItemForm.tsx    name/price/category inputs + Add button + validation
      MenuItemList.tsx    list of added items + empty state
      MenuItemRow.tsx     single item row (name, category Badge, price, remove)
      ui/                 reimplemented atoms
        Button.tsx
        Input.tsx
        Label.tsx
        Card.tsx
        Badge.tsx
        Separator.tsx
        EmptyState.tsx
    icons/
      LogoIcon.tsx        domain logo mark (bag glyph), reimplemented
    api/
      client.ts           base fetch wrapper (baseURL, JSON, error mapping)
      orders.ts           typed order + menu-item API functions
      types.ts            Order, MenuItem, request/response types
    lib/
      validation.ts       parseMenuItemInput: name/price/category validation
      format.ts           formatCurrency -> €X.XX
  index.html
  package.json
  package-lock.json       (generated by npm install during build)
  tsconfig.json
  tsconfig.node.json
  vite.config.ts
  tailwind.config.ts
  postcss.config.js
  .eslintrc.cjs
  Dockerfile
  nginx.conf              serve built SPA, proxy /api -> backend (compose)
  .dockerignore

e2e/                      Playwright + UAT
  tests/
    STORY-1_admin-menu-entry.spec.ts
  helpers/
    order.ts              seed/bootstrap helpers via API
  uat/
    scenarios/            (OPTIONAL toggle)
    scripts/
    screenshots/          (gitignored)
    reports/              (gitignored)

playwright.config.ts      root, baseURL http://localhost:5173
docker-compose.yml        root, wires frontend + backend + postgres:16
.env.example              root, required env vars
```

### Docker Setup
- **`backend/Dockerfile`**: `python:3.12-slim`, install from `pyproject.toml`, run Alembic migrations on start then `uvicorn app.main:app`.
- **`frontend/Dockerfile`**: multi-stage — Node 20 build (`npm ci && npm run build`), then `nginx:alpine` serving `dist/` with `nginx.conf` proxying `/api` to the backend service.
- **`docker-compose.yml`** services:
  - `postgres` — `postgres:16`, env `POSTGRES_USER/PASSWORD/DB`, healthcheck `pg_isready`, named volume.
  - `backend` — build `./backend`, depends_on postgres (healthy), `DATABASE_URL=postgresql+asyncpg://...@postgres:5432/ordertool`, exposes 8000.
  - `frontend` — build `./frontend`, depends_on backend, exposes **5173** (mapped to the nginx container port) to match the Playwright base URL.
- **`.env.example`**: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `DATABASE_URL`, `BACKEND_PORT`, `FRONTEND_PORT`, `VITE_API_BASE_URL`. No secrets committed.

### Test Infrastructure
- **Shared test config: `backend/tests/conftest.py`** — module-scoped real Postgres instance fixture (via `testcontainers[postgresql]`, falling back to `DATABASE_URL` from env so CI's `services.postgres` is reused), an Alembic **migration runner** fixture that upgrades to head against the test DB, a session-scoped async httpx `AsyncClient` bound to the ASGI app, and per-test transaction rollback isolation.
- **Test directories / naming** (from CLAUDE.md Test Configuration):
  - Unit: `backend/tests/unit/`, `test_{module}_unit.py`.
  - Integration: `backend/tests/integration/`, `test_{module}_integration.py`.
- **E2E framework config: `playwright.config.ts`** at project root, `baseURL: http://localhost:5173`, screenshot on failure, retries off locally / 1 in CI, HTML reporter. Test dir `e2e/tests/`, helpers `e2e/helpers/`, file naming `{feature_id}_{slug}.spec.ts`.
- **UAT directory structure** (from CLAUDE.md): `e2e/uat/scenarios/`, `e2e/uat/scripts/`, `e2e/uat/screenshots/` (gitignored), `e2e/uat/reports/` (gitignored). UAT Generation is **OPTIONAL** per CLAUDE.md, so UAT artifacts are a stretch deliverable; the directory skeleton is created but population is not required to satisfy STORY-1.

### CI Pipeline Configuration
The CI files were generated by `/init-project` and already guard on infrastructure presence. Verify against this scaffold:
- `.github/workflows/pr-tests.yml` `detect` job expects: `backend/` + `backend/tests/` (this plan creates `backend/tests/unit` and `.../integration`), `frontend/package.json` (created), `docker-compose.yml` + `e2e/tests/` (created). **No change needed** — the scaffold satisfies all three detection branches.
- The `backend-tests` job runs `pytest tests/unit` then `pytest tests/integration` with `DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/ordertool_test`. The `conftest.py` must honor the `DATABASE_URL` env var so it uses the CI `services.postgres` rather than spinning a container. **Build step requirement, not a CI edit.**
- The `frontend-tests` job runs `npm ci`, `npm run lint --if-present`, `npm run build --if-present`. Ensure `package.json` defines `lint` and `build` scripts and that `package-lock.json` is committed (so `npm ci` works).
- The `e2e-tests` job runs `docker compose up -d --build`, then `npm ci` + `npx playwright install` + `npx playwright test` **at the repo root**. Requires a **root** `package.json` with Playwright as a devDependency and a root `package-lock.json`. **Action item for the builder:** add a minimal root `package.json` (Playwright + `@playwright/test`) and root `package-lock.json` so the e2e job's root `npm ci` resolves; this is the one gap between the existing CI and the planned layout. Note it in the PR.
- `auto-done.yml` (merge → Done) needs no change for STORY-1.

## Frontend Plan

- **Components to create:**
  - `frontend/src/App.tsx` — layout shell rendering `TopBar` and the routed outlet, `bg-soft` background, centered `max-w-5xl` main.
  - `frontend/src/components/TopBar.tsx` — sticky white top bar: logo mark + hardcoded restaurant name + `Group order · Open` status (teal "Open"). Reimplemented; no role switcher (admin/guest toggle is out of scope for STORY-1).
  - `frontend/src/components/MenuSetupCard.tsx` — "Menu setup" card; header shows `Restaurant: {RESTAURANT_NAME}`; composes `MenuItemForm` + separator + `MenuItemList`; renders the disabled-until-valid generate affordance.
  - `frontend/src/components/MenuItemForm.tsx` — responsive form row (`sm:grid-cols-[2fr_1fr_1fr_auto]`): name (2fr), price (1fr), category (1fr), Add button; inline coral errors under name/price; clears inputs on success.
  - `frontend/src/components/MenuItemList.tsx` — list of added items with empty state (`No menu items yet. Add your first item above.`).
  - `frontend/src/components/MenuItemRow.tsx` — name + optional category Badge + optional price (`€X.XX`) + ghost trash-icon remove button.
  - `frontend/src/components/ui/*` — reimplemented atoms: `Button`, `Input`, `Label`, `Card`, `Badge`, `Separator`, `EmptyState`.
  - `frontend/src/icons/LogoIcon.tsx` — domain logo mark; lucide-react supplies generic UI icons (`Plus`, `Trash2`).
- **Routes** (React Router):
  - `/` (`HomePage`) — on mount, bootstraps an order for the hardcoded restaurant via the API (`POST /api/orders`), then redirects to `/order/:id`. Satisfies "On app load with no active order" by creating the order then routing to it.
  - `/order/:id` (`OrderAdminPage`) — loads the order + its menu items via `GET /api/orders/:id`; renders `MenuSetupCard`. This is the URL-keyed, server-persisted surface the architecture mandates and that STORY-2 will share.
- **State management:** Native React hooks only (per coding standards 3.3 — Context/native APIs first, no Redux). A custom hook `useOrder(orderId)` in `OrderAdminPage` holds `{ order, menuItems, loading, error }` and exposes `addItem` / `removeItem` that call the API and update local state from the server response. The menu list is **server-sourced**, not local-only.
- **Validation** (`frontend/src/lib/validation.ts`): client-side mirror of server rules for instant inline errors — name required (trimmed non-empty); price optional, but if a non-empty value is entered it must parse to a positive number with ≤ 2 decimals (regex `^\d+(\.\d{1,2})?$` and `> 0`); category optional free text. Server remains the source of truth and re-validates.
- **Currency:** `formatCurrency` in `frontend/src/lib/format.ts` → `€X.XX`. Price hidden in the row when not provided.
- **Test attributes** (coding standards 3.6): `data-testid` on `menu-item-name-input`, `menu-item-price-input`, `menu-item-category-input`, `menu-item-add-button`, `menu-item-name-error`, `menu-item-price-error`, `menu-item-list`, `menu-item-row-{id}`, `menu-item-remove-{id}`, `generate-link-button`, `topbar-restaurant-name`.
- **Design reference notes:** Reimplement from `docs/prototype/src/app/App.tsx` per the Rewrite Rule — extract layout, spacing, the brand palette (teal `#269A91`/`#1f857d`, coral `#D44858`/`#b93b48`, bluegrey `#9ABFCB`, taupe `#A39286`, bg-soft `#F6F4F1`), `€X.XX` formatting, and component hierarchy of the "Menu setup" card. Define tokens in `tailwind.config.ts` (and CSS vars in `index.css`). Do **not** copy the prototype's shadcn/Radix/sonner deps or its single-file structure. Hardcoded restaurant name lives in a single frontend constant mirroring the backend `RESTAURANT_NAME`.
  - **Design-vs-AC divergence (must follow AC):** the prototype makes **price required** (`addMenuItem` rejects empty/`<= 0` price). Our AC makes **price optional** — empty price is valid; only a non-numeric or negative entered price errors. Follow the AC, not the prototype. Flagged in shared_risks.md.

## Backend Plan

- **Endpoints** (STORY-1 only — exactly four, no more):
  | Method | Path | Purpose |
  | --- | --- | --- |
  | POST | `/api/orders` | Create a new open order for the hardcoded restaurant. Returns the order (id + restaurant). |
  | GET | `/api/orders/{order_id}` | Fetch an order with its menu items (rehydrate on refresh / cross-session). |
  | POST | `/api/orders/{order_id}/menu-items` | Add a menu item (name required; price optional; category optional). Returns the created item. |
  | DELETE | `/api/orders/{order_id}/menu-items/{item_id}` | Remove a menu item. Returns 204. |
- **Service layer (`order_service.py`):** business logic and transactional boundaries (per coding standards 2.2). `create_order()` instantiates an `Order` with the hardcoded `RESTAURANT_NAME` and `state="open"`. `get_order(order_id)` loads order + items or raises `OrderNotFoundError`. `add_menu_item(order_id, data)` validates name non-empty and price (if provided) positive with ≤ 2 decimals, raises `ValidationError` otherwise, persists, returns the item. `remove_menu_item(order_id, item_id)` deletes or raises `MenuItemNotFoundError`. Transaction committed per service call.
- **Repository layer:** `order_repository.py` (insert order, get order with eager-loaded items) and `menu_item_repository.py` (insert item, delete item by id+order, list by order). All DB access isolated here; no queries in routers/services beyond repo calls.
- **Schemas (Pydantic v2 DTOs):** `MenuItemCreate { name: str (min_length 1 after strip); price: Optional[Decimal] (gt 0, ≤ 2 decimal places); category: Optional[str] }`, `MenuItemRead`, `OrderRead { id, restaurant_name, state, menu_items: list[MenuItemRead] }`. Validation via Pydantic field validators (price decimals checked with `Decimal.quantize`/`exponent` guard).
- **Models (domain / ORM):**
  - `Order` — `id: UUID (pk, default uuid4)`, `restaurant_name: str`, `state: str` (default `"open"`; lifecycle enforcement is STORY-4, only `"open"` is written here), `created_at: timestamptz`. UUID id so STORY-2's share URL is unguessable.
  - `MenuItem` — `id: UUID (pk)`, `order_id: UUID (fk -> orders.id, on delete cascade, indexed)`, `name: str`, `price: Numeric(10,2) nullable`, `category: str nullable`, `created_at: timestamptz`.
- **Migrations:** Alembic `versions/0001_initial_order_menu_item.py` creates `orders` and `menu_items` with the FK + index. Run on container start and by the test migration runner.
- **Errors & logging:** `AppException` base in `exceptions.py`; `OrderNotFoundError` → 404, `MenuItemNotFoundError` → 404, `ValidationError` → 422. Global handlers in `error_handlers.py` return a consistent JSON envelope `{ "error": { "code", "message" } }`. Structured logging via stdlib `logging` (`logging_config.py`); no `print()`.
- **Restaurant:** hardcoded in `backend/app/constants.py` (`RESTAURANT_NAME = "Trattoria Demo"`); no restaurant CRUD endpoints.

## API Integration Plan
No external API integration. (Email/Deliveroo are later stories; STORY-1 talks only to the project's own FastAPI backend.)

## API Contract

All paths are prefixed `/api`. Content type `application/json`. The frontend `api/client.ts` wraps fetch with the base URL (`VITE_API_BASE_URL`, default `/api` behind the nginx proxy), JSON parsing, and error mapping. `api/orders.ts` exposes `createOrder()`, `getOrder(id)`, `addMenuItem(orderId, payload)`, `removeMenuItem(orderId, itemId)`, typed via `api/types.ts`.

### 1. Create order
- **Method:** POST
- **URL:** `/api/orders`
- **Request:** *(no body)*
- **Response 201:**
```json
{
  "id": "9f1c2e6a-3b7d-4a21-9d54-5f6e7a8b9c0d",
  "restaurant_name": "Trattoria Demo",
  "state": "open",
  "menu_items": []
}
```

### 2. Get order
- **Method:** GET
- **URL:** `/api/orders/{order_id}`
- **Response 200:**
```json
{
  "id": "9f1c2e6a-3b7d-4a21-9d54-5f6e7a8b9c0d",
  "restaurant_name": "Trattoria Demo",
  "state": "open",
  "menu_items": [
    { "id": "1a2b...", "name": "Margherita", "price": "9.50", "category": "Pizza" },
    { "id": "3c4d...", "name": "Garlic Bread", "price": null, "category": null }
  ]
}
```
- **Response 404:** `{ "error": { "code": "ORDER_NOT_FOUND", "message": "Order not found" } }`

### 3. Add menu item
- **Method:** POST
- **URL:** `/api/orders/{order_id}/menu-items`
- **Request (price + category optional; either may be omitted or null):**
```json
{ "name": "Margherita", "price": "9.50", "category": "Pizza" }
```
- **Response 201:**
```json
{ "id": "1a2b3c4d-...", "name": "Margherita", "price": "9.50", "category": "Pizza" }
```
- **Response 422 (empty name):** `{ "error": { "code": "VALIDATION_ERROR", "message": "Name is required" } }`
- **Response 422 (bad price):** `{ "error": { "code": "VALIDATION_ERROR", "message": "Price must be a positive number with up to 2 decimals" } }`
- **Response 404:** order not found.

> Price is serialized as a JSON **string** (e.g. `"9.50"`) to preserve 2-decimal precision and avoid float drift; `null` when not provided. The frontend formats it with `formatCurrency`.

### 4. Remove menu item
- **Method:** DELETE
- **URL:** `/api/orders/{order_id}/menu-items/{item_id}`
- **Response 204:** *(no body)*
- **Response 404:** `{ "error": { "code": "MENU_ITEM_NOT_FOUND", "message": "Menu item not found" } }`

> The "generate link" affordance (AC6) is a **frontend-only** disabled/enabled state derived from `menu_items.length >= 1`. No endpoint is added for it in STORY-1 — that endpoint belongs to STORY-2.

## File Manifest

### New files

**Root / infra**
- `docker-compose.yml`: wire frontend + backend + postgres:16.
- `.env.example`: required env vars (no secrets).
- `playwright.config.ts`: Playwright config, baseURL http://localhost:5173.
- `package.json`: root, Playwright devDependency for the e2e CI job's root `npm ci`.
- `package-lock.json`: root lockfile (generated) so `npm ci` resolves.
- `.gitignore`: append `e2e/uat/screenshots/`, `e2e/uat/reports/`, `dist/`, `node_modules/`, `__pycache__/`, `.pytest_cache/` if not present.

**Backend**
- `backend/pyproject.toml`: deps (fastapi, uvicorn, sqlalchemy[asyncio], asyncpg, pydantic, pydantic-settings, alembic) + `[dev]` (pytest, pytest-asyncio, httpx, testcontainers).
- `backend/Dockerfile`, `backend/.dockerignore`.
- `backend/alembic.ini`, `backend/alembic/env.py`, `backend/alembic/script.py.mako`, `backend/alembic/versions/0001_initial_order_menu_item.py`.
- `backend/app/__init__.py`, `main.py`, `config.py`, `logging_config.py`, `database.py`, `exceptions.py`, `error_handlers.py`, `constants.py`.
- `backend/app/api/__init__.py`, `deps.py`, `orders.py`.
- `backend/app/schemas/__init__.py`, `order.py`, `menu_item.py`.
- `backend/app/services/__init__.py`, `order_service.py`.
- `backend/app/repositories/__init__.py`, `order_repository.py`, `menu_item_repository.py`.
- `backend/app/models/__init__.py`, `base.py`, `order.py`, `menu_item.py`.
- `backend/tests/conftest.py`: Postgres fixture, async httpx client, Alembic migration runner, rollback isolation.
- `backend/tests/unit/test_order_service_unit.py`.
- `backend/tests/integration/test_order_repository_integration.py`, `test_menu_item_repository_integration.py`, `test_orders_router_integration.py`.

**Frontend**
- `frontend/package.json`, `frontend/package-lock.json`, `frontend/tsconfig.json`, `frontend/tsconfig.node.json`, `frontend/vite.config.ts`, `frontend/tailwind.config.ts`, `frontend/postcss.config.js`, `frontend/.eslintrc.cjs`, `frontend/index.html`, `frontend/Dockerfile`, `frontend/nginx.conf`, `frontend/.dockerignore`.
- `frontend/src/main.tsx`, `App.tsx`, `index.css`.
- `frontend/src/routes/HomePage.tsx`, `OrderAdminPage.tsx`.
- `frontend/src/components/TopBar.tsx`, `MenuSetupCard.tsx`, `MenuItemForm.tsx`, `MenuItemList.tsx`, `MenuItemRow.tsx`.
- `frontend/src/components/ui/Button.tsx`, `Input.tsx`, `Label.tsx`, `Card.tsx`, `Badge.tsx`, `Separator.tsx`, `EmptyState.tsx`.
- `frontend/src/icons/LogoIcon.tsx`.
- `frontend/src/api/client.ts`, `orders.ts`, `types.ts`.
- `frontend/src/lib/validation.ts`, `format.ts`.

**E2E / UAT**
- `e2e/tests/STORY-1_admin-menu-entry.spec.ts`.
- `e2e/helpers/order.ts`.
- `e2e/uat/scenarios/.gitkeep`, `e2e/uat/scripts/.gitkeep` (UAT OPTIONAL — directory skeleton only).

### Modified files
- `.gitignore`: add UAT screenshots/reports + standard build/test ignores (only if entries are missing).
- `.github/workflows/pr-tests.yml`: **no change expected.** Re-verify the `detect` branches match the layout above; only touch it if the e2e job needs a `working-directory` adjustment for root `npm ci` (default is repo root, which is correct given the planned root `package.json`).

## Testing Strategy

- **Unit tests** — service-layer business logic (`order_service`): validation and order/menu operations with the repository mocked.
  - Cases: `add_menu_item` happy path (name only, price optional) / edge (price with exactly 2 decimals, empty category) / error (empty name → ValidationError, negative price → ValidationError, price with 3 decimals → ValidationError); `create_order` sets hardcoded restaurant + `state="open"`; `get_order` missing → OrderNotFoundError; `remove_menu_item` missing → MenuItemNotFoundError.
  - Directory: `backend/tests/unit/`. Naming: `test_{module}_unit.py` (e.g. `test_order_service_unit.py`).
- **Integration tests** — ENABLED per CLAUDE.md. Repository round-trips against real Postgres and router cycle through the ASGI app.
  - Repository: insert+retrieve order with eager-loaded items; insert menu item with null price/category; delete item; cascade delete on order; empty-result query.
  - Router: `POST /api/orders` → 201; `GET /api/orders/{id}` → 200 and 404; `POST .../menu-items` → 201 (with and without price), 422 (empty name), 422 (negative price); `DELETE .../menu-items/{id}` → 204 and 404.
  - Directory: `backend/tests/integration/`. Naming: `test_{module}_integration.py`.
- **E2E tests** — ENABLED per CLAUDE.md. Drive the real UI against the composed stack.
  - Verify: restaurant name visible + empty form on load; add item (name only) appears in list; add item with name+price+category shows price (`€X.XX`) and category badge; empty-name shows inline error and no row added; negative/non-numeric price shows inline error and blocks; remove item updates list immediately; generate-link button disabled with 0 items, enabled with ≥1.
  - Directory: `e2e/tests/`. File: `STORY-1_admin-menu-entry.spec.ts` (`{feature_id}_{slug}.spec.ts`). Seed/bootstrap via API in `e2e/helpers/order.ts`. Locators prefer `data-testid`.
- **UAT scenarios** — OPTIONAL per CLAUDE.md, so **not required** for STORY-1. Directory skeleton created (`e2e/uat/scenarios/`, `.../scripts/`); if generated later, one Gherkin scenario per AC plus one edge-case scenario (e.g. invalid price), naming `STORY-1_admin-menu-entry.feature` and `STORY-1_admin-menu-entry_uat_script.md`.

## Acceptance Test Outline
| # | Acceptance Criterion | E2E Strategy | UAT Scenario Sketch |
|---|---|---|---|
| 1 | Restaurant name shown (hardcoded) + empty menu form on load | Load `/`, follow redirect to `/order/:id`; assert `topbar-restaurant-name` = "Trattoria Demo", `menu-item-list` shows empty state, inputs are empty | Given a fresh app, When the admin opens it, Then the hardcoded restaurant name and an empty menu form are shown |
| 2 | Add item; name required, price optional (≤2dp positive), category optional | Fill name only → Add → row appears (no price); fill name+price+category → Add → row shows `€X.XX` + category badge | Given the admin enters a valid name (price optional), When they click Add, Then the item is added to the list |
| 3 | Empty name errors; empty price OK; non-numeric/negative price errors and blocks | Click Add with empty name → assert `menu-item-name-error`, no new row; enter `-2` price → assert `menu-item-price-error`, no row; leave price empty with valid name → row added | Given an empty name (or invalid price), When the admin clicks Add, Then an inline error appears and nothing is added |
| 4 | Added item appears immediately showing name, price if provided, category if provided | After Add, assert new `menu-item-row-{id}` with correct name; price element present only when provided; category badge present only when provided | Given a valid item, When it is added, Then it appears immediately with name and any provided price/category |
| 5 | Remove item; list updates immediately | Add 2 items, click `menu-item-remove-{id}` on one → assert that row is gone, the other remains | Given items in the list, When the admin removes one, Then it disappears immediately |
| 6 | Generate-link disabled until ≥1 valid item | With 0 items assert `generate-link-button` disabled; after adding 1 assert enabled; remove last item assert disabled again | Given no menu items, Then the generate-link action is disabled; When ≥1 item exists, Then it is enabled |
