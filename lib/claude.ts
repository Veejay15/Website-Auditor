/**
 * Claude API integration for audit-narrative writing.
 *
 * Strategy:
 *   - Each section gets ONE Claude call producing 2-4 short analytical paragraphs.
 *   - The system prompt + the audit-summary fact block are CACHED across all
 *     section calls (anthropic prompt caching, 5-min TTL) so we pay full token
 *     cost once and amortize across the ~6 narrative-driven sections.
 *   - Output is always plain HTML fragments that get spliced into section
 *     templates (no markdown, no JSON wrapping).
 *
 * Cost: with cache hits, a typical audit's narrative work is roughly
 * 1k cached system tokens (paid once) + 6 * (300 in + 500 out) = ~5k billable
 * tokens total. With Sonnet 4.6 that's ~$0.10 per audit.
 */

import Anthropic from '@anthropic-ai/sdk';
import { Audit } from './types';
import { ParsedAuditData } from './parsed';
import type { LighthouseResult } from './lighthouse';
import { hostnameOf } from './utils';

const MODEL = 'claude-sonnet-4-6';

export type NarrativeSection =
  | 'executive-summary' // §9 final exec summary
  | 'serp-overview' // §1 lead paragraph
  | 'keyword-strategy' // §2 lead paragraph
  | 'technical-overview' // §3 lead paragraph
  | 'content-audit-overview' // §4 lead paragraph
  | 'local-seo-overview' // §5 lead paragraph
  | 'competitor-overview' // §6 lead paragraph
  | 'backlink-overview'; // §7 lead paragraph

export interface NarrativeContext {
  audit: Audit;
  parsed?: ParsedAuditData;
  lighthouse?: { mobile?: LighthouseResult; desktop?: LighthouseResult };
}

interface NarrativeBundle {
  /** Generated HTML keyed by NarrativeSection. */
  [key: string]: string;
}

export function isClaudeConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * Build the cached fact block that summarizes the audit. This is what Claude
 * "remembers" across calls so each section can write context-aware paragraphs.
 */
function buildFactBlock(ctx: NarrativeContext): string {
  const { audit, parsed, lighthouse } = ctx;
  const lines: string[] = [];
  lines.push(`CLIENT: ${audit.client.name}`);
  lines.push(`URL: ${audit.client.url || 'unknown'}`);
  lines.push(`LOCATION: ${audit.client.location || 'unknown'}`);
  lines.push(`SERVICES: ${audit.client.services.join(', ') || 'unknown'}`);
  lines.push(`COMPETITORS: ${audit.competitors.map((c) => c.label || hostnameOf(c.url)).join(', ')}`);

  if (parsed) {
    const totalKw = parsed.clientKeywords.length;
    const totalVol = parsed.clientKeywords.reduce((s, k) => s + k.volume, 0);
    lines.push(`RANKING_KEYWORDS: ${totalKw}`);
    lines.push(`TOTAL_SEARCH_VOLUME: ${totalVol.toLocaleString()}/mo`);
    if (parsed.clientKeywords.length > 0) {
      lines.push(
        `TOP_KEYWORDS: ${parsed.clientKeywords
          .slice(0, 8)
          .map((k) => `"${k.keyword}" (vol ${k.volume}, KD ${Math.round(k.kd)}, pos ${k.position})`)
          .join('; ')}`
      );
    }
    if (parsed.contentGap.length > 0) {
      lines.push(`CONTENT_GAPS_FOUND: ${parsed.contentGap.length}`);
      lines.push(
        `TOP_GAPS: ${parsed.contentGap
          .slice(0, 5)
          .map((g) => `"${g.keyword}" (vol ${g.volume}, KD ${Math.round(g.kd)}, ${g.competitorsRanking} comps)`)
          .join('; ')}`
      );
    }
    lines.push(`TOTAL_BACKLINKS: ${parsed.backlinkStats.totalBacklinks}`);
    lines.push(`REFERRING_DOMAINS: ${parsed.backlinkStats.totalReferringDomains}`);
    lines.push(`TOXIC_PERCENT: ${Math.round(parsed.backlinkStats.toxicPercent)}%`);
  }

  if (lighthouse?.mobile && !lighthouse.mobile.error) {
    const m = lighthouse.mobile;
    lines.push(
      `LIGHTHOUSE_MOBILE: perf=${m.scores.performance}, seo=${m.scores.seo}, a11y=${m.scores.accessibility}, bp=${m.scores.bestPractices}`
    );
    lines.push(`LCP_MOBILE: ${m.metrics.lcp.display} (threshold 2.5s)`);
    if (m.opportunities.length > 0) {
      lines.push(
        `TOP_PSI_OPPORTUNITIES: ${m.opportunities
          .slice(0, 3)
          .map((o) => `${o.title} (${(o.savingsMs / 1000).toFixed(1)}s)`)
          .join('; ')}`
      );
    }
  }

  // Map Pack summary
  const queries = audit.mapPackQueries.length;
  if (queries > 0) {
    let clientWins = 0;
    let topCompetitorWins = 0;
    let topCompetitorLabel = '';
    for (const c of audit.competitors) {
      let wins = 0;
      for (const q of audit.mapPackQueries) {
        const row = audit.mapPackResults[q.query];
        const v = row?.[c.url];
        if (v === 1 || v === 2 || v === 3) wins++;
      }
      if (wins > topCompetitorWins) {
        topCompetitorWins = wins;
        topCompetitorLabel = c.label || hostnameOf(c.url);
      }
    }
    for (const q of audit.mapPackQueries) {
      const v = audit.mapPackResults[q.query]?.client;
      if (v === 1 || v === 2 || v === 3) clientWins++;
    }
    lines.push(`MAP_PACK: client top-3 in ${clientWins}/${queries}, top competitor ${topCompetitorLabel} in ${topCompetitorWins}/${queries}`);
  }

  return lines.join('\n');
}

const SECTION_PROMPTS: Record<NarrativeSection, string> = {
  'executive-summary':
    'Write a 3-paragraph FINAL EXECUTIVE SUMMARY for this comprehensive SEO audit. Paragraph 1: where the client stands today (real numbers). Paragraph 2: the most important opportunity (specific, with revenue framing). Paragraph 3: what success looks like in 12-18 months. End the third paragraph with a sentence stating the recurring monthly revenue range from the Revenue Opportunity page if known. No headings, no bullet lists - just three flowing paragraphs of professional analytical prose. Wrap each paragraph in a <p> tag. Be specific - reference actual keyword names, real numbers, and the client\'s exact services. Do not use the words "this audit" or "the audit". Speak directly to the client.',
  'serp-overview':
    'Write 1-2 short paragraphs (2-4 sentences each) introducing Section 1: SERP Competitive Analysis. Frame what this section maps and what the reader will learn. Reference specific competitor names if available. End on a transition to the SERP tables that follow. Wrap each paragraph in <p> tags. No headings.',
  'keyword-strategy':
    'Write 1-2 short paragraphs introducing Section 2: Keyword Strategy & Gap Analysis. Use the actual ranking keyword count and total search volume. If content gaps exist, mention the count and quote one or two specific gap keywords. End with a transition to the tables. Wrap each paragraph in <p> tags.',
  'technical-overview':
    'Write 1-2 short paragraphs introducing Section 3: Technical SEO. If Lighthouse mobile performance is low (<50), call it out by name and quote the actual LCP. If high (>=80), praise the technical foundation and pivot to remaining opportunities. Wrap each paragraph in <p> tags.',
  'content-audit-overview':
    'Write 1 short paragraph (3-4 sentences) introducing Section 4: Site-Wide Content Audit. Frame what this section will surface (page inventory, thin content, duplicates, orphans). Wrap in <p> tags.',
  'local-seo-overview':
    'Write 1-2 short paragraphs introducing Section 5: Local SEO. Reference the Map Pack matrix data: client wins out of total queries, top competitor wins out of total. Frame why local is the highest-leverage channel for this business given its location and services. Wrap each paragraph in <p> tags.',
  'competitor-overview':
    'Write 1-2 short paragraphs introducing Section 6: Deep Competitor Comparison Dashboard. Reference specific competitor names. If content gap data exists, quote the count and the highest-impact gap keyword. Wrap each paragraph in <p> tags.',
  'backlink-overview':
    'Write 1-2 short paragraphs introducing Section 7: Backlink Audit. Reference actual numbers: total backlinks, RDs, toxic percentage. If toxic >= 30% of profile, lead with that as a critical finding. If toxic < 10%, frame the section as opportunity-focused. Wrap each paragraph in <p> tags.',
};

const SYSTEM_PROMPT = `You are a senior SEO strategist writing analytical prose for a comprehensive client SEO audit produced by Makarios Marketing. Your audience: paying clients (not lead-magnet prospects).

Style rules:
- Professional, direct, evidence-based. Every claim should reference a real number or specific competitor when possible.
- No filler ("In today's digital landscape...", "It is important to note..."). No hype.
- No bullet lists unless explicitly asked. No headings unless explicitly asked.
- Output PLAIN HTML fragments only - <p> tags wrapping paragraphs. No markdown, no code fences, no commentary.
- Do not use the words "this audit", "the audit", "we will", "we'll cover".
- Do not invent data. If a number is unknown, write around it.
- US English. Numbers formatted with commas (e.g., 24,620 not 24620).`;

/**
 * Generate all narrative bundles in one batch using prompt caching.
 * Returns a map of NarrativeSection -> HTML fragment.
 *
 * Returns empty object if ANTHROPIC_API_KEY is not set.
 */
export async function generateNarratives(
  ctx: NarrativeContext,
  sections: NarrativeSection[] = Object.keys(SECTION_PROMPTS) as NarrativeSection[]
): Promise<NarrativeBundle> {
  if (!isClaudeConfigured()) return {};

  const client = new Anthropic();
  const factBlock = buildFactBlock(ctx);
  const out: NarrativeBundle = {};

  // Issue requests sequentially so the cache hits on calls 2+. Promise.all would
  // race them and miss the cache. The audit-generation pipeline is async anyway.
  for (const section of sections) {
    try {
      const res = await client.messages.create({
        model: MODEL,
        // Executive summary needs ~3 substantial paragraphs; other sections fit in 800.
        max_tokens: section === 'executive-summary' ? 1500 : 800,
        system: [
          { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
          { type: 'text', text: `AUDIT FACTS:\n${factBlock}`, cache_control: { type: 'ephemeral' } },
        ],
        messages: [
          {
            role: 'user',
            content: `Section: ${section}\n\nInstruction: ${SECTION_PROMPTS[section]}`,
          },
        ],
      });
      const text = res.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as { type: 'text'; text: string }).text)
        .join('\n')
        .trim();
      out[section] = text;
    } catch (err) {
      // Don't fail the whole audit if one section narrative fails.
      out[section] = `<p><em>Narrative generation failed: ${(err as Error).message}</em></p>`;
    }
  }
  return out;
}

/**
 * Write narratives to disk so the preview render can read them without re-billing.
 */
export function narrativesPath(auditId: string): string {
  return `data/audits/${auditId}/narratives.json`;
}
