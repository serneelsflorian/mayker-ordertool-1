# Shared Risk Analysis — STORY-2

## Files this feature will create

- `frontend/src/components/ShareLinkCard.tsx`
- `frontend/src/components/GuestMenuCard.tsx`
- `frontend/src/routes/GuestOrderPage.tsx`
- `frontend/src/lib/share.ts`
- `e2e/tests/STORY-2_generate-shareable-link.spec.ts`

## Existing files this feature will modify

- `frontend/src/App.tsx`: add the `/order/:id/guest` route.
- `frontend/src/routes/OrderAdminPage.tsx`: render `ShareLinkCard` below `MenuSetupCard`.
- `frontend/src/components/MenuSetupCard.tsx`: remove the inline generate-link button card (moved to `ShareLinkCard`); keep the "Menu setup" card.
- `frontend/src/components/MenuItemList.tsx`: make `onRemove` optional (read-only when omitted).
- `frontend/src/components/MenuItemRow.tsx`: make `onRemove` optional; render remove button only when provided.

## Potential conflicts with other features in the same wave

STORY-2 is the only feature in Wave 2 (per `feature_map.md`), so there are no same-wave file conflicts.

## Downstream / cross-feature notes

- **STORY-3 (next wave) builds on the `/order/:id/guest` route.** STORY-3 ("a guest joins via the link and adds items") will extend `GuestOrderPage` / `GuestMenuCard` with the name field, per-item notes, quantity steppers, and the per-guest subtotal. STORY-2 deliberately renders the menu read-only so STORY-3 has a clean surface to extend. If the routing decision below changes, STORY-3 is the most affected.
- **Reused STORY-1 components.** `MenuItemList` / `MenuItemRow` gain an optional `onRemove`. This is backward compatible: STORY-1's admin view always passes `onRemove`, so its E2E assertions (remove buttons, `menu-item-remove-{id}`) remain valid. The guest view passes no `onRemove` and renders read-only.
- **`generate-link-button` testid moves** from `MenuSetupCard` into `ShareLinkCard` but keeps the same value, so STORY-1's E2E checks on enabled/disabled state still pass.

## Assumptions / decisions to confirm in review

- **Routing for guest vs admin (key decision):** the shareable link points to a distinct route `/order/:id/guest` (admin stays at `/order/:id`). Rationale: no accounts/auth exist, so admin vs guest can only be distinguished by URL path; sharing the same `/order/:id` would expose the admin menu-setup screen to teammates, contradicting AC4 ("loads the guest order view") and the single-role rule. Made autonomously per `user_story_alignment.md` §4. Flag for reviewer confirmation.
- **No backend change.** The order identifier (UUID), `open` state, and persistence already exist from STORY-1, and `GET /api/orders/{id}` already serves the guest view. Adding a "generate link" endpoint would be gold-plating and could orphan the admin's menu, so the generate action is frontend-only.
- **Design reference divergence.** The prototype simulates sharing with an in-app role switcher and a fake `app.example/order/...` slug (no backend). STORY-2 instead surfaces the real persisted order id and real origin so the link works cross-session, per the server-persisted-state architecture in CLAUDE.md.
