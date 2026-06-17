# Manual UAT Script — STORY-6: Admin emails the order overview (demo prank)

## Prerequisites

- The application stack is running (frontend, backend, Postgres) — e.g. `docker compose up`.
- Email transport: by default (no `SMTP_HOST` configured) the backend uses a
  logging sender, so "sending" succeeds and the composed email is written to the
  backend logs rather than delivered. To verify real delivery (and the CC/BCC
  behaviour in AC7), configure `SMTP_HOST`/`SMTP_PORT`/`SMTP_USERNAME`/
  `SMTP_PASSWORD`/`EMAIL_FROM` against a mailbox you are entitled to use.
- An admin has created an order for "Trattoria Demo" and added at least one menu
  item (e.g. `Margherita` at `9.50`).
- You have the admin order link: `http://localhost:5173/order/<ORDER_ID>`.
- You have the guest share link and a second browser session to act as guests.
- Use only email addresses you are entitled to send to (your own or a teammate's
  with consent). This is a demo prank, not a tool for arbitrary third parties.

## Test steps

| #   | Step                                                                                                        | Expected result                                                                                                        | Pass/Fail |
| --- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------- |
| 1   | While the order is still open, open the admin order link.                                                   | No "Email the overview" card is shown (email is only available once closed).                                           | ☐         |
| 2   | In the guest browser, join as "Sara" and add 2 "Margherita".                                                | Sara's items are saved.                                                                                                | ☐         |
| 3   | Back on the admin page, close the order (confirm the prompt).                                               | The order shows as closed; both the export and the "Email the overview" card now appear.                               | ☐         |
| 4   | Read the email preview.                                                                                     | It shows the header "Trattoria Demo", the line "2x Margherita", and "Total: €19.00".                                   | ☐         |
| 5   | Read the highlighted line above the overview in the preview.                                                | It is a clearly playful prank line about the bill being sent to your email shortly — an obvious joke.                  | ☐         |
| 6   | Leave the "To" field empty and click "Send email".                                                          | An inline error appears on the recipient field; no "Sent" confirmation appears.                                        | ☐         |
| 7   | Type "not-an-email" in "To" and click "Send email".                                                         | An inline error appears on the recipient field; nothing is sent.                                                       | ☐         |
| 8   | Type a valid recipient in "To", type "bad-cc" in "CC", and click "Send email".                              | An inline error appears on the CC field; nothing is sent.                                                              | ☐         |
| 9   | Clear the CC error by entering a valid recipient in "To" only, then click "Send email".                     | A "Sent" confirmation appears.                                                                                         | ☐         |
| 10  | Re-check the order state (refresh the admin page).                                                          | The order is still closed — sending did not reopen or alter it.                                                        | ☐         |
| 11  | (Real SMTP) Enter "To", a "CC", and a "BCC" (all mailboxes you control), then send.                         | The To and CC recipients receive the email and can see each other; the BCC recipient receives it but is hidden.        | ☐         |
| 12  | (Edge case) Using a fresh order with a menu item but no guest selections, close it and open the admin view. | The preview shows the "Trattoria Demo" header and "Total: €0.00"; entering a valid recipient and sending shows "Sent". | ☐         |

## Summary

| Result  | Count |
| ------- | ----- |
| Passed  |       |
| Failed  |       |
| Blocked |       |

**Tester:** **\*\***\_\_\_**\*\*** **Date:** **\*\***\_\_\_**\*\*** **Build/Commit:** **\*\***\_\_\_**\*\***

**Notes:**
