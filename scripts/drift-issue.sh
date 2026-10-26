#!/bin/sh
# Keep exactly one open "ledger drift" issue in step with the latest drift report.
#
#   DRIFT=true|false  BODY=<markdown file>  sh scripts/drift-issue.sh
#
# Drift and no issue open: open one. Drift and one is open: update it in place.
# No drift and one is open: close it. Needs the gh CLI and GH_TOKEN (the workflow's token is enough).
set -eu

TITLE="Ledger drift: pinned versions are behind npm"
: "${DRIFT:?set DRIFT to true or false}"
: "${BODY:?set BODY to the markdown report}"

existing=$(gh issue list --state open --limit 200 --json number,title \
  --jq ".[] | select(.title == \"$TITLE\") | .number" | head -n 1)

if [ "$DRIFT" = "true" ]; then
  if [ -n "$existing" ]; then
    gh issue edit "$existing" --body-file "$BODY"
    echo "updated issue #$existing"
  else
    gh issue create --title "$TITLE" --body-file "$BODY"
    echo "opened a new drift issue"
  fi
elif [ -n "$existing" ]; then
  gh issue close "$existing" --comment "Every ledger is back in step with npm's latest release, so this is resolved."
  echo "closed issue #$existing"
else
  echo "no drift and no open issue: nothing to do"
fi
