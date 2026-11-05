# Handoff: 5 Nov 2026

You can resume from this file with no earlier conversation. Read it, then the [README](../README.md) (how to use the
bench), [BRIEF.md](BRIEF.md) (the design), [APPS.md](APPS.md), [DECISIONS.md](DECISIONS.md) and
[../AGENTS.md](../AGENTS.md) (standing rules).

## State
**B0 (skeleton) is done**, and its exit check is in [leaderboard/](../leaderboard/README.md): 23 episodes scored
end to end for two systems, and the twin episodes produce a false-alarm number.

| Piece | Where | Proof |
|---|---|---|
| Contracts | `schemas/` (10 JSON Schemas), `lib/contracts.ts` | `npm run validate`: every YAML and JSON file in the repo, plus cross-file checks |
| Expense app (ours) | `apps/expense-app` (code in `app/`, bench wrapper `bench-entry.mjs`) | 7 defects, 1 change. `verify.ts` 17/17; the app's own 34 tests pass on Node 26 |
| Swag Labs (vendored, MIT) | `apps/swag-labs` (`upstream/` at `ad62bb2`) | 5 faulty-user defects, 4 changes. `verify.ts` 155/155 |
| the-internet (run-only, Apache-2.0) | `apps/the-internet` (fetched at build time at `4126619`) | 10 baseline labels, 1 change. `verify.ts` passes |
| Survey site (ours) | `apps/survey-site` | Not wired into a track yet (B1) |
| Generator | `harness/generator` | Seeded and byte-reproducible; clean and twin episodes; exclusive groups; held-out labels kept out of public episodes |
| Runner | `harness/runner` | Builds images once per run; sealed container adapters (only brief/ read-only and out/ mounted); budget kill; teardown always; `up`/`down` for people |
| Scorer | `scorer/` | Deterministic matcher `deterministic-1`, every metric in BRIEF §9 except repro quality; JSON and Markdown |
| Adapters | `harness/adapters/{playwright-suite,http-api,human,noop}` | See each README |
| Tracks | `tracks/regression.yaml` (17 episodes), `tracks/noise.yaml` (6 + 2 live sites, generated only with `--live`) | Every defect and change is planted at least once (unit test) |
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
  `/runtime-config.js` holds the episode's switches as bit flags, not names. An adapter that decodes it is cheating
  (AGENTS.md rule 8). A server-side switch would close this; it isn't worth it until outside entries arrive.
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
- **Repro quality** (BRIEF §9) is reported as null; it is B2 work.

## Next step: B1 Breadth (BRIEF §12)
Exit: every category has ≥ 5 public mutations and ≥ 3 deliberate changes. In order:
1. **Survey site into the noise track:**
   - write `app.yaml`, `compose.yaml` and baseline labels from `truth.json` (via the generator, never in an adapter);
   - its `cosmetic` variant becomes a deliberate change.
2. **Expense app mutations** (APPS.md "To add"):
   - visual: overlap, clipping, off-token colour;
   - accessibility: focus trap, missing label, reflow;
   - usability: extra step, hidden primary action.

   Each new mutation gets a `verify.ts` check.
3. **Conduit and ParaBank** for track 7.1:
   - pick permissively licensed implementations;
   - read their LICENSE files first;
   - record them in `upstream.json` and `NOTICE`.
4. **Mailpit and Keycloak** as infrastructure; Ghost for track 7.6 (email and sign-in).
5. **WebTestBench import** for track 7.2, keeping its Apache-2.0 NOTICE.
6. **A BrowserGym-style agent adapter**, so an AI agent is scored next to `playwright-suite`.
7. **Held-out split** (BD3): a separate private repo mounted with `--heldout-root` / `QA_BENCH_HELDOUT_DIR`.

## Watch out for
- **The noise track is the only part that touches live sites.** Keep their rules in the track file, and never run
  them in CI.
- **Changes to ground truth need evidence** (AGENTS.md rule 9). Confirm the behaviour in the app, add a `verify.ts`
  check, then re-score. Never widen a label to fit one system's findings.
- **Building an adapter:** don't read labels, episodes or `verify.ts`. The `playwright-suite` adapter was built
  that way, from app behaviour and public source only.
- **Briefs ask; they don't change state.** The bench gives systems briefs and goals. It must never ask a system
  to promote what it learned into approved checks (`promote: false` in the `http-api` request).
