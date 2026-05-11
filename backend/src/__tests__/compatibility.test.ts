/**
 * compatibility.test.ts
 * Unit tests for the compatibility scoring service.
 * Pure function — no DB or HTTP needed.
 */
import { computeCompatibility } from '../services/compatibility.service';

describe('Compatibility Service — Unit Tests', () => {
  const BASE_INPUT = {
    viewerInterestIds: [],
    viewerGoal: null,
    viewerDob: null,
    viewerLat: null,
    viewerLng: null,
    targetInterestIds: [],
    targetGoal: null,
    targetDob: null,
    targetLat: null,
    targetLng: null,
    targetLastLogin: null,
    targetBoostExpiresAt: null,
    targetTier: 'FREE',
  };

  // ─── Interest scoring ──────────────────────────────────────────────────────

  it('awards 30pts when all interests match', () => {
    const ids = ['i1', 'i2', 'i3'];
    const { score, breakdown } = computeCompatibility({
      ...BASE_INPUT,
      viewerInterestIds: ids,
      targetInterestIds: ids,
    });
    expect(breakdown.interests).toBe(30);
  });

  it('awards 15pts when 50% interests match', () => {
    const { breakdown } = computeCompatibility({
      ...BASE_INPUT,
      viewerInterestIds: ['i1', 'i2'],
      targetInterestIds: ['i1', 'i3'],
    });
    expect(breakdown.interests).toBe(15);
  });

  it('awards 0pts when no interests match', () => {
    const { breakdown } = computeCompatibility({
      ...BASE_INPUT,
      viewerInterestIds: ['i1'],
      targetInterestIds: ['i2'],
    });
    expect(breakdown.interests).toBe(0);
  });

  // ─── Goal scoring ──────────────────────────────────────────────────────────

  it('awards 20pts for identical relationship goals', () => {
    const { breakdown } = computeCompatibility({
      ...BASE_INPUT,
      viewerGoal: 'LONG_TERM',
      targetGoal: 'LONG_TERM',
    });
    expect(breakdown.goal).toBe(20);
  });

  it('awards 12pts for compatible (not identical) goals', () => {
    const { breakdown } = computeCompatibility({
      ...BASE_INPUT,
      viewerGoal: 'LONG_TERM',
      targetGoal: 'LONG_TERM_OPEN_TO_SHORT',
    });
    expect(breakdown.goal).toBe(12);
  });

  it('awards 0pts for incompatible goals', () => {
    const { breakdown } = computeCompatibility({
      ...BASE_INPUT,
      viewerGoal: 'LONG_TERM',
      targetGoal: 'FUN_NEW_FRIENDS',
    });
    expect(breakdown.goal).toBe(0);
  });

  // ─── Age scoring ───────────────────────────────────────────────────────────

  it('awards 15pts for same age', () => {
    const dob = new Date('1995-06-01');
    const { breakdown } = computeCompatibility({
      ...BASE_INPUT,
      viewerDob: dob,
      targetDob: dob,
    });
    expect(breakdown.age).toBe(15);
  });

  it('awards 8pts for 3-year age gap', () => {
    const { breakdown } = computeCompatibility({
      ...BASE_INPUT,
      viewerDob: new Date('1990-01-01'),
      targetDob: new Date('1993-01-01'),
    });
    expect(breakdown.age).toBe(8);
  });

  it('awards 0pts for >10-year age gap', () => {
    const { breakdown } = computeCompatibility({
      ...BASE_INPUT,
      viewerDob: new Date('1980-01-01'),
      targetDob: new Date('1996-01-01'),
    });
    expect(breakdown.age).toBe(0);
  });

  // ─── Distance scoring ──────────────────────────────────────────────────────

  it('awards 15pts for same location', () => {
    const { breakdown } = computeCompatibility({
      ...BASE_INPUT,
      viewerLat: 28.6, viewerLng: 77.2,
      targetLat: 28.6, targetLng: 77.2,
    });
    expect(breakdown.distance).toBe(15);
  });

  it('awards lower distance score as distance grows', () => {
    // ~100km apart
    const { breakdown } = computeCompatibility({
      ...BASE_INPUT,
      viewerLat: 28.0, viewerLng: 77.0,
      targetLat: 29.0, targetLng: 77.0,
    });
    expect(breakdown.distance).toBeLessThan(15);
  });

  // ─── Activity scoring ─────────────────────────────────────────────────────

  it('awards 10pts for login within the last hour', () => {
    const { breakdown } = computeCompatibility({
      ...BASE_INPUT,
      targetLastLogin: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
    });
    expect(breakdown.activity).toBe(10);
  });

  it('awards 0pts for no recent login', () => {
    const { breakdown } = computeCompatibility({
      ...BASE_INPUT,
      targetLastLogin: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // week ago
    });
    expect(breakdown.activity).toBe(0);
  });

  // ─── Boost scoring ────────────────────────────────────────────────────────

  it('awards 10pts for an active boost', () => {
    const { breakdown } = computeCompatibility({
      ...BASE_INPUT,
      targetBoostExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    expect(breakdown.boost).toBe(10);
  });

  it('awards 5pts for ELITE tier (no active boost)', () => {
    const { breakdown } = computeCompatibility({
      ...BASE_INPUT,
      targetTier: 'ELITE',
    });
    expect(breakdown.boost).toBe(5);
  });

  // ─── Score cap ────────────────────────────────────────────────────────────

  it('never returns a score above 100', () => {
    const ids = ['i1', 'i2', 'i3'];
    const dob = new Date('1995-01-01');
    const { score } = computeCompatibility({
      viewerInterestIds: ids,
      viewerGoal: 'LONG_TERM',
      viewerDob: dob,
      viewerLat: 28.6, viewerLng: 77.2,
      targetInterestIds: ids,
      targetGoal: 'LONG_TERM',
      targetDob: dob,
      targetLat: 28.6, targetLng: 77.2,
      targetLastLogin: new Date(Date.now() - 30 * 60 * 1000),
      targetBoostExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      targetTier: 'ELITE',
    });
    expect(score).toBeLessThanOrEqual(100);
    expect(score).toBeGreaterThan(90);
  });
});
