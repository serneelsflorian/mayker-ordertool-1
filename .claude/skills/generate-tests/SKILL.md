---
name: generate-tests
description: Generate tests for a feature, module, or scope. Use when running /generate-tests {scope} [--tier unit|integration|e2e|all], evaluating which test tiers are warranted, and producing unit, integration, and/or browser E2E specs following the project's testing standards and test-configuration paths. Scopes include backend, frontend, a feature ID, or a file/directory path. Runs autonomously or locally.
---

# Workflow: Generate Tests

**Trigger:** `/generate-tests {scope} [--tier unit|integration|e2e|all]`
**Run by:** Autonomous session or local Claude Code.

---

## 0. Parse Arguments

1. Read the argument(s) after `/generate-tests`.
2. Determine the **scope:**
   - `backend` — all backend source code
   - `frontend` — all frontend source code (E2E specs for UI components)
   - A feature ID (e.g., `US-101`) — files produced by that feature
   - A relative file or directory path — only that target
   - No argument: **STOP.** "Usage: `/generate-tests backend`, `/generate-tests frontend`, `/generate-tests {FEATURE_ID}`, or `/generate-tests path/to/module`."
3. Determine the **tier filter** (optional `--tier` flag):
   - `unit` | `integration` | `e2e` | `all`
   - Default: evaluate all tiers per Section 5.
   - Explicit tier overrides the decision framework. If the corresponding toggle in `CLAUDE.md` is `DISABLED`, warn: "The {TIER} toggle is DISABLED. Generating anyway per your override."

---

## 1. Load Context

1. Verify `.claude/project_state.json` exists. If not, **STOP:** "Run /init-project first to generate MCP configuration."
2. Verify Git provider MCP is available. If not, **STOP:** "Git provider MCP is required to create a PR for generated tests."
3. Read `CLAUDE.md` for tech stack, test configuration, and feature toggles.
4. Read `.claude/rules/testing_standards.md` for conventions, coverage, anti-patterns.
5. Read `.claude/rules/coding_standards.md` for naming, architecture, test attributes.

---

## 2. Resolve Scope

### 2.1 Backend Mode

- Detect backend stack from `CLAUDE.md`.
- Search repository for backend source files using framework heuristics.
- Exclude existing test files, frontend files, `node_modules/`.
- Collect as `SOURCE_FILES`.

### 2.2 Frontend Mode

- Detect frontend framework from `CLAUDE.md`.
- Search repository for frontend source files using framework heuristics:
  - **Include:** `*.tsx`, `*.jsx`, `*.ts`/`*.js` files that import the frontend framework, browser APIs, or are referenced by frontend entrypoints.
  - **Exclude:** Backend files, test files, `node_modules/`.
- Collect as `SOURCE_FILES`.
- Note: Frontend scope primarily generates **E2E test specs** (browser interaction tests). Unit tests are generated for utility functions and hooks if present.

### 2.3 Feature Mode

1. **Primary:** Read `.claude/artifacts/{FEATURE_ID}/plan.md`. Extract all file paths.
2. **Fallback:** Read `feature_map.md` for branch name. Run `git log main..{branch} --name-only --pretty=format:""` for changed files. Filter to source files.
3. If no files found: **STOP.** "No source files found for feature {FEATURE_ID}."
- Collect as `SOURCE_FILES`.

### 2.4 Path Mode

- Verify path exists. If directory, recursively collect source files. If single file, use that.
- Exclude existing test files.
- Collect as `SOURCE_FILES`.

---

## 3. Pre-Flight

1. Run `git status`. If uncommitted changes: **STOP.** "Uncommitted changes. Stash or commit first."
2. Note current branch.

---

## 4. Create Branch

- Backend: `test/backend-tests`
- Frontend: `test/frontend-tests`
- Feature: `test/{FEATURE_ID}-tests`
- Path: `test/{slug}-tests`

If exists, switch to it. If not, create from main.

---

## 5. Inventory & Analyze

1. **Inventory existing tests:** For each source file, check if tests already exist in the test directories defined in `CLAUDE.md` Test Configuration (matching by module name and tier).
2. **Tier evaluation** (skip if `--tier` override):

   | Question | If YES → tier warranted |
   |---|---|
   | Business logic in service layer or utility functions? | **Unit tests** |
   | Repository code, DB models, migrations? | **Integration tests** (if enabled) |
   | API endpoints (routers/controllers)? | **Integration tests** (if enabled) |
   | User-facing components or acceptance criteria with browser interaction? | **E2E tests** (if enabled) |

3. Check existing coverage. Skip already-covered source+tier combinations.
4. For each warranted tier, identify specific test cases:
   - **Unit:** Public methods × (happy path + edge case + error case)
   - **Integration:** Repository methods (insert+retrieve, query+filter, edge cases) + router endpoints (success, validation error, not-found, auth)
   - **E2E:** UI components → browser interactions, acceptance criteria → user flows

5. Produce a **Test Generation Plan:**

   ```
   | # | Source File | Layer | Tier | Test Cases | New File |
   | - | --- | --- | --- | --- | --- |
   | 1 | app/services/user.py | Service | Unit | 6 | tests/unit/test_user_unit.py |
   ```

6. If no tiers warranted: Report "No test generation needed." and stop.

---

## 6. Generate Tests

1. For each row in the plan, generate the test file following:
   - Write to directories specified in `CLAUDE.md` → Test Configuration
   - Follow naming conventions from `CLAUDE.md` → Test Configuration
   - Conventions from `testing_standards.md`
   - Coverage targets from `testing_standards.md` Section 4
   - Anti-patterns check from `testing_standards.md` Section 5
2. If shared test infrastructure is needed and doesn't exist (fixtures, conftest), generate it.

---

## 7. Run Tests

### 7.1 Unit + Integration

1. Execute generated tests.
2. If all pass: continue.
3. If failures: analyze. Fix test defects (max 2 retries). If source defects found, report them — do not modify source code.

### 7.2 E2E Specs

- Report: "E2E specs written. They will execute in CI when a PR is opened."

---

## 8. Commit

Stage and commit all new test files:
- Feature scope: `test({FEATURE_ID}): add {tiers} tests`
- Backend scope: `test: add {tiers} tests for backend`
- Frontend scope: `test: add {tiers} tests for frontend`
- Path scope: `test: add {tiers} tests for {path}`

---

## 9. Push and PR

1. Push: `git push -u origin {branch}`
2. Create PR via Git provider MCP.
3. Report PR URL and summary:

```
Test generation complete.

Files created:  {N}
Test cases:     {total} (unit: {u}, integration: {i}, e2e: {e})
Pass / Fail:    {pass} / {fail} (unit + integration only; E2E deferred to CI)
PR:             {PR_URL}
```
