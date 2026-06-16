---
name: refactor
description: Standalone code-quality refactoring. Use when running /refactor frontend, /refactor backend, or /refactor {FEATURE_ID}, scanning code against the refactoring checklist, applying low-risk RECOMMENDED improvements (naming, dead code, DRY, complexity, layering, imports), verifying tests still pass, and opening a refactor PR. Never changes observable behaviour.
---

# Workflow: Refactor

**Trigger:** `/refactor frontend` | `/refactor backend` | `/refactor {FEATURE_ID}`
**Run by:** Autonomous session or local Claude Code.

---

## 0. Parse Arguments

1. Read the argument after `/refactor`.
2. Determine the mode:
   - `frontend` → `MODE = frontend`
   - `backend` → `MODE = backend`
   - Anything else → treat as `FEATURE_ID`; `MODE = feature`
3. If no argument: **STOP.** "Usage: `/refactor frontend`, `/refactor backend`, or `/refactor {FEATURE_ID}`."

---

## 1. Load Context

1. Verify `.claude/project_state.json` exists. If not, **STOP:** "Run /init-project first to generate MCP configuration."
2. Verify Git provider MCP is available. If not, **STOP:** "Git provider MCP is required to create a PR for refactoring changes."
3. Read `CLAUDE.md` for tech stack.
4. Read `.claude/rules/refactoring_standards.md` for categories, severity, scope rules.
5. Read `.claude/rules/coding_standards.md` for conventions to check against.

---

## 2. Resolve Scope

Determine target files **by code type**, not by fixed folder names.

### 2.1 Frontend Mode

- Detect the frontend framework from `CLAUDE.md` Tech Stack.
- Search the repository for frontend files using language and framework heuristics:
  - **Include:** `*.tsx`, `*.jsx`, `*.ts`/`*.js` files that import the frontend framework, browser APIs, or are referenced by frontend entrypoints.
  - **Exclude:** Backend files (Python, server-side imports), test files, `node_modules/`.
- Collect as `TARGET_FILES`.

### 2.2 Backend Mode

- Detect the backend stack from `CLAUDE.md` Tech Stack.
- Search the repository for backend files using language and framework heuristics:
  - **Include:** Files that import the backend framework, data layer, or reside near known backend entrypoints.
  - **Exclude:** Frontend files, CSS, `node_modules/`.
- Collect as `TARGET_FILES`.

### 2.3 Feature Mode

1. **Primary:** Read `.claude/artifacts/{FEATURE_ID}/plan.md`. Extract all file paths from the File Manifest.
2. **Fallback:** If `plan.md` does not exist, read `feature_map.md` for the branch name. Run `git log main..{branch} --name-only --pretty=format:""` to list changed files. Classify each as frontend or backend.
3. If no files found: **STOP.** "No files found for feature {FEATURE_ID}."
- Collect as `TARGET_FILES`.

---

## 3. Pre-Flight

1. Run `git status`. If uncommitted changes exist: **STOP.** "Uncommitted changes detected. Stash or commit them first."
2. Note the current branch.

---

## 4. Create Branch

Create a dedicated refactoring branch:

- Frontend: `refactor/frontend-cleanup`
- Backend: `refactor/backend-cleanup`
- Feature: `refactor/{FEATURE_ID}-cleanup`

If branch exists, switch to it. If not, create from main.

---

## 5. Analyze

1. For each file in `TARGET_FILES`:
   - Read the file.
   - Evaluate against every category in `refactoring_standards.md` Section 3.
   - Classify each finding as `RECOMMENDED` or `OPTIONAL`.
2. Produce a **Refactoring Report** per the format in `refactoring_standards.md` Section 6.
3. If **no findings:** Report "No refactoring needed. Code looks clean." and stop.

---

## 6. Apply Changes

1. Apply all `RECOMMENDED` changes.
2. Commit: `refactor: {MODE} code quality cleanup` (or `refactor({FEATURE_ID}): code quality cleanup`)

---

## 7. Verify

1. Run available tests (unit, integration).
2. If **tests pass:** Continue.
3. If **tests fail:** Revert the commit (`git revert HEAD --no-edit`). Report "Refactoring reverted — tests failed." and stop.

---

## 8. Persist Report

Save the full report to:
- Feature mode: `.claude/artifacts/{FEATURE_ID}/refactor_report.md`
- Frontend/Backend mode: `.claude/artifacts/refactor_{MODE}_{date}.md`

---

## 9. Push and PR

1. Push the branch: `git push -u origin {branch}`
2. Create PR via Git provider MCP:
   - Title: `refactor: {MODE} code cleanup`
   - Body: Summary of findings and changes applied.
3. Report the PR URL.
