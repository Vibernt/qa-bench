# Handoff: 5 Nov 2026

## Addendum: 16 Nov 2026, HU-G3 shared masking

`masks` on an active defect or trap is the inverse of `masked_by` on a natural label. Both declarations resolve
through `lib/masking.ts` in the generator, scorer, both app verifiers and cross-file validation. Hidden symptoms
are omitted from answer keys and scoring outcomes; the existing natural-label metadata stays unchanged. The
new defects declare their masks without touching the 82 pinned original episode files. Offline tests cover
relation equivalence, schema/cross-file rejection, natural recall and both tracks' new episode answer keys.
Offline verification: `npm test` passes all 366 tests, including the 82-file digest test and repository validation.
`npm run check` passes lint but its standalone validation command is blocked by tsx IPC `listen EPERM` in this
sandbox; rerun the exact command natively. No alternate launcher was used. Native Docker/browser verification
remains outside HU-G3's scope.

## Addendum: 16 Nov 2026, HU-G2 episode compatibility

Original exploration 001–017 and regression 001–024 now match all 82 parent SHA-256 fixtures. Track app
`recipes_only` pools reserve the ten new defects and four traps for the appended recipes. Ordinary recipe
references no longer remove older defects from random selection. Original episodes carry no trap switches or
trap fields. The two new natural-mask relationships moved onto the new defects as `masks`, keeping
old natural labels byte-identical. The twelve-episode kinds set retains all ten defects, at least two uses of
each trap, and two clean-with-traps controls.

Trap patterns now accept symptom descriptions without seeded titles, with four additional positives and four
additional near-misses per trap (32 new cases), including paired real defects as negatives. Their categories
match the imitated defect families. Offline generator, matcher, scoring and schema tests cover the changes.
Native requalification is still required: this sandbox blocks tsx IPC in `npm run check` after lint passes,
and localhost binding in app tests (17 passed, 55 failed/blocked). No transport or launcher substitution,
Docker, browsers, live calls or git commands were used. Next: run `npm run check` and the app's `npm test`
natively; browser/Docker verification is outside HU-G2's requested scope.

## Addendum: 16 Nov 2026, HU-G kinds and traps

Added ten opt-in expense defects, four `TRAP` switches, `kind: trap` contracts, false-alarm/per-trap reporting and
matcher boundary tests. Exploration is now 29 episodes and regression 36; seeds and id derivation stay unchanged,
composition changes. The twelve appended exploration recipes form `v0.4-kinds-12` (two clean-with-traps controls).
Checked-in generated artifacts, adapters, judges and leaderboards were not changed.

Offline root tests pass (321; 228 existing plus 93 new), including repository validation through its unit test. App build passes. The prescribed
`npm run check` reaches validation but the sandbox blocks tsx's IPC listener (`EPERM`). Native app route tests
likewise cannot bind localhost (17 passed, 55 blocked of 72; originally 7 passed, 35 blocked of 42); this also blocks the frozen-original clean-byte comparison. Docker/Chromium
verification was intentionally not run. No in-process transport fallback was used. Run the exact native commands
in [expense-app README](../apps/expense-app/README.md#hu-g-defect-kinds-and-traps-16-nov-2026) next; do not claim
qualified ground truth until they pass. All new routes/traps have tests written, with native execution pending.

## Addendum: 9 Nov 2026, judge calibration and local check adapter

Track 7.9 now has a [60-case hashed recipe manifest, native generator, capped Anthropic SDK harness and scorer](../judge-sets/README.md),
with a [pending leaderboard section](../leaderboard/judges/README.md). The set is balanced 30/30 and includes
deliberate-change twins. Rendered artifacts receive per-file SHA-256s at native build time. All three requested
model configurations have dated prices, pre-call ceiling reservations, usage accounting and offline dry-run.

The [local deterministic-check adapter](../harness/adapters/touchstone/README.md) loads operator-owned check code
read-only and maps findings into the bench format. Its real module loaded successfully. Full reference-host
journey replay needs an external-target Host in the SUT; it cannot substitute its fixture for bench episodes.

Offline tests pass. Chromium's native launch was blocked by the execution sandbox (`Permission denied (1100)`
at Mach-port bootstrap), so screenshots, generator reproducibility, native adapter scores and model precision
remain unverified. No live model calls or pushes. Next: native `harness/judges/verify.ts`, native
`harness/integrations/touchstone.ts`, then orchestrator-run capped calibrations; exact commands are in those READMEs.

You can resume from this file with no earlier conversation. Read it, then the [README](../README.md) (how to use the
bench), [BRIEF.md](BRIEF.md) (the design), [APPS.md](APPS.md), [DECISIONS.md](DECISIONS.md) and
[../AGENTS.md](../AGENTS.md) (standing rules).

## State
**B0 (skeleton) is done.** Its exit check is in [leaderboard/](../leaderboard/README.md): 23 episodes were scored end
to end for two systems, and the twin episodes produce a false-alarm number. Four Claude agent configurations have
also been scored on a 10-episode sample, and their runs fed the first quality round:
- severity weights;
- category families in the matcher;
- precise deliberate-change labels;
- natural defects.

**0.2.0-dev (a harder bench) is in progress on `main`.** It has exploratory briefs, 2–3 bugs per mixed episode,
subtle and known/novel defects, and 14 natural defects. The four configurations and the scripted suite were re-run on
`v0.2-sample-12` ([leaderboard/v0.2-agents/](../leaderboard/v0.2-agents/README.md)). Planted recall now ranges from
35% to 100%, and subtle defects separate the systems.

**Track 7.3 (visual) is built.** The expense app has a responsive design and 7 visual and accessibility defects that
change only the stylesheet, plus a deliberate restyle. Swag Labs `visual_user` is included too. The four
configurations and the scripted suite were run on the whole track
([leaderboard/v0.3-visual-agents/](../leaderboard/v0.3-visual-agents/README.md)):
- **High effort:** both configurations found 17 of 17.
- **Low effort:** 11 and 12.
- **The scripted suite:** 2.

Reports now carry activity: tool calls, screenshots taken, and screenshots looked at.

| Piece | Where | Proof |
|---|---|---|
| Contracts | `schemas/` (10 JSON Schemas), `lib/contracts.ts` | `npm run validate`: every YAML and JSON file in the repo, plus cross-file checks |
| Expense app (ours) | `apps/expense-app` (code in `app/`, bench wrapper `bench-entry.mjs`) | 20 defects (13 functional, 7 visual and a11y; any compatible subset at once), 2 changes, 15 natural. `verify.ts` passes, including ten 3-defect combinations and browser probes for the visual defects; the app's own 42 tests pass on Node 26 |
| Swag Labs (vendored, MIT) | `apps/swag-labs` (`upstream/` at `ad62bb2`) | 5 faulty-user defects (`known`), 4 changes, 10 natural. `verify.ts` passes |
| the-internet (run-only, Apache-2.0) | `apps/the-internet` (fetched at build time at `4126619`) | 10 baseline labels, 1 change. `verify.ts` passes |
| Survey site (ours) | `apps/survey-site` | Not wired into a track yet (B1) |
| Generator | `harness/generator` | Seeded and byte-reproducible; clean and twin episodes; exclusive groups; held-out labels kept out of public episodes |
| Runner | `harness/runner` | Builds images once per run; sealed container adapters (only brief/ read-only and out/ mounted); budget kill; teardown always; `up`/`down` for people |
| Scorer | `scorer/` | Deterministic matcher `deterministic-3` (category families, description patterns), every BRIEF §9 metric except repro quality, plus severity-weighted recall and F1, severity agreement and natural recall; JSON and Markdown |
| Adapters | `harness/adapters/{playwright-suite,http-api,human,noop}` | See each README |
| Agent runs | `harness/agents` (configs, episode sets, one prompt, `agents prepare/finish`) | Haiku 5.5 and Sonnet 5.5 at low and high effort on `b0-sample-10` (`leaderboard/b0-agents/`) and `v0.2-sample-12` (`leaderboard/v0.2-agents/`) |
| Natural defects | `apps/*/natural/` | 25 verified real bugs found by the agent runs, each with a `verify.ts` check |
| Tracks | `tracks/regression.yaml` (24 episodes, 2-3 bugs per mixed episode), `tracks/noise.yaml` (6 + 2 live sites, generated only with `--live`), `tracks/exploration.yaml` (17, exploratory briefs), `tracks/visual.yaml` (7.3: 12, exploratory, supported devices stated) | Each track plants every defect and change it lists, and every repo defect and change is in some track (unit test) |
| CLI | `bin/qa-bench.ts` | `validate`, `generate`, `build-apps`, `run`, `up`, `down`, `score`, `report` |
| CI | `.github/workflows/ci.yml` | Lint and typecheck, validate, unit tests (142). No Docker or browsers in CI |

## How to resume
```bash
npm ci
```
```bash
npm run check
```
```bash
npx tsx bin/qa-bench.ts build-apps
```
```bash
npx tsx bin/qa-bench.ts generate --all
```
```bash
npx tsx bin/qa-bench.ts run --adapter noop --track regression --parallel 4
```
The `noop` run is a smoke test that takes seconds. Behind a TLS-intercepting proxy, set
`QA_BENCH_BUILD_CA=<ca.pem>` first.

## Known issues and limits
- **Swag Labs' runtime config is readable in the browser.** Swag Labs is a client-side app, so
  `/runtime-config.js` holds the episode's switches as bit flags, not names, and the generated accounts as salted
  SHA-256 hashes (never in clear; checked by `verify.ts`). An adapter that decodes the flags is cheating (AGENTS.md
  rule 8). A server-side switch would close this; it isn't worth it until outside entries arrive.
- **Swag Labs mutations are mutually exclusive.** All five share `exclusive: swag-user`, because upstream's faulty
  users mask each other. If two behaviours ever need to share an episode, `switch.exclusive` would have to accept a
  list.
- **`internet.third-party-requests` is broad.** It has route `*` and category error-handling, because the Optimizely
  beacon fails on every page in an offline episode. It excuses any error-handling finding on the-internet.
- **Our own apps are pinned by path, not commit.** `expense-app` and `survey-site` live in this repo, so the bench
  commit is their pin.
- **Not exercised yet:**
  - `http-api` against a real system (only its unit tests with a fake API);
  - the live noise sites (`--live` plus `QA_BENCH_ALLOW_LIVE=1`; rules are enforced by unit tests only);
  - hosted episodes (BD4).
- **Repro quality** (BRIEF §9) is reported as null. It is next-step 6.
- **The deterministic matcher can't read meaning.**
  - Description patterns are a deterministic stand-in, used only where labels collide.
  - An LLM matcher with a fixed prompt, logged decisions and maintainer spot-checks is the planned upgrade.
- **Agent runs** use Claude Code subagents. Sealing is by instruction, plus an audit of every tool input (0 hits in
  136 published runs and a 24-run pilot), but the subagents could see the repository's instructions file. See `harness/agents/README.md`.
- **Docker network pools.** Docker's default address pools allow about 30 episode networks at once, so finish
  sessions as they complete, or widen `default-address-pools` in the daemon config.

## Next step: bring the bench to the level of strong human QA (no paid testers yet)
The B0 runs showed every agent, and the scripted suite, finding every planted defect, so recall didn't separate
systems. Steps 1, 3 (several and subtle defects per episode, fewer known faults) and 4 are done for 0.2, and the
v0.2 runs separate systems. The steps, in order:
1. **Exploratory briefs** (done in 0.2: track 7.7). Add a goal-only brief mode, with no journeys or checklist, scored as its own track
   variant. Regression briefs measure following a plan; exploratory ones measure finding problems.
2. **Expert test charters per app.** Write down what a senior tester would cover, using:
   - boundary values and equivalence classes;
   - error guessing;
   - a role and permission matrix;
   - state transitions;
   - cross-page consistency.

   Coverage of the charters becomes a metric, standing in for human-like thoroughness. Charters are public; the
   labels stay sealed.
3. **Harder, realistic defects** (the first steps done in 0.2: 2–3 bugs per episode, 6 subtle defects, known faults
   scored apart). In order:
   - several defects per episode;
   - bugs that show only for some data, roles or sequences (rounding, timezones, a stale cache after edits, two
     tabs);
   - cross-page mismatches;
   - fewer of Swag Labs' publicly documented faults (the models may know them);
   - then Conduit and ParaBank (B1) with new mutations.
4. **Keep triaging** (done after every run so far: 14 natural defects).
   - After every run, reproduce the unmatched findings on the clean build. Each real one becomes a `natural` label
     with a `description_pattern` and a `verify.ts` check.
   - Fix bugs that the bench itself introduced, such as unknown URLs returning a blank 200 page from our nginx
     fallback.
5. **Repeats and confidence intervals.** Run each configuration three or more times on fixed sets, and report the
   mean and spread.
6. **Report quality** (BRIEF §9). A fixed agent replays each true finding's repro steps on a fresh instance of the
   episode, and the share that reproduce is the score.
7. **Tighter agent sealing:**
   - a `qa-tester` agent definition with only shell and file tools, so subagents can't call messaging or docs
     tools (done in 0.2);
   - then a container driver with a model API key, so agents never see the repository.
8. **Then B1 breadth** (BRIEF §12):
   - the survey site in the noise track;
   - expense-app visual and a11y mutations (done: track 7.3); usability mutations and track 7.5 accessibility next;
   - Mailpit and Keycloak, then Ghost (track 7.6);
   - the WebTestBench import (7.2);
   - the held-out split (BD3).

## Release checklist (before the repository goes public)
- [ ] Decide whether public history starts fresh. Early commits mention the system the bench was first planned
      around and personal paths; the current tree doesn't.
- [ ] Recheck every licence in `NOTICE` and `upstream.json` (AGENTS.md rule 2).
- [ ] Rerun every `verify.ts` and `npm run check` on the release commit.
- [ ] Move the held-out split (BD3) to its private repository before any held-out label exists.
- [ ] Update the repository description, which still says "plan stage", and its topics.
- [ ] Tag `v0.1.0-b0` and write a GitHub release from `CHANGELOG.md`.

## Watch out for
- **The noise track is the only part that touches live sites.** Keep their rules in the track file, and never run
  them in CI.
- **Changes to ground truth need evidence** (AGENTS.md rule 9). Confirm the behaviour in the app, add a `verify.ts`
  check, then re-score. Never widen a label to fit one system's findings.
- **Building an adapter:** don't read labels, episodes or `verify.ts`. The `playwright-suite` adapter was built
  that way, from app behaviour and public source only.
- **Briefs ask; they don't change state.** The bench gives systems briefs and goals. It must never ask a system
  to promote what it learned into approved checks (`promote: false` in the `http-api` request).
