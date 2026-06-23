#!/usr/bin/env bash
#
# PreToolUse hook (matcher: Bash). Hard-enforces the framework branch naming.
#
# Why: the auto-Done pipeline (and the framework's feature-ID parsing) match the
# `feature/{FEATURE_ID}-{slug}` prefix on merge to main. Cloud dispatch surfaces
# (Claude Code on the web, Routines) start the session on an auto-generated
# branch such as `claude/<random-slug>`. If the agent commits or pushes there
# instead of switching to the feature branch, auto-Done cannot transition the
# tracker task and the branch convention is silently broken.
#
# Behaviour:
#   - Only acts when the Bash command is a `git commit` or `git push`.
#   - Allows the protected base branches (main / master / develop) so routine
#     maintenance is never blocked.
#   - Allows any `feature/...` branch.
#   - BLOCKS everything else (exit 2). stderr is fed back to the model, which
#     then switches to the correct branch and retries -- same pattern as
#     test-gate.sh.
#   - FAIL OPEN on anything it cannot parse (not a git repo, no input) so the
#     workflow is never blocked spuriously.
#
# Wired in .claude/settings.json.

set -uo pipefail

INPUT="$(cat)"

# Extract the bash command from the hook's stdin JSON.
CMD=""
if command -v python3 >/dev/null 2>&1; then
  CMD="$(printf '%s' "$INPUT" | python3 -c "import sys,json
try:
    d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))
except Exception:
    print('')" 2>/dev/null || true)"
fi
# Fallback: if parsing produced nothing, scan the raw payload.
[ -z "$CMD" ] && CMD="$INPUT"

# Only gate on git commit / git push.
case "$CMD" in
  *"git commit"*|*"git push"*) ;;
  *) exit 0 ;;
esac

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$PROJECT_DIR" 2>/dev/null || exit 0

# Resolve the current branch. Fail open if we cannot (detached HEAD, no repo).
BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
[ -z "$BRANCH" ] && exit 0
[ "$BRANCH" = "HEAD" ] && exit 0

case "$BRANCH" in
  feature/*)
    exit 0
    ;;
  main|master|develop)
    exit 0
    ;;
  *)
    cat >&2 <<'MSG'
==> branch-guard: refusing to commit/push on a non-feature branch.

This framework requires feature work to live on a 'feature/{FEATURE_ID}-{slug}'
branch. The auto-Done CI pipeline parses the feature ID from that prefix on
merge to main; a 'claude/*' (or any other) branch breaks that match.

Switch to the feature branch for this task before committing or pushing. The
correct name is in feature_map.md (column 'branch'). For example:

    git checkout -b feature/STORY-3-guest-joins-adds-items
    # or, to rename the current auto-generated branch in place:
    git branch -m feature/STORY-3-guest-joins-adds-items

Then re-run your git command.
MSG
    exit 2
    ;;
esac
