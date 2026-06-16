---
description: "Generate tests: evaluate warranted tiers and produce unit, integration, and/or browser E2E tests"
argument-hint: "[scope] [--tier unit|integration|e2e|all]"
model: haiku
---

Use the **generate-tests** skill at `@.claude/skills/generate-tests/SKILL.md` and follow it exactly.

Scope and flags: $ARGUMENTS

**Usage examples:**

- `/generate-tests backend` — analyse and generate tests for all backend source code.
- `/generate-tests US-101` — generate tests for the files produced by a specific story.
- `/generate-tests app/repositories/user_repo.py` — generate tests for a specific file or directory.
- `/generate-tests backend --tier integration` — only generate integration tests, skip tier evaluation.
- `/generate-tests US-101 --tier e2e` — only generate browser E2E specs for a story.
