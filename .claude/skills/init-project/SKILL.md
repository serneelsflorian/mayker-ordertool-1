---
name: init-project
description: One-time project initialization for the AI delivery framework. Use when setting up a new project, running /init-project, connecting the issue tracker and Git provider MCPs, importing features from the tracker, generating the feature map, status mapping, project_state.json, and CI pipelines. Run interactively in a local Claude Code session.
---

# Workflow: Initialize Project

**Trigger:** `/init-project`
**Run by:** Human, in a local interactive Claude Code session.
**Run once** per project, or re-run when features change in the tracker.

> This skill is interactive: it stops and waits for human input at several checkpoints. It must NOT be run in fully unattended surfaces (Routines, GitHub Actions, headless `claude -p`), which cannot answer prompts.

---

## 0. Pre-Flight: MCP Verification

1. **Issue tracker MCP:** Verify the issue tracker MCP is connected (run `claude mcp list`, or `/mcp` in-session). Attempt to list projects/teams.
   - If not connected: **STOP.** "⛔ Issue tracker MCP is not connected. Add it with `claude mcp add --scope project <name> ...` before running /init-project. See docs/DEVELOPMENT.md for instructions."
2. **Git provider MCP:** Verify the Git provider MCP is connected. Attempt to list repositories.
   - If not connected: **STOP.** "⛔ Git provider MCP is not connected. Add it with `claude mcp add --scope project <name> ...` before running /init-project."
3. **`CLAUDE.md` check:** Read `CLAUDE.md`. Verify the following sections are filled in (not placeholder text):
   - Project Description
   - Tech Stack
   - MCP Configuration
   - Test Configuration
   - Feature Toggles
   - If placeholders remain: **STOP.** "Fill in all required sections in CLAUDE.md before running /init-project. Sections still containing placeholder text: {list}."

---

## 1. Tracker Status Setup

1. Query the issue tracker for all available statuses in the configured project/team.
2. Present the available statuses and propose a mapping:

   ```
   Framework Status    →  Your Tracker Status
   ─────────────────────────────────────────────
   todo                →  [best match, e.g. "Backlog"]
   planning            →  [best match, e.g. "In Progress"]
   plan_review         →  [best match, e.g. "In Review"]
   ready_for_build     →  [best match, e.g. "Ready"]
   in_progress         →  [best match, e.g. "In Progress"]
   in_review           →  [best match, e.g. "In Review"]
   done                →  [best match, e.g. "Done"]
   ```

   Note: Multiple framework statuses CAN map to the same tracker status. This is normal when the tracker has fewer statuses.

3. Also build the reverse mapping (every tracker status → a framework status or `null`).
4. Ask: "Does this status mapping look correct? (approve / modify)"
5. **Stop** and wait for user input. On `modify`, adjust and re-present.

---

## 2. Import Features

1. Fetch all features/issues from the configured project in the tracker via MCP.
   - For each feature, retain: external ID, human-readable identifier, title, description, acceptance criteria, priority, labels/epic grouping, current status.
2. Present a summary table:

   ```
   | Feature ID | Title                | Priority | Epic/Label      | Status |
   | ---------- | -------------------- | -------- | --------------- | ------ |
   | US-101     | User login           | P0       | Authentication  | Todo   |
   | US-102     | Dashboard layout     | P1       | UI Foundation   | Todo   |
   ```

3. Ask: "Imported {N} features. Does this look correct? (approve / modify)"
4. **Stop** and wait. On `modify`, adjust per instructions and re-present.

---

## 3. Dependency Analysis & Wave Assignment

1. Analyze all features for logical dependencies:
   - **Data dependencies:** Does this feature need an entity/table created by another feature?
   - **UI dependencies:** Does this feature need a navigation or layout component from another?
   - **Functional dependencies:** Does this feature extend another feature's functionality?
2. Rules:
   - Only list **direct** dependencies (not transitive).
   - Avoid circular dependencies. If detected, flag and ask user to resolve.
   - Features with no dependencies go into Wave 1.
3. Assign waves:
   - **Wave 1:** Features with `depends_on: []`
   - **Wave 2:** Features whose dependencies are all in Wave 1
   - **Wave N:** Features whose dependencies are all in Waves 1 through N-1
4. Generate branch names: `feature/{FEATURE_ID}-{short-slug}` (slug from title, lowercase, hyphens, max 40 chars).
5. **Shared risk analysis:** Within each wave, identify features likely to touch the same files. Flag these in the wave table.
6. **Scaffold recommendation:** Identify the simplest, most foundational feature in Wave 1. Recommend it as the **scaffold feature** — the one that should be planned and built first to create the initial project structure, test infrastructure, and CI configuration. Mark it in `feature_map.md` with a `scaffold: true` flag.
7. Present the wave structure with scaffold recommendation. Ask: "Dependency graph has {W} waves with {N} features. {FEATURE_ID} is recommended as the scaffold feature (built first). Approve? (approve / modify)"
8. **Stop** and wait.

---

## 4. Generate `feature_map.md`

Write `.claude/feature_map.md` using the approved wave structure:

```markdown
# Feature Map — Dependencies & Execution Waves

This file defines execution order and dependencies for all features.
Agents read this to check what blocks their feature. Status is tracked in the issue tracker (MCP), not here.

---

## Wave 1 — [Label]

| Feature ID | Title | depends_on | branch | scaffold | shared_risk_notes |
| --- | --- | --- | --- | --- | --- |
| US-101 | User login | [] | feature/US-101-user-login | ✅ | |
| US-102 | Dashboard layout | [] | feature/US-102-dashboard | | |

## Wave 2 — [Label]

| Feature ID | Title | depends_on | branch | scaffold | shared_risk_notes |
| --- | --- | --- | --- | --- | --- |
| US-103 | User management | [US-101] | feature/US-103-user-mgmt | | ⚠️ shares routes.ts with US-104 |
```

---

## 5. Generate `project_state.json`

Write `.claude/project_state.json` with:

- Issue tracker provider, MCP server name (as registered in `.mcp.json`), project/team IDs
- Git provider configuration
- The approved status mapping and reverse mapping
- Feature-to-external-ID mapping for every imported feature

See `.claude/rules/mcp_integration.md` Section 1.1 for the exact schema.

---

## 6. Generate CI Pipelines

Read the Git provider from `CLAUDE.md` → MCP Configuration to determine the CI platform:

- **GitHub** → `.github/workflows/*.yml`
- **GitLab** → `.gitlab-ci.yml`
- **Bitbucket** → `bitbucket-pipelines.yml`

### 6.1 PR Test Pipeline

Generate a CI pipeline that triggers on PR open and push to PR branch:

- Spin up required services (database, backend, frontend) using Docker Compose if applicable
- Run unit tests
- Run integration tests (if enabled in `CLAUDE.md`)
- Run E2E tests (if enabled in `CLAUDE.md`)
- Report results as PR status checks

### 6.2 Auto-Done Pipeline

Generate a CI pipeline that triggers when a PR is merged to main/master.

**IMPORTANT:** This pipeline runs in CI, NOT in Claude Code. It cannot use MCP. It must use the tracker's **REST API** directly.

The pipeline must:

1. Extract the feature ID from the branch name using pattern matching: `feature/{FEATURE_ID}-*` → capture `{FEATURE_ID}`.
2. Read `.claude/project_state.json` to look up the feature's `external_id` and the `done` status name from `status_mapping`.
3. Call the tracker's REST API to transition the feature to Done:
   - **Linear API:** `POST https://api.linear.app/graphql` with mutation to update issue state. Requires `LINEAR_API_KEY` secret.
   - **ClickUp API:** `PUT https://api.clickup.com/api/v2/task/{task_id}` with status field. Requires `CLICKUP_API_KEY` secret.
   - **Jira API:** `POST https://{domain}/rest/api/3/issue/{issue_id}/transitions` with transition ID. Requires `JIRA_API_TOKEN` and `JIRA_EMAIL` secrets.
4. Run UAT Gherkin scenarios (if enabled in `CLAUDE.md`).

> Branch-prefix note: this framework uses the `feature/` prefix (set in `feature_map.md`). If you dispatch via a surface that defaults to a different prefix (for example Routines' `claude/` branches), either keep `feature/` explicitly or widen the regex so the auto-Done step still extracts the feature ID.

### 6.3 Required Secrets

After generating the pipeline, tell the user exactly what secrets to add and where:

**For GitHub:**
```
Add these secrets in: GitHub → Repository → Settings → Secrets and variables → Actions → New repository secret

Required secrets:
  - LINEAR_API_KEY: Get from Linear → Settings → API → Personal API keys
    (or CLICKUP_API_KEY / JIRA_API_TOKEN depending on provider)
```

**For GitLab:**
```
Add these variables in: GitLab → Repository → Settings → CI/CD → Variables

Required variables:
  - LINEAR_API_KEY (masked, protected)
```

**For Bitbucket:**
```
Add these variables in: Bitbucket → Repository → Repository settings → Pipelines → Repository variables

Required variables:
  - LINEAR_API_KEY (secured)
```

---

## 7. Scaffold `CLAUDE.md` (if needed)

If `CLAUDE.md` still has placeholder sections (Design Reference, API References, Architecture Notes), remind the user to complete them. These are optional sections, so don't block — just warn.

---

## 8. Generate Documentation

### 8.1 `README.md`

**Overwrite** the template `README.md` with a project-specific version. Replace ALL placeholders:

- `[Project Name]` → actual project name from `CLAUDE.md`
- `[TRACKER_NAME]` → actual tracker name (e.g., "Linear")
- `[GIT_PROVIDER_NAME]` → actual provider name (e.g., "GitHub")
- The Prerequisites section must contain concrete, actionable setup steps (the exact `claude mcp add` commands for each provider) — not placeholders.
- The CI/CD section must list the exact secret names and where to configure them.
- The "Running the project" section stays as placeholder (filled by first `/build-feature`).

### 8.2 `docs/DEVELOPMENT.md`

**Overwrite** the template `docs/DEVELOPMENT.md` with a project-specific version. This means:

- Replace all generic references with project-specific values (tracker name, Git provider, secret names).
- Fill in the "Required Secrets" section with exact secret names, where to get them, and where to add them (per Section 6.3 above).
- Fill in MCP setup instructions with the specific `claude mcp add` commands and authentication steps for the chosen providers.
- Keep the framework overview, command reference, workflow guide, and testing sections as-is (they're already complete and project-agnostic).
- The "Development Environment" prerequisites section stays as placeholder (filled by first `/build-feature`).

---

## 9. Final Report

Present:

```
Project initialization complete.

Features imported: {N} across {E} epics
Waves:            {W} waves in feature_map.md
Scaffold feature: {FEATURE_ID} — {title} (build this first)
Project state:    .claude/project_state.json generated
CI pipelines:     {files} generated
Documentation:    README.md + docs/DEVELOPMENT.md updated

Required repository secrets:
  - {SECRET_NAME} — {purpose}
  Add at: {platform-specific location}

⚠️  IMPORTANT: Before dispatching any cloud agents, you must:
  1. Complete CLAUDE.md if any optional sections are still placeholder
  2. Add the repository secrets listed above
  3. Commit and push ALL generated files to the repo
     (Cloud sessions clone the repo — they need these files to be present)

Next steps after committing:
  1. Dispatch /plan-feature {SCAFFOLD_FEATURE_ID} first (scaffold feature)
  2. Review and approve the scaffold plan
  3. Dispatch /build-feature {SCAFFOLD_FEATURE_ID} — this creates project infrastructure
  4. After scaffold is merged, dispatch /plan-feature for remaining Wave 1 features
```

---

## 10. Re-Running `/init-project`

This workflow is safe to re-run:

- **Features:** Re-fetches from tracker. New features are added to `feature_map.md`. Existing features are preserved. Features removed from the tracker are flagged for user review.
- **Status mapping:** Re-verified. User can adjust.
- **project_state.json:** Regenerated with latest feature list.
- **CI pipelines:** Regenerated only if they don't exist. Existing pipelines are not overwritten (user may have customized them).
- **Documentation:** Regenerated with latest project-specific values.
- **Scaffold flag:** Re-evaluated. If the scaffold feature is already Done, no new scaffold is needed.
