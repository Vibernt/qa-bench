# `noop` adapter

The runner's smoke test and the zero-finding floor. It reads `/bench/brief/brief.json`, makes one `GET` to the
first target (for a live site it first reads `robots.txt` and waits `rules.min_interval_ms`), and writes a valid
`findings.json` with no findings. The fetch result is in the findings' `notes` and in `adapter.log`.

Plain Node on `node:22-alpine`; nothing is downloaded at build time.

```sh
npx tsx bin/qa-bench.ts run --adapter noop --track regression --limit 3
```
