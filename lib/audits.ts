import fs from 'fs';
import path from 'path';
import { Audit, AuditsIndex } from './types';

const AUDITS_DIR = path.join(process.cwd(), 'data', 'audits');
const INDEX_PATH = path.join(process.cwd(), 'data', 'audits.json');

function ensureDirs() {
  fs.mkdirSync(AUDITS_DIR, { recursive: true });
}

export function readAuditsIndex(): Audit[] {
  if (!fs.existsSync(INDEX_PATH)) return [];
  try {
    const raw = fs.readFileSync(INDEX_PATH, 'utf-8');
    const data: AuditsIndex = JSON.parse(raw);
    return data.audits || [];
  } catch {
    return [];
  }
}

export function writeAuditsIndex(audits: Audit[]): void {
  ensureDirs();
  const data: AuditsIndex = { audits };
  fs.writeFileSync(INDEX_PATH, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

export function readAudit(id: string): Audit | null {
  const audits = readAuditsIndex();
  return audits.find((a) => a.id === id || a.slug === id) || null;
}

export function upsertAudit(audit: Audit): Audit {
  const audits = readAuditsIndex();
  const idx = audits.findIndex((a) => a.id === audit.id);
  const next = { ...audit, updatedAt: new Date().toISOString() };
  if (idx === -1) {
    audits.unshift(next);
  } else {
    audits[idx] = next;
  }
  writeAuditsIndex(audits);
  return next;
}

export function deleteAudit(id: string): boolean {
  const audits = readAuditsIndex();
  const next = audits.filter((a) => a.id !== id);
  if (next.length === audits.length) return false;
  writeAuditsIndex(next);
  return true;
}

export function statsByMonth(audits: Audit[]): { thisMonth: number; total: number } {
  const now = new Date();
  const currentKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const thisMonth = audits.filter((a) => a.createdAt.startsWith(currentKey)).length;
  return { thisMonth, total: audits.length };
}
