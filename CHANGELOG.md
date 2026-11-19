# Changelog

Versions follow `bench vMAJOR.MINOR.PATCH-phase`. A version pins the apps, labels, tracks, matcher and scorer, so
scores are comparable only within one version. Every report records it.

## 0.2.0 (19 Nov 2026): a harder bench, visual and judge tracks, traps
The first public release. Episodes and answer keys changed, so scores aren't comparable with 0.1.0-b0. Leaderboards
run during development record `0.2.0-dev` and their answer-key hashes, and stay as recorded.
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
- **Swag Labs' runtime config** carries salted SHA-256 account hashes, not the base64 credentials that agents
  found readable by signed-out visitors.
- **Natural defects:** 9 more from the v0.2 agent runs, each with a `verify.ts` check, for 14 in all (7 per app).
- **Matcher precision:** every deliberate-change label names its change in a description pattern, so unrelated
  findings on the same route are no longer scored as false alarms. `expense.stale-state` and
  `expense.total-under-filter` accept more ways of describing their symptom.
- **Agent harness:** evidence paths in findings are made relative to the evidence folder.
- **Leaderboard:** `v0.2-agents/`, with four Claude configurations and the scripted suite on `v0.2-sample-12`.
- **Expense app design:** a responsive stylesheet at `/theme.css` (stacked rows below 600 px). The markup is unchanged,
  so every earlier label and probe still holds.
- **Track 7.3, visual (12 episodes):** 7 planted visual and accessibility defects in the expense app, which change
  only the rendered page, never its text or behaviour. Severity follows impact: a phone layout that hides the row
  actions is critical, a misaligned column is minor. Also Swag Labs `visual_user`, and a deliberate `restyle` change
  (with the seasonal banner) for visual false alarms. The brief states the supported devices. `verify.ts` measures
  these defects in Chromium.
- **Regression and exploration tracks** list their expense defects by name, so their episodes don't change. The 4
  episodes that plant `long-title-truncated` get a new answer-key hash, because that label joined the
  `expense-title` exclusive group.
- **Natural defects:** 11 more from the visual-track runs, for 25 in all (15 on the expense app, 10 on Swag Labs).
  They include a major one: Swag Labs' header cart link is unreachable by keyboard. `swag.visual-user` gains 5 match
  entries, for symptoms it already described but agents reported with another locator. Each new entry has a
  `verify.ts` check.
- **`masked_by` on natural labels:** a natural defect whose symptom a planted defect removes is left out of that
  episode's answer key. `verify.ts` for both apps runs a matrix of every natural check against every planted defect
  and fails on an undeclared or wrong mask. This changes natural-defect denominators, so the earlier
  leaderboards' natural numbers stand as recorded, with their answer-key hashes.
- **Leaderboard:** `v0.3-visual-agents/`, with four Claude configurations and the scripted suite on track 7.3.
- **Activity:** findings and reports carry tool calls, screenshots taken and screenshots looked at per episode. This
  is reported, never scored. The report adds visual and accessibility recall rows. `agents audit` (harness 0.4.0)
  counts activity from transcripts, along with the sealed-path audit.
- **Bug kinds and traps:** ten more opt-in expense defects, and `kind: trap` labels. A trap is correct seeded content
  that looks like a bug, and reporting it is a false alarm. The matcher is now `deterministic-4`, with trap
  disambiguation, and reports count trap false alarms. The exploration track has 29 episodes and regression 36. Every
  label is checked by `verify.ts` in CI.
- **Track 7.9, judge calibration:** a 60-case visual judge set (`judge-sets/visual-v1`), pinned by SHA-256, and a capped
  judge harness (`harness/judges`) with its own scorer. A unit test keeps the checked-in plan in step with its
  sources.
- **Adapters:** `touchstone` (deterministic page checks) and `touchstone-hunt` (a model-led hunt with spend and call
  caps). Both run against a separately built checkout and are instruction-sealed.
- **Leaderboard:** judge calibration (`2026-11-09-judge/`), page checks on the visual track
  (`2026-11-10-touchstone-checks/`), and hunt prompts against a bare agent on `v0.4-kinds-12` (`touchstone-hunt/`).

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
