// v0.108.27: Update Logs version-index logic — pure functions shared by
// the client renderer and the node harness. Single source of truth for
// the index: every version with a changelog entry, newest first.
// Derived from the previously hardcoded flat button wall (deduplicated:
// v0.92.0 appeared twice; numerically re-sorted: the old wall put
// v0.101.0 after v0.99.3). Adding a version = prepend one string here
// AND add its entry card in renderUpdatesScreen; the harness asserts
// every indexed version has a card.

export const UPDATE_INDEX_VERSIONS: string[] = [
  'v0.108.29',
  'v0.108.28',
  'v0.108.27',
  'v0.108.26',
  'v0.108.25',
  'v0.108.24',
  'v0.108.23',
  'v0.108.22',
  'v0.108.21',
  'v0.108.20',
  'v0.108.19',
  'v0.108.18',
  'v0.108.17',
  'v0.108.16',
  'v0.108.15',
  'v0.108.14',
  'v0.108.13',
  'v0.108.12',
  'v0.108.11',
  'v0.108.10',
  'v0.108.9',
  'v0.108.8',
  'v0.108.3',
  'v0.108.2',
  'v0.108.1',
  'v0.108.0',
  'v0.107.0',
  'v0.104.2',
  'v0.104.0',
  'v0.103.0',
  'v0.102.0',
  'v0.101.0',
  'v0.99.3',
  'v0.99.2',
  'v0.99.0',
  'v0.98.0',
  'v0.97.0',
  'v0.96.0',
  'v0.95.0',
  'v0.93.0',
  'v0.92.0',
  'v0.91.0',
  'v0.90.0',
  'v0.89.1',
  'v0.89.0',
  'v0.82.0',
  'v0.81.0',
  'v0.80.0',
  'v0.76.0',
  'v0.73.0',
  'v0.72.0',
  'v0.71.0',
  'v0.70.0',
  'v0.69.0',
  'v0.68.0',
  'v0.65.0',
  'v0.64.0',
  'v0.61.0',
  'v0.60.0',
  'v0.58.16',
  'v0.57.1',
  'v0.57.0',
  'v0.56.0',
  'v0.55.0',
  'v0.54.0',
  'v0.53.0',
  'v0.52.0',
  'v0.51.0',
  'v0.50.0',
  'v0.15.0',
  'v0.2.0',
  'v0.1.0',
];

export function updateTargetId(version: string): string {
  return 'update-' + version.replace(/\./g, '-');
}

export function versionFamily(version: string): string {
  const parts = version.replace(/^v/, '').split('.');
  return `v${parts[0]}.${parts[1]}.x`;
}

export function compareVersionsDesc(a: string, b: string): number {
  const pa = a.replace(/^v/, '').split('.').map(Number);
  const pb = b.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const a = pa[i] ?? 0;
    const b = pb[i] ?? 0;
    if (a !== b) return b - a;
  }
  return 0;
}

export function sortedIndexVersions(versions: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of versions) {
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out.sort(compareVersionsDesc);
}

export interface UpdateIndexGroup {
  family: string;
  versions: string[];
}

export function groupIndexVersions(versions: string[]): UpdateIndexGroup[] {
  const sorted = sortedIndexVersions(versions);
  const groups: UpdateIndexGroup[] = [];
  const byFamily = new Map<string, UpdateIndexGroup>();
  for (const v of sorted) {
    const fam = versionFamily(v);
    let g = byFamily.get(fam);
    if (!g) {
      g = { family: fam, versions: [] };
      byFamily.set(fam, g);
      groups.push(g);
    }
    g.versions.push(v);
  }
  return groups;
}

export function collapsedIndexVersions(versions: string[], count = 10): string[] {
  return sortedIndexVersions(versions).slice(0, count);
}
