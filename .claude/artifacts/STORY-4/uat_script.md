# Manual UAT Script — STORY-4: Admin closes the order

## Prerequisites

- The application stack is running (frontend, backend, Postgres) — e.g. `docker compose up`.
- An admin has created an open order for "Trattoria Demo" and added at least one
  menu item (e.g. `Margherita` at `9.50`).
- You have the admin order link: `http://localhost:5173/order/<ORDER_ID>`.
- You have the guest share link: `http://localhost:5173/order/<ORDER_ID>/guest`,
  and a second browser session to act as a guest.

## Test steps

| #   | Step                                                                                                           | Expected result                                                                                                                | Pass/Fail |
| --- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------- |
| 1   | Open the admin order link while the order is open.                                                             | A "Close order" action is visible and enabled.                                                                                 | ☐         |
| 2   | In a second browser, open the guest link, join as "Alice", add "Margherita", set quantity 2, note "no onions". | Alice's item is saved.                                                                                                         | ☐         |
| 3   | In the second browser, open the guest link again and join as "Bob" without adding anything.                    | Bob has joined.                                                                                                                | ☐         |
| 4   | Back on the admin page, look at the "Live order overview".                                                     | Alice's block shows "2x Margherita — no onions" with an "Editing" badge; Bob is also listed; summary reads "0 of 2 submitted". | ☐         |
| 5   | Click "Close order".                                                                                           | A confirmation prompt appears stating the order will close and members can no longer make changes.                             | ☐         |
| 6   | Click "Cancel" on the prompt.                                                                                  | The prompt closes; the order remains open; the "Close order" action is still shown; Alice's in-progress item still appears.    | ☐         |
| 7   | Click "Close order" again and confirm.                                                                         | The order shows a closed indicator; the "Close order" action is no longer shown.                                               | ☐         |
| 8   | Refresh the admin page.                                                                                        | The order is still shown as closed (state persisted server-side).                                                              | ☐         |
| 9   | Confirm there is no control to reopen the order anywhere on the admin page.                                    | No reopen option exists; closing is final.                                                                                     | ☐         |
| 10  | In the guest browser, reload the share link.                                                                   | A message states the order is closed; no add, edit, or remove controls are available.                                          | ☐         |
| 11  | As the guest, attempt to add or change an item (if any control remains).                                       | The change is rejected; the order cannot be modified by anyone once closed.                                                    | ☐         |
| 12  | (Edge case) Using a fresh order with no guests, open the admin overview.                                       | The overview shows "No guests have joined yet." and the summary reads "0 of 0 submitted".                                      | ☐         |

## Summary

| Result  | Count |
| ------- | ----- |
| Passed  |       |
| Failed  |       |
| Blocked |       |

**Tester:** **\*\***\_\_\_**\*\*** **Date:** **\*\***\_\_\_**\*\*** **Build/Commit:** **\*\***\_\_\_**\*\***

**Notes:**
