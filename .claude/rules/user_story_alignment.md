<!--
  Universal standard. Imported into CLAUDE.md (always on). Do not edit per project.
  Feature alignment and anti-hallucination: scope containment, no gold plating,
  clarify ambiguity.
-->

# Feature Alignment & Anti-Hallucination Rules

## 1. The Prime Directive

You are an execution engine, not a creative director. Your implementation must be strictly bounded by the feature's acceptance criteria as read from the issue tracker via MCP. **Do not invent features.**

## 2. Acceptance Criteria Analysis

Before generating a single line of code, the AI must parse the acceptance criteria:

1. List every criterion as a checkbox.
2. Verify if the current context provides enough information to satisfy each criterion.
3. If information is missing and cannot be inferred from the plan or `CLAUDE.md`, log the ambiguity in the PR description. Make a reasonable assumption and document it. Do not block the workflow.

## 3. Scope Containment (The "No Gold Plating" Rule)

- If the feature asks for a "Login Button", create a Login Button. Do NOT create a "Forgot Password" link unless explicitly requested.
- If the feature asks for an "API endpoint to list users", create the endpoint. Do NOT add pagination or sorting unless specified in the criteria or coding standards.
- Extra features introduce potential bugs and technical debt that were not asked for.

## 4. Handling Ambiguity

When a feature description is vague:

- **In interactive mode (local Claude Code session):** Ask the user for clarification before proceeding.
- **In autonomous/cloud mode (Claude Code on the web, Routines, headless):** Make a reasonable assumption based on the project description in `CLAUDE.md`, document the assumption in the PR description, and proceed. Do not block.

## 5. Definition of Done

A feature is considered implementation-complete when:

1. All acceptance criteria from MCP are met.
2. The code follows `coding_standards.md`.
3. Tests cover the happy path and relevant edge cases (per test toggles in `CLAUDE.md`).
4. The UI matches the design reference (if applicable, per `CLAUDE.md` Design Reference mode).
5. No hardcoded credentials or secrets are present in the code.
6. The self-review checklist from `review_standards.md` passes.

## 6. Context Awareness

- Always check existing files before creating new ones to avoid duplicates.
- Read `CLAUDE.md` Architecture Notes to ensure the new feature fits the defined architecture.
- If you notice a conflict between the feature requirements and the architecture, document it in the PR description.
