<!--
  Phase-specific standard. NOT imported into CLAUDE.md. Loaded on demand by the
  refactor skill and the build-feature refactor gate. Do not edit per project.
  Refactoring analysis checklist, severity levels, scope rules, gate configuration.
-->

# Refactoring Standards

## 1. Purpose

Defines the analysis checklist, severity classification, and behavioural constraints for all refactoring — both the inline **Refactor Gate** in `/build-feature` and the standalone `/refactor` command.

## 2. Gate Configuration

> **Toggle:** `Refactor Gate` in `CLAUDE.md` Feature Toggles.
>
> - `ENABLED` (default) — Refactor gate runs during `/build-feature`; RECOMMENDED findings are applied automatically.
> - `DISABLED` — Gate is skipped during `/build-feature`; `/refactor` standalone still works.

## 3. Refactoring Categories

When analysing code, check for the following in order of impact:

| # | Category | Description |
| - | --- | --- |
| 1 | **Naming consistency** | Variables, functions, classes, files that deviate from `coding_standards.md` conventions. |
| 2 | **DRY violations** | Duplicate or near-duplicate logic that should be extracted into a shared function, hook, or utility. |
| 3 | **Dead code** | Unused imports, unreachable branches, commented-out blocks, unused variables/functions. |
| 4 | **Excessive complexity** | High cyclomatic complexity (deeply nested conditionals, long parameter lists, functions > ~50 LOC). |
| 5 | **Layered-architecture drift** | Business logic in routers/controllers, direct DB access outside repositories, UI logic in API service files. |
| 6 | **Import hygiene** | Circular imports, wildcard imports, imports from another module's internals. |
| 7 | **File & component structure** | Files with multiple exported components, mismatched file/component names. |

## 4. Severity Levels

| Level | Label | Meaning |
| --- | --- | --- |
| 1 | `RECOMMENDED` | Clear improvement with low risk — naming fix, dead-code removal, straightforward extraction. Applied automatically during Refactor Gate. |
| 2 | `OPTIONAL` | Subjective style preference or minor readability tweak with negligible impact. Informational only. |

## 5. Scope Rules (Behavioural Constraints)

Refactoring must **never** change observable behaviour:

1. **No new features** — Do not add functionality not present before.
2. **No API signature changes** — Public endpoint paths, request/response shapes, and status codes must remain identical.
3. **No database migrations** — Do not alter table schemas, column types, or constraints.
4. **Tests must pass** — After refactoring, all existing tests must still pass. If a test fails, revert the refactoring commit.
5. **No cross-module boundary changes** — Refactoring must stay within the module/service boundary of the target code.

## 6. Report Format

```
| # | File | Finding | Category | Severity | Proposed Change |
| - | ---- | ------- | -------- | -------- | --------------- |
| 1 | src/components/Login.tsx | Duplicate validation (lines 22–35 ≈ 48–61) | DRY violations | RECOMMENDED | Extract to useFormValidation hook |
```

## 7. Commit Convention

All refactoring commits must use the `refactor:` prefix:

- `refactor: extract shared validation hook`
- `refactor({FEATURE_ID}): remove dead imports and unused variables`

## 8. Artifact Persistence

When the Refactor Gate runs during `/build-feature`, persist the report to `.claude/artifacts/{FEATURE_ID}/refactor_report.md` regardless of outcome.

When `/refactor` runs standalone, persist to `.claude/artifacts/refactor_{scope}_{date}.md`.
