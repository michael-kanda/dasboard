import assert from 'node:assert/strict';
import test from 'node:test';
import { pickNextProjectSyncJobType } from '../../src/lib/sync/dispatcher-policy.ts';
import type { ProjectSyncJobType } from '../../src/lib/sync/job-queue.ts';

const quota: Record<ProjectSyncJobType, number> = {
  dashboard: 3,
  'gsc-history': 2,
  indexing: 4,
};

test('gives every source type a turn before repeating a source', () => {
  const processed: Record<ProjectSyncJobType, number> = {
    dashboard: 0,
    'gsc-history': 0,
    indexing: 0,
  };
  const exhausted = new Set<ProjectSyncJobType>();
  const fits = () => true;

  assert.equal(pickNextProjectSyncJobType({
    remainingQuota: quota,
    processedByType: processed,
    exhaustedTypes: exhausted,
    fits,
  }), 'dashboard');

  processed.dashboard += 1;
  assert.equal(pickNextProjectSyncJobType({
    remainingQuota: quota,
    processedByType: processed,
    exhaustedTypes: exhausted,
    fits,
  }), 'gsc-history');

  processed['gsc-history'] += 1;
  assert.equal(pickNextProjectSyncJobType({
    remainingQuota: quota,
    processedByType: processed,
    exhaustedTypes: exhausted,
    fits,
  }), 'indexing');
});

test('skips exhausted sources and jobs that do not fit the remaining runtime', () => {
  assert.equal(pickNextProjectSyncJobType({
    remainingQuota: quota,
    processedByType: { dashboard: 0, 'gsc-history': 0, indexing: 0 },
    exhaustedTypes: new Set<ProjectSyncJobType>(['dashboard']),
    fits: (type) => type === 'indexing',
  }), 'indexing');
});
