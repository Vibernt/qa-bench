import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import type { Ajv2020 as Ajv2020Type, ErrorObject, ValidateFunction } from 'ajv/dist/2020.js';
import type { FormatsPlugin } from 'ajv-formats';
import { REPO_ROOT } from './io.ts';

// ajv ships CommonJS; load it through require so the default export is unambiguous.
const require = createRequire(import.meta.url);
const Ajv2020 = require('ajv/dist/2020.js').default as typeof Ajv2020Type;
const addFormats = require('ajv-formats').default as FormatsPlugin;

export type SchemaName =
  | 'upstream' | 'app' | 'label' | 'track' | 'episode' | 'answer-key' | 'brief' | 'findings' | 'report' | 'adapter';

const BASE = 'https://qa-bench.dev/schemas/';
let ajv: Ajv2020Type | undefined;
const cache = new Map<SchemaName, ValidateFunction>();

function instance(): Ajv2020Type {
  if (ajv) return ajv;
  ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false, useDefaults: false });
  addFormats(ajv);
  const dir = join(REPO_ROOT, 'schemas');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.schema.json'))) {
    ajv.addSchema(JSON.parse(readFileSync(join(dir, file), 'utf8')));
  }
  return ajv;
}

export function validator(name: SchemaName): ValidateFunction {
  const fn = cache.get(name);
  if (fn) return fn;
  const found = instance().getSchema(`${BASE}${name}.schema.json`);
  if (!found) throw new Error(`unknown schema ${name}`);
  cache.set(name, found);
  return found;
}

export function formatErrors(errors: ErrorObject[] | null | undefined): string[] {
  return (errors ?? []).map((e) => `${e.instancePath || '/'} ${e.message ?? ''}${e.params ? ' ' + JSON.stringify(e.params) : ''}`);
}

/** Validate, returning a list of error strings (empty when valid). */
export function check(name: SchemaName, value: unknown): string[] {
  const fn = validator(name);
  return fn(value) ? [] : formatErrors(fn.errors);
}

/** Validate or throw with every error listed. */
export function assertValid<T>(name: SchemaName, value: unknown, where = name): T {
  const errors = check(name, value);
  if (errors.length) throw new Error(`${where} is not a valid ${name}:\n  ${errors.join('\n  ')}`);
  return value as T;
}
