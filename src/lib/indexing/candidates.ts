import { sql } from '@vercel/postgres';

export async function getInspectionCandidates(projectId: string, maxInspections: number) {
    const { rows: candidates } = await sql<{ url: string; due_total: number }>`
      SELECT url, COUNT(*) OVER()::int AS due_total
      FROM project_indexing_urls
      WHERE user_id = ${projectId}::uuid
        AND is_in_sitemap = TRUE
        AND (
          inspected_at IS NULL
          OR next_inspection_at IS NULL
          OR next_inspection_at <= NOW()
          OR status = 'pending'
        )
      ORDER BY
        CASE
          WHEN inspected_at IS NULL THEN 0
          WHEN status = 'pending' THEN 1
          WHEN status = 'error' THEN 2
          WHEN status = 'not_indexed' THEN 3
          ELSE 4
        END,
        impressions DESC,
        next_inspection_at ASC NULLS FIRST,
        inspected_at ASC NULLS FIRST
      LIMIT ${maxInspections}
    `;
    return candidates;
}
