import fs from 'fs';
import path from 'path';
import { LhStrategy, LighthouseResult, runPsiPair } from './lighthouse';
import { hostnameOf } from './utils';

function cacheDir(auditId: string): string {
  return path.join(process.cwd(), 'data', 'audits', auditId, 'lighthouse');
}

function urlSlug(url: string): string {
  return hostnameOf(url).replace(/[^a-zA-Z0-9._-]/g, '_');
}

function fileFor(auditId: string, url: string, strategy: LhStrategy): string {
  return path.join(cacheDir(auditId), `${urlSlug(url)}-${strategy}.json`);
}

export function readCachedLh(
  auditId: string,
  url: string,
  strategy: LhStrategy
): LighthouseResult | null {
  const fp = fileFor(auditId, url, strategy);
  if (!fs.existsSync(fp)) return null;
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf-8')) as LighthouseResult;
  } catch {
    return null;
  }
}

export function writeCachedLh(auditId: string, result: LighthouseResult): void {
  fs.mkdirSync(cacheDir(auditId), { recursive: true });
  fs.writeFileSync(fileFor(auditId, result.url, result.strategy), JSON.stringify(result, null, 2), 'utf-8');
}

/**
 * Run PSI for a URL, mobile + desktop, and cache both. Returns the pair.
 * Used by the audit-generation pipeline.
 */
export async function fetchAndCachePair(
  auditId: string,
  url: string
): Promise<{ mobile: LighthouseResult; desktop: LighthouseResult }> {
  const pair = await runPsiPair(url);
  writeCachedLh(auditId, pair.mobile);
  writeCachedLh(auditId, pair.desktop);
  return pair;
}

/** Load cached client mobile + desktop results for the preview render. */
export function loadCachedClientPair(
  auditId: string,
  clientUrl: string
): { mobile?: LighthouseResult; desktop?: LighthouseResult } {
  return {
    mobile: readCachedLh(auditId, clientUrl, 'mobile') ?? undefined,
    desktop: readCachedLh(auditId, clientUrl, 'desktop') ?? undefined,
  };
}
