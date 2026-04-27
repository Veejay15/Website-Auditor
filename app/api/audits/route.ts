import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { readAuditsIndex, upsertAudit } from '@/lib/audits';
import { Audit } from '@/lib/types';
import { shortId, slugify } from '@/lib/utils';

export async function GET() {
  const authError = await requireAuth();
  if (authError) return authError;
  return NextResponse.json({ audits: await readAuditsIndex() });
}

export async function POST(req: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  const body = await req.json();
  const now = new Date().toISOString();
  const id = shortId();
  const clientName = body.client?.name || 'Untitled audit';
  const slug = `${slugify(clientName)}-${id.slice(0, 6)}`;

  const audit: Audit = {
    id,
    slug,
    status: 'draft',
    client: {
      name: body.client?.name || '',
      url: body.client?.url || '',
      location: body.client?.location || '',
      services: body.client?.services || [],
      brandAccentColor: body.client?.brandAccentColor || '#dc2626',
    },
    competitors: body.competitors || [],
    mapPackQueries: body.mapPackQueries || [],
    mapPackResults: body.mapPackResults || {},
    uploads: {},
    revenueInputs: body.revenueInputs || {},
    createdAt: now,
    updatedAt: now,
  };

  const saved = await upsertAudit(audit);
  return NextResponse.json({ audit: saved });
}
