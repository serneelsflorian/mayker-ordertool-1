# Manual UAT Script — STORY-5: Admin exports the consolidated order

## Prerequisites

- The application stack is running (frontend, backend, Postgres) — e.g. `docker compose up`.
- An admin has created an order for "Trattoria Demo" and added at least one menu
  item (e.g. `Margherita` at `9.50`). Add a price-less item too (e.g. `Tap Water`)
  to verify the total handles missing prices.
- You have the admin order link: `http://localhost:5173/order/<ORDER_ID>`.
- You have the guest share link: `http://localhost:5173/order/<ORDER_ID>/guest`,
  and a second browser session to act as guests.

## Test steps

| #   | Step                                                                                                       | Expected result                                                                                                  | Pass/Fail |
| --- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------- |
| 1   | While the order is still open, open the admin order link.                                                  | No consolidated export section is shown (export is only available once closed).                                  | ☐         |
| 2   | In the guest browser, join as "Sara" and add 1 "Margherita" (no note).                                     | Sara's item is saved.                                                                                            | ☐         |
| 3   | In the guest browser, join as "Tom" and add 1 "Margherita" (no note).                                      | Tom's item is saved.                                                                                             | ☐         |
| 4   | In the guest browser, join as "Mira" and add 1 "Margherita" with the note "no onions".                     | Mira's item is saved.                                                                                            | ☐         |
| 5   | As "Sara", also add 3 "Tap Water" (the price-less item).                                                   | The items are saved.                                                                                             | ☐         |
| 6   | Back on the admin page, close the order (confirm the prompt).                                              | The order shows as closed and the "Export for Deliveroo" section now appears.                                    | ☐         |
| 7   | Read the first line of the export.                                                                         | It is the restaurant name header "Trattoria Demo".                                                               | ☐         |
| 8   | Inspect the grouped lines.                                                                                 | The two no-note Margheritas are merged into "2x Margherita"; Mira's appears as a separate "1x Margherita".       | ☐         |
| 9   | Check the line with Mira's note.                                                                           | "no onions" is shown beneath the "1x Margherita" line.                                                           | ☐         |
| 10  | Confirm no per-person names (Sara, Tom, Mira) appear in the export.                                        | The export is grouped by item, not by person.                                                                    | ☐         |
| 11  | Read the final total line.                                                                                 | "Total: €19.00" (2 × 9.50 Margherita = 19.00; the 3 price-less Tap Waters count as 0).                           | ☐         |
| 12  | Click the "Copy all" button.                                                                               | A "Copied" confirmation appears.                                                                                 | ☐         |
| 13  | Paste into a text editor.                                                                                  | The pasted text matches the displayed export exactly (restaurant header, grouped lines with notes, final total). | ☐         |
| 14  | (Edge case) Using a fresh order with menu items but no guest selections, close it and open the admin view. | The export shows the "Trattoria Demo" header and "Total: €0.00" with no item lines.                              | ☐         |

## Summary

| Result  | Count |
| ------- | ----- |
| Passed  |       |
| Failed  |       |
| Blocked |       |

**Tester:** **\*\***\_\_\_**\*\*** **Date:** **\*\***\_\_\_**\*\*** **Build/Commit:** **\*\***\_\_\_**\*\***

**Notes:**
