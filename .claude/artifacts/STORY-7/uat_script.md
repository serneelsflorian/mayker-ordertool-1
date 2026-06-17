# Manual UAT Script — STORY-7: Guest submits their order

## Prerequisites

- The application stack is running (frontend, backend, Postgres): e.g. `docker compose up`.
- An admin has created an open order for "Trattoria Demo" and added at least one priced
  menu item (e.g. `Margherita` at `9.50`).
- You have the guest share link: `http://localhost:5173/order/<ORDER_ID>/guest`.
- Use a fresh browser session (or a second browser/incognito window) for the guest view.
- Keep a separate browser tab open at `http://localhost:5173/order/<ORDER_ID>` for the
  admin view.

## Test steps

| #   | Step                                                                                                                                          | Expected result                                                                                                                                                                                                                                                   | Pass/Fail |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| 1   | Open the guest share link. Type "Sara" and click "Start ordering".                                                                            | The "My order" panel appears with a "Submit my order" button that is disabled.                                                                                                                                                                                    | ☐         |
| 2   | Add "Margherita" to the order using the "Add" button in the menu.                                                                             | "Margherita" appears in the "My order" panel and the "Submit my order" button becomes enabled.                                                                                                                                                                    | ☐         |
| 3   | Click "Submit my order".                                                                                                                      | The status badge changes to "Submitted". A confirmation banner appears: "Your order is submitted. The organizer can see it. You can still reopen to make changes." A "Reopen / edit my order" button is shown. The "Submit my order" button is no longer visible. | ☐         |
| 4   | Switch to the admin tab (`/order/<ORDER_ID>`).                                                                                                | Sara appears in the guest overview with a "Submitted" badge. The summary reads "1 of 1 submitted".                                                                                                                                                                | ☐         |
| 5   | (Optional) Add a second guest "Bob" in another browser without submitting. Reload the admin tab.                                              | Sara shows "Submitted", Bob shows "Editing", summary reads "1 of 2 submitted".                                                                                                                                                                                    | ☐         |
| 6   | Back in Sara's browser: click "Reopen / edit my order".                                                                                       | The status badge changes back to "Editing". The "Submit my order" button reappears (still enabled because items are present). The banner is gone.                                                                                                                 | ☐         |
| 7   | Without clicking submit, increase the quantity of "Margherita" using the "+" control.                                                         | The quantity updates and the subtotal changes. The status badge remains "Editing" (was already editing; no change needed).                                                                                                                                        | ☐         |
| 8   | Click "Submit my order" again to return to Submitted state.                                                                                   | Status badge shows "Submitted" and confirmation banner reappears.                                                                                                                                                                                                 | ☐         |
| 9   | While in Submitted state, increase the quantity again using the "+" control.                                                                  | The quantity updates and the status badge automatically reverts to "Editing" without clicking reopen. The "Submit my order" button reappears.                                                                                                                     | ☐         |
| 10  | Ask the admin to close the order (click "Close order" and confirm in the admin tab).                                                          | The admin view shows the order as closed.                                                                                                                                                                                                                         | ☐         |
| 11  | Reload Sara's guest link (or open it in a fresh window).                                                                                      | The closed-order message is shown. There is no "Submit my order" button and no "Reopen / edit my order" button.                                                                                                                                                   | ☐         |
| 12  | Directly call the submit endpoint for Sara's guest via the browser console or a tool: `POST /api/orders/<ORDER_ID>/guests/<GUEST_ID>/submit`. | The server returns HTTP 409 with `"code": "ORDER_CLOSED"`.                                                                                                                                                                                                        | ☐         |
| 13  | Directly call the reopen endpoint: `POST /api/orders/<ORDER_ID>/guests/<GUEST_ID>/reopen`.                                                    | The server returns HTTP 409 with `"code": "ORDER_CLOSED"`.                                                                                                                                                                                                        | ☐         |

## Summary

| Result  | Count |
| ------- | ----- |
| Passed  |       |
| Failed  |       |
| Blocked |       |

**Tester:** \_\_\_\_\_\_\_\_\_\_ **Date:** \_\_\_\_\_\_\_\_\_\_ **Build/Commit:** \_\_\_\_\_\_\_\_\_\_

**Notes:**
