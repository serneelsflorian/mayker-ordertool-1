---
name: revise-feature
description: Apply revisions to a feature based on PR review comments. Use when running /revise-feature {FEATURE_ID}, addressing reviewer feedback on an implementation PR, reading PR review comments via the Git provider MCP, making targeted fixes, re-running affected tests, and pushing updates. Does not change tracker status. Runs autonomously.
---

# Workflow: Revise Feature

**Trigger:** `/revise-feature {FEATURE_ID}`
**Run by:** Autonomous session (one per feature) — Claude Code on the web, `claude --remote`, or a local session.

> Delegation: the fixes in Sections 6–7 run through the `builder` subagent (`.claude/agents/builder.md`). The test gate hook in `.claude/settings.json` runs on push.

---

## 0. Load Context

1. Verify `.claude/project_state.json` exists. If not, **STOP:** "Run /init-project first to generate MCP configuration."
2. Read `CLAUDE.md` for project context and feature toggles.
3. Read the standards in `.claude/rules/` (universal ones already in context via CLAUDE.md imports).
4. Read `.claude/project_state.json` for tracker and Git provider configuration.
5. Read `.claude/feature_map.md` to find this feature's branch name.

---

## 1. MCP Verification

1. Verify issue tracker MCP is available. If not, **STOP** per `mcp_integration.md`.
2. Verify Git provider MCP is available. **STOP** if not: "Git provider MCP is required for /revise-feature to read PR review comments."

---

## 2. Status Check

1. Fetch this feature's current status from MCP.
2. Expected: `in_review`.
   - If `todo`, `planning`, `plan_review`, `ready_for_build`: **STOP.** "Feature has not been built yet."
   - If `done`: **STOP.** "Feature is already Done."
   - If `in_progress`: Proceed (may be a retry or concurrent revision).
3. **Do not change the tracker status.** The feature remains In Review throughout the revision process. Status only changes when the PR is merged (→ Done via CI).

---

## 3. Checkout Branch

1. Checkout the feature branch from `feature_map.md`.
2. Pull latest commits on the branch.

---

## 4. Read PR Review Comments

1. Via Git provider MCP, find the open PR for this feature's branch.
   - If no PR found: **STOP.** "No open PR found for branch {branch}."
2. Fetch all review comments — both inline (file-level) and general conversation comments.
3. Filter to unresolved/actionable comments. Ignore resolved threads and approval comments.
4. If no actionable comments found: Report "No unresolved review comments found. PR may already be approved." and stop.

---

## 5. Read Plan for Context

Read `.claude/artifacts/{FEATURE_ID}/plan.md` to understand the original plan, acceptance criteria, and file manifest. This provides context for making targeted fixes.

---

## 6. Analyze and Apply Fixes

For each actionable review comment:

1. **Understand the feedback:** What file, what line, what's wrong, what's expected.
2. **Apply the fix:** Make the minimum change needed to address the comment. Follow `coding_standards.md`.
3. **Scope discipline:** Do not refactor unrelated code. Do not add features. Address only what was asked.

If a review comment is ambiguous or contradicts the plan:
- Make a reasonable interpretation.
- Add a reply-comment on the PR (via Git provider MCP) explaining the interpretation: "Interpreted this as {X}. Let me know if you meant something different."

---

## 7. Re-Test

1. Run unit tests. If any fail due to the changes, fix them.
2. Run integration tests (if enabled). If any fail, fix them.
3. If tests were modified as part of the fix, ensure the modifications are justified (the fix changed behaviour that the test was asserting, not that the test was wrong).

---

## 8. Commit and Push

1. Stage all changes.
2. Commit: `fix({FEATURE_ID}): address PR review feedback`
   - In the commit body, briefly list which review comments were addressed.
3. Push to the feature branch: `git push origin {branch}`
4. The PR auto-updates with the new commits.

---

## 9. Summary

Report:

```
Revision complete for {FEATURE_ID}: {title}

Addressed {N} review comments:
  - {file}: {brief description of fix}
  - {file}: {brief description of fix}

Tests: {all passing | N failures noted}
PR:    {PR_URL} (updated with new commits)

Next: Re-review the PR. If more changes needed, dispatch /revise-feature again.
      When ready, merge to main.
```
