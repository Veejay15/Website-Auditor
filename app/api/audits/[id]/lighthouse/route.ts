import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { readAudit } from '@/lib/audits';
import { fetchAndCachePair } from '@/lib/lighthouse-cache';

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/audits/[id]/lighthouse
 *
 * Runs PageSpeed Insights for the client URL (mobile + desktop), caches the
 * results to data/audits/<id>/lighthouse/, and returns score summaries.
 *
 * Optional body: { urls?: string[] } - extra URLs to also analyze (competitors).
 */
export async function POST(req: NextRequest, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  const audit = readAudit(id);
  if (!audit) return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
  if (!audit.client.url) {
    return NextResponse.json({ error: 'Audit has no client URL' }, { status: 400 });
  }

  let extraUrls: string[] = [];
  try {
    const body = await req.json().catch(() => null);
    if (body && Array.isArray(body.urls)) extraUrls = body.urls.filter((u: unknown) => typeof u === 'string');
  } catch {
    // No body provided is fine.
  }

  const allUrls = [audit.client.url, ...extraUrls];
  const results: Record<string, { mobile: { perf: number; error?: string }; desktop: { perf: number; error?: string } }> = {};

  // Run all URLs in parallel; each runs mobile + desktop in parallel internally.
  await Promise.all(
    allUrls.map(async (url) => {
      try {
        const pair = await fetchAndCachePair(id, url);
        results[url] = {
          mobile: { perf: pair.mobile.scores.performance, error: pair.mobile.error },
          desktop: { perf: pair.desktop.scores.performance, error: pair.desktop.error },
        };
      } catch (err) {
        results[url] = {
          mobile: { perf: 0, error: (err as Error).message },
          desktop: { perf: 0, error: (err as Error).message },
        };
      }
    })
  );

  return NextResponse.json({ ok: true, results });
}

// PSI calls take ~10-30s; allow up to 2 min total.
export const maxDuration = 120;
export const runtime = 'nodejs';
