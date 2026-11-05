# Episode generator

Turns a track file into episodes (BRIEF §6.3): one app at a pinned build, a set of switched-on mutations and
deliberate changes, a seed, and a sealed answer key.

```sh
npx tsx bin/qa-bench.ts generate regression            # tracks/regression.yaml -> episodes/regression/
npx tsx bin/qa-bench.ts generate --all                 # every tracks/*.yaml (regression, exploration, noise)
npx tsx bin/qa-bench.ts generate noise --live          # also the live-site episodes (see below)
npx tsx bin/qa-bench.ts generate regression --apps expense-app   # only some of the track's apps (local work)
npx tsx bin/qa-bench.ts generate regression --heldout-root ../qa-bench-heldout/episodes
```

From code: `generateTrack(trackFile, { appsRoot, episodesRoot, heldoutRoot, live, onlyApps, write })` and
`loadApps(appsRoot)` from `harness/generator/src/index.ts`.

## Inputs
- `tracks/<id>.yaml` (schema `track`): apps with weights, which mutations and changes (`'*'` or a list), and
  `episodes: { count, seed, mutations_per_episode, changes_per_episode, clean_episodes, twin_episodes,
  max_blatant_per_episode }`.
- `apps/<app>/app.yaml`, `apps/<app>/upstream.json`, and every `apps/<app>/{mutations,changes,baseline}/*/label.yaml`.
  Everything is validated against `schemas/` before use; any error stops generation.

## Output
For each episode, `episodes/<track>/<track>-NNN/`:
- `answer-key.json` (schema `answer-key`): the full label objects of the active defects and changes, plus all of
  the app's baseline labels, and `noise_only` from `app.yaml`.
- `episode.json` (schema `episode`): `active`, `seed`, `kind` (`clean` | `twin` | `mixed`), `accounts`, `env`,
  `upstream` (the app's repo, use and pin), and `answer_key_sha256`: the sha256 of `answer-key.json` exactly as
  written, so a report proves which key scored it.

`env` is what the runner hands to `docker compose`: every switch key any label of the app could set (blank unless
active, so a stray host value can't switch anything on), then `seed_env`, then the active labels' `switch.env`
(the same variable from several labels is comma-joined in label-id order), then one `role.env` per role with that
role's generated accounts as `user:pass[,user:pass]`. Accounts are test values made from the episode seed
(`editor-7f3a` and a 16-character password), or an app's `fixed` accounts.

The track's folder is deleted before writing, so stale episodes never survive. `episodes/` is gitignored:
regenerate rather than edit.

## How episodes are chosen
- **Deterministic.** A local PRNG (mulberry32, seeds mixed with FNV-1a and a splitmix finaliser) is seeded from
  `episodes.seed`; each episode's own seed is derived from the track seed and its index. Every list is sorted
  before it is used, and nothing time-dependent is written. Same inputs give byte-identical files.
- **Kinds.** `clean_episodes` have nothing switched on. `twin_episodes` switch on only deliberate changes: they
  are the twin whose findings give the false-alarm number. The rest are `mixed`, with
  `mutations_per_episode` defects and `changes_per_episode` changes. Kinds are shuffled into position.
- **Apps by weight.** A mixed episode only goes to an app with defects, a twin only to an app with changes.
- **Coverage first.** Labels are picked least-used first, so every listed mutation and change is on at least once
  before any repeats, as far as the count allows. When the count can't cover everything the generator says so
  (`warning: not covered`).
- **Exclusive groups.** Two labels with the same `switch.exclusive` are never on together.
- **Defect mix.** `max_blatant_per_episode` caps the defects with `difficulty: blatant` in one mixed episode (a
  label with no `difficulty` counts as blatant); subtle defects fill the rest. The cap applies to defects only, not
  to deliberate changes. Coverage still comes first: a covered defect is repeated only when no uncovered one of
  that app fits the episode (another blatant one doesn't fit once the cap is reached).
- **Short episodes.** When an app can't supply `mutations_per_episode.min` valid defects at once (Swag Labs' faulty
  users all share one exclusive group, so it supplies one), the episode takes as many as are valid rather than
  failing, and the generator warns once per track, naming the apps.
- **Splits.** Public episodes use public labels (and public baselines) only. Held-out labels go only to held-out
  episodes (`<track>-hNNN`), written under `--heldout-root` or `QA_BENCH_HELDOUT_DIR`; the generator refuses a
  held-out root inside the repo or inside the public episodes root.

## Live sites
A track's `live:` entries (noise track only) become episodes only with `--live`. Each is
`<track>-live-NN` with app id `live` (no folder under `apps/`), `kind: clean`, no accounts, no env, and an empty
answer key with `noise_only: true`: nothing is planted and nothing is excused, so every finding is a false
alarm. `episode.live` carries the site's name, URL, pages and rules; the runner copies the rules into the brief and
refuses to run live episodes unless `QA_BENCH_ALLOW_LIVE=1`.

## Tests
`npx vitest run harness/generator` uses the fixture apps and tracks in `test/fixtures/`.
