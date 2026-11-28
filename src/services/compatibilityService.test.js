
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateCompatibility } from './compatibilityService.js';

describe('RR-10 Review Compatibility', () => {
  it('returns 100 for identical preferences', () => {
    const preferences = {
      stories: ['fantasy', 'romance'],
      vibe: ['cozy'],
      'movies-tv': ['stranger-things'],
    };

    assert.equal(
      calculateCompatibility(preferences, preferences),
      100
    );
  });

  it('returns 0 for completely different preferences', () => {
    const reader = {
      stories: ['fantasy'],
      vibe: ['cozy'],
      'movies-tv': ['stranger-things'],
    };

    const reviewer = {
      stories: ['horror'],
      vibe: ['dark'],
      'movies-tv': ['bridgerton'],
    };

    assert.equal(calculateCompatibility(reader, reviewer), 0);
  });

  it('returns null when preferences are missing', () => {
    assert.equal(calculateCompatibility(null, {}), null);
  });

  it('compares custom answers regardless of capitalization', () => {
    const reader = {
      stories: ['other'],
      'stories-other': ['Dystopian'],
    };

    const reviewer = {
      stories: ['other'],
      'stories-other': ['dystopian'],
    };

    assert.equal(calculateCompatibility(reader, reviewer), 100);
  });

  it('ignores categories that one reader did not answer', () => {
    const reader = {
      stories: ['fantasy'],
    };

    const reviewer = {
      stories: ['fantasy'],
      vibe: ['cozy'],
    };

    assert.equal(calculateCompatibility(reader, reviewer), 100);
  });

  it('ignores neutral quiz answers', () => {
    const reader = {
      stories: ['not-sure'],
      vibe: ['surprise'],
    };

    const reviewer = {
      stories: ['fantasy'],
      vibe: ['cozy'],
    };

    assert.equal(calculateCompatibility(reader, reviewer), null);
  });
});
