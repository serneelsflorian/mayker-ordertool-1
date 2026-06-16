---
description: "Build feature: implement one feature from an approved plan — code, test, review, E2E, UAT, refactor, PR"
argument-hint: "[FEATURE_ID]"
model: sonnet
---

Use the **build-feature** skill at `@.claude/skills/build-feature/SKILL.md` and follow it exactly. Delegate implementation to the `builder` subagent and the self-review step to the read-only `reviewer` subagent.

Feature to build: $ARGUMENTS

**Usage examples:**

- `/build-feature US-101` — implement feature US-101 from its approved plan.
