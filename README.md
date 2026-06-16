# [Project Name]

Application repository. See below for setup instructions and [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for the full AI development workflow.

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

#### Example: GitHub as the Git provider (official remote server)

```bash
claude mcp add --scope project --transport http github https://api.githubcopilot.com/mcp/
```

Run `/mcp` to authenticate. Prefer a token instead? Add `--header "Authorization: Bearer ${GITHUB_PAT}"` and keep the real token in your environment, never in `.mcp.json`. See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for the secret-handling details.

#### Figma MCP (optional, only if Design Reference mode is FIGMA_MCP)

Add the Figma MCP server the same way (per its docs), then authenticate with `/mcp`.

Verify everything with `claude mcp list` (or `/mcp` inside a session). Linear and Jira publish their own MCP servers and follow the same two patterns.

> In Claude Code on the web / Routines, the same project-scoped `.mcp.json` is used and credentials are supplied by the environment rather than your local machine.

### Permissions & autonomy

Autonomous (cloud) runs must not stop to ask for approvals. The permission posture lives in `.claude/settings.json` (committed): an allow/deny list and `defaultMode`, plus hooks that enforce the test and format gates. See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) → Permissions & Autonomy.

### Repository secrets (for CI/CD)

<!--
  /init-project replaces this section with the exact secret names,
  where to get them, and platform-specific configuration instructions.
-->

The CI pipelines require these secrets to be configured in your repository:

| Secret | Purpose | Where to get it | Where to add it |
| --- | --- | --- | --- |
| [SECRET_NAME] | Auto-transition features to Done on merge | [PROVIDER_INSTRUCTIONS] | [PLATFORM_INSTRUCTIONS] |

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

<!--
  /init-project replaces this section with specifics about what
  pipelines were generated and what secrets are required.
-->

> CI pipeline details will be added by /init-project.
