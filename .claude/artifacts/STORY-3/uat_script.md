# Manual UAT Script — STORY-3: A guest joins via the link and adds items

## Prerequisites

- The application stack is running (frontend, backend, Postgres) — e.g. `docker compose up`.
- An admin has created an open order for "Trattoria Demo" and added at least two
  menu items: one with a price (e.g. `Margherita` at `9.50`) and one with no price
  (e.g. `Tap Water`).
- You have the guest share link: `http://localhost:5173/order/<ORDER_ID>/guest`.
- Use a fresh browser session (or a second browser) so you are an unauthenticated
  link-holder, not the admin.

## Test steps

| #   | Step                                                                                                                            | Expected result                                                                                               | Pass/Fail |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------- |
| 1   | Open the guest share link.                                                                                                      | The restaurant name "Trattoria Demo" and the full menu are shown. There is no login or account prompt.        | ☐         |
| 2   | Observe the name form before typing anything.                                                                                   | A name field is shown; the "Start ordering" button is disabled; no per-item "Add" buttons are visible.        | ☐         |
| 3   | Type a name (e.g. "Sara") into the name field.                                                                                  | The "Start ordering" button becomes enabled.                                                                  | ☐         |
| 4   | Click "Start ordering".                                                                                                         | The "My order" panel appears with a status badge reading "Editing"; each menu item now shows an "Add" button. | ☐         |
| 5   | Click "Add" on "Margherita".                                                                                                    | "Margherita" appears in the "My order" panel attributed to you, with quantity 1.                              | ☐         |
| 6   | Type "no onions" into the note field for that item and click elsewhere (blur).                                                  | The note is accepted and saved.                                                                               | ☐         |
| 7   | Reload the page, enter the same name, and join again.                                                                           | Your "Margherita" with the note "no onions" is still present (state persisted server-side).                   | ☐         |
| 8   | Try the decrease (−) control on the item at quantity 1.                                                                         | The decrease control is disabled; quantity cannot go below 1.                                                 | ☐         |
| 9   | Click the increase (+) control.                                                                                                 | The quantity changes to 2 and the line total and subtotal update accordingly.                                 | ☐         |
| 10  | Note the subtotal, then add the unpriced item ("Tap Water").                                                                    | The unpriced item appears with no price; the subtotal does not change (counts as 0).                          | ☐         |
| 11  | Remove an item using its remove (trash) control.                                                                                | The item disappears from your order and the subtotal updates.                                                 | ☐         |
| 12  | In a second browser, open the same link and join as a different name (e.g. "Bob"); add an item. Switch back to the first guest. | The first guest never sees the second guest's items; each guest sees only their own selections.               | ☐         |
| 13  | Ask the admin to close the order, then reload the guest link.                                                                   | A message states the order is closed; the menu is read-only with no add, edit, or remove controls.            | ☐         |
| 14  | Open a link with a non-existent order id (`/order/00000000-0000-0000-0000-000000000000/guest`).                                 | An error state is shown instead of a crash.                                                                   | ☐         |

## Summary

| Result  | Count |
| ------- | ----- |
| Passed  |       |
| Failed  |       |
| Blocked |       |

**Tester:** ******\_\_\_****** **Date:** ******\_\_\_****** **Build/Commit:** ******\_\_\_******

**Notes:**
