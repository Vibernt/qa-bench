# Changelog

Versions follow `bench vMAJOR.MINOR.PATCH-phase`. A version pins the apps, labels, tracks, matcher and scorer, so
scores are comparable only within one version. Every report records it.

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
