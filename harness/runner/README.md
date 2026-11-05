# Runner

Brings up an episode on its own docker network, hands the adapter a brief, collects findings within the
budget, and always tears down (HANDOFF step 5). Local docker only.

```sh
npx tsx bin/qa-bench.ts generate regression
npx tsx bin/qa-bench.ts build-apps expense-app                       # optional: run builds what it needs
npx tsx bin/qa-bench.ts run --adapter noop --track regression        # then scores, unless --no-score
npx tsx bin/qa-bench.ts run --adapter noop --episodes regression-001,regression-004 --run-id smoke --parallel 2
npx tsx bin/qa-bench.ts report runs/smoke                            # scores and prints report.md
```

From code: `runEpisodes(selection, options)`, `runEpisode(ctx, id)` and `buildAppImage(app, options)` from
`harness/runner/src/index.ts`. Options take `appsRoot`, `episodesRoot`, `runsRoot`, `adaptersRoot` and
`tracksRoot`, plus an injectable `exec` (the unit tests run the whole flow against a fake docker).

## What a run does
1. Writes `runs/<run-id>/run.json` (id, bench version, adapter, start and finish time, tracks, episodes, and each
   track's seed for the report). The run id is `<adapter>-<YYYYMMDD-HHMMSS>` (UTC) unless `--run-id` is given.
2. Builds the adapter image once (`qa-bench-adapter-<name>:<version>`) and each app's image once
   (`docker build` of every compose service with `build:`, tagged with its `image:`, normally
   `qa-bench-app-<app>:local`). An app's `available.fetch` script runs first, if it has one.
3. For each episode (sequential; `--parallel N` for more):
   - **Skips** it (`runner.json` status `skipped`, with the reason) when the app, its compose file, its
     `available.requires_env` or its image is missing, or when `compose up` fails. Live episodes are skipped
     unless `QA_BENCH_ALLOW_LIVE=1`.
   - Writes the episode's env to `<ep>/compose.env` (mode 0600) and runs
     `docker compose -p qab-<run>-<ep> -f apps/<app>/compose.yaml [-f <ep>/compose.override.yaml] --env-file <ep>/compose.env up -d --no-build --wait`.
     Compose gets a minimal environment (PATH, HOME, docker settings), because the shell would otherwise
     override the env file and a stray host variable could switch a defect on.
   - For an adapter with `network: host`, the override publishes each target port on `127.0.0.1` with an
     ephemeral host port, read back with `docker compose port`.
   - Writes `<ep>/brief/brief.json`, then runs the adapter (below), killing it at
     `budget.wall_time_s` + grace (30 s, `--grace`) with status `timeout`.
   - Always, in `finally`: removes the adapter container, `docker compose … down -v --remove-orphans`, deletes
     the env file. Then `runner.json`.
4. Scores the run with the scorer (`report.json`, `report.md`, one `score.json` per episode).

Statuses: `scored` (valid findings collected, even after a non-zero exit, which is recorded), `invalid_findings`
(exit 0 but `out/findings.json` missing, not valid, or for another episode), `adapter_error` (non-zero exit with no
valid findings, or the adapter image didn't build), `timeout`, `skipped`.

## The brief
Built only from `app.yaml`, the track and the episode's accounts: `episode_id`, `bench_version`, `app`, `track`,
`targets` (`http://<service>:<port><path>` on the episode network, or `http://127.0.0.1:<port><path>` for host
adapters, or the live URL), `roles` with their accounts, `budget` (the track's, default 600 s), `journeys` when
the track sets `brief.journeys`, `goal`, `pages`, `rules` (live sites), `categories` and `out`
(`/bench/out/findings.json`, `/bench/out/evidence`). `categories` is the track's scope: every category any label
of the track's apps carries, the same for every episode of the track. Nothing comes from the answer key,
`episode.active` or the episode's env, and a unit test checks that no active label id, switch key or switch value
appears in any brief.

## Sealing model (AGENTS.md rule 8)
The adapter runs as
`docker run --rm --name … --network <episode network | host | bridge> -v <ep>/brief:/bench/brief:ro -v <ep>/out:/bench/out -e QA_BENCH_BRIEF=… -e QA_BENCH_OUT=… [-e NAME …] <image>`:
- **Two mounts only:** the brief, read-only, and its own `out/` (made writable for the container's user). The repo,
  `apps/`, `episodes/`, answer keys and the rest of the run folder are never mounted, and the runner's own files
  (`compose.env`, `runner.json`, logs) sit outside both mounted folders.
- **Env by name only:** the manifest's `env_passthrough` names, with values taken from the runner's environment
  (never on the command line and never printed), plus the two fixed bench paths. Nothing else from the host.
- **Network:** the episode's compose network, so the adapter sees the app's services and nothing of other episodes;
  `host` for systems that run outside docker; the default bridge for live sites.

`adapterRunArgs` in `src/docker.ts` builds that argv, and `test/runner.test.ts` asserts it: exactly the two mounts,
no `--mount`, `--volumes-from`, `--privileged` or `--env-file`, no repo paths, and only allow-listed env.

## Manual adapters
For `mode: manual` (a person files findings), the runner writes each brief and imports findings with
`--findings <file>` (one episode) or `--findings <dir>` holding `<episode-id>.json` or `<episode-id>/findings.json`.
Bringing the app up for a person is not part of B0.

## Behind a TLS-intercepting proxy: `QA_BENCH_BUILD_CA`
Set `QA_BENCH_BUILD_CA=<path to a PEM bundle>` and every image build (apps and adapters) becomes
`docker build --network host --secret id=extra_ca,src=$QA_BENCH_BUILD_CA [--build-arg HTTPS_PROXY --build-arg HTTP_PROXY --build-arg NO_PROXY] …`.
The proxy values are passed by name (docker reads them from the environment), so they never appear on a command
line or in a log. Dockerfiles use the CA through an optional secret mount, so nothing is baked into the image and
the same Dockerfile builds with a plain `docker build` elsewhere (see `apps/expense-app/Dockerfile`).

## Live sites
Live episodes (noise track, `generate --live`) need `QA_BENCH_ALLOW_LIVE=1` and never run in CI. Their rules
(GET only, no forms, robots.txt honoured, at least 1 s between page loads) are in the brief and the adapter must
honour them; the runner does not proxy or police the adapter's traffic in B0.

## Checks
- `npx vitest run harness/runner`: argv sealing, brief seals, statuses, teardown, env-file handling, host-network
  ports, live gating and manual import, all against a fake docker.
- `npx tsx harness/runner/verify.ts` (native, needs docker; add `QA_BENCH_BUILD_CA` behind a proxy): generates
  the regression track into a temp folder, runs a clean, a mixed and a twin episode with `noop`, one with a
  host-network `noop`, one that overruns its budget, scores, and checks that no containers or networks are left.
