# Decisions

## Made
| Date | Decision | By |
|---|---|---|
| 2026-11-04 | Build an open, tool-agnostic QA benchmark in its own repository, combining permissively licensed benchmarks and apps with our own | vid |
| 2026-11-04 | Use, combine, extend and modify sources where the licence allows (MIT and similar); re-implement methods only where it doesn't | vid |
| 2026-11-05 | Create the repo now as `Vibernt/qa-bench` and push the full brief with a handoff | vid |
| 2026-11-05 | BD2: the expense app and survey site live in this repo (MIT) | vid |
| 2026-11-05 | The bench is system-neutral: no system under test is named or privileged in code or docs; systems plug in through adapters (`http-api` for services) | vid |
| 2026-11-05 | Exploratory briefs give the URL, the roles and a one-line product purpose, with no journeys or checklist | vid |
| 2026-11-05 | Mixed regression episodes carry 2-3 planted bugs, at most one of them blatant; clean and twin episodes stay | vid |
| 2026-11-05 | Swag Labs' publicly documented faulty users stay, but are scored apart as "known" exposure; the headline score uses novel (unpublished) bugs | vid |
| 2026-11-05 | Tag v0.1.0-b0 now and keep the repository private; going public (and whether history starts fresh) waits for B5, and the held-out repository is created by vid | vid |

## Open (recommendation first)
| # | Question | Recommendation |
|---|---|---|
| BD1 | Repo name and visibility | `Vibernt/qa-bench`, MIT. Private until B5, public from B5. (Created private on 5 Nov; the name can still change) |
| BD3 | Keep a private held-out split? | Yes, about 30% of mutations and changes, never published |
| BD4 | Hosting for hosted episodes | Exact-named `qa-bench-*` resources on one container host, with a separate spend cap |
| BD5 | Human-baseline vendor and budget | Choose at B4; about 3 testers × 2 sessions on 20 episodes |
| BD6 | Ask the UXBench authors (Jackwwj619/UXBench) to add a licence? | Yes. Method only until then |
| BD7 | Copyleft apps (GPL, AGPL) | Run unmodified when useful; never publish mutations of them |
| BD8 | Accept outside leaderboard entries? | Yes, from B5, with full run records only |

Record each answer in the table above with the date, and move it to "Made".
