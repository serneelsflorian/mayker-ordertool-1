# Implementation Plan — STORY-2: Admin generates a shareable link

## Feature

> As an admin, I want to generate a shareable link once the menu is ready, so I can distribute it to the team.
>
> **Acceptance criteria:**
>
> - A generate-link action is available only when the menu has at least one item.
> - Activating it creates a unique order identifier and produces a shareable URL containing that identifier.
> - The URL is displayed in a read-only field with a one-tap copy button; tapping it copies the full URL to the clipboard and shows a confirmation (Copied).
> - Opening the generated URL in a new browser/session loads the guest order view for that specific order, showing the same restaurant and menu the admin entered.
> - After a link is generated, the order state is open and is persisted so it survives a page refresh.

Source: ClickUp task `86ca9mdbu` (https://app.clickup.com/t/86ca9mdbu).

## Acceptance Criteria

- [ ] AC1: A generate-link action is available only when the menu has at least one item.
- [ ] AC2: Activating it creates/uses a unique order identifier and produces a shareable URL containing that identifier.
- [ ] AC3: The URL is shown in a read-only field with a one-tap copy button; tapping copies the full URL to the clipboard and shows a "Copied" confirmation.
- [ ] AC4: Opening the generated URL in a new browser/session loads the guest order view for that specific order, showing the same restaurant and menu the admin entered.
- [ ] AC5: After a link is generated, the order state is `open` and is persisted so it survives a page refresh.

## Plan Overview

STORY-2 is a **frontend-only** feature built on the infrastructure and persisted order/menu delivered by STORY-1 (merged). No backend, database, or migration changes are required — the building blocks already exist:

- The unique order identifier already exists: STORY-1's `POST /api/orders` creates an `Order` with a server-generated **UUID** (`backend/app/models/order.py`) and `state="open"`, persisted in Postgres. This satisfies "unique order identifier" (AC2) and "order is open and persisted, survives refresh" (AC5) with no new code.
- `GET /api/orders/{order_id}` already returns the order with its `restaurant_name` and `menu_items`, which is exactly what the guest order view needs to render (AC4).

Therefore STORY-2 adds:

1. A **share-link panel** on the admin page (`/order/:id`): a "Generate share link" action (enabled only when ≥1 menu item exists — AC1), which reveals a read-only field containing the full shareable URL plus a one-tap Copy button with a transient "Copied" confirmation (AC2, AC3).
2. A **guest order view** route that the shareable URL points to, which loads the order by id and renders the restaurant name and the menu the admin entered, **read-only** (AC4). Guest item selection/notes/quantities are explicitly **out of scope** — they belong to STORY-3.

### Routing decision (documented assumption)

The admin works at `/order/:id` (created by STORY-1; `HomePage` redirects there after `POST /api/orders`, and the merged STORY-1 E2E suite depends on this). Because there are no accounts and no auth (per CLAUDE.md: single admin role, everyone else an unauthenticated link-holder), the app can only distinguish the admin surface from the guest surface **by URL path**. If the shared link were the same `/order/:id`, a teammate opening it would land on the admin menu-setup screen and could edit the menu — which contradicts "loads the guest order view" and the single-role rule.

**Decision:** the guest order view lives at a distinct child route **`/order/:id/guest`**, and the generated shareable URL is `${window.location.origin}/order/${id}/guest`. The admin keeps `/order/:id` unchanged (no STORY-1 regression). STORY-3 ("a guest joins via the link and adds items") then builds the guest ordering interactions on this same `/order/:id/guest` route.

This is the minimal, non-breaking interpretation of AC4. It is a reasonable assumption made autonomously per `.claude/rules/user_story_alignment.md` §4 and is flagged in the PR description and `shared_risks.md` for reviewer confirmation.

Scope discipline: STORY-2 implements link generation + copy + the read-only guest view only. It does **not** implement guest name entry / item selection / notes / quantity / subtotal (STORY-3), closing (STORY-4), export (STORY-5), email (STORY-6), or submit (STORY-7).

## Infrastructure Scaffolding (scaffold feature only)

Not applicable — STORY-1 is the scaffold feature and is Done. No infrastructure changes.

## Frontend Plan

- **Components to create:**
  - `frontend/src/components/ShareLinkCard.tsx` — the "Share with the team" card (organism). Props: `{ orderId: string; hasItems: boolean }`. Renders:
    - A "Generate share link" button (`data-testid="generate-link-button"`), **disabled while `!hasItems`** (AC1), with the existing helper text "Add at least one menu item first." when disabled.
    - On click: compute the share URL via `buildGuestShareUrl(orderId)` and set local `generated` state to reveal the share row (AC2). No network call — the identifier already exists server-side.
    - When generated: a **read-only** `Input` (`data-testid="share-url-input"`, `readOnly`) holding the full URL, and a Copy button (`data-testid="copy-link-button"`) that calls `navigator.clipboard.writeText(url)` and shows a transient "Copied" confirmation (`data-testid="copy-confirmation"`) for ~2s (AC3). Copy button falls back gracefully if the Clipboard API is unavailable (still shows confirmation; wrapped in try/catch).
  - `frontend/src/routes/GuestOrderPage.tsx` — the guest order view at `/order/:id/guest`. Reuses the `useOrder` data-loading pattern: fetches `GET /api/orders/:id`, shows loading / error / not-found states, and on success renders the restaurant name and the menu **read-only** (AC4). Uses a `GuestMenuCard` for layout.
  - `frontend/src/components/GuestMenuCard.tsx` — read-only card (molecule): header `Restaurant: {RESTAURANT_NAME}` (sourced from the loaded order's `restaurant_name`), an intro line ("Browse the menu below."), and a read-only menu list. `data-testid="guest-menu-card"`.
- **Components to modify:**
  - `frontend/src/components/MenuSetupCard.tsx` — **remove** the inline generate-link button card (the second `<Card>`); that affordance moves into the dedicated `ShareLinkCard`. `MenuSetupCard` keeps only the "Menu setup" card. The `generate-link-button` testid is preserved (it now lives in `ShareLinkCard`), so the STORY-1 E2E assertions on it still pass.
  - `frontend/src/routes/OrderAdminPage.tsx` — render `<ShareLinkCard orderId={orderId} hasItems={menuItems.length > 0} />` below `<MenuSetupCard />`.
  - `frontend/src/components/MenuItemList.tsx` — make `onRemove` **optional**; when omitted, render the list read-only (DRY: the guest view reuses the same list). Behaviour for STORY-1 (admin) is unchanged because admin still passes `onRemove`.
  - `frontend/src/components/MenuItemRow.tsx` — make `onRemove` **optional**; render the trash/remove button only when `onRemove` is provided. Read-only otherwise.
- **Routes (React Router, `frontend/src/App.tsx`):**
  - Add `<Route path="/order/:id/guest" element={<GuestOrderPage />} />` alongside the existing `/order/:id` admin route. (React Router matches the more specific `/order/:id/guest` before `/order/:id`.)
- **State management:** Native React hooks only (per coding standards §3.3). `ShareLinkCard` holds local `generated` + `copied` state. `GuestOrderPage` reuses the same fetch-on-mount pattern as `OrderAdminPage` (a small shared `useOrder`-style loader). No global state, no localStorage (architecture mandates server-persisted state).
- **Share URL helper:** `frontend/src/lib/share.ts` → `buildGuestShareUrl(orderId: string): string` returns `${window.location.origin}/order/${orderId}/guest`. Isolated so the URL shape is defined once.
- **Test attributes (coding standards §3.6):** `generate-link-button` (preserved), `share-url-input`, `copy-link-button`, `copy-confirmation`, `share-link-card`, `guest-menu-card`, plus the existing `menu-item-list` / `menu-item-row-{id}` reused read-only in the guest view.
- **Design reference notes:** Reimplement the "Share with the team" card from `docs/prototype/src/app/App.tsx` (lines ~499–528) per the Rewrite Rule — a card titled "Share with the team", the teal primary "Generate share link" button with a link icon, and on generation a read-only input next to an outline Copy button. Use the existing brand tokens and `ui/` atoms (`Card`, `Button`, `Input`, `Label`). Reuse `lucide-react` icons (`Link`, `Copy`, `Check`). The prototype generates a fake random slug client-side and shows the URL as `app.example/order/...`; we instead surface the **real** persisted order id and the real origin so the link actually works cross-session (the prototype explicitly simulates sharing because it has no backend — we have one).
  - **Design-vs-architecture divergence (follow architecture):** the prototype simulates both admin and guest with an in-app role switcher and no real URLs. Our app uses real URLs (`/order/:id` admin, `/order/:id/guest` guest) because order state is server-persisted and shared by link per CLAUDE.md. Flagged in `shared_risks.md`.

## Backend Plan

No backend changes required.

STORY-2 is satisfied entirely by STORY-1's existing endpoints:

- `POST /api/orders` already creates a unique-UUID order with `state="open"`, persisted in Postgres (covers AC2 identifier + AC5 open/persisted/survives-refresh).
- `GET /api/orders/{order_id}` already returns `restaurant_name` + `menu_items` for the guest view (covers AC4).

No new endpoints are added — adding one would be gold-plating (the identifier already exists; re-creating it on "generate" would orphan the menu the admin just entered). This is consistent with STORY-1's plan note that the generate-link endpoint, if any, would be "frontend-only".

## API Integration Plan

No external API integration. The frontend talks only to the project's own FastAPI backend via the existing `api/` client.

## API Contract

No new or changed API contracts. STORY-2 consumes the existing STORY-1 contract:

### Get order (existing, reused by the guest view)

- **Method:** GET
- **URL:** `/api/orders/{order_id}`
- **Response 200:**

```json
{
  "id": "9f1c2e6a-3b7d-4a21-9d54-5f6e7a8b9c0d",
  "restaurant_name": "Trattoria Demo",
  "state": "open",
  "menu_items": [
    {
      "id": "1a2b...",
      "name": "Margherita",
      "price": "9.50",
      "category": "Pizza"
    },
    { "id": "3c4d...", "name": "Garlic Bread", "price": null, "category": null }
  ]
}
```

- **Response 404:** `{ "error": { "code": "ORDER_NOT_FOUND", "message": "Order not found" } }`

### Client contract (frontend → guest view)

- The shareable URL produced by the admin is `${window.location.origin}/order/{order_id}/guest`.
- The guest view loads that order via the existing `getOrder(id)` function in `frontend/src/api/orders.ts` (no change to the API client).

## File Manifest

### New files

- `frontend/src/components/ShareLinkCard.tsx`: "Share with the team" card — generate button (disabled until ≥1 item), read-only URL field, Copy button + "Copied" confirmation.
- `frontend/src/components/GuestMenuCard.tsx`: read-only restaurant + menu card used by the guest view.
- `frontend/src/routes/GuestOrderPage.tsx`: guest order view route at `/order/:id/guest`; loads the order, renders restaurant + read-only menu.
- `frontend/src/lib/share.ts`: `buildGuestShareUrl(orderId)` helper.
- `e2e/tests/STORY-2_generate-shareable-link.spec.ts`: Playwright E2E spec covering AC1–AC5.

### Modified files

- `frontend/src/App.tsx`: add the `/order/:id/guest` route.
- `frontend/src/routes/OrderAdminPage.tsx`: render `ShareLinkCard` below `MenuSetupCard`.
- `frontend/src/components/MenuSetupCard.tsx`: remove the inline generate-link button card (moved to `ShareLinkCard`); keep the "Menu setup" card.
- `frontend/src/components/MenuItemList.tsx`: make `onRemove` optional (read-only when omitted) so the guest view can reuse it.
- `frontend/src/components/MenuItemRow.tsx`: make `onRemove` optional; render the remove button only when provided.
- `e2e/helpers/order.ts`: no change expected (existing `createTestOrder` + `addTestMenuItem` cover STORY-2 seeding); extend only if a guest-view helper proves useful.

## Testing Strategy

> Tier selection: STORY-2 has **no backend/service-layer changes** and the frontend has **no unit-test runner** configured (`frontend/package.json` exposes only `lint`/`build`; tests are pytest for the backend and Playwright for the UI). Frontend behaviour is therefore verified through **E2E**, which is ENABLED.

- **Unit tests:** None warranted. No backend service/business-logic changes (the share URL is built client-side; the order identifier and persistence are pre-existing). No frontend unit runner exists in the project. (Skipped — nothing in the service layer changes.)
- **Integration tests:** None warranted. No new/changed endpoints, repositories, models, or migrations. The reused `GET /api/orders/{id}` already has STORY-1 router + repository integration coverage. (Skipped — no backend surface added.)
- **E2E tests:** ENABLED — primary coverage for STORY-2. Drive the real composed stack.
  - Directory: `e2e/tests/`. File: `STORY-2_generate-shareable-link.spec.ts` (`{feature_id}_{slug}.spec.ts`).
  - Seed via API using the existing `e2e/helpers/order.ts` (`createTestOrder`, `addTestMenuItem`). Locators prefer `data-testid`.
  - Cases:
    - AC1: with 0 items the `generate-link-button` is disabled; after adding 1 item it is enabled.
    - AC2/AC3: clicking generate reveals `share-url-input` containing a URL ending in `/order/{id}/guest`; clicking `copy-link-button` shows `copy-confirmation` ("Copied"); assert clipboard contents where the test environment grants clipboard permission (Chromium), otherwise assert the confirmation + input value.
    - AC4: navigate directly to the generated `/order/{id}/guest` URL (simulating a fresh session) and assert the guest view shows the restaurant name and the seeded menu items (read-only — no remove buttons present).
    - AC5: after generating, reload `/order/{id}` and assert the order/menu persist and `state` is still open (the guest view at `/order/{id}/guest` still renders the menu).
    - Edge case: opening `/order/{unknown-uuid}/guest` shows the not-found / error state (no crash).
- **UAT scenarios:** OPTIONAL per CLAUDE.md — not required. If generated: `e2e/uat/scenarios/STORY-2_generate-shareable-link.feature` + `e2e/uat/scripts/STORY-2_generate-shareable-link_uat_script.md`, one scenario per AC plus one edge case (unknown order id).

## Acceptance Test Outline

| #   | Acceptance Criterion                                                              | E2E Strategy                                                                                                                                               | UAT Scenario Sketch                                                                                                               |
| --- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Generate-link action available only with ≥1 menu item                             | Seed order with 0 items → assert `generate-link-button` disabled; add 1 item → assert enabled                                                              | Given an order with no items, Then the generate-link action is disabled; When ≥1 item exists, Then it is enabled                  |
| 2   | Activating produces a shareable URL containing the order identifier               | Click generate → assert `share-url-input` value contains the order id and ends with `/order/{id}/guest`                                                    | Given a menu with items, When the admin generates the link, Then a URL containing the order id is shown                           |
| 3   | Read-only field + one-tap copy with "Copied" confirmation                         | Assert `share-url-input` is read-only; click `copy-link-button` → assert `copy-confirmation` shows "Copied" (and clipboard equals the URL where permitted) | Given a generated link, When the admin taps Copy, Then the full URL is copied and a "Copied" confirmation appears                 |
| 4   | Opening the URL in a new session loads the guest view with same restaurant + menu | Navigate fresh to `/order/{id}/guest` → assert restaurant name + each seeded menu item visible, read-only (no remove controls)                             | Given a generated link, When a teammate opens it in a new browser, Then they see the guest view with the same restaurant and menu |
| 5   | After generating, order is open and persists across refresh                       | Generate, then reload `/order/{id}` and `/order/{id}/guest` → assert menu still present, order still open                                                  | Given a generated link, When the page is refreshed, Then the order and menu persist and the order is still open                   |
