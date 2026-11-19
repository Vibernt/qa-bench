import { expect, it } from 'vitest';
import { parseOptions } from '../src/options.ts';
const args = ['--brief', 'b.json', '--root', 'system', '--out', 'f.json', '--policy', 'hunt-0.2', '--model', 'anthropic:claude-haiku-5-5', '--max-usd', '1', '--max-calls', '40', '--operator', 'operator'];
it('parses exact CLI, default persona and explicit live', () => {
  expect(parseOptions(args)).toMatchObject({ live: false, maxUsd: 1, maxCalls: 40, persona: 'default' });
  expect(parseOptions([...args, '--persona', 'fuzzer', '--live']).live).toBe(true);
});
it.each(['--brief', '--root', '--out', '--policy', '--model', '--max-usd', '--max-calls', '--operator'])('requires %s', key => {
  const i = args.indexOf(key); expect(() => parseOptions(args.filter((_, n) => n !== i && n !== i + 1))).toThrow();
});
it.each([['--max-usd', '0'], ['--max-usd', 'NaN'], ['--max-calls', '1.5'], ['--max-calls', '-1'], ['--policy', 'other'], ['--model', 'other:model']])('rejects %s %s', (key, value) => {
  const a = [...args]; a[a.indexOf(key) + 1] = value; expect(() => parseOptions(a)).toThrow();
});
it('rejects unknown flags, duplicates and positional args', () => {
  for (const extra of [['--unknown'], ['--max-usd', '2'], ['positional']]) expect(() => parseOptions([...args, ...extra])).toThrow();
});
it('sets default kinds set and independent total cap', () => {
  const a = args.filter((_, i) => ![0, 1, 4, 5].includes(i));
  expect(parseOptions(a, true)).toMatchObject({ set: 'v0.4-kinds-12', totalUsd: 1 });
  expect(parseOptions([...a, '--total-usd', '3', '--set', 'v0.2-sample-12'], true)).toMatchObject({ totalUsd: 3, set: 'v0.2-sample-12' });
});
