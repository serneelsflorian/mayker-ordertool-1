---
description: "Refactor code: scan frontend, backend, or a single feature for code-quality improvements"
argument-hint: "[frontend | backend | FEATURE_ID]"
model: haiku
---

Use the **refactor** skill at `@.claude/skills/refactor/SKILL.md` and follow it exactly.

Refactor target: $ARGUMENTS

**Usage examples:**

- `/refactor frontend` — scan and refactor all frontend code (detected by framework, not by folder).
- `/refactor backend` — scan and refactor all backend code (detected by framework, not by folder).
- `/refactor US-101` — scan and refactor the files from a specific implemented feature.
