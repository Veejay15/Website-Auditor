import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { readAudit, upsertAudit } from '@/lib/audits';
import { dispatchAuditWorkflow, findLatestWorkflowRun, isGithubConfigured } from '@/lib/github';
import { fetchAndCachePair } from '@/lib/lighthouse-cache';
import { loadParsedAuditData } from '@/lib/parsed';
import { generateNarratives, isClaudeConfigured } from '@/lib/claude';
import { writeCachedNarratives } from '@/lib/narratives-cache';

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * Run the audit-generation pipeline:
 *   - GitHub Actions mode (production): dispatches the workflow and returns immediately.
 *     The async runner does Lighthouse + Claude on a fresh runner.
 *   - Local mode (dev): runs Lighthouse + Claude inline. Slower (~30-90s) but works
 *     without GH Actions. Status updates the audit object as it goes.
 */
export async function POST(_req: NextRequest, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;
  const { id } = await params;
  const audit = await readAudit(id);
  if (!audit) return NextResponse.json({ error: 'Audit not found' }, { status: 404 });

  if (isGithubConfigured()) {
    const dispatchTime = new Date().toISOString();
    try {
      await dispatchAuditWorkflow(audit.id);
      const run = await findLatestWorkflowRun('generate-audit.yml', dispatchTime);
      const next = { ...audit, status: 'queued' as const, workflowRunId: run?.id };
      await upsertAudit(next);
      return NextResponse.json({
        ok: true,
        audit: next,
        message: 'Dispatched to GitHub Actions. Typical run time 2–5 minutes.',
      });
    } catch (err) {
      return NextResponse.json(
        { error: `Failed to dispatch workflow: ${(err as Error).message}` },
        { status: 500 }
      );
    }
  }

  // Local fallback - run inline.
  await upsertAudit({ ...audit, status: 'running' });
  const errors: string[] = [];

  try {
    if (audit.client.url) {
      try {
        await fetchAndCachePair(audit.id, audit.client.url);
      } catch (err) {
        errors.push(`Lighthouse: ${(err as Error).message}`);
      }
    }

    if (isClaudeConfigured()) {
      const parsed = (await loadParsedAuditData(audit).catch(() => undefined)) || undefined;
      const { loadCachedClientPair } = await import('@/lib/lighthouse-cache');
      const lighthouse = audit.client.url ? loadCachedClientPair(audit.id, audit.client.url) : undefined;
      try {
        const narratives = await generateNarratives({ audit, parsed, lighthouse });
        writeCachedNarratives(audit.id, narratives);
      } catch (err) {
        errors.push(`Claude: ${(err as Error).message}`);
      }
    } else {
      errors.push('ANTHROPIC_API_KEY not set — narrative writing skipped.');
    }

    await upsertAudit({ ...audit, status: 'complete', errors: errors.length ? errors : undefined });
    return NextResponse.json({
      ok: true,
      message: 'Audit generation complete.',
      errors: errors.length ? errors : undefined,
    });
  } catch (err) {
    await upsertAudit({ ...audit, status: 'failed', errors: [(err as Error).message] });
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// Vercel Hobby caps function duration at 60s; Pro at 300s.
// On Hobby, the inline-generation fallback will time out for full audits — use
// the GitHub Actions workflow (set GITHUB_TOKEN + GITHUB_OWNER + GITHUB_REPO)
// or upgrade to Pro for inline generation.
export const maxDuration = 60;
export const runtime = 'nodejs';
