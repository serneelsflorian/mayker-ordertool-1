# Project Configuration

<!--
  This is the ONLY file you customize per project.
  Everything in .claude/rules/ is universal and should not be edited.
  Fill in each section below before running /init-project.

  CLAUDE.md is Claude Code's persistent project memory: it is loaded into
  every session (interactive, Claude Code on the web, and Routines). Keep it
  lean — anything long or conditional lives in .claude/rules/ and is either
  @-imported below or loaded on demand by the skill that needs it.
-->

## Project Description

<!--
  Freeform description of what the app is, what it does, who it's for.
  This is what every AI agent reads to understand context. Be specific.
  Examples:
    "A HomeAssistant frontend dashboard consuming the HA REST API to display
     sensor data, control devices, and manage automations. No custom backend."
    "A fullstack inventory management system with a React frontend, FastAPI
     backend, and PostgreSQL database for warehouse operators."
    "A REST API microservice handling payment processing, integrating with
     Stripe and internal billing systems. No frontend."
-->

A group food-ordering web app for a single, preselected (hardcoded) restaurant.
An admin enters the restaurant's menu, generates a shareable link, and distributes
it to their team. Anyone holding the link (a "guest" — no account, identified by a
name they type) opens it, selects menu items with optional per-item notes and
quantities, and sees a running subtotal of only their own selections. When everyone
is done, the admin closes the order (final, non-reopenable) and exports a
consolidated list — grouped by item, with quantities and notes — as copy-paste
text to manually re-enter into Deliveroo. The admin can also email that overview to
a recipient (with optional CC/BCC). There is NO programmatic submission to Deliveroo.

Order state is shared across everyone with the link, keyed by an order identifier in
the share URL (e.g. `/order/:id`), and must persist across page refreshes and survive
across sessions/browsers. This is the central architectural constraint: state lives
server-side, not in browser-local storage.

Audience: small teams placing a shared group order. Single role (admin); everyone
else is an unauthenticated link-holder. Built as a demo.

## Tech Stack

<!--
  List the technologies to use. Can be as specific or general as needed.
  The AI will follow these choices for all code generation.
  Remove lines that don't apply (e.g., remove Backend if frontend-only).
-->

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, React Router (for `/order/:id` routing)
- **Backend:** FastAPI, Python 3.12+, Pydantic v2, SQLAlchemy 2.x (async), Uvicorn
- **Database:** PostgreSQL 16
- **Email:** server-side transactional email for Story 6 (e.g. SMTP or a provider like Resend/SendGrid), invoked from the FastAPI backend — never from the frontend
- **Testing:** pytest (unit/integration, with httpx async test client), Playwright (E2E, TypeScript)
- **Containerization:** Docker, Docker Compose (frontend, backend, Postgres)

## MCP Configuration

<!--
  MANDATORY. The framework requires both an issue tracker MCP and a
  Git provider MCP to be connected. Without these, agents cannot operate.

  The live connection details (server command, URL, auth) live in `.mcp.json`
  at the repo root (project scope, committed). The fields below are the
  human-readable identifiers agents use to look features up. `/init-project`
  reads these and generates `.claude/project_state.json` (the status map and
  feature registry).

  Set up the connections with:
    claude mcp add --scope project <name> ...
  then verify with `claude mcp list` (or `/mcp` inside a session).
-->

- **Issue Tracker Provider:** clickup
- **Issue Tracker Project:** DEMO - Order tool
- **Issue Tracker Team:** DEMO - Order tool (space) — workspace ID 30307190, Backlog list ID 901523929704
- **Git Provider:** github
- **Repository:** serneelsflorian/mayker-ordertool-1

## Design Reference

<!--
  How the AI accesses visual design specifications.
  Modes:
    REPO_DIR  — Figma-to-code export committed in the repo (best for cloud agents)
    FIGMA_MCP — Access Figma directly via MCP (requires Figma MCP connection)
    URL       — Public Figma/prototype URL (less reliable, access issues possible)
    NONE      — No design reference; AI freestyles the UI
-->

- **Mode:** REPO_DIR
- **Path/URL:** docs/prototype

## Test Configuration

<!--
  Directory paths and naming conventions for each test tier.
  Agents use these paths when generating and locating test files.
  Adjust to match your tech stack conventions.
-->

### Unit & Integration Tests

- **Unit test directory:** backend/tests/unit/
- **Integration test directory:** backend/tests/integration/
- **Unit test naming:** test_{module}_unit.py
- **Integration test naming:** test_{module}_integration.py
- **Shared fixtures file:** backend/tests/conftest.py

### E2E Tests

- **Framework:** Playwright (TypeScript)
- **Config file:** playwright.config.ts (project root)
- **Test directory:** e2e/tests/
- **Helpers directory:** e2e/helpers/
- **File naming:** {feature_id}_{slug}.spec.ts
- **Base URL:** http://localhost:5173

### UAT Tests

- **Scenarios directory:** e2e/uat/scenarios/
- **Scripts directory:** e2e/uat/scripts/
- **Screenshots directory:** e2e/uat/screenshots/ (gitignored)
- **Reports directory:** e2e/uat/reports/ (gitignored)
- **Gherkin file naming:** {feature_id}_{slug}.feature
- **Manual script naming:** {feature_id}_{slug}_uat_script.md

## Feature Toggles

<!--
  Control which phases run during /build-feature.
  ENABLED = runs and gates (blocks PR if failing)
  OPTIONAL = runs but failures don't block
  DISABLED = phase is skipped entirely
-->

- **E2E Tests:** ENABLED
- **UAT Generation:** OPTIONAL
- **Refactor Gate:** OPTIONAL
- **Integration Tests:** ENABLED

## Architecture Notes (optional)

<!--
  Any architectural guidance the AI should follow. Freeform prose.
  Examples:
    "This is a modular monolith — each domain module owns its own DB schema.
     Modules communicate via public interfaces, never import internals."
    "All API responses must follow the JSON:API specification."
    "The frontend uses atomic design: atoms → molecules → organisms."
  Remove this section if no special architectural guidance is needed.
-->

Two product decisions must NOT be re-derived or guessed by agents — they are fixed:

1. **Shared, server-persisted order state keyed by URL.** Order state is shared
   across everyone holding the link, keyed by the order identifier in the share URL
   (`/order/:id`). It is persisted server-side (Postgres) and must survive page
   refresh and work across different browsers/sessions. Do NOT implement order state
   with browser localStorage/sessionStorage — those do not satisfy the cross-session
   sharing requirement. The frontend reads/writes state via the FastAPI backend.

2. **Export merge rule.** In the consolidated export, line items merge ONLY when both
   the item AND its note match exactly. Items with different notes remain separate
   lines (e.g. `3x Margherita` but `1x Margherita - no onions` listed separately).

Other guidance:

- **Single role.** There is exactly one privileged role, the admin. Everyone else is
  an unauthenticated link-holder who self-identifies by typing a name; there are no
  accounts, logins, or permissions for guests. Guests can only see/edit/remove their
  own selections, never others'.
- **Order lifecycle is one-way.** open → closed. Closing is final and cannot be
  reopened from the UI. Closed state must be enforced server-side so add/edit/remove
  is rejected across all sessions, not just hidden in the UI.
- **Restaurant is hardcoded** for the demo (not editable, no restaurant CRUD).
- **No external integrations.** Deliveroo is manual re-entry only; there is no
  programmatic submission to Deliveroo or any third-party ordering API.
- **Email is server-side and demo-only (Story 6).** The "bill will be sent shortly"
  message is an intentional, clearly light-hearted prank. Send only to addresses the
  admin is entitled to use, keep the joke unambiguous in the body, and never send
  email from the frontend — route it through the backend.
- **Suggested layout:** `backend/` (FastAPI app + tests), `frontend/` (Vite/React),
  `e2e/` (Playwright + UAT), with Docker Compose at the root wiring frontend, backend,
  and Postgres.

---

## Universal Standards (always on)

<!--
  These standards apply to every session and are imported inline. They are the
  always-relevant ones. The phase-specific standards (testing, refactoring,
  review) are NOT imported here to keep this file lean — each skill and subagent
  that needs them references them on demand from `.claude/rules/`.

  Do not paste rule content here. Edit the files in `.claude/rules/` instead so
  there is a single source of truth.
-->

@.claude/rules/coding_standards.md
@.claude/rules/user_story_alignment.md
@.claude/rules/workflow_triggers.md
@.claude/rules/mcp_integration.md

Phase-specific standards (loaded on demand by the skills/subagents that need them):

- `.claude/rules/testing_standards.md` — loaded by the build-feature and generate-tests skills and the builder subagent.
- `.claude/rules/refactoring_standards.md` — loaded by the refactor skill and the build-feature refactor gate.
- `.claude/rules/review_standards.md` — loaded by the build-feature self-review step and the reviewer subagent.
