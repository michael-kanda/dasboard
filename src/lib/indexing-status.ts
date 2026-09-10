// Public compatibility facade. Implementation lives in ./indexing.
export {
  classifyIndexingRow,
  normalizeUrlForComparison,
  CATEGORY_LABELS,
  INDEXED_HOT_RECHECK_DAYS,
  INDEXED_RECHECK_DAYS,
  NOT_INDEXED_RECHECK_DAYS,
  STALE_AFTER_DAYS,
} from '@/lib/indexing-status-constants';
export type {
  IndexingExclusionCategory,
  IndexingUrlStatus,
  IndexingClassification,
} from '@/lib/indexing-status-constants';
export type { IndexingStatusRow } from './indexing/types';
export type { ExcludedSitemapUrl } from './indexing/types';
export type { ProjectIndexingStatus } from './indexing/types';
export type { ProjectIndexingProgress } from './indexing/types';
export type { IndexingSyncOptions } from './indexing/types';
export { syncProjectIndexingStatus } from './indexing/sync';
export { getProjectIndexingStatus } from './indexing/repository';
export { getProjectIndexingProgress } from './indexing/repository';
