import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { deleteAudit, readAudit, upsertAudit } from '@/lib/audits';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;
  const { id } = await params;
  const audit = readAudit(id);
  if (!audit) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ audit });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;
  const { id } = await params;
  const existing = readAudit(id);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const patch = await req.json();
  const merged = {
    ...existing,
    ...patch,
    id: existing.id,
    slug: existing.slug,
    client: { ...existing.client, ...(patch.client || {}) },
    uploads: { ...existing.uploads, ...(patch.uploads || {}) },
  };
  const saved = upsertAudit(merged);
  return NextResponse.json({ audit: saved });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;
  const { id } = await params;
  const ok = deleteAudit(id);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
