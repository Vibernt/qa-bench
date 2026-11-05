# References: benchmarks and papers we borrow from

Licences were checked on 4 Nov 2026 from each project's LICENSE file or dataset card. **Recheck before each release.**

**Ways to use a source:**
- **Adopt:** vendor or fork, modify, redistribute.
- **Mutate:** run pinned upstream, publish our patches.
- **Run only:** pull at setup, never redistribute.
- **Method only:** re-implement the idea and cite the paper. Methods aren't covered by copyright. Code and data
  released without a licence are, so we can't use them.

## Benchmarks and datasets

| Source | What it is | Licence | Use | What we take |
|---|---|---|---|---|
| **WebTestBench**: [repo](https://github.com/friedrichor/WebTestBench), [paper](https://arxiv.org/abs/2603.25226), [data](https://huggingface.co/datasets/friedrichor/WebTestBench) | Web apps made with an AI app builder, with natural defects. The agent writes its own checklist, then finds defects. Every model scored < 30% F1 | Apache-2.0 (code and dataset) | **Adopt** | Apps and labels as track 7.2; their checklist-then-detect protocol as one of our adapter modes |
| **ACT rules**: [repo](https://github.com/act-rules/act-rules.github.io) | W3C accessibility conformance rules with passing and failing test cases | W3C Software and Document License: copy, modify and redistribute with the notice kept and changes marked | **Adopt** | Rule-level accessibility ground truth (track 7.5) |
| **UI-UX "UXBench"**: [repo](https://github.com/afx-team/UI-UX) (CVPR 2026 Findings) | 2,000 Q&A samples on real mobile UI screenshots for UX defect diagnosis | MIT repo; the screenshots are of third-party apps | **Run only** | Judge calibration on mobile UX (7.9). Never redistribute the screenshots |
| **UXBench**: [repo](https://github.com/Jackwwj619/UXBench), [paper](https://arxiv.org/abs/2606.16262) | Runnable web fixtures; a UX critique is scored by how well a repair agent fixes the page from it | **No licence** (all rights reserved) | **Method only** (BD6: ask the authors) | Repro quality: a fixed repair agent tries to act on each finding (section 9) |
| **GUITestScape**: [paper](https://arxiv.org/abs/2605.29532) | 61 Android apps, 508 planted interaction and display defects, an open-set judge | No code or data released | **Method only** | Explore, detect and report scored separately; a verifier per defect |
| **uxCUA / uxWeb**: [paper](https://arxiv.org/abs/2604.26020) | 2,586 sites where coding agents inserted usability defects, with labels | No code or data released | **Method only** | Agent-generated mutations with validation (section 8.3) |
| **RefGlitch-Bench**: [paper](https://arxiv.org/abs/2604.11082) | Game glitch detection against a reference frame | No repo found | **Method only** | Judging against an approved reference (SP36) |
| **GlitchBench**: [data](https://huggingface.co/datasets/glitchbench/GlitchBench) | Game glitch screenshots | MIT card; the content is game footage | Not used | Not web |
| **WebArena**: [repo](https://github.com/web-arena-x/webarena) | Self-hosted sites with goal tasks | Code Apache-2.0; bundled images and content aren't redistributable | **Run only** | Goal-only usability (7.8) |
| **VisualWebArena**: [repo](https://github.com/web-arena-x/visualwebarena) | Visual web tasks | Code MIT; same content caveat | **Run only** | As WebArena |
| **BrowserGym**: [repo](https://github.com/ServiceNow/BrowserGym) | Common harness for web agents | Apache-2.0 | **Adopt** (adapter) | The `browsergym-agent` adapter |
| **axe-core**: [repo](https://github.com/dequelabs/axe-core) | Accessibility engine | MPL-2.0 (copyleft per file) | Use unmodified | A reference detector |
| **W3C before-and-after accessibility demo** | Inaccessible and fixed versions of a demo site | **Unverified**: no source repo found | Left out | The ACT cases cover the same ground |

## Apps

See [APPS.md](APPS.md). Every app there has its licence and use recorded.

## Citing

When the bench uses a method from a paper, the README for that track cites it. A full `CITATIONS.bib` is due at B5.
