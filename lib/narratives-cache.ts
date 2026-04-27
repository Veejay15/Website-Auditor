import fs from 'fs';
import path from 'path';
import { NarrativeSection } from './claude';

export type Narratives = Partial<Record<NarrativeSection, string>>;

function fileFor(auditId: string): string {
  return path.join(process.cwd(), 'data', 'audits', auditId, 'narratives.json');
}

export function readCachedNarratives(auditId: string): Narratives {
  const fp = fileFor(auditId);
  if (!fs.existsSync(fp)) return {};
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf-8')) as Narratives;
  } catch {
    return {};
  }
}

export function writeCachedNarratives(auditId: string, n: Narratives): void {
  const fp = fileFor(auditId);
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, JSON.stringify(n, null, 2), 'utf-8');
}
