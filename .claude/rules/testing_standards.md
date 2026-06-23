<!--
  Phase-specific standard. NOT imported into CLAUDE.md. Loaded on demand by the
  build-feature and generate-tests skills and the builder subagent. Do not edit
  per project. Test conventions, CI execution model, coverage, anti-patterns,
  tier selection.
-->

# Testing Standards

> **Toggle configuration** for test layers (`Integration Tests`, `E2E Tests`, `UAT Generation`) is in `CLAUDE.md` Feature Toggles. This file defines the stack-agnostic conventions and CI execution model.

## 1. Test Conventions

### 1.1 Unit Test Conventions

- **Scope:** Individual functions and methods in isolation.
- **Target layers:** Service-layer business logic, utility functions, validators, data transformations, domain model behaviour.
- **Isolation:** All external dependencies (database, network, file system, other services/modules) must be mocked or stubbed.
- **Minimum cases per tested function:** Happy path, at least 1 edge case (boundary values, empty collections, null/optional fields), at least 1 error/exception case.

### 1.2 Integration Test Conventions

> **Toggle:** `Integration Tests` in `CLAUDE.md`.

- **Scope:** Multiple components working together against real infrastructure. Repository layer (real database queries) and Router layer (real HTTP request/response cycle).
- **Repository tests:** Insert + retrieve round-trip, query with filters, edge cases (empty result set, duplicate key / constraint violation).
- **Router tests:** Successful request/response cycle (200/201), validation error (400/422), not-found (404), one authorization scenario if the endpoint is protected.
- **Isolation:** Each test runs in a transaction that is rolled back, or uses fresh database state. Tests must not depend on execution order.
- **Shared fixtures:** Module-scoped real database instance fixture, session-scoped test client fixture, migration runner.

### 1.3 E2E Test Conventions

> **Toggle:** `E2E Tests` in `CLAUDE.md`.

- **Locator precedence** (most stable to least stable):
  1. Test attribute (`data-testid`)
  2. Accessibility role + name
  3. Text content
  4. CSS selector (last resort — fragile, avoid)
- **Test isolation:** Each spec must be independent. No spec may depend on another having run first. Specs may run in parallel.
- **Deterministic data:** Use seeded test data or API calls in setup/teardown. Do not depend on specific development database state.
- **No hardcoded waits:** Use framework-provided waiting mechanisms instead of fixed timeouts.
- **Screenshot on failure:** Configure the test runner to capture a screenshot on every failure.

### 1.4 UAT Conventions

> **Toggle:** `UAT Generation` in `CLAUDE.md`.

Two artifacts are generated per feature:

1. **Gherkin scenarios** — Given/When/Then specifications derived from acceptance criteria. Validated for well-formedness by CI on merge to main. (They are executed as browser tests only if a BDD runner such as `playwright-bdd` and matching step definitions are wired up; the framework does not generate those by default, so the executable browser coverage lives in the E2E `*.spec.ts` specs.)
2. **Manual UAT script** — Human-readable step-by-step clickthrough document with pass/fail checkboxes. For stakeholders, QA, or anyone verifying manually.

Both are committed to the feature branch alongside the code.

### 1.5 Test Data Strategy

- **Unit tests:** In-memory mocks and fixtures. No external dependencies.
- **Integration tests:** Real database instance via container framework. Seed data via repository calls or migration seed scripts. Clean up via transaction rollback.
- **E2E tests:** Use API calls in test setup to seed required data through the application's own endpoints.
- **UAT tests:** Reuse E2E seeding approach. Gherkin scenarios require representative data.

## 2. CI Execution Model

### 2.1 During `/build-feature` (Development)

| Test Layer | Written in | Executed in | Gate Behavior |
| --- | --- | --- | --- |
| Unit tests | Build phase | Build phase | Must pass before commit |
| Integration tests | Build phase | Build phase | Must pass before commit (if enabled) |

### 2.2 On PR Open and Pushes (CI)

| Test Layer | Written in | Executed by | Gate Behavior |
| --- | --- | --- | --- |
| Unit tests | Build phase | CI | Must pass. Failure blocks PR merge. |
| Integration tests | Build phase | CI | Must pass (if enabled). Failure blocks PR merge. |
| E2E tests | Build phase | CI | Depends on toggle: ENABLED = blocks, OPTIONAL = warns. |

### 2.3 On Merge to Main (CI)

| Test Layer | Written in | Executed by | Gate Behavior |
| --- | --- | --- | --- |
| UAT (Gherkin) | Build phase | CI | Failures prevent deployment. Results logged. |

The manual UAT script is not executed by CI — it is a human artifact.

## 3. Test Function Naming

- Names must describe the scenario being tested.
- Pattern: `test_{method_or_action}_{scenario}_{expected_outcome}`
- Examples:
  - `test_create_user_with_duplicate_email_raises_conflict`
  - `test_get_product_by_id_returns_not_found_when_missing`
  - `test_list_items_returns_empty_list_when_none_exist`

## 4. Coverage Requirements

| Tier | Minimum Requirement |
| --- | --- |
| Unit | 80% line coverage on service/business-logic layer. Every public service method: happy path, 1 edge case, 1 error case. |
| Integration | Every public repository method has at least one test. Every router endpoint: happy-path (200/201) and one error case (400/404/422). |
| E2E | Every acceptance criterion has at least one corresponding test case. At least one edge-case spec per feature. |
| UAT | One scenario per acceptance criterion plus at least one edge-case scenario per feature file. |

## 5. Anti-Patterns

- Do NOT write integration tests that mock the database — that is a unit test.
- Do NOT write E2E tests that bypass the UI (calling the API directly) — that is a router integration test.
- Do NOT share mutable state between tests.
- Do NOT rely on test execution order.
- Do NOT hardcode connection strings, ports, or hostnames — use dynamic allocation.
- Do NOT write assertion-free tests.
- Do NOT use CSS selectors in E2E tests when a `data-testid` exists.
- Do NOT duplicate E2E interaction assertions in UAT Gherkin scenarios.

## 6. Tier Selection Guidance

When generating tests, evaluate which tiers are warranted:

| Question | If YES → tier warranted |
| --- | --- |
| Does the code add or modify business logic in the service layer or utility functions? | **Unit tests** |
| Does the code add or modify repository code, database models, or migrations? | **Integration tests** (if enabled) |
| Does the code add or modify API endpoints (routers/controllers)? | **Integration tests** (if enabled) |
| Does the feature have user-facing acceptance criteria involving navigation or interaction? | **E2E tests** (if enabled) |

Multiple tiers can be warranted for a single feature. If a tier is not warranted, state why it was skipped (one sentence).
