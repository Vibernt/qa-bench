# Native model-led hunt adapter

Runs the operator-owned Touchstone huntbench CLI against local bench targets. No source is copied, vendored,
built or modified in that checkout. Requires Node 26+, a separately built Touchstone checkout, native Chromium
and (for live hunts only) its configured Keychain model credential. No provider, transport, launcher or selector
substitutions are made. This is a manual, instruction-sealed native integration, **not container isolation**.

## One episode

Set `TOUCHSTONE_ROOT` to the operator-owned checkout and `HUNT_OPERATOR` to your operator alias. Generate and
start a disposable bench episode first:

```sh
npx tsx bin/qa-bench.ts generate exploration
npx tsx bin/qa-bench.ts up exploration-018 --session hunt-one
```

Plan only (browser survey and standard sign-in; **zero model calls**, no findings or score):

```sh
node harness/adapters/touchstone-hunt/native.mjs \
  --brief runs/hunt-one/exploration-018/brief/brief.json \
  --root "$TOUCHSTONE_ROOT" --out runs/hunt-one/exploration-018/out/plan.json \
  --policy hunt-0.2 --persona default --model anthropic:claude-haiku-5-5 \
  --max-usd 0.25 --max-calls 40 --operator "$HUNT_OPERATOR"
```

Capped live run (at most $0.25 model spend and 40 model calls, also bounded by the brief's money budget):

```sh
node harness/adapters/touchstone-hunt/native.mjs \
  --brief runs/hunt-one/exploration-018/brief/brief.json \
  --root "$TOUCHSTONE_ROOT" --out runs/hunt-one/exploration-018/out/findings.json \
  --policy hunt-0.2 --persona default --model anthropic:claude-haiku-5-5 \
  --max-usd 0.25 --max-calls 40 --operator "$HUNT_OPERATOR" --live
```

Always tear the episode down, including after a failure:

```sh
npx tsx bin/qa-bench.ts down hunt-one/exploration-018
```

To import and score the successful live findings:

```sh
npx tsx bin/qa-bench.ts run --adapter touchstone-hunt --episodes exploration-018 \
  --findings runs/hunt-one/exploration-018/out/findings.json --run-id hunt-one-import
```

Policies `hunt-0.1`, `hunt-0.2` and `hunt-0.3` are accepted. Personas are `default`, `skeptic`, `fuzzer`. A fresh output
path is required each time. Every invocation saves `<out>.hunt/plan.json`; the live CLI's `result.json`,
`triage.json`, `usage.json`, `overhead.json` and captures remain in `<out>.hunt/artifacts/`. `<out>.cost.json`
contains model USD, calls, total input/output tokens and adapter wall seconds. Failures expose the same meter
to the set runner even if findings conversion fails. A plan refusal has zero model spend; a live failure without
usage has unknown spend. The private role-aliased brief contains generated credentials (0600 inside a 0700
directory); do not publish it. Operator-owned retention/deletion includes captures and private brief copies.

## Fixed set

Default selection is `v0.4-kinds-12`, fixed before any findings exist. Choose another existing set with `--set`;
there is no automatic selection substitution. The orchestrator generates the selected tracks before startup.
The adapter itself never reads episodes, labels, baselines, verify scripts or answer keys.

Plan the set (starts and tears down Docker episodes and surveys browsers; no model calls):

```sh
npx tsx harness/integrations/touchstone-hunt.ts \
  --root "$TOUCHSTONE_ROOT" --set v0.4-kinds-12 \
  --policy hunt-0.2 --persona default --model anthropic:claude-haiku-5-5 \
  --max-usd 0.25 --total-usd 3 --max-calls 40 --operator "$HUNT_OPERATOR"
```

Capped live set (at most $0.25 and 40 calls per episode, $3 model spend over the set):

```sh
npx tsx harness/integrations/touchstone-hunt.ts \
  --root "$TOUCHSTONE_ROOT" --set v0.4-kinds-12 \
  --policy hunt-0.2 --persona default --model anthropic:claude-haiku-5-5 \
  --max-usd 0.25 --total-usd 3 --max-calls 40 --operator "$HUNT_OPERATOR" --live
```

`--total-usd` defaults to `--max-usd`, so omitting it caps the **entire set** at that amount. Each episode receives
at most the remaining cap. Known usage is charged whether the episode succeeds or fails. Unknown usage reserves
the full episode ceiling and propagates `null` into totals; reserved USD is not presented as measured spend.
When the cap is reserved/exhausted, later episodes are skipped without startup. Other failures retain redacted
reasons and the loop continues. Every returned session gets a teardown attempt; startup owns its own partial
cleanup. Teardown failures remain errors requiring operator attention, without stopping siblings.

Writes `runs/touchstone-hunt-<policy>-<timestamp>/report.{json,md}`, `cost.json` (every episode and total, including
failures), `run.json` and episode `runner.json` files. Wall seconds in cost.json include startup/teardown; native
findings wall time covers the adapter's plan plus live execution. Plan-only episodes have skipped scoring status;
no completed live episodes gives a nonzero exit. Failed/unknown spend is accounted in cost.json even when the
scorer cannot attach findings cost. Compute/hosting cost is unmeasured. CLI overhead counters are retained,
not converted into dollars. No leaderboard scores have been measured.

## Contract choices and limits

- The same exact loopback hostname rule as the checks adapter: `127.0.0.1`, `localhost`, `[::1]`, HTTP(S).
  Credentials in target URLs are refused. All targets must share one origin: the CLI has one origin. Extra
  starting targets/pages/journeys are not a scripted coverage promise; the CLI surveys from the first target path.
- Exactly one account per nonempty role list is required; no inferred account selection. Stable `benchRoleN`
  aliases are supplied in a private brief copy and mapped back to bench role names. This avoids leaking a role
  name that is also a credential literal into the upstream mission. Unsupported brief rules are refused.
- The current upstream CLI accepts only priced Anthropic models. Other provider selections are refused;
  no environment key/provider substitution occurs. Touchstone owns Keychain access, pricing and token ceilings.
- Each live invocation runs **plan, then live** with the printed digest and otherwise identical arguments.
  `--live` authorizes this automated digest approval for disposable local targets; it does not pause for human
  review. For manual digest review use Touchstone's documented CLI directly. The survey repeats in live mode;
  a changed digest causes upstream refusal. `--approve-writes` admits observed disposable form effects, with the
  CLI's dangerous-form exclusions. No explicit dangerous-form approvals or triage model call are added.
- Every observation is a reported finding, including warnings and missing/failed capture, irrespective of triage
  bucket. Confirmed replay candidates are also mapped; unconfirmed replay candidates are excluded. This preserves
  model claims for precision/false-alarm measurement without asserting deterministic reproduction.
- Category is preserved. Severity **1–2 -> minor, 3–4 -> major, 5 -> critical** (the hunt rubric puts "broken with a workaround" at 4, which is the bench's major). Confidence **0.5** is an explicitly
  uncalibrated constant (the source has no probability). Title, expected/actual and reproduction are preserved.
  Role aliases are reversed. Bench IDs add a filing ordinal to the source ID, which may repeat across roles/lenses. Known account literals and common bearer/key/private-home-path strings are masked.
- Observed paths become same-origin pathnames (drop query/fragment); off-origin claims are refused. When capture
  leaves `path: null`, route `*` means explicitly unknown; no route is inferred from template IDs or prose.
  Missing capture retains its reason and no fabricated file evidence. Evidence references are labelled source
  references, not asserted to be downloaded bench artifacts. Full source metadata, including lens, template and
  revision, remains in private result/triage files. These files are not evidence of screenshot secrecy beyond the
  upstream known-secret mask boundary.
- System version includes the policy and CLI entry SHA-256 prefix. This is local provenance, not complete
  transitive build attestation. Only the bench orchestrator and scorer can read ground truth.

## Verification and next action

```sh
npx vitest run harness/adapters/touchstone-hunt/test harness/integrations/test/touchstone-hunt.test.ts
npm run check
```

65 focused offline tests use injected process/lifecycle ports and fixture hunt results. No Docker, browser,
network, model, Keychain or git calls occur in them. Tests cover mapping, every severity, warnings, missing
capture/route, account redaction, CLI arguments, plan-only execution, digest handoff, loopback refusal, cost
accounting, caps and sibling continuation after failures. Process tests use an injected child-process double.
The real Node entry's missing-argument refusal was also checked.

Native Docker/browser execution, request routing, Keychain access, provider acceptance/billing, model effectiveness,
full set lifecycle/report integration and actual browser cleanup are **unverified**. The final full offline suite
and check outcome are recorded in [HANDOFF](../../../../docs/HANDOFF.md). Next best action: run the exact
`npm run check` on the native host, then Touchstone's native host browser suite, the one-episode plan above and,
after reviewing the retained scope, the capped live episode before the whole set.
