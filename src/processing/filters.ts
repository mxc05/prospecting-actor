import { ActorInput, NormalizedProfileData, RawProfileData } from '../types/index.js';
import { logger } from '../utils/logger.js';

export function passesBasicFilters(data: RawProfileData | NormalizedProfileData, input: ActorInput): boolean {
  if (!data.username) {
    logger.debug(`Filtering out profile: Missing username`);
    return false;
  }

  // Min Followers check
  if (input.min_followers !== undefined && input.min_followers > 0) {
    if (data.followers < input.min_followers) {
      logger.debug(`Filtering out @${data.username}: Follower count ${data.followers} < min ${input.min_followers}`);
      return false;
    }
  }

  // Max Followers check
  if (input.max_followers !== undefined && input.max_followers > 0) {
    if (data.followers > input.max_followers) {
      logger.debug(`Filtering out @${data.username}: Follower count ${data.followers} > max ${input.max_followers}`);
      return false;
    }
  }

  // Location filter (Soft check: only reject if profile explicitly states a location that mismatches)
  if (input.location && input.location.trim().length > 0 && data.location) {
    const targetLoc = input.location.toLowerCase().trim();
    const profileLoc = data.location.toLowerCase().trim();
    
    if (!profileLoc.includes(targetLoc) && !targetLoc.includes(profileLoc)) {
      logger.debug(`Filtering out @${data.username}: Location mismatch ("${data.location}" vs requested "${input.location}")`);
      return false;
    }
  }

  return true;
}
