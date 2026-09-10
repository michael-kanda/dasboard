import type { ProjectConfig, SitemapEntry } from './types';
import { getRequestTimeout } from './request-budget.ts';
import { load } from 'cheerio';
import { createHash } from 'crypto';

function normalizeDomain(value: string) {
  return value.toLowerCase().replace(/^www\./, '');
}

export function propertyAllowsUrl(siteUrl: string, candidate: string) {
  try {
    const candidateUrl = new URL(candidate);
    if (siteUrl.startsWith('sc-domain:')) {
      const propertyDomain = normalizeDomain(siteUrl.slice('sc-domain:'.length).trim());
      const hostname = normalizeDomain(candidateUrl.hostname);
      return hostname === propertyDomain || hostname.endsWith(`.${propertyDomain}`);
    }
    return candidateUrl.href.startsWith(new URL(siteUrl).href);
  } catch {
    return false;
  }
}

export function defaultSitemapUrl(config: ProjectConfig) {
  const configured = config.sitemap_url?.trim();
  if (configured) return configured;
  if (config.gsc_site_url?.startsWith('http')) {
    return new URL('/sitemap.xml', config.gsc_site_url).href;
  }
  if (config.domain) {
    const domain = config.domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    return `https://${domain}/sitemap.xml`;
  }
  return null;
}

function getProjectOrigin(config: ProjectConfig) {
  try {
    if (config.gsc_site_url?.startsWith('http')) {
      return new URL(config.gsc_site_url).origin;
    }
    if (config.gsc_site_url?.startsWith('sc-domain:')) {
      return `https://${config.gsc_site_url.slice('sc-domain:'.length).trim()}`;
    }
    if (config.domain) {
      const domain = config.domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      return `https://${domain}`;
    }
  } catch {
    return null;
  }
  return null;
}

export function getTechnicalUrlReason(value: string): string | null {
  try {
    const parsed = new URL(value);
    const pathname = parsed.pathname.toLowerCase().replace(/\/{2,}/g, '/');
    if (parsed.searchParams.has('feed')) return 'RSS-/Atom-Feed';
    if (parsed.searchParams.has('replytocom')) return 'Technische Kommentar-URL';
    if (/\/comments\/feed(?:\/(?:atom|rdf|rss|rss2))?\/?$/.test(pathname)) {
      return 'Kommentar-Feed';
    }
    if (/\/feed(?:\/(?:atom|rdf|rss|rss2))?\/?$/.test(pathname)) {
      return 'RSS-/Atom-Feed';
    }
    if (/\/trackback\/?$/.test(pathname)) return 'Trackback-URL';
    if (pathname === '/xmlrpc.php') return 'WordPress-Systemendpunkt';
    if (pathname === '/wp-json' || pathname.startsWith('/wp-json/')) {
      return 'WordPress-API-Endpunkt';
    }
    return null;
  } catch {
    return 'Ungültige URL';
  }
}

function assertSafeSitemapUrl(value: string, expectedHost?: string) {
  const parsed = new URL(value);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Die Sitemap muss über HTTP oder HTTPS erreichbar sein.');
  }
  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname === '0.0.0.0' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^169\.254\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  ) {
    throw new Error('Lokale oder private Sitemap-Adressen sind nicht erlaubt.');
  }
  if (expectedHost && normalizeDomain(hostname) !== normalizeDomain(expectedHost)) {
    throw new Error('Unter-Sitemaps müssen auf derselben Domain liegen.');
  }
  return parsed;
}

async function fetchXml(url: string, deadlineAt: number) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    getRequestTimeout(deadlineAt, 15_000, 10_000),
  );
  try {
    const response = await fetch(url, {
      headers: { 'user-agent': 'DataPeak-IndexMonitor/1.0' },
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error(`Sitemap antwortet mit HTTP ${response.status}.`);
    }
    const text = await response.text();
    if (text.length > 25_000_000) {
      throw new Error('Die Sitemap ist größer als 25 MB.');
    }
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getSitemapCandidates(config: ProjectConfig, deadlineAt: number) {
  const configured = config.sitemap_url?.trim();
  const origin = getProjectOrigin(config);
  if (!origin) return configured ? [assertSafeSitemapUrl(configured).href] : [];
  const originUrl = new URL(origin);
  const candidates = new Set<string>();
  if (configured) {
    candidates.add(assertSafeSitemapUrl(configured, originUrl.hostname).href);
  }

  try {
    const robotsUrl = new URL('/robots.txt', originUrl).href;
    const robots = await fetchXml(robotsUrl, deadlineAt);
    for (const line of robots.split(/\r?\n/)) {
      const match = line.match(/^\s*sitemap\s*:\s*(\S+)\s*$/i);
      if (!match?.[1]) continue;
      try {
        candidates.add(assertSafeSitemapUrl(match[1], originUrl.hostname).href);
      } catch (error) {
        console.warn('[Indexing] Sitemap aus robots.txt übersprungen:', match[1], error);
      }
    }
  } catch (error) {
    console.warn('[Indexing] robots.txt konnte nicht gelesen werden:', error);
  }

  for (const pathname of ['/wp-sitemap.xml', '/sitemap_index.xml', '/sitemap.xml']) {
    candidates.add(new URL(pathname, originUrl).href);
  }
  return [...candidates];
}

export async function readSitemapTree(
  rootUrl: string,
  deadlineAt: number,
  maxUrls = 5_000,
): Promise<SitemapEntry[]> {
  const root = assertSafeSitemapUrl(rootUrl);
  const queue: Array<{ url: string; depth: number }> = [{ url: root.href, depth: 0 }];
  const visited = new Set<string>();
  const entries = new Map<string, SitemapEntry>();

  while (queue.length && entries.size < maxUrls) {
    if (Date.now() + 10_000 >= deadlineAt) {
      throw new Error('Das Zeitbudget für das Lesen der Sitemap ist aufgebraucht.');
    }
    const current = queue.shift()!;
    if (visited.has(current.url) || current.depth > 4) continue;
    visited.add(current.url);

    const xml = await fetchXml(current.url, deadlineAt);
    const $ = load(xml, { xmlMode: true });
    const childSitemaps = $('sitemap > loc').map((_, element) => $(element).text().trim()).get();
    if (childSitemaps.length) {
      for (const child of childSitemaps) {
        try {
          const parsed = assertSafeSitemapUrl(child, root.hostname);
          queue.push({ url: parsed.href, depth: current.depth + 1 });
        } catch (error) {
          console.warn('[Indexing] Unter-Sitemap übersprungen:', child, error);
        }
      }
      continue;
    }

    $('url').each((_, element) => {
      if (entries.size >= maxUrls) return false;
      const url = $(element).find('loc').first().text().trim();
      if (!url) return;
      const lastmodValue = $(element).find('lastmod').first().text().trim();
      entries.set(url, {
        url,
        lastmod: lastmodValue && !Number.isNaN(Date.parse(lastmodValue)) ? new Date(lastmodValue).toISOString() : null,
        source: current.url,
      });
    });
  }
  return [...entries.values()];
}

export function createSitemapFingerprint(entries: SitemapEntry[]) {
  const normalized = entries
    .map((entry) => `${entry.url}|${entry.lastmod ?? ''}`)
    .sort()
    .join('\n');
  return createHash('sha256').update(normalized).digest('hex');
}
