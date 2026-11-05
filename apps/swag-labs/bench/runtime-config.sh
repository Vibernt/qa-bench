#!/bin/sh
# QA-BENCH: writes /runtime-config.js from the episode's env at container start, so one image serves every
# episode. Runs from nginx's /docker-entrypoint.d; a non-zero exit stops the container (unknown names fail loudly).
#   QA_BENCH_ACCOUNTS   "user:pass[,user:pass]"  generated accounts; when set, built-in usernames are refused
#   QA_BENCH_MUTATIONS  comma list of built-in faulty users whose behaviour the generated accounts get
#   QA_BENCH_CHANGES    comma list of deliberate changes (not bugs)
# Names become bit flags (they must match upstream/src/utils/QaBench.js), so the page does not spell them out.
set -eu
out=${QA_BENCH_RUNTIME_OUT:-/usr/share/nginx/html/runtime-config.js}  # override for tests only

m=0
for name in $(printf '%s' "${QA_BENCH_MUTATIONS:-}" | tr ',' ' '); do
  case "$name" in
    problem_user) bit=1 ;;
    error_user) bit=2 ;;
    visual_user) bit=4 ;;
    performance_glitch_user) bit=8 ;;
    locked_out_user) bit=16 ;;
    *) echo "runtime-config: unknown QA_BENCH_MUTATIONS value '$name'" >&2; exit 1 ;;
  esac
  m=$((m | bit))
done

c=0
for name in $(printf '%s' "${QA_BENCH_CHANGES:-}" | tr ',' ' '); do
  case "$name" in
    relabel) bit=1 ;;
    seasonal-banner) bit=2 ;;
    checkout-copy) bit=4 ;;
    price-change) bit=8 ;;
    *) echo "runtime-config: unknown QA_BENCH_CHANGES value '$name'" >&2; exit 1 ;;
  esac
  c=$((c | bit))
done

a=$(printf '%s' "${QA_BENCH_ACCOUNTS:-}" | base64 | tr -d '\n')
printf 'window.__SL_RUNTIME__ = { a: "%s", m: %d, c: %d };\n' "$a" "$m" "$c" > "$out"
n=$(printf '%s' "${QA_BENCH_ACCOUNTS:-}" | tr ',' '\n' | grep -c ':' || true)
echo "runtime-config: ${n} account(s); bench mode $([ "$n" -gt 0 ] && echo on || echo off)"
