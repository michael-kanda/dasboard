import type { ProjectIndexingStatus } from '@/lib/indexing-status';
import type { IndexingSkipReason } from '@/lib/sync/indexing';

export type IndexingStatusResponse = ProjectIndexingStatus & {
  skipped?: IndexingSkipReason;
};

export function createIndexingStatusResponse(
  status: ProjectIndexingStatus,
  skipped?: IndexingSkipReason,
): IndexingStatusResponse {
  return { ...status, ...(skipped ? { skipped } : {}) };
}

export function readIndexingStatusResponse(payload: unknown): ProjectIndexingStatus | null {
  if (!payload || typeof payload !== 'object') return null;
  const candidate = 'rows' in payload
    ? payload
    : 'status' in payload && payload.status && typeof payload.status === 'object'
      ? payload.status
      : null;
  if (!candidate || !('rows' in candidate) || !Array.isArray(candidate.rows)) return null;
  return candidate as ProjectIndexingStatus;
}
