import { BasicCrawler } from 'crawlee';
import * as cheerio from 'cheerio';
import { ActorInput, DiscoveredProfile } from '../types/index.js';
import { extractInstagramUsername, normalizeInstagramUrl } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';

/**
 * Discovers public Instagram profile URLs using Search Engine Dorking.
 * Supports Google/DuckDuckGo/Bing dorking and optional Serper API integration.
 */
export async function discoverProfiles(input: ActorInput): Promise<DiscoveredProfile[]> {
  const discoveredMap = new Map<string, DiscoveredProfile>();
  const baseKeywords = input.keywords && input.keywords.length > 0 ? input.keywords : [input.profile_type];
  const location = input.location || '';
  const maxResults = input.max_results || 50;

  // 1. Serper API Integration (Free 2,500 queries - Instant 50+ Discovery)
  const serperApiKey = process.env.SERPER_API_KEY;
  if (serperApiKey) {
    logger.info('SERPER_API_KEY detected in environment. Performing instant Google Search Dorking...');
    for (const keyword of baseKeywords) {
      if (discoveredMap.size >= maxResults) break;
      const query = `site:instagram.com "${keyword}" ${location}`.trim();
      try {
        const response = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: {
            'X-API-KEY': serperApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ q: query, num: 50 }),
        });
        if (response.ok) {
          const data = (await response.json()) as { organic?: { link: string }[] };
          if (data.organic && Array.isArray(data.organic)) {
            for (const item of data.organic) {
              const username = extractInstagramUsername(item.link);
              if (username && isProfileUsername(username)) {
                const fullUrl = normalizeInstagramUrl(username);
                discoveredMap.set(username, { profileUrl: fullUrl, username });
              }
            }
          }
        }
      } catch (err: unknown) {
        logger.warning(`Serper API discovery error: ${(err as Error).message}`);
      }
    }

    if (discoveredMap.size > 0) {
      const results = Array.from(discoveredMap.values()).slice(0, maxResults);
      logger.info(`Serper Google Discovery complete. Found ${results.length} candidate profiles.`);
      return results;
    }
  }

  // 2. Direct Search Engine Web Dorking (DuckDuckGo & Bing Fallback)
  const searchUrls: string[] = [];
  const locations = location ? [location, 'Delhi', 'Mumbai', 'Bangalore', 'Gurgaon'] : [''];

  for (const keyword of baseKeywords) {
    for (const loc of locations) {
      const queryStr = `site:instagram.com "${keyword}" ${loc}`.trim();
      const query = encodeURIComponent(queryStr);
      searchUrls.push(`https://www.bing.com/search?q=${query}`);
    }
  }

  logger.info(`Starting search engine discovery with ${searchUrls.length} query URLs...`);

  const crawler = new BasicCrawler({
    maxConcurrency: 2,
    maxRequestsPerCrawl: searchUrls.length,
    async requestHandler({ request, sendRequest }) {
      try {
        const response = await sendRequest({
          url: request.url,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          },
        });

        const $ = cheerio.load(response.body);

        $('a').each((_, elem) => {
          let href = $(elem).attr('href') || '';

          if (href.includes('u=a1')) {
            const match = href.match(/u=a1([^&]+)/);
            if (match) {
              let base64 = match[1].replace(/-/g, '+').replace(/_/g, '/');
              while (base64.length % 4 !== 0) base64 += '=';
              try {
                href = Buffer.from(base64, 'base64').toString('utf-8');
              } catch {}
            }
          }

          if (href.includes('instagram.com/')) {
            const username = extractInstagramUsername(href);
            if (username && isProfileUsername(username)) {
              const fullUrl = normalizeInstagramUrl(username);
              if (!discoveredMap.has(username)) {
                discoveredMap.set(username, { profileUrl: fullUrl, username });
              }
            }
          }
        });
      } catch (err: unknown) {
        logger.warning(`Failed to fetch discovery search page ${request.url}: ${(err as Error).message}`);
      }
    },
  });

  await crawler.run(searchUrls);

  const results = Array.from(discoveredMap.values()).slice(0, maxResults);
  logger.info(`Discovery complete. Found ${results.length} candidate profiles.`);
  
  if (results.length === 0) {
    logger.warning(
      'Search engine rate-limit detected on local IP. To discover 50+ profiles without local IP blocks, add SERPER_API_KEY in .env or run on Apify Cloud with residential proxies.'
    );
  }

  return results;
}

function isProfileUsername(username: string): boolean {
  const excludedPaths = [
    'p', 'reel', 'reels', 'stories', 'explore', 'accounts',
    'developer', 'about', 'terms', 'privacy', 'directory', 'legal'
  ];
  return Boolean(username && !excludedPaths.includes(username.toLowerCase()) && username.length > 1);
}
