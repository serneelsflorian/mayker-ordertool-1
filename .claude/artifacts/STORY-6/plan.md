# Implementation Plan — STORY-6: Admin emails the order overview (demo prank)

## Feature

> As an admin, I want to email the consolidated order overview to a recipient (with optional CC and BCC) once the order is closed, so the team gets a copy — with a clearly tongue-in-cheek "the bill is coming" message for the demo.
>
> **Note:** this is a demo/prank feature. The email body is intentionally playful and must read as such. To avoid genuinely misleading or alarming a real recipient, the message should be unambiguously light-hearted, and the build should treat the recipient address as one the admin is entitled to send to (e.g. their own or a teammate's with consent), not arbitrary third parties.

## Acceptance Criteria

- [ ] AC1: An email action is available to the admin only once the order is closed (alongside the export action).
- [ ] AC2: The admin can enter a recipient email address (required, validated format) plus an optional CC and an optional BCC field (each validated as an email format when non-empty).
- [ ] AC3: Attempting to send with an empty or malformed recipient address shows an inline error and does not send.
- [ ] AC4: The email subject and body contain the full consolidated overview from Story 5 (restaurant header, grouped quantity x item lines with notes, final total with missing prices treated as 0).
- [ ] AC5: The body includes a clearly playful prank line stating the order was placed and that the bill will be sent to the recipient's email shortly — phrased so it reads as an obvious joke, not a real invoice.
- [ ] AC6: On send, the admin sees a confirmation (Sent) on success, or an inline error on failure, and the order state is unchanged (sending does not reopen or alter the closed order).
- [ ] AC7: The CC and BCC recipients, when provided, receive the same email per standard email semantics (BCC hidden from other recipients).

## Plan Overview

Add a single server-side email capability that reuses Story 5's consolidated export. One new endpoint (`POST /api/orders/{order_id}/email`) routes to a new `EmailService`, which: loads the order, enforces it is **closed** (server-side), rebuilds the consolidated overview via the existing pure `build_export(...)`, composes a subject + playful body via a new pure `email_builder`, and dispatches through an `EmailSender` abstraction. Email is **never** sent from the frontend (per CLAUDE.md). The order is read-only in this flow — no state mutation, no commit.

The frontend adds one admin-only `OrderEmailCard` (rendered next to `OrderExportCard` when `order.state === "closed"`) with To / CC / BCC inputs, client-side format validation with inline errors, a Send action, and Sent / error feedback.

**Email transport decision (documented assumption):** CLAUDE.md allows "SMTP or a provider like Resend/SendGrid". We use **SMTP via `aiosmtplib`** (async, fits the async stack) behind an `EmailSender` Protocol. Because this is a demo and no SMTP server is provisioned by default, the sender is selected at startup from settings: when `smtp_host` is configured, a real `SmtpEmailSender` is used; when it is empty (default dev/CI/demo), a `LoggingEmailSender` logs the composed message and reports success. This keeps the demo working out-of-the-box and keeps CI/E2E deterministic without a live mail server, while still exercising the full compose-and-dispatch path. This is a reasonable assumption per `user_story_alignment.md` §4 (autonomous mode) and is recorded here and in the PR.

## Frontend Plan

- **Components to create:**
  - `frontend/src/components/OrderEmailCard.tsx` — admin-only card (sibling of `OrderExportCard`) shown only when the order is closed. Contains a To field (required), optional CC, optional BCC, a Send button, inline per-field validation errors, and a Sent confirmation / send-failure error. Loads the consolidated export (reusing `getOrderExport`) to show a small preview of what will be emailed (overview text + the playful prank line), matching the design reference's preview affordance.
- **Components to modify:**
  - `frontend/src/routes/OrderAdminPage.tsx` — render `<OrderEmailCard orderId={orderId} />` immediately after `<OrderExportCard />`, inside the existing `order.state === "closed"` guard.
- **Routes:** None (reuses `/order/:id`).
- **State management:** Local component state (`useState`) for field values, per-field errors, sending flag, and sent/error result — consistent with `OrderExportCard`/`MenuItemForm`. No global state needed.
- **API client:** Add `sendOrderEmail(orderId, payload)` to `frontend/src/api/orders.ts`; add `SendOrderEmailPayload` and `OrderEmailResult` types to `frontend/src/api/types.ts`.
- **Validation:** Add a reusable `isValidEmail` + `validateEmailRecipients` helper to `frontend/src/lib/validation.ts` (mirrors the existing `parseMenuItemInput` pattern). Empty optional fields are omitted from the payload (sent as `undefined`), not as empty strings.
- **Icons:** Reuse `lucide-react` (`Mail`, `Send`, `Check`) — same library/usage as `OrderExportCard`.
- **Design reference notes (REPO_DIR `docs/prototype`):** The prototype renders the email form inside a modal `Dialog` with To/CC/BCC inputs, inline validation (`isEmail` regex), a preview block showing the export body plus the coral prank line ("Thank you for ordering! The bill will be sent to your email shortly, so keep an eye on your inbox 😉"), and a Send button that toasts "Sent". Per the Rewrite Rule and the "ignore component structure from the design tool" guidance, we **adapt the interaction to the established codebase pattern**: an inline card consistent with its sibling `OrderExportCard` (the app already renders the export inline as a card, and there is no general modal primitive beyond the specialized `ConfirmDialog`). We extract the layout, field set, validation rules, preview affordance, and the prank-line copy; we reimplement from scratch with the project's `ui/` primitives (`Card`, `Input`, `Label`, `Button`) and Tailwind. This adaptation is noted as an intentional deviation.

## Backend Plan

- **Endpoints:** Exactly one new endpoint.
  - `POST /api/orders/{order_id}/email` → `OrderEmailResult`. Validates the request body (`OrderEmailSend`) via Pydantic; delegates to `EmailService.send_order_email(order_id, payload)`.
- **Service layer:** New `app/services/email_service.py` → `EmailService`:
  1. Load order via `OrderRepository`; raise `OrderNotFoundError` (404) if missing.
  2. Enforce closed state: if `order.state != "closed"`, raise new `OrderNotClosedError` (409). This server-side guard backs AC1 across all sessions.
  3. Load guests via `GuestRepository`; rebuild the consolidated overview with the existing pure `build_export(order.id, order.restaurant_name, guests)` (reuse — no re-derivation of the merge rule).
  4. Compose subject + plain-text body via the pure `build_order_email(...)` (see below).
  5. Dispatch via the injected `EmailSender` (To + optional CC/BCC). On any sender failure, raise `EmailSendError` (502).
  6. **No order mutation and no session commit** — the flow is read-only, satisfying AC6 ("order state is unchanged").
- **Email builder (pure, unit-testable):** New `app/services/email_builder.py` → `build_order_email(export: OrderExportRead) -> EmailContent` (a small dataclass/Pydantic model with `subject` and `body`). Subject e.g. `f"Your {export.restaurant_name} order"`. Body = the playful prank line + a blank line + `export.text` (the canonical overview block from Story 5: restaurant header, grouped `{qty}x {item}` lines with notes beneath, `Total: €{amount}`). Prank copy is unambiguous and light-hearted (reusing the prototype's wording).
- **Email sender abstraction:** New `app/services/email_sender.py`:
  - `EmailSender` (Protocol) with `async def send(self, *, to, cc, bcc, subject, body) -> None`.
  - `SmtpEmailSender` — sends via `aiosmtplib` using SMTP settings; sets `To`/`Cc` headers and passes the full recipient list (To + Cc + Bcc) to the SMTP envelope so Bcc receives the mail without appearing in headers (AC7).
  - `LoggingEmailSender` — logs the composed message (recipients, subject) at INFO and returns success; used when `smtp_host` is unset (demo/CI default).
  - `build_email_sender(settings) -> EmailSender` factory selecting the implementation from config.
- **Repository layer:** No new repository code — reuse `OrderRepository.get_by_id` and `GuestRepository.list_by_order`.
- **Config:** Extend `app/config.py` `Settings` with: `smtp_host: str = ""`, `smtp_port: int = 587`, `smtp_username: str = ""`, `smtp_password: str = ""`, `smtp_use_tls: bool = True`, `email_from: str = "orders@ordertool.demo"`. All from env vars; no secrets hardcoded.
- **Exceptions / error handling:** Add `OrderNotClosedError` (code `ORDER_NOT_CLOSED`) and `EmailSendError` (code `EMAIL_SEND_FAILED`) to `app/exceptions.py`; map them to `409` and `502` in `app/error_handlers.py` `_STATUS_MAP`. Malformed/empty recipient produces Pydantic `422` automatically (and the frontend blocks it inline first).
- **DI:** Add `get_email_service` to `app/api/deps.py`, constructing `EmailService(session, build_email_sender(settings))`.
- **Dependencies:** Add `aiosmtplib>=3.0` and `email-validator>=2.1` (the latter enables Pydantic `EmailStr`) to `backend/pyproject.toml`.
- **Migrations:** None — no schema changes.

## API Integration Plan

No external API integration in the application sense. The only outbound integration is SMTP email dispatch, encapsulated entirely in `EmailSender` (backend). No third-party HTTP client is consumed.

## API Contract

**Send the order overview email**

- Method: `POST`
- URL: `/api/orders/{order_id}/email`
- Request (`OrderEmailSend`):
  ```json
  { "to": "teammate@example.com", "cc": "boss@example.com", "bcc": null }
  ```

  - `to`: required, valid email (`EmailStr`).
  - `cc`: optional, valid email when present (blank/None coerced to `None`).
  - `bcc`: optional, valid email when present (blank/None coerced to `None`).
- Response `200` (`OrderEmailResult`):
  ```json
  {
    "status": "sent",
    "to": "teammate@example.com",
    "cc": "boss@example.com",
    "bcc": null
  }
  ```
- Errors (consistent `{"error": {"code", "message"}}` shape):
  - `404 ORDER_NOT_FOUND` — order does not exist.
  - `409 ORDER_NOT_CLOSED` — order is still open (email only allowed once closed).
  - `422 VALIDATION_ERROR` / Pydantic 422 — missing or malformed `to`/`cc`/`bcc`.
  - `502 EMAIL_SEND_FAILED` — the mail transport failed.

## File Manifest

### New files

- `backend/app/schemas/email.py`: `OrderEmailSend` (request: to/cc/bcc with `EmailStr` + blank→None validator) and `OrderEmailResult` (response: status + echoed recipients).
- `backend/app/services/email_builder.py`: pure `build_order_email(export)` composing subject + playful body from the Story 5 export; `EmailContent` model.
- `backend/app/services/email_sender.py`: `EmailSender` Protocol, `SmtpEmailSender`, `LoggingEmailSender`, `build_email_sender(settings)` factory.
- `backend/app/services/email_service.py`: `EmailService.send_order_email(order_id, payload)` (load + closed-guard + build_export + compose + dispatch, no mutation).
- `backend/app/api/email.py`: `POST /orders/{order_id}/email` router (or add the route to `orders.py` — see Modified files; final placement: a dedicated router registered under `/api`).
- `backend/tests/unit/test_email_builder_unit.py`: unit tests for the pure body/subject composition.
- `backend/tests/unit/test_email_service_unit.py`: unit tests for `EmailService` (mocked sender + repos).
- `backend/tests/integration/test_email_router_integration.py`: router integration tests with a fake recording sender via dependency override.
- `frontend/src/components/OrderEmailCard.tsx`: admin-only email form card.
- `e2e/tests/STORY-6_email-order-overview.spec.ts`: Playwright E2E spec.
- `e2e/uat/scenarios/STORY-6_email-order-overview.feature`: Gherkin UAT scenarios.
- `e2e/uat/scripts/STORY-6_email-order-overview_uat_script.md`: manual UAT script.

### Modified files

- `backend/app/config.py`: add SMTP/email settings fields.
- `backend/app/exceptions.py`: add `OrderNotClosedError`, `EmailSendError`.
- `backend/app/error_handlers.py`: map the two new exceptions (409, 502).
- `backend/app/api/deps.py`: add `get_email_service`.
- `backend/app/main.py`: register the new email router under `/api` (if a dedicated router file is used).
- `backend/pyproject.toml`: add `aiosmtplib`, `email-validator` dependencies.
- `docker-compose.yml`: pass optional `SMTP_*` / `EMAIL_FROM` env vars to the `backend` service (empty defaults → demo logging sender).
- `frontend/src/api/types.ts`: add `SendOrderEmailPayload`, `OrderEmailResult`.
- `frontend/src/api/orders.ts`: add `sendOrderEmail(orderId, payload)`.
- `frontend/src/lib/validation.ts`: add `isValidEmail` + `validateEmailRecipients`.
- `frontend/src/routes/OrderAdminPage.tsx`: render `<OrderEmailCard />` when closed.
- `e2e/helpers/order.ts`: add `sendOrderEmail(request, orderId, payload)` helper.

## Testing Strategy

- **Unit tests** (warranted — new service + pure builder logic):
  - Directory: `backend/tests/unit/`
  - Naming: `test_{module}_unit.py`
  - `test_email_builder_unit.py`: body contains the prank line; body contains the full export text (header, grouped lines, total with price-less items as 0); subject includes the restaurant name; edge case empty-order body still renders header + `Total: €0.00`.
  - `test_email_service_unit.py`: happy path dispatches to the sender with the exact To/CC/BCC; order-not-found raises `OrderNotFoundError`; open order raises `OrderNotClosedError`; sender exception surfaces as `EmailSendError`; no `session.commit` is called and order state is untouched (AC6).
- **Integration tests** (ENABLED; warranted — new router endpoint):
  - Directory: `backend/tests/integration/`
  - `test_email_router_integration.py`: `200` happy path with a fake recording sender (dependency-overridden) asserting recipients + `status: "sent"`; `422` for empty/malformed `to`; `409` when the order is still open; `404` for a missing order; re-fetch the order after a successful send and assert `state == "closed"` is unchanged (AC6).
- **E2E tests** (ENABLED; warranted — admin-facing UI interaction):
  - Directory: `e2e/tests/`
  - File: `STORY-6_email-order-overview.spec.ts`
  - Card hidden while open and visible once closed (AC1); empty/malformed `to` shows an inline error and does not send (AC2/AC3); valid send shows Sent (AC6) using the default logging sender; preview shows the overview text and the prank line (AC4/AC5); order remains closed after send (AC6). CC/BCC delivery semantics (AC7) are verified at the integration level (recorded sender), not via the browser.
- **UAT scenarios** (OPTIONAL per CLAUDE.md; generated for completeness):
  - Directory: `e2e/uat/scenarios/` (Gherkin) and `e2e/uat/scripts/` (manual script)
  - One scenario per acceptance criterion plus an edge case (empty-order overview emailed).

## Acceptance Test Outline

| #   | Acceptance Criterion                            | E2E Strategy                                                               | UAT Scenario Sketch                                                                          |
| --- | ----------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1   | Email action only once closed                   | Assert `order-email-card` absent while open, visible after close+reload    | Given a closed order, When the admin views actions, Then an Email overview action is shown   |
| 2   | To required + CC/BCC optional, format-validated | Fill invalid `to`, assert `email-to-error`; valid CC/BCC accepted          | Given the email form, When CC is malformed, Then an inline CC error appears                  |
| 3   | Empty/malformed recipient blocks send           | Submit empty `to`, assert inline error and no Sent state                   | Given an empty To field, When the admin sends, Then it does not send and shows an error      |
| 4   | Subject/body contain full Story 5 overview      | Assert preview contains header, `{qty}x item`, `Total: €...`               | Given a closed order with selections, Then the email preview shows the consolidated overview |
| 5   | Playful prank line present                      | Assert preview contains the bill/joke line                                 | Then the body contains an obvious joke about the bill being sent shortly                     |
| 6   | Sent confirmation / error; state unchanged      | Valid send → `email-sent` visible; re-check order still closed             | Given a valid recipient, When the admin sends, Then "Sent" shows and the order stays closed  |
| 7   | CC/BCC receive mail; BCC hidden                 | Integration: recording sender asserts To/Cc headers + Bcc in envelope only | (Covered by integration test) Given CC and BCC, Then both receive the mail and BCC is hidden |
