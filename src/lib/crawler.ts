import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';

export interface CrawledPage {
  url: string;
  title: string;
  content: string;
}

type FetchMode = 'direct' | 'playwright' | 'zenrows'

type FetchResult =
  | { ok: true; html: string; finalUrl: string; mode: FetchMode; status: number }
  | { ok: false; error: unknown; mode: FetchMode; status?: number }

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

function extractEmails(text: string) {
  const matches = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  const uniq = Array.from(new Set(matches.map((m) => m.trim().toLowerCase())));
  return uniq.slice(0, 8);
}

function extractTelPhonesFromAnchors($: cheerio.CheerioAPI) {
  const phones = new Set<string>();
  $('a[href^="tel:"]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    const raw = href.replace(/^tel:/i, '').trim();
    const normalized = raw.replace(/[^\d+]/g, '');
    if (normalized.length >= 7) phones.add(raw);
  });
  return Array.from(phones).slice(0, 8);
}

function extractMailtoEmailsFromAnchors($: cheerio.CheerioAPI) {
  const emails = new Set<string>();
  $('a[href^="mailto:"]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    const raw = href.replace(/^mailto:/i, '').split('?')[0]?.trim() ?? '';
    if (raw) emails.add(raw.toLowerCase());
  });
  return Array.from(emails).slice(0, 8);
}

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

function estimateBodyTextLength(html: string) {
  try {
    const $ = cheerio.load(html);
    $('script, style, noscript').remove();
    const text = $('body').text().replace(/\s+/g, ' ').trim();
    return text.length;
  } catch {
    return 0;
  }
}

function shouldEscalateToPlaywright(res: { status?: number; html?: string }) {
  if (res.status && [401, 403, 406, 409, 423, 429, 451, 503].includes(res.status)) return true;
  if (res.html && (res.html.trim().length < 800 || isProbablyBotBlock(res.html))) return true;
  if (res.html && estimateBodyTextLength(res.html) < 220) return true;
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
    return { ok: true, html, finalUrl: response.request?.res?.responseUrl ?? url, mode: 'direct', status: response.status };
  } catch (error: unknown) {
    const status =
      typeof error === 'object' && error !== null
        ? (error as { response?: { status?: number } }).response?.status
        : undefined;
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
      try {
        await page.waitForLoadState('networkidle', { timeout: 15000 });
      } catch {
      }
      await page.waitForTimeout(1500);
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

    return { ok: false, error: new Error(`ZenRows returned status ${response.status}`), mode: 'zenrows', status: response.status };
  } catch (error: unknown) {
    const status =
      typeof error === 'object' && error !== null
        ? (error as { response?: { status?: number } }).response?.status
        : undefined;
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
  if (rendered.ok && rendered.html.trim().length >= 800 && !isProbablyBotBlock(rendered.html)) return rendered;

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
      inStar = value === '*' ? true : false;
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
    if (res.status >= 200 && res.status < 300 && typeof res.data === 'string') return parseRobotsTxt(res.data);
    return { disallow: [] };
  } catch {
    return { disallow: [] };
  }
}

export async function crawlWebsite(baseUrl: string, maxPages: number = 50): Promise<CrawledPage[]> {
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
        }
      });

      const structured: string[] = [];
      $('script[type="application/ld+json"]').each((_, el) => {
        const raw = $(el).text();
        if (raw && raw.trim()) structured.push(raw.trim());
      });

      const metaPrice = $('meta[property="product:price:amount"], meta[name="product:price:amount"], meta[property="og:price:amount"], meta[name="og:price:amount"]')
        .map((_, el) => $(el).attr('content'))
        .get()
        .map((v) => (typeof v === 'string' ? v.trim() : ''))
        .filter(Boolean);
      if (metaPrice.length) structured.push(`price: ${metaPrice.slice(0, 8).join(', ')}`);

      const $raw = cheerio.load(fetched.html);
      $raw('script, style, iframe, noscript').remove();
      const navText = normalizeWhitespace($raw('nav').text());
      const footerText = normalizeWhitespace($raw('footer').text());
      const rawBodyText = normalizeWhitespace($raw('body').text());
      const emails = Array.from(new Set([...extractMailtoEmailsFromAnchors($raw), ...extractEmails(rawBodyText)])).slice(0, 8);
      const phones = extractTelPhonesFromAnchors($raw);

      const $content = cheerio.load(fetched.html);
      $content('script, style, nav, footer, iframe, noscript').remove();

      const title = $content('title').text().trim();
      const bodyText = normalizeWhitespace($content('body').text());
      const structuredText = structured.length ? `\n\n${structured.join('\n')}` : '';

      const extraBlocks: string[] = [];
      const navWorthKeeping =
        navText &&
        (/\b(contact|consultation|book|schedule|call|email|phone)\b/i.test(navText) || navText.length <= 220);
      if (navWorthKeeping) extraBlocks.push(`Navigation: ${navText.slice(0, 600)}`);

      const footerWorthKeeping =
        footerText &&
        /\b(contact|consultation|book|schedule|call|email|phone|address)\b/i.test(footerText);
      if (footerWorthKeeping) extraBlocks.push(`Footer: ${footerText.slice(0, 800)}`);

      if (emails.length) extraBlocks.push(`Emails: ${emails.join(', ')}`);
      if (phones.length) extraBlocks.push(`Phones: ${phones.join(', ')}`);

      const extrasText = extraBlocks.length ? `\n\n${extraBlocks.join('\n')}` : '';
      const content = `${bodyText}${structuredText}${extrasText}`.trim();

      results.push({ url: fetched.finalUrl, title, content });
    } catch (error) {
      console.error(`Error crawling ${url}:`, error);
    }
  }

  return results;
}

export function chunkText(text: string, chunkSize: number = 500): string[] {
  const chunks: string[] = [];
  const words = text.split(' ');
  let currentChunk: string[] = [];
  let currentLength = 0;

  for (const word of words) {
    if (currentLength + word.length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
      currentChunk = [];
      currentLength = 0;
    }
    currentChunk.push(word);
    currentLength += word.length + 1;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '));
  }

  return chunks;
}
