# Feature Map — Dependencies & Execution Waves

This file defines execution order and dependencies for all features.
Agents read this to check what blocks their feature. Status is tracked in the
issue tracker (ClickUp) via MCP, not here.

Feature IDs (STORY-N) map to ClickUp task IDs in `.claude/project_state.json`.

---

## Wave 1 — Foundation

| Feature ID | Title | depends_on | branch | scaffold | shared_risk_notes |
| --- | --- | --- | --- | --- | --- |
| STORY-1 | Admin starts a group order and enters the menu | [] | feature/STORY-1-admin-starts-group-order | ✅ | Establishes frontend, backend, Postgres schema, Docker Compose, test infra |

## Wave 2 — Sharing

| Feature ID | Title | depends_on | branch | scaffold | shared_risk_notes |
| --- | --- | --- | --- | --- | --- |
| STORY-2 | Admin generates a shareable link | [STORY-1] | feature/STORY-2-generate-shareable-link | | Adds order identifier + `/order/:id` routing on top of STORY-1 |

## Wave 3 — Guest ordering

| Feature ID | Title | depends_on | branch | scaffold | shared_risk_notes |
| --- | --- | --- | --- | --- | --- |
| STORY-3 | A guest joins via the link and adds items | [STORY-2] | feature/STORY-3-guest-joins-adds-items | | Introduces guest selections + per-guest status (Editing/Submitted) in shared state |

## Wave 4 — Closing

| Feature ID | Title | depends_on | branch | scaffold | shared_risk_notes |
| --- | --- | --- | --- | --- | --- |
| STORY-4 | Admin closes the order | [STORY-3] | feature/STORY-4-admin-closes-order | | Admin overview reads guest selections from STORY-3; adds one-way open→closed lifecycle |

## Wave 5 — Export & submit

| Feature ID | Title | depends_on | branch | scaffold | shared_risk_notes |
| --- | --- | --- | --- | --- | --- |
| STORY-5 | Admin exports the consolidated order | [STORY-4] | feature/STORY-5-export-consolidated-order | | Export merge rule (item + note); low overlap with STORY-7 |
| STORY-7 | Guest submits their order | [STORY-3, STORY-4] | feature/STORY-7-guest-submits-order | | ⚠️ Extends guest view (STORY-3) and admin overview badges (STORY-4); runs alongside STORY-5 but touches mostly separate files |

## Wave 6 — Email

| Feature ID | Title | depends_on | branch | scaffold | shared_risk_notes |
| --- | --- | --- | --- | --- | --- |
| STORY-6 | Admin emails the order overview (demo prank) | [STORY-5] | feature/STORY-6-email-order-overview | | Reuses the consolidated overview from STORY-5; adds server-side email |
