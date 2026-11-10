import type { Brief } from '../../../../lib/contracts.ts';

export function redact(text: string, brief?: Brief): string {
  const secrets = brief?.roles.flatMap(role => role.accounts.flatMap(a => [a.username, a.password])) ?? [];
  return [...new Set(secrets)].filter(Boolean).sort((a, b) => b.length - a.length)
    .reduce((message, value) => message.replaceAll(value, '[masked]'), text);
}
