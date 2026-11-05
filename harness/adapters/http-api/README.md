# `http-api` adapter

For any QA system that runs as a service: serve the three endpoints below, and the bench can score it with no code
of yours in this repo. The adapter hands your system the episode's brief, waits for the run to finish, and maps
your findings and your reported cost into a bench `findings.json`. Your system meters its own cost; the adapter
records what you report and adds nothing.

If your system is a command-line tool or a library instead, write a container adapter (see
[`../../../README.md`](../../../README.md), "Write an adapter").

## The run API your system serves
All bodies are JSON. If `QA_SYSTEM_API_TOKEN` is set, every request carries `Authorization: Bearer <token>`.

### `POST /api/runs`: start a run
```json
{
  "source": "qa-bench",
  "external_id": "regression-004",
  "project": "optional, from QA_SYSTEM_PROJECT",
  "targets": [{ "name": "expense-app", "url": "http://127.0.0.1:49153/expenses" }],
  "accounts": [{ "role": "viewer", "username": "viewer-1a2b", "password": "test-only" }],
  "journeys": [{ "id": "expense.list", "title": "…", "role": "viewer", "start": "/expenses", "steps": ["…"] }],
  "goal": "optional",
  "pages": ["optional"],
  "inbox": { "address": "optional", "api": "optional" },
  "rules": { "methods": ["GET"], "forms": false, "robots_txt": "honour", "min_interval_ms": 1000 },
  "categories": ["functional", "consistency", "permission"],
  "budget": { "wall_time_s": 600, "money_usd": 1.5 },
  "promote": false,
  "ephemeral": true
}
```
Respond with `{ "id": "<your run id>" }`. The request is the brief, reshaped; its schema is
[`schemas/brief.schema.json`](../../../schemas/brief.schema.json). If `rules` is present, your system must obey it.
`promote: false` and `ephemeral: true` mean: don't turn anything learned in this run into approved checks or
baselines.

### `GET /api/runs/:id`: run status
```json
{ "id": "r1", "status": "queued | running | done | failed | cancelled", "error": "optional",
  "cost": { "model_usd": 0.42, "compute_usd": 0.03 }, "started_at": "ISO time", "finished_at": "ISO time" }
```
The adapter polls every 5 s until the status is `done`, `failed` or `cancelled`, or until the brief's budget runs
out. If the budget runs out, it collects whatever findings exist so far. If you can only report one figure, send
`cost.total_usd`; the adapter records it as compute.

### `GET /api/runs/:id/findings`: findings
Either a bare array or `{ "findings": [...] }`. Each finding:
```json
{ "id": "f1", "url": "http://127.0.0.1:49153/expenses?category=meals", "role": "viewer", "step": "filter",
  "selector": "[data-testid=total]", "region": { "x": 0, "y": 0, "w": 100, "h": 20 },
  "category": "consistency", "title": "Total is wrong", "detail": "…", "confidence": 0.9,
  "repro": ["…"], "screenshots": ["https://…"], "detected_at": "ISO time" }
```
- **Route:** `url` or `route` becomes the bench's `where.route` (the path only).
- **Category:** `category` or `kind` becomes a bench category. Common synonyms are accepted ("accessibility",
  "layout", "invariant"…), and anything unknown becomes `functional`, so prefer the bench's own names
  ([`schemas/defs.schema.json`](../../../schemas/defs.schema.json)).
- **Time to first detection:** `detected_at` is turned into seconds since the run started.

## What the adapter will and won't do
- **It only starts runs.** It makes exactly three calls (start, status, findings) and has none that promotes,
  approves or edits anything in your system.
- **It sees only the brief.** Like every container adapter, it runs with only `/bench/brief` (read-only) and
  `/bench/out` mounted. It never sees labels or answer keys.
- **It needs approval for remote systems.** If the API URL isn't on this machine, the adapter refuses to run
  unless `QA_BENCH_REMOTE_APPROVED=1` is passed through, because a remote system may spend money.

## Configuration (passed through by the runner, never printed)
| Variable | Meaning |
|---|---|
| `QA_SYSTEM_API_URL` | Base URL of your run API. If unset, the adapter writes empty findings with a note and exits 1 |
| `QA_SYSTEM_API_TOKEN` | Bearer token, if your API needs one. Keep it in a secret store; never commit it |
| `QA_SYSTEM_PROJECT` | Optional project or tenant to run under |
| `QA_SYSTEM_NAME`, `QA_SYSTEM_VERSION` | How your system is named in reports (default `http-api`) |
| `QA_BENCH_REMOTE_APPROVED` | `1` to allow an API URL that isn't on this machine |

`adapter.json` sets `network: host`, because your system runs outside the episode's docker network. The runner
publishes the app's ports on `127.0.0.1` and puts those URLs in the brief, so your system must run on the same
machine as the bench, or reach it through a tunnel you set up.

```bash
QA_SYSTEM_API_URL=http://127.0.0.1:8787 QA_SYSTEM_NAME=my-qa QA_SYSTEM_VERSION=1.4.0 \
  npx tsx bin/qa-bench.ts run --adapter http-api --track regression
```

## Tests
`npx vitest run harness/adapters/http-api` uses a fake API and makes no network calls. It covers:
- the mapping;
- the approval gate;
- polling and the budget cut-off;
- naming the system;
- that the output passes the findings schema;
- that the token never appears in errors.
