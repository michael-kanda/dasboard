import assert from 'node:assert/strict';
import test from 'node:test';
import { TOP_QUERIES_DATA_VERSION, type ProjectDashboardData } from '../../src/lib/dashboard-shared.ts';
import { GOOGLE_ADS_SHEET_DATA_VERSION } from '../../src/lib/google-ads-sheet.ts';
import {
  DASHBOARD_SNAPSHOT_VERSION,
  isDashboardSnapshotCompatible,
} from '../../src/lib/sync/dashboard-snapshot-contract.ts';

function createSnapshot(overrides: Partial<ProjectDashboardData> = {}): ProjectDashboardData {
  return {
    snapshotVersion: DASHBOARD_SNAPSHOT_VERSION,
    topQueriesDataVersion: TOP_QUERIES_DATA_VERSION,
    ...overrides,
  };
}

test('accepts a snapshot written with the shared dashboard contract', () => {
  assert.equal(isDashboardSnapshotCompatible(createSnapshot(), null), true);
});

test('invalidates stale versions and changed Google Ads Sheet configuration', () => {
  assert.equal(isDashboardSnapshotCompatible({ ...createSnapshot(), snapshotVersion: 1 }, null), false);
  assert.equal(isDashboardSnapshotCompatible(createSnapshot(), 'sheet-1'), false);

  const sheetSnapshot = createSnapshot({
    googleAdsData: {
      rows: [],
      landingPageRows: [],
      totals: {
        cost: 0,
        clicks: 0,
        avgCpc: 0,
        roas: 0,
        conversions: 0,
        sessions: 0,
        engagedSessions: 0,
      },
      source: 'sheet',
      configuredSheetId: 'sheet-1',
      sheetDataVersion: GOOGLE_ADS_SHEET_DATA_VERSION,
    },
  });

  assert.equal(isDashboardSnapshotCompatible(sheetSnapshot, 'sheet-1'), true);
  assert.equal(isDashboardSnapshotCompatible(sheetSnapshot, 'sheet-2'), false);
  assert.equal(isDashboardSnapshotCompatible(sheetSnapshot, null), false);
});
