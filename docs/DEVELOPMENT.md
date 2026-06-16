# AI Development Framework: Standard Operating Procedure

<!--
  This file is a TEMPLATE. When /init-project runs, it overwrites this file
  with a project-specific version where all placeholder sections are filled
  in with concrete values (tracker names, secret names, MCP setup commands).
  The framework overview and command reference sections are kept as-is.
-->

This document describes the full development workflow for this project, running on **Claude Code**. For a quick overview and how to run the application, see the [README](../README.md).

---

## Prerequisites

### 1. MCP connections (mandatory)

This framework requires two MCP (Model Context Protocol) connections: an **issue tracker** and a **Git provider**. **Without both, agents cannot operate.** They are defined in `.mcp.json` at the repo root (project scope, committed to git so the whole team shares them).

#### How `claude mcp add` works

There is no single `<server-spec>` value. The command takes one of two forms, depending on how the MCP server runs:

1. **Local server (stdio).** Claude starts the server process on your machine, almost always via `npx`. Credentials are passed with `--env`, and `--` separates Claude's own flags from the launch command:

   ```bash
   claude mcp add --scope project <name> --env KEY=value -- npx -y <package>
   ```

2. **Remote server (HTTP).** Claude connects to a hosted URL with an `Authorization` header:

   ```bash
   claude mcp add --scope project --transport http <name> <url> --header "Authorization: Bearer <token>"
   ```

`<name>` is any label you choose; it becomes the key under `mcpServers` in `.mcp.json`. `--scope project` is what writes the entry to the committed `.mcp.json` (omit it and the entry lands in your personal `~/.claude.json` instead).

#### Issue tracker MCP, worked example: ClickUp

ClickUp publishes an **official, first-party MCP server**: a remote (HTTP) server at `https://mcp.clickup.com/mcp`, OAuth-authenticated, currently in public beta. Prefer it over community `npx` packages.

```bash
claude mcp add --scope project --transport http clickup https://mcp.clickup.com/mcp
```

Because it uses OAuth, there is no token or team ID to paste or store: run `/mcp` inside a session and approve ClickUp in the browser (you choose the workspace there). The resulting `.mcp.json` entry holds only the URL:

```json
{
  "mcpServers": {
    "clickup": {
      "type": "http",
      "url": "https://mcp.clickup.com/mcp"
    }
  }
}
```

(Linear and Jira also publish official MCP servers, added the same way. If you instead use a community server that authenticates with an API key, see "Keeping token-based secrets out of git" below.)

#### Git provider MCP, worked example: GitHub

GitHub's official remote MCP server is also OAuth-capable:

```bash
claude mcp add --scope project --transport http github https://api.githubcopilot.com/mcp/
```

Run `/mcp` to authenticate. If you prefer a personal access token (repo scope) over OAuth, add an auth header that references an environment variable rather than a literal token:

```bash
claude mcp add --scope project --transport http github \
  https://api.githubcopilot.com/mcp/ \
  --header "Authorization: Bearer ${GITHUB_PAT}"
```

GitLab and Bitbucket follow the same pattern with their own MCP servers.

#### Keeping token-based secrets out of git

`.mcp.json` is committed, so never put a raw token in it. When a server needs a static token, reference an environment variable instead: write `'${GITHUB_PAT}'` (the single quotes stop your shell expanding it during `claude mcp add`), so `.mcp.json` stores only the variable name. Set the real value in your shell (or CI secrets), and Claude Code expands `${...}` at runtime:

```bash
export GITHUB_PAT=ghp_your_real_token
```

OAuth servers (such as the official ClickUp and GitHub ones above) avoid this entirely, since there is no token to store.

#### Figma MCP (optional)

Only if `CLAUDE.md` → Design Reference → Mode is `FIGMA_MCP`. Add the Figma MCP server the same way, then authenticate with `/mcp`.

#### Verify

```bash
claude mcp list        # both should show as connected
```

Inside a session, `/mcp` lists the servers and triggers any interactive auth flows.

> **Cloud surfaces:** In Claude Code on the web / Routines, the same project-scoped `.mcp.json` is used. Credentials are supplied by the environment (the web session or Routine secrets), not a developer's local machine. The "MCP is mandatory, stop if absent" guard still applies; only the place you set the secrets moves.

### 2. Permissions & Autonomy

Claude Code has an explicit permission system. Unattended runs must not block on approvals, so the framework ships a committed permission posture in **`.claude/settings.json`**:

- **`permissions.defaultMode: "acceptEdits"`**: file edits proceed without prompting.
- **`permissions.allow`**: the git / package-manager / test / formatter / Docker commands and MCP tools agents routinely need.
- **`permissions.deny`**: destructive or unsafe operations (`rm -rf`, `sudo`, force-push, reading `.env`, writing `.git/`).
- **Hooks**: deterministic gates (see [Hooks](#hooks) below).

Tune the allow/deny lists for your stack. For Claude Code on the web, the environment can also grant tool permissions; keep `.claude/settings.json` as the committed source of truth so local and cloud runs behave the same.

> Personal overrides go in `.claude/settings.local.json` (gitignored). Never put secrets in `.claude/settings.json`.

### 3. Repository Secrets (for CI/CD)

<!--
  /init-project replaces this with exact secret names and platform-specific
  instructions for the configured tracker and Git provider.
-->

The CI pipelines require secrets to be configured in your repository settings. These enable the auto-Done pipeline to transition features in your tracker when PRs are merged.

| Secret | Purpose | Where to get it | Where to add it |
| --- | --- | --- | --- |
| `{TRACKER}_API_KEY` | Auto-transition features to Done on merge | Your issue tracker's API settings | Your Git provider's repository secrets settings |

**Platform-specific instructions:**

- **GitHub:** Repository → Settings → Secrets and variables → Actions → New repository secret
- **GitLab:** Repository → Settings → CI/CD → Variables (set as masked + protected)
- **Bitbucket:** Repository → Repository settings → Pipelines → Repository variables (set as secured)

**Tracker-specific API key locations:**

- **Linear:** Linear → Settings → Account → API → Personal API keys → Create key
- **ClickUp:** ClickUp → Settings → Apps → API Token
- **Jira:** Atlassian → Account → Security → API tokens → Create API token (also requires `JIRA_EMAIL` secret)

### 4. Development Environment

> Specific requirements (Docker, Node.js, Python versions, etc.) depend on the tech stack configured in `CLAUDE.md` and will be documented here after the scaffold feature creates the project infrastructure.

---

## Framework Overview

### How It Works

This framework uses Claude Code to plan, implement, test, and deliver features autonomously. Each feature follows a structured pipeline: plan → review → build → review → merge.

The **primary dispatch surface is Claude Code on the web** (or `claude --remote`): each session runs in an isolated, Anthropic-managed cloud VM, clones the repo, and prepares a PR. Because each invocation is its own independent session, you can fire `/plan-feature US-101`, `US-102`, `US-103` in parallel, one per feature. See [Dispatching Sessions](#dispatching-sessions).

### Key Files

| File | Purpose | Who edits it |
| --- | --- | --- |
| `CLAUDE.md` | Project configuration (tech stack, MCP config, design refs, toggles) plus always-on standard imports | Human (once per project) |
| `.mcp.json` | Live MCP server definitions (project scope) | Human / `claude mcp add` |
| `.claude/settings.json` | Permissions, hooks, autonomy posture | Human (rarely) |
| `.claude/commands/*.md` | Slash-command shims (invoke the matching skill) | Nobody (template) |
| `.claude/skills/*/SKILL.md` | Workflow procedures for each command | Nobody (template) |
| `.claude/agents/*.md` | Subagents: planner, builder, reviewer | Nobody (template) |
| `.claude/rules/*.md` | Universal coding/testing/review standards | Nobody (template, shared across projects) |
| `.claude/hooks/*.sh` | Deterministic gate scripts (test gate, formatter) | Tune per stack |
| `.claude/project_state.json` | Tracker status mapping, feature registry | Generated by `/init-project` |
| `.claude/feature_map.md` | Feature dependencies and execution waves | Generated by `/init-project`, maintained manually if features change |
| `.claude/artifacts/{ID}/` | Per-feature plans, reports, UAT scripts | Generated by agents |

### Status Flow

Features move through these statuses. The framework maps them to your tracker's actual status names during `/init-project`.

```
Todo → Planning → Plan Review → Ready for Build → In Progress → In Review → Done
                       ↑                                              |
                       |              (revision needed)               |
                       └──────────────────────────────────────────────┘
```

| Status | Who sets it | How |
| --- | --- | --- |
| Todo | Default | Initial state in tracker |
| Planning | AI agent | `/plan-feature` starts |
| Plan Review | AI agent | `/plan-feature` creates draft PR |
| Ready for Build | **Human** | You approve the plan in the tracker |
| In Progress | AI agent | `/build-feature` starts |
| In Review | AI agent | `/build-feature` creates ready PR |
| Done | **CI pipeline** | Automated on merge to main |

---

## Commands, Skills, and Subagents

Each slash command is a thin shim in `.claude/commands/` that invokes the matching **skill** in `.claude/skills/`. The skill holds the full multi-phase procedure and auto-loads (by its description) even in Claude Code on the web and Routines. Commands also pin a **model** per task (strongest for planning, cheaper for mechanical work).

### Subagents

The plan / build / review split is expressed with dedicated subagents in `.claude/agents/`:

| Subagent | Role | Tools / Permissions | Model |
| --- | --- | --- | --- |
| `planner` | Architect plans (`/plan-feature`) | Read-mostly; writes only plan artifacts under `.claude/artifacts/` | opus |
| `builder` | Implementation + tests (`/build-feature`, `/revise-feature`) | Read/write code, run tests, commit and push | sonnet |
| `reviewer` | Self-review against `review_standards.md` | **Read-only** (Read, Grep, Glob); cannot edit, run, or commit | sonnet |

The reviewer is intentionally read-only so it cannot quietly fix what it is meant to critique. It reports findings; the builder applies the fixes.

### Hooks

`.claude/settings.json` wires two deterministic hooks (scripts in `.claude/hooks/`):

- **`test-gate.sh`** (PreToolUse on `git push`): detects the project's test runner and runs it before any push. **Fails closed** (blocks the push) if tests genuinely fail; **fails open** (allows) when no test setup exists yet, so it never blocks before the scaffold feature has built the project.
- **`format-on-edit.sh`** (PostToolUse on Write/Edit): formats the file just written (ruff/black for Python, prettier for JS/TS) if a formatter is installed. Advisory only; it never blocks.

These turn "the prompt says run tests" into an enforced gate. Both scripts are stack-agnostic; edit their detection blocks to match your toolchain.

### Per-Command Model Pinning

| Command | Model | Rationale |
| --- | --- | --- |
| `/init-project` | sonnet | Interactive setup and reasoning over dependencies |
| `/plan-feature` | opus | Architecture and planning, strongest model |
| `/build-feature` | sonnet | Capable implementation at lower cost |
| `/revise-feature` | sonnet | Targeted fixes |
| `/refactor` | haiku | Mechanical, low-risk cleanup |
| `/generate-tests` | haiku | Mechanical test generation |

Adjust the `model:` field in any `.claude/commands/*.md` to taste.

### `/init-project`

**Run locally, once per project.** Interactive setup wizard. Do not run in unattended surfaces (it stops for human input).

What it does:
1. Verifies MCP connections (`claude mcp list`)
2. Sets up tracker status mapping
3. Imports features from the issue tracker
4. Analyzes dependencies and assigns execution waves
5. Identifies the scaffold feature (first to be built)
6. Generates `feature_map.md`, `project_state.json`, CI pipelines, documentation

### `/plan-feature {FEATURE_ID}`

**Dispatch as an autonomous session, one per feature.** Delegates architecture to the `planner` subagent.

1. Checks dependencies (all must be Done)
2. Fetches feature details from MCP
3. Creates feature branch
4. Detects if this is the scaffold feature and includes infrastructure setup in the plan
5. Generates architect plan with file manifest, API contracts, testing strategy
6. Creates a draft PR with the plan
7. Updates tracker status to Plan Review

When re-planning (dispatched again for a feature with an existing plan): reads PR review comments via Git provider MCP and revises the plan to address the feedback.

### `/build-feature {FEATURE_ID}`

**Dispatch as an autonomous session, one per feature.** Requires an approved plan. Delegates implementation to the `builder` subagent and self-review to the read-only `reviewer` subagent.

1. Verifies feature is "Ready for Build" and plan exists
2. Scaffolds project infrastructure (if scaffold feature)
3. Implements frontend, backend, and/or API integration (as specified by the plan)
4. Generates and runs unit + integration tests
5. Generates E2E test specs (executed by CI, not the agent)
6. Self-reviews against coding and security standards
7. Runs refactor gate (if enabled)
8. Generates UAT artifacts (if enabled)
9. Updates README and DEVELOPMENT.md if infrastructure was created
10. Updates PR title and converts to ready-for-review
11. Updates tracker status to In Review

### `/revise-feature {FEATURE_ID}`

**Dispatch as an autonomous session.** For applying PR review feedback.

1. Reads PR review comments via Git provider MCP
2. Applies targeted fixes (via the `builder` subagent)
3. Re-runs affected tests
4. Pushes updates (PR auto-updates)
5. Does not change tracker status (feature stays In Review)

### `/refactor frontend|backend|{FEATURE_ID}`

**Dispatch as a session or run locally.** Standalone code quality improvement.

1. Scans target files against the refactoring checklist
2. Applies RECOMMENDED improvements
3. Verifies tests still pass
4. Creates PR with changes

### `/generate-tests {scope} [--tier unit|integration|e2e|all]`

**Dispatch as a session or run locally.** Standalone test generation.

Supported scopes: `backend`, `frontend`, a feature ID, or a file/directory path.

1. Analyzes source files to determine which test tiers are warranted
2. Generates tests following testing standards and `CLAUDE.md` Test Configuration paths
3. Runs unit + integration tests (E2E deferred to CI)
4. Creates PR with generated tests

---

## Dispatching Sessions

**Primary surface: Claude Code on the web (or `claude --remote`).** Connect the repo, then start one session per feature with the command as the prompt (e.g. `/plan-feature US-101`). Each session runs in its own isolated cloud VM, clones the repo (so it needs the committed `CLAUDE.md`, `.claude/`, and `.mcp.json`), and opens a PR. Fire several in parallel for a whole wave.

**Other surfaces (optional):**

- **Routines**: saved prompt + repo + connectors, triggered on a schedule / webhook / API call, fully unattended. The natural home for "when a feature moves to Ready for Build, auto-run `/build-feature`." Skills committed in the repo load automatically in a Routine. Do **not** run `/init-project` here (it is interactive).
- **GitHub Actions** (`anthropics/claude-code-action`): autonomous PR review/fixes on comment or cron triggers. A good home for `/revise-feature` and review edges, alongside the auto-Done pipeline.
- **Headless `claude -p`**: orchestrate dispatch from your own infrastructure.

All commands except `/init-project` are designed to run unattended. Interactive checkpoints exist only in `/init-project`.

---

## Development Workflow

### Phase 0: Project Setup (once)

1. Fill in `CLAUDE.md` with your project's configuration
2. Add the two MCP connections with `claude mcp add --scope project ...` and verify with `claude mcp list`
3. Run `/init-project` in a local interactive Claude Code session, and follow the wizard to map statuses, import features, and assign waves
4. Review generated files
5. **Commit and push everything to the repo** (cloud sessions clone these files)
6. Add required repository secrets for CI (see Prerequisites)

### Phase 1: Planning

1. Look at `feature_map.md`, identify the scaffold feature (marked ✅) and Wave 1
2. **Dispatch the scaffold feature first:** `/plan-feature {SCAFFOLD_ID}`
3. Review the scaffold plan PR; it should include infrastructure setup
4. For plans that need changes: leave PR comments, re-dispatch `/plan-feature` for that feature
5. For approved plans: move the feature to "Ready for Build" in your tracker
6. After the scaffold feature is built and merged, dispatch `/plan-feature` for remaining Wave 1 features
7. Review plan PRs, approve in tracker when ready

### Phase 2: Implementation

1. Dispatch one session per approved feature, each running `/build-feature {FEATURE_ID}`
2. Each session implements the plan, runs tests, and creates a ready-for-review PR
3. **Review implementation PRs**: standard code review
4. For PRs that need changes: leave review comments, dispatch `/revise-feature {FEATURE_ID}`
5. For approved PRs: merge to main → CI auto-transitions to Done

### Phase 3: Next Wave

1. Once all features in the current wave are Done (merged), the next wave's dependencies are satisfied
2. Return to Phase 1 for the next wave
3. Repeat until all waves are complete

### Parallel Execution

- Features within the same wave can be planned and built simultaneously by separate sessions
- Each feature runs on its own branch, with no conflicts between parallel sessions
- The `shared_risk_notes` column in `feature_map.md` flags potential file conflicts between features in the same wave
- Features from different waves should NOT run simultaneously if there are unresolved dependencies

### Adding Features After Initial Setup

If new features are added to the tracker after `/init-project`:

1. Re-run `/init-project` locally. It detects existing features and adds new ones.
2. The dependency graph and waves are regenerated. Existing features are preserved.
3. Commit and push the updated `feature_map.md` and `project_state.json`.
4. Dispatch sessions for the new features as part of their assigned wave.

---

## Feature Map

`.claude/feature_map.md` is the local source of truth for:

- **Dependencies:** Which features block which other features
- **Waves:** Grouping of features that can run in parallel
- **Branch names:** Consistent naming for feature branches (prefix `feature/`)
- **Scaffold flag:** Which feature sets up project infrastructure
- **Shared risks:** Flags for potential merge conflicts within a wave

Agents read this file to check dependencies. They then verify actual status via MCP.

---

## Testing

Testing is integrated into the build pipeline at multiple layers.

| Layer | Generated in | Executed in | Blocks merge? |
| --- | --- | --- | --- |
| Unit tests | `/build-feature` | During build (+ test-gate hook on push) + CI on PR | Yes |
| Integration tests | `/build-feature` | During build + CI on PR | Yes (if enabled) |
| E2E tests | `/build-feature` | CI on PR | Depends on toggle |
| UAT Gherkin | `/build-feature` | CI on merge to main | Yes (if enabled) |
| UAT manual script | `/build-feature` | Human tester | No (reference only) |

Test directory paths and naming conventions are configured in `CLAUDE.md` → Test Configuration. Toggle configuration is in `CLAUDE.md` → Feature Toggles.

---

## CI/CD

### PR Pipeline

Triggers on PR open and push:
- Runs unit tests
- Runs integration tests (if enabled)
- Runs E2E tests (if enabled)
- Reports results as PR status checks

### Merge Pipeline

Triggers when PR is merged to main:
- Extracts feature ID from branch name (`feature/{FEATURE_ID}-*`)
- Reads `.claude/project_state.json` for the feature's `external_id` and the `done` status name
- Calls the tracker's REST API to transition the feature to Done (using the repository secret)
- Runs UAT Gherkin scenarios (if enabled)

> The auto-Done pipeline runs in CI, not in Claude Code, so it uses the tracker REST API (not MCP). If you dispatch via a surface that uses a non-`feature/` branch prefix, align the branch regex accordingly.

### Required Secrets

> See Prerequisites → Repository Secrets above for exact names and setup instructions.

---

## Configuring the Framework

### For a New Project

1. Copy this template repository
2. Edit `CLAUDE.md`: this is the only file you need to customize
3. Add MCP connections (`claude mcp add --scope project ...`)
4. Run `/init-project`
5. Commit and push all generated files
6. Add repository secrets
7. Start dispatching sessions

### What NOT to Edit

- `.claude/commands/*.md`: Thin command shims. Same across all projects.
- `.claude/skills/*/SKILL.md`: Workflow procedures. Same across all projects.
- `.claude/agents/*.md`: Subagent definitions. Same across all projects.
- `.claude/rules/*.md`: Universal standards. Same across all projects.

These files are the framework itself. `.claude/settings.json` and `.claude/hooks/*.sh` may be tuned to your stack (allow/deny lists, formatter/test commands). Editing the rest means deviating from the template, which makes updates harder.
