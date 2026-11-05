#!/bin/sh
# Pull the expense app's source into .fetched/ (gitignored) before compose builds it.
# Source: a local checkout of our private Touchstone repo, at fixtures/expense-app (BD2 pending).
# Usage: QA_BENCH_EXPENSE_APP_DIR=/path/to/touchstone/fixtures/expense-app apps/expense-app/fetch.sh
set -eu
here=$(cd "$(dirname "$0")" && pwd)
src=${QA_BENCH_EXPENSE_APP_DIR:?set QA_BENCH_EXPENSE_APP_DIR to the expense app source folder}
[ -d "$src" ] || { echo "expense-app: $src is not a folder" >&2; exit 1; }
rm -rf "$here/.fetched"
mkdir -p "$here/.fetched"
# Never bring credentials files or the hostile variant's data (docs/APPS.md).
tar -C "$src" --exclude=node_modules --exclude=.git --exclude='fixture-credentials.json' -cf - . | tar -C "$here/.fetched" -xf -
if [ -d "$src/.git" ] || git -C "$src" rev-parse >/dev/null 2>&1; then
  git -C "$src" rev-parse HEAD > "$here/.fetched/.qa-bench-commit"
fi
echo "expense-app: fetched into $here/.fetched"
