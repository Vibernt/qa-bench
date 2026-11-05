# Working in this repo

These rules apply to anyone working here, human or agent. Read [docs/HANDOFF.md](docs/HANDOFF.md) first, then
[docs/BRIEF.md](docs/BRIEF.md) and [docs/DECISIONS.md](docs/DECISIONS.md). Don't re-ask decisions recorded under
"Made". The [README](README.md) explains how to use the bench.

## Standing rules
1. **Write as if the repo were public.**
   - No internal account IDs, hostnames, tenant names, tokens, customer data or personal paths.
   - The bench is system-neutral. No system under test gets special treatment in code, docs or scoring.
2. **Licences before code.** Before vendoring or pinning anything:
   - read its LICENSE file, and record the licence and date in `upstream.json` and in `NOTICE`;
   - never commit material we may not redistribute (the run-only sources in `docs/APPS.md`);
   - never publish mutations of GPL or AGPL apps.
3. **Secrets.**
   - Real secrets, such as a system's API token, come from a secret store or the environment at run time. They are
     passed to adapters by name (`env_passthrough`) and are never printed or committed.
   - Test accounts are generated for each episode and live only in that episode's seed.
4. **Live sites.** Only the noise track touches live sites, and never in CI:
   - **fragmatic.ai:** read-only;
   - **opensenselabs.com:** GET only, no forms, robots.txt honoured, at least 1 s between page loads.
5. **Hosted episodes** (when they exist):
   - use only exact-named `qa-bench-*` resources, with a spend cap;
   - tear them down by exact name;
   - meter every new call path's cost, including overheads.
6. **Browsers and Docker run natively.**
   - Unit tests (`*.test.ts`) need no Docker, no browser and no network; CI runs them.
   - Anything that needs Docker or a browser is a separate script (`verify.ts`, `it.ts`) that you run yourself.
   - Don't run browsers inside a sandboxed sub-agent. Run them on the host afterwards.
7. **Use the smallest capable model** for each task.
8. **The answer key is sealed.**
   - Adapter code must never read `apps/*/mutations/*/label.yaml`, `apps/*/changes/*/label.yaml`,
     `apps/*/baseline/`, `apps/*/verify.ts`, `episodes/`, answer keys or the held-out split.
   - The runner enforces this for container adapters by mounting only the brief and an output folder. Don't add
     shortcuts around it.
   - When you build or tune an adapter, don't look at labels "to check selectors".
9. **Ground truth changes need evidence.**
   - Change a label only when the app's behaviour supports it.
   - `verify.ts` must pass for every `found_by` entry, with its switch on and on the clean build.
   - Never widen a label just to fit one system's findings.
10. **Commits.**
    - Use small, conventional messages (`feat(scorer): …`, `docs(brief): …`).
    - Run `npm run check` before each commit.
    - Push only when the maintainer asks.
