import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { useAuthStore } from '@/src/store/authStore';
import { apiGet, apiPost } from '@/src/lib/api';
import {
  ArrowLeft,
  Check,
  Crown,
  Flame,
  Zap,
  Shield,
  Star,
  Heart,
  Infinity,
  Eye,
  Rewind,
  MessageSquare,
} from 'lucide-react-native';
import RazorpayCheckout from 'react-native-razorpay';

// --- Data ---

type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

interface Plan {
  id: string;
  name: string;
  tag?: string;
  icon: React.ElementType;
  iconColor: string;
  gradient: string[];
  prices: Record<BillingCycle, number>;
  features: string[];
  notIncluded?: string[];
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    icon: Heart,
    iconColor: '#afadac',
    gradient: ['#f3f0ef', '#eae7e7'],
    prices: { weekly: 0, monthly: 0, quarterly: 0, yearly: 0 },
    features: [
      '10 Swipes per day',
      'Basic Discovery Feed',
      'Limited Chat (2 active)',
    ],
    notIncluded: [
      'See who liked you',
      'Unlimited Swipes',
      'Profile Boost',
      'Read Receipts',
      'Rewind last swipe',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    tag: 'Most Popular',
    icon: Flame,
    iconColor: '#ff7c62',
    gradient: ['#ff7c62', '#af270c'],
    prices: { weekly: 199, monthly: 599, quarterly: 1399, yearly: 1999 },
    features: [
      'Unlimited Swipes',
      'See who liked you',
      '5 Profile Boosts / month',
      'Unlimited Chat',
      'Rewind last swipe',
      'Priority in Discovery',
      'Advanced Filters',
    ],
    notIncluded: ['AI Matchmaking', 'Concierge Support', 'Incognito Mode'],
  },
  {
    id: 'elite',
    name: 'Elite',
    tag: 'Best Value',
    icon: Crown,
    iconColor: '#FFD700',
    gradient: ['#414BEA', '#9097ff'],
    prices: { weekly: 399, monthly: 999, quarterly: 2399, yearly: 3499 },
    features: [
      'Everything in Premium',
      'AI Matchmaking & Daily Picks',
      'Incognito Mode',
      'Read Receipts',
      'Unlimited Boosts',
      'Concierge Support',
      'Exclusive Elite Badge',
    ],
  },
];

const BILLING_LABELS: Record<BillingCycle, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: '3 Months',
  yearly: 'Yearly',
};

const SAVINGS: Partial<Record<BillingCycle, string>> = {
  quarterly: 'Save 22%',
  yearly: 'Save 44%',
};

const FEATURE_ICONS: Record<string, React.ElementType> = {
  'Unlimited Swipes': Infinity,
  'See who liked you': Eye,
  'Rewind last swipe': Rewind,
  'Unlimited Chat': MessageSquare,
  'AI Matchmaking & Daily Picks': Zap,
  'Incognito Mode': Shield,
  'Exclusive Elite Badge': Star,
};

// --- Sub-components ---

function BillingToggle({
  selected,
  onChange,
}: {
  selected: BillingCycle;
  onChange: (c: BillingCycle) => void;
}) {
  const cycles: BillingCycle[] = ['weekly', 'monthly', 'quarterly', 'yearly'];
  return (
    <View style={styles.billingToggle}>
      {cycles.map((c) => (
        <Pressable
          key={c}
          onPress={() => onChange(c)}
          style={[
            styles.billingBtn,
            selected === c && styles.billingBtnActive,
          ]}
        >
          <Text
            style={[
              styles.billingLabel,
              selected === c && styles.billingLabelActive,
            ]}
          >
            {BILLING_LABELS[c]}
          </Text>
          {SAVINGS[c] && (
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsText}>{SAVINGS[c]}</Text>
            </View>
          )}
        </Pressable>
      ))}
    </View>
  );
}

function PlanCard({
  plan,
  billing,
  isSelected,
  onSelect,
}: {
  plan: Plan;
  billing: BillingCycle;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const price = plan.prices[billing];
  const PlanIcon = plan.icon;
  const isElite = plan.id === 'elite';
  const isPremium = plan.id === 'premium';
  const isFree = plan.id === 'free';

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onSelect}
      style={[
        styles.planCard,
        isSelected && styles.planCardSelected,
        isElite && styles.planCardElite,
      ]}
    >
      {/* Header gradient strip */}
      {!isFree && (
        <LinearGradient
          colors={plan.gradient as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.planGradientStrip}
        >
          <PlanIcon size={18} color="#fff" />
          <Text style={styles.planGradientName}>{plan.name}</Text>
          {plan.tag && (
            <View style={styles.planTag}>
              <Text style={styles.planTagText}>{plan.tag}</Text>
            </View>
          )}
        </LinearGradient>
      )}

      {isFree && (
        <View style={styles.planFreeStrip}>
          <PlanIcon size={18} color="#afadac" />
          <Text style={styles.planFreeName}>{plan.name}</Text>
        </View>
      )}

      {/* Price */}
      <View style={styles.planPriceRow}>
        {price === 0 ? (
          <Text style={styles.planPriceFree}>Always Free</Text>
        ) : (
          <HStack style={{ alignItems: 'baseline', gap: 2 }}>
            <Text style={styles.planPriceCurrency}>₹</Text>
            <Text
              style={[
                styles.planPriceAmount,
                isElite && { color: '#414BEA' },
                isPremium && { color: '#af270c' },
              ]}
            >
              {price}
            </Text>
            <Text style={styles.planPricePeriod}>
              /{BILLING_LABELS[billing].toLowerCase()}
            </Text>
          </HStack>
        )}
      </View>

      {/* Features */}
      <VStack style={{ gap: 8, marginTop: 4 }}>
        {plan.features.map((f) => {
          const FIcon = FEATURE_ICONS[f] || Check;
          return (
            <HStack key={f} style={{ alignItems: 'center', gap: 10 }}>
              <View
                style={[
                  styles.featureIconWrap,
                  isElite && { backgroundColor: '#414BEA15' },
                  isPremium && { backgroundColor: '#ff7c6215' },
                ]}
              >
                <FIcon
                  size={13}
                  color={isElite ? '#414BEA' : isPremium ? '#af270c' : '#afadac'}
                />
              </View>
              <Text style={styles.featureText}>{f}</Text>
            </HStack>
          );
        })}
        {plan.notIncluded?.map((f) => (
          <HStack key={f} style={{ alignItems: 'center', gap: 10, opacity: 0.35 }}>
            <View style={styles.featureIconWrap}>
              <Check size={13} color="#afadac" />
            </View>
            <Text style={[styles.featureText, { textDecorationLine: 'line-through' }]}>
              {f}
            </Text>
          </HStack>
        ))}
      </VStack>

      {/* Selection indicator */}
      {isSelected && (
        <View
          style={[
            styles.selectedDot,
            isElite && { backgroundColor: '#414BEA' },
            isPremium && { backgroundColor: '#af270c' },
          ]}
        >
          <Check size={12} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
}

// --- Screen ---

export default function SubscriptionScreen() {
  const router = useRouter();
  const [billing, setBilling] = useState<BillingCycle>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<string>('premium');
  const [ordering, setOrdering] = useState(false);
  const [activeSub, setActiveSub] = useState<{
    tier: string;
    expires_at: string | null;
  } | null>(null);

  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);

  // Load live subscription status on mount
  useEffect(() => {
    apiGet('/api/v1/subscriptions/me')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setActiveSub({
            tier: json.data.tier,
            expires_at: json.data.subscription?.expires_at ?? null,
          });
          // Sync authStore if tier differs
          if (user && json.data.tier !== user.subscription_tier) {
            setUser({ ...user, subscription_tier: json.data.tier });
          }
        }
      })
      .catch(() => {});
  }, []);

  const plan = PLANS.find((p) => p.id === selectedPlan)!;
  const price = plan.prices[billing];
  const isFree = price === 0;
  const isCurrentPlan = activeSub?.tier === selectedPlan.toUpperCase();

  // Map frontend billing label → backend BillingCycle enum
  const BILLING_MAP: Record<BillingCycle, string> = {
    weekly: 'WEEKLY',
    monthly: 'MONTHLY',
    quarterly: 'QUARTERLY',
    yearly: 'YEARLY',
  };

  const handleSubscribe = async () => {
    if (isFree || !selectedPlan || selectedPlan === 'free') return;
    setOrdering(true);
    try {
      const res = await apiPost('/api/v1/subscriptions/create-order', {
        tier: selectedPlan.toUpperCase(),
        billingCycle: BILLING_MAP[billing],
      });
      const json = await res.json();
      if (!json.success) {
        Alert.alert('Order Failed', json.error?.message || 'Could not create order. Try again.');
        return;
      }

      const { orderId, amount, keyId } = json.data;

      const options = {
        description: `MingleX ${plan.name} - ${BILLING_LABELS[billing]}`,
        image: 'https://i.imgur.com/3g7Y69t.png', // Replace with your logo
        currency: 'INR',
        key: keyId,
        amount: amount,
        name: 'MingleX',
        order_id: orderId,
        prefill: {
          email: user?.email || '',
          contact: '', // Optional: add phone if available
          name: user?.first_name || '',
        },
        theme: { color: plan.id === 'elite' ? '#414BEA' : '#ff7c62' }
      };

      try {
        const data = await RazorpayCheckout.open(options);
        // Handle success
        const verifyRes = await apiPost('/api/v1/subscriptions/verify-payment', {
          razorpay_order_id: data.razorpay_order_id,
          razorpay_payment_id: data.razorpay_payment_id,
          razorpay_signature: data.razorpay_signature,
        });
        const verifyJson = await verifyRes.json();
        if (verifyJson.success) {
          if (user) setUser({ ...user, subscription_tier: selectedPlan.toUpperCase() as any });
          setActiveSub({ tier: selectedPlan.toUpperCase(), expires_at: verifyJson.data?.subscription?.expires_at ?? null });
          Alert.alert('🎉 Subscribed!', `You are now on ${plan.name}.`);
        } else {
          Alert.alert('Verification Failed', verifyJson.error?.message || 'Payment verification failed.');
        }
      } catch (error: any) {
        // User cancelled or payment failed
        if (error.code === 2) {
          console.log('[Razorpay] Payment cancelled');
        } else {
          Alert.alert('Payment Error', error.description || 'An error occurred during payment.');
        }
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setOrdering(false);
    }
  };

  return (
    <Box style={{ flex: 1, backgroundColor: '#f9f6f5' }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Header */}
        <LinearGradient
          colors={['#414BEA', '#6b74f0']}
          style={styles.header}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <ArrowLeft size={22} color="#fff" />
          </TouchableOpacity>
          <VStack style={{ alignItems: 'center', gap: 6, marginTop: 8 }}>
            <Crown size={40} color="#FFD700" />
            <Heading style={styles.headerTitle}>Upgrade MingleX</Heading>
            <Text style={styles.headerSubtitle}>
              Unlock your full potential. Find your perfect match faster.
            </Text>
          </VStack>
        </LinearGradient>

        {/* Billing Toggle */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <Text style={styles.sectionLabel}>BILLING CYCLE</Text>
          <BillingToggle selected={billing} onChange={setBilling} />
        </View>

        {/* Active Subscription Banner */}
        {activeSub && activeSub.tier !== 'FREE' && (
          <View style={[styles.activeBanner, { marginHorizontal: 20, marginTop: 16 }]}>
            <Text style={styles.activeBannerTitle}>✅ Active: {activeSub.tier}</Text>
            {activeSub.expires_at && (
              <Text style={styles.activeBannerSub}>
                Renews {new Date(activeSub.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            )}
          </View>
        )}

        {/* Plan Cards */}
        <View style={{ paddingHorizontal: 20, marginTop: 20, gap: 16 }}>
          <Text style={styles.sectionLabel}>CHOOSE YOUR PLAN</Text>
          {PLANS.map((p) => (
            <PlanCard
              key={p.id}
              plan={p}
              billing={billing}
              isSelected={selectedPlan === p.id}
              onSelect={() => setSelectedPlan(p.id)}
            />
          ))}
        </View>

        {/* Legal */}
        <Text style={styles.legal}>
          Subscriptions auto-renew. Cancel anytime from account settings.
          By subscribing, you agree to our Terms of Service and Privacy Policy.
        </Text>
      </ScrollView>

      {/* Sticky CTA */}
      <View style={styles.ctaContainer}>
        {isFree ? (
          <View style={styles.ctaFree}>
            <Text style={styles.ctaFreeText}>You are on the Free plan</Text>
          </View>
        ) : isCurrentPlan ? (
          <View style={styles.ctaFree}>
            <Text style={styles.ctaFreeText}>✅ This is your current plan</Text>
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSubscribe}
            disabled={ordering}
            style={styles.ctaBtn}
          >
            <LinearGradient
              colors={
                selectedPlan === 'elite'
                  ? ['#414BEA', '#6b74f0']
                  : ['#ff7c62', '#af270c']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              {ordering ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Crown size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.ctaText}>
                    Subscribe · ₹{price}/{BILLING_LABELS[billing].toLowerCase()}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </Box>
  );
}

// --- Styles ---

const styles = StyleSheet.create({
  header: {
    paddingTop: 56,
    paddingBottom: 32,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    fontFamily: 'SpaceGrotesk_700Bold',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: 'SpaceMono_400Regular',
    letterSpacing: 2,
    color: '#5c5b5b',
    marginBottom: 10,
  },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: '#eae7e7',
    borderRadius: 16,
    padding: 4,
    gap: 4,
  },
  billingBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    position: 'relative',
  },
  billingBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  billingLabel: {
    fontSize: 11,
    fontFamily: 'SpaceMono_400Regular',
    color: '#787676',
  },
  billingLabelActive: {
    color: '#2f2f2e',
    fontWeight: '700',
  },
  savingsBadge: {
    position: 'absolute',
    top: -6,
    right: 2,
    backgroundColor: '#414BEA',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  savingsText: {
    fontSize: 8,
    color: '#fff',
    fontFamily: 'SpaceMono_400Regular',
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e4e2e1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    position: 'relative',
  },
  planCardSelected: {
    borderColor: '#414BEA',
    shadowColor: '#414BEA',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  planCardElite: {
    borderColor: '#414BEA',
  },
  planGradientStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  planGradientName: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#fff',
    flex: 1,
  },
  planTag: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  planTagText: {
    fontSize: 9,
    color: '#fff',
    fontFamily: 'SpaceMono_400Regular',
  },
  planFreeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f3f0ef',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  planFreeName: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#afadac',
  },
  planPriceRow: {
    marginBottom: 16,
  },
  planPriceFree: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#afadac',
  },
  planPriceCurrency: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#2f2f2e',
  },
  planPriceAmount: {
    fontSize: 36,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#2f2f2e',
    lineHeight: 42,
  },
  planPricePeriod: {
    fontSize: 13,
    color: '#5c5b5b',
    fontFamily: 'Manrope_400Regular',
    marginLeft: 2,
  },
  featureIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: '#f3f0ef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 13,
    color: '#2f2f2e',
    fontFamily: 'Manrope_500Medium',
    flex: 1,
  },
  selectedDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#414BEA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  legal: {
    marginTop: 24,
    marginHorizontal: 24,
    fontSize: 10,
    color: '#afadac',
    textAlign: 'center',
    lineHeight: 16,
    fontFamily: 'Manrope_400Regular',
  },
  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f9f6f5',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: '#e4e2e1',
  },
  ctaBtn: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  ctaText: {
    fontSize: 15,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#fff',
  },
  ctaFree: {
    borderRadius: 20,
    backgroundColor: '#eae7e7',
    paddingVertical: 18,
    alignItems: 'center',
  },
  ctaFreeText: {
    fontSize: 14,
    fontFamily: 'Manrope_500Medium',
    color: '#afadac',
  },
  activeBanner: {
    backgroundColor: '#414BEA12',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#414BEA30',
  },
  activeBannerTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
    color: '#414BEA',
  },
  activeBannerSub: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    color: '#5c5b5b',
    marginTop: 2,
  },
});
