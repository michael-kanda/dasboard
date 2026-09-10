import { sql } from '@vercel/postgres';
import { isBroadSitemapLastmodRefresh } from '@/lib/indexing-status-policy';
import { INDEXED_HOT_RECHECK_DAYS, INDEXED_RECHECK_DAYS, NOT_INDEXED_RECHECK_DAYS } from '@/lib/indexing-status-constants';
import type { SitemapEntry } from './types';

export async function persistSitemapEntries(projectId: string, entries: SitemapEntry[], performance: Map<string, { clicks: number; impressions: number; ctr: number; position: number }>) {
    const { rows: storedSitemapRows } = await sql<{
      url: string;
      sitemap_lastmod: string | null;
    }>`
      SELECT url, sitemap_lastmod
      FROM project_indexing_urls
      WHERE user_id = ${projectId}::uuid AND is_in_sitemap = TRUE
    `;
    const storedLastmods = new Map(storedSitemapRows.map((row) => [
      row.url,
      row.sitemap_lastmod ? new Date(row.sitemap_lastmod).getTime() : null,
    ]));
    const existingEntries = entries.filter((entry) => storedLastmods.has(entry.url));
    const changedExistingEntries = existingEntries.filter((entry) => {
      const stored = storedLastmods.get(entry.url) ?? null;
      const incoming = entry.lastmod ? new Date(entry.lastmod).getTime() : null;
      return stored !== incoming;
    });
    const broadLastmodRefresh = isBroadSitemapLastmodRefresh(
      existingEntries.length,
      changedExistingEntries.length,
    );
    const sitemapPayload = entries.map((entry) => {
      const metrics = performance.get(entry.url);
      const stored = storedLastmods.get(entry.url) ?? null;
      const incoming = entry.lastmod ? new Date(entry.lastmod).getTime() : null;
      return {
        url: entry.url,
        source: entry.source,
        lastmod: entry.lastmod,
        prioritizeChange: storedLastmods.has(entry.url) && stored !== incoming && !broadLastmodRefresh,
        clicks: metrics?.clicks ?? 0,
        impressions: metrics?.impressions ?? 0,
        ctr: metrics?.ctr ?? 0,
        position: metrics?.position ?? null,
      };
    });

    await sql`
      INSERT INTO project_indexing_urls (
        user_id, url, source_sitemap, sitemap_lastmod, is_in_sitemap, last_seen_at,
        clicks, impressions, ctr, position, next_inspection_at, change_detected_at
      )
      SELECT
        ${projectId}::uuid, incoming.url, incoming.source, incoming.lastmod, TRUE, NOW(),
        incoming.clicks, incoming.impressions, incoming.ctr, incoming.position, NOW(),
        CASE WHEN incoming."prioritizeChange" THEN NOW() ELSE NULL END
      FROM jsonb_to_recordset(${JSON.stringify(sitemapPayload)}::jsonb) AS incoming(
        url TEXT,
        source TEXT,
        lastmod TIMESTAMPTZ,
        clicks DOUBLE PRECISION,
        impressions DOUBLE PRECISION,
        ctr DOUBLE PRECISION,
        position DOUBLE PRECISION,
        "prioritizeChange" BOOLEAN
      )
      ON CONFLICT (user_id, url) DO UPDATE SET
        source_sitemap = EXCLUDED.source_sitemap,
        is_in_sitemap = TRUE,
        last_seen_at = NOW(),
        clicks = EXCLUDED.clicks,
        impressions = EXCLUDED.impressions,
        ctr = EXCLUDED.ctr,
        position = EXCLUDED.position,
        status = CASE
          WHEN project_indexing_urls.is_in_sitemap = FALSE THEN 'pending'
          ELSE project_indexing_urls.status
        END,
        change_detected_at = CASE
          WHEN project_indexing_urls.is_in_sitemap = FALSE
            OR EXCLUDED.change_detected_at IS NOT NULL
            THEN NOW()
          ELSE project_indexing_urls.change_detected_at
        END,
        next_inspection_at = CASE
          WHEN project_indexing_urls.is_in_sitemap = FALSE
            OR EXCLUDED.change_detected_at IS NOT NULL
            THEN NOW()
          ELSE project_indexing_urls.next_inspection_at
        END,
        sitemap_lastmod = EXCLUDED.sitemap_lastmod
      WHERE
        project_indexing_urls.is_in_sitemap = FALSE
        OR project_indexing_urls.source_sitemap IS DISTINCT FROM EXCLUDED.source_sitemap
        OR project_indexing_urls.sitemap_lastmod IS DISTINCT FROM EXCLUDED.sitemap_lastmod
        OR project_indexing_urls.clicks IS DISTINCT FROM EXCLUDED.clicks
        OR project_indexing_urls.impressions IS DISTINCT FROM EXCLUDED.impressions
        OR project_indexing_urls.ctr IS DISTINCT FROM EXCLUDED.ctr
        OR project_indexing_urls.position IS DISTINCT FROM EXCLUDED.position
    `;
    await sql`
      UPDATE project_indexing_urls
      SET status = CASE
            WHEN verdict = 'PASS' THEN 'indexed'
            WHEN verdict IN ('FAIL', 'NEUTRAL') THEN 'not_indexed'
            ELSE status
          END,
          next_inspection_at = CASE
            WHEN verdict = 'PASS' AND impressions >= 100
              THEN inspected_at + (${INDEXED_HOT_RECHECK_DAYS} * INTERVAL '1 day')
            WHEN verdict = 'PASS'
              THEN inspected_at + (${INDEXED_RECHECK_DAYS} * INTERVAL '1 day')
            WHEN verdict IN ('FAIL', 'NEUTRAL')
              THEN inspected_at + (${NOT_INDEXED_RECHECK_DAYS} * INTERVAL '1 day')
            ELSE next_inspection_at
          END,
          change_detected_at = inspected_at
      WHERE user_id = ${projectId}::uuid
        AND is_in_sitemap = TRUE
        AND status IN ('pending', 'error')
        AND inspected_at IS NOT NULL
        AND verdict IN ('PASS', 'FAIL', 'NEUTRAL')
    `;
    await sql`
      UPDATE project_indexing_urls AS stored
      SET is_in_sitemap = FALSE, last_seen_at = NOW()
      WHERE stored.user_id = ${projectId}::uuid
        AND stored.is_in_sitemap = TRUE
        AND NOT EXISTS (
          SELECT 1
          FROM jsonb_to_recordset(${JSON.stringify(sitemapPayload)}::jsonb) AS incoming(url TEXT)
          WHERE incoming.url = stored.url
        )
    `;
}
