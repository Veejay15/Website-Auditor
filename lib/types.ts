// Shared types for the Makarios Client Audit app.

export type AuditStatus =
  | 'draft'
  | 'queued'
  | 'running'
  | 'rendering'
  | 'complete'
  | 'failed';

export interface Competitor {
  url: string;
  label: string;
}

export type MapPackPosition = 1 | 2 | 3 | 'top10' | 'nr' | null;

export interface MapPackQuery {
  query: string;
  /** Free-text categorization (e.g., "service+city", "near me", "best of"). */
  queryType?: string;
}

/**
 * Map Pack matrix:
 *   { [query]: { client: position, [competitorUrl]: position } }
 */
export type MapPackResults = Record<
  string,
  { client: MapPackPosition } & Record<string, MapPackPosition>
>;

export interface BlobRef {
  url: string;
  pathname: string;
  size: number;
  contentType?: string;
  uploadedAt: string;
}

export interface AuditClient {
  name: string;
  url: string;
  location: string;
  services: string[];
  logoBlob?: BlobRef;
  /** Hex accent color. Defaults to '#dc2626' (Heat City red). Swap to client brand color. */
  brandAccentColor: string;
}

export interface AuditUploads {
  keywordsClientCsv?: BlobRef;
  /** One CSV per competitor (positions / organic keywords). */
  keywordsCompetitorCsvs?: BlobRef[];
  backlinksCsv?: BlobRef;
  gapAnalysisCsv?: BlobRef;
  /** Local Dominator screenshot uploads (optional, used when API not configured). */
  localDominatorScreenshots?: BlobRef[];
  /** GA4 + GSC exports (optional - enables Section 8 trend analysis). */
  ga4TrafficCsv?: BlobRef;
  ga4EventsCsv?: BlobRef;
  gscQueriesCsv?: BlobRef;
  gscPagesCsv?: BlobRef;
}

export interface RevenueInputs {
  /** Average Order Value (USD). */
  aov?: number;
  /** Visitor -> customer conversion rate (e.g., 0.025 for 2.5%). */
  conversionRate?: number;
}

export interface Audit {
  id: string;
  slug: string;
  status: AuditStatus;
  client: AuditClient;
  competitors: Competitor[];
  mapPackQueries: MapPackQuery[];
  mapPackResults: MapPackResults;
  uploads: AuditUploads;
  revenueInputs: RevenueInputs;
  /** URL to the rendered HTML page (in-app preview route). */
  previewPath?: string;
  /** Final downloadable PDF (if generated server-side; otherwise client uses window.print()). */
  pdfBlobUrl?: string;
  /** Workflow run id when generation is dispatched to GitHub Actions. */
  workflowRunId?: number;
  errors?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AuditsIndex {
  audits: Audit[];
}

export interface AppSettings {
  /** Default Makarios contact info shown on internal screens (the audit PDF has no CTA page). */
  makariosBrand: {
    name: string;
    website: string;
    phone: string;
    email: string;
    address: string;
  };
  /** Default Map Pack query templates seeded into new audits. {service} and {city} are interpolated. */
  defaultMapPackTemplates: string[];
  /** Default revenue inputs used if the audit doesn't override. */
  revenueDefaults: {
    aov: number;
    conversionRate: number;
    topThreeCtr: number; // 0.18 = 18%
    pageOneCtr: number; // 0.05
  };
  /** Whether Local Dominator API is wired up (vs screenshot upload only). */
  localDominatorApiEnabled: boolean;
}
