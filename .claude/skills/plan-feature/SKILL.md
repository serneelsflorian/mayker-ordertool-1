---
name: plan-feature
description: Generate an architect plan for a single feature. Use when running /plan-feature {FEATURE_ID}, planning a feature before implementation, fetching a feature from the issue tracker, checking dependencies, creating a feature branch, producing a file manifest and API contract, and opening a draft plan PR. Also used to re-plan a feature from PR review comments. Runs autonomously (Claude Code on the web / Routines).
---

# Workflow: Plan Feature

**Trigger:** `/plan-feature {FEATURE_ID}`
**Run by:** Autonomous session (one per feature) — Claude Code on the web, `claude --remote`, or a local session.

> Delegation: the architecture work in Sections 6–9 should run through the `planner` subagent (`.claude/agents/planner.md`), which is read-mostly and may write only plan artifacts under `.claude/artifacts/`. The main session handles MCP status updates, branching, commit/push, and PR operations.

---

## 0. Load Context

1. Verify `.claude/project_state.json` exists. If not, **STOP:** "Run /init-project first to generate MCP configuration."
2. Read `CLAUDE.md` for project description, tech stack, test configuration, design reference config, API references, feature toggles, and architecture notes.
3. Read the standards in `.claude/rules/` (the universal ones are already in context via CLAUDE.md imports; load `testing_standards.md` for the testing-strategy section).
4. Read `.claude/project_state.json` for tracker configuration and status mapping.
5. Read `.claude/feature_map.md` to find this feature's metadata (`depends_on`, `branch`, `scaffold`).
6. If `FEATURE_ID` is not found in `feature_map.md`, **STOP:** "Feature {FEATURE_ID} not found in feature_map.md. Run /init-project to refresh."

---

## 1. MCP Verification

1. Verify issue tracker MCP is available. If not, **STOP** per `mcp_integration.md`.
2. Verify Git provider MCP is available. If not, **STOP** per `mcp_integration.md`.

---

## 2. Dependency Check

1. Read `depends_on` from `feature_map.md` for this feature.
2. For each dependency, query the issue tracker MCP for its current status.
3. Map each status via `reverse_status_mapping` in `project_state.json`.
4. If **any** dependency is not `done`, **STOP:** "⛔ BLOCKED: {FEATURE_ID} depends on {DEP_IDS}. All must be Done."
5. **Scaffold precedence gate.** The scaffold feature creates the project infrastructure every other feature builds on, but it is an *implicit* dependency that never appears in any `depends_on` list. Enforce it explicitly:
   - Identify the scaffold feature in `feature_map.md` (the row flagged `scaffold: ✅`).
   - If **this** feature is the scaffold feature, skip this gate.
   - Otherwise look up the scaffold feature's `external_id` in `project_state.json`, query its status via the issue tracker MCP, and map it through `reverse_status_mapping`.
   - If the scaffold feature is **not** `done`, **STOP:** "⛔ BLOCKED: {FEATURE_ID} cannot proceed until the scaffold feature {SCAFFOLD_ID} is Done — it creates the project infrastructure all features depend on."
   - If no feature is flagged as scaffold (e.g. an existing codebase with no scaffold phase), skip this gate.

---

## 3. Fetch Feature Details

1. Look up `FEATURE_ID` in `project_state.json` to get the `external_id`.
2. Call the issue tracker MCP to fetch the feature: title, description, acceptance criteria, priority, labels.
3. Check the current status:
   - If `done`: **STOP.** "Feature already Done."
   - If `in_progress` or `in_review`: **STOP.** "Feature is already being built or reviewed."
   - If `plan_review` or `ready_for_build`: The plan already exists. This is a **re-plan** — proceed to Section 3.1.
   - Otherwise: Proceed to Section 4 (new plan).

### 3.1 Re-Planning (existing plan)

When re-planning a feature that already has a plan:

1. Check if a PR exists for this feature's branch via Git provider MCP.
2. If a PR exists, fetch all review comments (both inline and general conversation comments).
3. Filter to unresolved/actionable comments — these are the feedback the re-plan should address.
4. Store the feedback for use in Section 8 (plan generation). The re-plan must address each comment.
5. If no PR or no comments found, proceed as a fresh re-plan (regenerate from scratch).

---

## 4. Update Status → Planning

Update the feature's status in the tracker to the `planning` mapped status.

---

## 5. Create Branch

1. Ensure the repo is on `main` (or `master`). Pull latest.
2. Read the branch name from `feature_map.md`.
3. If the branch already exists (re-planning), check it out and pull.
4. If the branch does not exist, create it from main: `git checkout -b {branch}`.

---

## 6. Read References

1. **Design reference:** Based on `CLAUDE.md` Design Reference mode:
   - `REPO_DIR`: Read files in the configured directory path. Understand layout, components, visual patterns.
   - `FIGMA_MCP`: If Figma MCP is available, fetch relevant frames. Also check if a committed `design-reference/` directory exists and compare for staleness — flag discrepancies in the plan.
   - `URL`: Note the URL in the plan for human reference. Do not attempt to fetch.
   - `NONE`: Skip design reference. Plan a clean, professional UI using the tech stack's conventions.
2. **API references:** If paths are listed in `CLAUDE.md` API References, read the referenced files. Parse endpoint definitions, request/response schemas, authentication patterns.

---

## 7. Detect Scaffold Requirement

Check whether this is the **first feature** being built in the project:

1. Read `feature_map.md` — does this feature have the `scaffold: ✅` flag?
2. Check the repository: do the main project directories exist? (e.g., does `backend/`, `frontend/`, or the primary app directory exist based on the tech stack in `CLAUDE.md`?)
3. If this is the scaffold feature AND project directories don't exist yet, the plan **must include infrastructure scaffolding** in addition to the feature itself. See Section 8 for what to include.

---

## 8. Generate Architect Plan

Produce a structured plan in `.claude/artifacts/{FEATURE_ID}/plan.md`:

```markdown
# Implementation Plan — {FEATURE_ID}: {Title}

## Feature
> {Full feature text from MCP}

## Acceptance Criteria
- [ ] {criterion 1}
- [ ] {criterion 2}

## Re-Plan Feedback (if applicable)
<!--
  Only include if this is a re-plan with PR review comments.
  List each comment and how the revised plan addresses it.
  Remove this section for new plans.
-->
- Comment: "{feedback}" → Addressed by: {how the plan changed}

## Plan Overview
{Brief summary of what will be built — which layers, which integrations}

## Infrastructure Scaffolding (scaffold feature only)
<!--
  Only include if this is the scaffold feature and project infrastructure
  doesn't exist yet. Remove this section for non-scaffold features.
-->
The following infrastructure will be created alongside the feature:

### Project Structure
- {directories to create, e.g., backend/, frontend/, e2e/}

### Docker Setup
- Dockerfile(s) for {services}
- docker-compose.yml with services: {list}
- .env.example with required environment variables

### Test Infrastructure
- Shared test configuration: {e.g., tests/conftest.py with DB container fixture}
- Test directories: {from CLAUDE.md Test Configuration}
- E2E framework config: {e.g., playwright.config.ts}
- UAT directory structure: {from CLAUDE.md Test Configuration}

### CI Pipeline Configuration
- {CI files are already generated by /init-project, but verify they reference the correct test commands and Docker services. Update if needed.}

## Frontend Plan
<!--
  Only include if the feature requires frontend work.
  If no frontend work is needed, write: "No frontend changes required."
-->
- Components to create/modify: {list with file paths}
- Routes: {new routes if any}
- State management: {approach}
- Design reference notes: {key visual decisions, or "AI freestyle" if NONE mode}

## Backend Plan
<!--
  Only include if the feature requires backend work.
  If no backend work is needed, write: "No backend changes required."
-->
- Endpoints: {method, path, purpose}
- Service layer: {business logic description}
- Repository layer: {data access patterns}
- Migrations: {schema changes if any}

## API Integration Plan
<!--
  Only include if the feature consumes external APIs.
  If not applicable, write: "No external API integration."
-->
- External endpoints to consume: {from API reference files}
- Client module: {file path for the API client}
- Authentication: {how to authenticate with the external API}
- Error handling: {specific error cases to handle}

## API Contract
<!--
  For internal APIs: define the contract between frontend and backend.
  For external APIs: define how the frontend will call the API client.
-->
- Method: {GET/POST/...}
- URL: {path}
- Request: {shape}
- Response: {shape with JSON example}

## File Manifest
<!--
  Exact relative file paths that will be created or modified.
  This is what the build agent follows.
-->
### New files
- {path}: {purpose}

### Modified files
- {path}: {what changes}

## Testing Strategy
- Unit tests: {what to test, which layer}
  - Directory: {from CLAUDE.md Test Configuration}
  - Naming: {from CLAUDE.md Test Configuration}
- Integration tests: {what to test} (or "Disabled per CLAUDE.md")
  - Directory: {from CLAUDE.md Test Configuration}
- E2E tests: {what to test} (or "Disabled per CLAUDE.md")
  - Directory: {from CLAUDE.md Test Configuration}
  - File: {from CLAUDE.md Test Configuration naming}
- UAT scenarios: {what to verify} (or "Disabled per CLAUDE.md")
  - Directory: {from CLAUDE.md Test Configuration}

## Acceptance Test Outline
| # | Acceptance Criterion | E2E Strategy | UAT Scenario Sketch |
|---|---|---|---|
| 1 | {criterion} | {how to test in browser} | Given..When..Then |
```

---

## 9. Generate Shared Risk Analysis

Write `.claude/artifacts/{FEATURE_ID}/shared_risks.md`:

```markdown
# Shared Risk Analysis — {FEATURE_ID}

## Files this feature will create
- {path}

## Existing files this feature will modify
- {path}: {what changes}

## Potential conflicts with other features in the same wave
<!--
  Cross-reference feature_map.md. If another feature in the same wave
  is likely to modify the same files, flag it here.
-->
- {path} may also be modified by {OTHER_FEATURE_ID} (same wave)
```

---

## 10. Commit and Push

1. Stage all new/modified files in `.claude/artifacts/{FEATURE_ID}/`.
2. Commit: `plan({FEATURE_ID}): architect plan for {short title}`
3. Push the branch: `git push -u origin {branch}`

---

## 11. Create or Update Draft PR

Via Git provider MCP:

1. Check if a PR already exists for this branch (re-planning case).
2. If **no PR exists:** Create a new draft PR:
   - **Title:** `feat({FEATURE_ID}): {title}`
   - **Body:** Plan summary (overview, key decisions, file manifest, shared risks). Reference the full plan at `.claude/artifacts/{FEATURE_ID}/plan.md`.
   - **Draft:** Yes — this PR is for plan review, not merge.
   - **Labels:** Add a "plan-review" label if the Git provider supports it.
3. If **PR already exists** (re-planning): Update the existing PR:
   - **Body:** Updated plan summary. Note which re-plan feedback was addressed.
   - If review comments were addressed, reply to each comment on the PR explaining the change.

---

## 12. Update Status → Plan Review

Update the feature's status in the tracker to the `plan_review` mapped status.

---

## 13. Summary

Report (in the agent's output):

```
Plan complete for {FEATURE_ID}: {title}

Branch:       {branch}
Plan:         .claude/artifacts/{FEATURE_ID}/plan.md
Shared risks: .claude/artifacts/{FEATURE_ID}/shared_risks.md
Draft PR:     {PR_URL}
Status:       Plan Review
Scaffold:     {yes — includes infrastructure setup | no}
Re-plan:      {addressed N review comments | fresh plan}

Next: Review the plan PR. When approved, move the feature to
"Ready for Build" in the tracker, then dispatch /build-feature {FEATURE_ID}.
```
