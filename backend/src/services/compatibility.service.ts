/**
 * compatibility.service.ts
 *
 * Computes a 0–100 compatibility score between two users based on:
 * - Shared interests          (0–30 pts)
 * - Relationship goal match   (0–20 pts)
 * - Age proximity             (0–15 pts)
 * - Distance proximity        (0–15 pts)
 * - Activity level            (0–10 pts)
 * - Subscription boost        (0–10 pts)
 */

interface CompatibilityInput {
  // Viewer (the logged-in user)
  viewerInterestIds: string[];
  viewerGoal: string | null;
  viewerDob: Date | null;
  viewerLat: number | null;
  viewerLng: number | null;

  // Target
  targetInterestIds: string[];
  targetGoal: string | null;
  targetDob: Date | null;
  targetLat: number | null;
  targetLng: number | null;
  targetLastLogin: Date | null;
  targetBoostExpiresAt: Date | null;
  targetTier: string;
}

export interface CompatibilityResult {
  score: number; // 0–100
  breakdown: {
    interests: number;
    goal: number;
    age: number;
    distance: number;
    activity: number;
    boost: number;
  };
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function ageFromDob(dob: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

const COMPATIBLE_GOALS: Record<string, string[]> = {
  LONG_TERM: ['LONG_TERM', 'LONG_TERM_OPEN_TO_SHORT'],
  LONG_TERM_OPEN_TO_SHORT: ['LONG_TERM', 'LONG_TERM_OPEN_TO_SHORT', 'SHORT_TERM_OPEN_TO_LONG'],
  SHORT_TERM_OPEN_TO_LONG: ['LONG_TERM_OPEN_TO_SHORT', 'SHORT_TERM_OPEN_TO_LONG', 'FUN_NEW_FRIENDS'],
  FUN_NEW_FRIENDS: ['SHORT_TERM_OPEN_TO_LONG', 'FUN_NEW_FRIENDS', 'STILL_FIGURING_OUT'],
  STILL_FIGURING_OUT: ['FUN_NEW_FRIENDS', 'STILL_FIGURING_OUT'],
};

export function computeCompatibility(input: CompatibilityInput): CompatibilityResult {
  const breakdown = { interests: 0, goal: 0, age: 0, distance: 0, activity: 0, boost: 0 };

  // ── 1. Shared Interests (0–30) ────────────────────────────────────────────
  if (input.viewerInterestIds.length > 0 && input.targetInterestIds.length > 0) {
    const viewerSet = new Set(input.viewerInterestIds);
    const shared = input.targetInterestIds.filter((id) => viewerSet.has(id)).length;
    const maxPossible = Math.min(input.viewerInterestIds.length, input.targetInterestIds.length);
    breakdown.interests = Math.round((shared / maxPossible) * 30);
  }

  // ── 2. Relationship Goal (0–20) ───────────────────────────────────────────
  if (input.viewerGoal && input.targetGoal) {
    const compatibleGoals = COMPATIBLE_GOALS[input.viewerGoal] ?? [];
    if (input.viewerGoal === input.targetGoal) {
      breakdown.goal = 20; // Perfect match
    } else if (compatibleGoals.includes(input.targetGoal)) {
      breakdown.goal = 12; // Compatible
    }
  }

  // ── 3. Age Proximity (0–15) ───────────────────────────────────────────────
  if (input.viewerDob && input.targetDob) {
    const viewerAge = ageFromDob(input.viewerDob);
    const targetAge = ageFromDob(input.targetDob);
    const ageDiff = Math.abs(viewerAge - targetAge);
    if (ageDiff === 0) breakdown.age = 15;
    else if (ageDiff <= 2) breakdown.age = 12;
    else if (ageDiff <= 5) breakdown.age = 8;
    else if (ageDiff <= 10) breakdown.age = 4;
    else breakdown.age = 0;
  }

  // ── 4. Distance Proximity (0–15) ─────────────────────────────────────────
  if (
    input.viewerLat != null && input.viewerLng != null &&
    input.targetLat != null && input.targetLng != null
  ) {
    const km = haversineKm(input.viewerLat, input.viewerLng, input.targetLat, input.targetLng);
    if (km <= 5) breakdown.distance = 15;
    else if (km <= 15) breakdown.distance = 12;
    else if (km <= 30) breakdown.distance = 8;
    else if (km <= 60) breakdown.distance = 4;
    else breakdown.distance = 1;
  }

  // ── 5. Activity Level (0–10) ─────────────────────────────────────────────
  if (input.targetLastLogin) {
    const hoursAgo = (Date.now() - input.targetLastLogin.getTime()) / (1000 * 60 * 60);
    if (hoursAgo <= 1) breakdown.activity = 10;
    else if (hoursAgo <= 6) breakdown.activity = 8;
    else if (hoursAgo <= 24) breakdown.activity = 5;
    else if (hoursAgo <= 72) breakdown.activity = 2;
  }

  // ── 6. Boost / Elite Visibility Bonus (0–10) ─────────────────────────────
  const now = Date.now();
  if (input.targetBoostExpiresAt && input.targetBoostExpiresAt.getTime() > now) {
    breakdown.boost = 10;
  } else if (input.targetTier === 'ELITE') {
    breakdown.boost = 5;
  } else if (input.targetTier === 'PREMIUM') {
    breakdown.boost = 3;
  }

  const score = Math.min(
    100,
    breakdown.interests + breakdown.goal + breakdown.age + breakdown.distance +
    breakdown.activity + breakdown.boost
  );

  return { score, breakdown };
}
