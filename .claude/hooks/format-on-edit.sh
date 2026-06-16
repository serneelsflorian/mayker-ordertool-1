#!/usr/bin/env bash
#
# PostToolUse hook (matcher: Write|Edit|MultiEdit). Formats the file that was
# just written so the refactor/review steps see tidy code. Advisory only:
# it NEVER blocks (always exits 0) and is a no-op if no formatter is installed.
#
# Wired in .claude/settings.json. Stack-agnostic; edit the detection below if
# your project uses a different formatter.

set -uo pipefail

INPUT="$(cat)"

FILE=""
if command -v python3 >/dev/null 2>&1; then
  FILE="$(printf '%s' "$INPUT" | python3 -c "import sys,json
try:
    d=json.load(sys.stdin); ti=d.get('tool_input',{}); print(ti.get('file_path') or ti.get('path') or '')
except Exception:
    print('')" 2>/dev/null || true)"
fi

[ -z "$FILE" ] && exit 0
[ -f "$FILE" ] || exit 0

case "$FILE" in
  *.py)
    if command -v ruff >/dev/null 2>&1; then
      ruff format "$FILE" >/dev/null 2>&1 || true
      ruff check --fix "$FILE" >/dev/null 2>&1 || true
    elif command -v black >/dev/null 2>&1; then
      black -q "$FILE" >/dev/null 2>&1 || true
    fi
    ;;
  *.ts|*.tsx|*.js|*.jsx|*.json|*.css|*.scss|*.md|*.html)
    if command -v prettier >/dev/null 2>&1; then
      prettier --write "$FILE" >/dev/null 2>&1 || true
    elif command -v npx >/dev/null 2>&1 && [ -f package.json ] && grep -q prettier package.json 2>/dev/null; then
      npx --no-install prettier --write "$FILE" >/dev/null 2>&1 || true
    fi
    ;;
esac

exit 0
