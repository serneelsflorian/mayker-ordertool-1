<!--
  Universal standard. Imported into CLAUDE.md (always on). Do not edit per project.
  Stack-agnostic: code quality, naming, architecture patterns, component design, test attributes.
-->

# Coding Standards & Best Practices

## 1. General Principles

- **KISS (Keep It Simple, Stupid):** Avoid over-engineering. Write code that is easy to read and maintain.
- **DRY (Don't Repeat Yourself):** Abstract common logic, but be wary of hasty abstractions.
- **Clean Code:** Variable names must be descriptive. Comments should explain "Why", not "What".
- **No TODO placeholders:** Do not generate code with "TODO: Implement logic" or similar. Write the full implementation.

## 2. Backend Guidelines

> **Reference:** See `CLAUDE.md` for the specific backend language, framework, database, and testing libraries.

### 2.1 Naming Conventions

- **Classes / Models:** `PascalCase` (e.g., `UserService`, `CreateUserRequest`).
- **Functions / Variables:** Use the casing convention of the backend language defined in `CLAUDE.md` (e.g., `snake_case` for Python, `camelCase` for TypeScript/Java).
- **Constants:** `UPPER_SNAKE_CASE` (e.g., `MAX_RETRY_COUNT`).
- **Modules / Files:** Use the file naming convention of the backend language.
- **Contracts:** Use the language-appropriate mechanism for defining service interfaces (e.g., `Protocol` / `ABC` in Python, `interface` in TypeScript/Java).

### 2.2 Layered Architecture

When the project includes a backend with data persistence, follow the **Router → Service → Repository** pattern:

1. **Router:** Handles HTTP requests, path/query parameter validation via schemas, and dependency injection. **NO business logic here.**
2. **Service:** Contains business logic. **Apply transactional boundaries here** using the framework's transaction mechanism.
3. **Repository:** Interacts with the database via the query layer defined in `CLAUDE.md`.
4. **Schemas (DTOs):** Request/response validation and serialization models. Keep separate from domain models.
5. **Models (Domain):** ORM or query models representing the database structure.

When the project does not include a custom backend (e.g., frontend-only consuming external APIs), skip this pattern. The plan from `/plan-feature` determines which layers exist.

### 2.3 Error Handling & Logging

- **Exceptions:** Define custom exception classes inheriting from a base `AppException`.
- **Global Handling:** Register framework exception handlers to return consistent, machine-readable JSON error responses with standard HTTP status codes.
- **Logging:** Use the logging library defined in `CLAUDE.md`. **NEVER** use `print()` or `console.log()` for application logging. Exceptions and unexpected situations must be logged with context.

### 2.4 Unit Testing

- Use the unit testing framework defined in `CLAUDE.md`.
- Test individual functions/methods in isolation.
- Minimum cases per tested function: happy path, at least 1 edge case, at least 1 error/exception case.
- Coverage: Minimum 80% line coverage on business logic.

### 2.5 Integration Testing

> **Reference:** Toggle controlled by `Integration Tests` in `CLAUDE.md` Feature Toggles.

- **Scope:** Validate multiple components working together against real infrastructure — Repository layer against a real database, Router layer through the full HTTP request/response cycle.
- **Shared Fixtures:** Create a project-level shared test configuration file with: a module-scoped real database instance fixture, a session-scoped application test client fixture, and a migration runner.
- **Isolation:** Each test runs in a transaction that is rolled back after the test, or uses a fresh database state. Tests must not depend on execution order.

## 3. Frontend Guidelines

> **Reference:** See `CLAUDE.md` for the specific frontend framework, CSS library, and component conventions.

### 3.1 CSS Methodology

- **Utility-First:** Use the defined utility CSS framework directly in markup when applicable.
- **No Custom CSS:** Avoid writing raw CSS files unless absolutely necessary for complex animations.
- **Configuration:** Use the framework's config file for defining brand colors, fonts, and spacing.

### 3.2 Structure & Accessibility

- **Semantic HTML:** Use `<header>`, `<main>`, `<article>`, `<footer>` appropriately.
- **Responsiveness:** Mobile-first approach. Use responsive prefixes to build up from small screens.
- **Accessibility (a11y):** All interactive elements must have `aria-labels` if text is not descriptive. Images must have `alt` tags.

### 3.3 Component Design

- **Atomic Design:** Break down UI into small, reusable components (Atoms → Molecules → Organisms).
- **Localization:** Do not hardcode text strings; keep them ready for i18n.
- **Functional/Compositional:** Strictly use functional patterns (no class-based components unless specified in `CLAUDE.md`).
- **Hooks/Composables:** Use framework hooks for local state and side effects. Create custom hooks for reusable logic.
- **State Management:** Use native state APIs first (e.g., Context for React). Reach for complex state libraries only if native APIs are insufficient.
- **File Structure:** One component per file. File name matches component name.

### 3.4 Design Reference Consumption

When a design reference is configured in `CLAUDE.md`:

**What to extract:** Layout structure, spacing/padding relationships, color usage, typography, component hierarchy, interaction patterns (drawers, modals, dropdowns, navigation flows).

**What to ignore:** Component structure and file organization from the design tool, state management patterns from design-to-code output, SVG import patterns, naming conventions from the design tool.

**The Rewrite Rule:** When implementing from a design reference, **reimplement from scratch** using the standards in this file and the tech stack in `CLAUDE.md`. Do not adapt, refactor, or copy-paste design-to-code output.

When no design reference is configured (`Mode: NONE`), the AI implements a clean, professional UI following the tech stack's conventions and common design patterns.

### 3.5 Icon System

Two tiers:

1. **Generic UI Icons:** Use the icon library defined in `CLAUDE.md` for standard UI affordances (search, chevrons, close, add, edit, trash, check, info, warning, etc.).
2. **Domain-Specific Icons:** For icons unique to the application domain, create icon components in a dedicated `icons/` directory.

**Forbidden:** Inline `<svg>` elements in page or feature component files.

### 3.6 Test Attributes

- **Requirement:** Add `data-testid` attributes to all interactive elements and key content containers. These are consumed by E2E and UAT test generation.
- **Scope:** Buttons, inputs, links, toggles, form controls, tables, lists, cards, modals, drawers, tab panels, and any element representing a distinct interaction.
- **Format:** `data-testid="{component}-{element}"` (e.g., `data-testid="user-table"`, `data-testid="search-input"`).
- **Stability:** Test attributes must remain stable across refactors. They are part of the component's public contract for testing.
- **Uniqueness:** Each value must be unique within a page. For repeated components, use a suffix pattern (e.g., `{component}-{element}-{id}`).

## 4. API Integration Guidelines

When the project consumes external APIs (as defined in `CLAUDE.md` API References):

- **Client Layer:** Create a dedicated API client module for each external service. Do not scatter fetch/HTTP calls across components.
- **Error Handling:** All API calls must handle: network errors, timeout, authentication failures (401/403), rate limiting (429), server errors (5xx), and unexpected response shapes.
- **Type Safety:** Define request/response types for every endpoint consumed. Do not use `any` or untyped responses.
- **Authentication:** Externalize API keys and tokens via environment variables. Never hardcode credentials.
- **Retry Logic:** Implement retry with exponential backoff for transient failures (network errors, 5xx, 429) when appropriate.
