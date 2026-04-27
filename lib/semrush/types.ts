/** Parsed Semrush keyword position row. */
export interface KeywordRow {
  keyword: string;
  position: number | null;
  previousPosition?: number | null;
  volume: number;
  kd: number; // Keyword Difficulty (0-100)
  cpc: number;
  intent?: string; // C / I / N / T / Commercial / Informational / etc.
  url?: string;
  traffic?: number;
  serpFeatures?: string;
  /** Best-effort target page if mapped. */
  targetPage?: string;
}

/** Parsed Semrush backlink row. */
export interface BacklinkRow {
  sourceUrl: string;
  sourceDomain: string;
  sourceTitle?: string;
  anchor?: string;
  targetUrl?: string;
  firstSeen?: string;
  lastSeen?: string;
  pageScore?: number;
  sourceAs?: number; // Source Authority Score
  sourceDr?: number; // Domain Rating
  type?: string; // text / image / form / frame
  followType?: string; // dofollow / nofollow / sponsored / ugc
  isToxic?: boolean;
  toxicReason?: string;
}

/** Parsed Keyword Gap row. */
export interface KeywordGapRow {
  keyword: string;
  volume: number;
  kd: number;
  cpc: number;
  intent?: string;
  /** Map of domain -> position (or null when not ranking). */
  positions: Record<string, number | null>;
  /** Number of competitors ranking in top-100 for this keyword. */
  competitorsRanking: number;
  /** Domain with the best position (top-of-stack). */
  topRankingDomain?: string;
  topRankingPosition?: number;
  /** True if our client has no position. */
  isGap: boolean;
}

export interface SemrushParseResult<T> {
  rows: T[];
  warnings: string[];
}
