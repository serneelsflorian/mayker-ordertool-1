#!/usr/bin/env bash
#
# PreToolUse hook (matcher: Bash). Enforces the framework's test gate.
#
# Behaviour:
#   - Only acts when the Bash command being run is a `git push`.
#   - Detects the project's test setup and runs it.
#   - FAIL CLOSED: if tests genuinely fail, exit 2 to BLOCK the push and tell
#     the agent why (stderr is fed back to the model).
#   - FAIL OPEN: if there is no test setup yet (e.g. before the scaffold feature
#     has built the project), or the hook can't parse its input, exit 0 so the
#     workflow is never blocked spuriously.
#
# Wired in .claude/settings.json. Stack-agnostic; edit the detection below if
# your project uses a different test runner.

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

# Only gate on git push.
case "$CMD" in
  *"git push"*) ;;
  *) exit 0 ;;
esac

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$PROJECT_DIR" 2>/dev/null || exit 0

STATUS=0
RAN=0

# --- Python (pytest) -------------------------------------------------------
if [ -f pyproject.toml ] || [ -f pytest.ini ] || [ -f setup.cfg ] || [ -d tests ]; then
  if command -v pytest >/dev/null 2>&1; then
    echo "[test-gate] running: pytest -q" >&2
    pytest -q || STATUS=$?; RAN=1
  elif command -v python3 >/dev/null 2>&1 && python3 -c "import pytest" >/dev/null 2>&1; then
    echo "[test-gate] running: python3 -m pytest -q" >&2
    python3 -m pytest -q || STATUS=$?; RAN=1
  fi
fi

# --- Node (npm test) -------------------------------------------------------
if [ "$STATUS" = "0" ] && [ -f package.json ]; then
  if grep -q '"test"' package.json 2>/dev/null && ! grep -q 'no test specified' package.json 2>/dev/null; then
    if command -v npm >/dev/null 2>&1; then
      echo "[test-gate] running: npm test" >&2
      npm test --silent || STATUS=$?; RAN=1
    fi
  fi
fi

if [ "$RAN" = "0" ]; then
  echo "[test-gate] no test setup detected — allowing push (fail-open)." >&2
  exit 0
fi

if [ "$STATUS" != "0" ]; then
  echo "⛔ test-gate: tests failed (exit $STATUS). Fix the failing tests before pushing." >&2
  exit 2
fi

echo "[test-gate] tests passed — allowing push." >&2
exit 0
