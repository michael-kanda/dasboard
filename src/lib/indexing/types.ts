import { type IndexingExclusionCategory, type IndexingUrlStatus } from '@/lib/indexing-status-constants';

export interface IndexingStatusRow {
  url: string;
  status: IndexingUrlStatus;
  coverageState: string | null;
  robotsTxtState: string | null;
  indexingState: string | null;
  pageFetchState: string | null;
  lastCrawlTime: string | null;
  googleCanonical: string | null;
  userCanonical: string | null;
  impressions: number;
  clicks: number;
  position: number | null;
  sitemapLastmod: string | null;
  inspectedAt: string | null;
  inspectionPending: boolean;
  inspectionError: string | null;
  hasCanonicalIssue: boolean;
  category: IndexingExclusionCategory;
  isIntentional: boolean;
  needsAction: boolean;
  actionHint: string | null;
  inspectionAgeDays: number | null;
  isStale: boolean;
}

export interface ExcludedSitemapUrl {
  url: string;
  reason: string;
}

export interface ProjectIndexingStatus {
  configured: boolean;
  sitemapUrl: string | null;
  status: 'idle' | 'running' | 'completed' | 'partial' | 'error';
  sitemapEntryCount: number;
  excludedUrlCount: number;
  excludedUrls: ExcludedSitemapUrl[];
  warningMessage: string | null;
  progressStage: 'idle' | 'sitemap' | 'gsc' | 'inspection' | 'queued' | 'paused' | 'completed' | 'error';
  progressTotal: number;
  progressCompleted: number;
  progressDueTotal: number;
  totalUrls: number;
  verifiedUrls: number;
  unverifiedUrls: number;
  verificationCoverage: number;
  isVerificationComplete: boolean;
  recheckPendingUrls: number;
  indexedUrls: number;
  notIndexedUrls: number;
  pendingUrls: number;
  issueUrls: number;
  intentionalUrls: number;
  staleUrls: number;
  oldestInspectionAt: string | null;
  maxInspectionAgeDays: number | null;
  lastSyncedAt: string | null;
  nextSyncAt: string | null;
  errorMessage: string | null;
  performanceRange: string;
  rows: IndexingStatusRow[];
  skipped?: 'locked' | 'not-due' | 'quota';
}

export type ProjectIndexingProgress = Pick<
  ProjectIndexingStatus,
  'status' | 'progressStage' | 'progressTotal' | 'progressCompleted' | 'progressDueTotal'
>;

export type ProjectConfig = {
  id: string;
  domain: string | null;
  gsc_site_url: string | null;
  sitemap_url: string | null;
};

export type SitemapEntry = {
  url: string;
  lastmod: string | null;
  source: string;
};

export const EMPTY_STATUS: ProjectIndexingStatus = {
  configured: false,
  sitemapUrl: null,
  status: 'idle',
  sitemapEntryCount: 0,
  excludedUrlCount: 0,
  excludedUrls: [],
  warningMessage: null,
  progressStage: 'idle',
  progressTotal: 0,
  progressCompleted: 0,
  progressDueTotal: 0,
  totalUrls: 0,
  verifiedUrls: 0,
  unverifiedUrls: 0,
  verificationCoverage: 0,
  isVerificationComplete: false,
  recheckPendingUrls: 0,
  indexedUrls: 0,
  notIndexedUrls: 0,
  pendingUrls: 0,
  issueUrls: 0,
  intentionalUrls: 0,
  staleUrls: 0,
  oldestInspectionAt: null,
  maxInspectionAgeDays: null,
  lastSyncedAt: null,
  nextSyncAt: null,
  errorMessage: null,
  performanceRange: 'Letzte 90 Tage',
  rows: [],
};

export interface IndexingSyncOptions {
  force?: boolean;
  maxInspections?: number;
  deadlineAt?: number;
  /** Zeitpuffer, der am Ende für das Abschluss-Update reserviert bleibt. */
  inspectionReserveMs?: number;
  /** Parallele URL-Inspection-Aufrufe. Google erlaubt 600 Abfragen pro Minute je Property. */
  inspectionConcurrency?: number;
}
