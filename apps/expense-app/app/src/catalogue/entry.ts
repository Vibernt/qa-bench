export class FixtureError extends Error {
  constructor(readonly code: 'INVALID_ENTRY' | 'IDENTITY' | 'RESET' | 'STATE' | 'EVIDENCE' | 'LIFECYCLE', message: string, options?: ErrorOptions) {
    super(message, options); this.name = 'FixtureError';
  }
}

export const FIXTURE_VERSION = 'expense-app/v1';
export const FIXTURE_HOOKS = Object.freeze({ start: 'expense-start-v1', reset: 'expense-reset-v1', evidence: 'expense-evidence-v1' });
export interface CatalogueEntry {
  schema: 'qa-bench.fixture/v1'; application: 'expense-app'; version: typeof FIXTURE_VERSION;
  hooks: typeof FIXTURE_HOOKS;
  roles: readonly ('viewer' | 'editor')[];
  variant: '' | 'relabel' | 'restyle' | 'hostile';
  defect: '' | 'missing_persistence' | 'duplicate_write' | 'misleading_success' | 'permission_bypass' | 'ignored_filter' | 'wrong_total' | 'stale_state';
  idempotency: boolean; delayedJobs: boolean; mailSink: boolean;
}

export const EXPENSE_CATALOGUE: Readonly<CatalogueEntry> = Object.freeze({
  schema: 'qa-bench.fixture/v1', application: 'expense-app', version: FIXTURE_VERSION,
  hooks: FIXTURE_HOOKS, roles: Object.freeze(['viewer', 'editor'] as const),
  variant: '', defect: '', idempotency: false, delayedJobs: false, mailSink: false,
});

/** Reject values that cannot be inspected as finite JSON data without invoking user code. */
function assertJsonData(value: unknown, parents = new Set<object>()): void {
  if (value === null || typeof value === 'string' || typeof value === 'boolean' ||
    typeof value === 'number' && Number.isFinite(value)) return;
  if (!value || typeof value !== 'object' || parents.has(value) || Object.getOwnPropertySymbols(value).length) throw new FixtureError('INVALID_ENTRY', 'Catalogue entry must contain finite JSON data');
  const array = Array.isArray(value);
  const prototype = Object.getPrototypeOf(value);
  if (array ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) throw new FixtureError('INVALID_ENTRY', 'Catalogue entry must contain plain JSON data');
  parents.add(value);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (descriptor.get || descriptor.set || !descriptor.enumerable && !(array && key === 'length')) throw new FixtureError('INVALID_ENTRY', 'Catalogue entry must not contain accessors or hidden properties');
    if (array && key !== 'length' && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length)) throw new FixtureError('INVALID_ENTRY', 'Catalogue arrays must contain only indexed values');
    assertJsonData(descriptor.value, parents);
  }
  if (array && Object.keys(value).length !== value.length) throw new FixtureError('INVALID_ENTRY', 'Catalogue arrays must not contain holes');
  parents.delete(value);
}

/** Pure data admission. References select reviewed code; no imports, shell or hooks run here. */
export function parseCatalogueEntry(input: unknown): Readonly<CatalogueEntry> {
  const fail = (): never => { throw new FixtureError('INVALID_ENTRY', 'Invalid or unresolved expense fixture catalogue entry'); };
  assertJsonData(input);
  if (!input || typeof input !== 'object' || Array.isArray(input)) return fail();
  const value = input as Record<string, unknown>;
  if (Object.keys(value).some(key => !Object.hasOwn(EXPENSE_CATALOGUE, key))) return fail();
  if (value.schema !== 'qa-bench.fixture/v1' || value.application !== 'expense-app' || value.version !== FIXTURE_VERSION) return fail();
  const hooks = value.hooks as Record<string, unknown> | undefined;
  if (!hooks || typeof hooks !== 'object' || Object.keys(hooks).length !== 3 ||
    Object.entries(FIXTURE_HOOKS).some(([key, ref]) => hooks[key] !== ref)) return fail();
  if (!Array.isArray(value.roles) || !value.roles.length || new Set(value.roles).size !== value.roles.length || value.roles.some(role => role !== 'viewer' && role !== 'editor')) return fail();
  if (!['', 'relabel', 'restyle', 'hostile'].includes(value.variant as string) ||
    !['', 'missing_persistence', 'duplicate_write', 'misleading_success', 'permission_bypass', 'ignored_filter', 'wrong_total', 'stale_state'].includes(value.defect as string)) return fail();
  if (['idempotency', 'delayedJobs', 'mailSink'].some(key => typeof value[key] !== 'boolean')) return fail();
  return Object.freeze({ ...value, hooks: FIXTURE_HOOKS, roles: Object.freeze([...value.roles]) }) as unknown as Readonly<CatalogueEntry>;
}
