---
description: "Plan feature: fetch from MCP, check dependencies, create branch, generate architect plan, draft PR"
argument-hint: "[FEATURE_ID]"
model: opus
---

Use the **plan-feature** skill at `@.claude/skills/plan-feature/SKILL.md` and follow it exactly. Delegate the architecture work to the `planner` subagent.

Feature to plan: $ARGUMENTS

**Usage examples:**

- `/plan-feature US-101` — generate an architect plan for feature US-101.
