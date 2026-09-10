import assert from 'node:assert/strict';
import test from 'node:test';
import { readSitemapTree, createSitemapFingerprint, propertyAllowsUrl, getTechnicalUrlReason } from '../../src/lib/indexing/sitemap.ts';

test('reads nested sitemap indexes, deduplicates URLs and preserves lastmod', async (t) => {
  const documents: Record<string, string> = {
    'https://example.com/sitemap.xml': '<sitemapindex><sitemap><loc>https://example.com/posts.xml</loc></sitemap><sitemap><loc>https://example.com/pages.xml</loc></sitemap></sitemapindex>',
    'https://example.com/posts.xml': '<urlset><url><loc>https://example.com/article/</loc><lastmod>2026-09-01</lastmod></url></urlset>',
    'https://example.com/pages.xml': '<urlset><url><loc>https://example.com/article/</loc><lastmod>2026-09-01</lastmod></url><url><loc>https://example.com/contact/</loc></url></urlset>',
  };
  const calls: string[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    calls.push(url);
    assert.ok(documents[url]);
    return new Response(documents[url], { status: 200 });
  });
  const entries = await readSitemapTree('https://example.com/sitemap.xml', Date.now() + 60_000);
  assert.equal(calls.length, 3);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].lastmod, '2026-09-01T00:00:00.000Z');
  assert.equal(entries[1].lastmod, null);
  assert.equal(createSitemapFingerprint(entries), createSitemapFingerprint([...entries].reverse()));
});

test('retains property boundaries and technical URL classification', () => {
  assert.equal(propertyAllowsUrl('sc-domain:example.com', 'https://blog.example.com/a'), true);
  assert.equal(propertyAllowsUrl('sc-domain:example.com', 'https://other-example.com/a'), false);
  assert.equal(getTechnicalUrlReason('https://example.com/article/feed/'), 'RSS-/Atom-Feed');
  assert.equal(getTechnicalUrlReason('https://example.com/article/'), null);
});

test('does not fetch a local sitemap and propagates a failed source', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => new Response('', { status: 503 }));
  await assert.rejects(readSitemapTree('http://127.0.0.1/sitemap.xml', Date.now() + 60_000));
  assert.equal(fetch.mock.callCount(), 0);
  await assert.rejects(readSitemapTree('https://example.com/sitemap.xml', Date.now() + 60_000), /503/);
});
