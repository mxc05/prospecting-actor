/**
 * Extracts a clean Instagram username from a URL or raw string.
 */
export function extractInstagramUsername(urlOrUsername: string): string {
  if (!urlOrUsername) return '';
  
  let cleaned = urlOrUsername.trim().toLowerCase();
  
  // Remove protocol and domain if present
  cleaned = cleaned.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '');
  
  // Remove trailing slashes and query params
  cleaned = cleaned.split('/')[0].split('?')[0].split('#')[0];
  
  // Remove leading @
  cleaned = cleaned.replace(/^@/, '');
  
  return cleaned;
}

/**
 * Normalizes an Instagram profile URL to standard canonical format.
 */
export function normalizeInstagramUrl(usernameOrUrl: string): string {
  const username = extractInstagramUsername(usernameOrUrl);
  return username ? `https://instagram.com/${username}` : '';
}

/**
 * Extracts public emails from text (bio, website text).
 */
export function extractPublicEmail(text: string): string {
  if (!text) return '';
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i);
  return emailMatch ? emailMatch[0].toLowerCase() : '';
}

/**
 * Safely parses follower strings (e.g. "12.4k", "1M", "1,200") into numeric numbers.
 */
export function parseFollowerCount(val: string | number): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : Math.round(val);
  if (!val) return 0;

  const str = String(val).trim().toUpperCase().replace(/,/g, '');
  
  if (str.endsWith('K')) {
    return Math.round(parseFloat(str.replace('K', '')) * 1000);
  }
  if (str.endsWith('M')) {
    return Math.round(parseFloat(str.replace('M', '')) * 1000000);
  }
  if (str.endsWith('B')) {
    return Math.round(parseFloat(str.replace('B', '')) * 1000000000);
  }

  const num = parseInt(str, 10);
  return isNaN(num) ? 0 : num;
}
