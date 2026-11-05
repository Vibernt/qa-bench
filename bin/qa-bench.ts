#!/usr/bin/env -S npx tsx
// QA Bench command line. `npx tsx bin/qa-bench.ts <command>` or `npm run qa-bench -- <command>`.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { REPO_ROOT } from '../lib/io.ts';
import { validateRepo } from '../scripts/validate.ts';
import { scoreRun } from '../scorer/src/index.ts';
import { DEFAULT_APPS_ROOT, DEFAULT_TRACKS_ROOT, generateTrack, listTrackFiles } from '../harness/generator/src/index.ts';
import { buildAppImage, downEpisode, runEpisodes, upEpisode } from '../harness/runner/src/index.ts';
import { finishSession, loadConfigs, prepareSession, type UsageFile } from '../harness/agents/src/index.ts';

const USAGE = `usage: qa-bench <command> [options]

  validate                                   validate every contract file in the repo
  generate <track…|--all> [--live] [--heldout-root D] [--apps a,b] [--episodes-root D]
                                             generate episodes from tracks/<track>.yaml
  build-apps [app…]                          build app images (default: every app with a compose file)
  run --adapter <name> (--track T | --episodes id,id) [--run-id X] [--parallel N] [--limit N] [--no-score]
      [--findings F] [--grace S] [--episodes-root D] [--runs-root D]
                                             run episodes with an adapter, then score them
  up <episode> [--session S]                 bring one episode up on 127.0.0.1 for a person; prints the brief
  down <session>/<episode>                   take it down again (folder under runs/)
  agents list                                agent configs and episode sets (harness/agents)
  agents prepare --config C --set S [--session X] [--budget S]
                                             bring a set up for agents; writes workspaces + runs/<session>/agents.json
  agents finish <session> [--usage usage.json] collect findings, record usage and audit, tear down, score
  score <runDir> [--episodes-root D]         score a run: writes score.json, report.json, report.md
  report <runDir> [--episodes-root D]        score a run and print report.md

env: QA_BENCH_BUILD_CA=<pem>  build behind a TLS-intercepting proxy;  QA_BENCH_ALLOW_LIVE=1  run live episodes;
     QA_BENCH_HELDOUT_DIR=<dir>  held-out episodes root (outside the repo)`;

function fail(msg: string): never {
  console.error(msg);
  process.exit(2);
}

function list(v: string | undefined): string[] | undefined {
  return v ? v.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
}

function int(v: string | undefined, name: string): number | undefined {
  if (v === undefined) return undefined;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0) fail(`--${name} must be a non-negative integer`);
  return n;
}

function trackFile(arg: string): string {
  if (existsSync(arg) && arg.match(/\.ya?ml$/)) return resolve(arg);
  for (const ext of ['yaml', 'yml']) {
    const f = join(DEFAULT_TRACKS_ROOT, `${arg}.${ext}`);
    if (existsSync(f)) return f;
  }
  return fail(`no track '${arg}' (looked in ${DEFAULT_TRACKS_ROOT})`);
}

async function main(argv: string[]): Promise<number> {
  const [cmd, ...rest] = argv;
  const { values: o, positionals } = parseArgs({
    args: rest,
    allowPositionals: true,
    options: {
      all: { type: 'boolean' },
      live: { type: 'boolean' },
      'heldout-root': { type: 'string' },
      apps: { type: 'string' },
      'episodes-root': { type: 'string' },
      'runs-root': { type: 'string' },
      adapter: { type: 'string' },
      track: { type: 'string' },
      episodes: { type: 'string' },
      'run-id': { type: 'string' },
      session: { type: 'string' },
      config: { type: 'string' },
      set: { type: 'string' },
      usage: { type: 'string' },
      budget: { type: 'string' },
      parallel: { type: 'string' },
      limit: { type: 'string' },
      'no-score': { type: 'boolean' },
      findings: { type: 'string' },
      grace: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  if (o.help) {
    console.log(USAGE);
    return 0;
  }
  const episodesRoot = o['episodes-root'] ? resolve(o['episodes-root']) : undefined;

  switch (cmd) {
    case 'validate': {
      const { problems, checked } = validateRepo();
      for (const p of problems) console.error(p);
      console.log(`validate: ${checked} contract files checked, ${problems.length} problem(s)`);
      return problems.length ? 1 : 0;
    }

    case 'generate': {
      const files = o.all ? listTrackFiles() : positionals.map(trackFile);
      if (!files.length) fail('generate: name a track or pass --all');
      for (const f of files) {
        const r = generateTrack(f, {
          episodesRoot,
          heldoutRoot: o['heldout-root'] ? resolve(o['heldout-root']) : undefined,
          live: o.live,
          onlyApps: list(o.apps),
        });
        const kinds = r.episodes.reduce<Record<string, number>>((m, g) => ((m[g.episode.kind ?? 'mixed'] = (m[g.episode.kind ?? 'mixed'] ?? 0) + 1), m), {});
        console.log(`${r.track.id}: ${r.episodes.length} episode(s) ${JSON.stringify(kinds)}${r.heldout.length ? `, ${r.heldout.length} held-out` : ''}`);
        for (const w of r.warnings) console.log(`  warning: ${w}`);
      }
      return 0;
    }

    case 'build-apps': {
      const apps = positionals.length
        ? positionals
        : readdirSync(DEFAULT_APPS_ROOT).filter((a) => existsSync(join(DEFAULT_APPS_ROOT, a, 'app.yaml'))).sort();
      let bad = 0;
      for (const app of apps) {
        const r = await buildAppImage(app, { log: (l) => console.log(l) });
        console.log(r.ok ? `${app}: built ${r.images.join(', ') || '(nothing to build)'}` : `${app}: unavailable: ${r.reason}`);
        if (!r.ok) bad++;
      }
      return bad ? 1 : 0;
    }

    case 'run': {
      if (!o.adapter) fail('run: --adapter is required');
      if (!o.track && !o.episodes) fail('run: give --track or --episodes');
      const summary = await runEpisodes(
        { adapter: o.adapter, track: o.track, episodes: list(o.episodes), runId: o['run-id'], parallel: int(o.parallel, 'parallel'), limit: int(o.limit, 'limit') },
        {
          episodesRoot,
          runsRoot: o['runs-root'] ? resolve(o['runs-root']) : undefined,
          findingsImport: o.findings ? resolve(o.findings) : undefined,
          graceS: int(o.grace, 'grace'),
        },
      );
      const counts = summary.results.reduce<Record<string, number>>((m, r) => ((m[r.status] = (m[r.status] ?? 0) + 1), m), {});
      console.log(`run ${summary.runId}: ${JSON.stringify(counts)} -> ${summary.runDir}`);
      if (!o['no-score']) {
        scoreRun(summary.runDir, { episodesRoot });
        console.log(`scored: ${join(summary.runDir, 'report.md')}`);
      }
      return 0;
    }

    case 'up': {
      const id = positionals[0];
      if (!id) fail('up: name an episode (e.g. regression-004)');
      const { session, brief } = await upEpisode(id, {
        episodesRoot, sessionId: o.session, runsRoot: o['runs-root'] ? resolve(o['runs-root']) : undefined, log: () => {},
      });
      console.log(`episode ${id} is up (session ${session.session_id})\n`);
      for (const t of brief.targets) console.log(`  open      ${t.url}`);
      for (const r of brief.roles) for (const a of r.accounts) console.log(`  sign in   ${r.role}: ${a.username} / ${a.password}`);
      console.log(`  budget    ${brief.budget.wall_time_s} s`);
      console.log(`\n  brief     ${session.brief}`);
      console.log(`  findings  write them to ${session.findings} (see harness/adapters/human/README.md)`);
      console.log(`\nwhen done:\n  npx tsx bin/qa-bench.ts down ${session.session_id}/${id}`);
      console.log(`  npx tsx bin/qa-bench.ts run --adapter human --episodes ${id} --findings ${session.findings}`);
      return 0;
    }

    case 'down': {
      const target = positionals[0];
      if (!target) fail('down: give <session>/<episode> (a folder under runs/)');
      const dir = existsSync(target) ? resolve(target) : join(REPO_ROOT, 'runs', target);
      await downEpisode(dir);
      console.log(`down: ${target}`);
      return 0;
    }

    case 'agents': {
      const sub = positionals[0];
      if (sub === 'list') {
        for (const c of loadConfigs()) console.log(`config  ${c.id}  (${c.driver}, ${c.model}, effort ${c.effort ?? 'default'})`);
        const setsDir = join(REPO_ROOT, 'harness', 'agents', 'sets');
        for (const f of readdirSync(setsDir).filter((x) => x.endsWith('.yaml')).sort()) console.log(`set     ${f.replace(/\.yaml$/, '')}`);
        return 0;
      }
      if (sub === 'prepare') {
        if (!o.config || !o.set) fail('agents prepare: give --config and --set (see `agents list`)');
        const m = await prepareSession(o.config, o.set, { episodesRoot, session: o.session, budgetS: int(o.budget, 'budget') });
        console.log(JSON.stringify({ session: m.session, manifest: join(REPO_ROOT, 'runs', m.session, 'agents.json'), episodes: m.episodes.map((e) => ({ episode: e.episode_id, prompt: e.prompt, findings: e.findings })) }, null, 2));
        return 0;
      }
      if (sub === 'finish') {
        const session = positionals[1];
        if (!session) fail('agents finish: give the session id');
        const usage = o.usage ? (JSON.parse(readFileSync(resolve(o.usage), 'utf8')) as UsageFile) : undefined;
        const report = await finishSession(session, { episodesRoot, usage });
        const m = report.metrics.overall;
        console.log(`${session}: recall ${m.recall ?? '—'}, precision ${m.precision ?? '—'}, false alarms/100 ep ${m.false_alarms_per_100_episodes ?? '—'} -> ${join(REPO_ROOT, 'runs', session, 'report.md')}`);
        return 0;
      }
      return fail('agents: list | prepare | finish');
    }

    case 'score':
    case 'report': {
      const dir = positionals[0];
      if (!dir) fail(`${cmd}: give a run folder (e.g. runs/noop-20261105-120000)`);
      const runDir = existsSync(dir) ? resolve(dir) : join(REPO_ROOT, 'runs', dir);
      const report = scoreRun(runDir, { episodesRoot });
      if (cmd === 'report') process.stdout.write(readFileSync(join(runDir, 'report.md'), 'utf8'));
      else console.log(`scored ${report.episodes.length} episode(s): ${join(runDir, 'report.json')}, ${join(runDir, 'report.md')}`);
      return 0;
    }

    case undefined:
    case 'help':
    case '--help':
    case '-h':
      console.log(USAGE);
      return 0;

    default:
      console.error(USAGE);
      return 2;
  }
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (e: Error) => {
    console.error(`qa-bench: ${e.message}`);
    process.exit(1);
  },
);
