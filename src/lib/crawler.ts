import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';

export interface CrawledPage {
  url: string;
  title: string;
  content: string;
}

export interface ContentChunk {
  content: string;
  metadata: {
    sourceUrl: string;
    pageTitle: string;
    chunkIndex: number;
  };
}

type FetchMode = 'direct' | 'playwright' | 'zenrows';

type FetchResult =
  | { ok: true; html: string; finalUrl: string; mode: FetchMode; status: number }
  | { ok: false; error: unknown; mode: FetchMode; status?: number };

function normalizeUrl(input: string) {
  const u = new URL(input);
  u.hash = '';
  u.search = '';
  return u.toString();
}

function isProbablyBotBlock(html: string) {
  const h = html.toLowerCase();
  return (
    h.includes('cloudflare') ||
    h.includes('attention required') ||
    h.includes('just a moment') ||
    h.includes('verify you are human') ||
    h.includes('captcha') ||
    h.includes('access denied') ||
    h.includes('request blocked')
  );
}

function shouldEscalateToPlaywright(res: { status?: number; html?: string }) {
  if (res.status && [401, 403, 406, 409, 423, 429, 451, 503].includes(res.status)) return true;
  if (res.html && (res.html.trim().length < 800 || isProbablyBotBlock(res.html))) return true;
  return false;
}

async function fetchHtmlDirect(url: string): Promise<FetchResult> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 30000,
      maxRedirects: 5,
      validateStatus: () => true,
    });

    const html = typeof response.data === 'string' ? response.data : String(response.data ?? '');
    return {
      ok: true,
      html,
      finalUrl: response.request?.res?.responseUrl ?? url,
      mode: 'direct',
      status: response.status,
    };
  } catch (error: any) {
    const status = error?.response?.status;
    return { ok: false, error, mode: 'direct', status };
  }
}

async function fetchHtmlPlaywright(url: string): Promise<FetchResult> {
  try {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(1000);
      const html = await page.content();
      const finalUrl = page.url();
      return { ok: true, html, finalUrl, mode: 'playwright', status: 200 };
    } finally {
      await browser.close();
    }
  } catch (error) {
    return { ok: false, error, mode: 'playwright' };
  }
}

async function fetchHtmlZenrows(url: string): Promise<FetchResult> {
  const apiKey = process.env.ZENROWS_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error: new Error('Missing ZENROWS_API_KEY environment variable'),
      mode: 'zenrows',
    };
  }

  try {
    const endpoint = new URL('https://api.zenrows.com/v1/');
    endpoint.searchParams.set('apikey', apiKey);
    endpoint.searchParams.set('url', url);
    endpoint.searchParams.set('mode', 'auto');

    const response = await axios.get(endpoint.toString(), {
      timeout: 60000,
      maxRedirects: 5,
      validateStatus: () => true,
    });

    const html = typeof response.data === 'string' ? response.data : String(response.data ?? '');
    if (response.status >= 200 && response.status < 300) {
      return { ok: true, html, finalUrl: url, mode: 'zenrows', status: response.status };
    }

    return {
      ok: false,
      error: new Error(`ZenRows returned status ${response.status}`),
      mode: 'zenrows',
      status: response.status,
    };
  } catch (error: any) {
    const status = error?.response?.status;
    return { ok: false, error, mode: 'zenrows', status };
  }
}

async function fetchHtmlWithFallback(url: string): Promise<FetchResult> {
  const direct = await fetchHtmlDirect(url);
  if (direct.ok) {
    if (!shouldEscalateToPlaywright({ status: direct.status, html: direct.html })) return direct;
  } else {
    if (!shouldEscalateToPlaywright({ status: direct.status })) return direct;
  }

  const rendered = await fetchHtmlPlaywright(url);
  if (rendered.ok && rendered.html.trim().length >= 800 && !isProbablyBotBlock(rendered.html))
    return rendered;

  const zen = await fetchHtmlZenrows(url);
  if (zen.ok) return zen;

  return rendered.ok ? rendered : direct.ok ? direct : zen;
}

type RobotsRules = { disallow: string[] };

function parseRobotsTxt(txt: string): RobotsRules {
  const lines = txt.split(/\r?\n/);
  let inStar = false;
  const disallow: string[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (key === 'user-agent') {
      inStar = value === '*';
      continue;
    }

    if (inStar && key === 'disallow') {
      if (value) disallow.push(value);
    }
  }

  return { disallow };
}

function isAllowedByRobots(url: URL, rules: RobotsRules) {
  const path = url.pathname || '/';
  for (const rule of rules.disallow) {
    if (rule === '/') return false;
    if (rule && path.startsWith(rule)) return false;
  }
  return true;
}

async function getRobotsRules(baseUrl: URL): Promise<RobotsRules> {
  const robotsUrl = new URL('/robots.txt', baseUrl.origin).toString();
  try {
    const res = await axios.get(robotsUrl, { timeout: 15000, validateStatus: () => true });
    if (res.status >= 200 && res.status < 300 && typeof res.data === 'string')
      return parseRobotsTxt(res.data);
    return { disallow: [] };
  } catch {
    return { disallow: [] };
  }
}

// ── IMPROVED: noise removal + smart content targeting ──────────────────────
function extractCleanContent($: cheerio.CheerioAPI): string {
  // Remove all noise elements
  $(
    [
      'script', 'style', 'nav', 'footer', 'header', 'iframe', 'noscript',
      '[class*="cookie"]', '[id*="cookie"]',
      '[class*="banner"]', '[id*="banner"]',
      '[class*="sidebar"]', '[id*="sidebar"]',
      '[class*="popup"]',  '[id*="popup"]',
      '[class*="modal"]',  '[id*="modal"]',
      '[class*="advertisement"]', '[class*=" ad-"]', '[id*=" ad-"]',
      '[class*="widget"]',
      '[class*="newsletter"]', '[id*="newsletter"]',
      '[class*="subscribe"]',
      '[role="complementary"]',
      '[aria-label="Advertisement"]',
    ].join(', ')
  ).remove();

  // Target meaningful content in priority order
  const selectors = [
    'main',
    'article',
    '[role="main"]',
    '.content',
    '#content',
    '.main-content',
    '#main-content',
    '.page-content',
    '#page-content',
    'body',
  ];

  for (const selector of selectors) {
    const el = $(selector).first();
    if (el.length) {
      const text = el.text().replace(/\s+/g, ' ').trim();
      if (text.length >= 200) return text;
    }
  }

  return '';
}

// ── IMPROVED: paragraph-aware chunking with overlap ────────────────────────
export function chunkText(
  text: string,
  pageTitle: string,
  sourceUrl: string,
  chunkSize: number = 500,
  overlapWords: number = 50
): ContentChunk[] {
  // Split into paragraphs first
  const paragraphs = text
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  // Further split long paragraphs by sentence
  const segments: string[] = [];
  for (const para of paragraphs) {
    if (para.split(' ').length <= chunkSize) {
      segments.push(para);
    } else {
      const sentences = para.match(/[^.!?]+[.!?]+/g) ?? [para];
      segments.push(...sentences.map(s => s.trim()).filter(Boolean));
    }
  }

  // Combine segments into chunks of ~chunkSize words, with overlap
  const chunks: ContentChunk[] = [];
  let currentWords: string[] = [];
  let chunkIndex = 0;

  const flushChunk = (overlapFromPrev: string[] = []) => {
    if (currentWords.length === 0) return;
    const content = [...overlapFromPrev, ...currentWords].join(' ').trim();
    if (content.length >= 100) {
      chunks.push({
        content,
        metadata: { sourceUrl, pageTitle, chunkIndex },
      });
      chunkIndex++;
    }
  };

  for (const segment of segments) {
    const words = segment.split(' ');
    if (currentWords.length + words.length > chunkSize && currentWords.length > 0) {
      const overlap = currentWords.slice(-overlapWords);
      flushChunk();
      currentWords = [...overlap, ...words];
    } else {
      currentWords.push(...words);
    }
  }

  flushChunk();
  return chunks;
}

// ── MAIN CRAWL ─────────────────────────────────────────────────────────────
export async function crawlWebsite(
  baseUrl: string,
  maxPages: number = 50
): Promise<CrawledPage[]> {
  const base = new URL(baseUrl);
  const robots = await getRobotsRules(base);
  const visited = new Set<string>();
  const queue: string[] = [normalizeUrl(baseUrl)];
  const results: CrawledPage[] = [];
  const domain = base.hostname;

  while (queue.length > 0 && results.length < maxPages) {
    const url = queue.shift()!;
    if (visited.has(url)) continue;
    visited.add(url);

    try {
      const current = new URL(url);
      if (current.hostname === domain && !isAllowedByRobots(current, robots)) continue;

      const fetched = await fetchHtmlWithFallback(url);
      if (!fetched.ok) continue;

      const $ = cheerio.load(fetched.html);
      const title = $('title').text().trim();
      const content = extractCleanContent($);

      // Skip pages with too little meaningful content
      if (content.length < 200) continue;

      results.push({ url: fetched.finalUrl, title, content });

      $('a[href]').each((_, element) => {
        const href = $(element).attr('href');
        if (!href) return;

        try {
          const absoluteUrl = new URL(href, fetched.finalUrl);
          absoluteUrl.hash = '';
          absoluteUrl.search = '';

          if (
            absoluteUrl.hostname === domain &&
            isAllowedByRobots(absoluteUrl, robots) &&
            !visited.has(absoluteUrl.toString()) &&
            !queue.includes(absoluteUrl.toString()) &&
            (absoluteUrl.pathname.endsWith('/') ||
              absoluteUrl.pathname.match(/\.(html|php|asp|aspx)$/) ||
              !absoluteUrl.pathname.includes('.'))
          ) {
            queue.push(absoluteUrl.toString());
          }
        } catch {
          // ignore invalid URLs
        }
      });
    } catch (error) {
      console.error(`Error crawling ${url}:`, error);
    }
  }

  return results;
}

// ── HELPER: crawl + chunk in one call ─────────────────────────────────────
export async function crawlAndChunk(
  baseUrl: string,
  maxPages: number = 50
): Promise<ContentChunk[]> {
  const pages = await crawlWebsite(baseUrl, maxPages);
  const allChunks: ContentChunk[] = [];

  for (const page of pages) {
    const chunks = chunkText(page.content, page.title, page.url);
    allChunks.push(...chunks);
  }

  return allChunks;
}