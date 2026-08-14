import { describe, expect, it } from 'vitest';
import { Deduplicator } from '../src/processing/deduplicate.js';

describe('Deduplicator', () => {
  it('should detect and filter duplicate usernames', () => {
    const deduplicator = new Deduplicator();

    expect(deduplicator.isDuplicate('instagram', 'priya.social')).toBe(false);
    expect(deduplicator.isDuplicate('instagram', 'priya.social')).toBe(true);
    expect(deduplicator.isDuplicate('instagram', 'https://instagram.com/PRIYA.SOCIAL/')).toBe(true);
    expect(deduplicator.isDuplicate('instagram', 'other_user')).toBe(false);
  });

  it('should filter candidate lists accurately', () => {
    const deduplicator = new Deduplicator();
    const candidates = [
      { profileUrl: 'https://instagram.com/user1' },
      { profileUrl: 'https://instagram.com/user2' },
      { profileUrl: 'https://instagram.com/user1' },
    ];

    const unique = deduplicator.filterDuplicates(candidates, (c) => c.profileUrl);
    expect(unique.length).toBe(2);
  });
});
