import { NextRequest } from 'next/server';
import { isAuthenticated } from '@/lib/session';
import { readAudit } from '@/lib/audits';
import { renderAuditHtml, injectPrintTrigger } from '@/lib/render';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  const authed = await isAuthenticated();
  if (!authed) {
    return new Response('Not authenticated', {
      status: 401,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  const { id } = await params;
  const audit = readAudit(id);
  if (!audit) {
    return new Response('Audit not found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  const wantsPrint = req.nextUrl.searchParams.get('print') === '1';
  let html = await renderAuditHtml(audit);
  if (wantsPrint) html = injectPrintTrigger(html);

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export const runtime = 'nodejs';
