import { describe, expect, it } from 'vitest';
import {
  fadeBlackOverlayOpacity,
  incomingLocalTimeSec,
  transitionDurationSec,
  transitionUsesOverlap,
  transitionWindowProgress,
} from './sceneTransitionPreview';

describe('sceneTransitionPreview', () => {
  it('matches backend transition durations', () => {
    expect(transitionDurationSec('cut')).toBe(0);
    expect(transitionDurationSec('dissolve')).toBe(0.55);
    expect(transitionDurationSec('fade-black')).toBe(0.7);
    expect(transitionUsesOverlap('cut')).toBe(false);
    expect(transitionUsesOverlap('wipe')).toBe(true);
  });

  it('computes transition window progress at scene end', () => {
    expect(transitionWindowProgress(4, 10, 'dissolve')).toBeNull();
    expect(transitionWindowProgress(9.5, 10, 'dissolve')).toBeCloseTo(0.091, 2);
    expect(transitionWindowProgress(10, 10, 'dissolve')).toBe(1);
  });

  it('maps incoming local time during overlap', () => {
    expect(incomingLocalTimeSec(9.5, 10, 'dissolve')).toBeCloseTo(0.05, 2);
    expect(incomingLocalTimeSec(10, 10, 'fade-black')).toBeCloseTo(0.7, 2);
  });

  it('peaks fade-black overlay mid transition', () => {
    expect(fadeBlackOverlayOpacity(0)).toBe(0);
    expect(fadeBlackOverlayOpacity(0.5)).toBeCloseTo(1, 2);
    expect(fadeBlackOverlayOpacity(1)).toBeCloseTo(0, 2);
  });
});
