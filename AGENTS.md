# Working in this repo

Rules for anyone working here, human or agent. Read [docs/HANDOFF.md](docs/HANDOFF.md) first, then
[docs/BRIEF.md](docs/BRIEF.md) and [docs/DECISIONS.md](docs/DECISIONS.md). Don't re-ask decisions recorded under
"Made".

## Standing rules
1. **This repo goes public at B5.** Write everything as if it already were.
   - No internal account IDs, hostnames, tenant names, tokens or customer data.
   - Internal operating details stay in Touchstone's private repo.
2. **Licences before code.** Before vendoring or pinning anything:
   - read its LICENSE file and record the licence and date in `upstream.json` and in `NOTICE`;
   - never commit material we may not redistribute (the run-only sources in `docs/APPS.md`);
   - never publish mutations of GPL or AGPL apps.
3. **Secrets.**
   - Real secrets come only from the macOS Keychain and are never printed or committed.
   - Test accounts are generated for each episode and live only in that episode's seed.
4. **Live sites.** Only the noise track touches live sites:
   - **fragmatic.ai:** read-only.
   - **opensenselabs.com:** GET only, no forms, robots.txt honoured, at least 1 s between loads.
5. **Cloud.**
   - Hosted episodes use only exact-named `touchstone-bench-*` resources, under Touchstone's ownership rules and caps.
   - Tear down by exact name.
   - Meter every new call path's cost, including overheads.
6. **Codex builds; Claude orchestrates** (same as Touchstone).
   - Run `codex exec` with `PLAYWRIGHT_BROWSERS_PATH=/Users/vid/vibernt/touchstone-live/no-browsers` and stdin
     closed (`< /dev/null`).
   - Keep browser tests out of Codex briefs; rerun them natively afterwards. Sandboxed Chromium crashes and floods
     vid with dialogs.
7. **Use the smallest capable model** for each task.
8. **The answer key is sealed.**
   - An adapter must never read `apps/*/mutations/*/label.yaml`, `changes/*/label.yaml`, episode answer keys or the
     held-out repo.
   - The runner enforces this. Don't add shortcuts around it.
9. **Commits.** Use small, conventional messages (`feat(scorer): …`, `docs(brief): …`). Push only when vid asks.
