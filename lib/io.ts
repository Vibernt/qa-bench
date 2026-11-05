import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import YAML from 'yaml';

/** Repository root (this file lives in <root>/lib). */
export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function readData<T = unknown>(path: string): T {
  const text = readFileSync(path, 'utf8');
  if (path.endsWith('.yaml') || path.endsWith('.yml')) return YAML.parse(text) as T;
  return JSON.parse(text) as T;
}

/** Stable JSON text: two-space indent, trailing newline. */
export function jsonText(value: unknown): string {
  return JSON.stringify(value, null, 2) + '\n';
}

export function writeJson(path: string, value: unknown): string {
  mkdirSync(dirname(path), { recursive: true });
  const text = jsonText(value);
  writeFileSync(path, text);
  return text;
}

export function sha256(text: string | Buffer): string {
  return createHash('sha256').update(text).digest('hex');
}
