import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { readAudit } from '@/lib/audits';
import { getWorkflowRun, isGithubConfigured } from '@/lib/github';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;
  const { id } = await params;
  const audit = await readAudit(id);
  if (!audit) return NextResponse.json({ error: 'Audit not found' }, { status: 404 });

  let workflowRun = null;
  if (audit.workflowRunId && isGithubConfigured()) {
    try {
      workflowRun = await getWorkflowRun(audit.workflowRunId);
    } catch (err) {
      workflowRun = { error: (err as Error).message };
    }
  }

  return NextResponse.json({
    status: audit.status,
    workflowRun,
    errors: audit.errors,
  });
}
