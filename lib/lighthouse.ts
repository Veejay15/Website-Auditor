/**
 * Google PageSpeed Insights API wrapper.
 *
 * Free tier without an API key is rate-limited to ~1 call per second per IP.
 * With a key (PAGESPEED_API_KEY env var) you get 25,000/day - well above what
 * any audit will use (1 client * mobile + desktop + competitors = ~12 calls).
 *
 * Get a key at: https://developers.google.com/speed/docs/insights/v5/get-started
 */

export type LhStrategy = 'mobile' | 'desktop';

export interface LighthouseResult {
  url: string;
  strategy: LhStrategy;
  scores: {
    performance: number; // 0-100
    seo: number;
    accessibility: number;
    bestPractices: number;
  };
  /** Core Web Vitals + key timings, formatted display values. */
  metrics: {
    lcp: { value: number; display: string }; // Largest Contentful Paint (ms)
    fcp: { value: number; display: string }; // First Contentful Paint (ms)
    tbt: { value: number; display: string }; // Total Blocking Time (ms)
    cls: { value: number; display: string }; // Cumulative Layout Shift
    speedIndex: { value: number; display: string };
  };
  /** Top opportunities ranked by potential savings (seconds). */
  opportunities: { id: string; title: string; savingsMs: number; description?: string }[];
  /** Failed SEO + Best Practices audits, one per row. */
  failedAudits: { id: string; title: string; category: 'seo' | 'best-practices' | 'accessibility'; description?: string }[];
  /** Raw error if the call failed. */
  error?: string;
}

interface PsiAudit {
  id?: string;
  title?: string;
  description?: string;
  score?: number | null;
  displayValue?: string;
  numericValue?: number;
  details?: { overallSavingsMs?: number };
}

interface PsiAuditRefs {
  id: string;
}

interface PsiCategory {
  score?: number;
  auditRefs?: PsiAuditRefs[];
}

interface PsiResponse {
  lighthouseResult?: {
    audits?: Record<string, PsiAudit>;
    categories?: {
      performance?: PsiCategory;
      seo?: PsiCategory;
      accessibility?: PsiCategory;
      'best-practices'?: PsiCategory;
    };
  };
  error?: { message?: string };
}

const PSI_BASE = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

function pct(score: number | null | undefined): number {
  if (score === null || score === undefined) return 0;
  return Math.round(score * 100);
}

function metric(audit: PsiAudit | undefined): { value: number; display: string } {
  if (!audit) return { value: 0, display: '—' };
  return { value: audit.numericValue ?? 0, display: audit.displayValue ?? '—' };
}

/**
 * Run a Lighthouse audit. Strategy:
 *   1. If PAGESPEED_API_KEY is set, use the PSI API (works on Vercel + locally).
 *   2. Else, fall back to the local `lighthouse` CLI (must be globally installed).
 *
 * The PSI API and Lighthouse CLI return identical JSON shapes for `lighthouseResult`,
 * so parsing is the same.
 */
export async function runPsi(url: string, strategy: LhStrategy): Promise<LighthouseResult> {
  const key = process.env.PAGESPEED_API_KEY;
  if (key) return runPsiApi(url, strategy, key);
  return runLighthouseCli(url, strategy);
}

async function runPsiApi(url: string, strategy: LhStrategy, key: string): Promise<LighthouseResult> {
  const params = new URLSearchParams({ url, strategy, category: 'performance' });
  params.append('category', 'seo');
  params.append('category', 'accessibility');
  params.append('category', 'best-practices');
  params.append('key', key);

  try {
    const res = await fetch(`${PSI_BASE}?${params.toString()}`, { signal: AbortSignal.timeout(60_000) });
    const json = (await res.json()) as PsiResponse;
    if (!res.ok || json.error) {
      return errorResult(url, strategy, json.error?.message || `HTTP ${res.status}`);
    }
    return parsePsi(url, strategy, json);
  } catch (err) {
    return errorResult(url, strategy, (err as Error).message);
  }
}

async function runLighthouseCli(url: string, strategy: LhStrategy): Promise<LighthouseResult> {
  // Dynamically import child_process at runtime to keep the bundler happy.
  const { spawn } = await import('child_process');
  const fs = await import('fs');
  const path = await import('path');
  const os = await import('os');

  const outPath = path.join(os.tmpdir(), `lh-${strategy}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`);
  const formFactor = strategy === 'mobile' ? 'mobile' : 'desktop';
  const presetArgs = strategy === 'desktop' ? ['--preset=desktop'] : ['--form-factor=mobile'];

  return new Promise<LighthouseResult>((resolve) => {
    // On Windows the global "lighthouse" command is typically a .cmd shim; spawn with shell:true.
    const child = spawn(
      'lighthouse',
      [
        url,
        ...presetArgs,
        '--output=json',
        `--output-path=${outPath}`,
        '--chrome-flags=--headless --no-sandbox',
        '--quiet',
        '--only-categories=performance,seo,accessibility,best-practices',
      ],
      { shell: true }
    );
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (err) => resolve(errorResult(url, strategy, `lighthouse spawn failed: ${err.message}`)));
    child.on('exit', (code) => {
      if (code !== 0 && !fs.existsSync(outPath)) {
        resolve(errorResult(url, strategy, `lighthouse exit code ${code}: ${stderr.slice(0, 200)}`));
        return;
      }
      try {
        const raw = fs.readFileSync(outPath, 'utf-8');
        const parsed = JSON.parse(raw);
        // Local CLI puts everything at the top level; wrap to match PSI shape.
        const result = parsePsi(url, strategy, { lighthouseResult: parsed });
        fs.unlink(outPath, () => {});
        resolve(result);
      } catch (err) {
        resolve(errorResult(url, strategy, `failed to read lighthouse output: ${(err as Error).message}`));
      }
    });

    // Hard timeout - kill process after 90s.
    setTimeout(() => {
      try {
        child.kill('SIGKILL');
      } catch {
        /* ignore */
      }
    }, 90_000);
    // Suppress the unused formFactor name (lint).
    void formFactor;
  });
}

function errorResult(url: string, strategy: LhStrategy, error: string): LighthouseResult {
  return {
    url,
    strategy,
    scores: { performance: 0, seo: 0, accessibility: 0, bestPractices: 0 },
    metrics: {
      lcp: { value: 0, display: '—' },
      fcp: { value: 0, display: '—' },
      tbt: { value: 0, display: '—' },
      cls: { value: 0, display: '—' },
      speedIndex: { value: 0, display: '—' },
    },
    opportunities: [],
    failedAudits: [],
    error,
  };
}

function parsePsi(url: string, strategy: LhStrategy, json: PsiResponse): LighthouseResult {
  const lr = json.lighthouseResult;
  const audits = lr?.audits || {};
  const cats = lr?.categories || {};

  const scores = {
    performance: pct(cats.performance?.score),
    seo: pct(cats.seo?.score),
    accessibility: pct(cats.accessibility?.score),
    bestPractices: pct(cats['best-practices']?.score),
  };

  const metrics = {
    lcp: metric(audits['largest-contentful-paint']),
    fcp: metric(audits['first-contentful-paint']),
    tbt: metric(audits['total-blocking-time']),
    cls: metric(audits['cumulative-layout-shift']),
    speedIndex: metric(audits['speed-index']),
  };

  // Top opportunities by overallSavingsMs.
  const opportunities = Object.entries(audits)
    .filter(([, a]) => (a.details?.overallSavingsMs ?? 0) > 250)
    .map(([id, a]) => ({
      id,
      title: a.title || id,
      savingsMs: a.details?.overallSavingsMs ?? 0,
      description: a.description,
    }))
    .sort((a, b) => b.savingsMs - a.savingsMs)
    .slice(0, 6);

  // Failed SEO + best-practices + accessibility audits.
  const seoIds = new Set((cats.seo?.auditRefs || []).map((r) => r.id));
  const bpIds = new Set((cats['best-practices']?.auditRefs || []).map((r) => r.id));
  const a11yIds = new Set((cats.accessibility?.auditRefs || []).map((r) => r.id));
  const failedAudits: LighthouseResult['failedAudits'] = [];
  for (const [id, a] of Object.entries(audits)) {
    if (a.score === null || a.score === undefined) continue;
    if (a.score >= 1) continue;
    if (seoIds.has(id)) failedAudits.push({ id, title: a.title || id, category: 'seo', description: a.description });
    else if (bpIds.has(id)) failedAudits.push({ id, title: a.title || id, category: 'best-practices', description: a.description });
    else if (a11yIds.has(id)) failedAudits.push({ id, title: a.title || id, category: 'accessibility', description: a.description });
  }

  return { url, strategy, scores, metrics, opportunities, failedAudits };
}

/** Run mobile + desktop in parallel for a single URL. */
export async function runPsiPair(url: string): Promise<{ mobile: LighthouseResult; desktop: LighthouseResult }> {
  const [mobile, desktop] = await Promise.all([runPsi(url, 'mobile'), runPsi(url, 'desktop')]);
  return { mobile, desktop };
}
