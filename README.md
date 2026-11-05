# QA Bench

**An open benchmark for human-like QA of websites and web apps.**

Status (5 Nov 2026): **plan only. Nothing is built yet.** This repository holds the full brief so that work can
start in a fresh session. The repo is private until phase B5 (public release). It is MIT-licensed.

## What it is

QA Bench measures how well a QA system finds real problems in websites and signed-in web apps **without raising
false alarms**. It works for:
- automated agents (Touchstone, BrowserGym agents, others);
- scripted suites (Playwright, Cypress);
- paid human testers.

Every system gets the same brief, runs against the same pinned builds, and is scored by the same scorer against
the same answer key.

## Why build it

No published benchmark does all of these (details in [docs/REFERENCES.md](docs/REFERENCES.md)):
- **Labelled deliberate changes**, so we can count false alarms on changes made on purpose (a redesign, new copy,
  a price change). For a product that runs every hour on a live site, this is the number that matters most.
- **All QA categories on the same apps:** functional, consistency, permissions, visual, copy, accessibility, speed,
  usability, email, security hygiene and localisation.
- **Signed-in, multi-role apps** with email, magic links and one-time codes.
- **A split between deterministic checks and judgement calls**, with judge calibration scored, so a cheap judge
  model can be trusted only where it has earned it.
- **A human baseline** on the same builds, with cost.

It is also the evidence behind a specific claim: that [Touchstone](https://github.com/Vibernt/touchstone) can
replace a strong human QA team. Touchstone is one adapter here, not a privileged one.

## Read next

| File | What's in it |
|---|---|
| [docs/BRIEF.md](docs/BRIEF.md) | The full brief: intent, principles, layout, contracts, tracks, mutations, scoring, infrastructure, phases, spikes |
| [docs/APPS.md](docs/APPS.md) | Every app we will run or maintain, with licence, use, tracks and what we plant in it |
| [docs/REFERENCES.md](docs/REFERENCES.md) | Benchmarks and papers we borrow from, with verified licences |
| [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) | What we need: tools, infrastructure, accounts, budget, people |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Open owner decisions (BD1–BD8) and the ones already made |
| [docs/HANDOFF.md](docs/HANDOFF.md) | Where things stand and the exact next step. **Start here if you are resuming.** |
| [AGENTS.md](AGENTS.md) | Standing rules for anyone (human or agent) working in this repo |

## Licence

Our own code and data: MIT ([LICENSE](LICENSE)). Third-party material keeps its own licence in its own folder and is
listed in [NOTICE](NOTICE). Material we may not redistribute is fetched at setup by pinned digest and never
committed.
