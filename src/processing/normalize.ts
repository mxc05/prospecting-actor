import { NormalizedProfileData, RawProfileData } from '../types/index.js';
import { extractInstagramUsername, normalizeInstagramUrl } from '../utils/helpers.js';

export function normalizeProfile(raw: RawProfileData): NormalizedProfileData {
  const username = extractInstagramUsername(raw.username || raw.profile_url);
  const profile_url = normalizeInstagramUrl(username);
  
  return {
    platform: 'instagram',
    name: (raw.name || username).trim(),
    username,
    profile_url,
    bio: (raw.bio || '').replace(/\s+/g, ' ').trim(),
    location: (raw.location || '').trim(),
    followers: Math.max(0, raw.followers || 0),
    website: (raw.website || '').trim(),
    public_email: (raw.public_email || '').toLowerCase().trim(),
    verified: Boolean(raw.verified),
  };
}
