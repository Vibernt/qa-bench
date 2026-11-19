import { expect, it } from 'vitest';
import { sha256 } from '../../../../lib/io.ts';
import { convertChecks, type CheckExport } from '../src/map.ts';
const brief = Buffer.from(JSON.stringify({ episode_id: 'test-001', bench_version: 'test', app: 'test', track: 'visual',
  targets: [{ name: 'app', url: 'http://127.0.0.1:1234' }], roles: [{ role: 'editor', accounts: [{ username: 'private-user', password: 'private-password' }] }],
  budget: { wall_time_s: 60 } }));
function sample(): CheckExport {
  return { schema: 'qa-bench.check-export/v1', episode_id: 'test-001', brief_sha256: sha256(brief),
    system: { name: 'test-checks', version: '1' }, status: 'complete', wall_time_s: 1,
    cost: { model_usd: 0, notes: 'Local' }, observations: [{ page: 'http://127.0.0.1:1234/expenses', role: 'editor',
      findings: [{ step: 0, kind: 'a11y', rule: 'color-contrast', severity: 'serious', message: 'private-user private-password low contrast',
        target: 'td:nth-child(2)', evidenceRefs: [], viewport: { width: 390, height: 844, mobile: true } }] }] };
}
it('maps real StepFinding fields to schema-valid bench findings and redacts account values', () => {
  const mapped = convertChecks(brief, sample());
  expect(mapped.findings[0]!.category).toBe('a11y'); expect(mapped.findings[0]!.severity).toBe('major');
  expect(mapped.findings[0]!.where).toMatchObject({ route: '/expenses', selector: 'td:nth-child(2)', role: 'editor' });
  expect(JSON.stringify(mapped)).not.toContain('private-');
});
it('rejects wrong brief, unrelated reference-host origins, unknown kinds, and drops info only', () => {
  const wrong = sample(); wrong.brief_sha256 = '0'.repeat(64);
  expect(() => convertChecks(brief, wrong)).toThrow('bind');
  const unrelated = sample(); unrelated.observations[0]!.page = 'http://127.0.0.1:9999/expenses';
  expect(() => convertChecks(brief, unrelated)).toThrow('outside');
  const info = sample(); info.observations[0]!.findings[0]!.severity = 'info';
  expect(convertChecks(brief, info).findings).toHaveLength(0);
});
