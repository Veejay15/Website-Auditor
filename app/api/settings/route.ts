import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { readSettings, writeSettingsLocal } from '@/lib/settings';
import { commitSettings, isGithubConfigured } from '@/lib/github';

export async function GET() {
  const authError = await requireAuth();
  if (authError) return authError;
  return NextResponse.json({ settings: readSettings() });
}

export async function POST(req: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;
  const settings = await req.json();
  writeSettingsLocal(settings);
  if (isGithubConfigured()) {
    try {
      await commitSettings(settings, 'Update Makarios audit settings');
    } catch (err) {
      return NextResponse.json(
        { error: `Saved locally but failed to commit: ${(err as Error).message}` },
        { status: 500 }
      );
    }
  }
  return NextResponse.json({ ok: true, settings });
}
