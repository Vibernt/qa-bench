// Validate every YAML and JSON contract in the repo against schemas/, plus cross-file checks.
// Run by CI: `npm run validate`. Exits non-zero on any problem.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep, basename, dirname } from 'node:path';
import YAML from 'yaml';
import { REPO_ROOT, sha256 } from '../lib/io.ts';
import { check, type SchemaName } from '../lib/schemas.ts';
import type { AppConfig, Label, Track, Episode, AnswerKey } from '../lib/contracts.ts';

const SKIP_DIRS = new Set(['node_modules', '.git', 'runs', 'upstream', '.fetched', 'dist']);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ya?ml|json)$/.test(name)) out.push(full);
  }
  return out;
}

/** Which schema a repo path must satisfy, if any. Paths use '/' separators. */
export function schemaFor(rel: string): SchemaName | undefined {
  if (/^apps\/[^/]+\/upstream\.json$/.test(rel)) return 'upstream';
  if (/^apps\/[^/]+\/app\.ya?ml$/.test(rel)) return 'app';
  if (/^apps\/[^/]+\/(mutations|changes|baseline|natural)\/[^/]+\/label\.ya?ml$/.test(rel)) return 'label';
  if (/^tracks\/[^/]+\.ya?ml$/.test(rel)) return 'track';
  if (/^episodes\/.+\/episode\.json$/.test(rel)) return 'episode';
  if (/^episodes\/.+\/answer-key\.json$/.test(rel)) return 'answer-key';
  if (/^harness\/adapters\/[^/]+\/adapter\.json$/.test(rel)) return 'adapter';
  if (/^leaderboard\/.+\/report\.json$/.test(rel)) return 'report';
  if (/(^|\/)[^/]*\.?findings\.json$/.test(rel)) return 'findings';
  if (/(^|\/)[^/]*\.?brief\.json$/.test(rel)) return 'brief';
  return undefined;
}

function parse(full: string): unknown {
  const text = readFileSync(full, 'utf8');
  return /\.ya?ml$/.test(full) ? YAML.parse(text) : JSON.parse(text);
}

export function validateRepo(root = REPO_ROOT): { problems: string[]; checked: number } {
  const problems: string[] = [];
  const files = walk(root).filter((f) => !relative(root, f).split(sep).includes('node_modules'));
  const labels = new Map<string, { label: Label; rel: string }>();
  const apps = new Map<string, AppConfig>();
  const tracks: { track: Track; rel: string }[] = [];
  const episodes: { ep: Episode; rel: string; full: string }[] = [];
  let checked = 0;

  for (const full of files) {
    const rel = relative(root, full).split(sep).join('/');
    if (rel === 'package-lock.json') continue;
    let value: unknown;
    try {
      value = parse(full);
    } catch (e) {
      problems.push(`${rel}: does not parse: ${(e as Error).message}`);
      continue;
    }
    const schema = schemaFor(rel);
    if (!schema) continue;
    checked++;
    for (const err of check(schema, value)) problems.push(`${rel}: ${schema}: ${err}`);

    const appDir = rel.startsWith('apps/') ? rel.split('/')[1] : undefined;
    if (schema === 'label') {
      const label = value as Label;
      const kindDir = rel.split('/')[2];
      const expectedKind = kindDir === 'mutations' ? 'defect' : kindDir === 'changes' ? 'change' : kindDir === 'natural' ? 'natural' : 'baseline';
      if (label.app !== appDir) problems.push(`${rel}: app '${label.app}' does not match folder '${appDir}'`);
      if (label.kind !== expectedKind) problems.push(`${rel}: kind '${label.kind}' belongs in ${kindDir}/ only if it is '${expectedKind}'`);
      const prev = labels.get(label.id);
      if (prev) problems.push(`${rel}: duplicate label id '${label.id}' (also ${prev.rel})`);
      labels.set(label.id, { label, rel });
    }
    if (schema === 'app') {
      const app = value as AppConfig;
      if (app.app !== appDir) problems.push(`${rel}: app '${app.app}' does not match folder '${appDir}'`);
      apps.set(app.app, app);
    }
    if (schema === 'upstream') {
      const up = value as { app: string; use: string };
      if (up.app !== appDir) problems.push(`${rel}: app '${up.app}' does not match folder '${appDir}'`);
    }
    if (schema === 'track') {
      const track = value as Track;
      if (basename(rel).replace(/\.ya?ml$/, '') !== track.id) problems.push(`${rel}: id '${track.id}' does not match file name`);
      tracks.push({ track, rel });
    }
    if (schema === 'episode') episodes.push({ ep: value as Episode, rel, full });
  }

  // Cross-file checks.
  for (const [id, { label, rel }] of labels) {
    const app = apps.get(label.app);
    if (!app) problems.push(`${rel}: app '${label.app}' has no app.yaml`);
    else if (app.label_prefix && !id.startsWith(app.label_prefix + '.')) {
      problems.push(`${rel}: id '${id}' should start with '${app.label_prefix}.'`);
    }
  }
  for (const [, { label, rel }] of labels) {
    for (const id of label.masked_by ?? []) {
      const m = labels.get(id);
      if (label.kind !== 'natural') problems.push(`${rel}: masked_by is for natural labels only`);
      else if (!m || m.label.kind !== 'defect' || m.label.app !== label.app) problems.push(`${rel}: masked_by '${id}' is not a planted defect of ${label.app}`);
    }
  }
  for (const { track, rel } of tracks) {
    for (const ta of track.apps) {
      if (!apps.has(ta.app)) problems.push(`${rel}: unknown app '${ta.app}'`);
      for (const [field, kind] of [['mutations', 'defect'], ['changes', 'change']] as const) {
        const list = ta[field];
        if (!Array.isArray(list)) continue;
        for (const id of list) {
          const l = labels.get(id);
          if (!l) problems.push(`${rel}: unknown label '${id}'`);
          else if (l.label.kind !== kind || l.label.app !== ta.app) problems.push(`${rel}: '${id}' is not a ${kind} of ${ta.app}`);
        }
      }
    }
  }
  for (const { ep, rel, full } of episodes) {
    const keyPath = join(dirname(full), 'answer-key.json');
    if (!existsSync(keyPath)) {
      problems.push(`${rel}: no answer-key.json beside it`);
      continue;
    }
    if (sha256(readFileSync(keyPath)) !== ep.answer_key_sha256) problems.push(`${rel}: answer_key_sha256 does not match answer-key.json`);
    const key = parse(keyPath) as AnswerKey;
    if (key.episode_id !== ep.id) problems.push(`${rel}: answer key is for '${key.episode_id}'`);
    for (const id of [...ep.active.mutations, ...ep.active.changes]) {
      if (!labels.has(id)) problems.push(`${rel}: unknown active label '${id}'`);
    }
  }
  return { problems, checked };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { problems, checked } = validateRepo();
  for (const p of problems) console.error(p);
  console.log(`validate: ${checked} contract files checked, ${problems.length} problem(s)`);
  process.exit(problems.length ? 1 : 0);
}
