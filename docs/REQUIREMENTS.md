# What we need

## Tools (local)
- **Docker** with compose v2.
- **Node 22 LTS** and npm.
- **Playwright** with its browsers, for the `playwright-suite` adapter and for browser tests. Run it natively, not
  inside a sandboxed agent (see [AGENTS.md](../AGENTS.md)).
- **`gh` CLI**, signed in as a Vibernt org member.
- **Disk:** about 40 GB for images once B3 adds WebArena; B0 needs about 5 GB.

## Infrastructure
| Need | Phase | Plan |
|---|---|---|
| Local episode runner | B0 | docker compose; one network per episode |
| CI | B0 | GitHub Actions: schema validation, unit tests, scorer tests on recorded findings. No live apps in CI until B1 |
| Hosted episodes for Touchstone's cloud runners and human testers | B0 (Touchstone adapter), B4 (humans) | Exact-named `touchstone-bench-*` on our Fly org, with its own spend cap (BD4) |
| Test inbox | B1 | Mailpit per episode |
| Identity provider | B1 | Keycloak test realms per episode |
| Held-out split | B1 | A separate private repo, mounted at run time |
| Image registry for pinned app builds | B1 | GHCR under Vibernt (private until B5) |

## Accounts and access
- GitHub: the `Vibernt` org. This repo is private until B5.
- Fly / Northflank: only for hosted episodes, under Touchstone's ownership rules (exact names, caps, metering).
- **No real credentials anywhere in this repo.** Test accounts are generated for each episode and recorded in its
  seed. Any real secret comes from the macOS Keychain and is never printed or committed.

## Money
| Item | Estimate | Decision |
|---|---|---|
| Hosted episodes | Small: one Fly machine per episode for minutes | BD4 cap |
| Model spend for judge calibration (B2) and agent runs | Metered per run; reported in each run record | Within Touchstone's caps |
| Human baseline (B4) | About 3 testers × 2 time-boxed sessions on 20 episodes | BD5 |

## People and decisions
- **vid (owner):** decisions BD1–BD8; reviews a sample of agent-generated mutations; signs off licence rechecks
  before B5.
- **Paid testers:** B4 only.
