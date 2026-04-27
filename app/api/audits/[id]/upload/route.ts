import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { requireAuth } from '@/lib/auth';
import { readAudit, upsertAudit } from '@/lib/audits';
import { isBlobConfigured, uploadFile } from '@/lib/blob';
import { BlobRef, AuditUploads } from '@/lib/types';

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25MB per file

interface Params {
  params: Promise<{ id: string }>;
}

async function localSave(auditId: string, kind: string, file: File): Promise<BlobRef> {
  const dir = path.join(process.cwd(), 'data', 'audits', auditId, 'uploads', kind);
  fs.mkdirSync(dir, { recursive: true });
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const dest = path.join(dir, safeName);
  const buf = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return {
    url: `/data/audits/${auditId}/uploads/${kind}/${safeName}`,
    pathname: `data/audits/${auditId}/uploads/${kind}/${safeName}`,
    size: buf.length,
    contentType: file.type,
    uploadedAt: new Date().toISOString(),
  };
}

async function persist(auditId: string, kind: string, file: File): Promise<BlobRef> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`${file.name} exceeds 25MB limit`);
  }
  if (isBlobConfigured()) {
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    return uploadFile(`audits/${auditId}/${kind}/${safe}`, file, file.type || 'application/octet-stream');
  }
  return localSave(auditId, kind, file);
}

export async function POST(req: NextRequest, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;
  const { id } = await params;
  const audit = await readAudit(id);
  if (!audit) return NextResponse.json({ error: 'Audit not found' }, { status: 404 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (err) {
    return NextResponse.json({ error: `Could not read upload: ${(err as Error).message}` }, { status: 400 });
  }

  const updates: AuditUploads = { ...audit.uploads };
  const errors: string[] = [];

  async function single(field: keyof AuditUploads, kind: string) {
    const f = formData.get(field as string);
    if (f instanceof File && f.size > 0) {
      try {
        (updates as Record<string, BlobRef | undefined>)[field as string] = await persist(id, kind, f);
      } catch (err) {
        errors.push(`${field}: ${(err as Error).message}`);
      }
    }
  }

  async function many(field: keyof AuditUploads, kind: string) {
    const list = formData.getAll(field as string).filter((x): x is File => x instanceof File && x.size > 0);
    if (list.length === 0) return;
    const refs: BlobRef[] = [];
    for (const f of list) {
      try {
        refs.push(await persist(id, kind, f));
      } catch (err) {
        errors.push(`${field}/${f.name}: ${(err as Error).message}`);
      }
    }
    (updates as Record<string, BlobRef[] | undefined>)[field as string] = refs;
  }

  // Logo isn't part of AuditUploads — it lives on client.logoBlob.
  const logoFile = formData.get('logo');
  let logoBlob: BlobRef | undefined;
  if (logoFile instanceof File && logoFile.size > 0) {
    try {
      logoBlob = await persist(id, 'logo', logoFile);
    } catch (err) {
      errors.push(`logo: ${(err as Error).message}`);
    }
  }

  await single('keywordsClientCsv', 'csv');
  await many('keywordsCompetitorCsvs', 'csv');
  await single('backlinksCsv', 'csv');
  await many('localDominatorScreenshots', 'screenshots');
  await single('ga4TrafficCsv', 'csv');
  await single('ga4EventsCsv', 'csv');
  await single('gscQueriesCsv', 'csv');
  await single('gscPagesCsv', 'csv');

  const next = {
    ...audit,
    client: { ...audit.client, ...(logoBlob ? { logoBlob } : {}) },
    uploads: updates,
  };
  await upsertAudit(next);

  return NextResponse.json({ ok: true, errors: errors.length ? errors : undefined });
}

export const runtime = 'nodejs';
