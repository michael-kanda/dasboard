import { TOP_QUERIES_DATA_VERSION, type ProjectDashboardData } from '../dashboard-shared.ts';
import { GOOGLE_ADS_SHEET_DATA_VERSION } from '../google-ads-sheet.ts';

// One shared version for both snapshot writes and reads. Bump this whenever
// persisted dashboard data needs to be rebuilt from its source APIs.
export const DASHBOARD_SNAPSHOT_VERSION = 4;

export function isDashboardSnapshotCompatible(
  data: ProjectDashboardData | null | undefined,
  configuredSheetId?: string | null,
): boolean {
  if (!data) return false;
  if (data.snapshotVersion !== DASHBOARD_SNAPSHOT_VERSION) return false;
  if (data.topQueriesDataVersion !== TOP_QUERIES_DATA_VERSION) return false;

  const expectedSheetId = configuredSheetId?.trim() || null;
  const cachedSheetId = data.googleAdsData?.source === 'sheet'
    ? data.googleAdsData.configuredSheetId?.trim() || null
    : null;

  if (expectedSheetId !== cachedSheetId) return false;
  if (expectedSheetId && data.googleAdsData?.sheetDataVersion !== GOOGLE_ADS_SHEET_DATA_VERSION) {
    return false;
  }

  return true;
}
