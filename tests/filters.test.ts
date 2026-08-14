import { describe, expect, it } from 'vitest';
import { passesBasicFilters } from '../src/processing/filters.js';
import { ActorInput, RawProfileData } from '../src/types/index.js';

describe('Basic Filters', () => {
  const baseProfile: RawProfileData = {
    platform: 'instagram',
    name: 'Test SMM',
    username: 'test_smm',
    profile_url: 'https://instagram.com/test_smm',
    bio: 'Freelance Social Media Manager',
    location: 'Mumbai, India',
    followers: 5000,
    website: 'https://example.com',
    public_email: 'test@example.com',
    verified: false,
  };

  const baseInput: ActorInput = {
    platform: 'instagram',
    profile_type: 'social_media_manager',
    min_followers: 1000,
    max_followers: 50000,
    location: 'India',
  };

  it('should pass valid profile', () => {
    expect(passesBasicFilters(baseProfile, baseInput)).toBe(true);
  });

  it('should reject profile below min_followers', () => {
    const profile = { ...baseProfile, followers: 500 };
    expect(passesBasicFilters(profile, baseInput)).toBe(false);
  });

  it('should reject profile above max_followers', () => {
    const profile = { ...baseProfile, followers: 100000 };
    expect(passesBasicFilters(profile, baseInput)).toBe(false);
  });

  it('should reject location mismatch when explicit', () => {
    const profile = { ...baseProfile, location: 'New York, USA' };
    expect(passesBasicFilters(profile, baseInput)).toBe(false);
  });
});
