import { sql } from '@vercel/postgres';
import type { searchconsole_v1 } from 'googleapis';
import { getIndexingStatus } from './inspection';
import { INDEXED_HOT_RECHECK_DAYS, INDEXED_RECHECK_DAYS, NOT_INDEXED_RECHECK_DAYS } from '@/lib/indexing-status-constants';

export async function persistInspectionResult(projectId: string, url: string, result: searchconsole_v1.Schema$IndexStatusInspectionResult | undefined) {
            const status = getIndexingStatus(result?.verdict);
            await sql`
              UPDATE project_indexing_urls
              SET status = ${status},
                  verdict = ${result?.verdict ?? null},
                  coverage_state = ${result?.coverageState ?? null},
                  robots_txt_state = ${result?.robotsTxtState ?? null},
                  indexing_state = ${result?.indexingState ?? null},
                  page_fetch_state = ${result?.pageFetchState ?? null},
                  google_canonical = ${result?.googleCanonical ?? null},
                  user_canonical = ${result?.userCanonical ?? null},
                  last_crawl_time = ${result?.lastCrawlTime ?? null},
                  inspected_at = NOW(),
                  next_inspection_at = CASE
                    WHEN ${status} = 'indexed' AND impressions >= 100
                      THEN NOW() + (${INDEXED_HOT_RECHECK_DAYS} * INTERVAL '1 day')
                    WHEN ${status} = 'indexed'
                      THEN NOW() + (${INDEXED_RECHECK_DAYS} * INTERVAL '1 day')
                    WHEN ${status} = 'not_indexed'
                      THEN NOW() + (${NOT_INDEXED_RECHECK_DAYS} * INTERVAL '1 day')
                    ELSE NOW() + INTERVAL '24 hours'
                  END,
                  inspection_attempts = 0,
                  inspection_error = NULL
              WHERE user_id = ${projectId}::uuid AND url = ${url}
            `;
}
