# `touchstone` adapter

Hands a bench brief to Touchstone's run API, waits for the run, and maps Touchstone's findings and its reported
cost into a bench `findings.json`. Touchstone owns its own cost metering; the adapter records what Touchstone
reports and adds nothing.

## What it may and may not do
- **Starts a run with briefs and goals only.** The request carries the targets, the episode's generated test
  accounts, the journeys (regression track) or goal, the budget, and `promote: false`, `ephemeral: true`.
- **Never changes Touchstone's state.** The client has three calls (start, status, findings). There is no call that
  promotes journeys, approves baselines or edits configuration. Journeys on our tenants are promoted only by vid.
- **Hosted runs need the owner's go-ahead and BD4.** The adapter refuses any API URL that isn't this machine
  unless `QA_BENCH_TOUCHSTONE_APPROVED=1` is passed through.
- **Sees only the brief.** Like every container adapter, it is run with only `/bench/brief` (read-only) and
  `/bench/out` mounted. It never sees labels or answer keys.

## Configuration (passed through by the runner, never printed)
| Variable | Meaning |
|---|---|
| `TOUCHSTONE_API_URL` | Base URL of Touchstone's run API. Unset → the adapter writes empty findings with a note and exits 1 |
| `TOUCHSTONE_API_TOKEN` | Bearer token, if the API needs one. Real tokens come from the macOS Keychain (AGENTS.md rule 3) |
| `TOUCHSTONE_PROJECT` | Optional project or tenant to run under |
| `QA_BENCH_TOUCHSTONE_APPROVED` | `1` to allow a non-local API URL |

`adapter.json` sets `network: host`: Touchstone runs outside the episode's docker network, so the runner publishes
the app's ports on `127.0.0.1` and puts those URLs in the brief. A hosted Touchstone can't reach a laptop; it
needs hosted episodes (`touchstone-bench-*`, BD4), which are not built yet.

## To verify before the first real run
This repo can't see Touchstone's code, so the API shapes in `src/map.ts` and the paths in `src/client.ts`
(`POST /api/runs`, `GET /api/runs/:id`, `GET /api/runs/:id/findings`) are assumptions. Check them against
Touchstone's `docs/HANDOFF.md` (how runs are started) and fix them there; everything Touchstone-specific lives in
those two files. Also check the category synonyms in `toCategory` against Touchstone's finding kinds.

## Tests
`npx vitest run harness/adapters/touchstone` covers the mapping, the approval gate, polling, the budget cut-off,
schema validity of the output and that the token never appears in errors. They use a fake API; no network.
