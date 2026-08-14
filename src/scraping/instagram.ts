import * as cheerio from 'cheerio';
import { chromium } from 'playwright';
import { RawProfileData } from '../types/index.js';
import { extractInstagramUsername, extractPublicEmail, normalizeInstagramUrl, parseFollowerCount } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';

/**
 * Scrapes public metadata from an Instagram profile URL.
 * Uses HTTP fetch first, falling back to Playwright headless browser for JavaScript hydration if needed.
 */
export async function scrapeProfile(profileUrl: string, useBrowserFallback = true): Promise<RawProfileData | null> {
  const username = extractInstagramUsername(profileUrl);
  if (!username) {
    logger.warning(`Invalid profile URL provided: ${profileUrl}`);
    return null;
  }

  const normalizedUrl = normalizeInstagramUrl(username);
  let profile: RawProfileData | null = null;

  // 1. Try standard HTTP fetch first
  try {
    const response = await fetch(normalizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (response.ok) {
      const html = await response.text();
      profile = parseProfileHtml(html, username, normalizedUrl);
    }
  } catch (err: unknown) {
    logger.debug(`HTTP fetch failed for ${normalizedUrl}: ${(err as Error).message}`);
  }

  // 2. Fallback: Use Playwright Headless Browser to execute JavaScript locally
  if ((!profile || profile.followers === 0) && useBrowserFallback) {
    logger.info(`Using Playwright headless browser for @${username}...`);
    try {
      const browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        locale: 'en-US',
      });
      const page = await context.newPage();

      await page.goto(normalizedUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(2000); // Allow JS hydration

      const content = await page.content();

      let bioText = '';
      try {
        bioText = await page.locator('header section').innerText();
      } catch {
        bioText = content;
      }

      await browser.close();

      profile = parseProfileHtml(content, username, normalizedUrl);

      // Additional Playwright DOM text parsing
      if (profile.followers === 0 && bioText) {
        const followerMatch = bioText.match(/([0-9.,KMBkmb]+)\s*followers/i);
        if (followerMatch) {
          profile.followers = parseFollowerCount(followerMatch[1]);
        }
      }

      if (!profile.bio && bioText) {
        profile.bio = bioText.split('\n').join(' ').trim();
      }
    } catch (err: unknown) {
      logger.warning(`Playwright browser scraping failed for @${username}: ${(err as Error).message}`);
    }
  }

  if (!profile) {
    profile = createFallbackProfile(username, normalizedUrl);
  }

  // 3. Website / Linktree Email Enrichment (if email missing in bio)
  if (!profile.public_email && profile.website && isValidExternalUrl(profile.website)) {
    const websiteEmail = await fetchEmailFromWebsite(profile.website);
    if (websiteEmail) {
      profile.public_email = websiteEmail;
      logger.info(`Enriched email from external website for @${username}: ${websiteEmail}`);
    }
  }

  return profile;
}

function parseProfileHtml(html: string, username: string, normalizedUrl: string): RawProfileData {
  const $ = cheerio.load(html);

  const ogTitle = $('meta[property="og:title"]').attr('content') || $('title').text() || '';
  const ogDescription = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '';

  let name = username;
  if (ogTitle.includes('(')) {
    name = ogTitle.split('(')[0].trim();
  } else if (ogTitle.includes('•')) {
    name = ogTitle.split('•')[0].trim();
  }

  let followers = 0;
  let bio = ogDescription;

  if (ogDescription.includes('Followers')) {
    const parts = ogDescription.split('-');
    const followerPart = parts[0] || '';
    const followerMatch = followerPart.match(/([0-9.,KMBkmb]+)\s*Followers/i);
    if (followerMatch) {
      followers = parseFollowerCount(followerMatch[1]);
    }
    if (parts.length > 1) {
      bio = parts.slice(1).join('-').trim();
    }
  }

  if (followers === 0) {
    const edgeMatch = html.match(/"edge_followed_by":\s*\{\s*"count":\s*([0-9]+)\}/i);
    if (edgeMatch && edgeMatch[1]) {
      followers = parseInt(edgeMatch[1], 10);
    }
  }

  if (followers === 0) {
    const countMatch = html.match(/"follower_count":\s*([0-9]+)/i);
    if (countMatch && countMatch[1]) {
      followers = parseInt(countMatch[1], 10);
    }
  }

  let website = '';
  const linkMatch = html.match(/"external_url":"([^"]+)"/i);
  if (linkMatch && linkMatch[1]) {
    website = linkMatch[1].replace(/\\/g, '');
  }

  const public_email = extractPublicEmail(html + ' ' + bio);

  return {
    platform: 'instagram',
    name: name || username,
    username,
    profile_url: normalizedUrl,
    bio: bio || ogDescription || '',
    location: '',
    followers,
    website: website || '',
    public_email,
    verified: html.includes('"is_verified":true') || ogTitle.includes('Verified'),
  };
}

/**
 * Fetches an external website (or Linktree/Beacons) linked in bio to extract public email.
 */
async function fetchEmailFromWebsite(websiteUrl: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(websiteUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) return '';

    const text = await res.text();
    const $ = cheerio.load(text);

    // Look for mailto: links
    let email = '';
    $('a[href^="mailto:"]').each((_, elem) => {
      const href = $(elem).attr('href') || '';
      const mail = href.replace(/^mailto:/i, '').split('?')[0].trim();
      if (mail && !email) {
        email = mail;
      }
    });

    if (!email) {
      email = extractPublicEmail(text);
    }

    return email;
  } catch {
    return '';
  }
}

function isValidExternalUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  return url.startsWith('http://') || url.startsWith('https://');
}

function createFallbackProfile(username: string, normalizedUrl: string): RawProfileData {
  return {
    platform: 'instagram',
    name: username,
    username,
    profile_url: normalizedUrl,
    bio: '',
    location: '',
    followers: 0,
    website: '',
    public_email: '',
    verified: false,
  };
}
