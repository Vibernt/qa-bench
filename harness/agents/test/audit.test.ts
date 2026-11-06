import { describe, expect, it } from 'vitest';
import { auditTranscript, sealedPattern } from '../src/audit.ts';

const turn = (model: string, ...tools: { name: string; input: Record<string, unknown> }[]) => JSON.stringify({
  type: 'assistant', message: { role: 'assistant', model, content: [{ type: 'text', text: 'x' }, ...tools.map((t, i) => ({ type: 'tool_use', id: `t${i}`, ...t }))] },
});

describe('auditTranscript (claude-code-subagent JSONL)', () => {
  const lines = [
    JSON.stringify({ type: 'user', message: { role: 'user', content: 'Read /repo/apps/x/mutations/a/label.yaml' } }), // the orchestrator's prompt is not counted
    turn('m-1', { name: 'Bash', input: { command: "node -e \"await page.screenshot({ path: 'evidence/a.png' })\"" } }),
    turn('m-1', { name: 'Read', input: { file_path: '/tmp/w/evidence/a.png' } }, { name: 'Read', input: { file_path: '/tmp/w/brief.json' } }),
    turn('m-2', { name: 'Bash', input: { command: 'cat /repo/apps/expense-app/mutations/x/label.yaml' } }),
    'not json',
  ];
  const r = auditTranscript(lines.join('\n'), sealedPattern('/repo'));

  it('counts tool calls, screenshots taken and screenshots looked at', () => {
    expect(r).toMatchObject({ tool_calls: 4, screenshots_taken: 1, screenshots_viewed: 1 });
    expect(r.models).toEqual({ 'm-1': 2, 'm-2': 1 });
  });
  it('counts sealed paths in the agent tool inputs only, with samples', () => {
    expect(r.sealed_path_hits).toBeGreaterThanOrEqual(2); // the repo path, /mutations/, label.yaml
    expect(r.samples[0]).toContain('label.yaml');
    expect(auditTranscript(lines.slice(0, 3).join('\n'), sealedPattern('/repo')).sealed_path_hits).toBe(0);
  });
});
