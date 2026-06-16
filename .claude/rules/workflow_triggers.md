<!--
  Universal standard. Imported into CLAUDE.md (always on). Do not edit per project.
  Slash-command mapping, operational behaviour, git conventions.
-->

# Workflow Triggers & Operational Behaviour

## 1. Command Reference

Each command is a thin shim in `.claude/commands/` that invokes the matching **skill** in `.claude/skills/`. The skill holds the full multi-phase procedure and auto-loads (by its description) when relevant — including in Claude Code on the web and Routines.

| Command | Command file | Skill | Purpose |
| --- | --- | --- | --- |
| `/init-project` | `.claude/commands/init-project.md` | `.claude/skills/init-project/SKILL.md` | One-time project setup (local, interactive) |
| `/plan-feature {FEATURE_ID}` | `.claude/commands/plan-feature.md` | `.claude/skills/plan-feature/SKILL.md` | Generate architect plan for one feature |
| `/build-feature {FEATURE_ID}` | `.claude/commands/build-feature.md` | `.claude/skills/build-feature/SKILL.md` | Implement one feature from an approved plan |
| `/revise-feature {FEATURE_ID}` | `.claude/commands/revise-feature.md` | `.claude/skills/revise-feature/SKILL.md` | Apply revision based on PR review comments |
| `/refactor frontend\|backend\|{FEATURE_ID}` | `.claude/commands/refactor.md` | `.claude/skills/refactor/SKILL.md` | Standalone code quality scan and refactoring |
| `/generate-tests {scope} [--tier]` | `.claude/commands/generate-tests.md` | `.claude/skills/generate-tests/SKILL.md` | Generate tests for a feature, module, or scope |

Do not guess or summarize — read the command file (which invokes the skill) and follow the skill's instructions.

## 2. Subagents

The plan / build / review split is expressed with dedicated subagents in `.claude/agents/`. The skills delegate to them:

| Subagent | Role | Permissions |
| --- | --- | --- |
| `planner` | Architect plans (used by `/plan-feature`) | Read-mostly; writes only plan artifacts under `.claude/artifacts/` |
| `builder` | Implementation + tests (used by `/build-feature`) | Read/write code, run tests, commit and push |
| `reviewer` | Self-review against `review_standards.md` | Read-only; cannot edit, run, or commit |

The reviewer is intentionally read-only so it cannot quietly fix what it is meant to critique. It reports findings back; the builder applies the fixes.

## 3. Operational Behaviour

- **No TODO placeholders:** Do not generate code with "TODO: Implement logic" or similar. Write the full implementation.
- **Response format:** Be concise. Use Markdown for all code blocks.
- **MCP mandatory:** All commands require MCP connections (issue tracker + Git provider). Each skill handles its own MCP verification at startup. If MCP is unavailable, the skill stops with the error defined in `mcp_integration.md`.
- **Config required:** All commands (except `/init-project`) require `.claude/project_state.json` to exist. If missing, stop: "Run /init-project first to generate MCP configuration."
- **Autonomy compatible:** All commands except `/init-project` are designed to run autonomously without human interaction during execution. Checkpoints that require human input exist only in `/init-project` (which is run in a local, interactive Claude Code session). Fully unattended surfaces (Routines, GitHub Actions, headless `claude -p`) cannot answer interactive prompts — do not run `/init-project` there.
- **Permissions:** Autonomous runs rely on the permission posture in `.claude/settings.json` so agents do not block on approvals. See `docs/DEVELOPMENT.md` → Permissions & Autonomy.

## 4. Git Conventions

- **Branching:** One branch per feature. Branch names are defined in `feature_map.md` (prefix `feature/`).
- **Commits:** Use semantic commit messages:
  - `feat({FEATURE_ID}): ...` for new features
  - `fix({FEATURE_ID}): ...` for bug fixes
  - `refactor({FEATURE_ID}): ...` for code-quality improvements
  - `test({FEATURE_ID}): ...` for test additions
  - `plan({FEATURE_ID}): ...` for architect plans
  - `chore: ...` for maintenance
- **Source of truth:** Git is the master record. Never rely on local IDE history as the final state.
