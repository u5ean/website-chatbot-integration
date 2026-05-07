import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';
import https from 'https';

export interface CrawledPage {
  url: string;
  title: string;
  content: string;
}

const httpsAgent = new https.Agent({
  rejectUnauthorized: false, // Help with some SSL issues in local dev
});

export async function crawlWebsite(baseUrl: string, maxPages: number = 50): Promise<CrawledPage[]> {
  const visited = new Set<string>();
  const queue: string[] = [baseUrl];
  const results: CrawledPage[] = [];
  const domain = new URL(baseUrl).hostname;

  while (queue.length > 0 && results.length < maxPages) {
    const url = queue.shift()!;
    if (visited.has(url)) continue;
    visited.add(url);

    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
        timeout: 30000, // Increased to 30s
        maxRedirects: 5,
        httpsAgent: httpsAgent,
        validateStatus: (status) => status >= 200 && status < 300,
      });

      const $ = cheerio.load(response.data);
      
      // Remove script tags, style tags, and other non-content elements
      $('script, style, nav, footer, iframe, noscript').remove();

      const title = $('title').text().trim();
      const content = $('body').text().replace(/\s+/g, ' ').trim();

      results.push({ url, title, content });

      // Find internal links
      $('a[href]').each((_, element) => {
        const href = $(element).attr('href');
        if (!href) return;

        try {
          const absoluteUrl = new URL(href, url);
          absoluteUrl.hash = ''; // Remove hash
          
          if (
            absoluteUrl.hostname === domain &&
            !visited.has(absoluteUrl.toString()) &&
            !queue.includes(absoluteUrl.toString()) &&
            (absoluteUrl.pathname.endsWith('/') || 
             absoluteUrl.pathname.match(/\.(html|php|asp|aspx)$/) || 
             !absoluteUrl.pathname.includes('.'))
          ) {
            queue.push(absoluteUrl.toString());
          }
        } catch (e) {
          // Invalid URL
        }
      });
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
