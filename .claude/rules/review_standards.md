<!--
  Phase-specific standard. NOT imported into CLAUDE.md. Loaded on demand by the
  build-feature self-review step and the reviewer subagent. Do not edit per project.
  Self-review checklist: security, scope containment, architecture, test coverage.
-->

# Review Standards

This checklist is executed as a self-review step during `/build-feature` (after implementation, before marking the PR ready) and is the prompt the dedicated `reviewer` subagent follows. It is also the reference for the standalone `/refactor` command's scope containment checks.

## 1. Architecture & Isolation

- **Monolith / Modular check:** Verify that no module imports internal classes from another module. Public interfaces only.
- **API boundary check:** If the project has multiple services, verify no synchronous cross-service calls that could cause cascading failures.
- **Layer discipline:** Verify no business logic in routers/controllers, no direct DB access outside repositories, no UI logic in API service files.

## 2. Security

- **No hardcoded credentials:** Check for hardcoded API keys, passwords, tokens, connection strings. All must come from environment variables.
- **Transactional boundaries:** Verify transactional boundaries are enforced in the service layer.
- **PII handling:** If the feature handles personal data, verify encryption at rest and in transit where applicable.
- **Input validation:** All external input (user input, API responses, query parameters) must be validated before use.

## 3. Scope Containment (Anti-Hallucination)

- **No gold plating:** Verify that NO features were added that were not explicitly in the feature's acceptance criteria from MCP.
- **Acceptance criteria mapping:** Every acceptance criterion must have corresponding implementation. No criterion left unimplemented.
- **No invented endpoints:** If the plan specifies 3 API endpoints, there should be exactly 3 (not 4, not 2).
- **Standards compliance:** Code follows `.claude/rules/coding_standards.md`.

## 4. Test Coverage Verification

- **Unit tests:** Verify unit tests exist for the service layer and cover: happy path, edge case, exception case.
- **Integration tests:** If enabled, verify integration tests exist for repository and router layers with required scenarios.
- **E2E test specs:** If enabled, verify E2E specs exist and each acceptance criterion has at least one corresponding test case.
- **Test attributes:** Verify frontend components include `data-testid` attributes on interactive elements and key content containers.
- **Do not run tests yourself during review** — just verify they exist and are structurally correct. Tests are executed during the build phase and by CI.

## 5. Code Quality

- **No TODO placeholders:** Verify no `TODO`, `FIXME`, or `HACK` comments left in the code.
- **No console output:** Verify no `print()`, `console.log()`, or debug statements left in production code.
- **Error handling:** Verify all error paths are handled, not just happy paths.
- **Consistent naming:** Verify naming follows the conventions in `coding_standards.md` Section 2.1 (backend) and Section 3.3 (frontend).

## 6. Self-Review Behaviour

When the self-review finds defects during `/build-feature`:

1. **Severity assessment:** Classify each defect as BLOCKING (must fix) or MINOR (should fix, not blocking).
2. **Auto-fix:** Attempt to fix all BLOCKING defects. Re-run affected tests after each fix.
3. **Retry limit:** Maximum 2 self-fix cycles. If defects persist after 2 cycles, log them in the PR description as known issues and proceed.
4. **No scope expansion:** Fixes must address the specific defect. Do not refactor unrelated code during a fix cycle.
