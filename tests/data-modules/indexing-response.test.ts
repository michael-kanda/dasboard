import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createIndexingStatusResponse,
  readIndexingStatusResponse,
} from '../../src/lib/indexing-response.ts';
import type { ProjectIndexingStatus } from '../../src/lib/indexing-status.ts';

const status = {
  rows: [],
  status: 'completed',
} as unknown as ProjectIndexingStatus;

test('keeps indexing rows at the top level of a successful API response', () => {
  const response = createIndexingStatusResponse(status);
  assert.equal(response.status, 'completed');
  assert.deepEqual(response.rows, []);
  assert.equal(readIndexingStatusResponse(response), response);
});

test('reads the former wrapped response during a rolling deployment', () => {
  assert.equal(readIndexingStatusResponse({ status }), status);
  assert.equal(readIndexingStatusResponse({ status: 'completed' }), null);
  assert.equal(readIndexingStatusResponse({ message: 'failed' }), null);
});
