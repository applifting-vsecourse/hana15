#!/usr/bin/env bash
# Fails when a pull request deletes or rewrites lines in a test file.
# Adding new test files, tests or assertions is fine; weakening existing ones is not.
#
# Usage: scripts/check-test-changes.sh <base-ref>   (e.g. origin/main)
set -euo pipefail

base="${1:?usage: check-test-changes.sh <base-ref>}"

# --no-renames: a moved or renamed test file shows up as a delete plus an add,
# so it is reported instead of slipping through as "0 lines changed".
changes=$(git diff --numstat --no-renames "$base"...HEAD -- \
  ':(glob)**/*.spec.ts' \
  ':(glob)**/*.int-spec.ts' \
  ':(glob)**/*.test.tsx' \
  'apps/frontend/e2e')

if [ -z "$changes" ]; then
  echo "No test files changed."
  exit 0
fi

echo "Changed test files (added / deleted):"
echo "$changes"
echo

# numstat columns: added <tab> deleted <tab> path ("-" for binary files)
touched=$(echo "$changes" | awk -F'\t' '$2 != "0" { print "  " $3 " (-" $2 ")" }')

if [ -n "$touched" ]; then
  echo "These test files have deleted or rewritten lines:"
  echo "$touched"
  echo
  echo "Only added lines are allowed in tests. If a test must change, make that a deliberate, reviewed decision."
  exit 1
fi

echo "Only added lines in test files - OK."
