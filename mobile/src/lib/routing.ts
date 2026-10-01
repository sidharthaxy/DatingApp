import type { Href } from 'expo-router';
import type { User } from '../store/authStore';

/**
 * The one place that decides where a signed-in member belongs. Used by the splash screen,
 * both login flows and the root route guard so they can never disagree (they used to: the
 * guard bounced people off /kyc while login pushed them back into onboarding).
 *
 *   banned                       -> /appeal
 *   profile not finished         -> /terms  (-> /onboarding)
 *   profile done, no KYC video   -> /kyc    (skippable; discovery stays locked until done)
 *   otherwise                    -> the app
 */
export const homeRouteFor = (user: User | null): Href => {
  if (!user) return '/(auth)/login';
  if (user.status === 'REJECTED') return '/appeal';
  if (!user.is_profile_complete) return '/terms';
  if (!user.has_kyc) return '/kyc';
  return '/(tabs)/discovery';
};
