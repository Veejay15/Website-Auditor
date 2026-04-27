import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { readAudit } from '@/lib/audits';
import { loadParsedAuditData } from '@/lib/parsed';
import { loadCachedClientPair } from '@/lib/lighthouse-cache';
import { generateNarratives, isClaudeConfigured } from '@/lib/claude';
import { writeCachedNarratives } from '@/lib/narratives-cache';

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  const audit = await readAudit(id);
  if (!audit) return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
  if (!isClaudeConfigured()) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not set. Add it to .env.local and restart the dev server.' },
      { status: 400 }
    );
  }

  const parsed = await loadParsedAuditData(audit).catch(() => undefined) || undefined;
  const lighthouse = audit.client.url ? loadCachedClientPair(audit.id, audit.client.url) : undefined;

  const narratives = await generateNarratives({ audit, parsed, lighthouse });
  writeCachedNarratives(id, narratives);

  return NextResponse.json({ ok: true, sections: Object.keys(narratives), bytes: JSON.stringify(narratives).length });
}

// Narrative generation runs 8 sequential Claude calls, takes ~60-90s total.
// Vercel Hobby caps at 60s — Pro is needed for this route to complete inline.
// Alternative: use the GitHub Actions workflow for generation.
export const maxDuration = 60;
export const runtime = 'nodejs';
