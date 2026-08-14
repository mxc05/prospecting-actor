import { describe, expect, it } from 'vitest';
import { detectSignals } from '../src/processing/freelancerDetector.js';
import { NormalizedProfileData } from '../src/types/index.js';

describe('Freelancer Detector Signals', () => {
  it('should detect freelancer signals in bio', () => {
    const profile: NormalizedProfileData = {
      platform: 'instagram',
      name: 'Jane Doe',
      username: 'janedoe_smm',
      profile_url: 'https://instagram.com/janedoe_smm',
      bio: 'Freelance social media manager | DM for work | taking clients',
      location: 'London',
      followers: 12000,
      website: '',
      public_email: 'jane@example.com',
      verified: false,
    };

    const signals = detectSignals(profile, 'social_media_manager');

    expect(signals.freelancer_score).toBeGreaterThan(0);
    expect(signals.matched_signals).toContain('freelancer:freelance');
    expect(signals.matched_signals).toContain('freelancer:dm for work');
    expect(signals.profession_signal_found).toBe(true);
  });

  it('should detect agency / business signals', () => {
    const profile: NormalizedProfileData = {
      platform: 'instagram',
      name: 'Media Studio',
      username: 'mediastudio',
      profile_url: 'https://instagram.com/mediastudio',
      bio: 'Digital Agency & Studio for brand growth',
      location: 'New York',
      followers: 40000,
      website: 'https://mediastudio.com',
      public_email: 'hello@mediastudio.com',
      verified: true,
    };

    const signals = detectSignals(profile, 'graphic_designer');

    expect(signals.business_score).toBeGreaterThan(0);
    expect(signals.matched_signals).toContain('business:agency');
    expect(signals.matched_signals).toContain('business:studio');
  });
});
