import fs from 'fs';
import path from 'path';
import { NarrativeSection } from './claude';
import { commitJsonFile, isGithubConfigured, readJsonFromRepo } from './github';

export type Narratives = Partial<Record<NarrativeSection, string>>;

function fileFor(auditId: string): string {
  return path.join(process.cwd(), 'data', 'audits', auditId, 'narratives.json');
}

function repoPathFor(auditId: string): string {
  return `data/audits/${auditId}/narratives.json`;
}

/**
 * Read cached narratives. Prefers GitHub on Vercel, falls back to local FS in dev.
 */
export async function readCachedNarratives(auditId: string): Promise<Narratives> {
  if (isGithubConfigured()) {
    try {
      const data = await readJsonFromRepo<Narratives>(repoPathFor(auditId));
      if (data) return data;
    } catch {
      // Fall through to local FS.
    }
  }
  const fp = fileFor(auditId);
  if (!fs.existsSync(fp)) return {};
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf-8')) as Narratives;
  } catch {
    return {};
  }
}

/**
 * Persist narratives. Local FS in dev, also commits to GitHub when configured.
 */
export async function writeCachedNarratives(auditId: string, n: Narratives): Promise<void> {
  const fp = fileFor(auditId);
  try {
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    fs.writeFileSync(fp, JSON.stringify(n, null, 2), 'utf-8');
  } catch {
    // Read-only filesystem on Vercel - GitHub commit is the persistent path.
  }
  if (isGithubConfigured()) {
    await commitJsonFile(repoPathFor(auditId), n, `Cache narratives for audit ${auditId}`);
  }
}
