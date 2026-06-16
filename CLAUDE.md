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

[TO BE COMPLETED — describe what the app is, what it does, and who it is for.]

## Tech Stack

<!--
  List the technologies to use. Can be as specific or general as needed.
  The AI will follow these choices for all code generation.
  Remove lines that don't apply (e.g., remove Backend if frontend-only).
-->

- **Frontend:** [TO BE COMPLETED — e.g. React, TypeScript, Vite, Tailwind CSS]
- **Backend:** [TO BE COMPLETED — e.g. FastAPI, Python 3.12+, Pydantic]
- **Database:** [TO BE COMPLETED — e.g. PostgreSQL]
- **Testing:** [TO BE COMPLETED — e.g. pytest (unit/integration), Playwright (E2E)]
- **Containerization:** [TO BE COMPLETED — e.g. Docker, Docker Compose]

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

- **Issue Tracker Provider:** [TO BE COMPLETED — linear | clickup | jira]
- **Issue Tracker Project:** [REPLACE — your project name as it appears in the workspace]
- **Issue Tracker Team:** [REPLACE — your team/space name, if applicable]
- **Git Provider:** [TO BE COMPLETED — github | gitlab | bitbucket]
- **Repository:** [REPLACE — owner/repo-name]

## Design Reference

<!--
  How the AI accesses visual design specifications.
  Modes:
    REPO_DIR  — Figma-to-code export committed in the repo (best for cloud agents)
    FIGMA_MCP — Access Figma directly via MCP (requires Figma MCP connection)
    URL       — Public Figma/prototype URL (less reliable, access issues possible)
    NONE      — No design reference; AI freestyles the UI
-->

- **Mode:** [TO BE COMPLETED — REPO_DIR | FIGMA_MCP | URL | NONE]
- **Path/URL:** [TO BE COMPLETED]

## API References (optional)

<!--
  External API specifications the project consumes. List file paths
  (committed to the repo) or URLs. Supported formats: OpenAPI/Swagger
  YAML/JSON, Postman collection JSON, or plain markdown endpoint docs.
  Remove this section entirely if not applicable.
-->

[TO BE COMPLETED or remove this section if not applicable.]

## Test Configuration

<!--
  Directory paths and naming conventions for each test tier.
  Agents use these paths when generating and locating test files.
  Adjust to match your tech stack conventions.
-->

### Unit & Integration Tests

- **Unit test directory:** [e.g. tests/unit/]
- **Integration test directory:** [e.g. tests/integration/]
- **Unit test naming:** [e.g. test_{module}_unit.py]
- **Integration test naming:** [e.g. test_{module}_integration.py]
- **Shared fixtures file:** [e.g. tests/conftest.py]

### E2E Tests

- **Framework:** [e.g. Playwright (TypeScript)]
- **Config file:** [e.g. playwright.config.ts (project root)]
- **Test directory:** [e.g. e2e/tests/]
- **Helpers directory:** [e.g. e2e/helpers/]
- **File naming:** [e.g. {feature_id}_{slug}.spec.ts]
- **Base URL:** [e.g. http://localhost:5173]

### UAT Tests

- **Scenarios directory:** [e.g. e2e/uat/scenarios/]
- **Scripts directory:** [e.g. e2e/uat/scripts/]
- **Screenshots directory:** [e.g. e2e/uat/screenshots/ (gitignored)]
- **Reports directory:** [e.g. e2e/uat/reports/ (gitignored)]
- **Gherkin file naming:** [e.g. {feature_id}_{slug}.feature]
- **Manual script naming:** [e.g. {feature_id}_{slug}_uat_script.md]

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

[TO BE COMPLETED or remove this section if no special guidance is needed.]

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
