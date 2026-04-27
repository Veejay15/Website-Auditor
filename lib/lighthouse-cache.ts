import fs from 'fs';
import path from 'path';
import { LhStrategy, LighthouseResult, runPsiPair } from './lighthouse';
import { hostnameOf } from './utils';
import { commitJsonFile, isGithubConfigured, readJsonFromRepo } from './github';

function cacheDir(auditId: string): string {
  return path.join(process.cwd(), 'data', 'audits', auditId, 'lighthouse');
}

function urlSlug(url: string): string {
  return hostnameOf(url).replace(/[^a-zA-Z0-9._-]/g, '_');
}

function fileFor(auditId: string, url: string, strategy: LhStrategy): string {
  return path.join(cacheDir(auditId), `${urlSlug(url)}-${strategy}.json`);
}

function repoPathFor(auditId: string, url: string, strategy: LhStrategy): string {
  return `data/audits/${auditId}/lighthouse/${urlSlug(url)}-${strategy}.json`;
}

/**
 * Read a cached Lighthouse result. Prefers GitHub when configured (works on Vercel),
 * falls back to local FS in dev.
 */
export async function readCachedLh(
  auditId: string,
  url: string,
  strategy: LhStrategy
): Promise<LighthouseResult | null> {
  if (isGithubConfigured()) {
    try {
      const data = await readJsonFromRepo<LighthouseResult>(repoPathFor(auditId, url, strategy));
      if (data) return data;
    } catch {
      // Fall through to local FS.
    }
  }
  const fp = fileFor(auditId, url, strategy);
  if (!fs.existsSync(fp)) return null;
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf-8')) as LighthouseResult;
  } catch {
    return null;
  }
}

/**
 * Persist a Lighthouse result. Always tries local FS first (works in dev,
 * silently fails on Vercel's read-only filesystem). Then commits to GitHub
 * when configured - that's the source of truth on Vercel.
 */
export async function writeCachedLh(auditId: string, result: LighthouseResult): Promise<void> {
  try {
    fs.mkdirSync(cacheDir(auditId), { recursive: true });
    fs.writeFileSync(
      fileFor(auditId, result.url, result.strategy),
      JSON.stringify(result, null, 2),
      'utf-8'
    );
  } catch {
    // Read-only filesystem on Vercel - GitHub commit is the persistent path.
  }
  if (isGithubConfigured()) {
    await commitJsonFile(
      repoPathFor(auditId, result.url, result.strategy),
      result,
      `Cache lighthouse result: ${urlSlug(result.url)} ${result.strategy}`
    );
  }
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
  await writeCachedLh(auditId, pair.mobile);
  await writeCachedLh(auditId, pair.desktop);
  return pair;
}

/** Load cached client mobile + desktop results for the preview render. */
export async function loadCachedClientPair(
  auditId: string,
  clientUrl: string
): Promise<{ mobile?: LighthouseResult; desktop?: LighthouseResult }> {
  const [mobile, desktop] = await Promise.all([
    readCachedLh(auditId, clientUrl, 'mobile'),
    readCachedLh(auditId, clientUrl, 'desktop'),
  ]);
  return { mobile: mobile ?? undefined, desktop: desktop ?? undefined };
}
