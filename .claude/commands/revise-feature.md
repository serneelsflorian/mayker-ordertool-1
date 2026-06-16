---
description: "Revise feature: apply revisions based on PR review comments — read feedback via Git MCP, fix, re-test, push"
argument-hint: "[FEATURE_ID]"
model: sonnet
---

Use the **revise-feature** skill at `@.claude/skills/revise-feature/SKILL.md` and follow it exactly. Delegate fixes to the `builder` subagent.

Feature to revise: $ARGUMENTS

**Usage examples:**

- `/revise-feature US-101` — read PR review comments for feature US-101 and apply fixes.
