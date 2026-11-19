import type { Brief } from '../../../../lib/contracts.ts';
export function redact(text: string, brief?: Brief): string {
  const secrets = brief?.roles.flatMap(r => r.accounts.flatMap(a => [a.username, a.password])) ?? [];
  let clean = [...new Set(secrets)].filter(Boolean).sort((a, b) => b.length - a.length)
    .reduce((s, secret) => s.replaceAll(secret, '[masked]'), text);
  clean = clean.replace(/(?:Bearer\s+)[^\s"'<>]+/gi, 'Bearer [masked]')
    .replace(/\bsk-[a-zA-Z0-9_-]+/g, '[masked]')
    .replace(/\/(?:Users|home)\/[^\s"'<>]+/g, '[private-path]');
  return clean;
}
export function cleanJson<T>(value: T, brief: Brief): T {
  // Redact values, never JSON syntax or object keys (a credential can contain quotes).
  if (typeof value === 'string') return redact(value, brief) as T;
  if (Array.isArray(value)) return value.map(v => cleanJson(v, brief)) as T;
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, cleanJson(v, brief)])) as T;
  return value;
}
