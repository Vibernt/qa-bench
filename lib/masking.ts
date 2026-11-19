import type { Label } from './contracts.ts';

interface MaskingRelation {
  masker: string;
  masked: string;
  owner: string;
  field: 'masks' | 'masked_by';
}

/** Normalize both declarations into the same directed relation, retaining provenance for validation. */
export function maskingRelations(labels: readonly Label[]): MaskingRelation[] {
  return labels.flatMap(label => [
    ...(label.masks ?? []).map(masked => ({ masker: label.id, masked, owner: label.id, field: 'masks' as const })),
    ...(label.masked_by ?? []).map(masker => ({ masker, masked: label.id, owner: label.id, field: 'masked_by' as const })),
  ]);
}

/** Only explicitly active switches hide symptoms; masking is direct, never transitive. */
export function maskedLabelIds(labels: readonly Label[], activeIds: readonly string[]): Set<string> {
  const active = new Set(activeIds);
  return new Set(maskingRelations(labels).filter(r => active.has(r.masker)).map(r => r.masked));
}
