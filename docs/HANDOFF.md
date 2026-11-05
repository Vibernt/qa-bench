# Handoff: 5 Nov 2026

You can resume from this file with no earlier conversation. Read this, then [BRIEF.md](BRIEF.md),
[APPS.md](APPS.md), [DECISIONS.md](DECISIONS.md) and [../AGENTS.md](../AGENTS.md).

## Where things are
| What | Where |
|---|---|
| This repo | `Vibernt/qa-bench` (private), local checkout `/Users/vid/vibernt/qa-bench` |
| Touchstone (the first system scored) | `Vibernt/touchstone` (private), local `/Users/vid/vibernt/touchstone` |
| Touchstone documents behind this brief | `docs/BENCH.md` (the plan this brief came from) and `docs/QA_PARITY.md` (human-QA gaps, the deterministic/judged/human split, spikes SP34–SP46). Board cards QA0–QA12 are in `docs/BOARD.md` |
| Touchstone's own fixtures we'll adopt | `fixtures/expense-app` and `fixtures/survey-site` in the Touchstone repo (BD2) |
| Touchstone's live operations (stacks, run scripts) | `/Users/vid/vibernt/touchstone-live` (not git). Start with `stack-env.zsh` and Touchstone's `docs/HANDOFF.md` |

## State
- **Done:**
  - intent, research and licence checks (4 Nov);
  - the full brief, the app list, references, requirements and decisions, all in this repo.
- **Not done:** everything else. There is no code, no app is pinned and nothing is vendored. `NOTICE` lists only
  planned entries.
- **Open decisions:** BD1–BD8 in [DECISIONS.md](DECISIONS.md). Only BD2 blocks B0, and only for the expense app;
  the plan below works around it.

## Next step: phase B0 (BRIEF.md §12)
Do these in order. Each step is a small commit.
1. **Scaffold.** `package.json` (Node 22, TypeScript, vitest), `tsconfig`, `.github/workflows/ci.yml` (lint, schema
   validation, unit tests).
2. **Schemas.** `schemas/` with JSON Schemas for `upstream.json`, `label.yaml`, tracks, episodes, the adapter brief,
   findings and the report (BRIEF.md §6). Add a validator script that CI runs over the whole repo.
3. **First apps.**
   - `apps/swag-labs`: pin a commit after reading its LICENSE; write `compose.yaml`; label each faulty user; add a
     deliberate-change twin.
   - `apps/the-internet`: pin it; write `compose.yaml`; mark it as noise only.
4. **Expense app.** Until BD2 is answered, add `apps/expense-app/upstream.json` with
   `use: private-pull`, pulled from the Touchstone repo at setup. Write labels for its 7 defects and the `relabel`
   deliberate change (APPS.md).
5. **Runner.** `harness/runner`: bring up an episode on a docker network, reset the seed, issue the brief, collect
   findings with a timeout, tear down. The adapter must never be able to read the answer key.
6. **Scorer.** `scorer/`: the deterministic matcher, the metrics (BRIEF.md §9), and a JSON plus Markdown report.
   Unit-test it against hand-written findings.
7. **Adapters.**
   - `playwright-suite` first. It is cheap and deterministic, so it validates the runner and scorer.
   - Then `touchstone`, which calls Touchstone's run API and records the cost Touchstone reports. Read Touchstone's
     `docs/HANDOFF.md` for how runs are started. **Hosted runs need vid's go-ahead and BD4.**
8. **Exit check.** Generate 20 episodes across tracks 7.1 and 7.4, score both adapters, and commit the report under
   `leaderboard/` with a short write-up.

## Watch out for
- **Swag Labs** is a React app, so check how it builds before you write `compose.yaml`.
- **Some faulty users are noisy.** `performance_glitch_user` is slow by design; label it as a speed defect.
- **The noise track is the only part that touches live sites.** Keep it in its own track with its own rate
  limits, and don't run it in CI.
- **Touchstone's journeys on our tenants are promoted only by vid.** The bench must not promote journeys. It should
  give Touchstone briefs and goals, not change Touchstone's state.
