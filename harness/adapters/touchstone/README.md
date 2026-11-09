# Local deterministic-check adapter

Runs the installed Touchstone `@touchstone/checks` collector against **bench-owned local targets** from a brief,
then returns ordinary bench findings. It requires no model calls or product credentials. The supplied checkout
is read-only: no source is vendored, pinned as a new dependency or redistributed. The installed entry's SHA-256
is recorded in the system version; full transitive build/source attestation remains a release responsibility.

## Run and score

Requires Node 26, native Playwright Chromium and an existing built check package. Build Touchstone separately
with its own procedure; this adapter never builds or writes into that checkout. Set `TOUCHSTONE_ROOT` to it.

```sh
npx tsx bin/qa-bench.ts generate visual
npx tsx bin/qa-bench.ts up visual-001 --session checks-local
npx tsx harness/adapters/touchstone/native.mjs --brief runs/checks-local/visual-001/brief/brief.json --root "$TOUCHSTONE_ROOT" --out runs/checks-local/visual-001/out/findings.json
npx tsx bin/qa-bench.ts down checks-local/visual-001
npx tsx bin/qa-bench.ts run --adapter touchstone --episodes visual-001 --findings runs/checks-local/visual-001/out/findings.json --run-id checks-import
```

Or run the bench-owned native smoke over the **entire fixed visual track**, including clean and twin episodes:

```sh
TOUCHSTONE_ROOT="$TOUCHSTONE_ROOT" npx tsx harness/integrations/touchstone.ts
```

It writes `runs/touchstone-checks-<timestamp>/report.json` and `report.md`, and tears down every successfully
started episode. Only bench orchestration/scoring reads ground truth. The adapter receives a brief, output path
and installed check module; it never reads labels, switches, answer keys, baseline labels, verify scripts or
episodes. This native manual adapter is instruction-sealed, not a container isolation proof.

For each role it visits public brief pages at desktop (1280x720) and mobile (390x844), signs in through observed
username/password controls and runs actual console, network, axe and layout checks. Unsupported sign-in forms
fail explicitly and require a reviewed integration. External requests are blocked. It does not explore writes,
create long-title data, exercise every journey, inject faults, run visual baselines, measure performance or judge
screenshots. Its leaderboard identity is **touchstone-checks**, a deterministic page-check entry, not a whole-product score.

Mapping: layout -> visual; a11y -> a11y; console/network -> error-handling; perf -> perf. Serious -> major;
critical/minor preserve severity. Informational readings are not bug findings. Role, route, selector, rule and
viewport remain evidence; descriptions are never rewritten to fit labels. Account strings are redacted. Model
cost is zero, while compute billing remains explicitly unmeasured.

The versioned `<findings-path>.checks.json` export binds exact brief bytes, episode, origin and role. It is
operator-trusted local provenance, not a signature proof. It cannot accidentally import an unrelated fixture's
origin. Import an existing complete export offline:

```sh
npx tsx harness/adapters/touchstone/src/cli.ts --brief brief.json --input check-export.json --out findings.json
```

Wrong briefs, outside origins, unknown kinds, unsupported roles and existing outputs fail. Evidence-store IDs
remain in the source export; the adapter does not claim to download them. Bench text evidence is the redacted
message and viewport.

## Reference host and full-product integration

`ReferenceHost` allocates a catalogue-locked fixture with its own seed, DB/reset and identities. It has no
external-target URL option. Its defect selector must not choose bench switches or replace an episode; local
fixture receipts are not findings from bench targets and are not imported as benchmark successes.

Frozen journey replay needs an **external-target Host in Touchstone** that:

1. Uses exact brief origins, generated credentials and wall/money budgets, without catalogue allocation.
2. Gets operations/oracles from public journeys or approved public source, independently of sealed labels.
3. Declares supported public HTTP/UI evidence lanes; the SUT receives no bench DB or oracle access.
4. Leaves reset with the bench runner, preserves effect/retry rules, and separates product failures from blocked,
   incomplete, automation and infrastructure failures.
5. Exports authorized findings with run/origin/evidence bindings and metered model, compute and overhead costs.
   Baseline approval and promotion remain off/human-owned.

That change belongs in Touchstone, which was read-only for this work. No fixture enforcement was bypassed.
The generic `http-api` adapter is an explicit alternative integration only if Touchstone implements its documented
run/poll/findings contract; no such endpoint is assumed here.

## Infrastructure and verification

| Path | Required | Status |
|---|---|---|
| Export -> bench findings | Brief + JSON export | Implemented and unit-tested |
| Native checks -> visual report | Docker apps, Chromium, installed built checks | Implemented; real module load verified; browser smoke blocked by sandbox |
| Judge calibration | Rendered fixture manifest, orchestrator's Anthropic key and run cap | Implemented; no paid calls |
| Reference-host replay -> bench | External-target Host, approved operations/oracles | Design only |
| Hosted whole product/judgements | Isolated project, runner/browser infra, evidence storage/signing, enabled settings, gateway credentials and metered cap | Not provisioned or connected |

Touchstone's `docs/JUDGEMENTS.md` also records that passing-page screenshots need producer-owned page-scoped
admission/redaction wiring before the ordinary upload API can deliver signed current/baseline images. Generated
bench PNGs do not bypass this. Hosted resources must be exact-named `qa-bench-*`, capped and torn down by exact
name. No hosted infrastructure is needed for the deterministic local path.

Next best action: run `harness/judges/verify.ts` and `harness/integrations/touchstone.ts` on the native host, then
the three capped calibrations. Publish numbers only from those retained run records.
