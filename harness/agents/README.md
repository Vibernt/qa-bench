# Agent runs (`harness/agents`)

Benchmark LLM agents, or any outside agent, on bench episodes when the agent is driven by an orchestrator rather
than packaged as a container adapter. Every configuration gets the same set of episodes and the same prompt, and
its findings go through the same scorer as every other system's.

| File | What it is |
|---|---|
| [`configs.yaml`](configs.yaml) | Agent configurations: `id`, `driver`, `model`, `effort`, and `price` (USD per million tokens) |
| [`sets/*.yaml`](sets/) | Named episode sets, e.g. `b0-sample-10` (8 regression episodes and 2 noise episodes) |
| [`prompt.md`](prompt.md) | The one prompt every agent gets. It is built from the brief only. Exploratory briefs (track 7.7) add "No checklist is given: find what is broken before release"; every prompt shows the app's purpose |
| [`src/index.ts`](src/index.ts) | `prepareSession`, `finishSession`, `sanitiseFindings`, `estimateCost` |

## Run a configuration
```bash
npx tsx bin/qa-bench.ts agents list
```
```bash
npx tsx bin/qa-bench.ts agents prepare --config claude-sonnet-5.5-high --set b0-sample-10
```
`prepare`:
- brings each episode up on `127.0.0.1`, as `qa-bench up` does;
- writes each agent's workspace **outside the repository**, under `$QA_BENCH_AGENT_WORKDIR` (default
  `<tmp>/qa-bench-agents/<session>/<episode>/`), containing `brief.json`, `prompt.md` and `evidence/`;
- writes the manifest `runs/<session>/agents.json`, and prints each episode's prompt and findings paths.

The orchestrator then runs one agent per episode with the configuration's model and effort. It gives the agent
`prompt.md`, and the agent writes `findings.json` in its workspace. Finally:
```bash
npx tsx bin/qa-bench.ts agents finish <session> --usage usage.json
```
`finish` does the following:
- sanitises each agent's findings to the schema, dropping unknown fields and unrepairable findings, and turning
  full URLs into paths;
- attaches usage and an estimated cost;
- disqualifies any episode whose audit found sealed-path access;
- takes the episodes down;
- imports the findings through the `human` (manual) adapter;
- scores the run into `runs/<session>/report.{json,md}`.

The prompt, brief, raw findings and usage of each agent are kept under `runs/<session>/<episode>/agent/`.

### Audit a transcript
```bash
npx tsx bin/qa-bench.ts agents audit <transcript.jsonl>…
```
This prints one JSON line per transcript (`claude-code-subagent` driver), counted from the agent's own tool calls:
- sealed-path hits, with samples;
- tool calls;
- screenshots taken, and screenshots looked at (a Read of an image);
- the models that served it.

Copy those numbers into `usage.json`. `finish` writes them into each findings file as `activity`, and the report
averages them per episode. Activity is reported, never scored.

### `usage.json` (written by the orchestrator)
```json
{ "episodes": { "regression-003": {
  "total_tokens": 182340, "duration_s": 312.5, "tool_uses": 41, "screenshots_taken": 6, "screenshots_viewed": 4,
  "served_model": "claude-sonnet-5-5",
  "audit": { "sealed_path_hits": 0, "checked": "tool inputs in the agent transcript" } } } }
```
- **Cost:** give `input_tokens`, `output_tokens` and `cache_read_tokens` when you have them, and the cost is
  exact. With only `total_tokens`, the estimate assumes 85% cache reads, 10% fresh input and 5% output, and the
  report notes the range from all-cache-read to all-fresh.

## Sealing, honestly
Container adapters can't reach the answer key, because only the brief and an output folder are mounted. Agents
driven this way run on the orchestrator's machine, so sealing rests on three things:
1. **The prompt and the agent definition.** Agents get only the brief, are told to work only in their workspace,
   and must not read other files or run docker. The workspace is outside the repository. The `qa-tester` subagent
   type has only shell and file tools.
2. **An audit.** The orchestrator scans every tool input in each agent's transcript for sealed paths: labels,
   `mutations/`, `changes/`, `baseline/`, `episodes/`, answer keys, `verify.ts` and the repository path. It
   reports the count as `audit.sealed_path_hits`.
3. **Disqualification.** An episode with any hit has its findings dropped, and the report says so.

A container adapter that calls a model API directly (planned: `claude-agent`, once an API key is configured) would
be sealed like every other adapter, with exact per-call cost. Prefer it for published leaderboard entries.

## Drivers
- **`claude-code-subagent`:** a Claude Code session is the orchestrator. For each episode it starts a subagent with
  `subagent_type: qa-tester`, the configuration's `model` and `effort`, and the episode's `prompt.md`. The
  `qa-tester` definition ([`.claude/agents/qa-tester.md`](../../.claude/agents/qa-tester.md)) limits the subagent
  to shell and file tools (`Bash, Read, Write, Edit, Glob`: no messaging, docs or session tools) and tells it to
  work only in the workspace the task names. The subagent drives Chromium through Playwright from its workspace. The session then takes `total_tokens` and duration from the subagent's
  completion notice, and audits its transcript.
- **Adding a driver** (another vendor's agent CLI, a hosted agent): add configurations with a new `driver` value.
  The driver must give each agent its `prompt.md`, let it write `findings.json` and record usage. `prepare` and
  `finish` stay the same.

## Add a model, an effort level or a set
- **A model or effort level:** add an entry to `configs.yaml`, with its price.
- **A set:** add `sets/<id>.yaml` listing episode ids. Choose sets for balance across apps and episode kinds, and
  say so in the set's description. Never put what an episode switches on in a set file.
