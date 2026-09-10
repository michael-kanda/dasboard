import { getRequestTimeout } from './request-budget';
import { createGoogleAuth, GOOGLE_SCOPES } from '@/lib/google-auth';
import { google } from 'googleapis';
import { type IndexingUrlStatus } from '@/lib/indexing-status-constants';

export function createGscAuth() {
  return createGoogleAuth([GOOGLE_SCOPES.searchConsole]);
}

function dateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function loadPagePerformance(siteUrl: string, deadlineAt: number) {
  const auth = createGscAuth();
  const searchconsole = google.searchconsole({ version: 'v1', auth });
  const end = new Date();
  end.setDate(end.getDate() - 2);
  const start = new Date(end);
  start.setDate(start.getDate() - 89);
  const response = await searchconsole.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate: dateString(start),
      endDate: dateString(end),
      dimensions: ['page'],
      rowLimit: 25_000,
      dataState: 'all',
      type: 'web',
    },
  }, { timeout: getRequestTimeout(deadlineAt, 30_000, 15_000) });
  const result = new Map<string, { clicks: number; impressions: number; ctr: number; position: number }>();
  for (const row of response.data.rows ?? []) {
    const url = row.keys?.[0];
    if (!url) continue;
    result.set(url, {
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: row.ctr ?? 0,
      position: row.position ?? 0,
    });
  }
  return result;
}

export function getIndexingStatus(verdict?: string | null): IndexingUrlStatus {
  if (verdict === 'PASS') return 'indexed';
  if (verdict === 'FAIL' || verdict === 'NEUTRAL') return 'not_indexed';
  return 'pending';
}

export async function mapWithConcurrency<T>(
  values: T[],
  concurrency: number,
  canStart: () => boolean,
  worker: (value: T) => Promise<void>,
) {
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (cursor < values.length && canStart()) {
      const value = values[cursor++];
      await worker(value);
    }
  }));
}
