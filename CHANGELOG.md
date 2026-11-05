# Changelog

Versions follow `bench vMAJOR.MINOR.PATCH-phase`. A version pins the apps, labels, tracks, matcher and scorer, so
scores are comparable only within one version. Every report records it.

## Unreleased (0.2.0-dev): a harder bench
Episodes and answer keys changed, so scores aren't comparable with 0.1.0-b0. The B0 leaderboard stays as recorded,
with its answer-key hashes.
- **Defect mix:** mixed regression episodes carry 2-3 planted bugs, at most one blatant (`max_blatant_per_episode`).
  The regression track has 24 episodes, so episode ids now mean different builds.
- **Expense app:** 6 new subtle defects (a total wrong only under a filter, a delete endpoint open to the viewer,
  edits that drop cents, long titles truncated, unescaped titles, edits that reset the category). `DEFECT` takes any
  compatible subset, and every planted label has description patterns so co-active bugs stay distinguishable.
- **Exploration track** (7.7, 17 episodes): exploratory briefs give only the targets, roles and a one-line product purpose, with
  no journeys or checklist.
- **Labels:** `difficulty` (blatant or subtle) and `exposure` (novel or known). Swag Labs' publicly documented faulty
  users are `known`, and the report splits recall into novel and known, and into subtle and blatant.
- **Agent harness 0.3.0:** an exploratory prompt variant, the severity field in findings, and a `qa-tester` subagent
  definition limited to shell and file tools.
- **Swag Labs** answers 404 for unknown URLs, as its upstream deployment does.

## 0.1.0-b0 (5 Nov 2026): skeleton
**Apps**, each with a `verify.ts` that proves every label against the running app:
- **expense-app** (ours, MIT): 7 planted defects, 1 deliberate change and 2 natural defects. Generated accounts per
  episode.
- **swag-labs** (vendored, MIT, `ad62bb2`): 5 faulty-user defects, 4 deliberate changes and 3 natural defects, all
  switched at run time.
- **the-internet** (run-only, Apache-2.0, `4126619`): 12 baseline labels for its pages that are broken on purpose,
  and 1 deliberate change.

**Harness:**
- **Generator:** seeded, byte-reproducible episodes, with clean and twin episodes and a held-out split.
- **Runner:** sealed container adapters, with only the brief and an output folder mounted; time budgets;
  `up`/`down` for people.
- **Agent-run harness:** configs, episode sets and one shared prompt.

**Scorer:** matcher `deterministic-3`. It has:
- category families;
- description patterns for colliding labels;
- deliberate changes that count only findings pointing at the changed element;
- severity-weighted recall and F1 (critical 5, major 3, minor 1);
- severity agreement;
- natural-defect recall.

**Adapters:** `playwright-suite`, `http-api`, `human`, `noop`.

**Tracks:** regression (7.1, 17 episodes) and noise (7.4, 6 episodes, plus rule-bound live sites, off by default).

**Results:** `playwright-suite` and `noop` on all 23 episodes, and Claude Haiku 5.5 and Sonnet 5.5 at low and high
effort on `b0-sample-10` (`leaderboard/`).

**Known limits:** see `docs/HANDOFF.md`. The main one: planted defects are easy enough that recall doesn't separate
the systems scored so far.
