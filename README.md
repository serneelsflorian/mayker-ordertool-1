# Mayker Order Tool

A group food-ordering web app for a single, preselected restaurant. An admin enters the restaurant's menu, generates a shareable link, and distributes it to the team. Anyone with the link (a "guest", no account) opens it, self-identifies by name, selects items with optional per-item notes and quantities, and sees a running subtotal of their own selections. When everyone is done, the admin closes the order (final), exports a consolidated list grouped by item for manual re-entry into Deliveroo, and can email that overview. Order state lives server-side (Postgres), keyed by the order ID in the share URL (`/order/:id`), so it survives refreshes and works across browsers/sessions.

See below for setup instructions and [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for the full AI development workflow.

This project uses a Claude Code-driven, per-feature delivery framework: a human fills in `CLAUDE.md`, runs `/init-project` once, then dispatches autonomous Claude Code sessions (one per feature) through a fixed pipeline: plan → review → build → review → merge → auto-Done.

---

## Running the project

> Run instructions will be added when the first feature scaffolds the project infrastructure.

---

## Prerequisites

### Required MCP connections

This project's framework requires two MCP connections: an **issue tracker** (reading features, status, dependencies) and a **Git provider** (PRs, review comments, branches). Add both at **project scope** so they are written to `.mcp.json` and shared with the team via git.

`claude mcp add` takes one of two forms, depending on how the server runs:

- **Local server (stdio).** Claude launches the server on your machine, usually with `npx`. Credentials go after `--env`, then `--`, then the launch command:

  ```bash
  claude mcp add --scope project <name> --env KEY=value -- npx -y <package>
  ```

- **Remote server (HTTP).** Claude connects to a hosted URL with an auth header:

  ```bash
  claude mcp add --scope project --transport http <name> <url> --header "Authorization: Bearer <token>"
  ```

The `--` separates Claude's own flags (`--scope`, `--env`, `--transport`) from the command that starts the server. `<name>` is any label you choose (it becomes the key in `.mcp.json`).

#### Example: ClickUp as the issue tracker (official remote server, OAuth)

ClickUp's official first-party MCP server is remote and OAuth-authenticated (public beta), so there is no token to store:

```bash
claude mcp add --scope project --transport http clickup https://mcp.clickup.com/mcp
```

Then run `/mcp` and approve ClickUp in the browser (you choose the workspace there).

#### Example: GitHub as the Git provider (official remote server, PAT)

Authenticate GitHub with a **Personal Access Token in a header, not OAuth.** Claude Code's OAuth flow requires Dynamic Client Registration, which the GitHub MCP endpoint does not support — the interactive "Authenticate" path fails with *"Incompatible auth server: does not support dynamic client registration."*

```bash
export GITHUB_PAT=ghp_your_real_token   # keep the real token in your shell / CI secrets, never in .mcp.json
claude mcp add --scope project --transport http github \
  https://api.githubcopilot.com/mcp/ \
  --header 'Authorization: Bearer ${GITHUB_PAT}'
```

The single quotes stop your shell expanding `${GITHUB_PAT}` during `claude mcp add`, so `.mcp.json` stores only the variable name; Claude Code expands it at runtime. Then run `/mcp` to confirm GitHub is connected. See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for the secret-handling details.

#### Figma MCP (optional, only if Design Reference mode is FIGMA_MCP)

Add the Figma MCP server the same way (per its docs), then authenticate with `/mcp`.

Verify everything with `claude mcp list` (or `/mcp` inside a session). Linear and Jira publish their own MCP servers and follow the same two patterns.

> In Claude Code on the web / Routines, the same project-scoped `.mcp.json` is used and credentials are supplied by the environment rather than your local machine.

### Permissions & autonomy

Autonomous (cloud) runs must not stop to ask for approvals. The permission posture lives in `.claude/settings.json` (committed): an allow/deny list and `defaultMode`, plus hooks that enforce the test and format gates. See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) → Permissions & Autonomy.

### Repository secrets (for CI/CD)

The CI pipelines require this secret to be configured in the repository:

| Secret | Purpose | Where to get it | Where to add it |
| --- | --- | --- | --- |
| `CLICKUP_API_KEY` | Lets the auto-Done pipeline transition a feature's ClickUp task to **done** when its PR merges to `main` | ClickUp → Settings → Apps → API Token (personal token, `pk_...`) | GitHub → repo **Settings → Secrets and variables → Actions → New repository secret** |

### Development environment

> Specific requirements (Docker, Node.js, Python versions, etc.) will be documented here after the scaffold feature is built.

---

## Repository structure

```text
.
├── CLAUDE.md                       # Project configuration + always-on standard imports (the one file you customize)
├── .mcp.json                       # Live MCP server config (committed, project scope)
├── .claude/
│   ├── settings.json               # Permissions, hooks, and autonomy posture
│   ├── commands/                   # Slash-command shims (invoke the matching skill)
│   ├── skills/                     # Workflow procedures (one SKILL.md per command)
│   ├── agents/                     # Subagents: planner, builder, reviewer
│   ├── rules/                      # Universal AI agent standards (do not edit)
│   ├── hooks/                      # Deterministic gate scripts (test gate, formatter)
│   ├── project_state.json          # MCP status mapping + feature registry (generated)
│   ├── feature_map.md              # Feature dependencies and execution waves (generated)
│   └── artifacts/                  # Per-feature plans, reports, and scripts (generated)
├── docs/
│   └── DEVELOPMENT.md              # Full development workflow guide
└── design-reference/               # Figma-to-code export (optional, if applicable)
```

> Additional directories (`backend/`, `frontend/`, `e2e/`, etc.) appear once features scaffold the project.

---

## Development workflow

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for the complete guide. Quick summary:

1. Run `/init-project` locally (one-time setup)
2. Dispatch `/plan-feature {ID}` sessions for a wave of features (Claude Code on the web)
3. Review plan PRs
4. Mark approved features as "Ready for Build" in the tracker
5. Dispatch `/build-feature {ID}` sessions
6. Review implementation PRs
7. Merge → CI auto-transitions features to Done
8. Repeat for next wave

---

## CI/CD

Two GitHub Actions workflows are generated under `.github/workflows/`:

- **`pr-tests.yml`** — runs on PR open / push to a PR branch. A `detect` job inspects the repo layout, then guarded jobs run only when the relevant infrastructure exists: backend unit + integration tests (`pytest` against a Postgres 16 service), frontend lint + build (`npm`), and E2E tests (Playwright against the Docker Compose stack). Until the scaffold feature (STORY-1) creates `backend/`, `frontend/`, and `docker-compose.yml`, the guarded jobs skip, so the scaffold PR is never blocked by missing setup. E2E is ENABLED, so it blocks merge once present.
- **`auto-done.yml`** — runs when a PR merges to `main`. It extracts the feature ID from the branch name (`feature/{FEATURE_ID}-…`, matched against the known IDs in `.claude/project_state.json`), looks up the ClickUp task ID and the mapped `done` status, and transitions the task via the ClickUp REST API using `CLICKUP_API_KEY`. It then runs UAT Gherkin scenarios if any exist (UAT generation is OPTIONAL for this project).

Add the `CLICKUP_API_KEY` secret (see [Repository secrets](#repository-secrets-for-cicd) above) before merging the first feature, or the auto-Done step will fail.
