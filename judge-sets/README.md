# Track 7.9: judge calibration

The public seed corpus has **60 labelled recipes: 30 problem, 30 OK**, across the expense app, Swag Labs and
survey site. [visual-v1/plan.json](visual-v1/plan.json) pins every recipe and source input with SHA-256. This is a
**build manifest**, not a claim that screenshots have been captured. Native generation writes `manifest.json`
with SHA-256s for every before/after PNG and masked text/accessibility evidence file. Live execution requires
that rendered manifest and verifies all artifacts before any provider request.

The catalogue includes all seven expense visual/a11y mutations, Swag Labs' visual user, 12 deliberate-restyle
twin controls, unchanged controls and four harmless survey cosmetic/structural changes. Viewport siblings share
**10 groups**, not 60 independent defects. Existing app labels are unchanged. Survey changes are recipe-level
controls from existing variants, not new episode ground-truth labels.

| Question kind | Scope |
|---|---|
| `visual-defect` | Masked baseline/current page PNGs, text and accessibility snapshots |
| `intended-change` | Same evidence plus approved change scope; approval never excuses unusable layout |
| `a11y` | Visible contrast and keyboard focus; does not cover accessible-name quality |

The [independently authored rubric](../harness/judges/src/request.ts) requires `ok/problem/unsure`, confidence,
probabilities summing to one and an evidence-grounded reason. Missing evidence is not OK. Labels, defect IDs,
groups, twin IDs, filenames and switches are excluded from requests by an explicit allowlist.

## Build and verify

Requires Node 26 for the expense app's SQLite runtime, native Playwright Chromium and local app dependencies.
Unit tests need no browser, Docker or network. Use your host's configured browser installation location.

```sh
npm ci
npm ci --prefix apps/swag-labs/upstream
npm run build --prefix apps/swag-labs/upstream
npx playwright install chromium
npx tsx bin/qa-bench.ts judge plan --out judge-sets/visual-v1/plan.json
npx tsx bin/qa-bench.ts judge generate --out judge-sets/rendered/visual-v1
```

Choose a fresh directory for each generation. The generator starts apps on loopback, resets each capture, fixes
random prices, locale, timezone, viewport, motion and fonts, and blocks non-fixture requests. It asserts the
relevant geometry/CSS/focus state on clean and defective renders; those diagnostics are never model evidence.
Images are 1568 pixels high and at most 1280 wide. Generated account values stay in temporary fixture state;
username/password fields and identity text receive black pixel masks, with the same account strings removed from
text/a11y snapshots. This `bench-masks/v1` attestation is not Touchstone's signed evidence-store attestation.

The manifest records Node, browser and platform. Rasterizer/font/platform changes may change pixels; reproduce
in the recorded environment. The native smoke renders twice, requires byte-identical manifests, validates all
180 artifact references and checks request bounds for every model:

```sh
npx tsx harness/judges/verify.ts
```

## Models, prices and caps

Rates were checked **9 Nov 2026** in [Anthropic's official price list](https://platform.claude.com/docs/en/about-claude/pricing).
USD per million tokens, first-party global standard API. Haiku's under-100k tier applies because input is capped
at 16,384 tokens; output is capped at 1,024 tokens, including thinking. Requests use adaptive thinking and low
effort consistently across models. Settings, SDK version and rubric are hashed into every run.

| Model | Input / MTok | Output / MTok | Per-call ceiling | 60-call maximum |
|---|---:|---:|---:|---:|
| `claude-haiku-5-5` | $0.10 | $0.50 | $0.0021504 | **$0.129024** |
| `claude-sonnet-5-5` | $2.00 | $10.00 | $0.043008 | **$2.580480** |
| `claude-opus-5-5` | $4.00 | $20.00 | $0.086016 | **$5.160960** |

All three total **$7.870464 maximum**, before taxes. These are ceilings, not measured spend. No provider run
has been performed. Refresh dated pricing before future runs if the price list changes.

Dry-run accepts either the source recipe manifest or a rendered manifest, without a key or network:

```sh
npx tsx bin/qa-bench.ts judge run --manifest judge-sets/visual-v1/plan.json --model claude-haiku-5-5 --max-usd 0.13 --dry-run
npx tsx bin/qa-bench.ts judge run --manifest judge-sets/visual-v1/plan.json --model claude-sonnet-5-5 --max-usd 2.59 --dry-run
npx tsx bin/qa-bench.ts judge run --manifest judge-sets/visual-v1/plan.json --model claude-opus-5-5 --max-usd 5.17 --dry-run
```

Source plans explicitly report `evidence_ready: false`; live execution requires rendered evidence. The orchestrator
supplies `ANTHROPIC_API_KEY` in its environment. No key flag or config-file credential is accepted:

```sh
npx tsx bin/qa-bench.ts judge run --manifest judge-sets/rendered/visual-v1/manifest.json --model claude-haiku-5-5 --max-usd 0.13 --out runs/judge-haiku
npx tsx bin/qa-bench.ts judge run --manifest judge-sets/rendered/visual-v1/manifest.json --model claude-sonnet-5-5 --max-usd 2.59 --out runs/judge-sonnet
npx tsx bin/qa-bench.ts judge run --manifest judge-sets/rendered/visual-v1/manifest.json --model claude-opus-5-5 --max-usd 5.17 --out runs/judge-opus
```

The [official SDK pin](../harness/judges/upstream.json) uses a fixed first-party URL, logging off and retries
disabled. Before every Messages call, the harness bounds UTF-8 text bytes and [image patches](https://platform.claude.com/docs/en/build-with-claude/vision),
checks the provider's free token count, and reserves the full token ceilings in integer nanodollars. Unaffordable
calls are refused before dispatch. Response usage determines measured cost; unused reservation is released.
No tools, cache writes, fast tier, regional surcharge or paid retry path is enabled. Unknown billed usage retains
the reservation and records measured cost as null; unexpected usage stops the run. No provider/model substitution
occurs. `run.json` is journaled before dispatch and after responses; prior run outputs cannot be reused.
The cap is per invocation, not an account-wide billing limit.

Malformed JSON, refusal, truncation, inconsistent probabilities/confidence or missing reasons are invalid answers;
paid usage is retained. Provider errors stop with sanitized diagnostics. Missing/invalid answers are separate from
`unsure`, count against recall and prevent qualification.

## Score and compare

```sh
npx tsx bin/qa-bench.ts judge score runs/judge-haiku/run.json runs/judge-sonnet/run.json runs/judge-opus/run.json --manifest judge-sets/rendered/visual-v1/manifest.json --out runs/judge-comparison
```

Outputs: `judge-score.json`, `judge-report.md`, `agreement.json`. Scoring binds the exact manifest hash and rejects
unknown/duplicate case IDs. Reports include overall and per-kind precision, recall, twin false alarms, unsure and
escalation rates, measured USD/case, Brier score and confidence-bin counts. Agreement uses paired valid answers,
including agreements on unsure, and reports the paired count.

Precision = correct problem flags / all problem flags. Recall = correct problem flags / all labelled problems,
including those missed through unsure/invalid/missing answers. Twin alarm rate = flagged OK twins / all OK twins.
Cost includes invalid paid answers; unknown usage makes the total unknown rather than zero.

Qualification requires a completed run and confidence >=.95: **suggest** at >=50 decisive labelled cases and >=95%
problem precision; **auto** at >=200 and >=98%, with one in 20 human spot checks required. It is earned **per kind**.
Overall threshold results cannot promote thin kinds. This seed corpus cannot earn auto and is too small per kind
for production qualification. Add independent cases and human review before production claims. Abstentions do not
count toward decisive sample minima.

Runtime order is cheap judge -> LLM -> person at low confidence. The harness measures each model independently;
human intent and journey promotion remain human-only. Touchstone's exact production rubric/evidence versions
differ, especially `a11y-name-quality`; production selection needs calibration under that exact prompt and tenant
policy. See the [adapter](../harness/adapters/touchstone/README.md).

## Verification status, 9 Nov

Offline tests cover recipes, hashes, sealed inputs, caps, usage, invalid answers, thresholds, agreement and adapter
mapping. SDK HTTP tests intercept fetch in memory. Native app build and loading the installed check package
succeeded. Chromium launch was attempted but macOS denied its Mach-port bootstrap (`Permission denied (1100)`)
inside the execution sandbox. Images, twice-render reproducibility and native adapter episode scores remain
**unverified**. No model calls, production selection or pushes occurred.
