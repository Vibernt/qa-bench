# Leaderboard

Each folder is `<bench version>/<system>/<track>/` and holds the scorer's `report.json` (schema
[`report.schema.json`](../schemas/report.schema.json)) and `report.md`. Every report records:
- the upstream pin of each app;
- each track's seed;
- the sha256 of every answer key it was scored against.

Outside entries are accepted from B5, and only with the full run record (BD8).

## B0 (bench 0.1.0-b0, 5 Nov 2026)

The B0 exit check covered 23 episodes:
- **Regression** (track 7.1): 17 episodes on the expense app and Swag Labs, in four kinds:
  - 12 mixed, which together plant all 12 defects;
  - 3 twins, with deliberate changes only;
  - 2 clean;
  - 11 deliberate changes are switched on across the episodes.
- **Noise** (track 7.4): 6 episodes on the-internet, 4 clean and 2 twins.

Both systems ran on one machine with `--parallel 4` (regression) and `--parallel 3` (noise).

| System | Track | Recall | Precision | F1 | Changes flagged | False alarms /100 ep | Unmatched /ep | Excused | Wall time | Cost |
|---|---|---|---|---|---|---|---|---|---|---|
| `playwright-suite` 0.1.0 | regression | **100%** (12/12) | **78.0%** | 87.6% | 7/11 | **41.2** | 0.00 | 0 | 306 s | $0 |
| `playwright-suite` 0.1.0 | noise | — | — | — | 0/2 | 0.0 | **0.00** | 12 | 121 s | $0 |
| `noop` 0.1.0 (floor) | regression | 0% (0/12) | — | — | 0/11 | 0.0 | 0.00 | 0 | 9 s | $0 |
| `noop` 0.1.0 (floor) | noise | — | — | — | 0/2 | 0.0 | 0.00 | 0 | 3 s | $0 |

### What it shows
- **The scripted suite finds every planted defect.** It is a fixed per-app suite on known journeys, and every B0
  defect is deterministic or has a deterministic symptom. Its mean time to first detection is 2.7 s. This is the
  floor a scripted QA team reaches on regression; B1's natural-defect and exploration tracks are where it should
  fall short.
- **Its weakness is deliberate changes, and the twin episodes measure it.**
  - The suite asserts visible copy, as a real scripted suite does: page titles, the order-complete header and the
    "Add expense" label. So it reports 7 of the 11 deliberate changes as bugs (`swag.checkout-copy` 6 times,
    `expense.relabel` 3, `swag.relabel` 2). That is 41.2 false alarms per 100 episodes.
  - All of them are `copy` findings. The suite's precision in that category is 8%; in every other category it
    is 100%.
  - This is the number an agent that judges copy changes should beat.
- **Noise:**
  - **Excused findings:** the suite raised 12 findings on the-internet, and all 12 were on pages that are broken
    on purpose (broken images, the JavaScript-error page, auth prompts). The baseline labels excuse them.
  - **False alarms:** none, on the tricky-but-working pages or on the reworded welcome heading.
- **Answer-key fix before publishing.** On the first scoring pass, three findings were unmatched. Each was a real
  symptom of the faulty user switched on in that episode, which the label missed or filed under another category.
  We confirmed each one in the app source, completed the labels and checked them with `apps/swag-labs/verify.ts`
  (155 of 155 checks pass), then re-scored. No episode was re-run; only the answer keys changed.

### Not yet scored
- **QA services:** none were scored in B0. The `http-api` adapter is ready: a system that serves its three
  endpoints can run these same 23 episodes.
- **AI agents:** a BrowserGym-style agent adapter is B1 work.
- **Paid human baseline:** that is B4, and it uses the `human` adapter.

### Reproduce
```bash
npx tsx bin/qa-bench.ts build-apps
```
```bash
npx tsx bin/qa-bench.ts generate --all
```
```bash
npx tsx bin/qa-bench.ts run --adapter playwright-suite --track regression --parallel 4
```
```bash
npx tsx bin/qa-bench.ts run --adapter playwright-suite --track noise --parallel 3
```
Episode generation is deterministic. The same commit gives byte-identical episodes and answer keys, so the
sha256 values in these reports must match.
