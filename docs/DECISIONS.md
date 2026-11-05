# Decisions

## Made
| Date | Decision | By |
|---|---|---|
| 2026-11-04 | Build an open, tool-agnostic QA benchmark in its own repository, combining permissively licensed benchmarks and apps with our own | vid |
| 2026-11-04 | Use, combine, extend and modify sources where the licence allows (MIT and similar); re-implement methods only where it doesn't | vid |
| 2026-11-05 | Create the repo now as `Vibernt/qa-bench` and push the full brief with a handoff | vid |
| 2026-11-05 | BD2: the expense app and survey site live in this repo (copied in, MIT). Touchstone keeps its own copy for its conformance suite | vid |

## Open (recommendation first)
| # | Question | Recommendation |
|---|---|---|
| BD1 | Repo name and visibility | `Vibernt/qa-bench`, MIT. Private until B5, public from B5. (Created private on 5 Nov; the name can still change) |
| BD3 | Keep a private held-out split? | Yes, about 30% of mutations and changes, never published |
| BD4 | Hosting for hosted episodes | `touchstone-bench-*` on our Fly org, with a separate cap |
| BD5 | Human-baseline vendor and budget | Choose at B4; about 3 testers × 2 sessions on 20 episodes |
| BD6 | Ask the UXBench authors (Jackwwj619/UXBench) to add a licence? | Yes. Method only until then |
| BD7 | Copyleft apps (GPL, AGPL) | Run unmodified when useful; never publish mutations of them |
| BD8 | Accept outside leaderboard entries? | Yes, from B5, with full run records only |

Record each answer in the table above with the date, and move it to "Made".
