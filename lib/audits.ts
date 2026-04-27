import fs from 'fs';
import path from 'path';
import { Audit, AuditsIndex } from './types';
import { commitJsonFile, isGithubConfigured, readJsonFromRepo } from './github';

const AUDITS_DIR = path.join(process.cwd(), 'data', 'audits');
const INDEX_PATH = path.join(process.cwd(), 'data', 'audits.json');

function ensureDirs() {
  try {
    fs.mkdirSync(AUDITS_DIR, { recursive: true });
  } catch {
    // Read-only filesystem on Vercel - this is fine; we'll fall through to GitHub.
  }
}

function readLocalIndex(): Audit[] {
  if (!fs.existsSync(INDEX_PATH)) return [];
  try {
    const raw = fs.readFileSync(INDEX_PATH, 'utf-8');
    const data: AuditsIndex = JSON.parse(raw);
    return data.audits || [];
  } catch {
    return [];
  }
}

/**
 * Read the audits index. Prefers GitHub when configured (production path on Vercel),
 * falls back to the local filesystem (dev path). The Vercel deployment bundle
 * may also include a build-time snapshot, but we always read fresh from GitHub
 * when configured so writes propagate without a redeploy.
 */
export async function readAuditsIndex(): Promise<Audit[]> {
  if (isGithubConfigured()) {
    try {
      const data = await readJsonFromRepo<AuditsIndex>('data/audits.json');
      if (data) return data.audits || [];
    } catch (err) {
      console.error('readAuditsIndex: GitHub read failed, falling back to FS:', err);
    }
  }
  return readLocalIndex();
}

/**
 * Write the audits index. Always tries local FS first (works in dev). When
 * GitHub is configured, also commits the file back to the repo - that's the
 * source of truth on Vercel where the local FS is read-only.
 */
export async function writeAuditsIndex(audits: Audit[]): Promise<void> {
  ensureDirs();
  const data: AuditsIndex = { audits };
  const json = JSON.stringify(data, null, 2) + '\n';
  try {
    fs.writeFileSync(INDEX_PATH, json, 'utf-8');
  } catch {
    // Read-only filesystem on Vercel - GitHub commit is the persistent path.
  }
  if (isGithubConfigured()) {
    await commitJsonFile('data/audits.json', data, 'Update audits index');
  }
}

export async function readAudit(id: string): Promise<Audit | null> {
  const audits = await readAuditsIndex();
  return audits.find((a) => a.id === id || a.slug === id) || null;
}

export async function upsertAudit(audit: Audit): Promise<Audit> {
  const audits = await readAuditsIndex();
  const idx = audits.findIndex((a) => a.id === audit.id);
  const next = { ...audit, updatedAt: new Date().toISOString() };
  if (idx === -1) {
    audits.unshift(next);
  } else {
    audits[idx] = next;
  }
  await writeAuditsIndex(audits);
  return next;
}

export async function deleteAudit(id: string): Promise<boolean> {
  const audits = await readAuditsIndex();
  const next = audits.filter((a) => a.id !== id);
  if (next.length === audits.length) return false;
  await writeAuditsIndex(next);
  return true;
}

export function statsByMonth(audits: Audit[]): { thisMonth: number; total: number } {
  const now = new Date();
  const currentKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const thisMonth = audits.filter((a) => a.createdAt.startsWith(currentKey)).length;
  return { thisMonth, total: audits.length };
}
