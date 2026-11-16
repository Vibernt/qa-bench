// Load and validate everything under apps/: app.yaml, upstream.json and every label.yaml.
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { AppConfig, Label, Upstream } from '../../../lib/contracts.ts';
import { REPO_ROOT, readData } from '../../../lib/io.ts';
import { assertValid } from '../../../lib/schemas.ts';

export interface LoadedApp {
  id: string;
  dir: string;
  config: AppConfig;
  upstream?: Upstream;
  /** Labels by kind, each sorted by id. */
  mutations: Label[];
  changes: Label[];
  baseline: Label[];
  /** Verified real bugs present in every build. */
  natural: Label[];
  traps: Label[];
}

export const DEFAULT_APPS_ROOT = join(REPO_ROOT, 'apps');

const KIND_DIRS = [
  ['mutations', 'defect'],
  ['changes', 'change'],
  ['baseline', 'baseline'],
  ['natural', 'natural'],
  ['traps', 'trap'],
] as const;

function byId(a: Label, b: Label): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function findFile(dir: string, names: string[]): string | undefined {
  return names.map((n) => join(dir, n)).find((p) => existsSync(p));
}

/** Load one app folder. Throws on any schema or consistency error. */
export function loadApp(dir: string, id: string): LoadedApp {
  const appFile = findFile(dir, ['app.yaml', 'app.yml']);
  if (!appFile) throw new Error(`${dir}: no app.yaml`);
  const config = assertValid<AppConfig>('app', readData(appFile), appFile);
  if (config.app !== id) throw new Error(`${appFile}: app '${config.app}' does not match folder '${id}'`);

  let upstream: Upstream | undefined;
  const upFile = join(dir, 'upstream.json');
  if (existsSync(upFile)) upstream = assertValid<Upstream>('upstream', readData(upFile), upFile);

  const loaded: LoadedApp = { id, dir, config, upstream, mutations: [], changes: [], baseline: [], natural: [], traps: [] };
  for (const [sub, kind] of KIND_DIRS) {
    const base = join(dir, sub);
    if (!existsSync(base)) continue;
    for (const name of readdirSync(base).sort()) {
      const labelDir = join(base, name);
      if (!statSync(labelDir).isDirectory()) continue;
      const file = findFile(labelDir, ['label.yaml', 'label.yml']);
      if (!file) continue;
      const label = assertValid<Label>('label', readData(file), file);
      if (label.app !== id) throw new Error(`${file}: app '${label.app}' does not match folder '${id}'`);
      if (label.kind !== kind) throw new Error(`${file}: kind '${label.kind}' does not belong in ${sub}/`);
      if (config.label_prefix && !label.id.startsWith(config.label_prefix + '.')) {
        throw new Error(`${file}: id '${label.id}' should start with '${config.label_prefix}.'`);
      }
      loaded[sub].push(label);
    }
    loaded[sub].sort(byId);
  }
  const seen = new Set<string>();
  for (const l of [...loaded.mutations, ...loaded.changes, ...loaded.baseline, ...loaded.natural, ...loaded.traps]) {
    if (seen.has(l.id)) throw new Error(`${dir}: duplicate label id '${l.id}'`);
    seen.add(l.id);
  }
  return loaded;
}

/** Load every app under appsRoot (default: the repo's apps/). Folders without an app.yaml are ignored. */
export function loadApps(appsRoot: string = DEFAULT_APPS_ROOT): Map<string, LoadedApp> {
  const apps = new Map<string, LoadedApp>();
  if (!existsSync(appsRoot)) return apps;
  for (const name of readdirSync(appsRoot).sort()) {
    const dir = join(appsRoot, name);
    if (!statSync(dir).isDirectory()) continue;
    if (!findFile(dir, ['app.yaml', 'app.yml'])) continue;
    apps.set(name, loadApp(dir, name));
  }
  return apps;
}
