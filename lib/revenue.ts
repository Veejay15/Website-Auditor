import { Audit } from './types';
import { readSettings } from './settings';

export interface RevenueScenario {
  label: string;
  amount: number;
  amountFormatted: string;
  detail: string;
}

export interface RevenueProjection {
  scenarios: { m6: RevenueScenario; m12: RevenueScenario; m18: RevenueScenario };
  methodology: { factor: string; assumption: string; source: string }[];
  m12Math: {
    rows: { source: string; volumeOrCtr: string; clicks: number; customers: string; revenue: string }[];
    totals: { clicks: number; customersRange: string; revenueRange: string };
  };
  /** Practical sustained range (LTV + referrals + LSA) in $X – $Y / month form. */
  sustainedRange: string;
  aov: number;
  conversionRate: number;
}

function fmt(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}
function fmtRange(lo: number, hi: number): string {
  return `${fmt(lo)} – ${fmt(hi)}`;
}

/**
 * Build the Revenue Opportunity scenarios.
 *
 * Locked rules:
 *   - Month 6 must be >= 70% of Month 12.
 *   - Month 18 is typically +35-45% over Month 12.
 *   - Sustained-range = ~1.7-2x organic Month 12 (accounts for LTV + referrals + LSA).
 *
 * If the audit hasn't provided custom volumes, we use a generic placeholder model
 * built from the AOV + conversion rate so every audit ships with a real Revenue page.
 * Phase 3 work: replace the placeholder volumes with the real Semrush primary/secondary totals.
 */
export function buildRevenueProjection(audit: Audit): RevenueProjection {
  const s = readSettings();
  const aov = audit.revenueInputs.aov ?? s.revenueDefaults.aov;
  const conversionRate = audit.revenueInputs.conversionRate ?? s.revenueDefaults.conversionRate;
  const top3Ctr = s.revenueDefaults.topThreeCtr;
  const page1Ctr = s.revenueDefaults.pageOneCtr;

  // Placeholder volumes that scale with AOV. Real Phase-3 numbers come from Semrush parser.
  const primaryVolume = 1240;
  const secondaryVolume = 3480;
  const mapPackClicks = 150;

  const top3Clicks = Math.round(primaryVolume * top3Ctr);
  const page1Clicks = Math.round(secondaryVolume * page1Ctr);
  const totalClicks = top3Clicks + page1Clicks + mapPackClicks;

  const customersLow = totalClicks * conversionRate * 0.85;
  const customersHigh = totalClicks * conversionRate * 1.15;
  const m12Low = customersLow * aov;
  const m12High = customersHigh * aov;
  const m12Mid = (m12Low + m12High) / 2;

  const m6Mid = Math.round(m12Mid * 0.75); // 75% of M12 (>=70% rule)
  const m18Mid = Math.round(m12Mid * 1.4);

  const sustainedLow = Math.round(m12Mid * 1.7);
  const sustainedHigh = Math.round(m12Mid * 2.0);

  return {
    scenarios: {
      m6: {
        label: 'Month 6 — Foundation',
        amount: m6Mid,
        amountFormatted: fmt(m6Mid),
        detail: 'Page-1 wins on easy keywords + Map Pack top 5 + first review batch.',
      },
      m12: {
        label: 'Month 12 — Top 3 Core',
        amount: Math.round(m12Mid),
        amountFormatted: fmt(m12Mid),
        detail: 'Top 3 for primary keywords + established Map Pack presence.',
      },
      m18: {
        label: 'Month 18 — Market Leader',
        amount: m18Mid,
        amountFormatted: fmt(m18Mid) + '+',
        detail: 'Top 3 across primary + secondary clusters, LSA enabled, defensible review moat.',
      },
    },
    methodology: [
      { factor: 'Top-3 CTR (blended)', assumption: `${Math.round(top3Ctr * 100)}%`, source: 'Advanced Web Ranking industry benchmark' },
      { factor: 'Page-1 CTR (positions 4–10)', assumption: `${Math.round(page1Ctr * 100)}%`, source: 'Same source' },
      { factor: 'Map Pack uplift', assumption: '+100–200 clicks/mo', source: 'Post-GBP optimization benchmark' },
      { factor: 'Visitor → Customer conversion', assumption: `${(conversionRate * 100).toFixed(1)}%`, source: 'Local service avg with optimized CRO' },
      { factor: 'Weighted Average Order Value', assumption: fmt(aov), source: 'Client pricing × keyword-intent mix' },
    ],
    m12Math: {
      rows: [
        {
          source: `Top-3 primary keywords (${primaryVolume.toLocaleString()} volume)`,
          volumeOrCtr: `${primaryVolume.toLocaleString()} × ${Math.round(top3Ctr * 100)}%`,
          clicks: top3Clicks,
          customers: `${Math.round(top3Clicks * conversionRate * 0.85)}–${Math.round(top3Clicks * conversionRate * 1.15)}`,
          revenue: fmtRange(top3Clicks * conversionRate * 0.85 * aov, top3Clicks * conversionRate * 1.15 * aov),
        },
        {
          source: `Page-1 secondary keywords (${secondaryVolume.toLocaleString()} volume)`,
          volumeOrCtr: `${secondaryVolume.toLocaleString()} × ${Math.round(page1Ctr * 100)}%`,
          clicks: page1Clicks,
          customers: `${Math.round(page1Clicks * conversionRate * 0.85)}–${Math.round(page1Clicks * conversionRate * 1.15)}`,
          revenue: fmtRange(page1Clicks * conversionRate * 0.85 * aov, page1Clicks * conversionRate * 1.15 * aov),
        },
        {
          source: 'Google Map Pack (GBP fully optimized)',
          volumeOrCtr: `~${mapPackClicks} clicks`,
          clicks: mapPackClicks,
          customers: `${Math.round(mapPackClicks * conversionRate * 0.85)}–${Math.round(mapPackClicks * conversionRate * 1.15)}`,
          revenue: fmtRange(mapPackClicks * conversionRate * 0.85 * aov, mapPackClicks * conversionRate * 1.15 * aov),
        },
      ],
      totals: {
        clicks: totalClicks,
        customersRange: `${Math.round(customersLow)}–${Math.round(customersHigh)}`,
        revenueRange: fmtRange(m12Low, m12High),
      },
    },
    sustainedRange: fmtRange(sustainedLow, sustainedHigh),
    aov,
    conversionRate,
  };
}
