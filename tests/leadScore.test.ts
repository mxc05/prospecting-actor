import { describe, expect, it } from 'vitest';
import { calculateLeadScore } from '../src/processing/leadScore.js';
import { AIClassificationResult, NormalizedProfileData, RuleSignals } from '../src/types/index.js';

describe('Lead Scoring Engine', () => {
  const profile: NormalizedProfileData = {
    platform: 'instagram',
    name: 'Priya Sharma',
    username: 'priya.social',
    profile_url: 'https://instagram.com/priya.social',
    bio: 'Freelance social media manager',
    location: 'Mumbai',
    followers: 12400,
    website: 'https://priya.social',
    public_email: 'priya@example.com',
    verified: false,
  };

  const signals: RuleSignals = {
    freelancer_score: 80,
    business_score: 0,
    matched_signals: ['freelancer:freelance'],
    profession_signal_found: true,
  };

  const classification: AIClassificationResult = {
    profession: 'Social Media Manager',
    niche: 'D2C',
    employment_type: 'Freelancer',
    profession_match: true,
    freelancer_confidence: 0.95,
    business_confidence: 0.2,
    confidence: 0.95,
    reason: 'Explicit bio services match',
  };

  it('should calculate high lead score for qualified profiles with contact info', () => {
    const result = calculateLeadScore({ normalized: profile, signals, classification });

    expect(result.lead_score).toBeGreaterThanOrEqual(80);
    expect(result.qualification).toBe('High');
  });

  it('should classify unclassified profiles gracefully when AI unavailable', () => {
    const unclassifiedResult = calculateLeadScore({
      normalized: { ...profile, public_email: '', website: '' },
      signals: { ...signals, profession_signal_found: false },
      classification: { ...classification, profession_match: null },
    });

    expect(unclassifiedResult.qualification).toBe('Unclassified');
  });
});
