// Versi Client Kings Billiards & Domino
export const CLIENT_VERSION = '2.80';
export const CLIENT_VERSION_CODE = 280;
export const CLIENT_BUILD_ID = 'v2.80_20261116';

export function parseVersion(v: string | null | undefined): number[] {
  if (!v) return [0, 0, 0];
  const cleaned = String(v).replace(/^v/i, '').trim();
  const parts = cleaned.split('.').map(p => parseInt(p, 10) || 0);
  while (parts.length < 3) parts.push(0);
  return parts;
}

export function compareVersions(v1: string | null | undefined, v2: string | null | undefined): number {
  const p1 = parseVersion(v1);
  const p2 = parseVersion(v2);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const num1 = p1[i] || 0;
    const num2 = p2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

export function isVersionOutdated(currentVersion: string, minRequiredVersion: string): boolean {
  if (!minRequiredVersion) return false;
  if (!currentVersion) return true;
  return compareVersions(currentVersion, minRequiredVersion) < 0;
}
